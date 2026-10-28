#!/bin/zsh
# 渲染队列：逐行处理 cine/queue.txt（课号|标题|封面秒），一节一节 clips → record → finish → deliver，做完写 build/.delivered
# Python：CINE_PY（要有 numpy scipy pillow playwright），默认 python3；端口：CINE_PORT，默认 8964（没人在听就自己起一个静态服务器）
cd "${0:A:h}/../.."
PY=${CINE_PY:-python3}; PORT=${CINE_PORT:-8964}
$PY -c "import numpy, scipy, PIL, playwright" 2>/dev/null || { echo "$PY 缺 numpy/scipy/pillow/playwright，设 CINE_PY 指向装好的 Python"; exit 1; }
if ! curl -sf -o /dev/null "http://127.0.0.1:$PORT/cine/index.html"; then
  python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!; trap "kill $SRV 2>/dev/null" EXIT; sleep 1
fi
while true; do
  line=$(while IFS= read -r l; do n=${l%%|*}; [[ -n "$n" && ! -f lessons/$n/build/.delivered ]] && { echo "$l"; break; }; done < cine/queue.txt)
  [[ -z "$line" ]] && break
  n=${line%%|*}; rest=${line#*|}; title=${rest%%|*}; poster=${rest#*|}
  echo "== $(date +%H:%M) 第 $n 节：$title"
  $PY cine/tools/clips.py $n --port $PORT > lessons/$n/build/clips.log 2>&1 || { echo "裁片段失败 $n"; break; }   # 没有 clips 的课也能跑，0 段
  $PY cine/tools/record.py $n --port $PORT > lessons/$n/build/record.log 2>&1 || { echo "录制失败 $n"; break; }
  $PY cine/tools/finish.py $n --port $PORT > lessons/$n/build/finish.log 2>&1 || { echo "合成失败 $n"; break; }
  ./cine/tools/deliver.sh $n "$title" $poster > lessons/$n/build/deliver.log 2>&1 || { echo "交付失败 $n"; break; }
  touch lessons/$n/build/.delivered
  echo "DONE $n $(date +%H:%M) $(tail -1 lessons/$n/build/deliver.log)"
done
echo "队列清空"
