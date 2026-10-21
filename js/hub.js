// HUB: onlayn o'yinchilar birga yuradigan joy (katta uy). Umumiy chat va mikrofon (yaqindagilar balandroq eshitiladi).
import * as THREE from 'three';
import { gfx, updateGfx } from './gfx.js';
import { moveBody } from './physics.js';
import { makeCharacter, DIM } from './models.js';
import * as SND from './audio.js';
import { attachTouch, isTouch } from './touch.js';
import { Voice } from './voice.js';
import { nickHTML, roleBadge } from './ui.js';

const SPD = { jerry: { run: 9, sprint: 12.6, jump: 14.4 }, tom: { run: 10.6, sprint: 13.4, jump: 14.9 } };
const MAXP = 20, HEAR = 40, STALE = 30000;
const QUICK = ['Salom hammaga! 👋', "Kim o'ynaydi? 🎮", "Do'st bo'lamizmi? 🤝", 'Zo\'r skin! 😎', 'Hahaha 😂', 'Xayr! 👋'];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerpAng = (a, b, t) => { const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * Math.min(1, t); };
const $ = id => document.getElementById(id);

export class Hub {
  constructor(app) {
    this.app = app; this.net = app.backend.net; this.world = app.world; this.uid = app.user.uid;
    this.keys = {}; this.cam = { yaw: 0, pitch: -.2, dist: 1, cur: 5 }; this.phase = 'play'; this.time = 0;
    const kind = app.data.char, skin = app.data.equip.skin[kind] || 'classic';
    this.me = kind; this.kind = kind; this.skin = skin;
    this.P = this.ent(kind, skin); this.tom = this.P;
    this.spawn();
    this.others = new Map(); this.pendingSig = new Map(); this.sendT = 0; this.volT = 0;
    this.track = null; this.micOn = false;
    this.bind();
    if (isTouch()) {
      attachTouch(this);
      // telefonda: "Yashirin" o'rniga chat, xarita kerak emas
      this.tHideHTML = $('tHide').innerHTML; $('tHide').innerHTML = '💬<small>Chat</small>'; $('tMap').classList.add('hidden'); $('tPause').classList.add('hidden'); $('tList').classList.add('hidden'); $('tView').classList.add('hidden');
    }
    this.ui();
    this.join();
  }
  ent(kind, skin) {
    const model = makeCharacter(kind, skin);
    gfx.scene.add(model.root);
    return { kind, model, p: new THREE.Vector3(), v: new THREE.Vector3(), r: kind === 'jerry' ? .36 : .85, h: DIM[kind].h, step: kind === 'jerry' ? .5 : .65, onGround: true, yaw: 0, stam: 1 };
  }
  spawn() {
    const R = this.world.rooms.find(r => r.key === 'living') || this.world.rooms.find(r => r.key === 'tea_hall' || r.key === 'bank_lounge') || this.world.rooms[0];
    const nav = this.app.navT; // ochiq joy (stol/karavot tagida emas)
    const c = nav.nearestFree(R.ox + 6 + Math.random() * 14, R.oz + 6 + Math.random() * 14, 12) || [R.ox + 13, R.oz + 13];
    this.P.p.set(c[0], 0, c[1]); this.P.yaw = Math.random() * 6.28; this.cam.yaw = this.P.yaw;
    this.cam.cur = this.kind === 'jerry' ? 4.2 : 7;
  }
  info() {
    const a = this.app, P = this.P, r2 = v => Math.round(v * 100) / 100;
    return { nick: a.profile.nick, color: a.profile.color || 'white', icon: a.profile.icon, title: a.isSuper ? 'super' : a.isAdmin ? 'admin' : '',
      kind: this.kind, skin: this.skin, x: r2(P.p.x), y: r2(P.p.y), z: r2(P.p.z), yaw: r2(P.yaw), a: this.anim || 'idle', mic: this.micOn ? 1 : 0 };
  }

  // ---------------- tarmoq ----------------
  async join() {
    const N = this.net;
    try { await N.hubJoin(this.info()); } catch (e) { this.sys("Hubga ulanib bo'lmadi: " + (e.message || e)); return; }
    if (this.disposed) { N.hubLeave(); return; }
    this.joined = true;
    this.un = [
      N.watchHub(all => this.onPlayers(all)),
      N.watchHubChat(m => this.addChat(m)),
      N.watchHubSig(v => { const o = this.others.get(v.from); if (o && o.voice) o.voice.onSignal(v); else { const q = this.pendingSig.get(v.from) || []; q.push(v); this.pendingSig.set(v.from, q.slice(-30)); } }),
    ];
    this.sys('Hubga xush kelibsiz! Enter — chat, T — mikrofon.');
  }
  onPlayers(all) {
    const now = this.net.now(), seen = new Set();
    const list = Object.entries(all).filter(([u, s]) => u !== this.uid && s && s.nick && (!s.t || now - s.t < STALE))
      .sort((a, b) => Math.hypot(a[1].x - this.P.p.x, a[1].z - this.P.p.z) - Math.hypot(b[1].x - this.P.p.x, b[1].z - this.P.p.z)).slice(0, MAXP);
    for (const [u, s] of list) {
      seen.add(u);
      let o = this.others.get(u);
      if (!o) o = this.addOther(u, s);
      o.s = s; o.target.set(s.x || 0, s.y || 0, s.z || 0); o.tyaw = s.yaw || 0; o.anim = s.a || 'idle';
      if (o.tagKey !== s.nick + s.color + s.title + s.mic) { o.tagKey = s.nick + s.color + s.title + s.mic; this.renderTag(o); }
    }
    for (const [u, o] of this.others) if (!seen.has(u)) this.removeOther(u);
    $('hubCount').textContent = `${this.others.size + 1} o'yinchi`;
  }
  addOther(u, s) {
    const model = makeCharacter(s.kind === 'tom' ? 'tom' : 'jerry', s.skin || 'classic');
    gfx.scene.add(model.root);
    const tag = document.createElement('div'); tag.className = 'htag'; $('hubTags').appendChild(tag);
    const o = { uid: u, s, model, p: new THREE.Vector3(s.x || 0, s.y || 0, s.z || 0), target: new THREE.Vector3(), yaw: s.yaw || 0, tyaw: 0, anim: 'idle', h: DIM[s.kind === 'tom' ? 'tom' : 'jerry'].h, tag };
    model.root.position.copy(o.p);
    o.voice = new Voice(x => this.net.hubSig(u, x), this.uid < u, () => this.renderTag(o));
    if (this.track) o.voice.setTrack(this.track);
    for (const v of this.pendingSig.get(u) || []) o.voice.onSignal(v);
    this.pendingSig.delete(u);
    this.others.set(u, o);
    return o;
  }
  removeOther(u) {
    const o = this.others.get(u); if (!o) return;
    gfx.scene.remove(o.model.root); o.model.dispose(); o.tag.remove();
    if (o.voice) o.voice.close(true);
    this.others.delete(u);
  }
  renderTag(o) {
    const s = o.s || {};
    o.tag.innerHTML = `${o.voice && o.voice.speaking ? '<span class="spk">🔊</span>' : s.mic ? '<span class="mic">🎤</span>' : ''}${nickHTML(s.nick || '???', s.color)}${roleBadge(s.title)}`;
  }

  // ---------------- chat ----------------
  ui() {
    $('hubHud').classList.remove('hidden'); $('hubChat').innerHTML = ''; $('hubTags').innerHTML = '';
    $('hubCount').textContent = "1 o'yinchi";
    $('hubExit').onclick = () => this.app.leaveHub();
    $('hubChatBtn').onclick = () => this.chatOpen ? this.closeChat() : this.openChat();
    $('hubMicBtn').onclick = () => this.toggleMic();
    $('hubSend').onclick = () => { this.sendChat($('hubInput').value); this.closeChat(); };
    $('hubInput').onkeydown = e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.sendChat(e.target.value); this.closeChat(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.closeChat(); }
    };
    $('hubQuick').innerHTML = QUICK.map((q, i) => `<button class="chip" data-hq="${i}">${q}</button>`).join('');
    $('hubQuick').onclick = e => { const b = e.target.closest('[data-hq]'); if (b) { this.sendChat(QUICK[+b.dataset.hq]); this.closeChat(); } };
    this.micUI();
  }
  openChat() {
    if (this.chatOpen) return;
    this.chatOpen = true; this.keys = {};
    $('hubBar').classList.remove('hidden'); $('hubInput').value = '';
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(() => $('hubInput').focus(), 30);
  }
  closeChat() {
    if (!this.chatOpen) return;
    this.chatOpen = false; $('hubBar').classList.add('hidden'); $('hubInput').blur();
    if (!isTouch()) this.lock();
  }
  sendChat(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!text) return;
    const now = performance.now(); if (now - (this.lastChat || 0) < 1000) { this.sys('Juda tez yozyapsiz — biroz kuting'); return; } this.lastChat = now;
    const a = this.app;
    Promise.resolve(this.net.hubChat({ nick: a.profile.nick, color: a.profile.color || 'white', title: a.isSuper ? 'super' : a.isAdmin ? 'admin' : '', text })).catch(() => this.sys('Xabar yuborilmadi'));
  }
  addChat(m) {
    if (!m || !m.text) return;
    const box = $('hubChat'), d = document.createElement('div');
    d.className = 'cm' + (m.by === this.uid ? ' me' : '');
    d.innerHTML = nickHTML(m.nick || '???', m.color) + roleBadge(m.title) + ': ';
    d.appendChild(document.createTextNode(String(m.text).slice(0, 80)));
    box.appendChild(d);
    while (box.children.length > 8) box.firstChild.remove();
    if (m.by !== this.uid && this.joinedAt && performance.now() - this.joinedAt > 1500) SND.play('click');
    this.joinedAt = this.joinedAt || performance.now();
  }
  sys(text) {
    const box = $('hubChat'), d = document.createElement('div');
    d.className = 'cm sys'; d.textContent = text; box.appendChild(d);
    while (box.children.length > 8) box.firstChild.remove();
  }

  // ---------------- mikrofon ----------------
  async toggleMic() {
    try {
      if (!this.track) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Mikrofon topilmadi');
        const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        this.track = st.getAudioTracks()[0];
        for (const o of this.others.values()) o.voice.setTrack(this.track);
        this.micOn = true;
      } else { this.micOn = !this.micOn; this.track.enabled = this.micOn; }
      this.sys(this.micOn ? '🎤 Mikrofon yoqildi — yaqindagilar sizni eshitadi' : "🎤 Mikrofon o'chirildi");
      if (this.joined) this.net.hubState({ mic: this.micOn ? 1 : 0 });
    } catch (e) {
      SND.play('error');
      this.sys(e && e.name === 'NotAllowedError' ? 'Mikrofonga ruxsat berilmadi (brauzer sozlamasidan ruxsat bering)' : (e.message || 'Mikrofon ishlamadi'));
    }
    this.micUI();
  }
  micUI() { $('hubMicBtn').classList.toggle('on', this.micOn); }

  // ---------------- boshqaruv ----------------
  bind() {
    const c = gfx.renderer.domElement;
    this.h = {
      kd: e => this.onKey(e, true), ku: e => this.onKey(e, false),
      mm: e => { if (document.pointerLockElement === c) this.look(e.movementX, e.movementY); },
      md: e => { if (document.pointerLockElement !== c && !this.chatOpen) { this.drag = [e.clientX, e.clientY]; this.lock(); } },
      // sichqoncha qulflanmasa ham: chap tugmani bosib sudrab qarash
      dm: e => { if (this.drag && document.pointerLockElement !== c) { this.look((e.clientX - this.drag[0]) * 1.4, (e.clientY - this.drag[1]) * 1.4); this.drag = [e.clientX, e.clientY]; } },
      du: () => { this.drag = null; },
      wh: e => { this.cam.dist = clamp(this.cam.dist + Math.sign(e.deltaY) * .12, .55, 1.7); },
      pl: () => { $('hubHint').classList.toggle('hidden', document.pointerLockElement === c || this.chatOpen || isTouch()); },
    };
    window.addEventListener('keydown', this.h.kd); window.addEventListener('keyup', this.h.ku);
    window.addEventListener('mousemove', this.h.mm); c.addEventListener('mousedown', this.h.md);
    window.addEventListener('mousemove', this.h.dm); window.addEventListener('mouseup', this.h.du);
    c.addEventListener('wheel', this.h.wh, { passive: true }); document.addEventListener('pointerlockchange', this.h.pl);
    this.h.pl();
  }
  lock() {
    if (isTouch()) return;
    const c = gfx.renderer.domElement;
    try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
  }
  look(dx, dy) {
    const s = .0022 * (this.app.settings.sens || 1);
    this.cam.yaw -= dx * s;
    this.cam.pitch = clamp(this.cam.pitch - dy * s * (this.app.settings.invertY ? -1 : 1), -1.25, .75);
  }
  onKey(e, down) {
    if (this.chatOpen) return;
    const k = e.code;
    if (down && (k === 'Enter' || k === 'NumpadEnter')) { e.preventDefault(); this.openChat(); return; }
    this.keys[k] = down;
    if (!down) return;
    if (['Space', 'Tab'].includes(k)) e.preventDefault();
    if (k === 'KeyT') this.toggleMic();
  }
  // touch.js talab qiladigan bo'sh funksiyalar
  pressC() { this.openChat(); }
  pounce() { }
  toggleBig() { }

  // ---------------- sikl ----------------
  update(dt) {
    this.time += dt;
    const P = this.P, k = this.keys, tc = this.touch;
    let fx = 0, fz = 0;
    if (k.KeyW || k.ArrowUp) fz += 1; if (k.KeyS || k.ArrowDown) fz -= 1;
    if (k.KeyA || k.ArrowLeft) fx -= 1; if (k.KeyD || k.ArrowRight) fx += 1;
    if (tc && tc.active) { fx = tc.mx; fz = tc.mz; }
    const y = this.cam.yaw, fwd = [Math.sin(y), Math.cos(y)], right = [-Math.cos(y), Math.sin(y)];
    let dir = null;
    if (fx || fz) { const dx = fwd[0] * fz + right[0] * fx, dz = fwd[1] * fz + right[1] * fx, L = Math.hypot(dx, dz); dir = [dx / L, dz / L]; }
    const S = SPD[P.kind], sprint = (k.ShiftLeft || k.ShiftRight || (tc && tc.sprint)) && dir;
    const sp = sprint ? S.sprint : S.run;
    const acc = (P.onGround ? 55 : 14) * dt;
    P.v.x += clamp((dir ? dir[0] * sp : 0) - P.v.x, -acc, acc); P.v.z += clamp((dir ? dir[1] * sp : 0) - P.v.z, -acc, acc);
    if ((k.Space || (tc && tc.jump)) && P.onGround) { P.v.y = S.jump; P.onGround = false; SND.play('jump'); }
    if (dir) P.yaw = lerpAng(P.yaw, Math.atan2(dir[0], dir[1]), dt * 12);
    else P.yaw = lerpAng(P.yaw, y, Math.min(1, dt * 8));
    moveBody(P, this.world, dt);
    const hs = Math.hypot(P.v.x, P.v.z);
    this.anim = !P.onGround ? (P.v.y > 0 ? 'jump' : 'fall') : hs > (P.kind === 'jerry' ? 11 : 12.2) ? 'sprint' : hs > (P.kind === 'jerry' ? 5.5 : 6.8) ? 'run' : hs > .6 ? 'walk' : 'idle';
    P.model.root.position.copy(P.p); P.model.root.rotation.y = P.yaw;
    P.model.lookPitch = clamp(-this.cam.pitch * .6, -.5, .45);
    P.model.update(dt, this.anim, hs);
    P.model.setOpacity(this.camNear ? .3 : 1);
    // holatni yuborish (8 marta/s)
    this.sendT -= dt;
    if (this.sendT <= 0 && this.joined) { this.sendT = 1 / 8; const r2 = v => Math.round(v * 100) / 100; this.net.hubState({ x: r2(P.p.x), y: r2(P.p.y), z: r2(P.p.z), yaw: r2(P.yaw), a: this.anim }); }
    // boshqa o'yinchilar
    const kk = 1 - Math.exp(-dt * 10);
    this.volT -= dt; const vol = this.volT <= 0; if (vol) this.volT = .2;
    for (const o of this.others.values()) {
      const jump = o.p.distanceTo(o.target) > 15;
      if (jump) o.p.copy(o.target); else o.p.lerp(o.target, kk);
      o.yaw = lerpAng(o.yaw, o.tyaw, kk);
      o.model.root.position.copy(o.p); o.model.root.rotation.y = o.yaw;
      o.model.update(dt, o.anim, 6);
      const dist = Math.hypot(o.p.x - P.p.x, o.p.z - P.p.z);
      if (vol && o.voice) o.voice.setVolume(1 - dist / HEAR);   // yaqin turganlar balandroq
      const v = new THREE.Vector3(o.p.x, o.p.y + o.h + .45, o.p.z).project(gfx.camera);
      const vis = v.z < 1 && dist < 60 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      o.tag.style.display = vis ? '' : 'none';
      if (vis) { o.tag.style.left = (v.x * .5 + .5) * window.innerWidth + 'px'; o.tag.style.top = (-v.y * .5 + .5) * window.innerHeight + 'px'; o.tag.style.opacity = dist < 30 ? 1 : .6; }
    }
    this.camera(dt);
    for (const a of this.world.anim) a(this.time + 100);
    updateGfx(dt, P.p, this.time);
  }
  camera(dt) {
    const cam = gfx.camera, P = this.P, c = this.cam;
    const fov = this.app.settings.fov || 70;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const tx = P.p.x, ty = P.p.y + P.h * .78, tz = P.p.z;
    const fx = Math.sin(c.yaw) * Math.cos(c.pitch), fy = Math.sin(c.pitch), fz = Math.cos(c.yaw) * Math.cos(c.pitch);
    const base = (P.kind === 'jerry' ? 4.4 : 7.6) * c.dist;
    let want = base;
    for (let s = .5; s <= base; s += .25) { if (this.world.pointBlocked(tx - fx * s, ty - fy * s + .3, tz - fz * s, .22)) { want = Math.max(.6, s - .35); break; } }
    c.cur += (want - c.cur) * Math.min(1, dt * (want < c.cur ? 18 : 3.5));
    this.camNear = c.cur < (P.kind === 'jerry' ? 1.5 : 2.6);
    cam.position.set(tx - fx * c.cur, clamp(ty - fy * c.cur + .3, .4, 13.4), tz - fz * c.cur);
    cam.lookAt(tx, ty + .2, tz);
  }

  dispose() {
    const c = gfx.renderer.domElement;
    this.disposed = true;
    (this.un || []).forEach(u => u && u());
    Promise.resolve(this.net.hubLeave()).catch(() => { });
    for (const u of [...this.others.keys()]) this.removeOther(u);
    try { if (this.track) this.track.stop(); } catch (e) { }
    if (this.touch) { this.touch.detach(); $('tHide').innerHTML = this.tHideHTML; $('tMap').classList.remove('hidden'); $('tPause').classList.remove('hidden'); $('tList').classList.remove('hidden'); $('tView').classList.remove('hidden'); }
    window.removeEventListener('keydown', this.h.kd); window.removeEventListener('keyup', this.h.ku);
    window.removeEventListener('mousemove', this.h.mm); c.removeEventListener('mousedown', this.h.md);
    window.removeEventListener('mousemove', this.h.dm); window.removeEventListener('mouseup', this.h.du);
    c.removeEventListener('wheel', this.h.wh); document.removeEventListener('pointerlockchange', this.h.pl);
    gfx.scene.remove(this.P.model.root); this.P.model.dispose();
    $('hubHud').classList.add('hidden'); $('hubBar').classList.add('hidden'); $('hubTags').innerHTML = '';
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
