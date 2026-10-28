// 宣传片实战课 · 第 8 节（最后一节）：质检、交付与改版。
// 开场：先打出那一句话，再完整放一遍真实会话交出的 30 秒成片（带原声），课名砸下。配乐 Motivating Mornings（pick_music.py --hit-at 0.6，120.35 BPM，loopbed 接长），主段落对到课名。
// 真实会话：promo/session/turn2.json（样帧自审 4 处）、turn4.json（规格、限幅、静止核对）、turn5.json（改钩子）、usage.json（全程用量）；改前成片 promo/session/film_v1.mp4。
// 事实出处：design-principles.md「交付前的大师审片」「5. 声音」；SKILL.md「渲染约束」（contact_sheet.py 别用 ffmpeg -r 1）；compliance.md；music.md「混音规则」；style-router.md「口碑记录」；
// 改版故事见 examples/promo-course/research/cases.md 与 memory（BeeGer、小互、CelHive、整段抖）；鱼总颗粒压缩见 memory yuzong-promo-film。
import { clamp, lerp, inv, eOutCubic, eOutQuint, eInCubic, spring, el, css } from "../../cine/engine/util.js";
import { C, appear, slam, typeText, sourceTag, pauseCard, recapMap, clipBox, codeCard } from "../../cine/engine/ui.js";
import { Particles, F } from "../../cine/engine/scenes/particles.js";

const A = "../lessons/p08/assets/";
const D = "/Users/you/Desktop/";
const FILM0 = 1.9, TITLE = 32.3;
export const COLD = 34.6;
export const meta = { title: "质检、交付与改版", n: 8 };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

const SRC = {
  qw: "quanwen-promo/out/film.mp4", qw1: "ai-teardown/examples/claude-video/promo/session/film_v1.mp4",
  bf: "beeger-promo/out/beeger-fast-hq.mp4", xh: "xiaohu-promo/out/xiaohu-hq-v2.mp4", ch: "celhive-promo/CelHive宣传片-2K.mp4",
  br: "brewreel-promo/BrewReel宣传片-2K.mp4", yz: "yuzong-promo/out/yuzong-2k-hq.mp4",
};
const ASK = "用 promo-video 给圈问做一支 30 秒宣传片，官网 http://127.0.0.1:8930。";
const CLIENTS = ["WorkBuddy", "HiAPI", "YouWare", "Renoise", "ListenHub", "BeeGer", "WaytoAGI", "DockLock", "造物矩阵", "小互", "精酿 BrewReel", "CelHive",
  "VibeCafé × Vibe42", "鱼总聊AI", "知行猿", "大猫剪辑", "奈雪", "黄但记1927", "TOKEI", "STILLWATER"];
const LESSONS = ["一支宣传片的骨架", "从官网拿素材", "选型卡：四层只选一次", "分镜和节拍", "动效层：特效长在产品上", "镜头与设备", "声音：配乐、音效、旁白", "质检、交付与改版"];

export async function build(ctx) {
  const N = ctx.narr, T = (s) => N.t(s);
  const parts = new Particles();
  parts.build();
  const dust = (t, o = {}) => parts.render(ctx.r, ctx.post.sceneRT, t, { from: F.DUST, to: F.DUST, p: 0, bright: o.bright ?? 0.16, dust: 0.3, size: 1.4, camZ: o.camZ ?? 1712 });
  const shots = [];
  const add = (from, to, b, r) => shots.push({ from, to, build: b, render: r });
  const cue = (t, type, o = {}) => sfx.push({ t, type, ...o });
  const END = N.total;
  const clip = (id, key, from, at, dur, box, o = {}) => clips.push({ id, src: D + SRC[key], from, at, dur, x: box.x, y: box.y, w: box.w, h: box.h, audio: "mute", ...o });
  const P = (id) => `${A}clips/${id}.jpg`;
  const card = (s, x, y, w, h, html, border = "rgba(255,255,255,0.12)") =>
    el(s, "abs", `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:22px;background:rgba(18,17,24,0.93);border:1.5px solid ${border};box-shadow:0 24px 60px rgba(0,0,0,0.45);`, html);
  const title = (s, html, top = 96) => el(s, "abs cn", `left:110px;top:${top}px;font-size:56px;font-weight:900;color:${C.ivory};white-space:nowrap;`, html);
  const chip = (s, x, y, label, text, col = C.orange) => el(s, "abs", `left:${x}px;top:${y}px;height:60px;border-radius:30px;background:rgba(16,15,20,0.94);border:1px solid rgba(255,255,255,0.14);display:flex;align-items:center;gap:14px;padding:0 26px 0 14px;white-space:nowrap;`,
    `<span class="mono" style="font-size:17px;color:#111;background:${col};border-radius:13px;padding:3px 10px;font-weight:700;">${label}</span><span class="cn" style="font-size:28px;color:#f2ece2;font-weight:600;">${text}</span>`);

  music = [{ src: D + "ai-teardown/examples/claude-video/lessons/p08/assets/music/bgm_long.wav", from: 0, at: TITLE - 0.6, dur: END + 0.6 - (TITLE - 0.6),
    gain_curve: [[0, -3], [COLD - 0.3, -3], [COLD + 0.8, -11], [END - 6, -11], [END - 2, -6], [END + 0.6, -6]], fade_in: 0.02, fade_out: 1.8 }];
  sections.push({ t: 0, t_to: END + 0.6, level: 0, name: "library-music" });
  hits = [TITLE];

  // ── 冷开场：一句话 → 完整成片（原声）→ 课名
  clip("film", "qw", 0, FILM0, 30.0, { x: 0, y: 0, w: 1920, h: 1080 }, { fade: 0, audio: "full", gain: -1 });
  add(0, COLD, (root) => {
    const s = el(root, "shot");
    const box = el(s, "abs", "left:50%;top:478px;transform:translateX(-50%);height:96px;border-radius:48px;background:rgba(16,15,20,0.92);border:1px solid rgba(255,255,255,0.14);display:flex;align-items:center;gap:18px;padding:0 40px 0 22px;white-space:nowrap;box-shadow:0 30px 80px rgba(0,0,0,0.6);");
    el(box, "mono", `font-size:22px;color:#111;background:${C.orange};border-radius:16px;padding:4px 14px;font-weight:700;`, "一句话");
    const tx = el(box, "cn", "font-size:36px;font-weight:600;color:#f6f2ea;");
    const kick = el(s, "abs mono", `left:0;width:1920px;top:356px;text-align:center;font-size:24px;letter-spacing:10px;color:${C.dim};`, "OPUS 5.5 宣传片实战课 · 第 8 节 · 最后一节");
    const ttl = el(s, "abs cn", `left:0;width:1920px;top:400px;text-align:center;font-size:120px;line-height:150px;font-weight:900;color:${C.ivory};letter-spacing:8px;`, `质检、交付与<span style="color:${C.orange}">改版</span>`);
    const sub = el(s, "abs cn", "left:0;width:1920px;top:580px;text-align:center;font-size:38px;font-weight:600;color:#d9d3c7;letter-spacing:4px;", "一句话进去，30 秒成片出来");
    return { s, box, tx, kick, ttl, sub };
  }, (t, u) => {
    dust(t, { bright: 0.12 });
    typeText(u.tx, ASK, t, 0.15, FILM0 - 0.35);
    const go = inv(t, FILM0 - 0.15, FILM0);
    css(u.box, { opacity: String(appear(u.box, t, 0.02, { dy: 0, scale: 0.06 }) * (1 - go)), transform: `translateX(-50%) scale(${1 - 0.2 * eInCubic(go)})` });
    appear(u.kick, t, TITLE + 0.1); slam(u.ttl, t, TITLE, { from: 1.5 }); appear(u.sub, t, TITLE + 0.3);
  });
  for (let i = 0; i < 14; i++) cue(0.15 + (FILM0 - 0.5) * (i + 0.5) / 14, "key");
  cue(FILM0 - 0.08, "key", { enter: true });
  cue(TITLE, "impact");

  // ── B01：五轮、十六分钟
  const ROUNDS = [["1", "一句话", 44], ["2", "样帧", 452], ["3", "出成片", 53], ["4", "前台重渲", 169], ["5", "改钩子", 243]];
  add(COLD, T("B02"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `从一句话到成片：<span style="color:${C.teal}">五轮 · 十六分钟</span>`);
    const tot = ROUNDS.reduce((a, r) => a + r[2], 0), W = 1500;
    let x = 210;
    const segs = ROUNDS.map(([n, w, sec], i) => {
      const ww = Math.max(70, (sec / tot) * W);
      const c = el(s, "abs", `left:${x}px;top:420px;width:${ww - 8}px;height:120px;border-radius:16px;background:${i % 2 ? "rgba(63,224,208,0.22)" : "rgba(255,122,61,0.22)"};border:1.5px solid ${i % 2 ? "rgba(63,224,208,0.6)" : "rgba(255,122,61,0.6)"};`,
        `<div style="position:absolute;left:14px;top:12px;font-family:Geist;font-weight:800;font-size:30px;color:${C.ivory};">${n}</div><div class="cn" style="position:absolute;left:14px;top:60px;font-size:22px;color:#d9d3c7;white-space:nowrap;">${ww > 160 ? w : ""}</div>`);
      const lab = el(s, "abs mono", `left:${x}px;top:556px;width:${ww}px;font-size:20px;color:#8d8993;white-space:nowrap;`, sec >= 60 ? `${(sec / 60).toFixed(1)} 分` : `${sec} 秒`);
      x += ww;
      return { c, lab };
    });
    const tail = el(s, "abs cn", "left:210px;top:640px;font-size:30px;color:#bdb6aa;white-space:nowrap;", "它干活的时间加起来约 16 分钟 · 中间是我们看片、回话的时间");
    return { s, h, segs, tail };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B01.film"));
    u.segs.forEach(({ c, lab }, i) => { appear(c, t, T("B01.road") + i * 0.22, { dy: 16 }); appear(lab, t, T("B01.road") + i * 0.22 + 0.1); });
    appear(u.tail, t, T("B01.this"));
  });
  ROUNDS.forEach((_, i) => cue(T("B01.road") + i * 0.22, "card", { note_index: i }));

  // ── B02：三件事
  const THREE = [["① 审片", "交付前一条条过", "B02.t1", C.orange], ["② 合规与交付", "声明 · 规格 · 响度", "B02.t2", C.teal], ["③ 改版", "怎么改，怎么记", "B02.t3", C.ivory]];
  add(T("B02"), T("B03"), (root) => {
    const s = el(root, "shot");
    const h = title(s, "这一节讲三件事", 120);
    const cards = THREE.map(([a, b, at, col], i) => ({ c: card(s, 110 + i * 580, 330, 540, 300, `<div class="cn" style="position:absolute;left:36px;top:40px;font-size:50px;font-weight:900;color:${col};white-space:nowrap;">${a}</div><div class="cn" style="position:absolute;left:36px;top:130px;width:470px;font-size:32px;line-height:46px;color:#bdb6aa;">${b}</div>`), at }));
    return { s, h, cards };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B02.three"));
    u.cards.forEach(({ c, at }) => appear(c, t, T(at), { dy: 30, scale: 0.05 }));
  });
  THREE.forEach(([, , at]) => cue(T(at), "slam"));

  // ── B03：大师审片清单
  const CHECK = [["任意一帧都能当海报", "无溢出、无截断、四边留白够"], ["每帧只有一个焦点", "强调色不超过两处"], ["运动有理由，到位就停", "没有线性位移、没有无意义的漂移"],
    ["切点落在拍子上", "段落之间有快慢呼吸"], ["每个动作都有声音", "响度检查通过"], ["最后一帧静稳", "停留 ≥ 2 秒"]];
  add(T("B03"), T("B04"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `交付前：<span style="color:${C.orange}">大师审片</span>清单`);
    const rows = CHECK.map(([a, b], i) => {
      const x = 110 + (i % 2) * 860, y = 230 + Math.floor(i / 2) * 210;
      const c = card(s, x, y, 820, 180, `<div class="cn" style="position:absolute;left:96px;top:34px;font-size:40px;font-weight:900;color:${C.ivory};white-space:nowrap;">${a}</div><div class="cn" style="position:absolute;left:96px;top:100px;font-size:26px;color:#9b96a0;white-space:nowrap;">${b}</div>`);
      const tick = el(c, "abs", `left:28px;top:56px;width:48px;height:48px;border-radius:24px;background:${C.teal};color:#111;font-size:32px;font-weight:900;text-align:center;line-height:48px;`, "✓");
      return { c, tick };
    });
    const src = sourceTag(s, "来源：promo-video skill · design-principles.md「6. 交付前的大师审片」（节选 6 条，全表 10 条）");
    return { s, h, rows, src };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B03.list")); appear(u.src, t, T("B03.list"));
    u.rows.forEach(({ c, tick }, i) => { const a = T(`B03.c${i + 1}`); appear(c, t, a - 0.05, { dy: 20 }); css(tick, { transform: `scale(${t > a + 0.3 ? spring(t - a - 0.3, 3, 0.5) : 0})` }); });
  });
  CHECK.forEach((_, i) => cue(T(`B03.c${i + 1}`) + 0.3, "tick"));

  // ── B04：按真实时间取帧
  add(T("B04"), T("B05"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `抽帧：<span style="color:${C.teal}">按真实时间</span>取`);
    const bad = codeCard(s, { x: 110, y: 260, w: 820, h: 220, file: "✗ 每秒一帧", size: 26, lh: 44, lines: ["<c># 取出来的帧会偏移好几秒</c>", "<k>$</k> ffmpeg -i film.mp4 -r 1 f_%02d.png"] });
    const good = codeCard(s, { x: 990, y: 260, w: 820, h: 220, file: "✓ skill 自带的接触表脚本", size: 26, lh: 44, lines: ["<c># 按真实时间精确取帧、拼成一张图</c>", "<k>$</k> python3 contact_sheet.py film.mp4"] });
    const x1 = el(s, "abs", `left:110px;top:500px;width:820px;text-align:center;font-size:120px;font-weight:900;color:${C.red};`, "✗");
    const x2 = el(s, "abs", `left:990px;top:500px;width:820px;text-align:center;font-size:120px;font-weight:900;color:${C.teal};`, "✓");
    const src = sourceTag(s, "来源：SKILL.md「渲染约束」：contact_sheet.py 按真实时间精确取帧，不要用 ffmpeg -r 1，会偏移几秒");
    return { s, h, bad, good, x1, x2, src };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B04.grab")); appear(u.src, t, T("B04.warn"));
    appear(u.bad.card, t, T("B04.warn"), { dy: 20 }); appear(u.x1, t, T("B04.warn") + 0.6, { dy: 0, scale: 0.4 });
    appear(u.good.card, t, T("B04.ok"), { dy: 20 }); appear(u.x2, t, T("B04.ok") + 0.4, { dy: 0, scale: 0.4 });
  });
  cue(T("B04.warn") + 0.6, "error"); cue(T("B04.ok") + 0.4, "chime");

  // ── B05：它自己审样帧（第 2 轮）
  const ISSUES = ["开场的窗口偏上", "翻译段、报错段的圈被窗口边裁掉", "译文卡片没完全盖住原文", "第二步的图标太像对话气泡"];
  add(T("B05"), T("B06"), (root) => {
    const s = el(root, "shot");
    const img = el(s, "abs", `left:110px;top:150px;width:675px;height:760px;border-radius:12px;background:#0a0d14 url(${A}samples_round2.png) center/contain no-repeat;box-shadow:0 0 0 1.5px rgba(255,255,255,0.14),0 30px 80px rgba(0,0,0,0.6);`);
    const cap = el(s, "abs mono", "left:820px;top:150px;font-size:20px;color:#8d8993;white-space:nowrap;", "真实会话第 2 轮 · 它渲的 8 张样帧（原图）");
    const h = el(s, "abs cn", `left:820px;top:196px;font-size:48px;font-weight:900;color:${C.ivory};white-space:nowrap;`, `它自己挑出的 <span style="color:${C.orange}">4 个问题</span>`);
    const rows = ISSUES.map((w, i) => card(s, 820, 300 + i * 132, 990, 112, `<div style="position:absolute;left:28px;top:30px;font-family:Geist;font-weight:800;font-size:40px;color:${C.orange};">0${i + 1}</div><div class="cn" style="position:absolute;left:110px;top:34px;font-size:34px;font-weight:800;color:#f2ece2;white-space:nowrap;">${w}</div>`));
    const fix = el(s, "abs cn", `left:820px;top:842px;font-size:30px;font-weight:800;color:${C.teal};white-space:nowrap;`, "改完，才拿给我们看");
    return { s, img, cap, h, rows, fix };
  }, (t, u) => {
    dust(t, { bright: 0.1 });
    appear(u.img, t, T("B05.self"), { dy: 20 }); appear(u.cap, t, T("B05.self") + 0.2); appear(u.h, t, T("B05.self") + 0.4);
    u.rows.forEach((r, i) => appear(r, t, T(`B05.i${i + 1}`), { dy: 16 }));
    appear(u.fix, t, T("B05.fix"), { dy: 10 });
  });
  [1, 2, 3, 4].forEach((i) => cue(T(`B05.i${i}`), "blip"));

  // ── B06：逐像素核对静止
  const HB = { x: 110, y: 230, w: 960, h: 540 };
  clip("hold", "qw", 27.6, T("B06.hold") + 0.1, T("B07") - 0.05 - T("B06.hold") - 0.1, HB, { seg: 2.4 });
  add(T("B06"), T("B07"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `结尾真的静止了吗？<span style="color:${C.teal}">逐像素比</span>`);
    const box = clipBox(s, { ...HB, poster: P("hold"), label: "圈问成片 27.6–30.0 秒", sub: " · 第 828–899 帧" });
    const z = card(s, 1120, 230, 690, 250, `<div class="cn" style="position:absolute;left:32px;top:28px;font-size:28px;color:#9b96a0;">第 828 帧 → 最后一帧</div><div style="position:absolute;left:32px;top:80px;font-family:Geist;font-weight:800;font-size:96px;line-height:110px;color:${C.teal};">差值 0</div><div class="cn" style="position:absolute;left:34px;top:196px;font-size:28px;color:#d9d3c7;">静止 2.4 秒</div>`, "rgba(63,224,208,0.5)");
    const ifr = card(s, 1120, 520, 690, 250, `<div class="cn" style="position:absolute;left:32px;top:28px;font-size:28px;color:#9b96a0;">29.63 秒那一帧有细小跳变</div><div class="cn" style="position:absolute;left:32px;top:84px;width:630px;font-size:34px;line-height:50px;font-weight:800;color:#f2ece2;">编码器的关键帧：压缩方式变了，内容没动，肉眼看不出</div>`);
    const src = sourceTag(s, "来源：真实会话第 4 轮（promo/session/turn4.json）");
    return { s, h, box, z, ifr, src };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B06.hold")); appear(u.box.c, t, T("B06.hold"), { dy: 20 }); appear(u.box.lab, t, T("B06.hold") + 0.2); appear(u.src, t, T("B06.hold"));
    appear(u.z, t, T("B06.zero"), { dy: 0, scale: 0.08 }); appear(u.ifr, t, T("B06.iframe"), { dy: 16 });
  });
  cue(T("B06.zero"), "snap");

  // ── B07：合规底线
  const LAW = [["声明", "没有真实数据，片尾写声明"], ["事实", "数字、客户名、奖项只用你给的"], ["用语", "不用「最」「第一」「唯一」"], ["行业红线", "医疗 · 金融 · 教育 · 地产"], ["授权", "配乐、字体、Logo 查得到"]];
  add(T("B07"), T("B08"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `第二件事：<span style="color:${C.orange}">合规底线</span>`);
    const cards = LAW.map(([a, b], i) => card(s, 110 + i * 344, 330, 320, 300, `<div class="cn" style="position:absolute;left:28px;top:34px;font-size:44px;font-weight:900;color:${i === 2 ? C.orange : C.teal};">${a}</div><div class="cn" style="position:absolute;left:28px;top:120px;width:268px;font-size:28px;line-height:42px;color:#d9d3c7;">${b}</div>`));
    const src = sourceTag(s, "来源：promo-video skill · references/compliance.md（演示阶段的合规底线，《广告法》第九条）");
    return { s, h, cards, src };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B07.law")); appear(u.src, t, T("B07.law"));
    u.cards.forEach((c, i) => appear(c, t, T(`B07.l${i + 1}`), { dy: 30, scale: 0.05 }));
  });
  [1, 2, 3, 4, 5].forEach((i) => cue(T(`B07.l${i}`), "card", { note_index: i }));

  // ── B08：圈问的声明
  const NB = { x: 480, y: 200, w: 960, h: 540 };
  clip("note", "qw", 28.0, T("B08.note") + 0.1, T("B09") - 0.05 - T("B08.note") - 0.1, NB, { seg: 2.0 });
  add(T("B08"), T("B09"), (root) => {
    const s = el(root, "shot");
    const box = clipBox(s, { ...NB, poster: P("note") });
    const arrow = el(s, "abs", `left:940px;top:752px;width:40px;height:40px;border-left:4px solid ${C.orange};border-top:4px solid ${C.orange};transform:rotate(45deg);`);
    const txt = el(s, "abs cn", `left:0;width:1920px;top:806px;text-align:center;font-size:30px;font-weight:800;color:${C.orange};white-space:nowrap;`, "「圈问是课程演示用的虚构产品……画面中的图表为示例数据」");
    const nn = el(s, "abs cn", "left:0;width:1920px;top:862px;text-align:center;font-size:28px;color:#d9d3c7;white-space:nowrap;", "片子里一个数字都没放");
    return { s, box, arrow, txt, nn };
  }, (t, u) => {
    dust(t, { bright: 0.1 });
    appear(u.box.c, t, T("B08.note"), { dy: 20 }); appear(u.arrow, t, T("B08.note") + 0.6, { dy: 10 }); appear(u.txt, t, T("B08.note") + 0.7);
    appear(u.nn, t, T("B08.nonum"));
  });
  cue(T("B08.note") + 0.7, "blip");

  // ── B09：交付规格
  const SPEC = [["时长", "30.00 秒", "B09.s1"], ["画面", "1920 × 1080 · 30 fps · H.264", "B09.s1"], ["音轨", "AAC", "B09.s1"], ["平均响度", "−17.0 dBFS", "B09.loud"], ["峰值", "≤ −1 dBFS", "B09.loud"]];
  add(T("B09"), T("B10"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `交付规格：<span style="color:${C.teal}">渲完先核对</span>`);
    const rows = SPEC.map(([a, b, at], i) => ({ r: el(s, "abs", `left:110px;top:${230 + i * 118}px;width:1200px;height:100px;border-radius:18px;background:rgba(18,17,24,0.93);border:1.5px solid rgba(255,255,255,0.12);`,
      `<div class="cn" style="position:absolute;left:32px;top:28px;font-size:34px;font-weight:800;color:#9b96a0;">${a}</div><div style="position:absolute;left:300px;top:24px;font-family:Geist;font-weight:800;font-size:40px;color:${i > 2 ? C.orange : C.ivory};white-space:nowrap;">${b}</div>`), at }));
    const std = card(s, 1360, 230, 450, 330, `<div class="cn" style="position:absolute;left:30px;top:28px;font-size:26px;color:#9b96a0;">skill 的标准</div><div class="cn" style="position:absolute;left:30px;top:80px;width:400px;font-size:30px;line-height:48px;color:#f2ece2;">平均 −16 到 −19 dBFS<br>峰值 ≤ −1 dBFS<br>母带默认 −17</div>`, "rgba(63,224,208,0.5)");
    const src = sourceTag(s, "来源：真实会话第 4 轮；design-principles.md「5. 声音」；music.md「混音规则」");
    return { s, h, rows, std, src };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B09.spec")); appear(u.src, t, T("B09.spec"));
    u.rows.forEach(({ r, at }, i) => appear(r, t, T(at) + (i % 3) * 0.25, { dy: 14 }));
    appear(u.std, t, T("B09.loud") + 0.5, { dy: 16 });
  });
  SPEC.forEach(([, , at], i) => cue(T(at) + (i % 3) * 0.25, "tick"));

  // ── B10：峰值超了，只修音轨
  add(T("B10"), T("B11"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `峰值超了：<span style="color:${C.orange}">只修音轨</span>`);
    const meter = el(s, "abs", "left:310px;top:250px;width:120px;height:600px;border-radius:16px;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.14);overflow:hidden;");
    const fill = el(meter, "abs", "left:0;bottom:0;width:120px;height:0;background:linear-gradient(0deg,#3fe0d0,#3fe0d0 70%,#ff7a3d);");
    const line = el(s, "abs", `left:280px;top:${250 + 600 * (1 / 20)}px;width:180px;height:4px;background:${C.red};`);
    const ll = el(s, "abs mono", `left:470px;top:${250 + 600 * (1 / 20) - 14}px;font-size:22px;color:${C.red};white-space:nowrap;`, "−1 dBFS 上限");
    const val = el(s, "abs", `left:520px;top:420px;font-family:Geist;font-weight:800;font-size:110px;line-height:120px;color:${C.red};white-space:nowrap;`, "−0.2");
    const unit = el(s, "abs mono", "left:520px;top:548px;font-size:26px;color:#9b96a0;", "dBFS · 峰值");
    const code = codeCard(s, { x: 1010, y: 300, w: 800, h: 300, file: "它在第 4 轮跑的", size: 26, lh: 46, lines: ["<c># 导出音轨 → 限幅 → 无损合回画面</c>", "<k>$</k> python3 master_audio.py \\", "    film-raw.mp4 film.mp4", "<c># 画面一帧不动，不重渲</c>"] });
    return { s, h, meter, fill, line, ll, val, unit, code };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B10.peak"));
    appear(u.meter, t, T("B10.peak"), { dy: 0 }); appear(u.line, t, T("B10.peak")); appear(u.ll, t, T("B10.peak"));
    const k = eOutCubic(clamp((t - T("B10.peak") - 0.2) / 0.5)), fixd = eOutCubic(clamp((t - T("B10.master") - 0.6) / 0.6));
    const db = lerp(-0.2, -1.0, fixd), hgt = 600 * (1 - (-db) / 20) * k;
    css(u.fill, { height: `${hgt}px` });
    const v = db.toFixed(1).replace("-", "−");
    if (u.val.textContent !== v) u.val.textContent = v;
    css(u.val, { color: fixd > 0.98 ? C.teal : C.red });
    appear(u.val, t, T("B10.peak") + 0.4); appear(u.unit, t, T("B10.peak") + 0.5);
    appear(u.code.card, t, T("B10.master"), { dy: 20 });
  });
  cue(T("B10.peak") + 0.4, "error"); cue(T("B10.master") + 1.2, "chime");

  // ── B11：颗粒让体积暴涨（鱼总）
  const YB = { x: 110, y: 250, w: 960, h: 540 };
  clip("yz", "yz", 7.0, T("B11.yz") + 0.1, T("B12") - 0.05 - T("B11.yz") - 0.1, YB);
  add(T("B11"), T("B12"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `交付的坑：<span style="color:${C.orange}">颗粒让体积暴涨</span>`);
    const box = clipBox(s, { ...YB, poster: P("yz"), label: "鱼总聊AI", sub: " · 画面加了胶片颗粒" });
    const c = card(s, 1120, 300, 690, 380, `<div class="cn" style="position:absolute;left:32px;top:34px;font-size:34px;font-weight:900;color:${C.ivory};">颗粒每一帧都不一样</div><div class="cn" style="position:absolute;left:32px;top:100px;width:630px;font-size:28px;line-height:44px;color:#bdb6aa;">压缩器几乎省不下码率，文件会大好几倍</div><div class="mono" style="position:absolute;left:32px;top:250px;font-size:26px;color:${C.teal};">→ 调 CRF 压缩</div>`);
    return { s, h, box, c };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B11.size")); appear(u.box.c, t, T("B11.yz"), { dy: 20 }); appear(u.box.lab, t, T("B11.yz") + 0.2); appear(u.c, t, T("B11.yz") + 0.6, { dy: 16 });
  });
  cue(T("B11.yz"), "whoosh");

  // ── B12–B13：暂停想一想 → 只改钩子
  add(T("B12"), T("B13"), (root) => {
    const s = el(root, "shot");
    const pc = pauseCard(s, `客户看完说「<span style="color:${C.orange}">钩子太弱</span>」，<br>你会整支重做吗？`);
    return { s, pc };
  }, (t, u) => {
    dust(t, { bright: 0.1 });
    appear(u.pc.tag, t, T("B12.pause")); appear(u.pc.qq, t, T("B12.q"), { dy: 0, scale: 0.06 }); appear(u.pc.hint, t, T("B12.q") + 0.8);
  });
  cue(T("B12.pause"), "chime");
  const BA = { x: 110, y: 300, w: 820, h: 462 }, BB = { x: 990, y: 300, w: 820, h: 462 };
  clip("v1", "qw1", 0.0, T("B13.did"), T("B14") - 0.05 - T("B13.did"), BA, { seg: 3.4 });
  clip("v2", "qw", 0.0, T("B13.did"), T("B14") - 0.05 - T("B13.did"), BB, { seg: 3.4 });
  add(T("B13"), T("B14"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `不用：<span style="color:${C.teal}">只改钩子那一段</span>`);
    const ask = chip(s, 110, 196, "第 5 轮", "钩子太弱：窗口放大，问句做成大字，一拍砸一句", C.orange);
    const a = clipBox(s, { ...BA, poster: P("v1"), label: "改前", sub: " · 第 4 轮成片的前 3.4 秒" });
    const b = clipBox(s, { ...BB, poster: P("v2"), label: "改后", sub: " · 第 5 轮成片的前 3.4 秒" });
    const ok = el(s, "abs cn", `left:110px;top:858px;font-size:30px;font-weight:800;color:${C.teal};white-space:nowrap;`, "其他镜头逐像素核对：和改前完全一样");
    return { s, h, ask, a, b, ok };
  }, (t, u) => {
    dust(t, { bright: 0.1 });
    appear(u.h, t, T("B13.answer")); appear(u.ask, t, T("B13.ask"), { dy: 12 });
    appear(u.a.c, t, T("B13.did") - 0.1, { dy: 20 }); appear(u.a.lab, t, T("B13.did")); appear(u.b.c, t, T("B13.did") - 0.1, { dy: 20 }); appear(u.b.lab, t, T("B13.did"));
    appear(u.ok, t, T("B13.check"), { dy: 10 });
  });
  cue(T("B13.ask"), "snap"); cue(T("B13.check"), "chime");

  // ── B14：四次典型改版（现存版本）
  const REV = [["bf", 0.0, "BeeGer", "嫌节奏慢 → 26 秒快节奏版", "B14.r1"], ["xh", 0.5, "小互", "嫌配乐悬疑 → 换明亮的曲子", "B14.r2"], ["ch", 13.0, "CelHive", "特效压过内容 → 一屏一个完整模块", "B14.r3"], ["br", 13.0, "精酿", "整段跟着鼓点抖 → 只在关键帧推", "B14.r4"]];
  const RB = (i) => ({ x: 110 + i * 430, y: 300, w: 400, h: 224 });
  REV.forEach(([k, from, , , at], i) => clip(`r${i + 1}`, k, from, T(at), T("B15") - 0.05 - T(at), RB(i), { seg: Math.min(5, T("B15") - 0.05 - T(at)) }));
  add(T("B14"), T("B15"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `四次典型的<span style="color:${C.orange}">改版</span>`);
    const items = REV.map(([, , name, what], i) => {
      const b = RB(i);
      const box = clipBox(s, { ...b, poster: P(`r${i + 1}`) });
      const n = el(s, "abs cn", `left:${b.x}px;top:${b.y + b.h + 18}px;font-size:36px;font-weight:900;color:${C.ivory};`, name);
      const w = el(s, "abs cn", `left:${b.x}px;top:${b.y + b.h + 74}px;width:${b.w}px;font-size:24px;line-height:36px;color:#bdb6aa;`, what);
      return { box, n, w };
    });
    const note = el(s, "abs cn", "left:110px;top:760px;font-size:22px;color:#77737d;white-space:nowrap;", "画面是改完以后的版本");
    return { s, h, items, note };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B14.four")); appear(u.note, t, T("B14.r1"));
    u.items.forEach(({ box, n, w }, i) => { const a = T(REV[i][4]); appear(box.c, t, a - 0.05, { dy: 20 }); appear(n, t, a + 0.1); appear(w, t, a + 0.3); });
  });
  REV.forEach(([, , , , at]) => cue(T(at), "card", { note_index: 2 }));

  // ── B15：口碑记录
  const BOOK = [["暗场科技快剪 + 快剪卖点", "WorkBuddy v4、HiAPI、BeeGer 快节奏版", "认可", C.teal], ["任何风格 + 整段跟拍抖", "多支", "反感", C.red], ["悬疑感配乐", "小互", "反感 → 换明亮 house", C.red], ["节奏慢、铺陈长", "BeeGer、造物矩阵的第一版", "反感 → 快节奏重做", C.red]];
  add(T("B15"), T("B16"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `改完，记进<span style="color:${C.teal}">口碑表</span>`);
    const tb = card(s, 110, 200, 1700, 470, `<div class="cn" style="position:absolute;left:30px;top:20px;font-size:24px;font-weight:800;color:#9b96a0;">style-router.md · 口碑记录（节选）</div>`);
    const rows = BOOK.map(([a, b, c, col], i) => el(tb, "abs", `left:24px;top:${70 + i * 98}px;width:1652px;height:86px;border-radius:12px;background:rgba(255,255,255,0.03);`,
      `<div class="cn" style="position:absolute;left:24px;top:24px;font-size:28px;font-weight:800;color:#f2ece2;white-space:nowrap;">${a}</div><div class="cn" style="position:absolute;left:660px;top:26px;font-size:26px;color:#bdb6aa;white-space:nowrap;">${b}</div><div class="cn" style="position:absolute;left:1240px;top:24px;font-size:28px;font-weight:900;color:${col};white-space:nowrap;">${c}</div>`));
    const q = chip(s, 110, 720, "它问我们", "「你看完后告诉我喜欢、一般还是要重做」", C.teal);
    const src = sourceTag(s, "来源：promo-video skill · references/style-router.md「口碑记录」；真实会话第 4 轮");
    return { s, h, tb, rows, q, src };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B15.book")); appear(u.tb, t, T("B15.book") + 0.2, { dy: 20 }); appear(u.src, t, T("B15.book"));
    u.rows.forEach((r, i) => appear(r, t, T("B15.book") + 0.6 + i * 0.3, { dy: 8 }));
    appear(u.q, t, T("B15.asked"), { dy: 12 });
  });
  cue(T("B15.asked"), "blip");

  // ── B16：总账 + 一个坑
  add(T("B16"), T("B17"), (root) => {
    const s = el(root, "shot");
    const h = title(s, `这次会话的<span style="color:${C.orange}">总账</span>`);
    const nums = [["5", "轮对话"], ["48", "次模型调用"], ["52", "次工具调用"], ["16", "分钟（它干活的时间）"], ["$3.38", "按 API 价折算"]].map(([a, b], i) =>
      card(s, 110 + i * 344, 230, 320, 220, `<div style="position:absolute;left:28px;top:30px;font-family:Geist;font-weight:800;font-size:72px;line-height:84px;color:${i === 4 ? C.orange : C.ivory};">${a}</div><div class="cn" style="position:absolute;left:28px;top:140px;width:270px;font-size:24px;line-height:34px;color:#bdb6aa;">${b}</div>`));
    const sub = el(s, "abs cn", "left:110px;top:476px;font-size:24px;color:#8d8993;white-space:nowrap;", "订阅用户不另外扣钱，占的是用量额度 · 数据：promo/session/usage.json");
    const pit = card(s, 110, 560, 1700, 260, `<div class="cn" style="position:absolute;left:34px;top:28px;font-size:30px;font-weight:900;color:${C.orange};">一个坑：无界面模式 + 后台渲染</div><div class="cn" style="position:absolute;left:34px;top:88px;width:1630px;font-size:28px;line-height:46px;color:#d9d3c7;">第 3 轮它把渲染放到后台；我们录课用的是 claude -p 无界面模式，会话一结束，渲染就被打断，成片文件是坏的。<br>第 4 轮让它前台渲染才好。平时在终端里交互着用，不会遇到。</div>`, "rgba(255,122,61,0.5)");
    return { s, h, nums, sub, pit };
  }, (t, u) => {
    dust(t);
    appear(u.h, t, T("B16.bill"));
    u.nums.forEach((n, i) => appear(n, t, (i < 4 ? T("B16.b1") + i * 0.35 : T("B16.b2")), { dy: 20, scale: 0.06 }));
    appear(u.sub, t, T("B16.b2") + 0.4);
    appear(u.pit, t, T("B16.pit"), { dy: 20 });
  });
  [0, 1, 2, 3].forEach((i) => cue(T("B16.b1") + i * 0.35, "card", { note_index: i })); cue(T("B16.b2"), "snap"); cue(T("B16.pit"), "error");

  // ── B17：回顾
  add(T("B17"), T("B18"), (root) => {
    const s = el(root, "shot");
    const m = recapMap(s, "质检、交付与改版", [["审片", "清单逐条过 · 按真实时间取帧"], ["交付", "写声明 · 核规格 · 响度只修音轨"], ["改版", "只改那一段 · 改完记进口碑"]]);
    return { s, m };
  }, (t, u) => {
    dust(t, { bright: 0.16 });
    u.m.update(t, T("B17.recap"), [T("B17.r1"), T("B17.r2"), T("B17.r3")]);
  });
  ["B17.r1", "B17.r2", "B17.r3"].forEach((a) => cue(T(a), "blip"));

  // ── B18：全课结束 · 致谢 · 轮到你
  add(T("B18"), END + 0.6, (root) => {
    const s = el(root, "shot");
    const map = LESSONS.map((w, i) => el(s, "abs", `left:${110 + (i % 4) * 430}px;top:${96 + Math.floor(i / 4) * 92}px;width:410px;height:76px;border-radius:16px;background:rgba(18,17,24,0.93);border:1.5px solid rgba(255,255,255,0.12);`,
      `<span style="position:absolute;left:18px;top:18px;font-family:Geist;font-weight:800;font-size:30px;color:${C.orange};">0${i + 1}</span><span class="cn" style="position:absolute;left:76px;top:20px;font-size:26px;font-weight:800;color:#f2ece2;white-space:nowrap;">${w}</span>`));
    const th = el(s, "abs cn", `left:0;width:1920px;top:320px;text-align:center;font-size:40px;font-weight:900;color:${C.ivory};`, "谢谢愿意把作品拿出来给大家拆的每一位客户");
    const names = CLIENTS.map((w, i) => el(s, "abs cn", `left:${210 + (i % 5) * 300}px;top:${392 + Math.floor(i / 5) * 54}px;width:280px;text-align:center;font-size:27px;font-weight:700;color:#d9d3c7;white-space:nowrap;`, w));
    const yours = el(s, "abs", "left:50%;top:640px;transform:translateX(-50%);height:96px;border-radius:48px;background:rgba(16,15,20,0.94);border:1.5px solid rgba(255,122,61,0.6);display:flex;align-items:center;gap:18px;padding:0 40px 0 22px;white-space:nowrap;box-shadow:0 30px 80px rgba(0,0,0,0.6);",
      `<span class="mono" style="font-size:22px;color:#111;background:${C.orange};border-radius:16px;padding:4px 14px;font-weight:700;">你的一句话</span><span class="cn" style="font-size:40px;font-weight:700;color:#f6f2ea;">用 promo-video 给 <span style="color:${C.orange}">你的产品</span> 做一支宣传片</span>`);
    const caret = el(yours, "", `width:4px;height:44px;background:${C.orange};`);
    return { s, map, th, names, yours, caret };
  }, (t, u) => {
    dust(t, { bright: 0.2 });
    u.map.forEach((m, i) => appear(m, t, T("B18.all") + i * 0.18, { dy: 12 }));
    appear(u.th, t, T("B18.thanks"));
    u.names.forEach((n, i) => appear(n, t, T("B18.thanks") + 0.3 + i * 0.05, { dy: 10 }));
    css(u.yours, { opacity: String(clamp((t - T("B18.yours")) / 0.2)), transform: `translateX(-50%) scale(${t > T("B18.yours") ? lerp(1.15, 1, spring(t - T("B18.yours"), 3, 0.55)) : 1.15})` });
    css(u.caret, { opacity: Math.floor(t * 2.2) % 2 ? "1" : "0.15" });
  });
  LESSONS.forEach((_, i) => cue(T("B18.all") + i * 0.18, "card", { note_index: i }));
  cue(T("B18.thanks"), "chime"); cue(T("B18.yours"), "slam");

  return shots;
}
