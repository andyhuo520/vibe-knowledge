// 风格样片集 · 第七批「增强档」：长卷、铜版博物。同一段开场（复用第 01 期 B01 旁白）。
// 长卷：Nano Banana 2 出 4:1 全卷 + 16:9 局部（12 积分/张）；铜版：mj-v8.2 图版 + 标本页（4 积分/张）。展卷、横移、放大镜、刻线显影、淡彩渗入、翻页全是代码。
import { clamp, lerp, eOutCubic, eInOutCubic, eOutQuint, eOutBack, el, css, rng } from "../../cine/engine/util.js";
import { bg } from "../../cine/engine/know.js";

export const COLD = 0;
export const TAIL = 2.6;
export const meta = { title: "风格样片集 · 第七批增强档", n: "styles7" };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const beatsOf = (T, id) => ({ ten: T(`${id}.ten`), nobody: T(`${id}.nobody`), fifty: T(`${id}.fifty`) });
const SONG = "font-family:'Songti SC','STSong',serif;";
const VK = (window.__vk ||= { pend: [], async wait() { while (this.pend.length) { const ps = this.pend.splice(0); await Promise.all(ps.map((f) => f())); } } });
const URLOF = (f) => new URL(`./assets/img/${f}`, import.meta.url).href;
const IMG = (f) => { const im = new Image(); im.src = URLOF(f); const p = im.decode().catch(() => {}); VK.pend.push(() => p); return im; };
const redraw = (ims, fn, t) => { if (ims.some((i) => !i.complete || !i.naturalWidth)) VK.pend.push(async () => { await Promise.all(ims.map((i) => i.decode().catch(() => {}))); fn(t); }); };
const aiTag = (s) => el(s, "abs mono", "left:40px;bottom:34px;font-size:18px;letter-spacing:2px;padding:4px 10px;border-radius:6px;color:#3a342c;background:rgba(255,255,255,0.6);z-index:6;", "AI 示意图");
const wipeV = (n, t, a, d) => { const k = clamp((t - a) / d); css(n, { clipPath: `inset(-5% -20% ${((1 - k) * 100).toFixed(1)}% -20%)`, opacity: String(t < a ? 0 : 1) }); };

// ── 1 长卷：木轴从右往左展开绢本长卷（右端南门立木），题签竖排贴上；五十金时画卷继续往左卷动，放大镜推到「扛木人」局部。讲法：展卷 + 局部放大 ──
function scroll(s, h, z, B) {
  el(s, "abs", "inset:0;background:radial-gradient(ellipse at 50% 40%,#3a2a1c,#1d140c);");
  const W = 4354, X0 = -(W - 1920);
  IMG("scroll1.jpg"); IMG("scroll2.jpg");
  const view = el(s, "abs", "inset:0;overflow:hidden;");
  const sheet = el(view, "abs", `left:0;top:0;width:${W}px;height:1080px;background:url(${URLOF("scroll1.jpg")}) 0 0/${W}px 1080px;will-change:transform;`);
  const roller = el(s, "abs", "top:-20px;width:46px;height:1120px;border-radius:20px;background:linear-gradient(90deg,#3a2414,#8a5a32 35%,#c08a52 50%,#6a4224 70%,#2a180c);box-shadow:-10px 0 30px rgba(0,0,0,0.5);");
  const slip = (txt, x, y) => { const d = el(s, "abs", `left:${x}px;top:${y}px;padding:22px 14px;background:#EFE4C8;border:3px solid #9E2B1F;box-shadow:4px 6px 0 rgba(40,24,10,0.35);writing-mode:vertical-rl;${SONG}font-size:60px;font-weight:700;color:#2A2018;letter-spacing:10px;`, txt); return d; };
  const s1 = slip("南门立木", 1180, 110), s2 = slip("赏十金", 1060, 150), s3 = slip("莫敢徙", 380, 420), s4 = slip("五十金", 1420, 150);
  const seal = el(s, "abs", `left:1720px;top:70px;width:110px;height:110px;background:#B0261C;border-radius:6px;display:flex;align-items:center;justify-content:center;${SONG}font-size:44px;font-weight:900;color:#F3E7CF;line-height:1.05;text-align:center;`, "徙木<br>立信");
  const lens = el(s, "abs", `left:660px;top:230px;width:600px;height:600px;border-radius:50%;background:url(${URLOF("scroll2.jpg")}) -700px -330px/1920px 1080px;box-shadow:0 0 0 14px #2a1c10,0 0 0 18px #c08a52,0 30px 60px rgba(0,0,0,0.55);`);
  const handle = el(s, "abs", "left:1180px;top:760px;width:40px;height:260px;border-radius:20px;background:linear-gradient(90deg,#2a1c10,#6a4224,#2a1c10);transform:rotate(-38deg);transform-origin:50% 0;");
  aiTag(s);
  return (t) => {
    const ur = eInOutCubic(clamp((t - h) / 1.1)), edge = lerp(1920, 0, ur);
    const pan = t < B.fifty ? 0 : eInOutCubic(clamp((t - B.fifty) / 1.8));
    const x = lerp(X0, -1150, pan), push = 1 + 0.03 * clamp((t - h - 1.1) / 2.7) * (1 - pan);
    css(sheet, { transform: `translateX(${x.toFixed(1)}px) scale(${push.toFixed(4)})`, transformOrigin: "2400px 540px" });
    css(view, { clipPath: `inset(0 0 0 ${edge.toFixed(1)}px)` });
    css(roller, { left: `${(edge - 23).toFixed(1)}px`, opacity: String(ur < 1 ? 1 : 1 - clamp((t - h - 1.1) / 0.3)) });
    const F = t >= B.fifty;
    wipeV(s1, t, h + 1.1, 0.45); if (t >= B.ten) css(s1, { opacity: "0" });
    wipeV(s2, t, B.ten, 0.35); if (F) css(s2, { opacity: "0" });
    wipeV(s3, t, B.nobody, 0.35); if (F) css(s3, { opacity: "0" });
    const kl = eOutBack(clamp((t - B.fifty - 0.35) / 0.45)); css(lens, { opacity: String(t >= B.fifty + 0.35 ? 1 : 0), transform: `scale(${kl.toFixed(3)})` }); css(handle, { opacity: String(t >= B.fifty + 0.5 ? 1 : 0) });
    wipeV(s4, t, B.fifty + 0.7, 0.4);
    css(seal, { opacity: String(t >= h + 1.4 ? 1 : 0), transform: `rotate(-4deg) scale(${lerp(1.6, 1, eOutCubic(clamp((t - h - 1.4) / 0.15))).toFixed(3)})` });
  };
}

// ── 2 铜版博物：先用 45° 排线把灰度铜版一道道刻出来，淡彩晚一拍渗进去；左页铜版体图注逐条出现；五十金翻到「标本页」，代码给标本编号。讲法：刻线显影 + 图注 ──
function copper(s, h, z, B) {
  el(s, "abs", "inset:0;background:#2a2118;");
  const A = IMG("copper1.jpg"), Bm = IMG("copper2.jpg");
  const cv = document.createElement("canvas"); cv.width = 1920; cv.height = 1080; cv.style.cssText = "position:absolute;left:0;top:0;"; s.appendChild(cv); const g = cv.getContext("2d");
  const gray = document.createElement("canvas"); gray.width = 1920; gray.height = 1080; const gg = gray.getContext("2d"); let grayOK = false;
  const page = el(s, "abs", "left:0;top:0;width:1920px;height:1080px;box-shadow:-30px 0 60px rgba(0,0,0,0.45);");
  const cap = (html, x, y, size, extra = "") => el(s, "abs", `left:${x}px;top:${y}px;${SONG}font-size:${size}px;color:#3A2E22;white-space:nowrap;${extra}`, html);
  const c0 = cap(`<span style="font-family:Geist;letter-spacing:6px;font-size:26px">PL. I</span>`, 110, 300, 26), c1 = cap("国都南门立木图", 110, 350, 44, "font-weight:700;");
  const c2 = cap(`<i>Fig. 2</i>　赏格　十金`, 110, 470, 36), c3 = cap(`<i>Fig. 3</i>　应募者　无`, 110, 540, 36);
  const p0 = cap(`<span style="font-family:Geist;letter-spacing:6px;font-size:26px">PL. II</span>`, 110, 300, 26), p1 = cap("赏金标本", 110, 350, 44, "font-weight:700;"), p2 = cap("五十金", 100, 440, 120, "font-weight:900;color:#7A1E14;");
  const num = (n, x, y) => el(s, "abs", `left:${x}px;top:${y}px;width:46px;height:46px;border-radius:50%;border:2px solid #3A2E22;background:rgba(239,230,210,0.9);display:flex;align-items:center;justify-content:center;${SONG}font-size:26px;font-style:italic;color:#3A2E22;`, n);
  const leg = (txt, y) => el(s, "abs", `left:110px;top:${y}px;${SONG}font-size:30px;font-style:italic;color:#3A2E22;white-space:nowrap;`, txt);
  const L = [[num("1", 640, 270), leg("1　木截面", 650)], [num("2", 640, 482), leg("2　木杆", 700)], [num("3", 640, 700), leg("3　金锭（示意）", 750)]];
  const N = 440, SP = 7.2;
  aiTag(s);
  return function draw(t) {
    redraw([A, Bm], draw, t);
    if (!grayOK && A.complete && A.naturalWidth) { gg.filter = "grayscale(1) contrast(1.25) brightness(1.04)"; gg.drawImage(A, 0, 0, 1920, 1080); grayOK = true; }
    const F = t >= B.fifty;
    g.fillStyle = "#EFE6D2"; g.fillRect(0, 0, 1920, 1080);
    const u = t - h - 0.05;
    if (grayOK) {
      g.save(); g.beginPath();
      for (let i = 0; i < N; i++) { const a = (i / N) * 1.35; if (u < a) break; const k = eOutCubic(clamp((u - a) / 0.18)), c = i * SP - 1080; const x0 = c, len = 1600 * k; g.moveTo(x0, 1080); g.lineTo(x0 + len, 1080 - len); g.lineTo(x0 + len + SP, 1080 - len); g.lineTo(x0 + SP, 1080); g.closePath(); }
      g.clip(); g.drawImage(gray, 0, 0); g.restore();
      const col = clamp((t - h - 1.5) / 0.9); if (col > 0 && A.complete) { g.globalAlpha = col; g.drawImage(A, 0, 0, 1920, 1080); g.globalAlpha = 1; }
    }
    const pk = eInOutCubic(clamp((t - B.fifty) / 0.45));
    css(page, { background: `url(${URLOF("copper2.jpg")}) 0 0/1920px 1080px`, transform: `translateX(${((1 - pk) * 1960).toFixed(0)}px)`, opacity: String(t >= B.fifty ? 1 : 0) });
    const on = (n, a, show) => css(n, { opacity: String(show ? clamp((t - a) / 0.3) : 0), transform: `translateY(${((1 - eOutCubic(clamp((t - a) / 0.3))) * 10).toFixed(1)}px)` });
    on(c0, h + 1.2, !F); on(c1, h + 1.3, !F); on(c2, B.ten, !F); on(c3, B.nobody, !F);
    on(p0, B.fifty + 0.45, F); on(p1, B.fifty + 0.55, F); on(p2, B.fifty + 0.75, F);
    L.forEach(([c, d], i) => { const a = B.fifty + 1.0 + i * 0.25, k = clamp((t - a) / 0.25); css(c, { opacity: String(F ? k : 0), transform: `scale(${lerp(1.6, 1, eOutCubic(k)).toFixed(3)})` }); css(d, { opacity: String(F ? k : 0) }); });
  };
}

const STY = [
  { name: "长卷", en: "HANDSCROLL", fit: "一条时间线 · 城市生活 · 东亚史", th: { bg: 0x241910, ink: "#F3E7CF", dim: "#B49A78", accent: "#C08A52" }, make: scroll, cost: "2 张 Nano Banana 2（4:1 全卷 + 局部，24 积分）" },
  { name: "铜版博物", en: "COPPERPLATE", fit: "动植物 · 博物学 · 器物与发明", th: { bg: 0xEFE6D2, ink: "#3A2E22", dim: "#8A7A60", accent: "#7A1E14", light: true }, make: copper, cost: "2 张 Midjourney V8.2（图版 + 标本页，8 积分）" },
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
      const no = el(s, "abs", `left:0;width:1920px;top:340px;text-align:center;font-family:Geist;font-size:26px;letter-spacing:10px;color:${st.th.dim};`, `ENHANCED STYLE ${i + 1} / ${STY.length} · ${st.en}`);
      const nm = el(s, "abs cn", `left:0;width:1920px;top:400px;text-align:center;font-size:150px;font-weight:900;color:${st.th.ink};letter-spacing:12px;`, st.name);
      const ft = el(s, "abs cn", `left:0;width:1920px;top:600px;text-align:center;font-size:40px;color:${st.th.accent};letter-spacing:3px;`, `适合：${st.fit}`);
      const cr = el(s, "abs cn", `left:0;width:1920px;top:680px;text-align:center;font-size:26px;color:${st.th.dim};`, `增强档 · ${st.cost}，动效全部代码`);
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
    el(s, "abs cn", "left:0;width:1920px;top:360px;text-align:center;font-size:84px;font-weight:900;color:#f6f2ea;", "风格库 +2：长卷 · 铜版博物");
    el(s, "abs cn", "left:0;width:1920px;top:520px;text-align:center;font-size:32px;color:#a8a29a;", "共 37 套 · 8 个家族 · 其中 6 套增强档");
    return { s };
  }, () => bg(ctx, { bg: 0x0b0a0c }, { bloom: 0.3 }));
  return shots;
}
