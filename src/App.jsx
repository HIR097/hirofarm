import { useState } from 'react'
import { buildCssVars } from './theme.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useIsMobile } from './hooks/useIsMobile.js'
import { PAGE_TITLES } from './data.js'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import Calendar from './pages/Calendar.jsx'
import Calories from './pages/Calories.jsx'
import Body from './pages/Body.jsx'
import Scratchpad from './pages/Scratchpad.jsx'
import English from './pages/English.jsx'
import Schedule from './pages/Schedule.jsx'

// 첫 화면. 예전엔 'home'(대시보드)이었으나 그 탭을 없애서 칼로리를 기본으로 둔다.
const DEFAULT_TAB = 'home'   // 2026-09-04 홈(달력 + 오늘 할 일 + 칼로리 + 2027 플랜)

export default function App() {
  // ── persisted UI state (mirrors hy_theme / hy_accent) ──
  const [theme, setTheme] = useLocalStorage('hy_theme', 'light')
  const [accent, setAccent] = useLocalStorage('hy_accent', 'mono')
  // 사이드바 메뉴 표시/숨김 — 숨긴 항목 key 목록 (콤마 구분)
  const [hiddenStr, setHiddenStr] = useLocalStorage('hy_menu_hidden', '')
  const hiddenMenus = hiddenStr ? hiddenStr.split(',') : []
  const toggleMenu = (key) =>
    setHiddenStr(
      (hiddenMenus.includes(key) ? hiddenMenus.filter((k) => k !== key) : [...hiddenMenus, key]).join(','),
    )

  // ── session state ──
  const [tab, setTab] = useState(DEFAULT_TAB)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false) // 모바일 사이드바

  const isMobile = useIsMobile()

  const isDark = theme === 'dark'
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  // 삭제된 탭이 localStorage 등에 남아 있어도 빈 화면이 되지 않도록 보정
  const [title, sub] = PAGE_TITLES[tab] || PAGE_TITLES[DEFAULT_TAB]

  return (
    <div
      style={{
        ...buildCssVars(theme, accent),
        display: 'flex',
        height: '100%',
        width: '100%',
        background: 'var(--bg)',
        fontFamily: "'Pretendard Variable', -apple-system, Helvetica, Arial, sans-serif",
        color: 'var(--text)',
        overflow: 'hidden',
      }}
    >
      <Sidebar
        tab={tab}
        onNavigate={setTab}
        onOpenSettings={() => setSettingsOpen(true)}
        mobile={isMobile}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
        hidden={hiddenMenus}
      />

      {/* 모바일 드로어 뒤 배경 */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 70 }}
        />
      )}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          title={title}
          sub={sub}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          mobile={isMobile}
          onOpenMenu={() => setDrawerOpen(true)}
        />

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: isMobile ? '4px 14px 32px' : '6px 28px 36px',
          }}
        >
          {tab === 'calendar' && <Calendar />}
          {tab === 'calorie' && <Calories />}
          {tab === 'body' && <Body />}
          {tab === 'scratch' && <Scratchpad />}
          {tab === 'english' && <English />}
          {tab === 'home' && <Schedule />}
        </div>
      </main>

      {settingsOpen && (
        <SettingsModal
          accent={accent}
          onPickAccent={setAccent}
          onToggleTheme={toggleTheme}
          hiddenMenus={hiddenMenus}
          onToggleMenu={toggleMenu}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
