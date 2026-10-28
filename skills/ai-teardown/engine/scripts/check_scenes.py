#!/usr/bin/env python3
"""画面编排自检：scenes.json 里每个时间引用（B03 / B03.cue / B03.end，可带 ±秒）都要在 narration.json 里有对应的拍和 [[cue]]。
不用等配音，写完 scenes.json 就能跑。用法：python3 scripts/check_scenes.py <lessonDir>…"""
import json, re, sys
from pathlib import Path

REF = re.compile(r"^(B\d\d)(?:\.([a-z0-9_]+(?:-[a-z][a-z0-9_]*)*))?(?:@[^+-]+)?(?:[+-][\d.]+)?$")

def walk(o, path=""):
    if isinstance(o, dict):
        for k, v in o.items():
            if isinstance(v, str) and (k in ("at", "settle", "hi", "celebrateAt", "titleAt", "questionAt", "eyebrowAt", "peopleOut", "drawnBy", "vsAt", "chatAt", "iconAt", "srcAt", "boxAt", "out") or k.endswith("At")):
                yield f"{path}.{k}", v
            else:
                yield from walk(v, f"{path}.{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f"{path}[{i}]")

ROOT = Path(__file__).resolve().parent.parent
SETS = {}
for f in (ROOT / "assets/iconsets").glob("*.json"):
    j = json.load(open(f)); SETS[j.get("prefix", f.stem)] = set(j["icons"]) | set(j.get("aliases", {}))

def icons(o):
    if isinstance(o, (dict, list)):
        for v in (o.values() if isinstance(o, dict) else o):
            yield from icons(v)
    elif isinstance(o, str) and re.match(r"^[a-z-]+:[a-z0-9-]+$", o): yield o

bad = 0
for d in map(Path, sys.argv[1:]):
    beats = {b["id"]: set(re.findall(r"\[\[([a-z0-9_-]+)\]\]", b["narration"])) for b in json.load(open(d / "narration.json"))["beats"]}
    spec = json.load(open(d / "scenes.json"))
    order = []
    for p, v in walk(spec):
        m = REF.match(v)
        if not m: print(f"{d.name} {p}: 看不懂 {v!r}"); bad += 1; continue
        b, cue = m.groups()
        if b not in beats: print(f"{d.name} {p}: 没有这一拍 {b}"); bad += 1
        elif cue and cue not in ("end", "cue") and cue not in beats[b]: print(f"{d.name} {p}: {b} 里没有 [[{cue}]]（有：{' '.join(sorted(beats[b]))}）"); bad += 1
    for ic in set(icons(spec)):
        pre, name = ic.split(":")
        if pre in SETS and name not in SETS[pre]: print(f"{d.name}: 图标库里没有 {ic}"); bad += 1
    tj = d / "build" / "timings.json"
    if tj.exists():  # 有了配音时间，再查一遍：场景太短，观众来不及看
        TJ = json.load(open(tj)); T = TJ["beats"]; SPD = TJ.get("speed", 1)
        T = T if isinstance(T, dict) else {b["id"]: b for b in T}
        def when(r):
            m = re.match(r"^(B\d\d)(?:\.([a-z0-9_]+(?:-[a-z][a-z0-9_]*)*))?(?:@([^+-]+))?([+-][\d.]+)?$", r)
            b, cue, word, off = m.groups(); B = T[b]
            if word:  # 「B03@机器」：读到这个词的那一刻（与 lesson.js 的 W() 一致）
                i = B["text"].find(word)
                base = B["chars"][i] if i >= 0 and B.get("chars") else B["start"]
                if i < 0: print(f"{d.name}: {b} 旁白里没有「{word}」")
            else:
                base = B["end"] if cue == "end" else B["cues"].get(cue, B["start"]) if cue else B["start"]
            return base + float(off or 0) / SPD
        ts = [when(sc["at"]) for sc in spec["scenes"]] + [max(B["end"] for B in T.values())]
        for k, sc in enumerate(spec["scenes"]):
            if ts[k + 1] - ts[k] < 2.5: print(f"{d.name}: 第 {k} 个场景（{sc['t']} @ {sc['at']}）只有 {ts[k+1]-ts[k]:.1f} 秒"); bad += 1
            if ts[k + 1] < ts[k]: print(f"{d.name}: 第 {k + 1} 个场景比前一个还早"); bad += 1
    starts = [s["at"] for s in spec["scenes"]]
    print(f"{d.name}: {len(spec['scenes'])} 个场景，覆盖 {len({s.split('.')[0][:3] for s in starts})}/{len(beats)} 拍的起点")
sys.exit(1 if bad else 0)
