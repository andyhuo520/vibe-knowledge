/**
 * 手绘图元层（runtime/sketch.js 用）：一个场景 = 一张清单，清单里每一项是一样会在画面上「画出来 / 贴上去 / 写出来」的东西。
 * 线条用 rough.js（MIT）生成手绘路径，固定种子，同一时刻画面永远一样；render(t) 只依赖 t。
 *
 * 皮肤（useSkin）：
 *   paper   手账白板：米白方格纸、霞鹜文楷、3D 贴纸、便利贴 + 胶带 + 小角度、荧光笔、拍立得截图
 *   notion  Notion 极简：纯白、无衬线、扁平彩色 emoji、Notion 底色块（callout）、细边框、文字底色高亮、平放截图；线条只留一点手绘感
 *
 * items（坐标都是舞台坐标：原点在画面中心，x 向右、y 向下）
 *   {k:"ink",  shape, color, width, fill, fillStyle, roughness, at, dur, until, seed}      手绘线条，一笔笔画出来
 *        shape: {type:"rect",x,y,w,h} | {type:"ellipse",cx,cy,w,h} | {type:"line",x1,y1,x2,y2}
 *               | {type:"curve",pts} | {type:"arrow",pts,head} | {type:"wave",x,y,w} | {type:"check",x,y,s} | {type:"cross",x,y,s}
 *   {k:"note", x,y,w,h, color, rot, tape, at, until}                                       卡片 / 便利贴（中心坐标）
 *   {k:"box",  x,y,w,h, bg, radius, border, at, until}                                     纯色块（Notion 封面带、分隔线）
 *   {k:"text", x,y,w, text, size, weight, color, align, anchor, at, cps, hl, lh, font, rot} 字；*词* 画高亮；cps=0 整段淡入
 *   {k:"img",  src, x,y,w,h, at, rot, frame, crop, tape, bob, until, pop}                  贴纸 / 截图
 *   {k:"chip", x,y, text, color, bg, size, rot, at, anchor, stamp}                         标签 / 印章
 */
import rough from "../assets/vendor/rough.esm.js";
import { h, s, setStyle, setAttr } from "../runtime/dom.js";
import { step, UI } from "../runtime/spring.js";
import { clamp01, cubicInOut, typedCount } from "../runtime/ease.js";
import { MOTION } from "./motion.js";

export const HAND = `"LXGW WenKai","Kaiti SC",serif`;
const SANS = `"Geist","Noto Sans SC","PingFang SC",sans-serif`;

export const SKINS = {
  paper: {
    name: "paper", font: HAND, emoji: "emoji", rough: 1.25, rot: 1, photo: "polaroid", pad: [28, 32], tape: true,
    noteBorder: "rough", noteRadius: "3px 6px 4px 8px", noteShadow: "0 14px 30px rgba(60,45,20,.16),0 2px 4px rgba(60,45,20,.12)",
    hlSize: "46%", hlPos: "0 88%", chipRadius: "999px 700px 999px 800px", tag: false,
    colors: { yellow: "#FFD84D", coral: "#FF7A59", teal: "#1FA38C", blue: "#3D7BF2", purple: "#8A63E8", pink: "#F0648F", green: "#3FAE5A", ink: "#2B2A33", gray: "#86838F", red: "#E5484D", sub: "#55525E" },
    notes: { yellow: "#FFF1A6", pink: "#FFDCE5", mint: "#D3F3E4", blue: "#DAE9FF", purple: "#EAE1FF", peach: "#FFE2C8", white: "#FFFEFB", gray: "#F1F0EC" },
    hl: { yellow: "rgba(255,216,77,.75)", pink: "rgba(255,143,177,.5)", mint: "rgba(80,215,170,.4)", blue: "rgba(110,165,255,.38)", coral: "rgba(255,122,89,.35)" },
  },
  notion: {
    name: "notion", font: SANS, emoji: "noto", rough: 0.55, rot: 0, photo: "plain", pad: [0, 0], tape: false,
    noteBorder: "css", noteRadius: "10px", noteShadow: "0 1px 2px rgba(15,15,15,.04),0 8px 22px rgba(15,15,15,.05)",
    hlSize: "100%", hlPos: "0 0", chipRadius: "6px", tag: true,
    // Notion 的文字色与底色（浅色模式）
    colors: { yellow: "#CB912F", coral: "#D9730D", teal: "#448361", blue: "#337EA9", purple: "#9065B0", pink: "#C14C8A", green: "#448361", ink: "#37352F", gray: "#787774", red: "#D44C47", sub: "#6F6E69" },
    notes: { yellow: "#FBF3DB", pink: "#FAF1F5", mint: "#EDF3EC", blue: "#E7F3F8", purple: "#F6F3F9", peach: "#FBECDD", white: "#FFFFFF", gray: "#F1F1EF" },
    hl: { yellow: "rgba(236,191,66,.30)", pink: "rgba(193,76,138,.16)", mint: "rgba(68,131,97,.16)", blue: "rgba(51,126,169,.15)", coral: "rgba(217,115,13,.17)" },
  },
};
/** 当前皮肤；模板读 COLORS / NOTES（原地换值，import 进来的引用一直有效） */
export let K = SKINS.paper;
export const COLORS = { ...K.colors };
export const NOTES = { ...K.notes };
export const HL = { ...K.hl };
export function useSkin(name) {
  K = SKINS[name] ?? SKINS.paper;
  Object.assign(COLORS, K.colors); Object.assign(NOTES, K.notes); Object.assign(HL, K.hl);
  return K;
}
/** 兼容旧写法：INK 取当前皮肤的正文色 */
export const INK = "#2B2A33";

const GEN = rough.generator();
const css = () => `
.sk{position:absolute;left:0;top:0;width:0;height:0}
.sk svg.ink{position:absolute;left:-960px;top:-540px;width:1920px;height:1080px;overflow:visible;pointer-events:none}
.sk .it{position:absolute;transform-origin:50% 50%}
.sk .note{border-radius:${K.noteRadius};box-shadow:${K.noteShadow}${K.noteBorder === "css" ? ";border:1px solid rgba(55,53,47,.10)" : ""}}
.sk .note svg{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);overflow:visible}
.sk .grp{width:0;height:0;overflow:visible}
.sk .stk{position:absolute;box-sizing:border-box;border:10px solid #fff;border-radius:30px;overflow:hidden}
.sk .stk-sheen{position:absolute;top:-30%;bottom:-30%;left:0;width:42%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.8),rgba(255,255,255,0));opacity:0}
.sk .tape{position:absolute;width:120px;height:34px;background:rgba(255,248,220,.72);box-shadow:0 1px 3px rgba(0,0,0,.08);
  border-left:2px dashed rgba(0,0,0,.05);border-right:2px dashed rgba(0,0,0,.05)}
.sk .tx{white-space:pre-wrap;word-break:break-word}
.sk .tx .h{background-repeat:no-repeat;background-position:${K.hlPos};padding:0 .08em;margin:0 -.04em;border-radius:${K.name === "notion" ? "4px" : ".2em .5em .3em .6em"}}
.sk .ph{background:#fff;padding:14px 14px 18px;box-shadow:0 18px 40px rgba(60,45,20,.18),0 2px 5px rgba(60,45,20,.12)}
.sk .pl{background:#fff;border:1px solid rgba(55,53,47,.14);border-radius:10px;overflow:hidden;box-shadow:0 2px 4px rgba(15,15,15,.04),0 16px 40px rgba(15,15,15,.08)}
.sk .ph .win,.sk .pl .win{position:relative;overflow:hidden;width:100%;height:100%;background:#f4f4f4}
.sk .ph .win img,.sk .pl .win img{position:absolute;display:block;max-width:none}
.sk .st img{display:block;width:100%;height:100%;object-fit:contain;${K.name === "notion" ? "" : "filter:drop-shadow(0 10px 14px rgba(40,30,10,.18))"}}
.sk .chip{white-space:nowrap;font-weight:${K.name === "notion" ? 600 : 700};border-radius:${K.chipRadius}}
`;

/** rough.js 形状 → [{d, stroke, sw, fill}]（固定种子） */
function roughPaths(shape, o) {
  const opt = { seed: o.seed, roughness: o.roughness ?? K.rough, bowing: o.bowing ?? (K.name === "notion" ? 0.6 : 1.1), stroke: o.color ?? COLORS.ink, strokeWidth: o.width ?? 3,
    fill: o.fill, fillStyle: o.fillStyle ?? "hachure", hachureGap: o.hachureGap ?? 11, fillWeight: o.fillWeight ?? 2.2, hachureAngle: o.hachureAngle ?? -41,
    preserveVertices: false, disableMultiStroke: o.single ?? K.name === "notion" };
  const sh = shape;
  let dr = [];
  if (sh.type === "rect") dr = [GEN.rectangle(sh.x, sh.y, sh.w, sh.h, opt)];
  else if (sh.type === "ellipse") dr = [GEN.ellipse(sh.cx, sh.cy, sh.w, sh.h, opt)];
  else if (sh.type === "line") dr = [GEN.line(sh.x1, sh.y1, sh.x2, sh.y2, opt)];
  else if (sh.type === "curve") dr = [GEN.curve(sh.pts, { ...opt, fill: undefined })];
  else if (sh.type === "linear") dr = [GEN.linearPath(sh.pts, opt)];
  else if (sh.type === "wave") {
    const n = Math.max(4, Math.round(sh.w / 60)), pts = [];
    for (let k = 0; k <= n; k++) pts.push([sh.x + (sh.w * k) / n, sh.y + (k % 2 ? 7 : -7)]);
    dr = [GEN.curve(pts, { ...opt, fill: undefined })];
  } else if (sh.type === "arrow") {
    const pts = sh.pts, [ax, ay] = pts.at(-2), [bx, by] = pts.at(-1), ang = Math.atan2(by - ay, bx - ax), L = sh.head ?? 22;
    dr = [pts.length > 2 ? GEN.curve(pts, { ...opt, fill: undefined }) : GEN.line(ax, ay, bx, by, opt),
      GEN.linearPath([[bx - L * Math.cos(ang - 0.5), by - L * Math.sin(ang - 0.5)], [bx, by], [bx - L * Math.cos(ang + 0.5), by - L * Math.sin(ang + 0.5)]], { ...opt, roughness: 0.6 })];
  } else if (sh.type === "check") {
    const { x, y, s: z } = sh;
    dr = [GEN.linearPath([[x - z * 0.5, y], [x - z * 0.12, y + z * 0.42], [x + z * 0.55, y - z * 0.5]], { ...opt, roughness: 0.8 })];
  } else if (sh.type === "cross") {
    const { x, y, s: z } = sh;
    dr = [GEN.line(x - z / 2, y - z / 2, x + z / 2, y + z / 2, opt), GEN.line(x + z / 2, y - z / 2, x - z / 2, y + z / 2, opt)];
  }
  return dr.flatMap((d) => GEN.toPaths(d)).map((p) => ({ d: p.d, stroke: p.stroke, sw: p.strokeWidth, fill: p.fill }));
}

/** 文本里的 *词* → [{t, hl}] */
const segs = (text) => String(text).split(/(\*[^*]+\*)/).filter(Boolean).map((x) => (x.startsWith("*") && x.endsWith("*") ? { t: x.slice(1, -1), hl: true } : { t: x, hl: false }));

export const SketchLayer = {
  name: "sketch",
  create(root, p, ctx) {
    ctx.css(`pr-sketch-${K.name}`, css());
    const out = p.out ?? Infinity;
    const el = h("div", { class: "sk" });
    root.append(el);
    const items = (p.items ?? []).map((it, i) => build(el, it, i));
    return {
      duration: out,
      sfx: items.flatMap((q) => q.sfx ?? []),
      render(t) {
        const vis = t <= out + 0.45;
        // 用 display 而不是 visibility：子元素自己写了 visibility:visible（录屏帧、小人帧）会穿透父层的 hidden
        setStyle(el, "display", vis ? "block" : "none");
        if (!vis) return;
        setStyle(el, "opacity", (1 - clamp01((t - out) / 0.35)).toFixed(3));
        for (const q of items) q.render(t);
      },
    };
  },
};

function fadeOut(t, it) {
  return it.until != null ? 1 - clamp01((t - it.until) / 0.3) : 1;
}

function build(el, it, i) {
  const seed = it.seed ?? 7 + i * 131;
  if (MOTION[it.k]) return MOTION[it.k](el, it, i, { K, COLORS, NOTES, pop });
  if (it.k === "ink") {
    const svg = s("svg", { class: "ink", viewBox: "-960 -540 1920 1080" });
    el.append(svg);
    const ps = roughPaths(it.shape, { ...it, seed });
    const dur = it.dur ?? 0.55;
    const nodes = ps.map((q) => {
      const solid = q.fill && q.fill !== "none";
      const n = s("path", { d: q.d, fill: solid ? q.fill : "none", stroke: solid ? "none" : q.stroke, "stroke-width": q.sw, "stroke-linecap": "round", "stroke-linejoin": "round",
        ...(solid ? {} : { pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }), opacity: 0 });
      svg.append(n);
      return { n, solid };
    });
    const strokes = nodes.filter((q) => !q.solid), per = dur / Math.max(1, strokes.length);
    return {
      sfx: it.sfx ? [{ t: it.at, name: it.sfx, gain: -20 }] : [],
      render(t) {
        const g = fadeOut(t, it) * (it.opacity ?? 1);
        let k = 0;
        for (const q of nodes) {
          if (q.solid) { setAttr(q.n, "opacity", (clamp01((t - it.at) / 0.25) * g).toFixed(3)); continue; }
          const k0 = it.at + per * k++;
          const p = cubicInOut(clamp01((t - k0) / Math.max(0.04, per * 1.6)));
          setAttr(q.n, "stroke-dashoffset", (1 - p).toFixed(4));
          setAttr(q.n, "opacity", (t >= k0 ? g : 0).toFixed(3));
        }
      },
    };
  }
  /** 贴纸组：一张白边卡（可选）+ 子元素一起「按上去」——放大、倾斜、投影大 → 落定回弹、投影收紧，再划过一道高光。
   *  子元素坐标相对组中心；filter:"diecut" 给整组描一圈白边（插画、emoji 变成模切贴纸） */
  /** 视频片段（放在贴纸组里当「视频贴纸」）。reps = 循环播放的每一遍 [{vid, start, dur}]。
   *  HyperFrames 渲染时：hf_host 已在 index.html 里静态声明 <video data-vclip>（它在编译期静态扫描媒体），这里把它们搬进来，帧由 HyperFrames 逐帧注入；
   *  浏览器预览 / 互动版：只用一个 video 元素，按时间取模跳帧。 */
  if (it.k === "video") {
    const box = h("div", { class: "it", style: { left: `${it.x - it.w / 2}px`, top: `${it.y - it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px`,
      overflow: "hidden", borderRadius: `${it.radius ?? 20}px`, background: it.bg ?? "#0b0b0b" } });
    el.append(box);
    const reps = (it.reps ?? [{ vid: null, start: it.at, dur: it.dur ?? 4 }]).map((r) => {
      const v = r.vid ? document.querySelector(`video[data-vclip="${r.vid}"]`) : null;
      return { ...r, v, hf: !!v };
    });
    const hfMode = reps.some((r) => r.hf);
    const style = (v) => { v.removeAttribute("style"); Object.assign(v.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", objectFit: it.fit ?? "cover", display: "block" }); box.append(v); };
    let solo = null, lastT = -1;
    if (hfMode) for (const r of reps) if (r.v) style(r.v);
    if (!hfMode) {
      solo = document.createElement("video");
      solo.src = it.src; solo.muted = true; solo.playsInline = true; solo.preload = "auto";
      if (it.poster) solo.poster = it.poster;
      style(solo);
    }
    return {
      render(t) {
        setStyle(box, "opacity", (clamp01((t - it.at) / 0.2) * fadeOut(t, it)).toFixed(3));
        if (hfMode) { for (const r of reps) if (r.v) setStyle(r.v, "opacity", t >= r.start && t < r.start + r.dur ? "1" : "0"); return; }
        const r = reps.find((q) => t >= q.start && t < q.start + q.dur) ?? (t < reps[0].start ? reps[0] : reps[reps.length - 1]);
        const local = Math.max(0, Math.min(t - r.start, r.dur - 0.05));
        const dt = t - lastT;
        lastT = t;
        const playing = dt > 0 && dt < 0.25 && t >= r.start && t < r.start + r.dur;   // 播放器在连续往前走
        if (solo.readyState < 1) return;
        if (playing) {
          if (Math.abs(solo.currentTime - local) > 0.3) solo.currentTime = local;
          if (solo.paused) solo.play().catch(() => {});
        } else {
          if (!solo.paused) solo.pause();
          if (Math.abs(solo.currentTime - local) > 0.05) solo.currentTime = local;
        }
      },
    };
  }
  if (it.k === "group") {
    const g = h("div", { class: "it grp", style: { left: `${it.x}px`, top: `${it.y}px` } });
    el.append(g);
    let card = null, sheen = null;
    if (it.card) {
      card = h("div", { class: "stk", style: { left: `${-it.w / 2}px`, top: `${-it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px`, background: NOTES[it.color] ?? it.color ?? NOTES.white } });
      sheen = h("div", { class: "stk-sheen" });
      card.append(sheen);
      g.append(card);
    }
    if (it.filter === "diecut") {
      const r = it.edge ?? 6;
      g.style.filter = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `drop-shadow(${(Math.cos(a * Math.PI / 180) * r).toFixed(2)}px ${(Math.sin(a * Math.PI / 180) * r).toFixed(2)}px 0 #fff)`).join(" ")
        + " drop-shadow(0 0 1.2px rgba(55,53,47,.35)) drop-shadow(0 12px 16px rgba(55,53,47,.18))";
    }
    const kids = (it.children ?? []).map((c, j) => build(g, c, i * 37 + j + 1));
    const rot = it.rot ?? 0, spin = it.spin ?? 8, from = it.from ?? 1.3;
    return {
      sfx: [{ t: it.at, name: "tap", gain: -21 }, ...kids.flatMap((q) => q.sfx ?? [])],
      render(t) {
        const a = step(t - it.at, UI), lift = 1 - Math.min(1, a);
        setStyle(g, "opacity", (clamp01((t - it.at) / 0.1) * fadeOut(t, it)).toFixed(3));
        const bob = it.bob ? Math.sin((t - it.at) * 2 * Math.PI * 0.3 + i) * it.bob : 0;
        setStyle(g, "transform", `translateY(${bob.toFixed(2)}px) scale(${(from + (1 - from) * a).toFixed(4)}) rotate(${(rot + (1 - a) * spin).toFixed(2)}deg)`);
        if (card) {
          setStyle(card, "boxShadow", `0 0 0 1.5px rgba(55,53,47,.10), 0 ${(5 + 26 * lift).toFixed(1)}px ${(12 + 34 * lift).toFixed(1)}px rgba(55,53,47,${(0.15 + 0.1 * lift).toFixed(3)})`);
          const q = clamp01((t - it.at - 0.3) / 0.75);
          setStyle(sheen, "transform", `translateX(${(-140 + 400 * q).toFixed(1)}%) skewX(-18deg)`);
          setStyle(sheen, "opacity", q > 0 && q < 1 ? "1" : "0");
        }
        for (const q of kids) q.render(t);
      },
    };
  }
  if (it.k === "note") {
    const box = h("div", { class: "it note", style: { left: `${it.x - it.w / 2}px`, top: `${it.y - it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px`,
      background: NOTES[it.color] ?? it.color ?? NOTES.white } });
    if (K.noteBorder === "rough") {
      const svg = s("svg", { viewBox: `-6 -6 ${it.w + 12} ${it.h + 12}` });
      for (const q of roughPaths({ type: "rect", x: 0, y: 0, w: it.w, h: it.h }, { seed, color: "rgba(43,42,51,.55)", width: 2, roughness: 1.6 })) svg.append(s("path", { d: q.d, fill: "none", stroke: q.stroke, "stroke-width": q.sw }));
      box.append(svg);
    }
    if (K.tape && it.tape !== false) box.append(h("div", { class: "tape", style: { left: `${it.w / 2 - 60}px`, top: "-18px", transform: `rotate(${(seed % 7) - 3}deg)` } }));
    el.append(box);
    return pop(box, it, seed, [{ t: it.at, name: it.sound ?? (K.name === "notion" ? "tap" : "paper-place-1"), gain: K.name === "notion" ? -24 : -19 }], K.name === "notion" ? 0.94 : 0.55);
  }
  if (it.k === "box") {
    const box = h("div", { class: "it", style: { left: `${it.x - it.w / 2}px`, top: `${it.y - it.h / 2}px`, width: `${it.w}px`, height: `${it.h}px`,
      background: it.bg, borderRadius: it.radius ?? "0", border: it.border ?? "none" } });
    el.append(box);
    return { render(t) { setStyle(box, "opacity", (clamp01((t - it.at) / 0.4) * fadeOut(t, it)).toFixed(3)); } };
  }
  if (it.k === "text") {
    const size = it.size ?? 48;
    const fam = it.font === "mono" ? '"Geist Mono",monospace' : it.font === "hand" ? HAND : K.font;
    const box = h("div", { class: "it tx", style: { font: `${it.weight ?? 600} ${size}px/${it.lh ?? 1.35} ${fam}`,
      color: it.color ?? COLORS.ink, textAlign: it.align ?? "left", width: it.w ? `${it.w}px` : "auto", whiteSpace: it.w ? "pre-wrap" : "pre", letterSpacing: it.ls ?? (K.name === "notion" ? "0" : ".01em") } });
    const parts = segs(it.text).map((sg) => {
      const sp = h("span", { class: sg.hl ? "h" : "" });
      const hc = HL[it.hl ?? "yellow"] ?? it.hl;
      if (sg.hl) sp.style.backgroundImage = `linear-gradient(${hc}, ${hc})`;
      box.append(sp);
      return { ...sg, sp, n0: 0 };
    });
    let acc = 0;
    for (const q of parts) { q.n0 = acc; acc += Array.from(q.t).length; }
    for (const q of parts) q.sp.textContent = q.t;
    el.append(box);
    const [ax, ay] = { tl: [0, 0], tc: [-0.5, 0], tr: [-1, 0], ml: [0, -0.5], c: [-0.5, -0.5], mr: [-1, -0.5], bl: [0, -1], bc: [-0.5, -1] }[it.anchor ?? "tl"];
    box.style.left = `${it.x}px`; box.style.top = `${it.y}px`;
    box.style.transform = `translate(${ax * 100}%, ${ay * 100}%) rotate(${(it.rot ?? 0) * K.rot}deg)`;
    box.style.transformOrigin = "0 0";
    const all = parts.map((q) => q.t).join("");
    const cps = it.cps ?? 16;
    return {
      render(t) {
        const g = fadeOut(t, it);
        const n = cps > 0 ? typedCount(all, it.at, cps, t, seed) : t >= it.at ? acc : 0;
        const fade = cps > 0 ? (t >= it.at ? 1 : 0) : clamp01((t - it.at) / 0.35);
        setStyle(box, "opacity", (fade * g).toFixed(3));
        // 没打出来的字用透明占位：版面从第一帧起就不跳
        for (const q of parts) {
          const L = Array.from(q.t), shown = Math.max(0, Math.min(L.length, n - q.n0));
          if (q.shown !== shown) {
            q.sp.textContent = "";
            q.sp.append(document.createTextNode(L.slice(0, shown).join("")));
            if (shown < L.length) q.sp.append(h("span", { style: { color: "transparent" }, text: L.slice(shown).join("") }));
            q.shown = shown;
          }
          if (q.hl) {
            const tDone = cps > 0 ? it.at + (q.n0 + L.length) / cps * 1.05 : it.at + 0.2;
            const w = cubicInOut(clamp01((t - tDone) / 0.4));
            setStyle(q.sp, "backgroundSize", `${(w * 100).toFixed(1)}% ${K.hlSize}`);
          }
        }
      },
    };
  }
  if (it.k === "img") {
    const w = it.w, hh = it.h;
    let box;
    if (it.frame === "polaroid") {
      const plain = K.photo === "plain", [px, py] = K.pad;
      box = h("div", { class: `it ${plain ? "pl" : "ph"}`, style: { left: `${it.x - w / 2}px`, top: `${it.y - hh / 2}px`, width: `${w}px`, height: `${hh}px` } });
      const win = h("div", { class: "win" });
      const [c0, c1, c2, c3] = it.crop ?? [0, 0, 1, 1];
      const iw = (w - px) / (c2 - c0), ih = (hh - py) / (c3 - c1);
      win.append(h("img", { src: it.src, style: { width: `${iw}px`, height: `${ih}px`, left: `${-c0 * iw}px`, top: `${-c1 * ih}px` } }));
      box.append(win);
      if (K.tape && it.tape !== false) {
        box.append(h("div", { class: "tape", style: { left: "-30px", top: "-10px", transform: "rotate(-28deg)" } }));
        box.append(h("div", { class: "tape", style: { right: "-30px", top: "-10px", transform: "rotate(26deg)" } }));
      }
    } else {
      box = h("div", { class: "it st", style: { left: `${it.x - w / 2}px`, top: `${it.y - hh / 2}px`, width: `${w}px`, height: `${hh}px` } });
      box.append(h("img", { src: it.src }));
      if (it.radius) Object.assign(box.style, { borderRadius: it.radius, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,15,15,.12)" });
    }
    el.append(box);
    const snd = it.frame === "polaroid" ? (K.name === "notion" ? "tap" : "paper-place-2") : "pop";
    return pop(box, it, seed, it.silent ? [] : [{ t: it.at, name: snd, gain: it.frame === "polaroid" ? -19 : -22 }], it.frame === "polaroid" && K.name === "notion" ? 0.96 : 0.55);
  }
  if (it.k === "chip") {
    const size = it.size ?? 28;
    // Notion 皮肤：实心色标签改成 Notion 标签样式（浅底 + 同色字）
    let fg = it.color ?? "#fff", bg = it.bg ?? COLORS.ink;
    if (K.tag && !it.stamp && /^#[0-9A-Fa-f]{6}$/.test(bg)) { fg = bg; bg = tint(bg, 0.86); }
    const box = h("div", { class: "it chip", text: it.text, style: { font: `${K.name === "notion" ? 600 : 700} ${size}px/1.1 ${K.font}`, padding: `${size * 0.32}px ${size * 0.55}px`,
      color: fg, background: bg, border: it.stamp ? `${K.name === "notion" ? 1.5 : 3}px solid ${it.color}` : "none", left: `${it.x}px`, top: `${it.y}px` } });
    el.append(box);
    const [ax, ay] = { tl: [0, 0], tc: [-50, 0], tr: [-100, 0], c: [-50, -50], ml: [0, -50], mr: [-100, -50] }[it.anchor ?? "c"];
    return pop(box, { ...it, base: `translate(${ax}%, ${ay}%)` }, seed, [], K.name === "notion" ? 0.9 : 0.55);
  }
  throw new Error(`手绘层不认识这一项：${it.k}`);
}

/** 与白色混合成不透明浅底（压在截图上也清楚） */
function tint(hex, k) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c.join(",")})`;
}

/** 进场：弹簧缩放（Notion 皮肤只轻轻放大一点）+ 定格小角度；bob 让贴纸轻轻浮动 */
function pop(box, it, seed, sfx, from = 0.55) {
  const rot = (it.rot ?? 0) * K.rot;
  const tilt = K.rot ? 8 : 0;
  return {
    sfx,
    render(t) {
      const a = step(t - it.at, UI);
      const g = fadeOut(t, it);
      const sc = it.pop === false ? 1 : from + (1 - from) * a;
      const bob = it.bob ? Math.sin((t - it.at) * 2 * Math.PI * 0.32 + seed) * it.bob * (K.rot ? 1 : 0.5) : 0;
      const wob = it.bob && K.rot ? Math.sin((t - it.at) * 2 * Math.PI * 0.21 + seed * 0.7) * 2.2 : 0;
      setStyle(box, "opacity", (clamp01((t - it.at) / (K.rot ? 0.12 : 0.25)) * g).toFixed(3));
      setStyle(box, "transform", `${it.base ?? ""} translateY(${(bob + (K.rot ? 0 : (1 - a) * 14)).toFixed(2)}px) scale(${sc.toFixed(4)}) rotate(${(rot + (1 - a) * tilt + wob).toFixed(2)}deg)`);
    },
  };
}

export default SketchLayer;
