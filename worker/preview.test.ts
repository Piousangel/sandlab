import { describe, expect, it } from 'vitest'
import { NOINDEX_VALUE, withNoindex } from './preview'

describe('withNoindex (프리뷰 Worker)', () => {
  it('일반 응답에 x-robots-tag를 달고 상태·본문·기존 헤더를 보존한다', async () => {
    const res = withNoindex(new Response('hi', { status: 201, headers: { 'content-type': 'text/plain' } }))
    expect(res.status).toBe(201)
    expect(res.headers.get('x-robots-tag')).toBe(NOINDEX_VALUE)
    expect(res.headers.get('content-type')).toBe('text/plain')
    expect(await res.text()).toBe('hi')
  })

  it('헤더가 불변인 Response.redirect도 처리한다', () => {
    const res = withNoindex(Response.redirect('https://example.com/', 302))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://example.com/')
    expect(res.headers.get('x-robots-tag')).toBe(NOINDEX_VALUE)
  })
})
