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
    { handle: "junnani__oo", name: "정하윤", show: "lovelab", me: true,  initial: null,  approx: false },
    { handle: "__3.e7",      name: "강경호", show: "lovelab", initial: 56000, approx: true  },
    { handle: "0616gy",      name: "박가연", show: "lovelab", initial: 20000, approx: true  },
    { handle: "da_l_in",     name: "문채린", show: "lovelab", initial: 8731,  approx: false },
    { handle: "xogunnnn",    name: "박도건", show: "lovelab", initial: 3994,  approx: false },
    { handle: "a_ct_p",      name: "박정민", show: "lovelab", initial: 7571,  approx: false },
    { handle: "yrimirey",    name: "이예림", show: "lovelab", initial: 7002,  approx: false },
    { handle: "ellleybear",  name: "정혜원", show: "lovelab", initial: 9015,  approx: false },
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
      "__3.e7": 60648, "0616gy": 21290, "xogunnnn": 5444, "a_ct_p": 7823,
      "yrimirey": 10111, "ellleybear": 10460, "_bellagenie": 8737,
      "joohee.yy": 13120, "_xx__hye": 41533, "dearmay___": 22849,
    },
  },
};
