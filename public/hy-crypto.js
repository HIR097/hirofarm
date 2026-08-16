/* ─────────────────────────────────────────────────────────────
 * 히로팜 잠금 — 브라우저용 암복호 유틸
 *
 * 이 파일 자체에는 비밀이 없다. 공개돼도 무방하다.
 *
 * 구조(봉투 암호화):
 *   PIN ──PBKDF2──> KEK ──AES-GCM 복호──> CEK ──AES-GCM 복호──> 실제 콘텐츠
 *
 * CEK(콘텐츠 암호화 키)를 따로 두는 이유는 PIN 을 바꿔도 수백 개 파일을
 * 전부 다시 암호화할 필요가 없기 때문이다. PIN 이 바뀌면 CEK 를 감싼
 * 껍데기(wrapped)만 다시 만들면 된다.
 *
 * GCM 의 인증 태그가 곧 PIN 검증기 역할을 한다. PIN 이 틀리면 복호화가
 * 예외로 실패하므로 따로 "정답 해시" 를 둘 필요가 없다 — 해시를 두면
 * 오히려 오프라인 대입의 표적이 하나 늘어난다.
 * ───────────────────────────────────────────────────────────── */
;(function () {
  'use strict'

  const META_URL = '/hy-gate-meta.json'
  const CEK_KEY = 'hy_lock_cek' // { k: base64, exp: epoch ms }
  const FAIL_KEY = 'hy_lock_fail' // { n: 실패횟수, until: epoch ms }

  // ── base64 ↔ bytes ────────────────────────────────────────
  const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
  const bytesToB64 = (b) => {
    let s = ''
    const u = new Uint8Array(b)
    // 인자 개수 제한(대략 12만)에 걸리지 않도록 잘라서 처리한다
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000))
    return btoa(s)
  }

  // ── 공개 파라미터(salt / 반복횟수 / 감싼 CEK) ──────────────
  let metaPromise = null
  function meta() {
    if (!metaPromise) {
      metaPromise = fetch(META_URL, { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('잠금 설정 파일을 불러오지 못했습니다 (' + r.status + ')')
        return r.json()
      })
    }
    return metaPromise
  }

  // ── PIN → CEK ─────────────────────────────────────────────
  async function unwrapCEK(pin) {
    const m = await meta()
    const kek = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64ToBytes(m.salt), iterations: m.iters, hash: 'SHA-256' },
      await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )
    const wrapped = b64ToBytes(m.wrapped)
    // 틀린 PIN 이면 여기서 OperationError 가 난다 (GCM 인증 실패)
    const raw = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrapped.subarray(0, 12) },
      kek,
      wrapped.subarray(12),
    )
    return new Uint8Array(raw)
  }

  const importCEK = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])

  // ── 저장된 키 (기억하기) ──────────────────────────────────
  // 원본 CEK 를 localStorage 에 둔다. 기기를 이미 손에 넣은 상대는 막지 못하지만,
  // 그건 "30일 기억" 을 택한 이상 피할 수 없는 대가다. 파일 자체는 여전히
  // 이 키 없이는 못 읽는다.
  function saveCEK(raw, days) {
    try {
      localStorage.setItem(
        CEK_KEY,
        JSON.stringify({ k: bytesToB64(raw), exp: Date.now() + days * 86400000 }),
      )
    } catch {
      /* 저장 실패해도 이번 세션은 계속 쓸 수 있으므로 무시 */
    }
  }

  function storedCEKBytes() {
    try {
      const v = JSON.parse(localStorage.getItem(CEK_KEY) || 'null')
      if (!v || !v.k) return null
      if (Date.now() > v.exp) {
        localStorage.removeItem(CEK_KEY)
        return null
      }
      return b64ToBytes(v.k)
    } catch {
      return null
    }
  }

  function clearCEK() {
    try {
      localStorage.removeItem(CEK_KEY)
    } catch {
      /* ignore */
    }
  }

  // 현재 세션에서 쓸 키. 한 번 import 하면 재사용한다.
  let activeKey = null
  async function key() {
    if (activeKey) return activeKey
    const raw = storedCEKBytes()
    if (!raw) return null
    activeKey = await importCEK(raw)
    return activeKey
  }

  async function useCEK(raw, remember, days) {
    activeKey = await importCEK(raw)
    if (remember) saveCEK(raw, days)
    return activeKey
  }

  // ── 실패 횟수 제한 ────────────────────────────────────────
  // 오프라인 대입은 막지 못한다(파일을 내려받아 직접 돌리면 그만이다).
  // 화면 앞에 앉은 사람이 손으로 찍어보는 것만 늦춘다.
  function failState() {
    try {
      return JSON.parse(localStorage.getItem(FAIL_KEY) || 'null') || { n: 0, until: 0 }
    } catch {
      return { n: 0, until: 0 }
    }
  }
  function lockedFor() {
    const f = failState()
    return Math.max(0, f.until - Date.now())
  }
  function noteFail() {
    const f = failState()
    f.n += 1
    // 5회부터 잠그고, 그 뒤로는 시도할 때마다 2배씩 (최대 15분)
    if (f.n >= 5) f.until = Date.now() + Math.min(900000, 5000 * Math.pow(2, f.n - 5))
    try {
      localStorage.setItem(FAIL_KEY, JSON.stringify(f))
    } catch {
      /* ignore */
    }
    return f
  }
  function clearFail() {
    try {
      localStorage.removeItem(FAIL_KEY)
    } catch {
      /* ignore */
    }
  }

  // ── 콘텐츠 복호화 ─────────────────────────────────────────
  async function decryptBuf(buf) {
    const k = await key()
    if (!k) throw new Error('LOCKED')
    const u = new Uint8Array(buf)
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(0, 12) }, k, u.subarray(12))
  }

  async function fetchDecrypt(path) {
    const res = await fetch(path, { cache: 'no-store' })
    if (!res.ok) throw new Error('파일을 불러오지 못했습니다: ' + path + ' (' + res.status + ')')
    return decryptBuf(await res.arrayBuffer())
  }

  const fetchText = (path) => fetchDecrypt(path).then((b) => new TextDecoder().decode(b))

  // window.X = ... 형태의 데이터 스크립트를 복호화해서 실행한다.
  // 내용은 GCM 으로 인증됐으므로 원래의 <script src> 와 신뢰 수준이 같다.
  async function runScript(path) {
    // eslint-disable-next-line no-new-func
    new Function(await fetchText(path))()
  }

  // 이미지처럼 src 에 물려야 하는 것들
  async function objectURL(path, mime) {
    const buf = await fetchDecrypt(path)
    return URL.createObjectURL(new Blob([buf], { type: mime || 'application/octet-stream' }))
  }

  window.HyCrypto = {
    meta,
    unwrapCEK,
    useCEK,
    key,
    hasKey: () => !!storedCEKBytes(),
    clearCEK,
    lockedFor,
    noteFail,
    clearFail,
    fetchDecrypt,
    fetchText,
    runScript,
    objectURL,
  }
})()
