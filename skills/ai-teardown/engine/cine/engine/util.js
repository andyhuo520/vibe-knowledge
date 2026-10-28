// 时间、缓动、随机数：全片所有动画都是「时间 t 的纯函数」，这里的工具都没有内部状态。
export let TL = null;

export async function loadTimeline() {
  TL = await (await fetch("timeline.json")).json();
  return TL;
}

export const B = (bar) => bar * TL.bar;          // 小节 → 秒
export const toBar = (t) => t / TL.bar;          // 秒 → 小节

// 「ft」段的时间拖动：真实时间 → 场景时间（倒放、定格、快进），表由 tools/timeline.py 生成，配乐用的是同一张表
export function warp(t) {
  const w = TL.warp;
  if (t <= w.from || t >= w.to) return t;
  const x = (t - w.from) * w.rate, i = Math.floor(x), f = x - i;
  const a = w.table[i], b = w.table[Math.min(i + 1, w.table.length - 1)];
  return a + (b - a) * f;
}

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const inv = (x, a, b) => clamp((x - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);
export const eOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const eInExpo = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
export const eInOutExpo = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
export const eOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const eInCubic = (x) => x * x * x;
export const eInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const eOutQuint = (x) => 1 - Math.pow(1 - x, 5);
export const eInOutQuint = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
export const eOutBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);

// 阻尼弹簧的阶跃响应：t 秒后从 0 走到 1，带过冲
export function spring(t, f = 2.2, z = 0.42) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

// 一次性冲击的包络：at 之后快速起、指数衰减
export const hit = (t, at, decay = 9) => (t < at ? 0 : Math.exp(-(t - at) * decay));

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 小 DOM 工具
export function el(parent, cls = "", style = "", html = "") {
  const d = document.createElement("div");
  if (cls) d.className = cls;
  if (style) d.style.cssText = style;
  if (html) d.innerHTML = html;
  parent.appendChild(d);
  return d;
}

export function css(node, o) {
  for (const k in o) {
    const v = o[k];
    if (node.__s && node.__s[k] === v) continue;
    (node.__s ||= {})[k] = v;
    node.style[k] = v;
  }
}
