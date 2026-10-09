/** 레벨 레지스트리 — 순서 = 난이도 곡선(스펙 §7). 새 레벨 = 파일 하나 + 여기 한 줄 + /play/verify 통과. */
import type { Level } from '../types'
import { fillCup } from './fill-cup'
import { overTheWall } from './over-the-wall'
import { putOut } from './put-out'
import { lavaBridge } from './lava-bridge'
import { acidDoor } from './acid-door'
import { growUp } from './grow-up'
import { fuse } from './fuse'
import { dissolve } from './dissolve'
import { stopTheFlow } from './stop-the-flow'
import { oilSlick } from './oil-slick'
import { layerCake } from './layer-cake'
import { steamVent } from './steam-vent'
import { trapdoor } from './trapdoor'
import { twoLeaks } from './two-leaks'
import { acidStairs } from './acid-stairs'
import { deepRoots } from './deep-roots'
import { doubleFuse } from './double-fuse'
import { floatAndBurn } from './float-and-burn'
import { saltAndSand } from './salt-and-sand'
import { lavaFuse } from './lava-fuse'

export const LEVELS: Level[] = [fillCup, overTheWall, putOut, lavaBridge, acidDoor, growUp, fuse, dissolve, stopTheFlow, oilSlick,
  layerCake, steamVent, trapdoor, acidStairs, saltAndSand, deepRoots, twoLeaks, doubleFuse, floatAndBurn, lavaFuse]

export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id)
}
