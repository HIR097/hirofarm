// Inline stroke icons ported from the handoff. Kept as a tiny local set so
// there's no icon-library dependency; swap for lucide-react if the codebase
// already uses it (per the handoff's Assets note).

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconHome({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  )
}

export function IconWork({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" />
      <path d="M3 13h18" />
    </svg>
  )
}

export function IconWorkout({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" />
    </svg>
  )
}

export function IconSettings({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </svg>
  )
}

export function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-3.6-3.6" />
    </svg>
  )
}

export function IconSun({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.7">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M6 6l1.1 1.1M16.9 16.9 18 18M18 6l-1.1 1.1M7.1 16.9 6 18" />
    </svg>
  )
}

export function IconMoon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.7">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  )
}

// Small weather glyphs used in the hourly strip.
export function WeatherIcon({ kind, size = 20 }) {
  if (kind === 'cloud') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
        <path d="M7 17a4 4 0 0 1 .8-7.9 5 5 0 0 1 9.7 1A3.5 3.5 0 0 1 17 17z" />
      </svg>
    )
  }
  if (kind === 'rain') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
        <path d="M7 15a4 4 0 0 1 .8-7.9 5 5 0 0 1 9.7 1A3.5 3.5 0 0 1 17 15z" />
        <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 4v1.5M12 18.5V20M4 12h1.5M18.5 12H20M6.3 6.3l1 1M16.7 16.7l1 1M17.7 6.3l-1 1M7.3 16.7l-1 1" />
    </svg>
  )
}

export function IconStatus({ size = 20 }) {
  // 업무현황: 체크리스트
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6l1 1 1.5-2M4 12l1 1 1.5-2M4 18l1 1 1.5-2" />
    </svg>
  )
}

export function IconSchedule({ size = 20 }) {
  // 펀드 연간일정: 반복/루틴
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v4h-4" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  )
}

export function IconCalendar({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function IconNote({ size = 20 }) {
  // 낙서장: 펜
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}

export function IconFlame({ size = 20 }) {
  // 칼로리: 불꽃
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 22a7 7 0 0 0 7-7c0-5-4-6-4-10-3 1.5-4.5 4-4.5 6.5C10.5 10 9 9 9 7c-1.6 1.7-2.5 4-2.5 6a5.5 5.5 0 0 0 5.5 9z" />
    </svg>
  )
}

export function IconCheck({ size = 13, stroke = 'var(--accent-text)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4 10-10" />
    </svg>
  )
}

export function IconBell({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.7">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

export function IconPlus({ size = 22, stroke = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconClose({ size = 18, stroke = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconMail({ size = 16, stroke = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  )
}

export function IconDrag({ size = 14, stroke = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none">
      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}
