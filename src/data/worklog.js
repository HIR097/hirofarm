// ─────────────────────────────────────────────────────────────
// 업무현황 데이터 접근부.
//
// 실제 내용은 실명·펀드명·계약 정보가 들어 있어 저장소에 평문으로 두지 않는다.
// 원본은 secure/worklog.js 이고, 배포본에는 public/enc/worklog.js.enc 만 올라간다.
// 잠금이 풀릴 때 gate.js 가 복호화해 window.__HY_DATA__.worklog 에 실어준다.
//
// 이 모듈은 App 이 동적 import 된 뒤에야 평가되므로(main.jsx 참고)
// 여기서 window 를 읽는 시점에는 데이터가 이미 올라와 있다.
// ─────────────────────────────────────────────────────────────

const D = (typeof window !== 'undefined' && window.__HY_DATA__?.worklog) || null

if (!D && typeof window !== 'undefined') {
  console.warn('[hirofarm] 업무현황 데이터가 없습니다. 잠금이 풀리지 않았거나 enc/worklog.js.enc 가 빠졌습니다.')
}

export const WORK_TITLE_DATE = D?.titleDate || ''
export const WORK_ASSETS = D?.assets || []
