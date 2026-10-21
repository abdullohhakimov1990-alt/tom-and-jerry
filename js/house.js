// Uy: xaritaga qarab 9 (3x3), 12 (4x3) yoki 20 (5x4) xona — devorlar, eshiklar, sichqon teshiklari, derazalar, hovli.
import * as THREE from 'three';
import * as TX from './textures.js';
import { B, M, addGeo, addCol, frame, finalize, resetBuilder } from './builder.js';
import { DESIGNS } from './rooms.js';
import { THEME_STYLE, THEME_DESIGNS } from './themes.js';
import * as FN from './furniture.js';
import { gfx } from './gfx.js';

export const ROOM = 26, WALL = 1, WH = 14;
export const DOOR_W = 6.5, DOOR_H = 10, HOLE_W = 1.7, HOLE_H = 1.9;
export const YARD = 28;   // uy atrofidagi hovli (to'siq bilan o'ralgan)
export const origin = (c, r) => [WALL + c * (ROOM + WALL), WALL + r * (ROOM + WALL)];

// ---------------- XARITALAR ----------------
// noDoor — eshiksiz devorlar (u yerda faqat sichqon teshigi), holes — sichqon teshiklari
export const MAPS = {
  small: { name: 'Choyxona', desc: "9 xona · 1 Tom va 1 Jerry · qozonlar, sandiqlar, so'ri", rooms: 9,
    grid: [['tea_store', 'tea_kitchen', 'tea_garden'], ['tea_vip', 'tea_hall', 'tea_kitchen'], ['tea_garden', 'entry', 'tea_store']],
    noDoor: ['1,0|2,0', '0,1|0,2'] },
  big: { name: 'Katta uy', desc: "12 xona · 1 Tom va 1 Jerry", rooms: 12,
    grid: [['bedroom', 'kids', 'bath', 'laundry'], ['library', 'living', 'dining', 'kitchen'], ['garden', 'entry', 'study', 'storage']],
    noDoor: ['1,0|2,0', '3,0|3,1', '2,2|3,2', '0,1|0,2'],
    holes: { '1,0|2,0': [13], '3,0|3,1': [13], '2,2|3,2': [13], '0,1|0,2': [13], '0,0|0,1': [8], '1,1|2,1': [8], '1,2|2,2': [18], '2,1|3,1': [18], '1,1|1,2': [18], '2,0|2,1': [18] } },
  huge: { name: 'Bank va Ombor', desc: "20 xona · 4 Tom va 6 Jerry · seyflar, shkaflar, ombor javonlari", rooms: 20, team: { tom: 4, jerry: 6 },
    grid: [['bank_vault', 'bank_office', 'warehouse', 'bank_office', 'bank_vault'], ['warehouse', 'bank_hall', 'bank_lounge', 'bank_hall', 'warehouse'],
      ['bank_office', 'warehouse', 'bank_hall', 'warehouse', 'warehouse'], ['warehouse', 'tea_kitchen', 'entry', 'bank_lounge', 'bank_office']],
    noDoor: ['1,0|2,0', '4,0|4,1', '0,2|0,3', '3,2|4,2'] },
};
export let MAP = 'big', COLS = 4, ROWS = 3, SX = 0, SZ = 0, BOUNDS = null, GRID = MAPS.big.grid;
let NO_DOOR = new Set(), HOLES = {};
export function setMap(id) {
  const m = MAPS[id] || MAPS.big; MAP = MAPS[id] ? id : 'big';
  GRID = m.grid; ROWS = GRID.length; COLS = GRID[0].length;
  SX = COLS * (ROOM + WALL) + WALL; SZ = ROWS * (ROOM + WALL) + WALL;
  BOUNDS = { x0: -YARD, z0: -YARD, x1: SX + YARD, z1: SZ + YARD };
  NO_DOOR = new Set(m.noDoor || []);
  if (m.holes) HOLES = m.holes;
  else { // teshiklar: eshiksiz devorda o'rtada, qolganlarida navbatma-navbat chetroqda
    HOLES = {};
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      for (const [c2, r2] of [[c + 1, r], [c, r + 1]]) {
        if (c2 >= COLS || r2 >= ROWS) continue;
        const k = `${c},${r}|${c2},${r2}`;
        if (NO_DOOR.has(k)) HOLES[k] = [13]; else if ((c + r) % 2 === 0) HOLES[k] = [(c * 7 + r * 3) % 2 ? 8 : 18];
      }
    }
  }
}
setMap('big');

export const STYLE = {
  bedroom: { name: 'Yotoqxona', fl: () => TX.carpet('#6f84c4', '#56689f', '#d9c48a'), su: 26, wall: ['#f6dfe6', '#efcfdc', 'floral'], wains: '#f6f1ea', trim: '#ffffff', lamp: '#ffd6a8', map: '#e8a0bd' },
  kids: { name: 'Bolalar xonasi', fl: () => TX.planks('#e2bb86', '#c99a62'), su: 6, wall: ['#fff3b0', '#ffe27a', 'dots'], wains: '#a5d6a7', trim: '#ffffff', lamp: '#fff0c8', map: '#ffe066' },
  bath: { name: 'Hammom', fl: () => TX.tiles('#f5f7fa', '#9cc4e0', 8, true, '#e8eef2'), su: 12, wall: ['#e3f3fb', '#cfe8f5', 'diamonds'], wains: '#ffffff', trim: '#ffffff', lamp: '#eaf6ff', map: '#8ecdf0' },
  laundry: { name: 'Kir yuvish xonasi', fl: () => TX.tiles('#dcd6cc', '#c3baac', 6, false, '#a89f92'), su: 10, wall: ['#e7eef0', '#d6dfe3', 'checks'], wains: null, trim: '#90a4ae', lamp: '#f2f8ff', map: '#b0c4cc' },
  library: { name: 'Kutubxona', fl: () => TX.parquet('#76492a', '#5a371e'), su: 8, wall: ['#4f6b4a', '#45603f', 'damask'], wains: '#4a2f1c', trim: '#3a2414', lamp: '#ffc98a', map: '#7fa86f' },
  living: { name: 'Mehmonxona', fl: () => TX.planks('#b07945', '#8a5730'), su: 6, wall: ['#efe0bf', '#e4d0a4', 'damask'], wains: '#f3ece0', trim: '#ffffff', lamp: '#ffd29a', map: '#e0b878' },
  dining: { name: 'Ovqatlanish xonasi', fl: () => TX.parquet('#b5804c', '#94623a'), su: 8, wall: ['#f3d2b0', '#e9c09a', 'stripes'], wains: '#7a4b2a', trim: '#5c3520', lamp: '#ffd08a', map: '#e7a56f' },
  kitchen: { name: 'Oshxona', fl: () => TX.tiles('#f4f4f4', '#2f3b4a', 6, true, '#d0d0d0'), su: 10, wall: ['#d8efe6', '#c4e5d8', 'diamonds'], wains: null, trim: '#ffffff', lamp: '#fff4e0', map: '#86d0b4' },
  garden: { name: "Qishki bog'", fl: () => TX.stone('#cdbfa5', '#a8987a'), su: 12, wall: ['#eef6e8', '#e1eed8', 'floral'], wains: '#ffffff', trim: '#ffffff', lamp: '#fff8e0', map: '#9ccc65' },
  entry: { name: 'Kirish zali', fl: () => TX.tiles('#efe9df', '#6e5240', 4, true, '#cfc4b4'), su: 10, wall: ['#dfe7f2', '#ccd8e8', 'stripes'], wains: '#ffffff', trim: '#ffffff', lamp: '#ffe6c0', map: '#9fb6d8' },
  study: { name: 'Ish xonasi', fl: () => TX.planks('#5f3e26', '#4a2f1d'), su: 6, wall: ['#c9d6e3', '#b9c9da', 'checks'], wains: '#3c2a1a', trim: '#2b1d10', lamp: '#ffd9a6', map: '#8fa8c8' },
  storage: { name: 'Omborxona', fl: () => TX.concrete(), su: 8, wall: ['#d7cfc0', '#cbc2b1', 'checks'], wains: null, trim: '#8d8170', lamp: '#fff2d0', map: '#b8a888' },
};
Object.assign(STYLE, THEME_STYLE); Object.assign(DESIGNS, THEME_DESIGNS);
// menyu sahnasi va o'yin boshlanadigan xona (har xaritada bor bo'lganini olamiz)
export const pickRoom = (rooms, keys) => { for (const k of keys) { const r = rooms.find(R => R.key === k); if (r) return r; } return rooms[Math.floor(rooms.length / 2)]; };
// tashqi devorlardagi derazalar (xona:tomon)
const WIN = {
  'bedroom:N': [13], 'bedroom:W': [], 'kids:N': [13], 'bath:N': [{ c: 13, sill: 5.6, h: 5 }], 'laundry:N': [], 'laundry:E': [13],
  'library:W': [], 'kitchen:E': [{ c: 13, sill: 6.4, h: 5 }], 'garden:W': [6.5, 19.5], 'garden:S': [6.5, 19.5],
  'entry:S': [{ c: 13, door: true }], 'study:S': [{ c: 13, sill: 5.2 }], 'storage:S': [{ c: 13, sill: 7.6, h: 3.6, w: 6 }], 'storage:E': [{ c: 13, sill: 7.6, h: 3.6, w: 6 }],
};

const roomIndex = (c, r) => r * COLS + c;
const entryRoom = () => ROOMS.find(R => R.key === 'entry') || ROOMS[ROOMS.length - 1];
export const ROOMS = [];

// dunyo koordinatali UV bilan quti
function uvBox(w, h, d, cx, cy, cz, su, sv, vo = 0) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(cx, cy, cz);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > .5) uv.setXY(i, x / su, z / su);
    else if (ax > .5) uv.setXY(i, z / su, (y - vo) / sv);
    else uv.setXY(i, x / su, (y - vo) / sv);
  }
  return g;
}
function uvPlaneY(x0, z0, w, d, y, su, down) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate(x0 + w / 2, y, z0 + d / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / su, p.getZ(i) / su);
  return g;
}

const mats = {};
function wallMat(st) { const k = st.wall.join(); return mats[k] ||= new THREE.MeshStandardMaterial({ map: TX.wallpaper(...st.wall).map, normalMap: TX.wallpaper(...st.wall).normalMap, normalScale: new THREE.Vector2(.5, .5), roughness: .85 }); }
function wainsMat(c) { return mats['w' + c] ||= new THREE.MeshStandardMaterial({ color: c, map: TX.panel('#ffffff').map, normalMap: TX.panel('#ffffff').normalMap, roughness: .55 }); }
const extMat = () => mats.ext ||= new THREE.MeshStandardMaterial({ color: '#efe3cc', map: TX.plaster().map, normalMap: TX.plaster().normalMap, roughness: .9 });

// ---------------- devor bo'lagi ----------------
// axis 'x': devor x bo'ylab, z ∈ [fixed, fixed+WALL]; 'z': z bo'ylab, x ∈ [fixed, fixed+WALL]
// sides[0] — kichik koordinata tomoni, sides[1] — katta tomoni; {room, st, idx} yoki null (tashqi)
function wallPiece(axis, fixed, a0, a1, y0, y1, sides, ends) {
  if (a1 - a0 < .01 || y1 - y0 < .01) return;
  const len = a1 - a0, mid = (a0 + a1) / 2, cy = (y0 + y1) / 2, h = y1 - y0, t = WALL / 2;
  if (axis === 'x') addCol(a0, y0, fixed, a1, y1, fixed + WALL); else addCol(fixed, y0, a0, fixed + WALL, y1, a1);
  for (let s = 0; s < 2; s++) {
    const side = sides[s];
    const off = s === 0 ? fixed + t / 2 : fixed + WALL - t / 2;
    const mat = side ? wallMat(side.st) : extMat();
    const su = side ? 6 : 8;
    const g = axis === 'x' ? uvBox(len, h, t, mid, cy, off, su, su) : uvBox(t, h, len, off, cy, mid, su, su);
    addGeo(g, mat, { room: side ? side.idx : (sides[1 - s] ? sides[1 - s].idx : 0) });
    if (!side) continue;
    // bezaklar: plintus, panel, chiziq, karniz
    const face = s === 0 ? fixed : fixed + WALL, dir = s === 0 ? -1 : 1;
    const trims = [[0, .8, .28, M.paint(side.st.trim, .45)], [WH - .7, WH, .45, M.paint(side.st.trim, .45)]];
    if (side.st.wains) trims.push([.8, 4.2, .1, wainsMat(side.st.wains)], [4.2, 4.55, .32, M.paint(side.st.trim, .45)]);
    for (const [t0, t1, dep, tm] of trims) {
      const yy0 = Math.max(y0, t0), yy1 = Math.min(y1, t1);
      if (yy1 - yy0 < .01) continue;
      const e0 = ends && ends[0] ? dep : 0, e1 = ends && ends[1] ? dep : 0;
      const L2 = len + e0 + e1, m2 = mid + (e1 - e0) / 2, c = face + dir * dep / 2;
      const isPanel = tm.map && t0 === .8;
      const g2 = axis === 'x' ? uvBox(L2, yy1 - yy0, dep, m2, (yy0 + yy1) / 2, c, isPanel ? 4 : 2, isPanel ? 3.4 : 2, isPanel ? .8 : 0)
        : uvBox(dep, yy1 - yy0, L2, c, (yy0 + yy1) / 2, m2, isPanel ? 4 : 2, isPanel ? 3.4 : 2, isPanel ? .8 : 0);
      addGeo(g2, tm, { room: side.idx });
    }
  }
}

// devor segmentini teshiklar bilan bo'lib qurish
function buildSegment(axis, fixed, a0, a1, openings, sides) {
  openings.sort((p, q) => p.c - q.c);
  let cur = a0;
  openings.forEach((o, i) => {
    const s0 = o.c - o.w / 2, s1 = o.c + o.w / 2;
    wallPiece(axis, fixed, cur, s0, 0, WH, sides, [i === 0 && cur === a0, false]);
    if (o.y0 > 0) wallPiece(axis, fixed, s0, s1, 0, o.y0, sides);
    wallPiece(axis, fixed, s0, s1, o.y1, WH, sides);
    decorateOpening(axis, fixed, o, sides);
    cur = s1;
  });
  wallPiece(axis, fixed, cur, a1, 0, WH, sides, [cur === a0, true]);
}

function decorateOpening(axis, fixed, o, sides) {
  const s0 = o.c - o.w / 2, s1 = o.c + o.w / 2;
  for (let s = 0; s < 2; s++) {
    const side = sides[s];
    const face = s === 0 ? fixed : fixed + WALL, dir = s === 0 ? -1 : 1;
    const trimC = side ? side.st.trim : '#ffffff';
    const tm = M.paint(trimC, .45), room = side ? side.idx : (sides[1 - s] ? sides[1 - s].idx : 0);
    const put = (along, y, len, h, dep, mat = tm) => {
      const c = face + dir * dep / 2;
      const g = axis === 'x' ? new THREE.BoxGeometry(len, h, dep) : new THREE.BoxGeometry(dep, h, len);
      if (axis === 'x') g.translate(along, y, c); else g.translate(c, y, along);
      addGeo(g, mat, { room });
    };
    if (o.type === 'door') {
      put(s0 - .3, o.y1 / 2, .6, o.y1, .3); put(s1 + .3, o.y1 / 2, .6, o.y1, .3); put(o.c, o.y1 + .35, o.w + 1.2, .7, .32);
    } else if (o.type === 'hole') {
      const r = o.w / 2 + .12;
      const tor = new THREE.TorusGeometry(r, .14, 8, 20, Math.PI);
      if (axis === 'z') tor.rotateY(Math.PI / 2);
      const c = face + dir * .1;
      if (axis === 'x') tor.translate(o.c, o.y1 - r + .12, c); else tor.translate(c, o.y1 - r + .12, o.c);
      addGeo(tor, M.wood('#6b3e1f', .5), { room });
      put(s0 - .06, (o.y1 - r) / 2, .14, o.y1 - r, .22, M.wood('#6b3e1f', .5)); put(s1 + .06, (o.y1 - r) / 2, .14, o.y1 - r, .22, M.wood('#6b3e1f', .5));
    } else if (o.type === 'window') {
      put(s0 - .3, (o.y0 + o.y1) / 2, .6, o.y1 - o.y0 + 1.2, .25); put(s1 + .3, (o.y0 + o.y1) / 2, .6, o.y1 - o.y0 + 1.2, .25);
      put(o.c, o.y1 + .3, o.w + 1.2, .6, .25); put(o.c, o.y0 - .15, o.w + 1.4, .3, side ? .7 : .4);
      if (s === 0) {
        // oyna romi va shishasi devor o'rtasida
        const mid = fixed + WALL / 2;
        const bar = (al, y, len, h) => { const g = axis === 'x' ? new THREE.BoxGeometry(len, h, .14) : new THREE.BoxGeometry(.14, h, len); if (axis === 'x') g.translate(al, y, mid); else g.translate(mid, y, al); addGeo(g, M.paint('#ffffff', .4), { room }); };
        bar(o.c, (o.y0 + o.y1) / 2, .16, o.y1 - o.y0); bar(o.c, (o.y0 + o.y1) / 2, o.w, .16);
        const gl = axis === 'x' ? new THREE.PlaneGeometry(o.w, o.y1 - o.y0) : new THREE.PlaneGeometry(o.w, o.y1 - o.y0).rotateY(Math.PI / 2);
        if (axis === 'x') gl.translate(o.c, (o.y0 + o.y1) / 2, mid); else gl.translate(mid, (o.y0 + o.y1) / 2, o.c);
        addGeo(gl, M.glass(), { room, cast: false, receive: false });
      }
      if (side && o.curtain !== false) {
        // pardalar
        for (const k of [-1, 1]) {
          const cw = 1.6, ch = o.y1 - o.y0 + 2.2;
          const g = new THREE.PlaneGeometry(cw, ch, 10, 1);
          const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 7) * .18);
          g.computeVertexNormals();
          const al = k < 0 ? s0 - cw / 2 + .3 : s1 + cw / 2 - .3, y = (o.y0 + o.y1) / 2 - .3, c = face + dir * .55;
          if (axis === 'z') g.rotateY(Math.PI / 2);
          if (axis === 'x') g.translate(al, y, c); else g.translate(c, y, al);
          addGeo(g, M.leaf(side.st.curtain || side.st.map), { room });
        }
        const rod = axis === 'x' ? new THREE.BoxGeometry(o.w + 4, .14, .14) : new THREE.BoxGeometry(.14, .14, o.w + 4);
        if (axis === 'x') rod.translate(o.c, o.y1 + 1, face + dir * .55); else rod.translate(face + dir * .55, o.y1 + 1, o.c);
        addGeo(rod, M.metal('#b08d57', .3), { room });
      }
      if (o.sunlit && side) gfx.shafts.push({ axis, face, dir, o });
    }
  }
}

// ---------------- quyosh nurlari (derazalardan tushadigan) ----------------
function buildShafts(scene) {
  const d = gfx.sunDir.clone().negate();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { op: { value: .07 } },
    vertexShader: `attribute float f; varying float vF; varying vec3 vN; varying vec3 vV;
      void main(){ vF = f; vec4 wp = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float op; varying float vF; varying vec3 vN; varying vec3 vV;
      void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.4); float a = op * pow(1. - vF, 1.6) * e; gl_FragColor = vec4(vec3(1., .93, .78) * a, a); }`,
  });
  for (const S of gfx.shafts) {
    const { axis, face, o } = S;
    const pos = [], fa = [], idx = [];
    const corner = (al, y) => axis === 'x' ? new THREE.Vector3(al, y, face) : new THREE.Vector3(face, y, al);
    const q = [corner(o.c - o.w / 2, o.y0), corner(o.c + o.w / 2, o.y0), corner(o.c + o.w / 2, o.y1), corner(o.c - o.w / 2, o.y1)];
    const L = 22;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4], a2 = a.clone().addScaledVector(d, L), b2 = b.clone().addScaledVector(d, L);
      const base = pos.length / 3;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, b2.x, b2.y, b2.z, a2.x, a2.y, a2.z);
      fa.push(0, 0, 1, 1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('f', new THREE.Float32BufferAttribute(fa, 1));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.renderOrder = 5;
    scene.add(m);
  }
}

// ---------------- tashqi hovli ----------------
function buildOutside(scene) {
  const gt = TX.grass();
  gt.map.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: gt.map, roughness: 1, color: '#9ccc65' }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(SX / 2, -.05, SZ / 2); ground.receiveShadow = true;
  scene.add(ground);
  const r = TX.rng(42);
  const trunk = M.wood('#6b4a2a', .9);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, dist = 75 + r() * 110;
    const x = SX / 2 + Math.cos(a) * dist, z = SZ / 2 + Math.sin(a) * dist * .8;
    const F = frame(x, z, 0); B.room = 99;
    const s = 1.5 + r() * 2.2;
    F.cyl(.6 * s, .9 * s, 8 * s, trunk, 0, 0, 0, 8, { cast: false });
    const leaf = M.leaf(['#2e7d32', '#388e3c', '#43a047', '#558b2f'][i % 4]);
    for (let k = 0; k < 4; k++) F.sph(4 * s - k * .5 * s, leaf, (r() - .5) * 3 * s, 9 * s + k * 2.4 * s, (r() - .5) * 3 * s, 1, .85, 1, { cast: false });
  }
  // yo'lak va to'siq
  B.room = 99;
  const F = frame(0, 0, 0);
  F.box(10, .1, 50, M.tex('path', TX.stone('#c8bba5', '#a89a80'), { roughness: .9 }), entryRoom().ox + 13, 0, SZ + 25, { cast: false });
  // hovli to'sig'i (undan o'tib bo'lmaydi)
  const { x0: X0, z0: Z0, x1: X1, z1: Z1 } = BOUNDS, fm = M.paint('#ffffff', .6);
  for (let x = X0; x <= X1; x += 4) { F.box(.4, 3.4, .4, fm, x, 0, Z0, { cast: false }); F.box(.4, 3.4, .4, fm, x, 0, Z1, { cast: false }); }
  for (let z = Z0; z <= Z1; z += 4) { F.box(.4, 3.4, .4, fm, X0, 0, z, { cast: false }); F.box(.4, 3.4, .4, fm, X1, 0, z, { cast: false }); }
  for (const y of [1.2, 2.6]) {
    F.box(X1 - X0, .3, .2, fm, (X0 + X1) / 2, y, Z0, { cast: false }); F.box(X1 - X0, .3, .2, fm, (X0 + X1) / 2, y, Z1, { cast: false });
    F.box(.2, .3, Z1 - Z0, fm, X0, y, (Z0 + Z1) / 2, { cast: false }); F.box(.2, .3, Z1 - Z0, fm, X1, y, (Z0 + Z1) / 2, { cast: false });
  }
  addCol(X0 - 1, 0, Z0 - 1, X1 + 1, 6, Z0 + .3); addCol(X0 - 1, 0, Z1 - .3, X1 + 1, 6, Z1 + 1);
  addCol(X0 - 1, 0, Z0, X0 + .3, 6, Z1); addCol(X1 - .3, 0, Z0, X1 + 1, 6, Z1);
  // butalar va gullar (to'siqqa yaqin)
  for (let i = 0; i < 40; i++) {
    const side = i % 4, t = r();
    const x = side < 2 ? BOUNDS.x0 + 3 + t * (BOUNDS.x1 - BOUNDS.x0 - 6) : (side === 2 ? BOUNDS.x0 + 2.5 : BOUNDS.x1 - 2.5);
    const z = side >= 2 ? BOUNDS.z0 + 3 + t * (BOUNDS.z1 - BOUNDS.z0 - 6) : (side === 0 ? BOUNDS.z0 + 2.5 : BOUNDS.z1 - 2.5);
    const s2 = 1.4 + r() * 1.2;
    F.sph(s2, M.leaf(['#2e7d32', '#43a047', '#388e3c'][i % 3]), x, s2 * .7, z, 1, .8, 1, { cast: false });
    addCol(x - s2 * .8, 0, z - s2 * .8, x + s2 * .8, s2 * 1.4, z + s2 * .8, 'bush');
  }
  // tom
  F.box(SX + 4, .6, SZ + 4, extMat(), SX / 2, WH, SZ / 2, { receive: false });
  const roofMat = M.paint('#9a3b2a', .8);
  const roof = new THREE.CylinderGeometry(.01, (SZ + 10) / 1.4, 18, 4, 1);
  roof.rotateY(Math.PI / 4); roof.scale(1.42 * (SX + 10) / (SZ + 10), 1, 1);
  roof.translate(SX / 2, WH + .6 + 9, SZ / 2);
  addGeo(roof, roofMat, { room: 99, receive: false });
}

// ---------------- asosiy qurilish ----------------
export function buildHouse(scene) {
  resetBuilder(scene);
  gfx.lamps.length = 0; gfx.shafts = [];
  ROOMS.length = 0;
  const seen = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const key = GRID[r][c], [ox, oz] = origin(c, r), n = seen[key] = (seen[key] || 0) + 1;
    ROOMS.push({ key, idx: roomIndex(c, r), c, r, ox, oz, st: STYLE[key], name: STYLE[key].name + (n > 1 ? ' ' + n : '') });
  }
  const sideOf = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? null : ROOMS[roomIndex(c, r)];

  // pastki taxta (eshik ostonalari)
  B.room = 98;
  addGeo(uvBox(SX, .4, SZ, SX / 2, -.2, SZ / 2, 8, 8), M.wood('#5a3a22', .5), { room: 98, cast: false });

  // vertikal devorlar (z bo'ylab), x = c*(ROOM+WALL)
  for (let c = 0; c <= COLS; c++) for (let r = 0; r < ROWS; r++) {
    const fixed = c * (ROOM + WALL), z0 = origin(0, r)[1];
    const L = sideOf(c - 1, r), Rr = sideOf(c, r);
    const ops = [];
    if (L && Rr) {
      const key = `${c - 1},${r}|${c},${r}`;
      if (!NO_DOOR.has(key)) ops.push({ type: 'door', c: z0 + 13, w: DOOR_W, y0: 0, y1: DOOR_H });
      for (const off of HOLES[key] || []) ops.push({ type: 'hole', c: z0 + off, w: HOLE_W, y0: 0, y1: HOLE_H });
    } else {
      const room = L || Rr, side = L ? 'E' : 'W';
      for (const wdef of WIN[room.key + ':' + side] ?? [13]) {
        const w = typeof wdef === 'number' ? { c: wdef } : wdef;
        if (w.door) { ops.push({ type: 'door', c: z0 + w.c, w: DOOR_W, y0: 0, y1: DOOR_H }); continue; }
        ops.push({ type: 'window', c: z0 + w.c, w: w.w || 8, y0: w.sill || 4.2, y1: (w.sill || 4.2) + (w.h || 6.8), sunlit: side === 'W' });
      }
    }
    B.room = (L || Rr).idx;
    buildSegment('z', fixed, z0, z0 + ROOM, ops, [L ? { st: L.st, idx: L.idx } : null, Rr ? { st: Rr.st, idx: Rr.idx } : null]);
  }
  // gorizontal devorlar (x bo'ylab), z = r*(ROOM+WALL)
  for (let r = 0; r <= ROWS; r++) for (let c = 0; c < COLS; c++) {
    const fixed = r * (ROOM + WALL), x0 = origin(c, 0)[0];
    const T = sideOf(c, r - 1), Bt = sideOf(c, r);
    const ops = [];
    if (T && Bt) {
      const key = `${c},${r - 1}|${c},${r}`;
      if (!NO_DOOR.has(key)) ops.push({ type: 'door', c: x0 + 13, w: DOOR_W, y0: 0, y1: DOOR_H });
      for (const off of HOLES[key] || []) ops.push({ type: 'hole', c: x0 + off, w: HOLE_W, y0: 0, y1: HOLE_H });
    } else {
      const room = T || Bt, side = T ? 'S' : 'N';
      for (const wdef of WIN[room.key + ':' + side] ?? [13]) {
        const w = typeof wdef === 'number' ? { c: wdef } : wdef;
        if (w.door) { ops.push({ type: 'door', c: x0 + w.c, w: DOOR_W, y0: 0, y1: DOOR_H }); continue; }
        ops.push({ type: 'window', c: x0 + w.c, w: w.w || 8, y0: w.sill || 4.2, y1: (w.sill || 4.2) + (w.h || 6.8), sunlit: side === 'S' });
      }
    }
    B.room = (T || Bt).idx;
    buildSegment('x', fixed, x0, x0 + ROOM, ops, [T ? { st: T.st, idx: T.idx } : null, Bt ? { st: Bt.st, idx: Bt.idx } : null]);
  }
  // burchak ustunlari
  for (let c = 0; c <= COLS; c++) for (let r = 0; r <= ROWS; r++) {
    const x = c * (ROOM + WALL), z = r * (ROOM + WALL);
    addCol(x, 0, z, x + WALL, WH, z + WALL);
    addGeo(uvBox(WALL, WH, WALL, x + .5, WH / 2, z + .5, 8, 8), extMat(), { room: 98 });
  }

  // xonalar: pol, shift, chiroq, jihozlar
  for (const R of ROOMS) {
    B.room = R.idx;
    const fl = R.st.fl();
    const fm = new THREE.MeshStandardMaterial({ map: fl.map, normalMap: fl.normalMap, normalScale: new THREE.Vector2(.6, .6), roughness: R.key === 'kitchen' || R.key === 'bath' || R.key === 'entry' ? .18 : R.st.su === 26 ? .95 : .42 });
    addGeo(uvPlaneY(R.ox, R.oz, ROOM, ROOM, .01, R.st.su), fm, { room: R.idx, cast: false });
    addGeo(uvPlaneY(R.ox, R.oz, ROOM, ROOM, WH, 8, true), M.tex('ceil', TX.plaster(), { roughness: .95, color: '#fbf7f0' }), { room: R.idx, cast: false });
    // osma chiroq
    const L = frame(R.ox + 13, R.oz + 13, 0);
    L.cyl(.05, .05, 2.6, M.paint('#222'), 0, WH - 2.6, 0, 6);
    L.lathe([[.15, 0], [1.9, -1.1], [2.0, -1.3], [.2, -1.3]].map(p => [p[0], p[1] + 1.3]), M.metal(R.key === 'dining' ? '#d4af37' : '#ffffff', .35), 0, WH - 3.9, 0, 32, { cast: false });
    L.sph(.55, M.em(R.st.lamp, 4), 0, WH - 3.8, 0, 1, 1, 1, { cast: false });
    L.lamp(0, WH - 4.4, 0, R.st.lamp, R.key === 'living' ? 90 : 75, 36);
    R.painting = (side, off, y, w, h, seed) => {
      const P = side === 'N' ? frame(R.ox + off, R.oz + .02, 0, y) : side === 'S' ? frame(R.ox + off, R.oz + ROOM - .02, 2, y)
        : side === 'W' ? frame(R.ox + .02, R.oz + off, 1, y) : frame(R.ox + ROOM - .02, R.oz + off, 3, y);
      FN.paintingOnWall(P, w, h, seed);
    };
    R.f = (x, z, rot = 0, y = 0) => frame(R.ox + x, R.oz + z, rot, y);
    DESIGNS[R.key](R);
  }
  buildOutside(scene);
  finalize();
  buildShafts(scene);
  return makeWorld();
}

// ---------------- fazoviy xesh va so'rovlar ----------------
const CELL = 4;
function makeWorld() {
  const cols = B.colliders;
  const OX = BOUNDS.x0 - 2, OZ = BOUNDS.z0 - 2;
  const nx = Math.ceil((BOUNDS.x1 - OX + 2) / CELL), nz = Math.ceil((BOUNDS.z1 - OZ + 2) / CELL);
  const cells = Array.from({ length: nx * nz }, () => []);
  cols.forEach((b, i) => {
    const x0 = Math.max(0, Math.floor((b.minX - OX) / CELL)), x1 = Math.min(nx - 1, Math.floor((b.maxX - OX) / CELL));
    const z0 = Math.max(0, Math.floor((b.minZ - OZ) / CELL)), z1 = Math.min(nz - 1, Math.floor((b.maxZ - OZ) / CELL));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) cells[z * nx + x].push(i);
  });
  let stamp = 1;
  const marks = new Uint32Array(cols.length);
  const out = [];
  const W = {
    colliders: cols, tops: B.tops, hides: B.hides, rooms: ROOMS, anim: B.anim, size: [SX, SZ],
    query(minX, minZ, maxX, maxZ) {
      out.length = 0; stamp++;
      const x0 = Math.max(0, Math.floor((minX - OX) / CELL)), x1 = Math.min(nx - 1, Math.floor((maxX - OX) / CELL));
      const z0 = Math.max(0, Math.floor((minZ - OZ) / CELL)), z1 = Math.min(nz - 1, Math.floor((maxZ - OZ) / CELL));
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (const i of cells[z * nx + x]) if (marks[i] !== stamp) { marks[i] = stamp; out.push(cols[i]); }
      return out;
    },
    pointBlocked(x, y, z, pad = 0) {
      for (const b of W.query(x - pad, z - pad, x + pad, z + pad)) if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad && y > b.minY - pad && y < b.maxY + pad) return true;
      return y > WH - .3 || y < 0;
    },
    // ko'rish chizig'i to'silganmi
    lineBlocked(ax, ay, az, bx, by, bz) {
      const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz), n = Math.ceil(L / .45);
      for (let i = 1; i < n; i++) { const t = i / n; if (W.pointBlocked(ax + dx * t, ay + dy * t, az + dz * t)) return true; }
      return false;
    },
    roomAt(x, z) {
      const c = Math.floor(x / (ROOM + WALL)), r = Math.floor(z / (ROOM + WALL));
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
      return ROOMS[r * COLS + c];
    },
  };
  return W;
}
