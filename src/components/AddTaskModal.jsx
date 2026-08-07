import { useState } from 'react'
import { IconClose } from './icons.jsx'
import { BLUE } from './ui.jsx'

// 업무 추가 폼 — 펀드 / 내용(제목·세부) / 일자 / 긴급여부.
export default function AddTaskModal({ assets, defaultKey, onClose, onSubmit }) {
  const [fundKey, setFundKey] = useState(defaultKey || assets[0]?.key || 'personal')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState('')
  const [urgent, setUrgent] = useState(false)

  const canSubmit = title.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    onSubmit(fundKey, {
      title: title.trim(),
      desc: desc
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      due: due.trim() || null,
      urgent,
    })
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(8,8,12,.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'hyFade .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 22,
          boxShadow: 'var(--shadow)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>업무 추가</div>
          <button onClick={onClose} style={iconBtn} aria-label="닫기">
            <IconClose />
          </button>
        </div>

        <Field label="펀드">
          <select value={fundKey} onChange={(e) => setFundKey(e.target.value)} style={inputStyle}>
            {assets.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="내용">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="업무 제목"
            style={inputStyle}
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="세부내용 (줄바꿈으로 여러 항목)"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>

        <Field label="일자">
          <input
            value={due}
            onChange={(e) => setDue(e.target.value)}
            placeholder="예: 6/26, 매주 목요일, 2026.06.30"
            style={{ ...inputStyle, color: due ? BLUE : 'var(--text)', fontWeight: due ? 700 : 400 }}
          />
        </Field>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#e5484d', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: urgent ? '#e5484d' : 'var(--text-2)' }}>긴급 업무로 표시</span>
        </label>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ ...btn, background: 'var(--surface2)', color: 'var(--text-2)' }}>
            취소
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              ...btn,
              background: canSubmit ? 'var(--accent)' : 'var(--surface2)',
              color: canSubmit ? 'var(--accent-text)' : 'var(--text-3)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            추가하기
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--text-3)' }}>{label}</span>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 11,
  border: '1px solid var(--line)',
  background: 'var(--bg2)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
}

const btn = {
  flex: 1,
  padding: '11px 0',
  borderRadius: 12,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const iconBtn = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--surface2)',
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
