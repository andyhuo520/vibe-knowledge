# 02 · 流水线与发布

## 目录结构

```
<工作区>/
  scripts/ runtime/ primitives/ schemas/ assets/     ← 引擎（本 skill 的 engine/）
  examples/<系列>/
    series.json            大纲 + 课程页数据
    BRIEF.md SCENES_GUIDE.md DECISIONS.md
    assets/img/            图片账本 images.json（加锁写：scripts/ledger.py）+ 截图、emoji、小人帧、录屏帧
    source/                原书 / 仓库克隆（如有）
    voice/host-ref.wav     锁定的克隆音色参照
    render.queue           渲染队列（每行一个课号，END 结束）
    publish/course/        课程页 index.html + 720p 压缩视频 + 封面
    publish/lessonNN/      互动版（index.html、app.js、audio.mp3、img/）
    lessons/NN/
      narration.json scenes.json voice.log
      illus/ lottie/ data/  本节插画、Noto 动画、录屏帧序列
      build/               audio/、timings.json、film.js、stills/scenes.png（接触表）
      hf/renders/lessonNN.mp4   1080p 成片
```

## 环境（一次性）

| 依赖 | 位置 / 做法 |
|---|---|
| MiMo TTS/ASR 密钥 | `~/.config/ai-teardown/mimo.env`（600 权限，`MIMO_API_KEY`、`MIMO_BASE_URL=https://api.xiaomimimo.com/v1`）。**永远不写进项目、页面或记忆** |
| whisper-cli | `brew install whisper-cpp`；模型 `~/Library/Application Support/Murmur/models/ggml-medium-q5_0.bin`（对齐补救）+ `…/Memo/models/ggml-small.bin`（快速对齐）。路径在 `scripts/tts_mimo.py` 顶部 |
| Playwright 无头浏览器 | `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/…`（`scripts/stills.py`、`export_cues.py` 顶部） |
| Hyperframes | `npx hyperframes@0.6.x` 装一次，make_lesson 里 `NPX` 指向 `~/.npm/_npx/<hash>/node_modules`（换机器要改） |
| esbuild | 同在 NPX 目录的 `.bin/esbuild` |
| 配乐 | `~/.claude/skills/promo-video/assets/music`（mixkit 免版税曲，`make_lesson.py` 的 `BGM`、`mix.py` 的 `LIB`） |
| ffmpeg | brew 装，无 drawtext 也可 |

换机器时按上表改 `scripts/make_lesson.py`、`tts_mimo.py`、`stills.py`、`export_cues.py`、`mix.py` 顶部的常量。

## make_lesson 三段

```bash
python3 scripts/make_lesson.py <课目录> voice   # 按拍合成（并行 2–3 路、按文字缓存）→ whisper 逐字对齐 → MiMo ASR 回读打分
python3 scripts/make_lesson.py <课目录> build   # 变速（scenes.speed，默认 1.15）→ 编译 scenes.json → esbuild 打包 → preview.html → 接触表
python3 scripts/make_lesson.py <课目录> final   # 混音（配乐 -24dB）→ Hyperframes 1080p 渲染 → 720p 压缩版进课程页 → 互动版目录 → 更新 series.json 和课程页
```

- `scenes.json` 写 `"engine":"sketch"` 自动用 `runtime/sketch.js`，否则用 `runtime/lesson.js`。
- **final 不会重跑 build**：改了 runtime/primitives 之后，对已排队未渲染的课要手动 build。
- 渲染约 12–15 分钟/节，串行最快（Hyperframes 多 worker 反而慢；同时开别的浏览器任务会掉到 5–8 fps）。

## 渲染队列

```bash
nohup zsh scripts/render_queue.sh examples/<系列> > <日志> 2>&1 &   # 常驻，空队列时每 20 秒看一次
echo 07 >> examples/<系列>/render.queue
```
日志里「第 N 节完成 / 失败」各一行；用 Monitor 盯日志（grep 完成|失败|Error|Traceback），30 分钟到期要续。要中途停某节：杀掉 runner 的 make_lesson 子进程，runner 会记失败并继续下一节，再把课号追加回队列。

## 发布

- **互动版**：`python3 scripts/sketch_publish_files.py <课目录>` 打印 files 映射（只含本节用到的图 + 80 张小人帧）。Artifact publish：`file_path=publish/lessonNN/index.html`，`root=` 该目录，files 用列表 `[{"path": "app.js"}, …]`（>200 个文件时列表形式最省事）。上限 255 个文件、每版 64MB。
- **课程总页**：`scripts/course_page.py series.json publish/course`；视频总量常超 64MB → 同一 file_path 分多次发布，每次只带一批视频（没带的文件会保留）。
- 发布后把 MP4 用 SendUserFile 发给用户；Artifact 是私密链接，给别人看要在页面 Share 里开。用户说「打不开」时，优先给本地文件夹路径 + 完整 https 链接。
- **本地汇总**：全部成片按「节号_标题.mp4」`cp -c`（APFS 克隆，不占空间）到桌面一个文件夹，导学用 `000_` 前缀排最前。
- 课程页每节卡片自动带：引子、简介、要点、时长、视频、「互动版」链接（series.json 的 `interactive`）。

## 进度记录

每发一节就把互动版链接记下来（记忆或项目 README），全部完成后给用户一张「节号 → 链接」总表。
