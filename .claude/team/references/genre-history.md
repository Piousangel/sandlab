# 레퍼런스: 장르 역사 (Historian) — 연구 사이클 2

낙사(falling-sand) 장르의 기원·생존·사멸. 출처 있는 1차 자료.

## 핵심 사실 (출처)
- **기원**: 'World of Sand'(すな) by DOFI, Java 애플릿, Dofi-Blog, 2005-11. 장르를 트렌드로 만들고 이름을 줌. 첫 스탠드얼론 포트는 wxSand(2006). → https://en.wikipedia.org/wiki/Falling-sand_game
- **Sandspiel**(Max Bittker, 2018): Powder Game(2007) 업로드 갤러리를 의도적으로 복제. **계정 없음**("유저에게 성가시고 구현이 지루하다"), 백엔드 API를 GET/INSERT/vote로만 잠금(타인 글 수정·삭제 불가). ~2,000 DAU, **7만+ 업로드**. 본인 자백: "앱은 페인트 프로그램으로 쓰이고 시뮬은 뒷전, 유저층은 어리게 치우침." → https://maxbittker.com/making-sandspiel/
- **상태 직렬화 = 무손실 PNG**(브라우저 내장 인코더/디코더). 공유/리믹스 인프라가 번들을 안 늘림. Firestore가 unpaginated 읽기로 ~$50/월 → Postgres 이전(1/10 비용, 저지연, 전문검색). → 위 동일
- **Powder Game**(dan-ball, ha55ii, 2006-07): UPLOAD + 작품별 vote-or-delete + 주간/월간/유저 랭킹. **자동 품질관리: 12시간 후 삭제요청 > 투표면 자동 삭제.** → https://danball.fandom.com/wiki/Powder_Game
- **The Powder Toy**(2008~, 20년): 프론트페이지 = **투표+시간만**(수동 큐레이션 아님), 작품은 FP에 **1주일만** 체류(강제 회전). 댓글은 크레딧 수단으로 부적합(FP에서 밀려남)이라 포럼/디스코드로 분리. → https://powdertoy.co.uk/Discussions/Thread/View.html?Thread=17449
- **바이럴 스파이크는 커뮤니티가 아니라 단일 훅에서**: Sandboxels(R74n, 2021, 500+ 원소, TikTok 수백만 뷰, Steam 94% 긍정), Sandtrix(mslivo, 2023, 테트리스+모래, TikTok 바이럴, Tetris Holding DMCA를 몇 시간 만에 Setris→Sandtrix 리브랜딩으로 회피). → https://sandboxels.r74n.com/presskit , https://automaton-media.com/en/news/20230704-19918/
- **Noita**(2020, Petri Purho GDC 2019): 큰 월드를 64×64 청크로 나눠 dirty-rect로 '깨어있는' 픽셀만 시뮬, 하단부터 갱신. 대규모 낙사 성능의 표준 패턴. → https://www.gdcvault.com/play/1025695/Exploring-the-Tech-and-Design

## 사멸 원인 (반복되는 3가지)
1. **DB 비용 폭발** (Bittker Firestore $50/월 → 이전 강제). → 첫날부터 페이지네이션.
2. **오픈 갤러리 모더레이션 붕괴** (스팸·저품질 FP). → vote-decay 자동삭제 + 포럼 규칙.
3. **플랫폼 부패** (Java 애플릿 사멸이 원조 장르를 죽임 → HTML5/WASM 재작성으로 부활).

## sandlab 통찰 (배급/재텐션, 대부분 agentSafe)
1. **[✅ 이미 있음] 계정 없는 원클릭 발행** — Bittker가 7만 업로드를 얻은 핵심. 창작을 로그인 뒤로 절대 안 가둠.
2. **[개발 대상] 리믹스/포크 = 리텐션 플라이휠 + 계보(lineage) 가시화** — 남의 PNG 상태를 편집 시작점으로. 계보("이 작품에서 파생 N개 / 원본으로")를 노출하면 댓글 없이 크리에이터 연결.
3. **[✅ 이미 있음] 무손실 PNG 직렬화** — 공짜 썸네일 + 재생 씨앗 + OG 프리뷰. 포맷이 마케팅 자산 겸용.
4. **[개발 후보, 스케일 전] vote-decay 자동큐레이션 + 신참 보호 레인, 댓글 거부** — dan-ball 12h 임계.
5. **[✅ 이미 있음] 페이지네이션**(PAGE_SIZE/offset) — Firestore 절벽 회피.

## 열린 질문
- Sandspiel 2026 현재 운영·모더레이션 상태(원본 vs Sandspiel Studio studio.sandspiel.club BETA) 미확인.
- Sandspiel 외 정량 DAU/업로드 수치는 공개가 드묾.
