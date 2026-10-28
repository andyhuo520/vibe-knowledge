#!/usr/bin/env python3
"""文案审阅页：把系列里每一节的旁白稿（script.md + narration.json + 核查账本）汇成一个页面，给用户逐节确认。

用法：python3 scripts/review_page.py <系列目录> <输出目录> [--from 2] [--to 12]
每节显示：字数、拍数、预计时长（按每秒 4.3 字）、核实/未核实的事实数、script.md 全文（每拍旁白、画面建议、依据），
以及 claims.md（核查结论，折叠）。
"""
import html
import json
import re
import sys
from pathlib import Path

import markdown

E = html.escape
CUE = re.compile(r"\[\[[a-z0-9_-]+\]\]")

CSS = """
:root{--bg:#F0FAF6;--surface:#FFFFFF;--surface2:#E6F5EE;--line:#D3E9DF;--ink:#16332D;--ink2:#3F5E57;--ink3:#5E7B74;
  --acc:#137A66;--acct:#DDF6F0;--ok:#3C7F2E;--okt:#E6F7E2;--warn:#B83A55;--warnt:#FDE5EA}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#10211D;--surface:#172D28;--surface2:#1E3832;--line:#2B4A42;
  --ink:#EAF7F2;--ink2:#B5D3CA;--ink3:#8DB1A7;--acc:#8FE3CF;--acct:rgba(127,214,194,.16);--ok:#B5EDD0;--okt:rgba(134,217,176,.15);--warn:#FFD0B5;--warnt:rgba(255,180,138,.16)}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#10211D;--surface:#172D28;--surface2:#1E3832;--line:#2B4A42;
  --ink:#EAF7F2;--ink2:#B5D3CA;--ink3:#8DB1A7;--acc:#8FE3CF;--acct:rgba(127,214,194,.16);--ok:#B5EDD0;--okt:rgba(134,217,176,.15);--warn:#FFD0B5;--warnt:rgba(255,180,138,.16)}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:16px/1.75 "Noto Sans SC","PingFang SC",system-ui,sans-serif;padding-inline:20px;margin:0}
.wrap{max-width:1180px;margin:0 auto;padding-block:36px 90px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:32px}
nav{position:sticky;top:env(safe-area-inset-top,0px);align-self:start;padding-top:8px}
nav a{display:flex;gap:10px;padding:7px 10px;border-radius:10px;color:var(--ink2);text-decoration:none;font-size:15px}
nav a:hover{background:var(--surface2)} nav b{color:var(--acc);min-width:1.6em;font-variant-numeric:tabular-nums}
h1{font-size:40px;line-height:1.2;margin:0 0 8px;text-wrap:balance}
.lede{color:var(--ink2);margin:0 0 22px}
table{border-collapse:collapse;width:100%;font-size:14.5px;background:var(--surface);border-radius:16px;overflow:hidden}
th,td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
th{color:var(--ink3);font-weight:600;background:var(--surface2)}
.tbl{overflow-x:auto;border-radius:16px;border:1.5px solid var(--line)}
section{margin-top:44px;padding-top:10px;border-top:2px dashed var(--line)}
section h2{font-size:28px;margin:6px 0 6px}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 16px}
.pill{font-size:13px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--acct);color:var(--acc)}
.pill.ok{background:var(--okt);color:var(--ok)} .pill.warn{background:var(--warnt);color:var(--warn)}
.md{background:var(--surface);border:1.5px solid var(--line);border-radius:18px;padding:6px 24px 18px}
.md h1,.md h2,.md h3{font-size:19px;margin:18px 0 6px} .md h1{font-size:22px}
.md table{font-size:14px} .md blockquote{margin:8px 0;padding:6px 14px;border-left:4px solid var(--acct);color:var(--ink2);background:var(--surface2);border-radius:0 10px 10px 0}
.md code{font-size:13px;background:var(--surface2);padding:1px 5px;border-radius:5px}
details{margin-top:12px;background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:10px 18px}
details summary{cursor:pointer;font-weight:700;color:var(--ink2)}
.missing{color:var(--warn);font-weight:700}
@media (max-width:860px){.wrap{grid-template-columns:1fr}nav{position:static;display:flex;flex-wrap:wrap;gap:4px}}
"""


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    sd, out = Path(sys.argv[1]), Path(sys.argv[2])
    lo, hi = int(arg("--from", 2)), int(arg("--to", 12))
    S = json.loads((sd / "series.json").read_text(encoding="utf-8"))
    rows, secs, nav = [], [], []
    for n in range(lo, hi + 1):
        L = sd / "lessons" / f"{n:02d}"
        title = S["lessons"][n - 1]["title"] if n - 1 < len(S.get("lessons", [])) else f"第 {n} 节"
        nav.append(f'<a href="#l{n:02d}"><b>{n}</b>{E(title)}</a>')
        nj, sm = L / "narration.json", L / "script.md"
        if not nj.exists():
            rows.append(f'<tr><td>{n}</td><td>{E(title)}</td><td colspan="5" class="missing">还没写好</td></tr>')
            secs.append(f'<section id="l{n:02d}"><h2>第 {n} 节 · {E(title)}</h2><p class="missing">文案还没写好。</p></section>')
            continue
        beats = json.loads(nj.read_text(encoding="utf-8"))["beats"]
        chars = sum(len(CUE.sub("", b["narration"])) for b in beats)
        est = chars / 4.3 + 0.8 * len(beats)
        fx = L / "research/facts.json"
        facts = json.loads(fx.read_text(encoding="utf-8"))["facts"] if fx.exists() else []
        ver = sum(1 for f in facts if f.get("status") == "verified")
        unv = len(facts) - ver
        rows.append(f"<tr><td>{n}</td><td><a href=\"#l{n:02d}\">{E(title)}</a></td><td>{chars}</td><td>{len(beats)}</td>"
                    f"<td>{int(est // 60)}:{int(est % 60):02d}</td><td>{ver}</td><td>{unv}</td></tr>")
        body = markdown.markdown(sm.read_text(encoding="utf-8"), extensions=["tables"]) if sm.exists() else \
            "<ol>" + "".join(f"<li>{E(CUE.sub('', b['narration']))}</li>" for b in beats) + "</ol>"
        claims = L / "research/claims.md"
        cl = f'<details><summary>核查结论（claims.md）</summary><div class="md">{markdown.markdown(claims.read_text(encoding="utf-8"), extensions=["tables"])}</div></details>' if claims.exists() else ""
        secs.append(f"""<section id="l{n:02d}"><h2>第 {n} 节 · {E(title)}</h2>
<div class="stats"><span class="pill">{chars} 字 · {len(beats)} 拍</span><span class="pill">约 {int(est // 60)} 分 {int(est % 60)} 秒</span>
<span class="pill ok">核实 {ver} 条</span>{f'<span class="pill warn">未核实 {unv} 条（没进旁白）</span>' if unv else ''}</div>
<div class="md">{body}</div>{cl}</section>""")
    page = f"""<title>AI 入门课文案审阅</title>
<style>{CSS}</style>
<div class="wrap"><nav>{''.join(nav)}</nav><main>
<h1>AI 入门课 · 第 {lo}–{hi} 节文案</h1>
<p class="lede">每节的旁白原文、画面建议和依据都在下面。确认后按这份文案录音、做画面；要改哪句，直接告诉我节号和拍号（如「第 5 节 B07」）。</p>
<div class="tbl"><table><thead><tr><th>节</th><th>标题</th><th>字数</th><th>拍数</th><th>预计时长</th><th>核实</th><th>未核实</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
{''.join(secs)}
</main></div>
"""
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page, encoding="utf-8")
    print(f"→ {out / 'index.html'}（{len(page) // 1024} KB）")


if __name__ == "__main__":
    main()
