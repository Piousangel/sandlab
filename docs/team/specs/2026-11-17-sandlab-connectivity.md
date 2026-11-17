> **상태: 진단·제안(독립 리뷰 전).** 오너 11-17 "연결고리·구성이 약하다". 오늘 할 3개(홈 카드 버그, 결과 카드·메뉴 다음 행동 링크+계측, 공략·learn 데일리 CTA)부터 한 번에 하나씩 출시.

# 샌드랩 연결고리 진단 (2026-11-17, main f47ca96 기준)

작성: 그로스·프로덕트 기획 관점. 저장소는 수정하지 않았다. 코드 근거는 `파일:줄` 또는 파일명으로 적었다. 숫자는 출처·날짜를 붙였고, 확인 못 한 것은 **[추정]**이다.

## 0. 한 장 요약

1. 콘텐츠(레벨 10 + 공략 10 + 데일리 + learn/materials)는 쌓이는데 **서로를 가리키는 링크가 한쪽 방향이다.** 검색 유입(공략·learn)은 "레벨 플레이"까지만 가고, 레벨·데일리 클리어 뒤에는 막다른 길이다. 갤러리는 퍼즐 쪽과 연결이 0이다.
2. **실제 버그 2건**: 홈 모바일 카드가 데일리 제목을 **옛 챌린지 풀**에서 가져온다(11-17에 /daily는 Spill로 교체됐는데 홈은 그대로). 같은 카드 옆 "All 20 challenges"는 하드코딩이고 실제 레벨은 10개다.
3. **재방문 장치가 없다**: 스트릭·카운트다운·아카이브·재방문 계측 모두 없고, 데일리 풀은 9개라 **10일째부터 반복**된다. 계측도 "클릭"이 없어 연결고리를 잴 수 없다.
4. 오늘 할 3개: (A) 홈 모바일 카드 버그 수정, (B) 클리어 뒤·내비의 "다음 행동" 링크 + `nav_click` 계측, (C) 공략·learn·materials에 "오늘의 데일리" CTA.

현재 숫자(출처: docs/daily/metrics/2026-11-18.md, 수집 11-17 11:27 KST, 7일): puzzle_land 12, landing 8(direct 7, google 1), challenge_start 7, challenge_clear 2, share_click 4, 갤러리 업로드 1·투표 1, Spill 첫 클리어 유저 2. 존 트래픽(봇 포함) 고유 방문자 79~195/일. Search Console Google 클릭 28일 30회(direction.md가 인용한 11-12 메일). 표본이 아주 작아 **어떤 비율도 결론용이 아니다.** 방향 판단용으로만 쓴다.

---

## 1. 연결고리 지도 (코드로 확인)

### 1-1. 여정별 연결 표

범례: O 있음 / △ 약함·일부 / X 없음(끊김)

| # | 연결 | 상태 | 근거(코드) | 문제 |
|---|---|---|---|---|
| 1 | 검색 → 공략 `/play/<id>/guide` | O | sitemap에 10편, Article JSON-LD | 공략·레벨 og:image 없음(backlog 11-16). OG 덮어쓰기로 사이트 기본 이미지도 빠졌을 가능성 [추정, 렌더 미확인] |
| 2 | 공략 → 레벨 플레이 | O | guide/page.tsx 상단 카드 "▶ Play" 버튼 | 좋음. 단 공략에서 **데일리·다른 레벨 추천 없음**(이전/다음 공략 텍스트 링크뿐) |
| 3 | learn·materials → 퍼즐 | **X** | `src/app/learn`, `materials`, `src/content/learn`에 `/play`·`/daily` 링크 0개(grep). ContentShell 헤더의 "Challenges"만 있음 | 광고 허용 페이지 31개 중 가장 긴 글(1,500~1,900단어)이 막다른 길 |
| 4 | 홈(샌드박스) → Spill | △ | 데스크톱: 좌상단 newest 카드(SandCanvas 951), 상단 바 Daily/Challenges. 모바일: 팔레트 아래 한 줄 카드(899) | 데스크톱은 가장자리 카드 1장, 클릭 계측 없음(실험 1 판정 불가, backlog에 이미 적힘). 모바일 카드는 **버그**(아래 1-2) |
| 5 | 홈 → 갤러리 | O | 도크 "Gallery" 링크, 게시 후 패널 | |
| 6 | 레벨 목록 `/play` → 레벨 | O | LevelList, 첫 방문 "Start with 1-1" CTA, 전체 목록·Guide 링크 | |
| 7 | `/play` → 데일리 | △ | 문단 맨 아래 한 줄 | 첫 화면 밖 |
| 8 | 레벨 → 다음 레벨 | O | ResultCard "Next ▶", 레벨 페이지 본문 링크 | 마지막(1-10)은 "All levels"로 끝 |
| 9 | 레벨 클리어 → 공략 | **X** | ResultCard에 링크 없음. 공략 링크는 본문(스크롤 아래) | 깬 직후가 공략/다른 공략으로 가는 가장 자연스러운 순간인데 비어 있음 |
| 10 | 레벨 클리어 → 데일리 | **X** | ResultCard 버튼은 Retry·Share·Next뿐 | 퍼즐 사용자 → 데일리 경로 없음(본문 아래 링크도 없음. /daily 링크는 /play 마지막 문단, 홈, 홈 내비뿐) |
| 11 | 퍼즐 화면 메뉴 → 데일리·갤러리 | **X** | Hud.tsx 21~23: All levels / Sandbox / Learn | Daily·Gallery 없음 |
| 12 | ContentShell 헤더 → 데일리 | **X** | Challenges/Learn/Materials/Gallery/About | Daily 없음. 푸터도 없음 |
| 13 | 데일리 → 다른 곳 | △ | DailySpill 하단 "Open 1-x in level list · All levels" | 클리어 후 nextId=null(ResultCard는 "All levels"), 카운트다운·스트릭·어제 결과·내일 예고 없음 |
| 14 | 데일리 공유 | O | share_click 'daily', 문구 `Sandlab Daily #N (id) ⭐⭐⭐ n moves + https://sandlab.app/daily` | 좋음(스포일러 없음, 링크 포함). 단 **공유 링크에 `?ref=` 없음** → 공유가 몇 명을 데려왔는지 landing으로 구분 불가 [코드: shareText] |
| 15 | 레벨 공유 | △ | ResultCard Share → `host/play/<id>` 문구 | 공유 지점이 SHARE_SURFACES 화이트리스트(sandbox-*, daily)에 **레벨 결과 공유가 없어** 레벨 쪽 share_click은 계측 안 됨 [추정: ResultCard에 trackEvent 호출 없음, 코드 확인] |
| 16 | 갤러리 → 퍼즐 | **X** | GalleryBrowser 링크: `/`, `/materials`, `/#s=`, 푸터 About/Learn/Privacy/Terms/Contact/Ko-fi | /play·/daily 링크 0개. 빈 상태도 "Make one → /" 뿐 |
| 17 | 퍼즐 → 갤러리 | **X** | 퍼즐 화면·결과 카드에 갤러리 링크 없음. ContentShell 헤더에는 있음(광고 페이지만) | 두 제품이 사실상 분리 운영(오너 11-16 결정)이지만, 사용자 동선까지 끊을 이유는 없다 |
| 18 | 갤러리 → 씬 공유 | O | `/s/<id>` OG 프리뷰 worker, 업로드 7일 1건 | 공급 자체가 거의 없음 |
| 19 | 재방문 장치 | **X** | 스트릭·카운트다운·아카이브 없음. `sandlab.spill-daily.v1`(localStorage) 기록만 | 데일리는 "오늘 한 번"이고 내일 이유가 없다 |
| 20 | 모바일 첫 화면(홈) | △ | above-the-fold.md(11-13): 캔버스 작고 팔레트가 화면 대부분, 데일리 카드는 맨 아래 | 모바일 재배치는 backlog 큰 기능 4번(미착수) |
| 21 | 사용자 레벨(에디터) | X | `/spill/editor`는 dev 전용 안내만 | 레벨 갤러리 v1 스펙은 11-16에 있으나 오너 결정으로 보류 [DECISIONS 11-16] |

### 1-2. 코드로 확인한 버그 (오늘 고칠 것)

- `SandCanvas.tsx` 6행·173~177행: 홈 모바일 데일리 카드는 `@/lib/challenge/daily`의 `dailyFor(n).title`(옛 풀 30개)로 제목을 만든다. 11-17에 `/daily`는 `@/lib/spill/client/daily`(`dailyIdFor`, 풀 9개)로 바뀌었다. 같은 `#N`인데 **카드 제목과 실제 퍼즐이 다르다.** 예: 오늘 #40은 Spill 풀에서 1-8(계산: (40-1)×2 mod 9 = 6번째 = '1-8')이지만 카드는 옛 풀 제목을 보여준다.
- `SandCanvas.tsx` 905행: "All 20 challenges" 하드코딩. 옛 챌린지 20개 시절 문구이고 지금은 `LEVELS.length`=10. 모바일 사용자에게 거짓말을 한다.
- 데일리 풀 `DAILY_POOL_IDS` 9개, 보폭 2 → **9일 주기로 반복**. 11-17(#40)부터 계산하면 11-26부터 같은 레벨이 다시 나온다. 레벨 공급(1개/일)이 풀에 자동 편입되지 않는다(코드상 풀은 수동 목록).

### 1-3. 계측 현황

있음: `landing`(채널), `puzzle_land`, `challenge_start/clear/reset`, `daily_start/daily_clear`, `share_click`(sandbox-*·daily), `gpu_unsupported`, `kofi_click`, 갤러리 upload/vote.
없음(= 연결고리가 작동하는지 모른다):
- 모든 **내부 링크 클릭**(홈 newest 카드, 모바일 daily 카드, 공략의 Play 버튼, 결과 카드 Next).
- 레벨 결과 공유(share_click 화이트리스트에 없음).
- **재방문**: `landing`은 세션당 1회 채널만 본다. "처음/재방문"을 구분하지 않는다. direct 7건 중 몇이 재방문인지 알 수 없다.
- 공유 링크 유입(공유 URL에 ref 없음).
- D1 지표(클리어 유저 수)는 있으나 IP 기준이라 일일 재방문 코호트는 못 만든다.

---

## 2. 레퍼런스 조사 (조사일 2026-11-17)

접근 가능했던 곳은 근거를 적고, **접근 불가·검증 못 한 것은 그렇게 표기**했다. 검색엔진 요약은 2차 자료라 신뢰도를 표시한다.

| # | 사례(종류) | 발견 → 플레이 → 재방문 설계 | 창작물 공유 | 사용자 반응·근거 | 가져올 원리 | 베끼지 않을 것 |
|---|---|---|---|---|---|---|
| 1 | **Wordle**(일일 퍼즐) | 하루 1개, 전 세계 동일. 계정·앱·광고 없이 브라우저 | 스포일러 없는 이모지 격자를 복사해 붙임. 격자는 초기 제품에 없었고 플레이어가 시도 횟수를 올리다 개발자가 추가했다는 서술이 있음 | 성장 원인으로 가장 많이 인용(2차 자료, 1차 수치 없음: [dinogame.gg](https://dinogame.gg/blog/why-wordle-blew-up/), [buildd](https://buildd.co/product/wordle-the-viral-sensation), [Desmos 분석](https://danmeyer.substack.com/p/why-wordle-works-according-to-desmos)) | **결과 한 줄이 곧 광고.** 공유 문구가 이미 있으니 이모지 "한 줄 결과 그림"(별·수·시간)으로 한 단계 올린다 | 하루 1판 제한 그대로(샌드랩은 샌드박스·레벨이 있어 데일리는 "입구"로만) |
| 2 | **NYT Games(Connections·Strands)** | 서구 일일 퍼즐을 구독 번들의 리텐션 도구로 사용, 스트릭·결과 비교 | 결과 공유 | **1차 자료 못 구함**: 검색 결과는 미러 사이트 요약뿐(신뢰 낮음). 구독 전환 수치는 NYT 실적 발표 확인 필요 [추정] | 일일 퍼즐을 "다른 콘텐츠로 가는 문"으로 쓰는 구조(샌드랩: 데일리 → 공략·learn·레벨) | 번들·구독 모델 |
| 3 | **Duolingo 스트릭** | 첫 7일이 가장 취약, 스트릭이 가장 영향 큰 기능(리텐션팀 PM 인터뷰 요약: [Lenny's](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)). Streak Freeze로 끊김 부담 완화(감소율 21%는 블로그 인용, **미검증**) | - | 7일+ 스트릭 DAU 비중 약 3배(Medium 요약, 2차) | 스트릭은 **가벼운 의식**: 안 해도 손해 없고, 하는 사람은 보상. 첫 7일 설계 | 푸시 알림 압박, 결제형 Freeze. 샌드랩은 계정이 없으니 기기 저장(localStorage) 스트릭만 |
| 4 | **Noita Daily Run**(커뮤니티 있는 샌드 물리 게임) | 매일 UTC 자정 전 세계 같은 시드, 연습 모드로 반복 가능 | 시드 공유, 모드, 속도 달리기 커뮤니티([Noita wiki](https://noita.wiki.gg/wiki/Daily_Run)) | 재플레이 가치의 핵심으로 서술(리뷰 요약, 2차) | **같은 시드 = 대화 소재.** 데일리 번호(#N)를 문구 첫머리에 이미 쓰고 있어 유지 | 시드 스포일러 도구가 놀이를 해친다는 경고(wiki) → 해법은 공략을 "다음 날" 공개(오너 11-16 방침과 일치) |
| 5 | **The Powder Toy**(falling sand 대표) | 커뮤니티 세이브 라이브러리를 앱 안에서 탐색·플레이·업로드 | 세이브 업로드, 투표 | 투표 부정(다중 계정) 금지·훔친 세이브 비공개 규칙(2차: [Wikipedia](https://en.wikipedia.org/wiki/The_Powder_Toy)와 GitHub 포크 문서). 인기 정렬 방식은 **확인 못 함** | 갤러리는 "구경만"이 아니라 **열어서 만져 보는** 것(샌드랩 `/#s=` 리믹스와 일치). 어뷰즈 규칙은 일찍 | 계정·포럼 기반 대규모 UGC(샌드랩 규모와 맞지 않음) |
| 6 | **Sandboxels**(falling sand, 웹) | 원소 500+ 탐색, 모드 목록, 학습 활용 페이지 | 공유는 **Discord**에 위임([사이트 직접 확인](https://sandboxels.r74n.com/)) | 갤러리·세이브 공유 기능은 홈에서 언급 없음 | 공유 인프라를 자체 구축하지 않고 커뮤니티에 위임한 경제성. 샌드랩은 이미 `/s/` 링크가 있음 → **외부(스레드·블스)로 나가는 공유 문구**를 키울 것 | 500개 원소 같은 폭 경쟁(시뮬 품질·폭 투자 금지 규칙) |
| 7 | **Sandspiel**(falling sand, 웹) | 직접 확인 **실패**(sandspiel.club은 JS 렌더라 본문을 못 읽음). 제작자 인터뷰·블로그는 못 읽음 | 갤러리·좋아요가 있었다는 기억은 있으나 **검증 못 함** | 검색에서 갤러리 근거 못 찾음 | (보류) 오너가 직접 한 번 열어 갤러리 정렬·썸네일 크기를 캡처해 주면 반영 | - |
| 8 | **Where's My Water? / Happy Glass**(물리 퍼즐 앱) | 별 3개(시간·수집·잔량)와 숨은 오리로 반복 동기. Happy Glass는 500 수작업 레벨, **레벨 전환 약 5초**, 시작 버튼이 선택 화면을 건너뜀([Game Developer 분석](https://www.gamedeveloper.com/design/happy-glass-design-analysis)). 숨은 수집품으로 보너스 레벨(위키 요약) | - | 수집품·레거시 레벨 삭제에 완주파 불만(마켓 요약, 2차). 광고·코인 불균형은 분석가 비판 | **다음 판까지 시간을 줄이고 3별로 두 번째 도전 이유를 준다**(샌드랩 별 3종 이미 있음). 클리어 직후 "다음"이 가장 가까워야 함 | 광고 삽입 보상 구조(게임 화면 광고 금지, 별 보상 광고 금지) |
| 9 | **Poki**(포털, 물리 카테고리) | 장르 메뉴, "이번 주 인기". 페이지에서 신규·추천·관련게임·일일 영역은 확인되지 않음(직접 fetch) | - | - | 포털식 "관련 게임 가로 띠"를 **샌드랩 내부에** 만든다: 같은 고리의 다음 항목(공략·다음 레벨·데일리) | 포털에 입점해 포털 트래픽에 의존(portal 폴더는 별 트랙) |
| 10 | **itch.io**(제작자 중심 마켓) | `falling-sand` 태그 81건, 정렬(인기·신규·평점·최신), 태그 조합, 컬렉션, 데브로그·잼 링크([직접 확인](https://itch.io/tags)) | 데브로그·잼 | 평점·댓글은 해당 페이지에서 확인 못 함 | **데브로그가 SEO·재방문 둘 다 만든다**: "레벨 N 만든 이야기"는 공략과 별개의 재방문 사유. 외부 노출 채널로 itch.io 게시 고려 [추정, 미검증] | 댓글 기능(절대 규칙으로 금지) |

**결론 4가지**
1. 일일 퍼즐의 성장은 "퍼즐"이 아니라 **결과 공유 한 줄**에서 나온다(Wordle). 샌드랩 공유 문구는 이미 같은 구조다. 지금 부족한 것은 공유가 *돌아오는 길*(링크 ref, 카운트다운)이다.
2. 재방문은 **끊기 쉬운 스트릭을 가볍게**(Duolingo) + **내일의 예고**(공략 다음 날 공개)로 만든다.
3. 샌드 시뮬 계열은 공유·갤러리·모드가 경쟁력인데, 우리는 시뮬 품질에 더 투자하지 않으므로 **갤러리는 큐레이션·썸네일·링크 품질로** 싸운다(오너 11-16: 도구를 쉽게).
4. 어떤 사례도 "게임 안에서 사이트 구조 링크"를 포기하지 않았다(Powder Toy 세이브 라이브러리 앱 내장, Happy Glass 전환 5초). 우리의 문제는 콘텐츠가 아니라 **링크 부재**다.

---

## 3. 사용자 질문 7가지

1. **처음 온 사람(홈)** — 데스크톱: 상단 바 작은 링크 + 빈 캔버스 + 좌상단 카드 1장. "여기서 뭘 하는 곳인가"는 "Pour sand, water, lava"로 알지만 "퍼즐도 있다"는 카드에서 약하게. 모바일: 캔버스 작고 팔레트가 화면 대부분, 데일리 카드는 맨 아래 한 줄이며 **제목이 틀리다**(1-2). → 첫 10초 안에 한 번 만져 보게 하고, **30초에 "오늘의 퍼즐 → 3별 1수" 한 장**을 보여준다.
2. **왜 계속 하나** — 현재는 별 3개(클리어·젬·par) + 다음 월드 해금(W2 없음, 2-1은 404). 10레벨을 다 깨면 끝, 데일리는 9일 뒤 반복. 계속할 이유가 **레벨 공급 속도(1/일)에 전부 달려 있다.** 스트릭·아카이브·주간 도전이 필요.
3. **왜 졌나** — 실패 문구가 있고(failure.ts, "1.5초 안에 정체 판정") Retry가 배치를 유지한다. 부족한 곳: "왜"의 학습 링크. 실패 화면에서 **해당 레벨 공략 힌트 1단계 링크**(스포일러 최소)와 관련 materials 링크가 없다.
4. **어떻게 쓰나** — 1-1 온보딩이 있다(Onboarding). 레벨 페이지 하단에 How to play. 도구는 괜찮고 갤러리 쪽 도구가 어렵다(오너 진단 11-16).
5. **왜 공유하나** — 데일리·레벨 결과 문구는 있다. **공유 동기(자랑·비교)는 약하다**: 순위표·스트릭·내 친구 비교 없음(순위표는 의도적 결정). 대안은 "오늘 N명 클리어, 나는 상위 X%" 같은 **분포 위치**(이미 hist API가 있어 결과 카드에 막대가 있음 → 문구로 공유에 포함).
6. **왜 샌드랩인가** — 차별점: 가입 없음·링크 공유·폰에서 CPU 엔진으로 돌아감·모든 레벨이 솔버로 검증됨. 이 문장이 홈 첫 화면과 /daily에 **거의 안 보인다**(about에만). "검증된 퍼즐"은 Wordle의 "하루 1개"에 해당하는 한 줄 약속이 될 수 있다.
7. **오너가 지적할 것** — (a) "홈 모바일에 데일리 카드가 틀렸다/20은 거짓", (b) "클리어하고 나면 갈 곳이 없다", (c) "learn 글은 많은데 게임으로 안 이어진다", (d) "데일리가 9일 반복이다", (e) "갤러리는 거의 비었고 퍼즐과 이어지지 않는다", (f) "숫자로 못 재는 실험(카드 클릭 계측)". 우리 팀이 먼저 말해 둔다.

---

## 4. 개선안 로드맵

### 4-1. 약한 연결 상위 10 (영향×비용)

영향: 5단계(재방문·전환에 직접). 비용: 팀 세션 시간 [추정](S≈0.5일 이하, M≈1일, L≈2일). 1~2일 사이클 단위.

| 순위 | 연결 | 영향/비용 | 변경 파일 | 측정 이벤트 | 일정 [추정] | 위험 |
|---|---|---|---|---|---|---|
| 1 | 홈 모바일 데일리 카드 버그 + 문구 | 영향 3 / 비용 S | `SandCanvas.tsx`(import 교체, `LEVELS.length`) | 기존 daily_start가 홈 유입 후 증가하는지(`nav_click` 도입 후 `home-daily`) | 사이클 1, 0.3일 | SandCanvas 대형 파일 — 해당 3줄만. 홈 라우트 시각 회귀 확인 |
| 2 | 클리어 결과 카드 → 다음 행동 3종(다음 레벨/오늘의 데일리/이 레벨 공략) | 5 / M | `ResultCard.tsx`, `SpillPlayer.tsx`, `worker/track.ts`, `ua.ts` | `nav_click`(ref=`result-daily`, `result-guide`, `result-next`) | 사이클 1, 0.7일 | 결과 카드 높이가 폰에서 커짐(480px 카드, 바닥 고정). 버튼 3개→1주 2보조(텍스트 링크)로 |
| 3 | 퍼즐 화면 메뉴·ContentShell 헤더에 Daily 추가(+퍼즐 메뉴에 Gallery) | 4 / S | `Hud.tsx`, `ContentShell.tsx` | `nav_click` | 사이클 1, 0.3일 | 광고 로더 규칙: 캔버스로 가는 링크는 일반 `<a>`(ContentShell 주석) |
| 4 | learn·materials·공략 → 데일리/레벨 CTA(본문 말미 카드) | 5 / M | `ContentShell`(옵션 children 영역) 또는 각 페이지, learn/materials 템플릿 | `nav_click` ref=`learn-cta`, `guide-daily` | 사이클 2, 0.7일 | verify-ads: CTA 때문에 본문 단어 수·로더 위치가 달라지면 안 됨. CTA는 광고 아님을 명확히 |
| 5 | 데일리 재방문 세트: 스트릭, 다음 퍼즐까지 카운트다운, 어제 결과, 최근 7일 점 | 5 / M | `daily.ts`(기록 확장, 순수함수+테스트), `DailySpill.tsx` | `daily_return`(재방문 날 첫 시작, value=연속일수), 스트릭 도달 | 사이클 3, 1일 | localStorage 삭제 시 소실(계정 없음 결정). 문구로 "이 기기에 저장" 명시 |
| 6 | 데일리 풀 확장·편입 규칙(신규 레벨 → 풀 자동 후보) + 아카이브 `/daily/archive` | 5 / M | `daily.ts`, 새 정적 페이지, sitemap | `archive_play`(고정 ref), 7일 daily_start | 사이클 3~4, 1일 | 풀 목록 변경은 "추가만 허용"(주석 규칙). 길이가 변하면 날짜별 퍼즐이 바뀜 → **풀 길이 변경 시 과거 번호 고정표**를 같이 저장하거나 확장 시점 이후 번호부터 새 풀(`dailyPoolAt(n)`) |
| 7 | 공유 링크 ref + 레벨 결과 공유 계측 + 공유 URL이 레벨/데일리 OG로 | 4 / M | `daily.ts`·`hist.ts` shareText(`?ref=daily-share`), `landing.ts`·LANDING_REFS, SHARE_SURFACES에 `level` 추가, OG 이미지 정적 생성 | landing ref별 유입, share_click `level` | 사이클 2, 1일(OG 이미지는 backlog 소형 항목과 합침) | landing 화이트리스트 변경 시 worker 테스트. OG 정적 생성 시 빌드 시간 증가 [추정] |
| 8 | 홈 첫 화면: 데스크톱 카드 승격·모바일 팔레트 접기(실험 1 판정 11-21 뒤) | 5 / L | `SandCanvas.tsx`(대형) | `nav_click` home-card·home-daily, 홈 → 퍼즐 전환율 | 사이클 4~5, 2일 | 실험 1이 진행 중: 한 번에 실험 1개(OPERATING 3장). 판정 전 착수 금지 |
| 9 | 갤러리 ↔ 퍼즐 연결(갤러리 하단·게시 후 패널에 "오늘의 퍼즐", 퍼즐 메뉴에 갤러리) + 갤러리 시드/큐레이션(Staff picks) | 3 / M | `GalleryBrowser.tsx`, `SandCanvas.tsx` 공유 패널 | `nav_click` gallery-daily, 업로드 수 | 사이클 5, 1일 | "갤러리와 챌린지는 별개 운영"(오너 11-16) — 동선 연결은 허용, 제품 통합은 금지. 큐레이션은 신고·삭제 정책(Terms) 준수 |
| 10 | 실패 화면 → 공략 힌트 1단계 + 관련 materials 링크, 클리어율 낮은 레벨 난이도 곡선 수정 | 3 / M | `failure.ts`, `SpillPlayer.tsx`, 레벨 데이터 | `nav_click` fail-hint, 레벨별 clear/start 비율 | 사이클 6, 1일 | 스포일러. 힌트 1단계만 링크, 정답 설명은 공략에 |

### 4-2. 사이클 배치 제안 (2주)
- 사이클 1(11-18~19): 1·3(+2의 링크 부분) → 작은 PR 묶음. `nav_click` 화이트리스트를 여기서 한 번에 만든다.
- 사이클 2(11-20~21): 4·7. 11-21에 실험 1 판정.
- 사이클 3~4(11-24~27, 화·목 큰 기능): 5·6. 오너가 말한 "깨러 오고 싶은 데일리"의 핵심.
- 사이클 5(11-28~12-01): 8(실험 1 결과에 따라)·9.
- 사이클 6: 10 + 레벨 곡선 수정.
- 매일 평일 슬롯: 레벨 1 + 공략 1은 유지하되 **8절 규칙**에 따라 풀·링크를 같이 갱신.

### 4-3. 출시한 레벨·챌린지의 성장 체계 (출시 후 7/14/30일)

원칙: "레벨은 출시한 날 끝나지 않는다." 모든 레벨이 같은 체크리스트로 자란다. 담당은 6장.

| 시점 | 질문 | 하는 일 | 데이터 |
|---|---|---|---|
| D+1 | 열리긴 했나 | 레벨 페이지·공략 렌더, 홈 newest 카드, 사이트맵·내부 링크(이전/다음 공략, 허브, 데일리 풀 후보) 확인 | `challenge_start` 레벨별 |
| **D+7** | 난이도·공략이 맞나 | 시작 대비 클리어율, 평균 시도(reset 횟수), **난이도 곡선 수정**(설계 의도 ±: 클리어율 4~48%가 정상 범위, 1-6은 92%라 변주 필요 — backlog 11-11). 공략 보강: 사용자가 실제로 막힌 지점(reset 많은 구간)을 공략에 추가, 힌트 단계 조정. 데일리 풀 후보로 편입 판단 | `challenge_start/clear/reset` 레벨별(7일) |
| **D+14** | 연결이 작동하나 | 레벨 페이지·공략의 유입 → 플레이 전환(`nav_click` guide→play). **데일리 연결**: 풀에 편입해 데일리로 한 번 출시(공략은 데일리 다음 날 갱신). 홍보 앵글 교체: 출시 때 "신작"이었다면 이제 "함정 있는 레벨"/"3별 어려움" 같은 **난이도·함정 앵글** | landing 채널별, share_click |
| **D+30** | 재활용·정리 | 변주 레벨(W2의 같은 원리 어려운 버전) 제작 여부 판단, 공략에 "다음에 풀어볼 레벨" 링크, 잘 되면 learn 글과 교차 링크(원리 글), 안 되면 요약·통합. 데일리 아카이브에 영구 배치, 공략 `updated` 날짜 갱신(검색 신선도) | 30일 누적, Search Console 해당 URL(오너 확인 필요) |

홍보 앵글(레벨당 4번, 같은 문구 반복 금지): 출시(D0: 무엇이 새로운가) → D+3(풀이 영상 10초: Record clip 기능 활용) → D+14(난이도·함정, 클리어율 숫자) → D+30(커뮤니티 퍼즐/변주 예고). 숫자는 실측만 쓴다.

---

## 5. 오늘 당장 할 수 있는 작은 연결 개선 3개

### A. 홈 모바일 데일리 카드 버그 수정 (S, 약 20분)
- 파일: `src/components/SandCanvas.tsx`
  - 6행 `import { dayNumber, dailyFor } from '@/lib/challenge/daily'` → `import { dayNumber, dailyIdFor } from '@/lib/spill/client/daily'`와 `levelById` (`@/lib/spill/client/catalog`) 사용.
  - 173~177행: `setDaily({ n, title: levelById(LEVELS, dailyIdFor(n))?.name ?? 'Today’s challenge' })`.
  - 905행 근처: `All 20<br/>challenges` → `All {LEVELS.length}<br/>levels`.
- 테스트: 순수 로직은 이미 `daily.test.ts`. 컴포넌트는 `typecheck`와 로컬 `wrangler dev` 모바일 폭(390)에서 카드 제목이 `/daily` 화면의 `Daily #N: <레벨명>`과 같은지 눈으로 비교.
- 완료 조건: 같은 날 카드 제목 = /daily 제목, "All 10 levels". 옛 `challenge/daily` import가 홈에서 사라짐(옛 코드 정리 후속에 도움).
- 위험: 홈은 WebGPU 번들이라 번들 크기 영향 없음(import 교체). 계측 영향 없음.

### B. "다음 행동" 링크 + nav_click 계측 (S~M, 약 2시간)
1. 계측: `src/lib/sand/ua.ts`에 `NAV_REFS = ['home-newest','home-daily','result-daily','result-guide','guide-daily','learn-cta','menu-daily']` (고정 문자열) 추가, `worker/track.ts`에 `nav_click` 이벤트(ref 화이트리스트 검증) 추가, `worker/track.test.ts`에 케이스. AE 카디널리티는 7개로 안전.
2. 링크:
   - `ResultCard.tsx`(레벨 모드, 데일리 아님): 버튼 줄 아래 작은 텍스트 줄 `Today's daily →`(`/daily`) · `Guide`(공략이 있는 레벨만; `guideFor(def.id)`) — `onClick`에서 `trackEvent('nav_click','result-daily')` 호출 후 기본 이동.
   - `Hud.tsx` 21~23행 메뉴 배열에 `{ href: '/daily', label: 'Daily' }`, `{ href: '/gallery', label: 'Gallery' }` 추가. `ContentShell.tsx` 헤더에 `<a href="/daily">Daily</a>`.
   - `SandCanvas.tsx` newest 카드·daily 카드 `onClick`에서 `home-newest`/`home-daily` 계측 → **실험 1의 가장 약한 고리(클릭 계측 없음)가 메워진다.** 실험 변수가 아니라 측정 추가라 실험 1 판정을 해치지 않는다(OPERATING 3장 "계측 먼저").
3. 테스트: `parseTrack` 단위 테스트(허용/거부 ref), ResultCard 렌더 테스트(`render.test.tsx` 패턴)에서 링크 존재.
4. 완료 조건: 결과 카드에서 공략·데일리로 갈 수 있고, 7일 뒤 `nav_click` ref별 합계가 지표 파일에 나온다(daily-metrics 스크립트에 AE 쿼리 항목 추가 필요: scripts/daily-metrics.mjs).
5. 위험: 결과 카드 높이(모바일). 텍스트 링크 한 줄만 추가. 광고 로더는 캔버스 화면에 없고 링크는 일반 `<a>`라 verify-ads 영향 없음.

### C. 공략·learn·materials 말미 "오늘의 데일리" 카드 (M, 약 2시간)
- 새 컴포넌트 `src/components/PlayCta.tsx`(`'use client'`, 날짜는 클라이언트에서 계산해 "Daily #N · <레벨명>" 표시; 정적 HTML에는 "Play today's Sandlab daily puzzle →"만 구워 둔다). `href="/daily"`는 일반 `<a>`, 클릭 시 `nav_click` ref=`guide-daily`/`learn-cta`.
- 삽입: `src/app/play/[id]/guide/page.tsx`의 `<nav>` 위, `src/app/learn/[slug]/page.tsx`·`src/app/materials/[slug]/page.tsx` 본문 끝(파일 위치는 해당 page.tsx; 문서 편집 시 광고 허용 목록 유지, 본문 단어 수는 늘면 늘었지 줄지 않음).
- 테스트: `verify-ads.mjs`(광고 허용 페이지 목록·로더 위치 변동 없음), `pnpm build` 후 learn 페이지에 `/daily` 링크 존재 확인.
- 완료 조건: learn/materials/공략 31개 페이지에서 `/daily` 또는 `/play`로 가는 링크가 본문 안에 1개 이상. (현재 learn/materials 내 `/play`·`/daily` 링크 0개)
- 위험: AdSense 재검토 중(11-16 제출). **광고 정책상 CTA는 일반 내부 링크이며 광고처럼 보이는 박스·"Download/Play now" 오인 문구는 쓰지 않는다**(오해 소지 시 평범한 텍스트 링크로).

---

## 6. 팀 운영 제안

### 6-1. 샌드랩 세션(06·13·20시) 역할

현재 SESSION-GUIDE.md의 3세션 구조를 유지하고 **"연결고리 담당"을 한 줄씩 추가**한다.

| 세션 | 연결고리 책임 |
|---|---|
| 06시 회의(그로스) | 지표 파일에서 `nav_click`·`daily_*`·`landing` 7일 합을 보고. **주간 목표 숫자 1개 제안: "클리어 후 다음 행동 클릭 수"(`nav_click` result-*) 또는 "데일리 재방문(daily_return)"**. 연결 점검표(아래 표)를 회의록 맨 위에서 5분 점검. 홈·/play·/daily 모바일/데스크톱 첫 화면 확인(상시 안건) |
| 13시(구현) | 큰 기능이 아니면 4-1의 연결 항목을 1개씩 처리(체크리스트 순서). 레벨 출시일에는 **연결 체크 5개**를 PR 본문에 쓰고 확인한다(아래) |
| 20시(리뷰·홍보·회고) | 오늘 출시물을 D+1/D+7/D+14/D+30 표에 등록(`docs/team/growth-ledger.md` 사용 가능 [파일 존재 확인, 내용은 미확인]). 홍보 큐는 "앵글"을 바꿔 작성 |

**레벨 출시 연결 체크 5개**(PR 템플릿): ① 이전/다음 공략 링크 ② 홈 newest 카드 갱신 ③ 데일리 풀 후보 등록 여부 ④ 해당 공략에 learn/materials 교차 링크 ⑤ `/play`·sitemap·og 이미지 확인.

**주간 연결 점검표**(월요일 회고에 포함): 위 1-1 표의 X/△ 항목이 몇 개 줄었는가, nav_click 합계, daily 풀 길이 vs 남은 일수.

### 6-2. 미니게임 허브 팀 협업 포인트

(허브는 minigames-hub 저장소. 이 문서에서는 구조만 제안, 허브 코드는 읽지 않았다.)
1. **교차 링크**: 허브 → 샌드랩 "오늘의 퍼즐", 샌드랩 푸터/데일리 클리어 후 → 허브 "다른 오늘의 게임". 링크에는 `?ref=hub`/`?ref=sandlab`(LANDING_REFS에 이미 ref-* 체계가 있는지 확인 필요: 코드 `lib/sand/landing.ts`). 단, AdSense 심사 중인 두 사이트가 **같은 사업자의 상호 링크 농장처럼 보이지 않게** 콘텐츠 가치가 있는 위치(클리어 직후 "비슷한 일일 퍼즐")에만 1개씩.
2. **공유 기술 공통화**: 결과 문구 + `navigator.share`/clipboard 폴백 + manual textarea(DailySpill 패턴)를 허브 쪽 일일 모드와 같은 유틸로. 계측 이벤트 이름·화이트리스트 방식(`nav_click`, `share_click`, `daily_return`) 맞춤.
3. **홍보 일정 조율**: 두 팀 모두 06시 루틴이 같은 계정(Threads·Bluesky)에 게시. 같은 날 겹치지 않게 **요일 분담**(예: 샌드랩 월·수·금 데일리 앵글, 허브 화·목)과 주 1회 합동 주제. Threads 말투는 일상 반말체(별도 합의, 광고체 금지).
4. **회고 지표 정렬**: ROADMAP.md의 지표 기준(완주·D1/D7·공유 링크 전환)을 두 사이트가 같은 정의로 적는다(샌드랩 D1/D7 정의 없음 → `daily_return` 도입 뒤 정의).

---

## 7. 한계·확인 필요 목록
- 실사이트 렌더는 이번에 직접 확인하지 못했다(코드만 확인). 홈 모바일 카드 불일치는 **코드상** 확정, 실화면은 [추정]. OG 덮어쓰기(Next 메타 병합)도 코드 상 추정.
- Sandspiel 갤러리, NYT 수치, Poki 신규·추천 영역은 확인 못 함.
- Search Console의 공략 URL별 노출·클릭은 토큰 권한 없음(direction.md의 측정 공백과 동일).
- D1 지표는 IP 기준이라 재방문 코호트 아님. 숫자 표본(7일 클리어 2)은 의사결정에 쓰지 말고 방향 확인에만.
- 일정·비용은 모두 [추정].
