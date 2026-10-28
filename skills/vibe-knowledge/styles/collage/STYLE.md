# 半调拼贴 · HALFTONE COLLAGE

> 家族：印刷与纸　|　档位：增强档 · 每段约 2 张生图（mj-v8.2，4 积分/张）　|　风格图：`still.jpg`　|　样片源码：`_samples/styles4_film.js → collage()`

**一句话**：生图拆成「底 + 主体」两层，主体纸片拍下来，胶带、纸条、半调大数字、红印章，整页推走换下一页。

| 项 | 写法 |
|---|---|
| 导演意图 | 解释性新闻的桌面拼贴：材料一张张拍上桌，每拍都有新纸片落下。 |
| 材质 / 画法 | 增强档：2 张 mj-v8.2 拼贴整图 → Vision 前景分割拆出主体层 → 背景补洞（青纸区用纯色 + 噪声，复杂区用 inpaint）。代码：撕边纸条（锯齿 clip-path）、胶带、半调网点大数字（background-clip:text）、印章。 |
| 配色逻辑 | 赭 #E9A85A · 红 #D63A2F · 青 #8F9D83 · 纸 #F4ECDD · 墨 #1D1A16 |
| 字体 | Geist 900 半调大数字 + NotoSC 900 纸条字 |
| 动态 | slap（1.18 → 1 + 旋转回正 0.22 秒）、slide（eOutQuint 0.3 秒）、胶带从屏外滑入；高潮整页 page-push 0.35 秒，新主体从下弹上来。 |
| 镜头语法 | 外层 3% 慢推；转场用整页推。 |
| 声音 | 纸片拍桌、胶带撕拉、印章；轻快打击乐。 |
| 标志镜头 | 城门纸片「啪」地拍下来、被胶带粘住；「10」是红色半调网点字。 |

## 能改到什么程度（改成「我的风格」时用）
- **放心改**：换底色纸、换胶带颜色
- **一改就变味**：在绿幕上重生主体（会和原图对不上）
- **不能改**：字幕和数字画进生图里

## 搭配
- 适合母版：痛点原理 C、两难选择 B、一条主线 D
- 不适合：纯抽象数学
- 增强档 Renoise 前缀：`editorial explainer paper collage, torn paper cutouts printed in halftone dots, masking tape strips, layered cutout drop shadows, flat muted background color, risograph grain, large plain flat area on the left third`
