/**
 * 리디자인 v2 「Glass & Grain」 시험관 포스터 장면 정의 (계획서 4장·S7).
 *
 * 순수 데이터 + 순수 함수 — 브라우저 캡처 하네스(scripts/capture/posters.ts)가 실제 WebGPU 엔진
 * (src/lib/sand/engine.ts, 무수정)에 이 장면을 그대로 재생해 찍는다. 시안처럼 손으로 그린 텍스처가 아니라
 * '진짜로 부으면 이렇게 쌓인다'는 엔진 결과만 쓴다(0장: 가짜 정보 금지).
 *
 * 관 하나 = 96×192 셀 격자, 1셀 = 1px(@2x 기준 CSS 48×96). 홈 1200×600 화면에서 1셀≈1px인 실제 입자 크기와 같다.
 * (2px/셀로 키우면 기체의 2칸 주기 Margolus 줄무늬가 보여 실제와 달라 보인다 — 11-19 실측.) 엔진은 격자 밖을 벽으로 취급하므로 관 벽을 따로 두지 않는다.
 * 결정성: 엔진 난수는 (셀 좌표, 틱) 해시라 재료 배치(census)는 재실행해도 같다. 단 렌더 픽셀은 바이트 단위로
 * 같지 않을 수 있다 — 11-19 독립 리뷰 실측: 같은 명령 두 번에 용암 관만 265px(최대 채널차 75)가 달랐고 나머지는 동일.
 * 그래서 재캡처하면 바이너리가 바뀔 수 있다. 장면을 바꿨을 때만 다시 찍는다.
 */
import { PRESETS, buildIndex, EMPTY_ID } from '../sand/materials'

export const TUBE_W = 96
export const TUBE_H = 192
/** 관 속 재료가 차는 높이(셀). 위 30%는 비워 '유리 관'처럼 보이게. */
export const FILL_ROWS = 132
export const STRIP_FRAMES = 12

export type SceneKind = 'block' | 'pour' | 'rise'

export interface PosterScene {
  slug: string
  kind: SceneKind
  /** 엔진을 돌릴 총 틱 수. 마지막 틱 직후가 포스터 프레임. */
  ticks: number
  /** pour/rise: 브러시 재료를 칠하는 마지막 틱(이후엔 가라앉기만). */
  emitUntil: number
  /** pour: 재료 총량 상한(셀) — 엔진 inkCap으로 GPU가 정확히 끊는다. */
  ink: number
}

const IDX = buildIndex(PRESETS)

/** 포스터 대상 = 빈칸을 뺀 재료 전부(현재 18종), PRESETS 순서. */
export const POSTER_SLUGS: readonly string[] = PRESETS.filter((m) => IDX.get(m.slug) !== EMPTY_ID).map((m) => m.slug)

const POUR_INK = TUBE_W * FILL_ROWS

export function sceneFor(slug: string): PosterScene {
  const m = PRESETS[IDX.get(slug) ?? -1]
  if (!m || IDX.get(slug) === EMPTY_ID) throw new Error(`unknown poster material: ${slug}`)
  switch (m.movement) {
    case 'static':
      return { slug, kind: 'block', ticks: 2, emitUntil: 0, ink: 0 }
    case 'powder':
      return { slug, kind: 'pour', ticks: 1400, emitUntil: 1000, ink: POUR_INK }
    case 'liquid':
      // 액체는 수평 확산이 느리다(인계서 실측) — 가라앉는 시간을 넉넉히.
      return { slug, kind: 'pour', ticks: 1900, emitUntil: 1000, ink: POUR_INK }
    case 'gas':
      // 불: 수명이 짧아(45틱) 피우는 동안의 불꽃을 찍는다.
      // 증기·연기: 수명(160·120틱) 안에 관 꼭대기까지 못 가므로 피어오르는 기둥을 찍는다.
      if (slug === 'fire') return { slug, kind: 'rise', ticks: 160, emitUntil: 160, ink: 0xffffffff }
      return { slug, kind: 'rise', ticks: 200, emitUntil: 200, ink: 0xffffffff }
  }
}

/** 결정적 해시(0..1) — 고체 블록 윗면을 살짝 울퉁불퉁하게(딱 떨어지는 직사각형은 인공적). */
function h(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) >>> 0
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/** 시작 격자. block은 재료로 아래를 채우고, 나머지는 빈 관. 셀 형식 = mat | life<<16 (shader.ts mk). */
export function initialCells(scene: PosterScene): Uint32Array<ArrayBuffer> {
  const cells = new Uint32Array(TUBE_W * TUBE_H).fill(EMPTY_ID)
  if (scene.kind !== 'block') return cells
  const id = IDX.get(scene.slug)!
  for (let x = 0; x < TUBE_W; x++) {
    const top = TUBE_H - FILL_ROWS + Math.round(Math.sin(x * 0.35) * 1.2 + h(x, 7) * 1.6)
    for (let y = Math.max(0, top); y < TUBE_H; y++) cells[y * TUBE_W + x] = id
  }
  return cells
}

export interface BrushState {
  x: number
  y: number
  r: number
  /** 0xffffffff = 칠하지 않음 */
  mat: number
}

const OFF: BrushState = { x: -1, y: -1, r: 1, mat: 0xffffffff }

/** 틱 t 직전 브러시 — 엔진 onTick에서 그대로 세팅. */
export function brushAt(scene: PosterScene, t: number): BrushState {
  if (scene.kind === 'block' || t >= scene.emitUntil) return OFF
  const mat = IDX.get(scene.slug)!
  if (scene.kind === 'pour') {
    // 관 입구에서 좌우로 천천히 흔들며 붓는다 — 한 점에 쌓인 원뿔이 아니라 사람 손으로 부은 더미.
    const x = Math.round(TUBE_W / 2 + Math.sin(t * 0.03) * (TUBE_W / 2 - 7))
    return { x, y: 8, r: 6, mat }
  }
  // rise: 바닥 가운데에서 피운다.
  const x = Math.round(TUBE_W / 2 + Math.sin(t * 0.08) * 12)
  const r = scene.slug === 'fire' ? 14 : 9
  return { x, y: TUBE_H - 2 - r, r, mat }
}

/** 스트립 프레임을 찍을 틱(엄격 오름차순, 마지막 = 포스터 틱). 선택된 관에 '부어지는' 1회 재생용(S7). block 장면은 스트립 없음. */
export function stripTicks(scene: PosterScene, frames = STRIP_FRAMES): number[] {
  const out: number[] = []
  for (let i = 1; i <= frames; i++) out.push(Math.max(1, Math.round((scene.ticks * i) / frames)))
  return out
}

/** 아틀라스 배치: 6열 그리드, 슬러그 순서대로. 반환값은 @2x 픽셀 좌표. */
export const ATLAS_COLS = 6
export const PX_PER_CELL = 1
export function atlasLayout(slugs: readonly string[] = POSTER_SLUGS) {
  const tw = TUBE_W * PX_PER_CELL
  const th = TUBE_H * PX_PER_CELL
  const rows = Math.ceil(slugs.length / ATLAS_COLS)
  const tiles: Record<string, { x: number; y: number; w: number; h: number }> = {}
  slugs.forEach((s, i) => {
    tiles[s] = { x: (i % ATLAS_COLS) * tw, y: Math.floor(i / ATLAS_COLS) * th, w: tw, h: th }
  })
  return { width: ATLAS_COLS * tw, height: rows * th, tile: { w: tw, h: th }, tiles }
}
