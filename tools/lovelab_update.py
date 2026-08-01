#!/usr/bin/env python3
"""연애실험실 팔로워 트래커 — 오늘자 스냅샷 수집·기록.

public/lovelab-data.js 의 cast 핸들을 읽어 인스타 공개 API로 팔로워 수를 가져오고,
snapshots 에 오늘 날짜 항목을 추가(이미 있으면 갱신)한다.

사용:  python3 tools/lovelab_update.py          # 수집 + 파일 갱신
       python3 tools/lovelab_update.py --dry    # 수집 결과만 출력
"""
import json, re, subprocess, sys, time
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "public" / "lovelab-data.js"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def fetch(handle: str):
    for attempt in range(3):
        r = subprocess.run(
            ["curl", "-s", "--max-time", "20",
             f"https://i.instagram.com/api/v1/users/web_profile_info/?username={handle}",
             "-H", "x-ig-app-id: 936619743392459", "-H", f"User-Agent: {UA}"],
            capture_output=True, text=True)
        txt = r.stdout
        m = re.search(r'"edge_followed_by":\{"count":(\d+)', txt)
        if m:
            return int(m.group(1))
        if "wait a few minutes" in txt:  # rate limit — 쉬었다 재시도
            time.sleep(120)
            continue
        return None
    return None


def main():
    dry = "--dry" in sys.argv
    src = DATA.read_text(encoding="utf-8")
    handles = re.findall(r'handle:\s*"([^"]+)"', src)
    today = date.today().isoformat()
    counts = {}
    for h in handles:
        v = fetch(h)
        counts[h] = v
        print(f"{h:16s} {v if v is not None else 'FAIL'}", flush=True)
        time.sleep(8)
    got = {h: v for h, v in counts.items() if v is not None}
    if dry or not got:
        print("dry run" if dry else "수집 실패 — 파일 미변경")
        return
    entry = '    "%s": { %s },\n' % (
        today, ", ".join(f'"{h}": {v}' for h, v in got.items()))
    if f'"{today}"' in src:  # 같은 날 재실행 → 교체
        src = re.sub(r'    "%s": \{[^}]*\},\n' % today, entry, src)
    else:  # snapshots 블록 끝("  },\n};" 직전)에 삽입
        idx = src.rfind("  },\n};")
        src = src[:idx] + entry + src[idx:]
    DATA.write_text(src, encoding="utf-8")
    print(f"기록 완료: {today} ({len(got)}/{len(handles)}명)")


if __name__ == "__main__":
    main()
