# 03 · 视觉系统

每期选一个，写在 film.js 的 `const TM = TH.xxx`，并把对应的画风前缀抄进 assets.json 的 `style_prefix`。

| 系统 | 对标 | 适合 | 底色 / 强调色 | Renoise 画风前缀（英文写给模型） |
|---|---|---|---|---|
| `starfield` 星空光点 | 电子智人「××之学」 | 抽象概念、信息、数学、宇宙（母版 A） | 深蓝黑 / 金色 #f2c46d | `Cinematic dark night scene, deep navy and black, a single warm golden light source, fine film grain, minimal, vast negative space, no text` |
| `gufeng` 古风矢量 | Iwanau「如果你活在古代」 | 历史两难（母版 B） | 夜色赭黑 / 朱红 #d9472b + 金 | `Flat vector illustration, Chinese Tang dynasty, simple geometric characters without facial detail, red palace walls and lanterns, muted ink-paper texture, cinematic wide shot, no text` |
| `darkgold` 暗金线描 | 墨有意思、FredTao | 痛点原理、一条主线（母版 C / D） | 炭黑 / 琥珀 #f0b44c | `Minimal line-art illustration, glowing amber lines on charcoal black, warm rim light, editorial, lots of empty space, no text` |
| `paper` 水墨纸本 | opus家族史 家谱段 | 文化、文学、家族史、技术史收尾（母版 D / F） | 米白纸 / 朱砂 #b23a2e | `Chinese ink wash painting on warm rice paper, sparse composition, soft grey washes, a single vermilion accent, no text, no seal` |
| `pixel` 像素 | 考蛙蛙、熊猫师兄 | 闯关、方法论（母版 E） | 深靛 / 亮黄 #ffd23f | `16-bit pixel art, side view game scene, bold limited palette, crisp pixels, no text, no UI` |

## 已验证样片（2026-10-27）

5 套都已用代码渲染过同一段开场：`~/Desktop/vibe-knowledge/examples/vk/lessons/styles/film.js`（每套一个绘制函数：gufeng 用 01/scenes_base.js 分层剪影；starfield 画布星尘 + 金色光点画线 + 宋体细字；darkgold 琥珀色 SVG 描边逐笔画出 + 电量条；paper 宣纸渐变 + feGaussianBlur 晕染远山 + feTurbulence 毛笔边 + 宋体竖排 + 朱砂印；pixel 240×135 画布放大 8 倍 image-rendering:pixelated）。新一期选了某套风格，先从这里拷对应函数当起点。
成片：`~/Desktop/Vibe知识大赏_视频/styles_风格样片集.mp4`，对比图同目录。
注意：自定义 timings 的拍号必须是 `B` + 数字（引擎只认 B\d+），否则页面报「时间写法不对」。

## 时代拼贴（母版 D 专用）

opus家族史的做法：每个时代一种画风，但统一「暖色电影光 + 细颗粒 + 16:9 宽画幅」。示例：
- 史前：`cave painting on rough rock wall, ochre handprints, torch light`
- 古希腊：`ancient bronze mechanism under the Aegean sea, god rays, particles`
- 伊斯兰黄金时代：`Persian miniature painting style, House of Wisdom library, scholars`
- 中国古代：`Chinese ink wash landscape, misty mountains`
- 工业革命：`19th century Jacquard loom, warm workshop light, oil painting`
- 20 世纪：`1950s Bell Labs, mid-century modern collage, Bauhaus shapes`
- 当代：`warm laptop glow in a dark room, cinematic shallow depth of field`

## 字体与版式

- 中文 NotoSC（900 关键词 / 700 小标题 / 500 正文），数字 Geist，代码 GeistMono（cine 自带）。
- 关键词居中或左对齐于 x=110；章节签固定左上（110, 70）；AI 角标固定右上。
- 竖排古文用 vquote（纸底），放右侧 1/4。
