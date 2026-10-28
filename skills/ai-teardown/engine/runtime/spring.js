/**
 * Closed-form springs, ported from promo-video's src/cinematic/spring.ts.
 * Every value is a pure function of time: a value that changes target many
 * times is the sum of one step response per change, so seeking backwards,
 * skipping frames or rendering out of order always gives the same frame.
 */

export const hz = (f) => 2 * Math.PI * f;

/** Snappy UI spring: ~1.5% overshoot. */
export const UI = { w: hz(2.1), z: 0.82 };
/** Critically damped, for the cursor and anything that must not overshoot. */
export const CURSOR = { w: hz(2.4), z: 1 };
/** Slower camera. */
export const CAM = { w: hz(1.25), z: 0.95 };
/** Fast press/release. */
export const PRESS = { w: hz(5), z: 0.75 };
/** Leading / trailing edges for liquid indicators. */
export const LEAD = { w: hz(3.2), z: 0.86 };
export const TRAIL = { w: hz(1.7), z: 0.9 };
/** Gentle reveal for diagrams and labels in teaching scenes. */
export const REVEAL = { w: hz(1.8), z: 0.9 };

/** Unit step response of a damped spring, `tau` seconds after the step. */
export const step = (tau, { w, z }) => {
  if (tau <= 0) return 0;
  if (z >= 1) return 1 - Math.exp(-w * tau) * (1 + w * tau);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
};

/** keys: [time, target] in seconds; the first key is the starting value. */
export const track = (t, keys, c = UI) => {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * step(t - keys[i][0], c);
  return v;
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Colour keys [time, '#rrggbb'], sprung per RGB channel. */
export const trackColor = (t, keys, c = UI) => {
  const ch = [0, 1, 2].map((k) => track(t, keys.map(([tt, col]) => [tt, rgb(col)[k]]), c));
  return `rgb(${ch.map((v) => Math.round(Math.min(255, Math.max(0, v)))).join(",")})`;
};

/** keys with a per-change spring: [time, target, cfg]. Lets a leading edge ride a faster spring than the trailing one. */
export const trackCfg = (t, keys, fallback = UI) => {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * step(t - keys[i][0], keys[i][2] ?? fallback);
  return v;
};

/** Value driven directly by the pointer while held, then springing from wherever it was released to `after`. */
export const dragged = (t, held, live, before, after, c = UI) => {
  if (t < held[0]) return before;
  if (t <= held[1]) return live(t);
  const v = live(held[1]);
  return after + (v - after) * (1 - step(t - held[1], c));
};

/** 0 → 1 appearance at t0 on spring c (a single step). */
export const appear = (t, t0, c = REVEAL) => step(t - t0, c);

/** 0 → 1 at t0, back to 0 at t1 (both sprung). */
export const pulse = (t, t0, t1, c = REVEAL) => step(t - t0, c) - step(t - t1, c);
