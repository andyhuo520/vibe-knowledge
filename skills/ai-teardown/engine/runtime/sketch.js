/**
 * 手账风场景编译器（scenes.json 里写 "engine": "sketch" 时用它；接口与 runtime/lesson.js 的 buildLesson 相同）。
 * 画风：米白笔记本纸 + rough.js 手绘线条 + 霞鹜文楷手写字 + Fluent Emoji 3D 贴纸 + 便利贴 / 胶带 / 荧光笔 / 拍立得截图。
 *
 * 时间写法与 lesson.js 一样："B03"、"B03.cue"、"B03@词"、"B03.end"，都可加 ±秒。
 * 模板：cover · say · stickers · quote · shot · flow · compare · checklist · note · pause · recap · outro
 * 通用字段：chapter（章节名：翻页转场 + 左上角章节签）、src（出处小字，右下角）、host（机器人贴纸站位 left/right/none）
 */
import { Stage } from "./stage.js";
import { captionCues } from "./overlays.js";
import { h, setStyle, setText } from "./dom.js";
import { clamp01, cubicInOut } from "./ease.js";
import { step, UI } from "./spring.js";
import SketchLayer, { COLORS, NOTES, HAND, useSkin } from "../primitives/sketch.js";
import Terminal from "../primitives/terminal.js";

const NOTE_ROT = ["yellow", "mint", "pink", "blue", "purple", "peach"];
const ACC = ["coral", "teal", "blue", "purple", "pink", "green"];

export function buildLesson(root, { spec, timings, images, recs = {}, extra = {}, theme = "paper", imgBase = "../../assets/img/", vidBase = "../../assets/fx/" }) {
  const T = timings.beats;
  const SPD = timings.speed ?? 1;
  const S = (id) => T[id].start, E = (id) => T[id].end;
  const C = (id, name) => { const v = T[id]?.cues?.[name]; if (v == null) throw new Error(`${id} 没有 cue「${name}」`); return v; };
  const W = (id, text) => { const b = T[id], i = b.text.indexOf(text); if (i < 0) throw new Error(`${id} 旁白里没有「${text}」`); return b.chars ? b.chars[i] : S(id); };
  const ref = (r, fallback) => {
    if (r == null) return fallback;
    if (typeof r === "number") return r;
    const m = /^(B\d+)(?:\.([a-z0-9_]+(?:-[a-z][a-z0-9_]*)*)|@([^+]+?))?([+-]\d+(?:\.\d+)?)?$/.exec(String(r).trim());
    if (!m) throw new Error(`时间写法不对：${r}`);
    const [, id, cue, word, off] = m;
    if (!T[id]) throw new Error(`没有这一拍：${id}`);
    const t = cue === "end" ? E(id) : cue ? C(id, cue) : word ? W(id, word) : S(id);
    return t + (off ? parseFloat(off) / SPD : 0);
  };
  const IMG = Object.fromEntries((images?.images ?? []).map((i) => [i.id, i]));
  const img = (id) => { if (!IMG[id]) throw new Error(`图片账本里没有：${id}`); return imgBase + IMG[id].file; };
  // 皮肤：scenes.json 的 "skin"（paper 手账 / notion 极简）
  const K = useSkin(spec.skin ?? "paper"), NOTION = K.name === "notion";
  // 界面文字（英文课 spec.lang = "en"）；截图出处可用 spec.shotCredit 统一改写
  const EN = spec.lang === "en";
  const U = EN ? { quote: "❝ From the book", pause: "💭 Pause & think", credits: "Open-source materials used", series: "Series", author: "Author", source: "Source",
      lessonN: (n) => `Lesson ${n}`, task: "💬 Task brief", by: "by" }
    : { quote: "❝ 原文引用", pause: "💭 暂停 · 想一想", credits: "这节课用到的开源素材", series: "系列", author: "作者", source: "素材", lessonN: (n) => `第 ${n} 节`, task: "💬 任务说明", by: "作者" };
  const shotCredit = (P) => spec.shotCredit ?? P.credit;
  const emo = (name) => img(`${K.emoji}-${name.replace(/^emojic?-/, "")}`);
  /** 贴纸：这一节的 lottie/ 里有同名动画就播动画（循环），否则用静态图 */
  /** 插画（IconPark 插画库等，放在课目录 illus/<名>.svg）：出处统一在片尾素材卡标注；inlineCredits:true 才在图下带小字 */
  const ILL_CREDIT = "插画：IconPark 插画库（字节跳动）";
  // 卡片标签一行放不下时自动缩字号（中文按 1 字宽、ASCII 按 0.56 字宽估），最小 32
  const fitSize = (text, base, width) => {
    const units = [...String(text).replace(/\*/g, "")].reduce((a, c) => a + (c.codePointAt(0) < 0x250 ? 0.56 : 1), 0);
    return Math.max(32, Math.min(base, Math.floor(width / Math.max(1, units))));
  };
  const illus = (I, name, o) => {
    const svg = extra.illus?.[name];
    if (!svg) throw new Error(`没有这张插画：${name}（先跑 scripts/illus.py 课目录 ${name}）`);
    // 贴纸风：插画套一层模切白边组，一起「按上去」
    if (o.sticker ?? spec.sticker) I.push({ k: "group", x: o.x, y: o.y, at: o.at, rot: o.rot ?? -3, filter: "diecut", edge: 7, children: [{ k: "illus", svg, ...o, x: 0, y: 0 }] });
    else I.push({ k: "illus", svg, ...o });
    if (o.credit !== false && spec.inlineCredits === true) I.push({ k: "text", x: o.x, y: o.y + o.h / 2 + 6, text: o.creditText ?? ILL_CREDIT, size: 20, weight: 500, color: COLORS.gray, anchor: "tc", at: o.at + 1, cps: 0 });
  };
  let iconK = 0;
  /** 视频贴纸登记表：导出给 hf_host 在 index.html 里静态声明（HyperFrames 编译期只认静态写在页面里的媒体） */
  const videos = [];
  let vidK = 0;
  const sticker = (name, o) => {
    // 写成「图标集:名字」（icon-park:robot、lucide:folder…）就是开源线条图标，一笔笔画出来
    if (name.includes(":")) return { ...o, k: "icon", name, w: o.w * 0.78, h: o.h * 0.78, tone: o.tone ?? ACC[(iconK++) % ACC.length] };
    const d = extra.lottie?.[name];
    return d ? { ...o, k: "lottie", data: d, loop: o.loop ?? true } : { ...o, k: "img", src: emo(name) };
  };

  const stage = new Stage(root, { aspect: "16:9", theme: "mint", duration: timings.total });
  _skin = K.name;
  paperBackground(stage);
  const all = [];
  const add = (prim, o) => { const inst = stage.add(prim, o); all.push(inst); return inst; };

  const scenes = spec.scenes.map((s, i) => ({ ...s, i, start: ref(s.at) }));
  scenes.forEach((s, i) => {
    const next = scenes[i + 1];
    s.end = next ? next.start : timings.total + 1;
    s.flip = i > 0 && !!s.chapter;
    s.in = s.start + (s.flip ? 0.35 : 0.1);
    s.out = next ? next.start - (next.chapter ? 0 : 0.2) : Infinity;
  });
  const seq = (s, gap = 0.5) => { let k = 0; return (r, g = gap) => (r != null ? ref(r) : s.in + g * k++); };
  const txt = (o) => (typeof o === "string" ? { text: o } : o);

  /** 每个场景收集 items，最后一次性交给 SketchLayer */
  const T_ = {
    cover(s, I) {
      if (NOTION) return notionCover(s, I);
      const at = seq(s, 0.8);
      I.push({ k: "text", x: -800, y: -300, text: s.eyebrow ?? `${spec.series} · ${U.lessonN(spec.n)}`, size: 40, weight: 700, color: COLORS.teal, at: at(s.eyebrowAt), cps: 14 });
      const lines = (s.title ?? spec.title).split("\n");
      lines.forEach((ln, k) => I.push({ k: "text", x: -800, y: -220 + k * 132, text: ln, size: k === 0 ? 112 : 92, weight: 700, at: at(s.titleAt), cps: 8, hl: "yellow" }));
      const ty = -220 + lines.length * 132;
      I.push({ k: "ink", shape: { type: "wave", x: -800, y: ty + 6, w: 520 }, color: COLORS.coral, width: 5, at: at(), dur: 0.5 });
      if (s.question) I.push({ k: "text", x: -800, y: ty + 50, text: s.question, size: 52, weight: 600, color: COLORS.sub, at: ref(s.questionAt, at()), cps: 12 });
      if (s.photo) {
        const P = IMG[s.photo], w = 640, hh = Math.round(w * (P.height / P.width)) + 32;
        I.push({ k: "img", src: img(s.photo), x: 560, y: -90, w, h: hh, frame: "polaroid", rot: 4, at: ref(s.photoAt, s.in + 1.4) });
        I.push({ k: "text", x: 560, y: -90 + hh / 2 + 22, text: IMG[s.photo].credit, size: 22, weight: 500, color: COLORS.gray, anchor: "tc", at: ref(s.photoAt, s.in + 1.4) + 0.6, cps: 0 });
      }
      const spots = [[260, -390, 150, -8], [860, -360, 130, 10], [880, 250, 150, -6], [300, 230, 140, 8], [610, 300, 120, -4]];
      (s.stickers ?? []).slice(0, 5).forEach((e, k) => I.push(sticker(e, { x: spots[k][0], y: spots[k][1], w: spots[k][2], h: spots[k][2], rot: spots[k][3], bob: 6, at: s.in + 2.2 + 0.35 * k })));
      chips(I, s);
    },
    say(s, I) {
      const at = seq(s, 0.9);
      const L = (s.lines ?? []).map(txt);
      const x0 = s.illus ? 330 : s.emoji ? 140 : 0;
      const sizes = [58, 96, 50], w = s.illus ? 1060 : s.emoji ? 1300 : 1600;
      // 估算折行数：长句自动换行时，下面的行跟着下移，整体仍大致居中
      const rows = (text, size) => String(text).replace(/\*/g, "").split("\n")
        .reduce((n, seg) => n + Math.max(1, Math.ceil([...seg].reduce((a, c) => a + (c.codePointAt(0) < 0x250 ? 0.56 : 1), 0) * size / w)), 0);
      const lay = L.map((l, k) => { const size = l.size ?? sizes[Math.min(k, 2)] ?? 50; return { l, k, size, n: rows(l.text, size) }; });
      const extra = lay.reduce((a, q) => a + (q.n - 1) * q.size * 1.35, 0);
      let y = -(L.length === 1 ? 60 : L.length === 2 ? 130 : 190) - extra / 2 + (s.dy ?? 0);
      for (const { l, k, size, n } of lay) {
        I.push({ k: "text", x: x0, y, text: l.text, size, weight: k === 1 ? 700 : 600, color: k === 1 ? COLORS.ink : COLORS.sub, anchor: "tc", align: "center", w, at: at(l.at), cps: l.cps ?? 12, hl: l.hl ?? "yellow" });
        y += size * 1.35 * n + (k === 0 ? 28 : 22);
      }
      if (s.illus) illus(I, s.illus, { x: -520, y: -20 + (s.dy ?? 0), w: 640, h: 480, at: ref(s.illusAt, s.in + 0.1), sticker: s.illusSticker });
      else if (s.emoji) I.push(sticker(s.emoji, { x: -640, y: -10 + (s.dy ?? 0), w: 300, h: 300, rot: -6, bob: 7, at: ref(s.emojiAt, s.in + 0.2) }));
      if (s.underline) I.push({ k: "ink", shape: { type: "wave", x: x0 - 330, y: y - 10, w: 660 }, color: COLORS.coral, width: 5, at: ref(s.underline, at() + 0.4) });
      chips(I, s);
    },
    /** 视频贴纸：一段真渲染的片段（动效模板、成片、录屏）放进白边贴纸卡里循环播放。
     *  video 是系列 assets/fx/ 下的文件名；info 给右侧信息卡 {name, id, cmd, good, bad, credit}；src 照常是左下角出处小字。 */
    video(s, I) {
      const key = String(s.video).replace(/\.mp4$/, "");
      const FX = extra.fx?.[key] ?? {};
      const info = s.info;
      const ratio = s.ratio ?? (FX.width && FX.height ? FX.height / FX.width : 9 / 16);
      const w = s.w ?? (info ? 1000 : 1240), hh = Math.round(w * ratio);
      const x = s.x ?? (info ? -360 : 0), y = s.y ?? (s.title ? 20 : -10);
      if (s.title) I.push({ k: "text", x: 0, y: -470, text: txt(s.title).text, size: 50, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.title).at, s.in), cps: 16, hl: "yellow" });
      const t0 = ref(s.clipAt, s.in + 0.25), dur = s.clipDur ?? FX.duration ?? 4, t1 = s.end - 0.2;
      const reps = [];
      for (let a = t0 + 0.4, k = 0; a < t1 && k < 60; a += dur, k++) {
        reps.push({ vid: `v${++vidK}`, start: +a.toFixed(3), dur: +Math.min(dur, t1 - a + 0.25).toFixed(3) });
        if (s.loop === false) break;
      }
      for (const r of reps) videos.push({ ...r, file: s.video });
      I.push({ k: "group", card: true, x, y, w: w + 20, h: hh + 20, color: "white", rot: s.rot ?? -1.5, spin: 5, at: t0,
        children: [{ k: "video", x: 0, y: 0, w, h: hh, src: vidBase + s.video, poster: FX.poster ? vidBase + FX.poster : undefined, reps, at: t0 + 0.3 }] });
      if (info) {
        const iw = s.infoW ?? 640, ix = x + (w + 20) / 2 + 46 + iw / 2, ta = t0 + 0.6;
        const kids = [];
        let yy = 0;
        kids.push({ k: "text", x: -iw / 2 + 40, y: yy, text: info.name, size: fitSize(info.name, 52, iw - 80), weight: 700, at: ta, cps: 14 }); yy += 78;
        if (info.id) { kids.push({ k: "text", x: -iw / 2 + 40, y: yy, text: info.id, size: 26, weight: 500, font: "mono", color: COLORS.gray, at: ta + 0.2, cps: 0 }); yy += 50; }
        if (info.cmd) {
          kids.push({ k: "box", x: 0, y: yy + 30, w: iw - 60, h: 60, bg: "#2B2A33", radius: "12px", at: ta + 0.3 });
          // 等宽字每个字符约 0.62em：按框宽算字号，长命令自动缩小
          const cs = Math.max(16, Math.min(26, Math.floor((iw - 110) / (String(info.cmd).length * 0.62))));
          kids.push({ k: "text", x: -iw / 2 + 50, y: yy + 30, text: info.cmd, size: cs, weight: 500, font: "mono", color: "#F4F2EC", anchor: "ml", at: ta + 0.4, cps: 30 });
          yy += 92;
        }
        if (info.good) { kids.push({ k: "text", x: -iw / 2 + 40, y: yy, text: `✅ ${info.good}`, size: 30, weight: 600, w: iw - 80, lh: 1.4, at: ref(info.goodAt, ta + 0.8), cps: 18 }); yy += 46 * Math.max(1, Math.ceil([...info.good].length * 30 / (iw - 80))) + 14; }
        if (info.bad) { kids.push({ k: "text", x: -iw / 2 + 40, y: yy, text: `⛔ ${info.bad}`, size: 30, weight: 600, color: COLORS.sub, w: iw - 80, lh: 1.4, at: ref(info.badAt, ta + 1.4), cps: 18 }); yy += 46 * Math.max(1, Math.ceil([...info.bad].length * 30 / (iw - 80))) + 14; }
        if (info.credit) { kids.push({ k: "text", x: -iw / 2 + 40, y: yy + 6, text: info.credit, size: 22, weight: 500, color: COLORS.gray, w: iw - 80, at: ta + 0.5, cps: 0 }); yy += 40; }
        const ih = yy + 70, top = -ih / 2 + 40;
        for (const k of kids) k.y += top;
        I.push({ k: "group", card: true, x: ix, y: y + (s.infoDy ?? 0), w: iw, h: ih, color: info.color ?? "white", rot: s.infoRot ?? 2, at: t0 + 0.45, children: kids });
      }
      chips(I, s);
    },
    /** 真实终端回放：scripts/term_record.py 真录、term_frames.py 回放并打码，rec 指 lessons/NN/rec/<rec>.frames.json。
     *  from / to 写录屏秒数或 "mark:名字"；rate 不写按场景长度自动快进；rows 只显示第几行到第几行；
     *  marks 按行列圈注 [{rows: [a, b], cols: [c0, c1], kind: box | underline | circle, at, until, note, side, color}]。贴纸风下窗口带白边。 */
    terminal(s, I) {
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
      const [r0, r1] = s.rows ?? [0, D.rows - 1], nR = r1 - r0 + 1, w0 = s.w ?? 1500;
      const top = s.label ? -405 : -470, bottom = 345;
      const maxH = Math.min(s.maxH ?? 790, bottom - top);
      const fs = Math.min(40, (w0 - 40) / (D.cols * 0.602), (maxH - 76) / (nR * 1.32)), lh = fs * 1.32;
      const H = 44 + nR * lh + 32, Wd = D.cols * 0.602 * fs + 40;
      const ty = Math.max(top + H / 2, Math.min(s.y ?? (s.label ? -20 : -60), bottom - H / 2)), tx = s.x ?? 0;
      if (s.label) I.push({ k: "text", x: 0, y: -475, text: txt(s.label).text, size: 48, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.label).at, s.in), cps: 16, hl: "yellow" });
      add(Terminal, { id: `s${s.i}-term`, x: tx, y: ty, params: { data: D, at: s.in + 0.1, out: s.out, from, to, rate, w: w0, title: s.title ?? "终端", rowsShown: s.rows, maxH,
        sticker: s.sticker ?? spec.sticker,
        hi: (s.hi ?? []).map((x) => ({ ...x, at: ref(x.at), until: x.until != null ? ref(x.until) : undefined })),
        zoom: (s.zoom ?? []).map((z) => ({ ...z, at: ref(z.at), until: z.until != null ? ref(z.until) : undefined })) } });
      const X = (c) => tx - Wd / 2 + 20 + c * 0.602 * fs, Y = (r) => ty - H / 2 + 44 + 14 + (r - r0) * lh;
      (s.marks ?? []).forEach((m, k) => {
        const [a, b, c, d] = [X(m.cols?.[0] ?? 0), Y(m.rows[0]), X((m.cols?.[1] ?? D.cols - 1) + 1), Y(m.rows[1] + 1)], col = COLORS[m.color ?? "coral"], t0 = ref(m.at);
        const shape = m.kind === "underline" ? { type: "wave", x: a, y: d + 4, w: c - a }
          : m.kind === "circle" ? { type: "ellipse", cx: (a + c) / 2, cy: (b + d) / 2, w: (c - a) * 1.12 + 30, h: (d - b) * 1.4 + 26 }
          : { type: "rect", x: a - 8, y: b - 6, w: c - a + 16, h: d - b + 12 };
        I.push({ k: "ink", shape, color: col, width: 5, at: t0, dur: 0.5, seed: 760 + k, until: m.until != null ? ref(m.until) : undefined });
        if (m.note) {
          const side = m.side ?? "right";
          const nx = side === "right" ? c + 60 : side === "left" ? a - 60 : (a + c) / 2, ny = side === "top" ? b - 70 : side === "bottom" ? d + 70 : (b + d) / 2;
          I.push({ k: "chip", x: nx + (m.dx ?? 0), y: ny + (m.dy ?? 0), text: m.note, color: "#fff", bg: col, size: 32, rot: side === "left" ? 3 : -3, at: t0 + 0.35,
            anchor: side === "right" ? "ml" : side === "left" ? "mr" : "c", until: m.until != null ? ref(m.until) : undefined });
        }
      });
      chips(I, s);
    },
    stickers(s, I) {
      const at = seq(s, 0.75);
      const items = s.items, n = items.length;
      const w = s.w ?? (n <= 3 ? 420 : n === 4 ? 360 : 300), hh = s.h ?? (items.some((x) => x.sub) ? 390 : 330), gap = s.arrows ? 110 : 56;
      const total = n * w + (n - 1) * gap, y = s.y ?? (s.caption ? -40 : 10);
      if (s.title) I.push({ k: "text", x: 0, y: -460, text: txt(s.title).text, size: 54, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.title).at, s.in), cps: 14, hl: "yellow" });
      items.forEach((it, k) => {
        const x = -total / 2 + w / 2 + k * (w + gap), t0 = at(it.at);
        if (s.arrows && k > 0) I.push({ k: "ink", shape: { type: "arrow", pts: [[x - w / 2 - gap + 16, y + 6], [x - w / 2 - gap / 2, y - 14], [x - w / 2 - 14, y + 4]] }, color: COLORS.ink, width: 3.5, at: t0 - 0.35, dur: 0.35, seed: 900 + k });
        const col = it.color ?? NOTE_ROT[k % 6], rot = it.rot ?? (k % 2 ? 2 : -2);
        if ((s.style ?? (spec.sticker ? "sticker" : "card")) === "sticker") {
          // 贴纸版：白边卡 + 图标 + 文字是一个整体，带倾斜按上去
          const sr = it.rot ?? [-3, 2.5, -1.5, 3, -2.5, 1.5][k % 6];
          const ico = sticker(it.emoji, { x: 0, y: -hh / 2 + 110, w: 150, h: 150, at: t0 + 0.25, bob: 4, silent: true });
          // Noto emoji 再描一圈白边（贴纸上的小贴纸）；IconPark 线条图标保持原样
          const icoItem = String(it.emoji).includes(":") ? ico : { k: "group", x: 0, y: -hh / 2 + 110, at: t0 + 0.25, from: 1.15, spin: 0, filter: "diecut", edge: 4, children: [{ ...ico, x: 0, y: 0 }] };
          const kids = [icoItem,
            { k: "text", x: 0, y: -hh / 2 + 200, text: it.label, size: it.size ?? fitSize(it.label, 46, w - 70), weight: 700, anchor: "tc", align: "center", w: w - 50, at: t0 + 0.3, cps: 16 }];
          if (it.sub) kids.push({ k: "text", x: 0, y: -hh / 2 + 268, text: it.sub, size: 30, weight: 500, color: COLORS.sub, anchor: "tc", align: "center", w: w - 54, lh: 1.35, at: t0 + 0.6, cps: 22 });
          I.push({ k: "group", card: true, x, y, w, h: hh, color: col, rot: sr, at: t0, children: kids });
          if (it.tick) I.push({ k: "ink", shape: { type: "check", x: x + w / 2 - 50, y: y + hh / 2 - 50, s: 60 }, color: COLORS.green, width: 7, at: ref(it.tick), dur: 0.35 });
          if (it.cross) I.push({ k: "ink", shape: { type: "cross", x: x + w / 2 - 50, y: y + hh / 2 - 50, s: 50 }, color: COLORS.red, width: 7, at: ref(it.cross), dur: 0.35 });
          return;
        }
        I.push({ k: "note", x, y, w, h: hh, color: col, rot, at: t0, seed: 50 + k });
        I.push(sticker(it.emoji, { x: x, y: y - hh / 2 + 110, w: 150, h: 150, rot: rot * 2, at: t0 + 0.15, bob: 4, silent: true }));
        I.push({ k: "text", x, y: y - hh / 2 + 200, text: it.label, size: it.size ?? 46, weight: 700, anchor: "tc", align: "center", w: w - 40, at: t0 + 0.25, cps: 16, rot: rot * 0.5 });
        if (it.sub) I.push({ k: "text", x, y: y - hh / 2 + 268, text: it.sub, size: 30, weight: 500, color: COLORS.sub, anchor: "tc", align: "center", w: w - 44, lh: 1.35, at: t0 + 0.6, cps: 22, rot: rot * 0.5 });
        if (it.tick) I.push({ k: "ink", shape: { type: "check", x: x + w / 2 - 50, y: y + hh / 2 - 50, s: 60 }, color: COLORS.green, width: 7, at: ref(it.tick), dur: 0.35 });
        if (it.cross) I.push({ k: "ink", shape: { type: "cross", x: x + w / 2 - 50, y: y + hh / 2 - 50, s: 50 }, color: COLORS.red, width: 7, at: ref(it.cross), dur: 0.35 });
        if (it.circle) I.push({ k: "ink", shape: { type: "ellipse", cx: x, cy: y, w: w + 60, h: hh + 60 }, color: COLORS.coral, width: 5, at: ref(it.circle), dur: 0.6, seed: 300 + k });
      });
      if (s.caption) I.push({ k: "text", x: 0, y: y + hh / 2 + 44, text: txt(s.caption).text, size: 50, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.caption).at, at() + 0.3), cps: 12, hl: "yellow" });
      chips(I, s);
    },
    quote(s, I) {
      if (NOTION) return notionQuote(s, I);
      const text = s.text, size = s.size ?? 54, w = s.w ?? 1340;
      const lines = Math.ceil(Array.from(text.replace(/\*/g, "")).length * size * 1.02 / (w - 180)) + (text.match(/\n/g)?.length ?? 0);
      const hh = Math.max(300, lines * size * 1.5 + 210), y = s.y ?? -40;
      const t0 = ref(s.textAt, s.in + 0.2);
      I.push({ k: "note", x: 0, y, w, h: hh, color: "white", rot: -1, at: s.in, seed: 11 });
      I.push({ k: "text", x: -w / 2 + 40, y: y - hh / 2 - 36, text: "“", size: 200, weight: 700, color: COLORS.coral, at: s.in + 0.1, cps: 0, lh: 1 });
      I.push({ k: "text", x: -w / 2 + 110, y: y - hh / 2 + 80, w: w - 180, text, size, weight: 600, lh: 1.5, at: t0, cps: s.cps ?? 11, hl: "yellow" });
      I.push({ k: "text", x: w / 2 - 60, y: y + hh / 2 - 70, text: `—— ${s.from}`, size: 30, weight: 600, color: COLORS.gray, anchor: "tr", at: t0 + 0.6, cps: 0 });
      I.push({ k: "chip", x: w / 2 - 20, y: y - hh / 2 + 6, text: s.stamp ?? U.quote.replace("❝ ", ""), color: COLORS.coral, bg: "rgba(255,255,255,.9)", stamp: true, size: 30, rot: 8, at: t0 + 0.4, anchor: "c" });
      if (s.emoji) I.push(sticker(s.emoji, { x: -w / 2 - 20, y: y + hh / 2 - 20, w: 190, h: 190, rot: -10, bob: 5, at: s.in + 0.5 }));
      chips(I, s);
    },
    shot(s, I) {
      // 录屏回放用 clip（flip 是编译器自己的「翻页转场」标记，别混用）
      const FL = s.clip ? extra.data?.[`flip-${s.clip}`] : null;
      if (s.clip && !FL) throw new Error(`没有这段录屏：flip-${s.clip}（课目录 data/flip-${s.clip}.json）`);
      const P = FL ? { width: FL.w, height: FL.h, credit: IMG[FL.frames[0]].credit } : IMG[s.img];
      const [c0, c1, c2, c3] = s.crop ?? [0, 0, 1, 1];
      const ar = (P.width * (c2 - c0)) / (P.height * (c3 - c1));
      const maxW = s.w ?? 1380, maxH = s.h ?? 690;
      const iw = Math.round(Math.min(maxW, maxH * ar)), ih = Math.round(iw / ar);
      const x = s.x ?? 0, y = s.y ?? 10, w = iw + K.pad[0], hh = ih + K.pad[1];
      if (s.label) I.push({ k: "text", x: 0, y: -475, text: txt(s.label).text, size: 48, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.label).at, s.in), cps: 16, hl: "yellow" });
      if (FL) I.push({ k: "flip", srcs: FL.frames.map(img), fps: FL.fps, x, y, w, h: hh, crop: s.crop, at: s.in + 0.15, delay: s.clipDelay ?? 0.3, loop: s.loop ?? false });
      else I.push({ k: "img", src: img(s.img), x, y, w, h: hh, frame: "polaroid", crop: s.crop, rot: s.rot ?? -0.8, at: s.in + 0.15, pop: true });
      I.push({ k: "text", x: x + w / 2 - 10, y: y + hh / 2 + 8, text: shotCredit(P), size: 22, weight: 500, color: COLORS.gray, anchor: "tr", at: s.in + 0.8, cps: 0 });
      // 标注：area 写原图比例 [x0, y0, x1, y1]
      const fx = (v) => x - iw / 2 + ((v - c0) / (c2 - c0)) * iw, fy = (v) => y - hh / 2 + (K.pad[1] ? 14 : 0) + ((v - c1) / (c3 - c1)) * ih;
      (s.marks ?? []).forEach((m, k) => {
        const [a, b, c, d] = [fx(m.area[0]), fy(m.area[1]), fx(m.area[2]), fy(m.area[3])], col = COLORS[m.color ?? "coral"], t0 = ref(m.at);
        const shape = m.kind === "box" ? { type: "rect", x: a - 10, y: b - 10, w: c - a + 20, h: d - b + 20 }
          : m.kind === "underline" ? { type: "wave", x: a, y: d + 8, w: c - a }
          : { type: "ellipse", cx: (a + c) / 2, cy: (b + d) / 2, w: (c - a) * 1.18 + 30, h: (d - b) * 1.3 + 26 };
        I.push({ k: "ink", shape, color: col, width: 5, at: t0, dur: 0.55, seed: 700 + k, until: m.until != null ? ref(m.until) : undefined, sfx: k === 0 ? undefined : undefined });
        if (m.note) {
          const side = m.side ?? "right";
          const nx = side === "right" ? c + 70 : side === "left" ? a - 70 : (a + c) / 2, ny = side === "top" ? b - 80 : side === "bottom" ? d + 80 : (b + d) / 2;
          const anchor = side === "right" ? "ml" : side === "left" ? "mr" : "c";
          I.push({ k: "chip", x: nx + (m.dx ?? 0), y: ny + (m.dy ?? 0), text: m.note, color: "#fff", bg: col, size: 34, rot: side === "left" ? 3 : -3, at: t0 + 0.35, anchor, until: m.until != null ? ref(m.until) : undefined });
        }
      });
      chips(I, s);
    },
    flow(s, I) {
      const at = seq(s, 0.9);
      const nodes = s.nodes, n = nodes.length, gap = s.gap ?? Math.min(300, 1640 / n), y = s.y ?? -80, R = 170;
      if (s.title) I.push({ k: "text", x: 0, y: -460, text: txt(s.title).text, size: 52, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.title).at, s.in), cps: 14, hl: "yellow" });
      const X = (k) => (k - (n - 1) / 2) * gap;
      const ts = [];
      nodes.forEach((nd, k) => {
        const x = X(k), t0 = at(nd.at);
        ts.push(t0);
        if (k > 0) I.push({ k: "ink", shape: { type: "arrow", pts: [[X(k - 1) + R / 2 + 8, y - 6], [(X(k - 1) + x) / 2, y - 22], [x - R / 2 - 12, y - 4]] }, color: COLORS.ink, width: 3.5, at: t0 - 0.4, dur: 0.35, seed: 400 + k });
        I.push({ k: "ink", shape: { type: "ellipse", cx: x, cy: y, w: R, h: R }, color: COLORS[ACC[k % 6]], width: 3.5, fill: NOTES[NOTE_ROT[k % 6]], fillStyle: "solid", at: t0, dur: 0.45, seed: 420 + k });
        I.push(sticker(nd.emoji, { x, y, w: 104, h: 104, at: t0 + 0.12, silent: k > 0 }));
        I.push({ k: "text", x, y: y + R / 2 + 22, text: nd.label, size: 40, weight: 700, anchor: "tc", align: "center", at: t0 + 0.2, cps: 16 });
        if (nd.sub) I.push({ k: "text", x, y: y + R / 2 + 78, text: nd.sub, size: 28, weight: 500, color: COLORS.gray, anchor: "tc", align: "center", w: gap - 20, at: t0 + 0.4, cps: 22 });
        if (nd.star) I.push({ k: "ink", shape: { type: "ellipse", cx: x, cy: y + 20, w: R + 80, h: R + 150 }, color: COLORS.coral, width: 5, at: ref(nd.star), dur: 0.6, seed: 460 + k });
      });
      if (s.back) {
        const b = s.back, xa = X(b.from), xb = X(b.to), t0 = ref(b.at);
        I.push({ k: "ink", shape: { type: "arrow", pts: [[xa, y + R / 2 + 130], [(xa + xb) / 2, y + R / 2 + 230], [xb, y + R / 2 + 130]] }, color: COLORS.red, width: 4, at: t0, dur: 0.55, seed: 480 });
        I.push({ k: "chip", x: (xa + xb) / 2, y: y + R / 2 + 250, text: b.label, color: "#fff", bg: COLORS.red, size: 30, rot: -2, at: t0 + 0.4, anchor: "tc" });
      }
      if (s.caption) I.push({ k: "text", x: 0, y: 330, text: txt(s.caption).text, size: 48, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.caption).at, at() + 0.3), cps: 12, hl: "yellow" });
      chips(I, s);
    },
    compare(s, I) {
      const w = 760, hh = s.h ?? 560, y = s.y ?? 0;
      [s.left, s.right].forEach((c, k) => {
        const x = k ? 430 : -430, t0 = ref(c.at, s.in + k * 2), good = k === 1;
        I.push({ k: "note", x, y, w, h: hh, color: c.color ?? (good ? "mint" : "white"), rot: good ? 1.5 : -1.5, at: t0, seed: 80 + k });
        I.push(sticker(c.emoji, { x: x - w / 2 + 90, y: y - hh / 2 + 80, w: 120, h: 120, rot: -8, at: t0 + 0.1, silent: true, bob: 4 }));
        I.push({ k: "text", x: x - w / 2 + 170, y: y - hh / 2 + 50, text: c.title, size: 52, weight: 700, at: t0 + 0.2, cps: 14, hl: good ? "mint" : undefined });
        const at = seq({ in: t0 + 0.8 }, 0.8);
        c.items.forEach((it, j) => {
          const o = txt(it), ty = y - hh / 2 + 180 + j * 88, ti = at(o.at);
          // neutral：左边不是「错」，只是「普通做法」→ 灰色短横，不打叉
          const shape = good ? { type: "check", x: x - w / 2 + 70, y: ty + 26, s: 40 } : s.neutral ? { type: "line", x1: x - w / 2 + 56, y1: ty + 28, x2: x - w / 2 + 84, y2: ty + 28 } : { type: "cross", x: x - w / 2 + 70, y: ty + 26, s: 30 };
          I.push({ k: "ink", shape, color: good ? COLORS.green : s.neutral ? COLORS.gray : COLORS.red, width: 6, at: ti, dur: 0.3, seed: 90 + j + k * 10 });
          I.push({ k: "text", x: x - w / 2 + 120, y: ty, w: w - 160, text: o.text, size: 40, weight: 600, at: ti + 0.15, cps: 16, hl: good ? "yellow" : undefined });
        });
      });
      I.push({ k: "ink", shape: { type: "arrow", pts: [[-60, y - 10], [0, y - 36], [60, y - 12]] }, color: COLORS.coral, width: 6, at: ref(s.right.at, s.in + 2) - 0.3, dur: 0.35, seed: 99 });
      chips(I, s);
    },
    checklist(s, I) {
      const at = seq(s, 0.9);
      const items = s.items, cols = s.cols ?? (items.length > 4 ? 2 : 1), rows = Math.ceil(items.length / cols);
      const cw = cols === 2 ? 780 : 1200, rh = s.rowH ?? (rows > 3 ? 150 : 170), y0 = s.y ?? -300 + (4 - rows) * 40;
      if (s.title) I.push({ k: "text", x: 0, y: -460, text: txt(s.title).text, size: 52, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.title).at, s.in), cps: 14, hl: "yellow" });
      items.forEach((it, j) => {
        const c = cols === 2 ? Math.floor(j / rows) : 0, r = cols === 2 ? j % rows : j;
        const x = cols === 2 ? (c ? 60 : -cw - 20) : -cw / 2, y = y0 + r * rh, t0 = at(it.at);
        const col = COLORS[ACC[j % 6]];
        if (s.numbered) {
          I.push({ k: "ink", shape: { type: "ellipse", cx: x + 40, cy: y + 38, w: 76, h: 76 }, color: col, width: 4, fill: NOTION ? NOTES[NOTE_ROT[j % 6]] : col, fillStyle: NOTION ? "solid" : "hachure", hachureGap: 7, at: t0, dur: 0.4, seed: 600 + j });
          I.push({ k: "text", x: x + 40, y: y + 38, text: String(j + 1), size: 44, weight: 700, anchor: "c", align: "center", at: t0 + 0.15, cps: 0, color: COLORS.ink });
        } else {
          I.push({ k: "ink", shape: { type: "rect", x: x + 8, y: y + 8, w: 60, h: 60 }, color: COLORS.ink, width: 3, at: t0, dur: 0.3, seed: 600 + j });
          I.push({ k: "ink", shape: { type: "check", x: x + 40, y: y + 34, s: 64 }, color: COLORS.green, width: 7, at: ref(it.tick, t0 + 0.9), dur: 0.3, seed: 640 + j });
        }
        if (it.emoji) I.push(sticker(it.emoji, { x: x + 150, y: y + 38, w: 92, h: 92, at: t0 + 0.1, silent: true, rot: (j % 2 ? 6 : -6) }));
        const tx = x + (it.emoji ? 215 : 110);
        I.push({ k: "text", x: tx, y: y + 2, text: it.label, size: 46, weight: 700, at: t0 + 0.2, cps: 16, hl: it.hl ?? "yellow" });
        if (it.sub) I.push({ k: "text", x: tx, y: y + 66, w: (cols === 2 ? cw : cw) - (tx - x) - 10, text: it.sub, size: 30, weight: 500, color: COLORS.sub, at: t0 + 0.5, cps: 22 });
      });
      chips(I, s);
    },
    note(s, I) {
      const w = s.w ?? 1180, lines = s.lines, lh = s.lh ?? 72, hh = lines.length * lh + 130, x = s.x ?? -130, y = s.y ?? -30;
      if (s.title) I.push({ k: "text", x: 0, y: -475, text: txt(s.title).text, size: 48, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.title).at, s.in), cps: 16, hl: "yellow" });
      I.push({ k: "note", x, y, w, h: hh, color: NOTION ? "gray" : "white", rot: -0.6, at: s.in + 0.1, seed: 17 });
      const top = y - hh / 2 + 70;
      if (NOTION) I.push({ k: "text", x: x - w / 2 + 40, y: y - hh / 2 + 18, text: U.task, size: 26, weight: 600, color: COLORS.gray, at: s.in + 0.3, cps: 0 });
      if (!NOTION) I.push({ k: "ink", shape: { type: "line", x1: x - w / 2 + 90, y1: y - hh / 2 + 10, x2: x - w / 2 + 90, y2: y + hh / 2 - 10 }, color: "rgba(229,72,77,.55)", width: 2.5, at: s.in + 0.2, dur: 0.3, seed: 18 });
      if (!NOTION) lines.forEach((_, j) => I.push({ k: "ink", shape: { type: "line", x1: x - w / 2 + 20, y1: top + (j + 1) * lh - 6, x2: x + w / 2 - 20, y2: top + (j + 1) * lh - 6 }, color: "rgba(61,123,242,.22)", width: 1.6, roughness: 0.6, at: s.in + 0.25, dur: 0.3, seed: 20 + j }));
      const at = seq({ in: ref(s.textAt, s.in + 0.6) }, 1.1);
      lines.forEach((ln, j) => {
        const o = txt(ln), t0 = at(o.at);
        I.push({ k: "text", x: x - w / 2 + (NOTION ? 60 : 116) + (o.indent ?? 0), y: top + j * lh + 4, w: w - 150, text: o.text, size: s.size ?? 40, weight: s.mono ? 500 : 600, font: s.mono ? "mono" : undefined,
          color: o.dim ? COLORS.gray : undefined, at: t0, cps: s.cps ?? 18, hl: o.hl ?? "yellow" });
        if (o.tag) I.push({ k: "chip", x: x + w / 2 + 50, y: top + j * lh + 28, text: o.tag, color: "#fff", bg: COLORS[o.tagColor ?? ACC[j % 6]], size: 30, rot: -3, at: ref(o.tagAt, t0 + 0.3), anchor: "ml" });
      });
      chips(I, s);
    },
    pause(s, I) {
      const tr = ref(s.revealAt, s.in + 4.5);
      I.push({ k: "note", x: -40, y: -60, w: 1240, h: 460, color: "yellow", rot: -2, at: s.in, seed: 31 });
      I.push({ k: "chip", x: -560, y: -270, text: NOTION ? U.pause : U.pause.replace("💭 ", ""), color: COLORS.coral, bg: NOTION ? COLORS.coral : "rgba(255,255,255,.85)", stamp: !NOTION, size: 34, rot: -8, at: s.in + 0.3, anchor: "c" });
      I.push({ k: "text", x: -40, y: -150, w: 1040, text: s.q, size: 60, weight: 700, anchor: "tc", align: "center", at: s.in + 0.4, cps: 14 });
      I.push(sticker(s.emoji ?? "thinking-face", { x: 600, y: -250, w: 190, h: 190, rot: 10, bob: 6, at: s.in + 0.6 }));
      // 3 秒倒计时：手绘圆圈一点点画满
      for (let k = 0; k < 3; k++) I.push({ k: "text", x: -40, y: 90, text: String(3 - k), size: 80, weight: 700, color: COLORS.coral, anchor: "c", align: "center", at: tr - 3 + k, cps: 0, until: tr - 2 + k - 0.05 });
      I.push({ k: "ink", shape: { type: "ellipse", cx: -40, cy: 92, w: 130, h: 130 }, color: COLORS.coral, width: 5, at: tr - 3, dur: 2.9, seed: 33, until: tr - 0.05 });
      I.push({ k: "text", x: -40, y: 60, w: 1100, text: s.a, size: 58, weight: 700, color: COLORS.ink, anchor: "tc", align: "center", at: tr, cps: 12, hl: "coral" });
      chips(I, s);
    },
    recap(s, I) {
      const at = seq(s, 1.2);
      const cx = 0, cy = -40, n = s.branches.length;
      // 中心椭圆随标题长度加宽，长标题不再顶出边
      const tw = [...String(s.center)].reduce((a, c) => a + (c.codePointAt(0) < 0x250 ? 0.56 : 1), 0) * 52;
      const ew = Math.max(440, tw + 140), eh = 210;
      I.push({ k: "ink", shape: { type: "ellipse", cx, cy, w: ew, h: eh }, color: COLORS.ink, width: 4, fill: NOTES.yellow, fillStyle: "solid", at: s.in, dur: 0.5, seed: 70 });
      I.push({ k: "text", x: cx, y: cy, text: s.center, size: 52, weight: 700, anchor: "c", align: "center", at: s.in + 0.2, cps: 14 });
      const pos = [[-560, -300], [560, -300], [-560, 230], [560, 230], [0, -390], [0, 330]];
      s.branches.forEach((b, k) => {
        const [bx, by] = pos[k], t0 = at(b.at);
        I.push({ k: "ink", shape: { type: "curve", pts: bx ? [[cx + Math.sign(bx) * (ew / 2 - 20), cy + Math.sign(by) * 40], [bx * 0.55, by * 0.7 + cy * 0.3], [bx - Math.sign(bx) * 260, by]] : [[cx, cy + Math.sign(by) * (eh / 2 - 4)], [cx + 30, (cy + by) / 2], [cx, by - Math.sign(by) * 85]] }, color: COLORS[ACC[k % 6]], width: 4, at: t0 - 0.3, dur: 0.4, seed: 72 + k });
        I.push({ k: "note", x: bx, y: by, w: 520, h: 170, color: NOTE_ROT[k % 6], rot: k % 2 ? 1.5 : -1.5, at: t0, seed: 75 + k, tape: false });
        I.push(sticker(b.emoji, { x: bx - 200, y: by, w: 100, h: 100, rot: -6, at: t0 + 0.1, silent: true }));
        I.push({ k: "text", x: bx - 130, y: by, w: 380, text: b.text, size: 38, weight: 700, anchor: "ml", lh: 1.3, at: t0 + 0.2, cps: 18 });
      });
      chips(I, s);
    },
    outro(s, I) {
      I.push({ k: "text", x: 0, y: -440, text: s.next, size: 58, weight: 700, anchor: "tc", align: "center", at: s.in + 0.2, cps: 12, hl: "yellow" });
      I.push({ k: "note", x: 0, y: 30, w: 1300, h: 520, color: "white", rot: -0.8, at: s.in + 0.6, seed: 91 });
      I.push({ k: "text", x: -560, y: -180, text: U.credits, size: 44, weight: 700, at: s.in + 1, cps: 16, color: COLORS.teal });
      const at = seq({ in: s.in + 1.8 }, 0.7);
      (s.credits ?? []).forEach((c, k) => {
        const t0 = at();
        I.push({ k: "ink", shape: { type: "check", x: -560, y: -84 + k * 80, s: 36 }, color: COLORS.green, width: 5, at: t0, dur: 0.25, seed: 95 + k });
        I.push({ k: "text", x: -520, y: -106 + k * 80, text: c, size: NOTION ? 30 : 34, weight: NOTION ? 500 : 600, at: t0 + 0.1, cps: 24 });
      });
      if (s.thanks) I.push({ k: "text", x: 0, y: 330, text: s.thanks, size: 46, weight: 700, anchor: "tc", align: "center", at: ref(s.thanksAt, s.in + 5), cps: 12, hl: "pink" });
      if (!spec.presenter) I.push(sticker("robot", { x: 600, y: 230, w: 200, h: 200, rot: 8, bob: 7, at: s.in + 0.8 }));
      chips(I, s);
    },
  };

  /** Notion 页面头：封面色带 + 页面图标 + 大标题 + 属性行 + 提问 callout */
  function notionCover(s, I) {
    I.push({ k: "box", x: 0, y: -440, w: 1920, h: 200, bg: s.coverBg ?? "linear-gradient(115deg,#E7F3F8 0%,#F6F3F9 45%,#FBF3DB 100%)", at: s.in });
    if (s.iconImg) I.push({ k: "img", src: img(s.iconImg), x: -700, y: -330, w: 180, h: 180, at: s.in + 0.3, radius: "18px" });
    else I.push(sticker(s.icon ?? "robot", { x: -700, y: -330, w: 170, h: 170, at: s.in + 0.3 }));
    const lines = (s.title ?? spec.title).split("\n");
    lines.forEach((ln, k) => I.push({ k: "text", x: -790, y: -220 + k * 104, text: ln, size: k === 0 ? 92 : 64, weight: 700, at: s.in + 0.8 + k * 0.9, cps: 9, color: k ? COLORS.sub : COLORS.ink }));
    let y = -220 + lines.length * 104 + 30;
    const props = s.props ?? [["📚", U.series, `${spec.series} · ${U.lessonN(spec.n)}`], ["👤", U.author, spec.author], ["📖", U.source, EN ? "WorkBuddy Guide (open source, MIT)" : "《WorkBuddy 实战蓝皮书》· MIT"]];
    props.forEach(([ic, k, v], j) => {
      I.push({ k: "text", x: -790, y: y + j * 54, text: `${ic}  ${k}`, size: 30, weight: 500, color: COLORS.gray, at: s.in + 2 + j * 0.25, cps: 0 });
      I.push({ k: "text", x: -560, y: y + j * 54, text: v, size: 30, weight: 500, color: COLORS.ink, at: s.in + 2.1 + j * 0.25, cps: 0 });
    });
    y += props.length * 54 + 26;
    I.push({ k: "box", x: -790 + 800, y, w: 1600, h: 2, bg: "rgba(55,53,47,.09)", at: s.in + 2.6 });
    if (s.question) {
      I.push({ k: "note", x: -790 + 620, y: y + 90, w: 1240, h: 110, color: "yellow", at: ref(s.questionAt, s.in + 3), seed: 5 });
      I.push({ k: "text", x: -790 + 40, y: y + 90, text: `💡  ${s.question}`, size: 44, weight: 600, anchor: "ml", at: ref(s.questionAt, s.in + 3) + 0.2, cps: 12 });
    }
    if (s.illus) { const iw = s.illusW ?? 620; illus(I, s.illus, { x: s.illusX ?? 560, y: -40, w: iw, h: iw * 0.75, at: s.in + 1.2 }); return; }
    const spots = [[640, -150, 150], [860, -40, 120], [720, 90, 110]];
    (s.stickers ?? []).slice(0, 3).forEach((e, k) => I.push(sticker(e, { x: spots[k][0], y: spots[k][1], w: spots[k][2], h: spots[k][2], bob: 5, at: s.in + 2.4 + 0.3 * k })));
  }
  /** Notion 引用块：左边一道竖线，大字，出处灰字，右上角标签 */
  function notionQuote(s, I) {
    const size = s.size ?? 54, w = s.w ?? 1320, x = -w / 2 + 60, y0 = s.y ?? -230;
    const t0 = ref(s.textAt, s.in + 0.2);
    const lines = Math.ceil(Array.from(s.text.replace(/\*/g, "")).length * size * 1.02 / (w - 80)) + (s.text.match(/\n/g)?.length ?? 0);
    const hh = lines * size * 1.55;
    I.push({ k: "chip", x, y: y0 - 70, text: s.stamp ?? U.quote, color: COLORS.gray, bg: COLORS.gray, size: 28, at: s.in + 0.1, anchor: "ml" });
    I.push({ k: "box", x: x - 30, y: y0 + hh / 2, w: 6, h: hh, bg: COLORS.ink, radius: "3px", at: s.in + 0.2 });
    I.push({ k: "text", x, y: y0, w: w - 80, text: s.text, size, weight: 600, lh: 1.55, at: t0, cps: s.cps ?? 11, hl: "yellow" });
    I.push({ k: "text", x, y: y0 + hh + 36, text: `—— ${s.from}`, size: 30, weight: 500, color: COLORS.gray, at: t0 + 0.6, cps: 0 });
    if (s.emoji) I.push(sticker(s.emoji, { x: w / 2 + 40, y: y0 - 50, w: 150, h: 150, bob: 4, at: s.in + 0.5 }));
  }

  const LOT = (name) => { const d = extra.lottie?.[name]; if (!d) throw new Error(`没有这个 Lottie：${name}（放进课目录 lottie/${name}.json）`); return d; };
  /** 动效演示用的模板 */
  Object.assign(T_, {
    kinetic(s, I) {
      (s.lines ?? []).forEach((l, k) => I.push({ k: "kinetic", x: l.x ?? 0, y: l.y ?? (-60 + k * 170), text: l.text, size: l.size ?? (k ? 64 : 140), weight: l.weight ?? (k ? 600 : 800),
        color: l.color ? (COLORS[l.color] ?? l.color) : k ? COLORS.gray : COLORS.ink, accent: l.accent ?? "coral", at: ref(l.at, s.in + 0.2 + k * 1.2), per: l.per ?? (k ? 0.03 : 0.07), anchor: "c" }));
      (s.lottie ?? []).forEach((o, k) => I.push(sticker(o.name, { x: o.x, y: o.y, w: o.size ?? 200, h: o.size ?? 200, at: ref(o.at, s.in + 1 + k * 0.3), bob: 5 })));
      chips(I, s);
    },
    iconwall(s, I) {
      const items = s.items, cols = s.cols ?? 3, W = 420, H = 300, gx = 60, gy = 50, rows = Math.ceil(items.length / cols);
      if (s.title) I.push({ k: "text", x: 0, y: -470, text: s.title, size: 52, weight: 700, anchor: "tc", align: "center", at: s.in, cps: 16 });
      items.forEach((it, k) => {
        const c = k % cols, r = Math.floor(k / cols), x = (c - (cols - 1) / 2) * (W + gx), y = (r - (rows - 1) / 2) * (H + gy) + 20, t0 = ref(it.at, s.in + 0.5 + k * 0.35);
        I.push({ k: "note", x, y, w: W, h: H, color: NOTE_ROT[k % 6], at: t0, seed: 40 + k });
        I.push({ k: "lottie", data: LOT(it.lottie), x, y: y - 36, w: 170, h: 170, at: t0 + 0.1, silent: true });
        I.push({ k: "text", x, y: y + 70, text: it.label, size: 40, weight: 700, anchor: "tc", align: "center", at: t0 + 0.3, cps: 16 });
      });
      chips(I, s);
    },
    dataviz(s, I) {
      if (s.title) I.push({ k: "text", x: 0, y: -470, text: s.title, size: 52, weight: 700, anchor: "tc", align: "center", at: s.in, cps: 16 });
      const c = s.count;
      if (c) {
        I.push({ k: "note", x: -560, y: -20, w: 620, h: 520, color: "gray", at: s.in + 0.1, seed: 61 });
        I.push({ k: "text", x: -830, y: -240, text: c.label, size: 36, weight: 600, color: COLORS.gray, at: s.in + 0.3, cps: 0 });
        I.push({ k: "count", x: -830, y: -170, from: c.from ?? 0, to: c.to, digits: c.digits, prefix: c.prefix, suffix: c.suffix, size: c.size ?? 118, at: ref(c.at, s.in + 0.5), dur: c.dur ?? 2 });
        if (c.sub) I.push({ k: "text", x: -830, y: 0, text: c.sub, size: 34, weight: 600, color: COLORS.green, at: ref(c.at, s.in + 0.5) + 2, cps: 14 });
        if (c.lottie) I.push({ k: "lottie", data: LOT(c.lottie), x: -400, y: 130, w: 170, h: 170, at: ref(c.at, s.in + 0.5) + 1.8 });
      }
      if (s.bars) I.push({ k: "bars", x: -120, y: -300, w: 860, h: 260, items: s.bars.items, unit: s.bars.unit, digits: s.bars.digits, at: ref(s.bars.at, s.in + 1.2) });
      if (s.line) I.push({ k: "line", x: -100, y: 60, w: 820, h: 230, values: s.line.values, labels: s.line.labels, color: s.line.color ?? "coral", at: ref(s.line.at, s.in + 3), dur: s.line.dur ?? 2 });
      if (s.note) I.push({ k: "text", x: 900, y: 372, text: s.note, size: 24, weight: 500, color: COLORS.gray, anchor: "tr", at: s.in + 0.6, cps: 0 });
      chips(I, s);
    },
    map(s, I) {
      // 镜头要推近时，标题先退场（否则会被裁掉半截）
      const zoomAt = s.cam?.length ? s.start + s.cam[0][0] - 0.4 : undefined;
      if (s.title) I.push({ k: "text", x: 0, y: -470, text: s.title, size: 52, weight: 700, anchor: "tc", align: "center", at: s.in, cps: 16, until: zoomAt });
      s.tagUntil = zoomAt;
      I.push({ k: "dotmap", x: -880, y: -380, w: 1760, h: 720, dots: extra.data?.dots?.dots ?? [], at: s.in + 0.2,
        arcs: (s.arcs ?? []).map((a) => ({ ...a, at: ref(a.at) })), pins: (s.pins ?? []).map((p) => ({ ...p, at: ref(p.at) })) });
      if (s.note) I.push({ k: "text", x: 900, y: 372, text: s.note, size: 24, weight: 500, color: COLORS.gray, anchor: "tr", at: s.in + 0.6, cps: 0 });
      chips(I, s);
    },
    diagram(s, I) {
      if (s.title) I.push({ k: "text", x: 0, y: -470, text: txt(s.title).text, size: 50, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.title).at, s.in), cps: 16, hl: "yellow" });
      const W = 1800, H = s.h ?? 660, cg = s.colGap ?? 470, rg = s.rowGap ?? 230;
      const cols = Math.max(...s.nodes.map((n) => n.col)), rows = Math.max(...s.nodes.map((n) => n.row ?? 0));
      const at = seq(s, 0.6);
      const nodes = s.nodes.map((n) => ({ ...n, x: W / 2 + (n.col - cols / 2) * cg, y: H / 2 + ((n.row ?? 0) - rows / 2) * rg, at: at(n.at) }));
      I.push({ k: "diagram", x: -W / 2, y: s.y ?? -H / 2 - 20, w: W, h: H, nodes, nodeW: s.nodeW, nodeH: s.nodeH, at: s.in,
        edges: (s.edges ?? []).map((e) => ({ ...e, at: e.at != null ? ref(e.at) : Math.max(nodes.find((n) => n.id === e.from).at, nodes.find((n) => n.id === e.to).at) - 0.2 })) });
      if (s.caption) I.push({ k: "text", x: 0, y: s.captionY ?? 298, text: txt(s.caption).text, size: 46, weight: 700, anchor: "tc", align: "center", at: ref(txt(s.caption).at, at() + 0.5), cps: 12, hl: "yellow" });
      chips(I, s);
    },
    pan(s, I) {
      // 一张比画面宽的大画布：卡片横着排，镜头从左摇到右，最后推近
      (s.cards ?? []).forEach((c, k) => {
        const x = c.x ?? (k * 900 - 900), t0 = ref(c.at, s.in + 0.2 + k * 0.2);
        I.push({ k: "note", x, y: 0, w: 700, h: 460, color: NOTE_ROT[k % 6], at: t0, seed: 80 + k });
        if (c.lottie || c.emoji) I.push(sticker(c.emoji ?? c.lottie, { x, y: -80, w: 200, h: 200, at: t0 + 0.1, silent: true }));
        I.push({ k: "text", x, y: 60, text: c.title, size: 56, weight: 700, anchor: "tc", align: "center", at: t0 + 0.2, cps: 0 });
        if (c.sub) I.push({ k: "text", x, y: 140, text: c.sub, size: 32, weight: 500, color: COLORS.gray, anchor: "tc", align: "center", at: t0 + 0.3, cps: 0 });
      });
      if (s.word) I.push({ k: "kinetic", x: s.word.x ?? 900, y: s.word.y ?? -330, text: s.word.text, size: s.word.size ?? 96, accent: "coral", at: ref(s.word.at), per: 0.08, anchor: "c" });
      chips(I, s);
    },
  });

  /** 出处小字（右下角，字幕条上方）与自定义角标 */
  function chips(I, s) {
    if (s.tag) I.push({ k: "chip", x: -900, y: spec.noCaptions ? 450 : -470, text: s.tag, color: COLORS.purple, bg: COLORS.purple, size: 28, at: s.in + 0.2, anchor: "ml", until: s.tagUntil });
    if (s.src) I.push({ k: "text", x: -900, y: 372, text: `📖 ${s.src}`, size: 24, weight: 600, color: COLORS.gray, anchor: "tl", at: s.in + 0.6, cps: 0 });
  }

  for (const s of scenes) {
    const fn = T_[s.t];
    if (!fn) throw new Error(`手账模板里没有：${s.t}`);
    const I = [];
    fn(s, I);
    add(SketchLayer, { id: `s${s.i}-${s.t}`, x: 0, y: 0, params: { out: s.out, items: I } });
  }

  // ---------- 镜头（演示片的推拉摇移） ----------
  if (scenes.some((s) => s.cam)) {
    const keys = [{ t: 0, x: 0, y: 0, z: 1 }];
    for (const s of scenes) {
      keys.push({ t: s.start, x: 0, y: 0, z: 1, cfg: { w: 2 * Math.PI * 4, z: 1 } });
      for (const [dt, x, y, z] of s.cam ?? []) keys.push({ t: typeof dt === "string" ? ref(dt) : s.start + dt, x, y, z });
    }
    stage.camera(keys.sort((a, b) => a.t - b.t));
  }

  // ---------- 机器人贴纸讲解员：开口时轻轻点头 ----------
  const talk = Object.values(T).flatMap((b) => b.words.map((w) => [w.start, w.end]));
  const hostKeys = scenes.map((s) => [s.start, s.host ?? ((spec.presenter ? ["cover", "recap"] : ["cover", "outro", "recap"]).includes(s.t) ? "none" : "right")]);
  if (spec.presenter === "hp") {
    // 多动作讲解小人：hp-<动作>-<1..8>；场景可写 pose，默认按模板挑，冒气泡时竖食指
    const POSES = ["talk", "wave", "point", "idea", "think", "stop", "check", "cheer", "thumbsup", "type"];
    const F = Object.fromEntries(POSES.map((ps) => [ps, Array.from({ length: 8 }, (_, k) => img(`hp-${ps}-${k + 1}`))]));
    const DEF = { shot: "point", pause: "think", outro: "wave", checklist: "check" };
    const keysP = [];
    for (const sc of scenes) {
      const base = sc.pose ?? DEF[sc.t] ?? "talk";
      keysP.push([sc.start, base]);
      for (const tp of sc.tips ?? []) keysP.push([ref(tp.at) - 0.2, tp.pose ?? "idea"], [tp.until != null ? ref(tp.until) : sc.end - 0.3, base]);
      for (const [at, ps] of sc.poses ?? []) keysP.push([ref(at), ps]);
    }
    keysP.sort((x, y) => x[0] - y[0]);
    const tips = scenes.flatMap((sc) => (sc.tips ?? []).map((tp) => ({ t0: ref(tp.at), t1: tp.until != null ? ref(tp.until) : sc.end - 0.3, text: tp.text })));
    stage.overlay(presenterPoses(stage, F, hostKeys, keysP, Object.values(T).flatMap((b) => b.words.map((w) => [w.start, w.end])), tips));
  } else if (spec.presenter) {
    const F = Object.fromEntries(["0", "blink", "talk", "talk-blink"].map((k) => [k, img(`${spec.presenter}-${k}`)]));
    const tips = scenes.flatMap((sc) => (sc.tips ?? []).map((tp) => ({ t0: ref(tp.at), t1: tp.until != null ? ref(tp.until) : sc.end - 0.3, text: tp.text })));
    stage.overlay(presenter(stage, F, hostKeys, Object.values(T).flatMap((b) => b.words.map((w) => [w.start, w.end])), tips));
  } else stage.overlay(host(stage, emo("robot"), hostKeys, talk));

  // ---------- 章节签 + 翻页转场、署名、AI 配音标注、字幕 ----------
  const chapters = scenes.filter((s) => s.chapter).map((s) => ({ t: s.start, title: s.chapter }));
  stage.overlay(chapterTab(stage, chapters, NOTION ? spec.series : null));
  stage.overlay(pageFlip(stage, scenes.filter((s) => s.flip).map((s) => s.start), NOTION));
  stage.overlay(corner(stage, `${U.by} ${spec.author ?? ""}`, "tl", [[0.5, Math.min(12, scenes[1]?.start ?? 12)]]));
  stage.overlay(corner(stage, `${U.by} ${spec.author ?? ""}`, "tr", [[timings.total - 10, timings.total + 1]]));
  stage.overlay(corner(stage, spec.voiceTag ?? "配音由 AI 合成（小米 MiMo）", "tr", [[0.5, Math.min(12, scenes[1]?.start ?? 12)]]));
  stage.captions = captionCues(Object.values(T), spec.lang === "en" ? 52 : 18, spec.lang === "en");
  if (!spec.noCaptions) stage.overlay(handCaptions(stage, stage.captions));
  stage.chapters = [{ t: 0, title: "开场" }, ...chapters];
  stage.videos = videos;
  stage.sfx = [...scenes.filter((s) => s.flip).map((s, i) => ({ t: s.start - 0.05, name: `page-${1 + (i % 3)}`, gain: -16 })),
    ...all.flatMap((q) => q.sfx ?? [])].sort((a, b) => a.t - b.t);
  // 同一时刻扎堆的音效只留一个
  stage.sfx = stage.sfx.filter((x, i, a) => i === 0 || x.t - a[i - 1].t > 0.12);
  stage.seek(0);
  return stage;
}

/* ---------------- 屏幕层 ---------------- */

let _skin = "paper";
const SKIN_NAME = () => _skin;
const NCSS = `
.sk-cap{position:absolute;left:0;right:0;top:962px;display:flex;justify-content:center;pointer-events:none}
.sk-cap span{display:inline-block;padding:10px 28px 12px;background:#fff;color:#37352F;font:500 42px/1.35 "Geist","Noto Sans SC",sans-serif;white-space:nowrap;
  border:1px solid rgba(55,53,47,.16);border-radius:10px;box-shadow:0 8px 24px rgba(15,15,15,.08)}
.sk-tab{position:absolute;left:48px;top:40px;font:500 26px/1 "Geist","Noto Sans SC",sans-serif;color:#787774;white-space:nowrap}
.sk-tab b{color:#37352F;font-weight:600}
.sk-corner{position:absolute;top:36px;font:500 22px/1 "Geist","Noto Sans SC",sans-serif;color:#787774;padding:8px 12px;border-radius:6px;background:#F1F1EF}
.sk-flip{position:absolute;inset:0;pointer-events:none;background:#fff}
.sk-host{position:absolute;width:130px;height:130px;pointer-events:none}
.sk-host img{width:100%;height:100%;object-fit:contain}
`;
const OCSS = `
.sk-cap{position:absolute;left:0;right:0;top:958px;display:flex;justify-content:center;pointer-events:none}
.sk-cap span{display:inline-block;padding:8px 30px 12px;background:rgba(255,254,250,.94);color:${COLORS.ink};font:600 46px/1.3 ${HAND};letter-spacing:.02em;white-space:nowrap;
  border:3px solid ${COLORS.ink};border-radius:255px 18px 225px 18px/18px 225px 18px 255px;box-shadow:4px 5px 0 rgba(43,42,51,.9)}
.sk-tab{position:absolute;left:44px;top:34px;font:700 32px/1 ${HAND};color:${COLORS.ink};padding:12px 22px 14px;background:#FFD84D;
  border-radius:4px 14px 6px 16px;box-shadow:3px 4px 0 rgba(43,42,51,.85);transform:rotate(-2deg);white-space:nowrap}
.sk-corner{position:absolute;top:34px;font:600 24px/1 ${HAND};color:#6E6B78;padding:9px 16px;border:2px dashed rgba(43,42,51,.35);border-radius:12px;background:rgba(255,255,255,.6)}
.sk-flip{position:absolute;inset:0;pointer-events:none;background:#FBF7EE;box-shadow:-30px 0 60px rgba(40,30,10,.25);
  background-image:linear-gradient(rgba(61,123,242,.10) 2px,transparent 2px);background-size:100% 54px}
.sk-host{position:absolute;width:170px;height:170px;pointer-events:none}
.sk-host img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(40,30,10,.2))}
`;

function paperBackground(stage) {
  stage.css(`sk-overlays-${SKIN_NAME()}`, SKIN_NAME() === "notion" ? NCSS : OCSS);
  if (SKIN_NAME() === "notion") { stage.bg.style.background = "#FFFFFF"; stage.el.style.background = "#FFFFFF"; stage.el.removeAttribute("data-bg"); return; }
  Object.assign(stage.bg.style, {
    background: "#FBF7EE",
    backgroundImage: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,.7), transparent 70%), linear-gradient(rgba(61,123,242,.075) 2px, transparent 2px), linear-gradient(90deg, rgba(61,123,242,.05) 2px, transparent 2px)",
    backgroundSize: "100% 100%, 54px 54px, 54px 54px",
  });
  stage.el.style.background = "#FBF7EE";
}

function handCaptions(stage, cues) {
  const el = h("div", { class: "sk-cap" }), span = h("span");
  el.append(span);
  return { el, render(t) {
    const c = cues.find((q) => t >= q.start - 0.04 && t < q.end);
    if (!c) return setStyle(el, "opacity", "0");
    setText(span, c.text);
    setStyle(el, "opacity", (clamp01((t - c.start + 0.04) / 0.08) * clamp01((c.end - t) / 0.06)).toFixed(3));
  } };
}

function chapterTab(stage, chapters, crumb) {
  const el = h("div", { class: "sk-tab" });
  return { el, render(t) {
    const c = [...chapters].reverse().find((q) => t >= q.t + 0.3);
    if (!c) return setStyle(el, "opacity", "0");
    // Notion：面包屑「📘 系列 / 章节」
    if (crumb) { if (el.dataset.t !== c.title) { el.innerHTML = ""; el.append(document.createTextNode(`📘 ${crumb}  /  `), h("b", { text: c.title })); el.dataset.t = c.title; } }
    else setText(el, c.title);
    const a = step(t - c.t - 0.3, UI);
    setStyle(el, "opacity", clamp01((t - c.t - 0.3) / 0.15).toFixed(3));
    setStyle(el, "transform", crumb ? `translateY(${((1 - a) * -10).toFixed(1)}px)` : `translateY(${((1 - a) * -40).toFixed(1)}px) rotate(-2deg)`);
  } };
}

function pageFlip(stage, times, fade) {
  const el = h("div", { class: "sk-flip" });
  return { el, render(t) {
    const c = times.find((x) => t >= x - 0.35 && t < x + 0.45);
    if (c == null) return setStyle(el, "visibility", "hidden");
    if (fade) {   // Notion：像切换页面一样，白一下
      setStyle(el, "visibility", "visible");
      setStyle(el, "opacity", (1 - Math.abs((t - c) / 0.35)).toFixed(3));
      return;
    }
    // 一张新纸从右边滑进来盖住画面，再往左滑走
    const p = cubicInOut(clamp01((t - (c - 0.35)) / 0.8));
    setStyle(el, "visibility", "visible");
    setStyle(el, "transform", `translateX(${((1 - p * 2) * 105).toFixed(2)}%) rotate(${((1 - p * 2) * 3).toFixed(2)}deg)`);
  } };
}

function corner(stage, text, pos, windows) {
  const el = h("div", { class: "sk-corner", text });
  el.style[pos === "tl" ? "left" : "right"] = "44px";
  return { el, render(t) {
    const on = windows.some(([a, b]) => t >= a && t < b);
    setStyle(el, "opacity", on ? "1" : "0");
  } };
}

function host(stage, src, keys, talk) {
  const el = h("div", { class: "sk-host" });
  el.append(h("img", { src }));
  const SPOT = _skin === "notion" ? { right: [1740, 820], left: [50, 820] } : { right: [1700, 780], left: [60, 780] };
  return { el, render(t) {
    const k = [...keys].reverse().find((q) => t >= q[0]);
    const where = k?.[1] ?? "none";
    if (where === "none") return setStyle(el, "opacity", "0");
    const [x, y] = SPOT[where];
    const a = step(t - k[0] - 0.3, UI);
    const talking = talk.some(([a0, b0]) => t >= a0 && t < b0);
    const nod = talking ? Math.sin(t * 2 * Math.PI * 2.4) * 3 : 0;
    setStyle(el, "opacity", clamp01((t - k[0] - 0.3) / 0.15).toFixed(3));
    setStyle(el, "left", `${x}px`); setStyle(el, "top", `${y}px`);
    const calm = _skin === "notion" ? 0.4 : 1;
    setStyle(el, "transform", `translateY(${((1 - a) * 60 + Math.sin(t * 1.8) * 5 * calm).toFixed(1)}px) rotate(${((nod + (where === "right" ? -6 : 6)) * calm).toFixed(2)}deg)`);
  } };
}


/** 讲解小人（像素头像）：贴着画面右下角；说话时张嘴、轻轻上下一格，每 3.7 秒左右眨一次眼；tips 是它说的话（气泡） */
const PCSS = `
.sk-pr{position:absolute;right:28px;bottom:0;width:250px;height:250px;pointer-events:none}
.sk-pr img{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;visibility:hidden}
.sk-tip{position:absolute;right:250px;bottom:190px;max-width:560px;padding:16px 22px;background:#fff;color:#37352F;border:1px solid rgba(55,53,47,.16);
  border-radius:14px 14px 4px 14px;box-shadow:0 8px 24px rgba(15,15,15,.1);font:600 32px/1.4 "Geist","Noto Sans SC",sans-serif;pointer-events:none;transform-origin:100% 100%}
`;
function presenter(stage, F, keys, talk, tips) {
  stage.css("sk-presenter", PCSS);
  const el = h("div"), box = h("div", { class: "sk-pr" }), tip = h("div", { class: "sk-tip" });
  const imgs = Object.fromEntries(Object.entries(F).map(([k, src]) => { const im = h("img", { src }); box.append(im); return [k, im]; }));
  el.append(box, tip);
  let shown = null;
  return { el, render(t) {
    const k = [...keys].reverse().find((q) => t >= q[0]);
    const on = (k?.[1] ?? "none") !== "none";
    const a = on ? step(t - k[0] - 0.2, UI) : 0;
    setStyle(box, "opacity", on ? clamp01((t - k[0] - 0.2) / 0.2).toFixed(3) : "0");
    const w = talk.find(([a0, b0]) => t >= a0 && t < b0);
    // 每个字前 55% 张嘴；眨眼：以 3.7 秒为周期，偶尔连眨两下
    const mouth = w && (t - w[0]) / Math.max(0.05, w[1] - w[0]) < 0.55;
    const cyc = t % 3.7, blink = cyc < 0.12 || (Math.floor(t / 3.7) % 3 === 1 && cyc > 0.25 && cyc < 0.35);
    const f = mouth ? (blink ? "talk-blink" : "talk") : blink ? "blink" : "0";
    if (f !== shown) { for (const [kk, im] of Object.entries(imgs)) im.style.visibility = kk === f ? "visible" : "hidden"; shown = f; }
    const bob = w ? (Math.floor(t * 5) % 2) * -4 : 0;
    setStyle(box, "transform", `translateY(${((1 - a) * 120 + bob).toFixed(1)}px)`);
    const q = tips.find((x) => t >= x.t0 && t < x.t1);
    if (!q || !on) return setStyle(tip, "opacity", "0");
    if (tip.dataset.t !== q.text) { tip.textContent = q.text; tip.dataset.t = q.text; }
    const b = step(t - q.t0, UI);
    setStyle(tip, "opacity", (clamp01((t - q.t0) / 0.15) * clamp01((q.t1 - t) / 0.2)).toFixed(3));
    setStyle(tip, "transform", `scale(${(0.85 + 0.15 * b).toFixed(3)})`);
  } };
}


/** 多动作像素小人。talk：按字张嘴（帧 2/3/7/6）、不说话闭嘴（帧 1）、眨眼（帧 4）；其他动作按 7 帧/秒循环 */
const PPCSS = `
.sk-pp{position:absolute;right:10px;bottom:0;width:300px;height:300px;pointer-events:none}
.sk-pp img{position:absolute;inset:0;width:100%;height:100%;visibility:hidden}
.sk-tip{position:absolute;right:285px;bottom:215px;max-width:560px;padding:16px 22px;background:#fff;color:#37352F;border:1px solid rgba(55,53,47,.16);
  border-radius:14px 14px 4px 14px;box-shadow:0 8px 24px rgba(15,15,15,.1);font:600 32px/1.4 "Geist","Noto Sans SC",sans-serif;pointer-events:none;transform-origin:100% 100%}
`;
function presenterPoses(stage, F, showKeys, poseKeys, talk, tips) {
  stage.css("sk-presenter-poses", PPCSS);
  const el = h("div"), box = h("div", { class: "sk-pp" }), tip = h("div", { class: "sk-tip" });
  const imgs = {};
  for (const [ps, list] of Object.entries(F)) imgs[ps] = list.map((src) => { const im = h("img", { src }); box.append(im); return im; });
  el.append(box, tip);
  let shown = null;
  const OPEN = [1, 2, 6, 5];   // 0 起算：帧 2/3/7/6
  return { el, render(t) {
    const k = [...showKeys].reverse().find((q) => t >= q[0]);
    const on = (k?.[1] ?? "none") !== "none";
    const a = on ? step(t - k[0] - 0.2, UI) : 0;
    setStyle(box, "opacity", on ? clamp01((t - k[0] - 0.2) / 0.2).toFixed(3) : "0");
    const pk = [...poseKeys].reverse().find((q) => t >= q[0]) ?? [0, "talk"];
    const pose = F[pk[1]] ? pk[1] : "talk";
    let fi;
    if (pose === "talk") {
      const wi = talk.findIndex(([a0, b0]) => t >= a0 && t < b0);
      const cyc = t % 3.7, blink = cyc < 0.13 || (Math.floor(t / 3.7) % 3 === 1 && cyc > 0.26 && cyc < 0.38);
      if (blink) fi = 3;
      else if (wi >= 0 && (t - talk[wi][0]) / Math.max(0.05, talk[wi][1] - talk[wi][0]) < 0.6) fi = OPEN[wi % 4];
      else fi = 0;
    } else fi = Math.floor(Math.max(0, t - pk[0]) * 7) % 8;
    const id = `${pose}-${fi}`;
    if (id !== shown) {
      for (const list of Object.values(imgs)) for (const im of list) im.style.visibility = "hidden";
      imgs[pose][fi].style.visibility = "visible"; shown = id;
    }
    // 换动作时轻轻跳一下
    const hop = 1 - step(t - pk[0], { w: 2 * Math.PI * 3, z: 0.5 });
    setStyle(box, "transform", `translateY(${((1 - a) * 140 - Math.max(0, hop) * 10).toFixed(1)}px)`);
    const q = tips.find((x) => t >= x.t0 && t < x.t1);
    if (!q || !on) return setStyle(tip, "opacity", "0");
    if (tip.dataset.t !== q.text) { tip.textContent = q.text; tip.dataset.t = q.text; }
    const b = step(t - q.t0, UI);
    setStyle(tip, "opacity", (clamp01((t - q.t0) / 0.15) * clamp01((q.t1 - t) / 0.2)).toFixed(3));
    setStyle(tip, "transform", `scale(${(0.85 + 0.15 * b).toFixed(3)})`);
  } };
}
