import { IconSearch, IconSun, IconMoon } from './icons.jsx'

const pill = {
  display: 'flex',
  alignItems: 'center',
  borderRadius: 999,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  boxShadow: 'var(--shadow)',
}

export default function Header({ title, sub, isDark, onToggleTheme }) {
  return (
    <header
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        padding: '22px 28px 14px',
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</h1>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>{sub}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ ...pill, gap: 9, padding: '9px 14px' }}>
          <IconSearch />
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>검색…</span>
        </div>
        <div style={{ ...pill, gap: 8, padding: '9px 14px', color: 'var(--text)' }}>
          <IconSun size={16} />
          <span style={{ font: "600 13px 'JetBrains Mono'" }}>23°</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>서울</span>
        </div>
        <button
          onClick={onToggleTheme}
          aria-label="테마 전환"
          style={{
            width: 42,
            height: 42,
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
        <div
          style={{
            width: 42,
            height: 42,
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
      </div>
    </header>
  )
}
