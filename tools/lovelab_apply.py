#!/usr/bin/env python3
# 팔로워 스냅샷 반영 (Windows 일일 자동화용)
#
#   py -3 tools/lovelab_apply.py counts.json [--date 2026-09-19] [--no-push]
#
# counts.json = {"핸들": 팔로워수, ...}  — Chrome 으로 수집한 값(수집 방법은 tools/lovelab_daily_prompt.md).
# 하는 일: git pull → secure/lovelab-data.js 에 스냅샷 추가 → hylock lock → 커밋 → 푸시.
# 인스타 API 가 429 로 막혀 수집 자체는 이 스크립트가 하지 않는다(로그인된 Chrome 이 필요).
import base64
import datetime
import json
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(REPO, "secure", "lovelab-data.js")
ENC = os.path.join(REPO, "public", "enc", "lovelab-data.js.enc")
ENC_REL = "public/enc/lovelab-data.js.enc"
MAX_JUMP = 0.30  # 직전 스냅샷 대비 ±30% 넘게 튀면 수집 오류로 본다


def die(msg):
    print("✗ " + msg)
    sys.exit(1)


def run(*cmd, check=True):
    env = dict(os.environ, PYTHONIOENCODING="utf-8")  # 작업 스케줄러의 cp949 콘솔에서 ✓ 출력이 죽지 않게
    r = subprocess.run(cmd, cwd=REPO, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        die(" ".join(cmd) + "\n" + (r.stdout or "") + (r.stderr or ""))
    return r


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]
    if not args or args[0].startswith("--"):
        die("사용법: py -3 tools/lovelab_apply.py counts.json [--date YYYY-MM-DD] [--no-push]")
    date = args[args.index("--date") + 1] if "--date" in args else datetime.date.today().isoformat()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        die("날짜 형식이 틀립니다: " + date)
    with open(args[0], encoding="utf-8") as f:
        counts = json.load(f)

    run("git", "pull", "--rebase", "--autostash", "origin", "main")

    # secure/ 는 gitignore 라 맥에서 올린 스냅샷은 pull 해도 평문에 안 들어온다.
    # 이 파일은 손으로 고치는 일이 없으므로 매번 방금 받은 암호문에서 평문을 다시 만든다.
    # (hylock 과 같은 형식: IV(12) ‖ 암호문 ‖ 태그(16), CEK 는 .hy-key.json 캐시)
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    keyfile = os.path.join(REPO, ".hy-key.json")
    if not os.path.exists(keyfile):
        die(".hy-key.json 이 없습니다. `py -3 tools/hylock.py unlock --pin ...` 을 한 번 돌리세요.")
    with open(keyfile, encoding="utf-8") as f:
        cek = base64.b64decode(json.load(f)["cek"])
    with open(ENC, "rb") as f:
        blob = f.read()
    with open(DATA, "wb") as f:
        f.write(AESGCM(cek).decrypt(blob[:12], blob[12:], None))

    with open(DATA, encoding="utf-8") as f:
        src = f.read()
    handles = re.findall(r'handle:\s*"([^"]+)"', src)
    if f'"{date}"' in src:
        print(f"이미 {date} 스냅샷이 있습니다 — 건너뜀")
        return

    missing = [h for h in handles if not isinstance(counts.get(h), int)]
    if missing:
        die("수집 안 된 계정: " + ", ".join(missing))

    blocks = re.findall(r'"(\d{4}-\d{2}-\d{2})":\s*\{([^}]*)\}', src)
    last = dict((k, int(v)) for k, v in re.findall(r'"([^"]+)":\s*(\d+)', blocks[-1][1])) if blocks else {}
    odd = [
        f"{h} {last[h]}→{counts[h]}"
        for h in handles
        if last.get(h, 0) > 500 and abs(counts[h] - last[h]) / last[h] > MAX_JUMP
    ]
    if odd:
        die("직전 대비 변동이 너무 큽니다(수집 오류 의심): " + ", ".join(odd))

    lines = []
    for i in range(0, len(handles), 6):
        lines.append("      " + " ".join(f'"{h}": {counts[h]},' for h in handles[i:i + 6]))
    block = f'    "{date}": {{\n' + "\n".join(lines) + "\n    },\n"

    tail = "  },\n};"
    i = src.rstrip().rfind(tail)
    if i < 0:
        die("lovelab-data.js 끝 모양이 예상과 다릅니다.")
    src = src[:i] + block + src[i:]
    src = re.sub(r'updated:\s*"[^"]*"', f'updated: "{date}"', src, count=1)
    with open(DATA, "w", encoding="utf-8", newline="") as f:
        f.write(src)

    run(sys.executable, os.path.join("tools", "hylock.py"), "lock")
    if run("git", "diff", "--quiet", "--", ENC_REL, check=False).returncode == 0:
        print("변경 없음 — 커밋 생략")
        return
    run("git", "add", ENC_REL)
    run("git", "commit", "-m", f"팔로워 스냅샷 {date} 자동 수집 ({len(handles)}/{len(handles)})")
    if "--no-push" not in args:
        run("git", "push", "origin", "main")
    me = next((h for h in handles if h == "1997.0127"), None)
    print(f"✓ {date} 스냅샷 반영" + (f" · 내 계정 {counts[me]:,}" if me else ""))


main()
