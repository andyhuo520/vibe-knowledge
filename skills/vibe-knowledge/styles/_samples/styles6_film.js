// 风格样片集 · 第六批：8 套 0 积分代码风格，同一段开场（复用第 01 期 B01 旁白）。
// 补薄家族：电影感（默片字卡、构成主义蒙太奇）、游戏（RPG 对话框、卡牌对战）；再加发布会极简、极光、杂志编辑、蒸汽波。
import { clamp, lerp, eOutCubic, eInOutCubic, eOutQuint, eInCubic, eOutBack, hit, el, css, rng } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 3.0;
export const meta = { title: "风格样片集 · 第六批", n: "styles6" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const val = (t, B) => (t < B.ten ? 0 : t < B.fifty ? Math.round(10 * eOutCubic(clamp((t - B.ten) / 0.4))) : Math.round(lerp(10, 50, eOutCubic(clamp((t - B.fifty) / 0.5)))));
const pop = (t, at, d = 0.35) => (t < at ? 0 : eOutBack(clamp((t - at) / d)));
const hs = (n) => { const x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
const svgBox = (p, style, inner) => { const d = el(p, "abs", style); d.innerHTML = inner; return d; };
const typed = (txt, t, a, cps = 20) => (t < a ? "" : txt.slice(0, Math.floor((t - a) * cps)));
const SONG = "font-family:'Songti SC','STSong',serif;";
const SANS = "font-family:Geist,'PingFang SC',NotoSC,sans-serif;";

// ── 1 默片字卡：棕褐黑白胶片，颗粒、闪烁、划痕、18 帧/秒抖动；画面和花边字卡交替，光圈开合。讲法：一句一张字卡 ──
function silent(s, h, z, B) {
  el(s, "abs", "inset:0;background:#0B0A08;");
  const film = el(s, "abs", "inset:0;overflow:hidden;");
  const scene = svgBox(film, "inset:0;", `<svg width="1920" height="1080"><defs><linearGradient id="sk1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8c9a8"/><stop offset="1" stop-color="#a8977a"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#sk1)"/><rect y="820" width="1920" height="260" fill="#6b5d48"/>
    <g fill="#1d1812"><rect x="520" y="470" width="760" height="350"/><path d="M460 470 L900 330 L1340 470Z"/><rect x="600" y="400" width="600" height="70"/><path d="M820 820 V680 Q900 610 980 680 V820Z" fill="#d8c9a8"/>
    <rect x="1450" y="300" width="22" height="520"/>
    ${[...Array(12)].map((_, i) => { const x = 140 + i * 130 + (i % 3) * 18, y = 760 + (i % 2) * 20; return `<circle cx="${x}" cy="${y}" r="22"/><path d="M${x - 40} 900 Q${x - 38} ${y + 30} ${x} ${y + 26} Q${x + 38} ${y + 30} ${x + 40} 900Z"/>`; }).join("")}</g>
    <g class="walker" fill="#1d1812"><circle cx="0" cy="-150" r="24"/><path d="M-38 0 Q-34 -112 0 -116 Q34 -112 38 0Z"/><rect x="-160" y="-150" width="330" height="18" transform="rotate(-8)"/></g></svg>`);
  const walker = scene.querySelector(".walker"), pole = scene.querySelectorAll("rect")[5];
  const card = el(film, "abs", "inset:0;background:#0B0A08;display:flex;align-items:center;justify-content:center;");
  svgBox(card, "left:260px;top:170px;width:1400px;height:740px;", `<svg width="1400" height="740" fill="none" stroke="#E9E1CF"><rect x="10" y="10" width="1380" height="720" stroke-width="4"/><rect x="30" y="30" width="1340" height="680" stroke-width="1.5"/>
    ${[[30, 30, 1, 1], [1370, 30, -1, 1], [30, 710, 1, -1], [1370, 710, -1, -1]].map(([x, y, a, b]) => `<path d="M${x} ${y + b * 90} Q${x + a * 10} ${y + b * 10} ${x + a * 90} ${y} M${x + a * 24} ${y + b * 24} m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" stroke-width="2.5"/>`).join("")}</svg>`);
  const ct = el(card, "abs", `left:0;width:1920px;top:430px;text-align:center;${SONG}font-size:96px;font-weight:700;color:#E9E1CF;letter-spacing:14px;line-height:1.35;`);
  const iris = el(s, "abs", "inset:0;pointer-events:none;");
  const vig = el(s, "abs", "inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,0.65) 100%);pointer-events:none;");
  const dust = [...Array(10)].map(() => el(s, "abs", "width:5px;height:5px;border-radius:50%;background:#f2ead8;pointer-events:none;"));
  const scr = [0, 1].map(() => el(s, "abs", "top:0;width:2px;height:1080px;background:rgba(240,230,210,0.35);pointer-events:none;"));
  const CARDS = [[h + 1.3, B.ten, "国都南门<br>立三丈之木"], [B.ten, B.nobody, "赏金：十金"], [B.nobody, B.fifty, "——无人敢动。"], [B.fifty, B.fifty + 1.3, "赏金加至<br>五十金！"]];
  return (t) => {
    const q = Math.floor(t * 18), fl = 0.9 + 0.1 * hs(q);
    css(film, { transform: `translate(${((hs(q + 1) - 0.5) * 4).toFixed(1)}px,${((hs(q + 2) - 0.5) * 6).toFixed(1)}px)`, filter: `brightness(${fl.toFixed(3)}) sepia(0.35)` });
    const c = CARDS.find(([a, b]) => t >= a && t < b);
    css(card, { opacity: c ? "1" : "0" }); if (c && ct.innerHTML !== c[2]) ct.innerHTML = c[2];
    if (c) css(ct, { top: c[2].includes("<br>") ? "380px" : "470px" });
    const wk = clamp((t - B.fifty - 1.3) / 1.6); walker.setAttribute("transform", `translate(${lerp(1460, 1760, wk).toFixed(0)} 820)`); css(walker, { opacity: String(t >= B.fifty + 1.3 ? 1 : 0) }); css(pole, { opacity: String(t >= B.fifty + 1.3 ? 0 : 1) });
    const r = t < h + 0.6 ? lerp(0, 1300, eOutCubic(clamp((t - h) / 0.6))) : t > z - 0.6 ? lerp(1300, 0, eInCubic(clamp((t - z + 0.6) / 0.55))) : 1400;
    css(iris, { background: `radial-gradient(circle at 960px 540px, transparent ${r.toFixed(0)}px, #000 ${(r + 4).toFixed(0)}px)` });
    dust.forEach((d, i) => css(d, { left: `${(hs(q * 3 + i) * 1920).toFixed(0)}px`, top: `${(hs(q * 5 + i) * 1080).toFixed(0)}px`, opacity: String(hs(q + i * 7) > 0.6 ? 0.8 : 0) }));
    scr.forEach((d, i) => css(d, { left: `${(hs(Math.floor(t * 6) + i * 9) * 1920).toFixed(0)}px`, opacity: String(hs(Math.floor(t * 6) + i) > 0.5 ? 1 : 0) }));
    css(vig, { opacity: "1" });
  };
}

// ── 2 构成主义蒙太奇：米色纸、红黑斜线构图、半调剪影人群、标语大字沿斜线撞进来、喇叭放射线。讲法：标语对撞 ──
function constructivist(s, h, z, B) {
  el(s, "abs", "inset:0;background:#EFE6D2;");
  const RED = "#D7261E", K = "#151311";
  const circ = el(s, "abs", `left:1180px;top:120px;width:640px;height:640px;border-radius:50%;background:${K};`);
  const rays = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080">${[...Array(9)].map((_, i) => { const a = -0.9 + i * 0.11, L = 1500; return `<path d="M1500 440 L${(1500 + Math.cos(a + Math.PI) * L).toFixed(0)} ${(440 + Math.sin(a + Math.PI) * L).toFixed(0)} L${(1500 + Math.cos(a + Math.PI + 0.04) * L).toFixed(0)} ${(440 + Math.sin(a + Math.PI + 0.04) * L).toFixed(0)}Z" fill="${RED}"/>`; }).join("")}</svg>`);
  const band = el(s, "abs", `left:-200px;top:330px;width:2400px;height:190px;background:${RED};transform-origin:50% 50%;`);
  const beam = el(s, "abs", `left:1380px;top:90px;width:46px;height:820px;background:${K};transform:rotate(20deg);transform-origin:50% 100%;`);
  const crowd = svgBox(s, "left:0;top:720px;width:1920px;height:360px;", `<svg width="1920" height="360"><defs><pattern id="ht2" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="3.4" fill="${K}"/></pattern></defs>${[...Array(15)].map((_, i) => { const x = 60 + i * 128, y = 70 + (i % 3) * 26; return `<circle cx="${x}" cy="${y}" r="38" fill="url(#ht2)"/><path d="M${x - 70} 360 Q${x - 66} ${y + 50} ${x} ${y + 44} Q${x + 66} ${y + 50} ${x + 70} 360Z" fill="url(#ht2)"/>`; }).join("")}</svg>`);
  const word = (txt, x, y, size, c, rot, extra = "") => el(s, "abs", `left:${x}px;top:${y}px;${SANS}font-size:${size}px;font-weight:900;color:${c};white-space:nowrap;line-height:1;transform:rotate(${rot}deg);transform-origin:0 50%;${extra}`, txt);
  const w1 = word("一根木头", 150, 130, 170, K, -12), w2 = word("南门 → 北门", 210, 560, 70, K, -12);
  const n10 = word("10", 120, 120, 420, RED, -12, "letter-spacing:-20px;"), k10 = word("金", 600, 360, 200, K, -12);
  const nob = word("没人动", 980, 900, 150, "#EFE6D2", -90, `letter-spacing:10px;background:${K};padding:10px 30px;`);
  const x5 = word("×5", 800, 160, 220, K, -12), n50 = word("50", 120, 120, 460, RED, -12, "letter-spacing:-24px;");
  const sl = (n, t, a, from, base, d = 0.22) => { const k = eOutQuint(clamp((t - a) / d)); css(n, { opacity: String(t >= a ? 1 : 0), transform: `translate(${((1 - k) * from[0]).toFixed(0)}px,${((1 - k) * from[1]).toFixed(0)}px) ${base}` }); };
  return (t) => {
    const F = t >= B.fifty;
    css(circ, { transform: `scale(${pop(t, h, 0.4).toFixed(3)})` });
    sl(band, t, h + 0.05, [-2600, 0], "rotate(-12deg)", 0.28);
    sl(beam, t, h + 0.4, [300, -900], "rotate(20deg)", 0.25);
    css(crowd, { transform: `translateY(${((1 - eOutCubic(clamp((t - h - 0.5) / 0.4))) * 360).toFixed(0)}px)` });
    sl(w1, t, h + 0.3, [-900, 190], "rotate(-12deg)"); sl(w2, t, h + 0.9, [-900, 190], "rotate(-12deg)");
    if (t >= B.ten) { css(w1, { opacity: "0" }); css(w2, { opacity: "0" }); }
    css(rays, { opacity: String(t >= B.ten ? 1 : 0), transform: `scale(${lerp(0.6, 1, eOutCubic(clamp((t - B.ten) / 0.3))).toFixed(3)})`, transformOrigin: "1500px 440px" });
    sl(n10, t, B.ten, [-700, 150], "rotate(-12deg)"); sl(k10, t, B.ten + 0.1, [0, -500], "rotate(-12deg)"); if (F) css(n10, { opacity: "0" });
    sl(nob, t, B.nobody, [0, 600], "rotate(-90deg)", 0.18); if (F) css(nob, { opacity: "0" });
    sl(x5, t, B.fifty + 0.15, [700, -300], "rotate(-12deg)"); sl(n50, t, B.fifty, [-900, 200], "rotate(-12deg)", 0.18);
    css(band, { background: F ? K : RED }); css(circ, { background: F ? RED : K });
  };
}

// ── 3 RPG 对话框：上方像素场景，下方深蓝对话框逐字打出，▼ 闪；选项菜单里大家都停在「观望」；五十金光标跳到「搬」，主角去扛木头，「获得 50 金！」。讲法：对话 + 选项 ──
function rpg(s, h, z, B) {
  el(s, "abs", "inset:0;background:#0A0C1C;");
  const cv = document.createElement("canvas"); cv.width = 240; cv.height = 90; cv.style.cssText = "position:absolute;left:0;top:0;width:1920px;height:720px;image-rendering:pixelated;"; s.appendChild(cv); const g = cv.getContext("2d");
  const P = (x, y, w, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, hh); };
  const box = (x, y, w, hh) => el(s, "abs", `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;background:#141A46;border:6px solid #F4F4F4;border-radius:14px;box-shadow:0 0 0 6px #141A46,inset 0 0 0 4px #2C3680;box-sizing:border-box;`);
  const dlg = box(70, 740, 1780, 300);
  const tag = el(s, "abs cn", "left:110px;top:706px;padding:4px 24px;background:#141A46;border:5px solid #F4F4F4;border-radius:10px;font-size:34px;font-weight:800;color:#FFD84A;", "告示");
  const txt = el(dlg, "abs cn", "left:44px;top:34px;right:44px;font-size:56px;font-weight:700;color:#F4F4F4;line-height:1.55;letter-spacing:2px;");
  const arrow = el(dlg, "abs", "right:40px;bottom:24px;width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:20px solid #F4F4F4;");
  const menu = box(1420, 380, 380, 300);
  const items = ["搬", "观望"].map((w, i) => el(menu, "abs cn", `left:90px;top:${50 + i * 110}px;font-size:60px;font-weight:800;color:#F4F4F4;`, w));
  const cur = el(menu, "abs", "left:36px;width:0;height:0;border-top:18px solid transparent;border-bottom:18px solid transparent;border-left:26px solid #FFD84A;");
  const get = el(s, "abs cn", "left:610px;top:250px;width:700px;padding:26px 0;text-align:center;background:#141A46;border:6px solid #FFD84A;border-radius:16px;font-size:72px;font-weight:900;color:#FFD84A;box-shadow:0 0 0 6px #141A46;", "获得 50 金！");
  const LINES = [[h + 0.15, "国都南门，立了一根木头。"], [B.ten, "能把它搬到北门的，赏 10 金！"], [B.nobody, "……村民们面面相觑。"], [B.fifty, "赏金提升到 50 金！"]];
  return (t) => {
    const F = t >= B.fifty;
    g.clearRect(0, 0, 240, 90);
    ["#24306E", "#2E3C86", "#3C4C9C", "#5464AE", "#7A78B8", "#B68CB0"].forEach((c, i) => P(0, i * 9, 240, 9, c));
    for (let i = 0; i < 14; i++) P((i * 37) % 240, (i * 11) % 36, 1, 1, "#F4F4F4");
    P(0, 66, 240, 24, "#3D6B3A"); for (let x = 0; x < 240; x += 8) P(x, 66, 4, 2, "#5A8F4E");
    P(40, 34, 100, 32, "#7A4A32"); P(40, 34, 100, 3, "#4A2A1A"); P(70, 22, 40, 12, "#9A3A28"); P(64, 20, 52, 3, "#4A2A1A"); P(82, 48, 16, 18, "#E8C88A");
    const lx = F && t > B.fifty + 1.0 ? lerp(160, 200, clamp((t - B.fifty - 1.0) / 1.2)) : 160;
    if (F && t > B.fifty + 1.0) P(lx - 12, 50, 26, 3, "#8A5A30"); else P(160, 30, 3, 36, "#8A5A30");
    const R = rng(4); for (let i = 0; i < 6; i++) { const x = 120 + i * 14 + Math.floor(R() * 4); P(x, 58, 6, 8, "#C8603A"); P(x + 1, 54, 4, 4, "#F0C8A0"); }
    const hx = F ? (t < B.fifty + 1.0 ? lerp(212, 162, clamp((t - B.fifty - 0.4) / 0.6)) : lx - 2) : 212;
    P(hx, 56, 6, 10, "#2A6CF0"); P(hx + 1, 51, 4, 5, "#F0C8A0"); P(hx, 50, 6, 2, "#3A2418");
    const L = [...LINES].reverse().find(([a]) => t >= a);
    txt.textContent = L ? typed(L[1], t, L[0], 22) : "";
    css(arrow, { opacity: String(L && t - L[0] > L[1].length / 22 && Math.floor(t * 3) % 2 ? 1 : 0) });
    css(tag, { opacity: String(t >= h + 0.1 ? 1 : 0) }); tag.textContent = t >= B.nobody && t < B.fifty ? "村民" : "告示";
    css(menu, { opacity: String(t >= B.ten + 0.35 && t < B.fifty + 1.0 ? 1 : 0) });
    const sel = t >= B.nobody && !F ? 1 : 0; css(cur, { top: `${62 + sel * 110}px`, opacity: String(F && Math.floor(t * 6) % 2 ? 0.3 : 1) });
    items.forEach((n, i) => css(n, { color: i === sel ? "#FFD84A" : "#F4F4F4" }));
    const pg = pop(t, B.fifty + 1.05, 0.3); css(get, { opacity: String(pg > 0 ? 1 : 0), transform: `scale(${pg.toFixed(3)})` });
  };
}

// ── 4 卡牌对战：绿绒桌面，卡牌翻面打出；「赏金 10」攻击「怀疑」卡被弹开（MISS）；打出「×5」增益后变「赏金 50」，击碎怀疑翻出「信」。讲法：数值对撞 ──
function cards(s, h, z, B) {
  el(s, "abs", "inset:0;background:radial-gradient(ellipse at 50% 45%,#1E5A45 0,#0F3B2E 55%,#082219 100%);");
  el(s, "abs", "left:160px;top:120px;width:1600px;height:840px;border:3px dashed rgba(255,255,255,0.12);border-radius:40px;");
  const card = (x, y, title, art, foot, col) => {
    const w = el(s, "abs", `left:${x}px;top:${y}px;width:320px;height:450px;perspective:1400px;`);
    const inner = el(w, "abs", "inset:0;transform-style:preserve-3d;");
    const face = el(inner, "abs", `inset:0;border-radius:22px;background:linear-gradient(160deg,#FDF7E8,#EADCB8);border:8px solid ${col};box-sizing:border-box;backface-visibility:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.45);`);
    el(face, "abs cn", `left:0;right:0;top:18px;text-align:center;font-size:40px;font-weight:900;color:#2A2016;`, title);
    const a = el(face, "abs", "left:30px;right:30px;top:84px;height:200px;border-radius:12px;background:#2A2016;display:flex;align-items:center;justify-content:center;"); a.innerHTML = art;
    const ft = el(face, "abs cn", "left:20px;right:20px;bottom:24px;text-align:center;font-size:30px;font-weight:800;color:#2A2016;line-height:1.3;", foot);
    const back = el(inner, "abs", `inset:0;border-radius:22px;background:repeating-linear-gradient(45deg,#7A1E1E 0 16px,#5A1414 16px 32px);border:8px solid #E9C46A;box-sizing:border-box;backface-visibility:hidden;transform:rotateY(180deg);`);
    return { w, inner, face, ft, a, back };
  };
  const LOG = `<svg width="200" height="160"><rect x="40" y="70" width="140" height="34" rx="16" fill="#C27A3E" transform="rotate(-20 110 87)"/><ellipse cx="46" cy="110" rx="14" ry="18" fill="#EDB97F"/></svg>`;
  const GOLD = `<svg width="200" height="160"><path d="M50 120 L70 70 L130 70 L150 120Z" fill="#E9C46A"/><path d="M70 70 L80 50 L120 50 L130 70Z" fill="#F7DD8A"/></svg>`;
  const DOUBT = `<div style="font-family:Geist;font-size:150px;font-weight:900;color:#9AA4B8;line-height:1">?</div>`;
  const C1 = card(220, 300, "木头", LOG, "三丈 · 搬到北门", "#8A5A30");
  const C2 = card(800, 560, "赏金", GOLD, "ATK 10", "#E9C46A");
  const C3 = card(1380, 300, "怀疑", DOUBT, "DEF ？？", "#5A6478");
  const C4 = card(800, 560, "× 5", `<div style="font-family:Geist;font-size:120px;font-weight:900;color:#F7DD8A">×5</div>`, "增益 · 赏金翻五倍", "#C8352B");
  const miss = el(s, "abs", `left:1430px;top:220px;${SANS}font-size:110px;font-weight:900;color:#FF5A4E;transform:rotate(-10deg);text-shadow:0 6px 0 #2A0A08;`, "MISS");
  const nob = el(s, "abs cn", "left:1340px;top:780px;font-size:56px;font-weight:900;color:#FFFFFF;", "没人动");
  const beam = el(s, "abs", "height:10px;background:linear-gradient(90deg,rgba(255,220,120,0),#FFE08A);border-radius:6px;transform-origin:0 50%;");
  const flip = (c, t, a, from = 180) => { const k = eOutCubic(clamp((t - a) / 0.4)); css(c.w, { opacity: String(t >= a ? 1 : 0) }); css(c.inner, { transform: `rotateY(${lerp(from, 0, k).toFixed(1)}deg)` }); };
  return (t) => {
    const F = t >= B.fifty;
    flip(C1, t, h + 0.15); flip(C3, t, h + 0.6);
    const k2 = eOutCubic(clamp((t - B.ten + 0.1) / 0.3)); css(C2.w, { opacity: String(t >= B.ten - 0.1 ? 1 : 0), transform: `translateY(${((1 - k2) * 500).toFixed(0)}px) translate(0,${(-180 * k2).toFixed(0)}px)` });
    C2.ft.textContent = `ATK ${val(t, B)}`; css(C2.face, { boxShadow: F ? `0 0 ${(40 + 30 * Math.sin(t * 8)).toFixed(0)}px #FFD84A` : "0 20px 40px rgba(0,0,0,0.45)" });
    const atk = (a) => { const k = clamp((t - a) / 0.25); return k > 0 && k < 1 ? k : 0; };
    const k1 = atk(B.ten + 0.35), k5 = atk(B.fifty + 0.5), kk = k1 || k5;
    css(beam, { left: "1120px", top: "600px", width: `${(kk * 300).toFixed(0)}px`, transform: "rotate(-40deg)", opacity: String(kk ? 1 : 0) });
    const shake = t >= B.nobody - 0.15 && t < B.nobody + 0.3 ? Math.sin(t * 90) * 12 : 0;
    css(C3.w, { transform: `translateX(${shake.toFixed(1)}px)` });
    css(miss, { opacity: String(t >= B.nobody - 0.1 && !F ? 1 : 0), transform: `rotate(-10deg) scale(${pop(t, B.nobody - 0.1, 0.25).toFixed(3)})` }); css(nob, { opacity: String(t >= B.nobody && !F ? 1 : 0) });
    const k4 = clamp((t - B.fifty + 0.05) / 0.3); css(C4.w, { opacity: String(t >= B.fifty - 0.05 && t < B.fifty + 0.45 ? 1 : 0), transform: `translate(0,${(lerp(-500, -180, eOutCubic(k4))).toFixed(0)}px) rotate(${lerp(-30, 0, eOutCubic(k4)).toFixed(1)}deg)` });
    if (t >= B.fifty + 0.7) { const kf = eOutCubic(clamp((t - B.fifty - 0.7) / 0.4)); css(C3.inner, { transform: `rotateY(${(kf * 180).toFixed(1)}deg)` }); }
    if (!C3.back.dataset.set) { C3.back.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${SONG}font-size:200px;font-weight:900;color:#F7DD8A">信</div>`; C3.back.dataset.set = 1; }
  };
}

// ── 5 发布会极简：纯黑、一屏一件事、超大白字；数字在说出来的那一刻落定，五十金带渐变和光晕。讲法：一屏一句、数字落定 ──
function keynote(s, h, z, B) {
  el(s, "abs", "inset:0;background:#000;");
  const glow = el(s, "abs", "left:460px;top:140px;width:1000px;height:800px;border-radius:50%;background:radial-gradient(circle,rgba(70,120,255,0.22),rgba(0,0,0,0) 65%);");
  const stage = el(s, "abs", "inset:0;");
  const KS = `${SANS}font-weight:700;color:#F5F5F7;white-space:nowrap;letter-spacing:-0.02em;`;
  const ctr = (html, y, size, extra = "") => el(stage, "abs", `left:0;width:1920px;top:${y}px;text-align:center;${KS}font-size:${size}px;${extra}`, html);
  const s1 = ctr("一根木头。", 380, 150), s1b = ctr("从南门，到北门。", 590, 60, "color:#86868B;font-weight:600;");
  const lab = ctr("赏金", 250, 40, "color:#86868B;font-weight:600;letter-spacing:6px;");
  const num = ctr("", 330, 420, "font-weight:800;line-height:1;");
  const s3 = ctr("没人动。", 400, 170);
  const x5 = ctr("× 5", 800, 56, "color:#86868B;font-weight:600;");
  const grad = "background:linear-gradient(100deg,#FFE7A3 0%,#F2A54A 50%,#E8603C 100%);-webkit-background-clip:text;background-clip:text;color:transparent;";
  const show = (n, t, a, b, rise = 24) => { const k = eOutQuint(clamp((t - a) / 0.45)), o = clamp((t - b) / 0.15); css(n, { opacity: String(t >= a && t < b + 0.15 ? k * (1 - o) : 0), filter: `blur(${((1 - k) * 12 + o * 8).toFixed(1)}px)`, transform: `translateY(${((1 - k) * rise).toFixed(1)}px)` }); };
  return (t) => {
    const F = t >= B.fifty;
    css(stage, { transform: `scale(${(1 + 0.04 * clamp((t - h) / (z - h))).toFixed(4)})` });
    css(glow, { opacity: String(F ? 1 : 0.5) });
    show(s1, t, h + 0.1, B.ten - 0.15); show(s1b, t, h + 0.7, B.ten - 0.15);
    show(lab, t, B.ten, B.nobody - 0.1); show(num, t, B.ten, B.nobody - 0.1, 40);
    show(s3, t, B.nobody, B.fifty - 0.1);
    if (F) { show(lab, t, B.fifty, 99); show(num, t, B.fifty, 99, 60); show(x5, t, B.fifty + 0.5, 99); } else css(x5, { opacity: "0" });
    num.innerHTML = F ? `<span style="${grad}">50</span><span style="font-size:140px;color:#86868B;margin-left:20px">金</span>` : `10<span style="font-size:140px;color:#86868B;margin-left:20px">金</span>`;
  };
}

// ── 6 极光：深海军蓝底上紫青粉光斑缓慢流动，毛玻璃卡片一层层浮上来，数值卡在五十金时描边发光。讲法：玻璃卡片层叠 ──
function aurora(s, h, z, B) {
  el(s, "abs", "inset:0;background:#070B1E;");
  const blobs = [["#7B5CFF", 900, 760, 300, 120], ["#2EE6D6", 820, 640, 1100, 420], ["#FF5EAE", 700, 600, 600, 520], ["#3A7BFF", 760, 700, 1300, 40]].map(([c, w, hh, x, y]) => ({ n: el(s, "abs", `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;border-radius:50%;background:radial-gradient(circle,${c} 0,rgba(0,0,0,0) 68%);filter:blur(60px);opacity:0.75;`), x, y }));
  const glass = (x, y, w, hh) => el(s, "abs", `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;border-radius:30px;background:rgba(255,255,255,0.09);border:1.5px solid rgba(255,255,255,0.22);backdrop-filter:blur(26px) saturate(1.4);-webkit-backdrop-filter:blur(26px) saturate(1.4);box-shadow:0 30px 60px rgba(0,0,0,0.35);box-sizing:border-box;`);
  const lab = (p, txt, y) => el(p, "abs", `left:44px;top:${y}px;${SANS}font-size:26px;font-weight:600;letter-spacing:4px;color:rgba(255,255,255,0.65);`, txt);
  const g1 = glass(160, 180, 760, 300); lab(g1, "立木为信", 40); el(g1, "abs cn", "left:44px;top:96px;font-size:84px;font-weight:800;color:#fff;", "一根木头"); el(g1, "abs cn", "left:48px;top:206px;font-size:38px;color:rgba(255,255,255,0.8);", "南门 → 北门");
  const g2 = glass(1000, 180, 760, 420); lab(g2, "赏金", 40); const v2 = el(g2, "abs", `left:40px;top:90px;${SANS}font-size:260px;font-weight:800;color:#fff;line-height:1;letter-spacing:-8px;`); el(g2, "abs cn", "left:520px;top:250px;font-size:90px;font-weight:800;color:rgba(255,255,255,0.85);", "金");
  const g3 = glass(160, 540, 760, 200); lab(g3, "响应人数", 40); const dot = el(g3, "abs", "left:48px;top:112px;width:30px;height:30px;border-radius:50%;background:#FF5A6A;"); el(g3, "abs cn", "left:100px;top:90px;font-size:70px;font-weight:800;color:#fff;", "0 · 没人动");
  const g4 = glass(1000, 660, 760, 200); lab(g4, "变化", 40); el(g4, "abs", `left:44px;top:88px;${SANS}font-size:76px;font-weight:800;color:#fff;`, "× 5");
  const rise = (n, t, a) => { const k = eOutQuint(clamp((t - a) / 0.5)); css(n, { opacity: String(k), transform: `translateY(${((1 - k) * 60 + Math.sin(t * 1.4 + a) * 6).toFixed(1)}px)` }); };
  return (t) => {
    const F = t >= B.fifty;
    blobs.forEach((b, i) => css(b.n, { transform: `translate(${(Math.sin(t * 0.5 + i * 1.7) * 120).toFixed(0)}px,${(Math.cos(t * 0.4 + i) * 80).toFixed(0)}px) scale(${(1 + 0.15 * Math.sin(t * 0.6 + i)).toFixed(3)})` }));
    rise(g1, t, h + 0.15); rise(g2, t, B.ten - 0.1); rise(g3, t, B.nobody); rise(g4, t, B.fifty + 0.3);
    v2.textContent = String(val(t, B));
    css(g2, { borderColor: F ? `rgba(255,${(200 + 40 * Math.sin(t * 6)).toFixed(0)},140,0.9)` : "rgba(255,255,255,0.22)", boxShadow: F ? "0 0 60px rgba(255,190,120,0.45),0 30px 60px rgba(0,0,0,0.35)" : "0 30px 60px rgba(0,0,0,0.35)" });
    css(dot, { transform: `scale(${(1 + 0.3 * Math.sin(t * 8)).toFixed(3)})` });
  };
}

// ── 7 杂志编辑：暖白纸、刊头细线、衬线大标题、两栏正文逐行排出、引语换成史记原文、斜体大数字。讲法：版面边排边成形 ──
function editorial(s, h, z, B) {
  el(s, "abs", "inset:0;background:#F6F1E7;");
  const INK = "#1E1B17", RED = "#B3261E";
  const rule = (x, y, w, th = 2) => el(s, "abs", `left:${x}px;top:${y}px;width:${w}px;height:${th}px;background:${INK};transform-origin:0 0;`);
  const R1 = rule(120, 120, 1680, 3), R2 = rule(120, 132, 1680, 1), R3 = rule(120, 960, 1680, 1);
  const mast = el(s, "abs", `left:120px;top:70px;${SANS}font-size:24px;font-weight:700;letter-spacing:8px;color:${INK};`, "VIBE 知识 · 历史栏目");
  const pg = el(s, "abs", `right:120px;top:70px;${SONG}font-size:24px;color:${INK};`, "第 01 期 · 第 68 页");
  const head = el(s, "abs", `left:120px;top:170px;${SONG}font-size:200px;font-weight:900;color:${INK};letter-spacing:6px;line-height:1.05;white-space:nowrap;`, "立木为信");
  const dek = el(s, "abs", `left:126px;top:400px;${SONG}font-size:40px;color:#5A534A;font-style:italic;`, "一根木头，从南门搬到北门。");
  const BODY = ["令既具，未布，恐民之不信，", "已乃立三丈之木于国都市南门，", "募民有能徙置北门者予十金。", "民怪之，莫敢徙。", "复曰「能徙者予五十金」。", "有一人徙之，辄予五十金，", "以明不欺。卒下令。"];
  const lines = BODY.map((l, i) => el(s, "abs", `left:${120 + (i < 4 ? 0 : 520)}px;top:${520 + (i % 4) * 58}px;${SONG}font-size:32px;color:#3A342C;white-space:nowrap;`, l));
  el(s, "abs", `left:120px;top:770px;${SONG}font-size:22px;color:#8A8174;`, "——《史记·商君列传》");
  const box = el(s, "abs", "left:1120px;top:170px;width:680px;height:760px;background:#ECE4D4;");
  const big = el(box, "abs", `left:0;width:680px;top:120px;text-align:center;${SONG}font-size:400px;font-weight:900;font-style:italic;color:${RED};line-height:1;`);
  const unit = el(box, "abs", `left:0;width:680px;top:560px;text-align:center;${SONG}font-size:56px;color:${INK};letter-spacing:20px;`, "金");
  const quote = el(s, "abs", `left:1190px;top:270px;width:580px;${SONG}font-size:64px;font-weight:700;color:${INK};line-height:1.35;`);
  const qm = el(s, "abs", `left:1150px;top:250px;width:10px;height:200px;background:${RED};`);
  return (t) => {
    const F = t >= B.fifty;
    for (const [r, a] of [[R1, h], [R2, h + 0.05], [R3, h + 0.2]]) css(r, { transform: `scaleX(${eOutCubic(clamp((t - a) / 0.5)).toFixed(3)})` });
    css(mast, { opacity: String(clamp((t - h - 0.2) / 0.3)) }); css(pg, { opacity: String(clamp((t - h - 0.3) / 0.3)) });
    const kh = eOutQuint(clamp((t - h - 0.15) / 0.5)); css(head, { opacity: String(kh), clipPath: `inset(0 0 ${((1 - kh) * 100).toFixed(0)}% 0)` });
    css(dek, { opacity: String(clamp((t - h - 0.7) / 0.3)) });
    lines.forEach((n, i) => css(n, { opacity: String(clamp((t - h - 0.9 - i * 0.12) / 0.2)) }));
    css(box, { opacity: String(clamp((t - h - 0.4) / 0.3)) });
    big.textContent = t >= B.ten ? String(F ? 50 : 10) : ""; css(big, { opacity: String(t >= B.ten && (t < B.nobody || F) ? 1 : 0), transform: `translateY(${F ? ((1 - eOutCubic(clamp((t - B.fifty) / 0.3))) * -60).toFixed(0) : 0}px)` });
    css(unit, { opacity: String(t >= B.ten && (t < B.nobody || F) ? 1 : 0) });
    const qOn = t >= B.nobody && !F; quote.textContent = "民怪之，莫敢徙。"; css(quote, { opacity: String(qOn ? 1 : 0) }); css(qm, { opacity: String(qOn ? 1 : 0) });
    lines.forEach((n, i) => css(n, { color: (i === 3 && qOn) || (i === 4 && F) ? RED : "#3A342C", fontWeight: (i === 3 && qOn) || (i === 4 && F) ? "700" : "400" }));
  };
}

// ── 8 蒸汽波：落日渐变天空、条纹太阳、滚动的霓虹网格地面、铬金属字；「没人动」VHS 跟踪错位；左上 PLAY、右下计时。讲法：录像带 ──
function vapor(s, h, z, B) {
  el(s, "abs", "inset:0;background:linear-gradient(180deg,#1A0B3D 0%,#5B1F7A 35%,#FF6AD5 62%,#FFB86B 70%,#2A0E4A 70.2%,#12062A 100%);");
  const sun = el(s, "abs", "left:1050px;top:150px;width:560px;height:560px;border-radius:50%;background:linear-gradient(180deg,#FFF27A 0%,#FF9A5A 50%,#FF4FB8 100%);-webkit-mask-image:linear-gradient(180deg,#000 0 52%,transparent 52% 56%,#000 56% 64%,transparent 64% 69%,#000 69% 76%,transparent 76% 82%,#000 82% 87%,transparent 87% 93%,#000 93%);mask-image:linear-gradient(180deg,#000 0 52%,transparent 52% 56%,#000 56% 64%,transparent 64% 69%,#000 69% 76%,transparent 76% 82%,#000 82% 87%,transparent 87% 93%,#000 93%);");
  el(s, "abs", "left:0;top:752px;width:1920px;height:4px;background:#FF4FD8;box-shadow:0 0 20px #FF4FD8;");
  const cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080; cv.style.cssText = "position:absolute;left:0;top:0;"; s.appendChild(cv); const g = cv.getContext("2d");
  svgBox(s, "left:180px;top:420px;width:400px;height:340px;", `<svg width="400" height="340" fill="#12062A"><path d="M200 340 L196 120 Q150 60 60 90 Q140 70 190 110 Q120 20 40 30 Q140 10 200 100 Q230 10 340 20 Q250 40 212 104 Q290 60 370 100 Q280 80 210 124 L206 340Z"/></svg>`);
  const chrome = "background:linear-gradient(180deg,#FFFFFF 0%,#BDE9FF 42%,#3B1D6E 50%,#FF9EE6 72%,#FFE3F6 100%);-webkit-background-clip:text;background-clip:text;color:transparent;";
  const cw = (txt, x, y, size) => { const w = el(s, "abs", `left:${x}px;top:${y}px;`); el(w, "abs", `left:6px;top:8px;${SANS}font-size:${size}px;font-weight:900;font-style:italic;color:#2A0E4A;white-space:nowrap;letter-spacing:4px;`, txt); el(w, "", `position:relative;${SANS}font-size:${size}px;font-weight:900;font-style:italic;white-space:nowrap;letter-spacing:4px;${chrome}`, txt); return w; };
  const w1 = cw("一根木头", 160, 160, 150), w2 = cw("南门 → 北门", 180, 360, 80), w10 = cw("10 金", 160, 170, 260), w50 = cw("50 金", 160, 170, 300);
  const nob = el(s, "abs cn", "left:200px;top:540px;font-size:120px;font-weight:900;color:#FF6AD5;text-shadow:4px 0 #2EE6FF,-4px 0 #FFF27A,0 6px 0 #2A0E4A;white-space:nowrap;", "没人动");
  const play = el(s, "abs mono", "left:70px;top:50px;font-size:40px;font-weight:700;color:#fff;text-shadow:3px 3px 0 #2A0E4A;letter-spacing:4px;", "PLAY ▶");
  const clock = el(s, "abs mono", "right:70px;bottom:60px;font-size:36px;font-weight:700;color:#fff;text-shadow:3px 3px 0 #2A0E4A;letter-spacing:3px;");
  const track = el(s, "abs", "left:0;width:1920px;height:70px;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.35),rgba(255,255,255,0));mix-blend-mode:screen;");
  el(s, "abs", "inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,0.16) 0 2px,transparent 2px 4px);pointer-events:none;");
  const stars = [...Array(5)].map((_, i) => el(s, "abs", `left:${300 + i * 150}px;top:${120 + (i % 2) * 360}px;width:60px;height:60px;background:#FFFFFF;clip-path:polygon(50% 0,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0 50%,42% 42%);`));
  const show = (n, t, a, b) => { const k = eOutBack(clamp((t - a) / 0.3)); css(n, { opacity: String(t >= a && t < b ? 1 : 0), transform: `scale(${k.toFixed(3)}) skewX(-6deg)` }); };
  return (t) => {
    const F = t >= B.fifty;
    g.clearRect(0, 0, 1920, 1080); g.strokeStyle = "#FF4FD8"; g.lineWidth = 2; g.shadowColor = "#FF4FD8"; g.shadowBlur = 8; g.beginPath();
    const off = ((t - h) * 0.9) % 1;
    for (let i = 0; i < 14; i++) { const p = (i + off) / 14, y = 756 + Math.pow(p, 2.2) * 324; g.moveTo(0, y); g.lineTo(1920, y); }
    for (let i = -16; i <= 16; i++) { g.moveTo(960 + i * 30, 756); g.lineTo(960 + i * 260, 1080); } g.stroke();
    css(sun, { transform: `translateY(${((1 - eOutCubic(clamp((t - h) / 0.8))) * 120).toFixed(0)}px)` });
    show(w1, t, h + 0.2, B.ten); show(w2, t, h + 0.85, B.ten); show(w10, t, B.ten, B.fifty); show(w50, t, B.fifty, 99);
    const gk = t >= B.nobody && t < B.nobody + 0.4, q = Math.floor(t * 20);
    css(nob, { opacity: String(t >= B.nobody && !F ? 1 : 0), transform: `translateX(${gk ? ((hs(q) - 0.5) * 50).toFixed(0) : 0}px)` });
    css(track, { top: `${gk ? (hs(q + 3) * 1000).toFixed(0) : -200}px` });
    css(play, { opacity: String(Math.floor(t * 2) % 2 ? 1 : 0.5) });
    const sec = Math.max(0, t - h); clock.textContent = `SP 0:00:${String(Math.floor(sec)).padStart(2, "0")}`;
    stars.forEach((n, i) => { const k = clamp((t - B.fifty - 0.2 - i * 0.08) / 0.5); css(n, { opacity: String(k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0), transform: `scale(${(0.4 + Math.sin(k * Math.PI)).toFixed(3)}) rotate(${(k * 90).toFixed(0)}deg)` }); });
  };
}

const STY = [
  { name: "默片字卡", en: "SILENT FILM", fit: "老历史 · 电影史 · 百年前的故事", th: { bg: 0x0B0A08, ink: "#E9E1CF", dim: "#8A8270", accent: "#C9B98F" }, make: silent },
  { name: "构成主义蒙太奇", en: "CONSTRUCTIVIST", fit: "运动 · 革命 · 宣言式观点", th: { bg: 0xEFE6D2, ink: "#151311", dim: "#6B6257", accent: "#D7261E", light: true }, make: constructivist },
  { name: "RPG 对话框", en: "RPG DIALOGUE", fit: "两难选择 · 剧情推演 · 游戏化讲解", th: { bg: 0x0A0C1C, ink: "#F4F4F4", dim: "#8A90C0", accent: "#FFD84A" }, make: rpg },
  { name: "卡牌对战", en: "CARD BATTLE", fit: "博弈 · 策略 · 力量对比", th: { bg: 0x0F3B2E, ink: "#FDF7E8", dim: "#8FB8A4", accent: "#E9C46A" }, make: cards },
  { name: "发布会极简", en: "KEYNOTE", fit: "科技发布 · 数字冲击 · 一句话结论", th: { bg: 0x000000, ink: "#F5F5F7", dim: "#86868B", accent: "#F2A54A" }, make: keynote },
  { name: "极光", en: "AURORA GLASS", fit: "AI · 产品 · 未来趋势", th: { bg: 0x070B1E, ink: "#FFFFFF", dim: "#9AA3C8", accent: "#2EE6D6" }, make: aurora },
  { name: "杂志编辑", en: "EDITORIAL", fit: "人文 · 深度解读 · 原文引用", th: { bg: 0xF6F1E7, ink: "#1E1B17", dim: "#8A8174", accent: "#B3261E", light: true }, make: editorial },
  { name: "蒸汽波", en: "VAPORWAVE", fit: "80/90 年代 · 怀旧 · 互联网文化", th: { bg: 0x1A0B3D, ink: "#FFFFFF", dim: "#C9A8E8", accent: "#FF6AD5" }, make: vapor },
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
    add(h, z, (root) => { const s = el(root, "shot"); return { s, draw: st.make(s, h, z, B) }; }, (t, u) => { bg(ctx, st.th, { bloom: st.th.light ? 0 : 0.3, vig: st.th.light ? 0.12 : 0.4, grain: 0.015 }); u.draw(t); });
  });
  add(END, END + TAIL, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#0B0A0C;");
    el(s, "abs cn", "left:0;width:1920px;top:300px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +8：第六批");
    STY.forEach((st, i) => el(s, "abs cn", `left:${170 + (i % 4) * 400}px;top:${470 + Math.floor(i / 4) * 140}px;width:370px;padding:22px 0;text-align:center;border-radius:16px;font-size:36px;font-weight:800;color:${st.th.ink};background:#${st.th.bg.toString(16).padStart(6, "0")};border:3px solid ${st.th.accent};`, st.name));
    el(s, "abs cn", "left:0;width:1920px;top:800px;text-align:center;font-size:30px;color:#a8a29a;", "全部代码画面 · 0 积分 · 风格库共 35 套 / 8 个家族，每个家族至少 3 套");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
