import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import * as sync from '../lib/sync.js'

// 스케줄 탭 — 2027 말까지의 목표 · 분기 로드맵 · 주간 시간표 · 주간 체크.
// 내용은 전부 secure/schedule.js (window.__HY_DATA__.schedule). 여기는 구조와 저장만.
// 저장: localStorage hy_sched_week(주별 횟수) · hy_sched_done(로드맵 체크), Supabase sync 키 'schedule'

const SYNC_KEY = 'schedule'
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
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
const COLOR = { good: 'var(--good, #22c55e)', bad: 'var(--bad, #ef4444)', warn: 'var(--warn, #f59e0b)', info: 'var(--info, #3b82f6)', calm: 'var(--calm, #8b5cf6)' }

const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 14 }
const h2 = { fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', marginBottom: 2 }
const sub = { fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }
const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontVariantNumeric: 'tabular-nums' }

function daysLeft(iso) {
  const t = new Date(iso); t.setHours(0, 0, 0, 0)
  const n = new Date(); n.setHours(0, 0, 0, 0)
  return Math.round((t - n) / 86400000)
}

export default function Schedule() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.schedule) || null
  const isMobile = useIsMobile()
  const [week, saveWeek] = useJsonStorage('hy_sched_week', EMPTY)
  const [done, saveDone] = useJsonStorage('hy_sched_done', EMPTY)
  const [stamp, setStamp] = useLocalStorage('hy_sched_stamp', '')
  const [syncMsg, setSyncMsg] = useState('')

  // ── 동기화 (몸 탭과 같은 방식) ──
  const bundle = useMemo(() => ({ week, done }), [week, done])
  const skipPush = useRef(true)
  useEffect(() => {
    ;(async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull(SYNC_KEY)
        if (remote && newer(remote.updatedAt, stamp)) {
          skipPush.current = true
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

  if (!data) {
    return <div style={{ color: 'var(--text-3)', padding: 20 }}>스케줄 데이터가 없습니다 (secure/schedule.js 잠금 해제 필요)</div>
  }

  const wk = weekKey(new Date())
  const cur = week[wk] || EMPTY
  const setCount = (k, v) => saveWeek({ ...week, [wk]: { ...cur, [k]: Math.max(0, v) } })
  const todayIdx = (new Date().getDay() + 6) % 7
  const doneCount = data.quarters.reduce((a, q) => a + q.items.filter((it) => done[it.k]).length, 0)
  const totalCount = data.quarters.reduce((a, q) => a + q.items.length, 0)

  return (
    <div style={{ maxWidth: 980 }}>
      {/* D-day */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {data.dday.map((d) => {
          const n = daysLeft(d.date)
          return (
            <div key={d.k} style={{ ...card, marginBottom: 0, padding: 14 }} title={d.note}>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.label}</div>
              <div style={{ ...mono, fontSize: 22, fontWeight: 700, marginTop: 2 }}>D-{n}</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{d.date}</div>
            </div>
          )
        })}
      </div>

      {/* 주간 체크 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={h2}>이번 주 체크 · {wk} 주</div>
            <div style={sub}>숫자를 누르면 올라간다. 일요일 15분 리뷰 때 채운다. 아래 두 줄은 낮을수록 좋다. {syncMsg && <span style={{ marginLeft: 6 }}>· {syncMsg}</span>}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 8 }}>
          {data.weekly.map((w) => {
            const v = cur[w.k] || 0
            const ok = w.lower ? v <= w.goal : v >= w.goal
            return (
              <div key={w.k} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', border: `1px solid ${ok ? COLOR.good : 'var(--line)'}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{w.label} <span style={mono}>/{w.goal}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span onClick={() => setCount(w.k, v - 1)} style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, userSelect: 'none' }}>−</span>
                  <span onClick={() => setCount(w.k, v + 1)} style={{ ...mono, fontSize: 22, fontWeight: 700, cursor: 'pointer', color: ok ? COLOR.good : 'var(--text)', userSelect: 'none' }}>{v}</span>
                  <span onClick={() => setCount(w.k, v + 1)} style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, userSelect: 'none' }}>+</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 주간 시간표 */}
      <div style={card}>
        <div style={h2}>주간 시간표</div>
        <div style={sub}>회사 9~18 기준. 시간은 잠금이 아니라 기본 자리. 오늘 열이 강조된다.</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 640 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr repeat(7, 40px)', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
              <span />
              <span />
              {WEEKDAYS.map((d, i) => (
                <span key={d} style={{ ...mono, textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === todayIdx ? 'var(--accent)' : 'var(--text-3)' }}>{d}</span>
              ))}
            </div>
            {data.week.rows.map((r) => (
              <div key={r.slot + r.label} style={{ display: 'grid', gridTemplateColumns: '64px 1fr repeat(7, 40px)', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ ...mono, fontSize: 11, color: 'var(--text-3)' }}>{r.slot}</span>
                <span style={{ fontSize: 12.5, paddingRight: 8 }}>
                  {r.label} <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>{r.tag}</span>
                </span>
                {r.days.map((on, i) => (
                  <span key={i} style={{ display: 'flex', justifyContent: 'center', background: i === todayIdx ? 'var(--surface2)' : 'transparent', alignSelf: 'stretch', alignItems: 'center', borderRadius: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: on ? 'var(--accent)' : 'var(--line)', opacity: on ? 1 : 0.6 }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
          {data.week.weekend.map((w) => (
            <div key={w.day} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.55 }}>
              <b>{w.day}</b> — {w.label}
            </div>
          ))}
        </div>
        <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
          {data.week.rules.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      {/* 목표 */}
      <div style={card}>
        <div style={h2}>2027년 말 목표 · 측정 가능한 것만</div>
        <div style={sub}>지금 → 목표. 왼쪽 색은 영역 구분. 부채·INSEAD 숫자는 인생플랜 페이지가 원본.</div>
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

      {/* 분기 로드맵 */}
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
                  <span style={{ ...mono, fontSize: 11, color: n === q.items.length ? COLOR.good : 'var(--text-3)' }}>{n}/{q.items.length}</span>
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
        하루 체크는 몸 탭, 매매·위반은 Hiro's Crypto 투자 일지, 부채·INSEAD 는 인생플랜 페이지. 이 탭은 그 셋을 주 단위로 묶어 보는 자리.
      </div>
    </div>
  )
}
