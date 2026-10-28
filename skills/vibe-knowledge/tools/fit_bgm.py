#!/usr/bin/env python3
"""把知识大赏默认 BGM（assets/music/vibe-bgm.m4a）裁成任意片长，切点都在小节线上。
用法：$CINE_PY fit_bgm.py <输出.wav> --seconds 95          # 指定总长（一般 = 旁白总长 + 尾卡 TAIL）
      $CINE_PY fit_bgm.py <输出.wav> --lesson <期目录>      # 读 build/timings.json 的 total，再加 --tail（默认 3 秒）
      可选 --src 别的曲子（同目录下要有同名 .json 节拍数据）、--xfade 0.08
做法：开头照原曲；从第 tail_bar 小节到曲尾是原曲的自然结尾，整段接在最后。
  片子短于原曲：头段剪到离目标最近的小节线，再接结尾；
  片子长于原曲：在 loop_bars 区间里按 8 小节一段循环补长。
  接缝等功率交叉淡化 80 毫秒；总长差的零头在末尾裁掉或补静音（结尾本来就在淡出）。
输出：<输出.wav>（48 kHz 立体声）+ <输出>.beats.json（成片里每一拍 / 每一小节的时间，film.js 卡点用）。"""
import json, subprocess, sys
from pathlib import Path
import numpy as np

SR = 48000
SK = Path(__file__).resolve().parents[1]
args = sys.argv[1:]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
out = Path(args[0])
src = Path(opt("--src", SK / "assets/music/vibe-bgm.m4a"))
meta = json.loads(src.with_suffix(".json").read_text(encoding="utf-8"))
if "--lesson" in args:
    L = json.loads((Path(opt("--lesson")) / "build/timings.json").read_text(encoding="utf-8"))["total"] + float(opt("--tail", 3))
else:
    L = float(opt("--seconds"))
xf = float(opt("--xfade", 0.08))

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
bar = meta["beat"] * meta["beats_per_bar"]
bt = lambda b: meta["t0"] + b * bar                      # 第 b 小节起点（秒，原曲）
S = lambda t: int(round(t * SR))
tail0 = bt(meta["tail_bar"]); tail = y[S(tail0):]; tailL = len(tail) / SR

def splice(a, b):                                          # 等功率交叉淡化拼接
    n = min(S(xf), len(a), len(b))
    if n == 0: return np.concatenate([a, b])
    w = np.linspace(0, np.pi / 2, n)[:, None]
    mid = a[-n:] * np.cos(w) + b[:n] * np.sin(w)
    return np.concatenate([a[:-n], mid, b[n:]])

plan = []                                                   # (原曲起点秒, 原曲终点秒, 起始小节号)
headT = L - tailL
if headT <= bt(meta["loop_bars"][1]):                      # 短片：头段剪到最近的小节线
    nb = max(1, int(round((headT - meta["t0"]) / bar)))
    plan.append((0.0, bt(nb), 0))
else:                                                       # 长片：循环中段，8 小节一段
    a, z = meta["loop_bars"]; plan.append((0.0, bt(z), 0))
    cur = bt(z); ph = meta["phrase_bars"]; b = a
    while cur + ph * bar <= headT + bar / 2:
        plan.append((bt(b), bt(b + ph), b)); cur += ph * bar; b = a + ((b - a + ph) % (z - a - ph + 1))
plan.append((tail0, len(y) / SR, meta["tail_bar"]))
mix, grid, n0 = None, [], S(xf)
for i, (a0, a1, b0) in enumerate(plan):
    seg = y[S(a0):S(a1)]
    start = 0.0 if mix is None else (len(mix) - min(n0, len(mix), len(seg))) / SR   # 接缝重叠后这段在成片里的真实起点
    first = 0 if i == 0 else b0
    nbar = int(round((a1 - a0) / bar)) + (1 if i == len(plan) - 1 else 0)
    grid += [(start + (bt(first + k) - a0), first + k) for k in range(nbar)] if i else [(bt(k), k) for k in range(nbar)]
    mix = seg if mix is None else splice(mix, seg)
segs = plan
n = S(L)
if len(mix) >= n:
    mix = mix[:n]; f = min(S(1.5), n); mix[-f:] *= np.linspace(1, 0, f)[:, None]
else:
    mix = np.concatenate([mix, np.zeros((n - len(mix), 2), np.float32)])
out.parent.mkdir(parents=True, exist_ok=True)
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ac", "2", "-ar", str(SR), "-i", "-", str(out)], input=pcm, check=True)
bars = [round(t, 3) for t, _ in grid if t < L]
beats = sorted({round(t + k * meta["beat"], 3) for t in bars for k in range(meta["beats_per_bar"]) if t + k * meta["beat"] < L})
out.with_suffix(".beats.json").write_text(json.dumps({"src": src.name, "bpm": meta["bpm"], "length": round(L, 3), "bars": bars, "beats": beats}, ensure_ascii=False), encoding="utf-8")
print(f"BGM → {out}  {L:.2f}s  {meta['bpm']} BPM  小节 {bar:.3f}s  接缝 {len(segs) - 1} 处（都在小节线）  节拍表 → {out.with_suffix('.beats.json').name}")
