#!/usr/bin/env python3
"""图片账本 images.json 的加锁读写（几个助手同时往里加图时不会互相覆盖）。
用法（在 Python 里）：
    from ledger import add_images
    add_images(系列目录, [{"id": ..., "file": ..., "width": ..., "height": ..., "credit": ...}, ...])
"""
import fcntl, json
from pathlib import Path


def add_images(series_dir, items, drop_prefix=None):
    p = Path(series_dir) / "assets/img/images.json"
    lock = open(str(p) + ".lock", "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    try:
        d = json.loads(p.read_text()) if p.exists() else {"images": []}
        if drop_prefix:
            d["images"] = [i for i in d["images"] if not i["id"].startswith(drop_prefix)]
        have = {i["id"]: k for k, i in enumerate(d["images"])}
        for it in items:
            if it["id"] in have: d["images"][have[it["id"]]] = it
            else: d["images"].append(it); have[it["id"]] = len(d["images"]) - 1
        p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN); lock.close()
