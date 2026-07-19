# 레퍼런스: 커뮤니티 설계 (Community Designer) — 연구 사이클 2

낙사 UGC 커뮤니티의 재방문·큐레이션. 출처 있는 1차 자료.

## 핵심 사실 (출처)
- **Sandspiel 내장 갤러리가 관객을 만들었다**(외부 유튜버·스트리머가 아니라). 7만+ 작품, 리믹스 문화(doonaloona, Reggie 변형). → https://maxbittker.com/making-sandspiel/
- **댓글 없음 = 관객성 포기 아님.** Sandspiel은 좋아요/포크만으로 건강한 리믹스 문화를 만들고 댓글 부재가 독성을 없앴다. → 위 동일
- **Powder Toy FP = 투표+시간만, 1주 체류로 강제 회전.** 개발진: 콘텐츠 품질을 프로그램적으로 자동판정 못 하는 한 유저 투표를 유지해야. → https://powdertoy.co.uk/Discussions/Thread/View.html?Thread=17449
- **순수 투표의 부작용을 커뮤니티가 스스로 지적**: 신참이 실수로 FP 올라 조롱(heckling)받아 위축. 개선안: FP 도달에 **최소 4표·20뷰·다운보트 1개 이하** 임계 + 열람이력 기반 추천/랜덤 노출. → https://powdertoy.co.uk/Discussions/Thread/View.html?Thread=24192
- **콜드스타트 선례**: 첫 방문자가 빈 피드 대신 실질 콘텐츠를 즉시 보게 하라. Threads는 인플루언서 조기 접근 + 초기 유저 우선 노출로 사전 시딩. → https://wbcomdesigns.com/bootstrap-community

## sandlab 통찰 (전부 agentSafe·retention)
1. **[✅ 정렬됨] hot 1주창 유지** — Powder Toy 검증 메커니즘과 정확히 일치.
2. **[개발 대상] 리믹스 계보(lineage) 가시화** — 단순 버튼이 아니라 "이 작품에서 파생 N개 / 원본으로 거슬러". 댓글 없이 크리에이터 연결. **최상위 리텐션 지렛대.**
3. **[개발 후보] 창작자 귀환 훅 = 'Yours 탭 소식'** — 댓글이 없으니 신호는 좋아요/저장/리믹스 카운트뿐. Yours 재방문 시 "네 X가 3번 리믹스됨 / hot에 올랐음"을 배지로. 비동기 재방문 트리거. (계보 카운트가 선행.)
4. **[개발 후보] 신참 보호 Fresh 레인** — hot 랭킹 경쟁 전에 첫 작품이 관객성을 먼저 경험(Powder Toy가 제안만 하고 못 만든 것). 우리 'new' 탭 확장 or 별도 소창.
5. **[개발 후보/스케일 전] vote-decay 자동큐레이션** — dan-ball 12h 임계(삭제요청>투표면 자동삭제). 스팸 방어.
6. **[needsUser] 콜드스타트 시딩** — 운영자 강한 씨앗 + "이걸 리믹스해봐" 템플릿 상단 고정. 사용자가 그려야.

## 열린 질문
- 우리 vote 스키마(votes 테이블)에 다운보트/삭제요청을 어떻게 최소로 얹나 — 별도 컬럼 vs 별도 테이블.
- Fresh 레인의 임계(4표·20뷰) 중 '뷰'를 프라이버시 지키며 어떻게 세나(계측=AE 활성화 선행).
