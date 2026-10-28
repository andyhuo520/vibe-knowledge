/**
 * 文字类原语：Typer 打字文字（可套气泡或卡片）· IconRow 图标排。
 * 时间参数都是本地秒；render 是纯函数。
 */
import { h, s, setStyle } from "../runtime/dom.js";
import { appear, hz, UI } from "../runtime/spring.js";
import { clamp01, cubicInOut } from "../runtime/ease.js";
import { mountTyping, typingCss, typingSfx } from "../runtime/typing.js";
import { ico, drawIcon } from "../runtime/iconify.js";

const CSS = `
.ty{position:absolute;left:0;top:0}
.ty-box{position:relative}
.ty-box.bubble{background:var(--surface);border:3px solid var(--line);border-radius:38px;padding:34px 46px 38px;box-shadow:var(--shadow)}
.ty-box.card{background:var(--surface);border-radius:30px;padding:30px 40px 34px;box-shadow:var(--shadow)}
.ty-tail{position:absolute;width:38px;height:38px;background:var(--surface);border:3px solid var(--line);border-radius:6px}
.ty-line{position:relative}
.ty-caret{display:inline-block;width:0.075em;height:0.92em;margin-left:0.06em;vertical-align:-0.08em;border-radius:0.04em;background:var(--m1-d)}
.ty-src{font:500 26px/1.45 var(--sans);color:var(--ink3);margin-top:16px}
.ir{position:absolute;left:0;top:0;display:flex;align-items:flex-start;white-space:nowrap}
.ir-title{position:absolute;left:0;right:0;text-align:center;font:600 30px/1.3 var(--sans);color:var(--ink2)}
.ir-it{display:flex;flex-direction:column;align-items:center}
.ir-disc{border-radius:50%;display:grid;place-items:center;border-style:solid}
.ir-l{font:650 30px/1.2 var(--sans);color:var(--ink);margin-top:16px}
.ir-s{font:500 23px/1.3 var(--sans);color:var(--ink2);margin-top:6px}
.ir-wall{width:0;border-left:5px dashed var(--ink3);transform-origin:50% 0}
`;

const ANCHOR = { tl: "", center: "translate(-50%,-50%)", left: "translate(0,-50%)", tc: "translate(-50%,0)", right: "translate(-100%,-50%)" };
const BOX = { w: hz(2.8), z: 0.62 };

/**
 * Typer 打字文字
 * params
 *   lines [{text, at, cps=11, size=64, weight=700, color="var(--ink)", lh=1.3, mt=0, hl}]   *词* 为高亮
 *   w         文字区宽度（px）；不给就按内容宽
 *   anchor    tl（默认）| center | left | tc | right
 *   box       null | "bubble" | "card"，boxAt 为它弹出的时刻（默认第一行前 0.3 秒）
 *   tail      气泡尾巴：left | right | bottom（默认 left）
 *   src {text, at}   气泡底部的出处小字
 *   caret     是否显示光标（默认 true）
 *   align     文字对齐：left（默认）| center
 *   out       退场时刻
 */
export const Typer = {
  name: "typer",
  create(root, p, ctx) {
    ctx.css("pr-typer", CSS);
    typingCss(ctx.css);
    const out = p.out ?? Infinity;
    const el = h("div", { class: "ty", style: { width: p.w ? `${p.w}px` : "max-content", transform: ANCHOR[p.anchor ?? "tl"], textAlign: p.align ?? "left" } });
    const box = h("div", { class: `ty-box ${p.box ?? ""}` });
    el.append(box);
    root.append(el);
    const boxAt = p.boxAt ?? (p.lines[0]?.at ?? 0) - 0.3;
    let tail = null;
    if (p.box === "bubble") {
      tail = h("div", { class: "ty-tail" });
      const side = p.tail ?? "left";
      Object.assign(tail.style, side === "left" ? { left: "-21px", top: "46px", transform: "rotate(45deg)", borderRight: "none", borderTop: "none" }
        : side === "right" ? { right: "-21px", top: "46px", transform: "rotate(45deg)", borderLeft: "none", borderBottom: "none" }
        : { left: "70px", bottom: "-21px", transform: "rotate(45deg)", borderLeft: "none", borderTop: "none" });
      box.append(tail);
    }
    const caret = h("span", { class: "ty-caret" });
    const lines = p.lines.map((ln, i) => {
      const size = ln.size ?? 64;
      const lh = ln.lh ?? 1.3;
      const div = h("div", { class: "ty-line", style: {
        font: `${ln.weight ?? 700} ${size}px/${lh} ${ln.mono ? "var(--mono)" : "var(--sans)"}`,
        color: ln.color ?? "var(--ink)", marginTop: `${ln.mt ?? 0}px`, minHeight: `${size * lh}px`, letterSpacing: ln.ls ?? "0.01em",
      } });
      box.append(div);
      const ty = mountTyping(div, ln.text, { cps: ln.cps ?? 11, seed: 7 + i * 13, hl: ln.hl ?? "var(--hl)" });
      return { ...ln, div, ty, at: ln.at ?? 0 };
    });
    let src = null;
    if (p.src) {
      src = h("div", { class: "ty-src", text: p.src.text });
      box.append(src);
    }
    const sfx = lines.flatMap((l) => typingSfx(l.ty, l.at, { seed: l.at * 10 }));

    return {
      duration: out,
      sfx,
      render(t) {
        const first = p.box ? boxAt : lines[0]?.at ?? 0;
        const vis = t >= first - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const o = clamp01((t - out) / 0.28);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        setStyle(el, "filter", o > 0.01 ? `blur(${(o * 8).toFixed(2)}px)` : "none");
        if (p.box) {
          const a = appear(t, boxAt, BOX);
          setStyle(box, "transform", `translateY(${((1 - a) * 26).toFixed(2)}px) scale(${(0.86 + 0.14 * a).toFixed(4)})`);
          setStyle(box, "opacity", clamp01(a * 1.5).toFixed(3));
        }
        let active = null;
        for (const l of lines) {
          l.ty.render(t, l.at);
          if (t >= l.at) active = l;
        }
        if (src) {
          const a = appear(t, p.src.at ?? Infinity, UI);
          setStyle(src, "opacity", clamp01(a).toFixed(3));
          setStyle(src, "transform", `translateY(${((1 - a) * 10).toFixed(2)}px)`);
        }
        // 光标跟着正在打的那一行；打完后闪烁，下一行开始或退场时消失
        const showCaret = p.caret !== false && active && active.caret !== false;
        if (showCaret) {
          // 没打出的字是 display:none，光标放在行尾就正好跟在最后一个字后面
          if (caret.parentNode !== active.div) active.div.append(caret);
          const done = active.at + active.ty.last + 0.12;
          const on = t < done || (t - done) % 1.0 < 0.55;
          setStyle(caret, "opacity", on ? "1" : "0");
        } else if (caret.parentNode) setStyle(caret, "opacity", "0");
      },
    };
  },
};

/**
 * IconRow 图标排：圆形图标依次弹出（线条自己画出来），下面打出标签；可插竖墙、箭头。整排以原点为中心。
 * params
 *   items [{icon, label, sub, color:"m1".."m6", at} | {kind:"wall", at, h} | {kind:"arrow", at}]
 *   size 圆直径（默认 120）、gap 间距（默认 56）、out、title {text, at}
 */
export const IconRow = {
  name: "iconrow",
  create(root, p, ctx) {
    ctx.css("pr-typer", CSS);
    typingCss(ctx.css);
    const size = p.size ?? 120;
    const out = p.out ?? Infinity;
    const el = h("div", { class: "ir", style: { gap: `${p.gap ?? 56}px`, transform: "translate(-50%,-50%)" } });
    root.append(el);
    const parts = p.items.map((it, i) => {
      if (it.kind === "wall") {
        const w = h("div", { class: "ir-wall", style: { height: `${it.h ?? size * 1.5}px`, marginTop: `${-size * 0.15}px` } });
        el.append(w);
        return { it, w };
      }
      if (it.kind === "arrow") {
        const a = s("svg", { width: 64, height: size, viewBox: `0 0 64 ${size}`, style: { overflow: "visible" } });
        const path = s("path", { d: `M6 ${size / 2} H54 M42 ${size / 2 - 12} L56 ${size / 2} L42 ${size / 2 + 12}`, fill: "none", stroke: "var(--ink3)",
          "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 });
        a.append(path);
        el.append(a);
        return { it, path };
      }
      const c = it.color ?? "m5";
      const box = h("div", { class: "ir-it", style: { width: `${size + 60}px` } });
      const disc = h("div", { class: "ir-disc", style: { width: `${size}px`, height: `${size}px`, background: `var(--${c}-t)`, borderColor: `var(--${c})`, borderWidth: `${Math.round(size / 26)}px` } });
      const svg = ico(it.icon, Math.round(size * 0.5), { color: `var(--${c}-d)`, stroke: 1.8, draw: true, tone: c });
      disc.append(svg);
      const lab = h("div", { class: "ir-l" });
      box.append(disc, lab);
      const ty = mountTyping(lab, it.label ?? "", { cps: 14, seed: 31 + i, pop: true });
      let sub = null, tys = null;
      if (it.sub) {
        sub = h("div", { class: "ir-s" });
        box.append(sub);
        tys = mountTyping(sub, it.sub, { cps: 16, seed: 57 + i });
      }
      el.append(box);
      return { it, box, disc, svg, ty, tys };
    });
    let title = null, tyT = null;
    if (p.title) {
      title = h("div", { class: "ir-title", style: { top: "-58px" } });
      el.append(title);
      tyT = mountTyping(title, p.title.text, { cps: 13, seed: 5 });
    }
    const POP2 = { w: hz(3.2), z: 0.5 };
    return {
      duration: out,
      sfx: parts.filter((q) => q.disc).map((q) => ({ t: q.it.at, name: "pop", gain: -21 })),
      render(t) {
        const first = Math.min(...p.items.map((i) => i.at), p.title?.at ?? Infinity);
        const vis = t >= first - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const o = clamp01((t - out) / 0.28);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        if (tyT) tyT.render(t, p.title.at);
        for (const q of parts) {
          const at = q.it.at;
          if (q.w) {
            const a = clamp01((t - at) / 0.45);
            setStyle(q.w, "transform", `scaleY(${cubicInOut(a).toFixed(4)})`);
            continue;
          }
          if (q.path) {
            q.path.setAttribute("stroke-dashoffset", (1 - cubicInOut(clamp01((t - at) / 0.4))).toFixed(4));
            continue;
          }
          const a = appear(t, at, POP2);
          setStyle(q.disc, "transform", `scale(${(0.2 + 0.8 * a).toFixed(4)})`);
          setStyle(q.disc, "opacity", clamp01(a * 2).toFixed(3));
          drawIcon(q.svg, cubicInOut(clamp01((t - at - 0.12) / 0.7)));
          q.ty.render(t, at + 0.25);
          if (q.tys) q.tys.render(t, at + 0.3 + q.ty.dur);
        }
      },
    };
  },
};
