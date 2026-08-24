import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardHead, mono } from '../components/ui.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import * as sync from '../lib/sync.js'

// ─────────────────────────────────────────────────────────────
// 몸 — 참고 체형(하이브리드: 웨이트+러닝)을 향한 통합 일지.
//
// 하루 루틴은 타임라인 1열(위→아래 = 시간 순)로 체크한다. 어제·오늘·내일
// 3일이 한 그리드에 보이고(화살표로 이동), 오늘 컬럼이 가장 강조된다.
// 식단은 칼로리 탭에서, 웨이트 세트 기록은 별도 어플에서 — 여기선 여부만.
//
// 민감 문구(하드룰·리뷰 문항 등)는 번들에 두지 않는다 — 전부
// secure/body.js → window.__HY_DATA__.body 로 암호화되어 들어온다.
// ─────────────────────────────────────────────────────────────

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const SYNC_KEY = 'body'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
// 항목 · 현재 · → · 목표 · 메모 · 시점 — 내용 길이만큼만 잡아 줄바꿈을 막는다
const GAP_COLS = 'minmax(96px,max-content) minmax(80px,max-content) 12px minmax(96px,max-content) minmax(200px,1fr) 76px'
const RED = '#ef4444'
const RED_BG = 'rgba(239,68,68,.12)'
const AMBER = '#f59e0b'
const AMBER_BG = 'rgba(245,158,11,.12)'
const GREEN = '#22c55e'

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
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
// 일요일 밤 리뷰의 주 키 — 그 주의 일요일 날짜로 저장한다 (주=월~일)
function weekKey(d) {
  const dt = new Date(d)
  const day = (dt.getDay() + 6) % 7 // 0=월
  dt.setDate(dt.getDate() + (6 - day))
  return dayKey(dt)
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

const EMPTY = {}
const field = {
  background: 'var(--surface2)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '8px 11px',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
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

// ── 미니 라인차트 (인바디) ──
function TrendChart({ label, unit, points, target, color }) {
  const W = 300
  const H = 110
  const vals = points.map((p) => p.v)
  if (!vals.length)
    return (
      <div style={{ flex: 1, minWidth: 220, color: 'var(--text-3)', fontSize: 12 }}>{label} — 기록 없음</div>
    )
  const all = target != null ? [...vals, target] : vals
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = Math.max(0.001, max - min)
  const padY = 14
  const y = (v) => H - padY - ((v - min) / span) * (H - padY * 2)
  const x = (i) => (points.length < 2 ? W / 2 : 8 + (i / (points.length - 1)) * (W - 16))
  const line = points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ font: mono, color: 'var(--text-3)' }}>{label}</span>
        <span style={{ fontSize: 20, fontWeight: 700 }}>
          {last.v}
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit}</span>
        </span>
        {target != null && (
          <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-3)', marginLeft: 'auto' }}>목표 {target}{unit}</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {target != null && (
          <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="var(--text-3)" strokeWidth="1" strokeDasharray="4 5" opacity=".6" />
        )}
        {points.length > 1 && (
          <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.v)} r="3.2" fill={color} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)' }}>
        <span>{points[0].d.slice(2)}</span>
        <span>{last.d.slice(2)}</span>
      </div>
    </div>
  )
}

// ── 갭 표 ──
// now/goal 이 둘 다 숫자면 "목표까지 얼마" 를 뽑아준다. (8~9% 같은 범위는 중간값)
const gapNum = (t) => {
  const nums = String(t).match(/\d+(\.\d+)?/g)
  if (!nums) return null
  const v = nums.map(Number)
  return v.reduce((a, b) => a + b, 0) / v.length
}
const gapUnit = (t) => String(t).replace(/[\d.~\s]/g, '') || ''
const gapLeft = (now, goal) => {
  const unit = gapUnit(now)
  // 단위가 같은 수치끼리만 뺀다 — '0' vs 'Zone2 주 2회' 같은 건 비교 대상이 아니다
  if (!unit || !String(goal).includes(unit)) return null
  const a = gapNum(now)
  const b = gapNum(goal)
  if (a == null || b == null) return null
  const d = Math.abs(b - a)
  if (!d) return '도달'
  return `${d.toFixed(d < 10 ? 1 : 0)}${unit} 남음`
}
const HorizonTag = ({ h }) => (
  <span
    style={{
      font: "600 10px 'JetBrains Mono'",
      padding: '2px 7px',
      borderRadius: 7,
      whiteSpace: 'nowrap',
      background: h === '장기' ? 'var(--surface2)' : RED_BG,
      color: h === '장기' ? 'var(--text-3)' : RED,
    }}
  >
    {h}
  </span>
)
const GapArrow = () => (
  <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>→</span>
)

// ── 시간 입력 (HH:MM 24시간) ──
// 네이티브 input[type=time]은 로케일에 따라 "오전 08:00 🕐"처럼 늘어나 좁은 칸에서 분이 잘린다.
// 숫자만 받아 HH:MM으로 직접 다듬는다.
function TimeField({ value, onCommit, style }) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => setDraft(value || ''), [value])

  const commit = () => {
    const d = draft.replace(/\D/g, '')
    if (!d) return onCommit('')
    const h = Math.min(23, parseInt(d.slice(0, 2) || '0', 10))
    const m = Math.min(59, parseInt(d.slice(2, 4) || '0', 10))
    const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setDraft(v)
    onCommit(v)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="--:--"
      value={draft}
      onChange={(ev) => {
        const d = ev.target.value.replace(/\D/g, '').slice(0, 4)
        setDraft(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d)
      }}
      onBlur={commit}
      onKeyDown={(ev) => ev.key === 'Enter' && ev.currentTarget.blur()}
      style={style}
    />
  )
}

export default function Body() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.body) || null
  const isMobile = useIsMobile()

  // ── 저장소 ──
  const [log, saveLog] = useJsonStorage('hy_body_log', EMPTY)
  const [review, saveReview] = useJsonStorage('hy_body_review', EMPTY)
  const [issues, saveIssues] = useJsonStorage('hy_body_issues', EMPTY)
  const [stamp, setStamp] = useLocalStorage('hy_body_stamp', '')

  // ── 3일 창 이동 (0 = 오늘이 가운데). 모바일은 폭이 없어 선택한 하루만 보여준다 ──
  const [offset, setOffset] = useState(0)
  const todayKey = dayKey(new Date())
  const winDays = useMemo(
    () => (isMobile ? [0] : [-1, 0, 1]).map((i) => addDays(new Date(), offset + i)),
    [offset, isMobile],
  )

  // 날짜별 체크/시간 토글 — 미래 날짜는 손대지 않는다
  const toggleAt = (dkey, k) => {
    if (dkey > todayKey) return
    const e = log[dkey] || EMPTY
    saveLog({ ...log, [dkey]: { ...e, checks: { ...(e.checks || EMPTY), [k]: !(e.checks || EMPTY)[k] } } })
  }
  const setTimeAt = (dkey, k, v) => {
    if (dkey > todayKey) return
    const e = log[dkey] || EMPTY
    saveLog({ ...log, [dkey]: { ...e, times: { ...(e.times || EMPTY), [k]: v } } })
  }

  // ── 기기 간 동기화 (칼로리 탭과 같은 방식 — 최신 쪽이 이긴다) ──
  const bundle = useMemo(() => ({ log, review, issues }), [log, review, issues])
  const skipPush = useRef(true)
  const [syncMsg, setSyncMsg] = useState('')
  const applyRemote = (v) => {
    if (!v) return
    skipPush.current = true
    if (v.log) saveLog(v.log)
    if (v.review) saveReview(v.review)
    if (v.issues) saveIssues(v.issues)
  }
  useEffect(() => {
    ;(async () => {
      if (!sync.isConfigured() || !sync.isLoggedIn()) return
      try {
        const remote = await sync.pull(SYNC_KEY)
        if (remote && newer(remote.updatedAt, stamp)) {
          applyRemote(remote.value)
          setStamp(remote.updatedAt)
          setSyncMsg(`${clock(remote.updatedAt)} 불러옴`)
        }
      } catch (e) {
        setSyncMsg(e.message || '동기화 실패')
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

  // ── 일요일 리뷰 ──
  const wk = weekKey(new Date())
  const rv = review[wk] || EMPTY
  const isSunday = new Date().getDay() === 0
  const setRv = (k, v) => saveReview({ ...review, [wk]: { ...rv, [k]: v } })
  const slowdown = rv.q1 === true || rv.q2 === true

  const [rulesOpen, setRulesOpen] = useState(false)
  const two = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }

  if (!data)
    return (
      <div style={{ ...fade, color: 'var(--text-3)', fontSize: 14, padding: 20 }}>
        보호 콘텐츠(body)가 아직 로드되지 않았습니다. 새로고침 후 PIN 을 다시 입력해 주세요.
      </div>
    )

  const inbodyRows = data.inbodySeed
  // 컬럼 헤더: 실제 오늘 기준 어제/오늘/내일, 창을 옮기면 날짜로
  const colName = (d) => {
    const diff = Math.round((new Date(dayKey(d)) - new Date(todayKey)) / 86400000)
    if (diff === 0) return '오늘'
    if (diff === -1) return '어제'
    if (diff === 1) return '내일'
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  // 오늘 컬럼을 가장 넓고 진하게 (모바일은 컬럼이 하나뿐이라 항상 넓게)
  const colW = (d) => (isMobile || dayKey(d) === todayKey ? 96 : 64)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...fade }}>
      {/* ── 0. 감속 배너 (리뷰 결과) ── */}
      {slowdown && (
        <div style={{ background: AMBER_BG, border: `1px solid ${AMBER}`, borderRadius: 14, padding: '12px 16px', fontSize: 13.5, color: 'var(--text)' }}>
          ⚠ 이번 주 리뷰 신호 감지 — {data.review.slowdown}
        </div>
      )}

      {/* ── 1. 하루 타임라인 (어제 · 오늘 · 내일) ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>하루 타임라인</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {syncMsg && <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{syncMsg}</span>}
            <button style={{ ...btn, padding: '6px 10px' }} onClick={() => setOffset(offset - 1)}>◀</button>
            {offset !== 0 && (
              <button style={{ ...btn, padding: '6px 10px' }} onClick={() => setOffset(0)}>오늘</button>
            )}
            <button style={{ ...btn, padding: '6px 10px' }} onClick={() => setOffset(offset + 1)}>▶</button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>위에서 아래 = 하루 순서. 한 열만 내려가며 체크하면 끝</div>

        <div style={{ overflowX: isMobile ? 'visible' : 'auto' }}>
          <div style={{ minWidth: isMobile ? 0 : 560 }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
              <span style={{ flex: 1 }} />
              {winDays.map((d, i) => {
                const isT = isMobile || dayKey(d) === todayKey
                return (
                  <span key={i} style={{ width: colW(d), flex: 'none', textAlign: 'center' }}>
                    <span style={{ font: `${isT ? 700 : 600} ${isT ? 13 : 11}px 'JetBrains Mono'`, color: isT ? 'var(--text)' : 'var(--text-3)' }}>
                      {colName(d)}
                      <br />
                      <span style={{ fontWeight: 500, fontSize: 10 }}>{WEEKDAYS[d.getDay()]} {d.getDate()}</span>
                    </span>
                  </span>
                )
              })}
            </div>
            {/* 행 */}
            {data.timeline.map((it, idx) => (
              <div key={it.k} style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--line)', padding: '8px 0' }}>
                <span style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 8, paddingRight: 10 }}>
                  <span style={{ font: "600 10px 'JetBrains Mono'", color: 'var(--text-3)', flex: 'none' }}>{idx + 1}</span>
                  <span style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.45 }}>
                    <b>{it.short}</b>
                    <span style={{ color: 'var(--text-2)' }}> — {it.label}</span>
                  </span>
                </span>
                {winDays.map((d, i) => {
                  const dkey = dayKey(d)
                  const isT = isMobile || dkey === todayKey
                  const future = dkey > todayKey
                  const e = log[dkey] || EMPTY
                  const on = !!(e.checks || EMPTY)[it.k]
                  const time = (e.times || EMPTY)[it.k] || ''
                  return (
                    <span
                      key={i}
                      style={{
                        width: colW(d),
                        flex: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        opacity: future ? 0.3 : 1,
                        background: isT ? 'var(--surface2)' : 'transparent',
                        alignSelf: 'stretch',
                        justifyContent: 'center',
                        borderRadius: 10,
                        padding: '4px 0',
                      }}
                    >
                      <span
                        onClick={() => toggleAt(dkey, it.k)}
                        style={{
                          width: isT ? 26 : 20,
                          height: isT ? 26 : 20,
                          borderRadius: 8,
                          border: on ? 'none' : '1.5px solid var(--line)',
                          background: on ? 'var(--accent)' : 'transparent',
                          color: 'var(--accent-text)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isT ? 14 : 11,
                          fontWeight: 700,
                          cursor: future ? 'default' : 'pointer',
                        }}
                      >
                        {on ? '✓' : ''}
                      </span>
                      {it.type === 'time' &&
                        (future ? (
                          <span style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)' }}>—</span>
                        ) : isT ? (
                          <TimeField
                            value={time}
                            onCommit={(v) => setTimeAt(dkey, it.k, v)}
                            style={{ ...field, padding: '3px 4px', width: 62, font: "500 11px 'JetBrains Mono'", textAlign: 'center' }}
                          />
                        ) : (
                          <span style={{ font: "500 10px 'JetBrains Mono'", color: time ? 'var(--text-2)' : 'var(--text-3)' }}>{time || '·'}</span>
                        ))}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 참조 규칙 — 체크하지 않고 항상 지키는 것 */}
        <div style={{ marginTop: 14, background: 'var(--surface2)', borderRadius: 12, padding: '11px 14px' }}>
          <div style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-3)', marginBottom: 6 }}>참조 — 체크 없이 지키는 것</div>
          {data.refs.map((r, i) => (
            <div key={i} style={{ fontSize: 12.5, color: 'var(--text-2)', padding: '3px 0', lineHeight: 1.55 }}>
              · {r}
            </div>
          ))}
        </div>
      </Card>

      {/* ── 2. 훈련 프로그램 ── */}
      <Card>
        <CardHead title="훈련 프로그램" caption="주 5분할 + Zone2 · 기록은 어플" />
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.55 }}>{data.program.note}</div>
        {data.program.splits.map((s) => (
          <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 2px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, width: 44 }}>{s.name}</span>
            {s.tag && (
              <span style={{ font: "600 10px 'JetBrains Mono'", padding: '2px 7px', borderRadius: 7, background: RED_BG, color: RED }}>{s.tag}</span>
            )}
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', flex: 1, minWidth: 200 }}>
              {s.focus}
              {s.extra && <span style={{ color: 'var(--text-3)' }}> — {s.extra}</span>}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 2px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🏃 {data.program.run.name}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-2)', flex: 1, minWidth: 200 }}>
            {data.program.run.detail} — <span style={{ color: 'var(--text-3)' }}>{data.program.run.note}</span>
          </span>
        </div>

        {/* 벤치프레스 세팅 — 전방활주 */}
        {data.program.bench && (
          <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-3)', marginBottom: 6 }}>{data.program.bench.title}</div>
            {data.program.bench.items.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-2)', padding: '3px 0', lineHeight: 1.55 }}>
                <span style={{ font: "700 11px 'JetBrains Mono'", color: 'var(--text-3)', flex: 'none' }}>{i + 1}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}
        {data.program.avoid && (
          <div style={{ marginTop: 10, background: RED_BG, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ font: "600 11px 'JetBrains Mono'", color: RED, marginBottom: 5 }}>{data.program.avoid.title}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>{data.program.avoid.items.join(' · ')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{data.program.avoid.note}</div>
          </div>
        )}
      </Card>

      {/* ── 3. 참고 체형과의 갭 ── */}
      <Card>
        <CardHead title="참고 체형과의 갭" caption={data.gap.me} />
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12 }}>기준: {data.gap.ref}</div>
        {isMobile ? (
          // 모바일: 가로 스크롤 없이 항목별 스택 카드
          data.gap.lines.map((l, i) => (
            <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>{l.k}</span>
                <HorizonTag h={l.horizon} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 5 }}>
                <span style={{ font: "500 12px 'JetBrains Mono'", color: 'var(--text-3)' }}>{l.now}</span>
                <GapArrow />
                <span style={{ font: "700 12px 'JetBrains Mono'", color: 'var(--text)' }}>{l.goal}</span>
                {gapLeft(l.now, l.goal) && (
                  <span style={{ font: "600 10px 'JetBrains Mono'", color: AMBER, background: AMBER_BG, padding: '2px 6px', borderRadius: 6 }}>
                    {gapLeft(l.now, l.goal)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 5, lineHeight: 1.5 }}>{l.note}</div>
            </div>
          ))
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 620 }}>
              <div style={{ display: 'grid', gridTemplateColumns: GAP_COLS, alignItems: 'center', columnGap: 12, font: "600 10px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--text-3)', padding: '0 6px 8px', borderBottom: '1px solid var(--line)' }}>
                <span>항목</span>
                <span style={{ gridColumn: 'span 2' }}>현재</span>
                <span>목표</span>
                <span>메모</span>
                <span style={{ textAlign: 'right' }}>시점</span>
              </div>
              {data.gap.lines.map((l, i) => {
                const left = gapLeft(l.now, l.goal)
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: GAP_COLS, alignItems: 'center', columnGap: 12, padding: '10px 6px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{l.k}</span>
                    <span style={{ font: "500 12px 'JetBrains Mono'", color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{l.now}</span>
                    <GapArrow />
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 7, whiteSpace: 'nowrap' }}>
                      <span style={{ font: "700 12px 'JetBrains Mono'" }}>{l.goal}</span>
                      {left && (
                        <span style={{ font: "600 10px 'JetBrains Mono'", color: AMBER, background: AMBER_BG, padding: '2px 6px', borderRadius: 6 }}>{left}</span>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{l.note}</span>
                    <span style={{ textAlign: 'right' }}>
                      <HorizonTag h={l.horizon} />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── 4. 인바디 추이 — 입력 없음, 인바디 사진 주면 갱신 ── */}
      <Card>
        <CardHead title="인바디 추이" caption={`목표 ${data.targets.w}kg · 골격근 ${data.targets.smm}kg · 체지방 ${data.targets.pbf}%`} />
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <TrendChart label="체중" unit="kg" color="var(--accent)" target={data.targets.w} points={inbodyRows.filter((r) => r.w).map((r) => ({ d: r.d, v: r.w }))} />
          <TrendChart label="골격근량" unit="kg" color="#3b9eff" target={data.targets.smm} points={inbodyRows.filter((r) => r.smm).map((r) => ({ d: r.d, v: r.smm }))} />
          <TrendChart label="체지방률" unit="%" color={AMBER} target={data.targets.pbf} points={inbodyRows.filter((r) => r.pbf).map((r) => ({ d: r.d, v: r.pbf }))} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 12 }}>
          직접 입력하지 않는다 — InBody 앱 캡처를 주면 데이터에 추가된다. 눈바디·수행능력이 우선, 숫자는 참고
        </div>
      </Card>

      <div style={two}>
        {/* ── 5. 일요일 리뷰 ── */}
        <Card style={isSunday ? { border: `1px solid ${AMBER}` } : undefined}>
          <CardHead title="주간 리뷰" caption={isSunday ? '오늘이 일요일 — 5분' : '일요일 밤 5분'} />
          {data.review.questions.map((q) => {
            const v = rv[q.k]
            return (
              <div key={q.k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{q.label}</span>
                {[true, false].map((val) => {
                  const active = v === val
                  const isBadPick = val === q.bad
                  return (
                    <button
                      key={String(val)}
                      onClick={() => setRv(q.k, active ? undefined : val)}
                      style={{ ...btn, padding: '6px 13px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, background: active ? (isBadPick ? RED_BG : 'rgba(34,197,94,.13)') : 'transparent', color: active ? (isBadPick ? RED : GREEN) : 'var(--text-3)', borderColor: active ? (isBadPick ? RED : GREEN) : 'var(--line)' }}
                    >
                      {val ? '응' : '아니'}
                    </button>
                  )
                })}
              </div>
            )
          })}
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.55 }}>{data.review.slowdown}</div>
        </Card>

        {/* ── 6. 하드 룰 · 오픈 이슈 ── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, cursor: 'pointer' }} onClick={() => setRulesOpen(!rulesOpen)}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>하드 룰 · 오픈 이슈</div>
            <span style={{ font: mono, color: 'var(--text-3)' }}>{rulesOpen ? '접기 ▲' : `룰 ${data.hardRules.length} · 펼치기 ▼`}</span>
          </div>
          {rulesOpen && (
            <div style={{ marginBottom: 14 }}>
              {data.hardRules.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, padding: '7px 0', fontSize: 13, lineHeight: 1.5, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ font: "700 12px 'JetBrains Mono'", color: RED }}>{i + 1}</span>
                  <span>{r}</span>
                </div>
              ))}
              <div style={{ font: mono, color: 'var(--text-3)', margin: '12px 0 4px' }}>반복 패턴 — 보이면 개입</div>
              {data.patterns.map((p, i) => (
                <div key={i} style={{ fontSize: 12.5, color: 'var(--text-2)', padding: '5px 0', lineHeight: 1.5 }}>
                  · {p}
                </div>
              ))}
            </div>
          )}
          <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 4 }}>오픈 이슈</div>
          {data.openIssues.map((it) => {
            const done = issues[it.k] != null ? !!issues[it.k] : !!it.done
            return (
              <div key={it.k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => saveIssues({ ...issues, [it.k]: !done })}>
                <span style={{ width: 18, height: 18, flex: 'none', borderRadius: 6, border: done ? 'none' : '1.5px solid var(--line)', background: done ? GREEN : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {done ? '✓' : ''}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.45 }}>
                  {it.label}
                </span>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
