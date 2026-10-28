# 真实会话录制（实战课的贯穿线）

实战课里每节都放「一次真实会话」里对应的那一步：真实提示词、它真实的输出、真实的文件和用时。录一次，全课用。

## 准备
1. 一份**课程专用**的 Claude Code：独立配置目录、关自动更新、不带日常的模型路由（`cc.example` 是启动脚本示例）。登录由用户本人在终端完成。
2. 要用的 skill 以软链接放进课程实例：`ln -s ~/.claude/skills/promo-video <课程配置目录>/skills/promo-video`。
3. 一个**虚构产品**的演示官网（静态页，放在 `SITE_DIR`），避免拿真实公司做演示。
4. 改 `session.env`：项目目录（空目录起步）、启动脚本、配置目录、演示官网。
5. **录之前先报预计用量**（参考：宣传片实战课 5 轮约 16 分钟、48 次模型调用、按 API 价折算约 3.4 美元），用户确认再录。
6. 会改动的本机状态先备份，录完还原（例如 `~/.cache/promo-video/music-usage.json`）。

## 录
```bash
session/turn.sh 1 "用 promo-video 给<产品>做一支 30 秒宣传片，官网 http://127.0.0.1:8930。"
session/turn.sh 2 "<回答它的确认问题>"            # 之后每轮自动 --continue 接同一个会话
python3 session/export.py        # turnN.jsonl → turnN.json：提示词、逐条工具调用和相对秒数、它写的文字、这一轮用时和费用
python3 session/usage.py > session/usage.json   # 全程用量（按 message id 去重，缓存写按 1 小时缓存价）
```

## 坑
- `-p` 模式下它把渲染放到后台，这一轮一结束渲染就被杀掉（成片缺 moov、打不开）。要渲染就明确让它前台跑。
- `--continue` 时每轮 result 里的 `total_cost_usd` 是整个会话的累计值；`export.py` 已经换算成这一轮的增量。
- 同一条回复在会话记录里会拆成多行，用量要按 message id 去重，否则会多算好几倍。
- 画面里出现的路径一律把本机用户名换成 `~`（`export.py` 已处理）；授权文件、密钥、账号邮箱不能出现在任何画面里。
