// Design tokens ported from the handoff (정하윤 대시보드.dc.html).
// THEMES drive the light/dark CSS variables; ACCENTS drive the point color.

export const THEMES = {
  light: {
    bg: '#e7e7ea',
    bg2: '#f1f1f3',
    surface: '#ffffff',
    surface2: '#f3f3f5',
    ink: '#0d0d0f',
    inkText: '#f4f4f6',
    text: '#101012',
    text2: '#71717a',
    text3: '#a6a6ad',
    line: '#e8e8ec',
    shadow: '0 1px 2px rgba(18,18,26,.04), 0 10px 30px rgba(18,18,26,.06)',
    accentMonoBg: '#101012',
    accentMonoText: '#ffffff',
  },
  dark: {
    bg: '#08080a',
    bg2: '#0f0f12',
    surface: '#161619',
    surface2: '#1f1f23',
    ink: '#f4f4f6',
    inkText: '#0a0a0b',
    text: '#f3f3f5',
    text2: '#9a9aa2',
    text3: '#62626a',
    line: '#26262b',
    shadow: '0 1px 2px rgba(0,0,0,.45), 0 10px 30px rgba(0,0,0,.55)',
    accentMonoBg: '#f4f4f6',
    accentMonoText: '#0a0a0b',
  },
}

export const ACCENTS = {
  mono: { label: '흑백', bg: null },
  lime: { label: '라임', bg: 'oklch(0.83 0.16 128)', text: '#0a0a0b' },
  blue: { label: '블루', bg: 'oklch(0.62 0.16 252)', text: '#ffffff' },
  orange: { label: '오렌지', bg: 'oklch(0.70 0.16 56)', text: '#0a0a0b' },
  violet: { label: '바이올렛', bg: 'oklch(0.60 0.16 300)', text: '#ffffff' },
  pink: { label: '핑크', bg: 'oklch(0.66 0.17 6)', text: '#ffffff' },
}

// Returns the CSS custom properties for a given theme + accent combination,
// applied to the app root so every `var(--token)` resolves correctly.
export function buildCssVars(themeName, accentName) {
  const T = THEMES[themeName] || THEMES.light
  const ac = ACCENTS[accentName] || ACCENTS.mono
  return {
    '--bg': T.bg,
    '--bg2': T.bg2,
    '--surface': T.surface,
    '--surface2': T.surface2,
    '--ink': T.ink,
    '--ink-text': T.inkText,
    '--text': T.text,
    '--text-2': T.text2,
    '--text-3': T.text3,
    '--line': T.line,
    '--shadow': T.shadow,
    '--accent': ac.bg || T.accentMonoBg,
    '--accent-text': ac.bg ? ac.text : T.accentMonoText,
  }
}
