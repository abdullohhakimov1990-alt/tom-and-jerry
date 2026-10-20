// O'yin buyumlari: sir (pishloq), banan, tuzoq, yo'l ko'rsatkich nuqtalar, yashirinish nuri, "puf" effekti.
import * as THREE from 'three';
import * as TX from './textures.js';
import { gfx } from './gfx.js';

// ---------------- sirlar (instanced) ----------------
export function makeCheeseField(points, n) {
  const geo = new THREE.CylinderGeometry(.42, .42, .32, 3, 1); geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffcf2e', emissive: '#ffb300', emissiveIntensity: .55, roughness: .4 });
  const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.frustumCulled = false;
  gfx.scene.add(im);
  const glowMat = new THREE.SpriteMaterial({ map: TX.softDot(), color: '#ffe27a', transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending });
  const items = [];
  const used = new Set();
  const pick = () => { for (let k = 0; k < 50; k++) { const i = Math.floor(Math.random() * points.length); if (!used.has(i)) { used.add(i); return i; } } return Math.floor(Math.random() * points.length); };
  for (let i = 0; i < n; i++) {
    const pi = pick(), p = points[pi];
    const s = new THREE.Sprite(glowMat); s.scale.setScalar(1.4); gfx.scene.add(s);
    items.push({ pi, p: p.clone(), on: true, respawn: 0, ph: Math.random() * 6, sprite: s });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  return {
    items,
    update(dt, t) {
      for (let i = 0; i < n; i++) {
        const it = items[i];
        if (!it.on) {
          it.respawn -= dt;
          if (it.respawn <= 0) { used.delete(it.pi); it.pi = pick(); it.p.copy(points[it.pi]); it.on = true; }
        }
        e.set(.3, t * 2 + it.ph, 0); q.setFromEuler(e);
        pos.set(it.p.x, it.p.y + .55 + Math.sin(t * 3 + it.ph) * .12, it.p.z);
        sc.setScalar(it.on ? 1 : 0);
        m4.compose(pos, q, sc); im.setMatrixAt(i, m4);
        it.sprite.visible = it.on; it.sprite.position.copy(pos);
      }
      im.instanceMatrix.needsUpdate = true;
    },
    take(it) { it.on = false; it.respawn = 18 + Math.random() * 10; },
    dispose() { gfx.scene.remove(im); items.forEach(it => gfx.scene.remove(it.sprite)); geo.dispose(); },
  };
}

export function makeBanana() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#ffe135', roughness: .5 });
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), m); p.scale.set(.45, .12, 1.4);
    p.position.set(Math.sin(i * Math.PI / 2) * .38, .06, Math.cos(i * Math.PI / 2) * .38); p.rotation.y = i * Math.PI / 2; g.add(p);
  }
  const c = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#8d6e3f' })); c.position.y = .12; g.add(c);
  g.traverse(o => o.castShadow = true);
  return g;
}
export function makeTrap() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, .12, 2), new THREE.MeshStandardMaterial({ color: '#c8955a', roughness: .7 })); b.position.y = .06; g.add(b);
  const wire = new THREE.MeshStandardMaterial({ color: '#cfd8dc', metalness: 1, roughness: .3 });
  const bar = new THREE.Mesh(new THREE.TorusGeometry(.5, .04, 6, 16, Math.PI), wire); bar.position.set(0, .14, .2); bar.rotation.x = -Math.PI / 2; g.add(bar);
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .16, 3), new THREE.MeshStandardMaterial({ color: '#ffcf2e', emissive: '#7a5a00', emissiveIntensity: .4 })); ch.position.set(0, .2, -.5); g.add(ch);
  g.traverse(o => o.castShadow = true);
  return g;
}

// ---------------- yo'l ko'rsatkich (yashil nuqtalar) ----------------
export function makeGuide() {
  const N = 60;
  const geo = new THREE.SphereGeometry(.14, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: '#46ff7e', transparent: true, opacity: .9 });
  const im = new THREE.InstancedMesh(geo, mat, N); im.frustumCulled = false; im.count = 0;
  gfx.scene.add(im);
  const beamMat = new THREE.MeshBasicMaterial({ map: TX.beamGradient(), color: '#5dff8f', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Group();
  for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 12), beamMat); p.position.y = 6; p.rotation.y = i * Math.PI / 2; p.rotation.z = Math.PI; beam.add(p); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.35, 32), new THREE.MeshBasicMaterial({ color: '#5dff8f', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .06; beam.add(ring);
  beam.visible = false; gfx.scene.add(beam);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  let pts = [];
  return {
    set(path, spot, color) {
      pts = [];
      if (color) { mat.color.set(color); beamMat.color.set(color); ring.material.color.set(color); }
      if (path) for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
        for (let s = i === 0 ? .8 : 0; s < L; s += .9) pts.push([a.x + (b.x - a.x) * s / L, a.z + (b.z - a.z) * s / L]);
        if (pts.length >= N) break;
      }
      beam.visible = !!spot;
      if (spot) beam.position.set(spot.x, 0, spot.z);
    },
    update(t) {
      im.count = Math.min(N, pts.length);
      for (let i = 0; i < im.count; i++) { const s = .7 + .5 * Math.max(0, Math.sin(t * 8 - i * .5)); m4.makeScale(s, s, s); m4.setPosition(v.set(pts[i][0], .25, pts[i][1])); im.setMatrixAt(i, m4); }
      im.instanceMatrix.needsUpdate = true;
      ring.scale.setScalar(1 + Math.sin(t * 5) * .08);
    },
    clear() { pts = []; im.count = 0; beam.visible = false; },
    dispose() { gfx.scene.remove(im); gfx.scene.remove(beam); },
  };
}

// ---------------- "puf" bulut effekti ----------------
const puffs = [];
export function poof(pos, color = '#ffffff', n = 14, size = 1) {
  const mat = new THREE.SpriteMaterial({ map: TX.softDot(), color, transparent: true, opacity: .9, depthWrite: false });
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(mat.clone()); s.position.copy(pos); s.scale.setScalar(.6 * size);
    const a = Math.random() * 6.28, u = Math.random();
    s.userData.v = new THREE.Vector3(Math.cos(a) * (2 + u * 3) * size, (1 + Math.random() * 3) * size, Math.sin(a) * (2 + u * 3) * size);
    s.userData.life = .7 + Math.random() * .4; s.userData.t = 0;
    gfx.scene.add(s); puffs.push(s);
  }
}
export function updatePuffs(dt) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const s = puffs[i], u = s.userData; u.t += dt;
    s.position.addScaledVector(u.v, dt); u.v.multiplyScalar(1 - dt * 3);
    const k = u.t / u.life; s.material.opacity = .9 * (1 - k); s.scale.setScalar((.6 + k * 1.6) * (s.userData.size || 1));
    if (k >= 1) { gfx.scene.remove(s); s.material.dispose(); puffs.splice(i, 1); }
  }
}

// ---------------- qalqon pufagi ----------------
export function makeBubble(r) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#7fd3ff', transparent: true, opacity: .22, roughness: 0, clearcoat: 1, iridescence: 1, depthWrite: false, emissive: '#1a6aa0', emissiveIntensity: .4 }));
  m.visible = false;
  return m;
}
