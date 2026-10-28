/**
 * Timeline 时间线：轴线从左往右画出，事件按时刻依次落点：圆点弹出，上方图片卡或图标，下方年份与标题打字。
 * 进度线跟着最新的事件走；之前的事件略微变淡。镜头不动。以原点为轴线中点。
 *
 * params
 *   w                 轴长（默认 1560）
 *   events [{year, title, sub, icon, img, pos, zoom, credit, color, at}]   pos/zoom：图片裁切焦点与放大倍数
 *   at, out           轴线画出、退场
 *   card {w, h}       图片卡尺寸（默认 270×190）
 *   heading {text, at, x, y}   标题（可选，相对原点）
 */
import { h, s, setStyle, setAttr } from "../runtime/dom.js";
import { appear, hz, track, UI } from "../runtime/spring.js";
import { clamp01, cubicInOut } from "../runtime/ease.js";
import { mountTyping, typingCss } from "../runtime/typing.js";
import { ico, drawIcon } from "../runtime/iconify.js";

const CSS = `
.tl{position:absolute;left:0;top:0}
.tl-ev{position:absolute;left:0;top:0;width:0;height:0}
.tl-card{position:absolute;bottom:44px;left:0;background:var(--surface);padding:10px;border-radius:14px;box-shadow:var(--shadow);transform-origin:50% 100%}
.tl-card .im{overflow:hidden;border-radius:8px;background:var(--surface2);border:2px solid var(--line)}
.tl-card img{display:block;width:100%;height:100%;object-fit:cover}
.tl-cr{margin-top:6px;font:500 15px/1.3 var(--sans);color:var(--ink3);text-align:center;white-space:normal}
.tl-disc{position:absolute;bottom:52px;left:0;border-radius:50%;display:grid;place-items:center;border-style:solid;transform-origin:50% 100%}
.tl-txt{position:absolute;top:36px;left:0;width:340px;transform:translateX(-50%);text-align:center}
.tl-y{font:800 56px/1.1 var(--sans);letter-spacing:.02em}
.tl-t{font:650 32px/1.3 var(--sans);color:var(--ink);margin-top:8px}
.tl-s{font:500 24px/1.35 var(--sans);color:var(--ink2);margin-top:4px}
.tl-head{position:absolute;font:750 44px/1.2 var(--sans);color:var(--ink);white-space:nowrap}
`;
const POP = { w: hz(3.2), z: 0.5 };
const RUN = { w: hz(1.6), z: 0.9 };

export default {
  name: "timeline",
  create(root, p, ctx) {
    ctx.css("pr-timeline", CSS);
    typingCss(ctx.css);
    const W = p.w ?? 1560;
    const at = p.at ?? 0;
    const out = p.out ?? Infinity;
    const cw = p.card?.w ?? 270, ch = p.card?.h ?? 190;
    const N = p.events.length;
    const X = (i) => -W / 2 + (W * (i + 0.5)) / N;
    const el = h("div", { class: "tl" });
    root.append(el);

    const svg = s("svg", { width: W + 40, height: 40, viewBox: `${-W / 2 - 20} -20 ${W + 40} 40`, style: { position: "absolute", left: `${-W / 2 - 20}px`, top: "-20px", overflow: "visible" } });
    const base = s("line", { x1: -W / 2, y1: 0, x2: W / 2, y2: 0, stroke: "var(--line)", "stroke-width": 8, "stroke-linecap": "round" });
    const prog = s("line", { x1: -W / 2, y1: 0, x2: -W / 2, y2: 0, stroke: "var(--m6)", "stroke-width": 8, "stroke-linecap": "round" });
    svg.append(base, prog);
    el.append(svg);

    const evs = p.events.map((e, i) => {
      const c = e.color ?? ["m1", "m2", "m4", "m5", "m6", "m3"][i % 6];
      const g = h("div", { class: "tl-ev", style: { left: `${X(i)}px` } });
      let card = null, disc = null, icon = null;
      if (e.img) {
        card = h("div", { class: "tl-card", style: { width: `${cw + 20}px`, marginLeft: `${-(cw + 20) / 2}px` } });
        const im = h("div", { class: "im", style: { width: `${cw}px`, height: `${ch}px` } });
        im.append(h("img", { src: e.img, alt: e.title ?? "", style: { objectPosition: e.pos ?? "50% 50%", transformOrigin: e.pos ?? "50% 50%", transform: e.zoom ? `scale(${e.zoom})` : "none" } }));
        card.append(im);
        if (e.credit) card.append(h("div", { class: "tl-cr", text: e.credit, style: { maxWidth: `${cw}px` } }));
        g.append(card);
      } else if (e.icon) {
        const d = 150;
        disc = h("div", { class: "tl-disc", style: { width: `${d}px`, height: `${d}px`, marginLeft: `${-d / 2}px`, background: `var(--${c}-t)`, borderColor: `var(--${c})`, borderWidth: "6px" } });
        icon = ico(e.icon, 76, { color: `var(--${c}-d)`, stroke: 1.8, draw: true, tone: c });
        disc.append(icon);
        g.append(disc);
      }
      const dot = s("circle", { cx: X(i), cy: 0, r: 0, fill: `var(--${c})`, stroke: "var(--surface)", "stroke-width": 6 });
      svg.append(dot);
      const txt = h("div", { class: "tl-txt" });
      const y = h("div", { class: "tl-y", style: { color: `var(--${c}-d)` } });
      const tt = h("div", { class: "tl-t" });
      txt.append(y, tt);
      let sub = null;
      if (e.sub) { sub = h("div", { class: "tl-s" }); txt.append(sub); }
      g.append(txt);
      el.append(g);
      return {
        e, g, card, disc, icon, dot, i, tilt: i % 2 ? 2.4 : -2.4,
        tyY: mountTyping(y, String(e.year), { cps: 8, seed: 3 + i }),
        tyT: mountTyping(tt, e.title ?? "", { cps: 12, seed: 23 + i }),
        tyS: sub ? mountTyping(sub, e.sub, { cps: 15, seed: 41 + i }) : null,
      };
    });
    let head = null, tyH = null;
    if (p.heading) {
      head = h("div", { class: "tl-head", style: { left: `${p.heading.x ?? -W / 2}px`, top: `${p.heading.y ?? -470}px` } });
      el.append(head);
      tyH = mountTyping(head, p.heading.text, { cps: 11, seed: 2 });
    }
    const progKeys = [[at, -W / 2], ...p.events.map((e, i) => [e.at, X(i)])];

    return {
      duration: out,
      sfx: p.events.map((e) => ({ t: e.at, name: "pop", gain: -20 })),
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const o = clamp01((t - out) / 0.28);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        setStyle(el, "filter", o > 0.01 ? `blur(${(o * 8).toFixed(2)}px)` : "none");
        const a = cubicInOut(clamp01((t - at) / 0.8));
        setAttr(base, "x2", (-W / 2 + W * a).toFixed(1));
        setAttr(prog, "x2", track(t, progKeys, RUN).toFixed(1));
        if (tyH) tyH.render(t, p.heading.at ?? at);
        let latest = -1;
        for (const q of evs) if (t >= q.e.at) latest = q.i;
        for (const q of evs) {
          const ea = q.e.at;
          const pa = appear(t, ea, POP);
          setAttr(q.dot, "r", (16 * pa).toFixed(2));
          const dim = latest > q.i ? 0.86 : 1;
          const up = appear(t, ea + 0.08, POP);
          if (q.card) {
            setStyle(q.card, "opacity", (clamp01(up * 2) * dim).toFixed(3));
            setStyle(q.card, "transform", `translateY(${((1 - up) * 40).toFixed(2)}px) rotate(${(q.tilt * up).toFixed(2)}deg) scale(${(0.6 + 0.4 * up).toFixed(4)})`);
          }
          if (q.disc) {
            setStyle(q.disc, "opacity", (clamp01(up * 2) * dim).toFixed(3));
            setStyle(q.disc, "transform", `scale(${(0.3 + 0.7 * up).toFixed(4)})`);
            drawIcon(q.icon, cubicInOut(clamp01((t - ea - 0.2) / 0.7)));
          }
          q.tyY.render(t, ea + 0.05);
          q.tyT.render(t, ea + 0.1 + q.tyY.dur);
          if (q.tyS) q.tyS.render(t, ea + 0.15 + q.tyY.dur + q.tyT.dur);
          setStyle(q.g.querySelector(".tl-txt"), "opacity", dim.toFixed(2));
        }
      },
    };
  },
};
