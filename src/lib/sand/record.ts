/**
 * 클립 녹화 — 이 제품의 배급 장치.
 *
 * 왜 이게 최우선인가:
 *   1차 자료 두 곳(Sandspiel 제작자 글, Powder Toy 커뮤니티)이 독립적으로 같은 말을 한다:
 *   "썸네일/첫 3초가 본체다. 초기 몇 표가 전부다."
 *   그리고 이 장르가 퍼지는 곳(r/Simulated 등)은 링크가 아니라 영상 커뮤니티다.
 *   시뮬레이션은 움직임이 본체라 정지 이미지로는 자기를 설명하지 못한다.
 *
 * 왜 OG 카드가 아니라 파일 다운로드인가:
 *   공유 URL이 `#g=...` 프래그먼트인데 프래그먼트는 서버로 전송되지 않는다.
 *   크롤러는 해시를 절대 못 본다 → 장면별 OG 미리보기는 서버 없이는 불가능하다.
 *   대신 사용자가 mp4를 커뮤니티에 직접 올리면 클립 자체가 미리보기다. 더 낫다.
 */

export type ClipFormat = { mime: string; ext: string; label: string }

/**
 * 포맷 선택 — mp4를 최우선한다.
 * webm은 다운로드는 되지만 X(트위터)가 업로드를 거부하고 일부 클라이언트가 재생 못 한다.
 * 배급이 목적인 파일이 배급처에서 안 열리면 의미가 없다.
 */
const CANDIDATES: ClipFormat[] = [
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4', label: 'MP4' },
  { mime: 'video/mp4', ext: 'mp4', label: 'MP4' },
  { mime: 'video/webm;codecs=vp9', ext: 'webm', label: 'WebM' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm', label: 'WebM' },
  { mime: 'video/webm', ext: 'webm', label: 'WebM' },
]

export function pickFormat(): ClipFormat | null {
  if (typeof MediaRecorder === 'undefined') return null
  return CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mime)) ?? null
}

export interface RecordOpts {
  canvas: HTMLCanvasElement
  /** 녹화 길이(ms). 3초 = 스크롤을 멈추게 하는 길이이자 대부분의 피드가 자동재생하는 길이. */
  durationMs?: number
  fps?: number
  /** 0..1 진행률 */
  onProgress?: (t: number) => void
}

export interface Clip {
  blob: Blob
  format: ClipFormat
  bytes: number
  durationMs: number
}

export class RecordUnsupported extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'RecordUnsupported'
  }
}

export async function recordClip(o: RecordOpts): Promise<Clip> {
  const durationMs = o.durationMs ?? 3000
  const fps = o.fps ?? 60

  const format = pickFormat()
  if (!format) throw new RecordUnsupported('This browser cannot record video from a canvas.')
  if (typeof o.canvas.captureStream !== 'function') {
    throw new RecordUnsupported('canvas.captureStream is unavailable in this browser.')
  }

  const stream = o.canvas.captureStream(fps)
  const rec = new MediaRecorder(stream, {
    mimeType: format.mime,
    videoBitsPerSecond: 12_000_000, // 낙사는 고주파 디테일이라 비트레이트를 아끼면 뭉갠다
  })

  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const done = new Promise<void>((resolve, reject) => {
    rec.onstop = () => resolve()
    rec.onerror = () => reject(new Error('Recording failed.'))
  })

  const startedAt = performance.now()
  rec.start()

  let raf = 0
  const tickProgress = () => {
    const t = Math.min(1, (performance.now() - startedAt) / durationMs)
    o.onProgress?.(t)
    if (t < 1) raf = requestAnimationFrame(tickProgress)
  }
  raf = requestAnimationFrame(tickProgress)

  await new Promise((r) => setTimeout(r, durationMs))
  cancelAnimationFrame(raf)
  rec.stop()
  stream.getTracks().forEach((t) => t.stop())
  await done

  const blob = new Blob(chunks, { type: format.mime })
  return { blob, format, bytes: blob.size, durationMs }
}

export function downloadClip(clip: Clip, name = 'sandlab') {
  const url = URL.createObjectURL(clip.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.${clip.format.ext}`
  a.click()
  // 즉시 revoke하면 일부 브라우저가 다운로드를 취소한다
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
