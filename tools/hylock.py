#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────
# hylock — 히로팜 보호 콘텐츠 잠금/해제 도구
#
#   py -3 tools/hylock.py init  --pin 123456   최초 1회. CEK·salt 생성
#   py -3 tools/hylock.py lock                 secure/ → public/enc/ 암호화
#   py -3 tools/hylock.py unlock [--pin ...]   public/enc/ → secure/ 복호화
#   py -3 tools/hylock.py setpin --new 654321  PIN 만 교체 (콘텐츠 재암호화 없음)
#   py -3 tools/hylock.py status               현재 상태 점검
#
# (맥에서는 py -3 대신 python3)
#
# 평문은 secure/ 에만 있고 .gitignore 로 저장소에서 빠진다.
# 저장소에 올라가는 건 public/enc/*.enc (암호문) 와 공개 파라미터뿐이다.
#
# .hy-key.json 은 CEK 원본을 담은 로컬 캐시다. 이게 있으면 lock/unlock 에
# PIN 을 매번 입력하지 않아도 된다. gitignore 대상이며, 다른 PC 에서는
# `unlock --pin ...` 을 한 번 돌리면 다시 만들어진다.
#
# 필요 패키지: cryptography  (py -3 -m pip install cryptography)
# ─────────────────────────────────────────────────────────────
import base64
import hashlib
import json
import os
import re
import shutil
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 콘솔이 cp949 여도 한글 출력이 깨질지언정 죽지는 않게
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECURE = os.path.join(ROOT, "secure")
ENC = os.path.join(ROOT, "public", "enc")
META = os.path.join(ROOT, "public", "hy-gate-meta.json")
KEYFILE = os.path.join(ROOT, ".hy-key.json")

# PBKDF2 반복 횟수.
#
# 6자리 PIN 은 경우의 수가 10^6 밖에 안 된다. 파일을 통째로 내려받아 오프라인에서
# 돌려보는 공격은 원리상 막을 수 없고, 늦추는 것만 가능하다. 그래서 권장치(60만)보다
# 훨씬 높게 잡았다 — 이 PC 기준 60만 회가 82ms 였으므로 400만 회면 0.5초쯤이다.
# 30일에 한 번 내는 비용이라 이 정도는 감수할 만하다.
#
# 더 확실하게 하려면 자릿수를 늘리는 편이 훨씬 효과가 크다.
# PIN_LENGTH 를 8 로 바꾸면 경우의 수가 100배가 된다 (setpin 으로 교체 가능).
ITERS = 4000000
PIN_LENGTH = 6

ARGS = sys.argv[2:]


def flag(name):
    if "--" + name in ARGS:
        i = ARGS.index("--" + name)
        if i + 1 < len(ARGS):
            return ARGS[i + 1]
    return None


def has(name):
    return "--" + name in ARGS


def die(msg):
    print("\n✗ " + msg + "\n")
    sys.exit(1)


def ok(msg):
    print("  " + msg)


def get_pin(label=None):
    pin = flag("pin") or os.environ.get("HY_PIN")
    if not pin:
        # getpass 는 화면에 안 찍힌다. 파이프로 넘어온 경우엔 그냥 읽는다.
        import getpass

        try:
            pin = getpass.getpass(label or f"PIN({PIN_LENGTH}자리 숫자): ")
        except Exception:
            pin = input(label or f"PIN({PIN_LENGTH}자리 숫자): ")
    pin = pin.strip()
    if not re.fullmatch(r"\d{%d}" % PIN_LENGTH, pin):
        die(f"PIN 은 숫자 {PIN_LENGTH}자리여야 합니다.")
    return pin


def walk(base):
    """base 아래 파일들의 상대경로를 '/' 구분자로 돌려준다."""
    out = []
    if not os.path.isdir(base):
        return out
    for dirpath, _dirs, files in os.walk(base):
        for f in files:
            rel = os.path.relpath(os.path.join(dirpath, f), base)
            out.append(rel.replace(os.sep, "/"))
    return sorted(out)


def write_file(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    mode = "wb" if isinstance(data, (bytes, bytearray)) else "w"
    with open(path, mode, **({} if mode == "wb" else {"encoding": "utf-8", "newline": "\n"})) as f:
        f.write(data)


# ── 암복호 (브라우저 쪽 형식과 동일: IV(12) ‖ 암호문 ‖ 태그(16)) ──
def encrypt(cek, plain):
    iv = os.urandom(12)
    return iv + AESGCM(cek).encrypt(iv, plain, None)


def decrypt(cek, blob):
    return AESGCM(cek).decrypt(blob[:12], blob[12:], None)


def kek_from(pin, salt):
    return hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, ITERS, 32)


# ── CEK 확보 ─────────────────────────────────────────────────
def read_meta():
    if not os.path.exists(META):
        die("잠금이 아직 설정되지 않았습니다. 먼저 `init` 을 실행하세요.")
    with open(META, encoding="utf-8") as f:
        return json.load(f)


def cached_cek():
    if not os.path.exists(KEYFILE):
        return None
    try:
        with open(KEYFILE, encoding="utf-8") as f:
            return base64.b64decode(json.load(f)["cek"])
    except Exception:
        return None


def cache_cek(cek):
    write_file(KEYFILE, json.dumps({"cek": base64.b64encode(cek).decode()}, indent=2) + "\n")


def resolve_cek():
    c = cached_cek()
    if c:
        return c
    m = read_meta()
    pin = get_pin()
    try:
        cek = decrypt(kek_from(pin, base64.b64decode(m["salt"])), base64.b64decode(m["wrapped"]))
    except Exception:
        die("PIN 이 맞지 않습니다.")
    cache_cek(cek)
    return cek


# ── 명령 ─────────────────────────────────────────────────────
def cmd_init():
    if os.path.exists(META) and not has("force"):
        die("이미 설정돼 있습니다. 다시 만들려면 --force (기존 암호문은 전부 못 읽게 됩니다).")
    pin = get_pin(f"새 PIN({PIN_LENGTH}자리 숫자): ")
    cek = os.urandom(32)
    salt = os.urandom(16)
    write_file(
        META,
        json.dumps(
            {
                "v": 1,
                "kdf": "PBKDF2-SHA256",
                "iters": ITERS,
                "salt": base64.b64encode(salt).decode(),
                "wrapped": base64.b64encode(encrypt(kek_from(pin, salt), cek)).decode(),
                "pinLength": PIN_LENGTH,
            },
            indent=2,
        )
        + "\n",
    )
    cache_cek(cek)
    print("\n✓ 잠금 설정 완료")
    ok("공개 파라미터 : public/hy-gate-meta.json  (커밋 대상)")
    ok("로컬 키 캐시  : .hy-key.json               (gitignore 대상)")
    print("\n  다음: secure/ 에 평문을 넣고 `lock` 을 실행하세요.\n")


def cmd_lock():
    cek = resolve_cek()
    if not os.path.isdir(SECURE):
        die("secure/ 폴더가 없습니다.")
    files = walk(SECURE)
    if not files:
        die("secure/ 가 비어 있습니다.")

    print("\n잠그는 중…")
    total = 0
    same = 0
    for rel in files:
        with open(os.path.join(SECURE, rel), "rb") as f:
            plain = f.read()

        # GCM 은 매번 새 IV 를 쓰므로 같은 내용이라도 암호문이 달라진다.
        # 그대로 두면 한 줄만 고쳐도 33개 파일이 전부 "변경" 으로 잡혀
        # 커밋마다 1.6MB 씩 쌓인다. 그래서 기존 암호문을 풀어 보고
        # 내용이 같으면 건너뛴다. (복호화는 파일당 수 ms 라 비용은 무시할 만하다)
        target = os.path.join(ENC, rel + ".enc")
        if os.path.exists(target):
            try:
                with open(target, "rb") as f:
                    if decrypt(cek, f.read()) == plain:
                        same += 1
                        continue
            except Exception:
                pass  # 손상됐거나 옛 키로 만든 것 → 새로 쓴다

        write_file(target, encrypt(cek, plain))
        total += len(plain)
        ok(f"{rel}  →  enc/{rel}.enc  ({len(plain)/1024:.1f}KB)")

    # secure/ 에서 사라진 원본의 암호문이 남아 있으면 같이 지운다
    want = {f + ".enc" for f in files}
    stale = 0
    for rel in walk(ENC):
        if rel not in want:
            os.remove(os.path.join(ENC, rel))
            ok("삭제(원본 없음): enc/" + rel)
            stale += 1

    changed = len(files) - same
    print(
        f"\n✓ {changed}개 새로 암호화 ({total/1024:.0f}KB)"
        + (f" · {same}개는 내용 그대로라 건너뜀" if same else "")
        + (f" · 정리 {stale}개" if stale else "")
        + "\n"
    )


def cmd_unlock():
    cek = resolve_cek()
    files = [f for f in walk(ENC) if f.endswith(".enc")]
    if not files:
        die("public/enc/ 에 암호문이 없습니다.")

    print("\n푸는 중…")
    wrote = skipped = 0
    for rel in files:
        target = os.path.join(SECURE, rel[:-4].replace("/", os.sep))
        if os.path.exists(target) and not has("force"):
            skipped += 1
            continue
        with open(os.path.join(ENC, rel), "rb") as f:
            write_file(target, decrypt(cek, f.read()))
        ok(f"enc/{rel}  →  {rel[:-4]}")
        wrote += 1
    print(
        f"\n✓ {wrote}개 복호화"
        + (f" · {skipped}개는 이미 있어서 건너뜀 (덮어쓰려면 --force)" if skipped else "")
        + "\n"
    )


def cmd_setpin():
    m = read_meta()
    cek = resolve_cek()
    nxt = flag("new")
    if not nxt:
        nxt = get_pin(f"새 PIN({PIN_LENGTH}자리 숫자): ")
    if not re.fullmatch(r"\d{%d}" % PIN_LENGTH, nxt.strip()):
        die(f"PIN 은 숫자 {PIN_LENGTH}자리여야 합니다.")
    # salt 도 새로 뽑는다. 예전 PIN 으로 미리 만들어둔 대입표를 무효로 만든다.
    salt = os.urandom(16)
    m["salt"] = base64.b64encode(salt).decode()
    m["wrapped"] = base64.b64encode(encrypt(kek_from(nxt.strip(), salt), cek)).decode()
    m["iters"] = ITERS
    write_file(META, json.dumps(m, indent=2) + "\n")
    print("\n✓ PIN 교체 완료. 콘텐츠는 그대로 두고 껍데기만 바꿨습니다.")
    print("  public/hy-gate-meta.json 을 커밋·배포하면 적용됩니다.\n")


def cmd_status():
    print("")
    if not os.path.exists(META):
        print("  잠금       : 설정 안 됨 (init 필요)")
    else:
        m = read_meta()
        print(f"  잠금       : 설정됨 (PBKDF2 {m['iters']:,}회, PIN {m['pinLength']}자리)")
    print("  로컬 키    : " + ("있음 (.hy-key.json)" if cached_cek() else "없음 — unlock 시 PIN 필요"))
    plain = walk(SECURE)
    enc = [f for f in walk(ENC) if f.endswith(".enc")]
    print(f"  secure/    : {len(plain)}개 평문")
    print(f"  public/enc/: {len(enc)}개 암호문")

    missing = [f for f in plain if f + ".enc" not in enc]
    orphan = [f for f in enc if f[:-4] not in plain]
    if missing:
        print("\n  ! 아직 안 잠긴 파일: " + ", ".join(missing))
    if orphan:
        print("  ! 평문이 없는 암호문: " + ", ".join(orphan))
    if not missing and not orphan and plain:
        print("\n  ✓ 동기화 상태 정상")
    print("")


CMDS = {
    "init": cmd_init,
    "lock": cmd_lock,
    "unlock": cmd_unlock,
    "setpin": cmd_setpin,
    "status": cmd_status,
}

cmd = sys.argv[1] if len(sys.argv) > 1 else None
if cmd not in CMDS:
    print("\n사용법: py -3 tools/hylock.py <init|lock|unlock|setpin|status> [--pin ...] [--force]\n")
    sys.exit(1 if cmd else 0)
CMDS[cmd]()
