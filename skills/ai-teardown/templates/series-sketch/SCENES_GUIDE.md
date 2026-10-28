# WorkBuddy 上手课 · 画面编排规范（手绘引擎 + Notion 皮肤 + 动效）

每节一个 `lessons/NN/scenes.json`，编译器是 `runtime/sketch.js`（图元在 `primitives/sketch.js`、`primitives/motion.js`）。

## 文件头
```json
{"n": 2, "title": "…", "series": "WorkBuddy 上手课", "engine": "sketch", "skin": "notion", "presenter": "hp", "sticker": true,
 "speed": 1.15, "author": "@Berryxia", "scenes": [ … ]}
```
- `sticker: true`（**新课默认**）：贴纸风——stickers 卡片变成白边贴纸（随机倾斜 1.5–3°、放大落下回弹、投影收紧、高光划过），插画套模切白边，卡片里的 Noto emoji 也描白边；标签放不下自动缩字号。单页关掉：stickers 写 `"style": "card"`，say 写 `"illusSticker": false`。
- `engine: "sketch"` 用手绘引擎；`skin: "notion"` 是 Notion 极简风（`"paper"` 是手账风，备用）。
- `presenter: "host"`：右下角讲解小人（作者像素头像，会眨眼、说话时张嘴）。封面和收尾导图自动不出现，单个场景可写 `"host": "none"` 关掉。
- 时间写法同第二季：`"B03"`、`"B03.cue"`、`"B03@词"`、`"B03.end"`，都可加 ±秒。

## 素材
- **图标三层分工**：界面、流程、清单用 **IconPark 线条图标**（写 `icon-park:robot`，Apache 2.0，一笔笔描出来、配 Notion 色；缺的用 `lucide:` / `tabler:`）；主角、情绪、物件用 **Noto emoji**（写 `robot`，有动画自动播）。
- **插画**：IconPark 插画库 88 张（`assets/illustrations/iconpark/`，总览 `_sheet.html`，名单 `catalog.json`）。`python3 scripts/illus.py lessons/NN ip-5-48 …` 放进课目录，场景里 `say` / `cover` 写 `"illus": "ip-5-48"`：轮廓描线 + 色块淡入；来源只在片尾 credits 标注（inlineCredits 默认关）。
- **流程 / 协作图**：`diagram` 模板（AntV X6，MIT）：节点按 col / row 摆，连线自动走直角圆弧，节点弹出 → 连线画出 → 虚线流动。
- 图标：`python3 scripts/noto_emoji.py lessons/NN robot light-bulb …`（名字用小写连字符英文名）。有官方动画的会同时放进 `lessons/NN/lottie/`，场景里写同一个名字就**自动播动画**，没有就用静态图。
- 蓝皮书截图：放进 `assets/img/`，在 `images.json` 登记 `credit`（「截图出处：《WorkBuddy 实战蓝皮书》第 X 章 · MIT」），画面自动标出处。
- 引用原文必须逐字、标章节；**不编数字**，示意数据要写明「示例数据」。

## 通用字段（每个场景都能写）
| 字段 | 作用 |
|---|---|
| `chapter` | 章节名：左上角面包屑 + 切页转场 |
| `src` | 左下角出处小字 |
| `tips: [{text, at, until}]` | 讲解小人的话（气泡），6–16 字，复述旁白要点，**不替作者编观点** |
| `cam: [[时刻, x, y, z], …]` | 镜头推拉摇移；时刻可写秒（相对场景开头）或 `"B02@词"` |
| `host` | `"right"` / `"none"` |

## 模板
| 模板 | 用途 | 关键参数 |
|---|---|---|
| cover | Notion 页面式封面 | title（`\n` 分行）、question、iconImg（`host-avatar`）、stickers（3 个图标）、props |
| kinetic | **大字逐字弹出**（金句、转折） | lines[{text（`*词*` 强调色）, size, y, at, color}]、lottie[{name, x, y, size, at}] |
| say | 普通大字（不弹字） | lines、emoji |
| stickers | 一排卡片（3–5 张） | title、items[{emoji, label, sub, at, tick/cross/circle}]、caption、arrows |
| pan | **镜头摇过一排卡片**（列举「三件事」） | cards[{emoji, title, sub}]、cam、word（结尾大字） |
| quote | Notion 引用块（原文） | text、from、emoji、textAt |
| shot | 截图 + 手绘圈注（写 clip 播放录屏帧序列） | img 或 clip、crop、label、marks[{kind: circle/box/underline, area, at, note, side, color}] |
| flow | 流程（图标圆 + 箭头 + 返工箭头） | nodes[{emoji, label, at, star}]、back{from, to, label, at} |
| compare | 左右对比（叉 / 勾） | left/right{title, emoji, items, at} |
| checklist | 清单（打勾或编号） | items[{emoji, label, sub, at}]、numbered、cols |
| note | 任务说明 callout + 右侧标签 | lines[{text, tag, tagColor, at}] |
| pause | 暂停想一想（倒计时后揭晓） | q、a、revealAt |
| diagram | **X6 流程/协作图** | title、nodes[{id, label, icon（icon-park:…）, col, row, tone, at}]、edges[{from, to, at, flow}]、caption |
| iconwall | **动态图标墙**（2×3） | items[{lottie, label, at}] |
| dataviz | **数字滚动 + 柱状图生长 + 折线绘制** | count{label, to, prefix, suffix, sub}、bars{items}、line{values, labels}、note（写「示例数据」或数据出处） |
| map | **点阵世界地图 + 飞线 + 脉冲标点**（不画国界） | arcs[{from:[经,纬], to, at, color}]、pins[{ll, label, at}]、cam（推近）、note |
| recap | 收尾导图 | center、branches[{emoji, text, at}] |
| outro | 下一节预告 + 开源素材鸣谢 | next、credits（每行一条，别太长）、thanks |

## 节奏建议
- 每节至少用上：1 个 kinetic（金句）、1 个 pan 或 cam（镜头动起来）、2–4 条 tips（小人说话）、截图圈注若干。
- 有数字的课（额度、价格、效率对比）用 dataviz；讲地域 / 流程流转用 map。
- 自检：`python3 scripts/check_scenes.py lessons/NN`，再 `make_lesson.py … build` 看接触表。
