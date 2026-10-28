# 铜版博物 · COPPERPLATE

> 家族：图解与设计　|　档位：增强档 · 每段约 2 张生图（mj-v8.2，4 积分/张）　|　风格图：`still.jpg`　|　样片源码：`_samples/styles7_film.js → copper()`

**一句话**：45° 排线把灰度铜版一道道刻出来，淡彩晚一拍渗进去，左页铜版体图注逐条出现，高潮翻到标本页并编号。

| 项 | 写法 |
|---|---|
| 导演意图 | 18 世纪百科全书铜版图谱：先刻线、后上色，用编号和图注讲清楚每个部件。 |
| 材质 / 画法 | 增强档：2 张 mj-v8.2（图版 + 标本页，4 积分/张）。代码：离屏灰度版（ctx.filter grayscale + contrast）→ 440 道 45° 排线累积 clip 显影 → 原彩图 alpha 渗入；翻页 = 第二张从右侧推入带阴影；编号圆圈 + 左页图例。 |
| 配色逻辑 | 旧纸 #EFE6D2 · 墨 #3A2E22 · 标题红 #7A1E14 · 淡彩跟着原图 |
| 字体 | 宋体（图注、PL. / Fig. 编号斜体）+ Geist 字距 6 的 PL. 标号 |
| 动态 | 排线 1.35 秒从左下往右上扫完；1.5 秒后彩色 0.9 秒渗入；图注逐条上浮；翻页 0.45 秒；编号圆圈 1.6 → 1 落下。 |
| 镜头语法 | 锁定（整页）。 |
| 声音 | 刻刀划铜、翻书页；巴洛克羽管键琴。 |
| 标志镜头 | 灰色铜版被一道道 45° 排线刻出来，几秒后淡彩慢慢渗进去。 |

## 能改到什么程度（改成「我的风格」时用）
- **放心改**：换图版内容、换图注字段
- **一改就变味**：提示词不写 no text（MJ 会自己写伪拉丁文）
- **不能改**：一开始就是全彩（失去刻线 → 上色的过程）

## 搭配
- 适合母版：一条主线 D、猜谜概念 A
- 不适合：快节奏热点、社会新闻
- 增强档 Renoise 前缀：`antique copperplate engraving plate from an 18th-century encyclopedia, fine cross-hatching and stipple, hand-colored with faded watercolor washes, thin double border frame, aged cream paper with foxing, empty paper on the left third, no text, no letters, no numbers, no labels`
