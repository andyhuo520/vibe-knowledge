/**
 * Terminal 终端回放：播放 scripts/term_record.py 真实录下、term_frames.py 回放出的帧。
 * 画面是一扇 macOS 风格的深色终端窗口；文字逐格排版（宽字符占两格），所以和真实终端一模一样，但放大不糊。
 *
 * params
 *   data        term_frames.py 的输出（{cols, rows, frames, marks, duration}）
 *   at, out     在课里的出场、退场时刻
 *   from, to    播录屏的哪一段（录屏自己的秒数；默认整段）
 *   rate        播放倍速（默认 1）；场景模板会按场景长度自动算
 *   w           窗口宽度（像素，默认 1400）
 *   title       标题栏文字
 *   rowsShown   只显示录屏的第几行到第几行 [a, b]（裁掉空白，字会跟着变大）
 *   hi          高亮 [{rows: [a, b], at, until, color}]：给某几行套一层色框，提醒观众看这里
 *   zoom        [{at, until, rows: [a, b], scale}]：镜头推近到某几行
 * render(t) 只依赖 t。
 */
import { h, setStyle } from "../runtime/dom.js";
import { appear, UI } from "../runtime/spring.js";
import { clamp01, cubicInOut } from "../runtime/ease.js";

const CSS = `
.tm{position:absolute;left:0;top:0;transform-origin:50% 50%;border-radius:18px;overflow:hidden;background:#1B1F2A;
  box-shadow:0 30px 70px rgba(20,30,40,.28),0 0 0 1.5px rgba(255,255,255,.06) inset}
.tm-bar{height:44px;display:flex;align-items:center;gap:9px;padding:0 18px;background:#262B38;color:#AEB6C8;font:600 18px/1 "Geist","Noto Sans SC",sans-serif}
.tm-bar i{width:13px;height:13px;border-radius:50%;display:block}
.tm-bar span{margin-left:10px}
.tm-view{position:relative;overflow:hidden}
.tm-body{position:absolute;left:0;top:0;transform-origin:0 0;padding:14px 20px 18px;font-family:"Geist Mono","SF Mono",Menlo,"Noto Sans SC",monospace;color:#E4E8F1;white-space:pre}
.tm-row{height:1.32em;line-height:1.32em}
.tm-w{display:inline-block;width:2ch;text-align:center}
.tm-cur{position:absolute;width:1ch;height:1.2em;background:#9FE2C8;opacity:.85}
.tm-hi{position:absolute;left:10px;right:10px;border-radius:10px;border:3px solid #FFD666;background:rgba(255,214,102,.10);box-shadow:0 0 0 6px rgba(255,214,102,.12)}
`;

const NAMED = {
  default: null, black: "#3B4252", red: "#F2777A", green: "#99C794", brown: "#F9D071", yellow: "#F9D071", blue: "#6699CC",
  magenta: "#C594C5", cyan: "#5FB3B3", white: "#D8DEE9",
  brightblack: "#6B7385", brightred: "#FF8F91", brightgreen: "#B5E6A8", brightbrown: "#FFE08A", brightyellow: "#FFE08A",
  brightblue: "#8AB4F8", brightmagenta: "#DDA9E6", brightcyan: "#7ED6D6", brightwhite: "#FFFFFF",
};
const FG0 = "#E4E8F1", BG0 = "#1B1F2A";
const color = (c, fallback) => (c == null || c === "default" ? fallback : NAMED[c] !== undefined ? NAMED[c] ?? fallback : /^[0-9a-f]{6}$/i.test(c) ? `#${c}` : fallback);
// 全角字符（CJK、全角标点、emoji）占两格。用码位比较而不是字符类正则：源码里不出现非 ASCII 字符，页面编码没声明时也不会报错
const WIDE_RANGES = [[0x1100, 0x115f], [0x2e80, 0xa4cf], [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe30, 0xfe4f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f300, 0x1faff]];
const isWide = (ch) => { const c = ch.codePointAt(0); return WIDE_RANGES.some(([a, b]) => c >= a && c <= b); };
const esc = (s) => s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);

function rowHTML(runs) {
  let out = "";
  for (const [text, fg, bg, fl] of runs) {
    let f = color(fg, FG0), b = color(bg, null);
    if (fl & 8) [f, b] = [b ?? BG0, f];
    const st = `color:${f}${b ? `;background:${b}` : ""}${fl & 1 ? ";font-weight:700" : ""}${fl & 2 ? ";font-style:italic" : ""}${fl & 4 ? ";text-decoration:underline" : ""}`;
    let inner = "";
    for (const ch of text) inner += isWide(ch) ? `<span class="tm-w">${esc(ch)}</span>` : esc(ch);
    out += `<span style="${st}">${inner}</span>`;
  }
  return out || " ";
}

export const Terminal = {
  name: "terminal",
  create(root, p, ctx) {
    ctx.css("pr-terminal", CSS);
    const D = p.data, at = p.at ?? 0, out = p.out ?? Infinity, rate = p.rate ?? 1;
    const from = p.from ?? 0, to = p.to ?? D.duration;
    const [r0, r1] = p.rowsShown ?? [0, D.rows - 1];
    const nRows = r1 - r0 + 1;
    // 字号同时受宽、高两头限制：宽按列数（等宽字宽约 0.6em），高按行数，窗口整体不超过 maxH
    const maxH = p.maxH ?? 900;
    const fs = Math.min(40, ((p.w ?? 1400) - 40) / (D.cols * 0.602), (maxH - 76) / (nRows * 1.32));
    const W = Math.round(D.cols * 0.602 * fs + 40);
    const lineH = fs * 1.32;
    const H = 44 + nRows * lineH + 32;

    // 逐帧还原完整画面（每行是 runs 数组，没变的行共用同一个引用，比较引用即可知道要不要重画）
    const states = [];
    let cur = Array.from({ length: D.rows }, () => []);
    for (const f of D.frames) {
      const next = cur.slice();
      for (const k in f.d) next[+k] = f.d[k];
      states.push({ t: f.t, rows: next, c: f.c });
      cur = next;
    }
    const times = states.map((s) => s.t);

    const el = h("div", { class: "tm", style: { width: `${W}px`, height: `${H}px`, marginLeft: `${-W / 2}px`, marginTop: `${-H / 2}px` } });
    const bar = h("div", { class: "tm-bar" });
    ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c) => bar.append(h("i", { style: { background: c } })));
    bar.append(h("span", { text: p.title ?? "终端" }));
    const view = h("div", { class: "tm-view", style: { height: `${H - 44}px` } });
    const body = h("div", { class: "tm-body", style: { fontSize: `${fs}px`, top: `${-r0 * lineH}px` } });
    const rowEls = Array.from({ length: D.rows }, () => h("div", { class: "tm-row" }));
    rowEls.forEach((r) => body.append(r));
    const cursor = h("div", { class: "tm-cur" });
    body.append(cursor);
    view.append(body);
    const his = (p.hi ?? []).map((x) => {
      const e = h("div", { class: "tm-hi", style: { top: `${14 + (x.rows[0] - r0) * lineH - 4}px`, height: `${(x.rows[1] - x.rows[0] + 1) * lineH + 8}px`,
        borderColor: x.color ?? "#FFD666" } });
      view.append(e);
      return { ...x, e };
    });
    el.append(bar, view);
    // 贴纸风：外圈白边 + 细描边 + 投影（用 box-shadow 画在框外，不改变窗口几何，标注坐标照旧）
    if (p.sticker) el.style.boxShadow = "0 0 0 10px #fff, 0 0 0 11.5px rgba(55,53,47,.14), 0 26px 56px rgba(55,53,47,.24)";
    root.append(el);

    const drawn = new Array(D.rows).fill(null);
    let lastIdx = -1;
    const idxAt = (lt) => {
      let lo = 0, hi = times.length - 1, ans = 0;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (times[m] <= lt) { ans = m; lo = m + 1; } else hi = m - 1; }
      return ans;
    };

    return {
      duration: out,
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const a = appear(t, at, UI);
        const ex = clamp01((t - out) / 0.3);
        // 镜头推近
        let sc = 1, ty = 0;
        for (const z of p.zoom ?? []) {
          const k = cubicInOut(clamp01((t - z.at) / 0.6)) * (1 - cubicInOut(clamp01((t - (z.until ?? Infinity)) / 0.6)));
          if (k > 0) { sc = 1 + ((z.scale ?? 1.6) - 1) * k; ty = -(((z.rows[0] + z.rows[1]) / 2 - r0 + 0.5) * lineH - (H - 44) / 2) * k; }
        }
        setStyle(el, "opacity", (a * (1 - ex)).toFixed(3));
        setStyle(el, "transform", p.sticker ? `scale(${(1.06 - 0.06 * a).toFixed(4)})` : `translateY(${((1 - a) * 30).toFixed(1)}px)`);
        setStyle(body, "transform", `translateY(${(ty * sc).toFixed(1)}px) scale(${sc.toFixed(4)})`);
        setStyle(body, "transformOrigin", `50% ${(((p.zoom?.[0]?.rows?.[0] ?? r0) - r0) * lineH).toFixed(0)}px`);

        const lt = Math.min(to, from + Math.max(0, t - at) * rate);
        const i = idxAt(lt);
        if (i !== lastIdx) {
          const S = states[i];
          for (let y = 0; y < D.rows; y++) if (drawn[y] !== S.rows[y]) { rowEls[y].innerHTML = rowHTML(S.rows[y]); drawn[y] = S.rows[y]; }
          lastIdx = i;
        }
        const S = states[i];
        const blink = Math.floor((t - at) * 1.6) % 2 === 0;
        setStyle(cursor, "display", S.c[2] && blink ? "block" : "none");
        setStyle(cursor, "left", `calc(20px + ${S.c[0]}ch)`);
        setStyle(cursor, "top", `${14 + S.c[1] * lineH + fs * 0.06}px`);
        for (const x of his) {
          const k = clamp01((t - (typeof x.at === "number" ? x.at : at)) / 0.3) * (x.until != null ? clamp01((x.until - t) / 0.3) : 1);
          setStyle(x.e, "opacity", k.toFixed(3));
        }
      },
    };
  },
};

export default Terminal;
