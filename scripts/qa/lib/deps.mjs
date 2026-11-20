/**
 * QA 도구 의존성(playwright·axe-core·lighthouse) — package.json에 넣지 않는다(무겁고 prod·CI 설치와 무관).
 * 처음 한 번 node_modules/.cache/sandlab-qa 에 고정 버전으로 설치하고, 다음부터는 그대로 쓴다.
 * 브라우저는 playwright 캐시(~/Library/Caches/ms-playwright)의 chromium — 없으면 `npx playwright@<ver> install chromium`.
 * 버전을 바꾸면 폴더가 새 버전으로 다시 설치된다(package.json 비교).
 */
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DIR = join(ROOT, 'node_modules/.cache/sandlab-qa')
export const VERSIONS = { playwright: '1.65.1', 'axe-core': '4.10.2', lighthouse: '12.8.2' }

function ensure() {
  const pkg = join(DIR, 'package.json')
  const want = JSON.stringify({ name: 'sandlab-qa', private: true, dependencies: VERSIONS }, null, 2)
  const ok = existsSync(pkg) && readFileSync(pkg, 'utf8') === want && Object.keys(VERSIONS).every((d) => existsSync(join(DIR, 'node_modules', d, 'package.json')))
  if (ok) return
  mkdirSync(DIR, { recursive: true })
  writeFileSync(pkg, want)
  console.log(`[qa] 도구 설치(1회): ${Object.entries(VERSIONS).map(([k, v]) => `${k}@${v}`).join(' ')} → ${DIR}`)
  // npm(pnpm 아님): 이 폴더는 워크스페이스·lockfile과 무관한 캐시다
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: DIR, stdio: 'inherit' })
}

ensure()
export const qaRequire = createRequire(join(DIR, 'package.json'))
export const { chromium } = qaRequire('playwright')
export const AXE_SOURCE = readFileSync(qaRequire.resolve('axe-core/axe.min.js'), 'utf8')
export const LIGHTHOUSE_BIN = join(DIR, 'node_modules/.bin/lighthouse')

/** 헤드리스 크로미움 + 맥 Metal WebGPU(P6 확인: 캔버스 표시까지 된다). 리눅스면 QA_GPU_ARGS로 swiftshader 인자를 준다. */
export function launch(extra = []) {
  const gpu = process.env.QA_GPU_ARGS ? process.env.QA_GPU_ARGS.split(' ') : ['--enable-unsafe-webgpu', '--use-angle=metal']
  return chromium.launch({ headless: true, args: [...gpu, ...extra] })
}
