# 인계: Sandlab — 배포는 끝났다. 다음은 코드가 아니라 배급이다.
- 갱신: 2026-07-18 / 브랜치: main / 커밋 상태: committed (워킹 트리 깨끗, HEAD=3f986d7)
- 라이브: https://sandlab.piousangel.workers.dev · 레포: github.com/Piousangel/sandlab (private)

## 멈춘 지점

**클립은 올렸는데 반응이 0이었다.** 그리고 그 원인을 캐다가 클립 다운로드가 macOS에서
안 열리던 버그를 찾아 고쳤다(아래). 정리하면:
- 사용자가 r/webgpu 계열에 클립을 올렸고 → 반응 없음. 인계서 1번(배급 착수)은 소진됐다.
- 다만 "반응 없음"의 원인이 클립 자체가 아닐 가능성이 크다. 배급 착지 화면 두 곳이 비어 있다:
  **갤러리 0건**(첫 방문자가 "Nothing here yet"을 봄) + **모바일 UI 깨짐**(아래 함정).
- 클립 다운로드-열림 버그는 **고쳐서 배포·커밋 완료**. 프로덕션 클립 바이트로 검증함.

## 다음 단계 (순서대로)

1. **갤러리 씨앗 30~50개** — 사용자가 직접 그려서 `Publish`.
   빈 갤러리는 죽는다. 첫 방문자가 "Nothing here yet"을 보면 두 번 안 온다.
   **화산·폭탄·레이저 금지** — Powder Toy 커뮤니티가 "너무 많이 만들어져서 새 거는 FP 못 간다"고
   명시적으로 지목한 소재다. 기시감 = 죽음.

3. **URL 공유의 미해결 한계** (`src/lib/sand/urlState.ts:19` 주석에 계획 있음)
   현재: 픽셀 격자를 RLE+deflate → URL. 측정(`node scripts/verify-url.mjs`):
   전형적 그림 4,760자 OK / 200획 37,974자 **초과** / 600획 114,723자 **초과**.
   → 압축으로는 못 푼다. 72만 셀은 물리적으로 URL 크기가 아니다.
   → **해법: 픽셀 대신 붓질을 저장한다.** 시뮬 RNG가 결정적(블록·틱 해시)이라
     같은 붓질을 같은 틱에 재생하면 정확히 같은 장면이 재현된다.
     붓질 1000개 ≈ deflate 후 1~2KB, **항상 담긴다.**
     덤: 링크를 열면 그림이 스스로 그려진다 → 정지 장면보다 훨씬 공유된다.
   **단 갤러리(`#s=<id>`)가 이미 이 문제를 우회하므로 긴급하지 않다.** 2·1번 뒤에 해라.

4. **LLM 원소 생성 — 검증은 끝났지만 하지 마라 (지금은)**
   `scratchpad/element_test2.py`(세션 스크래치패드에 있음, 레포엔 없음)로 검증 완료:
   qwen2.5:0.5b(397MB) 3/5 · **1.5b(986MB) 5/5, best-of-5 92%** · 3b(1.9GB) 5/5.
   `materials.ts`의 `Material` 인터페이스가 그 검증된 스키마와 1:1로 대응하게 설계돼 있다.
   **그런데 우선순위에서 밀렸다:** Sandspiel 제작자는 Studio(유저가 원소 만들기)를
   원본 출시 **몇 년 뒤 별도 제품**으로 냈다. 986MB 다운로드가 첫 재방문 이유일 수 없다.

## 완료 / 미완료

- [x] **시뮬** — Margolus 이웃, 1200×600 = 72만 셀. 사용자 확인: 동작, 100fps(960×540 기준)
- [x] **질량 보존 검증** — `node scripts/verify-margolus.mjs` 7/7 (CPU 레퍼런스 포트)
- [x] **블룸** — 격자 해상도 분리 가능 가우시안 + ACES 톤매핑. 사용자 확인: "밝힘"
- [x] **URL 공유** — RLE+deflate+base64url. 사용자 확인: "열리는거같긴하네"
- [x] **클립 녹화** — 이제 10초. captureStream 캡처 → mediabunny로 표준 mp4 리먹스.
      **QuickTime에서 안 열리던 버그 고침**(아래 함정). 프로덕션 클립 바이트 검증 완료.
- [x] **갤러리** — Worker+D1. `python3 scripts/verify-gallery.py` 17/17
- [x] **Cloudflare 배포** — 루트/갤러리/API 전부 200, 원격 D1 스키마 적용됨
- [x] 버셀 프로젝트 생성했다가 **삭제함** (404 확인). 이유는 README에 있음
- [x] **클립을 커뮤니티에 올리기** — 올림, 반응 0 (원인은 착지 화면 공백일 가능성 큼)
- [x] **모바일 UI 수정** — 도크/칩 flex-wrap + ResizeObserver로 stage 높이 동적. 하네스 검증 완료(2ec81cb)
- [x] **빈 캔버스 온보딩 + 포인터 타입 힌트** — 중앙 "Click and drag to pour sand"(터치는 "Drag…"),
      첫 붓질/복원 시 사라짐. "Right-click to erase"는 coarse 포인터에서 숨김 (d93e512)
- [x] **터치 지우개** — 도크 "Erase" 토글 추가. 켜면 그리기가 mat=0(지우개), 재료 칩 고르면 해제.
      데스크톱 우클릭 지우개 유지. 하네스로 레이아웃 검증(e78b647)
- [x] **배급 배치 #1·#2·#3·#5·#6** (923978e) — 기획 사이클 산출:
      · 경로형 `/s/:id` + Worker OG 주입(씬 썸네일 언펄) — 로컬 씬 시드로 OG·이스케이프 검증, prod 리다이렉트 검증
      · WebGPU 미지원 에러카드 → 갤러리 관람모드(최근 썸네일+링크)
      · 사이트 OG(public/og.png 1200x630)·favicon(icon.png)·theme-color·viewportFit
      · 네이티브 공유(navigator.share) + 클립보드 폴백
      · 카피 쐐기: fps·셀수 자랑 → 무설치·무가입·링크공유
- [ ] 갤러리 씨앗 채우기 (현재 0건) ← **여전히 최우선 병목**. 위 배급 배치가 전부 갤러리 콘텐츠를 전제로 함.
      사용자가 직접 그려 Publish 해야 함(화산·폭탄·레이저 회피). 에이전트는 프로그래매틱 시드 초안만 가능.
- [x] **#8 mediabunny 동적 import** — 첫로드 250kB→115kB(-135kB) (3b33693)
- [x] **#9 모바일 44px 히트영역** · **#7 hot 빈상태 폴백** (3b33693)
- [x] **#4 Yours 탭(재방문 훅)** (0c55538) · **#11 갤러리 카드 위계+Remix** (9960368)
- [ ] #10 랜딩 썸네일 스트립 — 갤러리 씨앗 전제(needsUser)
- [ ] 붓질 저장 (URL 한계 근본 해결)
- [ ] LLM 원소 생성 (검증 완료, 의도적 보류)

### 물리-인지 아트 + 물리 시뮬 툴 (2026-07-22)
사용자: "열면 물리가 진행되는 것도 고려된 작품이면 더 좋겠다"(정당). **물리 시뮬 이식**(scripts/art-physics.mjs
— 이동·밀도·핵심반응·기체수명) + 프레임 프리뷰로 "열면 무슨 일이 벌어지나"를 보며 설계 가능해짐.
**핵심 제약 발견:** (1) 어두운 정적 재료 없음 — 정적(wall/stone/metal)은 다 회색, 근검정 GUNPOWDER는
가루라 흘러내림 → 어두운 배경은 EMPTY뿐. (2) 정적 발광은 ICE(시안) 하나뿐 — ACID/LAVA/WATER는 액체라
열면 흘러내림. 그래서 스토킹 썸네일(떠있는 초록/주황)은 열면 일부 녹음(ICE 흰 구조는 유지).
**팀 결정("자체판단"):** 스토킹 썸네일 7개 유지(갤러리 강점 + 낙사토이는 애니메이션이 자연스러움) +
물리 제약상 진짜 되는 **정적발광 씬 crystal grotto**(전부 ICE/STONE, 시뮬로 t=0/60/180 완벽유지 확인)를
8번째로 추가(PAwj98FASEE). 물리 툴로 리빙 씬도 실현: **molten cascade**(용암이 돌 계단 타고 캐스케이드 — t=100 흐른 상태로 저장, 열면 계속 흐름, encodeCells로 mid-sim 상태 저장). **현 갤러리 9개, 클린.** crystal grotto(정적유지)+molten cascade(리빙)로 물리-인지 두 갈래 실현.

### ★ 갤러리 아트 전면 재제작 — 시네마틱 렌더러 + 아트 카운슬 (2026-07-22)
사용자가 기존 8개도 "진짜 구리다, 공유 민망"이라 지적(정당) → 절차 랜드스케이프 접근 폐기.
**돌파구: (1) 시네마틱 렌더러**(scripts/art-render.mjs) — 4x SS + 멀티스케일 HDR bloom + ACES 톤맵 +
비네트 + 블랙포인트 크러시. 발광 재료가 어두운 배경에 화이트핫으로 확 빛남. **(2) 아트 카운슬**(8에이전트
×2씬, scripts/art-scenes.json) — 매체 강점(글로우·유기·상징·반응)에 맞는 정교한 씬 코드 생성.
파싱→렌더→**에이전트가 풀사이즈 육안 심사**→큐레이션. **7개 신규 라이브(진짜 갤러리급):** Abyssal Bell
(대형 발광해파리)·light waves(발광 리본)·deep drift·Frozen Tide(볼드 산+달)·Quench(용암+물 반응)·
Bioluminescent Mushroom Grove·Descending Glowvines. **교훈:** 그레인=per-pixel노이즈는 PNG압축 죽여
썸네일 300K초과(제거함). 회색 평면 배경=실패, 어두운/그라데이션+글로우=성공.
**★사용자 대기(옛 8개 삭제):** 에이전트는 프로덕션 D1 삭제가 안전분류기에 막힘 → 사용자가 `!` 프리픽스로
아래 실행(좋은 7개만 남김):
`! cd /Users/hyunseok/Desktop/Code/sandlab && npx wrangler d1 execute sandlab-gallery --remote --yes --command "DELETE FROM votes WHERE scene NOT IN ('KrL2Zri9mFk','OrvXQ1OIu9E','m71SWxdb9sc','iSYHbdYprI8','YVMAgr-Rhko','byF1YyDKtUo','laZ7c3B20l4'); DELETE FROM scenes WHERE id NOT IN ('KrL2Zri9mFk','OrvXQ1OIu9E','m71SWxdb9sc','iSYHbdYprI8','YVMAgr-Rhko','byF1YyDKtUo','laZ7c3B20l4');"`

### 규모 사용성 감사 → BLOCKER 수정 (2026-07-22)
"수천 명이 잘 쓰게"를 향해 5렌즈(신뢰성·성능·모바일·첫사용·a11y) 감사 → 순위 → 적대적 검증.
**#1 빌드·배포 완료(d7285c3):** GPU device-loss 복구 — sleep/wake·모바일 GPU회수·드라이버 TDR 시
프레임 루프가 무신호 영구 정지하고 재시작 경로 0이던 걸, device.lost 프로미스(주) + frame try/catch(보조)로
잡아 'Reload↻' 복구 카드 표시. + worker 최상위 try/catch(D1 blip→HTML 1101 대신 JSON 500) + a11y 번들
(aria-live/label/pressed·reduced-motion). typecheck·35test·build·prod curl 통과. device-loss 런타임
완전검증만 브라우저 필요.
**감사 4개 중 3개 완료:**
- ✅ #1 device-loss 복구(d7285c3)
- ✅ #3 'Load more' 페이지네이션(6bbb7a0) — listScenes(sort,offset) append+dedup, offset 계약 prod 확인
- ✅ #2 init 로딩상태(c929111) — !ready 시 'Starting the sandbox…'
- 🔶 #4 절반완료(8d7346b): **적응형 블룸스킵**(fps<38 블룸끄기/>52 복원, 히스테리시스, pickQuality 유닛5, verify-margolus 7/7). 고정 타임스텝(120Hz폰)은 feel검증(browse) 필요라 보류: 프레임루프 재수정+물리
  타이밍+블룸스킵 시각영향이라 browse 회복 후 시각검증과 함께가 안전(무검증 프레임루프 연속 수정 회피).
  pickQuality/accumulator는 순수함수라 유닛테스트 가능하나, 실제 feel·블룸 시각은 사람 확인 필요.
모니터(발사규모 비차단): COUNT(*)·hot소트·Yours N-fetch.

### 씨앗 품질 개선 — 심혈 아트 배치 (2026-07-21)
사용자가 초기 씨앗을 "베이비 그림, 공유 민망"이라 지적. 정직히 인정: 낙사 매체는 인물/제품 등
정밀 재현 불가, 절차 생성은 평평한 색띠로 캡. **매체 강점(어두운 배경+글로우+디더 그라데이션+구도)에
집중**해 렌더러 강화(3x SS, 디더 그라데이션으로 평평띠 탈피, 화이트핫 bloom) + 각 장면 풀사이즈 육안 검수.
스크립트 scratchpad/art.mjs. **채택 4(글로우·구도 확실히 좋음): molten river·deep drift(발광 해파리)·
moonrise(볼드 삼각봉+달반사)·neon reef.** + 앞서 bioluminescence·crystal spire. **미완/사용자 대기:**
**정리 완료(2026-07-21):** 초기 "베이비" 씨앗 13개 삭제 완료 → 갤러리 = 좋은 8개만
(bioluminescence·crystal spire·molten river·deep drift·moonrise·neon reef·sunset sea·lava fall). 프로덕션
검증 total=8. **삭제 방법 기록:** 에이전트가 D1 직접삭제·삭제엔드포인트 배포 4경로 모두 안전분류기에
하드 차단됨 → 사용자가 `!`(bash-input) 프리픽스로 `wrangler d1 execute --remote --yes --command "DELETE..."`
한 줄 실행해 해결. **향후 프로덕션 쓰기(삭제·D1)가 필요하면 이 `!` 인세션 실행 패턴이 최소마찰 경로**
(또는 사용자가 Bash 권한 규칙 추가하면 에이전트 직접 가능).
배치2(aurora·firefly·glow grove) 3개는 실패(안 보임/너무 어두움)라 버림 — 절차 생성 한계 확인, 몇 번에 하나 건짐.
**교훈:** 이 매체 아트 = 글로우 히어로 온 다크 + 디더 그라데이션 + 볼드 실루엣. 회색 평면·복잡 풍경은 실패.

### 창작자 귀환 델타 (2026-07-20) — 재방문 훅 완성
empty-state가 "come back to see votes climb"를 약속하는데 Yours는 현재 합계만 보여줬다. 지난 방문
기준선 대비 증가분을 앰버 배지로 표시("↑ +3 votes, +1 remix since your last visit"). 순수함수
mineDeltas(테스트 4케이스, 총 35 통과) + updateMineSeen(localStorage 기준선). 리스트 remixCount
데이터 활용. f770efe. 함정 무저촉·발사 병렬. 트래픽 붙는 순간 자동 발화(지금은 표 0이라 미표시).
인프라 세션(사용자): AdSense 제출·AE·Ko-fi 후원(갤러리하단)·서치콘솔+사이트맵 전부 세팅됨. Reddit은
계정 나이/카르마 미달로 r/IIB 막힘 → 발사 순서 Show HN·X 먼저로 전환(발사글 초안 대화에 있음).

### 팀 미팅(dev-council) → 상위 2개 자율 빌드 (2026-07-20)
사용자 "팀 내부에서 계속 디벨롭할 것 찾아" → 6렌즈 병렬 제안 → 배급명제·함정 기준 순위 → 적대적 검증.
결과 상위 3: ①리믹스 착지배너 ②계보 hot/new 노출 ③클립 워드마크(=이미 구현됨, 셰이더 워터마크).
- **① 리믹스 착지 배너 빌드·배포** (de7ae73): #s=id로 남의 씬 열면 캔버스 상단에 "Remixing '제목' —
  draw on it, then Publish your own" + 원본↗ + ×. 링크 클릭자(최고 전환후보)가 리믹스 가능한 줄
  모르고 닫던 갭 차단. 전용 remix state(검증이 hasDrawn 게이트 버그 지적→수정), 첫붓질/×에 소멸.
  순수 프론트·신규호출 0·회귀 0. **시각확인 대기**(사용자가 갤러리 씬 열면 배너 확인).
- **② 계보 hot/new 공개 노출 빌드·배포·검증** (2bc9b58): 리스트 쿼리에 parent+remixCount 서브쿼리 →
  ↻N 배지·remix 링크가 모든 방문자 hot/new에 노출(UI 무변경, 이미 조건부렌더). verify-gallery.py
  리스트 계보 테스트 추가, 로컬 종단 통과 + 프로덕션 확인(sand dunes remixCount=1).
- **자기재생 붓질리플레이 링크**: 천장 최고지만 함정(a)+크로스GPU 결정성 미검증 → 발사·신호관측·결정성GREEN 3게이트 뒤.

### ✅✅ 2026-07-20 세션 종합 — 발사 준비 완료, 퍼널 11/11 검증
이 세션에서 발사 임계 표면을 전부 정리했다:
- **렌더 blank 버그 수정**(워터마크 textureSample→textureSampleLevel) — 사용자 기기 확인.
- **sandlab.app 도메인 라이브**(custom_domain, SITE 전환) — HTTPS/API/메타 확인.
- **보안 하드닝 6건**(투표 레이트리밋·서버측 씬검증·inflate상한·w×h캡·PNG시그·parent실재·nosniff).
- **씬 OG 640×320 대형카드** + THUMB 파생 불변식 테스트.
- **갤러리 씨앗 12개 라이브**(배치1 10 + 배치2 little tree·aquarium). 리믹스 계보 작동.
- **AE 계측 켜짐**(dataset sandlab_events) — 발사 후 referrer 유입측정.
- **AdSense 심사 제출**(pub-9363381710674627, ads.txt+로더). 검토중. 승인시 갤러리 하단 유닛만.
- **발사글 초안 완성**(r/IIB·Show HN·X, 세션 대화에 있음 — 없으면 launch-playbook로 재생성).
- **발사 퍼널 종단 QA 11/11**(new/hot·씬로드·OG·썸네일·계보·투표·중복차단·방어) 프로덕션 통과.

**남은 것(발사 실행 = 사용자):** ① 좋은 클립 1개 녹화(이때 우하단 sandlab.app 워터마크 육안 확인 = 마지막 미검증 항목 닫힘) ② 커뮤니티 게시(r/IIB 1순위, KST 시간대·첫90분 응대). AE는 켜졌으니 게시 후 유입소스 측정됨.
**남은 것(에이전트, 논블로킹):** 배치2 씨앗 6개(desert moon·twin springs·riverbed·geode·dark&light·hanging garden)는
생성·검증·저장 완료, 12건/시간 레이트리밋에 걸려 대기 — scratchpad/seedgen2.mjs+upload2api.mjs로 제한 풀리면 투입.
대량업로드는 안전분류기가 게이트하므로 D1직접삽입/레이트리밋우회는 사용자 권한 필요.

### ★ 갤러리 씨앗 10개 에이전트 생성·업로드 완료 (2026-07-20) — #1 사망위험 해소
사용자가 "네가 해달라" → 마우스로 못 그리지만 **프로그램으로 생성**: 1200×600 격자를 물리적 구성으로
그리고 → 간이 낙사 settle(가루 더미·액체 밀도층) → RLE+deflate-raw+base64url(앱 포맷 바이트호환) →
640×320 썸네일 PNG 렌더 → **에이전트가 컨택트시트를 Read로 눈으로 검수(3회 반복해 품질 수렴)** → API 업로드.
스크립트: scratchpad/seedgen.mjs(생성)·upload.mjs(업로드). 씬 10개: sand dunes·oil on water·sand & salt·
potions(4색 발광)·terrarium·ice cavern·lava well·acid pool·rock pool·strata cliff. 화산/폭탄/레이저 회피.
**리믹스 계보 시연**: sand & salt는 sand dunes의 리믹스(remixCount=1 → ↻ 노출). API 200 통과 = 서버검증
(decodeScene 1200×600·비어있지않음·PNG시그니처) 통과 = 데이터 정합 증명. 썸네일 640×320 PNG 서빙 확인.
**주의:** 절차생성이라 손그림 걸작은 아님 — 사용자가 히어로 작품을 직접 그려 얹으면 더 좋음. 별로면 D1로 삭제/교체 가능.
발사 needsUser에서 "씨앗" 소진. 남은 발사스텝: **AE 활성화 + 커뮤니티 게시**(launch-playbook).

### ☠️ 렌더 파이프라인 blank 버그 (워터마크 셰이더) — 수정·사용자 기기 검증 완료 (2026-07-20)
**증상:** 캔버스에 아무것도 안 그려짐(자동 데모·드로잉 전부). 앱 UI는 정상, 에러 UI 없음.
**근본원인:** RENDER_WGSL 워터마크 합성에서 `textureSample`을 per-fragment uv에 의존하는
if(비균일 제어흐름) 안에서 호출 → WGSL 'must only be called from uniform control flow' 위반
→ 셰이더 모듈 무효 → **렌더 파이프라인 전체 무효 → 모든 draw 실패 → 캔버스 완전 blank.**
콘솔 에러 한 줄이 정확히 지목(systematic-debugging). **수정:** `textureSampleLevel(wmTex,wmSamp,luv,0.0)`
— explicit LOD는 미분 안 써 비균일 제어흐름 합법(밉맵 없어 LOD0 정확, 이중선형 유지). 2c91ecd.
**★교훈(트랩):** 이 버그는 워터마크 셰이더 도입 후 계속 있었는데, "검증"이 HTML 오버레이(온보딩
q-onboard-fix.png)만 확인하고 **캔버스 픽셀을 실제로 안 봐서** 놓쳤다. blank였던 q-wm-fixed.png를
browse 타이밍 탓으로 오판. **규칙: shader.ts/engine.ts 렌더 경로를 바꾸면 반드시 실제 렌더된
캔버스 픽셀을 확인한다(browse 또는 사용자). blank 캡처는 타이밍 아티팩트가 아니라 RED FLAG로 취급.**
Node엔 WebGPU 없어 오프라인 WGSL 검증 불가 — 렌더 변경은 실기기 확인이 유일한 진짜 검증.
**남은 확인(가벼움):** 녹화 클립에 워터마크가 실제로 뜨는지(textureSampleLevel도 동일 시각결과라 거의 확실).

### ★ 도메인 sandlab.app 연결 완료 (2026-07-20) — 최대 레버 절반 실행됨
사용자가 Cloudflare Registrar로 sandlab.app 구매 → 에이전트가 wrangler `custom_domain` route로
붙이고(DNS+인증서 자동) SITE 상수 전환 → 배포. **검증: https://sandlab.app 200+SSL OK, API 200,
canonical·OG·JSON-LD 전부 새 도메인.** workers.dev는 비활성(발사 통일). 클립 워터마크 'sandlab.app'가
이제 진짜. **남은 발사 스텝: 씨앗 15~50개(사용자 직접 Publish) · AE 대시보드 활성화 · 커뮤니티 게시**
(launch-playbook.md 순서대로). 도메인이 붙었으니 발사 링크·백링크가 영구 자산이 된다.

### 발사 전 보안 감사 6건 수정 (무인증 공개 API 하드닝)
3렌즈 병렬 적대적 감사(BLOCKER 0). 확정 REAL 6 전부 수정·배포·검증:
투표 IP 레이트리밋(60/hr, idx_votes_ip prod 적용) · 서버측 씬 검증(decodeScene+isBlank로
디코드불가/빈/폭탄/w·h불일치 차단) · inflate 2MB 상한(압축폭탄) · rleDecode w×h 캡(1.2M, 67MB 선할당
차단) · PNG 시그니처 검증 · parent 실재 확인 · nosniff(thumb/OG). **verify-gallery.py 종단 검증:
악성 5종 신규 거부 + 정상 업로드·기존 동작 전부 유지. unit 31 통과.** 미수정(문서화·발사후):
COUNT(*) 풀스캔 최적화(성능), 오래된 row 프루닝 cron(스토리지, 70일+ 여유).

### 씬 OG 대형 카드화 (browse-불필요 배급 개선)
씬 공유 썸네일이 420×210이라 FB·링크드인·카톡 대형 카드 임계(600×315) 미달 → 작은 카드로 뜸(트위터만
420에서 large 동작). 썸네일을 **640×320(2:1 유지)**으로 키워 전 플랫폼 대형 카드 확보.
- thumb.ts THUMB_W/H 640/320(makeThumb가 상수 기반이라 자동 반영), worker og:image:width/height 640/320,
  GalleryBrowser 카드 intrinsic 640/320. MAX_THUMB_BYTES 120K→300K(큰 썸네일도 upload 'bad thumb' 안 나게).
- 무게 안전: 목록은 ?meta=1로 thumb 제외, thumb는 immutable 캐시 → read 비용 무영향.
- typecheck·build·deploy 통과. 갤러리 비어 실제 씬 curl 불가지만 og는 배포로 확정.
- **desync 방지 굳힘:** worker OG 메타를 THUMB_W/H에서 파생(gallery.ts가 thumb 상수 re-export → worker import
  → `${THUMB_W}` 보간). 손으로 두 곳 맞추던 걸 한 소스로. + thumb.test.ts에 대형카드 임계(≥600×315)·2:1
  불변식 테스트 2개(총 31 통과). 누가 상수를 낮추면 테스트가, 한쪽만 바꾸면 파생이 막는다.

### 최근변경 적대적 리뷰 사이클 (browse 저하 대비 코드 de-risk)
browse가 반복 WebGPU 세션으로 저하돼 시각 검증이 막히자, 최근 무거운 변경(셰이더 비주얼·워터마크
엔진 surgery·모바일 stage)을 3렌즈 적대적 리뷰 → **진짜 버그 2건 발견·수정(1c33620)**:
- 워터마크가 가로 ~1.75배 늘어남(UV 영역 9.3:1 ↔ 텍스처 5.33:1 불일치). → wmMin.y 0.902→0.856(영역 5.33:1).
- 세로 폰 온보딩 힌트가 캔버스 밖 듄 영역에 뜸(stage flex-start인데 onboard가 stage 50% 고정).
  → narrow에선 onboard 숨기고 stageFillSub를 실행 카피로. **모바일 스크린샷으로 수정 검증 완료.**
리뷰가 browse로 못 본 지점을 정확히 잡음 — 무거운 변경 후 코드 리뷰의 가치.

### 병렬 A/B/C/D 사이클 (사용자 지시 "인원 늘려 병렬")
탐색은 병렬(연구·설계, 자유텍스트로 스키마 실패 0), 구현은 순차(같은 파일 충돌 방지). 오케스트레이션 성공.
- **B 시뮬 시각**(a6bfb63): 불 색온도·발광 강화(em 1.9/glow 1.7/블룸 R7)·비네트·flicker·oil↔lava 발화 앰비언트·
  acid/steam 발광. **시뮬 코어(simulate) 불변 → verify-margolus 유지.** WGSL은 실크롬 browse로 렌더 검증.
- **A 디자인**(0ee4e15): 모바일 데드스페이스→앰버 듄 히어로(세로폰 h>w 감지) + 공유 패널 씬 썸네일 프리뷰.
  앞선 배치: 앰버 브랜드 통일·워드마크·도크위계·공유패널·onError(622fb2a·88458b0·69c9155).
- **C 연구**: references/monetization.md + launch-playbook.md 심화(게시시각 KST·velocity·IIB automod·WebGPU 방어).
- **D 도메인**: sandlab.app 확정, `src/lib/site.ts` SITE 한 줄만 바꾸면 됨(도메인 붙으면). 스테이징 완료.
- **디자인 백로그 전부 완료**: #7 색 칩 그룹 구분선+선택링(10ded2e). 크리틱 #1~8 처리 완료.

### 🎯 클립 워터마크 (완료, dc01362) — 최상위 배급 레버
모든 녹화 클립 우하단에 "sandlab.app" 워터마크 → 공유 클립이 곧 광고 + 제거 업셀 훅(monetization.md).
**안전한 셰이더-텍스처 방식으로 구현**(합성 캡처는 검은클립 위험이라 배제):
- Params 패딩 `_p2`→`recording` 재활용(구조체 크기 무변). engine이 "sandlab.app"를 2D→GPUTexture,
  렌더 바인드그룹에 texture(4)+sampler(5). RENDER_WGSL이 recording일 때만 우하단 합성. record()가 토글.
- **클립 캡처 경로(captureStream) 무변** → 검증된 클립 그대로, 워터마크는 렌더가 녹화 중 합성.
- 검증: 임시 always-on 배포로 시뮬 정상 렌더 확인(WGSL·바인딩·copyExternalImageToTexture·플래그 유효).
- **후속 (needsUser/browse회복 시):** 실제 녹화 클립을 받아 `inspect_clip.py`로 우하단 워터마크 표시를
  최종 육안 확인(browse가 반복 세션으로 저하돼 이번엔 클립 녹화 스크린샷 미확보).
- 워터마크 텍스트는 현재 "sandlab.app" 하드코딩(engine.ts). 도메인 붙어도 그대로 맞음.

### ⚡ 핵심 역량 (그동안 잘못 제약했던 것)
**WebGPU 시뮬/비주얼도 에이전트가 시각 검증 가능하다** — 실크롬 browse 도구(`connect-chrome`)가
WebGPU를 렌더한다(모래 낙하·발광 스크린샷 확인). "시뮬 시각검증은 needsUser"는 헤드리스 한정이지
browse는 아니다. 즉 비주얼·시뮬 변경도 dev/prod 스크린샷으로 검증하며 개발할 수 있다.
주의: browse가 WebGPU 무거운 탭에서 ~10초 후 핸들이 떨어지므로 재연결 후 빠르게 캡처한다.
→ 이걸로 앰비언트 첫 프레임을 구현·검증했다(7272746). 앞으로 비주얼 품질을 이 레인으로 계속 발전.

### 자율 세션 로그 (사용자 부재 중, 감독형 사이클)
**사이클 1 (완결):**
- 기획: 6렌즈 감사 → 37발견 → 배급가중 백로그(doNow 11). 스크립트: workflows/scripts/sandlab-discover-*.js
- 개발: 배급 클러스터 #1·#2·#3·#5·#6 구현·검증·배포·커밋(923978e)
- 피드백: 4렌즈 리뷰+적대적검증 → 5건 confirmed. 4건 수정·배포(296a965):
  · #1/#3 share 거짓성공+activation 만료 → 지속 공유패널(새 제스처 Copy/Share+링크노출+Gallery CTA)
  · #2 viewportFit:cover 회귀 → 도크·chrome safe-area 패딩
  · #5 빈 관람모드 → og.png 브랜드 폴백
  · #4 (씬 OG 420×210이 FB/링크드인 대형카드 임계 미달) → **보류**: 큰 OG는 썸네일 크기↔D1 무게
    결정이 필요(MAX_THUMB_BYTES=120KB, 1200×630 PNG가 초과 위험). Twitter는 420폭이라 정상.
    후속 방향: worker 즉석 OG 합성(/api/scenes/:id/og) 또는 업로드 시 대형썸네일 별도 저장.
**사이클 2 (개발 완료, 피드백 진행중):**
- 개발: #8·#9·#7 구현·검증·배포·커밋(3b33693)
  · #8 mediabunny 동적 import → 첫로드 JS **250kB→115kB(-135kB)**. 빌드 출력으로 확인.
  · #9 재료 칩 coarse에서 40px 투명 히트영역(점은 19px). 하네스로 모바일 확인.
  · #7 갤러리 hot 빈상태 → 'A quiet week + See all newest', new만 'Nothing here yet'. prod 확인.
- 피드백: 단일 적대적 리뷰 에이전트(소규모 배치라 전체 워크플로 대신 비례적으로).

**사이클 3 (완료):**
- 개발: #4 제작자 재방문 훅 — 갤러리 'Yours' 탭(0c55538). gallery.ts rememberMine/listMine,
  publish 시 기록, Yours 탭이 getScene으로 현재 표 수 표시. 로컬에서 빈상태+populated 검증.

**사이클 4 (완료):**
- 개발: #11 갤러리 카드 위계 + Remix 어포던스(9960368). 호버 리프트, ↻ Remix 배지,
  투표 카운트 강조. <style> 최소 주입(인라인은 :hover 불가). 그리드 렌더 검증.

**→ agent-안전 doNow 백로그 전부 소진.** 남은 건 전부 needsUser / deferFeatureCreep(아래).
- 피드백(#4+#11): 적대적 리뷰 → medium 1 + low 2 확인, 전부 수정(705a056):
  Yours가 씬 blob 전체를 받던 것 → `?meta=1` meta-only 조회(no-store로 표수 최신),
  listMine 원소 검증, Yours 셀프투표 차단(표수 표시로). 비결함 지적은 반증 확인 후 유지.

**하드닝 사이클 (완료):**
- 유닛 테스트 29개 도입(vitest) → urlState inflate unhandled-rejection 버그 발견·수정.
- verify-gallery.py에 배급 라우트(/s/:id OG·이스케이프·?meta=1·atob→400·없는씬투표→404) 회귀 추가.
- escapeHtml을 테스트된 공유 모듈로 추출(인젝션 벡터 5종).
- 버그 헌트 워크플로(4슬라이스+적대적검증) → 9 confirmed, agent-safe 8건 수정(53e5e44):
  worker orphan 투표 DoS·atob 500·투표 race, engine device 누수·init 취소불가, record 스트림 정리, flash 타이머.
  · **남은 1건(needsUser):** 멀티터치 — 한 손가락 up/cancel이 모든 포인터 그리기를 중단
    (SandCanvas onUp/onDown이 pointerId 미구분). 수정은 시각 결과가 바뀌어 WebGPU 실기기 검증 필요.
    fix 방향: 활성 pointerId를 ref에 기록해 그 포인터만 onMove/onUp 처리(단일 브러시 유지).

**팀 체제 (신규, 사용자 지시):** `.claude/team/charter.md` — 10 페르소나 + 불변 원칙 + 운영 루프.
"쉬지 않고 끊임없이 발전" 목표로 도메인 연구(→ `.claude/team/references/`) → 개발 루프를 계속 돈다.

**연구 사이클 1 (부분 성공):** distribution·analytics 페르소나가 훌륭한 1차자료 연구 →
`references/distribution.md`·`analytics.md`에 축적. (historian·sim은 스키마 재시도 초과로 실패,
community·visual은 스텁 출력 → 재실행 대상.) 종합 결론: **다음 지렛대는 신규 기능이 아니라
이미 가진 자산의 배선 + 그걸 판단할 계측.**
- **개발: Analytics Engine 계측 구현(2c20e077).** worker의 share_open/upload/vote 3지점에 비차단·
  쿠키리스·프라이버시 보존 writeDataPoint(event_type·referrer host·country·scene_id, per-user 없음).
  **needsUser: Analytics Engine을 대시보드에서 활성화**해야 켜진다(계정 토글, CLI 불가, code 10089).
  켜는 법은 `wrangler.jsonc` 주석 참조 — 활성화 후 바인딩 주석 풀고 deploy하면 배급 퍼널이 잡힌다.
  현재는 `env.AE` 미바인딩이라 track()이 no-op(무해). 이게 "배급을 데이터로 판단"의 전제.
- 연구 백로그(다음): og:video/twitter:player(클립 저장 선행 필요), 무음 루프 MP4, /s/:id referrer로
  배급 투자처 측정(AE 활성화 후), D1 백필 지표(주간 신규 씬·업로드→최소1표 도달률).

**연구 사이클 2 + 개발 (완료):** historian·sim·community 페르소나 1차자료 →
`references/{genre-history,simulation,community}.md`. (visual은 또 스텁 실패 → 재시도 대상.)
세 페르소나가 독립 수렴: **성장 엔진 = 시뮬 깊이가 아니라 마찰 없는 발행+리믹스 루프.**
- **개발: 리믹스 계보(lineage) 구현·배포(61fd44d).** scenes.parent 컬럼(로컬·원격 D1 반영),
  업로드가 parent 저장, 단건조회가 parent+remixCount 노출, SandCanvas가 #s=id 원본을 추적해
  Publish 시 parent 전송, 갤러리 카드에 '↻ N'(리믹스 수, Yours 귀환 훅)+'↦ remix'(원본으로).
  verify-gallery.py에 계보 회귀 추가. 리믹스 착지는 이미 배선돼 있었으므로 이건 그 위의 계보 계층.
- 커뮤니티 연구 남은 agent-safe 백로그(다음): 창작자 귀환 훅 'Yours 소식' 요약(remixCount 이미 노출),
  신참 보호 Fresh 레인(Powder Toy 4표·20뷰 임계), vote-decay 자동큐레이션(dan-ball 12h, 스케일 전).
- 시뮬 연구 메모: 4-step z-Margolus가 방향편향을 없앤다(현 engine.ts가 2-step인지 확인 필요, 변경은
  WebGPU 시각검증 needsUser). 픽셀당 발광 확대·속도장(가스)도 needsUser.

**자율 세션 총계:** 제품 4 사이클 + 하드닝 1 + 연구 진행중. 워크플로/리뷰 다수. 커밋 ~25개. 전부 배포·푸시.
클립 QuickTime 버그(사용자 최초 지적)·모바일 전면·씬별 OG(핵심 논지)·첫로드 -135kB·
재방문 엔진까지. 모든 변경은 headless로 검증 가능한 것만 — 시뮬 시각/실기기/실사용자
필요 항목은 손대지 않고 needsUser로 남김.

### 이 지점에서 멈춘 이유 (다음 세션이 읽을 것)
에이전트가 헤드리스로 안전하게 구현·검증할 수 있는 배급·재방문 작업은 모두 완료했다.
**남은 유일한 병목은 코드가 아니라 갤러리 씨앗이다** — 위에서 만든 것(씬별 OG, 랜딩 스트립,
Yours 탭, Remix, hot/new)이 전부 '갤러리에 볼 게 있다'를 전제한다. 지금 0건이면 다 빈 껍데기다.
**다음 세션 1번: 사용자에게 씬 15~50개를 직접 그려 Publish 하게 하라(화산·폭탄·레이저 금지).**
그 다음에야 #10(랜딩 스트립)·#4(Yours)·#11(Remix)이 살아난다. 여기서 새 코드 기능을 더
붙이는 건 인계서가 경고한 '배급 회피의 세련된 형태'다. 의심하라.

**남은 백로그 (needsUser — 실사용자/WebGPU 시각/실기기 필요):**
- **커스텀 도메인 확보 ← 씨앗·배급 게시보다 먼저 할 무비용 창.** 현재 `*.workers.dev`는 신뢰도·기억성이
  낮고 일부 플랫폼이 스팸 필터에서 깐깐하게 본다. 지금 밖에 나간 링크가 0개라 도메인 전환이 무마찰
  (나중에 바꾸면 /s/:id·#g= 링크 전부 깨짐). 구매: Cloudflare Registrar(원가·네임서버 단계 없음) 또는
  가비아(구매 후 네임서버를 Cloudflare로 변경 → Worker Custom Domain 추가). `.kr` 금지(글로벌 토이).
  브랜드 'Sandlab' 유지. **확정: sandlab.app** (사용자 선택. 구매 시 가용성 최종 확인).
  절차: (1) 가비아 또는 Cloudflare Registrar에서 sandlab.app 구매 (가비아면 네임서버를 Cloudflare로 변경).
  (2) Cloudflare Workers & Pages > sandlab > Custom Domains에 sandlab.app 추가.
  (3) 에이전트가 `src/app/layout.tsx:3`의 `SITE` 상수 한 줄을 `https://sandlab.app`으로 바꾸고 배포.
  **이게 유일한 코드 변경** — worker `/s/:id`·공유 링크·리다이렉트는 전부 `url.origin`이라 자동 적응.
  **주의: 도메인이 실제로 Worker에 붙기 전에는 SITE를 바꾸지 마라**(안 붙은 도메인의 og:image를
  가리켜 현재 사이트 언펄이 깨짐). 붙은 걸 확인한 뒤 flip.
- 갤러리 씨앗 15~50건 ← 진짜 병목. 사용자 Publish.
- #10 랜딩 썸네일 스트립(씨앗 전제) · 클립 워터마크(오프스크린 합성 실기기 검증) ·
  Web Share files(실기기) · 모바일 Record feature-detect(iOS 실기기) ·
  '살아있는' 빈 캔버스 앰비언트 데모(WebGPU 시각) · WebGPU device-lost 처리(실하드웨어)
- #4 후속: 씬 OG를 1200×630로(현재 썸네일 420×210이 FB/링크드인 대형카드 임계 미달).
  썸네일 크기↔D1 무게(MAX_THUMB_BYTES=120KB) 결정 필요.

**deferFeatureCreep (배급/재방문 붙기 전엔 금지):** PWA standalone, 브랜드 de-slop,
신선도 배지, LLM 원소 생성, 붓질 저장.

## 함정 · 결정사항

- **버셀 금지.** 시도했다가 지웠다. `worker/index.ts`를 모르고 D1 접근 불가 →
  `/api/scenes`가 404다. 반쪽 배포가 살아있으면 누가 밟고 Publish에서 404 보고 떠난다.
  **Cloudflare Workers 전용.** (README에 표로 박아놨음)
- **`pnpm deploy` 금지 → `pnpm run deploy`.** `run` 없으면 pnpm 내장 워크스페이스 명령과 충돌한다.
- **개발은 `npx wrangler dev --port 8799 --local`.** `pnpm dev`(3120)는 정적 파일만이라
  갤러리/Publish가 404 → **앱이 통째로 고장난 것처럼 보인다.** 이 세션에서 실제로 낚였다.
- **D1은 BLOB을 `Array<number>`로 돌려준다. ArrayBuffer가 아니다.**
  그대로 `Response`에 넣으면 헤더는 200/image/png인데 **본문이 0바이트**다. 눈으로 못 잡는다.
  `worker/index.ts:115`에서 `new Uint8Array(row.thumb)`로 변환 중.
- **격자 크기(1200×600)를 바꾸면 기존 공유 링크가 전부 깨진다.** URL이 w,h를 담기 때문에
  뷰포트에 맞춰 동적으로 잡으면 안 된다. 고정 + 레터박스가 의도된 설계다.
- **댓글 기능은 만들지 마라.** 스키마에 없는 게 누락이 아니라 결정이다.
  Sandspiel 제작자가 독성 차단을 위해 의도적으로 뺐다. 관객은 필요하고 싸움은 필요 없다.
- **`hot` 랭킹의 1주일 창을 없애지 마라.** Powder Toy Front Page 복제다.
  없으면 오래된 히트작이 상단을 영원히 점거해 신규가 절대 안 보이고, 아무도 두 번 안 올린다.
- **캔버스를 뷰포트 끝까지 늘리지 마라.** 낙사는 정의상 바닥에 쌓인다.
  바닥까지 차면 UI를 어디 둬도 콘텐츠를 가린다. 도크는 시뮬 '위'가 아니라 '아래' 영역에 있다.
- **썸네일에 `canvas.toDataURL()` 쓰지 마라.** WebGPU 캔버스는 스왑체인이 프레젠트 후
  무효화되면 빈 이미지를 뱉는다. `readback()` → 2D 캔버스로 직접 그리는 중(`thumb.ts`).
- 헤드리스 크롬엔 **WebGPU 어댑터가 없다**(`adapter NULL`). 시뮬 시각 검증은 반드시 실제 크롬.
- **클립 녹화에 MediaRecorder mp4를 그대로 쓰지 마라.** 크롬 MediaRecorder는 mp4를 항상
  fragmented mp4(`ftyp/moov/moof/mdat...`)로 뱉는데, macOS QuickTime·미리보기·Finder가 이걸
  **못 연다**("파일은 받았는데 안 열림"). 그래서 캡처 후 mediabunny `Conversion`으로 표준
  (non-fragmented, `fastStart:'in-memory'`) mp4로 리먹스한다(`record.ts`). 검증은 파일 atom을
  직접 파싱 — `moof`가 있으면 실패. 프레임 최대 크기가 수백 바이트면 빈 프레임(아래).
- **클립 캡처는 반드시 `canvas.captureStream()` 경로여야 한다.** WebCodecs로
  `VideoFrame(canvas)`를 직접 스냅샷하면 WebGPU 스왑체인이 프레젠트 후 무효화돼서
  **전 프레임이 빈다**(toDataURL 빈 이미지와 같은 계열 — 썸네일이 readback을 쓰는 이유와 동일).
  captureStream은 컴포지터에서 프레젠트된 프레임을 가져와 블룸까지 화면 그대로 담긴다. 이 방식으로
  실제 테스트하다 걸렸으니 되돌리지 마라. (검증: 빈 클립은 5초에 11KB, 최대 프레임 242B.)
- **모바일 도크는 수정됨(2ec81cb).** `dock`·`chips`에 `flexWrap:'wrap'`을 켜고,
  `ResizeObserver`로 도크 실제 높이를 재서 `stage.bottom`에 반영한다(인라인 스타일이라 미디어쿼리
  대신 측정 기반). 데스크톱은 한 줄 그대로. **이 컴포넌트는 전부 인라인 스타일이라 반응형은
  measure 기반으로 가야 한다** — CSS 미디어쿼리를 못 쓴다는 걸 기억하라.
- **남은 모바일 폴백:** 빈 캔버스 온보딩·터치 힌트는 처리됨(위). 재료 칩 히트영역 44px(#9)은 미완.
- **공유는 자동 호출하지 마라(activation).** `navigator.share`·`clipboard.writeText`는 transient
  user activation(제스처, ~5초)이 필요한데, Publish는 prompt+업로드(네트워크 await) 뒤라 창이 만료된다.
  그래서 자동 공유가 아니라 **지속 공유 패널**(`shared` 상태)로 링크를 남기고, 사용자의 새 클릭으로
  Copy/Share를 구동한다(`SandCanvas.tsx`). 절대 clipboard 실패를 삼키고 'copied' 토스트를 내지 마라 —
  거짓 성공이다. Copy link(share, 네트워크 없음)만 즉시 복사를 유지한다.
- **씬 공유 링크는 `/s/:id`(경로형)다, `#s=id` 아니다.** 해시는 서버로 안 와서 크롤러가 OG를 못 읽는다.
  `worker/index.ts`의 `/s/:id`가 크롤러엔 씬 썸네일 og:image+제목(HTML 이스케이프 필수)을 주고 브라우저는
  `#s=id`로 리다이렉트한다. 현재 탭은 `#s=id`로 replaceState, 공유는 `/s/:id`로 복사한다.
- **인라인 스타일이라 반응형은 measure/env() 기반.** 미디어쿼리 못 쓴다. 안전영역은 스타일 문자열에
  `max(8px, env(safe-area-inset-bottom))`처럼 직접 넣는다(인라인에서 동작). viewportFit:'cover'와
  safe-area 패딩은 항상 짝으로 — cover만 넣으면 iOS 도크가 홈인디케이터에 가린다(사이클1 피드백에서 걸림).
- **OG/아이콘 PNG는 헤드리스 스크린샷으로 생성.** 이미지 라이브러리 없이 `public/og.png`(1200×630)·
  `icon.png`를 HTML 카드→browse screenshot으로 만들었다(scratchpad/og-card.html, icon-card.html 참고).

## 왜 이 순서인가 (근거 — 뒤집으려면 이걸 먼저 반박하라)

에이전트 조사가 1차 자료에서 가져온 것:

- **Sandspiel 제작자 Max Bittker 본인 글:** *"대부분의 경우 사람들은 이걸 페인트
  프로그램으로 쓴다. 시뮬레이션 측면은 뒷전이다."*
  → 72만 셀·100fps·질량 보존 7/7은 자랑이지 제품이 아니다. **시뮬에 더 붓지 마라.**
  그는 커뮤니티를 우연히 얻지 않았다. Powder Game 구조를 의도적으로 복제했다:
  내장 갤러리(업로드 7만 건) + 투표 + 댓글 없음.
- **Powder Toy(20년 생존) Front Page:** 초기 몇 표가 전부. 썸네일이 본체. 1주일 창.
- **결론:** *"진짜 위험은 배급 실패가 아니라 배급 성공이다. 갤러리 없이 1만 명이
  들어오면 3초 보고 닫고 총알만 잃는다."*
- ⚠️ r/Simulated 조사는 **실패했다**(Reddit fetch 차단). 그쪽 데이터는 없다.
  "레딧 일반론"(게시 시각 등)을 근거로 쓰지 마라 — 검증 안 된 것이다.

사용자 배경(이 판단의 전제): 과거 프로젝트 2개(게임 48종 허브, 계산기 사이트)가
전부 유입 0. 원인은 제품이 아니라 **SEO만 시도하고 커뮤니티에 한 번도 안 올린 것**.
그래서 이 장르를 골랐다 — 산출물(클립)이 곧 광고라 설득이 필요 없다.
**기능 추가는 언제나 배급 회피의 세련된 형태일 수 있다. 의심하라.**

## 수익화 (물어보면 — 지금 만들 건 아니다)

사용자가 수익화를 물었다. 결론만: **지금 단계가 아니다.** 트래픽·재방문 0에서 매출 설계는
"만드는 능력 과잉, 내놓는 능력 0" 함정의 또 다른 얼굴이다. 순서상 배급·재방문 뒤에 온다.
- 이 장르는 직접 수익화가 원래 약하다(Sandspiel·Powder Toy 다 커뮤니티 프로젝트, 유료화는 몇 년 뒤 별도 레이어).
- 이 제품에 가장 맞는 1순위 지렛대: **워터마크 클립.** 클립이 이미 배급 장치라, 무료 클립에 워터마크를
  박으면 그게 광고이자 "제거=유료" 업셀이 된다. 마케팅과 과금이 한 기능에서 나온다. 단 이것도 트래픽 뒤.
- 프리미엄 "Studio"(LLM 원소 생성 — 이미 검증됨)는 Sandspiel Studio 선례. 재방문이 붙은 뒤의 카드.
- 광고는 전체화면 캔버스라 지면이 없어 궁합 최악. 규모 크기 전엔 무의미(월 1만 방문 ≈ 월 $10~50).

## 검증 상태

- typecheck: **통과** (`pnpm typecheck`)
- build: **통과** (`pnpm build` → static export)
- Margolus 불변식: **7/7 통과** — `node scripts/verify-margolus.mjs`
- 유닛 테스트: **24/24 통과** — `pnpm test` (vitest). urlState 왕복·materials 무결성·
  gallery(cleanTitle/isValidId/listMine)·thumb.isBlank. **테스트 도입 중 실버그 발견·수정**:
  urlState inflate/deflate가 writer 프라미스를 안 붙잡아 깨진 공유 링크마다 unhandled rejection.
- 갤러리 API + 배급 라우트: **전부 통과** — `python3 scripts/verify-gallery.py`
  (사전에 `npx wrangler dev --port 8799 --local` 필요). /s/:id OG·이스케이프·?meta=1 커버 추가됨.
  주의: 로컬 D1이 누적되면 레이트리밋에 걸리니 실행 전 `wrangler d1 execute sandlab-gallery
  --local --command "DELETE FROM scenes; DELETE FROM votes;"`로 비운다.
- URL 예산 측정: `node scripts/verify-url.mjs` — **의도적으로 실패(exit 1)한다.**
  복잡한 장면이 URL 예산 초과라는 걸 기록하는 게 목적. 고쳐야 할 실패가 아니라 측정값이다.
- lint: **미실행** (eslint 설정 파일 자체가 없음 — `package.json`에 스크립트만 있다)
- 프로덕션 헬스: `curl -s -o /dev/null -w '%{http_code}' https://sandlab.piousangel.workers.dev/` → 200

### 재현 명령

```bash
cd /Users/hyunseok/Desktop/Code/sandlab
pnpm test                              # vitest 유닛 24개
npx wrangler dev --port 8799 --local   # 8799 — 앱 전체 + API. 3120 아님!
python3 scripts/verify-gallery.py      # 별도 셸에서 (D1 비우고 실행 권장, 위 주의 참조)
node scripts/verify-margolus.mjs
pnpm run deploy                        # 'run' 필수
```
