# 07 · 组件库 know.js（装在 <系列>/cine/engine/know.js）

全部组件：build 时建 DOM，render 里按绝对时间 t 调 `update`；不依赖上一帧。时间用旁白位置写：`T("B05")`、`T("B05.count")`、`T("B05@三百九十")`、`T("B05.end")`。

| 组件 | 用途 | 写法 |
|---|---|---|
| `TH.*` | 五套视觉系统色板 | `const TM = TH.gufeng` |
| `bg(ctx, TM, o)` | **每个镜头 render 第一行**：清 WebGL 层为主题底色，设泛光 / 颗粒 / 暗角 | `bg(ctx, TM, { grain: 0.03 })` |
| `layers` | **基础档主力**：Opus 手写 SVG / 本地图分远中近层，按景深视差推移 | `sc = layers(s, [{ svg: SKY, depth: 0.15 }, { svg: HALL, depth: 0.5 }, { svg: FG, depth: 1 }]); sc.update(t, t0, t1, { pan: [-80, 0], zoom: [1, 1.06] })` |
| `plate` | Renoise 配图：推拉摇移 + 淡入淡出 + 暗角 + AI 角标 | `p = plate(s, { src: A("img/a01.jpg") }); p.update(t, t0, t1, { from: [1.04,0,0], to: [1.14,-40,0] })` |
| `vclip` | Renoise 视频（clip2frames 拆帧后）逐帧画在画布上，字幕永远在上面 | `v = vclip(s, { dir: A("clips/v01"), n: 241 }); v.update(t, t0, t1, { rate: 1, loop: false })` |
| `keyword` | 画面关键词（≤8 字，超了控制台警告） | `k = keyword(s, "冗余＝铠甲", { y: 400, color: TM.accent }); k.update(t, at, out)` |
| `counter` | 数字滚动 | `c = counter(s, { label: "放回家的死囚", suffix: "人" }); c.update(t, [[t0,0],[t1,83],[t2,390]])` |
| `foot` / `foots` | 出处脚注（字幕下方 y=1044） | `f = foot(s); foots(f, t, [[a, b, "《资治通鉴》卷一九四"], …])` |
| `choice` | 结尾两难按钮 | `ch = choice(s, [["回","赌一把信任"],["不回","躲一辈子"]]); ch.update(t, at, { pick: 0, pickAt })` |
| `seriesCard` | 系列片头 | `seriesCard(s, { series: "如果你活在古代", ep: 1, title: "商鞅立木", theme: TM }).update(t, at, out)` |
| `vquote` | 竖排古文逐字显出（纸底） | `vquote(s, { text: "民怪之\n莫敢徙", src: "《史记·商君列传》" }).update(t, t0, t1, out)` |
| `trail` | 一条光轨依次点亮节点（母版 D） | `trail(s, { pts: [[200,700],…], labels: [...] }).update(t, t0, t1)` |
| `spread` | 从中心向四周撒点（地图扩散、传播） | `spread(s, { cx, cy, n: 390 }).update(t, t0, t1, { back: 0 })` |
| `bars` | 柱状对比（本福特 1–9） | `bars(s, { values, labels, fmt: v => v.toFixed(1)+"%" }).update(t, t0, t1, { hl: 0 })` |
| `chapter` | 左上章节签 | `chapter(s, { n: 1, cn: "猜", en: "THE GUESS", theme: TM }).update(t, at, out)` |
| `ask` | 大问题卡（开头 / 结尾） | `ask(s, "换你，你搬不搬？", { tag: "如果你活在古代" }).update(t, at, out)` |

| `marker` | 荧光笔扫过一段字或区域（视觉调查） | `marker(world, { x, y, w, h }).update(t, at)` |
| `ring` | 手绘红圈按笔顺画出 | `ring(world, { cx, cy, rx, ry }).update(t, at)` |
| `focus` | 把容器推近到某点并定格（关键帧） | `focus(world, t, [[t0, {x, y, s: 1}], [t1, {x, y, s: 1.5}]])` |
| `capNews` | 字幕新闻大标题，关键词压黄块 | `capNews(s, [["赏", 0], ["十金", 1]], { size: 150 }).update(t, at, out)` |
| `srcChip` | 数字旁滑入的来源标签 | `srcChip(s, "《史记·商君列传》", { x, y }).update(t, at, out)` |
| `lowerThird` | 新闻标题条（固定栏目） | `lowerThird(s, { tag: "VIBE 知识", title }).update(t, at, out)` |
| `stamp` | 印章盖下来（钩子落点、关键结论） | `stamp(s, "三其凌", { x: 960, y: 200, size: 130 }).update(t, at, out)` |
| `cutaway` | 线稿剖面图：AI 画不准的器物 / 结构用代码画，线条按序描出、色块弹出、标签淡入；画面标「代码示意」 | `cutaway(s, { x, y, w: 700, h: 600, lines: [{ d, color, width }], blocks: [{ x, y, w, h, fill, stroke }], labels: [["外 · 方鉴", 596, 110, GOLD]] }).update(t, at, out)` |
| `tokens` | 一排小方块依次弹出，可「化掉」只剩 keep 块（冰化了、钱花了） | `tokens(s, { x, y, n: 6, size: 80 }).update(t, at, meltAt, keep, out)` |

视觉调查的原文排版：每个字放进等宽格（`width: 44px`），划重点和画圈就能按「第几行第几个字」精确定位（见 styles/_samples/styles2_film.js）。

cine 自带的也都能用：`appear slam typeText codeCard quoteCard sourceTag recapMap`（ui.js），`Particles Clock Bars Showroom Liquid Tunnel`（scenes/）。粒子场景在 render 里自己画 WebGL，就不要再调 bg。

**资源路径**：`const A = (f) => new URL(\`./assets/${f}\`, import.meta.url).href`（页面用）；`const P = (f) => decodeURIComponent(new URL(...).pathname).slice(1)`（music 条目用相对系列目录的路径，new_film.py 已给 finish.py 打补丁）。

**录制同步**：plate / vclip 把未解码的图登记到 `window.__vk`；new_film.py 已给 record.py、stills.py 打补丁，每次 seek 后等解码完再截图，所以接触表和成片不会出现空白帧。
