import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// 결정적 시뮬레이션을 끝까지 돌리는 무거운 테스트(물리 벤치·salt 16개 스윕·레벨 검증·리플레이·데일리 변환).
// 만성 실패 정리(11-20, 오너 승인 제안 C): 이 파일들은 기본 5초/훅 10초에 부하(로컬 load 40+, CI 4코어)로 끊겼다
// — CI에서도 verify.test beforeAll 10초·sim fuse 5초가 넘었고, 로컬 부하에선 Steam vs vent 스윕이 236초 걸렸다.
// 검증 범위는 그대로 두고 'sim' 프로젝트로 떼어 시간 한도만 시뮬 규모에 맞춘다. CI는 두 프로젝트를 다른 job에서 병렬로 돈다.
// `pnpm test`는 지금처럼 둘 다 돈다(제외 없음).
const SIM_TESTS = [
  'src/lib/spill/{sim,bench,verify,play,levels}/**/*.test.ts',
  'src/lib/challenge/daily/transform.test.ts',
]
// CI(조용한 4코어): 가장 느린 테스트 약 42초(verify.test 솔버) → 3분(약 4배)으로 느려짐 퇴행을 잡는다.
// 로컬: 다른 세션과 머신을 나눠 써 같은 테스트가 377초·스윕 469초까지 걸렸다(load 45) → 15분.
const SIM_TIMEOUT = process.env.CI ? 180_000 : 900_000

// tsconfig의 `@/*` → `./src/*` 별칭을 테스트에서도 쓴다(Next 페이지·sitemap이 @/ 경로로 import).
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@ui-shell': fileURLToPath(new URL('./src/ui-next/shell/classic.ts', import.meta.url)), // tsconfig paths와 같게(테스트는 classic)
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    exclude: ['node_modules', 'portal', '.next', 'out'],
    projects: [
      {
        extends: true,
        test: { name: 'unit', exclude: ['node_modules', 'portal', '.next', 'out', ...SIM_TESTS] },
      },
      {
        extends: true,
        test: { name: 'sim', include: SIM_TESTS, testTimeout: SIM_TIMEOUT, hookTimeout: SIM_TIMEOUT },
      },
    ],
  },
})
