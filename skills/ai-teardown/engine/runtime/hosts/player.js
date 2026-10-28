/**
 * 互动课件宿主（V1 同步课件）：页面里实时渲染同一个舞台，<audio> 是主时钟。
 * 功能：播放 / 暂停、进度条（带章节刻度）、逐步前后（原语的 beats）、章节、字幕稿点击跳转、
 * 暂停时「点图看出处」（原语的 hotspots → 事实账本）。
 * 这里可以用 requestAnimationFrame——它只驱动交互播放，不参与出片。
 */
const CSS = `
.pl{--pl-bg:#0B1122;--pl-panel:#111A31;--pl-line:#24324F;--pl-ink:#EAF0FF;--pl-ink2:#A9B5D6;--pl-ink3:#6F7CA3;--pl-acc:#5B8CFF;--pl-hl:#FFD84D;
  --pl-hover:rgba(255,255,255,.04);--pl-cur:rgba(91,140,255,.14);
  display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;color:var(--pl-ink);font:15px/1.6 "Geist","Noto Sans SC","PingFang SC",sans-serif}
/* 浅色（马卡龙系列课）：mountPlayer(..., {light: true}) */
.pl.light{--pl-bg:#FFF8F2;--pl-panel:#FFFFFF;--pl-line:#EEDFD5;--pl-ink:#2F2A45;--pl-ink2:#5B5573;--pl-ink3:#7A7390;--pl-acc:#6548CC;--pl-hl:#C98A00;
  --pl-hover:rgba(101,72,204,.06);--pl-cur:rgba(101,72,204,.12)}
.pl.light .pl-screen{background:#FFF8F2;box-shadow:0 14px 36px rgba(94,72,130,.12)}
@media (max-width:980px){.pl{grid-template-columns:minmax(0,1fr)}}
.pl-main{min-width:0}
.pl-screen{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:14px;overflow:hidden}
.pl-fit{position:absolute;left:0;top:0;transform-origin:0 0}
.pl-hot{position:absolute;inset:0;pointer-events:none}
.pl-hot button{position:absolute;pointer-events:auto;border:2px dashed var(--pl-hl);background:rgba(255,216,77,.08);border-radius:10px;cursor:pointer;padding:0}
.pl-hot button:focus-visible{outline:3px solid var(--pl-hl);outline-offset:2px}
.pl-bar{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
.pl-btn{appearance:none;border:1px solid var(--pl-line);background:var(--pl-panel);color:var(--pl-ink);border-radius:10px;height:38px;min-width:38px;padding:0 12px;
  font:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.pl-btn:hover{border-color:var(--pl-ink3)} .pl-btn:focus-visible{outline:2px solid var(--pl-acc);outline-offset:2px}
.pl-time{font-variant-numeric:tabular-nums;color:var(--pl-ink2);min-width:96px;text-align:center}
.pl-track{position:relative;flex:1;min-width:180px;height:38px;display:flex;align-items:center}
.pl-track input{width:100%;accent-color:var(--pl-acc)}
.pl-tick{position:absolute;top:4px;width:2px;height:8px;background:var(--pl-ink3);pointer-events:none}
.pl-side{background:var(--pl-panel);border:1px solid var(--pl-line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:14px;min-height:0;max-height:640px}
.pl-side h3{margin:0;font-size:12px;letter-spacing:.14em;color:var(--pl-ink3);font-weight:500}
.pl-chap,.pl-lines{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.pl-lines{overflow:auto;min-height:0}
.pl-chap button,.pl-lines button{all:unset;display:block;width:100%;box-sizing:border-box;padding:6px 10px;border-radius:8px;cursor:pointer;color:var(--pl-ink2)}
.pl-chap button:hover,.pl-lines button:hover{background:var(--pl-hover)}
.pl-chap button[aria-current=true],.pl-lines button[aria-current=true]{color:var(--pl-ink);background:var(--pl-cur)}
.pl-chap small{color:var(--pl-ink3);font-variant-numeric:tabular-nums;margin-right:8px}
.pl-pop{position:absolute;max-width:360px;background:var(--pl-panel);border:1px solid var(--pl-line);border-radius:12px;padding:12px 14px;
  box-shadow:0 18px 50px rgba(0,0,0,.45);font-size:14px;z-index:5}
.pl-pop h4{margin:0 0 6px;font-size:14px}
.pl-pop p{margin:0 0 8px;color:var(--pl-ink2)}
.pl-pop .src{font-size:12px;color:var(--pl-ink3)}
.pl-hint{font-size:12.5px;color:var(--pl-ink3)}
`;

const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  e.append(...kids);
  return e;
};

export function mountPlayer(host, { stage, audio, chapters = [], captions = [], facts = {}, sources = {}, light = false }) {
  if (!document.getElementById("pl-css")) document.head.append(el("style", { id: "pl-css", text: CSS }));
  const root = el("div", { class: light ? "pl light" : "pl" });
  const screen = el("div", { class: "pl-screen" });
  const fit = el("div", { class: "pl-fit" });
  const hot = el("div", { class: "pl-hot" });
  stage.el.parentElement?.removeChild(stage.el);
  fit.append(stage.el);
  screen.append(fit, hot);

  const dur = stage.duration;
  const play = el("button", { class: "pl-btn", "aria-label": "播放", text: "▶" });
  const prev = el("button", { class: "pl-btn", "aria-label": "上一步", text: "‹ 上一步" });
  const next = el("button", { class: "pl-btn", "aria-label": "下一步", text: "下一步 ›" });
  const time = el("span", { class: "pl-time", text: `0:00 / ${fmt(dur)}` });
  const range = el("input", { type: "range", min: "0", max: String(dur), step: "0.01", value: "0", "aria-label": "进度" });
  const track = el("div", { class: "pl-track" }, range);
  for (const c of chapters) track.append(el("span", { class: "pl-tick", style: `left:calc(${(c.t / dur) * 100}% - 1px)` }));
  const speed = el("button", { class: "pl-btn", "aria-label": "倍速", text: "1×" });
  const bar = el("div", { class: "pl-bar" }, play, prev, next, track, time, speed);
  const hint = el("p", { class: "pl-hint", text: "空格播放 / 暂停，← → 逐步。暂停时，画面上带虚线框的元素可以点开看出处。" });
  const main = el("div", { class: "pl-main" }, screen, bar, hint);

  const chapList = el("ol", { class: "pl-chap" });
  const chapBtns = chapters.map((c) => {
    const b = el("button", { onclick: () => seekTo(c.t + 0.01, true) }, el("small", { text: fmt(c.t) }), c.title);
    chapList.append(el("li", {}, b));
    return b;
  });
  const lineList = el("ol", { class: "pl-lines" });
  const lineBtns = captions.map((c) => {
    const b = el("button", { onclick: () => seekTo(c.start + 0.01, true), text: c.text });
    lineList.append(el("li", {}, b));
    return b;
  });
  const side = el("aside", { class: "pl-side" }, el("h3", { text: "章节" }), chapList, el("h3", { text: "讲稿" }), lineList);
  root.append(main, side);
  host.append(root);

  // ---- fit the 1920×1080 stage into the screen box ----
  const resize = () => {
    const s = screen.clientWidth / stage.W;
    fit.style.transform = `scale(${s})`;
    drawHotspots();
  };
  new ResizeObserver(resize).observe(screen);

  // ---- clock ----
  let raf = 0;
  const now = () => audio.currentTime;
  const sync = (t) => {
    stage.seek(t);
    range.value = String(t);
    time.textContent = `${fmt(t)} / ${fmt(dur)}`;
    const ci = chapters.findLastIndex((c) => t >= c.t - 0.01);
    chapBtns.forEach((b, i) => b.setAttribute("aria-current", String(i === ci)));
    const li = captions.findIndex((c) => t >= c.start - 0.04 && t < c.end);
    lineBtns.forEach((b, i) => b.setAttribute("aria-current", String(i === li)));
    if (li >= 0 && !audio.paused) lineBtns[li].scrollIntoView({ block: "nearest" });
  };
  const loop = () => {
    sync(now());
    if (!audio.paused) raf = requestAnimationFrame(loop);
  };
  const seekTo = (t, pause = false) => {
    t = Math.max(0, Math.min(dur, t));
    if (pause) audio.pause();
    audio.currentTime = t;
    sync(t);
    drawHotspots();
  };
  audio.addEventListener("play", () => {
    play.textContent = "❚❚";
    play.setAttribute("aria-label", "暂停");
    hot.replaceChildren();
    closePop();
    raf = requestAnimationFrame(loop);
  });
  audio.addEventListener("pause", () => {
    play.textContent = "▶";
    play.setAttribute("aria-label", "播放");
    cancelAnimationFrame(raf);
    sync(now());
    drawHotspots();
  });
  play.addEventListener("click", () => (audio.paused ? audio.play() : audio.pause()));
  range.addEventListener("input", () => seekTo(parseFloat(range.value), true));
  const rates = [1, 1.25, 0.75];
  speed.addEventListener("click", () => {
    const r = rates[(rates.indexOf(audio.playbackRate) + 1) % rates.length];
    audio.playbackRate = r;
    speed.textContent = `${r}×`;
  });

  // ---- steps: primitive beats + chapter starts, landing a moment after each change ----
  const points = [...new Set([...stage.beats().map((b) => b.t), ...chapters.map((c) => c.t)].map((t) => +t.toFixed(2)))].sort((a, b) => a - b);
  // 每个逐步点落在变化完成之后（+0.7 秒），但不越过下一个点
  const settle = 0.7;
  const targets = points.map((p, i) => Math.min(p + settle, (points[i + 1] ?? dur) - 0.02));
  const stepTo = (dir) => {
    const t = now();
    const i = dir > 0 ? targets.findIndex((x) => x > t + 0.01) : targets.findLastIndex((x) => x < t - 0.01);
    if (i >= 0) seekTo(targets[i], true);
  };
  prev.addEventListener("click", () => stepTo(-1));
  next.addEventListener("click", () => stepTo(1));
  root.tabIndex = 0;
  root.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement && e.key !== " ") return;
    if (e.key === " ") (e.preventDefault(), audio.paused ? audio.play() : audio.pause());
    if (e.key === "ArrowRight") (e.preventDefault(), stepTo(1));
    if (e.key === "ArrowLeft") (e.preventDefault(), stepTo(-1));
  });

  // ---- 点图看出处 ----
  let pop = null;
  const closePop = () => (pop?.remove(), (pop = null));
  function drawHotspots() {
    hot.replaceChildren();
    if (!audio.paused) return;
    const box = screen.getBoundingClientRect();
    // 看不见的元素（淡出的、被「打开」的节点）不给热点
    const seen = (node) => {
      let o = 1;
      for (let n = node; n && n !== stage.el; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.visibility === "hidden" || cs.display === "none") return 0;
        o *= parseFloat(cs.opacity);
      }
      return o;
    };
    for (const hs of stage.hotspots()) {
      if (seen(hs.el) < 0.35) continue;
      const r = hs.el.getBoundingClientRect();
      if (r.width < 4 || r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom) continue;
      const b = el("button", {
        "aria-label": `查看出处：${hs.label}`,
        style: `left:${r.left - box.left - 6}px;top:${r.top - box.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`,
        onclick: (e) => {
          e.stopPropagation();
          closePop();
          pop = el("div", { class: "pl-pop", role: "dialog", "aria-label": hs.label });
          pop.append(el("h4", { text: hs.label }));
          for (const fid of hs.facts) {
            const f = facts[fid];
            pop.append(el("p", { text: f ? f.claim : `${fid}（事实待核实）` }));
            if (f?.status === "undisclosed") pop.append(el("div", { class: "src", text: "官方未披露 · 画面上用雾化方块表示" }));
            for (const ev of f?.evidence ?? []) {
              const s = sources[ev.source];
              pop.append(el("div", { class: "src", text: s ? `来源 · ${s.publisher}：${s.title}` : ev.source }));
            }
          }
          pop.style.left = `${Math.min(r.left - box.left, box.width - 370)}px`;
          pop.style.top = `${r.bottom - box.top + 10}px`;
          screen.append(pop);
        },
      });
      hot.append(b);
    }
  }
  screen.addEventListener("click", closePop);

  resize();
  sync(0);
  return { seekTo, root };
}
