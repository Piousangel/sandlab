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

## 2026-11-20 리디자인 P5 결과 화면·공유 이미지 — 공유 텍스트 prod 교체, 연습 판은 이미지 공유 없음, 상위 N%는 자리만
- **셸 치환**: `@ui-shell`에 `SpillResult`를 더했다(classic = null → prod는 지금 ResultCard 그대로). SpillPlayer는 카드가 뜰 때 SpillResult가 있으면 그것을, 없으면 ResultCard를 그린다. 결과 화면은 플레이 헤더(48/56) 아래를 덮는 Bone 면 — 헤더(뒤로·소리·메뉴)는 그대로.
- **액자 = 실제 종료 프레임**: 결과 화면이 처음 그려질 때(useLayoutEffect) 엔진 캔버스(재료 + 발광 합성)를 160×240 캔버스로 한 번 복사한다. 오버레이(목표 테두리·연출 입자)는 넣지 않는다(작품만 건다). 이후 잔광 시뮬이 돌아도 액자는 멈춘 그림.
- **공유 텍스트(prod 포함)**: 데일리 공유는 전부 `shareTextV2`(레벨 id 없음). 결과 카드 Share는 #73(03시 QA)이 단 `share` prop으로 DailySpill 문구를 쓰는데, 그 문구가 옛 `shareText`(`Sandlab Daily #42 (1-3) ⭐⭐ …` — 레벨 id)였다 → 이 PR에서 그 문구를 shareTextV2로 바꿔 결과 카드·본문 버튼이 함께 바뀐다(ResultCard 코드 변경 없음). 옛 `daily.ts shareText`·테스트 삭제. shareTextV2·레벨 모드 v2 텍스트는 새 파일 `src/lib/spill/client/share.ts`로 옮겼다 — daily.ts는 홈 번들에도 들어가는 공용 모듈이라 거기 두면 score.ts 포맷터까지 홈 청크로 끌려간다(첫 빌드에서 실제로 봄).
- **공식 기록 vs 연습(S4)**: 공유 텍스트·이미지 숫자는 항상 공식 기록(그날 첫 클리어). **연습 판에서는 이미지 공유를 뺀다** — 액자 보드는 연습 판인데 숫자는 공식 기록이라 두 판이 섞인다(독립 리뷰 차단). 주 행동이 "Copy today's result"(공식 기록 텍스트)로 바뀌고 문구로 "Practice run…" 명시. 저장이 막힌 기기는 세션 안 두 번째 클리어부터 연습(ref).
- **공유 이미지**: 1:1 1080 · OG 1200×630 두 포맷만, 왼쪽 못·걸이줄·액자(보드 정수 배율 3/2), 오른쪽 Daily No.N(레벨 모드는 이름)·유리알·수·시간·sandlab.app. Bone 평면·블러 없음 → PNG가 작다(실측은 PR). 250KB를 넘으면 배율을 낮춰 다시 그린다. 결과 화면이 뜬 뒤 300ms에 두 포맷을 미리 렌더 — 누른 순간 navigator.share를 불러야 iOS 사용자 활성화가 살아 있다. 경로: Web Share Level 2(files) → 파일 공유, 실패(Abort 제외) 시 터치 기기는 텍스트 복사, 데스크톱(pointer: fine)은 다운로드, 파일 공유 없는 폰은 텍스트 복사.
- **상위 N%**: 서버 집계가 없어 `DailyStanding` 인터페이스와 `standingLine()`(값 없음·표본 < 50이면 null → 줄 미렌더)만. 06시 기획 v1의 '레벨 hist로 Faster than N%'는 쓰지 않았다 — /play 클리어와 섞인 전 기간 표본이라 '오늘 클리어한 사람 중'이 아니다(기획 반증 5와 같은 우려). DailySpill은 늘 null. 집계 설계 제안은 계획서 "P5 메모"(D1 `spill_daily`, 첫 클리어만 제출, 퍼센트·표본만 응답, 개인정보·위조 방어 단계). 집계 자체를 만들지는 오너 결정 대기(프리뷰 쓰기는 #76으로 이미 403 — 프리뷰 제출이 prod 집계에 섞일 걱정은 없음).
- **모바일 세로 예산**: 보드 높이 = 화면 높이 − 397(헤더·못·줄·매트·캡션 ≤170·stratum·Share image·간격) → 360×640에서도 Share image가 첫 화면 안(테스트 고정). 데스크톱(≥900)은 액자 왼쪽·캡션 오른쪽 2열, 1440×900에서 보드 320×480.
- **열린 문제 — 공유 이미지 스포일러(06시 기획 반증 1, 이 PR은 프리뷰 전용이라 prod 노출 0)**: 종료 프레임은 판 위치(파낸 자리·물줄기)를 그대로 보여 준다 — 같은 날 모두 같은 퍼즐이라 데일리 이미지는 정답 힌트가 된다. 컷오버(P12) 전에 정한다: ① 그날 데일리 이미지만 보드를 흐리게/모자이크(8셀) ② 다음 날부터 원본 ③ 결과 영역(목표 항아리 아래)만 크롭. 지금 구현은 요구대로 원본 프레임.
- **공유 시트에는 files + title만**(text 없음): files와 text를 같이 주면 일부 앱(WhatsApp)이 이미지를 버린다(06시 리서치 2). 텍스트는 Copy text.

## 2026-11-20 프리뷰 Worker = prod와 같은 D1 + 쓰기 차단(오너)
- 결정(오너 11-20): 프리뷰 Worker(`sandlab-preview`, 계획 S6)는 prod와 **같은 D1(sandlab-gallery)을 읽되 쓰기는 막는다.** 프리뷰 전용 D1은 두지 않는다.
- 구현: wrangler `env.preview.vars.READ_ONLY = "1"` → 워커 진입점이 `/api/*`의 GET·HEAD 외 모든 메서드를 핸들러 전에 403 `{"error":"preview is read-only"}`로 끊는다(`worker/preview.ts readOnlyBlock`). 라우트 목록이 아니라 **메서드 기준**이라 앞으로 생길 쓰기 라우트(PUT·DELETE 포함)도 자동으로 막힌다. 지금 막히는 것: POST `/api/scenes`(업로드)·`/api/scenes/:id/vote`·`/api/daily`·`/api/spill/level/:id/clear`·`/api/track`. prod(최상위 설정)에는 변수가 없어 동작 불변.
- 화면: `NEXT_PUBLIC_READ_ONLY=1`(build:preview에만) → 새 셸 헤더 아래·메뉴 시트에 "Preview is read-only..." 한 줄(`src/ui-next/shell/ReadOnlyNote.tsx`). **UI 플래그(NEXT_PUBLIC_UI)와 분리** — 컷오버(P12)에서 prod가 next 셸로 빌드돼도 안내가 prod에 안 뜬다. prod 배포 스크립트는 이 변수를 비우고, verify-ads(prod 모드)는 변수·`data-sl-read-only`가 있으면 실패.
- 이유: (1) 리디자인 검수는 실제 갤러리·데일리 통계가 보여야 의미가 있다 — 빈 D1이면 갤러리·히스토그램이 비어 화면 판단이 틀어진다. (2) 프리뷰 쓰기가 prod 랭킹·데일리 통계·IP 레이트리밋 표에 섞이는 사고를 원천 차단. (3) D1 하나·마이그레이션 하나로 운영 부담 0.
- 한계: 쓰기 버튼(갤러리 업로드·투표, 데일리 기록 자동 전송)은 아직 classic 컴포넌트에 있어 프리뷰에서도 눌린다 — 서버가 403으로 막고 기존 오류 처리대로 실패한다(prod 화면 변화 0을 지키려 classic은 안 건드림). 새 셸이 그 버튼을 그리게 되는 P(갤러리·결과 화면)가 `PREVIEW_READ_ONLY`로 disabled + 안내를 붙인다. 데일리 시작 화면의 "Your first clear is today's official record." 문구도 프리뷰에서는 사실이 아니다 — P5(src/ui-next/spill) 쪽에서 처리.
- 알려진 한계 2: 차단은 메서드 기준이다. 앞으로 GET에서 D1에 쓰는 라우트(예: 조회수 증가)를 만들면 프리뷰에서 뚫린다 — 그런 라우트를 만들지 않거나, 만들 때 READ_ONLY에서 DB를 쓰기 거부 래퍼로 감싼다.
- 버린 안: 프리뷰 전용 D1 — 빈 데이터로 검수가 무의미, 스키마·마이그레이션 이중 관리. NOINDEX=1에 쓰기 차단을 묶기 — 뜻이 다른 두 스위치를 하나로 묶으면 나중에 한쪽만 바꿀 수 없다.

## 2026-11-20 리디자인 P7 /daily 지층 허브 — '아직' vs 결측, 경계선, 광맥, 공유 이미지 스포일러 가림
- **허브 = 데일리 시작 화면(P4 DailyStart) + 지층 병**(`src/ui-next/daily/` StrataJar·strataModel). 모바일은 오늘 카드 아래, 데스크톱(≥900)은 오른쪽 340px 칸. 프리뷰 빌드 전용(classic 무변경). 날짜 지시선 캡션은 여기에만(S5).
- **층 규칙**: readStrata 최근 30일(전 기간을 읽어 연속·광맥을 센 뒤 창만 그림). 색 = STRATA_CYCLE(P2 그대로). **별 수 = 두께(1·2·3별 7·10·13px) + 결(ink 알갱이 점 1·2·3개/8px 타일)**. 합이 병 안쪽 220px를 넘으면 비율 축소(30층 3별에서 약 7px).
- **오늘 미해결 = '아직'(pending)**: 채움 없는 점선 윤곽, 2별 두께 자리를 예약, 캡션 "today · not yet". **결측일 = 얇은(4px) 빗금 공백층 + 점선**, 캡션 "missed"(이어진 결측은 "11-14 to 11-16 · 3 missed" 한 줄). 모양(윤곽 vs 빗금)·두께·문구 세 가지로 구분한다. 오늘 아직은 연속 기록을 끊지 않는다(어제까지 셈).
- **빈 상태**: 첫 기록(전 기간 기준) 이전 결측은 그리지 않는다 → 처음 온 사람은 '아직' 하나뿐인 빈 병 + "Each daily you solve pours one layer." 출시 초기(30층 미만)는 바닥부터 쌓이고 위는 빈 유리(높이 고정, 늘리지 않음). 오래 쉰 사람은 신규로 보이지 않게 창 안 결측을 그대로 그린다(독립 리뷰).
- **경계선**: 유리(Bone 위 흰 38%) 위 대비 3:1 미만 재료는 층 윗면·아랫면에 ink 1px — 계산으로 정한다(`needsEdge`, 테스트 고정). 실측 대상 = sand·seed·acid(1.1~1.4)에 더해 lava·plant(2.3~2.6)도. 경계선은 모든 채움 뒤 별도 패스(층별로 그리면 윗층이 선 절반을 덮음 — 리뷰). 재료색은 SVG 채움에만, 글자는 ink·ink-2·ember-text.
- **광맥(vein) = 실제 기록 기준만**: 연속으로 푼 날이 7·14·30·60·100·200·365에 닿은 그 날 층에 흰 알갱이 3개 + 캡션 "7-day vein"(재료 이름 대신 — 캡션 칸 폭). 다음 목표 줄 "5-day run · vein at 7 days, 2 to go"는 연속 ≥ 1일 때만. 예상·가짜 광맥 없음.
- **지시선**: 위(오늘)부터 4줄 + 맨 아래(가장 오래된 층) 1줄, 18px 간격으로 밀어 겹침 0. 그림은 aria-hidden, 같은 내용을 화면 밖 `<ol>`로 읽힌다(하루 한 문장).
- **물결**: 경계 진폭 ≤ 이웃 층 중 얇은 쪽의 25%(곡선 엇갈림 없음, 테스트), 부호 = 날짜 번호 홀짝(창이 하루 밀려도 층 모양 유지).
- **새 셸 플레이 화면 설명 패널(DailyAside)**: describeLevel 요약("1-3 Two Pots is…")·"Open 1-3 in the level list"·옛 주황 Share result 버튼을 뺐다. 공유는 결과 화면(P5)의 Share image·Copy text 하나로. 목표 문장은 목표 줄·목표 카드에 이미 있어 빼고(리뷰), 기록 한 줄·How to play·힌트·링크(/daily, /play)만. 인라인 색 없음 → `.sl-sp-aside a`의 `!important`는 `a[style]`(옛 /play/[id] 본문)로 좁혔다. /play 본문이 새 셸로 옮겨지면(P8·P10) 남은 두 덮어쓰기 규칙을 지운다. classic은 `DailyAside = null` → DailySpill이 지금 패널을 그대로 그린다.
- **공유 이미지 스포일러(팀 결정)**: 데일리 공유 PNG는 **그 퍼즐의 UTC 날짜 안에서는** 보드를 모자이크 — 16셀 칸 평균 + 보드 전체 평균 쪽으로 50% 평탄화, **목표(항아리) 칸만 선명**('bad' 칸은 가림), 오른쪽 글(No.N·유리알·수·시간·sandlab.app)은 선명, 한 줄 "Board hidden until tomorrow (UTC)". **다음 UTC 날부터 원본**(결과 화면에 머문 채 자정을 넘기면 이미 만든 가린 PNG를 그대로 씀 — 안전한 쪽). 8셀 칸은 1-3 실측에서 파낸 두 자리·물줄기 기둥이 칸 색으로 읽혀 16셀 + 평탄화로 키웠다. 모자이크 사본을 못 만들면 보드를 비운다(원본 노출 금지). 결과 화면 안 액자(본인 화면)는 원본.
- **레벨 모드(/play)는 원본** — 레벨은 고정 공략이라 같은 날 겨루는 사람이 없고, 공략 글(/play/:id/guide)도 공개돼 있다.
- **한계(리뷰, 과장 금지)**: 가림은 '피드에서 남의 첫 시도를 망치지 않는 매너' 수준이다. 같은 날 /play/<같은 레벨>을 풀면 원본 이미지가 나가고, 데일리 풀이 9개라 다음 날 공개되는 원본은 9일 뒤 데일리의 정답이기도 하다. 막으려면 데일리 전용 레벨(풀 확장)이 필요 — 별도 판단.
- 지층 병 이미지를 결과 공유에 넣는 안은 이번에 하지 않는다(범위 밖, 제안만: 1:1 이미지 오른쪽 아래 작은 병 — 연속 기록이 공유 동기가 됨).

## 2026-11-20 리디자인 P8 /play 전시실 — 정적 썸네일, '곧 공개' 칸, h1 유지, 광고 자리
- **전시실 = 새 셸 `@ui-shell` PlayGallery**(`src/ui-next/play/`, classic null → prod /play는 지금 화면 그대로). 화면 전체 Bone, 레벨 보드 썸네일만 어두운 유리 액자(S1). 월드별 줄 = 모노 라벨 "World N · 이름" + 구분선 + "n / m stars", 칸 = 썸네일·레벨 id·이름(두 줄까지)·유리알 별 0~3(star-full/empty 아이콘, 이모지 0). 잠긴 칸 = lock 아이콘 + 썸네일 45%, 누르면 그 월드 바로 아래에 "Earn N stars in World n-1 to open this room."(role=status, aria-label에도 — prod lockMessage는 별 기호라 말로 바꿈). 잠금 규칙은 catalog.ts 그대로.
- **썸네일 = 빌드 전 스크립트로 구운 정적 PNG**(`npx tsx scripts/gen-level-thumbs.mts` → `public/ui-next/levels/<id>.png` + `levels.json`의 레벨 해시). 시작 보드(parseLevel + 엔진 팔레트, 노이즈는 맵 문자 2×2셀 단위) + 목표 1셀 윤곽 + 보석 점, 정답 경로 없음. 160×240 팔레트 PNG 2.3~4.6KB(11개 합 34.7KB, 상한 15KB/개). 셀 단위 노이즈는 흙 많은 1-2가 12.4KB라 버렸다. 라이브 캔버스 0. 레벨을 고치면 play.test가 해시 불일치로 실패 → 스크립트 재실행. 정적 파일이라 prod out/에도 12개 파일이 생기지만 어느 prod 페이지도 참조하지 않는다(포스터 아틀라스와 같은 방식).
- **'곧 공개' 칸**: 마지막 월드가 10칸보다 적을 때만, 최대 2칸(점선 윤곽 + 모래시계(daily) 아이콘 + "Soon", 링크·이미지·이름 없음 — 잠긴 칸의 lock과 다른 아이콘: "별을 모으면 열린다"로 읽히지 않게, 리뷰). 가짜 레벨 이름·썸네일 금지.
- **주 행동 하나(Ember)**: 기록 없음 "Start with 1-1 First Drop"(prod의 시작 링크와 같은 문구) → 진행 중 "Continue with <열린 칸 중 3별 아닌 첫 레벨>" → 전부 3별 "Every room solved. Play today's daily". 높이 고정이라 진행을 읽은 뒤 문구만 바뀐다(CLS 0, prod는 기록이 있으면 시작 링크가 사라져 아래가 밀린다).
- **h1은 prod 그대로 "Sandlab Spill"(SEO diff 0)**, 내비 라벨 Solve와는 h1 위 모노 눈썹 라벨 "Solve"로 맞춘다(S10). 이유: 시안의 "Puzzles"나 "Solve"는 검색어(Sandlab Spill)를 잃고, title("Sandlab Spill — falling-sand physics puzzles")과도 멀어진다. h1을 바꾸려면 컷오버(P12) 전에 SEO 판단으로 따로.
- **본문 = prod와 같은 문장**: 소개 2문단은 page.tsx의 상수 하나를 두 빌드가 함께 쓴다("How Spill works" 카드 안), 'All levels' 목록(레벨·공략 링크)·데일리 줄 유지. 카드에 공략 링크(1-1 guide)와 Learn 글 `/learn/margolus-falling-sand`(Spill 보드도 같은 낙사 규칙) 링크. 실측: /play main 단어 438→485, 링크 35→37.
- **광고(S11)**: AdPlate를 월드 카드 아래 1곳(format rect, 간격 32px, 'Advertisement' 라벨), 슬롯 `AD_SLOTS.play`가 비어 있어 지금은 렌더 0. 오너와 만들 단위 제안: **고정 300×250 디스플레이 1개**(모바일 390·360 폭 안, 1440에서도 본문 열 안) — 반응형 단위 금지(안내판 고정 높이 250 + 라벨 24).
- **/play/[id] 설명 패널 = `@ui-shell` LevelAside**(DailyAside 방식): 인라인 색·opacity 없음 → spill.css의 `.sl-sp-aside a[style]`·`p[style*='opacity']` !important 두 규칙 삭제. 순서 = SpillPlayer의 How to win(목표)·Stars 다음 바로 How to play(방법)·힌트, 그 뒤 About this level(요약)·Materials·링크(문장·링크는 prod와 같다). 프리뷰 읽기 전용이면 "your stars stay in this browser, but clears aren't added to the shared stats" 한 줄.
## 2026-11-20 리디자인 P6 홈 「Pour」 — 셸 치환·링크 순수 함수 위치·데모·미지원·진입 상태
- **셸 치환**: `@ui-shell`에 `HomePour`를 더했다. classic.ts는 null → `src/app/page.tsx`가 `HomePour ? <HomePour/> : <SandCanvas/>`로 지금 SandCanvas를 그대로 그린다. 새 홈 코드는 `src/ui-next/home/`(HomePour·Rack·HomeSections·model·home.css)에만. 엔진 무변경 — 옛 홈과 같은 공개 API(init·upload·start·brush·readback·clear·destroy)만 부른다.
- **`#s=` 파싱·parent 결정을 순수 함수로(P2 인계 착수 조건)**: `sceneIdFromHash`·`SCENE_HASH_RE`·`hasEmbeddedScene`·`publishParent`·`publishedLinks`. 옛 홈·새 홈이 같은 함수를 부른다. 골든셋의 '소스 트립와이어'는 함수 호출 테스트 + 두 홈의 계보 연결 지점 확인으로 바꿨고, 골든 해시 표(12행)는 그대로 통과.
  - **위치를 `src/lib/sand/urlState.ts`로 한 이유(실측)**: 처음엔 새 파일 sceneLink.ts였는데, SandCanvas 쪽 webpack 연결 모듈(concatenated module) 구성이 바뀌어 모듈 id가 9880→9453으로 바뀌었고 prod index.html의 RSC 페이로드까지 달라졌다. SandCanvas가 이미 import하는 urlState.ts에 두면 모듈 수·id가 그대로 → prod HTML 차이가 **홈 페이지 청크 파일명 해시 1개**로 줄어든다.
  - prod 동작 동일 증명: base(main) vs 브랜치 prod 빌드에서 골든 링크 10개 진입 + 붓기 + Publish(가짜 업로드, prod 미전송)의 배너·parent·발행 후 해시·공유 링크가 10/10 같음.
- **첫 방문 데모**: 키 `sl.pourdemo.v1`이 없을 때 1.5초 동안 위쪽 가운데(6%)에서 모래 한 줄기(반경 9). 첫 터치에 즉시 멈추고(데모가 부은 모래는 남김 — 옛 홈과 같은 손실감 회피), reduced-motion·재방문·링크로 연 장면이면 없음(손가락 힌트만, 15px). 옛 홈의 900프레임 앰비언트 데모(물·용암 버스트)는 새 홈에 없다 — 계획서 '1.5초 데모'를 따름.
- **Share**: 첫 획 전(링크 장면 복원 전)에는 흐림 + `aria-disabled` + 숨김 이유("Pour something first."). 누르면 공유 시트(링크 `#g=` 만들기·복사·네이티브 공유, 갤러리 Publish, 10초 녹화). 프리뷰는 Publish·제목 입력 disabled + READ_ONLY_NOTE.
- **WebGPU 미지원(B4 ③)**: init 실패만(복원 단계 실패는 빈 화면) — 헤드라인 "Today’s puzzle works here." → 오늘 카드 + Solve today(주 CTA) → 실엔진 정지 프레임(`public/ui-next/home/still.webp`, 프리뷰 홈에서 붓고 캡처, 12.6KB) + gpuAdvice 이유 + 카카오면 Open in browser(openExternal 기존 스킴) + Copy link → 벽 미리보기.
- **진입 상태(B4 ④)**: 헤드라인 = 장면 제목, 부제 = `by <이름> · N remixes`. **단건 조회 API(`GET /api/scenes/:id`)는 작성자 이름을 싣지 않아**(목록만 실음) 지금은 항상 "From the gallery"로 — '익명'이라고 단정하지 않는다. 이름을 보이려면 워커 단건 SELECT에 `creator_name AS creatorName`을 더하는 별도 PR(P9 갤러리 때 권장). 리믹스 배너는 재료 줄 자리(같은 높이 56)를 차지해 밀림 0, 닫으면 재료 줄 + Original(`/s/:id`, 옛 홈과 같은 대상).
- **CLS**: 헤드라인 두 줄·우물 2:1·재료 줄·랙·도크·오늘 카드·지층·벽을 SSR부터 높이 고정. 로컬 실측(첫 방문 5초) 390·360 = 0, 1440 = 0.0002(prod 홈 0.0047). 계획서의 'prod 0.17'은 Lighthouse 모바일 값이라 같은 조건 재측정은 프리뷰 배포 뒤 03시 QA 몫.
- 버린 안: SandCanvas에 prop을 더해 새 틀로 그리기(prod 청크·동작이 크게 바뀜), 새 홈에서 작성자 이름을 목록 API로 따로 찾기(요청 1회 추가·정확하지 않음), 시험관 스트립 애니메이션(S7 — 선택 관 루프는 P11).

## 2026-11-20 리디자인 P9 갤러리 「The Wall」 — 단건 API creatorName(prod), 큐레이션 = 기존 공개 장면, 라이브 1점, pill 'Daily'
- **워커(prod에 들어감, 필드 추가만)**: `GET /api/scenes/:id`(풀·`?meta=1` 둘 다)에 `creatorName`을 싣는다(`creator_name AS creatorName`). 이름은 목록(`/api/scenes`)이 이미 같은 키로 공개하는 값이라 **노출 범위가 늘지 않는다**. `creatorId`는 단건에 싣지 않는다(목록에는 있지만 이 화면에 필요 없음 — 최소). 익명 업로드는 `null`. 기존 필드·캐시 헤더(풀 1시간·meta no-store) 그대로. 지시서는 `creator_name`이라 했지만 응답 키는 목록·클라이언트 타입(`SceneMeta.creatorName`)·P6 홈 코드가 이미 쓰는 camelCase로 맞췄다(같은 값, 다른 키 두 개를 만들지 않음).
  - 효과: P6 홈 진입 부제가 `by <이름> · N remixes`로 나온다(HomePour는 이미 `sc.creatorName`을 읽고 있었다 — 서버만 비어 있었음). 테스트 worker/scene-one.test.ts, verify-gallery.py에 단건·meta·익명 3항목 추가.
- **큐레이션 12점 = 이미 공개된 팀 작품 id(새 업로드 0)**: prod D1에 쓰지 않는다는 조건이라 `#g=` 인코딩(복잡한 장면은 URL 예산 6000자 초과 — 측정된 한계)보다 기존 id가 낫다. 갤러리 44점 중 아트 카운슬(2026-08 라운드 1~6, 인계서 이력에 제목이 남은 것)이 만든 작품만 후보로 삼고, 실엔진 캡처의 색조(채도 ≥ .25 픽셀 평균 색상각)와 팔레트를 보고 12점을 골랐다 — 노랑 용암·하늘 물·호박 나무·라임·주황+청록·은색 단색·띠 무지개·남색·회색+라임·흰 얼음·나무 선·슬레이트 도시(`src/ui-next/gallery/picks.ts`). 사용자 장면(이름 있는 것·Untitled)은 넣지 않았다.
  - 작성자 표기 "Sandlab": 팀이 이름 없이 올려 D1 creator_name이 비어 있다 → 갤러리 카드는 picks.ts로, 홈 진입 부제는 `isSandlabPick(id)`일 때만 'Sandlab'으로 채운다(사실과 같다).
  - 썸네일: 서버 썸네일이 아니라 **로컬 실엔진 캡처**(프리뷰 홈 `/#s=<id>`를 헤드리스 Metal WebGPU로 열어 1.5초 돌린 우물) → webp 640×320, 개당 3.4~19.1KB(≤ 20KB 테스트 고정). 재생성 `scripts/capture-wall.cjs`.
  - 한계: 색조가 무지개처럼 고르게 퍼지지는 않는다 — 재료 팔레트가 따뜻한 쪽(용암·나무·불)과 차가운 쪽(물·얼음)에 몰려 있고 보라·빨강 장면이 갤러리에 없다. "이웃끼리 겹치지 않게" 순서로 보완.
- **정렬 Hot·New·Top = 기존 API만**: Top은 작품 순위가 아니라 `/api/creators/top`(표를 많이 받은 작성자) → 누르면 그 사람 작품(`?creator=`). 전 기간 작품 순위 API는 만들지 않았다(워커 변경은 필드 추가만이라는 범위). 옛 갤러리의 Yours(내 작품·표 델타)는 이번 화면에 없다 — 컷오버(P12) 전 이식 필요.
- **라이브 캔버스 ≤ 1**: 부모가 `live` 하나({key, via})만 들고(`nextLive`·`endLive` 순수 함수), LiveCanvas가 그 한 점에만 SandEngine을 띄운다. **key = 구역+id**(`pick:`·`all:`) — 큐레이션 장면이 아래 목록에도 같은 id로 나오므로 id만 쓰면 두 액자가 같이 켜진다(독립 리뷰 차단 1, 반영). 데스크톱은 마우스를 0.3초 올려 두면 재생·벗어나면 정지, hover 재생 중 Play를 누르면 멈춤이 아니라 고정(리뷰 3). 터치는 제목 줄 오른쪽 Play(44×44, 그림을 가리지 않음). reduced-motion이면 hover 자동 재생 없음(버튼은 허용), WebGPU 없거나 init이 한 번 실패하면 Play 버튼을 거두고 남은 hover 타이머도 무시(리뷰 4), 1200×600이 아닌 옛 장면은 Play 없음(리뷰 2), 화면 밖·탭 숨김·GPU 손실이면 스스로 멈춤. 아래 목록에서도 팀 큐레이션 장면은 "by Sandlab"(리뷰 5).
- **투표**: 기존 voteScene(브라우저당 1회). 프리뷰는 `PREVIEW_READ_ONLY`로 버튼 disabled + 한 줄 "Voting is off in this read-only preview."(aria-describedby). **More**(무한 스크롤 아님): 누른 뒤에만 아래가 늘어난다, 새 업로드로 offset이 밀려 같은 id가 다시 오면 버린다(`appendPage`).
- **광고 안내판 없음**: /gallery는 verify-ads 허용 목록 밖(라이브 캔버스 화면). AdPlate를 넣지 않았다.
- **헤더 데일리 pill(P3 셸)**: 보이는 글자 `Daily · 06:12`(번호는 접근 이름으로), 접근 이름 `Daily · 06:12, puzzle No.43, 6 hours 12 minutes left` — 보이는 글자로 시작(label-in-name). P6 3초 테스트 3/5 "No.42 00:52가 뭔지 모르겠다" 반영. 칸 폭 12ch → 13ch(시간이 채워져도 폭 고정, CLS 0).
- 버린 안: 큐레이션을 `#g=` 문자열로 저장(장면 크기 따라 URL 예산 초과·홈 진입이 'A scene someone shared'로 제목 없음), 새 업로드(지시: prod D1 쓰기 금지), 정렬 Top을 위해 `sort=top` API 추가(범위 밖 — 필요하면 별도 PR), 썸네일 위 Play 버튼(작은 2열 카드에서 그림의 1/4을 가림).

## 2026-11-20 리디자인 P10 글 페이지 — 셸 치환 방식·본문 서체(실측)·광고 자리·AdSense 단위 연결
- **치환 방식 두 갈래**: ① 데이터로 그리는 글(Learn 글·레벨 공략·재료 목록·재료)은 `@ui-shell` 전용 화면(LearnArticle·GuideArticle·MaterialsIndex·MaterialPage, `src/ui-next/content/`)이 page.tsx가 넘긴 **같은 데이터**로 그린다. JSON-LD는 page가 객체 하나를 만들어 두 빌드가 같이 쓴다. ② 손으로 쓴 산문(About·Privacy·Terms·Contact·Learn 허브·404)은 ContentShell이 `ContentFrame`(classic null)으로 넘기고, **같은 JSX에서 옛 다크 인라인 style만 걷어낸다**(`stripStyles`, React.Children + cloneElement — id·href·aria·글자는 그대로). 문장을 두 벌로 복사하지 않고, P4의 `!important` 덮어쓰기도 쓰지 않는다. Learn 허브만 `kind="index"`(ContentShell prop, prod HTML 영향 없음)로 글 카드.
- **새 셸이 더한 글자는 `data-sl-chrome`**: 목차 제목 "On this page", 이전/다음 라벨, Learn 글·재료의 이전/다음 카드(prod에 없던 탐색), 광고 라벨. 파리티 검사(`scripts/qa/content-parity.mjs`)는 이걸 빼고 prod와 단어·링크 수·순서를 대조한다(35쪽 전부 같음).
- **본문 서체 = 시스템 산세리프(제목만 Bricolage 700)**. Lighthouse 모바일 6쪽 × 3회 중앙값(로컬 정적 서버, 기본 throttling): 시스템 본문 4.46~5.22s vs Bricolage 400 본문 4.76~5.09s — 차이는 측정 잡음 범위(±0.3s), 폰트 파일은 헤더가 이미 3개를 받아 바이트 차이 0. 갈린 것은 CLS: Bricolage 본문은 /about에서 swap 재배치 0.011, 시스템은 0. 긴 글(1,500~1,900단어)의 가독성도 시스템 쪽. P3 이전(옛 다크 본문) 기준선 4.71~5.51s와 같은 수준 → LCP 2.5s 게이트는 이 PR이 아니라 P11(렌더 차단 CSS·JS)에서 다룬다.
- **광고 자리(S11)**: 글 페이지마다 본문 중간 1곳(가운데 섹션 뒤 / 산문은 가운데 h2 앞 / 재료 목록은 Powders 뒤 / 재료는 본문 문단 뒤) + 글 끝 1곳(article 뒤, 이전/다음 위). 둘 다 AdPlate(간격 32px, 'Advertisement', 다른 면). 광고 로더 없는 페이지(Learn 허브·정책 페이지·404)는 자리 0. 글 안 라이브 데모(캔버스)는 지금 없음 — 생기면 광고와 24px+·동시 라이브 1개 이하.
- **AdSense 단위(오너 11-20 생성, docs/team/adsense-units.md)**: `play` 9581379414(300×250), `contentMid` = 고정 크기 **단위 2개를 800px에서 갈아 끼움** — 320×100 6955216070 / 728×90 5642134405(마운트 뒤 맞는 쪽 ins 하나만 DOM에 — 리뷰: push는 첫 미처리 ins를 채운다. 768이 아니라 800인 이유 = 데스크톱 스크롤바 15px 포함 768~790에서 728이 열을 넘침), `contentEnd`(300×250)는 단위 없음 → null(렌더 0). 반응형 단위는 쓰지 않는다(고정 높이 예약·overflow hidden이라 잘림 = 정책 위험). 새 셸(프리뷰)에서만 렌더, prod 화면 변화 0, 재심사 신청 금지.
- **컷오버(P12) 주의**: 승인 전에 새 셸을 prod로 내보내면 빈 안내판이 보인다 — 그 시점 승인 상태로 AD_SLOTS를 비울지 결정.
- 버린 안: 산문 페이지도 전용 화면으로 문장 복제(문장 두 벌 = 드리프트), 본문 Bricolage(LCP 이득 0·CLS 0.011), contentMid를 반응형 단위 1개 + CSS 크기 지정(오너가 고정 단위 2개를 만듦), 목차를 모든 글에(섹션 3개 미만이면 숨김).

## 2026-11-20 북극성 문서 + 오너 승인 A~H 배치 (오너 지시, 제품 전략)
- 맥락: 오너 "개별 사이트의 방향성을 잘 설정하고 팀 모든 인원이 그대로 나아가길". 스승님 제안 A~H(허브 mentor/lydia-hallie.md 7장)는 오너 "다 추천대로" 승인.
- 선택: `docs/team/NORTH-STAR.md`(90일, 11-20~02-17). 북극성 = **주간 손댄 방문자**(첫 획 또는 퍼즐 시작한 고유 기기). 유입이 하루 약 5세션이라 데일리 클리어 하나로는 병목(유입)을 못 본다(그로스 리뷰) → 데일리 클리어·외부 유입·첫 붓기율은 보조. 1단계 측정 PR로 `trackEvent`에 익명 기기 id와 첫 획 이벤트를 넣는다. 목표는 12-04 기준값의 배수.
- 연결: SESSION-GUIDE 맨 위 북극성 박스, 끝난 최우선 박스 2개(11-19 UI·UX 전면 교체 → 진행 중 박스에 흡수, 11-18 챌린지 UI 개편 → 리디자인 P4·P5·P7로 완료)를 걷고 스승님 원칙 박스는 0장 아래 절로 옮김(G), 루틴 설명을 7교대로, 시작 시 NORTH-STAR 확인, 20시 요약 첫 줄 북극성 값, OPERATING 일일 출시 원칙에 B 조정. B는 큰 기능·컷오버에만(새 레벨은 spill:verify·솔버 클리어율).

## 2026-11-20 리디자인 P9b 갤러리 후속 — Yours 탭·작성자 링크·원본 링크·올린 시각·하단 Ko-fi 글줄 이식(프리뷰 전용)
- **원칙(스승님 '길은 하나')**: 옛 GalleryBrowser의 기능을 새 벽(GalleryWall)에 빠짐없이 옮겨 P12 컷오버 때 옛 파일을 지울 수 있게 한다. 이번엔 옛 파일을 지우지 않는다(prod가 아직 classic).
- **Yours = 옛 탭 그대로**: 출처 localStorage `sandlab.mine`(listMine) → id마다 `GET /api/scenes/:id?meta=1`(getSceneMeta), 지워진 장면은 건너뜀. 델타는 기준선 갱신 전에 계산(mineDeltas) → updateMineSeen. 새 API·새 키 0. 자기 작품엔 투표 버튼 없이 표 수만(옛 동작). 탭 순서도 옛 순서(Hot·New·Yours·Top).
  - 다른 탭으로 넘어간 뒤 늦게 도착한 응답은 기준선을 갱신하지 않는다(요청 번호 확인) — 옛 코드는 갱신했다(보지 않은 증가분이 사라지는 작은 버그, 새 쪽만 고침).
  - 증가분 줄 문구는 옛 배지와 같고 앞의 화살표 글리프만 `next` 아이콘(위로 회전)으로 바꿨다(R8). 합계·증가분 줄은 두 줄 자리를 먼저 잡아 CLS 0.
  - 프리뷰(읽기 전용)에서는 투표 안내 대신 "Publishing is off in this read-only preview, so nothing new will show up here." — 프리뷰에선 새 게시가 막혀 Yours가 늘지 않는다는 사실.
- **옛 카드 기능 중 P9에 빠져 있던 것도 같이 옮김**(대조표 작성 중 발견): 작성자 이름 → 그 사람 작품 + 서버 집계 줄(`/api/creators/:id`, 옛 작성자 화면 머리 문구), 리믹스 원본 링크("Original", 홈 리믹스 배너와 같은 말), 올린 시각(옛 ago() 구간). 작성자 줄은 44px 한 줄로 고정해 카드 높이가 같다(빈 액자 캡션 122 → 144).
- **하단 글줄 = 옛 문구·링크·순서 그대로**("Made by Piousangel · About · Learn · Privacy · Terms · Contact · ♥ support", Ko-fi 새 탭 + `kofi_click` 계측). `♥`는 R8 기호 블록이지만 문구의 일부라 `lint-ui-allow`(지시: 텍스트 변경 금지). gallery.test가 옛·새 SSR에서 글줄 문구·href를 대조한다 — 갈라지면 실패(컷오버 때 같이 지움).
- **검사 승격**: P9 스크래치 e2e를 `scripts/qa/gallery-e2e.cjs` + `scripts/qa/lib.cjs`로 올리고 `pnpm qa:gallery`로 등록(playwright·axe-core는 NODE_PATH, CI 연결은 오너 결정 C 대기). 로컬 시드는 로컬 wrangler dev에만(주소가 localhost가 아니면 멈춤), 업로드 한도는 사설 IP 헤더로 비켜 간다.
- 독립 리뷰 8.5/10(차단 0) 반영: Yours 조회가 전부 실패하고 이유가 404(지워진 장면)만이 아니면 빈 상태 대신 "Couldn't reach the wall · Try again"(`isGone`), 작성자 화면 돌아가기 라벨 = 들어온 정렬("Back to Hot"·"Top makers"), 작성자 이름은 서버 집계 이름 우선, 하단 링크 간격(min-width 대신 padding), 합계 줄 aria-live 제거(증가분 줄만 status), 작성자 버튼 title 제거. 미반영: Yours 작성자 화면 Vote(단건 meta에 creatorId가 없어 Yours 카드엔 작성자 버튼이 없음 — 일어나지 않음), Ko-fi 새 탭 sr 문구(문구 변경 금지·옛 쪽도 없음), 지워진 장면 수만큼 빈 액자가 남는 미세 이동(실측 CLS ≤ 0.0003).
- 버린 안: 옛 소개 문단(SEO용 정적 문단)을 새 벽에 다시 넣기 — P9가 lede + 정렬별 설명으로 바꾼 결정이라 이번 범위 밖(P12 SEO 점검 때 단어 수 비교). 카드 hover "Remix" 배지 — 새 벽은 작품을 열면 홈에서 바로 이어 붓는다(P6 진입), 같은 행동이 한 번 클릭 거리.

## 2026-11-20 PR 단계 CI 도입, 만성 실패 테스트 0 (오너 승인 제안 C)
- 맥락: `verify.test.ts`가 늘 타임아웃이라 배포·검증 관문에서 `--exclude`로 빠져 있었고, spill:verify는 CI에서 22분 걸려 배포에서 빠져 머지 전 검사가 루틴 손에만 있었다. 허브 docs/team/mentor/lydia-hallie.md 7장 통합 목록 C를 오너가 11-20 승인.
- 원인 분류(11-20 main, Node 22): 7건(로컬 load 45) / 3건(CI) 전부 **부하 타임아웃** — 결정적 시뮬을 끝까지 도는 테스트(sweep Steam vs vent 16 salt: CI 49초·로컬 236초, verify.test beforeAll 훅 10초, sim fuse·dig candidates·replay·transform·cases 결정성 5초). 진짜 버그·시간 의존·낡은 기대값 0.
- 선택: vitest를 **unit(기본 한도)·sim(결정적 시뮬 파일, 한도 CI 3분·로컬 15분)** 두 프로젝트로 나눴다(vitest.config.ts SIM_TESTS). `pnpm test`는 둘 다(제외 없음), CI는 두 job 병렬. sweep.test는 케이스×salt마다 테스트 하나로 쪼갰다(7×16 조합 그대로, 한 테스트가 수 분 걸리던 구조 해소). `scripts/spill-verify.ts`에 `--exclude`를 넣어 CI에서 1-8 Cascade(전체 시뮬의 절반 이상)와 나머지를 두 job으로, `--workers 4`(러너 vCPU 전부, 기본은 cpus-2=2라 예전 22분). 갤러리 API는 `wrangler dev --local`(로컬 D1, 계정 불필요)로 CI에서 verify-gallery.py까지 돈다.
- 버린 안: 무거운 테스트 skip·salt 수 축소(검증 범위 축소), 전역 testTimeout 상향(가벼운 테스트의 느려짐까지 숨김), spill:verify를 1 job(벽시계 15분 초과).
- 남은 것: 브랜치 보호에 CI 필수 체크를 켜는 것은 오너 할 일.

## 2026-11-20 리디자인 P11a — Lighthouse 기준선 정정(압축 서빙), 선택 관 한 번 붓기 게이트, 툴바 로빙
- **정정**: P10 기록의 "글 페이지 LCP 4.5~5.2s, 게이트 미달"은 압축 없는 로컬 서버에서 잰 값이다. Lantern(모의 스로틀링)은 기록된 전송 바이트로 다운로드 시간을 잡아 무압축 JS·CSS를 2배로 센다. 같은 프리뷰(main 7e3a1b1)를 압축 서빙하면 글 페이지 2.1~2.3s, /daily 2.1s, /play 2.26s로 게이트를 통과한다. **실제 미달은 3곳**이다: `/`(LCP 3.27s, 헤드리스는 WebGPU 어댑터가 없어 정지 프레임 경로이고 이미지 발견이 늦다), `/play/1-1`(CLS 0.073, 보드 유리 크기를 JS가 정함), `/gallery`(LCP 2.65s). → P11b.
- 측정 도구 = `scripts/qa/lighthouse.mjs`(압축 정적 서버 + 중앙값 홀수 회 + exit 0 통과/1 게이트 미달/2 측정 실패). 렌더 차단 CSS(next.ts가 7개를 한 묶음으로)는 범인이 아니었다 → 셸 CSS 분할은 하지 않는다.
- **붓기 게이트**: reduced-motion + Save-Data만. `hardwareConcurrency ≤ 4`(S7 원문)는 버린다. WebKit은 코어 8개 미만이면 늘 4를 돌려줘 모든 iPhone이 꺼지고 저가 안드로이드(8)는 켜진다. 거꾸로 거른다. 누른 뒤 300ms 안에 디코드까지 끝나야 재생한다(늦게 혼자 움직이는 관 0). 첫 획 전에는 스트립을 받지 않는다.
- **키보드**: 재료 18관과 엄지 도크(5)를 WAI-ARIA toolbar 로빙으로 바꿨다(정지점 1개씩). radiogroup은 버렸다. 화살표가 곧 선택이라 18관을 지나며 재료가 바뀌고, Erase의 '선택 없음'을 나타낼 수 없다.
- **미지원 홈 LCP**: 조건부 preload(`!('gpu' in navigator)`)는 버렸다. 헤드리스와 안드로이드 '어댑터 없음' 기기는 `navigator.gpu`가 있다. 우물 SSR 포스터도 버렸다. GPU 사용자에게 "쌓인 모래 → 빈 유리 → 데모" 모순이 생기고 LCP 이득도 0이다.

## 2026-11-20 리디자인 P11b 성능·접근성 마감 — 셸 영역 치환·포커스 링·광고 꺼짐 스위치·qa:preview
- **LCP 원인(측정 먼저)**: 프리뷰는 `@ui-shell`을 한 파일(next.ts)로 치환해, 그 파일이 import하는 모든 화면(홈 엔진·갤러리·HUD)과 CSS 9개가 **모든 페이지**에 실렸다 — 글 페이지에 WebGPU 엔진 청크, CSS gzip 12KB, JS gzip 164KB. Lighthouse 시뮬(Lantern)은 관측 LCP 전에 요청된 요청(비동기 JS 포함)을 모두 그래프에 넣으므로 바이트가 곧 LCP였다(압축 서빙 정정은 P11a).
- **선택: 사용처(issuer)별 영역 치환**(next.config.ts `SHELL_AREAS`, `src/ui-next/shell/area-*.ts` 7개 — root·content·home·gallery·play·spill·daily). layout은 토큰·셸 크롬 CSS·서체만, 페이지는 자기 화면만. 글 페이지 JS 164 → 113KB, CSS 12 → 5KB(gzip), 엔진 청크 0. 표에 없는 사용처는 **프리뷰 빌드가 멈춘다**(조용히 다시 무거워지지 않게) + shell.test가 사용처·이름 대조. 모듈 식별자(request·userRequest·rawRequest)까지 바꿔야 영역들이 한 모듈로 합쳐지지 않는다. 영역 파일은 classic.ts와 같은 폴더(치환된 모듈의 상대 import가 classic.ts 폴더 기준으로 풀린다 — 하위 폴더에 두었다가 빌드 실패로 확인). issuer는 realpath일 수 있어 dir·realpath(dir) 두 기준으로 찾는다(리뷰). prod는 플러그인 자체가 없어 무변경.
  - CSS 순서가 페이지 단위로 바뀐다(영역 import 순서). 영역 CSS끼리 겹치는 선택자 0(리뷰 확인). 홈 '벽이 비었을 때' 링크 밑줄이 살아났다(`.sl-shell a` vs `.sl-wall-empty a` 같은 특이도 — 작성 의도는 밑줄). 그 밖의 13쪽 × 390·1440 픽셀 차이 0.
  - 버린 안: `@ui-shell/<영역>` 경로로 페이지 import 바꾸기(prod 페이지 파일·청크가 바뀜), `optimizePackageImports`(패키지 전용·배럴에 CSS 부작용), CSS를 각 컴포넌트로 옮기기(순서 보장 없음).
- **홈 이미지 바이트**: 아틀라스 image-set(배율 ≤ 2 = `atlas-2x.webp` 384² 9.7KB, 3 = 원본 39KB). 선택 관 붓기 스트립은 랙 크기 `rack/<slug>.webp`(프레임 = 유리 32×64 @2x, 12.3~18.9KB ≤ 20KB, `capture-posters.mjs --rack-only`로 strips/에서 생성)로 바꿨다 — P11a는 캡처 원본 strips/(32~68KB)를 받았다. 붓기 규칙(한 번 재생·게이트)은 P11a 그대로.
- **Spill 플레이 넓은 화면 CLS 0.134 → 0**: SSR은 390×844 배치라 900px 이상에서 하이드레이션 때 배치가 통째로 바뀌었다. 새 HUD(Frame)는 마운트 표시(data-ready) 전 900px 이상에서 `visibility:hidden`, JS 없으면 `<noscript>`로 푼다. 대가: 데스크톱 첫 그림이 하이드레이션까지 비어 있다(모바일은 그대로 보임) — 데스크톱 LCP는 qa가 재지 않는다(리뷰 지적, 기록).
- **포커스 링 3곳(진짜 결함)**: 현재 페이지 내비(`.sl-nav-link[aria-current]` 밑줄 그림자), 글 페이지 주 행동·이전/다음 카드(`.sl-cs-cta`·`.sl-cs-pn-card`), Spill RUN(`.sl-sp-run` 들림 그림자)이 같은 특이도의 `:focus-visible` 링을 덮어 키보드 포커스가 안 보였다. 각 CSS 끝에 `:focus-visible` 규칙. qa keys는 '포커스 있을 때와 없을 때 모양이 달라야 링'으로 잰다(장식 그림자만 있는 요소가 통과하지 않게 — 리뷰 반영, 전환 효과 끄고).
- **키보드**: 목차·이전/다음·힌트 details·코드/표 스크롤 영역은 Tab으로 닿고(details는 Enter로 열림) 링이 있다 — qa keys가 15쪽 전부 순회. 홈 로빙은 P11a(관 줄·도크 정지점 1개).
- **광고 꺼짐 스위치(허브 `siteConfig.adsenseEnabled`와 같은 규칙)**: `ADS_ENABLED = false`(src/ui-next/ads/config.ts) — AdSense 승인 전에는 AD_SLOTS에 단위가 있어도 **안내판 DOM 0**(정적 HTML·마운트 뒤 모두). 컷오버(P12)에도 이 상태로 나가 빈 'Advertisement' 판이 안 보인다. 승인되면 이 한 줄만 true(고위험, 리뷰 2회). 광고 로더(심사 자격용)는 그대로. 로더가 스스로 넣는 숨은 ins(`adsbygoogle-noablate`, display:none)는 우리 DOM이 아니다.
- **검사로 만들기**: `pnpm qa:preview`(scripts/qa/preview.mjs) = weight(엔진 청크 양성 대조 포함)·a11y·keys·loop·ads·lcp(+상호작용 지연 3회 중앙)·contrast, `--fps` 선택. 도구(playwright·axe·lighthouse)는 package.json 밖 `node_modules/.cache/sandlab-qa`에 고정 버전 자동 설치(NODE_PATH 불필요). P12 컷오버 게이트에서 그대로 다시 돈다. P11a의 `scripts/qa/lighthouse.mjs`·`home-rack-e2e.cjs`는 단독 도구로 남긴다.
- **LCP 결과(Lighthouse 모바일 3회 중앙값, gzip 서버)**: P10 main(209b09b, load 38) → 이 PR(load 7~18): 홈 2977→2631, /daily 2927→2556, /play 2760→2410, /gallery 2980→2732, Learn 글 2586→2175, 재료 2571→2188, 레벨 공략 2593→2170ms. CLS 전부 ≤ 0.037, 상호작용 지연(CPU 4배) 32~64ms. **못 맞춘 3쪽**: ① /daily(2556) — 정적 HTML이 "Loading today's challenge…"뿐(날짜를 클라이언트가 고름)이라 LCP가 하이드레이션 뒤 → DailySpill 미정 상태를 새 셸 시작 화면 뼈대로 SSR(prod 컴포넌트 수정 → P12). ② /gallery(2732) — 첫 화면 벽 webp 4장이 CSS보다 먼저 요청되고 LiveCanvas 엔진이 정적 import → 벽 이미지 lazy·엔진 동적 import. ③ 홈(2631) — 프레임워크 JS 100KB + 홈 68KB + 서체 3개 48KB가 관측 LCP 전에 요청 → 공유 시트·녹화 동적 import, 서체 서브셋 축소(S8 재측정).

## 2026-11-20 오늘 방문자: 워커 + D1 일별 고유 방문자 카운터 (오너 "today 방문자 나왔으면 좋겠어")
- 선택(오너): 사이트에 공개 표시 + 아침 메일·20시 요약에도. 허브(minigames-hub)와 같은 방식.
- 집계 방법 비교
  - (a) Cloudflare 분석: 존 uniques는 지표 토큰으로 읽히지만 **봇 포함** — 공개하면 부풀린 숫자다. AE `sandlab_events`는 일부러 per-user 식별자를 싣지 않아(워커 track 주석) 고유 방문자를 낼 수 없다.
  - (b) **채택**: 사람이 연 페이지의 JS 비콘(LandingBeacon → `POST /api/visit`, 브라우저(localStorage)·UTC 날짜당 1회, `navigator.webdriver`면 안 보냄)을 워커가 D1에 센다. 같은 UTC 날 같은 IP 1회(IPv6는 /64), 봇·스크립트 UA·빈 UA 제외, 같은 사이트 요청만(Sec-Fetch-Site same-origin 또는 Origin 일치 — curl 한 줄 부풀리기 문턱, 위조는 가능). 프리뷰 워커는 READ_ONLY 가드가 POST를 403으로 막아 세지 않는다(표시는 같은 D1 숫자). NAT 공유는 1명으로 덜 세고, 한 사람이 하루에 네트워크를 바꾸면 2명으로 셀 수 있다(IP 기준의 한계, localStorage 1회 비콘이 일부 줄인다). 비용: 새 방문자당 D1 쓰기 2, 읽기는 엣지 60초(키에 UTC 날짜) + isolate 15초 캐시, 지연 최대 약 2분. 화면은 응답 day가 지금 UTC 날짜가 아니면 쓰지 않는다.
- 개인정보: IP 원문 미저장. `visit_seen(day, h)`의 h = HMAC-SHA256(키 = VISIT_SALT|그날 무작위 솔트, IP 셀) 앞 16바이트. 다음 날 첫 방문 때 지난 날 솔트 NULL(먼저) + 해시 행 삭제(솔트가 NULL인 지난 날 늦은 요청은 세지 않는다) → `visit_days(day, visitors)` 숫자만 남는다. VISIT_SALT(선택 시크릿, 11-20 현재 미설정 — 오너 할 일)가 없어도 솔트가 날마다 무작위라 다음 날부터는 되돌릴 수 없다(그날 안에는 D1 접근권자가 IPv4 전수 대입 가능 — 시크릿 설정 시 불가). 기존 votes·scenes의 무솔트 IP 해시와는 별개.
- D1: `migrations/0002_visitors.sql`(새 표 2개, 추가 전용·멱등, 기존 표 무변경, DROP 두 줄로 되돌림). deploy.yml에 배포 전 원격 적용 단계를 새로 둔다(`--command` 일반 쿼리 경로, 실패해도 배포 진행 — 표가 없으면 세지 않고 홈 줄은 빈 줄). 저장 형식이 새로 생기므로 독립 리뷰 2회.
- 공개 표시: **prod 홈(옛 SandCanvas)도 바뀐다** — 데스크톱은 캔버스 위 헤드라인("Sandlab / Pour sand…") 아래 한 줄(첫 획 전까지 보임), 세로 폰은 링크가 ☰로 접히는 폭(400 미만)에서만 44px 헤더의 브랜드 옆(헤더 높이 그대로, 넘치면 말줄임 — 400~899 세로는 링크 5개가 펼쳐져 자리가 없어 표시 안 함). 프리뷰 새 셸은 Today 카드의 Solve today 아래 한 줄(높이 20px 예약). 문구: 10 이상 "N visitors in the lab today · since 00:00 UTC"(폰: "N visitors today (UTC)"), 1~9는 "A few visitors in the lab today"(폰: "A few visitors today (UTC)"), 0은 빈 줄. 홈에는 광고가 없다(verify-ads 허용 목록 밖).
- 보고: daily-metrics에 '방문자(UTC, 사이트 집계): 어제 N / 오늘 지금까지 N' + 7일 줄. OPERATING 0-1-6·SESSION-GUIDE 06시·20시 메일 형식에 같은 줄.
- 첫날(11-20) 숫자는 배포 시각부터라 하루치가 아니다.

## 2026-11-20 저장소 안전 설정 커밋 — 되돌릴 수 없는 명령만 deny + hook(exit 2) (오너 승인 제안 E, 고위험)
- 맥락: 금지 목록(main 직접 푸시·force push·직접 배포·D1 쓰기)이 SESSION-GUIDE 문장뿐이었다. 스승님 원칙 H3·H6, 오너 11-20 "다 추천대로". 문서 대조 메모·로컬 실측은 허브 docs/team/mentor/lydia-hallie.md 7장 'E 실행 기록', 상세 결정은 허브 DECISIONS 같은 날 항목(같은 파일을 두 저장소에 둔다).
- 선택: `.claude/settings.json` 정적 deny + PreToolUse(Bash) `scripts/hooks/guard-bash.mjs` + Stop `scripts/hooks/stop-unsaved-work.mjs`(클라우드에서만, 저장 안 된 작업이 있으면 한 번 막음).
- 샌드랩 절차 대조: `wrangler d1 execute sandlab-gallery --local …`·`wrangler dev --local` 통과, 원격 D1 **읽기**(`--remote --json --command "SELECT …"`) 통과, 원격 D1 쓰기(`--remote --yes --command "DELETE …"`·`--remote --file=schema.sql`)는 막음 — 지금까지도 오너가 직접 쳤다(handoff 710행). 앞으로는 오너가 Claude Code 밖 터미널에서 친다(`!` 입력에 hook이 걸리는지는 확인 안 함). 로컬 `pnpm run deploy`·`deploy:preview`는 막음(deploy.yml·deploy-preview.yml이 main 머지 때 함). `sandlab-daily` 스킬의 배포 단계를 'PR 머지 → deploy.yml 확인'으로 고침.
- 독립 리뷰 2회 반영(상세는 허브 DECISIONS 같은 날 'E' 항목): 작은따옴표 안 인용 오탐 수정, `.gitignore`에 `.claude/worktrees/`·`*.log`·`play-result.png`(Stop hook이 worktree·wrangler-dev.log·QA 캡처를 '커밋 안 된 파일'로 세던 것), **deploy.yml 배포 job을 main ref에서만**(수동 실행으로 리뷰 안 된 브랜치가 프로덕션에 가던 구멍), `.env`·`.dev.vars` Read 규칙을 모든 깊이로, Stop hook이 stash·모든 로컬 브랜치를 셈. 프리뷰(`deploy-preview.yml`)는 READ_ONLY라 그대로 둠.
- 같은 PR: `.claude/handoff/main.md`의 "레포 (private)" 두 곳을 공개 저장소로 정정(gh repo view: PUBLIC). `.claude/team/references/monetization.md`의 '비공개 저장소' 전제(그랜트 자격 판단)는 당시 조사 기록이라 손대지 않았다 — 공개 저장소가 되어 Cloudflare Project Alexandria 자격 판단이 달라질 수 있다(오너 확인 거리).

## 2026-11-20 공통 BottomSheet 이식 — 메뉴·홈 공유 시트를 끌어 닫는 시트 하나로, 결과 화면은 모달이 아님 (오너 "손잡이를 끌어 닫을 수 없고 배경 탭만 된다 — 모든 부분을 사용자 친화적으로")
- 맥락: 허브 PR #218(공통 BottomSheet)을 샌드랩에 옮긴다. 전수(`role="dialog"`·`aria-modal`·`<dialog>`·`showModal`): 프리뷰 메뉴 시트(ShellHeader·Spill HUD 공용)·홈 공유 시트가 손으로 만든 `<dialog>`(손잡이·끌기·뒤로 가기 없음), 프리뷰 결과 화면 `SpillResult`·prod 결과 카드 `ResultCard`·안 쓰는 `ChallengePlayer`가 `role="dialog"`만 달고 Esc·가둠이 없었다.
- 선택: `src/ui-next/sheet/BottomSheet.tsx`(+ `sheetGesture.ts` 순수 규칙, 허브와 같은 숫자 — 25% 또는 0.5px/ms 튕김, 판정 6px, 열기 280·닫기 240·복귀 300ms, 768px 이상 카드). 허브 리뷰에서 고친 함정(닫기 연타 이중 history.back, 바꿔 끼울 때 스크롤 복원, touchmove 4px 누적, 열리는 중 닫기·끌기, IME 조합 중 Esc)을 처음부터 넣었다. 메뉴는 768px 이상 '메뉴 버튼 아래 오른쪽' 카드(P3 자리 유지, `placement="menu"`), 공유는 가운데 카드.
  - **메뉴 링크 SSR 유지**: 닫힌 `<dialog>` 안 링크가 SSR HTML에 있던 것을 지키려고 `keepMounted`(닫히면 같은 내용을 `hidden` div로) — content-parity 35쪽 0 차이.
  - **시트 안 링크 = 닫은 뒤 전체 이동**(`api.close(() => location.assign(href))`). 그냥 이동하면 시트의 history 칸이 남아 다음 페이지에서 뒤로 가기가 한 번 먹지 않는다. doc 링크도 전체 이동으로 — `useRouter`는 앱 라우터 밖(renderToStaticMarkup 테스트)에서 던지고, 전체 이동은 nav.ts가 늘 안전하다고 한 길. 대가: About·Privacy·Terms·Contact·Learn을 메뉴에서 열 때 클라이언트 이동 대신 새 문서(정적 HTML이라 차이 작음).
  - **홈 공유 주소는 닫힌 뒤에**: 예전엔 시트가 열린 채 `history.replaceState(null, '', #g=…)`. 시트가 history 칸을 넣으면 그 칸의 주소만 바뀌어, 닫을 때 history.back이 옛 주소로 되돌리고 `#g=` 링크로 들어온 경우 hashchange → **새로고침으로 작업이 날아간다**. 그래서 만든 주소를 들고 있다가 onClose(원래 칸으로 돌아온 뒤)에 replaceState(history.state 유지). 링크를 만드는 중에 닫으면 늦은 결과는 버린다(주소창 그대로), 발행은 닫힌 뒤 끝나도 바로 반영.
  - 공유 입력칸 글자 13 → 16px(iOS 포커스 확대).
- **결과 화면은 모달이 아니다**: `SpillResult`는 헤더(뒤로·소리·메뉴)가 살아 있는 화면이라 `role="dialog"`를 떼고 이름 붙은 region으로(가둘 것도 닫을 것도 없다 — 시트로 바꾸면 P5 액자 화면 설계가 바뀐다). 판 위 덮개는 UX 체크리스트 2항 예외로 문서화.
- **prod 무변경**: `ResultCard`(prod 결과 카드)·`ChallengePlayer`(DailyPlayer와 함께 어디서도 import 안 함)는 손대지 않았다 — prod out/ 210파일 main과 동일(빌드 id만 다름, 같은 폴더 빌드). 둘 다 P12 컷오버 때 지울 대상이라 sheet.test의 LEGACY 목록에만 있다(새 항목 금지).
- 검사로 만들기: `src/ui-next/sheet/sheet.test.tsx`(손으로 만든 모달 표식이 생기면 실패 + 양성 대조), `scripts/qa/sheet-e2e.mjs`(= `pnpm qa:preview --only sheet`) 12항목 + 390 UX 감사(44px elementFromPoint·입력 16px·확대 막음·가로 넘침, 양성 대조). 체크리스트 `docs/team/UX-CHECKLIST.md`.
- 버린 안: 결과 화면을 시트로(위 이유), `<dialog>` 유지 + 끌기만 덧붙이기(뒤로 가기·history·스크롤 잠금·inert를 다시 짜야 하고 허브와 두 갈래가 된다), prod ResultCard에 Esc 붙이기(prod diff·컷오버 때 사라질 코드).

## 2026-11-20 북극성 측정 — 익명 기기 id(AE blob5)·first_stroke·홈 landing 표시 (16시)
- 맥락: NORTH-STAR 2장 북극성(주간 손댄 방문자)·보조 3(첫 붓기율)이 '측정 없음'. 4장 1단계 측정 PR(11-27까지, 16시 몫).
- 선택: 허브 `hit.ts`와 같이 브라우저 무작위 UUID(localStorage `sandlab.did`)를 `/api/track` 본문 `d`로 보내고, 워커가 형식(`/^[a-z0-9-]{8,40}$/`)만 보고 AE blob5에 싣는다(D1 쓰기 없음). 손댄 = `first_stroke`(홈 샌드박스 탭당 1회, 지우개·autoplay·webdriver 제외) ∪ `challenge_start` ∪ `daily_start`의 7일 distinct blob5. 첫 붓기율 = first_stroke ÷ landing(value 1 = `/` 진입), 둘 다 세션 단위. `?ref=threads`·threads.net/com referrer 분류 추가. Privacy 페이지에 기기 id 고지.
- 버린 안: IP 해시로 기기 대신(모바일 IP 공유·변동으로 과소·과대, /api/visit과 중복), D1 테이블(쓰기 = 고위험, AE로 충분), 쿠키(동의 배너 필요).
- 한계: 측정 전 이벤트는 blob5가 비어 7일 창이 차는 11-27까지 값은 '부분'. 첫 붓기율은 홈 landing으로 시작한 세션만(first_stroke·landing 모두 value 1) — 다른 페이지로 들어와 홈에서 부은 세션은 북극성에만 잡힌다. WebGPU 없는 기기는 분모에만 있다(gpu_unsupported 값과 나란히 볼 것). `daily_start`는 /daily 마운트 때 나가므로 '데일리 화면을 연 기기'에 가깝다(퍼즐 정의 변경은 기존 지표와 끊기므로 이번엔 유지). 봇 UA·webdriver·autoplay는 기기 id·landing·first_stroke에서 뺀다.
- 리뷰(독립 1회): 차단 0, 수정 권고 3(분자·분모 세션 불일치 → value 1 통일, 크롤러 id 남발 → 봇 UA면 blob5 비움, landing webdriver 제외) 모두 반영, Privacy 문장 정리. 거부: AE 행 수 세기의 샘플링 과소(지금 규모에선 샘플링 없음, 하루 수천 이벤트 넘으면 재검토).

## 2026-11-20 P12 LCP — 프리뷰 LCP 미달 3쪽(홈·/daily·/gallery)을 2.5s 안으로: 측정한 원인은 "관측 LCP 전에 끝난 바이트 합" (P12 컷오버 게이트 항목)
- **측정 먼저**: Lighthouse 12 Lantern의 LCP 그래프(optimistic·pessimistic 노드)를 덤프해 봤다. LCP 요소는 세 쪽 모두 글자(홈 `p.sl-ro` 읽기 전용 안내, /daily `p.sl-st-run` — 하이드레이션 뒤, /gallery `p.sl-gw-lede`)라 Load Delay·Load Time 0, 전부 Render Delay. Lantern은 **로컬 관측 LCP 전에 끝난 요청 전부**(낮은 우선순위 스크립트·서체·lazy 이미지·파비콘까지)를 그래프에 넣고 Slow 4G 대역을 나눠 쓰게 하므로 프레임워크 청크(a039 54KB)의 끝이 밀린다 → LCP ≈ 그래프 바이트 합(쪽마다 4~7ms/KB) + 평가 CPU. 갤러리는 pessimistic(이미지 포함 3123ms)과 optimistic(2267ms)의 평균이 2.7s였다.
  - 반증된 후보(실험 기록): 서체 preload(관측 LCP만 당겨지고 바이트 그대로 — 2.70/2.87/2.79s), `font-display: optional`(차이 없음), 갤러리 이미지 전부 lazy(첫 화면 근처라 받는 시점만 늦고 그래프에 남음 — 2.71s 그대로), /daily 정적 골격 SSR(Bricolage 글자가 서체를 기다려 관측 LCP 103ms → 서체·스크립트가 그대로 그래프에 — 2.54s, 이득 거의 없음 → **안 함**, DailySpill prod 무변경).
- **선택(바이트 줄이기, 전부 프리뷰 전용)**
  1. **서체 core/ext 글자 범위 분할**: `next/font/local` 대신 `src/ui-next/fonts.css` 손 @font-face(파일마다 unicode-range를 줄 수 있어서). core = ASCII + 사이트가 쓰는 문장부호(· — … ’ © × “ ” – − •), ext = 나머지 옛 라틴 서브셋. 영어 첫 화면은 core 3개만: 47.4 → 31.2KB. 폴백 메트릭(Arial size-adjust)은 next가 계산하던 값과 같다(리뷰가 next 내부 함수로 재계산 확인). 재현 `scripts/fonts/build-fonts.py`(원본 sha256 같음, 범위 문자열을 찍는다). 대가: 사용자 제목의 악센트 글자는 ext가 따로 와 그 글자만 swap이 늦고 core↔ext 사이 커닝이 끊긴다(미미). `<html class>`는 `sl-next`(프리뷰 표식).
  2. **`PREVIEW_SWAPS`(next.config.ts)**: prod 파일이 import하는 prod 모듈을 사용처(issuer)+import 문자열이 맞을 때만 프리뷰 빌드에서 바꿔 끼운다(beforeResolve). 홈 `page.tsx`의 `SandCanvas`(프리뷰에선 그려질 일이 없는데 import만으로 10KB gzip) → 빈 모듈, `DailySpill`의 `./SpillPlayer`(플레이 화면 24KB, Solve today 뒤에만 씀) → `LazySpillPlayer`(시작 화면이 load 뒤 유휴·버튼 누름에 미리 받음). 사용처가 컴파일됐는데 한 번도 안 걸리면 **빌드 실패**(리뷰 반영, 음성 대조로 확인). prod 파일 수정 0.
  3. 홈 오늘 카드: `goalLine`을 순수 모듈로(DailyStart·HUD·지층 병이 딸려 오던 것), 판 실루엣 렌더러(Spill 시뮬)는 `afterLoad`(load 뒤 유휴) 동적 import. **마운트 때 import()는 오히려 LCP를 늘린다**(프레임워크 평가 뒤 줄을 서는 노드가 그래프 끝에 붙음) — 그래서 load 뒤.
  4. 갤러리: `LiveCanvas`(WebGPU 엔진 청크) `React.lazy`(마우스 기기는 load 뒤 미리 받음), 큐레이션 썸네일 320w srcset(12장 125 → 36KB, DPR 2 미만 폰). 실제 고밀도 폰은 640을 고른다(리뷰: 실사용 이득은 작다 — 480w 단계는 다음 후보).
  5. 프리뷰 파비콘 512px 52KB → 48px 2KB(`public/ui-next/icon-48.png`, layout.tsx `UI_NEXT` 분기). 52KB 파비콘은 load 직후 받혀 관측 LCP가 늦은 회차에 그래프에 끼어 홈 LCP를 2.35 → 2.84s로 흔들었다(덤프 실측). **컷오버 때 prod에도 같은 처리를 권한다.**
  6. lazy 청크 실패 경계 `LazyBoundary`(리뷰 반영): 데일리는 "The puzzle didn't load. Reload", 갤러리는 썸네일로 돌아감 — 없으면 Next 기본 오류 화면.
- **결과(Lighthouse 모바일 3회 중앙값, `pnpm qa:preview`, load 8~10)**: 홈 2631 → 2334, /daily 2556 → 2403, /gallery 2732 → 2400, /play 2410 → 2330, 글 3쪽 2.02~2.04s (보고 JSON `docs/perf/2026-11-20-p12-lcp-qa.json`). 7쪽 모두 ≤ 2.5s. CLS·a11y·keys·sheet·loop·ads·contrast 회귀 없음. 여유가 97~170ms라 부하가 높으면 넘는다 — main(#94) 병합 뒤 load 22~25에서 /gallery 2602ms(3회 중 1회는 `/api/scenes` 응답이 관측 LCP 전에 끝나 그래프 끝에 RTT가 붙음), load 6~14 재측정 2432ms. 게이트는 부하를 같이 적고 load 10 안팎에서 잰다. 갤러리 여유를 더 벌릴 후보: 첫 화면 밖 액자 8장을 IntersectionObserver(좁은 여백)로 늦추기(약 22KB), 벽 목록 API 호출을 load 뒤로.
- **남은 후보(숫자 근거)**: /daily는 마운트 때 `/api/track` 핑 2개가 그래프 끝에 붙어 +150ms(prod 코드 trackEvent — 컷오버 뒤 load 뒤로 미루기 후보), 시작 화면 보드 렌더러(Spill 시뮬 약 15KB)는 첫 화면 주인공이라 미루지 않았다. 홈 LCP 요소는 프리뷰 읽기 전용 안내라 컷오버(prod 빌드, READ_ONLY 없음) 뒤에는 h1 등으로 바뀐다 — 컷오버 PR에서 다시 잰다.
- prod 영향: prod out/ 210/210 main과 동일(같은 폴더 빌드, 빌드 id만 다름) + 참조 없는 정적 파일 13개(320 썸네일 12·아이콘 1, P9 webp와 같은 방식). content-parity 35쪽 0 차이.

## 2026-11-20 P12 컷오버 — prod sandlab.app을 새 셸(Glass & Grain)로, 되돌리기는 변수 하나 (오너 11-20 명시 승인, 고위험)
- **전환 방식**: `package.json` `build:prod` = `NEXT_PUBLIC_UI=${SANDLAB_UI:-next} NEXT_PUBLIC_READ_ONLY= NEXT_PUBLIC_NOINDEX= next build`, `deploy` = `build:prod → verify-ads → wrangler deploy`. 새 셸은 이미 있던 `@ui-shell` 영역 치환·`PREVIEW_SWAPS`가 그대로 끼운다(코드 경로는 프리뷰와 같음 — 다른 점은 READ_ONLY·NOINDEX가 꺼진 것뿐).
  - 버린 안: ① 런타임 쿠키 분기(S6에서 이미 기각 — 정적 export 깜빡임) ② 옛 컴포넌트를 지우고 새 셸만 남기기(되돌리기가 revert + 재빌드로만 가능해짐 — 72시간 동안은 classic 빌드 경로를 살려 둔다) ③ deploy 스크립트에 `NEXT_PUBLIC_UI=next`를 박기(되돌리려면 PR·CI를 기다려야 함 — 변수로 바로 되돌릴 수 있게 `${SANDLAB_UI:-next}`).
- **색인 차단 분리(필수 수정)**: 컷오버 전에는 `UI_NEXT`가 곧 '프리뷰'라 robots.ts·layout.tsx가 `UI_NEXT`로 noindex·전체 차단을 했다 → 그대로 두면 **prod 전체가 색인 차단**된다. `NEXT_PUBLIC_NOINDEX=1`(flag.ts `NOINDEX`, build:preview만)로 분리. verify-ads(prod 모드)가 env·out/ 양쪽에서 막는다: NOINDEX·READ_ONLY env, 메타 robots noindex(원래 noindex인 404·도구 3쪽 제외), out/_headers, 전체 차단 robots, 읽기 전용 안내 흔적, 그리고 **기대 UI(SANDLAB_UI, 비면 next)와 out/의 셸 class·`--sl-*` 토큰 일치**(치환이 조용히 빠지거나 되돌리기 빌드에 새 셸이 섞이는 사고).
- **되돌리기 런북**(판단은 아래 기준, 실행은 누구든):
  1. 가장 빠름(분 단위, PR 없음): `gh variable set SANDLAB_UI --body classic -R Piousangel/sandlab` → `gh workflow run deploy -R Piousangel/sandlab --ref main` → run 초록 확인 → `curl -s https://sandlab.app/ | grep -c 'class="sl-next"'`가 0이면 끝. (변수는 저장소 설정이라 오너 또는 권한 있는 세션만. 다음 main 배포도 계속 classic — 다시 켤 때 `gh variable delete SANDLAB_UI`.)
  2. 코드로(기록이 남음): `package.json` build:prod의 `:-next`를 `:-classic`으로 바꾸는 PR 1개(shell.test 'P12 컷오버 계약' 기대값도 같이) → CI → squash 머지 → 자동 배포. 또는 이 컷오버 PR을 `git revert`하는 PR(색인 분리·계측 지연도 함께 되돌아감 — 1번이 더 좁다).
  3. 클라우드플레어 즉시 되돌리기(배포 직후 사고, CF 권한 있을 때만): `npx wrangler rollback`(직전 Worker 버전 = 직전 정적 자산). 다음 main 배포가 다시 새 셸을 올리므로 1 또는 2를 같이 한다.
  - D1·워커 API·공유 링크 형식은 이 PR이 바꾸지 않으므로 되돌리기에 데이터 작업은 없다. 사용자 localStorage도 두 UI가 같은 키를 읽는다(cutover-e2e가 옛 키로 확인).
- **되돌리기 판단 기준**(하나라도면 1번 실행 후 보고): ① 핵심 흐름 실패 — 홈 붓기·`#s=`/`#g=` 링크 열기·/daily 시작→클리어·/play 레벨·갤러리 목록·장면 열기 중 하나가 라이브에서 안 됨 ② 오류율 — 페이지 오류(콘솔 pageerror) 재현 가능, 또는 `/api/*` 5xx 증가 ③ 72시간 지표가 컷오버 전 같은 길이 구간보다 15% 넘게 악화: 첫 붓기율(first_stroke ÷ 홈 landing), daily start→clear, 북극성 '주간 손댄 방문자'(측정 시작 11-20이라 7일 창이 안 차 '부분' — 전 72시간과 일 평균으로 비교) ④ 실기기 Web Vitals LCP 2.5s(모바일 p75)를 넘거나 CLS 0.1 초과가 확인됨 ⑤ 검색 — Search Console에서 색인 제외 급증·'noindex로 제외' 발생.
- **72시간 확인 항목(11-23 KST까지)**: 지표 파일(`scripts/daily-metrics.mjs`) 북극성·데일리 클리어 기기·첫 붓기율 줄, AE 이벤트 수(landing·first_stroke·daily_start·daily_clear·share_click·share_open) 일별 추이, `/api/visit` 방문자 수, 갤러리 업로드·투표 수(D1 읽기만), 데일리 기록 POST 수, Search Console 색인 상태, 실기기(iOS Safari·안드로이드 크롬) 홈 붓기·시트 끌기·데일리 클리어. 주의: 이 PR이 계측 핑을 load 뒤로 미뤘으므로(아래) load 전에 떠난 방문의 landing·daily_start가 조금 빠질 수 있다 — 악화 판단 때 감안.
- **컷오버 PR 할 일 처리**: prod 파비콘 48px 적용(새 셸 분기 그대로 — head-parity의 유일한 전 페이지 차이), /play/<id> h1 = 옛 prod 글자 순서 "1-1First Drop"으로 DOM 순서를 되돌리고 화면은 CSS `order`로 이름 먼저(SEO·스크린리더 그대로), /daily 등 계측 핑(`trackEvent`·`/api/visit`)을 load 뒤로(`afterPageLoad`, 이미 load면 즉시), /gallery 첫 벽 목록 요청을 load 뒤로(빈 액자가 자리를 지켜 CLS 0). 홈 LCP 요소 재측정은 아래 수치.
- **옛 컴포넌트 삭제는 별도 PR**(72시간 지표 확인 뒤): 계획서는 이번에 ResultCard·ChallengePlayer·GalleryBrowser 삭제를 적었지만, ResultCard·GalleryBrowser는 classic 되돌리기 빌드가 쓰므로 지우면 런북 1번이 사라진다. ChallengePlayer·DailyPlayer는 어느 빌드도 안 쓰지만 삭제 PR 하나로 모은다(이 PR은 전환만, diff를 되돌리기 쉽게). 삭제 PR이 할 일: SandCanvas·GalleryBrowser·ResultCard·ChallengePlayer·DailyPlayer와 classic.ts null들, sheet.test LEGACY 목록, gallery.test '옛 갤러리와 대조', shareLinks.golden.test의 SandCanvas·GalleryBrowser 소스 검사, ci.yml '되돌리기 빌드' 단계, verify-ads의 classic 분기, `PREVIEW_SWAPS`의 홈 SandCanvas 줄.
- **게이트(prod 빌드 기준, 맥 로컬)**: Lighthouse 모바일 3회 중앙값(측정 시작 load 7.4) 홈 2330(LCP 요소 = `h1.sl-home-h1`, 프리뷰의 읽기 전용 안내 대신)·/daily 2406·/play 2337·/gallery 2411·Learn 글 2023·재료 2027·공략 2028ms, CLS 최대 0.037, 상호작용 지연 24~64ms. a11y 15쪽 × 390·1440 axe serious 0·가로 스크롤 0·CLS ≤ 0.011, keys·loop·ads(안내판 0)·sheet 14/14·contrast 19쌍 통과. cutover-e2e 21/21(골든셋 10 — 장면 4·#g= 2·빈 홈 4, 옛 저장 데이터 6, prod 흔적 4쪽), head-parity 53쪽 차이 0(의도 3종), content-parity 35쪽 0 차이, robots·sitemap 바이트 동일. 보고 `docs/perf/2026-11-20-p12-cutover-qa.json`.
