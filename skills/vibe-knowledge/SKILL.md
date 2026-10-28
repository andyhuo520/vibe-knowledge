---
name: vibe-knowledge
description: 「Vibe知识大赏」精品知识短片工作室：一个知识点 → 一条 45 秒～5 分钟、有旁白、每句有出处的精品知识短片（抖音 #Vibe知识大赏 / 知识区）。从 15 条爆款反推出的 6 种脚本母版（猜谜概念片、两难选择片、痛点原理片、一条主线片、闯关片、六面轮转片）→ 带出处的事实清单 → 旁白稿 + 对抗审查 → 用户本人克隆音色配音（小米 MiMo，限免）→ 两档画面：基础档 0 积分（Opus 手写 SVG 分层插画、粒子、数据组件、默认 BGM 按片长裁剪）/ 增强档按镜头挑用 Renoise（Midjourney/GPT Image 配图、Wan 3.0/Seedance 2.5 动态镜头、ElevenLabs 音效，先报价后生成）→ cine 代码成片（配图推拉、逐帧视频、关键词、计数器、地图扩散、光轨、竖排古文、出处脚注、两难按钮）→ 1080p60 逐帧渲染 → OCR 回读质检 → 发布包（标题、话题、封面、简介）。触发：做一期知识大赏 / Vibe知识大赏 / 知识科普短片 / 把这个概念做成知识视频 / 像电子智人、Iwanau、墨有意思那样 / 如果你活在古代那种 / 一口气讲清楚某个原理。不用于：系列课（ai-teardown）、财经口播（finance-explainer）、品牌宣传片（promo-video）、数字人出镜口播（digital-human-koubo）。
---

# Vibe知识大赏 · 精品知识短片工作室

一期 = 一个知识点 → 一条有旁白的精品短片（默认 16:9 1080p60）。**时长由用户定**：先按复杂度给四档建议（速览 / 精讲 / 标准 / 深挖），每档写清能讲多细、要砍什么（references/13-duration.md）。
引擎复用 ai-teardown 的 **cine**（旁白驱动的 `seek(t)` 代码成片），本 skill 加四样东西：**6 种脚本母版**（讲法）、**风格库**（长相 + 讲法，`styles/`，44 套 · 8 个家族已验证（每个家族至少 3 套） + 用户自己的风格）、**知识片组件库 know.js**、**Renoise 增强层**（图 / 视频 / 配乐 / 音效）。

一期 = **母版 × 风格 × 手法（≤2）× 档位**。风格分 8 个家族：东方、暗场概念、明亮流行、印刷与纸、图解与设计、剪辑与纪实、电影感、游戏；其中敦煌壁画、青花、木刻、半调拼贴、长卷、铜版博物是增强档风格（每段约 2 张生图）。风格可以用库里的、改成自己的、或从空白做（references/09-style-studio.md）。

**两档制作**（references/08-tiers.md）：
- **基础档 · 0 积分**：Opus 手写 SVG 分层插画 + 粒子 / 3D + 数据组件，小米 MiMo 配音（限免），**默认 BGM**（见下），**earshot 代码音效**（references/10-earshot.md，两档通用）。
- **增强档 · 按镜头挑**：只把代码做不好的镜头（写实场景、最需要被记住的 1–3 个时刻、真实运动）交给 Renoise，其余照样代码。轻 ≈25–40 / 标准 ≈250–300 / 旗舰 ≈600–700 积分，每次先报价再生成。
- 同一份 film.js 两档通用（`ENH` 开关：plate/vclip ↔ layers）。

## BGM（强制，2026-10-28 起，两档通用）

**每条视频都必须有这首 BGM，音量统一**（用户规定）。**唯一例外：用户在对话里明确要求换曲**——那条音乐写 `bgm: true, user_request: "用户原话"`，它就当 BGM，vibe-bgm 让位，音量照样校准；没写原话的一律不认。强制在混音环节完成：finish.py 打了 `bgm_force.py` 钩子——film.js 没放 BGM 就自动按片长补上；其他 ≥20 秒的整段配乐（Lyria、曲库）一律停用；BGM 音量不看 film.js 写的 gain，统一校准到「说话时比人声低 10 dB」（用户要求音量高一点；停顿处自动抬起约 2–4 dB），gain_curve 只保留起伏形状。qa.py 会检测成片里有没有这首 BGM，没有就报 ⚠⚠，不能交付。

所有知识大赏默认用同一首 BGM：`assets/music/vibe-bgm.m4a`（用户指定，112.9 BPM，160 秒，节拍网格在同名 .json）。配音定稿后一条命令按片长裁好，切点都在小节线上，开头照原曲、结尾接原曲的自然淡出，片子更长时按 8 小节循环：

```bash
$CINE_PY ~/.claude/skills/vibe-knowledge/tools/fit_bgm.py $L/assets/audio/bgm.wav --lesson $L --tail 3   # 总长 = 旁白 + 尾卡
# 同时输出 bgm.beats.json（成片里每一拍 / 每一小节的秒数），film.js 想卡点就读它
```

film.js 里：`music.push({ src: P("audio/bgm.wav"), from: 0, at: 0, dur: END + TAIL, gain_curve: [[0, -11], [END, -11], [END + TAIL, -8]], fade_in: 0.3, fade_out: 1.8 })`（旁白段 finish.py 会自动再压低）。
不再生成 Lyria 整段配乐（生成了也会被强制停用）；Renoise 只用来做短音效。

## 首次使用与风格推荐（先做这一步）

- **首次使用**（`~/.vibe-knowledge/welcomed` 不存在）：先跑 `python3 ~/.claude/skills/vibe-knowledge/tools/welcome.py`，生成并打开本地「风格图鉴」（`~/Desktop/vibe-knowledge/风格图鉴/index.html`：风格快闪片、样片集、按家族分组的风格卡、三种开口方式、两档、流程），然后在对话里用 5–6 句话介绍：母版 × 风格 × 档位、8 个家族各举一两套、三种开口方式，最后问「想先做哪个选题？」。风格库更新后用 `--force` 重新生成。
- **用户给了选题**：先跑 `python3 ~/.claude/skills/vibe-knowledge/tools/recommend.py "<选题>"`，拿到 3 套推荐后用 AskUserQuestion 问（推荐第一的排第一、标「（推荐）」、description 写理由和搭配母版；preview 写一句画面描述和风格图路径），同时用 SendUserFile 把 3 张风格图发给用户对照。用户点名了风格就跳过推荐。推荐到增强档风格时，在选项 description 里写明「需生图，约 8 积分/段」。
- 风格目录的唯一来源是 `styles/catalog.json`（推荐、图鉴、快闪片都读它）；加新风格时同步 catalog.json、STYLE.md、still.jpg。

## 核心主张（不能丢）

1. **精品标准是硬门槛**（references/02-premium.md）：三层构图、没有静止超 3 秒的画面、每章一个「王炸」镜头（增强档 Renoise 动态镜头 / 基础档代码粒子、视差）、分层声音、整期一个视觉系统。
2. **没出处不上屏**：数字、人名、年份、引文全部进 facts.md；示意画面标明；分歧两说并列。
3. **旁白讲故事，画面给关键词**：画面字 ≤8 字一组、同屏最多两组；整句交给旁白和自动字幕。
4. **先猜后讲、标题延后、一个主道具贯穿、结尾回问**（母版共用规则，references/01-templates.md）。
6. **旁白对位硬规则**：没念到不露面、计数在念到时落定、强调有预算、最长静止 ≤3 秒（references/11-absorbed.md 第一节）。
5. **能代码就代码，花积分先确认**：Renoise 只补代码做不好的镜头；所有生成先列表报价，用户在对话里明确同意才提交（references/04-renoise.md、08-tiers.md）。配音用小米 MiMo（限免）。

## 工作区

```bash
python3 ~/.claude/skills/vibe-knowledge/tools/new_film.py <期号> --template A --title "本福特定律"
#   默认工作区 ~/Desktop/vibe-knowledge、系列 vk；第一次会自动建 cine 系列、装 know.js、给录制工具打补丁、放用户克隆音色
S=~/Desktop/vibe-knowledge/examples/vk; L=$S/lessons/<期号>
```

依赖：ai-teardown skill（cine 引擎、make_lesson 配音）、`CINE_PY`（numpy scipy pillow playwright 的 Python；本机是 `/usr/local/bin/python3.12`，跑之前 `PYTHONPATH=` 清空，否则会加载坏掉的 PIL）、MiMo 密钥 `~/.config/ai-teardown/mimo.env`、Renoise MCP（只有增强档需要；缺的话按 references/04-renoise.md「接入 Renoise」一节引导，注册链接原样给 https://renoise.ai/mcp?utm_medium=xcom&utm_source=official ）、ffmpeg、swiftc（OCR）。

## 流水线（三个确认点）

| 段 | 做什么 | 产出 |
|---|---|---|
| ① 选题 | 三问：能不能让人 3 秒内先猜 / 先选？有没有贯穿道具？有没有反转？给用户 3–5 个候选 + 推荐母版 | 选题 |
| **确认 1** | 用户选题、母版、**时长**（先跑 `duration.py` 按复杂度给四档，推荐档排第一；用户选的档跟复杂度差两级以上要提醒）、**风格**（库里的 / 我的 / 改一套 / 从空白，见 09-style-studio.md；推荐项排第一附风格图）、**做哪一档**（基础 / 增强轻 / 标准 / 旗舰） | |
| ② 查 | 事实清单（T1/T2/T3 分级、原文摘录、用在哪拍） | `facts.md` |
| ③ 写 | 按母版骨架写旁白（字数上限见骨架 `_guide`）→ 子 agent 对抗审查（钩子、出处、字数）→ 改 | `narration.json` |
| ④ 分镜 / 资产单 | 每拍画面分镜（标明哪些镜头代码做、哪些增强）；增强档写 assets.json + estimate_cost 报价；基础档选曲 | `assets.json` |
| **确认 2** | 用户看旁白稿 + 分镜（+ 增强镜头清单和报价），明确同意后才生成 | |
| ⑤ 生成 | 增强档：Renoise 先图 + 音效 → 用户挑图 → 视频（首帧用选中的图）→ 下载、改名、clip2frames。基础档跳过 | `assets/` |
| ⑥ 配音 + 配乐 | 先出 15–20 秒开场试听让用户定音色和语速 → `tts_mimo.py --gap 0.2` → `speed.py` → `check_timings.py` → `voice_post.py` → `fit_bgm.py` 按片长裁默认 BGM | `build/timings.json`、`assets/audio/bgm.wav` |
| ⑦ 编 | film.js（know.js 组件）→ stills.py 接触表逐张看（含动画中途帧） | `stills/` |
| ⑧ 渲 | queue.sh（record → finish → deliver） | 成片 |
| ⑨ 质检 | `qa.py` 接触表 + OCR 回读对照 facts.md + 响度；接触表里整段画面不变 = 录制出事，重录 | `qa/` |
| **确认 3** | 用户看成片；改完出发布包，封面用 `cover_first.py` 接成开头帧 | `post.txt`、封面 |

## 常用命令

```bash
cd ~/Desktop/vibe-knowledge; S=examples/vk; L=$S/lessons/<期号>
python3 scripts/tts_mimo.py $L/narration.json $L/build --gap 0.2 --lead 0.3 --qa --jobs 2 > $L/voice.log 2>&1   # 配音 + 逐字对齐 + 回读（拍间只留 0.2 秒，别用 make_lesson 默认的 0.8）
python3 scripts/speed.py $L 1.1                                        # 需要时整体提速，目标 5.5–6 字/秒
(cd $S && python3 tools/check_timings.py <期号>)                       # 对齐有没有断
python3 ~/.claude/skills/vibe-knowledge/tools/voice_post.py $L         # 人声后期（克隆音色定稿那条 EQ + 压缩）
python3 ~/.claude/skills/vibe-knowledge/tools/clip2frames.py $L/assets/clips/v01.mp4 $L/assets/clips/v01   # 视频拆帧 → 打印帧数
cd $S && $CINE_PY cine/tools/stills.py <期号> lessons/<期号>/stills/sheet.png 1 B01+1 B02.title B05.count+0.5 …
echo "<期号>|<片名>|<封面秒>" >> cine/queue.txt   # 只能追加！queue.txt 多会话共用
pgrep -f cine/tools/queue.sh || CINE_PY=$CINE_PY cine/tools/queue.sh   # 已有队列在跑就别再起第二个，否则两路录制写坏同一个 picture.mp4
python3 ~/.claude/skills/vibe-knowledge/tools/qa.py lessons/<期号>/build/lesson<期号>.mp4
python3 ~/.claude/skills/vibe-knowledge/tools/cover_first.py <成片.mp4> cover_16x9.jpg <交付.mp4>   # 封面接成开头帧（0.5 秒），每期交付必做
```

voice.log 里回读 <95% 的拍删掉 `build/audio/<拍>.*` 重配；专名用 lexicon 写读音。

## 参考文件

| 文件 | 内容 |
|---|---|
| references/01-templates.md | 6 种母版（有旁白版）：每拍做什么、画面、对标作品 |
| references/02-premium.md | 精品标准：画面、声音、内容、交付规格（交付前逐条过） |
| references/03-visual-systems.md | 5 套视觉系统 + Renoise 画风前缀 + 时代拼贴 |
| references/04-renoise.md | Renoise 增强层：单价、预算、流程、提示词写法、安全 |
| references/05-publish.md | 发布包：活动标题规则、话题、封面、简介、交付文件夹 |
| references/06-benchmarks.md | 对标作品数据与共性 |
| references/07-kit.md | know.js 组件 API |
| references/09-style-studio.md | 风格工作室：四个入口、一题一问（推荐排第一 / 你定 / 自由对话）、三分法、汇总 → 风格图 → demo → 固化到 ~/vibe-knowledge-styles/ |
| styles/INDEX.md | 风格库目录：44 套按 8 个家族分组（每套 STYLE.md + still.jpg，样片源码 styles/_samples/） |
| references/13-duration.md | 时长与拆解细腻度：五项复杂度打分、四档时长（字数 / 拍数 / 细腻度 / 能讲到 / 要砍掉）、推荐规则、不匹配提醒、封面停留时长 |
| references/14-pitfalls.md | 制作踩坑清单（按环节）：渲染队列共用、AI 器物图结构错、配音对齐断、Wan 下载失败、CSS 清底色、AAC 峰值… |
| references/12-style-families.md | 风格家族与扩充路线：为什么 7 套显得单薄、风格 × 手法两条轴、87 种 UI 风格的取舍表、从 promo-video 借了什么、增强档风格踩坑（MJ 画成器物、年代词带偏服饰、ESRGAN 分块错位、画布等解码、Vision 投影） |
| references/10-earshot.md | earshot 代码音效（252 个，MIT，0 积分）：安装、film.js 写法、知识片角色→音效对照表、对齐时机 |
| references/11-absorbed.md | 吸星大法：14 个开源同类项目的旁白对位规则、9 种解说语法、结构与发布技巧、质检流程、12 个新风格候选、Vox 纸拼贴做法、许可证边界 |
| references/08-tiers.md | 两档制作：基础档 0 积分怎么做到精品、增强档怎么挑镜头、预算、两档通用写法 |
| templates/narration/A–F.json | 6 个母版的旁白骨架（每拍字数上限、[[cue]]） |
| templates/film.skeleton.js | film.js 骨架（配乐、音效、冷开场、尾卡写法） |
| templates/facts.md / assets.json | 事实清单、Renoise 资产清单模板 |
| tools/ | new_film.py、clip2frames.py、voice_post.py、qa.py（+ ocr.swift）、recommend.py（按选题推荐风格）、welcome.py（首次介绍图鉴）、style_reel.py（新风格样片集的时间轴 + 旁白）、vision_layers.swift（生图拆主体层 / 底层）、earshot_render.py / patch_earshot.py（代码音效）、fit_bgm.py（默认 BGM 按片长按小节裁剪 / 循环 + 节拍表）、cover_first.py（封面接成开头帧）、duration.py（按复杂度给时长建议）；qa.py 现在会报 >3 秒的静止画面 |

cine 引擎本身的契约、组件、渲染队列、坑：`~/.claude/skills/ai-teardown/references/10-cine.md`（改引擎前必读）。
