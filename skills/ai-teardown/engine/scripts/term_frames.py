#!/usr/bin/env python3
"""把 term_record.py 录的 .cast 回放成画面帧，给 primitives/terminal.js 播放。

用法：python3 scripts/term_frames.py <in.cast> <out.json> [--fps 15] [--max-gap 1.2] [--speed 1]
- 用 pyte 逐事件回放，按 fps 取样，只存有变化的行（差分）。
- --max-gap：超过这么多秒的「屏幕没动」一律压成这么长（智能体思考、跑命令时的空等不用全放）。
- --speed：整体再加速。
- 录制时打的 mark 会一起按新时间轴换算，写进 marks，配旁白时可以对齐。
输出：{cols, rows, duration, marks:{名字: 秒}, frames:[{t, d:{行号: [[文字, 前景, 背景, 标志], ...]}, c:[列, 行, 是否显示光标]}]}
标志位：1 粗体 2 斜体 4 下划线 8 反色。
"""
import argparse, json, re
from pathlib import Path

import pyte

# pyte 不认识的键盘协议控制码（kitty 键盘协议、modifyOtherKeys），不滤掉会在屏幕上漏出「1u」之类的字
KITTY = re.compile(r"\x1b\[[<>=?]\d*(?:;\d+)*u|\x1b\[>\d*(?:;\d+)*m")


def row_runs(line, cols):
    runs, cur = [], None
    for x in range(cols):
        ch = line[x]
        if ch.data == "":  # 宽字符的后半格
            continue
        flags = (1 if ch.bold else 0) | (2 if ch.italics else 0) | (4 if ch.underscore else 0) | (8 if ch.reverse else 0)
        key = (ch.fg, ch.bg, flags)
        if cur and cur[1:] == list(key):
            cur[0] += ch.data
        else:
            cur = [ch.data, *key]
            runs.append(cur)
    # 行尾默认样式的空格去掉，减小体积
    while runs and runs[-1][1] == "default" and runs[-1][2] == "default" and runs[-1][3] == 0 and runs[-1][0].strip() == "":
        runs.pop()
    if runs and runs[-1][1] == "default" and runs[-1][2] == "default" and runs[-1][3] == 0:
        runs[-1][0] = runs[-1][0].rstrip()
    return runs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cast"); ap.add_argument("out")
    ap.add_argument("--fps", type=float, default=15)
    ap.add_argument("--max-gap", type=float, default=1.2)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--drop", default="", help="额外要整行抹掉的内容（正则），例如私人 MCP 服务的名字")
    ap.add_argument("--clip", action="append", default=[], help="切段：名字:起点标记:终点标记（终点可省略=到结尾）；每段单独输出 <输出目录>/<名字>.frames.json")
    a = ap.parse_args()

    lines = Path(a.cast).read_text(encoding="utf-8").splitlines()
    head = json.loads(lines[0])
    ev = [json.loads(l) for l in lines[1:]]
    cols, rows = head["width"], head["height"]
    screen = pyte.Screen(cols, rows)
    stream = pyte.Stream(screen)

    # 1) 时间轴重映射：输出事件之间的空档超过 max-gap 的压短
    remap, prev_raw, prev_new = [], 0.0, 0.0
    for e in ev:
        gap = e[0] - prev_raw
        new = prev_new + min(gap, a.max_gap)
        remap.append(new / a.speed)
        prev_raw, prev_new = e[0], new

    # 2) 回放 + 按帧取样
    frames, last_rows, marks = [], [None] * rows, {}
    step = 1 / a.fps
    next_t = 0.0

    # 打码：邮箱、API key、令牌一律换成圆点（逐格替换，版面不动）
    SECRET = re.compile(r"[\w.+-]+@(?!example\.com)[\w-]+\.[\w.-]+|(?<![A-Za-z])sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{10,}")   # example.com 是示例地址，不打码

    def screen_text():
        # 按阅读顺序把整屏拼成一串：长输出在行尾硬折，拼起来就接上了，跨行的用户名、密钥、服务名也能抓到
        cells = [(y, x) for y in range(rows) for x in range(cols)]
        return cells, "".join(screen.buffer[y][x].data or " " for y, x in cells)

    def redact():
        cells, txt = screen_text()
        for m in SECRET.finditer(txt):
            for i in range(m.start(), m.end()):
                y, x = cells[i]; screen.buffer[y][x] = screen.buffer[y][x]._replace(data="•")
        # 本机用户名（输出被切成几块时，流里替换会漏；流式输出到一半只露出「/Users/andy」的那一帧也要换）
        for m in re.finditer(r"andyhu|(?<=/Users/)a(?:n(?:d(?:y(?:h)?)?)?)?$|(?<=/Users/)a(?:n(?:d(?:y(?:h)?)?)?)?(?=\s)", txt):
            for k, i in enumerate(range(m.start(), m.end())):
                y, x = cells[i]; screen.buffer[y][x] = screen.buffer[y][x]._replace(data="myname"[k])

    # 个人账号状态（额度提醒、本机配置告警）不给观众看：整行抹成空白
    DROP = re.compile(r"weekly limit|usage limit|% left|warnings · f2|(?i:memmy)|^hook: |ERROR codex_core|failed to load skill|Starting MCP servers" + (f"|{a.drop}" if a.drop else ""))

    def drop():
        hit = {y for y in range(rows) if DROP.search("".join(screen.buffer[y][x].data for x in range(cols)))}
        cells, txt = screen_text()
        for m in DROP.finditer(txt):   # 折到两行里的也算：涉及的每一行都抹
            hit.update(cells[i][0] for i in range(m.start(), m.end()))
        for y in hit:
            for x in range(cols):
                screen.buffer[y][x] = screen.default_char

    def snap(t):
        drop()
        redact()
        d = {}
        for y in range(rows):
            r = row_runs(screen.buffer[y], cols)
            if r != last_rows[y]:
                d[str(y)] = r
                last_rows[y] = r
        c = [screen.cursor.x, screen.cursor.y, 0 if screen.cursor.hidden else 1]
        if d or not frames or frames[-1]["c"] != c:
            frames.append({"t": round(t, 3), "d": d, "c": c})

    for e, t in zip(ev, remap):
        while next_t < t:
            snap(next_t)
            next_t += step
        if e[1] == "o":
            data = KITTY.sub("", e[2]).replace("\ufeff", "").replace("\ufffd\ufffd", "• ")   # 旧录屏里被拆坏的项目符号.replace("andyhu", "myname")   # 本机用户名换成同长度的占位，版面不动
            stream.feed(data)
        elif e[1] == "m":
            marks[e[2]] = round(t, 3)
    snap(next_t)
    duration = round(next_t + 1.0, 3)
    Path(a.out).write_text(json.dumps({"cols": cols, "rows": rows, "duration": duration, "marks": marks, "frames": frames},
                                      ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # 切段：每段第一帧写全屏状态，之后照原样差分；时间从 0 算，段内的标记一并换算
    for spec in a.clip:
        name, m0, *rest = spec.split(":")
        t0 = marks[m0] if m0 else 0.0
        t1 = marks[rest[0]] if rest and rest[0] else duration
        state, cur_c, out_frames = [[] for _ in range(rows)], [0, 0, 1], []
        for f in frames:
            if f["t"] <= t0:
                for k, v in f["d"].items():
                    state[int(k)] = v
                cur_c = f["c"]
                continue
            if f["t"] > t1:
                break
            out_frames.append({"t": round(f["t"] - t0, 3), "d": f["d"], "c": f["c"]})
        out_frames.insert(0, {"t": 0.0, "d": {str(y): state[y] for y in range(rows)}, "c": cur_c})
        # 段内标记：「段名.标记」还原成标准名（如 r5.submit → submit），方便场景里写 mark:submit
        sub = {(k.split(".", 1)[1] if k.startswith(name + ".") else k): round(v - t0, 3) for k, v in marks.items() if t0 <= v <= t1}
        dst = Path(a.out).parent / f"{name}.frames.json"
        dst.write_text(json.dumps({"cols": cols, "rows": rows, "duration": round(t1 - t0 + 0.5, 3), "marks": sub, "frames": out_frames},
                                  ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"  切出 {dst.name}：{t1 - t0:.1f} 秒，{len(out_frames)} 帧，标记 {sub}")
    raw = ev[-1][0] if ev else 0
    print(f"{Path(a.out).name}：{len(frames)} 帧，原始 {raw:.1f} 秒 → 回放 {duration:.1f} 秒，标记 {marks}")


if __name__ == "__main__":
    main()
