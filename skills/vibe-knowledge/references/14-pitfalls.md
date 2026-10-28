# 14 · 制作踩坑清单（按环节）

每条都是真实踩过的坑：现象 → 原因 → 做法。风格相关的坑（MJ 把「青花」画成碗、年代词带偏服饰、ESRGAN 分块错位、画布等解码、Vision 投影）见 12-style-families.md。

## 生成（Renoise）

- **AI 画的器物结构不对**（04b 冰鉴图多了玻璃窗）：文物、仪器、机械这类「结构就是知识点」的东西，AI 图容易画错。做法：这类镜头改用 know.js 的 `cutaway` 代码画线稿剖面，画面标「代码示意」，脚注写文物出处。AI 图只用来交代场景和氛围。
- **Wan 3.0 报 `InvalidParameter: Failed to download <url>`**：首帧图的链接临时拉不到。做法：换一个新的 idempotency key 原样重提一次，一般就过了；失败那次是否退回积分，用 get_account 前后对比确认。
- **Wan 出片自带上下黑边**（1282×718 里上下各约 40px）：`clip2frames.py` 会自动裁掉，info.json 里有 crop 记录；`vclip` 按 cover 铺满，不用另外处理。

## 配音（MiMo）

- **同一拍里重复出现的词会让逐字对齐断掉**（04b：「二之日 / 三之日」各出现两次，`check_timings.py` 报错）。做法：改写成不重复的说法（「换成今天的说法：腊月凿冰，正月入窖」），不要硬调对齐。
- **lexicon 把一个词换成同音字后，也可能让对齐断**（「凌阴」替换后对不上）。做法：先不加 lexicon 配一次，回读真读错了再加。
- **单拍偏慢**（<5 字/秒）或回读 <95%：删掉 `build/audio/<拍>.*` 单独重配，一般一两次就正常。

## 编排（film.js）

- **`css(node, { background: "" })` 会把底色整个清掉**，方块只剩边框。条件样式一律写成「两个分支都给完整值」：`background: melted ? "transparent" : FILL`。
- **大片纯黑底**：章节中间留下的空背景（印章、计数器那几秒）要垫一层压暗的场景图（brightness 0.3 + blur），不然一看就像漏了镜头。
- **小字号副标题**：keyword 的 `sub` 只有主字号的 0.28 倍，1080p 上 20px 左右，看不清。需要读的副句就单独再放一个 keyword（≥44px）。
- **画在冷雾、亮光上的字**会被吃掉：加 `text-shadow: 0 2px 18px rgba(0,0,0,0.9)`，或者换成金色等高对比色。

## 渲染

- **cine/queue.txt 被几个会话共用**。用 `>` 覆盖写，或者在已有 queue.sh 运行时再起一个，都会让两路 record.py 同时写同一个 picture.mp4，结果是长时间冻结，或者 H.264 数据直接损坏（04b 第一版冻了 80 秒）。做法：只用 `>>` 追加；先 `pgrep -f cine/tools/queue.sh`，有队列在跑就交给它；也可以绕开队列，直接按顺序跑 record.py → finish.py → deliver.sh。
- **只换配乐不用重录画面**：改 film.js 的 music 后，只跑 finish.py + deliver.sh（约 1 分钟）。picture.mp4 不动。
- **交付前一定跑 qa.py**：现在会报 >3 秒的静止画面；>10 秒的冻结基本就是录制出事了。

## 配乐

- **BGM 是强制的**：finish.py 的 bgm_force 钩子会自动补 vibe-bgm、停用其他整段配乐、按人声校准音量（说话时比人声低 10 dB）。用户要求换曲才换：音乐条目写 `bgm: true, user_request: "用户原话"`。新系列由 new_film.py 打钩子；老系列手动跑 `python3 tools/bgm_force.py --patch <系列目录>`。
- **手写 gain_curve 的绝对值不算数**：04b 原来写 −11 dB，实测说话时 BGM 只比人声低 7.7 dB，偏响；现在一律由校准决定（10-28 先定 14 dB，用户嫌轻，改成 10 dB），曲线只管起伏。
- **成片里有没有 BGM，qa.py 会核对**：拿成片开头跟原曲开头做相关，≥0.12 才算有（有 BGM 的成片实测 0.18–0.38，没有的 ≤0.08）。
- **BGM 变响后，cover_first 重编码 AAC 峰值会冲到 −0.9 dB**：限幅已收到 0.79（约 −2 dBFS），编码后真峰值 −1.2 到 −1.4 dB。

## 交付

- **封面接成开头帧**（cover_first.py）会重新编码 AAC，峰值会被抬高 0.5–1 dB；工具里已经加了限幅（约 −1.4 dBFS）。交付前用 ebur128 再看一眼真峰值是否 ≤ −1 dBTP。
- **只换了音频也要重新接封面**：deliver.sh 会输出不带封面的版本，覆盖交付文件夹前记得再跑一次 cover_first.py。
