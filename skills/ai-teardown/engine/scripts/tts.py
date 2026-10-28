#!/usr/bin/env python3
"""配音与对齐：逐 beat 合成，取词级时间戳，把旁白里的 [[cue]] 标记换算成时刻。

用法：
    python3 scripts/tts.py <narration.json 或 lesson.json> <输出目录> [--gap 0.35] [--lead 0.4] [--lexicon lexicon.json] [--rate -10%]

输入（二选一）：
    lesson.json（读 meta.voice 与 beats[].narration）
    或 {"voice": {"id": "...", "rate": "-10%"}, "lexicon": {...}, "beats": [{"id": "B001", "narration": "..."}]}
读音词典：{"原文": "给 TTS 读的写法"}，只影响发音，时间戳仍然对回原文。

输出：
    <out>/audio/<beat>.mp3            每段配音
    <out>/narration.wav               按 gap 串起来的整条旁白（48 kHz 单声道）
    <out>/timings.json                每段的起止、逐词时间（含原文字符区间）、cue 时刻，全部是绝对秒
"""
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts

CUE_RE = re.compile(r"\[\[([a-z][a-z0-9_-]*)\]\]")


def strip_cues(text):
    """去掉 [[cue]]，返回 (干净文本, {cue: 干净文本里的字符位置})。"""
    out, cues, pos = [], {}, 0
    for m in CUE_RE.finditer(text):
        out.append(text[pos:m.start()])
        cues[m.group(1)] = sum(len(p) for p in out)
        pos = m.end()
    out.append(text[pos:])
    return "".join(out), cues


def apply_lexicon(text, lexicon):
    """按词典替换发音；返回 (TTS 文本, 映射表)，映射表把 TTS 文本的每个字符对回原文位置。"""
    if not lexicon:
        return text, list(range(len(text) + 1))
    keys = sorted(lexicon, key=len, reverse=True)
    pat = re.compile("|".join(re.escape(k) for k in keys))
    tts, back, pos = [], [], 0
    for m in pat.finditer(text):
        for i in range(pos, m.start()):
            tts.append(text[i])
            back.append(i)
        rep = lexicon[m.group(0)]
        for j, ch in enumerate(rep):
            tts.append(ch)
            back.append(m.start() + min(j, len(m.group(0)) - 1))
        pos = m.end()
    for i in range(pos, len(text)):
        tts.append(text[i])
        back.append(i)
    back.append(len(text))
    return "".join(tts), back


async def synth_once(text, voice, rate):
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    audio, words = bytearray(), []
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"text": ch["text"], "start": ch["offset"] / 1e7, "end": (ch["offset"] + ch["duration"]) / 1e7})
    return bytes(audio), words


async def synth(text, voice, rate, tries=4):
    """edge-tts 偶发 NoAudioReceived / 连接中断，指数退避重试。"""
    for k in range(tries):
        try:
            return await synth_once(text, voice, rate)
        except Exception as e:  # noqa: BLE001
            if k == tries - 1:
                raise
            print(f"  重试 {k + 1}：{type(e).__name__}", file=sys.stderr)
            await asyncio.sleep(1.5 * 2 ** k)


def locate(words, tts_text, back):
    """把每个词按顺序定位到 TTS 文本，再映射回原文字符区间。"""
    i = 0
    for w in words:
        k = tts_text.find(w["text"], i)
        if k < 0:  # 找不到时退化为紧接上一个词
            k = i
        w["i0"], w["i1"] = back[k], back[min(k + len(w["text"]), len(back) - 1)]
        i = k + len(w["text"])
    return words


def probe_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    gap = float(sys.argv[sys.argv.index("--gap") + 1]) if "--gap" in sys.argv else 0.35
    lead = float(sys.argv[sys.argv.index("--lead") + 1]) if "--lead" in sys.argv else 0.4
    data = json.loads(src.read_text(encoding="utf-8"))
    if "meta" in data:  # lesson.json：读音词典与语速从命令行给（lesson 本身不放发音细节）
        voice = {"id": data["meta"]["voice"], "rate": sys.argv[sys.argv.index("--rate") + 1] if "--rate" in sys.argv else "-10%"}
        lexicon = json.loads(Path(sys.argv[sys.argv.index("--lexicon") + 1]).read_text(encoding="utf-8")) if "--lexicon" in sys.argv else {}
    else:
        voice, lexicon = data["voice"], data.get("lexicon", {})
    (out / "audio").mkdir(parents=True, exist_ok=True)

    timings, t, parts = {"voice": voice, "beats": {}}, lead, []
    for b in data["beats"]:
        clean, cue_pos = strip_cues(b["narration"])
        tts_text, back = apply_lexicon(clean, lexicon)
        mp3 = out / "audio" / f"{b['id']}.mp3"
        audio, words = asyncio.run(synth(tts_text, voice["id"], voice.get("rate", "-10%")))
        mp3.write_bytes(audio)
        dur = probe_duration(mp3)
        locate(words, tts_text, back)
        for w in words:
            w["start"], w["end"] = round(t + w["start"], 3), round(t + w["end"], 3)
        cues = {}
        for name, k in cue_pos.items():
            nxt = next((w for w in words if w["i0"] >= k), None)
            cues[name] = nxt["start"] if nxt else round(t + dur, 3)
        timings["beats"][b["id"]] = {
            "file": f"audio/{b['id']}.mp3", "text": clean,
            "start": round(t, 3), "end": round(t + dur, 3), "duration": round(dur, 3),
            "words": words, "cues": cues,
        }
        parts.append((mp3, t))
        print(f"{b['id']}  {dur:5.2f}s  {len(clean):3d} 字  cues={list(cues)}")
        t += dur + max(gap, b.get("gap", 0), b.get("min_hold_s", 0))
    total = round(t - gap + lead, 3)
    timings["total"] = total

    # 串成一条旁白：每段按绝对起点放置
    inputs, filters = [], []
    for i, (mp3, start) in enumerate(parts):
        inputs += ["-i", str(mp3)]
        filters.append(f"[{i}:a]aresample=48000,adelay={int(start * 1000)}:all=1[a{i}]")
    mixin = "".join(f"[a{i}]" for i in range(len(parts)))
    filters.append(f"{mixin}amix=inputs={len(parts)}:normalize=0,apad=whole_dur={total},atrim=0:{total}[out]")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(filters),
                    "-map", "[out]", "-ac", "1", "-ar", "48000", str(out / "narration.wav")], check=True)
    (out / "timings.json").write_text(json.dumps(timings, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"合计 {total:.2f}s → {out / 'timings.json'}")


if __name__ == "__main__":
    main()
