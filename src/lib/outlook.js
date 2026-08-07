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

// 펀드 추정용 키워드. 메일 제목/본문에서 매칭되는 첫 펀드로 분류한다.
const FUND_HINTS = [
  { key: 'vplex', words: ['v-plex', 'vplex', '브이플렉스', '125호'] },
  { key: 'garo', words: ['가로골목', '149호', '플래그쉽'] },
  { key: 'gasan', words: ['가산', 'idc', '지엘가산', '156호'] },
  { key: 'cj', words: ['cj', '제일제당', '372호', '대한통운'] },
  { key: 'ai', words: ['코어1호', '인컴앤그로스', 'mmda', '투자자협의회'] },
  { key: '416', words: ['마이아트', '416호'] },
]

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

// 데모 메일 — 실제 펀드와 연관된 그럴듯한 항목.
const DEMO = [
  {
    id: 'demo-1',
    from: '키움증권 신윤미 과장',
    subject: '[키움] CJ제일제당센터 담보대출 대주 SPC 유동화비용 청구 공문',
    preview: '공문 모아 회신드립니다. 해당 금액으로 유동화비용 지급 부탁드립니다.',
    received: '2026-06-23T09:12:00',
    suggestDue: '6/26',
  },
  {
    id: 'demo-2',
    from: 'Deloitte 회계',
    subject: 'RE: 브이플렉스 매각자문 용역계약서_260522 검토 요청',
    preview: '용범과장님 검토 의견 반영본 첨부드립니다. 날인 진행 부탁드립니다.',
    received: '2026-06-23T08:40:00',
    suggestDue: '',
  },
  {
    id: 'demo-3',
    from: '하나자산신탁',
    subject: '[이지스156호] 34기 예상정산금액 안내 - 분배금 지급 협조',
    preview: '25일 펀드 결산 후 분배금 확정 예정. 26일 당일 오전 자금처리 협조 요청드립니다.',
    received: '2026-06-23T08:05:00',
    suggestDue: '분배금 6/26 · 자금집행 24일',
  },
  {
    id: 'demo-4',
    from: '신탁회계팀',
    subject: 'RE: [신탁회계] 국내주식/대여/채권 공정가치평가 (가로골목 청산)',
    preview: '평가 내역 리뷰 부탁드립니다. 이대로 진행 가능한지 확인 회신 주세요.',
    received: '2026-06-22T17:30:00',
    suggestDue: '',
  },
  {
    id: 'demo-5',
    from: '운용지원',
    subject: '[코어1호·인컴앤그로스2호] 투자자협의회 개최 일정 안내',
    preview: '운용전담인력 교체 및 신탁계약 변경 건. 수익자 회신 대기중입니다.',
    received: '2026-06-22T15:10:00',
    suggestDue: '',
  },
]

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
