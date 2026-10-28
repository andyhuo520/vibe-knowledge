/**
 * Sandbox 权限边界：一个由系统强制的边框，里面是工作区，右侧是几道「闸门」（能不能写、能不能联网、密钥在不在），
 * 越界时弹出审批。所有时刻为本地秒；render 为纯函数。
 *
 * params
 *   w, h, title, sub, subAt, icon      边框尺寸与左上角标题；subAt 给定时副标题到那一刻才出现
 *   frameAt                     边框描出来的时刻
 *   inner {label, sub, icon, files[]}   工作区（可选）
 *   gates [{label, state: scoped|closed|removed|open, note, at, facts}]
 *   ask {title, sub, at, buttons[], pressAt}   审批弹窗（可选）
 *   tag {text, at}              右下角小标签（如「macOS：Seatbelt」）
 */
import { h, s, setStyle, setAttr, icon } from "../runtime/dom.js";
import { appear, step, UI, PRESS, track } from "../runtime/spring.js";
import { applySwap, swap } from "../runtime/ease.js";

const CSS = `
.sb-svg{position:absolute;overflow:visible;pointer-events:none}
.sb-abs{position:absolute;white-space:nowrap}
.sb-title{display:flex;align-items:center;gap:16px}
.sb-title .t{font:700 44px/1.1 var(--sans);color:var(--ink)}
.sb-title .s{font:500 28px/1.3 var(--sans);color:var(--ink2);margin-top:6px}
.sb-ws{border-radius:26px;border:2.5px solid var(--env);background:var(--env-t);padding:30px 34px}
.sb-ws .l{display:flex;align-items:center;gap:14px;font:700 36px/1 var(--sans);color:var(--ink)}
.sb-ws .f{font:500 26px/1.8 var(--mono);color:var(--ink2);margin-top:14px}
.sb-gate{display:flex;align-items:center;gap:20px;border-radius:22px;border:2.5px solid var(--line);background:var(--surface);padding:22px 28px}
.sb-gate .ic{width:64px;height:64px;border-radius:18px;display:grid;place-items:center}
.sb-gate .l{font:700 34px/1 var(--sans);color:var(--ink)}
.sb-gate .n{font:600 28px/1 var(--sans);margin-top:10px}
.sb-ask{border-radius:28px;background:var(--surface);border:2.5px solid var(--boundary);box-shadow:var(--shadow);padding:34px 40px}
.sb-ask .t{display:flex;align-items:center;gap:14px;font:700 36px/1.2 var(--sans);color:var(--ink)}
.sb-ask .s{font:500 28px/1.4 var(--sans);color:var(--ink2);margin-top:12px}
.sb-ask .b{display:flex;gap:16px;margin-top:26px}
.sb-ask .b div{font:700 28px/1 var(--sans);padding:16px 30px;border-radius:16px;border:2px solid var(--line);color:var(--ink)}
.sb-ask .b div.primary{background:var(--boundary);border-color:var(--boundary);color:#fff}
.sb-tag{font:600 26px/1 var(--sans);letter-spacing:.06em;color:var(--ink2);padding:12px 18px;border-radius:12px;border:2px solid var(--line);background:var(--surface)}
`;

const STATE = {
  scoped: { icon: "check", color: "tool", note: "只限工作区" },
  closed: { icon: "lock", color: "boundary", note: "默认关闭" },
  removed: { icon: "key", color: "boundary", note: "开工前移除" },
  open: { icon: "globe", color: "tool", note: "按环境开启" },
};

export default {
  name: "Sandbox",
  create(root, p, ctx) {
    ctx.css("sb-css", CSS);
    const W = p.w ?? 1540;
    const H = p.h ?? 800;
    const frameAt = p.frameAt ?? 0;
    const per = 2 * (W + H);
    const svg = s("svg", { class: "sb-svg", width: W + 20, height: H + 20, viewBox: `${-W / 2 - 10} ${-H / 2 - 10} ${W + 20} ${H + 20}` });
    Object.assign(svg.style, { left: `${-W / 2 - 10}px`, top: `${-H / 2 - 10}px` });
    const fill = s("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 44, style: "fill:var(--boundary-t);stroke:none" });
    const edge = s("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 44, style: "fill:none;stroke:var(--boundary);stroke-width:4" });
    svg.append(fill, edge);
    root.append(svg);

    const subEl = p.sub ? h("div", { class: "s", text: p.sub }) : null;
    const title = h("div", { class: "sb-abs sb-title" }, icon(p.icon ?? "shield", 52, "var(--boundary)", 2),
      h("div", {}, h("div", { class: "t", text: p.title ?? "沙箱" }), subEl));
    Object.assign(title.style, { left: `${-W / 2 + 46}px`, top: `${-H / 2 + 40}px` });
    root.append(title);

    let ws = null;
    if (p.inner) {
      ws = h("div", { class: "sb-abs sb-ws" }, h("div", { class: "l" }, icon(p.inner.icon ?? "folder", 42, "var(--env)", 2), p.inner.label));
      if (p.inner.files) ws.append(h("div", { class: "f", text: p.inner.files.join("\n") }));
      ws.lastChild.style.whiteSpace = "pre";
      Object.assign(ws.style, { left: `${-W / 2 + 90}px`, top: `${-H / 2 + 200}px`, minWidth: "480px" });
      root.append(ws);
    }

    const gx = p.inner ? W / 2 - 90 : 0;
    const gates = (p.gates ?? []).map((g, i) => {
      const st = STATE[g.state] ?? STATE.closed;
      const ic = h("div", { class: "ic" }, icon(st.icon, 38, "#fff", 2.4));
      ic.style.background = `var(--${st.color})`;
      const n = h("div", { class: "n", text: g.note ?? st.note });
      n.style.color = `var(--${st.color})`;
      const el = h("div", { class: "sb-abs sb-gate" }, ic, h("div", {}, h("div", { class: "l", text: g.label }), n));
      const y = -H / 2 + 220 + i * 150;
      Object.assign(el.style, { left: `${gx}px`, top: `${y}px`, minWidth: "520px" });
      root.append(el);
      return { g, el, base: p.inner ? "translate(-100%,0)" : "translate(-50%,0)" };
    });

    let ask = null;
    if (p.ask) {
      ask = h("div", { class: "sb-abs sb-ask" },
        h("div", { class: "t" }, icon("shield", 40, "var(--boundary)", 2.2), p.ask.title),
        h("div", { class: "s", text: p.ask.sub ?? "" }),
        h("div", { class: "b" }, ...(p.ask.buttons ?? ["允许", "拒绝"]).map((b, i) => h("div", { class: i === 0 ? "primary" : "", text: b }))));
      Object.assign(ask.style, { left: "0px", top: `${p.ask.y ?? 40}px` });
      root.append(ask);
    }

    let tag = null;
    if (p.tag) {
      tag = h("div", { class: "sb-abs sb-tag", text: p.tag.text });
      Object.assign(tag.style, { right: "auto", left: `${W / 2 - 46}px`, top: `${H / 2 - 40}px` });
      root.append(tag);
    }

    const beats = [{ t: frameAt, id: "frame", label: p.title ?? "沙箱" }, ...(p.gates ?? []).map((g, i) => ({ t: g.at, id: `gate:${i}`, label: g.label }))];
    if (p.ask) beats.push({ t: p.ask.at, id: "ask", label: "审批" });

    return {
      beats,
      render(t) {
        const k = appear(t, frameAt, UI);
        setAttr(edge, "stroke-dasharray", `${per} ${per}`);
        setAttr(edge, "stroke-dashoffset", ((1 - k) * per).toFixed(1));
        setStyle(fill, "opacity", k.toFixed(3));
        applySwap(title, swap(t, frameAt + 0.2, Infinity, 0.25, 0.1));
        if (subEl && p.subAt != null) setStyle(subEl, "opacity", appear(t, p.subAt).toFixed(3));
        if (ws) applySwap(ws, swap(t, p.inner.at ?? frameAt + 0.4, Infinity, 0.25, 0.1));
        for (const { g, el, base } of gates) applySwap(el, swap(t, g.at, Infinity, 0.25, 0.1), base);
        if (ask) {
          const sw = swap(t, p.ask.at, p.ask.out ?? Infinity, 0.25, 0.12);
          const pop = 0.92 + 0.08 * step(t - p.ask.at, UI);
          applySwap(ask, sw, `translate(-50%,-50%) scale(${pop.toFixed(4)})`);
        }
        if (tag) applySwap(tag, swap(t, p.tag.at, Infinity, 0.25, 0.1), "translate(-100%,-100%)");
      },
      hotspots(t) {
        const out = [];
        if (p.facts?.length && t >= frameAt) out.push({ el: title, facts: p.facts, label: p.title ?? "沙箱" });
        for (const { g, el } of gates) if (g.facts?.length && t >= g.at) out.push({ el, facts: g.facts, label: g.label });
        if (ask && p.ask.facts?.length && t >= p.ask.at) out.push({ el: ask, facts: p.ask.facts, label: "审批" });
        return out;
      },
    };
  },
};
