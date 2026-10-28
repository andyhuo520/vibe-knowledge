#!/usr/bin/env python3
"""讲解课逐帧录制：python3 cine/tools/record.py <课号> [--from 秒] [--to 秒] [--port 8964] [--crf 18]
从冷开场之后（film.COLD）渲到旁白结束；film.blur 里的时间段做子帧运动模糊。输出 lessons/<课号>/build/picture.mp4"""
import io
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

from browser import launch

ROOT = Path(__file__).resolve().parent.parent.parent


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    lesson = sys.argv[1]
    port, crf, fps = arg("--port", "8964"), arg("--crf", "18"), 60
    out = ROOT / "lessons" / lesson / "build" / arg("--out", "picture.mp4")
    with sync_playwright() as p:
        b = launch(p)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"http://127.0.0.1:{port}/cine/index.html?lesson={lesson}&capture")
        pg.wait_for_function("window.__film && window.__film.ready", timeout=180000)
        info = pg.evaluate("({from: __film.from, duration: __film.duration, blur: __film.blur})")
        t0 = float(arg("--from", info["from"])); t1 = float(arg("--to", info["duration"]))
        n0, n1 = round(t0 * fps), round(t1 * fps)
        enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1920x1080", "-r", str(fps), "-i", "-",
                                "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)], stdin=subprocess.PIPE)
        st = time.time()

        def shot(t):
            pg.evaluate("(t) => window.__film.seek(t)", t)
            return np.asarray(Image.open(io.BytesIO(pg.screenshot(type="jpeg", quality=95))).convert("RGB"))

        for i in range(n0, n1):
            t = i / fps
            if any(a <= t < z for a, z in info["blur"]):
                k = 4
                acc = np.zeros((1080, 1920, 3), np.float32)
                for j in range(k):
                    acc += shot(t + ((j + 0.5) / k - 0.5) * 0.5 / fps).astype(np.float32)
                frame = (acc / k + 0.5).astype(np.uint8)
            else:
                frame = shot(t)
            enc.stdin.write(frame.tobytes())
            if (i - n0) % 600 == 0:
                el, done = time.time() - st, i - n0 + 1
                print(f"  {t:7.2f}s  {done}/{n1 - n0}  {el:5.0f}s  ≈剩 {el / done * (n1 - n0 - done):5.0f}s", flush=True)
        b.close()
    enc.stdin.close(); enc.wait()
    if errs:
        print("页面报错：", errs[:5])
    print(f"→ {out}  ({time.time() - st:.0f}s)")


if __name__ == "__main__":
    main()
