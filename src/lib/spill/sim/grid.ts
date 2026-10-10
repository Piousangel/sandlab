/**
 * 퍼즐 격자 (§7.2): 160×240, mat/life/moved 세 Uint8Array.
 * 배치 단위는 4×4셀 타일(40×60).
 */
import { INIT_LIFE } from './materials'

export const W = 160
export const H = 240
export const N = W * H
export const TILE = 4
export const TW = W / TILE
export const TH = H / TILE

export interface Grid {
  mat: Uint8Array
  /** 기체: 남은 수명 / 가연 고체: 남은 hp / gate·spout: 그룹 번호(1부터) */
  life: Uint8Array
  /** 틱 내 중복 이동·반응 방지 플래그. 매 틱 0으로 지운다. */
  moved: Uint8Array
}

export function createGrid(): Grid {
  return { mat: new Uint8Array(N), life: new Uint8Array(N), moved: new Uint8Array(N) }
}

/** 셀을 재료 m으로 바꾸고 life를 그 재료의 초기값으로. */
export function setCell(g: Grid, i: number, m: number): void {
  g.mat[i] = m
  g.life[i] = INIT_LIFE[m]
}
