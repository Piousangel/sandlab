# 리디자인 P11a — 선택 관 한 번 붓기 · 툴바 키보드 · Lighthouse 게이트 실측 (2026-11-20 13시 설계 숙의·개발)

계획서 3장 P11 = "선택 시험관 루프 1개 + 접근성 마감 (S7 스프라이트, 키보드 로빙, 대비) — Lighthouse LCP ≤2.5s·CLS ≤0.05·INP ≤200ms, axe serious 0".
P11 전체는 한 교대로 끝나지 않는다. **P11a**(이 문서)와 **P11b**(남은 게이트 미달 3곳)로 나눈다. 프리뷰 전용, prod 화면 diff 0.

## 1. 리서치 1 (실측 + 코드)
- **Lighthouse 기준선이 틀려 있었다.** P10은 "글 페이지 LCP 4.5~5.2s, 게이트 미달"로 적었다(DECISIONS P10). 그 측정은 압축 없는 로컬 정적 서버로 했다. 같은 프리뷰 빌드를 gzip으로 서빙하면 /about LCP는 2.1~2.4s다. Cloudflare는 brotli로 보낸다.
  - Lantern(모의 스로틀링)은 기록된 전송 바이트로 1.6Mbps를 모사한다. 무압축 JS·CSS는 다운로드 시간이 2배로 잡힌다.
- **관측 vs 모의**: /about 관측 LCP 162ms = FCP 162ms인데 모의 LCP는 2.4s다. 텍스트 LCP가 FCP와 다른 프레임이면, Lantern은 관측 LCP 이전에 끝난 거의 모든 노드(비차단 JS 청크 포함)를 넣는다(반증 리서치, devtools-frontend `lantern/metrics/LargestContentfulPaint.ts`).
- 기준선(프리뷰 main 7e3a1b1, 중앙값 3회, 압축 서빙): 표는 5장.
- 시험관 스트립은 이미 있다(#67 `capture-posters.mjs --strips`): 12재료 × 12프레임(96×192), 31~68KB. 고체 6종은 없다. 마지막 프레임 = 정지 포스터 장면.
- 랙 탭(5개)은 이미 WAI-ARIA tabs 로빙이다. **재료 18관은 Tab 정지점 18개**, 엄지 도크는 `role=toolbar`인데 로빙이 없었다(정지점 5개).

## 2. 기획 v1
1. 선택 관 한 번 붓기: 스트립 steps() 700ms. 저사양(`hardwareConcurrency ≤ 4`)·reduced-motion은 정지. 첫 선택 때 스트립을 받고, 150ms 안에 안 오면 건너뛴다.
2. 재료 줄 로빙(toolbar), 도크도 로빙.
3. Lighthouse 스크립트 상시화(P10 스크래치 lh.sh의 두 번째 사용 → `scripts/`).
4. WebGPU 미지원 홈 LCP 3.3s(정지 프레임 이미지를 늦게 발견, Load Delay 2.25s) 해결: (a) 우물에 SSR 포스터 (b) 조건부 preload (c) fetchpriority.

## 3. 리서치 2 (반증) → 기획 v2
| v1 | 반증 | v2 |
|---|---|---|
| `hardwareConcurrency ≤ 4` = 저사양 | WebKit `NavigatorBase.cpp`: 코어 8개 미만이면 **늘 4**를 돌려준다 → 모든 iPhone이 '저사양'이 되고, 옥타코어 저가 안드로이드는 통과한다(거꾸로 거름). 헤드리스 크롬도 4 | 조건 삭제. reduced-motion + Save-Data만 |
| 150ms 안에 못 받으면 건너뜀 | 모바일 첫 선택은 거의 늘 건너뛴다 → 첫인상에서 효과가 사라진다 | 대기 300ms. 미리 받기 = hover·focus·pointerdown + **첫 획 뒤** 유휴 시간에 지금 탭 앞 6관. 구경만 하는 방문자는 받지 않는다(최대 6 × ~50KB) |
| background-position steps | 프레임마다 다시 그린다(관이 작아 비용은 작다) | transform translateX steps(12, jump-none) — 합성 단계만 |
| 툴바 vs radiogroup | radiogroup은 화살표 = 선택이라 18관을 지나며 재료가 계속 바뀌고, Erase의 '선택 없음'을 나타내지 못한다. tabpanel 안 toolbar는 문제없다 | toolbar + aria-pressed 유지. 정지점 = 마지막 포커스 → 선택 → 맨 앞. iOS scroll-snap 줄에서 focus()만 하면 화면 밖에 남는 WebKit 버그 → `focus({preventScroll})` + `scrollIntoView({inline:'nearest'})` |
| 미지원 홈 (a) SSR 포스터 | GPU 사용자도 13KB를 받고 "쌓인 모래 → 빈 유리 → 데모 붓기" 모순이 생긴다. canvas는 LCP 후보가 아니라 GPU 사용자 LCP 이득도 0 | 버림 |
| (b) `!('gpu' in navigator)`면 preload | **실측**: 헤드리스 크롬(=Lighthouse)은 `navigator.gpu`가 있고 어댑터만 null이다. 안드로이드의 '어댑터 없음' 기기도 같다 → 실험실 수치도 그 사용자도 못 고친다 | 이번 PR에서 뺀다. P11b에서 다시 본다(아래 6장) |
| 로컬 압축 = Cloudflare 대리 | 맞다. 다만 로컬은 TTFB가 0에 가까워 가장 좋은 대상은 배포된 프리뷰 URL이다 | 스크립트는 압축 서빙(br, 크롬이 http에선 br을 광고하지 않아 gzip). 프리뷰 자동 배포(B) 뒤 URL 모드를 붙인다 |

## 4. 구현 (프리뷰 전용)
- `src/ui-next/home/model.ts`: `STRIP_SLUGS`(파일 목록과 테스트로 대조)·`STRIP_MS 720`·`STRIP_WAIT_MS 300`·`shouldPour`·`warmList`·`rovingNext`·`rovingStop`.
- `Rack.tsx`: 재료 줄 `role=toolbar`, 로빙, 한 번 붓기 오버레이(`.sl-tube-pour`, 회차 key로 다시 고르면 처음부터, animationend에 제거 → 아틀라스 포스터).
- `HomePour.tsx`: 도크 로빙(Erase · 붓 3 · Share), `warm={hasDrawn}`.
- `home.css`: 오버레이 + keyframes. reduced-motion에선 `display:none`(JS 게이트에 더한 안전망).
- `scripts/qa/lighthouse.mjs`: 압축 정적 서버 + Lighthouse CLI(NODE_PATH) + 중앙값 + 게이트 exit 1 + LCP 요소·단계.

## 5. Lighthouse 기준선(main 7e3a1b1 프리뷰, 모바일, 중앙값 3회, 압축)
결과는 PR 본문 표와 DECISIONS 11-20 P11a. 요약: 글 페이지·/daily·/play 통과. 미달은 세 곳이다.
- `/`: LCP 3.27s. 헤드리스에는 WebGPU 어댑터가 없어 정지 프레임 경로를 탄다(이미지 발견 지연).
- `/play/1-1`: CLS 0.073. 보드 유리 `sl-sp-glass`의 크기가 JS 레이아웃으로 정해진다(412×823·DPR 1.75에서만 재현, DPR 1에서는 0.0035).
- `/gallery`: LCP 2.65s(LCP 요소 `p.sl-gw-lede`, Render Delay 1.98s).

## 6. P11b로 넘기는 것
1. `/play/1-1` CLS: SSR 때 보드 유리 자리를 CSS(aspect-ratio + max 높이)로 먼저 잡는다.
2. `/` 미지원 LCP: 정지 프레임을 하이드레이션·어댑터 요청과 무관하게 일찍 그릴 방법. 예: `gpuAdvice`의 동기 판정(카카오·인스타 UA, `navigator.gpu` 없음)은 첫 렌더 직후 effect에서 바로 보이게 하고, 어댑터 null만 비동기로 둔다. 한계를 실측으로 적는다.
3. `/gallery` LCP 2.65s: lede가 첫 프레임에 최종 크기로 그려지는지(폰트 swap·하이드레이션 뒤 텍스트 변경) 확인한다.
4. 대비·axe 전 페이지 재확인, 목차·이전/다음·힌트 details 키보드(P10 인계 ②).

## 7. 사용자 질문
1. **처음 온 사람**: 관을 누르면 그 관에 재료가 한 번 부어진다. "이걸 고르면 이게 나온다"는 확인이 0.7초 안에 끝난다. 첫 탭은 아직 받기 전일 수 있다. 300ms 안에 받으면 재생하고, 늦으면 조용히 건너뛴다. 늦게 혼자 움직이는 관은 없다.
2. **왜 계속**: 관마다 붓는 모습이 다르다(물은 출렁이고 연기는 오르고 모래는 쌓임). 다른 관도 눌러 보게 만드는 작은 보상이다. 캔버스에 붓기 전 '맛보기'.
3. **왜 졌나**: 해당 없음(플레이 판정 무관).
4. **어떻게 쓰나**: 키보드 사용자는 Tab 18번 → 1번으로 랙을 지난다(도크 5 → 1). 화살표로 고르고 Enter. 연타하면 회차 key로 처음부터 다시 재생하고, 같은 관을 다시 누르면 재생하지 않는다. reduced-motion·Save-Data·고체 6종은 정지. 느린 기기는 transform steps 12장이라 합성 단계만 쓴다.
5. **왜 공유**: 해당 없음.
6. **왜 여기서**: Powder Game·Sandspiel의 재료 선택은 이름 버튼이다. 고르는 순간 재료의 실제 움직임(엔진 캡처)을 보여 주는 건 샌드랩의 '유리와 모래' 정체성이다.
7. **오너가 볼 때**: "또 장식이냐"는 질문이 나올 수 있다. 이 PR의 무게중심은 측정이다. 게이트 미달이 실제로 어디인지(글 페이지가 아니라 홈 미지원·보드 CLS·갤러리)를 바로잡았다. 붓기는 S7 계획의 마지막 조각이다.

## 8. 독립 리뷰 (서브에이전트, 작성자 ≠ 검토자) — 7/10, 차단 1
보고된 버그는 별도 e2e(`repro.cjs` → `scripts/qa/home-rack-e2e.cjs`에 흡수)로 재현한 것만 고쳤다.
| 지적 | 처리 |
|---|---|
| 차단: 붓는 중 탭을 바꾸면 animationend가 오지 않는다. 돌아오면 누르지 않은 관이 혼자 다시 붓는다 | **재현함**(돌아온 뒤 오버레이 1개) → 탭 전환 때 회차를 올리고 pour를 비운다. 수정 뒤 0 |
| 오버레이 64px인데 유리 안쪽은 65px이다. 아래 1px로 아틀라스가 비친다 | **재현함**(틈 1px) → `bottom:0`. 수정 뒤 0 |
| onload 뒤 디코드 전에 재생하면 앞 프레임이 빈 칸이 된다 | 수용: `img.decode()` 뒤 준비로 친다(300ms 판정도 디코드까지) |
| `::after` z-index가 쌓임 맥락 밖으로 샌다 | 수용: `.sl-tube-glass { isolation: isolate }` |
| 다른 경로로 sel이 바뀌어도 Tab이 옛 포커스 관에 멈춘다 | 수용: sel이 바뀌면 포커스 기억을 비운다 |
| 도크 로빙이 상태값 기준이다(버튼이 늘면 어긋남) | 수용: 이벤트 대상의 위치 기준 |
| lighthouse.mjs: 크래시와 게이트 실패가 같은 exit 1, 짝수·0 runs, 경로 접두어, 잘못된 % 인코딩에 서버가 죽음 | 수용: exit 2 + finally 정리, 홀수만, `dir + sep`, 400 |
| 첫 프레임이 빈 관이다. '붓는다'인데 관이 비었다가 채워진다(은유 혼동) | **거부(관찰 과제로 남김)**: 실엔진 캡처 그대로의 '부어 채워지는' 장면이 S7 의도다. 비운 뒤 채우는 데 0.7초 미만. 오너·3초 테스트에서 혼동이 나오면 첫 프레임을 3번째부터 시작하도록 한 줄로 바꾼다 |
| 모바일 첫 탭은 대부분 300ms 컷에 걸려 첫 선택의 효과가 안 보인다 | 부분 수용: 첫 획 뒤 유휴 미리 받기가 그 문제를 줄인다(첫 탭은 대개 첫 획 전, 두 번째부터는 받아 둠). 실기기 확인은 프리뷰 배포 뒤 03시 QA 과제 |
