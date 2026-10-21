// Sun'iy intellekt: Tom (quvlaydi, qidiradi, yashirinish joylarini tekshiradi) va Jerry (qochadi, yashirinadi, sir yeydi).
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

class PathFollower {
  constructor(nav) { this.nav = nav; this.path = null; this.i = 0; this.repath = 0; this.goal = null; this.fail = 0; }
  to(from, gx, gz, force) {
    const g = this.goal;
    if (!force && g && this.path && Math.hypot(g.x - gx, g.z - gz) < 1.2 && this.repath > 0) return this.path;
    this.goal = { x: gx, z: gz };
    this.path = this.nav.find(from.x, from.z, gx, gz);
    this.i = 1; this.repath = .35;
    this.fail = this.path ? 0 : this.fail + 1;
    return this.path;
  }
  // keyingi nuqtaga yo'nalish
  steer(from, dt) {
    this.repath -= dt;
    if (!this.path) return null;
    while (this.i < this.path.length && Math.hypot(this.path[this.i].x - from.x, this.path[this.i].z - from.z) < .7) this.i++;
    if (this.i >= this.path.length) return null;
    const p = this.path[this.i], dx = p.x - from.x, dz = p.z - from.z, L = Math.hypot(dx, dz) || 1;
    return [dx / L, dz / L, this.path.length - this.i];
  }
  done(from) { return !this.path || this.i >= this.path.length || (this.goal && Math.hypot(this.goal.x - from.x, this.goal.z - from.z) < .9); }
  clear() { this.path = null; this.goal = null; }
}

// ======================= TOM =======================
export class TomAI {
  constructor(m) {
    this.m = m; this.state = 'patrol'; this.pf = new PathFollower(m.navT);
    this.lastSeen = null; this.lastSeenT = -99; this.list = []; this.checkT = 0; this.pounceCd = 2; this.unreach = 0; this.wait = 0; this.target = null; this.leapCd = 0; this.heardT = 0;
  }
  setState(s) { this.state = s; this.pf.clear(); this.checkT = 0; this.wait = 0; this.target = null; }
  // har kadr: { dir:[x,z], speed, jump, pounce, anim }
  update(dt) {
    const m = this.m, T = m.tom, J = m.jerry, out = { dir: null, speed: 0, jump: false, pounce: false, anim: null };
    this.pounceCd -= dt; this.leapCd -= dt;
    const dist = d2(T.p, J.p);
    if (m.tomSees) {
      this.lastSeen = { x: J.p.x, z: J.p.z, y: J.p.y }; this.lastSeenT = m.time; this.lastVel = { x: J.v.x, z: J.v.z };
      if (!['chase', 'pull', 'scared', 'celebrate'].includes(this.state)) { this.setState('chase'); m.onTomSpots(); }
    } else if (!J.hidden && !J.ghost && J.invis <= 0 && (J.sprinting && dist < 17 || Math.hypot(J.v.x, J.v.z) > 6 && dist < 10) && !['chase', 'pull', 'scared', 'celebrate'].includes(this.state)) {
      // eshitib qoldi
      this.lastSeen = { x: J.p.x, z: J.p.z, y: J.p.y }; this.lastSeenT = m.time;
      if (this.state !== 'search' || m.time - this.heardT > 3) { this.heardT = m.time; this.startSearch(); m.hudSay('Tom nimadir eshitdi...', 'yellow'); }
    }
    const ramp = 1 + Math.min(.14, m.time / 180 * .14);
    switch (this.state) {
      case 'celebrate': this.wait -= dt; out.anim = 'celebrate'; if (this.wait <= 0) this.setState('patrol'); return out;
      case 'scared': {
        const S = m.spike;
        if (!S || m.spikeT <= 0) { this.setState('search'); this.startSearch(); return out; }
        if (!this.target || this.pf.done(T.p) || this.pf.repath < -1.5) {
          let best = null, bs = -1;
          for (let k = 0; k < 14; k++) { const c = m.navT.randomFree(); if (!c) continue; const s = Math.hypot(c[0] - S.p.x, c[1] - S.p.z) - Math.hypot(c[0] - T.p.x, c[1] - T.p.z) * .3; if (s > bs) { bs = s; best = c; } }
          if (best) { this.target = best; this.pf.to(T.p, best[0], best[1], true); }
        }
        const st = this.pf.steer(T.p, dt);
        if (st) { out.dir = st; out.speed = 12.5; }
        out.anim = 'sprint';
        return out;
      }
      case 'chase': {
        if (!m.tomSees && m.time - this.lastSeenT > 2.4) { this.startSearch(); return this.update(0); }
        // ko'rmasa — Jerry qochgan tomonga taxminan boradi
        let tgt = J.p;
        if (!m.tomSees && this.lastSeen) { const k = Math.min(1.4, m.time - this.lastSeenT + .6), lv = this.lastVel || { x: 0, z: 0 }; const g = m.navT.nearestFree(this.lastSeen.x + lv.x * k, this.lastSeen.z + lv.z * k, 4); tgt = g ? { x: g[0], z: g[1], y: 0 } : this.lastSeen; }
        const direct = m.tomSees && dist < 14 && m.navT.los(T.p.x, T.p.z, tgt.x, tgt.z);
        if (direct) {
          const dx = tgt.x - T.p.x, dz = tgt.z - T.p.z, L = Math.hypot(dx, dz) || 1;
          out.dir = [dx / L, dz / L]; this.unreach = 0;
        } else {
          this.pf.to(T.p, tgt.x, tgt.z);
          const st = this.pf.steer(T.p, dt);
          if (st) { out.dir = st; this.unreach = Math.max(0, this.unreach - dt); }
          else if (this.pf.fail > 0 || this.pf.done(T.p)) this.unreach += dt;
        }
        out.speed = 10.9 * ramp;
        if (dist < 6.5 && m.tomSees && this.pounceCd <= 0 && Math.abs(J.p.y - T.p.y) < 1.5) { out.pounce = true; this.pounceCd = 2.8; }
        // Jerry baland joyda — sakrab chiqish
        if (m.tomSees && J.p.y > T.p.y + 1.2 && dist < 4 && this.leapCd <= 0 && T.onGround) { out.jump = Math.min(10, J.p.y - T.p.y + 1.8); this.leapCd = 2.2; }
        // yetib bo'lmaydigan joyda — mebelni silkitadi
        if (this.unreach > 3 && dist < 6.5) { m.tomShake(); this.unreach = 0; }
        out.anim = 'run';
        return out;
      }
      case 'pull': {
        const sp = this.target;
        if (!sp || !J.hidden) { this.setState('search'); this.startSearch(); return out; }
        if (d2(T.p, { x: sp.ax, z: sp.az }) < 1.6) { m.tomPullsOut(sp); this.setState('celebrate'); this.wait = 1.5; return out; }
        this.pf.to(T.p, sp.ax, sp.az);
        const st = this.pf.steer(T.p, dt);
        if (st) out.dir = st; else if (this.pf.fail > 2) { m.tomPullsOut(sp); this.setState('celebrate'); this.wait = 1.5; }
        out.speed = 11 * ramp; out.anim = 'run';
        return out;
      }
      case 'search': {
        // 1) oxirgi ko'rgan joyga borish  2) yaqin yashirinish joylarini tekshirish
        if (this.checkT > 0) {
          this.checkT -= dt; out.anim = 'search';
          const sp = this.list[0];
          if (sp) sp.wob = Math.max(sp.wob, .5);
          if (this.checkT <= 0) {
            this.list.shift();
            if (sp && J.hidden === sp && !J.ghost) { m.tomFinds(sp); this.setState('chase'); this.lastSeenT = m.time; return out; }
            if (sp) m.hudSay(sp.name + ' — bo\'sh!', 'yellow', true);
          }
          return out;
        }
        let goal = null;
        if (this.lastSeen && !this.reached) goal = this.lastSeen;
        else if (this.list.length) goal = { x: this.list[0].ax, z: this.list[0].az };
        if (!goal) { this.setState('patrol'); return out; }
        if (d2(T.p, goal) < 1.5) {
          if (goal === this.lastSeen) this.reached = true;
          else this.checkT = 1.4;
          return out;
        }
        this.pf.to(T.p, goal.x, goal.z);
        const st = this.pf.steer(T.p, dt);
        if (st) out.dir = st; else if (this.pf.fail > 1) { if (goal === this.lastSeen) this.reached = true; else this.list.shift(); }
        out.speed = 7.5 * ramp; out.anim = 'run';
        return out;
      }
      case 'patrol':
      default: {
        if (!this.target || this.pf.done(T.p) || this.pf.fail > 1) {
          this.wait -= dt;
          if (this.wait > 0) { out.anim = 'search'; return out; }
          // Tom hid sezadi: ko'pincha Jerry bor tomonga yuradi
          const r = J.ghost ? 1 : Math.random(), hs = m.world.hides; // egasini "hidlay" olmaydi
          if (r < .5) {
            const ang = Math.random() * 6.28, rad = 5 + Math.random() * 13;
            const c = m.navT.nearestFree(J.p.x + Math.cos(ang) * rad, J.p.z + Math.sin(ang) * rad, 8);
            if (c) this.target = [c[0], c[1], null];
          } else if (r < .8) {
            const near = hs.filter(h => Math.hypot(h.x - J.p.x, h.z - J.p.z) < 24);
            const h = near.length ? near[Math.floor(Math.random() * near.length)] : hs[Math.floor(Math.random() * hs.length)];
            this.target = [h.ax, h.az, h];
          } else { const c = m.navT.randomFree(); if (c) this.target = [c[0], c[1], null]; }
          if (this.target) this.pf.to(T.p, this.target[0], this.target[1], true);
          this.wait = .5 + Math.random();
          // yashirinish joyiga kelib qoldi — tekshiradi
          return out;
        }
        if (this.target[2] && d2(T.p, { x: this.target[0], z: this.target[1] }) < 1.6) {
          const sp = this.target[2]; this.target = null;
          sp.wob = 1;
          if (J.hidden === sp && !J.ghost) { m.tomFinds(sp); this.setState('chase'); this.lastSeenT = m.time; return out; }
        }
        const st = this.pf.steer(T.p, dt);
        if (st) out.dir = st;
        out.speed = 7.6 * ramp; out.anim = 'run';
        return out;
      }
    }
  }
  startSearch() {
    this.state = 'search'; this.reached = false; this.checkT = 0; this.pf.clear();
    const ls = this.lastSeen || this.m.tom.p;
    const near = this.m.world.hides.filter(h => Math.hypot(h.x - ls.x, h.z - ls.z) < 17)
      .sort((a, b) => Math.hypot(a.x - ls.x, a.z - ls.z) - Math.hypot(b.x - ls.x, b.z - ls.z)).slice(0, 4);
    for (let i = near.length - 1; i > 0; i--) { if (Math.random() < .35) { const j = Math.floor(Math.random() * (i + 1)); [near[i], near[j]] = [near[j], near[i]]; } }
    this.list = near.slice(0, 3);
  }
  knowsSpot(sp) { this.setState('pull'); this.target = sp; }
  scare() { this.setState('scared'); }
  celebrate(t = 1.6) { this.setState('celebrate'); this.wait = t; }
}

// ======================= JERRY =======================
export class JerryAI {
  constructor(m) {
    this.m = m; this.state = 'wander'; this.pf = new PathFollower(m.navJ); this.lostT = 0; this.hideT = 0; this.target = null; this.think = 0; this.stam = 1;
  }
  update(dt) {
    const m = this.m, J = m.jerry, T = m.tom, out = { dir: null, speed: 0, jump: false, sprint: false, anim: null, hide: null, exit: false };
    const dist = d2(J.p, T.p);
    const sees = m.jerrySeesTom;
    this.think -= dt;
    if (J.hidden) {
      this.hideT -= dt;
      if (this.hideT <= 0 && dist > 12) out.exit = true;
      if (this.hideT < -10) out.exit = true;
      return out;
    }
    if (sees && dist < 24) { if (this.state !== 'flee') { this.state = 'flee'; this.think = 0; m.jerryAlert(); } this.lostT = 0; }
    else this.lostT += dt;
    if (this.state === 'flee') {
      if (this.lostT > 2.2) {
        // ko'zdan yo'qoldi — yashirinadimi?
        const sp = this.nearestSpot(J.p, T.p);
        if (sp && Math.random() < .75) { this.state = 'gohide'; this.target = sp; this.pf.to(J.p, sp.ax, sp.az, true); }
        else this.state = 'wander';
      } else {
        if (this.think <= 0 || this.pf.done(J.p)) { this.think = .55; this.pickFlee(); }
        const st = this.pf.steer(J.p, dt);
        if (st) out.dir = st;
        else { const dx = J.p.x - T.p.x, dz = J.p.z - T.p.z, L = Math.hypot(dx, dz) || 1; out.dir = [dx / L, dz / L]; }
        out.sprint = dist < 13; out.speed = out.sprint ? 12.6 : 9.6;
        return out;
      }
    }
    if (this.state === 'gohide') {
      const sp = this.target;
      if (!sp || sp.taken) { this.state = 'wander'; return out; }
      if (d2(J.p, { x: sp.ax, z: sp.az }) < 1.3) { out.hide = sp; this.hideT = 7 + Math.random() * 10; this.state = 'wander'; return out; }
      if (this.pf.repath <= 0) this.pf.to(J.p, sp.ax, sp.az, true);
      const st = this.pf.steer(J.p, dt);
      if (st) out.dir = st; else if (this.pf.fail) this.state = 'wander';
      out.speed = 9.6; return out;
    }
    // wander: eng yaqin sirga borish
    if (!this.target || this.pf.done(J.p) || this.think < -6) {
      this.think = 0;
      let best = null, bd = 1e9;
      for (const it of m.cheese.items) { if (!it.on || it.p.y > .3) continue; const dd = d2(it.p, J.p) + d2(it.p, T.p) * -.25; if (dd < bd) { bd = dd; best = it; } }
      if (best) { this.target = best; this.pf.to(J.p, best.p.x, best.p.z, true); }
      else { const c = m.navJ.randomFree(); if (c) { this.target = { p: { x: c[0], z: c[1] } }; this.pf.to(J.p, c[0], c[1], true); } }
    }
    const st = this.pf.steer(J.p, dt);
    if (st) out.dir = st;
    out.speed = 7.5; return out;
  }
  nearestSpot(jp, tp) {
    let best = null, bd = 1e9;
    for (const h of this.m.world.hides) {
      if (h.taken) continue;
      const dj = Math.hypot(h.x - jp.x, h.z - jp.z), dt = Math.hypot(h.x - tp.x, h.z - tp.z);
      if (dt < 9 || dj > 26) continue;
      const s = dj - dt * .3;
      if (s < bd) { bd = s; best = h; }
    }
    return best;
  }
  pickFlee() {
    const m = this.m, J = m.jerry, T = m.tom;
    let best = null, bs = -1e9;
    for (let k = 0; k < 22; k++) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 20;
      const x = J.p.x + Math.cos(a) * r, z = J.p.z + Math.sin(a) * r;
      if (!m.navJ.free(x, z)) continue;
      let s = Math.hypot(x - T.p.x, z - T.p.z) - r * .25;
      if (!m.navT.free(x, z)) s += 9;                // Tom kira olmaydigan joy (stol ostida, teshik orqasida)
      const toT = Math.atan2(T.p.z - J.p.z, T.p.x - J.p.x), diff = Math.abs(((a - toT + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < .9) s -= 14;                         // Tom tomonga qochmaslik
      if (s > bs) { bs = s; best = [x, z]; }
    }
    if (!best) return;
    const tp = { x: T.p.x, z: T.p.z };
    m.navJ.extra = (x, z) => { const d = Math.hypot(x - tp.x, z - tp.z); return d < 7 ? (7 - d) * 2.5 : 0; };
    this.pf.to(J.p, best[0], best[1], true);
    m.navJ.extra = null;
  }
}
