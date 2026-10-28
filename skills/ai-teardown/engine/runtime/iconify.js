/**
 * 开源图标（Iconify 格式：IconPark、tabler、lucide、iconoir），构建时由 scripts/icons.py 抽成小 JSON 打进 bundle，渲染不联网。
 *   registerIcons(json)            注册一批图标
 *   ico("icon-park:robot", 48, {tone: "m6"})   建一个 <svg>；线条图标描边跟 currentColor
 *   drawIcon(svg, p)               线条图标「自己画出来」：p 从 0 到 1；有填色的在后半段淡入
 *
 * IconPark 多色图标（前缀 icon-park:）原本是四个固定色：#000 描边、#2F88FF 填充、#FFF 内描边、#43CCF8 内填充。
 * 这里换成 CSS 变量 --ic-s / --ic-f / --ic-i / --ic-if，用 ico(name, size, {tone: "m5"}) 一次换成某个马卡龙色位。
 */
import { s } from "./dom.js";

const REG = {};
export const registerIcons = (json) => Object.assign(REG, json);
export const hasIcon = (name) => name in REG;

const SHAPES = "path,circle,rect,line,polyline,polygon,ellipse";

const PARK = { "#000": "--ic-s", "#000000": "--ic-s", "#2f88ff": "--ic-f", "#fff": "--ic-i", "#ffffff": "--ic-i", "#43ccf8": "--ic-if" };

export const ico = (name, size = 24, { color = "currentColor", stroke = null, draw = false, tone = null } = {}) => {
  const rec = REG[name];
  if (!rec) throw new Error(`图标没注册：${name}（先跑 scripts/icons.py）`);
  const svg = s("svg", { viewBox: `0 0 ${rec.w} ${rec.h}`, width: size, height: size, style: { color, overflow: "visible", display: "block" } });
  svg.innerHTML = rec.body;
  if (name.startsWith("icon-park:")) {
    // 表现属性里不能写 var()，改成内联样式
    for (const el of svg.querySelectorAll("*")) {
      for (const a of ["fill", "stroke"]) {
        const v = PARK[(el.getAttribute(a) || "").toLowerCase()];
        if (v) el.style[a] = `var(${v})`;
      }
    }
    const c = tone ?? "m6";
    for (const [k, v] of Object.entries({ "--ic-s": `var(--${c}-d)`, "--ic-f": `var(--${c})`, "--ic-i": "var(--surface)", "--ic-if": `var(--${c}-t)` })) svg.style.setProperty(k, v);
  }
  // stroke 按 24 网格给；IconPark 是 48 网格，要等比放大
  if (stroke != null) for (const el of svg.querySelectorAll("[stroke-width]")) el.setAttribute("stroke-width", ((stroke * rec.w) / 24).toFixed(2));
  if (draw) {
    // pathLength=1 让每段描边都按 0..1 计长，dashoffset 就能统一驱动
    for (const el of svg.querySelectorAll(SHAPES)) {
      el.setAttribute("pathLength", "1");
      el.setAttribute("stroke-dasharray", "1 1");
      el.setAttribute("stroke-dashoffset", "1");
    }
    svg.dataset.draw = "1";
  }
  return svg;
};

export const drawIcon = (svg, p) => {
  // 线条在前 70% 画完，填色在后半段淡入（纯线条图标没有填色，不受影响）
  const pc = Math.min(1, Math.max(0, p));
  const v = (1 - Math.min(1, pc / 0.7)).toFixed(4);
  const f = Math.min(1, Math.max(0, (pc - 0.5) / 0.5)).toFixed(3);
  for (const el of svg.querySelectorAll(SHAPES)) {
    if (el.getAttribute("stroke-dashoffset") !== v) el.setAttribute("stroke-dashoffset", v);
    if (el.style.fillOpacity !== f) el.style.fillOpacity = f;
  }
  for (const g of svg.querySelectorAll("g")) if (g.style.fillOpacity !== f) g.style.fillOpacity = f;
};
