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
uniform float u_plain; // 1 = pale monochrome (field carries the colour)
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
  col = mix(col, vec3(0.92, 0.94, 0.97), u_plain);
  o_color = vec4(col, u_opacity);
}
`

/** Blit a screen texture at an opacity — the trail persistence pass. */
export const TEX_FRAG = /* glsl */ `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform float u_fade;
in vec2 v_uv;
out vec4 o_color;
void main() {
  vec4 c = texture(u_tex, v_uv);
  // Fade toward zero and clamp the tail so trails end instead of ghosting.
  c *= u_fade;
  if (c.a < 0.012) c = vec4(0.0);
  o_color = c;
}
`

/**
 * The speed field: every fragment is unprojected clip → mercator via the
 * inverse matrix, converted to lon/lat, and coloured by sampled wind speed
 * on a Windy-style ramp. The colour story lives here; particles on top
 * carry only the motion.
 */
export const FIELD_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_wind;
uniform float u_windScale;
uniform mat4 u_matrixInv;
uniform float u_opacity;
in vec2 v_uv;
out vec4 o_color;

const float PI = 3.14159265358979;

vec3 ramp(float s) {
  // 0 → 40+ m/s: violet calm, blue, teal, green, yellow, orange, red, magenta.
  vec3 c = vec3(0.42, 0.35, 0.62);
  c = mix(c, vec3(0.28, 0.44, 0.76), smoothstep(1.0, 4.0, s));
  c = mix(c, vec3(0.20, 0.65, 0.68), smoothstep(4.0, 8.0, s));
  c = mix(c, vec3(0.34, 0.74, 0.35), smoothstep(8.0, 13.0, s));
  c = mix(c, vec3(0.88, 0.82, 0.30), smoothstep(13.0, 19.0, s));
  c = mix(c, vec3(0.92, 0.55, 0.24), smoothstep(19.0, 27.0, s));
  c = mix(c, vec3(0.86, 0.26, 0.22), smoothstep(27.0, 36.0, s));
  c = mix(c, vec3(0.80, 0.24, 0.62), smoothstep(36.0, 48.0, s));
  return c;
}

void main() {
  // Fragment → mercator by ray-casting: unproject the near and far clip
  // points and intersect with the z=0 map plane. Unprojecting clip z=0
  // directly is wrong under a perspective matrix — that plane is not the
  // map, and every sample lands scaled off-world.
  vec2 clip = v_uv * 2.0 - 1.0;
  vec4 nearP = u_matrixInv * vec4(clip, -1.0, 1.0);
  vec4 farP = u_matrixInv * vec4(clip, 1.0, 1.0);
  vec3 n = nearP.xyz / nearP.w;
  vec3 f = farP.xyz / farP.w;
  float t = n.z / (n.z - f.z);
  vec2 merc = mix(n.xy, f.xy, t);
  float lon01 = fract(merc.x + 0.5); // mercator x 0..1 → lon texture x (0..360 grid)
  float latR = 2.0 * atan(exp((0.5 - merc.y) * 2.0 * PI)) - PI * 0.5;
  float lat01 = (degrees(latR) + 90.0) / 180.0;
  if (lat01 < 0.0 || lat01 > 1.0) discard;
  vec2 windRaw = texture(u_wind, vec2(lon01, lat01)).rg;
  float speed = length((windRaw * 2.0 - 1.0) * 127.0 * u_windScale);
  o_color = vec4(ramp(speed), u_opacity);
}
`
