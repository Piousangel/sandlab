# 레퍼런스: 배급 (Distribution) — 연구 사이클 1

낙사/절차생성/시뮬 콘텐츠가 퍼지는 법. 출처 있는 1차 자료.

## 핵심 사실 (출처)
- **공유되는 건 시뮬이 아니라 자기 창작물이다.** Sandspiel 제작자 본인: 대부분 페인트 프로그램으로 쓰고 시뮬은 뒷전. → https://maxbittker.com/making-sandspiel
- **재방문 엔진은 배급 순간이 아니라 인프로덕트 갤러리.** Sandspiel 7만+ 업로드·리믹스 문화(doonaloona 변주), 하루 수천 명. → https://maxbittker.com/making-sandspiel
- **Powder Toy 프론트페이지**: 표로 작동, 업로드 직후 초기 몇 표가 노출을 복리로 키움, 피크 온라인 시간대 게시가 진입 확률 최고, 썸네일=fire mode 기본 뷰, 체류 1주 제한. → https://powdertoy.co.uk/Discussions/Thread/View.html?Thread=17449
- **IIB 바이럴 전환율 ~0.5%**: Reddit 조회 105,000 → 사이트 방문 ~500 → 가입 21. 저자는 **OG 메타 누락**을 후회. → https://blog.defineyourdollars.com/build-in-public/ (다른 사례: 4시간 19,000 PV → https://www.petecodes.io/im-going-viral-on-reddit-right-now/)
- **X는 외부 링크 본문 도달을 50~90% 감소**(2026 초 비프리미엄 링크 게시물 median engagement ≈ 0). 알고리즘은 네이티브 GIF/영상/이미지를 보상, 프리미엄 2~4배. → https://sproutsocial.com/insights/twitter-algorithm/
- **Setris(모래 물리 테트리스)**: 2023 TikTok+HN 동시 바이럴, 모래+익숙한 포맷 매시업이 훅. Tetris Holding IP 통지로 하루 만에 Sandtrix 리브랜딩. → https://automaton-media.com/en/news/20230704-19918/
- **oddlysatisfying 메커니즘**: 결정론적이나 예측 불가한 물리의 긴장-해소 루프, 자연 정지점 없음(도파민 루프 지속), 무채 피드 속 네온 대비 썸-스톱, 명료한 사운드. #oddlysatisfying TikTok 1000억+ 조회. → https://viralballs.com/en/blog/the-science-behind-why-satisfying-videos-go-viral
- **공유 미디어 포맷**: MP4 우위(부드러운 모션/낮은 용량), X/Discord 네이티브 영상 선호, 5~12초 무음 루프가 자동재생 최적. Discord 재생 미리보기엔 직접 파일 링크 담은 `og:video:url` 필요. → https://blog.ni18.in/how-to-embed-videos-in-discord/

## sandlab 실행 통찰 (배급 가중)
1. **[agentSafe] 5~12초 무음 루프 MP4 자동 생성** — 스크린캡이 아니라 긴장-해소 한 사이클 이상 도는 컷, 무채 배경+네온. 인코딩(길이·무음·해상도)은 headless 검증, 미학 튜닝만 사람.
2. **[agentSafe] 공유 클립을 연 사람이 그 창작물이 로드된 리믹스 가능 상태로 착지** — Sandspiel 리믹스 + 경로 링크 결합. 신규 기능 아니라 배선. **(현 상태 확인 필요: /s/:id→#s=id→씬 로드→편집가능 인 듯 — 실측 요)**
3. **[agentSafe] 경로 링크에 og:video:url + twitter:player** — 언펄을 재생 클립으로 승격. **단 씬당 클립이 저장돼 있어야 함(현재 썸네일 정지 이미지만) → 클립 저장 선행 필요, 단순 agentSafe 아님.**
4. **[비자동/사람 운영] X는 네이티브 영상 본문 + 링크는 첫 댓글**(링크 본문 도달 -50~90%).
5. **[비자동/사람 운영] Reddit은 r/InternetIsBeautiful 1순위**(자기 사이트 공유 환영 창구) + 피크 시간 게시 + 제목·첫 프레임 A/B.
6. **[보류/high creep] 모래+익숙한 포맷 매시업 모드**(Setris형) — 존재하면 최상위 배급 자산이나 모드 전체 구현·IP 근접 리스크. 구현 전 클립만으로 선검증.

## 열린 질문 → 다음 사이클
- 라이브 /s/:id·홈이 og:video/twitter:player를 실제 내보내는지 vs og:image만인지 (curl raw HTML 실측).
- r/Simulated 상위 낙사 클립 실측(old.reddit.com JSON 등 대체 경로).
- 매시업 모드를 모드 구현 전 '클립만으로' 선검증할 실험 설계.
