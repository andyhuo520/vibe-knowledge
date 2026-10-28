/**
 * 系列课的「场景模板编译器」：一份 scenes.json（每段用哪个模板、元素在旁白的哪个字出现）→ 完整的舞台。
 * 手写 film.js 要一个个摆坐标；这里版式固定在模板里，写一节课只需要列场景，大约十分钟。
 *
 * 时间写法（字符串）：
 *   "B03"          第 3 拍开口
 *   "B03.first"    第 3 拍的 [[first]] 标记
 *   "B03@机器"     第 3 拍里读到「机器」的那一刻（MiMo + whisper 逐字时间）
 *   "B03.end"      第 3 拍说完
 *   以上都可以加偏移："B03.first+0.4"、"B03@机器-0.2"
 *
 * 场景：{ t: 模板名, at: 开始时刻, chapter?: 章名（有章名的场景用色圆转场进场）, year?: 年份标尺下标, mascot?: 站位, ... }
 * 每个场景持续到下一个场景开始；元素的 at 不写就按出场顺序自动错开。
 * 模板：opening · statement · iconrow · portrait · people · chat · timeline · bars · curve · versus · image · twocol · graph · mindmap
 *       实战课：terminal（真实终端回放）· steps（步骤卡）· pause（暂停想一想）· shot（截图）；terminal / shot 可加 doodles 涂鸦讲解
 */
import { Stage } from "./stage.js";
import { captions, captionCues, tag, wipe, yearBar } from "./overlays.js";
import Mascot from "../primitives/mascot.js";
import Portrait from "../primitives/portrait.js";
import MindMap from "../primitives/mindmap.js";
import Floaties from "../primitives/floaties.js";
import Timeline from "../primitives/timeline.js";
import { Typer, IconRow } from "../primitives/typer.js";
import { ChatMock, HypeCurve, BarCompare, Avatars, Graph } from "../primitives/story.js";
import Terminal from "../primitives/terminal.js";
import { Steps, Pause, Shot } from "../primitives/practice.js";
import Doodles from "../primitives/scribble.js";

const LIC = { "Public domain": "公有领域" };
const PALETTE = [["m6", "m1"], ["m5", "m3"], ["m4", "m2"], ["m1", "m6"], ["m2", "m5"], ["m3", "m4"]];
const TONES = ["m5", "m1", "m4", "m2", "m6", "m3"];

export function buildLesson(root, { spec, timings, images, recs = {}, theme = "macaron", imgBase = "../../assets/img/" }) {
  const T = timings.beats;
  // 配音整体变速后（scripts/speed.py），场景里手写的秒数偏移也按同一倍速缩，节奏保持原样
  const SPD = timings.speed ?? 1;
  const S = (id) => T[id].start;
  const E = (id) => T[id].end;
  const C = (id, name) => {
    const v = T[id]?.cues?.[name];
    if (v == null) throw new Error(`${id} 没有 cue「${name}」`);
    return v;
  };
  const W = (id, text) => {
    const b = T[id];
    const i = b.text.indexOf(text);
    if (i < 0) throw new Error(`${id} 旁白里没有「${text}」`);
    return b.chars ? b.chars[i] : S(id);
  };
  const ref = (r, fallback) => {
    if (r == null || typeof r === "function") return fallback;
    if (typeof r === "number") return r;
    const m = /^(B\d+)(?:\.([a-z0-9_]+(?:-[a-z][a-z0-9_]*)*)|@([^+]+?))?([+-]\d+(?:\.\d+)?)?$/.exec(String(r).trim());
    if (!m) throw new Error(`时间写法不对：${r}`);
    const [, id, cue, word, off] = m;
    if (!T[id]) throw new Error(`没有这一拍：${id}`);
    const t = cue === "end" ? E(id) : cue ? C(id, cue) : word ? W(id, word) : S(id);
    return t + (off ? parseFloat(off) / SPD : 0);
  };
  /** 元素既可以写成字符串，也可以写成 {text, at}；字符串的 .at 是 String 自带方法，不能直接取 */
  const atOf = (x) => (x && typeof x === "object" ? x.at : undefined);
  const IMG = Object.fromEntries((images?.images ?? []).map((i) => [i.id, i]));
  const img = (id) => {
    if (!IMG[id]) throw new Error(`图片账本里没有：${id}`);
    return imgBase + IMG[id].file;
  };
  const credit = (id, who) => `${who ?? IMG[id].artist} · ${LIC[IMG[id].license] ?? IMG[id].license} · ${IMG[id].source ?? "Wikimedia Commons"}`;

  // 主题：scenes.json 里写 "theme": "mint" 之类，没写就用调用方给的（默认马卡龙）
  const stage = new Stage(root, { aspect: "16:9", theme: spec.theme ?? theme, duration: timings.total });
  const all = [];
  const add = (prim, o) => { const inst = stage.add(prim, o); all.push(inst); return inst; };

  // ---------- 场景时间线 ----------
  const scenes = spec.scenes.map((s, i) => ({ ...s, i, start: ref(s.at) }));
  scenes.forEach((s, i) => {
    const next = scenes[i + 1];
    s.end = next ? next.start : timings.total + 1;
    s.wiped = i > 0 && !!s.chapter;
    s.in = s.start + (s.wiped ? 0.25 : 0.1);
    s.out = next ? (next.chapter ? next.start : next.start - 0.2) : Infinity;
  });
  /** 场景内元素的出场时刻：写了就用写的，没写就在进场后按序错开 */
  const seq = (s) => { let k = 0; return (r, gap = 0.5) => (r != null ? ref(r) : s.in + gap * k++); };
  const lines = (arr, s, defaults = []) => {
    const at = seq(s);
    return arr.map((ln, k) => {
      const d = defaults[Math.min(k, defaults.length - 1)] ?? {};
      const o = typeof ln === "string" ? { text: ln } : ln;
      return { size: 56, weight: 750, cps: 10, ...d, ...o, at: at(o.at, 0.9), caret: o.caret ?? d.caret ?? false };
    });
  };

  const T_ = {
    opening(s) {
      add(Typer, { id: `s${s.i}-title`, x: -150, y: -170, params: { w: 1100, out: s.out, lines: [
        { text: s.eyebrow ?? `${spec.series ?? "AI 入门课"} · 第 ${spec.n} 节`, at: ref(s.eyebrowAt, s.in + 0.35), size: 38, weight: 650, color: "var(--m6-d)", cps: 14, caret: false },
        // 长标题自动缩字号，免得撞上右边的漂浮小图标
        { text: s.title ?? spec.title, at: ref(s.titleAt, s.in + 1.1), size: Math.min(118, Math.floor(980 / Array.from(s.title ?? spec.title).length)), weight: 800, mt: 6, cps: 7 },
        ...(s.question ? [{ text: s.question, at: ref(s.questionAt, s.in + 3), size: 72, weight: 750, mt: 34, cps: 8, color: "var(--ink2)" }] : []),
      ] } });
      // 片头角标：老实告诉观众配音是 AI 合成的（第 10 节讲 AI 生成内容要标注，课程自己先做到）
      stage.overlay(tag(stage, { text: spec.voiceTag ?? "配音由 AI 合成（小米 MiMo）", start: 0.5, end: s.out === Infinity ? 12 : s.out, pos: "tr", kind: "uimock" }));
      if (spec.author) stage.overlay(tag(stage, { text: `作者 ${spec.author}`, start: 0.5, end: s.out === Infinity ? 12 : s.out, pos: "tl", kind: "uimock" }));
      const spots = [[720, -330, 100], [430, -380, 80], [880, 80, 84], [740, 250, 90], [150, 260, 76]];
      add(Floaties, { id: `s${s.i}-float`, params: { out: s.out, items: (s.icons ?? []).slice(0, 5).map((ic, k) => ({
        icon: ic, x: spots[k][0], y: spots[k][1], size: spots[k][2], color: TONES[k], at: s.in + 1.3 + 0.3 * k })) } });
    },
    statement(s) {
      add(Typer, { id: `s${s.i}-st`, x: s.x ?? (s.mascot ? 160 : 0), y: s.y ?? -10, params: { anchor: "center", align: "center", w: s.w, out: s.out, caret: false,
        lines: lines(s.lines, s, [{ size: 56, weight: 700, color: "var(--ink2)" }, { size: 92, weight: 800, mt: 18, hl: "var(--m3)" }, { size: 46, weight: 650, mt: 22, color: "var(--ink2)" }]) } });
      if (s.icon) add(Floaties, { id: `s${s.i}-ic`, params: { out: s.out, items: [{ icon: s.icon, x: 700, y: -290, size: 120, color: s.tone ?? "m1", at: ref(s.iconAt, s.in + 0.6) }] } });
    },
    iconrow(s) {
      const at = seq(s);
      const items = [];
      (s.items ?? []).forEach((it, k) => {
        const t0 = at(it.at, 0.6);
        if (s.arrows && k > 0) items.push({ kind: "arrow", at: t0 - 0.35 });
        if (s.wall === k) items.push({ kind: "wall", at: t0 - 0.3, h: (s.size ?? 150) * 1.4 });
        items.push({ icon: it.icon, label: it.label, sub: it.sub, color: it.color ?? TONES[k % 6], at: t0 });
      });
      add(IconRow, { id: `s${s.i}-row`, x: s.x ?? 0, y: s.y ?? -20, params: { size: s.size ?? 150, gap: s.gap ?? (s.arrows ? 36 : 56), out: s.out, items,
        ...(s.title ? { title: { text: s.title.text ?? s.title, at: ref(atOf(s.title), s.in) } } : {}) } });
      if (s.caption) add(Typer, { id: `s${s.i}-cap`, x: s.x ?? 0, y: 180, params: { anchor: "tc", out: s.out, caret: false,
        lines: lines([s.caption], s, [{ size: 54, weight: 800, hl: "var(--m3)" }]).map((l) => ({ ...l, at: ref(atOf(s.caption), items.at(-1)?.at + 0.8) })) } });
    },
    portrait(s) {
      const p = s.photo;
      add(Portrait, { id: `s${s.i}-ph`, x: -540, y: -20, params: { src: img(p.img), w: p.w ?? 360, h: p.h ?? 450, pos: p.pos ?? "50% 26%", tilt: p.tilt ?? -3,
        at: ref(p.at, s.in), out: s.out, name: p.name, sub: p.sub, credit: credit(p.img, p.credit), facts: p.facts, kb: p.kb } });
      right(s, { x: 260, y: -60, w: 980 });
    },
    people(s) {
      const x0 = s.doc ? 300 : 0;
      if (s.doc) add(Portrait, { id: `s${s.i}-doc`, x: -520, y: -40, params: { src: img(s.doc.img), w: s.doc.w ?? 460, h: s.doc.h ?? 324, tilt: -2, pos: "50% 50%",
        at: s.in, out: s.out, name: s.doc.name, sub: s.doc.sub, credit: credit(s.doc.img, s.doc.credit), facts: s.doc.facts } });
      const at = seq(s);
      add(Avatars, { id: `s${s.i}-av`, x: x0, y: -130, params: { size: s.size ?? 150, out: ref(s.peopleOut, s.out), credit: s.credit,
        people: s.people.map((pp, k) => ({ ...(pp.img ? { img: img(pp.img) } : { icon: pp.icon ?? "icon-park:user" }), pos: pp.pos, name: pp.name, sub: pp.sub,
          color: pp.color ?? TONES[k % 6], at: at(pp.at, 0.5) })) } });
      if (s.term) add(Typer, { id: `s${s.i}-term`, x: x0, y: 150, params: { anchor: "tc", out: s.out, caret: false, lines: lines(s.term, s, [{ size: 76, weight: 800, cps: 7, hl: "var(--m3)" }, { size: 34, weight: 600, color: "var(--ink2)", cps: 20 }]) } });
    },
    chat(s) {
      if (s.photo) {
        const p = s.photo;
        add(Portrait, { id: `s${s.i}-ph`, x: -560, y: -20, params: { src: img(p.img), w: p.w ?? 320, h: p.h ?? 420, pos: p.pos ?? "50% 26%", tilt: -3, at: s.in, out: s.out,
          name: p.name, sub: p.sub, credit: credit(p.img, p.credit), facts: p.facts } });
      }
      chat(s, s.photo ? { x: 260, y: -60, w: 960 } : { x: s.x ?? 80, y: s.y ?? -10, w: s.w ?? 1080 });
      if (s.mock !== false) stage.overlay(tag(stage, { text: s.mockText ?? "界面示意", start: s.in, end: s.out === Infinity ? timings.total + 1 : s.out, pos: "tr", kind: "uimock" }));
    },
    timeline(s) {
      const at = seq(s);
      add(Timeline, { id: `s${s.i}-tl`, x: 0, y: 70, scale: 1.14, params: { w: 1480, at: s.in + 0.2, out: s.out, card: { w: 280, h: 196 },
        heading: s.heading ? { text: s.heading, at: s.in + 0.3, x: -740, y: -462 } : undefined,
        events: s.events.map((e, k) => ({ year: e.year, title: e.title, sub: e.sub, color: e.color ?? TONES[k % 6], at: at(e.at, 1.2),
          ...(e.img ? { img: img(e.img), pos: e.pos, zoom: e.zoom, credit: credit(e.img, e.credit) } : { icon: e.icon ?? "icon-park:star" }) })) } });
    },
    bars(s) {
      if (!s.src) throw new Error(`第 ${s.i} 个场景（数字对比）缺 src：数字必须有出处`);
      if (s.photo) portraitSmall(s);
      const at = seq(s);
      add(BarCompare, { id: `s${s.i}-bars`, x: s.photo ? 230 : 0, y: s.y ?? -20, params: { at: s.in + 0.2, out: s.out, w: s.photo ? 1060 : 1150, max: s.max,
        title: s.title, sub: s.sub, src: s.src, items: s.items.map((it, k) => ({ ...it, color: it.color ?? TONES[k % 6], at: at(it.at, 0.8) })) } });
    },
    curve(s) {
      add(HypeCurve, { id: `s${s.i}-curve`, x: 0, y: 40, params: { at: s.in + 0.2, dur: ref(s.drawnBy, s.out - 1) - s.in - 0.2, out: s.out, w: 1560, h: 420,
        domain: s.domain, ticks: s.ticks, note: s.note ?? "示意：不是真实数据", points: s.points,
        labels: (s.labels ?? []).map((l) => ({ ...l, at: l.at != null ? ref(l.at) : undefined })) } });
    },
    versus(s) {
      const [a, b] = s.photos;
      add(Portrait, { id: `s${s.i}-a`, x: -500, y: -40, params: { src: img(a.img), w: a.w ?? 400, h: a.h ?? 470, pos: a.pos ?? "40% 30%", tilt: -3, at: ref(a.at, s.in), out: s.out,
        name: a.name, sub: a.sub, credit: credit(a.img, a.credit), facts: a.facts } });
      add(Portrait, { id: `s${s.i}-b`, x: 480, y: -40, params: { src: img(b.img), w: b.w ?? 360, h: b.h ?? 470, pos: b.pos ?? "50% 44%", tilt: 3, tape: ["m5", "m2"],
        at: ref(b.at, s.in + 0.8), out: s.out, name: b.name, sub: b.sub, credit: credit(b.img, b.credit), facts: b.facts } });
      add(Typer, { id: `s${s.i}-vs`, x: 0, y: -170, params: { anchor: "center", out: s.out, caret: false, lines: [{ text: "VS", at: ref(s.vsAt, s.in + 1.2), size: 90, weight: 800, color: "var(--m1-d)", cps: 6 }] } });
      if (s.lines) add(Typer, { id: `s${s.i}-res`, x: 0, y: 40, params: { anchor: "center", align: "center", out: s.out, caret: false,
        lines: lines(s.lines, s, [{ size: 72, weight: 800, cps: 8, hl: "var(--m3)" }, { size: 30, weight: 650, mt: 14, color: "var(--ink2)", cps: 12 }]) } });
    },
    image(s) {
      const p = s.photo;
      add(Portrait, { id: `s${s.i}-img`, x: s.x ?? 0, y: s.y ?? -60, params: { src: img(p.img), w: p.w ?? 760, h: p.h ?? 480, pos: p.pos ?? "50% 50%", tilt: p.tilt ?? 1.5,
        tape: ["m4", "m6"], at: ref(p.at, s.in), out: s.out, name: p.name, sub: p.sub, credit: credit(p.img, p.credit), facts: p.facts, kb: { z0: 1, z1: 1.04 } } });
    },
    twocol(s) {
      const col = (c, x, k) => add(Typer, { id: `s${s.i}-c${k}`, x, y: s.y ?? -300, params: { w: 780, box: "card", boxAt: ref(c.at, s.in + k * 1.2) - 0.2, out: s.out, caret: false,
        lines: [{ text: c.title, at: ref(c.at, s.in + k * 1.2), size: 44, weight: 800, color: `var(--${c.tone ?? TONES[k]}-d)`, cps: 10 },
          ...(c.lines ?? []).map((ln, j) => ({ ...(typeof ln === "string" ? { text: ln } : ln), at: ref(atOf(ln), ref(c.at, s.in + k * 1.2) + 0.9 + j * 1.1), size: 34, weight: 600, mt: 12, cps: 13 }))] } });
      col(s.left, -860, 0);
      col(s.right, 80, 1);
      if (s.bottom) add(Typer, { id: `s${s.i}-bot`, x: 0, y: 190, params: { anchor: "tc", out: s.out, caret: false, lines: lines([s.bottom], s, [{ size: 56, weight: 800, hl: "var(--m3)" }]).map((l) => ({ ...l, at: ref(atOf(s.bottom), s.in + 3) })) } });
    },
    graph(s) {
      // 点和线的时刻可以写时间引用；settle 按顺序点亮（演示搜索），hi 高亮最后的路线
      add(Graph, { id: `s${s.i}-g`, x: s.x ?? 0, y: s.y ?? 0, params: { out: s.out, r: s.r, cell: s.cell, titleY: s.titleY,
        title: s.title ? { text: s.title.text ?? s.title, at: ref(atOf(s.title), s.in) } : undefined,
        nodes: s.nodes.map((n, k) => ({ ...n, at: ref(n.at, s.in + 0.15 * k), settle: n.settle != null ? ref(n.settle) : undefined })),
        edges: s.edges.map((e, k) => ({ ...e, at: ref(e.at, s.in + 0.4 + 0.1 * k), hi: e.hi != null ? ref(e.hi) : undefined })) } });
      if (s.caption) add(Typer, { id: `s${s.i}-cap`, x: s.x ?? 0, y: s.captionY ?? 230, params: { anchor: "tc", align: "center", out: s.out, caret: false,
        lines: lines([s.caption], s, [{ size: 50, weight: 800, hl: "var(--m3)" }]).map((l) => ({ ...l, at: ref(atOf(s.caption), s.in + 3) })) } });
      if (s.side) add(Typer, { id: `s${s.i}-side`, x: s.sideX ?? 420, y: s.sideY ?? -200, params: { w: 480, out: s.out, caret: false,
        lines: lines(s.side, s, [{ size: 46, weight: 800, color: "var(--m6-d)" }, { size: 34, weight: 650, mt: 14 }]) } });
    },
    terminal(s) {
      // 真实终端回放：rec 指 lessons/NN/rec/<rec>.frames.json；from/to 可写秒数或 "mark:名字"；rate 不写就按场景长度自动快进
      const D = recs[s.rec];
      if (!D) throw new Error(`没有这段录屏：${s.rec}（把 term_frames.py 的输出放到 rec/${s.rec}.frames.json）`);
      const pos = (v, d) => {
        if (v == null) return d;
        if (typeof v === "string" && v.startsWith("mark:")) {
          const m = D.marks[v.slice(5)];
          if (m == null) throw new Error(`录屏 ${s.rec} 里没有标记「${v.slice(5)}」（有：${Object.keys(D.marks).join("、") || "无"}）`);
          return m;
        }
        return +v;
      };
      const from = pos(s.from, 0), to = pos(s.to, D.duration);
      const room = Math.max(1, (s.out === Infinity ? timings.total : s.out) - s.in - (s.hold ?? 1.2));
      const rate = s.rate ?? Math.max(1, (to - from) / room);
      const lbl = s.label ? 1 : 0;
      // 窗口几何（与 primitives/terminal.js 同一套）：底边不压字幕条（字幕条顶约 y=365），顶边不压上方标题
      const [r0, r1] = s.rows ?? [0, D.rows - 1], nR = r1 - r0 + 1, w0 = s.w ?? 1560;
      const top = lbl ? -420 : -500, bottom = 355;
      let maxH = Math.min(s.maxH ?? (lbl ? 770 : 850), bottom - top);
      const geo = (mh) => { const fs = Math.min(40, (w0 - 40) / (D.cols * 0.602), (mh - 76) / (nR * 1.32)); return { fs, H: 44 + nR * fs * 1.32 + 32 }; };
      const { fs, H } = geo(maxH);
      const ty = Math.max(top + H / 2, Math.min(s.y ?? (lbl ? -30 : -70), bottom - H / 2)), tx = s.x ?? 0;
      add(Terminal, { id: `s${s.i}-term`, x: tx, y: ty, params: { data: D, at: s.in + 0.1, out: s.out, from, to, rate, w: w0,
        title: s.title ?? "终端", rowsShown: s.rows, maxH,
        hi: (s.hi ?? []).map((x) => ({ ...x, at: ref(x.at), until: x.until != null ? ref(x.until) : undefined })),
        zoom: (s.zoom ?? []).map((z) => ({ ...z, at: ref(z.at), until: z.until != null ? ref(z.until) : undefined })) } });
      if (s.label) add(Typer, { id: `s${s.i}-lbl`, x: 0, y: -470, params: { anchor: "tc", align: "center", out: s.out, caret: false,
        lines: lines([s.label], s, [{ size: 40, weight: 800, cps: 14, hl: "var(--m3)" }]).map((l) => ({ ...l, at: ref(atOf(s.label), s.in + 0.2) })) } });
      if (s.doodles) {
        // 格子（列、行）→ 舞台坐标，用上面算好的窗口几何
        const W = D.cols * 0.602 * fs + 40, lh = fs * 1.32;
        const X = (c) => tx - W / 2 + 20 + c * 0.602 * fs, Y = (r) => ty - H / 2 + 44 + 14 + (r - r0) * lh;
        doodle(s, s.doodles.map((d) => ({ ...d, box: [X(d.cols?.[0] ?? 2), Y(d.rows[0]), X((d.cols?.[1] ?? 60) + 1), Y(d.rows[1] + 1)] })));
      }
    },
    shot(s) {
      // 截图：按原图比例放进 w×h 的框里；doodles 的 area 写成占图片宽高的比例 [x0, y0, x1, y1]
      const I = IMG[s.img];
      if (!I) throw new Error(`图片账本里没有：${s.img}`);
      const [c0, c1, c2, c3] = s.crop ?? [0, 0, 1, 1];
      // 高度上限 720：图底 + 出处小字要让开下方字幕条
      const maxW = s.w ?? 1500, maxH = Math.min(s.h ?? 700, 720), ar = ((I.width ?? 16) * (c2 - c0)) / ((I.height ?? 9) * (c3 - c1));
      const w = Math.round(Math.min(maxW, maxH * ar)), hh = Math.round(w / ar);
      const x = s.x ?? 0, y = s.y ?? (s.label ? -20 : -40);
      add(Shot, { id: `s${s.i}-shot`, x, y, params: { src: img(s.img), w, h: hh, at: s.in + 0.1, out: s.out, credit: s.credit ?? I.credit, push: s.push, crop: s.crop } });
      if (s.label) add(Typer, { id: `s${s.i}-lbl`, x: 0, y: -470, params: { anchor: "tc", align: "center", out: s.out, caret: false,
        lines: lines([s.label], s, [{ size: 40, weight: 800, cps: 14, hl: "var(--m3)" }]).map((l) => ({ ...l, at: ref(atOf(s.label), s.in + 0.2) })) } });
      // area 写原图比例；有 crop 时换算到裁剪框里
      const fx = (v) => x - w / 2 + ((v - c0) / (c2 - c0)) * w, fy = (v) => y - hh / 2 + ((v - c1) / (c3 - c1)) * hh;
      if (s.doodles) doodle(s, s.doodles.map((d) => ({ ...d, box: [fx(d.area[0]), fy(d.area[1]), fx(d.area[2]), fy(d.area[3])] })));
    },
    steps(s) {
      const at = seq(s);
      add(Steps, { id: `s${s.i}-steps`, x: s.x ?? 0, y: s.y ?? 0, params: { at: s.in, out: s.out, w: s.w ?? 1400, title: s.title,
        items: s.items.map((it, k) => ({ ...it, at: at(it.at, 1.2) })) } });
    },
    pause(s) {
      add(Pause, { id: `s${s.i}-pz`, x: 0, y: s.y ?? -20, params: { out: s.out, q: s.q, a: s.a, at: s.in + 0.1, revealAt: ref(s.revealAt, s.in + 4.2) } });
    },
    mindmap(s) {
      const at = seq(s);
      const n = s.branches.length;
      const ys = n <= 2 ? [-20] : n <= 4 ? [-150, 120] : [-210, -20, 170];
      add(MindMap, { id: `s${s.i}-mm`, x: 0, y: -60, params: { out: s.out, spread: 600, node: { w: 440 }, celebrate: s.celebrateAt ? ref(s.celebrateAt) : undefined,
        center: { label: s.center, icon: s.icon ?? "icon-park:robot", color: "m6", at: s.in + 0.3 },
        branches: s.branches.map((b, k) => ({ ...b, color: b.color ?? TONES[k % 6], side: k < Math.ceil(n / 2) ? "l" : "r", y: ys[k % Math.ceil(n / 2)] ?? 0, at: at(b.at, 0.9) })) } });
      if (s.next) add(Typer, { id: `s${s.i}-next`, x: 0, y: -420, params: { anchor: "tc", out: s.out, caret: false, lines: [{ text: s.next.text ?? s.next, at: ref(atOf(s.next), timings.total - 4), size: 46, weight: 750, cps: 10, hl: "var(--m3-t)" }] } });
    },
  };

  /** 涂鸦讲解：marks 的 box 已是舞台坐标 */
  function doodle(s, marks) {
    add(Doodles, { id: `s${s.i}-dd`, x: 0, y: 0, params: { out: s.out, marks: marks.map((m) => ({ ...m, at: ref(m.at), until: m.until != null ? ref(m.until) : undefined })) } });
  }

  /** portrait / chat 右侧栏：可以是 气泡引语 / 打字文字 / 对话窗 / 数字对比 / 图标排 */
  function right(s, box) {
    if (s.card) add(Typer, { id: `s${s.i}-card`, x: -150, y: -385, params: { w: 1000, box: "card", boxAt: ref(s.card.at, s.in + 0.4) - 0.3, out: ref(s.card.out, s.out), caret: false,
      lines: lines(s.card.lines, s, [{ size: 40, weight: 700, cps: 20 }, { size: 30, weight: 600, color: "var(--ink2)", cps: 16 }]) } });
    if (s.quote) add(Typer, { id: `s${s.i}-q`, x: -150, y: s.card ? -150 : -250, params: { w: 900, box: "bubble", tail: "left", boxAt: ref(s.quote.at, s.in + 0.6) - 0.3, out: ref(s.quote.out, s.out),
      lines: lines(s.quote.lines, s, [{ size: 34, weight: 600, color: "var(--ink2)", cps: 16 }, { size: 80, weight: 800, mt: 8, cps: 8, hl: "var(--m1-t)", caret: true }]),
      src: s.quote.src ? { text: s.quote.src, at: ref(s.quote.srcAt, ref(s.quote.at, s.in + 0.6) + 3) } : undefined } });
    if (s.lines) add(Typer, { id: `s${s.i}-l`, x: -120, y: s.linesY ?? -200, params: { w: 1000, out: s.out, caret: false,
      lines: lines(s.lines, s, [{ size: 52, weight: 800, color: "var(--m6-d)" }, { size: 38, weight: 650, mt: 14 }]) } });
    if (s.chat) chat({ ...s, ...s.chat, i: `${s.i}c` }, box);
    if (s.bars) add(BarCompare, { id: `s${s.i}-bars`, x: 230, y: -30, params: { at: ref(s.bars.at, s.in + 0.4), out: s.out, w: 1060, max: s.bars.max, title: s.bars.title, sub: s.bars.sub,
      src: s.bars.src, items: s.bars.items.map((it, k) => ({ ...it, color: it.color ?? TONES[k % 6], at: ref(it.at) })) } });
    if (s.row) T_.iconrow({ ...s.row, i: `${s.i}r`, in: s.in, out: s.out, x: 260, y: s.row.y ?? 0 });
  }
  function chat(s, box) {
    const at = seq(s);
    add(ChatMock, { id: `s${s.i}-chat`, x: box.x, y: box.y, params: { w: box.w, at: ref(s.chatAt, s.in + 0.2), out: s.out, title: s.title ?? "对话", sub: s.sub,
      people: s.people ?? { l: { name: "你", icon: "icon-park:user", color: "m5" }, r: { name: "AI", icon: "icon-park:robot", color: "m6" } },
      messages: s.messages.map((m) => ({ ...m, at: at(m.at, 2.4) })) } });
    if (s.after) add(Typer, { id: `s${s.i}-after`, x: box.x, y: 170, params: { anchor: "tc", out: s.out, caret: false, lines: lines([s.after], s, [{ size: 60, weight: 800, hl: "var(--m3)" }]).map((l) => ({ ...l, at: ref(atOf(s.after), s.in + 4) })) } });
  }
  function portraitSmall(s) {
    const p = s.photo;
    add(Portrait, { id: `s${s.i}-ph`, x: -600, y: -40, params: { src: img(p.img), w: p.w ?? 300, h: p.h ?? 380, pos: p.pos ?? "50% 25%", tilt: -3, at: s.in, out: s.out,
      name: p.name, sub: p.sub, credit: credit(p.img, p.credit), facts: p.facts } });
  }

  if (spec.author) stage.overlay(tag(stage, { text: `作者 ${spec.author}`, start: Math.max(0, timings.total - 10), end: timings.total + 1, pos: "tl", kind: "uimock" }));
  for (const s of scenes) {
    const fn = T_[s.t];
    if (!fn) throw new Error(`没有这个模板：${s.t}`);
    fn(s);
  }

  // ---------- 机器人讲解员：开场大、中间按场景的 mascot 字段露面、收尾在中下方欢呼 ----------
  const MS = { big: [-480, 300, 540], left: [-700, 330, 250], right: [720, 330, 240], corner: [-770, 336, 220], bottom: [0, 344, 260] };
  const spots = [], poses = [[0, "idle"]];
  for (const s of scenes) {
    const where = s.mascot ?? (s.t === "opening" ? "big" : s.t === "mindmap" ? "bottom" : null);
    spots.push(where ? [s.start, ...MS[where]] : [s.start, null]);
    if (where) poses.push([s.in, s.t === "opening" ? "wave" : where === "left" || where === "corner" ? "point-r" : where === "right" ? "point-l" : "present"]);
    if (s.t === "opening" && s.questionAt) poses.push([ref(s.questionAt), "point-r"]);
    if (s.t === "mindmap" && s.celebrateAt) poses.push([ref(s.celebrateAt) - 0.1, "cheer"], [ref(s.celebrateAt) + 1.2, "wave"]);
  }
  add(Mascot, { id: "mascot", params: { at: 0.2, size: 540, seed: 2, talk: Object.values(T).flatMap((b) => b.words.map((w) => [w.start, w.end])), spots, poses,
    look: [[0, 0, 0], [1.4, 0.7, -0.25]] } });

  // ---------- 年份标尺、转场、字幕、章节 ----------
  if (spec.years) {
    const keys = [[0, -1]];
    // 收尾的思维导图不需要年份标尺（它和「下一节」那行字会撞在一起）
    for (const s of scenes) if (s.year !== undefined || s.t === "mindmap") keys.push([s.start, s.t === "mindmap" ? -1 : s.year]);
    stage.overlay(yearBar(stage, { years: spec.years, keys }));
  }
  const wipes = scenes.filter((s) => s.wiped).map((s) => s.start);
  stage.overlay(wipe(stage, { times: wipes, palette: PALETTE }));
  stage.captions = captionCues(Object.values(T));
  stage.overlay(captions(stage, stage.captions));
  stage.chapters = scenes.filter((s, i) => i === 0 || s.chapter).map((s) => ({ t: s.i === 0 ? 0 : s.start, title: s.chapter ?? "开场" }));
  stage.sfx = [{ t: 0.25, name: "pop", gain: -17 }, ...wipes.map((t, i) => ({ t: t - 0.2, name: `swish-${1 + (i % 3)}`, gain: -18 })), ...all.flatMap((q) => q.sfx ?? [])].sort((a, b) => a.t - b.t);
  stage.seek(0);
  return stage;
}
