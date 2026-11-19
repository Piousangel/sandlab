import type { CSSProperties } from 'react'
import { spriteSymbols, type IconName } from './icons'

type IconProps = {
  name: IconName
  /** px, 기본 20(그리드 원 크기). */
  size?: number
  /** 주면 role="img" + aria-label, 없으면 장식(aria-hidden). */
  label?: string
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 20, label, className, style }: IconProps) {
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      focusable="false"
      className={className}
      style={style}
      {...a11y}
    >
      <use href={`#i-${name}`} />
    </svg>
  )
}

/** 문서에 한 번만 렌더한다(셸 최상단). 모든 <Icon>이 여기의 <symbol>을 참조한다. */
export function IconSprite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={0}
      height={0}
      style={{ position: 'absolute' }}
      aria-hidden
      focusable="false"
      dangerouslySetInnerHTML={{ __html: spriteSymbols() }}
    />
  )
}
