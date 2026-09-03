import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import * as sync from '../lib/sync.js'

// 목표 탭 — 2027년 말 목표(4열) + 분기 로드맵(5열). 홈에서 분리 (회사에서 홈을 열어도 안 보이게).
// 내용은 secure/schedule.js (goals · quarters · dday). 체크는 hy_sched_done → Supabase sync 'schedule'.

const SYNC_KEY = 'schedule'
const pad = (n) => String(n).padStart(2, '0')
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
const GREEN = '#22c55e'
const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 14, minWidth: 0 }
const h2 = { fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', marginBottom: 2 }
const mono = { fontVariantNumeric: 'tabular-nums' }

function daysLeft(iso) {
  const t = new Date(iso); t.setHours(0, 0, 0, 0)
  const n = new Date(); n.setHours(0, 0, 0, 0)
  return Math.round((t - n) / 86400000)
}

export default function Goals() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.schedule) || null
  const isMobile = useIsMobile()
  const [done, saveDone] = useJsonStorage('hy_sched_done', EMPTY)
  const [week] = useJsonStorage('hy_sched_week', EMPTY)
  const [stamp, setStamp] = useLocalStorage('hy_sched_stamp', '')
  const [syncMsg, setSyncMsg] = useState('')

  const bundle = useMemo(() => ({ week, done }), [week, done])
  const skipPush = useRef(true)
  useEffect(() => {
    ;(async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull(SYNC_KEY)
        if (remote && newer(remote.updatedAt, stamp)) {
          skipPush.current = true
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
    return <div style={{ color: 'var(--text-3)', padding: 20 }}>목표 데이터가 없습니다 (secure/schedule.js 잠금 해제 필요)</div>
  }
  const doneCount = data.quarters.reduce((a, q) => a + q.items.filter((it) => done[it.k]).length, 0)
  const totalCount = data.quarters.reduce((a, q) => a + q.items.length, 0)

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      {/* 큰 날짜 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {data.dday.map((d) => (
          <span key={d.k} title={d.note} style={{ fontSize: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 12px' }}>
            {d.label} <b style={mono}>D-{daysLeft(d.date)}</b> <span style={{ color: 'var(--text-3)', ...mono }}>{d.date}</span>
          </span>
        ))}
      </div>

      {/* 2027 목표 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div style={h2}>2027년 말 목표</div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>측정 가능한 것만 · 지금 → 목표 · 부채·INSEAD 숫자는 인생플랜이 원본{syncMsg && ` · ${syncMsg}`}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
          {data.goals.map((g) => (
            <div key={g.k} style={{ display: 'flex', gap: 8, background: 'var(--surface2)', borderRadius: 12, padding: '9px 11px', minWidth: 0 }}>
              <span style={{ width: 4, borderRadius: 2, background: COLOR[g.color] || 'var(--accent)', flex: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{g.title} <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 500, marginLeft: 4 }}>{g.now}</span></div>
                <div style={{ fontSize: 12, marginTop: 2, lineHeight: 1.45 }}>{g.target}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>{g.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 분기 로드맵 5열 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div style={h2}>분기 로드맵 <span style={{ ...mono, fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginLeft: 8 }}>{doneCount}/{totalCount}</span></div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>끝낸 것은 눌러서 체크 · 못 한 항목은 지우지 말고 다음 분기로</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
          {data.quarters.map((q) => {
            const n = q.items.filter((it) => done[it.k]).length
            return (
              <div key={q.k} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 11px', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.title}</div>
                  <span style={{ ...mono, fontSize: 11, color: n === q.items.length ? GREEN : 'var(--text-3)', flex: 'none' }}>{n}/{q.items.length}</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 4 }}>{q.theme}</div>
                {q.items.map((it) => {
                  const on = !!done[it.k]
                  return (
                    <div key={it.k} onClick={() => saveDone({ ...done, [it.k]: !on })} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '5px 0', cursor: 'pointer', borderTop: '1px solid var(--line)' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, flex: 'none', marginTop: 2, border: on ? 'none' : '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'transparent', color: 'var(--accent-text)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.45, color: on ? 'var(--text-3)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none' }}>{it.label}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* 시간표 원본 (배치도) */}
      <div style={card}>
        <div style={h2}>주간 배치도 · 괴물 프로젝트</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>일요일 휴식 · 수·금 저녁은 약속용. 하루 체크는 홈의 "오늘 할 일"(몸 탭 타임라인)에서.</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 560 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr repeat(7, 34px)', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
              <span /><span />
              {['월', '화', '수', '목', '금', '토', '일'].map((d) => <span key={d} style={{ ...mono, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>{d}</span>)}
            </div>
            {data.week.rows.map((r) => (
              <div key={r.k} style={{ display: 'grid', gridTemplateColumns: '56px 1fr repeat(7, 34px)', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ ...mono, fontSize: 11, color: 'var(--text-3)' }}>{r.slot}</span>
                <span style={{ fontSize: 12.5, paddingRight: 8 }} title={r.label}>{r.short} <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>{r.tag}</span></span>
                {r.days.map((on, i) => (
                  <span key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 5, background: on ? 'var(--accent)' : 'var(--line)', opacity: on ? 1 : 0.6 }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
          {data.week.rules.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  )
}
