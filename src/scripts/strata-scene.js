// UnderlandEX "Strata" hero scene.
// A cut-away block of ground: relief surface with extruded tenement polygons,
// sedimentary strata on the cut faces, an ore body block model glowing in the
// cut, and drill traces descending from collars. Procedural geometry only.
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  Mesh,
  LineSegments,
  Points,
  PlaneGeometry,
  Vector2,
  Vector3,
  ShapeUtils,
  AdditiveBlending,
  DoubleSide,
} from 'three';

// ---------------------------------------------------------------- constants
const HW = 5; // half width (x)
const HD = 5; // half depth (z)
const BOT = -4.7; // base of the block
const SEG = 80; // terrain segments per side (step 0.125)
const STEP = (HW * 2) / SEG;
const NX = 0.875; // cut-away notch: x > NX and z > NZ is removed ...
const NZ = 0.875;
const NF = -3.6; // ... down to this floor
const ORE = { c: [2.3, -1.45, 2.2], r: [2.05, 0.8, 1.18], yaw: 0.62, dip: 0.3 };
const BASE_YAW = -Math.PI / 4 + 0.2;
const LIGHT = new Vector3(-0.55, 0.78, 0.42).normalize();

const SAND = [0.875, 0.843, 0.776];
const SAGE = [0.537, 0.69, 0.624];
const GOLD = [0.86, 0.73, 0.47];

// ------------------------------------------------------------------- noise
const hash2 = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const vnoise = (x, y) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y) => {
  let s = 0;
  let a = 0.5;
  let t = 0;
  for (let i = 0; i < 4; i++) {
    s += a * vnoise(x, y);
    t += a;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.3;
    a *= 0.5;
  }
  return s / t;
};
const height = (x, z) => {
  const n = fbm(x * 0.27 + 4.2, z * 0.27 + 1.7);
  const r = 1 - Math.abs(2 * fbm(x * 0.16 + 9.1, z * 0.16 + 5.3) - 1);
  return 0.12 + 1.5 * n * n + 0.62 * r * r * r;
};

// ------------------------------------------------------------ ore helpers
const cy = Math.cos(ORE.yaw);
const sy = Math.sin(ORE.yaw);
const cd = Math.cos(ORE.dip);
const sd = Math.sin(ORE.dip);
const oreRot = (l) => {
  const x1 = l[0] * cd - l[1] * sd;
  const y1 = l[0] * sd + l[1] * cd;
  return [x1 * cy + l[2] * sy, y1, -x1 * sy + l[2] * cy];
};
const oreToWorld = (l) => {
  const r = oreRot(l);
  return [ORE.c[0] + r[0], ORE.c[1] + r[1], ORE.c[2] + r[2]];
};
const oreToLocal = (w) => {
  const x = w[0] - ORE.c[0];
  const y = w[1] - ORE.c[1];
  const z = w[2] - ORE.c[2];
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  return [x1 * cd + y * sd, -x1 * sd + y * cd, z1];
};
const oreField = (l) => {
  const e = Math.sqrt((l[0] / ORE.r[0]) ** 2 + (l[1] / ORE.r[1]) ** 2 + (l[2] / ORE.r[2]) ** 2);
  const n = vnoise(l[0] * 1.7 + 3.3 + l[1] * 0.9, l[2] * 1.7 + 8.1 - l[1] * 1.3);
  return e + (n - 0.5) * 0.42; // < 1 is ore
};

// --------------------------------------------------------------- shaders
const GLSL_NOISE = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
}`;

const VERT_WORLD = /* glsl */ `
attribute float aDepth;
varying vec3 vP; varying vec3 vN; varying float vDepth;
void main(){
  vP = position; vDepth = aDepth;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG_TERRAIN = /* glsl */ `
precision highp float;
uniform vec3 uL; uniform vec2 uNotch; uniform vec3 uOre;
varying vec3 vP; varying vec3 vN;
void main(){
  if (vP.x > uNotch.x && vP.z > uNotch.y) discard;
  float h = vP.y;
  vec3 c = mix(vec3(0.070,0.150,0.135), vec3(0.185,0.315,0.285), smoothstep(0.1, 0.7, h));
  c = mix(c, vec3(0.40,0.545,0.50), smoothstep(0.6, 1.7, h));
  float l = 0.26 + 1.0 * max(dot(normalize(vN), uL), 0.0);
  c *= l;
  float ci = h / 0.15;
  float cl = 1.0 - smoothstep(0.0, fwidth(ci) * 1.3, abs(fract(ci - 0.5) - 0.5));
  c = mix(c, vec3(0.875,0.843,0.776), cl * 0.30);
  vec2 g = abs(fract(vP.xz - 0.5) - 0.5) / fwidth(vP.xz);
  c += vec3(0.537,0.69,0.624) * (1.0 - min(min(g.x, g.y), 1.0)) * 0.10;
  float od = distance(vP.xz, uOre.xz);
  c += vec3(0.69,0.59,0.39) * 0.10 / (1.0 + od * od * 0.5);
  gl_FragColor = vec4(c, 1.0);
}`;

const FRAG_STRATA = /* glsl */ `
precision highp float;
uniform vec3 uL; uniform vec3 uOre; uniform float uBot; uniform float uTime;
varying vec3 vP; varying vec3 vN; varying float vDepth;
${GLSL_NOISE}
#define LAYER(th, col) s = smoothstep(th + 0.014, th - 0.014, d); c = mix(c, col, s); e = min(e, abs(d - th));
void main(){
  vec3 p = vP;
  // bedding coordinate: gentle folds, regional dip and one normal fault
  float d = p.y + 0.24*sin(p.x*0.56 + 0.4) + 0.17*sin(p.z*0.63 + 1.3) + 0.065*p.x - 0.05*p.z;
  float fault = smoothstep(-0.015, 0.015, p.x*0.82 - p.z*0.34 + p.y*0.36 + 2.6);
  d += fault * 0.46;
  d += (noise(p.xz*1.3 + p.y*0.7) - 0.5) * 0.07;
  vec3 c = vec3(0.47,0.56,0.50); // upper sage
  float s; float e = 1.0;
  LAYER(0.78,  vec3(0.24,0.375,0.345))   // teal
  LAYER(0.34,  vec3(0.70,0.665,0.57))    // thin sandstone
  LAYER(0.12,  vec3(0.335,0.475,0.44))   // weathered sage
  LAYER(-0.62, vec3(0.20,0.325,0.30))    // deep teal
  LAYER(-1.18, vec3(0.74,0.70,0.61))     // sandstone
  LAYER(-1.50, vec3(0.255,0.395,0.37))   // teal
  LAYER(-2.22, vec3(0.60,0.50,0.30))     // gold-ochre seam
  LAYER(-2.44, vec3(0.165,0.275,0.255))  // dark shale
  LAYER(-3.18, vec3(0.44,0.585,0.535))   // sage
  LAYER(-3.62, vec3(0.115,0.20,0.19))    // basement
  // laminations and grain
  float lam = sin(d*64.0 + noise(p.xz*3.0)*5.0);
  c *= 0.93 + 0.07*lam;
  c *= 0.90 + 0.20*noise(vec2(p.x + p.z, p.y)*vec2(7.0, 26.0));
  c *= mix(0.62, 1.0, smoothstep(0.0, 0.03, e)); // bed contacts
  // regolith: a thin weathered skin that follows the surface, not the bedding
  float reg = smoothstep(0.24, 0.13, vDepth + (noise(p.xz*2.1 + p.y) - 0.5)*0.10);
  c = mix(c, vec3(0.55,0.48,0.33) * (0.9 + 0.1*lam), reg);
  vec3 n = normalize(vN);
  float l = 0.42 + 0.62*max(dot(n, uL), 0.0) + 0.16*max(dot(n, vec3(0.6,0.2,0.75)), 0.0);
  c *= l;
  c *= mix(0.50, 1.0, smoothstep(uBot, uBot + 3.6, p.y)); // fade to depth
  // light from the ore body on nearby faces
  vec3 od = p - uOre;
  float glow = 1.0 / (1.0 + dot(od, od)*0.42);
  c += vec3(0.80,0.63,0.33) * glow * (0.42 + 0.05*sin(uTime*1.4)) * mix(0.55, 1.0, abs(n.x) + abs(n.z));
  gl_FragColor = vec4(c, 1.0);
}`;

const VERT_ORE = /* glsl */ `
attribute float aGrade;
varying float vG; varying vec3 vN; varying vec3 vP;
void main(){
  vG = aGrade; vP = position;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG_ORE = /* glsl */ `
precision highp float;
uniform vec3 uL; uniform float uTime; uniform float uReveal;
varying float vG; varying vec3 vN; varying vec3 vP;
void main(){
  float g = clamp(vG, 0.0, 1.0);
  vec3 c = mix(vec3(0.46,0.36,0.19), vec3(0.74,0.61,0.36), smoothstep(0.0, 0.35, g));
  c = mix(c, vec3(0.98,0.84,0.52), smoothstep(0.3, 0.7, g));
  c = mix(c, vec3(1.0,0.97,0.84), smoothstep(0.7, 1.0, g));
  vec3 n = normalize(vN);
  float l = 0.70 + 0.36*max(dot(n, uL), 0.0) + 0.14*max(n.y, 0.0);
  float pulse = 0.5 + 0.5*sin(uTime*1.1 - g*7.0 + vP.x*1.3 + vP.z*0.9);
  c *= l * (0.88 + 0.30*pulse*g);
  gl_FragColor = vec4(c * uReveal, 1.0);
}`;

const VERT_RGBA = /* glsl */ `
attribute vec4 aColor; varying vec4 vC;
void main(){ vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG_RGBA = /* glsl */ `
precision mediump float; varying vec4 vC; uniform float uReveal;
void main(){ gl_FragColor = vec4(vC.rgb, vC.a * uReveal); }`;

const VERT_DRILL = /* glsl */ `
attribute float aT; attribute float aPhase; attribute float aOre;
varying float vT; varying float vPh; varying float vOre;
void main(){ vT = aT; vPh = aPhase; vOre = aOre; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG_DRILL = /* glsl */ `
precision mediump float;
uniform float uTime; uniform float uReveal;
varying float vT; varying float vPh; varying float vOre;
void main(){
  if (vT > uReveal * 1.05) discard;
  float head = fract(uTime*0.11 + vPh);
  float k = (vT - head) * 9.0;
  float pulse = exp(-k*k);
  vec3 c = mix(vec3(0.875,0.843,0.776), vec3(1.0,0.86,0.52), max(vOre, pulse));
  float a = 0.62 + 0.38*max(vOre, pulse);
  gl_FragColor = vec4(c, a);
}`;

const VERT_POINT = /* glsl */ `
uniform float uSize;
void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; }`;
const FRAG_POINT = /* glsl */ `
precision mediump float; uniform float uReveal;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float ring = smoothstep(0.62, 0.74, r);
  vec3 c = mix(vec3(0.05,0.11,0.10), vec3(0.94,0.90,0.82), max(ring, 1.0 - smoothstep(0.22, 0.34, r)));
  gl_FragColor = vec4(c, uReveal * (1.0 - smoothstep(0.9, 1.0, r)));
}`;

const VERT_GLOW = /* glsl */ `
uniform float uSize; varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG_GLOW = /* glsl */ `
precision mediump float; uniform float uTime; uniform float uReveal; uniform float uGain; varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - r, 0.0), 2.2);
  a *= uGain * (0.9 + 0.1*sin(uTime*1.4)) * uReveal;
  gl_FragColor = vec4(vec3(0.92,0.74,0.40) * a, a);
}`;

const FRAG_FLOOR = /* glsl */ `
precision highp float; varying vec3 vP; varying vec3 vN; uniform float uReveal;
void main(){
  float r = length(vP.xz) / 13.0;
  float fade = pow(max(1.0 - r, 0.0), 1.6);
  vec2 g = abs(fract(vP.xz - 0.5) - 0.5) / fwidth(vP.xz);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  vec2 q = abs(vP.xz) - vec2(5.0);
  float sd = length(max(q, 0.0));
  float shadow = (1.0 - smoothstep(0.0, 2.4, sd)) * 0.55;
  vec3 c = vec3(0.537,0.69,0.624) * line * 0.34 * fade;
  float a = max(line * 0.30 * fade, shadow * fade);
  gl_FragColor = vec4(c, a * uReveal);
}`;

// ------------------------------------------------------------- geometry
function buildTerrain() {
  const g = new PlaneGeometry(HW * 2, HD * 2, SEG, SEG);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

function buildBlock(lines) {
  const pos = [];
  const nor = [];
  const dep = [];
  const edge = (a, b, alpha) => lines.push(a, b, [...SAND, alpha]);
  const wall = (ax, az, bx, bz, nx, nz, topFn, bot, edgeAlpha = 0.5) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / STEP));
    for (let i = 0; i < n; i++) {
      const x0 = ax + ((bx - ax) * i) / n;
      const z0 = az + ((bz - az) * i) / n;
      const x1 = ax + ((bx - ax) * (i + 1)) / n;
      const z1 = az + ((bz - az) * (i + 1)) / n;
      const t0 = topFn(x0, z0);
      const t1 = topFn(x1, z1);
      pos.push(x0, bot, z0, x1, bot, z1, x1, t1, z1, x0, bot, z0, x1, t1, z1, x0, t0, z0);
      for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
      if (topFn === height) dep.push(t0 - bot, t1 - bot, 0, t0 - bot, 0, 0);
      else dep.push(9, 9, 9, 9, 9, 9);
      edge([x0, t0, z0], [x1, t1, z1], edgeAlpha);
    }
    edge([ax, bot, az], [bx, bot, bz], 0.22);
  };
  const flat = () => NF;
  wall(-HW, -HD, HW, -HD, 0, -1, height, BOT);
  wall(-HW, -HD, -HW, HD, -1, 0, height, BOT);
  wall(-HW, HD, NX, HD, 0, 1, height, BOT);
  wall(NX, HD, HW, HD, 0, 1, flat, BOT, 0.42);
  wall(HW, -HD, HW, NZ, 1, 0, height, BOT);
  wall(HW, NZ, HW, HD, 1, 0, flat, BOT, 0.42);
  wall(NX, NZ, NX, HD, 1, 0, height, NF, 0.55); // inner cut faces
  wall(NX, NZ, HW, NZ, 0, 1, height, NF, 0.55);
  // notch floor
  pos.push(NX, NF, NZ, HW, NF, NZ, HW, NF, HD, NX, NF, NZ, HW, NF, HD, NX, NF, HD);
  for (let k = 0; k < 6; k++) {
    nor.push(0, 1, 0);
    dep.push(9);
  }
  // vertical edges
  const v = (x, z, y0, y1, a = 0.4) => edge([x, y0, z], [x, y1, z], a);
  v(-HW, -HD, BOT, height(-HW, -HD));
  v(HW, -HD, BOT, height(HW, -HD));
  v(-HW, HD, BOT, height(-HW, HD));
  v(HW, HD, BOT, NF);
  v(NX, HD, NF, height(NX, HD), 0.55);
  v(HW, NZ, NF, height(HW, NZ), 0.55);
  v(NX, NZ, NF, height(NX, NZ), 0.5);
  edge([NX, NF, NZ], [NX, NF, HD], 0.3);
  edge([NX, NF, NZ], [HW, NF, NZ], 0.3);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('aDepth', new Float32BufferAttribute(dep, 1));
  return g;
}

// ghost of the removed surface over the cut-away
function buildGhost(lines) {
  const step = 0.5;
  const c = [...SAGE, 0.26];
  for (let x = NX + step; x <= HW + 1e-3; x += step) {
    for (let z = NZ; z < HD - 1e-3; z += STEP * 2) {
      const z1 = Math.min(z + STEP * 2, HD);
      lines.push([x, height(x, z), z], [x, height(x, z1), z1], c);
    }
  }
  for (let z = NZ + step; z <= HD + 1e-3; z += step) {
    for (let x = NX; x < HW - 1e-3; x += STEP * 2) {
      const x1 = Math.min(x + STEP * 2, HW);
      lines.push([x, height(x, z), z], [x1, height(x1, z), z], c);
    }
  }
}

const TENEMENTS = [
  { k: 1.0, pts: [[0.25, 0.3], [4.4, 0.3], [4.4, 2.9], [3.0, 2.9], [3.0, 4.35], [0.25, 4.35]] },
  { k: 0.62, pts: [[-4.3, -4.1], [-1.3, -4.1], [-1.3, -1.7], [-4.3, -1.7]] },
  { k: 0.62, pts: [[-0.6, -4.45], [3.7, -4.45], [3.7, -2.7], [1.5, -2.7], [1.5, -0.5], [-0.6, -0.5]] },
  { k: 0.55, pts: [[-4.45, 0.7], [-2.3, 0.7], [-2.3, 3.9], [-4.45, 3.9]] },
  { k: 0.5, pts: [[-1.75, 1.1], [-0.35, 1.1], [-0.35, 2.7], [-1.75, 2.7]] },
];

function buildTenements(lines) {
  const pos = [];
  const col = [];
  for (const t of TENEMENTS) {
    // densify the boundary so its base drapes over the relief
    const ring = [];
    const n = t.pts.length;
    for (let i = 0; i < n; i++) {
      const a = t.pts[i];
      const b = t.pts[(i + 1) % n];
      const m = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
      for (let j = 0; j < m; j++) {
        const x = a[0] + ((b[0] - a[0]) * j) / m;
        const z = a[1] + ((b[1] - a[1]) * j) / m;
        ring.push([x, height(x, z) + 0.02, z, j === 0]);
      }
    }
    let top = 0;
    for (const r of ring) top = Math.max(top, r[1]);
    top += 0.3;
    const k = t.k;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      // translucent wall, brighter at the rim
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], b[0], top, b[2], a[0], a[1], a[2], b[0], top, b[2], a[0], top, a[2]);
      const lo = 0.03 * k;
      const hi = 0.34 * k;
      col.push(...GOLD, lo, ...GOLD, lo, ...GOLD, hi, ...GOLD, lo, ...GOLD, hi, ...GOLD, hi);
      const rim = top - 0.045;
      const ra = 0.9 * Math.min(1, k + 0.2);
      pos.push(a[0], rim, a[2], b[0], rim, b[2], b[0], top, b[2], a[0], rim, a[2], b[0], top, b[2], a[0], top, a[2]);
      for (let q = 0; q < 6; q++) col.push(...GOLD, ra);
      lines.push([a[0], top, a[2]], [b[0], top, b[2]], [...GOLD, 0.95 * Math.min(1, k + 0.25)]);
      lines.push([a[0], a[1], a[2]], [b[0], b[1], b[2]], [...GOLD, 0.5 * k]);
      if (a[3]) lines.push([a[0], a[1], a[2]], [a[0], top, a[2]], [...GOLD, 0.7 * k]);
    }
    // faint cap
    const contour = t.pts.map((q) => new Vector2(q[0], q[1]));
    for (const f of ShapeUtils.triangulateShape(contour, [])) {
      for (const idx of f) {
        pos.push(t.pts[idx][0], top, t.pts[idx][1]);
        col.push(...GOLD, 0.075 * k);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aColor', new Float32BufferAttribute(col, 4));
  return g;
}

function buildOre() {
  const s = 0.225;
  const half = s * 0.44;
  const pos = [];
  const nor = [];
  const grade = [];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  const quad = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
  const nx = Math.ceil((ORE.r[0] * 1.3) / s);
  const ny = Math.ceil((ORE.r[1] * 1.3) / s);
  const nz = Math.ceil((ORE.r[2] * 1.3) / s);
  for (let i = -nx; i <= nx; i++) {
    for (let j = -ny; j <= ny; j++) {
      for (let k = -nz; k <= nz; k++) {
        const l = [i * s, j * s, k * s];
        const f = oreField(l);
        if (f >= 1) continue;
        const patch = vnoise(l[0] * 2.3 + 1.7 + l[1] * 1.9, l[2] * 2.3 + 4.4 - l[1] * 1.1);
        const g = Math.min(1, Math.max(0, 0.12 + 0.55 * (1 - f) + 0.62 * patch * patch + (hash2(i * 3.1 + k, j * 7.7 - k) - 0.5) * 0.22));
        for (const [n, u, v] of faces) {
          const nw = oreRot(n);
          for (const [a, b] of quad) {
            const w = oreToWorld([
              l[0] + (n[0] + u[0] * a + v[0] * b) * half,
              l[1] + (n[1] + u[1] * a + v[1] * b) * half,
              l[2] + (n[2] + u[2] * a + v[2] * b) * half,
            ]);
            pos.push(w[0], w[1], w[2]);
            nor.push(nw[0], nw[1], nw[2]);
            grade.push(g);
          }
        }
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('aGrade', new Float32BufferAttribute(grade, 1));
  return g;
}

const COLLARS = [
  [1.5, 1.25, [-0.9, 0.1, 0.1]],
  [2.45, 1.05, [0.0, 0.15, -0.35]],
  [3.5, 1.5, [0.8, 0.0, -0.3]],
  [1.35, 2.45, [-0.5, -0.1, 0.45]],
  [2.6, 2.75, [0.3, 0.0, 0.3]],
  [3.75, 2.5, [1.2, -0.05, 0.2]],
  [1.9, 3.8, [-0.2, -0.2, 0.6]],
  [0.35, 1.8, [-1.3, 0.0, -0.1]],
  [2.0, 0.4, [-0.4, 0.1, -0.55]],
];

function buildDrill() {
  const pos = [];
  const tt = [];
  const ph = [];
  const ore = [];
  const collars = [];
  const N = 30;
  COLLARS.forEach(([cx, cz, target], hi) => {
    const c = [cx, height(cx, cz) + 0.03, cz];
    const t = oreToWorld(target);
    const d = [t[0] - c[0], t[1] - c[1], t[2] - c[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    const e = [t[0] + (d[0] / len) * 1.0, t[1] + (d[1] / len) * 1.0, t[2] + (d[2] / len) * 1.0];
    const bend = 0.22 * (hash2(hi, 3.7) - 0.5);
    const pt = (u) => {
      const sag = Math.sin(Math.PI * u) * bend;
      return [c[0] + (e[0] - c[0]) * u + sag * d[2] / len, c[1] + (e[1] - c[1]) * u, c[2] + (e[2] - c[2]) * u - sag * d[0] / len];
    };
    collars.push(c[0], c[1], c[2]);
    for (let i = 0; i < N; i++) {
      const u0 = i / N;
      const u1 = (i + 1) / N;
      const a = pt(u0);
      const b = pt(u1);
      const inOre = oreField(oreToLocal(pt((u0 + u1) / 2))) < 1.14 ? 1 : 0;
      // two crossed ribbons per segment: about 2 px wide at any pixel ratio, from any angle
      const dx = (b[0] - a[0]);
      const dy = (b[1] - a[1]);
      const dz = (b[2] - a[2]);
      const dl = Math.hypot(dx, dy, dz);
      const ux = -dz / Math.hypot(dx, dz);
      const uz = dx / Math.hypot(dx, dz);
      const vx = (dy * uz) / dl;
      const vy = (dz * ux - dx * uz) / dl;
      const vz = (-dy * ux) / dl;
      const r = inOre ? 0.036 : 0.02;
      for (const [ox, oy, oz] of [[ux * r, 0, uz * r], [vx * r, vy * r, vz * r]]) {
        const q = [
          [a[0] - ox, a[1] - oy, a[2] - oz, u0],
          [a[0] + ox, a[1] + oy, a[2] + oz, u0],
          [b[0] + ox, b[1] + oy, b[2] + oz, u1],
          [b[0] - ox, b[1] - oy, b[2] - oz, u1],
        ];
        for (const k of [0, 1, 2, 0, 2, 3]) {
          pos.push(q[k][0], q[k][1], q[k][2]);
          tt.push(q[k][3]);
          ph.push(hash2(hi, 1.3));
          ore.push(inOre);
        }
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new Float32BufferAttribute(tt, 1));
  g.setAttribute('aPhase', new Float32BufferAttribute(ph, 1));
  g.setAttribute('aOre', new Float32BufferAttribute(ore, 1));
  const cg = new BufferGeometry();
  cg.setAttribute('position', new Float32BufferAttribute(collars, 3));
  return [g, cg];
}

function linesGeometry(lines) {
  const pos = [];
  const col = [];
  for (let i = 0; i < lines.length; i += 3) {
    pos.push(...lines[i], ...lines[i + 1]);
    col.push(...lines[i + 2], ...lines[i + 2]);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aColor', new Float32BufferAttribute(col, 4));
  return g;
}

// ------------------------------------------------------------------ mount
export function mount(host, opts = {}) {
  const canvas = host.querySelector('canvas') || host.appendChild(document.createElement('canvas'));
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const small = matchMedia('(max-width: 767px)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 1, 120);
  const tilt = new Group();
  const rig = new Group();
  tilt.add(rig);
  scene.add(tilt);
  rig.position.y = 1.7; // centre the block (y from BOT to ~1.4) on the origin

  const uTime = { value: 0 };
  const uReveal = { value: 0 };
  const uOreReveal = { value: 0 };
  const uL = { value: LIGHT };
  const uOre = { value: new Vector3(...ORE.c) };

  const lines = [];
  const blockGeo = buildBlock(lines);
  buildGhost(lines);
  const tenGeo = buildTenements(lines);

  const floor = new Mesh(
    new PlaneGeometry(26, 26).rotateX(-Math.PI / 2),
    new ShaderMaterial({ vertexShader: VERT_WORLD, fragmentShader: FRAG_FLOOR, uniforms: { uReveal: { value: 1 } }, transparent: true, depthWrite: false })
  );
  floor.position.y = BOT - 0.02;
  floor.renderOrder = 0;
  rig.add(floor);

  const terrain = new Mesh(
    buildTerrain(),
    new ShaderMaterial({ vertexShader: VERT_WORLD, fragmentShader: FRAG_TERRAIN, uniforms: { uL, uOre, uNotch: { value: new Vector2(NX, NZ) } } })
  );
  rig.add(terrain);

  const block = new Mesh(
    blockGeo,
    new ShaderMaterial({ vertexShader: VERT_WORLD, fragmentShader: FRAG_STRATA, uniforms: { uL, uOre, uTime, uBot: { value: BOT } }, side: DoubleSide })
  );
  rig.add(block);

  const ore = new Mesh(buildOre(), new ShaderMaterial({ vertexShader: VERT_ORE, fragmentShader: FRAG_ORE, uniforms: { uL, uTime, uReveal: uOreReveal } }));
  rig.add(ore);

  const tenements = new Mesh(
    tenGeo,
    new ShaderMaterial({ vertexShader: VERT_RGBA, fragmentShader: FRAG_RGBA, uniforms: { uReveal }, transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending })
  );
  tenements.renderOrder = 2;
  rig.add(tenements);

  const wire = new LineSegments(
    linesGeometry(lines),
    new ShaderMaterial({ vertexShader: VERT_RGBA, fragmentShader: FRAG_RGBA, uniforms: { uReveal: { value: 1 } }, transparent: true, depthWrite: false })
  );
  wire.renderOrder = 3;
  rig.add(wire);

  const [drillGeo, collarGeo] = buildDrill();
  const drill = new Mesh(
    drillGeo,
    new ShaderMaterial({ vertexShader: VERT_DRILL, fragmentShader: FRAG_DRILL, uniforms: { uTime, uReveal }, transparent: true, depthWrite: false, side: DoubleSide })
  );
  drill.renderOrder = 4;
  rig.add(drill);

  const uPoint = { value: 9 * dpr };
  const collars = new Points(
    collarGeo,
    new ShaderMaterial({ vertexShader: VERT_POINT, fragmentShader: FRAG_POINT, uniforms: { uSize: uPoint, uReveal }, transparent: true, depthWrite: false })
  );
  collars.renderOrder = 5;
  rig.add(collars);

  const glowMat = (gain, depthTest) =>
    new ShaderMaterial({
      vertexShader: VERT_GLOW,
      fragmentShader: FRAG_GLOW,
      uniforms: { uTime, uReveal: uOreReveal, uSize: { value: 9.5 }, uGain: { value: gain } },
      transparent: true,
      depthWrite: false,
      depthTest,
      blending: AdditiveBlending,
    });
  const glowGeo = new PlaneGeometry(1, 1);
  const glow = new Mesh(glowGeo, glowMat(0.62, true));
  const halo = new Mesh(glowGeo, glowMat(0.13, false)); // faint x-ray halo through the rock
  for (const m of [glow, halo]) {
    m.position.set(...ORE.c);
    m.frustumCulled = false;
    m.renderOrder = 6;
    rig.add(m);
  }

  // ---- sizing
  let width = 0;
  let height_ = 0;
  const frame = (w, h) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vHalf = (camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const dist = Math.max(6.4 / Math.sin(vHalf), 7.9 / Math.sin(hHalf));
    const elev = 0.44;
    camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, -0.35, 0);
    camera.updateProjectionMatrix();
  };
  const fit = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h || (w === width && h === height_)) return;
    width = w;
    height_ = h;
    frame(w, h);
  };

  // ---- interaction: pointer parallax and scroll tilt
  const target = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  const onPointer = (e) => {
    if (e.pointerType === 'touch') return;
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // ---- loop with visibility and frame-budget guards
  let raf = 0;
  let visible = true;
  let running = false;
  let last = 0;
  let time = opts.time || 0;
  let slowFrames = 0;
  let frames = 0;
  let skip = 0;
  let ready = false;
  const still = !!opts.still;

  const render = (dt) => {
    time += dt;
    uTime.value = time;
    uReveal.value = still ? 1 : Math.min(1, time / 1.6);
    uOreReveal.value = still ? 1 : Math.min(1, 0.25 + time / 1.2);
    const w = (Math.PI * 2) / 150;
    const yaw = BASE_YAW + (still ? 0 : w * time - 0.62 * Math.sin(w * time));
    eased.x += (target.x - eased.x) * 0.045;
    eased.y += (target.y - eased.y) * 0.045;
    const rect = host.getBoundingClientRect();
    const scrolled = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    rig.rotation.y = yaw + eased.x * 0.16;
    tilt.rotation.x = eased.y * 0.06 + scrolled * 0.22;
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      if (opts.onReady) opts.onReady();
    }
  };

  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now;
    if (skip && frames++ % 2) return; // 30 fps fallback
    fit();
    render(skip ? dt * 2 : dt);
    // frame-budget guard: step the pixel ratio down, then halve the frame rate
    if (time > 2.5 && !skip) {
      slowFrames = dt > 0.03 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 40) {
        slowFrames = 0;
        if (dpr > 1) {
          dpr = Math.max(1, dpr - 0.5);
          renderer.setPixelRatio(dpr);
          uPoint.value = 9 * dpr;
          width = 0;
        } else {
          skip = 1;
        }
      }
    }
  };
  const start = () => {
    if (running || still) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const sync = () => (visible && !document.hidden ? start() : stop());

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { rootMargin: '80px' }
  );
  io.observe(host);
  document.addEventListener('visibilitychange', sync);
  const ro = new ResizeObserver(() => {
    fit();
    if (still || !running) render(0);
  });
  ro.observe(host);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    if (opts.onLost) opts.onLost();
  });

  fit();
  if (still) render(0);
  else sync();

  return {
    isRunning: () => running,
    // render one frame at an explicit size and return it as a PNG data URL (poster generation)
    snapshot(w, h, ratio = 2) {
      stop();
      renderer.setPixelRatio(ratio);
      uPoint.value = 9 * ratio;
      frame(w, h);
      const keep = [time, target.x, target.y, eased.x, eased.y];
      time = 0;
      uTime.value = 0;
      uReveal.value = 1;
      uOreReveal.value = 1;
      rig.rotation.y = BASE_YAW;
      tilt.rotation.x = 0;
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      [time, target.x, target.y, eased.x, eased.y] = keep;
      renderer.setPixelRatio(dpr);
      uPoint.value = 9 * dpr;
      width = 0;
      fit();
      sync();
      return url;
    },
    destroy() {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', sync);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
    },
  };
}
