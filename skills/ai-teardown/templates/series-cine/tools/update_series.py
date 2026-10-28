#!/usr/bin/env python3
"""把已交付的课填进 series.json：视频、封面、时长，并更新上线状态；之后再跑 course_page.py 出课程页。
用法（在系列目录跑）：python3 tools/update_series.py [--web publish/course] [--prefix p]
课号 = 前缀 + 两位数（如 p03 → publish/course/lessonp03.mp4）；deliver.sh 交付时已经按这个名字放好。"""
import json, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parent.parent
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
P, WEB, PRE = R / "series.json", R / arg("--web", "publish/course"), arg("--prefix", "")
S = json.loads(P.read_text(encoding="utf-8"))
done = 0
for les in S["lessons"]:
    n = f"{PRE}{les['n']:02d}"
    v = WEB / f"lesson{n}.mp4"
    if v.exists():
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(v)], capture_output=True, text=True).stdout)
        les.update(video=v.name, poster=f"lesson{n}.jpg", length=f"{int(d // 60)} 分 {int(round(d % 60))} 秒")
        done += 1
    else:
        for k in ("video", "poster", "length"):
            les.pop(k, None)
total = len(S["lessons"])
S["status_label"] = "全部上线" if done == total else f"已上线 {done}/{total}"
P.write_text(json.dumps(S, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"{done}/{total} 节已填入")
