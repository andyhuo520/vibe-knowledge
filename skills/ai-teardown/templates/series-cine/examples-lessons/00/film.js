// 导学：片头整支样片（62 秒），然后讲课程地图。
import { clamp, lerp, inv, eOutCubic, eInOutCubic, spring, el, css } from "../../cine/engine/util.js";
import { C, appear, slam, codeCard, sourceTag } from "../../cine/engine/ui.js";
import { Clock } from "../../cine/engine/scenes/clock.js";
import { Particles, F } from "../../cine/engine/scenes/particles.js";

export const COLD = 61.933;
export const COLD_SRC = { video: "showcase/opus-intro/out/video.mp4", wav: "showcase/opus-intro/out/score.wav", t0: 0 };
export const meta = { title: "导学：Opus 5.5 自我介绍", n: 0 };
export let hits = [], blur = [];
export const sfx = [], sections = [];

const LESSONS = [
  ["01", "视频就是一个函数"], ["02", "先导演，后动手"], ["03", "节奏的数学"], ["04", "看得见自己的作品"], ["05", "一整部片子不跑偏"],
  ["06", "粒子"], ["07", "3D 镜头"], ["08", "着色器质感"], ["09", "动态字与转场"], ["10", "提示词心法与毕业作品"],
];

export async function build(ctx) {
  const N = ctx.narr, T = (s) => N.t(s);
  const parts = new Particles(), clock = new Clock();
  parts.build();
  const dust = (t, o = {}) => parts.render(ctx.r, ctx.post.sceneRT, t, { from: F.DUST, to: F.DUST, p: 0, bright: o.bright ?? 0.18, dust: 0.3, size: 1.4, camZ: o.camZ ?? 1712 });
  const shots = [];
  const add = (from, to, b, r) => shots.push({ from, to, build: b, render: r });
  const cue = (t, type, o = {}) => sfx.push({ t, type, ...o });
  hits = [T("B03.two")];

  // B01：标题
  add(COLD, T("B02"), (root) => {
    const s = el(root, "shot");
    const k = el(s, "abs mono", `left:0;width:1920px;top:640px;text-align:center;font-size:26px;letter-spacing:10px;color:${C.dim};`, "CLAUDE CODE 做视频 · 导学");
    const t1 = el(s, "abs cn", `left:0;width:1920px;top:686px;text-align:center;font-size:104px;font-weight:900;color:${C.orange};letter-spacing:12px;`, "编排课");
    const t2 = el(s, "abs cn", "left:0;width:1920px;top:830px;text-align:center;font-size:34px;font-weight:600;color:#d9d3c7;", "它是怎么做到的 · 你怎么让它为你做到");
    return { s, k, t1, t2 };
  }, (t, u) => {
    const k = inv(t, COLD + 0.2, T("B01.code"));
    parts.render(ctx.r, ctx.post.sceneRT, t, { from: F.DUST, to: F.TITLE, p: eInOutCubic(k), stagger: 0.45, delay: 1, fly: 140, bright: 0.42, size: 1.8, dust: 0.3, camZ: 2500, lookY: -270 });
    appear(u.k, t, T("B01.code")); appear(u.t1, t, T("B01.code") + 0.2, { dy: 0, scale: 0.08, blur: 10 }); appear(u.t2, t, T("B01.course"));
  });
  sections.push({ t: COLD, t_to: T("B02"), level: 1, name: "title" });
  cue(T("B01.code") + 0.2, "slam");

  // B02：写给谁、要准备什么
  add(T("B02"), T("B03"), (root) => {
    const s = el(root, "shot");
    const h = el(s, "abs cn", "left:110px;top:120px;font-size:62px;font-weight:900;color:#f6f2ea;", "写给想用 Claude Code 做视频的人");
    const chips = ["创作者", "运营", "产品"].map((w, i) => el(s, "abs cn", `left:${110 + i * 230}px;top:250px;width:200px;height:84px;line-height:84px;text-align:center;border-radius:42px;font-size:40px;font-weight:800;color:#111;background:${i === 1 ? C.teal : "#f2ece2"};`, w));
    const nc = el(s, "abs cn", `left:110px;top:380px;font-size:44px;font-weight:800;color:${C.orange};`, "不需要会写代码");
    const cc = codeCard(s, { x: 1000, y: 230, w: 810, h: 330, file: "终端", size: 26, lh: 44, lines: [
      "<c># 确认版本：2.1.280 起才有 Opus 5.5</c>", "<k>$</k> claude --version", "<c># 旧版本先升级</c>", "<k>$</k> claude update", "<c># 在会话里确认模型</c>", "<k>></k> /model   <n>Opus 5.5</n>"] });
    const src = sourceTag(s, "来源：Claude Code 文档《Model configuration》《Changelog》");
    return { s, h, chips, nc, cc, src };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B02.who"));
    u.chips.forEach((c, i) => appear(c, t, T("B02.who") + 0.9 + i * 0.35, { dy: 0, scale: 0.3 }));
    appear(u.nc, t, T("B02.nocode"));
    appear(u.cc.card, t, T("B02.ready"), { dy: 20 });
    appear(u.src, t, T("B02.ready"));
  });
  sections.push({ t: T("B02"), t_to: T("B08"), level: 2, name: "map" });
  cue(T("B02.nocode"), "slam");

  // B03–B04：课程地图（两条主线、十节）
  add(T("B03"), T("B05"), (root) => {
    const s = el(root, "shot");
    const h = el(s, "abs cn", "left:110px;top:96px;font-size:56px;font-weight:900;color:#f6f2ea;", `全课十节，<span style="color:${C.orange}">两条主线</span>`);
    const rowLab = [["A · 为什么它会编排", 230], ["B · 怎么用好它的动效", 600]].map(([w, y], i) => el(s, "abs cn", `left:110px;top:${y}px;font-size:34px;font-weight:800;color:${i ? C.teal : C.orange};`, w));
    const cards = LESSONS.map(([n, name], i) => {
      const row = i < 5 ? 0 : 1, col = i % 5;
      const c = el(s, "abs", `left:${110 + col * 344}px;top:${row ? 660 : 290}px;width:320px;height:230px;border-radius:18px;background:#121117;border:1.5px solid ${row ? "rgba(63,224,208,0.45)" : "rgba(255,122,61,0.5)"};box-shadow:0 24px 60px rgba(0,0,0,0.5);`);
      el(c, "abs", `left:22px;top:14px;font-family:Geist;font-weight:800;font-size:64px;line-height:70px;color:transparent;-webkit-text-stroke:2px ${row ? C.teal : C.orange};`, n);
      el(c, "abs cn", "left:22px;top:110px;width:280px;font-size:32px;line-height:44px;font-weight:800;color:#f6f2ea;", name);
      return c;
    });
    return { s, h, rowLab, cards };
  }, (t, u) => {
    dust(t, { camZ: 1712 - 60 * inv(t, T("B03"), T("B05")) });
    appear(u.h, t, T("B03.two"), { dy: 0, scale: 0.1, blur: 10 });
    appear(u.rowLab[0], t, T("B03.a")); appear(u.rowLab[1], t, T("B04.b"));
    // 读到哪节，哪张卡落下
    const a1 = T("B03.a1"), aEnd = T("B04") - 0.5, b1 = T("B04.b1"), bEnd = T("B04.b2") + 1.2;
    u.cards.forEach((c, i) => {
      const at = i < 5 ? lerp(a1, aEnd, i / 5) : i < 9 ? lerp(b1, T("B04.b2") - 0.2, (i - 5) / 4) : bEnd;
      const k = t - at, sp = spring(k, 2.6, 0.55);
      css(c, { opacity: String(clamp(k / 0.06)), transform: `translateY(${(1 - sp) * -70}px) rotate(${(1 - sp) * (i % 2 ? 5 : -5)}deg)` });
    });
  });
  LESSONS.forEach((_, i) => { const a1 = T("B03.a1"), aEnd = T("B04") - 0.5; const at = i < 5 ? lerp(a1, aEnd, i / 5) : i < 9 ? lerp(T("B04.b1"), T("B04.b2") - 0.2, (i - 5) / 4) : T("B04.b2") + 1.2; cue(at, "card", { note_index: i }); });

  // B05：每一节怎么上
  add(T("B05"), T("B06"), (root) => {
    const s = el(root, "shot");
    const h = el(s, "abs cn", "left:110px;top:120px;font-size:56px;font-weight:900;color:#f6f2ea;", "每一节都这样上");
    const steps = [["① 炸场", "先把这一节的效果做给你看", "B05.open"], ["② 拆机制", "它为什么能做到", "B05.why"], ["③ 提示词与实操", "怎么说，真实会话里怎么跑", "B05.how"]].map(([a, b, at], i) => {
      const c = el(s, "abs", `left:${110 + i * 580}px;top:330px;width:540px;height:300px;border-radius:24px;background:rgba(18,17,24,0.92);border:1.5px solid rgba(255,255,255,0.12);padding:40px 36px;`);
      el(c, "cn", `font-size:52px;font-weight:900;color:${i === 0 ? C.orange : i === 1 ? C.teal : "#f6f2ea"};`, a);
      el(c, "cn", "margin-top:20px;font-size:32px;line-height:46px;color:#bdb6aa;", b);
      return { c, at };
    });
    return { s, h, steps };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B05.each"));
    u.steps.forEach(({ c, at }) => appear(c, t, T(at), { dy: 30, scale: 0.05 }));
  });
  ["B05.open", "B05.why", "B05.how"].forEach((a) => cue(T(a), "slam"));

  // B06：出处
  add(T("B06"), T("B07"), (root) => {
    const s = el(root, "shot");
    const h = el(s, "abs cn", "left:110px;top:120px;font-size:56px;font-weight:900;color:#f6f2ea;", `数字和说法，<span style="color:${C.orange}">都有出处</span>`);
    const cards = [["Anthropic", "Opus 5.5 发布页（2026-09-22）<br>Claude 平台与 Claude Code 文档", "B06.src1"], ["熠辉 · 475 个视频", "awesome-opus5-5-videos<br>Opus 5.5 视频与提示词合集", "B06.src2"], ["样片实测", "3716 帧 · 124 BPM<br>同一 t 渲染两次 0 像素差", "B06.src3"]].map(([a, b, at], i) => {
      const c = el(s, "abs", `left:${110 + i * 580}px;top:330px;width:540px;height:300px;border-radius:24px;background:rgba(18,17,24,0.92);border:1.5px solid rgba(255,255,255,0.12);padding:40px 36px;`);
      el(c, "cn", `font-size:48px;font-weight:900;color:#f6f2ea;`, a);
      el(c, "cn", "margin-top:22px;font-size:30px;line-height:46px;color:#bdb6aa;", b);
      return { c, at };
    });
    return { s, h, cards };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B06.facts"));
    u.cards.forEach(({ c, at }) => appear(c, t, T(at), { dy: 30, scale: 0.05 }));
  });
  ["B06.src1", "B06.src2", "B06.src3"].forEach((a) => cue(T(a), "blip"));

  // B07：学完能做到
  add(T("B07"), T("B08"), (root) => {
    const s = el(root, "shot");
    const h = el(s, "abs cn", "left:110px;top:120px;font-size:56px;font-weight:900;color:#f6f2ea;", "学完你能做到三件事");
    const rows = [["看懂一支代码视频是怎么编排出来的", "B07.l1"], ["用对词，让它做出你要的镜头和节奏", "B07.l2"], ["从一句话开始，做出你自己的 60 秒片", "B07.l3"]].map(([w, at], i) =>
      ({ n: el(s, "abs cn", `left:110px;top:${300 + i * 150}px;font-size:58px;font-weight:900;color:#f6f2ea;white-space:nowrap;`, `<span style="color:${C.teal}">✓</span>  ${w}`), at }));
    return { s, h, rows };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B07.learn"));
    u.rows.forEach(({ n, at }) => appear(n, t, T(at), { dy: 0, scale: 0.06, blur: 8 }));
  });
  ["B07.l1", "B07.l2", "B07.l3"].forEach((a) => cue(T(a), "snap"));

  // B08：致谢 + 下一节
  add(T("B08"), N.total + 0.5, (root) => {
    const s = el(root, "shot");
    const th = el(s, "abs cn", "left:110px;top:150px;font-size:44px;font-weight:800;color:#f6f2ea;", `特别感谢 <span style="color:${C.orange}">熠辉</span>`);
    const th2 = el(s, "abs cn", "left:110px;top:220px;font-size:28px;color:#bdb6aa;", "整理并分享了 475 个 Opus 5.5 视频和提示词（github.com/yihui-dev/awesome-opus5-5-videos）");
    const k = el(s, "abs cn", `left:110px;top:560px;font-size:34px;font-weight:700;letter-spacing:6px;color:${C.orange};`, "第 1 节");
    const t1 = el(s, "abs cn", "left:110px;top:620px;font-size:104px;font-weight:900;color:#f6f2ea;white-space:nowrap;", "视频，就是一个函数");
    return { s, th, th2, k, t1 };
  }, (t, u) => {
    const ts = 40 + (t - T("B08"));
    clock.render(ctx.r, ctx.post.sceneRT, ts, { speed: 1, beat: Math.exp(-((ts / (60 / 124)) % 1) * 5.5), gain: eOutCubic(inv(t, T("B08.next") - 0.4, T("B08.next") + 0.4)), plate: 1, camX: -80 });
    appear(u.th, t, T("B08.thanks")); appear(u.th2, t, T("B08.thanks") + 0.4);
    appear(u.k, t, T("B08.title") - 0.3); appear(u.t1, t, T("B08.title"), { dy: 0, scale: 0.06, blur: 10 });
    ctx.post.params.fade = inv(t, N.total - 0.6, N.total + 0.2);
  });
  sections.push({ t: T("B08"), t_to: N.total + 0.5, level: 2, name: "outro" });
  cue(T("B08.title"), "impact");

  return shots;
}
