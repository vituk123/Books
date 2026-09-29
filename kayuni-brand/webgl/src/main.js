// Kayuni — WebGL logo (Three.js)
// A cloud of data points swirls in, settles into the swift and the wordmark,
// then the logo solidifies into lit, extruded 3D geometry and glides.
// Everything is built from the same vector geometry as the flat logo (src/geometry.js).
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import polygonClipping from 'polygon-clipping';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MARK, wordmark, H } from '../../src/geometry.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');                 // frame-by-frame export mode
const LIGHT = params.get('theme') === 'light';
const C = {
  ink: 0x0e0e10, paper: 0xf6f5f1, lake: 0x0f5e78, dawn: 0xe09a2f, lakeGlow: 0x3fa7c9,
};
const BG = LIGHT ? C.paper : C.ink, FG = LIGHT ? C.ink : C.paper;

// ── Layout: the horizontal lockup, in SVG units (same maths as build.js) ────
const WM = wordmark(), B = MARK.bounds;
const ms = (H * 1.85) / B.h, mw = B.w * ms, mh = B.h * ms, gap = H * 0.5;
const LOCK_W = mw + gap + WM.w, LOCK_H = mh;
const wx = mw + gap, wy = (mh - H) / 2 + H * 0.12;
const UNIT = 0.01;                                     // SVG unit → world unit
const letters = [...WM.d.matchAll(/translate\(([\d.]+) 0\)" d="([^"]+)"/g)].map((m) => ({ x: +m[1], d: m[2] }));

// Transforms from each part's own coords into lockup coords
const markM = new DOMMatrix().scale(ms, ms).translate(-B.x, -B.y);
const letterM = (x) => new DOMMatrix().translate(wx + x, wy);

// ── Renderer, scene, camera ─────────────────────────────────────────────────
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(BG, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 9, 22);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const root = new THREE.Group();                       // whole lockup, centred at origin
root.position.set((-LOCK_W / 2) * UNIT, (LOCK_H / 2) * UNIT, 0);
root.scale.set(UNIT, -UNIT, UNIT);                     // SVG y-down → world y-up
const pivot = new THREE.Group();
pivot.add(root);
scene.add(pivot);

// ── Solid logo: extruded from the vector paths ─────────────────────────────
const loader = new SVGLoader();
// Letters are built from overlapping strokes; union them into one clean outline first,
// otherwise the overlapping walls and bevels show as seams in 3D.
function unionShapes(shapes) {
  const ring = (pts) => { const r = pts.map((p) => [p.x, p.y]); r.push(r[0]); return r; };
  const polys = shapes.map((sh) => { const { shape, holes } = sh.extractPoints(64); return [ring(shape), ...holes.map(ring)]; });
  return polygonClipping.union(...polys.map((p) => [p])).map(([outer, ...holes]) => {
    const s = new THREE.Shape(outer.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y)));
    s.holes = holes.map((h) => new THREE.Path(h.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y))));
    return s;
  });
}
function extrude(svgInner, depth) {
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg">${svgInner}</svg>`);
  const shapes = unionShapes(data.paths.flatMap((p) => SVGLoader.createShapes(p)));
  return shapes.map((shape) => new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.6, bevelSegments: 5, curveSegments: 64,
  }));
}
// Soft studio reflections, generated procedurally (no image files)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = LIGHT ? 0.45 : 0.6;
const solidMat = new THREE.MeshPhysicalMaterial({
  color: FG, roughness: LIGHT ? 0.42 : 0.28, metalness: LIGHT ? 0.0 : 0.15,
  clearcoat: 1, clearcoatRoughness: 0.18, transparent: true, opacity: 0,
});

const bird = new THREE.Group();
for (const g of extrude(`<path d="${MARK.d}"/>`, 9)) bird.add(new THREE.Mesh(g, solidMat));
bird.position.set(-B.x * ms, -B.y * ms, 0);
bird.scale.set(ms, ms, 1);
const birdPivot = new THREE.Group();                  // pivot at the bird's centre for banking
birdPivot.position.set(mw / 2, mh / 2, 0);
bird.position.x -= mw / 2; bird.position.y -= mh / 2;
birdPivot.add(bird);
root.add(birdPivot);

const word = new THREE.Group();
for (const L of letters) for (const g of extrude(`<path d="${L.d}"/>`, 7)) {
  const m = new THREE.Mesh(g, solidMat);
  m.position.set(wx + L.x, wy, 0);
  word.add(m);
}
root.add(word);
// Center extrusion depth around z=0
bird.position.z = -4.5; word.position.z = -3.5;

// Lights: soft key, cool Lake rim from behind, warm Dawn sweep during the reveal
scene.add(new THREE.HemisphereLight(0xffffff, LIGHT ? 0xd8d4c8 : 0x1a2630, LIGHT ? 1.6 : 1.1));
const key = new THREE.DirectionalLight(0xffffff, LIGHT ? 1.6 : 2.2);
key.position.set(-3, 4, 6); scene.add(key);
const rim = new THREE.PointLight(C.lakeGlow, 40, 14, 1.6);
rim.position.set(-2.5, 1.5, -2.5); scene.add(rim);
const sweep = new THREE.PointLight(C.dawn, 0, 6, 1.4);
scene.add(sweep);

// ── Particles: sampled inside the actual glyph outlines ─────────────────────
function samplePoints(count) {
  const ctx = new OffscreenCanvas(4, 4).getContext('2d');
  const shapes = [{ path: new Path2D(), area: 0 }, { path: new Path2D(), area: 0 }];
  shapes[0].path.addPath(new Path2D(MARK.d), markM);
  for (const L of letters) shapes[1].path.addPath(new Path2D(L.d), letterM(L.x));
  const boxes = [[0, 0, mw, mh], [wx, wy, WM.w, H]];
  const pts = [];
  // Split particles by part: the bird gets a denser share so it reads first
  const quota = [Math.round(count * 0.55), count - Math.round(count * 0.55)];
  shapes.forEach((s, i) => {
    const [x0, y0, w, h] = boxes[i];
    let n = 0, guard = 0;
    while (n < quota[i] && guard++ < 4e6) {
      const x = x0 + Math.random() * w, y = y0 + Math.random() * h;
      if (ctx.isPointInPath(s.path, x, y)) { pts.push([x, y, i]); n++; }
    }
  });
  return pts;
}

const rand = mulberry32(7);  // seeded: every render/export is identical
const pts = samplePoints(CAPTURE ? 16000 : 12000);
const N = pts.length;
const aTarget = new Float32Array(N * 3), aStart = new Float32Array(N * 3);
const aDelay = new Float32Array(N), aSize = new Float32Array(N), aTone = new Float32Array(N);
pts.forEach(([x, y, part], i) => {
  aTarget.set([x, y, (rand() - 0.5) * 8], i * 3);
  // Start: a wide spherical shell of "data" around the viewer
  const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1), r = 700 + rand() * 900;
  aStart.set([LOCK_W / 2 + r * Math.sin(ph) * Math.cos(th), LOCK_H / 2 + r * Math.sin(ph) * Math.sin(th) * 0.6,
              r * Math.cos(ph) * 0.8], i * 3);
  aDelay[i] = 0.1 + (x / LOCK_W) * 0.9 + rand() * 0.35 + part * 0.1; // forms left → right
  aSize[i] = 0.6 + rand() * rand() * 2.2;
  aTone[i] = rand();
});
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(aTarget, 3));
pGeo.setAttribute('aStart', new THREE.BufferAttribute(aStart, 3));
pGeo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
pGeo.setAttribute('aTone', new THREE.BufferAttribute(aTone, 1));

const pMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  blending: LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 }, uFade: { value: 1 }, uPR: { value: renderer.getPixelRatio() }, uScale: { value: 1 },
    uFg: { value: new THREE.Color(FG) }, uLake: { value: new THREE.Color(LIGHT ? C.lake : C.lakeGlow) },
    uDawn: { value: new THREE.Color(C.dawn) },
  },
  vertexShader: /* glsl */`
    attribute vec3 aStart; attribute float aDelay, aSize, aTone;
    uniform float uTime, uPR, uScale;
    varying float vTone, vLand;
    mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
    void main(){
      float t = clamp((uTime - aDelay) / 1.7, 0.0, 1.0);
      float e = 1.0 - pow(1.0 - t, 4.0);                // ease-out quart
      vec3 p = mix(aStart, position, e);
      vec2 c = vec2(${(LOCK_W / 2).toFixed(1)}, ${(LOCK_H / 2).toFixed(1)});
      p.xy = c + rot((1.0 - e) * (1.8 + aTone * 2.2)) * (p.xy - c);   // swirl in
      p += vec3(sin(uTime*1.3+aDelay*40.0), cos(uTime*1.1+aDelay*33.0), sin(uTime*0.9+aDelay*21.0)) * 0.8 * e;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = min(aSize * uPR * uScale * mix(1.6, 1.0, e) / -mv.z, 5.0 * uPR);
      vTone = aTone; vLand = e;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uFg, uLake, uDawn; uniform float uFade;
    varying float vTone, vLand;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.1, d);
      vec3 col = vTone > 0.965 ? uDawn : (vTone > 0.72 ? uLake : uFg);
      col = mix(col, uFg, vLand * 0.6);                  // colours converge as points land
      gl_FragColor = vec4(col, a * uFade * mix(0.55, 0.95, vLand));
    }`,
});
const particles = new THREE.Points(pGeo, pMat);
root.add(particles);

// Ambient "data dust": a slow field of faint points in depth, always present
const DN = 900, dPos = new Float32Array(DN * 3);
for (let i = 0; i < DN; i++) dPos.set([(rand() - 0.5) * 16, (rand() - 0.5) * 9, -rand() * 9 + 1.5], i * 3);
const dust = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dPos, 3)),
  new THREE.PointsMaterial({ color: LIGHT ? C.lake : C.lakeGlow, size: 0.018, transparent: true, opacity: 0, depthWrite: false }),
);
scene.add(dust);

// ── Timeline (seconds) ──────────────────────────────────────────────────────
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const tag = document.querySelector('.tag');
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

function frame(t) {
  pMat.uniforms.uTime.value = t;
  const reveal = smooth(2.5, 3.6, t);
  solidMat.opacity = reveal;
  bird.scale.z = word.scale.z = 0.05 + 0.95 * smooth(2.5, 3.8, t);
  pMat.uniforms.uFade.value = 1 - smooth(2.9, 4.1, t);
  particles.visible = t < 4.2;
  dust.material.opacity = (LIGHT ? 0.35 : 0.5) * smooth(0.2, 2.5, t);
  dust.rotation.y = t * 0.012; dust.position.y = Math.sin(t * 0.2) * 0.1;

  // Warm light sweeps across the letters as they solidify
  const s = smooth(2.8, 4.6, t);
  sweep.intensity = 26 * Math.sin(Math.PI * s);
  sweep.position.set(-3.5 + 7 * s, 0.4, 1.3);

  // Idle flight: slow bank + float, pointer parallax
  const idle = smooth(3.6, 5.5, t);
  pointer.sx += (pointer.x - pointer.sx) * 0.05; pointer.sy += (pointer.y - pointer.sy) * 0.05;
  pivot.rotation.y = (Math.sin(t * 0.45) * 0.1 + pointer.sx * 0.25) * idle + (1 - smooth(0, 3.2, t)) * -0.35;
  pivot.rotation.x = (Math.sin(t * 0.33) * 0.04 - pointer.sy * 0.15) * idle;
  birdPivot.rotation.z = Math.sin(t * 0.9) * 0.035 * idle;
  birdPivot.position.y = mh / 2 + Math.sin(t * 0.9 + 0.6) * 3.5 * idle;
  if (tag) tag.style.opacity = (smooth(3.9, 4.8, t) * 0.75).toFixed(3);

  renderer.render(scene, camera);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Fit the lockup to ~66% of the width (or ~40% of the height on tall screens)
  const lw = LOCK_W * UNIT, lh = LOCK_H * UNIT, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(lw / 0.66 / (2 * tan * camera.aspect), lh / 0.4 / (2 * tan));
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  pMat.uniforms.uScale.value = h * 0.028;
  scene.fog.near = dist + 1.5; scene.fog.far = dist + 14;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; });
resize();

// Real-time loop, or a deterministic frame API for video export
window.KAYUNI = { frame, ready: true };
if (!CAPTURE) {
  let t0 = performance.now();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('click', () => (t0 = performance.now()));   // click to replay
  renderer.setAnimationLoop(() => frame(reduce ? 8 : (performance.now() - t0) / 1000));
}

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
