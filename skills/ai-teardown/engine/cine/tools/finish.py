#!/usr/bin/env python3
"""讲解课出片：读镜头表里的段落与音效点 → 生成背景乐和音效（cine/audio/tools/bed.py）→ 混音（旁白压低背景乐）
→ 拼上冷开场画面 → 成片。

用法（用装了 numpy、scipy、playwright 的 Python 跑，见 references/10-cine.md「环境」）：
  finish.py <课号> [--port 8964] [--skip-bed]
输出：lessons/<课号>/build/final_mix.wav、lessons/<课号>/build/lesson<课号>.mp4
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent.parent          # 系列目录（cine/ 和 lessons/ 的上一级）
CINE = ROOT / "cine"
SR = 48000


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def read_wav(p):
    with wave.open(str(p), "rb") as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64).reshape(-1, ch) / 32768.0
    if sr != SR:
        x = signal.resample_poly(x, SR, sr, axis=0)
    return x if ch == 2 else np.repeat(x, 2, axis=1)


def write_wav(p, x):
    y = np.clip(np.round(x * 32767.0), -32768, 32767).astype(np.int16)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def film_info(lesson, port):
    from playwright.sync_api import sync_playwright
    from browser import launch
    with sync_playwright() as p:
        b = launch(p)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto(f"http://127.0.0.1:{port}/cine/index.html?lesson={lesson}&capture")
        pg.wait_for_function("window.__film && window.__film.ready", timeout=180000)
        info = pg.evaluate("({from: __film.from, cold: __film.cold, coldSrc: __film.coldSrc, duration: __film.duration, sections: __film.sections, sfx: __film.sfx, clips: __film.clips || [], music: __film.music || []})")
        b.close()
    return info


def envelope(x, att=0.04, rel=0.4):
    """旁白的平滑包络（0..1），用来压低背景乐。"""
    a = np.abs(x.mean(axis=1))
    win = int(0.05 * SR)
    rms = np.sqrt(np.convolve(a * a, np.ones(win) / win, mode="same"))
    on = (rms > 10 ** (-42 / 20)).astype(np.float64)
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    # 一阶跟随：起得快、落得慢（用 lfilter 分两段近似：先按释放平滑，再取与起音平滑的最大值）
    up = signal.lfilter([1 - ka], [1, -ka], on)
    down = signal.lfilter([1 - kr], [1, -kr], on)
    return np.clip(np.maximum(up, down), 0, 1)


def limiter(x, ceiling=10 ** (-1.5 / 20), look=0.003):   # 留 1.5 dB 余量，AAC 编码后不过 0 dBFS
    """前瞻峰值限幅：起音即时、释放 50 ms。"""
    from scipy.ndimage import maximum_filter1d
    peak = np.max(np.abs(x), axis=1)
    n = int(look * SR)
    target = np.minimum(1.0, ceiling / np.maximum(maximum_filter1d(peak, size=2 * n + 1), 1e-9))
    k = np.exp(-1 / (0.05 * SR))
    g = np.minimum(signal.lfilter([1 - k], [1, -k], target - 1) + 1, target)
    return x * g[:, None]


def main():
    lesson = sys.argv[1]
    port = arg("--port", "8964")
    L = ROOT / "lessons" / lesson
    B = L / "build"
    info = film_info(lesson, port)
    cold, dur, src = float(info["cold"]), float(info["duration"]), info.get("coldSrc")
    total = dur + 0.6
    lj = {"duration": round(total, 3), "bpm": 100, "key": "F minor", "chords": ["Fm", "Db", "Ab", "Eb"],
          "sections": [{"t": round(s["t"], 3), "t_to": round(min(s["t_to"], total), 3), "level": s["level"], "name": s.get("name", "")} for s in info["sections"]],
          "cues": [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in c.items()} for c in info["sfx"]]}
    if src:   # 片头拼现成片段：配乐也从同一段原声里截
        lj["cold_open"] = {"from_wav": str(ROOT / src["wav"]), "src_t0": src["t0"], "src_t1": src["t0"] + cold, "at": 0.0}
    (B / "lesson.json").write_text(json.dumps(lj, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"lesson.json：{len(lj['sections'])} 段，{len(lj['cues'])} 个音效点，时长 {total:.2f}s")
    if "--skip-bed" not in sys.argv:
        subprocess.run([sys.executable, str(CINE / "audio/tools/bed.py"), str(B / "lesson.json"), str(B)], check=True)
    n = int(round(total * SR))
    fit = lambda x: np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n]
    bed, sfx = fit(read_wav(B / "bed.wav")), fit(read_wav(B / "sfx.wav"))
    narr = np.zeros((n, 2))
    nv = read_wav(B / "narration.wav")
    i0 = int(round(cold * SR))
    narr[i0:i0 + len(nv)] = nv[: n - i0]
    env = envelope(narr)
    duck = 1.0 - 0.55 * env                      # 说话时背景乐约 −7 dB
    if src:
        duck[: int(round((cold + 0.25) * SR))] = 1.0   # 拼接的冷开场原样
    # 案例片段的原声：full = 原样放（这段旁白应当是空的、背景乐 level 0）；duck = 压在旁白下面；mute = 不要
    clipa = np.zeros((n, 2))
    for c in info.get("clips", []):
        mode = c.get("audio", "duck")
        if mode == "mute":
            continue
        cpath = L / "assets" / "clips" / f"{c['id']}.mp4"
        tmp = B / f"_clip_{c['id']}.wav"
        r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(cpath), "-vn", "-ac", "2", "-ar", str(SR), str(tmp)])
        if r.returncode or not tmp.exists():
            continue
        a = read_wav(tmp); tmp.unlink()
        k = int(0.12 * SR)
        if len(a) > 2 * k:
            ramp = np.linspace(0, 1, k)[:, None]; a[:k] *= ramp; a[-k:] *= ramp[::-1]
        g = 10 ** (c.get("gain", -2.0 if mode == "full" else -15.0) / 20)
        j0 = int(round(c["at"] * SR)); j1 = min(n, j0 + len(a))
        if j1 > j0:
            clipa[j0:j1] += a[: j1 - j0] * g
    # 整段配乐插入（例如导学开场的高光快剪用曲库里的一首）：{src 绝对路径, from 源内起点, at, dur, gain dB, fade_in, fade_out}；有旁白时同样被压低
    for m in info.get("music", []):
        tmp = B / "_music.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{float(m.get('from', 0)):.3f}", "-t", f"{float(m['dur']):.3f}", "-i", str(m["src"]),
                        "-vn", "-ac", "2", "-ar", str(SR), str(tmp)], check=True)
        a = read_wav(tmp); tmp.unlink()
        ki, ko = int(float(m.get("fade_in", 0.03)) * SR), int(float(m.get("fade_out", 1.2)) * SR)
        if ki: a[:ki] *= np.linspace(0, 1, ki)[:, None]
        if ko and len(a) > ko: a[-ko:] *= np.linspace(1, 0, ko)[:, None]
        j0 = int(round(float(m["at"]) * SR)); j1 = min(n, j0 + len(a))
        if j1 > j0:
            if m.get("gain_curve"):     # 分段音量：[[片中秒, dB], …] 线性插值，比如冷开场满音量、旁白段压低
                pts = np.array(m["gain_curve"], dtype=np.float64)
                tt = np.arange(j0, j1) / SR
                g = 10 ** (np.interp(tt, pts[:, 0], pts[:, 1]) / 20)
            else:
                g = np.full(j1 - j0, 10 ** (float(m.get("gain", -4.0)) / 20))
            clipa[j0:j1] += a[: j1 - j0] * (g * duck[j0:j1])[:, None]
    mix = narr * 1.0 + bed * duck[:, None] + sfx * 0.9 + clipa
    # 响度：按有旁白的部分对齐到约 −16 dBFS RMS
    speech = env > 0.5
    rms = np.sqrt(np.mean(mix[speech] ** 2)) if speech.any() else np.sqrt(np.mean(mix ** 2))
    mix *= 10 ** (-16 / 20) / max(rms, 1e-9)
    mix = limiter(mix)
    write_wav(B / "final_mix.wav", mix)
    print(f"混音 → {B / 'final_mix.wav'}  峰值 {20 * np.log10(np.max(np.abs(mix)) + 1e-9):.1f} dBFS")
    if "--audio-only" in sys.argv:
        return
    # 画面：有 COLD_SRC 时先拼那段现成画面，再接本课渲染；然后把案例片段逐段叠到各自的框里
    fps = 60
    out = B / f"lesson{lesson}.mp4"
    ins, fc = [], []
    if src:
        a0, na = round(src["t0"] * fps), round(cold * fps)
        ins += ["-i", str(ROOT / src["video"]), "-i", str(B / "picture.mp4")]
        fc.append(f"[0:v]trim=start_frame={a0}:end_frame={a0 + na},setpts=PTS-STARTPTS[ca];[1:v]setpts=PTS-STARTPTS[cb];[ca][cb]concat=n=2:v=1:a=0[base]")
        k0 = 2
    else:
        ins += ["-i", str(B / "picture.mp4")]
        fc.append("[0:v]setpts=PTS-STARTPTS[base]")
        k0 = 1
    last = "base"
    for i, c in enumerate(info.get("clips", [])):
        ins += ["-i", str(L / "assets" / "clips" / f"{c['id']}.mp4")]
        k, at, d = k0 + i, float(c["at"]), float(c["dur"])
        fd = float(c.get("fade", 0.15))
        fades = f",fade=t=in:st={at:.4f}:d={fd:.3f}:alpha=1,fade=t=out:st={at + d - fd:.4f}:d={fd:.3f}:alpha=1" if fd > 0 else ""
        fc.append(f"[{k}:v]setpts=PTS-STARTPTS+{at:.4f}/TB,format=yuva420p{fades}[c{i}]")
        fc.append(f"[{last}][c{i}]overlay={int(c['x'])}:{int(c['y'])}:enable='between(t,{at:.4f},{at + d:.4f})':eof_action=pass[v{i}]")
        last = f"v{i}"
    ins += ["-i", str(B / "final_mix.wav")]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(fc), "-map", f"[{last}]", "-map", f"{len(ins) // 2 - 1}:a",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(fps), "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)], check=True)
    print(f"成片 → {out}")


if __name__ == "__main__":
    main()
