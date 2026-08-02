/* 연애실험실 × 누난내게여자야2 — 인스타 팔로워 데이터
 * initial = 방송 최초 시점 캡처값 (엑셀 '통합 문서1.xlsx' 이미지 기준)
 * approx  = 인스타 축약표기(5.6만 등)라 근사값
 * snapshots = 날짜별 팔로워 수 (매일 갱신, 2026-08-01부터)
 */
window.LOVELAB_DATA = {
  updated: "2026-08-01",
  shows: {
    lovelab: { label: "연애실험실", short: "연실" },
    noona:   { label: "누난 내게 여자야 2", short: "누난2" },
  },
  cast: [
    // TODO: junnani__oo 는 2026-08-01 기준 존재하지 않는 계정(404) — 정확한 핸들 확인 필요
    { handle: "junnani__oo", name: "정하윤", show: "lovelab", me: true,  initial: null,  approx: false },
    { handle: "__3.e7",      name: "강경호", show: "lovelab", initial: 56000, approx: true  },
    { handle: "0616gy",      name: "박가연", show: "lovelab", initial: 20000, approx: true  },
    { handle: "da_l_in",     name: "문채린", show: "lovelab", initial: 8731,  approx: false },
    { handle: "xogunnnn",    name: "박도건", show: "lovelab", initial: 3994,  approx: false },
    { handle: "a_ct_p",      name: "박정민", show: "lovelab", initial: 7571,  approx: false },
    { handle: "yrimirey",    name: "이예림", show: "lovelab", initial: 7002,  approx: false },
    { handle: "ellleybear",  name: "정혜원", show: "lovelab", initial: 9015,  approx: false },
    // 하트 왕게임 외 실험 참가자 (2026-08-01 추가)
    // 방송 최초 캡처값이 없어 initial = 2026-08-01 실측값(추가 시점 기준선). 증감은 이 날짜부터 의미 있음.
    { handle: "ccmparc",     name: "박찬양", show: "lovelab", initial: 41049, approx: false, note: "침대 소개팅 · 기준선 2026-08-01" },
    { handle: "__kimmyungju",name: "김명주", show: "lovelab", initial: 33284, approx: false, note: "침대 소개팅 · 기준선 2026-08-01" },
    { handle: "kj_woo0",     name: "강정우", show: "lovelab", initial: 371,   approx: false, note: "취중 소개팅 · 기준선 2026-08-01 (팔로워 수가 유난히 적어 계정 확인 필요)" },
    { handle: "hatmda_",     name: "하승아", show: "lovelab", initial: 21745, approx: false, note: "취중 소개팅 · 기준선 2026-08-01" },
    { handle: "_see_hyunny", name: "안시현", show: "lovelab", initial: 20196, approx: false, note: "고립 연애 · 기준선 2026-08-01" },
    { handle: "lahhyunjin",  name: "나현진", show: "lovelab", initial: 20653, approx: false, note: "고립 연애 · 기준선 2026-08-01" },
    { handle: "junnnssi",    name: "위준승", show: "lovelab", initial: 9837,  approx: false, note: "고립 연애 · 기준선 2026-08-01" },
    { handle: "zzixyng",     name: "변지영", show: "lovelab", initial: 8107,  approx: false, note: "고립 연애 · 기준선 2026-08-01" },
    { handle: "_bellagenie", name: "최유진", show: "noona",   initial: 2996,  approx: false },
    { handle: "joohee.yy",   name: "유주희", show: "noona",   initial: 4766,  approx: false },
    { handle: "_xx__hye",    name: "지혜",   show: "noona",   initial: 32000, approx: true  },
    { handle: "dearmay___",  name: "레이첼 구", show: "noona", initial: 9134, approx: false },
    { handle: "dr_jin0",     name: "이진영", show: "noona",   initial: 1936,  approx: false },
    { handle: "pairanisblue",name: "유진우", show: "noona",   initial: 4362,  approx: false },
    { handle: "jung__won.k", name: "김정원", show: "noona",   initial: 76000, approx: true  },
    { handle: "le.siwon",    name: "이시원", show: "noona",   initial: 3123,  approx: false },
    { handle: "yoonso_.lee", name: "이윤소", show: "noona",   initial: 2238,  approx: false, note: "이후 별도 캡처 시점 약 1.3만" },
  ],
  snapshots: {
    "2026-08-01": {
      "__3.e7": 60648, "0616gy": 21290, "da_l_in": 9273, "xogunnnn": 5444, "a_ct_p": 7823,
      "yrimirey": 10111, "ellleybear": 10460, "_bellagenie": 8737,
      "joohee.yy": 13120, "_xx__hye": 41533, "dearmay___": 22849,
      "ccmparc": 41049, "__kimmyungju": 33284, "kj_woo0": 371, "hatmda_": 21745,
      "_see_hyunny": 20196, "lahhyunjin": 20653, "junnnssi": 9837, "zzixyng": 8107,
      "dr_jin0": 11600, "pairanisblue": 14697, "jung__won.k": 82629, "le.siwon": 14664,
      "yoonso_.lee": 13226,
    },
  },
};
