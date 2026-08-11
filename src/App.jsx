import { useState } from 'react'
import { buildCssVars } from './theme.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useIsMobile } from './hooks/useIsMobile.js'
import { useWorkStore } from './hooks/useWorkStore.js'
import { useMailSuggestions } from './hooks/useMailSuggestions.js'
import { PAGE_TITLES, INITIAL_TODOS } from './data.js'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import NotifyPanel from './components/NotifyPanel.jsx'
import Home from './pages/Home.jsx'
import WorkStatus from './pages/WorkStatus.jsx'
import FundSchedule from './pages/FundSchedule.jsx'
import Calendar from './pages/Calendar.jsx'
import Calories from './pages/Calories.jsx'
import Scratchpad from './pages/Scratchpad.jsx'

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
  const [tab, setTab] = useState('home')
  const [homeVar, setHomeVar] = useState('A')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false) // 모바일 사이드바
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [todos, setTodos] = useState(INITIAL_TODOS)

  const isMobile = useIsMobile()

  // 업무현황 저장소 + Outlook 메일 제안 (WorkStatus·NotifyPanel 공유)
  const work = useWorkStore()
  const mail = useMailSuggestions()

  const isDark = theme === 'dark'
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')
  const toggleTodo = (i) =>
    setTodos((prev) => prev.map((t, j) => (j === i ? { ...t, done: !t.done } : t)))

  const [title, sub] = PAGE_TITLES[tab]

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
          notifyCount={mail.suggestions.length}
          onToggleNotify={() => setNotifyOpen((o) => !o)}
        />

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: isMobile ? '4px 14px 32px' : '6px 28px 36px',
          }}
        >
          {tab === 'home' && (
            <Home homeVar={homeVar} setHomeVar={setHomeVar} todos={todos} onToggle={toggleTodo} />
          )}
          {tab === 'status' && <WorkStatus work={work} />}
          {tab === 'fund' && <FundSchedule />}
          {tab === 'calendar' && <Calendar />}
          {tab === 'calorie' && <Calories />}
          {tab === 'scratch' && <Scratchpad />}
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

      <NotifyPanel
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        assets={work.assets}
        mail={mail}
        onAdd={work.addTask}
      />
    </div>
  )
}
