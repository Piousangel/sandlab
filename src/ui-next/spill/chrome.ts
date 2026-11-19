/**
 * 새 Spill HUD(P4)의 세로 예산 — 순수 함수(테스트가 390·360·1440 배치를 직접 잰다).
 * SpillHud.tsx가 그리는 높이와 반드시 같아야 한다(CSS 변수로 같은 값을 내려 보낸다).
 *
 * 모바일:  헤더 48 · 목표 줄 44 · 보드 유리 테두리 3 | 보드 | 테두리 3 · 진행 줄 52(진행 1줄 + 메시지 2줄) · 도구 줄 52 · 아래 여백 8
 * 데스크톱(≥900): 헤더 56 · 테두리 4 | 보드 | 테두리 4 · 진행 줄 52 · 도구 줄 52 · 아래 여백 8  (목표는 오른쪽 카드)
 * 보드는 2:3(160×240 셀) 정수 장치 픽셀 배율(computeScale) — 남는 세로는 보드와 진행 줄 사이 Bone, 진행 줄·도구 줄은 트레이 맨 아래(엄지 쪽).
 */
import { DESKTOP_MIN, type LayoutChrome } from '@/lib/spill/render/layout'

export const HUD = {
  header: 48,
  headerDesk: 56,
  goals: 44,
  frame: 3,
  frameDesk: 4,
  line: 52,
  tools: 52,
  padBottom: 8,
} as const

export function spillChrome(vw: number): LayoutChrome {
  const desk = vw >= DESKTOP_MIN
  const frame = desk ? HUD.frameDesk : HUD.frame
  return {
    top: (desk ? HUD.headerDesk : HUD.header + HUD.goals) + frame,
    bottom: frame + HUD.line + HUD.tools + HUD.padBottom,
    side: frame * 2,
  }
}
