#!/bin/zsh
# 渲染队列：一节一节地出成片（并行渲染反而更慢）。
# 用法：scripts/render_queue.sh <系列目录>；往 <系列目录>/render.queue 里追加课号（每行一个，如 05），写 END 结束。
S=${1:?系列目录}; Q=$S/render.queue; touch $Q
while true; do
  n=$(head -1 $Q)
  if [[ -z $n ]]; then sleep 20; continue; fi
  [[ $n == END ]] && { sed -i '' 1d $Q; echo "队列结束"; exit 0; }
  echo "$(date +%H:%M) 开始渲染第 $n 节"
  python3 scripts/make_lesson.py $S/lessons/$n final > $S/lessons/$n/final.log 2>&1 \
    && echo "$(date +%H:%M) 第 $n 节完成：$(grep -h '完成「final」' $S/lessons/$n/final.log)" \
    || echo "$(date +%H:%M) 第 $n 节失败，看 $S/lessons/$n/final.log"
  sed -i '' 1d $Q
done
