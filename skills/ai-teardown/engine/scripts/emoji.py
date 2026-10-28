#!/usr/bin/env python3
"""从微软 Fluent Emoji（MIT）抓 3D 彩色图标，放进系列的 assets/img/，并登记进 images.json（出处自动显示）。

用法：python3 scripts/emoji.py <系列目录> [--color] "Robot" "Bar chart" "Man office worker" ...
- 默认抓 3D 版（PNG，id emoji-<名>，手账风用）；--color 抓扁平彩色版（SVG，id emojic-<名>，Notion 极简风用）。
- 名字就是 fluentui-emoji 仓库 assets/ 下的文件夹名（大小写照抄，例如 "Magnifying glass tilted left"）。
- 有肤色变体的（人物、手势）自动取 Default。图片 id 为 emoji-<小写连字符>，例如 emoji-bar-chart。
"""
import json, subprocess, sys, urllib.parse
from pathlib import Path
from PIL import Image

RAW = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/"


def fetch(url, out):
    r = subprocess.run(["curl", "-sfL", "--max-time", "60", "-o", str(out), url])
    return r.returncode == 0 and out.exists() and out.stat().st_size > 1000


def main():
    sd = Path(sys.argv[1]); names = [n for n in sys.argv[2:] if n != "--color"]
    color = "--color" in sys.argv
    img = sd / "assets/img"; img.mkdir(parents=True, exist_ok=True)
    led = img / "images.json"
    data = json.loads(led.read_text()) if led.exists() else {"images": []}
    have = {i["id"] for i in data["images"]}
    for n in names:
        slug = n.lower().replace(" ", "-").replace("’", "").replace("'", "")
        pre, ext, kind = ("emojic", "svg", "Color") if color else ("emoji", "png", "3D")
        iid, out = f"{pre}-{slug}", img / f"{pre}-{slug}.{ext}"
        snake = n.lower().replace(" ", "_").replace("-", "_")
        q = urllib.parse.quote(n)
        k = kind.lower()
        ok = out.exists() or any(fetch(RAW + p, out) for p in (f"{q}/{kind}/{snake}_{k}.{ext}", f"{q}/Default/{kind}/{snake}_{k}_default.{ext}"))
        if not ok:
            print(f"✗ {n}（查一下 fluentui-emoji 仓库里的准确文件夹名）"); out.unlink(missing_ok=True); continue
        w, h = (256, 256) if color else Image.open(out).size
        if iid not in have:
            data["images"].append({"id": iid, "file": out.name, "width": w, "height": h, "artist": "Microsoft",
                                   "license": "MIT", "source": "Fluent Emoji（github.com/microsoft/fluentui-emoji）", "credit": "图标：Microsoft Fluent Emoji · MIT"})
            have.add(iid)
        print(f"✓ {iid}  {w}×{h}")
    led.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
