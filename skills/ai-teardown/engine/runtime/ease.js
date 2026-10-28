/** Small pure helpers shared by primitives. No state, no clocks. */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const clamp01 = (v) => clamp(v, 0, 1);
export const mix = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (a === b ? (v >= b ? 1 : 0) : clamp01((v - a) / (b - a)));

/** GSAP-equivalent expo.out, evaluated per frame. */
export const expoOut = (p) => (p >= 1 ? 1 : p <= 0 ? 0 : 1 - Math.pow(2, -10 * p));
export const cubicInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const sineInOut = (p) => -(Math.cos(Math.PI * clamp01(p)) - 1) / 2;

/**
 * Content swap inside a morphing container: short blur in, shorter blur out.
 * Enter and exit get their own windows so old and new text never overlap.
 */
export const swap = (t, tin, tout, inDur = 0.18, outDur = 0.1) => {
  const i = expoOut(clamp01((t - tin) / inDur));
  const o = clamp01((t - tout) / outDur);
  return {
    visible: t >= tin - 0.02 && t <= tout + outDur + 0.02,
    opacity: i * (1 - o),
    blur: (1 - i) * 10 + o * 8,
    scale: mix(0.96, 1, i) * mix(1, 0.98, o),
  };
};

/** Apply a swap() result to an element. */
export const applySwap = (el, s, extraTransform = "") => {
  el.style.visibility = s.visible ? "visible" : "hidden";
  el.style.opacity = s.opacity.toFixed(4);
  el.style.filter = s.blur > 0.05 ? `blur(${s.blur.toFixed(2)}px)` : "none";
  el.style.transform = `${extraTransform} scale(${s.scale.toFixed(4)})`.trim();
};

/** Typing schedule with seeded jitter; returns how many characters are visible at t. */
export const typedCount = (text, t0, cps, t, seed = 1) => {
  const chars = Array.from(text);
  let at = t0;
  let n = 0;
  for (let i = 0; i < chars.length; i++) {
    if (t < at) break;
    n = i + 1;
    const j = 0.7 + 0.6 * hash01(i, seed);
    at += (1 / cps) * j * (/[，。,.;；：:]/.test(chars[i]) ? 2.2 : 1);
  }
  return n;
};

/** Deterministic 0..1 hash of an integer and a seed (no Math.random). */
export const hash01 = (i, seed = 1) => {
  let x = (i * 374761393 + seed * 668265263) | 0;
  x = (x ^ (x >>> 13)) * 1274126177;
  x = x ^ (x >>> 16);
  return ((x >>> 0) % 100000) / 100000;
};
