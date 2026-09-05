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

// ── 계획 vs 실측 차트 (인바디) ──
// 참고: 분기별 점유율 추이 차트 — 점선 = 계획, 실선 = 실측, 커서 올리면 그 달 수치.
// 배경 밴드로 벌크/컷 구간을 깔아 "지금 뭘 하는 달인지" 가 한눈에 보이게 한다.
const BULK_BG = 'rgba(59,158,255,.07)'
const CUT_BG = 'rgba(245,158,11,.07)'
const H = 168
const PAD = { t: 14, r: 12, b: 22, l: 38 }

const monthIdx = (d) => {
  const [y, m] = String(d).slice(0, 7).split('-').map(Number)
  return y * 12 + (m - 1)
}
// 'YYYY-MM-DD' 는 일 단위까지 반영해 실측점을 정확한 위치에 찍는다
const monthPos = (d) => {
  const day = Number(String(d).slice(8, 10)) || 1
  return monthIdx(d) + (day - 1) / 30
}

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function PlanChart({ label, unit, color, field, plan, phases, actual, target, digits = 1 }) {
  const [wrap, W] = useWidth()
  const [hover, setHover] = useState(null)

  // 계획은 26-08 부터지만 실측 이력은 그 이전에도 있다 — x축은 둘을 다 담는다
  const a0 = Math.min(monthIdx(plan[0].d), ...actual.map((r) => monthIdx(r.d)))
  const a1 = monthIdx(plan[plan.length - 1].d)
  const vals = [...plan.map((p) => p[field]), ...actual.map((r) => r.v)]
  if (target != null) vals.push(target)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = Math.max(0.001, hi - lo)
  const iw = Math.max(0, W - PAD.l - PAD.r)
  const x = (d) => PAD.l + ((monthPos(d) - a0) / (a1 - a0)) * iw
  const y = (v) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b)

  const planLine = plan.map((p) => `${x(p.d)},${y(p[field])}`).join(' ')
  const actLine = actual.map((r) => `${x(r.d)},${y(r.v)}`).join(' ')

  // 오늘 위치 + 호버 중인 달
  const today = new Date()
  const todayM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const hi3 = hover != null ? plan[hover] : null
  const hitAct = hi3 ? actual.find((r) => String(r.d).slice(0, 7) === hi3.d) : null
  const phaseOf = (d) => phases.find((ph) => monthIdx(d) >= monthIdx(ph.from) && monthIdx(d) < monthIdx(ph.to)) || phases[phases.length - 1]
  const fmt = (v) => v.toFixed(digits)

  const pick = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect()
    const f = (ev.clientX - r.left - PAD.l) / iw
    const i = Math.round(a0 + f * (a1 - a0) - monthIdx(plan[0].d))
    setHover(Math.max(0, Math.min(plan.length - 1, i)))
  }

  return (
    <div ref={wrap} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 2 }}>
        <span style={{ font: mono, color: 'var(--text-3)' }}>{label}</span>
        {actual.length > 0 && (
          <span style={{ fontSize: 19, fontWeight: 700 }}>
            {fmt(actual[actual.length - 1].v)}
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit}</span>
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="var(--text-3)" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
            계획
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={color} strokeWidth="2.5" /></svg>
            실측
          </span>
        </span>
      </div>

      {W > 0 && (
        <svg width={W} height={H} onMouseMove={pick} onMouseLeave={() => setHover(null)} style={{ display: 'block', cursor: 'crosshair' }}>
          {/* 벌크/컷 구간 밴드 */}
          {phases.map((ph) => (
            <g key={ph.name}>
              <rect x={x(ph.from)} y={PAD.t} width={Math.max(0, x(ph.to) - x(ph.from))} height={H - PAD.t - PAD.b} fill={ph.t === 'bulk' ? BULK_BG : CUT_BG} />
              <text x={(x(ph.from) + x(ph.to)) / 2} y={PAD.t - 4} textAnchor="middle" style={{ font: "600 9px 'JetBrains Mono'", fill: 'var(--text-3)' }}>
                {ph.name}
              </text>
            </g>
          ))}
          {/* y축 눈금 3줄 */}
          {[lo, lo + span / 2, hi].map((v, i) => (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" opacity=".5" />
              <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" style={{ font: "500 9px 'JetBrains Mono'", fill: 'var(--text-3)' }}>
                {fmt(v)}
              </text>
            </g>
          ))}
          {/* 목표선 */}
          {target != null && (
            <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} stroke={color} strokeWidth="1" strokeDasharray="2 4" opacity=".55" />
          )}
          {/* 오늘 */}
          <line x1={x(todayM)} x2={x(todayM)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-3)" strokeWidth="1" strokeDasharray="3 3" opacity=".7" />
          {/* 계획선 */}
          <polyline points={planLine} fill="none" stroke="var(--text-3)" strokeWidth="1.6" strokeDasharray="4 4" strokeLinejoin="round" />
          {/* 실측선 */}
          {actual.length > 1 && (
            <polyline points={actLine} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {actual.map((r, i) => (
            <circle key={i} cx={x(r.d)} cy={y(r.v)} r="3.4" fill={color} />
          ))}
          {/* 호버 */}
          {hi3 && (
            <g>
              <line x1={x(hi3.d)} x2={x(hi3.d)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-2)" strokeWidth="1" />
              <circle cx={x(hi3.d)} cy={y(hi3[field])} r="3.2" fill="var(--text-2)" />
              {hitAct && <circle cx={x(hitAct.d)} cy={y(hitAct.v)} r="4.5" fill="none" stroke={color} strokeWidth="2" />}
            </g>
          )}
          {/* x축 — 6개월마다 */}
          {Array.from({ length: Math.floor((a1 - a0) / 6) + 1 }, (_, i) => a0 + i * 6).map((m) => {
            const d = `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`
            return (
              <text key={d} x={x(d)} y={H - 6} textAnchor="middle" style={{ font: "500 9px 'JetBrains Mono'", fill: 'var(--text-3)' }}>
                {`'${d.slice(2, 4)}.${d.slice(5)}`}
              </text>
            )
          })}
        </svg>
      )}

      {hi3 && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(0, Math.min(W - 132, x(hi3.d) - 66)),
            top: 24,
            width: 132,
            pointerEvents: 'none',
            background: 'var(--surface2)',
            border: '1px solid var(--line)',
            borderRadius: 9,
            padding: '7px 9px',
            font: "500 10.5px 'JetBrains Mono'",
            boxShadow: '0 4px 14px rgba(0,0,0,.28)',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            {`'${hi3.d.slice(2, 4)}.${hi3.d.slice(5)}`}
            <span style={{ fontWeight: 500, color: 'var(--text-3)', marginLeft: 5 }}>{phaseOf(hi3.d)?.name || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)' }}>
            <span>계획</span>
            <span>{fmt(hi3[field])}{unit}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: hitAct ? color : 'var(--text-3)' }}>
            <span>실측</span>
            <span>{hitAct ? `${fmt(hitAct.v)}${unit}` : '—'}</span>
          </div>
          {hitAct && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, paddingTop: 3, borderTop: '1px solid var(--line)', color: 'var(--text-2)' }}>
              <span>차이</span>
              <span>{`${hitAct.v - hi3[field] >= 0 ? '+' : ''}${fmt(hitAct.v - hi3[field])}${unit}`}</span>
            </div>
          )}
        </div>
      )}
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

// ── 숫자(0~10) / 짧은 글 입력 — 타임라인 항목 type: 'num' | 'text'. 값은 times[k]에 문자열로 저장 ──
function ValueField({ kind, value, onCommit, placeholder, style }) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => setDraft(value || ''), [value])
  const commit = () => {
    let v = draft.trim()
    if (kind === 'num') {
      const d = v.replace(/[^\d]/g, '')
      v = d ? String(Math.min(10, parseInt(d, 10))) : ''
    }
    setDraft(v)
    onCommit(v)
  }
  return (
    <input
      type="text"
      inputMode={kind === 'num' ? 'numeric' : 'text'}
      placeholder={placeholder}
      value={draft}
      onChange={(ev) => setDraft(kind === 'num' ? ev.target.value.replace(/[^\d]/g, '').slice(0, 2) : ev.target.value.slice(0, 40))}
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
      {/* ── 인바디 추이 (맨 위, 26-09-06 사용자 요청) ── */}
      <Card>
        <CardHead title="인바디 추이" caption={`목표 ${data.targets.w}kg · 골격근 ${data.targets.smm}kg · 체지방 ${data.targets.pbf}% · ${data.plan.note}`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <PlanChart
            label="체중" unit="kg" color="var(--accent)" field="w" digits={1}
            plan={data.plan.points} phases={data.plan.phases} target={data.targets.w}
            actual={inbodyRows.filter((r) => r.w).map((r) => ({ d: r.d, v: r.w }))}
          />
          <PlanChart
            label="골격근량" unit="kg" color="#3b9eff" field="smm" digits={1}
            plan={data.plan.points} phases={data.plan.phases} target={data.targets.smm}
            actual={inbodyRows.filter((r) => r.smm).map((r) => ({ d: r.d, v: r.smm }))}
          />
          <PlanChart
            label="체지방률" unit="%" color={AMBER} field="pbf" digits={1}
            plan={data.plan.points} phases={data.plan.phases} target={data.targets.pbf}
            actual={inbodyRows.filter((r) => r.pbf).map((r) => ({ d: r.d, v: r.pbf }))}
          />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.6 }}>
          직접 입력하지 않는다 — InBody 앱 캡처를 주면 데이터에 추가되고, 점선(계획) 위/아래 어디에 찍히는지로 판단한다.
          <br />
          골격근 42.0 은 벌크 정점(28-11)에서 찍히고 8% 컷을 끝내면 41.8 로 내려온다 — 컷 구간에서 계획선이 꺾이는 건 정상이다.
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

    </div>
  )
}
