// 风格样片集 · 第八批：田园像素（暖色农场像素 RPG，气质参考《星露谷物语》；画面、角色、界面、字体全部原创，不用其素材 / Logo）。
// 同一段开场（复用第 01 期 B01 旁白），0 积分。320×180 像素画放大 6 倍；木框 HUD（季节 · 日 · 10 分钟一跳的时钟 · 金币）、羊皮纸对话框 + 像素头像、「…」气泡、举过头顶 + 获得提示。
import { clamp, lerp, eOutCubic, eOutBack, el, css, rng } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 2.6;
export const meta = { title: "风格样片集 · 田园像素", n: "styles8" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const val = (t, B) => (t < B.ten ? 0 : t < B.fifty ? Math.round(10 * eOutCubic(clamp((t - B.ten) / 0.4))) : Math.round(lerp(10, 50, eOutCubic(clamp((t - B.fifty) / 0.6)))));
const typed = (txt, t, a, cps = 20) => (t < a ? "" : txt.slice(0, Math.floor((t - a) * cps)));
const S6 = 6; // 像素放大倍数
const WOOD = "border:6px solid #5C3317;box-shadow:inset 0 0 0 4px #C98A43,0 6px 0 rgba(40,20,5,0.45);background:#F2D49B;border-radius:6px;";
const TXT = "font-family:NotoSC;font-weight:900;color:#4A2A12;text-shadow:2px 2px 0 #E7B871;";

// ── 田园像素：春天的农场村庄；讲法 = 游戏里的一天（时钟在走、金币在涨、NPC 在观望，最后主角把东西举过头顶） ──
function farm(s, h, z, B) {
  const cv = document.createElement("canvas"); cv.width = 320; cv.height = 180; cv.style.cssText = "position:absolute;left:0;top:0;width:1920px;height:1080px;image-rendering:pixelated;"; s.appendChild(cv);
  const g = cv.getContext("2d");
  const P = (x, y, w, hh, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, hh); };
  const R = rng(17);
  const tufts = [...Array(140)].map(() => [Math.floor(R() * 320), Math.floor(R() * 180)]);
  const flowers = [...Array(26)].map(() => [Math.floor(R() * 320), 40 + Math.floor(R() * 130), R() < 0.5 ? "#F7E26B" : "#F59AB6"]);
  const petals = [...Array(24)].map(() => ({ x: R() * 340, y: R() * 180, v: 6 + R() * 8, p: R() * 6 }));
  const tree = (x, y) => { P(x + 6, y + 14, 4, 8, "#7A4A26"); P(x, y + 2, 16, 12, "#3E8E3A"); P(x + 2, y, 12, 16, "#3E8E3A"); P(x + 2, y + 2, 8, 5, "#5DB04A"); P(x + 3, y + 3, 3, 2, "#86CF5E"); };
  const gate = (x, label) => { P(x, 66, 30, 40, "#9AA0A6"); P(x + 2, 68, 26, 36, "#B9BEC2"); P(x + 9, 82, 12, 24, "#4A3322"); P(x + 9, 80, 12, 3, "#4A3322"); P(x - 3, 60, 36, 7, "#8A3B2A"); P(x - 1, 58, 32, 3, "#A84A34"); for (let i = 0; i < 6; i++) P(x + 2 + i * 5, 72 + (i % 2) * 8, 3, 2, "#9AA0A6"); };
  const person = (x, y, shirt, hair, hat = false, bob = 0, arms = false) => {
    y -= bob; P(x + 1, y + 15, 2, 4, "#3B2A1E"); P(x + 5, y + 15, 2, 4, "#3B2A1E");
    P(x, y + 8, 8, 8, shirt); P(x + 1, y + 2, 6, 6, "#F2C9A0"); P(x + 1, y + 1, 6, 2, hair); P(x + 2, y + 4, 1, 1, "#3B2A1E"); P(x + 5, y + 4, 1, 1, "#3B2A1E");
    if (hat) { P(x - 2, y + 1, 12, 2, "#E8C35A"); P(x + 1, y - 2, 6, 3, "#E8C35A"); P(x + 1, y, 6, 1, "#C9533B"); }
    if (arms) { P(x - 1, y + 1, 2, 8, shirt); P(x + 7, y + 1, 2, 8, shirt); } else { P(x - 1, y + 9, 2, 5, shirt); P(x + 7, y + 9, 2, 5, shirt); }
  };
  const VIL = [[204, 104, "#C9533B", "#5A3A22"], [214, 112, "#4F7FC9", "#2A1E14"], [252, 110, "#8E5BB5", "#C98A43"], [262, 102, "#3E9E7A", "#5A3A22"], [196, 116, "#D98A2B", "#2A1E14"]];
  // DOM：路牌、HUD、对话框、气泡、获得提示
  const sign = (txt, x) => el(s, "abs", `left:${x}px;top:330px;padding:4px 14px;${WOOD}${TXT}font-size:30px;`, txt);
  sign("北门", 50); sign("南门", 1640);
  const hud = el(s, "abs", `left:1490px;top:30px;width:380px;height:150px;${WOOD}`);
  const day = el(hud, "abs", `left:22px;top:14px;${TXT}font-size:36px;`, "春 · 1 日");
  const clock = el(hud, "abs", `left:22px;top:70px;${TXT}font-size:40px;font-family:GeistMono,NotoSC;`);
  const dial = el(hud, "abs", "right:22px;top:18px;width:90px;height:90px;border-radius:50%;background:conic-gradient(#F7C948 0 50%,#2A3F7A 50% 100%);border:5px solid #5C3317;");
  const hand = el(dial, "abs", "left:42px;top:6px;width:6px;height:40px;background:#5C3317;transform-origin:50% 100%;border-radius:3px;");
  const goldBox = el(s, "abs", `left:1590px;top:196px;width:280px;height:70px;${WOOD}`);
  el(goldBox, "abs", "left:18px;top:13px;width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFF3A0,#F2B21B 60%,#B07A10);border:3px solid #7A4E10;");
  const gold = el(goldBox, "abs", `right:20px;top:6px;${TXT}font-family:GeistMono,NotoSC;font-size:44px;letter-spacing:4px;`);
  const box = el(s, "abs", `left:200px;top:735px;width:1520px;height:215px;${WOOD}background:#F6E3B4;`);
  const txt = el(box, "abs", `left:40px;top:30px;width:1120px;${TXT}font-size:50px;line-height:1.5;`);
  const arrow = el(box, "abs", "left:1120px;bottom:24px;width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:20px solid #5C3317;");
  const port = document.createElement("canvas"); port.width = 32; port.height = 32; port.style.cssText = "position:absolute;left:1290px;top:16px;width:150px;height:150px;image-rendering:pixelated;border:5px solid #5C3317;background:#B7DDF0;box-sizing:content-box;"; box.appendChild(port);
  const pg = port.getContext("2d"); const PP = (x, y, w, hh, c) => { pg.fillStyle = c; pg.fillRect(x, y, w, hh); };
  PP(0, 22, 32, 10, "#6DB54A"); PP(8, 18, 16, 14, "#8A3B2A"); PP(10, 6, 12, 13, "#F2C9A0"); PP(9, 2, 14, 5, "#2A1E14"); PP(7, 6, 18, 2, "#2A1E14"); PP(13, 11, 2, 2, "#2A1E14"); PP(18, 11, 2, 2, "#2A1E14"); PP(14, 15, 5, 1, "#B0533B"); PP(12, 19, 8, 4, "#E8C35A");
  const name = el(box, "abs", `left:1300px;top:160px;padding:0 14px;${WOOD}${TXT}font-size:26px;`, "告示官");
  const bubbles = VIL.slice(0, 4).map(([x, y]) => el(s, "abs", `left:${(x - 2) * S6}px;top:${(y - 14) * S6}px;padding:0 10px;height:46px;line-height:40px;background:#FFFFFF;border:4px solid #3B2A1E;border-radius:8px;font-family:Geist;font-weight:900;font-size:34px;color:#3B2A1E;`, "…"));
  const toast = el(s, "abs", `left:40px;top:640px;width:400px;height:96px;${WOOD}`);
  el(toast, "abs", "left:20px;top:18px;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFF3A0,#F2B21B 60%,#B07A10);border:3px solid #7A4E10;");
  el(toast, "abs", `left:90px;top:16px;${TXT}font-size:44px;`, "获得 +50 金");
  const LINES = [[h + 0.2, "南门立了一根木头。"], [B.ten - 0.05, "把它搬到北门的，赏 10 金！"], [B.nobody, "……村民们都在观望。"], [B.fifty, "赏金涨到 50 金了！"]];
  return (t) => {
    const F = t >= B.fifty;
    // 地面
    P(0, 0, 320, 180, "#6DB54A"); for (const [x, y] of tufts) { P(x, y, 2, 1, "#57A03C"); P(x + 1, y - 1, 1, 1, "#57A03C"); }
    P(0, 0, 320, 30, "#5DA846"); for (let x = 0; x < 320; x += 14) tree(x - 4 + ((x / 14) % 2) * 3, -6 + ((x / 14) % 3) * 4);
    for (let x = 0; x < 320; x += 6) { P(x, 36, 2, 8, "#C08A52"); } P(0, 38, 320, 1, "#8A5A30"); P(0, 42, 320, 1, "#8A5A30");
    P(0, 106, 320, 16, "#C89A5E"); P(0, 106, 320, 1, "#A97B45"); P(0, 121, 320, 1, "#A97B45"); P(186, 96, 100, 30, "#C89A5E");
    P(10, 132, 120, 40, "#8A5A34"); for (let r = 0; r < 4; r++) { P(12, 136 + r * 9, 116, 2, "#6E4426"); for (let c = 0; c < 14; c++) { const x = 16 + c * 8, y = 132 + r * 9; P(x, y, 2, 3, "#5DBE3B"); P(x - 1, y - 1, 1, 1, "#86CF5E"); P(x + 2, y - 1, 1, 1, "#86CF5E"); } }
    for (const [x, y, c] of flowers) if (y < 104 || y > 124) P(x, y, 1, 1, c);
    gate(4, "北门"); gate(286, "南门");
    // 告示板 + 木头
    P(238, 82, 18, 12, "#8A5A30"); P(240, 84, 14, 8, "#F6E3B4"); P(242, 86, 10, 1, "#8A5A30"); P(242, 88, 8, 1, "#8A5A30"); P(240, 94, 2, 10, "#5C3317"); P(252, 94, 2, 10, "#5C3317");
    const pickT = B.fifty + 1.0, walkA = B.fifty + 0.25, walkB = B.fifty + 0.95;
    const carried = t >= pickT;
    if (!carried) { P(230, 58, 4, 48, "#9A6230"); P(230, 58, 1, 48, "#C08A52"); P(229, 104, 6, 2, "#5C3317"); }
    // 村民
    VIL.forEach(([x, y, c, hc], i) => person(x, y, c, hc, false, Math.floor((t * 2 + i) % 2)));
    // 主角
    let px = 150, py = 100;
    if (t >= walkA) { const k = clamp((t - walkA) / (walkB - walkA)); px = lerp(150, 222, k); }
    if (carried) { const k = clamp((t - pickT - 0.5) / 2.2); px = lerp(222, 120, k); }
    const step = t >= walkA && t < walkB || (carried && t > pickT + 0.5) ? Math.floor(t * 8) % 2 : 0;
    person(px, py, "#3D6FB8", "#7A4A26", true, step, carried);
    if (carried) { P(px - 14, py - 8, 36, 4, "#9A6230"); P(px - 14, py - 8, 36, 1, "#C08A52"); if (t < pickT + 0.6) for (let i = 0; i < 5; i++) P(px - 10 + i * 8, py - 16 - ((t * 30 + i * 3) % 6), 2, 2, "#FFF3A0"); }
    // 花瓣
    for (const p of petals) { const y = (p.y + t * p.v) % 190 - 5, x = (p.x - t * 10 + Math.sin(t * 2 + p.p) * 6 + 340) % 340 - 10; P(x, y, 2, 1, "#F7B6CB"); }
    // 暖光
    g.fillStyle = "rgba(255,190,90,0.07)"; g.fillRect(0, 0, 320, 180);
    // HUD
    const mins = 6 * 60 + 20 + Math.floor(Math.max(0, t - h) / 0.7) * 10, hh = Math.floor(mins / 60), mm = mins % 60;
    clock.textContent = `${hh}:${String(mm).padStart(2, "0")} 上午`;
    css(hand, { transform: `rotate(${(-90 + ((mins - 360) / 720) * 180).toFixed(1)}deg)` });
    gold.textContent = String(val(t, B)).padStart(4, " ");
    css(goldBox, { transform: `scale(${(1 + 0.08 * Math.max(0, 1 - Math.abs(t - B.fifty - 0.3) / 0.3)).toFixed(3)})` });
    // 对话
    const L = [...LINES].reverse().find(([a]) => t >= a);
    txt.textContent = L ? typed(L[1], t, L[0], 22) : "";
    css(arrow, { opacity: String(L && t - L[0] > L[1].length / 22 && Math.floor(t * 3) % 2 ? 1 : 0) });
    css(box, { opacity: String(t >= h + 0.1 ? 1 : 0), transform: `translateY(${((1 - eOutCubic(clamp((t - h - 0.1) / 0.25))) * 300).toFixed(0)}px)` });
    css(name, { opacity: "1" });
    bubbles.forEach((b, i) => { const a = B.nobody + i * 0.08; css(b, { opacity: String(t >= a && !F ? 1 : 0), transform: `scale(${eOutBack(clamp((t - a) / 0.2)).toFixed(3)})` }); });
    const kt = eOutCubic(clamp((t - pickT - 0.2) / 0.3)); css(toast, { opacity: String(t >= pickT + 0.2 ? 1 : 0), transform: `translateX(${((1 - kt) * -460).toFixed(0)}px)` });
  };
}

const ST = { name: "田园像素", en: "COZY FARM", fit: "农业 · 生活经营 · 游戏化讲解（星露谷式）", th: { bg: 0x6DB54A, ink: "#3B2A1E", dim: "#2F5E22", accent: "#F2D49B", light: true } };

export async function build(ctx) {
  const N = ctx.narr, T = (k) => N.t(k), END = N.total;
  const shots = [];
  const add = (from, to, b, r) => shots.push({ from, to, build: b, render: r });
  sections.push({ t: 0, t_to: END + TAIL, level: 1 });
  const a = 0, h = 1.8, z = END, B = beatsOf(T, "B01");
  sfx.push({ t: 0.15, type: "whoosh" }, { t: B.nobody, type: "tick" }, { t: B.fifty, type: "slam" });
  add(a, h, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#6DB54A;");
    el(s, "abs", "left:0;width:1920px;top:340px;text-align:center;font-family:Geist;font-size:26px;letter-spacing:10px;color:#2F5E22;", "NEW STYLE · COZY FARM");
    const card = el(s, "abs", `left:560px;top:390px;width:800px;height:280px;${WOOD}`);
    el(card, "abs cn", "left:0;width:788px;top:40px;text-align:center;font-size:130px;font-weight:900;color:#4A2A12;text-shadow:4px 4px 0 #E7B871;letter-spacing:12px;", ST.name);
    el(s, "abs cn", "left:0;width:1920px;top:700px;text-align:center;font-size:38px;font-weight:700;color:#FFF6D8;text-shadow:3px 3px 0 #2F5E22;", `适合：${ST.fit}`);
    return { s, ns: [...s.children] };
  }, (t, u) => {
    bg(ctx, ST.th, { bloom: 0, vig: 0.12 });
    const k = eOutCubic(clamp((t - a) / 0.4)), o = 1 - clamp((t - h + 0.25) / 0.25);
    u.ns.slice(1).forEach((n) => css(n, { opacity: String(k * o), transform: `translateY(${((1 - k) * 20).toFixed(1)}px)` }));
  });
  add(h, z, (root) => { const s = el(root, "shot"); return { s, draw: farm(s, h, z, B) }; }, (t, u) => { bg(ctx, ST.th, { bloom: 0, vig: 0.15, grain: 0 }); u.draw(t); });
  add(END, END + TAIL, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#0B0A0C;");
    el(s, "abs cn", "left:0;width:1920px;top:380px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +1：田园像素");
    el(s, "abs cn", "left:0;width:1920px;top:520px;text-align:center;font-size:30px;color:#a8a29a;", "共 38 套 · 8 个家族 · 气质参考星露谷式农场游戏，画面与界面全部原创");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
