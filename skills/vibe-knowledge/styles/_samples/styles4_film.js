// 风格样片集 · 第四批「增强档 · 东方与印刷」：敦煌壁画、青花、木刻、半调拼贴。同一段开场（复用第 01 期 B01 旁白）。
// 每套 2 张 Renoise mj-v8.2 生图（4 积分/张），其余全部代码：壁画剥落、釉色晕开、刀刻显影、纸片拍入。字、数字、印章一律代码叠加。
import { clamp, lerp, eOutCubic, eInOutCubic, eOutQuint, eOutBack, hit, el, css, rng } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 3.0;
export const meta = { title: "风格样片集 · 增强档东方与印刷", n: "styles4" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const SONG = "font-family:'Songti SC','STSong',serif;";
const KAI = "font-family:'Kaiti SC','STKaiti','KaiTi',serif;";
const VK = (window.__vk ||= { pend: [], async wait() { while (this.pend.length) { const ps = this.pend.splice(0); await Promise.all(ps.map((f) => f())); } } });
const URLOF = (f) => new URL(`./assets/img/${f}`, import.meta.url).href;
// 画布画图要等图解码：没解码完就登记一次「解码后用同一个 t 重画」，录制工具 await __vk.wait() 时会补上
const redraw = (ims, fn, t) => { if (ims.some((i) => !i.complete || !i.naturalWidth)) VK.pend.push(async () => { await Promise.all(ims.map((i) => i.decode().catch(() => {}))); fn(t); }); };
const IMG = (f) => { const im = new Image(); im.src = URLOF(f); const p = im.decode().catch(() => {}); VK.pend.push(() => p); return im; };
const canvas = (s) => { const c = document.createElement("canvas"); c.width = 1920; c.height = 1080; c.style.cssText = "position:absolute;left:0;top:0;"; s.appendChild(c); return [c, c.getContext("2d")]; };
const cover = (g, im, sc = 1, ox = 0, oy = 0) => { const w = 1920 * sc, hh = 1080 * sc; g.drawImage(im, (1920 - w) / 2 + ox, (1080 - hh) / 2 + oy, w, hh); };
const aiTag = (s, light = false) => el(s, "abs mono", `left:40px;bottom:34px;font-size:18px;letter-spacing:2px;padding:4px 10px;border-radius:6px;color:${light ? "#3a342c" : "#fff"};background:${light ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)"};z-index:6;`, "AI 示意图");
const vert = (s, txt, x, y, size, style) => el(s, "abs", `left:${x}px;top:${y}px;writing-mode:vertical-rl;font-size:${size}px;font-weight:900;letter-spacing:${Math.round(size * 0.12)}px;line-height:1.1;white-space:nowrap;${style}`, txt);

// ── 1 敦煌壁画：一层灰泥一块块剥落，露出壁画；五十金那一下，第二幅壁画从另一侧剥出来；金箔字流光。讲法：考古式揭开 ──
function dunhuang(s, h, z, B) {
  const A = IMG("dh1.jpg"), Bm = IMG("dh2.jpg");
  const [, g] = canvas(s);
  const tex = document.createElement("canvas"); tex.width = 1920; tex.height = 1080; const tg = tex.getContext("2d");
  tg.fillStyle = "#E3CFAE"; tg.fillRect(0, 0, 1920, 1080);
  const R = rng(31);
  for (let i = 0; i < 9000; i++) { tg.fillStyle = R() < 0.5 ? "rgba(120,90,60,0.10)" : "rgba(255,248,230,0.16)"; const r = 1 + R() * 3; tg.fillRect(R() * 1920, R() * 1080, r, r); }
  const mk = (ox, oy, seed) => { const Q = rng(seed), out = []; const NX = 16, NY = 9, cw = 120, ch = 120;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const cx = (i + 0.5) * cw + (Q() - 0.5) * 50, cy = (j + 0.5) * ch + (Q() - 0.5) * 50, n = 9;
      const pts = [...Array(n)].map((_, k) => { const a = (k / n) * 6.2832 + (Q() - 0.5) * 0.5, r = (0.62 + Q() * 0.35) * 105; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
      out.push({ cx, cy, pts, key: Math.hypot(cx - ox, cy - oy) / 1500 + Q() * 0.3 }); }
    const ks = out.map((c) => c.key), lo = Math.min(...ks), hi = Math.max(...ks); out.forEach((c) => (c.key = (c.key - lo) / (hi - lo))); return out; };
  const C1 = mk(1250, 520, 7), C2 = mk(1700, 420, 9);
  const poly = (q, c, k) => { q.beginPath(); c.pts.forEach(([x, y], i) => { const X = c.cx + (x - c.cx) * k, Y = c.cy + (y - c.cy) * k; i ? q.lineTo(X, Y) : q.moveTo(X, Y); }); q.closePath(); };
  const pl = document.createElement("canvas"); pl.width = 1920; pl.height = 1080; const pg = pl.getContext("2d");
  const goldCss = "background:linear-gradient(110deg,#7a5518 0%,#e9c86a 30%,#fff1b8 42%,#c99a3a 55%,#7a5518 100%);background-size:320% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;";
  const t1 = vert(s, "南门立木", 150, 170, 92, `${SONG}color:#6B2A1A;`);
  const t2 = vert(s, "赏十金", 300, 230, 120, `${SONG}${goldCss}filter:drop-shadow(0 3px 0 rgba(90,50,20,0.5));`);
  const t3 = vert(s, "没人动", 470, 300, 84, `${SONG}color:#2F6B5E;`);
  const cart = el(s, "abs", "left:200px;top:120px;width:250px;height:720px;background:rgba(52,24,15,0.88);border:4px solid #C99A3A;outline:2px solid rgba(201,154,58,0.5);outline-offset:6px;border-radius:6px;");
  const t4 = vert(s, "五十金", 230, 160, 190, `${SONG}${goldCss}`);
  aiTag(s);
  return function draw(t) {
    redraw([A, Bm], draw, t);
    const F = t >= B.fifty, kb = clamp((t - h) / (z - h));
    cover(g, A, 1.02 + 0.05 * kb, -30 * kb, 0);
    if (F) { // 第二幅壁画按格剥出
      const p = clamp((t - B.fifty) / 0.55);
      if (p >= 1) cover(g, Bm, 1.03 + 0.04 * clamp((t - B.fifty) / (z - B.fifty)));
      else { g.save(); g.beginPath(); for (const c of C2) { const k = clamp((p - c.key * 0.85) / 0.15); if (k <= 0) continue; c.pts.forEach(([x, y], i) => { const X = c.cx + (x - c.cx) * k, Y = c.cy + (y - c.cy) * k; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); } g.clip(); cover(g, Bm, 1.03); g.restore(); }
    }
    // 第一层灰泥：从中心往外一块块剥掉
    const p1 = clamp((t - h - 0.05) / 1.5), plA = 1 - clamp((t - h - 1.6) / 0.35);
    if (plA > 0) { // 灰泥画在离屏层上，再用 destination-out 挖掉已剥落的格子（重叠也不会补回来）
      pg.globalCompositeOperation = "source-over"; pg.clearRect(0, 0, 1920, 1080); pg.drawImage(tex, 0, 0);
      pg.globalCompositeOperation = "destination-out";
      for (const c of C1) { const k = clamp((p1 - c.key * 0.85) / 0.15); if (k > 0) { poly(pg, c, k); pg.fill(); } }
      pg.globalCompositeOperation = "source-over"; pg.strokeStyle = "rgba(90,60,35,0.5)"; pg.lineWidth = 3;
      for (const c of C1) { const k = clamp((p1 - c.key * 0.85) / 0.15); if (k > 0) { poly(pg, c, k); pg.stroke(); } }
      g.globalAlpha = plA; g.drawImage(pl, 0, 0); g.globalAlpha = 1;
    }
    const sh = ((t * 0.35) % 1) * 220; for (const n of [t2, t4]) css(n, { backgroundPosition: `${(220 - sh).toFixed(1)}% 0` });
    css(t1, { opacity: String(clamp((t - h - 0.7) / 0.3) * (F ? 0 : 1)) });
    css(t2, { opacity: String(t >= B.ten && !F ? clamp((t - B.ten) / 0.2) : 0), transform: `translateY(${((1 - eOutCubic(clamp((t - B.ten) / 0.3))) * 30).toFixed(1)}px)` });
    css(t3, { opacity: String(t >= B.nobody && !F ? clamp((t - B.nobody) / 0.15) : 0) });
    css(cart, { opacity: String(F ? clamp((t - B.fifty - 0.15) / 0.25) : 0) });
    css(t4, { opacity: String(F ? clamp((t - B.fifty - 0.2) / 0.3) : 0), transform: `scale(${lerp(1.15, 1, eOutCubic(clamp((t - B.fifty - 0.2) / 0.4))).toFixed(3)})` });
  };
}

// ── 2 青花：白瓷底上，钴蓝像墨滴进水里一样从一点晕开成画；字用钴蓝楷书，先糊后清（釉下发色）。讲法：晕染揭示 ──
function qinghua(s, h, z, B) {
  el(s, "abs", "inset:0;background:#F7F6F1;");
  const im = (f) => { IMG(f); return el(s, "abs", `inset:0;background:url(${URLOF(f)}) center/cover;will-change:transform;`); };
  const p1 = im("qh1.jpg"), p2 = im("qh2.jpg");
  const mask = (n, x, y, r) => { const m = `radial-gradient(circle at ${x}px ${y}px, #000 ${Math.max(0, r - 260).toFixed(0)}px, rgba(0,0,0,0.6) ${Math.max(0, r - 120).toFixed(0)}px, transparent ${r.toFixed(0)}px)`; css(n, { maskImage: m, webkitMaskImage: m }); };
  const BLUE = "#1C3F94";
  const bleed = (n, t, a) => { const k = clamp((t - a) / 0.45); css(n, { opacity: String(t < a ? 0 : Math.min(1, k * 1.6)), filter: `blur(${((1 - eOutCubic(k)) * 10).toFixed(2)}px)` }); };
  const t1 = vert(s, "南门立木", 140, 150, 90, `${KAI}color:${BLUE};`);
  const t2 = vert(s, "赏十金", 290, 210, 120, `${KAI}color:${BLUE};`);
  const seal = el(s, "abs", `left:430px;top:560px;width:150px;height:150px;border:7px solid ${BLUE};border-radius:12px;display:flex;align-items:center;justify-content:center;${KAI}font-size:52px;font-weight:900;color:${BLUE};line-height:1.05;text-align:center;transform:rotate(-6deg);`, "没人<br>动");
  const t4 = vert(s, "五十金", 170, 140, 200, `${KAI}color:${BLUE};text-shadow:0 0 1px ${BLUE};`);
  aiTag(s, true);
  return (t) => {
    const F = t >= B.fifty, kb = clamp((t - h) / (z - h));
    css(p1, { transform: `scale(${(1.02 + 0.05 * kb).toFixed(4)})`, opacity: String(F ? 1 - clamp((t - B.fifty - 0.5) / 0.2) : 1) });
    mask(p1, 1000, 640, lerp(0, 2200, eInOutCubic(clamp((t - h) / 1.6))));
    css(p2, { opacity: String(F ? 1 : 0), transform: `scale(${(1.04 + 0.04 * clamp((t - B.fifty) / (z - B.fifty))).toFixed(4)})` });
    mask(p2, 1480, 430, lerp(0, 2300, eInOutCubic(clamp((t - B.fifty) / 0.9))));
    bleed(t1, t, h + 0.6); if (F) css(t1, { opacity: "0" });
    bleed(t2, t, B.ten); if (F) css(t2, { opacity: "0" });
    css(seal, { opacity: String(t >= B.nobody && !F ? 1 : 0), transform: `rotate(-6deg) scale(${lerp(1.5, 1, eOutCubic(clamp((t - B.nobody) / 0.14))).toFixed(3)})` });
    bleed(t4, t, B.fifty + 0.25);
  };
}

// ── 3 木刻：黑白版画一刀一刀刻出来（刀痕方向跟着画面斜线）；红色木刻印压字；五十金硬切第二版并顿一下。讲法：刀刻显影 ──
function woodcut(s, h, z, B) {
  el(s, "abs", "inset:0;background:#EFE6D2;");
  const A = IMG("mk1.jpg"), Bm = IMG("mk2.jpg");
  const [, g] = canvas(s);
  const R = rng(17), N = 340;
  const st = [...Array(N)].map((_, i) => { const diag = R() < 0.7, ang = diag ? -0.62 + (R() - 0.5) * 0.5 : R() * 3.14; return { x: 180 + R() * 1700, y: 60 + R() * 980, ang, L: 160 + R() * 380, w: 14 + R() * 30, t0: Math.pow(i / N, 0.85) * 1.25 }; });
  const wedge = (o, k) => { const L = o.L * k, ca = Math.cos(o.ang), sa = Math.sin(o.ang), nx = -sa * o.w / 2, ny = ca * o.w / 2, x0 = o.x - ca * o.L / 2, y0 = o.y - sa * o.L / 2;
    g.moveTo(x0 + nx, y0 + ny); g.lineTo(x0 + ca * L, y0 + sa * L); g.lineTo(x0 - nx, y0 - ny); g.closePath(); };
  const RED = "#C8102E";
  const t1 = vert(s, "南门立木", 70, 170, 84, `${SONG}color:#141210;`);
  const blk = (txt, x, y, size, bgc, c) => el(s, "abs", `left:${x}px;top:${y}px;writing-mode:vertical-rl;padding:16px 10px;background:${bgc};color:${c};${SONG}font-size:${size}px;font-weight:900;letter-spacing:6px;line-height:1.1;`, txt);
  const t2 = blk("赏十金", 1500, 120, 92, RED, "#F6EEDC"), t3 = blk("没人动", 1650, 300, 80, "#141210", "#F6EEDC"), t4 = blk("五十金", 60, 150, 150, RED, "#F6EEDC");
  aiTag(s, true);
  return function draw(t) {
    redraw([A, Bm], draw, t);
    const F = t >= B.fifty;
    g.clearRect(0, 0, 1920, 1080);
    if (!F) {
      const u = t - h - 0.05, full = clamp((u - 1.3) / 0.3);
      if (full < 1) { g.save(); g.beginPath(); for (const o of st) { const k = clamp((u - o.t0) / 0.12); if (k > 0) wedge(o, eOutCubic(k)); } g.clip(); cover(g, A, 1.03); g.restore(); }
      if (full > 0) { g.globalAlpha = full; cover(g, A, 1.03 + 0.03 * clamp((t - h - 1.5) / 3)); g.globalAlpha = 1; }
    } else cover(g, Bm, lerp(1.1, 1.02, eOutCubic(clamp((t - B.fifty) / 0.28))) + 0.02 * clamp((t - B.fifty - 0.3) / 2.5));
    css(t1, { opacity: String(F ? 0 : clamp((t - h - 0.8) / 0.2)) });
    const stamp = (n, a, on) => css(n, { opacity: String(on && t >= a ? 1 : 0), transform: `scale(${lerp(1.5, 1, eOutCubic(clamp((t - a) / 0.12))).toFixed(3)}) rotate(-2deg)` });
    stamp(t2, B.ten, !F); stamp(t3, B.nobody, !F); stamp(t4, B.fifty + 0.3, F);
  };
}

// ── 4 半调拼贴：原图拆成「底 + 主体」两层，主体纸片拍下来（slap），胶带、纸条、半调大数字、红印章；五十金整页推走换下一页。讲法：桌面拼贴 ──
function collage(s, h, z, B) {
  const page = (bgf, fgf) => { IMG(bgf); IMG(fgf); const p = el(s, "abs", "inset:0;overflow:hidden;"); const b = el(p, "abs", `inset:0;background:url(${URLOF(bgf)}) center/cover;`); const f = el(p, "abs", `inset:0;background:url(${URLOF(fgf)}) center/cover;filter:drop-shadow(10px 14px 0 rgba(30,20,10,0.28));`); return { p, b, f }; };
  const P1 = page("cut/vx1_bg.jpg", "cut/vx1_fg.png"), P2 = page("cut/vx2_bg.jpg", "cut/vx2_fg.png");
  const R = rng(13);
  const jag = (w, hh, j = 7) => { const pts = []; for (let x = 0; x <= w; x += 22) pts.push([x, R() * j]); for (let y = 0; y <= hh; y += 22) pts.push([w - R() * j, y]); for (let x = w; x >= 0; x -= 22) pts.push([x, hh - R() * j]); for (let y = hh; y >= 0; y -= 22) pts.push([R() * j, y]); return `polygon(${pts.map(([x, y]) => `${x.toFixed(0)}px ${y.toFixed(0)}px`).join(",")})`; };
  const scrap = (p, txt, x, y, size, w, hh, bgc = "#F4ECDD", c = "#1d1a16", rot = -2) => { const wr = el(p, "abs", `left:${x}px;top:${y}px;filter:drop-shadow(6px 8px 0 rgba(30,20,10,0.25));transform:rotate(${rot}deg);`); el(wr, "cn", `width:${w}px;height:${hh}px;background:${bgc};clip-path:${jag(w, hh)};display:flex;align-items:center;justify-content:center;font-size:${size}px;font-weight:900;color:${c};letter-spacing:4px;`, txt); return wr; };
  const tape = (p, x, y, w, rot) => el(p, "abs", `left:${x}px;top:${y}px;width:${w}px;height:46px;background:rgba(238,226,190,0.78);transform:rotate(${rot}deg);box-shadow:0 2px 4px rgba(0,0,0,0.12);`);
  const s1 = scrap(P1.p, "一根木头", 230, 170, 92, 520, 150), s2 = scrap(P1.p, "南门 → 北门", 260, 360, 54, 440, 96, "#D63A2F", "#F4ECDD", 3);
  const ta = tape(P1.p, 380, 140, 220, -8), tb = tape(P1.p, 1500, 220, 200, 12);
  const half = (p, txt, x, y, size, col) => { const w = el(p, "abs", `left:${x}px;top:${y}px;`); el(w, "abs", `left:12px;top:12px;font-family:Geist;font-size:${size}px;font-weight:900;line-height:1;color:#1d1a16;white-space:nowrap;letter-spacing:-8px;`, txt); el(w, "", `position:relative;font-family:Geist;font-size:${size}px;font-weight:900;line-height:1;white-space:nowrap;letter-spacing:-8px;color:transparent;background-image:radial-gradient(${col} 46%,transparent 50%);background-size:11px 11px;-webkit-background-clip:text;background-clip:text;`, txt); return w; };
  const n10 = half(P1.p, "10", 240, 470, 330, "#D63A2F"), k10 = scrap(P1.p, "金", 640, 640, 110, 170, 170, "#1d1a16", "#F4ECDD", 4);
  const stamp = el(P1.p, "abs cn", "left:300px;top:840px;padding:2px 26px;border:9px solid #D63A2F;color:#D63A2F;font-size:92px;font-weight:900;transform:rotate(-9deg);opacity:0.92;", "没人动");
  const n50 = half(P2.p, "50", 150, 230, 380, "#D63A2F"), k50 = scrap(P2.p, "金", 600, 450, 130, 200, 200, "#1d1a16", "#F4ECDD", -4);
  const x5 = scrap(P2.p, "直接翻五倍", 160, 690, 64, 460, 110, "#F4ECDD", "#D63A2F", 2), tc = tape(P2.p, 140, 214, 200, -14);
  aiTag(s, true);
  const slap = (n, t, a, d = 0.22, rot = -6, base = "") => { const k = clamp((t - a) / d); css(n, { opacity: String(t >= a ? 1 : 0), transform: `${base} scale(${lerp(1.18, 1, eOutCubic(k)).toFixed(3)}) rotate(${lerp(rot, 0, eOutCubic(k)).toFixed(2)}deg)` }); };
  const slide = (n, t, a, dx, dy, rot) => { const k = eOutQuint(clamp((t - a) / 0.3)); css(n, { opacity: String(t >= a ? 1 : 0), transform: `translate(${((1 - k) * dx).toFixed(1)}px,${((1 - k) * dy).toFixed(1)}px) rotate(${rot}deg)` }); };
  return (t) => {
    const F = t >= B.fifty, kb = clamp((t - h) / (z - h));
    css(P1.p, { transform: `translateX(${(-eInOutCubic(clamp((t - B.fifty) / 0.35)) * 1920).toFixed(1)}px) scale(${(1.0 + 0.03 * kb).toFixed(4)})` });
    css(P2.p, { transform: `translateX(${((1 - eInOutCubic(clamp((t - B.fifty) / 0.35))) * 1920).toFixed(1)}px)`, opacity: String(t >= B.fifty - 0.01 ? 1 : 0) });
    slap(P1.f, t, h + 0.15, 0.22, -5);
    slide(s1, t, h + 0.45, -700, 0, -2); slide(s2, t, h + 0.95, -700, 0, 3);
    slide(ta, t, h + 0.6, 0, -300, -8); slide(tb, t, h + 0.3, 400, 0, 12);
    css(s1, { opacity: String(t >= h + 0.45 && t < B.ten ? 1 : 0) }); css(s2, { opacity: String(t >= h + 0.95 && t < B.ten ? 1 : 0) });
    slap(n10, t, B.ten, 0.2, 5); slap(k10, t, B.ten + 0.12, 0.2, 10);
    slap(stamp, t, B.nobody, 0.12, -14); if (F) css(stamp, { opacity: "0" });
    const k2 = clamp((t - B.fifty - 0.2) / 0.3); css(P2.f, { transform: `translateY(${((1 - eOutBack(k2)) * 380).toFixed(1)}px)`, opacity: String(t >= B.fifty + 0.2 ? 1 : 0) });
    slap(n50, t, B.fifty + 0.35, 0.2, -5); slap(k50, t, B.fifty + 0.48, 0.2, -10); slide(x5, t, B.fifty + 0.75, -600, 0, 2); slide(tc, t, B.fifty + 0.6, 0, -300, -14);
  };
}

const STY = [
  { name: "敦煌壁画", en: "DUNHUANG MURAL", fit: "丝路 · 佛教史 · 中外交流", th: { bg: 0x2A1712, ink: "#F3E6CC", dim: "#B49A78", accent: "#E9C86A" }, make: dunhuang },
  { name: "青花", en: "BLUE & WHITE", fit: "器物 · 海上丝路 · 明清文化", th: { bg: 0xF7F6F1, ink: "#1C3F94", dim: "#6A7AA8", accent: "#1C3F94", light: true }, make: qinghua },
  { name: "木刻", en: "WOODCUT", fit: "变法 · 起义 · 硬核历史转折", th: { bg: 0xEFE6D2, ink: "#141210", dim: "#6F665A", accent: "#C8102E", light: true }, make: woodcut },
  { name: "半调拼贴", en: "HALFTONE COLLAGE", fit: "社会 · 经济 · 历史机制（Vox 式）", th: { bg: 0xE9A85A, ink: "#1D1A16", dim: "#6B4A2A", accent: "#D63A2F", light: true }, make: collage },
];

export async function build(ctx) {
  const N = ctx.narr, T = (k) => N.t(k), END = N.total, SEG = END / STY.length;
  const shots = [];
  const add = (from, to, b, r) => shots.push({ from, to, build: b, render: r });
  sections.push({ t: 0, t_to: END + TAIL, level: 1 });
  STY.forEach((st, i) => {
    const a = i * SEG, h = a + 1.8, z = (i + 1) * SEG, B = beatsOf(T, `B${String(i + 1).padStart(2, "0")}`);
    sfx.push({ t: a + 0.15, type: "whoosh" }, { t: B.nobody, type: "tick" }, { t: B.fifty, type: "slam" });
    const hx = `#${st.th.bg.toString(16).padStart(6, "0")}`;
    add(a, h, (root) => {
      const s = el(root, "shot");
      el(s, "abs", `inset:0;background:${hx};`);
      const no = el(s, "abs", `left:0;width:1920px;top:340px;text-align:center;font-family:Geist;font-size:26px;letter-spacing:10px;color:${st.th.dim};`, `ENHANCED STYLE ${i + 1} / ${STY.length} · ${st.en}`);
      const nm = el(s, "abs cn", `left:0;width:1920px;top:400px;text-align:center;font-size:150px;font-weight:900;color:${st.th.ink};letter-spacing:12px;`, st.name);
      const ft = el(s, "abs cn", `left:0;width:1920px;top:600px;text-align:center;font-size:40px;color:${st.th.accent};letter-spacing:3px;`, `适合：${st.fit}`);
      const cr = el(s, "abs cn", `left:0;width:1920px;top:680px;text-align:center;font-size:26px;color:${st.th.dim};`, "增强档 · 本段 2 张 Renoise 生图（8 积分），动效全部代码");
      return { s, ns: [no, nm, ft, cr] };
    }, (t, u) => {
      bg(ctx, st.th, { bloom: 0, vig: st.th.light ? 0.12 : 0.4 });
      const k = eOutCubic(clamp((t - a) / 0.4)), o = 1 - clamp((t - h + 0.25) / 0.25);
      u.ns.forEach((n) => css(n, { opacity: String(k * o), transform: `translateY(${((1 - k) * 20).toFixed(1)}px)` }));
    });
    add(h, z, (root) => { const s = el(root, "shot"); return { s, draw: st.make(s, h, z, B) }; }, (t, u) => { bg(ctx, st.th, { bloom: 0, vig: 0.25, grain: 0.02 }); u.draw(t); });
  });
  add(END, END + TAIL, (root) => {
    const s = el(root, "shot");
    el(s, "abs", "inset:0;background:#0B0A0C;");
    el(s, "abs cn", "left:0;width:1920px;top:320px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +4：增强档 · 东方与印刷");
    STY.forEach((st, i) => el(s, "abs cn", `left:${170 + i * 400}px;top:500px;width:370px;padding:22px 0;text-align:center;border-radius:16px;font-size:40px;font-weight:800;color:${st.th.ink};background:#${st.th.bg.toString(16).padStart(6, "0")};border:3px solid ${st.th.accent};`, st.name));
    el(s, "abs cn", "left:0;width:1920px;top:680px;text-align:center;font-size:30px;color:#a8a29a;", "每套 2 张生图（mj-v8.2，4 积分/张）· 剥落 / 晕开 / 刀刻 / 拍入全是代码");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
