#!/usr/bin/env python3
"""把蓝皮书某一章的配图导入 WorkBuddy 系列：PNG/JPG → assets/img/wb<NN>-<序号>.png（入账，带章节出处）；GIF → 8fps 去重帧序列，课目录 data/flip-<名>.json，场景里 shot 写 "clip": "<名>"。
用法：python3 scripts/wb_import.py <课目录> "<章节目录名>" [--prefix wb04]
会打印每张图的 id、尺寸，并生成课目录 build/chapter_sheet.jpg（所有配图缩略总览，看图定 crop / 圈注位置用）。
"""
import sys, json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts")); from ledger import add_images

L = Path(sys.argv[1]).resolve(); sd = L.parent.parent; nn = L.name
chap = sys.argv[2]
pre = sys.argv[sys.argv.index("--prefix") + 1] if "--prefix" in sys.argv else f"wb{nn}"
book = sd / "source/docs/bluebook"
cdir = next(p for p in book.glob(f"*/{chap}")) if not (book / chap).exists() else book / chap
src = cdir / "assets"
short = chap.split(" ", 2)[-1] if chap.startswith("第") else chap
credit = f"截图出处：《WorkBuddy 实战蓝皮书》{chap.split(' ')[0]} {chap.split(' ')[1] if len(chap.split(' '))>1 else ''} · MIT".replace("  ", " ")
credit = f"截图出处：《WorkBuddy 实战蓝皮书》{chap} · MIT"
items, thumbs = [], []
(L / "data").mkdir(parents=True, exist_ok=True); (L / "build").mkdir(exist_ok=True)
files = sorted(src.glob("*")) if src.exists() else []
for k, f in enumerate(files, 1):
    ext = f.suffix.lower()
    if ext in (".png", ".jpg", ".jpeg", ".webp"):
        iid = f"{pre}-{k:02d}"; im = Image.open(f).convert("RGB"); w, h = im.size
        if w > 2400: im = im.resize((2400, round(h * 2400 / w)), Image.LANCZOS); w, h = im.size
        im.save(sd / "assets/img" / f"{iid}.png", optimize=True)
        items.append({"id": iid, "file": f"{iid}.png", "width": w, "height": h, "artist": "WorkBuddy 实战蓝皮书作者们", "license": "MIT", "source": "github.com/AlephAITech/WorkBuddyGuide", "credit": credit})
        print(f"图 {iid}  {w}×{h}  ← {f.name}"); t = im.copy(); t.thumbnail((600, 380)); thumbs.append((iid, t))
    elif ext == ".gif":
        name = f"{pre}-g{k:02d}"; g = Image.open(f); durs, frames = [], []
        for i in range(g.n_frames): g.seek(i); durs.append(g.info.get("duration", 100)); frames.append(g.convert("RGB").copy())
        starts, acc = [], 0
        for d in durs: starts.append(acc); acc += d
        seq, uniq, prev, T = [], [], None, 0
        W0 = frames[0].size[0]; H0 = frames[0].size[1]; W = min(1100, W0); H = round(H0 * W / W0)
        gitems = []
        while T < acc:
            i = max(j for j, s in enumerate(starts) if s <= T); im = frames[i].resize((W, H), Image.LANCZOS)
            if prev is not None and ImageChops.difference(im, prev).convert("L").point(lambda v: 255 if v > 18 else 0).getbbox() is None: seq.append(seq[-1])
            else:
                iid = f"flip-{name}-{len(uniq):03d}"; im.save(sd / "assets/img" / f"{iid}.jpg", quality=78); uniq.append(iid); seq.append(iid); prev = im
                gitems.append({"id": iid, "file": f"{iid}.jpg", "width": W, "height": H, "artist": "WorkBuddy 实战蓝皮书作者们", "license": "MIT", "source": "github.com/AlephAITech/WorkBuddyGuide", "credit": credit.replace("截图", "录屏")})
            T += 125
        items += gitems
        json.dump({"fps": 8, "frames": seq, "w": W, "h": H}, open(L / "data" / f"flip-{name}.json", "w"))
        print(f"录屏 clip \"{name}\"  {acc/1000:.1f} 秒，{len(uniq)} 张帧  ← {f.name}"); t = frames[len(frames)//2].copy(); t.thumbnail((600, 380)); thumbs.append((f"clip:{name}", t))
    elif ext == ".mp4":
        print(f"视频（未导入，可用 ffmpeg 抽帧做 clip）：{f.name}")
add_images(sd, items)
if thumbs:
    cols = 3; rows = (len(thumbs) + cols - 1) // cols
    sh = Image.new("RGB", (cols * 610, rows * 410), "white"); d = ImageDraw.Draw(sh)
    for k, (n, t) in enumerate(thumbs):
        x, y = (k % cols) * 610, (k // cols) * 410; sh.paste(t, (x + 5, y + 24)); d.text((x + 6, y + 4), n, fill=(220, 0, 0))
    sh.save(L / "build/chapter_sheet.jpg", quality=80); print("总览：", L / "build/chapter_sheet.jpg")
