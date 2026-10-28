#!/usr/bin/env python3
"""曲库的曲子大多两分钟左右，一节课四五分钟：把 pick_music.py 裁好的 bgm.wav 按小节循环接长。
循环段从对齐点后第 8 小节开始、到曲尾淡出前的最后一个整小节结束；接缝放在小节线上，用一小节等功率交叉淡化，拍子网格不断。
用法：python3 cine/tools/loopbed.py <bgm.wav> <输出.wav> --seconds 340 --bpm 128.5 --anchor 7.44"""
import argparse
import math
import wave

import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--seconds", type=float, required=True)
    ap.add_argument("--bpm", type=float, required=True)
    ap.add_argument("--anchor", type=float, required=True, help="pick_music.py 的 --hit-at：这一刻是小节线")
    a = ap.parse_args()
    with wave.open(a.src, "rb") as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, ch).astype(np.float64)
    dur = len(x) / sr
    n = int(a.seconds * sr)
    if dur >= a.seconds:
        y = x[:n]
    else:
        bar = 4 * 60 / a.bpm
        ls = a.anchor + 8 * bar
        le = a.anchor + math.floor((dur - 4.0 - a.anchor) / bar) * bar     # 避开曲尾淡出
        if le - ls < 4 * bar:
            raise SystemExit("曲子太短，凑不出 4 小节以上的循环段")
        xf = int(bar * sr)
        k = np.linspace(0, np.pi / 2, xf)[:, None]
        fin, fout = np.sin(k), np.cos(k)
        y = np.zeros((n + len(x), ch))
        first = x[: int(le * sr) + xf].copy()
        first[-xf:] *= fout
        y[: len(first)] += first
        body = x[int(ls * sr): int(le * sr) + xf]
        pos, step = int(le * sr), int(le * sr) - int(ls * sr)
        while pos < n:
            seg = body.copy()
            seg[:xf] *= fin
            seg[-xf:] *= fout
            y[pos: pos + len(seg)] += seg
            pos += step
        y = y[:n]
        print(f"循环段 {ls:.2f}–{le:.2f}s（{(le - ls) / bar:.0f} 小节），接成 {a.seconds:.1f}s")
    m = int(2.0 * sr)
    y[-m:] *= np.linspace(1, 0, m)[:, None]
    with wave.open(a.out, "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(np.clip(np.round(y), -32768, 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    main()
