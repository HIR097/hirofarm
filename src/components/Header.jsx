import { IconSearch, IconSun, IconMoon } from './icons.jsx'

const pill = {
  display: 'flex',
  alignItems: 'center',
  borderRadius: 999,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  boxShadow: 'var(--shadow)',
}

function IconMenu({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export default function Header({ title, sub, isDark, onToggleTheme, mobile, onOpenMenu }) {
  const round = mobile ? 36 : 42

  return (
    <header
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: mobile ? 10 : 20,
        padding: mobile ? '14px 14px 10px' : '22px 28px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {mobile && (
          <button
            onClick={onOpenMenu}
            aria-label="메뉴 열기"
            style={{
              width: round,
              height: round,
              flex: 'none',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconMenu />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: mobile ? 20 : 27,
              fontWeight: 700,
              letterSpacing: '-.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h1>
          {!mobile && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>{sub}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
        {/* 좁은 화면에서는 검색·날씨 알약을 숨긴다 */}
        {!mobile && (
          <>
            <div style={{ ...pill, gap: 9, padding: '9px 14px' }}>
              <IconSearch />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>검색…</span>
            </div>
            <div style={{ ...pill, gap: 8, padding: '9px 14px', color: 'var(--text)' }}>
              <IconSun size={16} />
              <span style={{ font: "600 13px 'JetBrains Mono'" }}>23°</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>서울</span>
            </div>
          </>
        )}
        <button
          onClick={onToggleTheme}
          aria-label="테마 전환"
          style={{
            width: round,
            height: round,
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
          }}
        >
          {isDark ? <IconSun /> : <IconMoon />}
        </button>
        {!mobile && (
          <div
            style={{
              width: round,
              height: round,
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            H
          </div>
        )}
      </div>
    </header>
  )
}
