import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { searchFoods } from '../data/foods.js'
import { lookupFood, getApiKey } from '../lib/foodAI.js'
import * as sync from '../lib/sync.js'
import Calendar from './Calendar.jsx'

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

export default function Schedule() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.schedule) || null
  const body = (typeof window !== 'undefined' && window.__HY_DATA__?.body) || null
  const isMobile = useIsMobile()
  const todayKey = dayKey(new Date())
  const [sel, setSel] = useState(todayKey)

  // ── 몸 탭 저장소 (할 일 = 몸 탭 타임라인) ──
  const [bodyLog, saveBodyLog] = useJsonStorage('hy_body_log', EMPTY)
  const [bodyReview] = useJsonStorage('hy_body_review', EMPTY)
  const [bodyIssues] = useJsonStorage('hy_body_issues', EMPTY)
  const [, setBodyStamp] = useLocalStorage('hy_body_stamp', '')

  // ── 칼로리 저장소 (칼로리 탭과 동일 키) ──
  const [calLog, saveCalLog] = useJsonStorage('hy_cal_log', EMPTY)
  const [customFoods] = useJsonStorage('hy_cal_ai_foods', EMPTY_LIST)
  const [goalStr, setGoalStr] = useLocalStorage('hy_cal_goal', '3100')
  const [proteinGoalStr, setProteinGoalStr] = useLocalStorage('hy_cal_protein_goal', '172')
  const [, setCalStamp] = useLocalStorage('hy_cal_stamp', '')
  const goal = Math.max(0, Number(goalStr) || 0)
  const pGoal = Math.max(0, Number(proteinGoalStr) || 0)
  const [query, setQuery] = useState('')
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
  const dayDecor = (iso) => {
    const st = dayStatus(iso)
    const cs = calSum(iso)
    if (iso > todayKey) return null
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
    const at = foods.findIndex((it) => it.name === food.n && it.kcal === food.k)
    const next = at >= 0
      ? foods.map((it, i) => (i === at ? { ...it, qty: roundQty(it.qty + 1) } : it))
      : [...foods, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: food.n, unit: food.u, kcal: food.k, protein: food.p || 0, qty: 1 }]
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
      <Calendar embedded extra={extra} dayDecor={dayDecor} onDayPick={setSel} />

      {/* 2. 할 일 / 칼로리 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div style={{ ...card, ...(st.perfect ? { borderColor: GREEN, boxShadow: `0 0 0 1px ${GREEN}` } : null) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={h2}>
              {sel === todayKey ? '오늘 할 일' : `${sel} 할 일`}
              <span style={{ ...mono, fontSize: 12, fontWeight: 500, color: statusColor, marginLeft: 6 }}>{st.n}/{st.total}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: st.perfect ? 'color-mix(in srgb, #22c55e 22%, var(--surface))' : 'transparent', borderRadius: 999, padding: st.perfect ? '3px 10px' : 0 }}>
              {st.perfect ? '✦ 완벽한 하루' : st.kept ? '성공 (2/3 이상)' : st.some ? `성공까지 ${Math.ceil(st.total * PASS) - st.n}개` : '몸 탭 루틴'}
            </span>
          </div>
          <div style={sub}>몸 탭과 같은 체크. {Math.ceil(items.length * PASS)}개 이상이면 그날은 성공, 전부면 완벽. 달력에 색으로 남는다.</div>
          {items.map((it) => {
            const on = !!checksOf(sel)[it.k]
            const val = timesOf(sel)[it.k] || ''
            return (
              <div key={it.k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderTop: '1px solid var(--line)', opacity: selFuture ? 0.5 : 1 }}>
                <span onClick={() => toggle(sel, it.k)} style={{ width: 22, height: 22, borderRadius: 7, flex: 'none', border: on ? 'none' : '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'transparent', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, cursor: selFuture ? 'default' : 'pointer' }}>{on ? '✓' : ''}</span>
                <span onClick={() => toggle(sel, it.k)} style={{ fontSize: 13, flex: 1, minWidth: 0, color: on ? 'var(--text-3)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none', cursor: selFuture ? 'default' : 'pointer' }} title={it.label}>
                  <b>{it.short}</b>
                  {!isMobile && <span style={{ color: 'var(--text-3)', fontSize: 11.5 }}> — {it.label.length > 46 ? it.label.slice(0, 46) + '…' : it.label}</span>}
                </span>
                {it.type && !selFuture && <SmallField kind={it.type} value={val} placeholder={it.ph || ''} onCommit={(v) => setTime(sel, it.k, v)} />}
                {it.type && selFuture && <span style={{ ...mono, fontSize: 11, color: 'var(--text-3)' }}>—</span>}
              </div>
            )
          })}
        </div>

        <div style={card}>
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
          <div style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (matches.length) addFood(matches[0])
                  else askAI()
                }
              }}
              placeholder="먹은 것 입력 후 Enter (예: 닭가슴살 덮밥)"
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
            {foods.map((it) => (
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
        </div>
      </div>

      {/* 목표·분기 로드맵·주간 배치도는 '목표' 탭으로 옮김 (26-09-04, 회사에서 홈을 열어도 안 보이게) */}
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        할 일은 몸 탭 타임라인과 같은 기록이고, 칼로리는 칼로리 탭과 같은 기록.
      </div>
    </div>
  )
}
