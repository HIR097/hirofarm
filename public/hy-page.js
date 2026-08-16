/* ─────────────────────────────────────────────────────────────
 * 독립 HTML 페이지(오버레이로 열리는 것들)용 부트스트랩.
 *
 * 이 페이지들은 앱에서 iframe 으로 열리므로 같은 출처의 localStorage 를 공유한다.
 * 즉 앱에서 이미 잠금을 풀었다면 여기서도 그대로 키를 쓸 수 있다.
 * 주소를 직접 쳐서 들어온 경우에는 키가 없으니 잠김 안내만 보여준다.
 *
 * 페이지 본문 스크립트는 <script type="text/hyscript"> 로 표시해 두고,
 * 데이터 복호화가 끝난 뒤 진짜 <script> 로 다시 심어 실행한다.
 * (본문을 async 함수로 감싸면 전역 함수가 사라져 onclick= 이 깨지므로 이 방식을 쓴다)
 * ───────────────────────────────────────────────────────────── */
;(function () {
  'use strict'

  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' }

  // 논리 경로(mangrove-plans/f1.png) → blob URL. 같은 파일을 두 번 풀지 않도록 캐시한다.
  const urlCache = new Map()

  function url(logicalPath) {
    if (!urlCache.has(logicalPath)) {
      const ext = logicalPath.split('.').pop().toLowerCase()
      urlCache.set(
        logicalPath,
        window.HyCrypto.objectURL('/enc/' + logicalPath + '.enc', MIME[ext]).catch((e) => {
          urlCache.delete(logicalPath)
          throw e
        }),
      )
    }
    return urlCache.get(logicalPath)
  }

  // data-src 가 붙은 이미지를 복호화한 blob URL 로 바꿔준다.
  function resolveImages(root) {
    for (const el of (root || document).querySelectorAll('img[data-src]')) {
      const p = el.dataset.src
      delete el.dataset.src
      url(p).then(
        (u) => {
          // loading="lazy" 인 채로 blob URL 을 물리면 크롬이 로드를 시작하지 않는다.
          // (빈 src 상태에서 지연 로딩 판정이 끝나 버리고, 높이 0 이라 다시 걸리지도 않는다)
          // 어차피 복호화 단계에서 이미 다 받아온 뒤라 지연 로딩은 의미가 없다.
          el.loading = 'eager'
          el.src = u
        },
        () => el.setAttribute('alt', '(잠김) ' + p),
      )
    }
  }

  function showLocked(msg) {
    document.documentElement.dataset.theme =
      new URLSearchParams(location.search).get('theme') || localStorage.getItem('hy_theme') || 'light'
    const dark = document.documentElement.dataset.theme === 'dark'
    document.body.innerHTML =
      '<div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:14px;padding:28px;text-align:center;' +
      'font-family:\'Pretendard Variable\',\'Pretendard\',-apple-system,\'Malgun Gothic\',sans-serif;' +
      'background:' + (dark ? '#131315' : '#f4f4f6') + ';color:' + (dark ? '#f2f2f4' : '#101012') + '">' +
      '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" style="opacity:.7">' +
      '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>' +
      '<div style="font-size:16px;font-weight:600">잠긴 문서입니다</div>' +
      '<div style="font-size:13.5px;line-height:1.6;color:' + (dark ? '#8a8a92' : '#79797f') + '">' +
      (msg || '히로팜에서 PIN 을 입력한 뒤 다시 열어 주세요.') +
      '</div>' +
      '<a href="/" style="margin-top:6px;font-size:13.5px;color:inherit;opacity:.75">히로팜으로 이동 →</a>' +
      '</div>'
  }

  // 본문 스크립트를 순서대로 실행 (전역 스코프 유지)
  function runPageScripts() {
    for (const s of document.querySelectorAll('script[type="text/hyscript"]')) {
      const el = document.createElement('script')
      el.textContent = s.textContent
      s.replaceWith(el)
    }
  }

  async function boot(dataFiles) {
    try {
      if (!(await window.HyCrypto.key())) return showLocked()
      for (const f of dataFiles || []) await window.HyCrypto.runScript(f)
    } catch (e) {
      return showLocked(
        e && e.message === 'LOCKED'
          ? null
          : '문서를 여는 중 문제가 생겼습니다.<br>' + ((e && e.message) || ''),
      )
    }

    // 페이지가 나중에 다시 그리더라도 새로 생긴 이미지를 자동으로 채워준다
    new MutationObserver(() => resolveImages()).observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    runPageScripts()
    resolveImages()
  }

  // 페이지 전체를 암호화해 둔 경우의 진입점.
  //
  // 이 파일들은 데이터뿐 아니라 마크업 자체에 실명·금액·대응 전략이 들어 있어서
  // "데이터만 빼서 암호화" 로는 부족하다. 그래서 문서 전체를 암호문으로 두고,
  // 공개 위치에는 이 로더만 남긴다.
  //
  // 복호화한 HTML 을 document.write 로 흘려 넣는다. innerHTML/DOMParser 로는
  // 안에 든 <script> 가 실행되지 않아 페이지가 죽는다.
  async function openPage(encPath) {
    try {
      if (!(await window.HyCrypto.key())) return showLocked()
      const html = await window.HyCrypto.fetchText(encPath)
      document.open()
      document.write(html)
      document.close()
    } catch (e) {
      showLocked(
        e && e.message === 'LOCKED' ? null : '문서를 여는 중 문제가 생겼습니다.<br>' + ((e && e.message) || ''),
      )
    }
  }

  window.HyPage = { boot, openPage, url, resolveImages, showLocked }
})()
