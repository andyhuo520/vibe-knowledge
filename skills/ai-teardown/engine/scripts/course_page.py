#!/usr/bin/env python3
"""系列课程页：把 series.json 渲染成一个自包含的 HTML 页面（发布成 Artifact）。

用法：python3 scripts/course_page.py <series.json> <输出目录>

同一个页面贯穿整个系列的生命周期：
    draft      方案待确认：样片、主题、配音试听、几套大纲草案、待确认的问题
    confirmed  大纲已定：每节课的介绍，视频位显示「制作中」
    done       每节课挂上视频
页面里引用的视频、图片、音频都放在输出目录，发布时作为附属文件一起传。
"""
import html
import json
import re
import sys
from pathlib import Path

E = html.escape

CSS = r"""
.route{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;counter-reset:st}
.stop{position:relative;background:var(--surface);border-radius:20px;padding:18px 20px;border:2px solid var(--line)}
.stop h3{font-size:19px;margin:0 0 2px}.stop .rg{font-size:13px;font-weight:700;letter-spacing:.04em}
.stop ol{margin:10px 0 8px;padding-left:1.2em;font-size:15px;color:var(--ink2)}
.stop .get{font-size:14px;background:var(--surface2);border-radius:12px;padding:8px 12px;margin:0}
.stop:not(:last-child)::after{content:"→";position:absolute;right:-13px;top:44%;font-size:22px;color:var(--ink3)}
@media (max-width:860px){.route{grid-template-columns:1fr}.stop::after{display:none}}
.ovid{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0}
.ovid a{display:flex;flex-direction:column;gap:4px;width:220px;font-size:14px;text-decoration:none;color:var(--ink)}
.ovid img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--line)}

.more-box{margin-top:8px;border-top:1.5px dashed var(--line);padding-top:6px}
.more-box details{border-radius:12px;margin:4px 0}
.more-box summary{cursor:pointer;font-weight:700;font-size:15px;padding:6px 2px;color:var(--ink)}
.guide{font-size:15px;line-height:1.75;color:var(--ink)}
.guide h1,.guide h2,.guide h3{font-size:17px;margin:16px 0 6px}
.guide pre{position:relative;background:#1B1F2A;color:#E4E8F1;border-radius:12px;padding:12px 14px;overflow-x:auto;font:13.5px/1.55 "Geist Mono",Menlo,monospace}
.guide code{font-family:"Geist Mono",Menlo,monospace;font-size:.92em}
.guide :not(pre)>code{background:var(--surface2);padding:1px 6px;border-radius:6px}
.guide table{border-collapse:collapse;font-size:14px;margin:8px 0;display:block;overflow-x:auto}
.guide td,.guide th{border:1px solid var(--line);padding:5px 8px;text-align:left}
.copy{position:absolute;top:8px;right:8px;font:600 12px/1 inherit;border:0;border-radius:8px;padding:6px 9px;background:#2F3645;color:#DCE3F0;cursor:pointer}
.quiz{list-style:none;padding:0;margin:4px 0;display:grid;gap:10px}
.quiz li{background:var(--surface2);border-radius:12px;padding:10px 14px;font-size:15px}
.quiz .ch{display:flex;flex-direction:column;gap:2px;margin:6px 0;color:var(--ink2)}
.quiz details summary{font-size:14px;color:var(--m6)}
.reading{margin:4px 0;padding-left:1.1em;font-size:15px}
.reading span{color:var(--ink3)}

:root{
  --bg:#FFF8F2;--surface:#FFFFFF;--surface2:#FFF1E8;--line:#EEDFD5;
  --ink:#2F2A45;--ink2:#5B5573;--ink3:#7A7390;
  --m1:#C23A6D;--m1t:#FFE2EE;--m2:#BF5620;--m2t:#FFE6D6;--m3:#8C6A00;--m3t:#FFF4C9;
  --m4:#1B8558;--m4t:#D9F5E7;--m5:#2A6CBF;--m5t:#DCEEFF;--m6:#6548CC;--m6t:#EAE4FF;
  --dot:rgba(47,42,69,.07);--shadow:0 14px 36px rgba(94,72,130,.10);
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  color-scheme:dark;--bg:#1D1A2C;--surface:#28243B;--surface2:#312C48;--line:#3E3858;
  --ink:#F5F2FF;--ink2:#C4BDDD;--ink3:#A39CBF;
  --m1:#FFC2D9;--m1t:rgba(255,159,195,.16);--m2:#FFD0B5;--m2t:rgba(255,180,138,.16);--m3:#FBE39A;--m3t:rgba(245,207,91,.14);
  --m4:#B5EDD0;--m4t:rgba(134,217,176,.15);--m5:#BCDBFA;--m5t:rgba(140,194,244,.15);--m6:#D6CCFA;--m6t:rgba(183,166,244,.17);
  --dot:rgba(255,255,255,.05);--shadow:0 14px 36px rgba(0,0,0,.35)}}
:root[data-theme="dark"]{
  color-scheme:dark;--bg:#1D1A2C;--surface:#28243B;--surface2:#312C48;--line:#3E3858;
  --ink:#F5F2FF;--ink2:#C4BDDD;--ink3:#A39CBF;
  --m1:#FFC2D9;--m1t:rgba(255,159,195,.16);--m2:#FFD0B5;--m2t:rgba(255,180,138,.16);--m3:#FBE39A;--m3t:rgba(245,207,91,.14);
  --m4:#B5EDD0;--m4t:rgba(134,217,176,.15);--m5:#BCDBFA;--m5t:rgba(140,194,244,.15);--m6:#D6CCFA;--m6t:rgba(183,166,244,.17);
  --dot:rgba(255,255,255,.05);--shadow:0 14px 36px rgba(0,0,0,.35)}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:16px/1.7 "Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  background-image:radial-gradient(var(--dot) 1.4px,transparent 1.6px);background-size:28px 28px;padding-inline:20px}
.wrap{max-width:1080px;margin:0 auto;padding-block:40px 80px}
.num,.mono{font-family:"Geist","Noto Sans SC",sans-serif;font-variant-numeric:tabular-nums}
h1,h2,h3{text-wrap:balance;margin:0}
a{color:var(--m6)}
a:focus-visible,button:focus-visible{outline:3px solid var(--m6);outline-offset:2px;border-radius:8px}
.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:32px;align-items:end;padding-bottom:28px;border-bottom:2px dashed var(--line)}
.pill{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;letter-spacing:.06em;padding:5px 12px;border-radius:999px;background:var(--m6t);color:var(--m6)}
.pill i{width:8px;height:8px;border-radius:50%;background:currentColor;display:block}
.hero h1{font-size:clamp(44px,7vw,76px);font-weight:900;line-height:1.05;margin:14px 0 12px;letter-spacing:.01em}
.hero h1 b{background:linear-gradient(transparent 62%,var(--m3t) 62%);font-weight:900}
.lede{font-size:18px;color:var(--ink2);max-width:36em;margin:0}
.byline{margin:14px 0 0;font-size:15px;color:var(--ink3)}.byline b{color:var(--ink);font-weight:700}
.facts{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0;font-size:15px;background:var(--surface);border-radius:20px;padding:18px 22px;box-shadow:var(--shadow)}
.facts dt{color:var(--ink3);font-weight:600}
.facts dd{margin:0;font-weight:600}
.facts .tbd{color:var(--m2)}
section{padding-top:48px}
.sh{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.sh h2{font-size:28px;font-weight:800}
.sh p{margin:0;color:var(--ink2)}
.video{position:relative;border-radius:22px;overflow:hidden;box-shadow:var(--shadow);background:var(--surface2);aspect-ratio:16/9;max-width:100%}
.video video{display:block;width:100%;height:100%}
.changes{list-style:none;padding:0;margin:20px 0 0;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.changes li{background:var(--surface);border-radius:18px;padding:16px 18px;border:1.5px solid var(--line)}
.changes .k{display:block;font-size:13px;font-weight:700;letter-spacing:.06em;margin-bottom:4px}
.changes p{margin:0;font-size:15px;color:var(--ink2)}
.themes{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.theme{margin:0;background:var(--surface);border-radius:18px;padding:10px;border:1.5px solid var(--line)}
.theme img{display:block;border-radius:10px;aspect-ratio:16/9;object-fit:cover;width:100%}
.theme figcaption{display:flex;justify-content:space-between;gap:8px;padding:8px 4px 2px;font-weight:700;font-size:15px}
.theme figcaption span{color:var(--ink3);font-weight:500;font-size:13px}
.voices{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.voice{display:flex;align-items:center;gap:14px;background:var(--surface);border-radius:18px;padding:12px 14px;border:1.5px solid var(--line)}
.voice button{flex:none;width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;background:var(--m6t);color:var(--m6)}
.voice button svg{width:20px;height:20px}
.voice b{display:block;font-size:16px}
.voice span{font-size:13px;color:var(--ink3)}
.voice.on{border-color:var(--m6)}
.voice.pick{background:var(--m6t);border-color:var(--m6)}
.vg{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;font-size:17px;margin:22px 0 10px}
.vg span{font-size:14px;font-weight:500;color:var(--ink3)}
.note+.vg{margin-top:18px}
.note{margin-top:4px;background:var(--m3t);border-radius:16px;padding:14px 18px;font-size:15px;color:var(--ink)}
.note b{color:var(--m3)}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.tabs button{font:inherit;font-weight:700;border:1.5px solid var(--line);background:var(--surface);color:var(--ink2);padding:8px 16px;border-radius:999px;cursor:pointer}
.tabs button[aria-selected="true"]{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.plan-head{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:baseline;margin-bottom:14px;color:var(--ink2)}
.plan-head h3{font-size:22px;color:var(--ink)}
.lessons{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.lesson{background:var(--surface);border-radius:20px;padding:18px 20px 16px;border:1.5px solid var(--line);display:flex;flex-direction:column;gap:8px}
.lesson .top{display:flex;gap:12px;align-items:flex-start}
.lesson .n{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:18px}
.lesson h4{margin:0;font-size:19px;line-height:1.35}
.lesson .hook{margin:2px 0 0;color:var(--m6);font-weight:600;font-size:15px}
.lesson ul{margin:0;padding-left:1.1em;color:var(--ink2);font-size:15px}
.lesson .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:4px}
.tag{font-size:12.5px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--surface2);color:var(--ink2)}
.tag.src{background:transparent;border:1px solid var(--line);color:var(--ink3)}
.lesson .vid{margin-top:6px}
.lesson .vid video{width:100%;border-radius:12px;display:block}
.lesson .pending{font-size:13px;color:var(--ink3)}
.lesson.has-video{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);column-gap:22px;align-items:start}
.lesson.has-video .vid{grid-column:2;grid-row:1/span 5;margin:0}
.vmeta{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:10px;font-size:14px}
.tag.done{background:var(--m4t);color:var(--m4)}
.vmeta .more{font-weight:600;text-decoration:none}
@media (max-width:860px){.lesson.has-video{display:flex}.lesson.has-video .vid{margin-top:6px}}
.srcs{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,1fr);gap:8px 20px;font-size:14.5px}
.srcs li{display:flex;gap:10px;align-items:baseline}
.tier{flex:none;font-size:12px;font-weight:800;padding:1px 7px;border-radius:6px;background:var(--m4t);color:var(--m4)}
.tier.T2{background:var(--m5t);color:var(--m5)}.tier.T3{background:var(--surface2);color:var(--ink3)}
.srcs .miss{color:var(--ink3)}
.qs{list-style:none;padding:0;margin:0;display:grid;gap:12px;counter-reset:q}
.qs li{background:var(--surface);border-radius:18px;padding:16px 20px;border:1.5px solid var(--line)}
.qs b{font-size:17px}
.qs .opts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.qs .opts span{font-size:14px;padding:5px 12px;border-radius:999px;background:var(--surface2);color:var(--ink2)}
.qs .opts span.rec{background:var(--m6t);color:var(--m6);font-weight:700}
footer{margin-top:56px;color:var(--ink3);font-size:13px;border-top:2px dashed var(--line);padding-top:16px}
@media (max-width:860px){.hero{grid-template-columns:1fr}.changes,.voices{grid-template-columns:1fr 1fr}.themes{grid-template-columns:1fr 1fr}.lessons,.srcs{grid-template-columns:1fr}}
@media (max-width:520px){.changes,.voices,.themes{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
"""

JS = r"""
document.querySelectorAll(".guide pre").forEach((pre)=>{const b=document.createElement("button");b.className="copy";b.type="button";b.textContent="复制";b.onclick=async()=>{try{await navigator.clipboard.writeText(pre.innerText.replace(/复制$/,"").trim());b.textContent="已复制";}catch(e){b.textContent="请手动选择";}setTimeout(()=>b.textContent="复制",1500);};pre.append(b);});

document.querySelectorAll('[role=tablist]').forEach((tl) => {
  const tabs = [...tl.querySelectorAll('[role=tab]')];
  const show = (id) => tabs.forEach((b) => { const on = b.dataset.plan === id; b.setAttribute('aria-selected', on); document.getElementById('plan-' + b.dataset.plan).hidden = !on; });
  tabs.forEach((b) => b.addEventListener('click', () => { show(b.dataset.plan); try { localStorage.setItem('plan', b.dataset.plan); } catch (e) {} }));
  let saved = null; try { saved = localStorage.getItem('plan'); } catch (e) {}
  if (saved && tabs.some((b) => b.dataset.plan === saved)) show(saved);
});
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
let cur = null;
document.querySelectorAll('.voice').forEach((v) => {
  const a = v.querySelector('audio'), b = v.querySelector('button');
  b.innerHTML = PLAY;
  b.addEventListener('click', () => {
    if (cur && cur !== a) { cur.pause(); cur.currentTime = 0; }
    if (a.paused) { a.play(); cur = a; } else { a.pause(); }
  });
  a.addEventListener('play', () => { b.innerHTML = PAUSE; v.classList.add('on'); b.setAttribute('aria-label', '暂停'); });
  a.addEventListener('pause', () => { b.innerHTML = PLAY; v.classList.remove('on'); b.setAttribute('aria-label', '试听'); });
});
"""

COLORS = ["m6", "m1", "m5", "m4", "m2", "m3"]


LESSON_DIR = None   # main() 里设成 <系列目录>/lessons


def extras_html(n):
    """每节的图文步骤（steps.md）、课后三问 / 动手练习 / 延伸阅读（extras.json），都折叠放在卡片底部。"""
    if not LESSON_DIR:
        return ""
    L = LESSON_DIR / f"{n:02d}"
    out = []
    if (L / "steps.md").exists():
        import markdown
        md = (L / "steps.md").read_text(encoding="utf-8")
        md = re.sub(r"\s*[〔\[](?:[XFCTOD][\w-]*\d[\w、,，\s–-]*)[〕\]]", "", md)   # 去掉给编辑看的依据编号
        out.append(f'<details><summary>图文步骤：照着敲</summary><div class="guide">{markdown.markdown(md, extensions=["fenced_code", "tables"])}</div></details>')
    if (L / "extras.json").exists():
        X = json.loads((L / "extras.json").read_text(encoding="utf-8"))
        if X.get("quiz"):
            qs = "".join(f'<li><b>{E(q["q"])}</b><div class="ch">' + "".join(f"<span>{chr(65 + k)}. {E(c)}</span>" for k, c in enumerate(q.get("choices", [])))
                         + f'</div><details><summary>看答案</summary>{chr(65 + q["answer"]) + "。" if isinstance(q.get("answer"), int) else ""}{E(q.get("why", ""))}</details></li>' for q in X["quiz"])
            out.append(f'<details><summary>课后三问</summary><ol class="quiz">{qs}</ol></details>')
        if X.get("practice"):
            pr = X["practice"]
            st = "".join(f"<li>{E(x)}</li>" for x in pr.get("steps", []))
            out.append(f'<details><summary>{E(pr.get("title", "动手练习"))}</summary><ol class="reading">{st}</ol></details>')
        if X.get("reading"):
            rd = "".join(f'<li><a href="{E(r["url"])}" target="_blank" rel="noopener">{E(r["title"])}</a> <span>· {E(r.get("publisher", ""))} — {E(r.get("why", ""))}</span></li>' for r in X["reading"])
            out.append(f'<details><summary>延伸阅读（官方）</summary><ul class="reading">{rd}</ul></details>')
    return f'<div class="more-box">{"".join(out)}</div>' if out else ""


def videos_html(les):
    vs = les.get("official_videos") or []
    if not vs:
        return ""
    cards = "".join(f'<a href="{E(v["url"])}" target="_blank" rel="noopener">' + (f'<img src="{E(v["poster"])}" alt="" loading="lazy">' if v.get("poster") else "")
                    + f'<span>▶ {E(v["title"])}</span></a>' for v in vs)
    return f'<details><summary>官方视频（外部链接，版权归 OpenAI）</summary><div class="ovid">{cards}</div></details>'



def lesson_card(les, i, sources):
    c = COLORS[i % len(COLORS)]
    pts = "".join(f"<li>{E(p)}</li>" for p in les.get("points", []))
    vis = "".join(f'<span class="tag">{E(v)}</span>' for v in les.get("visual", []))
    # 同一发布方只列一次，括号里的托管平台、转载说明去掉
    pubs = []
    for sid in les.get("sources", []):
        pub = re.split(r"\s*[（(]", sources.get(sid, {}).get("publisher", sid))[0].strip()
        if pub not in pubs:
            pubs.append(pub)
    src = "".join(f'<span class="tag src">{E(pub)}</span>' for pub in pubs)
    if les.get("source_note"):
        src += f'<span class="tag src">{E(les["source_note"])}</span>'
    mins = f'<span class="tag">约 {E(str(les["minutes"]))} 分钟</span>' if les.get("minutes") else ""
    if les.get("video"):
        extra = f'<a class="more" href="{E(les["interactive"])}" target="_blank" rel="noopener">互动版：暂停后可点图看出处 ↗</a>' if les.get("interactive") else ""
        vid = (f'<div class="vid"><video controls preload="none" poster="{E(les.get("poster", ""))}" src="{E(les["video"])}"></video>'
               f'<div class="vmeta"><span class="tag done">已上线 · {E(les.get("length", ""))}</span>{extra}</div></div>')
    elif les.get("state") == "making":
        vid = '<div class="pending"><span class="tag">制作中</span></div>'
    else:
        vid = ""
    intro = f'<p style="margin:0;font-size:15px">{E(les["intro"])}</p>' if les.get("intro") else ""
    return f"""<li class="lesson{" has-video" if les.get("video") else ""}">
  <div class="top"><div class="n num" style="background:var(--{c}t);color:var(--{c})">{les.get("n", i + 1)}</div>
    <div><h4>{E(les["title"])}</h4>{f'<p class="hook">{E(les["hook"])}</p>' if les.get("hook") else ""}</div></div>
  {intro}{f"<ul>{pts}</ul>" if pts else ""}
  <div class="tags">{mins}{vis}{src}</div>{vid}{extras_html(les.get("n", i + 1))}{f'<div class="more-box">{videos_html(les)}</div>' if les.get("official_videos") else ""}
</li>"""


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    S = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    global LESSON_DIR
    LESSON_DIR = Path(sys.argv[1]).resolve().parent / "lessons"
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    sources = {s["id"]: s for s in S.get("sources", [])}
    parts = []

    facts = "".join(f'<dt>{E(f["k"])}</dt><dd class="{"tbd" if f.get("tbd") else ""}">{E(f["v"])}</dd>' for f in S.get("facts", []))
    parts.append(f"""<header class="hero">
  <div><span class="pill"><i></i>{E(S.get("status_label", ""))}</span>
    <h1>{S["title_html"] if S.get("title_html") else E(S["title"])}</h1>
    <p class="lede">{E(S.get("tagline", ""))}</p>{f'<p class="byline">作者：<b>{E(S["author"])}</b></p>' if S.get("author") else ""}</div>
  <dl class="facts">{facts}</dl>
</header>""")

    if S.get("stages"):
        stops = []
        for st in S["stages"]:
            a, b = [int(x) for x in re.findall(r"\d+", st["range"])[:2]] if "–" in st["range"] else [int(re.findall(r"\d+", st["range"])[0])] * 2
            items = "".join(f"<li>第 {l['n']} 节 · {E(l['title'])}</li>" for l in S["lessons"] if a <= l.get("n", 0) <= b)
            stops.append(f'<div class="stop" style="border-color:var(--{st.get("color", "m6")}t)"><span class="rg" style="color:var(--{st.get("color", "m6")})">{E(st["range"])}</span>'
                         f'<h3>{E(st["name"])}</h3><ol>{items}</ol><p class="get">学完你能：{E(st["get"])}</p></div>')
        parts.append(f"""<section id="map"><div class="sh"><h2>内容地图</h2><p>{E(S.get("map_sub", "三站走完全程；每站学完能做什么，一眼看清。先看第 0 节「课程地图」。"))}</p></div><div class="route">{"".join(stops)}</div></section>""")

    # 自定义板块（规划页的「动效对照」「制作方案」等）：sections[{id, heading, sub, html, where: "top"|"bottom"}]
    custom = lambda where: "".join(f'<section id="{E(c.get("id", "x"))}"><div class="sh"><h2>{E(c["heading"])}</h2><p>{E(c.get("sub", ""))}</p></div>{c["html"]}</section>'
                                   for c in S.get("sections", []) if c.get("where", "top") == where)
    parts.append(custom("top"))

    if S.get("sample"):
        sm = S["sample"]
        ch = "".join(f'<li><span class="k" style="color:var(--{COLORS[i % 6]})">{E(c["k"])}</span><p>{E(c["v"])}</p></li>' for i, c in enumerate(sm.get("changes", [])))
        parts.append(f"""<section id="sample"><div class="sh"><h2>{E(sm.get("heading", "样片"))}</h2><p>{E(sm.get("sub", ""))}</p></div>
  <div class="video"><video controls preload="metadata" poster="{E(sm["poster"])}" src="{E(sm["video"])}"></video></div>
  <ul class="changes">{ch}</ul></section>""")

    if S.get("themes"):
        th = "".join(f'<figure class="theme"><img src="{E(t["img"])}" alt="{E(t["name"])}主题下的同一帧" loading="lazy"><figcaption>{E(t["name"])}<span>{E(t.get("note", ""))}</span></figcaption></figure>' for t in S["themes"])
        parts.append(f"""<section id="themes"><div class="sh"><h2>主题</h2><p>{E(S.get("themes_sub", ""))}</p></div><div class="themes">{th}</div></section>""")

    vcard = lambda v: (f'<div class="voice{" pick" if v.get("pick") else ""}"><button type="button" aria-label="试听"></button><div><b>{E(v["name"])}</b>'
                       f'<span>{E(v["desc"])}</span></div><audio preload="none" src="{E(v["file"])}"></audio></div>')
    if S.get("voice_groups") or S.get("voices"):
        groups = S.get("voice_groups") or [{"voices": S["voices"]}]
        body = "".join((f'<h3 class="vg">{E(g["title"])}<span>{E(g.get("sub", ""))}</span></h3>' if g.get("title") else "")
                       + f'<div class="voices">{"".join(vcard(v) for v in g["voices"])}</div>' for g in groups)
        note = f'<div class="note">{S["voice_note"]}</div>' if S.get("voice_note") else ""
        parts.append(f"""<section id="voices"><div class="sh"><h2>配音试听</h2><p>{E(S.get("voices_sub", ""))}</p></div>{note}{body}</section>""")

    if S.get("plans"):
        tabs = "".join(f'<button type="button" role="tab" data-plan="{E(p["id"])}" aria-selected="{"true" if i == 0 else "false"}">{E(p["tab"])}</button>' for i, p in enumerate(S["plans"]))
        panes = []
        for i, p in enumerate(S["plans"]):
            cards = "".join(lesson_card(l, k, sources) for k, l in enumerate(p["lessons"]))
            panes.append(f"""<div id="plan-{E(p["id"])}" role="tabpanel"{"" if i == 0 else " hidden"}>
  <div class="plan-head"><h3>{E(p["name"])}</h3><span>{E(p.get("meta", ""))}</span></div>
  {f'<p style="margin:-4px 0 14px;color:var(--ink2)">{E(p["why"])}</p>' if p.get("why") else ""}
  <ol class="lessons">{cards}</ol></div>""")
        parts.append(f"""<section id="outline"><div class="sh"><h2>{E(S.get("plans_heading", "大纲"))}</h2><p>{E(S.get("plans_sub", ""))}</p></div>
  <div class="tabs" role="tablist">{tabs}</div>{"".join(panes)}</section>""")

    if S.get("lessons"):
        cards = "".join(lesson_card(l, k, sources) for k, l in enumerate(S["lessons"]))
        parts.append(f"""<section id="lessons"><div class="sh"><h2>{E(S.get("lessons_heading", "课程大纲"))}</h2><p>{E(S.get("lessons_sub", ""))}</p></div><ol class="lessons">{cards}</ol></section>""")

    parts.append(custom("bottom"))

    if S.get("sources"):
        ss = "".join(f'<li><span class="tier {E(s.get("tier", "T3"))}">{E(s.get("tier", ""))}</span><span>{E(s["publisher"])} · '
                     + (f'<a href="{E(s["url"])}" target="_blank" rel="noopener">{E(s["title"])}</a>' if s.get("url") else E(s["title"]))
                     + (f' <span class="miss">（{E(s["note"])}）</span>' if s.get("note") else "") + "</span></li>" for s in S["sources"])
        parts.append(f"""<section id="sources"><div class="sh"><h2>资料来源</h2><p>{E(S.get("sources_sub", ""))}</p></div><ul class="srcs">{ss}</ul></section>""")

    if S.get("questions"):
        qs = "".join(f'<li><b>{E(q["q"])}</b><div class="opts">' + "".join(f'<span class="{"rec" if o.get("rec") else ""}">{E(o["t"])}{"（推荐）" if o.get("rec") else ""}</span>' for o in q["options"]) + "</div></li>" for q in S["questions"])
        parts.append(f"""<section id="confirm"><div class="sh"><h2>待你确认</h2><p>{E(S.get("questions_sub", ""))}</p></div><ol class="qs">{qs}</ol></section>""")

    foot = f"<footer>{S['footer']}</footer>" if S.get("footer") else ""
    page = f"""<meta charset="utf-8">
<title>{E(S["title"])}</title>
<meta name="description" content="{E(S.get("tagline", ""))}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;800&family=Noto+Sans+SC:wght@400;500;600;700;900&display=swap">
<style>{CSS}</style>
<div class="wrap">
{"".join(parts)}
{foot}
</div>
<script>{JS}</script>
"""
    (out / "index.html").write_text(page, encoding="utf-8")
    print(f"→ {out / 'index.html'}（{len(page) // 1024} KB）")


if __name__ == "__main__":
    main()
