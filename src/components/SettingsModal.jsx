import { ACCENTS } from '../theme.js'
import { IconSun } from './icons.jsx'
import { MENU_ITEMS } from './Sidebar.jsx'

// on/off 토글 스위치
function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 40,
        height: 23,
        borderRadius: 999,
        border: '1px solid var(--line)',
        background: on ? 'var(--accent)' : 'var(--surface2)',
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
        transition: 'background .15s',
        flex: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 19 : 2,
          width: 17,
          height: 17,
          borderRadius: '50%',
          background: on ? 'var(--accent-text)' : 'var(--text-3)',
          transition: 'left .15s',
        }}
      />
    </button>
  )
}

export default function SettingsModal({ accent, onPickAccent, onToggleTheme, hiddenMenus = [], onToggleMenu, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,8,12,.4)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        animation: 'hyFade .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: '92vw',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 24,
          boxShadow: '0 30px 80px rgba(0,0,0,.3)',
          padding: 26,
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.01em' }}>설정</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>테마 · 메뉴 표시 · 포인트 컬러</div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid var(--line)',
              background: 'var(--surface2)',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.08em', color: 'var(--text-3)', marginBottom: 11 }}>테마</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button
            onClick={onToggleTheme}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 13,
              borderRadius: 14,
              cursor: 'pointer',
              border: '1px solid var(--line)',
              background: 'var(--surface2)',
              font: "500 13px 'Pretendard Variable'",
              color: 'var(--text)',
            }}
          >
            <IconSun size={17} />
            라이트 / 다크 전환
          </button>
        </div>

        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.08em', color: 'var(--text-3)', marginBottom: 11 }}>
          메뉴 표시
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--line)',
            borderRadius: 15,
            marginBottom: 24,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {MENU_ITEMS.map((it, i) => {
            const visible = !hiddenMenus.includes(it.key)
            return (
              <div
                key={it.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 14px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  color: visible ? 'var(--text)' : 'var(--text-3)',
                }}
              >
                <it.Icon />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{it.label}</span>
                <Toggle on={visible} onClick={() => onToggleMenu?.(it.key)} />
              </div>
            )
          })}
        </div>

        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.08em', color: 'var(--text-3)', marginBottom: 11 }}>
          포인트 컬러
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
          {Object.entries(ACCENTS).map(([key, a]) => {
            const active = accent === key
            return (
              <button
                key={key}
                onClick={() => onPickAccent(key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 6px',
                  borderRadius: 15,
                  cursor: 'pointer',
                  background: active ? 'var(--surface2)' : 'transparent',
                  border: `1px solid ${active ? 'var(--text)' : 'var(--line)'}`,
                  font: "500 11px 'Pretendard Variable'",
                  color: active ? 'var(--text)' : 'var(--text-2)',
                  transition: 'all .15s',
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)',
                    background: a.bg || 'linear-gradient(135deg,#0d0d0f 0 50%,#e8e8ea 50% 100%)',
                  }}
                />
                <span>{a.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
