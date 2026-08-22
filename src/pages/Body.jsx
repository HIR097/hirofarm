import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardHead, mono } from '../components/ui.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useIsMobile } from '../hooks/useIsMobile.js'
import * as sync from '../lib/sync.js'

// ─────────────────────────────────────────────────────────────
// 몸 — 참고 체형(하이브리드: 웨이트+러닝)을 향한 통합 일지.
// 아침 리듬 · 운동 · 식단 · 밤 루틴을 하루 단위로 체크하고,
// 주간 그리드 / 인바디 추이 / 일요일 리뷰로 시스템이 돌아가는지 본다.
//
// 민감 문구(복약·하드룰·리뷰 문항 등)는 번들에 두지 않는다 — 전부
// secure/body.js → window.__HY_DATA__.body 로 암호화되어 들어온다.
// ─────────────────────────────────────────────────────────────

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const SYNC_KEY = 'body'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const RED = '#ef4444'
const RED_BG = 'rgba(239,68,68,.12)'
const AMBER = '#f59e0b'
const AMBER_BG = 'rgba(245,158,11,.12)'
const GREEN = '#22c55e'

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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

// ── 공용 체크 행 ──
function CheckRow({ item, entry, onToggle, onTime }) {
  const checks = entry.checks || EMPTY
  const times = entry.times || EMPTY
  const on = !!checks[item.k]
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
      onClick={() => onToggle(item.k)}
    >
      <span
        style={{
          width: 20,
          height: 20,
          flex: 'none',
          borderRadius: 7,
          border: on ? 'none' : '1.5px solid var(--line)',
          background: on ? 'var(--accent)' : 'transparent',
          color: 'var(--accent-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {on ? '✓' : ''}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, color: on ? 'var(--text-3)' : 'var(--text)', textDecoration: on ? 'line-through' : 'none' }}>
        {item.label}
      </span>
      {item.type === 'time' && (
        <input
          type="time"
          value={times[item.k] || ''}
          placeholder={item.ph}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onTime(item.k, e.target.value)}
          style={{ ...field, padding: '4px 8px', width: 92, font: "500 12px 'JetBrains Mono'" }}
        />
      )}
    </div>
  )
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

export default function Body() {
  const data = (typeof window !== 'undefined' && window.__HY_DATA__?.body) || null
  const isMobile = useIsMobile()

  // ── 저장소 ──
  const [log, saveLog] = useJsonStorage('hy_body_log', EMPTY)
  const [inbodyExtra, saveInbodyExtra] = useJsonStorage('hy_body_inbody', EMPTY) // {날짜: {w,smm,pbf}}
  const [review, saveReview] = useJsonStorage('hy_body_review', EMPTY)
  const [issues, saveIssues] = useJsonStorage('hy_body_issues', EMPTY)
  const [stamp, setStamp] = useLocalStorage('hy_body_stamp', '')

  // ── 날짜 이동 ──
  const [offset, setOffset] = useState(0)
  const viewDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d
  }, [offset])
  const vkey = dayKey(viewDate)
  const isToday = offset === 0
  const entry = log[vkey] || EMPTY

  const patch = (part) => saveLog({ ...log, [vkey]: { ...entry, ...part } })
  const toggle = (k) => patch({ checks: { ...(entry.checks || EMPTY), [k]: !(entry.checks || EMPTY)[k] } })
  const setTime = (k, v) => patch({ times: { ...(entry.times || EMPTY), [k]: v } })
  const toggleGate = (k) => patch({ gate: { ...(entry.gate || EMPTY), [k]: !(entry.gate || EMPTY)[k] } })

  // ── 기기 간 동기화 (칼로리 탭과 같은 방식 — 최신 쪽이 이긴다) ──
  const bundle = useMemo(() => ({ log, inbody: inbodyExtra, review, issues }), [log, inbodyExtra, review, issues])
  const skipPush = useRef(true)
  const [syncMsg, setSyncMsg] = useState('')
  const applyRemote = (v) => {
    if (!v) return
    skipPush.current = true
    if (v.log) saveLog(v.log)
    if (v.inbody) saveInbodyExtra(v.inbody)
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

  // ── 분할 자동 제안: 최근 14일에서 마지막으로 한 부위의 다음 순서 ──
  const splits = data ? data.program.splits : []
  const suggested = useMemo(() => {
    if (!splits.length) return ''
    for (let i = 1; i <= 14; i++) {
      const d = new Date(viewDate)
      d.setDate(d.getDate() - i)
      const past = log[dayKey(d)]
      if (past?.split) {
        const at = splits.findIndex((s) => s.k === past.split)
        if (at >= 0) return splits[(at + 1) % splits.length].k
      }
    }
    return splits[0].k
  }, [log, vkey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 칼로리 탭 연동 (재입력 없음 — hy_cal_log 를 그대로 읽는다) ──
  const cal = useMemo(() => {
    try {
      const clog = JSON.parse(localStorage.getItem('hy_cal_log') || '{}')
      const items = clog[vkey] || []
      const kcal = items.reduce((s, it) => s + it.kcal * it.qty, 0)
      const protein = items.reduce((s, it) => s + (it.protein || 0) * it.qty, 0)
      const goal = Number(localStorage.getItem('hy_cal_goal')) || 0
      const pGoal = Number(localStorage.getItem('hy_cal_protein_goal')) || 0
      return { kcal: Math.round(kcal), protein: Math.round(protein), goal, pGoal }
    } catch {
      return { kcal: 0, protein: 0, goal: 0, pGoal: 0 }
    }
  }, [vkey, log]) // log 변경 시 재계산 — 같은 세션에서 칼로리 탭을 오간 경우 대비

  // ── 인바디: 시드 + 입력 병합 ──
  const inbodyRows = useMemo(() => {
    if (!data) return []
    const map = {}
    for (const r of data.inbodySeed) map[r.d] = { ...r }
    for (const [d, r] of Object.entries(inbodyExtra)) map[d] = { d, ...r }
    return Object.values(map).sort((a, b) => (a.d < b.d ? -1 : 1))
  }, [inbodyExtra, data])
  const [ibDraft, setIbDraft] = useState(() => ({ d: dayKey(new Date()), w: '', smm: '', pbf: '' }))
  const addInbody = () => {
    const w = Number(ibDraft.w)
    if (!ibDraft.d || !w) return
    saveInbodyExtra({
      ...inbodyExtra,
      [ibDraft.d]: { w, smm: Number(ibDraft.smm) || null, pbf: Number(ibDraft.pbf) || null },
    })
    setIbDraft({ d: dayKey(new Date()), w: '', smm: '', pbf: '' })
  }

  // ── 주간 그리드 (이번 주 월~일) ──
  const gridDays = useMemo(() => {
    const now = new Date()
    const day = (now.getDay() + 6) % 7
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - day + i)
      return d
    })
  }, [])

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

  const gateOn = Object.values(entry.gate || EMPTY).filter(Boolean).length
  const split = entry.split || ''
  const lifts = entry.lifts || []
  const run = entry.run || EMPTY
  const gridItems = [
    ...data.checklist.morning.filter((it) => !it.type).map((it) => ({ k: it.k, name: it.label.split(' ')[0], kind: 'check' })),
    { k: 'posture', name: '자세', kind: 'check' },
    { k: 'fodmap', name: 'FODMAP', kind: 'check' },
    { k: '_workout', name: '운동', kind: 'workout' },
    { k: 'caffeine', name: '카페인', kind: 'check' },
    { k: 'pill_pm', name: data.checklist.night[1].label.split(' ')[0], kind: 'check' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...fade }}>
      {/* ── 0. 감속 배너 (리뷰 결과) ── */}
      {slowdown && (
        <div style={{ background: AMBER_BG, border: `1px solid ${AMBER}`, borderRadius: 14, padding: '12px 16px', fontSize: 13.5, color: 'var(--text)' }}>
          ⚠ 이번 주 리뷰 신호 감지 — {data.review.slowdown}
        </div>
      )}

      {/* ── 1. 참고 체형과의 갭 ── */}
      <Card>
        <CardHead title="참고 체형과의 갭" caption={data.gap.me} />
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12 }}>기준: {data.gap.ref}</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 560 }}>
            <div style={{ display: 'flex', font: "600 10px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--text-3)', padding: '0 6px 8px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ flex: 1 }}>항목</span>
              <span style={{ width: 90 }}>현재</span>
              <span style={{ width: 110 }}>목표</span>
              <span style={{ flex: 2.2 }}>메모</span>
              <span style={{ width: 72, textAlign: 'right' }}>시점</span>
            </div>
            {data.gap.lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '9px 6px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{l.k}</span>
                <span style={{ width: 90, font: "500 12px 'JetBrains Mono'", color: 'var(--text-2)' }}>{l.now}</span>
                <span style={{ width: 110, font: "600 12px 'JetBrains Mono'" }}>{l.goal}</span>
                <span style={{ flex: 2.2, fontSize: 12, color: 'var(--text-2)' }}>{l.note}</span>
                <span style={{ width: 72, textAlign: 'right' }}>
                  <span style={{ font: "600 10px 'JetBrains Mono'", padding: '2px 7px', borderRadius: 7, background: l.horizon === '장기' ? 'var(--surface2)' : RED_BG, color: l.horizon === '장기' ? 'var(--text-3)' : RED }}>
                    {l.horizon}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 2. 오늘 체크 ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {isToday ? '오늘' : `${viewDate.getMonth() + 1}/${viewDate.getDate()} (${WEEKDAYS[viewDate.getDay()]})`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {syncMsg && <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{syncMsg}</span>}
            <button style={{ ...btn, padding: '6px 10px' }} onClick={() => setOffset(offset - 1)}>◀</button>
            {!isToday && (
              <button style={{ ...btn, padding: '6px 10px' }} onClick={() => setOffset(0)}>오늘</button>
            )}
            <button style={{ ...btn, padding: '6px 10px', opacity: isToday ? 0.4 : 1 }} disabled={isToday} onClick={() => setOffset(offset + 1)}>▶</button>
          </div>
        </div>

        <div style={two}>
          {/* 아침 */}
          <div>
            <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 4 }}>🌅 아침 — 리듬의 닻은 기상 시간</div>
            {data.checklist.morning.map((it) => (
              <CheckRow key={it.k} item={it} entry={entry} onToggle={toggle} onTime={setTime} />
            ))}
            {data.checklist.posture.map((it) => (
              <CheckRow key={it.k} item={it} entry={entry} onToggle={toggle} onTime={setTime} />
            ))}
          </div>

          {/* 식단 */}
          <div>
            <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 4 }}>🍚 식단</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', margin: '2px 0 6px', lineHeight: 1.5 }}>{data.macro}</div>
            <div style={{ display: 'flex', gap: 14, padding: '8px 2px', borderBottom: '1px solid var(--line)', fontSize: 13, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-3)' }}>칼로리 탭 연동</span>
              <span style={{ font: "600 13px 'JetBrains Mono'" }}>
                {cal.kcal.toLocaleString()} / {cal.goal.toLocaleString()} kcal
              </span>
              <span style={{ font: "600 13px 'JetBrains Mono'", color: cal.pGoal > 0 && cal.protein >= cal.pGoal ? GREEN : 'var(--text-2)' }}>
                단백질 {cal.protein} / {cal.pGoal}g
              </span>
            </div>
            {data.checklist.diet.map((it) => (
              <CheckRow key={it.k} item={it} entry={entry} onToggle={toggle} onTime={setTime} />
            ))}
          </div>

          {/* 운동 */}
          <div>
            <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 8 }}>🏋️ 운동</div>

            {/* 게이트 */}
            <div style={{ background: gateOn >= 3 ? RED_BG : gateOn === 2 ? AMBER_BG : 'var(--surface2)', border: `1px solid ${gateOn >= 3 ? RED : gateOn === 2 ? AMBER : 'var(--line)'}`, borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ font: "600 11px 'JetBrains Mono'", color: gateOn >= 3 ? RED : gateOn === 2 ? AMBER : 'var(--text-3)', marginBottom: 6 }}>
                {data.gate.title}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.gate.items.map((g) => {
                  const on = !!(entry.gate || EMPTY)[g.k]
                  return (
                    <button
                      key={g.k}
                      onClick={() => toggleGate(g.k)}
                      style={{ ...btn, padding: '6px 10px', fontSize: 11.5, fontFamily: 'inherit', fontWeight: 600, background: on ? RED_BG : 'transparent', color: on ? RED : 'var(--text-3)', borderColor: on ? RED : 'var(--line)' }}
                    >
                      {g.label}
                    </button>
                  )
                })}
              </div>
              {gateOn >= 2 && (
                <div style={{ fontSize: 12.5, marginTop: 8, color: gateOn >= 3 ? RED : AMBER, fontWeight: 600 }}>
                  {gateOn >= 3 ? data.gate.warn3 : data.gate.warn2}
                </div>
              )}
            </div>

            {/* 부위 선택 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {splits.map((s) => (
                <button
                  key={s.k}
                  onClick={() => patch({ split: split === s.k ? '' : s.k })}
                  style={{ ...btn, padding: '7px 12px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, background: split === s.k ? 'var(--accent)' : 'transparent', color: split === s.k ? 'var(--accent-text)' : 'var(--text-2)', borderColor: split === s.k ? 'var(--accent)' : 'var(--line)' }}
                >
                  {s.name}
                  {s.k === suggested && split !== s.k && <span style={{ opacity: 0.55, marginLeft: 4, fontSize: 10 }}>제안</span>}
                </button>
              ))}
            </div>
            {split && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.5 }}>
                {splits.find((s) => s.k === split)?.focus}
                {splits.find((s) => s.k === split)?.extra && (
                  <span style={{ color: 'var(--text-3)' }}> · {splits.find((s) => s.k === split).extra}</span>
                )}
              </div>
            )}

            {/* 리프트 기록 */}
            {lifts.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  value={l.ex}
                  placeholder="종목"
                  onChange={(e) => patch({ lifts: lifts.map((x, j) => (j === i ? { ...x, ex: e.target.value } : x)) })}
                  style={{ ...field, flex: 1.6, minWidth: 0 }}
                />
                <input
                  value={l.wt}
                  placeholder="무게"
                  onChange={(e) => patch({ lifts: lifts.map((x, j) => (j === i ? { ...x, wt: e.target.value } : x)) })}
                  style={{ ...field, flex: 1, minWidth: 0, font: "500 12px 'JetBrains Mono'" }}
                />
                <input
                  value={l.sets}
                  placeholder="세트×회"
                  onChange={(e) => patch({ lifts: lifts.map((x, j) => (j === i ? { ...x, sets: e.target.value } : x)) })}
                  style={{ ...field, flex: 1, minWidth: 0, font: "500 12px 'JetBrains Mono'" }}
                />
                <button style={{ ...btn, padding: '0 9px' }} onClick={() => patch({ lifts: lifts.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button style={{ ...btn, padding: '7px 12px', width: '100%' }} onClick={() => patch({ lifts: [...lifts, { ex: '', wt: '', sets: '' }] })}>
              + 종목 추가
            </button>

            {/* 러닝 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>🏃 {data.program.run.name}</span>
              <input value={run.km || ''} placeholder="km" inputMode="decimal" onChange={(e) => patch({ run: { ...run, km: e.target.value } })} style={{ ...field, width: 64, font: "500 12px 'JetBrains Mono'" }} />
              <input value={run.min || ''} placeholder="분" inputMode="numeric" onChange={(e) => patch({ run: { ...run, min: e.target.value } })} style={{ ...field, width: 56, font: "500 12px 'JetBrains Mono'" }} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 5, lineHeight: 1.5 }}>{data.program.run.detail}</div>
          </div>

          {/* 밤 */}
          <div>
            <div style={{ font: mono, color: 'var(--text-3)', marginBottom: 4 }}>🌙 밤</div>
            {data.checklist.night.map((it) => (
              <CheckRow key={it.k} item={it} entry={entry} onToggle={toggle} onTime={setTime} />
            ))}
          </div>
        </div>
      </Card>

      {/* ── 3. 주간 그리드 ── */}
      <Card>
        <CardHead title="주간 그리드" caption="이번 주 월~일" />
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 430 }}>
            <div style={{ display: 'flex', paddingBottom: 8 }}>
              <span style={{ width: 86 }} />
              {gridDays.map((d, i) => (
                <span key={i} style={{ flex: 1, textAlign: 'center', font: "600 11px 'JetBrains Mono'", color: dayKey(d) === dayKey(new Date()) ? 'var(--text)' : 'var(--text-3)' }}>
                  {WEEKDAYS[d.getDay()]}
                  <br />
                  {d.getDate()}
                </span>
              ))}
            </div>
            {gridItems.map((gi) => (
              <div key={gi.k} style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ width: 86, fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{gi.name}</span>
                {gridDays.map((d, i) => {
                  const e = log[dayKey(d)] || EMPTY
                  const future = dayKey(d) > dayKey(new Date())
                  let on = false
                  if (gi.kind === 'workout') on = (e.lifts || []).some((l) => l.ex) || !!(e.run || EMPTY).km
                  else on = !!(e.checks || EMPTY)[gi.k]
                  return (
                    <span key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: on ? 'var(--accent)' : future ? 'transparent' : 'var(--surface2)', border: on ? 'none' : '1px solid var(--line)', opacity: future ? 0.35 : 1 }} />
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 4. 인바디 추이 ── */}
      <Card>
        <CardHead title="인바디 추이" caption={`목표 ${data.targets.w}kg · 골격근 ${data.targets.smm}kg · 체지방 ${data.targets.pbf}%`} />
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <TrendChart label="체중" unit="kg" color="var(--accent)" target={data.targets.w} points={inbodyRows.filter((r) => r.w).map((r) => ({ d: r.d, v: r.w }))} />
          <TrendChart label="골격근량" unit="kg" color="#3b9eff" target={data.targets.smm} points={inbodyRows.filter((r) => r.smm).map((r) => ({ d: r.d, v: r.smm }))} />
          <TrendChart label="체지방률" unit="%" color={AMBER} target={data.targets.pbf} points={inbodyRows.filter((r) => r.pbf).map((r) => ({ d: r.d, v: r.pbf }))} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={ibDraft.d} onChange={(e) => setIbDraft({ ...ibDraft, d: e.target.value })} style={{ ...field, font: "500 12px 'JetBrains Mono'" }} />
          <input value={ibDraft.w} placeholder="체중" inputMode="decimal" onChange={(e) => setIbDraft({ ...ibDraft, w: e.target.value })} style={{ ...field, width: 70, font: "500 12px 'JetBrains Mono'" }} />
          <input value={ibDraft.smm} placeholder="골격근" inputMode="decimal" onChange={(e) => setIbDraft({ ...ibDraft, smm: e.target.value })} style={{ ...field, width: 70, font: "500 12px 'JetBrains Mono'" }} />
          <input value={ibDraft.pbf} placeholder="체지방%" inputMode="decimal" onChange={(e) => setIbDraft({ ...ibDraft, pbf: e.target.value })} style={{ ...field, width: 74, font: "500 12px 'JetBrains Mono'" }} />
          <button style={{ ...btn, padding: '9px 16px' }} onClick={addInbody}>추가</button>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>눈바디·수행능력이 우선, 숫자는 참고</span>
        </div>
      </Card>

      {/* ── 5. 훈련 프로그램 ── */}
      <Card>
        <CardHead title="훈련 프로그램" caption="주 5분할 + Zone2" />
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.55 }}>{data.program.note}</div>
        {splits.map((s) => (
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
      </Card>

      <div style={two}>
        {/* ── 6. 일요일 리뷰 ── */}
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

        {/* ── 7. 하드 룰 · 오픈 이슈 ── */}
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
