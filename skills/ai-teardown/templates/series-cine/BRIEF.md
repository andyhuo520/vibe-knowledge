# 做一节「{课程名}」——给助手的说明（代码成片 · 模板）

> 主会话把 `{…}` 填好再发给助手，用不到的小节删掉。两份真实用过的说明在 `examples-briefs/`（编排课、宣传片实战课、行业概念片、加餐拆片课），写新说明前先看一份。

样板：`examples-lessons/00`（导学：粒子大字、王炸开场、合成配乐）和 `examples-lessons/p08`（实战课：开场完整放一遍真成片、真实会话终端、曲库配乐）。{用户已经认可的那一节，如 `lessons/01`} 是这门课的水准线，你做的这一节要和它同一个水准、同一套写法。

工作区根目录：`{工作区}`；系列目录：`{工作区}/examples/{系列名}`（下面的相对路径都从系列目录算）。
`$CINE_PY` = 装了 numpy、scipy、pillow、playwright 的 Python：`{路径}`。

## 方向
- {一句话：这门课的主角是什么，比如「Opus 5.5 本身」「我们交付过的真实成片」}
- 片子本身要好看：开场 4–8 秒是代码算出来的高冲击画面（或真片段快剪）+ 课名砸下，卡在配乐拍点上。
- 只在 2–3 个关键点用 `hits`，不要整段抖；画面里有片段时不要用 hits（片段是后期叠上去的，不会跟着抖）。
- 一屏一个完整信息；特效作用在内容上，别把字拆碎。

## 你要交付（都在 `lessons/<课号>/` 里）
1. `narration.json`：16–20 拍，1100–1400 字（1.15 倍速后约 3.5–4 分钟）。格式、音色照抄样板（`voice.clone` 指向 `../../voice/host-ref.wav`）。
2. 配音：`cd {工作区} && python3 scripts/make_lesson.py examples/{系列名}/lessons/<课号> voice > examples/{系列名}/lessons/<课号>/voice.log 2>&1`，再 `python3 scripts/speed.py examples/{系列名}/lessons/<课号> 1.15`，然后在系列目录 `python3 tools/check_timings.py <课号>` 查逐字对齐有没有断。MiMo 会 429 限流，脚本自己退避重试，耐心等。
3. 配乐（二选一）：
   - 合成铺底（默认）：`sections` 写段落和 level，finish.py 会用 `cine/audio/tools/bed.py` 合成。
   - 曲库：`$CINE_PY ~/.claude/skills/promo-video/scripts/pick_music.py lessons/<课号>/assets/music/bgm.wav --track {曲子} --seconds <整节秒数+2> --hit-at <课名砸下的秒数>`；曲子比整节短就 `python3 cine/tools/loopbed.py <bgm.wav> <bgm_long.wav> --seconds <整节秒数> --bpm <打印的 BPM> --anchor <hit-at>` 按小节接长。把打印的 BPM 和 `credit.txt` 写进 film.js 注释。
4. `film.js`：镜头表，写法照样板。素材放 `lessons/<课号>/assets/`；本课专用的 3D/着色器场景写在 `lessons/<课号>/scenes/`。
5. 片段（有 clips 时）：`$CINE_PY cine/tools/clips.py <课号>`（裁好片段和封面）。
6. 接触表：`$CINE_PY cine/tools/stills.py <课号> lessons/<课号>/stills/sheet.png 1.0 B01+1 B02.a+1 …`（每个镜头至少 1 帧，动画中途再补几帧），**自己逐张看**：重叠、出画、空屏、字太小、字幕被挡就改到没有。接触表里片段框显示的是封面，成片里会换成真视频。
7. 回复主会话（200 字以内）：拍数、字数、配音总长、回读低于 95% 的拍和处理、片段清单（源片 + 起点 + 时长）、你最满意和最没把握的镜头。

**不要做**：不渲染成片（record.py / finish.py 由主会话跑）、不发布、不改 `cine/engine/`、`cine/tools/`、`cine/audio/` 里的任何文件（缺东西在回复里说）、不碰别的课、不改别的 skill。

## 开工前必读
- 样板的 `narration.json` 和 `film.js`
- `cine/engine/core.js`（一节课 = seek(t)；film.js 导出什么）、`narr.js`（时间写法）、`ui.js`（组件和动画函数）、`scenes/*.js`（可用场景）
- `series.json` 里你这一课的条目（标题、钩子、要点）和下面的事实来源

## 引擎速查
- 页面：`http://127.0.0.1:8964/cine/index.html?lesson=<课号>`（服务器根是系列目录；没开就 `python3 -m http.server 8964 --bind 127.0.0.1 --directory <系列目录>` 放后台）。
- film.js 导出：
  - `COLD`：旁白整体往后挪的秒数 = 片头王炸开场的长度（无旁白，配乐 level 3 + 音效）。
  - `meta`（`{ title, n }`）、`hits`（≤3 个时刻）、`blur`（快速运动的 `[起, 止]` 秒段，渲染时做运动模糊）、`sfx`（音效点）、`sections`（合成配乐段落）、`clips`（真片段）、`music`（曲库配乐）。
  - `build(ctx)` 返回镜头数组 `{ from, to, build(root), render(t, u) }`；`ctx.narr` 是旁白时间轴，`ctx.r` 是 three.js 渲染器，`ctx.post` 是后期。
- 时间写法：`T("B07")` 这一拍开始、`T("B07.ring")` 读到 `[[ring]]`、`T("B03@三千")` 读到某个字、`T("B07.end")` 这一拍结束，可以加 `+0.4`。
- 场景（`cine/engine/scenes`）：`Particles`（26 万粒子，队形 `F.DUST/LINE/CLOUD/TITLE/CN/POINT`，`setText` 换任意文字）、`Clock`（时间雕塑）、`Bars`（节拍柱阵）、`Showroom`（展厅三件展品，构造传 `ctx.r`）、`Liquid`（液态金属光线步进）、`Tunnel`（源码隧道）。参数见各文件末尾注释。
- UI（`cine/engine/ui.js`）：`appear / slam / typeText`、`codeCard`（`hl(i, on)` 高亮行）、`promptChip`、`quoteCard`、`sourceTag`、`pauseCard`、`recapMap`、`clipBox`。
- 字幕由引擎按旁白逐字时间自动出，在 y≈940–1030；**y>920 不放内容**（来源小字 `sourceTag` 在 y=1012，可以）。
- 音效类型：slam、whoosh、whoosh-through、riser（要 `t_to`）、impact、blip、click、tick、shutter、snap、chime、error、card（`note_index`）、rewind、key（真实按键录音，`enter: true` 是回车）。合成配乐 level：0 静、1 只有铺底、2 轻律动、3 满（开场用）。

## 片段（真实成片）怎么用
- `clips.push({ id, src: 绝对路径, from: 源片起点秒, at: 本课第几秒出现, dur, x, y, w, h, audio: "mute", fade?, poster_at?, seg?, gain? })`。
- 框用 `clipBox(s, { x, y, w, h, poster: "../lessons/<课号>/assets/clips/<id>.jpg", label, sub })`；片段由 finish.py 叠在框里，**永远在最上层**：任何字、箭头、标注都不能压在片段框上；片段框不能进 y>920。
- `w`、`h` 用偶数、16:9（全屏 1920×1080；常用 960×540、640×360、560×314）；竖屏片要完整展示就用 9:16 的框（如 304×540）。
- 声音默认 `mute`；要观众听原声用 `audio: "full"`（这段旁白留空、`gain` 自己定）；`"duck"` 是压在旁白下面。
- 片段时长 ≤ 源片剩余长度（`ffprobe` 看）；起点别落在源片的模糊转场上。片段之间硬切用 `fade: 0`，切点放在拍点上。
- 片段比镜头短时用 `seg`：源片只放 `seg` 秒，剩下的时间定格在最后一帧。

## 曲库配乐写法
`music = [{ src: 绝对路径, from: 0, at: <进来的秒数>, dur: <整节长 + 0.6 − at>, gain_curve: [[0, -2], [COLD - 0.4, -2], [COLD + 0.8, -9], …], fade_in?, fade_out: 1.5 }]`，并 `sections.push({ t: 0, t_to: 整节长 + 0.6, level: 0 })`（关掉合成铺底）。旁白段 finish.py 会自动再压低配乐。

## 写法
- 第一拍承接开场（「刚才这……」），第二拍「这一节讲三件事」，中间一拍「暂停想一想」+ 下一拍 `[[answer]]`，倒数第二拍回顾导图（`recapMap`），最后一拍预告下一节 + 「我们下节见」。**不要每节致谢**（致谢只放导学和最后一节）。
- 口语短句；英文专名少用，非用不可就进 `lexicon`；数字写成读法（「三千七百一十六」）。
- **`[[cue]]` 名只用小写字母、数字、下划线，不要叫 `end`**（`B06.end` 是引擎保留写法）。
- **旁白里的英文名不要带连字符**：写「promo video」，不写「promo-video」（连字符会让逐字对齐从那里断掉）。
- 引用社区内容：一次 ≤15 个英文单词，写明作者和出处。
- 需要配图（插画、贴纸、示意图）用 Codex 生图：`codex exec --skip-git-repo-check "生成一张图：…。复制到当前目录命名为 X.png" < /dev/null > log 2>&1`（必须 `< /dev/null`），不用 emoji；示意图标「示意」。
- 路径里的本机用户名一律写成 `~`；密钥、授权文件、账号邮箱不上画面。

## 事实来源（没出处的数字、功能、说法不上屏、不进旁白；推断说「可能」）
| 来源 | 路径 | 能用的 |
|---|---|---|
| {来源} | {路径} | {能用的内容} |

## 各课要点
| 课号 | 王炸开场建议 | 必讲三件事 | 可用真实素材 |
|---|---|---|---|
| {课号 标题} | {开场} | {三件事} | {素材} |
