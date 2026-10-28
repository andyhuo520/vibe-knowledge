// 讲解课引擎：一节课 = 一个 seek(t)。旁白时间轴来自 lessons/<id>/build/timings.json，镜头表来自 lessons/<id>/film.js。
// 片头冷开场直接用样片片段（成片时拼接），这里从 film.COLD 秒开始渲染。
import * as THREE from "three";
import { Post } from "./post.js";
import { clamp, el, css } from "./util.js";
import { Narr } from "./narr.js";

const W = 1920, H = 1080;
const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const LESSON = q.get("lesson") || "01";

const ctx = { W, H, THREE };
let film, shots = [], subNode, subWrap;

function hitcam(t) {
  let s = 1, x = 0, y = 0;
  for (const at of film.hits || []) {
    const d = t - at;
    if (d < 0 || d > 0.7) continue;
    const e = Math.exp(-d * 7.5);
    s += 0.04 * e; x += Math.sin(d * 52) * 9 * e; y += Math.cos(d * 43) * 6 * e;
  }
  return `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
}

// 片头冷开场两种：COLD_SRC（成片时拼现成片段，从 COLD 秒开始渲）或本课自己渲（从 0 秒开始）
const start = () => (film.COLD_SRC ? film.COLD : 0);

function seek(t) {
  t = clamp(t, start(), ctx.narr.total - 1e-6);
  ctx.post.reset();
  for (const sh of shots) if (!(t >= sh.from && t < sh.to)) css(sh.ui.s, { display: "none" });
  const sh = shots.find((x) => t >= x.from && t < x.to) || shots[shots.length - 1];
  css(sh.ui.s, { display: "block" });
  sh.render(t, sh.ui, sh);
  // 字幕
  const s = ctx.narr.sub(t);
  const hide = sh.noSub || !s;
  if (!hide && subNode.textContent !== s.text) subNode.textContent = s.text;
  css(subWrap, { opacity: hide ? "0" : "1" });
  $("cam").style.transform = hitcam(t);
  ctx.post.finish(t);
}

async function boot() {
  const timings = await (await fetch(`../lessons/${LESSON}/build/timings.json`)).json();
  film = await import(`../../lessons/${LESSON}/film.js`);
  ctx.narr = new Narr(timings, film.COLD);
  await Promise.all([
    document.fonts.load("900 100px NotoSC", "视频帧函数时间"), document.fonts.load("500 40px NotoSC", "字幕"), document.fonts.load("700 40px NotoSC", "字幕"),
    document.fonts.load("800 100px Geist", "Opus 5.5"), document.fonts.load("600 40px Geist", "CLAUDE"), document.fonts.load("500 30px GeistMono", "const"),
  ]);
  await document.fonts.ready;
  const r = new THREE.WebGLRenderer({ canvas: $("gl"), antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.setSize(W, H, false); r.autoClear = false;
  ctx.r = r;
  ctx.post = new Post(r, W, H);
  ctx.snap = (draw) => { ctx.post.reset(); draw(); ctx.post.finish(0); return r.domElement.toDataURL("image/jpeg", 0.92); };
  // 字幕层（在所有镜头之上）
  subWrap = el($("ui"), "abs", "left:0;top:940px;width:1920px;height:90px;display:flex;justify-content:center;align-items:center;z-index:50;pointer-events:none;");
  subNode = el(subWrap, "cn", "max-width:1500px;padding:10px 28px;border-radius:14px;background:rgba(6,6,9,0.55);font-size:40px;line-height:54px;font-weight:600;color:#f6f2ea;text-align:center;letter-spacing:1px;text-shadow:0 2px 12px rgba(0,0,0,0.6);");
  const list = await film.build(ctx);
  shots = list.map((s) => ({ ...s, ui: s.build($("ui")) }));
  // 字幕层要在最上面
  $("ui").appendChild(subWrap);
  fit();
  if (film.TAIL) ctx.narr.total += film.TAIL;   // 旁白结束后再停 TAIL 秒（片尾地址卡、Logo 定格），build 里的 N.total 仍是旁白结束
  window.__film = { duration: ctx.narr.total, from: start(), cold: film.COLD, coldSrc: film.COLD_SRC || null, fps: 60, seek, blur: film.blur || [], ready: true, meta: film.meta || {}, at: (s) => ctx.narr.t(s), sfx: film.sfx || [], sections: film.sections || [], subs: ctx.narr.subs, clips: film.clips || [], music: film.music || [] };
  if (q.has("play")) play(parseFloat(q.get("play") || String(start())));
  else seek(parseFloat(q.get("t") || String(start())));
}

function fit() {
  if (q.has("capture")) return;
  const s = Math.min(innerWidth / W, innerHeight / H);
  $("frame").style.transform = `scale(${s})`;
}
addEventListener("resize", fit);

function play(from) {
  const a = new Audio(`../lessons/${LESSON}/build/final_mix.wav`);
  a.currentTime = from;
  a.play().catch(() => {});
  const t0 = performance.now() - from * 1000;
  const loop = () => { seek((performance.now() - t0) / 1000); requestAnimationFrame(loop); };
  loop();
}

boot();
