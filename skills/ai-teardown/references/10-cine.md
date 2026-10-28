# 10 · 代码成片引擎（cine）

「王炸」风格的讲解课：每一帧都是代码实时算出来的（Three.js、GLSL、26 万粒子、DOM 动态大字、镜头运动），一节课就是一个 `seek(t)` 函数，同一个 t 渲两次 0 像素差。已验证：「Claude Code 做视频：Opus 5.5 编排课」导学 + 10 节、「Opus 5.5 宣传片实战课」导学 + 8 节 + 加餐。

什么时候用：讲 AI 编排、动效、视频制作这类「片子本身就是作品」的课，或要放真实成片片段、真实会话的实战课。讲书、讲软件操作，sketch 风格更合适；人物历史、终端录屏用 lesson 风格。

## 目录

```
<工作区>/examples/<系列>/
  cine/                 引擎副本（new_series.py --style cine 拷过来）
    index.html          ?lesson=<课号> 打开一节；&capture 是录制模式
    engine/             core.js（时间轴、镜头调度、__film 接口）narr.js（旁白时间、字幕）ui.js（组件）util.js（缓动、弹簧、el/css）post.js glsl.js
    engine/scenes/      particles clock bars showroom liquid tunnel
    tools/              clips stills record finish retail loopbed queue.sh deliver.sh browser.py
    audio/tools/        bed.py（合成背景乐 + 音效，按段落 level 校准响度）score.py（合成和 DSP 库）
    audio/sfx/          CC0 真实按键录音（key 音效）
    fonts/ vendor/      Geist、Noto Sans SC；three.js
    queue.txt           渲染队列：课号|标题|封面秒
    deliver.env         交付去向：D=桌面文件夹，WEB=课程页目录，STRIP=文件名去掉的课号前缀
  lessons/<课号>/        narration.json  film.js  assets/  scenes/（本课专用场景）  build/（配音、录制、混音产物）  stills/
  tools/                check_timings.py  update_series.py
  session/              真实会话录制（实战课用，见 11-practice-course.md）
  voice/host-ref.wav    克隆音色参照
  publish/course/       课程页（lesson<课号>.mp4/.jpg + index.html）
```

## 环境

- `CINE_PY`：一个装了 `numpy scipy pillow playwright` 的 Python（finish.py 要 scipy）。没有就 `python3 -m venv ~/.venvs/cine && ~/.venvs/cine/bin/pip install numpy scipy pillow playwright`，再 `~/.venvs/cine/bin/python -m playwright install chromium-headless-shell`。
- 无头浏览器必须走 GPU：`--use-angle=metal --enable-gpu --ignore-gpu-blocklist`（`tools/browser.py` 已带；默认 SwiftShader 慢 30 倍）。浏览器路径按 `CINE_CHROME` → Playwright 缓存里最新的 chromium_headless_shell → Playwright 默认。
- 页面要用 HTTP 打开（ES module 不能 file://）：`python3 -m http.server 8964 --bind 127.0.0.1 --directory <系列目录>`；`queue.sh` 发现没服务会自己起一个。
- 配音同 sketch：`scripts/make_lesson.py <课> voice` + `scripts/speed.py <课> 1.15`（MiMo 克隆音色，密钥只放 `~/.config/ai-teardown/mimo.env`）。
- 曲库配乐要装 promo-video skill（`pick_music.py`）；不用曲库就用 bed.py 合成。
- ffmpeg、ffprobe。

## film.js 契约

```js
import { clamp, lerp, eOutCubic, spring, el, css } from "../../cine/engine/util.js";
import { C, appear, slam, typeText, codeCard, sourceTag, pauseCard, recapMap, clipBox } from "../../cine/engine/ui.js";
import { Particles, F } from "../../cine/engine/scenes/particles.js";

export const COLD = 6.4;                         // 片头王炸开场长度：旁白整体往后挪这么多秒
export const meta = { title: "视频就是一个函数", n: 1 };
export let hits = [], blur = [], clips = [], music = [];
export const sfx = [], sections = [];

export async function build(ctx) {
  const T = (s) => ctx.narr.t(s);                // "B07" "B07.ring" "B03@三千" "B07.end" "B05+1.2"
  return [{ from: 0, to: COLD, build(root) { … }, render(t, u) { … } }, …];
}
```

- 镜头 `{ from, to, build(root), render(t, u) }`：build 只建一次 DOM / 场景，render 每帧按绝对时间 t 和镜头内进度 u 摆状态，**不能依赖上一帧**（录制会跳着 seek）。
- `hits`：镜头冲击（曝光提升 + 极短闪白 + 位移），全片 ≤3 个；有片段在画面里时不用。
- `blur`：`[起, 止]` 秒段，录制时 4 个子帧平均做运动模糊（180° 快门）。
- `sfx`：`{ t, type, … }`，类型 slam whoosh whoosh-through riser(t_to) impact blip click tick shutter snap chime error card(note_index) rewind key(enter)。
- `sections`：合成背景乐段落 `{ t, t_to, level }`，level 0 静、1 铺底、2 轻律动、3 满。全用曲库时写一段 level 0。
- `clips`：真片段 `{ id, src, from, at, dur, x, y, w, h, audio: mute|duck|full, gain, fade, poster_at, seg }`，clips.py 裁好，finish.py 用 ffmpeg 叠在框上。
- `music`：曲库配乐 `{ src, from, at, dur, gain | gain_curve: [[t, dB]…], fade_in, fade_out }`，旁白段自动再压低。
- 组件（ui.js）：appear slam wipeUp typeText bigText kicker codeCard（`hl(i, on)`）promptChip quoteCard sourceTag pauseCard recapMap clipBox；颜色表 `C`。
- 场景：Particles（队形 DUST/LINE/CLOUD/TITLE/CN/POINT，`setText` 换字）、Clock、Bars、Showroom（构造传 `ctx.r`）、Liquid、Tunnel。参数见各文件末尾注释。

## 流水线

```bash
cd <工作区>; S=examples/<系列>; L=$S/lessons/<课号>
python3 scripts/make_lesson.py $L voice > $L/voice.log 2>&1 && python3 scripts/speed.py $L 1.15
cd $S
python3 tools/check_timings.py <课号>                         # 逐字对齐有没有断
$CINE_PY cine/tools/clips.py <课号>                            # 有片段时
$CINE_PY cine/tools/stills.py <课号> lessons/<课号>/stills/sheet.png 1.0 B01+1 B02.a+1 …   # 接触表，逐张看
echo "<课号>|<标题>|<封面秒>" >> cine/queue.txt; CINE_PY=$CINE_PY cine/tools/queue.sh    # clips → record → finish → deliver，串行
python3 tools/update_series.py && python3 ../../scripts/course_page.py series.json publish/course
```

- record.py：1920×1080 60fps 逐帧 seek + 截图，管道给 ffmpeg（CRF 18）→ `build/picture.mp4`。粒子满屏的课约 1.5–2 倍实时。
- finish.py：读 `__film` → `lesson.json` → bed.py 合成背景乐和音效 → 旁白压低背景乐 → 叠片段和曲库配乐 → 限幅（留 1.5 dB，AAC 后不过 0）→ `build/lesson<课号>.mp4`。
- retail.py `<课号> B18`：只重渲某一拍以后的画面接回 picture.mp4（改了结尾几拍时用）。
- deliver.sh：桌面 1080p60 分享版（CRF 23、码率封顶 6M）+ 课程页 720p30 网页版（降噪、封顶 520k，约 2 MB/分钟，单文件要 <15 MB）+ 封面。
- 多智能体：每个助手按系列目录 `BRIEF.md` 做一节的旁白 + 配音 + film.js + 接触表，不渲染、不改引擎；主会话核对引文和数字、排队渲染、抽帧和响度质检、发布。

## 质检

- 接触表每个镜头至少 1 帧，**动画中途的帧也要看**（静止帧会漏掉重影、残留）。
- 成片抽 6–12 帧拼图再看；`ffmpeg -nostats -i lesson.mp4 -vn -af ebur128=peak=true -f null -` 看响度：已交付的课整体约 −14.5 LUFS、真峰值约 −0.9 dBFS，差得多就查混音。
- 引文署名逐条回原始出处核对（助手会张冠李戴）；屏幕上每个数字都要能追到来源。

## 坑

- `[[cue]]` 只用小写字母、数字、下划线；不能叫 `end`（`B06.end` 是保留写法）；大写 cue 不会被解析。
- 旁白里的英文名别带连字符（「promo-video」会让逐字对齐从那里断掉，后面的字挤到拍尾），写「promo video」；配音后跑 `check_timings.py`。
- `appear()` 不能改 display（会冲掉 flex 居中），用 visibility；字幕别在「5.5」小数点处断句；JS 里 `41.0` 转字符串是 `"41"`，拼文件名要用字符串。
- 片段永远在最上层、不跟 hits 抖；任何字、箭头不能压在片段框上；框不能进 y>920（字幕区）；w、h 用偶数；片段起点别落在源片的模糊转场上。
- 粒子：curl 噪声频率太低整团会漂成怪圈；粒子大小别和方位角共用同一个随机数（扇形缺口）；闪白压在暗画面上发灰，冲击用曝光提升 + 极短闪白。
- 60fps + 粒子/颗粒码率很高：交付封顶码率，母版别用 CRF 16。
- 应用里的浏览器面板折叠时 `document.hidden`，rAF 不跑、截图发黑：验证一律用无头录制工具。
- 曲库曲子短于整节：`loopbed.py` 按小节接长（从到达点后 8 小节到淡出前最后一个整小节循环，1 小节等功率交叉淡化）。
