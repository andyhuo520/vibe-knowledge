#!/usr/bin/env python3
"""把插画库里选中的插画放进课目录 illus/，场景里写 "illus": "ip-5-48" 就能用（轮廓描线 + 色块淡入）。
用法：python3 scripts/illus.py <课目录> ip-5-48 ip-2-12 ...
插画库：assets/illustrations/iconpark/（catalog.json 有名字和专辑；总览图 _sheet.html）。
"""
import json, shutil, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
lib = ROOT / "assets/illustrations/iconpark"
cat = {i["id"]: i for i in json.loads((lib / "catalog.json").read_text())["items"]}
L = Path(sys.argv[1]); (L / "illus").mkdir(parents=True, exist_ok=True)
for iid in sys.argv[2:]:
    if iid not in cat: print(f"✗ 没有 {iid}"); continue
    shutil.copy(lib / cat[iid]["file"], L / "illus" / f"{iid}.svg")
    print(f"✓ {iid} {cat[iid]['album']} · {cat[iid]['name']}")
