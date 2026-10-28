#!/usr/bin/env python3
"""按选题推荐风格：python3 recommend.py "商鞅立木为什么能让人相信新法" [--top 3] [--json]

打分：选题里命中风格关键词（catalog.json 的 keywords）每个 +2+字数（越具体越高，「奶茶」压过「茶」），命中调性词 +1；用户自己的风格（~/vibe-knowledge-styles/*/style.json）同样参与，并额外 +1。
没有任何命中时按 FILL 顺序补位（亮暗交替、家族不同）：星空光点 / 综艺花字 / 字幕新闻 / 粉笔黑板 …
推荐结果保证三套视觉差异明显（同一家族 fam 最多 2 套，增强档风格标「需生图」），每套附：理由（命中了哪些词）、建议母版、样片、风格图路径。
Claude 拿到结果后用 AskUserQuestion 问用户：推荐第一的排第一并写「（推荐）」，每个选项的 preview 放风格图路径和一句画面描述。"""
import json, sys
from pathlib import Path

SK = Path(__file__).resolve().parents[1]
CAT = json.loads((SK / "styles/catalog.json").read_text(encoding="utf-8"))
MINE = Path.home() / "vibe-knowledge-styles"


def load_styles():
    out = []
    for s in CAT["styles"]:
        out.append({**s, "still": str(SK / "styles" / s["key"] / "still.jpg"), "mine": False})
    if MINE.exists():
        for d in sorted(MINE.iterdir()):
            f = d / "style.json"
            if f.exists():
                s = json.loads(f.read_text(encoding="utf-8"))
                out.append({**s, "key": d.name, "still": str(d / "still.jpg"), "mine": True})
    return out


def recommend(topic, top=3):
    styles = load_styles()
    scored = []
    for s in styles:
        hits = [k for k in s.get("keywords", []) if len(k) >= 2 and k.lower() in topic.lower()]   # 单字词太容易误中（「聪明」≠ 明朝），catalog 里一律写双字以上
        tone = [k for k in s.get("tone", []) if k in topic]
        score = sum(2 + len(k) for k in hits) + len(tone) + (1 if s["mine"] else 0)
        scored.append((score, s, hits + tone))
    scored.sort(key=lambda x: (-x[0], x[1].get("no", 99)))
    picks, per_cat = [], {}
    for sc, s, hits in scored:                      # 先放有命中的（同一类别最多 2 套）
        if sc <= 0 or len(picks) >= top:
            continue
        fam = s.get("fam", s.get("cat"))
        if per_cat.get(fam, 0) >= 2:
            continue
        picks.append((sc, s, hits)); per_cat[fam] = per_cat.get(fam, 0) + 1
    FILL = ["starfield", "variety", "caption-news", "chalk", "darkgold", "swiss", "titles", "investigation", "journal", "collage", "paper", "isometric", "neon", "minimal", "metro", "darkmath", "memphis", "blueprint", "riso", "ransom", "desktop", "isotype", "keynote", "editorial", "rpg", "silent", "aurora", "vapor", "constructivist", "cards", "gufeng", "pixel", "woodcut", "qinghua", "dunhuang", "scroll", "copper", "farm", "tvnews", "clay", "poster", "deco", "lighttable", "sketch"]
    for k in FILL:   # 再按「差异最大」补位：亮暗交替、家族不重复
        if len(picks) >= top:
            break
        if k not in {x["key"] for x in styles}:
            continue
        fam = next(x for x in styles if x["key"] == k).get("fam")
        if picks and fam in {p[1].get("fam") for p in picks}:
            continue
        if len(picks) >= top:
            break
        if all(p[1]["key"] != k for p in picks):
            picks.append((0, next(x for x in styles if x["key"] == k), []))
    res = []
    for i, (sc, s, hits) in enumerate(picks[:top]):
        tpl = s.get("templates", ["A"])[0]
        why = f"选题里有「{'、'.join(hits[:4])}」，正对「{s['fit']}」" if hits else f"选题没有明显指向，这套适合「{s['fit']}」，作为差异化备选"
        res.append({"rank": i + 1, "key": s["key"], "name": s["name"], "en": s.get("en", ""), "mine": s["mine"], "score": sc,
                    "one": s["one"], "why": why, "template": tpl, "template_name": CAT["templates"].get(tpl, ""),
                    "sample": s.get("sample", ""), "still": s["still"], "fam": s.get("fam", ""), "tier": s.get("tier", "基础")})
    return res


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 3
    if "--top" in sys.argv:
        args = [a for a in args if a != str(top)]
    topic = " ".join(args)
    r = recommend(topic, top)
    if "--json" in sys.argv:
        print(json.dumps(r, ensure_ascii=False, indent=1)); sys.exit()
    print(f"选题：{topic}\n")
    for x in r:
        tag = "（推荐）" if x["rank"] == 1 else ""
        print(f"{x['rank']}. {x['name']}{tag}{' · 我的风格' if x['mine'] else ''}（{x['fam']} · {'增强档，需生图' if x['tier'] == '增强' else '0 积分'}）—— {x['one']}")
        print(f"   为什么：{x['why']}")
        print(f"   搭配母版：{x['template']} {x['template_name']}")
        print(f"   样片：{x['sample']}　风格图：{x['still']}\n")
