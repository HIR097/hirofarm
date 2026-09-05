import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import * as sync from '../lib/sync.js'

// 목표 탭 — 세부탭 두 개.
//   목표: 2027년 말 목표(1열 8행) + 분기 로드맵(5행, 분기당 한 줄). 내용은 secure/schedule.js, 체크는 hy_sched_done → sync 'schedule'
//   대출 상환 플랜: 예전 '인생플랜' 페이지(/plan.html, 암호화 페이지)를 그대로 iframe 으로. 부채·상환 시뮬·INSEAD 타임라인 원본
// 주간 배치도는 26-09-06 홈 달력 칸으로 옮겨서 여기서 뺐다.

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

function SubTabs({ value, onChange, items }) {
  return (
    <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid var(--line)', margin: '0 0 16px' }}>
      {items.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 2px 10px',
            font: `${value === k ? 600 : 500} 14px 'Pretendard Variable'`, color: value === k ? 'var(--text)' : 'var(--text-3)',
            borderBottom: value === k ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function Goals() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.schedule) || null
  const isMobile = useIsMobile()
  const [sub, setSub] = useLocalStorage('hy_goals_sub', 'goals')
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
      <SubTabs value={sub} onChange={setSub} items={[['goals', '목표'], ['debt', '대출 상환 플랜']]} />

      {sub === 'debt' && (
        <div style={{ ...card, padding: 0, overflow: 'hidden', height: 'calc(100vh - 190px)', minHeight: 520 }}>
          <iframe title="대출 상환 플랜" src="/plan.html" style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: 'var(--bg)' }} />
        </div>
      )}

      {sub === 'goals' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {data.dday.map((d) => (
              <span key={d.k} title={d.note} style={{ fontSize: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 12px' }}>
                {d.label} <b style={mono}>D-{daysLeft(d.date)}</b> <span style={{ color: 'var(--text-3)', ...mono }}>{d.date}</span>
              </span>
            ))}
          </div>

          {/* 2027 목표 — 1열 8행 */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <div style={h2}>2027년 말 목표</div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>측정 가능한 것만 · 지금 → 목표 · 부채·INSEAD 숫자는 대출 상환 플랜이 원본{syncMsg && ` · ${syncMsg}`}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {data.goals.map((g) => (
                <div key={g.k} style={{ display: 'grid', gridTemplateColumns: isMobile ? '4px 1fr' : '4px 120px 1fr 1fr', gap: 12, alignItems: 'start', background: 'var(--surface2)', borderRadius: 12, padding: '11px 14px' }}>
                  <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: COLOR[g.color] || 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{g.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{g.now}</div>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{g.target}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{g.why}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 분기 로드맵 — 5행 (분기당 한 줄, 항목은 가로로) */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <div style={h2}>분기 로드맵 <span style={{ ...mono, fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginLeft: 8 }}>{doneCount}/{totalCount}</span></div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>끝낸 것은 눌러서 체크 · 못 한 항목은 지우지 말고 다음 분기로</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {data.quarters.map((q) => {
                const n = q.items.filter((it) => done[it.k]).length
                return (
                  <div key={q.k} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '150px 1fr', gap: 12, background: 'var(--surface2)', borderRadius: 12, padding: '11px 14px' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{q.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{q.theme}</div>
                      <div style={{ ...mono, fontSize: 11, color: n === q.items.length ? GREEN : 'var(--text-3)', marginTop: 4 }}>{n}/{q.items.length}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '2px 16px' }}>
                      {q.items.map((it) => {
                        const on = !!done[it.k]
                        return (
                          <div key={it.k} onClick={() => saveDone({ ...done, [it.k]: !on })} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '4px 0', cursor: 'pointer' }}>
                            <span style={{ width: 15, height: 15, borderRadius: 4, flex: 'none', marginTop: 2, border: on ? 'none' : '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'transparent', color: 'var(--accent-text)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
                            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: on ? 'var(--text-3)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none' }}>{it.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
