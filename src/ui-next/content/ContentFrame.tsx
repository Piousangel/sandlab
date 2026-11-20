/**
 * 새 셸 산문 페이지 틀(리디자인 P10) — ContentShell이 `@ui-shell`의 ContentFrame이 있으면 이것으로 그린다.
 * 대상: About·Privacy·Terms·Contact·Learn 허브·404 (전용 화면이 없는 ContentShell 페이지 전부).
 *
 * - 페이지 JSX는 prod와 같다. 옛 다크 화면용 인라인 style만 걷어내고(model.stripStyles) Bone 위 CSS(content.css)가 모양을 맡는다.
 * - 광고 허용 페이지(ads, 지금은 About)는 본문 중간 1곳(가운데 h2 앞) + 글 끝 1곳. AD_SLOTS id가 없으면 렌더 0.
 */
import { Children } from 'react'
import type { ContentFrameProps } from '../shell/contentTypes'
import { ContentPage, EndAd, MidAd } from './parts'
import { proseMidIndex, stripStyles } from './model'

export function ContentFrame({ ads, kind = 'prose', children }: ContentFrameProps) {
  const nodes = Children.toArray(stripStyles(children))
  const at = ads ? proseMidIndex(nodes) : -1
  return (
    <ContentPage ads={ads} variant={kind}>
      <div className="sl-cs-prose">
        {at < 0 ? (
          nodes
        ) : (
          <>
            {nodes.slice(0, at)}
            <MidAd ads={ads} />
            {nodes.slice(at)}
          </>
        )}
      </div>
      <EndAd ads={ads} />
    </ContentPage>
  )
}
