# sandlab

낙사(falling sand) 시뮬레이터 + Spill 퍼즐(sandlab.app). Next.js 15 정적 export + Cloudflare Worker(갤러리 API) + D1. 화면은 Glass & Grain 새 셸(`src/ui-next/`, P12 컷오버 11-21).

## 세션 시작 시 읽을 것 (필독 세트 — CI가 크기를 센다)
1. 이 파일 2. [docs/team/SHIFT.md](./docs/team/SHIFT.md) — 교대 규칙(허브 정본의 사본 + 샌드랩 절) 3. [docs/team/NORTH-STAR.md](./docs/team/NORTH-STAR.md) — 방향·지표 4. [.claude/handoff/main.md](./.claude/handoff/main.md) — 현재 상태·다음 할 일(덮어쓰기, ≤10KB).
함정·결정 전체는 [docs/team/PITFALLS.md](./docs/team/PITFALLS.md), 보고·회고·마케팅은 [docs/team/OPS.md](./docs/team/OPS.md). 옛 문서(OPERATING·SESSION-GUIDE·cycle·direction·docs/ops/playbook·routine-prompt·.claude/team/charter)는 `docs/archive/`에 보관됐다 — 규칙으로 읽지 않는다.

## 절대 규칙 (어기면 사고)
- **배포는 Cloudflare Workers 전용, main 머지 시 Actions(`deploy.yml`)만.** 버셀 금지(이유는 README). 세션에서 `pnpm run deploy`·`wrangler deploy`는 `.claude/settings.json` deny·hook이 막는다(오너 터미널만 예외). 롤백 변수 `SANDLAB_UI=classic`은 오너·고위험.
- 브랜치 → PR → CI 초록 → squash 머지. main 직접 푸시·force push·`--admin` 금지. 시크릿은 읽지도 설정하지도 않는다(설정은 오너 터미널).
- **개발 서버는 `npx wrangler dev --port 8799 --local`** — `pnpm dev`(3120)는 API가 없어 갤러리가 통째로 고장난 것처럼 보인다.
- **댓글 기능 만들지 마라.** 스키마에 없는 건 결정이지 누락이 아니다.
- **격자 크기(1200×600)·공유 링크(`#s=`·`#g=`·`/s/:id`)·레벨 id 바꾸지 마라.** 기존 링크가 전부 깨진다.
- **시뮬 품질에 더 붓지 마라.** 이미 충분하다(근거: PITFALLS '왜 이 순서인가').

## 검증 (머지 전 하나)
```bash
pnpm verify 2>&1 | tail -n 80   # typecheck · lint:ui · contrast · margolus · test · spill:verify · build:prod · verify-ads
```
- spill:verify 출력은 길다 — 따로 돌릴 때는 파일로 리다이렉트. CI는 같은 검사를 나눠 돌고 갤러리 API(`wrangler dev --local` + `python3 scripts/verify-gallery.py`)·build:preview도 본다.
- `node scripts/verify-url.mjs`는 URL 예산 측정(의도적으로 exit 1).
- 화면·공통 컴포넌트 PR은 [docs/team/UX-CHECKLIST.md](./docs/team/UX-CHECKLIST.md)(모달은 `src/ui-next/sheet/BottomSheet` 하나, 44px·입력 16px — `pnpm qa:preview --only sheet`).

## 참고 방향 스펙
랭킹·경쟁 구조 `docs/team/specs/2026-11-18-leaderboard-direction.md`(서버 조사 `docs/design/leaderboard/R1-server-options.md`), 챌린지 UI 개편 `docs/team/specs/2026-11-18-spill-ui-overhaul-direction.md`·`-round1.md` — S1 슬라이스의 입력.
