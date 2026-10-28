#!/usr/bin/env python3
"""真实终端录制：在固定尺寸的伪终端里跑一条命令，按脚本「等提示 → 打字 → 回车」，把原始输出连同时间戳录下来。
录出来的是 asciinema v2 风格的 .cast（第一行头信息，之后每行 [秒, "o"|"i"|"m", 数据]），再交给 term_frames.py 回放成画面。

用法：python3 scripts/term_record.py <脚本.json> <输出.cast>
脚本.json：
{
  "cmd": ["codex"], "cwd": "~/Desktop/codex-demo", "cols": 110, "rows": 32,
  "env": {"FOO": "1"},
  "steps": [
    {"wait": "正则，出现在屏幕上才往下走", "timeout": 60},
    {"type": "要打的字", "cps": 14},          # 像人一样逐字打
    {"key": "enter"},                          # enter / esc / tab / up / down / ctrl-c / y / n ……
    {"sleep": 1.5},
    {"mark": "submit"},                        # 打个时间标记，配旁白时用
    {"wait_idle": 4, "timeout": 600},          # 屏幕连续 N 秒没变化才往下走（等智能体干完）
    {"exit": true}                             # 结束录制（会先发 ctrl-c，再等进程退出）
  ]
}
屏幕状态用 pyte 实时模拟，所以 wait 看到的就是观众会看到的画面。
"""
import json, os, pty, re, select, signal, struct, sys, termios, fcntl, time
from pathlib import Path

import pyte

KEYS = {"enter": "\r", "esc": "\x1b", "tab": "\t", "up": "\x1b[A", "down": "\x1b[B", "left": "\x1b[D", "right": "\x1b[C",
        "shift-tab": "\x1b[Z", "ctrl-c": "\x03", "ctrl-d": "\x04", "backspace": "\x7f", "space": " "}


def main():
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    cols, rows = spec.get("cols", 110), spec.get("rows", 32)
    cwd = os.path.expanduser(spec.get("cwd", "."))
    env = {**os.environ, "TERM": "xterm-256color", "COLORTERM": "truecolor", "COLUMNS": str(cols), "LINES": str(rows), **spec.get("env", {})}

    screen = pyte.Screen(cols, rows)
    stream = pyte.ByteStream(screen)
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(cwd)
        os.execvpe(spec["cmd"][0], spec["cmd"], env)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

    t0 = time.monotonic()
    import codecs
    dec = codecs.getincrementaldecoder("utf-8")("replace")   # 一个汉字的字节可能被拆在两次读里，不能逐块独立解码
    events = []
    last_change = [time.monotonic()]
    alive = [True]

    def now():
        return round(time.monotonic() - t0, 4)

    def pump(timeout=0.05):
        if not alive[0]:
            return
        r, _, _ = select.select([fd], [], [], timeout)
        if fd in r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                alive[0] = False
                return
            if not data:
                alive[0] = False
                return
            txt = dec.decode(data)
            if txt:
                events.append([now(), "o", txt])
            stream.feed(data)
            last_change[0] = time.monotonic()

    def text():
        # 不用 pyte 的 screen.display：宽字符后半格是空串时它会报错
        return "\n".join("".join(screen.buffer[y][x].data for x in range(cols)) for y in range(rows))

    # 实时把当前屏幕写到 <输出>.screen.txt（每 2 秒），录制卡住时能看到停在哪个画面
    shot_path, last_shot = out.with_suffix(".screen.txt"), [0.0]
    _pump = pump

    def pump(timeout=0.05):
        _pump(timeout)
        if time.monotonic() - last_shot[0] > 2:
            last_shot[0] = time.monotonic()
            try:
                shot_path.write_text(f"[{now()}s]\n" + text(), encoding="utf-8")
            except OSError:
                pass

    def send(s):
        events.append([now(), "i", s])
        os.write(fd, s.encode("utf-8"))

    try:
        run_steps(spec, pump, text, send, now, events, last_change, alive)
    finally:
        finish(pid, fd, pump, alive, events, out, cols, rows, spec, cwd, now, text)


def run_steps(spec, pump, text, send, now, events, last_change, alive):
    for st in spec["steps"]:
        if "wait" in st:
            pat, deadline = re.compile(st["wait"]), time.monotonic() + st.get("timeout", 60)
            while not pat.search(text()):
                if time.monotonic() > deadline or not alive[0]:
                    sys.exit(f"等不到「{st['wait']}」。当前屏幕：\n{text()}")
                pump()
        elif "wait_idle" in st:
            deadline = time.monotonic() + st.get("timeout", 600)
            while time.monotonic() - last_change[0] < st["wait_idle"]:
                if time.monotonic() > deadline or not alive[0]:
                    break
                pump()
        elif "work" in st:
            # 等智能体干完：屏幕连续 work 秒不动算完；中途若出现审批提示，按 approve_key 批准一次并把当时的画面记进日志
            appr = re.compile(st.get("approve_re", r"(?i)(allow|approve|run this command|proceed)\?|Yes, (and )?(proceed|allow)"))
            deadline, n = time.monotonic() + st.get("timeout", 600), 0
            while time.monotonic() < deadline and alive[0]:
                pump()
                if time.monotonic() - last_change[0] >= 1.2 and appr.search(text()) and n < st.get("max_approvals", 3):
                    n += 1
                    events.append([now(), "m", f"approve{n}"])
                    print(f"—— 第 {n} 次审批，当时画面 ——\n{text()}\n", file=sys.stderr)
                    end = time.monotonic() + st.get("approve_delay", 1.5)
                    while time.monotonic() < end:
                        pump(0.05)
                    send(KEYS.get(st.get("approve_key", "enter"), st.get("approve_key", "enter")))
                    continue
                # until_file：要等到工作目录里出现这个文件（如 renders/*.mp4）才算干完，中途停顿思考不算
                done = not st.get("until_file") or any(Path(os.path.expanduser(spec.get("cwd", "."))).glob(st["until_file"]))
                if time.monotonic() - last_change[0] >= st["work"] and done:
                    break
        elif "select" in st:
            # 菜单里用方向键移到目标项（当前项所在行以 › 或 > 开头）再回车
            pat = re.compile(st["select"])
            for _ in range(st.get("max", 10)):
                end = time.monotonic() + 0.6
                while time.monotonic() < end:
                    pump(0.05)
                cur = [l for l in text().split("\n") if re.match(r"^\s*[›>❯]\s*\S", l)]
                if cur and pat.search(cur[-1]):
                    break
                send(KEYS[st.get("dir", "down")])
            else:
                sys.exit(f"菜单里找不到「{st['select']}」。当前屏幕：\n{text()}")
            end = time.monotonic() + st.get("pause", 1.0)
            while time.monotonic() < end:
                pump(0.05)
            k = st.get("confirm", "enter")   # 例如 /model 里按 s 只对本次会话生效，不改默认配置
            send(KEYS.get(k, k))
        elif "shell" in st:
            # 在镜头外跑一条命令（例如把中间版本的文件备份下来），不会出现在录屏里
            import subprocess
            subprocess.run(st["shell"], shell=True, executable="/bin/zsh")
        elif "type" in st:
            gap = 1 / st.get("cps", 14)
            for ch in st["type"]:
                send(ch)
                end = time.monotonic() + gap
                while time.monotonic() < end:
                    pump(end - time.monotonic())
        elif "key" in st:
            send(KEYS.get(st["key"], st["key"]))
        elif "sleep" in st:
            end = time.monotonic() + st["sleep"]
            while time.monotonic() < end:
                pump(max(0.0, end - time.monotonic()))
        elif "mark" in st:
            events.append([now(), "m", st["mark"]])
        elif st.get("exit"):
            break
        pump(0.01)


def finish(pid, fd, pump, alive, events, out, cols, rows, spec, cwd, now, text):
    # 收尾：给程序一点时间刷新，再结束
    end = time.monotonic() + 1.0
    while time.monotonic() < end and alive[0]:
        pump(0.1)
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGKILL):   # 交互式 shell 会忽略前两个信号
        try:
            if os.waitpid(pid, os.WNOHANG)[0]:
                break
            os.kill(pid, sig)
        except (ProcessLookupError, ChildProcessError):
            break
        time.sleep(0.5)
    os.close(fd)   # macOS：不关主端，被杀的子进程会卡在冲刷终端输出上，waitpid 永远等不到
    try:
        os.waitpid(pid, 0)
    except ChildProcessError:
        pass

    head = {"version": 2, "width": cols, "height": rows, "timestamp": int(time.time()), "cmd": spec["cmd"], "cwd": cwd}
    with out.open("w", encoding="utf-8") as f:
        f.write(json.dumps(head, ensure_ascii=False) + "\n")
        for e in events:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"录好：{out}（{now():.1f} 秒，{len(events)} 条事件）")
    print(text())


if __name__ == "__main__":
    main()
