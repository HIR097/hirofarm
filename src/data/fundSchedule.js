// ─────────────────────────────────────────────────────────────
// 펀드 연간일정 — 260622.xlsx '펀드 연간일정' 시트 (Monthly Routine Schedule).
// 월별 반복 루틴을 일자(day) 기준으로 정리.
//
// 추후 '달력' 탭에서 Outlook API 이벤트와 합쳐 보여줄 수 있도록,
// 각 항목을 캘린더 이벤트로 매핑 가능한 형태로 설계:
//   { day, title, asset, category, months }  (months 비면 매월 반복)
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
export const FUND_SCHEDULE = [
  { day: 1, title: 'PM측에 결산자료 송부', asset: '공통', category: 'report', months: [] },
  { day: 1, title: '156호 원천징수영수증', asset: '156호', category: 'tax', months: [1, 4, 7, 10] },
  { day: 1, title: '156호 운용보고서 수익자 송부', asset: '156호', category: 'report', months: [1, 4, 7, 10] },
  { day: 1, title: '372호 분배금 지급', asset: '372호', category: 'dividend', months: [1, 4, 7, 10] },
  { day: 1, title: '125호 분배금 지급', asset: '125호', category: 'dividend', months: [3, 9] },

  { day: 15, title: '자산운용보고서 송부', asset: '공통', category: 'report', months: [] },
  { day: 15, title: '372호 운용보고서 대주 송부', asset: '372호', category: 'lender', months: [1, 4, 7, 10] },
  { day: 15, title: '종합부동산세', asset: '공통', category: 'tax', months: [12] },

  { day: 17, title: '156호 이자지급 · DSCR 송부', asset: '156호', category: 'lender', months: [3, 6, 9, 12] },
  { day: 18, title: '수도광열비', asset: '공통', category: 'repeat', months: [] },

  { day: 25, title: '2기 확정 부가세', asset: '공통', category: 'tax', months: [1] },
  { day: 25, title: '1기 예정 부가세', asset: '공통', category: 'tax', months: [4] },
  { day: 25, title: '1기 확정 부가세', asset: '공통', category: 'tax', months: [7] },
  { day: 25, title: '2기 예정 부가세', asset: '공통', category: 'tax', months: [10] },
  { day: 25, title: '156호 결산 및 배당', asset: '156호', category: 'report', months: [3, 6, 9, 12] },

  { day: 27, title: '372호 이자지급', asset: '372호', category: 'lender', months: [3, 6, 9, 12] },
  { day: 29, title: '372호 보험갱신', asset: '372호', category: 'insurance', months: [8] },
  { day: 30, title: '도로점용료', asset: '공통', category: 'tax', months: [3] },
  { day: 30, title: '재산세 (토지분)', asset: '공통', category: 'tax', months: [9] },
]

// 특정 월(1~12)에 해당하는 일정을 일자순으로 반환 (months 빈 항목 = 매월 포함).
export function scheduleForMonth(month) {
  return FUND_SCHEDULE.filter((it) => it.months.length === 0 || it.months.includes(month)).sort(
    (a, b) => a.day - b.day,
  )
}
