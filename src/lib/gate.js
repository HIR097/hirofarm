/* ─────────────────────────────────────────────────────────────
 * 잠금 화면 — 6자리 PIN 키패드
 *
 * React 가 뜨기 전에 돌아야 하므로(잠긴 화면이 잠깐이라도 보이면 안 된다)
 * 리액트가 아니라 순수 DOM 으로 그린다. main.jsx 가 이 모듈의 ensureUnlocked()
 * 를 먼저 기다린 뒤에 렌더한다.
 *
 * 실제 보안은 이 화면이 아니라 콘텐츠 암호화가 담당한다. 이 화면을 건너뛰어도
 * 키가 없으면 데이터는 암호문 그대로다. 화면은 어디까지나 입구일 뿐이다.
 * ───────────────────────────────────────────────────────────── */

const PIN_LENGTH = 6
const REMEMBER_DAYS = 30

// 잠금이 풀린 뒤 앱이 바로 쓸 수 있어야 하는 데이터들.
// 여기 실린 파일은 window.__HY_DATA__ 에 값을 채우는 스크립트다.
const BOOT_DATA = [
  '/enc/labels.js.enc',
  '/enc/worklog.js.enc',
  '/enc/fundSchedule.js.enc',
  '/enc/outlook.js.enc',
]

const CSS = `
.hygate{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:0;background:var(--hg-bg);color:var(--hg-text);
  font-family:'Pretendard Variable','Pretendard',-apple-system,'Malgun Gothic',sans-serif;
  -webkit-font-smoothing:antialiased;padding:24px;overflow:hidden}
.hygate *{box-sizing:border-box}
.hygate-lock{width:38px;height:38px;margin-bottom:18px;opacity:.75}
.hygate-title{font-size:19px;font-weight:600;letter-spacing:-.02em;margin:0}
.hygate-sub{font-size:13.5px;font-weight:400;color:var(--hg-dim);margin:7px 0 0;min-height:19px;
  text-align:center;transition:color .15s}
.hygate-sub.err{color:var(--hg-bad);font-weight:500}

/* 입력한 자릿수 표시 */
.hygate-dots{display:flex;gap:15px;margin:30px 0 38px}
.hygate-dot{width:12px;height:12px;border-radius:50%;background:transparent;
  border:1.5px solid var(--hg-line);transition:transform .13s,background .13s,border-color .13s}
.hygate-dot.on{background:var(--hg-text);border-color:var(--hg-text);transform:scale(1.12)}
.hygate-dots.shake{animation:hygateShake .42s cubic-bezier(.36,.07,.19,.97)}
@keyframes hygateShake{
  10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(4px)}
  30%,50%,70%{transform:translateX(-8px)} 40%,60%{transform:translateX(8px)}}

/* 키패드 — 모바일 잠금화면과 같은 3×4 배열 */
.hygate-pad{display:grid;grid-template-columns:repeat(3,74px);gap:18px 22px}
.hygate-key{height:74px;border-radius:50%;border:1px solid var(--hg-line);background:var(--hg-key);
  color:var(--hg-text);font-family:inherit;font-size:26px;font-weight:400;letter-spacing:-.01em;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .12s,transform .08s;-webkit-tap-highlight-color:transparent;user-select:none}
.hygate-key:active{background:var(--hg-key-a);transform:scale(.94)}
.hygate-key.blank{border:none;background:none;cursor:default;pointer-events:none}
.hygate-key.fn{border:none;background:none;font-size:15px;color:var(--hg-dim)}
.hygate-key.fn:active{background:var(--hg-key-a)}
.hygate[data-busy="1"] .hygate-pad{opacity:.4;pointer-events:none}

/* 실패 잠금 안내 */
.hygate-hold{font-size:13px;color:var(--hg-bad);margin-top:26px;min-height:18px;font-variant-numeric:tabular-nums}

@media (max-width:400px),(max-height:680px){
  .hygate-pad{grid-template-columns:repeat(3,66px);gap:14px 20px}
  .hygate-key{height:66px;font-size:24px}
  .hygate-dots{margin:26px 0 30px}
}
`

const PALETTE = {
  light: {
    '--hg-bg': '#f4f4f6',
    '--hg-text': '#101012',
    '--hg-dim': '#79797f',
    '--hg-line': '#d9d9e0',
    '--hg-key': '#ffffff',
    '--hg-key-a': '#e6e6ec',
    '--hg-bad': '#d13d3d',
  },
  dark: {
    '--hg-bg': '#131315',
    '--hg-text': '#f2f2f4',
    '--hg-dim': '#8a8a92',
    '--hg-line': '#33333a',
    '--hg-key': '#1e1e22',
    '--hg-key-a': '#2c2c33',
    '--hg-bad': '#ff6b6b',
  },
}

const LOCK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/>' +
  '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>'

// ── 잠금 해제 후 필요한 데이터 적재 ────────────────────────────
async function loadBootData() {
  window.__HY_DATA__ = window.__HY_DATA__ || {}
  for (const p of BOOT_DATA) await window.HyCrypto.runScript(p)
}

// ── 화면 ──────────────────────────────────────────────────────
function showKeypad() {
  return new Promise((resolve) => {
    const theme = (() => {
      try {
        return JSON.parse(localStorage.getItem('hy_theme') || '"light"')
      } catch {
        return 'light'
      }
    })()
    const pal = PALETTE[theme === 'dark' ? 'dark' : 'light']

    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.className = 'hygate'
    for (const [k, v] of Object.entries(pal)) root.style.setProperty(k, v)
    root.innerHTML =
      '<div class="hygate-lock">' + LOCK_SVG + '</div>' +
      '<h1 class="hygate-title">히로팜</h1>' +
      '<p class="hygate-sub">PIN ' + PIN_LENGTH + '자리를 입력하세요</p>' +
      '<div class="hygate-dots">' +
      Array.from({ length: PIN_LENGTH }, () => '<div class="hygate-dot"></div>').join('') +
      '</div>' +
      '<div class="hygate-pad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<button class="hygate-key" data-n="' + n + '">' + n + '</button>').join('') +
      '<div class="hygate-key blank"></div>' +
      '<button class="hygate-key" data-n="0">0</button>' +
      '<button class="hygate-key fn" data-act="del">지움</button>' +
      '</div>' +
      '<div class="hygate-hold"></div>'
    document.body.appendChild(root)

    const sub = root.querySelector('.hygate-sub')
    const dotsBox = root.querySelector('.hygate-dots')
    const dots = [...root.querySelectorAll('.hygate-dot')]
    const hold = root.querySelector('.hygate-hold')

    let pin = ''
    let busy = false
    let holdTimer = null

    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length))

    const say = (msg, isErr) => {
      sub.textContent = msg
      sub.classList.toggle('err', !!isErr)
    }

    const reset = () => {
      pin = ''
      paint()
    }

    // 실패 누적으로 잠긴 동안 남은 시간을 초 단위로 보여준다
    function tickHold() {
      clearTimeout(holdTimer)
      const ms = window.HyCrypto.lockedFor()
      if (ms <= 0) {
        hold.textContent = ''
        root.dataset.busy = busy ? '1' : ''
        return
      }
      hold.textContent = Math.ceil(ms / 1000) + '초 후 다시 시도할 수 있습니다'
      root.dataset.busy = '1'
      holdTimer = setTimeout(tickHold, 500)
    }

    async function submit() {
      if (busy) return
      const waitMs = window.HyCrypto.lockedFor()
      if (waitMs > 0) {
        tickHold()
        return
      }
      busy = true
      root.dataset.busy = '1'
      say('확인 중…')

      const fail = (msg) => {
        busy = false
        root.dataset.busy = ''
        say(msg, true)
        reset()
      }

      // 설정 파일을 못 읽는 것과 PIN 이 틀린 것은 전혀 다른 문제라 먼저 갈라둔다.
      // (한꺼번에 잡으면 네트워크 오류가 "PIN 오류" 로 잘못 보고된다)
      try {
        await window.HyCrypto.meta()
      } catch (e) {
        return fail(e.message || '잠금 설정을 불러오지 못했습니다')
      }

      let cek
      try {
        // PBKDF2 400만 회 — 기기에 따라 0.5~3초쯤 걸린다
        cek = await window.HyCrypto.unwrapCEK(pin)
      } catch {
        // 여기 오는 경우는 사실상 GCM 인증 실패, 즉 틀린 PIN 뿐이다
        const f = window.HyCrypto.noteFail()
        busy = false
        root.dataset.busy = ''
        reset()
        dotsBox.classList.remove('shake')
        void dotsBox.offsetWidth // 애니메이션 재시작용 리플로우
        dotsBox.classList.add('shake')
        say(f.n >= 3 ? 'PIN 이 맞지 않습니다 (' + f.n + '회 실패)' : 'PIN 이 맞지 않습니다', true)
        tickHold()
        return
      }

      try {
        await window.HyCrypto.useCEK(cek, true, REMEMBER_DAYS)
        window.HyCrypto.clearFail()
        say('불러오는 중…')
        await loadBootData()
      } catch (e) {
        // PIN 은 맞았는데 데이터가 안 열리는 경우 (파일 누락·배포 꼬임 등)
        return fail('데이터를 여는 중 문제가 생겼습니다: ' + (e.message || e))
      }

      root.remove()
      style.remove()
      resolve()
    }

    const push = (d) => {
      if (busy || pin.length >= PIN_LENGTH || window.HyCrypto.lockedFor() > 0) return
      pin += d
      paint()
      if (sub.classList.contains('err')) say('PIN ' + PIN_LENGTH + '자리를 입력하세요')
      if (pin.length === PIN_LENGTH) submit()
    }

    const del = () => {
      if (busy || !pin.length) return
      pin = pin.slice(0, -1)
      paint()
    }

    root.querySelector('.hygate-pad').addEventListener('click', (e) => {
      const b = e.target.closest('button')
      if (!b) return
      if (b.dataset.act === 'del') del()
      else push(b.dataset.n)
    })

    // 물리 키보드 (데스크톱)
    window.addEventListener('keydown', function onKey(e) {
      if (!document.body.contains(root)) return window.removeEventListener('keydown', onKey)
      if (/^\d$/.test(e.key)) push(e.key)
      else if (e.key === 'Backspace') del()
    })

    tickHold()
  })
}

// ── 진입점 ────────────────────────────────────────────────────
// 저장된 키가 있으면 화면 없이 통과, 없으면 키패드를 띄운다.
export async function ensureUnlocked() {
  if (!window.HyCrypto) throw new Error('hy-crypto.js 가 로드되지 않았습니다.')
  if (await window.HyCrypto.key()) {
    try {
      await loadBootData()
      return
    } catch {
      // 저장된 키가 더는 안 맞는 경우(키 교체 등) — 지우고 다시 묻는다
      window.HyCrypto.clearCEK()
    }
  }
  await showKeypad()
}

// 설정에서 "잠그기" 를 누를 때 사용
export function lockNow() {
  window.HyCrypto.clearCEK()
  location.reload()
}
