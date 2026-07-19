# 레퍼런스: 검색/발견 (Discovery) — 연구 사이클 3

단일 페이지 WebGPU 토이의 검색·발견 현실. 라이브 사이트 실측 + 출처.

## 핵심 사실 (출처)
- **장르 승자도 검색이 아니라 커뮤니티·소셜·직접방문으로 굴러간다.** sandspiel.club(2018, 장르 대장)
  데스크톱 트래픽: **Direct 68.6%** 1위, 이어 Organic Search, Organic Social(소셜은 YouTube 1위·Reddit 2위).
  → https://www.similarweb.com/website/sandspiel.club/
- **발견의 축 = Hacker News 반복 노출 + 소셜 공유** (2018 Sandspiel, 2019 Making Sandspiel, 2024 재등장).
  Sand Game JS도 커뮤니티 공유로 수십→수만 성장. **SEO 단독은 이 장르에서 구조적 실패**(사용자 과거 실패와 일치).
  → HN 18696291·19793835·39522640, harag.cz/app/sand-game-js
- **홈 head 위생은 장르 평균 이상**(title·완전 OG 1200×630·twitter large card·theme-color·icon 서버렌더).
- **색인할 콘텐츠가 사실상 0**: /gallery는 SSR 없이 Loading… JS 셸이라 UGC 씬이 크롤러에 안 보임,
  홈은 캔버스+버튼 라벨뿐(워드마크가 h1 아닌 span). 검색이 복리로 쌓일 유일한 축(대량 UGC 씬 페이지)은
  **갤러리 씨앗 0건 병목이 풀린 뒤에야** 가능.

## 실측으로 고친 결함 (이번 사이클에 처리, 02035865)
- ~~sitemap.xml 404~~ → **`app/sitemap.ts` 생성**(홈+갤러리, 200 application/xml).
- ~~robots.txt에 Sitemap 라인 없음~~ → **`app/robots.ts` 생성**(allow all + Sitemap + Host).
- ~~canonical 없음~~ → layout `alternates.canonical` 추가.
- ~~JSON-LD 없음~~ → 홈에 VideoGame 구조화 데이터(무설치 브라우저 게임).
- 전부 `src/lib/site.ts`의 SITE 상수 하나를 참조 → 도메인 전환(sandlab.app) 시 한 줄로 다 갱신.

## 정정 (페르소나 오탐)
- 페르소나가 "모든 페이지가 정적 /og.png"라 했으나, 이는 **없는 id(/s/test123)로 테스트해 홈으로 302**된 탓.
  **실제 씬은 `/s/:id`가 그 씬 썸네일(`/api/scenes/:id/thumb`)을 og:image로 동적 발행한다**(로컬 검증됨).
  갤러리가 비어 실씬 테스트가 불가했던 것. → 씬별 동적 OG는 이미 구현됨. (단 썸네일 420×210이 FB/링크드인
  대형카드 임계 미달 — 클립 저장 아키텍처 결정과 함께 별도 후속.)

## 결론 & 우선순위
- **SEO는 위생 3종으로 마감. 더 투자 금지**(색인할 UGC 없음 + 장르가 검색으로 안 굴러감).
- 진짜 발견 자산 = **공유 시 미리보기(씬 OG + 10초 클립)** — 이미 있음. 그리고 **커뮤니티 발사 1회**(Show HN
  + r/webgames/r/proceduralgeneration, 클립 첨부) — needsUser.
- UGC-SEO(갤러리/씬 SSR·정적생성)는 **씨앗이 쌓인 뒤** 여는 문제 — 지금이 아니라 '트리거 시점'을 정해둘 것.

## 열린 질문 (미완 페르소나: coldstart·monetization·visual 재시도 필요)
- AE 계측 켜진 뒤 실제 유입 소스(Direct/Referral/Search/Social) 분포 측정 → sandspiel 패턴과 대조해 SEO 투자 타이밍 실증.
- 갤러리/씬 페이지 SSR 전환의 기술 여력·트리거 시점.
- Show HN·Reddit 발사 계정의 karma·age·서브레딧 규칙 적격성(신규 계정 자동필터 위험) — needsUser.
