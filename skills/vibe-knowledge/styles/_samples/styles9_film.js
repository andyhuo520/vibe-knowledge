// 风格样片集 · 第九批：5 套 0 积分代码风格（候选清单收尾），同一段开场（复用第 01 期 B01 旁白）。
// 黏土卡哇伊、装饰艺术金线、国家公园海报、档案灯台、电视新闻包装（台名虚构「VIBE 新闻」，不模仿真实电视台）。
import { clamp, lerp, eOutCubic, eInOutCubic, eOutQuint, eInCubic, eOutBack, hit, el, css, rng } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 3.0;
export const meta = { title: "风格样片集 · 第九批", n: "styles9" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const val = (t, B) => (t < B.ten ? 0 : t < B.fifty ? Math.round(10 * eOutCubic(clamp((t - B.ten) / 0.4))) : Math.round(lerp(10, 50, eOutCubic(clamp((t - B.fifty) / 0.5)))));
const pop = (t, at, d = 0.35) => (t < at ? 0 : eOutBack(clamp((t - at) / d)));
const svgBox = (p, style, inner) => { const d = el(p, "abs", style); d.innerHTML = inner; return d; };
const prep = (nodes) => nodes.forEach((n) => { const L = n.getTotalLength(); n.style.strokeDasharray = `${L} ${L}`; n.dataset.L = L; n.style.strokeDashoffset = L; });
const drawAt = (n, t, a, d) => { n.style.strokeDashoffset = String(n.dataset.L * (1 - eInOutCubic(clamp((t - a) / d)))); };
const SONG = "font-family:'Songti SC','STSong',serif;";
const SANS = "font-family:Geist,'PingFang SC',NotoSC,sans-serif;";
const IMG01 = (f) => new URL(`../01/assets/img/${f}`, import.meta.url).href;
const VK = (window.__vk ||= { pend: [], async wait() { while (this.pend.length) { const ps = this.pend.splice(0); await Promise.all(ps.map((f) => f())); } } });
const preload = (src) => { const im = new Image(); im.src = src; const p = im.decode().catch(() => {}); VK.pend.push(() => p); };
// 挤压回弹：t 从 at 开始，返回 [scaleX, scaleY]
const squash = (t, at, amp = 0.28, f = 14, d = 5) => { if (t < at) return [0, 0]; const k = t - at, a = clamp(k / 0.12), w = Math.exp(-k * d) * Math.sin(k * f) * amp; return [a * (1 + w), a * (1 - w)]; };

// ── 1 黏土卡哇伊：粉色奶油底，黏土城门和豆豆村民都有小脸，出场挤压回弹；「没人动」豆豆们发抖冒汗；五十金大黏土金币砸下来。讲法：Q 弹 ──
function clay(s, h, z, B) {
  el(s, "abs", "inset:0;background:radial-gradient(ellipse at 50% 30%,#FFF1F5,#FFD9E6 70%,#F8C3D6);");
  const clayBox = (style, inner = "") => { const d = el(s, "abs", `border-radius:40px;box-shadow:inset -14px -18px 0 rgba(0,0,0,0.10),inset 12px 12px 0 rgba(255,255,255,0.45),0 18px 0 rgba(150,60,90,0.18);${style}`); d.innerHTML = inner; return d; };
  const face = (x, y, sz = 1) => `<div style="position:absolute;left:${x}px;top:${y}px;transform:scale(${sz});transform-origin:0 0"><div style="position:absolute;left:0;top:0;width:16px;height:22px;border-radius:50%;background:#3B2430"></div><div style="position:absolute;left:46px;top:0;width:16px;height:22px;border-radius:50%;background:#3B2430"></div><div style="position:absolute;left:4px;top:30px;width:20px;height:10px;border-radius:50%;background:#FF8FB1;opacity:.8"></div><div style="position:absolute;left:40px;top:30px;width:20px;height:10px;border-radius:50%;background:#FF8FB1;opacity:.8"></div><div style="position:absolute;left:22px;top:24px;width:18px;height:10px;border-bottom:4px solid #3B2430;border-radius:0 0 12px 12px"></div></div>`;
  const gate = clayBox("left:1060px;top:430px;width:640px;height:400px;background:#FFC2D4;transform-origin:50% 100%;", `<div style="position:absolute;left:-40px;top:-110px;width:720px;height:140px;border-radius:70px;background:#9EE6D0;box-shadow:inset -12px -14px 0 rgba(0,0,0,0.10),inset 10px 10px 0 rgba(255,255,255,0.5)"></div><div style="position:absolute;left:240px;top:200px;width:160px;height:200px;border-radius:80px 80px 0 0;background:#E895B0"></div>${face(270, 90, 1.4)}`);
  const pole = clayBox("left:880px;top:300px;width:110px;height:530px;border-radius:55px;background:#D9A06B;transform-origin:50% 100%;", face(24, 120, 1));
  const BEANS = [[220, 780, "#B9E3FF"], [380, 800, "#FFE08A"], [540, 790, "#C9B6FF"], [1760, 800, "#A8F0C6"]];
  const beans = BEANS.map(([x, y, c]) => clayBox(`left:${x}px;top:${y}px;width:120px;height:150px;border-radius:60px 60px 54px 54px;background:${c};transform-origin:50% 100%;`, face(26, 50, 1)));
  const drops = BEANS.map(([x, y]) => el(s, "abs", `left:${x + 100}px;top:${y - 20}px;width:26px;height:36px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#8FD3FF;border:3px solid #3B2430;`));
  const bubble = (txt, x, y, size, bgc, c) => clayBox(`left:${x}px;top:${y}px;padding:20px 50px;border-radius:999px;background:${bgc};${SANS}font-size:${size}px;font-weight:900;color:${c};white-space:nowrap;transform-origin:50% 100%;`, txt);
  const b1 = bubble("一根木头 ♪", 160, 170, 96, "#FFFFFF", "#E05A8A"), b2 = bubble("南门 → 北门", 200, 380, 56, "#9EE6D0", "#2E6B5A");
  const nb = bubble("", 160, 170, 130, "#FFFFFF", "#E05A8A"), no = bubble("没人动…", 200, 440, 80, "#C9B6FF", "#3B2430");
  const coin = clayBox(`left:300px;top:250px;width:440px;height:440px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFF4B0,#FFD25A 55%,#E8A82A);display:flex;align-items:center;justify-content:center;${SANS}font-size:170px;font-weight:900;color:#B5651D;transform-origin:50% 100%;`, "50");
  const hearts = [...Array(10)].map((_, i) => el(s, "abs", `left:${200 + i * 160}px;top:-80px;${SANS}font-size:${50 + (i % 3) * 16}px;color:${["#FF7FA8", "#FFD25A", "#9EE6D0", "#C9B6FF"][i % 4]};`, "♥"));
  const sq = (n, t, at, base = "") => { const [sx, sy] = squash(t, at); css(n, { opacity: String(t >= at ? 1 : 0), transform: `${base} scale(${sx.toFixed(3)},${sy.toFixed(3)})` }); };
  return (t) => {
    const F = t >= B.fifty;
    sq(gate, t, h + 0.1); sq(pole, t, h + 0.4); beans.forEach((b, i) => sq(b, t, h + 0.6 + i * 0.08));
    if (t >= B.nobody && !F) beans.forEach((b, i) => css(b, { transform: `translateX(${(Math.sin(t * 60 + i) * 4).toFixed(1)}px)` }));
    drops.forEach((d, i) => css(d, { opacity: String(t >= B.nobody + i * 0.06 && !F ? 1 : 0), transform: `translateY(${(clamp((t - B.nobody) / 0.6) * 30).toFixed(0)}px)` }));
    sq(b1, t, h + 0.3); sq(b2, t, h + 0.9); if (t >= B.ten) { css(b1, { opacity: "0" }); css(b2, { opacity: "0" }); }
    nb.textContent = `赏 ${Math.min(val(t, B), 10)} 金`; sq(nb, t, B.ten); if (F) css(nb, { opacity: "0" });
    sq(no, t, B.nobody); if (F) css(no, { opacity: "0" });
    const k = clamp((t - B.fifty) / 0.35); const [sx, sy] = squash(t, B.fifty + 0.35, 0.35);
    css(coin, { opacity: String(F ? 1 : 0), transform: t < B.fifty + 0.35 ? `translateY(${(-900 * (1 - eInCubic(k))).toFixed(0)}px)` : `scale(${sx.toFixed(3)},${sy.toFixed(3)})` });
    hearts.forEach((n, i) => { const kk = t - B.fifty - 0.4 - i * 0.05; css(n, { opacity: String(kk > 0 ? 1 : 0), transform: `translateY(${(kk * 500).toFixed(0)}px) rotate(${(kk * 120).toFixed(0)}deg)` }); });
  };
}

// ── 2 装饰艺术金线：黑底，金线从中轴向两侧对称画出阶梯塔楼，顶部扇形放射线打开；数字在金框嵌板里；五十金嵌板填金。讲法：对称展开 ──
function deco(s, h, z, B) {
  el(s, "abs", "inset:0;background:radial-gradient(ellipse at 50% 20%,#1E1A12,#0D0C0A 70%);");
  const GD = "#D4AF37";
  const half = (sgn) => `<path class="m" d="M960 980 H${960 + sgn * 820}"/><path class="m" d="M960 940 H${960 + sgn * 300} V560 H${960 + sgn * 380} V460 H${960 + sgn * 440} V980"/><path class="m" d="M960 880 H${960 + sgn * 180} V620 H${960 + sgn * 240} V520"/><path class="m" d="M${960 + sgn * 520} 980 V640 L${960 + sgn * 600} 560 L${960 + sgn * 680} 640 V980"/><path class="m" d="M${960 + sgn * 560} 980 V680 M${960 + sgn * 600} 980 V660 M${960 + sgn * 640} 980 V680"/>`;
  const g = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080" fill="none" stroke="${GD}" stroke-width="3" stroke-linejoin="miter">
    ${half(1)}${half(-1)}
    <g class="fan">${[...Array(17)].map((_, i) => { const a = Math.PI + (i / 16) * Math.PI; return `<path d="M960 460 L${(960 + Math.cos(a) * 340).toFixed(0)} ${(460 + Math.sin(a) * 340).toFixed(0)}" stroke-width="2"/>`; }).join("")}<path d="M620 460 A340 340 0 0 1 1300 460" stroke-width="4"/><path d="M700 460 A260 260 0 0 1 1220 460" stroke-width="2"/></g>
    <path class="m" d="M960 460 V980" stroke-width="2"/></svg>`);
  const M = [...g.querySelectorAll(".m")], fan = g.querySelector(".fan"); prep(M);
  const panel = el(s, "abs", `left:710px;top:560px;width:500px;height:300px;border:4px solid ${GD};outline:2px solid ${GD};outline-offset:10px;background:#0D0C0A;display:flex;flex-direction:column;align-items:center;justify-content:center;`);
  const lab = el(panel, "", `${SONG}font-size:34px;color:${GD};letter-spacing:22px;margin-bottom:8px;`, "赏　金");
  const num = el(panel, "", `${SANS}font-size:150px;font-weight:300;color:#F3E2A9;letter-spacing:20px;line-height:1;`);
  const title = el(s, "abs", `left:0;width:1920px;top:24px;text-align:center;${SONG}font-size:56px;color:#F3E2A9;letter-spacing:40px;`, "南门 · 立木");
  const sub = el(s, "abs", `left:0;width:1920px;top:98px;text-align:center;${SANS}font-size:24px;color:${GD};letter-spacing:18px;`, "THE  POLE  AT  THE  SOUTH  GATE");
  const no = el(s, "abs", `left:0;width:1920px;top:872px;text-align:center;${SONG}font-size:44px;color:${GD};letter-spacing:30px;`, "— 无 人 动 —");
  return (t) => {
    const F = t >= B.fifty;
    M.forEach((p, i) => drawAt(p, t, h + (i % 5) * 0.12, 0.9));
    css(fan, { opacity: String(clamp((t - h - 0.6) / 0.3)), transform: `scale(${eOutCubic(clamp((t - h - 0.6) / 0.6)).toFixed(3)})`, transformOrigin: "960px 460px" });
    css(title, { opacity: String(clamp((t - h - 0.4) / 0.4)), letterSpacing: `${lerp(80, 40, eOutCubic(clamp((t - h - 0.4) / 0.6))).toFixed(0)}px` }); css(sub, { opacity: String(clamp((t - h - 0.8) / 0.4)) });
    css(panel, { opacity: String(t >= B.ten - 0.1 ? 1 : 0), background: F ? `linear-gradient(135deg,#8A6A1E,${GD} 45%,#F7E39A 55%,#8A6A1E)` : "#0D0C0A", transform: `scaleY(${eOutCubic(clamp((t - B.ten + 0.1) / 0.3)).toFixed(3)})` });
    num.textContent = String(val(t, B)); css(num, { color: F ? "#1A1408" : "#F3E2A9" }); css(lab, { color: F ? "#1A1408" : GD });
    css(no, { opacity: String(t >= B.nobody && !F ? 1 : 0), letterSpacing: `${lerp(60, 30, eOutCubic(clamp((t - B.nobody) / 0.4))).toFixed(0)}px` });
  };
}

// ── 3 国家公园海报：米色纸、限定 5 色平涂，天空 / 远山 / 近山 / 城门 / 题字一版版从下往上压上（套印）；徽章写赏金；五十金太阳升起。讲法：逐版套印 ──
function poster(s, h, z, B) {
  el(s, "abs", "inset:0;background:#3A2E28;");
  const card = el(s, "abs", "left:360px;top:40px;width:1200px;height:1000px;overflow:hidden;background:#F3E6C4;box-shadow:0 30px 60px rgba(0,0,0,0.5);");
  const layer = (inner) => { const d = el(card, "abs", "left:0;top:0;width:1200px;height:1000px;"); d.innerHTML = inner; return d; };
  const L0 = layer(`<svg width="1200" height="1000"><rect width="1200" height="380" fill="#F2C14E"/><rect y="250" width="1200" height="200" fill="#F0A35A"/></svg>`);
  const sun = el(card, "abs", "left:760px;width:220px;height:220px;border-radius:50%;background:#FFF2C4;");
  const L1 = layer(`<svg width="1200" height="1000"><path d="M0 520 L180 330 L320 450 L520 260 L720 470 L900 320 L1200 520 V1000 H0Z" fill="#D9682B"/></svg>`);
  const L2 = layer(`<svg width="1200" height="1000"><path d="M0 640 L260 480 L460 600 L700 470 L1000 620 L1200 540 V1000 H0Z" fill="#2F6B6B"/><path d="M0 720 Q600 640 1200 720 V1000 H0Z" fill="#1F4F4F"/></svg>`);
  const L3 = layer(`<svg width="1200" height="1000" fill="#2B2B2B"><rect x="640" y="560" width="300" height="190"/><path d="M610 560 L790 480 L970 560Z"/><path d="M760 750 V660 Q790 630 820 660 V750Z" fill="#F3E6C4"/><rect x="560" y="380" width="16" height="370"/>${[...Array(9)].map((_, i) => { const x = 140 + i * 50; return `<circle cx="${x}" cy="${716 + (i % 2) * 8}" r="12"/><path d="M${x - 18} 780 Q${x - 16} ${728 + (i % 2) * 8} ${x} ${726 + (i % 2) * 8} Q${x + 16} ${728 + (i % 2) * 8} ${x + 18} 780Z"/>`; }).join("")}</svg>`);
  const band = el(card, "abs", "left:0;top:730px;width:1200px;height:270px;background:#2B2B2B;");
  const tt = el(band, "abs", `left:0;width:1200px;top:16px;text-align:center;${SANS}font-size:96px;font-weight:900;color:#F2C14E;letter-spacing:24px;`, "南门 · 立木");
  const st = el(band, "abs", `left:0;width:1200px;top:126px;text-align:center;${SANS}font-size:26px;font-weight:700;color:#F3E6C4;letter-spacing:14px;`, "一根木头　南门 → 北门");
  const badge = el(card, "abs", `left:80px;top:70px;width:260px;height:260px;border-radius:50%;background:#2B2B2B;border:10px solid #F3E6C4;box-shadow:0 0 0 6px #2B2B2B;display:flex;flex-direction:column;align-items:center;justify-content:center;`);
  const bl = el(badge, "", `${SANS}font-size:28px;font-weight:800;color:#F3E6C4;letter-spacing:8px;`, "赏　金");
  const bn = el(badge, "", `${SANS}font-size:110px;font-weight:900;color:#F2C14E;line-height:1;`);
  const plaque = el(card, "abs", `left:120px;top:600px;padding:10px 28px;background:#D9682B;border:6px solid #2B2B2B;${SANS}font-size:52px;font-weight:900;color:#F3E6C4;letter-spacing:8px;transform:rotate(-3deg);`, "没人动");
  svgBox(card, "left:0;top:0;width:1200px;height:1000px;mix-blend-mode:multiply;opacity:0.35;pointer-events:none;", `<svg width="1200" height="1000"><filter id="pp9"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="9"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1200" height="1000" filter="url(#pp9)" opacity="0.5"/></svg>`);
  const press = (n, t, a) => { const k = eOutQuint(clamp((t - a) / 0.35)); css(n, { opacity: String(t >= a ? 1 : 0), transform: `translateY(${((1 - k) * 120).toFixed(0)}px)` }); };
  return (t) => {
    const F = t >= B.fifty;
    press(L0, t, h); press(L1, t, h + 0.25); press(L2, t, h + 0.5); press(L3, t, h + 0.75); press(band, t, h + 1.0);
    css(sun, { top: `${lerp(560, 160, eOutCubic(clamp((t - B.fifty) / 0.9))).toFixed(0)}px`, opacity: String(t >= h ? 1 : 0) });
    const pb = pop(t, B.ten - 0.05, 0.3); css(badge, { opacity: String(pb > 0 ? 1 : 0), transform: `scale(${pb.toFixed(3)}) rotate(${F ? lerp(-20, 0, eOutCubic(clamp((t - B.fifty) / 0.4))) : 0}deg)` });
    bn.textContent = String(val(t, B));
    css(plaque, { opacity: String(t >= B.nobody && !F ? 1 : 0), transform: `rotate(-3deg) scale(${pop(t, B.nobody, 0.25).toFixed(3)})` });
    css(card, { transform: `scale(${(1 + 0.02 * clamp((t - h) / (z - h))).toFixed(4)})` });
  };
}

// ── 4 档案灯台：暗房里一张冷光灯台，竹简、胶片条、现场照片摊在上面；放大镜依次滑到「予十金」「莫敢徙」「五十金」，红色油性笔圈住。讲法：放大看证据 ──
function lighttable(s, h, z, B) {
  preload(IMG01("a01.jpg"));
  el(s, "abs", "inset:0;background:radial-gradient(ellipse at 50% 50%,#1B2230,#0A0D14 75%);");
  const tbl = el(s, "abs", "left:120px;top:90px;width:1680px;height:900px;border-radius:14px;background:linear-gradient(180deg,#F4F9FF,#DCEBFA);box-shadow:0 0 120px rgba(170,210,255,0.35),0 0 0 14px #2A2F38;background-image:linear-gradient(rgba(120,150,190,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(120,150,190,0.18) 1px,transparent 1px);background-size:60px 60px;");
  const CH = ["募民有能徙置北門者予十金", "民怪之莫敢徙", "復曰能徙者予五十金"];
  const slips = el(tbl, "abs", "left:120px;top:90px;width:640px;height:720px;");
  const build = (parent) => { CH.forEach((col, ci) => { [...col].forEach((c, i) => {}); }); const cols = []; for (let ci = 0; ci < 3; ci++) { const x = 440 - ci * 170; const sl = el(parent, "abs", `left:${x}px;top:0;width:120px;height:720px;background:linear-gradient(90deg,#B98A50,#D8AE72 40%,#C9965A);border-radius:6px;box-shadow:4px 6px 0 rgba(60,40,20,0.25);`); el(sl, "abs", `left:0;top:30px;width:120px;writing-mode:vertical-rl;${SONG}font-size:52px;font-weight:700;color:#2A1A0C;letter-spacing:4px;line-height:120px;text-align:center;`, CH[ci]); cols.push(sl); } return cols; };
  build(slips);
  const film = el(tbl, "abs", "left:860px;top:110px;width:700px;height:150px;background:#2A2018;border-radius:4px;");
  for (let i = 0; i < 4; i++) { el(film, "abs", `left:${30 + i * 170}px;top:25px;width:150px;height:100px;background:linear-gradient(135deg,#7A5A3A,#C9A272);opacity:0.85;`); for (let j = 0; j < 9; j++) { el(film, "abs", `left:${10 + i * 170 + j * 18}px;top:6px;width:10px;height:10px;background:#F4F9FF;border-radius:2px;`); el(film, "abs", `left:${10 + i * 170 + j * 18}px;top:134px;width:10px;height:10px;background:#F4F9FF;border-radius:2px;`); } }
  const photo = el(tbl, "abs", `left:900px;top:330px;width:560px;height:315px;background:url(${IMG01("a01.jpg")}) center/cover;border:14px solid #FBFBF7;box-shadow:6px 10px 20px rgba(0,0,0,0.3);transform:rotate(3deg);`);
  el(photo, "abs mono", "right:6px;bottom:4px;font-size:14px;color:#fff;background:rgba(0,0,0,0.5);padding:1px 6px;", "AI 示意");
  const tag = el(tbl, "abs mono", "left:940px;top:700px;padding:10px 20px;background:#FFE14D;font-size:30px;font-weight:700;color:#2A2018;transform:rotate(-4deg);box-shadow:3px 4px 0 rgba(0,0,0,0.2);", "EVIDENCE 01 · 史记·商君列传");
  // 红笔圈（灯台坐标）
  const rings = svgBox(tbl, "left:0;top:0;width:1680px;height:900px;", `<svg width="1680" height="900" fill="none" stroke="#E0302A" stroke-width="7" stroke-linecap="round">
    <ellipse class="r" cx="${120 + 440 + 60}" cy="${90 + 30 + 56 * 10 + 28}" rx="78" ry="110"/>
    <ellipse class="r" cx="${120 + 270 + 60}" cy="${90 + 30 + 56 * 4 + 28}" rx="78" ry="110"/>
    <ellipse class="r" cx="${120 + 100 + 60}" cy="${90 + 30 + 56 * 7 + 28}" rx="78" ry="110"/></svg>`);
  const RG = [...rings.querySelectorAll(".r")]; prep(RG);
  // 放大镜：克隆竹简放大 2 倍
  const LR = 190, Z = 2;
  const loupe = el(s, "abs", `width:${LR * 2}px;height:${LR * 2}px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 16px #1A1A1A,0 0 0 20px #8A8A8A,0 30px 60px rgba(0,0,0,0.5);background:#E8F2FC;`);
  const inner = el(loupe, "abs", `left:0;top:0;width:640px;height:720px;transform-origin:0 0;`); build(inner);
  const handle = el(s, "abs", "width:44px;height:240px;border-radius:22px;background:linear-gradient(90deg,#111,#3A3A3A,#111);transform:rotate(-40deg);transform-origin:50% 0;");
  // 放大镜目标（竹简局部坐标）
  const P = (ci, row) => [440 - ci * 170 + 60, 30 + row * 56 + 28];
  const STOPS = [[h + 0.3, P(0, 1)], [B.ten, P(0, 11)], [B.nobody, P(1, 4)], [B.fifty, P(2, 7)]];
  return (t) => {
    let [px, py] = STOPS[0][1];
    for (let i = 1; i < STOPS.length; i++) { const [a, p] = STOPS[i], prev = STOPS[i - 1][1]; if (t >= a - 0.12) { const k = eInOutCubic(clamp((t - a + 0.12) / 0.2)); px = lerp(prev[0], p[0], k); py = lerp(prev[1], p[1], k); } }
    const sx = 120 + 120 + px, sy = 90 + 90 + py; // 屏幕坐标
    css(loupe, { left: `${sx - LR}px`, top: `${sy - LR}px`, opacity: String(clamp((t - h - 0.2) / 0.3)) });
    css(inner, { transform: `translate(${(LR - px * Z).toFixed(1)}px,${(LR - py * Z).toFixed(1)}px) scale(${Z})` });
    css(handle, { left: `${sx + LR * 0.62}px`, top: `${sy + LR * 0.62}px`, opacity: String(clamp((t - h - 0.2) / 0.3)) });
    drawAt(RG[0], t, B.ten + 0.3, 0.4); drawAt(RG[1], t, B.nobody + 0.3, 0.4); drawAt(RG[2], t, B.fifty + 0.4, 0.4);
    css(tag, { opacity: String(clamp((t - h - 0.6) / 0.3)) });
  };
}

// ── 5 电视新闻包装：蓝色演播室底、虚构台标「VIBE 新闻 · 直播」、画中画现场、两层下方标题条、底部滚动字幕；五十金红色「突发」横幅。讲法：新闻播报 ──
function tvnews(s, h, z, B) {
  preload(IMG01("a01.jpg"));
  el(s, "abs", "inset:0;background:linear-gradient(135deg,#06173A,#0B3A7A 55%,#06173A);");
  const streaks = [...Array(6)].map((_, i) => el(s, "abs", `left:-600px;top:${120 + i * 150}px;width:600px;height:${3 + (i % 3) * 2}px;background:linear-gradient(90deg,rgba(120,190,255,0),rgba(120,190,255,0.6),rgba(120,190,255,0));`));
  const bug = el(s, "abs", "left:70px;top:50px;display:flex;align-items:center;gap:14px;");
  el(bug, "", `padding:8px 18px;background:#E8202A;${SANS}font-size:30px;font-weight:900;color:#fff;letter-spacing:2px;`, "VIBE 新闻");
  const live = el(bug, "", `display:flex;align-items:center;gap:10px;padding:8px 16px;background:rgba(0,0,0,0.55);${SANS}font-size:26px;font-weight:800;color:#fff;letter-spacing:4px;`, `<span class="dot" style="width:14px;height:14px;border-radius:50%;background:#FF3B3B;display:inline-block"></span>直播`);
  const dot = live.querySelector(".dot");
  const clock = el(s, "abs mono", "right:70px;top:56px;font-size:34px;font-weight:700;color:#fff;letter-spacing:2px;");
  const pip = el(s, "abs", `left:160px;top:160px;width:1000px;height:562px;background:url(${IMG01("a01.jpg")}) center/cover;border:6px solid rgba(255,255,255,0.9);box-shadow:0 20px 50px rgba(0,0,0,0.5);`);
  el(pip, "abs", `left:16px;top:14px;padding:4px 12px;background:rgba(0,0,0,0.55);${SANS}font-size:22px;font-weight:700;color:#fff;`, "现场 · 国都南门");
  el(pip, "abs mono", "right:10px;bottom:8px;font-size:16px;color:#fff;background:rgba(0,0,0,0.5);padding:1px 8px;", "AI 示意");
  const panel = el(s, "abs", "left:1220px;top:160px;width:540px;height:562px;background:rgba(255,255,255,0.95);border-top:10px solid #E8202A;");
  el(panel, "abs", `left:36px;top:40px;${SANS}font-size:32px;font-weight:800;color:#0B3A7A;letter-spacing:4px;`, "悬赏金额");
  const pn = el(panel, "abs", `left:30px;top:100px;${SANS}font-size:230px;font-weight:900;color:#0B1B33;line-height:1;letter-spacing:-6px;`);
  el(panel, "abs", `left:40px;top:350px;${SANS}font-size:56px;font-weight:900;color:#0B3A7A;`, "金");
  const pst = el(panel, "abs", `left:36px;top:460px;${SANS}font-size:34px;font-weight:800;color:#E8202A;`);
  const lt = el(s, "abs", "left:0;top:770px;width:1920px;height:130px;");
  const ltA = el(lt, "abs", `left:160px;top:0;padding:0 28px;height:70px;line-height:70px;background:#E8202A;${SANS}font-size:40px;font-weight:900;color:#fff;letter-spacing:4px;`, "快讯");
  const ltB = el(lt, "abs", `left:310px;top:0;width:1450px;height:70px;line-height:70px;padding-left:30px;background:#fff;${SANS}font-size:42px;font-weight:900;color:#0B1B33;box-sizing:border-box;`);
  const ltC = el(lt, "abs", `left:160px;top:72px;width:1600px;height:46px;line-height:46px;padding-left:28px;background:#0B3A7A;${SANS}font-size:26px;font-weight:700;color:#CFE3FF;box-sizing:border-box;`, "本台记者 国都南门现场报道");
  const tk = el(s, "abs", "left:0;top:922px;width:1920px;height:56px;background:#0A1A33;overflow:hidden;border-top:3px solid #E8202A;");
  const crawl = el(tk, "abs", `left:0;top:0;height:56px;line-height:56px;white-space:nowrap;${SANS}font-size:30px;font-weight:700;color:#fff;`, "【快讯】国都南门立三丈之木 · 能徙置北门者予十金 · 民怪之，莫敢徙 · 复曰能徙者予五十金 · 出处：《史记·商君列传》 · ".repeat(3));
  const breaking = el(s, "abs", `left:0;top:420px;width:1920px;height:180px;background:#E8202A;display:flex;align-items:center;justify-content:center;gap:40px;${SANS}color:#fff;`, `<span style="font-size:56px;font-weight:900;letter-spacing:8px;background:#fff;color:#E8202A;padding:6px 20px">突发</span><span style="font-size:96px;font-weight:900;letter-spacing:6px">赏金提至 五十金</span>`);
  return (t) => {
    const F = t >= B.fifty;
    streaks.forEach((n, i) => css(n, { transform: `translateX(${(((t * (300 + i * 60)) % 2600)).toFixed(0)}px)` }));
    css(dot, { opacity: String(Math.floor(t * 2) % 2 ? 1 : 0.25) });
    const sec = 8 * 3600 + Math.floor(t - h + 1) ; clock.textContent = `08:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    const kp = eOutQuint(clamp((t - h) / 0.4)); css(pip, { transform: `translateX(${((1 - kp) * -1300).toFixed(0)}px)` });
    css(panel, { opacity: String(t >= B.ten - 0.1 ? 1 : 0), transform: `translateX(${((1 - eOutQuint(clamp((t - B.ten + 0.1) / 0.35))) * 700).toFixed(0)}px)` });
    pn.textContent = String(val(t, B)); pst.textContent = t >= B.nobody && !F ? "● 现场：无人应募" : F ? "● 较上次 ×5" : "";
    const kl = eOutQuint(clamp((t - h - 0.3) / 0.35)); css(ltA, { transform: `scaleX(${kl.toFixed(3)})`, transformOrigin: "0 50%" }); css(ltB, { clipPath: `inset(0 ${((1 - eOutQuint(clamp((t - h - 0.45) / 0.4))) * 100).toFixed(1)}% 0 0)` }); css(ltC, { opacity: String(clamp((t - h - 0.8) / 0.3)) });
    ltB.textContent = t < B.ten ? "国都南门立木　悬赏搬木" : t < B.nobody ? "搬木至北门者　赏十金" : t < B.fifty ? "悬赏发布后　现场无人应募" : "赏金加码　五十金";
    ltA.textContent = F ? "突发" : "快讯";
    css(crawl, { transform: `translateX(${(-((t - h) * 220) % 1800).toFixed(0)}px)` });
    css(breaking, { opacity: String(F && t < B.fifty + 1.4 ? 1 : 0), transform: `scaleY(${eOutQuint(clamp((t - B.fifty) / 0.2)).toFixed(3)})` });
  };
}

const STY = [
  { name: "黏土卡哇伊", en: "CLAY KAWAII", fit: "儿童科普 · 萌宠 · 轻松冷知识", th: { bg: 0xFFD9E6, ink: "#3B2430", dim: "#A0607A", accent: "#E05A8A", light: true }, make: clay },
  { name: "装饰艺术金线", en: "ART DECO", fit: "奢侈品 · 金融史 · 20 年代 · 建筑", th: { bg: 0x0D0C0A, ink: "#F3E2A9", dim: "#8A7A4A", accent: "#D4AF37" }, make: deco },
  { name: "国家公园海报", en: "PARK POSTER", fit: "地理 · 自然 · 旅行 · 城市", th: { bg: 0xF3E6C4, ink: "#2B2B2B", dim: "#8A6A4A", accent: "#D9682B", light: true }, make: poster },
  { name: "档案灯台", en: "LIGHT TABLE", fit: "考古 · 文物 · 史料细读", th: { bg: 0x0A0D14, ink: "#F4F9FF", dim: "#8AA0C0", accent: "#E0302A" }, make: lighttable },
  { name: "电视新闻包装", en: "TV NEWS", fit: "热点 · 时事 · 事件播报（虚构台名）", th: { bg: 0x0B3A7A, ink: "#FFFFFF", dim: "#9FC2F0", accent: "#E8202A" }, make: tvnews },
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
      bg(ctx, st.th, { bloom: st.th.light ? 0 : 0.3, vig: st.th.light ? 0.15 : 0.5 });
      const k = eOutCubic(clamp((t - a) / 0.4)), o = 1 - clamp((t - h + 0.25) / 0.25);
      u.ns.forEach((n) => css(n, { opacity: String(k * o), transform: `translateY(${((1 - k) * 20).toFixed(1)}px)` }));
    });
    add(h, z, (root) => { const s = el(root, "shot"); return { s, draw: st.make(s, h, z, B) }; }, (t, u) => { bg(ctx, st.th, { bloom: st.th.light ? 0 : 0.25, vig: st.th.light ? 0.12 : 0.4, grain: 0.015 }); u.draw(t); });
  });
  add(END, END + TAIL, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#0B0A0C;");
    el(s, "abs cn", "left:0;width:1920px;top:300px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +5：候选清单收尾");
    STY.forEach((st, i) => el(s, "abs cn", `left:${130 + i * 340}px;top:500px;width:320px;padding:22px 0;text-align:center;border-radius:16px;font-size:34px;font-weight:800;color:${st.th.ink};background:#${st.th.bg.toString(16).padStart(6, "0")};border:3px solid ${st.th.accent};`, st.name));
    el(s, "abs cn", "left:0;width:1920px;top:700px;text-align:center;font-size:30px;color:#a8a29a;", "全部代码画面 · 0 积分 · 风格库共 43 套 / 8 个家族");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
