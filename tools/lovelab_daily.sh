#!/bin/sh
# 팔로워 트래커 일일 자동 갱신 (launchd: 매일 00:05)
# 수집 → secure/lovelab-data.js에 오늘 스냅샷 추가 → lock(암호화) → 커밋 → 푸시(hirofarm.cloud 자동 배포)
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HOME/Library/Logs/lovelab-update.log"
cd "$REPO" || exit 1

# lock(hylock)에는 cryptography 가 필요하다. 있는 파이썬을 골라 쓴다.
pick_py() {
  for p in /usr/bin/python3 python3; do
    "$p" -c "import cryptography" >/dev/null 2>&1 && { echo "$p"; return 0; }
  done
  return 1
}

{
  echo "==== $(date '+%Y-%m-%d %H:%M:%S') 수집 시작"
  [ -f secure/lovelab-data.js ] || { echo "secure/ 평문 없음 — 먼저 hylock unlock 필요. 중단"; exit 1; }
  /usr/bin/python3 tools/lovelab_update.py || { echo "수집 실패 — 중단"; exit 1; }

  PY="$(pick_py)" || { echo "cryptography 있는 python 없음 — lock 불가, 중단"; exit 1; }
  "$PY" tools/hylock.py lock || { echo "lock 실패 — 중단"; exit 1; }

  if git diff --quiet -- public/enc/lovelab-data.js.enc; then
    echo "변경 없음 — 커밋 생략"
    exit 0
  fi

  git pull --rebase --autostash origin main
  git add public/enc/lovelab-data.js.enc
  git commit -m "팔로워 스냅샷 $(date '+%Y-%m-%d') 자동 수집"
  git push origin main && echo "푸시 완료"
} >> "$LOG" 2>&1
