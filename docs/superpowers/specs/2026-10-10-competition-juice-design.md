# 설계: 경쟁심·깨는 맛 — 클리어 연출, 친구 도전장, 분포·연속 기록, 리플레이 검증 순위표

- 날짜: 2026-10-10
- 배경: 사용자 실기기 피드백 "사람들끼리 경쟁심리나 깨는 맛이 있으면 좋겠다". 현재 클리어는 카드가 뜨는 게 전부이고,
  데일리는 '상위 N%' 문구 한 줄. 사용자가 4개 방향 전부 선택.
- 상위 스펙: `2026-10-09-challenge-mode-design.md`. 그 문서의 "순위표 없음" 결정은 **서버가 플레이를 검증할 수 없어서**였다.
  이 문서는 그 근거를 **리플레이 + 관람자 브라우저 검증**으로 해소하고 순위표를 연다.

## 1. 깨는 맛 연출 (클라이언트만)

클리어 순간(ChallengePlayer `judgeOnce`의 클리어 분기) 1.5초 연출:
- **캔버스 안 축포**: 엔진 브러시로 목표 구역 위쪽 무작위 지점 6~10곳에 짧게 `fire`·`steam`을 뿌린다(기체가 위로 솟아
  불꽃놀이처럼 보임). 레벨은 이미 끝났으므로 격자 변경은 무해. `paintEmptyOnly`·`inkCap` 해제, 잉크 집계 이후 실행.
- **별 순차 등장**: 별 1→2→3개가 0.25초 간격으로 튀어나오는 CSS 애니메이션(`prefers-reduced-motion`이면 생략).
- **잉크 카운트업**: 0 → 최종 잉크로 0.6초.
- **NEW BEST!** 배지: `saveBest` 결과가 이전보다 좋아졌을 때(별 증가 또는 같은 별·잉크 감소).
- **진동**: `navigator.vibrate?.([30, 40, 60])`(안드로이드만, 미지원 무시).
- 소리 없음(자동재생 정책·무음 사용자 배려).

## 2. 친구 도전장 링크 (클라이언트만)

- 공유 URL: `/play/<id>?vs=<ink>&by=<name>` · 데일리는 `/daily?vs=<ink>&by=<name>&n=<day>`.
  `vs`는 1..1e7 정수, `by`는 기존 크리에이터 이름 규칙(`cleanCreatorName`, 24자, 없으면 생략), 데일리 `n`이 오늘과 다르면 도전장 무시.
- 열면 상단 배너: "**<by>** solved this with **4,210 ink**. Can you beat it?"
- 클리어 시 비교: 이기면 "You beat <by> by 312 ink! 🏆" + 되갚기 공유(내 잉크로 새 링크), 지면 "120 ink short — try again".
- 공유 문구: `I solved "<title>" with 4,210 ink. Beat me: <url>`. 공유는 클릭으로만(기존 규칙).
- 서버 검증 없음(친구 사이 장난이 목적). 링크 조작은 본인 손해.

## 3. 데일리 분포·연속 기록

- **분포**: `GET /api/daily/:day/stats`에 `histogram: { min, max, bins: number[10] }` 추가(잉크 균등 10구간).
  클리어 카드에 막대 10개 미니 차트 + 내 막대 강조 + "You used less ink than 73% of players"(정확 백분위:
  `belowMe/clears`, 서버가 `?ink=` 받으면 계산해 같이 준다 — 캐시 키 분리).
- **연속 기록**: localStorage `sandlab.daily.v1`의 날짜 키로 계산 — 오늘 또는 어제까지 이어진 연속 일수.
  클리어 카드·/daily 상단에 "🔥 3-day streak". 공유 문구에도 포함.

## 4. 닉네임 순위표 + 리플레이 검증

**기록(제출)**: 플레이 중 ChallengePlayer가 `engine.onTick`에서 매 틱 브러시 상태를 기록 → `Stroke[]`(모범답안과 같은 형식).
데일리 제출에 `replay`(Stroke[], JSON ≤ 64KB, 최대 3600틱)와 선택적 `name`(크리에이터 이름, 없으면 순위표 미노출·통계만) 포함.

**서버**: `daily_results`에 `name TEXT, replay TEXT, verified INTEGER DEFAULT 0, refuted INTEGER DEFAULT 0, id TEXT` 추가(ALTER).
- `GET /api/daily/:day/top` → 이름 있는 기록 중 `refuted < max(2, verified)`인 것 잉크 오름차순 상위 20: `{ id, name, ink, stars, verified }`.
- `GET /api/daily/run/:id` → `{ levelId, day, ink, replay }`.
- `POST /api/daily/run/:id/verdict` `{ ok: boolean, ink: number }` — IP당 run당 1회(`run_verdicts(run_id, ip)` PK). ok이고 ink가 신고값과
  같으면 verified+1, 아니면 refuted+1.

**검증(관람자 브라우저)**: `/daily/replay?id=` — 리플레이를 실제 엔진으로 재생(autoplay와 같은 advance 루프, 탭 가려져도 진행).
클리어·잉크를 신고값과 비교해 판정 POST. 화면엔 "Replaying <name>'s run… ✓ verified" 또는 "✗ didn't reproduce".
결정성 근거: 시뮬 난수 = hash(블록, tick), `resetTick` 후 같은 틱에 같은 브러시면 같은 결과(Phase 2 검증기·autoplay에서 잉크가 매번 동일함을 확인).

**남용 방어**: 리플레이 크기 상한, IP당 하루 1제출(기존), 판정은 run당 IP 1회, 이름 정제·길이 제한, 반박이 검증보다 많으면 숨김.
한계: 첫 관람자가 생기기 전까진 미검증 기록이 보인다(배지 "unverified"로 표시) — 수용.

## 비범위

사운드, 친구 목록/계정, 실시간 대전, 주간 리그, 비데일리 레벨 순위표(데일리로 검증 경로 확립 후 확장 후보).

## 출시 순서

J1 연출 + 연속 기록 + 분포(서버 stats 확장) → J2 친구 도전장 → J3 리플레이 기록·순위표·관람 검증. 단계마다 실크롬(데스크톱·412px) 확인 후 배포.
