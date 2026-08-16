// ─────────────────────────────────────────────────────────────
// 펀드 연간일정 접근부.
//
// 분류 라벨·색은 민감하지 않아 여기 그대로 둔다. 자산명과 일정이 들어 있는
// 목록만 secure/fundSchedule.js 로 빼서 암호화한다 (worklog.js 와 같은 방식).
// ─────────────────────────────────────────────────────────────

export const SCHEDULE_CATEGORIES = {
  repeat: { label: '반복지급', color: 'oklch(0.62 0.16 252)' }, // blue
  report: { label: '보고 및 결산', color: 'oklch(0.60 0.16 300)' }, // violet
  lender: { label: '대주단', color: 'oklch(0.70 0.16 56)' }, // orange
  tax: { label: '제세공과금', color: 'oklch(0.66 0.17 6)' }, // pink/red
  dividend: { label: '분배(배당)', color: 'oklch(0.83 0.16 128)' }, // lime
  insurance: { label: '보험', color: '#71717a' }, // gray
}

// months: [] → 매월 반복. 그 외에는 해당 월(1~12)에만.
export const FUND_SCHEDULE =
  (typeof window !== 'undefined' && window.__HY_DATA__?.fundSchedule) || []

// 특정 월(1~12)에 해당하는 일정을 일자순으로 반환 (months 빈 항목 = 매월 포함).
export function scheduleForMonth(month) {
  return FUND_SCHEDULE.filter((it) => it.months.length === 0 || it.months.includes(month)).sort(
    (a, b) => a.day - b.day,
  )
}
