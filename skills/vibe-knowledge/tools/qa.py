#!/usr/bin/env python3
"""成片质检：python3 qa.py <成片.mp4> [--every 3] [--out qa/]
1) 每 N 秒抽一帧拼接触表 qa/sheet.jpg（逐张看：字溢出、压字幕、空屏、配图里有乱码字）
2) Vision OCR 回读屏幕上的每一行字 → qa/ocr.txt（对照 facts.md 核数字、引文、出处）
3) 响度：整体 LUFS / 真峰值（目标 ≈ −14.5 LUFS、≤ −1 dBTP）
5) BGM 检查（强制）：成片开头跟 vibe-bgm 原曲开头做相关（fit_bgm 开头照原曲），<0.12 判定没有 BGM；同目录有 bgm.json 时一并报人声比
4) 冻结检测：画面连续 >3 秒几乎不变就报警（违反「最长静止 ≤3 秒」；整段几十秒不变 = 录制出事，比如两路录制写坏同一个 picture.mp4，要重录）"""
import re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def arg(n, d): return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
SK = Path(__file__).resolve().parent
src = Path(sys.argv[1]); every = float(arg("--every", "3")); out = Path(arg("--out", str(src.parent / "qa")))
out.mkdir(parents=True, exist_ok=True); fr = out / "frames"; fr.mkdir(exist_ok=True)
for f in fr.glob("*.png"): f.unlink()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", f"fps=1/{every},scale=1600:-2", str(fr / "f_%04d.png")], check=True)
fs = sorted(fr.glob("f_*.png"))
ocr = SK / "ocr"
if not ocr.exists() or ocr.stat().st_mtime < (SK / "ocr.swift").stat().st_mtime:
    subprocess.run(["swiftc", "-O", str(SK / "ocr.swift"), "-o", str(ocr)], check=True)
txt = subprocess.run([str(ocr), *map(str, fs)], capture_output=True, text=True).stdout
lines, seen = [], []
for blk in txt.split("@@")[1:]:
    ls = blk.strip().split("\n"); i = int(re.search(r"(\d+)", ls[0]).group(1)); t = (i - 1) * every
    for l in ls[1:]:
        m = re.match(r"\[y([\d.]+) h([\d.]+)\] (.*)", l)
        if m and len(m.group(3).strip()) > 1 and m.group(3) not in seen[-30:]:
            seen.append(m.group(3)); lines.append(f"{int(t // 60)}:{t % 60:04.1f}  {m.group(3)}")
(out / "ocr.txt").write_text("\n".join(lines), encoding="utf-8")
w = 400; ims = [Image.open(f) for f in fs]; h = int(w * ims[0].height / ims[0].width); cols = 6
sheet = Image.new("RGB", (cols * w, ((len(ims) + cols - 1) // cols) * h), "black"); d = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
for i, im in enumerate(ims):
    x, y = (i % cols) * w, (i // cols) * h; sheet.paste(im.resize((w, h)), (x, y)); t = i * every
    d.rectangle([x, y, x + 70, y + 24], fill="black"); d.text((x + 4, y + 2), f"{int(t // 60)}:{int(t % 60):02d}", fill="yellow", font=font)
sheet.save(out / "sheet.jpg", quality=82)
r = subprocess.run(["ffmpeg", "-nostats", "-i", str(src), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = re.findall(r"I:\s+(-?[\d.]+) LUFS", r); P = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)
fz = subprocess.run(["ffmpeg", "-nostats", "-i", str(src), "-an", "-vf", "fps=10,scale=480:-2,freezedetect=n=0.002:d=3", "-f", "null", "-"], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", fz)]; durs = [float(x) for x in re.findall(r"freeze_duration: ([\d.]+)", fz)]
if len(durs) < len(starts): durs.append(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True).stdout) - starts[-1])
frozen = [(a, d) for a, d in zip(starts, durs)]
(out / "freeze.txt").write_text("\n".join(f"{int(a // 60)}:{a % 60:04.1f}  静止 {d:.1f} 秒" for a, d in frozen), encoding="utf-8")
print(f"→ {out/'sheet.jpg'}  {len(fs)} 帧\n→ {out/'ocr.txt'}  {len(lines)} 行\n响度 {I[-1] if I else '?'} LUFS  真峰值 {P[-1] if P else '?'} dBTP")
if frozen:
    print(f"⚠ 静止画面 {len(frozen)} 段（>3 秒）→ {out/'freeze.txt'}：" + "，".join(f"{int(a // 60)}:{a % 60:04.1f} 起 {d:.1f}s" for a, d in frozen[:6]))
    if any(d > 10 for a, d in frozen): print("⚠⚠ 有超过 10 秒的冻结，多半是录制出事（并行录制 / 页面卡死），重录后再交付")
else:
    print("静止检测：没有超过 3 秒的静止画面")
# ── BGM 强制检查 ──
import numpy as np
def _pcm(f, t, sr=4000):
    b = subprocess.run(["ffmpeg", "-v", "error", "-t", str(t), "-i", str(f), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(b, np.float32).copy()
ref = _pcm(SK.parent / "assets/music/vibe-bgm.m4a", 8); x = _pcm(src, 12); best, lag = 0.0, 0.0
for k in range(0, 4000 * 3, 20):
    seg = x[k:k + len(ref)]
    if len(seg) < len(ref): break
    c = float(np.dot(seg, ref) / (np.linalg.norm(seg) * np.linalg.norm(ref) + 1e-9))
    if c > best: best, lag = c, k / 4000
bj = src.parent / "bgm.json"
extra = ""
if bj.exists():
    import json as _j; r = _j.loads(bj.read_text(encoding="utf-8"))
    if r.get("voice_gap_db") is not None: extra = f"；说话时人声比 BGM 高 {r['voice_gap_db']} dB，停顿处 {r.get('gap_in_pauses_db')} dB" + ("（自动补的 BGM）" if r.get("auto") else "")
user_bgm = r.get("user_bgm") if bj.exists() else None
if user_bgm:
    print(f"BGM：用户要求更换为 {user_bgm[0]}（{user_bgm[1]}）{extra}")
elif best >= 0.12:
    print(f"BGM：有 vibe-bgm（相关 {best:.2f}，从 {lag:.2f}s 起）{extra}")
else:
    print(f"⚠⚠ BGM：没检测到 vibe-bgm（相关 {best:.2f}）。除非用户要求换曲，知识大赏每条都必须有：确认 finish.py 已打强制钩子（bgm_force.py --patch），重跑 finish.py + deliver.sh")
