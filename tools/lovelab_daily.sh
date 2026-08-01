#!/bin/sh
# 팔로워 트래커 일일 자동 갱신 (launchd: 매일 00:05)
# 수집 → lovelab-data.js에 오늘 스냅샷 추가 → 커밋 → 푸시(hirofarm.cloud 자동 배포)
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HOME/Library/Logs/lovelab-update.log"
cd "$REPO" || exit 1

{
  echo "==== $(date '+%Y-%m-%d %H:%M:%S') 수집 시작"
  /usr/bin/python3 tools/lovelab_update.py || { echo "수집 실패 — 중단"; exit 1; }

  if git diff --quiet -- public/lovelab-data.js; then
    echo "변경 없음 — 커밋 생략"
    exit 0
  fi

  git pull --rebase --autostash origin main
  git add public/lovelab-data.js
  git commit -m "팔로워 스냅샷 $(date '+%Y-%m-%d') 자동 수집"
  git push origin main && echo "푸시 완료"
} >> "$LOG" 2>&1
