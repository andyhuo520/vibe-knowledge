<div align="center">

# vibe-knowledge

**One idea → one narrated, fully sourced, cinematic explainer short.**<br>
A Claude Code skill that takes a topic through research → script → voice → code-rendered video (1080p60) → QA → publishing kit, all inside the chat.

[中文](README.md) · [Samples](#samples) · [Styles](#44-styles--8-families) · [Audio](#default-voice--bgm) · [Install](#install)

<img src="docs/style-flash.gif" width="720" alt="style flash reel">

<sub>Excerpt of the style flash reel. Full 42 s: <a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/style-flash-42s.mp4">style-flash-42s.mp4</a></sub>

</div>

---

## Samples

Click a poster to play (videos live in [Release v1.0.0](https://github.com/andyhuo520/vibe-knowledge/releases/tag/v1.0.0)). Narration and captions are in Chinese; labels under each poster give the template · style · tier. Every frame is orchestrated by Claude Opus and rendered frame-by-frame in code; "enhanced" shots use [Renoise](https://renoise.ai/mcp?utm_medium=xcom&utm_source=official) for AI images and motion clips, always labelled as AI illustrations on screen.

<table>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep04b-no-fridge-gufeng.mp4"><img src="docs/posters/ep04b-no-fridge-gufeng.jpg" width="100%"></a><br><b>如果你活在古代没有冰箱（古风版）</b><br><sub>2:05 · 两难选择片 · 古风 · 增强标准档（Wan 3.0 动态镜头）</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep01-shangyang.mp4"><img src="docs/posters/ep01-shangyang.jpg" width="100%"></a><br><b>商鞅立木：搬一根木头赏五十金，你搬不搬？</b><br><sub>2:32 · 两难选择片 · 古风 · 增强档</sub></td></tr>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep01-shangyang-base.mp4"><img src="docs/posters/ep01-shangyang-base.jpg" width="100%"></a><br><b>商鞅立木（基础档，0 积分）</b><br><sub>2:32 · 同一份 film.js，代码插画版</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep01-tiers-compare.mp4"><img src="docs/posters/ep01-tiers-compare.jpg" width="100%"></a><br><b>商鞅立木 · 两档上下对比</b><br><sub>2:32 · 基础档 vs 增强档，旁白和脚本完全一样</sub></td></tr>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep02-paper-to-moon.mp4"><img src="docs/posters/ep02-paper-to-moon.jpg" width="100%"></a><br><b>一张纸折多少次能到月球</b><br><sub>1:10 · 猜谜概念片 · 深色数学 + 尺度穿越 · 增强标准档</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep03-money-laundering.mp4"><img src="docs/posters/ep03-money-laundering.jpg" width="100%"></a><br><b>什么是洗钱</b><br><sub>1:31 · 痛点原理片 · 半调拼贴 · 增强轻档</sub></td></tr>
<tr><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep04-no-fridge.mp4"><img src="docs/posters/ep04-no-fridge.jpg" width="100%"></a><br><b>如果你活在古代没有冰箱</b><br><sub>3:12 · 猜谜概念片 · 星空光点 · 基础档 0 积分（同一选题的另一种讲法）</sub></td><td width="50%" valign="top"><a href="https://github.com/andyhuo520/vibe-knowledge/releases/download/v1.0.0/ep05-rocket.mp4"><img src="docs/posters/ep05-rocket.jpg" width="100%"></a><br><b>火箭怎么飞上天</b><br><sub>1:46 · 猜谜概念片 · 蓝图专利图 · 增强标准档</sub></td></tr>
</table>

Style reels (each style performs the same opening, for side-by-side comparison):

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

## 44 styles · 8 families

<img src="docs/style-wall.jpg" alt="44 styles">

| Family | Count | Styles (each STYLE.md covers palette, type, camera language, best-fit topics) |
|---|---|---|
| Eastern | 7 | [Gufeng](skills/vibe-knowledge/styles/gufeng/STYLE.md), [Ink & Paper](skills/vibe-knowledge/styles/paper/STYLE.md), [Dunhuang Mural](skills/vibe-knowledge/styles/dunhuang/STYLE.md), [Blue & White](skills/vibe-knowledge/styles/qinghua/STYLE.md), [Woodcut](skills/vibe-knowledge/styles/woodcut/STYLE.md), [Minimal Zen](skills/vibe-knowledge/styles/minimal/STYLE.md), [Handscroll](skills/vibe-knowledge/styles/scroll/STYLE.md) |
| Dark concept | 7 | [Starfield](skills/vibe-knowledge/styles/starfield/STYLE.md), [Dark Gold](skills/vibe-knowledge/styles/darkgold/STYLE.md), [Dark Math](skills/vibe-knowledge/styles/darkmath/STYLE.md), [Neon Cyber](skills/vibe-knowledge/styles/neon/STYLE.md), [Keynote](skills/vibe-knowledge/styles/keynote/STYLE.md), [Aurora Glass](skills/vibe-knowledge/styles/aurora/STYLE.md), [Art Deco](skills/vibe-knowledge/styles/deco/STYLE.md) |
| Game | 4 | [Pixel](skills/vibe-knowledge/styles/pixel/STYLE.md), [Rpg Dialogue](skills/vibe-knowledge/styles/rpg/STYLE.md), [Card Battle](skills/vibe-knowledge/styles/cards/STYLE.md), [Cozy Farm](skills/vibe-knowledge/styles/farm/STYLE.md) |
| Editorial & documentary | 5 | [Caption News](skills/vibe-knowledge/styles/caption-news/STYLE.md), [Visual Investigation](skills/vibe-knowledge/styles/investigation/STYLE.md), [Retro Desktop](skills/vibe-knowledge/styles/desktop/STYLE.md), [Light Table](skills/vibe-knowledge/styles/lighttable/STYLE.md), [Tv News](skills/vibe-knowledge/styles/tvnews/STYLE.md) |
| Bright pop | 5 | [Variety Captions](skills/vibe-knowledge/styles/variety/STYLE.md), [Memphis Pop](skills/vibe-knowledge/styles/memphis/STYLE.md), [Bullet Journal](skills/vibe-knowledge/styles/journal/STYLE.md), [Vaporwave](skills/vibe-knowledge/styles/vapor/STYLE.md), [Clay Kawaii](skills/vibe-knowledge/styles/clay/STYLE.md) |
| Diagram & design | 8 | [Chalkboard](skills/vibe-knowledge/styles/chalk/STYLE.md), [Blueprint](skills/vibe-knowledge/styles/blueprint/STYLE.md), [Isometric](skills/vibe-knowledge/styles/isometric/STYLE.md), [Swiss Kinetic](skills/vibe-knowledge/styles/swiss/STYLE.md), [Metro Map](skills/vibe-knowledge/styles/metro/STYLE.md), [Isotype](skills/vibe-knowledge/styles/isotype/STYLE.md), [Copperplate](skills/vibe-knowledge/styles/copper/STYLE.md), [Hand-Drawn Process](skills/vibe-knowledge/styles/sketch/STYLE.md) |
| Print & paper | 5 | [Risograph](skills/vibe-knowledge/styles/riso/STYLE.md), [Halftone Collage](skills/vibe-knowledge/styles/collage/STYLE.md), [Ransom Note](skills/vibe-knowledge/styles/ransom/STYLE.md), [Editorial](skills/vibe-knowledge/styles/editorial/STYLE.md), [Park Poster](skills/vibe-knowledge/styles/poster/STYLE.md) |
| Cinematic | 3 | [Title Sequence](skills/vibe-knowledge/styles/titles/STYLE.md), [Silent Film](skills/vibe-knowledge/styles/silent/STYLE.md), [Constructivist](skills/vibe-knowledge/styles/constructivist/STYLE.md) |

## Default voice & BGM

- [default-voice-demo.m4a](docs/audio/default-voice-demo.m4a): the default narrator, an AI voice made with Xiaomi MiMo voice design (not a real person).
- [mix-demo-voice-plus-bgm.m4a](docs/audio/mix-demo-voice-plus-bgm.m4a): final mix (voice + BGM + SFX).
- [vibe-bgm.m4a](skills/vibe-knowledge/assets/music/vibe-bgm.m4a): the default BGM. It is **mandatory**: the mixer auto-fits it to the film length, disables other full-length scores, and calibrates it to sit 10 dB under the voice while speaking. Swapping it requires an explicit user request (`bgm: true, user_request: "..."`).

## How an episode is made

Pick a topic → choose one of 6 narrative templates, a **length** (four tiers from 45 s to 5 min, each stating how deep it can go and what gets cut), a style and a tier → sourced fact sheet → script + adversarial review → MiMo voice with word-level alignment → `film.js` with the `know.js` component kit → frame-by-frame render → mix (mandatory BGM) → cover as first frame → QA (contact sheet, OCR read-back vs facts, loudness, freeze detection, BGM detection) → publishing kit. Three explicit user checkpoints; any paid generation is quoted first.

Two tiers share one `film.js`: **base** (0 credits: hand-written SVG layers, particles, data components) and **enhanced** (only the shots code can't do well go to Renoise).

## Install

```bash
git clone https://github.com/andyhuo520/vibe-knowledge.git
cp -R vibe-knowledge/skills/vibe-knowledge vibe-knowledge/skills/ai-teardown ~/.claude/skills/
```

Requirements: a Python with `numpy scipy pillow playwright` (set `CINE_PY`), `ffmpeg`, macOS Vision + `swiftc` for OCR QA, a Xiaomi MiMo key in `MIMO_API_KEY` or `~/.config/ai-teardown/mimo.env`, and optionally the Renoise MCP for the enhanced tier. Then ask Claude Code: *"Make a Vibe knowledge episode: why does the digit 1 give fake books away?"*

## License

Code: [MIT](LICENSE). Sample videos, AI imagery, default BGM and voice: see [NOTICE.md](NOTICE.md). Third-party components: [THIRD_PARTY.md](THIRD_PARTY.md).

By [@Berryxia](https://x.com/berryxia) · orchestrated with Claude Code (Claude Opus)
