# 02 · 场景契约与运行时

## 核心：舞台只认时间 t

```
          lesson.json + timings.json
                    │ 编译（compile）
                    ▼
   Stage ──► 场景[] ──► 原语.create(container, params, ctx) → instance
     │                      instance.render(localT, env)   纯函数
     │                      instance.beats                 逐步点
     │                      instance.hotspots(localT)      点图看出处
     ▼
  stage.seek(t)  ◄── Hyperframes：window 'hf-seek' 事件（逐帧）
                 ◄── Remotion：useCurrentFrame / fps（逐帧）
                 ◄── 互动课件：<audio>.currentTime、进度条、「下一步」
```

三个宿主都只调用 `stage.seek(t)`。Spike 实测：同一份打包文件（`spike/build/app.js`，73 KB）在三处跑出同样的画面，Hyperframes 与 Remotion 成片逐帧 SSIM ≥ 0.990。

## 原语接口

```js
export default {
  name: "Loop",
  create(root, params, ctx) {        // 只建 DOM，不做动画
    // ctx = { stage, id, at: {x, y, scale}, theme, aspect, css(id, text) }
    return {
      beats: [{ t, id, label }],      // 本地秒；课件的「逐步」与章节刻度用
      render(t, env) { … },           // 本地秒；env = { t, stage, cam, aspect, toScreen }
      hotspots(t) { return [{ el, facts: ["F012"], label }] },
      geometry?(t),                   // 可选：给镜头做 zoom-to-fit（Morph 有）
    };
  },
};
```

## 确定性规则（违反任何一条，逐帧渲染就会闪或错位）

1. 动画值只能是 `t` 的函数：`spring.js`（闭式弹簧，多次改目标 = 阶跃响应相加）或 `ease.js`。
2. 不用 CSS `transition` / `animation`（舞台的基础样式已全局禁用）、`setTimeout`、`requestAnimationFrame`、`Date.now()`、无种子的 `Math.random()`（用 `hash01(i, seed)`）。
3. 不在帧之间带状态：`render` 每次都把它负责的属性全部写一遍（`setStyle/setAttr/setText` 只在值变化时才写 DOM，便宜）。
4. **不给被镜头缩放的元素加 `will-change`**：文字会按缓存的位图放大而发糊。Spike 实测不加时 7.6 倍推进文字依然清晰。
5. **SVG marker 不用 `context-stroke`**：Chrome 会缓存 marker 的绘制，前后帧颜色串味。改为按状态切换几个固定颜色的 marker。
6. 字体用本地文件（`assets/fonts`），出片前 `document.fonts.load` 全部字重。
7. 容器内切换的文字必须有各自的进出窗口（`swap(t, tin, tout)`：0.18 秒模糊进、0.1 秒模糊出），新旧文字不重叠。

确定性验收分两层：**DOM 快照严格一致**（同一 t，不论从哪个方向 seek 过来）；**像素比对有容差**（Chrome 光栅化在模糊、换字的瞬间会有极少量噪声：Spike 实测 18 个时刻 × 4 种 seek 顺序，DOM 全部一致，像素差 ≤ 0.006% 的像素）。要逐字节一致，用 Hyperframes 的 `--docker` 渲染。

## 坐标与镜头

- **世界坐标**：原点 = 画面中心（镜头在 (0,0)、缩放 1 时）。场景用 `stage.add(prim, {x, y, scale})` 放进世界。
- **逐层放大**：下一层内容按 `scale`（如 0.16）放在上一层节点里面，镜头推进约 `1/scale` 倍就「钻进」节点。节点用 `open` / `close` 让出位置（标签和底色淡出、淡回）。
- **镜头**：`stage.camera([{t, x, y, z, cfg?}])`，缩放在对数空间里走弹簧，1× 推到 6× 速度感均匀。
- **屏幕层**：光标、字幕、角标不随镜头缩放；光标用世界坐标定位，每帧 `toScreen` 换算。

## 宿主适配

| 宿主 | 做法 | 注意 |
|---|---|---|
| Hyperframes | `window.addEventListener("hf-seek", e => stage.seek(e.detail.time))`；异步建舞台前设 `window.__hfTimelinesBuilding = true`，建好后置 false 并派发 `hf-timelines-built` | lint 要求 `window.__timelines[id]` 注册：注册一条只声明时长的空 GSAP 时间线；世界层带 `data-layout-allow-overflow`（镜头推拉出画是有意的） |
| Remotion | `useLayoutEffect` 里建一次舞台（`delayRender` 等字体），每帧 `stage.seek(frame / fps)` | 字体用 `staticFile` + `@font-face`；`@remotion/*` 版本与 `remotion` 一致 |
| 互动课件 | `<audio>` 是主时钟，播放时 `requestAnimationFrame` 读 `currentTime` → `seek` | rAF 只驱动交互播放，不参与出片 |

## 16:9 与 9:16

`FRAMES` 给出两种画幅的尺寸与安全区（字幕带顶线：16:9 为 890，9:16 为 1500）。原语在 `create` 时读 `ctx.aspect`，自带两套布局；9:16 不是裁切。V1 先交 16:9，9:16 在 M2 补齐（Morph 的竖版布局是已知缺口）。
