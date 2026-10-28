#!/usr/bin/env python3
"""给 cine 的 finish.py 打「earshot 代码音效」补丁（new_film.py 建系列时自动调用；也可单独跑：python3 patch_earshot.py <系列目录>）。

打完之后，film.js 的 music 条目可以写：
  { src: "earshot:cut_hit/punch", at: 12.3, align: "peak", gain: -8, es: { seed: 2, dur: 0.4, apex: null, pitch: "G1" } }
- finish.py 先把所有 earshot 条目交给 ~/.claude/skills/vibe-knowledge/tools/earshot_render.py（用 earshot 自己的 venv 跑），
  渲染结果按参数哈希缓存在 lessons/<课>/build/esfx/；
- align: "onset"（默认，起音点落在 at）或 "peak"（最响点落在 at：嗖声、反向镲、上升音用这个）；
- 默认不跟着旁白压低（duck: false），要压就写 duck: true。
环境变量：EARSHOT_PY（earshot venv 的 python，默认 ~/tools/earshot/.venv/bin/python）、EARSHOT_TOOL（渲染脚本路径）。"""
import sys
from pathlib import Path

MARK = "# earshot 代码音效（vibe-knowledge patch_earshot）"

OLD_LOOP = """    for m in info.get("music", []):
        tmp = B / "_music.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{float(m.get('from', 0)):.3f}", "-t", f"{float(m['dur']):.3f}", "-i", str(m["src"] if Path(m["src"]).is_absolute() else ROOT / m["src"]),"""
NEW_LOOP = """    """ + MARK + """：src 写 "earshot:<id>" 的条目先统一渲染（按参数哈希缓存），再按 onset / peak 对齐到 at
    import hashlib, os
    es_jobs = []
    for m in info.get("music", []):
        if str(m.get("src", "")).startswith("earshot:"):
            o = m.get("es") or {}
            j = {"id": str(m["src"])[8:], "seed": o.get("seed"), "dur": o.get("dur"), "apex": o.get("apex"), "pitch": o.get("pitch")}
            j["key"] = hashlib.md5(json.dumps(j, sort_keys=True).encode()).hexdigest()[:12]
            m["_es"] = j
            if j not in es_jobs:
                es_jobs.append(j)
    if es_jobs:
        esd = B / "esfx"; esd.mkdir(exist_ok=True)
        (esd / "jobs.json").write_text(json.dumps(es_jobs, ensure_ascii=False), encoding="utf-8")
        py = os.environ.get("EARSHOT_PY", str(Path.home() / "tools/earshot/.venv/bin/python"))
        tool = os.environ.get("EARSHOT_TOOL", str(Path.home() / ".claude/skills/vibe-knowledge/tools/earshot_render.py"))
        subprocess.run([py, tool, str(esd / "jobs.json"), str(esd)], check=True, env={**os.environ, "PYTHONPATH": ""})
        for m in info.get("music", []):
            if "_es" in m:
                meta = json.loads((esd / f"{m['_es']['key']}.json").read_text(encoding="utf-8"))
                lead = float(meta.get("peak_s" if m.get("align") == "peak" else "onset_s") or 0)
                m["src"] = str(esd / f"{m['_es']['key']}.wav")
                m["dur"] = float(meta.get("dur_s") or m.get("dur", 3))
                m["from"] = max(0.0, lead - float(m["at"]))          # at 太靠前时从文件中间截
                m["at"] = max(0.0, float(m["at"]) - lead)
                m.setdefault("fade_in", 0.0); m.setdefault("fade_out", 0.02)
                print(f"  earshot {meta.get('id')} → {m['at']:.3f}s（{m.get('align', 'onset')} 对齐，提前 {lead * 1000:.0f} ms）")
    for m in info.get("music", []):
        tmp = B / "_music.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{float(m.get('from', 0)):.3f}", "-t", f"{float(m['dur']):.3f}", "-i", str(m["src"] if Path(m["src"]).is_absolute() else ROOT / m["src"]),"""

OLD_ADD = """            clipa[j0:j1] += a[: j1 - j0] * (g * duck[j0:j1])[:, None]"""
NEW_ADD = """            dk = duck[j0:j1] if m.get("duck", "_es" not in m) else 1.0   # earshot 音效默认不压
            clipa[j0:j1] += a[: j1 - j0] * (g * dk)[:, None]"""


def patch(series_dir):
    p = Path(series_dir) / "cine/tools/finish.py"
    s = p.read_text(encoding="utf-8")
    if MARK in s:
        return False
    if OLD_LOOP not in s or OLD_ADD not in s:
        sys.exit(f"{p}：找不到要替换的配乐循环，finish.py 改过了，patch_earshot.py 要跟着改（先确认已打 music src 相对路径补丁）")
    p.write_text(s.replace(OLD_LOOP, NEW_LOOP, 1).replace(OLD_ADD, NEW_ADD, 1), encoding="utf-8")
    print(f"✓ 补丁：{p}（earshot 代码音效）")
    return True


if __name__ == "__main__":
    patch(sys.argv[1])
