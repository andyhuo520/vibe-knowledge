/**
 * Loop 循环：几个步骤围成一圈，一个令牌按旁白的时间点逐步走，每走完一圈计一轮，满足退出条件时收束。
 *
 * params
 *   r          半径，默认 170
 *   title      圆心标题，如「Agent 循环」；titleAt 给定时，标题到这个时刻才出现（「名」这一拍）
 *   steps      [{label, role, angle, lx?, ly?}]，angle 为度（屏幕坐标，0° 向右、90° 向下）；lx/ly 是标签相对圆点的偏移，用来避开连线
 *   arrivals   令牌依次到达各步骤的时刻（本地秒）；第 i 个时刻对应 steps[i % n]
 *   reveal     整体出现时刻
 *   passAt     退出时刻（如「测试通过」），passLabel 文案
 *   facts      挂在整个循环上的事实，用于课件「点图看出处」
 *   font       {title=34, step=30, sub=24}
 */
import { s, h, setStyle, setAttr, setText } from "../runtime/dom.js";
import { appear, track, hz } from "../runtime/spring.js";
import { applySwap, swap } from "../runtime/ease.js";

const CSS = `
.lp-svg{position:absolute;overflow:visible;pointer-events:none}
.lp-anchor{position:absolute;left:0;top:0;width:0;height:0}
.lp-label{position:absolute;white-space:nowrap;font-weight:600;color:var(--ink2);transform:translate(-50%,-50%)}
.lp-center{position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:6px;white-space:nowrap}
.lp-center .t{font-weight:700;color:var(--ink)}
.lp-center .sub{font-weight:500;color:var(--ink2)}
.lp-pass{position:absolute;left:0;top:0;display:flex;align-items:center;gap:12px;white-space:nowrap;font-weight:700;color:var(--ok)}
`;

const TOKEN = { w: hz(2.3), z: 0.9 };
const rad = (d) => (d * Math.PI) / 180;

export default {
  name: "Loop",
  create(root, p, ctx) {
    ctx.css("lp-css", CSS);
    const r = p.r ?? 170;
    const font = { title: 34, step: 30, sub: 24, ...(p.font ?? {}) };
    const steps = p.steps;
    const n = steps.length;
    const arrivals = p.arrivals ?? [];
    const reveal = p.reveal ?? 0;
    const uid = ctx.id.replace(/[^a-z0-9]/gi, "");

    // cumulative clockwise angles of successive arrivals
    const cum = [steps[0].angle];
    for (let i = 1; i <= arrivals.length; i++) {
      const a = steps[i % n].angle;
      let prev = cum[i - 1];
      let next = a;
      while (next <= prev) next += 360;
      cum.push(next);
    }
    const lead = 0.38;
    const keys = [[0, cum[0]], ...arrivals.slice(1).map((t, i) => [t - lead, cum[i + 1]])];

    const svg = s("svg", { class: "lp-svg", width: 2 * r + 200, height: 2 * r + 200, viewBox: `${-r - 100} ${-r - 100} ${2 * r + 200} ${2 * r + 200}` });
    Object.assign(svg.style, { left: `${-r - 100}px`, top: `${-r - 100}px` });
    // 箭头颜色不用 context-stroke：Chrome 会缓存 marker 的绘制，跨帧残留，破坏确定性；改为三种固定颜色按状态切换
    const mk = (id, color) => s("marker", { id, viewBox: "0 0 10 10", refX: 7, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto" },
      s("path", { d: "M0,0 L10,5 L0,10 z", style: `fill:${color}` }));
    svg.append(s("defs", {}, mk(`lpa-${uid}`, "var(--ink3)"), mk(`lpa-on-${uid}`, "var(--ink)"), mk(`lpa-ok-${uid}`, "var(--ok)")));
    const ring = s("circle", { cx: 0, cy: 0, r, style: "fill:none;stroke:var(--line);stroke-width:2" });
    svg.append(ring);
    // arcs between consecutive steps (drawn once, highlighted when travelled)
    const arcs = steps.map((st, i) => {
      const a0 = st.angle + 11;
      let a1 = steps[(i + 1) % n].angle - 11;
      while (a1 <= a0) a1 += 360;
      const large = a1 - a0 > 180 ? 1 : 0;
      const d = `M${r * Math.cos(rad(a0))},${r * Math.sin(rad(a0))} A${r},${r} 0 ${large} 1 ${r * Math.cos(rad(a1))},${r * Math.sin(rad(a1))}`;
      const path = s("path", { d, "marker-end": `url(#lpa-${uid})`, style: "fill:none;stroke:var(--ink3);stroke-width:3;stroke-linecap:round" });
      const len = (rad(a1 - a0) * r);
      svg.append(path);
      return { path, len };
    });
    const dots = steps.map((st) => {
      const c = s("circle", { cx: r * Math.cos(rad(st.angle)), cy: r * Math.sin(rad(st.angle)), r: 11, style: `fill:var(--bg);stroke:var(--${st.role});stroke-width:3` });
      svg.append(c);
      return c;
    });
    const token = s("circle", { r: 13, style: "fill:var(--hl)" });
    svg.append(token);
    root.append(svg);

    const anchor = h("div", { class: "lp-anchor" });
    root.append(anchor);
    const labels = steps.map((st) => {
      const el = h("div", { class: "lp-label", text: st.label });
      el.style.fontSize = `${font.step}px`;
      const ca = Math.cos(rad(st.angle));
      const sa = Math.sin(rad(st.angle));
      if (st.lx != null) {
        el.style.left = `${r * ca + st.lx}px`;
        el.style.top = `${r * sa + (st.ly ?? 0)}px`;
      } else {
        const off = r + 30 + font.step * 0.9 * Math.abs(ca);
        el.style.left = `${ca * off}px`;
        el.style.top = `${sa * (r + 30 + font.step * 0.6)}px`;
      }
      anchor.append(el);
      return el;
    });
    const center = h("div", { class: "lp-center" });
    const title = h("div", { class: "t", text: p.title ?? "" });
    title.style.fontSize = `${font.title}px`;
    const round = h("div", { class: "sub", text: "" });
    round.style.fontSize = `${font.sub}px`;
    center.append(title, round);
    const pass = h("div", { class: "lp-pass" });
    pass.innerHTML = `<svg width="${font.title * 1.3}" height="${font.title * 1.3}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m7 12.5 3.2 3.2L17 9"/></svg><span>${p.passLabel ?? "测试通过"}</span>`;
    pass.style.fontSize = `${font.title}px`;
    anchor.append(center, pass);

    const arrivalIndex = (t) => {
      let k = -1;
      for (let i = 0; i < arrivals.length; i++) if (t >= arrivals[i] - 0.05) k = i;
      return k;
    };

    return {
      beats: arrivals.map((t, i) => ({ t, id: `step:${i}`, label: steps[i % n].label })),
      render(t) {
        const a = appear(t, reveal);
        setStyle(svg, "opacity", a.toFixed(3));
        setStyle(anchor, "opacity", a.toFixed(3));
        setStyle(svg, "transform", `scale(${(0.94 + 0.06 * a).toFixed(4)})`);
        const theta = track(t, keys, TOKEN);
        setAttr(token, "cx", (r * Math.cos(rad(theta))).toFixed(2));
        setAttr(token, "cy", (r * Math.sin(rad(theta))).toFixed(2));
        const started = arrivals.length && t >= arrivals[0] - 0.4;
        setStyle(token, "opacity", started ? "1" : "0");
        const k = arrivalIndex(t);
        const active = k >= 0 ? k % n : -1;
        const passed = p.passAt != null ? appear(t, p.passAt) : 0;
        steps.forEach((st, i) => {
          const on = i === active && passed < 0.5;
          setStyle(labels[i], "color", on ? `var(--${st.role})` : "var(--ink2)");
          setAttr(dots[i], "r", on ? 15 : 11);
          setStyle(dots[i], "fill", on ? `var(--${st.role})` : "var(--bg)");
        });
        // the arc being travelled lights up
        const travelling = k >= 0 && k + 1 < arrivals.length && t >= arrivals[k + 1] - lead - 0.05 ? k % n : -1;
        arcs.forEach((arc, i) => {
          const on = i === travelling;
          setStyle(arc.path, "stroke", passed > 0.5 ? "var(--ok)" : on ? "var(--ink)" : "var(--ink3)");
          setStyle(arc.path, "stroke-width", on ? "4.5" : "3");
          setAttr(arc.path, "marker-end", `url(#lpa-${passed > 0.5 ? "ok-" : on ? "on-" : ""}${uid})`);
        });
        setStyle(ring, "stroke", passed > 0.5 ? "var(--ok)" : "var(--line)");
        const cycles = k < 0 ? 0 : Math.floor(k / n) + 1;
        setText(round, cycles > 0 ? `第 ${cycles} 轮` : p.sub ?? "");
        const sw = swap(t, -1, p.passAt ?? Infinity);
        applySwap(center, sw, "translate(-50%,-50%)");
        if (p.titleAt != null) {
          const ta = appear(t, p.titleAt);
          setStyle(title, "opacity", ta.toFixed(3));
          setStyle(title, "transform", `scale(${(0.9 + 0.1 * ta).toFixed(4)})`);
        }
        const sp = swap(t, p.passAt ?? Infinity, Infinity);
        applySwap(pass, sp, "translate(-50%,-50%)");
      },
      hotspots(t) {
        return (p.facts ?? []).length && t >= reveal ? [{ el: center, facts: p.facts, label: p.title }] : [];
      },
    };
  },
};
