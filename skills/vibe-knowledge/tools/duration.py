#!/usr/bin/env python3
"""按选题复杂度给时长建议（规则见 references/13-duration.md）。
python3 duration.py --scores 概念,前置,因果链,证据,分歧 [--template A-F] [--pick 档名或秒数] [--json]
五项各 0–2 分。输出复杂度、推荐档、四个时长选项（推荐档排第一，可直接放进 AskUserQuestion）。
--pick 传用户选的档（速览/精讲/标准/深挖）或秒数，检查跟复杂度是否差太多，差两级以上会打印提醒。"""
import json
import sys

DIMS = ["概念数", "前置知识", "因果链", "证据密度", "分歧/反转"]
TIERS = [
    {"name": "速览", "range": "45–60 秒", "sec": (45, 60), "beats": "5–7", "dots": "●○○○",
     "can": "一个钩子 + 一个结论 + 一个例子 + 回问", "cut": "前情、出处展开、对照组，反转最多一句"},
    {"name": "精讲", "range": "1:30–2:00", "sec": (90, 120), "beats": "7–9", "dots": "●●○○",
     "can": "主线讲完 + 1 个关键证据 + 1 次反转", "cut": "第二条证据、历史对照、误区纠正"},
    {"name": "标准", "range": "2:30–3:00", "sec": (150, 180), "beats": "10–12", "dots": "●●●○",
     "can": "主线 + 2–3 个证据 + 1 次反转 + 对照组 + 回问", "cut": "因果链里的次要环节，两说并列只留一处"},
    {"name": "深挖", "range": "3:30–5:00", "sec": (210, 300), "beats": "14–20", "dots": "●●●●",
     "can": "完整因果链（每步一个画面证据）+ 两说并列 + 误区纠正 + 延伸", "cut": "基本不砍，每章一个王炸防疲劳"},
]
HABIT = {"A": "猜谜概念片惯例 3:30–4:30", "B": "两难选择片系列惯例约 2:55", "C": "痛点原理片惯例 2:00–2:30",
         "D": "一条主线片惯例约 3:00", "E": "闯关片惯例 4–6 分钟", "F": "六面轮转片惯例 45–60 秒"}
CPS = 5.5  # 成片字/秒（下限），上限 6


def words(t):
    a, b = t["sec"]
    return f"{round(a * CPS / 10) * 10}–{round(b * 6 / 10) * 10}"


def level(score):
    return (0, "简单") if score <= 3 else (1, "中等") if score <= 6 else (2, "复杂")


def recommend(score, evid):
    lv = level(score)[0]
    if lv == 0:
        return 0 if evid == 0 else 1
    return 2 if lv == 1 else 3


def tier_of(pick):
    for i, t in enumerate(TIERS):
        if pick == t["name"]:
            return i
    s = float(pick)
    return min(range(4), key=lambda i: 0 if TIERS[i]["sec"][0] <= s <= TIERS[i]["sec"][1] else min(abs(s - x) for x in TIERS[i]["sec"]))


def main():
    a = sys.argv
    if "--scores" not in a:
        sys.exit(__doc__)
    sc = [int(x) for x in a[a.index("--scores") + 1].split(",")]
    if len(sc) != 5 or any(x not in (0, 1, 2) for x in sc):
        sys.exit("--scores 要 5 个 0–2 的整数，顺序：" + "、".join(DIMS))
    tpl = a[a.index("--template") + 1].upper() if "--template" in a else None
    total = sum(sc); lv, lname = level(total); rec = recommend(total, sc[3])
    order = [rec] + [i for i in range(4) if i != rec]
    opts = []
    for i in order:
        t = TIERS[i]
        desc = f"约 {words(t)} 字 · {t['beats']} 拍 · 细腻度 {t['dots']}｜能讲到：{t['can']}｜要砍掉：{t['cut']}"
        if i == rec and tpl in HABIT:
            desc += f"｜{HABIT[tpl]}"
        if i == rec and lv == 2:
            desc += "｜也可以拆成两期，每期标准档"
        if abs(i - rec) >= 2:
            desc += "｜⚠ 跟复杂度差得较远"
        opts.append({"label": f"{t['name']} {t['range']}" + ("（推荐）" if i == rec else ""), "description": desc})
    out = {"score": total, "level": lname, "detail": dict(zip(DIMS, sc)),
           "question": f"这个选题偏{lname}（{total}/10），想做多长？", "recommend": TIERS[rec]["name"], "options": opts}
    if "--pick" in a:
        p = tier_of(a[a.index("--pick") + 1]); want = rec
        if abs(p - want) >= 2:
            out["warning"] = ("只能讲到结论，「为什么」基本讲不到，评论区容易出现「没听懂」。" if p < want else
                              "内容撑不满这个时长，会出现重复和长时间静止的画面；建议往短调一档，或者加一个相关子话题。")
    if "--json" in a:
        print(json.dumps(out, ensure_ascii=False, indent=1)); return
    print(f"复杂度 {total}/10 · {lname}　（" + "，".join(f"{k} {v}" for k, v in out["detail"].items()) + "）")
    print(f"推荐：{out['recommend']}\n问题：{out['question']}")
    for o in opts:
        print(f"- {o['label']}\n    {o['description']}")
    if "warning" in out:
        print(f"⚠ 提醒：{out['warning']}")


if __name__ == "__main__":
    main()
