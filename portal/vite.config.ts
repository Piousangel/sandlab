import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 상대경로 — 포털이 임의 하위경로/zip에서 서빙해도 asset 참조가 안 깨진다
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
