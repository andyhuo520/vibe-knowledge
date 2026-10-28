#!/usr/bin/env python3
"""Music bed and SFX for the narrated lessons, built from the showcase score's synth code (tools/score.py).

Run:     .venv/bin/python tools/bed.py <lesson.json> <out_dir>
Writes:  <out_dir>/bed.wav          music only (pad, sub, soft drums, plucks + the cold-open excerpt); no ducking
         <out_dir>/sfx.wav          synthesized hits only, one per cue
         <out_dir>/bed_report.txt   per-section RMS, calibration, cue counts, skipped cues, checks
         Both WAVs: 48 kHz, stereo, 16-bit PCM, exactly round(duration * 48000) samples.

lesson.json (seconds on the lesson timeline)
  {"duration": 268.4, "bpm": 100, "key": "F minor", "chords": ["Fm", "Db", "Ab", "Eb"],
   "cold_open": {"from_wav": "showcase/opus-intro/out/score.wav", "src_t0": 13.548, "src_t1": 21.290, "at": 0.0},
   "sections": [{"t": 7.74, "t_to": 40.0, "level": 2, "name": "intro"}, ...],
   "cues": [{"t": 12.3, "type": "slam"}, {"t": 33.0, "t_to": 34.0, "type": "riser"},
            {"t": 41.0, "type": "card", "note_index": 3}, ...]}

  cold_open  optional. from_wav: absolute, or relative to the working directory, to the lesson file's folder or
             any folder above it, or to any folder above this script. Copied sample-exact, with a 1 ms
             anti-click fade-in and a 0.3 s fade-out. Not level-matched: it keeps the film's level.
  sections   level 0 = silence (tails ring out), 1 = soft supersaw pad + sub, 2 = adds a soft kick on beats 1
             and 3, closed 8th hats and a low pluck arp, 3 = four-on-the-floor, offbeat open hats, a brighter
             16th arp and a brighter pad. Bars run on one grid from the first section's t; one chord per bar
             from `chords`, cycling. 1-beat crossfades: centred on the boundary between touching sections
             (gaps under 0.25 s count as touching), inside the section where it meets silence. Levels 1-2 get
             a -4.5 dB dip around 2.2 kHz to leave room for the voice. No ducking, no sidechain pumping.
  cues       slam, whoosh (peaks at t; spans t..t_to if given), whoosh-through (peaks at t), riser (t..t_to,
             peaks at t_to; 1 bar if t_to is missing), impact, blip, click, tick, shutter, snap, chime, error,
             card (note_index = step on the key's pentatonic ladder from the tonic, octave 3), rewind (~0.5 s
             from t, or t..t_to). Unknown types are skipped and listed in the report. Other fields are ignored.

Levels: bed RMS is calibrated per section level (1: -28, 2: -24, 3: -21 dBFS); each sfx hit is normalised to a
peak between -10 and -6 dBFS by type.
"""
from __future__ import annotations

import json
import math
import sys
import time
import wave
from pathlib import Path

import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import score as S  # noqa: E402  (synth + DSP library; importing it renders nothing)

SR = S.SR
RUN_T0 = time.time()

LEVEL_RMS_DB = {1: -28.0, 2: -24.0, 3: -21.0}
SFX_PEAK_DB = {"slam": -6.5, "impact": -6.5, "whoosh-through": -7.0, "riser": -7.5, "whoosh": -8.0,
               "rewind": -8.0, "chime": -8.0, "shutter": -9.0, "snap": -9.0, "card": -10.0, "error": -9.0,
               "blip": -10.0, "click": -10.0, "tick": -10.0, "key": -13.0}     # card runs overlap, so each card is -10

# bed balance: layer gains in dB before the per-level calibration
BED_MIX = dict(pad=-6.0, sub=-21.0, kick=-12.0, hat=-27.0, ohat=-29.0, arp=-10.0)
LAYERS = {                       # layer -> {section level: weight}
    "pad_warm": {1: 1.0, 2: 1.0},
    "pad_bright": {3: 1.0},
    "sub": {1: 1.0, 2: 1.0, 3: 1.0},
    "kick13": {2: 1.0, 3: 1.0},
    "kick24": {3: 0.9},
    "hat8": {2: 1.0},
    "hat16": {3: 1.0},
    "hat_off": {3: 1.0},
    "arp8": {2: 1.0},
    "arp16": {3: 1.0},
}
S.KICKS.setdefault("soft", dict(f0=120.0, f1=50.0, tp=0.024, dec=0.14, click=0.10, drive=1.2, length=0.30))
ARP8 = [0, 2, 4, 2, 1, 3, 5, 3]          # 8th-note contour over the chord pool (level 2)
ARP16 = S.RIFF_A                         # the film's syncopated 16th riff (level 3)
POCKET = (2200.0, -4.5, 0.8)             # voice pocket for levels 1-2: centre Hz, gain dB, Q


def log(msg):
    print(f"[{time.time() - RUN_T0:6.1f}s] {msg}", flush=True)


# ============================================================== lesson file
class Lesson:
    def __init__(self, path):
        self.path = Path(path).resolve()
        d = json.loads(self.path.read_text(encoding="utf-8"))
        self.warnings: list[str] = []
        self.duration = float(d["duration"])
        if self.duration <= 0:
            raise SystemExit("lesson.json: duration must be > 0")
        self.n = int(round(self.duration * SR))
        self.bpm = float(d["bpm"])
        self.beat = 60.0 / self.bpm
        self.bar = 4.0 * self.beat
        self.step = self.bar / 16.0
        self.key = str(d.get("key") or "F minor")
        parts = self.key.split()
        self.tonic = S.parse_root(parts[0])[0]
        self.minor = len(parts) < 2 or parts[1].lower().startswith("min")
        iv = (0, 2, 3, 5, 7, 8, 10) if self.minor else (0, 2, 4, 5, 7, 9, 11)
        self.scale = {(self.tonic + i) % 12 for i in iv}
        penta = {(self.tonic + i) % 12 for i in ((0, 3, 5, 7, 10) if self.minor else (0, 2, 4, 7, 9))}
        self.ladder = [m for m in range(36, 112) if m % 12 in penta]
        self.chords = [str(c) for c in (d.get("chords") or [])]
        if not self.chords:
            names = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
            r = self.tonic
            self.chords = ([names[r] + "m", names[(r + 8) % 12], names[(r + 3) % 12], names[(r + 10) % 12]]
                           if self.minor else [names[r], names[(r + 9) % 12] + "m", names[(r + 5) % 12],
                                               names[(r + 7) % 12]])
            self.warnings.append(f"no chords given: using {' '.join(self.chords)}")
        self.voicing = {}
        prev = None
        for name in self.chords:
            if name not in self.voicing:
                prev = S._voice_lead(S.chord_pcs(name, self.scale), prev)
                self.voicing[name] = prev
        self.cold = d.get("cold_open")
        self.sections = self._sections(d.get("sections") or [])
        self.grid0 = self.sections[0]["t"] if self.sections else 0.0
        self.win = self._windows()
        self.cues = list(d.get("cues") or [])
        t3 = 48 + self.tonic if self.tonic < 7 else 36 + self.tonic
        self.card_base = self.ladder.index(t3)

    def _sections(self, raw):
        secs = []
        for i, s in enumerate(raw):
            name = str(s.get("name") or f"section{i + 1}")
            t, t_to = float(s["t"]), float(s["t_to"])
            lvl = int(round(float(s.get("level", 1))))
            if lvl not in (0, 1, 2, 3):
                self.warnings.append(f"section '{name}': level {lvl} clamped to 0..3")
                lvl = min(3, max(0, lvl))
            t, t_to = max(0.0, t), min(self.duration, t_to)
            if t_to - t < 1e-3:
                self.warnings.append(f"section '{name}' is empty after clamping to 0..duration: ignored")
                continue
            secs.append(dict(name=name, t=t, t_to=t_to, level=lvl))
        secs.sort(key=lambda s: s["t"])
        for a, b in zip(secs, secs[1:]):
            if b["t"] < a["t_to"] - 1e-6:
                self.warnings.append(f"sections '{a['name']}' and '{b['name']}' overlap: '{a['name']}' now ends "
                                     f"at {b['t']:.3f} s")
                a["t_to"] = b["t"]
        return [s for s in secs if s["t_to"] - s["t"] > 1e-3]

    def _windows(self):
        """Per section (u0, u1, d0, d1): raised-cosine fade-in over [u0, u1], fade-out over [d0, d1].
        Windows of touching sections share the same 1-beat ramp, so they sum to exactly 1."""
        B, secs, out = self.beat, self.sections, []
        for i, s in enumerate(secs):
            a, b = s["t"], s["t_to"]
            if i > 0 and a - secs[i - 1]["t_to"] < 0.25:
                c = 0.5 * (a + secs[i - 1]["t_to"])
                u0, u1 = c - B / 2, c + B / 2
            else:
                u0, u1 = a, a + B
            if i + 1 < len(secs) and secs[i + 1]["t"] - b < 0.25:
                c = 0.5 * (b + secs[i + 1]["t"])
                d0, d1 = c - B / 2, c + B / 2
            else:
                d0, d1 = b - B, b
            out.append((u0, u1, d0, d1))
        return out

    def chord_at(self, t):
        return self.chords[math.floor((t - self.grid0) / self.bar + 1e-9) % len(self.chords)]

    def pool(self, name, lo, hi):
        return S.pool(name, lo, hi, scale=self.scale)


def ramp_up(t, u0, u1):
    return np.sin(0.5 * np.pi * np.clip((t - u0) / max(u1 - u0, 1e-9), 0.0, 1.0)) ** 2


def window(w, t):
    u0, u1, d0, d1 = w
    return ramp_up(t, u0, u1) * (1.0 - ramp_up(t, d0, d1))


def env_at(L, gains, t):
    """Layer envelope at times t (array): sum over sections of weight(level) * section window."""
    t = np.atleast_1d(np.asarray(t, dtype=float))
    e = np.zeros_like(t)
    for s, w in zip(L.sections, L.win):
        g = gains.get(s["level"], 0.0)
        if g:
            m = (t >= w[0]) & (t < w[3])
            if m.any():
                e[m] += g * window(w, t[m])
    return e


def gain_curve(L, cal):
    """Per-level calibration as a smooth curve: section values crossfade with the same windows;
    in gaps and level-0 sections the last value holds, so reverb tails decay without a step."""
    vals, last = [], None
    for s in L.sections:
        v = cal.get(s["level"]) if s["level"] > 0 else None
        vals.append(v)
        last = v if v is not None else last
    nxt = next((v for v in vals if v is not None), 1.0)
    held = []
    for v in vals:
        nxt = v if v is not None else nxt
        held.append(nxt)
    t = np.arange(L.n) / SR
    G = np.zeros(L.n)
    W = np.zeros(L.n)
    hold = np.full(L.n, held[0])
    for v, w in zip(held, L.win):
        i0, i1 = max(0, S.i_of(w[0])), min(L.n, S.i_of(w[3]))
        ww = window(w, t[i0:i1])
        G[i0:i1] += v * ww
        W[i0:i1] += ww
        j0 = max(0, S.i_of(w[0]))
        r = ramp_up(t[j0:], w[0], w[1])
        hold[j0:] = hold[j0:] * (1.0 - r) + v * r
    return G + hold * np.clip(1.0 - W, 0.0, 1.0)


# ============================================================== shared helpers
class Acc:
    """Named stereo accumulators (dry buses and sends) over the lesson timeline."""

    def __init__(self, n):
        self.n = n
        self.buf: dict = {}

    def get(self, key):
        b = self.buf.get(key)
        if b is None:
            b = self.buf[key] = np.zeros((2, self.n))
        return b

    def add(self, key, t, sig, gain=1.0, pan=0.0, sends=None):
        x = np.asarray(sig, dtype=float)
        x = S.pan2(x, pan) if x.ndim == 1 else (S.balance(x, pan) if pan else x)
        i0 = S.i_of(t)
        a, b = max(0, i0), min(self.n, i0 + x.shape[1])
        if b <= a:
            return
        seg = x[:, a - i0:b - i0] * gain
        self.get(key)[:, a:b] += seg
        for typ, lvl in (sends or {}).items():
            self.get("send_" + typ)[:, a:b] += seg * lvl


def peaking_sos(f0, gain_db, q):
    A = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * np.pi * f0 / SR
    alpha, cw = np.sin(w0) / (2.0 * q), np.cos(w0)
    a0 = 1.0 + alpha / A
    return np.array([[(1.0 + alpha * A) / a0, -2.0 * cw / a0, (1.0 - alpha * A) / a0,
                      1.0, -2.0 * cw / a0, (1.0 - alpha / A) / a0]])


def mono_lows(x):
    """Everything below ~120 Hz mono: high-pass the side signal at 180 Hz (zero phase)."""
    mid, side = 0.5 * (x[0] + x[1]), S.filt0(0.5 * (x[0] - x[1]), "hp", 180.0, 4)
    return np.stack([mid + side, mid - side])


def rms_db(x):
    return 10.0 * math.log10(float(np.mean(np.square(x))) + 1e-20) if x.size else float("-inf")


def peak_db(x):
    return S.todb(float(np.max(np.abs(x)))) if x.size else float("-inf")


def low_corr(x):
    lo = S.filt0(x, "lp", 120.0, 4)
    den = math.sqrt(float(np.sum(lo[0] ** 2) * np.sum(lo[1] ** 2)))
    return (float(np.sum(lo[0] * lo[1]) / den) if den > 0 else float("nan")), rms_db(lo)


def quantize(x, seed):
    """Float -> int32 PCM codes on the int16 scale (x * 32768), TPDF dither only where there is signal,
    so digital silence stays silent and copied 16-bit material stays exact."""
    rng = np.random.default_rng(seed)
    q = x * 32768.0
    act = np.abs(x) > 1e-6
    q = q + (rng.random(x.shape) - rng.random(x.shape)) * act
    return np.round(q).astype(np.int64)


def to_int16(q):
    return np.clip(q, -32768, 32767).astype("<i2")


# ============================================================== bed
def sub_note(midi, dur):
    def make():
        f = float(S.mtof(midi))
        n = S.ns(dur + 0.2)
        t = S.tt(n)
        y = np.sin(2 * np.pi * f * t) + 0.12 * np.sin(4 * np.pi * f * t + 0.3)
        return y * S.adsr(n, a=0.06, d=0.3, s=0.85, r=0.15, gate=dur)
    return S.cached(("bedsub", int(midi), round(dur, 4)), make)


def render_bed(L):
    if not any(s["level"] > 0 for s in L.sections):
        L.warnings.append("no section with level > 0: bed.wav holds only the cold open (if any)")
        return np.zeros((2, L.n)), dict(cal_db={}, balance={}, lim_gr_db=0.0, peak_pre_db=float("-inf"), nbars=0)
    acc = Acc(L.n)
    rng = np.random.default_rng(2410)
    jit = lambda s=0.06: float(np.clip(1.0 + s * rng.standard_normal(), 0.7, 1.3))  # noqa: E731
    nbars = int(math.ceil((L.duration - L.grid0) / L.bar)) if L.sections else 0
    last_active = max((w[3] for s, w in zip(L.sections, L.win) if s["level"] > 0), default=-1.0)
    for k in range(nbars):
        tb = L.grid0 + k * L.bar
        if tb > last_active:
            break
        ch = L.chords[k % len(L.chords)]
        ci = L.chords.index(ch)
        # sustained layers: envelope applied sample by sample (release tails included)
        span = tb + np.arange(S.ns(L.bar + 1.0)) / SR
        for layer, cutoff in (("pad_warm", 1150.0), ("pad_bright", 2500.0)):
            e = env_at(L, LAYERS[layer], span)
            if e.any():
                y = S.supersaw(L.voicing[ch], L.bar, attack=0.35, release=1.0, cutoff=cutoff, voices=7,
                               detune=13.0, width=0.8, hp=140.0, seed=50 + ci, decay=0.6, sustain=0.9)
                acc.add("pad", tb, y * e[None, :y.shape[1]], gain=S.undb(BED_MIX["pad"]), sends={"hall": 0.22})
        y = sub_note(S.bass_midi(ch), L.bar)
        e = env_at(L, LAYERS["sub"], tb + np.arange(y.size) / SR)
        if e.any():
            acc.add("sub", tb, y * e, gain=S.undb(BED_MIX["sub"]))
        # rhythmic layers: each hit takes the envelope value at its onset and keeps its own tail
        pl8, pl16 = L.pool(ch, 55, 79), L.pool(ch, 60, 86)
        riff = dict(ARP16)
        steps = tb + np.arange(16) * L.step
        genv = {name: env_at(L, LAYERS[name], steps) for name in LAYERS if not name.startswith(("pad", "sub"))}
        for j in range(16):
            t = float(steps[j])
            if t >= L.duration:
                break
            g = {name: float(v[j]) for name, v in genv.items()}
            if j in (0, 8) and g["kick13"] > 1e-4:
                acc.add("drums", t, S.kick("soft"), gain=S.undb(BED_MIX["kick"]) * g["kick13"], sends={"room": 0.04})
            if j in (4, 12) and g["kick24"] > 1e-4:
                acc.add("drums", t, S.kick("soft"), gain=S.undb(BED_MIX["kick"]) * g["kick24"], sends={"room": 0.04})
            if j % 2 == 0 and g["hat8"] > 1e-4:
                v = 0.8 if j % 4 == 2 else 0.5
                acc.add("drums", t, S.hat("closed", (k * 16 + j) % 8), gain=S.undb(BED_MIX["hat"]) * v * g["hat8"] * jit(),
                        pan=(0.15 if j % 4 == 2 else -0.1), sends={"room": 0.08})
            if j % 4 != 2 and g["hat16"] > 1e-4:
                v = (0.55, 0.28, 0.0, 0.4)[j % 4]
                acc.add("drums", t, S.hat("closed", (k * 16 + j) % 8), gain=S.undb(BED_MIX["hat"]) * v * g["hat16"] * jit(),
                        pan=(0.15 if j % 2 else -0.1), sends={"room": 0.08})
            if j % 4 == 2 and g["hat_off"] > 1e-4:
                acc.add("drums", t, S.hat("open", j // 4), gain=S.undb(BED_MIX["ohat"]) * g["hat_off"] * jit(0.05),
                        pan=0.2, sends={"room": 0.06})
            if j % 2 == 0 and g["arp8"] > 1e-4:
                idx = min(ARP8[(j // 2) % len(ARP8)], len(pl8) - 1)
                acc.add("arp", t, S.pluck(pl8[idx], 0.5, 0.55, "saw"),
                        gain=S.undb(BED_MIX["arp"]) * (1.0 if j % 4 == 0 else 0.72) * g["arp8"] * jit(),
                        pan=(0.2 if j % 4 == 2 else -0.2), sends={"delay": 0.2, "hall": 0.18})
            if j in riff and g["arp16"] > 1e-4:
                idx = min(riff[j], len(pl16) - 1)
                acc.add("arp", t, S.pluck(pl16[idx], 0.32, 0.9, "saw"),
                        gain=S.undb(BED_MIX["arp"]) * (1.0 if j in (0, 6, 8) else 0.72) * g["arp16"] * jit(),
                        pan=(0.25 if j % 4 >= 2 else -0.25), sends={"delay": 0.22, "hall": 0.14})
    log(f"bed: {nbars} bars scheduled")

    n = L.n
    dry_keys = [k for k in ("pad", "sub", "drums", "arp") if k in acc.buf]
    balance = {k: acc.buf[k] for k in dry_keys}            # for the report (pre-calibration)
    raw = np.zeros((2, n))
    for k in dry_keys:
        raw += acc.buf[k]
    if "send_hall" in acc.buf:
        raw += S.conv(acc.buf.pop("send_hall"), S.IR_HALL)[:, :n]
    if "send_room" in acc.buf:
        raw += S.conv(acc.buf.pop("send_room"), S.IR_ROOM)[:, :n]
    if "send_delay" in acc.buf:
        raw += S.pingpong(acc.buf.pop("send_delay"), 3 * L.step, fb=0.35, taps=6)[:, :n]
    log("bed: reverb and dotted-eighth delay")

    t = np.arange(n) / SR
    w3 = env_at(L, {3: 1.0}, t)
    pocket = signal.sosfilt(peaking_sos(*POCKET), raw, axis=-1)
    bed = pocket + (raw - pocket) * w3[None, :]
    del pocket, raw
    bed = mono_lows(S.filt(bed, "hp", 28.0, 2))

    cal = {lvl: 1.0 for lvl in (1, 2, 3)}
    meas = {}
    for _ in range(4):
        y = bed * gain_curve(L, cal)[None, :]
        meas = level_rms(L, y)
        err = {lvl: LEVEL_RMS_DB[lvl] - db for lvl, db in meas.items()}
        for lvl, e in err.items():
            cal[lvl] *= S.undb(e)
        if all(abs(e) < 0.03 for e in err.values()):
            break
    G = gain_curve(L, cal)
    y = bed * G[None, :]
    peak_pre = float(np.max(np.abs(y))) if y.size else 0.0
    y, lim = S.limiter(y, -1.0)
    bal = {}
    for lvl in (1, 2, 3):
        ranges = interiors(L, lvl)
        if ranges:
            bal[lvl] = {k: rms_db(np.concatenate([v[:, a:b] * G[None, a:b] for a, b in ranges], axis=1))
                        for k, v in balance.items()}
    info = dict(cal_db={lvl: S.todb(c) for lvl, c in cal.items() if lvl in meas}, balance=bal,
                lim_gr_db=-S.todb(float(np.min(lim))), peak_pre_db=S.todb(peak_pre), nbars=nbars)
    return y, info


def interiors(L, level):
    """Sample ranges of the sections at `level`, one beat in from each end (no crossfades)."""
    out = []
    for s in L.sections:
        if s["level"] != level:
            continue
        a, b = s["t"] + L.beat, s["t_to"] - L.beat
        if b - a < L.beat:
            a, b = s["t"], s["t_to"]
        out.append((S.i_of(a), min(L.n, S.i_of(b))))
    return out


def level_rms(L, y):
    res = {}
    for lvl in (1, 2, 3):
        rs = interiors(L, lvl)
        if rs:
            p = sum(float(np.sum(np.square(y[:, a:b]))) for a, b in rs)
            cnt = sum(2 * (b - a) for a, b in rs)
            res[lvl] = 10.0 * math.log10(p / max(cnt, 1) + 1e-20)
    return res


# ============================================================== cold open
def resolve_path(p, lesson_path):
    p = Path(p)
    if p.is_absolute():
        return p if p.exists() else None
    bases = [Path.cwd(), lesson_path.parent, *lesson_path.parents, HERE, *HERE.parents]
    for b in bases:
        c = b / p
        if c.exists():
            return c.resolve()
    return None


def cold_open(L):
    """-> (int32 codes (2, len), start sample, info) or None. 16-bit 48 kHz sources are copied exactly."""
    co = L.cold
    if not co:
        return None
    src = resolve_path(co["from_wav"], L.path)
    if src is None:
        raise SystemExit(f"cold_open.from_wav not found: {co['from_wav']} (tried the working directory, the "
                         f"lesson folder and its parents, and the folders above {HERE})")
    with wave.open(str(src), "rb") as w:
        sr, ch, sw, nf = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(nf)
    if sw == 2:
        x = np.frombuffer(raw, dtype="<i2").reshape(-1, ch).T.astype(np.int64)
    elif sw == 3:
        b = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        v = (b[:, 0].astype(np.int64) | (b[:, 1].astype(np.int64) << 8) | (b[:, 2].astype(np.int64) << 16))
        v = np.where(v >= 1 << 23, v - (1 << 24), v)
        x = v.reshape(-1, ch).T
    elif sw == 4:
        x = np.frombuffer(raw, dtype="<i4").reshape(-1, ch).T.astype(np.int64)
    else:
        raise SystemExit(f"cold_open: unsupported sample width {sw} in {src}")
    x = x[:2] if ch >= 2 else np.repeat(x, 2, axis=0)
    exact = sw == 2 and sr == SR
    n0 = int(round(float(co["src_t0"]) * sr))
    n1 = int(round(float(co["src_t1"]) * sr))
    n0, n1 = max(0, n0), min(x.shape[1], n1)
    if n1 <= n0:
        raise SystemExit("cold_open: src_t1 must be after src_t0 (and inside the file)")
    seg = x[:, n0:n1]
    if not exact:                                   # other formats: convert to the int16 scale
        f = seg / float(1 << (8 * sw - 1))
        if sr != SR:
            g = math.gcd(SR, sr)
            f = signal.resample_poly(f, SR // g, sr // g, axis=-1)
            L.warnings.append(f"cold open resampled {sr} -> {SR} Hz (not sample-exact)")
        if sw != 2:
            L.warnings.append(f"cold open source is {8 * sw}-bit: converted to 16-bit (not sample-exact)")
        seg = np.round(f * 32768.0).astype(np.int64)
    seg = seg.copy()
    m = seg.shape[1]
    fi, fo = min(m, S.ns(0.001)), min(m, S.ns(0.3))
    seg[:, :fi] = np.round(seg[:, :fi] * (np.sin(np.linspace(0.0, np.pi / 2, fi)) ** 2)[None, :])
    seg[:, m - fo:] = np.round(seg[:, m - fo:] * (np.cos(np.linspace(0.0, np.pi / 2, fo)) ** 2)[None, :])
    at = S.i_of(float(co.get("at", 0.0)))
    info = dict(src=str(src), sr=sr, bits=8 * sw, n0=n0, n1=n1, at=at, m=m, fi=fi, fo=fo, exact=exact,
                orig=x[:, n0:n1] if exact else None)
    return seg, at, info


# ============================================================== sfx
def with_fx(dry, L=None, hall=0.0, room=0.0, long=0.0, delay=0.0):
    dry = S.stereo(np.asarray(dry, dtype=float))
    parts = [dry]
    if hall:
        parts.append(hall * S.conv(dry, S.IR_HALL))
    if room:
        parts.append(room * S.conv(dry, S.IR_ROOM))
    if long:
        parts.append(long * S.conv(dry, S.IR_LONG))
    if delay:
        parts.append(delay * S.pingpong(dry, 3 * L.step, fb=0.35, taps=5))
    n = max(p.shape[1] for p in parts)
    y = sum(S.pad_to(p, n) for p in parts)
    a = np.max(np.abs(y), axis=0)
    keep = np.flatnonzero(a > a.max() * 1e-4)                       # trim the inaudible end of tails
    return S.fade(y[:, :keep[-1] + 1], fout=0.02) if keep.size else y


def sfx_slam(L, c, k, plan):
    n = S.ns(0.7)
    t = S.tt(n)
    rng = np.random.default_rng(3100 + k)
    body = S.pad_to(S.kick("big"), n)
    crack = S.pad_to(S.snare(k % 4, 2.0), n)
    whack = S.filt(rng.standard_normal((2, n)), "bp", (1400.0, 9000.0), 2) * np.exp(-t / 0.010)
    air = S.filt(rng.standard_normal((2, n)), "hp", 5000.0, 2) * np.exp(-t / 0.08) * 0.08
    dry = 0.9 * np.stack([body, body]) + 0.45 * np.stack([crack, crack]) + 0.35 * whack + air
    return with_fx(dry, room=0.3, hall=0.06), c["t"]


def sfx_whoosh(L, c, k, plan):
    side = 1.0 if k % 2 == 0 else -1.0
    if c.get("t_to") is not None and float(c["t_to"]) > c["t"]:
        d = min(max(float(c["t_to"]) - c["t"], 0.15), 3.0)
        start = c["t"]
    else:
        d = 0.6
        start = c["t"] - 0.5 * d
    y = S.whoosh(d, 0.5, 300.0, 7500.0, -0.75 * side, 0.75 * side, seed=k, q=1.1)
    return with_fx(y, hall=0.15), start


def sfx_whoosh_through(L, c, k, plan):
    d = 0.85
    w = S.whoosh(d, 0.53, 300.0, 7000.0, -0.3, 0.3, seed=40 + k)
    h = S.hit_fx(60 + k) * S.undb(-5.0)
    lead = S.ns(0.53 * d)
    y = S.pad_to(w, max(w.shape[1], lead + h.shape[1]))
    y[:, lead:lead + h.shape[1]] += h
    return with_fx(y, hall=0.2), c["t"] - 0.53 * d


def sfx_riser(L, c, k, plan):
    t1 = float(c["t_to"]) if c.get("t_to") is not None else c["t"] + L.bar
    d = max(0.2, t1 - c["t"])
    y = S.riser(d, 1.0 if d >= 0.75 * L.bar else 0.7, seed=k, tonic_pc=L.tonic)
    return with_fx(y, hall=0.2), c["t"]


def sfx_impact(L, c, k, plan):
    sub, top = S.impact(1.0, seed=k)
    dry = np.stack([sub, sub]) + top
    wet = 0.32 * S.conv(top, S.IR_LONG)
    n = max(dry.shape[1], wet.shape[1])
    return with_fx(S.pad_to(dry, n) + S.pad_to(wet, n)), c["t"]


def sfx_blip(L, c, k, plan):
    return with_fx(S.blip(plan.get(id(c), 84)), hall=0.18), c["t"]


def sfx_click(L, c, k, plan):
    return with_fx(S.click_ui(), room=0.15), c["t"]


def sfx_tick(L, c, k, plan):
    return with_fx(S.tick(k % 2 == 1, k % 4), room=0.1), c["t"]


def sfx_shutter(L, c, k, plan):
    return with_fx(S.shutter(), room=0.3), c["t"]


def sfx_snap(L, c, k, plan):
    y = S.pad_to(S.stereo(S.snap_fx()), S.ns(0.8))
    pl = L.pool(L.chord_at(c["t"]), 84, 100)
    b = S.bell(pl[(k % 2) % len(pl)], 0.6, 1.2) * S.undb(-8.0)
    i = S.ns(0.012)
    y[:, i:i + b.size] += b[None, :y.shape[1] - i]
    return with_fx(y, room=0.25, hall=0.1), c["t"]


def sfx_chime(L, c, k, plan):
    return with_fx(S.chime_fx(L.pool(L.chord_at(c["t"]), 82, 100)[:4]), hall=0.3, long=0.12), c["t"]


def sfx_error(L, c, k, plan):
    return with_fx(S.error_buzz(L.tonic), room=0.2), c["t"]


def sfx_card(L, c, k, plan):
    idx = int(c.get("note_index", k))
    midi = L.ladder[min(max(0, L.card_base + idx), len(L.ladder) - 1)]
    u = min(1.0, max(0.0, idx / 15.0))
    y = S.balance(S.pluck(midi, 0.55, 1.5, "bright"), -0.5 + u)
    return with_fx(y, L, hall=0.22, delay=0.16), c["t"]


def sfx_rewind(L, c, k, plan):
    """Tape-rewind gesture: a tiny clockwork loop in the lesson's key and tempo is played forward, stopped
    (tape-stop) and spun backwards up to ~3x and down again, read with the score's anti-aliased resampler."""
    D = 0.5
    if c.get("t_to") is not None and float(c["t_to"]) > c["t"]:
        D = min(max(float(c["t_to"]) - c["t"], 0.25), 2.0)
    pl = L.pool(L.chord_at(c["t"]), 64, 88)
    src = np.zeros((2, S.ns(2.4)))
    j = 0
    while j * L.step < 1.6:
        i = S.ns(j * L.step)
        tk = S.tick(j % 2 == 1, j % 4)
        src[:, i:i + tk.size] += tk * (0.55 if j % 4 == 0 else 0.35)
        if j % 4 == 0:
            kk = S.kick("tight")
            src[:, i:i + kk.size] += 0.7 * kk
        if j % 2 == 0:
            p = S.pluck(pl[(j // 2) % len(pl)], 0.3, 0.9, "square")
            src[:, i:i + p.shape[1]] += 0.5 * p
        j += 1
    m = S.ns(D)
    x = np.arange(m) / m
    a = 0.16
    v = np.where(x < a, np.cos(0.5 * np.pi * x / a) ** 2,
                 -3.2 * np.sin(np.pi * np.clip((x - a) / (1 - a), 0.0, 1.0)) ** 0.9)
    p0 = S.ns(1.15)
    back = float(np.sum(np.abs(v[x >= a])))
    if back > 0.9 * p0:
        v[x >= a] *= 0.9 * p0 / back
    pos = p0 + np.cumsum(v) - v[0]
    sp = np.abs(v)
    y = S.vresample(src, pos) * (S.smoothstep(0.0, 0.25, sp) * (0.6 + 0.4 * np.minimum(sp, 1.0)))[None, :]
    rng = np.random.default_rng(3200 + k)
    whirr = S.sweep(rng.standard_normal((2, m)), "bp", 380.0 + 520.0 * sp, q=1.6)
    y = S.fade(y + whirr * (0.3 * S.smoothstep(0.8, 2.0, sp))[None, :], fin=0.004, fout=0.03)
    return with_fx(y, room=0.15), c["t"]


def sfx_key(L, c, k, plan):
    """真实按键录音（CC0，sfx/README.md）：轮换 8 个变体，enter=True 用空格键录音当回车；按键的接触点对准 t。"""
    name = "key-space" if c.get("enter") else f"key-{S.KEY_ORDER[k % len(S.KEY_ORDER)]}"
    x, pk = S.real_key(name)
    return with_fx(S.stereo(x), room=0.12), c["t"] - max(0.0, pk - 0.002)


SFX_FN = {"key": sfx_key, "slam": sfx_slam, "whoosh": sfx_whoosh, "whoosh-through": sfx_whoosh_through, "riser": sfx_riser,
          "impact": sfx_impact, "blip": sfx_blip, "click": sfx_click, "tick": sfx_tick, "shutter": sfx_shutter,
          "snap": sfx_snap, "chime": sfx_chime, "error": sfx_error, "card": sfx_card, "rewind": sfx_rewind}


def blip_plan(L, cues):
    """Blips less than 1 s apart form a run that climbs the key's pentatonic from a chord tone near C6."""
    groups, cur = [], []
    for c in (c for c in cues if c["type"] == "blip"):
        if cur and c["t"] - cur[-1]["t"] > 1.0:
            groups.append(cur)
            cur = []
        cur.append(c)
    if cur:
        groups.append(cur)
    plan = {}
    for g in groups:
        pcs = S.chord_pcs(L.chord_at(g[0]["t"]), L.scale)[:3]
        near = [m for m in L.ladder if 82 <= m <= 90]
        start = min([m for m in near if m % 12 in pcs] or near, key=lambda m: abs(m - 84))
        si = L.ladder.index(start)
        for j, c in enumerate(g):
            plan[id(c)] = L.ladder[min(si + j, len(L.ladder) - 1)]
    return plan


def render_sfx(L):
    out = np.zeros((2, L.n))
    cues, skipped = [], []
    for c in L.cues:
        typ = str(c.get("type", ""))
        try:
            t = float(c["t"])
        except (KeyError, TypeError, ValueError):
            skipped.append((float("nan"), typ, "no valid t"))
            continue
        if typ not in SFX_FN:
            skipped.append((t, typ, "unknown type"))
        elif not 0.0 <= t < L.duration:
            skipped.append((t, typ, "outside 0..duration"))
        else:
            cues.append(dict(c, t=t, type=typ))
    cues.sort(key=lambda c: c["t"])
    plan = blip_plan(L, cues)
    counts, placed = {}, []
    for c in cues:
        typ = c["type"]
        k = counts.get(typ, 0)
        counts[typ] = k + 1
        y, start = SFX_FN[typ](L, c, k, plan)
        y = mono_lows(S.filt(y, "hp", 20.0, 2))
        y = S.norm(y, S.undb(SFX_PEAK_DB[typ]))
        i0 = S.i_of(start)
        a, b = max(0, i0), min(L.n, i0 + y.shape[1])
        if b > a:
            part = y[:, a - i0:b - i0]
            part = S.fade(part, fin=0.005 if a > i0 else 0.0, fout=0.005 if b < i0 + y.shape[1] else 0.0)
            out[:, a:b] += part                     # 5 ms fades only where the file start/end cuts a hit
        placed.append((typ, c["t"], a, b))
    pk = float(np.max(np.abs(out))) if out.size else 0.0
    gr = 0.0
    if pk > S.undb(-1.0):                         # only if overlapping hits add up
        out, g = S.limiter(out, -1.0)
        gr = -S.todb(float(np.min(g)))
    return out, counts, skipped, placed, gr


# ============================================================== main
def main(argv):
    if len(argv) != 3:
        print(__doc__)
        raise SystemExit("usage: .venv/bin/python tools/bed.py <lesson.json> <out_dir>")
    L = Lesson(argv[1])
    out_dir = Path(argv[2]).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    log(f"lesson {L.path.name}: {L.duration:.3f} s -> {L.n} samples, {L.bpm:g} BPM, {L.key}, "
        f"{len(L.sections)} sections, {len(L.cues)} cues")

    bed, binfo = render_bed(L)
    co = cold_open(L)
    q = quantize(bed, 11)
    if co is not None:
        seg, at, cinfo = co
        a, b = max(0, at), min(L.n, at + seg.shape[1])
        if b > a:
            q[:, a:b] += seg[:, a - at:b - at]
        busy = [s["name"] for s in L.sections
                if s["level"] > 0 and s["t"] < (at + seg.shape[1]) / SR - 0.05 and s["t_to"] > at / SR + 0.05]
        if busy:
            L.warnings.append(f"cold open overlaps music in section(s): {', '.join(busy)}")
    else:
        cinfo = None
    end = min(L.n, S.ns(0.02))                      # no hard stop at the last sample
    q[:, L.n - end:] = np.round(q[:, L.n - end:] * (np.cos(np.linspace(0.0, np.pi / 2, end)) ** 2)[None, :])
    bed16 = to_int16(q)
    S.write_wav(out_dir / "bed.wav", bed16)
    log(f"wrote {out_dir / 'bed.wav'}")

    sfx, counts, skipped, placed, sfx_gr = render_sfx(L)
    sfx = S.fade(sfx, fout=0.02)
    sfx16 = to_int16(quantize(sfx, 12))
    S.write_wav(out_dir / "sfx.wav", sfx16)
    log(f"wrote {out_dir / 'sfx.wav'}")

    report(L, out_dir, bed16, sfx16, binfo, cinfo, counts, skipped, placed, sfx_gr)
    log("report written")


def report(L, out_dir, bed16, sfx16, binfo, cinfo, counts, skipped, placed, sfx_gr):
    yb = bed16.astype(float) / 32768.0
    ys = sfx16.astype(float) / 32768.0
    R = []
    w = R.append
    w(f"bed.py report: {L.path}")
    w("=" * 96)
    w(f"generated {time.strftime('%Y-%m-%d %H:%M:%S')} in {time.time() - RUN_T0:.1f} s")
    w(f"duration {L.duration:.3f} s -> {L.n} samples per file; bed.wav {bed16.shape[1]}, sfx.wav {sfx16.shape[1]} "
      f"(48 kHz, stereo, 16-bit)")
    w(f"tempo {L.bpm:g} BPM (beat {L.beat:.4f} s, bar {L.bar:.4f} s); grid starts at {L.grid0:.3f} s "
      f"(first section); {binfo['nbars']} bars")
    w(f"key {L.key}; chords one per bar: {' '.join(L.chords)}; voicings (MIDI) "
      + ", ".join(f"{k} {v}" for k, v in L.voicing.items()))
    w("")
    w("COLD OPEN")
    if cinfo:
        sec = cinfo["m"] / SR
        w(f"  source {cinfo['src']} ({cinfo['sr']} Hz, {cinfo['bits']}-bit)")
        w(f"  samples {cinfo['n0']}..{cinfo['n1']} ({sec:.3f} s) placed at sample {cinfo['at']} "
          f"({cinfo['at'] / SR:.3f} s), ends at {(cinfo['at'] + cinfo['m']) / SR:.3f} s; "
          f"fade-in {cinfo['fi']} samples, fade-out {cinfo['fo'] / SR:.2f} s")
        if cinfo["exact"]:
            a = cinfo["at"] + cinfo["fi"]
            b = min(L.n, cinfo["at"] + cinfo["m"] - cinfo["fo"])
            ref = cinfo["orig"][:, cinfo["fi"]:cinfo["fi"] + (b - a)]
            diff = int(np.sum(bed16[:, a:b].astype(np.int64) != ref)) if b > a else 0
            w(f"  sample-exact check between the fades: {2 * (b - a) - diff}/{2 * (b - a)} samples identical")
        seg = yb[:, max(0, cinfo["at"]):min(L.n, cinfo["at"] + cinfo["m"])]
        w(f"  level as copied: RMS {rms_db(seg):.1f} dBFS, peak {peak_db(seg):.1f} dBFS (the film's level, not "
          f"matched to the bed)")
    else:
        w("  none")
    w("")
    w("BED SECTIONS                              level  RMS dBFS  target  peak dBFS  <120 Hz L/R corr")
    for s in L.sections:
        a, b = S.i_of(s["t"]), min(L.n, S.i_of(s["t_to"]))
        seg = yb[:, a:b]
        tgt = f"{LEVEL_RMS_DB[s['level']]:6.1f}" if s["level"] else "   0  "
        c, lv = low_corr(seg) if seg.shape[1] > 4096 else (float("nan"), -200.0)
        corr = f"{c:+.4f}" if lv > -60 else "  n/a  "
        w(f"  {s['name'][:22]:<22} {s['t']:7.2f}-{s['t_to']:7.2f}s  {s['level']:5d}  {rms_db(seg):8.2f}  {tgt}"
          f"  {peak_db(seg):9.2f}  {corr}")
    w("  (RMS over the whole section, crossfades included; targets are met on the interiors, 1 beat in)")
    meas = level_rms(L, yb)
    w("  per level (interiors): " + ", ".join(f"level {k} {v:.2f} dBFS (target {LEVEL_RMS_DB[k]:.0f})"
                                              for k, v in sorted(meas.items())))
    w("  calibration gains: " + ", ".join(f"level {k} {v:+.1f} dB" for k, v in sorted(binfo["cal_db"].items())))
    if binfo["balance"]:
        w("  layer balance (dry RMS dBFS in the interiors, after calibration):")
        keys = sorted({k for v in binfo["balance"].values() for k in v})
        w("    level " + "".join(f"{k:>9}" for k in keys))
        for lvl, v in sorted(binfo["balance"].items()):
            w(f"    {lvl:5d} " + "".join(f"{v.get(k, float('-inf')):9.1f}" for k in keys))
    c_all, _ = low_corr(yb)
    dc = yb.mean(axis=1)
    w(f"  whole file: RMS {rms_db(yb):.2f} dBFS, peak {peak_db(yb):.2f} dBFS, integrated {S.lufs(yb):.1f} LUFS")
    w(f"  safety limiter at -1 dBFS: max gain reduction {binfo['lim_gr_db']:.2f} dB (pre-limiter peak "
      f"{binfo['peak_pre_db']:.1f} dBFS)")
    w(f"  clipped samples {int(np.sum(np.abs(bed16.astype(np.int64)) >= 32767))}, DC L {dc[0]:+.6f} R {dc[1]:+.6f}, "
      f"<120 Hz L/R correlation {c_all:+.4f}")
    w("")
    w("SFX")
    w("  cues placed: " + (", ".join(f"{k} x{v}" for k, v in sorted(counts.items())) or "none")
      + f"  (total {sum(counts.values())})")
    if skipped:
        w(f"  skipped ({len(skipped)}):")
        for t, typ, why in skipped:
            w(f"    t={t:9.3f}  type={typ!r}: {why}")
    else:
        w("  skipped: none")
    w("  per type: target peak / measured peak in sfx.wav (dBFS; each hit up to the next hit's start)")
    starts = sorted(a for _, _, a, _ in placed)
    for typ in sorted(counts):
        pks = []
        for ty, _, a, b in placed:
            nxt = next((x for x in starts if x > a), b)
            if ty == typ and min(b, nxt) > a:
                pks.append(peak_db(ys[:, a:min(b, nxt)]))
        if pks:
            w(f"    {typ:<15} {SFX_PEAK_DB[typ]:6.1f} / {min(pks):6.1f} .. {max(pks):6.1f}")
    c_s, lv_s = low_corr(ys)
    dcs = ys.mean(axis=1)
    w(f"  whole file: peak {peak_db(ys):.2f} dBFS, overlap limiter GR {sfx_gr:.2f} dB, clipped samples "
      f"{int(np.sum(np.abs(sfx16.astype(np.int64)) >= 32767))}, DC L {dcs[0]:+.6f} R {dcs[1]:+.6f}, "
      f"<120 Hz L/R correlation {c_s:+.4f} (low band at {lv_s:.1f} dBFS)")
    if L.warnings:
        w("")
        w("WARNINGS")
        for m in L.warnings:
            w("  - " + m)
    (out_dir / "bed_report.txt").write_text("\n".join(R) + "\n", encoding="utf-8")
    print("\n".join(R))


if __name__ == "__main__":
    main(sys.argv)
