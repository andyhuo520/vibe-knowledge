#!/usr/bin/env python3
"""讲解课样帧：python3 cine/tools/stills.py <课号> out.png <时间…> [--cols 4] [--w 480] [--port 8964]
时间可以写秒（12.5）或旁白位置（B07.ring、B03@三千、B05+1.2）。"""
import io
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

from browser import launch



def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    lesson, out = sys.argv[1], Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    skip = {sys.argv.index(n) + 1 for n in ("--cols", "--w", "--port") if n in sys.argv}
    times = [a for i, a in enumerate(sys.argv[3:], 3) if not a.startswith("--") and i not in skip]
    cols, tw, port = int(arg("--cols", 4)), int(arg("--w", 480)), arg("--port", "8964")
    with sync_playwright() as p:
        b = launch(p)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.goto(f"http://127.0.0.1:{port}/cine/index.html?lesson={lesson}&capture")
        try:
            pg.wait_for_function("window.__film && window.__film.ready", timeout=120000)
        except Exception:
            print("页面没就绪：", errs[:5]); raise
        shots = []
        for a in times:
            t = float(a) if a[0].isdigit() else pg.evaluate("(s) => window.__film.at(s)", a)
            pg.evaluate("(t) => window.__film.seek(t)", t)
            shots.append((a, t, Image.open(io.BytesIO(pg.screenshot(type="png"))).convert("RGB")))
        b.close()
    if errs:
        print("页面报错：", errs[:5])
    if len(shots) == 1:
        shots[0][2].save(out); print("→", out); return
    th = int(tw * 9 / 16)
    rows = (len(shots) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 26)), (20, 20, 24))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 15)
    for i, (a, t, img) in enumerate(shots):
        x, y = (i % cols) * tw, (i // cols) * (th + 26)
        sheet.paste(img.resize((tw, th), Image.LANCZOS), (x, y + 26))
        d.text((x + 6, y + 5), f"{a}  {t:.2f}s", fill=(220, 220, 220), font=f)
    sheet.save(out)
    print("→", out)


if __name__ == "__main__":
    main()
