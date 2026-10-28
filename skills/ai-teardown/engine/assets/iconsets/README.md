# 离线图标集（Iconify JSON 格式）

tabler、lucide、iconoir 从 `~/Desktop/inkflow/data/iconsets/` 拷来；IconPark 取自 jsDelivr 上的 `@iconify-json/icon-park*`（2026-09-26）。渲染时不联网。

系列课默认用 IconPark 多色（前缀 `icon-park:`），`runtime/iconify.js` 会把它的四个固定色换成马卡龙色位。

| 文件 | 图标集 | 数量 | 许可 |
|---|---|---|---|
| tabler.json | Tabler Icons | 6232 | MIT |
| lucide.json | Lucide | 1834 | ISC |
| iconoir.json | Iconoir | 1682 | MIT |
| icon-park.json | IconPark 多色（字节跳动） | 2658 | Apache-2.0 |
| icon-park-outline.json / -solid / -twotone | IconPark 线条、实心、双色 | 2658 / 1970 / 1947 | Apache-2.0 |

用 `scripts/icons.py` 按名字（如 `tabler:robot`）抽出片子用到的那几个，打进 bundle。
