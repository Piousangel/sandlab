/**
 * 클립 녹화 — 이 제품의 배급 장치.
 *
 * 왜 이게 최우선인가:
 *   1차 자료 두 곳(Sandspiel 제작자 글, Powder Toy 커뮤니티)이 독립적으로 같은 말을 한다:
 *   "썸네일/첫 몇 초가 본체다. 초기 몇 표가 전부다."
 *   그리고 이 장르가 퍼지는 곳은 링크가 아니라 영상 커뮤니티다.
 *   시뮬레이션은 움직임이 본체라 정지 이미지로는 자기를 설명하지 못한다.
 *
 * 왜 캡처와 컨테이너를 분리하는가 (두 단계):
 *   1) 캡처: canvas.captureStream() + MediaRecorder.
 *      captureStream은 컴포지터에서 '프레젠트된' 프레임을 가져온다 — 블룸/톤매핑까지 화면 그대로다.
 *      WebGPU 캔버스에서 프레임이 안 비는 유일하게 신뢰할 수 있는 경로다.
 *      (WebCodecs로 VideoFrame(canvas)를 직접 스냅샷하면 스왑체인이 프레젠트 후 무효화돼서
 *       전 프레임이 빈다 — toDataURL이 비는 것과 같은 계열. 실제로 이 방식으로 테스트했다가 걸렸다.)
 *   2) 컨테이너: MediaRecorder의 mp4는 항상 fragmented mp4(moof/mdat 반복)라
 *      Chrome/VLC/Reddit에선 되지만 macOS QuickTime·미리보기가 못 연다("파일은 받았는데 안 열림").
 *      그래서 캡처 직후 mediabunny로 표준(non-fragmented, moov 정상 배치) mp4로 리먹스한다.
 *      소스가 이미 H.264(mp4/avc1)면 재인코딩 없이 샘플만 복사 → 빠르고 무손실.
 *      결과물은 QuickTime 포함 어디서나 열린다.
 */

import {
  Input,
  Output,
  Conversion,
  BlobSource,
  Mp4OutputFormat,
  BufferTarget,
  ALL_FORMATS,
} from 'mediabunny'

export type ClipFormat = { mime: string; ext: string; label: string }

const MP4: ClipFormat = { mime: 'video/mp4', ext: 'mp4', label: 'MP4' }

/**
 * 캡처 포맷 후보 — mp4/H.264를 최우선한다.
 * H.264면 리먹스 단계에서 재인코딩 없이 샘플 복사가 되어 빠르고 무손실이다.
 * webm은 최후의 폴백 — 이 경우 리먹스가 avc로 트랜스코딩한다(조금 느리지만 결과는 표준 mp4).
 */
const CAPTURE_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
]

function pickCaptureMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return CAPTURE_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

export interface RecordOpts {
  canvas: HTMLCanvasElement
  /** 녹화 길이(ms). 10초 = 낙사가 쌓였다 무너지는 한 사이클을 여유 있게 담는 길이. 피드는 자동재생·루프라 길이 제약 없음. */
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function recordClip(o: RecordOpts): Promise<Clip> {
  const durationMs = o.durationMs ?? 10000
  const fps = o.fps ?? 60

  const mime = pickCaptureMime()
  if (!mime) throw new RecordUnsupported('This browser cannot record video from a canvas.')
  if (typeof o.canvas.captureStream !== 'function') {
    throw new RecordUnsupported('canvas.captureStream is unavailable in this browser.')
  }

  // ── 1) 캡처 (화면 그대로, 블룸 포함) ──
  // captureStream 트랙은 어떤 경로로 나가든 반드시 정리해야 한다(누수 방지) → 전체를 try/finally로.
  const stream = o.canvas.captureStream(fps)
  let raf = 0
  let raw: Blob
  try {
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 12_000_000, // 낙사는 고주파 디테일이라 비트레이트를 아끼면 뭉갠다
    })

    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    // reject 대신 항상 resolve하고 에러는 플래그로 본다 — await 전에 에러가 나도 unhandled rejection이 없다.
    let recError = false
    const recStopped = new Promise<void>((resolve) => {
      rec.onstop = () => resolve()
      rec.onerror = () => {
        recError = true
        resolve()
      }
    })

    const startedAt = performance.now()
    rec.start()

    const tick = () => {
      const t = Math.min(1, (performance.now() - startedAt) / durationMs)
      o.onProgress?.(t)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    await sleep(durationMs)
    // 이미 에러/정지 상태면 stop()이 InvalidStateError를 던진다 — 상태를 보고 부른다.
    if (rec.state !== 'inactive') rec.stop()
    await recStopped
    if (recError) throw new Error('Recording failed.')

    raw = new Blob(chunks, { type: mime })
  } finally {
    cancelAnimationFrame(raf)
    stream.getTracks().forEach((t) => t.stop())
  }
  if (raw.size === 0) throw new Error('Recording produced no data.')

  // ── 2) 표준 mp4로 리먹스 (QuickTime 호환) ──
  const input = new Input({ source: new BlobSource(raw), formats: ALL_FORMATS })
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })
  let conversion: Conversion
  try {
    conversion = await Conversion.init({ input, output })
    await conversion.execute()
  } catch {
    // 리먹스가 실패하면 최소한 원본(fragmented지만 재생은 되는)을 넘겨준다 — 빈손보단 낫다.
    const isMp4 = mime.startsWith('video/mp4')
    return {
      blob: raw,
      format: isMp4 ? MP4 : { mime: 'video/webm', ext: 'webm', label: 'WebM' },
      bytes: raw.size,
      durationMs,
    }
  }

  const buffer = output.target.buffer
  if (!buffer) throw new Error('Conversion produced no data.')
  const blob = new Blob([buffer], { type: MP4.mime })
  return { blob, format: MP4, bytes: blob.size, durationMs }
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
