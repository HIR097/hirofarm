// 요리 탭 — 가진 재료로 끼니별 요리 3개를 추천한다.
//
// ① AI 추천: foodAI.js 와 같은 키(hy_anthropic_key, 홈 탭 "AI 설정")로 브라우저에서 Anthropic API 를 직접 호출.
//    구조화 출력(json_schema)으로 요리 3개 = 이름·칼로리·단백질·시간·난이도·쓰는 재료·없는 재료·조리 순서·팁.
// ② 오프라인 폴백: 키가 없거나 호출이 실패하면 아래 내장 레시피 DB 에서 재료 겹침 점수로 3개를 고른다.
//    (사용자: 185cm 클린벌크 — 단백질 넉넉한 쪽을 선호. 야식은 가볍게.)

import { getApiKey } from './foodAI.js'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-5'


// 2026-11-01 사용자가 냉장고 사진·쿠팡 주문내역으로 알려준 재료 — 저장된 재료가 없을 때 기본값으로 들어간다.
export const DEFAULT_INGS = [
  '계란', '소화잘되는 우유 190ml', '후랑크 소시지', '냉동 닭가슴살 100g', '냉동 순살 고등어', '냉동 삼겹살', '냉동 돼지목전지 슬라이스(제육용)',
  '햇반 300g', '햇반 210g', '냉동 통밀 베이글', '바질치즈 치아바타 샌드위치', '슈레드 치즈', '누텔라',
  '냉동 호박인절미', '냉동 통팥찰떡', '오트 그래놀라', '콘프로스트 로우슈가', '미숫가루', '신라면 건면', '불닭볶음면 까르보', '돈베이 키츠네 우동 컵라면', '육개장 사발면',
  '프로틴 파우더(아이소100·하이드로웨이·신타6 딸기)', '슬로우카보린', '크레아틴',
  '참기름', '굴소스', '돈까스소스', '황매실원액', '파슬리', '펩시', '칠성사이다',
]

export const MEALS = ['아침', '점심', '간식', '저녁', '야식']
// 벌크업 기준 끼니 배분 — 홈 탭 목표(기본 3310kcal·185g = 흑마 벌크업 영상 공식, hy_cal_goal/hy_cal_protein_goal)를 이 비율로 나눈다.
export const MEAL_SHARE = { 아침: 0.20, 점심: 0.27, 간식: 0.12, 저녁: 0.29, 야식: 0.12 }
export const MEAL_HINT = {
  아침: '15분 안, 소화 편하게. 탄수(밥·빵·오트)+단백질 30g 이상으로 하루를 연다',
  점심: '가장 든든한 한 끼. 탄수 넉넉히 + 단백질 40g 이상',
  간식: '운동 전후 보충. 빠른 탄수 + 단백질 25g 이상(쉐이크·요거트·떡 OK)',
  저녁: '메인 단백질(고기·생선) 150g 이상 + 밥. 채소 곁들이기',
  야식: '단백질 위주로 가볍게, 기름·매운맛 적게. 부족한 칼로리는 여기서 메운다',
}

// 홈 탭 목표·오늘 기록을 읽어 이 끼니의 목표 kcal·단백질과 오늘 남은 양을 계산한다.
export function bulkTargets(meal) {
  let goal = 3310, pGoal = 185, eaten = 0, pEaten = 0
  try {
    goal = Math.max(0, Number(localStorage.getItem('hy_cal_goal')) || 3310)
    pGoal = Math.max(0, Number(localStorage.getItem('hy_cal_protein_goal')) || 185)
    const d = new Date(); const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const list = (JSON.parse(localStorage.getItem('hy_cal_log') || '{}') || {})[day] || []
    for (const it of list) { eaten += (it.kcal || 0) * (it.qty || 1); pEaten += (it.protein || 0) * (it.qty || 1) }
  } catch { /* 기본값 */ }
  const share = MEAL_SHARE[meal] || 0.2
  return {
    goal, pGoal, eaten: Math.round(eaten), pEaten: Math.round(pEaten),
    left: Math.max(0, Math.round(goal - eaten)), pLeft: Math.max(0, Math.round(pGoal - pEaten)),
    kcal: Math.round(goal * share), protein: Math.round(pGoal * share),
  }
}

const SCHEMA = {
  type: 'object',
  properties: {
    dishes: {
      type: 'array',
      description: '추천 요리 정확히 3개',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '요리 이름(한국어)' },
          summary: { type: 'string', description: '한 줄 소개 — 왜 이 끼니에 맞는지' },
          kcal: { type: 'integer', description: '1인분 칼로리(kcal) 추정' },
          protein: { type: 'number', description: '1인분 단백질(g) 추정' },
          fat: { type: 'number', description: '1인분 지방(g) 추정' },
          carb: { type: 'number', description: '1인분 탄수화물(g) 추정' },
          minutes: { type: 'integer', description: '총 조리 시간(분)' },
          difficulty: { type: 'string', enum: ['쉬움', '보통', '어려움'] },
          uses: { type: 'array', items: { type: 'string' }, description: '사용자가 가진 재료 중 쓰는 것(분량 포함, 예: "계란 2개")' },
          missing: { type: 'array', items: { type: 'string' }, description: '없어서 사야 하거나 생략 가능한 재료. 기본 조미료(소금·후추·식용유·간장·설탕)는 넣지 않음' },
          steps: { type: 'array', items: { type: 'string' }, description: '조리 순서 4~8단계, 각 한 문장. 불 세기·시간 명시' },
          tip: { type: 'string', description: '맛·영양을 올리는 팁 한 줄. 없으면 빈 문자열' },
        },
        required: ['name', 'summary', 'kcal', 'protein', 'minutes', 'difficulty', 'uses', 'missing', 'steps', 'tip'],
        additionalProperties: false,
      },
    },
  },
  required: ['dishes'],
  additionalProperties: false,
}

const SYSTEM = `너는 벌크업(근육량 증가) 식단을 짜는 한국 가정식 요리 코치다. 사용자가 집에 있는 재료 목록, 끼니, 그 끼니의 목표 칼로리·단백질을 주면
그 재료로 만들 수 있는 요리 정확히 3개를 추천한다.
사용자: 185cm 남성, 체중 76kg → 목표 80kg 클린벌크. 주 4회 웨이트 + 주 2회 러닝. 하루 목표는 입력으로 온다(기본 3300kcal·단백질 172g).
규칙:
- 끼니 목표 칼로리의 ±20% 안에 들어오게 1인분 분량을 잡는다. 모자라면 밥 양·계란 개수·고기 g 을 늘려서 맞추고, uses 에 그 분량을 명시한다(예: "햇반 300g 1개", "닭가슴살 200g").
- 단백질은 끼니 목표 이상을 우선 확보한다. 3개 중 최소 2개는 단백질 ≥ 목표.
- 가진 재료를 최대한 활용한다. 없는 재료는 missing 에 솔직히 적되, 소금·후추·식용유·간장·설탕·마늘 같은 기본 조미료는 있다고 가정하고 missing 에 넣지 않는다.
- 3개는 서로 다른 스타일(볶음/국물/구이, 한식/양식)로 겹치지 않게 한다. 1개는 10분 안에 되는 아주 쉬운 것으로 한다.
- 프로틴 파우더·슬로우카보린·크레아틴이 재료에 있으면 간식·야식·아침에서 쉐이크나 토핑으로 적극 활용한다.
- 야식은 소화 부담이 적은 쪽(기름·매운맛 적게). 오늘 남은 칼로리가 많이 남았으면 야식·간식에서 보충하라고 summary 에 적는다.
- 칼로리·단백질은 1인분 기준 현실적인 추정치. steps 는 초보가 따라 할 수 있게 불 세기(센 불/중불/약불)와 시간을 적는다.
- 모든 텍스트는 한국어.`

// ── 오프라인 레시피 DB ──
// key: 재료 매칭용 핵심 재료(한국어 표준 명칭). 사용자의 입력과 부분 일치로 비교한다.
const DB = [
  { name: '계란 스크램블 + 토스트', meals: ['아침', '간식'], kcal: 420, protein: 22, minutes: 10, difficulty: '쉬움', key: ['계란', '식빵', '버터', '우유'], optional: ['치즈', '토마토'],
    summary: '빠르고 소화 편한 아침 기본형',
    steps: ['계란 3개를 우유 2큰술·소금 한 꼬집과 섞는다', '약불 팬에 버터를 녹이고 계란물을 붓는다', '주걱으로 천천히 밀어 가며 70% 익을 때 불을 끈다', '식빵은 토스터나 마른 팬에 노릇하게 굽는다', '토스트 위에 스크램블을 올리고 후추를 뿌린다'], tip: '팬이 뜨거우면 퍽퍽해진다. 약불로 천천히.' },
  { name: '그릭요거트 바나나 오트볼', meals: ['아침', '간식'], kcal: 380, protein: 24, minutes: 5, difficulty: '쉬움', key: ['요거트', '바나나', '오트밀'], optional: ['견과', '꿀', '블루베리'],
    summary: '불 안 쓰는 5분 단백질 아침',
    steps: ['볼에 그릭요거트 200g을 담는다', '오트밀 40g을 섞어 2~3분 불린다', '바나나를 썰어 올린다', '견과·꿀이 있으면 조금 뿌린다'], tip: '전날 밤 섞어 두면 오버나이트 오트가 된다.' },
  { name: '닭가슴살 마늘 볶음밥', meals: ['점심', '저녁'], kcal: 650, protein: 42, minutes: 20, difficulty: '쉬움', key: ['닭가슴살', '밥', '계란', '마늘'], optional: ['양파', '대파', '당근', '김치'],
    summary: '남은 밥 + 닭가슴살로 단백질 꽉 채운 한 그릇',
    steps: ['닭가슴살을 1.5cm 깍둑 썰어 소금·후추 밑간한다', '센 불에 기름을 두르고 마늘·양파를 1분 볶는다', '닭가슴살을 넣고 겉이 하얗게 될 때까지 3분 볶는다', '밥을 넣고 주걱으로 눌러 펴며 2분 볶는다', '가장자리에 계란을 풀어 넣고 섞는다', '간장 1큰술로 간을 맞추고 대파를 넣어 마무리'], tip: '찬밥일수록 고슬고슬해진다.' },
  { name: '참치 김치찌개', meals: ['점심', '저녁'], kcal: 380, protein: 26, minutes: 20, difficulty: '쉬움', key: ['김치', '참치', '두부'], optional: ['대파', '양파', '고춧가루'],
    summary: '냉장고 김치 소비용 국물 메뉴',
    steps: ['김치 1컵을 가위로 잘라 냄비에 넣고 참치 기름을 조금 넣어 중불에 3분 볶는다', '물 500ml를 붓고 센 불로 끓인다', '끓으면 참치 1캔·두부 반 모를 넣는다', '중불로 10분 끓이며 고춧가루·간장으로 간을 맞춘다', '대파를 올려 마무리'], tip: '김치가 덜 익었으면 설탕 반 꼬집으로 신맛을 잡는다.' },
  { name: '두부 계란 부침', meals: ['아침', '저녁', '야식'], kcal: 320, protein: 28, minutes: 15, difficulty: '쉬움', key: ['두부', '계란'], optional: ['대파', '간장', '참기름'],
    summary: '가볍지만 단백질 높은 야식·저녁 보조',
    steps: ['두부를 키친타월로 눌러 물기를 뺀 뒤 1cm 두께로 썬다', '계란 2개를 풀어 두부를 적신다', '중불 팬에 기름을 두르고 두부를 앞뒤 3분씩 노릇하게 굽는다', '간장 1큰술 + 참기름 약간 + 대파로 양념장을 만들어 곁들인다'], tip: '전분을 살짝 묻히면 계란이 잘 붙는다.' },
  { name: '연어 스테이크 + 구운 채소', meals: ['저녁'], kcal: 560, protein: 40, minutes: 25, difficulty: '보통', key: ['연어'], optional: ['브로콜리', '양파', '감자', '레몬', '올리브오일'],
    summary: '단백질·오메가3 저녁 메인',
    steps: ['연어에 소금·후추를 뿌려 10분 둔다', '채소는 한입 크기로 썰어 올리브오일·소금에 버무린다', '중불 팬에 연어 껍질 쪽을 먼저 4분, 뒤집어 3분 굽는다', '같은 팬에 채소를 넣고 5분 볶는다', '레몬을 짜서 마무리'], tip: '껍질이 바삭해질 때까지 뒤집지 않는다.' },
  { name: '소고기 버섯 볶음', meals: ['점심', '저녁'], kcal: 520, protein: 38, minutes: 15, difficulty: '쉬움', key: ['소고기', '버섯'], optional: ['양파', '마늘', '대파', '밥'],
    summary: '15분 센 불 요리, 밥과 같이',
    steps: ['소고기를 간장 1큰술·설탕 반 큰술·마늘·후추에 10분 재운다', '센 불 팬에 기름을 두르고 양파를 1분 볶는다', '소고기를 넣고 겉이 익을 때까지 2분 볶는다', '버섯을 넣고 2분 더 볶는다', '대파·참기름으로 마무리'], tip: '버섯은 마지막에 넣어야 물이 안 나온다.' },
  { name: '돼지고기 김치볶음', meals: ['점심', '저녁'], kcal: 600, protein: 32, minutes: 20, difficulty: '쉬움', key: ['돼지고기', '김치'], optional: ['양파', '대파', '두부', '밥'],
    summary: '실패 없는 한식 메인',
    steps: ['돼지고기를 소금·후추·마늘로 밑간한다', '중불에 돼지고기를 먼저 3분 볶아 기름을 낸다', '김치 1.5컵과 양파를 넣고 센 불에 5분 볶는다', '설탕 반 큰술·고춧가루로 간을 맞춘다', '대파와 참기름으로 마무리'], tip: '두부를 데쳐 곁들이면 단백질이 올라간다.' },
  { name: '참치 마요 덮밥', meals: ['점심', '야식'], kcal: 580, protein: 30, minutes: 10, difficulty: '쉬움', key: ['참치', '밥'], optional: ['마요네즈', '계란', '김', '양파', '간장'],
    summary: '10분 안에 끝나는 한 그릇',
    steps: ['참치 1캔 기름을 빼고 마요네즈 1큰술·후추와 섞는다', '양파가 있으면 얇게 썰어 물에 5분 담가 매운맛을 뺀다', '밥 위에 참치·양파를 올린다', '계란 프라이를 얹고 간장 약간, 김 가루를 뿌린다'], tip: '마요 대신 그릭요거트를 쓰면 칼로리가 내려간다.' },
  { name: '토마토 계란 볶음', meals: ['아침', '점심', '야식'], kcal: 300, protein: 18, minutes: 10, difficulty: '쉬움', key: ['토마토', '계란'], optional: ['대파', '설탕', '밥'],
    summary: '중식 가정식, 가볍고 빠르다',
    steps: ['토마토 2개를 한입 크기로 썬다', '계란 3개를 풀어 센 불에 반숙으로 볶아 꺼낸다', '같은 팬에 토마토를 넣고 설탕 반 꼬집·소금으로 2분 볶는다', '계란을 다시 넣고 섞어 30초 마무리'], tip: '케첩 반 큰술이면 감칠맛이 산다.' },
  { name: '닭가슴살 샐러드', meals: ['점심', '저녁', '야식'], kcal: 350, protein: 38, minutes: 15, difficulty: '쉬움', key: ['닭가슴살', '양상추'], optional: ['토마토', '오이', '계란', '올리브오일', '아보카도', '샐러드'],
    summary: '다이어트·야식용 고단백 저칼로리',
    steps: ['닭가슴살을 소금·후추로 밑간하고 중불에 앞뒤 5분씩 굽는다(또는 삶는다)', '채소를 씻어 한입 크기로 찢는다', '올리브오일 1큰술·레몬즙(또는 식초)·소금·후추를 섞어 드레싱을 만든다', '닭가슴살을 썰어 올리고 드레싱을 뿌린다'], tip: '삶은 계란 1개를 추가하면 단백질 +6g.' },
  { name: '된장찌개', meals: ['아침', '점심', '저녁'], kcal: 220, protein: 14, minutes: 20, difficulty: '쉬움', key: ['된장', '두부'], optional: ['감자', '애호박', '양파', '버섯', '대파', '멸치'],
    summary: '밥과 가장 잘 맞는 기본 국물',
    steps: ['물 600ml에 멸치(또는 멸치 육수)를 넣고 센 불로 끓인다', '된장 1.5큰술을 풀고 감자·양파를 넣어 5분 끓인다', '애호박·두부·버섯을 넣고 5분 더 끓인다', '대파·마늘로 마무리'], tip: '된장은 불 끄기 전 조금 더 풀면 향이 산다.' },
  { name: '오트밀 단백질 죽', meals: ['아침', '야식'], kcal: 350, protein: 30, minutes: 7, difficulty: '쉬움', key: ['오트밀', '우유'], optional: ['프로틴', '바나나', '계란', '꿀', '시나몬'],
    summary: '전자레인지 7분, 야식으로도 부담 없음',
    steps: ['오트밀 50g + 우유 250ml를 전자레인지 그릇에 담는다', '2분 돌리고 섞고 다시 1분 돌린다', '프로틴 1스쿱(또는 계란 1개를 풀어 넣고 1분 더) 섞는다', '바나나·시나몬을 올린다'], tip: '계란을 넣을 땐 뜨거울 때 빨리 저어야 뭉치지 않는다.' },
  { name: '새우 마늘 볶음 파스타', meals: ['점심', '저녁'], kcal: 620, protein: 32, minutes: 20, difficulty: '보통', key: ['새우', '파스타', '마늘'], optional: ['올리브오일', '페페론치노', '파슬리', '버터'],
    summary: '양식이 먹고 싶을 때',
    steps: ['파스타 100g을 소금물에 8분 삶는다(면수 한 컵 남김)', '중불 팬에 올리브오일 2큰술·마늘 편을 넣고 노릇하게 볶는다', '새우를 넣고 2분 볶는다', '면과 면수 반 컵을 넣고 센 불에 1분 섞는다', '소금·후추·파슬리로 마무리'], tip: '면수가 소스를 만들어 준다. 버리지 말 것.' },
  { name: '계란 야채 김밥 말이', meals: ['아침', '간식', '야식'], kcal: 400, protein: 16, minutes: 15, difficulty: '보통', key: ['김', '밥', '계란'], optional: ['당근', '오이', '참치', '단무지', '시금치'],
    summary: '손에 들고 먹는 간편식',
    steps: ['밥에 참기름 1작은술·소금을 섞는다', '계란 2개를 지단으로 부쳐 길게 썬다', '김 위에 밥을 얇게 펴고 계란·채소를 올린다', '단단히 말아 참기름을 발라 썬다'], tip: '밥이 식어야 김이 안 찢어진다.' },
  { name: '바나나 프로틴 쉐이크', meals: ['간식', '야식', '아침'], kcal: 300, protein: 32, minutes: 3, difficulty: '쉬움', key: ['바나나', '우유'], optional: ['프로틴', '요거트', '땅콩버터', '오트밀'],
    summary: '3분, 운동 후 간식',
    steps: ['우유 300ml·바나나 1개·프로틴 1스쿱을 믹서에 넣는다', '얼음 3개를 넣고 30초 간다', '땅콩버터 1작은술이 있으면 추가'], tip: '얼린 바나나를 쓰면 아이스크림 같다.' },
  { name: '고구마 치즈 구이', meals: ['간식', '아침'], kcal: 280, protein: 10, minutes: 10, difficulty: '쉬움', key: ['고구마', '치즈'], optional: ['버터', '꿀', '시나몬'],
    summary: '전자레인지 간식',
    steps: ['고구마를 씻어 젖은 키친타월로 감싸 전자레인지 5분', '세로로 갈라 버터를 바르고 치즈를 올린다', '1분 더 돌려 치즈를 녹인다'], tip: '시나몬을 뿌리면 디저트 느낌.' },
  { name: '사과 땅콩버터 + 견과', meals: ['간식', '야식'], kcal: 250, protein: 8, minutes: 3, difficulty: '쉬움', key: ['사과'], optional: ['땅콩버터', '견과', '요거트'],
    summary: '불 안 쓰고 끝',
    steps: ['사과를 8등분한다', '땅콩버터 1큰술을 찍어 먹는다', '견과 한 줌을 곁들인다'], tip: '야식이면 땅콩버터는 반 큰술만.' },
  { name: '베이컨 치즈 오믈렛', meals: ['아침', '점심'], kcal: 480, protein: 28, minutes: 12, difficulty: '보통', key: ['계란', '치즈'], optional: ['베이컨', '햄', '양파', '버섯', '우유'],
    summary: '카페 브런치 느낌',
    steps: ['베이컨·양파를 중불에 2분 볶아 꺼낸다', '계란 3개 + 우유 1큰술 + 소금을 풀어 약불 팬에 붓는다', '겉이 70% 익으면 속재료와 치즈를 한쪽에 올린다', '반으로 접어 30초 두고 접시에 뒤집는다'], tip: '팬은 작은 것(20cm)이 접기 쉽다.' },
  { name: '닭가슴살 카레', meals: ['점심', '저녁'], kcal: 680, protein: 40, minutes: 30, difficulty: '보통', key: ['닭가슴살', '카레', '감자'], optional: ['양파', '당근', '밥', '우유'],
    summary: '한 번 끓이면 두 끼',
    steps: ['닭가슴살·감자·양파·당근을 한입 크기로 썬다', '중불에 양파를 3분, 닭가슴살을 3분 볶는다', '감자·당근과 물 500ml를 넣고 10분 끓인다', '카레 가루(또는 고형) 2인분을 풀어 약불에 10분 저으며 끓인다', '밥 위에 끼얹는다'], tip: '우유 50ml를 넣으면 부드러워진다.' },
  { name: '우동 계란탕', meals: ['야식', '점심', '아침'], kcal: 420, protein: 16, minutes: 10, difficulty: '쉬움', key: ['우동', '계란'], optional: ['대파', '간장', '김', '어묵', '버섯'],
    summary: '따뜻한 야식, 10분',
    steps: ['물 500ml + 간장 2큰술(또는 쓰유)을 끓인다', '우동 면을 넣고 3분 끓인다', '계란을 풀어 둥글게 넣고 1분 둔다', '대파·김을 올린다'], tip: '어묵 두 장이면 든든해진다.' },
  { name: '돼지고기 제육볶음', meals: ['저녁', '점심'], kcal: 650, protein: 36, minutes: 25, difficulty: '보통', key: ['돼지고기', '고추장'], optional: ['양파', '대파', '양배추', '마늘', '고춧가루', '밥'],
    summary: '밥도둑 한식 메인',
    steps: ['고추장 1.5큰술·고춧가루 1큰술·간장 1큰술·설탕 1큰술·마늘·후추로 양념을 만든다', '돼지고기 300g을 양념에 15분 재운다', '센 불 팬에 양파·양배추를 1분 볶는다', '고기를 넣고 5~7분 볶는다', '대파·참기름으로 마무리'], tip: '양념이 타지 않게 중간에 물 2큰술.' },
  { name: '시리얼 + 우유 + 삶은 계란', meals: ['아침', '간식'], kcal: 420, protein: 20, minutes: 8, difficulty: '쉬움', key: ['시리얼', '우유', '계란'], optional: ['바나나', '견과'],
    summary: '요리라 하기 민망하지만 단백질은 챙긴다',
    steps: ['계란 2개를 끓는 물에 8분 삶는다', '시리얼 50g에 우유 200ml를 붓는다', '바나나를 썰어 올린다'], tip: '계란은 전날 미리 삶아 두면 3분 컷.' },
  { name: '양배추 참치 전', meals: ['야식', '간식', '저녁'], kcal: 330, protein: 24, minutes: 15, difficulty: '쉬움', key: ['양배추', '참치', '계란'], optional: ['부침가루', '대파', '간장'],
    summary: '밀가루 적게, 야식 부담 적게',
    steps: ['양배추 1/4을 채 썬다', '참치 1캔·계란 2개·부침가루 2큰술과 섞는다', '중불 팬에 얇게 펴 앞뒤 4분씩 굽는다', '간장 양념에 찍어 먹는다'], tip: '부침가루 대신 계란만 쓰면 탄수가 거의 없다.' },
  { name: '소시지 계란 볶음밥', meals: ['점심', '저녁', '야식'], kcal: 640, protein: 26, minutes: 12, difficulty: '쉬움', key: ['소시지', '햇반', '계란'], optional: ['굴소스', '치즈', '파슬리', '참기름'],
    summary: '햇반 + 후랑크로 10분, 굴소스가 핵심',
    steps: ['햇반 1개를 전자레인지 2분 돌려 둔다', '소시지 2개를 어슷 썰어 중불에 2분 굽는다', '계란 2개를 풀어 넣고 반숙으로 섞는다', '밥을 넣고 센 불에 2분 볶으며 굴소스 1큰술로 간한다', '참기름·파슬리로 마무리, 치즈를 올려도 좋다'], tip: '밥을 넣기 전 팬을 충분히 달군다.' },
  { name: '고등어 구이 + 햇반', meals: ['저녁', '점심'], kcal: 560, protein: 38, minutes: 20, difficulty: '쉬움', key: ['고등어', '햇반'], optional: ['계란', '참기름', '황매실원액'],
    summary: '냉동 순살 고등어 그대로 굽는 고단백 저녁',
    steps: ['냉동 순살 고등어를 흐르는 물에 5분 해동(또는 그대로)하고 키친타월로 물기를 뺀다', '중불 팬에 기름을 두르고 껍질 쪽부터 5분, 뒤집어 4분 굽는다', '햇반을 데운다', '황매실원액 1작은술 + 간장 1작은술을 섞어 찍어 먹는다'], tip: '뚜껑을 덮으면 기름 튐이 줄고 속까지 익는다.' },
  { name: '삼겹살 구이 + 계란 프라이', meals: ['저녁'], kcal: 780, protein: 36, minutes: 20, difficulty: '쉬움', key: ['삼겹살'], optional: ['햇반', '계란', '참기름', '황매실원액'],
    summary: '벌크업 저녁, 소금만 있으면 끝',
    steps: ['냉동 삼겹살을 냉장에서 반나절 해동한다(급하면 전자레인지 해동 3분)', '팬을 센 불로 달구고 기름 없이 삼겹살을 올려 한 면 3분씩 굽는다', '같은 팬 기름으로 계란 프라이 2개', '소금·후추, 참기름장에 찍어 햇반과 먹는다'], tip: '구운 뒤 키친타월에 1분 두면 기름이 빠진다.' },
  { name: '베이글 계란 치즈 샌드위치', meals: ['아침', '간식'], kcal: 520, protein: 26, minutes: 10, difficulty: '쉬움', key: ['베이글', '계란', '치즈'], optional: ['소시지', '우유', '파슬리'],
    summary: '냉동 베이글로 만드는 브런치',
    steps: ['냉동 베이글을 전자레인지 40초 → 반으로 갈라 마른 팬에 2분 굽는다', '계란 2개를 풀어 약불에 스크램블한다', '베이글 위에 스크램블·슈레드 치즈를 올리고 30초 더 녹인다', '후추·파슬리를 뿌리고 덮는다'], tip: '소시지를 썰어 넣으면 단백질 +8g.' },
  { name: '미숫가루 프로틴 쉐이크', meals: ['아침', '간식', '야식'], kcal: 380, protein: 34, minutes: 3, difficulty: '쉬움', key: ['미숫가루', '우유'], optional: ['프로틴', '누텔라', '슬로우카보린'],
    summary: '운동 후 3분, 탄수+단백질 동시',
    steps: ['우유 190ml 2팩(380ml)에 미숫가루 3큰술을 섞는다', '프로틴 1스쿱을 넣고 쉐이커로 30초 흔든다', '꿀 없이도 미숫가루 단맛으로 충분'], tip: '벌크 중이면 슬로우카보린 반 스쿱 추가.' },
  { name: '그래놀라 우유 + 삶은 계란', meals: ['아침', '간식'], kcal: 450, protein: 22, minutes: 8, difficulty: '쉬움', key: ['그래놀라', '우유', '계란'], optional: ['프로틴', '콘프로스트'],
    summary: '불 거의 안 쓰는 아침',
    steps: ['계란 2개를 끓는 물에 8분 삶는다(미리 삶아 두면 생략)', '그래놀라 60g에 우유 190ml를 붓는다', '우유에 프로틴 반 스쿱을 풀면 단백질이 올라간다'], tip: '그래놀라는 붓고 바로 먹어야 바삭하다.' },
  { name: '인절미 그래놀라 디저트', meals: ['간식', '야식'], kcal: 330, protein: 8, minutes: 5, difficulty: '쉬움', key: ['인절미', '그래놀라'], optional: ['우유', '누텔라', '찰떡'],
    summary: '냉동 떡을 간식으로',
    steps: ['냉동 호박인절미 4~5개를 전자레인지 30초 해동한다', '그릇에 담고 그래놀라 한 줌을 뿌린다', '누텔라 1작은술을 곁들인다'], tip: '야식이면 누텔라는 빼고 우유만.' },
  { name: '소시지 치즈 치아바타', meals: ['점심', '간식'], kcal: 620, protein: 30, minutes: 8, difficulty: '쉬움', key: ['치아바타', '소시지', '치즈'], optional: ['돈까스소스', '파슬리'],
    summary: '사 둔 샌드위치를 핫샌드로 업그레이드',
    steps: ['소시지 1개를 길게 갈라 중불에 2분 굽는다', '치아바타 샌드위치를 열고 소시지·슈레드 치즈를 끼운다', '마른 팬에 뚜껑 덮고 약불 3분, 뒤집어 2분', '돈까스소스 약간을 뿌린다'], tip: '전자레인지 1분으로도 되지만 팬이 훨씬 맛있다.' },
  { name: '라면 + 계란 + 치즈', meals: ['야식', '점심'], kcal: 560, protein: 22, minutes: 8, difficulty: '쉬움', key: ['라면', '계란'], optional: ['치즈', '소시지', '햇반'],
    summary: '야식 기본형, 단백질만 챙긴다',
    steps: ['물 500ml를 끓이고 면·스프를 넣는다', '3분 뒤 계란 1개를 풀어 넣는다', '불을 끄고 슈레드 치즈 한 줌을 올린다'], tip: '건면(신라면 건면)이면 기름이 적어 야식 부담이 줄어든다.' },
  { name: '제육 덮밥(돼지목전지)', meals: ['저녁', '점심'], kcal: 700, protein: 38, minutes: 20, difficulty: '보통', key: ['돼지목전지', '햇반'], optional: ['굴소스', '계란', '참기름', '황매실원액'],
    summary: '고추장 없어도 굴소스·간장으로 되는 제육',
    steps: ['냉동 슬라이스 200g을 해동해 간장 1큰술·굴소스 1큰술·설탕 반 큰술·마늘·후추·황매실원액 1작은술에 10분 재운다', '센 불 팬에 기름을 두르고 고기를 넣어 5~6분 볶는다', '햇반을 데워 그 위에 올리고 계란 프라이를 얹는다', '참기름을 한 바퀴'], tip: '고추장이 생기면 1큰술 추가하면 정석 제육.' },
]

// 입력 재료 문자열을 표준 토큰으로(공백·수량 제거). "계란 10개" → "계란"
const norm = (s) => s.replace(/\d+[a-zA-Z가-힣]*\s*/g, '').replace(/\s+/g, '').trim()
const hits = (ing, list) => list.some((t) => { const a = norm(t); return a && (a.includes(ing) || ing.includes(a)) })

// ── 학습 DB ──
// AI 가 만들어 낸 요리는 전부 여기에 쌓인다(localStorage hy_cook_learned, 동기화 'cook' 번들의 learned).
// 다음에 같은 재료 조합이면 AI 를 부르기 전에 여기서 먼저 꺼낸다. 레시피 북(사용자가 고른 것)과는 별개.
export const LEARNED_KEY = 'hy_cook_learned'
export function loadLearned() { try { return JSON.parse(localStorage.getItem(LEARNED_KEY) || '[]') || [] } catch { return [] } }
export function saveLearned(list) { try { localStorage.setItem(LEARNED_KEY, JSON.stringify(list)) } catch { /* ignore */ } }
// 같은 이름이면 최신으로 덮고, 끼니는 합친다. 반환: 바뀐 전체 목록
export function learn(dishes, meal) {
  const list = loadLearned()
  for (const d of dishes) {
    if (!d?.name || !d.uses?.length) continue
    const at = list.findIndex((x) => x.name === d.name)
    const meals = Array.from(new Set([...(at >= 0 ? list[at].meals || [] : []), meal]))
    const rec = { ...d, id: at >= 0 ? list[at].id : `l${Date.now()}${Math.random().toString(36).slice(2, 5)}`, meals, key: d.uses.map(norm).filter(Boolean), optional: [], ts: new Date().toISOString(), hits: (at >= 0 ? list[at].hits || 0 : 0) }
    if (at >= 0) list[at] = rec; else list.unshift(rec)
  }
  saveLearned(list.slice(0, 300))
  return list
}
// 지금 재료로 전부 만들 수 있는(핵심 재료 모두 보유) 학습 레시피 중 이 끼니에 맞는 것
export function learnedMatches(ingredients, meal) {
  const have = ingredients.map(norm).filter(Boolean)
  return loadLearned()
    .filter((r) => r.key?.length && r.key.every((k) => hits(k, have)))
    .sort((a, b) => ((b.meals || []).includes(meal) ? 1 : 0) - ((a.meals || []).includes(meal) ? 1 : 0) || (b.protein || 0) - (a.protein || 0))
    .filter((r) => (r.meals || []).includes(meal))
}

export function offlineRecommend(ingredients, meal, target) {
  const have = ingredients.map(norm).filter(Boolean)
  const t = target || bulkTargets(meal)
  const pool = [...loadLearned(), ...DB]
  const scored = pool.map((r) => {
    const keyHit = r.key.filter((k) => hits(k, have)).length
    const optHit = r.optional.filter((k) => hits(k, have)).length
    const mealFit = r.meals[0] === meal ? 2 : r.meals.includes(meal) ? 1 : -3
    // 벌크업: 단백질 많을수록 +, 끼니 목표 칼로리에서 멀수록 -
    const proteinFit = Math.min(3, r.protein / 12)
    const kcalFit = -Math.min(3, Math.abs(r.kcal - t.kcal) / Math.max(150, t.kcal * 0.35))
    const score = keyHit * 3 - (r.key.length - keyHit) * 2 + optHit + mealFit + proteinFit + kcalFit
    return { r, score, keyHit }
  })
    .filter((x) => x.keyHit > 0 || have.length === 0)
    .sort((a, b) => b.score - a.score)
  const picked = []
  for (const x of scored) {
    if (picked.length >= 3) break
    if (picked.some((p) => p.r.name === x.r.name)) continue
    picked.push(x)
  }
  // 재료가 아주 적어 3개가 안 채워지면 끼니에 맞는 것으로 보충
  if (picked.length < 3) {
    for (const r of pool) {
      if (picked.length >= 3) break
      if (picked.some((p) => p.r.name === r.name) || !r.meals.includes(meal)) continue
      picked.push({ r, score: 0, keyHit: 0 })
    }
  }
  return picked.map(({ r }) => ({
    name: r.name, summary: r.summary, kcal: r.kcal, protein: r.protein, minutes: r.minutes, difficulty: r.difficulty,
    uses: [...r.key, ...r.optional].filter((k) => hits(k, have)),
    missing: r.key.filter((k) => !hits(k, have)),
    steps: r.steps, tip: r.kcal < t.kcal * 0.8 ? `${r.tip} 벌크업 기준 ${t.kcal}kcal 에 못 미친다 — 밥·계란·고기 양을 1.5배로.`.trim() : r.tip,
  }))
}

export async function aiRecommend(ingredients, meal, note = '') {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_KEY')
  const user = `끼니: ${meal} (${MEAL_HINT[meal]})\n가진 재료: ${ingredients.join(', ')}${note ? `\n요청: ${note}` : ''}`
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 6000,
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.error?.message || '' } catch { /* ignore */ }
    if (res.status === 401) throw new Error('API 키가 올바르지 않습니다.')
    if (res.status === 429) throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.')
    throw new Error(`API 오류 ${res.status}${detail ? ` — ${detail}` : ''}`)
  }
  const data = await res.json()
  if (data.stop_reason === 'refusal') throw new Error('모델이 이 요청에 답하지 않았습니다.')
  const text = (data.content || []).find((b) => b.type === 'text')?.text
  if (!text) throw new Error('응답이 비어 있습니다.')
  const dishes = (JSON.parse(text).dishes || []).slice(0, 3)
  if (!dishes.length) throw new Error('추천 결과가 비어 있습니다.')
  return dishes.map((d) => ({ ...d, kcal: Math.max(0, Math.round(d.kcal || 0)), protein: Math.round((d.protein || 0) * 10) / 10, ai: true }))
}

// AI 우선, 키가 없거나 실패하면 오프라인. 반환 { dishes, source: 'ai'|'offline', error }
// 순서: ① 학습 DB 에 이 재료 조합으로 되는 요리가 3개 이상이면 그걸 돌려준다(force 가 아닐 때, 요청 문구가 없을 때)
//       ② AI 추천 → 결과를 학습 DB 에 저장  ③ 키 없음·실패 → 내장 DB + 학습 DB 점수 매칭
export async function recommend(ingredients, meal, note, { force = false } = {}) {
  const target = bulkTargets(meal)
  if (!force && !note) {
    const got = learnedMatches(ingredients, meal)
    if (got.length >= 3) {
      const dishes = got.slice(0, 3)
      saveLearned(loadLearned().map((r) => (dishes.some((d) => d.id === r.id) ? { ...r, hits: (r.hits || 0) + 1 } : r)))
      return { dishes, source: 'learned', error: '' }
    }
  }
  try {
    const dishes = await aiRecommend(ingredients, meal, note, target)
    learn(dishes, meal)
    return { dishes, source: 'ai', error: '' }
  } catch (e) {
    const msg = e?.message === 'NO_KEY' ? '' : (e?.message || 'AI 호출 실패')
    return { dishes: offlineRecommend(ingredients, meal, target), source: 'offline', error: msg }
  }
}
