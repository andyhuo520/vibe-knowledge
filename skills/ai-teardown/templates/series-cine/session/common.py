"""读 session.env（KEY=VALUE，# 开头是注释，~ 展开），并算出 Claude Code 存会话记录的目录。"""
import os
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent


def env():
    e = {}
    for line in (HERE / "session.env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            e[k.strip()] = os.path.expanduser(v.strip())
    return e


def project_logs():
    """<配置目录>/projects/<项目路径把非字母数字换成 -> 下的 *.jsonl，按修改时间排序。"""
    e = env()
    root = Path(e.get("SESSION_CONFIG") or "~/.claude").expanduser() / "projects"
    proj = str(Path(e["SESSION_PROJ"]).expanduser().resolve())
    d = root / re.sub(r"[^A-Za-z0-9]", "-", proj)
    if not d.exists():   # 路径里有中文等字符时命名规则可能不同：退回到名字里带项目目录名、最近改过的那个
        cands = [p for p in root.glob("*") if p.is_dir() and re.sub(r"[^A-Za-z0-9]", "-", Path(proj).name) in p.name]
        d = max(cands, key=lambda p: p.stat().st_mtime) if cands else d
    return sorted(d.glob("*.jsonl"), key=os.path.getmtime)
