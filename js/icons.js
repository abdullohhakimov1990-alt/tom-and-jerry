// Profil ikonkalari va skin rasmlari — alohida kichik WebGL renderer'da 3D portret chiziladi va keshlanadi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeCharacter } from './models.js';
import { ICONS, SETS } from './catalog.js';

const VER = 'tj_portraits_v5';
export const iconURL = {};     // ikonka id -> dataURL
export const skinURL = {};     // 'jerry:ninja' -> dataURL
let cache = null, R = null, scene, cam;

function load() {
  if (cache) return;
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('tj_portraits_') && k !== VER) localStorage.removeItem(k); } catch (e) { }
  try { cache = JSON.parse(localStorage.getItem(VER)) || {}; } catch (e) { cache = {}; }
}
function persist() { try { localStorage.setItem(VER, JSON.stringify(cache)); } catch (e) { /* joy yetmasa, keshsiz ishlaydi */ } }

function setup() {
  if (R) return;
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.setSize(256, 256);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  scene.environment = pm.fromScene(new RoomEnvironment(R), .04).texture;
  const key = new THREE.DirectionalLight('#fff4e0', 2.6); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd0ff', 2.2); rim.position.set(-3, 2, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#ffffff', '#806040', .6));
  cam = new THREE.PerspectiveCamera(28, 1, .05, 50);
}
function teardown() { if (!R) return; R.dispose(); R.forceContextLoss(); R = null; }

// 3D portret -> canvas
function portrait(kind, setId, size, full) {
  const ch = makeCharacter(kind, setId);
  ch.root.traverse(o => { if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = .7; });
  scene.add(ch.root);
  ch.update(.4, full ? 'wave' : 'idle');
  ch.root.rotation.y = full ? .35 : .22;
  ch.root.updateMatrixWorld(true);
  const hp = new THREE.Vector3(); ch.rig.head.getWorldPosition(hp);
  const s = kind === 'jerry' ? 1 : 1.9;
  if (full) { cam.position.set(hp.x + .45 * s, hp.y * .7, hp.z + 4.7 * s); cam.lookAt(hp.x, hp.y * .62, hp.z); }
  else { cam.position.set(hp.x + .35 * s, hp.y + .12 * s, hp.z + 2.25 * s); cam.lookAt(hp.x, hp.y + (kind === 'jerry' ? .1 : .1) * s, hp.z); }
  R.setSize(size, size);
  R.render(scene, cam);
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d').drawImage(R.domElement, 0, 0);
  scene.remove(ch.root); ch.dispose();
  return c;
}

const FRAME = { common: ['#cfd8dc', '#78909c'], rare: ['#64b5f6', '#1565c0'], epic: ['#ce93d8', '#6a1b9a'], legend: ['#ffe082', '#ff8f00'] };
function compose(ic, shot) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(S * .5, S * .38, 10, S * .5, S * .5, S * .75);
  gr.addColorStop(0, ic.bg[0]); gr.addColorStop(1, ic.bg[1]);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  // nur chiziqlari
  g.save(); g.translate(S / 2, S * .42); g.globalAlpha = .16; g.fillStyle = '#ffffff';
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-18, -S); g.lineTo(18, -S); g.closePath(); g.fill(); }
  g.restore();
  if (ic.rar === 'legend' || ic.rar === 'epic') for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${.3 + Math.random() * .6})`; const x = Math.random() * S, y = Math.random() * S, r = Math.random() * 2.2 + .5; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.drawImage(shot, 0, 0, S, S);
  const fr = FRAME[ic.rar] || FRAME.common;
  const fg = g.createLinearGradient(0, 0, S, S); fg.addColorStop(0, fr[0]); fg.addColorStop(.5, '#ffffff'); fg.addColorStop(1, fr[1]);
  g.strokeStyle = fg; g.lineWidth = 14; g.strokeRect(7, 7, S - 14, S - 14);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(15, 15, S - 30, S - 30);
  return c.toDataURL('image/jpeg', .88);
}

// boshlang'ich: profil ikonkalari (do'stlar ro'yxati va profil uchun)
export async function buildIcons(onProgress) {
  load();
  const need = ICONS.filter(i => !cache['i:' + i.id]);
  if (need.length) {
    setup();
    for (let k = 0; k < need.length; k++) {
      const ic = need[k];
      cache['i:' + ic.id] = compose(ic, portrait(ic.char, ic.set, 256, false));
      onProgress && onProgress((k + 1) / need.length);
      await new Promise(r => setTimeout(r, 0));
    }
    persist();
  }
  for (const ic of ICONS) iconURL[ic.id] = cache['i:' + ic.id];
}
// do'kon uchun skin rasmlari (birinchi ochilganda)
export async function buildSkinShots(onProgress) {
  load();
  const list = [];
  for (const s of SETS) for (const k of ['jerry', 'tom']) if (!cache['s:' + k + ':' + s.id]) list.push([k, s.id]);
  if (list.length) {
    setup();
    for (let i = 0; i < list.length; i++) {
      const [k, id] = list[i];
      cache['s:' + k + ':' + id] = portrait(k, id, 160, true).toDataURL('image/webp', .85);
      onProgress && onProgress((i + 1) / list.length);
      if (i % 2) await new Promise(r => setTimeout(r, 0));
    }
    persist();
  }
  for (const s of SETS) for (const k of ['jerry', 'tom']) skinURL[k + ':' + s.id] = cache['s:' + k + ':' + s.id];
  teardown();
}
export function doneIcons() { teardown(); }
