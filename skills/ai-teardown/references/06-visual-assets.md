# 06 · 视觉素材

## 图标三层分工

1. **IconPark 线条图标**（Apache 2.0）：界面、流程、清单。写 `icon-park:robot`，名字必须在 `assets/iconsets/icon-park.json` 里（先查再用；缺的用 `lucide:` / `tabler:` / `iconoir:`）。自动一笔笔描线 + Notion 配色轮换。
2. **Noto emoji**（Google，CC BY 4.0）：主角、情绪、物件。`python3 scripts/noto_emoji.py <课目录> robot light-bulb …`（小写连字符英文名）。有官方动画的会把 lottie.json 放进课目录 `lottie/`，场景里写同名自动播动画；静态 SVG 已去掉 DTD/ENTITY（否则 Artifact 拒收）。某个动画效果不好（如 stop-sign 缩成红点）就删掉那个 lottie 文件改用静态。
3. **IconPark 插画库**（88 张，22 个专辑，字节跳动）：`assets/illustrations/iconpark/`（`catalog.json`、`_sheet.html` 总览）。`python3 scripts/illus.py <课目录> ip-6-52 …`，场景 `say`/`cover` 写 `"illus": "ip-6-52"`。每节 2–4 张，尽量不和前几节重复（先 grep 已用过的 id）。注意：插画库不是开源许可（站点条款为标准授权），用户已确认可用于本系列；给别的项目用要重新确认。

## 流程图：AntV X6（MIT）

`assets/vendor/x6.min.js`（v3.1.8 UMD，`async:false` 同步渲染保证逐帧确定）；manhattan 路由 + 圆角连线；节点弹出 → 连线画出 → 虚线流动。字段见 04-scenes-sketch。

## 动效

- Lottie 一律用 **canvas 渲染器**（SVG 渲染器逐帧不确定，同一帧 15 次有 13 次不一致）。
- `primitives/motion.js`：lottie、icon 描线、illus 描线+淡入、diagram、count 数字滚动、bars、line、dotmap（Natural Earth 陆地点阵，不画国界）、kinetic 逐字弹出。

## 截图与录屏素材

- 书 / 仓库章节配图：`python3 scripts/wb_import.py <课目录> "<章节目录名>" --prefix wbNN`。截图导入为 `wbNN-XX.png` 并登记账本；GIF 拆成 8fps 去重的帧序列 `flip-<prefix>-gXX-NNN.jpg` + `data/flip-*.json`，场景用 `shot.clip` 播放（字段叫 `clip`，**不能叫 flip**——编译器用 `s.flip` 表示翻页转场）；生成 `build/chapter_sheet.jpg` 总览。
- mp4 素材不自动导入：ffmpeg 截一段按 8fps 出帧，照同样命名做成 clip。
- 网上抓图：`scripts/fetch_images.py`，记来源与许可；优先 Wikimedia Commons、博物馆开放馆藏、官方新闻图。外链图会被 Artifact CSP 拦，必须本地化。
- 图片账本 `assets/img/images.json`：每张图有 id、file、尺寸、artist、license、source、credit；并行写用 `scripts/ledger.py`（fcntl 加锁）。截图 credit 写「截图出处：《书名》第 X 章 · MIT」，画面自动标。
- 需要遮盖的截图另存一份打码版（如 `wb10b-03m.png`），场景引用打码版。

## 讲解小人

- `presets/presenter/`：`hp-<pose>-1..8.png`（10 个动作）、`host-avatar.png`（封面头像）、账本条目、`生图提示词.md`（补新动作时给用户用的提示词和尺寸要求）。
- 新动作入账前按「头发顶 → 底边」的高度统一缩放到与 talk 一致。
- 默认动作：shot→point、pause→think、checklist→check、outro→wave；tips 默认 idea；场景 `pose`、tips 里的 `pose` 可覆盖。

## 署名规则（用户定的）

- 图标、插画库、动效库、配音的来源**只在片尾 outro 的 credits 里标一次**。
- 书中内容和截图的出处**逐处标**（`src` 或账本 credit）。
- credits 每行不超过 40 字，常用 5 行：内容来源（章节 + MIT）/ 仓库地址 / 插画与图标 / 流程图与动效库 / 讲解小人与配音（AI 生成）。
