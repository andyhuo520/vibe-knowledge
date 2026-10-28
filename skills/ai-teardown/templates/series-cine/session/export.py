#!/usr/bin/env python3
"""把真实会话的每一轮（turnN.jsonl，stream-json）整理成课程画面用的 turnN.json：
提示词、逐条工具调用（名字 + 一句话说明 + 相对秒数）、它写的文字、这一轮的用时和折算费用。
路径里的本机用户名一律换成 ~（录屏打码规矩）。
用法：python3 session/export.py [轮次…]（默认全部）"""
import glob
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

from common import env, project_logs

HERE = Path(__file__).resolve().parent
HOME = os.path.expanduser("~")


def scrub(s):
    cfg = env().get("SESSION_CONFIG", "")
    if cfg and cfg != os.path.expanduser("~/.claude"):
        s = s.replace(cfg + "/skills/", "~/.claude/skills/")   # 课程实例里的 skill 软链，对学员显示成标准位置
    s = s.replace(HOME, "~")
    return re.sub(r"/Users/[A-Za-z0-9._-]+", "~", s)


def short(tool, inp):
    if tool == "Bash":
        return inp.get("description") or inp.get("command", "")[:90]
    if tool in ("Read", "Write", "Edit"):
        return Path(inp.get("file_path", "")).name
    if tool == "Skill":
        return inp.get("skill", "")
    if tool in ("Glob", "Grep"):
        return inp.get("pattern", "")
    return json.dumps(inp, ensure_ascii=False)[:80]


def ts(d):
    t = d.get("timestamp")
    return datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp() if t else None


def export(n):
    src = HERE / f"turn{n}.jsonl"
    if not src.exists():
        return None
    t0 = float((HERE / f"turn{n}.start").read_text().strip())
    events, texts, result = [], [], {}
    for line in src.read_text(encoding="utf-8").splitlines():
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        if d.get("type") == "assistant":
            for c in d["message"].get("content", []):
                if c.get("type") == "tool_use":
                    events.append({"kind": "tool", "tool": c["name"], "what": scrub(short(c["name"], c.get("input", {}))),
                                   "cmd": scrub(c.get("input", {}).get("command", ""))[:400] if c["name"] == "Bash" else ""})
                elif c.get("type") == "text" and c["text"].strip():
                    events.append({"kind": "text", "text": scrub(c["text"])})
                    texts.append(scrub(c["text"]))
        elif d.get("type") == "result":
            result = {k: d.get(k) for k in ("duration_ms", "num_turns", "total_cost_usd", "is_error", "subtype")}
    # 相对时间：stream-json 没有逐条时间戳，用会话记录（config/projects 下的 jsonl）里的时间补上
    proj = [str(p) for p in project_logs()]
    stamps = []
    if proj:
        for line in open(proj[-1], encoding="utf-8"):
            d = json.loads(line)
            m = d.get("message") or {}
            if m.get("role") == "assistant" and ts(d) and ts(d) >= t0 - 1:
                for c in m.get("content") or []:
                    if isinstance(c, dict) and c.get("type") in ("tool_use", "text") and (c.get("type") == "tool_use" or c.get("text", "").strip()):
                        stamps.append(round(ts(d) - t0, 1))
    for i, e in enumerate(events):
        e["t"] = stamps[i] if i < len(stamps) else None
    # --continue 时每轮 result 里的 total_cost_usd 是整个会话的累计值：这一轮的花费 = 本轮累计 − 上一轮累计
    prev = HERE / f"turn{n - 1}.jsonl"
    if result.get("total_cost_usd") is not None:
        result["cum_cost_usd"] = result["total_cost_usd"]
        pc = 0.0
        if prev.exists():
            for line in prev.read_text(encoding="utf-8").splitlines():
                try:
                    d = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if d.get("type") == "result":
                    pc = d.get("total_cost_usd") or 0.0
        result["total_cost_usd"] = round(result["cum_cost_usd"] - pc, 4)
    out = {"turn": n, "prompt": (HERE / f"turn{n}.prompt.txt").read_text(encoding="utf-8").strip(),
           "start": datetime.fromtimestamp(t0).strftime("%Y-%m-%d %H:%M"), "events": events, "final": texts[-1] if texts else "", **result}
    (HERE / f"turn{n}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    return out


if __name__ == "__main__":
    ns = [int(a) for a in sys.argv[1:]] or sorted(int(re.findall(r"\d+", p.name)[0]) for p in HERE.glob("turn*.jsonl"))
    for n in ns:
        o = export(n)
        if o:
            print(f"turn{n}: {len(o['events'])} 条事件，用时 {o.get('duration_ms', 0) / 1000:.0f}s，折算 ${o.get('total_cost_usd') or 0:.2f}")
