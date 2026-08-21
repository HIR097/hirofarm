#!/bin/bash
# 석남TF 대시보드를 igiskamai(회사 사이트)로 동기화.
#
# life-os 쪽 평문(secure/)이 원본이다. 매일 메일 반영 후:
#   1) life-os: hylock lock → .enc 커밋·푸시 (기존 절차)
#   2) 이 스크립트: secure/ 평문을 igiskamai/public/seoknam/ 에 복사하면서
#      hylock 로더를 걷어내고(평문 배포 — 사용자 결정, 2026-08-21) 커밋·푸시
# igiskamai 는 Vercel 이 main 푸시를 받아 자동 배포한다.
set -euo pipefail

LIFE=/Users/jeonghayun/Downloads/hirofarm/life-os
KAM=/Users/jeonghayun/Downloads/hirofarm/igiskamai
DST=$KAM/public/seoknam

[ -f "$LIFE/secure/seoknam-tf-data.js" ] || { echo "secure/ 가 없다 — hylock unlock 먼저"; exit 1; }

cp "$LIFE/secure/pages/seoknam-milestone.html" "$DST/milestone.html"
cp "$LIFE/secure/pages/seoknam-comms.html"     "$DST/comms.html"
cp "$LIFE/secure/seoknam-tf-data.js"           "$DST/seoknam-tf-data.js"

for f in "$DST/milestone.html" "$DST/comms.html"; do
  perl -0pi -e '
    s{<script src="/hy-crypto\.js\?v=2"></script>\n<script src="/hy-page\.js\?v=2"></script>}{<script src="./seoknam-tf-data.js"></script>}g;
    s{<script type="text/hyscript">}{<script>}g;
    s{<script>HyPage\.boot\(\[[^\]]*\]\)</script>\n?}{}g;
    s{<!-- TF 메일 데이터는 암호화돼.*?-->}{<!-- TF 메일 데이터(seoknam-tf-data.js) 로드 후 본문 스크립트 실행 -->}s;
  ' "$f"
  grep -q "hyscript\|HyPage\|hy-crypto" "$f" && { echo "hylock 잔재가 남았다: $f"; exit 1; }
done

cd "$KAM"
git fetch -q
if ! git diff --quiet public/seoknam/; then
  git add public/seoknam/
  git commit -q -m "석남TF 대시보드 동기화 ($(date +%y%m%d))"
  git pull -q --rebase && git push -q origin main
  echo "igiskamai 푸시 완료 — Vercel 이 곧 배포한다"
else
  echo "변경 없음"
fi
