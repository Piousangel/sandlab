# 콜드스타트 발사 플레이북 — 첫 100~1000명

연구 사이클 1(distribution)+3(discovery) 종합. 사용자(창작자)가 직접 실행하는 needsUser 가이드.
근거는 references/distribution.md·discovery.md. **이 장르는 검색이 아니라 커뮤니티·소셜·직접방문으로 큰다**
(sandspiel Direct 68.6%). 그래서 "잘 만든 발사 1회 + 씨앗"이 SEO 위생 100개보다 유입을 만든다.

## 발사 전 체크리스트 (순서대로)
1. **[무비용 창] 커스텀 도메인 sandlab.app 확보** — 발사의 링크·백링크가 영구 자산이 되게. workers.dev로
   발사하면 그 신뢰·에쿼티가 임시 도메인에 묶인다. (붙이면 에이전트가 SITE 한 줄 바꿔 배포.)
2. **씨앗 15~50개 직접 그려 Publish** — 첫 방문자가 5초 안에 볼 것과 바로 리믹스할 것이 있어야 이탈 안 함.
   **화산·폭탄·레이저 금지**(Powder Toy가 기시감=죽음으로 지목). 리믹스 유도형("이걸 이어 그려봐") 몇 개 상단에.
3. **AE 계측 켜기**(대시보드) — 발사 직후 유입 소스(Reddit/Discord/X)를 referrer로 측정해 어디에 재투자할지 판단.
4. **좋은 클립 하나** — 10초 무음 루프(긴장-해소 한 사이클 이상, 무채 배경에 네온 요소). 이게 광고다.

## 채널별 발사 (총알 아껴 하나씩)
- **r/InternetIsBeautiful** — 자기 사이트 공유를 환영하는 드문 링크 친화 창구. 1순위. (IIB 조회의 ~0.5%만
  클릭하므로 제목·첫 프레임=썸네일이 곧 제품.)
- **r/webgames · r/proceduralgeneration** — 소모용, 첫 반복이 목적. 클립 첨부.
- **Show HN** — sandspiel도 HN 반복 노출로 발견됨. "Show HN: Sandlab – falling sand you paint and share as a link".
- **Discord(창작/게임 서버) · itch.io** — 보조.
- **HN·r/Simulated는 아껴라** — 갤러리에 씨앗 차고 클립 좋아진 뒤 큰 총알로.

## 게시 형식 (플랫폼 알고리즘)
- **X: 네이티브 영상 본문 + 링크는 첫 댓글.** 링크 본문은 도달 -50~90%. 같은 클립으로 몇 배 도달.
- **Reddit/Discord: 클립(mp4) 우선, 링크 병기.** 5~12초 무음 루프가 자동재생 최적.
- **타이밍: US 활동 피크**(Powder Toy식 초기 표 복리). 올리자마자 몇 표 받으면 노출이 커진다.

## 발사 직후
- AE로 referrer host 분포 확인 → 반응 있는 채널에 다음 총알.
- 갤러리 hot에 씨앗이 뜨는지, 첫 방문자 여정(클립→링크→씬 로드→리믹스→Publish)이 실제로 도는지 확인.

## 하지 마라
- SEO에 시간 더 쓰기(위생 3종으로 끝. 색인할 UGC 없음).
- 발사 전 새 기능 추가(배급 회피). 씨앗+발사가 먼저.
- 신규/저karma 계정으로 서브레딧 발사(자동필터). 계정 적격성 미리 확인.

## 심화 (병렬 탐색 coldstart 연구, 출처 있음)

### 게시 시각 하드코딩 (KST 변환 포함)
- **HN Show HN**: 화~목 08~10시 ET = **KST 21~23시**. 첫 60~90분 표 속도가 순위 결정. 일요일 저녁도 2순위.
  월 아침·금 오후 회피. → okara.ai/blog/show-hn-front-page
- **Reddit**: 평일 06~09시 ET = **KST 19~22시**, 화·수 선호. **"30분 내 10표 > 3시간에 20표"**(decay ~12.5h). → upvote.net
- **Product Hunt**: 00:01 PST 게시로 24시간 확보(낮은 우선순위 채널 — 무가입 토이라 badge 실익 낮음). → calmops.com
- **댓글 = 초기엔 업보트의 ~2배 모멘텀**(HN·Reddit 공통). 5업보트+10댓글 > 15업보트+0.

### 발사 = "게시 1회"가 아니라 "첫 90분 라이브 응대"
게시 직후 90분간 스레드 붙박이, **모든 댓글에 창작자가 직접 답**(+ "물+불 섞으면?" 류 질문에 즉석에서 씬을
그려 링크로 응답). 낙사 토이는 이런 질문이 자연 발생 → 즉답이 곧 랭킹 연료.

### sandlab의 구조적 무기
- **r/InternetIsBeautiful은 가입/로그인 벽 제품을 automod로 거른다.** sandlab은 무계정 원클릭이라 경쟁 UGC
  토이 대부분이 못 통과하는 벽을 **애초에 통과**. 발사 카피에 "no signup, one link" 자체를 후크로. → refined.so
- **단, karma 있는 오래된 계정으로 게시**(신선 계정 자동필터). r/entrepreneur는 서브karma 10 최소. 발사 전 체크: 게시 계정 karma/나이.

### WebGPU 호환성 마찰 선제 방어
동종 WebGPU 낙사 Show HN(2023)의 첫 마찰이 "안 돌아감/프리즈". sandlab은 (a) **관람모드**(계정불요, WebGPU
없어도 갤러리 보임)가 폴백 자산, (b) 게시 본문에 "works in Chrome/Edge, Safari 26+" 한 줄 선명시로 "안
돌아간다" 첫 댓글 무력화. → news.ycombinator.com/item?id=36106262

### 추가 채널
- **itch.io**: 브라우저 플레이 전환 37% vs 다운로드 6%. 내부 배너 CTR(썸네일)이 트래픽 좌우 → 무음 클립 자산 재활용. release announcement는 큐레이터가 매일 봄. → howtomarketagame.com
- **PROCJAM(절차생성 잼), r/proceduralgeneration, r/PlayMyGame, r/IndieDev** — 잼은 "진행 중 공유" 장려 → 과정 노출로 씨앗.

## 미완 (visual 페르소나 3사이클 연속 실패 — design.md의 크리틱으로 대체 충당됨)
