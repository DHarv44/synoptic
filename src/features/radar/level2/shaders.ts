/** Polar sweep shaders: quad over the radar, fragment does mercator→(range,az). */

export const SWEEP_VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
uniform mat4 u_matrix;
uniform vec2 u_siteMerc;
uniform float u_halfMerc; // quad half-size in mercator units
out vec2 v_offset; // fraction of half-size, +x east, +y up-screen(north)
void main() {
  v_offset = a_pos;
  vec2 merc = u_siteMerc + vec2(a_pos.x, -a_pos.y) * u_halfMerc;
  gl_Position = u_matrix * vec4(merc, 0.0, 1.0);
}
`

export const SWEEP_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_sweep; // R8 raw bytes, width=gates, height=azBins
uniform sampler2D u_lut;   // 256x1 RGBA
uniform float u_rangeM;    // quad half-size, meters
uniform float u_firstGateM;
uniform float u_gateSpanM; // gates * spacing
uniform float u_scale;
uniform float u_offsetV;
uniform float u_lutMin;
uniform float u_lutMax;
uniform float u_opacity;
in vec2 v_offset;
out vec4 o_color;

void main() {
  vec2 m = v_offset * u_rangeM; // meters east/north of site
  float range = length(m);
  float u = (range - u_firstGateM) / u_gateSpanM;
  if (u < 0.0 || u > 1.0) discard;
  float az = degrees(atan(m.x, m.y)); // 0 = north, clockwise
  float v = fract(az / 360.0);
  float raw = texture(u_sweep, vec2(u, v)).r * 255.0;
  if (raw < 2.0) discard;
  float value = (raw - u_offsetV) / u_scale;
  float idx = clamp((value - u_lutMin) / (u_lutMax - u_lutMin) * 255.0, 0.0, 255.0);
  vec4 c = texture(u_lut, vec2((idx + 0.5) / 256.0, 0.5));
  if (c.a < 0.01) discard;
  o_color = vec4(c.rgb, c.a * u_opacity);
}
`
