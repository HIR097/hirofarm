import { useState } from 'react'
import { IconHome, IconStatus, IconSchedule, IconCalendar, IconNote, IconSettings } from './icons.jsx'

const NAV = [
  { key: 'home', label: '메인', Icon: IconHome },
  { key: 'status', label: '업무현황', Icon: IconStatus },
  { key: 'fund', label: '펀드 연간일정', Icon: IconSchedule },
  { key: 'calendar', label: '달력', Icon: IconCalendar },
  { key: 'scratch', label: '낙서장', Icon: IconNote },
]

function IconBuilding() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
      <path d="M15 9h4a1 1 0 0 1 1 1v11" />
      <path d="M2 21h20" />
      <path d="M8 8h3M8 12h3M8 16h3" />
    </svg>
  )
}

function IconStack() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  )
}

// 프로젝트 페이지 — 대시보드 안에서 오버레이(iframe)로 바로 열린다
const PROJECTS = [
  { href: '/mangrove-building.html', label: '건물 시뮬레이션', Icon: IconStack },
  { href: '/mangrove-sim.html', label: '분양 시뮬레이션', Icon: IconBuilding },
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

function ProjectOverlay({ project, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 250,
        right: 0,
        bottom: 0,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg2)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>{project.label}</span>
        <span style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)', letterSpacing: '.06em' }}>
          CONFIDENTIAL · 내부용
        </span>
        <div style={{ flex: 1 }} />
        <a
          href={project.href}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}
        >
          새 탭에서 열기 ↗
        </a>
        <button
          onClick={onClose}
          style={{
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--text-2)',
            borderRadius: 8,
            padding: '3px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          닫기 ✕
        </button>
      </div>
      <iframe
        src={project.href}
        title={project.label}
        style={{ flex: 1, width: '100%', border: 0, background: '#0c1322' }}
      />
    </div>
  )
}

export default function Sidebar({ tab, onNavigate, onOpenSettings }) {
  const [proj, setProj] = useState(null)

  const navigate = (key) => {
    setProj(null)
    onNavigate(key)
  }

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
          <div key={key} onClick={() => navigate(key)} style={navItemStyle(!proj && tab === key)}>
            <Icon />
            <span>{label}</span>
          </div>
        ))}
      </nav>

      <div style={{ font: "600 10px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)', padding: '18px 10px 8px' }}>
        프로젝트
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {PROJECTS.map((p) => (
          <div key={p.href} onClick={() => setProj(p)} style={navItemStyle(proj?.href === p.href)}>
            <p.Icon />
            <span>{p.label}</span>
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

      {proj && <ProjectOverlay project={proj} onClose={() => setProj(null)} />}
    </aside>
  )
}
