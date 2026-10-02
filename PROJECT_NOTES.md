# 중력의 탑 (Tower of Gravity) — 작업 기록

매치-3 퍼즐 게임. Phaser 3 + TypeScript + Vite. 1000개 스테이지, 중력 방향 전환이
핵심 메커닉. 실행: `npm run dev` (Vite, localhost:5173). 타입체크: `npx tsc --noEmit`.

## 게임 개요

- **장르**: 매치-3 (캔디크러쉬 스타일이지만 사탕이 아닌 마법사의 탑 테마)
- **핵심 훅**: 5수(스테이지 진행에 따라 3~6수)마다 중력 방향이 아래→왼쪽→위→오른쪽
  순서로 전환됨. 보드 전체가 그 방향으로 재배치됨.
- **스테이지**: 1~1000, 10스테이지 = 1층. `src/engine/StageConfig.ts`의 공식으로
  목표점수/이동횟수/중력전환주기를 계산 (수작업 데이터 없음).
- **화면 흐름**: LobbyScene(로비/상점/하트) ↔ GameScene(실제 플레이).

## 파일 구조

```
index.html                    HTML 셸 — 간판/HUD/설정모달/i18n data-i18n 속성
src/main.ts                   Phaser 부트스트랩 + HiDPI 텍스트 해상도 패치 + 설정 패널 초기화
src/config/GameConfig.ts      GRID_SIZE, TILE, 색상 개수 등 상수
src/engine/
  BoardModel.ts                초기 보드 생성, 매치 탐지, findLongRuns(크로스밤용)
  Gravity.ts                   중력 방향 enum/전환 로직
  StageConfig.ts                스테이지별 목표점수/이동횟수/중력주기 공식
  Progress.ts                   localStorage 저장: 진행 스테이지, 별가루, 부스터, 하트(+15분 자동충전)
src/art/
  candyArt.ts                   일반 재료 6종 SVG 절차 생성 (포션병/룬석/별가루 등)
  specialArt.ts                 특수 재료 4종 SVG (줄 제거×2, 십자폭탄, 컬러폭탄)
src/data/story.ts               10층마다 뜨는 NPC 대사 (절차적 생성, 층수 필터링 있음)
src/scenes/
  LobbyScene.ts                  로비: 성채형 탑 일러스트, 상점, 하트, 광고
  GameScene.ts                   실제 게임 로직 전부 (가장 큼, 900줄+)
src/ui/
  PillButton.ts                  둥근 필 버튼 컴포넌트 (모든 버튼이 이걸 사용)
  settingsPanel.ts                HTML 설정 모달 제어 (언어 선택, 게임 중 나가기)
src/i18n/                        번역 시스템 (한국어/영어만 완비, 22개 언어 목록만 존재)
```

## 핵심 메커닉 구현 메모

- **특수 재료 4종**: 4매치→줄 제거(가로/세로), L/T자 교차 매치→십자 폭탄(가로+세로
  동시), 5매치+→컬러 폭탄(같은 색 전체 제거). `GameScene.resolveCascade()`에서
  `findLongRuns`로 감지, `promoteToSpecial()`로 승격.
- **특수 재료 발동 경로 3가지**: (1) 탭 두 번(미리보기→발동), (2) 인접 재료와 스왑,
  (3) 일반 매치에 우연히 휩쓸림 — 이 세 경로 모두 `getSpecialActivationCells()`를
  거쳐야 하며, 셋 다 실제로 검증 완료된 상태(이 세션에서 반복적으로 버그 있었음, 아래 참고).
- **컬러 폭탄 pairedType 규칙**: 상대가 일반 사탕이면 그 사탕의 실제 색, 상대가
  다른 특수 재료면 `mostCommonType()`(보드에서 가장 많은 색)을 사용. 특수 재료끼리
  스왑했을 때 상대의 "숨겨진 임의 색"을 타겟으로 삼으면 안 됨 — 실제로 있었던 버그.
- **일반 매치에 특수 재료가 휩쓸리는 문제**: `resolveCascade()` 시작 부분에
  fixed-point 루프로 `matches` 안에 기존 specialGrid 항목이 있으면 그 효과 범위를
  통째로 `matches`에 병합. 이게 없으면 특수 재료가 효과 없이 그냥 사라짐 (실제 버그였음).
- **스테이지 클리어 시 마무리 폭발**: `detonateRemainingSpecials()`가 while 루프로
  보드에 남은 특수 재료가 없어질 때까지 반복 처리 (한 번의 폭발이 또 다른 특수
  재료를 만들 수 있어서 단일 패스로는 부족함).
- **HiDPI 텍스트 흐림**: Phaser 캔버스는 기본적으로 devicePixelRatio를 반영 안 해서
  고해상도 화면에서 텍스트가 흐리게 렌더링됨. `main.ts`에서
  `GameObjectFactory.prototype.text`를 패치해서 모든 `this.add.text()` 호출에
  자동으로 `resolution: dpr`를 주입함 (Phaser 3.60+ 에서 top-level `resolution`
  config가 제거됐기 때문에 이 방식 사용).

## 밸런스 (이번 세션에 조정됨)

- 스테이지 클리어 별가루 보상: `20 + stage*2`(최대 2020개, 너무 후함) →
  `min(30, 8 + floor(stage/20))`로 상한. 목표 점수의 2배 이상 달성 시 1.5배
  보너스 지급 + "목표 2배 달성!" 배너 문구(2026-10-01 추가, `GameScene.checkEndState`).
  이 보너스 문구가 길어서 `showEndBanner`의 wordWrap이 제대로 안 먹고 카드 밖으로
  넘치는 버그가 있었음 — 메시지 자체에 명시적 `\n`을 넣어 해결.
- 상점가: 이동+3 부스터 30→40, 특수 재료 무료 배치 70→70(원래 50에서 인상).
- 하트: 최대 5개, 15분당 1개 자동 충전, 게임 중 이동 소진 시 "광고보고+10수" 또는
  "나가기(하트-1)" 선택. 하트 0개면 로비에서 "탑 오르기" 눌러도 광고 유도.

## i18n 현황

- HTML 쪽(간판, HUD 라벨, 설정 패널, 하단 힌트)은 `data-i18n` 속성 + `src/i18n/`로
  한국어/영어 완비, 22개 언어 목록은 있지만 나머지 20개는 영어로 폴백.
- 간판 제목은 언어 무관하게 박스 크기 고정(300×46) + JS로 폰트 크기 자동 축소
  (`settingsPanel.ts`의 `fitTitleToBox()`).
- **(2026-10-02 완료) Phaser 캔버스 텍스트 i18n 연결.** GameScene/LobbyScene의
  하드코딩된 한국어 문자열을 전부 `t()` 호출로 교체, `translations.ts`에 약 40개
  키 추가(`gravity.flip`, `stageClear.*`, `outOfMoves.*`, `lobby.*`,
  `placementIntro.*`, `item.*` 등). `Gravity.ts`의 `DIRECTION_LABEL`/
  `DIRECTION_LABEL_KO`는 제거하고 `direction.down/left/up/right` 키로 흡수.
  `story.ts`는 캐릭터별(archivist/wisp/gatekeeper/sprite/apprentice) +
  언어별(`ko`/`en`) 이중 구조로 전면 재작성 — 층별 밴드 템플릿 90개, 고정 대사
  4개, 랜덤 이벤트 대사 5개, 아이템 라벨, 스테이지 1/1000 인트로까지 전부 영어
  번역을 새로 작성해 넣음. 선택 로직(시드 기반 캐릭터/템플릿 결정)은 언어와
  무관하게 동일하게 동작 — `getLanguage()`로 언어만 분기.
  언어 변경은 HTML 쪽처럼 즉시 재렌더링되지 않고 **다음 씬 전환/재시작 시점에만**
  반영됨(기존 footerHint와 동일한 패턴) — 별도 실시간 동기화 요구 없음.
- **주의(함정 재발 방지)**: Phaser 코드에 `const t = this.add.text(...)` 패턴이
  여러 곳 있었는데, 이게 `i18n`의 `t()` 함수를 섀도잉해서 번역 호출이 깨질 뻔함.
  전부 `txt`로 이름 변경 완료. 앞으로 텍스트 오브젝트 로컬 변수는 `t`를 쓰지 말 것.
  브라우저로 실제 언어 전환(영→영어 상점/확인창/랜덤이벤트 대사) 확인 완료.

## 디자인 원칙 (이 세션에서 확립됨)

- 흐릿한 텍스트 문제는 두 가지 원인이 섞여 있었음: (1) 단순 대비 부족(밝기/색상) →
  어두운 stroke 추가로 해결, (2) HiDPI 렌더링 자체 문제 → 위의 텍스트 팩토리 패치로
  해결. 둘 다 필요했음.
- 모든 버튼은 `createPillButton()`으로 통일 (각진 Phaser Text+backgroundColor 대신
  둥근 Graphics 배경). 볼드체 기본 적용.
- 로비 탑 일러스트는 "성채형"(중앙 탑 + 좌우 첨탑 + 성벽 + 깃발 + 계단식 기단)으로
  확장됨. 세로 공간이 빠듯하므로 (hearts row ~y90 ~ ascend 버튼 위 ~y326) 높이
  조정 시 겹침을 스크린샷으로 꼭 확인할 것.

## 알려진 이슈 / 다음 작업 후보

1. ~~캔버스 내부 텍스트 i18n 미연결~~ — 해결됨(2026-10-02, 위 i18n 현황 참고).
2. ~~스토리 대사가 100개 층 중 8개 템플릿만 재사용~~ — 해결됨(이번 세션). 층수
   6구간 × 캐릭터 5명별 전용 어투 템플릿(총 90개)으로 재구성, 화자마다 말투가
   다르게 느껴지도록 `src/data/story.ts`의 `CharacterPool` 구조로 변경. 30/60/80/95층
   전환점 대사는 항상 "탑의 문지기"가 말하도록 고정(권위있는 탑의 포고문 성격).
   추가로 스테이지 시작 시 15% 확률(`EVENT_CHANCE`)로 랜덤 이벤트가 떠서 아이템
   1개(이동+3 부스터 또는 특수 재료 4종 중 하나)를 즉시 지급 — `rollRandomEvent()`,
   `GameScene.maybeTriggerRandomEvent()`/`grantEventItem()` 참고. 특수 재료는 기존
   배치 플로우(`pendingSpecialQueue`)에 바로 합류해서 "원하는 칸에 배치" 안내가 뜸.
2-1. (2026-10-01 수정) 하단 힌트(`footerHint`)와 나가기 확인창(`settings.exitConfirm`)은
  HTML/캔버스 모두 i18n 키가 이미 준비돼 있었는데 코드가 `t()`를 안 쓰고 하드코딩된
  한국어를 직접 넣고 있어서, 영어로 설정해도 항상 한국어로 보이던 버그. `GameScene`에서
  `t('footerHint', {n:...})`, `t('settings.exitConfirm')`으로 교체. (다른 캔버스 텍스트,
  예: 스토리 대사/상점/광고 확인창은 애초에 i18n 키 자체가 없는 의도된 미착수 상태 —
  위 1번 항목 그대로 유효함.)
3. 자동화 테스트 시 브라우저 탭이 배경(`document.hidden`)에 있으면 Phaser 트윈이
   느려지거나 멈춘 것처럼 보임 — 실제 버그 아님. 재현 테스트할 땐 `scene.busy`를
   폴링하고, 스크린샷 직전에 한 번 더 waited-poll 할 것.
4. AdMob 등 실제 광고 SDK 연동 전 단계 — 지금은 전부 3초 카운트다운 목업
   (`src/ui/AdOverlay.ts`의 `playMockAd()`). 연동 시 `docs/privacy.html`의
   "예정 안내" 문구도 같이 갱신할 것 (지금은 "곧 AdMob으로 교체 예정"이라고
   명시해둔 상태).

## 2026-10-02 세션 — 출시 준비 + 스테이지 난이도 전면 재설계

### GitHub 레포 + 스토어 자료
- 레포 생성·push 완료: https://github.com/kakimind/tower-of-gravity (이전에는
  git remote 자체가 없었음). `docs/` 폴더를 GitHub Pages 소스로 설정:
  - 홈페이지: https://kakimind.github.io/tower-of-gravity/
  - 개인정보처리방침: `docs/privacy.html` — 광고가 아직 목업이라는 점,
    Google Fonts 외부 요청이 있다는 점을 정확히 명시해둠(실제 코드 상태와
    불일치 없도록 Codex 감사 과정에서 2번 수정됨).
  - 스토어 등록용 자료는 `docs/store/`: `icon-512.png`(기존 adaptive-icon
    아트에서 합성), `feature-graphic.png`(1024×500, `feature-graphic-src.html`
    소스 보존), `screenshot-1~5`(영어 로케일 — 로비/상점/스토리/보드/
    스테이지클리어 화면, 전부 상태바 크롭 완료).
- 사전 출시 정리(Codex 감사 기반): `package.json`/`package-lock.json`의
  옛 이름("candy-match-arcade") 수정, 쓰이지 않는 Capacitor 템플릿 테스트
  파일(`com.getcapacitor.myapp` 패키지) 삭제.

### 효과음 음소거 토글 — "만들어놨는데 안 쓰던" 기능 연결
- `src/audio/sfx.ts`에 `setSfxMuted`/`isSfxMuted`가 완전히 구현돼 있었는데
  UI 어디에도 연결 안 돼 있었음(Codex의 "미사용 export" 스캔으로 발견).
  `index.html` 설정 패널에 토글 추가, `localStorage`(`towerGravitySfxMuted`)에
  저장. 네이티브 `<input type=checkbox>`에 커스텀 width/height를 주니
  Android WebView에서 이상하게 깨져 보이는 버그가 있어서(파란 사각형으로
  렌더링) `appearance:none` + 직접 그린 트랙/노브 CSS로 교체.
- 같은 스캔에서 `playHeartGain()`도 정의만 되고 안 쓰이던 걸 발견 →
  하트 광고 보상에 연결(`LobbyScene.playAdForHeart`).

### 버그 수정: 광고 오버레이가 입력을 막지 않음
- `src/ui/AdOverlay.ts`의 모의 광고 오버레이가 `setInteractive()`를 안 불러서,
  카운트다운 중에 뒤에 있는 로비 버튼(탑 오르기/상점)을 그대로 누를 수 있었음.
  이 상태로 씬을 떠나면 보상 콜백이 영영 발동 안 함(Phaser가 멈춘 씬의 타이머를
  버림). 다른 모든 모달 오버레이는 이미 `setInteractive()`를 쓰고 있었음 —
  이 한 곳만 누락.

### 스테이지 난이도 전면 재설계 (가장 큰 변경)
사용자가 950스테이지를 직접 켜서 확인해본 뒤 피드백을 주고받으며 실시간으로
설계를 바꿈. 최종 방향: **점수 그라인딩이 아니라 물리적 장애물이 메인 난이도**.

- **목표 점수**: 기존 공식은 950스테이지에서 51,330점(이동 수 207개 대비) —
  하루 종일 걸릴 수준이었음. Candy Crush 공식 위키를 실제로 찾아보고 참고한
  결과("이동 수는 보통 15~40개 선 고정, 점수는 그에 맞춰 레벨별로 튜닝하지
  무한정 커지지 않음"), **950스테이지에서야 5000점에 도달**하도록 전체 구간에
  걸쳐 선형 배분(`550 + min(s-1,949) * (4450/949)`), 그 이후(950~1000)는
  5000점 고정.
- **이동 수**: 기존에 무제한 증가(1000스테이지에서 218개)하던 것을 40개로
  상한.
- **색상 등장 시점**: 기존엔 층(floor) 기준 3단계였는데, 사용자 요청으로
  **스테이지 기준**으로 변경 — 5색(~199), 6색(200~499), 7색(500~).
  캔디 종류 자체도 6종→7종으로 늘림(`candyArt.ts`에 teal 하트 추가,
  `CANDY_TYPE_COUNT=7`). **주의**: 8×8 보드 크기(`GRID_SIZE`)는 유지 —
  중간에 9×9로 바꿨다가 사용자가 "보드 크기 말고 캔디 종류"라고 정정해서
  되돌림. 이 되돌림 이력이 git log에 남아있으니 헷갈리지 말 것.
- **장애물 3종 신설** (`GameScene.ts`의 `setupObstacles`/`ObstacleKind`,
  `StageConfig.ts`의 `iceCount`/`chainCount`/`moldCount`/`obstacleHp`):
  - **ice**(얼음, 기존 "lock" 타일의 새 이름): 인접 매치로 녹음. floor4+.
  - **chain**(사슬): 스왑 자체가 불가능한 건 ice와 같지만, **인접 매치로는
    안 녹고 그 칸 자체가 캐스케이드 중 우연히 매치에 포함돼야만 녹음** —
    플레이어가 의도적으로 노릴 수 없는 더 까다로운 장애물. floor20+.
  - **mold**(곰팡이): ice처럼 인접 매치로 녹지만, **3수마다 일정 확률로
    옆 칸에 번짐**(스왑/특수 발동 둘 다 "수"로 침, Codex가 처음에 특수
    발동 쪽 누락된 걸 지적해서 수정함). floor50+, 보드의 40%를 넘지 않게
    상한 걸어둠.
  - 세 종류 모두 floor4~94 구간에 걸쳐 총 장애물 개수가 늘어나도록 재조정
    (기존엔 floor34에서 최댓값 4개로 조기 포화됐었음 → 지금은 최대 14개,
    floor94 근처에서 포화).
  - **법적 주의사항**: 사용자가 명시적으로 "Candy Crush와 법적으로 문제될
    요소는 전부 피하라"고 요청함. 현재 네이밍(ice/chain/mold)과 아이콘은
    범용 매치-3 장르 관례(이모지 조합)이고 Candy Crush 고유 명칭("licorice",
    "jelly", "marmalade" 등)이나 비주얼/캐릭터를 차용하지 않음 — 새 장애물
    추가 시에도 이 원칙 유지할 것.
- **검증 방식**: 실기기(에뮬레이터)에서 `GameScene.init()`에 임시로
  `this.stage = N`을 박아넣고 빌드→설치해서 특정 스테이지를 바로 띄우는
  방식을 반복 사용(세션 끝나기 전 항상 원복 확인함). Chrome DevTools
  Protocol(`adb forward` + websocket)로 좌표 기반 클릭/스와이프까지
  자동화해서 "잠금 타일 스왑이 실제로 막히는지"까지 검증함 — Claude in
  Chrome 확장이 이 세션 중간에 끊겨서 대안으로 쓴 방법. 재현하려면
  `adb shell cat /proc/net/unix | grep webview_devtools`로 소켓 이름 찾고
  `adb forward tcp:9333 localabstract:<소켓명>` 후 `curl localhost:9333/json`으로
  웹소켓 URL 얻으면 됨.

### 다음 후보
- 장애물 타입을 더 늘리고 싶다는 이야기가 나왔었음(사용자가 "다른 물리적
  장애물은 없나요?"라고 물음) — 구조는 이미 일반화돼 있어서
  (`ObstacleKind` 유니온에 타입 추가 + `OBSTACLE_STYLE`에 비주얼 추가 +
  `damageObstacles`에 녹는 조건 추가하는 패턴) 네 번째 종류를 넣는 것도
  어렵지 않음. 다만 이번 세션에선 "여러 개 추가"라는 요청까지만 받고
  ice/chain/mold 세 가지로 마무리함 — 추가 종류가 필요하면 여기서부터
  이어가면 됨.
- Play Console 실제 등록 작업 자체는 아직 안 함(에셋/텍스트만 준비됨).
