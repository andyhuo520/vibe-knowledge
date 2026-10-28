#!/bin/zsh
# 真实会话录制：在 SESSION_PROJ 里用 SESSION_CC 跑一轮（配置见同目录 session.env）。
# 用法：session/turn.sh <轮次号> "<提示词>"     第 1 轮新开会话，之后自动 --continue 接着同一个会话
# 注意：-p 模式下，它放到后台的渲染会在这一轮结束时被一起杀掉；要渲染就让它前台跑。
set -e
N=$1; PROMPT=$2
HERE="${0:A:h}"
source "$HERE/session.env"
PROJ=${~SESSION_PROJ}; CC=${~SESSION_CC:-claude}
mkdir -p "$PROJ"
if [[ -n "$SITE_DIR" ]]; then
  lsof -iTCP:$SITE_PORT -sTCP:LISTEN -n -P >/dev/null 2>&1 || (cd ${~SITE_DIR} && nohup python3 -m http.server $SITE_PORT --bind 127.0.0.1 >/dev/null 2>&1 &)
fi
CONT=(); [[ $N -gt 1 ]] && CONT=(--continue)
cd "$PROJ"
date +%s > "$HERE/turn$N.start"
print -r -- "$PROMPT" > "$HERE/turn$N.prompt.txt"
CLAUDE_CONFIG_DIR=${~SESSION_CONFIG} DISABLE_AUTOUPDATER=1 "$CC" -p "$PROMPT" $CONT --permission-mode ${SESSION_PERMISSION:-auto} --output-format stream-json --verbose > "$HERE/turn$N.jsonl" 2> "$HERE/turn$N.err"
date +%s > "$HERE/turn$N.end"
echo "第 $N 轮结束：$(( $(cat $HERE/turn$N.end) - $(cat $HERE/turn$N.start) )) 秒"
