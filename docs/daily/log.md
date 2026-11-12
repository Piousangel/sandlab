# 데일리 출시 로그

| 날짜 | 출시물 | URL | 검증 | 메모 |
|---|---|---|---|---|
| 2026-11-11 | 공략 템플릿 + W1 8레벨 공략 | /play/1-1/guide ~ /play/1-8/guide | typecheck·build·verify-ads·spill:verify 8/8·guide 테스트 통과 (lint: eslint 미설치로 못 돌림) | 시뮬 해 공간 탐색으로 공략 근거 확보. 1-6 너무 쉬움·결과 카드 팁 오해 → 백로그 |
| 2026-11-12 | 결과 카드 팁 수정 (젬 별 저장 안내) | /play/1-3, 1-4, 1-8 결과 카드 | typecheck·test 1034 통과(verify.test 제외)·view.test 신규 케이스 | 젬을 다 먹고 par만 놓치면 "Gem star saved — par is N, chase it in a fresh run" |
| 2026-11-13 | Spill 1-9 Overflow + 공략 | /play/1-9, /play/1-9/guide | typecheck·test(verify.test 제외)·build·verify-ads 통과, spill:verify 아래 PR 참조 | 넓은 트레이의 오답 절반(파티 쪽 컷은 전부 stalled). 지표 D1 쿼리 전부 실패 → 사람 확인 필요 |
