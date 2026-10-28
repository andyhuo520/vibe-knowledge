// 风格样片集：同一段开场（复用第 01 期 B01 旁白），用 5 套视觉系统各演一遍。全部代码画面，0 积分。
import { clamp, lerp, inv, eOutCubic, eInOutCubic, el, css, rng } from "../../cine/engine/util.js";
import { TH, bg, layers, keyword, counter } from "../../cine/engine/know.js";
import { SC } from "../01/scenes_base.js";

export const COLD = 0;
export const TAIL = 3.2;
export const meta = { title: "风格样片集", n: "styles" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const STY = [
  { key: "gufeng", name: "古风", en: "GUFENG", fit: "历史 · 两难选择片", th: TH.gufeng },
  { key: "starfield", name: "星空光点", en: "STARFIELD", fit: "数学 · 信息 · 宇宙 · 猜谜概念片", th: TH.starfield },
  { key: "darkgold", name: "暗金线描", en: "DARK GOLD", fit: "职场 · 心理 · 痛点原理片", th: TH.darkgold },
  { key: "paper", name: "水墨纸本", en: "INK & PAPER", fit: "文学 · 诗词 · 文化 · 一条主线片", th: TH.paper },
  { key: "pixel", name: "像素", en: "PIXEL", fit: "考试 · 方法论 · 闯关片", th: TH.pixel },
];

// 通用：10 金 → 没人动 → 50 金 的三段节奏（各风格自己决定长相）
const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const val = (t, B) => (t < B.ten ? 0 : t < B.fifty ? Math.round(10 * eOutCubic(clamp((t - B.ten) / 0.4))) : Math.round(lerp(10, 50, eOutCubic(clamp((t - B.fifty) / 0.5)))));
const fade = (t, a, b, f = 0.3) => clamp((t - a) / f) * (1 - clamp((t - b + f) / f));

// ── 1 古风：Opus 手画的分层剪影 + 金色数字 + 朱红印章 ──
function gufeng(s) {
  const L = layers(s, SC.gate());
  const n = el(s, "abs cn", "left:120px;top:330px;font-size:170px;font-weight:900;color:#e2b45a;white-space:nowrap;text-shadow:0 6px 30px rgba(0,0,0,0.6);");
  const st = el(s, "abs cn", "left:130px;top:570px;font-size:70px;font-weight:900;color:#d9472b;letter-spacing:10px;", `<span style="display:inline-block;border:6px solid #d9472b;border-radius:12px;padding:2px 22px;transform:rotate(-8deg)">没人动</span>`);
  return (t, a, z, B) => {
    L.update(t, a, z, { pan: [-90, -10], zoom: [1, 1.12], fi: 0.3, fo: 0.3 });
    n.textContent = `${val(t, B)} 金`; css(n, { opacity: String(t >= B.ten ? 1 : 0) });
    const k = t - B.nobody; css(st, { opacity: String(k > 0 && t < B.fifty ? 1 : 0), transform: `scale(${(k < 0 ? 1.6 : lerp(1.6, 1, eOutCubic(clamp(k / 0.18)))).toFixed(3)})` });
  };
}

// ── 2 星空光点：深蓝黑、星尘、一颗金色光点画出木头、细衬线数字 + 英文小字 ──
function starfield(s) {
  const cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080; cv.style.cssText = "position:absolute;left:0;top:0;"; s.appendChild(cv);
  const g = cv.getContext("2d"), R = rng(5), stars = [...Array(650)].map(() => [R() * 1920, R() * 1080, R() * 2.4 + 0.6, R() * 6.28]);
  const line = el(s, "abs", "left:958px;width:5px;background:linear-gradient(180deg,rgba(242,196,109,0),#f2c46d 30%,#fff3d0);box-shadow:0 0 30px #f2c46d, 0 0 80px rgba(242,196,109,0.45);");
  const dot = el(s, "abs", "width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:radial-gradient(circle,#fff 0,#f2c46d 40%,rgba(242,196,109,0) 72%);left:960px;");
  const hz = el(s, "abs", "left:360px;top:820px;width:1200px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.35),rgba(255,255,255,0));");
  const n = el(s, "abs", "left:1100px;top:430px;font-family:'Songti SC','STSong',serif;font-size:150px;font-weight:300;color:#eef0f6;letter-spacing:6px;white-space:nowrap;");
  const en = el(s, "abs", "left:1110px;top:610px;font-family:Geist;font-size:22px;letter-spacing:8px;color:#8a90a3;white-space:nowrap;");
  const st = el(s, "abs", "left:1110px;top:660px;font-family:'Songti SC','STSong',serif;font-size:56px;font-weight:300;color:#f2c46d;letter-spacing:16px;white-space:nowrap;", "没人动");
  return (t, a, z, B) => {
    g.clearRect(0, 0, 1920, 1080);
    for (const [x, y, r, p] of stars) { g.globalAlpha = 0.55 + 0.4 * Math.sin(t * 1.3 + p); g.fillStyle = "#cfd6ea"; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    g.globalAlpha = 1;
    const k = eInOutCubic(clamp((t - a - 0.2) / 1.6)), top = lerp(820, 380, k);
    css(line, { top: `${top}px`, height: `${820 - top}px`, opacity: String(k > 0 ? 1 : 0) });
    css(dot, { top: `${top}px`, opacity: String(k > 0 && k < 1 ? 1 : k >= 1 ? 0.8 : 0), transform: `scale(${(1 + 0.15 * Math.sin(t * 4)).toFixed(3)})` });
    const v = val(t, B); n.textContent = `${v} 金`; css(n, { opacity: String(t >= B.ten ? 1 : 0) });
    en.textContent = t >= B.fifty ? "FIFTY PIECES OF GOLD" : "TEN PIECES OF GOLD"; css(en, { opacity: String(t >= B.ten ? 1 : 0) });
    css(st, { opacity: String(fade(t, B.nobody, B.fifty, 0.25)), filter: `blur(${(4 * (1 - clamp((t - B.nobody) / 0.3))).toFixed(2)}px)` });
  };
}

// ── 3 暗金线描：炭黑底，琥珀发光线条一笔笔画出城门、木头、小人；电量条式数字 ──
function darkgold(s) {
  const svg = el(s, "abs", "left:0;top:0;width:1920px;height:1080px;");
  svg.innerHTML = `<svg width="1920" height="1080" fill="none" stroke="#f0b44c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 8px rgba(240,180,76,0.7))">
    <path class="d" d="M260 820 L1660 820"/>
    <path class="d" d="M520 820 L520 470 L1400 470 L1400 820 M480 470 L560 400 L1360 400 L1440 470 M760 400 L820 330 L1100 330 L1160 400"/>
    <path class="d" d="M880 820 L880 650 Q960 590 1040 650 L1040 820"/>
    <path class="d" d="M300 400 L300 820"/>
    <path class="d" d="M660 690 a22 22 0 1 0 0.1 0 M660 734 L660 800 M660 750 L630 780 M660 750 L690 780 M660 800 L640 840 M660 800 L680 840"/>
    <path class="d" d="M760 700 a22 22 0 1 0 0.1 0 M760 744 L760 810 M760 760 L735 790 M760 760 L785 790 M760 810 L742 848 M760 810 L778 848"/>
  </svg>`;
  const ps = [...svg.querySelectorAll(".d")]; ps.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.L = L; });
  const box = el(s, "abs", "left:1420px;top:200px;width:360px;height:120px;border:4px solid #f0b44c;border-radius:16px;box-shadow:0 0 16px rgba(240,180,76,0.5);");
  const fill = el(box, "abs", "left:8px;top:8px;height:96px;border-radius:8px;background:linear-gradient(90deg,#f0b44c,#ff6a3d);");
  const n = el(s, "abs cn", "left:1420px;top:340px;width:360px;text-align:center;font-size:84px;font-weight:900;color:#f4ead6;");
  const st = el(s, "abs cn", "left:1420px;top:460px;width:360px;text-align:center;font-size:48px;font-weight:900;color:#ff6a3d;letter-spacing:8px;", "没人动");
  return (t, a, z, B) => {
    ps.forEach((p, i) => { const k = eInOutCubic(clamp((t - a - 0.1 - i * 0.18) / 0.9)); p.style.strokeDashoffset = String(p.dataset.L * (1 - k)); });
    const v = val(t, B); n.textContent = `${v} 金`; css(n, { opacity: String(t >= B.ten ? 1 : 0) });
    css(fill, { width: `${(344 * v / 50).toFixed(1)}px` }); css(box, { opacity: String(t >= B.ten - 0.3 ? 1 : 0) });
    css(st, { opacity: String(fade(t, B.nobody, B.fifty, 0.2)) });
  };
}

// ── 4 水墨纸本：宣纸底、晕染远山、一笔浓墨的木头、宋体竖排、朱砂印章 ──
function paper(s) {
  const svg = el(s, "abs", "left:0;top:0;width:1920px;height:1080px;");
  svg.innerHTML = `<svg width="1920" height="1080"><defs><filter id="ink"><feGaussianBlur stdDeviation="14"/></filter><filter id="rough"><feTurbulence baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
    <radialGradient id="pp"><stop offset="0" stop-color="#f4eddc"/><stop offset="1" stop-color="#e2d6bc"/></radialGradient></defs>
    <rect width="1920" height="1080" fill="url(#pp)"/>
    <path class="m1" d="M0 760 Q260 520 520 640 Q760 430 1040 610 Q1300 470 1560 600 Q1760 520 1920 620 L1920 1080 L0 1080 Z" fill="#9a958c" opacity="0.45" filter="url(#ink)"/>
    <path class="m2" d="M0 860 Q300 700 640 790 Q980 660 1320 780 Q1640 700 1920 790 L1920 1080 L0 1080 Z" fill="#5d5850" opacity="0.5" filter="url(#ink)"/>
    <g class="gate" fill="#2a2420" opacity="0.85" filter="url(#rough)"><rect x="560" y="560" width="520" height="240"/><path d="M520 560 L820 470 L1120 560 Z"/><path d="M780 800 L780 690 Q820 650 860 690 L860 800 Z" fill="#efe6d2"/></g>
    <path class="log" d="M1250 840 L1262 380" stroke="#1d1814" stroke-width="22" stroke-linecap="round" filter="url(#rough)"/></svg>`;
  const log = svg.querySelector(".log"), LL = log.getTotalLength(); log.style.strokeDasharray = LL;
  const gate = svg.querySelector(".gate");
  const vt = el(s, "abs", "left:1480px;top:220px;writing-mode:vertical-rl;font-family:'Songti SC','STSong',serif;font-size:64px;font-weight:700;color:#2a2420;letter-spacing:12px;line-height:1.5;");
  const seal = el(s, "abs", "left:1340px;top:640px;width:150px;height:150px;background:#b23a2e;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Songti SC','STSong',serif;font-size:54px;font-weight:900;color:#f4eddc;line-height:1.05;text-align:center;transform:rotate(-4deg);", "五十<br>金");
  return (t, a, z, B) => {
    const k = eInOutCubic(clamp((t - a - 0.1) / 1.2));
    log.style.strokeDashoffset = String(LL * (1 - k)); gate.style.opacity = String(0.85 * clamp((t - a) / 0.8));
    const txt = t < B.ten ? "" : t < B.nobody ? "南门立木\n赏十金" : t < B.fifty ? "南门立木\n赏十金\n莫敢徙" : "南门立木\n赏十金\n莫敢徙";
    if (vt.innerText !== txt) vt.innerText = txt;
    const ks = t - B.fifty; css(seal, { opacity: String(ks > 0 ? 1 : 0), transform: `rotate(-4deg) scale(${(ks < 0 ? 1.8 : lerp(1.8, 1, eOutCubic(clamp(ks / 0.16)))).toFixed(3)})` });
  };
}

// ── 5 像素：240×135 像素画放大 8 倍，金币、关卡名、像素数字 ──
function pixel(s) {
  const cv = document.createElement("canvas"); cv.width = 240; cv.height = 135; cv.style.cssText = "position:absolute;left:0;top:0;width:1920px;height:1080px;image-rendering:pixelated;"; s.appendChild(cv);
  const g = cv.getContext("2d");
  const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const lab = el(s, "abs mono", "left:60px;top:50px;font-size:34px;font-weight:700;color:#ffd23f;letter-spacing:4px;text-shadow:4px 4px 0 #10122a;", "STAGE 1-1 · 南门");
  const n = el(s, "abs mono", "right:80px;top:46px;font-size:64px;font-weight:900;color:#f8f4e3;text-shadow:6px 6px 0 #10122a;white-space:nowrap;");
  const st = el(s, "abs cn", "left:760px;top:250px;width:400px;text-align:center;font-size:56px;font-weight:900;color:#10122a;background:#ffd23f;border:8px solid #10122a;padding:6px 0;", "没人动");
  return (t, a, z, B) => {
    g.clearRect(0, 0, 240, 135);
    for (let i = 0; i < 6; i++) P(0, i * 14, 240, 14, ["#1b1f4a", "#252a63", "#33397a", "#4a4f8f", "#6b5f9e", "#9a6f98"][i]);
    for (let i = 0; i < 18; i++) P((i * 37) % 240, (i * 13) % 50, 1, 1, "#f8f4e3");
    P(40, 52, 160, 50, "#5b3d2e"); P(40, 52, 160, 4, "#3a2618"); for (let x = 40; x < 200; x += 8) P(x, 48, 5, 4, "#5b3d2e");
    P(90, 34, 60, 18, "#7a2a1d"); P(84, 32, 72, 4, "#3a2618"); P(96, 26, 48, 6, "#3a2618");
    P(110, 76, 20, 26, "#ffd28a"); P(0, 102, 240, 33, "#3b2a22"); for (let x = 0; x < 240; x += 6) P(x, 102, 3, 2, "#55402f");
    P(150, 50, 3, 52, "#2a1810"); P(150, 50, 1, 52, "#7a5638");
    const R = rng(9); for (let i = 0; i < 14; i++) { const x = 10 + Math.floor(R() * 220), y = 104 + Math.floor(R() * 20); if (Math.abs(x - 151) < 14) continue; P(x, y - 6, 3, 3, "#141018"); P(x - 1, y - 3, 5, 6, "#141018"); }
    if (t >= B.fifty) for (let i = 0; i < 5; i++) { const ph = (t - B.fifty) * 3 + i; const y = 70 - Math.abs(Math.sin(ph)) * 18; P(120 + i * 18, Math.round(y), 5, 5, "#ffd23f"); P(121 + i * 18, Math.round(y) + 1, 2, 3, "#fff2a0"); }
    n.textContent = `💰 ${String(val(t, B)).padStart(2, "0")}`; css(n, { opacity: String(t >= B.ten ? 1 : 0) });
    css(st, { opacity: String(fade(t, B.nobody, B.fifty, 0.12)) });
    css(lab, { opacity: String(clamp((t - a) / 0.2)) });
  };
}
const MAKERS = { gufeng, starfield, darkgold, paper, pixel };

export async function build(ctx) {
  const N = ctx.narr, T = (s) => N.t(s), END = N.total, SEG = END / 5;
  const shots = [];
  const add = (from, to, b, r) => shots.push({ from, to, build: b, render: r });
  sections.push({ t: 0, t_to: END + TAIL, level: 1 });
  STY.forEach((st, i) => {
    const a = i * SEG, h = a + 1.8, z = (i + 1) * SEG, id = `B${String(i + 1).padStart(2, "0")}`, B = beatsOf(T, id);
    sfx.push({ t: a + 0.15, type: "whoosh" }, { t: B.fifty, type: "slam" });
    // 风格名卡片
    add(a, h, (root) => {
      const s = el(root, "shot");
      const no = el(s, "abs", `left:0;width:1920px;top:340px;text-align:center;font-family:Geist;font-size:26px;letter-spacing:10px;color:${st.th.dim};`, `VISUAL SYSTEM ${i + 1} / 5 · ${st.en}`);
      const nm = el(s, "abs cn", `left:0;width:1920px;top:400px;text-align:center;font-size:150px;font-weight:900;color:${st.th.light ? st.th.ink : st.th.ink};letter-spacing:12px;`, st.name);
      const ft = el(s, "abs cn", `left:0;width:1920px;top:600px;text-align:center;font-size:40px;color:${st.th.accent};letter-spacing:4px;`, `适合：${st.fit}`);
      return { s, no, nm, ft };
    }, (t, u) => {
      bg(ctx, st.th, { bloom: 0.6 });
      const k = eOutCubic(clamp((t - a) / 0.4)), o = 1 - clamp((t - h + 0.25) / 0.25);
      for (const n of [u.no, u.nm, u.ft]) css(n, { opacity: String(k * o), transform: `translateY(${((1 - k) * 20).toFixed(1)}px)` });
    });
    // 开场演示
    add(h, z, (root) => {
      const s = el(root, "shot");
      const tag = el(s, "abs mono", `right:40px;top:28px;font-size:18px;letter-spacing:4px;color:${st.th.light ? "#7d7266" : "rgba(255,255,255,0.55)"};z-index:5;`, `${i + 1}/5 · ${st.name}`);
      return { s, tag, draw: MAKERS[st.key](s) };
    }, (t, u) => { bg(ctx, st.th); u.draw(t, h, z, B); });
  });
  // 收尾：选哪一套
  add(END, END + TAIL, (root) => {
    const s = el(root, "shot");
    el(s, "abs cn", "left:0;width:1920px;top:300px;text-align:center;font-size:96px;font-weight:900;color:#f6f2ea;", "选哪一套？");
    STY.forEach((st, i) => el(s, "abs cn", `left:${160 + i * 330}px;top:520px;width:290px;padding:22px 0;text-align:center;border-radius:18px;font-size:40px;font-weight:800;color:${st.key === "paper" ? "#2a2420" : "#f6f2ea"};background:#${st.th.bg.toString(16).padStart(6, "0")};border:3px solid ${st.th.accent};`, `${i + 1} ${st.name}`));
    el(s, "abs cn", "left:0;width:1920px;top:700px;text-align:center;font-size:32px;color:#a8a29a;", "每套都能做基础档（0 积分）或 Renoise 增强档");
    return { s };
  }, (t) => { bg(ctx, TH.starfield, { color: 0x0b0a0c }); });
  return shots;
}
