/**
 * 브라우저 쪽 포스터 캡처 하네스 — scripts/capture-posters.mjs가 Vite로 띄워 Playwright로 연다.
 * 엔진(src/lib/sand/engine.ts)은 무수정. 장면은 src/lib/capture/posterScenes.ts.
 * window.__capture(slugs, withStrips) → { atlas: dataURL, strips: {slug: dataURL} }
 *
 * 빈칸은 투명(S1 = A 라이트: 관 안으로 Bone 유리가 비쳐야 한다). 빈칸 위 발광(블룸 후광)만 밝기만큼 반투명으로 남긴다.
 */
import { SandEngine } from '../../src/lib/sand/engine'
import { PRESETS } from '../../src/lib/sand/materials'
import {
  POSTER_SLUGS, TUBE_W, TUBE_H, PX_PER_CELL, STRIP_FRAMES,
  sceneFor, initialCells, brushAt, stripTicks, atlasLayout,
} from '../../src/lib/capture/posterScenes'

class FakeSurface {
  private tex: GPUTexture | null = null
  private dev: GPUDevice | null = null
  private bgra = false
  constructor(readonly w: number, readonly h: number) {}
  canvas(): HTMLCanvasElement {
    const ctx = {
      configure: (c: GPUCanvasConfiguration) => {
        this.dev = c.device
        this.bgra = c.format === 'bgra8unorm'
        this.tex = c.device.createTexture({ size: [this.w, this.h], format: c.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC })
      },
      getCurrentTexture: () => this.tex!,
    }
    return { width: this.w, height: this.h, getContext: () => ctx } as unknown as HTMLCanvasElement
  }
  async read(): Promise<ImageData> {
    const d = this.dev!
    const row = Math.ceil((this.w * 4) / 256) * 256
    const buf = d.createBuffer({ size: row * this.h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
    const enc = d.createCommandEncoder()
    enc.copyTextureToBuffer({ texture: this.tex! }, { buffer: buf, bytesPerRow: row }, [this.w, this.h])
    d.queue.submit([enc.finish()])
    await buf.mapAsync(GPUMapMode.READ)
    const src = new Uint8Array(buf.getMappedRange())
    const img = new ImageData(this.w, this.h)
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const s = y * row + x * 4
        const o = (y * this.w + x) * 4
        img.data[o] = src[s + (this.bgra ? 2 : 0)]
        img.data[o + 1] = src[s + 1]
        img.data[o + 2] = src[s + (this.bgra ? 0 : 2)]
        img.data[o + 3] = 255
      }
    buf.unmap()
    buf.destroy()
    return img
  }
}

/** 엔진 빈칸 색(#07090D) 최대 채널 + 여유. 이보다 밝은 빈칸 픽셀 = 이웃 재료의 발광 후광. */
const EMPTY_MAX = 13 + 6

/** 1px = 1셀이라 픽셀 i ↔ 셀 i. 빈칸은 투명, 후광은 밝기만큼 알파. */
function keyEmpty(img: ImageData, cells: Uint32Array): ImageData {
  const d = img.data
  for (let i = 0; i < cells.length; i++) {
    if ((cells[i] & 0xffff) !== 0) continue
    const o = i * 4
    const mx = Math.max(d[o], d[o + 1], d[o + 2])
    const glow = mx - EMPTY_MAX
    if (glow <= 0) { d[o + 3] = 0; continue }
    // 어두운 바탕 위 '더해진 빛'을 밝은 바탕용으로: 색은 최대 채널 255로 펴고(un-premultiply) 밝기를 알파로.
    // 안 그러면 알갱이 사이 흐린 픽셀이 '검은 반투명'이 되어 Bone 위에서 낙하 줄기가 시커멓게 보인다(11-19 실측).
    const k = 255 / mx
    d[o] = Math.round(d[o] * k)
    d[o + 1] = Math.round(d[o + 1] * k)
    d[o + 2] = Math.round(d[o + 2] * k)
    d[o + 3] = Math.min(255, Math.round((glow / (255 - EMPTY_MAX)) * 255))
  }
  return img
}

const yieldTask = () => new Promise<void>((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0) })

async function capture(slugs: string[] = [...POSTER_SLUGS], withStrips = false) {
  const tw = TUBE_W * PX_PER_CELL
  const th = TUBE_H * PX_PER_CELL
  // 헤드리스 크로미움은 WebGPU 캔버스 표시(스왑체인 SharedImage)를 못 해서 첫 프레임에 device가 죽는다
  // (DOM·OffscreenCanvas 모두, 11-19 실측). 엔진은 그대로 두고 getContext('webgpu')만 가짜로 바꿔
  // 렌더 결과를 우리 텍스처에 받은 뒤 copyTextureToBuffer로 읽는다. 셰이더·파이프라인은 실제 그대로다.
  const surf = new FakeSurface(tw, th)
  const gpu = surf.canvas()
  const eng = new SandEngine({ canvas: gpu as unknown as HTMLCanvasElement, width: TUBE_W, height: TUBE_H, materials: PRESETS })
  try { await eng.init() } catch (e) { throw new Error('init: ' + e) }
  const dev = (eng as unknown as { device: GPUDevice }).device
  const errs: string[] = []
  dev.addEventListener('uncapturederror', (ev) => errs.push((ev as GPUUncapturedErrorEvent).error.message))
  try { await eng.settle() } catch (e) { throw new Error('settle-after-init: ' + e + ' errs=' + errs.join(' || ')) }
  ;(window as unknown as { __errs: string[] }).__errs = errs
  // 적응형 품질 필드 이름이 바뀌면 아래 고정이 조용히 무효가 된다 — 그때 바로 알 수 있게.
  if (!('lite' in eng)) throw new Error('SandEngine.lite not found — update the quality pin in posters.ts')
  const layout = atlasLayout(slugs)
  const atlas = document.createElement('canvas')
  atlas.width = layout.width
  atlas.height = layout.height
  const actx = atlas.getContext('2d')!
  const strips: Record<string, string> = {}
  const census: Record<string, number> = {}
  for (const slug of slugs) {
    const scene = sceneFor(slug)
    // 고체(block)는 움직이지 않으므로 스트립을 만들지 않는다(정지 포스터로 충분 — 빈 프레임 방지).
    const doStrip = withStrips && scene.kind !== 'block'
    const want = new Set(doStrip ? stripTicks(scene) : [])
    const strip = document.createElement('canvas')
    strip.width = tw * STRIP_FRAMES
    strip.height = th
    const sctx = strip.getContext('2d')!
    let frame = 0
    eng.upload(initialCells(scene))
    eng.resetTick()
    eng.resetInk()
    eng.inkCap = scene.ink
    eng.paintEmptyOnly = true // 이미 찬 칸을 다시 칠하며 잉크를 태우지 않게(재료 총량 = ink 정확히)
    // 소프트웨어 GPU(SwiftShader)는 느려서 엔진 적응형 품질(pickQuality)이 lite로 떨어져 블룸을 건너뛴다 →
    // 이전 장면의 발광이 light 버퍼에 남아 다음 관에 유령처럼 비친다(11-19 실측). 실제 기기 기본값(full)으로 고정.
    eng.onTick = (t) => { (eng as unknown as { lite: boolean }).lite = false; const b = brushAt(scene, t); eng.brush.x = b.x; eng.brush.y = b.y; eng.brush.r = b.r; eng.brush.mat = b.mat }
    while (eng.currentTick < scene.ticks) {
      try { eng.advance() } catch (e) { throw new Error('advance@' + eng.currentTick + ': ' + e) }
      try { await eng.settle() } catch (e) { throw new Error('settle@' + eng.currentTick + ': ' + e + ' errs=' + errs.join(' || ') + ' lost=' + (eng.lost ? eng.lost.reason + ' ' + eng.lost.message : 'no')) }
      if (want.has(eng.currentTick)) { sctx.putImageData(keyEmpty(await surf.read(), await eng.readback()), frame * tw, 0); frame++ }
      if (eng.currentTick % 64 === 0) await yieldTask()
    }
    eng.onTick = undefined
    eng.brush.mat = 0xffffffff
    const t = layout.tiles[slug]
    let cells: Uint32Array
    try { cells = await eng.readback() } catch (e) { throw new Error('readback: ' + e) }
    actx.putImageData(keyEmpty(await surf.read(), cells), t.x, t.y)
    const id = PRESETS.findIndex((m) => m.slug === slug)
    census[slug] = cells.reduce((n, c) => n + ((c & 0xffff) === id ? 1 : 0), 0)
    if (doStrip) {
      if (frame !== STRIP_FRAMES) throw new Error(`${slug}: strip has ${frame}/${STRIP_FRAMES} frames`)
      strips[slug] = strip.toDataURL('image/webp', 0.9)
    }
  }
  eng.destroy()
  return {
    layout,
    census,
    atlasWebp: atlas.toDataURL('image/webp', 0.92),
    atlasPng: atlas.toDataURL('image/png'),
    strips,
  }
}

;(window as unknown as { __capture: typeof capture }).__capture = capture
;(window as unknown as { __ready: boolean }).__ready = true
