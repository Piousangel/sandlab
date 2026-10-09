/**
 * WebGPU 엔진 — 버퍼/파이프라인 + 프레임 루프.
 *
 * 프레임 구성:
 *   1. simulate  src → dst   (Margolus, 격자의 (W/2+1)×(H/2+1) 블록)
 *   2. paint     dst 위에 브러시 (블록 소유권을 안 깨려고 분리)
 *   3. bloom     seed → blurH → blurV  (격자 해상도. 캔버스 크기와 무관)
 *   4. render    dst + light → 화면
 *
 * 디스패치가 (W/2+1)인 이유: offset=1일 때 블록 원점이 -1로 밀려서
 * 마지막 셀을 덮으려면 블록이 하나 더 필요하다. 없으면 오른쪽/아래 끝 한 줄이
 * 2프레임 전 데이터로 남는다.
 */

import { SIM_WGSL, BLOOM_WGSL, RENDER_WGSL } from './shader'
import { packMaterials, type Material, EMPTY_ID } from './materials'
import { SITE } from '../site'
import { packParams, PARAMS_BYTES } from './params'

/** 잉크 카운터 슬롯 수(재료 id 인덱스). 재료가 이보다 많아지면 늘린다(materials.test가 감시). */
export const INK_SLOTS = 64

export interface EngineOpts {
  canvas: HTMLCanvasElement
  width: number
  height: number
  materials: Material[]
}

export class WebGPUUnsupported extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'WebGPUUnsupported'
  }
}

/**
 * 적응형 품질 — 저사양 기기(구형 안드로이드·통합 GPU)에서 fps가 지속적으로 낮으면 블룸(3컴퓨트패스 ×
 * 72만 셀)을 끄는 판단. 히스테리시스(38↓ 끄기 / 52↑ 켜기)로 임계 부근 깜빡임을 막는다. 순수함수(테스트 대상).
 * @returns lite=true 면 블룸을 스킵(발광 글로우 없음, 그러나 fps·발열·배터리 회복).
 */
export function pickQuality(fps: number, prevLite: boolean): boolean {
  if (fps <= 0) return prevLite // 아직 측정 전 — 현 상태 유지(기본 full)
  if (fps < 38) return true // 버벅임 — 블룸 끈다
  if (fps > 52) return false // 여유 — 블룸 복원
  return prevLite // 중간대 — 유지
}

export class SandEngine {
  private device!: GPUDevice
  private ctx!: GPUCanvasContext
  private cells: GPUBuffer[] = []
  private watermark!: GPUTexture
  private wmSampler!: GPUSampler
  /** 녹화 중일 때만 렌더 셰이더가 워터마크를 합성한다(공유 클립 = 광고). */
  recording = false
  private lightA!: GPUBuffer
  private lightB!: GPUBuffer
  private params!: GPUBuffer
  private inkBuf!: GPUBuffer
  private propsBuf!: GPUBuffer
  private rxBuf!: GPUBuffer

  private simPipe!: GPUComputePipeline
  private paintPipe!: GPUComputePipeline
  private seedPipe!: GPUComputePipeline
  private blurHPipe!: GPUComputePipeline
  private blurVPipe!: GPUComputePipeline
  private renderPipe!: GPURenderPipeline

  private simBind: GPUBindGroup[] = []
  private bloomBind: GPUBindGroup[] = []
  private renderBind: GPUBindGroup[] = []

  private cur = 0
  private tick = 0
  private raf = 0
  private running = false
  // init()은 await 지점(requestAdapter/requestDevice)에서 언마운트될 수 있다. destroy()가 그때
  // 이 플래그를 세우면 init이 이미 만든 것을 정리하고 조기 반환해 device 누수를 막는다.
  private disposed = false

  /** GPU 컨텍스트 손실(sleep/wake·모바일 GPU 회수·드라이버 TDR·크롬 컨텍스트 축출). 손실 시 채워진다.
   *  없으면 프레임 루프가 조용히 죽고 재시작 경로가 없다 — 그래서 신호를 내보내 UI가 복구를 안내한다. */
  lost: GPUDeviceLostInfo | null = null
  onLost?: (info?: GPUDeviceLostInfo) => void

  /** 성능 관측 — 실제 FPS. 해상도 판단 근거가 필요하다. */
  fps = 0
  private frames = 0
  private lastFpsAt = 0
  /** 적응형 품질: true면 저사양이라 블룸 스킵(pickQuality가 fps로 판단). */
  private lite = false

  readonly W: number
  readonly H: number
  private mats: Material[]
  private canvas: HTMLCanvasElement

  brush = { x: -1, y: -1, r: 6, mat: 0xffffffff }
  /** 직전 프레임의 브러시 위치. 캡슐 보간의 시작점. */
  private prev = { x: -1, y: -1 }
  /** 챌린지 모드: 빈 칸에만 칠한다(레벨 구조물 보호). 일반 샌드박스는 false. */
  paintEmptyOnly = false
  /** 프레임당 시뮬 틱 수. 기본 1. /play/verify가 검증을 빨리 돌릴 때만 올린다. */
  stepsPerFrame = 1
  /** 각 시뮬 틱 직전 호출(인자 = 이번 틱 번호). 리플레이가 brush를 틱 단위로 세팅한다. */
  onTick?: (tick: number) => void

  constructor(o: EngineOpts) {
    this.canvas = o.canvas
    this.W = o.width
    this.H = o.height
    this.mats = o.materials
  }

  async init() {
    if (!('gpu' in navigator)) {
      throw new WebGPUUnsupported('This browser does not support WebGPU.')
    }
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
    if (!adapter) throw new WebGPUUnsupported('No GPU adapter available.')
    if (this.disposed) return // 언마운트됨 — device조차 만들지 않는다
    this.device = await adapter.requestDevice()
    if (this.disposed) {
      // requestDevice await 도중 언마운트됨 — 방금 만든 device만 정리하고 나머지 생성을 건너뛴다.
      this.device.destroy()
      return
    }
    // 컨텍스트 손실 = 주 트리거. 손실 시 대부분의 WebGPU 호출은 동기 throw가 아니라 async no-op이
    // 되므로(sleep/wake·TDR), frame의 try/catch만으론 못 잡는다. lost 프로미스로 확실히 잡는다.
    // destroy()는 disposed=true를 device.destroy() '전에' 세우므로 우리 자신의 teardown은 걸러진다.
    this.device.lost.then((info) => {
      if (this.disposed) return
      this.running = false
      this.lost = info
      this.onLost?.(info)
    })

    const ctx = this.canvas.getContext('webgpu')
    if (!ctx) throw new WebGPUUnsupported('Could not create a WebGPU canvas context.')
    this.ctx = ctx
    const format = navigator.gpu.getPreferredCanvasFormat()
    this.ctx.configure({ device: this.device, format, alphaMode: 'opaque' })

    const d = this.device
    const n = this.W * this.H

    for (let i = 0; i < 2; i++) {
      this.cells.push(
        d.createBuffer({
          size: n * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        }),
      )
    }
    const init = new Uint32Array(n).fill(EMPTY_ID)
    d.queue.writeBuffer(this.cells[0], 0, init)
    d.queue.writeBuffer(this.cells[1], 0, init)

    this.lightA = d.createBuffer({ size: n * 16, usage: GPUBufferUsage.STORAGE })
    this.lightB = d.createBuffer({ size: n * 16, usage: GPUBufferUsage.STORAGE })

    this.inkBuf = d.createBuffer({ size: INK_SLOTS * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST })
    this.params = d.createBuffer({ size: PARAMS_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })

    const { props, rx } = packMaterials(this.mats)
    this.propsBuf = d.createBuffer({ size: props.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    d.queue.writeBuffer(this.propsBuf, 0, props)
    this.rxBuf = d.createBuffer({ size: rx.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    d.queue.writeBuffer(this.rxBuf, 0, rx)

    // ── 워터마크 텍스처 ──
    // 도메인 호스트를 2D 캔버스에 그려 GPU 텍스처로. 녹화 중에만 렌더가 우하단에 합성한다.
    // SITE에서 파생 → sandlab.app 도메인이 붙으면 워터마크도 자동으로 그 호스트가 된다.
    {
      const WMW = 512
      const WMH = 96
      const wc = document.createElement('canvas')
      wc.width = WMW
      wc.height = WMH
      const wctx = wc.getContext('2d')
      // 확정 브랜드 도메인. SITE 호스트(현 workers.dev)는 너무 길어 잘리므로 짧은 브랜드로 고정.
      const label = 'sandlab.app'
      void SITE // 도메인 붙으면 여기를 SITE 호스트로 바꿔도 됨(지금은 브랜드 고정)
      if (wctx) {
        wctx.clearRect(0, 0, WMW, WMH)
        wctx.font = '700 62px ui-sans-serif, system-ui, -apple-system, sans-serif'
        wctx.textAlign = 'right'
        wctx.textBaseline = 'middle'
        wctx.shadowColor = 'rgba(0,0,0,0.85)'
        wctx.shadowBlur = 12
        wctx.fillStyle = 'rgba(248, 226, 178, 0.96)'
        wctx.fillText(label, WMW - 10, WMH / 2)
      }
      this.watermark = d.createTexture({
        size: [WMW, WMH],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      })
      d.queue.copyExternalImageToTexture({ source: wc }, { texture: this.watermark }, [WMW, WMH])
      this.wmSampler = d.createSampler({ magFilter: 'linear', minFilter: 'linear' })
    }

    const simMod = d.createShaderModule({ code: SIM_WGSL })
    const bloomMod = d.createShaderModule({ code: BLOOM_WGSL })
    const renderMod = d.createShaderModule({ code: RENDER_WGSL })

    // ── 시뮬 레이아웃 ──
    const simLayout = d.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    })
    const simPl = d.createPipelineLayout({ bindGroupLayouts: [simLayout] })
    this.simPipe = d.createComputePipeline({ layout: simPl, compute: { module: simMod, entryPoint: 'simulate' } })
    this.paintPipe = d.createComputePipeline({ layout: simPl, compute: { module: simMod, entryPoint: 'paint' } })

    // ── 블룸 레이아웃 ──
    const bloomLayout = d.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      ],
    })
    const bloomPl = d.createPipelineLayout({ bindGroupLayouts: [bloomLayout] })
    this.seedPipe = d.createComputePipeline({ layout: bloomPl, compute: { module: bloomMod, entryPoint: 'seed' } })
    this.blurHPipe = d.createComputePipeline({ layout: bloomPl, compute: { module: bloomMod, entryPoint: 'blurH' } })
    this.blurVPipe = d.createComputePipeline({ layout: bloomPl, compute: { module: bloomMod, entryPoint: 'blurV' } })

    // ── 렌더 레이아웃 ──
    const renderLayout = d.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 5, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      ],
    })
    this.renderPipe = d.createRenderPipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
      vertex: { module: renderMod, entryPoint: 'vs' },
      fragment: { module: renderMod, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    })

    for (let i = 0; i < 2; i++) {
      this.simBind.push(
        d.createBindGroup({
          layout: simLayout,
          entries: [
            { binding: 0, resource: { buffer: this.cells[i] } },
            { binding: 1, resource: { buffer: this.cells[1 - i] } },
            { binding: 2, resource: { buffer: this.params } },
            { binding: 3, resource: { buffer: this.propsBuf } },
            { binding: 4, resource: { buffer: this.rxBuf } },
            { binding: 5, resource: { buffer: this.inkBuf } },
          ],
        }),
      )
      this.bloomBind.push(
        d.createBindGroup({
          layout: bloomLayout,
          entries: [
            { binding: 0, resource: { buffer: this.cells[i] } },
            { binding: 1, resource: { buffer: this.lightA } },
            { binding: 2, resource: { buffer: this.lightB } },
            { binding: 3, resource: { buffer: this.params } },
            { binding: 4, resource: { buffer: this.propsBuf } },
          ],
        }),
      )
      this.renderBind.push(
        d.createBindGroup({
          layout: renderLayout,
          entries: [
            { binding: 0, resource: { buffer: this.cells[i] } },
            { binding: 1, resource: { buffer: this.params } },
            { binding: 2, resource: { buffer: this.propsBuf } },
            { binding: 3, resource: { buffer: this.lightA } },
            { binding: 4, resource: this.watermark.createView() },
            { binding: 5, resource: this.wmSampler },
          ],
        }),
      )
    }
  }

  private writeParams(offset: number) {
    this.device.queue.writeBuffer(
      this.params,
      0,
      packParams({
        W: this.W,
        H: this.H,
        offset,
        tick: this.tick,
        matCount: this.mats.length,
        brushX: this.brush.x,
        brushY: this.brush.y,
        brushR: this.brush.r,
        brushMat: this.brush.mat,
        // 새 획의 첫 프레임이면 시작점 = 현재점 (직전 획 끝에서 선이 그어지면 안 된다)
        prevX: this.prev.x < 0 ? this.brush.x : this.prev.x,
        prevY: this.prev.y < 0 ? this.brush.y : this.prev.y,
        recording: this.recording, // 녹화 중에만 워터마크 합성
        paintEmptyOnly: this.paintEmptyOnly,
      }),
    )
  }

  private frame = (t: number) => {
    if (!this.running) return
    try {
      this.step(t)
    } catch (e) {
      // 동기 throw(예: getCurrentTexture) — device.lost 프로미스가 못 잡는 경로. 루프를 멈추고
      // 신호를 낸다. 재스케줄하지 않는다(스핀 방지). 무신호 영구 사망 대신 UI가 복구를 안내한다.
      this.running = false
      this.lost = this.lost ?? ({ reason: 'unknown', message: String(e) } as GPUDeviceLostInfo)
      this.onLost?.(this.lost ?? undefined)
      return
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private step = (t: number) => {
    const d = this.device
    const gx = Math.ceil(this.W / 8)
    const gy = Math.ceil(this.H / 8)

    // 1~2. 시뮬 + 브러시 — 기본 프레임당 1틱. stepsPerFrame>1(검증기)이면 렌더 없이 여러 틱을 돈다.
    //      틱마다 params가 달라서(offset·tick·brush) 틱마다 writeParams → 개별 submit 한다.
    for (let k = 0; k < this.stepsPerFrame; k++) {
      this.onTick?.(this.tick) // 리플레이가 이 틱의 브러시를 세팅한다(결정적 재생)
      this.writeParams(this.tick % 2)
      const enc = d.createCommandEncoder()
      {
        const p = enc.beginComputePass()
        p.setPipeline(this.simPipe)
        p.setBindGroup(0, this.simBind[this.cur])
        p.dispatchWorkgroups(Math.ceil((this.W / 2 + 1) / 8), Math.ceil((this.H / 2 + 1) / 8))
        p.end()
      }
      if (this.brush.mat !== 0xffffffff && this.brush.x >= 0) {
        const p = enc.beginComputePass()
        p.setPipeline(this.paintPipe)
        p.setBindGroup(0, this.simBind[this.cur])
        p.dispatchWorkgroups(gx, gy)
        p.end()
      }
      d.queue.submit([enc.finish()])
      // 다음 틱 캡슐의 시작점. 브러시를 떼면 리셋해서 획이 이어지지 않게 한다.
      if (this.brush.mat !== 0xffffffff && this.brush.x >= 0) {
        this.prev.x = this.brush.x
        this.prev.y = this.brush.y
      } else {
        this.prev.x = -1
        this.prev.y = -1
      }
      this.cur = 1 - this.cur
      this.tick++
    }

    // 방금 쓴 dst = cells[cur] (루프에서 이미 뒤집었다).
    const enc = d.createCommandEncoder()
    // 3. 블룸 — 저사양(lite)에선 스킵해 fps를 회복시킨다.
    //    스킵 시 렌더는 영속 lightA 버퍼(마지막 값/0)를 읽어 글로우만 빠진다(붕괴 없음).
    if (!this.lite) {
      const p = enc.beginComputePass()
      p.setBindGroup(0, this.bloomBind[this.cur])
      p.setPipeline(this.seedPipe)
      p.dispatchWorkgroups(gx, gy)
      p.setPipeline(this.blurHPipe)
      p.dispatchWorkgroups(gx, gy)
      p.setPipeline(this.blurVPipe)
      p.dispatchWorkgroups(gx, gy)
      p.end()
    }
    // 4. 렌더
    {
      const view = this.ctx.getCurrentTexture().createView()
      const p = enc.beginRenderPass({
        colorAttachments: [
          { view, clearValue: { r: 0.027, g: 0.031, b: 0.043, a: 1 }, loadOp: 'clear', storeOp: 'store' },
        ],
      })
      p.setPipeline(this.renderPipe)
      p.setBindGroup(0, this.renderBind[this.cur])
      p.draw(3)
      p.end()
    }
    d.queue.submit([enc.finish()])

    this.frames++
    if (t - this.lastFpsAt >= 1000) {
      this.fps = Math.round((this.frames * 1000) / (t - this.lastFpsAt))
      this.frames = 0
      this.lastFpsAt = t
      // 녹화 중엔 티어를 고정한다 — 안 그러면 10초 클립 도중 fps가 경계를 넘나들 때
      // 글로우가 켜졌다 꺼지며 공유용 클립에 그 전환이 그대로 박제된다(캡처는 화면 그대로 담아서 되돌릴 수 없다).
      if (!this.recording) this.lite = pickQuality(this.fps, this.lite)
    }
  }

  /**
   * rAF 없이 한 프레임(시뮬 stepsPerFrame틱 + 렌더) 진행 — /play/verify 전용. 탭이 안 보이면 크롬이 rAF를
   * 멈춰서 검증이 사실상 정지한다. start() 없이 이걸 직접 돌리고 settle()로 GPU 큐를 비우며 진행한다.
   */
  advance() {
    this.step(performance.now())
  }

  /** 제출한 GPU 작업이 끝날 때까지 대기(큐 폭주 방지). */
  settle(): Promise<void> {
    return this.device.queue.onSubmittedWorkDone()
  }

  /** 현재 시뮬 틱(레벨 시작 기준 리플레이·판정용). */
  get currentTick() {
    return this.tick
  }

  /** 틱·버퍼 인덱스·획 시작점을 초기화 — 레벨 시작/Reset 시 upload와 함께 호출해 결정적 재생을 보장한다. */
  resetTick() {
    this.tick = 0
    this.cur = 0
    this.prev.x = -1
    this.prev.y = -1
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastFpsAt = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  clear() {
    const init = new Uint32Array(this.W * this.H).fill(EMPTY_ID)
    this.device.queue.writeBuffer(this.cells[0], 0, init)
    this.device.queue.writeBuffer(this.cells[1], 0, init)
  }

  async readback(): Promise<Uint32Array<ArrayBuffer>> {
    const d = this.device
    const bytes = this.W * this.H * 4
    const staging = d.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
    const enc = d.createCommandEncoder()
    enc.copyBufferToBuffer(this.cells[1 - this.cur], 0, staging, 0, bytes)
    d.queue.submit([enc.finish()])
    await staging.mapAsync(GPUMapMode.READ)
    const out = new Uint32Array(staging.getMappedRange().slice(0))
    staging.unmap()
    staging.destroy()
    return out
  }

  /** 재료별 '실제로 칠한 셀 수'(paint 패스 atomic 카운터). 챌린지 잉크. */
  async readInk(): Promise<Uint32Array<ArrayBuffer>> {
    const d = this.device
    const bytes = INK_SLOTS * 4
    const staging = d.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
    const enc = d.createCommandEncoder()
    enc.copyBufferToBuffer(this.inkBuf, 0, staging, 0, bytes)
    d.queue.submit([enc.finish()])
    await staging.mapAsync(GPUMapMode.READ)
    const out = new Uint32Array(staging.getMappedRange().slice(0))
    staging.unmap()
    staging.destroy()
    return out
  }

  resetInk() {
    this.device.queue.writeBuffer(this.inkBuf, 0, new Uint32Array(INK_SLOTS))
  }

  upload(cells: Uint32Array<ArrayBuffer>) {
    this.device.queue.writeBuffer(this.cells[0], 0, cells)
    this.device.queue.writeBuffer(this.cells[1], 0, cells)
  }

  destroy() {
    this.disposed = true // init이 아직 await 중이면 이 플래그로 조기 반환·정리하게 한다
    this.stop()
    this.cells.forEach((b) => b.destroy())
    this.lightA?.destroy()
    this.lightB?.destroy()
    this.params?.destroy()
    this.inkBuf?.destroy()
    this.propsBuf?.destroy()
    this.rxBuf?.destroy()
    this.watermark?.destroy()
    // device를 해제하면 파이프라인/바인드그룹/셰이더모듈 등 종속 리소스가 전부 회수된다.
    // (개별 destroy API가 없는 것들이라 device 파괴에 의존한다.)
    this.device?.destroy()
  }
}
