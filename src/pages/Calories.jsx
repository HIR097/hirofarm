import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardHead, mono } from '../components/ui.jsx'
import { IconSearch } from '../components/icons.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { searchFoods } from '../data/foods.js'
import { lookupFood, getApiKey, setApiKey } from '../lib/foodAI.js'
import * as sync from '../lib/sync.js'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const OVER = '#22c55e' // 목표 초과 = 초록 (벌크업 기준)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const SYNC_KEY = 'calories'

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// 수량이 소수(1.2인분 등)가 되면 kcal·단백질에 소수점이 붙으므로 표시 단계에서 정수로 맞춘다.
const num = (v) => Math.round(v || 0).toLocaleString('ko-KR')

// ── 수량(인분) ── 0.1 단위까지 허용한다. 0.1+0.2 같은 부동소수 오차를 막으려고 소수 둘째 자리에서 끊는다.
const QTY_MIN = 0.1
const QTY_MAX = 99
const roundQty = (v) => Math.min(QTY_MAX, Math.max(QTY_MIN, Math.round(v * 100) / 100))
const fmtQty = (v) => String(Math.round(v * 100) / 100) // 1 → "1", 1.2 → "1.2"
const parseQty = (s) => {
  const n = Number(String(s).trim())
  return Number.isFinite(n) && n > 0 ? roundQty(n) : null
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

// "치즈볼 250" 또는 "치즈볼 250 20"(칼로리·단백질)처럼 숫자를 붙이면 직접 추가된다.
function parseCustom(query) {
  const m = query.trim().match(/^(.+?)\s+(\d{1,5})(?:\s+(\d{1,3}))?$/)
  if (!m) return null
  return { n: m[1].trim(), k: Number(m[2]), p: Number(m[3] || 0), u: '직접 입력' }
}

function useJsonStorage(key, fallback) {
  const [raw, setRaw] = useLocalStorage(key, JSON.stringify(fallback))
  const value = useMemo(() => {
    try {
      const parsed = JSON.parse(raw)
      return parsed ?? fallback
    } catch {
      return fallback
    }
  }, [raw, fallback])
  return [value, (next) => setRaw(JSON.stringify(next))]
}

const btn = {
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--text-2)',
  borderRadius: 9,
  cursor: 'pointer',
  font: mono,
  lineHeight: 1,
}
const field = {
  background: 'var(--surface2)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '9px 12px',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

const EMPTY_LOG = {}
const EMPTY_FOODS = []

/** 수량 입력칸. 평소엔 글자처럼 보이다가 누르면 입력칸이 되고, 1.2 같은 소수를 직접 칠 수 있다. */
function QtyBox({ value, onCommit }) {
  const [draft, setDraft] = useState(null) // null이면 표시 모드(부모 값 사용)
  const [focus, setFocus] = useState(false)
  const commit = () => {
    const next = parseQty(draft)
    setDraft(null)
    setFocus(false)
    if (next != null && next !== value) onCommit(next)
  }
  return (
    <input
      value={draft ?? fmtQty(value)}
      inputMode="decimal"
      aria-label="수량"
      title="직접 입력할 수 있습니다 (예: 1.2)"
      onFocus={(e) => {
        setDraft(fmtQty(value))
        setFocus(true)
        e.target.select()
      }}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setDraft(null)
          setFocus(false)
          e.currentTarget.blur()
        }
      }}
      style={{
        font: mono,
        width: 44,
        textAlign: 'center',
        color: 'var(--text-2)',
        background: focus ? 'var(--surface2)' : 'transparent',
        border: `1px solid ${focus ? 'var(--line)' : 'transparent'}`,
        borderRadius: 7,
        padding: '5px 2px',
        outline: 'none',
        cursor: 'text',
      }}
    />
  )
}

/** 루틴을 지키는 대표 음식 10 — 내용은 secure/body.js(mealGuide)에서, 누르면 요리법이 펼쳐진다. */
export function MealGuide({ isMobile }) {
  const [openIdx, setOpenIdx] = useState(null)
  const meals = (typeof window !== 'undefined' && window.__HY_DATA__?.body?.mealGuide) || []
  if (!meals.length) return null
  return (
    <Card style={{ marginBottom: 14, padding: isMobile ? 16 : 22 }}>
      <CardHead title="루틴 음식" caption={isMobile ? '누르면 요리법' : '전부 조리 10분 이하 · 누르면 요리법 · 검색창에서 이름으로 기록'} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 22px' }}>
        {meals.map((m, i) => {
          const open = openIdx === i
          return (
            <div key={m.n} style={{ borderBottom: '1px solid var(--line)' }}>
              <div
                onClick={() => setOpenIdx(open ? null : i)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', cursor: 'pointer' }}
              >
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{m.n}</span>
                <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)', flex: 'none' }}>
                  {m.k}kcal · P{m.p}
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: 11, flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▼</span>
              </div>
              {open && (
                <div style={{ padding: '0 2px 12px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-2)' }}>
                  <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{m.u}</span>
                  <div style={{ marginTop: 4 }}>{m.recipe}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/** 평일 현실 식단 — 회사 일과 기준 5끼 시간표. 내용은 secure/body.js(mealPlan)에서.
 *  행을 누르면 그 슬롯의 다음 대안으로 넘어가고, 🎲 는 슬롯마다 하나씩 랜덤으로 뽑는다. */
export function MealPlan({ isMobile }) {
  const plan = (typeof window !== 'undefined' && window.__HY_DATA__?.body?.mealPlan) || null
  const [picks, setPicks] = useState(() => (plan ? plan.slots.map(() => 0) : []))
  if (!plan) return null
  const shuffle = () => setPicks(plan.slots.map((s) => Math.floor(Math.random() * s.options.length)))
  const next = (i) => setPicks(picks.map((v, j) => (j === i ? (v + 1) % plan.slots[i].options.length : v)))
  const total = plan.slots.reduce(
    (a, s, i) => {
      const o = s.options[picks[i] % s.options.length]
      return { k: a.k + o.k, p: a.p + o.p }
    },
    { k: 0, p: 0 },
  )
  return (
    <Card style={{ marginBottom: 14, padding: isMobile ? 16 : 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>평일 현실 식단</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isMobile && <span style={{ font: mono, color: 'var(--text-3)' }}>행을 누르면 다른 대안</span>}
          <button onClick={shuffle} style={{ ...btn, padding: '7px 13px', fontSize: 13 }} title="슬롯마다 하나씩 랜덤으로 뽑기">
            🎲 랜덤
          </button>
        </div>
      </div>
      {plan.slots.map((s, i) => {
        const o = s.options[picks[i] % s.options.length]
        return (
          <div
            key={i}
            onClick={() => next(i)}
            title="누르면 다음 대안"
            style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 2px', borderTop: '1px solid var(--line)', cursor: 'pointer' }}
          >
            <span style={{ font: "600 12px 'JetBrains Mono'", width: isMobile ? 78 : 96, flex: 'none' }}>
              {s.t}
              <br />
              <span style={{ fontWeight: 500, fontSize: 10, color: 'var(--text-3)' }}>{s.place}</span>
            </span>
            <span style={{ flex: 1, fontSize: isMobile ? 13 : 13.5, fontWeight: 600, lineHeight: 1.45 }}>
              {o.n}
              {s.options.length > 1 && (
                <span style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)', marginLeft: 6 }}>
                  {(picks[i] % s.options.length) + 1}/{s.options.length}
                </span>
              )}
            </span>
            <span style={{ font: "500 12px 'JetBrains Mono'", color: 'var(--text-3)', flex: 'none' }}>
              {o.k} · P{o.p}
            </span>
          </div>
        )
      })}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 2px 0', borderTop: '1px solid var(--line)', alignItems: 'baseline' }}>
        <span style={{ font: mono, color: 'var(--text-3)' }}>합계</span>
        <span style={{ fontSize: 18, fontWeight: 700 }}>
          {total.k.toLocaleString()} <span style={{ fontSize: 12, color: 'var(--text-3)' }}>kcal</span>
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: total.p >= 170 ? OVER : 'var(--text)' }}>
          P{total.p}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.55 }}>{plan.note}</div>
    </Card>
  )
}

export default function Calories() {
  const today = dayKey(new Date())
  const isMobile = useIsMobile()
  // 날짜별로 저장하므로 자정이 지나면 오늘 목록은 자동으로 비고, 지난 기록은 달력에 남는다.
  const [log, saveLog] = useJsonStorage('hy_cal_log', EMPTY_LOG)
  // AI로 찾은 음식은 여기에 쌓여 다음부터는 호출 없이 검색된다.
  const [customFoods, saveCustomFoods] = useJsonStorage('hy_cal_ai_foods', EMPTY_FOODS)
  const [goalStr, setGoalStr] = useLocalStorage('hy_cal_goal', '3100')
  const [proteinGoalStr, setProteinGoalStr] = useLocalStorage('hy_cal_protein_goal', '172')
  const [stamp, setStamp] = useLocalStorage('hy_cal_stamp', '')

  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [panel, setPanel] = useState(null) // 'sync' | 'ai' | null
  const [keyDraft, setKeyDraft] = useState(getApiKey())
  const [sb, setSb] = useState(() => ({ ...sync.getConfig(), email: sync.currentEmail(), pw: '' }))
  const [syncMsg, setSyncMsg] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [loggedIn, setLoggedIn] = useState(sync.isLoggedIn())
  const inputRef = useRef(null)
  const skipPush = useRef(true)

  const goal = Math.max(0, Number(goalStr) || 0)
  const pGoal = Math.max(0, Number(proteinGoalStr) || 0)
  const items = log[today] || []
  const total = items.reduce((s, it) => s + it.kcal * it.qty, 0)
  const pTotal = items.reduce((s, it) => s + (it.protein || 0) * it.qty, 0)
  const isOver = goal > 0 && total > goal
  const pOver = pGoal > 0 && pTotal >= pGoal
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0
  const pPct = pGoal > 0 ? Math.min(100, Math.round((pTotal / pGoal) * 100)) : 0

  // ── 기기 간 동기화 ──
  const bundle = useMemo(
    () => ({ log, goal: goalStr, proteinGoal: proteinGoalStr, aiFoods: customFoods }),
    [log, goalStr, proteinGoalStr, customFoods],
  )

  const applyRemote = (v) => {
    if (!v) return
    skipPush.current = true
    if (v.log) saveLog(v.log)
    if (v.goal != null) setGoalStr(String(v.goal))
    if (v.proteinGoal != null) setProteinGoalStr(String(v.proteinGoal))
    if (v.aiFoods) saveCustomFoods(v.aiFoods)
  }

  // 최신 쪽이 이긴다 — 원격이 더 새로우면 받아오고, 아니면 내 것을 올린다.
  const runSync = async () => {
    if (!sync.isConfigured() || !sync.isLoggedIn()) return
    setSyncBusy(true)
    try {
      const remote = await sync.pull(SYNC_KEY)
      if (remote && newer(remote.updatedAt, stamp)) {
        applyRemote(remote.value)
        setStamp(remote.updatedAt)
        setSyncMsg(`${clock(remote.updatedAt)} 불러옴`)
      } else {
        const now = new Date().toISOString()
        await sync.push(SYNC_KEY, bundle, now)
        setStamp(now)
        setSyncMsg(`${clock(now)} 저장됨`)
      }
    } catch (e) {
      setSyncMsg(e.message || '동기화 실패')
    } finally {
      setSyncBusy(false)
    }
  }

  // 페이지에 들어올 때 한 번 맞춘다
  useEffect(() => {
    runSync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 기록이 바뀌면 잠시 뒤 올린다
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

  const custom = parseCustom(query)
  const matches = searchFoods(query, 8, customFoods)
  const options = custom ? [custom, ...matches.filter((f) => f.n !== custom.n)] : matches

  // 같은 음식을 다시 입력하면 새 줄이 아니라 수량이 올라간다.
  const addFood = (food) => {
    if (!food) return
    const prev = log[today] || []
    const at = prev.findIndex((it) => it.name === food.n && it.kcal === food.k)
    const next =
      at >= 0
        ? prev.map((it, i) => (i === at ? { ...it, qty: roundQty(it.qty + 1) } : it))
        : [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: food.n,
              unit: food.u,
              kcal: food.k,
              protein: food.p || 0,
              qty: 1,
            },
          ]
    saveLog({ ...log, [today]: next })
    setQuery('')
    setCursor(0)
    setAiError('')
    inputRef.current?.focus()
  }

  const askAI = async () => {
    const q = query.trim()
    if (!q || aiBusy) return
    setAiBusy(true)
    setAiError('')
    try {
      const food = await lookupFood(q)
      saveCustomFoods([food, ...customFoods.filter((f) => f.n !== food.n)].slice(0, 200))
      addFood(food)
    } catch (e) {
      setAiError(e.message || 'AI 조회에 실패했습니다.')
    } finally {
      setAiBusy(false)
    }
  }

  const updateToday = (next) => {
    const copy = { ...log }
    if (next.length) copy[today] = next
    else delete copy[today]
    saveLog(copy)
  }
  const setQty = (id, delta) =>
    updateToday(items.map((it) => (it.id === id ? { ...it, qty: roundQty(it.qty + delta) } : it)))
  const setQtyTo = (id, qty) => updateToday(items.map((it) => (it.id === id ? { ...it, qty } : it)))
  const removeItem = (id) => updateToday(items.filter((it) => it.id !== id))

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (options.length) addFood(options[cursor] || options[0])
      else askAI()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  // ── 달력 ──
  const base = new Date()
  const view = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1)
  const year = view.getFullYear()
  const month = view.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(view.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const sumsOf = (day) => {
    const list = log[`${year}-${pad(month + 1)}-${pad(day)}`] || []
    return {
      kcal: list.reduce((s, it) => s + it.kcal * it.qty, 0),
      protein: list.reduce((s, it) => s + (it.protein || 0) * it.qty, 0),
    }
  }
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const loggedDays = monthDays.filter((d) => sumsOf(d).kcal > 0)
  const overDays = goal > 0 ? loggedDays.filter((d) => sumsOf(d).kcal > goal) : []

  const gauge = (label, value, goalValue, percent, over, unit) => (
    <div style={{ flex: 1, minWidth: isMobile ? 140 : 190 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: isMobile ? 26 : 30, fontWeight: 700, letterSpacing: '-.02em', color: over ? OVER : 'var(--text)' }}>
          {value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}> {unit}</span>
        </div>
        <span style={{ font: mono, color: 'var(--text-3)' }}>{label}</span>
      </div>
      <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
        <div style={{ height: '100%', width: `${percent}%`, borderRadius: 99, background: over ? OVER : 'var(--accent)', transition: 'width .25s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, font: mono, color: 'var(--text-3)' }}>
        <span>{goalValue > 0 ? `${percent}%` : '목표 미설정'}</span>
        <span>
          {goalValue > 0
            ? over
              ? `+${num(Math.round(value - goalValue))} 초과`
              : `${num(Math.round(goalValue - value))} 남음`
            : '—'}
        </span>
      </div>
    </div>
  )

  return (
    <div style={fade}>
      {/* ── 목표 설정 ── */}
      <Card style={{ marginBottom: 14, padding: isMobile ? 16 : 22 }}>
        <CardHead title="목표" caption={isMobile ? '1일 기준' : '1일 기준 · 운동일/휴식일 구분 없음'} />
        <div style={{ display: 'flex', gap: isMobile ? 14 : 20, flexWrap: 'wrap' }}>
          {[
            { label: '칼로리', unit: 'kcal', value: goalStr, set: setGoalStr, presets: [2700, 3100, 3400] },
            { label: '단백질', unit: 'g', value: proteinGoalStr, set: setProteinGoalStr, presets: [140, 160, 172] },
          ].map((f) => (
            <div key={f.label} style={{ flex: 1, minWidth: isMobile ? 130 : 200 }}>
              <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 7 }}>{f.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={f.value}
                  min={0}
                  step={f.unit === 'g' ? 5 : 50}
                  onChange={(e) => f.set(e.target.value)}
                  style={{ ...field, width: '100%', padding: '10px 12px', fontSize: isMobile ? 17 : 20, fontWeight: 700 }}
                />
                <span style={{ font: mono, color: 'var(--text-3)', flex: 'none' }}>{f.unit}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {f.presets.map((g) => (
                  <button key={g} onClick={() => f.set(String(g))} style={{ ...btn, padding: '6px 9px' }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 오늘 요약 ── */}
      <Card style={{ marginBottom: 14, padding: isMobile ? 16 : 22 }}>
        <CardHead title="오늘 섭취량" caption={isMobile ? `${items.length}개 항목` : `${today} · ${items.length}개 항목`} />
        <div style={{ display: 'flex', gap: isMobile ? 16 : 26, flexWrap: 'wrap' }}>
          {gauge('kcal', total, goal, pct, isOver, 'kcal')}
          {gauge('단백질', pTotal, pGoal, pPct, pOver, 'g')}
        </div>
      </Card>

      {/* ── 검색 + 오늘 먹은 것 ── */}
      <Card style={{ marginBottom: 14, padding: isMobile ? 16 : 22 }}>
        <CardHead title="오늘 먹은 것" caption={isMobile ? '' : '입력 후 Enter · 같은 음식은 수량으로 합산'} />

        <div style={{ position: 'relative', marginBottom: items.length ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 15px' }}>
            <IconSearch />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setCursor(0)
                setAiError('')
              }}
              onKeyDown={onKeyDown}
              placeholder={isMobile ? '먹은 음식 검색' : "먹은 음식 검색 · 목록에 없으면 AI가 찾아줍니다 (직접 입력: '치즈볼 250 12')"}
              style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', minWidth: 0 }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ ...btn, padding: '4px 8px' }}>
                ✕
              </button>
            )}
          </div>

          {/* 자동완성 */}
          {query.trim() && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
              {options.map((f, i) => (
                <div
                  key={`${f.n}-${f.k}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => addFood(f)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    padding: '11px 15px',
                    cursor: 'pointer',
                    background: i === cursor ? 'var(--surface2)' : 'transparent',
                    borderTop: i === 0 ? 0 : '1px solid var(--line)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{f.n}</span>
                  <span style={{ font: mono, color: 'var(--text-3)' }}>{f.u}</span>
                  {f.ai && <span style={{ font: mono, color: 'var(--accent)' }}>AI</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{ font: mono, color: 'var(--text-2)' }}>
                    {num(f.k)} kcal · 단백질 {f.p ?? 0}g
                  </span>
                  {/* AI로 저장된 음식은 여기서 바로 지울 수 있다 — 검색 목록에서 사라진다 (기존 기록은 유지) */}
                  {f.ai && (
                    <button
                      title="검색 목록에서 삭제"
                      onClick={(e) => {
                        e.stopPropagation()
                        saveCustomFoods(customFoods.filter((cf) => !(cf.n === f.n && cf.k === f.k)))
                      }}
                      style={{ ...btn, padding: '4px 9px', fontSize: 13, color: 'var(--text-3)', flex: 'none' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <div
                onClick={askAI}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 15px', cursor: aiBusy ? 'default' : 'pointer', borderTop: options.length ? '1px solid var(--line)' : 0, background: 'var(--surface2)', color: 'var(--text-2)', fontSize: 13 }}
              >
                <span style={{ font: mono, color: 'var(--accent)' }}>AI</span>
                {aiBusy ? <span>Claude에게 물어보는 중…</span> : <span><b>{query.trim()}</b> 칼로리·단백질 찾아서 추가하기</span>}
              </div>

              {aiError && (
                <div style={{ padding: '10px 15px', fontSize: 12, color: '#e5484d', borderTop: '1px solid var(--line)' }}>{aiError}</div>
              )}
            </div>
          )}
        </div>

        {/* 항목 리스트 */}
        {items.length === 0 ? (
          <div style={{ padding: '26px 0 10px', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
            아직 기록이 없습니다. 위 검색창에 오늘 먹은 것을 입력해 주세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((it, i) => (
              <div
                key={it.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 8 : 12,
                  padding: '11px 2px',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                  <div style={{ font: mono, color: 'var(--text-3)', marginTop: 2 }}>
                    {isMobile ? '' : `${it.unit} · `}
                    {num(it.kcal)} kcal · {it.protein ?? 0}g
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 'none' }}>
                  <button
                    onClick={() => setQty(it.id, -0.5)}
                    disabled={it.qty <= QTY_MIN}
                    title="0.5 줄이기"
                    style={{ ...btn, padding: '6px 9px', opacity: it.qty <= QTY_MIN ? 0.4 : 1 }}
                  >
                    −
                  </button>
                  <span style={{ font: mono, color: 'var(--text-3)', paddingLeft: 3 }}>×</span>
                  <QtyBox value={it.qty} onCommit={(q) => setQtyTo(it.id, q)} />
                  <button onClick={() => setQty(it.id, 0.5)} title="0.5 늘리기" style={{ ...btn, padding: '6px 9px' }}>
                    +
                  </button>
                </div>

                <div style={{ width: isMobile ? 74 : 130, textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{num(it.kcal * it.qty)}</div>
                  <div style={{ font: mono, color: 'var(--text-3)' }}>{Math.round((it.protein || 0) * it.qty)}g</div>
                </div>

                <button onClick={() => removeItem(it.id)} title="삭제" style={{ ...btn, padding: '6px 8px', flex: 'none' }}>
                  {isMobile ? '✕' : '삭제'}
                </button>
              </div>
            ))}

            {/* 합계 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, paddingTop: 13, borderTop: '2px solid var(--line)' }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>합계</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: isOver ? OVER : 'var(--text)' }}>
                  {num(total)} <span style={{ fontSize: 13, color: 'var(--text-3)' }}>kcal</span>
                </div>
                <div style={{ font: mono, color: pOver ? OVER : 'var(--text-3)' }}>단백질 {Math.round(pTotal)}g</div>
              </div>
              <button onClick={() => updateToday([])} style={{ ...btn, padding: '6px 10px', flex: 'none' }}>
                비우기
              </button>
            </div>
          </div>
        )}

        {/* ── 설정 (동기화 / AI) ── */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setPanel(panel === 'sync' ? null : 'sync')} style={{ ...btn, padding: '6px 10px' }}>
              동기화 {loggedIn ? '· 연결됨' : '· 미설정'}
            </button>
            <button onClick={() => setPanel(panel === 'ai' ? null : 'ai')} style={{ ...btn, padding: '6px 10px' }}>
              AI {getApiKey() ? '· 키 저장됨' : '· 키 없음'}
            </button>
            {loggedIn && (
              <button onClick={runSync} disabled={syncBusy} style={{ ...btn, padding: '6px 10px' }}>
                {syncBusy ? '동기화 중…' : '지금 동기화'}
              </button>
            )}
            {syncMsg && <span style={{ font: mono, color: 'var(--text-3)' }}>{syncMsg}</span>}
          </div>

          {panel === 'sync' && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={sb.url} onChange={(e) => setSb({ ...sb, url: e.target.value })} placeholder="https://xxxx.supabase.co" style={field} />
              <input value={sb.key} onChange={(e) => setSb({ ...sb, key: e.target.value })} placeholder="anon public key" style={field} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={sb.email} onChange={(e) => setSb({ ...sb, email: e.target.value })} placeholder="이메일" autoComplete="username" style={{ ...field, flex: 1, minWidth: 150 }} />
                <input type="password" value={sb.pw} onChange={(e) => setSb({ ...sb, pw: e.target.value })} placeholder="비밀번호" autoComplete="current-password" style={{ ...field, flex: 1, minWidth: 150 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    setSyncBusy(true)
                    setSyncMsg('')
                    try {
                      sync.setConfig(sb.url.trim(), sb.key.trim())
                      await sync.login(sb.email.trim(), sb.pw)
                      setLoggedIn(true)
                      setSb({ ...sb, pw: '' })
                      setSyncMsg('연결됨')
                      await runSync()
                    } catch (e) {
                      setSyncMsg(e.message || '연결 실패')
                    } finally {
                      setSyncBusy(false)
                    }
                  }}
                  style={{ ...btn, padding: '8px 12px' }}
                >
                  연결
                </button>
                <button
                  onClick={() => {
                    sync.logout()
                    setLoggedIn(false)
                    setSyncMsg('연결 해제됨')
                  }}
                  style={{ ...btn, padding: '8px 12px' }}
                >
                  연결 해제
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                한 번 연결해두면 <b>휴대폰·데스크톱 어디서 열어도 같은 기록</b>이 보입니다. 접속 정보와 로그인 세션은 이 브라우저에만
                저장되고 저장소에는 커밋되지 않습니다. 처음 한 번은 Supabase에서 <b>app_state 테이블 생성 SQL</b>을 실행해야 합니다
                (src/lib/sync.js 상단 주석에 그대로 적어뒀습니다).
              </div>
            </div>
          )}

          {panel === 'ai' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="sk-ant-..." style={{ ...field, flex: 1, minWidth: 200 }} />
                <button onClick={() => { setApiKey(keyDraft.trim()); setPanel(null) }} style={{ ...btn, padding: '8px 12px' }}>
                  저장
                </button>
                <button onClick={() => { setApiKey(''); setKeyDraft('') }} style={{ ...btn, padding: '8px 12px' }}>
                  삭제
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
                Anthropic API 키는 이 브라우저에만 저장됩니다. DB에 없는 음식을 AI로 한 번 조회하면 결과가 저장돼 다음부터는 호출 없이
                검색됩니다.{customFoods.length > 0 && ` (현재 ${customFoods.length}개 저장됨)`}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── 평일 현실 식단 (슬롯별 대안 + 랜덤) ── */}
      <MealPlan isMobile={isMobile} />

      {/* ── 루틴 음식 (secure/body.js 의 mealGuide — 누르면 요리법) ── */}
      <MealGuide isMobile={isMobile} />

      {/* ── 달력 ── */}
      <Card style={{ padding: isMobile ? 14 : 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {year}년 {month + 1}월
          </div>
          <button onClick={() => setMonthOffset((m) => m - 1)} style={{ ...btn, padding: '5px 10px' }}>←</button>
          <button onClick={() => setMonthOffset(0)} style={{ ...btn, padding: '5px 10px' }}>이번 달</button>
          <button onClick={() => setMonthOffset((m) => m + 1)} style={{ ...btn, padding: '5px 10px' }}>→</button>
          <div style={{ flex: 1 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: mono, color: 'var(--text-3)' }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: OVER }} />
            초과 {overDays.length}일 · 기록 {loggedDays.length}일
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: isMobile ? 4 : 8, marginBottom: 8 }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={{ textAlign: 'center', font: "600 11px 'JetBrains Mono'", color: i === 0 ? '#e5484d' : i === 6 ? 'var(--text-2)' : 'var(--text-3)' }}>
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: isMobile ? 4 : 8 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ minHeight: isMobile ? 54 : 80 }} />
            const key = `${year}-${pad(month + 1)}-${pad(d)}`
            const { kcal, protein } = sumsOf(d)
            const over = goal > 0 && kcal > goal
            const isToday = key === today
            return (
              <div
                key={i}
                title={kcal ? `${key} · ${num(kcal)} kcal · 단백질 ${Math.round(protein)}g` : key}
                style={{
                  minHeight: isMobile ? 54 : 80,
                  borderRadius: isMobile ? 9 : 13,
                  border: '1px solid',
                  borderColor: over ? OVER : 'var(--line)',
                  background: over ? `${OVER}1f` : 'var(--surface)',
                  padding: isMobile ? '5px 4px' : '8px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  overflow: 'hidden',
                  ...(isToday ? { boxShadow: '0 0 0 1px var(--accent)', borderColor: 'var(--accent)' } : null),
                }}
              >
                <span style={{ font: `600 ${isMobile ? 10 : 12}px 'JetBrains Mono'`, color: isToday ? 'var(--accent)' : 'var(--text-2)', alignSelf: 'flex-start' }}>
                  {d}
                </span>
                {kcal > 0 && (
                  <>
                    <span style={{ fontSize: isMobile ? 10 : 13, fontWeight: 700, color: over ? OVER : 'var(--text)' }}>{num(kcal)}</span>
                    {!isMobile && (
                      <span style={{ font: "500 9px 'JetBrains Mono'", color: 'var(--text-3)' }}>단백질 {Math.round(protein)}g</span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.6 }}>
        ※ 기록은 날짜별로 저장돼 <b>자정이 지나면 오늘 목록이 자동으로 비워집니다.</b> 지난 날짜의 기록은 달력에 그대로 남습니다.
        달력의 초록색은 그날 섭취량이 <b>현재 목표({num(goal)} kcal)</b>를 넘긴 날입니다.
      </div>
    </div>
  )
}
