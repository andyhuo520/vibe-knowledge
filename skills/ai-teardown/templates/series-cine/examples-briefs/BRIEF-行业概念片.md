# 用 promo-video skill 给一个真实品牌做一支「非官方概念宣传片」——给助手的说明

这支片是「Opus 5.5 宣传片实战课」的行业案例：课程要展示同一套流程在不同行业（茶饮、百货、零售、制造业、电商……）跑出来是什么样。你就是在 Claude Code 里用 Opus 5.5 + promo-video skill 从官网到成片完整跑一遍，用户不参与确认，**所有该问用户的决定由你按 skill 的规则自己做，并写进 DECISIONS.md**。

## 你的品牌
见派活消息：品牌、行业、官网、指定配乐、工程目录。

## 必须遵守
1. **完整走 skill 流程**：先读 `~/.claude/skills/promo-video/SKILL.md`，再按它的指引读 `references/style-router.md`（四层选型 + 口碑记录）、`industries.md`、`brand-from-website.md`、`cinematic.md`、`motion-craft.md`、`design-principles.md`、`compliance.md`。只读选中的扩展包。**不要改 `~/.claude/skills/promo-video` 里的任何文件。**
2. **用户的口碑（必须照做）**：
   - 时长 25–30 秒，16:9，1920×1080，30 fps，中文，不配旁白。开场 2 秒内给钩子，节奏快，别铺陈。
   - 机位默认锁定；只在 3–5 个关键帧用 HitCam，**禁止整段 BeatCam / KickFlash 随拍抖**。
   - 一屏一个标题 + 一个完整内容模块；特效作用在内容上，不拆碎、不裁切；3D / 粒子不超过全片 15%。
   - 结尾 Logo **静止停满 2 秒**。配乐要明亮，不要悬疑感。
3. **素材**：只用官网上的 Logo、配色、字体、产品图、官方文案（按 brand-from-website.md 抓取：curl 或 Playwright 截图 / 读计算样式；本机 Playwright 用 `/usr/local/bin/python3`，浏览器 `executable_path` 指向 `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`）。官网素材不够时，**用 Codex 生图补配图**：
   ```bash
   codex exec --skip-git-repo-check "生成一张图：<画面描述>。风格：<统一风格>。不要出现任何文字和 Logo。复制到当前目录命名为 <名字>.png" < /dev/null > codex_<名字>.log 2>&1
   ```
   （**必须 `< /dev/null`**，否则会卡住；单张约 1–2 分钟，可以并行跑 2–3 张。白底贴纸要抠透明：`~/Desktop/shunde-vlog/_assets/tools/cutout <in.png> <out.png>`。）Codex 只用来画氛围图、场景插画、贴纸、背景、质感；**不许用它伪造品牌的产品照片、门店照片、Logo 或任何「看起来像官方实拍」的东西**。每张 AI 生成图都记进 DECISIONS.md。
4. **事实**：屏幕上的数字、奖项、说法只用官网原文，DECISIONS.md 里逐条写出处（页面 URL + 原句）。没有就不写数字。避开「最」「第一」「唯一」「100%」等绝对化用语（compliance.md）。
5. **声明**：片尾底部小字必须有「非官方概念片 · 仅用于课程演示 · 与 <品牌> 官方无关」，`brand.disclaimer` 也写上。
6. **配乐**：用指定曲子：`python3 ~/.claude/skills/promo-video/scripts/pick_music.py <工程>/public/music/bgm.wav --track <指定文件> --seconds <片长> --hit-at <Logo 或第一个大转场的秒数>`，时间轴按它打印的 BPM 重排（cinematic.md / music.md）。
7. **质检**：`render.sh <工程> film-stills <帧号...>` 每段至少抽 2 帧，自己用 Read 逐张看，按 design-principles.md 的「大师审片」清单改到全部通过，再 `render.sh <工程> film`（后台跑，`run_in_background`）。最后用 `contact_sheet.py` 按真实时间抽 12 帧拼图再看一遍，`check_audio.py` 过响度。
8. **交付**（都在工程目录里）：
   - `out/film.mp4`（成片）、`out/cover.png`
   - `DECISIONS.md`：选型卡（四行）、分镜表（# / 时长 / 场景 / 画面 / 屏幕文字 / 运镜 / 主手艺·转场）、配乐与授权（credit.txt）、素材来源清单（官网 URL）、事实出处、AI 生图清单（提示词 + 用在哪）、你自己审片时改过的三处问题（改前 → 改后）
   - `out/sheet.jpg`（最终 12 帧拼图）
9. **回复主会话（200 字以内）**：片长、选型卡一句话、配乐、用了几张 Codex 图、你最满意和最没把握的镜头、遇到的坑。

## 不要做
- 不发布、不上传任何东西、不改别的工程、不改 `examples/claude-video` 里的任何文件。
- 不登录任何网站、不填任何表单；官网要登录才看得到的内容就不用。
