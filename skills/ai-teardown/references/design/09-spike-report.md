# 09 · 引擎 Spike 报告

## 做了什么

同一段 32 秒（前半「总图 → 推进到 Codex 内部 → Agent 循环」，后半「单形状流程速览」），同一份打包文件 `spike/build/app.js`（73 KB，含运行时、3 个原语、字幕、光标），挂到三个宿主：

| 宿主 | 入口 | 接入代码 |
|---|---|---|
| Hyperframes 0.6.119 | `spike/hf/index.html` | 约 40 行：监听 `hf-seek`；`__hfTimelinesBuilding` 就绪协议；一条只声明时长的空 GSAP 时间线 |
| Remotion 4.0.408 | `spike/remotion/src/Spike.tsx` | 约 60 行：`delayRender` 等字体与建舞台，`useLayoutEffect` 里 `seek(frame / fps)` |
| 互动课件 | `spike/lesson.html` | 不需要任何引擎：舞台直接在页面里渲染，`<audio>` 做主时钟 |

配音 edge-tts 云希（-10%），4 段共 32.1 秒；混音为旁白 + Mixkit「Hazy After Hours」（123 BPM，旁白时压低）+ 19 个音效，两遍 loudnorm 后 -14.4 LUFS。

## 结果

| 项 | Hyperframes | Remotion |
|---|---|---|
| 成片 | 964 帧 1080p30 + AAC，5.3 MB | 964 帧 1080p30 + AAC，5.4 MB |
| 渲染耗时（本机 10 核） | 55 秒（4 workers；约 35 秒是启动与就绪的固定开销，采集约 16 秒） | 24 秒（5 并发，含打包） |
| 两边画面 | 同一帧逐帧比较 SSIM 0.990–0.992、PSNR 42–44 dB（差异来自编码） | |
| 自带质检 | `lint`、`validate`（WCAG AA 对比度）、`inspect`（按时间轴采样查文字溢出、遮挡、重叠）；本段已调到 0 问题 | 没有同类工具 |
| 确定性 | 舞台层面：18 个时刻 × 4 种 seek 顺序，DOM 快照全部一致；像素噪声 ≤ 0.006% 的像素；`--docker` 可逐字节一致 | 同一份舞台，同左 |
| 中文字体 | 本地 `@font-face` 正常 | `staticFile` + `@font-face` 正常 |
| 许可 | Apache 2.0 | 3 人以内免费，超过需公司授权 |

按采集速度外推 4 分钟成片（7200 帧）：Hyperframes 约 2.5 分钟，Remotion 约 2 分钟，都可接受。

## 结论

1. **架构成立。** 原语写成引擎无关的纯时间函数后，两个引擎渲出同样的画面；互动课件连引擎都不需要。「一个源文件，两种交付」从口号变成了现成代码。
2. **主引擎维持 Hyperframes**：许可无负担，`inspect` / `validate` 直接当画面质检门，Studio 能给团队人工精修。短片它慢一些，主要是固定开销，长片差距收窄。
3. **Remotion 兼容轨零成本保留**：`Spike.tsx` 60 行即可出同样的片；需要复用 promo-video 的 React 组件，或 Hyperframes 出问题时切过去。
4. **迭代时两个都不用**：`spike/preview.html` + `scripts/stills.py` 秒级出关键帧接触表，改完再交给引擎出片。

## Spike 里踩到并已解决的坑

| 现象 | 原因 | 解决 |
|---|---|---|
| lint 报 `missing_timeline_registry` | Hyperframes 要求 `window.__timelines[id]` | 注册一条只声明时长的空 GSAP 时间线，画面仍由 `hf-seek` 驱动 |
| 异步建舞台时，前几帧可能空白 | 渲染器不知道要等 | 建舞台前设 `__hfTimelinesBuilding = true`，建好后置 false 并派发 `hf-timelines-built` |
| `inspect` 报大量文字溢出 | 镜头推进后，世界层文字出画是有意的 | 世界层加 `data-layout-allow-overflow`；画面内的裁切由我们自己的检查负责 |
| 「你」的标签与单形状内容重叠 | 形状盖在节点上，节点标签仍在 | 形状长出时节点 `open`（标签淡出），缩回时 `close` |
| 同一时刻不同 seek 顺序，循环箭头颜色不同 | SVG marker 用了 `context-stroke`，Chrome 缓存 marker 绘制 | 改为三种固定颜色的 marker 按状态切换 |
| 循环的步骤标签压在连线上 | 默认标签位置与连线同高 | 步骤标签支持 `lx/ly` 偏移，连线标签支持 `labelSide: below` |
| 响度 -15.3 LUFS | 单遍 loudnorm 不准 | 两遍 loudnorm，-14.4 LUFS |
| 课件「下一步」原地打转 | 落点被截到下一个点之前，下次又算回同一点 | 先给每个逐步点预算落点，再按落点找下一个 |

## 本段没验证、留给 M1 的

- Three.js 场景（Hyperframes 有 `three` 适配器，同样走 `hf-seek`，预期无障碍）
- 9:16 版本
- Lottie 资产（AE 导出）进原语
- 4 分钟整片的渲染时间与内存
