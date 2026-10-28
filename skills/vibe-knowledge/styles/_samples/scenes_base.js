// 基础档场景：Opus 手写的分层矢量插画（扁平古风剪影），给 know.js 的 layers() 用。0 积分。
// 每个场景返回 [{ svg, depth }]：depth 小 = 远景（动得少），大 = 近景（动得多）。
const V = (inner, defs = "") => `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${inner}</svg>`;
let _id = 0;
const uid = (p) => `${p}${++_id}`;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 天空：上下渐变 + 太阳 / 月亮光晕
function sky(top, bottom, { sun = null, sunColor = "#ffd9a0", glow = 0.55, moon = false } = {}) {
  const g = uid("sky"), r = uid("glow");
  const defs = `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <radialGradient id="${r}"><stop offset="0" stop-color="${sunColor}" stop-opacity="${glow}"/><stop offset="1" stop-color="${sunColor}" stop-opacity="0"/></radialGradient>`;
  let inner = `<rect width="1920" height="1080" fill="url(#${g})"/>`;
  if (sun) inner += `<circle cx="${sun[0]}" cy="${sun[1]}" r="420" fill="url(#${r})"/><circle cx="${sun[0]}" cy="${sun[1]}" r="${moon ? 46 : 60}" fill="${sunColor}" opacity="${moon ? 0.95 : 0.9}"/>`;
  return V(inner, defs);
}
// 两层歇山顶
const roof = (cx, y, w, h, c) => `<path d="M${cx - w / 2} ${y + h} Q${cx - w / 2 + w * 0.08} ${y + h * 0.55} ${cx - w * 0.3} ${y + h * 0.4} L${cx + w * 0.3} ${y + h * 0.4} Q${cx + w / 2 - w * 0.08} ${y + h * 0.55} ${cx + w / 2} ${y + h} Z M${cx - w * 0.22} ${y + h * 0.4} L${cx - w * 0.12} ${y} L${cx + w * 0.12} ${y} L${cx + w * 0.22} ${y + h * 0.4} Z" fill="${c}"/>`;
// 楼阁：底座 + 楼身 + 两层屋顶
const tower = (cx, base, w, h, c, c2) => `<rect x="${cx - w * 0.36}" y="${base - h * 0.55}" width="${w * 0.72}" height="${h * 0.55}" fill="${c2}"/>${roof(cx, base - h * 0.78, w * 0.95, h * 0.26, c)}<rect x="${cx - w * 0.28}" y="${base - h * 0.62}" width="${w * 0.56}" height="${h * 0.08}" fill="${c2}"/>${roof(cx, base - h, w * 0.7, h * 0.24, c)}`;
// 远处屋脊天际线
function skyline(y, c, seed, op = 1) {
  const R = rng(seed); let s = "";
  for (let x = -40; x < 1960;) { const w = 90 + R() * 160, h = 30 + R() * 70; s += roof(x + w / 2, y - h, w, h, c) + `<rect x="${x + w * 0.1}" y="${y - h * 0.15}" width="${w * 0.8}" height="${h * 0.6}" fill="${c}"/>`; x += w * (0.75 + R() * 0.3); }
  return `<g opacity="${op}">${s}<rect x="0" y="${y + 20}" width="1920" height="${1080 - y}" fill="${c}"/></g>`;
}
// 人（背影剪影）：站、低头、跪、披斗篷
function person(x, y, s, c, pose = "stand") {
  const h = 120 * s, hw = 26 * s;
  if (pose === "kneel") return `<g fill="${c}"><circle cx="${x}" cy="${y - h * 0.62}" r="${hw * 0.55}"/><path d="M${x - hw * 1.3} ${y} Q${x - hw * 1.2} ${y - h * 0.45} ${x - hw * 0.5} ${y - h * 0.52} L${x + hw * 0.5} ${y - h * 0.52} Q${x + hw * 1.2} ${y - h * 0.45} ${x + hw * 1.4} ${y} Z"/></g>`;
  if (pose === "cloak") return `<g fill="${c}"><circle cx="${x}" cy="${y - h * 0.9}" r="${hw * 0.52}"/><path d="M${x - hw * 0.6} ${y - h * 0.86} L${x + hw * 0.6} ${y - h * 0.86} L${x + hw * 1.5} ${y} L${x - hw * 1.5} ${y} Z"/></g>`;
  const lean = pose === "hunch" ? hw * 0.5 : 0, hy = pose === "hunch" ? h * 0.82 : h * 0.9;
  return `<g fill="${c}"><circle cx="${x + lean}" cy="${y - hy}" r="${hw * 0.5}"/><circle cx="${x + lean}" cy="${y - hy - hw * 0.55}" r="${hw * 0.2}"/><path d="M${x - hw * 0.55 + lean * 0.6} ${y - h * 0.78} L${x + hw * 0.55 + lean * 0.6} ${y - h * 0.78} L${x + hw * 1.05} ${y} L${x - hw * 1.05} ${y} Z"/></g>`;
}
// 人群：按纵深从远到近，越近越大越暗
function crowd({ n, x0, x1, y0, y1, seed, c, avoid = null, pose = "stand" }) {
  const R = rng(seed), ps = [];
  for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * Math.pow(R(), 0.7), x = x0 + (x1 - x0) * R(); if (avoid && Math.abs(x - avoid[0]) < avoid[1] && y < avoid[2]) continue; ps.push([x, y]); }
  ps.sort((a, b) => a[1] - b[1]);
  return ps.map(([x, y]) => person(x, y, 0.35 + ((y - y0) / (y1 - y0)) * 1.3, c, pose)).join("");
}
const ground = (y, a, b) => { const g = uid("gr"); return [`<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`, `<rect x="0" y="${y}" width="1920" height="${1080 - y}" fill="url(#${g})"/>`]; };
const haze = (y, c, op) => { const g = uid("hz"); return [`<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset="0.5" stop-color="${c}" stop-opacity="${op}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`, `<rect x="0" y="${y - 160}" width="1920" height="320" fill="url(#${g})"/>`]; };

// 城门：夯土城墙 + 门洞透光 + 城楼
function gateLayer({ dark = false } = {}) {
  const W = dark ? "#3a2a24" : "#5b3626", W2 = dark ? "#2c201c" : "#4a2b1f", R = dark ? "#231814" : "#2f1a12", L = dark ? "#8c7a66" : "#f0c27e";
  const lg = uid("door");
  return V(`<rect x="300" y="430" width="1320" height="420" fill="${W2}"/>
    <path d="M300 430 L1620 430 L1640 850 L280 850 Z" fill="${W}"/>
    <rect x="300" y="430" width="1320" height="18" fill="${R}"/>
    ${[...Array(24)].map((_, i) => `<rect x="${310 + i * 55}" y="408" width="30" height="24" fill="${W2}"/>`).join("")}
    <path d="M890 850 L890 640 Q960 590 1030 640 L1030 850 Z" fill="url(#${lg})"/>
    ${tower(960, 430, 560, 300, R, W2)}
    ${tower(420, 440, 300, 180, R, W2)}${tower(1500, 440, 300, 180, R, W2)}`,
    `<linearGradient id="${lg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L}"/><stop offset="1" stop-color="${dark ? "#5a4c40" : "#c98a4a"}"/></linearGradient>`);
}
function stalls(c, seed) {
  const R = rng(seed); let s = "";
  for (const side of [0, 1]) for (let i = 0; i < 4; i++) {
    const x = side ? 1920 - 120 - i * 150 - R() * 30 : 20 + i * 150 + R() * 30, y = 820 + i * 22, w = 150 + R() * 60;
    s += `<path d="M${x - w / 2} ${y - 90} L${x + w / 2} ${y - 90} L${x + w / 2 + 20} ${y - 60} L${x - w / 2 - 20} ${y - 60} Z" fill="${c}"/><rect x="${x - w / 2 + 6}" y="${y - 60}" width="6" height="90" fill="${c}"/><rect x="${x + w / 2 - 12}" y="${y - 60}" width="6" height="90" fill="${c}"/><rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="34" fill="${c}"/>`;
  }
  return s;
}
const pole = (x = 1085, top = 500, bot = 905) => `<rect x="${x - 9}" y="${top}" width="18" height="${bot - top}" fill="#3a2418"/><rect x="${x - 9}" y="${top}" width="5" height="${bot - top}" fill="#7a5638" opacity="0.7"/><ellipse cx="${x}" cy="${bot}" rx="34" ry="8" fill="#140b08" opacity="0.6"/>`;
const board = (x = 1190) => `<rect x="${x - 4}" y="780" width="8" height="120" fill="#2a1a12"/><rect x="${x + 96}" y="780" width="8" height="120" fill="#2a1a12"/><rect x="${x - 10}" y="770" width="120" height="78" fill="#d9c49a"/><rect x="${x}" y="782" width="100" height="54" fill="none" stroke="#7a2a1d" stroke-width="3"/>`;

export const SC = {
  gate() {
    const [gd, gi] = ground(850, "#3a2318", "#1d110c"), [hd, hi] = haze(820, "#e7b47a", 0.35);
    return [{ svg: sky("#2a1712", "#d08a48", { sun: [1180, 600] }), depth: 0.08 },
      { svg: V(skyline(640, "#6e4128", 7, 0.75)), depth: 0.18 },
      { svg: gateLayer(), depth: 0.35 },
      { svg: V(gi + pole() + hi, gd + hd), depth: 0.6 },
      { svg: V(stalls("#1a0f0b", 3) + crowd({ n: 26, x0: 120, x1: 1800, y0: 880, y1: 960, seed: 11, c: "#24150f", avoid: [1085, 160, 930] })), depth: 1.0 }];
  },
  crowd() {
    const [gd, gi] = ground(850, "#3a2318", "#1d110c"), [hd, hi] = haze(820, "#e7b47a", 0.3);
    return [{ svg: sky("#2a1712", "#c98246", { sun: [1180, 600] }), depth: 0.08 },
      { svg: V(skyline(640, "#6e4128", 7, 0.75)), depth: 0.18 },
      { svg: gateLayer(), depth: 0.35 },
      { svg: V(gi + pole() + board() + hi, gd + hd), depth: 0.6 },
      { svg: V(crowd({ n: 120, x0: -40, x1: 1960, y0: 900, y1: 1160, seed: 21, c: "#150c09", avoid: [1110, 230, 990] })), depth: 1.15 }];
  },
  carry() {
    const [gd, gi] = ground(850, "#3a2318", "#1d110c"), [hd, hi] = haze(800, "#f2c27e", 0.45);
    const man = `<g fill="#120a07"><path d="M760 1080 L800 690 Q960 610 1120 690 L1160 1080 Z"/><circle cx="960" cy="575" r="56"/><circle cx="960" cy="512" r="22"/>
      <path d="M800 700 L700 520 L735 505 L835 680 Z"/><path d="M1120 700 L1160 520 L1195 530 L1150 705 Z"/></g>
      <g transform="rotate(-6 960 520)"><rect x="40" y="488" width="1840" height="64" rx="30" fill="#4a2c1c"/><rect x="40" y="492" width="1840" height="14" rx="7" fill="#8a6040" opacity="0.6"/><ellipse cx="44" cy="520" rx="22" ry="32" fill="#6b4630"/></g>`;
    return [{ svg: sky("#2a1712", "#e0a056", { sun: [1320, 560], glow: 0.7 }), depth: 0.08 },
      { svg: V(skyline(640, "#6e4128", 9, 0.7)), depth: 0.18 },
      { svg: gateLayer(), depth: 0.3 },
      { svg: V(gi + hi + crowd({ n: 40, x0: 0, x1: 1920, y0: 860, y1: 940, seed: 31, c: "#24150f" }), gd + hd), depth: 0.6 },
      { svg: V(man), depth: 1.3 }];
  },
  hall() {
    const beam = uid("bm"), fl = uid("fl");
    const inner = `<rect width="1920" height="1080" fill="#160d09"/>
      <rect x="620" y="120" width="680" height="420" fill="#e8b878"/>${[...Array(9)].map((_, i) => `<rect x="${620 + i * 85}" y="120" width="6" height="420" fill="#160d09"/>`).join("")}${[...Array(5)].map((_, i) => `<rect x="620" y="${120 + i * 105}" width="680" height="6" fill="#160d09"/>`).join("")}
      <path d="M620 540 L1300 540 L1640 1080 L280 1080 Z" fill="url(#${beam})"/>
      <rect x="0" y="760" width="1920" height="320" fill="url(#${fl})"/>`;
    const defs = `<linearGradient id="${beam}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c27e" stop-opacity="0.35"/><stop offset="1" stop-color="#f2c27e" stop-opacity="0"/></linearGradient><linearGradient id="${fl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1810"/><stop offset="1" stop-color="#0e0806"/></linearGradient>`;
    const cols = [200, 470, 1450, 1720].map((x) => `<rect x="${x - 34}" y="0" width="68" height="1080" fill="#7a2418"/><rect x="${x - 34}" y="0" width="14" height="1080" fill="#a8402c" opacity="0.6"/>`).join("");
    const table = `<rect x="700" y="820" width="520" height="34" fill="#2a1810"/><rect x="730" y="854" width="20" height="70" fill="#1a0f0b"/><rect x="1170" y="854" width="20" height="70" fill="#1a0f0b"/>${[...Array(14)].map((_, i) => `<rect x="${740 + i * 32}" y="798" width="22" height="26" fill="#c9a26a"/>`).join("")}`;
    return [{ svg: V(inner, defs), depth: 0.15 }, { svg: V(cols), depth: 0.5 }, { svg: V(table + person(620, 930, 1.9, "#0c0705", "kneel") + person(1300, 930, 1.9, "#0c0705", "kneel")), depth: 0.9 }];
  },
  army() {
    const [gd, gi] = ground(700, "#5a3a24", "#2a1a10"), [hd, hi] = haze(700, "#e2b47a", 0.5);
    let ranks = ""; const R = rng(41);
    for (let r = 0; r < 7; r++) { const y = 720 + r * 26, s = 0.18 + r * 0.05; for (let x = 200 + r * 10; x < 1720 - r * 10; x += 30 + r * 5) ranks += person(x + R() * 6, y, s, "#1a100b"); if (r % 2 === 0) for (let x = 260; x < 1700; x += 220) ranks += `<rect x="${x}" y="${y - 150 * s - 70}" width="3" height="${90 + r * 6}" fill="#1a100b"/><path d="M${x + 3} ${y - 150 * s - 70} L${x + 58} ${y - 150 * s - 58} L${x + 3} ${y - 150 * s - 40} Z" fill="#0c0806"/>`; }
    return [{ svg: sky("#3a2418", "#d8a066", { sun: [960, 640], glow: 0.45 }), depth: 0.08 },
      { svg: V(`<path d="M0 700 Q300 600 600 660 T1200 640 T1920 660 L1920 720 L0 720 Z" fill="#7a5038" opacity="0.7"/>`), depth: 0.2 },
      { svg: V(gi + ranks + hi, gd + hd), depth: 0.7 }];
  },
  court() {
    const [gd, gi] = ground(700, "#4a3024", "#20140e");
    const steps = [...Array(8)].map((_, i) => `<rect x="${360 - i * 30}" y="${700 + i * 26}" width="${1200 + i * 60}" height="26" fill="${i % 2 ? "#3a261c" : "#46301f"}"/>`).join("");
    const guards = [300, 420, 1500, 1620].map((x) => person(x, 900, 1.1, "#150c08") + `<rect x="${x + 30}" y="${900 - 260}" width="4" height="260" fill="#150c08"/><path d="M${x + 32} ${900 - 270} l-14 22 h28 Z" fill="#150c08"/>`).join("");
    return [{ svg: sky("#3c3430", "#a8886a"), depth: 0.08 },
      { svg: V(tower(960, 700, 900, 420, "#1e1410", "#2c1e16") + tower(400, 700, 360, 240, "#1e1410", "#2c1e16") + tower(1520, 700, 360, 240, "#1e1410", "#2c1e16")), depth: 0.3 },
      { svg: V(gi + steps, gd), depth: 0.6 },
      { svg: V(guards + person(820, 1010, 2.0, "#0c0705", "kneel") + person(1100, 1010, 2.0, "#0c0705", "kneel")), depth: 1.0 }];
  },
  wall() {
    const [gd, gi] = ground(780, "#5a3a26", "#22150e"), [hd, hi] = haze(760, "#f0b878", 0.45);
    const wall = `<path d="M0 260 L1250 640 L1250 790 L0 1000 Z" fill="#5b3a2a"/><path d="M0 260 L1250 640 L1250 660 L0 300 Z" fill="#3a241a"/>
      ${[...Array(22)].map((_, i) => { const t = i / 22, x = t * 1250, y = 260 + t * 380 - 26 * (1 - t); return `<rect x="${x}" y="${y - 26 * (1 - t * 0.7)}" width="${30 * (1 - t * 0.7)}" height="${26 * (1 - t * 0.7)}" fill="#3a241a"/>`; }).join("")}
      ${tower(260, 360, 260, 280, "#2a1810", "#4a2e20")}${tower(820, 520, 160, 170, "#2a1810", "#4a2e20")}`;
    const shaft = `<path d="M330 960 L560 520 L580 528 L352 968 Z" fill="#2a1810"/><circle cx="300" cy="930" r="70" fill="none" stroke="#2a1810" stroke-width="14"/>${[...Array(8)].map((_, i) => `<line x1="300" y1="930" x2="${300 + 70 * Math.cos(i * Math.PI / 4)}" y2="${930 + 70 * Math.sin(i * Math.PI / 4)}" stroke="#2a1810" stroke-width="6"/>`).join("")}`;
    return [{ svg: sky("#4a2a1c", "#f0a860", { sun: [1500, 700], glow: 0.6 }), depth: 0.08 },
      { svg: V(`<rect x="1250" y="740" width="670" height="16" fill="#f6d2a0" opacity="0.7"/>`), depth: 0.2 },
      { svg: V(gi + hi + wall, gd + hd), depth: 0.5 },
      { svg: V(shaft), depth: 1.0 }];
  },
  marketDark() {
    const [gd, gi] = ground(850, "#2e2622", "#14100e");
    return [{ svg: sky("#1e1a1a", "#6a5a50", { sun: [1180, 600], sunColor: "#c8b8a0", glow: 0.25 }), depth: 0.08 },
      { svg: V(skyline(640, "#3a3230", 7, 0.8)), depth: 0.18 },
      { svg: gateLayer({ dark: true }), depth: 0.35 },
      { svg: V(gi + stalls("#100c0a", 3), gd), depth: 0.6 },
      { svg: V(crowd({ n: 14, x0: 200, x1: 1700, y0: 880, y1: 1040, seed: 51, c: "#0c0908", pose: "hunch" })), depth: 1.0 }];
  },
  inn() {
    const lg = uid("lan"), dr = uid("dr");
    const house = `<path d="M560 560 L960 430 L1360 560 Z" fill="#0e131c"/><rect x="620" y="560" width="680" height="380" fill="#151c28"/>
      <rect x="880" y="660" width="160" height="280" fill="#0a0d14"/><path d="M880 660 L960 660 L960 940 L880 940 Z" fill="url(#${dr})"/>
      <circle cx="1100" cy="700" r="140" fill="url(#${lg})"/><rect x="1086" y="672" width="28" height="44" rx="8" fill="#f2a050"/>`;
    const defs = `<radialGradient id="${lg}"><stop offset="0" stop-color="#f2a050" stop-opacity="0.65"/><stop offset="1" stop-color="#f2a050" stop-opacity="0"/></radialGradient><linearGradient id="${dr}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#f0a050" stop-opacity="0.9"/><stop offset="1" stop-color="#f0a050" stop-opacity="0.2"/></linearGradient>`;
    const [gd, gi] = ground(930, "#141a24", "#06080c");
    return [{ svg: sky("#05080f", "#1f2c44", { sun: [420, 260], sunColor: "#e8eef8", glow: 0.35, moon: true }), depth: 0.06 },
      { svg: V(`<rect x="0" y="600" width="1920" height="60" fill="#0c111a"/>${[...Array(30)].map((_, i) => `<rect x="${i * 66}" y="580" width="34" height="22" fill="#0c111a"/>`).join("")}`), depth: 0.2 },
      { svg: V(gi + house + crowd({ n: 5, x0: 180, x1: 420, y0: 930, y1: 960, seed: 61, c: "#05070b" }), gd + defs), depth: 0.55 },
      { svg: V(person(820, 1000, 2.6, "#040507", "cloak")), depth: 1.1 }];
  },
};
