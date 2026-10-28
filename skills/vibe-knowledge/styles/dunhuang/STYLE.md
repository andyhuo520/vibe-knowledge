# 敦煌壁画 · DUNHUANG MURAL

> 家族：东方　|　档位：增强档 · 每段约 2 张生图（mj-v8.2，4 积分/张）　|　风格图：`still.jpg`　|　样片源码：`_samples/styles4_film.js → dunhuang()`

**一句话**：一层灰泥一块块剥落露出壁画，第二幅从另一侧剥出来，金箔字流光，榜题框。

| 项 | 写法 |
|---|---|
| 导演意图 | 考古式揭开：画面不是「出现」，是从墙皮下被发现的。 |
| 材质 / 画法 | 增强档：2 张 mj-v8.2 壁画（土红底、石绿、青金、金箔、龟裂剥落）。代码：离屏灰泥层（噪点纹理）+ 144 块不规则多边形按距离排序剥落（destination-out）+ 剥口描边。 |
| 配色逻辑 | 土红 #8E2F1E · 石绿 #2F6B5E · 青金 #2A4A8A · 灰泥 #E3CFAE · 金箔渐变 #7A5518 → #FFF1B8 |
| 字体 | 宋体 900 竖排；金箔字用流动的线性渐变 background-clip:text；数字放进深色「榜题」框 |
| 动态 | 灰泥从主体处向外剥 1.5 秒后整层淡出；高潮第二幅壁画按格从另一侧剥出 0.55 秒；金箔字流光循环。 |
| 镜头语法 | 缓慢推近 + 横移（Ken Burns 5%）。 |
| 声音 | 石块剥落、风沙、驼铃；古琴 / 琵琶。 |
| 标志镜头 | 灰泥碎块一片片掉下，露出城门和人群；「五十金」金箔字立在榜题框里。 |

## 能改到什么程度（改成「我的风格」时用）
- **放心改**：换壁画内容、换榜题色
- **一改就变味**：壁画太满不留灰泥区（字没处放）
- **不能改**：字用现代无衬线体

## 搭配
- 适合母版：一条主线 D、两难选择 B
- 不适合：现代科技、数据新闻
- 增强档 Renoise 前缀：`Dunhuang Mogao cave mural painting, earth-red ochre ground, malachite green and lapis lazuli blue mineral pigments, touches of gold leaf, flat frontal perspective, cracked and flaking plaster, faded fresco texture, plain empty wall on the left third`
