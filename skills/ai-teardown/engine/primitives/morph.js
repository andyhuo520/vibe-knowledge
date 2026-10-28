/**
 * Morph 单形状变形：一个形状从头到尾不切，尺寸、圆角、描边颜色都由弹簧驱动；
 * 每个状态的内容用短模糊进出，进出窗口错开，新旧文字不会重叠。
 * 形状从一个总图节点长出（from），演完缩回它；颜色跟着「谁在动」走语义色。
 *
 * params
 *   from     {w, h, r, role}          起止形状，应与锚定节点一致，交接才无缝
 *   states   [{kind, t, w, h, r, role, ...内容参数}]   t 为本地秒
 *   end      缩回 from 的时刻
 *   presses  [[t0, t1]]               形状被按下的时刻（轻微缩放）
 *
 * 内容种类（状态库）：input · loader · terminal · diff · approve · toast
 * 新增种类：在 KINDS 里加一个 build(state) → {el, render(dt)}，dt 为进入该状态后的秒数。
 */
import { h, s, setStyle, setText, icon } from "../runtime/dom.js";
import { track, trackColor, trackCfg, step, UI, PRESS, LEAD, TRAIL } from "../runtime/spring.js";
import { applySwap, swap, typedCount, clamp01, mix } from "../runtime/ease.js";

const CSS = `
.mo-shape{position:absolute;left:0;top:0;overflow:hidden;background:var(--surface);border-style:solid;box-shadow:var(--shadow)}
.mo-layer{position:absolute;left:50%;top:50%;white-space:nowrap}
.mo-input{display:flex;align-items:center;gap:18px}
.mo-input .g{font:600 36px/1 var(--mono);color:var(--user)}
.mo-input .txt{flex:1;font:500 34px/1 var(--sans);color:var(--ink)}
.mo-input .caret{display:inline-block;width:3px;height:38px;background:var(--user);vertical-align:-7px;margin-left:3px}
.mo-input .send{width:64px;height:64px;border-radius:32px;background:var(--user);display:grid;place-items:center}
.mo-term{width:600px}
.mo-head{display:flex;align-items:center;gap:10px;padding-bottom:12px;margin-bottom:12px;border-bottom:1.5px solid var(--line);font:500 22px/1.4 var(--mono);color:var(--ink3)}
.mo-head i{width:12px;height:12px;border-radius:6px;background:var(--line);display:inline-block}
.mo-line{font:500 26px/1.55 var(--mono);color:var(--ink2)}
.mo-line.cmd{color:var(--ink)} .mo-line.err{color:var(--err)} .mo-line.ok{color:var(--ok)}
.mo-diff .mo-line.del{color:var(--boundary);text-decoration:line-through;text-decoration-thickness:2px}
.mo-diff .mo-line.add{color:var(--tool)}
.mo-approve{display:flex;align-items:center;gap:26px;font:650 32px/1 var(--sans);color:var(--ink)}
.mo-toggle{position:relative;width:104px;height:58px;border-radius:29px}
.mo-knob{position:absolute;top:7px;height:44px;border-radius:22px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.mo-toast{display:flex;align-items:center;gap:22px}
.mo-toast .ic{width:68px;height:68px;border-radius:34px;display:grid;place-items:center;background:var(--user)}
.mo-toast .tt{font:700 32px/1.2 var(--sans);color:var(--ink)}
.mo-toast .ss{font:500 22px/1.3 var(--mono);color:var(--ink2);margin-top:6px}
`;

const KINDS = {
  input(st) {
    const el = h("div", { class: "mo-layer mo-input" });
    el.style.width = `${st.w - 56}px`;
    const g = h("span", { class: "g", text: "›" });
    const txt = h("span", { class: "txt" });
    const typed = h("span");
    const caret = h("span", { class: "caret" });
    txt.append(typed, caret);
    const send = h("div", { class: "send" }, icon("up", 30, "#fff", 2.4));
    el.append(g, txt, send);
    const press = [[0, 1], ...(st.sendAt != null ? [[st.sendAt, 0.86], [st.sendAt + 0.12, 1]] : [])];
    return {
      el,
      render(dt) {
        const n = typedCount(st.text, st.typeAt ?? 0.12, st.cps ?? 18, dt, 7);
        setText(typed, Array.from(st.text).slice(0, n).join(""));
        const typing = n < Array.from(st.text).length;
        setStyle(caret, "opacity", typing || Math.floor(dt * 2.4) % 2 === 0 ? "1" : "0");
        setStyle(send, "transform", `scale(${track(dt, press, PRESS).toFixed(3)})`);
      },
    };
  },
  loader(st) {
    const el = h("div", { class: "mo-layer" });
    const svg = s("svg", { width: 96, height: 96, viewBox: "0 0 96 96", style: "display:block" },
      s("circle", { cx: 48, cy: 48, r: 38, style: "fill:none;stroke:var(--line);stroke-width:7" }),
      s("path", { d: "M48 10 A38 38 0 0 1 86 48", style: `fill:none;stroke:var(--${st.role});stroke-width:7;stroke-linecap:round` }));
    el.append(svg);
    return { el, render(dt) { setStyle(svg, "transform", `rotate(${((dt * 330) % 360).toFixed(1)}deg)`); } };
  },
  terminal(st) {
    const el = h("div", { class: "mo-layer mo-term" });
    const head = h("div", { class: "mo-head" }, h("i"), h("i"), h("i"), h("span", { text: st.title ?? "终端" }));
    el.append(head);
    const lines = st.lines.map((ln) => {
      const d = h("div", { class: `mo-line ${ln.kind ?? "out"}` });
      el.append(d);
      return { ln, d };
    });
    return {
      el,
      render(dt) {
        for (const { ln, d } of lines) {
          const vis = dt >= ln.at;
          setStyle(d, "opacity", vis ? "1" : "0");
          const text = ln.kind === "cmd" ? `$ ${ln.text}` : ln.text;
          const n = ln.kind === "cmd" ? typedCount(text, ln.at, 40, dt, 3) : Array.from(text).length;
          setText(d, Array.from(text).slice(0, n).join(""));
        }
      },
    };
  },
  diff(st) {
    const el = h("div", { class: "mo-layer mo-term mo-diff" });
    el.append(h("div", { class: "mo-head" }, icon("file", 22, "var(--ink3)", 2), h("span", { text: st.file })));
    const lines = st.lines.map((ln) => {
      const d = h("div", { class: `mo-line ${ln.k === "+" ? "add" : ln.k === "-" ? "del" : ""}`, text: `${ln.k === " " ? " " : ln.k} ${ln.text}` });
      el.append(d);
      return { ln, d };
    });
    return {
      el,
      render(dt) {
        for (const { ln, d } of lines) {
          const a = clamp01((dt - ln.at) / 0.12);
          setStyle(d, "opacity", a.toFixed(3));
          setStyle(d, "transform", `translateX(${((1 - a) * -14).toFixed(1)}px)`);
        }
      },
    };
  },
  approve(st, ctx) {
    const el = h("div", { class: "mo-layer mo-approve" });
    const toggle = h("div", { class: "mo-toggle" });
    const knob = h("div", { class: "mo-knob" });
    toggle.append(knob);
    el.append(h("span", { text: st.text ?? "批准改动" }), toggle);
    const off = ctx.theme.line.startsWith("#") ? ctx.theme.line : "#2A3963";
    const on = ctx.theme.tool;
    return {
      el,
      render(dt) {
        const at = st.toggleAt ?? 0.45;
        const left = trackCfg(dt, [[0, 7], [at, 53, TRAIL]]);
        const right = trackCfg(dt, [[0, 51], [at, 97, LEAD]]);
        setStyle(knob, "left", `${left.toFixed(2)}px`);
        setStyle(knob, "width", `${(right - left).toFixed(2)}px`);
        setStyle(toggle, "background", trackColor(dt, [[0, off], [at, on]]));
      },
    };
  },
  toast(st) {
    const el = h("div", { class: "mo-layer mo-toast" });
    const ic = h("div", { class: "ic" }, icon(st.icon ?? "git", 36, "#fff", 2));
    const txt = h("div", {}, h("div", { class: "tt", text: st.title }), h("div", { class: "ss", text: st.sub ?? "" }));
    el.append(ic, txt);
    return {
      el,
      render(dt) {
        const k = step(dt - 0.05, UI);
        setStyle(ic, "transform", `scale(${mix(0.6, 1, k).toFixed(3)})`);
      },
    };
  },
};

export default {
  name: "Morph",
  create(root, p, ctx) {
    ctx.css("mo-css", CSS);
    const from = p.from;
    const states = p.states;
    const end = p.end ?? (states.at(-1).t + 1);
    const shape = h("div", { class: "mo-shape" });
    root.append(shape);
    const layers = states.map((st, i) => {
      const k = KINDS[st.kind];
      if (!k) throw new Error(`Morph: unknown kind ${st.kind}`);
      const inst = k(st, ctx);
      shape.append(inst.el);
      const tout = i + 1 < states.length ? states[i + 1].t - 0.03 : end - 0.05;
      return { st, inst, tin: st.t + 0.1, tout };
    });
    const hex = (role) => ctx.theme[role];
    const W = [[0, from.w], ...states.map((st) => [st.t, st.w]), [end, from.w]];
    const H = [[0, from.h], ...states.map((st) => [st.t, st.h]), [end, from.h]];
    const R = [[0, from.r], ...states.map((st) => [st.t, st.r]), [end, from.r]];
    const C = [[0, hex(from.role)], ...states.map((st) => [st.t, hex(st.role)]), [end, hex(from.role)]];
    const P = [[0, 1]];
    for (const [a, b] of p.presses ?? []) P.push([a, 0.985], [b, 1]);

    return {
      states,
      beats: states.map((st, i) => ({ t: st.t, id: `state:${i}`, label: st.label ?? st.kind })),
      /** Geometry at local time t, for camera fitting by the caller. */
      geometry(t) {
        return { w: track(t, W), h: track(t, H), r: track(t, R) };
      },
      render(t) {
        const w = track(t, W);
        const hh = track(t, H);
        const r = Math.max(0, Math.min(track(t, R), w / 2, hh / 2));
        const sc = track(t, P, PRESS);
        const vis = clamp01((end + 0.35 - t) / 0.15);
        Object.assign(shape.style, {
          width: `${w.toFixed(2)}px`,
          height: `${hh.toFixed(2)}px`,
          borderRadius: `${r.toFixed(2)}px`,
          borderWidth: "3px",
          borderColor: trackColor(t, C),
          transform: `translate(${(-w / 2).toFixed(2)}px, ${(-hh / 2).toFixed(2)}px) scale(${sc.toFixed(4)})`,
          opacity: vis.toFixed(3),
        });
        for (const L of layers) {
          const sw = swap(t, L.tin, L.tout);
          applySwap(L.inst.el, sw, "translate(-50%,-50%)");
          if (sw.visible) L.inst.render(t - L.st.t);
        }
      },
    };
  },
};
