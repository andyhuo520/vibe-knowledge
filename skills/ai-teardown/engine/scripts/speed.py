#!/usr/bin/env python3
"""整节配音变速（音调不变）：旁白用 ffmpeg atempo 加速，timings.json 里所有时刻同步除以倍速。
原件留在 narration.orig.wav / timings.orig.json，每次都从原件算，反复跑结果一样；倍速 1 就是还原。
用法：python3 scripts/speed.py <lessonDir> 1.15"""
import json, shutil, subprocess, sys
from pathlib import Path

L, f = Path(sys.argv[1]), float(sys.argv[2])
b = L / "build"
ot, ow = b / "timings.orig.json", b / "narration.orig.wav"
fresh = "speed" not in json.loads((b / "timings.json").read_text(encoding="utf-8"))   # 刚配完音：当前文件就是原件
if fresh or not ot.exists(): shutil.copy(b / "timings.json", ot)
if fresh or not ow.exists(): shutil.copy(b / "narration.wav", ow)
t = json.loads(ot.read_text(encoding="utf-8"))
cur = json.loads((b / "timings.json").read_text(encoding="utf-8"))
if cur.get("speed", 1) == f and (b / "narration.wav").stat().st_mtime >= ow.stat().st_mtime:
    print(f"已是 {f} 倍速，跳过"); sys.exit(0)

s = lambda v: round(v / f, 3)
B = t["beats"]
for bt in (B.values() if isinstance(B, dict) else B):
    for k in ("start", "end", "duration"):
        if k in bt: bt[k] = s(bt[k])
    for w in bt.get("words", []):
        w["start"], w["end"] = s(w["start"]), s(w["end"])
    if "chars" in bt: bt["chars"] = [s(v) for v in bt["chars"]]
    if "cues" in bt: bt["cues"] = {k: s(v) for k, v in bt["cues"].items()}
t["total"] = s(t["total"])
t["speed"] = f
(b / "timings.json").write_text(json.dumps(t, ensure_ascii=False, indent=1), encoding="utf-8")
if f == 1: shutil.copy(ow, b / "narration.wav")
else: subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(ow), "-filter:a", f"atempo={f}", "-ar", "48000", "-ac", "1", str(b / "narration.wav")], check=True)
print(f"{L.name}：{f} 倍速，总长 {t['total']:.1f} 秒")
