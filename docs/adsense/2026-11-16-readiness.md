> **2026-11-16 오너가 AdSense 검토 요청을 제출했다.** 결과(승인/반려 사유)가 오면 아래에 추가한다. 보통 며칠에서 2~4주가 걸린다.

# AdSense 재검토 준비 점검 — sandlab.app (2026-11-16)

## 지난 반려 사유 (2026-09-21, '주의 필요', 오너 AdSense 화면 캡처)
1. **게시자 콘텐츠가 없는 화면에 Google 게재 광고**
2. **가치가 별로 없는 콘텐츠**

## 최종 판정: **지금 신청 가능** (이 PR 배포 확인 후, 오너 확인 3건 끝나면)
- 이유: 광고 스크립트는 본문 300단어 이상인 글 페이지 30곳에만 실리고(빌드 산출물 기준 `verify-ads` 통과), 캔버스·퍼즐·갤러리·404·정책 페이지에는 없다. 반려 1번의 원인(루트 레이아웃 로더)은 10월에 이미 제거됐고, 남아 있던 얇은 광고 페이지(/learn 목록, 216단어)는 이번에 광고를 껐다.
- 반려 2번 대응: 300단어 이상 고유 페이지 31개(공략 10편, 재료 해설 14편, 장문 learn 3편 1,561~1,914단어 등). 필수 페이지 4종(About·Privacy·Terms·Contact)이 이번 PR로 모두 갖춰졌다.
- 남은 위험: Auto ads 설정은 코드로 확인할 수 없다(AdLoader 주석상 '꺼둠'). 켜져 있어도 스크립트가 캔버스 화면엔 없으므로 거기 광고가 뜰 수는 없다.

## 항목별 결과

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 광고 스크립트 위치(코드 전수) | 통과 | 로더는 `src/components/AdLoader.tsx` 하나, 렌더는 `ContentShell`(`ads` 기본 true)에서만. 사용처: /play, /play/[id]/guide, /learn/[slug], /materials, /materials/[slug], /about. `ads={false}`: /privacy, /terms, /contact, 404(not-found), /learn(이번에 변경). 캔버스 화면(홈 SandCanvas, /play/[id] SpillPlayer, /daily, /gallery, /spill/*, /play/verify)은 ContentShell을 쓰지 않음. `loading.tsx`·`error.tsx` 없음 |
| 1-1 | 빈 상태·로딩·에러 | 통과 | 갤러리 빈 목록·로딩은 GalleryBrowser(광고 없음). 404는 `ads={false}`. 콘텐츠 페이지는 정적 export라 로딩 상태 없이 본문이 HTML에 구워짐. 캔버스로 가는 링크는 일반 `<a>`라 클라이언트 이동으로 로더가 따라가지 않음(ContentShell 주석) |
| 1-2 | 빌드 산출물 검증 | 통과 | `node scripts/verify-ads.mjs` → "허용 페이지 30개, 그 외 페이지에 광고 로더 없음(퍼즐·캔버스 화면 13개 포함)". 허용 페이지는 본문 600자 미만이면 실패하도록 강제 |
| 1-3 | 실사이트 실측 | 통과(정정) | 11-16 기록 "pagead2는 /learn에서만"은 일부만 본 결과였다. 실측 결과 sitemap 45개 중 31개 페이지가 로드(위 허용 목록 + /learn). 모두 본문 216단어 이상, /learn 외에는 452단어 이상 |
| 2 | ads.txt | 통과 | https://sandlab.app/ads.txt 200, 내용 `google.com, pub-9363381710674627, DIRECT, f08c47fec0942fa0` |
| 3 | `google-adsense-account` 메타 | 통과 | `src/app/layout.tsx:30` 루트 메타 → 전 페이지 |
| 4 | About | 통과 | /about 550단어, 운영자·작동 원리·글 작성 방식·연락처 |
| 5 | Privacy(쿠키·Google 고지) | 통과(보완) | /privacy 'Advertising' 절에 Google·파트너 쿠키, Ads Settings, partner-sites 링크. 광고 페이지 범위가 실제(공략·챌린지 목록 포함)와 달라 문구를 고쳤다 |
| 6 | Contact | **고침** | 전용 페이지 없었음(/contact 404, About 하단 절만). /contact 신설: hello@sandlab.app(`src/lib/site.ts` CONTACT_EMAIL), 버그 제보·씬 삭제 요청 방법, GitHub |
| 7 | Terms | **고침** | /terms 404였음. /terms 신설(이용 규칙, 게시 씬 규칙·삭제 요청, 광고 범위, 무보증) |
| 8 | 푸터·사이트맵 연결 | **고침** | ContentShell 푸터·갤러리 하단에 Terms·Contact 추가. sitemap 45 → 47개(/terms, /contact). 홈 캔버스 내비는 About만 연결(About → Contact로 이어짐) |
| 9 | 깨진 링크·404 | 통과 | sitemap 45개 전부 HTTP 200(curl). /play/2-1·/play/2-1/guide는 404이며 sitemap에도 없음(레벨 미공개, 얇은 페이지 노출 문제는 해소된 상태) |
| 10 | 콘텐츠 분량 | 통과 | 아래 표 |
| 11 | 모바일 첫 화면 | 통과 | 390×844에서 /play/1-1/guide: 제목·요약 카드·Play 버튼·본문 첫 문단이 스크롤 없이 보임, 광고가 본문을 밀어내지 않음(광고 단위 없음, 로더만) |
| 12 | 정책 | 통과 | 게임·캔버스 광고 없음(verify-ads 강제), 댓글 없음, 갤러리 UGC는 이메일 삭제 요청으로 관리(Terms·Contact에 명시) |

## 콘텐츠 (실사이트, `<main>` 본문 단어 수)
- sitemap URL: 45개(이번 PR 후 47개)
- **300단어 이상 고유 페이지: 31개** — learn 장문 3(1,561·1,787·1,914), /materials 허브 1,190, 재료 해설 14(452~704), 레벨 공략 10(467~513), /play 463, /about 550, /privacy 423
- **300단어 미만: 14개** — 전부 광고 없음
  - 캔버스·앱 화면: / 110, /gallery 90, /daily 142, 레벨 화면 /play/1-1~1-10 185~284
  - 목록: /learn 216 → 이번에 광고 끔
- 얇은 레벨 화면(약 200단어)은 실제 플레이 화면이라 noindex하지 않는다. 보강은 backlog SEO 항목(목표·핵심 원리·learn 링크)으로 유지.

## 이번에 고친 것
1. /contact, /terms 신설(광고 없음) + 푸터·갤러리 하단 링크 + sitemap 추가(+테스트)
2. /learn 목록 광고 끔, `scripts/verify-ads.mjs` 허용 목록에서 제외
3. /privacy 광고 고지 범위를 실제와 맞춤, 갱신일 11-16

## 오너가 신청 전에 할 일
1. AdSense → 광고 → sandlab.app → **자동 광고가 꺼져 있는지** 확인
2. **hello@sandlab.app으로 테스트 메일**을 보내 실제 수신되는지 확인(Cloudflare Email Routing — 에이전트는 확인 불가)
3. /terms 문구 검토(특히 '규칙 위반 씬은 삭제한다'는 운영 약속)
4. 이후 AdSense → 사이트 → sandlab.app → '검토 요청'
