export { SpillController, TICK_MS, MAX_FRAME_MS, FRAME_BUDGET_MS, CAP_SAMPLE_TICKS, capFor } from './controller'
export type { Phase, Speed, PlayState, PlayEvent, TargetView, ControllerOptions } from './controller'
export { Attempt, MAX_ACTIONS, devActions, simulate } from './attempt'
export type { PlayAction, RunResult, AttemptStatus, SimulateOptions } from './attempt'
export { FAIL_WINDOW, MOVE_EPS, HARD_CAP } from './failure'
export type { FailReason } from './failure'
export {
  snapLine, pointerToTile, dropAnchor, stampSize, gateBoxes, hitGate, legalMask, checkAction, DROP_GHOST_PX, HIT_PX,
} from './input'
export type { ActionInput, CssRect, GateBox, RejectReason, TileLine, Check } from './input'
export { toReplay, fromReplay, parseReplay, serializeReplay, replayResult, MAX_REPLAY_ACTIONS, VERB_CODES } from './replay'
export type { Replay } from './replay'
export {
  stars, starMask, starCount, parTicks, parSecsFromBest, compareResults, formatMoves, formatSecs, hudLine, overPar,
  STAR_CLEAR, STAR_GEMS, STAR_PAR,
} from './score'
export type { Stars, Par, Rank } from './score'
export { loadRecord, recordResult, isNewBest, totalStars, defaultStorage, KEY_PREFIX } from './progress'
export type { LevelRecord, RecordOutcome, StorageLike } from './progress'
export { startAutoplay, startWatch, autoplaySync } from './autoplay'
