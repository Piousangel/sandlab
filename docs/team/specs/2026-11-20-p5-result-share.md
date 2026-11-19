# 리디자인 P5 「결과 액자 + 공유 이미지」 — 리서치 1 · 기획 v1 (2026-11-20 06시)

> 상태: 리서치 1·기획 v1 완료(06시). 다음: 13시 리서치 2(반증) → 기획 v2 → 독립 리뷰 → 16시 구현.
> 상위 문서: [계획서 P5](../../plans/2026-11-19-redesign-v2.md) · 시안 `docs/design/redesign-v2/v3/v3_m-result.png`(B 하이브리드로 그려짐 → S1 라이트로 옮김) · 콘셉트 `research/2026-11-19/redesign-concept.md` "결과 — Framing"·"공유 카드".

## 0. 왜 지금, 왜 이것
- 데일리가 재방문의 핵심인데 결과 카드는 아직 옛 크림 카드(★ 글리프, 보드 위 bottom 고정). P4가 HUD를 새로 만들어 **결과만 옛 언어**로 남았다(두 디자인 언어 = R11).
- 공유는 유일한 무료 유입 경로다. 7일 share_click 4건, 외부 유입은 google 8·direct 26뿐. 지금 /daily 공유 문구는 `Sandlab Daily #42 ★★☆ … sandlab.app/daily` 형식에 **레벨 id(1-3)가 들어가** 스포일러 + 레벨 페이지 유도(버그 장부 11-20 '열림(P5)').

## 1. 리서치 1 (서로 다른 출처 4종)
| # | 출처 | 배운 것 | P5에 쓰는 법 |
|---|---|---|---|
| 1 | web.dev "How to share files" (https://web.dev/articles/files/share-files), W3C Web Share (https://w3c.github.io/web-share/) | 파일 공유는 `navigator.canShare({files})`로 **런타임 판정**이 정석(버전 번호로 판단 말 것). HTTPS·사용자 제스처 안에서만. 데스크톱 대부분은 파일 공유 불가 → 다운로드 폴백 | `canvas.toBlob → new File([blob],'sandlab-42.png',{type:'image/png'})` → canShare면 share, 아니면 다운로드 + 텍스트 복사 |
| 2 | 개발자 Q&A(iOS Safari·WhatsApp 사례: Apple 포럼 https://developer.apple.com/forums/thread/665812, SO 사례 모음) | iOS Safari에 File 객체를 직접 주면 TypeError 사례, **files + text를 같이 주면 일부 앱(WhatsApp)이 이미지를 버림** | v1: 이미지 공유는 files만(+title), 텍스트는 별도 "Copy text" 보조 버튼. 13시 반증에서 카톡 인앱 브라우저 확인 |
| 3 | Wordle 공유 격자 분석(Josh Wardle 회고 https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success, Desmos 분석 https://danmeyer.substack.com/p/why-wordle-works-according-to-desmos) | 공유가 퍼진 이유 = **스포일러 없는 자랑** + 모두 같은 퍼즐 + 어디든 붙는 텍스트. 공유 버튼은 사용자들이 이미 손으로 하던 걸 따라 만든 것 | 텍스트 공유를 없애지 않는다(이미지는 '추가'). 문구에 레벨 id·정답 위치 0 |
| 4 | 접근성: Wordle 이모지 격자 비판(https://gamerant.com/wordle-issues-accessibility-social-media-sight-impaired-emojis-readibility/, https://opensource.com/article/22/1/open-source-accessibility-wordle, MacStories WordleBot https://www.macstories.net/ios/wordlebot-1-1-now-fully-accessible-with-native-emoji-to-image-conversion/) | 스크린리더는 "green square gray square…"로 읽어 무의미. 해법 = 기호 옆에 **글로 된 점수** | shareTextV2의 `●●○` 뒤에 `2/3` 숫자를 붙이는 안(13시 반증 대상). 이미지에는 alt 대신 공유 텍스트가 같이 가지 못하므로 이미지 안 글자 크기 ≥ 40px(1080 기준) |
| 5 | 백분위 표시의 함정(일일 게임 기준선 블로그, chess.com 백분위 포럼, Wordle 비공식 통계의 자기선택 편향 — nerdschalk) | 작은 표본으로 정한 백분위는 크게 흔들리고, 공유하는 사람은 평균보다 잘한 사람(자기선택). 쉬운 날·어려운 날 기준이 다름 | "상위 N%"는 **서버 표본 ≥ 50(기존 `hist.ts MIN_SAMPLE`)일 때만**, 그 레벨의 클리어 기준이라고 문구로 밝힘. 지금 표본(7일 첫 클리어 6건)으로는 거의 안 뜬다 → 그래도 가짜 숫자보다 낫다 |

추가 사실(코드 확인): ① 보드는 CPU 시뮬을 **Canvas2D**(`render/canvas.ts`, glow는 별도 캔버스)로 그린다 → 최종 프레임 캡처가 WebGPU 없이 `drawImage` 한 번. ② 서버에 이미 레벨별 (moves, tbucket) 히스토그램 `/api/spill/level/<id>/hist`가 있고 ResultCard가 막대로 쓴다 — 새 서버 작업 없이 "Faster than N% of clears"를 계산 가능. ③ DailySpill은 이미 **그날 첫 클리어 기록(mine)**으로 공유 문구를 만든다(연습 결과로 공식 기록이 바뀌지 않음, S4).

## 2. 기획 v1
### 2-1. prod에 오늘 바로 나가는 조각 (일일 출시)
- /daily 공유 문구 `shareText(n, stars, moves, levelId)` → **`shareTextV2(mine, n)`**(레벨 id 제거, `●●○`, 시간이 있으면 `· 4.8s`). 옛 `shareText` 제거(호출처 0 확인 후). 결과 카드 Share·패널 'Share result' 둘 다.
- 접근성 보강 후보: `Sandlab Daily #42 ●●○ 2/3 · 2 moves · 4.8s` (13시 반증: 줄 길이·붙여넣기 미리보기·기존 골든 테스트 영향).
- 화면 장식은 바꾸지 않는다(장식 동결) — 문구·데이터만.

### 2-2. 프리뷰(새 셸)만: 결과 액자
- 위치: `SpillHud.Frame`의 `overlay` 자리. classic에서는 `ResultCard` 그대로(`@ui-shell`에 `ResultFrame` export 추가, classic.ts는 null).
- 순서(≤900ms, reduced-motion = 즉시 최종): 보드 정지 → 보드 가장자리에 유리 액자 테두리 '딸깍'(240~640ms) → 아래서 캡션 카드(640~900ms). 보드 자체는 어두운 유리(S1), 캡션은 Bone.
- 캡션: `No.42` (데일리) 또는 `1-3 Two Pots`(일반 레벨) · 유리알 3개(채움=재료색 아님, ink — 색만으로 구분 안 함, 빈 알은 테두리) · `2 of 3 stars` · 놓친 조건 한 줄(`Gem missed` / `Par: 1 move`) · `2 moves · 4.8s`.
- "상위 N%" 한 줄: hist 표본 ≥ 50이고 내 tbucket 위치가 계산될 때만 `Faster than 72% of clears`. 아니면 줄 자체를 그리지 않는다(빈 자리 예약 없음).
- 버튼: 주 버튼 1개 **Share image**(Ember), 보조 **Practice for 3★**(데일리)/**Retry**(레벨), 텍스트 링크 **Copy text**. 다음 행동 줄: 데일리 = `+1 stratum`(readStrata 오늘 층) + `Next puzzle in hh:mm:ss`, 레벨 = `Next: 1-4 →` + 공략 링크.
- 실패 화면은 P5 범위 밖(지금 진행 줄 메시지 유지).

### 2-3. 공유 이미지
- 순수 함수 `composeShareCard(layout, data)` → Canvas2D 1080×1080(기본) / 1200×630(OG 레이아웃, 같은 함수, P5는 다운로드용만). Bone 바탕 + 어두운 유리 액자 안에 **실제 종료 프레임**(보드 캔버스 + glow 캔버스 drawImage, nearest 확대) + 캡션(No.N·유리알·수·시간·`sandlab.app/daily`).
- 폰트: P1 서체가 로드된 뒤 그리기(`document.fonts.ready`), 실패 시 시스템 폰트.
- 크기 ≤ 250KB(PNG, 그레인 노이즈 없음 — 압축 방해). 초과하면 WebP 대신 해상도 1080→900.
- 공유: canShare(files) → `share({files:[file], title})`; 아니면 PNG 다운로드 + 텍스트 클립보드 복사 + 안내 한 줄. 실패·취소는 조용히(거짓 '공유됨' 금지).
- 계측: `share_click` ref에 `daily-image`·`daily-text`·`daily-download` 추가(worker SHARE_REFS 허용 목록 갱신 + 테스트).

### 2-4. 하지 않을 것
9:16 스토리 카드, 기울이기(tilt), 소리 'tink'·햅틱(사운드 키트는 컷오버 뒤), 서버 새 API·리더보드 S0, 실패 화면 개편, 홈·/play 장식 변경.

## 3. 사용자 질문 (v1 답 — 근거 약한 곳은 13시에 반증)
1. **처음 온 사람**: 클리어 직후 3초 안에 "내가 몇 점인지 + 다음에 뭘 누를지" 안다 — 버튼 Ember 1개. 근거: P4 HUD와 같은 위계. (13시: 처음 온 사용자 서브에이전트 시뮬)
2. **왜 계속 하나**: 빈 유리알 + 놓친 조건 한 줄이 재도전 이유, 내일은 지층 +1과 카운트다운. 약점: 3★면 재도전 이유 없음 → 레벨 다음 링크.
3. **왜 졌나**: 실패 화면은 범위 밖. 별을 놓친 이유는 조건 이름으로 명시(억울함 감소).
4. **어떻게 쓰나**: 390·360에서 액자+캡션+버튼이 한 화면(스크롤 0) 확인 필요. 연타 = 공유 진행 중 버튼 비활성. 탭 숨김 뒤 복귀 = 결과 정지 상태 유지. reduced-motion 즉시. 유리알은 모양(채움/테두리)으로도 구분.
5. **왜 공유하나**: 결과 = 작품(실제 종료 프레임)이라 스포일러 없이 '내 모래 그림'을 보여 준다. 근거 약함 — 종료 프레임이 정답 배치를 드러내는지 레벨별 확인 필요(**13시 최우선 반증**: 보드 최종 프레임 = 정답 위치 노출일 수 있다).
6. **우리 사이트에서 왜**: 다른 일일 퍼즐은 색 격자 텍스트만, 우리는 진짜 시뮬 결과 그림. 근거: 리서치 3.
7. **오너가 볼 때**: "Top 18%가 왜 안 보이냐" → 표본 부족 시 숨김 이유를 PR에 적는다. "또 프리뷰만이냐" → 2-1 prod 조각.

## 4. 13시 반증 과제
1. 최종 프레임 공유가 **정답 배치를 보여 주는가**(데일리 풀 레벨별) → 그렇다면 액자 이미지를 흐림/결과 영역 크롭/재료 분포만으로 바꿀지.
2. 카카오톡·인스타 인앱 브라우저에서 canShare(files) 동작(지표상 gpu_unsupported UA kakao|insta 존재).
3. `2/3` 덧붙임이 붙여넣기 미리보기·기존 shareTextV2 테스트와 충돌하는지.
4. 1080 PNG 실제 크기(어두운 보드 + 액체 노이즈가 압축을 깨는지).
5. "Faster than N%"가 /play 클리어와 섞인 레벨 전체 표본이라는 점이 데일리 문맥에서 오해를 부르는지.
