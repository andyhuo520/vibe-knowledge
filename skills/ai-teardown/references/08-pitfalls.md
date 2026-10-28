# 08 · 踩过的坑

## 渲染与确定性
- Lottie SVG 渲染器逐帧不确定 → 只用 canvas 渲染器。
- 图层隐藏用 `display:none`：父层 `visibility:hidden` 时，子元素 `visibility:visible` 会穿透显示（录屏最后一帧残留）。
- X6 必须 `async:false`，否则逐帧截图时连线还没画好。
- Hyperframes 加 worker 反而慢（每个 worker 加载页面约 17 秒）；同时跑别的浏览器任务会掉到 5–8 fps。渲染串行、放后台，和写下一节重叠。
- **final 不重跑 build**：改了引擎后，已排队未渲染的课要手动 build 一次。
- 浏览器面板折叠时 rAF 不跑，页面会假死；验证走 Playwright 无头截图（`scripts/stills.py <preview.html> <out.png> t1 t2 … --cols N`）。

## 编译器字段
- `shot` 播录屏的字段叫 `clip`；`flip` 是翻页转场标志，混用会出错。
- 时间引用 `"B01.reply-1"`：负偏移无小数时曾被当成 cue 名，现规则为「连字符 + 字母」才算 cue 名的一部分。
- `stickers` 的 tick/cross 写时刻，写 `true` 会报「时间写法不对」而 check_scenes 查不出。
- 非数字课号（intro、03en）走 `videoOnly`，否则 final 按 `int(课号)` 找 series.json 会崩。

## 配音
- MiMo 罗马数字坑（CLI→151），已自动拆字母；小写缩写和新专名进 lexicon。
- 不加讲课语气说明时语速太快；克隆音色加慢速说明后约 4 字/秒，再 1.15 倍变速。
- whisper 用全文当 prompt 的同时，模型可能跳过一截音频 → 用 small 先对齐、medium 补救，两次都失败再切短拍。
- MiMo 并发 429、偶发 HTTP2 framing 错误：脚本自动退避重试，不用手动干预。

## 素材
- Noto 静态 SVG 带 DOCTYPE/ENTITY 会被 Artifact 拒收（noto_emoji.py 已自动剥）。
- raw.githubusercontent 的 Noto 路径 404 → 用 gstatic CDN。
- 外链图片被 Artifact CSP 拦 → 全部本地化。
- `du` 看到的浏览器缓存大小可能是 APFS 克隆的假象，腾空间前用 `df` 验证；视频汇总用 `cp -c` 克隆不占空间。

## 发布
- 单版 64MB / 255 文件上限：课程页视频分批发到同一 file_path；互动版 >200 文件用列表形式 files + root。
- 发布偶发「Socket is closed」：原样重试（会提示保留的 slug）。
- 一个会话最多同时观察 10 个 Artifact，超出只是不再跟踪新版本，不影响发布。

## 版式
- say 第二行长句、diagram tone 与底色、diagram caption 压出处、recap 中心字溢出——都已在引擎里修（见 04-scenes-sketch 补充 C），改版式规则时别回退。
- stills 目录要先清空再看接触表。
- 工具输入里写四位 Unicode 转义（反斜杠 u + 4 位十六进制）会被解码成字面字符（含零宽字符）；正则里要表达字符范围时用 `codePointAt` 比较，或用 `chr(92)` 拼。
