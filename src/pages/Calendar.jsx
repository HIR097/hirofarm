import { Card } from '../components/ui.jsx'
import { IconCalendar } from '../components/icons.jsx'
import { scheduleForMonth, SCHEDULE_CATEGORIES } from '../data/fundSchedule.js'

const fade = { animation: 'hyFade .4s ease', marginTop: 8 }

// 2026년 6월 기준 고정 그리드 (Date 미사용). 6월 1일 = 월요일.
const YEAR = 2026
const MONTH = 6
const FIRST_WEEKDAY = 1 // 0=일 … 1=월
const DAYS_IN_MONTH = 30
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 펀드 연간일정 중 이번 달 항목을 day → 이벤트 배열로 매핑.
function eventsByDay() {
  const map = {}
  for (const it of scheduleForMonth(MONTH)) {
    ;(map[it.day] ||= []).push(it)
  }
  return map
}

export default function Calendar() {
  const evMap = eventsByDay()
  // 앞쪽 빈칸 + 날짜 셀
  const cells = []
  for (let i = 0; i < FIRST_WEEKDAY; i++) cells.push(null)
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ ...fade }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '4px 0 16px' }}>
        <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--text-3)' }}>
          달력 · {YEAR}년 {MONTH}월
        </div>
        {/* Outlook 연동 예정 안내 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            font: "500 11px 'JetBrains Mono'",
            color: 'var(--text-2)',
            background: 'var(--surface2)',
            border: '1px dashed var(--line)',
            borderRadius: 999,
            padding: '6px 13px',
          }}
        >
          <IconCalendar size={14} />
          Outlook API 연동 예정 — 현재는 펀드 연간일정 미리보기
        </div>
      </div>

      <Card>
        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 8 }}>
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              style={{
                textAlign: 'center',
                font: "600 11px 'JetBrains Mono'",
                color: i === 0 ? '#e5484d' : i === 6 ? 'var(--text-2)' : 'var(--text-3)',
              }}
            >
              {w}
            </div>
          ))}
        </div>
        {/* 날짜 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {cells.map((d, i) => {
            const isToday = d === 23 // 2026-06-23
            const events = d ? evMap[d] || [] : []
            return (
              <div
                key={i}
                style={{
                  minHeight: 96,
                  borderRadius: 13,
                  border: '1px solid var(--line)',
                  background: d ? 'var(--surface)' : 'transparent',
                  padding: d ? '8px 9px' : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  ...(isToday ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : null),
                }}
              >
                {d && (
                  <>
                    <span
                      style={{
                        font: "600 12px 'JetBrains Mono'",
                        color: isToday ? 'var(--accent)' : 'var(--text-2)',
                        alignSelf: 'flex-start',
                      }}
                    >
                      {d}
                    </span>
                    {events.slice(0, 3).map((ev, j) => {
                      const c = SCHEDULE_CATEGORIES[ev.category]
                      return (
                        <div
                          key={j}
                          title={`${ev.asset} · ${ev.title}`}
                          style={{
                            fontSize: 10,
                            lineHeight: 1.25,
                            background: 'var(--surface2)',
                            borderLeft: `2px solid ${c.color}`,
                            borderRadius: 5,
                            padding: '2px 5px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ev.title}
                        </div>
                      )
                    })}
                    {events.length > 3 && (
                      <span style={{ font: "500 9px 'JetBrains Mono'", color: 'var(--text-3)' }}>+{events.length - 3}건</span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.6 }}>
        ※ 이 달력은 추후 Outlook 일정 API와 연동될 예정입니다. 현재는 <b>펀드 연간일정</b>의 이번 달 루틴을 미리 표시합니다.
        Outlook 이벤트가 들어오면 같은 셀에 함께 렌더링되도록 설계되어 있습니다.
      </div>
    </div>
  )
}
