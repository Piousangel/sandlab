# 샌드랩 함정·결정 정본 (인계서 1043행~에서 분리, 2026-11-24)

## 현재 유효한 함정 (11-24 인계서 현재분에서 옮김 — 컷오버 뒤 새 셸 기준)
- `SANDLAB_UI=classic`으로 빌드했으면 verify-ads에도 같은 변수를 준다(기대 UI 비교).
- 색인 차단은 `NEXT_PUBLIC_NOINDEX=1`(build:preview만). `UI_NEXT`로 noindex를 걸면 prod 전체가 색인에서 빠진다 — verify-ads가 막는다.
- /play/<id> h1 DOM 순서는 옛 prod("1-1First Drop"), 화면은 CSS `order` — spill.test가 잡는다.
- 계측 핑(trackEvent·/api/visit)은 load 뒤 — load 전 이탈은 조금 빠진다. 새 퍼즐 화면은 `trackEvent('challenge_start'|'daily_start')`를 꼭 불러야 북극성에 잡힌다. 이벤트 필드를 더하면 Privacy 'Usage statistics'도.
- 마운트 때 `import()`는 LCP를 늘린다 → 첫 그림에 불필요한 모듈은 `src/ui-next/afterLoad.ts`. lazy 화면은 `LazyBoundary`.
- 서체는 `src/ui-next/fonts.css` — 범위를 바꾸면 `scripts/fonts/build-fonts.py` 재실행.
- `@ui-shell` 새 사용처는 next.config.ts `SHELL_AREAS` 표에 한 줄(없으면 프리뷰 빌드가 멈춤, 의도). `PREVIEW_SWAPS` import 문자열도 같음.
- Lighthouse는 압축 서빙으로만: `scripts/qa/lighthouse.mjs`(무압축이면 LCP 2배 착시). 부하(load 30+)면 0.2~0.4s 부풀음.
- 모달은 `src/ui-next/sheet/BottomSheet` 하나(sheet.test가 손 dialog를 떨어뜨림). 시트 열린 동안 `history.replaceState` 금지. 768+는 내용에 Close 버튼.
- `ADS_ENABLED` true 전환은 한 줄이지만 고위험(리뷰 2회).
- 갤러리 캡션 높이 144 = `.sl-gw-skel` margin-bottom(CLS 0). 팀 작품이 D1에서 지워지면 `picks.ts`에서도 뺀다.
- 레벨을 더하거나 맵을 고치면 `npx tsx scripts/gen-level-thumbs.mts`(play.test가 해시·누락·15KB 검사).
- /play 소개 문장은 `INTRO` 단일 출처. 글 페이지 꼬리 문구는 두 벌 → 고치면 `scripts/qa/content-parity.mjs`.
- base·브랜치 빌드 비교는 같은 폴더에서(모듈 id 절대 경로 차이).
- 새 시뮬 테스트를 다른 폴더에 만들면 vitest.config.ts `SIM_TESTS`에. spill:verify job이 15분을 넘으면 ci.yml matrix 분리. spill:verify 출력은 파일로 리다이렉트.
- `ember-text`는 bone 위에서만. 아이콘 이모지 금지(`pnpm lint:ui`), 색 쌍은 `pnpm check:contrast`.
- `.claude/worktrees/`가 남아 있으면 `pnpm test`에 중복 테스트가 섞인다.
- reduced-motion은 토큰 0.01ms로는 부족 — JS 지연이 남으니 `animation: none`을 따로.
- 헤드리스 크롬엔 WebGPU 어댑터가 없다 — 시뮬 시각·홈 붓기 실화면은 실제 크롬·실기기.

## 레벨 추가 절차·실측 물리 제약 (2026-10-09 챌린지 모드 인계에서 옮김 — `src/lib/challenge` 옛 엔진 기준이라 Spill(`src/lib/spill/levels`)에서는 `pnpm spill:verify <id>`·`CAP=400 npx tsx scripts/spill-explore.mts <id>`·`npx tsx scripts/gen-level-thumbs.mts`가 현재 관문. 물리 제약은 레벨 설계 참고로 유효)
- **레벨 추가 절차(반드시)**: 레벨 파일 + levels/index.ts 한 줄 → `pnpm test`(정합성·**지름길** 테스트:
  목표 재료 직접 낙하 금지, 점화 재료로 연료 옆 칠 금지) → `npx wrangler dev --port 8799 --local` →
  `/play/verify` **ALL PASS**(모범답안 ≤3★·예산 내 + 방치 미클리어). 데일리 풀은 `/play/verify?set=daily`.
  디버그: `?only=<id>&mode=solution|idle&ticks=N` → `window.__verify.census`(재료 집계).
- **실측 물리 제약(레벨 설계 시)**: 액체 수평 확산 매우 느림(수평 흐름 의존 금지), 덩어리 가연물은 수 초 내 전소,
  2줄 이상 용암은 윗줄 돌 껍질이 봉인, 기체는 위로 뜸 → 위에서 붙인 불은 가로 나무를 못 태움(아래서 붙여야),
  빈칸에만 칠하기라 이미 찬 칸(기름막 등)엔 못 칠함, 불 꺼진 뒤 연료 몇 칸 남음(clear max).

## 함정 · 결정사항

- **버셀 금지.** 시도했다가 지웠다. `worker/index.ts`를 모르고 D1 접근 불가 →
  `/api/scenes`가 404다. 반쪽 배포가 살아있으면 누가 밟고 Publish에서 404 보고 떠난다.
  **Cloudflare Workers 전용.** (README에 표로 박아놨음)
- **`pnpm deploy` 금지 → `pnpm run deploy`.** `run` 없으면 pnpm 내장 워크스페이스 명령과 충돌한다. (낡음: 세션 배포는 settings.json deny·guard-bash hook이 막는다 — main 머지 시 Actions deploy.yml이 배포)
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
  measure 기반으로 가야 한다** — CSS 미디어쿼리를 못 쓴다는 걸 기억하라. (낡음: P12 컷오버(#97) 뒤 prod 화면은 src/ui-next 새 셸(CSS) — 인라인 스타일 제약은 classic SandCanvas에만)
- **남은 모바일 폴백:** 빈 캔버스 온보딩·터치 힌트는 처리됨(위). 재료 칩 히트영역 44px(#9)은 미완.
- **공유는 자동 호출하지 마라(activation).** `navigator.share`·`clipboard.writeText`는 transient
  user activation(제스처, ~5초)이 필요한데, Publish는 prompt+업로드(네트워크 await) 뒤라 창이 만료된다.
  그래서 자동 공유가 아니라 **지속 공유 패널**(`shared` 상태)로 링크를 남기고, 사용자의 새 클릭으로
  Copy/Share를 구동한다(`SandCanvas.tsx`). 절대 clipboard 실패를 삼키고 'copied' 토스트를 내지 마라 —
  거짓 성공이다. Copy link(share, 네트워크 없음)만 즉시 복사를 유지한다.
- **씬 공유 링크는 `/s/:id`(경로형)다, `#s=id` 아니다.** 해시는 서버로 안 와서 크롤러가 OG를 못 읽는다.
  `worker/index.ts`의 `/s/:id`가 크롤러엔 씬 썸네일 og:image+제목(HTML 이스케이프 필수)을 주고 브라우저는
  `#s=id`로 리다이렉트한다. 현재 탭은 `#s=id`로 replaceState, 공유는 `/s/:id`로 복사한다.
- **인라인 스타일이라 반응형은 measure/env() 기반.** 미디어쿼리 못 쓴다. 안전영역은 스타일 문자열에 (낡음: P12 컷오버(#97) 뒤 prod는 src/ui-next 새 셸(CSS 파일) — 이 제약은 classic 컴포넌트에만)
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
- 광고는 전체화면 캔버스라 지면이 없어 궁합 최악. 규모 크기 전엔 무의미(월 1만 방문 ≈ 월 $10~50). (낡음: 11-15 이후 AdSense 승인 추진 중, 새 셸에 광고 안내판 자리 있음 — DECISIONS 11-16·P10, ADS_ENABLED=false)

## 검증 상태

- typecheck: **통과** (`pnpm typecheck`)
- build: **통과** (`pnpm build` → static export)
- Margolus 불변식: **7/7 통과** — `node scripts/verify-margolus.mjs`
- 유닛 테스트: **73/73 통과** — `pnpm test` (vitest, 2026-08-10 크리에이터 정체성 태스크 기준). (낡음: 지금은 수천 건, PR CI가 전체 vitest unit·sim을 돈다)
  urlState 왕복·materials 무결성·gallery(cleanTitle/isValidId/cleanCreatorName/isValidCreatorId/listMine)·
  creator.ts(getCreatorName/setCreatorName/getCreatorId 등)·thumb.isBlank. **테스트 도입 중 실버그 발견·수정(과거)**:
  urlState inflate/deflate가 writer 프라미스를 안 붙잡아 깨진 공유 링크마다 unhandled rejection.
- 갤러리 API + 배급 라우트 + 크리에이터 정체성: **전부 통과** — `python3 scripts/verify-gallery.py`
  (사전에 `npx wrangler dev --port 8799 --local` 필요). /s/:id OG·이스케이프·?meta=1 커버 추가됨.
  주의: 로컬 D1이 누적되면 레이트리밋에 걸리니 실행 전 `wrangler d1 execute sandlab-gallery
  --local --command "DELETE FROM scenes; DELETE FROM votes;"`로 비운다.
- URL 예산 측정: `node scripts/verify-url.mjs` — **의도적으로 실패(exit 1)한다.**
  복잡한 장면이 URL 예산 초과라는 걸 기록하는 게 목적. 고쳐야 할 실패가 아니라 측정값이다.
- lint: **미실행** (eslint 설정 파일 자체가 없음 — `package.json`에 스크립트만 있다)
- 프로덕션 헬스: `curl -s -o /dev/null -w '%{http_code}' https://sandlab.piousangel.workers.dev/` → 200 (낡음: prod 주소는 https://sandlab.app)

### 재현 명령

```bash
cd ~/Desktop/Code/sandlab
pnpm test                              # vitest 유닛 24개 (낡음: 지금은 수천 건)
npx wrangler dev --port 8799 --local   # 8799 — 앱 전체 + API. 3120 아님!
python3 scripts/verify-gallery.py      # 별도 셸에서 (D1 비우고 실행 권장, 위 주의 참조)
node scripts/verify-margolus.mjs
pnpm run deploy                        # 'run' 필수 (낡음: 세션 배포 금지 — hook이 막음, main 머지 시 Actions 배포)
```
