/**
 * 打字效果的公共件：把一段文字拆成可逐个出现的字块，按打字节奏排时间，render(t, t0) 逐字弹出。
 *   *词* 表示高亮：整段打完后，荧光笔从左往右划出底色。
 *   西文单词、数字整词出现（逐字母出现会在词中间折行）。
 * 所有 Typer、人物卡、时间线、思维导图的文字都走这里，节奏一致。
 */
import { h, setStyle } from "./dom.js";
import { appear, hz } from "./spring.js";
import { clamp01, hash01 } from "./ease.js";

const CSS = `
.tp{position:relative;z-index:0}
.tp-c{display:inline-block;white-space:pre}
.tp-c.dot{margin:0 .08em}
.tp-hl{position:relative;display:inline}
.tp-mk{position:absolute;left:-0.1em;right:-0.1em;bottom:0.04em;height:0.44em;border-radius:0.14em;transform-origin:0 50%;z-index:-1}
`;

const PUNCT = /[，。！？；：、,.!?;:）)」』”]/;
const TOKEN = /[A-Za-z0-9][A-Za-z0-9.+#'’\-]*|\s+|./gsu;
const POP = { w: hz(7), z: 0.55 };
const MARK = { w: hz(2.6), z: 1 };

export const typingCss = (css) => css("rt-typing", CSS);

/** 把 "*高亮*" 标记拆开，返回 [{text, hl}] */
const segments = (text) => {
  const out = [];
  let hl = false;
  for (const part of String(text).split("*")) {
    if (part) out.push({ text: part, hl });
    hl = !hl;
  }
  return out;
};

/**
 * 在 container 里建好字块。返回 { dur, render(t, t0), last }，t0 是开始打字的时刻。
 * opts: cps（每秒字数，默认 11）、seed、hl（高亮色，CSS 颜色或变量，默认 var(--hl)）、pop（是否弹入，默认 true）
 */
export function mountTyping(container, text, { cps = 11, seed = 1, hl = "var(--hl)", pop = true } = {}) {
  const toks = [];
  const marks = [];
  const wrap = h("span", { class: "tp" });
  for (const seg of segments(text)) {
    let host = wrap;
    let mark = null;
    if (seg.hl) {
      host = h("span", { class: "tp-hl" });
      mark = h("span", { class: "tp-mk", style: { background: hl, transform: "scaleX(0)" } });
      host.append(mark);
      wrap.append(host);
    }
    for (const m of seg.text.matchAll(TOKEN)) {
      const ch = m[0];
      // 人名间隔号「·」字形很窄，两侧各留一点，免得和前后字挤在一起
      const el = h("span", { class: ch === "·" ? "tp-c dot" : "tp-c", text: ch });
      host.append(el);
      toks.push({ ch, el, kind: /^\s+$/.test(ch) ? "space" : PUNCT.test(ch) ? "punct" : /^[A-Za-z0-9]/.test(ch) ? "latin" : "cjk" });
    }
    if (mark) marks.push({ mark, last: toks.length - 1 });
  }
  container.append(wrap);

  // 打字节奏：带种子的抖动，标点多停一拍，空格很快，西文整词按长度算
  const rel = [];
  let at = 0;
  toks.forEach((tk, i) => {
    rel.push(at);
    const j = 0.72 + 0.56 * hash01(i, seed);
    const w = tk.kind === "punct" ? 2.4 : tk.kind === "space" ? 0.4 : tk.kind === "latin" ? Math.min(2.6, 0.45 + 0.28 * tk.ch.length) : 1;
    at += (j * w) / cps;
  });
  const dur = rel.length ? rel[rel.length - 1] + 0.05 : 0;

  return {
    dur,
    tokens: toks,
    rel,
    /** 最后一个字出现的相对时刻 */
    last: rel.length ? rel[rel.length - 1] : 0,
    render(t, t0) {
      for (let i = 0; i < toks.length; i++) {
        const ti = t0 + rel[i];
        const el = toks[i].el;
        const on = t >= ti;
        setStyle(el, "display", on ? "" : "none");
        if (!on) continue;
        if (pop && t - ti < 0.9) {
          const a = appear(t, ti, POP);
          setStyle(el, "opacity", clamp01(a * 1.6).toFixed(3));
          setStyle(el, "transform", `translateY(${((1 - a) * 0.28).toFixed(3)}em) scale(${(0.72 + 0.28 * a).toFixed(3)})`);
        } else {
          setStyle(el, "opacity", "1");
          setStyle(el, "transform", "none");
        }
      }
      for (const m of marks) {
        const p = appear(t, t0 + rel[m.last] + 0.14, MARK);
        setStyle(m.mark, "transform", `scaleX(${clamp01(p).toFixed(4)})`);
      }
    },
  };
}

/** 打字音效提示：每隔一两个字一声，音量压低；返回 [{t, name, gain}]（绝对时刻 = t0 + 相对时刻） */
export function typingSfx(ty, t0, { every = 2, gain = -27, seed = 3 } = {}) {
  const out = [];
  let n = 0;
  ty.tokens.forEach((tk, i) => {
    if (tk.kind === "space" || tk.kind === "punct") return;
    if (n++ % every) return;
    out.push({ t: t0 + ty.rel[i], name: `key-${1 + Math.floor(hash01(i, seed) * 8)}`, gain });
  });
  return out;
}
