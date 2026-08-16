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

## 🔒 잠금 (PIN + 콘텐츠 암호화)

사이트는 6자리 PIN 으로 잠겨 있습니다. **PIN 화면은 입구일 뿐이고, 실제 보호는 콘텐츠 암호화가
담당합니다** — 잠금 화면을 우회해도 키가 없으면 데이터는 암호문 그대로입니다.

```
PIN ──PBKDF2(400만회)──> KEK ──복호──> CEK ──AES-256-GCM 복호──> 실제 데이터
```

CEK(콘텐츠 암호화 키)를 따로 두기 때문에 **PIN 을 바꿔도 콘텐츠를 다시 암호화할 필요가 없습니다.**

### 파일 배치

| 위치 | 내용 | 저장소 |
|---|---|---|
| `secure/` | 평문 원본 | ❌ gitignore |
| `public/enc/*.enc` | 암호문 | ✅ 커밋 |
| `public/hy-gate-meta.json` | salt·반복횟수·감싼 CEK (비밀 아님) | ✅ 커밋 |
| `.hy-key.json` | CEK 로컬 캐시 | ❌ gitignore |

보호 대상: `worklog.js`(업무현황) · `fundSchedule.js`(펀드 연간일정) ·
`seoknam-tf-data.js`(TF 메일 319건) · `lovelab-data.js`(팔로워) · `mangrove-plans/*.png`(도면)

### 일상 작업

데이터를 고칠 때는 **`secure/` 안의 평문을 고치고 잠그면** 됩니다.

```bash
py -3 tools/hylock.py lock      # secure/ → public/enc/  (맥은 python3)
py -3 tools/hylock.py status    # 평문/암호문 동기화 상태 점검
git add -A && git commit && git push
```

`lock` 을 빼먹으면 배포본에 반영되지 않습니다. `status` 로 확인하세요.

### 새 PC 에서 처음 받을 때

`secure/` 는 저장소에 없으므로 한 번 풀어줘야 합니다.

```bash
py -3 -m pip install cryptography
py -3 tools/hylock.py unlock --pin <PIN>   # public/enc/ → secure/ 복원
```

### PIN 바꾸기

```bash
py -3 tools/hylock.py setpin --new <새 PIN>
git add public/hy-gate-meta.json && git commit && git push
```

콘텐츠 재암호화 없이 즉시 적용됩니다. salt 도 같이 새로 뽑습니다.

### 한계 (알고 쓰세요)

- **6자리는 경우의 수가 10⁶ 뿐입니다.** 암호문을 통째로 내려받아 오프라인에서 전부 대입해보는
  공격은 원리상 막을 수 없고, PBKDF2 400만 회로 늦추기만 합니다. 자릿수를 늘리는 편이
  반복 횟수를 올리는 것보다 훨씬 효과가 큽니다 (`tools/hylock.py` 의 `PIN_LENGTH`).
- **"30일 기억" 은 CEK 를 localStorage 에 둡니다.** 기기를 이미 손에 넣은 상대는 막지 못합니다.
- 화면의 실패 5회 잠금은 손으로 찍어보는 것만 늦춥니다.

## 데이터 / 추후 작업

- `src/data.js`의 모든 값은 디자인 핸드오프의 **하드코딩 샘플**입니다.
  추후 엑셀/실데이터로 교체 시 이 모듈만 fetch 레이어로 바꾸면 뷰는 그대로 동작합니다.
- 플레이스홀더 에셋(프로필 줄무늬, "하"/"H" 이니셜)은 실제 이미지로 교체 예정.
- 아이콘은 자체 인라인 SVG 셋이며, 코드베이스에 `lucide-react` 등이 있으면 교체 가능합니다.
