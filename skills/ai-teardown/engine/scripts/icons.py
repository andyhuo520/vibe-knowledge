#!/usr/bin/env python3
"""从离线图标集里抽出片子用到的图标，写成一个小 JSON 打进 bundle。

用法：python3 scripts/icons.py <输出.json> <源文件或目录>...
扫描源码里形如 "icon-park:robot"（IconPark 多色）、"icon-park-outline:robot"、"tabler:robot" 的名字；图标集在 assets/iconsets/。
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = re.compile(r"\b(tabler|lucide|iconoir|icon-park(?:-outline|-solid|-twotone)?):([a-z0-9]+(?:-[a-z0-9]+)*)\b")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out = Path(sys.argv[1])
    files = []
    for a in sys.argv[2:]:
        p = Path(a)
        files += [f for f in p.rglob("*") if f.suffix in {".js", ".json", ".mjs"}] if p.is_dir() else [p]
    want = sorted({m.group(0) for f in files for m in NAME.finditer(f.read_text(encoding="utf-8", errors="ignore"))})
    sets, res, miss = {}, {}, []
    for name in want:
        pre, ic = name.split(":")
        if pre not in sets:
            sets[pre] = json.loads((ROOT / "assets/iconsets" / f"{pre}.json").read_text(encoding="utf-8"))
        s = sets[pre]
        rec = s["icons"].get(ic)
        if rec is None and ic in s.get("aliases", {}):
            rec = s["icons"].get(s["aliases"][ic]["parent"])
        if rec is None:
            miss.append(name)
            continue
        res[name] = {"body": rec["body"], "w": rec.get("width", s.get("width", 24)), "h": rec.get("height", s.get("height", 24))}
    out.write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
    print(f"{len(res)} 个图标 → {out}" + (f"；缺 {miss}" if miss else ""))
    if miss:
        sys.exit(1)


if __name__ == "__main__":
    main()
