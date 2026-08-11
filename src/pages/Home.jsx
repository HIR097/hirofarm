import { HABITS, WEATHER, ACTIVITIES, getWeek } from '../data.js'
import {
  card,
  darkCard,
  mono,
  Card,
  CardHead,
  MiniMetric,
  HabitList,
  WeatherStrip,
  ActivityTimeline,
} from '../components/ui.jsx'
import TodoList from '../components/TodoList.jsx'
import { useIsMobile } from '../hooks/useIsMobile.js'
import { useWeather } from '../hooks/useWeather.js'
import { useNow } from '../hooks/useNow.js'

// 오늘 날짜·이번 주 — useNow가 분 단위로 갱신하므로 자정이 지나면 자동으로 바뀐다
const _pad = (n) => String(n).padStart(2, '0')
function useToday() {
  const now = useNow()
  const week = getWeek(now)
  return {
    dateLabel: `${now.getFullYear()} · ${_pad(now.getMonth() + 1)} · ${_pad(now.getDate())} · ${'일월화수목금토'[now.getDay()]}`,
    week,
    // 이번 주 범위 캡션 (예: "8월 3 – 9", 월이 걸치면 "7월 28 – 8월 3")
    weekCaption:
      week[0].m === week[6].m
        ? `${week[0].m}월 ${week[0].n} – ${week[6].n}`
        : `${week[0].m}월 ${week[0].n} – ${week[6].m}월 ${week[6].n}`,
  }
}
const fade = { animation: 'hyFade .4s ease' }

// Layout-toggle pill (A / B / C)
function pillStyle(active) {
  return {
    padding: '7px 15px',
    borderRadius: 999,
    cursor: 'pointer',
    font: "500 13px 'Pretendard Variable'",
    border: `1px solid ${active ? 'transparent' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--accent-text)' : 'var(--text-2)',
    transition: 'all .15s',
  }
}

// Month-grid week calendar with ring for "today" (shared by A and C).
// 모바일에서는 7칸이 안 들어가므로 가로 스크롤로 보여준다.
function WeekCalendar() {
  const isMobile = useIsMobile()
  const { week } = useToday()
  return (
    <div style={{ display: 'flex', gap: 7, ...(isMobile ? { overflowX: 'auto', paddingBottom: 6, minWidth: 0 } : {}) }}>
      {week.map((day) => (
        <div key={day.n} style={{ ...(isMobile ? { flex: 'none', width: 62 } : { flex: 1 }), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          <span style={{ font: mono, color: 'var(--text-3)' }}>{day.d}</span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: day.today ? 700 : 600,
              ...(day.today
                ? { background: 'var(--accent)', color: 'var(--accent-text)' }
                : { color: 'var(--text)' }),
            }}
          >
            {day.n}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', alignItems: 'center' }}>
            {day.evs.map((ev, i) => (
              <div key={i} style={{ width: '100%', background: 'var(--surface2)', borderRadius: 7, padding: '5px 6px', textAlign: 'center' }}>
                <div style={{ font: "600 9px 'JetBrains Mono'", color: 'var(--text-3)' }}>{ev.t}</div>
                <div style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.2, marginTop: 1 }}>{ev.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────── Variant A : Bento ───────────
function VariantA({ todos, onToggle, done, total, weather }) {
  const isMobile = useIsMobile()
  const { dateLabel, weekCaption } = useToday()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...fade }}>
      {/* 모바일: 인사 카드 전체 폭 + 지표 2×2, 데스크톱: 4열 벤토 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 12 : 18 }}>
        <div
          style={{
            ...darkCard,
            gridColumn: 'span 2',
            gridRow: isMobile ? 'auto' : 'span 2',
            borderRadius: 24,
            padding: 26,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: isMobile ? 20 : 0,
            minHeight: isMobile ? 0 : 230,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -40,
              top: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(255,255,255,.10),transparent 70%)',
            }}
          />
          <div>
            <div style={{ font: mono, letterSpacing: '.1em', opacity: 0.6 }}>{dateLabel}</div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', marginTop: 14, lineHeight: 1.2 }}>
              좋은 아침이에요,<br />하윤님
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 10 }}>오늘 일정 5개 · 운동 1개가 예정되어 있어요.</div>
          </div>
          <div style={{ display: 'flex', gap: 26, alignItems: 'stretch' }}>
            <div>
              <div style={{ font: mono, opacity: 0.55 }}>할 일</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{done}/{total}</div>
            </div>
            <div>
              <div style={{ font: mono, opacity: 0.55 }}>집중</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>3h 20m</div>
            </div>
            <div>
              <div style={{ font: mono, opacity: 0.55 }}>운동</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>예정</div>
            </div>
          </div>
        </div>

        <MiniMetric label="오늘 할 일" value={done} unit={`/${total}`} sub="완료" />
        <MiniMetric label="운동 목표" value="5" unit="/7회" sub="이번 주" />
        <MiniMetric label="집중 시간" value="3h20m" sub="오늘" />
        <MiniMetric label="소모 칼로리" value="732" unit="kcal" sub="오늘" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 18 }}>
        <Card>
          <CardHead title="오늘 할 일" caption={`${done}/${total} 완료`} mb={16} />
          <TodoList todos={todos} onToggle={onToggle} variant="bento" />
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card style={{ padding: 20 }}>
            <CardHead title="습관 트래커" size={15} mb={15} />
            <HabitList habits={HABITS} />
          </Card>
          <Card style={{ padding: 20 }}>
            <CardHead title="시간대별 날씨" size={15} />
            <WeatherStrip weather={weather} />
          </Card>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: 18 }}>
        <Card>
          <CardHead title="최근 활동" mb={16} />
          <ActivityTimeline activities={ACTIVITIES} />
        </Card>
        <Card>
          <CardHead title="이번 주 일정" caption={weekCaption} mb={16} />
          <WeekCalendar />
        </Card>
      </div>
    </div>
  )
}

// ─────────── Variant B : 3 Column ───────────
function VariantB({ todos, onToggle, done, total, weather }) {
  const isMobile = useIsMobile()
  const { dateLabel, week } = useToday()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr 1fr', gap: 18, alignItems: 'start', ...fade }}>
      {/* col 1 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ ...darkCard, padding: 22 }}>
          <div style={{ font: mono, opacity: 0.6 }}>{dateLabel}</div>
          <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-.02em', margin: '12px 0 8px', lineHeight: 1.25 }}>
            좋은 아침이에요,<br />하윤님
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>오늘 일정 5개 · 운동 1개</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,.09)', borderRadius: 13, padding: 12 }}>
              <div style={{ font: "600 10px 'JetBrains Mono'", opacity: 0.55 }}>할 일</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 3 }}>{done}/{total}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,.09)', borderRadius: 13, padding: 12 }}>
              <div style={{ font: "600 10px 'JetBrains Mono'", opacity: 0.55 }}>집중</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 3 }}>3h 20m</div>
            </div>
          </div>
        </div>
        <Card style={{ padding: 20 }}>
          <CardHead title="오늘 할 일" caption={`${done}/${total}`} size={15} mb={12} />
          <TodoList todos={todos} onToggle={onToggle} variant="compact" />
        </Card>
      </div>

      {/* col 2 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <MiniMetric label="운동 목표" value="5" unit="/7회" />
          <MiniMetric label="소모 칼로리" value="732" unit="k" />
        </div>
        <Card>
          <CardHead title="최근 활동" mb={16} />
          <ActivityTimeline activities={ACTIVITIES} />
        </Card>
      </div>

      {/* col 3 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card style={{ padding: 20 }}>
          <CardHead title="시간대별 날씨" size={15} />
          <WeatherStrip weather={weather} iconSize={18} gap={5} />
        </Card>
        <Card style={{ padding: 20 }}>
          <CardHead title="습관 트래커" size={15} mb={15} />
          <HabitList habits={HABITS} />
        </Card>
        <Card style={{ padding: 20 }}>
          <CardHead title="이번 주 일정" size={15} mb={8} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {week.map((day) => (
              <div key={day.n} style={{ display: 'flex', gap: 13, padding: '9px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', minWidth: 30, flex: 'none' }}>
                  <div style={{ font: "600 10px 'JetBrains Mono'", color: 'var(--text-3)' }}>{day.d}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{day.n}</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {day.evs.map((ev, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--text-3)' }}>{ev.t}</span> {ev.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─────────── Variant C : Focus ───────────
function VariantC({ todos, onToggle, done, total, left, weather }) {
  const isMobile = useIsMobile()
  const { dateLabel, weekCaption } = useToday()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...fade }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.7fr 1fr', gap: 18 }}>
        <Card style={{ borderRadius: 24, padding: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ font: mono, color: 'var(--text-3)', letterSpacing: '.06em' }}>{dateLabel}</div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', marginTop: 8 }}>오늘의 집중</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>
                {done}<span style={{ fontSize: 16, color: 'var(--text-3)' }}>/{total}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>완료</div>
            </div>
          </div>
          <div style={{ height: 1, background: 'var(--line)', margin: '20px 0 6px' }} />
          <TodoList todos={todos} onToggle={onToggle} variant="focus" />
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...darkCard, padding: 22 }}>
            <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.3 }}>
              좋은 아침이에요,<br />하윤님
            </div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 10 }}>오늘 일정 5개 · 운동 1개가 예정되어 있어요.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <MiniMetric label="운동 목표" value="5" unit="/7" />
            <MiniMetric label="집중 시간" value="3h20m" />
            <MiniMetric label="소모" value="732" unit="k" />
            <MiniMetric label="남은 할 일" value={left} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 18 }}>
        <Card style={{ padding: 20 }}>
          <CardHead title="습관 트래커" size={15} mb={15} />
          <HabitList habits={HABITS} />
        </Card>
        <Card style={{ padding: 20 }}>
          <CardHead title="시간대별 날씨" size={15} />
          <WeatherStrip weather={weather} iconSize={18} gap={5} />
        </Card>
        <Card style={{ padding: 20 }}>
          <CardHead title="최근 활동" size={15} />
          <ActivityTimeline activities={ACTIVITIES.slice(0, 4)} compact />
        </Card>
      </div>

      <Card>
        <CardHead title="이번 주 일정" caption={weekCaption} mb={16} />
        <WeekCalendar />
      </Card>
    </div>
  )
}

export default function Home({ homeVar, setHomeVar, todos, onToggle }) {
  const done = todos.filter((t) => t.done).length
  const total = todos.length
  const left = total - done
  // 실제 서울 날씨 — 로딩/실패 시 더미(WEATHER)로 폴백
  const live = useWeather()
  const weather = live?.hours || WEATHER

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '10px 0 18px' }}>
        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)' }}>
          메인 레이아웃 비교 · 마음에 드는 안을 골라주세요
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setHomeVar('A')} style={pillStyle(homeVar === 'A')}>A · 벤토</button>
          <button onClick={() => setHomeVar('B')} style={pillStyle(homeVar === 'B')}>B · 3 컬럼</button>
          <button onClick={() => setHomeVar('C')} style={pillStyle(homeVar === 'C')}>C · 포커스</button>
        </div>
      </div>

      {homeVar === 'A' && <VariantA todos={todos} onToggle={onToggle} done={done} total={total} weather={weather} />}
      {homeVar === 'B' && <VariantB todos={todos} onToggle={onToggle} done={done} total={total} weather={weather} />}
      {homeVar === 'C' && <VariantC todos={todos} onToggle={onToggle} done={done} total={total} left={left} weather={weather} />}
    </>
  )
}
