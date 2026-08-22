import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { IconHome, IconStatus, IconSchedule, IconCalendar, IconNote, IconFlame, IconSettings } from './icons.jsx'

// 페이지·프로젝트를 하나의 목록으로 관리 — 드래그로 자유롭게 섞을 수 있고,
// 설정에서 항목별로 표시/숨김을 켜고 끈다. (MENU_ITEMS는 SettingsModal에서도 사용)

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

function IconBody() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5v11" />
      <path d="M17.5 6.5v11" />
      <path d="M3 9v6" />
      <path d="M21 9v6" />
      <path d="M6.5 12h11" />
    </svg>
  )
}

function IconPulse() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  )
}

// 프로젝트 이름은 어떤 건을 다루는지 그대로 드러내므로(어느 물류센터 화재 대응인지 등)
// 라벨·태그를 코드에 두지 않고 secure/labels.js 에서 암호화해 들여온다.
const PROJ = (typeof window !== 'undefined' && window.__HY_DATA__?.labels?.menu) || {}
const proj = (key) => ({ label: PROJ[key]?.label || '프로젝트', tag: PROJ[key]?.tag || '' })

// type: 'page' → 탭 전환, 'project' → 오버레이(iframe)로 바로 열린다
export const MENU_ITEMS = [
  { key: 'calendar', label: '달력', Icon: IconCalendar, type: 'page' },
  { key: 'calorie', label: '칼로리', Icon: IconFlame, type: 'page' },
  { key: 'body', label: '몸', Icon: IconBody, type: 'page' },
  { key: 'scratch', label: '낙서장', Icon: IconNote, type: 'page' },
  { key: 'mangrove', ...proj('mangrove'), Icon: IconStack, type: 'project', href: '/mangrove-building.html' },
  { key: 'lovelab', ...proj('lovelab'), Icon: IconPulse, type: 'project', href: '/lovelab-followers.html' },
  { key: 'cbt', ...proj('cbt'), Icon: IconNote, type: 'project', href: '/cbt.html' },
  { key: 'plan', ...proj('plan'), Icon: IconSchedule, type: 'project', href: '/plan.html' },
]

const RAIL = 64
const FULL = 250

// 예전 메뉴/프로젝트 분리 저장(hy_nav_order, hy_proj_order)에서 한 번만 이어받는다
function legacyOrder() {
  try {
    if (localStorage.getItem('hy_menu_order')) return ''
    const nav = (localStorage.getItem('hy_nav_order') || '').split(',').filter(Boolean)
    const proj = (localStorage.getItem('hy_proj_order') || '')
      .split(',')
      .filter(Boolean)
      .map((href) => MENU_ITEMS.find((it) => it.href === href)?.key)
      .filter(Boolean)
    return nav.length || proj.length ? [...nav, ...proj].join(',') : ''
  } catch {
    return ''
  }
}

// 드래그 앤 드롭 순서 변경 — 저장된 순서(localStorage, 콤마 구분 키) 우선, 새 항목은 뒤에 붙는다
function useOrdered(storageKey, items, keyOf) {
  const [orderStr, setOrderStr] = useLocalStorage(storageKey, legacyOrder())
  const saved = orderStr ? orderStr.split(',') : []
  const ordered = [
    ...saved.map((k) => items.find((it) => keyOf(it) === k)).filter(Boolean),
    ...items.filter((it) => !saved.includes(keyOf(it))),
  ]
  const move = (fromKey, toKey) => {
    const keys = ordered.map(keyOf)
    const from = keys.indexOf(fromKey)
    const to = keys.indexOf(toKey)
    if (from < 0 || to < 0 || from === to) return
    keys.splice(to, 0, keys.splice(from, 1)[0])
    setOrderStr(keys.join(','))
  }
  return [ordered, move]
}

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
          {project.tag}
        </span>
        <div style={{ flex: 1 }} />
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

export default function Sidebar({ tab, onNavigate, onOpenSettings, mobile, drawerOpen, onCloseDrawer, hidden = [] }) {
  const [proj, setProj] = useState(null)
  const [sideOpen, setSideOpen] = useLocalStorage('hy_sidebar', 'open')
  const [drag, setDrag] = useState(null) // 드래그 중인 항목 key
  const [menuItems, moveItem] = useOrdered('hy_menu_order', MENU_ITEMS, (it) => it.key)
  const visibleItems = menuItems.filter((it) => !hidden.includes(it.key))
  // 모바일에서는 접기 상태를 무시하고 항상 펼친 드로어로 뜬다
  const slim = mobile ? false : sideOpen !== 'open'
  const width = mobile ? 264 : slim ? RAIL : FULL

  // 페이지·프로젝트 구분 없이 하나의 목록 안에서 자유롭게 순서를 바꾼다
  const dragProps = (key) => ({
    draggable: true,
    onDragStart: (e) => {
      setDrag(key)
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragOver: (e) => {
      if (drag) {
        e.preventDefault()
        if (drag !== key) moveItem(drag, key)
      }
    },
    onDragEnd: () => setDrag(null),
  })

  const navigate = (key) => {
    setProj(null)
    onNavigate(key)
    if (mobile) onCloseDrawer?.()
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
        transition: mobile ? 'left .22s ease' : 'width .2s, padding .2s',
        // 모바일: 화면 밖에서 밀려 들어오는 드로어.
        // transform 대신 left 로 움직인다 — transform 을 쓰면 내부의 position:fixed
        // 프로젝트 오버레이가 이 요소를 기준으로 잡혀 같이 화면 밖으로 밀려난다.
        ...(mobile
          ? {
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: drawerOpen ? 0 : -(width + 24),
              zIndex: 75,
              overflowY: 'auto',
              boxShadow: drawerOpen ? '0 0 40px rgba(0,0,0,.35)' : 'none',
            }
          : null),
      }}
    >
      {/* 접기 버튼 — 펼침 상태에서만. 슬림 상태의 펼치기 버튼은 하단에 있다.
          모바일에서는 드로어 닫기 버튼으로 쓴다 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: slim ? '4px 0 10px' : '4px 8px 14px' }}>
        {!slim && (
          <button
            onClick={() => (mobile ? onCloseDrawer?.() : setSideOpen('closed'))}
            title={mobile ? '메뉴 닫기' : '사이드바 접기'}
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
        )}
      </div>

      {groupLabel('메뉴')}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {visibleItems.map((it) => {
          const active = it.type === 'project' ? proj?.key === it.key : !proj && tab === it.key
          return (
            <div
              key={it.key}
              onClick={() => {
                if (it.type === 'project') {
                  setProj(it)
                  if (mobile) onCloseDrawer?.()
                } else {
                  navigate(it.key)
                }
              }}
              title={slim ? it.label : undefined}
              style={{ ...navItemStyle(active, slim), opacity: drag === it.key ? 0.45 : 1 }}
              {...dragProps(it.key)}
            >
              <it.Icon />
              {!slim && <span>{it.label}</span>}
            </div>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {slim && !mobile && (
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

      {proj && <ProjectOverlay project={proj} left={mobile ? 0 : width} onClose={() => setProj(null)} />}
    </aside>
  )
}
