# 致谢与参考声明 / Acknowledgements

vibe-knowledge 的代码、风格样片和文档都是本项目原创编写的。做的过程中，我们调研、参考过下面这些开源项目。为尊重原作者、避免误会，这里逐一列出：参考了什么、用在哪里、对方用什么许可证。

如果你是其中某个项目的作者，觉得这里写得不准确，或者希望补充、修改说明，请开 issue 或直接联系 [@Berryxia](https://x.com/berryxia)，我们会第一时间更正。

## 一、借鉴了做法或实现思路（MIT 许可，注明来源）

这一类项目都是 MIT 许可。我们借鉴了它们的方法和规则，**用本项目自己的代码和文字重新实现**，没有拷贝它们的源码、提示词原文或素材。

| 项目 | 作者 | 许可 | 我们参考了什么 | 用在本仓库哪里 |
|---|---|---|---|---|
| [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | Lemomo（lemomo-ai） | MIT | 「风格 = 风格说明 + 一支代码样片」的组织方式；「把风格改成你自己的」风格工作室流程；「剪辑与纪实」这一类风格的分类思路（字幕新闻、视觉调查）；结语「风格只是载体，内容才是最重要的」 | `references/09-style-studio.md`、`styles/caption-news`、`styles/investigation`、`styles/_samples/styles2_film.js`、`styles/INDEX.md` |
| [huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) | alchaincyf（花叔） | MIT | 9 种解说语法（尺度穿行、桌面材料、白板、3b1b 形变等）；「镜头是标点」等镜头规则。花叔形象与 Clawd 角色不在借鉴范围内，本项目没有使用 | `references/11-absorbed.md` 第一、二节 |
| [bang-motion](https://github.com/bangtutorial/bang-motion) | bangtutorial | MIT | 「画外音提到的人、物、书必须出图」 | `references/11-absorbed.md` |
| [khan-explainer](https://github.com/haiderfarooq3/khan-explainer) | haiderfarooq3 | MIT | 边讲边写的板书语法，启发了「粉笔黑板」风格 | `styles/chalk` |
| [paper2video](https://github.com/Lunamos/paper2video) | Lunamos | MIT | 3Blue1Brown 式深色数据画面；「出处台账」写法 | `styles/darkmath`、事实清单 `facts.md` 结构 |
| [anatomy-explainer](https://github.com/gnipbao/anatomy-explainer) | gnipbao | MIT | 等轴测机械剖面的画面思路 | `styles/isometric` |
| [Paper-Cut](https://github.com/aijiduonadegou/Paper-Cut) | aijiduonadegou | MIT | 生图定稿 → 原图拆层 → 代码驱动拼贴动画的做法 | `styles/collage`（半调拼贴，增强档） |
| [SketchNarrator](https://github.com/qingyabailu-git/SketchNarrator) | qingyabailu-git | MIT | 中文手绘讲解的画面语法 | `styles/chalk`、`styles/sketch` |
| [vibe-knowledge-video-skill](https://github.com/LuZhong-Li/vibe-knowledge-video-skill) | LuZhong-Li | MIT | 对抖音「Vibe 知识大赏」作品的实测结论（比如 7 部作品都没有旁白）；竖屏底部避让、概念命名环节、片尾三件套、「外部评审意见要先核验再改」等流程建议 | `references/11-absorbed.md` 第一、三、四节 |
| [earshot](https://github.com/Leonxlnx/earshot) | Leonxlnx | MIT | 代码生成音效。**不随仓库分发**，用户按需自行安装 | `references/10-earshot.md`、`tools/earshot_render.py`、`tools/patch_earshot.py` |

## 二、只参考了思路（未使用其代码、提示词原文或素材）

下面这些项目没有标准开源许可、许可限制商用，或者包含第三方素材。我们**只看过公开说明、借鉴了一般性的思路**，没有拷贝任何代码、提示词、文字或素材。

| 项目 | 作者 | 许可情况 | 参考了什么 |
|---|---|---|---|
| [anything2explainer](https://github.com/Vincentwei1021/anything2explainer) | Vincentwei1021 | 非标准许可（GitHub 显示 NOASSERTION） | 旁白与画面对位的一般原则（出现帧对齐、静止预算、字幕整句出入、样片先行） |
| [video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) | Vincentwei1021 | 非标准许可（仓库自述为 PolyForm Noncommercial） | 强调预算、字幕素排等一般原则 |
| [opus-5-5-86-styles-in-motion](https://github.com/GODGOD126/opus-5-5-86-styles-in-motion) | GODGOD126 | 未声明许可证（含第三方素材） | 风格分类的整体视野 |
| [opus-video-style-library](https://github.com/limingzhaox/opus-video-style-library) | limingzhaox | 未声明许可证 | 风格案例的整理方式 |
| [vibe-knowledge](https://github.com/worlds3/vibe-knowledge) | worlds3 | 未声明许可证 | 「示意」角标、片尾结构等发布层面的做法。**同名说明：该项目与本项目名字相同，但两者是各自独立开发的不同项目，没有代码或素材上的关系。** |

## 三、引擎与课程模板里引用的项目（skills/ai-teardown）

| 项目 | 作者 | 许可 | 怎么用的 |
|---|---|---|---|
| [HyperFrames](https://github.com/heygen-com/hyperframes) | HeyGen | Apache-2.0 | 可选接入：`engine/scripts/hf_host.py` 调用其命令行渲染动效模板，不包含其源码 |
| [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) | yihui-dev | MIT | 课程示例里作为参考资料链接 |
| [WorkBuddyGuide](https://github.com/AlephAITech/WorkBuddyGuide) | AlephAITech | MIT | 课程模板示例的内容来源，片中按 MIT 注明出处 |

## 四、随仓库分发的第三方组件

three.js、Rough.js、lottie-web、AntV X6、Geist、Noto Sans SC、霞鹜文楷、Tabler / Lucide / Iconoir / IconPark 图标、CC0 键盘音效等，许可和位置见 [THIRD_PARTY.md](THIRD_PARTY.md)。

## 五、外部服务

小米 MiMo（配音与语音识别）、[Renoise](https://renoise.ai/mcp?utm_medium=xcom&utm_source=official)（增强档的配图、动态镜头、音效）、Anthropic Claude Code / Claude Opus（编排与写代码）。这些服务由使用者自行注册，本仓库不包含任何密钥。

---

**English summary.** All code, style demos and docs in this repository were written for this project. We studied the open-source projects listed above. From the MIT-licensed ones (section 1) we adopted methods and rules, re-implemented in our own code and words, with no source code, prompt text or assets copied. From the projects in section 2, which are unlicensed, non-commercial or contain third-party assets, we took only general ideas. worlds3/vibe-knowledge shares our name but is an unrelated, independently developed project. If anything here is inaccurate, please open an issue and we will fix it promptly.
