// ─────────────────────────────────────────────────────────────
// Outlook(Microsoft Graph) 메일 → 업무 제안 소스.
//
// 이 앱은 정적 사이트라 'Claude'가 서버에서 실시간으로 메일을 읽는 구조가
// 아니다. 대신 브라우저가 Microsoft Graph REST API 로 사용자의 Outlook 최근
// 메일을 직접 가져와, 제목/본문을 펀드·업무 후보로 매핑해 제안한다.
//
// 실제 연동 방법:
//   1) Azure Portal → 앱 등록 → Microsoft Graph 위임 권한 `Mail.Read` 부여.
//   2) MSAL 등으로 사용자 로그인 후 access token 획득.
//   3) 그 토큰을 VITE_GRAPH_TOKEN 으로 주입하거나 setGraphToken() 으로 전달.
// 토큰이 없으면 아래 데모 메일로 동작한다(연동 전 미리보기용).
// ─────────────────────────────────────────────────────────────

import { WORK_ASSETS } from '../data/worklog.js'

// 런타임에 토큰을 꽂을 수 있는 슬롯 (로그인 후 setGraphToken 으로 주입).
let runtimeToken = null
export function setGraphToken(token) {
  runtimeToken = token || null
}

function getToken() {
  if (runtimeToken) return runtimeToken
  try {
    return import.meta.env?.VITE_GRAPH_TOKEN || null
  } catch {
    return null
  }
}

// 펀드 추정용 키워드와 데모 메일은 자산·거래처·담당자 실명이 드러나므로
// 코드에 두지 않고 secure/outlook.js 에서 암호화해 들여온다 (worklog 와 같은 방식).
const OUTLOOK_DATA =
  (typeof window !== 'undefined' && window.__HY_DATA__?.outlook) || { hints: [], demo: [] }

// 매칭되는 첫 펀드로 분류한다.
const FUND_HINTS = OUTLOOK_DATA.hints

export function guessFund(text = '') {
  const low = text.toLowerCase()
  for (const h of FUND_HINTS) {
    if (h.words.some((w) => low.includes(w))) return h.key
  }
  return 'personal'
}

function fundName(key) {
  return WORK_ASSETS.find((a) => a.key === key)?.name || '개인'
}

// 긴급 추정용 키워드.
const URGENT_WORDS = ['긴급', '오늘', '마감', '지급', '당일', 'asap', '즉시', '회신요망']
function guessUrgent(text = '') {
  const low = text.toLowerCase()
  return URGENT_WORDS.some((w) => low.includes(w))
}

// 데모 메일 — 연동 전 미리보기용. 실제 거래처·담당자가 들어 있어 암호화해 둔다.
const DEMO = OUTLOOK_DATA.demo

// 메일 1건 → 업무 제안 객체로 가공.
function enrich(mail) {
  const blob = `${mail.subject} ${mail.preview || ''}`
  const fundKey = mail.fundKey || guessFund(blob)
  return {
    id: mail.id,
    from: mail.from || '메일',
    subject: mail.subject || '(제목 없음)',
    preview: mail.preview || '',
    received: mail.received || '',
    fundKey,
    fundName: fundName(fundKey),
    // 사용자가 패널에서 검토·수정할 수 있는 업무 후보값.
    suggestTitle: mail.suggestTitle || mail.subject || '(제목 없음)',
    suggestDesc: mail.suggestDesc || (mail.preview ? [mail.preview] : []),
    suggestDue: mail.suggestDue || '',
    urgent: mail.urgent != null ? mail.urgent : guessUrgent(blob),
  }
}

async function fetchFromGraph(token) {
  const url =
    'https://graph.microsoft.com/v1.0/me/messages' +
    '?$top=15&$select=subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc'
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Graph ${res.status}`)
  const data = await res.json()
  return (data.value || []).map((m) =>
    enrich({
      id: m.id,
      from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || '메일',
      subject: m.subject,
      preview: m.bodyPreview,
      received: m.receivedDateTime,
    }),
  )
}

// 메일 제안 목록을 가져온다. 토큰이 있으면 실제 Outlook, 없으면 데모.
export async function fetchMailSuggestions() {
  const token = getToken()
  if (token) {
    try {
      return await fetchFromGraph(token)
    } catch (e) {
      // 토큰 만료/권한 문제 등 → 데모로 폴백하고 콘솔에만 기록.
      console.warn('[outlook] Graph 호출 실패, 데모 데이터로 폴백:', e?.message || e)
    }
  }
  return DEMO.map(enrich)
}

// 실제 연동 여부 (UI 배지 표시용).
export function isLiveMail() {
  return !!getToken()
}
