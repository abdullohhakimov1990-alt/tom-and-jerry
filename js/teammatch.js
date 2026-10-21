// Jamoaviy o'yin (Ulkan uy): 4 Tom va 6 Jerry. O'yinchi bittasini boshqaradi, qolganlarini botlar o'ynaydi.
// Tomlar hamma Jerrylarni ushlasa — Tomlar g'alaba qiladi; vaqt tugaguncha kamida bitta Jerry qolsa — Jerrylar.
import * as THREE from 'three';
import { Match } from './match.js';
import { makeCharacter } from './models.js';
import * as PR from './props.js';
import * as SND from './audio.js';
import { hud } from './hud.js';
import { TomAI, JerryAI } from './ai.js';
import { SETS } from './catalog.js';
import { DIM } from './models.js';
import { gfx } from './gfx.js';

const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const J_LIVES = 2;
const BOT_NAMES = {
  jerry: ["Pishloqxo'r", 'Tez_Oyoq', 'Kichkintoy', "Mo'ylovcha", 'Chaqqon', 'Sirchi', 'Nuqta'],
  tom: ['Panja', 'Mushukboy', 'Tunda_Ov', "Mo'ylov", 'Yo\'lbars'],
};

export class TeamMatch extends Match {
  constructor(app, me, team = { tom: 4, jerry: 6 }) {
    super(app, me, null);
    this.team = team; this.maxLives = me === 'jerry' ? J_LIVES : team.jerry; this.lives = me === 'jerry' ? J_LIVES : team.jerry;
    // super yaratgan juftlik: o'yinchi va bitta raqib — raqib endi bot bo'ladi
    this.tomAI = null; this.jerryAI = null;
    this.player.nick = app.profile.nick; this.player.isMe = true;
    this.jerries = [this.jerry]; this.toms = [this.tom];
    const skins = SETS.map(s => s.id), rnd = a => a[Math.floor(Math.random() * a.length)];
    const names = { jerry: BOT_NAMES.jerry.slice().sort(() => Math.random() - .5), tom: BOT_NAMES.tom.slice().sort(() => Math.random() - .5) };
    this.opp.nick = '🤖 ' + names[this.opp.kind].pop();
    for (const kind of ['jerry', 'tom']) {
      const list = kind === 'jerry' ? this.jerries : this.toms;
      while (list.length < team[kind]) {
        const e = this.ent(kind, Math.random() < .5 ? 'classic' : rnd(skins));
        e.nick = '🤖 ' + (names[kind].pop() || kind + list.length);
        list.push(e);
      }
    }
    for (const J of this.jerries) { J.lives = J_LIVES; J.out = false; }
    // har bir Tomga o'z qushchalari (bomba portlasa)
    this.tom.birds = this.birds;
    for (const T of this.toms) if (!T.birds) { T.birds = PR.makeBirds(); T.model.root.add(T.birds); T.birds.position.y = DIM.tom.h * .74; T.birds.scale.setScalar(1.5); }
    // botlar va ularning "ko'rinishi" (AI faqat o'z juftligini ko'radi)
    this.bots = [];
    for (const e of [...this.jerries, ...this.toms]) {
      if (e === this.player) continue;
      const bot = { e, kind: e.kind, target: null, threat: null, sees: false, thinkT: Math.random() * .4, seeT: 0 };
      bot.ai = e.kind === 'tom' ? new TomAI(this.view(bot)) : new JerryAI(this.view(bot));
      e.bot = bot; this.bots.push(bot);
    }
    this.teamSpawn();
    this.tags = document.getElementById('teamTags'); this.tags.innerHTML = ''; this.tags.classList.remove('hidden');
    for (const e of [...this.jerries, ...this.toms]) if (e !== this.player) { e.tag = document.createElement('div'); e.tag.className = 'ttag ' + (e.kind === this.me ? 'mate' : 'foe'); e.tag.textContent = e.nick; this.tags.appendChild(e.tag); }
    hud.say(this.me === 'jerry' ? `Siz 6 Jerrydan birisiz! 4 Tomdan qoching 🐭` : `Siz 4 Tomdan birisiz! 6 Jerryni ushlang 🐱`, 'gold', 4);
  }
  // AI uchun ko'rinish: Tom boti uchun "jerry" — uning nishoni, Jerry boti uchun "tom" — eng yaqin xavf
  view(bot) {
    const m = this;
    return {
      get tom() { return bot.kind === 'tom' ? bot.e : (bot.threat || m.toms[0]); },
      get jerry() { return bot.kind === 'jerry' ? bot.e : (bot.target || m.jerries[0]); },
      get tomSees() { return bot.sees; }, get jerrySeesTom() { return bot.sees; },
      get time() { return m.time; }, get spike() { return null; }, spikeT: 0,
      navT: m.navT, navJ: m.navJ, world: m.world, get cheese() { return m.cheese; },
      onTomSpots() { if (bot.target === m.player) m.onTomSpots(); },
      hudSay(t, c, onlyJ) { if (bot.target === m.player && d2(bot.e.p, m.player.p) < 25) m.hudSay(t, c, onlyJ); },
      tomShake() { m.tomShake(bot.target, bot.e); },
      tomFinds(sp) { m.tomFinds(sp, m.jerries.find(j => j.hidden === sp), bot.e); },
      tomPullsOut(sp) { m.tomPullsOut(sp, m.jerries.find(j => j.hidden === sp), bot.e); },
      jerryAlert() { },
    };
  }
  teamSpawn() {
    const rooms = this.world.rooms;
    const jr = rooms.filter(r => ['living', 'kids', 'dining', 'library'].includes(r.key));
    const tr = rooms.filter(r => ['laundry', 'storage', 'bedroom', 'garden', 'study'].includes(r.key));
    this.jerries.forEach((J, i) => { const R = jr[i % jr.length], c = this.navJ.nearestFree(R.ox + 6 + Math.random() * 14, R.oz + 6 + Math.random() * 14, 12); if (c) J.p.set(c[0], 0, c[1]); J.yaw = Math.random() * 6.28; });
    this.toms.forEach((T, i) => { const R = tr[(i * 2 + 1) % tr.length], c = this.navT.nearestFree(R.ox + 13, R.oz + 13, 12); if (c) T.p.set(c[0], 0, c[1]); });
    this.cam.yaw = this.player.yaw;
  }
  get alive() { return this.jerries.filter(j => !j.out); }

  // ---------------- ko'rish ----------------
  sight(T, J) {
    if (!J || J.out || J.hidden || J.ghost) return false;
    const dist = d2(T.p, J.p);
    if ((J.invis > 0 && dist > 2.5) || dist > 44) return false;
    const fy = T === this.player ? this.cam.yaw : T.yaw;
    const dx = (J.p.x - T.p.x) / (dist || 1), dz = (J.p.z - T.p.z) / (dist || 1);
    if (Math.sin(fy) * dx + Math.cos(fy) * dz < Math.cos(T === this.player ? 1.2 : 1.35) && dist > 6) return false;
    return !this.world.lineBlocked(T.p.x, T.p.y + 2.9, T.p.z, J.p.x, J.p.y + .7, J.p.z);
  }
  vision() {
    const P = this.player;
    if (this.me === 'jerry') {
      this.tomSees = !this.spectating && this.toms.some(T => this.sight(T, P));
      this.jerrySeesTom = true;
    } else {
      this.seenJ = this.alive.filter(J => this.sight(P, J));
      this.tomSees = this.seenJ.length > 0;
      if (this.tomSees) this.lastJSeenT = this.time;
    }
  }
  // o'yinchi uchun "asosiy juftlik": Jerry bo'lsa — eng yaqin Tom, Tom bo'lsa — eng yaqin Jerry
  focus() {
    const P = this.player;
    if (this.me === 'jerry') { this.jerry = P; this.tom = this.toms.reduce((a, b) => d2(a.p, P.p) < d2(b.p, P.p) ? a : b); }
    else { this.tom = P; const act = this.alive; if (act.length) this.jerry = act.reduce((a, b) => d2(a.p, P.p) < d2(b.p, P.p) ? a : b); }
    this.opp = this.me === 'jerry' ? this.tom : this.jerry;
  }

  // ---------------- ushlash ----------------
  caught(force) { this.teamCatch(this.jerry, this.tom, force); }
  teamCatch(J, T, force) {
    if (this.phase !== 'play' || !J || J.out) return;
    if (!force && J.invul > 0) return;
    if (J.shield > 0) {
      J.shield = 0; if (J === this.player) this.bubble.visible = false; J.invul = 1.2; T.stun = 1.1;
      const dx = J.p.x - T.p.x, dz = J.p.z - T.p.z, L = Math.hypot(dx, dz) || 1; J.v.set(dx / L * 14, 6, dz / L * 14);
      if (J === this.player) { hud.toast('Qalqon saqladi!', 'green'); SND.play('unhide'); }
      return;
    }
    J.lives--; T.celebrate = 1.4; if (T.bot) T.bot.ai.celebrate(1.6);
    if (T === this.player) this.catches++;
    PR.poof(J.p.clone().setY(.8), '#ffffff', 18, 1);
    if (this.near(J.p.x, J.p.z, 30)) SND.play('caught');
    if (J === this.player) { this.app.shake(.6); hud.flashRed(1.3); hud.toast(J.lives > 0 ? `USHLANDING! (${J.lives} jon qoldi)` : 'USHLANDING! Siz chiqib ketdingiz', 'red', 1.8); }
    else if (T === this.player) hud.toast(J.lives > 0 ? `USHLADING: ${J.nick}!` : `${J.nick} o'yindan chiqdi!`, 'gold', 1.6);
    else hud.say(`🐱 ${T.nick || 'Tom'} → 🐭 ${J.nick || 'Jerry'} ushlandi${J.lives > 0 ? '' : ' va chiqdi'}`, J.kind === this.me ? 'red' : 'gold', 1.8);
    if (J.lives > 0) { this.respawnOne(J); return; }
    // Jerry o'yindan chiqdi
    J.out = true; J.hidden = null; J.model.root.visible = false; J.p.set(-999, -50, -999); if (J.tag) J.tag.style.display = 'none';
    const left = this.alive.length;
    if (!left) { this.finish(true); return; }
    if (J === this.player) this.spectate();
    hud.say(`🐭 Qolgan Jerrylar: ${left}`, 'yellow', 2.2);
  }
  respawnOne(J) {
    let pos = null;
    for (let k = 0; k < 80 && !pos; k++) { const c = this.navJ.randomFree(); if (c && this.toms.every(T => Math.hypot(c[0] - T.p.x, c[1] - T.p.z) > 30) && this.navT.free(c[0], c[1])) pos = c; }
    if (pos) J.p.set(pos[0], 0, pos[1]);
    J.v.set(0, 0, 0); J.invul = 2.5; J.stun = 0; J.hidden = null; J.model.root.visible = true;
    if (J.bot) { J.bot.ai.state = 'wander'; J.bot.ai.target = null; }
    if (J === this.player) this.cam.yaw = J.yaw;
  }
  // o'yinchi chiqib ketsa — tirik jamoadoshni kuzatadi
  spectate() {
    const next = this.alive[0]; if (!next) return;
    this.spectating = true; this.player = next;
    hud.toast(`Siz chiqdingiz — ${next.nick} ni kuzatyapsiz`, 'yellow', 2.4);
  }

  // ---------------- asosiy sikl ----------------
  update(dt) {
    if (this.paused) return;
    if (this.spectating && this.player.out) { const n = this.alive[0]; if (n) this.player = n; }
    this.focus();
    if (this.me === 'jerry') this.lives = this.spectating ? 0 : this.player.lives; else this.lives = this.alive.length;
    super.update(dt);
    if (this.phase === 'end' && this.ended) return;
    const playing = this.phase === 'play', J0 = this.jerry, T0 = this.tom;
    // vaqt hisoblagichlari (asosiy juftlikniki superda kamayadi)
    for (const e of [...this.jerries, ...this.toms]) {
      if (e === J0 || e === T0 || e.out) continue;
      e.stun = Math.max(0, e.stun - dt); e.invul = Math.max(0, e.invul - dt); e.pounceCd = Math.max(0, (e.pounceCd || 0) - dt);
      e.speedT = Math.max(0, e.speedT - dt); e.invis = Math.max(0, e.invis - dt); e.magnet = Math.max(0, e.magnet - dt); e.celebrate = Math.max(0, (e.celebrate || 0) - dt);
      e.slowT = Math.max(0, (e.slowT || 0) - dt); e.dazed = Math.max(0, e.dazed - dt); e.abCd = Math.max(0, e.abCd - dt); e.shield = Math.max(0, e.shield - dt);
    }
    // botlar
    for (const b of this.bots) {
      const e = b.e;
      if (e.out) continue;
      if (e === this.player) continue;   // kuzatilayotgan bot — super uni boshqarmaydi, lekin pastda yuritamiz
      this.runBot(b, dt, playing);
    }
    if (this.spectating) { const b = this.player.bot; if (b) this.runBot(b, dt, playing); }
    // barcha juftliklar bo'yicha ushlash (asosiy juftlikni super tekshirdi)
    if (playing) for (const T of this.toms) {
      if (T.stun > 0 || T.celebrate > 0) continue;
      for (const J of this.jerries) {
        if (J.out || J.hidden || (T === T0 && J === J0)) continue;
        if (d2(J.p, T.p) < (T.pounceT > 0 ? 2.3 : 1.8) && Math.abs(J.p.y - T.p.y) < 2.2) this.teamCatch(J, T);
      }
    }
    // tuzoqlar, bomba, banan — boshqa o'yinchilar uchun
    for (let i = this.traps.length - 1; i >= 0 && playing; i--) {
      const tr = this.traps[i]; if (tr.arm > 0) continue;
      const bomb = tr.type === 'bomb', victims = tr.type === 'trap' ? this.jerries : this.toms;
      const rad = tr.type === 'banana' ? 1.2 : bomb ? 1.8 : .95;
      const v = victims.find(e => e !== J0 && e !== T0 && !e.out && !e.hidden && (bomb || e.onGround) && d2(e.p, tr.p) < rad && Math.abs(e.p.y - tr.p.y) < (bomb ? 1.8 : .6));
      if (!v) continue;
      if (tr.type === 'banana') { v.stun = 3; v.v.set(Math.sin(v.yaw) * 8, 5, Math.cos(v.yaw) * 8); if (this.near(v.p.x, v.p.z, 25)) SND.play('slip'); }
      else if (bomb) this.bombHit(tr.p, false, v);
      else { v.stun = 3; v.v.set(0, 0, 0); v.p.x = tr.p.x; v.p.z = tr.p.z; if (this.near(v.p.x, v.p.z, 25)) SND.play('trap'); }
      PR.poof(tr.p.clone().setY(.4), '#ffe9a8', 10, .6);
      gfx_remove(tr.mesh); this.traps.splice(i, 1);
    }
    // qolgan modellar (asosiy juftlikni super yangiladi)
    for (const e of [...this.jerries, ...this.toms]) {
      if (e === J0 || e === T0 || e.out) continue;
      e.model.root.position.copy(e.p); e.model.root.rotation.y = e.yaw;
      if (!e.hidden) e.model.root.visible = true;
      let a = this.phase === 'end' ? ((e.kind === 'tom') === this.tomWon ? 'celebrate' : 'stunned') : this.animOf(e);
      if (e.bot && e.bot.anim && a !== 'dazed' && a !== 'stunned' && a !== 'celebrate' && e.pounceT <= 0 && ['search', 'celebrate'].includes(e.bot.anim)) a = e.bot.anim;
      e.model.update(dt, a, Math.hypot(e.v.x, e.v.z));
      e.model.setOpacity(e.invis > 0 ? (e.kind === this.me ? .4 : .12) : e.invul > 0 ? (Math.sin(this.time * 30) > 0 ? 1 : .35) : 1);
      if (e.birds) { e.birds.visible = a === 'dazed'; if (e.birds.visible) PR.updateBirds(e.birds, this.time); }
    }
    this.placeTags();
  }
  runBot(b, dt, playing) {
    const e = b.e;
    b.thinkT -= dt; b.seeT -= dt;
    if (b.kind === 'tom') {
      // nishon: ko'ringan eng yaqin Jerry, bo'lmasa avvalgisi
      if (b.thinkT <= 0 || !b.target) {
        b.thinkT = .4;
        const act = this.alive, vis = act.filter(J => this.sight(e, J));
        if (vis.length) b.target = vis.reduce((a, c) => d2(a.p, e.p) < d2(c.p, e.p) ? a : c);
        else if (!b.target || b.target.out || Math.random() < .03) b.target = act[Math.floor(Math.random() * act.length)] || null;
      }
      if (b.seeT <= 0) { b.seeT = .12; b.sees = this.sight(e, b.target); }
      if (playing && e.stun <= 0 && !(e.celebrate > 0) && b.target) {
        const o = b.ai.update(dt); b.anim = o.anim;
        if (o.pounce) this.pounce(e);
        let sp = o.speed; if (e.speedT > 0) sp *= 1.3;
        this.drive(e, o.dir, sp, dt, o.jump ? Math.sqrt(2 * 34 * o.jump) : 0);
        if (e.abCd <= 0 && e.onGround && ['search', 'patrol'].includes(b.ai.state) && Math.random() < dt * .1) this.useAbility(e);
      } else this.drive(e, null, 0, dt, 0);
    } else {
      if (b.thinkT <= 0 || !b.threat) { b.thinkT = .3; b.threat = this.toms.reduce((a, c) => d2(a.p, e.p) < d2(c.p, e.p) ? a : c); }
      const T = b.threat, dist = d2(e.p, T.p);
      b.sees = dist < 7 || (dist < 28 && !this.world.lineBlocked(e.p.x, e.p.y + 1.1, e.p.z, T.p.x, T.p.y + 2, T.p.z));
      if (playing && e.stun <= 0 && !e.hidden) {
        const o = b.ai.update(dt);
        if (o.hide && !o.hide.taken) this.enterHide(e, o.hide);
        else {
          e.sprinting = o.sprint && e.stam > .05;
          e.stam = Math.max(0, Math.min(1, e.stam + (e.sprinting ? -.25 : .22) * dt));
          this.drive(e, o.dir, e.sprinting ? 12.6 : (o.speed || 0), dt, 0);
        }
        if (e.abCd <= 0 && e.onGround && b.ai.state === 'flee' && dist < 10 && Math.random() < dt * 1.5) this.useAbility(e);
      } else if (e.hidden && playing) { const o = b.ai.update(dt); if (o.exit) this.exitHide(e); }
      else if (!e.hidden) this.drive(e, null, 0, dt, 0);
      // sir yeydi
      if (!e.hidden) for (const it of this.cheese.items) if (it.on && Math.abs(it.p.x - e.p.x) < 1.15 && Math.abs(it.p.z - e.p.z) < 1.15 && Math.abs(it.p.y + .55 - (e.p.y + .6)) < 1.3) this.cheese.take(it);
    }
  }
  // boshlar ustidagi niklar: jamoadoshlar doim, raqiblar — ko'rinib tursa
  placeTags() {
    const cam = gfx.camera;
    for (const e of [...this.jerries, ...this.toms]) {
      if (!e.tag) continue;
      const mate = e.kind === this.me;
      const show = !e.out && !e.hidden && this.phase !== 'end' && (mate || (this.me === 'tom' ? (this.seenJ || []).includes(e) : this.sight(e, this.player)));
      if (!show) { e.tag.style.display = 'none'; continue; }
      const v = new THREE.Vector3(e.p.x, e.p.y + e.h + .5, e.p.z).project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05 || d2(e.p, this.player.p) > 50) { e.tag.style.display = 'none'; continue; }
      e.tag.style.display = ''; e.tag.style.left = (v.x * .5 + .5) * window.innerWidth + 'px'; e.tag.style.top = (-v.y * .5 + .5) * window.innerHeight + 'px';
    }
  }
  // xaritadagi boshlar: jamoadoshlar nik bilan doim, raqiblar — ko'rilganda
  teamMarks() {
    const P = this.player, out = [];
    for (const e of [...this.jerries, ...this.toms]) {
      if (e.out) continue;
      const mate = e.kind === this.me;
      let vis = mate;
      if (!mate) vis = this.me === 'tom' ? ((this.seenJ || []).includes(e) || this.bots.some(b => b.kind === 'tom' && b.sees && b.target === e) || (this.radarT > 0 && !e.ghost)) : (d2(e.p, P.p) < 14 || this.sight(e, P));
      if (!vis) continue;
      out.push({ x: e.p.x, z: e.p.z, kind: e.kind, nick: e === P && !this.spectating ? '' : (e.nick || ''), me: e === P, mate, faded: !!e.hidden });
    }
    return out;
  }
  finish(tomWon, fromNet) {
    super.finish(tomWon, fromNet);
    if (this.result) { this.result.team = true; this.result.left = this.alive.length; }
  }
  dispose() {
    super.dispose();
    for (const e of [...this.jerries, ...this.toms]) {
      if (e === this.jerry || e === this.tom) continue;
      gfx_remove(e.model.root); e.model.dispose();
    }
    this.tags.innerHTML = ''; this.tags.classList.add('hidden');
    for (const h of this.world.hides) h.taken = false;
  }
}
// sahnadan olib tashlash (gfx'ni bu yerda import qilmaslik uchun — model ota-onasidan)
function gfx_remove(o) { if (o && o.parent) o.parent.remove(o); }
