import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// tsconfig의 `@/*` → `./src/*` 별칭을 테스트에서도 쓴다(Next 페이지·sitemap이 @/ 경로로 import).
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { exclude: ['node_modules', 'portal', '.next', 'out'] },
})
