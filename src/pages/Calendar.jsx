import { useMemo, useState } from 'react'
import { Card } from '../components/ui.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { scheduleForMonth, SCHEDULE_CATEGORIES } from '../data/fundSchedule.js'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']   // 2026-09-04 월요일 시작

// 재무 이벤트는 급여·상환액이 그대로 드러나므로 secure/finance.js 에서 암호화해 들여온다.
const FIN = (typeof window !== 'undefined' && window.__HY_DATA__?.finance) || null
// 인스타 게시 일정 — secure/insta.js
const INS = (typeof window !== 'undefined' && window.__HY_DATA__?.insta) || null

const KIND = {
  pay: { label: '급여', color: 'var(--good)' },
  repay: { label: '상환', color: '#e5484d' },
  bonus: { label: '보너스', color: 'oklch(0.62 0.16 252)' },
  goal: { label: '목표', color: 'oklch(0.60 0.16 300)' },
  holiday: { label: '연휴', color: 'oklch(0.66 0.17 6)' },
  trip: { label: '여행', color: 'oklch(0.70 0.13 195)' },
  post: { label: '게시', color: 'oklch(0.64 0.19 330)' },
  my: { label: '내 일정', color: 'oklch(0.62 0.13 150)' },
  check: { label: '점검', color: 'var(--text-3)' },
  work: { label: '업무', color: 'var(--text-3)' },
}
// 직접 추가할 때 고를 수 있는 분류
const MY_KINDS = ['my', 'trip', 'holiday', 'goal', 'check']

const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const iso = (d) => d.toLocaleDateString('sv-SE') // YYYY-MM-DD 로컬 기준
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

// 기간 일정(여행·연휴)을 이 달에 걸치는 날짜별로 펼친다.
// 하루짜리도 여기로 들어온다(from === to). 첫날·마지막날을 표시해 띠처럼 보이게 한다.
function spreadRanges(list, year, month, extra = {}) {
  const map = {}
  if (!list?.length) return map
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const first = `${year}-${mm}-01`
  const last = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
  for (const r of list) {
    const to = r.to || r.from
    if (to < first || r.from > last) continue
    const s = r.from < first ? 1 : Number(r.from.slice(8))
    const e = to > last ? lastDay : Number(to.slice(8))
    const total = (new Date(to) - new Date(r.from)) / 86400000 + 1
    for (let d = s; d <= e; d++) {
      const nth = (new Date(`${year}-${mm}-${String(d).padStart(2, '0')}`) - new Date(r.from)) / 86400000 + 1
      ;(map[d] ||= []).push({
        ...r, to, source: 'range', band: total > 1,
        head: d === s && r.from >= first,
        tail: d === e && to <= last,
        nth, total, ...extra,
      })
    }
  }
  return map
}

// 요일 반복(인스타 게시 — 수/토)을 이 달의 해당 요일마다 깐다.
function weeklyEvents(year, month) {
  if (!INS?.weekly) return {}
  const map = {}
  const lastDay = new Date(year, month, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    for (const w of INS.weekly) {
      if (w.dow === dow) (map[d] ||= []).push({ ...w, source: 'insta' })
    }
  }
  // 특정 날짜 메모는 그날 게시 항목을 대체한다 (중복으로 두 줄 뜨지 않게)
  for (const m of INS.marks || []) {
    const [y, mo, dd] = m.date.split('-').map(Number)
    if (y !== year || mo !== month) continue
    map[dd] = [{ ...m, source: 'insta' }, ...(map[dd] || []).filter((e) => e.kind !== 'post')]
  }
  return map
}

const mergeMaps = (...maps) => {
  const out = {}
  for (const m of maps) for (const k of Object.keys(m)) (out[k] ||= []).push(...m[k])
  return out
}

// embedded: 홈 탭 안에 들어갈 때 — 이번 주 줄을 크게, 날짜 칸에 dayDecor(iso) 결과(kept/perfect/kcal)를 칠하고 onDayPick(iso) 로 알린다.
// extra: 홈 탭이 넘기는 추가 일정(롤렉스 조건표 마감 같은 것) — {from, to?, title, kind} 목록
// dayItems(iso): 이번 주 칸 안에 넣을 체크 항목 [{k, label, on, toggle}] — 홈 탭이 주간 배치도에서 만든다
export default function Calendar({ embedded = false, extra = null, dayDecor = null, onDayPick = null, dayItems = null } = {}) {
  const today = useMemo(() => new Date(), [])
  const [cur, setCur] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [showWork, setShowWork] = useState(false)
  const [showPost, setShowPost] = useState(true) // 인스타 게시 일정
  const [sel, setSel] = useState(null) // { day, events }

  // 직접 추가한 일정 — 이 브라우저에만 저장된다
  const [rawMine, setRawMine] = useLocalStorage('hy_cal_v1', '[]')
  const mine = useMemo(() => {
    try {
      const v = JSON.parse(rawMine)
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  }, [rawMine])
  const saveMine = (list) => setRawMine(JSON.stringify(list))

  const [form, setForm] = useState(null) // null 이면 닫힘

  const year = cur.getFullYear()
  const month = cur.getMonth() + 1

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
  const instaMap = useMemo(() => (showPost ? weeklyEvents(year, month) : {}), [year, month, showPost])
  const rangeMap = useMemo(() => spreadRanges(FIN?.ranges, year, month), [year, month])
  const myMap = useMemo(() => spreadRanges(mine, year, month, { mine: true }), [mine, year, month])
  const workMap = useMemo(() => {
    if (!showWork) return {}
    const m = {}
    for (const it of scheduleForMonth(month)) {
      ;(m[it.day] ||= []).push({ ...it, kind: 'work', source: 'work' })
    }
    return m
  }, [month, showWork])

  const extraMap = useMemo(() => spreadRanges(extra, year, month), [extra, year, month])
  const merged = useMemo(
    () => mergeMaps(rangeMap, myMap, extraMap, instaMap, finMap, workMap),
    [rangeMap, myMap, extraMap, instaMap, finMap, workMap],
  )
  const dayEvents = (d) => merged[d] || []

  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7   // 0 = 월요일
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const isThisMonth = year === today.getFullYear() && month === today.getMonth() + 1

  // ── 일정 추가/삭제 ──
  const openForm = (day) => {
    const base = day
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : iso(today)
    setForm({ title: '', from: base, to: '', kind: 'my', memo: '' })
  }
  const submitForm = () => {
    const t = form.title.trim()
    if (!t || !form.from) return
    const to = form.to && form.to > form.from ? form.to : ''
    const next = [
      ...mine,
      {
        id: `m${Date.now()}`,
        title: t,
        from: form.from,
        ...(to ? { to } : {}),
        kind: form.kind,
        action: form.memo.split('\n').map((s) => s.trim()).filter(Boolean),
      },
    ].sort((a, b) => a.from.localeCompare(b.from))
    saveMine(next)
    setForm(null)
    setSel(null)
  }
  const removeMine = (id) => {
    saveMine(mine.filter((e) => e.id !== id))
    setSel(null)
  }

  const navBtn = (on) => ({
    width: 32, height: 32, borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--surface)',
    color: on ? 'var(--text)' : 'var(--text-3)',
    cursor: on ? 'pointer' : 'default', fontSize: 15, opacity: on ? 1 : 0.45,
  })
  const inputStyle = {
    width: '100%', border: '1px solid var(--line)', background: 'var(--surface2)',
    color: 'var(--text)', borderRadius: 10, padding: '9px 11px',
    font: "400 13px 'Pretendard Variable', sans-serif",
  }
  const fieldLabel = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12.5,
              color: 'var(--text-2)', border: '1px solid var(--line)', background: 'var(--surface)',
              borderRadius: 999, padding: '6px 13px',
            }}
          >
            <input type="checkbox" checked={showWork} onChange={(e) => setShowWork(e.target.checked)} />
            업무 일정
          </label>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12.5,
              color: 'var(--text-2)', border: '1px solid var(--line)', background: 'var(--surface)',
              borderRadius: 999, padding: '6px 13px',
            }}
          >
            <input type="checkbox" checked={showPost} onChange={(e) => setShowPost(e.target.checked)} />
            게시 일정
          </label>
          <button
            onClick={() => (form ? setForm(null) : openForm(sel?.day))}
            style={{
              border: '1px solid var(--accent)', background: form ? 'var(--surface)' : 'var(--accent)',
              color: form ? 'var(--text)' : 'var(--accent-text)', borderRadius: 999,
              padding: '7px 15px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {form ? '취소' : '+ 일정 추가'}
          </button>
        </div>
      </div>

      {/* ── 추가 폼 ── */}
      {form && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>일정 추가</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={fieldLabel}>제목</label>
              <input
                style={inputStyle}
                value={form.title}
                autoFocus
                placeholder="예: 부산 출장"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && submitForm()}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={fieldLabel}>시작일</label>
                <input type="date" style={inputStyle} value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })} />
              </div>
              <div>
                <label style={fieldLabel}>종료일 <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(선택)</span></label>
                <input type="date" style={inputStyle} value={form.to} min={form.from}
                  onChange={(e) => setForm({ ...form, to: e.target.value })} />
              </div>
              <div>
                <label style={fieldLabel}>분류</label>
                <select style={inputStyle} value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {MY_KINDS.map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={fieldLabel}>할 일 <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(한 줄에 하나씩 · 선택)</span></label>
              <textarea
                style={{ ...inputStyle, minHeight: 72, lineHeight: 1.6, resize: 'vertical' }}
                value={form.memo}
                placeholder={'예)\n숙소 예약\n출발 전 환전'}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={submitForm}
                disabled={!form.title.trim()}
                style={{
                  border: '1px solid var(--accent)',
                  background: form.title.trim() ? 'var(--accent)' : 'var(--surface2)',
                  color: form.title.trim() ? 'var(--accent-text)' : 'var(--text-3)',
                  borderRadius: 11, padding: '10px 20px', fontSize: 13, fontWeight: 600,
                  cursor: form.title.trim() ? 'pointer' : 'default',
                }}
              >
                추가
              </button>
              <button
                onClick={() => setForm(null)}
                style={{
                  border: '1px solid var(--line)', background: 'var(--surface2)', color: 'var(--text)',
                  borderRadius: 11, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── 범례 ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {['pay', 'repay', 'bonus', 'goal', 'holiday', 'trip', 'post', 'my'].map((k) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-2)' }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: KIND[k].color, display: 'inline-block' }} />
            {KIND[k].label}
          </span>
        ))}
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6, marginBottom: 7 }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: i === 6 ? '#e5484d' : i === 5 ? 'var(--text-2)' : 'var(--text-3)' }}>
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
          {cells.map((d, i) => {
            const evs = d ? dayEvents(d) : []
            const isToday = isThisMonth && d === today.getDate()
            const picked = sel?.day === d
            // 홈 탭: 오늘이 든 줄(이번 주)을 크게, 다른 줄은 낮게
            const todayRow = isThisMonth ? Math.floor((firstWeekday + today.getDate() - 1) / 7) : -1
            const inThisWeek = embedded && Math.floor(i / 7) === todayRow
            const dIso = d ? `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null
            const decor = embedded && d && dayDecor ? dayDecor(dIso) : null
            const decorBg = decor?.perfect ? 'color-mix(in srgb, #22c55e 30%, var(--surface))'
              : decor?.kept ? 'color-mix(in srgb, #22c55e 16%, var(--surface))'
              : decor?.some ? 'color-mix(in srgb, #f59e0b 14%, var(--surface))' : null
            return (
              <div
                key={i}
                onClick={() => {
                  if (!d) return
                  setSel({ day: d, events: evs })
                  if (onDayPick) onDayPick(dIso)
                }}
                style={{
                  minHeight: embedded ? (inThisWeek ? 128 : 58) : 84, borderRadius: 12, border: '1px solid var(--line)',
                  background: d ? (decorBg || 'var(--surface)') : 'transparent',
                  padding: d ? '7px 8px' : 0,
                  display: 'flex', flexDirection: 'column', gap: 4,
                  cursor: d ? 'pointer' : 'default',
                  ...(embedded && !inThisWeek && d ? { opacity: 0.72 } : null),
                  ...(decor?.perfect ? { borderColor: '#22c55e', boxShadow: '0 0 0 1px #22c55e' } : null),
                  ...(isToday ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : null),
                  ...(picked ? { background: decorBg || 'var(--surface2)', outline: '2px solid var(--accent)', outlineOffset: -2 } : null),
                }}
              >
                {d && (
                  <>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, fontWeight: 600, color: isToday ? 'var(--accent)' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {d}
                      {decor && (decor.perfect || decor.kept || decor.some) && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: decor.perfect ? '#22c55e' : decor.kept ? '#22c55e' : '#f59e0b' }}>
                          {decor.perfect ? '완벽' : `${decor.n}/${decor.total}`}
                        </span>
                      )}
                      {decor?.kcal > 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 600, color: decor.kcalOk ? '#22c55e' : 'var(--text-3)' }}>{Math.round(decor.kcal).toLocaleString()}</span>
                      )}
                    </span>
                    {inThisWeek && dayItems && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '2px 0 4px' }}>
                        {dayItems(dIso).map((it) => (
                          <div
                            key={it.k}
                            onClick={(e) => { e.stopPropagation(); it.toggle() }}
                            title={it.title || it.label}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, lineHeight: 1.3, cursor: 'pointer', color: it.on ? 'var(--text-3)' : 'var(--text)', textDecoration: it.on ? 'line-through' : 'none' }}
                          >
                            <span style={{ width: 12, height: 12, borderRadius: 4, flex: 'none', border: it.on ? 'none' : '1.5px solid var(--line)', background: it.on ? 'var(--accent)' : 'transparent', color: 'var(--accent-text)', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.on ? '✓' : ''}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {evs.slice(0, 3).map((ev, j) => {
                      const color = ev.source === 'work'
                        ? SCHEDULE_CATEGORIES[ev.category]?.color || 'var(--text-3)'
                        : KIND[ev.kind]?.color || 'var(--text-3)'
                      // 여러 날짜에 걸친 일정은 좌우 모서리를 붙여 하나의 띠로 읽히게 한다
                      if (ev.band) {
                        return (
                          <div
                            key={j}
                            title={`${ev.title} (${ev.nth}/${ev.total}일)`}
                            style={{
                              fontSize: 10, lineHeight: 1.3, fontWeight: 600,
                              background: `color-mix(in srgb, ${color} 22%, var(--surface))`,
                              color, padding: '2.5px 5px',
                              marginLeft: ev.head ? 0 : -9, marginRight: ev.tail ? 0 : -9,
                              borderRadius: `${ev.head ? 4 : 0}px ${ev.tail ? 4 : 0}px ${ev.tail ? 4 : 0}px ${ev.head ? 4 : 0}px`,
                              overflow: 'hidden', textOverflow: 'clip', whiteSpace: 'nowrap',
                            }}
                          >
                            {/* 주가 바뀌어 띠가 잘리면 그 줄 첫 칸에 제목을 다시 적는다 */}
                            {ev.head || i % 7 === 0 ? ev.title : ' '}
                          </div>
                        )
                      }
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

      {/* ── 클릭한 날 ── */}
      {sel && (
        <Card style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>
              {month}월 {sel.day}일
            </div>
            <button
              onClick={() => openForm(sel.day)}
              style={{
                border: '1px solid var(--line)', background: 'var(--surface2)', color: 'var(--text-2)',
                borderRadius: 9, padding: '4px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              이 날에 추가
            </button>
            <button
              onClick={() => setSel(null)}
              style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 15 }}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          {!sel.events.length && (
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '12px 0' }}>
              이 날에는 일정이 없습니다.
            </div>
          )}

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
                  {ev.band && (
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                      {ev.from.slice(5).replace('-', '.')} ~ {ev.to.slice(5).replace('-', '.')} · {ev.total}일 중 {ev.nth}일째
                    </span>
                  )}
                  {ev.amt ? (
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {won(ev.amt)}원
                    </span>
                  ) : null}
                  {ev.mine && (
                    <button
                      onClick={() => removeMine(ev.id)}
                      style={{
                        marginLeft: ev.amt ? 8 : 'auto', border: '1px solid var(--line)',
                        background: 'transparent', color: '#e5484d', borderRadius: 8,
                        padding: '3px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>

                {ev.action?.length > 0 && (
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

      {/* ── 내가 추가한 일정 관리 ── */}
      {mine.length > 0 && (
        <Card style={{ marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>내가 추가한 일정</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 13 }}>
            {mine.length}개 · 지난 일정도 남아 있으니 필요 없으면 지우세요
          </div>
          {mine.map((e) => {
            const color = KIND[e.kind]?.color || 'var(--text-3)'
            const past = (e.to || e.from) < iso(today)
            return (
              <div
                key={e.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  borderLeft: `3px solid ${color}`, background: 'var(--surface2)',
                  borderRadius: 10, padding: '10px 13px', marginBottom: 7, opacity: past ? 0.55 : 1,
                }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', minWidth: 96 }}>
                  {e.from.slice(2).replace(/-/g, '.')}
                  {e.to ? ` ~ ${e.to.slice(5).replace('-', '.')}` : ''}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 100 }}>{e.title}</span>
                <span style={{ fontSize: 10.5, color, fontWeight: 600 }}>{KIND[e.kind]?.label}</span>
                <button
                  onClick={() => {
                    const [y, m] = e.from.split('-').map(Number)
                    setCur(new Date(y, m - 1, 1))
                    setSel(null)
                  }}
                  style={{
                    border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-2)',
                    borderRadius: 8, padding: '3px 10px', fontSize: 11.5, cursor: 'pointer',
                  }}
                >
                  이동
                </button>
                <button
                  onClick={() => removeMine(e.id)}
                  style={{
                    border: '1px solid var(--line)', background: 'transparent', color: '#e5484d',
                    borderRadius: 8, padding: '3px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            )
          })}
        </Card>
      )}

      {!embedded && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.7 }}>
        날짜를 누르면 그날 할 일이 나옵니다 · {minYM.replace('-', '.')} ~ {maxYM.replace('-', '.')} 범위<br />
        <b>급여·상환·보너스·목표</b>는 코드에 심어둔 것이라 지워지지 않습니다. 직접 추가한 일정만 삭제됩니다.<br />
        추가한 일정은 이 브라우저에만 저장됩니다 (폰에서는 따로 입력해야 합니다).
      </div>}
    </div>
  )
}
