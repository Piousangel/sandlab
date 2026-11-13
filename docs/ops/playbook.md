# 에이전트 운영팀 플레이북

샌드랩 팀이 쓰는 운영 방식과 배운 점. 2026-11-17 주부터 quickminigames.site(Piousangel/minigames-hub)
전담 팀을 세울 때 이 문서를 그대로 들고 간다. **새 노하우가 생기면 "배운 점"에 날짜와 함께 한 줄씩 추가한다.**

## 1. 팀 구조와 하루 (2026-11-13부터, 사이트마다 한 팀)

| 시간(KST) | 누가 | 하는 일 |
|---|---|---|
| 05:30 | GitHub Actions `metrics` | 지표(D1·AE·존 트래픽·사용자 댓글)를 `docs/daily/metrics/<날짜>.md`로 커밋 |
| 06:00 | 팀 루틴(클라우드, 사람 없음) | **회의**(데이터·CS·QA·마케터·PM) → **리뷰**(1개 선정) → **반영**(PR·머지·Actions 배포) → **메일 보고** |
| 07:00–09:00 | 사람 + Claude 세션 | 두 팀 보고 메일·회의록 검토, 마케팅 초안 게시, 사람 결정 |

- 목표 문장: **"어제보다 더 나은 사이트"**. 큰 방향은 AdSense 승인(고유 콘텐츠)과 방문·재방문.
- 산출물: 회의록 `docs/team/meetings/`, 마케팅 초안 `docs/marketing/`, 출시 로그 `docs/daily/log.md`, 백로그, 메일 보고.
- 루틴 프롬프트 템플릿: [routine-prompt.md](./routine-prompt.md). 팀마다 `{{...}}`만 바꾼다.

| 팀 | 저장소 | 루틴 |
|---|---|---|
| 샌드랩 | Piousangel/sandlab | https://claude.ai/code/routines/trig_01LRjdukRqVeAbjdJzGJpjnJ |
| 미니게임허브 | Piousangel/minigames-hub | https://claude.ai/code/routines/trig_01Ge7LoTMndjC2PZ2QgvAyHi |

## 2. 새 팀을 세우는 순서 (minigames-hub 기준 체크리스트)

1. **절대 규칙 정리**: 저장소 CLAUDE.md에 "어기면 사고" 규칙을 적는다(배포 대상, 하면 안 되는 기능, 바꾸면 깨지는 형식).
2. **출시 단위 결정**을 DECISIONS.md에 적는다. 샌드랩은 "레벨 1개 + 300단어 이상 공략". 얇은 게임 양산은 AdSense에서 반려된 이력이 있다.
3. **데일리 스킬 복사**: `.claude/skills/sandlab-daily/SKILL.md`를 복사해 "프로젝트 설정" 절만 바꾼다(지표·검증·배포 명령, 콘텐츠 위치).
4. **지표 스크립트**: `scripts/daily-metrics.mjs` 복사, `QUERIES` 표만 그 프로젝트 DB에 맞게 바꾼다.
5. **로그·백로그**: `docs/daily/log.md`(하루 한 줄), `docs/daily/backlog.md`.
6. **자동 배포**: `.github/workflows/deploy.yml` 복사. 저장소 시크릿 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID` 등록. 시크릿 등록 후 `workflow_dispatch`로 한 번 돌려 확인.
7. **지표 수집**: `.github/workflows/metrics.yml` 복사(05:30 KST). 토큰에 D1 Read·Account Analytics Read·Zone Read·Zone Analytics Read 포함.
8. **클라우드 루틴**: `/schedule`로 06:00 KST(= `0 21 * * *` UTC) 루틴 생성. 프롬프트는 [routine-prompt.md](./routine-prompt.md). 커넥터는 Gmail만(피드백 읽기·보고 발송).
9. **캘린더**: 07–09 검토 세션 반복 일정.

## 3. 루틴 프롬프트에 꼭 넣을 것

- 먼저 읽을 파일 목록(CLAUDE.md 절대 규칙, 인계서, DECISIONS, 스킬, 백로그, 로그).
- 검증 명령 전체와 "모두 통과해야 머지, 하나라도 실패하면 PR만 열어두고 원인을 적는다".
- 금지 목록: main 직접 푸시, force push, 테스트 약화·삭제, 공유 URL 형식 변경, 광고 위치 규칙 위반, AdSense 재심사 신청.
- 직접 배포 금지(배포는 Actions). 클라우드에는 로컬 wrangler 로그인이 없다.
- 마지막 출력 형식(출시 URL / PR·머지 여부 / 실행한 검증 결과 / 내일 볼 것).

## 4. 콘텐츠 품질 장치 (AdSense 대비)

- 공략·해설은 **시뮬레이터나 실제 플레이로 확인한 주장만** 쓴다. 샌드랩은 `scripts/spill-explore.mts`로 해 공간을 돌려 근거를 뽑는다.
- 테스트로 강제한다: 350단어 이상, 공략끼리 6단어 구절 중복 0, 화면 자동 문구(요약·힌트) 복사 금지, 힌트에 좌표 노출 금지, 자리표시자 금지.
- 수치(par, 목표)는 본문에 손으로 쓰지 말고 데이터에서 렌더한다. 어긋나면 거짓말이 된다.
- 광고는 글 페이지(ContentShell)에만. 게임·캔버스 화면에는 넣지 않고 `scripts/verify-ads.mjs`가 빌드 결과로 검사한다.
- AdSense 재심사는 색인 확인 후 **한 번만**. 반복 반려는 재심사 버튼을 잠근다.

## 5. 배운 점 (날짜순, 한 줄씩 추가)

- 2026-11-10 엔진이 다른 두 기능(샌드박스 갤러리 vs Spill 퍼즐)은 직접 연동하지 말고 "레벨 갤러리"처럼 한쪽 형식으로 모은다.
- 2026-11-10 지표는 D1 원격 조회(`wrangler d1 execute --remote --json`)로 충분하다. 원격 호출은 가끔 실패하니 재시도 3번.
- 2026-11-11 무작위 시도 클리어율을 재면 난이도가 보인다(1-6은 92%로 너무 쉬움, 1-4는 4%). 공략 쓰기 전에 꼭 잰다.
- 2026-11-11 "공략이 없는 레벨"에도 링크를 걸면 404가 난다. 링크·사이트맵은 데이터 존재 여부로 만든다.
- 2026-11-11 백그라운드 셸 명령에 `cat > 파일`처럼 stdin을 기다리는 명령을 넣으면 영원히 멈춘다.
- 2026-11-11 pnpm 12는 CI에서 빌드 스크립트를 막는다(`ERR_PNPM_IGNORED_BUILDS`). `pnpm-workspace.yaml`의 `allowBuilds`에 esbuild·sharp·workerd를 명시한다.
- 2026-11-11 저장소에 `lint` 스크립트가 있어도 eslint가 의존성에 없으면 못 돌린다. 새 팀은 첫날 검증 명령이 전부 실제로 도는지 확인한다.
- 2026-11-11 전체 테스트에 늘 실패하는 테스트(verify.test.ts 타임아웃)가 있으면 자동 머지 게이트가 막힌다. 제외하고 대체 검증(spill:verify)을 명시하되 백로그에 올린다.
- 2026-11-11 무거운 검증(spill:verify)은 GitHub Actions 러너에서 로컬보다 7배 이상 느리다(3분→22분). 배포 워크플로에는 빠른 검사만 두고 무거운 검증은 머지 전에 돌린다.
- 2026-11-12 Claude Code의 `!` 입력창에서 `gh secret set X`만 치면 붙여넣을 칸이 안 떠서 빈 값이 저장된다. 토큰을 복사한 뒤 `! pbpaste | gh secret set X --repo <저장소>`로 넣는다. Cloudflare 토큰 화면에서는 아래 curl 상자가 아니라 맨 위 점선 상자의 값을 복사한다.
- 2026-11-12 Cloudflare 배포 토큰은 'Edit Cloudflare Workers' 템플릿이면 충분하다(D1 바인딩 포함 배포 성공). IP 필터는 비운다(Actions IP가 매번 바뀜).
- 2026-11-12 pnpm 12 CI 빌드 허용 목록은 저장소마다 다르다(minigames-hub는 unrs-resolver 추가). 새 저장소는 깨끗한 클론에서 `CI=true pnpm install --frozen-lockfile`로 먼저 확인한다.
- 2026-11-13 GitHub 예약 실행(cron)은 첫날 아예 안 뜰 수 있다(05:30 지표 누락 → 회의가 전날 지표로 진행). 회의 30분~2시간 전으로 두 번 걸고, 같은 날 파일을 덮어쓰게 한다.
- 2026-11-13 클라우드 루틴 샌드박스는 실사이트 curl이 403(프록시)일 수 있다. QA가 실사이트를 보려면 환경 네트워크 허용 목록에 도메인을 넣어야 한다.
- 2026-11-13 외부 게시도 배포처럼 한다: 에이전트는 `docs/marketing/queue/*.json`만 PR에 넣고, 머지 후 Actions(`marketing-post.yml`)가 저장소 시크릿으로 게시한다. 자격증명이 에이전트에 가지 않는다. `GITHUB_TOKEN` 푸시는 다른 워크플로를 트리거하지 않아 원장 커밋이 배포를 또 돌리지 않는다.
- 2026-11-13 루틴 프롬프트를 고치지 않아도 규칙을 바꿀 수 있게, 팀 규칙은 저장소 `docs/team/OPERATING.md`에 두고 CLAUDE.md에서 필독으로 건다(클라우드 세션도 CLAUDE.md는 자동으로 읽는다).
- 2026-11-13 "기능이 안 된다"는 지적은 데이터부터 본다. 리더보드는 API·화면이 정상인데 역대 점수 2건이라 빈 보드가 고장처럼 보였다. 고칠 대상은 코드가 아니라 참여 동선이었다.
