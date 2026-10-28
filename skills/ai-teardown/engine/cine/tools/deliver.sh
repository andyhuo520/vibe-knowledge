#!/bin/zsh
# 出片后交付：桌面 1080p60 分享版（CRF 23）+ 课程页 720p30 网页版（降噪后约 2 MB/分钟）+ 封面
# 用法：cine/tools/deliver.sh <课号> "<标题>" <封面秒数>
# 去向写在 cine/deliver.env（new_series.py 生成）：D=桌面文件夹；WEB=课程页发布目录；STRIP=文件名里去掉的课号前缀（如 p）
set -e
cd "${0:A:h}/../.."
N=$1; TITLE=$2; POSTER=${3:-12}
SRC=lessons/$N/build/lesson$N.mp4
D="$HOME/Desktop/${PWD:t}_视频"; WEB=publish/course; STRIP=""
[[ -f cine/deliver.env ]] && source cine/deliver.env
NAME=$N; [[ -n "$STRIP" ]] && NAME=${N#$STRIP}
mkdir -p "$D" $WEB
ffmpeg -y -loglevel error -i $SRC -c:v libx264 -preset slow -crf 23 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -c:a copy -movflags +faststart "$D/${NAME}_${TITLE}.mp4"   # 粒子满屏的课码率会飙到 20M+，封顶 6M
ffmpeg -y -loglevel error -i $SRC -vf "scale=1280:-2,fps=30,hqdn3d=3:2:5:4" -c:v libx264 -preset slow -crf 29 -maxrate 520k -bufsize 1040k -pix_fmt yuv420p -c:a aac -b:a 64k -ac 1 -movflags +faststart $WEB/lesson$N.mp4
ffmpeg -y -loglevel error -ss $POSTER -i $SRC -frames:v 1 -vf scale=1280:-2 -q:v 3 $WEB/lesson$N.jpg
ls -la "$D/${NAME}_${TITLE}.mp4" $WEB/lesson$N.mp4 | awk '{print $5, $NF}'
ffprobe -v error -show_entries format=duration -of csv=p=0 $SRC
