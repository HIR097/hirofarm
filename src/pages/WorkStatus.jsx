import { useState } from 'react'
import { WORK_TITLE_DATE } from '../data/worklog.js'
import { mono, DueChip, BLUE } from '../components/ui.jsx'
import { IconPlus, IconClose, IconDrag } from '../components/icons.jsx'
import AddTaskModal from '../components/AddTaskModal.jsx'

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
        font: "500 13px 'Pretendard Variable'",
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

// 개별 업무 카드 — 드래그 가능, 다른 카드 위에 드롭하면 그 앞에 삽입.
function TaskCard({ task, dragging, onDragStart, onDragEnd, onDropBefore, onRemove }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', task.id)
        onDragStart(task.id)
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDropBefore(task.id)
      }}
      style={{
        position: 'relative',
        background: task.urgent ? URGENT_BG : 'var(--surface)',
        border: `1px solid ${task.urgent ? 'rgba(229,72,77,.35)' : 'var(--line)'}`,
        borderLeft: `3px solid ${task.urgent ? URGENT : 'var(--line)'}`,
        borderRadius: 15,
        boxShadow: 'var(--shadow)',
        padding: '14px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        cursor: 'grab',
        opacity: dragging ? 0.4 : 1,
        transition: 'opacity .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ color: 'var(--text-3)', marginTop: 2, flex: 'none' }}>
          <IconDrag />
        </span>
        <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, flex: 1 }}>{task.title}</span>
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
        <button onClick={() => onRemove(task.id)} style={removeBtn} aria-label="삭제" title="삭제">
          <IconClose size={13} />
        </button>
      </div>

      {task.desc?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 22 }}>
          {task.desc.map((line, i) => (
            <div key={i} style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45, display: 'flex', gap: 7 }}>
              <span style={{ color: 'var(--text-3)', flex: 'none' }}>·</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}

      {task.due && (
        <div style={{ marginTop: 2, paddingLeft: 22 }}>
          <DueChip value={task.due} />
        </div>
      )}
    </div>
  )
}

// 펀드 1개 = 컬럼 1열 (엑셀 구조). 컬럼 자체가 드롭 영역.
function FundColumn({ asset, dragging, onDragStart, onDragEnd, moveTask, removeTask, onAdd }) {
  const [over, setOver] = useState(false)
  const { total, urgent } = assetTotals(asset)

  const handleColumnDrop = (e) => {
    e.preventDefault()
    setOver(false)
    if (dragging) moveTask(dragging, asset.key, null) // 컬럼 끝으로
  }
  const handleCardDropBefore = (beforeId) => {
    if (dragging) moveTask(dragging, asset.key, beforeId)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setOver(false)
      }}
      onDrop={handleColumnDrop}
      style={{
        flex: 'none',
        width: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: over ? 'var(--surface2)' : 'transparent',
        border: `1.5px dashed ${over ? BLUE : 'transparent'}`,
        borderRadius: 16,
        padding: 8,
        transition: 'background .15s, border-color .15s',
      }}
    >
      {/* 컬럼 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 4px' }}>
        <span style={{ width: 4, height: 16, borderRadius: 99, background: 'var(--accent)', flex: 'none' }} />
        <span style={{ fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.name}
        </span>
        <span style={{ font: mono, color: 'var(--text-3)' }}>{total}</span>
        {urgent > 0 && (
          <span style={{ font: "600 10px 'JetBrains Mono'", background: URGENT, color: '#fff', borderRadius: 999, padding: '1px 7px' }}>
            긴급 {urgent}
          </span>
        )}
      </div>

      {/* 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 60 }}>
        {asset.tasks.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '18px 0', border: '1px dashed var(--line)', borderRadius: 12 }}>
            여기로 끌어다 놓기
          </div>
        )}
        {asset.tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            dragging={dragging === t.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDropBefore={handleCardDropBefore}
            onRemove={removeTask}
          />
        ))}
      </div>

      {/* 컬럼별 빠른 추가 */}
      <button onClick={() => onAdd(asset.key)} style={addInColumn}>
        + 업무 추가
      </button>
    </div>
  )
}

export default function WorkStatus({ work }) {
  const { assets, addTask, removeTask, moveTask } = work
  const [active, setActive] = useState('all') // 'all' | asset.key
  const [dragging, setDragging] = useState(null)
  const [modalKey, setModalKey] = useState(null) // 추가 모달 대상 펀드 (열림 여부 겸용)
  const [modalOpen, setModalOpen] = useState(false)

  const totalTasks = assets.reduce((s, a) => s + a.tasks.length, 0)
  const totalUrgent = assets.reduce((s, a) => s + a.tasks.filter((t) => t.urgent).length, 0)
  const shown = active === 'all' ? assets : assets.filter((a) => a.key === active)

  const openModal = (key) => {
    setModalKey(key || null)
    setModalOpen(true)
  }

  return (
    <div style={{ ...fade, marginTop: 8, position: 'relative' }}>
      {/* 헤더: 기준일 + 합계 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: "600 11px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)' }}>
          업무 관리표 ·{' '}
          <span style={{ color: BLUE, fontWeight: 700 }}>{WORK_TITLE_DATE}</span> · 자산별 업무 현황
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <FilterButton active={active === 'all'} onClick={() => setActive('all')} label="전체" total={totalTasks} urgent={totalUrgent} />
        {assets.map((a) => {
          const { total, urgent } = assetTotals(a)
          return <FilterButton key={a.key} active={active === a.key} onClick={() => setActive(a.key)} label={a.name} total={total} urgent={urgent} />
        })}
      </div>

      {/* 칸반 보드: 펀드당 한 열, 가로 스크롤 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 16 }}>
        {shown.map((a) => (
          <FundColumn
            key={a.key}
            asset={a}
            dragging={dragging}
            onDragStart={setDragging}
            onDragEnd={() => setDragging(null)}
            moveTask={moveTask}
            removeTask={removeTask}
            onAdd={openModal}
          />
        ))}
      </div>

      {/* 우하단 + 플로팅 버튼 */}
      <button onClick={() => openModal(active === 'all' ? null : active)} style={fab} aria-label="업무 추가" title="업무 추가">
        <IconPlus />
      </button>

      {modalOpen && (
        <AddTaskModal
          assets={assets}
          defaultKey={modalKey}
          onClose={() => setModalOpen(false)}
          onSubmit={addTask}
        />
      )}
    </div>
  )
}

const removeBtn = {
  flex: 'none',
  width: 24,
  height: 24,
  borderRadius: 7,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-3)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const addInColumn = {
  width: '100%',
  padding: '9px 0',
  borderRadius: 11,
  border: '1px dashed var(--line)',
  background: 'transparent',
  color: 'var(--text-3)',
  font: "600 12px 'Pretendard Variable'",
  cursor: 'pointer',
}

// 우하단 고정 플로팅 액션 버튼.
const fab = {
  position: 'fixed',
  right: 28,
  bottom: 28,
  width: 58,
  height: 58,
  borderRadius: 999,
  border: 'none',
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  boxShadow: '0 6px 20px rgba(8,8,12,.28)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
}
