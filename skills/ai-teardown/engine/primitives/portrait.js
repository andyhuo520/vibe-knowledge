/**
 * Portrait 人物/图片卡：拍立得相框 + 两条胶带，落下时带一点旋转；照片缓慢推近（幅度很小，不晕）；
 * 名字打字，相框外下方放署名与许可（网上取的图必须带）。以原点为中心；render 是纯函数。
 *
 * params
 *   src, w, h         照片地址与显示尺寸
 *   pos               object-position，裁切焦点（默认 "50% 30%"）
 *   tilt              相框角度（度，默认 -3）
 *   at, out           出场、退场
 *   kb {z0, z1, dur}  推近幅度（默认 1 → 1.06，持续到 out，没有 out 就 12 秒）
 *   name, sub         相框下沿的名字（打字）与一句说明
 *   credit            署名与许可
 *   tape [c1, c2]     两条胶带的色位（默认 m1、m5）；false 不要胶带
 *   facts             点图看出处
 */
import { h, setStyle } from "../runtime/dom.js";
import { appear, hz, UI } from "../runtime/spring.js";
import { clamp01, sineInOut } from "../runtime/ease.js";
import { mountTyping, typingCss } from "../runtime/typing.js";

const CSS = `
.pt{position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center}
.pt-card{position:relative;background:var(--surface);padding:16px 16px 0;border-radius:12px;box-shadow:var(--shadow)}
.pt-img{overflow:hidden;border-radius:6px;background:var(--surface2)}
.pt-img img{display:block;width:100%;height:100%;object-fit:cover;transform-origin:50% 40%}
.pt-cap{text-align:center;padding:16px 8px 20px}
.pt-name{font:750 40px/1.2 var(--sans);color:var(--ink)}
.pt-sub{font:500 24px/1.35 var(--sans);color:var(--ink2);margin-top:6px}
.pt-tape{position:absolute;top:-16px;width:132px;height:38px;border-radius:4px;opacity:.88}
.pt-credit{font:500 18px/1.4 var(--sans);color:var(--ink3);margin-top:16px;text-align:center;white-space:normal}
`;
const DROP = { w: hz(2.1), z: 0.58 };

export default {
  name: "portrait",
  create(root, p, ctx) {
    ctx.css("pr-portrait", CSS);
    typingCss(ctx.css);
    const at = p.at ?? 0;
    const out = p.out ?? Infinity;
    const tilt = p.tilt ?? -3;
    const kb = { z0: 1, z1: 1.06, dur: Number.isFinite(out) ? out - at : 12, ...(p.kb ?? {}) };
    const el = h("div", { class: "pt" });
    const card = h("div", { class: "pt-card" });
    const frame = h("div", { class: "pt-img", style: { width: `${p.w}px`, height: `${p.h}px` } });
    const img = h("img", { src: p.src, alt: p.name ?? "", style: { objectPosition: p.pos ?? "50% 30%" } });
    frame.append(img);
    card.append(frame);
    let name = null, sub = null, tyN = null, tyS = null;
    if (p.name || p.sub) {
      const cap = h("div", { class: "pt-cap", style: { width: `${p.w}px` } });
      // 名字字号跟着卡片宽度走，窄卡片放长名字也不折行
      const nameSize = p.nameSize ?? Math.min(40, Math.floor((p.w - 16) / Math.max(4, Array.from(p.name ?? "").length)));
      if (p.name) { name = h("div", { class: "pt-name", style: { fontSize: `${nameSize}px` } }); cap.append(name); tyN = mountTyping(name, p.name, { cps: 9, seed: 11 }); }
      if (p.sub) { sub = h("div", { class: "pt-sub" }); cap.append(sub); tyS = mountTyping(sub, p.sub, { cps: 15, seed: 17 }); }
      card.append(cap);
    }
    if (p.tape !== false) {
      const [c1, c2] = p.tape ?? ["m1", "m5"];
      const tape = (c, side) => h("div", { class: "pt-tape", style: {
        [side]: "-34px", transform: `rotate(${side === "left" ? -36 : 36}deg)`,
        background: `repeating-linear-gradient(45deg, var(--${c}) 0 10px, var(--${c}-t) 10px 20px)`,
      } });
      card.append(tape(c1, "left"), tape(c2, "right"));
    }
    el.append(card);
    let credit = null;
    if (p.credit) {
      credit = h("div", { class: "pt-credit", text: p.credit, style: { maxWidth: `${p.w + 60}px` } });
      el.append(credit);
    }
    root.append(el);

    return {
      duration: out,
      sfx: [{ t: at + 0.18, name: "paper-place-1", gain: -16 }],
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const a = appear(t, at, DROP);
        const o = clamp01((t - out) / 0.28);
        setStyle(el, "opacity", (clamp01(a * 2) * (1 - o)).toFixed(3));
        setStyle(el, "filter", o > 0.01 ? `blur(${(o * 8).toFixed(2)}px)` : "none");
        setStyle(card, "transform", `translateY(${((1 - a) * -70).toFixed(2)}px) rotate(${(tilt - (1 - a) * 9).toFixed(3)}deg) scale(${(0.9 + 0.1 * a).toFixed(4)})`);
        const z = kb.z0 + (kb.z1 - kb.z0) * sineInOut(clamp01((t - at) / kb.dur));
        setStyle(img, "transform", `scale(${z.toFixed(4)})`);
        if (tyN) tyN.render(t, at + 0.45);
        if (tyS) tyS.render(t, at + 0.55 + (tyN?.dur ?? 0));
        if (credit) setStyle(credit, "opacity", clamp01(appear(t, at + 0.8, UI)).toFixed(3));
      },
      hotspots(t) {
        return p.facts && t >= at && t <= out ? [{ el: card, facts: p.facts, label: p.name ?? "" }] : [];
      },
    };
  },
};
