# 10 · earshot 代码音效（两档通用，0 积分）

来源：github.com/Leonxlnx/earshot（MIT，2963★）。252 个音效全部以「配方代码」存放，按编号几秒渲染出来，不联网、不需要模型；同一个音效换 seed 就是新的 take。另有听觉质检（timeline / sheet / critique），那部分要下载约 1.1 GB 模型，按需再装。

## 安装（本机已装：~/tools/earshot，2026-10-27）

```bash
git clone --depth 1 https://github.com/Leonxlnx/earshot ~/tools/earshot && cd ~/tools/earshot
/usr/local/bin/python3.12 -m venv --system-site-packages .venv          # 复用 3.12 已有的 numpy/scipy/librosa/soundfile
CERT=$(/usr/local/bin/python3.12 -c "import certifi;print(certifi.where())")   # 这台机器 python.org 版 pip 有证书问题
.venv/bin/python -m pip install --cert "$CERT" pyloudnorm && .venv/bin/python -m pip install --cert "$CERT" --no-deps -e .
PYTHONPATH= .venv/bin/python -m earshot sfx list          # 252 sounds in the bank
```
音效库只依赖 numpy / scipy；没装 torch 和模型，所以 describe / match / timeline / critique 暂不可用。

## 在片子里用

1. `new_film.py` 建系列时会给 finish.py 打 `patch_earshot.py` 补丁（已有系列：`python3 tools/patch_earshot.py <系列目录>`）。
2. film.js：
```js
import { earshot, earshotRun } from "../../cine/engine/know.js";
const ES = earshot(music);
ES("cut_hit/punch", T("B06.nolie"));                          // 起音落在 at
ES("whoosh_fast/tight", T("B06.one"), { align: "peak" });      // 最响点落在 at
ES("pro_sub_drop/low", T("B10.die"), { gain: -6, pitch: "G1" });
earshotRun(ES, "pro_typing_key/soft", t0, t1, 90);            // 逐字古文的打字声
```
3. 渲染时 finish.py 自动调用 earshot 环境渲染，缓存在 `lessons/<课>/build/esfx/`，日志里每条打印「对齐到第几秒、提前了多少毫秒」。
4. **不要同时再写 cine 内置的 sfx（slam / impact / chime 那套合成音）**，会叠成两层；earshot 已覆盖这些角色。

## 知识片角色 → 推荐音效

| 角色（我们片子里的时刻） | 推荐编号 | 对齐 | 增益 | 备注 |
|---|---|---|---|---|
| 印章砸下 / 关键词 slam | `cut_hit/punch`、`pro_pop_in/deep` | onset | −8 | 全片 ≤4 次 |
| 大揭晓 / 片名落定 | `pro_impact/short`、`impact/punch`（dur 1.5） | onset | −8 | 加 `pro_sub_drop/soft` 垫低频 |
| 数字落定 | `pro_pop/thup`、`ui_pop/soft` | onset | −10 | |
| 数字滚动 | `pro_hover_tick/soft` 连串 | onset | −16 | earshotRun 间隔 ≥66 ms |
| 逐字古文 / 打字 | `pro_typing_key/soft` 连串，或 `pro_typing_run/soft` 一整段 | onset | −16 | 间隔 ≥87 ms |
| 条款卡 / 元素弹入 | `pro_pop_in/round`、`ui_pop/step` | onset | −12 | 连续弹入每次换 seed |
| 告示 / 翻页 / 卡片滑入 | `swipe/paper`、`swipe/cloth` | onset | −12 | |
| 荧光笔划重点 | `swish/flick` | onset | −14 | 视觉调查 |
| 红圈画出 | `pro_zip/arc` | onset | −14 | 视觉调查 |
| 推近定格 / 截图 | `shutter/film`、`shutter/snap` | onset | −10 | |
| 转场 / 快速飞入 | `whoosh_fast/tight`、`whoosh_fast/crisp` | **peak**，落在切点后约 +37 ms | −12 | |
| 反转前的吸气 | `reverse_swell/cymbal`、`reverse_swell/short` | **peak**，切点后约 +42 ms | −10 | **全片最多 1 次** |
| 紧张铺垫 | `riser/dark`、`pro_riser/air_gate` | 结束点卡在揭晓 | −14 | |
| 倒台 / 悲剧 / 结局 | `pro_sub_drop/low`、`downlifter/sub_sink` | onset | −6 | 低频，留意响度 |
| 冲突 / 变味（信→怕） | `cut_hit/rumble` | onset | −8 | |
| 奖励 / 金币 / 兑现 | `mallet/glock`、`mallet/flourish`、`pro_notify/ding_2045` | onset | −10 | 可用 pitch 对上配乐调性 |
| 两难按钮出现 / 选中 | `toggle/on`、`toggle/latch` | onset | −12 | |
| 敲门 / 木头 / 竹简 | `knock/wood`、`knock/double`、`fit/hit/bamboo_tok` | onset（提前 40 ms） | −10 | |
| 辟谣反转 / 出错 | `glitch/burst`、`pro_glitch/standard` | 结束点卡在切点 | −12 | |
| 系列片头 | `logo_sting/soft_bloom`、`pro_logo_sting/swell_sting` | onset | −8 | |
| 片尾闪光 | `shimmer/m3`、`pro_shimmer/m1` | onset | −14 | |

时机经验（earshot launch 预设实测的中位数）：轻触比画面切点早 60 ms，敲击早 40 ms，点击早 11 ms，弹入晚 30 ms，嗖声最响点晚 37 ms，反向镲最响点晚 42 ms。

## 听觉质检（要装模型，可选）

`earshot timeline 成片.mp4 --video 成片.mp4`：整片的「听写稿」（每个声音事件的时间、响度、标签，声画同步偏差）；
`earshot sheet 成片.mp4 -o sheet.png`：带视频帧、频谱、响度的标注图；`earshot critique 成片.mp4`：对照专业发布片打分并给出带时间点的修改建议。
装法：`.venv/bin/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu && .venv/bin/python -m pip install -e ".[mcp]" && .venv/bin/python -m earshot doctor --fetch`（约 1.1 GB）。
