import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { searchFoods } from '../data/foods.js'
import { lookupFood, getApiKey, setApiKey } from '../lib/foodAI.js'
import * as sync from '../lib/sync.js'
import Calendar, { monthEvents, EVENT_KIND } from './Calendar.jsx'
import { MealGuide, MealPlan } from './Calories.jsx'

// 홈 탭 (파일명은 Schedule.jsx 그대로)
//   1. 달력 — 달력 탭 그대로(일정 추가 포함). 이번 주 줄을 크게, 날짜 칸에 그날 체크 달성(초록/노랑, 완벽)과 칼로리를 칠한다.
//      롤렉스 조건표 마감 같은 큰 날짜는 secure/schedule.js dday 에서 '목표' 일정으로 올린다.
//   2. 왼쪽: 고른 날의 할 일 = 몸 탭 타임라인 (같은 저장소 hy_body_log 를 읽고 쓴다 → 몸 탭과 항상 같다)
//      2/3 이상 체크 = 성공(초록), 전부 = 완벽(진한 초록 + 배지)
//      오른쪽: 칼로리 — 칼로리 탭과 같은 저장소(hy_cal_log)
//   3. 이번 주 횟수 · D-day · 2027 목표(4열) · 분기 로드맵(5열)
// 저장: hy_sched_week · hy_sched_done → sync 'schedule'. 몸/칼로리 변경은 각각 'body'/'calories' 번들로도 push.

const SYNC_KEY = 'schedule'
const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function weekKey(d) {
  const dt = new Date(d)
  const day = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() + (6 - day))
  return dayKey(dt)
}
const newer = (a, b) => !b || Date.parse(a) > Date.parse(b)
const clock = (iso) => {
  try {
    const d = new Date(iso)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}
function useJsonStorage(key, fallback) {
  const [raw, setRaw] = useLocalStorage(key, JSON.stringify(fallback))
  const value = useMemo(() => {
    try {
      return JSON.parse(raw) ?? fallback
    } catch {
      return fallback
    }
  }, [raw, fallback])
  return [value, (next) => setRaw(JSON.stringify(next))]
}
const EMPTY = {}
const EMPTY_LIST = []
const num = (n) => Math.round(n).toLocaleString()
const roundQty = (q) => Math.round(q * 10) / 10
const COLOR = { good: 'var(--good, #22c55e)', bad: 'var(--bad, #ef4444)', warn: 'var(--warn, #f59e0b)', info: 'var(--info, #3b82f6)', calm: 'var(--calm, #8b5cf6)' }
const GREEN = '#22c55e'
const AMBER = '#f59e0b'
const PASS = 2 / 3 // 이만큼 체크하면 그날은 성공
const MEALS = ['아침', '점심', '간식', '저녁', '야식']
const defaultMeal = () => { const h = new Date().getHours(); return h < 11 ? '아침' : h < 14 ? '점심' : h < 17 ? '간식' : h < 21 ? '저녁' : '야식' }

const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 14, minWidth: 0 }
const h2 = { fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', marginBottom: 2 }
const sub = { fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }
const mono = { fontVariantNumeric: 'tabular-nums' }   // 숫자도 본문과 같은 Pretendard 로 (JetBrains Mono 안 씀)
const field = { background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
const btn = { background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 8px', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }

function daysLeft(iso) {
  const t = new Date(iso); t.setHours(0, 0, 0, 0)
  const n = new Date(); n.setHours(0, 0, 0, 0)
  return Math.round((t - n) / 86400000)
}

// 작은 값 입력 (시간/숫자/글) — 몸 탭과 같은 저장 방식 (times[k] 문자열)
function SmallField({ kind, value, placeholder, onCommit }) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => setDraft(value || ''), [value])
  const commit = () => {
    let v = draft.trim()
    if (kind === 'time') {
      const d = v.replace(/\D/g, '')
      v = d ? `${pad(Math.min(23, parseInt(d.slice(0, 2) || '0', 10)))}:${pad(Math.min(59, parseInt(d.slice(2, 4) || '0', 10)))}` : ''
    } else if (kind === 'num') {
      const d = v.replace(/[^\d]/g, '')
      v = d ? String(Math.min(99, parseInt(d, 10))) : ''
    }
    setDraft(v)
    onCommit(v)
  }
  return (
    <input
      value={draft}
      placeholder={placeholder}
      inputMode={kind === 'text' ? 'text' : 'numeric'}
      onChange={(e) => setDraft(kind === 'text' ? e.target.value.slice(0, 40) : e.target.value.replace(/[^\d:]/g, '').slice(0, 5))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      style={{ ...field, width: kind === 'text' ? 120 : 62, padding: '4px 6px', fontSize: 11, fontWeight: 500, textAlign: 'center', ...mono }}
    />
  )
}

// 칼로리 탭에 있던 동기화·AI 키 설정 — 칼로리 탭을 메뉴에서 빼면서 여기로 옮김 (26-09-06)
function SyncSettings() {
  const [panel, setPanel] = useState(null)
  const [sb, setSb] = useState(() => ({ ...sync.getConfig(), email: sync.currentEmail(), pw: '' }))
  const [loggedIn, setLoggedIn] = useState(sync.isLoggedIn())
  const [keyDraft, setKeyDraft] = useState(getApiKey())
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setPanel(panel === 'sync' ? null : 'sync')} style={{ ...btn, padding: '5px 10px' }}>동기화 {loggedIn ? '· 연결됨' : '· 미설정'}</button>
        <button onClick={() => setPanel(panel === 'ai' ? null : 'ai')} style={{ ...btn, padding: '5px 10px' }}>AI {getApiKey() ? '· 키 저장됨' : '· 키 없음'}</button>
        {msg && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{msg}</span>}
      </div>
      {panel === 'sync' && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={sb.url} onChange={(e) => setSb({ ...sb, url: e.target.value })} placeholder="https://xxxx.supabase.co" style={field} />
          <input value={sb.key} onChange={(e) => setSb({ ...sb, key: e.target.value })} placeholder="anon public key" style={field} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={sb.email} onChange={(e) => setSb({ ...sb, email: e.target.value })} placeholder="이메일" autoComplete="username" style={{ ...field, flex: 1, minWidth: 150 }} />
            <input type="password" value={sb.pw} onChange={(e) => setSb({ ...sb, pw: e.target.value })} placeholder="비밀번호" autoComplete="current-password" style={{ ...field, flex: 1, minWidth: 150 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true); setMsg('')
                try {
                  sync.setConfig(sb.url.trim(), sb.key.trim())
                  await sync.login(sb.email.trim(), sb.pw)
                  setLoggedIn(true); setSb({ ...sb, pw: '' }); setMsg('연결됨 — 새로고침하면 기록을 불러온다')
                } catch (e) { setMsg(e.message || '연결 실패') } finally { setBusy(false) }
              }}
              style={{ ...btn, padding: '7px 12px' }}
            >
              연결
            </button>
            <button onClick={() => { sync.logout(); setLoggedIn(false); setMsg('연결 해제됨') }} style={{ ...btn, padding: '7px 12px' }}>연결 해제</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>접속 정보와 세션은 이 브라우저에만 저장된다. 처음 한 번은 Supabase 에 app_state 테이블이 있어야 한다 (src/lib/sync.js 주석).</div>
        </div>
      )}
      {panel === 'ai' && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="sk-ant-..." style={{ ...field, flex: 1, minWidth: 200 }} />
            <button onClick={() => { setApiKey(keyDraft.trim()); setPanel(null); setMsg('AI 키 저장') }} style={{ ...btn, padding: '7px 12px' }}>저장</button>
            <button onClick={() => { setApiKey(''); setKeyDraft(''); setMsg('AI 키 삭제') }} style={{ ...btn, padding: '7px 12px' }}>삭제</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6 }}>Anthropic API 키는 이 브라우저에만 저장된다. 목록에 없는 음식을 AI 로 한 번 찾으면 저장돼 다음부터는 호출 없이 검색된다.</div>
        </div>
      )}
    </div>
  )
}

// ── 주간 뷰: 요일이 열, 시간(07~23시)이 행. 배치도 항목을 시간 칩으로 놓고 클릭해서 체크한다 ──
const WD = ['월', '화', '수', '목', '금', '토', '일']
const HOURS = Array.from({ length: 17 }, (_, i) => 7 + i)   // 07 ~ 23
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const MY_KINDS = ['my', 'trip', 'holiday', 'goal', 'check']

function WeekView({ rows, isOn, toggle, status, calSum, goal, extra, todayKey, onPick, view, setView, moveRow, hasLayout, resetLayout, isMobile, children }) {
  const [offset, setOffset] = useState(0)
  const [selIdx, setSelIdx] = useState(() => (new Date().getDay() + 6) % 7)   // 모바일: 요일 띠에서 고른 날
  const [drag, setDrag] = useState(null)   // { k, from } 드래그 중인 칩
  const [over, setOver] = useState('')     // 'i:h' 드롭 후보 칸
  const [rawMine, setRawMine] = useLocalStorage('hy_cal_v1', '[]')
  const mine = useMemo(() => { try { const v = JSON.parse(rawMine); return Array.isArray(v) ? v : [] } catch { return [] } }, [rawMine])
  const [form, setForm] = useState(null)
  const monday = addDays(mondayOf(new Date()), offset * 7)
  const days = WD.map((_, i) => addDays(monday, i))
  const isoOf = (d) => dayKey(d)
  // 이 주가 걸친 달의 일정 맵
  const evMaps = useMemo(() => {
    const out = {}
    for (const d of days) {
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      if (!out[key]) out[key] = monthEvents(d.getFullYear(), d.getMonth() + 1, { mine, extra, showPost: false })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday.getTime(), mine, extra])
  const evsOf = (d) => (evMaps[`${d.getFullYear()}-${d.getMonth() + 1}`] || {})[d.getDate()] || []
  const rowsFor = (i) => rows.filter((r) => r.days[i])
  const hourOf = (slot) => (/^\d/.test(slot) ? parseInt(slot.slice(0, 2), 10) : null)
  const slotOf = (r, i) => (r.slots && r.slots[i]) || r.slot
  const dragProps = (r, i) => ({ draggable: true, onDragStart: (e) => { setDrag({ k: r.k, from: i }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.k) }, onDragEnd: () => { setDrag(null); setOver('') } })
  const dropProps = (i, h) => ({
    onDragOver: (e) => { if (drag) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== `${i}:${h}`) setOver(`${i}:${h}`) } },
    onDragLeave: () => setOver((o) => (o === `${i}:${h}` ? '' : o)),
    onDrop: (e) => { e.preventDefault(); if (drag) moveRow(drag.k, drag.from, i, h); setDrag(null); setOver('') },
  })
  const overBg = (i, h) => (over === `${i}:${h}` ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : null)
  const label = `${monday.getMonth() + 1}월 ${monday.getDate()}일 – ${days[6].getMonth() + 1}월 ${days[6].getDate()}일`
  const submit = () => {
    const t = (form?.title || '').trim()
    if (!t || !form.from) return
    const to = form.to && form.to > form.from ? form.to : ''
    const next = [...mine, { id: `m${Date.now()}`, title: t, from: form.from, ...(to ? { to } : {}), kind: form.kind, action: [] }].sort((a, b) => a.from.localeCompare(b.from))
    setRawMine(JSON.stringify(next)); setForm(null)
  }
  const removeMine = (id) => setRawMine(JSON.stringify(mine.filter((e) => e.id !== id)))
  const colBg = (iso) => {
    if (iso > todayKey) return 'transparent'
    const st = status(iso)
    return st.perfect ? 'color-mix(in srgb, #22c55e 26%, var(--surface))' : st.kept ? 'color-mix(in srgb, #22c55e 14%, var(--surface))' : st.some ? 'color-mix(in srgb, #f59e0b 12%, var(--surface))' : 'transparent'
  }
  const navBtn = { ...btn, padding: '6px 10px', borderRadius: 999 }
  const tabBtn = (on) => ({ ...btn, padding: '6px 14px', borderRadius: 999, background: on ? 'var(--accent)' : 'var(--surface2)', color: on ? 'var(--accent-text)' : 'var(--text)', borderColor: on ? 'var(--accent)' : 'var(--line)' })
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      {/* 상단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{view === 'month' ? '월 보기' : offset === 0 ? '이번 주' : offset === -1 ? '지난주' : offset === 1 ? '다음 주' : `${offset > 0 ? '+' : ''}${offset}주`} <span style={{ ...mono, color: 'var(--text-3)', fontWeight: 500, fontSize: isMobile ? 12 : 13, marginLeft: 6 }}>{label}</span></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {hasLayout && <button onClick={() => window.confirm('드래그로 옮긴 배치를 모두 원래대로 되돌릴까요?') && resetLayout()} style={navBtn} title="드래그로 바꾼 배치를 원본대로">배치 초기화</button>}
          <button onClick={() => (form ? setForm(null) : setForm({ title: '', from: todayKey, to: '', kind: 'my' }))} style={navBtn}>{form ? '취소' : '+ 일정'}</button>
          {!isMobile && <span style={{ width: 8 }} />}
          <button onClick={() => setView('month')} style={tabBtn(view === 'month')}>월</button>
          <button onClick={() => setView('week')} style={tabBtn(view === 'week')}>주</button>
          {!isMobile && <span style={{ width: 8 }} />}
          <button onClick={() => setOffset(offset - 1)} style={navBtn}>‹</button>
          {!isMobile && <button onClick={() => setOffset(0)} style={navBtn}>이번 주</button>}
          <button onClick={() => setOffset(offset + 1)} style={navBtn}>›</button>
        </div>
      </div>
      {form && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface2)' }}>
          <input autoFocus value={form.title} placeholder="일정 제목" onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ ...field, flex: 2, minWidth: 160 }} />
          <input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} style={{ ...field, width: 150 }} />
          <input type="date" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} style={{ ...field, width: 150 }} title="종료일 (선택)" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} style={{ ...field, width: 110 }}>
            {MY_KINDS.map((k) => <option key={k} value={k}>{EVENT_KIND[k].label}</option>)}
          </select>
          <button onClick={submit} style={{ ...btn, background: 'var(--accent)', color: 'var(--accent-text)', borderColor: 'var(--accent)', padding: '6px 14px' }}>추가</button>
        </div>
      )}
      {view === 'month' && <div style={{ padding: '12px 16px' }}>{children}</div>}
      {/* 모바일: 요일 띠 + 고른 날 세로 타임라인 */}
      {view === 'week' && isMobile && (() => {
        const d = days[selIdx]; const iso = isoOf(d); const future = iso > todayKey
        const evs = evsOf(d); const allday = rowsFor(selIdx).filter((r) => hourOf(slotOf(r, selIdx)) == null)
        const hours = HOURS.filter((h) => rowsFor(selIdx).some((r) => hourOf(slotOf(r, selIdx)) === h))
        const st = iso <= todayKey ? status(iso) : null
        const chip = (r, small) => {
          const on = isOn(iso, r)
          return (
            <div key={r.k} onClick={() => !future && toggle(iso, r.k)} title={r.label}
              style={{ fontSize: small ? 12 : 13.5, lineHeight: 1.35, padding: small ? '4px 9px' : '8px 11px', borderRadius: 9, cursor: future ? 'default' : 'pointer', opacity: future ? 0.55 : 1, minWidth: 0,
                background: on ? 'var(--accent)' : 'var(--surface2)', color: on ? 'var(--accent-text)' : 'var(--text)', border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, textDecoration: on ? 'line-through' : 'none',
                wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
              {on ? '✓ ' : ''}{r.short}
            </div>
          )
        }
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', padding: '8px 8px 10px', gap: 4, borderBottom: '1px solid var(--line)' }}>
              {days.map((dd, i) => {
                const k = isoOf(dd); const isT = k === todayKey; const on = i === selIdx; const s2 = k <= todayKey ? status(k) : null
                const dot = s2 ? (s2.perfect ? '#15803d' : s2.kept ? '#22c55e' : s2.some ? '#f59e0b' : 'var(--line)') : 'transparent'
                return (
                  <div key={k} onClick={() => { setSelIdx(i); onPick(k) }}
                    style={{ textAlign: 'center', padding: '7px 0 6px', borderRadius: 12, cursor: 'pointer', minWidth: 0,
                      background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--accent-text)' : isT ? 'var(--accent)' : 'var(--text)', boxShadow: isT && !on ? 'inset 0 0 0 1.5px var(--accent)' : 'none' }}>
                    <div style={{ fontSize: 10.5, opacity: 0.8, lineHeight: 1 }}>{WD[i]}</div>
                    <div style={{ ...mono, fontSize: 17, fontWeight: 700, lineHeight: 1.25, marginTop: 3 }}>{dd.getDate()}</div>
                    <i style={{ display: 'block', width: 6, height: 6, borderRadius: 3, margin: '4px auto 0', background: on ? 'var(--accent-text)' : dot, opacity: on && !s2 ? 0 : 1 }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 14px 2px' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{d.getMonth() + 1}월 {d.getDate()}일 {WD[selIdx]}요일</div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-3)' }}>{st ? `${st.n}/${st.total}${st.perfect ? ' · 완벽' : st.kept ? ' · 성공' : ''}` : future ? '예정' : ''}</div>
            </div>
            {(allday.length > 0 || evs.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 14px 4px' }}>
                {allday.map((r) => chip(r, true))}
                {evs.map((ev, j) => {
                  const color = EVENT_KIND[ev.kind]?.color || 'var(--text-3)'
                  return <div key={j} onClick={() => ev.mine && removeMine(ev.id)} style={{ fontSize: 12, padding: '4px 9px', borderRadius: 9, background: `color-mix(in srgb, ${color} 18%, var(--surface))`, borderLeft: `3px solid ${color}`, cursor: ev.mine ? 'pointer' : 'default', wordBreak: 'keep-all' }}>{ev.title}</div>
                })}
              </div>
            )}
            <div style={{ padding: '6px 14px 14px' }}>
              {hours.map((h) => {
                const items = rowsFor(selIdx).filter((r) => hourOf(slotOf(r, selIdx)) === h)
                return (
                  <div key={h} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                    <div style={{ ...mono, fontSize: 12, color: 'var(--text-3)', paddingTop: 9, textAlign: 'right' }}>{pad(h)}:00</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>{items.map((r) => chip(r, false))}</div>
                  </div>
                )
              })}
              {hours.length === 0 && allday.length === 0 && <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>이 날은 배치된 항목이 없다</div>}
            </div>
          </div>
        )
      })()}
      {/* 격자 (PC) */}
      {view === 'week' && !isMobile && <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--line)' }}>
            <div />
            {days.map((d, i) => {
              const iso = isoOf(d); const isT = iso === todayKey; const st = iso <= todayKey ? status(iso) : null; const cs = calSum(iso)
              return (
                <div key={iso} onClick={() => onPick(iso)} style={{ padding: '9px 8px', textAlign: 'center', cursor: 'pointer', background: isT ? 'var(--accent)' : colBg(iso), color: isT ? 'var(--accent-text)' : 'var(--text)', borderLeft: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{WD[i]}요일</div>
                  <div style={{ ...mono, fontSize: 17, fontWeight: 700 }}>{d.getDate()}</div>
                  <div style={{ ...mono, fontSize: 10.5, opacity: 0.85, marginTop: 1 }}>
                    {st ? `${st.n}/${st.total}${st.perfect ? ' 완벽' : st.kept ? ' 성공' : ''}` : '·'}
                  </div>
                </div>
              )
            })}
          </div>
          {/* 종일: 일정 + 쉬는 날 */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--line)', background: 'var(--surface2)' }}>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-3)', padding: '6px 6px', textAlign: 'right' }}>종일</div>
            {days.map((d, i) => {
              const iso = isoOf(d); const evs = evsOf(d); const allday = rowsFor(i).filter((r) => hourOf(slotOf(r, i)) == null)
              return (
                <div key={iso} {...dropProps(i, null)} style={{ padding: '4px 5px', borderLeft: '1px solid var(--line)', minHeight: 30, display: 'flex', flexDirection: 'column', gap: 3, background: overBg(i, null) || 'transparent' }}>
                  {allday.map((r) => {
                    const on = isOn(iso, r)
                    return <div key={r.k} {...dragProps(r, i)} onClick={() => toggle(iso, r.k)} title={r.label} style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 6, cursor: 'grab', background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--accent-text)' : 'var(--text-2)', border: '1px dashed var(--line)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{on ? '✓ ' : ''}{r.short}</div>
                  })}
                  {evs.slice(0, 4).map((ev, j) => {
                    const color = EVENT_KIND[ev.kind]?.color || 'var(--text-3)'
                    return (
                      <div key={j} title={ev.title + (ev.mine ? ' (클릭해서 삭제)' : '')} onClick={() => ev.mine && removeMine(ev.id)} style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 6, background: `color-mix(in srgb, ${color} 18%, var(--surface))`, borderLeft: `2px solid ${color}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: ev.mine ? 'pointer' : 'default' }}>{ev.title}</div>
                    )
                  })}
                  {evs.length > 4 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>+{evs.length - 4}</span>}
                </div>
              )
            })}
          </div>
          {/* 시간 행 */}
          {HOURS.map((h) => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--line)', minHeight: 34 }}>
              <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-3)', padding: '6px 6px 0', textAlign: 'right' }}>{pad(h)}:00</div>
              {days.map((d, i) => {
                const iso = isoOf(d); const items = rowsFor(i).filter((r) => hourOf(slotOf(r, i)) === h); const future = iso > todayKey; const isT = iso === todayKey
                return (
                  <div key={iso} {...dropProps(i, h)} style={{ borderLeft: '1px solid var(--line)', padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: 3, background: overBg(i, h) || (isT ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent') }}>
                    {items.map((r) => {
                      const on = isOn(iso, r)
                      return (
                        <div key={r.k} {...dragProps(r, i)} onClick={() => !future && toggle(iso, r.k)} title={`${slotOf(r, i)} ${r.label} (드래그해서 옮기기)`}
                          style={{ fontSize: 11.5, lineHeight: 1.3, padding: '5px 7px', borderRadius: 7, cursor: future ? 'grab' : 'pointer', opacity: future ? 0.5 : drag?.k === r.k ? 0.4 : 1,
                            background: on ? 'var(--accent)' : 'var(--surface2)', color: on ? 'var(--accent-text)' : 'var(--text)', border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`, textDecoration: on ? 'line-through' : 'none' }}>
                          {r.short}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 16px', fontSize: 11, color: 'var(--text-3)' }}>
        {['pay', 'repay', 'bonus', 'goal', 'trip', 'my'].map((k) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: EVENT_KIND[k].color, display: 'inline-block' }} />{EVENT_KIND[k].label}</span>
        ))}
        {!isMobile && <span style={{ marginLeft: 'auto' }}>칩을 누르면 체크, 끌어서 다른 요일·시간으로 이동 · 요일 머리는 2/3 이상 초록, 전부면 진한 초록 · 내 일정은 종일 줄에서 클릭해 삭제</span>}
      </div>
    </div>
  )
}

export default function Schedule() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.schedule) || null
  const body = (typeof window !== 'undefined' && window.__HY_DATA__?.body) || null
  const isMobile = useIsMobile()
  const todayKey = dayKey(new Date())
  const [sel, setSel] = useState(todayKey)
  const [view, setView] = useLocalStorage('hy_home_view', 'week')   // 'week' 기본, 'month' 전환

  // ── 몸 탭 저장소 (할 일 = 몸 탭 타임라인) ──
  const [bodyLog, saveBodyLog] = useJsonStorage('hy_body_log', EMPTY)
  const [bodyReview] = useJsonStorage('hy_body_review', EMPTY)
  const [bodyIssues] = useJsonStorage('hy_body_issues', EMPTY)
  const [, setBodyStamp] = useLocalStorage('hy_body_stamp', '')

  // ── 주간 배치도 체크 (달력 이번 주 칸 안의 체크박스) — hy_sched_day {iso:{k:true}}, sync 'sched_day' ──
  const [dayLog, saveDayLog] = useJsonStorage('hy_sched_day', EMPTY)
  const [dayStamp, setDayStamp] = useLocalStorage('hy_sched_day_stamp', '')
  const dayTouched = useRef(false)
  useEffect(() => {
    ;(async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull('sched_day')
        if (remote && newer(remote.updatedAt, dayStamp) && remote.value?.dayLog) { saveDayLog(remote.value.dayLog); setDayStamp(remote.updatedAt) }
      } catch { /* 무시 */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!dayTouched.current || !sync.isConfigured() || !sync.isLoggedIn()) return
    const t = setTimeout(async () => {
      try {
        const now = new Date().toISOString()
        await sync.push('sched_day', { dayLog }, now)
        setDayStamp(now)
      } catch { /* 다음 변경 때 다시 */ }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayLog])

  // ── 주간 배치도 드래그 이동 — hy_sched_layout {k:{days:[7], slots:[7|null]}}, sync 'sched_layout' ──
  const [layout, saveLayout] = useJsonStorage('hy_sched_layout', EMPTY)
  const [layoutStamp, setLayoutStamp] = useLocalStorage('hy_sched_layout_stamp', '')
  const layoutTouched = useRef(false)
  useEffect(() => {
    ;(async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull('sched_layout')
        if (remote && newer(remote.updatedAt, layoutStamp) && remote.value?.layout) { saveLayout(remote.value.layout); setLayoutStamp(remote.updatedAt) }
      } catch { /* 무시 */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!layoutTouched.current || !sync.isConfigured() || !sync.isLoggedIn()) return
    const t = setTimeout(async () => {
      try {
        const now = new Date().toISOString()
        await sync.push('sched_layout', { layout }, now)
        setLayoutStamp(now)
      } catch { /* 다음 변경 때 다시 */ }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])
  // 원본 rows 에 드래그 이동값을 덮어씌운 것. slots[i] 가 있으면 그 요일만 다른 시각
  const rows = useMemo(() => data.week.rows.map((r) => {
    const ov = layout[r.k]
    return ov ? { ...r, days: ov.days || r.days, slots: ov.slots || null } : r
  }), [layout])
  const moveRow = (k, from, to, hour) => {
    const r = rows.find((x) => x.k === k)
    if (!r) return
    const cur = (r.slots && r.slots[from]) || r.slot
    const min = /^\d/.test(cur) ? cur.slice(3, 5) : '00'
    const next = hour == null ? '—' : `${pad(hour)}:${min}`
    if (from === to && next === cur) return
    const days = [...r.days]; days[from] = 0; days[to] = 1
    const slots = r.slots ? [...r.slots] : Array(7).fill(null)
    if (from !== to) slots[from] = null
    slots[to] = next === r.slot ? null : next
    layoutTouched.current = true
    saveLayout({ ...layout, [k]: { days, slots: slots.some(Boolean) ? slots : null } })
  }
  const resetLayout = () => { layoutTouched.current = true; saveLayout(EMPTY) }

  // ── 칼로리 저장소 (칼로리 탭과 동일 키) ──
  const [calLog, saveCalLog] = useJsonStorage('hy_cal_log', EMPTY)
  const [customFoods] = useJsonStorage('hy_cal_ai_foods', EMPTY_LIST)
  const [goalStr, setGoalStr] = useLocalStorage('hy_cal_goal', '3100')
  const [proteinGoalStr, setProteinGoalStr] = useLocalStorage('hy_cal_protein_goal', '172')
  const [, setCalStamp] = useLocalStorage('hy_cal_stamp', '')
  const goal = Math.max(0, Number(goalStr) || 0)
  const pGoal = Math.max(0, Number(proteinGoalStr) || 0)
  const [query, setQuery] = useState('')
  const [mealSel, setMealSel] = useState(() => defaultMeal())   // 지금 기록하는 끼니
  const foodInputRef = useRef(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')

  // ── 동기화: 몸 / 칼로리 (여기서 고친 것도 각 탭과 같은 키로 올린다) ──
  const bodyTouched = useRef(false)
  useEffect(() => {
    if (!bodyTouched.current || !sync.isConfigured() || !sync.isLoggedIn()) return
    const t = setTimeout(async () => {
      try {
        const now = new Date().toISOString()
        await sync.push('body', { log: bodyLog, review: bodyReview, issues: bodyIssues }, now)
        setBodyStamp(now)
      } catch { /* 몸 탭에서 다시 올라간다 */ }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyLog])
  const calTouched = useRef(false)
  useEffect(() => {
    if (!calTouched.current || !sync.isConfigured() || !sync.isLoggedIn()) return
    const t = setTimeout(async () => {
      try {
        const now = new Date().toISOString()
        await sync.push('calories', { log: calLog, goal: goalStr, proteinGoal: proteinGoalStr, aiFoods: customFoods }, now)
        setCalStamp(now)
      } catch { /* 칼로리 탭에서 다시 올라간다 */ }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calLog])

  if (!data || !body) {
    return <div style={{ color: 'var(--text-3)', padding: 20 }}>홈 데이터가 없습니다 (secure/schedule.js · body.js 잠금 해제 필요)</div>
  }

  // ── 할 일 (몸 탭 타임라인) ──
  const items = body.timeline
  const checksOf = (dkey) => (bodyLog[dkey] || EMPTY).checks || EMPTY
  const timesOf = (dkey) => (bodyLog[dkey] || EMPTY).times || EMPTY
  const dayStatus = (dkey) => {
    const c = checksOf(dkey)
    const n = items.filter((it) => c[it.k]).length
    const total = items.length
    return { n, total, perfect: total > 0 && n === total, kept: total > 0 && n / total >= PASS && n < total, some: n > 0 && n / total < PASS }
  }
  const calSum = (dkey) => {
    const list = calLog[dkey] || EMPTY_LIST
    return { kcal: list.reduce((s, it) => s + it.kcal * it.qty, 0), protein: list.reduce((s, it) => s + (it.protein || 0) * it.qty, 0) }
  }
  const toggle = (dkey, k) => {
    if (dkey > todayKey) return
    bodyTouched.current = true
    const e = bodyLog[dkey] || EMPTY
    saveBodyLog({ ...bodyLog, [dkey]: { ...e, checks: { ...(e.checks || EMPTY), [k]: !(e.checks || EMPTY)[k] } } })
  }
  const setTime = (dkey, k, v) => {
    if (dkey > todayKey) return
    bodyTouched.current = true
    const e = bodyLog[dkey] || EMPTY
    saveBodyLog({ ...bodyLog, [dkey]: { ...e, times: { ...(e.times || EMPTY), [k]: v } } })
  }
  // 달력 이번 주 칸: 그 요일의 주간 배치도 항목 (secure/schedule.js week.rows, days[월=0..일=6])
  const rowsFor = (iso) => {
    const d = new Date(iso + 'T00:00:00')
    const idx = (d.getDay() + 6) % 7
    return rows.filter((r) => r.days[idx])
  }
  // 식사 행은 체크가 아니라 '그날 그 끼니로 기록된 음식이 있나'로 판정한다. 칩을 누르면 그 날짜·끼니가 칼로리 입력칸에 잡힌다
  const hasMeal = (iso, meal) => (calLog[iso] || EMPTY_LIST).some((it) => it.meal === meal)
  const isOn = (iso, row) => (row.meal ? hasMeal(iso, row.meal) : !!(dayLog[iso] || EMPTY)[row.k])
  const toggleSched = (iso, k) => {
    if (iso > todayKey) return
    const row = rows.find((r) => r.k === k)
    if (row?.meal) {
      setSel(iso); setMealSel(row.meal)
      setTimeout(() => foodInputRef.current?.focus(), 50)
      return
    }
    dayTouched.current = true
    const e = dayLog[iso] || EMPTY
    saveDayLog({ ...dayLog, [iso]: { ...e, [k]: !e[k] } })
  }
  const dayItems = (iso) => rowsFor(iso).map((r) => ({ k: r.k, label: r.short, title: r.label, on: isOn(iso, r), toggle: () => toggleSched(iso, r.k) }))
  const schedStatus = (iso) => {
    const rows = rowsFor(iso)
    const n = rows.filter((r) => isOn(iso, r)).length
    const total = rows.length
    return { n, total, perfect: total > 0 && n === total, kept: total > 0 && n / total >= PASS && n < total, some: n > 0 && n / total < PASS }
  }
  // 칸 색은 배치도 체크 기준 (2/3 성공, 전부 완벽). 칼로리 달성은 점으로
  const dayDecor = (iso) => {
    if (iso > todayKey) return null
    const st = schedStatus(iso)
    const cs = calSum(iso)
    return { ...st, kcal: cs.kcal, kcalOk: goal > 0 && cs.kcal >= goal }
  }
  // 달력에 올릴 큰 날짜 (secure/schedule.js dday)
  const extra = useMemo(() => data.dday.map((d) => ({ id: `dd_${d.k}`, title: d.label, from: d.date, kind: 'goal', action: d.note ? [d.note] : [] })), [data])

  // ── 칼로리 조작 ──
  const foods = calLog[sel] || EMPTY_LIST
  const total = calSum(sel)
  const updateSel = (list) => {
    calTouched.current = true
    saveCalLog({ ...calLog, [sel]: list })
  }
  const addFood = (food) => {
    if (!food) return
    const at = foods.findIndex((it) => it.name === food.n && it.kcal === food.k && (it.meal || '') === mealSel)
    const next = at >= 0
      ? foods.map((it, i) => (i === at ? { ...it, qty: roundQty(it.qty + 1) } : it))
      : [...foods, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: food.n, unit: food.u, kcal: food.k, protein: food.p || 0, qty: 1, meal: mealSel }]
    updateSel(next)
    setQuery('')
    setAiError('')
  }
  const setQty = (id, delta) => updateSel(foods.map((it) => (it.id === id ? { ...it, qty: roundQty(it.qty + delta) } : it)).filter((it) => it.qty > 0))
  const removeItem = (id) => updateSel(foods.filter((it) => it.id !== id))
  const matches = query.trim() ? searchFoods(query, 6, customFoods) : []
  const askAI = async () => {
    const q = query.trim()
    if (!q || aiBusy) return
    setAiBusy(true)
    setAiError('')
    try {
      addFood(await lookupFood(q))
    } catch (e) {
      setAiError(e.message || 'AI 검색 실패')
    } finally {
      setAiBusy(false)
    }
  }

  const st = dayStatus(sel)
  const selFuture = sel > todayKey
  const statusColor = st.perfect || st.kept ? GREEN : st.some ? AMBER : 'var(--text-3)'

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      {/* 1. 달력 */}
      <WeekView isMobile={isMobile} rows={rows} isOn={isOn} moveRow={moveRow} hasLayout={Object.keys(layout).length > 0} resetLayout={resetLayout} toggle={toggleSched} status={schedStatus} calSum={calSum} goal={goal} extra={extra} todayKey={todayKey} onPick={setSel} view={view} setView={setView}>
        <Calendar embedded extra={extra} dayDecor={dayDecor} onDayPick={setSel} />
      </WeekView>

      {/* 2. 할 일 / 칼로리 */}
      <div style={{ ...card, marginTop: 14, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', alignItems: 'stretch' }}>
        <div style={{ padding: 18, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <div style={h2}>칼로리 <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginLeft: 6 }}>{sel === todayKey ? '오늘' : sel} · 칼로리 탭과 같은 기록</span></div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              목표
              <input value={goalStr} onChange={(e) => setGoalStr(e.target.value.replace(/[^\d]/g, '').slice(0, 5))} inputMode="numeric" title="목표 칼로리 (칼로리 탭과 공유)"
                style={{ ...field, width: 58, padding: '3px 6px', fontSize: 12, fontWeight: 700, textAlign: 'center', ...mono }} />
              kcal · 단백질
              <input value={proteinGoalStr} onChange={(e) => setProteinGoalStr(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} inputMode="numeric" title="목표 단백질 (칼로리 탭과 공유)"
                style={{ ...field, width: 46, padding: '3px 6px', fontSize: 12, fontWeight: 700, textAlign: 'center', ...mono }} />
              g
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0' }}>
            {[['섭취', total.kcal, goal, 'kcal'], ['단백질', total.protein, pGoal, 'g']].map(([lbl, v, g, unit]) => {
              const ok = g > 0 && v >= g
              const pct = g > 0 ? Math.min(100, Math.round((v / g) * 100)) : 0
              return (
                <div key={lbl} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{lbl}</div>
                  <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: ok ? GREEN : 'var(--text)' }}>{num(v)} <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{unit}</span></div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--line)', marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: ok ? GREEN : 'var(--accent)' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{g > 0 ? (ok ? `+${num(v - g)} 초과` : `${num(g - v)} 남음`) : '목표 미설정'}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
            {MEALS.map((m) => (
              <button key={m} onClick={() => { setMealSel(m); foodInputRef.current?.focus() }} style={{ ...btn, padding: '4px 10px', borderRadius: 999, background: mealSel === m ? 'var(--accent)' : 'var(--surface2)', color: mealSel === m ? 'var(--accent-text)' : 'var(--text)', borderColor: mealSel === m ? 'var(--accent)' : 'var(--line)' }}>{m}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={foodInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (matches.length) addFood(matches[0])
                  else askAI()
                }
              }}
              placeholder={`${mealSel}에 먹은 것 입력 후 Enter (예: 닭가슴살 덮밥)`}
              style={field}
            />
            {matches.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 5, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                {matches.map((f) => (
                  <div key={f.n + f.k} onClick={() => addFood(f)} style={{ padding: '8px 10px', cursor: 'pointer', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5 }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.n} <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{f.u}</span></span>
                    <span style={{ ...mono, color: 'var(--text-3)', fontSize: 11, flex: 'none' }}>{num(f.k)} kcal · P{f.p ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {query.trim() && !matches.length && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
              목록에 없음 — {getApiKey() ? <span onClick={askAI} style={{ color: 'var(--accent)', cursor: 'pointer' }}>{aiBusy ? 'AI 검색 중…' : 'Enter 로 AI 검색'}</span> : '칼로리 탭에서 AI 키를 넣으면 검색된다'}
              {aiError && <span style={{ color: COLOR.bad, marginLeft: 6 }}>{aiError}</span>}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            {foods.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>아직 기록 없음</div>}
            {[...MEALS, ''].filter((m) => foods.some((it) => (it.meal || '') === m)).map((m) => (
              <div key={m || 'none'}>
                <div style={{ fontSize: 11, fontWeight: 700, color: mealSel === m ? 'var(--accent)' : 'var(--text-3)', marginTop: 8, cursor: 'pointer' }} onClick={() => m && setMealSel(m)}>
                  {m || '끼니 미지정'} <span style={{ ...mono, fontWeight: 500 }}>{num(foods.filter((it) => (it.meal || '') === m).reduce((a, it) => a + it.kcal * it.qty, 0))} kcal</span>
                </div>
                {foods.filter((it) => (it.meal || '') === m).map((it) => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{it.unit || ''} · {num(it.kcal)} kcal · {it.protein ?? 0}g</div>
                </div>
                <button onClick={() => setQty(it.id, -0.5)} style={btn}>−</button>
                <span style={{ ...mono, fontSize: 13, width: 28, textAlign: 'center' }}>{it.qty}</span>
                <button onClick={() => setQty(it.id, 0.5)} style={btn}>+</button>
                <span style={{ ...mono, fontSize: 13, fontWeight: 700, width: 46, textAlign: 'right' }}>{num(it.kcal * it.qty)}</span>
                <button onClick={() => removeItem(it.id)} style={{ ...btn, color: 'var(--text-3)' }}>✕</button>
              </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 18, minWidth: 0, borderLeft: isMobile ? 'none' : '1px solid var(--line)', borderTop: isMobile ? '1px solid var(--line)' : 'none' }}><MealPlan isMobile={isMobile} bare /></div>
        <div style={{ padding: 18, minWidth: 0, borderLeft: isMobile ? 'none' : '1px solid var(--line)', borderTop: isMobile ? '1px solid var(--line)' : 'none' }}><MealGuide isMobile={isMobile} bare cols={1} /></div>
      </div>
      </div>

      {/* 칼로리 탭에서 옮겨 온 것 (26-09-06): 평일 현실 식단 · 루틴 음식 · 동기화/AI 설정 */}
      <div style={{ ...card, marginTop: 14, padding: '12px 18px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>설정 · 기기 동기화 · AI 음식 검색</div>
        <SyncSettings />
      </div>
      {/* 목표·분기 로드맵·대출 상환 플랜은 '목표' 탭 (회사에서 홈을 열어도 안 보이게) */}
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 8 }}>
        달력 칸의 체크는 주간 배치도(목표 탭 원본), 오늘 할 일은 몸 루틴, 칼로리는 예전 칼로리 탭과 같은 기록.
      </div>
    </div>
  )
}
