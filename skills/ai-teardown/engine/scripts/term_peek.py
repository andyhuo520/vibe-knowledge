#!/usr/bin/env python3
"""看录屏某一时刻的整屏文字（写画面编排、定高亮行号时用）。
用法：python3 scripts/term_peek.py <x.frames.json> <秒 或 mark:名字> [--nums]"""
import json, sys
d = json.load(open(sys.argv[1]))
t = sys.argv[2]
t = d["marks"][t[5:]] if t.startswith("mark:") else float(t)
rows = [""] * d["rows"]
for f in d["frames"]:
    if f["t"] > t:
        break
    for k, v in f["d"].items():
        rows[int(k)] = "".join(r[0] for r in v)
for i, r in enumerate(rows):
    print(f"{i:>2}│{r}" if "--nums" in sys.argv else r)
