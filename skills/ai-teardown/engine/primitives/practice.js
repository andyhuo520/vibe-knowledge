/**
 * 实战课用的两个原语。
 *
 * Steps 步骤卡：编号步骤依次出现，每步一句说明 + 一行要敲的命令（深色等宽框）+ 可选的「你会看到」。
 *   params: items [{text, cmd, see, at}], title, w, at, out, active（当前步骤高亮，按 at 自动推进）
 * Pause 暂停想一想：大徽章 + 问题，3-2-1 倒计时圈，然后揭晓答案。
 *   params: q, a, at, revealAt, out, sub
 * render(t) 只依赖 t。
 */
import { h, setStyle } from "../runtime/dom.js";
import { appear, hz, UI } from "../runtime/spring.js";

const POP = { w: hz(3.2), z: 0.55 };
import { clamp01 } from "../runtime/ease.js";
import { mountTyping, typingCss } from "../runtime/typing.js";

const CSS = `
.st{position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:flex;flex-direction:column;gap:18px}
.st-title{font:800 44px/1.2 var(--sans);color:var(--ink);margin-bottom:6px}
.st-item{display:grid;grid-template-columns:64px 1fr;column-gap:22px;align-items:start;background:var(--surface);border-radius:22px;padding:20px 26px;
  border:2.5px solid var(--line);box-shadow:var(--shadow)}
.st-item.on{border-color:var(--m6)}
.st-n{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font:800 30px/1 "Geist",var(--sans);color:#fff;background:var(--m6)}
.st-text{font:750 34px/1.35 var(--sans);color:var(--ink)}
.st-cmd{margin-top:12px;font:600 29px/1.35 "Geist Mono","SF Mono",Menlo,"Noto Sans SC",monospace;color:#E4E8F1;background:#1B1F2A;border-radius:12px;padding:12px 18px;white-space:pre-wrap;word-break:break-all}
.st-cmd::before{content:"$ ";color:#99C794}
.st-cmd.plain::before{content:""}
.st-see{margin-top:10px;font:600 26px/1.4 var(--sans);color:var(--ink2)}
.st-see::before{content:"你会看到：";color:var(--m4-d);font-weight:800}
.pz{position:absolute;left:0;top:0;width:1500px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;text-align:center;gap:26px}
.pz-badge{display:flex;align-items:center;gap:14px;font:800 34px/1 var(--sans);color:var(--m6-d);background:var(--m6-t);padding:14px 26px;border-radius:999px}
.pz-q{font:800 64px/1.3 var(--sans);color:var(--ink);max-width:1400px;text-wrap:balance}
.pz-ring{position:relative;width:120px;height:120px}
.pz-ring svg{position:absolute;inset:0;transform:rotate(-90deg)}
.pz-num{position:absolute;inset:0;display:grid;place-items:center;font:800 54px/1 "Geist",var(--sans);color:var(--m6-d)}
.pz-a{font:750 46px/1.4 var(--sans);color:var(--ink);background:var(--surface);border-radius:24px;padding:22px 34px;box-shadow:var(--shadow);border:2.5px solid var(--m4);max-width:1300px}
.pz-a b{background:linear-gradient(transparent 60%,var(--m3) 60%)}
`;

export const Steps = {
  name: "steps",
  create(root, p, ctx) {
    ctx.css("pr-practice", CSS);
    typingCss(ctx.css);
    const at = p.at ?? 0, out = p.out ?? Infinity;
    const el = h("div", { class: "st", style: { width: `${p.w ?? 1300}px` } });
    let title = null;
    if (p.title) { title = h("div", { class: "st-title", text: p.title }); el.append(title); }
    const items = p.items.map((it, i) => {
      const box = h("div", { class: "st-item" });
      box.append(h("div", { class: "st-n", text: String(it.n ?? i + 1) }));
      const col = h("div");
      col.append(h("div", { class: "st-text", text: it.text }));
      let cmd = null, ty = null;
      if (it.cmd) { cmd = h("div", { class: `st-cmd${it.plain ? " plain" : ""}` }); col.append(cmd); ty = mountTyping(cmd, it.cmd, { cps: it.cps ?? 26, seed: 30 + i }); }
      if (it.see) col.append(h("div", { class: "st-see", text: it.see }));
      box.append(col);
      el.append(box);
      return { it, box, ty };
    });
    root.append(el);
    return {
      duration: out,
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        setStyle(el, "opacity", (1 - clamp01((t - out) / 0.3)).toFixed(3));
        if (title) setStyle(title, "opacity", appear(t, at, UI).toFixed(3));
        let active = -1;
        items.forEach((q, i) => { if (t >= q.it.at) active = i; });
        items.forEach((q, i) => {
          const a = appear(t, q.it.at, UI);
          setStyle(q.box, "opacity", a.toFixed(3));
          setStyle(q.box, "transform", `translateY(${((1 - a) * 24).toFixed(1)}px)`);
          q.box.classList.toggle("on", i === active);
          if (q.ty) q.ty.render(t, q.it.at + 0.35);
        });
      },
    };
  },
};

export const Pause = {
  name: "pause",
  create(root, p, ctx) {
    ctx.css("pr-practice", CSS);
    const at = p.at ?? 0, out = p.out ?? Infinity, rv = p.revealAt ?? at + 4.2;
    const el = h("div", { class: "pz" });
    const badge = h("div", { class: "pz-badge", text: "⏸ 暂停想一想" });
    const q = h("div", { class: "pz-q", text: p.q });
    const ring = h("div", { class: "pz-ring" });
    ring.innerHTML = `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" stroke-width="10"/><circle class="arc" cx="60" cy="60" r="52" fill="none" stroke="var(--m6)" stroke-width="10" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/></svg>`;
    const num = h("div", { class: "pz-num" });
    ring.append(num);
    const arc = ring.querySelector(".arc");
    const ans = h("div", { class: "pz-a" });
    ans.innerHTML = (p.a ?? "").replace(/\*(.+?)\*/g, "<b>$1</b>");
    el.append(badge, q, ring, ans);
    root.append(el);
    const cd0 = at + 1.0, cd1 = rv - 0.2;   // 倒计时区间
    return {
      duration: out,
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        setStyle(el, "opacity", (1 - clamp01((t - out) / 0.3)).toFixed(3));
        const a = appear(t, at, POP);
        setStyle(badge, "transform", `scale(${a.toFixed(3)})`);
        setStyle(q, "opacity", appear(t, at + 0.3, UI).toFixed(3));
        const k = clamp01((t - cd0) / Math.max(0.5, cd1 - cd0));
        const showRing = t >= cd0 - 0.2 && t < rv;
        setStyle(ring, "opacity", showRing ? appear(t, cd0 - 0.2, UI).toFixed(3) : "0");
        arc.setAttribute("stroke-dashoffset", (k).toFixed(4));
        num.textContent = String(Math.max(1, Math.ceil(3 * (1 - k))));
        const ra = appear(t, rv, UI);
        setStyle(ans, "opacity", ra.toFixed(3));
        setStyle(ans, "transform", `translateY(${((1 - ra) * 20).toFixed(1)}px)`);
        setStyle(ring, "display", t >= rv ? "none" : "block");
      },
    };
  },
};

/**
 * Shot 截图：官方截图、实拍网页截图。不加相框、不歪斜，位置精确，方便在上面画涂鸦。
 *   params: src, w, h, at, out, credit, push（慢推近的幅度，默认 0.03）
 */
const SHOT_CSS = `
.sh{position:absolute;left:0;top:0;transform:translate(-50%,-50%)}
.sh-img{border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(20,30,40,.22),0 0 0 1.5px rgba(0,0,0,.06)}
.sh-img img{display:block;width:100%;height:100%;object-fit:cover;transform-origin:50% 40%}
.sh-cr{position:absolute;right:4px;bottom:-34px;font:500 18px/1.4 var(--sans);color:var(--ink3);white-space:nowrap}
`;
export const Shot = {
  name: "shot",
  create(root, p, ctx) {
    ctx.css("pr-shot", SHOT_CSS);
    const at = p.at ?? 0, out = p.out ?? Infinity;
    const el = h("div", { class: "sh", style: { width: `${p.w}px`, height: `${p.h}px` } });
    const box = h("div", { class: "sh-img", style: { width: `${p.w}px`, height: `${p.h}px`, position: "relative" } });
    const img = h("img", { src: p.src, alt: p.alt ?? "" });
    if (p.crop) {   // 只显示原图的一部分：crop = [x0, y0, x1, y1]（占原图宽高的比例）
      const [c0, c1, c2, c3] = p.crop, iw = p.w / (c2 - c0), ih = p.h / (c3 - c1);
      Object.assign(img.style, { position: "absolute", width: `${iw}px`, height: `${ih}px`, left: `${-c0 * iw}px`, top: `${-c1 * ih}px`, objectFit: "fill", maxWidth: "none" });
    }
    box.append(img);
    el.append(box);
    if (p.credit) el.append(h("div", { class: "sh-cr", text: p.credit }));
    root.append(el);
    return {
      duration: out,
      render(t) {
        const vis = t >= at - 0.05 && t <= out + 0.4;
        setStyle(el, "visibility", vis ? "visible" : "hidden");
        if (!vis) return;
        const a = appear(t, at, UI);
        setStyle(el, "opacity", (a * (1 - clamp01((t - out) / 0.3))).toFixed(3));
        setStyle(el, "transform", `translate(-50%,-50%) translateY(${((1 - a) * 28).toFixed(1)}px)`);
        const k = clamp01((t - at) / Math.max(1, (out === Infinity ? 12 : out - at)));
        setStyle(img, "transform", `scale(${(1 + (p.push ?? 0.03) * k).toFixed(4)})`);
      },
    };
  },
};
