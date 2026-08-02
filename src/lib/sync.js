// Supabase 기기 간 동기화 — REST API 직접 호출(의존성 없음).
//
// 저장 구조: app_state 테이블에 (user_id, k) 기준으로 JSON 한 덩어리를 upsert 한다.
// 로그인은 이메일/비밀번호. 세션 토큰과 접속 정보는 이 브라우저의 localStorage 에만 있고
// 저장소에는 아무것도 커밋되지 않는다. RLS 로 본인 행만 읽고 쓸 수 있다.
//
// ── Supabase에서 1회 실행할 SQL (SQL Editor) ───────────────────────────────
// create table if not exists app_state (
//   user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
//   k          text        not null,
//   v          jsonb       not null,
//   updated_at timestamptz not null default now(),
//   primary key (user_id, k)
// );
// alter table app_state enable row level security;
// create policy "own rows" on app_state
//   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
// ──────────────────────────────────────────────────────────────────────────

const CFG = 'hy_sb_cfg' // { url, key }
const SESSION = 'hy_sb_session' // { access_token, refresh_token, expires_at, email }

const read = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

export const getConfig = () => read(CFG, { url: '', key: '' })
export const setConfig = (url, key) => write(CFG, { url: url.replace(/\/+$/, ''), key })
export const getSession = () => read(SESSION, null)
export const isConfigured = () => {
  const c = getConfig()
  return !!(c.url && c.key)
}
export const isLoggedIn = () => !!getSession()?.refresh_token
export const currentEmail = () => getSession()?.email || ''

async function authRequest(grant, body) {
  const { url, key } = getConfig()
  if (!url || !key) throw new Error('Supabase 주소와 anon 키를 먼저 입력해 주세요.')
  const res = await fetch(`${url}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: key },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || `로그인 실패 (${res.status})`)
  return data
}

function saveSession(data, email) {
  write(SESSION, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    // 만료 60초 전에 미리 갱신하도록 여유를 둔다
    expires_at: Date.now() + Math.max(0, (data.expires_in || 3600) - 60) * 1000,
    email: email || data.user?.email || '',
  })
}

export async function login(email, password) {
  const data = await authRequest('password', { email, password })
  saveSession(data, email)
}

export function logout() {
  write(SESSION, null)
}

async function accessToken() {
  const s = getSession()
  if (!s) throw new Error('로그인이 필요합니다.')
  if (Date.now() < s.expires_at) return s.access_token
  const data = await authRequest('refresh_token', { refresh_token: s.refresh_token })
  saveSession(data, s.email)
  return data.access_token
}

async function rest(path, options = {}) {
  const { url, key } = getConfig()
  const token = await accessToken()
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    if (res.status === 404 || /relation .*app_state.* does not exist/.test(detail))
      throw new Error('app_state 테이블이 없습니다. 안내한 SQL을 먼저 실행해 주세요.')
    throw new Error(`동기화 실패 (${res.status}) ${detail.slice(0, 120)}`)
  }
  return res
}

// 원격 값 읽기 → { value, updatedAt } 또는 저장된 적이 없으면 null
export async function pull(k) {
  const res = await rest(`app_state?k=eq.${encodeURIComponent(k)}&select=v,updated_at`)
  const rows = await res.json()
  if (!rows.length) return null
  return { value: rows[0].v, updatedAt: rows[0].updated_at }
}

// 원격에 덮어쓰기. updatedAt 은 ISO 문자열.
export async function push(k, value, updatedAt) {
  await rest('app_state', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ k, v: value, updated_at: updatedAt || new Date().toISOString() }]),
  })
}
