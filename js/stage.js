// Bosh menyu sahnasi: bolalar xonasida Tom va Jerry turadi; tanlangani oltin halqa ustida qo'l silkitadi.
import * as THREE from 'three';
import { gfx, updateGfx, tuneEnv } from './gfx.js';
import { makeCharacter } from './models.js';

export function makeStage(app) {
  const R = app.world.rooms.find(r => r.key === 'kids');
  const pos = { jerry: new THREE.Vector3(R.ox + 10.6, 0, R.oz + 15.8), tom: new THREE.Vector3(R.ox + 15.4, 0, R.oz + 15.2) };
  const models = { jerry: null, tom: null }, sets = { jerry: null, tom: null };
  // guruhdagi do'st (PUBG kabi — yoningizda turadi)
  const fpos = new THREE.Vector3(R.ox + 13, 0, R.oz + 12.6);
  let friend = null, friendKey = '';
  const rings = {};
  for (const k of ['jerry', 'tom']) {
    const s = k === 'jerry' ? 1.1 : 1.9;
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(s * .9, s * 1.12, 48), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(s * 1.1, 48), new THREE.MeshBasicMaterial({ color: '#ffb300', transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = .04; g.add(glow);
    g.position.copy(pos[k]); gfx.scene.add(g); rings[k] = g;
  }
  const camBase = new THREE.Vector3(R.ox + 13, 3.5, R.oz + 23.8), look = new THREE.Vector3(R.ox + 13, 1.9, R.oz + 14.8);
  let shopShift = 0, shopTarget = 0, t = 0, waveT = 0;
  const S = {
    visible: true,
    set(kind, setId) {
      if (sets[kind] === setId && models[kind]) return;
      if (models[kind]) { gfx.scene.remove(models[kind].root); models[kind].dispose(); }
      const m = makeCharacter(kind, setId); m.root.position.copy(pos[kind]);
      m.root.rotation.y = kind === 'jerry' ? .35 : -.3;
      gfx.scene.add(m.root); tuneEnv(m.root); models[kind] = m; sets[kind] = setId;
      m.root.visible = S.visible;
    },
    show(on) { S.visible = on; if (friend) friend.root.visible = on; for (const k in models) if (models[k]) models[k].root.visible = on; for (const k in rings) rings[k].visible = on; },
    shop(on) { shopTarget = on ? 1 : 0; },
    update(dt, time) {
      t += dt; waveT -= dt;
      const sel = app.data ? app.data.char : 'jerry';
      for (const k of ['jerry', 'tom']) {
        const m = models[k]; if (!m) continue;
        const isSel = k === sel;
        let mode = 'idle';
        if (isSel) mode = waveT > 0 ? 'celebrate' : (Math.sin(t * .7) > .2 ? 'wave' : 'idle');
        m.update(dt, mode);
        rings[k].children[0].material.opacity = isSel ? .9 : 0;
        rings[k].children[1].material.opacity = isSel ? .22 + Math.sin(t * 4) * .08 : 0;
        rings[k].rotation.y += dt * .5;
      }
      if (friend) friend.update(dt, Math.sin(t * .6 + 1) > .4 ? 'wave' : 'idle');
      shopShift += (shopTarget - shopShift) * Math.min(1, dt * 5);
      const cam = gfx.camera;
      if (cam.fov !== 55) { cam.fov = 55; cam.updateProjectionMatrix(); }
      cam.position.set(camBase.x + Math.sin(t * .3) * .5 + shopShift * 3.2, camBase.y + Math.sin(t * .45) * .12, camBase.z - shopShift * 1.5);
      cam.lookAt(look.x + shopShift * 3.6, look.y, look.z);
      for (const a of app.world.anim) a(time);
      updateGfx(dt, look, time);
    },
    celebrate() { waveT = 1.6; },
    setFriend(info) {
      const key = info ? (info.kind || 'jerry') + ':' + ((info.skins || {})[info.kind || 'jerry'] || 'classic') : '';
      if (key === friendKey) return; friendKey = key;
      if (friend) { gfx.scene.remove(friend.root); friend.dispose(); friend = null; }
      if (!info) return;
      const kind = info.kind === 'tom' ? 'tom' : 'jerry';
      friend = makeCharacter(kind, (info.skins || {})[kind] || 'classic');
      friend.root.position.copy(fpos); friend.root.rotation.y = 0; friend.kind = kind;
      gfx.scene.add(friend.root); tuneEnv(friend.root); friend.root.visible = S.visible;
    },
    friendScreenPos() {
      if (!friend) return null;
      const v = fpos.clone(); v.y = (friend.kind === 'tom' ? 3.45 : 1.5) + .5; v.project(gfx.camera);
      return [(v.x * .5 + .5) * window.innerWidth, (-v.y * .5 + .5) * window.innerHeight];
    },
    // HTML kartalar uchun ekrandagi joy
    screenPos(kind) {
      const v = pos[kind].clone(); v.y = -.2; v.project(gfx.camera);
      return [(v.x * .5 + .5) * window.innerWidth, (-v.y * .5 + .5) * window.innerHeight];
    },
  };
  return S;
}
