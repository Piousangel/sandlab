# 결정 기록

## 2026-11-10 하루 1개 출시의 단위 = 레벨 + 공략 페이지
- 맥락: AdSense 9-21 '가치 없는 콘텐츠' 반려, 재심사 미신청. 과거 48게임 허브는 얇은 게임 양산으로 유입 0
- 선택: 평일 Spill 레벨 1개 + 300단어+ 공략·물리 해설, 주 1회 새 동사·월드·플랫폼 기능
- 버린 안: 매일 새 미니게임(깊이·콘텐츠 가치 낮음), 혼합(집중 분산)

## 2026-11-10 챌린지·갤러리 연동 = 레벨 갤러리
- 맥락: 갤러리(WebGPU 1200×600 씬)와 Spill(CPU 160×240, 별도 재료)은 엔진이 달라 직접 연동 불가
- 선택: Spill 에디터 공개 → 솔버 검증 통과 레벨만 발행 → 플레이·투표 → 인기작은 데일리 후보
- 버린 안: 클리어 리플레이 공유(루프 약함), 샌드박스 씬→챌린지 변환(엔진 불일치)

## 2026-11-10 운영 체계는 프로젝트 비종속으로
- 맥락: 잘되면 minigames-hub에도 적용 예정
- 선택: sandlab-daily 스킬은 "프로젝트 설정" 섹션만 바꾸면 이식, daily-metrics는 QUERIES 표만 교체

## 2026-11-15 주 2회 큰 기능 + 마케터 자율 게시
- 맥락: 첫 3일 회고에서 미니게임 팀은 '1시간 안 가능?' 필터 때문에 큰 후보(리더보드 참여·첫 화면·Solitaire 공략)를 매일 미뤘다. 마케팅 게시는 0건이었다(자격증명 없음, 새 콘텐츠 없다며 큐를 비움).
- 선택(사용자): 월요일에 스펙 2개를 쓰고 화·목에 큰 기능을 만든다(최대 3시간, 이틀까지 이어서). 마케터는 매일 최소 1건 게시하고, 반응과 유입을 지표 파일로 직접 확인한다. 사람 승인은 받지 않는다. 실험·기능은 계측을 먼저 심는다.
- 버린 안: 큰 기능 주 1회(샌드랩 기존 '주 1회 플랫폼 슬롯'은 이 결정으로 대체), 마케팅 초안만 쓰고 사람이 게시.

## 2026-11-16 갤러리와 챌린지를 분리한다 (오너)
- 맥락: 11-10에는 '레벨 갤러리'로 둘을 연결하기로 했지만, 오너가 둘을 별개로 운영하길 원한다. 챌린지는 깨는 맛, 갤러리는 만드는 맛·공유하는 맛.
- 선택: 데일리 챌린지는 팀이 매일 고품질 1개를 낸다. 갤러리는 창작 도구를 쉽게, 결과를 예쁘게 바꾼다. 필요하면 서버를 추가한다(비용·장애 설계·기록 조건).
- 버린 안: 레벨 갤러리 연동(11-10) — 유저 레벨 발행은 나중에 다시 검토.
- 상세: docs/team/owner-direction-2026-11-16.md

## 2026-11-16 AdSense 재검토 전 광고 범위 축소 + 정책 페이지 보강
- 맥락: 9-21 반려(콘텐츠 없는 화면의 광고, 가치 낮은 콘텐츠). 점검 결과 광고 로더가 31개 페이지에 실리고, 그중 /learn 목록이 216단어로 가장 얇았다. Terms·Contact 페이지가 없었다.
- 선택: /learn 목록 광고 끔(verify-ads 허용 목록 제외), /terms·/contact 신설(정책 페이지라 광고 없음). 상세 docs/adsense/2026-11-16-readiness.md
- 버린 안: 얇은 레벨 화면(약 200단어) noindex — 실제 플레이 화면이고 광고도 없어 색인 유지, 본문 보강은 backlog로.

## 2026-11-19 참고 오픈소스 라이선스 규칙(참고 레포 조사)
- 코드 재사용 가능(MIT·Apache 등): react-spring, Motion, screen-shake, ZzFX, canvas-confetti, matter-js, planck.js, sandspiel(MIT) 등 — 라이선스 고지 유지.
- **코드 금지·아이디어만**: Sandboxels(R74n, 광고 포함 상업 이용 금지), Sand Game JS(README에 "법적으로 오픈소스 아님"), GPL·AGPL 계열(Powder Toy, lichess, Hextris). AdSense 사이트이므로 한 줄도 가져오지 않는다.
- 근거: docs/team/research/2026-11-19/reference-repos-uiux.md(46개 레포·별 수·라이선스 11-19 GitHub API 확인).

## 2026-11-19 샌드랩 UI·UX 전면 교체(오너)
- 오너: "챌린지 등 지금 UI·UX가 다 마음에 들지 않는다. 너무 옛날(2000년대 초반) 같다. 전면 교체했으면 좋겠다."
- 결정: 점진 개선이 아니라 사이트 전체 UI·UX를 새로 설계한다(디자인 디렉터 콘셉트 3안 → 오너 선택 → Figma 시안 → 단계 구현). 시뮬레이션 엔진·공유 URL 형식·SEO URL은 유지.
- 교대 팀 규칙(새 디자인 확정 전까지): 기존 화면의 **장식·레이아웃 개편 작업은 멈춘다**(곧 교체되어 버려진다). 대신 ① 버그(특히 모바일에서 지우기가 우클릭에만 있어 막힘) ② 엔진·성능·접근성 ③ 레벨·재료 로직 ④ 측정 이벤트처럼 새 UI에서도 살아남는 일을 한다.

## 2026-11-19 리디자인 방향 확정 = v2 「Glass & Grain(유리와 모래)」(오너)
- 시안: docs/design/redesign-v2/sandlab-v2.html(+ 390 홈·1440·데일리 결과 캡처, 캔버스는 엔진 실캡처). UI가 유리 용기와 모래로 만들어짐: 2:1 유리 우물, 재료 시험관 랙, 지층 병 스트릭, 모래시계, 갤러리 액자. Ember는 화면당 주 행동 하나. 이모지 0.
- 독립 전문가 리뷰 반영 후 docs/plans/ 단계별 PR 계획으로 구현(redesign-concept.md 5장 '새 셸을 옆에 짓고 한 번에 갈아탄다' 전략 유지).

## 2026-11-19 리디자인 S1 = A 라이트(오너)
- 비교: v3 390 홈 A 라이트 vs B 하이브리드(Kiln 계기 구역), docs/design/redesign-v2/v3/. 오너: "라이트가 나은 것 같다".
- 보완: 시험관 윤곽 ≥ .58, 옅은 재료는 결 패턴 + 이름 라벨. 캔버스 우물·Spill 보드 안쪽만 어두운 유리.

## 2026-11-19 리디자인 P2 데이터 계층 — 지층 순환표·유리알 공유 규칙·DailyRec 확장
- **STRATA_CYCLE(순서 고정, 바꾸면 지난 지층 색이 전부 바뀜)**: `sand, gunpowder, seed, lava, ash, acid, stone, plant, wood, water`. 층 색 = `STRATA_CYCLE[(dayNumber-1) % 10]`, 그날 레벨 재료와 무관(리뷰 B1). 풀 9개와 서로소라 레벨이 같은 날(9일 간격)끼리도 색이 다르다.
  - 고른 방법: 18종(empty 제외)에서 옅은 salt·steam·ice·metal을 뺀 14종 중 sand(브랜드 재료)를 포함하는 10종 조합 가운데 CIELAB ΔE76 최소 쌍 거리가 가장 큰 것(최소 17.8, stone–ash), sand를 #1로 두고 이웃한 날(순환 포함) ΔE 최소가 가장 큰 배열(72.7). 빠진 fire·smoke·wall·oil은 lava·ash·stone·wood와 거의 같은 색이다.
  - 주의(P7): sand·seed·acid는 Bone(#F4ECDD) 위 대비가 1.1~1.4:1이라 층 테두리(ink 1px)나 결 패턴이 필요하다. 재료색은 텍스트에 쓰지 않는다.
- **공유 텍스트 v2(유리알 규칙)**: `Sandlab Daily #<n> <알3개> <N move(s)>[ · <초>s]\nhttps://sandlab.app/daily`. 알 3개, 별 수만큼 앞에서부터 `●`(U+25CF), 나머지 `○`(U+25CB) — 기하 도형 블록이라 이모지로 바뀌지 않는다(Extended_Pictographic 아님). 칸 위치에는 뜻이 없다: 처음엔 CLEAR·GEM·PAR 칸 고정을 검토했으나 mask 없는 기록(당분간 전부)과 뜻이 엇갈려 거짓 정보가 된다는 독립 리뷰로 버림. 별 수 = mask가 있으면 비트 수, 없으면 stars. 시간은 ticks가 있을 때만. 레벨 id는 넣지 않는다(풀 9개라 id로 9일 주기가 드러남). 기존 `shareText`는 지금 /daily가 쓰므로 P5까지 유지.
- **DailyRec**: `ticks?`·`mask?`(CLEAR=1·GEM=2·PAR=4, score.ts 별 비트와 같음) 선택 필드. 키 `sandlab.spill-daily.v1` 불변, stars·moves만 넘기면 예전과 바이트 단위로 같은 JSON. 공식 기록 = 그날 첫 유효 클리어(덮지 않음). 읽을 때 잘못된 선택 필드는 생략, 그날 항목만 깨졌으면 다음 첫 클리어가 채움, 저장소 값이 통째로 손상됐으면 원본을 지우지 않고 저장을 건너뜀(예전과 같음).
- **재도전(연습) 기록은 저장하지 않는다.** 필요해지면 제안: 같은 키에 넣지 말고 별도 키 `sandlab.spill-daily-best.v1`에 {day: 최고 기록}만(공식 기록·지층·공유와 분리).
- **ticks·mask 실제 수집은 P5부터**: P2는 UI 변경 0 조건이라 컴포넌트를 건드리지 않았다. 지금 화면(DailySpill)은 onCleared가 {stars, moves}만 넘겨 그때까지의 기록엔 ticks·mask가 없다(읽기·지층·공유는 없을 때를 처리). P5에서 SpillPlayer onCleared에 `ticks: r.ticks, mask: starMask(st)`를 더해 saveDaily로 넘긴다. 더 일찍 모으고 싶으면 이 두 줄만 별도 PR로(화면 변화 없음).

## 2026-11-19 아이콘 v1 알갱이 점 규칙(23시 교대, 독립 리뷰 지적 반영)
- 콘셉트 3.4의 "1.5px 점"을 **반지름 1.25(지름 2.5px)**로 바꾼다. 2px 스트로크 옆에서 1.5px 점은 20px 크기에서 사라진다(시트 실측).
- "아이콘마다 점 1개"에서 **7종 예외**: pause·sound-off·link·next·back(점이 의미를 바꾸거나 가독성 저하), remix(두 화살촉이 중앙에서 만나 충돌), star-full(채운 원에 하이라이트를 구멍으로 뚫어 점 대신). 목록과 이유는 src/ui-next/icons/icons.ts `GRAIN_EXCEPTIONS`가 단일 출처이고 테스트가 강제한다.

## 2026-11-19 웹폰트 도입 — "웹폰트 추가 없이 시스템 폰트"(R1 3.1, specs/2026-11-18-spill-ui-overhaul-round1.md) 번복 (리디자인 S8, P1)
- 맥락: 오너가 "2000년대 초반 같다"고 판정한 원인 중 R9가 "시스템 폰트 단일 + 굵기만 변화"(redesign-concept.md 0-1). 독립 리뷰(11-19)도 폰트를 권고 11로 냈다. R1 때 웹폰트를 뺀 이유는 성능·AdSense 영향 최소화였다.
- 선택: Bricolage Grotesque 400(opsz 14)·700(opsz 48) + JetBrains Mono 500, 정적 인스턴스 + 라틴 서브셋 self-host(`src/ui-next/fonts/`, OFL.txt 동봉, 재현 `scripts/fonts/build-fonts.py`). `next/font/local`, `display: swap`, Bricolage는 `adjustFontFallback: 'Arial'`(size-adjust 폴백으로 CLS 방지). 실측 합계 47,408B(46.3KB) = 400 19,368 + 700 19,508 + Mono 8,532(라이선스 nameID 13·14 포함, 재실행 시 바이트 동일) — 목표 80KB 이하.
- 근거: ① 브랜드 고유성 — 디스플레이 서체+모노 라벨 2서체 체계가 '유리와 모래' 정체성의 절반(스크린샷 한 장으로 샌드랩임을 알게). ② 비용이 작다 — 외부 요청 0(self-host), 46KB, swap이라 글자가 막히지 않음. ③ 리뷰 권고(폰트 swap·size-adjust) 그대로.
- 조건: P1은 `preload: false`이고 새 셸(NEXT_PUBLIC_UI=next 프리뷰)에서만 실린다 — prod 빌드 out/ 전 파일이 base와 같다(buildId 제외). **LCP 영향은 P3(새 셸이 첫 화면에 서체를 쓰기 시작할 때) 프리뷰 Worker에서 Lighthouse 모바일로 실측**하고, Display만 preload로 바꿀지 그때 정한다. LCP가 2.5s를 넘기면 700만 남기거나 서브셋을 더 줄인다.
- 버린 안: Google Fonts CDN(외부 요청·개인정보·캐시 분리로 이점 없음), 가변 폰트 그대로(opsz·wdth·wght 3축 ≈ 라틴만 해도 2배 이상), 시스템 폰트 유지(R9 그대로).

## 2026-11-20 리디자인 P3 앱 셸 — 붙는 곳·내비 라우트·광고 안내판·폰트 preload
- **셸이 붙는 곳 = 글 콘텐츠 셸(ContentShell) 35페이지만.** 홈(`position:fixed` 캔버스)·/daily·/play/[id]·/gallery·/spill은 화면 전체를 쓰는 캔버스라 레이아웃에 헤더를 얹으면 겹치거나 100dvh가 넘친다 → 각 화면 PR(P4 Spill HUD·P6 홈·P9 갤러리)이 자기 헤더를 새 셸로 바꾼다. ContentShell은 `@ui-shell`에서 `ShellHeader`·`ShellFooter`를 받고, classic(prod)에서는 둘이 null이라 지금 헤더·푸터를 그대로 그린다(classic.ts import 0개 유지, prod out/ 171파일 main과 동일). 버린 안: layout에 전역 헤더(캔버스 화면과 겹침), ContentShell 통째 치환 별칭(별칭만 늘고 이득 없음 — 독립 리뷰 동의).
- **내비 = Pour(/)·Solve(/play)·Browse(/gallery)·Learn(/learn)**, 데일리는 헤더 pill(/daily). 라벨과 h1이 아직 다른 곳(/play h1 "Sandlab Spill", /gallery)은 h1·본문 diff 0 원칙 때문에 이번엔 안 바꾸고 P8·P9에서 맞춘다. 콘텐츠 셸 밖으로 나가는 링크는 일반 `<a>`(광고 로더가 캔버스로 따라가지 않게), 글끼리만 next/link.
- **내비는 840px 이상에서만 헤더에**, 그 아래는 메뉴 시트(`<dialog>` showModal — 바깥 inert, Esc, 포커스 복귀). 720px에서는 가운데 내비와 pill 사이 여유가 8px 안팎이라 올렸다(840에서 실측 73px).
- **데일리 pill**: SSR은 "Daily"(빌드 시각을 HTML에 굽지 않음), 마운트 뒤 `No.N hh:mm`(UTC 자정까지, 분 올림, 12ch 칸 예약 = CLS 0). 접근 이름은 보이는 글자로 시작(WCAG 2.5.3, axe 실측으로 고침).
- **광고 안내판 AdPlate(S11)**: 회백(--sl-ad)+빗금+점선, 'Advertisement' 라벨(11px ink-2, aria-labelledby), 바깥 여백 `max(24px, clearance)`, 고정 높이 예약(rect 250·banner 100 + 라벨 24). `ads`(그 페이지가 로더를 싣는가)와 `slot`이 둘 다 있어야 렌더 — 지금은 광고 단위가 없어(AD_SLOTS 빈 객체) 어디서도 렌더되지 않는다. 단위는 고정 크기로 만든다(반응형은 잘림 = 정책 위험).
- **회색 패널 중첩 린트(R3)**: `pnpm lint:ui` 규칙 2. 무채 면 = bone-2·ad·bone-line·kiln-2(+같은 hex, 잉크 rgba 틴트). CSS 선택자 조상·같은 파일 JSX 중첩을 잡는다. 컴포넌트 경계를 넘는 중첩은 못 잡음(리뷰·캡처로).
- **폰트 preload는 계속 false.** 로컬 Lighthouse 모바일(시뮬 스로틀, 머신 load 24~26, 압축 없는 로컬 정적 서버라 절대값은 부풀려짐)에서 prod vs 프리뷰: /learn LCP 4.3 vs 4.4s, /about 3.5 vs 3.4s, CLS 둘 다 0, FCP 0.8 → 1.1~1.4s. LCP 요소는 본문 `<p>`(시스템 폰트)라 Display 서체가 LCP를 정하지 않는다 → preload하면 본문 요청과 대역폭만 다툰다. 홈은 셸이 없고 CLS 0.17은 prod에도 있는 기존 값(P6 과제). 실제 프리뷰 Worker 배포 뒤(03시 QA) 다시 재고 LCP가 prod보다 0.3s 넘게 나쁘면 700만 남기기를 검토.

## 2026-11-20 리디자인 P4 Spill 플레이 HUD·데일리 시작 — 보드 가림 0, ticks·mask 수집
- **셸 치환**: `@ui-shell`에 `SpillHud`(chrome(vw)·Frame)·`DailyStart`를 더했다. classic.ts는 둘 다 null(런타임 import 0 — 계약 타입은 `import type`이라 지워짐), SpillPlayer·DailySpill이 null이면 지금 HUD·화면을 그대로 그린다. 레이아웃은 `computeLayout`에 선택 입력 `chrome {top,bottom,side}`를 더했고, 없으면 지금 값(HEADER_H·TRAY_MIN) 그대로.
- **보드를 가리는 것 0**: 리트라이·Undo·속도 원형 버튼(FloatButtons), 보드 위 메시지 알약·보석 알약을 새 HUD에서 뺐다. 목표·보석 = 보드 위 목표 줄(데스크톱은 오른쪽 목표 카드), 도구 = 보드 아래 트레이 맨 아래 줄(엄지 쪽), 메시지·Watch = 진행 줄(hudLine 형식 왼쪽, 메시지 오른쪽). Undo는 실제 canUndo(Spill 컨트롤러)에 연결 — S5 "Undo 빼기"는 엔진 비용 Undo(홈 샌드박스) 얘기라 해당 없음.
- **세로 예산**(src/ui-next/spill/chrome.ts, 테스트 고정): 모바일 헤더 48·목표 44·유리 테두리 3 | 보드 | 3·진행 52·도구 52·여백 8, 데스크톱(≥900) 헤더 56·테두리 4 | 보드 | 4·진행 52·도구 52·8. 진행 줄 52 = 진행(모노 1줄) + 힌트·실패 문장(본문 서체 2줄까지) — 독립 리뷰가 한 줄 말줄임이면 360에서 힌트 앞 18자만 보인다고 지적해 44→52. 진행·도구 줄은 트레이 맨 아래에 붙이고 남는 세로는 보드와 진행 줄 사이 Bone. 보드는 2:3 정수 장치 픽셀 배율 그대로 — 390×844(3x) 373×560(지금 HUD와 같음), 360×640(3x) 267×400(지금 HUD 320×480보다 한 단계 작음: 목표 줄·진행 줄 몫), 1440×900 480×720.
- **보드 좌우 여백**: 390에서 보드 유리가 화면 끝에서 약 5px — 시안(약 28px)보다 좁다. 지금 HUD와 같은 보드 폭(373px = 7 장치 픽셀/셀)을 지키려는 선택(여백 28px면 6/셀 = 320px로 한 단계 작아진다).
- **S9 '모노 라벨 ≤ 4'의 해석**: 라벨 = 이름표(배지 No.N·진행 줄·목표 카드 제목). 목표 칩 안 숫자 값(0/300)·속도 값(1x)은 값이라 세지 않는다.
- **Ember는 RUN 하나**(실행 중엔 Pause가 bone-2로 바뀌어 Ember 0). 동사 2개 이상 + 폭 < 420이면 동사 라벨을 접는다(아이콘 + 남은 수, 접근 이름 유지).
- **데일리 시작 화면**: 실루엣 = 틱 0 판을 `saturate(.25) brightness(.8)`로. 목표 문장 한 줄(같은 문장은 묶음)만, par·별·보석·레벨 요약(d.summary는 보석·par 별을 말함)은 싣지 않는다(S5). 이미 풀었으면 버튼이 "Practice"(연습)로. 플레이 화면 제목 옆 표식은 레벨 id 대신 No.N(풀 9개라 id가 주기를 드러냄 — P2 공유 규칙과 같은 이유).
- **ticks·mask 수집(prod 포함)**: SpillPlayer onCleared가 `{stars, moves, ticks, mask: starMask}`를 넘기고 DailySpill이 첫 클리어 때만 saveDaily로 저장. 재도전은 loadDaily 검사 + saveDaily 자체 가드로 덮지 않는다. P2의 "P5부터"를 P4로 당김(오너 지시).
- **prod 번들 변화의 성격**: 클라이언트 컴포넌트가 `@ui-shell`(classic.ts)을 처음 import해 클라이언트 그래프에 모듈이 하나 늘어나면서 webpack deterministic 모듈 id 두 개(4109↔6490)가 맞바뀌었다 — 그래서 무관한 청크(홈·에디터·벤치)도 바이트가 달라진다(내용 동일). /spill/bench HTML은 RSC 페이로드의 그 id만 다르다.

## 2026-11-20 '일일 출시'와 '리디자인 prod diff 0'의 상충 조정 (06시 회의)
- 상충: 오너 원칙 "하루 1개 이상 사용자에게 보이는 출시"(OPERATING) vs 리디자인 계획 "P1~P11은 프리뷰에서만, prod HTML diff 0". 11-19 P1~P4는 prod 체감 변화가 거의 0이었다.
- 결정: 리디자인 순서·prod diff 0 원칙은 그대로 두고, **각 P PR에 prod에 바로 내도 안전한 조각(데이터·문구·버그·접근성, 장식 변경 없음) 1개 이상을 싣는다.** 그 조각이 그날의 '출시'다. 조각이 없는 날은 버그 장부(docs/team/bugs.md) 항목 1개를 같은 날 고쳐 출시한다.
- P5의 prod 조각 = /daily 공유 문구를 shareTextV2로(레벨 id 제거). 근거·기획: docs/team/specs/2026-11-20-p5-result-share.md.
- 버린 안: (a) 프리뷰 출시를 출시로 친다 — 사용자가 못 보니 원칙 위반. (b) 리디자인을 멈추고 레벨을 낸다 — 오너 최최우선 지시 위반.
