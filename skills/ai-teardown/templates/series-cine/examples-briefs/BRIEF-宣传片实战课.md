# 做一节「Opus 5.5 宣传片实战课」——给助手的说明（BRIEF v3）

用户已经认可：编排课全套（`lessons/00–10`）的写法和水准。实战课的样板是**导学 `lessons/p00`** 和**第 1 节 `lessons/p01`**：你做的这一节要和它们同一个水准、同一套写法。课程方案见 `promo/PLAN.md`，大纲见 `promo/series.json`。

## 方向
- 主角是**真实成片**：我们用 Opus 5.5 做过的宣传片（只用最终版本，见下表；客户已同意展示）。每节用它们讲清一件事：为什么好看、怎么让 Opus 5.5 + promo-video skill 做出来。
- 一条贯穿线：**一次真实会话**（给虚构产品「圈问」做 30 秒宣传片，记录在 `promo/session/`）。每节放这次会话里对应的那一步：真实提示词、它真实的输出、真实的文件。
- 片子本身要好看：开场 5–8 秒是真片段快剪 + 代码做的标题，卡在配乐的拍点上；只在 2–3 个关键点用 `hits`（而且**有片段在画面里时不要用 hits**，片段是后期叠上去的，不会跟着抖）。

## 用户 10-05 的新要求（必须照做）
- **所有作品只用最后的成品最终版本**（下表），不用旧版；优先用 WorkBuddy 上手课、WaytoAGI、YouWare、Renoise、造物矩阵。
- **不要用 Berryxia 那支片**（任何地方都不出现）。
- 按行业分类讲：AI 产品、社区与个人品牌、茶饮餐饮、百货、零售、制造业、电商、文旅生活。新的行业片（喜茶、无印良品、比亚迪、零售、电商）正在做，做好后放在 `~/Desktop/brand-promos/<品牌>/out/film.mp4`，主会话会告诉你能不能用。
- 需要配图（插画、贴纸、示意图）直接用 Codex 生图：`codex exec --skip-git-repo-check "生成一张图：…。复制到当前目录命名为 X.png" < /dev/null > log 2>&1`（必须 `< /dev/null`），放进 `lessons/<课号>/assets/`。不要用 emoji。

### 最终版本清单（路径都在 `~/Desktop/` 下）
| 分类 | 作品 | 文件 |
|---|---|---|
| AI 产品 | WorkBuddy 上手课 · 主片 v4 | workbuddy-promo/out/workbuddy-v4-4k-master.mp4 |
| AI 产品 | WorkBuddy 上手课 · 投流版 | workbuddy-ad/out/workbuddy-ad-scenes-4k-master.mp4 |
| AI 产品 | WorkBuddy 上手课 · 一镜到底版 | workbuddy-oneshot/out/os-master.mp4 |
| AI 产品 | YouWare v3 | youware-promo/out/youware-v3-hq.mp4 |
| AI 产品 | YouWare PPT 能力片 | youware-promo/out/ppt-2k.mp4 |
| AI 产品 | YouWare 投流片（日 / 中 / 英） | youware-jp/out/jp-master.mp4 · zh-master.mp4 · en-master.mp4 |
| AI 产品 | Renoise | renoise-promo/out/renoise-2k-v2.mp4 |
| AI 产品 | HiAPI | hiapi-promo/out/hiapi-hq.mp4 |
| AI 产品 | ListenHub | listenhub-promo/out/listenhub-hq.mp4 |
| AI 产品 | BeeGer（最终 3D 版） | beeger-promo/out/beeger-3d-hq.mp4 |
| AI 产品 | CelHive（v3） | celhive-promo/CelHive宣传片-2K.mp4 |
| AI 产品 | 大猫剪辑 | mqscene-promo/out/damao-2k.mp4 |
| AI 产品 | 知行猿（只有 540p） | mentalos-promo/film/out/film-preview.mp4 |
| AI 产品 | 小互（v2） | xiaohu-promo/out/xiaohu-hq-v2.mp4 |
| AI 产品 | 精酿 BrewReel | brewreel-promo/BrewReel宣传片-2K.mp4 |
| AI 产品 | VibeCafé × Vibe42（只有 540p） | vibe-promo/VibeCafe-Vibe42宣传片-预览.mp4 |
| AI 产品 | DockLock | docklock-promo/out/docklock-2k.mp4 |
| AI 产品 | TOKEI（快剪版，9:16） | tokei-promo/out/tokei-hype-2k.mp4 |
| 社区与个人品牌 | WaytoAGI | waytoagi-promo/WaytoAGI宣传片-2K.mp4 |
| 社区与个人品牌 | 造物矩阵（炫酷版） | zaowu-promo/out/zaowu-hype-hq.mp4 |
| 社区与个人品牌 | 鱼总聊AI | yuzong-promo/out/yuzong-2k-hq.mp4 |
| 茶饮餐饮 | 奈雪 | nayuki-promo/out/nx-master.mp4 |
| 茶饮餐饮 | 黄但记1927 | huangdanji-promo/out/黄但记1927-探店快闪-30s-1080p.mp4 |
| 文旅生活 | 顺德游玩的一天 | shunde-vlog/out/顺德游玩的一天-vlog-4K.mp4 |
| 文旅生活 | 健身男孩练腿日（9:16） | gym-boy/out/gym-master.mp4 |
| 网页 3D 与模型对比 | STILLWATER | lake-film/out/STILLWATER_功能展示_1080p.mp4 |
| 网页 3D 与模型对比 | 三模型蜜蜂对比 | apis-promo/out/opus-gemini-astra-bee.mp4 |
| 网页 3D 与模型对比 | 华山论剑 | model-flash/out/mf-master.mp4 |
| 真实会话 | 圈问 30 秒（改版后） | quanwen-promo/out/film.mp4（改版前：ai-teardown/examples/claude-video/promo/session/film_v1.mp4） |

讲改版故事（BeeGer、CelHive、小互、整段抖）时可以用文字和现存的旧版做对比，这是唯一允许出现旧版的地方，并且要标「旧版」。

## 真实会话（已录完，5 轮）
`promo/session/turn1.json … turn5.json`（提示词、逐条工具调用和相对秒数、它写的全部文字、这一轮用时和折算费用），`usage.json`（全程 48 次模型调用、52 次工具调用，输出 5.0 万 token、缓存读 533 万、缓存写 16 万，按 API 价折算 3.38 美元；5 轮合计用时约 16 分钟）。
| 轮 | 我们说的 | 它做的 | 用时 · 折算 |
|---|---|---|---|
| 1 | 用 promo-video 给圈问做一支 30 秒宣传片，官网 … | 读官网 → 素材分析 → 选型卡 → 7 镜分镜表 → 问 3 件事 | 44 秒 · $0.39 |
| 2 | 选 A/A/可以，结尾 Logo 停满 2 秒，先出样帧 | 建工程、选曲对拍（Techno Fest Vibes，124 BPM，主段落对到 3.4 秒 Logo）、写 Film.tsx、抽样帧、自己看出 4 处问题并改掉 | 7.5 分钟 · $1.93 |
| 3 | 直接出成片 | 把渲染放后台 → 会话一结束渲染就被打断（无头 `-p` 模式的坑） | 53 秒 · $0.13 |
| 4 | 渲染被打断了，前台重渲 | 前台渲染、发现峰值 −0.2 dBFS 只对音轨限幅、逐像素核对最后 2.4 秒静止 | 2.8 分钟 · $0.40 |
| 5 | 钩子太弱，放大、问句做大字一拍一句 | 只改钩子段、抽样帧、重渲、核对其他镜头逐像素不变 | 4 分钟 · $0.53 |
各课用哪一轮：p02 第 1 轮（读官网、抽配色）+ 第 2 轮开头（存 Logo）；p03 第 1 轮的选型卡；p04 第 1 轮分镜 + 第 2 轮选曲对拍；p05 第 2 轮 Film.tsx 里的动效（`~/Desktop/quanwen-promo/src/`）；p06 Film.tsx 里的运镜；p07 第 2 轮选曲 + 第 4 轮限幅；p08 第 3–5 轮（坑、质检、改版）和全程用量。

## 你要交付（都在 `lessons/<课号>/` 里，课号 p02…p07）
1. `narration.json`：16–20 拍，1100–1400 字。格式、音色照抄 `lessons/p00/narration.json`（`style` 把「导学」改成「一节课」）。
2. 配音：`cd ~/Desktop/ai-teardown && python3 scripts/make_lesson.py examples/claude-video/lessons/<课号> voice > examples/claude-video/lessons/<课号>/voice.log 2>&1`，然后 `python3 scripts/speed.py examples/claude-video/lessons/<课号> 1.15`。MiMo 会 429 限流，脚本自己退避重试，耐心等。
3. 配乐：`showcase/opus-intro/.venv/bin/python ~/.claude/skills/promo-video/scripts/pick_music.py lessons/<课号>/assets/music/bgm.wav --track <下表的曲子> --seconds <整节秒数+2> --hit-at <开场标题砸下的秒数>`，把打印的 BPM 和 `credit.txt` 写进 film.js 注释。
4. `film.js`：写法照 `lessons/p00/film.js`。素材放 `lessons/<课号>/assets/`。
5. 片段：`/usr/local/bin/python3 cine/tools/clips.py <课号>`（裁好片段和封面）。
6. 接触表：`/usr/local/bin/python3 cine/tools/stills.py <课号> lessons/<课号>/stills/sheet.png 1.0 B01+1 B02.a+1 …`（每个镜头至少 1 帧），**自己逐张看**：重叠、出画、空屏、字太小、字幕被挡就改到没有。接触表里片段框显示的是封面，成片里会换成真视频。
7. 回复主会话（200 字以内）：拍数、字数、配音总长、回读低于 95% 的拍和处理、片段清单（源片 + 起点 + 时长）、你最满意和最没把握的镜头。

**不要做**：不渲染成片（record.py / finish.py 由主会话跑）、不发布、不改 `cine/engine/`、`cine/tools/`、`showcase/` 里的任何文件（缺东西在回复里说）、不碰别的课、不改 `~/.claude/skills/promo-video` 里的任何文件。

## 片段（真实成片）怎么用
- `export let clips = []`，在 `build()` 里 `clips.push({ id, src: 绝对路径, from: 源片起点秒, at: 本课第几秒出现, dur, x, y, w, h, audio: "mute", fade?, poster_at? })`。导学里的 `clip()` 小函数可以照抄。
- 框用 `clipBox(s, { x, y, w, h, poster: "../lessons/<课号>/assets/clips/<id>.jpg", label, sub })` 画；片段由 finish.py 叠在框里。**片段永远在最上层**：任何字、箭头、标注都不能压在片段框上；片段框不能进 y>920（字幕区）。
- `w`、`h` 用偶数，16:9（全屏 1920×1080；常用 960×540、640×360、560×314、540×304）。竖屏片（TOKEI、WorkBuddy 竖屏版）会被居中裁成横的，要完整展示就用 9:16 的框（例如 304×540）。
- 片段的声音默认 `mute`；要让观众听一段原声（比如第 7 节讲配乐），用 `audio: "full"`，这一段旁白要留空、`gain` 自己定。
- 片段时长 ≤ 源片剩余长度（`ffprobe` 看源片时长）。
- 片段之间硬切用 `fade: 0`，切点放在拍点上（`beat(i)` 的写法见导学）。
- 片段比镜头短时用 `seg`：源片只放 `seg` 秒，剩下的时间定格在最后一帧（比如只放一支片的 3 秒钩子，框一直留到这一镜结束）。

## 配乐分配（不要换，避免两节撞曲）
| 课号 | 曲子（`--track`） | 说明 |
|---|---|---|
| p01 | mixkit-162-minimal-techno-01.mp3 | 129 BPM，一开头就有能量（Techno Fest Vibes 让给了真实会话那支片） |
| p02 | mixkit-132-hazy-after-hours.mp3 | 123 BPM，中等能量 |
| p03 | mixkit-161-minimal-techno-02.mp3 | 128 BPM |
| p04 | mixkit-1012-take-this-higher.mp3 | 123 BPM，11.25 秒进入主段落（这一节正好拿它演示 `--hit-at`） |
| p05 | mixkit-126-trap-electro-vibes.mp3 | 112 BPM，10.5 秒进入主段落 |
| p06 | mixkit-32-driving-ambition.mp3 | 99 BPM，9.5 秒进入主段落 |
| p07 | mixkit-173-better-times-are-coming.mp3 | 117.5 BPM |
| p08 | mixkit-33-motivating-mornings.mp3 | 123 BPM，12 秒进入主段落 |

film.js 里：`music = [{ src: 绝对路径, from: 0, at: 0, dur: 整节长 + 0.6, gain_curve: [[0, -2], [COLD - 0.4, -2], [COLD + 0.8, -9], …], fade_out: 1.5 }]`，并 `sections.push({ t: 0, t_to: 整节长 + 0.6, level: 0 })`（不用合成铺底）。

## 写法（跟导学、第 1 节一样）
- 第一拍承接开场（「刚才这……」），第二拍「这一节讲三件事」，中间一拍「暂停想一想」+ 下一拍 `[[answer]]`，倒数第二拍回顾导图（`recapMap`），最后一拍预告下一节 + 「我们下节见」。**不要致谢**（致谢只放导学和最后一节）。
- 每节至少一段「真实会话」：终端按 `promo/session/` 里的真实记录重绘（照第 1 节的 `term()` 写法），只截和这一节有关的那一步；路径里的用户名一律写成 `~`。
- 口语短句；英文专名少用，非用不可就进 lexicon；数字写成读法。
- **[[cue]] 名只用小写字母、数字、下划线，不要叫 `end`**（`B06.end` 是引擎保留写法，表示这一拍结束）。
- **旁白里的英文名不要带连字符**：写「promo video」，不要写「promo-video」（带连字符会让逐字对齐从那里断掉，后面的字全挤到拍尾）。配音后跑一遍 `python3 promo/check_timings.py <课号>` 查有没有断。
- 屏幕字一屏一个完整信息；特效作用在内容上，别把字拆碎。

## 事实来源（没出处的不上屏、不进旁白；推断说「可能」）
| 来源 | 路径 | 能用的 |
|---|---|---|
| promo-video skill | `~/.claude/skills/promo-video/SKILL.md`、`references/*.md` | 流程、选型卡、分镜表、时长档位、阅读速度、设计原则、大师审片清单、动效档位与手艺地图、运镜表、曲库与授权、合规底线 |
| 口碑记录（用户真实反馈） | `references/style-router.md` 的「口碑记录」 | 整段抖→反感；悬疑配乐→换明亮 house；节奏慢→快节奏重做；投流版直接要了 4K；竖屏便当格「不如之前」 |
| 案例库 | `examples/promo-course/research/cases.md`（41 条，`cases.json` 同字段）、`sheets/<id>.jpg`（1 帧/秒联系表）、`sheets/zoom/` | 每支片的时长、画幅、四层选型、配乐（音频指纹核实过）、183 个片段候选、最强 6 个片段、3 个改版故事（BeeGer 三版、CelHive 三版、整段抖→HitCam，BrewReel 有修改前后两版可对剪） |
| skill 拆解 | `examples/promo-course/research/skill.md` | promo-video 每一步对应哪份文档、哪条规则 |
| 外部参考 | `examples/promo-course/research/sources.md` | HyperFrames product-promo 模板结构、Remotion 授权（含 Creators 每人每月 25 美元）、Revideo / Motion Canvas（MIT）、GSAP 许可；**12 条社区宣传片提示词节选（每条 ≤15 词，带 @作者和原帖链接，可直接引用）** |
| 交付记录 | 记忆里的项目条目（主会话会在你的那一课说明里给出要点） | 例如 BeeGer v1→v2、小互换配乐、精酿 95 BPM |
| Remotion 授权 | `promo/sources/remotion-LICENSE.md` | 个人、≤3 人的营利公司、非营利组织免费；其余要公司授权 |
| 真实会话 | `promo/session/`（turn*.jsonl、usage.json） | 提示词原文、它的输出、用时、用量 |

## 注意（研究里查出来的）
- WorkBuddy v4 用的是 Apple 系统 emoji（skill 规则里属于版权灰区）：别把它的 emoji 画面放大当正面示范。
- TOKEI 有类高达机甲开机画面、写实皮肤，WaytoAGI 有合作方 Logo 和产品截图：只用小框、短时长，不做全屏特写。
- 小互 v1、CelHive v1/v2、WorkBuddy v1 的成片已经不在盘上：讲这些改版只能用文字和现存版本，不要说「请看 v1」。

## 各课要点
| 课号 | 王炸开场建议 | 必讲三件事 | 主案例 |
|---|---|---|---|
| p02 从官网拿素材 | 官网截图被拆成素材板：Logo、色卡、字体、产品图飞出来落成片中画面 | 文案与卖点（原话优先、数字要确认）；配色字体 Logo（算出来的）；产品图、官网视频、缺什么就问 | Renoise、BeeGer（透明 Logo 放白底）、造物矩阵（矢量 Logo 做书写盖印）、大猫剪辑（官网没截图→功能示意片）、HiAPI（官方视频 + curl 钩子） |
| p03 选型卡 | 四个转轮转动、锁定成一张选型卡 | 四层（模式/基调/骨架/增强≤2）；按信号推荐；口碑记录 | WorkBuddy 四个版本（同一产品四张选型卡）、BeeGer v1 vs 快节奏版、小互 |
| p04 分镜和节拍 | 波形 + 切点：真片段按鼓点硬切 | 分镜表七列；阅读速度（中文约 7 字/秒 + 0.5 秒）；选曲对拍（BPM 网格、能量到达点、`--hit-at`） | 精酿（实测 95 BPM）、小互（atempo 对齐网格）、本课自己的配乐 |
| p05 动效层 | 粒子在产品截图上聚成口号再炸开 | 素材优先；三个档位与手艺地图；转场与首尾呼应、「不够炫」怎么加码 | WorkBuddy v4、YouWare v3、Renoise（视频嵌字）、WaytoAGI（Logo 环 2D→3D→2D）、造物矩阵 v1→炫酷版 |
| p06 镜头与设备 | 镜头穿过一面 3D 片墙 | 导演运镜表；运镜规则（一种主运动、CTA 静稳、HitCam 只给 3–5 个关键帧，不整段抖）；3D 设备、一镜到底、纯代码 3D | DockLock（三屏 CSS-3D）、WorkBuddy 一镜到底、TOKEI、蜜蜂对比片、编排课样片 |
| p07 声音 | 一支片的音轨拆成配乐/音效/旁白三层逐层亮起 | 曲库与授权（Mixkit 能做/不能做）；音效落在接触帧、两处最响；旁白避让与母带 | ListenHub（官方音色驱动声波）、WorkBuddy 一镜到底（克隆旁白）、小互（换配乐）、编排课样片的真实按键录音 |
