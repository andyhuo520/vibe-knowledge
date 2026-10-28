/**
 * Floaties 漂浮小图标：几枚马卡龙色小圆徽章依次弹出，之后轻轻上下漂、微微摆动，给大标题、开场、收尾添点活气。
 * 位置固定，不跟镜头走；render 是纯函数（漂浮相位由序号决定，不用随机数）。
 *
 * params
 *   items [{icon, x, y, size=72, color:"m1".."m6", at}]
 *   out
 */
import { h, setStyle } from "../runtime/dom.js";
import { appear, hz } from "../runtime/spring.js";
import { clamp01, cubicInOut, hash01 } from "../runtime/ease.js";
import { ico, drawIcon } from "../runtime/iconify.js";

const CSS = `
.fl{position:absolute;left:0;top:0;width:0;height:0}
.fl-it{position:absolute;border-radius:50%;display:grid;place-items:center;border-style:solid;box-shadow:var(--shadow)}
`;
const POP = { w: hz(3), z: 0.5 };

export default {
  name: "floaties",
  create(root, p, ctx) {
    ctx.css("pr-floaties", CSS);
    const out = p.out ?? Infinity;
    const el = h("div", { class: "fl" });
    root.append(el);
    const its = p.items.map((it, i) => {
      const sz = it.size ?? 72;
      const c = it.color ?? `m${1 + (i % 6)}`;
      const d = h("div", { class: "fl-it", style: { width: `${sz}px`, height: `${sz}px`, left: `${it.x - sz / 2}px`, top: `${it.y - sz / 2}px`,
        background: `var(--${c}-t)`, borderColor: `var(--${c})`, borderWidth: `${Math.max(3, Math.round(sz / 22))}px` } });
      const svg = ico(it.icon, Math.round(sz * 0.5), { color: `var(--${c}-d)`, stroke: 2, draw: true, tone: c });
      d.append(svg);
      el.append(d);
      return { it, d, svg, ph: hash01(i, 17) * 6.28, per: 2.8 + hash01(i, 23) * 1.6, amp: 7 + hash01(i, 29) * 6, rot: (hash01(i, 31) - 0.5) * 16 };
    });
    return {
      duration: out,
      sfx: p.items.map((it) => ({ t: it.at, name: "pop", gain: -25 })),
      render(t) {
        const o = clamp01((t - out) / 0.3);
        setStyle(el, "opacity", (1 - o).toFixed(3));
        for (const q of its) {
          const a = appear(t, q.it.at, POP);
          const vis = t >= q.it.at - 0.02 && o < 1;
          setStyle(q.d, "display", vis ? "" : "none");
          if (!vis) continue;
          const bob = Math.sin((2 * Math.PI * t) / q.per + q.ph);
          setStyle(q.d, "transform", `translateY(${(bob * q.amp).toFixed(2)}px) rotate(${(q.rot * bob * 0.5).toFixed(2)}deg) scale(${a.toFixed(4)})`);
          setStyle(q.d, "opacity", clamp01(a * 2).toFixed(3));
          drawIcon(q.svg, cubicInOut(clamp01((t - q.it.at - 0.1) / 0.6)));
        }
      },
    };
  },
};
