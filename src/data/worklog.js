// ─────────────────────────────────────────────────────────────
// 업무현황 데이터 — 260622.xlsx '260622' 시트에서 추출.
// 자산별로 업무를 정리하며, 각 업무는 제목 + 설명(2~3줄) + 기한 + 긴급여부.
// urgent=true 인 항목은 엑셀에서 빨간색으로 표시됐던 긴급 업무.
// 추후 실데이터/엑셀 재반영 시 이 파일만 교체하면 됨.
// ─────────────────────────────────────────────────────────────

export const WORK_TITLE_DATE = '260622' // 기준 관리표 일자

export const WORK_ASSETS = [
  {
    key: 'personal',
    name: '개인',
    tasks: [
      {
        title: '주간업무 작성폴더 / 자산별 주요이슈 취합 안내',
        desc: ['매주 목요일까지 작성', 'Teams 일정 공유'],
        due: '매주 목요일',
        urgent: false,
      },
      {
        title: '[월말업무] V-PLEX LM 미팅 스케쥴 안내',
        desc: ['리스 매니지먼트 미팅 일정 조율 및 안내'],
        due: '월말',
        urgent: false,
      },
      {
        title: '[월초업무] PM 결산자료 송부',
        desc: [
          '부산특구1호, 125호, 지엘가산메트로 (30호·149호는 PM 없음, 372호는 미발송)',
          '지엘가산메트로는 지급현황까지 정리하여 송부',
          '국민연금 IRIS 월간보고 입력 / 산재기금 보고서 / 법인카드 결재 신청',
        ],
        due: '월초',
        urgent: false,
      },
      {
        title: '[결산자료] 125호 · 지엘가산메트로',
        desc: ['자산별 결산자료 정리'],
        due: null,
        urgent: false,
      },
      {
        title: '[월 중간업무] 자산운용보고서 작성',
        desc: ['보통 매월 12~13일까지 작성 완료', '대상: 125호'],
        due: '~매월 12~13일',
        urgent: false,
      },
      {
        title: 'RE: [국내자산관리그룹] 2026년 상반기 예산 리뷰 공지',
        desc: [
          '주차 관련 업체 및 매출수수료 쉐어 구조 체크',
          '수도광열비 회입구조(오피스·리테일 시간대별 회입기준)',
          '수선유지비 5·6월 예정공사 진행여부 및 예산 초과여부 확인',
        ],
        due: '6/24(수)~6/26(금)',
        urgent: false,
      },
    ],
  },
  {
    key: 'ai',
    name: 'AI',
    tasks: [
      {
        title: '[코어1호·인컴앤그로스2호] 투자자협의회 개최 일정 안내',
        desc: ['운용전담인력 교체 및 신탁계약 변경 건', '수익자 관련 내용 회신 대기중'],
        due: null,
        urgent: true,
      },
      {
        title: '[하나은행] MMDA 이자원가 거래내역 - 이지스',
        desc: ['해야 할 것 있는지 체크'],
        due: null,
        urgent: false,
      },
    ],
  },
  {
    key: 'vplex',
    name: '125호 V-PLEX',
    tasks: [
      {
        title: '125호 재무모델 확보 필요',
        desc: ['ROE 5.56%', '진짜 재무모델 찾아야 함'],
        due: null,
        urgent: false,
      },
      {
        title: '[V-PLEX] 매각 관련',
        desc: ['신탁사·판매사 안내 필요'],
        due: null,
        urgent: false,
      },
      {
        title: '사용계약 사전 통지 보고 시점 확인',
        desc: ['모든 사용계약 관련 사전 통지 보고 언제 해야 하는지 확인 필요', '대출약정 조기상환 기간 추가검토 필요'],
        due: null,
        urgent: false,
      },
      {
        title: 'RE: [이지스125호] LEED 인증 컨설팅 용역 변경계약 검토',
        desc: ['계약서 날인 진행하기'],
        due: null,
        urgent: false,
      },
      {
        title: '[Deloitte&NAI] 브이플렉스 매각자문 용역계약서_260522',
        desc: ['용범과장님 검토 중'],
        due: null,
        urgent: false,
      },
      {
        title: 'IBK 임대차계약서 법무 문의',
        desc: ['법무 쪽에 내용 문의하기', '회신 대기중'],
        due: null,
        urgent: false,
      },
      {
        title: '[V-PLEX] 10층 케이티투자운용 전대차 갱신 검토',
        desc: ['PM 측 회신 대기중'],
        due: null,
        urgent: false,
      },
    ],
  },
  {
    key: 'garo',
    name: '149호 가로골목 플래그쉽',
    tasks: [
      {
        title: 'RE: [신탁회계] 국내주식/대여/채권 공정가치평가 (가로골목 청산)',
        desc: ['리뷰 및 읽고 진행', '이정원 차장님께 이대로 진행해도 되는지 확인'],
        due: null,
        urgent: false,
      },
      {
        title: 'FW: 149호 보수확인 요청',
        desc: ['보험료 음수 찍히는 것 처리방법 확인 필요', 'AM에서 따로 결론지어줘야 함 (스카이펀드서비스 요청건 아님)'],
        due: null,
        urgent: false,
      },
      {
        title: '149호 신한 대주 확인 / 개인 대주 확인',
        desc: ['대주 관련 확인 진행'],
        due: null,
        urgent: false,
      },
      {
        title: '149호 선급금 전액 비용처리 문의',
        desc: ['김지현 파트장님께서 소통 중'],
        due: null,
        urgent: false,
      },
    ],
  },
  {
    key: 'gasan',
    name: '156호 가산IDC',
    tasks: [
      {
        title: '지엘가산메트로 정기주총 개최',
        desc: ['이사회 및 주총 서류 중 지엘 날인 필요한 것들 내용 저장'],
        due: null,
        urgent: false,
      },
      {
        title: '[지엘가산] 배당 관련',
        desc: ['현재 5·11월 RF → 월할로 내용 적용', '결산기 1년이나 분기별 배당 진행, 90% 이상 배당이익시 법인세 면제 내용 확인 필요'],
        due: null,
        urgent: false,
      },
      {
        title: '취득세 진행상황 확인',
        desc: ['30일 화요일 오후 2시 미팅'],
        due: '6/30(화) 14:00',
        urgent: false,
      },
      {
        title: '가산IDC 취득세 유보금 반환',
        desc: ['강재우 대리', '26년 8월 중순 회신', '다음주까지 체크하기'],
        due: '~다음주',
        urgent: false,
      },
      {
        title: '배당 관련 내용 정리',
        desc: ['자산운용보고 및 절차까지 자세히 봐야 함'],
        due: null,
        urgent: false,
      },
      {
        title: '삼덕 인보이스 송부 - 지엘가산메트로',
        desc: ['세금계산서 수령 후 처리', '24일 지급 시 같이'],
        due: '6/24',
        urgent: false,
      },
      {
        title: '[지엘가산메트로] 가산IDC 6층 MMR 상면 증설 전력설비 구축 공사 계약',
        desc: ['회신 대기중'],
        due: null,
        urgent: false,
      },
      {
        title: '정산요청 RE: 가산DC 9층 한국투자증권 컨테인먼트 공사 계약',
        desc: ['서방이엔티 담당자와 얘기 끝내야 함'],
        due: null,
        urgent: true,
      },
      {
        title: '[이지스156호] 34기 예상정산금액 안내 - 분배금 지급',
        desc: [
          '26일 분배금 지급 시 당일 자금처리 시간 고려, 오전 일찍 지급되도록 협조 요청',
          '25일 펀드 결산 후 분배금 확정 / 금액 변동여부 안내 필요',
          '자금 집행 24일 해야 함 !!!',
        ],
        due: '분배금 3/26 · 자금집행 24일',
        urgent: true,
      },
      {
        title: '[이지스156호] 26년 3차 임시주주총회 서류 날인 운용지시',
        desc: ['주총 서류 날인 운용지시 진행'],
        due: null,
        urgent: false,
      },
      {
        title: 'RE: [하나자산신탁] 지방세 과세표준·세액 경정청구 결과 통지',
        desc: ['SKB 회신 대기중'],
        due: null,
        urgent: false,
      },
    ],
  },
  {
    key: 'cj',
    name: '372호 CJ제일제당 건물',
    tasks: [
      {
        title: '[이지스372호] CJ제일제당 7층·9층 전대차 합의 및 동의 요청',
        desc: ['회신 대기중'],
        due: null,
        urgent: false,
      },
      {
        title: '[이지스372호] 이자지급',
        desc: ['이자지급 6/26일'],
        due: '6/26',
        urgent: true,
      },
      {
        title: '[이지스372호] 결산 관련',
        desc: ['숫자 확정 후 CJ대한통운에 내용 송부 필요', '26일에 내용 송부하기'],
        due: '6/26',
        urgent: true,
      },
      {
        title: 'FW: RE: [CJ제일제당센터] 임대차계약 및 설치약정 중도인상',
        desc: ['운용지시서 회신 대기중', '유동화비용 같이 처리해야 함'],
        due: null,
        urgent: false,
      },
      {
        title: '[이지스372호] CJ제일제당센터 전대차동의서 날인 운용지시',
        desc: ['19일에 처리하자'],
        due: '2026.06.18',
        urgent: true,
      },
      {
        title: '[농협은행] 엔에이치디디피(유) 유동화비용 지급 요청',
        desc: ['유동화비용 지급 요청 건'],
        due: '6/26',
        urgent: true,
      },
      {
        title: '[키움] CJ제일제당센터 담보대출 대주 SPC 유동화비용 청구 공문 요청',
        desc: ['신윤미 과장님 / 키움측에서 공문 모아서 주면 그 금액 지급'],
        due: null,
        urgent: true,
      },
      {
        title: '중구 건물사용명세서',
        desc: ['중구 건물사용명세서 송부했는지 확인', '6월 30일까지'],
        due: '6/30',
        urgent: false,
      },
      {
        title: '[이지스372호] 임대차계약·설치약정서 변경계약서 날인 운용지시',
        desc: ['변경계약서 날인 운용지시 진행'],
        due: '2026.06.24',
        urgent: false,
      },
    ],
  },
  {
    key: '416',
    name: '416호',
    tasks: [
      {
        title: '마이아트뮤지엄 서류 조사',
        desc: ['이종식·이정훈 과장 확인'],
        due: null,
        urgent: false,
      },
    ],
  },
  {
    key: 'exit',
    name: 'Exit TFT',
    tasks: [],
  },
]
