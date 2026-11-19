# 버그 장부 (QA 교대가 갱신)

심각도: **상**(기능 고장·데이터 손실) / **중**(눈에 띄는 오동작·지표 왜곡) / **하**(접근성·SEO·사소). 고치면 상태를 `수정(#PR)`으로 바꾸고 줄은 남긴다.

| 날짜 | 심각도 | 상태 | 증상 | 재현 | 원인 |
|---|---|---|---|---|---|
| 11-20 03시 | 중 | 수정(이 PR) | /daily 클리어 직후 결과 카드의 **Share**가 데일리가 아니라 레벨 문구(`Sandlab Spill 1-3 ★★☆ … sandlab.app/play/1-3`)를 공유. 친구가 /daily 대신 레벨 페이지로 오고, `share_click daily` 계측도 안 잡힘 | 390x844 터치, /daily → 정답 동작 → RUN → 카드의 Share | ResultCard가 항상 `hist.shareText(def.id…)`를 쓰고, 데일리용 문구는 아래 패널의 'Share result' 버튼에만 있었다 |
| 11-20 03시 | 하 | 수정(이 PR) | /daily에 h1 2개(HUD `1-3 Two Pots` + 패널 `Daily #42: …`) | `document.querySelectorAll('h1')` | DailySpill 패널 제목이 h1 → h2(겉모습 같음) |
| 11-20 03시 | 하 | 수정(이 PR) | /gallery에 제목(h1) 0개 | 같은 방법 | 화면 제목 없음 → 화면 밖 h1 추가(시각 변화 0) |
| 11-20 03시 | 중 | 열림 | **홈 정적 HTML에 h1·본문 텍스트 0**(WebGPU 실패 시에도 h2 하나뿐). 검색·스크린리더가 홈이 무엇인지 모름 | `curl /` 본문에 h1·p 없음 | 홈은 SandCanvas만 그린다. 첫 화면 실험 1 판정(11-21) 뒤 화면 밖 h1 + 한 줄 설명 검토(리디자인 P6 홈에서 같이 해도 됨) |
| 11-20 03시 | 하 | 열림(P3 새 셸이 대체) | ContentShell 헤더·푸터 링크 높이 17px(24px 미만). 간격 예외로 WCAG 2.5.8은 통과할 수 있으나 엄지로 누르기 빡빡함 | scripts/qa/crawl.cjs `small:` | 옛 헤더 스타일. P12 컷오버 전엔 손대지 않음(장식 동결) |
| 11-20 03시 | 하 | 공유 문구 수정(#75), 제목은 열림(P12) | /daily classic 화면 제목·공유 문구에 레벨 id(`1-3`) 노출 — 스포일러 원칙(S5)과 어긋남 | /daily 헤더 | 옛 HUD. 공유 문구는 #75가 shareTextV2(`Sandlab Daily #42 ●●○ 2 moves · 4.6s`)로 교체 — 결과 카드·본문 버튼 둘 다. classic HUD 제목의 id는 장식 동결이라 컷오버(새 HUD No.N)까지 남음 |

## 이번 교대가 확인 못 한 것
- **라이브 sandlab.app**: 이 컨테이너 프록시가 CONNECT 403(정책) → 로컬 prod 빌드 + `wrangler dev --local`로 대신 점검. 배포 run 74(#72) 성공은 Actions로 확인.
- **홈 샌드박스·홈 데일리 카드 실화면**: 헤드리스 WebGPU는 스왑체인 불가("GPU was interrupted" 화면). 코드상 데일리 카드는 고정 행(스크롤 컨테이너 없음), `touch-action:none`은 캔버스 오버레이에만 → 스크롤 충돌 소지는 낮다. 실기기 확인 필요.
