#!/usr/bin/env python3
"""知识大赏强制 BGM（用户规定 2026-10-28：每条视频都要有 vibe-bgm，音量统一、合适）。
由 cine/tools/finish.py 在混音时调用（new_film.py / 本文件 --patch 会把钩子打进 finish.py）：
  0. 唯一例外：用户明确要求换曲 → 音乐条目写 bgm: true + user_request: "用户原话"，这条当 BGM，vibe-bgm 让位（音量照样校准）。
  1. prepare()：film.js 没放 BGM（src 文件名是 bgm.wav 的条目）→ 用 fit_bgm.py 按片长裁一份 build/bgm_auto.wav 自动补上；
     其他 ≥20 秒的整段配乐（Lyria、曲库）一律停用，短音效、镜头原声保留。
  2. calibrate()：不管 film.js 里写了多大 gain，BGM 整体音量都按人声重新校准：
     说话时（已压低）BGM 比人声低 VOICE_GAP dB；film.js 的 gain_curve 只保留「形状」（哪里起伏），绝对音量由这里定。
     没说话的地方照 finish.py 原本的压低逻辑自动抬起（约 +7 dB），片尾尾卡再按 gain_curve 抬。
  3. 写 build/bgm.json（有没有 BGM、校准前后的人声比），qa.py 会读它，没有就报警。
手动打补丁：python3 bgm_force.py --patch <系列目录>（例：~/Desktop/vibe-knowledge/examples/vk）"""
import json
import subprocess
import sys
from pathlib import Path

SK = Path(__file__).resolve().parents[1]
BGM_SRC = SK / "assets/music/vibe-bgm.m4a"
VOICE_GAP = 10.0        # 说话时 BGM 比人声低多少 dB。用户要求「音量高一点」（10-28）：14 → 10；8 以下开始抢人声，12 以上偏轻
LONG = 20.0             # 超过这个时长的非 BGM 音乐条目视为整段配乐，停用


def is_bgm(m):
    return Path(str(m.get("src", ""))).name in ("bgm.wav", "bgm_auto.wav")


def is_user_bgm(m):
    # 唯一的更换口子：用户在对话里明确要求换曲，film.js 里这样写——
    # music.push({ src: P("audio/xxx.wav"), …, bgm: true, user_request: "用户原话，比如：这期换成我给的 xxx.mp3" })
    return bool(m.get("bgm")) and bool(str(m.get("user_request", "")).strip())


def prepare(info, total, B, py=sys.executable):
    music = info.get("music", [])
    keep, dropped = [], []
    user = [m for m in music if is_user_bgm(m)]
    for m in music:
        if user and is_bgm(m):            # 用户要求换曲：vibe-bgm 让位
            dropped.append(Path(str(m.get("src"))).name); continue
        if is_user_bgm(m):
            m["_bgm"] = True; keep.append(m)
        elif m.get("bgm") and not is_user_bgm(m):
            print("  BGM 强制：有条目标了 bgm: true 但没写 user_request（用户原话），不认，照常用 vibe-bgm")
            dropped.append(Path(str(m.get("src"))).name)
        elif is_bgm(m):
            m["_bgm"] = True; keep.append(m)
        elif float(m.get("dur", 0)) >= LONG and not str(m.get("src", "")).startswith("earshot:"):
            dropped.append(Path(str(m.get("src"))).name)
        else:
            keep.append(m)
    auto = False
    if not any(m.get("_bgm") for m in keep):
        out = Path(B) / "bgm_auto.wav"
        subprocess.run([py, str(SK / "tools/fit_bgm.py"), str(out), "--seconds", f"{total:.3f}"], check=True,
                       stdout=subprocess.DEVNULL)
        keep.insert(0, {"src": str(out), "from": 0, "at": 0, "dur": total, "gain": 0, "fade_in": 0.3, "fade_out": 1.8, "_bgm": True})
        auto = True
    if user:
        print(f"  BGM：用户要求更换 → {Path(str(user[0].get('src'))).name}（{user[0].get('user_request')}）")
    if dropped:
        print(f"  BGM 强制：停用整段配乐 {', '.join(dropped)}（" + ("用户要求换曲" if user else "知识大赏统一用 vibe-bgm") + "）")
    if auto:
        print(f"  BGM 强制：film.js 没放 BGM，已按片长 {total:.1f}s 自动补上 vibe-bgm")
    info["music"] = keep
    return {"auto": auto, "dropped": dropped, "user_bgm": (Path(str(user[0]["src"])).name, user[0]["user_request"]) if user else None}


def calibrate(bgmt, narr, speech, B, state):
    """bgmt：已乘过 gain_curve 形状和压低包络的 BGM 轨（n×2）；narr：人声轨；speech：说话的采样掩码。"""
    import numpy as np   # 只在混音时需要；--patch 用系统 python3 也能跑
    rep = {"has_bgm": bool(np.any(bgmt)), "voice_gap_target_db": VOICE_GAP, **state}
    if rep["has_bgm"] and speech.any():
        rv = np.sqrt(np.mean(narr[speech] ** 2)); rb = np.sqrt(np.mean(bgmt[speech] ** 2))
        before = 20 * np.log10(rv / max(rb, 1e-9))
        g = 10 ** ((before - VOICE_GAP) / 20)
        bgmt = bgmt * g
        quiet = ~speech
        rq = np.sqrt(np.mean(bgmt[quiet] ** 2)) if quiet.any() else 0
        rep.update(voice_gap_before_db=round(float(before), 1), gain_applied_db=round(float(20 * np.log10(g)), 1),
                   voice_gap_db=VOICE_GAP, gap_in_pauses_db=round(float(20 * np.log10(rv / max(rq, 1e-9))), 1) if quiet.any() else None)
        print(f"  BGM 校准：说话时人声比 BGM 高 {before:.1f} → {VOICE_GAP:.1f} dB（BGM {20 * np.log10(g):+.1f} dB）；没说话处人声比 BGM 高 {rep['gap_in_pauses_db']} dB")
    (Path(B) / "bgm.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    return bgmt


# ── 给 finish.py 打钩子（幂等）──
HOOKS = [
    ("    import hashlib, os\n",
     "    import hashlib, os\n"
     "    sys.path.insert(0, str(Path.home() / \".claude/skills/vibe-knowledge/tools\")); import bgm_force as VKBGM   # 知识大赏强制 BGM\n"
     "    _bgm_state = VKBGM.prepare(info, total, B)\n"
     "    bgmt = np.zeros((n, 2))\n"),
    ("            clipa[j0:j1] += a[: j1 - j0] * (g * dk)[:, None]\n",
     "            (bgmt if m.get(\"_bgm\") else clipa)[j0:j1] += a[: j1 - j0] * (g * dk)[:, None]\n"),
    ("    mix = narr * 1.0 + bed * duck[:, None] + sfx * 0.9 + clipa\n",
     "    clipa += VKBGM.calibrate(bgmt, narr, env > 0.5, B, _bgm_state)\n"
     "    mix = narr * 1.0 + bed * duck[:, None] + sfx * 0.9 + clipa\n"),
]
MARK = "import bgm_force as VKBGM"


def patch(series):
    p = Path(series).expanduser() / "cine/tools/finish.py"
    s = p.read_text(encoding="utf-8")
    if MARK in s:
        print(f"✓ 已有强制 BGM 钩子：{p}"); return
    for a, b in HOOKS:
        if s.count(a) != 1:
            sys.exit(f"{p} 里找不到（或不止一处）：{a.strip()[:60]}……cine 引擎改过了，钩子要重写")
        s = s.replace(a, b)
    p.write_text(s, encoding="utf-8")
    print(f"✓ 补丁：{p}（强制 vibe-bgm + 按人声校准音量）")


if __name__ == "__main__":
    if "--patch" in sys.argv:
        patch(sys.argv[sys.argv.index("--patch") + 1])
    else:
        sys.exit(__doc__)
