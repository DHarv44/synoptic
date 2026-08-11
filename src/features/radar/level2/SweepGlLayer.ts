import type { CustomLayerInterface, Map as MLMap } from 'maplibre-gl'
import { SWEEP_FRAG, SWEEP_VERT } from '@/features/radar/level2/shaders'
import { LUT_RANGES, reflectivityLut, velocityLut } from '@/features/radar/level2/colormap'
import type { SweepMessage } from '@/features/radar/level2/worker'
import { linkProgram } from '@/map/glUtils'

const EARTH_CIRC = 40075016.686
/** Radar display range (m) — the sweep quad's half-size. */
export const RANGE_M = 460_000
const DEG = Math.PI / 180

/** MapLibre custom layer drawing one polar sweep around a site. */
export class SweepGlLayer implements CustomLayerInterface {
  readonly id = 'level2-sweep'
  readonly type = 'custom' as const
  readonly renderingMode = '2d' as const

  opacity = 0.85
  srvEnabled = false
  stormU = 0
  stormV = 0
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private vao: WebGLVertexArrayObject | null = null
  private sweepTex: WebGLTexture | null = null
  private lutTex: WebGLTexture | null = null
  private meta: SweepMessage | null = null
  private site: { lat: number; lon: number } | null = null
  private map: MLMap | null = null

  setSite(lat: number, lon: number): void {
    this.site = { lat, lon }
  }

  setSweep(msg: SweepMessage): void {
    this.meta = msg
    const gl = this.gl
    if (!gl) return
    if (msg.moment !== this.lutMoment) {
      this.lutMoment = msg.moment
      gl.bindTexture(gl.TEXTURE_2D, this.lutTex)
      const lut = msg.moment === 'VEL' ? velocityLut() : reflectivityLut()
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut)
    }
    gl.bindTexture(gl.TEXTURE_2D, this.sweepTex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, msg.gates, msg.azBins, 0, gl.RED, gl.UNSIGNED_BYTE, msg.tex)
    this.map?.triggerRepaint()
  }

  private lutMoment = 'REF'

  onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error('WebGL2 required')
    this.map = map
    this.gl = gl
    this.program = linkProgram(gl, SWEEP_VERT, SWEEP_FRAG)

    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(this.program, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    this.sweepTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.sweepTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

    this.lutTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, reflectivityLut())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  }

  onRemove(): void {
    const gl = this.gl
    if (gl) {
      gl.deleteTexture(this.sweepTex)
      gl.deleteTexture(this.lutTex)
      if (this.program) gl.deleteProgram(this.program)
      if (this.vao) gl.deleteVertexArray(this.vao)
    }
    this.gl = null
    this.map = null
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: unknown): void {
    const gl = this.gl
    if (!gl || !this.program || !this.meta || !this.site) return
    const matrix =
      (args as { defaultProjectionData?: { mainMatrix?: number[] } }).defaultProjectionData
        ?.mainMatrix ?? (args as number[])

    const latR = this.site.lat * DEG
    const mercX = (this.site.lon + 180) / 360
    const mercY =
      0.5 - Math.log(Math.tan(Math.PI / 4 + latR / 2)) / (2 * Math.PI)
    const halfMerc = RANGE_M / (EARTH_CIRC * Math.cos(latR))

    const u = (n: string): WebGLUniformLocation | null => gl.getUniformLocation(this.program as WebGLProgram, n)
    gl.useProgram(this.program)
    gl.uniformMatrix4fv(u('u_matrix'), false, matrix as number[])
    gl.uniform2f(u('u_siteMerc'), mercX, mercY)
    gl.uniform1f(u('u_halfMerc'), halfMerc)
    gl.uniform1f(u('u_rangeM'), RANGE_M)
    gl.uniform1f(u('u_firstGateM'), this.meta.firstGateM)
    gl.uniform1f(u('u_gateSpanM'), this.meta.gates * this.meta.gateSpacingM)
    gl.uniform1f(u('u_scale'), this.meta.scale)
    gl.uniform1f(u('u_offsetV'), this.meta.offset)
    const [lutMin, lutMax] = LUT_RANGES[this.meta.moment] ?? LUT_RANGES.REF
    gl.uniform1f(u('u_lutMin'), lutMin)
    gl.uniform1f(u('u_lutMax'), lutMax)
    gl.uniform1f(u('u_opacity'), this.opacity)
    const srvActive = this.srvEnabled && this.meta.moment === 'VEL' ? 1 : 0
    gl.uniform1f(u('u_srv'), srvActive)
    gl.uniform2f(u('u_storm'), this.stormU, this.stormV)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sweepTex)
    gl.uniform1i(u('u_sweep'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex)
    gl.uniform1i(u('u_lut'), 1)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)
  }
}
