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
uniform float u_srv;    // 1 = subtract storm motion (VEL only)
uniform vec2 u_storm;   // storm motion u,v (m/s)
uniform float u_smooth; // 1 = interpolate between gates
uniform vec2 u_texel;   // 1/gates, 1/azBins
in vec2 v_offset;
out vec4 o_color;

/**
 * Bilinear across range and azimuth, skipping gates that measured nothing.
 * Raw 0 and 1 are sentinels for below-threshold and range-folded, so a
 * straight hardware LINEAR filter would blend "no data" with real returns
 * and paint mid-range echo along every edge. Weights are renormalised over
 * whichever neighbours are real.
 */
float smoothRaw(vec2 uv) {
  vec2 p = uv / u_texel - 0.5;
  vec2 base = floor(p);
  vec2 f = p - base;
  float total = 0.0;
  float wsum = 0.0;
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 t = (base + vec2(float(i), float(j)) + 0.5) * u_texel;
      t.y = fract(t.y); // azimuth wraps at north
      float r = texture(u_sweep, t).r * 255.0;
      if (r < 2.0) continue;
      float w = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);
      total += r * w;
      wsum += w;
    }
  }
  return wsum > 0.0 ? total / wsum : 0.0;
}

void main() {
  vec2 m = v_offset * u_rangeM; // meters east/north of site
  float range = length(m);
  float u = (range - u_firstGateM) / u_gateSpanM;
  if (u < 0.0 || u > 1.0) discard;
  float azR = atan(m.x, m.y); // 0 = north, clockwise
  float az = degrees(azR);
  float v = fract(az / 360.0);
  // The gate under this fragment decides whether there is echo here at all.
  // Smoothing then softens the colour steps without letting interpolation
  // extend echo into gates that measured none.
  float nearest = texture(u_sweep, vec2(u, v)).r * 255.0;
  if (nearest < 2.0) discard;
  float raw = u_smooth > 0.5 ? smoothRaw(vec2(u, v)) : nearest;
  if (raw < 2.0) raw = nearest;
  float value = (raw - u_offsetV) / u_scale;
  // storm-relative: remove the along-beam component of storm motion
  value -= u_srv * (u_storm.x * sin(azR) + u_storm.y * cos(azR));
  float idx = clamp((value - u_lutMin) / (u_lutMax - u_lutMin) * 255.0, 0.0, 255.0);
  vec4 c = texture(u_lut, vec2((idx + 0.5) / 256.0, 0.5));
  if (c.a < 0.01) discard;
  o_color = vec4(c.rgb, c.a * u_opacity);
}
`
