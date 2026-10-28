// 风格样片集 · 第十批：手绘过程（白板 / 手绘讲解片：铅笔起稿 → 针管笔描线 → 马克笔上色 → 手写字，一只拿笔的手一直跟着笔尖）。
// 同一段开场（复用第 01 期 B01 旁白），0 积分。画在一张比屏幕大的「纸」上，镜头跟着手走，最后拉远看全图。手和笔都是原创 SVG。
import { clamp, lerp, eOutCubic, eInOutCubic, el, css } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 2.6;
export const meta = { title: "风格样片集 · 手绘过程", n: "styles10" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const NS = "http://www.w3.org/2000/svg";
const KAI = "'Kaiti SC','STKaiti','KaiTi',serif";
const INK = "#23201C", PENCIL = "#B9B2A6", RED = "#D7392B";

function sketch(s, h, z, B) {
  el(s, "abs", "inset:0;background:#FBF8F2;");
  el(s, "abs", "inset:0;opacity:0.5;background-image:radial-gradient(rgba(120,100,70,0.08) 1px,transparent 1.2px);background-size:7px 7px;");
  const wrap = el(s, "abs", "left:0;top:0;width:2600px;height:1460px;transform-origin:0 0;");
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", "2600"); svg.setAttribute("height", "1460"); wrap.appendChild(svg);
  const defs = document.createElementNS(NS, "defs"); svg.appendChild(defs);
  const mk = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };
  const gFill = mk("g", {}), gPencil = mk("g", { fill: "none", stroke: PENCIL, "stroke-width": "2.5", "stroke-linecap": "round", opacity: "0.85" }), gInk = mk("g", { fill: "none", stroke: INK, "stroke-width": "6", "stroke-linecap": "round", "stroke-linejoin": "round" }), gText = mk("g", {});
  const prep = (n) => { const L = n.getTotalLength(); n.style.strokeDasharray = `${L} ${L}`; n.style.strokeDashoffset = L; n.dataset.L = L; return n; };
  const items = []; // {t0, dur, upd(k), pt(k)}
  const addPath = (d, t0, dur, { pencil = true, ink = true, color = INK, w = 6 } = {}) => {
    if (pencil) { const p = prep(mk("path", { d, transform: "translate(3 2)" }, gPencil)); items.push({ sk: p }); }
    if (!ink) return;
    const n = prep(mk("path", { d, stroke: color, "stroke-width": w }, gInk));
    items.push({ t0, dur, upd: (k) => { n.style.strokeDashoffset = String(n.dataset.L * (1 - k)); }, pt: (k) => { const p = n.getPointAtLength(n.dataset.L * k); return [p.x, p.y]; } });
  };
  // 手写字：clip 矩形从左往右展开，手跟着展开的边
  let tc = 0;
  const addText = (txt, x, y, size, t0, dur, color = INK) => {
    const id = `tc${tc++}`, cp = mk("clipPath", { id }, defs), r = mk("rect", { x, y: y - size, width: 0, height: size * 1.4 }, cp);
    const w = [...txt].reduce((a, c) => a + (/[0-9 →?!.]/.test(c) ? size * 0.58 : size), 0);
    const t = mk("text", { x, y, "font-family": KAI, "font-size": size, "font-weight": "700", fill: color, "clip-path": `url(#${id})` }, gText); t.textContent = txt;
    items.push({ t0, dur, upd: (k) => r.setAttribute("width", String(w * k)), pt: (k) => [x + w * k, y - size * 0.25] });
    return { t, w };
  };
  // 马克笔上色：形状做 clipPath，里面一条来回扫的粗笔触按 dash 画出来
  let fc = 0;
  const addFill = (shapeD, bx, by, bw, bh, color, t0, dur) => {
    const id = `fc${fc++}`, cp = mk("clipPath", { id }, defs); mk("path", { d: shapeD }, cp);
    const rows = Math.ceil(bh / 30); let d = `M${bx - 20} ${by}`;
    for (let i = 0; i <= rows; i++) d += ` L${i % 2 ? bx - 20 : bx + bw + 20} ${by + i * 30 + 15}`;
    const n = prep(mk("path", { d, fill: "none", stroke: color, "stroke-width": "46", "stroke-linecap": "round", "stroke-linejoin": "round", opacity: "0.82", "clip-path": `url(#${id})`, style: "mix-blend-mode:multiply" }, gFill));
    items.push({ t0, dur, upd: (k) => { n.style.strokeDashoffset = String(n.dataset.L * (1 - k)); }, pt: (k) => { const p = n.getPointAtLength(n.dataset.L * k); return [clamp(p.x, bx, bx + bw), p.y]; } });
  };
  // ── 画面 ──
  const ROOF = "M640 622 L1000 470 L1360 622 Z";
  addPath("M300 905 Q1300 913 2300 903", h + 0.2, 0.28);
  addPath("M700 905 L700 620 L1300 620 L1300 905", h + 0.48, 0.36);
  addPath(ROOF, h + 0.84, 0.3);
  addPath("M920 905 L920 770 Q1000 700 1080 770 L1080 905", h + 1.14, 0.2);
  addPath("M1440 905 L1446 430 M1462 905 L1466 432", h + 1.34, 0.16, { w: 7 });
  addText("一根木头", 360, 300, 110, h + 1.5, 0.3);
  addText("南门 → 北门", 380, 420, 64, h + 1.8, 0.2);
  addText("赏 10 金", 1560, 320, 116, B.ten, 0.42);
  const COINS = [[2000, 300, 46], [2105, 270, 40], [2080, 372, 44]];
  COINS.forEach(([x, y, r], i) => addPath(`M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 M${x - r * 0.45} ${y} a${r * 0.45} ${r * 0.45} 0 1 0 ${r * 0.9} 0 a${r * 0.45} ${r * 0.45} 0 1 0 ${-r * 0.9} 0`, B.ten + 0.42 + i * 0.1, 0.12, { w: 5 }));
  const PEOPLE = [0, 1, 2, 3, 4].map((i) => 1580 + i * 100);
  PEOPLE.forEach((x, i) => addPath(`M${x - 28} 760 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0 M${x} 788 L${x} 860 M${x} 812 L${x - 32} 842 M${x} 812 L${x + 32} 842 M${x} 860 L${x - 24} 905 M${x} 860 L${x + 24} 905`, B.nobody - 0.3 + i * 0.07, 0.09, { w: 5 }));
  [0, 2, 4].forEach((i, j) => addText("?", PEOPLE[i] - 14, 708, 60, B.nobody + 0.1 + j * 0.07, 0.06, RED));
  addText("没人动", 1700, 1040, 80, B.nobody + 0.32, 0.3);
  addPath("M1610 290 L1790 250", B.fifty, 0.14, { pencil: false, color: RED, w: 9 });
  addText("50", 1650, 200, 120, B.fifty + 0.16, 0.3, RED);
  COINS.forEach(([x, y, r], i) => addFill(`M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`, x - r, y - r, 2 * r, 2 * r, "#F2C14E", B.fifty + 0.5 + i * 0.16, 0.16));
  addFill(ROOF, 640, 470, 720, 152, "#E46A4A", B.fifty + 1.0, 0.7);
  addFill("M700 905 L700 620 L1300 620 L1300 905 Z", 700, 620, 600, 285, "#F3D9B4", B.fifty + 1.7, 0.6);
  // 手（原创 SVG：笔尖在 0,0）
  const hand = mk("g", {});
  hand.innerHTML = `<g transform="rotate(-28) scale(0.8)">
    <path d="M-62 -150 Q-80 -230 -40 -270 L70 -280 Q96 -210 70 -140 Q40 -96 -10 -100 Q-48 -104 -62 -150 Z" fill="#F3CBA8" stroke="#8A5A3C" stroke-width="5"/>
    <path d="M-40 -270 L-52 -400 L84 -410 L70 -280 Z" fill="#5B8FD1" stroke="#2C4F7C" stroke-width="5"/>
    <rect x="-10" y="-330" width="20" height="300" rx="10" fill="#E8B13A" stroke="#7A5512" stroke-width="4"/><rect x="-10" y="-330" width="20" height="40" rx="8" fill="#D7392B" stroke="#7A2A1C" stroke-width="4"/>
    <path d="M-10 -32 L0 0 L10 -32 Z" fill="#F1DDB8" stroke="#5A4A36" stroke-width="3"/><path d="M-4 -12 L0 0 L4 -12 Z" fill="#23201C"/>
    <ellipse cx="-24" cy="-92" rx="30" ry="20" fill="#F3CBA8" stroke="#8A5A3C" stroke-width="5" transform="rotate(-20 -24 -92)"/>
    <ellipse cx="22" cy="-104" rx="32" ry="20" fill="#F3CBA8" stroke="#8A5A3C" stroke-width="5" transform="rotate(25 22 -104)"/>
    <path d="M30 -150 Q60 -150 66 -128" fill="none" stroke="#8A5A3C" stroke-width="4"/></g>`;
  const pencils = items.filter((i) => i.sk), draws = items.filter((i) => i.upd).sort((a, b) => a.t0 - b.t0);
  const CAM = [[h, 900, 600, 1.1], [B.ten, 1720, 470, 1.02], [B.nobody, 1800, 700, 1.0], [B.fifty, 1720, 400, 1.04], [B.fifty + 1.05, 1180, 640, 0.92], [z - 0.9, 1300, 640, 0.66]];
  const cam = (t) => { let [, x, y, sc] = CAM[0]; for (let i = 1; i < CAM.length; i++) { const [tk, xx, yy, ss] = CAM[i], k = eInOutCubic(clamp((t - (tk - 0.42)) / 0.42)); x = lerp(x, xx, k); y = lerp(y, yy, k); sc = lerp(sc, ss, k); } return [x, y, sc]; };
  return (t) => {
    const [cx, cy, sc] = cam(t); css(wrap, { transform: `translate(${(960 - cx * sc).toFixed(1)}px,${(540 - cy * sc).toFixed(1)}px) scale(${sc.toFixed(4)})` });
    // 铅笔稿：开场 0.9 秒内依次快速勾出
    pencils.forEach((p, i) => { const k = eOutCubic(clamp((t - h - 0.02 - i * 0.035) / 0.3)); p.sk.style.strokeDashoffset = String(p.sk.dataset.L * (1 - k)); });
    let act = null, last = null;
    for (const it of draws) { const k = clamp((t - it.t0) / it.dur); it.upd(k); if (t >= it.t0 && t < it.t0 + it.dur) act = [it, k]; if (t >= it.t0 + it.dur) last = it; }
    let pt, lift = 0;
    if (act) pt = act[0].pt(act[1]); else if (last) { pt = last.pt(1); lift = clamp((t - last.t0 - last.dur) / 0.15) * 26; } else pt = [1400, 1300];
    const out = clamp((t - (z - 0.9)) / 0.6);
    hand.setAttribute("transform", `translate(${(pt[0] + out * 900).toFixed(1)} ${(pt[1] - lift + out * 700).toFixed(1)})`);
    css(hand, { opacity: String(t >= h ? 1 : 0) });
  };
}

const ST = { name: "手绘过程", en: "HAND-DRAWN PROCESS", fit: "讲原理 · 讲过程 · 一步步画给你看", th: { bg: 0xFBF8F2, ink: "#23201C", dim: "#8A8072", accent: "#D7392B", light: true } };

export async function build(ctx) {
  const N = ctx.narr, T = (k) => N.t(k), END = N.total;
  const shots = [];
  const add = (from, to, b, r) => shots.push({ from, to, build: b, render: r });
  sections.push({ t: 0, t_to: END + TAIL, level: 1 });
  const a = 0, h = 1.8, z = END, B = beatsOf(T, "B01");
  sfx.push({ t: 0.15, type: "whoosh" }, { t: B.nobody, type: "tick" }, { t: B.fifty, type: "slam" });
  add(a, h, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#FBF8F2;");
    const no = el(s, "abs", `left:0;width:1920px;top:340px;text-align:center;font-family:Geist;font-size:26px;letter-spacing:10px;color:${ST.th.dim};`, `NEW STYLE · ${ST.en}`);
    const nm = el(s, "abs", `left:0;width:1920px;top:390px;text-align:center;font-family:${KAI};font-size:160px;font-weight:700;color:${ST.th.ink};letter-spacing:12px;`, ST.name);
    const ft = el(s, "abs cn", `left:0;width:1920px;top:610px;text-align:center;font-size:40px;color:${ST.th.accent};letter-spacing:3px;`, `适合：${ST.fit}`);
    return { s, ns: [no, nm, ft] };
  }, (t, u) => {
    bg(ctx, ST.th, { bloom: 0, vig: 0.1 });
    const k = eOutCubic(clamp((t - a) / 0.4)), o = 1 - clamp((t - h + 0.25) / 0.25);
    u.ns.forEach((n) => css(n, { opacity: String(k * o), transform: `translateY(${((1 - k) * 20).toFixed(1)}px)` }));
  });
  add(h, z, (root) => { const s = el(root, "shot"); return { s, draw: sketch(s, h, z, B) }; }, (t, u) => { bg(ctx, ST.th, { bloom: 0, vig: 0.08, grain: 0.01 }); u.draw(t); });
  add(END, END + TAIL, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#0B0A0C;");
    el(s, "abs cn", "left:0;width:1920px;top:380px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +1：手绘过程");
    el(s, "abs cn", "left:0;width:1920px;top:520px;text-align:center;font-size:30px;color:#a8a29a;", "铅笔起稿 → 针管笔描线 → 马克笔上色 → 手写字 · 手一直跟着笔尖");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
