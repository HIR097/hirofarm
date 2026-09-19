// 크립토 탭 "오늘 뉴스로 업데이트" — The Block 최신 기사를 Claude 가 서버 쪽 web_fetch 로 직접 읽고
// 토플 수준 어휘·문법 노트(마크다운)를 만든다.
//
// 정적 사이트라 브라우저에서 Anthropic API 를 직접 부른다 (foodAI.js 와 같은 방식, 같은 키 저장소).
// RSS·기사 본문은 브라우저가 아니라 Anthropic 서버가 가져오므로 CORS 문제가 없다.
// 결과는 localStorage(hy_crypto_notes) 에 날짜별로 쌓이고, 동기화가 켜져 있으면 Supabase 'crypto_notes' 키로 올라간다.
import { getApiKey } from './foodAI.js'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-5'
const RSS = 'https://www.theblock.co/rss.xml'
export const NOTES_STORAGE = 'hy_crypto_notes'
export const SYNC_KEY = 'crypto_notes'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const tabLabel = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY[d.getDay()]})`
}

const SYSTEM = `너는 한국인 직장인(영어 OPIc IH, 토플 준비 예정)을 위해 The Block 크립토 뉴스를 "읽기 전 예습 노트"로 바꾸는 영어 코치다.
독자는 크립토 투자자이지만 영어 어휘가 부족하다고 느낀다. 목표는 기사를 링크에서 직접 읽을 때 막히지 않게 하는 것이다.

절차:
1. 제공된 RSS 주소를 web_fetch 로 읽고, 최근 48시간 기사 중 시장·규제·기관·온체인 흐름을 가장 잘 보여주는 6~7편을 고른다 (스폰서·이벤트 홍보·단순 인사 뉴스 제외). 같은 사건이 여러 편이면 대표 1편만.
2. 고른 기사를 각각 web_fetch 로 읽는다.
3. 아래 형식의 마크다운 노트를 한국어로 쓴다. 기사 원문 문장을 그대로 옮기지 않는다 (저작권). 예문은 전부 네가 새로 쓴 문장이어야 한다.

어휘 선정 기준 (토플 기준):
- TOEFL Reading/Listening 에 나오는 학술·시사 어휘를 우선한다 (예: unprecedented, subsequent, mitigate, allege, contend, provision, stance, viable, scrutiny, curb, surge, stall, exempt).
- 크립토·금융 전문용어는 기사 이해에 꼭 필요한 것만 (예: inflow, custody, rulemaking, open interest).
- 기사당 8~10개. 너무 쉬운 단어(market, price, company)는 넣지 않는다.

문법 포인트 (토플 기준):
- 기사마다 1~2개. 토플 리딩에서 문장을 길게 만드는 구조를 고른다: 분사구문, 관계절 축약, 동격, 도치, 가정법, 분열문(it is ~ that), 명사화, 삽입구, as/while 양보절, 무생물 주어.
- 구조 이름 + 왜 그렇게 읽는지 한 문장 + 네가 새로 쓴 예문 1개 (크립토 맥락) + 그 예문의 해석.

출력 형식 (이 형식만, 다른 말 없이 마크다운으로):

# {YYYY-MM-DD} ({요일}) · 어휘 노트

The Block {날짜 범위} 기사 {N}편. {이번 흐름을 한 문단으로 잇는 요약, 굵게 강조 포함}

> 오늘 읽기 순서: 기초 용어 탭 훑기 5분 → 여기서 기사 1편당 어휘 2분 → 링크 열고 5분 → 노트 한 줄.

## 1. {기사 한국어 제목}

[기사 열기 — {원문 영어 제목}]({원문 URL})

**한 줄**: {무슨 일이 왜 중요한지 한 문장}

| 단어 | 품사 | 뜻 | 예문 |
|---|---|---|---|
| **{단어}** | {n/v/adj/adv/phr v} | {한국어 뜻} | {새로 쓴 영어 예문} |
... 8~10행

**표현**
- **{관용구·연어}** — {뜻}. {쓰임 한 마디}
... 3~4개

**문법**
- **{구조 이름}** — {왜 이렇게 읽는지}. 예: *{새 예문}* → {해석}

**숫자**: {핵심 수치 · 로 구분}

(2번~N번 기사 같은 형식)

## 오늘의 복습

이번 노트에 두 번 이상 나온 단어.

| 단어 | 나온 기사 |
|---|---|
| **{단어}** | {번호들} |

**자가 테스트** (답은 위에서 찾는다)
1. ~ 5. {어휘·문법 확인 질문 5개}

**말하기 과제 (TOEFL 스피킹 형식)**: 오늘 기사 중 하나를 골라 "결정 + 이유 2개" 구조로 45초 말하기. 쓸 표현: {오늘 표현 3개}

**다음 주 예측 적기**: {이번 흐름이 다음 주에 어떻게 될지 한 줄 적고 채점하라는 안내}

<!-- meta: {"title": "{날짜} · {핵심 사건 3개를 · 로 이은 제목}", "articles": {N}, "words": {어휘 총 개수}} -->`

// 마크다운 뒤 meta 주석을 파싱한다
function parseMeta(md) {
  const m = /<!--\s*meta:\s*(\{[\s\S]*?\})\s*-->/.exec(md)
  if (!m) return {}
  try { return JSON.parse(m[1]) } catch { return {} }
}

async function call(body, apiKey) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.error?.message || '' } catch { /* ignore */ }
    if (res.status === 401) throw new Error('API 키가 올바르지 않습니다.')
    if (res.status === 429) throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.')
    throw new Error(`API 오류 ${res.status}${detail ? ` — ${detail}` : ''}`)
  }
  return res.json()
}

// 오늘 노트 생성. onStatus(문자열) 로 진행 상황을 알린다. 결과: { date, md, title, articles, words, ts }
export async function generateDailyNote({ date = todayIso(), onStatus = () => {} } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API 키가 없습니다. 홈 탭 아래 "AI 설정"에서 키를 먼저 입력해 주세요.')

  const weekday = WEEKDAY[new Date(date + 'T00:00:00').getDay()]
  const messages = [{
    role: 'user',
    content: `오늘은 ${date} (${weekday}) 이다. RSS 주소: ${RSS}\nRSS 를 읽고 최근 48시간 기사 6~7편을 골라 각 기사를 읽은 뒤, 시스템 지시의 형식대로 오늘 어휘 노트를 써라. 기사 링크는 RSS 에 있는 원문 URL 을 그대로 쓴다.`,
  }]
  const body = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    fallbacks: 'default', // 안전 분류기가 거절하면 서버가 다른 모델로 이어 준다
    tools: [{ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 12, allowed_domains: ['theblock.co', 'www.theblock.co'] }],
    output_config: { effort: 'medium' },
    messages,
  }

  onStatus('RSS 와 기사를 읽는 중… (1~3분)')
  let data = await call(body, apiKey)
  // 서버 도구 루프가 10회 제한에 걸리면 pause_turn — 어시스턴트 응답을 그대로 붙여 다시 보낸다
  for (let i = 0; i < 4 && data.stop_reason === 'pause_turn'; i++) {
    onStatus(`계속 읽는 중… (${i + 2}회차)`)
    data = await call({ ...body, messages: [...messages, { role: 'assistant', content: data.content }] }, apiKey)
  }
  if (data.stop_reason === 'refusal') throw new Error('모델이 이 요청에 답하지 않았습니다.')
  if (data.stop_reason === 'max_tokens') throw new Error('노트가 너무 길어 잘렸습니다. 다시 시도해 주세요.')

  const md = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  if (!md.startsWith('#')) throw new Error('노트 형식이 아닙니다: ' + md.slice(0, 80))
  const meta = parseMeta(md)
  const fetched = (data.content || []).filter((b) => b.type === 'server_tool_use').length
  onStatus(`완료 · 기사 ${meta.articles ?? '?'}편 · 페이지 ${fetched}개 읽음`)
  return { date, md: md.replace(/<!--\s*meta:[\s\S]*?-->\s*$/, '').trim(), title: meta.title || `${date} 어휘 노트`, articles: meta.articles || null, words: meta.words || null, ts: new Date().toISOString() }
}

// ----- 저장 -----
export function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_STORAGE) || '{}') || {} } catch { return {} }
}
export function saveNotes(notes) {
  try { localStorage.setItem(NOTES_STORAGE, JSON.stringify(notes)) } catch { /* ignore */ }
}
// 두 노트 묶음을 날짜별 최신 ts 기준으로 합친다
export function mergeNotes(a, b) {
  const out = { ...(a || {}) }
  for (const [k, v] of Object.entries(b || {})) if (!out[k] || (v.ts || '') > (out[k].ts || '')) out[k] = v
  return out
}
