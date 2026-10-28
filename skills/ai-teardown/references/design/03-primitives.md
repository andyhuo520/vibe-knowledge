# 03 · 教学原语（首批 13 个）

原语 = 可复用、带参数、由时间驱动的动画组件，接口见 `02-scene-contract.md`。
状态：✅ 已实现，并在 Spike 或 Codex 整片里用过 · ◐ 部分实现 · ○ 仅规格。
实际参数以源码顶部注释为准，与本表不同的地方已在状态栏注明（2026-09-26 整片后更新）。

| 原语 | 讲什么 | 关键参数 | 逐步点 / cue 钩子 | 点图看出处 | 状态 |
|---|---|---|---|---|---|
| **SystemMap 总图** | 由什么组成、谁调用谁 | `nodes[{id,label,sub,role,x,y,w,h,icon,honesty,facts,ghost,labelAt}]`、`edges[{from,to,label,labelSide,bend,both,honesty,facts}]`、`reveal`、`lit`、`dim`、`open`/`close` | `reveal:<id>`、`open:<id>` | 节点、连线标签 | ✅ |
| **Loop 循环** | 反复执行直到满足条件 | `steps[{label,role,angle,lx,ly}]`、`arrivals[]`（令牌到达各步的时刻）、`passAt`、`passLabel`、`title` | `step:<i>`、`pass` | 圆心 | ✅ |
| **Morph 单形状** | 一条产品流程怎么走完 | 见 `04-morph.md` | `state:<i>` | 每个状态 | ✅（6 种状态） |
| **Pipeline 管线** | 数据按什么顺序流过哪些环节 | `stages[{label,role,icon,facts}]`、`packets[{t0,t1,label}]`（在管线里移动的数据块）、`active[[t,i]]` | `stage:<i>` | 每个环节 | ○ |
| **Terminal 终端** | 它实际跑了什么命令、看到什么输出 | `lines[{kind:cmd\|out\|err\|ok,text,at}]`、`prompt`、`cps`、`title` | `line:<i>` | 整个窗口 | ◐（Morph 内的终端状态） |
| **ChatUI 对话** | 用户怎么交代任务、它怎么回复 | `messages[{role:user\|assistant\|tool,text,at,cps}]`、`skin` | `msg:<i>` | 每条消息 | ○ |
| **CodeDiff 代码改动** | 它改了哪些代码 | `file`、`lines[{k:" "\|"+"\|"-",text,at}]`、`highlight[]` | `line:<i>` | 文件头 | ✅ `cards.js`，实际参数 `file`、`lines`、`actions`（按钮）、`checks`（检查项） |
| **Cursor 光标** | 人在界面上点了什么、拖了什么 | `keys[[t,x,y]]`（世界坐标）、`presses[[t0,t1]]`、`visible[[t0,t1]]` | 按下时刻 | — | ✅（屏幕层叠加件） |
| **Sandbox 权限边界** | 它能碰什么、不能碰什么、什么要你批准 | `frame{w,h}`、`gates[{label,state:open\|closed\|ask,facts}]`、`askAt`（弹出审批的时刻） | `gate:<i>`、`ask` | 每道闸门 | ✅ `sandbox.js`；闸门状态实际是 `scoped/closed/removed/open`，审批弹窗是 `ask{title,sub,at,buttons,pressAt}` |
| **Analogy 类比** | 先用熟悉的东西打比方，再变形成真实结构 | `from{asset: svg\|lottie, label}`、`pairs[{from,to}]`（类比物 ↔ 真实部件）、`morphAt` | `pair:<i>`、`morph` | 每对映射 | ◐ `cards.js` 只做了对照行 `rows[{icon,from,to,role,at}]`；SVG/Lottie 类比物和变形还没做 |
| **Compare 对比与误区** | 和同类差在哪；常见误解 vs 事实 | `mode: side\|myth`、`left/right{title,items[]}`、`myth{text,strikeAt}`、`truth{text,facts}` | `row:<i>`、`strike` | 每行、事实句 | ✅ `cards.js`：myth 模式（划线后出真相）、side 模式（左右两栏，`winnerAt` 高亮胜出一侧） |
| **Metric 数据卡** | 有多好、有多大 | `value`、`unit`、`label`、`facts`（必填，且事实须有 `numbers`）、`countAt` | `count` | 整张卡（强制来源角标） | ○ |
| **ConceptMap 概念地图** | 收束：刚才讲过的全部放回总图 | `from: master_map`、`order[{node,summary,t}]` | `node:<id>` | 每个节点 | ◐ 整片收束直接用 SystemMap 的 `lit` 按旁白逐个点亮，没有单独做 |

## 系列课新增（2026-09-26，按看片反馈加的）

用户看完 Codex 整片说「全是来回的关系图，看着晕」「要打字效果、机器人、小图标、思维导图收尾」「可以做人物和历史」。下面这批原语都不需要镜头移动，换场景用转场（`overlays.wipe`）。

| 原语 | 讲什么 | 关键参数 | 文件 | 状态 |
|---|---|---|---|---|
| **Mascot 机器人讲解员** | 串场、提问、指向重点、收尾欢呼 | `spots[[t,x,y,size]]`（转场时换位）、`poses[[t,pose]]`（idle/wave/point-l/point-r/cheer/present）、`talk`（旁白逐词时间，按词张嘴）、`look` | `mascot.js` | ✅ |
| **Typer 打字文字** | 标题、问题、引语、关键词 | `lines[{text,at,cps,size,weight,color,hl}]`，`*词*` 高亮后荧光笔划出；`box: bubble\|card`、`tail`、`src` 出处小字；光标跟随 | `typer.js` | ✅ |
| **IconRow 图标排** | 几个角色或几件事并排出场 | `items[{icon,label,sub,color,at} \| {kind:wall} \| {kind:arrow}]`、`title` | `typer.js` | ✅ |
| **Portrait 人物卡** | 人物介绍、历史照片 | `src,w,h,pos,tilt`、`name,sub`（打字）、`credit`（署名与许可，必填）、`kb` 缓慢推近 | `portrait.js` | ✅ |
| **Timeline 时间线** | 历史脉络、版本演进 | `events[{year,title,sub,img,pos,zoom,credit,icon,color,at}]`、`heading`；进度线跟着最新事件走 | `timeline.js` | ✅ |
| **MindMap 思维导图** | 每节收尾 | `center{label,icon,color,at}`、`branches[{label,sub,icon,color,side,y,at}]`、`celebrate` 撒星星 | `mindmap.js` | ✅ |
| **Floaties 漂浮小图标** | 给开场、大标题添活气 | `items[{icon,x,y,size,color,at}]` | `floaties.js` | ✅ |

配套：
- `runtime/typing.js`：所有打字效果的公共件（节奏、弹入、高亮、打字音效提示）。
- `runtime/iconify.js`：开源图标（tabler / lucide / iconoir，离线在 `assets/iconsets/`），线条可以自己画出来；用 `scripts/icons.py` 按名字抽进 bundle。
- `overlays.wipe`：两层马卡龙色圆转场，场景在铺满那一刻切换。
- `theme.js`：新增 `macaron`（系列课默认）、`mint`、`night`，所有主题都有六个色位 `--m1…--m6`（主色、`-t` 浅底、`-d` 深色字）。
- `scripts/fetch_images.py`：从 Wikimedia Commons 取图，只收公有领域、CC0、CC BY、CC BY-SA，自动记下作者与许可。

## 基础件（不计入 13 个）

| 件 | 作用 | 状态 |
|---|---|---|
| Captions 字幕 | 按词级时间戳断行，每行 ≤ 18 字，句读处断 | ✅ |
| Tag 角标 | 「界面示意」「推断」「Spike 样片」 | ✅ |
| Title 章节卡 | 章节开头的大字标题 | ✅ `cards.js` |
| SourceBadge 来源角标 | 数据卡、截图旁的「来源 · 发布方」 | ○ |
| EndCard 片尾 | 「信息截至 YYYY-MM-DD」+ 主要出处 | ✅ `cards.js` |
| Layers 层级卡 | 自上而下的几层叠加（如 AGENTS.md 的合并顺序），`litAt` 点亮离你最近的一层 | ✅ `cards.js`（整片新增） |
| ChapterLabel 章节角标 | 左上角「第 n 章 · 标题」 | ✅ `overlays.js` |
| TermCard 术语卡 | 新术语第一次出现时，给出一句白话解释 | ✅ `overlays.js` |
| Backdrop 压暗幕 | 屏幕层卡片出现时把世界层压暗 | ✅ `overlays.js` |

## 选型对照（给编排的模型看：内容形状 → 原语）

| 讲稿在说 | 用 |
|---|---|
| X 由 A、B、C 组成 / A 调用 B | SystemMap |
| 反复做某事直到…… | Loop |
| 用户从下任务到拿到结果的一连串操作 | Morph（速览）或 ChatUI + Terminal + CodeDiff（讲解） |
| 数据依次经过几个处理环节 | Pipeline |
| 它能做 / 不能做什么，什么要批准 | Sandbox |
| 一个新术语第一次出现 | Analogy（先打比方）→ 对应原语（再看真实结构） |
| 大家以为……其实…… | Compare（myth 模式） |
| 基准分、价格、参数量 | Metric |
| 全片收束 | ConceptMap |

InkFlow 的教训：光罗列类型，模型不会选新类型；要给「内容形状 → 类型」的对照表。

## 写新原语的检查单

- [ ] `create` 只建 DOM；`render(t)` 把负责的属性全部写一遍
- [ ] 所有动画值来自 `spring.js` / `ease.js`
- [ ] 文字切换有独立进出窗口
- [ ] 颜色只用主题变量；角色色表达「谁在动」
- [ ] 提供 `beats`；有事实的元素提供 `hotspots`
- [ ] 16:9 与 9:16 两套布局
- [ ] 在 `spike/preview.html` 里过一遍确定性测试（DOM 一致）和 Hyperframes `inspect`（0 问题）
