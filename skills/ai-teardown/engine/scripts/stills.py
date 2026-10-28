#!/usr/bin/env python3
"""按时间点抽帧拼接触表：python3 scripts/stills.py <page.html> <out.png> t1 t2 ... [--cols 4] [--theme dark]
页面需暴露 window.__ready（Promise）与 window.__stage（有 seek(t)）。"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

EXE = Path.home() / "Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"

def main():
    args = sys.argv[1:]
    cols = int(args[args.index("--cols") + 1]) if "--cols" in args else 4
    args = [a for i, a in enumerate(args) if a != "--cols" and (i == 0 or args[i - 1] != "--cols")]
    page_path, out, times = Path(args[0]).resolve(), Path(args[1]), [float(x) for x in args[2:]]
    frames = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=str(EXE) if EXE.exists() else None)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(page_path.as_uri())
        pg.wait_for_function("window.__stage !== undefined", timeout=30000)
        for t in times:
            pg.evaluate(f"window.__stage.seek({t})")
            fn = out.with_name(f"{out.stem}-{t:06.2f}.png")
            pg.locator(".at-stage").screenshot(path=str(fn))
            frames.append((t, fn))
        b.close()
    if errs:
        print("页面报错：", *errs[:5], sep="\n  ")
    tw, th = 480, 270
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 26)), "#111")
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 16)
    except OSError:
        font = ImageFont.load_default()
    for i, (t, fn) in enumerate(frames):
        im = Image.open(fn).convert("RGB").resize((tw, th), Image.LANCZOS)
        x, y = (i % cols) * tw, (i // cols) * (th + 26)
        sheet.paste(im, (x, y + 26))
        d.text((x + 8, y + 4), f"t={t:.2f}s", fill="#ddd", font=font)
    sheet.save(out)
    print(f"{len(frames)} 帧 → {out}")

if __name__ == "__main__":
    main()
