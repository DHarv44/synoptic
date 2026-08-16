import { DRAW_FRAG, DRAW_VERT, QUAD_VERT, SIM_FRAG, TEX_FRAG } from '@/features/wind/shaders'
import type { WindField } from '@/features/wind/service'
import { linkProgram } from '@/map/glUtils'

/**
 * GPGPU particle advection through a wind field (webgl-wind pattern):
 * positions ping-pong between two RG32F textures; the draw composites
 * through a screen-sized persistence buffer, so particles leave fading
 * TRAILS — the difference between flow and static noise. History lives in
 * screen space, so any camera change clears it rather than smearing it.
 */
export class ParticleSystem {
  private readonly gl: WebGL2RenderingContext
  private readonly simProgram: WebGLProgram
  private readonly drawProgram: WebGLProgram
  private readonly texProgram: WebGLProgram
  private readonly quadVao: WebGLVertexArrayObject
  private readonly emptyVao: WebGLVertexArrayObject
  private readonly fbo: WebGLFramebuffer
  private state: [WebGLTexture, WebGLTexture]
  private screen: [WebGLTexture, WebGLTexture] | null = null
  private screenW = 0
  private screenH = 0
  private lastMatrix: Float32Array | null = null
  readonly windTex: WebGLTexture
  windScale = 100 / 127
  private res: number
  private frame = 0

  /** Trail length: fraction of each frame kept. 0 disables persistence. */
  fade = 0.955

  constructor(gl: WebGL2RenderingContext, particleCount: number) {
    this.gl = gl
    if (!gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('EXT_color_buffer_float unavailable')
    }
    this.simProgram = linkProgram(gl, QUAD_VERT, SIM_FRAG)
    this.drawProgram = linkProgram(gl, DRAW_VERT, DRAW_FRAG)
    this.texProgram = linkProgram(gl, QUAD_VERT, TEX_FRAG)

    this.quadVao = gl.createVertexArray() as WebGLVertexArrayObject
    gl.bindVertexArray(this.quadVao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    this.emptyVao = gl.createVertexArray() as WebGLVertexArrayObject

    this.res = Math.ceil(Math.sqrt(particleCount))
    this.state = [this.makeStateTexture(), this.makeStateTexture()]
    this.fbo = gl.createFramebuffer() as WebGLFramebuffer
    this.windTex = gl.createTexture() as WebGLTexture
    // Calm until real data arrives: an uninitialized texture samples (0,0),
    // which decodes to −100 m/s in BOTH components — every particle red and
    // screaming southwest, at any level, forever.
    gl.bindTexture(gl.TEXTURE_2D, this.windTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, 1, 1, 0, gl.RG, gl.UNSIGNED_BYTE, new Uint8Array([128, 128]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  private makeStateTexture(): WebGLTexture {
    const { gl, res } = this
    const tex = gl.createTexture() as WebGLTexture
    const init = new Float32Array(res * res * 2)
    for (let i = 0; i < res * res; i++) {
      init[i * 2] = Math.random()
      init[i * 2 + 1] = 0.08 + 0.84 * Math.random()
    }
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, res, res, 0, gl.RG, gl.FLOAT, init)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  setWind(field: WindField): void {
    const { gl } = this
    const { width, height } = field.header
    this.windScale = field.header.scale
    const rg = new Uint8Array(width * height * 2)
    for (let i = 0; i < width * height; i++) {
      rg[i * 2] = field.u[i] + 128
      rg[i * 2 + 1] = field.v[i] + 128
    }
    gl.bindTexture(gl.TEXTURE_2D, this.windTex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, width, height, 0, gl.RG, gl.UNSIGNED_BYTE, rg)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  /** One sim substep into the back state texture. */
  step(dtSimSeconds: number): void {
    const { gl } = this
    // We share MapLibre's GL context mid-frame: whatever framebuffer and
    // viewport the map was using must come back EXACTLY, or the draw pass
    // (and every layer after us) renders into a state-texture-sized box in
    // the corner — which is precisely how this layer was broken for weeks.
    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.state[1], 0)
    gl.viewport(0, 0, this.res, this.res)
    gl.disable(gl.BLEND)
    gl.useProgram(this.simProgram)
    this.bindCommon(this.simProgram)
    gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_dt'), dtSimSeconds)
    gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_seed'), (this.frame++ % 1000) + 1)
    gl.bindVertexArray(this.quadVao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo)
    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3])
    this.state = [this.state[1], this.state[0]]
  }

  /** (Re)build the screen ping-pong at the canvas size, cleared. */
  private ensureScreen(): void {
    const { gl } = this
    const w = gl.drawingBufferWidth
    const h = gl.drawingBufferHeight
    if (this.screen && w === this.screenW && h === this.screenH) return
    if (this.screen) {
      gl.deleteTexture(this.screen[0])
      gl.deleteTexture(this.screen[1])
    }
    const make = (): WebGLTexture => {
      const tex = gl.createTexture() as WebGLTexture
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return tex
    }
    this.screen = [make(), make()]
    this.screenW = w
    this.screenH = h
    this.clearScreen()
  }

  private clearScreen(): void {
    const { gl } = this
    if (!this.screen) return
    for (const tex of this.screen) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }

  private drawTexture(tex: WebGLTexture, fade: number): void {
    const { gl } = this
    gl.useProgram(this.texProgram)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(gl.getUniformLocation(this.texProgram, 'u_tex'), 2)
    gl.uniform1f(gl.getUniformLocation(this.texProgram, 'u_fade'), fade)
    gl.bindVertexArray(this.quadVao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  private drawParticles(
    matrix: number[] | Float32Array,
    opacity: number,
    pointSize: number,
    plain: boolean,
  ): void {
    const { gl } = this
    gl.useProgram(this.drawProgram)
    this.bindCommon(this.drawProgram)
    gl.uniformMatrix4fv(gl.getUniformLocation(this.drawProgram, 'u_matrix'), false, matrix)
    gl.uniform1f(gl.getUniformLocation(this.drawProgram, 'u_stateRes'), this.res)
    gl.uniform1f(gl.getUniformLocation(this.drawProgram, 'u_pointSize'), pointSize)
    gl.uniform1f(gl.getUniformLocation(this.drawProgram, 'u_opacity'), opacity)
    gl.uniform1f(gl.getUniformLocation(this.drawProgram, 'u_plain'), plain ? 1 : 0)
    gl.bindVertexArray(this.emptyVao)
    gl.drawArrays(gl.POINTS, 0, this.res * this.res)
    gl.bindVertexArray(null)
  }

  draw(matrix: number[] | Float32Array, opacity: number, pointSize: number, plain: boolean): void {
    const { gl } = this
    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null
    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    this.ensureScreen()
    // Trail history is screen-space: a moved camera would smear it sideways.
    const m = Float32Array.from(matrix)
    const moved =
      this.lastMatrix === null || m.some((v, i) => Math.abs(v - (this.lastMatrix as Float32Array)[i]) > 1e-6)
    if (moved) this.clearScreen()
    this.lastMatrix = m

    const [prev, next] = this.screen as [WebGLTexture, WebGLTexture]
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, next, 0)
    gl.viewport(0, 0, this.screenW, this.screenH)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.BLEND)
    this.drawTexture(prev, this.fade)
    this.drawParticles(matrix, opacity, pointSize, plain)

    // Composite the accumulated trails onto the map.
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo)
    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3])
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    this.drawTexture(next, 1)
    this.screen = [next, prev]
  }

  private bindCommon(program: WebGLProgram): void {
    const { gl } = this
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.state[0])
    gl.uniform1i(gl.getUniformLocation(program, 'u_state'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.windTex)
    gl.uniform1i(gl.getUniformLocation(program, 'u_wind'), 1)
    gl.uniform1f(gl.getUniformLocation(program, 'u_windScale'), this.windScale)
  }

  dispose(): void {
    const { gl } = this
    gl.deleteTexture(this.state[0])
    gl.deleteTexture(this.state[1])
    gl.deleteTexture(this.windTex)
    if (this.screen) {
      gl.deleteTexture(this.screen[0])
      gl.deleteTexture(this.screen[1])
    }
    gl.deleteFramebuffer(this.fbo)
    gl.deleteProgram(this.simProgram)
    gl.deleteProgram(this.drawProgram)
    gl.deleteProgram(this.texProgram)
  }
}
