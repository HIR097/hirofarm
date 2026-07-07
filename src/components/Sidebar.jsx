import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { IconHome, IconStatus, IconSchedule, IconCalendar, IconNote, IconSettings } from './icons.jsx'

const NAV = [
  { key: 'home', label: '메인', Icon: IconHome },
  { key: 'status', label: '업무현황', Icon: IconStatus },
  { key: 'fund', label: '펀드 연간일정', Icon: IconSchedule },
  { key: 'calendar', label: '달력', Icon: IconCalendar },
  { key: 'scratch', label: '낙서장', Icon: IconNote },
]

function IconStack() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  )
}

function IconChevron({ dir }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: dir === 'right' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

// 프로젝트 페이지 — 대시보드 안에서 오버레이(iframe)로 바로 열린다
const PROJECTS = [
  { href: '/mangrove-building.html', label: '맹그로브 신촌', Icon: IconStack },
]

const RAIL = 64
const FULL = 250

function navItemStyle(active, slim) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: slim ? 'center' : 'flex-start',
    gap: slim ? 0 : 13,
    padding: slim ? '11px 0' : '11px 13px',
    borderRadius: 13,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background .15s, color .15s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--accent-text)' : 'var(--text-2)',
  }
}

function ProjectOverlay({ project, left, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left,
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
        style={{ flex: 1, width: '100%', border: 0, background: 'var(--bg)' }}
      />
    </div>
  )
}

export default function Sidebar({ tab, onNavigate, onOpenSettings }) {
  const [proj, setProj] = useState(null)
  const [sideOpen, setSideOpen] = useLocalStorage('hy_sidebar', 'open')
  const slim = sideOpen !== 'open'
  const width = slim ? RAIL : FULL

  const navigate = (key) => {
    setProj(null)
    onNavigate(key)
  }

  const groupLabel = (text) =>
    slim ? (
      <div style={{ height: 1, background: 'var(--line)', margin: '14px 6px 10px' }} />
    ) : (
      <div style={{ font: "600 10px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)', padding: '6px 10px 8px' }}>
        {text}
      </div>
    )

  return (
    <aside
      style={{
        width,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: slim ? '24px 10px' : '24px 18px',
        borderRight: '1px solid var(--line)',
        background: 'var(--bg2)',
        transition: 'width .2s, padding .2s',
      }}
    >
      {/* Brand + collapse toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: slim ? '4px 0 18px' : '4px 8px 22px', justifyContent: slim ? 'center' : 'flex-start' }}>
        <div
          onClick={slim ? () => setSideOpen('open') : undefined}
          title={slim ? '사이드바 펼치기' : undefined}
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
            cursor: slim ? 'pointer' : 'default',
            flex: 'none',
          }}
        >
          하
        </div>
        {!slim && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>정하윤</div>
              <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--text-3)', letterSpacing: '.04em' }}>LIFE OS</div>
            </div>
            <button
              onClick={() => setSideOpen('closed')}
              title="사이드바 접기"
              style={{
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--text-3)',
                borderRadius: 9,
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flex: 'none',
              }}
            >
              <IconChevron dir="left" />
            </button>
          </>
        )}
      </div>

      {groupLabel('메뉴')}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {NAV.map(({ key, label, Icon }) => (
          <div key={key} onClick={() => navigate(key)} title={slim ? label : undefined} style={navItemStyle(!proj && tab === key, slim)}>
            <Icon />
            {!slim && <span>{label}</span>}
          </div>
        ))}
      </nav>

      {groupLabel('프로젝트')}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {PROJECTS.map((p) => (
          <div key={p.href} onClick={() => setProj(p)} title={slim ? p.label : undefined} style={navItemStyle(proj?.href === p.href, slim)}>
            <p.Icon />
            {!slim && <span>{p.label}</span>}
          </div>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {slim && (
        <div onClick={() => setSideOpen('open')} title="사이드바 펼치기" style={navItemStyle(false, true)}>
          <IconChevron dir="right" />
        </div>
      )}
      <div onClick={onOpenSettings} title={slim ? '설정' : undefined} style={navItemStyle(false, slim)}>
        <IconSettings />
        {!slim && <span>설정</span>}
      </div>
      {!slim && (
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
      )}

      {proj && <ProjectOverlay project={proj} left={width} onClose={() => setProj(null)} />}
    </aside>
  )
}
