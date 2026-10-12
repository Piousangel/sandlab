import { describe, it, expect } from 'vitest'
import { postClear, fetchHist } from './api'

describe('레벨 분포 API 클라이언트', () => {
  it('POST /api/spill/level/:id/clear 본문 {pid, moves, ticks, lh}', async () => {
    const calls: [string, RequestInit | undefined][] = []
    const f = (async (u: string, i?: RequestInit) => { calls.push([u, i]); return new Response('{"ok":true,"counted":true}', { status: 201 }) }) as typeof fetch
    expect(await postClear('1-1', { pid: 'p', moves: 1, ticks: 300, lh: 'abc' }, f)).toBe(true)
    expect(calls[0][0]).toBe('/api/spill/level/1-1/clear')
    expect(calls[0][1]?.method).toBe('POST')
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({ pid: 'p', moves: 1, ticks: 300, lh: 'abc' })
  })
  it('네트워크 실패는 false', async () => {
    const f = (async () => { throw new Error('offline') }) as typeof fetch
    expect(await postClear('1-1', { pid: 'p', moves: 1, ticks: 1, lh: 'x' }, f)).toBe(false)
  })
  it('GET hist → {cells,total}, 형식이 틀리면 null', async () => {
    const ok = (async () => new Response('{"cells":[[1,10,3]],"total":3}')) as typeof fetch
    expect(await fetchHist('1-1', ok)).toEqual({ cells: [[1, 10, 3]], total: 3 })
    const bad = (async () => new Response('{"nope":1}')) as typeof fetch
    expect(await fetchHist('1-1', bad)).toBeNull()
    const err = (async () => new Response('x', { status: 500 })) as typeof fetch
    expect(await fetchHist('1-1', err)).toBeNull()
  })
})
