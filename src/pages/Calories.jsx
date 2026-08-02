import { useMemo, useRef, useState } from 'react'
import { Card, CardHead, mono } from '../components/ui.jsx'
import { IconSearch } from '../components/icons.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { searchFoods } from '../data/foods.js'
import { lookupFood, getApiKey, setApiKey } from '../lib/foodAI.js'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const OVER = '#22c55e' // 목표 초과 = 초록 (벌크업 기준)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const num = (v) => (v || 0).toLocaleString('ko-KR')

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

const EMPTY_LOG = {}
const EMPTY_FOODS = []

export default function Calories() {
  const today = dayKey(new Date())
  // 날짜별로 저장하므로 자정이 지나면 오늘 목록은 자동으로 비고, 지난 기록은 달력에 남는다.
  const [log, saveLog] = useJsonStorage('hy_cal_log', EMPTY_LOG)
  // AI로 찾은 음식은 여기에 쌓여 다음부터는 호출 없이 검색된다.
  const [customFoods, saveCustomFoods] = useJsonStorage('hy_cal_ai_foods', EMPTY_FOODS)
  const [goalStr, setGoalStr] = useLocalStorage('hy_cal_goal', '3100')
  const [proteinGoalStr, setProteinGoalStr] = useLocalStorage('hy_cal_protein_goal', '172')

  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [keyOpen, setKeyOpen] = useState(false)
  const [keyDraft, setKeyDraft] = useState(getApiKey())
  const inputRef = useRef(null)

  const goal = Math.max(0, Number(goalStr) || 0)
  const pGoal = Math.max(0, Number(proteinGoalStr) || 0)
  const items = log[today] || []
  const total = items.reduce((s, it) => s + it.kcal * it.qty, 0)
  const pTotal = items.reduce((s, it) => s + (it.protein || 0) * it.qty, 0)
  const isOver = goal > 0 && total > goal
  const pOver = pGoal > 0 && pTotal >= pGoal
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0
  const pPct = pGoal > 0 ? Math.min(100, Math.round((pTotal / pGoal) * 100)) : 0

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
        ? prev.map((it, i) => (i === at ? { ...it, qty: it.qty + 1 } : it))
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
      // 다음부터는 API 호출 없이 검색되도록 저장
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
    updateToday(items.map((it) => (it.id === id ? { ...it, qty: Math.max(1, it.qty + delta) } : it)))
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
    <div style={{ flex: 1, minWidth: 190 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: over ? OVER : 'var(--text)' }}>
          {value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}> {unit}</span>
        </div>
        <span style={{ font: mono, color: 'var(--text-3)' }}>{label}</span>
      </div>
      <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            borderRadius: 99,
            background: over ? OVER : 'var(--accent)',
            transition: 'width .25s',
          }}
        />
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
      <Card style={{ marginBottom: 14 }}>
        <CardHead title="목표" caption="1일 기준 · 운동일/휴식일 구분 없음" />
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: '칼로리', unit: 'kcal', value: goalStr, set: setGoalStr, presets: [2700, 3100, 3400] },
            { label: '단백질', unit: 'g', value: proteinGoalStr, set: setProteinGoalStr, presets: [140, 160, 172] },
          ].map((f) => (
            <div key={f.label} style={{ flex: 1, minWidth: 200 }}>
              <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 7 }}>{f.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  value={f.value}
                  min={0}
                  step={f.unit === 'g' ? 5 : 50}
                  onChange={(e) => f.set(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--surface2)',
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    color: 'var(--text)',
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
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
      <Card style={{ marginBottom: 14 }}>
        <CardHead title="오늘 섭취량" caption={`${today} · ${items.length}개 항목`} />
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          {gauge('kcal', total, goal, pct, isOver, 'kcal')}
          {gauge('단백질', pTotal, pGoal, pPct, pOver, 'g')}
        </div>
      </Card>

      {/* ── 검색 + 오늘 먹은 것 ── */}
      <Card style={{ marginBottom: 14 }}>
        <CardHead title="오늘 먹은 것" caption="입력 후 Enter · 같은 음식은 수량으로 합산" />

        <div style={{ position: 'relative', marginBottom: items.length ? 14 : 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--surface2)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '12px 15px',
            }}
          >
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
              placeholder="먹은 음식 검색 · 목록에 없으면 AI가 찾아줍니다 (직접 입력: '치즈볼 250 12')"
              style={{
                flex: 1,
                border: 0,
                outline: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ ...btn, padding: '4px 8px' }}>
                ✕
              </button>
            )}
          </div>

          {/* 자동완성 */}
          {query.trim() && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 20,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                boxShadow: 'var(--shadow)',
                overflow: 'hidden',
              }}
            >
              {options.map((f, i) => (
                <div
                  key={`${f.n}-${f.k}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => addFood(f)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
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
                </div>
              ))}

              {/* AI 조회 */}
              <div
                onClick={askAI}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 15px',
                  cursor: aiBusy ? 'default' : 'pointer',
                  borderTop: options.length ? '1px solid var(--line)' : 0,
                  background: 'var(--surface2)',
                  color: 'var(--text-2)',
                  fontSize: 13,
                }}
              >
                <span style={{ font: mono, color: 'var(--accent)' }}>AI</span>
                {aiBusy ? (
                  <span>Claude에게 물어보는 중…</span>
                ) : (
                  <span>
                    <b>{query.trim()}</b> 칼로리·단백질 찾아서 추가하기
                  </span>
                )}
              </div>

              {aiError && (
                <div style={{ padding: '10px 15px', fontSize: 12, color: '#e5484d', borderTop: '1px solid var(--line)' }}>
                  {aiError}
                </div>
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
                  gap: 12,
                  padding: '11px 2px',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{it.name}</div>
                  <div style={{ font: mono, color: 'var(--text-3)', marginTop: 2 }}>
                    {it.unit} · {num(it.kcal)} kcal · 단백질 {it.protein ?? 0}g
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
                  <button onClick={() => setQty(it.id, -1)} disabled={it.qty <= 1} style={{ ...btn, padding: '5px 9px', opacity: it.qty <= 1 ? 0.4 : 1 }}>
                    −
                  </button>
                  <span style={{ font: mono, width: 30, textAlign: 'center', color: 'var(--text-2)' }}>×{it.qty}</span>
                  <button onClick={() => setQty(it.id, 1)} style={{ ...btn, padding: '5px 9px' }}>
                    +
                  </button>
                </div>

                <div style={{ width: 130, textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{num(it.kcal * it.qty)}</div>
                  <div style={{ font: mono, color: 'var(--text-3)' }}>
                    {Math.round((it.protein || 0) * it.qty)}g
                  </div>
                </div>

                <button onClick={() => removeItem(it.id)} title="삭제" style={{ ...btn, padding: '5px 9px', flex: 'none' }}>
                  삭제
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
                전체 비우기
              </button>
            </div>
          </div>
        )}

        {/* AI 설정 */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <button onClick={() => setKeyOpen((v) => !v)} style={{ ...btn, padding: '6px 10px' }}>
            AI 설정 {getApiKey() ? '· 키 저장됨' : '· 키 없음'} {keyOpen ? '▲' : '▼'}
          </button>
          {keyOpen && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{
                    flex: 1,
                    minWidth: 240,
                    background: 'var(--surface2)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    padding: '9px 12px',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button onClick={() => { setApiKey(keyDraft.trim()); setKeyOpen(false) }} style={{ ...btn, padding: '8px 12px' }}>
                  저장
                </button>
                <button onClick={() => { setApiKey(''); setKeyDraft('') }} style={{ ...btn, padding: '8px 12px' }}>
                  삭제
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
                Anthropic API 키는 <b>이 브라우저에만</b> 저장되고 서버나 저장소로는 전송되지 않습니다.
                DB에 없는 음식을 AI로 한 번 조회하면 결과가 저장돼 다음부터는 호출 없이 검색됩니다.
                {customFoods.length > 0 && ` (현재 ${customFoods.length}개 저장됨)`}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── 달력 ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {year}년 {month + 1}월
          </div>
          <button onClick={() => setMonthOffset((m) => m - 1)} style={{ ...btn, padding: '5px 10px' }}>←</button>
          <button onClick={() => setMonthOffset(0)} style={{ ...btn, padding: '5px 10px' }}>이번 달</button>
          <button onClick={() => setMonthOffset((m) => m + 1)} style={{ ...btn, padding: '5px 10px' }}>→</button>
          <div style={{ flex: 1 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: mono, color: 'var(--text-3)' }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: OVER }} />
            목표 초과 {overDays.length}일 · 기록 {loggedDays.length}일
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 8 }}>
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              style={{
                textAlign: 'center',
                font: "600 11px 'JetBrains Mono'",
                color: i === 0 ? '#e5484d' : i === 6 ? 'var(--text-2)' : 'var(--text-3)',
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ minHeight: 80 }} />
            const key = `${year}-${pad(month + 1)}-${pad(d)}`
            const { kcal, protein } = sumsOf(d)
            const over = goal > 0 && kcal > goal
            const isToday = key === today
            return (
              <div
                key={i}
                title={kcal ? `${key} · ${num(kcal)} kcal · 단백질 ${Math.round(protein)}g` : key}
                style={{
                  minHeight: 80,
                  borderRadius: 13,
                  border: '1px solid',
                  borderColor: over ? OVER : 'var(--line)',
                  background: over ? `${OVER}1f` : 'var(--surface)',
                  padding: '8px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  ...(isToday ? { boxShadow: '0 0 0 1px var(--accent)', borderColor: 'var(--accent)' } : null),
                }}
              >
                <span
                  style={{
                    font: "600 12px 'JetBrains Mono'",
                    color: isToday ? 'var(--accent)' : 'var(--text-2)',
                    alignSelf: 'flex-start',
                  }}
                >
                  {d}
                </span>
                {kcal > 0 && (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 700, color: over ? OVER : 'var(--text)' }}>{num(kcal)}</span>
                    <span style={{ font: "500 9px 'JetBrains Mono'", color: 'var(--text-3)' }}>
                      단백질 {Math.round(protein)}g
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.6 }}>
        ※ 기록은 날짜별로 저장돼 <b>자정이 지나면 오늘 목록이 자동으로 비워집니다.</b> 지난 날짜의 기록은 달력에 그대로 남습니다.
        달력의 초록색은 그날 섭취량이 <b>현재 목표({num(goal)} kcal)</b>를 넘긴 날입니다 — 목표를 바꾸면 과거 날짜의 색도 새 목표 기준으로 다시 계산됩니다.
      </div>
    </div>
  )
}
