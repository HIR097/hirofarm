import { useState } from 'react'
import { SCHEDULE_CATEGORIES, FUND_SCHEDULE, scheduleForMonth } from '../data/fundSchedule.js'
import { card, mono, Card, CardHead } from '../components/ui.jsx'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
// 오늘이 2026-06 이므로 기본 6월. (Date 미사용 — 고정 기본값)
const DEFAULT_MONTH = 6

function CategoryDot({ category }) {
  const c = SCHEDULE_CATEGORIES[category]
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color, flex: 'none' }} />
}

export default function FundSchedule() {
  const [month, setMonth] = useState(DEFAULT_MONTH)
  const items = scheduleForMonth(month)

  return (
    <div style={{ ...fade }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)' }}>
          {/* 운용사명도 암호화 대상이라 secure/labels.js 에서 가져온다 */}
          {(typeof window !== 'undefined' && window.__HY_DATA__?.labels?.fundOwner) || ''} · Monthly
          Routine Schedule
        </div>
        {/* 범례 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {Object.entries(SCHEDULE_CATEGORIES).map(([key, c]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* 월 선택 버튼 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
        {MONTHS.map((m) => {
          const active = m === month
          const count = scheduleForMonth(m).length
          return (
            <button
              key={m}
              onClick={() => setMonth(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                cursor: 'pointer',
                font: "600 13px 'JetBrains Mono'",
                border: `1px solid ${active ? 'transparent' : 'var(--line)'}`,
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accent-text)' : 'var(--text-2)',
                transition: 'all .15s',
              }}
            >
              {m}월
              <span style={{ fontSize: 11, opacity: active ? 0.85 : 0.55 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* 선택 월 일정 — 일자 기준 정렬 */}
      <Card>
        <CardHead title={`${month}월 일정`} caption={`총 ${items.length}건 · 일자순`} mb={16} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((it, i) => {
            const c = SCHEDULE_CATEGORIES[it.category]
            const recurring = it.months.length === 0
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '13px 4px',
                  borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                {/* 일자 */}
                <div style={{ flex: 'none', width: 48, textAlign: 'center' }}>
                  <div style={{ font: "700 18px 'JetBrains Mono'" }}>{it.day}</div>
                  <div style={{ font: "500 9px 'JetBrains Mono'", color: 'var(--text-3)' }}>일</div>
                </div>
                <CategoryDot category={it.category} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{it.title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{it.asset}</span>
                    <span style={{ font: "500 10px 'JetBrains Mono'", color: c.color }}>{c.label}</span>
                    {recurring && (
                      <span style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)', background: 'var(--surface2)', borderRadius: 6, padding: '1px 6px' }}>
                        매월 반복
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {items.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)', padding: 8 }}>해당 월 일정이 없습니다.</div>}
        </div>
      </Card>

      {/* 연간 개요 — 월 × 항목 매트릭스 (요약) */}
      <div style={{ ...card, marginTop: 18, overflowX: 'auto' }}>
        <CardHead title="연간 개요" caption="월별 루틴 분포" mb={16} />
        <div style={{ minWidth: 720 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px repeat(12, 1fr)', gap: 4, alignItems: 'center' }}>
            <div />
            {MONTHS.map((m) => (
              <div key={m} style={{ textAlign: 'center', font: "600 10px 'JetBrains Mono'", color: 'var(--text-3)' }}>{m}</div>
            ))}
            {FUND_SCHEDULE.map((it, idx) => (
              <Row key={idx} it={it} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ it }) {
  const c = SCHEDULE_CATEGORIES[it.category]
  const recurring = it.months.length === 0
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, padding: '4px 0' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flex: 'none' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
      </div>
      {MONTHS.map((m) => {
        const on = recurring || it.months.includes(m)
        return (
          <div key={m} style={{ textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                borderRadius: 5,
                background: on ? c.color : 'var(--surface2)',
                opacity: on ? (recurring ? 0.55 : 1) : 1,
              }}
            />
          </div>
        )
      })}
    </>
  )
}
