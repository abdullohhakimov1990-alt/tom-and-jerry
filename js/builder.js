// Uy qurilishi uchun umumiy vositalar: geometriyalarni birlashtirish, to'qnashuv qutilari, materiallar.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import { gfx } from './gfx.js';

export const B = { buckets: new Map(), colliders: [], tops: [], hides: [], scene: null, dyn: [], anim: [], room: 0 };

export function resetBuilder(scene) {
  B.buckets.clear(); B.colliders = []; B.tops = []; B.hides = []; B.dyn = []; B.anim = []; B.scene = scene;
}

function prep(geo) {
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.index) { const n = geo.attributes.position.count, idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; geo.setIndex(new THREE.BufferAttribute(idx, 1)); }
  return geo;
}
export function addGeo(geo, mat, opt = {}) {
  let cast = opt.cast !== false; const recv = opt.receive !== false;
  // mayda detallar soya tashlamaydi (tezlik uchun)
  if (cast && !opt.forceCast) { geo.computeBoundingBox(); const b = geo.boundingBox; if (b.max.x - b.min.x < .9 && b.max.y - b.min.y < .9 && b.max.z - b.min.z < .9) cast = false; }
  const key = mat.uuid + (cast ? 'c' : '') + (recv ? 'r' : '') + '|' + (opt.room ?? B.room);
  let b = B.buckets.get(key);
  if (!b) { b = { mat, geos: [], cast, recv }; B.buckets.set(key, b); }
  b.geos.push(prep(geo));
}
export function addCol(x0, y0, z0, x1, y1, z1, tag) {
  B.colliders.push({ minX: Math.min(x0, x1), minY: Math.min(y0, y1), minZ: Math.min(z0, z1), maxX: Math.max(x0, x1), maxY: Math.max(y0, y1), maxZ: Math.max(z0, z1), tag });
}
export function finalize() {
  for (const b of B.buckets.values()) {
    // indekslar Uint32 bo'lishi uchun
    for (const g of b.geos) if (!(g.index.array instanceof Uint32Array)) g.setIndex(new THREE.BufferAttribute(new Uint32Array(g.index.array), 1));
    const merged = mergeGeometries(b.geos, false);
    if (!merged) { console.warn('merge failed', b.mat); continue; }
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
    mesh.matrixAutoUpdate = false;
    B.scene.add(mesh);
    for (const g of b.geos) g.dispose();
  }
  B.buckets.clear();
}

// ---------------- materiallar ----------------
const mc = new Map();
const once = (k, f) => { if (!mc.has(k)) mc.set(k, f()); return mc.get(k); };
const v2 = s => new THREE.Vector2(s, s);
export const M = {
  wood: (c = '#8a5a33', r = .5) => once('w' + c + r, () => { const t = TX.woodGrain(); return new THREE.MeshStandardMaterial({ color: c, roughness: r, map: t.map, normalMap: t.normalMap, normalScale: v2(.35) }); }),
  fab: (c) => once('f' + c, () => { const t = TX.fabric(); return new THREE.MeshStandardMaterial({ color: c, roughness: .96, map: t.map, normalMap: t.normalMap, normalScale: v2(.6) }); }),
  velvet: (c) => once('v' + c, () => { const t = TX.fabric(); return new THREE.MeshStandardMaterial({ color: c, roughness: .82, map: t.map, normalMap: t.normalMap, normalScale: v2(.5) }); }),
  lea: (c) => once('l' + c, () => { const t = TX.leather(); return new THREE.MeshStandardMaterial({ color: c, roughness: .45, map: t.map, normalMap: t.normalMap, normalScale: v2(.4) }); }),
  paint: (c, r = .6) => once('p' + c + r, () => new THREE.MeshStandardMaterial({ color: c, roughness: r })),
  metal: (c = '#c3c7cc', r = .3) => once('m' + c + r, () => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 })),
  cer: (c = '#ffffff') => once('c' + c, () => new THREE.MeshStandardMaterial({ color: c, roughness: .14 })),
  plastic: (c) => once('pl' + c, () => new THREE.MeshStandardMaterial({ color: c, roughness: .3 })),
  marble: (c) => once('mb' + c, () => new THREE.MeshStandardMaterial({ color: '#ffffff', map: TX.marble(c).map, roughness: .12 })),
  glass: () => once('glass', () => new THREE.MeshPhysicalMaterial({ color: '#e8f6ff', roughness: .02, transparent: true, opacity: .16, envMapIntensity: 1.6, depthWrite: false })),
  em: (c, i = 2) => once('e' + c + i, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: .5 })),
  leaf: (c) => once('lf' + c, () => new THREE.MeshStandardMaterial({ color: c, roughness: .6, side: THREE.DoubleSide })),
  tex: (key, t, extra = {}) => once('t' + key, () => new THREE.MeshStandardMaterial(Object.assign({ map: t.map, normalMap: t.normalMap || null, roughness: .7 }, extra))),
};

// ---------------- lokal koordinata ramkasi ----------------
// ox,oz — dunyo koordinatasi; rot — chorak burilishlar (0: oldi +z ga qaragan)
export function frame(ox, oz, rot = 0, oy = 0) {
  const th = rot * Math.PI / 2, cs = Math.round(Math.cos(th)), sn = Math.round(Math.sin(th));
  const m = new THREE.Matrix4().makeRotationY(th); m.setPosition(ox, oy, oz);
  const tr = (x, z) => [ox + x * cs + z * sn, oz - x * sn + z * cs];
  const room = B.room;
  const F = {
    m, tr, rot, th,
    add(geo, mat, opt = {}) {
      if (opt.rx) geo.rotateX(opt.rx); if (opt.rz) geo.rotateZ(opt.rz); if (opt.ry) geo.rotateY(opt.ry);
      if (opt.at) geo.translate(opt.at[0], opt.at[1], opt.at[2]);
      geo.applyMatrix4(m); addGeo(geo, mat, Object.assign({ room }, opt)); return F;
    },
    box(w, h, d, mat, x = 0, y = 0, z = 0, opt = {}) {
      const g = new THREE.BoxGeometry(w, h, d);
      return F.add(g, mat, Object.assign({}, opt, { at: [x, y + h / 2, z] }));
    },
    rbox(w, h, d, r, mat, x = 0, y = 0, z = 0, opt = {}) {
      const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
      return F.add(g, mat, Object.assign({}, opt, { at: [x, y + h / 2, z] }));
    },
    cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 14, opt = {}) {
      const g = new THREE.CylinderGeometry(rt, rb, h, Math.min(seg, 16), 1, !!opt.open);
      if (opt.rx || opt.rz) { g.translate(0, 0, 0); return F.add(g, mat, Object.assign({}, opt, { at: [x, y, z] })); }
      return F.add(g, mat, Object.assign({}, opt, { at: [x, y + h / 2, z] }));
    },
    sph(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, opt = {}) {
      const g = new THREE.SphereGeometry(r, 14, 10); g.scale(sx, sy, sz);
      return F.add(g, mat, Object.assign({}, opt, { at: [x, y, z] }));
    },
    lathe(pts, mat, x = 0, y = 0, z = 0, seg = 18, opt = {}) {
      const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
      return F.add(g, mat, Object.assign({}, opt, { at: [x, y, z] }));
    },
    torus(R, r, mat, x = 0, y = 0, z = 0, opt = {}) {
      const g = new THREE.TorusGeometry(R, r, 8, 24, opt.arc || Math.PI * 2);
      return F.add(g, mat, Object.assign({}, opt, { at: [x, y, z] }));
    },
    plane(w, h, mat, x = 0, y = 0, z = 0, opt = {}) {
      const g = new THREE.PlaneGeometry(w, h);
      return F.add(g, mat, Object.assign({ cast: false }, opt, { at: [x, y, z] }));
    },
    col(w, h, d, x = 0, y = 0, z = 0, tag) {
      const [cx, cz] = tr(x, z);
      const hw = (rot % 2 ? d : w) / 2, hd = (rot % 2 ? w : d) / 2;
      addCol(cx - hw, oy + y, cz - hd, cx + hw, oy + y + h, cz + hd, tag);
      return F;
    },
    top(x, y, z) { const [cx, cz] = tr(x, z); B.tops.push(new THREE.Vector3(cx, oy + y, cz)); return F; },
    lamp(x, y, z, color = '#ffd29a', intensity = 60, dist = 30, flicker = false) {
      const [cx, cz] = tr(x, z);
      gfx.lamps.push({ pos: new THREE.Vector3(cx, oy + y, cz), color, intensity, dist, flicker });
      return F;
    },
    dyn(obj, x = 0, y = 0, z = 0, ry = 0) {
      const [cx, cz] = tr(x, z);
      obj.position.set(cx, oy + y, cz); obj.rotation.y = th + ry;
      obj.traverse(o => { if (o.isMesh) { o.castShadow = o.userData.noShadow ? false : true; o.receiveShadow = true; } });
      B.scene.add(obj); B.dyn.push(obj);
      return obj;
    },
    sub(x, z, r = 0, y = 0) { const [cx, cz] = tr(x, z); return frame(cx, cz, (rot + r) % 4, oy + y); },
  };
  return F;
}

// guruhning bevosita mesh bolalarini material bo'yicha bitta mesh'ga birlashtirish (draw call kamayadi)
export function mergeChildren(group, recursive = true) {
  const byMat = new Map();
  for (const c of group.children.slice()) {
    if (recursive && !c.isMesh && c.children.length) mergeChildren(c, true);
    if (!c.isMesh || c.userData.keep || c.children.length) continue;
    const k = c.material.uuid + (c.castShadow ? 'c' : '');
    if (!byMat.has(k)) byMat.set(k, []);
    byMat.get(k).push(c);
  }
  for (const list of byMat.values()) {
    if (list.length < 2) continue;
    const geos = list.map(mh => { mh.updateMatrix(); const g = mh.geometry.clone().applyMatrix4(mh.matrix); return prep(g); });
    for (const g of geos) if (!(g.index.array instanceof Uint32Array)) g.setIndex(new THREE.BufferAttribute(new Uint32Array(g.index.array), 1));
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow; m.receiveShadow = true; m.userData = Object.assign({}, list[0].userData);
    for (const mh of list) { group.remove(mh); mh.geometry.dispose(); }
    for (const g of geos) g.dispose();
    group.add(m);
  }
}
