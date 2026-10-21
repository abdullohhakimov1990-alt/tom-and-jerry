// O'yin ichidagi HUD: Tom ko'zi, xarita (aylanadigan), katta xarita, qizil chekka, jonlar, vaqt, buyumlar paneli.
import { ITEMS } from './catalog.js';
import { SX, SZ, BOUNDS } from './house.js';

const $ = id => document.getElementById(id);
const H = {};
export const hud = H;
let el = {}, last = {}, base, bctx, mctx, bigctx, PPU = 3, toastT = 0, sayT = 0;

export function initHud(world) {
  for (const k of ['hud', 'eyeBox', 'eyeLabel', 'hTimer', 'hLives', 'hCheese', 'hStam', 'hotbar', 'minimap', 'mapRoom', 'bigmap', 'bigCanvas', 'vignette', 'dangerGlow', 'hToast', 'hSay', 'hPrompt', 'hGuide', 'crosshair', 'lockHint', 'hideBar'])
    el[k] = $(k);
  el.stamFill = el.hStam.querySelector('i'); el.hideFill = el.hideBar.querySelector('i');
  mctx = el.minimap.getContext('2d'); bigctx = el.bigCanvas.getContext('2d');
  el.abil = $('abil'); el.jMark = $('jMark');
  jerryHead(el.jMark.querySelector('canvas').getContext('2d'), 32, 38, 17);
  buildBase(world);
}
H.show = on => { el.hud.classList.toggle('hidden', !on); if (!on) { el.bigmap.classList.add('hidden'); H.danger(false); } };

// ---------------- xarita asosi ----------------
function buildBase(world) {
  base = document.createElement('canvas'); base.width = (BOUNDS.x1 - BOUNDS.x0) * PPU; base.height = (BOUNDS.z1 - BOUNDS.z0) * PPU;
  bctx = base.getContext('2d');
  const g = bctx;
  g.fillStyle = '#4f8a35'; g.fillRect(0, 0, base.width, base.height);
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(2, 2, base.width - 4, base.height - 4);
  g.translate(-BOUNDS.x0 * PPU, -BOUNDS.z0 * PPU);   // endi dunyo koordinatalari bilan chizamiz
  const E = world.rooms.find(R => R.key === 'entry') || world.rooms[0];
  g.fillStyle = '#c8bba5'; g.fillRect((E.ox + 13 - 5) * PPU, SZ * PPU, 10 * PPU, (BOUNDS.z1 - SZ) * PPU);
  g.fillStyle = '#20150c'; g.fillRect(0, 0, SX * PPU, SZ * PPU);
  for (const R of world.rooms) {
    g.fillStyle = R.st.map; g.fillRect(R.ox * PPU, R.oz * PPU, 26 * PPU, 26 * PPU);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 26; i += 2) g.fillRect(R.ox * PPU, (R.oz + i) * PPU, 26 * PPU, PPU);
  }
  // mebellar (Tom o'ta olmaydigan, Jerry ostidan o'tadigan joylar ochroq)
  for (const c of world.colliders) {
    if (c.maxY < .8 || c.minY > 1.4 || c.maxX - c.minX > 30 || c.maxZ - c.minZ > 30) continue;
    const wall = c.maxY >= 13.9;
    g.fillStyle = wall ? '#120a05' : c.tag === 'hide' ? 'rgba(0,0,0,0)' : c.tag === 'bush' ? '#2e6b22' : 'rgba(40,22,10,.55)';
    g.fillRect(c.minX * PPU, c.minZ * PPU, (c.maxX - c.minX) * PPU, (c.maxZ - c.minZ) * PPU);
  }
  // Jerryning ostidan o'tish joylari (stol, karavot)
  for (const c of world.colliders) {
    if (c.minY < 1.5 || c.minY > 3.6 || c.maxY > 13) continue;
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fillRect(c.minX * PPU, c.minZ * PPU, (c.maxX - c.minX) * PPU, (c.maxZ - c.minZ) * PPU);
  }
}

// ---------------- boshchalar ----------------
function jerryHead(g, x, y, r, a = 1) {
  g.globalAlpha = a;
  g.fillStyle = '#c9823f'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  for (const sx of [-1, 1]) { g.fillStyle = '#c9823f'; g.beginPath(); g.arc(x + sx * r * .8, y - r * .72, r * .62, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#f4a3aa'; g.beginPath(); g.arc(x + sx * r * .8, y - r * .72, r * .36, 0, 7); g.fill(); }
  g.fillStyle = '#c9823f'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#f6d7a2'; g.beginPath(); g.ellipse(x, y + r * .35, r * .55, r * .4, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - r * .33, y - r * .12, r * .2, r * .27, 0, 0, 7); g.ellipse(x + r * .33, y - r * .12, r * .2, r * .27, 0, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(x - r * .3, y - r * .1, r * .11, 0, 7); g.arc(x + r * .3, y - r * .1, r * .11, 0, 7); g.fill();
  g.fillStyle = '#3b1a0e'; g.beginPath(); g.arc(x, y + r * .22, r * .13, 0, 7); g.fill();
  g.globalAlpha = 1;
}
function tomHead(g, x, y, r, a = 1) {
  g.globalAlpha = a;
  g.fillStyle = '#7f90af'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + sx * r * .25, y - r * .8); g.lineTo(x + sx * r * 1.05, y - r * 1.55); g.lineTo(x + sx * r * .95, y - r * .25); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#f3f3f5'; g.beginPath(); g.ellipse(x, y + r * .42, r * .72, r * .42, 0, 0, 7); g.fill();
  g.fillStyle = '#fffbe6'; g.beginPath(); g.ellipse(x - r * .33, y - r * .15, r * .22, r * .3, 0, 0, 7); g.ellipse(x + r * .33, y - r * .15, r * .22, r * .3, 0, 0, 7); g.fill();
  g.fillStyle = '#c3d33a'; g.beginPath(); g.arc(x - r * .31, y - r * .12, r * .13, 0, 7); g.arc(x + r * .31, y - r * .12, r * .13, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.ellipse(x - r * .31, y - r * .12, r * .05, r * .11, 0, 0, 7); g.ellipse(x + r * .31, y - r * .12, r * .05, r * .11, 0, 0, 7); g.fill();
  g.strokeStyle = '#111'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - r * .62, y - r * .58); g.lineTo(x - r * .1, y - r * .38); g.moveTo(x + r * .62, y - r * .58); g.lineTo(x + r * .1, y - r * .38); g.stroke();
  g.fillStyle = '#e57373'; g.beginPath(); g.arc(x, y + r * .22, r * .12, 0, 7); g.fill();
  g.globalAlpha = 1;
}

// d: { me:'jerry'|'tom', jp, tp, yaw, showJ, showT, jFaded, tFaded, hides, guide, cheese, hiddenSpot, time, items }
H.drawMap = function (d) {
  const g = mctx, W = el.minimap.width, Hh = el.minimap.height, scale = 1.25; // px per PPU-px
  const me = d.me === 'jerry' ? d.jp : d.tp;
  g.save();
  g.fillStyle = '#20150c'; g.fillRect(0, 0, W, Hh);
  g.beginPath(); g.arc(W / 2, Hh / 2, W / 2 - 2, 0, 7); g.clip();
  g.translate(W / 2, Hh / 2);
  g.rotate(Math.PI + d.yaw);            // o'yinchi qaragan tomon tepada
  g.scale(scale, scale);
  g.translate(-me.x * PPU, -me.z * PPU);
  g.drawImage(base, BOUNDS.x0 * PPU, BOUNDS.z0 * PPU);
  const P = (p) => [p.x * PPU, p.z * PPU];
  // sirlar
  g.fillStyle = '#ffd23f';
  for (const it of d.cheese) if (it.on) { g.beginPath(); g.arc(it.p.x * PPU, it.p.z * PPU, 1.6, 0, 7); g.fill(); }
  // yashirinish joylari
  for (const h of d.hides) {
    const sel = d.guide === h, occ = d.hiddenSpot === h;
    g.fillStyle = occ ? '#ff4081' : sel ? '#7dff9e' : 'rgba(80,230,120,.85)';
    g.strokeStyle = '#063'; g.lineWidth = 1;
    const s = sel ? 7 + Math.sin(d.time * 8) * 1.5 : 4.5;
    g.fillRect(h.x * PPU - s / 2, h.z * PPU - s / 2, s, s); g.strokeRect(h.x * PPU - s / 2, h.z * PPU - s / 2, s, s);
  }
  for (const it of d.marks || []) { g.fillStyle = it.c; g.beginPath(); g.arc(it.x * PPU, it.z * PPU, 3, 0, 7); g.fill(); }
  g.restore();
  // boshchalar (aylantirilmaydi)
  const toScreen = p => {
    const dx = (p.x - me.x) * PPU * scale, dz = (p.z - me.z) * PPU * scale, a = Math.PI + d.yaw;
    return [W / 2 + dx * Math.cos(a) - dz * Math.sin(a), Hh / 2 + dx * Math.sin(a) + dz * Math.cos(a)];
  };
  const clampR = ([x, y]) => { const dx = x - W / 2, dy = y - Hh / 2, L = Math.hypot(dx, dy), R = W / 2 - 14; return L > R ? [W / 2 + dx / L * R, Hh / 2 + dy / L * R] : [x, y]; };
  if (d.showT) { const [x, y] = clampR(toScreen(d.tp)); tomHead(g, x, y, d.me === 'tom' ? 10 : 11, d.tFaded ? .55 : 1); }
  // jamoaviy rejim: jamoadoshlar (nik bilan) va ko'ringan raqiblar
  if (d.team) for (const t of d.team) {
    const [x, y] = clampR(toScreen(t)), r = t.me ? 9 : 7.5;
    (t.kind === 'tom' ? tomHead : jerryHead)(g, x, y, r, t.faded ? .5 : 1);
    if (t.me) { g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r + 3, 0, 7); g.stroke(); }
    else if (t.nick) { g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(t.nick, x, y + r + 11); g.fillStyle = t.mate ? '#ffffff' : '#ff8a80'; g.fillText(t.nick, x, y + r + 11); }
  }
  if (d.showJ) { const [x, y] = clampR(toScreen(d.jp)); jerryHead(g, x, y, d.me === 'jerry' ? 9 : 9, d.jFaded ? .5 : 1); if (d.jUnknown) { g.fillStyle = '#ffd400'; g.font = 'bold 16px sans-serif'; g.fillText('?', x + 8, y - 8); } }
  // yo'nalish o'qi va shimol
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, Hh / 2 - 22); g.lineTo(W / 2 - 6, Hh / 2 - 12); g.lineTo(W / 2 + 6, Hh / 2 - 12); g.closePath(); g.fill();
  const na = Math.PI + d.yaw, NR = W / 2 - 11;
  g.fillStyle = '#ff5252'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('N', W / 2 + Math.sin(na) * NR, Hh / 2 - Math.cos(na) * NR + 5);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, Hh / 2, W / 2 - 2, 0, 7); g.stroke();
};
H.drawBig = function (d, rooms) {
  const c = el.bigCanvas, g = bigctx;
  const k = Math.min(c.width / base.width, c.height / base.height);
  g.fillStyle = '#20150c'; g.fillRect(0, 0, c.width, c.height);
  g.save(); g.translate((c.width - base.width * k) / 2, (c.height - base.height * k) / 2); g.scale(k, k);
  g.drawImage(base, 0, 0);
  g.translate(-BOUNDS.x0 * PPU, -BOUNDS.z0 * PPU);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center';
  for (const R of rooms) g.fillText(R.name, (R.ox + 13) * PPU, (R.oz + 3) * PPU);
  for (const h of d.hides) { g.fillStyle = d.hiddenSpot === h ? '#ff4081' : d.guide === h ? '#7dff9e' : 'rgba(80,230,120,.9)'; g.fillRect(h.x * PPU - 4, h.z * PPU - 4, 8, 8); }
  if (d.showT) tomHead(g, d.tp.x * PPU, d.tp.z * PPU, 16, d.tFaded ? .55 : 1);
  if (d.showJ) jerryHead(g, d.jp.x * PPU, d.jp.z * PPU, 13, d.jFaded ? .5 : 1);
  if (d.team) for (const t of d.team) {
    (t.kind === 'tom' ? tomHead : jerryHead)(g, t.x * PPU, t.z * PPU, t.kind === 'tom' ? 14 : 12, t.faded ? .5 : 1);
    if (t.nick || t.me) { g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.85)'; const s = t.me ? 'SIZ' : t.nick; g.strokeText(s, t.x * PPU, t.z * PPU + 30); g.fillStyle = t.me ? '#ffd23f' : t.mate ? '#fff' : '#ff8a80'; g.fillText(s, t.x * PPU, t.z * PPU + 30); }
  }
  g.restore();
};
// qobiliyat tugmasi (E): qayta tiklanish soati
H.ability = (A, cd) => {
  const k = A.id + Math.ceil(cd);
  if (last.ab === k) return; last.ab = k;
  el.abil.title = `E — ${A.name}: ${A.desc}`;
  el.abil.querySelector('.ai').textContent = A.ico;
  el.abil.querySelector('.an').textContent = A.name;
  el.abil.classList.toggle('cd', cd > 0);
  el.abil.style.setProperty('--p', (cd > 0 ? cd / A.cd * 100 : 0) + '%');
  el.abil.querySelector('.cdn').textContent = cd > 0 ? Math.ceil(cd) : '';
};
// yaqin xonadagi Jerry boshi
H.jerryMark = (on, x, y, edge) => {
  if (last.jm !== on) { last.jm = on; el.jMark.classList.toggle('hidden', !on); }
  if (on) { el.jMark.style.left = x + 'px'; el.jMark.style.top = y + 'px'; el.jMark.classList.toggle('edge', !!edge); }
};
H.toggleBig = on => el.bigmap.classList.toggle('hidden', !on);

// ---------------- ko'z ----------------
const EYE = {
  jerry: { open: "TOM SENI KO'RYAPTI!", closed: "Tom ko'rmayapti", search: 'Tom qidiryapti...' },
  tom: { open: "JERRY KO'RINYAPTI!", closed: "Jerry ko'rinmayapti", search: 'Izni yo\'qotding' },
};
H.setEye = (state, me) => {
  const k = state + me; if (last.eye === k) return; last.eye = k;
  el.eyeBox.className = state; el.eyeLabel.textContent = EYE[me][state];
};
H.flashRed = (dur = 1.7, color) => {
  const v = el.vignette; v.style.setProperty('--dur', dur + 's'); v.style.setProperty('--vc', color || '235,0,0');
  v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash');
};
H.danger = on => { if (last.danger === on) return; last.danger = on; el.dangerGlow.classList.toggle('on', !!on); };

H.toast = (txt, cls = '', dur = 1.4) => {
  el.hToast.textContent = txt; el.hToast.className = 'on ' + cls; toastT = dur;
};
H.say = (txt, cls = '', dur = 2.2) => { el.hSay.textContent = txt; el.hSay.className = 'on ' + cls; sayT = dur; };
H.tick = dt => {
  if (toastT > 0 && (toastT -= dt) <= 0) el.hToast.className = '';
  if (sayT > 0 && (sayT -= dt) <= 0) el.hSay.className = '';
};
H.prompt = txt => { if (last.prompt === txt) return; last.prompt = txt; el.hPrompt.innerHTML = txt || ''; el.hPrompt.classList.toggle('on', !!txt); };
H.guide = txt => { if (last.guide === txt) return; last.guide = txt; el.hGuide.textContent = txt || ''; el.hGuide.classList.toggle('on', !!txt); };
H.crosshair = on => el.crosshair.classList.toggle('hidden', !on);
H.lockHint = on => el.lockHint.classList.toggle('hidden', !on);
H.hideBar = (on, frac) => { if (last.hb !== on) { el.hideBar.classList.toggle('on', on); last.hb = on; } if (on) el.hideFill.style.width = Math.max(0, frac) * 100 + '%'; };
H.room = name => { if (last.room !== name) { last.room = name; el.mapRoom.textContent = name; } };

H.stats = ({ time, lives, maxLives, cheese, stamina, me, catches }) => {
  const t = Math.max(0, Math.ceil(time)), s = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (last.time !== s) { last.time = s; el.hTimer.textContent = s; el.hTimer.classList.toggle('low', t <= 20); }
  const lk = lives + '/' + maxLives;
  if (last.lives !== lk) { last.lives = lk; el.hLives.innerHTML = Array.from({ length: Math.max(maxLives, lives) }, (_, i) => `<i class="${i < lives ? 'on' : ''}"></i>`).join(''); }
  const ck = me === 'tom' ? 'c' + catches : cheese;
  if (last.cheese !== ck) { last.cheese = ck; el.hCheese.innerHTML = me === 'tom' ? `Ushlandi: <b>${catches}</b>` : `<span class="cur sir"></span><b>${cheese}</b>`; }
  el.stamFill.style.width = stamina * 100 + '%';
  el.hStam.classList.toggle('low', stamina < .25);
};
// buyumlar paneli
H.hotbar = (me, inv, active) => {
  const list = ITEMS.filter(i => i.for === me);
  const key = me + list.map(i => (inv[i.id] || 0) + (active[i.id] ? 'a' : '')).join();
  if (last.hot === key) return; last.hot = key;
  el.hotbar.innerHTML = list.map((it, i) => `<div class="slot ${inv[it.id] ? '' : 'empty'} ${active[it.id] ? 'act' : ''}" data-i="${i}" title="${it.name}: ${it.desc}">
    <span class="key">${i + 1}</span><span class="ic it-${it.id}" style="--c:${it.col}"></span><span class="n">${inv[it.id] || 0}</span></div>`).join('');
};
