# 04 · 手绘引擎（Notion 皮肤）场景编排

适用 `"engine": "sketch"` 的系列（WorkBuddy 上手课那套）。编译器 `runtime/sketch.js`，图元 `primitives/sketch.js`、`primitives/motion.js`。下面先是系列里给助手用的规范原文（SCENES_GUIDE），再是补充：全部字段速查与已修过的版式规则。

---

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

---

## 补充 A · 文件头全部开关

| 字段 | 作用 |
|---|---|
| `n` | 课号（封面「第 N 节」）；导学等非数字课用 `eyebrow`/`props` 覆盖 |
| `skin` | `notion`（纯白、Geist+Noto 无衬线、Notion 文字色/底色、callout、面包屑、白闪转场）/ `paper`（手账纸、霞鹜文楷、胶带便利贴） |
| `skin: "cream"` | Notion 版式 + 奶油底 #FAF6EE + 香槟金强调（医美 / 高端品牌培训课；`SKINS.cream`，模板逻辑同 notion） |
| `presenter` 其他写法 | `"<前缀>"`：系列 assets/img 里有 `<前缀>-0/-blink/-talk/-talk-blink` 四帧（如 Renoise 生成的女讲师 `lady`），按字张嘴、眨眼、冒 tips；`"emoji:<名>"`：一个 Noto emoji 当讲解员 |
| `presenterSmooth` | 讲解员是插画（非像素）时写 true：平滑缩放、300px 大一号 |
| `presenter` | `hp`：像素小人 10 动作（talk wave point idea think stop check cheer thumbsup type，各 8 帧，talk 按字张嘴、帧 4 眨眼）；`host`：旧版单头像 |
| `sticker` | **新课默认 true**：贴纸风（见上）；老课不写 = 原来的卡片样式 |
| `speed` | 旁白变速，默认写 1.15 |
| `lang` | `en` 切英文界面文字与字幕断句 |
| `inlineCredits` | 默认关：插画下方不带出处小字，图标/插画库来源只进片尾 credits；`true` 才逐处标 |
| `shotCredit` | 截图出处前缀（英文版用） |
| `noCaptions` | 关字幕 |
| `videoOnly` | final 只出片：不做互动版、不改 series.json（导学、英文版用） |

## 补充 B · 模板字段速查（以编译器为准）

| 模板 | 字段 |
|---|---|
| cover | title, titleAt, eyebrow, eyebrowAt, question, questionAt, iconImg, illus, stickers, photo（notion/cream 也支持：右侧圆角大图 + 出处小字，photoW/photoX/photoY）, photoAt, props, coverBg |
| say | lines, illus, illusAt, illusSticker, emoji, emojiAt, underline, dy |
| stickers | title, items[{emoji, label, sub, at, rot, tick/cross（写时刻，不能写 true）}], caption, arrows, style（sticker / card）, w, h, y |
| quote | text, textAt, from, emoji, stamp, size, w, y, cps |
| shot | img 或 clip, clipDelay, loop, crop, label, marks[{kind, area, at, note, side, color}], rot, w, h, x, y |
| flow | nodes[{emoji, label, at, star}], back{from, to, label, at}, caption, gap, title, y |
| compare | left/right{title, emoji, at, items}, neutral, h, y |
| checklist | title, items[{emoji, label, sub, at}], numbered, cols, rowH, y |
| note | title, lines[{text, tag, tagColor, at}], mono, size, lh, w, x, y, cps, textAt |
| pause | q, a, revealAt, emoji |
| recap | center, branches[{emoji, text, at}]（最多 6 条） |
| outro | next, thanks, thanksAt, credits[] |
| kinetic | lines[{text, size, y, at, color, weight}], lottie[{name, x, y, size, at}] |
| iconwall | title, items[{lottie, label, at}], cols |
| dataviz | title, count{label, to, prefix, suffix, sub}, bars{items}, line{values, labels}, note |
| map | title, arcs, pins, cam, note |
| diagram | title, nodes[{id, label, icon, col, row, tone, bg, at}], edges[{from, to, at, label, color, flow}], caption, captionY, colGap, rowGap, nodeW, nodeH, h, y |
| pan | cards[{emoji, title, sub}], word, cam |
| 通用 | chapter, src, tips[{text, at, until, pose}], pose, cam[[t, x, y, z]], host |

## 补充 C · 版式规则（踩坑后定下的）

- **say**：第二行 96px 大字，长句会自动折行，下面的行按估算行数下移；仍建议第二行 ≤ 10 字。
- **diagram**：节点写了 `tone` 底色自动取同色系便签色（不用再写 `bg`）；标签太长图标会压字 → 标签写短或加大 `nodeW`；连线不能指定出线边，靠 col/row 摆位避免交叉（蛇形两行常用）；`caption` 默认 y=298，在出处小字上方。
- **recap**：中心椭圆随 `center` 文字长度自动加宽；第 5、6 条分支（正上/正下）从椭圆边出线；每条分支 ≤ 9 个字，否则折行。
- **stickers**：长英文名别放卡片标题（会折行），放 sub；5 张卡时每张约 300px 宽，标签 ≤ 5 个汉字。
- **quote**：自动折行会拆词，需要时手动 `\n`。
- **shot**：`note` 标签容易盖住原图文字，优先用小人 `tips` 说明；截图圈注 `area` 是原图比例 [x0,y0,x1,y1]，先看原图再估；圈注前用 `crop` 裁掉隐私区域。
- **dataviz**：`note` 在右下角会被小人挡，出处改写 `src`（左下）。
- **cam**：镜头推近会裁掉卡片，stickers 一排 4 张时别推；pan 就是专门的镜头摇卡片。
- 场景开头要尽快有东西出现（标题挂本拍第一个 cue），否则接触表上是空屏。
- 小人 tips 6–16 字，复述旁白要点，不替作者发表观点；安全提醒用 `pose: "stop"`。

## 补充 D · 贴纸组原语（`k: "group"`）

`primitives/sketch.js` 的 group：子元素坐标相对组中心，一起做「按上去」动画（from 放大倍数默认 1.3 → 1，spin 倾斜回正默认 8°，rot 最终角度）。
- `card: true` + `w/h/color`：白边贴纸卡（10px 白边、圆角 30、投影随落下收紧、落定后高光划过）。
- `filter: "diecut"` + `edge`：整组描一圈模切白边（8 方向白色 drop-shadow + 细描边 + 投影），用于插画、emoji。
- 其他模板想贴纸化：把原来的若干元素包进一个 group（坐标改成相对组中心）即可。目前 stickers、say/cover 插画已接；pan、recap、checklist 还是原样式。
