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

export class SandEngine {
  private device!: GPUDevice
  private ctx!: GPUCanvasContext
  private cells: GPUBuffer[] = []
  private lightA!: GPUBuffer
  private lightB!: GPUBuffer
  private params!: GPUBuffer
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

  /** 성능 관측 — 실제 FPS. 해상도 판단 근거가 필요하다. */
  fps = 0
  private frames = 0
  private lastFpsAt = 0

  readonly W: number
  readonly H: number
  private mats: Material[]
  private canvas: HTMLCanvasElement

  brush = { x: -1, y: -1, r: 6, mat: 0xffffffff }
  /** 직전 프레임의 브러시 위치. 캡슐 보간의 시작점. */
  private prev = { x: -1, y: -1 }

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

    this.params = d.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })

    const { props, rx } = packMaterials(this.mats)
    this.propsBuf = d.createBuffer({ size: props.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    d.queue.writeBuffer(this.propsBuf, 0, props)
    this.rxBuf = d.createBuffer({ size: rx.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    d.queue.writeBuffer(this.rxBuf, 0, rx)

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
          ],
        }),
      )
    }
  }

  private writeParams(offset: number) {
    const p = new ArrayBuffer(48)
    const u = new Uint32Array(p)
    const i = new Int32Array(p)
    u[0] = this.W
    u[1] = this.H
    u[2] = offset
    u[3] = this.tick
    u[4] = this.mats.length
    i[5] = this.brush.x
    i[6] = this.brush.y
    i[7] = this.brush.r
    u[8] = this.brush.mat
    // 새 획의 첫 프레임이면 시작점 = 현재점 (직전 획 끝에서 선이 그어지면 안 된다)
    i[9] = this.prev.x < 0 ? this.brush.x : this.prev.x
    i[10] = this.prev.y < 0 ? this.brush.y : this.prev.y
    this.device.queue.writeBuffer(this.params, 0, p)
  }

  private frame = (t: number) => {
    if (!this.running) return
    const d = this.device
    this.writeParams(this.tick % 2)
    const enc = d.createCommandEncoder()

    const gx = Math.ceil(this.W / 8)
    const gy = Math.ceil(this.H / 8)

    // 1. 시뮬
    {
      const p = enc.beginComputePass()
      p.setPipeline(this.simPipe)
      p.setBindGroup(0, this.simBind[this.cur])
      p.dispatchWorkgroups(Math.ceil((this.W / 2 + 1) / 8), Math.ceil((this.H / 2 + 1) / 8))
      p.end()
    }
    // 2. 브러시
    if (this.brush.mat !== 0xffffffff && this.brush.x >= 0) {
      const p = enc.beginComputePass()
      p.setPipeline(this.paintPipe)
      p.setBindGroup(0, this.simBind[this.cur])
      p.dispatchWorkgroups(gx, gy)
      p.end()
    }
    // 3. 블룸 (dst = 1-cur 를 읽는다)
    {
      const p = enc.beginComputePass()
      p.setBindGroup(0, this.bloomBind[1 - this.cur])
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
      p.setBindGroup(0, this.renderBind[1 - this.cur])
      p.draw(3)
      p.end()
    }

    d.queue.submit([enc.finish()])
    // 다음 프레임 캡슐의 시작점. 브러시를 떼면 리셋해서 획이 이어지지 않게 한다.
    if (this.brush.mat !== 0xffffffff && this.brush.x >= 0) {
      this.prev.x = this.brush.x
      this.prev.y = this.brush.y
    } else {
      this.prev.x = -1
      this.prev.y = -1
    }
    this.cur = 1 - this.cur
    this.tick++

    this.frames++
    if (t - this.lastFpsAt >= 1000) {
      this.fps = Math.round((this.frames * 1000) / (t - this.lastFpsAt))
      this.frames = 0
      this.lastFpsAt = t
    }
    this.raf = requestAnimationFrame(this.frame)
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
    this.propsBuf?.destroy()
    this.rxBuf?.destroy()
    // device를 해제하면 파이프라인/바인드그룹/셰이더모듈 등 종속 리소스가 전부 회수된다.
    // (개별 destroy API가 없는 것들이라 device 파괴에 의존한다.)
    this.device?.destroy()
  }
}
