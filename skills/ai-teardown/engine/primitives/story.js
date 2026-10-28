/**
 * 讲故事用的原语：ChatMock 对话窗 · HypeCurve 热度起伏曲线 · BarCompare 数字对比条 · Avatars 人物头像排。
 * 都以场景原点为中心；时间参数是本地秒；render 是纯函数。
 */
import { h, s, setStyle, setAttr } from "../runtime/dom.js";
import { appear, hz, track, UI } from "../runtime/spring.js";
import { clamp01, cubicInOut, mix } from "../runtime/ease.js";
import { mountTyping, typingCss, typingSfx } from "../runtime/typing.js";
import { ico, drawIcon } from "../runtime/iconify.js";

const CSS = `
.cm{position:absolute;left:0;top:0;transform:translate(-50%,-50%);background:var(--surface);border-radius:30px;box-shadow:var(--shadow);overflow:hidden;border:2px solid var(--line)}
.cm-head{display:flex;align-items:center;gap:12px;padding:18px 26px;border-bottom:2px solid var(--line);font:700 28px/1 var(--sans);color:var(--ink)}
.cm-head i{width:12px;height:12px;border-radius:50%;background:var(--m4);display:block}
.cm-head span{margin-left:auto;font:500 20px/1 var(--sans);color:var(--ink3)}
.cm-body{display:flex;flex-direction:column;gap:18px;padding:26px 26px 30px}
.cm-row{display:flex;align-items:flex-end;gap:14px}
.cm-row.r{flex-direction:row-reverse}
.cm-av{flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;overflow:hidden}
.cm-av img{width:100%;height:100%;object-fit:cover}
.cm-col{display:flex;flex-direction:column;gap:6px;max-width:74%}
.cm-row.r .cm-col{align-items:flex-end}
.cm-who{font:600 19px/1 var(--sans);color:var(--ink3);padding:0 6px}
.cm-b{font:500 32px/1.45 var(--sans);color:var(--ink);padding:16px 22px;border-radius:24px;background:var(--surface2)}
.cm-row.l .cm-b{border-bottom-left-radius:8px}
.cm-row.r .cm-b{border-bottom-right-radius:8px}
.cm-dots{display:flex;gap:7px;padding:22px 24px;border-radius:24px;background:var(--surface2)}
.cm-dots i{width:11px;height:11px;border-radius:50%;background:var(--ink3);display:block}
.hc{position:absolute;left:0;top:0}
.hc-lab{position:absolute;left:0;top:0;white-space:nowrap;font:700 30px/1.2 var(--sans);transform:translate(-50%,-50%)}
.hc-lab small{display:block;font:500 21px/1.3 var(--sans);color:var(--ink2);margin-top:4px}
.hc-yr{position:absolute;top:0;font:600 22px/1 var(--sans);color:var(--ink3);transform:translateX(-50%)}
.hc-note{position:absolute;font:500 20px/1 var(--sans);color:var(--ink3);padding:8px 12px;border:1.5px dashed var(--line);border-radius:10px;background:var(--surface)}
.bc{position:absolute;left:0;top:0;transform:translate(-50%,-50%)}
.bc-title{font:750 40px/1.25 var(--sans);color:var(--ink);margin-bottom:8px}
.bc-sub{font:500 24px/1.3 var(--sans);color:var(--ink2);margin-bottom:26px}
.bc-row{display:grid;grid-template-columns:230px 1fr;align-items:center;gap:20px;margin-top:22px}
.bc-lab{font:700 30px/1.2 var(--sans);color:var(--ink);text-align:right}
.bc-lab small{display:block;font:500 20px/1.3 var(--sans);color:var(--ink3)}
.bc-track{position:relative;height:66px;border-radius:18px;background:var(--surface2)}
.bc-bar{position:absolute;left:0;top:0;bottom:0;border-radius:18px;transform-origin:0 50%}
.bc-val{position:absolute;top:50%;transform:translateY(-50%);font:800 36px/1 var(--sans);font-variant-numeric:tabular-nums;white-space:nowrap}
.bc-src{margin-top:22px;font:500 19px/1.4 var(--sans);color:var(--ink3)}
.av{position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center}
.av-row{display:flex;align-items:flex-start}
.av-it{display:flex;flex-direction:column;align-items:center;width:250px}
.av-ph{border-radius:50%;overflow:hidden;border:7px solid var(--surface);box-shadow:var(--shadow);outline-style:solid;outline-width:4px;outline-offset:0}
.av-ph img{display:block;width:100%;height:100%;object-fit:cover}
.av-ph.none{display:grid;place-items:center}
.av-n{font:750 32px/1.2 var(--sans);color:var(--ink);margin-top:16px;white-space:nowrap}
.av-s{font:500 22px/1.35 var(--sans);color:var(--ink2);margin-top:4px;text-align:center}
.av-cr{margin-top:20px;font:500 17px/1.4 var(--sans);color:var(--ink3);text-align:center;max-width:1100px}
`;
const POP = { w: hz(3.2), z: 0.55 };
const exitOf = (t, out) => clamp01((t - out) / 0.28);

/**
 * ChatMock 对话窗（界面示意）：消息依次出现，先冒「正在输入」三个点，再逐字打出。
 * params
 *   w, title, sub      窗口宽度、标题、右上角小字
 *   people {l: {name, icon|img, color}, r: {...}}   左右两方
 *   messages [{side: "l"|"r", text, at, cps, typing: 0.6}]   typing 为「正在输入」持续秒数（0 表示不显示）
 *   at, out
 */
export const ChatMock = {
  name: "chatmock",
  create(root, p, ctx) {
    ctx.css("pr-story", CSS);
    typingCss(ctx.css);
    const at = p.at ?? 0, out = p.out ?? Infinity;
    const el = h("div", { class: "cm", style: { width: `${p.w ?? 900}px` } });
    const head = h("div", { class: "cm-head" }, h("i"), p.title ?? "对话", p.sub ? h("span", { text: p.sub }) : null);
    const body = h("div", { class: "cm-body" });
    el.append(head, body);
    root.append(el);
    const av = (who) => {
      const c = who?.color ?? "m5";
      const d = h("div", { class: "cm-av", style: { background: `var(--${c}-t)` } });
      if (who?.img) d.append(h("img", { src: who.img, alt: who.name ?? "" }));
      else if (who?.icon) d.append(ico(who.icon, 34, { color: `var(--${c}-d)`, tone: c }));
      return d;
    };
    const msgs = p.messages.map((m, i) => {
      const who = p.people?.[m.side] ?? {};
      const row = h("div", { class: `cm-row ${m.side}` });
      const col = h("div", { class: "cm-col" });
      if (who.name) col.append(h("div", { class: "cm-who", text: who.name }));
      const b = h("div", { class: "cm-b", style: m.side === "r" ? { background: `var(--${who.color ?? "m6"}-t)` } : {} });
      const dots = h("div", { class: "cm-dots" }, h("i"), h("i"), h("i"));
      col.append(dots, b);
      row.append(av(who), col);
      body.append(row);
      const ty = mountTyping(b, m.text, { cps: m.cps ?? 14, seed: 71 + i });
      const tIn = m.typing ?? 0.6;
      return { m, row, b, dots, ty, t0: m.at + tIn, tIn };
    });
    return {
      duration: out,
      sfx: msgs.flatMap((q) => typingSfx(q.ty, q.t0, { every: 3, gain: -29, seed: q.m.at * 10 })),
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const a = appear(t, at, POP), o = exitOf(t, out);
        setStyle(el, "opacity", (clamp01(a * 2) * (1 - o)).toFixed(3));
        setStyle(el, "transform", `translate(-50%,-50%) translateY(${((1 - a) * 30).toFixed(2)}px) scale(${(0.94 + 0.06 * a).toFixed(4)})`);
        for (const q of msgs) {
          const on = t >= q.m.at;
          setStyle(q.row, "display", on ? "" : "none");
          if (!on) continue;
          const typing = q.tIn > 0 && t < q.t0;
          setStyle(q.dots, "display", typing ? "" : "none");
          setStyle(q.b, "display", typing ? "none" : "");
          if (typing) {
            const ds = q.dots.children;
            for (let k = 0; k < 3; k++) setStyle(ds[k], "transform", `translateY(${(-6 * Math.max(0, Math.sin((t - q.m.at) * 9 - k * 0.9))).toFixed(2)}px)`);
          }
          const ra = appear(t, q.m.at, POP);
          setStyle(q.row, "transform", `translateY(${((1 - ra) * 16).toFixed(2)}px)`);
          setStyle(q.row, "opacity", clamp01(ra * 2).toFixed(3));
          q.ty.render(t, q.t0);
        }
      },
    };
  },
};

/** 过一组点的平滑曲线（Catmull-Rom 转三次贝塞尔） */
const smooth = (pts) => {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

/**
 * HypeCurve 热度起伏曲线（示意，不是数据）：从左往右画出来，经过的高峰和低谷依次弹出标签。
 * params
 *   w, h                 画布尺寸
 *   domain [x0, x1]      横轴年份范围
 *   points [[年份, 0..1]] 热度走势（示意）
 *   labels [{x: 年份, text, sub, kind: "peak"|"trough", color}]
 *   ticks [年份]          横轴刻度
 *   at, dur, out, note   note 是右上角的「示意」说明
 */
export const HypeCurve = {
  name: "hypecurve",
  create(root, p, ctx) {
    ctx.css("pr-story", CSS);
    typingCss(ctx.css);
    const W = p.w ?? 1500, H = p.h ?? 520;
    const [x0, x1] = p.domain;
    const X = (yr) => -W / 2 + ((yr - x0) / (x1 - x0)) * W;
    const Y = (v) => H / 2 - v * H;
    const at = p.at ?? 0, dur = p.dur ?? 4, out = p.out ?? Infinity;
    const el = h("div", { class: "hc" });
    const svg = s("svg", { width: W + 80, height: H + 80, viewBox: `${-W / 2 - 40} ${-H / 2 - 40} ${W + 80} ${H + 80}`,
      style: { position: "absolute", left: `${-W / 2 - 40}px`, top: `${-H / 2 - 40}px`, overflow: "visible" } });
    const pts = p.points.map(([yr, v]) => [X(yr), Y(v)]);
    const d = smooth(pts);
    const area = s("path", { d: `${d} L${pts.at(-1)[0]} ${H / 2} L${pts[0][0]} ${H / 2} Z`, fill: "var(--m6-t)", opacity: 0 });
    const base = s("line", { x1: -W / 2, y1: H / 2, x2: W / 2, y2: H / 2, stroke: "var(--line)", "stroke-width": 5, "stroke-linecap": "round" });
    const line = s("path", { d, fill: "none", stroke: "var(--m6)", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round",
      pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 });
    svg.append(area, base, line);
    el.append(svg);
    for (const yr of p.ticks ?? []) el.append(h("div", { class: "hc-yr", text: String(yr), style: { left: `${X(yr)}px`, top: `${H / 2 + 40}px` } }));
    // 画到某一年份所用的时间：按横向位置近似（曲线横向单调）
    const tAtX = (yr) => at + dur * clamp01((yr - x0) / (x1 - x0));
    const labs = (p.labels ?? []).map((lb, i) => {
      const c = lb.color ?? (lb.kind === "trough" ? "m5" : "m1");
      const v = p.points.reduce((best, q) => (Math.abs(q[0] - lb.x) < Math.abs(best[0] - lb.x) ? q : best))[1];
      const px = X(lb.x), py = Y(v);
      const dot = s("circle", { cx: px, cy: py, r: 0, fill: `var(--${c})`, stroke: "var(--surface)", "stroke-width": 6 });
      svg.append(dot);
      const lab = h("div", { class: "hc-lab", style: { left: `${px}px`, top: `${py + (lb.kind === "trough" ? 62 : -70)}px`, color: `var(--${c}-d)` } });
      const tx = h("span"); lab.append(tx);
      const ty = mountTyping(tx, lb.text, { cps: 12, seed: 91 + i });
      let tys = null;
      if (lb.sub) { const sm = h("small"); lab.append(sm); tys = mountTyping(sm, lb.sub, { cps: 16, seed: 97 + i }); }
      el.append(lab);
      return { lb, dot, lab, ty, tys, t0: lb.at ?? tAtX(lb.x) };
    });
    let note = null;
    // 「示意」说明放左上角，右上角常有最新的高峰标签
    if (p.note) { note = h("div", { class: "hc-note", text: p.note, style: { top: `${-H / 2 - 60}px`, left: `${-W / 2}px` } }); el.append(note); }
    root.append(el);
    return {
      duration: out,
      sfx: labs.map((q) => ({ t: q.t0, name: "pop", gain: -22 })),
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const o = exitOf(t, out);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        const pr = clamp01((t - at) / dur);
        setAttr(line, "stroke-dashoffset", (1 - pr).toFixed(4));
        setAttr(area, "opacity", (0.7 * clamp01((t - at - dur) / 0.8)).toFixed(3));
        if (note) setStyle(note, "opacity", clamp01(appear(t, at, UI)).toFixed(3));
        for (const q of labs) {
          const a = appear(t, q.t0, POP);
          setAttr(q.dot, "r", (15 * a).toFixed(2));
          setStyle(q.lab, "opacity", clamp01(a * 2).toFixed(3));
          q.ty.render(t, q.t0 + 0.05);
          if (q.tys) q.tys.render(t, q.t0 + 0.15 + q.ty.dur);
        }
      },
    };
  },
};

/**
 * BarCompare 数字对比条：几根横条依次长出来，数字跟着往上数。数字必须有出处（src）。
 * params
 *   title, sub, src      标题、说明、出处小字
 *   items [{label, sub, value, unit, color, at, digits}]
 *   max, w, at, out
 */
export const BarCompare = {
  name: "barcompare",
  create(root, p, ctx) {
    ctx.css("pr-story", CSS);
    typingCss(ctx.css);
    const at = p.at ?? 0, out = p.out ?? Infinity;
    const max = p.max ?? Math.max(...p.items.map((i) => i.value));
    const el = h("div", { class: "bc", style: { width: `${p.w ?? 1200}px` } });
    const tt = h("div", { class: "bc-title" }), sb = h("div", { class: "bc-sub" });
    el.append(tt, sb);
    const tyT = mountTyping(tt, p.title ?? "", { cps: 12, seed: 5 });
    const tyS = mountTyping(sb, p.sub ?? "", { cps: 16, seed: 6 });
    const rows = p.items.map((it, i) => {
      const c = it.color ?? ["m2", "m6", "m4", "m5"][i % 4];
      const row = h("div", { class: "bc-row" });
      const lab = h("div", { class: "bc-lab" }, it.label, it.sub ? h("small", { text: it.sub }) : null);
      const trk = h("div", { class: "bc-track" });
      const bar = h("div", { class: "bc-bar", style: { width: `${(100 * it.value) / max}%`, background: `var(--${c})` } });
      const val = h("div", { class: "bc-val", style: { color: `var(--${c}-d)`, left: `calc(${(100 * it.value) / max}% + 18px)` } });
      trk.append(bar, val);
      row.append(lab, trk);
      el.append(row);
      return { it, row, bar, val };
    });
    const src = h("div", { class: "bc-src", text: p.src ?? "" });
    el.append(src);
    root.append(el);
    const GROW = { w: hz(1.6), z: 0.95 };
    return {
      duration: out,
      sfx: p.items.map((it) => ({ t: it.at, name: "swish-1", gain: -24 })),
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const o = exitOf(t, out);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        tyT.render(t, at);
        tyS.render(t, at + 0.2 + tyT.dur);
        setStyle(src, "opacity", clamp01(appear(t, p.items.at(-1).at + 1, UI)).toFixed(3));
        for (const q of rows) {
          const a = appear(t, q.it.at, POP);
          setStyle(q.row, "opacity", clamp01(a * 2).toFixed(3));
          const g = clamp01(appear(t, q.it.at + 0.15, GROW));
          setStyle(q.bar, "transform", `scaleX(${g.toFixed(4)})`);
          const v = q.it.value * g;
          q.val.textContent = `${v.toFixed(q.it.digits ?? 1)}${q.it.unit ?? ""}`;
          setStyle(q.val, "left", `calc(${((100 * q.it.value) / max) * g}% + 18px)`);
        }
      },
    };
  },
};

/**
 * Avatars 人物头像排：圆形照片依次弹出，名字与身份打字；没有照片的用图标代替（不找替身）。
 * params
 *   people [{img, icon, name, sub, color, at}]
 *   size 头像直径（默认 190）、credit 整排的署名与许可、at、out
 */
export const Avatars = {
  name: "avatars",
  create(root, p, ctx) {
    ctx.css("pr-story", CSS);
    typingCss(ctx.css);
    const size = p.size ?? 190, out = p.out ?? Infinity;
    const el = h("div", { class: "av" });
    const row = h("div", { class: "av-row" });
    el.append(row);
    const ppl = p.people.map((pp, i) => {
      const c = pp.color ?? ["m5", "m1", "m4", "m2", "m6", "m3"][i % 6];
      const it = h("div", { class: "av-it" });
      const ph = h("div", { class: `av-ph${pp.img ? "" : " none"}`, style: { width: `${size}px`, height: `${size}px`, outlineColor: `var(--${c})`, background: `var(--${c}-t)` } });
      let icon = null;
      if (pp.img) ph.append(h("img", { src: pp.img, alt: pp.name, style: { objectPosition: pp.pos ?? "50% 30%" } }));
      else { icon = ico(pp.icon ?? "icon-park:user", Math.round(size * 0.46), { color: `var(--${c}-d)`, tone: c, draw: true }); ph.append(icon); }
      const n = h("div", { class: "av-n" }), sb = h("div", { class: "av-s" });
      it.append(ph, n, sb);
      row.append(it);
      return { pp, it, ph, icon, tyN: mountTyping(n, pp.name, { cps: 9, seed: 13 + i }), tyS: mountTyping(sb, pp.sub ?? "", { cps: 15, seed: 31 + i }) };
    });
    let cr = null;
    if (p.credit) { cr = h("div", { class: "av-cr", text: p.credit }); el.append(cr); }
    root.append(el);
    const first = Math.min(...p.people.map((x) => x.at));
    return {
      duration: out,
      sfx: p.people.map((x) => ({ t: x.at, name: "pop", gain: -21 })),
      render(t) {
        const vis = t >= first - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const o = exitOf(t, out);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        for (const q of ppl) {
          const a = appear(t, q.pp.at, POP);
          setStyle(q.it, "opacity", clamp01(a * 2).toFixed(3));
          setStyle(q.ph, "transform", `scale(${(0.4 + 0.6 * a).toFixed(4)})`);
          if (q.icon) drawIcon(q.icon, cubicInOut(clamp01((t - q.pp.at - 0.1) / 0.7)));
          q.tyN.render(t, q.pp.at + 0.3);
          q.tyS.render(t, q.pp.at + 0.4 + q.tyN.dur);
        }
        if (cr) setStyle(cr, "opacity", clamp01(appear(t, first + 1.2, UI)).toFixed(3));
      },
    };
  },
};

/**
 * Graph 小图：点、线、线上的数字（代价）。点和线按时刻出现；settle 标出「已确定」的点（按顺序点亮，演示搜索），
 * path 给出最后要高亮的路线。也能画博弈树（点的位置自己排成树）。以原点为中心；render 是纯函数。
 * params
 *   nodes [{id, x, y, label, at, settle, color}]   settle：这个点被「确定」的时刻
 *   edges [{a, b, w, at, hi}]                       w：线上的数字；hi：高亮时刻（最短路线）
 *   title {text, at}、r（点半径，默认 34）、out
 */
export const Graph = {
  name: "graph",
  create(root, p, ctx) {
    ctx.css("pr-story", CSS);
    typingCss(ctx.css);
    const out = p.out ?? Infinity, R = p.r ?? 34;
    const el = h("div", { class: "hc" });
    const svg = s("svg", { width: 10, height: 10, style: { position: "absolute", left: 0, top: 0, overflow: "visible" } });
    el.append(svg);
    const N = Object.fromEntries(p.nodes.map((n) => [n.id, n]));
    const edges = p.edges.map((e) => {
      const A = N[e.a], B = N[e.b];
      const line = s("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: "var(--line)", "stroke-width": 8, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 });
      const hl = s("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: "var(--m1)", "stroke-width": 12, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 });
      svg.append(line, hl);
      let w = null;
      if (e.w != null) {
        w = h("div", { class: "hc-lab", text: String(e.w), style: { left: `${(A.x + B.x) / 2}px`, top: `${(A.y + B.y) / 2}px`, font: "700 26px/1 var(--sans)", color: "var(--ink2)",
          background: "var(--surface)", padding: "4px 10px", borderRadius: "10px", border: "2px solid var(--line)" } });
        el.append(w);
      }
      return { e, line, hl, w };
    });
    const nodes = p.nodes.map((n, i) => {
      const c = n.color ?? "m5";
      const g = s("g", { transform: `translate(${n.x} ${n.y})` });
      // cell 模式：方格（演示像素、权重），字写在格子里，没点亮的格子用中性描边
      const ring = p.cell
        ? s("rect", { x: -R, y: -R, width: 2 * R, height: 2 * R, rx: 12, fill: "var(--surface)", stroke: n.color ? `var(--${c})` : "var(--line)", "stroke-width": 5 })
        : s("circle", { r: R, fill: "var(--surface)", stroke: `var(--${c})`, "stroke-width": 6 });
      const fill = p.cell
        ? s("rect", { x: -R + 3, y: -R + 3, width: 2 * R - 6, height: 2 * R - 6, rx: 10, fill: `var(--${c})`, opacity: 0 })
        : s("circle", { r: R - 3, fill: `var(--${c})`, opacity: 0 });
      g.append(ring, fill);
      svg.append(g);
      const lab = h("div", { class: "hc-lab", style: p.cell
        ? { left: `${n.x}px`, top: `${n.y}px`, font: `800 ${Math.round(R * 0.62)}px/1 var(--sans)`, color: "var(--ink)", zIndex: 1 }
        : { left: `${n.x}px`, top: `${n.y + R + 24}px`, font: "700 28px/1.2 var(--sans)", color: "var(--ink)" } });
      el.append(lab);
      return { n, g, fill, lab, ty: mountTyping(lab, n.label ?? "", { cps: 12, seed: 61 + i }) };
    });
    let title = null, tyT = null;
    if (p.title) { title = h("div", { class: "hc-lab", style: { left: "0px", top: `${p.titleY ?? -330}px`, font: "750 40px/1.2 var(--sans)", color: "var(--ink)" } }); el.append(title); tyT = mountTyping(title, p.title.text, { cps: 12, seed: 9 }); }
    root.append(el);
    const first = Math.min(...p.nodes.map((n) => n.at), ...p.edges.map((e) => e.at), p.title?.at ?? Infinity);
    return {
      duration: out,
      sfx: [...p.nodes.filter((n) => n.settle != null).map((n) => ({ t: n.settle, name: "tap", gain: -22 })), ...p.nodes.map((n) => ({ t: n.at, name: "pop", gain: -26 }))],
      render(t) {
        const vis = t >= first - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        setStyle(el, "opacity", (1 - exitOf(t, out)).toFixed(3));
        if (tyT) tyT.render(t, p.title.at);
        for (const q of edges) {
          setAttr(q.line, "stroke-dashoffset", (1 - cubicInOut(clamp01((t - q.e.at) / 0.5))).toFixed(4));
          setAttr(q.hl, "stroke-dashoffset", q.e.hi != null ? (1 - cubicInOut(clamp01((t - q.e.hi) / 0.6))).toFixed(4) : "1");
          if (q.w) setStyle(q.w, "opacity", clamp01((t - q.e.at - 0.3) / 0.3).toFixed(3));
        }
        for (const q of nodes) {
          const a = appear(t, q.n.at, POP);
          setAttr(q.g, "transform", `translate(${q.n.x} ${q.n.y}) scale(${a.toFixed(4)})`);
          setAttr(q.fill, "opacity", q.n.settle != null ? (0.9 * clamp01(appear(t, q.n.settle, POP))).toFixed(3) : "0");
          q.ty.render(t, q.n.at + 0.15);
        }
      },
    };
  },
};
