// 风格样片集 · 第三批「补空白家族」：8 套 0 积分代码风格，同一段开场（复用第 01 期 B01 旁白）。
// 明亮流行：综艺花字、孟菲斯波普；图解与设计学派：粉笔黑板、蓝图专利图、等轴测剖面、瑞士网格动态字；印刷：孔版印刷；暗场：深色数学。
// 每套不只换皮，也换讲法（见各函数头注释）。时间轴由 tools/style_reel.py 生成：ten≈h+2.36 nobody≈h+3.12 fifty≈h+3.82。
import { clamp, lerp, eOutCubic, eInOutCubic, eOutQuint, eInCubic, eOutBack, hit, el, css, rng } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 3.0;
export const meta = { title: "风格样片集 · 补空白家族", n: "styles3" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const val = (t, B) => (t < B.ten ? 0 : t < B.fifty ? Math.round(10 * eOutCubic(clamp((t - B.ten) / 0.4))) : Math.round(lerp(10, 50, eOutCubic(clamp((t - B.fifty) / 0.5)))));
const fade = (t, a, b, f = 0.25) => clamp((t - a) / f) * (1 - clamp((t - b + f) / f));
const pop = (t, at, d = 0.35) => (t < at ? 0 : eOutBack(clamp((t - at) / d)));
const ring = (r, c, dy = 0, n = 18) => [...Array(n)].map((_, i) => `${(r * Math.cos((i / n) * 6.2832)).toFixed(1)}px ${(dy + r * Math.sin((i / n) * 6.2832)).toFixed(1)}px 0 ${c}`).join(",");
const svgBox = (p, style, inner) => { const d = el(p, "abs", style); d.innerHTML = inner; return d; };
const prep = (nodes) => nodes.forEach((n) => { const L = n.getTotalLength(); n.style.strokeDasharray = `${L} ${L}`; n.dataset.L = L; n.style.strokeDashoffset = L; });
const drawK = (n, k) => { n.style.strokeDashoffset = String(n.dataset.L * (1 - k)); };
const drawAt = (n, t, a, d) => drawK(n, eInOutCubic(clamp((t - a) / d)));
const wipe = (n, t, a, d) => { const k = clamp((t - a) / d); css(n, { clipPath: `inset(-20% ${((1 - k) * 100).toFixed(1)}% -20% -2%)`, opacity: String(t < a ? 0 : 1) }); };
const KAI = "font-family:'Kaiti SC','STKaiti','KaiTi',serif;";
const SONG = "font-family:'Songti SC','STSong',serif;";

// ── 1 综艺花字：亮黄旋转放射底，粗白描边 + 深色厚投影的花字弹出，贴纸、对话泡、金币雨。讲法：每个包袱一个「弹」 ──
function variety(s, h, z, B) {
  const sky = el(s, "abs", "inset:0;background:#FFD23F;");
  const burst = el(s, "abs", "left:-460px;top:-1000px;width:2840px;height:2840px;border-radius:50%;background:repeating-conic-gradient(rgba(255,255,255,0.30) 0deg 9deg,rgba(255,255,255,0) 9deg 18deg);");
  el(s, "abs", "inset:0;background-image:radial-gradient(rgba(255,255,255,0.38) 3px,transparent 3.6px);background-size:34px 34px;");
  const stage = el(s, "abs", "inset:0;");
  const tag = el(stage, "abs cn", "left:90px;top:70px;padding:10px 30px;border-radius:40px;background:#FF3B5C;color:#fff;font-size:40px;font-weight:900;transform:rotate(-4deg);box-shadow:0 8px 0 #2B1B5A;", "南门 · 搬木头挑战");
  const star = svgBox(stage, "left:40px;top:150px;width:1000px;height:700px;", `<svg width="1000" height="700" viewBox="0 0 1000 700"><path d="${[...Array(24)].map((_, i) => { const r = i % 2 ? 250 : 360, a = (i / 24) * 6.2832; return `${i ? "L" : "M"}${(500 + r * 1.3 * Math.cos(a)).toFixed(0)} ${(350 + r * Math.sin(a)).toFixed(0)}`; }).join(" ")}Z" fill="#FFE14D" stroke="#2B1B5A" stroke-width="10" stroke-linejoin="round"/></svg>`);
  const log = svgBox(stage, "left:1330px;top:160px;width:360px;height:780px;", `<svg width="360" height="780" viewBox="0 0 360 780"><g transform="rotate(8 180 390)"><rect x="104" y="34" width="152" height="712" rx="64" fill="#2B1B5A" transform="translate(10 14)"/><rect x="104" y="34" width="152" height="712" rx="64" fill="#fff"/><rect x="118" y="48" width="124" height="684" rx="54" fill="#C27A3E"/><path d="M152 130 L152 660 M182 100 L182 700 M212 150 L212 630" stroke="#8C5226" stroke-width="8" stroke-linecap="round"/><ellipse cx="180" cy="84" rx="58" ry="28" fill="#EDB97F" stroke="#8C5226" stroke-width="6"/><ellipse cx="180" cy="84" rx="26" ry="12" fill="none" stroke="#8C5226" stroke-width="5"/></g></svg>`);
  const drop = svgBox(stage, "left:1290px;top:150px;width:90px;height:120px;", `<svg width="90" height="120"><path d="M45 8 Q80 64 70 88 Q58 114 30 106 Q8 96 16 70 Q24 46 45 8Z" fill="#7FD3FF" stroke="#2B1B5A" stroke-width="6"/></svg>`);
  const flower = (txt, size, fill, x, y) => el(stage, "abs cn", `left:${x}px;top:${y}px;font-size:${size}px;font-weight:900;color:${fill};white-space:nowrap;line-height:1.05;text-shadow:${ring(11, "#fff")},${ring(12, "#2B1B5A", 15)};transform-origin:30% 60%;`, txt);
  const t1 = flower("一根木头", 160, "#FF3B5C", 120, 250), t2 = flower("南门 ➜ 北门", 96, "#2D6BFF", 132, 470);
  const num = flower("", 210, "#FF3B5C", 110, 250);
  const bub = svgBox(stage, "left:600px;top:560px;width:640px;height:300px;", `<svg width="640" height="300"><path d="M40 30 H600 Q620 30 620 50 V200 Q620 220 600 220 H200 L120 290 L140 220 H40 Q20 220 20 200 V50 Q20 30 40 30Z" fill="#fff" stroke="#2B1B5A" stroke-width="9" stroke-linejoin="round"/><text x="320" y="160" text-anchor="middle" font-family="NotoSC" font-weight="900" font-size="96" fill="#2B1B5A">没人动……</text></svg>`);
  const x5 = flower("直接翻五倍！", 84, "#2D6BFF", 150, 560);
  const R = rng(21), coins = [...Array(18)].map(() => ({ x: 80 + R() * 1760, d: R() * 0.9, v: 900 + R() * 500, r: R() * 360, n: el(s, "abs cn", "width:96px;height:96px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFF3A0,#FFC400 55%,#D99400);border:6px solid #8A5A00;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:900;color:#8A5A00;", "金") }));
  return (t) => {
    const F = t >= B.fifty;
    css(sky, { background: F ? "#FF6B3D" : "#FFD23F" });
    css(burst, { transform: `rotate(${((t - h) * 10).toFixed(2)}deg)` });
    css(stage, { transform: `scale(${(1 + 0.05 * hit(t, B.fifty, 7)).toFixed(4)})` });
    css(tag, { opacity: String(clamp((t - h) / 0.15)) });
    const p1 = pop(t, h + 0.2) * (t < B.ten ? 1 : 0), p2 = pop(t, h + 0.85) * (t < B.ten ? 1 : 0);
    css(t1, { opacity: String(p1 > 0 ? 1 : 0), transform: `scale(${p1.toFixed(3)}) rotate(-5deg)` });
    css(t2, { opacity: String(p2 > 0 ? 1 : 0), transform: `scale(${p2.toFixed(3)}) rotate(3deg)` });
    css(log, { transform: `translateY(${(Math.sin((t - h) * 3) * 10).toFixed(1)}px) scale(${pop(t, h + 0.05).toFixed(3)})` });
    const pn = F ? pop(t, B.fifty, 0.3) : pop(t, B.ten, 0.3);
    num.textContent = F ? `${val(t, B)} 金!!` : `赏 ${val(t, B)} 金！`;
    css(num, { opacity: String(t >= B.ten ? 1 : 0), color: F ? "#FFD200" : t >= B.nobody ? "#B9A7C9" : "#FF3B5C", transform: `scale(${pn.toFixed(3)}) rotate(${F ? -4 : -6}deg)`, top: F ? "250px" : "250px", fontSize: F ? "260px" : "210px" });
    css(star, { opacity: String(F ? 1 : 0), transform: `scale(${pop(t, B.fifty, 0.4).toFixed(3)}) rotate(${((t - B.fifty) * 6).toFixed(1)}deg)` });
    const pb = pop(t, B.nobody, 0.3); css(bub, { opacity: String(t >= B.nobody && t < B.fifty + 0.1 ? 1 : 0), transform: `scale(${pb.toFixed(3)})`, transformOrigin: "20% 100%" });
    css(drop, { opacity: String(t >= B.nobody && t < B.fifty ? 1 : 0), transform: `translateY(${(clamp((t - B.nobody) / 0.6) * 40).toFixed(1)}px)` });
    const px = pop(t, B.fifty + 0.35, 0.3); css(x5, { opacity: String(px > 0 ? 1 : 0), transform: `scale(${px.toFixed(3)}) rotate(4deg)` });
    for (const c of coins) { const k = t - B.fifty - c.d; css(c.n, { opacity: String(k > 0 ? 1 : 0), left: `${c.x}px`, top: `${(-120 + k * c.v).toFixed(1)}px`, transform: `rotate(${(c.r + k * 300).toFixed(1)}deg)` }); }
  };
}

// ── 2 孟菲斯波普：奶油底 + 漂浮的几何碎片，积木拼的城门，黑白斜纹木杆，硬投影大字；五十金变沃霍尔四色格。讲法：形状拼出场景、色块翻转 ──
function memphis(s, h, z, B) {
  el(s, "abs", "inset:0;background:#FFF4E0;");
  const D = [
    `<svg width="260" height="70"><path d="M5 50 L35 15 L65 50 L95 15 L125 50 L155 15 L185 50 L215 15 L245 50" fill="none" stroke="#FF5D8F" stroke-width="12" stroke-linejoin="round"/></svg>`,
    `<div style="width:240px;height:170px;background-image:radial-gradient(#2EC4B6 6px,transparent 6.6px);background-size:30px 30px"></div>`,
    `<svg width="180" height="160"><path d="M90 12 L170 150 L10 150Z" fill="none" stroke="#FFC93C" stroke-width="14" stroke-linejoin="round"/></svg>`,
    `<div style="width:150px;height:150px;border-radius:50%;background:#2E86DE"></div>`,
    `<svg width="220" height="80"><path d="M8 40 Q35 5 62 40 T116 40 T170 40 T212 40" fill="none" stroke="#111" stroke-width="9" stroke-linecap="round"/></svg>`,
    `<div style="width:80px;height:80px;border-radius:50%;background:#FF5D8F;border:6px solid #111"></div>`,
    `<div style="width:120px;height:120px;background:repeating-linear-gradient(45deg,#111 0 10px,transparent 10px 22px);border-radius:50%"></div>`,
  ];
  const POS = [[110, 90], [1560, 70], [300, 860], [1700, 820], [820, 70], [60, 600], [1460, 900]];
  const deco = D.map((html, i) => { const d = el(s, "abs", `left:${POS[i][0]}px;top:${POS[i][1]}px;`); d.innerHTML = html; return d; });
  const gate = svgBox(s, "left:1060px;top:300px;width:760px;height:560px;", `<svg width="760" height="560"><g stroke="#111" stroke-width="7" stroke-linejoin="round">
    <rect x="98" y="186" width="580" height="340" fill="#111"/><rect x="90" y="170" width="580" height="340" fill="#2EC4B6"/>
    <path d="M40 170 L380 30 L720 170Z" fill="#FFC93C"/><rect x="90" y="170" width="70" height="340" fill="#FF5D8F"/><rect x="600" y="170" width="70" height="340" fill="#FF5D8F"/>
    <path d="M300 510 V370 A80 80 0 0 1 460 370 V510Z" fill="#111"/></g>
    <g fill="#fff">${[...Array(12)].map((_, i) => `<circle cx="${210 + (i % 6) * 60}" cy="${230 + Math.floor(i / 6) * 50}" r="8"/>`).join("")}</g></svg>`);
  const pole = el(s, "abs", "left:930px;top:250px;width:54px;height:610px;background:repeating-linear-gradient(-45deg,#111 0 20px,#fff 20px 40px);border:7px solid #111;box-shadow:14px 14px 0 #FF5D8F;");
  const lab = (txt, x, y, size, bgc = "#111", c = "#fff", rot = -3) => el(s, "abs cn", `left:${x}px;top:${y}px;padding:6px 24px;background:${bgc};color:${c};font-size:${size}px;font-weight:900;white-space:nowrap;box-shadow:10px 10px 0 #FF5D8F;transform:rotate(${rot}deg);`, txt);
  const l1 = lab("一根木头", 120, 300, 110), l2 = lab("南门 → 北门", 140, 480, 76, "#FFC93C", "#111", 2);
  const num = el(s, "abs", "left:110px;top:220px;font-family:Geist;font-size:330px;font-weight:900;letter-spacing:-12px;color:#FF5D8F;-webkit-text-stroke:0;text-shadow:16px 16px 0 #111;white-space:nowrap;line-height:1;");
  const kin = el(s, "abs cn", "left:120px;top:560px;font-size:120px;font-weight:900;color:#111;", "金");
  const nob = lab("没人动", 140, 720, 96, "#111", "#fff", -7);
  const CC = ["#FF5D8F", "#FFC93C", "#2E86DE", "#2EC4B6"];
  const grid = CC.map((c, i) => el(s, "abs", `left:${1080 + (i % 2) * 330}px;top:${230 + Math.floor(i / 2) * 330}px;width:310px;height:310px;background:${c};border:7px solid #111;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-family:Geist;font-size:170px;font-weight:900;color:#fff;text-shadow:9px 9px 0 #111;`, "50"));
  return (t) => {
    deco.forEach((d, i) => { const p = pop(t, h + i * 0.06, 0.4); css(d, { opacity: String(p > 0 ? 1 : 0), transform: `translate(${(Math.sin(t * 1.3 + i) * 10).toFixed(1)}px,${(Math.cos(t * 1.1 + i * 2) * 10).toFixed(1)}px) rotate(${(Math.sin(t * 0.8 + i) * 8).toFixed(1)}deg) scale(${p.toFixed(3)})` }); });
    const F = t >= B.fifty, wob = t >= B.nobody && !F ? Math.sin((t - B.nobody) * 30) * 2.5 : 0;
    css(gate, { opacity: String(1 - clamp((t - B.fifty) / 0.2)), transform: `translateY(${((1 - eOutBack(clamp((t - h - 0.15) / 0.5))) * 700).toFixed(1)}px) rotate(${wob.toFixed(2)}deg)` });
    css(pole, { transform: `translateY(${((1 - eOutBack(clamp((t - h - 0.35) / 0.5))) * -900).toFixed(1)}px)` });
    for (const [n, a] of [[l1, h + 0.3], [l2, h + 0.9]]) { const p = pop(t, a) * (t < B.ten ? 1 : 0); css(n, { opacity: String(p > 0 ? 1 : 0), transform: `scale(${p.toFixed(3)}) rotate(-3deg)` }); }
    const pn = F ? pop(t, B.fifty, 0.3) : pop(t, B.ten, 0.3);
    num.textContent = String(val(t, B)); css(num, { opacity: String(t >= B.ten ? 1 : 0), transform: `scale(${pn.toFixed(3)})`, transformOrigin: "20% 80%" });
    css(kin, { opacity: String(t >= B.ten ? 1 : 0), left: F ? "700px" : "560px", top: "420px" });
    const pb = pop(t, B.nobody, 0.25); css(nob, { opacity: String(pb > 0 && !F ? 1 : 0), transform: `scale(${pb.toFixed(3)}) rotate(-7deg)` });
    grid.forEach((g, i) => { const p = pop(t, B.fifty + 0.05 + i * 0.09, 0.32); css(g, { opacity: String(p > 0 ? 1 : 0), transform: `scale(${p.toFixed(3)}) rotate(${(i % 2 ? 3 : -3)}deg)` }); });
  };
}

// ── 3 粉笔黑板：墨绿板、粉笔颗粒线条一笔笔画，字晚半拍写出来，圈重点，列算式。讲法：说一句写一句，板书累积 ──
function chalk(s, h, z, B) {
  el(s, "abs", "inset:0;background:radial-gradient(ellipse at 30% 25%,#2C5E54 0,#1F4A42 45%,#173A34 100%);");
  el(s, "abs", "left:180px;top:100px;width:760px;height:240px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,0.08),rgba(255,255,255,0) 70%);filter:blur(10px);");
  el(s, "abs", "left:1080px;top:620px;width:640px;height:240px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,0.07),rgba(255,255,255,0) 70%);filter:blur(14px);");
  el(s, "abs", "left:0;top:1016px;width:1920px;height:64px;background:linear-gradient(#80583A,#5A3A22);box-shadow:0 -6px 14px rgba(0,0,0,0.35);");
  el(s, "abs", "left:1480px;top:998px;width:96px;height:22px;border-radius:9px;background:#F4F1E6;");
  el(s, "abs", "left:1600px;top:1002px;width:64px;height:18px;border-radius:9px;background:#F5D76E;");
  svgBox(s, "left:0;top:0;width:0;height:0;", `<svg width="0" height="0"><filter id="chk3" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -2.2 0 0 0 1.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feDisplacementMap in="c" in2="n" scale="3.5"/></filter></svg>`);
  const W = "#EEECE3";
  const g = svgBox(s, "left:0;top:0;width:1920px;height:1080px;filter:url(#chk3);", `<svg width="1920" height="1080" fill="none" stroke="${W}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path class="p" d="M110 824 Q600 818 1000 826 T1820 822"/>
    <path class="p" d="M190 822 L190 600 L630 600 L630 822 M150 602 L410 500 L670 602 M350 822 L350 720 Q410 670 470 720 L470 822"/>
    <path class="p" d="M760 824 L752 390 M772 824 L766 392" stroke-width="7"/>
    <path class="p" d="M1560 822 L1560 712 L1780 712 L1780 822 M1530 714 L1670 650 L1810 714"/>
    <path class="p" d="M820 900 Q1180 980 1500 902 M1468 878 L1502 902 L1462 926" stroke="#F5D76E" stroke-dasharray="0"/>
    <ellipse class="r" cx="1240" cy="452" rx="250" ry="92" stroke="#F28B82" stroke-width="7" transform="rotate(-3 1240 452)"/>
    <path class="u" d="M1440 630 Q1545 622 1660 632 M1436 650 Q1545 642 1666 652" stroke="#F5D76E"/></svg>`);
  const P = [...g.querySelectorAll(".p")], RG = g.querySelector(".r"), UL = g.querySelector(".u");
  prep([...P, RG, UL]);
  const wr = (txt, x, y, size, color = W) => el(s, "abs", `left:${x}px;top:${y}px;${KAI}font-size:${size}px;font-weight:700;color:${color};white-space:nowrap;filter:url(#chk3);`, txt);
  const title = wr("一根木头 · 搬过去", 160, 90, 84), sn = wr("南门", 340, 836, 56), bn = wr("北门", 1610, 836, 56);
  const w10 = wr("赏 10 金", 1040, 210, 120, "#F5D76E"), wno = wr("没人动", 1080, 380, 112, "#F28B82"), w50 = wr("10 × 5 =", 1000, 500, 104, "#F5D76E"), w50b = wr("50 金", 1440, 500, 104, "#F5D76E");
  return (t) => {
    drawAt(P[0], t, h, 0.6); drawAt(P[1], t, h + 0.1, 0.9); drawAt(P[2], t, h + 0.55, 0.5); drawAt(P[3], t, h + 0.9, 0.6); drawAt(P[4], t, h + 1.3, 0.7);
    wipe(title, t, h + 0.25, 0.7); wipe(sn, t, h + 0.75, 0.3); wipe(bn, t, h + 1.45, 0.3);
    wipe(w10, t, B.ten + 0.1, 0.45); wipe(wno, t, B.nobody + 0.05, 0.4); drawAt(RG, t, B.nobody + 0.35, 0.45);
    wipe(w50, t, B.fifty + 0.1, 0.5); wipe(w50b, t, B.fifty + 0.55, 0.35); drawAt(UL, t, B.fifty + 1.0, 0.4);
  };
}

// ── 4 蓝图专利图：普鲁士蓝方格纸，先构造线、再物体线、最后尺寸；标号、图框、红铅笔批注。讲法：把事件当一件发明来「出图」 ──
function blueprint(s, h, z, B) {
  el(s, "abs", "inset:0;background-color:#123F74;background-image:linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(rgba(255,255,255,0.14) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.14) 1px,transparent 1px);background-size:40px 40px,40px 40px,200px 200px,200px 200px;");
  el(s, "abs", "left:40px;top:40px;width:1834px;height:994px;border:3px solid rgba(234,242,255,0.85);box-sizing:border-box;");
  const W = "#EAF2FF", RD = "#FF6B5B";
  const g = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080" fill="none" stroke="${W}" stroke-linecap="round" stroke-linejoin="round">
    <g class="c" stroke-width="1.5" opacity="0.5" stroke-dasharray="10 8"><path d="M180 300 H1460"/><path d="M180 860 H1460"/><path d="M1160 200 V940"/><path d="M580 200 V940"/></g>
    <path class="o" stroke-width="3.5" d="M140 860 H1240"/>
    <path class="o" stroke-width="3.5" d="M260 860 V560 H900 V860"/>
    <path class="o" stroke-width="3.5" d="M220 560 L300 470 H860 L940 560"/>
    <path class="o" stroke-width="3.5" d="M380 470 L420 410 H740 L780 470"/>
    <path class="o" stroke-width="3.5" d="M500 860 V700 Q580 630 660 700 V860"/>
    <path class="o" stroke-width="3.5" d="M1140 860 V300 H1180 V860"/>
    <path class="o" stroke-width="1.6" d="M1152 340 V820 M1166 320 V840"/>
    <g class="d" stroke-width="2"><path d="M1190 300 H1320 M1190 860 H1320"/><path d="M1290 310 V850"/><path d="M1280 324 L1290 300 L1300 324 M1280 836 L1290 860 L1300 836"/></g>
    <g class="k" stroke-width="2"><circle cx="1060" cy="380" r="24"/><path d="M1084 380 H1140"/><circle cx="330" cy="420" r="24"/><path d="M350 432 L400 470"/></g>
    <ellipse class="r" cx="1160" cy="560" rx="120" ry="330" stroke="${RD}" stroke-width="4.5" transform="rotate(4 1160 560)"/>
    <path class="x" d="M1480 686 Q1570 622 1660 686 M1646 664 L1662 688 L1636 694" stroke="${RD}" stroke-width="4"/></svg>`);
  const C = g.querySelector(".c"), O = [...g.querySelectorAll(".o")], Dm = g.querySelector(".d"), K = g.querySelector(".k"), RG = g.querySelector(".r"), X = g.querySelector(".x");
  prep([...O, RG, X]);
  const mono = (txt, x, y, size, c = W, extra = "") => el(s, "abs mono", `left:${x}px;top:${y}px;font-size:${size}px;color:${c};white-space:nowrap;letter-spacing:2px;${extra}`, txt);
  const n1 = mono("1", 1052, 364, 26), n2 = mono("2", 322, 404, 26);
  const dim = mono("三丈 ≈ 6.9 m", 1312, 600, 30, W, "transform:rotate(-90deg);transform-origin:0 0;");
  const head = mono("PATENT FIG. 1 · 徙木立信", 90, 80, 28);
  const tb = el(s, "abs mono", `left:1380px;top:700px;width:450px;border:3px solid ${W};font-size:26px;color:${W};`);
  const row = (k) => { const r = el(tb, "", `display:flex;border-bottom:2px solid rgba(234,242,255,0.6);height:62px;align-items:center;padding:0 16px;position:relative;`); el(r, "", "width:150px;opacity:0.75;", k); return el(r, "cn", "font-size:28px;white-space:nowrap;"); };
  const rFig = row("FIG."), rSrc = row("SOURCE"), rRew = row("REWARD"), rTak = row("TAKERS");
  const strike = el(tb, "abs", `left:166px;top:206px;width:0;height:4px;background:${RD};`);
  const red = (txt, x, y, size) => el(s, "abs", `left:${x}px;top:${y}px;${KAI}font-size:${size}px;font-weight:700;color:${RD};white-space:nowrap;`, txt);
  const noT = red("无人应募", 1220, 170, 50), x5 = red("× 5", 1530, 560, 54);
  const type = (n, txt, t, a, cps = 22) => { const k = Math.max(0, Math.floor((t - a) * cps)); n.textContent = t < a ? "" : txt.slice(0, k); };
  return (t) => {
    css(C, { opacity: String(0.5 * clamp((t - h) / 0.4)) });
    O.forEach((p, i) => drawAt(p, t, h + 0.25 + i * 0.16, 0.55));
    css(Dm, { opacity: String(clamp((t - h - 1.4) / 0.3)) }); css(dim, { opacity: String(clamp((t - h - 1.7) / 0.3)) });
    css(K, { opacity: String(clamp((t - h - 1.1) / 0.3)) }); css(n1, { opacity: String(clamp((t - h - 1.1) / 0.3)) }); css(n2, { opacity: String(clamp((t - h - 1.2) / 0.3)) });
    type(head, "PATENT FIG. 1 · 徙木立信", t, h + 0.1, 30);
    css(tb, { opacity: String(clamp((t - h - 0.3) / 0.3)) });
    type(rFig, "1 · 立木南门", t, h + 0.5); type(rSrc, "史记·商君列传", t, h + 0.9);
    type(rRew, t < B.fifty + 0.35 ? "10 金" : "10 金 → 50 金", t, B.ten, 18);
    css(rRew, { color: t >= B.fifty + 0.35 ? RD : W });
    css(strike, { width: `${(clamp((t - B.fifty) / 0.25) * 74).toFixed(1)}px` });
    type(rTak, t < B.fifty + 1.4 ? "0" : "1", t, B.nobody, 30); css(rTak, { color: t < B.fifty + 1.4 ? RD : W });
    drawAt(RG, t, B.nobody + 0.05, 0.4); wipe(noT, t, B.nobody + 0.3, 0.4);
    drawAt(X, t, B.fifty + 0.3, 0.35); wipe(x5, t, B.fifty + 0.55, 0.3);
  };
}

// ── 5 等轴测剖面：浅灰纸上的等轴测小城，南门→北门一条路；四角读数；只高亮正在讲的部件，最后有人扛着木头真走过去。讲法：机制模拟 ──
function iso(s, h, z, B) {
  el(s, "abs", "inset:0;background:linear-gradient(180deg,#F3F5F8,#E4E8ED);");
  const U = 62, CX = 690, CY = 400, P = (x, y, zz) => [CX + (x - y) * U * 0.866, CY + (x + y) * U * 0.5 - zz * U];
  const pt = (a) => a.map((v) => v.toFixed(1)).join(",");
  const box = (x, y, zz, w, d, hh, [ct, cx, cy]) => `<polygon points="${[P(x + w, y, zz), P(x + w, y + d, zz), P(x + w, y + d, zz + hh), P(x + w, y, zz + hh)].map(pt).join(" ")}" fill="${cx}"/><polygon points="${[P(x, y + d, zz), P(x + w, y + d, zz), P(x + w, y + d, zz + hh), P(x, y + d, zz + hh)].map(pt).join(" ")}" fill="${cy}"/><polygon points="${[P(x, y, zz + hh), P(x + w, y, zz + hh), P(x + w, y + d, zz + hh), P(x, y + d, zz + hh)].map(pt).join(" ")}" fill="${ct}"/>`;
  const GR = ["#FBFCFD", "#D3D9E1", "#BCC4CF"], ST = ["#F2F4F7", "#C9D0D9", "#B0B9C5"], RO = ["#DCE2E9", "#C3CAD4", "#AEB7C3"], AC = ["#FFB066", "#FF7A1A", "#D95F0A"], PP = ["#AEB7C3", "#8C96A3", "#77818F"];
  const gate = (gx) => box(gx, -0.7, 0, 1.2, 0.9, 2.2, ST) + box(gx, 1.8, 0, 1.2, 0.9, 2.2, ST) + box(gx, -0.7, 2.2, 1.2, 3.4, 0.7, ST) + box(gx - 0.2, -0.9, 2.9, 1.6, 3.8, 0.28, ["#E9EDF2", "#9AA5B3", "#8793A2"]);
  const back = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080">${box(-1.4, -2, -0.5, 15.2, 7.2, 0.5, GR)}${box(0, 0.2, 0, 12.6, 1.4, 0.05, RO)}${gate(-0.2)}</svg>`);
  const route = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080"><path class="rt" d="M${pt(P(1.2, 0.9, 0.06))} L${pt(P(11, 0.9, 0.06))}" stroke="#FF7A1A" stroke-width="6" stroke-dasharray="14 12" fill="none"/></svg>`);
  const dyn = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", "");
  const front = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080">${gate(11.2)}</svg>`);
  const R = rng(5), crowd = [...Array(11)].map((_, i) => ({ x: 1.6 + R() * 3.2, y: i < 8 ? 2.1 + R() * 1.6 : -1.6 + R() * 0.9 }));
  crowd[0] = { x: 3.1, y: 2.3 };
  const lab = (txt, x, y, zz) => { const [sx, sy] = P(x, y, zz); return el(s, "abs cn", `left:${sx}px;top:${sy}px;transform:translate(-50%,-100%);padding:4px 14px;border-radius:8px;background:#1F2933;color:#fff;font-size:30px;font-weight:800;white-space:nowrap;`, txt); };
  const LS = lab("南门", 0.4, 0.9, 3.4), LN = lab("北门", 11.8, 0.9, 3.4);
  const qs = [1, 3, 5].map((i) => { const [sx, sy] = P(crowd[i].x, crowd[i].y, 1.45); return el(s, "abs", `left:${sx - 14}px;top:${sy - 40}px;font-family:Geist;font-size:40px;font-weight:800;color:#FF7A1A;`, "?"); });
  const hud = (x, y, k, align) => { const d = el(s, "abs mono", `${align}:${x}px;top:${y}px;text-align:${align};color:#1F2933;`); el(d, "", "font-size:20px;letter-spacing:4px;color:#7B8794;", k); return el(d, "", "font-size:56px;font-weight:700;white-space:nowrap;"); };
  const hT = hud(80, 70, "ISO · 徙木立信", "left"), hR = hud(80, 70, "REWARD 赏金", "right"), hK = hud(80, 900, "TAKERS 应募", "left"), hD = hud(80, 900, "PROGRESS 南→北", "right");
  hT.textContent = "SIM 01";
  const person = (x, y, c) => { const [hx, hy] = P(x, y, 1.08); return box(x - 0.17, y - 0.17, 0, 0.34, 0.34, 0.78, c) + `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(0.2 * U).toFixed(1)}" fill="${c[0]}" stroke="${c[2]}" stroke-width="2"/>`; };
  return (t) => {
    const k0 = eOutCubic(clamp((t - h) / 0.5));
    css(back, { opacity: String(k0), transform: `translateY(${((1 - k0) * 30).toFixed(1)}px)` }); css(front, { opacity: String(clamp((t - h - 0.3) / 0.4)) });
    css(route, { opacity: String(clamp((t - h - 0.8) / 0.3)), clipPath: `inset(0 ${((1 - eInOutCubic(clamp((t - h - 0.8) / 0.9))) * 100).toFixed(1)}% 0 0)` });
    css(LS, { opacity: String(clamp((t - h - 0.5) / 0.2)) }); css(LN, { opacity: String(clamp((t - h - 1.3) / 0.2)) });
    const a1 = B.fifty + 0.3, a2 = B.fifty + 0.9, a3 = z - 0.35;
    let cx = crowd[0].x, cy = crowd[0].y, carried = false;
    if (t > a1) { const k = eInOutCubic(clamp((t - a1) / (a2 - a1))); cx = lerp(3.1, 2.5, k); cy = lerp(2.3, 0.9, k); }
    if (t > a2) { carried = true; const k = eInOutCubic(clamp((t - a2) / (a3 - a2))); cx = lerp(2.5, 10.4, k); cy = 0.9; }
    const items = crowd.map((c, i) => ({ d: i ? c.x + c.y : cx + cy, s: i ? person(c.x, c.y, PP) : person(cx, cy, t >= B.fifty ? AC : PP) }));
    if (!carried) items.push({ d: 2.0 + 0.9, s: box(2.0, 0.76, 0, 0.28, 0.28, 3.3, t >= B.ten ? AC : ST) });
    else items.push({ d: cx + cy + 0.01, s: box(cx - 1.7, cy - 0.14, 1.0, 3.4, 0.28, 0.28, AC) });
    items.sort((p, q) => p.d - q.d);
    dyn.innerHTML = `<svg width="1920" height="1080" style="opacity:${clamp((t - h - 0.2) / 0.3).toFixed(2)}">${items.map((i) => i.s).join("")}</svg>`;
    qs.forEach((q, i) => css(q, { opacity: String(t >= B.nobody + i * 0.08 && t < B.fifty ? 1 : 0) }));
    hR.textContent = `${val(t, B)} 金`; css(hR, { color: t >= B.fifty ? "#FF7A1A" : "#1F2933" });
    hK.textContent = t < a2 ? "0" : "1"; css(hK, { color: t >= B.nobody && t < a2 ? "#E12D39" : "#1F2933" });
    hD.textContent = `${Math.round(100 * (t > a2 ? eInOutCubic(clamp((t - a2) / (a3 - a2))) : 0))}%`;
  };
}

// ── 6 瑞士网格动态字：米白底、12 栏网格、超大无衬线黑字压在栏线上，红色色块推拉；字在重音砸进来、退场比进场快。讲法：字就是画面 ──
function swiss(s, h, z, B) {
  el(s, "abs", "inset:0;background:#F2F1EC;");
  for (let i = 0; i <= 12; i++) el(s, "abs", `left:${120 + i * 140}px;top:0;width:1px;height:1080px;background:rgba(227,0,27,0.14);`);
  el(s, "abs", "left:120px;top:170px;width:1680px;height:2px;background:#111;");
  const SW = `font-family:"Helvetica Neue","Geist","PingFang SC","NotoSC",sans-serif;`;
  el(s, "abs", `left:120px;top:110px;${SW}font-size:24px;font-weight:800;color:#111;`, "01");
  el(s, "abs", `left:260px;top:110px;${SW}font-size:24px;font-weight:500;color:#111;`, "徙木立信 — Moving the Log");
  el(s, "abs", `right:120px;top:110px;${SW}font-size:24px;font-weight:500;color:#111;`, "史记 · 卷六十八");
  const mw = (txt, x, y, size, color = "#111", extra = "") => { const w = el(s, "abs", `left:${x}px;top:${y}px;overflow:hidden;`); const i = el(w, "", `${SW}font-size:${size}px;font-weight:900;color:${color};line-height:1;white-space:nowrap;letter-spacing:${-size * 0.03}px;padding:0.06em 0;${extra}`, txt); return { w, i }; };
  const ms = (m, t, a, b, dIn = 0.36, dOut = 0.16) => { const k = eOutQuint(clamp((t - a) / dIn)), o = b == null ? 0 : eInCubic(clamp((t - b) / dOut)); css(m.i, { transform: `translateY(${((1 - k) * 105 - o * 105).toFixed(1)}%)` }); css(m.w, { opacity: String(t < a ? 0 : 1) }); };
  const w1 = mw("一根木头", 120, 230, 230), w2 = mw("南门 → 北门", 120, 590, 100);
  const bar = el(s, "abs", "left:120px;top:540px;height:20px;background:#E3001B;");
  const meta2 = el(s, "abs", `left:120px;top:200px;${SW}font-size:22px;font-weight:700;letter-spacing:4px;color:#E3001B;`, "REWARD / 赏金");
  const n10 = mw("10", 100, 210, 600), n50 = mw("50", 100, 210, 600), kin = mw("金", 940, 560, 220, "#E3001B");
  const blk = el(s, "abs", "left:1240px;top:172px;width:680px;height:908px;background:#E3001B;");
  const nob = el(blk, "abs", `left:120px;top:110px;${SW}writing-mode:vertical-rl;font-size:190px;font-weight:900;color:#fff;letter-spacing:10px;`, "没人动");
  const x5 = mw("×5", 1260, 300, 300, "#E3001B");
  return (t) => {
    ms(w1, t, h + 0.15, B.ten - 0.15); ms(w2, t, h + 0.8, B.ten - 0.15);
    css(bar, { width: `${(eOutQuint(clamp((t - h - 0.55) / 0.5)) * 980 * (1 - eInCubic(clamp((t - B.ten + 0.15) / 0.16)))).toFixed(1)}px` });
    css(meta2, { opacity: String(t >= B.ten ? 1 : 0) });
    ms(n10, t, B.ten, B.fifty); ms(n50, t, B.fifty + 0.05, null); ms(kin, t, B.ten + 0.1, null);
    css(blk, { transform: `translateX(${((1 - eOutQuint(clamp((t - B.nobody) / 0.25)) + eInCubic(clamp((t - B.fifty) / 0.16))) * 100).toFixed(1)}%)` });
    css(nob, { opacity: String(t >= B.nobody ? 1 : 0) });
    ms(x5, t, B.fifty + 0.3, null);
  };
}

// ── 7 孔版印刷：米色纸、荧光粉 + 蓝两色叠印（正片叠底出紫）、半调网点；8 帧/秒定格，套色错位，五十金那一下「对准版」。讲法：手作印刷感 ──
function riso(s, h, z, B) {
  el(s, "abs", "inset:0;background:#F4EFE4;");
  const PK = "#FF48B0", BL = "#0078BF", YL = "#FFE800";
  const dots = (c, sz = 14, r = 4.2) => `background-image:radial-gradient(${c} ${r}px,transparent ${r + 0.7}px);background-size:${sz}px ${sz}px;`;
  const pl = () => el(s, "abs", "inset:0;mix-blend-mode:multiply;");
  const pY = pl(), pP = pl(), pB = pl();
  const sun = el(pY, "abs", `left:1060px;top:110px;width:640px;height:640px;border-radius:50%;${dots(YL, 16, 6.5)}`);
  const pole = el(pP, "abs", `left:1240px;top:230px;width:70px;height:640px;background:${PK};`);
  el(pP, "abs", `left:0;top:860px;width:1920px;height:220px;${dots(PK, 12, 4)}`);
  const gate = svgBox(pB, "left:820px;top:430px;width:760px;height:440px;", `<svg width="760" height="440"><path d="M20 160 L380 40 L740 160 L680 160 L680 440 L480 440 L480 320 Q380 230 280 320 L280 440 L80 440 L80 160Z" fill="${BL}"/></svg>`);
  const crowd = svgBox(pB, "left:60px;top:740px;width:1800px;height:200px;", `<svg width="1800" height="200">${[...Array(16)].map((_, i) => { const x = 40 + i * 112 + (i % 3) * 14, y = 60 + (i % 2) * 22; return `<circle cx="${x}" cy="${y}" r="26" fill="${BL}"/><path d="M${x - 52} 200 Q${x - 50} ${y + 36} ${x} ${y + 34} Q${x + 50} ${y + 36} ${x + 52} 200Z" fill="${BL}"/>`; }).join("")}</svg>`);
  css(crowd, { opacity: "0.82" });
  const big = (p, txt, x, y, size, c) => el(p, "abs", `left:${x}px;top:${y}px;font-family:Geist,NotoSC;font-size:${size}px;font-weight:900;color:${c};white-space:nowrap;line-height:1;letter-spacing:-6px;`, txt);
  const i1 = big(pB, "一根木头", 110, 250, 150, BL), i2 = big(pP, "南门 → 北门", 120, 440, 90, PK);
  const num = big(pP, "", 100, 200, 340, PK), kin = big(pB, "金", 120, 540, 170, BL);
  const stamp = el(pB, "abs cn", `left:150px;top:660px;padding:4px 26px;border:9px solid ${BL};color:${BL};font-size:100px;font-weight:900;transform:rotate(-8deg);`, "没人动");
  const marks = [[60, 60], [1800, 60], [60, 960], [1800, 960]];
  for (const p of [pP, pB]) for (const [x, y] of marks) el(p, "abs", `left:${x}px;top:${y}px;width:56px;height:56px;border:3px solid ${p === pP ? PK : BL};border-radius:50%;box-sizing:border-box;background:linear-gradient(${p === pP ? PK : BL},${p === pP ? PK : BL}) center/3px 100% no-repeat,linear-gradient(${p === pP ? PK : BL},${p === pP ? PK : BL}) center/100% 3px no-repeat;`);
  svgBox(s, "left:0;top:0;width:1920px;height:1080px;mix-blend-mode:multiply;opacity:0.35;pointer-events:none;", `<svg width="1920" height="1080"><filter id="grn7"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.5"/></feComponentTransfer></filter><rect width="1920" height="1080" filter="url(#grn7)"/></svg>`);
  return (t) => {
    const q = Math.floor((t - h) * 8) / 8, A = t < B.fifty ? 1 : Math.max(0, 1 - (t - B.fifty) / 0.12);
    css(pP, { transform: `translate(${(A * (12 + 7 * Math.sin(q * 5.3))).toFixed(1)}px,${(A * 7 * Math.cos(q * 4.1)).toFixed(1)}px)` });
    css(pB, { transform: `translate(${(A * -8 * Math.cos(q * 3.7)).toFixed(1)}px,${(A * -6 * Math.sin(q * 6.1)).toFixed(1)}px)` });
    css(pY, { transform: `translate(${(A * 5 * Math.sin(q * 2.9)).toFixed(1)}px,0)` });
    const st = (a) => Math.floor(clamp((t - a) / 0.5) * 4) / 4;
    css(sun, { transform: `scale(${st(h).toFixed(2)})` }); css(gate, { transform: `translateY(${((1 - st(h + 0.15)) * 120).toFixed(0)}px)`, opacity: String(st(h + 0.15)) });
    css(pole, { transform: `scaleY(${st(h + 0.4).toFixed(2)})`, transformOrigin: "50% 100%" }); css(crowd, { opacity: String(0.82 * st(h + 0.6)) });
    css(i1, { opacity: String(t >= h + 0.3 && t < B.ten ? 1 : 0) }); css(i2, { opacity: String(t >= h + 0.9 && t < B.ten ? 1 : 0) });
    num.textContent = String(val(t, B)); css(num, { opacity: String(t >= B.ten ? 1 : 0) }); css(kin, { opacity: String(t >= B.ten ? 1 : 0), left: t >= B.fifty ? "720px" : "560px", top: "370px" });
    css(stamp, { opacity: String(t >= B.nobody && t < B.fifty ? 1 : 0), transform: `rotate(-8deg) scale(${t < B.nobody ? 1.6 : lerp(1.6, 1, clamp((t - B.nobody) / 0.12)).toFixed(3)})` });
  };
}

// ── 8 深色数学：近黑底，只放正在讲的东西；木头这条线直接变成数轴，金点滑过去，×5 的弧箭头；先把问题写在最上面。讲法：一个对象形变成下一个，几乎不切 ──
function manim(s, h, z, B) {
  el(s, "abs", "inset:0;background:#0F1014;");
  const BL = "#58C4DD", YL = "#F4D35E", RD = "#FC6255", WH = "#ECECEC";
  const X = (v) => 360 + v * 24;
  const q = el(s, "abs", `left:0;width:1920px;top:110px;text-align:center;${SONG}font-size:64px;color:${WH};`, "要多少钱，才有人动？");
  const g = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080" fill="none" stroke-linecap="round">
    <line class="L" stroke="${BL}" stroke-width="7"/>
    <g class="T" stroke="${WH}" stroke-width="3">${[0, 10, 20, 30, 40, 50].map((v) => `<line x1="${X(v)}" y1="626" x2="${X(v)}" y2="654"/>`).join("")}</g>
    <path class="A" d="M${X(10)} 600 Q${(X(10) + X(50)) / 2} 380 ${X(50)} 600" stroke="${YL}" stroke-width="5"/>
    <path class="AH" d="M${X(50) - 26} 576 L${X(50)} 602 L${X(50) + 8} 568" stroke="${YL}" stroke-width="5"/>
    <circle class="D" r="17" fill="${YL}" stroke="none"/></svg>`);
  const L = g.querySelector(".L"), Tk = g.querySelector(".T"), Ar = g.querySelector(".A"), AH = g.querySelector(".AH"), Dt = g.querySelector(".D");
  prep([Ar, AH]);
  const tl = [0, 10, 20, 30, 40, 50].map((v) => el(s, "abs mono", `left:${X(v) - 40}px;top:668px;width:80px;text-align:center;font-size:30px;color:${WH};`, String(v)));
  const lab = (txt, size, c) => el(s, "abs", `${SONG}font-size:${size}px;color:${c};white-space:nowrap;transform:translate(-50%,-50%);`, txt);
  const lLog = lab("一根木头", 46, BL), lS = lab("南门", 34, WH), lN = lab("北门", 34, WH), lD = lab("", 48, YL), lX = lab("× 5", 52, YL);
  css(lX, { left: `${(X(10) + X(50)) / 2}px`, top: "450px" });
  const row = el(s, "abs", `left:360px;top:770px;${SONG}font-size:44px;color:${WH};white-space:nowrap;`);
  el(row, "", "display:inline-block;margin-right:28px;", "愿意搬的人");
  const cnt = el(row, "", "display:inline-block;font-family:Geist;font-size:64px;font-weight:600;");
  return (t) => {
    wipe(q, t, h + 0.05, 0.8);
    const k = eInOutCubic(clamp((t - h - 1.35) / 0.8)), ang = lerp(-Math.PI / 2, 0, k), half = lerp(240, 600, k), cx = 960, cy = lerp(560, 640, k);
    const grow = eOutCubic(clamp((t - h - 0.15) / 0.5)), x1 = cx - Math.cos(ang) * half * grow, y1 = cy - Math.sin(ang) * half * grow, x2 = cx + Math.cos(ang) * half * grow, y2 = cy + Math.sin(ang) * half * grow;
    L.setAttribute("x1", x1.toFixed(1)); L.setAttribute("y1", y1.toFixed(1)); L.setAttribute("x2", x2.toFixed(1)); L.setAttribute("y2", y2.toFixed(1));
    css(lLog, { left: `${cx + 130}px`, top: `${cy}px`, opacity: String(clamp((t - h - 0.35) / 0.25) * (1 - clamp((t - h - 1.3) / 0.2))) });
    css(lS, { left: `${x1}px`, top: `${y1 + 40}px`, opacity: String(clamp((t - h - 0.7) / 0.2) * (1 - k)) });
    css(lN, { left: `${x2}px`, top: `${y2 - 40}px`, opacity: String(clamp((t - h - 0.95) / 0.2) * (1 - k)) });
    css(Tk, { opacity: String(clamp((t - h - 2.0) / 0.25)) }); tl.forEach((n, i) => css(n, { opacity: String(clamp((t - h - 2.0 - i * 0.04) / 0.2)) }));
    const dv = t < B.ten ? 0 : t < B.fifty + 0.1 ? 10 * eInOutCubic(clamp((t - B.ten) / 0.4)) : lerp(10, 50, eInOutCubic(clamp((t - B.fifty - 0.1) / 0.6)));
    Dt.setAttribute("cx", X(dv).toFixed(1)); Dt.setAttribute("cy", "640"); css(Dt, { opacity: String(t >= B.ten - 0.05 ? 1 : 0) });
    lD.textContent = t < B.fifty + 0.4 ? "赏 10 金" : "50 金"; css(lD, { left: `${X(dv)}px`, top: `${t < B.fifty ? 570 : lerp(570, 720, eOutCubic(clamp((t - B.fifty - 0.4) / 0.3)))}px`, opacity: String(t >= B.ten + 0.2 ? 1 : 0) });
    drawAt(Ar, t, B.fifty, 0.5); drawAt(AH, t, B.fifty + 0.45, 0.15); css(lX, { opacity: String(clamp((t - B.fifty - 0.3) / 0.25)) });
    css(row, { opacity: String(clamp((t - B.nobody) / 0.25)) });
    const one = t >= B.fifty + 1.7; cnt.textContent = one ? "1" : "0"; css(cnt, { color: one ? BL : RD });
  };
}

const STY = [
  { name: "综艺花字", en: "VARIETY CAPTIONS", fit: "轻松科普 · 生活冷知识 · 年轻受众", th: { bg: 0xFFD23F, ink: "#2B1B5A", dim: "#7A5A2A", accent: "#FF3B5C", light: true }, make: variety },
  { name: "孟菲斯波普", en: "MEMPHIS POP", fit: "消费 · 潮流文化 · 设计史", th: { bg: 0xFFF4E0, ink: "#111111", dim: "#6B6257", accent: "#FF5D8F", light: true }, make: memphis },
  { name: "粉笔黑板", en: "CHALKBOARD", fit: "公式 · 推导 · 物理 · 一步步讲清", th: { bg: 0x1E463F, ink: "#EEECE3", dim: "#9DB5AD", accent: "#F5D76E" }, make: chalk },
  { name: "蓝图专利图", en: "BLUEPRINT", fit: "发明 · 古代机械 · 结构原理", th: { bg: 0x123F74, ink: "#EAF2FF", dim: "#9DB8DA", accent: "#FF6B5B" }, make: blueprint },
  { name: "等轴测剖面", en: "ISOMETRIC", fit: "机制 · 流程 · 系统怎么运转", th: { bg: 0xEEF1F4, ink: "#1F2933", dim: "#7B8794", accent: "#FF7A1A", light: true }, make: iso },
  { name: "瑞士网格动态字", en: "SWISS KINETIC", fit: "观点 · 数据 · 金句（字就是画面）", th: { bg: 0xF2F1EC, ink: "#111111", dim: "#777777", accent: "#E3001B", light: true }, make: swiss },
  { name: "孔版印刷", en: "RISOGRAPH", fit: "文化 · 艺术 · 小众冷知识", th: { bg: 0xF4EFE4, ink: "#1D1D1D", dim: "#7A7468", accent: "#FF48B0", light: true }, make: riso },
  { name: "深色数学", en: "DARK MATH", fit: "数学 · 统计 · AI（一个对象变成下一个）", th: { bg: 0x0F1014, ink: "#ECECEC", dim: "#8A8F98", accent: "#58C4DD" }, make: manim },
];

export async function build(ctx) {
  const N = ctx.narr, T = (k) => N.t(k), END = N.total, SEG = END / STY.length;
  const shots = [];
  const add = (from, to, b, r) => shots.push({ from, to, build: b, render: r });
  sections.push({ t: 0, t_to: END + TAIL, level: 1 });
  STY.forEach((st, i) => {
    const a = i * SEG, h = a + 1.8, z = (i + 1) * SEG, B = beatsOf(T, `B${String(i + 1).padStart(2, "0")}`);
    sfx.push({ t: a + 0.15, type: "whoosh" }, { t: B.nobody, type: "tick" }, { t: B.fifty, type: "slam" });
    add(a, h, (root) => {
      const s = el(root, "shot");
      el(s, "abs", `inset:0;background:#${st.th.bg.toString(16).padStart(6, "0")};`);
      const no = el(s, "abs", `left:0;width:1920px;top:340px;text-align:center;font-family:Geist;font-size:26px;letter-spacing:10px;color:${st.th.dim};`, `NEW STYLE ${i + 1} / ${STY.length} · ${st.en}`);
      const nm = el(s, "abs cn", `left:0;width:1920px;top:400px;text-align:center;font-size:150px;font-weight:900;color:${st.th.ink};letter-spacing:12px;`, st.name);
      const ft = el(s, "abs cn", `left:0;width:1920px;top:600px;text-align:center;font-size:40px;color:${st.th.accent};letter-spacing:3px;`, `适合：${st.fit}`);
      return { s, ns: [no, nm, ft] };
    }, (t, u) => {
      bg(ctx, st.th, { bloom: st.th.light ? 0 : 0.4, vig: st.th.light ? 0.15 : 0.5 });
      const k = eOutCubic(clamp((t - a) / 0.4)), o = 1 - clamp((t - h + 0.25) / 0.25);
      u.ns.forEach((n) => css(n, { opacity: String(k * o), transform: `translateY(${((1 - k) * 20).toFixed(1)}px)` }));
    });
    add(h, z, (root) => { const s = el(root, "shot"); return { s, draw: st.make(s, h, z, B) }; }, (t, u) => { bg(ctx, st.th, { bloom: st.th.light ? 0 : 0.35, vig: st.th.light ? 0.12 : 0.45, grain: 0.015 }); u.draw(t); });
  });
  add(END, END + TAIL, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#0B0A0C;");
    el(s, "abs cn", "left:0;width:1920px;top:300px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +8：补齐空白家族");
    STY.forEach((st, i) => el(s, "abs cn", `left:${170 + (i % 4) * 400}px;top:${470 + Math.floor(i / 4) * 140}px;width:370px;padding:22px 0;text-align:center;border-radius:16px;font-size:38px;font-weight:800;color:${st.th.ink};background:#${st.th.bg.toString(16).padStart(6, "0")};border:3px solid ${st.th.accent};`, st.name));
    el(s, "abs cn", "left:0;width:1920px;top:800px;text-align:center;font-size:30px;color:#a8a29a;", "全部代码画面 · 0 积分 · 每套都能叠「一镜到底 / 尺度穿越 / 数据叙事」等手法");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
