// 讲解课的 DOM 组件：大字、代码卡、提示词条、引用卡、出处小字、暂停卡、回顾导图。
// 每个组件只负责「长什么样」；动画由镜头函数按时间 t 算（appear / slam / type …），没有任何内部状态。
import { el, css, clamp, lerp, eOutCubic, eOutQuint, spring } from "./util.js";

export const C = { orange: "#ff7a3d", teal: "#3fe0d0", ivory: "#f6f2ea", dim: "#bdb6aa", mute: "#77737d", red: "#ff5a5a" };

// ── 通用动画 ──
export function appear(node, t, at, o = {}) {
  const { dy = 26, dur = 0.28, out = null, outDur = 0.22, scale = 0, blur = 0 } = o;
  const k = eOutCubic(clamp((t - at) / dur));
  const ko = out == null ? 0 : clamp((t - out) / outDur);
  const a = k * (1 - ko);
  css(node, {
    opacity: String(a), visibility: a > 0.001 ? "visible" : "hidden",
    transform: `translateY(${(1 - k) * dy - ko * dy * 0.5}px) scale(${1 + (1 - k) * scale})`,
    filter: blur ? `blur(${(1 - k) * blur + ko * blur * 0.6}px)` : "none",
  });
  return a;
}
export function slam(node, t, at, o = {}) {
  const { from = 1.25, out = null, outDur = 0.2, origin = "50% 50%" } = o;
  const k = t - at;
  const ko = out == null ? 0 : clamp((t - out) / outDur);
  const a = clamp(k / 0.04) * (1 - ko);
  css(node, { opacity: String(a), visibility: a > 0.001 ? "visible" : "hidden", transformOrigin: origin,
    transform: `scale(${k > 0 ? lerp(from, 1, spring(k, 3, 0.55)) : from})`, filter: `blur(${Math.max(0, 16 * (1 - k / 0.1)) + ko * 10}px)` });
  return a;
}
export function wipeUp(node, t, at, dur = 0.32) {   // 包在 overflow:hidden 里的一行字从下面推上来
  css(node, { transform: `translateY(${(1 - eOutQuint(clamp((t - at) / dur))) * 110}%)` });
}
export function typeText(node, text, t, t0, t1) {
  const n = Math.floor(text.length * clamp((t - t0) / (t1 - t0)));
  const s = text.slice(0, n);
  if (node.textContent !== s) node.textContent = s;
  return n;
}

// ── 组件 ──
export function bigText(parent, html, style = "") {
  return el(parent, "abs cn", `font-size:84px;line-height:1.18;font-weight:900;color:${C.ivory};white-space:nowrap;${style}`, html);
}

export function kicker(parent, html, style = "") {
  return el(parent, "abs mono", `font-size:22px;letter-spacing:4px;color:${C.orange};white-space:nowrap;${style}`, html);
}

// 代码卡：lines 是 HTML 字符串数组（可用 <k> <t> <n> <c> 标记关键字、变量、数字、注释）
export function codeCard(parent, { x, y, w, h, file = "film.js", lines, size = 25, lh = 38 }) {
  const card = el(parent, "abs", `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:22px;background:rgba(13,13,18,0.84);border:1px solid rgba(255,255,255,0.09);box-shadow:0 40px 100px rgba(0,0,0,0.55);overflow:hidden;`);
  el(card, "abs", "left:26px;top:22px;width:12px;height:12px;border-radius:6px;background:#ff5f57;box-shadow:20px 0 0 #febc2e,40px 0 0 #28c840;");
  el(card, "abs mono", "left:96px;top:15px;font-size:19px;color:#6d6a74;", file);
  const box = el(card, "abs", `left:0;top:62px;width:${w}px;`);
  const fmt = (l) => l.replace(/<k>/g, `<span style="color:${C.orange}">`).replace(/<\/k>/g, "</span>")
    .replace(/<t>/g, `<span style="color:${C.orange};font-weight:700">`).replace(/<\/t>/g, "</span>")
    .replace(/<n>/g, `<span style="color:${C.teal}">`).replace(/<\/n>/g, "</span>")
    .replace(/<c>/g, `<span style="color:#5d6170">`).replace(/<\/c>/g, "</span>");
  const rows = lines.map((l, i) => {
    const r = el(box, "abs mono", `left:0;top:${i * lh}px;width:${w}px;height:${lh}px;line-height:${lh}px;padding-left:34px;font-size:${size}px;color:#d9d3c7;white-space:pre;`, fmt(l));
    return r;
  });
  return { card, rows, hl(i, on, col = "rgba(255,122,61,0.16)") { css(rows[i], { background: on ? col : "transparent", boxShadow: on ? `inset 4px 0 0 ${C.orange}` : "none" }); } };
}

// 提示词条：标签 + 打字
export function promptChip(parent, text, { y = 968, label = "提示词", x = null, w = null } = {}) {
  const pos = x == null ? `left:50%;transform:translateX(-50%);` : `left:${x}px;`;
  const box = el(parent, "abs", `${pos}top:${y}px;min-height:62px;border-radius:31px;background:rgba(16,15,20,0.9);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;gap:14px;padding:12px 28px 12px 18px;${w ? `width:${w}px;white-space:normal;` : "white-space:nowrap;"}box-shadow:0 20px 50px rgba(0,0,0,0.45);`);
  el(box, "mono", `flex:none;font-size:17px;color:#111;background:${C.orange};border-radius:14px;padding:3px 10px;font-weight:700;`, label);
  const tx = el(box, "cn", "font-size:28px;line-height:42px;font-weight:500;color:#f2ece2;");
  const caret = el(box, "", `flex:none;width:3px;height:30px;background:${C.orange};`);
  return { box, tx, caret, text,
    update(t, t0, t1) { const n = typeText(tx, text, t, t0, t1); css(caret, { opacity: n < text.length || Math.floor(t * 2.2) % 2 ? "1" : "0" }); } };
}

// 引用卡（社区作者原句）：英文原文 + 中文意思 + 出处
export function quoteCard(parent, { x, y, w, who, text, zh, src }) {
  const c = el(parent, "abs", `left:${x}px;top:${y}px;width:${w}px;border-radius:20px;background:rgba(18,17,24,0.9);border:1px solid rgba(255,255,255,0.1);padding:26px 30px;box-shadow:0 30px 80px rgba(0,0,0,0.5);`);
  el(c, "mono", `font-size:20px;color:${C.orange};margin-bottom:12px;`, who);
  el(c, "", "font-family:Geist;font-size:30px;line-height:42px;font-weight:600;color:#f2ece2;", `“${text}”`);
  if (zh) el(c, "cn", "margin-top:12px;font-size:24px;line-height:36px;color:#bdb6aa;", zh);
  if (src) el(c, "mono", "margin-top:14px;font-size:16px;color:#6f6c76;", src);
  return c;
}

// 左下角出处小字
export function sourceTag(parent, text) {
  return el(parent, "abs mono", "left:110px;top:1012px;font-size:18px;color:#7c7884;white-space:nowrap;", text);
}

// 暂停想一想
export function pauseCard(parent, q) {
  const c = el(parent, "abs", "left:0;top:0;width:1920px;height:1080px;");
  const tag = el(c, "abs cn", `left:0;width:1920px;top:300px;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;color:${C.teal};`, "暂停想一想");
  const qq = el(c, "abs cn", "left:260px;width:1400px;top:380px;text-align:center;font-size:64px;line-height:92px;font-weight:900;color:#f6f2ea;", q);
  const hint = el(c, "abs mono", "left:0;width:1920px;top:640px;text-align:center;font-size:22px;color:#77737d;", "⏸ 按空格暂停，想好再继续");
  return { c, tag, qq, hint };
}

// 回顾导图：中心 + 三个分支（SVG 连线随时间画出来）
export function recapMap(parent, center, branches) {
  const c = el(parent, "abs", "left:0;top:0;width:1920px;height:1080px;");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "1920"); svg.setAttribute("height", "1080");
  svg.style.cssText = "position:absolute;left:0;top:0";
  c.appendChild(svg);
  const cx = 960, cy = 520;
  const pos = [[960, 210], [430, 760], [1490, 760]];
  const paths = pos.map(([x, y]) => {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const mx = (cx + x) / 2, my = (cy + y) / 2 - 40;
    p.setAttribute("d", `M${cx} ${cy} Q${mx} ${my} ${x} ${y}`);
    p.setAttribute("fill", "none"); p.setAttribute("stroke", C.orange); p.setAttribute("stroke-width", "4"); p.setAttribute("stroke-linecap", "round");
    svg.appendChild(p);
    const L = 1400; p.style.strokeDasharray = `${L}`; p.style.strokeDashoffset = `${L}`;
    return p;
  });
  const mid = el(c, "abs cn", `left:${cx - 230}px;top:${cy - 64}px;width:460px;height:128px;border-radius:64px;background:${C.orange};color:#111;font-size:46px;font-weight:900;display:flex;align-items:center;justify-content:center;`, center);
  const nodes = branches.map((b, i) => el(c, "abs", `left:${pos[i][0] - 270}px;top:${pos[i][1] - 70}px;width:540px;border-radius:26px;background:rgba(20,19,26,0.92);border:2px solid rgba(255,255,255,0.14);padding:20px 26px;text-align:center;`,
    `<div class="cn" style="font-size:38px;font-weight:900;color:#f6f2ea">${b[0]}</div><div class="cn" style="margin-top:6px;font-size:24px;line-height:34px;color:#bdb6aa">${b[1]}</div>`));
  return { c, paths, mid, nodes,
    update(t, t0, ts) {
      appear(mid, t, t0, { scale: 0.2 });
      paths.forEach((p, i) => { css(p, { strokeDashoffset: String(1400 * (1 - eOutCubic(clamp((t - ts[i]) / 0.5)))) }); });
      nodes.forEach((n, i) => appear(n, t, ts[i] + 0.25, { scale: 0.08 }));
    } };
}

// 案例片段框：预览和接触表里显示封面图，出片时 finish.py 用 ffmpeg 把真实片段逐帧叠到同一位置（框上不要压任何字）
export function clipBox(parent, { x, y, w, h, poster, label = "", sub = "" }) {
  const c = el(parent, "abs", `left:${x - 4}px;top:${y - 4}px;width:${w + 8}px;height:${h + 8}px;border-radius:10px;background:#000;box-shadow:0 0 0 2px rgba(255,255,255,0.16),0 40px 100px rgba(0,0,0,0.6);`);
  el(c, "abs", `left:4px;top:4px;width:${w}px;height:${h}px;background:#000 url(${poster}) center/cover no-repeat;`);
  const lab = label ? el(parent, "abs", `left:${x}px;top:${y + h + 14}px;width:${w}px;white-space:nowrap;`,
    `<span class="cn" style="font-size:26px;font-weight:800;color:#f6f2ea">${label}</span><span class="mono" style="margin-left:14px;font-size:18px;color:#8d8993">${sub}</span>`) : null;
  return { c, lab };
}
