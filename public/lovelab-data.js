/* 연애실험실 × 누난내게여자야2 — 인스타 팔로워 데이터
 * initial = 방송 최초 시점 캡처값 (엑셀 '통합 문서1.xlsx' 이미지 기준)
 * approx  = 인스타 축약표기(5.6만 등)라 근사값
 * snapshots = 날짜별 팔로워 수 (매일 갱신, 2026-08-01부터)
 */
window.LOVELAB_DATA = {
  updated: "2026-08-10",
  shows: {
    lovelab: { label: "연애실험실", short: "연실" },
    noona:   { label: "누난 내게 여자야 2", short: "누난2" },
  },
  cast: [
    { handle: "1997.0127",   name: "정하윤", show: "lovelab", me: true,  initial: 0,     approx: false, note: "하트 왕게임 · 2026-08-02 등록 시점 비공개/팔로워 0에서 시작" },
    { handle: "__3.e7",      name: "강경호", show: "lovelab", initial: 56000, approx: true  },
    { handle: "0616gy",      name: "박가연", show: "lovelab", initial: 20000, approx: true  },
    { handle: "da_l_in",     name: "문채린", show: "lovelab", initial: 8731,  approx: false, note: "web_profile_info API가 400을 반환해 프로필 페이지 표기값으로 수동 수집 — 자동 수집분에는 빠질 수 있음" },
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
    { handle: "yoonso_.lee", name: "이윤소", show: "noona",   initial: 2238,  approx: false, note: "이후 별도 캡처 시점 약 1.3만" },
    // 자동 수집 불가로 제외 (2026-08-02 ~):
    //   le.siwon 이시원 (누난2) — initial 3123, 마지막 정확 수집 2026-08-02 15198
    //   2026-08-06 프로필 표기는 "1.6만"으로 축약되어 정확값을 얻지 못해 계속 제외한다.
    // 인스타 web_profile_info API가 da_l_in / le.siwon 두 계정에만 400을 반환한다
    // (Asset asset://laser.provider/ig_business_category_subvertical — 계정 설정 이슈, 로그인 세션에서도 동일).
    // da_l_in 은 팔로워가 1만 미만이라 프로필 og:description 에 정확값이 그대로 노출돼 2026-08-06 복구했다.
    // le.siwon 도 1만 밑으로 내려가거나 API가 정상화되면 위 줄을 되살려 이력까지 복구할 수 있다.
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
    "2026-08-02": {
      "__3.e7": 60717, "0616gy": 21333, "da_l_in": 9310, "xogunnnn": 5505, "a_ct_p": 7832,
      "yrimirey": 10269, "ellleybear": 10511, "ccmparc": 41156, "__kimmyungju": 33490, "kj_woo0": 381,
      "hatmda_": 21770, "_see_hyunny": 20222, "lahhyunjin": 20822, "junnnssi": 9890, "zzixyng": 8138,
      "_bellagenie": 9026, "joohee.yy": 14279, "_xx__hye": 42303, "dearmay___": 21924, "dr_jin0": 12287,
      "pairanisblue": 15440, "jung__won.k": 83104, "le.siwon": 15198, "yoonso_.lee": 14765,
      "1997.0127": 0,
    },
    // 2026-08-03 ~ 08-05 결측: 일일 자동 수집(launchd)이 이 PC에서 돌지 않아 3일치 공백.
    // 아래는 로그인된 브라우저 세션에서 수동 수집한 값 (curl 직접 호출은 429로 차단됨).
    "2026-08-06": {
      "1997.0127": 0, "__3.e7": 61083, "0616gy": 21725, "da_l_in": 9393, "xogunnnn": 6097,
      "a_ct_p": 7951, "yrimirey": 11281, "ellleybear": 10685, "ccmparc": 41765, "__kimmyungju": 34539,
      "kj_woo0": 407, "hatmda_": 21865, "_see_hyunny": 21740, "lahhyunjin": 21441, "junnnssi": 10057,
      "zzixyng": 8429, "_bellagenie": 13127, "joohee.yy": 16676, "_xx__hye": 44869, "dearmay___": 20794,
      "dr_jin0": 13993, "pairanisblue": 17486, "jung__won.k": 84347, "yoonso_.lee": 15093,
    },
    "2026-08-07": {
      "1997.0127": 0, "__3.e7": 61208, "0616gy": 21856, "xogunnnn": 6320, "a_ct_p": 8033,
      "yrimirey": 11689, "ellleybear": 10756, "ccmparc": 42045, "__kimmyungju": 35138, "kj_woo0": 415,
      "hatmda_": 21926, "_see_hyunny": 21878, "lahhyunjin": 21567, "junnnssi": 10126, "zzixyng": 8460,
      "_bellagenie": 13216, "joohee.yy": 16956, "_xx__hye": 45208, "dearmay___": 21048, "dr_jin0": 14308,
      "pairanisblue": 17763, "jung__won.k": 84473, "yoonso_.lee": 15282,
    },
    "2026-08-08": {
      "1997.0127": 0, "__3.e7": 61357, "0616gy": 21951, "da_l_in": 9767, "xogunnnn": 6478,
      "a_ct_p": 8081, "yrimirey": 12007, "ellleybear": 10764, "ccmparc": 42430, "__kimmyungju": 35976,
      "kj_woo0": 436, "hatmda_": 21988, "_see_hyunny": 21949, "lahhyunjin": 21730, "junnnssi": 10198,
      "zzixyng": 8490, "_bellagenie": 13330, "joohee.yy": 17231, "_xx__hye": 45508, "dearmay___": 22089,
      "dr_jin0": 14597, "pairanisblue": 18057, "jung__won.k": 84624, "yoonso_.lee": 16685,
    },
    "2026-08-10": {
      "1997.0127": 0, "__3.e7": 61520, "0616gy": 22097, "xogunnnn": 6668, "a_ct_p": 8117,
      "yrimirey": 12305, "ellleybear": 10774, "ccmparc": 42785, "__kimmyungju": 36688, "kj_woo0": 447,
      "hatmda_": 22043, "_see_hyunny": 22126, "lahhyunjin": 21941, "junnnssi": 10282, "zzixyng": 8565,
      "_bellagenie": 13358, "joohee.yy": 17642, "_xx__hye": 45878, "dearmay___": 22029, "dr_jin0": 15060,
      "pairanisblue": 18658, "jung__won.k": 84813, "yoonso_.lee": 16477,
    },
  },
};
