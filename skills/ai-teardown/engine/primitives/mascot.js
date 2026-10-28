/**
 * Mascot 机器人讲解员：悬浮、眨眼、说话时按词张嘴，能挥手、指向、欢呼、摊手介绍。纯 SVG，render(t) 是纯函数。
 * 场景之间换位置用 spots（在转场遮住画面时瞬移，落地时弹一下），全程不需要镜头移动。
 *
 * params
 *   size                  高度 px（默认 320）
 *   at, out               出场、退场（本地秒）
 *   spots [[t, x, y, size?]]   从 t 起站到 (x, y)（相对场景原点），可顺便换大小；null 表示藏起来
 *   poses [[t, pose]]     idle | wave | point-l | point-r | cheer | present
 *   talk [[t0, t1]]       说话区间（一般直接用旁白逐词时间），嘴按词开合
 *   look [[t, x, y]]      眼睛看向，-1..1
 *   seed                  眨眼与悬浮相位
 */
import { h, s, setAttr, setStyle } from "../runtime/dom.js";
import { appear, track, hz } from "../runtime/spring.js";
import { clamp01 } from "../runtime/ease.js";

const CSS = `
.ms{position:absolute;left:0;top:0;width:0;height:0}
.ms svg{position:absolute;overflow:visible}
`;

// [左臂抬起角, 右臂抬起角, 挥动幅度]
const POSE = {
  idle: [16, 16, 0],
  wave: [18, 148, 1],
  "point-r": [16, 96, 0],
  "point-l": [96, 16, 0],
  cheer: [148, 148, 0],
  present: [58, 58, 0],
};
const ARM = { w: hz(2.4), z: 0.62 };
const LOOK = { w: hz(3), z: 0.9 };
const POP = { w: hz(3.4), z: 0.55 };
const SCREEN = "#2A2540";

export default {
  name: "mascot",
  create(root, p, ctx) {
    ctx.css("pr-mascot", CSS);
    const size = p.size ?? 320;
    const at = p.at ?? 0;
    const out = p.out ?? Infinity;
    const seed = p.seed ?? 1;
    const poses = p.poses ?? [[0, "idle"]];
    const talk = (p.talk ?? []).filter(([a, b]) => b - a > 0.06);
    const look = p.look ?? [[0, 0, 0]];
    const spots = p.spots ?? [[0, 0, 0, size]];

    const el = h("div", { class: "ms" });
    const svg = s("svg", { viewBox: "0 0 300 380", width: 300, height: 380, style: { left: "-150px", top: "-380px" } });
    const ink = "var(--ink)";
    const shadow = s("ellipse", { cx: 150, cy: 368, rx: 76, ry: 11, fill: "var(--ink)", opacity: 0.1 });
    const jet = s("ellipse", { cx: 150, cy: 330, rx: 34, ry: 10, fill: "var(--m3)", opacity: 0.55 });
    const bot = s("g");
    const glow = s("circle", { cx: 150, cy: 30, r: 21, fill: "var(--m1)", opacity: 0.35 });
    const armG = (x) => {
      const g = s("g", { transform: `translate(${x} 232)` });
      g.append(
        s("rect", { x: -13, y: -8, width: 26, height: 78, rx: 13, fill: "var(--m6)", stroke: ink, "stroke-width": 5 }),
        s("circle", { cx: 0, cy: 76, r: 16, fill: "var(--surface)", stroke: ink, "stroke-width": 5 }),
      );
      return g;
    };
    const armL = armG(100);
    const armR = armG(200);
    const eye = (cx) => s("rect", { x: cx - 9, y: 117, width: 18, height: 30, rx: 9, fill: "var(--m4)" });
    const eyes = s("g");
    eyes.append(eye(126), eye(174));
    const mouth = s("ellipse", { cx: 150, cy: 163, rx: 12, ry: 3, fill: "var(--m1)" });
    const chest = s("circle", { cx: 150, cy: 254, r: 15, fill: "var(--m1)", stroke: ink, "stroke-width": 4 });
    bot.append(
      s("line", { x1: 150, y1: 72, x2: 150, y2: 40, stroke: ink, "stroke-width": 6, "stroke-linecap": "round" }),
      glow,
      s("circle", { cx: 150, cy: 30, r: 11, fill: "var(--m1)", stroke: ink, "stroke-width": 5 }),
      s("rect", { x: 52, y: 118, width: 24, height: 52, rx: 12, fill: "var(--m6)", stroke: ink, "stroke-width": 5 }),
      s("rect", { x: 224, y: 118, width: 24, height: 52, rx: 12, fill: "var(--m6)", stroke: ink, "stroke-width": 5 }),
      s("rect", { x: 68, y: 68, width: 164, height: 136, rx: 50, fill: "var(--surface)", stroke: ink, "stroke-width": 6 }),
      s("rect", { x: 90, y: 92, width: 120, height: 90, rx: 32, fill: SCREEN }),
      eyes,
      s("ellipse", { cx: 106, cy: 163, rx: 9, ry: 5.5, fill: "var(--m1)", opacity: 0.75 }),
      s("ellipse", { cx: 194, cy: 163, rx: 9, ry: 5.5, fill: "var(--m1)", opacity: 0.75 }),
      mouth,
      s("rect", { x: 134, y: 202, width: 32, height: 14, rx: 5, fill: ink }),
      s("rect", { x: 94, y: 210, width: 112, height: 104, rx: 38, fill: "var(--m6-t)", stroke: ink, "stroke-width": 6 }),
      chest,
      s("rect", { x: 128, y: 284, width: 44, height: 9, rx: 4.5, fill: "var(--m6)" }),
      armL,
      armR,
    );
    svg.append(shadow, jet, bot);
    el.append(svg);
    root.append(el);

    const k = (i) => poses.map(([t, name]) => [t, (POSE[name] ?? POSE.idle)[i]]);
    const kL = k(0), kR = k(1), kW = k(2);
    const kx = look.map(([t, x]) => [t, x]);
    const ky = look.map(([t, , y]) => [t, y]);

    /** 按词开合：每个词是一个 0→1→0 的小鼓包 */
    const openAt = (t) => {
      let v = 0;
      for (const [a, b] of talk) {
        if (a > t) break;
        if (t <= b) v = Math.max(v, Math.pow(Math.sin(Math.PI * (t - a) / (b - a)), 0.7));
      }
      return v;
    };

    return {
      duration: out,
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.5;
        setStyle(el, "display", vis ? "" : "none");
        if (!vis) return;
        // 站位（瞬移，落地弹一下）
        let sp = spots[0], spT = spots[0][0];
        for (const q of spots) if (q[0] <= t) { sp = q; spT = q[0]; }
        if (!sp || sp[1] == null) return setStyle(el, "display", "none");
        const sz = sp[3] ?? size;
        const land = spT > at ? appear(t, spT, POP) : 1;
        const inA = appear(t, at, POP) * (1 - clamp01((t - out) / 0.35));
        const sc = (sz / 380) * (0.5 + 0.5 * inA) * (0.86 + 0.14 * land);
        const fy = 7 * Math.sin(2 * Math.PI * 0.42 * t + seed) + (1 - inA) * 60;
        setStyle(el, "transform", `translate(${sp[1]}px, ${sp[2] + fy}px) scale(${sc.toFixed(4)})`);
        setStyle(el, "opacity", clamp01(inA * 1.4).toFixed(3));

        const talkV = openAt(t);
        const wv = track(t, kW, ARM);
        const wave = wv * 22 * Math.sin(2 * Math.PI * 2.1 * t);
        setAttr(armL, "transform", `translate(100 232) rotate(${track(t, kL, ARM).toFixed(2)})`);
        setAttr(armR, "transform", `translate(200 232) rotate(${(-track(t, kR, ARM) + wave).toFixed(2)})`);
        const ph = (t + seed * 1.37) % 3.4;
        const blink = ph < 0.16 ? 1 - 0.88 * Math.sin((Math.PI * ph) / 0.16) : 1;
        const lx = track(t, kx, LOOK) * 9, ly = track(t, ky, LOOK) * 7;
        setAttr(eyes, "transform", `translate(${lx.toFixed(2)} ${(ly + 132 * (1 - blink)).toFixed(2)}) scale(1 ${blink.toFixed(3)})`);
        setAttr(mouth, "ry", (3 + 11 * talkV).toFixed(2));
        setAttr(mouth, "rx", (12 - 2 * talkV).toFixed(2));
        setAttr(chest, "r", (15 + 3 * talkV).toFixed(2));
        setAttr(glow, "opacity", (0.22 + 0.16 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.8 * t)) + 0.3 * talkV).toFixed(3));
        setAttr(jet, "rx", (32 + 4 * Math.sin(2 * Math.PI * 1.3 * t)).toFixed(2));
        setAttr(shadow, "rx", (76 + fy * 0.8).toFixed(2));
      },
    };
  },
};
