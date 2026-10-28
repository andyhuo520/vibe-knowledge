#!/usr/bin/env python3
"""一节课一条命令：配音 → 按 scenes.json 编排 → 抽帧自查 → 混音 → 渲染 → 课程页用的压缩版与互动版。

用法：
    python3 scripts/make_lesson.py <课目录> voice     # 取图 + MiMo 配音（并行、按文字缓存）+ 逐字对齐 + ASR 回读
    python3 scripts/make_lesson.py <课目录> build     # 按 scenes.json 编排、打包，出一张每个场景一帧的接触表
    python3 scripts/make_lesson.py <课目录> final     # 混音、1080p 渲染、720p 压缩、互动版目录、更新 series.json
    python3 scripts/make_lesson.py <课目录> all       # 以上三步连着跑

课目录（如 examples/ai-intro/lessons/02）里要有：narration.json（旁白与 [[cue]]）、scenes.json（场景模板清单，见 runtime/lesson.js），
可选 images.spec.json（要用的 Wikimedia Commons 图片）、research/（核查账本，互动版「点图看出处」用）。
系列目录（课目录的上两级）里要有 series.json 和 assets/img/。
"""
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NPX = Path.home() / ".npm/_npx/702923228c2ce1e6/node_modules"
ESBUILD = NPX / ".bin/esbuild"
HF = ["node", str(NPX / "hyperframes/dist/cli.js")]
MUSIC = Path.home() / ".claude/skills/promo-video/assets/music"
BGM = ["mixkit-813-magical-moment.mp3", "mixkit-839-tears-of-joy.mp3", "mixkit-587-discover.mp3", "mixkit-173-better-times-are-coming.mp3"]


def run(cmd, **kw):
    print("  $", " ".join(str(c) for c in cmd)[:160])
    subprocess.run([str(c) for c in cmd], check=True, **kw)


def step(name):
    print(f"\n== {name}（{time.strftime('%H:%M:%S')}）")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    L = Path(sys.argv[1]).resolve()
    what = sys.argv[2]
    series_dir = L.parent.parent
    img_dir = series_dir / "assets/img"
    build = L / "build"
    build.mkdir(exist_ok=True)
    nn = L.name
    t0 = time.time()

    if what in ("voice", "all"):
        if (L / "images.spec.json").exists():
            step("取图")
            run(["python3", ROOT / "scripts/fetch_images.py", L / "images.spec.json", img_dir])
        step("配音")
        run(["python3", ROOT / "scripts/tts_mimo.py", L / "narration.json", build, "--gap", "0.8", "--lead", "0.6", "--qa", "--jobs", "2"])

    if what in ("build", "all"):
        sp = json.loads((L / "scenes.json").read_text(encoding="utf-8")).get("speed")
        if sp or (build / "timings.orig.json").exists():
            step("配音变速")
            run(["python3", ROOT / "scripts/speed.py", L, str(sp or 1)])
        step("编排与打包")
        recs = sorted((L / "rec").glob("*.frames.json")) if (L / "rec").exists() else []
        (build / "recs.gen.js").write_text("".join(f'import r{i} from "../rec/{r.name}";\n' for i, r in enumerate(recs))
            + "export default {" + ", ".join(f'"{r.name[:-len(".frames.json")]}": r{i}' for i, r in enumerate(recs)) + "};\n", encoding="utf-8")
        rel = lambda p: Path(*[".."] * (len(build.relative_to(ROOT).parts))) / p
        ex = [("lottie", f) for f in sorted((L / "lottie").glob("*.json"))] + [("data", f) for f in sorted((L / "data").glob("*.json"))] + [("illus", f) for f in sorted((L / "illus").glob("*.svg"))]
        fxm = series_dir / "assets/fx/fx.json"   # 视频贴纸清单（scripts/fx_render.py 生成）：时长、尺寸、封面
        (build / "extra.gen.js").write_text("".join(f'import x{i} from "../{k}/{f.name}";\n' for i, (k, f) in enumerate(ex))
            + ('import fxm from "../../../assets/fx/fx.json";\n' if fxm.exists() else "")
            + "export default {" + ", ".join(f'{k}: {{' + ", ".join(f'"{f.stem}": x{i}' for i, (kk, f) in enumerate(ex) if kk == k) + "}" for k in ("lottie", "data", "illus"))
            + (", fx: fxm" if fxm.exists() else "") + "};\n", encoding="utf-8")
        engine = json.loads((L / "scenes.json").read_text(encoding="utf-8")).get("engine", "lesson")   # "sketch" = 手账风（runtime/sketch.js）
        (build / "entry.gen.js").write_text(f"""import {{ buildLesson }} from "{rel(f'runtime/{engine}.js').as_posix()}";
import {{ mountPlayer }} from "{rel('runtime/hosts/player.js').as_posix()}";
import {{ registerIcons }} from "{rel('runtime/iconify.js').as_posix()}";
import timings from "./timings.json";
import images from "../../../assets/img/images.json";
import spec from "../scenes.json";
import icons from "./icons.json";
import recs from "./recs.gen.js";
import extra from "./extra.gen.js";
registerIcons(icons);
window.AT = {{
  timings, images, spec, mountPlayer,
  async start(root, opts = {{}}) {{
    await Promise.all(["400", "500", "600", "650", "700", "750", "800"].flatMap((w) => [
      document.fonts.load(`${{w}} 40px "Noto Sans SC"`, "测试"), document.fonts.load(`${{w}} 40px "Geist"`, "AI 1950"),
      document.fonts.load(`${{w}} 40px "LXGW WenKai"`, "测试 AI")]));
    const stage = buildLesson(root, {{ spec, timings, images, recs, extra, ...opts }});
    await Promise.all([...root.querySelectorAll("img")].map((im) => im.decode().catch(() => {{}})));
    stage.seek(stage.t);
    return stage;
  }},
}};
""", encoding="utf-8")
        fonts = Path(*[".."] * len(L.relative_to(ROOT).parts)) / "assets/fonts"
        (L / "preview.html").write_text(f"""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>{nn} preview</title><style>
@font-face{{font-family:"Noto Sans SC";src:url("{fonts.as_posix()}/NotoSansSC-VF.ttf") format("truetype");font-weight:100 900}}
@font-face{{font-family:"Geist";src:url("{fonts.as_posix()}/Geist-VF.ttf") format("truetype");font-weight:100 900}}
@font-face{{font-family:"Geist Mono";src:url("{fonts.as_posix()}/GeistMono-VF.ttf") format("truetype");font-weight:100 900}}
@font-face{{font-family:"LXGW WenKai";src:url("{fonts.as_posix()}/LXGWWenKai-Regular.ttf") format("truetype");font-weight:100 450}}
@font-face{{font-family:"LXGW WenKai";src:url("{fonts.as_posix()}/LXGWWenKai-Medium.ttf") format("truetype");font-weight:451 900}}
html,body{{margin:0;background:#000}}</style></head><body><div id="root"></div><script src="build/film.js"></script>
<script>window.__ready = AT.start(document.getElementById("root")).then((s) => (window.__stage = s));</script></body></html>
""", encoding="utf-8")
        run(["python3", ROOT / "scripts/icons.py", build / "icons.json", L / "scenes.json", ROOT / "runtime/lesson.js", ROOT / "primitives"])
        run([ESBUILD, build / "entry.gen.js", "--bundle", "--loader:.svg=text", "--format=iife", "--target=chrome120", f"--outfile={build / 'film.js'}", "--log-level=warning"])
        # 接触表：每个场景两帧
        step("抽帧自查")
        probe = subprocess.run(["node", "-e", f"""
const t = require("{(build / 'timings.json').as_posix()}"), s = require("{(L / 'scenes.json').as_posix()}");
const T = t.beats; const out = [];
for (const sc of s.scenes) {{
  const m = /^(B\\d+)(?:\\.([a-z0-9_]+(?:-[a-z][a-z0-9_]*)*)|@([^+]+?))?([+-]\\d+(?:\\.\\d+)?)?$/.exec(sc.at);
  const b = T[m[1]]; let v = m[2] === "end" ? b.end : m[2] ? b.cues[m[2]] : m[3] ? b.chars[b.text.indexOf(m[3])] : b.start;
  out.push(v + (m[4] ? parseFloat(m[4]) / (t.speed || 1) : 0));
}}
// 每个场景两帧：进场后 2.5 秒、场景的 70% 处（元素基本出齐）
const ts = [];
out.forEach((v, i) => {{ const end = i + 1 < out.length ? out[i + 1] : t.total; ts.push((v + 2.5).toFixed(2), (v + (end - v) * 0.7).toFixed(2)); }});
console.log(ts.join(" "));
process.exit(0);
console.log(out.join(" "));
"""], capture_output=True, text=True, check=True).stdout.split()
        run(["python3", ROOT / "scripts/stills.py", L / "preview.html", build / "stills/scenes.png", *probe, "--cols", "6"])

    if what in ("final", "all"):
        step("混音")
        run(["python3", ROOT / "scripts/export_cues.py", L / "preview.html", build / "cues.json"])
        run(["python3", ROOT / "scripts/mix.py", build / "narration.wav", build / "cues.json", build / "mix.wav",
             "--bgm", ",".join(str(MUSIC / b) for b in BGM), "--bgm-gain", "-24"])
        run(["ffmpeg", "-v", "error", "-y", "-i", build / "mix.wav", "-ac", "1", "-b:a", "96k", build / "mix.mp3"])
        step("渲染 1080p")
        cid = f"{series_dir.name}-l{nn}"
        bg = {"mint": "#F0FAF6", "night": "#1D1A2C", "editorial": "#ECEAE6", "paper": "#FBF7EE"}.get(json.loads((L / "scenes.json").read_text(encoding="utf-8")).get("theme"), "#FFF8F2")
        if json.loads((L / "scenes.json").read_text(encoding="utf-8")).get("skin") == "notion":
            bg = "#FFFFFF"
        run(["python3", ROOT / "scripts/hf_host.py", build / "film.js", build / "mix.wav", build / "timings.json", L / "hf", "--id", cid, "--images", img_dir, "--bg", bg,
             "--videos", build / "cues.json", "--vdir", series_dir / "assets/fx"])
        mp4 = L / "hf/renders" / f"lesson{nn}.mp4"
        run([*HF, "render", "--quality", "high", "--output", f"renders/lesson{nn}.mp4"], cwd=L / "hf")
        step("课程页压缩版与互动版")
        pub = series_dir / "publish/course"
        pub.mkdir(parents=True, exist_ok=True)   # 新系列第一次出片时还没有课程页目录
        run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "28",
             "-tune", "animation", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-ac", "1", "-movflags", "+faststart", pub / f"lesson{nn}.mp4"])
        run(["ffmpeg", "-v", "error", "-y", "-ss", "20", "-i", mp4, "-frames:v", "1", "-vf", "scale=1280:-1", "-q:v", "3", pub / f"lesson{nn}.jpg"])
        spec = json.loads((L / "scenes.json").read_text(encoding="utf-8"))
        if spec.get("videoOnly"):   # 只要成片（如英文版）：不做互动版、不动课程页
            print(f"\n成片：{mp4}\n压缩版：{pub / f'lesson{nn}.mp4'}")
            print(f"\n完成「{what}」，用时 {(time.time() - t0) / 60:.1f} 分钟")
            return
        facts = []
        if (L / "research/facts.json").exists():
            run(["python3", ROOT / "scripts/facts_js.py", L / "research", build / "facts.js", "--images", img_dir / "images.json"])
            facts = ["--facts", build / "facts.js"]
        spec = json.loads((L / "scenes.json").read_text(encoding="utf-8"))
        run(["python3", ROOT / "scripts/publish_lesson.py", build / "film.js", build / "mix.mp3", series_dir / f"publish/lesson{nn}", *facts, "--light", "--images", img_dir,
             "--videos", build / "cues.json", "--vdir", series_dir / "assets/fx",
             "--title", spec.get("title", nn), "--subtitle", f"{spec.get('series', 'AI 入门课')} · 第 {spec.get('n', nn)} 节 · 暂停后可以点图看原文出处"])
        # 课程页数据：挂上这一节的视频
        total = json.loads((build / "timings.json").read_text(encoding="utf-8"))["total"]
        sj = series_dir / "series.json"
        S = json.loads(sj.read_text(encoding="utf-8"))
        les = next(l for l in S["lessons"] if int(l.get("n", 0)) == int(nn))   # 按课号找（第二季有第 0 节课程地图）
        les.update({"video": f"lesson{nn}.mp4", "poster": f"lesson{nn}.jpg", "length": f"{int(total // 60)} 分 {int(total % 60)} 秒"})
        les.pop("state", None)
        sj.write_text(json.dumps(S, ensure_ascii=False, indent=1), encoding="utf-8")
        run(["python3", ROOT / "scripts/course_page.py", sj, pub])
        print(f"\n成片：{mp4}\n课程页压缩版：{pub / f'lesson{nn}.mp4'}\n互动版目录：{series_dir / f'publish/lesson{nn}'}")

    print(f"\n完成「{what}」，用时 {(time.time() - t0) / 60:.1f} 分钟")


if __name__ == "__main__":
    main()
