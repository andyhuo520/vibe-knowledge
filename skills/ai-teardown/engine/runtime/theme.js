/**
 * Theme tokens. The stage writes them onto its root as CSS custom properties,
 * so primitives style DOM/SVG with var(--x) and canvas/WebGL code reads THEMES.
 * Role colours carry meaning across the whole series:
 *   user 蓝 · model 紫 · tool 绿 · env 灰 · boundary 橙；推断=虚线，未披露=雾化。
 */

/**
 * 马卡龙色板位 m1–m6（粉、桃、柠檬、薄荷、天蓝、薰衣草；各主题可换成自己的六色）。
 * 每位三个值：--mN 主色（描边、图标）、--mN-t 浅底（卡片填充）、--mN-d 深色（在浅底上写字，过 AA）。
 */
const pal = (...cols) => Object.fromEntries(cols.flatMap(([m, t, d], i) => [[`m${i + 1}`, m], [`m${i + 1}-t`, t], [`m${i + 1}-d`, d]]));
export const MAC = ["m1", "m2", "m3", "m4", "m5", "m6"];

export const THEMES = {
  blueprint: {
    bg: "#0A1024",
    grid: "rgba(120,150,255,0.07)",
    surface: "#111A33",
    surface2: "#17234A",
    line: "#2A3963",
    ink: "#EAF0FF",
    ink2: "#A9B5D6",
    ink3: "#6F7CA3",
    user: "#5B8CFF",
    "user-t": "rgba(91,140,255,0.16)",
    model: "#A57CFF",
    "model-t": "rgba(165,124,255,0.17)",
    tool: "#2ED39A",
    "tool-t": "rgba(46,211,154,0.14)",
    env: "#8E9CC0",
    "env-t": "rgba(142,156,192,0.13)",
    boundary: "#FF8A4C",
    "boundary-t": "rgba(255,138,76,0.07)",
    hl: "#FFD84D",
    ok: "#2ED39A",
    err: "#FF6B6B",
    "cap-bg": "rgba(5,9,22,0.74)",
    "cap-ink": "#FFFFFF",
    shadow: "0 18px 50px rgba(0,0,0,0.35)",
    ...pal(["#FF8FB8", "rgba(255,143,184,0.16)", "#FFB8D2"], ["#FF8A4C", "rgba(255,138,76,0.14)", "#FFB38F"], ["#FFD84D", "rgba(255,216,77,0.14)", "#FFE68F"],
      ["#2ED39A", "rgba(46,211,154,0.14)", "#8FEBC8"], ["#5B8CFF", "rgba(91,140,255,0.16)", "#A9C2FF"], ["#A57CFF", "rgba(165,124,255,0.17)", "#CDB5FF"]),
    bgStyle: "grid",
  },
  editorial: {
    bg: "#ECEAE6",
    grid: "rgba(20,20,20,0.05)",
    surface: "#FFFFFF",
    surface2: "#F5F3EF",
    line: "#D8D3CB",
    ink: "#141414",
    ink2: "#4A4843",
    ink3: "#8A8680",
    user: "#2B62F0",
    "user-t": "#E3EAFE",
    model: "#7446EC",
    "model-t": "#EEE7FD",
    tool: "#0B8F66",
    "tool-t": "#DDF2E9",
    env: "#636B7D",
    "env-t": "#E6E7EA",
    boundary: "#D2500F",
    "boundary-t": "#FBEDE4",
    hl: "#FFD84D",
    ok: "#0B8F66",
    err: "#D23B3B",
    "cap-bg": "rgba(20,20,20,0.80)",
    "cap-ink": "#FFFFFF",
    shadow: "0 16px 40px rgba(0,0,0,0.10)",
    ...pal(["#E86A9A", "#FBE3EC", "#B8386A"], ["#F08A4B", "#FCE9DC", "#B5531A"], ["#E7B930", "#FBF1CF", "#7E6200"],
      ["#3DB68A", "#DDF2E9", "#0B7A55"], ["#4F8BF0", "#E3EAFE", "#2B55C4"], ["#8B67EE", "#EEE7FD", "#5E3BC9"]),
    bgStyle: "plain",
  },
  /** 浅色马卡龙：奶油底 + 六个粉彩色位。系列课默认主题。 */
  macaron: {
    bg: "#FFF8F2",
    grid: "rgba(47,42,69,0.08)",
    surface: "#FFFFFF",
    surface2: "#FFF1E8",
    line: "#EEDFD5",
    ink: "#2F2A45",
    ink2: "#5B5573",
    ink3: "#847D99",
    user: "#3B7BD4",
    "user-t": "#DDEBFF",
    model: "#7657DB",
    "model-t": "#ECE6FF",
    tool: "#1C9366",
    "tool-t": "#D8F4E6",
    env: "#78728C",
    "env-t": "#EFECF4",
    boundary: "#DD6230",
    "boundary-t": "#FFE7DA",
    hl: "#FFE38A",
    ok: "#1C9366",
    err: "#E0485F",
    "cap-bg": "rgba(47,42,69,0.84)",
    "cap-ink": "#FFFFFF",
    shadow: "0 20px 48px rgba(94,72,130,0.13)",
    ...pal(["#FF9FC3", "#FFE2EE", "#C23A6D"], ["#FFB48A", "#FFE6D6", "#BF5620"], ["#F5CF5B", "#FFF4C9", "#8C6A00"],
      ["#86D9B0", "#D9F5E7", "#1B8558"], ["#8CC2F4", "#DCEEFF", "#2A6CBF"], ["#B7A6F4", "#EAE4FF", "#6548CC"]),
    bgStyle: "dots",
  },
  /** 薄荷：更清爽的浅绿底。 */
  mint: {
    bg: "#F0FAF6",
    grid: "rgba(20,70,60,0.08)",
    surface: "#FFFFFF",
    surface2: "#E6F5EE",
    line: "#D3E9DF",
    ink: "#16332D",
    ink2: "#3F5E57",
    ink3: "#627F78",
    user: "#2E78C7",
    "user-t": "#DCEEFF",
    model: "#6C54D6",
    "model-t": "#ECE7FF",
    tool: "#138A5E",
    "tool-t": "#D2F2E3",
    env: "#5F7C75",
    "env-t": "#E4EFEB",
    boundary: "#D2622B",
    "boundary-t": "#FFE9DC",
    hl: "#FFE07A",
    ok: "#138A5E",
    err: "#D8465A",
    "cap-bg": "rgba(22,51,45,0.84)",
    "cap-ink": "#FFFFFF",
    shadow: "0 20px 48px rgba(20,80,60,0.12)",
    ...pal(["#7FD6C2", "#DDF6F0", "#137A66"], ["#A8E0A0", "#E6F7E2", "#3C7F2E"], ["#F6D56A", "#FFF5CC", "#8A6800"],
      ["#8FC8F0", "#DFF0FC", "#2A6DAF"], ["#F7A8B8", "#FDE5EA", "#B83A55"], ["#C3B3F0", "#EEE9FD", "#5F49BD"]),
    bgStyle: "dots",
  },
  /** 夜间粉彩：深紫底，色位提亮。 */
  night: {
    bg: "#1D1A2C",
    grid: "rgba(255,255,255,0.06)",
    surface: "#28243B",
    surface2: "#312C48",
    line: "#3E3858",
    ink: "#F5F2FF",
    ink2: "#C4BDDD",
    ink3: "#9A92B8",
    user: "#8CB8FF",
    "user-t": "rgba(140,184,255,0.16)",
    model: "#C0A8FF",
    "model-t": "rgba(192,168,255,0.16)",
    tool: "#7EE0B5",
    "tool-t": "rgba(126,224,181,0.14)",
    env: "#A9A3C4",
    "env-t": "rgba(169,163,196,0.14)",
    boundary: "#FFAA80",
    "boundary-t": "rgba(255,170,128,0.12)",
    hl: "#8A6FD6",
    ok: "#7EE0B5",
    err: "#FF8A9A",
    "cap-bg": "rgba(12,10,22,0.78)",
    "cap-ink": "#FFFFFF",
    shadow: "0 20px 48px rgba(0,0,0,0.35)",
    ...pal(["#FF9FC3", "rgba(255,159,195,0.18)", "#FFC2D9"], ["#FFB48A", "rgba(255,180,138,0.18)", "#FFD0B5"], ["#F5CF5B", "rgba(245,207,91,0.16)", "#FBE39A"],
      ["#86D9B0", "rgba(134,217,176,0.16)", "#B5EDD0"], ["#8CC2F4", "rgba(140,194,244,0.16)", "#BCDBFA"], ["#B7A6F4", "rgba(183,166,244,0.18)", "#D6CCFA"]),
    bgStyle: "dots",
  },
};

export const FONTS = {
  sans: '"Geist", "Noto Sans SC", "PingFang SC", sans-serif',
  mono: '"Geist Mono", "Noto Sans SC", "PingFang SC", monospace',
};

/** Type scale in px at 1920×1080. 9:16 multiplies by SCALE_916. */
export const TYPE = {
  display: 88,
  h2: 60,
  labelL: 40,
  label: 32,
  small: 28,
  caption: 46,
  mono: 30,
};
export const SCALE_916 = 1.2;

/** Frame geometry and safe areas. */
export const FRAMES = {
  "16:9": { W: 1920, H: 1080, safeX: 96, safeTop: 72, capTop: 890 },
  "9:16": { W: 1080, H: 1920, safeX: 72, safeTop: 120, capTop: 1500 },
};

export const ROLES = ["user", "model", "tool", "env", "boundary"];

export const applyTheme = (el, name) => {
  const t = THEMES[name];
  if (!t) throw new Error(`unknown theme ${name}`);
  for (const [k, v] of Object.entries(t)) if (k !== "bgStyle") el.style.setProperty(`--${k}`, v);
  el.dataset.bg = t.bgStyle ?? "plain";
  el.style.setProperty("--sans", FONTS.sans);
  el.style.setProperty("--mono", FONTS.mono);
  el.dataset.theme = name;
};
