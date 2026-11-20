'use client'

/**
 * 지연 로드(React.lazy) 청크를 못 받았을 때의 경계(P12 LCP 리뷰 반영).
 * lazy는 import 실패를 기억했다가 렌더 중에 던진다 — 경계가 없으면 Next 기본 "Application error" 화면이 된다
 * (재배포 뒤 오래 열린 탭이 옛 해시 청크를 찾다 404, 오프라인 등). 이 경계가 그 자리에 fallback을 그리고 onError를 한 번 부른다.
 */
import { Component, type ReactNode } from 'react'

export class LazyBoundary extends Component<{ fallback: ReactNode; onError?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
