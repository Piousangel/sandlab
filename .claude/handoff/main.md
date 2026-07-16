# 인계: Sandlab — 배포는 끝났다. 다음은 코드가 아니라 배급이다.
- 갱신: 2026-07-16 / 브랜치: main / 커밋 상태: committed (워킹 트리 깨끗)
- 라이브: https://sandlab.piousangel.workers.dev · 레포: github.com/Piousangel/sandlab (private)

## 멈춘 지점

코드는 안 멈췄다. **사용자가 클립을 아직 아무 데도 안 올렸다** — 그게 유일한 미완료다.

`src/lib/sand/record.ts:70` — 3초 mp4 녹화는 구현·배포됐고 사용자가 육안 확인함("잘되긴하는데").
하지만 그 클립이 커뮤니티에 올라간 적이 없다. 이 프로젝트의 전체 가설이 거기 달려 있다.

## 다음 단계 (순서대로)

1. **사용자에게 물어라: "클립 올리셨습니까?"**
   안 올렸으면 새 기능을 만들지 마라. 이 프로젝트의 진단은 "만드는 능력 과잉, 내놓는 능력 0"이고,
   기능을 더 붙이는 건 그 병의 가장 세련된 형태다. (근거: 아래 "왜 이 순서인가")
   - 목표 채널: r/webgpu 또는 r/proceduralgeneration (소모용, 첫 반복이 목적)
   - **HN·r/Simulated는 쓰지 마라.** 총알 한 발씩. 갤러리에 씨앗이 차고 클립이 좋아진 뒤에 쓴다.

2. **갤러리 씨앗 30~50개** — 사용자가 직접 그려서 `Publish`.
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
- [x] **클립 녹화** — 3초 mp4/H.264. 사용자 확인: "잘되긴하는데"
- [x] **갤러리** — Worker+D1. `python3 scripts/verify-gallery.py` 17/17
- [x] **Cloudflare 배포** — 루트/갤러리/API 전부 200, 원격 D1 스키마 적용됨
- [x] 버셀 프로젝트 생성했다가 **삭제함** (404 확인). 이유는 README에 있음
- [ ] **클립을 커뮤니티에 올리기** ← 유일한 진짜 미완료
- [ ] 갤러리 씨앗 채우기 (현재 0건)
- [ ] 붓질 저장 (URL 한계 근본 해결)
- [ ] LLM 원소 생성 (검증 완료, 의도적 보류)

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

## 검증 상태

- typecheck: **통과** (`pnpm typecheck`)
- build: **통과** (`pnpm build` → static export)
- Margolus 불변식: **7/7 통과** — `node scripts/verify-margolus.mjs`
- 갤러리 API: **17/17 통과** — `python3 scripts/verify-gallery.py`
  (사전에 `npx wrangler dev --port 8799 --local` 필요)
- URL 예산 측정: `node scripts/verify-url.mjs` — **의도적으로 실패(exit 1)한다.**
  복잡한 장면이 URL 예산 초과라는 걸 기록하는 게 목적. 고쳐야 할 실패가 아니라 측정값이다.
- lint: **미실행** (eslint 설정 파일 자체가 없음 — `package.json`에 스크립트만 있다)
- test: **없음** (vitest 미설정. 위 3개 스크립트가 사실상의 테스트다)
- 프로덕션 헬스: `curl -s -o /dev/null -w '%{http_code}' https://sandlab.piousangel.workers.dev/` → 200

### 재현 명령

```bash
cd /Users/hyunseok/Desktop/Code/sandlab
npx wrangler dev --port 8799 --local   # 8799 — 앱 전체 + API. 3120 아님!
python3 scripts/verify-gallery.py      # 별도 셸에서
node scripts/verify-margolus.mjs
pnpm run deploy                        # 'run' 필수
```
