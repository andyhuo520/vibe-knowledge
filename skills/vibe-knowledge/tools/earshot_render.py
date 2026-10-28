#!/usr/bin/env python3
"""用 earshot（github.com/Leonxlnx/earshot，MIT）的代码音效库渲染一批音效。由 finish.py 调用，也可以单独跑。
必须用 earshot 自己的环境运行：~/tools/earshot/.venv/bin/python earshot_render.py <jobs.json> <输出目录>

jobs.json：[{"key": "a1b2c3", "id": "cut_hit/punch", "seed": null, "dur": null, "apex": null, "pitch": null}, …]
  id     earshot 音效编号 <类别>/<成员>（完整清单：~/tools/earshot/.venv/bin/python -m earshot sfx list）
  seed   null = 发布时那一条；整数 = 同一音效的另一个 take（同一片子里重复用的音效换 seed，避免机械重复）
  dur    目标时长（秒），按配方参数改，不变速
  apex   嗖声 / 上升音最响点落在第几秒（相对文件开头）
  pitch  音名或 Hz（"E5"、"G1"、440），只对有音高的音效有效
输出：<key>.wav（48 kHz 浮点）和 <key>.json（onset_s / peak_s / end_s / dur_s / checks），已存在就跳过（缓存）。"""
import json, sys
from pathlib import Path

import numpy as np
import soundfile as sf
from earshot.forge import bank

SR = 48000


def main():
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    done = 0
    for j in jobs:
        wav, meta_p = out / f"{j['key']}.wav", out / f"{j['key']}.json"
        if wav.exists() and meta_p.exists():
            continue
        kw = {k: j[k] for k in ("seed", "dur", "apex", "pitch") if j.get(k) is not None}
        y, meta = bank.render(j["id"], sr=SR, **kw)
        y = np.asarray(y, np.float32)
        sf.write(str(wav), y, SR, subtype="FLOAT")          # bank.render 给的是 (n,) 或 (n, 2)，采样在前
        keep = {k: meta.get(k) for k in ("id", "seed", "onset_s", "peak_s", "end_s", "dur_s", "peak_db", "lufs_m_max", "edits")}
        c = meta.get("checks")
        keep["checks_ok"] = (c or {}).get("ok", None) if isinstance(c, dict) else None
        meta_p.write_text(json.dumps(keep, ensure_ascii=False, default=str), encoding="utf-8")
        done += 1
    print(f"earshot：新渲染 {done} 个，共 {len(jobs)} 个 → {out}")


if __name__ == "__main__":
    main()
