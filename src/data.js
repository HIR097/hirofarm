// ─────────────────────────────────────────────────────────────
// DATA LAYER
// All values below are hardcoded sample data ported from the design
// handoff. Per the handoff, these are placeholders to be replaced with
// real / Excel-sourced data later — keep this module as the single
// source so swapping in a fetch layer touches nothing in the views.
// ─────────────────────────────────────────────────────────────

export const PAGE_TITLES = {
  home: ['대시보드', '정하윤님의 하루를 한눈에'],
  status: ['업무현황', '자산별 업무 · 일정 · 긴급 관리'],
  fund: ['펀드 연간일정', '월별 반복 루틴 스케줄'],
  calendar: ['달력', 'Outlook 연동 예정 · 일정 보기'],
  scratch: ['낙서장', '자유 메모'],
}

export const INITIAL_TODOS = [
  { title: '분기 보고서 초안 작성', time: '10:00', tag: '업무', done: true },
  { title: '디자인 리뷰 미팅', time: '13:30', tag: '업무', done: false },
  { title: '하체 + 코어 루틴', time: '19:00', tag: '운동', done: false },
  { title: '이메일 정리 / 회신', time: '16:00', tag: '업무', done: false },
  { title: '저녁 스트레칭 15분', time: '22:00', tag: '운동', done: false },
]

export const HABITS = [
  { name: '운동', done: 5, goal: 7 },
  { name: '독서 30분', done: 4, goal: 7 },
  { name: '물 2L', done: 6, goal: 7 },
  { name: '기상 7시', done: 3, goal: 7 },
]

export const WEATHER = [
  { t: '09시', temp: '21°', icon: 'sun', now: false },
  { t: '12시', temp: '24°', icon: 'sun', now: true },
  { t: '15시', temp: '23°', icon: 'cloud', now: false },
  { t: '18시', temp: '20°', icon: 'cloud', now: false },
  { t: '21시', temp: '17°', icon: 'rain', now: false },
]

export const ACTIVITIES = [
  { time: '08:30', text: '아침 러닝 5.2km 완료', meta: '운동 · 312 kcal' },
  { time: '09:45', text: '데일리 스탠드업 참석', meta: '업무' },
  { time: '11:20', text: '분기 보고서 섹션 2 작성', meta: '업무 · 1h 40m' },
  { time: '13:30', text: '디자인 리뷰 노트 정리', meta: '업무' },
  { time: '19:10', text: '상체 웨이트 5세트', meta: '운동 · 420 kcal' },
]

export const WEEK = [
  { d: '월', n: 22, today: false, evs: [{ t: '09:00', label: '주간 회의' }] },
  {
    d: '화',
    n: 23,
    today: true,
    evs: [
      { t: '13:30', label: '디자인 리뷰' },
      { t: '19:00', label: '하체 루틴' },
    ],
  },
  { d: '수', n: 24, today: false, evs: [{ t: '15:00', label: '1:1 미팅' }] },
  { d: '목', n: 25, today: false, evs: [{ t: '11:00', label: '보고서 마감' }] },
  { d: '금', n: 26, today: false, evs: [{ t: '18:00', label: '러닝 8km' }] },
  { d: '토', n: 27, today: false, evs: [] },
  { d: '일', n: 28, today: false, evs: [{ t: '10:00', label: '장보기' }] },
]

// ── WORK ──
export const WORK_TASKS = [
  { title: '분기 보고서 초안', proj: 'Q2 리포트', due: '오늘 17:00', prio: '높음', prog: 60 },
  { title: '디자인 시스템 컴포넌트 정리', proj: '디자인', due: '6/24', prio: '중간', prog: 30 },
  { title: 'API 연동 검토', proj: '개발', due: '6/25', prio: '중간', prog: 10 },
  { title: '경쟁사 리서치', proj: '기획', due: '6/26', prio: '낮음', prog: 45 },
  { title: '주간 회의록 작성', proj: '운영', due: '완료', prio: '낮음', prog: 100 },
]

export const GANTT_DAYS = ['월', '화', '수', '목', '금', '토', '일']

export const GANTT = [
  { name: 'Q2 리포트', label: '보고서 작성', l: 0, w: 42, tone: 'dark' },
  { name: '디자인 시스템', label: '컴포넌트', l: 28, w: 42, tone: 'mid' },
  { name: 'API 개발', label: '연동 검토', l: 57, w: 29, tone: 'light' },
  { name: '리서치', label: '경쟁사', l: 14, w: 28, tone: 'mid' },
  { name: '리뷰/회의', label: '리뷰', l: 42, w: 14, tone: 'dark' },
]

export const DEADLINES = [
  { title: 'Q2 보고서 제출', when: '오늘 17:00', left: '4시간', urgent: true },
  { title: '디자인 리뷰 자료', when: '내일 10:00', left: '1일', urgent: false },
  { title: '스프린트 회고', when: '6/25 15:00', left: '2일', urgent: false },
]

export const MEETINGS = [
  { time: '13:30', title: '디자인 리뷰', who: '디자인팀 · 4명', room: '회의실 B' },
  { time: '15:00', title: '1:1 미팅', who: '팀장 · 1명', room: '온라인' },
  { time: '16:30', title: '스프린트 플래닝', who: '개발팀 · 6명', room: '회의실 A' },
]

// ── WORKOUT ──
export const WLOG = [
  { ex: '스쿼트', sets: '5 × 5', wt: '80kg', vol: '2,000kg' },
  { ex: '데드리프트', sets: '3 × 5', wt: '100kg', vol: '1,500kg' },
  { ex: '벤치프레스', sets: '5 × 5', wt: '60kg', vol: '1,500kg' },
  { ex: '런지', sets: '3 × 12', wt: '20kg', vol: '720kg' },
  { ex: '플랭크', sets: '3 × 60s', wt: '체중', vol: '—' },
]

export const ROUTINES = [
  { name: '5×5 스트렝스', day: '월·수·금', focus: '전신', prog: 62 },
  { name: '러닝 빌드업', day: '화·목', focus: '유산소', prog: 40 },
  { name: '코어 & 모빌리티', day: '토', focus: '코어', prog: 80 },
]

export const CAL_WEEK = [
  { d: '월', v: 62 },
  { d: '화', v: 84 },
  { d: '수', v: 48 },
  { d: '목', v: 92 },
  { d: '금', v: 70 },
  { d: '토', v: 34 },
  { d: '일', v: 76 },
]

export const WO_WEEK = [
  { d: '월', done: true },
  { d: '화', done: true },
  { d: '수', done: true },
  { d: '목', done: true },
  { d: '금', done: true },
  { d: '토', done: false },
  { d: '일', done: false },
]

export const WORKOUT_STATS = {
  weekDone: 5,
  weekGoal: 7,
  totalVolume: '5,720',
  weekCalories: '4,210',
  streak: 12,
  goalPct: 71,
  weight: { value: '72.4', delta: '-1.2' },
  bodyFat: { value: '16.8', delta: '-0.6' },
}
