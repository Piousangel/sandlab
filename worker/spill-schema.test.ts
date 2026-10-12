import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const norm = (s: string) => s.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim()
const tables = (s: string) => [...norm(s).matchAll(/CREATE TABLE IF NOT EXISTS (spill_\w+) \(([^;]*)\);/g)].map((m) => [m[1], m[2]])

describe('Spill D1 마이그레이션', () => {
  const mig = readFileSync(new URL('../migrations/0001_spill.sql', import.meta.url), 'utf8')
  const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')
  it('spill_hist·spill_seen을 만든다', () => {
    expect(tables(mig).map((t) => t[0])).toEqual(['spill_hist', 'spill_seen'])
  })
  it('schema.sql과 마이그레이션 정의가 같다', () => {
    expect(tables(schema)).toEqual(tables(mig))
  })
  it('워커가 쓰는 충돌 키가 PK와 같다', () => {
    expect(norm(mig)).toContain('PRIMARY KEY (level_id, lh, moves, tbucket)')
    expect(norm(mig)).toContain('PRIMARY KEY (level_id, pid)')
  })
  it('spill_seen은 레이트리밋용 ip 해시·시각과 인덱스를 가진다', () => {
    expect(norm(mig)).toContain('ip TEXT NOT NULL DEFAULT')
    expect(norm(mig)).toContain('created_at INTEGER NOT NULL DEFAULT 0')
    expect(norm(mig)).toContain('CREATE INDEX IF NOT EXISTS spill_seen_ip ON spill_seen (ip, created_at)')
    expect(norm(schema)).toContain('CREATE INDEX IF NOT EXISTS spill_seen_ip ON spill_seen (ip, created_at)')
  })
})
