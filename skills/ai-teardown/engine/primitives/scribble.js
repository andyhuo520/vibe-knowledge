/**
 * Doodles 涂鸦讲解：在画面上「边讲边画」——手绘风格的圈、下划线、方框、箭头、勾、叉，旁边配手写批注（手札体）。
 * 坐标是舞台坐标（原点在画面中心，x 向右、y 向下，单位像素）；场景模板会把「终端第几行第几列」「截图的几成位置」换算过来。
 *
 * params
 *   marks [{kind, box: [x0, y0, x1, y1], at, dur, until, color, note: {text, side, dx, dy, size}}]
 *     kind   circle 圈 · underline 下划线 · box 方框 · arrow 箭头（从批注指向 box）· check 勾 · cross 叉 · bracket 竖括号
 *     note   手写批注：side 放在 box 的哪一边（right / left / top / bottom），dx/dy 微调；有 note 时 arrow 从批注画向目标
 *   out
 * 笔画用 pathLength + dashoffset 一笔画出来；抖动用固定种子，同一时刻画面永远一样。render(t) 只依赖 t。
 */
import { h, s, setStyle, setAttr } from "../runtime/dom.js";
import { appear, UI } from "../runtime/spring.js";
import { clamp01, cubicInOut } from "../runtime/ease.js";

const CSS = `
.dd{position:absolute;left:-960px;top:-540px;width:1920px;height:1080px;pointer-events:none}
.dd svg{position:absolute;inset:0;overflow:visible}
.dd-note{position:absolute;white-space:nowrap;font-family:"Hannotate SC","HanziPen SC","Kaiti SC",cursive;font-weight:700;transform-origin:0 50%}
`;

const INK = "#E4572E";
function rng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

function paths(kind, [x0, y0, x1, y1], r) {
  const j = (v) => v + (r() - 0.5) * 6;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 18, ry = (y1 - y0) / 2 + 14;
  if (kind === "circle") {
    const a0 = -2.4 + r() * 0.6, pts = [];
    for (let k = 0; k <= 44; k++) {
      const a = a0 + (k / 44) * Math.PI * 2 * 1.12, wob = 1 + (r() - 0.5) * 0.05;
      pts.push(`${(cx + Math.cos(a) * rx * wob).toFixed(1)},${(cy + Math.sin(a) * ry * wob).toFixed(1)}`);
    }
    return [`M${pts[0]} L${pts.slice(1).join(" ")}`];
  }
  if (kind === "underline") {
    const y = y1 + 4, n = 6, seg = [];
    for (let k = 0; k <= n; k++) seg.push(`${(x0 - 6 + ((x1 - x0 + 12) * k) / n).toFixed(1)},${(y + (k % 2 ? 3 : -3) + (r() - 0.5) * 3).toFixed(1)}`);
    return [`M${seg[0]} L${seg.slice(1).join(" ")}`];
  }
  if (kind === "box") {
    const p = 12;
    return [`M${j(x0 - p)},${j(y0 - p)} L${j(x1 + p + 8)},${j(y0 - p)} L${j(x1 + p)},${j(y1 + p + 6)} L${j(x0 - p - 6)},${j(y1 + p)} L${j(x0 - p + 4)},${j(y0 - p - 8)}`];
  }
  if (kind === "check") return [`M${j(x0)},${j(cy)} L${j(x0 + (x1 - x0) * 0.35)},${j(y1)} L${j(x1)},${j(y0 - 10)}`];
  if (kind === "cross") return [`M${j(x0)},${j(y0)} L${j(x1)},${j(y1)}`, `M${j(x1)},${j(y0)} L${j(x0)},${j(y1)}`];
  if (kind === "bracket") return [`M${j(x0 - 14)},${j(y0)} Q${j(x0 - 30)},${j(cy)} ${j(x0 - 14)},${j(y1)}`];
  return [];
}

function arrowPath([ax, ay], [bx, by], r) {
  const mx = (ax + bx) / 2 + (r() - 0.5) * 60, my = (ay + by) / 2 - 40 - r() * 30;
  const ang = Math.atan2(by - my, bx - mx), L = 18;
  const h1 = [bx - L * Math.cos(ang - 0.45), by - L * Math.sin(ang - 0.45)], h2 = [bx - L * Math.cos(ang + 0.45), by - L * Math.sin(ang + 0.45)];
  return [`M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`,
    `M${h1[0].toFixed(1)},${h1[1].toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)} L${h2[0].toFixed(1)},${h2[1].toFixed(1)}`];
}

export const Doodles = {
  name: "doodles",
  create(root, p, ctx) {
    ctx.css("pr-doodles", CSS);
    const out = p.out ?? Infinity;
    const el = h("div", { class: "dd" });
    const svg = s("svg", { viewBox: "-960 -540 1920 1080", width: 1920, height: 1080 });
    el.append(svg);
    const items = (p.marks ?? []).map((m, i) => {
      const r = rng(97 + i * 131);
      const color = m.color ?? INK, box = m.box;
      const dur = m.dur ?? 0.55;
      let noteEl = null, anchor = null;
      if (m.note) {
        const n = typeof m.note === "string" ? { text: m.note } : m.note;
        const side = n.side ?? "right", size = n.size ?? 38;
        const [x0, y0, x1, y1] = box;
        const pos = { right: [x1 + 60, (y0 + y1) / 2], left: [x0 - 60, (y0 + y1) / 2], top: [(x0 + x1) / 2, y0 - 70], bottom: [(x0 + x1) / 2, y1 + 70] }[side];
        const nx = pos[0] + (n.dx ?? 0), ny = pos[1] + (n.dy ?? 0);
        noteEl = h("div", { class: "dd-note", text: n.text, style: { fontSize: `${size}px`, color,
          left: `${nx + 960}px`, top: `${ny + 540}px`, transform: `translate(${side === "left" ? "-100%" : side === "right" ? "0" : "-50%"},-50%) rotate(${n.rot ?? -3}deg)` } });
        el.append(noteEl);
        // 箭头从批注靠近目标的一侧出发
        anchor = { right: [nx - 10, ny], left: [nx + 10, ny], top: [nx, ny + 26], bottom: [nx, ny - 26] }[side];
      }
      const ds = [...paths(m.kind === "arrow" ? "" : m.kind, box, r)];
      if ((m.kind === "arrow" || m.arrow) && anchor) {
        const [x0, y0, x1, y1] = box;
        const tgt = { right: [x1 + 14, (y0 + y1) / 2], left: [x0 - 14, (y0 + y1) / 2], top: [(x0 + x1) / 2, y0 - 12], bottom: [(x0 + x1) / 2, y1 + 12] }[m.note?.side ?? "right"];
        ds.push(...arrowPath(anchor, tgt, r));
      }
      const strokes = ds.map((d) => {
        const pth = s("path", { d, fill: "none", stroke: color, "stroke-width": m.width ?? 6, "stroke-linecap": "round", "stroke-linejoin": "round",
          pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1, opacity: 0.92 });
        svg.append(pth);
        return pth;
      });
      return { m, strokes, noteEl, dur };
    });
    root.append(el);
    return {
      duration: out,
      render(t) {
        const vis = t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        setStyle(el, "opacity", (1 - clamp01((t - out) / 0.3)).toFixed(3));
        for (const q of items) {
          const at = q.m.at, gone = q.m.until != null ? 1 - clamp01((t - q.m.until) / 0.3) : 1;
          // 批注先写出来（0.35 秒），笔画一笔接一笔画
          let t0 = at;
          if (q.noteEl) {
            const a = appear(t, at, UI);
            setStyle(q.noteEl, "opacity", (clamp01((t - at) / 0.3) * gone).toFixed(3));
            setStyle(q.noteEl, "clipPath", `inset(0 ${(100 * (1 - cubicInOut(clamp01((t - at) / 0.45)))).toFixed(1)}% 0 0)`);
            t0 = at + 0.25 + 0 * a;
          }
          const per = q.dur / Math.max(1, q.strokes.length);
          q.strokes.forEach((pth, k) => {
            const k0 = t0 + k * per;
            setAttr(pth, "stroke-dashoffset", (1 - cubicInOut(clamp01((t - k0) / per))).toFixed(4));
            setAttr(pth, "opacity", (0.92 * gone).toFixed(3));
          });
        }
      },
    };
  },
};

export default Doodles;
