/**
 * 데일리 변형별 별 기준·예산 보정 — /play/verify?set=daily 실측 잉크로 채운다.
 * 반전·이동한 변형은 원본과 잉크가 조금 달라질 수 있다(Margolus 좌우 미세 편향 등).
 * 비어 있으면 원본 레벨 값을 그대로 쓴다.
 */
export const DAILY_STARS: Record<string, { stars: [number, number]; scale?: number }> = {}
