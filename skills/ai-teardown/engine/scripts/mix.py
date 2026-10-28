#!/usr/bin/env python3
"""混音：旁白 + 背景乐（旁白时自动让位）+ 音效（按实测峰值对齐），整体响度归一。

用法：python3 scripts/mix.py <narration.wav> <cues.json> <out.wav> [--bgm 文件[,文件2,...]] [--bgm-gain -22] [--lufs -14]
cues.json: {"duration": 秒, "sfx": [{"t": 秒, "name": "click", "gain": -12}]}
音效文件取 promo-video 的免费可商用音效库；背景乐默认取它的 Mixkit 曲库。
"""
import json, subprocess, sys
from pathlib import Path

LIB = Path.home() / ".claude/skills/promo-video/assets"
PEAK = {"key-8": 0.092, "cut": 0.157, "paper-place-1": 0.046, "paper-place-2": 0.05, "swish-1": 0.039,
        "swish-2": 0.118, "swish-3": 0.062, "whoosh": 0.264, "riser": 1.198}

def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

def main():
    narr, cues_p, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    cues = json.loads(cues_p.read_text(encoding="utf-8"))
    dur = float(cues["duration"])
    bgms = [Path(b) for b in arg("--bgm", str(LIB / "music/mixkit-132-hazy-after-hours.mp3")).split(",")]
    bgm_gain = float(arg("--bgm-gain", "-22"))
    lufs = float(arg("--lufs", "-14"))
    if len(bgms) > 1:
        # 多首背景乐：依次交叉淡入淡出接成一条（长课单曲循环容易听腻）
        joined = out.with_suffix(".bgm.wav")
        ins = sum([["-i", str(b)] for b in bgms], [])
        chain, last = [], "[0:a]"
        for i in range(1, len(bgms)):
            nxt = f"[x{i}]" if i < len(bgms) - 1 else "[bgmcat]"
            chain.append(f"{last}[{i}:a]acrossfade=d=4:c1=tri:c2=tri{nxt}")
            last = nxt
        subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(chain), "-map", "[bgmcat]", "-ar", "48000", "-ac", "2", str(joined)], check=True)
        bgm = joined
    else:
        bgm = bgms[0]
    inputs = ["-i", str(narr), "-stream_loop", "-1", "-i", str(bgm)]
    f = [
        "[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][key]",
        f"[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{dur},volume={bgm_gain}dB,"
        f"afade=t=in:d=1.2,afade=t=out:st={max(0, dur - 1.8)}:d=1.8[bgm0]",
        # 旁白出现时背景乐压低约 8 dB
        "[bgm0][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450:makeup=1[bgm]",
    ]
    mixes = ["[vo]", "[bgm]"]
    for i, c in enumerate(cues.get("sfx", [])):
        fn = LIB / "sfx" / f"{c['name']}.wav"
        if not fn.exists():
            print(f"跳过缺失音效 {fn.name}", file=sys.stderr)
            continue
        start = max(0.0, c["t"] - PEAK.get(c["name"], 0.0))
        idx = 2 + len(mixes) - 2
        inputs += ["-i", str(fn)]
        f.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume={c.get('gain', -14)}dB,"
                 f"adelay={int(start * 1000)}:all=1[s{i}]")
        mixes.append(f"[s{i}]")
    f.append(f"{''.join(mixes)}amix=inputs={len(mixes)}:normalize=0:duration=first,"
             f"apad=whole_dur={dur},atrim=0:{dur}[out]")
    pre = out.with_suffix(".pre.wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(f), "-map", "[out]",
                    "-ar", "48000", "-ac", "2", str(pre)], check=True)
    # 两遍 loudnorm：先测量，再按测量值线性归一（单遍会差 1 LU 以上）
    ln = f"loudnorm=I={lufs}:TP=-2.0:LRA=11"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(pre), "-af", f"{ln}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    ln2 = (f"{ln}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
           f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(pre), "-af", ln2, "-ar", "48000", "-ac", "2", str(out)], check=True)
    pre.unlink()
    if len(bgms) > 1:
        bgm.unlink()
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    summary = [l.strip() for l in r.stderr.splitlines() if l.strip().startswith(("I:", "Peak:", "LRA:"))]
    print(f"{len(mixes) - 2} 个音效 → {out}  ", " · ".join(summary[-3:]))

if __name__ == "__main__":
    main()
