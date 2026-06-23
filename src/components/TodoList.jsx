import { IconCheck } from './icons.jsx'

// Shared todo list. `variant` tweaks spacing/extras to match each home layout:
//  - 'bento'   : Home A (tag dot + tag + time, rounded rows)
//  - 'compact' : Home B (time only, tight rows)
//  - 'focus'   : Home C (divider rows, tag + time)
export default function TodoList({ todos, onToggle, variant = 'bento' }) {
  const checkSize = variant === 'compact' ? 12 : 13
  const boxSize = variant === 'compact' ? 20 : 22

  const rowStyle = {
    bento: { display: 'flex', alignItems: 'center', gap: 13, padding: '11px 10px', borderRadius: 13 },
    compact: { display: 'flex', alignItems: 'center', gap: 11, padding: '9px 4px' },
    focus: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px', borderBottom: '1px solid var(--line)' },
  }[variant]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: variant === 'bento' ? 4 : variant === 'compact' ? 2 : 0 }}>
      {todos.map((t, i) => {
        const box = {
          width: boxSize,
          height: boxSize,
          flex: 'none',
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all .15s',
          ...(t.done
            ? { background: 'var(--accent)', border: '1px solid var(--accent)' }
            : { background: 'transparent', border: '1.5px solid var(--text-3)' }),
        }
        const title = {
          fontSize: 14,
          fontWeight: 500,
          ...(t.done
            ? { color: 'var(--text-3)', textDecoration: 'line-through' }
            : { color: 'var(--text)' }),
        }
        return (
          <div key={i} style={rowStyle}>
            <div onClick={() => onToggle(i)} style={box}>
              {t.done && <IconCheck size={checkSize} />}
            </div>
            <span style={title}>{t.title}</span>
            <div style={{ flex: 1 }} />
            {variant !== 'compact' && (
              <>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    ...(t.tag === '업무'
                      ? { border: '1.5px solid var(--text-3)' }
                      : { background: 'var(--accent)' }),
                  }}
                />
                <span style={{ fontSize: variant === 'focus' ? 12 : 11, color: 'var(--text-2)' }}>{t.tag}</span>
              </>
            )}
            <span
              style={{
                font: `600 ${variant === 'focus' ? 13 : 12}px 'JetBrains Mono'`,
                color: 'var(--text-3)',
                minWidth: variant === 'focus' ? 48 : 42,
                textAlign: 'right',
              }}
            >
              {t.time}
            </span>
          </div>
        )
      })}
    </div>
  )
}
