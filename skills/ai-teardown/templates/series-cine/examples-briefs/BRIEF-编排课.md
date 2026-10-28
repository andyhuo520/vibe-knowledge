# 做一节「Claude Code 做视频：Opus 5.5 编排课」（改版）——给助手的说明

用户已经看过并认可：样片 `showcase/opus-intro`（62 秒）和第 1 节 `lessons/01`（视频就是一个函数）。**第 1 节就是样板**，你做的这一节要和它同一个水准、同一套写法。

## 方向（用户原话的意思）
- 主角是 **Opus 5.5 本身**：讲清它为什么编排视频这么强、怎么用好它的动效。
- 片子本身就要「王炸」：每一帧都是代码实时算出来的高冲击画面（Three.js、GLSL、粒子、镜头运动、动态大字），不是贴动效模板片段、不是录屏拆解。
- 暗场科技风；只在 2–3 个关键点做镜头冲击（`hits`），**不要整段抖**；一屏一个完整信息，特效作用在内容上，别把字拆碎。

## 你要交付（都在 `lessons/<课号>/` 里）
1. `narration.json`：16–20 拍，1100–1400 字（1.15 倍速后约 3.5–4 分钟）。格式、音色、语气说明照抄 `lessons/01/narration.json`。
2. 配音：`cd ~/Desktop/ai-teardown && python3 scripts/make_lesson.py examples/claude-video/lessons/<课号> voice > examples/claude-video/lessons/<课号>/voice.log 2>&1`，然后 `python3 scripts/speed.py examples/claude-video/lessons/<课号> 1.15`。
3. `film.js`：镜头表，写法照 `lessons/01/film.js`。素材放 `lessons/<课号>/assets/`；需要新的 3D/着色器场景就写在 `lessons/<课号>/scenes/` 里（本课专用）。
4. 接触表：`python3 cine/tools/stills.py <课号> lessons/<课号>/stills/sheet.png B01+1 B02.a+1 …`（每个镜头至少 1 帧，关键动作再加帧），**自己逐张看**，有重叠、出画、空屏、字太小、字幕被挡就改到没有。
5. 最后回复主会话（200 字以内）：拍数、字数、配音总长、回读质检里低于 95% 的拍和你的处理、你自己最满意和最没把握的镜头。

**不要做**：不渲染成片（record.py / finish.py 由主会话跑）、不发布、不改 `cine/engine/` 和 `showcase/` 里的任何文件（发现引擎缺东西就在回复里说）、不碰别的课。

## 开工前必读
- `lessons/01/narration.json`、`lessons/01/film.js`（样板）
- `cine/engine/core.js`（一节课 = seek(t)；film.js 导出什么）、`narr.js`（时间写法）、`ui.js`（组件和动画函数）、`scenes/*.js`（可用场景）
- `PLAN-v2.md`、`series.json` 里你这一课的条目（标题、钩子、要点）
- 事实来源（下表）。**没出处的数字、功能、说法不上屏、不进旁白**；推断要说「可能」。

## 引擎速查
- 页面：`http://127.0.0.1:8964/cine/index.html?lesson=<课号>`（服务器根是 `examples/claude-video`；没开就 `python3 -m http.server 8964 --directory ~/Desktop/ai-teardown/examples/claude-video` 放后台）。
- film.js 导出：
  - `COLD`：旁白整体往后挪的秒数＝片头「王炸开场」的长度（本课自己渲，通常 4–7 秒，无旁白，配乐 level 3 + 音效）。不要写 `COLD_SRC`（那是拼样片片段用的，只有第 1 节和导学用）。
  - `meta`、`hits`（≤3 个时刻）、`blur`（快速运动的 [起, 止] 秒段，渲染时做运动模糊）、`sfx`（音效点）、`sections`（背景乐段落）、`build(ctx)` 返回镜头数组 `{from, to, build(root), render(t, u)}`。
- 时间写法：`T("B07")` 开始、`T("B07.ring")` 读到 [[ring]]、`T("B03@三千")` 读到某个字、`T("B07.end")`，可加 `+0.4`。
- 场景（`cine/engine/scenes`）：
  - `Particles`：26 万粒子；`F.DUST/LINE/CLOUD/TITLE/CN/POINT` 队形；`setText("title"|"cn", {lines:[{text, font, y}]})` 换成任意文字；render 参数见文件末尾注释（from/to/p/stagger/delay/fly/burst/size/bright/dust/camX/Y/Z/lookX/lookY/sweep）。
  - `Clock`：时间雕塑，`render(r, rt, 场景时间, {speed, beat, gain, plate, camX, camY, camZ})`。
  - `Bars`：节拍柱阵，`{kicks:[秒], hats:[秒], big:[秒], camA, camY, camZ, lookY, grow}`。
  - `Showroom`：展厅三件展品（铬结 / 玻璃多面体 / 光球），`{pos:[x,y,z], look:[x,y,z], fov}`；构造要传 `ctx.r`。
  - `Liquid`：液态金属光线步进，`{camA, collapse, glow, bg, zoom}`。
  - `Tunnel`：源码隧道，构造传一段源码文字；`{dist, gain, roll, fov, glow}`。
  - 样片里的分镜墙、截帧自检、样帧挑选是 DOM + 场景拼的，代码在 `showcase/opus-intro/src/shots_b.js`，需要就**复制**到你的课里改，不要 import 那个文件。
- UI（`cine/engine/ui.js`）：`appear / slam / typeText`、`codeCard`（`hl(i, on)` 高亮行）、`promptChip`、`quoteCard`、`sourceTag`、`pauseCard`、`recapMap`。
- 字幕由引擎自动出（旁白逐字时间），在画面 y≈940–1030；**y>920 的区域不要放内容**（来源小字 sourceTag 在 y=1012，可以，但别和字幕抢）。
- 音效类型：slam、whoosh、whoosh-through、riser（要 t_to）、impact、blip、click、tick、shutter、snap、chime、error、card（note_index）、rewind。背景乐 level：0 静、1 只有铺底、2 轻律动、3 满（开场用）。

## 写法（跟第 1 节一样）
- 第一拍承接冷开场（「刚才这……」），第二拍「这一节讲三件事」，中间一拍「暂停想一想」+ 下一拍 `[[answer]]`，倒数第二拍回顾导图，最后一拍预告下一节 + 「我们下节见」。**不要每节致谢**（用户要求：致谢只放在导学和最后一节）。
- 口语短句；英文专名少用，非用不可就进 lexicon；数字写成读法（「三千七百一十六」）。
- 引用社区提示词：一次 ≤15 个英文单词，写明 @作者，片中小字「收录于熠辉 awesome-opus5-5-videos，提示词版权归原作者」。
- **用真实数据和真实素材**：样片的 `timeline.json`（124 BPM、32 小节、cue 时刻）、`showcase/opus-intro/out/score_report.txt`、`assets/making/`（样片制作中真实截的「改前 / 改后」帧、真实会话里 Opus 5.5 写的 `fanqie_BRIEF.md`、`fanqie_STORYBOARD.md`）、我们的实测（无头浏览器 SwiftShader 每帧 67.9 ms vs Metal GPU 1.9 ms；同一 t 两次渲染 0 像素差；样片 3716 帧、渲染约 7 分钟）。示意图要标「示意」。

## 事实来源
| 来源 | 路径 | 能用的 |
|---|---|---|
| Anthropic《Introducing Claude Opus 5.5》2026-09-22 | `research/claude-code/snapshots/S41.txt` | 5.5 家族第一个模型；多个 Claude 模型一句提示词做游戏、画面和完成度得分最高；测试者：检查自己工作的方式很有创意、自我验证循环更容易搭；连续 18 小时不跑偏；一个会话指挥十几个会话；输出比 Opus 5 快 30% 以上；价格 |
| Claude 平台文档 Models overview | `research/claude-code/snapshots/S14.md` | 1M token 上下文 ≈ 250 万字符；文字和图片输入 |
| Claude Code 文档 | `research/claude-code/facts.json`（C0xx 条） | 子智能体、hooks、/model、effort 等 |
| 熠辉 awesome-opus5-5-videos | `research/yihui/prompt-patterns.md`、`awesome-stats.md`、`rights.md` | 475 个视频、12 种写法（逐字例句带作者） |
| 样片实测 | `showcase/opus-intro/`（timeline.json、score_report.txt、src/） | 本课程自己的数据 |

## 各课要点（标题、钩子见 series.json）
| 课号 | 王炸开场建议 | 必讲 | 可用真实素材 |
|---|---|---|---|
| 02 先导演，后动手 | 分镜墙 16 张卡踩十六分音符落位 → 钻进一张卡变成真画面 | 分镜表（每镜做什么、多长）、节拍表（BPM→每拍秒数→小节网格）、它先写计划再写代码、1M 上下文 | `fanqie_STORYBOARD.md`（真实会话里它先写的分镜）、样片 timeline.json |
| 03 节奏的数学 | 节拍柱阵冲击波 + 每拍砸一句 | 缓动（慢进快出）、弹簧过冲、错峰、卡点（124 BPM = 每拍 0.484 秒） | 样片里的 spring/ease 函数（src/util.js）、score_report 的底鼓误差 ≤5 ms |
| 04 看得见自己的作品 | 截帧 → 识别框 → 标错 → 自己修 | 它能看图；渲染→截帧→看→修的闭环；让它看什么（重叠、出画、对比度）；修完再截 | `assets/making/` 改前改后三组 |
| 05 一整部片子不跑偏 | 一条时间轴上画面轨、配乐轨、音效轨同步亮起 | 一份时间表画面和音乐共用；按小节拆任务给子智能体（样片配乐就是子智能体并行写的）；长任务怎么检查进度 | timeline.json、score_report.txt |
| 06 粒子 | 26 万粒子炸开聚成本课标题 | 队形、过渡（错峰+缓动）、扰动（curl 噪声）；提示词怎么写 | `explode_v1_loop` → `explode_v2_shockwave`（真实修 bug） |
| 07 3D 镜头 | 展厅推近→甩镜→环绕 + 源码隧道穿越 | 推、拉、摇、甩、环绕、穿越；运动模糊（子帧平均、180° 快门）；时长和缓动怎么说 | 样片 record.py 的运动模糊段 |
| 08 着色器质感 | 全屏液态金属 → 塌缩成点 | 着色器＝每个像素一段程序；光线步进 + 平滑并集；影棚灯条决定金属质感；GPU vs 软件渲染 | SwiftShader 67.9 ms vs Metal 1.9 ms 实测 |
| 09 动态字与转场 | 章节标题砸下 + 三个匹配剪辑串起来 | 砸字、遮罩、逐字；一屏一个完整信息；匹配剪辑（线→时间轴、草图→画面、样帧→全屏）；冲击只给关键几下 | 样片里的三个匹配剪辑 |
| 10 提示词心法与毕业作品 | 本课程所有王炸画面快剪 | 12 种写法速查、去 AI 味禁用清单、先要样帧再要整片、毕业作品流程 | prompt-patterns.md |
