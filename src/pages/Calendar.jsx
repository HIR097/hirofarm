import { useMemo, useState } from 'react'
import { Card } from '../components/ui.jsx'
import { scheduleForMonth, SCHEDULE_CATEGORIES } from '../data/fundSchedule.js'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 재무 이벤트는 급여·상환액이 그대로 드러나므로 secure/finance.js 에서 암호화해 들여온다.
const FIN = (typeof window !== 'undefined' && window.__HY_DATA__?.finance) || null

const KIND = {
  pay: { label: '급여', color: 'var(--good)' },
  repay: { label: '상환', color: '#e5484d' },
  bonus: { label: '보너스', color: 'oklch(0.62 0.16 252)' },
  goal: { label: '목표', color: 'oklch(0.60 0.16 300)' },
  life: { label: '인생', color: 'oklch(0.70 0.16 56)' },
  check: { label: '점검', color: 'var(--text-3)' },
  work: { label: '업무', color: 'var(--text-3)' },
}

const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const won = (n) => (n || 0).toLocaleString('ko-KR')

// 해당 연·월의 재무 이벤트를 day 별로 모은다.
function financeEvents(year, month) {
  if (!FIN) return {}
  const map = {}
  const push = (day, ev) => ((map[day] ||= []).push(ev))
  const last = new Date(year, month, 0).getDate()
  const clamp = (d) => Math.min(d, last)

  for (const r of FIN.recurring) {
    if (r.months && !r.months.includes(month)) continue
    push(clamp(r.day), { ...r, source: 'fin' })
  }
  for (const o of FIN.once) {
    const [y, m, d] = o.date.split('-').map(Number)
    if (y === year && m === month) push(clamp(d), { ...o, source: 'fin' })
  }
  for (const c of FIN.checks || []) {
    if (c.month === month) push(clamp(c.day), { ...c, kind: 'check', source: 'fin' })
  }
  return map
}

export default function Calendar() {
  const today = useMemo(() => new Date(), [])
  const [cur, setCur] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [showWork, setShowWork] = useState(false)
  const [sel, setSel] = useState(null) // { day, events }

  const year = cur.getFullYear()
  const month = cur.getMonth() + 1

  // 이동 범위: 이번 달 ~ finance.horizon (기본 2030-12)
  const minYM = ymOf(new Date(today.getFullYear(), today.getMonth(), 1))
  const maxYM = FIN?.horizon || '2030-12'
  const thisYM = ymOf(cur)
  const canPrev = thisYM > minYM
  const canNext = thisYM < maxYM

  const move = (delta) => {
    const n = new Date(year, month - 1 + delta, 1)
    const ym = ymOf(n)
    if (ym < minYM || ym > maxYM) return
    setCur(n)
    setSel(null)
  }

  const finMap = useMemo(() => financeEvents(year, month), [year, month])
  const workMap = useMemo(() => {
    if (!showWork) return {}
    const m = {}
    for (const it of scheduleForMonth(month)) {
      ;(m[it.day] ||= []).push({ ...it, kind: 'work', source: 'work' })
    }
    return m
  }, [month, showWork])

  const dayEvents = (d) => [...(finMap[d] || []), ...(workMap[d] || [])]

  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const isThisMonth = year === today.getFullYear() && month === today.getMonth() + 1

  const navBtn = (on) => ({
    width: 32,
    height: 32,
    borderRadius: 10,
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: on ? 'var(--text)' : 'var(--text-3)',
    cursor: on ? 'pointer' : 'default',
    fontSize: 15,
    opacity: on ? 1 : 0.45,
  })

  if (!FIN) {
    return (
      <div style={fade}>
        <Card>
          <div style={{ fontSize: 13, color: 'var(--text-2)', padding: '20px 0', textAlign: 'center' }}>
            재무 데이터를 불러오지 못했습니다. 잠금을 다시 풀어 주세요.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={fade}>
      {/* ── 상단 바 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '4px 0 14px' }}>
        <button style={navBtn(canPrev)} onClick={() => canPrev && move(-1)} aria-label="이전 달">‹</button>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em', minWidth: 132 }}>
          {year}년 {month}월
        </div>
        <button style={navBtn(canNext)} onClick={() => canNext && move(1)} aria-label="다음 달">›</button>
        {!isThisMonth && (
          <button
            onClick={() => { setCur(new Date(today.getFullYear(), today.getMonth(), 1)); setSel(null) }}
            style={{ ...navBtn(true), width: 'auto', padding: '0 13px', fontSize: 12.5, fontWeight: 600 }}
          >
            오늘
          </button>
        )}
        <label
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
            fontSize: 12.5, color: 'var(--text-2)', border: '1px solid var(--line)',
            background: 'var(--surface)', borderRadius: 999, padding: '6px 13px',
          }}
        >
          <input type="checkbox" checked={showWork} onChange={(e) => setShowWork(e.target.checked)} />
          업무 일정도 보기
        </label>
      </div>

      {/* ── 범례 ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {['pay', 'repay', 'bonus', 'goal', 'life'].map((k) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-2)' }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: KIND[k].color, display: 'inline-block' }} />
            {KIND[k].label}
          </span>
        ))}
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 7 }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: i === 0 ? '#e5484d' : i === 6 ? 'var(--text-2)' : 'var(--text-3)' }}>
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {cells.map((d, i) => {
            const evs = d ? dayEvents(d) : []
            const isToday = isThisMonth && d === today.getDate()
            const picked = sel?.day === d
            return (
              <div
                key={i}
                onClick={() => d && evs.length && setSel({ day: d, events: evs })}
                style={{
                  minHeight: 84,
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  background: d ? 'var(--surface)' : 'transparent',
                  padding: d ? '7px 8px' : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: d && evs.length ? 'pointer' : 'default',
                  ...(isToday ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : null),
                  ...(picked ? { background: 'var(--surface2)', borderColor: 'var(--text-3)' } : null),
                }}
              >
                {d && (
                  <>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? 'var(--accent)' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {d}
                    </span>
                    {evs.slice(0, 3).map((ev, j) => {
                      const color = ev.source === 'work'
                        ? SCHEDULE_CATEGORIES[ev.category]?.color || 'var(--text-3)'
                        : KIND[ev.kind]?.color || 'var(--text-3)'
                      return (
                        <div
                          key={j}
                          title={ev.title}
                          style={{
                            fontSize: 10, lineHeight: 1.3, background: 'var(--surface2)',
                            borderLeft: `2px solid ${color}`, borderRadius: 4, padding: '2px 5px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {ev.title}
                        </div>
                      )
                    })}
                    {evs.length > 3 && (
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-3)' }}>+{evs.length - 3}</span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── 클릭한 날의 할 일 ── */}
      {sel && (
        <Card style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>
              {month}월 {sel.day}일
            </div>
            <button
              onClick={() => setSel(null)}
              style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 15 }}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          {sel.events.map((ev, i) => {
            const color = ev.source === 'work'
              ? SCHEDULE_CATEGORIES[ev.category]?.color || 'var(--text-3)'
              : KIND[ev.kind]?.color || 'var(--text-3)'
            return (
              <div
                key={i}
                style={{
                  borderLeft: `3px solid ${color}`, background: 'var(--surface2)',
                  borderRadius: 10, padding: '13px 15px', marginBottom: 9,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{ev.title}</span>
                  <span style={{ fontSize: 10.5, color, fontWeight: 600 }}>
                    {ev.source === 'work' ? `업무 · ${ev.asset}` : KIND[ev.kind]?.label}
                  </span>
                  {ev.approx && <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>날짜 대략치</span>}
                  {ev.amt ? (
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {won(ev.amt)}원
                    </span>
                  ) : null}
                </div>

                {ev.action && (
                  <ol style={{ margin: '10px 0 0 17px', padding: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--text-2)' }}>
                    {ev.action.map((a, k) => (
                      <li key={k} dangerouslySetInnerHTML={{ __html: a.replace(/\*\*(.+?)\*\*/g, '<b style="color:var(--text)">$1</b>') }} />
                    ))}
                  </ol>
                )}

                {ev.source === 'work' && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                    {SCHEDULE_CATEGORIES[ev.category]?.label}
                  </div>
                )}
              </div>
            )
          })}

          {sel.events.some((e) => e.kind === 'repay') && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.75, borderLeft: '2px solid var(--line)', paddingLeft: 12, marginTop: 12 }}>
              상환 순서 —{' '}
              {FIN.order.map((o, i) => (
                <span key={i}>
                  {i > 0 && ' → '}
                  <b style={{ color: 'var(--text-2)' }}>{o.name}</b>({o.rate}%)
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.7 }}>
        이벤트가 있는 날을 누르면 그날 실제로 해야 할 일이 나옵니다 · {minYM.replace('-', '.')} ~ {maxYM.replace('-', '.')} 범위<br />
        업무 일정(펀드 연간일정)은 기본으로 꺼져 있습니다. 위 체크박스로 켤 수 있습니다.
      </div>
    </div>
  )
}
