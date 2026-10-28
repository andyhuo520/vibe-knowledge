# 01 · 数据契约

一个课题一个目录（如 `examples/codex/`），五份 JSON 串起整条流水线。Schema 在 `schemas/`，校验用 `scripts/check.py`。

```
brief.json ──► research/sources.json ──► research/facts.json ──► lesson/concepts.json ──► lesson/lesson.json
   立项            信源登记（含快照）          事实账本（原子事实）         总图 · 概念 · 目标            教案（唯一源文件）
                                                                                                    │ 配音
                                                                                                    ▼
                                                                                        build/timings.json（自动生成）
```

## 五份文件各管什么

| 文件 | 谁写 | 关键字段 | 下游谁用 |
|---|---|---|---|
| `brief.json` | 第 1 步，与用户确认 | `subject.resolved`（消歧后的实体）、`subject.not`（排除的同名物）、`archetype`、`duration_s`、`depth_ceiling`、`voice`、`as_of` | 全部 |
| `research/sources.json` | 第 2 步 | `tier`（U/T1/T2/T3）、`fetch_method`、`snapshot`、`sha256` | facts 的证据核对；片尾出处清单 |
| `research/facts.json` | 第 3 步 | `claim`、`category`、`status`、`evidence[].quote`（必须在快照里逐字找得到）、`numbers`、`terms` | 讲稿、画面、课件「点图看出处」 |
| `lesson/concepts.json` | 第 4 步 | `master_map`（总图节点与连线，带 `role` 与 `honesty`）、`concepts[].prereqs`、`misconceptions`、`objectives`（冷读题） | 教案排序、总图、冷读盲测 |
| `lesson/lesson.json` | 第 5 步，CP1 确认 | `chapters[].focus_node`、`beats[].move`（四拍）、`narration`（带 `[[cue]]`）、`visual.primitive/params`、`facts` | 配音、编译成舞台、课件 |

## 约定

- **编号永不复用**：来源 `S01…`、事实 `F001…`、概念 `C01…`、误区 `M01…`、目标 `Q01…`、章节 `CH01…`、beat `B001…`。事实被新版本替代时，新事实写 `supersedes`。
- **cue 标记**：旁白里用 `[[名字]]` 标出画面动作对齐的位置，例如 `它先[[read]]读代码，再[[test]]跑测试`。每个标记在 `beats[].cues` 里声明它触发哪个原语钩子（`reveal:model`、`state:3`、`press`）。配音脚本把标记换算成绝对秒数写进 `timings.json`。
- **四拍**：`move` 取 `ask`（问：为什么需要它）→ `show`（演）→ `name`（名：给术语）→ `place`（归：放回总图点亮），另有 `hook`、`compare`、`recap`、`quiz`、`transition`、`end`。
- **一个 beat 至多引入一个新概念**（`concept` 字段只能填一个）。
- **诚实编码**：引用了 `inferred` / `undisclosed` 事实的 beat，要么 `visual.honesty` 标成对应值，要么旁白里明说（「推断」「官方没有公开」）。

## check.py 查什么

| 类别 | 检查 | 级别 |
|---|---|---|
| Schema | 五份文件分别过 JSON Schema 2020-12 | ERROR |
| 信源 | id 唯一；快照文件存在；sha256 对得上 | ERROR / WARN |
| 事实 | 摘录能在快照里逐字找到（NFKC 归一、忽略空白）；`verified` 至少一个 T1 或两个 T2；讲机制（`how`）必须有 T1；`conflict/inferred/undisclosed` 必须写 notes；`number` 类必须填 numbers | ERROR |
| 概念 | 先修存在且无环；总图节点、连线、parent 引用有效；学习目标引用的概念存在 | ERROR |
| 教案 | 章节串起来的 beat 顺序与 beats 一致；每个 `[[cue]]` 都有声明，反之亦然；引入概念前先修已讲；`show/name/place/compare/recap` 必须挂事实；推断与未披露的事实按诚实编码处理；**旁白里的每个数字都能在所引事实里找到** | ERROR |
| 节奏 | 讲稿字数 ÷ 目标语速 与 `duration_s` 偏差超过 15% | WARN |
| 覆盖 | 深度上限内的概念没有 beat 引入 | WARN |

## timings.json（配音后自动生成）

```json
{
  "voice": {"id": "zh-CN-YunxiNeural", "rate": "-10%"},
  "beats": {
    "B001": {"file": "audio/B001.mp3", "text": "去掉 cue 的旁白", "start": 0.4, "end": 7.94, "duration": 7.54,
             "words": [{"text": "任务", "start": 0.76, "end": 1.05, "i0": 2, "i1": 4}],
             "cues": {"zoom": 4.13}}
  },
  "total": 32.12
}
```

`words[].i0/i1` 是原文字符区间：字幕按它断行，读音词典替换了发音也能对回原文。
