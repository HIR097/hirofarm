import { useState } from 'react'
import { WORK_ASSETS, WORK_TITLE_DATE } from '../data/worklog.js'
import { mono } from '../components/ui.jsx'

const fade = { animation: 'hyFade .4s ease' }
// 긴급은 액센트와 무관하게 항상 빨간색으로 읽혀야 하므로 고정 색상 사용.
const URGENT = '#e5484d'
const URGENT_BG = 'rgba(229,72,77,.08)'

function assetTotals(asset) {
  const urgent = asset.tasks.filter((t) => t.urgent).length
  return { total: asset.tasks.length, urgent }
}

// 상단 자산 필터 버튼
function FilterButton({ active, onClick, label, total, urgent }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        font: "500 13px 'Space Grotesk'",
        border: `1px solid ${active ? 'transparent' : 'var(--line)'}`,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--accent-text)' : 'var(--text-2)',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      {total != null && (
        <span style={{ font: "600 11px 'JetBrains Mono'", opacity: active ? 0.85 : 0.6 }}>{total}</span>
      )}
      {urgent > 0 && (
        <span
          style={{
            font: "600 10px 'JetBrains Mono'",
            background: active ? 'rgba(255,255,255,.22)' : URGENT,
            color: '#fff',
            borderRadius: 999,
            padding: '1px 6px',
          }}
        >
          긴급 {urgent}
        </span>
      )}
    </button>
  )
}

// 개별 업무 카드
function TaskCard({ task }) {
  return (
    <div
      style={{
        background: task.urgent ? URGENT_BG : 'var(--surface)',
        border: `1px solid ${task.urgent ? 'rgba(229,72,77,.35)' : 'var(--line)'}`,
        borderLeft: `3px solid ${task.urgent ? URGENT : 'var(--line)'}`,
        borderRadius: 15,
        boxShadow: 'var(--shadow)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, flex: 1 }}>{task.title}</span>
        {task.urgent && (
          <span
            style={{
              flex: 'none',
              font: "600 10px 'JetBrains Mono'",
              letterSpacing: '.04em',
              background: URGENT,
              color: '#fff',
              borderRadius: 7,
              padding: '3px 8px',
            }}
          >
            긴급
          </span>
        )}
      </div>

      {task.desc?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {task.desc.map((line, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45, display: 'flex', gap: 7 }}>
              <span style={{ color: 'var(--text-3)', flex: 'none' }}>·</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}

      {task.due && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
          <span style={{ font: "600 10px 'JetBrains Mono'", color: 'var(--text-3)', letterSpacing: '.04em' }}>기한</span>
          <span
            style={{
              font: "600 11px 'JetBrains Mono'",
              padding: '2px 9px',
              borderRadius: 8,
              background: task.urgent ? URGENT : 'var(--surface2)',
              color: task.urgent ? '#fff' : 'var(--text-2)',
            }}
          >
            {task.due}
          </span>
        </div>
      )}
    </div>
  )
}

function AssetSection({ asset, showName }) {
  if (asset.tasks.length === 0) {
    return (
      <div>
        {showName && <SectionLabel asset={asset} />}
        <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 2px' }}>등록된 업무가 없습니다.</div>
      </div>
    )
  }
  return (
    <div>
      {showName && <SectionLabel asset={asset} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {asset.tasks.map((t, i) => (
          <TaskCard key={i} task={t} />
        ))}
      </div>
    </div>
  )
}

function SectionLabel({ asset }) {
  const { total, urgent } = assetTotals(asset)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
      <span style={{ width: 4, height: 16, borderRadius: 99, background: 'var(--accent)' }} />
      <span style={{ fontSize: 16, fontWeight: 700 }}>{asset.name}</span>
      <span style={{ font: mono, color: 'var(--text-3)' }}>{total}건</span>
      {urgent > 0 && (
        <span style={{ font: "600 10px 'JetBrains Mono'", background: URGENT, color: '#fff', borderRadius: 999, padding: '1px 7px' }}>
          긴급 {urgent}
        </span>
      )}
    </div>
  )
}

export default function WorkStatus() {
  const [active, setActive] = useState('all') // 'all' | asset.key

  const totalTasks = WORK_ASSETS.reduce((s, a) => s + a.tasks.length, 0)
  const totalUrgent = WORK_ASSETS.reduce((s, a) => s + a.tasks.filter((t) => t.urgent).length, 0)
  const shown = active === 'all' ? WORK_ASSETS : WORK_ASSETS.filter((a) => a.key === active)

  return (
    <div style={{ ...fade, marginTop: 8 }}>
      {/* 헤더: 기준일 + 합계 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)' }}>
          업무 관리표 · {WORK_TITLE_DATE} · 자산별 업무 현황
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-2)', background: 'var(--surface2)', borderRadius: 999, padding: '4px 11px' }}>
            전체 {totalTasks}건
          </span>
          <span style={{ font: "600 11px 'JetBrains Mono'", color: '#fff', background: URGENT, borderRadius: 999, padding: '4px 11px' }}>
            긴급 {totalUrgent}건
          </span>
        </div>
      </div>

      {/* 자산별 필터 버튼 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        <FilterButton active={active === 'all'} onClick={() => setActive('all')} label="전체" total={totalTasks} urgent={totalUrgent} />
        {WORK_ASSETS.map((a) => {
          const { total, urgent } = assetTotals(a)
          return <FilterButton key={a.key} active={active === a.key} onClick={() => setActive(a.key)} label={a.name} total={total} urgent={urgent} />
        })}
      </div>

      {/* 업무 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {shown.map((a) => (
          <AssetSection key={a.key} asset={a} showName={active === 'all'} />
        ))}
      </div>
    </div>
  )
}
