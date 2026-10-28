#!/usr/bin/env python3
"""Google Noto emoji：静态 SVG（noto-emoji 仓库，Apache 2.0）进系列 assets/img（id noto-<名>），
有官方动画的再把 Lottie（Noto Animated Emoji，CC BY 4.0）放进课目录 lottie/<名>.json。

用法：python3 scripts/noto_emoji.py <课目录> robot light-bulb thinking-face ...
名字沿用 Fluent Emoji 的写法（小写连字符）；码点从 fluentui-emoji 仓库的 metadata.json 查。
"""
import json, subprocess, sys, urllib.parse
from pathlib import Path

FLUENT = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/"
NOTO_SVG = "https://fonts.gstatic.com/s/e/notoemoji/latest/{}/emoji.svg"
NOTO_LOTTIE = "https://fonts.gstatic.com/s/e/notoemoji/latest/{}/lottie.json"


def get(url, out=None):
    for _ in range(4):
        r = subprocess.run(["curl", "-sfL", "--max-time", "40", *(["-o", str(out)] if out else []), url], capture_output=out is None)
        if r.returncode == 0:
            return r.stdout if out is None else True
        if r.returncode == 22:   # 404 之类：不用重试
            return None
    return None


def main():
    L = Path(sys.argv[1]); names = sys.argv[2:]
    sd = L.parent.parent
    img = sd / "assets/img"; (L / "lottie").mkdir(parents=True, exist_ok=True)
    led_p = img / "images.json"; led = json.loads(led_p.read_text())
    have = {i["id"] for i in led["images"]}
    for n in names:
        folder = urllib.parse.quote(n.replace("-", " ").capitalize())
        meta = get(FLUENT + folder + "/metadata.json")
        if not meta:
            print(f"✗ {n}：查不到码点"); continue
        m = json.loads(meta)
        cp = (m.get("unicodeSkintones") or [m["unicode"]])[0] if not m.get("unicode") else m["unicode"]
        cp = cp.split(" ")[0] if " " in cp and "200d" not in cp else cp
        svg_cp = "_".join(c for c in cp.split() if c != "fe0f")
        svg = img / f"noto-{n}.svg"
        if not svg.exists() and not get(NOTO_SVG.format(svg_cp), svg):
            print(f"✗ {n}（{cp}）：Noto 没有静态图"); continue
        # Illustrator 导出的 SVG 带 DOCTYPE/ENTITY（发布平台不收）：展开实体、去掉 DTD
        import re as _re
        t = svg.read_text(encoding="utf-8")
        if _re.search(r"<!(DOCTYPE|ENTITY)", t, _re.I):
            ents = dict(_re.findall(r'<!ENTITY\s+(\w+)\s+"([^"]*)"', t))
            t = _re.sub(r"<!DOCTYPE[^\[>]*(\[.*?\])?\s*>", "", t, flags=_re.S)
            for k, v in ents.items(): t = t.replace(f"&{k};", v)
            svg.write_text(t, encoding="utf-8")
        if f"noto-{n}" not in have:
            led["images"].append({"id": f"noto-{n}", "file": svg.name, "width": 128, "height": 128, "artist": "Google", "license": "Apache-2.0",
                                  "source": "Noto Emoji（github.com/googlefonts/noto-emoji）", "credit": "图标：Google Noto Emoji · Apache 2.0"})
            have.add(f"noto-{n}")
        lot = L / "lottie" / f"{n}.json"
        anim = lot.exists() or get(NOTO_LOTTIE.format(svg_cp.replace("_", "_")), lot)
        print(f"✓ {n}（{cp}）{'· 有动画' if anim else ''}")
    sys.path.insert(0, str(Path(__file__).parent)); from ledger import add_images
    add_images(sd, [i for i in led["images"] if i["id"].startswith("noto-")])


if __name__ == "__main__":
    main()
