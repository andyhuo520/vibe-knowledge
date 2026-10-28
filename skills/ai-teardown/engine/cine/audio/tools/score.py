#!/usr/bin/env python3
"""Soundtrack for the showcase film "Claude Opus 5.5 introduces itself".

Every sound in out/score.wav is synthesized in this file: band-limited oscillators, noise, biquad
filters, envelopes, convolution reverbs with generated impulse responses. No samples, no stock audio.

Run:     .venv/bin/python tools/score.py
Reads:   timeline.json (bpm, bar, sections, cues, warp table). Seconds are never hardcoded here:
         sections and cues come from the file, musical patterns sit on the bar grid it defines.
Writes:  out/score.wav               48 kHz, stereo, 16-bit PCM, exactly round(duration * 48000) samples
         out/score_report.txt        what was measured (levels, gaps, kick grid, DC, centroid, low-band correlation)
         out/score_spectrogram.png   if matplotlib is installed in the venv
         out/score_stems/*.wav       drums / bass / music / sfx before the master chain (common gain)

Signal flow
  events -> buses (kick, drums, bass, pad, pluck, lead, stab, fx, boom, ui) + sends (room, hall, long, delay)
  -> sidechain ducking keyed from the kick list (bass, pad, pluck, lead, fx, boom)
  -> four stems (drums, bass, music, sfx) with their own reverbs / ping-pong delay
  "ft" section: rendered in scene time on its own mixer, then read back along warp.table with a
  variable-rate windowed-sinc reader (anti-aliased for fast-forward), plus a granular freeze where speed = 0
  "finale": the implode window powers the drums, bass and music down (tape-stop) under a reverse-reverb suck
  master: glue compressor -> 28 Hz high-pass (causal) -> side high-passed at 180 Hz (mono lows) -> gain
          -> look-ahead limiter (no latency) -> end fade -> true-silence gaps -> TPDF dither -> 16-bit

Importable: `import score` reads timeline.json and builds the reverb impulse responses (~1 s) but renders
nothing; the film is rendered only by main(), i.e. when run as a script. tools/bed.py reuses the synth.

Changing timing: edit tools/timeline.py, regenerate timeline.json, re-run this script. Sections are
arranged by name (hook, identity, ch1/ch2, ft, board, check, rhythm, camera, samples, finale, end; other
names get a plain groove), cues by type; the chord cycle restarts at the first impact cue (the drop).
"""
from __future__ import annotations

import itertools
import json
import math
import time
import wave
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.fft import next_fast_len
from scipy.interpolate import CubicSpline
from scipy.ndimage import minimum_filter1d, uniform_filter1d

RUN_T0 = time.time()
SR = 48000
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
STEMS_DIR = OUT / "score_stems"
TL = json.loads((ROOT / "timeline.json").read_text(encoding="utf-8"))

# ============================================================== timeline (single source of truth)
BPM = float(TL["bpm"])
BEAT = float(TL["beat"])
BAR = float(TL["bar"])
STEP = BAR / 16.0                                    # one 16th note
DUR = float(TL["duration"])
N = int(round(DUR * SR))
NBARS = int(TL.get("bars") or math.ceil(DUR / BAR - 1e-9))
SECTIONS = sorted(TL["sections"], key=lambda s: s["from_bar"])
SEC = {s["name"]: s for s in SECTIONS}
CUES = sorted(TL["cues"], key=lambda c: (c["t"], c["type"]))
WARP = TL.get("warp")
GAPS = [(c["t"], c.get("t_to", c["t"] + STEP)) for c in CUES if c["type"] == "gap"]
REPORT_NOTES: list[str] = []
RNG = np.random.default_rng(12455)


def t_of(bar):
    """Bar number -> seconds on the musical grid (bar 0 starts at t = 0, as in timeline.py)."""
    return bar * BAR


def i_of(t):
    return int(round(t * SR))


def section_at(bar):
    for s in SECTIONS:
        if s["from_bar"] - 1e-9 <= bar < s["to_bar"] - 1e-9:
            return s
    return None


def next_section(s):
    later = [x for x in SECTIONS if x["from_bar"] >= s["to_bar"] - 1e-9]
    return later[0] if later else None


def cues_of(kind):
    return [c for c in CUES if c["type"] == kind]


def note(msg):
    REPORT_NOTES.append(msg)


def log(msg):
    print(f"[{time.time() - RUN_T0:6.1f}s] {msg}", flush=True)


# ============================================================== harmony
PC = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
      "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def parse_root(name):
    r = name[:2] if len(name) > 1 and name[1] in "#b" else name[:1]
    return PC[r], name[len(r):]


KEY_NAME = TL.get("key", "F minor")
KEY_PC = parse_root(KEY_NAME.split()[0])[0]
KEY_MINOR = "minor" in KEY_NAME.lower()
SCALE = {(KEY_PC + i) % 12 for i in ((0, 2, 3, 5, 7, 8, 10) if KEY_MINOR else (0, 2, 4, 5, 7, 9, 11))}
PENTA = {(KEY_PC + i) % 12 for i in ((0, 3, 5, 7, 10) if KEY_MINOR else (0, 2, 4, 7, 9))}
CHORDS = list(TL["chords"])
TONIC = next((c for c in CHORDS if parse_root(c)[0] == KEY_PC), CHORDS[0])


def chord_pcs(name, scale=None):
    """Root, third, fifth plus one diatonic colour tone (add9 for minor, maj7 / add9 / 6 for major).
    scale: pitch classes of the key; default = the film's key (tools/bed.py passes the lesson's)."""
    scale = SCALE if scale is None else scale
    root, q = parse_root(name)
    minor = q.startswith("m") and not q.startswith("maj")
    pcs = [root, (root + (3 if minor else 4)) % 12, (root + 7) % 12]
    for iv in ((2, 10) if minor else (11, 2, 9)):
        if (root + iv) % 12 in scale:
            pcs.append((root + iv) % 12)
            break
    return pcs


# The progression cycles one chord per bar and starts on chords[0] at the drop (first impact cue),
# so the drop and the final card both land on the tonic.
_drop = next((c for c in CUES if c["type"] == "impact"), None)
ANCHOR = int(round(_drop["bar"])) if _drop else 0


def chord_at(bar):
    return CHORDS[int(math.floor(bar + 1e-9 - ANCHOR)) % len(CHORDS)]


def _voice_lead(pcs, prev, lo=53, hi=70, center=62.0):
    """Pick octaves for the chord tones: smallest movement from the previous voicing, no low mud."""
    options = [[p for p in range(lo, hi + 1) if p % 12 == pc] for pc in pcs]
    best, best_cost = None, 1e9
    for combo in itertools.product(*options):
        v = sorted(combo)
        if len(set(v)) < len(v) or v[-1] - v[0] > 15:
            continue
        mud = sum(1 for a, b in zip(v, v[1:]) if b - a <= 2 and a < 58)
        move = sum(abs(a - b) for a, b in zip(v, prev)) if prev else 0.0
        cost = move + abs(float(np.mean(v)) - center) * (0.25 if prev else 1.0) + 3.0 * mud + 0.01 * v[-1]
        if cost < best_cost:
            best, best_cost = v, cost
    return best


VOICING = {}
_prev = None
for _name in CHORDS:
    _prev = _voice_lead(chord_pcs(_name), _prev)
    VOICING[_name] = _prev


def stab_voicing(name):
    v = VOICING[name]
    root = parse_root(name)[0]
    top = next(m for m in range(v[-1] + 1, v[-1] + 13) if m % 12 == root)
    return v + [top]


def bass_midi(name, lo=28, hi=39):
    pc = parse_root(name)[0]
    return next(m for m in range(lo, hi + 1) if m % 12 == pc)


def pool(name, lo=64, hi=91, scale=None):
    """Arp/lead note pool: triad tones everywhere, the colour tone only from the second octave up."""
    pcs = chord_pcs(name, scale)
    return [m for m in range(lo, hi + 1) if m % 12 in pcs[:3] or (m % 12 in pcs[3:] and m >= lo + 12)]


LADDER = [m for m in range(36, 112) if m % 12 in PENTA]     # key pentatonic, ascending


# ============================================================== DSP basics
def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


def undb(d):
    return 10.0 ** (d / 20.0)


def todb(x):
    return 20.0 * math.log10(max(float(x), 1e-12))


def ns(sec):
    return max(1, int(round(sec * SR)))


def tt(n):
    return np.arange(n) / SR


def smoothstep(e0, e1, x):
    u = np.clip((np.asarray(x, dtype=float) - e0) / (e1 - e0), 0.0, 1.0)
    return u * u * (3.0 - 2.0 * u)


def sat(x, drive=1.5):
    return np.tanh(drive * x) / math.tanh(drive)


def norm(x, peak=1.0):
    m = float(np.max(np.abs(x)))
    return x * (peak / m) if m > 0 else x


def fade(x, fin=0.0, fout=0.0):
    x = np.array(x, dtype=float, copy=True)
    n = x.shape[-1]
    if fin > 0:
        k = min(n, ns(fin))
        x[..., :k] *= np.sin(np.linspace(0.0, np.pi / 2, k)) ** 2
    if fout > 0:
        k = min(n, ns(fout))
        x[..., n - k:] *= np.cos(np.linspace(0.0, np.pi / 2, k)) ** 2
    return x


def pan2(x, p=0.0):
    """Constant-power pan of a mono signal (centre = unity on both channels)."""
    th = (float(np.clip(p, -1.0, 1.0)) + 1.0) * np.pi / 4
    return np.stack([x * (math.sqrt(2) * math.cos(th)), x * (math.sqrt(2) * math.sin(th))])


def pan_dyn(x, p):
    th = (np.clip(p, -1.0, 1.0) + 1.0) * np.pi / 4
    return np.stack([x * np.sqrt(2) * np.cos(th), x * np.sqrt(2) * np.sin(th)])


def balance(x, p):
    p = float(np.clip(p, -1.0, 1.0))
    return np.stack([x[0] * min(1.0, 1.0 - p), x[1] * min(1.0, 1.0 + p)])


def stereo(x):
    return x if x.ndim == 2 else np.stack([x, x])


def pad_to(x, n):
    if x.shape[-1] >= n:
        return x[..., :n]
    out = np.zeros(x.shape[:-1] + (n,))
    out[..., :x.shape[-1]] = x
    return out


@lru_cache(maxsize=None)
def _sos(kind, f, order):
    nyq = 0.5 * SR
    if kind == "bp":
        lo, hi = f
        return signal.butter(order, [max(lo, 5.0), min(hi, 0.95 * nyq)], btype="bandpass", fs=SR, output="sos")
    btype = {"lp": "lowpass", "hp": "highpass"}[kind]
    return signal.butter(order, min(max(f, 5.0), 0.95 * nyq), btype=btype, fs=SR, output="sos")


def filt(x, kind, f, order=2):
    """Causal Butterworth (scipy sosfilt)."""
    return signal.sosfilt(_sos(kind, f if np.isscalar(f) else tuple(f), order), x, axis=-1)


def filt0(x, kind, f, order=2):
    """Zero-phase Butterworth (sosfiltfilt) for offline mastering and analysis."""
    return signal.sosfiltfilt(_sos(kind, f if np.isscalar(f) else tuple(f), order), x, axis=-1)


def rbj(kind, f0, q=0.707):
    """RBJ-cookbook biquads, vectorised over f0 -> (..., 6) sos rows."""
    f0 = np.clip(np.asarray(f0, dtype=float), 12.0, 0.46 * SR)
    w0 = 2.0 * np.pi * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2.0 * q)
    if kind == "lp":
        b0 = (1 - cw) / 2
        b1, b2 = 1 - cw, (1 - cw) / 2
    elif kind == "hp":
        b0 = (1 + cw) / 2
        b1, b2 = -(1 + cw), (1 + cw) / 2
    elif kind == "bp":
        b0, b1, b2 = alpha, np.zeros_like(w0), -alpha
    else:
        raise ValueError(kind)
    a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    return np.stack([b0 / a0, b1 / a0, b2 / a0, np.ones_like(w0), a1 / a0, a2 / a0], axis=-1)


def sweep(x, kind, fc, q=0.707, block=64, stages=1):
    """Time-varying biquad: coefficients refreshed every `block` samples, filter state carried over."""
    x = np.asarray(x, dtype=float)
    mono = x.ndim == 1
    x2 = np.atleast_2d(x)
    n = x2.shape[-1]
    fc = np.broadcast_to(np.asarray(fc, dtype=float), (n,))
    nb = (n + block - 1) // block
    centers = np.minimum(np.arange(nb) * block + block // 2, n - 1)
    rows = rbj(kind, fc[centers], q)
    y = np.empty_like(x2)
    zi = np.zeros((stages, x2.shape[0], 2))
    for b in range(nb):
        s, e = b * block, min(n, (b + 1) * block)
        sos = np.repeat(rows[b][None, :], stages, axis=0)
        y[:, s:e], zi = signal.sosfilt(sos, x2[:, s:e], axis=-1, zi=zi)
    return y[0] if mono else y


# ---------------------------------------------------------------- band-limited oscillators
def _blep(ph, dt):
    out = np.zeros_like(ph)
    m = ph < dt
    x = ph[m] / dt[m]
    out[m] = x + x - x * x - 1.0
    m = ph > 1.0 - dt
    x = (ph[m] - 1.0) / dt[m]
    out[m] = x * x + x + x + 1.0
    return out


def saw(freq, n, phase0=0.0):
    """PolyBLEP sawtooth. freq: scalar, (n,) curve, or (V, 1) column of voice frequencies."""
    f = np.asarray(freq, dtype=float)
    if f.ndim == 0 or f.shape[-1] == 1:
        dt = f / SR
        ph = np.mod(np.asarray(phase0, dtype=float) + dt * np.arange(n), 1.0)
    else:
        dt = f / SR
        ph = np.mod(np.asarray(phase0, dtype=float) + np.cumsum(dt, axis=-1) - dt, 1.0)
    dtb = np.ascontiguousarray(np.broadcast_to(dt, ph.shape))
    return 2.0 * ph - 1.0 - _blep(ph, dtb)


def square(freq, n, phase0=0.0):
    return 0.5 * (saw(freq, n, phase0) - saw(freq, n, np.asarray(phase0) + 0.5))


def sine(freq, n, phase0=0.0):
    f = np.asarray(freq, dtype=float)
    if f.ndim == 0:
        return np.sin(2.0 * np.pi * (phase0 + f * np.arange(n) / SR))
    return np.sin(2.0 * np.pi * (phase0 + (np.cumsum(f) - f[0]) / SR))


def adsr(n, a=0.005, d=0.1, s=1.0, r=0.05, gate=None):
    """Linear attack, exponential decay to sustain, raised-cosine release starting at `gate` seconds."""
    t = tt(n)
    g = n / SR - r if gate is None else gate
    env = np.where(t < a, t / max(a, 1e-5), s + (1.0 - s) * np.exp(-(t - a) / max(d, 1e-5)))
    gi = int(np.clip(round(g * SR), 0, n))
    if gi < n:
        v = env[gi - 1] if gi > 0 else 0.0
        k = np.arange(n - gi) / max(1.0, r * SR)
        env[gi:] = v * np.where(k < 1.0, 0.5 + 0.5 * np.cos(np.pi * np.minimum(k, 1.0)), 0.0)
    return env


# ---------------------------------------------------------------- reverbs and delay
def make_ir(rt60, predelay, seed, hp=200.0, lp=10000.0, length=None, early=6):
    """Stereo IR: decorrelated noise per channel, frequency-dependent exponential decay, early taps."""
    rng = np.random.default_rng(seed)
    L = ns(length or min(rt60 * 1.1, 7.0))
    t = tt(L)
    ir = np.zeros((2, L))
    bands = ((None, 500.0, 0.85), (500.0, 2500.0, 1.0), (2500.0, 7000.0, 0.72), (7000.0, None, 0.45))
    for ch in range(2):
        nz = rng.standard_normal(L)
        for lo, hi, k in bands:
            if lo is None:
                b = filt0(nz, "lp", hi, 2)
            elif hi is None:
                b = filt0(nz, "hp", lo, 2)
            else:
                b = filt0(nz, "bp", (lo, hi), 2)
            ir[ch] += b * np.exp(-6.9078 * t / (rt60 * k))
    ir *= 1.0 - np.exp(-t / 0.010)                       # diffuse build-up
    pk = float(np.max(np.abs(ir)))
    bl = ns(0.0025)
    burst = rng.standard_normal(bl) * np.exp(-np.arange(bl) / (0.0007 * SR))
    for ch in range(2):                                  # early reflections: short diffuse bursts, not clicks
        for _ in range(early):
            d = rng.uniform(0.004, 0.045)
            i = ns(d)
            ir[ch, i:i + bl] += pk * rng.uniform(0.25, 0.55) * (1.0 - d / 0.06) * np.roll(burst, ch * 7)
    ir = filt0(filt0(ir, "hp", hp, 2), "lp", min(lp, 7500.0), 2)
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    return np.concatenate([np.zeros((2, ns(predelay))), ir], axis=1)


IR_ROOM = make_ir(0.55, 0.004, seed=11, hp=300.0, lp=9000.0)
IR_HALL = make_ir(2.3, 0.022, seed=12, hp=260.0, lp=8500.0)
IR_LONG = make_ir(4.8, 0.030, seed=13, hp=220.0, lp=7000.0, length=6.0)
LONG_PREDELAY = ns(0.030)


def conv(x, ir):
    return signal.oaconvolve(stereo(x), ir, axes=-1)


def pingpong(x, delay, fb=0.4, taps=8, hp=350.0, lp=5200.0):
    """Ping-pong delay: mono sum, alternating L/R repeats, each repeat band-limited a little more."""
    mono = 0.5 * (x[0] + x[1])
    D = ns(delay)
    n = mono.size
    out = np.zeros((2, n + D * taps))
    sos = _sos("bp", (hp, lp), 1)
    tap, g = mono, 1.0
    for k in range(1, taps + 1):
        tap = signal.sosfilt(sos, tap)
        out[(k - 1) % 2, k * D:k * D + n] += tap * g
        g *= fb
    return out


def delay_fx(x):
    y = pingpong(x, 3 * STEP, fb=0.4, taps=8)          # dotted eighth
    return y + 0.3 * conv(y, IR_HALL)[:, :y.shape[1]]


SEND_FX = {
    "room": lambda x: conv(x, IR_ROOM),
    "hall": lambda x: conv(x, IR_HALL),
    "long": lambda x: conv(x, IR_LONG),
    "delay": delay_fx,
}


def segments(n, gaps):
    """Split [0, n) at silence gaps -> (start, end, kill) with kill = sample where output must stop."""
    segs, s = [], 0
    for g0, g1 in sorted(gaps):
        if g1 <= s or g0 >= n:
            continue
        if g0 > s:
            segs.append((s, g0, g0))
        s = max(s, g1)
    if s < n:
        segs.append((s, n, n))
    return segs


def apply_gapped(x, fn, gaps):
    """Run a reverb/delay per segment so no tail crosses a gap (true silence before the drop)."""
    n = x.shape[-1]
    y = np.zeros_like(x)
    for s, e, kill in segments(n, gaps):
        act = np.flatnonzero(np.any(x[:, s:e] != 0.0, axis=0))
        if act.size == 0:
            continue
        a, b = s + int(act[0]), s + int(act[-1]) + 1
        out = fn(x[:, a:b])
        L = min(out.shape[-1], kill - a)
        out = np.array(out[:, :L])
        if kill < n and a + L == kill:
            k = min(L, ns(0.003))
            out[:, L - k:] *= np.cos(np.linspace(0.0, np.pi / 2, k)) ** 2
        y[:, a:a + L] += out
    return y


# ---------------------------------------------------------------- dynamics
def compressor(x, thr_db, ratio=2.0, attack=0.010, release=0.15, knee=6.0, dec=16):
    """Stereo-linked RMS-ish bus compressor with soft knee; envelope runs at SR/dec."""
    n = x.shape[-1]
    nb = -(-n // dec)
    p = np.zeros(nb * dec)
    p[:n] = np.mean(x ** 2, axis=0)
    lvl = 10.0 * np.log10(p.reshape(nb, dec).mean(axis=1) * 2.0 + 1e-14)   # ~peak-equivalent dB
    over = lvl - thr_db
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    aa, ar = math.exp(-dec / (attack * SR)), math.exp(-dec / (release * SR))
    out = np.empty(nb)
    s = 0.0
    for i, g in enumerate(gr.tolist()):
        s = aa * s + (1 - aa) * g if g > s else ar * s + (1 - ar) * g
        out[i] = s
    gfull = np.interp(np.arange(n), np.arange(nb) * dec + dec / 2, out)
    return x * undb(-gfull)[None, :], gfull


def limiter(x, ceiling_db=-1.1, lookahead=0.003, release=0.08, dec=16):
    """Look-ahead brick-wall limiter without latency: the gain is computed ahead of time."""
    c = undb(ceiling_db)
    n = x.shape[-1]
    peak = np.max(np.abs(x), axis=0)
    req = np.minimum(1.0, c / np.maximum(peak, 1e-12))
    L = ns(lookahead)
    g1 = minimum_filter1d(req, size=L + 1, origin=-(L // 2), mode="nearest")    # min over [i, i+L]
    g2 = uniform_filter1d(g1, size=L + 1, origin=L // 2, mode="nearest")         # mean over [i-L, i]
    nb = -(-n // dec)
    p = np.ones(nb * dec)
    p[:n] = g2
    blk = p.reshape(nb, dec).min(axis=1)
    ar = math.exp(-dec / (release * SR))
    r = np.empty(nb)
    s = 1.0
    for i, v in enumerate(blk.tolist()):
        s = v if v < s else ar * s + (1 - ar) * v
        r[i] = s
    g = np.minimum(g2, np.interp(np.arange(n), np.arange(nb) * dec + dec / 2, r))
    y = np.clip(x * g[None, :], -c, c)
    return y, g


def lufs(x):
    """Integrated loudness (ITU-R BS.1770-4, 48 kHz K-weighting, gated)."""
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    y = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=-1), axis=-1)
    blk, hop = ns(0.4), ns(0.1)
    ms = np.array([np.mean(y[:, i:i + blk] ** 2, axis=1).sum() for i in range(0, y.shape[1] - blk, hop)])
    lk = -0.691 + 10 * np.log10(ms + 1e-15)
    g = ms[lk > -70]
    if g.size == 0:
        return float("-inf")
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g = ms[(lk > -70) & (lk > rel)]
    return float(-0.691 + 10 * np.log10(g.mean()))


# ---------------------------------------------------------------- variable-rate reader (warp, tape-stop)
def vresample(src, pos, zc=16, chunk=4096):
    """Read src (C, M) at fractional positions `pos` with a Blackman-Harris windowed sinc.
    The kernel widens with the local read speed, so faster-than-real-time reading is band-limited."""
    C, M = src.shape
    L = pos.size
    scale = np.maximum(1.0, np.abs(np.gradient(pos)))
    out = np.zeros((C, L))
    for c0 in range(0, L, chunk):
        c1 = min(L, c0 + chunk)
        p, s = pos[c0:c1], scale[c0:c1]
        half = int(math.ceil(zc * float(s.max()))) + 1
        base = np.floor(p).astype(np.int64)
        idx = base[:, None] + np.arange(-half + 1, half + 1)[None, :]
        d = (idx - p[:, None]) / s[:, None]
        u = np.clip(d / zc, -1.0, 1.0)
        w = np.sinc(d) * (0.35875 + 0.48829 * np.cos(np.pi * u) + 0.14128 * np.cos(2 * np.pi * u)
                          + 0.01168 * np.cos(3 * np.pi * u))
        w[np.abs(d) >= zc] = 0.0
        w *= (idx >= 0) & (idx < M)
        ws = w.sum(axis=1, keepdims=True)
        w /= np.where(np.abs(ws) < 1e-9, 1.0, ws)
        idc = np.clip(idx, 0, M - 1)
        for c in range(C):
            out[c, c0:c1] = np.einsum("ij,ij->i", src[c][idc], w)
    return out


# ============================================================== instruments
_CACHE: dict = {}


def cached(key, make):
    v = _CACHE.get(key)
    if v is None:
        v = _CACHE[key] = make()
    return v


KICKS = {
    "main":  dict(f0=152.0, f1=48.0, tp=0.030, dec=0.170, click=0.55, drive=1.9, length=0.36),
    "big":   dict(f0=165.0, f1=47.0, tp=0.034, dec=0.195, click=0.80, drive=2.4, length=0.40),
    "tight": dict(f0=150.0, f1=52.0, tp=0.020, dec=0.110, click=0.45, drive=1.6, length=0.24),
}


def kick(kind="main"):
    """Sine with a fast exponential pitch drop (~150 -> 48 Hz), click transient, tanh drive."""
    def make():
        p = KICKS[kind]
        n = ns(p["length"])
        t = tt(n)
        f = p["f1"] + (p["f0"] - p["f1"]) * np.exp(-t / p["tp"]) + 240.0 * np.exp(-t / 0.0025)
        amp = (1.0 - np.exp(-t / 0.0004)) * np.exp(-(t / p["dec"]) ** 2)
        y = sat(sine(f, n) * amp, p["drive"])
        rng = np.random.default_rng(7)
        click = filt(rng.standard_normal(n), "hp", 2200.0, 2) * np.exp(-t / 0.0011)
        click += 0.6 * np.sin(2 * np.pi * 3100.0 * t) * np.exp(-t / 0.0009)
        return norm(fade(y + p["click"] * 0.35 * click, fout=0.012))
    return cached(("kick", kind), make)


def clap_sound(variant=0):
    """Four noise bursts (the 'clap'), a snare-like body tone, band-passed."""
    def make():
        rng = np.random.default_rng(100 + variant)
        n = ns(0.45)
        t = tt(n)
        offs = [0.0, 0.0105, 0.0205, 0.0315] + np.r_[0.0, rng.uniform(-0.0012, 0.0012, 3)]
        env = np.zeros(n)
        for o in offs[:-1]:
            env += (t >= o) * np.exp(-np.maximum(t - o, 0.0) / 0.0032)
        env += (t >= offs[-1]) * np.exp(-np.maximum(t - offs[-1], 0.0) / 0.075) * 1.1
        nz = rng.standard_normal((2, n))
        nz[1] = 0.8 * nz[0] + 0.6 * nz[1]
        y = filt(nz, "bp", (950.0, 7000.0), 2) * env
        body = sine(178.0 + 60.0 * np.exp(-t / 0.008), n) * np.exp(-t / 0.04) * 0.35
        return norm(sat(1.3 * (y + body[None, :]), 1.2))
    return cached(("clap", variant), make)


def snare(variant=0, tone=0.0):
    def make():
        rng = np.random.default_rng(150 + variant)
        n = ns(0.32)
        t = tt(n)
        k = 2.0 ** (tone / 12.0)
        body = (0.8 * sine(195.0 * k + 70.0 * np.exp(-t / 0.01), n) + 0.35 * np.sin(2 * np.pi * 330.0 * k * t)) \
            * np.exp(-t / 0.055)
        nz = filt(rng.standard_normal(n), "bp", (1200.0, 9500.0), 2) * np.exp(-t / 0.11) * 0.9
        snapn = filt(rng.standard_normal(n), "hp", 4000.0, 2) * np.exp(-t / 0.004) * 0.7
        return norm(fade(body + nz + snapn, fout=0.02))
    return cached(("snare", variant, round(tone, 2)), make)


HAT_PARTIALS = (3140.0, 4210.0, 5280.0, 6650.0, 8110.0, 9690.0, 11720.0, 13480.0)


def hat(kind="closed", variant=0):
    """Metallic partials (inharmonic sines, alias-free) + high-passed noise."""
    def make():
        rng = np.random.default_rng(300 + variant + (50 if kind == "open" else 0))
        length, dec, hp = {"closed": (0.09, 0.016, 6800.0), "open": (0.55, 0.13, 5600.0),
                           "shaker": (0.10, 0.028, 5200.0)}[kind]
        n = ns(length)
        t = tt(n)
        metal = sum(np.sin(2 * np.pi * f * (1 + rng.uniform(-0.01, 0.01)) * t + rng.uniform(0, 2 * np.pi))
                    / (1.0 + 0.15 * i) for i, f in enumerate(HAT_PARTIALS)) / len(HAT_PARTIALS)
        y = 0.55 * metal + 0.9 * rng.standard_normal(n)
        if kind == "shaker":
            y = rng.standard_normal(n)
        y = filt(y, "hp", hp, 2)
        att = 0.004 if kind == "shaker" else 0.0004
        env = (1.0 - np.exp(-t / att)) * np.exp(-t / dec)
        return norm(fade(y * env, fout=0.01))
    return cached(("hat", kind, variant), make)


def tick(tock=False, variant=0):
    """Clock-escapement tick: short resonant ping + wood body + click."""
    def make():
        rng = np.random.default_rng(500 + variant + (20 if tock else 0))
        n = ns(0.06)
        t = tt(n)
        f = (2650.0 if tock else 3400.0) * (1 + rng.uniform(-0.01, 0.01))
        ping = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.0035)
        wood = np.sin(2 * np.pi * f * 0.41 * t) * np.exp(-t / 0.006) * 0.45
        click = filt(rng.standard_normal(n), "bp", (3000.0, 14000.0), 2) * np.exp(-t / 0.0009) * 1.1
        return norm(fade(0.7 * ping + wood + click, fout=0.01))
    return cached(("tick", tock, variant), make)


def crash_sound(length=2.4, seed=0):
    def make():
        rng = np.random.default_rng(600 + seed)
        n = ns(length)
        t = tt(n)
        metal = np.zeros(n)
        for f in rng.uniform(3200.0, 14500.0, 36):
            metal += np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / rng.uniform(0.25, 1.1))
        body = filt(rng.standard_normal((2, n)), "hp", 420.0, 2) + 0.05 * metal[None, :]
        env = (1.0 - np.exp(-t / 0.0006)) * (0.55 * np.exp(-t / 0.18) + 0.45 * np.exp(-t / (0.42 * length)))
        y = sweep(body * env, "lp", 6000.0 + 9000.0 * np.exp(-t / (0.35 * length)), q=0.7, block=128)
        return norm(fade(y, fout=0.08))
    return cached(("crash", round(length, 3), seed), make)


def bass_note(midi, dur, bright=1.0):
    """Additive bass: sine fundamental + decaying upper harmonics (a 'plucked' low-pass), soft drive."""
    def make():
        f = float(mtof(midi))
        n = ns(dur + 0.03)
        t = tt(n)
        y = 0.95 * np.sin(2 * np.pi * f * t)
        for k in range(2, 14):
            if k * f > 3500.0:
                break
            y += (0.62 / k) * np.exp(-t * (5.0 + 10.0 * k) / bright) * np.sin(2 * np.pi * k * f * t)
        env = adsr(n, a=0.0025, d=0.08, s=0.82, r=0.028, gate=dur)
        return sat(y * env, 1.35)
    return cached(("bass", int(midi), round(dur, 4), round(bright, 2)), make)


def supersaw(midis, dur, attack=0.02, release=0.3, cutoff=3200.0, voices=7, detune=17.0, width=0.85,
             hp=160.0, seed=0, decay=0.3, sustain=0.85):
    """7-voice PolyBLEP supersaw per note, +/-detune cents, voices spread across the stereo field."""
    key = ("ss", tuple(int(m) for m in midis), round(dur, 4), attack, release, round(cutoff), voices, detune,
           width, hp, seed, decay, sustain)

    def make():
        rng = np.random.default_rng(800 + seed)
        n = ns(dur + release)
        offs = np.linspace(-1.0, 1.0, voices) * detune
        rank = np.abs(np.round(np.linspace(-1.0, 1.0, voices) * (voices // 2)))
        pans = np.linspace(-1.0, 1.0, voices) * width * np.where(rank % 2 == 1, -1.0, 1.0)
        gl = math.sqrt(2) * np.cos((pans + 1) * np.pi / 4)
        gr = math.sqrt(2) * np.sin((pans + 1) * np.pi / 4)
        amp = np.where(np.abs(offs) < 1e-9, 1.0, 0.72)
        out = np.zeros((2, n))
        for m in midis:
            f = float(mtof(m)) * 2.0 ** (offs / 1200.0)
            y = saw(f[:, None], n, rng.random(voices)[:, None])
            out[0] += (gl * amp) @ y
            out[1] += (gr * amp) @ y
        out /= len(midis) * math.sqrt(voices)
        out = filt(filt(out, "lp", cutoff, 4), "hp", hp, 2)
        return out * adsr(n, attack, decay, sustain, release, gate=dur)[None, :]
    return cached(key, make)


def pluck(midi, dur=0.35, bright=1.0, kind="saw"):
    """Additive pluck: each harmonic decays faster the higher it is (a closing low-pass, alias-free).
    Two slightly detuned partial sets on L / R for width."""
    def make():
        f0 = float(mtof(midi))
        n = ns(dur)
        t = tt(n)
        K = max(1, min(44, int(15000.0 / f0)))
        k = np.arange(1, K + 1)[:, None]
        if kind == "square":
            a = np.where(k % 2 == 1, 1.0, 0.22) / k
        elif kind == "bright":
            a = 1.0 / k + np.where((k == 2) | (k == 4), 0.25, 0.0)
        else:
            a = 1.0 / k
        out = np.zeros((2, n))
        rng = np.random.default_rng(int(midi) * 7 + len(kind))
        for ch, cents in enumerate((-5.0, 5.0)):
            f = f0 * 2.0 ** (cents / 1200.0)
            dec = 5.0 + (k * f / 1000.0) * 7.0 / bright
            # low harmonics in phase (snap), upper ones with random phase (no buzzy pulse train)
            ph = np.where(k < 3, 0.2 * k, rng.uniform(0.0, 2 * np.pi, k.shape))
            out[ch] = np.sum(a * np.exp(-dec * t) * np.sin(2 * np.pi * k * f * t + ph), axis=0)
        env = (1.0 - np.exp(-t / 0.0012))
        return norm(fade(out * env[None, :], fout=0.02))
    return cached(("pl", int(midi), round(dur, 3), round(bright, 2), kind), make)


def stab_sound(midis, length=0.6, seed=5):
    """Chord stab: 5-voice supersaw through a fast closing resonant low-pass + sub thump."""
    def make():
        raw = supersaw(midis, length * 0.35, attack=0.0015, release=length * 0.65, cutoff=14000.0, voices=5,
                       detune=11.0, width=0.7, hp=140.0, seed=seed, decay=0.2, sustain=0.7)
        n = raw.shape[1]
        t = tt(n)
        y = sweep(raw, "lp", 1300.0 + 7500.0 * np.exp(-t / 0.075), q=1.1, block=32)
        y = y * np.exp(-t / (0.33 * length))[None, :]
        sub = np.sin(2 * np.pi * float(mtof(min(midis) - 12)) * t) * np.exp(-t / 0.12) * 0.35
        return norm(fade(y + sub[None, :], fin=0.0005, fout=0.02))
    return cached(("stab", tuple(midis), round(length, 3), seed), make)


def bell(midi, length=1.6, bright=1.0):
    """Additive bell (inharmonic partials, higher ones decaying faster)."""
    def make():
        f = float(mtof(midi))
        n = ns(length)
        t = tt(n)
        y = np.zeros(n)
        for r, a, d in ((1.0, 1.0, 1.0), (2.0, 0.42, 0.62), (2.76, 0.34, 0.45), (4.07, 0.2, 0.3),
                        (5.43, 0.13, 0.22), (6.8, 0.08, 0.16)):
            if f * r > 17000.0:
                continue
            y += a * np.sin(2 * np.pi * f * r * t + r) * np.exp(-t / (d * length * 0.55 * (1.0 if r == 1 else bright)))
        return norm(fade(y * (1.0 - np.exp(-t / 0.0007)), fout=0.05))
    return cached(("bell", int(midi), round(length, 3), round(bright, 2)), make)


def lead_line(notes, total):
    """Monophonic lead: two detuned PolyBLEP saws + sub square, 20 ms glide, delayed vibrato.
    notes: list of (t_start, t_end, midi) in seconds relative to the phrase start."""
    n = ns(total)
    t = tt(n)
    target = np.full(n, np.nan)
    amp = np.zeros(n)
    since = np.full(n, 10.0)
    for a, b, m in notes:
        ia, ib = ns(a), min(n, ns(b))
        target[ia:ib] = m
        since[ia:] = np.minimum(since[ia:], t[:n - ia])
        e = adsr(min(n - ia, ib - ia + ns(0.09)), a=0.004, d=0.22, s=0.72, r=0.07, gate=(ib - ia) / SR)
        amp[ia:ia + e.size] = np.maximum(amp[ia:ia + e.size], e)
    first = notes[0][2]
    target[0] = first if np.isnan(target[0]) else target[0]
    idx = np.where(~np.isnan(target), np.arange(n), 0)
    np.maximum.accumulate(idx, out=idx)
    held = target[idx]
    a_ = math.exp(-1.0 / (0.02 * SR))
    pitch = signal.lfilter([1 - a_], [1, -a_], held, zi=[a_ * held[0]])[0]
    vib = 0.11 * smoothstep(0.12, 0.3, since) * np.sin(2 * np.pi * 5.4 * t)
    f = mtof(pitch + vib)
    left = saw(f * 2.0 ** (7 / 1200), n, 0.13) + 0.3 * square(f * 0.5, n, 0.4)
    right = saw(f * 2.0 ** (-7 / 1200), n, 0.61) + 0.3 * square(f * 0.5, n, 0.9)
    y = np.stack([left, right]) * amp[None, :]
    y = filt(filt(y, "lp", 5200.0, 2), "hp", 180.0, 2)
    return norm(y)


# ============================================================== sound effects
def keyclick(variant=0):
    def make():
        rng = np.random.default_rng(400 + variant)
        n = ns(0.12)
        t = tt(n)
        click = filt(rng.standard_normal(n), "bp", (2500.0, 9000.0), 2) * np.exp(-t / 0.0009)
        tickp = np.sin(2 * np.pi * rng.uniform(1900.0, 2600.0) * t) * np.exp(-t / 0.004) * 0.45
        d = rng.uniform(0.003, 0.005)
        td = np.maximum(t - d, 0.0)
        thock = (t >= d) * np.sin(2 * np.pi * rng.uniform(260.0, 360.0) * td) * np.exp(-td / 0.018) * 0.6
        rattle = filt(rng.standard_normal(n), "bp", (900.0, 3500.0), 2) * np.exp(-td / 0.006) * (t >= d) * 0.25
        return norm(fade(click + tickp + thock + rattle, fout=0.02))
    return cached(("key", variant), make)


def enter_thunk():
    def make():
        rng = np.random.default_rng(450)
        n = ns(0.32)
        t = tt(n)
        click = filt(rng.standard_normal(n), "bp", (2000.0, 8000.0), 2) * np.exp(-t / 0.0012)
        thunk = sine(92.0 + 60.0 * np.exp(-t / 0.012), n) * np.exp(-t / 0.05) * 0.9
        knock = np.sin(2 * np.pi * 410.0 * t) * np.exp(-t / 0.015) * 0.4
        d = 0.022
        td = np.maximum(t - d, 0.0)
        rattle = filt(rng.standard_normal(n), "bp", (900.0, 4000.0), 2) * np.exp(-td / 0.008) * (t >= d) * 0.35
        d2 = 0.036
        td2 = np.maximum(t - d2, 0.0)
        rel = filt(rng.standard_normal(n), "bp", (2500.0, 8000.0), 2) * np.exp(-td2 / 0.0008) * (t >= d2) * 0.4
        return norm(fade(click + thunk + knock + rattle + rel, fout=0.04))
    return cached(("enter",), make)


def click_ui():
    def make():
        rng = np.random.default_rng(470)
        n = ns(0.08)
        t = tt(n)
        y = filt(rng.standard_normal(n), "bp", (1800.0, 7500.0), 2) * np.exp(-t / 0.0007) * 0.9
        y += np.sin(2 * np.pi * 4200.0 * t) * np.exp(-t / 0.0012) * 0.5
        y += np.sin(2 * np.pi * 950.0 * t) * np.exp(-t / 0.005) * 0.35
        return norm(fade(y, fout=0.01))
    return cached(("click",), make)


def blip(midi):
    """Clean UI blip: sine with a tiny pitch dip, a soft 2nd/3rd partial, fast decay."""
    def make():
        f = float(mtof(midi))
        n = ns(0.24)
        t = tt(n)
        fe = f * (1.0 + 0.035 * np.exp(-t / 0.008))
        y = sine(fe, n) + 0.22 * sine(2 * fe, n) * np.exp(-t / 0.03) + 0.08 * sine(3.01 * fe, n) * np.exp(-t / 0.015)
        return norm(fade(y * (1.0 - np.exp(-t / 0.0008)) * np.exp(-t / 0.055), fout=0.02))
    return cached(("blip", int(midi)), make)


def riser(dur, big=1.0, seed=0, tonic_pc=None):
    """White noise through a rising band-pass + an up-sweeping saw pair, crescendo, widening.
    tonic_pc: key of the tonal sweep; default = the film's key."""
    kp = KEY_PC if tonic_pc is None else tonic_pc
    rng = np.random.default_rng(900 + seed)
    n = ns(dur)
    t = tt(n)
    x = t / dur
    fc = 260.0 * (9500.0 / 260.0) ** (x ** 1.35)
    air = sweep(rng.standard_normal((2, n)), "bp", fc, q=0.85) * 0.9
    air += sweep(rng.standard_normal((2, n)), "hp", np.maximum(fc * 0.8, 400.0), q=0.7) * 0.25
    tonic3 = 48 + kp if kp < 7 else 36 + kp
    f = float(mtof(tonic3)) * 4.0 ** (x ** 1.7)
    tone = np.stack([saw(f * 2 ** (6 / 1200), n, 0.1) + 0.5 * saw(2 * f, n, 0.3),
                     saw(f * 2 ** (-6 / 1200), n, 0.6) + 0.5 * saw(2 * f * 2 ** (3 / 1200), n, 0.8)])
    tone = sweep(tone, "lp", np.minimum(500.0 + 7000.0 * x ** 1.5, 12000.0), q=1.2)
    env = (x ** 2.0) * (1.0 - np.exp(-t / 0.05))
    y = (0.75 * air + 0.22 * big * tone) * env[None, :]
    m, s = 0.5 * (y[0] + y[1]), 0.5 * (y[0] - y[1]) * (0.4 + 0.8 * x)
    return fade(np.stack([m + s, m - s]), fout=0.004)


def impact(size=1.0, seed=0):
    """Impact in two layers: (sub, top). sub = mono sub drop ~60 -> 30 Hz, for the 'boom' bus that the kick
    ducks (the kick punches, then the boom blooms; no beating between two low sines of equal level).
    top = noise burst + crash, full attack. The long tail comes from the send."""
    rng = np.random.default_rng(700 + seed)
    n = ns(3.2)
    t = tt(n)
    sub = sine(29.0 + 33.0 * np.exp(-t / 0.20), n) * np.exp(-t / (0.55 * size)) * (1.0 - np.exp(-t / 0.006))
    sub = fade(0.95 * sat(1.4 * sub, 1.4), fout=0.2)
    burst = filt(rng.standard_normal((2, n)), "bp", (180.0, 3800.0), 2) * np.exp(-t / 0.045) * 0.65
    top = burst + 0.5 * size * pad_to(crash_sound(3.2, seed), n)
    return sub, fade(top, fout=0.2)


def hit_fx(seed=0):
    """Mid-weight hit: pitched thump, noise crack, a short digital zap, airy tail."""
    rng = np.random.default_rng(720 + seed)
    n = ns(1.2)
    t = tt(n)
    thump = sine(45.0 + 50.0 * np.exp(-t / 0.05), n) * np.exp(-t / 0.16)
    crack = filt(rng.standard_normal((2, n)), "bp", (800.0, 6000.0), 2) * np.exp(-t / 0.02) * 0.7
    zap = sine(300.0 + 2300.0 * np.exp(-t / 0.018), n) * np.exp(-t / 0.04) * 0.22
    tail = filt(rng.standard_normal((2, n)), "hp", 3000.0, 2) * np.exp(-t / 0.25) * 0.12
    return fade(np.stack([thump + zap, thump + zap]) + crack + tail, fout=0.05)


def reverse_swell(dur, midis, seed=0):
    """Reversed crash + reversed long reverb of a chord ping, ending abruptly on the target."""
    n = ns(dur)
    cym = crash_sound(dur + 0.4, 10 + seed)[:, ::-1][:, -n:]
    wet = conv(stab_sound(midis, 0.35), IR_LONG)[:, LONG_PREDELAY:]
    wet = wet[:, ::-1]
    wet = wet[:, -n:] if wet.shape[1] >= n else np.concatenate([np.zeros((2, n - wet.shape[1])), wet], axis=1)
    x = tt(n) / dur
    y = (0.5 * norm(cym) + 0.9 * norm(wet)) * (x ** 1.6)[None, :]
    return fade(y, fin=0.02, fout=0.002)


def whoosh(dur, peak=0.55, f_lo=250.0, f_hi=6000.0, pan_from=-0.7, pan_to=0.7, seed=0, q=1.0):
    rng = np.random.default_rng(940 + seed)
    n = ns(dur)
    t = tt(n)
    x = t / dur
    a = math.log(0.5) / math.log(peak)
    shape = np.sin(np.pi * x ** a) ** 2
    fc = f_lo * (f_hi / f_lo) ** shape
    y = sweep(rng.standard_normal(n), "bp", fc, q=q, block=32)
    y += 0.4 * sweep(rng.standard_normal(n), "bp", np.minimum(fc * 1.9, 16000.0), q=q * 1.4, block=32)
    p = pan_from + (pan_to - pan_from) * smoothstep(0.0, 1.0, x)
    return fade(pan_dyn(y * shape ** 1.2, p), fin=0.005, fout=0.01)


def granular(src, center, length, rng, grain=0.085, rate=95.0, spread=0.09, cents=7.0, octave_mix=0.15):
    """Granular freeze: Hann-windowed grains read around `center` (samples), random pitch and pan."""
    n = ns(length)
    g = ns(grain)
    M = src.shape[1]
    out = np.zeros((2, n + g))
    win = np.hanning(g)
    count = max(1, int(length * rate))
    for k in range(count):
        start = int((k + rng.uniform(0.0, 1.0)) * n / count)
        pos = center + rng.uniform(-spread, spread) * SR
        ratio = 2.0 ** (rng.normal(0.0, cents) / 1200.0) * (2.0 if rng.random() < octave_mix else 1.0)
        rp = pos + np.arange(g) * ratio
        i0 = np.clip(np.floor(rp).astype(np.int64), 0, M - 2)
        fr = rp - np.floor(rp)
        seg = src[:, i0] * (1.0 - fr) + src[:, i0 + 1] * fr
        out[:, start:start + g] += balance(seg * win[None, :], rng.uniform(-0.7, 0.7))
    return out[:, :n]


def shutter():
    def make():
        rng = np.random.default_rng(1000)
        n = ns(0.25)
        t = tt(n)
        y = filt(rng.standard_normal(n), "bp", (1500.0, 9000.0), 2) * np.exp(-t / 0.0015)
        y += np.sin(2 * np.pi * 2200.0 * t) * np.exp(-t / 0.012) * 0.35
        d = 0.008
        td = np.maximum(t - d, 0.0)
        y += filt(rng.standard_normal(n), "bp", (2000.0, 6000.0), 2) * (t >= d) * np.exp(-td / 0.01) * 0.4
        d2 = 0.062
        td2 = np.maximum(t - d2, 0.0)
        y += (t >= d2) * (filt(rng.standard_normal(n), "bp", (900.0, 5000.0), 2) * np.exp(-td2 / 0.002) * 0.9
                          + np.sin(2 * np.pi * 1400.0 * td2) * np.exp(-td2 / 0.02) * 0.35
                          + np.sin(2 * np.pi * 180.0 * td2) * np.exp(-td2 / 0.025) * 0.5)
        return norm(fade(y, fout=0.03))
    return cached(("shutter",), make)


def scan_fx(dur, seed=0):
    """Scanning sweep: 16th-note upward chirps travelling left -> right over a moving band of noise."""
    rng = np.random.default_rng(1010 + seed)
    n = ns(dur)
    t = tt(n)
    out = np.zeros((2, n + ns(0.1)))
    count = max(2, int(round(dur / STEP)))
    for k in range(count):
        xk = k / (count - 1)
        ln = ns(0.07)
        tl = tt(ln)
        f0 = 900.0 * 2.0 ** xk
        c = sine(f0 * (1.0 + 0.9 * tl / 0.07), ln) * np.exp(-tl / 0.022) * (1.0 - np.exp(-tl / 0.001))
        i = ns(k * dur / count)
        out[:, i:i + ln] += pan2(c, -0.8 + 1.6 * xk) * (1.0 if k % 4 == 0 else 0.6)
    x = t / dur
    bed = sweep(rng.standard_normal(n), "bp", 1200.0 * 4.0 ** x, q=3.0, block=64) * 0.35
    out[:, :n] += pan_dyn(bed, -0.8 + 1.6 * x)
    env = smoothstep(0.0, 0.03, x) * (1.0 - smoothstep(0.92, 1.0, x))
    return out[:, :n] * env[None, :]


def error_buzz(tonic_pc=None):
    """Polite 'nope': two soft square-ish pulses, low-mid, gently buzzing, no harsh top.
    tonic_pc: key it is pitched in (4th degree, octave 3); default = the film's key."""
    kp = KEY_PC if tonic_pc is None else tonic_pc

    def make():
        n = ns(0.24)
        t = tt(n)
        f = float(mtof(48 + (kp + 5) % 12))              # 4th degree, octave 3
        y = sum(np.sin(2 * np.pi * k * f * t) / k * np.exp(-t * k * 6.0) for k in (1, 3, 5, 7, 9))
        gate = smoothstep(0.0, 0.004, t) * (1 - smoothstep(0.066, 0.074, t)) + \
            smoothstep(0.1, 0.104, t) * (1 - smoothstep(0.166, 0.18, t))
        y = filt(y * gate * (1.0 + 0.3 * np.sin(2 * np.pi * 38.0 * t)), "lp", 2200.0, 2)
        return norm(fade(y, fout=0.02))
    return cached(("error", kp), make)


def snap_fx():
    def make():
        rng = np.random.default_rng(1030)
        n = ns(0.18)
        t = tt(n)
        y = filt(rng.standard_normal(n), "bp", (1700.0, 5200.0), 2) * np.exp(-t / 0.0045)
        y += np.sin(2 * np.pi * 2400.0 * t) * np.exp(-t / 0.003) * 0.4
        y += np.sin(2 * np.pi * 380.0 * t) * np.exp(-t / 0.01) * 0.3
        return norm(fade(y * (1.0 - np.exp(-t / 0.0003)), fout=0.02))
    return cached(("snap",), make)


def boom(seed=0):
    """Low cinematic boom (sub glide + rumble); lives on the kick-ducked 'boom' bus."""
    rng = np.random.default_rng(1040 + seed)
    n = ns(2.6)
    t = tt(n)
    sub = sat(1.5 * sine(33.0 + 25.0 * np.exp(-t / 0.3), n) * np.exp(-t / 0.6) * (1.0 - np.exp(-t / 0.006)), 1.6)
    rumble = filt(rng.standard_normal(n), "lp", 160.0, 2) * np.exp(-t / 0.35) * 0.5
    return fade(0.9 * sub + rumble, fout=0.3)


def swirl(dur, midis, seed=0):
    """Rotating chord bed: pan and a little Doppler follow an accelerating rotation."""
    rng = np.random.default_rng(1050 + seed)
    n = ns(dur)
    t = tt(n)
    x = t / dur
    phi = 2 * np.pi * np.cumsum(1.2 + 2.6 * x) / SR
    out = np.zeros((2, n))
    for j, m in enumerate(midis):
        off = 2 * np.pi * j / len(midis)
        f = float(mtof(m)) * (1.0 + 0.0045 * np.cos(phi + off))
        y = filt(saw(f, n, rng.random()), "lp", 2600.0, 2)
        out += pan_dyn(y, 0.85 * np.sin(phi + off))
    air = sweep(rng.standard_normal(n), "bp", 3000.0 * 1.6 ** np.sin(phi), q=1.5)
    out += pan_dyn(air * 0.6, 0.85 * np.sin(phi + np.pi / 2))
    env = smoothstep(0.0, 0.15, x) * (1.0 - smoothstep(0.8, 1.0, x))
    return norm(out) * env[None, :]


def fall_fx(dur, seed=0):
    """Several descending glides spreading outwards + a falling band of noise."""
    rng = np.random.default_rng(1060 + seed)
    n = ns(dur)
    t = tt(n)
    x = t / dur
    out = np.zeros((2, n))
    for j in range(3):
        d = 0.04 * j
        td = np.maximum(t - d, 0.0)
        f = (1700.0 * (1 - 0.1 * j)) * (160.0 / 1700.0) ** np.clip(td / (dur - d), 0, 1)
        y = (sine(f, n) + 0.25 * sine(2 * f, n)) * (t >= d) * (1.0 - np.clip(td / (dur - d), 0, 1)) ** 1.2
        y *= 1.0 - np.exp(-td / 0.005)
        side = (-1) ** j
        out += pan_dyn(y, side * (0.3 + 0.5 * x)) * (0.8 if j else 1.0)
    nz = sweep(rng.standard_normal(n), "bp", 5000.0 * (350.0 / 5000.0) ** x, q=1.0)
    out += 0.5 * np.stack([nz, nz]) * ((1 - x) ** 1.5)[None, :]
    return fade(norm(out), fin=0.004, fout=0.02)


def implode_fx(dur, midis, seed=0):
    """Reverse-reverb suck: a bright chord + crash through the long hall, reversed, + rising air."""
    rng = np.random.default_rng(1070 + seed)
    n = ns(dur)
    src = stab_sound(midis, 0.5)
    src = src + 0.5 * pad_to(crash_sound(0.8, 30), src.shape[1])
    wet = conv(src, IR_LONG)[:, LONG_PREDELAY:][:, ::-1]
    wet = wet[:, -n:] if wet.shape[1] >= n else np.concatenate([np.zeros((2, n - wet.shape[1])), wet], axis=1)
    x = tt(n) / dur
    air = sweep(rng.standard_normal((2, n)), "bp", 300.0 * 30.0 ** (x ** 1.2), q=0.9)
    y = norm(wet) * (x ** 2.0)[None, :] + 0.35 * norm(air) * (x ** 2.5)[None, :]
    return fade(y, fin=0.01, fout=0.002)


def shimmer_fx(midis, seed=0):
    """Glittering bell cascade + sparkle noise, for the name reveal."""
    rng = np.random.default_rng(1080 + seed)
    n = ns(2.6)
    t = tt(n)
    out = np.zeros((2, n))
    for j, m in enumerate(midis):
        b = bell(m, 1.6, bright=1.3)
        i = ns(0.045 * j)
        L = min(n - i, b.size)
        out[:, i:i + L] += pan2(b[:L], (0.65 if j % 2 else -0.65) * (0.3 + 0.7 * j / max(1, len(midis) - 1))) * 0.6
    crackle = (rng.random(n) < 0.004) * rng.uniform(-1, 1, n)
    sp = filt(crackle + 0.15 * rng.standard_normal(n), "hp", 7000.0, 2) * np.exp(-t / 0.6)
    out += np.stack([sp, np.roll(sp, 37)]) * 0.5
    return norm(out)


def chime_fx(midis):
    out = np.zeros((2, ns(2.0)))
    for j, m in enumerate(midis):
        b = bell(m, 1.8, bright=1.1)
        i = ns(0.055 * j)
        L = min(out.shape[1] - i, b.size)
        out[:, i:i + L] += pan2(b[:L], (-0.3, 0.0, 0.3, 0.15)[j % 4]) * (0.8 if j else 1.0)
    return norm(out)


# ============================================================== mixer
GROUP = {"kick": "drums", "drums": "drums", "bass": "bass", "pad": "music", "pluck": "music",
         "lead": "music", "stab": "music", "fx": "sfx", "ui": "sfx", "boom": "sfx"}
STEM_KEYS = ("drums", "bass", "music", "sfx")
SIDECHAIN = {"bass": (24.0, 0.105), "pad": (9.0, 0.24), "pluck": (4.5, 0.15), "lead": (3.0, 0.14),
             "fx": (9.0, 0.20), "boom": (10.0, 0.26)}
# kicks that land on these cues do not duck the fx bus (the impact *is* the downbeat)
SC_KEEP = ("impact", "boom", "final", "hit", "whoosh-through")

# mix levels in dB (relative to the kick at 0 dB peak)
MIX = dict(kick=-2.0, clap=-9.5, snare=-9.0, hat_c=-21.0, hat_o=-19.0, shaker=-27.0, tick=-17.0, crash=-17.0,
           bass=-10.5, pad=-1.0, pluck=-11.0, card=-10.0, lead=-10.0, stab=-9.0, drone=-9.0,
           impact=-3.0, riser=-6.0, whoosh=-13.0, ui=-15.0, key=-14.0, fxhit=-8.0)


class Mixer:
    def __init__(self, t0, length, gaps=()):
        self.t0 = float(t0)
        self.n = int(round(length * SR))
        self.gaps = [(i_of(a - self.t0), i_of(b - self.t0)) for a, b in gaps]
        self.bus: dict = {}
        self.send: dict = {}
        self.kicks: list = []          # (time, duck scale) for the sidechain

    def _get(self, store, key):
        a = store.get(key)
        if a is None:
            a = store[key] = np.zeros((2, self.n))
        return a

    def add(self, bus, t, sig, gain=1.0, pan=0.0, sends=None):
        x = np.asarray(sig, dtype=float)
        x = pan2(x, pan) if x.ndim == 1 else (balance(x, pan) if pan else x)
        i0 = i_of(t - self.t0)
        L = x.shape[1]
        for g0, g1 in self.gaps:                       # nothing sounds inside a gap, nothing crosses it
            if g0 <= i0 < g1:
                return
            if i0 < g0 < i0 + L:
                L = g0 - i0
                x = np.array(x[:, :L])
                k = min(L, ns(0.003))
                x[:, L - k:] *= np.cos(np.linspace(0.0, np.pi / 2, k)) ** 2
        a, b = max(0, i0), min(self.n, i0 + L)
        if b <= a:
            return
        seg = x[:, a - i0:b - i0] * gain
        self._get(self.bus, bus)[:, a:b] += seg
        for typ, lvl in (sends or {}).items():
            self._get(self.send, (bus, typ))[:, a:b] += seg * lvl

    def kick(self, t, kind="main", gain_db=0.0, duck=1.0):
        i = i_of(t - self.t0)
        if any(g0 <= i < g1 for g0, g1 in self.gaps):
            return
        self.add("kick", t, kick(kind), gain=undb(MIX["kick"] + gain_db))
        self.kicks.append((t, duck))

    def duck(self, depth_db, release, keep=(), windows=()):
        g = np.ones(self.n)
        att, rel = ns(0.0015), ns(release)
        u = np.arange(rel) / rel
        shape = np.concatenate([np.linspace(0.0, 1.0, att, endpoint=False), 0.5 + 0.5 * np.cos(np.pi * u)])
        for t, scale in self.kicks:
            if any(abs(t - k) < 0.01 for k in keep) or any(a - 1e-6 <= t < b for a, b in windows):
                continue
            depth = 1.0 - undb(-depth_db * scale)
            i = i_of(t - self.t0) - att
            a, b = max(0, i), min(self.n, i + shape.size)
            if b > a:
                g[a:b] = np.minimum(g[a:b], 1.0 - depth * shape[a - i:b - i])
        return g

    def render(self):
        stems = {k: np.zeros((2, self.n)) for k in STEM_KEYS}
        ducks: dict = {}

        keep = [c["t"] for c in CUES if c["type"] in SC_KEEP]
        wins = [(c["t"], c.get("t_to", c["t"])) for c in CUES if c["type"] == "implode"]

        def duck_for(bus):
            if bus not in SIDECHAIN or not self.kicks:
                return None
            if bus not in ducks:
                fx = bus == "fx"
                ducks[bus] = self.duck(*SIDECHAIN[bus], keep=keep if fx else (), windows=wins if fx else ())
            return ducks[bus]

        for bus, x in self.bus.items():
            d = duck_for(bus)
            stems[GROUP[bus]] += x if d is None else x * d[None, :]
        wet: dict = {}
        for (bus, typ), x in self.send.items():
            d = duck_for(bus)
            y = x if d is None else x * d[None, :]
            key = (GROUP[bus], typ)
            wet[key] = y if key not in wet else wet[key] + y
        pump = self.duck(5.0, 0.22) if self.kicks else None
        for (grp, typ), x in wet.items():
            y = apply_gapped(x, SEND_FX[typ], self.gaps)
            if grp == "music" and pump is not None:
                y *= pump[None, :]                      # pumping reverb / delay returns
            stems[grp] += y
        return stems


# ============================================================== arrangement
HAT_VEL = {0: 0.62, 1: 0.30, 2: 0.80, 3: 0.44}
BASS_ROLL = {1: (0.055, 0.5), 2: (0.085, 1.0), 3: (0.07, 0.75)}      # 16th in the beat: (length s, velocity)
BASS_HALF = {3: (0.09, 0.7), 6: (0.24, 1.0), 10: (0.09, 0.75), 11: (0.09, 0.6), 14: (0.2, 0.9)}
RIFF_A = [(0, 0), (2, 2), (3, 1), (6, 3), (8, 2), (10, 4), (11, 3), (14, 2)]
RIFF_LIGHT = [(0, 0), (2, 1), (4, 2), (6, 3), (8, 2), (10, 1), (12, 3), (14, 4)]
RIFF_SAMPLES = list(enumerate([0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 4, 3]))
RIFF_CLOCK = list(enumerate([0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 0, 2, 1, 4]))
RIFF_SPARSE = [(6, 2), (14, 3)]
LEAD_A = [(0, 0, 2), (3, 1, 2), (6, 2, 2), (8, 3, 3), (11, 2, 2), (14, 1, 2)]
LEAD_B = [(0, 1, 3), (3, 2, 3), (6, 3, 2), (8, 4, 4), (12, 3, 2), (14, 2, 2)]
SWING = 0.04 * STEP                                     # late off-beat 16ths on hats only


def jitter(scale=0.1):
    return float(np.clip(1.0 + scale * RNG.standard_normal(), 0.6, 1.4))


def groove_bar(m, b, s, *, kick=None, kick_db=0.0, duck=1.0, clap=False, snare3=False, hats=None, hats_db=0.0,
               open_hats=True, shaker=False, bass=None, bass_db=0.0, riff=None, riff_db=0.0, riff_kind="saw",
               riff_dur=0.32, riff_bright=1.0, stop_at=None, halftime=False):
    """One bar of the groove on the 16th grid; only steps inside section s (and before stop_at) sound."""
    ch = chord_at(b)
    pl = pool(ch)
    bm = bass_midi(ch)
    riff_map = dict(riff or [])
    for k in range(16):
        pos = b + k / 16
        t = t_of(pos)
        if pos < s["from_bar"] - 1e-9 or pos >= s["to_bar"] - 1e-9:
            continue
        if stop_at is not None and t >= stop_at - 1e-6:
            break
        kb = k % 4
        if kick and (k in (0, 8) if halftime else kb == 0):
            m.kick(t, kick, kick_db, duck)
        if clap and k in (4, 12):
            m.add("drums", t, clap_sound(k // 8), gain=undb(MIX["clap"]) * jitter(0.04), pan=0.04,
                  sends={"room": 0.22, "hall": 0.05})
        if snare3 and k == 8:
            m.add("drums", t, snare(1), gain=undb(MIX["snare"]), sends={"room": 0.3, "hall": 0.08})
            m.add("drums", t, clap_sound(2), gain=undb(MIX["clap"] - 7.0), sends={"room": 0.2})
        th = t + (SWING if k % 2 else 0.0)
        if hats == "full":
            if kb == 2 and open_hats:
                m.add("drums", th, hat("open", k // 4), gain=undb(MIX["hat_o"] + hats_db) * jitter(0.08), pan=0.22,
                      sends={"room": 0.06})
            else:
                m.add("drums", th, hat("closed", (b * 16 + k) % 8),
                      gain=undb(MIX["hat_c"] + hats_db) * HAT_VEL[kb] * jitter(),
                      pan=(0.16 if k % 2 else -0.12), sends={"room": 0.05})
        elif hats == "half":
            v = 0.6 if k % 4 == 0 else (0.42 if k % 2 == 0 else 0.17)
            if k == 14:
                m.add("drums", th, hat("open", 1), gain=undb(MIX["hat_o"] - 3.0), pan=0.22, sends={"room": 0.06})
            else:
                m.add("drums", th, hat("closed", (b * 16 + k) % 8), gain=undb(MIX["hat_c"]) * v * jitter(),
                      pan=(0.16 if k % 2 else -0.12), sends={"room": 0.05})
        if shaker:
            m.add("drums", th, hat("shaker", k % 4), gain=undb(MIX["shaker"]) * (0.35, 0.6, 0.45, 0.8)[kb] * jitter(),
                  pan=0.45)
        if bass == "roll" and kb in BASS_ROLL:
            midi = bm + 12 if (k == 15 and b % 2 == 1) else bm
            d, v = BASS_ROLL[kb]
            m.add("bass", t, bass_note(midi, d), gain=undb(MIX["bass"] + bass_db) * v)
        elif bass == "half" and k in BASS_HALF:
            d, v = BASS_HALF[k]
            m.add("bass", t, bass_note(bm, d), gain=undb(MIX["bass"] + bass_db) * v)
        if k in riff_map:
            idx = min(riff_map[k], len(pl) - 1)
            acc = 1.0 if k in (0, 6, 8) else 0.72
            m.add("pluck", t, pluck(pl[idx], riff_dur, riff_bright, riff_kind),
                  gain=undb(MIX["pluck"] + riff_db) * acc * jitter(0.06), pan=(0.25 if k % 4 >= 2 else -0.25),
                  sends={"delay": 0.22, "hall": 0.14})


def pad_bar(m, b, s, level=0.0, cutoff=3000.0, attack=0.025, release=None, octave=None, hp=170.0):
    """The bar's chord on the supersaw pad, clipped to the part of the bar that belongs to section s."""
    ch = chord_at(b)
    start, end = max(b, s["from_bar"]), min(b + 1, s["to_bar"])
    if end <= start + 1e-9:
        return
    if release is None:
        nxt = next_section(s)
        last = end >= s["to_bar"] - 1e-9
        release = 0.07 if last and (nxt is None or nxt["name"].startswith("ch") or nxt["name"] == "ft") else 0.32
    d = (end - start) * BAR
    y = supersaw(VOICING[ch], d, attack=attack, release=release, cutoff=cutoff, seed=CHORDS.index(ch), hp=hp)
    m.add("pad", t_of(start), y, gain=undb(MIX["pad"] + level), sends={"hall": 0.2})
    if octave is not None:
        y2 = supersaw([x + 12 for x in VOICING[ch][1:]], d, attack=attack, release=release, cutoff=cutoff * 1.5,
                      voices=5, detune=14.0, seed=10 + CHORDS.index(ch), hp=400.0)
        m.add("pad", t_of(start), y2, gain=undb(MIX["pad"] + level + octave), sends={"hall": 0.3})


def first_bar(b, s):
    return b == math.floor(s["from_bar"] + 1e-9)


def rel_bar(b, s):
    return b - math.floor(s["from_bar"] + 1e-9)


def sec_hook(m, b, s):
    if not first_bar(b, s):
        return
    t0, end = s["t"], s["t_to"]
    for g0, _ in GAPS:
        if t0 < g0 <= end:
            end = g0
    dur = end - t0
    n = ns(dur)
    t = tt(n)
    x = t / dur
    tonic1 = 24 + KEY_PC if KEY_PC >= 4 else 36 + KEY_PC          # F1
    sub = (0.85 * np.sin(2 * np.pi * float(mtof(tonic1)) * t) + 0.3 * np.sin(2 * np.pi * float(mtof(tonic1 + 12)) * t))
    sub *= (0.2 + 0.8 * x ** 1.4) * smoothstep(0.0, 0.08, x)
    m.add("bass", t0, sub, gain=undb(MIX["drone"]))
    drone = supersaw([tonic1 + 12, tonic1 + 19, tonic1 + 24], dur, attack=0.5, release=0.005, cutoff=16000.0,
                     voices=5, detune=10.0, hp=60.0, seed=30)
    drone = sweep(drone[:, :n], "lp", 140.0 * (1900.0 / 140.0) ** (x ** 1.3), q=0.9)
    m.add("pad", t0, drone * (smoothstep(0.0, 1.0, x) ** 0.8)[None, :], gain=undb(MIX["drone"] - 1.0),
          sends={"hall": 0.25})
    air = sum(pan2(sine(float(mtof(mm)) * (1 + 0.002 * np.sin(2 * np.pi * (0.3 + 0.1 * j) * t)), n), p)
              for j, (mm, p) in enumerate(((tonic1 + 43, -0.5), (tonic1 + 48, 0.5), (tonic1 + 50, 0.0))))
    m.add("pad", t0, air * (x ** 2.2)[None, :], gain=undb(MIX["drone"] - 17.0), sends={"hall": 0.4})


def sec_identity(m, b, s):
    rel = rel_bar(b, s)
    groove_bar(m, b, s, kick="main", clap=True, hats="full", bass="roll",
               riff=RIFF_A if rel >= 2 else None, riff_db=-4.0)
    pad_bar(m, b, s, level=0.0, cutoff=3000.0)


def sec_chapter(m, b, s):
    if not first_bar(b, s):
        return
    t = s["t"]
    m.kick(t, "big", 0.5, 1.0)
    m.add("stab", t, stab_sound(stab_voicing(chord_at(s["from_bar"])), 0.9), gain=undb(MIX["stab"] + 1.0),
          sends={"hall": 0.35, "long": 0.2})


def sec_board(m, b, s):
    rel = rel_bar(b, s)
    if rel == 0:   # the card bar: pulse + bass under the 16 plucks, pad swells in
        groove_bar(m, b, s, kick="tight", kick_db=-1.5, duck=0.7, bass="roll", bass_db=-3.0)
        pad_bar(m, b, s, level=-4.0, cutoff=1800.0, attack=1.1)
        return
    groove_bar(m, b, s, kick="main", clap=True, hats="full", bass="roll", riff=RIFF_LIGHT, riff_db=-6.0)
    pad_bar(m, b, s, level=-1.0, cutoff=2800.0)
    if rel == 1:
        m.add("drums", t_of(b), crash_sound(2.4, 1), gain=undb(MIX["crash"]), pan=-0.2, sends={"hall": 0.1})


def sec_check(m, b, s):
    groove_bar(m, b, s, kick="main", halftime=True, snare3=True, hats="half", bass="half",
               riff=RIFF_SPARSE, riff_db=-3.0, riff_dur=0.5)
    pad_bar(m, b, s, level=-4.0, cutoff=1700.0)


def sec_rhythm(m, b, s):
    groove_bar(m, b, s, kick="big", kick_db=0.8, duck=1.25, clap=True, hats="full", shaker=True, bass="roll",
               riff=RIFF_A, riff_db=-3.0)
    pad_bar(m, b, s, level=0.5, cutoff=3600.0, octave=-8.0)
    if first_bar(b, s):
        m.add("drums", s["t"], crash_sound(2.4, 2), gain=undb(MIX["crash"] + 1.0), pan=0.2, sends={"hall": 0.1})


def sec_camera(m, b, s):
    rel = rel_bar(b, s)
    groove_bar(m, b, s, kick="main", clap=True, hats="full", open_hats=(rel != 2), bass="roll",
               riff=RIFF_A, riff_db=-5.0)
    pad_bar(m, b, s, level=(-0.5 if rel != 2 else -3.0), cutoff=3000.0)


def sec_samples(m, b, s):
    groove_bar(m, b, s, hats="full", hats_db=3.0, riff=RIFF_SAMPLES, riff_db=1.0, riff_kind="bright", riff_dur=0.28,
               riff_bright=1.3)
    pad_bar(m, b, s, level=-1.0, cutoff=2400.0, hp=200.0)


def implode_start(s):
    c = next((c for c in cues_of("implode") if s["t"] - 1e-6 <= c["t"] < s["t_to"]), None)
    return c["t"] if c else None


def sec_finale(m, b, s):
    stop = next((g0 for g0, _ in GAPS if s["t"] < g0 <= s["t_to"]), s["t_to"])
    groove_bar(m, b, s, kick="big", kick_db=0.5, duck=1.2, clap=True, hats="full", shaker=True, bass="roll",
               riff=RIFF_A, riff_db=-5.0, stop_at=stop)
    pad_bar(m, b, s, level=1.0, cutoff=4200.0, octave=-6.0)
    if first_bar(b, s):        # the lead hook over the whole finale
        notes, bb = [], b
        motif = 0
        while t_of(bb) < stop - 1e-6:
            pl = pool(chord_at(bb), 64, 96)
            base = int(np.argmin([abs(p - 72) for p in pl]))
            for k, idx, ln in (LEAD_A if motif % 2 == 0 else LEAD_B):
                a = t_of(bb + k / 16) - s["t"]
                e = min(t_of(bb + (k + ln) / 16) - s["t"] - 0.01, stop - s["t"])
                if 0.0 <= a < e:
                    notes.append((a, e, pl[min(base + idx, len(pl) - 1)]))
            bb += 1
            motif += 1
        if notes:
            y = lead_line(notes, stop - s["t"] + 0.3)
            m.add("lead", s["t"], y, gain=undb(MIX["lead"]), sends={"delay": 0.28, "hall": 0.22})


def sec_end(m, b, s):
    if not first_bar(b, s):
        return
    t = s["t"]
    dur = DUR - t
    tonic = parse_root(TONIC)[0]
    v = VOICING[TONIC] if TONIC in VOICING else VOICING[CHORDS[0]]
    root = max(x for x in range(v[0] - 12, v[0]) if x % 12 == tonic)        # tonic under the voicing
    chord = sorted(set([root] + v))                                         # e.g. F3 Ab3 C4 F4 G4 = Fm(add9)
    y = supersaw(chord, dur * 0.5, attack=0.004, release=dur * 0.55, cutoff=16000.0, seed=40, decay=1.4, sustain=0.6)
    n = y.shape[1]
    y = sweep(y, "lp", 1300.0 + 4200.0 * np.exp(-tt(n) / 1.1), q=0.8, block=128)
    m.add("stab", t, y, gain=undb(MIX["pad"] + 1.0), sends={"long": 0.45, "hall": 0.2})
    for j, mm in enumerate((72 + tonic, 79 + tonic, 86 + tonic)):          # root, fifth, ninth up high
        m.add("ui", t + 0.03 * j, bell(mm, 3.5, 1.0), gain=undb(MIX["ui"] - 3.0), pan=(-0.4, 0.4, 0.0)[j],
              sends={"long": 0.5})
    tt_ = tt(ns(dur))
    sub = np.sin(2 * np.pi * float(mtof(24 + tonic if tonic >= 4 else 36 + tonic)) * tt_) * np.exp(-tt_ / 1.6)
    m.add("bass", t, sub * smoothstep(0.0, 0.004, tt_), gain=undb(MIX["bass"] - 2.0))


SECTION_FN = {"hook": sec_hook, "identity": sec_identity, "ch1": sec_chapter, "ch2": sec_chapter,
              "board": sec_board, "check": sec_check, "rhythm": sec_rhythm, "camera": sec_camera,
              "samples": sec_samples, "finale": sec_finale, "end": sec_end}


# ---------------------------------------------------------------- cue handlers
def _blip_plan():
    blips = cues_of("blip")
    groups, cur = [], []
    for c in blips:
        if cur and c["bar"] - cur[-1]["bar"] > 0.75:
            groups.append(cur)
            cur = []
        cur.append(c)
    if cur:
        groups.append(cur)
    plan = {}
    for g in groups:
        pcs = chord_pcs(chord_at(g[0]["bar"]))[:3]
        cands = [m for m in LADDER if 82 <= m <= 90 and m % 12 in pcs] or [84]
        si = LADDER.index(min(cands, key=lambda m: abs(m - 84))) if cands[0] in LADDER else 0
        for j, c in enumerate(g):
            plan[(c["t"], c["type"])] = LADDER[min(si + j, len(LADDER) - 1)]
    return plan


def _card_plan():
    cards = cues_of("card")
    if not cards:
        return {}
    nxt = chord_at(math.floor(max(c["bar"] for c in cards)) + 1)
    pcs = chord_pcs(nxt)[:3]
    count = max(int(c.get("note_index", i)) for i, c in enumerate(cards)) + 1
    best = None
    for pr, pc in enumerate(pcs):                       # end on the next chord's root (or 3rd / 5th)
        for e in (m for m in LADDER if 80 <= m <= 93 and m % 12 == pc):
            si = LADDER.index(e) - (count - 1)
            if si < 0:
                continue
            score = abs(LADDER[si] - 55) + 4 * pr
            if best is None or score < best[0]:
                best = (score, si)
    si = best[1] if best else LADDER.index(53)
    return {i: LADDER[min(si + i, len(LADDER) - 1)] for i in range(count)}


BLIP_PLAN = _blip_plan()
CARD_PLAN = _card_plan()


# 开场打字用真实按键录音（CC0，见 sfx/README.md），不再用合成的咔嗒声
SFX_DIR = Path(__file__).resolve().parent.parent / "sfx"
KEY_ORDER = [1, 4, 2, 7, 3, 5, 8, 6, 2, 4, 1, 3]


@lru_cache(maxsize=None)
def real_key(name):
    """读一个按键录音：转 48 kHz 单声道、峰值归一，返回 (信号, 峰值位置秒)。"""
    with wave.open(str(SFX_DIR / f"{name}.wav"), "rb") as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = np.frombuffer(w.readframes(n), dtype=np.int16 if sw == 2 else np.int32).astype(float)
    x = raw.reshape(-1, ch).mean(axis=1) / (32768.0 if sw == 2 else 2147483648.0)
    if sr != SR:
        g = math.gcd(SR, sr)
        x = signal.resample_poly(x, SR // g, sr // g)
    x = x - np.mean(x[: max(8, ns(0.002))])
    x = fade(x / (np.max(np.abs(x)) + 1e-9), fout=0.01)
    return x, float(np.argmax(np.abs(x))) / SR


def place_key(m, t, name, gain, pan, sends):
    x, pk = real_key(name)
    m.add("ui", t - max(0.0, pk - 0.002), x, gain=gain, pan=pan, sends=sends)   # 按键的「接触」对准字出现的那一帧


def cue_keyclick(m, c, i):
    place_key(m, c["t"], f"key-{KEY_ORDER[i % len(KEY_ORDER)]}", undb(MIX["key"] + 1.0) * jitter(0.1),
              float(RNG.uniform(-0.12, 0.12)), {"room": 0.12})


def cue_enter(m, c, i):
    place_key(m, c["t"], "key-space", undb(MIX["key"] + 3.5), 0.0, {"room": 0.2, "hall": 0.08})


def cue_riser(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BAR)
    end = min([g0 for g0, _ in GAPS if t0 < g0 <= t1] + [t1])
    big = 1.0 if (t1 - t0) >= 0.75 * BAR else 0.7
    m.add("fx", t0, riser(end - t0, big, seed=i), gain=undb(MIX["riser"] + (0.0 if big == 1.0 else -2.0)),
          sends={"hall": 0.2})


def cue_impact(m, c, i):
    s = section_at(c["bar"])
    small = bool(s and s["name"].startswith("ch"))
    sub, top = impact(0.85 if small else 1.0, seed=i)
    g = undb(MIX["impact"] - (1.5 if small else 0.0))
    m.add("boom", c["t"], sub, gain=g)
    m.add("fx", c["t"], top, gain=g, sends={"long": 0.32})


def cue_shimmer(m, c, i):
    pl = [p for p in pool(chord_at(c["bar"]), 76, 104)][:9]
    m.add("ui", c["t"], shimmer_fx(pl, i), gain=undb(MIX["ui"] + 1.0), sends={"long": 0.35, "hall": 0.2})


def cue_hit(m, c, i):
    m.add("fx", c["t"], hit_fx(i), gain=undb(MIX["fxhit"]), sends={"hall": 0.25, "long": 0.12})


def cue_stab(m, c, i):
    m.add("stab", c["t"], stab_sound(stab_voicing(chord_at(c["bar"])), 0.7), gain=undb(MIX["stab"]),
          sends={"hall": 0.3, "delay": 0.12})


def cue_snare_roll(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BEAT)
    times, t = [], t0
    while t < t0 + (t1 - t0) / 2 - 1e-6:
        times.append(t)
        t += STEP / 2
    while t < t1 - 1e-6:
        times.append(t)
        t += STEP / 4
    for j, tj in enumerate(times):
        u = j / max(1, len(times) - 1)
        m.add("drums", tj, snare(j % 4, 3.0 * u), gain=undb(MIX["snare"] - 10.0 + 9.0 * u),
              pan=0.1 * (-1) ** j, sends={"room": 0.2, "hall": 0.05})


def cue_reverse_swell(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BAR / 2)
    m.add("fx", t0, reverse_swell(t1 - t0, stab_voicing(chord_at(c.get("to", c["bar"] + 0.5))), seed=i),
          gain=undb(MIX["riser"] + 5.0))


def cue_click(m, c, i):
    m.add("ui", c["t"], click_ui(), gain=undb(MIX["ui"] + 2.0), pan=0.1, sends={"room": 0.15})


def cue_card(m, c, i):
    k = int(c.get("note_index", 0))
    cnt = max(1, len(CARD_PLAN))
    u = k / max(1, cnt - 1)
    m.add("pluck", c["t"], pluck(CARD_PLAN.get(k, 72), 0.55, 1.5, "bright"), gain=undb(MIX["card"] - 3.0 + 4.0 * u),
          pan=-0.5 + u, sends={"delay": 0.16, "hall": 0.22})


def cue_blip(m, c, i):
    m.add("ui", c["t"], blip(BLIP_PLAN.get((c["t"], c["type"]), 84)), gain=undb(MIX["ui"]),
          pan=float(RNG.uniform(-0.3, 0.3)), sends={"hall": 0.18, "delay": 0.06})


def cue_whoosh_through(m, c, i):
    d = 0.85
    m.add("fx", c["t"] - 0.53 * d, whoosh(d, 0.53, 300.0, 7000.0, -0.3, 0.3, seed=i), gain=undb(MIX["whoosh"] + 2.0),
          sends={"hall": 0.2})
    m.add("fx", c["t"], hit_fx(40 + i), gain=undb(MIX["fxhit"] - 5.0), sends={"hall": 0.25})


def cue_shutter(m, c, i):
    m.add("ui", c["t"], shutter(), gain=undb(MIX["ui"] + 3.0), pan=0.05, sends={"room": 0.3})


def cue_scan(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BAR)
    m.add("ui", t0, scan_fx(t1 - t0, i), gain=undb(MIX["ui"] - 3.0), sends={"hall": 0.15})


def cue_error(m, c, i):
    m.add("ui", c["t"], error_buzz(), gain=undb(MIX["ui"] - 1.0), pan=(-0.15 if i % 2 else 0.15),
          sends={"room": 0.2})


def cue_snap(m, c, i):
    m.add("ui", c["t"], snap_fx(), gain=undb(MIX["ui"] + 1.0), pan=(0.12 if i % 2 else -0.12), sends={"room": 0.25})
    pl = pool(chord_at(c["bar"]), 84, 100)
    m.add("ui", c["t"] + 0.012, bell(pl[min(i % 2, len(pl) - 1)], 0.6, 1.2), gain=undb(MIX["ui"] - 8.0),
          sends={"hall": 0.2})


def cue_chime(m, c, i):
    pl = pool(chord_at(c["bar"]), 82, 100)[:4]
    m.add("ui", c["t"], chime_fx(pl), gain=undb(MIX["ui"] + 1.0), sends={"hall": 0.3, "long": 0.15})


def cue_boom(m, c, i):
    m.add("boom", c["t"], boom(i), gain=undb(MIX["impact"] - 1.0))


def cue_whoosh(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BEAT)
    m.add("fx", t0, whoosh(t1 - t0, 0.5, 350.0, 8000.0, -0.85, 0.85, seed=i, q=1.3), gain=undb(MIX["whoosh"] + 1.0),
          sends={"hall": 0.15})


def cue_swirl(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BAR)
    v = [x + 12 for x in VOICING[chord_at(c["bar"])]]
    m.add("fx", t0, swirl(t1 - t0, v, i), gain=undb(MIX["pad"] - 4.0), sends={"hall": 0.3})


def cue_fall(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BAR / 2)
    m.add("fx", t0, fall_fx(t1 - t0, i), gain=undb(MIX["whoosh"] - 1.0), sends={"hall": 0.25})


def cue_implode(m, c, i):
    t0, t1 = c["t"], c.get("t_to", c["t"] + BAR / 2)
    end = min([g0 for g0, _ in GAPS if t0 < g0 <= t1] + [t1])
    m.add("fx", t0, implode_fx(end - t0, stab_voicing(chord_at(c["bar"])), i), gain=undb(MIX["riser"] + 11.0))


def cue_final(m, c, i):
    t = c["t"]
    sub, top = impact(1.3, seed=50 + i)
    m.add("boom", t, sub, gain=undb(MIX["impact"] + 0.5))
    m.add("fx", t, top, gain=undb(MIX["impact"] + 0.5), sends={"long": 0.45})
    m.kick(t, "big", 1.0, 0.6)
    m.add("drums", t, crash_sound(3.5, 5), gain=undb(MIX["crash"] + 2.0), sends={"long": 0.3})
    tonic = parse_root(TONIC)[0]
    v = VOICING[TONIC] if TONIC in VOICING else VOICING[CHORDS[0]]
    root = max(x for x in range(v[0] - 12, v[0]) if x % 12 == tonic)
    top = next(x for x in range(v[-1] + 1, v[-1] + 13) if x % 12 == (tonic + 7) % 12)
    m.add("stab", t, stab_sound([root] + v + [top], 1.4), gain=undb(MIX["stab"] + 1.0),
          sends={"long": 0.5, "hall": 0.3})


def cue_warp_part(m, c, i):
    pass   # rewind / freeze / fast-forward are produced by resampling the ft scene along warp.table


def cue_gap(m, c, i):
    pass   # enforced by the mixer (no event crosses a gap) and the master (digital silence)


CUE_FN = {"keyclick": cue_keyclick, "enter": cue_enter, "riser": cue_riser, "gap": cue_gap, "impact": cue_impact,
          "shimmer": cue_shimmer, "hit": cue_hit, "stab": cue_stab, "snare-roll": cue_snare_roll,
          "reverse-swell": cue_reverse_swell, "click": cue_click, "rewind": cue_warp_part,
          "freeze": cue_warp_part, "fast-forward": cue_warp_part, "card": cue_card, "blip": cue_blip,
          "whoosh-through": cue_whoosh_through, "shutter": cue_shutter, "scan": cue_scan, "error": cue_error,
          "snap": cue_snap, "chime": cue_chime, "boom": cue_boom, "whoosh": cue_whoosh, "swirl": cue_swirl,
          "fall": cue_fall, "implode": cue_implode, "final": cue_final}


def arrange_main(m):
    for s in SECTIONS:                       # every bar a section touches, partial bars included
        fn = SECTION_FN.get(s["name"])
        if fn is None and s["name"] != "ft":
            note(f"unknown section '{s['name']}' (bars {s['from_bar']}-{s['to_bar']}): played as a plain groove")
        for b in range(math.floor(s["from_bar"] + 1e-9), math.ceil(s["to_bar"] - 1e-9)):
            if fn is not None:
                fn(m, b, s)
            elif s["name"] != "ft":
                groove_bar(m, b, s, kick="main", clap=True, hats="full", bass="roll")
                pad_bar(m, b, s)
    counts: dict = {}
    for c in CUES:
        fn = CUE_FN.get(c["type"])
        i = counts.get(c["type"], 0)
        counts[c["type"]] = i + 1
        if fn is None:
            note(f"cue type '{c['type']}' at {c['t']:.3f}s has no sound (unknown type)")
            continue
        fn(m, c, i)
    return counts


# ============================================================== the "ft" section: scene time + warp
def arrange_clockwork(sc, b0, b1):
    """Minimal clockwork groove in scene time: kick, tick/tock 16ths, offbeat sub, music-box arp, soft pad."""
    for b in range(math.floor(b0 + 1e-9), math.ceil(b1 - 1e-9)):
        ch = chord_at(b)
        pl = pool(ch, 64, 91)
        bm = bass_midi(ch)
        for k in range(16):
            pos = b + k / 16
            if pos < b0 - 1e-9 or pos >= b1 - 1e-9:
                continue
            t = t_of(pos)
            if k % 4 == 0:
                sc.kick(t, "tight", -0.5, 0.8)
            v = 0.62 if k % 4 == 0 else (0.42 if k % 2 == 0 else 0.3)
            sc.add("drums", t, tick(k % 2 == 1, k % 4), gain=undb(MIX["tick"]) * v, pan=(0.25 if k % 2 else -0.2),
                   sends={"room": 0.08})
            if k % 4 == 2:
                sc.add("bass", t, bass_note(bm, 0.16, 0.8), gain=undb(MIX["bass"] - 1.0))
            idx = min(dict(RIFF_CLOCK)[k], len(pl) - 1)
            sc.add("pluck", t, pluck(pl[idx], 0.16, 0.9, "square"), gain=undb(MIX["pluck"] - 2.0) * (1.0 if k % 4 == 0 else 0.75),
                   pan=(0.3 if k % 2 else -0.3), sends={"delay": 0.16, "hall": 0.1})
        start, end = max(b, b0), min(b + 1, b1)
        y = supersaw(VOICING[ch], (end - start) * BAR, attack=0.08, release=0.3, cutoff=1500.0, voices=5,
                     detune=12.0, seed=20 + CHORDS.index(ch))
        sc.add("pad", t_of(start), y, gain=undb(MIX["pad"] - 9.0), sends={"hall": 0.15})
    # pre-roll that only the rewind can reach (the warped buffer is muted before warp.from): the rewind
    # overshoots bar 7 slightly before it freezes, so it should land on sound, not on silence
    ch = chord_at(b0)
    pre = 0.35
    y = supersaw(VOICING[ch], pre, attack=0.05, release=0.004, cutoff=1500.0, voices=5, detune=12.0, seed=29)
    sc.add("pad", t_of(b0) - pre, fade(y, fin=0.1, fout=0.004), gain=undb(MIX["pad"] - 9.0))
    for k in (0.5, 0.75):
        sc.add("pluck", t_of(b0) - k * BEAT, pluck(pool(ch, 64, 91)[1], 0.16, 0.9, "square"),
               gain=undb(MIX["pluck"] - 6.0))


def warp_map(tau):
    """Scene time for each real time tau: C2 cubic spline through warp.table, identity outside it."""
    w0, rate = float(WARP["from"]), float(WARP["rate"])
    tab = np.array(WARP["table"], dtype=float)
    grid = w0 + np.arange(tab.size) / rate
    dev = tab - grid
    for end in (0, -1):
        nb = 1 if end == 0 else -2
        if abs(dev[end]) > 1e-4 and abs(dev[nb]) < 1e-5:
            note(f"warp.table[{end}] = {tab[end]:.6f} s deviates {dev[end] * 1000:+.2f} ms from real time at the "
                 f"section edge while its neighbour is in sync; pinned it to {grid[end]:.6f} s (scene time equals "
                 f"real time outside the warp)")
            tab[end] = grid[end]
    spl = CubicSpline(grid, tab, bc_type=((1, 1.0), (1, 1.0)))
    ts = np.array(tau, dtype=float)
    inside = (tau >= grid[0]) & (tau <= grid[-1])
    ts[inside] = spl(tau[inside])
    return ts


def energy_center(src, c_idx, win=0.12, search=0.6):
    """Nudge the freeze point to the nearest spot where the music stem actually has energy."""
    e = uniform_filter1d(np.mean(src ** 2, axis=0), size=ns(win))
    lo, hi = max(0, int(c_idx - search * SR)), min(e.size, int(c_idx + search * SR))
    if hi <= lo:
        return int(c_idx)
    seg = e[lo:hi]
    good = np.flatnonzero(seg >= 0.35 * seg.max())
    if good.size == 0:
        return int(c_idx)
    j = good[np.argmin(np.abs(lo + good - c_idx))]
    return int(lo + j)


def render_ft(main):
    s = SEC.get("ft")
    if not WARP or s is None:
        return None
    S0, S1 = s["t"] - 0.6, s["t_to"] + 5.0
    sc = Mixer(S0, S1 - S0)
    arrange_clockwork(sc, s["from_bar"], s["to_bar"])
    stems = sc.render()
    tau = S0 + np.arange(sc.n) / SR
    ts = warp_map(tau)
    pos = (ts - S0) * SR
    stack = np.concatenate([stems[k] for k in STEM_KEYS])
    warped = vresample(stack, pos)
    speed = np.gradient(ts) * SR
    warped *= smoothstep(0.0, 0.3, np.abs(speed))[None, :]      # tape loses level as it stalls (no DC)
    warped = filt0(warped, "hp", 22.0, 2)
    warped *= smoothstep(float(WARP["from"]) - 0.004, float(WARP["from"]), tau)[None, :]   # pre-roll is rewind-only
    warped = fade(warped, fout=0.5)                                  # tails end inside the buffer
    out = {k: warped[2 * i:2 * i + 2] for i, k in enumerate(STEM_KEYS)}
    info = {"S0": S0, "speed_min": float(speed.min()), "speed_max": float(speed.max())}

    # granular freeze where the speed sits at 0 (unwarped, real time)
    fz = next(iter(cues_of("freeze")), None)
    if fz is not None:
        a, b = fz["t"] - 0.25, fz.get("t_to", fz["t"]) + 0.25
        ia, ib = i_of(a - S0), i_of(b - S0)
        mid = i_of((fz["t"] + fz.get("t_to", fz["t"])) / 2 - S0)
        t_f = float(ts[mid])
        src = stems["music"] + 0.5 * stems["bass"]
        c_idx = energy_center(src, (t_f - S0) * SR)
        cloud = granular(src, c_idx, b - a, np.random.default_rng(77))
        cloud = filt(filt(cloud, "lp", 5500.0, 2), "hp", 160.0, 2)
        env = 1.0 - smoothstep(0.05, 0.6, np.abs(speed[ia:ib]))
        cloud = pad_to(cloud, ib - ia) * env[None, :]
        ref_a, ref_b = i_of(s["t"] - S0), i_of(s["t"] + BAR - S0)
        ref = math.sqrt(np.mean(out["music"][:, ref_a:ref_b] ** 2) + 1e-12)
        plateau = env > 0.95
        cur = math.sqrt(np.mean(cloud[:, plateau] ** 2) + 1e-12) if plateau.any() else 1.0
        main.add("fx", a, cloud, gain=1.3 * ref / cur, sends={"hall": 0.3})
        info.update(freeze_scene_t=t_f, freeze_source_t=S0 + c_idx / SR)

    # transport whirr under rewind / fast-forward
    rw = [c for c in CUES if c["type"] in ("rewind", "fast-forward")]
    if rw:
        a, b = min(c["t"] for c in rw) - 0.1, max(c.get("t_to", c["t"]) for c in rw) + 0.1
        ia, ib = i_of(a - S0), i_of(b - S0)
        sp = np.abs(speed[ia:ib])
        rng = np.random.default_rng(78)
        w = sweep(rng.standard_normal((2, ib - ia)), "bp", 380.0 + 520.0 * sp, q=1.6)
        w *= (smoothstep(1.2, 1.9, sp) * (1.0 + 0.3 * np.sin(2 * np.pi * 13.0 * tt(ib - ia))))[None, :]
        main.add("fx", a, w, gain=undb(-30.0), sends={"room": 0.2})
    return S0, out, info


def tapestop(stems, t0, t1, keys=("drums", "bass", "music")):
    """Power-down: read the stems with speed (1 - x)^2 from t0 until it stalls at t1."""
    i0, i1 = i_of(t0), i_of(t1)
    L = i1 - i0
    if L <= 0:
        return
    x = np.arange(L) / L
    v = (1.0 - x) ** 2
    pos = 64.0 + np.cumsum(v) - v[0]
    gain = smoothstep(0.0, 0.12, v) * (1.0 - 0.8 * x)
    for k in keys:
        src = stems[k][:, i0 - 64:i1 + 64]
        stems[k][:, i0:i1] = vresample(src, pos) * gain[None, :]   # speed 1 at i0: seamless join


# ============================================================== master
FULL_SECTIONS = ("identity", "board", "rhythm", "camera", "finale")


def full_mask():
    msk = np.zeros(N, dtype=bool)
    for name in FULL_SECTIONS:
        s = SEC.get(name)
        if s:
            msk[i_of(s["t"]):i_of(s["t_to"])] = True
    for g0, g1 in GAPS:
        msk[i_of(g0):i_of(g1)] = False
    return msk


def rms_db(x, msk=None):
    seg = x if msk is None else x[:, msk]
    return 10.0 * math.log10(float(np.mean(seg ** 2)) + 1e-20)


def master(stems, target_db=-14.5, ceiling_db=-1.1):
    mix = sum(stems[k] for k in STEM_KEYS)
    msk = full_mask()
    g0 = undb(-17.0 - rms_db(mix, msk))
    mix = mix * g0
    mix, gr = compressor(mix, thr_db=-15.0, ratio=2.0, attack=0.008, release=0.14, knee=6.0)
    mix = filt(mix, "hp", 28.0, 2)                                 # master high-pass (causal: no pre-ringing)
    mid, side = 0.5 * (mix[0] + mix[1]), 0.5 * (mix[0] - mix[1])
    side = filt0(side, "hp", 180.0, 4)                             # everything below ~120 Hz is mono
    mix = np.stack([mid + side, mid - side])
    gain_db = target_db - rms_db(mix, msk)
    for _ in range(6):
        y, g = limiter(mix * undb(gain_db), ceiling_db)
        err = target_db - rms_db(y, msk)
        if abs(err) < 0.05:
            break
        gain_db += err
    k = ns(1.2)                                                    # fade out over the last 1.2 s
    y[:, -k:] *= (0.5 + 0.5 * np.cos(np.linspace(0.0, np.pi, k)))[None, :]
    info = {"pre_gain_db": todb(g0), "comp_gr_max_db": float(gr.max()), "comp_gr_mean_db": float(gr[msk].mean()),
            "master_gain_db": gain_db, "lim_gr_max_db": -todb(float(g.min())),
            "lim_gr_pct_over_1db": float(np.mean(g < undb(-1.0)) * 100.0),
            "stem_gain": g0 * undb(gain_db)}
    return y, info


def gap_mask():
    gm = np.ones(N)
    for g0, g1 in GAPS:
        a, b = i_of(g0), min(N, i_of(g1))
        k = min(a, ns(0.003))
        gm[a - k:a] = np.minimum(gm[a - k:a], np.cos(np.linspace(0.0, np.pi / 2, k)) ** 2)
        gm[a:b] = 0.0
    return gm


def to_pcm16(y, dither=True, rng=None):
    if dither:
        rng = rng or np.random.default_rng(16)
        y = y + (rng.random(y.shape) - rng.random(y.shape)) / 32767.0
    return np.clip(np.round(y * 32767.0), -32768, 32767).astype("<i2")


def write_wav(path, pcm):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.ascontiguousarray(pcm.T).tobytes())


# ============================================================== verification
def low_env(y, fc=200.0):
    """Envelope of the low band: |Hilbert| of the zero-phase low-passed (<200 Hz) mono signal."""
    mono = 0.5 * (y[0] + y[1]) if np.ndim(y) == 2 else y
    lp = filt0(mono, "lp", fc, 4)
    env = np.abs(signal.hilbert(lp, N=next_fast_len(lp.size))[:lp.size])
    return uniform_filter1d(env, size=ns(0.001))


def attack_onset(env, slope, j):
    """Onset of the attack whose steepest point is j: tangent at j meets the level before the attack."""
    pre = env[max(0, j - ns(0.03)):max(1, j - ns(0.004))]
    base = float(np.percentile(pre, 20)) if pre.size else 0.0
    back = (env[j] - base) / max(float(slope[j]), 1e-12)
    return (j - min(max(back, 0.0), ns(0.02))) / SR


def detect_onsets(env):
    """Blind onset detector on the low band: a rise of more than 6 dB within 12 ms is an onset."""
    e = 20.0 * np.log10(env + 1e-9)
    lag = ns(0.012)
    nov = np.zeros_like(e)
    nov[lag:] = e[lag:] - e[:-lag]
    peaks, _ = signal.find_peaks(nov, height=6.0, distance=ns(0.06))
    slope = np.gradient(env)
    out = []
    for p in peaks:
        a, b = max(0, p - ns(0.016)), min(env.size, p + ns(0.006))
        out.append(attack_onset(env, slope, a + int(np.argmax(slope[a:b]))))
    return np.array(out)


def measure_kicks(env, times, win=0.025):
    """For each expected kick: the steepest low-band rise within +/-25 ms, refined to its attack onset."""
    slope = np.gradient(env)
    out = []
    for t in times:
        a, b = max(0, i_of(t - win)), min(env.size, i_of(t + win))
        out.append(attack_onset(env, slope, a + int(np.argmax(slope[a:b]))))
    return np.array(out)


def detector_latency():
    """The measurement on isolated, sample-exact kicks: its own offset (to separate it from timing)."""
    lat = []
    for kind in KICKS:
        buf = np.zeros(ns(3.0))
        at = [0.5 + j * BEAT for j in range(4)]
        k = kick(kind)
        for a in at:
            buf[ns(a):ns(a) + k.size] += k
        lat += list(measure_kicks(low_env(buf), at) - np.array(at))
    return float(np.mean(lat)), float(np.max(lat) - np.min(lat))


def kick_grid_check(y, kick_times, latency):
    """Kicks placed in the unwarped groove sections: measured attack onset vs. the nearest beat of the
    bpm grid (raw, and with the measurement's own offset removed), plus the blind detector's hit rate."""
    env = low_env(y)
    blind = detect_onsets(env)
    rows = []
    for name in ("identity", "board", "check", "rhythm", "camera", "finale"):
        s = SEC.get(name)
        if not s:
            continue
        a, b = s["t"], implode_start(s) or s["t_to"]
        beats = t_of(s["from_bar"]) + BEAT * np.arange(-1, int(round((s["t_to"] - s["t"]) / BEAT)) + 2)
        ks = np.array([t for t in kick_times if a - 1e-6 <= t < b - 1e-6])
        if ks.size == 0:
            continue
        on = measure_kicks(env, ks)
        err = on - beats[np.argmin(np.abs(on[:, None] - beats[None, :]), axis=1)]
        hits = sum(1 for t in ks if blind.size and np.min(np.abs(blind - t)) < 0.025)
        comp = err - latency
        rows.append((name, ks.size, hits, float(np.max(np.abs(err))) * 1000, float(np.max(np.abs(comp))) * 1000,
                     float(np.mean(comp)) * 1000))
    return rows


def centroid(x):
    mono = 0.5 * (x[0] + x[1])
    if mono.size < 4096:
        return float("nan")
    f, _, S = signal.stft(mono, fs=SR, nperseg=4096, noverlap=2048)
    mag = np.abs(S)
    w = mag.sum(axis=0)
    c = (f[:, None] * mag).sum(axis=0) / np.maximum(w, 1e-12)
    return float(np.sum(c * w ** 2) / max(np.sum(w ** 2), 1e-20))


def low_corr(lo):
    """L/R correlation of an already low-passed (<120 Hz) stereo slice, and its level in dBFS."""
    den = math.sqrt(float(np.sum(lo[0] ** 2) * np.sum(lo[1] ** 2)))
    lvl = rms_db(lo)
    return (float(np.sum(lo[0] * lo[1]) / den) if den > 0 else float("nan")), lvl


def fmt_corr(c, lvl):
    return f"{c:+.4f} @{lvl:6.1f}" if lvl > -50.0 else f"  n/a  @{lvl:6.1f}"


def spectrogram_png(y, path):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception as e:      # noqa: BLE001
        return f"skipped ({type(e).__name__}: matplotlib not available)"
    mono = 0.5 * (y[0] + y[1])
    f, t, S = signal.spectrogram(mono, fs=SR, nperseg=4096, noverlap=3072, mode="magnitude")
    fl = np.geomspace(25.0, 20000.0, 480)
    img = np.empty((fl.size, t.size))
    for j in range(t.size):
        img[:, j] = np.interp(fl, f, S[:, j])
    img = 20.0 * np.log10(img + 1e-9)
    fig, ax = plt.subplots(figsize=(18, 6.5), dpi=110)
    ax.imshow(img, origin="lower", aspect="auto", cmap="magma", extent=[0, DUR, 0, fl.size],
              vmin=img.max() - 85, vmax=img.max())
    ticks = [30, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000]
    ax.set_yticks([np.searchsorted(fl, v) for v in ticks])
    ax.set_yticklabels([f"{v // 1000}k" if v >= 1000 else str(v) for v in ticks])
    for s in SECTIONS:
        ax.axvline(s["t"], color="white", lw=0.7, alpha=0.7)
        ax.text(s["t"] + 0.12, fl.size - 18, s["name"], color="white", fontsize=9)
    for g0, g1 in GAPS:
        ax.axvspan(g0, g1, color="cyan", alpha=0.35)
    if WARP:
        ax.axvspan(WARP["from"], WARP["to"], color="lime", alpha=0.06)
    ax.set_xlabel("time (s)")
    ax.set_ylabel("frequency (Hz, log)")
    ax.set_title("score.wav: Claude Opus 5.5 introduces itself (cyan = true-silence gaps, green = warped ft section)")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    return f"written ({path.name})"


# ============================================================== main
def main():
    OUT.mkdir(exist_ok=True)
    STEMS_DIR.mkdir(exist_ok=True)
    log(f"timeline: {BPM:g} BPM, {DUR:.6f} s -> {N} samples; {len(SECTIONS)} sections, {len(CUES)} cues; "
        f"chords from bar {ANCHOR}: {' '.join(CHORDS)}")
    m = Mixer(0.0, DUR, gaps=GAPS)
    counts = arrange_main(m)
    log("arranged main timeline")
    ft = render_ft(m)
    log("rendered + warped the ft section")
    stems = m.render()
    log("rendered main buses, sidechain, reverbs")
    if ft:
        S0, wst, ft_info = ft
        i0 = i_of(S0)
        for k in STEM_KEYS:
            seg = wst[k]
            a, b = max(0, i0), min(N, i0 + seg.shape[1])
            stems[k][:, a:b] += seg[:, a - i0:b - i0]
    else:
        ft_info = {}
    stems["bass"] = filt0(np.repeat(stems["bass"].mean(axis=0, keepdims=True), 2, axis=0), "lp", 3200.0, 2)
    stems["music"] = filt0(stems["music"], "hp", 110.0, 2)
    for s in SECTIONS:
        st = implode_start(s)
        if st:
            end = min([g0 for g0, _ in GAPS if st < g0 <= s["t_to"]] + [s["t_to"]])
            tapestop(stems, st, end)
    log("stems summed (ft warped in, implode power-down)")
    y, minfo = master(stems)
    y *= gap_mask()[None, :]
    pcm = to_pcm16(y)
    for g0, g1 in GAPS:                                   # digital silence: no dither inside the gaps
        pcm[:, i_of(g0):min(N, i_of(g1))] = 0
    assert pcm.shape == (2, N), pcm.shape
    write_wav(OUT / "score.wav", pcm)
    log(f"wrote {OUT / 'score.wav'}")

    g = minfo["stem_gain"]
    peak = max(float(np.max(np.abs(stems[k]))) * g for k in STEM_KEYS)
    sscale = min(1.0, undb(-1.0) / peak) if peak > 0 else 1.0
    for k in STEM_KEYS:
        write_wav(STEMS_DIR / f"{k}.wav", to_pcm16(stems[k] * g * sscale * gap_mask()[None, :], dither=False))
    log("wrote stems")

    report(pcm, stems, minfo, ft_info, counts, sscale, m.kicks)
    log("report written")


def report(pcm, stems, minfo, ft_info, counts, sscale, kicks):
    y = pcm.astype(float) / 32768.0
    L = []
    w = L.append
    w("score.wav report: Claude Opus 5.5 introduces itself")
    w("=" * 78)
    w(f"generated {time.strftime('%Y-%m-%d %H:%M:%S')} by tools/score.py in {time.time() - RUN_T0:.1f} s")
    w(f"timeline: {BPM:g} BPM, bar {BAR:.6f} s, duration {DUR:.6f} s, key {KEY_NAME}, "
      f"chords {'-'.join(CHORDS)} (cycle anchored at bar {ANCHOR}, the drop)")
    w(f"file: 48000 Hz, 2 ch, 16-bit PCM, {pcm.shape[1]} samples (expected round(duration*48000) = {N})")
    w("")
    w("voicings (MIDI): " + ", ".join(f"{k} {VOICING[k]}" for k in CHORDS))
    w(f"card melody (note_index 0..{len(CARD_PLAN) - 1}): {[CARD_PLAN[i] for i in sorted(CARD_PLAN)]}")
    w("")
    w("MASTER")
    w(f"  pre-gain {minfo['pre_gain_db']:+.1f} dB, glue comp GR max {minfo['comp_gr_max_db']:.1f} dB "
      f"(mean in full sections {minfo['comp_gr_mean_db']:.1f} dB), master gain {minfo['master_gain_db']:+.1f} dB")
    w(f"  limiter: max GR {minfo['lim_gr_max_db']:.1f} dB, samples with GR > 1 dB: {minfo['lim_gr_pct_over_1db']:.2f} %")
    w(f"  integrated loudness {lufs(y):.1f} LUFS (BS.1770, gated)")
    pk = float(np.max(np.abs(y)))
    w(f"  sample peak {todb(pk):.2f} dBFS, full-section RMS {rms_db(y, full_mask()):.2f} dBFS")
    w("")
    lo = filt0(y, "lp", 120.0, 4)
    w("SECTIONS                      RMS dBFS  peak dBFS  centroid Hz  <120 Hz L/R corr @ level dBFS")
    for s in SECTIONS:
        a, b = i_of(s["t"]), min(N, i_of(s["t_to"]))
        seg = y[:, a:b]
        tag = " (full)" if s["name"] in FULL_SECTIONS else ""
        w(f"  {s['name'] + tag:<14} {s['t']:6.2f}-{s['t_to']:6.2f}s  {rms_db(seg):7.2f}  {todb(np.max(np.abs(seg))):8.2f}"
          f"  {centroid(seg):10.0f}  {fmt_corr(*low_corr(lo[:, a:b]))}")
    w(f"  whole file                     {rms_db(y):7.2f}  {todb(pk):8.2f}  {centroid(y):10.0f}  {fmt_corr(*low_corr(lo))}")
    w("  (correlation +1 = mono lows; n/a where the band is essentially empty, below -50 dBFS)")
    w("")
    w("STEM RMS per section (dBFS, pre-master gain applied, no limiter)")
    gg = minfo["stem_gain"]
    w("  section        " + "".join(f"{k:>9}" for k in STEM_KEYS))
    for s in SECTIONS:
        a, b = i_of(s["t"]), min(N, i_of(s["t_to"]))
        w(f"  {s['name']:<14} " + "".join(f"{rms_db(stems[k][:, a:b] * gg):9.1f}" for k in STEM_KEYS))
    w(f"  stems written to out/score_stems/ at {todb(sscale):+.1f} dB relative to the mix gain")
    w("")
    w("GAPS (must be true silence, < -60 dBFS)")
    for g0, g1 in GAPS:
        seg = y[:, i_of(g0):min(N, i_of(g1))]
        r = float(np.sqrt(np.mean(seg ** 2))) if seg.size else 0.0
        p = float(np.max(np.abs(seg))) if seg.size else 0.0
        w(f"  {g0:.4f}-{g1:.4f} s: RMS {'digital silence' if r == 0 else f'{todb(r):.1f} dBFS'}, "
          f"peak {'0' if p == 0 else f'{todb(p):.1f} dBFS'}  -> {'OK' if r == 0 or todb(r) < -60 else 'FAIL'}")
    w("")
    lat, spread = detector_latency()
    w("KICK GRID (kick attacks measured in the final mix vs. the beat grid computed from the bpm)")
    w("  low band = |Hilbert| of the <200 Hz signal; for each placed kick the steepest rise within +/-25 ms,")
    w("  onset = where its tangent meets the pre-attack level. On isolated, sample-exact kicks this reads")
    w(f"  {lat * 1000:+.2f} ms (spread {spread * 1000:.2f} ms across kick types); 'corrected' removes that offset.")
    w("  'blind hits' = kicks also found by a blind detector (> 6 dB rise in 12 ms) with no expected times.")
    w("  section   kicks  blind hits  max|raw err| ms  max|corrected| ms  mean corrected ms")
    worst = 0.0
    for name, ne, hits, mx, mxc, mean in kick_grid_check(y, [t for t, _ in kicks], lat):
        worst = max(worst, mxc)
        w(f"  {name:<9} {ne:5d} {hits:11d} {mx:16.2f} {mxc:18.2f} {mean:18.2f}")
    w(f"  worst corrected error {worst:.2f} ms -> {'OK (all within 5 ms)' if worst <= 5.0 else 'CHECK'}")
    w("  (the ft section is excluded: it is time-warped on purpose; blind misses happen where a riser,")
    w("   reverse swell or impact peaks into the downbeat and already fills the low band)")
    w("")
    w("INTEGRITY")
    w(f"  NaN: {int(np.isnan(y).sum())}, clipped samples (|x| >= 32767): {int(np.sum(np.abs(pcm.astype(int)) >= 32767))}")
    dc = y.mean(axis=1)
    w(f"  DC offset L {dc[0]:+.6f}, R {dc[1]:+.6f} -> {'OK' if np.all(np.abs(dc) < 0.001) else 'FAIL'}")
    w(f"  peak {todb(pk):.2f} dBFS -> {'OK (<= -1 dBFS)' if todb(pk) <= -1.0 else 'FAIL'}")
    w(f"  low-band (<120 Hz) L/R correlation, whole file: {low_corr(lo)[0]:.4f}")
    w("")
    w("WARP (ft section)")
    if ft_info:
        w(f"  table speeds from timeline.json: rewind {WARP['speeds'].get('rewind')}x, fast-forward "
          f"{WARP['speeds'].get('fast_forward')}x; spline speed range {ft_info['speed_min']:+.3f}..{ft_info['speed_max']:+.3f}")
        if "freeze_scene_t" in ft_info:
            w(f"  freeze holds scene time {ft_info['freeze_scene_t']:.4f} s; grains taken around "
              f"{ft_info['freeze_source_t']:.4f} s of the scene music stem")
    else:
        w("  no warp in timeline.json")
    w("")
    w("CUES HANDLED")
    w("  " + ", ".join(f"{k} x{v}" for k, v in sorted(counts.items())))
    if REPORT_NOTES:
        w("")
        w("NOTES")
        for n_ in REPORT_NOTES:
            w("  - " + n_)
    w("")
    w(f"spectrogram: {spectrogram_png(y, OUT / 'score_spectrogram.png')}")
    (OUT / "score_report.txt").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
