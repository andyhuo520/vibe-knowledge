<div align="center">

# vibe-knowledge · Vibe 知识大赏

**一个知识点 → 一条有旁白、每句有出处的精品知识短片。**<br>
Claude Code skill：选题 → 查证 → 写稿 → 配音 → 代码成片 → 1080p60 → 质检 → 发布包，全程在对话里完成。

[English](README.en.md) · [看样片](#看样片) · [风格库](#风格库44-套--8-个家族) · [听一听](#听一听默认音色与-bgm) · [安装](#安装)

<img src="docs/style-flash.gif" width="720" alt="风格快闪片">

<sub>↑ 风格快闪片节选。完整 42 秒版：<a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/style-flash-42s.mp4">style-flash-42s.mp4</a></sub>

</div>

---

## 看样片

点封面播放（视频放在 [Release v1.0.0](https://github.com/andyhuo520/vibe-knowledge/releases/tag/v1.0.0)）。所有画面都由 Claude Opus 编排、代码逐帧渲染；标「增强」的镜头用 [Renoise](https://renoise.ai/mcp?utm_medium=xcom&utm_source=official) 生成配图和动态镜头，片中都标注「AI 示意」。

<table>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep04b-no-fridge-gufeng.mp4"><img src="docs/posters/ep04b-no-fridge-gufeng.jpg" width="100%"></a><br><b>如果你活在古代没有冰箱（古风版）</b><br><sub>2:05 · 两难选择片 · 古风 · 增强标准档（Wan 3.0 动态镜头）</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep01-shangyang.mp4"><img src="docs/posters/ep01-shangyang.jpg" width="100%"></a><br><b>商鞅立木：搬一根木头赏五十金，你搬不搬？</b><br><sub>2:32 · 两难选择片 · 古风 · 增强档</sub></td></tr>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep01-shangyang-base.mp4"><img src="docs/posters/ep01-shangyang-base.jpg" width="100%"></a><br><b>商鞅立木（基础档，0 积分）</b><br><sub>2:32 · 同一份 film.js，代码插画版</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep01-tiers-compare.mp4"><img src="docs/posters/ep01-tiers-compare.jpg" width="100%"></a><br><b>商鞅立木 · 两档上下对比</b><br><sub>2:32 · 基础档 vs 增强档，旁白和脚本完全一样</sub></td></tr>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep02-paper-to-moon.mp4"><img src="docs/posters/ep02-paper-to-moon.jpg" width="100%"></a><br><b>一张纸折多少次能到月球</b><br><sub>1:10 · 猜谜概念片 · 深色数学 + 尺度穿越 · 增强标准档</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep03-money-laundering.mp4"><img src="docs/posters/ep03-money-laundering.jpg" width="100%"></a><br><b>什么是洗钱</b><br><sub>1:31 · 痛点原理片 · 半调拼贴 · 增强轻档</sub></td></tr>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep04-no-fridge.mp4"><img src="docs/posters/ep04-no-fridge.jpg" width="100%"></a><br><b>如果你活在古代没有冰箱</b><br><sub>3:12 · 猜谜概念片 · 星空光点 · 基础档 0 积分（同一选题的另一种讲法）</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep05-rocket.mp4"><img src="docs/posters/ep05-rocket.jpg" width="100%"></a><br><b>火箭怎么飞上天</b><br><sub>1:46 · 猜谜概念片 · 蓝图专利图 · 增强标准档</sub></td></tr>
</table>

**风格样片集**（每套风格演同一段「商鞅立木」开场，方便横向比较）：

- [最早 7 套（古风、星空光点、暗金线描、水墨纸本、像素、字幕新闻、视觉调查）](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-01-core7.mp4)
- [剪辑与纪实](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-02-edit-doc.mp4)
- [补空白家族 8 套](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-03.mp4)
- [增强档：敦煌、青花、木刻、半调拼贴](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-04-enhanced.mp4)
- [第五批 8 套](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-05.mp4)
- [第六批 8 套](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-06.mp4)
- [增强档：长卷、铜版博物](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-07-enhanced.mp4)
- [田园像素](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-08-farm-pixel.mp4)
- [第九批 5 套](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-09.mp4)
- [手绘过程（手 + 笔画给你看）](https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/styles-10-sketch.mp4)

## 风格库：44 套 · 8 个家族

<img src="docs/style-wall.jpg" alt="44 套风格">

| 家族 | 数量 | 风格（点开看 STYLE.md：配色、字体、镜头语言、适合的选题） |
|---|---|---|
| 东方 | 7 | [古风](skills/vibe-knowledge/styles/gufeng/STYLE.md)、[水墨纸本](skills/vibe-knowledge/styles/paper/STYLE.md)、[敦煌壁画](skills/vibe-knowledge/styles/dunhuang/STYLE.md)（增强）、[青花](skills/vibe-knowledge/styles/qinghua/STYLE.md)（增强）、[木刻](skills/vibe-knowledge/styles/woodcut/STYLE.md)（增强）、[留白极简](skills/vibe-knowledge/styles/minimal/STYLE.md)、[长卷](skills/vibe-knowledge/styles/scroll/STYLE.md)（增强） |
| 暗场概念 | 7 | [星空光点](skills/vibe-knowledge/styles/starfield/STYLE.md)、[暗金线描](skills/vibe-knowledge/styles/darkgold/STYLE.md)、[深色数学](skills/vibe-knowledge/styles/darkmath/STYLE.md)、[霓虹赛博](skills/vibe-knowledge/styles/neon/STYLE.md)、[发布会极简](skills/vibe-knowledge/styles/keynote/STYLE.md)、[极光](skills/vibe-knowledge/styles/aurora/STYLE.md)、[装饰艺术金线](skills/vibe-knowledge/styles/deco/STYLE.md) |
| 游戏 | 4 | [像素](skills/vibe-knowledge/styles/pixel/STYLE.md)、[RPG 对话框](skills/vibe-knowledge/styles/rpg/STYLE.md)、[卡牌对战](skills/vibe-knowledge/styles/cards/STYLE.md)、[田园像素](skills/vibe-knowledge/styles/farm/STYLE.md) |
| 剪辑与纪实 | 5 | [字幕新闻](skills/vibe-knowledge/styles/caption-news/STYLE.md)、[视觉调查](skills/vibe-knowledge/styles/investigation/STYLE.md)、[复古桌面](skills/vibe-knowledge/styles/desktop/STYLE.md)、[档案灯台](skills/vibe-knowledge/styles/lighttable/STYLE.md)、[电视新闻包装](skills/vibe-knowledge/styles/tvnews/STYLE.md) |
| 明亮流行 | 5 | [综艺花字](skills/vibe-knowledge/styles/variety/STYLE.md)、[孟菲斯波普](skills/vibe-knowledge/styles/memphis/STYLE.md)、[手账涂鸦](skills/vibe-knowledge/styles/journal/STYLE.md)、[蒸汽波](skills/vibe-knowledge/styles/vapor/STYLE.md)、[黏土卡哇伊](skills/vibe-knowledge/styles/clay/STYLE.md) |
| 图解与设计 | 8 | [粉笔黑板](skills/vibe-knowledge/styles/chalk/STYLE.md)、[蓝图专利图](skills/vibe-knowledge/styles/blueprint/STYLE.md)、[等轴测剖面](skills/vibe-knowledge/styles/isometric/STYLE.md)、[瑞士网格动态字](skills/vibe-knowledge/styles/swiss/STYLE.md)、[地铁线路图](skills/vibe-knowledge/styles/metro/STYLE.md)、[象形统计](skills/vibe-knowledge/styles/isotype/STYLE.md)、[铜版博物](skills/vibe-knowledge/styles/copper/STYLE.md)（增强）、[手绘过程](skills/vibe-knowledge/styles/sketch/STYLE.md) |
| 印刷与纸 | 5 | [孔版印刷](skills/vibe-knowledge/styles/riso/STYLE.md)、[半调拼贴](skills/vibe-knowledge/styles/collage/STYLE.md)（增强）、[剪报拼字](skills/vibe-knowledge/styles/ransom/STYLE.md)、[杂志编辑](skills/vibe-knowledge/styles/editorial/STYLE.md)、[国家公园海报](skills/vibe-knowledge/styles/poster/STYLE.md) |
| 电影感 | 3 | [剪影片头](skills/vibe-knowledge/styles/titles/STYLE.md)、[默片字卡](skills/vibe-knowledge/styles/silent/STYLE.md)、[构成主义蒙太奇](skills/vibe-knowledge/styles/constructivist/STYLE.md) |

「增强」= 需要 Renoise 生图（约 8 积分 / 段），其余全部代码生成、0 积分。给出选题后，`recommend.py` 会推荐 3 套风格；你也可以从空白开始定一套自己的风格（`references/09-style-studio.md`）。

## 听一听：默认音色与 BGM

| 音频 | 说明 |
|---|---|
| [default-voice-demo.m4a](docs/audio/default-voice-demo.m4a) | 默认配音音色「科技博主沉稳男声」，小米 MiMo 音色设计生成的 AI 声音，不是真人；快节奏，5.5–6 字/秒 |
| [mix-demo-voice-plus-bgm.m4a](docs/audio/mix-demo-voice-plus-bgm.m4a) | 成片混音效果：旁白 + 默认 BGM + 音效（第 04 期 B 版开头 24 秒） |
| [vibe-bgm.m4a](skills/vibe-knowledge/assets/music/vibe-bgm.m4a) | 默认 BGM（112.9 BPM，160 秒），每条视频都会用 |

**BGM 是强制的**：混音时如果 film.js 没放 BGM，会按片长自动裁一份补上；别的整段配乐会被停用；音量统一校准到「说话时比人声低 10 dB」。只有用户明确要求换曲才换（音乐条目写 `bgm: true, user_request: "用户原话"`）。

## 它怎么做一期

| 段 | 做什么 |
|---|---|
| ① 选题 | 3 秒内能不能让人先猜 / 先选？有没有贯穿全片的道具？有没有反转？ |
| **确认 1** | 选题、6 种母版之一、**时长**（按复杂度给四档：速览 / 精讲 / 标准 / 深挖，每档写清能讲多细、要砍掉什么）、风格、档位 |
| ② 查 | 事实清单 `facts.md`：每个数字、人名、年份、引文都有出处；说法有分歧时两说并列 |
| ③ 写 | 按母版写旁白 → 子 agent 对抗审查（钩子、出处、字数）→ 改 |
| **确认 2** | 看旁白稿 + 分镜（增强档附带镜头清单和 Renoise 报价），同意后才生成 |
| ④ 配音 | MiMo 克隆音色 + 逐字对齐 + 回读校验 + 人声后期 |
| ⑤ 编 | `film.js`：组件库 `know.js`（配图推拉、逐帧视频、关键词、计数器、竖排古文、出处脚注、两难按钮、印章、线稿剖面图…）|
| ⑥ 渲 | 1080p60 逐帧录制 → 混音（强制 BGM、按人声校准）→ 封面接成开头帧 |
| ⑦ 质检 | 接触表 + OCR 回读对照 facts.md + 响度 + 冻结检测 + BGM 检测 |
| **确认 3** | 看成片 → 发布包（标题、话题、简介、封面） |

**两档制作**：基础档 0 积分（Opus 手写 SVG 分层插画、粒子、数据组件）；增强档只把代码做不好的镜头（写实场景、最需要被记住的 1–3 个时刻）交给 Renoise，每次先报价、你同意了才生成。同一份 film.js 两档通用。

**六种母版**：猜谜概念片、两难选择片、痛点原理片、一条主线片、闯关片、六面轮转片（`references/01-templates.md`）。

## 安装

```bash
git clone https://github.com/andyhuo520/vibe-knowledge.git
cp -R vibe-knowledge/skills/vibe-knowledge vibe-knowledge/skills/ai-teardown ~/.claude/skills/
```

- `vibe-knowledge` 是本体；`ai-teardown` 提供 cine 渲染引擎、建工作区和配音脚本，两个都要装。
- 渲染用的 Python：`python3 -m venv ~/.venvs/cine && ~/.venvs/cine/bin/pip install numpy scipy pillow playwright && ~/.venvs/cine/bin/python -m playwright install chromium-headless-shell`，再 `export CINE_PY=~/.venvs/cine/bin/python`。
- `ffmpeg`；OCR 质检用 macOS 自带的 Vision（需要 `swiftc`）。
- 配音：小米 MiMo，密钥放 `MIMO_API_KEY` 环境变量或 `~/.config/ai-teardown/mimo.env`（**不要写进项目文件**）。默认音色是仓库自带的 AI 声音；想用自己的声音：`new_film.py --voice-ref 你的录音.wav`（只用你本人或已获授权的声音）。
- 增强档（可选）：[Renoise MCP](https://renoise.ai/mcp?utm_medium=xcom&utm_source=official)。

然后在 Claude Code 里说：

> 做一期知识大赏：为什么假账总被数字 1 出卖？

第一次用会先打开本地「风格图鉴」，介绍母版、风格和档位。

## 目录

```
skills/vibe-knowledge/   本体：SKILL.md、references/（14 份规范与踩坑）、styles/（44 套风格）、kit/know.js、tools/、templates/、assets/（默认 BGM、默认音色）
skills/ai-teardown/      cine 引擎（three.js 逐帧渲染）、字体、图标集、建工作区和配音脚本
docs/                    README 用的封面、风格墙、动图、试听音频
```

## 许可

代码以 [MIT](LICENSE) 开源。示例视频、AI 生成的配图和动态镜头、默认 BGM 与默认音色的说明见 [NOTICE.md](NOTICE.md)；第三方组件见 [THIRD_PARTY.md](THIRD_PARTY.md)。

作者 [@Berryxia](https://x.com/berryxia) · 用 Claude Code（Claude Opus）编排制作
