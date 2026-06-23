// Shared presentational primitives + style snippets used across pages.
// Inline styles intentionally mirror the handoff so theming flows purely
// through the CSS variables set on the app root.

export const card = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 22,
  boxShadow: 'var(--shadow)',
  padding: 22,
}

export const darkCard = {
  background: 'var(--ink)',
  color: 'var(--ink-text)',
  borderRadius: 22,
  padding: 22,
}

export const mono = "600 11px 'JetBrains Mono'"

// Generic surface card.
export function Card({ children, style }) {
  return <div style={{ ...card, ...style }}>{children}</div>
}

// Card header row: bold title on the left, optional mono caption on the right.
export function CardHead({ title, caption, size = 16, mb = 14 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mb }}>
      <div style={{ fontSize: size, fontWeight: 700 }}>{title}</div>
      {caption != null && (
        <span style={{ font: mono, color: 'var(--text-3)' }}>{caption}</span>
      )}
    </div>
  )
}

// Small label/value metric card (the bento mini cards).
export function MiniMetric({ label, value, unit, sub }) {
  return (
    <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--text-3)' }}>{label}</div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' }}>
          {value}
          {unit && <span style={{ fontSize: 16, color: 'var(--text-3)' }}>{unit}</span>}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// Horizontal progress bar filled with the accent color.
export function ProgressBar({ pct, height = 6 }) {
  return (
    <div style={{ height, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent)', width: `${pct}%` }} />
    </div>
  )
}

// Habit tracker rows (shared by Home B and C).
export function HabitList({ habits }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {habits.map((h) => {
        const pct = Math.round((h.done / h.goal) * 100)
        return (
          <div key={h.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 500 }}>{h.name}</span>
              <span style={{ font: mono, color: 'var(--text-3)' }}>
                {h.done}/{h.goal}
              </span>
            </div>
            <ProgressBar pct={pct} />
          </div>
        )
      })}
    </div>
  )
}

// Hourly weather strip (shared across home variants).
import { WeatherIcon } from './icons.jsx'
export function WeatherStrip({ weather, iconSize = 20, gap = 6 }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {weather.map((w) => (
        <div
          key={w.t}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 9,
            padding: '12px 4px',
            borderRadius: 14,
            ...(w.now
              ? { background: 'var(--ink)', color: 'var(--ink-text)' }
              : { color: 'var(--text-2)' }),
          }}
        >
          <span style={{ font: "600 10px 'JetBrains Mono'" }}>{w.t}</span>
          <WeatherIcon kind={w.icon} size={iconSize} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{w.temp}</span>
        </div>
      ))}
    </div>
  )
}

// Vertical activity timeline (shared by Home B and C).
export function ActivityTimeline({ activities, compact = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {activities.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: compact ? 12 : 13, paddingBottom: compact ? 13 : 15 }}>
          <span
            style={{
              font: `600 ${compact ? 10 : 11}px 'JetBrains Mono'`,
              color: 'var(--text-3)',
              width: compact ? 38 : 42,
              textAlign: 'right',
              flex: 'none',
            }}
          >
            {a.time}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <span style={{ width: compact ? 8 : 9, height: compact ? 8 : 9, borderRadius: '50%', background: 'var(--accent)', marginTop: 3 }} />
            <span style={{ flex: 1, width: 1.5, background: 'var(--line)', marginTop: 4 }} />
          </div>
          <div>
            <div style={{ fontSize: compact ? 13 : 14, fontWeight: 500 }}>{a.text}</div>
            <div style={{ fontSize: compact ? 11 : 12, color: 'var(--text-2)', marginTop: compact ? 1 : 2 }}>{a.meta}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
