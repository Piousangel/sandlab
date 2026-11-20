# 샌드랩 AdSense 광고 단위 (2026-11-20 오너와 생성)

게시자 `ca-pub-9363381710674627`. 슬롯 ID는 공개 값(HTML에 그대로 나간다). 코드 연결 = `src/ui-next/ads/config.ts`의 `AD_SLOTS`.

| 자리(코드 키) | 단위 이름 | 슬롯 ID | 크기 | 어디에 |
|---|---|---|---|---|
| `play` | sl-play-300x250 | 9581379414 | 고정 300×250 | /play 전시실, 월드 카드 아래 1곳(간격 32px) |
| `contentMid.narrow` | sl-content-mid-320x100 | 6955216070 | 고정 320×100 | 글 페이지 본문 중간 1곳, 화면 폭 800px 미만 |
| `contentMid.wide` | sl-content-mid-728x90 | 5642134405 | 고정 728×90 | 같은 자리, 화면 폭 800px 이상 |
| `contentEnd` | (아직 없음) | — (`null`) | 고정 300×250 | 글 페이지 글 끝 1곳 — 단위를 만들면 ID만 채운다. 그 전에는 렌더 0 |

글 페이지 = /learn/<글>, /materials, /materials/<재료>, /about, /play/<id>/guide (`scripts/verify-ads.mjs` 허용 목록과 같다).
/learn 목록·/privacy·/terms·/contact·404·캔버스·퍼즐·갤러리 화면에는 광고 자리가 없다.

## 운영 규칙

- **승인 전에는 꺼진 상태.** 자동광고 OFF, 단위는 리디자인 새 셸(프리뷰 빌드, `NEXT_PUBLIC_UI=next`)에서만 렌더된다. prod(classic)는 안내판을 그리지 않는다 — 컷오버(P12) 전까지 prod 화면 변화 0.
- **AdSense 재심사 신청 금지**(오너 결정 전까지). 계획서 0장 '하지 않을 것'.
- 반응형 단위로 바꾸지 않는다. 안내판은 높이를 고정 예약(CLS 0)하고 `overflow:hidden`이라, 더 크게 그려지는 반응형 광고는 잘린다 = 광고 가림 정책 위험.
- 중간 띠는 단위 2개를 브레이크포인트(800px — 본문 열 728 + 여백 + 데스크톱 스크롤바)로 갈아 끼운다. 마운트 뒤 화면 폭에 맞는 `<ins class="adsbygoogle">` **하나만** DOM에 둔다(push는 DOM의 첫 미처리 ins를 채우므로 숨은 ins가 있으면 그쪽이 잡혀 폭 0 오류).
- 광고 안내판은 'Advertisement' 라벨 + 콘텐츠 카드와 다른 면(회백 빗금·점선) + 인터랙티브와 24px 이상(S11, `AdPlate`가 강제).
- 컷오버 전 확인: 승인 전에 prod로 새 셸을 내보내면 빈 안내판(라벨·빗금)이 보인다 — 컷오버 시점의 승인 상태를 보고 `AD_SLOTS`를 비울지 결정한다.
