# 레퍼런스: 계측 (Analytics) — 연구 사이클 1

무계정·프라이버시 우선 웹 토이의 배급/재방문 측정. 출처 있는 1차 자료.

## 핵심 사실 (출처)
- **Cloudflare Analytics Engine `writeDataPoint`는 비차단**(await 불필요, 워커 지연 0). 데이터포인트당 blob 최대 20개(합 ≤16KB)·double 20개·index 1개(96B, 샘플링 키)·워커 호출당 ≤250 포인트, 보존 3개월. 집계 중심(개별 요청 로깅 아님), SQL API(HTTP)로 조회. → https://developers.cloudflare.com/analytics/analytics-engine/limits/ , https://developers.cloudflare.com/analytics/analytics-engine/get-started/
- **GoatCounter**: site+IP+UA를 8시간 회전 솔트로 해시(메모리 ≤8h 후 랜덤 문자열로 대체), 원본 IP·전체 UA·트래커ID 미저장 → 쿠키·localStorage·핑거프린트 없이 유니크 카운트, GDPR 동의배너 사실상 불필요. 8h 회전은 Plausible/Fathom(일)·Umami(월)보다 링크가능 창이 가장 좁음. → https://www.goatcounter.com/help/privacy
- **Plausible**: 쿠키리스·개인데이터 미수집 기본(동의배너 제거 가능)이나 funnels는 유료(CE에서 빠짐). 많은 팀이 Plausible(마케팅)+PostHog(프로덕트) 병행. → https://posthog.com/blog/posthog-vs-plausible
- **획득 경로 > 총 트래픽**(브라우저게임 self-hosted Plausible 사례): 값싼 클릭 유저는 리텐션 나쁨, 특정 지역/언어/플랫폼 코호트는 주간 리텐션 60%. **클릭이 아니라 코호트별 재방문을 재라.** → https://dev.to/sebhoek/retention-over-clicks-a-surprising-lesson-from-browser-game-analytics-3o86
- **무계정 리텐션 D1/D7/D30은 하한선**: Safari 7일 데이터 제한, Chrome 저장압박 시 축출, 시크릿창 미집계. localStorage 재방문 카운트는 하한. → https://inmargin.io/blog/tracking-unique-visitors-without-cookies
- **K-factor** = 유저당 공유 수 × 공유당 전환율. K>1이면 자기증식. 웹 툴은 공유링크·임베드·리믹스가 확산 자산, 쿠키 소멸 환경에선 1차 데이터+확률적 귀속으로 근사. → https://en.wikipedia.org/wiki/K-factor_(marketing)
- **sandlab 현 계측 = 0.** wrangler.jsonc 바인딩은 ASSETS·DB(D1)뿐. 단 Worker가 이미 배급 퍼널 핵심 지점(/s/:id 공유링크 인바운드, 업로드 POST, 투표 POST, 목록 GET)을 서버 처리하고 IP는 SHA-256 앞 12바이트 해시만 저장(원본 미저장) → 프라이버시 자세 이미 서 있음.

## sandlab 실행 통찰 (전부 agentSafe·low creep)
1. **Analytics Engine 바인딩 추가 + 기존 Worker 4개 지점에서만 비차단 writeDataPoint** — 공유링크열림(/s/:id)·업로드성공·투표·목록조회. blob=event_type·referrer host·cf country, double=count 1, index=저카디널리티 키(event_type/scene_id, 유저ID 아님). 클라 SDK·쿠키·동의배너 0. **아래가 전부 이 위에 섬 → 최우선 전제.**
2. **/s/:id 인바운드 referrer host 기록** — 공유가 어디(Reddit/Discord/X)에 착지하는지 per-user 추적 없이. 배급 투자처를 정하는 유일한 직접 데이터. 유입→후속 업로드로 K-factor 근사(SQL).
3. **활성화 이벤트 = 페이지뷰 아니라 '씬 공유/업로드'** — 페이지뷰·클릭은 허영지표로 격하. 스키마 주석/대시보드 상단에 못박아 이후 계측이 '배급 바꾸는 결정'에만 붙게.
4. **Cloudflare Web Analytics(무료·쿠키리스 비컨)** 한 줄로 top-of-funnel 방문 추세 — 서버가 못 보는 홈 진입 후 이탈 보완. 상보적.
5. **프라이버시 자세를 배급 자산으로 표방** — 'no tracking, no login'을 공개(로그인 없음 정체성과 일치). GoatCounter·CF·Plausible 선례.
6. **[비자동] 무계정 리텐션은 '측정 하한선'으로만** — 영속 식별자 절대 도입 금지. Yours 탭 localStorage를 익명 재방문 프록시로, 8h 회전솔트 코호트를 하한으로.

## 열린 질문 → 다음 사이클
- D1에 이미 있는 votes/uploads timestamp·해시로 **추가 계측 없이 백필**로 뽑을 지표: 주간 신규 씬, 씬당 평균 표, **업로드→최소1표 도달률(=관객 존재 증명)**. 계산 가능한가.
- /s/:id에 봇 히트+사람 클릭 혼재 → cf.botManagement/UA로 봇을 blob 분리 태깅해 K-factor 오염 방지.
- 첫 페인트/첫 도구 사용(진짜 활성화)을 프라이버시 지키며 잴 법: 세션당 1회 익명 sendBeacon vs 서버측 업로드율 프록시.
