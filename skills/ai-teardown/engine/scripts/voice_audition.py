#!/usr/bin/env python3
"""配音试听：按一份音色清单，用小米 MiMo 把同一段话读一遍，并给每条算几个客观指标。

用法：python3 scripts/voice_audition.py <voices.json> <输出目录> [--ref 参照音色id]

voices.json：
{"text": "要读的一段话",
 "voices": [
   {"id": "moli-style", "name": "茉莉 · 讲课语气", "model": "mimo-v2.5-tts", "voice": "茉莉", "style": "语气说明"},
   {"id": "host", "name": "男科普博主", "model": "mimo-v2.5-tts-voicedesign", "design": "音色描述"},
   {"id": "host-clone", "name": "男科普博主 · 克隆锁定", "model": "mimo-v2.5-tts-voiceclone", "clone_from": "host"}
 ]}
已经生成过的（输出目录里有 <id>.wav）不重复调用。

输出：<id>.wav、<id>.mp3（响度归一），metrics.json：
  时长、字/秒、基频中位（判断男女声）、语调起伏（半音标准差）、
  与参照音色的音色相似度（平均对数梅尔谱的余弦相似度，用来检查设计音色每次生成是否一致）。
"""
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tts_mimo import env  # noqa: E402


def call(key, base, body, tries=7):
    last = ""
    for k in range(tries):
        r = subprocess.run(["curl", "-sS", "--max-time", "240", "-X", "POST", f"{base}/chat/completions",
                            "-H", f"Authorization: Bearer {key}", "-H", "Content-Type: application/json", "--data-binary", "@-"],
                           input=json.dumps(body, ensure_ascii=False), capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "choices" in d:
                return d
            last = str(d.get("error"))
            wait = 10 * (k + 1) if "429" in last else 3
        except Exception:  # noqa: BLE001
            last, wait = (r.stdout or r.stderr)[:200], 3
        print(f"  等 {wait}s 重试：{last[:80]}", file=sys.stderr)
        time.sleep(wait)
    raise RuntimeError(last)


def pcm(path, sr=16000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def f0_track(x, sr=16000, fmin=70, fmax=400, hop=160, win=640):
    out = []
    w = np.hanning(win)
    for i in range(0, len(x) - win, hop):
        fr = x[i:i + win] * w
        if np.sqrt(np.mean(fr ** 2)) < 0.02:
            continue
        ac = np.correlate(fr, fr, "full")[win - 1:]
        lo, hi = sr // fmax, sr // fmin
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] / (ac[0] + 1e-9) > 0.45:
            out.append(sr / k)
    return np.array(out)


def mel_profile(x, sr=16000, n_fft=512, hop=160, n_mels=40):
    """有声帧的平均对数梅尔谱，当作「音色指纹」"""
    frames = np.lib.stride_tricks.sliding_window_view(x, n_fft)[::hop] * np.hanning(n_fft)
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    energy = spec.sum(1)
    spec = spec[energy > np.percentile(energy, 40)]
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    pts = 700 * (10 ** (np.linspace(mel(80), mel(7600), n_mels + 2) / 2595) - 1)
    bins = np.floor((n_fft + 1) * pts / sr).astype(int)
    fb = np.zeros((n_mels, n_fft // 2 + 1))
    for m in range(1, n_mels + 1):
        a, b, c = bins[m - 1], bins[m], bins[m + 1]
        fb[m - 1, a:b] = (np.arange(a, b) - a) / max(1, b - a)
        fb[m - 1, b:c] = (c - np.arange(b, c)) / max(1, c - b)
    prof = np.log(spec @ fb.T + 1e-10).mean(0)
    return prof - prof.mean()


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    key, base = env()
    text = spec["text"]
    for v in spec["voices"]:
        wav = out / f"{v['id']}.wav"
        if wav.exists():
            continue
        msgs = [{"role": "assistant", "content": text}]
        audio = {"format": "wav"}
        if v.get("design"):
            msgs.insert(0, {"role": "user", "content": v["design"]})
        elif v.get("style"):
            msgs.insert(0, {"role": "user", "content": v["style"]})
        if v.get("voice"):
            audio["voice"] = v["voice"]
        if v.get("clone_from"):
            ref = out / f"{v['clone_from']}.wav"
            audio["voice"] = "data:audio/wav;base64," + base64.b64encode(ref.read_bytes()).decode()
        t0 = time.time()
        d = call(key, base, {"model": v["model"], "messages": msgs, "audio": audio})
        wav.write_bytes(base64.b64decode(d["choices"][0]["message"]["audio"]["data"]))
        print(f"✓ {v['id']:18s} 合成 {time.time() - t0:4.1f}s")
        time.sleep(4)  # MiMo 对连发请求限流（429），隔几秒更稳
    ref_id = sys.argv[sys.argv.index("--ref") + 1] if "--ref" in sys.argv else None
    profs, metrics = {}, []
    n = len([c for c in text if not c.isspace() and c not in "，。！？；：、,.!?;:“”「」"])
    for v in spec["voices"]:
        wav = out / f"{v['id']}.wav"
        mp3 = out / f"{v['id']}.mp3"
        if not mp3.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", "-b:a", "128k", str(mp3)], check=True)
        x = pcm(wav)
        f0 = f0_track(x)
        dur = len(x) / 16000
        profs[v["id"]] = mel_profile(x)
        metrics.append({"id": v["id"], "name": v.get("name", v["id"]), "dur": round(dur, 2), "cps": round(n / dur, 2),
                        "f0": int(np.median(f0)), "gender": "女声" if np.median(f0) > 165 else "男声",
                        "range_st": round(float(np.std(12 * np.log2(f0 / np.median(f0)))), 2)})
    if ref_id:
        r = profs[ref_id]
        for m in metrics:
            p = profs[m["id"]]
            m["sim_to_ref"] = round(float(np.dot(p, r) / (np.linalg.norm(p) * np.linalg.norm(r))), 3)
    (out / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=1), encoding="utf-8")
    for m in metrics:
        print(f"{m['id']:18s} {m['gender']} 基频 {m['f0']:3d}Hz  起伏 {m['range_st']:.2f} 半音  {m['cps']:.2f} 字/秒" + (f"  与参照相似 {m['sim_to_ref']:.3f}" if ref_id else ""))


if __name__ == "__main__":
    main()
