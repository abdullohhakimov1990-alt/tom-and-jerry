// Tom va Jerry 3D modellari, skin materiallari, aksessuarlar va protsedural animatsiya.
import * as THREE from 'three';
import * as TX from './textures.js';
import { setById } from './catalog.js';
import { mergeChildren } from './builder.js';

export const BASE = {
  jerry: { fur: '#c9823f', fur2: '#a5642e', belly: '#f6d7a2', inner: '#f4a3aa', nose: '#3b1a0e', iris: '#2a160c', mode: 'fur' },
  tom: { fur: '#7f90af', fur2: '#5b6a88', belly: '#f3f3f5', inner: '#f2a5ab', nose: '#3a2a2e', iris: '#c3d33a', mode: 'fur' },
};
export const DIM = { jerry: { h: 1.5, r: .38 }, tom: { h: 3.45, r: .9 } };

const lighten = (c, k) => new THREE.Color(c).lerp(new THREE.Color('#ffffff'), k);

function makeMats(kind, look) {
  const L = Object.assign({}, BASE[kind], look);
  const mode = L.mode || 'fur';
  const fur = c => {
    switch (mode) {
      case 'metal': return new THREE.MeshStandardMaterial({ color: c, metalness: .9, roughness: .28 });
      case 'gold': return new THREE.MeshStandardMaterial({ color: '#ffc94a', metalness: 1, roughness: .18 });
      case 'crystal': return new THREE.MeshPhysicalMaterial({ color: c, roughness: .04, transparent: true, opacity: .62, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7, envMapIntensity: 2, depthWrite: true });
      case 'ice': return new THREE.MeshPhysicalMaterial({ color: c, roughness: .12, clearcoat: 1, transparent: true, opacity: .88, envMapIntensity: 1.6, sheen: .5, sheenColor: new THREE.Color('#ffffff') });
      case 'neon': return new THREE.MeshStandardMaterial({ color: '#15151c', roughness: .35, metalness: .3 });
      case 'lava': { const t = TX.lava(); return new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissiveMap, emissive: '#ff6a00', emissiveIntensity: 2.4, roughness: .85 }); }
      case 'galaxy': { const t = TX.galaxy(); return new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.map, emissive: '#ffffff', emissiveIntensity: .7, roughness: .3, metalness: .2 }); }
      default: return new THREE.MeshPhysicalMaterial({ color: c, roughness: .72, sheen: 1, sheenColor: lighten(c, .55), sheenRoughness: .45 });
    }
  };
  const m = { fur: fur(L.fur), fur2: fur(L.fur2), belly: fur(L.belly), inner: fur(L.inner) };
  if (mode === 'neon') {
    const g = L.glow || '#00e5ff';
    m.belly = new THREE.MeshStandardMaterial({ color: g, emissive: g, emissiveIntensity: 2.6, roughness: .4 });
    m.inner = m.belly;
  }
  if (mode === 'gold' || mode === 'metal') m.inner = m.belly;
  m.nose = new THREE.MeshPhysicalMaterial({ color: mode === 'gold' ? '#b8860b' : L.nose, roughness: .25, clearcoat: 1 });
  m.white = new THREE.MeshPhysicalMaterial({ color: kind === 'tom' ? '#fffbea' : '#ffffff', roughness: .12, clearcoat: 1 });
  const glowEyes = L.glowEyes || (mode === 'neon' ? L.glow : null);
  m.iris = glowEyes ? new THREE.MeshStandardMaterial({ color: glowEyes, emissive: glowEyes, emissiveIntensity: 3 }) : new THREE.MeshPhysicalMaterial({ color: L.iris, roughness: .2, clearcoat: 1 });
  m.pupil = new THREE.MeshPhysicalMaterial({ color: '#0b0b0b', roughness: .1, clearcoat: 1 });
  m.shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  m.dark = new THREE.MeshStandardMaterial({ color: '#141010', roughness: .5 });
  m.mode = mode; m.look = L;
  return m;
}

const S = (r, w = 24, h = 18) => new THREE.SphereGeometry(r, w, h);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
function capsule(r, len, mat, parent, y) { return mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat, parent, 0, y); }
function lathe(pts, mat, parent, y = 0) { return mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 32), mat, parent, 0, y); }

// ================= RIG =================
function buildRig(kind, m) {
  const J = kind === 'jerry';
  const root = new THREE.Group();
  const P = J ? {
    hipY: .36, torso: [[0, -.06], [.21, -.03], [.29, .1], [.28, .25], [.22, .38], [.13, .47], [0, .5]],
    belly: [.2, 0, .15, .13, 1, 1.25, .7], headY: .78, headR: .33, headS: [1.05, .95, 1],
    legX: .13, legR: .07, legL: .14, footR: .1, footY: -.31, armX: .24, armY: .38, armR: .05, armL: .17, handR: .065,
    tailSeg: 8, tailR: .03, tailL: .11,
  } : {
    hipY: .95, torso: [[0, -.12], [.5, -.06], [.66, .25], [.62, .62], [.5, .95], [.32, 1.12], [0, 1.18]],
    belly: [.46, 0, .45, .3, 1, 1.35, .6], headY: 1.72, headR: .58, headS: [1.15, .95, 1],
    legX: .3, legR: .17, legL: .42, footR: .22, footY: -.84, armX: .6, armY: .98, armR: .13, armL: .58, handR: .18,
    tailSeg: 10, tailR: .085, tailL: .3,
  };
  const hips = group(root, 0, P.hipY, 0);
  const torso = lathe(P.torso, m.fur, hips);
  const [br, bx, by, bz, sx, sy, sz] = P.belly;
  mesh(S(br), m.belly, hips, bx, by, bz, sx, sy, sz);
  if (!J) mesh(S(.5), m.fur2, hips, 0, .55, -.25, 1.15, 1.2, .8); // orqa (to'qroq)

  // bosh
  const head = group(hips, 0, P.headY, J ? .02 : .06);
  const R = P.headR;
  mesh(S(R, 32, 24), m.fur, head, 0, 0, 0, ...P.headS);
  const eyes = [];
  if (J) {
    mesh(S(.19), m.belly, head, 0, -.1, .22, 1.15, .82, .95);
    mesh(S(.055), m.nose, head, 0, -.03, .42);
    for (const s of [-1, 1]) {
      const eg = group(head, s * .12, .07, .25);
      const scl = mesh(S(.1), m.white, eg, 0, 0, 0, .85, 1.3, .6);
      const iris = mesh(S(.056), m.iris, eg, 0, -.01, .05, 1, 1.2, .5);
      mesh(S(.032), m.pupil, eg, 0, -.01, .072, 1, 1.2, .45);
      mesh(S(.017, 8, 6), m.shine, eg, .022, .03, .08);
      eyes.push({ g: eg, scl, iris });
      const ear = group(head, s * .3, .26, -.06); ear.rotation.z = s * -.3;
      mesh(S(.26), m.fur, ear, 0, 0, 0, 1, 1, .28);
      mesh(S(.18), m.inner, ear, 0, 0, .04, 1, 1, .22);
      eyes[eyes.length - 1].ear = ear;
      const brow = mesh(new THREE.CapsuleGeometry(.014, .07, 3, 6), m.dark, head, s * .12, .22, .29); brow.rotation.z = Math.PI / 2 + s * .2;
      for (let w = -1; w <= 1; w++) { const wh = mesh(new THREE.CylinderGeometry(.004, .004, .36, 4), m.dark, head, s * .22, -.07 + w * .035, .37); wh.rotation.z = Math.PI / 2 + w * .18 * s; wh.castShadow = false; }
    }
  } else {
    for (const s of [-1, 1]) mesh(S(.27), m.belly, head, s * .2, -.2, .42, 1.1, .85, .9);
    mesh(S(.3), m.belly, head, 0, -.28, .38, 1.2, .7, .8);
    mesh(S(.09), m.nose, head, 0, -.06, .66);
    const mouth = mesh(new THREE.TorusGeometry(.16, .02, 6, 12, Math.PI), m.dark, head, 0, -.3, .6); mouth.rotation.z = Math.PI;
    for (const s of [-1, 1]) {
      const eg = group(head, s * .21, .13, .44);
      const scl = mesh(S(.17), m.white, eg, 0, 0, 0, .85, 1.3, .55);
      const iris = mesh(S(.095), m.iris, eg, 0, -.02, .065, 1, 1.25, .5);
      mesh(S(.055), m.pupil, eg, 0, -.02, .1, .5, 1.25, .4);
      mesh(S(.026, 8, 6), m.shine, eg, .035, .05, .12);
      eyes.push({ g: eg, scl, iris });
      const ear = group(head, s * .4, .48, -.04); ear.rotation.z = s * -.42;
      mesh(new THREE.ConeGeometry(.27, .62, 16), m.fur, ear, 0, .2, 0, 1, 1, .45);
      mesh(new THREE.ConeGeometry(.17, .44, 12), m.inner, ear, 0, .17, .07, 1, 1, .3);
      eyes[eyes.length - 1].ear = ear;
      const brow = mesh(new THREE.BoxGeometry(.32, .06, .06), m.dark, head, s * .21, .42, .5); brow.rotation.z = s * -.32;
      for (let w = -1; w <= 1; w++) { const wh = mesh(new THREE.CylinderGeometry(.008, .008, .8, 4), m.dark, head, s * .45, -.22 + w * .06, .55); wh.rotation.z = Math.PI / 2 + w * .16 * s; wh.castShadow = false; }
    }
  }
  // oyoq-qo'llar
  const limb = (x, y, r, len, mat, endR, endMat, foot) => {
    const piv = group(hips, x, y, 0);
    capsule(r, len, mat, piv, -(len / 2 + r * .3));
    const end = foot
      ? mesh(S(endR), endMat, piv, 0, P.footY, endR * .55, 1, .5, 1.75)
      : mesh(S(endR), endMat, piv, 0, -(len + r * 1.2), 0);
    return { piv, end };
  };
  const armL = limb(-P.armX, P.armY, P.armR, P.armL, m.fur, P.handR, J ? m.fur : m.belly);
  const armR = limb(P.armX, P.armY, P.armR, P.armL, m.fur, P.handR, J ? m.fur : m.belly);
  const legL = limb(-P.legX, 0, P.legR, P.legL, m.fur, P.footR, J ? m.fur : m.belly, true);
  const legR = limb(P.legX, 0, P.legR, P.legL, m.fur, P.footR, J ? m.fur : m.belly, true);
  armL.piv.rotation.z = -.15; armR.piv.rotation.z = .15;
  // dum (bo'g'inli)
  const tail = []; let parent = group(hips, 0, J ? .02 : .1, J ? -.25 : -.55);
  parent.rotation.x = J ? -1.9 : -2.1;
  for (let i = 0; i < P.tailSeg; i++) {
    const t = i / P.tailSeg, r = P.tailR * (1 - t * .45);
    const seg = group(parent, 0, i === 0 ? 0 : P.tailL, 0);
    const mat = (!J && i >= P.tailSeg - 2) ? m.fur2 : (J ? m.fur2 : m.fur);
    capsule(r, P.tailL, mat, seg, P.tailL / 2);
    tail.push(seg); parent = seg;
  }
  const anchors = {
    hat: group(head, 0, R * P.headS[1] * .9, 0),
    face: group(head, 0, J ? .07 : .13, 0),
    neck: group(hips, 0, J ? .46 : 1.08, 0),
    back: group(hips, 0, J ? .3 : .75, J ? -.24 : -.55),
    hand: group(armR.end, 0, 0, 0),
  };
  return { root, hips, torso, head, eyes, armL, armR, legL, legR, tail, anchors, P, R, J };
}

// ================= AKSESSUARLAR =================
const am = new Map();
const A = (c, o = {}) => { const k = c + JSON.stringify(o); if (!am.has(k)) am.set(k, new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: .55, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }, o.p || {}))); return am.get(k); };
const GOLD = () => A('#ffc94a', { p: { metalness: 1, roughness: .2 } });
const STEEL = () => A('#d6dde3', { p: { metalness: 1, roughness: .25 } });

function buildAcc(rig, a, auras) {
  const R = rig.R, H = rig.anchors.hat, F = rig.anchors.face, N = rig.anchors.neck, BK = rig.anchors.back, J = rig.J;
  const sc = J ? 1 : 1.9; // tana o'lchami
  switch (a.t) {
    case 'band': { const t = mesh(new THREE.TorusGeometry(R * 1.02, R * .09, 8, 32), A(a.c), F, 0, R * .25, -R * .02); t.rotation.x = Math.PI / 2 - .15;
      for (const s of [-1, 1]) { const tl = mesh(new THREE.BoxGeometry(R * .14, R * .7, R * .04), A(a.c), F, s * R * .15, R * .05, -R * 1.02); tl.rotation.z = s * .5; } break; }
    case 'mask': { const t = mesh(new THREE.TorusGeometry(R * .98, R * .13, 8, 32, Math.PI * 1.1), A(a.c), F, 0, 0, 0); t.rotation.x = Math.PI / 2; t.rotation.z = -Math.PI * .05; break; }
    case 'eyepatch': { mesh(S(R * .2), A('#111111'), F, R * .37, 0, R * .78, 1, 1, .3); const st = mesh(new THREE.TorusGeometry(R * 1.01, R * .03, 6, 32), A('#111111'), F, 0, R * .1, 0); st.rotation.x = Math.PI / 2; st.rotation.z = .5; break; }
    case 'pirateHat': {
      const b = mesh(new THREE.CylinderGeometry(R * 1.25, R * 1.25, R * .1, 32), A('#1a1a1a'), H, 0, 0, 0, 1, 1, .62);
      const c = mesh(new THREE.SphereGeometry(R * .95, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), A('#1a1a1a'), H, 0, 0, 0, 1.15, .85, .62);
      mesh(new THREE.TorusGeometry(R * 1.24, R * .04, 6, 40), GOLD(), H, 0, R * .05, 0, 1, .62, 1).rotation.x = Math.PI / 2;
      mesh(S(R * .17), GOLD(), H, 0, R * .45, R * .55, 1, 1, .3); void b; void c; break;
    }
    case 'chefHat': {
      mesh(new THREE.CylinderGeometry(R * .7, R * .62, R * .7, 24), A('#ffffff'), H, 0, R * .2, 0);
      for (let i = 0; i < 6; i++) { const ang = i * Math.PI / 3; mesh(S(R * .42), A('#ffffff'), H, Math.sin(ang) * R * .4, R * .75, Math.cos(ang) * R * .4); }
      mesh(S(R * .5), A('#ffffff'), H, 0, R * .9, 0); break;
    }
    case 'beanie': {
      mesh(new THREE.SphereGeometry(R * 1.04, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), A(a.c, { p: { sheen: 1, sheenColor: new THREE.Color('#ffffff') } }), H, 0, -R * .35, 0, 1, 1.05, 1);
      mesh(new THREE.TorusGeometry(R * 1.02, R * .14, 8, 32), A(a.c2 || '#ffffff'), H, 0, -R * .32, 0).rotation.x = Math.PI / 2;
      mesh(S(R * .28), A(a.c2 || '#ffffff', { p: { sheen: 1 } }), H, 0, R * .75, 0); break;
    }
    case 'crown': {
      const g = group(H, 0, -R * .05, 0);
      mesh(new THREE.CylinderGeometry(R * .62, R * .58, R * .35, 28, 1, true), GOLD(), g, 0, R * .17, 0).material.side = THREE.DoubleSide;
      for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4; mesh(new THREE.ConeGeometry(R * .12, R * .35, 8), GOLD(), g, Math.sin(ang) * R * .6, R * .5, Math.cos(ang) * R * .6); mesh(S(R * .07), A(['#e53935', '#1e88e5', '#43a047', '#8e24aa'][i % 4], { p: { roughness: .05, clearcoat: 1 } }), g, Math.sin(ang) * R * .62, R * .17, Math.cos(ang) * R * .62); }
      break;
    }
    case 'cowboy': {
      mesh(new THREE.CylinderGeometry(R * 1.55, R * 1.55, R * .07, 36), A(a.c), H, 0, -R * .05, 0, 1, 1, .9);
      mesh(new THREE.CylinderGeometry(R * .62, R * .75, R * .7, 24), A(a.c), H, 0, R * .3, 0, 1, 1, .85);
      mesh(new THREE.TorusGeometry(R * .74, R * .06, 6, 28), A('#3e2723'), H, 0, R * .05, 0, 1, .85, 1).rotation.x = Math.PI / 2; break;
    }
    case 'wizard': {
      mesh(new THREE.CylinderGeometry(R * 1.4, R * 1.4, R * .06, 36), A(a.c), H, 0, -R * .08, 0);
      const cone = mesh(new THREE.ConeGeometry(R * .8, R * 2.4, 28), A(a.c), H, 0, R * 1.1, -R * .1); cone.rotation.x = -.15;
      for (let i = 0; i < 6; i++) mesh(new THREE.OctahedronGeometry(R * .09), A('#ffeb3b', { p: { emissive: new THREE.Color('#ffeb3b'), emissiveIntensity: 2 } }), H, Math.sin(i * 1.7) * R * .55 * (1 - i / 8), R * (.3 + i * .3), Math.cos(i * 1.7) * R * .55 * (1 - i / 8));
      break;
    }
    case 'knight': {
      mesh(new THREE.SphereGeometry(R * 1.12, 32, 20, 0, Math.PI * 2, 0, Math.PI * .62), STEEL(), H, 0, -R * .8, 0, 1.05, 1.1, 1.05);
      mesh(new THREE.BoxGeometry(R * .9, R * .1, R * .1), A('#111111'), F, 0, R * .05, R * 1.02);
      const pl = mesh(S(R * .3), A('#d32f2f'), H, 0, R * .4, -R * .2, .5, 1.6, 1.4); pl.rotation.x = -.4; break;
    }
    case 'astro': {
      mesh(S(R * 1.5, 32, 24), A('#cfefff', { p: { roughness: .02, transparent: true, opacity: .22, clearcoat: 1, envMapIntensity: 2, depthWrite: false } }), F, 0, R * .05, R * .05);
      mesh(new THREE.TorusGeometry(R * 1.05, R * .14, 10, 32), STEEL(), N, 0, R * .05, 0).rotation.x = Math.PI / 2; break;
    }
    case 'backpack': {
      mesh(new THREE.BoxGeometry(.5 * sc, .55 * sc, .25 * sc), A(a.c || '#eeeeee'), BK, 0, 0, -.1 * sc);
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(.08 * sc, .08 * sc, .5 * sc, 12), STEEL(), BK, s * .17 * sc, 0, -.27 * sc);
      break;
    }
    case 'deerstalker': {
      mesh(new THREE.SphereGeometry(R * 1.03, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), A(a.c), H, 0, -R * .3, 0);
      for (const z of [1, -1]) { const b = mesh(new THREE.CylinderGeometry(R * .5, R * .5, R * .05, 20, 1, false, 0, Math.PI), A(a.c), H, 0, -R * .28, z * R * .78); b.rotation.y = z > 0 ? 0 : Math.PI; b.rotation.x = z * .2; }
      mesh(S(R * .1), A(a.c), H, 0, R * .74, 0); break;
    }
    case 'horns': { for (const s of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(R * .14, R * .65, 12), A(a.c), H, s * R * .4, R * .05, -R * .1); h.rotation.z = s * -.45; h.rotation.x = -.35; } break; }
    case 'antenna': { mesh(new THREE.CylinderGeometry(R * .025, R * .025, R * .7, 6), STEEL(), H, 0, R * .3, 0); mesh(S(R * .12), A(a.c, { p: { emissive: new THREE.Color(a.c), emissiveIntensity: 3 } }), H, 0, R * .7, 0); break; }
    case 'flowers': { for (let i = 0; i < 9; i++) { const ang = i * Math.PI * 2 / 9; mesh(S(R * .16), A(['#ff80ab', '#ffffff', '#f8bbd0'][i % 3], { p: { sheen: 1 } }), H, Math.sin(ang) * R * .82, -R * .18, Math.cos(ang) * R * .82, 1, .6, 1); } break; }
    case 'icicles': { for (let i = 0; i < 9; i++) { const ang = i * Math.PI * 2 / 9; mesh(new THREE.ConeGeometry(R * .1, R * (.4 + (i % 3) * .2), 8), A('#e1f5fe', { p: { roughness: .05, transparent: true, opacity: .8, clearcoat: 1, emissive: new THREE.Color('#4fc3f7'), emissiveIntensity: .6 } }), H, Math.sin(ang) * R * .62, R * .1, Math.cos(ang) * R * .62); } break; }
    case 'goggles': { for (const s of [-1, 1]) { const g = mesh(new THREE.TorusGeometry(R * .2, R * .05, 8, 20), A('#ff6f00'), F, s * R * .36, R * .02, R * .78); mesh(new THREE.CircleGeometry(R * .2, 20), A('#b3e5fc', { p: { transparent: true, opacity: .5, roughness: 0 } }), g, 0, 0, 0); }
      const st = mesh(new THREE.TorusGeometry(R * 1.0, R * .04, 6, 32), A('#263238'), F, 0, R * .05, 0); st.rotation.x = Math.PI / 2; break; }
    case 'bandage': { const t = mesh(new THREE.TorusGeometry(R * 1.0, R * .08, 8, 32), A('#f5f0e1'), F, 0, R * .4, 0); t.rotation.x = Math.PI / 2 + .3; t.rotation.y = .3; break; }
    case 'fangs': { for (const s of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(R * .04, R * .14, 6), A('#ffffff'), rig.head, s * R * .1, J ? -R * .45 : -R * .62, J ? R * .62 : R * .95); f.rotation.x = Math.PI; } break; }
    case 'mustache': { for (const s of [-1, 1]) { const m = mesh(new THREE.CapsuleGeometry(R * .06, R * .3, 4, 8), A('#1a1a1a'), rig.head, s * R * .2, -R * .22, R * 1.0); m.rotation.z = Math.PI / 2 + s * .35; } break; }
    case 'scarf': {
      mesh(new THREE.TorusGeometry(J ? .17 : .4, J ? .055 : .12, 10, 24), A(a.c, { p: { sheen: 1, sheenColor: new THREE.Color('#ffffff') } }), N, 0, 0, J ? .02 : .05).rotation.x = Math.PI / 2;
      const tl = mesh(new THREE.BoxGeometry(J ? .08 : .2, J ? .3 : .75, J ? .03 : .06), A(a.c), N, J ? .08 : .2, J ? -.12 : -.3, J ? .17 : .42); tl.rotation.z = .15; break;
    }
    case 'cape': {
      const w = J ? .55 : 1.5, h = J ? .75 : 2.3;
      const g = new THREE.CylinderGeometry(w * .45, w * .75, h, 18, 6, true, Math.PI * .6, Math.PI * .8);
      g.translate(0, -h / 2, 0);
      const cape = mesh(g, A(a.c, { ds: true, p: { sheen: 1, sheenColor: new THREE.Color(a.c2 || '#ffffff'), roughness: .5 } }), BK, 0, J ? .2 : .55, J ? .12 : .3);
      cape.userData.cape = true; rig.cape = cape;
      if (a.collar) { const c = mesh(new THREE.CylinderGeometry(J ? .25 : .65, J ? .2 : .5, J ? .28 : .7, 16, 1, true, Math.PI * .55, Math.PI * .9), A(a.c2 || a.c, { ds: true }), N, 0, J ? .1 : .25, -0.02); c.rotation.x = -.15; }
      if (a.trim) mesh(new THREE.TorusGeometry(J ? .2 : .55, J ? .05 : .13, 8, 20), A('#ffffff', { p: { sheen: 1 } }), N, 0, 0, 0).rotation.x = Math.PI / 2;
      break;
    }
    case 'wings': {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.bezierCurveTo(.4, .5, .9, .7, 1.2, .55); sh.lineTo(1.0, .2); sh.bezierCurveTo(.9, .05, .8, 0, .7, -.05); sh.bezierCurveTo(.6, -.2, .45, -.25, .3, -.15); sh.closePath();
      const geo = new THREE.ShapeGeometry(sh, 10);
      const wg = [];
      for (const s of [-1, 1]) {
        const p = group(BK, s * .05 * sc, .1 * sc, -.05 * sc);
        const w = mesh(geo, A(a.c, { ds: true, p: { roughness: .5, sheen: .6 } }), p, 0, 0, 0, s * .55 * sc, .55 * sc, 1);
        p.rotation.y = s * -.5; wg.push(p); void w;
      }
      rig.wings = wg; break;
    }
    case 'shirt': {
      const t = TX.shirt(a.c, a.c2, a.n);
      const shell = lathe(rig.P.torso.map(([r, y]) => [r * 1.06, y]).slice(0, 6), new THREE.MeshStandardMaterial({ map: t.map, roughness: .7, side: THREE.DoubleSide }), rig.hips);
      shell.rotation.y = Math.PI; break;
    }
    case 'sword': {
      const g = group(rig.anchors.hand, 0, 0, 0); g.rotation.x = Math.PI / 2;
      mesh(new THREE.BoxGeometry(.05 * sc, .65 * sc, .015 * sc), A(a.c, { p: { metalness: 1, roughness: .15 } }), g, 0, .38 * sc, 0);
      mesh(new THREE.BoxGeometry(.22 * sc, .04 * sc, .05 * sc), GOLD(), g, 0, .05 * sc, 0); break;
    }
    case 'wand': {
      const g = group(rig.anchors.hand, 0, 0, 0); g.rotation.x = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(.012 * sc, .018 * sc, .45 * sc, 6), A('#4e342e'), g, 0, .2 * sc, 0);
      mesh(new THREE.OctahedronGeometry(.05 * sc), A('#fff59d', { p: { emissive: new THREE.Color('#ffeb3b'), emissiveIntensity: 3 } }), g, 0, .45 * sc, 0); break;
    }
    case 'aura': auras.push(makeAura(a.k, rig)); break;
  }
}

// ---------------- zarralar aurasi ----------------
const AURA = {
  snow: { n: 26, col: '#ffffff', add: false, size: .14, rise: -.4 },
  fire: { n: 34, col: '#ff7a1a', add: true, size: .32, rise: 1.2 },
  sparkle: { n: 26, col: '#fff6c8', add: true, size: .18, rise: .2 },
  gold: { n: 28, col: '#ffc94a', add: true, size: .2, rise: .35 },
  petals: { n: 18, col: '#ffffff', add: false, size: .26, rise: -.3, petal: true },
  bubble: { n: 18, col: '#bfe9ff', add: true, size: .2, rise: .7 },
};
function makeAura(k, rig) {
  const A2 = AURA[k] || AURA.sparkle, n = A2.n, sc = rig.J ? 1 : 2.2;
  const pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) seed.push([Math.random() * 6.28, Math.random(), Math.random() * 6.28]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: A2.col, size: A2.size * sc, map: A2.petal ? TX.petal() : TX.softDot(), transparent: true, depthWrite: false, blending: A2.add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: .9 });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  rig.root.add(pts);
  return { pts, seed, A2, sc, update(t) {
    const p = geo.attributes.position;
    for (let i = 0; i < n; i++) {
      const [a, b, c] = seed[i];
      const life = (t * .35 + b) % 1;
      const rad = (.35 + .25 * Math.sin(c + t)) * sc;
      p.setXYZ(i, Math.cos(a + t * .7) * rad, ((A2.rise >= 0 ? life : 1 - life) * 1.5 + .05) * sc, Math.sin(a + t * .7) * rad);
    }
    p.needsUpdate = true;
  } };
}

// ================= ASOSIY FUNKSIYA =================
// kind: 'jerry' | 'tom', setId: to'plam id
export function makeCharacter(kind, setId = 'classic') {
  const set = setById(setId);
  const look = set[kind] || {};
  const m = makeMats(kind, look);
  const rig = buildRig(kind, m);
  const auras = [];
  for (const a of look.acc || []) buildAcc(rig, a, auras);
  // har bir personaj o'z materiallariga ega bo'lsin (shaffoflik alohida boshqariladi)
  const own = new Map();
  rig.root.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    if ((o.isMesh || o.isPoints) && o.material) { if (!own.has(o.material)) own.set(o.material, o.isPoints ? o.material : o.material.clone()); o.material = own.get(o.material); }
  });
  const mats = [...own.values()].filter(mt => !mt.isPointsMaterial);
  if (rig.cape) rig.cape.userData.keep = true;
  mergeChildren(rig.root);
  mats.forEach(mt => { mt.userData.baseOpacity = mt.opacity; mt.userData.baseTransparent = mt.transparent; });

  let t = Math.random() * 10, ph = 0, blinkT = 2 + Math.random() * 3, alpha = 1;
  const J = rig.J, amp = J ? 1 : .9;
  const ch = {
    kind, setId, root: rig.root, rig, mats, dim: DIM[kind],
    setOpacity(a) {
      if (Math.abs(a - alpha) < .01) return; alpha = a;
      for (const mt of mats) { mt.transparent = a < .99 || mt.userData.baseTransparent; mt.opacity = mt.userData.baseOpacity * a; mt.depthWrite = a > .99; mt.needsUpdate = true; }
    },
    // mode: idle | walk | run | sprint | jump | fall | hide | caught | celebrate | search | stunned | pounce | wave | sneak
    update(dt, mode = 'idle', speed = 0, look = 0, reverse = false) {
      t += dt;
      const run = mode === 'run' || mode === 'sprint', walk = mode === 'walk' || mode === 'sneak';
      ph += dt * (run ? (J ? 15 : 9.5) * (mode === 'sprint' ? 1.2 : 1) : walk ? (J ? 9 : 6) : 3) * (reverse ? -1 : 1);
      const s = Math.sin(ph), c = Math.cos(ph);
      const { hips, head, armL, armR, legL, legR, tail } = rig;
      hips.position.y = rig.P.hipY; hips.rotation.set(0, 0, 0); hips.position.z = 0; head.rotation.set(0, look, 0);
      armL.piv.rotation.set(0, 0, -.15); armR.piv.rotation.set(0, 0, .15);
      legL.piv.rotation.set(0, 0, 0); legR.piv.rotation.set(0, 0, 0);
      const hy = rig.P.hipY;
      if (run) {
        const k = mode === 'sprint' ? 1.25 : 1;
        legL.piv.rotation.x = s * 1.05 * k; legR.piv.rotation.x = -s * 1.05 * k;
        armL.piv.rotation.x = -s * 1.1 * k; armR.piv.rotation.x = s * 1.1 * k;
        hips.position.y = hy + Math.abs(c) * hy * .22; hips.rotation.x = .22 * k; head.rotation.x = -.12;
        hips.rotation.y = s * .12;
      } else if (walk) {
        const k = mode === 'sneak' ? .6 : 1;
        legL.piv.rotation.x = s * .6 * k; legR.piv.rotation.x = -s * .6 * k;
        armL.piv.rotation.x = -s * .5 * k; armR.piv.rotation.x = s * .5 * k;
        hips.position.y = hy + Math.abs(c) * hy * .08; if (mode === 'sneak') { hips.rotation.x = .4; head.rotation.x = -.3; armL.piv.rotation.x -= 1; armR.piv.rotation.x -= 1; }
      } else if (mode === 'jump' || mode === 'fall') {
        legL.piv.rotation.x = -.9; legR.piv.rotation.x = .3;
        armL.piv.rotation.x = -2.5; armR.piv.rotation.x = -2.3; armL.piv.rotation.z = -.5; armR.piv.rotation.z = .5;
        hips.rotation.x = mode === 'fall' ? .15 : -.1;
      } else if (mode === 'pounce') {
        legL.piv.rotation.x = .9; legR.piv.rotation.x = .7; armL.piv.rotation.x = -2.4; armR.piv.rotation.x = -2.4;
        hips.rotation.x = .8; hips.position.y = hy * .9;
      } else if (mode === 'hide') {
        legL.piv.rotation.x = -1.5; legR.piv.rotation.x = -1.5; hips.position.y = hy * .55; hips.rotation.x = .5;
        armL.piv.rotation.x = -1.3; armR.piv.rotation.x = -1.3; armL.piv.rotation.z = .6; armR.piv.rotation.z = -.6;
        head.rotation.y = Math.sin(t * 2) * .4;
      } else if (mode === 'caught') {
        legL.piv.rotation.x = Math.sin(t * 25) * .9; legR.piv.rotation.x = -Math.sin(t * 25) * .9;
        armL.piv.rotation.x = -3; armR.piv.rotation.x = -3; armL.piv.rotation.z = -.4 + Math.sin(t * 20) * .3; armR.piv.rotation.z = .4 - Math.sin(t * 20) * .3;
      } else if (mode === 'stunned') {
        hips.rotation.z = Math.sin(t * 3) * .15; head.rotation.z = Math.sin(t * 5) * .3;
        armL.piv.rotation.z = -1; armR.piv.rotation.z = 1; armL.piv.rotation.x = Math.sin(t * 6) * .4;
      } else if (mode === 'search') {
        legL.piv.rotation.x = Math.sin(t * 4) * .3; legR.piv.rotation.x = -Math.sin(t * 4) * .3;
        hips.rotation.x = .45; head.rotation.y = Math.sin(t * 1.7) * 1.0; head.rotation.x = .2 + Math.sin(t * 8) * .05;
        armL.piv.rotation.x = .4; armR.piv.rotation.x = .4;
      } else if (mode === 'celebrate') {
        hips.position.y = hy + Math.abs(Math.sin(t * 6)) * hy * .3;
        armL.piv.rotation.x = -2.8; armR.piv.rotation.x = -2.8; armL.piv.rotation.z = -.4 + Math.sin(t * 12) * .25; armR.piv.rotation.z = .4 - Math.sin(t * 12) * .25;
        hips.rotation.y = Math.sin(t * 3) * .3;
      } else if (mode === 'wave') {
        armR.piv.rotation.x = -2.7; armR.piv.rotation.z = .5 + Math.sin(t * 8) * .4;
        armL.piv.rotation.x = Math.sin(t * 2) * .1;
        hips.position.y = hy + Math.sin(t * 2.5) * hy * .03; head.rotation.z = Math.sin(t * 2) * .12;
      } else { // idle
        armL.piv.rotation.x = Math.sin(t * 2) * .12; armR.piv.rotation.x = -Math.sin(t * 2) * .12;
        hips.position.y = hy + Math.sin(t * 2.2) * hy * .02; head.rotation.y += Math.sin(t * .8) * .25;
      }
      // bosh kamera bilan birga yuqori-pastga qaraydi
      if (ch.lookPitch) head.rotation.x += ch.lookPitch;
      // dum
      const ta = run ? .25 : .45;
      tail.forEach((sg, i) => { sg.rotation.x = (run ? .18 : .12) + Math.sin(t * (run ? 9 : 3) - i * .6) * .05; sg.rotation.z = Math.sin(t * (run ? 7 : 2.3) - i * .5) * ta * amp / tail.length * 2.2; });
      // ko'z qisish
      blinkT -= dt;
      const bl = blinkT < 0 ? Math.max(.08, Math.abs(blinkT * 16 + 1) % 2) : 1;
      if (blinkT < -.13) blinkT = 2 + Math.random() * 4;
      for (const e of rig.eyes) { e.g.scale.y = bl; if (e.ear) e.ear.rotation.x = Math.sin(t * 1.3 + e.g.position.x) * .08; }
      if (rig.cape) rig.cape.rotation.x = -(run ? .7 : walk ? .3 : .08) - Math.sin(t * 6) * .05;
      if (rig.wings) rig.wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (-.5 + Math.sin(t * (run ? 12 : 3)) * .25); });
      for (const a of auras) a.update(t);
    },
    dispose() { rig.root.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); },
  };
  ch.update(0);
  return ch;
}

// ================= SPIKE (it) =================
export function makeSpike() {
  const root = new THREE.Group();
  const g = new THREE.MeshPhysicalMaterial({ color: '#8e9499', roughness: .7, sheen: 1, sheenColor: new THREE.Color('#d0d4d8') });
  const w = new THREE.MeshPhysicalMaterial({ color: '#d8dade', roughness: .7, sheen: 1 });
  const dk = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: .4 });
  const body = group(root, 0, 1.6, 0);
  mesh(S(1.1), g, body, 0, 0, 0, 1.1, .9, 1.5);
  mesh(S(.8), w, body, 0, -.2, .7, 1, .9, .8);
  const head = group(body, 0, .9, 1.4);
  mesh(S(.85), g, head, 0, 0, 0, 1.2, 1, 1);
  mesh(S(.55), w, head, 0, -.35, .55, 1.3, .7, .9);
  mesh(S(.16), dk, head, 0, -.05, 1.0);
  for (const s of [-1, 1]) {
    mesh(S(.16), new THREE.MeshPhysicalMaterial({ color: '#ffffff', clearcoat: 1, roughness: .1 }), head, s * .32, .25, .72); mesh(S(.08), dk, head, s * .32, .25, .84);
    const ear = mesh(S(.3), g, head, s * .78, .45, -.1, .5, 1, .3); ear.rotation.z = s * .8;
    const tooth = mesh(new THREE.ConeGeometry(.07, .22, 6), new THREE.MeshPhysicalMaterial({ color: '#fff' }), head, s * .3, -.62, .9); tooth.rotation.x = Math.PI;
  }
  const collar = mesh(new THREE.TorusGeometry(.75, .12, 8, 24), new THREE.MeshStandardMaterial({ color: '#c62828', roughness: .5 }), body, 0, .55, 1.05); collar.rotation.x = 1.2;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const sp = mesh(new THREE.ConeGeometry(.07, .2, 6), new THREE.MeshStandardMaterial({ color: '#cfd8dc', metalness: 1, roughness: .2 }), collar, Math.cos(a) * .82, Math.sin(a) * .82, 0); sp.rotation.z = a - Math.PI / 2; }
  const legs = [];
  for (const [x, z] of [[-.6, .8], [.6, .8], [-.6, -.8], [.6, -.8]]) { const p = group(root, x, 1.1, z); capsule(.22, .6, g, p, -.45); mesh(S(.28), w, p, 0, -1.0, .1, 1, .5, 1.3); legs.push(p); }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  let t = 0;
  return { root, update(dt, run) { t += dt * (run ? 14 : 4); legs.forEach((l, i) => l.rotation.x = Math.sin(t + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * (run ? .9 : .2)); body.position.y = 1.6 + Math.abs(Math.cos(t)) * (run ? .15 : .03); } };
}
