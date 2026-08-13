# HTML5 게임 포털 임베드 (CrazyGames Basic Launch 검증) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 sandlab.app과 완전히 분리된 최소 Vite 빌드(`portal/`)를 만들어 CrazyGames Basic
Launch(SDK 없는 2주 무료 체험)에 제출할 수 있는 상태로 검증한다.

**Architecture:** 새 디렉토리 `portal/`에 독립 Vite+React+TS 패키지를 만들고, 검증된 시뮬 코어
(`../src/lib/sand/{engine,materials,shader,record}.ts`)를 수정 없이 상대경로로 재사용한다. UI는
`SandCanvas.tsx`를 참고해 새로 작성하되 네트워크(`gallery.ts`/`creator.ts`/`urlState.ts`)와 브랜드
노출(sandlab.app 텍스트·Ko-fi·AdSense)을 전부 제외한다.

**Tech Stack:** Vite, React 19, TypeScript, WebGPU, `mediabunny`(클립 리먹스).

## Global Constraints

- 격자 크기 1200×600 고정 — 메인 사이트와 동일 시뮬, 절대 변경 금지.
- sandlab.app 언급(텍스트·로고·링크) 완전 제거 — Poki가 외부 링크를 명시적으로 금지하고
  CrazyGames는 규정이 불명확하므로, 처음부터 브랜드를 안 넣어 두 포털 다 안전하게 대응.
- 이번 1단계는 광고 SDK 통합·라운드 경계 설계를 포함하지 않는다(비범위, 다음 라운드 판단 대상).
- `../src/lib/sand/engine.ts`·`materials.ts`·`shader.ts`·`record.ts`는 수정하지 않는다 — 상대경로
  import로 그대로 재사용(메인 사이트에 영향 없음, 이미 검증된 코드 재활용).
- `discovery.ts`(첫사용 토스트)·`milestones.ts`(부은 양 마일스톤)는 이번 범위에서 제외(YAGNI) —
  Basic Launch 반응이 좋으면 다음 라운드에 추가 검토.
- CrazyGames Basic Launch 기술 한도: 초기 다운로드 ≤50MB, 총 ≤250MB, 파일 수 ≤1500
  (`docs.crazygames.com/requirements/intro`).
- 워터마크 제거는 `engine.ts` 수정 없이 달성한다 — 녹화 시 `engine.recording` 플래그를 아예
  세팅하지 않으면 워터마크 합성 경로가 안 탄다(`engine.ts:304` 확인됨).

---

### Task 1: `portal/` 패키지 스캐폴딩

**Files:**
- Create: `portal/package.json`
- Create: `portal/vite.config.ts`
- Create: `portal/tsconfig.json`
- Create: `portal/index.html`
- Create: `portal/src/main.tsx`
- Create: `portal/.gitignore`

**Interfaces:**
- Consumes: 없음(첫 태스크).
- Produces: 빌드 가능한 최소 Vite+React 프로젝트. Task 2 이후가 `portal/src/App.tsx`를
  `main.tsx`에서 import해서 쓴다.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "sandlab-portal",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "mediabunny": "^1.50.8",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@webgpu/types": "^0.1.52",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: vite.config.ts 작성**

```ts
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
```

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["@webgpu/types"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["src", "../src/lib/sand/engine.ts", "../src/lib/sand/materials.ts", "../src/lib/sand/shader.ts", "../src/lib/sand/record.ts"]
}
```

- [ ] **Step 4: index.html 작성**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Sand</title>
    <style>
      html, body, #root { margin: 0; height: 100%; background: #07090d; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: main.tsx 작성 (임시 placeholder — Task 2에서 실제 App으로 교체)**

```tsx
import { createRoot } from 'react-dom/client'

function App() {
  return <div style={{ color: '#eef1f6', padding: 20, fontFamily: 'system-ui' }}>placeholder</div>
}

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 6: .gitignore 작성**

```
node_modules/
dist/
```

- [ ] **Step 7: 설치 및 빌드 확인**

Run:
```bash
cd portal && npm install && npm run build
```
Expected: 성공, `portal/dist/index.html` + `portal/dist/assets/*` 생성됨.

- [ ] **Step 8: Commit**

```bash
git add portal/package.json portal/vite.config.ts portal/tsconfig.json portal/index.html portal/src/main.tsx portal/.gitignore
git commit -m "chore(portal): scaffold minimal Vite package for game-portal build"
```

(참고: `portal/package-lock.json`도 `npm install`이 생성하면 같이 커밋한다. `portal/node_modules/`·
`portal/dist/`는 `.gitignore`로 제외됨.)

---

### Task 2: 엔진 라이프사이클 + 폴백 상태

**Files:**
- Create: `portal/src/App.tsx`
- Modify: `portal/src/main.tsx` (placeholder를 실제 App으로 교체)

**Interfaces:**
- Consumes: `../src/lib/sand/engine.ts`의 `SandEngine`(`new SandEngine({canvas,width,height,materials})`,
  `.init(): Promise<void>`, `.start()`, `.destroy()`, `.onLost?: (info?) => void`, `.brush: {x,y,r,mat}`,
  `.clear()`, `.fps: number`), `WebGPUUnsupported` 에러 클래스; `../src/lib/sand/materials.ts`의
  `PRESETS: Material[]`, `buildIndex(mats): Map<string,number>`.
- Produces: `App` 컴포넌트가 `ready`/`err`/`lost` 상태와 `engineRef: RefObject<SandEngine|null>`를
  들고 있다. Task 3(그리기 UI)과 Task 4(녹화)가 이 `engineRef`와 `ready` 상태를 그대로 쓴다.

- [ ] **Step 1: App.tsx — 엔진 초기화 + 상태만 먼저 작성 (그리기·팔레트는 Task 3에서)**

```tsx
import { useEffect, useRef, useState } from 'react'
import { SandEngine, WebGPUUnsupported } from '../../src/lib/sand/engine'
import { PRESETS, buildIndex } from '../../src/lib/sand/materials'

const W = 1200
const H = 600

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SandEngine | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [lost, setLost] = useState(false)
  const [ready, setReady] = useState(false)
  const idx = useRef(buildIndex(PRESETS))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false

    const eng = new SandEngine({ canvas, width: W, height: H, materials: PRESETS })
    eng.onLost = () => {
      if (!disposed) setLost(true)
    }
    eng
      .init()
      .then(() => {
        if (disposed) return
        engineRef.current = eng
        eng.start()
        setReady(true)
      })
      .catch((e) => {
        if (!disposed) setErr(e instanceof WebGPUUnsupported ? e.message : String(e))
      })

    return () => {
      disposed = true
      eng.destroy()
      engineRef.current = null
    }
  }, [])

  if (lost) {
    return (
      <div style={S.errWrap}>
        <div style={S.errCard}>
          <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>The GPU was interrupted</h2>
          <p style={{ margin: '0 0 16px', opacity: 0.72, fontSize: 14, lineHeight: 1.55 }}>
            Reload to pick up where the sandbox left off.
          </p>
          <button onClick={() => location.reload()} style={S.reloadBtn}>
            Reload
          </button>
        </div>
      </div>
    )
  }

  if (err) {
    return (
      <div style={S.errWrap}>
        <div style={S.errCard}>
          <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>This browser can&apos;t run the sandbox</h2>
          <p style={{ margin: 0, opacity: 0.72, fontSize: 14, lineHeight: 1.55 }}>{err}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={S.root}>
      <canvas ref={canvasRef} width={W} height={H} style={S.canvas} onContextMenu={(e) => e.preventDefault()} />
      {!ready && <div style={S.loading}>Loading…</div>}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  root: { position: 'fixed', inset: 0, background: '#07090d' },
  canvas: { width: '100%', height: '100%', display: 'block', touchAction: 'none' },
  loading: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#eef1f6', opacity: 0.6, fontFamily: 'system-ui', fontSize: 14,
  },
  errWrap: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090d' },
  errCard: { maxWidth: 360, padding: 24, color: '#eef1f6', fontFamily: 'system-ui', textAlign: 'center' },
  reloadBtn: { background: '#f5a623', border: 'none', borderRadius: 7, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' },
}
```

- [ ] **Step 2: main.tsx를 실제 App으로 교체**

```tsx
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 3: typecheck**

Run: `cd portal && npx tsc --noEmit`
Expected: 에러 없음. (`@webgpu/types`가 devDependency에 있어야 `GPUDevice` 등 전역 타입이 인식됨 —
Task 1에서 이미 추가함.)

- [ ] **Step 4: 실행 확인 (실브라우저 — WebGPU라 헤드리스 불가)**

Run: `cd portal && npm run dev` (별도 터미널에 띄운 채)
`connect-chrome`으로 `http://localhost:5173`(Vite 기본 포트) 스크린샷 확인 — 검은 캔버스가 보이고
콘솔에 에러가 없어야 한다(아직 그리기 기능은 없음, Task 3에서 추가).

- [ ] **Step 5: Commit**

```bash
git add portal/src/App.tsx portal/src/main.tsx
git commit -m "feat(portal): wire up SandEngine lifecycle with error/lost fallbacks"
```

---

### Task 3: 그리기 인터랙션 + 재료 팔레트

**Files:**
- Modify: `portal/src/App.tsx`

**Interfaces:**
- Consumes: Task 2의 `engineRef`, `ready`, `idx`(`Map<string,number>`), `W`/`H` 상수. `PRESETS`의
  `Material` 필드(`slug`, `name`, `color`, `emissive`, `movement`) — `../src/lib/sand/materials.ts`
  기존 정의 그대로.
- Produces: 클릭/드래그로 그리기 가능한 캔버스, 재료 선택, 브러시 크기, 지우개, Clear. Task 4
  (녹화 버튼)가 같은 하단 도크 UI에 버튼 하나를 추가한다.

- [ ] **Step 1: 상태·팔레트 상수·포인터 핸들러 추가**

`App` 함수 안, `const idx = useRef(...)` 줄 뒤에 추가:

```tsx
  const [sel, setSel] = useState('sand')
  const [radius, setRadius] = useState(6)
  const [erasing, setErasing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const PAINTABLE = PRESETS.filter((m) => m.slug !== 'empty')

  useEffect(() => {
    const eng = engineRef.current
    if (eng) eng.brush.r = radius
  }, [radius, ready])

  const toGrid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * W),
      y: Math.floor(((e.clientY - r.top) / r.height) * H),
    }
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const eng = engineRef.current
    if (!eng) return
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
    const isErase = erasing || e.button === 2
    eng.brush.mat = isErase ? 0 : (idx.current.get(sel) ?? 0)
    if (!hasDrawn) setHasDrawn(true)
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (!eng || eng.brush.mat === 0xffffffff) return
    const { x, y } = toGrid(e)
    eng.brush.x = x
    eng.brush.y = y
  }

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const eng = engineRef.current
    if (eng) eng.brush.mat = 0xffffffff
  }
```

- [ ] **Step 2: 캔버스에 포인터 이벤트 연결 + 온보딩 힌트**

`return (...)`의 정상 렌더 블록에서 `<canvas .../>`를 교체:

```tsx
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={S.canvas}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      {!ready && <div style={S.loading}>Loading…</div>}
      {ready && !hasDrawn && <div style={S.onboard}>Click and drag to pour sand</div>}
```

- [ ] **Step 3: 팔레트·브러시크기·지우개·Clear 도크 추가**

같은 `return` 블록의 최상위 `<div style={S.root}>` 안, 캔버스 다음에 추가:

```tsx
      <div style={S.dock}>
        <div style={S.chips}>
          {PAINTABLE.map((m) => {
            const on = sel === m.slug
            return (
              <button
                key={m.slug}
                onClick={() => { setSel(m.slug); setErasing(false) }}
                title={m.name}
                aria-pressed={!erasing && on}
                style={{
                  ...S.chip,
                  background: m.color,
                  transform: on ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: on ? `0 0 0 2px #0b0e13, 0 0 0 3.5px #fff` : 'inset 0 0 0 1px #ffffff22',
                }}
              />
            )
          })}
        </div>
        <label style={S.sizeWrap}>
          <input type="range" min={1} max={24} value={radius} onChange={(e) => setRadius(+e.target.value)} style={S.range} />
        </label>
        <button
          style={{ ...S.ghost, ...(erasing ? S.ghostActive : null) }}
          onClick={() => setErasing((v) => !v)}
          aria-pressed={erasing}
        >
          Erase
        </button>
        <button style={S.ghost} onClick={() => engineRef.current?.clear()}>
          Clear
        </button>
      </div>
```

- [ ] **Step 4: 도크·칩 스타일 추가**

`const S: Record<...> = {...}` 객체에 추가:

```tsx
  onboard: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    color: '#eef1f6', opacity: 0.55, fontSize: 14, fontFamily: 'system-ui', pointerEvents: 'none',
  },
  dock: {
    position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 10,
    flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(11,14,19,0.85)', backdropFilter: 'blur(6px)',
  },
  chips: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chip: { width: 19, height: 19, borderRadius: '50%', border: 'none', cursor: 'pointer' },
  sizeWrap: { display: 'flex', alignItems: 'center' },
  range: { width: 90 },
  ghost: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: '#eef1f6',
    borderRadius: 7, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'system-ui',
  },
  ghostActive: { background: 'rgba(255,255,255,0.14)' },
```

- [ ] **Step 5: typecheck**

Run: `cd portal && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 실브라우저 확인**

`npm run dev` 띄운 채 `connect-chrome`으로 접속 → 재료 칩 클릭 → 캔버스 드래그로 그려지는지,
Clear가 지우는지, Erase 토글이 동작하는지 스크린샷으로 확인.

- [ ] **Step 7: Commit**

```bash
git add portal/src/App.tsx
git commit -m "feat(portal): add drawing interaction, material palette, clear/erase"
```

---

### Task 4: 클립 녹화 + 로컬 다운로드 (워터마크 없음)

**Files:**
- Modify: `portal/src/App.tsx`

**Interfaces:**
- Consumes: `../src/lib/sand/record.ts`의 `recordClip(opts): Promise<Clip>`,
  `downloadClip(clip, name?)`, `RecordUnsupported` 에러 클래스. Task 2의 `canvasRef`, `engineRef`.
- Produces: 없음(터미널 기능 — 이후 태스크가 소비하지 않음).

- [ ] **Step 1: 녹화 상태·핸들러 추가**

`App` 함수 안, Task 3에서 추가한 상태들 뒤에 추가:

```tsx
  const [rec, setRec] = useState<number | null>(null)

  const record = async () => {
    const canvas = canvasRef.current
    if (!canvas || rec !== null) return
    setRec(0)
    try {
      // engine.recording을 세팅하지 않는다 — engine.ts의 워터마크 합성은 그 플래그가 true일 때만
      // 동작하므로(engine.ts:304), 여기서 안 켜면 클립에 워터마크가 전혀 안 들어간다. sandlab.app
      // 브랜드를 완전히 뺀다는 이번 설계 결정(스펙 참조)이 코드 변경 없이 그대로 지켜진다.
      const { recordClip, downloadClip } = await import('../../src/lib/sand/record')
      const clip = await recordClip({ canvas, durationMs: 10000, onProgress: setRec })
      downloadClip(clip, `sand-${Date.now()}`)
    } catch {
      /* 녹화 미지원 브라우저 — 조용히 무시. 이 빌드엔 토스트 UI가 없어 콘솔 에러로 충분 */
    } finally {
      setRec(null)
    }
  }
```

- [ ] **Step 2: 도크에 Record 버튼 추가**

Task 3 Step 3에서 추가한 도크의 `Clear` 버튼 뒤에 추가:

```tsx
        <button style={S.ghost} onClick={record} disabled={rec !== null}>
          {rec === null ? 'Record' : `Recording… ${Math.round(rec * 100)}%`}
        </button>
```

- [ ] **Step 3: typecheck**

Run: `cd portal && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 실브라우저로 녹화·다운로드·워터마크 없음 확인**

`npm run dev` 띄운 채 `connect-chrome`으로 접속 → 그림 그리기 → Record 클릭 → 10초 대기 →
다운로드된 mp4 파일을 직접 열어 화면 전체에 어떤 텍스트도 합성되어 있지 않은지 육안 확인
(스펙 리스크 항목: "sandlab.app 언급 완전 제거"가 실제로 지켜지는지의 마지막 검증 지점).

- [ ] **Step 5: Commit**

```bash
git add portal/src/App.tsx
git commit -m "feat(portal): add local clip recording without watermark"
```

---

### Task 5: 빌드 크기 검증 + 제출 준비물

**Files:** 없음(검증 + 문서화 단계).

- [ ] **Step 1: 프로덕션 빌드**

Run: `cd portal && npm run build`
Expected: 성공.

- [ ] **Step 2: 크기·파일 수 측정**

Run:
```bash
du -sh portal/dist
find portal/dist -type f | wc -l
```
Expected: CrazyGames Basic Launch 한도(초기 다운로드 ≤50MB, 총 ≤250MB, 파일 수 ≤1500) 대비
여유 있게 통과. 통과 못 하면(가능성 낮음 — 메인 사이트도 1.6MB/30개 파일이었음) 원인을 조사해
보고할 것, 임의로 파일을 지우지 말 것.

- [ ] **Step 3: 전체 흐름 최종 스모크 (실브라우저)**

`npx vite preview`(프로덕션 빌드 그대로 서빙) 띄운 채 `connect-chrome`으로 접속 → 그리기·재료
전환·Erase·Clear·Record→다운로드까지 전체 플로우를 한 번 더 확인. 콘솔에 에러가 없는지도 확인.

- [ ] **Step 4: Commit (있다면 — 이 태스크는 보통 코드 변경 없음, 스킵 가능)**

변경 사항이 없으면 커밋하지 않는다.

---

### Task 6: 제출 (needsUser)

**Files:** 없음(운영 단계 — 에이전트가 실행 불가).

- [ ] **Step 1: CrazyGames 개발자 계정 생성 (사용자 직접)**

https://developer.crazygames.com 에서 계정 생성.

- [ ] **Step 2: zip 패키징**

Run: `cd portal/dist && zip -r ../sandlab-portal.zip .`

- [ ] **Step 3: 제출 (사용자 직접)**

개발자 포털에 `portal/sandlab-portal.zip` 업로드, 제목·설명·썸네일(기존 `public/og.png` 등 활용
가능, 단 sandlab.app 텍스트가 안 박힌 것으로)·플레이 방법 입력, "Basic Launch"로 제출.

- [ ] **Step 4: 결과 관찰 (2주 뒤)**

Basic Launch 노출·반응(플레이 수·체류시간 등 CrazyGames 대시보드 제공 지표)을 보고 2단계(광고
SDK 통합·Full Launch) 착수 여부를 다음 세션에서 재판단. 이 판단은 코드 작업이 아니라
`.claude/team/references/monetization.md`에 결과를 기록하고 팀 회의로 다시 논의할 것.

## 셀프 리뷰 메모

- **스펙 커버리지**: A(패키지 구조/빌드) → Task 1, B(UI 범위 — 포함/제외 목록) → Task 2~4가 "포함"
  항목만 정확히 구현하고 "제외" 항목(gallery.ts/creator.ts/urlState.ts/discovery.ts/milestones.ts
  import 없음)을 지킴, C(검증/제출) → Task 5~6. 리스크 항목("워터마크 미노출 확인")은 Task 4
  Step 4에서 명시적으로 검증.
- **타입 일관성**: `engineRef`/`ready`/`idx`(Task 2) → Task 3·4가 동일 이름으로 그대로 소비.
  `SandEngine`/`recordClip`/`downloadClip` 시그니처는 실제 소스 파일(`engine.ts`/`record.ts`)에서
  그대로 가져옴 — 새로 지어낸 인터페이스 없음.
- **플레이스홀더 스캔**: 없음 — 모든 스텝에 실제 코드 또는 실행 가능한 명령이 있음. Task 5 Step 4는
  "코드 변경 없으면 스킵"이라 명시해 빈 커밋을 방지.
