/** Shared WebGL2 program helpers for custom map layers. */

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
): WebGLShader {
  const sh = gl.createShader(type) as WebGLShader
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`shader: ${gl.getShaderInfoLog(sh) ?? '?'}`)
  }
  return sh
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram {
  const p = gl.createProgram() as WebGLProgram
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vertSrc))
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`link: ${gl.getProgramInfoLog(p) ?? '?'}`)
  }
  return p
}
