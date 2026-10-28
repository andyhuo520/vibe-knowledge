#!/usr/bin/env python3
"""只重渲某一拍以后的画面并接回 picture.mp4（改了结尾几拍时用，省得整节重渲）。
用法：python3 cine/tools/retail.py <课号> <拍号，如 B18> [--port 8964]"""
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from browser import launch

ROOT = Path(__file__).resolve().parent.parent.parent


def main():
    lesson, beat = sys.argv[1], sys.argv[2]
    port = sys.argv[sys.argv.index("--port") + 1] if "--port" in sys.argv else "8964"
    B = ROOT / "lessons" / lesson / "build"
    with sync_playwright() as p:
        b = launch(p)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto(f"http://127.0.0.1:{port}/cine/index.html?lesson={lesson}&capture")
        pg.wait_for_function("window.__film && window.__film.ready", timeout=180000)
        info = pg.evaluate("(b) => ({from: __film.from, at: __film.at(b)})", beat)
        b.close()
    fps = 60
    n0, ns = round(info["from"] * fps), round(info["at"] * fps)
    subprocess.run([sys.executable, str(ROOT / "cine/tools/record.py"), lesson, "--from", f"{ns / fps:.6f}", "--out", "tail.mp4", "--port", port], check=True)
    new = B / "picture.new.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(B / "picture.mp4"), "-i", str(B / "tail.mp4"),
                    "-filter_complex", f"[0:v]trim=end_frame={ns - n0},setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]",
                    "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", str(new)], check=True)
    new.replace(B / "picture.mp4")
    print(f"→ {B / 'picture.mp4'}：保留 {ns - n0} 帧 + 重渲 {beat} 起")


if __name__ == "__main__":
    main()
