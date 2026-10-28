#!/usr/bin/env python3
"""从 Wikimedia Commons 取图，同时记下作者与许可，写进图片账本。

用法：
    python3 scripts/fetch_images.py <spec.json> <输出目录>

spec.json：{"images": [{"id": "turing", "title": "File:Alan Turing (1951).jpg", "width": 900, "note": "用途说明"}]}
    title 是 Commons 上的文件名；width 是要的缩略图宽度（PDF 会渲染第一页）。

输出：
    <输出目录>/<id>.<ext>        缩略图
    <输出目录>/images.json        账本：来源页、原图地址、作者、许可、署名文字
只收许可明确可再用的图（公有领域、CC0、CC BY、CC BY-SA）；其他许可直接跳过并报出来。
"""
import html
import json
import re
import subprocess
import sys
import time
import urllib.parse
from datetime import date
from pathlib import Path

UA = "ai-teardown-course-builder/0.1 (local research script)"
API = "https://commons.wikimedia.org/w/api.php"
OK_LICENSE = re.compile(r"^(public domain|pd|cc0|cc by(-sa)? \d)", re.I)


def curl(url, out=None, tries=6):
    """API 调用要拿到 JSON 才算成功（Wikimedia 偶尔回限流或错误页）；下载文件要非空。失败按次数退避重试。"""
    for k in range(tries):
        cmd = ["curl", "-sL", "--max-time", "60", "-A", UA, url] + (["-o", str(out)] if out else [])
        r = subprocess.run(cmd, capture_output=True, text=out is None)
        if r.returncode == 0:
            if out is not None and out.exists() and out.stat().st_size > 0:
                return out
            if out is None and r.stdout.lstrip().startswith("{"):
                return r.stdout
        time.sleep(2 * (k + 1))
    raise RuntimeError(f"下载失败：{url}")


def plain(v):
    return html.unescape(re.sub(r"<.*?>", "", str(v) if v is not None else "")).strip()


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    led_p = out / "images.json"
    ledger = json.loads(led_p.read_text(encoding="utf-8")) if led_p.exists() else {"images": []}
    have = {i["id"]: i for i in ledger["images"]}

    for it in spec["images"]:
        old = have.get(it["id"])
        if old and old.get("title") == it["title"] and (out / old["file"]).exists() and "--force" not in sys.argv:
            print(f"· {it['id']:12s} 已有，跳过")
            continue
        q = urllib.parse.urlencode({"action": "query", "format": "json", "prop": "imageinfo", "titles": it["title"],
                                    "iiprop": "url|size|mime|extmetadata", "iiurlwidth": it.get("width", 1200)})
        page = next(iter(json.loads(curl(f"{API}?{q}"))["query"]["pages"].values()))
        if "imageinfo" not in page:
            print(f"✗ {it['id']}：Commons 上没有 {it['title']}")
            continue
        ii = page["imageinfo"][0]
        md = {k: plain(v.get("value")) for k, v in ii.get("extmetadata", {}).items()}
        lic = md.get("LicenseShortName", "")
        if not OK_LICENSE.match(lic):
            print(f"✗ {it['id']}：许可「{lic}」不在白名单，跳过")
            continue
        src = ii.get("thumburl") or ii["url"]
        ext = Path(urllib.parse.urlparse(src).path).suffix.lower() or ".jpg"
        if ext == ".pdf":
            ext = ".jpg"
        f = out / f"{it['id']}{ext}"
        curl(src, f)
        artist = md.get("Artist", "") or "佚名"
        pd = lic.lower().startswith(("public domain", "pd", "cc0"))
        rec = {
            "id": it["id"], "file": f.name, "title": it["title"],
            "page": ii.get("descriptionurl"), "original": ii["url"], "thumb": src,
            "width": ii.get("thumbwidth") or ii.get("width"), "height": ii.get("thumbheight") or ii.get("height"),
            "license": lic, "license_url": md.get("LicenseUrl"), "artist": artist,
            "credit": f"{artist} · {lic} · Wikimedia Commons" if not pd else f"{artist} · {lic}（公有领域）· Wikimedia Commons",
            "attribution_required": md.get("AttributionRequired", "true") != "false",
            "description": md.get("ImageDescription", "")[:300], "date": md.get("DateTimeOriginal", ""),
            "note": it.get("note", ""), "fetched": date.today().isoformat(),
        }
        have[it["id"]] = rec
        print(f"✓ {it['id']:12s} {rec['width']}×{rec['height']}  {lic:14s} {artist[:40]}")

    ledger["images"] = list(have.values())
    led_p.write_text(json.dumps(ledger, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"账本 → {led_p}（{len(ledger['images'])} 张）")


if __name__ == "__main__":
    main()
