// Ishga tushirish: grafika, uy, akkaunt, menyu va o'yin tsikli.
import { initGfx, gfx, render, tuneEnv, detectQuality, adaptResolution } from './gfx.js';
import { buildHouse } from './house.js';
import { NavGrid } from './nav.js';
import { initHud } from './hud.js';
import { buildIcons, doneIcons } from './icons.js';
import { createBackend } from './backend.js';
import { makeStage } from './stage.js';
import { ui } from './ui.js';
import { Match } from './match.js';
import { initOnline } from './online.js';
import { START_WALLET, CHAR_PRICE, ADMIN_WALLET, SETS, ICONS, COLORS, MUSIC, ITEMS, GIFT_MAX } from './catalog.js';
import * as SND from './audio.js';
import { isTouch, goLandscape } from './touch.js';

const $ = id => document.getElementById(id);
const app = window.app = { match: null, data: null, profile: null, shakeAmt: 0, isTouch: isTouch() };
if (app.isTouch) document.body.classList.add('touch');

// ---------------- sozlamalar (shu qurilmada) ----------------
function loadSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem('tj_settings')) || {}; } catch (e) { }
  return Object.assign({ quality: detectQuality(), sens: 1, fov: 72, invertY: false, vol: .8, musVol: .5, autoRes: true }, s);
}
app.settings = loadSettings();
app.saveSettings = () => { try { localStorage.setItem('tj_settings', JSON.stringify(app.settings)); } catch (e) { } };

// ---------------- o'yinchi ma'lumotlari ----------------
function defaultData() {
  return {
    v: 1, wallet: { ...START_WALLET }, char: 'jerry',
    owned: { skins: { 'jerry:classic': 1, 'tom:classic': 1 }, icons: { j_classic: 1, t_classic: 1 }, colors: { white: 1 }, music: { classic: 1 } },
    equip: { skin: { jerry: 'classic', tom: 'classic' }, music: 'classic', icon: 'j_classic', color: 'white' },
    inv: { heart: 1, shield: 1, banana: 2, boots: 1, radar: 1, trap: 1 },
    stats: { games: 0, wins: 0, jerryWins: 0, tomWins: 0, sirTotal: 0, catches: 0 },
  };
}
function mergeData(d) {
  const def = defaultData();
  if (!d) return def;
  for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
  for (const k of ['owned', 'equip', 'stats', 'wallet']) d[k] = Object.assign({}, def[k], d[k]);
  for (const k of Object.keys(def.owned)) d.owned[k] = Object.assign({}, def.owned[k], d.owned[k]);
  d.equip.skin = Object.assign({}, def.equip.skin, d.equip.skin);
  return d;
}
// admin: hamma narsa ochiq, olmos/oltin va buyumlar tugamaydi
function applyAdmin(d) {
  if (!app.isAdmin || !d) return;
  for (const st of SETS) { d.owned.skins['jerry:' + st.id] = 1; d.owned.skins['tom:' + st.id] = 1; }
  for (const i of ICONS) d.owned.icons[i.id] = 1;
  for (const c of COLORS) d.owned.colors[c.id] = 1;
  for (const m of MUSIC) d.owned.music[m.id] = 1;
  for (const it of ITEMS) d.inv[it.id] = Math.max(99, d.inv[it.id] || 0);
  d.wallet.gold = Math.max(ADMIN_WALLET.gold, d.wallet.gold); d.wallet.diamond = Math.max(ADMIN_WALLET.diamond, d.wallet.diamond);
}
app.applyAdmin = () => applyAdmin(app.data);
let saveTimer = null;
app.saveSoon = () => { applyAdmin(app.data); clearTimeout(saveTimer); saveTimer = setTimeout(app.saveNow, 1200); ui.renderTop && app.profile && ui.renderTop(); };
app.saveNow = async () => {
  if (!app.data || !app.user) return;
  try { localStorage.setItem('tj_data_' + app.user.uid, JSON.stringify(app.data)); } catch (e) { }
  try { await app.backend.saveData(app.data); } catch (e) { console.warn('saqlanmadi', e); }
};
window.addEventListener('beforeunload', () => { if (saveTimer) { clearTimeout(saveTimer); app.saveNow(); } });

// ---------------- ishga tushirish ----------------
async function boot() {
  ui.loading(.05, 'Grafika tayyorlanmoqda...');
  await initGfx($('game'), app.settings.quality);
  ui.loading(.2, 'Katta uy qurilmoqda...');
  await tick();
  app.world = buildHouse(gfx.scene);
  tuneEnv(gfx.scene);
  ui.loading(.45, "Yo'llar hisoblanmoqda...");
  await tick();
  app.navJ = new NavGrid(app.world, .36, 1.45);
  app.navT = new NavGrid(app.world, .85, 3.4);
  initHud(app.world);
  ui.loading(.55, 'Profil rasmlari chizilmoqda...');
  await buildIcons(p => ui.loading(.55 + p * .3));
  doneIcons();
  ui.loading(.88, 'Server bilan ulanmoqda...');
  app.backend = await createBackend();
  app.stage = makeStage(app);
  app.stage.set('jerry', 'classic'); app.stage.set('tom', 'classic');
  ui.init(app);
  ui.loading(1, 'Tayyor!');
  // birinchi kadrda shaderlarni kompilyatsiya qilish
  app.stage.update(.016, 0); render();
  requestAnimationFrame(loop);
  document.addEventListener('pointerdown', () => { SND.initAudio(); SND.setVolumes(app.settings.vol, app.settings.musVol, true); if (!app.match && app.data) SND.playMusic(app.data.equip.music); }, { once: false });
  if (app.backend.mode === 'local') $('localBox').classList.remove('hidden');
  if (app.backend.error) $('authErr').textContent = app.backend.error;
  bindAuth();
  app.backend.onAuth(onAuth);
}
const tick = () => new Promise(r => setTimeout(r, 0));

function bindAuth() {
  const err = m => { $('authErr').textContent = m || ''; };
  $('btnGoogle').onclick = async () => { err(); try { await app.backend.signInGoogle(); } catch (e) { err(e.message); } };
  $('btnGuest').onclick = async () => { err(); await app.backend.signInGuest(false); };
  $('btnGuestNew').onclick = async () => { err(); await app.backend.signInGuest(true); };
  $('btnRegister').onclick = async () => {
    const nick = $('nickInput').value;
    $('btnRegister').disabled = true;
    try {
      await app.backend.register(nick);
      const acc = await app.backend.loadAccount();
      enterMenu(acc);
    } catch (e) { $('regErr').textContent = e.message; }
    $('btnRegister').disabled = false;
  };
}
async function onAuth(user) {
  app.user = user;
  if (app.unsubs) { app.unsubs.forEach(u => u && u()); app.unsubs = null; }
  if (!user) { app.profile = null; app.data = null; ui.screen('auth'); return; }
  ui.screen('loading'); ui.loading(.95, 'Akkaunt yuklanmoqda...');
  try {
    const acc = await app.backend.loadAccount();
    if (!acc) { ui.screen('register'); setTimeout(() => $('nickInput').focus(), 50); return; }
    enterMenu(acc);
  } catch (e) { ui.screen('auth'); $('authErr').textContent = 'Xatolik: ' + e.message; }
}
function enterMenu(acc) {
  app.profile = acc.profile;
  let local = null; try { local = JSON.parse(localStorage.getItem('tj_data_' + app.user.uid)); } catch (e) { }
  app.data = mergeData(acc.data || local);
  app.role = 'player'; app.isAdmin = false; app.isSuper = false;
  // rolni serverdan aniqlash (Super Admin / Admin / O'yinchi)
  app.backend.getRole().then(role => {
    app.role = role; app.isSuper = role === 'super'; app.isAdmin = role !== 'player';
    applyAdmin(app.data); ui.renderTop(); if (app.isAdmin) app.saveSoon();
    // admin ranglari oddiy o'yinchida qolmasin
    const col = COLORS.find(c => c.id === app.profile.color);
    if (!app.isAdmin && col && col.admin) ui.setColor('white');
  });
  if (!acc.data) app.saveNow();
  app.profile.icon = app.profile.icon || app.data.equip.icon; app.profile.color = app.profile.color || app.data.equip.color;
  app.stage.set('jerry', app.data.equip.skin.jerry); app.stage.set('tom', app.data.equip.skin.tom);
  ui.screen('menu'); ui.renderTop();
  app.unsubs = [app.backend.watchFriends(f => ui.setFriends(f, null)), app.backend.watchRequests(r => ui.setFriends(null, r)), app.backend.watchGifts(onGifts), app.backend.watchAdmins(list => { app.admins = list; ui.setAdmins && ui.setAdmins(list); })];
  app.backend.heartbeat();
  Promise.resolve(app.backend.makeNet ? app.backend.makeNet() : null).then(n => { app.backend.net = n; initOnline(app); }).catch(e => console.warn('onlayn ulanmadi', e));
  clearInterval(app.hb); app.hb = setInterval(() => app.backend.heartbeat(), 60000);
  SND.playMusic(app.data.equip.music);
}
// kelgan sovg'alarni olish
const claiming = new Set();
async function onGifts(list) {
  for (const g of list) {
    if (claiming.has(g.id)) continue;
    claiming.add(g.id);
    try {
      const got = await app.backend.claimGift(g.id);
      if (got && (got.cur === 'gold' || got.cur === 'diamond') && got.n > 0) {
        app.data.wallet[got.cur] += Math.min(GIFT_MAX, got.n); app.saveSoon(); ui.renderTop();
        const what = `${got.n} ${got.cur === 'gold' ? 'oltin' : 'olmos'}`;
        SND.play('buy');
        if (got.from === 'shop') { ui.toast(`💳 To'lov qabul qilindi: +${what} hisobingizga tushdi!`); app.stage && app.stage.celebrate && app.stage.celebrate(); }
        else ui.toast(`🎁 ${g.nick || 'Admin'} sizga ${what} yubordi!`);
      }
    } catch (e) { console.warn(e); claiming.delete(g.id); }
  }
}
app.logout = async () => { await app.saveNow(); ui.close('settings'); clearInterval(app.hb); await app.backend.signOut(); };

// ---------------- personaj tanlash ----------------
app.selectChar = async kind => {
  const d = app.data;
  if (d.char === kind) return;
  const price = app.isAdmin ? 0 : CHAR_PRICE[kind], name = kind === 'tom' ? 'Tom' : 'Jerry';
  if (app.isAdmin) { d.char = kind; SND.play('buy'); app.stage.celebrate(); app.saveSoon(); ui.renderTop(); return; }
  if (d.wallet.gold < price) { SND.play('error'); ui.toast(`${name}ni tanlash uchun ${price} oltin kerak (sizda ${d.wallet.gold})`, true); return; }
  if (!(await ui.confirm(`<b>${name}</b>ni tanlaysizmi?<br>Narxi: ${price} <span class="cur gold"></span> oltin`))) return;
  d.wallet.gold -= price; d.char = kind; SND.play('buy'); app.stage.celebrate(); app.saveSoon(); ui.renderTop();
};

// ---------------- o'yin ----------------
app.startMatch = (opts = {}) => {
  if (app.match) return;
  goLandscape();
  SND.initAudio(); SND.setVolumes(app.settings.vol, app.settings.musVol, true); SND.stopMusic();
  ui.close('shop'); ui.close('friends'); ui.close('result');
  $('menu').classList.add('hidden');
  app.stage.show(false);
  app.match = new Match(app, opts.role || app.data.char, opts.net);
  app.match.lock();
};
app.pause = () => {
  const m = app.match; if (!m || m.paused || m.phase === 'end') return;
  ui.open('pause');
  if (m.net) return;               // onlayn o'yinda vaqt to'xtamaydi
  m.paused = true; SND.setMood('sneak');
};
app.resume = () => {
  const m = app.match; if (!m) return;
  ui.close('pause'); ui.close('settings'); m.paused = false; SND.setMood(m.jerry.hidden && m.me === 'jerry' ? 'sneak' : 'chase'); m.lock();
};
app.quit = () => { ui.close('pause'); endMatch(); };
function endMatch() {
  const m = app.match; if (!m) return;
  m.dispose(); app.match = null;
  $('menu').classList.remove('hidden'); app.stage.show(true); ui.renderTop();
  $('countdown').classList.add('hidden');
  SND.stopMusic(); SND.setMood('chase'); SND.playMusic(app.data.equip.music);
}
app.onMatchEnd = r => {
  const d = app.data;
  d.wallet.sir += r.sir; d.stats.games++; d.stats.sirTotal += r.sir;
  if (r.win) { d.stats.wins++; d.stats[r.me === 'tom' ? 'tomWins' : 'jerryWins']++; }
  if (r.me === 'tom') d.stats.catches += r.catches;
  app.saveSoon();
  endMatch();
  ui.showResult(r);
};
app.countdown = t => { const el = $('countdown'); if (t === null) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); el.textContent = t; };
app.shake = a => { app.shakeAmt = Math.max(app.shakeAmt, a); };
document.addEventListener('keydown', e => { if (e.code === 'Escape' && app.match && app.match.paused && $('settings').classList.contains('hidden')) app.resume(); });

// ---------------- tsikl ----------------
let last = performance.now(), T = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  app.shakeAmt = Math.max(0, app.shakeAmt - dt * 1.5);
  if (!document.hidden) adaptResolution(dt, app.settings.autoRes);
  if (app.match) app.match.update(dt);
  else { app.stage.update(dt, T); ui.placeCards(); }
  render();
}

boot().catch(e => { console.error(e); ui.loading(1, 'Xatolik: ' + e.message); });
