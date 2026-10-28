#!/usr/bin/env python3
"""把研究账本（sources.json + facts.json）导出成互动课件用的 facts.js（window.FACTS / window.SOURCES）。

用法：python3 scripts/facts_js.py <research 目录> <out.js> [--images images.json]
--images：把图片账本也并进 SOURCES（id 用 IMG:<图片id>），课件里点人物卡能看到图片的作者与许可。
"""
import json
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    rd, out = Path(sys.argv[1]), Path(sys.argv[2])
    F = json.loads((rd / "facts.json").read_text(encoding="utf-8"))["facts"]
    S = json.loads((rd / "sources.json").read_text(encoding="utf-8"))["sources"]
    facts = {f["id"]: {"claim": f["claim"], "status": f.get("status", "verified"),
                       "evidence": [{"source": e["source"], "quote": e.get("quote", "")[:220]} for e in f.get("evidence", [])]} for f in F}
    sources = {s["id"]: {"publisher": s.get("publisher", ""), "title": s.get("title", ""), "locator": s.get("url", "")} for s in S}
    if "--images" in sys.argv:
        imgs = json.loads(Path(sys.argv[sys.argv.index("--images") + 1]).read_text(encoding="utf-8"))["images"]
        for i in imgs:
            sources[f"IMG:{i['id']}"] = {"publisher": i.get("artist", ""), "title": f"{i.get('title', '')}（{i.get('license', '')}）", "locator": i.get("page", "")}
    out.write_text("window.FACTS = " + json.dumps(facts, ensure_ascii=False) + ";\nwindow.SOURCES = " + json.dumps(sources, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"{len(facts)} 条事实、{len(sources)} 个来源 → {out}")


if __name__ == "__main__":
    main()
