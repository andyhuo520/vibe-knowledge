/**
 * 动效图元（挂在手绘层 SketchLayer 里用，item.k 是下面这些名字）。全部只依赖 t，逐帧渲染同一时刻永远同一画面。
 *
 *   {k:"lottie",  data, x,y,w,h, at, loop, speed, until}     Lottie 动画（canvas 渲染：实测 SVG 渲染同一帧会抖，canvas 稳定）
 *   {k:"count",   x,y, from,to, at, dur, prefix,suffix, digits, size, color, anchor}   数字滚动
 *   {k:"bars",    x,y,w,h, items:[{label,value,color,at}], max, unit, at}            柱状图生长（x,y 为图表左上角）
 *   {k:"line",    x,y,w,h, values, labels, at, dur, color, unit}                     折线一笔画出 + 面积淡入 + 末端脉冲点
 *   {k:"dotmap",  x,y,w,h, dots, at, arcs:[{from,to,at,dur,color}], pins:[{ll,label,at,color}]}  点阵地图 + 飞线 + 脉冲标点
 *   {k:"kinetic", x,y, text, size, weight, at, per, color, accent, anchor}           大字逐字弹出（*词* 用强调色）
 */
import lottie from "../assets/vendor/lottie_canvas.min.js";
import { h, s, setStyle, setAttr } from "../runtime/dom.js";
import { step, UI } from "../runtime/spring.js";
import { clamp01, cubicInOut } from "../runtime/ease.js";
import { ico, drawIcon } from "../runtime/iconify.js";
import * as X6 from "../assets/vendor/x6.min.js";
const TONE_BG = { blue: "blue", coral: "peach", yellow: "yellow", green: "mint", teal: "mint", purple: "purple", pink: "pink", red: "pink" };

const easeOut = (p) => 1 - Math.pow(1 - clamp01(p), 3);
const fmt = (v, digits = 0) => v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const until = (t, it) => (it.until != null ? 1 - clamp01((t - it.until) / 0.3) : 1);

export const MOTION = {
  lottie(el, it, i, E) {
    const box = h("div", { class: "it", style: { left: `${it.x - it.w / 2}px`, top: `${it.y - it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px` } });
    el.append(box);
    // lottie-web 会改动传入的数据，每个实例各拷一份
    const a = lottie.loadAnimation({ container: box, renderer: "canvas", loop: false, autoplay: false, animationData: JSON.parse(JSON.stringify(it.data)),
      rendererSettings: { preserveAspectRatio: "xMidYMid meet", clearCanvas: true } });
    const d = it.data, n = d.op - d.ip, fr = d.fr * (it.speed ?? 1);
    const p = E.pop(box, it, 7 + i * 13, it.silent ? [] : [{ t: it.at, name: "pop", gain: -23 }], E.K.name === "notion" ? 0.7 : 0.55);
    let last = -1;
    return {
      sfx: p.sfx,
      render(t) {
        p.render(t);
        const local = Math.max(0, t - it.at - (it.delay ?? 0)) * fr;
        const f = it.loop === false ? Math.min(n - 1, local) : local % n;
        const q = Math.round(f * 2) / 2;
        if (q !== last) { a.goToAndStop(d.ip + q, true); last = q; }
      },
    };
  },
  /** 开源线条图标（IconPark / Lucide / Tabler，Iconify 格式）：一笔笔描出来，填色随后淡入，画完轻轻晃一下 */
  icon(el, it, i, E) {
    const box = h("div", { class: "it", style: { left: `${it.x - it.w / 2}px`, top: `${it.y - it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px` } });
    const svg = ico(it.name, it.w, { draw: true, stroke: it.stroke ?? null });
    // 多色 IconPark 换成当前皮肤的颜色：描边正文色、主填充强调色、内描边白、内填充浅色
    const acc = E.COLORS[it.tone ?? "blue"] ?? it.tone ?? E.COLORS.blue;
    for (const [k, v] of Object.entries({ "--ic-s": E.COLORS.ink, "--ic-f": acc, "--ic-i": "#fff", "--ic-if": `${acc}33` })) svg.style.setProperty(k, v);
    svg.style.color = it.color ?? E.COLORS.ink;
    box.append(svg); el.append(box);
    const p = E.pop(box, it, 13 + i, it.silent ? [] : [{ t: it.at, name: "tap", gain: -25 }], 0.9);
    const dur = it.dur ?? 0.9, seed = 3 + i * 7;
    return {
      sfx: p.sfx,
      render(t) {
        p.render(t);
        drawIcon(svg, (t - it.at) / dur);
        const idle = t > it.at + dur ? Math.sin((t - it.at - dur) * 2 * Math.PI * 0.45 + seed) * (it.wiggle ?? 3) : 0;
        svg.style.transform = `rotate(${idle.toFixed(2)}deg)`;
      },
    };
  },
  /** 插画（内嵌 SVG，如 IconPark 插画库）：轮廓先一笔笔描出来，色块随后淡入；画完轻轻浮动 */
  illus(el, it, i, E) {
    const box = h("div", { class: "it", style: { left: `${it.x - it.w / 2}px`, top: `${it.y - it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px` } });
    box.innerHTML = it.svg;
    const svg = box.querySelector("svg");
    svg.setAttribute("width", it.w); svg.setAttribute("height", it.h); svg.style.overflow = "visible";
    const shapes = [...svg.querySelectorAll("path,circle,rect,line,polyline,polygon,ellipse")];
    const stroked = shapes.filter((n) => n.getAttribute("stroke") && n.getAttribute("stroke") !== "none");
    for (const n of stroked) { n.setAttribute("pathLength", "1"); n.setAttribute("stroke-dasharray", "1 1"); n.setAttribute("stroke-dashoffset", "1"); }
    el.append(box);
    const p = E.pop(box, it, 17 + i, [{ t: it.at, name: "swish-1", gain: -24 }], 0.94);
    const dur = it.dur ?? 1.6, seed = 5 + i;
    let last = -1;
    return {
      sfx: p.sfx,
      render(t) {
        p.render(t);
        const q = clamp01((t - it.at) / dur);
        if (q !== last) {
          // 线条错开着画（按出现顺序分批），前 70% 画完；填色在后 60% 淡入
          const n = stroked.length;
          stroked.forEach((el2, k) => { const k0 = (k / Math.max(1, n)) * 0.35; el2.setAttribute("stroke-dashoffset", (1 - clamp01((q - k0) / 0.35)).toFixed(4)); });
          const f = clamp01((q - 0.4) / 0.6).toFixed(3);
          for (const el2 of shapes) el2.style.fillOpacity = f;
          last = q;
        }
        box.style.translate = `0 ${t > it.at + dur ? (Math.sin((t - it.at) * 2 * Math.PI * 0.25 + seed) * 5).toFixed(2) : 0}px`;
      },
    };
  },
  // 节点写了 tone 就用同色系便签底，颜色和图标一致（不写则按序轮换）
  /** 流程 / 架构图：AntV X6（MIT）排好节点和直角圆弧连线，逐帧驱动：节点弹出、连线一笔画出、画完后虚线流动 */
  diagram(el, it, i, E) {
    const box = h("div", { class: "it", style: { left: `${it.x}px`, top: `${it.y}px`, width: `${it.w}px`, height: `${it.h}px` } });
    el.append(box);
    const g = new X6.Graph({ container: box, width: it.w, height: it.h, async: false, interacting: false, grid: false, background: false, autoResize: false });
    const nw = it.nodeW ?? 330, nh = it.nodeH ?? 116;
    const nodes = it.nodes.map((n, k) => {
      const tone = E.COLORS[n.tone] ?? E.COLORS.blue;
      const cell = g.addNode({ id: n.id, x: n.x - nw / 2, y: n.y - nh / 2, width: nw, height: nh, label: n.label,
        attrs: { body: { fill: E.NOTES[n.bg ?? TONE_BG[n.tone] ?? ["blue", "yellow", "mint", "pink", "purple", "peach"][k % 6]] ?? "#fff", stroke: n.tone && !n.bg ? `${tone}66` : "rgba(55,53,47,.18)", strokeWidth: 1.5, rx: 14, ry: 14 },
          label: { fontSize: n.size ?? 38, fontWeight: 700, fill: E.COLORS.ink, fontFamily: E.K.font, refX: n.icon ? 0.6 : 0.5 } } });
      let icon = null;
      if (n.icon) {
        icon = ico(n.icon, 64, { draw: true });
        for (const [kk, v] of Object.entries({ "--ic-s": E.COLORS.ink, "--ic-f": tone, "--ic-i": "#fff", "--ic-if": `${tone}33` })) icon.style.setProperty(kk, v);
        Object.assign(icon.style, { position: "absolute", left: `${n.x - nw / 2 + 26}px`, top: `${n.y - 32}px` });
        box.append(icon);
      }
      return { n, cell, view: g.findViewByCell(cell).container, icon };
    });
    const edges = (it.edges ?? []).map((e, k) => {
      const col = E.COLORS[e.color] ?? "#C9C7C1";
      const cell = g.addEdge({ source: e.from, target: e.to, router: { name: e.router ?? "manhattan", args: { padding: 18 } }, connector: { name: "rounded", args: { radius: 16 } },
        attrs: { line: { stroke: col, strokeWidth: 4, targetMarker: { name: "block", width: 14, height: 11 } } }, labels: e.label ? [{ attrs: { label: { text: e.label, fontSize: 24, fill: E.COLORS.gray, fontFamily: E.K.font }, body: { fill: "#fff", stroke: "none" } } }] : [] });
      const view = g.findViewByCell(cell).container;
      const line = [...view.querySelectorAll("path")].find((p2) => p2.getAttribute("stroke") === col) ?? view.querySelector("path:last-of-type");
      line.setAttribute("pathLength", "1"); line.setAttribute("stroke-dasharray", "1 1"); line.setAttribute("stroke-dashoffset", "1");
      // 流动虚线：同一条路径再叠一层
      const flow = line.cloneNode(); flow.removeAttribute("marker-end"); flow.removeAttribute("marker-start");
      flow.setAttribute("stroke", E.COLORS[e.flowColor ?? "coral"] ?? E.COLORS.coral); flow.setAttribute("stroke-width", "5"); flow.setAttribute("stroke-linecap", "round");
      flow.setAttribute("pathLength", "100"); flow.setAttribute("stroke-dasharray", "7 11"); flow.setAttribute("opacity", "0");
      line.parentNode.insertBefore(flow, line.nextSibling);
      const marks = [...view.querySelectorAll("path")].filter((p2) => p2 !== line && p2 !== flow && p2.getAttribute("fill") && p2.getAttribute("fill") !== "none");
      return { e, view, line, flow, marks };
    });
    return {
      sfx: [{ t: it.at, name: "swish-2", gain: -24 }],
      render(t) {
        for (const q of nodes) {
          const a = step(t - q.n.at, UI);
          q.view.style.opacity = clamp01((t - q.n.at) / 0.2).toFixed(3);
          q.view.style.transformBox = "fill-box"; q.view.style.transformOrigin = "center";
          q.view.style.scale = (0.85 + 0.15 * a).toFixed(4);
          if (q.icon) { q.icon.style.opacity = q.view.style.opacity; drawIcon(q.icon, (t - q.n.at - 0.1) / 0.8); }
        }
        for (const q of edges) {
          const p2 = cubicInOut(clamp01((t - q.e.at) / (q.e.dur ?? 0.7)));
          q.view.style.opacity = t >= q.e.at ? "1" : "0";
          q.line.setAttribute("stroke-dashoffset", (1 - p2).toFixed(4));
          for (const m of q.marks) m.style.opacity = p2 > 0.96 ? "1" : "0";
          const fl = q.e.flow !== false && t > q.e.at + (q.e.dur ?? 0.7);
          q.flow.setAttribute("opacity", fl ? "1" : "0");
          if (fl) q.flow.setAttribute("stroke-dashoffset", (-(t - q.e.at) * 18).toFixed(2));
        }
      },
    };
  },
  /** 录屏回放：一串帧图按 fps 切换（GIF 拆出来的），外框同截图 */
  flip(el, it, i, E) {
    const plain = E.K.photo === "plain", [px, py] = E.K.pad;
    const box = h("div", { class: `it ${plain ? "pl" : "ph"}`, style: { left: `${it.x - it.w / 2}px`, top: `${it.y - it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px` } });
    const win = h("div", { class: "win" });
    const [c0, c1, c2, c3] = it.crop ?? [0, 0, 1, 1];
    const iw = (it.w - px) / (c2 - c0), ih = (it.h - py) / (c3 - c1);
    const uniq = [...new Set(it.srcs)], nodes = {};
    for (const src of uniq) { const im = h("img", { src, style: { width: `${iw}px`, height: `${ih}px`, left: `${-c0 * iw}px`, top: `${-c1 * ih}px`, visibility: "hidden" } }); win.append(im); nodes[src] = im; }
    box.append(win);
    el.append(box);
    const p = E.pop(box, it, 11 + i, [{ t: it.at, name: "tap", gain: -24 }], 0.96);
    let shown = null;
    return {
      sfx: p.sfx,
      render(t) {
        p.render(t);
        const n = it.srcs.length, k = Math.floor(Math.max(0, t - it.at - (it.delay ?? 0)) * (it.fps ?? 8));
        const src = it.srcs[it.loop ? k % n : Math.min(n - 1, k)];
        if (src !== shown) { if (shown) nodes[shown].style.visibility = "hidden"; nodes[src].style.visibility = "visible"; shown = src; }
      },
    };
  },
  count(el, it, i, E) {
    const box = h("div", { class: "it", style: { font: `700 ${it.size ?? 120}px/1 ${E.K.font}`, color: it.color ?? E.COLORS.ink, left: `${it.x}px`, top: `${it.y}px`,
      fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", letterSpacing: "-.01em" } });
    const [ax, ay] = { tl: [0, 0], tc: [-50, 0], c: [-50, -50], ml: [0, -50], tr: [-100, 0] }[it.anchor ?? "tl"];
    box.style.transform = `translate(${ax}%, ${ay}%)`;
    el.append(box);
    let last = "";
    return {
      render(t) {
        const p = easeOut((t - it.at) / (it.dur ?? 1.6));
        const v = (it.from ?? 0) + (it.to - (it.from ?? 0)) * p;
        const txt = `${it.prefix ?? ""}${fmt(v, it.digits ?? 0)}${it.suffix ?? ""}`;
        if (txt !== last) { box.textContent = txt; last = txt; }
        setStyle(box, "opacity", (clamp01((t - it.at) / 0.25) * until(t, it)).toFixed(3));
      },
    };
  },
  bars(el, it, i, E) {
    const items = it.items, n = items.length, gap = it.gap ?? 28, bw = (it.w - gap * (n - 1)) / n, max = it.max ?? Math.max(...items.map((b) => b.value)) * 1.1;
    const root = h("div", { class: "it", style: { left: `${it.x}px`, top: `${it.y}px`, width: `${it.w}px`, height: `${it.h}px` } });
    root.append(h("div", { style: { position: "absolute", left: "-10px", right: "-10px", bottom: "0", height: "2px", background: "rgba(55,53,47,.16)" } }));
    const bars = items.map((b, k) => {
      const col = E.COLORS[b.color] ?? b.color ?? E.COLORS.blue;
      const bar = h("div", { style: { position: "absolute", left: `${k * (bw + gap)}px`, bottom: "0", width: `${bw}px`, height: "0px", background: col, borderRadius: "8px 8px 2px 2px" } });
      const val = h("div", { style: { position: "absolute", left: `${k * (bw + gap)}px`, width: `${bw}px`, textAlign: "center", font: `700 34px/1 ${E.K.font}`, color: E.COLORS.ink, fontVariantNumeric: "tabular-nums" } });
      const lab = h("div", { text: b.label, style: { position: "absolute", left: `${k * (bw + gap) - 20}px`, width: `${bw + 40}px`, top: `${it.h + 16}px`, textAlign: "center", font: `500 28px/1.2 ${E.K.font}`, color: E.COLORS.gray } });
      root.append(bar, val, lab);
      return { b, bar, val, lab, at: b.at ?? it.at + k * 0.18 };
    });
    el.append(root);
    return {
      sfx: [{ t: it.at, name: "swish-2", gain: -24 }],
      render(t) {
        setStyle(root, "opacity", (clamp01((t - it.at + 0.2) / 0.3) * until(t, it)).toFixed(3));
        for (const q of bars) {
          const g = step(t - q.at, { w: 2 * Math.PI * 1.4, z: 0.78 });
          const hh = (q.b.value / max) * it.h * g;
          setStyle(q.bar, "height", `${Math.max(0, hh).toFixed(1)}px`);
          setStyle(q.val, "bottom", `${(Math.max(0, hh) + 12).toFixed(1)}px`);
          q.val.textContent = `${fmt(q.b.value * clamp01(g), it.digits ?? 0)}${it.unit ?? ""}`;
          setStyle(q.val, "opacity", clamp01((t - q.at) / 0.3).toFixed(3));
          setStyle(q.lab, "opacity", clamp01((t - q.at + 0.2) / 0.3).toFixed(3));
        }
      },
    };
  },
  line(el, it, i, E) {
    const v = it.values, n = v.length, lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * 0.15 || 1;
    const X = (k) => (k / (n - 1)) * it.w, Y = (val) => it.h - ((val - lo + pad) / (hi - lo + 2 * pad)) * it.h;
    const pts = v.map((val, k) => [X(k), Y(val)]);
    // Catmull-Rom → 三次贝塞尔，平滑曲线
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let k = 0; k < n - 1; k++) {
      const p0 = pts[k - 1] ?? pts[k], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2] ?? p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    const col = E.COLORS[it.color] ?? it.color ?? E.COLORS.coral;
    const gid = `lg${i}${Math.round(it.x)}`;
    const svg = s("svg", { width: it.w + 40, height: it.h + 60, viewBox: `-20 -20 ${it.w + 40} ${it.h + 60}`, style: `position:absolute;left:${it.x - 20}px;top:${it.y - 20}px;overflow:visible` });
    const defs = s("defs");
    const lg = s("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    lg.append(s("stop", { offset: "0", "stop-color": col, "stop-opacity": 0.28 }), s("stop", { offset: "1", "stop-color": col, "stop-opacity": 0 }));
    defs.append(lg);
    svg.append(defs);
    for (let g = 1; g <= 3; g++) svg.append(s("line", { x1: 0, x2: it.w, y1: (it.h * g) / 4, y2: (it.h * g) / 4, stroke: "rgba(55,53,47,.08)", "stroke-width": 1.5 }));
    const area = s("path", { d: `${d} L${it.w},${it.h} L0,${it.h} Z`, fill: `url(#${gid})`, opacity: 0 });
    const path = s("path", { d, fill: "none", stroke: col, "stroke-width": 6, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 });
    const ring = s("circle", { r: 10, fill: "none", stroke: col, "stroke-width": 3, opacity: 0 });
    const dot = s("circle", { r: 9, fill: col, opacity: 0 });
    svg.append(area, path, ring, dot);
    (it.labels ?? []).forEach((lb, k) => { if (lb) { const tx = s("text", { x: X(k), y: it.h + 40, "text-anchor": "middle", fill: E.COLORS.gray, style: `font:500 26px ${E.K.font}` }); tx.textContent = lb; svg.append(tx); } });
    el.append(svg);
    const dur = it.dur ?? 1.8;
    return {
      sfx: [{ t: it.at, name: "swish-1", gain: -24 }],
      render(t) {
        const p = cubicInOut(clamp01((t - it.at) / dur));
        const g = until(t, it);
        setStyle(svg, "opacity", (clamp01((t - it.at + 0.3) / 0.3) * g).toFixed(3));
        setAttr(path, "stroke-dashoffset", (1 - p).toFixed(4));
        setAttr(area, "opacity", clamp01((t - it.at - dur * 0.7) / 0.6).toFixed(3));
        // 末端点跟着线头走，画完后脉冲
        const L = path.getTotalLength(), pt = path.getPointAtLength(L * p);
        setAttr(dot, "cx", pt.x.toFixed(1)); setAttr(dot, "cy", pt.y.toFixed(1)); setAttr(dot, "opacity", t >= it.at ? 1 : 0);
        const ph = ((t - it.at - dur) % 1.4) / 1.4;
        setAttr(ring, "cx", pt.x.toFixed(1)); setAttr(ring, "cy", pt.y.toFixed(1));
        setAttr(ring, "r", (10 + ph * 26).toFixed(1)); setAttr(ring, "opacity", t > it.at + dur ? (1 - ph).toFixed(3) : 0);
      },
    };
  },
  dotmap(el, it, i, E) {
    const lon0 = -180, lon1 = 180, lat0 = 76, lat1 = -56;
    const P = ([lon, lat]) => [it.x + ((lon - lon0) / (lon1 - lon0)) * it.w, it.y + ((lat0 - lat) / (lat0 - lat1)) * it.h];
    const svg = s("svg", { class: "ink", viewBox: "-960 -540 1920 1080" });
    // 点阵按经度分 24 条带：进场时从西往东扫亮
    const bands = Array.from({ length: 24 }, () => s("g", { opacity: 0 }));
    const r = Math.max(1.6, (it.w / 225) * 0.36);
    for (const ll of it.dots) {
      const [x, y] = P(ll), b = Math.min(23, Math.floor(((ll[0] - lon0) / 360) * 24));
      bands[b].append(s("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(2), fill: it.dotColor ?? "#C9C7C1" }));
    }
    bands.forEach((g) => svg.append(g));
    const arcs = (it.arcs ?? []).map((a, k) => {
      const [x0, y0] = P(a.from), [x1, y1] = P(a.to), len = Math.hypot(x1 - x0, y1 - y0);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - len * 0.35;
      const col = E.COLORS[a.color] ?? a.color ?? E.COLORS.coral;
      const path = s("path", { d: `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`, fill: "none", stroke: col, "stroke-width": 3.5, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1, opacity: 0.9 });
      const comet = s("circle", { r: 7, fill: col, opacity: 0 });
      const src = s("circle", { cx: x0, cy: y0, r: 6, fill: col, opacity: 0 });
      svg.append(path, src, comet);
      return { a, path, comet, src, k };
    });
    const pins = (it.pins ?? []).map((p, k) => {
      const [x, y] = P(p.ll), col = E.COLORS[p.color] ?? p.color ?? E.COLORS.red;
      const ring = s("circle", { cx: x, cy: y, r: 10, fill: "none", stroke: col, "stroke-width": 3, opacity: 0 });
      const dot = s("circle", { cx: x, cy: y, r: 10, fill: col, opacity: 0 });
      svg.append(ring, dot);
      let lab = null;
      if (p.label) {
        lab = h("div", { class: "it chip", text: p.label, style: { left: `${x + 18}px`, top: `${y - 18}px`, font: `600 26px/1.1 ${E.K.font}`, padding: "7px 12px", borderRadius: "6px",
          color: col, background: "#fff", border: "1px solid rgba(55,53,47,.14)", boxShadow: "0 4px 12px rgba(15,15,15,.08)", transform: "translateY(-50%)", whiteSpace: "nowrap" } });
      }
      return { p, ring, dot, lab };
    });
    el.append(svg);
    for (const q of pins) if (q.lab) el.append(q.lab);
    return {
      sfx: arcs.map((q) => ({ t: q.a.at, name: "swish-3", gain: -26 })),
      render(t) {
        const g = until(t, it);
        bands.forEach((b, k) => setAttr(b, "opacity", (clamp01((t - it.at - k * 0.035) / 0.35) * g).toFixed(3)));
        for (const q of arcs) {
          const dur = q.a.dur ?? 1.4, p = cubicInOut(clamp01((t - q.a.at) / dur));
          setAttr(q.path, "stroke-dashoffset", (1 - p).toFixed(4));
          setAttr(q.src, "opacity", (t >= q.a.at ? g : 0).toFixed(3));
          // 画完后，一颗亮点沿线循环跑（像货物在运）
          const loop = t > q.a.at + dur ? ((t - q.a.at - dur) % 2.2) / 2.2 : p;
          const L = q.path.getTotalLength(), pt = q.path.getPointAtLength(L * loop);
          setAttr(q.comet, "cx", pt.x.toFixed(1)); setAttr(q.comet, "cy", pt.y.toFixed(1));
          setAttr(q.comet, "opacity", (t >= q.a.at ? g : 0).toFixed(3));
        }
        for (const q of pins) {
          const a = step(t - q.p.at, UI);
          setAttr(q.dot, "r", (10 * a).toFixed(2)); setAttr(q.dot, "opacity", (t >= q.p.at ? g : 0).toFixed(3));
          const ph = ((t - q.p.at) % 1.6) / 1.6;
          setAttr(q.ring, "r", (10 + ph * 30).toFixed(1)); setAttr(q.ring, "opacity", (t >= q.p.at ? (1 - ph) * 0.8 * g : 0).toFixed(3));
          if (q.lab) setStyle(q.lab, "opacity", (clamp01((t - q.p.at - 0.3) / 0.3) * g).toFixed(3));
        }
      },
    };
  },
  kinetic(el, it, i, E) {
    const size = it.size ?? 120;
    const box = h("div", { class: "it", style: { left: `${it.x}px`, top: `${it.y}px`, font: `${it.weight ?? 800} ${size}px/1.15 ${E.K.font}`, color: it.color ?? E.COLORS.ink, whiteSpace: "nowrap", letterSpacing: "-.01em" } });
    const [ax, ay] = { tl: [0, 0], tc: [-50, 0], c: [-50, -50], ml: [0, -50] }[it.anchor ?? "c"];
    box.style.transform = `translate(${ax}%, ${ay}%)`;
    const chars = [];
    let hl = false;
    for (const ch of Array.from(it.text)) {
      if (ch === "*") { hl = !hl; continue; }
      const sp = h("span", { text: ch === " " ? " " : ch, style: { display: "inline-block", color: hl ? (E.COLORS[it.accent] ?? it.accent ?? E.COLORS.coral) : "inherit" } });
      box.append(sp);
      chars.push(sp);
    }
    el.append(box);
    const per = it.per ?? 0.05;
    return {
      sfx: [{ t: it.at, name: "whoosh", gain: -26 }],
      render(t) {
        const g = until(t, it);
        chars.forEach((sp, k) => {
          const t0 = it.at + k * per, a = step(t - t0, { w: 2 * Math.PI * 2.2, z: 0.62 });
          setStyle(sp, "opacity", (clamp01((t - t0) / 0.12) * g).toFixed(3));
          setStyle(sp, "transform", `translateY(${((1 - a) * size * 0.55).toFixed(1)}px) rotate(${((1 - a) * 12).toFixed(2)}deg) scale(${(0.6 + 0.4 * a).toFixed(3)})`);
        });
      },
    };
  },
};
