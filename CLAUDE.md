# sandlab

WebGPU 낙사 시뮬레이터. Next.js 15 정적 export + Cloudflare Worker(갤러리 API) + D1.

## 세션 시작 시 먼저 읽을 것

**[.claude/handoff/main.md](./.claude/handoff/main.md)** — 다음 할 일, 멈춘 지점, 함정, 검증 상태.
작업 전에 읽는다. 세션을 끝낼 때는 같은 파일을 갱신한다(브랜치당 1개, 덮어쓰기).

## 매일 아침 팀 운영

06:00 KST 클라우드 루틴이 회의(docs/team/meetings) → 리뷰 → 반영(PR·머지) → 메일 보고. 운영 방식 docs/ops/playbook.md.
**아침 팀은 회의 전에 [docs/team/OPERATING.md](./docs/team/OPERATING.md)를 반드시 읽고 따른다** (어제 회고, 첫 화면 상시 안건, 방향 문서·주간 회고, 마케팅 실제 게시 큐).

## 절대 규칙 (어기면 사고)

- **배포는 Cloudflare Workers 전용. 버셀 금지.** 이유는 [README.md](./README.md) 참조.
- **`pnpm run deploy`** — `run` 없으면 pnpm 내장 명령과 충돌한다.
- **개발은 `npx wrangler dev --port 8799 --local`** — `pnpm dev`(3120)는 API가 없어서
  갤러리가 통째로 고장난 것처럼 보인다.
- **댓글 기능 만들지 마라.** 스키마에 없는 건 결정이지 누락이 아니다.
- **격자 크기(1200×600) 바꾸지 마라.** 공유 URL이 w,h를 담아서 기존 링크가 전부 깨진다.
- **시뮬 품질에 더 붓지 마라.** 이미 충분하다. 근거는 인계서의 "왜 이 순서인가".

## 검증

```bash
pnpm typecheck
node scripts/verify-margolus.mjs   # Margolus 불변식 7/7
node scripts/verify-url.mjs        # URL 예산 측정 (의도적으로 exit 1)
python3 scripts/verify-gallery.py  # 갤러리 API 17/17 (wrangler dev 필요)
```
