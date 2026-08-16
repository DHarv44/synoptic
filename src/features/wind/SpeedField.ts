import { FIELD_FRAG, QUAD_VERT } from '@/features/wind/shaders'
import { linkProgram } from '@/map/glUtils'

/**
 * The Windy-style wind-speed wash: a full-screen pass that unprojects each
 * fragment through the inverse map matrix and colours it by sampled speed.
 * The field carries the colour story; the particles above carry motion.
 */
export class SpeedField {
  private readonly gl: WebGL2RenderingContext
  private readonly program: WebGLProgram
  private readonly vao: WebGLVertexArrayObject

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.program = linkProgram(gl, QUAD_VERT, FIELD_FRAG)
    this.vao = gl.createVertexArray() as WebGLVertexArrayObject
    gl.bindVertexArray(this.vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
  }

  draw(matrixInv: Float32Array, windTex: WebGLTexture, windScale: number, opacity: number): void {
    const { gl } = this
    gl.useProgram(this.program)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, windTex)
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_wind'), 1)
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_windScale'), windScale)
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_matrixInv'), false, matrixInv)
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_opacity'), opacity)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    this.gl.deleteProgram(this.program)
  }
}
