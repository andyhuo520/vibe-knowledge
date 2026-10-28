#!/usr/bin/env python3
"""首次使用介绍：生成本地「风格图鉴」网页并标记已介绍。
用法：python3 welcome.py            # 没介绍过才生成并打开（~/.vibe-knowledge/welcomed 不存在时）
      python3 welcome.py --force    # 不管有没有介绍过，都重新生成并打开（风格库更新后用）
      python3 welcome.py --no-open  # 只生成不打开
输出：~/Desktop/vibe-knowledge/风格图鉴/index.html（风格图、快闪片、样片拷到同目录，相对路径引用，整个文件夹可以直接发给别人）。"""
import html, json, re, shutil, subprocess, sys
from pathlib import Path

SK = Path(__file__).resolve().parents[1]
CAT = json.loads((SK / "styles/catalog.json").read_text(encoding="utf-8"))
MARK = Path.home() / ".vibe-knowledge/welcomed"
OUT = Path.home() / "Desktop/vibe-knowledge/风格图鉴"
VID = Path.home() / "Desktop/Vibe知识大赏_视频"
REEL = VID / "风格快闪_42s_八家族.mp4"          # 风格快闪片（promo-video 出片后放这里；旧版 风格快闪_30s.mp4 只有 7 套）
POSTER_AT = {"风格快闪_42s_八家族.mp4": 20.4, "风格快闪_30s.mp4": 4.5, "styles_风格样片集.mp4": 14.5, "styles2_风格样片集_剪辑与纪实.mp4": 15.0, "styles3_风格样片集_补空白家族.mp4": 7.4, "styles4_风格样片集_增强档东方与印刷.mp4": 7.4, "styles5_风格样片集_第五批.mp4": 7.4, "styles6_风格样片集_第六批.mp4": 7.4, "styles7_风格样片集_第七批增强档.mp4": 7.4, "styles8_风格样片集_田园像素.mp4": 7.0, "styles9_风格样片集_第九批.mp4": 7.4, "styles10_风格样片集_手绘过程.mp4": 7.6, "01_商鞅立木.mp4": 58.0}
SAMPLES = {"styles": VID / "styles_风格样片集.mp4", "styles2": VID / "styles2_风格样片集_剪辑与纪实.mp4", "styles3": VID / "styles3_风格样片集_补空白家族.mp4", "styles4": VID / "styles4_风格样片集_增强档东方与印刷.mp4", "styles5": VID / "styles5_风格样片集_第五批.mp4", "styles6": VID / "styles6_风格样片集_第六批.mp4", "styles7": VID / "styles7_风格样片集_第七批增强档.mp4", "styles8": VID / "styles8_风格样片集_田园像素.mp4", "styles9": VID / "styles9_风格样片集_第九批.mp4", "styles10": VID / "styles10_风格样片集_手绘过程.mp4", "ep01": VID / "01_商鞅立木.mp4"}


def field(md, name):
    m = re.search(rf"\|\s*{name}\s*\|\s*(.+?)\s*\|", md)
    return m.group(1) if m else ""


def main():
    if MARK.exists() and "--force" not in sys.argv:
        print(f"已介绍过（{MARK}）；要重新生成用 --force"); return
    (OUT / "img").mkdir(parents=True, exist_ok=True); (OUT / "video").mkdir(exist_ok=True)
    cards, fams = {}, CAT.get("families") or sorted({x.get("fam", x["cat"]) for x in CAT["styles"]})
    for s in CAT["styles"]:
        md = (SK / "styles" / s["key"] / "STYLE.md").read_text(encoding="utf-8")
        shutil.copy(SK / "styles" / s["key"] / "still.jpg", OUT / "img" / f"{s['key']}.jpg")
        tpl = "、".join(f"{t} {CAT['templates'][t].split('（')[0]}" for t in s["templates"])
        tier = '<span class="tier">增强档 · 需生图</span>' if s.get("tier") == "增强" else ""
        cards.setdefault(s.get("fam", s["cat"]), []).append(f"""<article class="card"><img src="img/{s['key']}.jpg" alt="{html.escape(s['name'])} 风格图" loading="lazy">
<div class="meta"><div class="no">{s['no']:02d} · {html.escape(s.get('fam', s['cat']))} {tier}</div><h3>{html.escape(s['name'])} <span>{html.escape(s['en'])}</span></h3>
<p class="one">{html.escape(s['one'])}</p><dl><dt>适合</dt><dd>{html.escape(s['fit'])}</dd><dt>搭配母版</dt><dd>{html.escape(tpl)}</dd>
<dt>标志镜头</dt><dd>{html.escape(field(md, '标志镜头'))}</dd><dt>样片</dt><dd>{html.escape(s.get('sample', ''))}</dd></dl></div></article>""")
    vids = []
    for name, p in [("风格快闪 42 秒 · 8 个家族", REEL), ("5 套视觉系统样片", SAMPLES["styles"]), ("剪辑与纪实 2 套样片", SAMPLES["styles2"]), ("补空白家族 8 套样片（0 积分）", SAMPLES["styles3"]), ("增强档东方与印刷 4 套样片", SAMPLES["styles4"]), ("第五批 8 套样片（0 积分）", SAMPLES["styles5"]), ("第六批 8 套样片（0 积分）", SAMPLES["styles6"]), ("增强档长卷 · 铜版博物", SAMPLES["styles7"]), ("田园像素（星露谷式）", SAMPLES["styles8"]), ("第九批 5 套样片（0 积分）", SAMPLES["styles9"]), ("手绘过程（画给你看）", SAMPLES["styles10"]), ("第 01 期成片《商鞅立木》", SAMPLES["ep01"])]:
        if p.exists():
            shutil.copy(p, OUT / "video" / p.name)
            poster = OUT / "video" / (p.stem + ".jpg")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(POSTER_AT.get(p.name, 3)), "-i", str(p), "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "3", str(poster)], check=False)
            vids.append(f'<figure><video src="video/{html.escape(p.name)}" poster="video/{html.escape(poster.name)}" controls preload="none"></video><figcaption>{html.escape(name)}</figcaption></figure>')
    tpls = "".join(f"<li><b>{k}</b> {html.escape(v)}</li>" for k, v in CAT["templates"].items())
    page = f"""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>风格图鉴 · Vibe知识大赏</title><style>
:root{{--bg:#0d0c0b;--card:#17151a;--ink:#f2efe8;--dim:#a39d94;--line:rgba(255,255,255,.1);--acc:#e2b45a}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#f6f3ee;--card:#fff;--ink:#1d1b18;--dim:#6f6a62;--line:rgba(0,0,0,.1);--acc:#b0802a}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,"PingFang SC","Noto Sans SC",sans-serif}}
main{{max-width:1180px;margin:0 auto;padding:48px 16px 80px}}h1{{font-size:clamp(32px,6vw,56px);margin:0 0 8px;letter-spacing:2px}}
.lead{{color:var(--dim);max-width:760px}}h2{{margin:56px 0 16px;font-size:26px}}
.vids{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr));gap:16px}}video{{width:100%;border-radius:12px;background:#000}}
figcaption{{color:var(--dim);font-size:14px;margin-top:6px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:18px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}}.card img{{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}}
.meta{{padding:16px 18px 20px}}.no{{color:var(--acc);font-size:13px;letter-spacing:2px}}h3{{margin:4px 0 6px;font-size:22px}}h3 span{{color:var(--dim);font-size:13px;letter-spacing:2px;font-weight:500}}
.one{{margin:0 0 10px}}dl{{display:grid;grid-template-columns:72px 1fr;gap:4px 10px;margin:0;font-size:14px}}dt{{color:var(--dim)}}dd{{margin:0}}
.how{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}}.box{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px}}
.box h4{{margin:0 0 8px;font-size:17px}}.tier{{display:inline-block;margin-left:6px;padding:0 8px;border-radius:10px;background:var(--acc);color:var(--bg);font-size:11px;letter-spacing:1px}}h2 small{{color:var(--dim);font-size:15px;font-weight:500;margin-left:8px}}code{{background:rgba(127,127,127,.15);padding:1px 6px;border-radius:5px}}ul{{padding-left:20px;margin:0}}
</style></head><body><main>
<h1>风格图鉴</h1><p class="lead">一期知识短片 = <b>母版</b>（怎么讲）× <b>风格</b>（长什么样）× <b>档位</b>（0 积分代码画面，或用 Renoise 增强写实镜头）。下面 {len(CAT['styles'])} 套风格分成 {len(fams)} 个家族，都已用同一段开场实际渲染过；说一个选题，会按选题推荐其中 3 套。</p>
<h2>先看片</h2><div class="vids">{''.join(vids) or '<p class="lead">（样片尚未生成）</p>'}</div>
{''.join(f'<h2>{html.escape(f)}<small>{len(cards.get(f, []))} 套</small></h2><div class="grid">' + ''.join(cards.get(f, [])) + '</div>' for f in fams if cards.get(f))}
<h2>怎么开口</h2><div class="how">
<div class="box"><h4>只给选题</h4><p>「做一期乌江亭长」——推荐 3 套风格（推荐第一的排第一，附理由和风格图），你挑一套。</p></div>
<div class="box"><h4>点名风格</h4><p>「用水墨纸本做一期王安石变法」——直接按这套风格开工。</p></div>
<div class="box"><h4>改成自己的风格</h4><p>「把古风改成我的品牌色」或「从空白做一个黑板粉笔风」——一题一问定方案，出并排风格图和 15–30 秒 demo，你点头才存成「我的风格」。</p></div>
</div>
<h2>两档</h2><div class="how">
<div class="box"><h4>基础档 · 0 积分</h4><p>标「增强档」以外的风格都能做。代码画面（Opus 手写插画 + 动效）、小米 MiMo 配音、曲库配乐、earshot 代码音效。</p></div>
<div class="box"><h4>增强档 · 按镜头挑</h4><p>只把写实场景和最需要被记住的 1–3 个时刻交给 Renoise（配图 / 动态镜头 / 定制配乐 / 音效）。轻 ≈25–40、标准 ≈250–300、旗舰 ≈600–700 积分，每次先报价、你确认才生成。</p></div>
</div>
<h2>6 种母版</h2><div class="box"><ul>{tpls}</ul></div>
<h2>每期流程</h2><div class="box"><p>① 选题 + 母版 + 风格 + 档位 → ② 事实清单（每条对原文）→ ③ 旁白稿 + 独立审稿 → ④ 分镜 / 报价 → ⑤ 开场试听定音色语速 → ⑥ 配音、画面、渲染 → ⑦ 质检（文字回读核对事实、响度）→ ⑧ 发布包（标题、话题、两张封面）。</p></div>
</main></body></html>"""
    (OUT / "index.html").write_text(page, encoding="utf-8")
    MARK.parent.mkdir(parents=True, exist_ok=True); MARK.write_text("1", encoding="utf-8")
    print(f"→ {OUT / 'index.html'}（{sum(len(v) for v in cards.values())} 套风格 / {len(cards)} 个家族，{len(vids)} 支视频）")
    if "--no-open" not in sys.argv:
        subprocess.run(["open", str(OUT / "index.html")], check=False)


if __name__ == "__main__":
    main()
