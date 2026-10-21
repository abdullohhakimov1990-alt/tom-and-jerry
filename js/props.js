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

// ---------------- bomba (Jerry qobiliyati) ----------------
export function makeBomb() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#1b1c22', roughness: .35, metalness: .3, clearcoat: 1 }));
  body.position.y = .42; g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .14, 12), new THREE.MeshStandardMaterial({ color: '#8a8f99', metalness: .9, roughness: .3 }));
  cap.position.y = .86; g.add(cap);
  const fuse = new THREE.Mesh(new THREE.TorusGeometry(.18, .03, 6, 12, Math.PI * .8), new THREE.MeshStandardMaterial({ color: '#c9a36a', roughness: .9 }));
  fuse.position.set(.16, .93, 0); fuse.rotation.z = Math.PI * .1; g.add(fuse);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .5 }));
  shine.position.set(-.18, .62, .26); g.add(shine);
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: '#ffb02e', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  spark.position.set(.33, 1.0, 0); spark.scale.setScalar(.5); g.add(spark);
  g.userData.spark = spark; g.userData.body = body;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function tickBomb(m, t) {
  const s = m.userData.spark; s.scale.setScalar(.35 + Math.random() * .35); s.material.color.setHSL(.08 + Math.random() * .05, 1, .55 + Math.random() * .2);
  m.userData.body.scale.setScalar(1 + Math.max(0, Math.sin(t * 9)) * .05);
}
// portlash: olov + tutun + uchqunlar
export function boom(pos) {
  const p = pos.clone(); p.y += .6;
  poof(p, '#ffb22e', 18, 1.7); poof(p, '#ff5a1f', 12, 1.3); poof(p.clone().setY(p.y + .5), '#4a4a4a', 16, 1.8); poof(p, '#fff3b0', 8, .9);
}
// boshi atrofida aylanib uchadigan qushchalar (hushsiz Tom)
export function makeBirds() {
  const g = new THREE.Group(), birds = [];
  const body = new THREE.MeshStandardMaterial({ color: '#ffd52e', roughness: .5 }), beakM = new THREE.MeshStandardMaterial({ color: '#ff8a00' }), eyeM = new THREE.MeshBasicMaterial({ color: '#111' });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group();
    const bd = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), body); bd.scale.set(1, .9, 1.2); b.add(bd);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), body); hd.position.set(0, .12, .16); b.add(hd);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(.045, .12, 6), beakM); bk.rotation.x = Math.PI / 2; bk.position.set(0, .11, .3); b.add(bk);
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), eyeM); e.position.set(s * .06, .17, .26); b.add(e);
      const w = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), body); w.scale.set(1.3, .25, .8); w.position.set(s * .17, .03, 0); b.add(w); b.userData['w' + s] = w;
    }
    g.add(b); birds.push(b);
  }
  g.userData.birds = birds; g.visible = false;
  return g;
}
export function updateBirds(g, t) {
  g.userData.birds.forEach((b, i) => {
    const a = t * 3.2 + i * Math.PI * 2 / 3;
    b.position.set(Math.cos(a) * .85, Math.sin(t * 6 + i) * .1, Math.sin(a) * .85);
    b.rotation.y = -a; // uchish yo'nalishiga qaraydi
    const f = Math.sin(t * 28 + i) * .6;
    b.userData['w-1'].rotation.z = f; b.userData.w1.rotation.z = -f;
  });
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
