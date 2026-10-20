// Bitta o'yin (raund): o'yinchi boshqaruvi (sichqoncha bilan qarash), kamera, yashirinish (C), buyumlar, ushlash, natija.
import * as THREE from 'three';
import { gfx, updateGfx } from './gfx.js';
import { moveBody } from './physics.js';
import { makeCharacter, makeSpike, DIM } from './models.js';
import * as SND from './audio.js';
import { hud } from './hud.js';
import { ITEMS } from './catalog.js';
import * as PR from './props.js';
import { TomAI, JerryAI } from './ai.js';
import { attachTouch, isTouch } from './touch.js';

export const MATCH_TIME = 180, LIVES = 3, HIDE_MAX = 25;
const SPD = { jerry: { run: 9, sprint: 12.6, jump: 14.4 }, tom: { run: 10.6, sprint: 13.4, jump: 14.9 } };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lerpAng = (a, b, t) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * Math.min(1, t); };

export class Match {
  constructor(app, me) {
    this.app = app; this.me = me; this.world = app.world; this.navJ = app.navJ; this.navT = app.navT;
    this.time = 0; this.left = MATCH_TIME; this.lives = LIVES; this.catches = 0; this.cheeseN = 0; this.escapes = 0; this.finds = 0;
    this.phase = 'intro'; this.introT = 3.2; this.paused = false; this.endT = 0;
    this.keys = {}; this.cam = { yaw: 0, pitch: -.22, dist: 1, fp: false, cur: 4 };
    this.inv = app.data.inv; this.active = {};
    this.guide = null; this.guideFx = PR.makeGuide(); this.marks = []; this.traps = [];
    this.spike = null; this.spikeT = 0; this.radarT = 0; this.exitCheck = 0; this.lastTomSeeT = -99; this.lastJSeenT = -99;
    this.visT = 0; this.tomSees = false; this.jerrySeesTom = false; this.hideT = 0; this.checkT = 0; this.checkSpot = null; this.stepT = 0;
    const eq = app.data.equip.skin;
    this.jerry = this.ent('jerry', eq.jerry); this.tom = this.ent('tom', eq.tom);
    this.bubble = PR.makeBubble(.95); this.jerry.model.root.add(this.bubble); this.bubble.position.y = .75;
    // sirlar: mebel ustidagi + poldagi tasodifiy nuqtalar
    const pts = this.world.tops.filter(p => p.y < 9).map(p => p.clone());
    for (let i = 0; i < 90; i++) { const c = this.navJ.randomFree(); if (c) pts.push(new THREE.Vector3(c[0], 0, c[1])); }
    this.cheese = PR.makeCheeseField(pts, 64);
    for (const h of this.world.hides) { h.wob = 0; }
    this.spawn();
    this.tomAI = me === 'jerry' ? new TomAI(this) : null;
    this.jerryAI = me === 'tom' ? new JerryAI(this) : null;
    this.player = me === 'jerry' ? this.jerry : this.tom;
    this.cam.yaw = this.player.yaw; this.cam.cur = me === 'jerry' ? 4.2 : 7;
    this.bind();
    if (isTouch()) attachTouch(this);
    hud.show(true);
    SND.setMood('chase');
    SND.playMusic(app.data.equip.music);
  }
  ent(kind, skin) {
    const model = makeCharacter(kind, skin || 'classic');
    gfx.scene.add(model.root);
    return { kind, model, p: new THREE.Vector3(), v: new THREE.Vector3(), r: kind === 'jerry' ? .36 : .85, h: DIM[kind].h, step: kind === 'jerry' ? .5 : .65,
      onGround: true, yaw: 0, stam: 1, stun: 0, hidden: null, sprinting: false, invis: 0, shield: 0, speedT: 0, magnet: 0, invul: 0, pounceT: 0, anim: 'idle' };
  }
  spawn() {
    const rooms = this.world.rooms, J = this.jerry, T = this.tom;
    const lr = rooms.find(r => r.key === 'living');
    const jp = this.navJ.nearestFree(lr.ox + 6, lr.oz + 13);
    J.p.set(jp[0], 0, jp[1]); J.yaw = Math.PI / 2;
    const far = ['laundry', 'storage', 'garden', 'bedroom'][Math.floor(Math.random() * 4)];
    const tr = rooms.find(r => r.key === far);
    const tp = this.navT.nearestFree(tr.ox + 13, tr.oz + 13, 12);
    T.p.set(tp[0], 0, tp[1]);
  }

  // ---------------- boshqaruv ----------------
  bind() {
    const c = gfx.renderer.domElement;
    this.h = {
      kd: e => this.onKey(e, true), ku: e => this.onKey(e, false),
      mm: e => { if (document.pointerLockElement === c) this.look(e.movementX, e.movementY); },
      md: e => {
        if (this.paused || this.phase === 'end') return;
        if (document.pointerLockElement !== c) { this.lock(); return; }
        if (e.button === 0 && this.me === 'tom') this.pounce(this.tom);
        if (e.button === 2) this.cam.fpHold = true;
      },
      mu: e => { if (e.button === 2) this.cam.fpHold = false; },
      wh: e => { this.cam.dist = clamp(this.cam.dist + Math.sign(e.deltaY) * .12, .55, 1.7); },
      pl: () => { const locked = document.pointerLockElement === c; hud.lockHint(!locked && !this.paused && this.phase !== 'end'); if (!locked && this.phase === 'play' && !this.paused && !this.app.ignoreUnlock) this.app.pause(); },
      cm: e => e.preventDefault(),
    };
    window.addEventListener('keydown', this.h.kd); window.addEventListener('keyup', this.h.ku);
    window.addEventListener('mousemove', this.h.mm); c.addEventListener('mousedown', this.h.md); window.addEventListener('mouseup', this.h.mu);
    c.addEventListener('wheel', this.h.wh, { passive: true }); document.addEventListener('pointerlockchange', this.h.pl); c.addEventListener('contextmenu', this.h.cm);
    // sichqonchasiz qurilmalar uchun: tortib qarash
    this.h.tm = e => { if (this.drag) { this.look((e.clientX - this.drag[0]) * 1.5, (e.clientY - this.drag[1]) * 1.5); this.drag = [e.clientX, e.clientY]; } };
    this.h.td = e => { if (e.pointerType !== 'mouse') this.drag = [e.clientX, e.clientY]; };
    this.h.tu = () => { this.drag = null; };
    c.addEventListener('pointerdown', this.h.td); window.addEventListener('pointermove', this.h.tm); window.addEventListener('pointerup', this.h.tu);
    this.h.hb = e => { const sl = e.target.closest('.slot'); if (sl) { e.preventDefault(); this.useItem(+sl.dataset.i); } };
    document.getElementById('hotbar').addEventListener('pointerdown', this.h.hb);
    hud.lockHint(!isTouch());
  }
  toggleBig() { hud.toggleBig(this.bigOn); }
  lock() {
    if (isTouch()) { hud.lockHint(false); return; }
    const c = gfx.renderer.domElement;
    const plain = () => { try { const q = c.requestPointerLock(); if (q && q.catch) q.catch(() => hud.lockHint(true)); } catch (e) { hud.lockHint(true); } };
    try { const p = c.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(plain); } catch (e) { plain(); }
  }
  look(dx, dy) {
    const s = .0022 * (this.app.settings.sens || 1);
    this.cam.yaw -= dx * s;
    this.cam.pitch = clamp(this.cam.pitch - dy * s * (this.app.settings.invertY ? -1 : 1), -1.25, .75);
  }
  onKey(e, down) {
    const k = e.code;
    if (this.paused) return;
    this.keys[k] = down;
    if (!down) return;
    if (['Space', 'Tab'].includes(k)) e.preventDefault();
    if (this.phase !== 'play') return;
    if (k === 'KeyC') this.pressC();
    else if (k === 'KeyV') this.cam.fp = !this.cam.fp;
    else if (k === 'KeyM') { this.bigOn = !this.bigOn; this.toggleBig(); }
    else if (k === 'KeyQ' && this.me === 'tom') this.pounce(this.tom);
    else if (/^Digit[1-9]$/.test(k)) this.useItem(+k.slice(5) - 1);
  }

  // ---------------- yashirinish (C) ----------------
  nearestSpots(p, n = 6) {
    return this.world.hides.slice().sort((a, b) => Math.hypot(a.ax - p.x, a.az - p.z) - Math.hypot(b.ax - p.x, b.az - p.z)).slice(0, n);
  }
  pickSpot(e, nav) {
    let best = null, bl = 1e9, bp = null;
    for (const sp of this.nearestSpots(e.p)) {
      if (e.kind === 'jerry' && d2(this.tom.p, { x: sp.ax, z: sp.az }) < 6) continue;
      const path = nav.find(e.p.x, e.p.z, sp.ax, sp.az);
      if (path && path.len < bl) { bl = path.len; best = sp; bp = path; }
    }
    return best ? { sp: best, path: bp } : null;
  }
  pressC() {
    const P = this.player;
    if (P.stun > 0) return;
    if (this.me === 'jerry') {
      if (P.hidden) { if (this.hideT > .4) this.exitHide(P); return; }
      if (this.guide) { this.guide = null; this.guideFx.clear(); hud.guide(''); return; }
      const near = this.nearestSpots(P.p, 1)[0];
      if (near && d2(P.p, { x: near.ax, z: near.az }) < 2.2 && P.p.y < 1) { this.enterHide(P, near); return; }
      const r = this.pickSpot(P, this.navJ);
      if (!r) { hud.toast("Yaqinda bo'sh joy yo'q!", 'red'); SND.play('error'); return; }
      this.guide = { sp: r.sp, path: r.path, t: .4 }; this.guideFx.set(r.path, r.sp, '#46ff7e');
      SND.play('click');
    } else {
      if (this.checkT > 0) return;
      const near = this.nearestSpots(P.p, 1)[0];
      if (near && d2(P.p, near) < near.r + 2.8 + 1) { this.startCheck(near); return; }
      if (this.guide) { this.guide = null; this.guideFx.clear(); hud.guide(''); return; }
      const r = this.pickSpot(P, this.navT);
      if (!r) return;
      this.guide = { sp: r.sp, path: r.path, t: .4 }; this.guideFx.set(r.path, r.sp, '#ffc84a');
    }
  }
  updateGuide(dt) {
    const g = this.guide; if (!g) return;
    const P = this.player, nav = this.me === 'jerry' ? this.navJ : this.navT;
    g.t -= dt;
    if (g.t <= 0) { g.t = .4; const p = nav.find(P.p.x, P.p.z, g.sp.ax, g.sp.az); if (p) { g.path = p; this.guideFx.set(p, g.sp); } }
    const dist = d2(P.p, { x: g.sp.ax, z: g.sp.az });
    hud.guide(`➜ ${g.sp.name}: ${Math.max(0, Math.round(g.path ? g.path.len : dist))} m`);
    if (dist < 1.45 && P.p.y < .8) {
      this.guide = null; this.guideFx.clear(); hud.guide('');
      if (this.me === 'jerry') this.enterHide(P, g.sp); else this.startCheck(g.sp);
    }
  }
  enterHide(J, sp) {
    J.hidden = sp; J.v.set(0, 0, 0); J.p.set(sp.x, 0, sp.z); J.model.root.visible = false; sp.wob = 1;
    this.hideT = 0; this.searchedWhileHidden = false;
    SND.play('hide'); PR.poof(new THREE.Vector3(sp.ax, .6, sp.az), '#f5e6c8', 8, .6);
    if (this.me === 'jerry') {
      SND.setMood('sneak');
      this.seenAtEnter = this.tomSees;
      if (this.tomSees) { hud.toast("Tom ko'rib turibdi!", 'red', 1.6); this.tomAI.knowsSpot(sp); }
      else hud.toast('Yashirinding... jim tur!', 'green', 1.4);
      this.guide = null; this.guideFx.clear(); hud.guide('');
    }
  }
  exitHide(J, forced) {
    const sp = J.hidden; if (!sp) return;
    J.hidden = null; J.p.set(sp.ax, 0, sp.az); J.yaw = sp.dir; J.model.root.visible = !(this.me === 'jerry' && this.cam.fp);
    sp.wob = .8; SND.play('unhide');
    if (this.me === 'jerry') {
      SND.setMood('chase');
      this.cam.yaw = sp.dir;
      this.exitCheck = .7; this.exitSearched = this.searchedWhileHidden;
      if (forced) hud.toast("Uzoq o'tirib bo'lmaydi!", 'yellow');
    }
  }
  // Tom o'yinchi joyni tekshiradi
  startCheck(sp) { this.checkT = .9; this.checkSpot = sp; sp.wob = 1; SND.play('meow'); this.tom.v.set(0, this.tom.v.y, 0); }
  finishCheck() {
    const sp = this.checkSpot; this.checkSpot = null;
    if (this.jerry.hidden === sp) {
      this.exitHide(this.jerry); this.jerry.stun = .6; this.finds++;
      hud.flashRed(1.4, '255,190,0'); hud.toast('TOPDING!', 'gold', 1.4); SND.play('found');
      if (this.jerryAI) { this.jerryAI.state = 'flee'; this.jerryAI.think = 0; }
    } else { hud.toast(sp.name + " — bo'sh", '', 1); }
  }

  // ---------------- AI hodisalari ----------------
  onTomSpots() {
    if (this.me !== 'jerry') return;
    if (this.time - this.lastTomSeeT > 3 && this.phase === 'play') { hud.flashRed(1.5); SND.play('spotted'); hud.toast("TOM SENI KO'RDI!", 'red', 1.5); }
  }
  tomFinds(sp) {
    const J = this.jerry;
    this.exitHide(J); J.stun = .3; this.tom.stun = .55; this.exitCheck = 0;
    hud.flashRed(1.8); hud.toast('TOM SENI TOPDI! QOCH!', 'red', 1.6); SND.play('found');
    J.v.set(Math.sin(sp.dir) * 9, 6, Math.cos(sp.dir) * 9);
  }
  tomPullsOut(sp) {
    const J = this.jerry; if (J.hidden !== sp) return;
    this.exitHide(J); this.exitCheck = 0;
    hud.toast("Tom ko'rib turgan edi!", 'red', 1.6);
    this.caught(true);
  }
  tomShake() {
    const J = this.jerry, T = this.tom;
    if (J.hidden) return;
    const dx = J.p.x - T.p.x, dz = J.p.z - T.p.z, L = Math.hypot(dx, dz) || 1;
    J.v.set(dx / L * 15, 7, dz / L * 15); J.stun = .35;
    hud.toast('Tom mebelni silkitdi!', 'yellow'); SND.play('pounce'); this.app.shake(.5);
  }
  jerryAlert() { if (this.me === 'tom') { SND.play('squeak'); } }
  hudSay(t, cls, onlyJ) { if (onlyJ && this.me !== 'jerry') return; if (this.me === 'jerry') hud.say(t, cls); }

  // ---------------- buyumlar ----------------
  useItem(i) {
    const list = ITEMS.filter(it => it.for === this.me), it = list[i];
    if (!it) return;
    if (!this.inv[it.id]) { hud.toast(it.name + ' yo\'q — do\'kondan ol', 'red', 1.2); SND.play('error'); return; }
    const J = this.jerry, T = this.tom;
    let ok = true;
    switch (it.id) {
      case 'heart': if (this.lives >= 5) ok = false; else { this.lives++; hud.toast('+1 JON', 'green'); } break;
      case 'shield': J.shield = 25; this.bubble.visible = true; break;
      case 'boots': J.speedT = 8; break;
      case 'spike': this.callSpike(); break;
      case 'banana': { const m = PR.makeBanana(); const p = J.p.clone().add(new THREE.Vector3(-Math.sin(J.yaw) * 1.2, 0, -Math.cos(J.yaw) * 1.2)); p.y = J.ground || 0; m.position.copy(p); gfx.scene.add(m); this.traps.push({ type: 'banana', p, mesh: m, t: 40 }); break; }
      case 'invis': J.invis = 6; break;
      case 'magnet': J.magnet = 15; break;
      case 'radar': this.radarT = 6; break;
      case 'trap': { const m = PR.makeTrap(); const p = T.p.clone(); p.y = T.ground || 0; m.position.copy(p); m.rotation.y = T.yaw; gfx.scene.add(m); this.traps.push({ type: 'trap', p, mesh: m, t: 60 }); break; }
      case 'claws': T.speedT = 8; break;
      case 'sniff':
        if (J.hidden && d2(J.p, T.p) < 40) { const p = this.navT.find(T.p.x, T.p.z, J.hidden.ax, J.hidden.az); this.guide = { sp: J.hidden, path: p, t: .4 }; this.guideFx.set(p, J.hidden, '#ff5ca8'); hud.toast('Hid topildi!', 'gold'); }
        else { this.radarT = 3; hud.toast("Jerry yashirinmagan — xaritaga qara", '', 1.6); }
        break;
    }
    if (!ok) { SND.play('error'); return; }
    if (!this.app.isAdmin) this.inv[it.id]--;
    this.app.saveSoon();
    this.active[it.id] = true; setTimeout(() => { this.active[it.id] = false; }, 400);
    SND.play('power');
    if (!['heart', 'sniff'].includes(it.id)) hud.toast(it.name + '!', 'green', 1);
  }
  callSpike() {
    const T = this.tom;
    let pos = null;
    for (let k = 0; k < 40 && !pos; k++) { const c = this.navT.randomFree(); if (c && Math.hypot(c[0] - T.p.x, c[1] - T.p.z) > 10 && Math.hypot(c[0] - T.p.x, c[1] - T.p.z) < 22) pos = c; }
    if (!pos) pos = this.navT.nearestFree(T.p.x + 8, T.p.z);
    const sp = makeSpike(); sp.root.position.set(pos[0], 0, pos[1]); gfx.scene.add(sp.root);
    this.spike = { model: sp, p: sp.root.position, path: null, t: 0 };
    this.spikeT = 8;
    PR.poof(new THREE.Vector3(pos[0], 1, pos[1]), '#ffffff', 14, 1.4);
    SND.play('bark'); hud.toast('SPIKE KELDI!', 'gold', 1.6);
    if (this.tomAI) this.tomAI.scare();
  }
  updateSpike(dt) {
    if (!this.spike) return;
    const S = this.spike, T = this.tom;
    this.spikeT -= dt; S.t -= dt;
    if (this.spikeT <= 0) { PR.poof(S.p.clone().setY(1), '#ffffff', 12, 1.2); gfx.scene.remove(S.model.root); this.spike = null; return; }
    if (S.t <= 0) { S.t = .4; S.path = this.navT.find(S.p.x, S.p.z, T.p.x, T.p.z); S.i = 1; }
    let dir = null;
    if (S.path) { while (S.i < S.path.length && Math.hypot(S.path[S.i].x - S.p.x, S.path[S.i].z - S.p.z) < .8) S.i++; const q = S.path[S.i]; if (q) { const dx = q.x - S.p.x, dz = q.z - S.p.z, L = Math.hypot(dx, dz) || 1; dir = [dx / L, dz / L]; } }
    const near = d2(S.p, T.p) < 3.2;
    if (dir && !near) { S.p.x += dir[0] * 12 * dt; S.p.z += dir[1] * 12 * dt; S.model.root.rotation.y = Math.atan2(dir[0], dir[1]); }
    if (near && Math.random() < dt * 1.5) SND.play('bark');
    S.model.update(dt, !near);
  }

  // ---------------- ushlash ----------------
  pounce(T) {
    if (T.pounceT > 0 || T.pounceCd > 0 || T.stun > 0 || this.checkT > 0) return;
    T.pounceT = .32; T.pounceCd = 2.4; SND.play('pounce');
    if (T === this.tom && this.me === 'tom') T.yaw = this.cam.yaw;
  }
  caught(force) {
    const J = this.jerry, T = this.tom;
    if (this.phase !== 'play') return;
    if (!force && J.invul > 0) return;
    if (J.shield > 0) {
      J.shield = 0; this.bubble.visible = false; J.invul = 1.2; T.stun = 1.1;
      const dx = J.p.x - T.p.x, dz = J.p.z - T.p.z, L = Math.hypot(dx, dz) || 1; J.v.set(dx / L * 14, 6, dz / L * 14);
      hud.toast('Qalqon saqladi!', 'green'); SND.play('unhide'); return;
    }
    this.lives--; this.catches++;
    SND.play('caught'); PR.poof(J.p.clone().setY(.8), '#ffffff', 18, 1);
    this.app.shake(.6);
    if (this.me === 'jerry') { hud.flashRed(1.3); hud.toast(this.lives > 0 ? `USHLANDING! (${this.lives} jon qoldi)` : 'USHLANDING!', 'red', 1.8); }
    else hud.toast(this.lives > 0 ? `USHLADING! (${this.lives} qoldi)` : 'G\'ALABA!', 'gold', 1.8);
    if (this.tomAI) this.tomAI.celebrate(1.6);
    T.stun = 0; T.celebrate = 1.4;
    if (this.lives <= 0) { this.finish(true); return; }
    // Jerry uzoqroqda paydo bo'ladi
    let pos = null;
    for (let k = 0; k < 80 && !pos; k++) { const c = this.navJ.randomFree(); if (c && Math.hypot(c[0] - T.p.x, c[1] - T.p.z) > 38 && this.navT.free(c[0], c[1])) pos = c; }
    if (pos) J.p.set(pos[0], 0, pos[1]);
    J.v.set(0, 0, 0); J.invul = 2.5; J.stun = 0; J.hidden = null; J.model.root.visible = true;
    PR.poof(J.p.clone().setY(.8), '#bfe9ff', 14, .8);
    if (this.jerryAI) { this.jerryAI.state = 'wander'; this.jerryAI.target = null; }
    if (this.me === 'jerry') this.cam.yaw = J.yaw;
  }
  finish(tomWon) {
    this.phase = 'end'; this.endT = 2.6; this.tomWon = tomWon;
    const win = this.me === 'tom' ? tomWon : !tomWon;
    SND.play(win ? 'win' : 'lose'); SND.stopMusic();
    hud.toast(win ? "G'ALABA!" : 'MAG\'LUBIYAT', win ? 'gold' : 'red', 2.4);
    const survived = Math.min(MATCH_TIME, this.time);
    let sir;
    if (this.me === 'jerry') sir = this.cheeseN + Math.floor(survived / 10) * 2 + this.escapes * 10 + (win ? 60 : 0);
    else sir = this.catches * 35 + this.finds * 10 + Math.floor(survived / 15) * 2 + (win ? 80 : 0);
    this.result = { win, me: this.me, sir, cheese: this.cheeseN, catches: this.catches, escapes: this.escapes, finds: this.finds, time: survived, lives: this.lives };
    document.exitPointerLock?.();
  }

  // ---------------- harakat ----------------
  drive(e, dir, speed, dt, jumpV) {
    if (e.pounceT > 0) {
      e.pounceT -= dt;
      e.v.x = Math.sin(e.yaw) * 21; e.v.z = Math.cos(e.yaw) * 21;
      if (e.pounceT <= 0) e.stun = Math.max(e.stun, .35);
    } else {
      const acc = (e.onGround ? 55 : 14) * dt;
      const tx = dir ? dir[0] * speed : 0, tz = dir ? dir[1] * speed : 0;
      e.v.x += clamp(tx - e.v.x, -acc, acc); e.v.z += clamp(tz - e.v.z, -acc, acc);
      if (jumpV && e.onGround) { e.v.y = jumpV; e.onGround = false; if (e === this.player) SND.play('jump'); }
      if (dir && speed > .5 && !e.faceCam) e.yaw = lerpAng(e.yaw, Math.atan2(dir[0], dir[1]), dt * 12);
    }
    const wasAir = !e.onGround;
    moveBody(e, this.world, dt);
    if (wasAir && e.onGround && e === this.player) SND.play('land');
  }
  animOf(e, forced) {
    if (forced) return forced;
    if (e.celebrate > 0) return 'celebrate';
    if (e.stun > 0) return 'stunned';
    if (e.pounceT > 0) return 'pounce';
    if (!e.onGround) return e.v.y > 0 ? 'jump' : 'fall';
    const hs = Math.hypot(e.v.x, e.v.z);
    return hs > (e.kind === 'jerry' ? 11 : 12.2) ? 'sprint' : hs > (e.kind === 'jerry' ? 5.5 : 6.8) ? 'run' : hs > .6 ? 'walk' : 'idle';
  }
  playerInput(dt) {
    const P = this.player, k = this.keys;
    let fx = 0, fz = 0;
    if (k.KeyW || k.ArrowUp) fz += 1; if (k.KeyS || k.ArrowDown) fz -= 1;
    if (k.KeyA || k.ArrowLeft) fx -= 1; if (k.KeyD || k.ArrowRight) fx += 1;
    const y = this.cam.yaw, fwd = [Math.sin(y), Math.cos(y)], right = [-Math.cos(y), Math.sin(y)];
    let dir = null;
    const tc = this.touch;
    if (tc && tc.active) { fx = tc.mx; fz = tc.mz; }
    if (fx || fz) { const dx = fwd[0] * fz + right[0] * fx, dz = fwd[1] * fz + right[1] * fx, L = Math.hypot(dx, dz); dir = [dx / L, dz / L]; }
    const S = SPD[P.kind];
    const wantSprint = (k.ShiftLeft || k.ShiftRight || (tc && tc.sprint)) && dir;
    P.sprinting = wantSprint && P.stam > .02;
    P.stam = clamp(P.stam + (P.sprinting ? -.27 : .2) * dt, 0, 1);
    let sp = P.sprinting ? S.sprint : S.run;
    // 1-shaxs ko'rinishda orqaga yurish sekinroq
    P.backward = this.isFP() && fz < 0;
    if (P.backward) { sp *= .7; P.sprinting = false; }
    if (P.speedT > 0) sp *= P.kind === 'jerry' ? 1.35 : 1.3;
    if (this.checkT > 0) { dir = null; }
    const jump = (k.Space || (tc && tc.jump)) && P.stun <= 0 ? S.jump : 0;
    if (P.stun > 0) { this.drive(P, null, 0, dt, 0); return; }
    // turganda — sichqoncha qaragan tomonga qaraydi; yurganda — qayoqqa yursa o'sha tomonga buriladi
    if (this.isFP()) { P.faceCam = true; P.yaw = lerpAng(P.yaw, y, Math.min(1, dt * 25)); }
    else if (dir) P.faceCam = false;
    else { P.faceCam = true; P.yaw = lerpAng(P.yaw, y, Math.min(1, dt * 8)); }
    this.drive(P, dir, sp, dt, jump);
    if (dir && P.onGround) { this.stepT -= dt * sp; if (this.stepT <= 0) { this.stepT = P.kind === 'jerry' ? 2.2 : 3.6; if (P.kind === 'tom' || P.sprinting) SND.play('step'); } }
  }

  // ---------------- ko'rish ----------------
  vision() {
    const J = this.jerry, T = this.tom, dist = d2(J.p, T.p);
    let sees = false;
    if (!J.hidden && (J.invis <= 0 || dist < 2.5) && dist < 44) {
      const fy = this.me === 'tom' ? this.cam.yaw : T.yaw;
      const fx = Math.sin(fy), fz = Math.cos(fy), dx = (J.p.x - T.p.x) / (dist || 1), dz = (J.p.z - T.p.z) / (dist || 1);
      const ang = fx * dx + fz * dz;
      if (ang > Math.cos(this.me === 'tom' ? 1.2 : 1.35) || dist < 6) sees = !this.world.lineBlocked(T.p.x, T.p.y + 2.9, T.p.z, J.p.x, J.p.y + .7, J.p.z);
    }
    if (sees) this.lastJSeenT = this.time;
    this.tomSees = sees;
    this.jerrySeesTom = dist < 7 || (dist < 28 && !this.world.lineBlocked(J.p.x, J.p.y + 1.1, J.p.z, T.p.x, T.p.y + 2, T.p.z));
  }

  // ---------------- asosiy tsikl ----------------
  update(dt) {
    if (this.paused) return;
    const J = this.jerry, T = this.tom, P = this.player;
    hud.tick(dt);
    if (this.phase === 'intro') {
      const prev = Math.ceil(this.introT); this.introT -= dt; const now = Math.ceil(this.introT);
      this.app.countdown(now > 0 ? now : 'QOCH!');
      if (now !== prev) SND.play(now > 0 ? 'count' : 'go');
      if (this.introT <= 0) { this.phase = 'play'; this.app.countdown(null); }
    } else if (this.phase === 'play') {
      this.time += dt; this.left = MATCH_TIME - this.time;
      if (this.left <= 0) this.finish(false);
    } else if (this.phase === 'end') {
      this.endT -= dt;
      if (this.endT <= 0 && !this.ended) { this.ended = true; this.app.onMatchEnd(this.result); }
    }
    const playing = this.phase === 'play';
    for (const e of [J, T]) {
      e.stun = Math.max(0, e.stun - dt); e.invul = Math.max(0, e.invul - dt); e.pounceCd = Math.max(0, (e.pounceCd || 0) - dt);
      e.speedT = Math.max(0, e.speedT - dt); e.invis = Math.max(0, e.invis - dt); e.magnet = Math.max(0, e.magnet - dt); e.celebrate = Math.max(0, (e.celebrate || 0) - dt);
      if (e.shield > 0) { e.shield -= dt; if (e.shield <= 0) this.bubble.visible = false; }
    }
    this.radarT = Math.max(0, this.radarT - dt);
    this.visT -= dt; if (this.visT <= 0) { this.visT = .1; this.vision(); if (this.tomSees) this.lastTomSeeT = this.time; }

    // o'yinchi
    if (playing && !(P.hidden)) this.playerInput(dt);
    else if (!P.hidden) this.drive(P, null, 0, dt, 0);
    if (P.hidden) { this.hideT += dt; if (this.hideT > HIDE_MAX) this.exitHide(P, true); }
    if (this.checkT > 0) { this.checkT -= dt; if (this.checkT <= 0) this.finishCheck(); }

    // raqib (AI)
    let aiAnim = null;
    if (this.tomAI) {
      if (playing && T.stun <= 0 && !(T.celebrate > 0)) {
        const o = this.tomAI.update(dt); aiAnim = o.anim;
        if (o.pounce) this.pounce(T);
        let sp = o.speed; if (T.speedT > 0) sp *= 1.3;
        this.drive(T, o.dir, sp, dt, o.jump ? Math.sqrt(2 * 34 * o.jump) : 0);
      } else this.drive(T, null, 0, dt, 0);
      if (J.hidden && this.tomAI.state === 'search') this.searchedWhileHidden = true;
    }
    if (this.jerryAI) {
      if (playing && J.stun <= 0 && !J.hidden) {
        const o = this.jerryAI.update(dt);
        if (o.hide) this.enterHide(J, o.hide);
        else {
          J.sprinting = o.sprint && J.stam > .05;
          J.stam = clamp(J.stam + (J.sprinting ? -.25 : .22) * dt, 0, 1);
          this.drive(J, o.dir, J.sprinting ? 12.6 : (o.speed || 0), dt, 0);
        }
      } else if (J.hidden && playing) { const o = this.jerryAI.update(dt); if (o.exit) this.exitHide(J); }
      else if (!J.hidden) this.drive(J, null, 0, dt, 0);
    }
    this.updateSpike(dt);
    this.updateGuide(dt);

    // chiqqandan keyin Tom ko'rib qoldimi
    if (this.exitCheck > 0) {
      this.exitCheck -= dt;
      if (this.tomSees) { this.exitCheck = 0; hud.flashRed(1.8); SND.play('spotted'); hud.toast("TOM SENI KO'RDI!", 'red', 1.6); this.lastTomSeeT = this.time; }
      else if (this.exitCheck <= 0 && this.exitSearched) { this.escapes++; this.cheeseN += 10; SND.play('escape'); hud.toast('QOCHIB QUTULDING! +10 sir', 'green', 1.8); }
    }

    // ushlash
    if (playing && !J.hidden && T.stun <= 0 && !(T.celebrate > 0)) {
      const dist = d2(J.p, T.p);
      if (dist < (T.pounceT > 0 ? 2.3 : 1.8) && Math.abs(J.p.y - T.p.y) < 2.2) this.caught();
    }
    // tuzoqlar
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i]; tr.t -= dt;
      const victim = tr.type === 'banana' ? T : J;
      if (playing && !victim.hidden && victim.onGround && d2(victim.p, tr.p) < (tr.type === 'banana' ? 1.2 : .95) && Math.abs(victim.p.y - tr.p.y) < .6) {
        if (tr.type === 'banana') { T.stun = 3; T.v.set(Math.sin(T.yaw) * 8, 5, Math.cos(T.yaw) * 8); SND.play('slip'); if (this.me === 'jerry') hud.toast("Tom sirpanib ketdi!", 'green'); }
        else { J.stun = 2.5; J.v.set(0, 0, 0); SND.play('trap'); hud.toast(this.me === 'tom' ? 'Jerry tuzoqqa tushdi!' : 'Tuzoq!', this.me === 'tom' ? 'gold' : 'red'); }
        PR.poof(tr.p.clone().setY(.4), '#ffe9a8', 10, .6);
        gfx.scene.remove(tr.mesh); this.traps.splice(i, 1); continue;
      }
      if (tr.t <= 0) { gfx.scene.remove(tr.mesh); this.traps.splice(i, 1); }
    }
    // sirlar
    this.cheese.update(dt, this.time + this.introT);
    if (!J.hidden) for (const it of this.cheese.items) {
      if (!it.on) continue;
      if (J.magnet > 0 && this.me === 'jerry') { const dd = it.p.distanceTo(J.p); if (dd < 11) it.p.lerp(J.p, Math.min(1, dt * 5 / Math.max(.5, dd / 4))); }
      if (Math.abs(it.p.x - J.p.x) < 1.15 && Math.abs(it.p.z - J.p.z) < 1.15 && Math.abs(it.p.y + .55 - (J.p.y + .6)) < 1.3) {
        this.cheese.take(it);
        if (this.me === 'jerry') { this.cheeseN++; SND.play('cheese'); }
      }
    }
    // spot silkinishi
    for (const h of this.world.hides) {
      if (h.wob > 0) { h.wob = Math.max(0, h.wob - dt * 1.6); h.inner.rotation.z = Math.sin(this.time * 40) * .06 * h.wob; h.inner.position.y = Math.abs(Math.sin(this.time * 30)) * .08 * h.wob; }
      else if (h.inner.rotation.z) { h.inner.rotation.z = 0; h.inner.position.y = 0; }
    }
    if (J.hidden && this.me === 'tom' && Math.random() < dt * .25) J.hidden.wob = Math.max(J.hidden.wob, .25); // Jerry ichida qimirlaydi
    PR.updatePuffs(dt);
    this.guideFx.update(this.time);

    // modellar
    for (const e of [J, T]) {
      e.model.root.position.copy(e.p); e.model.root.rotation.y = e.yaw;
      let a = this.animOf(e);
      if (e === T && aiAnim && !(T.stun > 0) && !(T.celebrate > 0) && e.pounceT <= 0 && (aiAnim === 'search' || aiAnim === 'celebrate')) a = aiAnim;
      if (e === T && this.checkT > 0) a = 'search';
      if (this.phase === 'intro') a = e === P ? 'idle' : 'idle';
      if (this.phase === 'end') a = (e.kind === 'tom') === this.tomWon ? 'celebrate' : 'stunned';
      e.model.lookPitch = e === P && !P.hidden ? clamp(-this.cam.pitch * .6, -.5, .45) : 0;
      e.model.update(dt, a, Math.hypot(e.v.x, e.v.z), 0, e === P && P.backward && a !== 'idle');
    }
    const near = this.camNear ? .3 : 1;
    J.model.setOpacity(Math.min(this.me === 'jerry' ? near : 1, J.invis > 0 ? .28 : J.invul > 0 ? (Math.sin(this.time * 30) > 0 ? 1 : .35) : 1));
    if (this.me === 'tom') T.model.setOpacity(near);
    if (this.me === 'jerry' && !J.hidden) J.model.root.visible = !this.isFP();
    if (this.me === 'tom') T.model.root.visible = !this.isFP();
    this.camera(dt);
    this.updateHud();
    for (const a of this.world.anim) a(this.time + 100);
    updateGfx(dt, P.p, this.time + this.introT);
  }
  isFP() { return (this.cam.fp || this.cam.fpHold) && !this.player.hidden && this.phase !== 'end'; }

  // ---------------- kamera ----------------
  camera(dt) {
    const cam = gfx.camera, P = this.player, c = this.cam;
    const fov = this.app.settings.fov || 70;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    let tx = P.p.x, ty = P.p.y + P.h * .78, tz = P.p.z;
    if (P.hidden) { tx = P.hidden.ax; tz = P.hidden.az; ty = 2; }
    const yaw = c.yaw, pitch = c.pitch;
    const fx = Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = Math.cos(yaw) * Math.cos(pitch);
    if (this.isFP()) {
      const eye = P.p.y + P.h * .86;
      cam.position.set(P.p.x + Math.sin(yaw) * P.r * .6, eye, P.p.z + Math.cos(yaw) * P.r * .6);
      cam.lookAt(cam.position.x + fx, cam.position.y + fy, cam.position.z + fz);
      return;
    }
    const base = (P.kind === 'jerry' ? 4.4 : 7.6) * c.dist * (P.hidden ? 1.6 : 1);
    // to'siqqa qadar masofa
    let want = base;
    const W = this.world;
    for (let s = .5; s <= base; s += .25) {
      const x = tx - fx * s, y = ty - fy * s + .3, z = tz - fz * s;
      if (W.pointBlocked(x, y, z, .22)) { want = Math.max(.6, s - .35); break; }
    }
    c.cur += (want - c.cur) * Math.min(1, dt * (want < c.cur ? 18 : 3.5));
    this.camNear = c.cur < (P.kind === 'jerry' ? 1.5 : 2.6);
    let px = tx - fx * c.cur, py = ty - fy * c.cur + .3, pz = tz - fz * c.cur;
    py = clamp(py, .4, 13.4);
    const sh = this.app.shakeAmt || 0;
    cam.position.set(px + (Math.random() - .5) * sh, py + (Math.random() - .5) * sh, pz + (Math.random() - .5) * sh);
    cam.lookAt(tx, ty + .2, tz);
  }

  // ---------------- HUD ----------------
  updateHud() {
    const J = this.jerry, T = this.tom, me = this.me, P = this.player;
    let eye;
    if (me === 'jerry') eye = J.hidden ? (['search', 'pull'].includes(this.tomAI.state) && d2(T.p, J.p) < 22 ? 'search' : 'closed') : this.tomSees ? 'open' : this.tomAI.state === 'search' ? 'search' : 'closed';
    else eye = this.tomSees ? 'open' : this.time - this.lastJSeenT < 4 ? 'search' : 'closed';
    hud.setEye(eye, me);
    const dist = d2(J.p, T.p);
    hud.danger(me === 'jerry' && this.phase === 'play' && !J.hidden && this.tomAI.state === 'chase' && dist < 11);
    hud.stats({ time: this.phase === 'intro' ? MATCH_TIME : this.left, lives: this.lives, maxLives: LIVES, cheese: this.cheeseN, stamina: P.stam, me, catches: this.catches });
    hud.hotbar(me, this.inv, this.active);
    const room = this.world.roomAt(P.p.x, P.p.z); hud.room(room ? room.name : '');
    // yordamchi matn
    let pr = '';
    if (me === 'jerry') {
      if (J.hidden) pr = `<b>${J.hidden.name}</b> ichida yashiringansan — <kbd>C</kbd> chiqish`;
      else if (!this.guide) { const n = this.nearestSpots(J.p, 1)[0]; pr = n && d2(J.p, { x: n.ax, z: n.az }) < 2.2 ? `<kbd>C</kbd> — ${n.name}ga yashirinish` : `<kbd>C</kbd> — eng yaqin yashirinish joyi`; }
    } else {
      const n = this.nearestSpots(T.p, 1)[0];
      pr = this.checkT > 0 ? 'Tekshiryapsan...' : n && d2(T.p, n) < n.r + 3.8 ? `<kbd>C</kbd> — ${n.name}ni tekshirish` : `<kbd>C</kbd> — yashirinish joyini ko'rsat · <kbd>LMB</kbd> — tashlanish`;
    }
    hud.prompt(pr);
    hud.hideBar(!!J.hidden && me === 'jerry', 1 - this.hideT / HIDE_MAX);
    hud.crosshair(this.isFP());
    // xarita
    const jSeen = me === 'jerry' || this.radarT > 0 || this.time - this.lastJSeenT < 1;
    const md = {
      me, jp: J.hidden && me === 'tom' && this.radarT <= 0 ? (this.lastJPos || J.p) : J.p, tp: T.p, yaw: this.cam.yaw,
      showJ: me === 'jerry' || jSeen || this.time - this.lastJSeenT < 8, jFaded: me === 'tom' && !jSeen, jUnknown: me === 'tom' && !jSeen,
      showT: true, tFaded: me === 'jerry' && !this.tomSees,
      hides: this.world.hides, guide: this.guide && this.guide.sp, cheese: this.cheese.items,
      hiddenSpot: me === 'jerry' ? J.hidden : (this.radarT > 0 ? J.hidden : null), time: this.time,
      marks: this.traps.map(t => ({ x: t.p.x, z: t.p.z, c: t.type === 'banana' ? '#fff176' : '#bcaaa4' })),
    };
    if (jSeen && !J.hidden) this.lastJPos = J.p.clone();
    hud.drawMap(md);
    if (this.bigOn) hud.drawBig(md, this.world.rooms);
  }

  dispose() {
    const c = gfx.renderer.domElement;
    if (this.touch) this.touch.detach();
    document.getElementById('hotbar').removeEventListener('pointerdown', this.h.hb);
    window.removeEventListener('keydown', this.h.kd); window.removeEventListener('keyup', this.h.ku);
    window.removeEventListener('mousemove', this.h.mm); c.removeEventListener('mousedown', this.h.md); window.removeEventListener('mouseup', this.h.mu);
    c.removeEventListener('wheel', this.h.wh); document.removeEventListener('pointerlockchange', this.h.pl); c.removeEventListener('contextmenu', this.h.cm);
    c.removeEventListener('pointerdown', this.h.td); window.removeEventListener('pointermove', this.h.tm); window.removeEventListener('pointerup', this.h.tu);
    for (const e of [this.jerry, this.tom]) { gfx.scene.remove(e.model.root); e.model.dispose(); }
    for (const tr of this.traps) gfx.scene.remove(tr.mesh);
    if (this.spike) gfx.scene.remove(this.spike.model.root);
    this.cheese.dispose(); this.guideFx.dispose();
    for (const h of this.world.hides) { h.wob = 0; h.inner.rotation.z = 0; h.inner.position.y = 0; }
    hud.show(false); hud.prompt(''); hud.guide('');
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
