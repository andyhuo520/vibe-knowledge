#!/usr/bin/env python3
"""用户克隆音色的人声后期（voice-clone-test/README.md 定稿的那条链），在配音 + 变速之后跑。
用法：python3 voice_post.py <lessons/NN>      原件留 build/narration.pre.wav，重复跑从原件算。"""
import shutil, subprocess, sys
from pathlib import Path
b = Path(sys.argv[1]) / "build"
pre, cur = b / "narration.pre.wav", b / "narration.wav"
if not pre.exists() or cur.stat().st_mtime > pre.stat().st_mtime + 1: shutil.copy(cur, pre)
chain = "highpass=f=70,equalizer=f=140:t=o:w=1:g=3.5,equalizer=f=420:t=o:w=1:g=-2,equalizer=f=3200:t=o:w=1:g=3,acompressor=threshold=-22dB:ratio=3.5:attack=4:release=90:makeup=2"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(pre), "-af", chain, "-ar", "48000", str(cur)], check=True)
shutil.copystat(pre, cur); cur.touch()
print("✓ 人声后期 →", cur)
