---
name: sandlab-daily
description: 샌드랩 수동 작업 세션(사람이 /sandlab-daily를 치거나 "오늘 데일리 시작"이라고 할 때). 운영안 v2 규칙(docs/team/SHIFT.md)대로 카드 1장을 골라 구현·검증·PR까지. 루틴은 docs/team/routines/를 쓴다.
---

# 샌드랩 수동 세션 (운영안 v2, 2026-11-24 개정)

규칙 정본은 `docs/team/SHIFT.md`(카드·리뷰·기록·금지), 방향은 `docs/team/NORTH-STAR.md`, 현재 상태는 `.claude/handoff/main.md`. 옛 '하루 1개 출시' 절차(평일 레벨+공략, 2시간 상자)는 v2 주기 상한으로 바뀌었다 — 원문은 `docs/archive/team-2026-11/skill-sandlab-daily.md`.

## 절차
1. 지표: `node scripts/daily-metrics.mjs | tail -n 60` — 북극성·어제 대비 3줄.
2. 카드: `gh issue list --label ready --limit 10`에서 사람과 함께 1장 고른다(없으면 카드 템플릿 `.github/ISSUE_TEMPLATE/card.md`로 만든다). assign + `in-progress`.
3. 레벨 카드면 아래 '레벨 카드'를 채우고 솔버로 확인: `CAP=400 npx tsx scripts/spill-explore.mts <id>`(해 공간·클리어율·젬 루트). 공략 주장은 시뮬로 확인한 것만.
4. 구현 → `pnpm verify 2>&1 | tail -n 80` → 브랜치 `card/<번호>-<주제>` PR(첫 줄 오답 검사, `Closes #번호`, 증거).
5. 머지는 독립 리뷰 뒤(SHIFT 4장). 배포는 main 머지 시 Actions — 세션에서 배포하지 않는다. 머지 뒤 `gh run list --workflow deploy.yml --limit 1`과 라이브 URL.
6. 기록 3곳만(SHIFT 6장): 인계 현재분, 갈림길이면 DECISIONS, `docs/daily/log.md` 한 줄.

## 프로젝트 설정
- 공략 데이터: `src/content/guides/<world>.ts`(테스트가 350단어+·6단어 구절 중복 0·좌표 노출 금지 강제)
- 실화면 확인: `/play/<id>?autoplay=1` → `body.dataset.autoplay`, 390px·1280px. 레벨을 더하면 `npx tsx scripts/gen-level-thumbs.mts`
- 함정: `docs/team/PITFALLS.md`(격자 1200×600·댓글 없음·버셀 금지·시뮬 품질 동결), 레벨 추가 절차·실측 물리 제약도 같은 파일

## 레벨 카드
```
id / 이름:
깨닫게 할 것(한 문장):
동사·재료:
par(수/초):
실패 유도 함정(오답 경로):
솔버 클리어율 밴드:
공략 페이지 제목:
```

## 완료 보고
```
카드 #n / PR #p: 무엇
검증: 실행한 명령과 결과 (못 돌린 것 명시)
지표 메모: 내일 볼 것
```
