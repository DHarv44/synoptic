/** GLSL for the wind particle system (WebGL2). */

export const QUAD_VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/** Advects particle positions stored in an RG32F texture (equirect [0,1]²). */
export const SIM_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_state;   // RG32F: x = lon [0,1], y = lat [0,1]
uniform sampler2D u_wind;    // RG8: u,v quantized
uniform float u_windScale;   // int8 → m/s
uniform float u_dt;          // sim seconds per frame
uniform float u_seed;
in vec2 v_uv;
out vec4 o_state;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 pos = texture(u_state, v_uv).rg;
  vec2 windRaw = texture(u_wind, pos).rg;           // 0..1
  vec2 wind = (windRaw * 2.0 - 1.0) * 127.0 * u_windScale; // m/s

  float lat = pos.y * 180.0 - 90.0;
  float coslat = max(cos(radians(lat)), 0.05);
  // degrees moved this step
  float dLon = wind.x * u_dt / (111320.0 * coslat);
  float dLat = wind.y * u_dt / 110540.0;
  pos += vec2(dLon / 360.0, dLat / 180.0);
  pos.x = fract(pos.x);

  // respawn: rate scaled by speed so fast streams stay fed, plus polar clamp
  float speed = length(wind);
  float drop = 0.003 + speed * 0.0002;
  float rnd = hash(v_uv * 1000.0 + u_seed);
  if (rnd < drop || pos.y < 0.03 || pos.y > 0.97) {
    pos = vec2(hash(v_uv * 371.3 + u_seed), 0.05 + 0.9 * hash(v_uv * 913.7 + u_seed * 1.7));
  }
  o_state = vec4(pos, 0.0, 1.0);
}
`

/** Draws particles as points through the map's mercator matrix. */
export const DRAW_VERT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform sampler2D u_wind;
uniform float u_windScale;
uniform mat4 u_matrix;
uniform float u_stateRes;
uniform float u_pointSize;
out float v_speed;

const float PI = 3.14159265358979;

void main() {
  float idx = float(gl_VertexID);
  vec2 uv = (vec2(mod(idx, u_stateRes), floor(idx / u_stateRes)) + 0.5) / u_stateRes;
  vec2 pos = texture(u_state, uv).rg;

  vec2 windRaw = texture(u_wind, pos).rg;
  v_speed = length((windRaw * 2.0 - 1.0) * 127.0 * u_windScale);

  float lon = pos.x * 360.0;               // 0..360
  float lat = pos.y * 180.0 - 90.0;
  float mercX = fract((lon + 180.0) / 360.0); // wrap to mercator [0,1]
  float latR = radians(clamp(lat, -85.05, 85.05));
  float mercY = 0.5 - log(tan(PI * 0.25 + latR * 0.5)) / (2.0 * PI);

  gl_Position = u_matrix * vec4(mercX, mercY, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}
`

export const DRAW_FRAG = /* glsl */ `#version 300 es
precision mediump float;
uniform float u_opacity;
in float v_speed;
out vec4 o_color;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  // speed ramp: slate → cyan → yellow → red (0..40+ m/s)
  vec3 slow = vec3(0.45, 0.55, 0.65);
  vec3 mid = vec3(0.30, 0.85, 0.90);
  vec3 fast = vec3(1.00, 0.85, 0.30);
  vec3 max_ = vec3(1.00, 0.35, 0.25);
  vec3 col = mix(slow, mid, smoothstep(0.0, 10.0, v_speed));
  col = mix(col, fast, smoothstep(10.0, 25.0, v_speed));
  col = mix(col, max_, smoothstep(25.0, 45.0, v_speed));
  o_color = vec4(col, u_opacity);
}
`
