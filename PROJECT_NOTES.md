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
- ~~장애물 타입을 더 늘리고 싶다~~ — 해결됨(2026-10-26, 아래 세션 참고).
  네 번째 종류 `anchor` 추가.
- Play Console 실제 등록 작업 자체는 아직 안 함(에셋/텍스트만 준비됨).

## 2026-10-26 세션 — 네 번째 장애물 `anchor`(무게추)

### 왜 이 종류였나
기존 3종이 이미 "직접 노릴 수 있음(ice) / 노릴 수 없음(chain) / 방치하면
번짐(mold)"으로 서로 다른 축을 갖고 있어서, 네 번째는 **남은 축**이어야
의미가 있었음. 후보로 안개(정보 차단)·불씨(수 압박)도 검토했지만, 이 게임의
간판 훅이 중력 전환인데 정작 **중력 자체를 건드리는 장애물이 하나도 없었다**는
점이 결정적이었음 — anchor는 그 칸의 재료가 중력/붕괴 때 절대 움직이지 않아서
해당 줄을 독립된 구간으로 쪼갬. floor 35 등장.

### 구현
- `StageConfig.ts`: `ObstacleKind`에 `'anchor'` 추가, `anchorCount` 필드 추가.
  **중요 — 종류를 늘릴 때 `totalObstacles`를 늘리면 안 됨.** 새 종류는 기존
  예산을 나눠 가지는 방식(등장 순서대로 mold → anchor → chain → 나머지 ice)
  이라 보드가 잠기는 총량은 그대로고, 따라서 "움직일 수 있는 수가 없음"
  상태가 될 확률도 올라가지 않음. 난이도는 같은 예산을 더 고약하게 쓰는
  것으로만 올림. (floor 94 기준 ice 4 / chain 4 / mold 3 / anchor 3 = 14 유지)
- `GameScene.ts`:
  - `gravitySegments()` 신설 — 줄(행/열)을 anchor 칸에서 끊어 구간 배열로
    반환. `applyGravityAndRefill()`이 줄 전체가 아니라 **구간별로** 낙하/리필.
  - 앵커 칸 자체는 중력에서 빠지되, 그 칸의 재료가 매치로 사라졌으면
    제자리에서 다시 채움(`materializeCandy()`로 작게→원래 크기 등장).
  - **보드 가장자리와 단절된 구간**은 새 재료가 날아 들어올 경로가 없음
    (off-board에서 출발하면 앵커를 관통해 지나감) → 그 구간만 fly-in 대신
    `materializeCandy()`로 제자리 등장. 가장자리에 닿은 구간만 기존 fly-in 유지.
  - 녹는 조건은 ice와 동일(인접 매치). `isLocked()`는 종류를 안 가리므로
    스왑 차단은 자동으로 적용됨.
- **이 변경으로 "중력/리필 코드는 장애물을 전혀 몰라도 된다"는 기존 전제가
  깨짐.** 그 전제를 적어둔 주석(`GameScene`의 장애물 블록 헤더)도 같이 갱신했음.
  앞으로 중력 쪽을 건드릴 땐 anchor 구간 분할을 반드시 고려할 것.

### 아이콘: 이모지 대신 텍스트 글리프
처음엔 `⚖`를 썼는데 타일 크기에서 Chrome이 이모지를 **자기 고정 색**으로
그려서 창백한 흰 덩어리가 되고, 사탕이랑 구분이 안 됐음. `↧`(바에 막힌 아래
화살표)로 교체 — 텍스트 글리프라 지정한 색(`#ffe6bf`)이 그대로 먹고 의미도
"여기서 더 안 떨어짐"으로 정확함. 다만 글리프 advance 폭이 15px로, 이모지
아이콘들(29~44px)에 비해 너무 가늘어 눈에 안 띄었음 → `OBSTACLE_STYLE`에
`iconScale` 옵션을 추가해 anchor만 1.7배로 키움.
**교훈: 타일 아이콘을 이모지로 통일하면 색 지정이 무시된다. 색을 맞춰야 하는
아이콘은 텍스트 글리프로 쓰되, 폭이 이모지보다 훨씬 좁다는 걸 감안할 것.**

### 검증 (브라우저, `npm run dev`)
`main.ts`에 **이미 dev 전용 `window.__game` 훅이 있었음**(line ~106,
`import.meta.env.DEV` 가드) — 모르고 임시 훅을 또 넣었다가 되돌림. 다음에
브라우저로 씬 상태를 들여다볼 땐 이 훅을 바로 쓰면 됨:
`window.__game.scene.start('GameScene', { stage: N })`로 원하는 스테이지를
즉시 띄울 수 있어서, 예전처럼 `init()`에 `this.stage = N`을 박고 APK를 다시
빌드할 필요가 없음. TS `private`은 런타임에 없으니 콘솔에서 `s.obstacleType`,
`s.applyGravityAndRefill()`까지 직접 호출해 검증 가능.

확인한 것(전부 통과):
1. 앵커 아래 칸을 비우면 → 위쪽(앵커 포함) 전부 그대로, 아래 구간만 제자리 리필
2. 앵커 위 칸을 비우면 → 위 구간만 한 칸씩 내려오고 앵커/아래 구간은 불변
3. 중력이 가로(`left`)일 때도 행이 동일하게 구간 분할됨
4. 인접 매치 2번으로 앵커 제거 → 그 뒤엔 열 전체가 다시 한 줄로 붕괴
5. 매 단계마다 64칸 전수 감사(스프라이트 row/col 데이터·화면 좌표·표시 크기)
   — 불일치 0건. `materializeCandy()`의 축소→확대 트윈이 크기를 남기지 않음 확인.

### 이 환경에서의 함정 (다음에 또 겪지 말 것)
- **Bash 툴은 샌드박스라 localhost에 못 붙음.** `curl localhost:5173` 실패를
  "서버가 죽었다"로 오해했는데 실제론 멀쩡히 떠 있었음. dev 서버 생사 확인은
  로그 파일이나 `Get-NetTCPConnection`(PowerShell)으로 할 것.
- **`npx vite`가 IPv6(`::1`)에만 바인딩되면 Chrome이 못 붙는다.** 에러 페이지만
  뜨고 원인이 안 보임. `--host 127.0.0.1`을 명시해서 띄울 것.

## 2026-10-26 (이어서) — anchor 에뮬레이터 검증 + 발견한 종횡비 버그

### 검증 방법: 소스 수정 없이 원하는 스테이지로 점프
예전처럼 `init()`에 `this.stage = N`을 박을 필요가 없었음. 릴리스/프로덕션
번들에는 `window.__game` 훅이 없지만(`import.meta.env.DEV` 가드), **debug APK는
Capacitor가 WebView 디버깅을 켜주므로 CDP로 `localStorage`를 직접 심으면 됨.**

```
gradlew assembleDebug → adb install -r → adb shell am start
adb shell cat /proc/net/unix | grep webview_devtools     # 소켓 이름
adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>
curl http://127.0.0.1:9333/json                          # webSocketDebuggerUrl
→ WS로 Runtime.evaluate: localStorage.setItem('towerGravityProgress', ...) 후 reload
```
`towerGravityProgress`에 `{unlocked, current}`만 원하는 스테이지로 넣고 새로고침하면
로비가 바로 그 층에서 열림. node 24는 `WebSocket`이 전역이라 별도 패키지 불필요.

### anchor 실기기 확인 결과 (stage 350 = floor 35, anchor 데뷔 층)
앵커 2개가 (0,1)·(1,1)에 세로로 붙어 나와서 오히려 좋은 테스트가 됨. 그 아래
열에서 3매치를 터뜨린 뒤:
- 앵커 2칸의 재료는 **그대로 남음** (예전 동작이었다면 열 전체가 붕괴하며 떨어졌음)
- 빈 3칸은 위에서 떨어지지 않고 **제자리에서 생성됨** (가장자리와 단절된 구간)
- 매치에 인접했던 아래쪽 앵커는 HP 핍이 ●●→●로 감소, 위쪽 앵커는 그대로
  (인접한 게 cleared 칸이 아니라 다른 앵커이므로) — 녹는 규칙도 정상
- logcat FATAL/Uncaught 0건

### ⚠️ 발견: 폰 화면에서 캔버스가 세로로 늘어남 (이번 변경과 무관, 초기 커밋부터)
에뮬레이터(1080×2400)에서 보드 타일이 눈에 띄게 세로로 길쭉함. 측정 결과:

| | 값 |
|---|---|
| 캔버스 백킹스토어 | 896 × 896 (정사각, 정상) |
| Phaser가 넣은 인라인 스타일 | 391.4px × 391.4px (정사각, 정상) |
| **실제 CSS 박스** | **391.4 × 644.9 (1 : 1.65로 늘어남)** |

원인은 `index.html`의 모바일 미디어쿼리(`max-width: 640px`) 안 `#app` 규칙:
```css
#app { grid-row: 3; width: auto; height: 100%; max-width: 100%; max-height: 100%; }
```
`height: 100%`가 명시돼 있으면 `aspect-ratio: 1/1`은 크기 결정에서 무시되고,
너비만 `max-width: 100%`로 잘려서 박스가 정사각이 아니게 됨. 거기에
`canvas { width:100% !important; height:100% !important }`가 Phaser의 올바른
인라인 사이즈를 덮어써서 백킹스토어가 그대로 늘어나 그려짐.

- **초기 커밋(`2bcf1ac`)부터 있던 규칙** — 이번 anchor 작업과 무관하고,
  이미 비공개 테스트로 올라간 AAB에도 들어 있음.
- **고침 (같은 날, 아래 참고).**

### 종횡비 버그 수정 내용
두 군데를 고쳐야 했고, 둘 중 하나만으론 부족했음.

1. **`canvas`의 `width/height: 100% !important` 제거.** Phaser Scale Manager가
   `FIT` + `CENTER_BOTH`로 **이미 올바른 레터박스 크기를 캔버스 인라인 스타일에
   써주고 있었음** — CSS가 그걸 덮어쓴 게 왜곡의 직접 원인이었음. 이걸 지우면
   `#app`이 정사각이 아닌 상황에서도 캔버스는 알아서 정상 비율을 유지함(2차 방어선).
2. **모바일 `#app`의 `height: 100%` → `height: auto`.** 높이가 명시돼 있으면
   `aspect-ratio: 1/1`이 적용 자체가 안 되고, `max-width`가 너비만 잘라서
   정사각이 깨졌음. 높이를 auto로 둬야 aspect-ratio가 높이를 유도함.

여기에 레이아웃 조정 2개를 더함:
- `.tray`의 보드 행을 `minmax(0, 1fr)` → `auto`로 바꾸고 `align-content: center`.
  보드는 정사각이라 세로로 긴 폰에서 1fr 행은 보드가 절대 채울 수 없는 높이가 됨
  → 위아래로 ~250px 빈 공간이 생김. 행을 내용 크기로 두고 전체를 가운데 정렬하면
  "의도된 한 덩어리"로 읽힘.
- `#app { width: min(100%, calc(100dvh - 240px)) }`. 보통 폰에선 너비가 제약이라
  무의미하지만, 짧은 화면에서 정사각 보드가 푸터를 화면 밖으로 밀어내는 걸 막음.
  240px = 주변 크롬(타이틀 + 고정 92px HUD + 푸터 + gap + safe-area).

**검증 (에뮬레이터 실측, `wm size`로 해상도 바꿔가며):**

| 뷰포트 | 보드 | 비율 | 전체 화면 안에 들어옴 |
|---|---|---|---|
| 411×866 (기본) | 391×391 | 1.000 | ✓ |
| 360×592 (짧은 폰) | 340×340 | 1.000 | ✓ |
| 360×432 (극단) | 192×192 | 1.000 | ✓ (가드가 높이로 제약) |
| 1536×816 (데스크톱) | 424×424 | 1.000 | ✓ |

수정 전 기본 뷰포트에서 391×645(1:1.65)였던 것이 전 구간에서 정확히 1.000이 됨.

## 2026-10-26 (이어서) — AdMob 보상형 광고 실연동

목업(`playMockAd`, 3초 카운트다운)을 실제 `@capacitor-community/admob` 8.2.1
보상형 광고로 교체. 호출 지점은 3곳뿐이었음: 로비 하트 충전, 로비 별가루 보상,
게임 중 이동 수 +10.

### 구조
- `src/ads/adConfig.ts` — 광고 ID와 테스트/실제 전환. **기본값은 debug든 release든
  항상 Google 테스트 광고.** Play Console 내부/비공개 테스트용 AAB도 `--release`라
  "릴리스 빌드니까 실제 광고"는 안전한 신호가 아님 — 테스터가 실제 광고를 누르면
  그게 바로 AdMob 계정 정지 사유인 invalid traffic임. 실제 광고는 빌드할 때
  명시적으로 요구해야 나감: `VITE_REAL_ADS=1 npm run build`.
  `REAL_REWARDED_AD_ID`가 비어 있으면 플래그를 켜도 테스트 광고로 폴백 —
  오타 난 플래그 하나로 존재하지 않는 광고 단위를 요청하는 앱이 나가지 않게.
- `src/ads/adService.ts` — 초기화와 `showRewardedAd()`. 결과를
  `'rewarded' | 'grace' | 'failed' | 'offline' | 'dismissed'`로 돌려주고,
  `shouldGrantReward()`를 통과한 경우에만 호출부가 보상을 지급함.
- `src/ui/AdOverlay.ts` — `watchRewardedAd()` 하나로 흐름 통합(로딩 스피너 →
  광고 → 실패 시 사유별 안내). 웹 빌드(GitHub Pages 데모)는 AdMob이 네이티브
  SDK라 동작하지 않으므로 기존 목업을 폴백으로 유지.

### 정책 결정 (중요)
- **오프라인은 절대 보상 없음.** 오프라인에 보상을 주면 비행기 모드가 가장 싼
  보상 파밍 경로가 됨. `navigator.onLine`이 false면 바로 거부.
- **온라인인데 로드 실패는 세션당 1회만 봐줌**(`grace`). 플레이어 잘못이 아니니
  한 번은 넘어가되, 계속 봐주면 채워지지 않는 광고 단위가 곧 무한 보상이 됨.
- **중간에 닫으면 보상 없음.** 플러그인 문서가 `Dismissed`는 보상 여부와 무관하다고
  명시하고 있어서, `Rewarded` 이벤트를 권위 있는 신호로 삼음.
- 광고 실패로 이동 수를 못 받으면 `showOutOfMovesOptions()`를 다시 띄움 —
  안 그러면 수가 0인 보드에 선택지 없이 갇힘.
- SDK 초기화 실패는 try/catch로 삼키고 앱 시작을 막지 않음.

### 기타
- `AndroidManifest.xml`에 `com.google.android.gms.ads.APPLICATION_ID` 추가
  (없으면 시작 시 크래시). 현재 값은 Google 샘플 앱 ID — 실제 ID로 바꿀 땐
  `REAL_REWARDED_AD_ID`와 **동시에** 바꿀 것.
- i18n 키 4개(`ad.loading`/`ad.unavailable`/`ad.offline`/`ad.dismissed`)를
  22개 언어 전부에 추가. 이탈리아어 `l'annuncio`의 아포스트로피가 TS 문자열을
  깨뜨렸음 — 타이포그래픽 아포스트로피(’)로 해결.
- `docs/privacy.html` 2항을 "예정 안내"에서 실제 연동 내용으로 교체하고 3항
  제3자 제공도 갱신. **코드와 방침이 어긋나지 않게 하는 게 이 프로젝트의 기존
  원칙이니, 광고 쪽을 또 바꾸면 여기도 같이 고칠 것.**

### 검증 (에뮬레이터, 테스트 광고)
1. 광고 완주 → 하트 0→1 지급, `onRewardedVideoAdReward` 발생, 리스너 정상 해제
2. 비행기 모드 → "AD REWARDS NEED AN INTERNET CONNECTION." 안내, 하트 0 유지
3. 광고 시작 6초 후 뒤로가기로 조기 종료 → `Dismissed`만 발생하고 `Reward` 없음,
   하트 0 유지 (보상 미지급)
4. `bundleRelease`(R8 + shrinkResources) 성공 — [[feedback_metaspace_not_heap_for_r8_oom]]의
   Dear Star와 달리 metaspace OOM 없음. Capacitor 기반이라 의존성이 가벼운 덕.

**주의: 비행기 모드를 껐는데 에뮬레이터 네트워크가 안 돌아옴**(`Active default
network: none`). `svc wifi enable`/`svc data enable` 모두 무효였고 `adb reboot`로만
복구됨. 오프라인 테스트는 이 비용을 감안할 것.

## 2026-10-26 (이어서) — 광고 대기 연출 교체 + 타임아웃

### 왜
"광고 요청 → 실제 송출"까지 수 초가 비는데, 그 구간을 **점 세 개짜리 버퍼링
스피너**로 때워놨었음. 사용자가 "이 앱만의 액션은 없냐"고 지적 —
[[feedback_loading_ui_speaks_app_language]]에 적어둔 "테마 있는 앱에 기성품
스피너 쓰지 말 것"을 정작 내가 어긴 케이스였음.

### 교체한 연출: 중력 우물 (gravity well)
패널 안에 3×3 미니 보드를 그리고, **룬 3개가 중력이 향한 벽에 붙어 있다가
0.85초마다 다음 벽으로 쏠려 감**(down→left→up→right, `nextDirection` 재사용).
트윈 이징은 실제 보드 낙하와 같은 `Cubic.easeIn`, 룬마다 45ms 딜레이를 줘서
한 덩어리로 안 움직이게 함.
- **룬은 텍스처가 아니라 `CANDY_PALETTES` 색으로 직접 그림.** 캔디 SVG는
  `GameScene.preload`에서만 로드되므로, 콜드 스타트 직후 로비에서 광고를 틀면
  텍스처가 아직 없어 스프라이트가 빈 칸으로 나옴. 로비/게임 양쪽에서 쓰는
  오버레이라 Graphics로 그리는 쪽이 안전.
- 끝나는 상태가 없어서 "다 됐다"고 오해시킬 여지가 없음 — 대기가 끝날 때까지
  계속 돎.

### 타임아웃 (같이 발견한 구멍)
`prepareRewardVideoAd`에 타임아웃이 없어서, 반쯤 열린 연결에서 응답이 안 오면
**터치를 막는 오버레이 뒤에 플레이어가 영영 갇혔음.** 광고가 안 나오는 것보다
훨씬 나쁜 상태. `withTimeout`으로 **가져오기 단계만** 15초 제한을 검(광고가 일단
화면에 뜬 뒤에는 광고가 UX를 가져가는 게 맞으므로 제한하지 않음). 초과하면
기존 로드 실패 경로로 합류 → grace 1회 → 그 다음부터 거부.
플러그인에 취소 API가 없어서 **경주에서 져도 밑의 요청이 취소되지는 않음.**
다만 `showRewardVideoAd`에 도달하지 않으므로 늦게 도착한 광고가 뜨는 일은 없음.

### 검증
- **연출**: 프레임을 떠서 룬 bbox 좌표를 뽑아 확인.
  `down`(가로·아래) → `left`(세로·왼쪽) → `right`(세로·오른쪽) → `down` 순환 확인.
  **주의: 캡처 간격을 플립 주기(850ms)와 비슷하게 잡으면 매번 같은 위상이 찍혀서
  "안 움직인다"고 오해하게 됨** — 실제로 두 번 속았음. 간격을 어긋나게 잡을 것.
- **타임아웃/grace**: 에뮬레이터 네트워크 스로틀(`adb emu network speed gsm`)로는
  테스트 광고가 캐시돼 있어서 재현이 안 됨(`pm clear` 후에도 로드가 빨랐음).
  결국 `PREPARE_TIMEOUT_MS`를 임시로 1ms로 낮춰 검증하고 원복:
  1차 시도 → 타임아웃 로그 + grace로 하트 지급(0→1)
  2차 시도(같은 세션, 상점 광고) → "NO AD AVAILABLE RIGHT NOW" 안내, 별가루 999 그대로
  **grace는 모듈 변수라 페이지를 새로고침하면 리셋됨** — 2회차 테스트는 반드시
  새로고침 없이 같은 세션 안에서 다른 광고 지점을 눌러야 함.

### 별건으로 관찰된 것 (미수정)
느린 네트워크 + `pm clear` 직후 실행하면 **Google Fonts가 늦게 와서 타이틀/HUD가
세리프 폴백 글꼴로 뜸.** `NOTES_FOR_NEXT_PROJECT.md`의 "폰트는 CDN 대신 로컬 에셋으로
번들" 교훈에 정확히 해당하는 사례. 이번 범위 밖이라 손대지 않음.
## 2026-10-27 — 폰트를 CDN에서 떼어내 앱에 번들

직전 세션에서 "미수정"으로 남겨둔 문제를 처리했다. 프로덕션 출시가 시작돼서
실사용자의 첫 실행에 바로 보이는 문제가 됐기 때문이다.

### 문제
`index.html`이 Google Fonts에서 10개 패밀리를 받아왔다. 네트워크로 오는 웹폰트는
플레이어가 질 수도 있는 경주다 — 느린 회선에서 콜드 스타트하면 타이틀과 HUD가
OS 기본 세리프로 떴고, **Phaser는 텍스트를 생성 시점에 캔버스로 한 번 래스터화하므로
늦게 도착한 폰트는 영영 다시 그려지지 않는다.** 오프라인이면 아예 못 받는다.

### 한 일
`public/fonts/*.woff2` 11개를 앱에 넣고 CDN `<link>` 3줄을 제거, `@font-face`로 대체.

전체 패밀리는 못 싣는다(Noto Serif KR/JP/SC/TC가 각각 13~25MB). 대신 **플레이어에게
보일 수 있는 글자만** 남겨 서브셋했다. player-facing 텍스트가 전부 정적이라
(`src/i18n/translations.ts` 사전 + `src/data/story.ts` 스토리) 그 집합은 추측이 아니라
계산 가능하다. 언어별로 쪼갠 게 핵심 — 한자 838자를 CJK 4개 폰트에 통째로 넣으면
2,530KB지만, 각 폰트에 자기 언어 글자만 주면 **1,496KB**다.

도구는 `tools/fonts/`에 있다(추출 → 서브셋 → 커버리지 검증 3단계, 사용법은 그쪽 README).
**번역 텍스트를 고치면 세 스크립트를 다시 돌려야 한다.** 안 돌리면 에러가 나지 않고
그 언어에서만 글자가 시스템 폰트로 떨어져 조용히 이상해진다.

### 놓칠 뻔한 것 — 언어 선택기
사전/스토리만 긁으면 **설정의 언어 드롭다운이 빠진다.** 이 목록은 현재 언어와 무관하게
22개 언어를 각자의 문자로 동시에 보여주므로, `한국어`·`日本語`·`العربية` 같은 이름들은
어느 한 언어의 집합이 아니라 공용 크롬이다. `LANGUAGES`에서 따로 뽑아내도록 했다.
1차 서브셋에는 이게 빠져 있었고, 다른 화면은 멀쩡해 보여서 눈으로는 못 잡았을 것이다.

### 검증
- `check_coverage.py`: 실제 출하되는 woff2의 cmap을 읽어 22개 언어 전부 **미커버 0자**
  (이모지는 예외 — 전처럼 시스템 폰트가 그린다).
- Playwright로 11개 언어 로비·설정 렌더: **외부 호스트 요청을 전부 차단한 상태**에서
  페이지 에러 0, 폰트 로드 실패 0. 차단한 채로 성공해야 캐시 덕에 돌아가는 게 아님이
  증명된다. 아랍어 연결형, 데바나가리 결합자, 태국어 성조 부호 모두 정상 — 서브셋에
  `--layout-features='*'`를 준 덕이다(이걸 빠뜨리면 글자는 있는데 셰이핑이 깨진다).
- Pixel6_A35_Stable 에뮬레이터: `installDebug` 후 영어/한국어 확인, logcat에
  FATAL·`net::ERR`·폰트 에러 0건. (`Frame latency is negative`는 에뮬레이터 vsync 잡음.)

### 주의
- `public/fonts/`에 둔 파일은 그대로 번들에 복사된다. 서브셋 입력인 글자 목록을
  거기 쓰지 말 것(`.cache/chars/`로 보냄).
- 라이선스는 서브셋해도 따라온다 — `public/fonts/OFL.txt`를 같이 싣는다.
- `FAMILIES` 표(`build_subsets.py`)는 `index.html`의 `--font-title`/`--font-body`,
  `GameConfig.ts`의 `TITLE_FONT`/`BODY_FONT` 폴백 체인과 **같은 내용이어야 한다.**
  한쪽만 고치면 체인이 가리키는 폰트에 그 글자가 없는 상태가 된다.
- 이 세션의 `npx cap sync android`는 **테스트 광고 빌드**를 동기화한 것이다
  (`npm run build`를 플래그 없이 돌렸으므로). 릴리스 AAB를 만들 땐 반드시
  `VITE_REAL_ADS=1 npm run build` → `npx cap sync android` → `bundleRelease`.

## 2026-10-27 (이어서) — 22개 언어 스토어 에셋

스토어 등록정보가 영어 하나뿐이어서, 게임이 22개 언어를 말하는데 나머지 21개 언어
플레이어는 **자기가 읽지 못하는 UI의 스크린샷**을 보고 있었다. 텍스트·이미지 둘 다 채웠다.

- `store/store-listings/<언어>.txt` — 앱 이름·간단한 설명·자세한 설명. 용어는 새로
  짓지 않고 앱 번역에서 가져왔다(로비 타이틀, 화폐명, 특수 재료명, 다섯 안내자 이름).
  Play 글자수 제한(30·80·4000) 검사 통과. 파일명은 한국어 — 콘솔을 한국어로 보는
  사람이 쓰는 목록이라 `ไทย.txt` 같은 이름은 식별이 안 된다.
- `store/스크린샷/<언어>/` — 5컷 × 22언어 = 110장, 1080×1920(콘솔이 요구하는 9:16 정확히).
- `store/그래픽이미지/<언어>.png` — 1024×500.
- 생성 도구와 함정 목록은 `tools/store/README.md`.

**앱 이름은 언어별 번역으로 간다**(사용자 결정). 영어도 `Top Gravity` → `Tower of
Gravity`로 바꿔 게임 내 타이틀과 일치시켰다. en-US 이름은 자체 등록정보가 없는
언어의 기본 표시 이름이기도 하다.

**Play Console 라이브 versionCode는 4**였다(출시명 "4 (1.1)"로 확인). 이번 빌드는 6.
