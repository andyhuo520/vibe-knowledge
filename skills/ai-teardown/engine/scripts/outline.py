#!/usr/bin/env python3
"""把 lesson.json 渲染成给人确认的大纲与分镜（CP1 用）：python3 scripts/outline.py examples/codex
输出 <课题>/lesson/outline.md。所有内容都从数据文件读，改大纲请改 lesson.json 再重新生成。"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check import spoken_len  # noqa: E402

MOVE = {"hook": "钩子", "ask": "问", "show": "演", "name": "名", "place": "归", "compare": "对比",
        "recap": "收束", "quiz": "小测", "transition": "过渡", "end": "片尾"}
CUE_RE = re.compile(r"\[\[([a-z][a-z0-9_-]*)\]\]")


def visual_desc(v):
    p = v.get("params", {})
    bits = [v["primitive"]]
    if v.get("ui_mock"):
        bits.append("界面示意")
    if v.get("honesty", "official") != "official":
        bits.append({"inferred": "推断", "undisclosed": "未披露"}[v["honesty"]])
    if v["primitive"] == "Morph":
        bits.append(" → ".join(s["kind"] for s in p.get("states", [])))
    elif p.get("chips"):
        bits.append("、".join(p["chips"]))
    elif p.get("gates"):
        bits.append("闸门：" + "、".join(g["label"] for g in p["gates"]))
    elif p.get("steps"):
        bits.append(" → ".join(p["steps"]))
    if v.get("camera"):
        bits.append(f"镜头 {v['camera'].get('focus', '')} ×{v['camera'].get('zoom', '')}")
    return "：".join([bits[0], " · ".join(bits[1:])]) if len(bits) > 1 else bits[0]


def main():
    base = Path(sys.argv[1]).resolve()
    L = json.loads((base / "lesson/lesson.json").read_text(encoding="utf-8"))
    C = json.loads((base / "lesson/concepts.json").read_text(encoding="utf-8"))
    F = {f["id"]: f for f in json.loads((base / "research/facts.json").read_text(encoding="utf-8"))["facts"]}
    S = {s["id"]: s for s in json.loads((base / "research/sources.json").read_text(encoding="utf-8"))["sources"]}
    pace = L["meta"].get("pace_cps", 3.5)
    beats = {b["id"]: b for b in L["beats"]}
    total = sum(spoken_len(b["narration"]) / pace + 0.35 for b in L["beats"])
    cons = {c["id"]: c for c in C["concepts"]}

    out = [f"# {L['meta']['title']} · 大纲与分镜", "",
           f"信息截至 {L['meta']['as_of']} · {L['meta']['aspect']} · 预计 {total:.0f} 秒 · {len(L['beats'])} 拍 · {len(L['chapters'])} 章 · 配音 {L['meta']['voice']}",
           "", "> 由 `scripts/outline.py` 从 `lesson.json` 生成，CP1 确认用。旁白里的 ⟨名字⟩ 是画面动作对齐的位置。", ""]
    t = 0.0
    for ch in L["chapters"]:
        secs = sum(spoken_len(beats[i]["narration"]) / pace + 0.35 for i in ch["beats"])
        out += [f"## {ch['id']} {ch['title']}（{ch['level']}，约 {secs:.0f} 秒）", "",
                "| 拍 | 起 | 四拍 | 旁白 | 画面 | 新概念 | 出处 |", "|---|---|---|---|---|---|---|"]
        for i in ch["beats"]:
            b = beats[i]
            nar = CUE_RE.sub(lambda m: f"⟨{m.group(1)}⟩", b["narration"]).replace("|", "／")
            con = cons[b["concept"]]["term"] if b.get("concept") else ""
            out.append(f"| {b['id']} | {int(t // 60)}:{int(t % 60):02d} | {MOVE[b['move']]} | {nar} | {visual_desc(b['visual'])} | {con} | {' '.join(b['facts']) or '—'} |")
            t += spoken_len(b["narration"]) / pace + 0.35
        out.append("")
    out += ["## 概念与先修", "", "| 概念 | 层 | 一句大白话 | 先修 |", "|---|---|---|---|"]
    out += [f"| {c['id']} {c['term']} | {c['level']} | {c['plain']} | {' '.join(c['prereqs']) or '—'} |" for c in C["concepts"]]
    out += ["", "## 常见误解", ""]
    out += [f"- **{m['myth']}** → {m['truth']}（{' '.join(m['facts'])}）" for m in C.get("misconceptions", [])]
    out += ["", "## 学习目标（冷读盲测题）", ""]
    out += [f"{i + 1}. {q['question']}  \n   参考答案：{q['answer']}" for i, q in enumerate(C["objectives"])]
    used = sorted({f for b in L["beats"] for f in b["facts"]})
    out += ["", f"## 引用的事实（{len(used)} 条）", "", "| 事实 | 内容 | 来源 |", "|---|---|---|"]
    for fid in used:
        f = F[fid]
        src = "；".join(f"{S[e['source']]['publisher']} · {S[e['source']]['title']}" for e in f["evidence"])
        out.append(f"| {fid} | {f['claim']} | {src} |")
    (base / "lesson/outline.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"→ {base / 'lesson/outline.md'}（预计 {total:.0f} 秒）")


if __name__ == "__main__":
    main()
