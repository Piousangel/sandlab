/**
 * 셸 모듈 계약(타입 검사 전용, 어디서도 import하지 않는다 — 빌드 그래프에 안 들어감).
 * layout·ContentShell은 `@ui-shell` = classic.ts의 타입으로만 검사되므로, next.ts가 다른 모양을 내보내면
 * 프리뷰 빌드에서야 깨진다. `pnpm typecheck`가 여기서 미리 잡는다: 내보내는 이름이 같고, next 쪽 값이 classic 타입에 들어맞는다.
 */
import type * as Classic from './classic'
import type * as Next from './next'

type Exact<A, B> = [keyof A] extends [keyof B] ? ([keyof B] extends [keyof A] ? true : false) : false

export const sameNames: Exact<typeof Classic, typeof Next> = true
export const nextFitsClassic: { [K in keyof typeof Classic]: (typeof Classic)[K] } = {} as typeof Next
