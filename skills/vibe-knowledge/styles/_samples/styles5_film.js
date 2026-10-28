// 风格样片集 · 第五批：8 套 0 积分代码风格，同一段开场（复用第 01 期 B01 旁白）。
// 霓虹赛博、留白极简、复古桌面、剪报拼字、地铁线路图、象形统计、手账涂鸦、剪影片头。每套同时规定长相和讲法（见函数头注释）。
import { clamp, lerp, eOutCubic, eInOutCubic, eOutQuint, eInCubic, eOutBack, hit, el, css, rng } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 3.0;
export const meta = { title: "风格样片集 · 第五批", n: "styles5" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const val = (t, B) => (t < B.ten ? 0 : t < B.fifty ? Math.round(10 * eOutCubic(clamp((t - B.ten) / 0.4))) : Math.round(lerp(10, 50, eOutCubic(clamp((t - B.fifty) / 0.5)))));
const pop = (t, at, d = 0.35) => (t < at ? 0 : eOutBack(clamp((t - at) / d)));
const hs = (n) => { const x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
const svgBox = (p, style, inner) => { const d = el(p, "abs", style); d.innerHTML = inner; return d; };
const prep = (nodes) => nodes.forEach((n) => { const L = n.getTotalLength(); n.style.strokeDasharray = `${L} ${L}`; n.dataset.L = L; n.style.strokeDashoffset = L; });
const drawAt = (n, t, a, d) => { n.style.strokeDashoffset = String(n.dataset.L * (1 - eInOutCubic(clamp((t - a) / d)))); };
const wipe = (n, t, a, d) => { const k = clamp((t - a) / d); css(n, { clipPath: `inset(-20% ${((1 - k) * 100).toFixed(1)}% -20% -2%)`, opacity: String(t < a ? 0 : 1) }); };
const SONG = "font-family:'Songti SC','STSong',serif;";
const KAI = "font-family:'Kaiti SC','STKaiti','KaiTi',serif;";

// ── 1 霓虹赛博：雨夜深紫底，霓虹灯管一节节闪着点亮，招牌字通电；「没人动」故障错位；五十金电流暴涨 + 扫描线。讲法：通电点亮 ──
function neon(s, h, z, B) {
  el(s, "abs", "inset:0;background:radial-gradient(ellipse at 50% 115%,#3a0d52 0,#120a24 50%,#05040b 100%);");
  const cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080; cv.style.cssText = "position:absolute;left:0;top:0;"; s.appendChild(cv); const g = cv.getContext("2d");
  const R = rng(3), rain = [...Array(260)].map(() => ({ x: R() * 1920, y: R() * 1200, v: 900 + R() * 900, l: 18 + R() * 40 }));
  el(s, "abs", "left:0;top:860px;width:1920px;height:220px;background:linear-gradient(180deg,rgba(0,240,255,0.10),rgba(255,43,214,0.06) 40%,rgba(0,0,0,0));");
  const CY = "#00F0FF", MG = "#FF2BD6";
  const glow = (c) => `filter:drop-shadow(0 0 6px ${c}) drop-shadow(0 0 18px ${c}) drop-shadow(0 0 40px ${c});`;
  const gate = svgBox(s, `left:0;top:0;width:1920px;height:1080px;${glow(CY)}`, `<svg width="1920" height="1080" fill="none" stroke="#C9FBFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path class="n" d="M1000 860 V560 H1640 V860"/><path class="n" d="M960 560 L1060 470 H1580 L1680 560"/><path class="n" d="M1150 470 L1190 410 H1450 L1490 470"/><path class="n" d="M1240 860 V720 Q1320 650 1400 720 V860"/><path class="n" d="M900 862 H1760"/></svg>`);
  const segs = [...gate.querySelectorAll(".n")];
  const pole = el(s, "abs", `left:850px;top:320px;width:14px;height:540px;border-radius:7px;background:#FFE6FA;${glow(MG)}`);
  const sign = (txt, c, size, x, y) => el(s, "abs cn", `left:${x}px;top:${y}px;font-size:${size}px;font-weight:800;color:#FFF2FC;white-space:nowrap;letter-spacing:6px;text-shadow:0 0 6px ${c},0 0 18px ${c},0 0 42px ${c},0 0 80px ${c};`, txt);
  const t1 = sign("一根木头", CY, 96, 130, 250), t2 = sign("南门 ⇢ 北门", CY, 60, 140, 400);
  const box = el(s, "abs", `left:110px;top:220px;width:640px;height:300px;border:5px solid #FFE6FA;border-radius:26px;${glow(MG)}`);
  const num = sign("", MG, 170, 160, 260);
  const gl = ["#00F0FF", "#FF2BD6", "#FFFFFF"].map((c, i) => el(s, "abs cn", `left:150px;top:600px;font-size:130px;font-weight:900;color:${c};white-space:nowrap;letter-spacing:8px;mix-blend-mode:${i < 2 ? "screen" : "normal"};${i === 2 ? "text-shadow:0 0 18px rgba(255,255,255,0.6);" : ""}`, "没人动"));
  const err = el(s, "abs mono", `left:160px;top:770px;font-size:24px;letter-spacing:4px;color:${CY};`, "ERR · NO TAKERS · 0 / 1");
  const scan = el(s, "abs", "left:0;width:1920px;height:120px;background:linear-gradient(180deg,rgba(255,43,214,0),rgba(255,180,240,0.35),rgba(255,43,214,0));mix-blend-mode:screen;");
  el(s, "abs", "inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,0.18) 0 2px,transparent 2px 4px);pointer-events:none;");
  const fl = (t, at, seed = 0) => { if (t < at) return 0; const k = t - at; if (k > 0.35) return 1; return hs(Math.floor(k * 30) + seed * 17) > 0.45 ? 1 : 0.12; };
  return (t) => {
    const F = t >= B.fifty;
    g.clearRect(0, 0, 1920, 1080); g.strokeStyle = F ? "rgba(255,120,230,0.32)" : "rgba(120,210,255,0.26)"; g.lineWidth = 2; g.beginPath();
    for (const d of rain) { const y = ((d.y + (t - h) * d.v) % 1300) - 120; g.moveTo(d.x, y); g.lineTo(d.x - 4, y + d.l); } g.stroke();
    segs.forEach((p, i) => css(p, { opacity: String(fl(t, h + 0.1 + i * 0.22, i)) }));
    css(pole, { opacity: String(fl(t, h + 0.95, 9)) });
    css(t1, { opacity: String(fl(t, h + 0.3, 3) * (t < B.ten ? 1 : 0)) }); css(t2, { opacity: String(fl(t, h + 0.9, 4) * (t < B.ten ? 1 : 0)) });
    css(box, { opacity: String(fl(t, B.ten - 0.05, 5)) });
    num.textContent = `赏 ${val(t, B)} 金`; css(num, { opacity: String(fl(t, B.ten, 6)), filter: F ? `brightness(${(1 + 1.2 * hit(t, B.fifty, 4)).toFixed(2)})` : "none" });
    const gk = t >= B.nobody && t < B.nobody + 0.45, q = Math.floor(t * 24), dx = gk ? (hs(q) - 0.5) * 34 : 0;
    gl.forEach((n, i) => css(n, { opacity: String(t >= B.nobody && !F ? 1 : 0), transform: `translate(${(i === 0 ? -dx : i === 1 ? dx : dx * 0.3).toFixed(1)}px,${(gk && i === 2 ? (hs(q + 3) - 0.5) * 10 : 0).toFixed(1)}px)`, clipPath: gk && i === 2 ? `inset(${(hs(q + 5) * 60).toFixed(0)}% 0 ${(hs(q + 7) * 30).toFixed(0)}% 0)` : "none" }));
    css(err, { opacity: String(t >= B.nobody + 0.2 && !F ? (Math.floor(t * 4) % 2 ? 1 : 0.4) : 0) });
    css(scan, { top: `${lerp(-140, 1100, clamp((t - B.fifty) / 0.6)).toFixed(0)}px`, opacity: String(F && t < B.fifty + 0.6 ? 1 : 0) });
  };
}

// ── 2 留白极简：暖白纸，一笔墨圈，圈里一次只放一个字；底下一行小字。讲法：一屏一字，慢呼吸 ──
function minimal(s, h, z, B) {
  el(s, "abs", "inset:0;background:#F4F1EA;");
  const stage = el(s, "abs", "inset:0;");
  const ens = svgBox(stage, "left:660px;top:190px;width:600px;height:600px;", `<svg width="600" height="600"><path class="e" d="M318 64 C470 70 552 190 540 320 C528 456 412 548 286 538 C150 528 58 418 66 286 C74 168 160 82 262 66" fill="none" stroke="#2A2622" stroke-width="16" stroke-linecap="round" opacity="0.92"/></svg>`);
  const E = ens.querySelector(".e"); prep([E]);
  const ch = (txt, size = 250) => el(stage, "abs", `left:660px;top:190px;width:600px;height:600px;display:flex;align-items:center;justify-content:center;${SONG}font-size:${size}px;font-weight:600;color:#2A2622;`, txt);
  const C = [ch("木"), ch("十"), ch("无"), ch("五十", 200)];
  const cap = (txt) => el(stage, "abs", `left:0;width:1920px;top:840px;text-align:center;${SONG}font-size:44px;color:#6E675C;letter-spacing:18px;`, txt);
  const K = [cap("一根木头 · 南门到北门"), cap("赏 · 十金"), cap("没人动"), cap("五十金")];
  const seal = el(stage, "abs", `left:1180px;top:680px;width:64px;height:64px;background:#B23A2E;border-radius:4px;display:flex;align-items:center;justify-content:center;${SONG}font-size:34px;font-weight:700;color:#F4F1EA;`, "信");
  el(stage, "abs", `left:200px;top:180px;writing-mode:vertical-rl;${SONG}font-size:26px;color:#B5AEA2;letter-spacing:14px;`, "徙木立信");
  return (t) => {
    css(stage, { transform: `scale(${(1 + 0.03 * clamp((t - h) / (z - h))).toFixed(4)})` });
    drawAt(E, t, h + 0.05, 1.1);
    const T0 = [h + 0.5, B.ten, B.nobody, B.fifty], T1 = [B.ten, B.nobody, B.fifty, z + 1];
    C.forEach((n, i) => { const a = clamp((t - T0[i]) / 0.22) * (1 - clamp((t - T1[i] + 0.05) / 0.12)); css(n, { opacity: String(a), filter: `blur(${((1 - clamp((t - T0[i]) / 0.22)) * 8).toFixed(1)}px)` }); });
    K.forEach((n, i) => css(n, { opacity: String(clamp((t - T0[i] - 0.05) / 0.25) * (1 - clamp((t - T1[i] + 0.05) / 0.12))) }));
    css(seal, { opacity: String(t >= B.fifty + 0.6 ? 1 : 0), transform: `scale(${lerp(1.6, 1, eOutCubic(clamp((t - B.fifty - 0.6) / 0.15))).toFixed(3)})` });
  };
}

// ── 3 复古桌面：1-bit 灰点阵桌面、黑白窗口和对话框、光标。窗口就是镜头，光标就是视线；最后把「木头」图标拖进北门文件夹。讲法：桌面操作纪实 ──
function desktop(s, h, z, B) {
  el(s, "abs", "inset:0;background-color:#B8B8B8;background-image:repeating-conic-gradient(#8E8E8E 0 25%,transparent 0 50%);background-size:4px 4px;");
  const bar = el(s, "abs mono", "left:0;top:0;width:1920px;height:44px;background:#fff;border-bottom:3px solid #000;display:flex;align-items:center;gap:40px;padding-left:30px;font-size:22px;font-weight:700;color:#000;box-sizing:border-box;");
  bar.innerHTML = `<span style="font-size:26px">◆</span><span class="cn">文件</span><span class="cn">编辑</span><span class="cn">显示</span><span class="cn">特别</span><span style="margin-left:auto;margin-right:30px" class="cn">徙木立信</span>`;
  const icon = (x, y, label, kind) => { const d = el(s, "abs", `left:${x}px;top:${y}px;width:140px;text-align:center;`); el(d, "", kind === "folder" ? "margin:0 auto;width:96px;height:72px;background:#fff;border:3px solid #000;border-radius:2px 8px 2px 2px;box-shadow:inset 0 14px 0 -10px #000;" : "margin:0 auto;width:30px;height:96px;background:repeating-linear-gradient(0deg,#000 0 3px,#fff 3px 9px);border:3px solid #000;", ""); el(d, "cn", "margin-top:8px;display:inline-block;padding:0 8px;background:#fff;font-size:22px;font-weight:700;color:#000;", label); return d; };
  const fS = icon(120, 760, "南门", "folder"), fN = icon(1660, 160, "北门", "folder"), log = icon(300, 700, "木头", "log");
  const win = (x, y, w, hh, title) => { const d = el(s, "abs", `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;background:#fff;border:3px solid #000;box-shadow:8px 8px 0 #000;`); const tb = el(d, "abs", "left:0;top:0;right:0;height:38px;border-bottom:3px solid #000;background:repeating-linear-gradient(0deg,#000 0 2px,#fff 2px 5px);"); el(tb, "abs", "left:14px;top:8px;width:20px;height:20px;background:#fff;border:3px solid #000;"); el(tb, "abs cn", "left:50%;top:3px;transform:translateX(-50%);padding:0 16px;background:#fff;font-size:24px;font-weight:800;color:#000;white-space:nowrap;", title); const body = el(d, "abs cn", "left:30px;top:62px;right:30px;bottom:24px;font-size:42px;font-weight:700;color:#000;line-height:1.5;white-space:pre-wrap;"); return { d, body }; };
  const W1 = win(520, 150, 760, 380, "告示.txt");
  const W2 = win(620, 440, 700, 300, "悬赏");
  W2.body.innerHTML = `<div style="display:flex;gap:30px;align-items:center"><div style="width:84px;height:84px;border:5px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Geist;font-size:60px;font-weight:900">!</div><div class="w2t" style="font-size:56px;font-weight:900">赏 10 金</div></div><div style="position:absolute;right:0;bottom:0;padding:6px 40px;border:5px solid #000;border-radius:14px;font-size:36px" class="btn">搬</div>`;
  const W3 = win(700, 520, 700, 300, "⚠ 悬赏已更新");
  W3.body.innerHTML = `<div style="font-size:66px;font-weight:900">赏金 → 50 金</div><div style="position:absolute;right:0;bottom:0;padding:6px 40px;border:5px solid #000;border-radius:14px;font-size:36px;box-shadow:0 0 0 4px #fff,0 0 0 8px #000" class="btn3">搬</div>`;
  const wait = el(s, "abs mono", "left:640px;top:760px;padding:6px 16px;background:#fff;border:3px solid #000;font-size:24px;font-weight:700;color:#000;", "");
  const zoom = [0, 1, 2, 3].map(() => el(s, "abs", "border:2px dotted #000;pointer-events:none;"));
  const cur = svgBox(s, "left:0;top:0;width:40px;height:56px;z-index:9;", `<svg width="40" height="56"><path class="ar" d="M4 4 L4 44 L14 34 L22 52 L30 48 L22 31 L36 31 Z" fill="#000" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><g class="hg" style="display:none"><path d="M6 4 H34 V10 L22 28 L34 46 V52 H6 V46 L18 28 L6 10 Z" fill="#fff" stroke="#000" stroke-width="3"/><path d="M12 46 L20 36 L28 46 Z" fill="#000"/></g></svg>`);
  const AR = cur.querySelector(".ar"), HG = cur.querySelector(".hg");
  const TX = "国都市南门\n立三丈之木\n能徙置北门者——";
  const open = (w, t, a, x, y, ww, hh) => { const k = clamp((t - a) / 0.22); css(w.d, { opacity: String(k >= 1 ? 1 : 0) }); zoom.forEach((r, i) => { const kk = clamp(k - i * 0.12); const show = k > 0 && k < 1; css(r, { opacity: String(show ? 1 : 0), left: `${lerp(x + ww / 2, x, kk)}px`, top: `${lerp(y + hh / 2, y, kk)}px`, width: `${lerp(0, ww, kk)}px`, height: `${lerp(0, hh, kk)}px` }); }); };
  return (t) => {
    const F = t >= B.fifty;
    let zA = 0;
    if (t < B.ten) open(W1, t, h + 0.15, 520, 150, 760, 380); else if (t < B.fifty) { css(W1.d, { opacity: "1" }); open(W2, t, B.ten - 0.12, 620, 440, 700, 300); } else { css(W2.d, { opacity: "1" }); open(W3, t, B.fifty - 0.05, 700, 520, 700, 300); }
    if (t < B.ten) { css(W2.d, { opacity: "0" }); css(W3.d, { opacity: "0" }); } else if (t < B.fifty) css(W3.d, { opacity: "0" });
    W1.body.textContent = TX.slice(0, Math.max(0, Math.floor((t - h - 0.45) * 16)));
    const n = val(t, B); const w2t = W2.d.querySelector(".w2t"); if (w2t) w2t.textContent = `赏 ${Math.min(n, 10)} 金`;
    css(wait, { opacity: String(t >= B.nobody && !F ? 1 : 0) }); wait.textContent = `等待响应… 0 人 · ${((t - B.nobody) * 1000 / 1000 + 0).toFixed(1)} s`;
    // 光标：开场在告示上，赏金时移到按钮，没人动变沙漏，五十金点按钮，然后拖木头去北门
    const b3 = W3.d.querySelector(".btn3");
    let cx = 900, cy = 420, hg = false, drag = 0;
    if (t >= B.ten) { const k = eInOutCubic(clamp((t - B.ten - 0.1) / 0.4)); cx = lerp(900, 1190, k); cy = lerp(420, 690, k); }
    if (t >= B.nobody && !F) hg = true;
    if (F) { const k = eInOutCubic(clamp((t - B.fifty - 0.1) / 0.35)); cx = lerp(1190, 1290, k); cy = lerp(690, 770, k); }
    css(b3, { background: t >= B.fifty + 0.5 && t < B.fifty + 0.65 ? "#000" : "#fff", color: t >= B.fifty + 0.5 && t < B.fifty + 0.65 ? "#fff" : "#000" });
    const d0 = B.fifty + 0.8, d1 = B.fifty + 1.1, d2 = B.fifty + 2.3;
    if (t >= d0) { const k = eInOutCubic(clamp((t - d0) / 0.3)); cx = lerp(1290, 370, k); cy = lerp(770, 740, k); css(W3.d, { opacity: String(1 - clamp((t - d0) / 0.15)) }); }
    if (t >= d1) { drag = eInOutCubic(clamp((t - d1) / (d2 - d1))); cx = lerp(370, 1730, drag); cy = lerp(740, 200, drag); }
    css(log, { left: `${t >= d1 ? cx - 70 : 300}px`, top: `${t >= d1 ? cy - 40 : 700}px`, opacity: String(t >= d2 + 0.05 ? 0 : 1) });
    css(fN, { filter: t >= d2 && Math.floor((t - d2) * 8) % 2 === 0 && t < d2 + 0.6 ? "invert(1)" : "none" });
    css(cur, { left: `${cx}px`, top: `${cy}px`, opacity: String(t >= h + 0.3 ? 1 : 0) });
    AR.style.display = hg ? "none" : ""; HG.style.display = hg ? "" : "none";
  };
}

// ── 4 剪报拼字：灰白新闻纸、每个字从不同报纸上剪下来（字体、底色、角度都不一样），一个字一个字拍上去；复印颗粒、订书钉、红圈。讲法：拼出来 ──
function ransom(s, h, z, B) {
  el(s, "abs", "inset:0;background-color:#E6E2D6;background-image:repeating-linear-gradient(180deg,rgba(60,55,45,0.10) 0 3px,transparent 3px 14px);background-size:100% 14px;");
  for (let i = 0; i < 6; i++) el(s, "abs", `left:${60 + i * 310}px;top:0;width:2px;height:1080px;background:rgba(60,55,45,0.12);`);
  svgBox(s, "left:0;top:0;width:1920px;height:1080px;mix-blend-mode:multiply;opacity:0.4;", `<svg width="1920" height="1080"><filter id="pc4"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="5"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1920" height="1080" filter="url(#pc4)" opacity="0.6"/></svg>`);
  const R = rng(41), PAL = [["#fff", "#111"], ["#111", "#fff"], ["#F2D43D", "#111"], ["#E2463B", "#fff"], ["#DCD7CB", "#111"], ["#5A7FB5", "#fff"], ["#fff", "#E2463B"]];
  const FONTS = ["font-family:NotoSC;font-weight:900;", `${SONG}font-weight:700;`, `${KAI}font-weight:700;`, "font-family:GeistMono,NotoSC;font-weight:700;", "font-family:Geist,NotoSC;font-weight:900;"];
  const word = (str, cx, y, size) => { const box = el(s, "abs", `left:0;top:${y}px;width:1920px;display:flex;justify-content:center;gap:${size * 0.08}px;`); const cs = [...str].map((c) => { const [b, f] = PAL[Math.floor(R() * PAL.length)], sz = size * (0.82 + R() * 0.36), rot = (R() - 0.5) * 16; const n = el(box, "", `display:inline-block;padding:${sz * 0.06}px ${sz * 0.1}px;background:${b};color:${f};${FONTS[Math.floor(R() * FONTS.length)]}font-size:${sz.toFixed(0)}px;line-height:1.05;box-shadow:3px 4px 0 rgba(0,0,0,0.25);transform:rotate(${rot.toFixed(1)}deg);`, c === " " ? "&nbsp;" : c); return { n, rot }; }); return { box, cs }; };
  const W = [word("一根木头", 960, 220, 150), word("南门→北门", 960, 470, 92), word("赏10金", 960, 260, 230), word("没人动", 960, 600, 150), word("50金!!", 960, 240, 260), word("直接翻五倍", 960, 640, 110)];
  const show = (w, t, a, b) => { w.cs.forEach((c, i) => { const at = a + i * 0.07, k = clamp((t - at) / 0.12); css(c.n, { opacity: String(t >= at && t < b ? 1 : 0), transform: `rotate(${c.rot.toFixed(1)}deg) scale(${lerp(1.35, 1, eOutCubic(k)).toFixed(3)})` }); }); };
  const staple = [el(s, "abs", "left:600px;top:200px;width:70px;height:10px;background:#9A9A9A;border-radius:3px;transform:rotate(-8deg);box-shadow:0 2px 0 #666;"), el(s, "abs", "left:1250px;top:210px;width:70px;height:10px;background:#9A9A9A;border-radius:3px;transform:rotate(6deg);box-shadow:0 2px 0 #666;")];
  const circ = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080"><path class="c" d="M640 220 C900 140 1360 160 1440 300 C1500 420 1200 520 900 510 C640 500 470 420 520 300 C550 230 640 200 760 190" fill="none" stroke="#E2463B" stroke-width="10" stroke-linecap="round"/></svg>`);
  const CC = circ.querySelector(".c"); prep([CC]);
  return (t) => {
    show(W[0], t, h + 0.15, B.ten - 0.05); show(W[1], t, h + 0.8, B.ten - 0.05);
    show(W[2], t, B.ten, B.fifty - 0.02); show(W[3], t, B.nobody, B.fifty - 0.02);
    show(W[4], t, B.fifty, 99); show(W[5], t, B.fifty + 0.55, 99);
    staple.forEach((n, i) => css(n, { opacity: String(t >= B.fifty + 0.4 + i * 0.1 ? 1 : 0) }));
    drawAt(CC, t, B.fifty + 1.0, 0.5);
  };
}

// ── 5 地铁线路图：白底，线路只走 0°/45°/90°，随剧情从南门长到北门；站点到了才亮，「没人动」站暂停服务，五十金是换乘站，列车开到北门。讲法：线路生长 ──
function metro(s, h, z, B) {
  el(s, "abs", "inset:0;background:#FAFAF7;");
  const RED = "#E4002B", GOLD = "#F2A900", INK = "#1A1A1A";
  const D = "M220 860 H520 L740 640 H1040 L1260 420 H1560 L1700 280";
  const g = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${D}" stroke="#E6E6E2" stroke-width="18"/><path class="L" d="${D}" stroke="${RED}" stroke-width="18"/>
    <path class="X" d="M1410 200 V420 L1520 530 V700" stroke="${GOLD}" stroke-width="18"/></svg>`);
  const L = g.querySelector(".L"), X = g.querySelector(".X"); prep([L, X]);
  const LEN = L.dataset.L * 1;
  const ST = [[220, 860, "南门", "Nanmen", 1], [520, 860, "立木", "Pole", 0], [890, 640, "赏十金", "10 Gold", 0], [1150, 530, "没人动", "No takers", 0], [1410, 420, "五十金", "50 Gold", 2], [1700, 280, "北门", "Beimen", 1]];
  const at = ST.map(([x, y]) => { let best = 0, bd = 1e9; for (let l = 0; l <= LEN; l += 2) { const p = L.getPointAtLength(l), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = l; } } return best; });
  const dots = ST.map(([x, y, cn, en, kind]) => { const r = kind ? 26 : 16; const d = el(s, "abs", `left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:#fff;border:${kind ? 8 : 6}px solid ${kind === 2 ? INK : kind ? INK : RED};box-sizing:border-box;`); const lab = el(s, "abs", `left:${x + (kind === 2 ? 40 : -60)}px;top:${y + (y > 700 ? 40 : -110)}px;`); el(lab, "cn", `font-size:40px;font-weight:800;color:${INK};white-space:nowrap;`, cn); el(lab, "mono", "font-size:20px;color:#888;letter-spacing:2px;", en); return { d, lab }; });
  const stop = el(s, "abs cn", "left:1190px;top:560px;padding:4px 12px;background:#888;color:#fff;font-size:24px;font-weight:700;border-radius:6px;", "暂停服务");
  const x5 = el(s, "abs cn", `left:1440px;top:190px;padding:4px 14px;background:${GOLD};color:${INK};font-size:30px;font-weight:900;border-radius:8px;`, "× 5 换乘");
  const badge = el(s, "abs", `left:110px;top:90px;display:flex;align-items:center;gap:20px;`);
  el(badge, "", `width:80px;height:80px;border-radius:14px;background:${RED};color:#fff;display:flex;align-items:center;justify-content:center;font-family:Geist;font-size:52px;font-weight:900;`, "1");
  el(badge, "cn", `font-size:48px;font-weight:900;color:${INK};`, "徙木线");
  const train = el(s, "abs", `width:96px;height:44px;margin:-22px 0 0 -48px;border-radius:22px;background:${INK};border:5px solid #fff;box-shadow:0 0 0 4px ${RED};`);
  return (t) => {
    const keys = [[h, 0], [h + 1.0, at[1]], [B.ten - 0.3, at[1]], [B.ten, at[2]], [B.nobody - 0.3, at[2]], [B.nobody, at[3]], [B.fifty - 0.1, at[3]], [B.fifty + 0.3, at[4]], [B.fifty + 0.6, at[4]], [B.fifty + 1.6, at[5]]];
    let l = 0; for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0]) l = lerp(keys[i][1], keys[i + 1][1], eInOutCubic(clamp((t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]))));
    L.style.strokeDashoffset = String(LEN - l);
    dots.forEach((d, i) => { const on = l >= at[i] - 1 && t >= h; css(d.d, { opacity: String(on ? 1 : 0), transform: `scale(${on ? 1 : 0})` }); css(d.lab, { opacity: String(on ? 1 : 0), filter: i === 3 && t >= B.nobody ? "grayscale(1) opacity(0.6)" : "none" }); });
    css(stop, { opacity: String(t >= B.nobody + 0.1 ? 1 : 0) });
    drawAt(X, t, B.fifty, 0.4); css(x5, { opacity: String(t >= B.fifty + 0.3 ? 1 : 0) });
    css(badge, { opacity: String(clamp((t - h) / 0.2)) });
    const tl = t < B.fifty + 0.6 ? null : l; if (tl != null) { const p = L.getPointAtLength(tl); css(train, { left: `${p.x}px`, top: `${p.y}px`, opacity: "1" }); } else css(train, { opacity: "0" });
  };
}

// ── 6 象形统计（ISOTYPE）：一个金锭图标 = 1 金，一个人形 = 一位围观者；一行行盖章，数量就是图本身。讲法：数得出来 ──
function isotype(s, h, z, B) {
  el(s, "abs", "inset:0;background:#EFE7D6;");
  const RED = "#C8352B", INK = "#1F1B16", GOLD = "#D9A21B";
  const lg = el(s, "abs", "left:110px;top:70px;display:flex;align-items:center;gap:18px;");
  el(lg, "", `width:56px;height:34px;background:${GOLD};clip-path:polygon(16% 0,84% 0,100% 100%,0 100%);`); el(lg, "cn", `font-size:34px;font-weight:800;color:${INK};`, "= 1 金");
  el(lg, "", `margin-left:40px;width:24px;height:24px;border-radius:50%;background:${INK};`); el(lg, "cn", `font-size:34px;font-weight:800;color:${INK};`, "= 1 人");
  const lab = (txt, y) => el(s, "abs cn", `left:110px;top:${y}px;width:200px;font-size:36px;font-weight:900;color:${INK};`, txt);
  lab("赏金", 200); lab("围观", 720);
  const cnt = el(s, "abs", `left:110px;top:250px;font-family:Geist;font-size:72px;font-weight:900;color:${GOLD};`);
  const ingots = [...Array(50)].map((_, i) => el(s, "abs", `left:${330 + (i % 10) * 132}px;top:${190 + Math.floor(i / 10) * 86}px;width:104px;height:58px;background:${GOLD};clip-path:polygon(16% 0,84% 0,100% 100%,0 100%);box-shadow:inset 0 10px 0 rgba(255,255,255,0.3);`));
  const ppl = [...Array(12)].map((_, i) => { const d = el(s, "abs", `left:${330 + i * 112}px;top:690px;width:80px;height:170px;`); el(d, "abs", "left:20px;top:0;width:40px;height:40px;border-radius:50%;background:currentColor;"); el(d, "abs", "left:4px;top:48px;width:72px;height:120px;background:currentColor;clip-path:polygon(18% 0,82% 0,100% 100%,0 100%);"); css(d, { color: "#8F877A" }); return d; });
  const mv = el(s, "abs cn", `left:110px;top:900px;font-size:40px;font-weight:900;color:${INK};white-space:nowrap;`);
  return (t) => {
    const F = t >= B.fifty;
    ingots.forEach((n, i) => { const a = i < 10 ? B.ten + i * 0.04 : B.fifty + 0.05 + (i - 10) * 0.028; const k = clamp((t - a) / 0.1); css(n, { opacity: String(t >= a ? 1 : 0), transform: `scale(${lerp(1.5, 1, eOutCubic(k)).toFixed(3)})` }); });
    const shown = ingots.filter((_, i) => t >= (i < 10 ? B.ten + i * 0.04 : B.fifty + 0.05 + (i - 10) * 0.028)).length;
    cnt.textContent = String(shown); css(cnt, { opacity: String(t >= B.ten ? 1 : 0) });
    ppl.forEach((p, i) => { const a = h + 0.3 + i * 0.06, k = clamp((t - a) / 0.12); const hero = i === 4 && t >= B.fifty + 1.6; css(p, { opacity: String(t >= a ? 1 : 0), transform: `translateY(${(hero ? -40 * eOutBack(clamp((t - B.fifty - 1.6) / 0.3)) : (1 - eOutCubic(k)) * 30).toFixed(1)}px)`, color: hero ? RED : "#8F877A" }); });
    mv.innerHTML = t < B.nobody ? "" : `搬的人：<span style="font-family:Geist;font-size:64px;color:${RED}">${t >= B.fifty + 1.6 ? 1 : 0}</span>`;
  };
}

// ── 7 手账涂鸦：点阵纸、和纸胶带、马克笔涂鸦一笔笔画、荧光笔划重点、便利贴拍上去、圆珠笔吐槽。讲法：边画边贴 ──
function journal(s, h, z, B) {
  el(s, "abs", "inset:0;background-color:#FBF8F1;background-image:radial-gradient(#D6CFC0 2px,transparent 2.5px);background-size:36px 36px;");
  const tape = (x, y, w, rot, c1, c2) => el(s, "abs", `left:${x}px;top:${y}px;width:${w}px;height:54px;background:repeating-linear-gradient(45deg,${c1} 0 14px,${c2} 14px 28px);opacity:0.85;transform:rotate(${rot}deg);`);
  const tp = [tape(60, 50, 300, -6, "#F7B6C8", "#FCD9E3"), tape(1580, 960, 300, 8, "#A8DCC9", "#D3EFE4"), tape(1600, 70, 220, 14, "#F9E08B", "#FCEFC2")];
  const hl = el(s, "abs", "left:150px;top:150px;height:56px;background:rgba(255,226,70,0.6);transform:skew(-12deg);");
  const title = el(s, "abs", `left:160px;top:136px;${KAI}font-size:66px;font-weight:700;color:#2B2B2B;white-space:nowrap;`, "Day 1 · 南门搬木头");
  const doo = svgBox(s, "left:0;top:0;width:1920px;height:1080px;", `<svg width="1920" height="1080" fill="none" stroke="#2B2B2B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path class="d" d="M1000 830 Q1300 838 1700 826"/>
    <path class="d" d="M1080 828 L1084 600 Q1300 596 1560 604 L1556 828"/>
    <path class="d" d="M1040 604 Q1180 520 1320 500 Q1460 520 1600 604"/>
    <path class="d" d="M1250 828 L1252 724 Q1318 670 1384 722 L1386 828"/>
    <path class="d" d="M930 830 L926 420" stroke="#8B5A2B" stroke-width="16"/>
    <path class="d" d="M700 420 Q640 470 690 520 M680 440 Q740 500 700 540" stroke="#2D6BFF" stroke-width="5"/>
    <path class="st" d="M1500 300 L1530 380 L1610 390 L1548 440 L1568 520 L1500 476 L1432 520 L1452 440 L1390 390 L1470 380 Z" stroke="#F2A900" stroke-width="7"/></svg>`);
  const P = [...doo.querySelectorAll(".d")], ST = doo.querySelector(".st"); prep([...P, ST]);
  const note = (txt, x, y, rot, bgc, size) => { const n = el(s, "abs", `left:${x}px;top:${y}px;width:420px;height:300px;background:${bgc};box-shadow:4px 10px 18px rgba(0,0,0,0.18);transform:rotate(${rot}deg);display:flex;align-items:center;justify-content:center;${KAI}font-size:${size}px;font-weight:700;color:#2B2B2B;`, txt); el(n, "abs", "left:150px;top:-20px;width:120px;height:40px;background:rgba(255,255,255,0.55);"); return n; };
  const n1 = note("赏 10 金", 220, 330, -4, "#FFE873", 100), n2 = note("50 金!!!", 300, 380, 5, "#FFB3C7", 120);
  const scr = el(s, "abs", `left:260px;top:700px;${KAI}font-size:76px;font-weight:700;color:#2D5BD8;white-space:nowrap;`, "没人动 ??");
  const sub = el(s, "abs", `left:180px;top:240px;${KAI}font-size:60px;font-weight:700;color:#3A3A3A;white-space:nowrap;`, "一根木头，南门 → 北门");
  return (t) => {
    tp.forEach((n, i) => { const k = eOutCubic(clamp((t - h - i * 0.1) / 0.3)); css(n, { opacity: String(k > 0 ? 0.85 : 0), clipPath: `inset(0 ${((1 - k) * 100).toFixed(1)}% 0 0)` }); });
    css(hl, { width: `${(eOutCubic(clamp((t - h - 0.2) / 0.4)) * 640).toFixed(1)}px` }); wipe(title, t, h + 0.1, 0.5);
    P.slice(0, 5).forEach((p, i) => drawAt(p, t, h + 0.3 + i * 0.22, 0.45));
    wipe(sub, t, h + 0.9, 0.6); css(sub, { opacity: String(t >= h + 0.9 && t < B.ten ? 1 : 0) });
    const p1 = pop(t, B.ten, 0.3); css(n1, { opacity: String(p1 > 0 && t < B.fifty ? 1 : 0), transform: `rotate(-4deg) scale(${p1.toFixed(3)})` });
    wipe(scr, t, B.nobody + 0.05, 0.4); if (t >= B.fifty) css(scr, { opacity: "0" }); drawAt(P[5], t, B.nobody + 0.2, 0.3);
    const p2 = pop(t, B.fifty, 0.3); css(n2, { opacity: String(p2 > 0 ? 1 : 0), transform: `rotate(5deg) scale(${p2.toFixed(3)})` });
    drawAt(ST, t, B.fifty + 0.4, 0.5);
  };
}

// ── 8 剪影片头：橘红底、黑色硬边色块从画外切进来拼成城门，木杆像一道竖线劈开画面；「没人动」时上下黑条合成一道缝；五十金黑块炸开。讲法：形状转场（Saul Bass 式片头）──
function titles(s, h, z, B) {
  el(s, "abs", "inset:0;background:#E8562A;");
  const K = "#14110F", W = "#F6EFE3";
  const blk = (style) => el(s, "abs", `background:${K};${style}`);
  const lintel = blk("left:880px;top:430px;width:820px;height:110px;"), pL = blk("left:960px;top:540px;width:150px;height:360px;"), pR = blk("left:1470px;top:540px;width:150px;height:360px;");
  const roof = svgBox(s, "left:820px;top:290px;width:940px;height:150px;", `<svg width="940" height="150"><path d="M0 150 L120 20 L820 20 L940 150 Z" fill="${K}"/></svg>`);
  const pole = blk("left:760px;top:0;width:34px;height:900px;");
  const ground = blk("left:0;top:900px;width:1920px;height:180px;");
  const cutT = (txt, x, y, size, c, rot = -3) => el(s, "abs", `left:${x}px;top:${y}px;font-family:Geist,NotoSC;font-size:${size}px;font-weight:900;color:${c};white-space:nowrap;letter-spacing:${size * 0.04}px;transform:rotate(${rot}deg);line-height:1;`, txt);
  const t1 = cutT("一根木头", 120, 260, 120, K), t2 = cutT("南门 —— 北门", 130, 420, 64, W, -2);
  const pane = el(s, "abs", `left:0;top:0;width:700px;height:900px;background:${W};`);
  const n10 = cutT("10", 90, 180, 420, K, -4), k10 = cutT("金", 420, 560, 180, "#E8562A", 3);
  const lidT = blk("left:0;top:0;width:1920px;height:0;"), lidB = blk("left:0;bottom:0;width:1920px;height:0;");
  const slit = cutT("没 人 动", 0, 500, 66, K, 0); css(slit, { width: "1920px", height: "80px", lineHeight: "80px", textAlign: "center", letterSpacing: "40px", background: "#E8562A" });
  const R = rng(8), shards = [...Array(14)].map(() => { const sz = 60 + R() * 160, a = R() * 6.283, d = 600 + R() * 600; const n = svgBox(s, `left:${960 - sz / 2}px;top:${540 - sz / 2}px;width:${sz}px;height:${sz}px;`, `<svg width="${sz}" height="${sz}"><path d="M0 ${sz} L${sz * R()} 0 L${sz} ${sz * (0.4 + R() * 0.6)} Z" fill="${K}"/></svg>`); return { n, dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: (R() - 0.5) * 540 }; });
  const n50 = cutT("50", 0, 250, 520, W, -3); css(n50, { width: "1920px", textAlign: "center" });
  const sub = cutT("赏 金 直 接 翻 五 倍", 0, 830, 46, K, 0); css(sub, { width: "1920px", textAlign: "center", letterSpacing: "18px" });
  const slideIn = (n, t, a, from, d = 0.32) => { const k = eOutQuint(clamp((t - a) / d)); css(n, { transform: `translate(${((1 - k) * from[0]).toFixed(0)}px,${((1 - k) * from[1]).toFixed(0)}px)`, opacity: String(t >= a ? 1 : 0) }); };
  return (t) => {
    const F = t >= B.fifty;
    slideIn(ground, t, h, [-1920, 0], 0.3); slideIn(lintel, t, h + 0.1, [1200, 0]); slideIn(pL, t, h + 0.2, [0, 900]); slideIn(pR, t, h + 0.28, [0, 900]); slideIn(roof, t, h + 0.36, [0, -500]);
    slideIn(pole, t, h + 0.85, [0, -1100], 0.25);
    for (const n of [ground, lintel, pL, pR, roof, pole]) if (F) css(n, { opacity: String(1 - clamp((t - B.fifty) / 0.1)) });
    slideIn(t1, t, h + 0.3, [-900, 0]); slideIn(t2, t, h + 0.9, [-900, 0]); if (t >= B.ten) { css(t1, { opacity: "0" }); css(t2, { opacity: "0" }); }
    const pk = eOutQuint(clamp((t - B.ten + 0.08) / 0.25)); css(pane, { transform: `translateX(${((1 - pk) * -760).toFixed(0)}px)`, opacity: String(t >= B.ten - 0.08 && !F ? 1 : 0) });
    for (const n of [n10, k10]) css(n, { opacity: String(t >= B.ten && !F ? 1 : 0) });
    const lk = t < B.nobody ? 0 : F ? 1 - eInCubic(clamp((t - B.fifty) / 0.12)) : eOutQuint(clamp((t - B.nobody) / 0.25));
    css(lidT, { height: `${(lk * 500).toFixed(0)}px` }); css(lidB, { height: `${(lk * 500).toFixed(0)}px` }); css(slit, { opacity: String(t >= B.nobody + 0.15 && !F ? 1 : 0) });
    shards.forEach((c) => { const k = eOutCubic(clamp((t - B.fifty) / 0.7)); css(c.n, { opacity: String(F && k < 1 ? 1 - k * 0.6 : 0), transform: `translate(${(c.dx * k).toFixed(0)}px,${(c.dy * k).toFixed(0)}px) rotate(${(c.r * k).toFixed(0)}deg)` }); });
    const k5 = eOutBack(clamp((t - B.fifty - 0.12) / 0.3)); css(n50, { opacity: String(t >= B.fifty + 0.12 ? 1 : 0), transform: `rotate(-3deg) scale(${k5.toFixed(3)})`, color: K });
    css(s.firstChild, { background: F ? "#F2C14E" : "#E8562A" });
    slideIn(sub, t, B.fifty + 0.5, [0, 200]);
  };
}

const STY = [
  { name: "霓虹赛博", en: "NEON CYBER", fit: "科技 · 互联网 · 未来 · 赛博文化", th: { bg: 0x0B0716, ink: "#FFF2FC", dim: "#9C88B8", accent: "#FF2BD6" }, make: neon },
  { name: "留白极简", en: "MINIMAL ZEN", fit: "哲学 · 汉字 · 一个概念讲透", th: { bg: 0xF4F1EA, ink: "#2A2622", dim: "#9A9286", accent: "#B23A2E", light: true }, make: minimal },
  { name: "复古桌面", en: "RETRO DESKTOP", fit: "电脑史 · 互联网往事 · 操作过程", th: { bg: 0xB8B8B8, ink: "#000000", dim: "#444444", accent: "#000000", light: true }, make: desktop },
  { name: "剪报拼字", en: "RANSOM NOTE", fit: "悬案 · 爆料 · 反转 · 网络梗", th: { bg: 0xE6E2D6, ink: "#111111", dim: "#6B665A", accent: "#E2463B", light: true }, make: ransom },
  { name: "地铁线路图", en: "METRO MAP", fit: "演化路线 · 阶段 · 一条时间线", th: { bg: 0xFAFAF7, ink: "#1A1A1A", dim: "#888888", accent: "#E4002B", light: true }, make: metro },
  { name: "象形统计", en: "ISOTYPE", fit: "人口 · 数量对比 · 数据（数得出来）", th: { bg: 0xEFE7D6, ink: "#1F1B16", dim: "#8F877A", accent: "#C8352B", light: true }, make: isotype },
  { name: "手账涂鸦", en: "BULLET JOURNAL", fit: "学习方法 · 生活技巧 · 女性向", th: { bg: 0xFBF8F1, ink: "#2B2B2B", dim: "#8A8478", accent: "#2D5BD8", light: true }, make: journal },
  { name: "剪影片头", en: "TITLE SEQUENCE", fit: "悬疑 · 电影史 · 大事件开场", th: { bg: 0xE8562A, ink: "#14110F", dim: "#5A2A18", accent: "#F6EFE3", light: true }, make: titles },
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
    el(s, "abs cn", "left:0;width:1920px;top:300px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +8：第五批");
    STY.forEach((st, i) => el(s, "abs cn", `left:${170 + (i % 4) * 400}px;top:${470 + Math.floor(i / 4) * 140}px;width:370px;padding:22px 0;text-align:center;border-radius:16px;font-size:38px;font-weight:800;color:${st.th.ink};background:#${st.th.bg.toString(16).padStart(6, "0")};border:3px solid ${st.th.accent};`, st.name));
    el(s, "abs cn", "left:0;width:1920px;top:800px;text-align:center;font-size:30px;color:#a8a29a;", "全部代码画面 · 0 积分 · 风格库共 27 套 / 8 个家族");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
