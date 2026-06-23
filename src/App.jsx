import { useState } from 'react'
import { buildCssVars } from './theme.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { PAGE_TITLES, INITIAL_TODOS } from './data.js'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import Home from './pages/Home.jsx'
import WorkStatus from './pages/WorkStatus.jsx'
import FundSchedule from './pages/FundSchedule.jsx'
import Calendar from './pages/Calendar.jsx'
import Scratchpad from './pages/Scratchpad.jsx'

export default function App() {
  // ── persisted UI state (mirrors hy_theme / hy_accent) ──
  const [theme, setTheme] = useLocalStorage('hy_theme', 'light')
  const [accent, setAccent] = useLocalStorage('hy_accent', 'mono')

  // ── session state ──
  const [tab, setTab] = useState('home')
  const [homeVar, setHomeVar] = useState('A')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [todos, setTodos] = useState(INITIAL_TODOS)

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
        height: '100vh',
        width: '100%',
        background: 'var(--bg)',
        fontFamily: "'Space Grotesk', -apple-system, Helvetica, Arial, sans-serif",
        color: 'var(--text)',
        overflow: 'hidden',
      }}
    >
      <Sidebar tab={tab} onNavigate={setTab} onOpenSettings={() => setSettingsOpen(true)} />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title={title} sub={sub} isDark={isDark} onToggleTheme={toggleTheme} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 28px 36px' }}>
          {tab === 'home' && (
            <Home homeVar={homeVar} setHomeVar={setHomeVar} todos={todos} onToggle={toggleTodo} />
          )}
          {tab === 'status' && <WorkStatus />}
          {tab === 'fund' && <FundSchedule />}
          {tab === 'calendar' && <Calendar />}
          {tab === 'scratch' && <Scratchpad />}
        </div>
      </main>

      {settingsOpen && (
        <SettingsModal
          accent={accent}
          onPickAccent={setAccent}
          onToggleTheme={toggleTheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
