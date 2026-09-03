import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { searchFoods } from '../data/foods.js'
import { lookupFood, getApiKey } from '../lib/foodAI.js'
import * as sync from '../lib/sync.js'

// 스케줄 탭
//   위: 이번 주 월~일 한 줄 — 그날 체크리스트를 다 지키면 초록, 일부면 노랑. 칼로리 목표 달성은 작은 점.
//   아래 왼쪽: 고른 날의 체크리스트 (secure/schedule.js week.rows 에서 그 요일 행만)
//   아래 오른쪽: 칼로리 — 칼로리 탭과 같은 저장소(hy_cal_log · hy_cal_goal)를 읽고 쓴다
//   그 아래: 주간 체크 · 목표 · 분기 로드맵
// 저장: hy_sched_day(날짜별 체크) · hy_sched_week(주별 횟수) · hy_sched_done(로드맵) → Supabase sync 'schedule'
//       칼로리는 'calories' 키로 칼로리 탭과 같은 번들을 push 한다

const SYNC_KEY = 'schedule'
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function weekKey(d) {
  const dt = new Date(d)
  const day = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() + (6 - day))
  return dayKey(dt)
}
function mondayOf(d) {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7))
  return dt
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
const GREEN_BG = 'rgba(34,197,94,.14)'
const AMBER = '#f59e0b'
const AMBER_BG = 'rgba(245,158,11,.14)'

const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 14 }
const h2 = { fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', marginBottom: 2 }
const sub = { fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }
const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontVariantNumeric: 'tabular-nums' }
const field = { background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }
const btn = { background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 8px', color: 'var(--text)', fontSize: 12, cursor: 'pointer' }

function daysLeft(iso) {
  const t = new Date(iso); t.setHours(0, 0, 0, 0)
  const n = new Date(); n.setHours(0, 0, 0, 0)
  return Math.round((t - n) / 86400000)
}

export default function Schedule() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.schedule) || null
  const isMobile = useIsMobile()
  const todayKey = dayKey(new Date())
  const [sel, setSel] = useState(todayKey)

  // ── 스케줄 저장소 ──
  const [dayLog, saveDayLog] = useJsonStorage('hy_sched_day', EMPTY)
  const [week, saveWeek] = useJsonStorage('hy_sched_week', EMPTY)
  const [done, saveDone] = useJsonStorage('hy_sched_done', EMPTY)
  const [stamp, setStamp] = useLocalStorage('hy_sched_stamp', '')
  const [syncMsg, setSyncMsg] = useState('')

  // ── 칼로리 저장소 (칼로리 탭과 동일 키) ──
  const [calLog, saveCalLog] = useJsonStorage('hy_cal_log', EMPTY)
  const [customFoods] = useJsonStorage('hy_cal_ai_foods', EMPTY_LIST)
  const [goalStr] = useLocalStorage('hy_cal_goal', '3100')
  const [proteinGoalStr] = useLocalStorage('hy_cal_protein_goal', '172')
  const [, setCalStamp] = useLocalStorage('hy_cal_stamp', '')
  const goal = Math.max(0, Number(goalStr) || 0)
  const pGoal = Math.max(0, Number(proteinGoalStr) || 0)
  const [query, setQuery] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')

  // ── 동기화 (스케줄) ──
  const bundle = useMemo(() => ({ dayLog, week, done }), [dayLog, week, done])
  const skipPush = useRef(true)
  useEffect(() => {
    ;(async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull(SYNC_KEY)
        if (remote && newer(remote.updatedAt, stamp)) {
          skipPush.current = true
          if (remote.value?.dayLog) saveDayLog(remote.value.dayLog)
          if (remote.value?.week) saveWeek(remote.value.week)
          if (remote.value?.done) saveDone(remote.value.done)
          setStamp(remote.updatedAt)
          setSyncMsg(`${clock(remote.updatedAt)} 불러옴`)
        }
      } catch (e) {
        setSyncMsg(e.message || '불러오기 실패')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (skipPush.current) {
      skipPush.current = false
      return
    }
    if (!sync.isConfigured() || !sync.isLoggedIn()) return
    const t = setTimeout(async () => {
      try {
        const now = new Date().toISOString()
        await sync.push(SYNC_KEY, bundle, now)
        setStamp(now)
        setSyncMsg(`${clock(now)} 저장됨`)
      } catch (e) {
        setSyncMsg(e.message || '저장 실패')
      }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle])

  // ── 동기화 (칼로리 — 여기서 고친 것도 칼로리 탭과 같은 키로 올린다) ──
  const calTouched = useRef(false)
  useEffect(() => {
    if (!calTouched.current) return
    if (!sync.isConfigured() || !sync.isLoggedIn()) return
    const t = setTimeout(async () => {
      try {
        const now = new Date().toISOString()
        await sync.push('calories', { log: calLog, goal: goalStr, proteinGoal: proteinGoalStr, aiFoods: customFoods }, now)
        setCalStamp(now)
      } catch {
        /* 칼로리 탭에서 다시 올라간다 */
      }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calLog])

  if (!data) {
    return <div style={{ color: 'var(--text-3)', padding: 20 }}>스케줄 데이터가 없습니다 (secure/schedule.js 잠금 해제 필요)</div>
  }

  // ── 날짜 계산 ──
  const monday = mondayOf(new Date())
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i))
  const selDate = new Date(sel + 'T00:00:00')
  const selIdx = (selDate.getDay() + 6) % 7
  const rowsFor = (idx) => data.week.rows.filter((r) => r.days[idx])
  const dayStatus = (dkey, idx) => {
    const rows = rowsFor(idx)
    const checks = dayLog[dkey] || EMPTY
    const n = rows.filter((r) => checks[r.k]).length
    return { n, total: rows.length, kept: rows.length > 0 && n === rows.length, some: n > 0 }
  }
  const calSum = (dkey) => {
    const items = calLog[dkey] || EMPTY_LIST
    return {
      kcal: items.reduce((s, it) => s + it.kcal * it.qty, 0),
      protein: items.reduce((s, it) => s + (it.protein || 0) * it.qty, 0),
    }
  }
  const toggleDay = (dkey, k) => {
    if (dkey > todayKey) return
    const e = dayLog[dkey] || EMPTY
    saveDayLog({ ...dayLog, [dkey]: { ...e, [k]: !e[k] } })
  }

  // ── 칼로리 조작 (칼로리 탭 addFood 와 같은 규칙: 같은 음식은 수량 +1) ──
  const items = calLog[sel] || EMPTY_LIST
  const total = calSum(sel)
  const updateSel = (list) => {
    calTouched.current = true
    saveCalLog({ ...calLog, [sel]: list })
  }
  const addFood = (food) => {
    if (!food) return
    const at = items.findIndex((it) => it.name === food.n && it.kcal === food.k)
    const next = at >= 0
      ? items.map((it, i) => (i === at ? { ...it, qty: roundQty(it.qty + 1) } : it))
      : [...items, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: food.n, unit: food.u, kcal: food.k, protein: food.p || 0, qty: 1 }]
    updateSel(next)
    setQuery('')
    setAiError('')
  }
  const setQty = (id, delta) => updateSel(items.map((it) => (it.id === id ? { ...it, qty: roundQty(it.qty + delta) } : it)).filter((it) => it.qty > 0))
  const removeItem = (id) => updateSel(items.filter((it) => it.id !== id))
  const matches = query.trim() ? searchFoods(query, 6, customFoods) : []
  const askAI = async () => {
    const q = query.trim()
    if (!q || aiBusy) return
    setAiBusy(true)
    setAiError('')
    try {
      const food = await lookupFood(q)
      addFood(food)
    } catch (e) {
      setAiError(e.message || 'AI 검색 실패')
    } finally {
      setAiBusy(false)
    }
  }

  // ── 주간 체크 ──
  const wk = weekKey(new Date())
  const cur = week[wk] || EMPTY
  const setCount = (k, v) => saveWeek({ ...week, [wk]: { ...cur, [k]: Math.max(0, v) } })
  const doneCount = data.quarters.reduce((a, q) => a + q.items.filter((it) => done[it.k]).length, 0)
  const totalCount = data.quarters.reduce((a, q) => a + q.items.length, 0)
  const selRows = rowsFor(selIdx)
  const selStatus = dayStatus(sel, selIdx)

  return (
    <div style={{ maxWidth: 1080 }}>
      {/* ── 이번 주 한 줄 ── */}
      <div style={{ ...card, padding: isMobile ? 12 : 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={h2}>이번 주 <span style={{ ...mono, fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginLeft: 6 }}>{dayKey(monday)} ~ {dayKey(weekDays[6])}</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: GREEN, verticalAlign: -1, marginRight: 4 }} />다 지킴
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: AMBER, verticalAlign: -1, margin: '0 4px 0 10px' }} />일부
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: GREEN, verticalAlign: 0, margin: '0 4px 0 10px' }} />칼로리 목표 달성
            {syncMsg && <span style={{ marginLeft: 10 }}>· {syncMsg}</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 4 : 8 }}>
          {weekDays.map((d, i) => {
            const dkey = dayKey(d)
            const st = dayStatus(dkey, i)
            const cs = calSum(dkey)
            const future = dkey > todayKey
            const isSel = dkey === sel
            const bg = future ? 'transparent' : st.kept ? GREEN_BG : st.some ? AMBER_BG : 'var(--surface2)'
            const border = isSel ? 'var(--accent)' : st.kept ? GREEN : st.some ? AMBER : 'var(--line)'
            return (
              <div
                key={dkey}
                onClick={() => setSel(dkey)}
                style={{ borderRadius: 12, padding: isMobile ? '8px 4px' : '12px 10px', background: bg, border: `1.5px solid ${border}`, cursor: 'pointer', opacity: future ? 0.55 : 1, textAlign: 'center', minHeight: isMobile ? 64 : 84 }}
              >
                <div style={{ fontSize: 11, color: dkey === todayKey ? 'var(--accent)' : 'var(--text-3)', fontWeight: 700 }}>{WEEKDAYS[i]}{dkey === todayKey ? ' · 오늘' : ''}</div>
                <div style={{ ...mono, fontSize: isMobile ? 15 : 20, fontWeight: 700, marginTop: 2 }}>{d.getDate()}</div>
                <div style={{ ...mono, fontSize: 10, color: st.kept ? GREEN : st.some ? AMBER : 'var(--text-3)', marginTop: 2 }}>{future ? `${st.total}개` : `${st.n}/${st.total}`}</div>
                {!isMobile && (
                  <div style={{ ...mono, fontSize: 10, color: 'var(--text-3)', marginTop: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                    {cs.kcal > 0 && <span style={{ width: 6, height: 6, borderRadius: 3, background: goal > 0 && cs.kcal >= goal ? GREEN : 'var(--line)' }} />}
                    {cs.kcal > 0 ? `${num(cs.kcal)}` : '·'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 두 열: 체크리스트 / 칼로리 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={h2}>{sel === todayKey ? '오늘 할 일' : `${sel} 할 일`} <span style={{ ...mono, fontSize: 12, fontWeight: 500, color: selStatus.kept ? GREEN : 'var(--text-3)', marginLeft: 6 }}>{selStatus.n}/{selStatus.total}</span></div>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{WEEKDAYS[selIdx]}요일 루틴</span>
          </div>
          <div style={sub}>다 체크하면 위 달력이 초록이 된다. 몸 상태·매매 세부는 몸 탭과 투자 일지에.</div>
          {selRows.map((r) => {
            const on = !!(dayLog[sel] || EMPTY)[r.k]
            const future = sel > todayKey
            return (
              <div key={r.k} onClick={() => toggleDay(sel, r.k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: '1px solid var(--line)', cursor: future ? 'default' : 'pointer', opacity: future ? 0.5 : 1 }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, flex: 'none', border: on ? 'none' : '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'transparent', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{on ? '✓' : ''}</span>
                <span style={{ ...mono, fontSize: 11, color: 'var(--text-3)', width: 40, flex: 'none' }}>{r.slot}</span>
                <span style={{ fontSize: 13, flex: 1, color: on ? 'var(--text-3)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none' }} title={r.label}>{r.short}</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', flex: 'none' }}>{r.tag}</span>
              </div>
            )
          })}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={h2}>칼로리 <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginLeft: 6 }}>칼로리 탭과 같은 기록</span></div>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>목표 <b style={mono}>{num(goal)}</b> kcal · 단백질 <b style={mono}>{pGoal}</b>g</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0' }}>
            {[
              ['섭취', total.kcal, goal, 'kcal'],
              ['단백질', total.protein, pGoal, 'g'],
            ].map(([lbl, v, g, unit]) => {
              const ok = g > 0 && v >= g
              const pct = g > 0 ? Math.min(100, Math.round((v / g) * 100)) : 0
              return (
                <div key={lbl} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px' }}>
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
                  <div key={f.n + f.k} onClick={() => addFood(f)} style={{ padding: '8px 10px', cursor: 'pointer', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span>{f.n} <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{f.u}</span></span>
                    <span style={{ ...mono, color: 'var(--text-3)', fontSize: 11 }}>{num(f.k)} kcal · P{f.p ?? 0}</span>
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
            {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>아직 기록 없음</div>}
            {items.map((it) => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{it.unit || ''} · {num(it.kcal)} kcal · {it.protein ?? 0}g</div>
                </div>
                <button onClick={() => setQty(it.id, -0.5)} style={btn}>−</button>
                <span style={{ ...mono, fontSize: 13, width: 30, textAlign: 'center' }}>{it.qty}</span>
                <button onClick={() => setQty(it.id, 0.5)} style={btn}>+</button>
                <span style={{ ...mono, fontSize: 13, fontWeight: 700, width: 48, textAlign: 'right' }}>{num(it.kcal * it.qty)}</span>
                <button onClick={() => removeItem(it.id)} style={{ ...btn, color: 'var(--text-3)' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 주간 체크 ── */}
      <div style={card}>
        <div style={h2}>이번 주 횟수 · {wk} 주</div>
        <div style={sub}>숫자를 누르면 올라간다. 일요일 15분 리뷰 때 채운다. 아래 두 개는 낮을수록 좋다.</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 8 }}>
          {data.weekly.map((w) => {
            const v = cur[w.k] || 0
            const ok = w.lower ? v <= w.goal : v >= w.goal
            return (
              <div key={w.k} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', border: `1px solid ${ok ? GREEN : 'var(--line)'}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{w.label} <span style={mono}>/{w.goal}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span onClick={() => setCount(w.k, v - 1)} style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, userSelect: 'none' }}>−</span>
                  <span onClick={() => setCount(w.k, v + 1)} style={{ ...mono, fontSize: 22, fontWeight: 700, cursor: 'pointer', color: ok ? GREEN : 'var(--text)', userSelect: 'none' }}>{v}</span>
                  <span onClick={() => setCount(w.k, v + 1)} style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, userSelect: 'none' }}>+</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── D-day + 목표 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {data.dday.map((d) => (
          <div key={d.k} style={{ ...card, marginBottom: 0, padding: 14 }} title={d.note}>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.label}</div>
            <div style={{ ...mono, fontSize: 22, fontWeight: 700, marginTop: 2 }}>D-{daysLeft(d.date)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{d.date}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={h2}>2027년 말 목표 · 측정 가능한 것만</div>
        <div style={sub}>지금 → 목표. 부채·INSEAD 숫자는 인생플랜 페이지가 원본.</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
          {data.goals.map((g) => (
            <div key={g.k} style={{ display: 'flex', gap: 10, background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px' }}>
              <span style={{ width: 4, borderRadius: 2, background: COLOR[g.color] || 'var(--accent)', flex: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{g.title} <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginLeft: 6 }}>{g.now}</span></div>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>{g.target}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{g.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 분기 로드맵 ── */}
      <div style={card}>
        <div style={h2}>분기 로드맵 <span style={{ ...mono, fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginLeft: 8 }}>{doneCount}/{totalCount}</span></div>
        <div style={sub}>끝낸 것은 눌러서 체크. 분기가 지나도 안 된 항목은 지우지 말고 다음 분기로 옮겨 적는다.</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          {data.quarters.map((q) => {
            const n = q.items.filter((it) => done[it.k]).length
            return (
              <div key={q.k} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{q.title}</div>
                  <span style={{ ...mono, fontSize: 11, color: n === q.items.length ? GREEN : 'var(--text-3)' }}>{n}/{q.items.length}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{q.theme}</div>
                {q.items.map((it) => {
                  const on = !!done[it.k]
                  return (
                    <div key={it.k} onClick={() => saveDone({ ...done, [it.k]: !on })} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', cursor: 'pointer', borderTop: '1px solid var(--line)' }}>
                      <span style={{ width: 16, height: 16, borderRadius: 5, flex: 'none', marginTop: 2, border: on ? 'none' : '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'transparent', color: 'var(--accent-text)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
                      <span style={{ fontSize: 12.5, lineHeight: 1.5, color: on ? 'var(--text-3)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none' }}>{it.label}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        시간표 원본과 주말 규칙은 secure/schedule.js. 몸 상태는 몸 탭, 매매·위반은 Hiro's Crypto 투자 일지, 부채·INSEAD 는 인생플랜.
      </div>
    </div>
  )
}
