import { IconHome, IconStatus, IconSchedule, IconCalendar, IconNote, IconSettings } from './icons.jsx'

const NAV = [
  { key: 'home', label: '메인', Icon: IconHome },
  { key: 'status', label: '업무현황', Icon: IconStatus },
  { key: 'fund', label: '펀드 연간일정', Icon: IconSchedule },
  { key: 'calendar', label: '달력', Icon: IconCalendar },
  { key: 'scratch', label: '낙서장', Icon: IconNote },
]

function navItemStyle(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    padding: '11px 13px',
    borderRadius: 13,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background .15s, color .15s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--accent-text)' : 'var(--text-2)',
  }
}

export default function Sidebar({ tab, onNavigate, onOpenSettings }) {
  return (
    <aside
      style={{
        width: 250,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 18px',
        borderRight: '1px solid var(--line)',
        background: 'var(--bg2)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 22px' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          하
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>정하윤</div>
          <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)', letterSpacing: '.04em' }}>LIFE OS</div>
        </div>
      </div>

      <div style={{ font: "600 10px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)', padding: '6px 10px 8px' }}>
        메뉴
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {NAV.map(({ key, label, Icon }) => (
          <div key={key} onClick={() => onNavigate(key)} style={navItemStyle(tab === key)}>
            <Icon />
            <span>{label}</span>
          </div>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div onClick={onOpenSettings} style={navItemStyle(false)}>
        <IconSettings />
        <span>설정</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          marginTop: 8,
          padding: 10,
          borderRadius: 15,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background:
              'repeating-linear-gradient(45deg,var(--surface2),var(--surface2) 6px,var(--line) 6px,var(--line) 12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: 'var(--text-2)',
          }}
        >
          H
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Hiro</div>
          <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)' }}>온라인</div>
        </div>
      </div>
    </aside>
  )
}
