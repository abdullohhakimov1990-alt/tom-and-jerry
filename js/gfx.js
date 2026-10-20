// Grafika dvigateli: renderer, post-effektlar (bloom, AO, MSAA), yorug'lik, osmon, chang zarralari.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as TX from './textures.js';

export const gfx = { quality: 'medium', lampPool: [], lamps: [] };

export const QUALITY = {
  low: { name: 'Past', pr: .75, shadow: 1024, post: false, ao: false, dust: 100, lamps: 0, shadowHz: 3, area: 32, soft: false, hemi: .42 },
  medium: { name: "O'rta", pr: 1, shadow: 2048, post: false, ao: false, dust: 260, lamps: 0, shadowHz: 2, area: 38, soft: true, hemi: .38 },
  high: { name: 'Yuqori', pr: 1.25, shadow: 2048, post: true, ao: false, dust: 500, lamps: 2, shadowHz: 1, area: 44, soft: true, hemi: .25 },
  ultra: { name: 'Ultra', pr: 1.75, shadow: 4096, post: true, ao: true, dust: 800, lamps: 4, shadowHz: 1, area: 48, soft: true, hemi: .25 },
};

export function detectQuality() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    if (!gl) return 'low';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    if (/Mali|Adreno|PowerVR|SwiftShader|llvmpipe/i.test(name)) return 'low';
    if (/Intel|Apple GPU/i.test(name)) return 'medium';
    if (/RTX|GTX 16|RX [5-7]\d\d\d|Radeon Pro|Apple M[2-9]/i.test(name)) return 'high';
    return 'medium';
  } catch (e) { return 'medium'; }
}

export async function initGfx(container, quality) {
  const Q = QUALITY[quality] || QUALITY.medium;
  gfx.quality = quality; gfx.Q = Q;
  const renderer = new THREE.WebGLRenderer({ antialias: !Q.post, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  TX.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = env;
  scene.background = new THREE.Color('#bfe3ff');

  // yorug'lik
  const hemi = new THREE.HemisphereLight('#fff4e0', '#6b5444', Q.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  const sc = sun.shadow.camera;
  sc.left = -Q.area; sc.right = Q.area; sc.top = Q.area; sc.bottom = -Q.area; sc.near = 35; sc.far = 165;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  gfx.sunDir = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();

  // xonalar chiroqlari uchun hovuz (eng yaqin 4 tasi yoqiladi)
  for (let i = 0; i < Q.lamps; i++) {
    const l = new THREE.PointLight('#ffd9a0', 0, 34, 1.6);
    l.position.set(0, -100, 0);
    scene.add(l);
    gfx.lampPool.push(l);
  }

  Object.assign(gfx, { renderer, scene, camera, sun, hemi, env });
  buildSky(scene);
  buildDust(scene, Q.dust);
  if (Q.post) await buildComposer(Q);
  window.addEventListener('resize', resize);
  return gfx;
}

async function buildComposer(Q) {
  const { renderer, scene, camera } = gfx;
  const w = window.innerWidth, h = window.innerHeight, pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.addPass(new RenderPass(scene, camera));
  if (Q.ao) {
    try {
      const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');
      const ao = new GTAOPass(scene, camera, w, h);
      ao.output = 0; // GTAOPass.OUTPUT.Default
      ao.blendIntensity = 0.85;
      ao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 1.5, scale: 1.1, samples: 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      composer.addPass(ao);
      gfx.ao = ao;
    } catch (e) { console.warn('AO yuklanmadi', e); }
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  gfx.composer = composer; gfx.bloom = bloom;
}

// dinamik ruxsat: FPS ga qarab piksel nisbati o'zgaradi
let frameAcc = 0, frameN = 0, prCur = 0;
export function adaptResolution(dt, enabled) {
  if (!enabled) return;
  const Q = gfx.Q, maxPr = Math.min(window.devicePixelRatio || 1, Q.pr), minPr = Math.min(.55, maxPr);
  if (!prCur) prCur = gfx.renderer.getPixelRatio();
  frameAcc += dt; frameN++;
  if (frameAcc < 1.2) return;
  const fps = frameN / frameAcc; frameAcc = 0; frameN = 0;
  let next = prCur;
  if (fps < 46) next = Math.max(minPr, prCur - (fps < 30 ? .15 : .08));
  else if (fps > 58) next = Math.min(maxPr, prCur + .05);
  if (Math.abs(next - prCur) > .01) {
    prCur = next;
    gfx.renderer.setPixelRatio(prCur);
    if (gfx.composer) { gfx.composer.setPixelRatio(prCur); gfx.composer.setSize(window.innerWidth, window.innerHeight); }
  }
  gfx.fps = fps;
}

function resize() {
  const { renderer, camera, composer } = gfx;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

// --------- osmon (gradient gumbaz + quyosh) ---------
function buildSky(scene) {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: new THREE.Vector3(-0.55, 0.62, 0.56).normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; uniform vec3 sunDir;
      void main(){
        float h = vP.y;
        vec3 top = vec3(0.23,0.52,0.95), hor = vec3(0.78,0.9,1.0), gnd = vec3(0.42,0.55,0.32);
        vec3 c = h > 0. ? mix(hor, top, pow(h, .6)) : mix(hor, gnd, min(1., -h*6.));
        float s = max(dot(vP, sunDir), 0.);
        c += vec3(1.,.9,.7) * (pow(s, 600.) * 8. + pow(s, 12.) * .35);
        gl_FragColor = vec4(c * 1.6, 1.);
      }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -10;
  scene.add(sky);
  gfx.sky = sky;
}

// --------- havoda suzib yurgan chang (quyosh nurida yaltiraydi) ---------
function buildDust(scene, n) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * 40 - 20; pos[i * 3 + 1] = Math.random() * 13; pos[i * 3 + 2] = Math.random() * 40 - 20; seed[i] = Math.random() * 100; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() }, map: { value: TX.softDot() }, pr: { value: 1 } },
    vertexShader: `attribute float seed; uniform float time; uniform vec3 center; uniform float pr; varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(time*.13 + seed)*1.5; p.y += sin(time*.21 + seed*1.7)*.8; p.z += cos(time*.11 + seed*.7)*1.5;
        p.xz = mod(p.xz - center.xz + 20., 40.) - 20. + center.xz;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = pr * (18. / -mv.z) * (0.6 + fract(seed)*.8);
        vA = 0.16 * smoothstep(40., 4., -mv.z) * (0.5 + 0.5*sin(time*.7+seed));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D map; varying float vA; void main(){ gl_FragColor = vec4(vec3(1.,.95,.85), texture2D(map, gl_PointCoord).a * vA); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  gfx.dust = pts;
}

const _v = new THREE.Vector3();
let lampTimer = 0;
// har kadrda: soya kamerasi o'yinchini kuzatadi, eng yaqin chiroqlar yoqiladi
let shadowFrame = 0;
export function updateGfx(dt, focus, time) {
  const { sun, dust, camera } = gfx;
  // soya xaritasi har N-kadrda yangilanadi; markaz teksel bo'yicha yaxlitlanadi (titramaslik uchun)
  if (++shadowFrame >= gfx.Q.shadowHz) {
    shadowFrame = 0;
    const step = gfx.Q.area * 2 / gfx.Q.shadow * 4;
    const fx = Math.round(focus.x / step) * step, fz = Math.round(focus.z / step) * step;
    sun.position.set(fx, 0, fz).addScaledVector(gfx.sunDir, 110);
    sun.target.position.set(fx, 0, fz);
    gfx.renderer.shadowMap.needsUpdate = true;
  }
  // soya titrashini kamaytirish uchun teksel bo'yicha yaxlitlash
  if (dust) { dust.material.uniforms.time.value = time; dust.material.uniforms.center.value.copy(camera.position); dust.material.uniforms.pr.value = gfx.renderer.getPixelRatio() * window.innerHeight / 700; }
  lampTimer -= dt;
  if (lampTimer <= 0 && gfx.lamps.length) {
    lampTimer = 0.25;
    const cp = camera.position;
    const sorted = gfx.lamps.slice().sort((a, b) => a.pos.distanceToSquared(cp) - b.pos.distanceToSquared(cp));
    gfx.lampPool.forEach((l, i) => {
      const L = sorted[i];
      if (!L) { l.intensity = 0; return; }
      l.position.copy(L.pos); l.color.set(L.color); l.distance = L.dist || 34;
      l.userData.base = L.intensity; l.userData.flicker = L.flicker;
      l.intensity = L.intensity;
    });
  }
  for (const l of gfx.lampPool) if (l.userData.flicker) l.intensity = l.userData.base * (0.85 + Math.sin(time * 13) * .06 + Math.sin(time * 31) * .05 + Math.random() * .04);
  void _v;
}

// muhit yorug'ligi kuchini sozlash (r160 da scene.environmentIntensity yo'q)
export function tuneEnv(root, k = .4) {
  root.traverse(o => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) if (m.isMeshStandardMaterial && !m.userData.envTuned) { m.envMapIntensity = (m.transparent && m.opacity < .4 ? 1.4 : m.metalness > .5 ? .9 : k); m.userData.envTuned = true; }
  });
}

export function render() {
  if (gfx.composer) gfx.composer.render();
  else gfx.renderer.render(gfx.scene, gfx.camera);
}
