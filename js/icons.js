// Profil ikonkalari va skin rasmlari — alohida kichik WebGL renderer'da 3D portret chiziladi va keshlanadi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeCharacter } from './models.js';
import { ICONS, SETS } from './catalog.js';

const VER = 'tj_portraits_v6';
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

// o'yin egasi ikonkasi: Shoh Tom va yelkasida Shoh Jerry
function ownerShot(size) {
  const t = makeCharacter('tom', 'shoh'), j = makeCharacter('jerry', 'shoh');
  for (const ch of [t, j]) { ch.root.traverse(o => { if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = .8; }); scene.add(ch.root); }
  t.update(.4, 'idle'); j.update(.4, 'wave');
  t.root.rotation.y = .28; j.root.position.set(1.05, 2.05, .5); j.root.rotation.y = -.3; j.root.scale.setScalar(1.15);
  scene.updateMatrixWorld(true);
  const th = new THREE.Vector3(), jh = new THREE.Vector3(); t.rig.head.getWorldPosition(th); j.rig.head.getWorldPosition(jh);
  const mid = th.clone().lerp(jh, .45);
  cam.position.set(mid.x + .2, mid.y + .2, mid.z + 6.4); cam.lookAt(mid.x, mid.y - .1, mid.z);
  R.setSize(size, size); R.render(scene, cam);
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d').drawImage(R.domElement, 0, 0);
  for (const ch of [t, j]) { scene.remove(ch.root); ch.dispose(); }
  return c;
}
function crown(g, x, y, w) {
  const h = w * .62;
  const gr = g.createLinearGradient(x, y - h, x, y); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(.5, '#ffd700'); gr.addColorStop(1, '#b8860b');
  g.fillStyle = gr; g.strokeStyle = '#5a3a00'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h * .55); g.lineTo(x - w / 4, y - h * .2); g.lineTo(x, y - h); g.lineTo(x + w / 4, y - h * .2); g.lineTo(x + w / 2, y - h * .55); g.lineTo(x + w / 2, y); g.closePath(); g.fill(); g.stroke();
  for (const [gx, col] of [[-w / 4, '#ff1744'], [0, '#00e5ff'], [w / 4, '#76ff03']]) { g.fillStyle = col; g.beginPath(); g.arc(x + gx, y - h * .22, w * .07, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
}
function composeOwner(ic, shot) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(S * .5, S * .42, 8, S * .5, S * .5, S * .78);
  gr.addColorStop(0, '#fff3c4'); gr.addColorStop(.35, '#ff9d00'); gr.addColorStop(.7, '#7a00c8'); gr.addColorStop(1, '#14002b');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.save(); g.translate(S / 2, S * .45); g.globalAlpha = .22; g.fillStyle = '#fff8d0';
  for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -S); g.lineTo(14, -S); g.closePath(); g.fill(); }
  g.restore();
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,${220 + Math.random() * 35 | 0},${150 + Math.random() * 100 | 0},${.4 + Math.random() * .6})`; const x = Math.random() * S, y = Math.random() * S, r = Math.random() * 2.4 + .6; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.drawImage(shot, 0, 0, S, S);
  // kamalak-oltin ramka va burchak toshlari
  const fg = g.createLinearGradient(0, 0, S, S);
  ['#ff004c', '#ffd700', '#fff6c2', '#00d5ff', '#b000ff', '#ffd700'].forEach((col, i, a) => fg.addColorStop(i / (a.length - 1), col));
  g.strokeStyle = fg; g.lineWidth = 16; g.strokeRect(8, 8, S - 16, S - 16);
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.strokeRect(17, 17, S - 34, S - 34);
  for (const [x, y] of [[12, 12], [S - 12, 12], [12, S - 12], [S - 12, S - 12]]) {
    g.fillStyle = '#00e5ff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 9, y); g.lineTo(x, y + 11); g.lineTo(x - 9, y); g.closePath(); g.fill(); g.stroke();
  }
  crown(g, S / 2, 46, 70);
  return c.toDataURL('image/jpeg', .9);
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
      cache['i:' + ic.id] = ic.owner ? composeOwner(ic, ownerShot(256)) : compose(ic, portrait(ic.char, ic.set, 256, false));
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
