#!/usr/bin/env python3
"""汇总真实会话的用量：轮数、工具调用、token、按 Opus 5.5 API 价折算（$4 输入 / $20 输出 / $0.20 缓存读 / $8 缓存写，每百万 token）。
Claude Code 用 1 小时缓存，缓存写按输入价 2 倍计（和它自己报的 total_cost_usd 一致）。同一条回复拆成多行记录时按 message id 只算一次。
用法：python3 session/usage.py > session/usage.json"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import project_logs
fs = [str(p) for p in project_logs()]
if not fs: sys.exit("还没有会话记录")
u = dict(input_tokens=0, output_tokens=0, cache_read_input_tokens=0, cache_creation_input_tokens=0); msgs = tools = 0; ts = []; models = set()
seen = set()
for f in fs:
    for line in open(f):
        d = json.loads(line)
        if "timestamp" in d: ts.append(d["timestamp"])
        m = d.get("message") or {}
        if m.get("role") != "assistant": continue
        mid = m.get("id")
        models.add(m.get("model"))
        for c in m.get("content") or []:
            if isinstance(c, dict) and c.get("type") == "tool_use": tools += 1
        if mid in seen: continue          # 同一条回复被拆成多行记录时只算一次用量
        seen.add(mid); msgs += 1
        for k in u: u[k] += (m.get("usage") or {}).get(k, 0) or 0
cost = u["input_tokens"] * 4e-6 + u["output_tokens"] * 20e-6 + u["cache_read_input_tokens"] * 0.2e-6 + u["cache_creation_input_tokens"] * 8e-6
print(json.dumps({"files": [os.path.basename(f) for f in fs], "models": sorted(x for x in models if x), "assistant_msgs": msgs, "tool_calls": tools,
                  "first": ts[0] if ts else None, "last": ts[-1] if ts else None, **u, "api_equiv_usd": round(cost, 2)}, ensure_ascii=False, indent=1))
