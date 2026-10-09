# Phase 2 — 챌린지 코어 + 레벨 10개 + /play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 목표+예산 퍼즐 모드를 만든다 — 레벨 데이터 → 초기 격자, 플레이어 붓질 잉크 계산, 목표 판정(2초 유지), 별점, 진행 저장, `/play` 목록·`/play/[id]` 플레이·`/play/verify` 실크롬 일괄 검증, 레벨 10개.

**Architecture:** 판정·잉크·격자·진행은 `src/lib/challenge/`의 순수 TS(테스트 가능, 포털 재사용). 엔진엔 최소 변경 3개(`paintEmptyOnly` 플래그, `resetTick()`, 틱 훅 `onTick`+`stepsPerFrame`). UI는 기존 `SandCanvas`를 건드리지 않고 엔진을 직접 쓰는 새 `ChallengePlayer` 컴포넌트.

**Tech Stack:** Next.js 15 정적 export, React 19, WebGPU(WGSL), vitest, claude-in-chrome(실크롬 검증).

**Spec:** `docs/superpowers/specs/2026-10-09-challenge-mode-design.md` (§1 코어, §2 라우트, §7 레벨, §8 테스트, §9 단계 2)

## Global Constraints

- 격자 1200×600 고정. 레벨 좌표는 격자 좌표.
- 엔진의 물리 규칙(shouldSink/react/age) 변경 금지 — 이번 변경은 입력 마스크·틱 제어뿐. 변경 후 `node scripts/verify-margolus.mjs` 9/9.
- 셀 인코딩 `mat | life<<16`(셰이더 `mk`), 재료 ID = `PRESETS` 인덱스.
- 클리어 = 모든 목표가 판정 4회 연속(0.5초 간격 ≈ 2초) 충족. 판정은 readback 기반, 중첩 금지.
- 잉크 = 플레이어 붓질 캡슐이 덮은 **고유 격자 픽셀 수**(재료별), 가장자리 확률 침식 무시.
- 챌린지 모드: 지우개 없음, Reset만, 실패 상태 없음.
- localStorage 접근은 전부 try/catch(실패해도 플레이 정상).
- 광고: `/play`(목록) ✅, `/play/[id]`·`/play/verify` ❌. `/play/verify`는 `noindex`, sitemap 제외.
- 영어 UI. 스타일은 인라인(기존 컨벤션), 배경 `#07090D`, 글자 `#eef1f6`.
- AdSense 재심사 대기 중 — 이 브랜치는 main에 병합·배포하지 않는다(사용자 승인 전).
- 검증: `pnpm test`, `pnpm typecheck`, `pnpm build`, `node scripts/verify-ads.mjs`, `node scripts/verify-margolus.mjs`.

## Review Focus

- 레벨 시작 직후(첫 readback 전) 판정이 "충족"으로 잘못 나오면 아무것도 안 해도 클리어된다 → `ClearTracker`는 판정 결과를 받기 전엔 미충족, `protect`는 초기 카운트 0이면 미충족(Task 2).
- 잉크 예산을 다 쓴 뒤에도 같은 획이 계속 칠해지면 예산이 무의미 → 획 도중 소진 시 즉시 브러시 해제(Task 5).
- Reset 후 이전 판정 readback이 늦게 도착해 새 판에 반영되면 즉시 클리어/오판 → 판정 세대(generation) 번호로 늦은 결과 폐기(Task 5).
- `paintEmptyOnly`인데 레벨 구조물 위에 칠한 잉크가 안 세지면 예산 우회 → 잉크는 칠 성공 여부와 무관하게 캡슐 면적으로 센다(Task 2).
- 같은 레벨 진행 저장이 더 나쁜 기록으로 덮이면 별이 줄어든다 → `saveBest`는 별 많은 쪽, 같으면 잉크 적은 쪽만 저장(Task 2).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/lib/sand/params.ts` (신규) + test | 엔진 uniform 64B 패킹 순수 함수 |
| `src/lib/sand/shader.ts` (수정) | `Params.paintEmptyOnly`, paint 마스크 |
| `src/lib/sand/engine.ts` (수정) | `paintEmptyOnly`, `resetTick()`, `onTick`, `stepsPerFrame`, `currentTick` |
| `src/lib/challenge/types.ts` | Level/Shape/Goal/Stroke 타입 |
| `src/lib/challenge/grid.ts` + test | `buildGrid(level)` → Uint32Array |
| `src/lib/challenge/judge.ts` + test | 목표 레지스트리, `countZone`, `judge`, `describeGoal` |
| `src/lib/challenge/ink.ts` + test | `InkMeter` 재료별 고유 픽셀 비트셋 |
| `src/lib/challenge/clear.ts` + test | `ClearTracker`(연속 4회), `starsFor` |
| `src/lib/challenge/progress.ts` + test | localStorage 최고 기록 |
| `src/lib/challenge/replay.ts` + test | 모범답안 Stroke[] → 틱별 브러시 상태 |
| `src/lib/challenge/levels/*.ts`, `levels/index.ts` + test | 레벨 10개 데이터 + 정합성 |
| `src/components/ChallengePlayer.tsx` | 캔버스·HUD·칩·Reset·Hint·클리어 카드 |
| `src/app/play/page.tsx`, `src/app/play/[id]/page.tsx`, `src/app/play/verify/page.tsx` | 라우트 |
| `src/components/LevelVerifier.tsx` | `/play/verify` 클라이언트 일괄 검증 |
| `src/components/SandCanvas.tsx` (수정, 1곳) | 헤더 nav에 `Challenges` 링크 |
| `src/app/sitemap.ts`, `scripts/verify-ads.mjs` (수정) | /play 등록, 광고 허용 |

---

### Task 1: 엔진 — paintEmptyOnly · resetTick · onTick · stepsPerFrame

**Files:**
- Create: `src/lib/sand/params.ts`, `src/lib/sand/params.test.ts`
- Modify: `src/lib/sand/shader.ts` (COMMON `Params` struct, `paint`), `src/lib/sand/engine.ts` (`writeParams`, `step`, params buffer size 48→64, 새 필드/메서드)

**Interfaces:**
- Produces:
  ```ts
  // params.ts
  export interface ParamsState { W: number; H: number; offset: number; tick: number; matCount: number
    brushX: number; brushY: number; brushR: number; brushMat: number; prevX: number; prevY: number
    recording: boolean; paintEmptyOnly: boolean }
  export const PARAMS_BYTES = 64
  export function packParams(s: ParamsState): ArrayBuffer
  // engine.ts (SandEngine 추가 멤버)
  paintEmptyOnly: boolean            // 기본 false
  stepsPerFrame: number              // 기본 1. >1이면 프레임당 sim+paint를 N번, 렌더 1번(검증용)
  onTick?: (tick: number) => void    // 각 시뮬 틱 직전 호출 — 리플레이가 brush를 틱 단위로 세팅
  get currentTick(): number
  resetTick(): void                  // tick=0, cur=0, prev 리셋
  ```

- [ ] **Step 1: params 패킹 테스트**

`src/lib/sand/params.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { packParams, PARAMS_BYTES } from './params'

const base = { W: 1200, H: 600, offset: 1, tick: 7, matCount: 19, brushX: 10, brushY: -1, brushR: 6,
  brushMat: 0xffffffff, prevX: -1, prevY: 20, recording: true, paintEmptyOnly: true }

describe('packParams', () => {
  it('64바이트(WGSL uniform 16바이트 정렬)', () => {
    expect(PARAMS_BYTES).toBe(64)
    expect(packParams(base).byteLength).toBe(64)
  })
  it('셰이더 Params 필드 순서대로 u32/i32를 쓴다', () => {
    const b = packParams(base)
    const u = new Uint32Array(b)
    const i = new Int32Array(b)
    expect([u[0], u[1], u[2], u[3], u[4]]).toEqual([1200, 600, 1, 7, 19])
    expect([i[5], i[6], i[7]]).toEqual([10, -1, 6])
    expect(u[8]).toBe(0xffffffff)
    expect([i[9], i[10]]).toEqual([-1, 20])
    expect(u[11]).toBe(1)
    expect(u[12]).toBe(1) // paintEmptyOnly
  })
  it('플래그 false는 0', () => {
    const u = new Uint32Array(packParams({ ...base, recording: false, paintEmptyOnly: false }))
    expect([u[11], u[12]]).toEqual([0, 0])
  })
})
```
Run `pnpm vitest run src/lib/sand/params.test.ts` → FAIL(모듈 없음).

- [ ] **Step 2: `params.ts` 구현**
```ts
/** 엔진 uniform(Params) 패킹 — shader.ts COMMON의 struct Params와 필드 순서·크기가 1:1이어야 한다. */
export interface ParamsState {
  W: number; H: number; offset: number; tick: number; matCount: number
  brushX: number; brushY: number; brushR: number; brushMat: number; prevX: number; prevY: number
  recording: boolean; paintEmptyOnly: boolean
}
/** 13개 필드(52B)를 uniform 정렬(16B)에 맞춰 64B로 패딩. */
export const PARAMS_BYTES = 64
export function packParams(s: ParamsState): ArrayBuffer {
  const p = new ArrayBuffer(PARAMS_BYTES)
  const u = new Uint32Array(p)
  const i = new Int32Array(p)
  u[0] = s.W; u[1] = s.H; u[2] = s.offset; u[3] = s.tick; u[4] = s.matCount
  i[5] = s.brushX; i[6] = s.brushY; i[7] = s.brushR
  u[8] = s.brushMat
  i[9] = s.prevX; i[10] = s.prevY
  u[11] = s.recording ? 1 : 0
  u[12] = s.paintEmptyOnly ? 1 : 0
  return p
}
```
Run → PASS.

- [ ] **Step 3: 셰이더** — `shader.ts` COMMON의 struct를
```wgsl
struct Params {
  width : u32, height : u32, offset : u32, tick : u32,
  matCount : u32, brushX : i32, brushY : i32, brushR : i32,
  brushMat : u32, brushPX : i32, brushPY : i32, recording : u32,
  paintEmptyOnly : u32, _p0 : u32, _p1 : u32, _p2 : u32,
};
```
로 바꾸고, `paint`의 마지막 줄 `dst[idx(x, y)] = ...` 바로 앞에:
```wgsl
  // 챌린지 모드: 레벨 구조물·기존 재료를 덮어 지우지 못하게 빈 칸에만 칠한다.
  if (P.paintEmptyOnly == 1u && matOf(dst[idx(x, y)]) != EMPTY) { return; }
```

- [ ] **Step 4: 엔진** — `engine.ts`:
  - `import { packParams, PARAMS_BYTES } from './params'`; params 버퍼 `size: PARAMS_BYTES`.
  - `writeParams(offset)` 본문을 `this.device.queue.writeBuffer(this.params, 0, packParams({ W: this.W, H: this.H, offset, tick: this.tick, matCount: this.mats.length, brushX: this.brush.x, brushY: this.brush.y, brushR: this.brush.r, brushMat: this.brush.mat, prevX: this.prev.x < 0 ? this.brush.x : this.prev.x, prevY: this.prev.y < 0 ? this.brush.y : this.prev.y, recording: this.recording, paintEmptyOnly: this.paintEmptyOnly }))`로.
  - 필드: `paintEmptyOnly = false`, `stepsPerFrame = 1`, `onTick?: (tick: number) => void`, `get currentTick() { return this.tick }`, `resetTick() { this.tick = 0; this.cur = 0; this.prev.x = -1; this.prev.y = -1 }`.
  - `step(t)`: 시뮬+브러시 부분을 `for (let k = 0; k < this.stepsPerFrame; k++)` 루프로 감싸고, 루프 첫 줄에서 `this.onTick?.(this.tick)` 호출 → `writeParams(this.tick % 2)` → 커맨드 인코더로 sim+paint 패스 → `queue.submit` → prev 갱신 → `cur = 1 - cur; tick++`. 블룸·렌더는 루프 뒤 1회(마지막 `1 - cur` 기준, 기존 바인드 그룹 사용). 기존 단일 스텝 경로와 동작 동일해야 한다(stepsPerFrame=1).
  - 주의: writeParams는 queue.writeBuffer라 같은 프레임 안에서 여러 번 쓰면 각 submit 전에 반영돼야 한다 → 스텝마다 `writeParams` 후 해당 스텝 인코더를 **개별 submit**한다.

- [ ] **Step 5: 검증 + 커밋**
Run: `pnpm test && pnpm typecheck && node scripts/verify-margolus.mjs` → 전부 PASS, 9/9.
```bash
git add src/lib/sand/params.ts src/lib/sand/params.test.ts src/lib/sand/shader.ts src/lib/sand/engine.ts
git commit -m "feat(engine): 챌린지용 paintEmptyOnly·resetTick·onTick·stepsPerFrame (params 64B 순수 패킹)"
```
(실크롬 시각 확인은 Task 6에서 플레이와 함께.)

---

### Task 2: 챌린지 코어 순수 모듈

**Files:** Create `src/lib/challenge/{types,grid,judge,ink,clear,progress,replay}.ts` + 각 `.test.ts`

**Interfaces (Produces):**
```ts
// types.ts
export type Zone = { x: number; y: number; w: number; h: number } | 'all'
export type Shape =
  | { kind: 'rect'; mat: string; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; mat: string; x: number; y: number; r: number }
  | { kind: 'line'; mat: string; x0: number; y0: number; x1: number; y1: number; t: number }
export type Goal =
  | { type: 'fill'; zone: Zone; mat: string; min: number }
  | { type: 'clear'; zone: Zone; mat: string }
  | { type: 'reach'; zone: Zone; mat: string }
  | { type: 'protect'; zone: Zone; mat: string; min: number }
export interface Stroke { tick: number; mat: string; r: number; pts: [number, number][] } // pts[k] = tick+k의 브러시 위치
export interface Level { v: 1; id: string; title: string; blurb: string; hint: string; shapes: Shape[]
  palette: Record<string, number>; goals: Goal[]; stars: [number, number]; solution: Stroke[] }
export interface GoalStatus { met: boolean; progress: number } // progress 0..1
// grid.ts
export const GRID_W = 1200, GRID_H = 600
export function buildGrid(level: Level): Uint32Array<ArrayBuffer>
// judge.ts
export function countZone(cells: Uint32Array, zone: Zone, matId: number): { n: number; area: number }
export function initialCounts(cells: Uint32Array, level: Level): number[]   // goals 순서대로 protect용 초기 개수(나머지 0)
export function judge(cells: Uint32Array, level: Level, init: number[]): GoalStatus[]
export function describeGoal(g: Goal): string   // HUD·레벨 페이지 문구
// ink.ts
export class InkMeter { constructor(palette: Record<string, number>)
  stamp(mat: string, x0: number, y0: number, x1: number, y1: number, r: number): number // 새로 덮은 픽셀 수
  used(mat: string): number; left(mat: string): number; total(): number; reset(): void }
// clear.ts
export const CLEAR_STREAK = 4
export class ClearTracker { push(statuses: GoalStatus[]): boolean /* 이번 push로 클리어 */; get cleared(): boolean; reset(): void }
export function starsFor(totalInk: number, stars: [number, number]): 1 | 2 | 3
// progress.ts
export interface Best { stars: 1 | 2 | 3; ink: number }
export function loadProgress(): Record<string, Best>
export function saveBest(levelId: string, b: Best): Best   // 저장 후 최종 best 반환
// replay.ts
export function brushAt(solution: Stroke[], tick: number, idx: Map<string, number>): { x: number; y: number; r: number; mat: number } | null
```

정의:
- `buildGrid`: 전부 EMPTY(0)로 시작해 shapes 순서대로 칠한다. 격자 밖은 클리핑. 셀 값 = `matId | (lifetime ?? 0) << 16` (lifetime null이면 0). `circle`은 `(dx²+dy² ≤ r²)`, `line`은 선분까지 거리 ≤ t/2.
- `countZone`: zone 내 `cells[i] & 0xffff === matId` 개수와 zone 면적(격자 클리핑 후).
- 목표 판정: fill = `n/area ≥ min`(progress = min(1, ratio/min)); clear = `n === 0`(progress = n===0?1:0); reach = `n ≥ 1`; protect = `init>0 && n/init ≥ min`(progress = init? min(1,(n/init)/min) : 0).
- `InkMeter.stamp`: 선분 (x0,y0)-(x1,y1)까지 거리² ≤ r²인 격자 픽셀 중 해당 재료 비트셋에 없던 것만 세고 표시. 반환값은 새 픽셀 수. 팔레트에 없는 재료는 0 반환·무시.
- `ClearTracker.push`: 모든 met이면 streak++, 아니면 0. streak가 처음 `CLEAR_STREAK`에 도달한 push에서만 true. cleared 이후엔 false.
- `starsFor`: `ink ≤ stars[0]`→3, `≤ stars[1]`→2, 그 외 1.
- `saveBest`: 기존보다 별이 많거나, 별이 같고 잉크가 적을 때만 덮어쓴다. 키 `sandlab.challenge.v1`. 실패해도 throw 안 함.
- `brushAt`: tick이 어떤 stroke의 `[tick, tick+pts.length)` 안이면 그 점과 재료 id, 아니면 null.

- [ ] **Step 1~N (TDD, 모듈마다):** 각 `.test.ts`를 먼저 쓰고 FAIL 확인 → 구현 → PASS. 최소 테스트:
  - grid: rect가 지정 범위만 칠함, 나중 도형이 덮음, 격자 밖 클리핑(음수 x), fire 셀에 수명 45 인코딩(`>>>16 === 45`), circle 경계.
  - judge: fill 정확히 min → met, 그보다 1셀 적으면 not met; clear 빈 zone(n=0) → met; reach 1셀 → met; protect init 0 → not met(Review Focus); `'all'` zone 면적 = 720000; describeGoal이 재료 이름(Name)을 포함.
  - ink: 같은 점 두 번 stamp → 두 번째 0; 수평 선분 r=0 길이 10 → 11픽셀; 경계 밖 클리핑; left = budget - used, 음수 아님(0으로 바닥); 팔레트 밖 재료 0.
  - clear: met 3번 → false, 4번째 → true, 5번째 → false; 중간에 미충족 → 리셋; 빈 statuses 배열 → met 아님.
  - progress: localStorage 없음(throw하는 stub) → loadProgress `{}`, saveBest 예외 없음; 더 나쁜 기록 무시(Review Focus); 같은 별·더 적은 잉크 갱신.
  - replay: 범위 안/밖, 두 stroke 겹침 시 먼저 정의된 것.
- [ ] **커밋:** `git commit -m "feat(challenge): 코어 순수 모듈 — 격자·판정·잉크·클리어·진행·리플레이"`

---

### Task 3: 레벨 10개 + 정합성 테스트

**Files:** Create `src/lib/challenge/levels/{l01..l10}.ts`, `levels/index.ts` (`export const LEVELS: Level[]`, `levelById(id)`), `levels/levels.test.ts`

**정합성 테스트(먼저):** id 유일·`/^[a-z0-9-]+$/`; 모든 shape/goal zone이 격자 안; 팔레트·shape·goal·solution 재료 slug가 `PRESETS`에 존재; `stars[0] < stars[1] ≤ Σpalette`; `v === 1`; 모범답안 잉크(InkMeter로 계산, 재료별) ≤ 해당 재료 예산이고 총합 ≤ `stars[0]`; blurb ≥ 40단어, hint 비어있지 않음; **모범답안 재료는 팔레트 안**; 초기 격자(buildGrid)에서 judge가 이미 전부 met이면 실패(시작부터 클리어 금지).

**레벨 설계 원칙:** 1~3 튜토리얼(재료 1종·목표 1개), 이후 반응 조합 + protect. 방치 클리어 불가. 모든 수치는 Task 6 실크롬 검증 후 튜닝(그 튜닝은 ledger Ruling).

| id | 제목 | 핵심 | 목표 | 팔레트 |
|---|---|---|---|---|
| fill-cup | Fill the cup | 물 붓기 | fill(cup, water, 0.8) | water |
| sand-ramp | Over the wall | 모래 경사로로 물을 넘긴다 | reach(target, water) | sand, water |
| put-out | Put out the fire | 물로 소화 | clear(zone, fire) + protect(house, wood, 0.6) — 나무 집은 불 옆, 연료는 기름 웅덩이 | water |
| lava-bridge | Bridge the lava | 물+용암→돌 | reach(far ledge, sand) | water, sand |
| acid-door | The acid door | 산으로 금속판 뚫기 | reach(lower chamber, water) | acid, water |
| grow-up | Grow up | 씨앗+물→식물 | reach(top line, plant) | seed, water |
| fuse | Light the fuse | 화약 도화선 | clear(zone, wood) — 멀리 있는 나무 더미 태우기, 불씨는 레벨에 작은 용암 | gunpowder |
| salt-dam | Salt dam | 소금 녹이기 | reach(basin, water) — 소금 둑 뒤 물 | water |
| ice-plug | Stop the flow | 얼음으로 용암 차단 | protect(village, wood, 0.7) — 용암이 흘러오는 경사 | ice |
| oil-slick | Fire across water | 기름 막으로 불 건너기 | clear(zone, wood) 건너편 나무 | oil |

각 레벨 파일은 shapes(벽·지형), palette 예산, goals, stars, solution(틱별 점)을 담는다. solution 틱은 0부터, 획 사이 간격 ≥ 30틱(낙하 대기).

- [ ] Step: 정합성 테스트 작성 → FAIL(LEVELS 없음) → 레벨 10개 작성 → PASS → 커밋 `feat(challenge): 레벨 10개 + 정합성 테스트`

---

### Task 4: /play/verify — 실크롬 일괄 검증기

**Files:** Create `src/components/LevelVerifier.tsx`, `src/app/play/verify/page.tsx`

동작(클라이언트, WebGPU 필요): 숨김 아닌 1200×600 캔버스 하나에 `SandEngine` 생성, `paintEmptyOnly=true`, `stepsPerFrame=8`. 레벨마다 두 런:
1. **solution run**: `upload(buildGrid)` → `resetTick()` → `onTick = t => { const b = brushAt(level.solution, t, idx); brush = b ?? 해제 }` → 매 30틱마다 readback+judge+ClearTracker(4연속, 즉 30틱 간격 4회). 최대 3600틱. 결과: cleared 여부·클리어 틱·InkMeter 총 잉크(모범답안으로 계산).
2. **idle run**: 붓질 없이 3600틱(≈60초 상당) → 그동안 한 번이라도 클리어되면 실패.
표: `id | solution ✅/❌ (tick) | idle ✅/❌ | ink / 3★ 기준`. 전부 통과 시 상단 `ALL PASS`. `window.__verify` 에 JSON 결과 노출(claude-in-chrome가 읽음). 페이지 metadata `robots: { index: false }`, ContentShell 미사용(광고 금지), sitemap 제외.

- [ ] Step: 구현 → `pnpm build` → 커밋 `feat(challenge): /play/verify 실크롬 일괄 검증기`

---

### Task 5: ChallengePlayer + /play + /play/[id]

**Files:** Create `src/components/ChallengePlayer.tsx`, `src/app/play/page.tsx`, `src/app/play/[id]/page.tsx`; Modify `scripts/verify-ads.mjs`(ALLOW에 `/^play\.html$/`), `src/app/sitemap.ts`(+`/play`, `/play/<id>` — 테스트 갱신), `src/components/SandCanvas.tsx`(헤더 nav에 `<a href="/play">Challenges</a>` 1줄)

ChallengePlayer(props `{ level: Level; nextId?: string }`):
- 엔진 init → `paintEmptyOnly=true` → `upload(buildGrid(level))`, `resetTick()`, `start()`. WebGPU 미지원 시 안내문 + 레벨 설명 표시.
- 포인터: 기존 toGrid 방식. 획마다 `ink.stamp(sel, prev, cur, r)`; 해당 재료 `left ≤ 0`이면 즉시 `brush.mat = 0xffffffff`(Review Focus). 오른쪽 클릭 무시.
- 판정 루프: 500ms 간격, 진행 중 readback 있으면 건너뜀, **generation 번호**(Reset마다 +1)로 늦은 결과 폐기(Review Focus). `judge` → HUD 진행률, `ClearTracker.push` true면 클리어 카드.
- HUD: 캔버스 위 절대배치 오버레이 — goal zone 점선 사각형(격자→표시 좌표 변환은 캔버스 rect 비율), 상단 목표 문구 + 진행률 %, 하단 팔레트 칩(재료색 점 + 이름 + 남은 잉크 바), 브러시 크기 3단(4/8/14), Reset, Hint(접힘 문구).
- 클리어 카드: 별점(★ 3개 중), 사용 잉크, 최고 기록(saveBest), `Next level`/`Play again`/`All levels`.
- /play/[id]: `generateStaticParams` = LEVELS, metadata(title·description=blurb, canonical), 본문: ChallengePlayer + 아래 정적 글(목표 describeGoal 목록, blurb, 사용 재료 → /materials 링크, 힌트는 `<details>`). 광고 없음(ContentShell ads={false} 대신 자체 레이아웃 — 캔버스 페이지).
- /play: ContentShell(광고 ✅), 소개 문단(규칙 설명 ≥120단어), 레벨 카드 10개(제목·한 줄·내 별점 — 별점은 클라이언트 컴포넌트로 hydrate 후 표시, 정적 HTML엔 제목·설명).

- [ ] Step: sitemap 테스트 갱신(RED) → 구현 → `pnpm test && pnpm typecheck && pnpm build && node scripts/verify-ads.mjs` → 커밋 `feat(challenge): ChallengePlayer + /play 목록·플레이 페이지`

---

### Task 6: 실크롬 검증 + 레벨 튜닝 (claude-in-chrome)

- [ ] `npx wrangler dev --port 8799 --local` 백그라운드.
- [ ] `/play/verify` 열고 `window.__verify` 읽기. 실패 레벨은 shapes/solution/budget/stars를 고쳐 재빌드·재검증(각 수정 ledger Ruling). 모든 레벨 solution ✅ + idle ✅까지 반복.
- [ ] `/play/fill-cup`, `/play/put-out`, `/play/acid-door` 직접 플레이: 구조물 위 칠하기 안 됨, 잉크 게이지 감소·소진 시 정지, Reset 즉시 초기화, 클리어 카드·별점·진행 저장(새로고침 후 /play 별 표시), 606px 폭 레이아웃.
- [ ] 메인 샌드박스 회귀: 일반 그리기·지우개가 이전과 동일(paintEmptyOnly 기본 false).
- [ ] `node scripts/verify-margolus.mjs` 9/9, 전체 테스트, 커밋 `chore(challenge): 실크롬 검증 통과 레벨 튜닝`.
