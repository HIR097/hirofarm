# 정하윤 Life OS 대시보드 (React 구현)

`design_handoff`의 `정하윤 대시보드.dc.html` 디자인 레퍼런스를 **React + Vite**로 재구현한 프로젝트입니다.
사내 `.dc.html` 런타임은 이식하지 않고, 마크업/스타일/상태 로직만 참고해 표준 React 컴포넌트로 재작성했습니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 구현 범위

- **App Shell**: 좌측 고정 사이드바(250px) + 메인 헤더(검색·날씨·테마토글·아바타)
- **3개 탭**: 메인(홈) / 업무 / 운동 — `hyFade` 등장 애니메이션
- **홈 레이아웃 3종**: A(벤토) / B(3 컬럼) / C(포커스) 토글
- **테마**: 라이트 ↔ 다크 (CSS 변수 일괄 교체, `localStorage: hy_theme` 영속)
- **포인트 컬러**: 6종(흑백/라임/블루/오렌지/바이올렛/핑크, `localStorage: hy_accent` 영속)
- **설정 모달**: 백드롭 blur, 테마 전환 + 컬러 스와치
- **인터랙션**: 할 일 체크박스 토글(취소선), nav/variant 전환

## 구조

```
src/
├─ App.jsx                 # 셸 + 상태(tab/homeVar/theme/accent/settings/todos) 조립
├─ theme.js                # 디자인 토큰(THEMES/ACCENTS) + CSS 변수 빌더
├─ data.js                 # ★ 데이터 레이어 — 모든 샘플 데이터 단일 소스
├─ hooks/useLocalStorage.js
├─ components/
│  ├─ Sidebar.jsx  Header.jsx  SettingsModal.jsx
│  ├─ TodoList.jsx          # 홈 변형별(bento/compact/focus) 공용 할 일 목록
│  ├─ ui.jsx                # Card·MiniMetric·ProgressBar·HabitList·WeatherStrip·ActivityTimeline
│  └─ icons.jsx             # 인라인 SVG 아이콘 셋
└─ pages/
   ├─ Home.jsx  Work.jsx  Workout.jsx
```

## 디자인 토큰

- 색상/그림자/액센트는 `src/theme.js`의 `THEMES`·`ACCENTS`에 정의되어 있고,
  `App.jsx`가 루트 div에 `--bg`, `--surface`, `--accent` 등 CSS 변수로 주입합니다.
  컴포넌트는 `var(--token)`만 참조하므로 테마/컬러 변경이 즉시 반영됩니다.
- 폰트: 본문 **Space Grotesk**, 숫자·라벨 **JetBrains Mono** (index.html에서 로드).

## 데이터 / 추후 작업

- `src/data.js`의 모든 값은 디자인 핸드오프의 **하드코딩 샘플**입니다.
  추후 엑셀/실데이터로 교체 시 이 모듈만 fetch 레이어로 바꾸면 뷰는 그대로 동작합니다.
- 플레이스홀더 에셋(프로필 줄무늬, "하"/"H" 이니셜)은 실제 이미지로 교체 예정.
- 아이콘은 자체 인라인 SVG 셋이며, 코드베이스에 `lucide-react` 등이 있으면 교체 가능합니다.
