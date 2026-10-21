// Bitta o'yin (raund): o'yinchi boshqaruvi (sichqoncha bilan qarash), kamera, yashirinish (C), buyumlar, ushlash, natija.
import * as THREE from 'three';
import { gfx, updateGfx } from './gfx.js';
import { moveBody } from './physics.js';
import { makeCharacter, makeSpike, DIM } from './models.js';
import * as SND from './audio.js';
import { hud } from './hud.js';
import { ITEMS, ABIL } from './catalog.js';
import * as PR from './props.js';
import { TomAI, JerryAI } from './ai.js';
import { attachTouch, isTouch } from './touch.js';
import { COLS } from './house.js';
import { Voice } from './voice.js';
import { nickHTML } from './ui.js';

const QUICK = ['Salom! 👋', "Yaxshi o'yin! 👍", 'Ushlolmaysan! 😜', 'Qayerdasan? 👀', 'Hahaha 😂', "Yana o'ynaymiz! 🔁"];
const $ = id => document.getElementById(id);

export const MATCH_TIME = 180, LIVES = 3, HIDE_MAX = 25;
const SPD = { jerry: { run: 9, sprint: 12.6, jump: 14.4 }, tom: { run: 10.6, sprint: 13.4, jump: 14.9 } };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lerpAng = (a, b, t) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * Math.min(1, t); };

export class Match {
  constructor(app, me, net) {
    this.app = app; this.me = me; this.net = net || null; this.world = app.world; this.navJ = app.navJ; this.navT = app.navT;
    this.time = 0; this.left = MATCH_TIME; this.lives = LIVES; this.catches = 0; this.cheeseN = 0; this.escapes = 0; this.finds = 0;
    this.phase = 'intro'; this.introT = 3.2; this.paused = false; this.endT = 0;
    this.keys = {}; this.cam = { yaw: 0, pitch: -.22, dist: 1, fp: false, cur: 4 };
    this.inv = app.data.inv; this.active = {};
    this.guide = null; this.guideFx = PR.makeGuide(); this.marks = []; this.traps = [];
    this.spike = null; this.spikeT = 0; this.radarT = 0; this.exitCheck = 0; this.lastTomSeeT = -99; this.lastJSeenT = -99;
    this.visT = 0; this.tomSees = false; this.jerrySeesTom = false; this.hideT = 0; this.checkT = 0; this.checkSpot = null; this.stepT = 0;
    const eq = Object.assign({}, app.data.equip.skin);
    if (this.net) { const os = (this.net.oppInfo || {}).skins || {}; const ok = me === 'jerry' ? 'tom' : 'jerry'; eq[ok] = os[ok] || 'classic'; }
    this.jerry = this.ent('jerry', eq.jerry); this.tom = this.ent('tom', eq.tom);
    this.bubble = PR.makeBubble(.95); this.jerry.model.root.add(this.bubble); this.bubble.position.y = .75;
    this.birds = PR.makeBirds(); this.tom.model.root.add(this.birds); this.birds.position.y = DIM.tom.h * .74; this.birds.scale.setScalar(1.5); this.nearJT = -99;
    // sirlar: mebel ustidagi + poldagi tasodifiy nuqtalar
    const pts = this.world.tops.filter(p => p.y < 9).map(p => p.clone());
    for (let i = 0; i < 90; i++) { const c = this.navJ.randomFree(); if (c) pts.push(new THREE.Vector3(c[0], 0, c[1])); }
    this.cheese = PR.makeCheeseField(pts, 64);
    for (const h of this.world.hides) { h.wob = 0; }
    this.spawn();
    this.tomAI = me === 'jerry' && !this.net ? new TomAI(this) : null;
    this.jerryAI = me === 'tom' && !this.net ? new JerryAI(this) : null;
    this.player = me === 'jerry' ? this.jerry : this.tom;
    // o'yin egasi (Super Admin) Jerry bo'lsa — Tom uni umuman ko'rmaydi (oldida yursa ham)
    this.owner = !!app.isSuper; this.jerry.ghost = this.owner && me === 'jerry';
    this.opp = me === 'jerry' ? this.tom : this.jerry;
    this.cam.yaw = this.player.yaw; this.cam.cur = me === 'jerry' ? 4.2 : 7;
    this.bind();
    if (isTouch()) attachTouch(this);
    if (this.net) this.netInit();
    hud.show(true);
    SND.setMood('chase');
    SND.playMusic(app.data.equip.music);
  }
  ent(kind, skin) {
    const model = makeCharacter(kind, skin || 'classic');
    gfx.scene.add(model.root);
    return { kind, model, p: new THREE.Vector3(), v: new THREE.Vector3(), r: kind === 'jerry' ? .36 : .85, h: DIM[kind].h, step: kind === 'jerry' ? .5 : .65,
      onGround: true, yaw: 0, stam: 1, stun: 0, dazed: 0, abCd: 0, hidden: null, sprinting: false, invis: 0, shield: 0, speedT: 0, magnet: 0, invul: 0, pounceT: 0, anim: 'idle' };
  }
  spawn() {
    const rooms = this.world.rooms, J = this.jerry, T = this.tom;
    const lr = rooms.find(r => r.key === 'living');
    const jp = this.navJ.nearestFree(lr.ox + 6, lr.oz + 13);
    J.p.set(jp[0], 0, jp[1]); J.yaw = Math.PI / 2;
    const far = ['laundry', 'storage', 'garden', 'bedroom'][this.net ? this.net.seed % 4 : Math.floor(Math.random() * 4)];
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
      pl: () => { const locked = document.pointerLockElement === c; hud.lockHint(!locked && !this.paused && this.phase !== 'end' && !this.chatOpen); if (!locked && this.phase === 'play' && !this.paused && !this.app.ignoreUnlock && !this.chatOpen) this.app.pause(); },
      cm: e => e.preventDefault(),
    };
    window.addEventListener('keydown', this.h.kd); window.addEventListener('keyup', this.h.ku);
    window.addEventListener('mousemove', this.h.mm); c.addEventListener('mousedown', this.h.md); window.addEventListener('mouseup', this.h.mu);
    c.addEventListener('wheel', this.h.wh, { passive: true }); document.addEventListener('pointerlockchange', this.h.pl); c.addEventListener('contextmenu', this.h.cm);
    // sichqonchasiz qurilmalar uchun: tortib qarash
    this.h.tm = e => { if (this.drag) { this.look((e.clientX - this.drag[0]) * 1.5, (e.clientY - this.drag[1]) * 1.5); this.drag = [e.clientX, e.clientY]; } };
    // telefon — barmoq bilan; kompyuter — sichqoncha qulflanmasa, bosib sudrab qarash
    this.h.td = e => { if (e.pointerType !== 'mouse' || document.pointerLockElement !== c) this.drag = [e.clientX, e.clientY]; };
    this.h.tu = () => { this.drag = null; };
    c.addEventListener('pointerdown', this.h.td); window.addEventListener('pointermove', this.h.tm); window.addEventListener('pointerup', this.h.tu);
    this.h.hb = e => { const sl = e.target.closest('.slot'); if (sl) { e.preventDefault(); this.useItem(+sl.dataset.i); } };
    document.getElementById('hotbar').addEventListener('pointerdown', this.h.hb);
    this.h.ab = e => { e.preventDefault(); this.useAbility(this.player); };
    document.getElementById('abil').addEventListener('pointerdown', this.h.ab);
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
    if (this.paused || this.chatOpen) return;   // chat yozilayotganda o'yin tugmalari ishlamaydi
    if (down && this.net && (k === 'Enter' || k === 'NumpadEnter') && this.phase !== 'end') { e.preventDefault(); this.openChat(); return; }
    this.keys[k] = down;
    if (!down) return;
    if (['Space', 'Tab'].includes(k)) e.preventDefault();
    if (this.phase !== 'play') return;
    if (k === 'KeyC') this.pressC();
    else if (k === 'KeyV') this.cam.fp = !this.cam.fp;
    else if (k === 'KeyM') { this.bigOn = !this.bigOn; this.toggleBig(); }
    else if (k === 'KeyQ' && this.me === 'tom') this.pounce(this.tom);
    else if (k === 'KeyE') this.useAbility(this.player);
    else if (k === 'KeyT' && this.net) this.toggleMic();
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
    if (!sp || this.phase !== 'play') return;
    if (this.net) {
      if (this.jerry.hidden === sp) { this.netSend({ type: 'found', spot: sp.id }); this.finds++; hud.flashRed(1.4, '255,190,0'); hud.toast('TOPDING!', 'gold', 1.4); SND.play('found'); }
      else hud.toast(sp.name + " — bo'sh", '', 1);
      return;
    }
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
      case 'heart': if (this.lives >= 5) ok = false; else { this.lives++; hud.toast('+1 JON', 'green'); this.netSend({ type: 'lives', lives: this.lives }); } break;
      case 'shield': J.shield = 25; this.bubble.visible = true; break;
      case 'boots': J.speedT = 8; break;
      case 'spike': this.callSpike(); this.netSend({ type: 'spike' }); break;
      case 'banana': { const p = J.p.clone().add(new THREE.Vector3(-Math.sin(J.yaw) * 1.2, 0, -Math.cos(J.yaw) * 1.2)); this.addProp('banana', p.x, J.ground || 0, p.z, 0, true); break; }
      case 'invis': J.invis = 6; break;
      case 'magnet': J.magnet = 15; break;
      case 'radar': this.radarT = 6; break;
      case 'trap': this.addProp('trap', T.p.x, T.ground || 0, T.p.z, T.yaw, true); break;
      case 'claws': T.speedT = 8; break;
      case 'sniff':
        if (J.hidden && !J.ghost && d2(J.p, T.p) < 40) { const p = this.navT.find(T.p.x, T.p.z, J.hidden.ax, J.hidden.az); this.guide = { sp: J.hidden, path: p, t: .4 }; this.guideFx.set(p, J.hidden, '#ff5ca8'); hud.toast('Hid topildi!', 'gold'); }
        else { this.radarT = 3; hud.toast("Jerry yashirinmagan — xaritaga qara", '', 1.6); }
        break;
    }
    if (!ok) { SND.play('error'); return; }
    if (!this.app.isSuper) this.inv[it.id]--;
    this.app.saveSoon();
    this.active[it.id] = true; setTimeout(() => { this.active[it.id] = false; }, 400);
    SND.play('power');
    if (!['heart', 'sniff'].includes(it.id)) hud.toast(it.name + '!', 'green', 1);
  }
  // qobiliyat (E): Jerry — bomba, Tom — qopqon. Bepul, har 18 soniyada
  useAbility(e) {
    if (this.phase !== 'play' || e.hidden || e.stun > 0) return false;
    const A = ABIL[e.kind], mine = e === this.player;
    if (e.abCd > 0) { if (mine) { hud.toast(`${A.name} ${Math.ceil(e.abCd)} soniyadan keyin tayyor`, 'red', 1); SND.play('error'); } return false; }
    e.abCd = A.cd;
    const y = e.onGround ? e.p.y : (e.ground || 0);
    this.addProp(A.id, e.p.x, y, e.p.z, e.yaw, mine);
    if (e.kind === 'jerry') { SND.play('fuse'); if (mine) hud.toast("💣 Bomba qo'yildi — Tomni shu yerga olib kel!", 'green', 1.8); }
    else { SND.play('trap'); if (mine) hud.toast("🪤 Qopqon qo'yildi!", 'green', 1.2); }
    return true;
  }
  // bomba portladi: Tom 3 soniya o'tirib qoladi, boshida qushlar aylanadi
  bombHit(p, remote) {
    const T = this.tom;
    T.stun = 3; T.dazed = 3; T.pounceT = 0; T.v.set(0, remote ? 0 : 6, 0);
    PR.boom(p); SND.play('boom'); setTimeout(() => SND.play('tweet'), 500); this.app.shake(.9);
    if (this.net && !remote) this.netSend({ type: 'boom', x: p.x, y: p.y, z: p.z });
    if (this.me === 'jerry') hud.toast('💥 BUM! Tom 3 soniya hushsiz!', 'gold', 1.8);
    else { hud.flashRed(1.2, '255,140,0'); hud.toast('💥 BUM! Bombaga tushding!', 'red', 1.6); }
  }
  addProp(type, x, y, z, yaw = 0, broadcast = false, id) {
    id = id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const m = type === 'banana' ? PR.makeBanana() : type === 'bomb' ? PR.makeBomb() : PR.makeTrap();
    const p = new THREE.Vector3(x, y, z); m.position.copy(p); m.rotation.y = yaw; gfx.scene.add(m);
    this.traps.push({ type, p, mesh: m, t: type === 'banana' ? 40 : type === 'bomb' ? 45 : 60, arm: type === 'bomb' ? .7 : 0, id });
    if (broadcast) this.netSend({ type: 'prop', kind: type, x, y, z, yaw, id });
  }
  removeProp(id) { const i = this.traps.findIndex(t => t.id === id); if (i >= 0) { PR.poof(this.traps[i].p.clone().setY(.4), '#ffe9a8', 10, .6); gfx.scene.remove(this.traps[i].mesh); this.traps.splice(i, 1); } }
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
    this.respawnJerry();
  }
  respawnJerry() {
    const J = this.jerry, T = this.tom;
    // Jerry uzoqroqda paydo bo'ladi
    let pos = null;
    for (let k = 0; k < 80 && !pos; k++) { const c = this.navJ.randomFree(); if (c && Math.hypot(c[0] - T.p.x, c[1] - T.p.z) > 38 && this.navT.free(c[0], c[1])) pos = c; }
    if (pos) J.p.set(pos[0], 0, pos[1]);
    J.v.set(0, 0, 0); J.invul = 2.5; J.stun = 0; J.hidden = null; J.model.root.visible = true;
    PR.poof(J.p.clone().setY(.8), '#bfe9ff', 14, .8);
    if (this.jerryAI) { this.jerryAI.state = 'wander'; this.jerryAI.target = null; }
    if (this.me === 'jerry') this.cam.yaw = J.yaw;
  }
  finish(tomWon, fromNet) {
    if (this.phase === 'end') return;
    this.phase = 'end'; this.endT = 2.6; this.tomWon = tomWon;
    if (this.net && !fromNet) { this.netSend({ type: 'end', tomWon }); Promise.resolve(this.net.api.updateRoom(this.net.room, { status: 'end' })).catch(() => { }); }
    const win = this.me === 'tom' ? tomWon : !tomWon;
    SND.play(win ? 'win' : 'lose'); SND.stopMusic();
    hud.toast(win ? "G'ALABA!" : 'MAG\'LUBIYAT', win ? 'gold' : 'red', 2.4);
    const survived = Math.min(MATCH_TIME, this.time);
    let sir;
    if (this.me === 'jerry') sir = this.cheeseN + Math.floor(survived / 10) * 2 + this.escapes * 10 + (win ? 60 : 0);
    else sir = this.catches * 35 + this.finds * 10 + Math.floor(survived / 15) * 2 + (win ? 80 : 0);
    if (this.net && win) sir += 30;   // do'stni yutgani uchun bonus
    this.result = { online: !!this.net, oppNick: this.net && (this.net.oppInfo || {}).nick, win, me: this.me, sir, cheese: this.cheeseN, catches: this.catches, escapes: this.escapes, finds: this.finds, time: survived, lives: this.lives };
    document.exitPointerLock?.();
  }

  // ================= ONLAYN (do'st bilan) =================
  netInit() {
    const N = this.net.api, room = this.net.room;
    this.buf = []; this.sendT = 0; this.tagCd = 0; this.gotRemote = false; this.lastRemoteT = N.now();
    this.netUn = [
      N.watchState(room, this.net.opp, st => this.onRemote(st)),
      N.watchEvents(room, ev => { if (!ev.t || ev.t > this.net.startAt - 6000) this.onNetEvent(ev); }), // eski (oldingi raund) hodisalar emas
      N.watchRoom(room, r => { if (r && r.left && r.left[this.net.opp]) this.oppLeft(); }),
    ];
    N.armDisconnect(room);
    this.chatInit();
    // guruhdan kelgan bo'lsa — o'sha ovozli aloqa davom etadi
    if (this.net.voice) { this.voice = this.net.voice; this.voice.onChange = () => this.voiceUI(); }
    else this.voice = new Voice(o => N.sendEvent(room, Object.assign({ type: 'rtc' }, o)), this.app.user.uid < this.net.opp, () => this.voiceUI());
    const nick = (this.net.oppInfo || {}).nick || "Do'st";
    hud.say(`Siz ${this.me === 'tom' ? 'TOM' : 'JERRY'} bo'ldingiz! Raqib: ${nick}`, 'gold', 4.5);
  }
  netSend(ev) { if (this.net) this.net.api.sendEvent(this.net.room, ev); }
  onRemote(st) {
    if (!st) { if (this.gotRemote && this.phase === 'play') this.oppLeft(); return; }
    this.gotRemote = true; this.lastRemoteT = this.net.api.now();
    this.buf.push(st); if (this.buf.length > 40) this.buf.shift();
  }
  oppLeft() {
    if (this.phase === 'end' || this.leftShown) return;
    this.leftShown = true;
    hud.toast("Raqib o'yindan chiqib ketdi", 'yellow', 2.4);
    this.finish(this.me === 'tom', true);
  }
  onNetEvent(ev) {
    const J = this.jerry, T = this.tom;
    switch (ev.type) {
      case 'tag': if (this.me === 'jerry' && this.phase === 'play') this.netTagged(); break;
      case 'caught':
        if (this.me !== 'tom') break;
        this.lives = ev.lives; this.catches++;
        SND.play('caught'); PR.poof(J.p.clone().setY(.8), '#ffffff', 18, 1); this.app.shake(.6);
        hud.toast(ev.lives > 0 ? `USHLADING! (${ev.lives} qoldi)` : "G'ALABA!", 'gold', 1.8);
        T.celebrate = 1.4; this.buf.length = 0;
        if (ev.lives <= 0) this.finish(true, true);
        break;
      case 'blocked': if (this.me === 'tom') { T.stun = 1.1; hud.toast('Jerryda qalqon bor edi!', 'yellow'); } break;
      case 'lives': this.lives = ev.lives; break;
      case 'found': if (this.me === 'jerry' && J.hidden && J.hidden.id === ev.spot) this.tomFinds(J.hidden); break;
      case 'prop': this.addProp(ev.kind, ev.x, ev.y, ev.z, ev.yaw || 0, false, ev.id); break;
      case 'propgone': this.removeProp(ev.id); break;
      case 'boom': this.bombHit(new THREE.Vector3(ev.x, ev.y, ev.z), true); break;
      case 'trapped': if (this.me === 'tom') { SND.play('trap'); hud.toast('Jerry qopqonga tushdi!', 'gold'); } break;
      case 'spike': if (this.me === 'tom') { this.callSpike(); T.slowT = 8; hud.toast('SPIKE seni quvlayapti!', 'red', 1.6); } break;
      case 'end': this.finish(ev.tomWon, true); break;
      case 'chat': { const oi = this.net.oppInfo || {}; this.addChat(oi.nick || 'Raqib', oi.color, ev.text, false); SND.play('squeak'); break; }
      case 'rtc': if (this.voice) this.voice.onSignal(ev); break;
    }
  }
  // Jerry o'z kompyuterida ushlanishni hal qiladi (qalqon, daxlsizlik)
  netTagged() {
    const J = this.jerry, T = this.tom;
    if (J.invul > 0 || J.hidden) return;
    if (J.shield > 0) {
      J.shield = 0; this.bubble.visible = false; J.invul = 1.2;
      const dx = J.p.x - T.p.x, dz = J.p.z - T.p.z, L = Math.hypot(dx, dz) || 1; J.v.set(dx / L * 14, 6, dz / L * 14);
      hud.toast('Qalqon saqladi!', 'green'); SND.play('unhide'); this.netSend({ type: 'blocked' }); return;
    }
    this.lives--; this.catches++;
    this.netSend({ type: 'caught', lives: this.lives });
    SND.play('caught'); PR.poof(J.p.clone().setY(.8), '#ffffff', 18, 1); this.app.shake(.6);
    hud.flashRed(1.3); hud.toast(this.lives > 0 ? `USHLANDING! (${this.lives} jon qoldi)` : 'USHLANDING!', 'red', 1.8);
    if (this.lives <= 0) { this.finish(true); return; }
    this.respawnJerry();
  }
  netTick(dt) {
    const N = this.net.api, now = N.now(), P = this.player, O = this.opp;
    this.tagCd = Math.max(0, this.tagCd - dt);
    this.sendT -= dt;
    if (this.sendT <= 0 && this.phase !== 'end') {
      this.sendT = 1 / 12;
      const r2 = v => Math.round(v * 100) / 100;
      N.sendState(this.net.room, { x: r2(P.p.x), y: r2(P.p.y), z: r2(P.p.z), yaw: r2(P.yaw), cy: r2(this.cam.yaw), a: this.animOf(P), h: P.hidden ? P.hidden.id : -1, inv: P.invis > 0 ? 1 : 0, iv: P.invul > 0 ? 1 : 0, sh: P.shield > 0 ? 1 : 0, gh: P.ghost ? 1 : 0, t: now });
    }
    const b = this.buf;
    if (!b.length) return;
    const rt = now - 150;
    let s0 = b[0], s1 = b[b.length - 1];
    for (let i = 0; i < b.length - 1; i++) if (b[i].t <= rt && b[i + 1].t >= rt) { s0 = b[i]; s1 = b[i + 1]; break; }
    const span = s1.t - s0.t, k = span > 0 ? clamp((rt - s0.t) / span, 0, 1.25) : 1;
    // juda katta sakrash (qayta paydo bo'lish) — interpolyatsiyasiz
    const jump = Math.hypot(s1.x - s0.x, s1.z - s0.z) > 12;
    const kk = jump ? 1 : k;
    O.p.set(s0.x + (s1.x - s0.x) * kk, s0.y + (s1.y - s0.y) * kk, s0.z + (s1.z - s0.z) * kk);
    O.yaw = lerpAng(s0.yaw, s1.yaw, kk); O.lookYaw = s1.cy;
    if (span > 0) O.v.set((s1.x - s0.x) / span * 1000, 0, (s1.z - s0.z) / span * 1000);
    O.onGround = true;
    this.oppAnim = s1.a;
    const sp = s1.h >= 0 ? this.world.hides[s1.h] : null;
    if (sp !== O.hidden) { if (sp) sp.wob = 1; else if (O.hidden) O.hidden.wob = .8; O.hidden = sp; }
    O.model.root.visible = !O.hidden;
    O.invisR = s1.inv; O.invulR = s1.iv; if (O.kind === 'jerry') O.ghost = !!s1.gh;
    if (O.kind === 'jerry') this.bubble.visible = !!s1.sh;
    if (this.phase === 'play' && this.gotRemote && now - this.lastRemoteT > 15000) this.oppLeft();
    // raqib nomi boshida
    const tag = document.getElementById('oppTag');
    if (tag) {
      const v = new THREE.Vector3(O.p.x, O.p.y + O.h + .5, O.p.z).project(gfx.camera);
      const vis = !O.hidden && v.z < 1 && !(this.me === 'tom' && (O.invisR || O.ghost));
      tag.classList.toggle('hidden', !vis);
      if (vis) { tag.style.left = (v.x * .5 + .5) * window.innerWidth + 'px'; tag.style.top = (-v.y * .5 + .5) * window.innerHeight + 'px'; const oi = this.net.oppInfo || {}; tag.textContent = (oi.title === 'super' ? '👑 SUPER ADMIN · ' : oi.title === 'admin' ? '⭐ ADMIN · ' : '') + (oi.nick || ''); }
    }
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
    if (e.dazed > 0) return 'dazed';
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
    if (P.slowT > 0) sp *= .55;
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
    if (!J.ghost && !J.hidden && (J.invis <= 0 || dist < 2.5) && dist < 44) {
      const fy = this.me === 'tom' ? this.cam.yaw : (this.net && T.lookYaw !== undefined ? T.lookYaw : T.yaw);
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
      const prev = Math.ceil(this.introT); this.introT = this.net ? (this.net.startAt - this.net.api.now()) / 1000 : this.introT - dt; const now = Math.ceil(this.introT);
      this.app.countdown(now > 0 ? now : 'QOCH!');
      if (now !== prev) SND.play(now > 0 ? 'count' : 'go');
      if (this.introT <= 0) { this.phase = 'play'; this.app.countdown(null); }
    } else if (this.phase === 'play') {
      this.time = this.net ? Math.max(0, (this.net.api.now() - this.net.startAt) / 1000) : this.time + dt; this.left = MATCH_TIME - this.time;
      if (this.left <= 0) this.finish(false);
    } else if (this.phase === 'end') {
      this.endT -= dt;
      if (this.endT <= 0 && !this.ended) { this.ended = true; this.app.onMatchEnd(this.result); }
    }
    const playing = this.phase === 'play';
    for (const e of [J, T]) {
      e.stun = Math.max(0, e.stun - dt); e.invul = Math.max(0, e.invul - dt); e.pounceCd = Math.max(0, (e.pounceCd || 0) - dt);
      e.speedT = Math.max(0, e.speedT - dt); e.invis = Math.max(0, e.invis - dt); e.magnet = Math.max(0, e.magnet - dt); e.celebrate = Math.max(0, (e.celebrate || 0) - dt);
      e.slowT = Math.max(0, (e.slowT || 0) - dt); e.dazed = Math.max(0, e.dazed - dt); e.abCd = Math.max(0, e.abCd - dt);
      if (e.shield > 0) { e.shield -= dt; if (e.shield <= 0) this.bubble.visible = false; }
    }
    this.radarT = Math.max(0, this.radarT - dt);
    this.visT -= dt; if (this.visT <= 0) { this.visT = .1; const was = this.tomSees; this.vision(); if (this.net && this.tomSees && !was) this.onTomSpots(); if (this.tomSees) this.lastTomSeeT = this.time; }
    if (this.net) this.netTick(dt);

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
    // AI ham qobiliyatini ishlatadi: Jerry quvilganda bomba tashlaydi, Tom qidirganda qopqon qo'yadi
    if (playing && this.jerryAI && !J.hidden && J.stun <= 0 && J.abCd <= 0 && J.onGround && this.jerryAI.state === 'flee' && d2(J.p, T.p) < 10 && Math.random() < dt * 1.5) this.useAbility(J);
    if (playing && this.tomAI && T.stun <= 0 && T.abCd <= 0 && T.onGround && ['search', 'patrol'].includes(this.tomAI.state) && Math.random() < dt * .12) this.useAbility(T);
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
      const dist = d2(J.p, T.p), hit = dist < (T.pounceT > 0 ? 2.3 : 1.8) && Math.abs(J.p.y - T.p.y) < 2.2;
      if (!this.net) { if (hit) this.caught(); }
      else if (this.me === 'tom' && hit && !J.invulR && this.tagCd <= 0) { this.tagCd = 1.2; this.netSend({ type: 'tag' }); }
    }
    // tuzoqlar
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i]; tr.t -= dt;
      if (tr.arm > 0) tr.arm -= dt;
      if (tr.type === 'bomb') PR.tickBomb(tr.mesh, this.time);
      const victim = tr.type === 'trap' ? J : T, bomb = tr.type === 'bomb';
      const rad = tr.type === 'banana' ? 1.2 : bomb ? 1.8 : .95;
      if (playing && !(tr.arm > 0) && (!this.net || victim === P) && !victim.hidden && (bomb || victim.onGround) && d2(victim.p, tr.p) < rad && Math.abs(victim.p.y - tr.p.y) < (bomb ? 1.8 : .6)) {
        if (tr.type === 'banana') { T.stun = 3; T.v.set(Math.sin(T.yaw) * 8, 5, Math.cos(T.yaw) * 8); SND.play('slip'); if (this.me === 'jerry') hud.toast("Tom sirpanib ketdi!", 'green'); }
        else if (bomb) this.bombHit(tr.p);
        else { J.stun = 3; J.v.set(0, 0, 0); J.p.x = tr.p.x; J.p.z = tr.p.z; SND.play('trap'); hud.toast(this.me === 'tom' ? 'Jerry qopqonga tushdi! (3 s)' : 'Qopqon! 3 soniya qimirlay olmaysan', this.me === 'tom' ? 'gold' : 'red'); if (this.net) this.netSend({ type: 'trapped' }); }
        PR.poof(tr.p.clone().setY(.4), '#ffe9a8', 10, .6);
        if (this.net) this.netSend({ type: 'propgone', id: tr.id });
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
    if (J.hidden && !J.ghost && this.me === 'tom' && Math.random() < dt * .25) J.hidden.wob = Math.max(J.hidden.wob, .25); // Jerry ichida qimirlaydi
    PR.updatePuffs(dt);
    this.guideFx.update(this.time);

    // modellar
    for (const e of [J, T]) {
      e.model.root.position.copy(e.p); e.model.root.rotation.y = e.yaw;
      let a = this.animOf(e);
      if (e === T && aiAnim && !(T.stun > 0) && !(T.celebrate > 0) && e.pounceT <= 0 && (aiAnim === 'search' || aiAnim === 'celebrate')) a = aiAnim;
      if (e === T && this.checkT > 0) a = 'search';
      if (this.net && e === this.opp && this.phase !== 'end') a = this.oppAnim || 'idle';
      if (this.phase === 'intro') a = e === P ? 'idle' : 'idle';
      if (this.phase === 'end') a = (e.kind === 'tom') === this.tomWon ? 'celebrate' : 'stunned';
      e.model.lookPitch = e === P && !P.hidden ? clamp(-this.cam.pitch * .6, -.5, .45) : 0;
      e.model.update(dt, a, Math.hypot(e.v.x, e.v.z), 0, e === P && P.backward && a !== 'idle');
      if (e === T) { this.birds.visible = a === 'dazed'; if (this.birds.visible) PR.updateBirds(this.birds, this.time); }
    }
    const near = this.camNear ? .3 : 1;
    J.model.setOpacity(Math.min(this.me === 'jerry' ? near : 1, J.invis > 0 ? .28 : J.invul > 0 ? (Math.sin(this.time * 30) > 0 ? 1 : .35) : 1));
    if (this.me === 'tom') T.model.setOpacity(near);
    if (this.net && this.me === 'tom') J.model.setOpacity(J.invisR ? .08 : J.invulR ? (Math.sin(this.time * 30) > 0 ? 1 : .35) : 1);
    if (this.me === 'tom' && J.ghost) J.model.root.visible = false;
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
    const ts = this.tomAI ? this.tomAI.state : this.tomSees ? 'chase' : (this.time - this.lastTomSeeT < 5 ? 'search' : '');
    if (me === 'jerry') eye = J.hidden ? (['search', 'pull'].includes(ts) && d2(T.p, J.p) < 22 ? 'search' : 'closed') : this.tomSees ? 'open' : ts === 'search' ? 'search' : 'closed';
    else eye = this.tomSees ? 'open' : this.time - this.lastJSeenT < 4 ? 'search' : 'closed';
    hud.setEye(eye, me);
    const dist = d2(J.p, T.p);
    hud.danger(me === 'jerry' && this.phase === 'play' && !J.hidden && ts === 'chase' && dist < 11);
    hud.stats({ time: this.phase === 'intro' ? MATCH_TIME : this.left, lives: this.lives, maxLives: LIVES, cheese: this.cheeseN, stamina: P.stam, me, catches: this.catches });
    hud.hotbar(me, this.inv, this.active);
    hud.ability(ABIL[me], P.abCd);
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
    // Tom uchun: Jerry shu xonada yoki yonidagi xonada bo'lsa, boshi ko'rinadi
    const nearJ = me === 'tom' && this.owner && this.phase === 'play' && !J.hidden && !J.ghost && !(J.invis > 0 || J.invisR) && this.nearRoom(T.p, J.p);
    this.jerryMark(nearJ && !this.tomSees);
    if (nearJ && !this.nearWas && this.time - this.nearJT > 8) { this.nearJT = this.time; hud.say('🐭 Jerry yaqin xonada!', 'gold', 1.8); }
    this.nearWas = nearJ;
    const jSeen = me === 'jerry' || (this.radarT > 0 && !J.ghost) || nearJ || this.time - this.lastJSeenT < 1;
    const md = {
      me, jp: J.hidden && me === 'tom' && this.radarT <= 0 ? (this.lastJPos || J.p) : J.p, tp: T.p, yaw: this.cam.yaw,
      showJ: me === 'jerry' || jSeen || this.time - this.lastJSeenT < 8, jFaded: me === 'tom' && !jSeen, jUnknown: me === 'tom' && !jSeen,
      showT: true, tFaded: me === 'jerry' && !this.tomSees,
      hides: this.world.hides, guide: this.guide && this.guide.sp, cheese: this.cheese.items,
      hiddenSpot: me === 'jerry' ? J.hidden : (this.radarT > 0 && !J.ghost ? J.hidden : null), time: this.time,
      marks: this.traps.map(t => ({ x: t.p.x, z: t.p.z, c: t.type === 'banana' ? '#fff176' : t.type === 'bomb' ? '#ff5a1f' : '#bcaaa4' })),
    };
    if (jSeen && !J.hidden) this.lastJPos = J.p.clone();
    hud.drawMap(md);
    if (this.bigOn) hud.drawBig(md, this.world.rooms);
  }

  // ---------------- chat va mikrofon (faqat do'st bilan o'yinda) ----------------
  chatInit() {
    $('netBar').classList.remove('hidden'); $('chatBox').innerHTML = '';
    $('btnChat').onclick = () => this.chatOpen ? this.closeChat() : this.openChat();
    $('btnMic').onclick = () => this.toggleMic();
    $('btnChatSend').onclick = () => { this.sendChat($('chatInput').value); this.closeChat(); };
    $('chatInput').onkeydown = e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.sendChat(e.target.value); this.closeChat(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.closeChat(); }
    };
    $('chatQuick').innerHTML = QUICK.map((q, i) => `<button class="chip" data-q="${i}">${q}</button>`).join('');
    $('chatQuick').onclick = e => { const b = e.target.closest('[data-q]'); if (b) { this.sendChat(QUICK[+b.dataset.q]); this.closeChat(); } };
    this.voiceUI();
  }
  openChat() {
    if (this.chatOpen) return;
    this.chatOpen = true; this.keys = {};
    $('chatBar').classList.remove('hidden'); $('chatInput').value = '';
    if (document.pointerLockElement) document.exitPointerLock();
    hud.lockHint(false);
    setTimeout(() => $('chatInput').focus(), 30);
  }
  closeChat() {
    if (!this.chatOpen) return;
    this.chatOpen = false; $('chatBar').classList.add('hidden'); $('chatInput').blur();
    if (!isTouch() && this.phase === 'play') this.lock();
  }
  sendChat(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!text || !this.net) return;
    const now = performance.now(); if (now - (this.lastChat || 0) < 700) return; this.lastChat = now; // juda tez yozmaslik
    this.netSend({ type: 'chat', text });
    this.addChat(this.app.profile.nick, this.app.profile.color, text, true);
  }
  addChat(nick, color, text, mine) {
    const box = $('chatBox'), d = document.createElement('div');
    d.className = 'cm' + (mine ? ' me' : '');
    d.innerHTML = nickHTML(nick, color) + ': ';
    d.appendChild(document.createTextNode(String(text).slice(0, 80)));
    box.appendChild(d);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => d.classList.add('fade'), 9000); setTimeout(() => d.remove(), 10000);
  }
  async toggleMic() {
    if (!this.voice) return;
    try {
      const on = await this.voice.toggleMic();
      hud.toast(on ? '🎤 Mikrofon yoqildi — raqib sizni eshitadi' : "🎤 Mikrofon o'chirildi", on ? 'green' : '', 1.6);
      if (this.voice.state !== 'connected') hud.say('Ovozli aloqa ulanmoqda...', '', 2);
    } catch (e) {
      SND.play('error');
      hud.toast(e && e.name === 'NotAllowedError' ? 'Mikrofonga ruxsat berilmadi (brauzer sozlamasidan ruxsat bering)' : (e.message || "Mikrofon ishlamadi"), 'red', 2.4);
    }
  }
  voiceUI() {
    const v = this.voice;
    $('btnMic').classList.toggle('on', !!(v && v.on));
    $('btnMic').title = v && v.on ? "Mikrofon yoqilgan (T — o'chirish)" : 'Mikrofon (T — yoqish)';
    $('oppVoice').classList.toggle('hidden', !(v && v.speaking));
  }

  // ikki joy bir xil yoki devori umumiy xonadami (hovlida — 24 m ichida)
  nearRoom(a, b) {
    const W = this.world, ra = W.roomAt(a.x, a.z), rb = W.roomAt(b.x, b.z);
    if (!ra || !rb) return d2(a, b) < 24;
    const ia = W.rooms.indexOf(ra), ib = W.rooms.indexOf(rb);
    return Math.abs(ia % COLS - ib % COLS) + Math.abs(Math.floor(ia / COLS) - Math.floor(ib / COLS)) <= 1;
  }
  // ekranda Jerry boshi (devor orqasidan ham) — ekrandan tashqarida bo'lsa chetida
  jerryMark(on) {
    if (!on) { hud.jerryMark(false); return; }
    const J = this.jerry, v = new THREE.Vector3(J.p.x, J.p.y + J.h + .6, J.p.z).project(gfx.camera);
    let x = v.x, y = v.y;
    if (v.z > 1) { x = -x; y = -y; const k = 1 / Math.max(Math.abs(x), Math.abs(y), 1e-3); x *= k; y *= k; }
    const edge = Math.abs(x) > .92 || Math.abs(y) > .86 || v.z > 1;
    x = clamp(x, -.92, .92); y = clamp(y, -.86, .86);
    hud.jerryMark(true, (x * .5 + .5) * window.innerWidth, (-y * .5 + .5) * window.innerHeight, edge);
  }

  dispose() {
    const c = gfx.renderer.domElement;
    hud.jerryMark(false);
    if (this.voice && !(this.net && this.net.voice)) this.voice.close();
    this.voice = null;
    this.chatOpen = false; $('netBar').classList.add('hidden'); $('chatBar').classList.add('hidden'); $('chatBox').innerHTML = ''; $('oppVoice').classList.add('hidden');
    document.getElementById('abil').removeEventListener('pointerdown', this.h.ab);
    if (this.net) { (this.netUn || []).forEach(u => u && u()); this.net.api.leave(this.net.room, !!this.net.party); const tg = document.getElementById('oppTag'); if (tg) tg.classList.add('hidden'); }
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
