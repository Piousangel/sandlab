# 설계: HTML5 게임 포털 임베드 — CrazyGames Basic Launch 검증 (1단계)

- 날짜: 2026-08-13
- 배경: 사용자가 sandlab.app 자체 트래픽(주 395명)만으로는 수익화가 안 된다고 판단, "수단과 방법
  안 가리고" 수익화 방법을 찾아달라고 요청. 팀 회의(7페르소나 병렬 조사,
  `.claude/team/references/monetization.md`)에서 "sandlab.app 트래픽과 완전히 무관하게 도는
  유일한 신규 트랙"으로 HTML5 게임 포털 임베드(Poki/CrazyGames/GameDistribution)를 1순위 추천.
- 이번 브레인스토밍에서 각 포털의 실제 기술 요구사항을 웹 검색으로 조사(공식 문서 인용, 아래 참조).

## 조사로 확인된 핵심 제약 (설계를 결정지은 사실들)

1. **세 포털 모두 "라운드/레벨 기반 게임"을 전제로 광고 SDK가 설계돼 있다.** Poki는
   `commercialBreak()`를 게임 일시정지→재개 시점에만 호출해야 하고
   (`sdk.poki.com/new-requirements`), GameDistribution은 프리롤+미드롤 광고를 필수로 요구하며
   미드롤은 `SDK_GAME_PAUSE`/`SDK_GAME_START` 이벤트에 연결된다(`gamedistribution.com` SDK 문서).
   sandlab은 게임오버·라운드가 없는 연속 샌드박스라 이 모델에 안 맞는다 — 광고 수익화(2단계)를
   하려면 "무엇을 라운드 경계로 볼 것인가"를 별도로 설계해야 한다. **이번 1단계 범위에서는 다루지
   않는다** — 사용자가 명시적으로 범위를 "CrazyGames Basic Launch 검증까지만"으로 확정함.
2. **CrazyGames에 SDK 통합 없이 2주 테스트 가능한 "Basic Launch"가 있다.** 광고 비활성·수익화
   불가지만, 파일 크기 제한(초기 다운로드 ≤50MB, 총 ≤250MB, 파일 수 ≤1500,
   `docs.crazygames.com/requirements/intro`)만 충족하면 제출 가능 — 근거 있는 최소 비용 검증
   경로다.
3. **Poki는 외부 링크·자체 브랜드를 명시적으로 금지한다**("모든 스플래시 스크린과 외부 링크
   제거", 로딩화면 스튜디오 로고만 허용, `sdk.poki.com/new-requirements`). CrazyGames는 "다른
   게임 포털의 브랜딩 포함 금지"만 명시하고 자기 사이트 링크에 대한 명확한 규정은 없음
   (`docs.crazygames.com/faq`) — 즉 하나의 빌드로 두 포털 다 대응하려면 처음부터 sandlab.app
   언급을 완전히 제거하는 게 안전하다. **사용자 결정: 언급 완전 제거.**
4. **현재 정적 빌드를 그대로 제출할 수 없다.** 갤러리 API 호출(`src/lib/sand/gallery.ts`의
   `fetch('/api/scenes', ...)` 등)이 상대경로라, 포털이 다른 도메인/경로에서 서빙하면
   `crazygames.com/api/scenes` 같은 잘못된 주소로 나가 404가 난다. 네트워크 기능 자체를 아예
   안 가져가는 게 유일하게 안전한 해법.

## 범위 (1단계)

포함: `portal/` 신규 패키지, 그리기+시뮬+Clear+로컬 클립 다운로드만 있는 최소 UI, CrazyGames
Basic Launch 제출까지.

명시적으로 비범위(다음 라운드 판단 대상): 광고 SDK 통합·라운드 경계 설계(Poki/GameDistribution/
CrazyGames Full Launch용), discovery.ts·milestones.ts 등 부가 인게이지먼트 기능, Poki/
GameDistribution 동시 제출.

## A. 패키지 구조 & 빌드

새 디렉토리 `portal/`(레포 루트, 메인 Next.js 앱과 완전히 분리된 별도 `package.json` +
`vite.config.ts`).

**재사용(수정 없이 상대경로 import)**: `../src/lib/sand/engine.ts`(WGSL 시뮬 엔진),
`materials.ts`, `shader.ts`, `record.ts`(클립 캡처, `mediabunny` 의존). 전부 네트워크 의존이
없는 순수 시뮬/캡처 로직.

**신규 작성**: `portal/src/App.tsx` — `SandCanvas.tsx`를 참고하되 새로 작성(기존 파일에 포털
전용 분기를 추가하지 않는다 — 이미 큰 컴포넌트가 더 복잡해지는 걸 피함).

**워터마크 제거 방법**: `engine.ts`를 수정하지 않는다. 워터마크 합성은 런타임에
`engine.recording` 플래그로만 켜지므로(`Params.recording` 유니폼, `engine.ts:304`), 포털의
녹화-다운로드 흐름이 이 플래그를 아예 세팅하지 않으면 워터마크가 프레임에 합성되지 않는다.
"sandlab.app" 텍스트가 박힌 GPU 텍스처는 여전히 init 시 생성되지만(`engine.ts:163-192`) 합성
경로를 안 타므로 코드 변경 없이 결과적으로 워터마크 없는 클립이 나온다.

**상대경로**: Vite 기본 asset 참조가 상대경로라 CrazyGames가 임의 경로/zip에서 서빙해도
안 깨진다 — Next.js 정적 export의 절대경로(`/_next/...`) 문제를 원천 회피.

`portal/package.json`은 런타임 의존으로 `mediabunny`(record.ts 의존)와 `react`/`react-dom`,
개발 의존으로 `@webgpu/types`(engine.ts가 쓰는 GPU 전역 타입 — 없으면 typecheck 실패)·`vite`·
`typescript`만 필요 — `next`/`wrangler` 등 메인 앱 전용 의존은 가져가지 않는다.

## B. UI 범위

**포함**:
- WebGPU 캔버스 초기화·그리기(포인터 down/move/up, 브러시 반경)
- 재료 팔레트(`PRESETS` 기반 칩)
- Clear 버튼
- Record → 로컬 다운로드 버튼(워터마크 없음, `record.ts` 그대로 재사용)
- 빈 캔버스 온보딩 힌트(순수 텍스트, 그대로 재사용 가능)
- WebGPU 미지원 폴백 카드 — 단 메인 사이트의 "갤러리 관람모드" 링크는 제거, 순수 에러 텍스트만

**제외**(전부 `worker/index.ts` 네트워크 호출이거나 sandlab.app 브랜드 노출):
- Publish/갤러리 업로드·목록·투표·리믹스·크리에이터 닉네임/리더보드 — `gallery.ts`/`creator.ts`
  import 안 함
- 공유 링크(`#s=`, `urlState.ts`) — 공유 대상(sandlab.app)이 없으므로 무의미
- Ko-fi 링크, AdSense 스크립트, "sandlab.app" 텍스트/로고 일체
- `discovery.ts`(첫사용 토스트)·`milestones.ts`(부은 양 마일스톤) — 기술적으론 재사용 가능하나
  이번 v1(검증용 최소 빌드) 범위 밖(YAGNI). Basic Launch 반응이 좋으면 다음 라운드에 추가 검토.

**그리드 크기**: 1200×600 고정 유지 — 메인 사이트와 동일 시뮬, 절대 안 바꾼다(프로젝트 불변 규칙).

## C. 검증 & 제출 절차

**자동 검증(에이전트)**:
1. `cd portal && npm run build` — 빌드 성공
2. 결과물 크기·파일 수 측정 — CrazyGames Basic Launch 한도(초기 다운로드 ≤50MB, 총 ≤250MB,
   파일 수 ≤1500) 대비 확인. 현재 메인 사이트가 1.6MB/30개 파일(갤러리 코드 포함)이고 포털
   빌드는 네트워크 코드가 통째로 빠지므로 이보다 더 작을 것 — 여유 큼.
3. `npx vite preview` + 실크롬(`connect-chrome`)으로 그리기·Clear·녹화-다운로드 흐름 스모크
   확인(WebGPU라 헤드리스 불가 — 이 프로젝트 확립된 검증 패턴).
4. 다운로드한 클립을 직접 열어 우하단에 워터마크 텍스트가 없는지 육안 확인.

**needsUser(에이전트가 할 수 없는 부분)**:
- CrazyGames 개발자 계정 생성
- 개발자 포털에 zip 업로드, 제목·설명·썸네일·플레이 방법 입력
- "Basic Launch" 제출 → 2주 심사/노출

## 리스크 (투명하게 남겨둠)

- CrazyGames의 자기 사이트 링크 허용 여부가 문서에 명시돼 있지 않다 — 이번 빌드는 링크를
  아예 안 넣어 이 불확실성을 회피했지만, 만약 자기 링크가 허용됐다면 놓친 배급 기회일 수 있다.
  Basic Launch 반응을 보고 판단.
- Basic Launch는 광고 없음 → 이 단계 자체는 **수익 $0**. 목적은 돈이 아니라 "포털에서 이 콘텐츠가
  통하는가"라는 신호 확보. 다음 판단(2단계 착수 여부)은 이 신호에 달려 있다.
- 라운드 경계 설계(2단계)는 이번 스펙에 없음 — Basic Launch가 성공적이면 별도 브레인스토밍 필요.
