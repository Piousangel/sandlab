/** 새 셸 영역: 데일리 시작 화면·지층 허브·설명 패널(DailySpill) — P4·P7. CSS 순서 spill → result → daily(영역 안 순서는 옛 next.ts와 같다. 페이지 단위로는 영역 import 순서를 따른다 — 영역 CSS끼리 겹치는 선택자 0, 리뷰 확인). */
import '../spill/spill.css'
import '../result/result.css'
import '../daily/daily.css'

export { DailyStart } from '../spill/DailyStart'
export { DailyAside } from '../daily/DailyAside'
