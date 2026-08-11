import { WLOG, ROUTINES, CAL_WEEK, WO_WEEK, WORKOUT_STATS as S } from '../data.js'
import { card, darkCard, mono, Card, CardHead, ProgressBar } from '../components/ui.jsx'
import { IconCheck } from '../components/icons.jsx'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }

// Donut geometry: r=50 → circumference 314.16; 71% filled → offset 91.1.
const DONUT_CIRC = 314.16
const donutOffset = DONUT_CIRC * (1 - S.goalPct / 100)

export default function Workout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...fade }}>
      {/* metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
        <StatCard label="이번 주 운동" value={S.weekDone} unit={`/${S.weekGoal}회`} />
        <StatCard label="총 볼륨" value={S.totalVolume} unit="kg" />
        <StatCard label="주간 소모" value={S.weekCalories} unit="kcal" />
        <StatCard label="연속 기록" value={S.streak} unit="일" dark />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* today's log table */}
        <Card>
          <CardHead title="오늘 운동 기록" caption="하체 + 코어" />
          <div style={{ display: 'flex', font: "600 10px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--text-3)', padding: '0 6px 10px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ flex: 1.6 }}>종목</span>
            <span style={{ flex: 1, textAlign: 'center' }}>세트</span>
            <span style={{ flex: 1, textAlign: 'center' }}>무게</span>
            <span style={{ flex: 1, textAlign: 'right' }}>볼륨</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {WLOG.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '13px 6px', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
                <span style={{ flex: 1.6, fontWeight: 600 }}>{w.ex}</span>
                <span style={{ flex: 1, textAlign: 'center', font: "500 13px 'JetBrains Mono'", color: 'var(--text-2)' }}>{w.sets}</span>
                <span style={{ flex: 1, textAlign: 'center', font: "600 13px 'JetBrains Mono'" }}>{w.wt}</span>
                <span style={{ flex: 1, textAlign: 'right', font: "500 13px 'JetBrains Mono'", color: 'var(--text-2)' }}>{w.vol}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* right column: donut + calories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...darkCard, display: 'flex', alignItems: 'center', gap: 22 }}>
            <svg width="118" height="118" viewBox="0 0 118 118">
              <circle cx="59" cy="59" r="50" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="11" />
              <circle
                cx="59"
                cy="59"
                r="50"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={DONUT_CIRC}
                strokeDashoffset={donutOffset}
                transform="rotate(-90 59 59)"
              />
            </svg>
            <div>
              <div style={{ font: mono, opacity: 0.6 }}>주간 목표 달성률</div>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-.02em' }}>{S.goalPct}%</div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>목표 {S.weekGoal}회 중 {S.weekDone}회 완료</div>
            </div>
          </div>
          <Card>
            <CardHead title="칼로리 소모" caption="주간" size={15} mb={16} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, height: 96 }}>
              {CAL_WEEK.map((c) => (
                <div key={c.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', borderRadius: '7px 7px 4px 4px', background: 'var(--accent)', height: `${c.v}%` }} />
                  </div>
                  <span style={{ font: "600 10px 'JetBrains Mono'", color: 'var(--text-3)' }}>{c.d}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* weight / body fat line chart */}
        <Card>
          <CardHead title="체중 · 체지방 추이" caption="최근 7주" mb={6} />
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            <div>
              <div style={{ font: mono, color: 'var(--text-3)' }}>체중</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {S.weight.value}<span style={{ fontSize: 13, color: 'var(--text-3)' }}>kg</span>{' '}
                <span style={{ font: "600 12px 'JetBrains Mono'", color: 'var(--text-2)' }}>{S.weight.delta}</span>
              </div>
            </div>
            <div>
              <div style={{ font: mono, color: 'var(--text-3)' }}>체지방</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {S.bodyFat.value}<span style={{ fontSize: 13, color: 'var(--text-3)' }}>%</span>{' '}
                <span style={{ font: "600 12px 'JetBrains Mono'", color: 'var(--text-2)' }}>{S.bodyFat.delta}</span>
              </div>
            </div>
          </div>
          <svg viewBox="0 0 320 130" width="100%" height="130" preserveAspectRatio="none">
            <polyline points="0,30 53,26 106,40 160,34 213,52 266,48 320,62" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="0,86 53,84 106,90 160,88 213,98 266,100 320,108" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            <Legend color="var(--accent)" label="체중" />
            <Legend color="var(--text-3)" label="체지방" />
          </div>
        </Card>

        {/* routines + workout calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <CardHead title="루틴 / 프로그램" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ROUTINES.map((r, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{r.name}</span>
                    <span style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{r.day} · {r.focus}</span>
                  </div>
                  <ProgressBar pct={r.prog} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="주간 운동 캘린더" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {WO_WEEK.map((w) => (
                <div key={w.d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
                  <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{w.d}</span>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      font: "600 13px 'Pretendard Variable'",
                      ...(w.done
                        ? { background: 'var(--accent)', color: 'var(--accent-text)' }
                        : { background: 'var(--surface2)', color: 'var(--text-3)', border: '1px dashed var(--line)' }),
                    }}
                  >
                    {w.done ? <IconCheck size={16} /> : <span>·</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, dark }) {
  return (
    <div style={dark ? { ...darkCard, padding: 20 } : { ...card, padding: 20 }}>
      <div style={{ font: mono, color: dark ? undefined : 'var(--text-3)', opacity: dark ? 0.6 : 1 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.02em', marginTop: 8 }}>
        {value}
        {unit && <span style={{ fontSize: dark ? 16 : 15, color: dark ? undefined : 'var(--text-3)', opacity: dark ? 0.6 : 1 }}>{unit}</span>}
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
      <span style={{ width: 14, height: 3, borderRadius: 2, background: color }} />
      {label}
    </span>
  )
}
