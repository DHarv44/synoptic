/** GLSL for the wind particle system (WebGL2). */

/**
 * Bicubic (B-spline, 4 bilinear taps) sample of the wind texture, decoded
 * to m/s. Bilinear on a 0.5° grid is fine at continental zoom, but zoomed
 * in one texel spans hundreds of pixels and each bilinear patch is a saddle
 * — the colour ramp's low-speed steps turned those saddles into hard
 * diagonal edges across the whole view, and particles marched in lockstep
 * along them. Cubic weights give a C1-continuous field; the slight blur is
 * a feature at this scale, since the data has no detail finer than the grid.
 */
const WIND_SAMPLE = /* glsl */ `
uniform sampler2D u_wind;    // RG8: u,v quantized
uniform float u_windScale;   // int8 → m/s

vec2 windAt(vec2 uv) {
  vec2 size = vec2(textureSize(u_wind, 0));
  vec2 texel = 1.0 / size;
  vec2 p = uv * size - 0.5;
  vec2 f = fract(p);
  p = floor(p) + 0.5;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 h0 = (w1 / g0) - 1.0;
  vec2 h1 = (w3 / g1) + 1.0;
  vec2 p0 = (p + h0) * texel;
  vec2 p1 = (p + h1) * texel;
  vec2 raw =
    g0.y * (g0.x * texture(u_wind, vec2(p0.x, p0.y)).rg + g1.x * texture(u_wind, vec2(p1.x, p0.y)).rg) +
    g1.y * (g0.x * texture(u_wind, vec2(p0.x, p1.y)).rg + g1.x * texture(u_wind, vec2(p1.x, p1.y)).rg);
  return (raw * 2.0 - 1.0) * 127.0 * u_windScale;
}
`

export const QUAD_VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/** Advects particle state in an RGBA32F texture: xy position, z age. */
export const SIM_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_state;   // RGBA32F: x = lon [0,1], y = lat [0,1], z = age
${WIND_SAMPLE}
uniform float u_dt;          // sim seconds per frame
uniform float u_seed;
in vec2 v_uv;
out vec4 o_state;

// Integer hash (PCG). The usual fract(sin(dot(..)) * 43758.5453) took
// arguments in the hundreds of thousands here, where GPU sin() collapses to
// a coarse set of values — spawn positions fell on a lattice that read as
// random across a continent and as evenly spaced vertical streaks once the
// spawn box was under a degree wide.
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hash(vec2 p, float salt) {
  uvec2 q = uvec2(p * 65535.0);
  return float(pcg(q.x ^ pcg(q.y ^ pcg(uint(salt))))) / 4294967295.0;
}

uniform vec2 u_spawnMin;  // equirect [0,1]²: view box origin (lon may wrap)
uniform vec2 u_spawnSpan; // view box size

void main() {
  vec4 st = texture(u_state, v_uv);
  vec2 pos = st.rg;
  float age = st.b;
  vec2 wind = windAt(pos); // m/s

  // Motion uses a compressed speed: direction and ordering are true, but a
  // 3 m/s breeze gets a visual floor so low levels draw streaks instead of
  // dots, while the jet stays the jet. True magnitude still lives in the
  // colours and the field — particles are the motion texture.
  float s = length(wind);
  vec2 dir = s > 0.01 ? wind / s : vec2(0.0);
  vec2 move = dir * (6.0 + 0.85 * s);

  float lat = pos.y * 180.0 - 90.0;
  float coslat = max(cos(radians(lat)), 0.05);
  // degrees moved this step
  float dLon = move.x * u_dt / (111320.0 * coslat);
  float dLat = move.y * u_dt / 110540.0;
  pos += vec2(dLon / 360.0, dLat / 180.0);
  pos.x = fract(pos.x);

  // Lifecycle instead of random death: age runs 0→1, faster for fast
  // particles so streams stay fed. The draw pass fades by age, so no
  // particle ever pops in or vanishes mid-streak.
  age += 0.0018 + s * 0.00008;

  // The whole budget lives in the current view: spawn inside it, retire
  // whatever drifts well past its edge. Density on screen, not on Earth.
  float dx = fract(pos.x - u_spawnMin.x + 1.0);
  float dy = pos.y - u_spawnMin.y;
  bool outside = dx > u_spawnSpan.x * 1.25 || dy < -0.12 * u_spawnSpan.y || dy > u_spawnSpan.y * 1.12;

  if (age >= 1.0 || outside || pos.y < 0.03 || pos.y > 0.97) {
    pos = vec2(
      fract(u_spawnMin.x + u_spawnSpan.x * hash(v_uv, u_seed)),
      clamp(u_spawnMin.y + u_spawnSpan.y * hash(v_uv, u_seed + 7919.0), 0.03, 0.97)
    );
    age = fract(age) * 0.05; // reborn young, slightly staggered
  }
  o_state = vec4(pos, age, 1.0);
}
`

/**
 * Draws each particle as a LINE SEGMENT from last frame's position to this
 * frame's — stamped dots turn into continuous strokes. Even vertices take
 * the previous state, odd the current; a segment that respawned this frame
 * (jumped) collapses to a point rather than slashing across the view.
 */
export const DRAW_VERT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform sampler2D u_statePrev;
${WIND_SAMPLE}
uniform mat4 u_matrix;
uniform float u_stateRes;
out float v_speed;
out float v_age;

const float PI = 3.14159265358979;

vec2 project(vec2 pos) {
  float lon = pos.x * 360.0;               // 0..360
  float lat = pos.y * 180.0 - 90.0;
  float mercX = fract((lon + 180.0) / 360.0); // wrap to mercator [0,1]
  float latR = radians(clamp(lat, -85.05, 85.05));
  float mercY = 0.5 - log(tan(PI * 0.25 + latR * 0.5)) / (2.0 * PI);
  return vec2(mercX, mercY);
}

void main() {
  float idx = floor(float(gl_VertexID) * 0.5);
  bool head = mod(float(gl_VertexID), 2.0) > 0.5;
  vec2 uv = (vec2(mod(idx, u_stateRes), floor(idx / u_stateRes)) + 0.5) / u_stateRes;
  vec4 cur = texture(u_state, uv);
  vec4 prev = texture(u_statePrev, uv);
  // A jump must not draw as a streak. Age only ever decreases at respawn,
  // so a reset is the respawn signal at ANY zoom — the old distance test
  // alone (0.02 of the world, 7°) missed every respawn once the view was
  // narrower than that, and each one drew a line clear across the screen.
  // The distance test stays for the antimeridian wrap.
  bool jumped = cur.b < prev.b || distance(cur.rg, prev.rg) > 0.02;
  vec4 st = head || jumped ? cur : prev;
  v_age = cur.b;

  v_speed = length(windAt(cur.rg));

  vec2 merc = project(st.rg);
  gl_Position = u_matrix * vec4(merc, 0.0, 1.0);
}
`

export const DRAW_FRAG = /* glsl */ `#version 300 es
precision mediump float;
uniform float u_opacity;
uniform float u_plain; // 1 = pale monochrome (field carries the colour)
in float v_speed;
in float v_age;
out vec4 o_color;

void main() {
  // Ease in at birth, ease out toward death — respawns never pop.
  float life = smoothstep(0.0, 0.1, v_age) * (1.0 - smoothstep(0.75, 1.0, v_age));
  // speed ramp: slate → cyan → yellow → red (0..40+ m/s)
  vec3 slow = vec3(0.45, 0.55, 0.65);
  vec3 mid = vec3(0.30, 0.85, 0.90);
  vec3 fast = vec3(1.00, 0.85, 0.30);
  vec3 max_ = vec3(1.00, 0.35, 0.25);
  vec3 col = mix(slow, mid, smoothstep(0.0, 10.0, v_speed));
  col = mix(col, fast, smoothstep(10.0, 25.0, v_speed));
  col = mix(col, max_, smoothstep(25.0, 45.0, v_speed));
  col = mix(col, vec3(0.92, 0.94, 0.97), u_plain);
  o_color = vec4(col, u_opacity * life);
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
${WIND_SAMPLE}
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
  float speed = length(windAt(vec2(lon01, lat01)));
  o_color = vec4(ramp(speed), u_opacity);
}
`
