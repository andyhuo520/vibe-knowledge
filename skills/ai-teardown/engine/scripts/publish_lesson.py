#!/usr/bin/env python3
"""把互动课件打包成可发布的自包含目录：字体按用到的字裁剪成 woff2 并内联，脚本与音频作为同目录文件。

用法：python3 scripts/publish_lesson.py <app.js> <audio.mp3> <out_dir> [--title 标题] [--subtitle 副标题] [--facts facts.js]
                                       [--light] [--images 图片目录]
--light：浅色页面与播放器（马卡龙系列课用）。
--images：把 app.js 里用到的图片（按文件名匹配）拷到 <out_dir>/img/，舞台用 imgBase "img/" 加载。
输出 <out_dir>/index.html（不含 html/head/body 外壳，适配 Artifact）、app.js、audio.<扩展名>（Artifact 只收 mp3/wav/ogg/mp4/webm）。
"""
import base64
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = [("Noto Sans SC", "NotoSansSC-VF.ttf"), ("Geist", "Geist-VF.ttf"), ("Geist Mono", "GeistMono-VF.ttf")]


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    app, audio, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    title = arg("--title", "Codex 互动课件样片")
    subtitle = arg("--subtitle", "Spike 样片 · 与视频同一份源文件 · 暂停后可点图看出处")
    facts_js = Path(arg("--facts", "")) if "--facts" in sys.argv else None
    out.mkdir(parents=True, exist_ok=True)
    js = app.read_text(encoding="utf-8")
    # JS 里的中文可能是 \uXXXX 转义，先还原再收集用到的字
    decoded = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), js)
    extra = facts_js.read_text(encoding="utf-8") if facts_js else ""
    chars = set(decoded) | set(extra) | set(title + subtitle) | {chr(c) for c in range(0x20, 0x7F)} | set("‹›▶❚×·—…「」：，。？！")
    text = "".join(sorted(c for c in chars if c.isprintable()))
    faces = []
    with tempfile.TemporaryDirectory() as tmp:
        tf = Path(tmp) / "chars.txt"
        tf.write_text(text, encoding="utf-8")
        fonts = [(f, fn, "100 900") for f, fn in FONTS]
        if "LXGW WenKai" in decoded:   # 手账风用霞鹜文楷（OFL），两档字重
            fonts += [("LXGW WenKai", "LXGWWenKai-Regular.ttf", "100 450"), ("LXGW WenKai", "LXGWWenKai-Medium.ttf", "451 900")]
        for family, fn, wr in fonts:
            dst = Path(tmp) / (Path(fn).stem + ".woff2")
            subprocess.run(["pyftsubset", str(ROOT / "assets/fonts" / fn), f"--text-file={tf}", "--flavor=woff2",
                            "--layout-features=*", f"--output-file={dst}"], check=True)
            b64 = base64.b64encode(dst.read_bytes()).decode()
            faces.append(f'@font-face{{font-family:"{family}";src:url(data:font/woff2;base64,{b64}) format("woff2");font-weight:{wr};font-display:block}}')
            print(f"{family}: {dst.stat().st_size / 1024:.0f} KB")
    shutil.copy(app, out / "app.js")
    light = "--light" in sys.argv
    start_opts = "{}"
    if "--images" in sys.argv:
        img_dir = Path(arg("--images", ""))
        (out / "img").mkdir(exist_ok=True)
        used = [f for f in img_dir.iterdir() if f.is_file() and f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".svg"} and f.name in decoded]
        for f in used:
            shutil.copy(f, out / "img" / f.name)
        print(f"图片 {len(used)} 张 → {out / 'img'}")
        start_opts = '{imgBase: "img/"}'
    # 视频贴纸：按 cues.json 的 videos 登记表把片段拷到 <out>/video/（去音轨、压到 720p 省体积），舞台用 vidBase "video/" 加载
    if "--videos" in sys.argv:
        vids = json.loads(Path(arg("--videos", "")).read_text(encoding="utf-8")).get("videos", [])
        vdir = Path(arg("--vdir", "."))
        if vids:
            (out / "video").mkdir(exist_ok=True)
            for f in sorted({v["file"] for v in vids}):
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(vdir / f), "-an", "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "26",
                                "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out / "video" / f)], check=True)
                jpg = vdir / (Path(f).stem + ".jpg")  # 封面（fx_render 生成的同名 jpg），暂停在开始前时显示
                if jpg.exists():
                    shutil.copy(jpg, out / "video" / jpg.name)
            print(f"视频贴纸 {len({v['file'] for v in vids})} 段 → {out / 'video'}")
            start_opts = start_opts[:-1] + ', vidBase: "video/"}' if start_opts != "{}" else '{vidBase: "video/"}'
    bg, ink, ink2 = ("#FFF8F2", "#2F2A45", "#7A7390") if light else ("#070B18", "#EAF0FF", "#8A96BA")
    audio_name = f"audio{audio.suffix}"
    for old in out.glob("audio.*"):
        old.unlink()
    shutil.copy(audio, out / audio_name)
    html = f"""<meta charset="utf-8">
<title>{title}</title>
<meta name="description" content="{subtitle}">
<style>
{chr(10).join(faces)}
:root{{color-scheme:{"light" if light else "dark"}}}
body{{margin:0;background:{bg};color:{ink}}}
main{{max-width:1400px;margin:0 auto;padding:28px 16px 60px}}
header{{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px;font-family:"Geist","Noto Sans SC",sans-serif}}
h1{{margin:0;font-size:26px;font-weight:700;letter-spacing:.01em}}
header p{{margin:0;color:{ink2};font-size:13px}}
#offstage{{position:absolute;left:-99999px;top:0}}
</style>
<main>
  <header><h1>{title}</h1><p>{subtitle}</p></header>
  <div id="player"></div>
</main>
<div id="offstage" aria-hidden="true"></div>
<audio id="audio" src="{audio_name}" preload="auto"></audio>
{"<script>" + extra + "</script>" if extra else ""}
<script src="app.js"></script>
<script>
  AT.start(document.getElementById("offstage"), {start_opts}).then((stage) => {{
    window.__stage = stage;
    window.__player = AT.mountPlayer(document.getElementById("player"), {{
      stage, audio: document.getElementById("audio"),
      chapters: stage.chapters, captions: stage.captions,
      facts: window.FACTS || {{}}, sources: window.SOURCES || {{}}, light: {"true" if light else "false"},
    }});
  }});
</script>
"""
    (out / "index.html").write_text(html, encoding="utf-8")
    size = sum(p.stat().st_size for p in out.iterdir())
    print(f"→ {out}（共 {size / 1024 / 1024:.1f} MB）")


if __name__ == "__main__":
    main()
