#!/usr/bin/env python3
"""从镜头表读出案例片段（film.js 导出的 clips），裁好放进 lessons/<课号>/assets/clips/：<id>.mp4（只取那一段、缩到框的大小、60 帧）+ <id>.jpg（封面，给预览和接触表）。
用法：python3 cine/tools/clips.py <课号> [--port 8964]
clips 每项：{id, src（绝对路径）, from（源片起点秒）, dur, at（本课第几秒出现）, x, y, w, h, audio: "full"|"duck"|"mute", gain?（dB）, fade?（秒，0=硬切）, poster_at?（秒）, seg?（只放源片前 seg 秒，剩下定格）}"""
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from browser import launch

ROOT = Path(__file__).resolve().parent.parent.parent


def film_clips(lesson, port):
    with sync_playwright() as p:
        b = launch(p)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto(f"http://127.0.0.1:{port}/cine/index.html?lesson={lesson}&capture")
        pg.wait_for_function("window.__film && window.__film.ready", timeout=180000)
        c = pg.evaluate("__film.clips")
        b.close()
    return c


def main():
    lesson = sys.argv[1]
    port = sys.argv[sys.argv.index("--port") + 1] if "--port" in sys.argv else "8964"
    out = ROOT / "lessons" / lesson / "assets" / "clips"
    out.mkdir(parents=True, exist_ok=True)
    clips = film_clips(lesson, port)
    for c in clips:
        mp4, jpg, sig = out / f"{c['id']}.mp4", out / f"{c['id']}.jpg", out / f"{c['id']}.sig"
        w, h = int(c["w"]) // 2 * 2, int(c["h"]) // 2 * 2
        seg = float(c.get("seg", c["dur"]))                       # seg < dur：源片只放 seg 秒，之后定格在最后一帧
        key = f"{c['src']}|{c['from']}|{c['dur']}|{seg}|{w}x{h}"      # 起点、时长、框大小变了就重裁
        if not mp4.exists() or mp4.stat().st_mtime < Path(c["src"]).stat().st_mtime or not sig.exists() or sig.read_text() != key:
            hold = max(0.0, float(c["dur"]) - seg)
            vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=60" + (f",tpad=stop_mode=clone:stop_duration={hold:.3f}" if hold > 0.01 else "")
            af = ["-af", f"apad=pad_dur={hold:.3f}"] if hold > 0.01 else []
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(c["from"]), "-i", c["src"], "-t", f"{seg:.3f}",
                            "-vf", vf, *af, "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", str(mp4)], check=True)
            sig.write_text(key)
        # 封面：默认取片段第 0.4 秒；poster_at=0 取第一帧（画面里先用封面做飞入动画、落位后无缝换成真视频）
        pa = float(c.get("poster_at", min(0.4, c["dur"] / 2)))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{pa:.3f}", "-i", str(mp4), "-frames:v", "1", "-q:v", "2", str(jpg)], check=True)
        print(f"✓ {c['id']}  {Path(c['src']).name} {c['from']}s+{c['dur']}s → {w}×{h}")
    print(f"→ {out}（{len(clips)} 段）")


if __name__ == "__main__":
    main()
