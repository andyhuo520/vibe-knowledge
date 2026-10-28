# 05 · 模板编译器（第一、二季）场景编排

适用不写 `engine` 的系列（默认 `runtime/lesson.js`）。擅长人物与历史、概念科普、真实终端录屏。成品参照 `templates/series-lesson/`。

## 文件头

```json
{"n": 5, "title": "…", "series": "AI 实战课", "theme": "mint", "speed": 1.15, "author": "@Berryxia", "scenes": [...]}
```
- `theme`：`macaron`（默认，浅色马卡龙）/ `mint`（薄荷）/ `night`（夜间）/ `editorial`。
- 场景：`{t, at, chapter?, year?, mascot?, ...}`，每个场景持续到下一个场景开始；有 `chapter` 的场景用色圆转场进场；`year` 显示顶部年份标尺。

## 时间写法（两套引擎通用）

`"B03"` 第 3 拍开口 · `"B03.first"` 第 3 拍 [[first]] 标记 · `"B03@机器"` 读到「机器」的那一刻 · `"B03.end"` 说完 · 都可加偏移 `"B03.first+0.4"`、`"B03@机器-0.2"`。元素不写 at 就按出场顺序自动错开。

## 模板与字段

| 模板 | 用途 | 字段 |
|---|---|---|
| opening | 片头 | title, titleAt, eyebrow, eyebrowAt, question, questionAt, icons |
| statement | 打字大字 | lines, icon, iconAt, tone, mascot, w, x, y |
| iconrow | 图标排 / 带箭头成流程 | title, items, arrows, caption, gap, size, wall, x, y |
| portrait | 人物照片卡 | photo |
| people | 多人头像 | people, peopleOut, credit, doc, term, size |
| chat | 对话窗（界面示意） | mock, mockText, photo, w, x, y |
| timeline | 时间线 | heading, events |
| bars | 数字对比条（数字必须有出处） | title, sub, items, max, src, photo, y |
| curve | 示意曲线（标「不是真实数据」） | domain, points, labels, ticks, note, drawnBy |
| versus | 两边对照 | lines, photos, vsAt |
| image | 大图 | photo, x, y |
| twocol | 左右两栏 | left, right, bottom, y |
| graph | 关系小图（每节最多一张）；`cell` 方格模式 | nodes, edges, title, caption, cell, r, side… |
| terminal | 真实终端回放 | rec, from, to, rows, rate, hold, hi, zoom, label, title, doodles, w, x, y, maxH |
| shot | 截图 | img, crop, label, credit, push, doodles, w, h, x, y |
| steps | 步骤卡 | title, items, w, x, y |
| pause | 暂停想一想 | q, a, revealAt, y |
| mindmap | 思维导图收尾 | center, branches, icon, next, celebrateAt |

`doodles`（terminal / shot）：手札体批注，terminal 按行列定位，shot 按原图比例定位。

## 终端录屏（实战课）

- `scripts/term_record.py`：pty + pyte 真实录 CLI（work 步骤自动审批并记日志）；长提示词打字要放慢（cps 13、回车前停 1.8 秒）并等「working」确认提交。
- `scripts/term_frames.py`：格子层打码——邮箱、key、本机用户名替换成 `myname`、抹额度提醒行、`--drop` 抹私人 MCP 名与启动日志；整屏拼接跨行匹配。
- `scripts/term_cut.py` 剪空等，`scripts/regen_recs.sh` 一键重生成，**发布前必跑 `scripts/rec_scan.py` 扫隐私**。
- 终端窗口底边 ≤ 355（不压字幕条），编译器已夹紧。
- 录屏会用掉用户的账号额度：动手前先问，改了用户配置（如 `~/.codex/config.toml`）要先备份、录完恢复。

## 版式经验

- 开头空屏：把标题挂到本拍第一个 cue。
- opening 后紧跟的场景太早会让片头只剩 1–2 秒（check_scenes 会报）。
- versus 中间文字太长会压到照片。
- 关系图只占一部分画面时间，别整片在一张大图上来回推拉（观众会晕）；换话题用切换。
- 每节都要有：打字文字、图片或视频片段、思维导图收尾、图标或小动画。
