/**
 * MindMap 思维导图（收尾用）：中心主题弹出，分支曲线从中心长出去，节点带自画图标、标签打字；最后撒一把小星星。
 * 以原点为中心；render 是纯函数。
 *
 * params
 *   center {label, icon, color, at}
 *   branches [{label, sub, icon, color, at, side: "l"|"r", y}]
 *   spread      节点中心到原点的水平距离（默认 560）
 *   node {w}    节点宽（默认 360）
 *   celebrate   撒星星的时刻（可选）
 *   out
 */
import { h, s, setStyle, setAttr } from "../runtime/dom.js";
import { appear, hz } from "../runtime/spring.js";
import { clamp01, cubicInOut, hash01 } from "../runtime/ease.js";
import { mountTyping, typingCss } from "../runtime/typing.js";
import { ico, drawIcon } from "../runtime/iconify.js";

const CSS = `
.mm{position:absolute;left:0;top:0}
.mm-c{position:absolute;left:0;top:0;display:flex;align-items:center;gap:22px;padding:26px 44px;border-radius:999px;border-style:solid;border-width:5px;white-space:nowrap;transform-origin:50% 50%}
.mm-c .l{font:800 50px/1.1 var(--sans);color:var(--ink)}
.mm-n{position:absolute;left:0;top:0;display:flex;align-items:center;gap:20px;padding:20px 26px;border-radius:28px;background:var(--surface);border-style:solid;border-width:4px;box-shadow:var(--shadow);white-space:nowrap}
.mm-n .d{flex:none;border-radius:50%;display:grid;place-items:center}
.mm-n .l{font:750 36px/1.2 var(--sans)}
.mm-n .s{font:500 24px/1.35 var(--sans);color:var(--ink2);margin-top:4px}
.mm-star{position:absolute;left:0;top:0;width:0;height:0}
`;
const POP = { w: hz(3.1), z: 0.52 };
const STAR = "M0 -1 C0.12 -0.12 0.12 -0.12 1 0 C0.12 0.12 0.12 0.12 0 1 C-0.12 0.12 -0.12 0.12 -1 0 C-0.12 -0.12 -0.12 -0.12 0 -1Z";

export default {
  name: "mindmap",
  create(root, p, ctx) {
    ctx.css("pr-mindmap", CSS);
    typingCss(ctx.css);
    const spread = p.spread ?? 560;
    const nw = p.node?.w ?? 360;
    const out = p.out ?? Infinity;
    const C = p.center;
    const cc = C.color ?? "m6";
    const el = h("div", { class: "mm" });
    root.append(el);

    const svg = s("svg", { width: 10, height: 10, style: { position: "absolute", left: 0, top: 0, overflow: "visible" } });
    el.append(svg);

    const center = h("div", { class: "mm-c", style: { background: `var(--${cc}-t)`, borderColor: `var(--${cc})` } });
    const cIcon = C.icon ? ico(C.icon, 64, { color: `var(--${cc}-d)`, stroke: 1.8, draw: true, tone: cc }) : null;
    if (cIcon) center.append(cIcon);
    const cLab = h("div", { class: "l" });
    center.append(cLab);
    el.append(center);
    const tyC = mountTyping(cLab, C.label, { cps: 10, seed: 3 });
    // 中心宽度要等字体排好才知道，先按字数估
    const cHalf = 44 + (cIcon ? 43 : 0) + 25 * Array.from(C.label).length;

    const brs = p.branches.map((b, i) => {
      const c = b.color ?? ["m1", "m2", "m4", "m5", "m3", "m6"][i % 6];
      const sg = b.side === "l" ? -1 : 1;
      const x = sg * spread, y = b.y ?? 0;
      const sx = sg * cHalf, ex = x - sg * (nw / 2);
      const mx = sg * (cHalf + (spread - nw / 2 - cHalf) * 0.5);
      const path = s("path", { d: `M${sx} 0 C${mx} 0 ${mx} ${y} ${ex} ${y}`, fill: "none", stroke: `var(--${c})`, "stroke-width": 8,
        "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 });
      svg.append(path);
      const node = h("div", { class: "mm-n", style: { width: `${nw}px`, borderColor: `var(--${c})`, left: `${x - nw / 2}px` } });
      const d = h("div", { class: "d", style: { width: "74px", height: "74px", background: `var(--${c}-t)` } });
      const icon = ico(b.icon, 42, { color: `var(--${c}-d)`, stroke: 2, draw: true, tone: c });
      d.append(icon);
      const col = h("div");
      const lab = h("div", { class: "l", style: { color: `var(--${c}-d)` } });
      col.append(lab);
      let sub = null;
      if (b.sub) { sub = h("div", { class: "s" }); col.append(sub); }
      node.append(d, col);
      el.append(node);
      return { b, c, y, path, node, icon, tyL: mountTyping(lab, b.label, { cps: 11, seed: 13 + i }), tyS: sub ? mountTyping(sub, b.sub, { cps: 15, seed: 29 + i }) : null };
    });

    const stars = [];
    if (p.celebrate != null) {
      for (let i = 0; i < 14; i++) {
        const th = hash01(i, 5) * Math.PI * 2;
        const r = 260 + hash01(i, 9) * 420;
        const st = h("div", { class: "mm-star", style: { left: `${(Math.cos(th) * r * 1.25).toFixed(1)}px`, top: `${(Math.sin(th) * r * 0.62).toFixed(1)}px` } });
        const sz = 16 + hash01(i, 13) * 22;
        const sv = s("svg", { width: sz * 2, height: sz * 2, viewBox: "-1 -1 2 2", style: { position: "absolute", left: `${-sz}px`, top: `${-sz}px`, overflow: "visible" } });
        sv.append(s("path", { d: STAR, fill: `var(--m${1 + (i % 6)})` }));
        st.append(sv);
        el.append(st);
        stars.push({ st, t0: p.celebrate + i * 0.045, rot: hash01(i, 21) * 90 });
      }
    }

    return {
      duration: out,
      sfx: [{ t: C.at ?? 0, name: "pop", gain: -18 }, ...p.branches.map((b) => ({ t: b.at + 0.3, name: "pop", gain: -22 })),
        ...(p.celebrate != null ? [{ t: p.celebrate, name: "ding", gain: -17 }] : [])],
      render(t) {
        const cAt = C.at ?? 0;
        const vis = t >= cAt - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const o = clamp01((t - out) / 0.28);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        const a = appear(t, cAt, POP);
        setStyle(center, "transform", `translate(-50%,-50%) scale(${(0.3 + 0.7 * a).toFixed(4)})`);
        setStyle(center, "opacity", clamp01(a * 2).toFixed(3));
        if (cIcon) drawIcon(cIcon, cubicInOut(clamp01((t - cAt - 0.1) / 0.7)));
        tyC.render(t, cAt + 0.25);
        for (const q of brs) {
          const ba = q.b.at;
          q.path.setAttribute("stroke-dashoffset", (1 - cubicInOut(clamp01((t - ba) / 0.5))).toFixed(4));
          const na = appear(t, ba + 0.3, POP);
          setStyle(q.node, "top", `${q.y}px`);
          setStyle(q.node, "transform", `translateY(-50%) scale(${(0.4 + 0.6 * na).toFixed(4)})`);
          setStyle(q.node, "opacity", clamp01(na * 2).toFixed(3));
          drawIcon(q.icon, cubicInOut(clamp01((t - ba - 0.4) / 0.6)));
          q.tyL.render(t, ba + 0.45);
          if (q.tyS) q.tyS.render(t, ba + 0.55 + q.tyL.dur);
        }
        for (const st of stars) {
          const sa = appear(t, st.t0, POP);
          const fade = 1 - clamp01((t - st.t0 - 1.1) / 0.6);
          setStyle(st.st, "opacity", (clamp01(sa * 2) * fade).toFixed(3));
          setStyle(st.st, "transform", `scale(${sa.toFixed(3)}) rotate(${(st.rot + (t - st.t0) * 40).toFixed(1)}deg)`);
          setStyle(st.st, "display", t >= st.t0 - 0.05 && fade > 0 ? "" : "none");
        }
      },
    };
  },
};
