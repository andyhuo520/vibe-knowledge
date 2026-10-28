# 03 · 旁白与配音

## narration.json

```json
{
 "voice": {
  "engine": "mimo",
  "clone": "../../voice/host-ref.wav",
  "style": "你在录一节给职场人听的软件入门课。像一位亲切、干脆的年轻科普博主，语速从容，每句话讲清楚，句与句之间留出停顿，重点词稍微加重。"
 },
 "lexicon": {"PPT": "P P T", "GitHub": "Git Hub", "NLP": "N L P"},
 "beats": [{"id": "B01", "narration": "[[hi]]上一节，我们……[[now]]这一节，讲……"}]
}
```

- `clone` 路径相对于课目录；预设音色写 `"voice": "白桦"` 之类。
- **一节**：18–28 拍，1200–2200 字（1.15 倍速后 4–7 分钟）。导学类 9–10 拍、约 750 字 ≈ 2.5 分钟。
- **一拍**：40–130 字，2–4 个 `[[cue]]`（小写英文/数字/下划线，放在分句开头）。画面元素用 `"B03.cue"` 或 `"B03@某个词"` 对齐到读到那个字的时刻。
- 口语、短句、第二人称。开头接上一节，结尾预告下一节 + 感谢原作者 + 「我们下节见」。
- 至少一个「暂停想一想」：一拍提问，下一拍 `[[answer]]` 揭晓。
- 不编造：数字、功能、界面文字、步骤以原文为准；原文没写的不补。引用逐字。

## MiMo 配音要点

- 接口是 chat/completions：正文放 assistant 消息，语气说明放 user 消息；返回 24kHz 单声道 WAV（base64）。
- 预设音色：mimo_default、冰糖、茉莉（女）、苏打、白桦（男）；英文 Mia、Chloe、Milo、Dean。voicedesign 可按描述造音色，voiceclone 要参照音频。
- **必须加讲课语气说明**：不加时每秒 5–6.5 字，太赶；加了约 4 字/秒，再用 `scenes.speed: 1.15` 变速（atempo，音调不变）。
- 没有逐词时间戳 → 每拍整段合成后用 whisper-cli 取 token 时间：先 small 模型，对不齐再用 medium；**一定要带 `--prompt 原文`**（否则出繁体、对齐率 65%）；token 可能切在多字节字符中间，要增量 UTF-8 解码。
- 并发 2–3 路，429 限流会自动退避重试（慢是正常的）。

## 读音坑与 lexicon

- **罗马数字**：全由 I V X L C D M 组成的大写缩写会被念成数字（CLI→一百五十一、MD→一千五百、CC→二百）。`tts_mimo.py` 已自动拆成单个字母（ROMANISH 规则）；小写 cli/md 也会念歪，写进 lexicon。
- 版本号写成「0 点 155 点 1」。
- 英文专名念歪的（GitHub、GEO、NLP、自造词）加进 lexicon 拆字母或加空格。
- 回读 QA 的 `odd_numbers`：回读里出现原文没有的 ≥100 的数字会 ⚠ 报出来。

## 回读质检（每节必看 voice.log）

- 每拍一行：时长、字数、字/秒、对齐率、合成耗时、回读相似度、差异。
- 回读 < 95% 或有 ⚠：删 `build/audio/<拍>.*` 再跑 voice，只重合成这几拍；两次都低就改措辞（换同义词、拆长句）再合成。
- 差异全是同音字 / 专名被 ASR 听错时，用本地 whisper 复听确认（`whisper-cli -m <medium> -l zh -nt -f build/audio/B07.wav`，可加 `--prompt "专名"`）；念对了就不用重来。人名务必复听（例：苍何 → 回读「仓颉」可疑，复听是「苍和」= cāng hé，正确）。
- MiMo 偶尔会多念、重复或多加一个否定词（「不」），意思反了必须重来。

## 英文版

- narration：`voice.lang = "en"`，预设 `Dean`（美式男声），whisper `-l en`，按词分段。
- scenes：`"lang": "en"`（界面文字表切英文、字幕按句断、52 字符宽）、`"inlineCredits": false`、`"videoOnly": true`（只出片）、`shotCredit` 写英文出处。
- MiMo 英文偶发多念/重复一句：回读 < 95% 就重合成。
