import { WORK_TASKS, GANTT_DAYS, GANTT, DEADLINES, MEETINGS } from '../data.js'
import { card, darkCard, mono, Card, CardHead } from '../components/ui.jsx'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }

function prioStyle(p) {
  const map = {
    높음: { background: 'var(--accent)', color: 'var(--accent-text)', border: '1px solid var(--accent)' },
    중간: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--text)' },
    낮음: { background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--line)' },
  }
  return {
    font: "600 10px 'JetBrains Mono'",
    letterSpacing: '.04em',
    padding: '3px 8px',
    borderRadius: 7,
    ...map[p],
  }
}

function toneStyle(tone) {
  if (tone === 'dark') return { background: 'var(--ink)', color: 'var(--ink-text)' }
  if (tone === 'mid') return { background: 'var(--text-2)', color: 'var(--surface)' }
  return { background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--line)' }
}

export default function Work() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...fade }}>
      {/* metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
        <StatCard label="진행중 태스크" value="4" />
        <StatCard label="이번 주 완료" value="12" />
        <StatCard label="마감 임박" value="3" dark />
        <StatCard label="오늘 회의" value="3" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        {/* task list */}
        <Card>
          <CardHead title="할 일 / 태스크" caption="우선순위 정렬" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {WORK_TASKS.map((t, i) => (
              <div key={i} style={{ padding: '13px 14px', borderRadius: 15, background: 'var(--surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{t.title}</span>
                  <span style={prioStyle(t.prio)}>{t.prio}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
                  <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{t.proj}</span>
                  <div style={{ flex: 1, height: 5, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent)', width: `${t.prog}%` }} />
                  </div>
                  <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-2)', minWidth: 58, textAlign: 'right' }}>{t.due}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <CardHead title="마감 임박" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DEADLINES.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{d.title}</div>
                    <div style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)', marginTop: 2 }}>{d.when}</div>
                  </div>
                  <span
                    style={{
                      font: "600 11px 'JetBrains Mono'",
                      padding: '3px 9px',
                      borderRadius: 8,
                      ...(d.urgent
                        ? { background: 'var(--accent)', color: 'var(--accent-text)' }
                        : { background: 'var(--surface2)', color: 'var(--text-2)' }),
                    }}
                  >
                    {d.left}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="회의 / 미팅" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {MEETINGS.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <span style={{ font: "600 13px 'JetBrains Mono'", minWidth: 46 }}>{m.time}</span>
                  <div style={{ borderLeft: '2px solid var(--line)', paddingLeft: 13 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{m.who} · {m.room}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* gantt timeline */}
      <Card>
        <CardHead title="주간 일정 · 타임라인" caption="6월 22 – 28" mb={18} />
        <div style={{ display: 'flex', marginBottom: 10, paddingLeft: 118 }}>
          {GANTT_DAYS.map((d) => (
            <div key={d} style={{ flex: 1, textAlign: 'center', font: "600 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GANTT.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 104, flex: 'none', fontSize: 13, fontWeight: 600 }}>{g.name}</span>
              <div style={{ flex: 1, position: 'relative', height: 34, background: 'var(--surface2)', borderRadius: 11 }}>
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: `${g.l}%`,
                    width: `${g.w}%`,
                    height: 26,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    font: "500 11px 'Pretendard Variable'",
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    ...toneStyle(g.tone),
                  }}
                >
                  {g.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StatCard({ label, value, dark }) {
  return (
    <div style={dark ? { ...darkCard, padding: 20 } : { ...card, padding: 20 }}>
      <div style={{ font: mono, color: dark ? undefined : 'var(--text-3)', opacity: dark ? 0.6 : 1 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.02em', marginTop: 8 }}>{value}</div>
    </div>
  )
}
