/**
 * SystemMap 总图：节点 + 带动作标签的连线，支持逐个出现、点亮、压暗其他、打开（为推进下一层让路）。
 * 诚实编码：official 实线；inferred 虚线 + 「推断」；undisclosed 雾化填充 + 「未披露」。
 *
 * params
 *   nodes  [{id, label, sub?, subAt?, role, x, y, w=260, h=110, r=22, icon?, honesty?, facts?, ghost?, labelAt?}]
 *   edges  [{from, to, label?, labelSide?, honesty?, facts?, bend=0, both=false, gap=10}]   labelSide: above | below
 *   reveal {id | "from>to": t}   出现时刻（本地秒）；缺省 0
 *   lit    {id: [[t0, t1?], ...]}  点亮窗口
 *   dim    [[t0, t1, [keepIds]]]    压暗窗口：除 keepIds 外都变暗
 *   open   {id: t}                  打开节点：标签和底色淡出，给下一层内容让位
 *   close  {id: t}                  关上：镜头拉回后，标签和底色回来
 *   font   {label=34, sub=22, edge=24}
 */
import { s, h, setStyle, setAttr, icon } from "../runtime/dom.js";
import { appear, pulse, REVEAL } from "../runtime/spring.js";
import { mix } from "../runtime/ease.js";

const CSS = `
.sm-svg{position:absolute;overflow:visible;pointer-events:none}
.sm-anchor{position:absolute;left:0;top:0;width:0;height:0}
.sm-node{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:4px;white-space:nowrap}
.sm-node .row{display:flex;align-items:center;gap:12px;position:relative}
.sm-node .t{font-weight:650;color:var(--ink);letter-spacing:.01em;line-height:1.15}
.sm-node .t.lit{position:absolute;right:0;top:0;color:#fff;opacity:0}
.sm-node .sub{font-weight:450;color:var(--ink2);line-height:1.2}
.sm-edge{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;padding:3px 10px;border-radius:8px;
  background:var(--bg);color:var(--ink2);font-weight:500;line-height:1.3}
.sm-honest{position:absolute;transform:translate(-100%,-50%);white-space:nowrap;font-weight:600;letter-spacing:.08em;
  padding:3px 9px;border-radius:7px;background:var(--bg);color:var(--ink2);border:1.5px dashed var(--ink3)}
`;

const clipToRect = (cx, cy, dx, dy, hw, hh) => {
  if (hw <= 0 && hh <= 0) return [cx, cy];
  const tx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const ty = dy === 0 ? Infinity : hh / Math.abs(dy);
  const k = Math.min(tx, ty);
  return [cx + dx * k, cy + dy * k];
};

const quadLen = (p0, c, p1) => {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 24; i++) {
    const u = i / 24;
    const x = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0];
    const y = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1];
    len += Math.hypot(x - prev[0], y - prev[1]);
    prev = [x, y];
  }
  return len;
};

export default {
  name: "SystemMap",
  create(root, p, ctx) {
    ctx.css("sm-css", CSS);
    const font = { label: 34, sub: 22, edge: 24, ...(p.font ?? {}) };
    const nodes = p.nodes.map((n) => ({ w: 260, h: 110, r: 22, honesty: "official", facts: [], ...n }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const reveal = p.reveal ?? {};
    const uid = ctx.id.replace(/[^a-z0-9]/gi, "");

    const pad = 80;
    const xs = nodes.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2]);
    const ys = nodes.flatMap((n) => [n.y - n.h / 2, n.y + n.h / 2]);
    const [x0, y0] = [Math.min(...xs) - pad, Math.min(...ys) - pad];
    const [W, H] = [Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0];
    const svg = s("svg", { class: "sm-svg", width: W, height: H, viewBox: `${x0} ${y0} ${W} ${H}` });
    Object.assign(svg.style, { left: `${x0}px`, top: `${y0}px` });
    svg.append(s("defs", {},
      s("marker", { id: `arr-${uid}`, viewBox: "0 0 10 10", refX: 8.5, refY: 5, markerWidth: 5.5, markerHeight: 5.5, orient: "auto-start-reverse" },
        s("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:var(--ink2)" })),
      s("pattern", { id: `fog-${uid}`, width: 14, height: 14, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" },
        s("line", { x1: 0, y1: 0, x2: 0, y2: 14, style: "stroke:var(--ink3);stroke-width:3;opacity:.45" }))));
    const gEdges = s("g");
    const gNodes = s("g");
    svg.append(gEdges, gNodes);
    root.append(svg);
    const labels = h("div", { class: "sm-anchor" });
    root.append(labels);

    // ---- nodes ----
    const nodeEls = nodes.map((n) => {
      if (n.ghost) return { n };
      const frame = s("rect", {
        x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: n.r,
        style: `fill:${n.honesty === "undisclosed" ? `url(#fog-${uid})` : `var(--${n.role}-t)`};stroke:var(--${n.role});stroke-width:${n.focus ? 3.2 : 2.4}${n.honesty === "inferred" ? ";stroke-dasharray:12 9" : ""}`,
      });
      const litRect = s("rect", { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: n.r, style: `fill:var(--${n.role});opacity:0` });
      gNodes.append(frame, litRect);
      const label = h("div", { class: "sm-node" });
      const row = h("div", { class: "row" });
      if (n.icon) row.append(icon(n.icon, Math.round(font.label * 1.05), `var(--${n.role})`));
      const t1 = h("span", { class: "t", text: n.label });
      const t2 = h("span", { class: "t lit", text: n.label });
      t1.style.fontSize = t2.style.fontSize = `${font.label}px`;
      row.append(t1, t2);
      label.append(row);
      let sub = null;
      if (n.sub) {
        sub = h("span", { class: "sub", text: n.sub });
        sub.style.fontSize = `${font.sub}px`;
        label.append(sub);
      }
      const tl = n.labelAt === "tl";
      label.style.left = `${tl ? n.x - n.w / 2 + 34 : n.x}px`;
      label.style.top = `${tl ? n.y - n.h / 2 + 26 : n.y}px`;
      if (tl) label.style.alignItems = "flex-start";
      labels.append(label);
      let honest = null;
      if (n.honesty !== "official") {
        honest = h("div", { class: "sm-honest", text: n.honesty === "inferred" ? "推断" : "未披露" });
        honest.style.fontSize = `${Math.round(font.sub * 0.9)}px`;
        honest.style.left = `${n.x + n.w / 2 - 10}px`;
        honest.style.top = `${n.y - n.h / 2}px`;
        labels.append(honest);
      }
      return { n, frame, litRect, label, t1, t2, sub, honest, base: tl ? "translate(0,0)" : "translate(-50%,-50%)" };
    });

    // ---- edges ----
    const edgeEls = (p.edges ?? []).map((e) => {
      const a = byId[e.from];
      const b = byId[e.to];
      const gap = e.gap ?? 10;
      const d = [b.x - a.x, b.y - a.y];
      const L = Math.hypot(...d) || 1;
      const u = [d[0] / L, d[1] / L];
      const bend = e.bend ?? 0;
      const nrm = [-u[1], u[0]];
      const mid = [(a.x + b.x) / 2 + nrm[0] * bend, (a.y + b.y) / 2 + nrm[1] * bend];
      const dirA = bend ? [mid[0] - a.x, mid[1] - a.y] : d;
      const dirB = bend ? [b.x - mid[0], b.y - mid[1]] : d;
      const la = Math.hypot(...dirA) || 1;
      const lb = Math.hypot(...dirB) || 1;
      const p0 = clipToRect(a.x, a.y, dirA[0] / la, dirA[1] / la, a.ghost ? 0 : a.w / 2 + gap, a.ghost ? 0 : a.h / 2 + gap);
      const p1 = clipToRect(b.x, b.y, -dirB[0] / lb, -dirB[1] / lb, b.ghost ? 0 : b.w / 2 + gap, b.ghost ? 0 : b.h / 2 + gap);
      const dAttr = bend ? `M${p0[0]},${p0[1]} Q${mid[0]},${mid[1]} ${p1[0]},${p1[1]}` : `M${p0[0]},${p0[1]} L${p1[0]},${p1[1]}`;
      const len = bend ? quadLen(p0, mid, p1) : Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const path = s("path", { d: dAttr, style: `fill:none;stroke:var(--ink2);stroke-width:2.4;stroke-linecap:round${e.honesty === "inferred" ? ";stroke-dasharray:10 8" : ""}` });
      gEdges.append(path);
      let label = null;
      if (e.label) {
        const lm = bend ? [0.25 * p0[0] + 0.5 * mid[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * mid[1] + 0.25 * p1[1]] : [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        const below = e.labelSide === "below";
        const off = Math.abs(u[0]) >= Math.abs(u[1]) ? [0, (below ? 1 : -1) * font.edge * 0.95] : [font.edge * 0.6, 0];
        label = h("div", { class: "sm-edge", text: e.label });
        label.style.fontSize = `${font.edge}px`;
        label.style.left = `${lm[0] + (bend ? 0 : off[0])}px`;
        label.style.top = `${lm[1] + (bend ? 0 : off[1])}px`;
        if (!bend && off[0] > 0) label.style.transform = "translate(0,-50%)";
        labels.append(label);
      }
      const key = `${e.from}>${e.to}`;
      const t0 = reveal[key] ?? Math.max(reveal[e.from] ?? 0, reveal[e.to] ?? 0) + 0.3;
      return { e, path, len, label, t0, both: e.both };
    });

    const openAmount = (id, t) =>
      p.open?.[id] == null ? 0 : appear(t, p.open[id]) * (1 - (p.close?.[id] == null ? 0 : appear(t, p.close[id])));
    const litAmount = (id, t) => (p.lit?.[id] ?? []).reduce((acc, [a, b]) => acc + pulse(t, a, b ?? Infinity), 0);
    const dimAmount = (id, t) => (p.dim ?? []).reduce((acc, [a, b, keep]) => acc + (keep.includes(id) ? 0 : pulse(t, a, b)), 0);

    const beats = [
      ...nodes.filter((n) => !n.ghost).map((n) => ({ t: reveal[n.id] ?? 0, id: `reveal:${n.id}`, label: n.label })),
      ...Object.entries(p.open ?? {}).map(([id, t]) => ({ t, id: `open:${id}`, label: `推进：${byId[id]?.label ?? id}` })),
    ].sort((a, b) => a.t - b.t);

    return {
      beats,
      render(t) {
        for (const ne of nodeEls) {
          if (ne.n.ghost) continue;
          const { n } = ne;
          const a = appear(t, reveal[n.id] ?? 0);
          const o = openAmount(n.id, t);
          const lit = Math.min(1, litAmount(n.id, t));
          const dim = 1 - 0.68 * Math.min(1, dimAmount(n.id, t));
          const vis = a * dim;
          setStyle(ne.frame, "opacity", (vis * (1 - o)).toFixed(3));
          setStyle(ne.litRect, "opacity", (lit * 0.92 * a * (1 - o)).toFixed(3));
          setStyle(ne.label, "opacity", (vis * (1 - o)).toFixed(3));
          setStyle(ne.label, "transform", `${ne.base} translateY(${((1 - a) * 12).toFixed(2)}px) scale(${mix(0.96, 1, a).toFixed(4)})`);
          setStyle(ne.t2, "opacity", lit.toFixed(3));
          setStyle(ne.t1, "opacity", (1 - lit).toFixed(3));
          if (ne.honest) setStyle(ne.honest, "opacity", (vis * (1 - o)).toFixed(3));
          if (ne.sub && n.subAt != null) setStyle(ne.sub, "opacity", appear(t, n.subAt).toFixed(3));
        }
        for (const ed of edgeEls) {
          const e = appear(t, ed.t0);
          const dim = 1 - 0.68 * Math.min(1, Math.max(dimAmount(ed.e.from, t), dimAmount(ed.e.to, t)));
          const o = Math.max(openAmount(ed.e.from, t), openAmount(ed.e.to, t));
          if (ed.e.honesty === "inferred") setStyle(ed.path, "opacity", (e * dim * (1 - o)).toFixed(3));
          else {
            setAttr(ed.path, "stroke-dasharray", `${ed.len.toFixed(1)} ${ed.len.toFixed(1)}`);
            setAttr(ed.path, "stroke-dashoffset", (ed.len * (1 - e)).toFixed(1));
            setStyle(ed.path, "opacity", (dim * (1 - o)).toFixed(3));
          }
          const done = e > 0.96;
          setAttr(ed.path, "marker-end", done ? `url(#arr-${uid})` : "none");
          setAttr(ed.path, "marker-start", done && ed.both ? `url(#arr-${uid})` : "none");
          if (ed.label) setStyle(ed.label, "opacity", (appear(t, ed.t0 + 0.25) * dim * (1 - o)).toFixed(3));
        }
      },
      hotspots(t) {
        const out = [];
        for (const ne of nodeEls) if (ne.label && ne.n.facts.length && appear(t, reveal[ne.n.id] ?? 0) > 0.5) out.push({ el: ne.label, facts: ne.n.facts, label: ne.n.label });
        for (const ed of edgeEls) if (ed.label && (ed.e.facts ?? []).length && appear(t, ed.t0) > 0.5) out.push({ el: ed.label, facts: ed.e.facts, label: ed.e.label });
        return out;
      },
    };
  },
};
