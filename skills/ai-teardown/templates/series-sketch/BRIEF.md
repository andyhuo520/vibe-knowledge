# WorkBuddy 上手课 · 做一节课的完整说明（给助手看）

仓库根目录：`~/Desktop/ai-teardown`（下面的命令都在这里跑）。系列目录：`examples/workbuddy`。
**先读**：`examples/workbuddy/SCENES_GUIDE.md`（模板和字段），再看两节成品做参照：`lessons/03/narration.json`、`lessons/03/scenes.json`（最新、效果最全），`lessons/02/scenes.json`。

## 内容来源与底线
- 内容只来自开源《WorkBuddy 实战蓝皮书》对应章节：`examples/workbuddy/source/docs/bluebook/<篇>/<章>/index.md`（MIT，可引用，画面标出处）。
- **不编造**：数字、价格、功能、界面文字、步骤都以原文为准；原文没写的不要补。引用原文要逐字，quote 模板 `from` 写「《WorkBuddy 实战蓝皮书》第 N 章」。
- 原文里的个人二维码、个人联系方式、群号、邀请码、账号密钥（AppID/Secret/Token）一律不上画面；截图里出现密钥的要么不用、要么用 crop 裁掉。
- 涉及授权、密钥、对外发消息的步骤，按原文提醒安全边界；讲解小人可以加一句简短的安全提醒（tips，pose 用 "stop"），但不要替作者发表观点。
- 章节很长时（1 万字以上）：挑最核心的 3 块讲清楚，不追求全覆盖；案例类章节讲「场景 → 用了什么（Skill/专家/连接器）→ 怎么说任务 → 结果和验收」。

## 旁白 narration.json
- `voice` 整段照抄 `lessons/03/narration.json` 的 voice（MiMo 克隆音色 + 讲课语气），`lexicon` 按需加（英文缩写全大写且只含 I V X L C D M 的会被自动拆字母，不用管；版本号写成「0 点 1 点 2」）。
- 18–28 拍，全节 1200–2200 字（1.15 倍速后 4–7 分钟）。每拍 40–130 字，每拍 2–4 个 `[[cue]]`（小写英文/数字/下划线，放在分句开头）。
- 口语、短句、第二人称；开头一句接上一节（「上一节我们……」），结尾预告下一节 + 感谢蓝皮书作者 + 「我们下节见」。
- 至少一个「暂停想一想」（一拍提问，下一拍 `[[answer]]` 揭晓）。

## 画面 scenes.json
- 文件头：`{"n": N, "title": "…", "series": "WorkBuddy 上手课", "theme": "paper", "engine": "sketch", "skin": "notion", "presenter": "hp", "sticker": true, "speed": 1.15, "author": "@Berryxia", "scenes": [...]}`
- **贴纸风是默认**：文件头写 `"sticker": true`（卡片=白边贴纸带倾斜按上去、插画=模切白边、卡片里的 Noto emoji 也描白边）；个别页不想要贴纸写 `"style": "card"`（stickers）或 `"illusSticker": false`。
- 每节必须用到：cover（带 `iconImg: "host-avatar"` 和一张 `illus`）、至少 1 个 kinetic 金句、1 个 pan（「这一节讲三件事」）、pause、recap、outro；截图讲操作时用 shot + marks 圈注；有流程/分工/数据流转时用 diagram（X6）；有情境时用 say + illus 插画。
- 图标：流程、清单、界面说明用 IconPark（`icon-park:名字`，名字须在 `assets/iconsets/icon-park.json` 里）；情绪、主角物件用 Noto（`robot` 这类，先跑 noto_emoji.py）。
- 插画：`assets/illustrations/iconpark/catalog.json` 有 88 张（id、专辑、名字），挑合适的用 `python3 scripts/illus.py examples/workbuddy/lessons/NN ip-x-y …`。每节 2–4 张，别重复前几节已经用过的同一张（03 用了 ip-17-232、ip-2-12、ip-14-187）。
- 小人动作 pose：talk wave point idea think stop check cheer thumbsup type（默认：shot→point、pause→think、checklist→check、outro→wave）；outro 写 `"pose": "cheer"`，tips 里「我们下节见 👋」用 wave。
- outro 的 credits：内容与截图（第 N 章 MIT + 仓库地址）/ 插画 IconPark 插画库（字节跳动）· 图标 IconPark、Noto Emoji / 流程图 AntV X6 · lottie-web · rough.js / 讲解小人 @Berryxia 像素头像 · 配音 小米 MiMo（AI 生成）。每行别超过 40 个汉字。图标、插画库的来源只在这张片尾卡标注，场景里不要再写「插画：IconPark…」之类的小字（runtime 已默认关闭插画下方出处）；书中内容和截图的出处照常标。
- 截图圈注的 area 是原图比例 [x0,y0,x1,y1]：先打开 `build/chapter_sheet.jpg` 看缩略，再用 Read 打开 `examples/workbuddy/assets/img/<id>.png` 原图估坐标，build 后看接触表确认对准。

## 步骤（每一步都要做）
1. 读章节原文和配图总览：
   `python3 scripts/wb_import.py examples/workbuddy/lessons/NN "第 X 章 ……"`（章节目录名照抄；导入截图 wbNN-01…、GIF 变成 clip，并生成 `build/chapter_sheet.jpg`）
2. 写 `narration.json`，开始配音（会排队重试，慢是正常的）：
   `python3 scripts/make_lesson.py examples/workbuddy/lessons/NN voice > examples/workbuddy/lessons/NN/voice.log 2>&1`
   配完看 voice.log：每拍「回读」低于 95%，或出现「⚠ 可疑读数」的，删掉 `lessons/NN/build/audio/<拍号>.*` 再跑一次 voice（只会重合成这几拍）。
3. 准备素材：`python3 scripts/noto_emoji.py examples/workbuddy/lessons/NN robot light-bulb …`；`python3 scripts/illus.py examples/workbuddy/lessons/NN ip-…`
4. 写 `scenes.json`，自检：`python3 scripts/check_scenes.py examples/workbuddy/lessons/NN` 到没有报错（「只有 x 秒」也要修）。
5. 编排：`rm -rf examples/workbuddy/lessons/NN/build/stills && python3 scripts/make_lesson.py examples/workbuddy/lessons/NN build`
   用 Read 看 `lessons/NN/build/stills/scenes.png`，再逐张看可疑的单帧（`scenes-XXX.XX.png`）：文字溢出/重叠、圈注没对准、截图太小看不清、空屏、小人挡字。改 scenes.json 重来，直到满意。
6. **不要**跑 final（渲染）、不要发布、不要改 `runtime/ primitives/ scripts/` 下的代码、不要改 `series.json` 和别的课目录。模板有 bug 或缺功能就写进回报。

## 回报（最后一条消息）
一段话：课号和标题、拍数和时长（build 输出的「总长」）、用了哪些截图/插画/diagram、有没有删掉或没讲的原文内容、voice 重合成过哪些拍、还存在的已知问题。
