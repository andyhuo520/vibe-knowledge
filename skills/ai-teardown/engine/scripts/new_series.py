#!/usr/bin/env python3
"""新建一个系列课：工作区（引擎副本）+ 系列目录骨架。

用法：
  python3 new_series.py <工作区目录> <系列名> [--style sketch|lesson|cine] [--title 课程名]

- 工作区不存在时，把 skill 自带的 engine/（scripts runtime primitives schemas assets）整份拷过去。
  make_lesson 要求课目录在工作区之内（打包时按工作区算相对路径），所以系列一律放在 <工作区>/examples/<系列名>/。
- 已有工作区（比如 ~/Desktop/ai-teardown）就直接在里面建系列，不覆盖引擎。
- sketch：Notion 极简 + 手绘引擎 + 像素讲解小人（WorkBuddy 上手课那套）；lesson：第一、二季的模板编译器（马卡龙 / 薄荷 / 夜间主题、终端录屏）；
  cine：代码成片引擎（Opus 5.5 编排课、宣传片实战课那套：一节课 = seek(t)，Three.js/粒子/真片段，见 references/10-cine.md）。
"""
import argparse
import json
import shutil
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]          # ~/.claude/skills/ai-teardown
ENGINE = SKILL / "engine"
PRESETS = SKILL / "presets"
TEMPLATES = SKILL / "templates"


def new_cine(sd, title):
    """代码成片引擎拷进系列目录（tools 按 <系列>/cine、<系列>/lessons 的相对位置找文件），字体从 engine/assets/fonts 拿。"""
    shutil.copytree(ENGINE / "cine", sd / "cine", ignore=shutil.ignore_patterns("__pycache__", ".DS_Store"))
    (sd / "cine/fonts").mkdir(exist_ok=True)
    for f in ["Geist-VF.ttf", "GeistMono-VF.ttf", "NotoSansSC-VF.ttf"]:
        shutil.copy(ENGINE / "assets/fonts" / f, sd / "cine/fonts" / f)
    (sd / "cine/queue.txt").touch()
    (sd / "cine/deliver.env").write_text(f'# deliver.sh 的去向（zsh 语法）\nD="$HOME/Desktop/{title}_视频"\nWEB=publish/course\nSTRIP=""\n', encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("workspace")
    ap.add_argument("name")
    ap.add_argument("--style", choices=["sketch", "lesson", "cine"], default="sketch")
    ap.add_argument("--title", default="")
    a = ap.parse_args()

    ws = Path(a.workspace).expanduser().resolve()
    if not (ws / "scripts/make_lesson.py").exists():
        ws.mkdir(parents=True, exist_ok=True)
        for d in ["scripts", "runtime", "primitives", "schemas", "assets"]:
            shutil.copytree(ENGINE / d, ws / d, dirs_exist_ok=True)
        print(f"✓ 工作区已建：{ws}")
    else:
        print(f"· 用已有工作区：{ws}")

    sd = ws / "examples" / a.name
    if sd.exists():
        raise SystemExit(f"系列目录已存在：{sd}")
    (sd / "lessons").mkdir(parents=True)
    (sd / "voice").mkdir()
    (sd / "publish/course").mkdir(parents=True)
    if a.style == "cine":
        new_cine(sd, a.title or a.name)
    else:
        (sd / "assets/img").mkdir(parents=True)
        (sd / "render.queue").touch()

    tpl = TEMPLATES / {"sketch": "series-sketch", "lesson": "series-lesson", "cine": "series-cine"}[a.style]
    for f in ["BRIEF.md", "SCENES_GUIDE.md", "DECISIONS.md"]:
        if (tpl / f).exists():
            shutil.copy(tpl / f, sd / f)
    if a.style == "cine":
        for d in ["examples-lessons", "examples-briefs", "tools", "session"]:
            shutil.copytree(tpl / d, sd / d)
    else:
        shutil.copytree(tpl / "lessons", sd / "examples-lessons")   # 参照用的成品课，写新课前先看

    # 讲解小人（像素头像 10 个动作 × 8 帧）+ 图片账本
    images = []
    if a.style == "cine":
        pass
    elif a.style == "sketch" and (PRESETS / "presenter/images.presenter.json").exists():   # 讲解小人形象自备（开源版不带作者形象），见 presets/README.md
        for p in (PRESETS / "presenter").glob("*.png"):
            shutil.copy(p, sd / "assets/img" / p.name)
        images = json.loads((PRESETS / "presenter/images.presenter.json").read_text(encoding="utf-8"))["images"]
    if a.style != "cine":
        (sd / "assets/img/images.json").write_text(json.dumps({"images": images}, ensure_ascii=False, indent=1), encoding="utf-8")

    # 锁定的克隆音色参照（narration.json 里 voice.clone 写 "../../voice/host-ref.wav"）
    if (PRESETS / "voice/host-ref.wav").exists():
        shutil.copy(PRESETS / "voice/host-ref.wav", sd / "voice/host-ref.wav")

    series = {
        "title": a.title or a.name, "author": "@Berryxia", "status": "draft", "status_label": "大纲待确认",
        "tagline": "", "facts": [], "lessons_sub": "", "footer": "", "lessons": [],
    }
    (sd / "series.json").write_text(json.dumps(series, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ 系列骨架：{sd}")
    if a.style == "cine":
        print("下一步：填 series.json 的大纲 → 按 BRIEF.md 写 lessons/NN/narration.json + film.js → make_lesson voice + speed.py → cine/tools/stills.py 看接触表 → cine/queue.txt + queue.sh（见 references/10-cine.md）")
    else:
        print("下一步：填 series.json 的大纲 → 按 BRIEF.md 写 lessons/NN/narration.json → make_lesson voice/build/final")


if __name__ == "__main__":
    main()
