#!/usr/bin/env python3
"""一节课上线后：记下互动版链接、刷新「已上线几节」、重生成课程页。
用法：python3 scripts/mark_live.py <系列目录> <课号> <互动版链接>"""
import json, subprocess, sys
from pathlib import Path

sd, n, url = Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
p = sd / "series.json"
s = json.load(open(p))
next(l for l in s["lessons"] if l["n"] == n)["interactive"] = url
live = [l["n"] for l in s["lessons"] if l.get("video") and l["n"] >= 1]
total = len([l for l in s["lessons"] if l["n"] >= 1])
k = len(live)
span = (f"第 1–{max(live)} 节" if max(live) > 1 else "第 1 节") if live == list(range(1, max(live) + 1)) else f"{k} 节"
s["status_label"] = f"{span}已上线 · 其余 {total - k} 节制作中" if k < total else f"全部 {total} 节已上线"
json.dump(s, open(p, "w"), ensure_ascii=False, indent=2)
print(s["status_label"])
subprocess.run([sys.executable, str(Path(__file__).parent / "course_page.py"), str(p), str(sd / "publish" / "course")], check=True)
