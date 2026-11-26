/**
 * `@ui-shell`의 기본 모듈(타입·테스트용 자리). prod는 P12 컷오버부터 영역 모듈(area-*.ts)로 치환된 새 셸이고,
 * NEXT_PUBLIC_UI=classic 빌드는 #108부터 next.config.ts가 막는다. 아무것도 더하지 않는다(import 0개를 유지한다).
 * 새 셸(next.ts)과 같은 모양을 내보낸다. 빈 객체라 <html>에 속성이 하나도 안 붙고
 * RSC 페이로드(out/*.txt, HTML 안 self.__next_f)도 그대로다(className: undefined로 두면 "$undefined"가 찍힌다).
 * ShellHeader·ShellFooter = null → ContentShell이 지금 헤더·푸터를 그대로 그린다(P3).
 * SpillHud·DailyStart = null → SpillPlayer·DailySpill이 지금 HUD·화면을 그대로 그린다(P4).
 * HomePour·GalleryWall·SpillResult = null이면 홈·/gallery·결과 화면은 아무것도 그리지 않는다 — 옛 SandCanvas·GalleryBrowser·ResultCard는 #108에서 지웠다.
 * 아래 `import type`은 컴파일 때 지워진다(런타임 import 0개 유지 — 번들 그래프에 아무것도 더하지 않는다).
 */
import type { DailyAsideProps, DailyStartProps, SpillHudKit, SpillResultProps } from './spillTypes'
import type { LevelAsideProps, PlayGalleryProps } from './playTypes'
import type { ContentFrameProps, GuideArticleProps, LearnArticleProps, MaterialPageProps, MaterialsIndexProps } from './contentTypes'

export const shellHtmlProps: { className?: string } = {}

export const ShellHeader: null | (() => React.JSX.Element) = null
export const ShellFooter: null | (() => React.JSX.Element) = null
/** P9: 옛 GalleryBrowser는 #108에서 지웠다(null이면 /gallery가 빈 화면 — classic 빌드는 막힘). */
export const GalleryWall: null | (() => React.JSX.Element) = null

export const SpillHud: null | SpillHudKit = null
export const DailyStart: null | ((p: DailyStartProps) => React.JSX.Element) = null
export const SpillResult: null | ((p: SpillResultProps) => React.JSX.Element) = null
/** P7: null → DailySpill이 지금 설명 패널(레벨 요약·주황 Share result)을 그대로 그린다. */
export const DailyAside: null | ((p: DailyAsideProps) => React.JSX.Element) = null
/** P8: null → /play가 지금 ContentShell 화면(LevelList·목록)을, /play/[id]가 지금 설명 패널을 그대로 그린다. */
export const PlayGallery: null | ((p: PlayGalleryProps) => React.JSX.Element) = null
export const LevelAside: null | ((p: LevelAsideProps) => React.JSX.Element) = null
export const HomePour: null | (() => React.JSX.Element) = null
/**
 * P10: null → ContentShell이 지금 다크 화면(헤더·main·푸터)을, /learn/[slug]·/play/[id]/guide·/materials·/materials/[slug]가
 * 지금 화면을 그대로 그린다.
 */
export const ContentFrame: null | ((p: ContentFrameProps) => React.JSX.Element) = null
export const LearnArticle: null | ((p: LearnArticleProps) => React.JSX.Element) = null
export const GuideArticle: null | ((p: GuideArticleProps) => React.JSX.Element) = null
export const MaterialPage: null | ((p: MaterialPageProps) => React.JSX.Element) = null
export const MaterialsIndex: null | ((p: MaterialsIndexProps) => React.JSX.Element) = null
