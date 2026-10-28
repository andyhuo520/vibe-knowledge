---
name: ai-teardown
description: 「AI 拆机课」系列课工作室：输入一个主题（AI 产品、开源项目/书、人物历史、软件教程），产出由浅入深、每句话有出处的中文讲解视频系列 + 每节互动版 + 课程总页。流水线：收集资料 → 确认对象与课时 → 大纲 → 逐节旁白（MiMo 克隆音色 + 逐字对齐）→ scenes.json 画面编排（Notion 极简手绘引擎 / 马卡龙模板引擎，IconPark 图标与插画、Noto 动态 emoji、AntV X6 流程图、像素讲解小人、截图圈注、终端录屏）或 film.js 代码成片（cine 引擎：Three.js、粒子、着色器、真片段叠加、曲库配乐）→ Hyperframes / 无头 GPU 逐帧 1080p 渲染 → Artifact 发布 → 课程总页 + 导学视频。触发：做系列课 / 做课程视频 / 把某本书或某个开源项目做成课 / 科普讲解视频 / 教学视频 / 课程地图 / 导学视频 / 互动课件 / 「拆机课」「上手课」「实战课」「编排课」/ 王炸讲解片 / 用真实会话和成片教人做视频。不用于：单支宣传片（用 promo-video）、单张信息图、纯文章写作。
---

# AI 拆机课 · 系列课工作室

一个主题 → 一整套课：每节 4–7 分钟的讲解视频（1080p MP4）、同源的互动版网页（可暂停、点图看出处）、汇总大纲与视频的课程总页，外加 2–3 分钟的导学视频。

已验证的成品（同一套引擎）：
- 第一季「AI 入门课」12 节（马卡龙/薄荷主题，人物历史 + 概念）
- 第二季「AI 实战课：从提示词到 Codex」13 节（真实终端录屏 + 涂鸦讲解）
- 「WorkBuddy 上手课」25 节 + 导学（Notion 极简手绘风，开源书改编，像素讲解小人）
- 「Claude Code 做视频：Opus 5.5 编排课」导学 + 10 节、「Opus 5.5 宣传片实战课」导学 + 8 节 + 行业加餐（cine 代码成片引擎：每帧代码算出、真片段叠加、一次真实会话贯穿全课）

## 核心主张（不能丢）

1. **没出处不上屏**：数字、功能、步骤、引语都要能追到来源；引用逐字、标章节；推断要说「可能」；示意数据写明「示例数据」。
2. **一源双出**：同一份 narration.json + scenes.json 同时出 MP4 和互动版。
3. **由浅入深、一节讲三件事**：开头「这一节讲三件事」，中间至少一个「暂停想一想」，结尾回顾导图 + 预告下一节。
4. **先定再做**：资料、对象、课时、大纲、音色、画风都先给用户确认，再批量生产。
5. **隐私与版权**：截图里的个人信息、二维码、密钥、本机用户名一律裁掉或打码；图标、插画库来源统一在片尾致谢卡标注，书中内容和截图的出处逐处标。

## 工作区

引擎在本 skill 的 `engine/`。先建工作区和系列：

```bash
python3 ~/.claude/skills/ai-teardown/engine/scripts/new_series.py ~/Desktop/<工作区> <系列名> --style sketch --title "课程名"
```

- `--style sketch`：Notion 极简 + 手绘引擎 + 像素讲解小人 + **贴纸风（新课默认，scenes.json 文件头 `"sticker": true`）**（推荐；讲软件、书、开源项目）。
- `--style lesson`：模板编译器（马卡龙/薄荷/夜间主题，擅长人物、时间线、终端录屏）。
- `--style cine`：代码成片引擎（暗场「王炸」画面：粒子、3D 镜头、着色器、动态大字；可叠真实成片片段、曲库配乐；只出视频，不出互动版）。讲 AI 编排、动效、做视频这类「片子本身就是作品」的课，或实战课。细节见 `references/10-cine.md`，实战课做法见 `references/11-practice-course.md`。
- 已有工作区（原始项目在 `~/Desktop/ai-teardown`）直接在里面建系列。
- 课目录必须在工作区之内：`<工作区>/examples/<系列>/lessons/<NN>/`。

环境依赖和一次性配置见 `references/02-pipeline.md` 的「环境」一节（MiMo 密钥、whisper 模型、Playwright、Hyperframes、esbuild、配乐库）。

## 流水线（六段，三个确认点）

| 段 | 做什么 | 产出 | 细节 |
|---|---|---|---|
| ① 查 | 收集资料，按 T1 官方 / T2 权威二手 / T3 社区分级，记事实与出处 | `research/`、`landscape.md` | references/01-workflow.md |
| **确认 1** | 对象、课时、节数、音色（先试听）、画风（先出样片） | `DECISIONS.md` | |
| ② 纲 | 大纲：每节标题、一句引子、简介、要点、时长 → 课程总页草稿 | `series.json` → 课程页 | |
| **确认 2** | 用户看大纲拍板 | | |
| ③ 写 | 每节 narration.json（18–28 拍、1200–2200 字、`[[cue]]` 标记）→ MiMo 配音 + 回读质检 | `build/audio/` | references/03-narration-voice.md |
| ④ 编 | scenes.json 画面编排 → check_scenes → build 接触表逐帧看 | `build/stills/scenes.png` | references/04, 05 |
| ⑤ 渲 | 串行渲染队列 → 抽帧质检 | `hf/renders/lessonNN.mp4` | references/02-pipeline.md |
| ⑥ 发 | 互动版 Artifact、课程总页（>64MB 分批发）、导学视频、本地视频汇总文件夹 | 链接 + 文件夹 | references/02-pipeline.md |
| **确认 3** | 第 1 节成片给用户看，按反馈改模板后再批量 | | |

批量时用多智能体：每个助手按系列目录里的 `BRIEF.md` 做一节的「旁白 + 配音 + 编排」（不渲染、不发布、不改引擎代码），主会话负责质检、排渲染、发布。一次开 3 个助手。BRIEF 模板见 `references/brief-template.md`（cine 系列用 `templates/series-cine/BRIEF.md`）。

cine 系列的编排和渲染换成：写 `lessons/NN/film.js` → `cine/tools/stills.py` 看接触表 → `cine/queue.txt` + `cine/tools/queue.sh`（clips → record → finish → deliver），命令见 `references/10-cine.md`。

## 常用命令（在工作区根目录跑）

```bash
L=examples/<系列>/lessons/NN
python3 scripts/make_lesson.py $L voice > $L/voice.log 2>&1   # 配音 + whisper 对齐 + MiMo 回读
python3 scripts/check_scenes.py $L                              # 场景自检
rm -rf $L/build/stills && python3 scripts/make_lesson.py $L build   # 编排 + 接触表
echo NN >> examples/<系列>/render.queue                         # 排进渲染队列（runner 见 02-pipeline）
python3 scripts/sketch_publish_files.py $L                      # 算互动版要上传的文件
python3 scripts/course_page.py examples/<系列>/series.json examples/<系列>/publish/course
```

## 质检门（每节都过）

- voice.log：回读 < 95% 或出现「⚠ 可疑读数」的拍，删 `build/audio/<拍>.*` 重合成；专名、缩写用 whisper-cli 复听确认。
- 接触表 + 可疑单帧：文字溢出/重叠、圈注对不准、空屏、小人挡字、出处小字被压。
- 成片抽 6 帧拼图再看一遍才发布。
- 清单全文见 `references/07-qa-checklist.md`；踩过的坑见 `references/08-pitfalls.md`（改引擎前必读）。

## 参考文件

| 文件 | 内容 |
|---|---|
| references/01-workflow.md | 六段流程、确认点怎么问、多智能体分工、课程地图/导学视频 |
| references/02-pipeline.md | 目录结构、环境依赖、make_lesson 三段、渲染队列、发布与课程页、视频汇总 |
| references/03-narration-voice.md | 旁白写法、MiMo 配音与克隆、lexicon、回读质检、英文版 |
| references/04-scenes-sketch.md | 手绘引擎（Notion 皮肤）全部模板与字段、讲解小人、镜头 |
| references/05-scenes-lesson.md | 模板编译器（第一、二季）模板、终端录屏、涂鸦 |
| references/06-visual-assets.md | 图标、插画、Noto 动态 emoji、X6、截图导入与账本、署名规则 |
| references/07-qa-checklist.md | 发布前质检清单 |
| references/08-pitfalls.md | 已踩过的坑与修法 |
| references/09-safety.md | 隐私、版权、密钥、录屏打码规矩 |
| references/10-cine.md | cine 代码成片引擎：目录、环境、film.js 契约、组件与场景、片段与曲库配乐、渲染队列、质检、坑 |
| references/11-practice-course.md | 实战课做法：作品墙只用最终版本、真实会话录制与用量、行业概念片（合规）、加餐拆片课、课程页 |
| references/brief-template.md | 给助手的「做一节课」说明模板 |
| references/design/ | 原始设计文档 00–09（数据契约、场景契约、原语、视觉系统、教学法、信源、质检门） |
| templates/series-sketch/ | Notion 手绘系列的 BRIEF、SCENES_GUIDE、series.json 示例、两节成品课（第 17 节、导学） |
| templates/series-lesson/ | 模板编译器系列的 BRIEF、DECISIONS、series.json 示例、一节成品课 |
| templates/series-cine/ | cine 系列的 BRIEF 模板、四份真实用过的说明（编排课、宣传片实战课、行业概念片、加餐拆片课）、两节成品 film.js、check_timings / update_series、真实会话录制工具 |
| engine/cine/ | cine 引擎本体（new_series.py --style cine 拷进系列目录） |
| presets/ | 像素讲解小人 10 动作 × 8 帧（+账本、生图提示词）、锁定的克隆音色参照 |
