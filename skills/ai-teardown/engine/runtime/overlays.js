/** Screen-space overlays: captions, corner labels, cursor. All pure functions of time. */
import { h, setStyle, setText } from "./dom.js";
import { track, step, PRESS, CURSOR } from "./spring.js";
import { clamp01 } from "./ease.js";

const CSS = `
.at-cap{position:absolute;left:0;right:0;display:flex;justify-content:center;pointer-events:none}
.at-cap span{display:inline-block;padding:10px 30px 12px;border-radius:14px;background:var(--cap-bg);color:var(--cap-ink);
  font:500 44px/1.3 var(--sans);letter-spacing:.02em;white-space:nowrap}
.at-tag{position:absolute;font:500 22px/1 var(--sans);letter-spacing:.08em;color:var(--ink2);padding:9px 14px;border-radius:10px;
  border:1.5px solid var(--line);background:var(--surface)}
.at-tag[data-kind=inferred]{border-style:dashed}
.at-tag[data-kind=spike]{color:var(--hl);border-color:var(--hl)}
.at-cursor{position:absolute;left:0;top:0;width:0;height:0}
.at-cursor svg{position:absolute;left:-3px;top:-2px;overflow:visible}
.at-ripple{position:absolute;border-radius:50%;border:3px solid var(--ink);opacity:0}
`;

const PUNCT = /[，。！？；：、,.!?;:]/;
const HARD = /[。！？；!?;]/;

/**
 * Group TTS words into subtitle lines of at most maxChars, breaking at punctuation.
 * words: [{text, start, end, i0, i1}] with character offsets into `text`.
 */
export function captionCues(beats, maxChars = 18, en = false) {
  const HARDX = en ? /[。！？；!?;.]/ : HARD;
  const cues = [];
  for (const b of beats) {
    const text = b.text;
    let cur = null;
    const flush = () => {
      if (!cur) return;
      const line = text.slice(cur.i0, cur.i1).replace(/[，。！？；：、,.!?;:]+$/u, "").replace(/[，、]/g, " ").trim();
      if (line) cues.push({ start: cur.start, end: cur.end, text: line });
      cur = null;
    };
    for (const w of b.words) {
      const len = cur ? w.i1 - cur.i0 : w.i1 - w.i0;
      // 句尾只剩三四个字时宁可略超上限，也不让「你」这样的字单独成行
      const rest = text.slice(w.i1).search(/[，。！？；：、,.!?;:]|$/u);
      const clauseLen = cur ? w.i1 + rest - cur.i0 : 0;
      // 别把英文单词拆到两行（WorkBudd / y）
      const midWord = /[A-Za-z0-9]/.test(text[w.i0 - 1] ?? "") && /[A-Za-z0-9]/.test(text[w.i0] ?? "");
      if (cur && !midWord && len > maxChars && clauseLen > maxChars + 4) flush();
      if (!cur) cur = { i0: w.i0, i1: w.i1, start: w.start, end: w.end };
      else Object.assign(cur, { i1: w.i1, end: w.end });
      const after = text.slice(w.i1, w.i1 + 1);
      if (HARDX.test(after) || (PUNCT.test(after) && cur.i1 - cur.i0 >= maxChars * 0.45)) {
        cur.i1 = w.i1 + 1;
        flush();
      }
    }
    flush();
  }
  // hold each line until the next starts (short gaps only), so subtitles do not flicker between words
  for (let i = 0; i < cues.length; i++) {
    const next = cues[i + 1];
    cues[i].end = next && next.start - cues[i].end < 0.6 ? next.start - 0.02 : cues[i].end + 0.25;
  }
  return cues;
}

export function captions(stage, cues, { bottom } = {}) {
  stage.css("at-overlays", CSS);
  const el = h("div", { class: "at-cap" });
  const span = h("span");
  el.append(span);
  const top = bottom ?? stage.frame.capTop + 16;
  el.style.top = `${top}px`;
  return {
    el,
    render(t) {
      const c = cues.find((q) => t >= q.start - 0.04 && t < q.end);
      if (!c) return setStyle(el, "opacity", "0");
      setText(span, c.text);
      const a = clamp01((t - c.start + 0.04) / 0.08) * clamp01((c.end - t) / 0.06);
      setStyle(el, "opacity", a.toFixed(3));
    },
  };
}

/** Corner tags such as 「界面示意」「推断」 with time windows. pos: tl | tr | bl | br */
export function tag(stage, { text, start, end, pos = "tl", kind = "uimock" }) {
  stage.css("at-overlays", CSS);
  const el = h("div", { class: "at-tag", "data-kind": kind, text });
  const F = stage.frame;
  const m = { x: F.safeX, y: F.safeTop };
  if (pos.includes("l")) el.style.left = `${m.x}px`;
  else el.style.right = `${m.x}px`;
  if (pos.includes("t")) el.style.top = `${m.y}px`;
  else el.style.bottom = `${stage.H - F.capTop + 24}px`;
  return {
    el,
    render(t) {
      const a = clamp01((t - start) / 0.25) * clamp01((end - t) / 0.25);
      setStyle(el, "opacity", a.toFixed(3));
    },
  };
}

/**
 * Cursor in screen space. keys: [[t, wx, wy]] in world coordinates (critically damped, never overshoots);
 * presses: [[t0, t1]]; visible: [t0, t1]. Arrive at a target at least 0.5 s before pressing it.
 */
export function cursor(stage, { keys, presses = [], visible = [[0, Infinity]] }) {
  stage.css("at-overlays", CSS);
  const el = h("div", { class: "at-cursor" });
  el.innerHTML = `<svg width="34" height="40" viewBox="0 0 17 20"><path d="M1 1 L1 16 L5 12.4 L7.9 18.6 L10.6 17.4 L7.8 11.3 L13 11.3 Z"
    fill="var(--ink)" stroke="var(--bg)" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
  const ripple = h("div", { class: "at-ripple" });
  stage.screen.append(ripple);
  const xs = keys.map(([t, x]) => [t, x]);
  const ys = keys.map(([t, , y]) => [t, y]);
  const pressKeys = [[0, 1]];
  for (const [a, b] of presses) pressKeys.push([a, 0.86], [b, 1]);
  return {
    el,
    at(t) {
      return { x: track(t, xs, CURSOR), y: track(t, ys, CURSOR) };
    },
    render(t) {
      const vis = Math.max(0, ...visible.map(([a, b]) => clamp01((t - a) / 0.2) * clamp01((b - t) / 0.2)));
      if (vis <= 0) return setStyle(el, "opacity", "0"), setStyle(ripple, "opacity", "0");
      const w = this.at(t);
      const p = stage.toScreen(w.x, w.y);
      const sc = track(t, pressKeys, PRESS);
      setStyle(el, "opacity", vis.toFixed(3));
      setStyle(el, "transform", `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${sc.toFixed(3)})`);
      const last = presses.filter(([a]) => t >= a).pop();
      if (last) {
        const k = step(t - last[0], { w: 2 * Math.PI * 1.6, z: 1 });
        const r = 14 + k * 42;
        Object.assign(ripple.style, {
          left: `${p.x - r}px`, top: `${p.y - r}px`, width: `${2 * r}px`, height: `${2 * r}px`,
          opacity: ((1 - k) * 0.55 * vis).toFixed(3),
        });
      } else setStyle(ripple, "opacity", "0");
    },
  };
}

const CSS2 = `
.at-chap{position:absolute;display:flex;align-items:baseline;gap:14px;white-space:nowrap}
.at-chap .n{font:600 24px/1 var(--mono);color:var(--ink3);letter-spacing:.06em}
.at-chap .t{font:600 26px/1 var(--sans);color:var(--ink2);letter-spacing:.04em}
.at-term{position:absolute;padding:20px 28px 22px;border-radius:20px;background:var(--surface);border:2px solid var(--line);box-shadow:var(--shadow);white-space:nowrap}
.at-term .k{display:flex;align-items:center;gap:12px;font:700 40px/1.1 var(--sans);color:var(--ink)}
.at-term .k i{width:14px;height:14px;border-radius:50%;display:inline-block}
.at-term .p{font:500 26px/1.4 var(--sans);color:var(--ink2);margin-top:8px}
.at-dim{position:absolute;inset:0;background:var(--bg)}
`;

/** 章节角标：左上角「02  它是什么」；chapters: [{start, end, n, title}] */
export function chapterLabel(stage, chapters) {
  stage.css("at-overlays2", CSS2);
  const el = h("div", { class: "at-chap" });
  const n = h("span", { class: "n" });
  const t = h("span", { class: "t" });
  el.append(n, t);
  el.style.left = `${stage.frame.safeX}px`;
  el.style.top = `${stage.frame.safeTop}px`;
  return {
    el,
    render(time) {
      const c = chapters.find((q) => time >= q.start - 0.1 && time < q.end);
      if (!c) return setStyle(el, "opacity", "0");
      setText(n, String(c.n).padStart(2, "0"));
      setText(t, c.title);
      const a = clamp01((time - c.start + 0.1) / 0.3) * clamp01((c.end - time) / 0.25);
      setStyle(el, "opacity", a.toFixed(3));
    },
  };
}

/** 术语卡：「名」这一拍，在字幕上方给出术语和一句大白话 */
export function termCard(stage, { term, plain, start, end, role = "model" }) {
  stage.css("at-overlays2", CSS2);
  const dot = h("i");
  dot.style.background = `var(--${role})`;
  const el = h("div", { class: "at-term" }, h("div", { class: "k" }, dot, term), h("div", { class: "p", text: plain }));
  el.style.left = `${stage.frame.safeX}px`;
  el.style.bottom = `${stage.H - stage.frame.capTop + 40}px`;
  return {
    el,
    render(time) {
      const a = clamp01((time - start) / 0.3) * clamp01((end - time) / 0.25);
      setStyle(el, "opacity", a.toFixed(3));
      setStyle(el, "transform", `translateY(${((1 - clamp01((time - start) / 0.3)) * 14).toFixed(1)}px)`);
    },
  };
}

/** 压暗世界层，给屏幕层的卡片垫底；windows: [[t0, t1, opacity]] */
export function backdrop(stage, windows) {
  stage.css("at-overlays2", CSS2);
  const el = h("div", { class: "at-dim" });
  return {
    el,
    render(time) {
      let a = 0;
      for (const [t0, t1, o = 0.78] of windows) a = Math.max(a, o * clamp01((time - t0) / 0.35) * clamp01((t1 - time) / 0.35));
      setStyle(el, "opacity", a.toFixed(3));
    },
  };
}

/**
 * 转场：两层马卡龙色圆从一角铺满画面，再往对角收走；场景在铺满的那一刻切换，所以不需要镜头移动。
 * times: 切换时刻数组；colors: 两层的色位（前、后）；每次转场的方向按序轮换。
 */
export function wipe(stage, { times, colors = ["m6", "m1"], palette = null, dIn = 0.36, dOut = 0.44, lag = 0.07 }) {
  const { W, H } = stage;
  const R = Math.hypot(W, H) * 1.02;
  const corners = [[0, H], [W, 0], [W, H], [0, 0]];
  const mk = (c) => h("div", { style: { position: "absolute", inset: "0", background: `var(--${c})`, clipPath: "circle(0px at 0px 0px)", visibility: "hidden" } });
  const back = mk(colors[1]);
  const front = mk(colors[0]);
  const el = h("div", { class: "at-wipe", style: { position: "absolute", inset: "0", pointerEvents: "none" } });
  el.append(back, front);
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const layer = (node, t, T, i, delay) => {
    const [ax, ay] = corners[i % 4];
    const [bx, by] = [W - ax, H - ay];
    const a = (t - (T - dIn - delay)) / dIn;
    const b = (t - (T + delay * 0.6)) / dOut;
    if (a <= 0 || b >= 1) return setStyle(node, "visibility", "hidden");
    setStyle(node, "visibility", "visible");
    if (b <= 0) setStyle(node, "clipPath", `circle(${(R * ease(clamp01(a))).toFixed(1)}px at ${ax}px ${ay}px)`);
    else setStyle(node, "clipPath", `circle(${(R * (1 - ease(clamp01(b)))).toFixed(1)}px at ${bx}px ${by}px)`);
  };
  return {
    el,
    render(t) {
      const i = times.findIndex((T) => t >= T - dIn - lag - 0.02 && t <= T + dOut + lag + 0.02);
      if (i < 0) {
        setStyle(back, "visibility", "hidden");
        setStyle(front, "visibility", "hidden");
        return;
      }
      // palette: [[前, 后], ...] 按转场次序轮换颜色
      const pair = palette ? palette[i % palette.length] : colors;
      setStyle(front, "background", `var(--${pair[0]})`);
      setStyle(back, "background", `var(--${pair[1]})`);
      layer(back, t, times[i], i, lag);
      layer(front, t, times[i], i, 0);
    },
  };
}

/**
 * 年份标尺：屏幕顶部一条细轴，标出几个关键年份，当前讲到的年份放大、点亮，指针弹簧移动过去。
 * years: [1950, 1956, ...]；keys: [[t, 年份下标]]（-1 表示藏起来）；讲历史时给观众一个「现在在哪儿」的锚点。
 */
export function yearBar(stage, { years, keys, y = 58, w = 1180 }) {
  const el = h("div", { class: "at-yb", style: { position: "absolute", left: `${(stage.W - w) / 2}px`, top: `${y}px`, width: `${w}px`, height: "56px", pointerEvents: "none" } });
  const line = h("div", { style: { position: "absolute", left: "0", right: "0", top: "27px", height: "4px", borderRadius: "2px", background: "var(--line)" } });
  const fill = h("div", { style: { position: "absolute", left: "0", top: "27px", height: "4px", borderRadius: "2px", background: "var(--m6)", transformOrigin: "0 50%", width: `${w}px` } });
  const knob = h("div", { style: { position: "absolute", top: "18px", width: "22px", height: "22px", marginLeft: "-11px", borderRadius: "50%", background: "var(--m6)", border: "4px solid var(--surface)", boxShadow: "var(--shadow)" } });
  el.append(line, fill);
  const X = (i) => (w * i) / (years.length - 1);
  const labs = years.map((yr, i) => {
    const d = h("div", { text: String(yr), style: { position: "absolute", left: `${X(i)}px`, top: "-4px", transform: "translateX(-50%)", font: "600 20px/1 var(--sans)", color: "var(--ink3)", whiteSpace: "nowrap", transformOrigin: "50% 100%" } });
    const tick = h("div", { style: { position: "absolute", left: `${X(i) - 4}px`, top: "25px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--line)" } });
    el.append(tick, d);
    return { d, tick };
  });
  el.append(knob);
  const K = keys.map(([t, i]) => [t, Math.max(0, i)]);
  const V = keys.map(([t, i]) => [t, i < 0 ? 0 : 1]);
  const SLIDE = { w: 2 * Math.PI * 1.6, z: 0.8 };
  return {
    el,
    render(t) {
      const vis = track(t, V, { w: 2 * Math.PI * 2.2, z: 1 });
      setStyle(el, "opacity", clamp01(vis).toFixed(3));
      setStyle(el, "transform", `translateY(${((1 - clamp01(vis)) * -16).toFixed(2)}px)`);
      if (vis < 0.01) return;
      const pos = track(t, K, SLIDE);
      setStyle(knob, "left", `${X(pos).toFixed(1)}px`);
      setStyle(fill, "transform", `scaleX(${(X(pos) / w).toFixed(4)})`);
      labs.forEach((q, i) => {
        const near = clamp01(1 - Math.abs(pos - i) * 1.4);
        setStyle(q.d, "color", near > 0.5 ? "var(--m6-d)" : i <= pos ? "var(--ink2)" : "var(--ink3)");
        setStyle(q.d, "transform", `translateX(-50%) scale(${(1 + 0.45 * near).toFixed(3)})`);
        setStyle(q.d, "fontWeight", near > 0.5 ? "800" : "600");
        setStyle(q.tick, "background", i <= pos + 0.01 ? "var(--m6)" : "var(--line)");
      });
    },
  };
}
