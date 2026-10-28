#!/usr/bin/env python3
"""扫一遍录屏帧，找还露在画面上的隐私字样：python3 scripts/rec_scan.py <frames.json>... [--pat 正则]
每一帧按差分还原整屏，把整屏（拼接成一串，跨行也算）跟正则比对，报出第一次出现的时间和上下文。"""
import json, re, sys

pat = r"andyhu|feishu|/Users/(?!myname)|chatcut|cowart|pireel|node_repl|codex_app|codex_tui|cua_repl|computer-use|memmy|dashi|youware|@(?!example)[\w-]+\.(com|cn|io)"
args = sys.argv[1:]
if "--pat" in args:
    i = args.index("--pat"); pat = args[i + 1]; del args[i:i + 2]
P = re.compile(pat, re.I)
bad = 0
for f in args:
    d = json.load(open(f))
    rows, cols = d["rows"], d["cols"]
    state = [""] * rows
    seen = {}
    for fr in d["frames"]:
        for k, runs in fr["d"].items():
            state[int(k)] = "".join(r[0] for r in runs)
        txt = "".join(s.ljust(cols) for s in state)
        for m in P.finditer(txt):
            key = m.group(0).lower()
            if key not in seen:
                seen[key] = fr["t"]
                print(f"{f}  t={fr['t']:.1f}s  「{txt[max(0, m.start()-30):m.end()+30].strip()}」")
                bad += 1
print("干净" if not bad else f"共 {bad} 处")
