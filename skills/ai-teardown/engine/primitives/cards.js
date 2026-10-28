/**
 * 卡片类原语：Title 标题 · Compare 对比与误区 · Analogy 类比 · CodeDiff 代码改动 · Layers 层级 · EndCard 片尾。
 * 都以场景原点为中心排版；时间参数都是本地秒；render 是纯函数。
 */
import { h, s, setStyle, setText, icon } from "../runtime/dom.js";
import { appear, pulse, step, REVEAL, UI } from "../runtime/spring.js";
import { applySwap, swap, clamp01, mix } from "../runtime/ease.js";

const CSS = `
.cd-card{position:absolute;left:0;top:0;background:var(--surface);border:2px solid var(--line);border-radius:28px;box-shadow:var(--shadow);white-space:nowrap}
.cd-eyebrow{font:600 24px/1 var(--sans);letter-spacing:.14em;color:var(--ink3)}
.cd-title{position:absolute;left:0;top:0;text-align:center;white-space:nowrap}
.cd-title .t{font:700 84px/1.1 var(--sans);color:var(--ink);letter-spacing:.02em}
.cd-title .s{font:500 32px/1.4 var(--sans);color:var(--ink2);margin-top:14px}
.cd-myth{font:600 44px/1.3 var(--sans);color:var(--ink2);position:relative;display:inline-block}
.cd-strike{position:absolute;left:-6px;top:52%;height:5px;border-radius:3px;background:var(--boundary)}
.cd-truth{font:700 46px/1.35 var(--sans);color:var(--ink)}
.cd-truth b{color:var(--tool);font-weight:700}
.cd-col{position:absolute;top:0;display:flex;flex-direction:column;align-items:center;gap:18px}
.cd-col .h{font:700 40px/1.2 var(--sans);color:var(--ink)}
.cd-col .d{font:500 28px/1.4 var(--sans);color:var(--ink2);text-align:center}
.cd-bubble{padding:18px 30px;border-radius:28px;border:2px dashed var(--ink3);font:500 32px/1.3 var(--sans);color:var(--ink2)}
.cd-shield{width:150px;height:150px;border-radius:32px;border:3px solid var(--boundary);display:grid;place-items:center;background:var(--boundary-t)}
.cd-row{position:absolute;left:0;display:flex;align-items:center;gap:26px}
.cd-row .ic{width:84px;height:84px;border-radius:22px;display:grid;place-items:center;background:var(--surface2)}
.cd-row .f{font:600 40px/1 var(--sans);color:var(--ink2);min-width:230px}
.cd-row .to{font:700 42px/1 var(--sans)}
.cd-arrow{height:3px;background:var(--ink3);border-radius:2px;position:relative}
.cd-arrow::after{content:"";position:absolute;right:-2px;top:-7px;border-left:14px solid var(--ink3);border-top:8px solid transparent;border-bottom:8px solid transparent}
.cd-head{display:flex;align-items:center;gap:12px;padding:22px 30px 18px;border-bottom:2px solid var(--line);font:500 26px/1 var(--mono);color:var(--ink3)}
.cd-lines{padding:18px 30px 8px}
.cd-line{font:500 30px/1.7 var(--mono);color:var(--ink2)}
.cd-line.add{color:var(--tool)} .cd-line.del{color:var(--boundary);text-decoration:line-through;text-decoration-thickness:2px}
.cd-foot{display:flex;gap:16px;padding:10px 30px 26px}
.cd-btn{font:600 28px/1 var(--sans);padding:16px 26px;border-radius:16px;border:2px solid var(--line);color:var(--ink)}
.cd-btn.primary{background:var(--user);border-color:var(--user);color:#fff}
.cd-check{display:flex;align-items:center;gap:14px;font:600 30px/1 var(--sans);color:var(--ink)}
.cd-layer{position:absolute;left:0;border-radius:20px;border:2px solid var(--line);background:var(--surface);display:flex;align-items:center;gap:18px;padding:0 28px;white-space:nowrap}
.cd-layer .l{font:650 34px/1 var(--sans);color:var(--ink)}
.cd-layer .p{font:500 24px/1 var(--mono);color:var(--ink3)}
.cd-badge{position:absolute;font:700 26px/1 var(--sans);color:#fff;background:var(--env);padding:10px 16px;border-radius:12px;white-space:nowrap}
.cd-end{position:absolute;left:0;top:0;white-space:nowrap}
.cd-end .k{font:700 60px/1.2 var(--sans);color:var(--ink)}
.cd-end .a{font:500 30px/1.4 var(--sans);color:var(--ink2);margin-top:12px}
.cd-end ol{margin:34px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px}
.cd-end li{font:500 26px/1.35 var(--sans);color:var(--ink2)}
.cd-end li b{color:var(--ink);font-weight:600;margin-right:12px}
.cd-end .brand{margin-top:40px;font:600 24px/1 var(--sans);letter-spacing:.14em;color:var(--ink3)}
`;

const place = (el, x, y, anchor = "center") => {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  return anchor === "center" ? "translate(-50%,-50%)" : anchor === "left" ? "translate(0,-50%)" : "translate(0,0)";
};

/** 进出窗口 + 轻微位移，给整张卡用 */
const cardIn = (el, t, tin, tout, base) => applySwap(el, swap(t, tin, tout, 0.28, 0.2), `${base} translateY(${((1 - appear(t, tin)) * 18).toFixed(2)}px)`);

export const Title = {
  name: "Title",
  create(root, p, ctx) {
    ctx.css("cd-css", CSS);
    const el = h("div", { class: "cd-title" });
    const t = h("div", { class: "t", text: p.text });
    if (p.size) t.style.fontSize = `${p.size}px`;
    el.append(t);
    if (p.sub) el.append(h("div", { class: "s", text: p.sub }));
    root.append(el);
    const base = place(el, 0, 0);
    return {
      beats: [{ t: p.at ?? 0, id: "title", label: p.text }],
      render(tt) { cardIn(el, tt, p.at ?? 0, p.out ?? Infinity, base); },
    };
  },
};

export const Compare = {
  name: "Compare",
  create(root, p, ctx) {
    ctx.css("cd-css", CSS);
    const W = p.w ?? 1240;
    const H = p.h ?? (p.mode === "side" ? 520 : 400);
    const card = h("div", { class: "cd-card" });
    Object.assign(card.style, { width: `${W}px`, height: `${H}px` });
    root.append(card);
    const base = place(card, 0, 0);
    const parts = [];
    if (p.mode === "myth") {
      const eb = h("div", { class: "cd-eyebrow", text: p.label ?? "常见误解" });
      const myth = h("div", { class: "cd-myth", text: p.myth });
      const strike = h("div", { class: "cd-strike" });
      myth.append(strike);
      const truth = h("div", { class: "cd-truth" });
      truth.innerHTML = p.truth;
      const col = h("div", { style: { position: "absolute", left: "80px", top: "70px", display: "flex", flexDirection: "column", gap: "30px" } }, eb, myth, truth);
      card.append(col);
      parts.push({ render(t) {
        const k = appear(t, p.strikeAt ?? Infinity, UI);
        setStyle(strike, "width", `${(k * (myth.offsetWidth + 12)).toFixed(1)}px`);
        setStyle(myth, "opacity", (1 - 0.45 * k).toFixed(3));
        applySwap(truth, swap(t, p.truthAt ?? Infinity, Infinity, 0.25, 0.1));
      } });
    } else {
      const mk = (side, x) => {
        const c = h("div", { class: "cd-col" });
        c.style.left = `${x}px`;
        c.style.width = `${W / 2}px`;
        c.style.top = "70px";
        const vis = side.kind === "bubble" ? h("div", { class: "cd-bubble", text: side.visual }) : h("div", { class: "cd-shield" }, icon(side.icon ?? "shield", 84, "var(--boundary)", 1.9));
        c.append(vis, h("div", { class: "h", text: side.title }), h("div", { class: "d", text: side.desc ?? "" }));
        card.append(c);
        return c;
      };
      const L = mk(p.left, 0);
      const R = mk(p.right, W / 2);
      const vs = h("div", { class: "cd-eyebrow", text: "vs", style: { position: "absolute", left: `${W / 2}px`, top: "150px", transform: "translateX(-50%)" } });
      card.append(vs);
      parts.push({ render(t) {
        applySwap(L, swap(t, p.leftAt ?? 0, Infinity, 0.25, 0.1));
        applySwap(R, swap(t, p.rightAt ?? 0, Infinity, 0.25, 0.1));
        const win = appear(t, p.winnerAt ?? Infinity);
        setStyle(L, "opacity", (Math.min(1, swap(t, p.leftAt ?? 0, Infinity).opacity) * (1 - 0.55 * win)).toFixed(3));
      } });
    }
    return {
      beats: [p.strikeAt, p.truthAt, p.leftAt, p.rightAt].filter((x) => x != null).map((t, i) => ({ t, id: `cmp:${i}`, label: "对比" })),
      render(t) {
        cardIn(card, t, p.at ?? 0, p.out ?? Infinity, base);
        for (const q of parts) q.render(t);
      },
      hotspots() { return p.facts?.length ? [{ el: card, facts: p.facts, label: p.label ?? "对比" }] : []; },
    };
  },
};

export const Analogy = {
  name: "Analogy",
  create(root, p, ctx) {
    ctx.css("cd-css", CSS);
    const W = p.w ?? 1240;
    const H = 110 + p.rows.length * 130;
    const card = h("div", { class: "cd-card" });
    Object.assign(card.style, { width: `${W}px`, height: `${H}px` });
    root.append(card);
    const base = place(card, 0, 0);
    card.append(h("div", { class: "cd-eyebrow", text: p.title ?? "打个比方", style: { position: "absolute", left: "80px", top: "54px" } }));
    const rows = p.rows.map((r, i) => {
      const row = h("div", { class: "cd-row" });
      row.style.left = "80px";
      row.style.top = `${150 + i * 130}px`;
      const arrow = h("div", { class: "cd-arrow" });
      const to = h("div", { class: "to", text: r.to });
      to.style.color = `var(--${r.role ?? "model"})`;
      row.append(h("div", { class: "ic" }, icon(r.icon, 46, `var(--${r.role ?? "model"})`, 1.8)), h("div", { class: "f", text: r.from }), arrow, to);
      card.append(row);
      return { row, arrow, to, r };
    });
    return {
      render(t) {
        cardIn(card, t, p.at ?? 0, p.out ?? Infinity, base);
        for (const { row, arrow, to, r } of rows) {
          applySwap(row, swap(t, r.at, Infinity, 0.25, 0.1), "translateY(-50%)");
          const k = appear(t, r.at + 0.25, UI);
          setStyle(arrow, "width", `${(k * 150).toFixed(1)}px`);
          setStyle(to, "opacity", appear(t, r.at + 0.45).toFixed(3));
        }
      },
      hotspots() { return p.facts?.length ? [{ el: card, facts: p.facts, label: p.title ?? "打个比方" }] : []; },
    };
  },
};

export const CodeDiff = {
  name: "CodeDiff",
  create(root, p, ctx) {
    ctx.css("cd-css", CSS);
    const W = p.w ?? 680;
    const card = h("div", { class: "cd-card" });
    card.style.width = `${W}px`;
    root.append(card);
    card.append(h("div", { class: "cd-head" }, icon("file", 28, "var(--ink3)", 2), h("span", { text: p.file })));
    const body = h("div", { class: "cd-lines" });
    card.append(body);
    const lines = p.lines.map((ln) => {
      const d = h("div", { class: `cd-line ${ln.k === "+" ? "add" : ln.k === "-" ? "del" : ""}`, text: `${ln.k === " " ? " " : ln.k} ${ln.text}` });
      body.append(d);
      return { ln, d };
    });
    const foot = h("div", { class: "cd-foot" });
    const acts = (p.actions ?? []).map((a) => {
      const b = h("div", { class: `cd-btn ${a.primary ? "primary" : ""}`, text: a.label });
      foot.append(b);
      return { a, b };
    });
    const checks = (p.checks ?? []).map((c) => {
      const row = h("div", { class: "cd-check" }, icon("check", 34, "var(--ok)", 2.6), h("span", { text: c.label }));
      foot.append(row);
      return { c, row };
    });
    if (checks.length) foot.style.flexDirection = "column";
    card.append(foot);
    const base = place(card, 0, 0);
    return {
      render(t) {
        cardIn(card, t, p.at ?? 0, p.out ?? Infinity, base);
        for (const { ln, d } of lines) {
          const a = clamp01((t - ln.at) / 0.15);
          setStyle(d, "opacity", a.toFixed(3));
          setStyle(d, "transform", `translateX(${((1 - a) * -16).toFixed(1)}px)`);
        }
        for (const { a, b } of acts) applySwap(b, swap(t, a.at, Infinity, 0.22, 0.1));
        for (const { c, row } of checks) applySwap(row, swap(t, c.at, Infinity, 0.22, 0.1));
      },
      hotspots() { return p.facts?.length ? [{ el: card, facts: p.facts, label: p.file }] : []; },
    };
  },
};

export const Layers = {
  name: "Layers",
  create(root, p, ctx) {
    ctx.css("cd-css", CSS);
    const n = p.layers.length;
    const H = 96;
    const gap = 26;
    const step0 = 46;
    const total = n * H + (n - 1) * gap;
    const W = 760;
    const card = h("div", { class: "cd-card" });
    Object.assign(card.style, { width: `${W + (n - 1) * step0 + 160}px`, height: `${total + 190}px` });
    root.append(card);
    card.append(h("div", { class: "cd-eyebrow", text: p.title ?? "逐层拼接", style: { position: "absolute", left: "80px", top: "52px" } }));
    const els = p.layers.map((ly, i) => {
      const e = h("div", { class: "cd-layer" }, icon("doc", 34, "var(--env)", 1.9), h("span", { class: "l", text: ly.label }), h("span", { class: "p", text: ly.sub ?? "" }));
      Object.assign(e.style, { width: `${W}px`, height: `${H}px`, top: `${110 + i * (H + gap)}px`, left: `${80 + i * step0}px` });
      card.append(e);
      return e;
    });
    const badge = h("div", { class: "cd-badge", text: p.badge ?? "越近越优先" });
    const last = n - 1;
    Object.assign(badge.style, { left: `${80 + last * step0 + W - 20}px`, top: `${110 + last * (H + gap) + H / 2}px`, transform: "translate(-100%,-50%)" });
    card.append(badge);
    const base = place(card, 0, 0);
    return {
      render(t) {
        cardIn(card, t, p.at ?? 0, p.out ?? Infinity, base);
        els.forEach((e, i) => {
          applySwap(e, swap(t, (p.at ?? 0) + 0.3 + i * (p.stagger ?? 0.45), Infinity, 0.25, 0.1));
          const lit = i === last ? appear(t, p.litAt ?? Infinity) : 0;
          setStyle(e, "borderColor", lit > 0.5 ? "var(--env)" : "var(--line)");
          setStyle(e, "background", lit > 0.5 ? "var(--env-t)" : "var(--surface)");
        });
        applySwap(badge, swap(t, p.litAt ?? Infinity, Infinity, 0.25, 0.1), "translate(-100%,-50%)");
      },
      hotspots() { return p.facts?.length ? [{ el: card, facts: p.facts, label: p.title ?? "层级" }] : []; },
    };
  },
};

export const EndCard = {
  name: "EndCard",
  create(root, p, ctx) {
    ctx.css("cd-css", CSS);
    const el = h("div", { class: "cd-end" });
    el.append(h("div", { class: "k", text: p.title }), h("div", { class: "a", text: p.sub ?? "" }));
    const ol = h("ol");
    for (const s0 of p.sources) ol.append(h("li", {}, h("b", { text: s0.publisher }), s0.title));
    el.append(ol, h("div", { class: "brand", text: p.brand ?? "AI 拆机课" }));
    root.append(el);
    const base = place(el, 0, 0, "tl");
    return { render(t) { applySwap(el, swap(t, p.at ?? 0, Infinity, 0.3, 0.1), base); } };
  },
};
