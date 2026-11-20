/** 새 셸 영역: /play 전시실·/play/[id] 설명 패널 — P8. CSS 순서 spill → result → play(영역 안 순서는 옛 next.ts와 같다. 페이지 단위로는 영역 import 순서를 따른다 — 영역 CSS끼리 겹치는 선택자 0, 리뷰 확인, LevelAside는 .sl-sp-aside 안). */
import '../spill/spill.css'
import '../result/result.css'
import '../play/play.css'

export { PlayGallery } from '../play/PlayGallery'
export { LevelAside } from '../play/LevelAside'
