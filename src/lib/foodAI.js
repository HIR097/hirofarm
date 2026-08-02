// DB에 없는 음식을 Claude에게 물어보고 칼로리·단백질을 추정받는다.
//
// 이 앱은 백엔드가 없는 정적 사이트라 브라우저에서 Anthropic API를 직접 호출한다.
// 그래서 API 키는 사용자가 설정에서 직접 입력해 localStorage에만 저장되며,
// 저장소(GitHub)에는 절대 들어가지 않는다. 브라우저 직접 호출에는
// anthropic-dangerous-direct-browser-access 헤더가 필요하다.

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-5'
export const KEY_STORAGE = 'hy_anthropic_key'

// 구조화 출력 — 응답이 항상 이 스키마의 JSON으로 온다.
const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '음식 이름 (한국어, 입력을 정리한 형태)' },
    unit: { type: 'string', description: '기준 1회 제공량. 예: "1개", "1인분 200g", "1스쿱"' },
    kcal: { type: 'integer', description: '기준 제공량당 칼로리(kcal) 추정치' },
    protein: { type: 'number', description: '기준 제공량당 단백질(g) 추정치' },
    note: { type: 'string', description: '추정 근거나 주의사항 한 줄. 없으면 빈 문자열' },
  },
  required: ['name', 'unit', 'kcal', 'protein', 'note'],
  additionalProperties: false,
}

const SYSTEM = `너는 한국 음식의 영양 정보를 추정하는 도우미다.
사용자가 먹은 음식 이름을 주면 일반적인 1회 제공량 기준으로 칼로리(kcal)와 단백질(g)을 추정한다.
- 브랜드 제품(예: "런베뮤 다크초코베이글", "옵티멈 하이드로웨이")이면 그 제품의 실제 크기와 성분을 최대한 반영한다.
- 제공량이 애매하면 한국에서 가장 흔한 1인분/1개 기준으로 잡고 unit에 명시한다.
- 확실하지 않으면 보수적인 중간값을 쓰고 note에 근거를 한 줄로 적는다.
- 입력이 음식이 아니면 kcal 0, protein 0, note에 "음식으로 인식할 수 없음"이라고 적는다.`

export function getApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* ignore */
  }
}

// 성공하면 { n, k, p, u, note } (foods.js와 같은 형태)를 돌려준다.
export async function lookupFood(query) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API 키가 없습니다. 아래 "AI 설정"에서 키를 먼저 입력해 주세요.')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000, // Opus 5는 기본적으로 thinking이 켜져 있어 넉넉히 잡는다
      system: SYSTEM,
      output_config: {
        effort: 'low', // 단순 조회라 낮은 effort로 충분
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [{ role: 'user', content: `음식: ${query}` }],
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.error?.message || ''
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new Error('API 키가 올바르지 않습니다.')
    if (res.status === 429) throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.')
    throw new Error(`API 오류 ${res.status}${detail ? ` — ${detail}` : ''}`)
  }

  const data = await res.json()
  if (data.stop_reason === 'refusal') throw new Error('모델이 이 요청에 답하지 않았습니다.')

  const text = (data.content || []).find((b) => b.type === 'text')?.text
  if (!text) throw new Error('응답이 비어 있습니다.')

  const parsed = JSON.parse(text)
  return {
    n: parsed.name || query,
    k: Math.max(0, Math.round(parsed.kcal || 0)),
    p: Math.max(0, Math.round((parsed.protein || 0) * 10) / 10),
    u: parsed.unit || '1회분',
    note: parsed.note || '',
    ai: true,
  }
}
