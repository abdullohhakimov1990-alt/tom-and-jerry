// Menyular: bosh menyu, do'kon, do'stlar paneli, profil, sozlamalar, natija oynasi.
import { SETS, ITEMS, MUSIC, ICONS, COLORS, RATE, CHAR_PRICE, CUR_NAME, RAR_NAME, setById, DONATE, GIFT_MAX } from './catalog.js';
import { PAYMENT } from './config.js';
import { iconURL, skinURL, buildSkinShots } from './icons.js';
import { checkNick, ONLINE_MS } from './backend.js';
import * as SND from './audio.js';

const $ = id => document.getElementById(id);
const GRAD = new Set(['sunset', 'goldshine', 'toxic', 'bloodnight', 'pearl', 'fire', 'ice', 'neon', 'rainbow', 'galaxy', 'royal']);
export const nickHTML = (nick, color = 'white') => `<span class="nc-${color}${GRAD.has(color) ? ' grad' : ''}">${esc(nick)}</span>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const curIco = c => `<span class="cur ${c}"></span>`;
const fmt = n => Math.floor(n).toLocaleString('ru-RU');

let app, shopTab = 'skins', skinFilter = 'all', preview = null, frTab = 'list', toastTimer, musicPrevTimer;

export const ui = {};

ui.init = function (a) {
  app = a;
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-close]'); if (c) { ui.close(c.dataset.close); SND.play('click'); }
  });
  $('btnShop').onclick = () => ui.openShop('skins');
  $('btnRules').onclick = () => ui.open('rules');
  $('btnAdmin').onclick = () => ui.openAdmin();
  $('btnApGift').onclick = ui.adminGift;
  $('btnApAdd').onclick = () => ui.adminSet($('apAdminPid').value, true);
  for (const id of ['apGiftPid', 'apAdminPid']) $(id).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('btnSettings').onclick = () => ui.openSettings();
  $('btnFriends').onclick = () => ui.openFriends();
  $('profileChip').onclick = () => ui.openProfile();
  $('btnPlay').onclick = () => { SND.play('click'); app.startMatch(); };
  document.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => {
    if (b.dataset.ex === 'sir') ui.toast("Sir o'yinda yig'iladi — Jerry bo'lib sir ye, Tom bo'lib Jerryni ushla!");
    else ui.openShop('exchange');
  });
  document.querySelectorAll('[data-stab]').forEach(b => b.onclick = () => { shopTab = b.dataset.stab; ui.renderShop(); SND.play('click'); });
  document.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { frTab = b.dataset.ftab; ui.renderFriends(); });
  $('btnCopyId').onclick = $('btnCopyId2').onclick = () => { navigator.clipboard?.writeText(app.profile.pid); ui.toast('ID nusxalandi: ' + app.profile.pid); };
  $('btnAddFriend').onclick = ui.addFriend;
  $('frInput').addEventListener('keydown', e => { if (e.key === 'Enter') ui.addFriend(); });
  $('frInput').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('btnRename').onclick = ui.rename;
  // ro'yxatdan o'tish
  const ni = $('nickInput');
  ni.addEventListener('input', () => { $('nickCount').textContent = ni.value.trim().length + '/15'; $('regErr').textContent = ''; });
  ni.addEventListener('keydown', e => { if (e.key === 'Enter') $('btnRegister').click(); });
  // sozlamalar
  const S = app.settings;
  const bindRange = (id, key, fmtv, after) => { const el = $(id); el.value = S[key]; const v = $(id + 'V'); if (v) v.textContent = fmtv(S[key]); el.oninput = () => { S[key] = +el.value; if (v) v.textContent = fmtv(S[key]); app.saveSettings(); after && after(); }; };
  bindRange('sSens', 'sens', v => (+v).toFixed(2));
  bindRange('sFov', 'fov', v => v + '°');
  bindRange('sVol', 'vol', v => v, () => SND.setVolumes(S.vol, S.musVol, true));
  bindRange('sMus', 'musVol', v => v, () => SND.setVolumes(S.vol, S.musVol, true));
  $('sAuto').checked = S.autoRes !== false; $('sAuto').onchange = () => { S.autoRes = $('sAuto').checked; app.saveSettings(); };
  $('sInv').checked = !!S.invertY; $('sInv').onchange = () => { S.invertY = $('sInv').checked; app.saveSettings(); };
  $('sQuality').value = S.quality; $('sQuality').onchange = () => { S.quality = $('sQuality').value; app.saveSettings(); location.reload(); };
  $('btnLogout').onclick = async () => { if (await ui.confirm('Akkauntdan chiqasizmi?')) app.logout(); };
  // pauza / natija
  $('btnResume').onclick = () => app.resume();
  $('btnQuit').onclick = async () => { if (await ui.confirm("O'yindan chiqasizmi? Bu raunddagi sirlar saqlanmaydi.")) app.quit(); };
  $('btnPauseSettings').onclick = () => ui.openSettings();
  $('btnAgain').onclick = () => { ui.close('result'); app.startMatch(); };
  $('btnToMenu').onclick = () => { ui.close('result'); };
};

// ---------------- ekranlar ----------------
ui.screen = function (name) {
  for (const id of ['loading', 'auth', 'register', 'menu']) $(id).classList.toggle('hidden', id !== name);
  if (name !== 'menu') { ui.close('shop'); ui.close('friends'); }
};
ui.loading = (p, txt) => { $('loadFill').style.width = Math.round(p * 100) + '%'; if (txt) $('loadText').textContent = txt; };
ui.open = id => { $(id).classList.remove('hidden'); };
ui.close = function (id) {
  if (id === 'friends') { $('friends').classList.remove('open'); return; }
  $(id).classList.add('hidden');
  if (id === 'shop') { app.stage.shop(false); ui.endPreview(); }
  if (id === 'settings' && app.match && app.match.paused) ui.open('pause');
};
ui.toast = (msg, bad) => {
  const t = $('gToast'); t.textContent = msg; t.className = 'on' + (bad ? ' bad' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 2200);
};
ui.confirm = text => new Promise(res => {
  $('cfText').innerHTML = text; ui.open('confirm');
  $('cfYes').onclick = () => { ui.close('confirm'); res(true); };
  $('cfNo').onclick = () => { ui.close('confirm'); res(false); };
});

// ---------------- yuqori panel ----------------
ui.renderTop = function () {
  const d = app.data, p = app.profile; if (!d || !p) return;
  for (const [id, k] of [['wSir', 'sir'], ['wGold', 'gold'], ['wDia', 'diamond']]) { $(id).textContent = fmt(d.wallet[k]); document.querySelectorAll('.' + id).forEach(e => e.textContent = fmt(d.wallet[k])); }
  $('pcIcon').src = iconURL[p.icon] || iconURL.j_classic; $('pcNick').innerHTML = nickHTML(p.nick, p.color) + (app.isSuper ? ' <span class="admin-badge">👑 SUPER ADMIN</span>' : app.isAdmin ? ' <span class="admin-badge">⭐ ADMIN</span>' : '');
  $('btnAdmin').classList.toggle('hidden', !app.isAdmin); $('pcId').textContent = p.pid;
  $('frMyId').textContent = p.pid;
  $('playAs').textContent = (d.char === 'tom' ? 'Tom' : 'Jerry') + " bo'lib";
  ui.renderCards();
};
ui.renderCards = function () {
  const d = app.data;
  $('charCards').innerHTML = ['jerry', 'tom'].map(k => {
    const sel = d.char === k, set = setById(d.equip.skin[k]);
    return `<div class="ccard ${sel ? 'sel' : ''}" data-char="${k}"><h4>${k === 'tom' ? 'Tom' : 'Jerry'}</h4><div class="skin">${set.name} skin</div>
      <div class="st">${sel ? '✔ Tanlangan' : `Tanlash — ${CHAR_PRICE[k]} ${curIco('gold')}`}</div></div>`;
  }).join('');
  document.querySelectorAll('.ccard').forEach(c => c.onclick = () => app.selectChar(c.dataset.char));
  ui.placeCards();
};
ui.placeCards = function () {
  if ($('menu').classList.contains('hidden')) return;
  for (const c of document.querySelectorAll('.ccard')) {
    const [x, y] = app.stage.screenPos(c.dataset.char);
    c.style.left = x + 'px'; c.style.top = Math.min(window.innerHeight - 110, y + 8) + 'px';
    c.style.display = !$('shop').classList.contains('hidden') ? 'none' : '';
  }
};

// ---------------- sotib olish ----------------
async function pay(cur, price, what) {
  const w = app.data.wallet;
  if (!app.isAdmin && w[cur] < price) { SND.play('error'); ui.toast(`${CUR_NAME[cur]} yetarli emas! Kerak: ${price}`, true); return false; }
  if (!app.isAdmin && (cur === 'diamond' || price >= 20)) { if (!(await ui.confirm(`<b>${what}</b><br>${price} ${curIco(cur)} ${CUR_NAME[cur].toLowerCase()} evaziga sotib olasizmi?`))) return false; }
  if (!app.isAdmin) w[cur] -= price;
  SND.play('buy'); app.saveSoon(); ui.renderTop();
  return true;
}
const priceBtn = (cur, price, attrs = '', cls = 'gold') => `<button class="btn ${cls}" ${attrs}>${price} ${curIco(cur)}</button>`;

// ---------------- do'kon ----------------
ui.openShop = function (tab) {
  shopTab = tab || shopTab;
  ui.open('shop'); app.stage.shop(true); ui.placeCards(); ui.renderShop();
  if (!skinURL['jerry:classic']) {
    buildSkinShots(p => { const el = document.getElementById('shotProg'); if (el) el.textContent = Math.round(p * 100) + '%'; }).then(() => { if (!$('shop').classList.contains('hidden') && shopTab === 'skins') ui.renderShop(); });
  }
};
ui.endPreview = function () {
  if (!preview) return;
  preview = null; app.stage.set('jerry', app.data.equip.skin.jerry); app.stage.set('tom', app.data.equip.skin.tom);
  ui.placeCards();
};
ui.renderShop = function () {
  document.querySelectorAll('[data-stab]').forEach(b => b.classList.toggle('on', b.dataset.stab === shopTab));
  ui.renderTop();
  const body = $('shopBody'), d = app.data, own = d.owned;
  if (shopTab === 'skins') {
    const ready = !!skinURL['jerry:classic'];
    body.innerHTML = `<div class="tabs" style="margin-bottom:10px">${[['all', 'Hammasi'], ['gold', 'Oltinga'], ['diamond', 'Olmosga']].map(([k, n]) => `<button class="tab ${skinFilter === k ? 'on' : ''}" data-sf="${k}">${n}</button>`).join('')}</div>
      ${ready ? '' : `<div class="note">Skin rasmlari tayyorlanmoqda... <b id="shotProg">0%</b></div>`}
      <div class="sub" style="text-align:left;margin-bottom:8px">Har bir to'plamda Tom va Jerry uchun bir xil mavzudagi skin bor. Kartani bossangiz — sahnada ko'rasiz.</div>
      <div class="grid">${SETS.filter(s => skinFilter === 'all' || (skinFilter === s.cur)).map(s => {
        const btn = k => {
          const id = k + ':' + s.id, has = own.skins[id], eq = d.equip.skin[k] === s.id, nm = k === 'tom' ? 'Tom' : 'Jerry';
          if (eq) return `<button class="btn small green" disabled>${nm}: kiyilgan</button>`;
          if (has) return `<button class="btn small blue" data-eq="${id}">${nm}: kiyish</button>`;
          return `<button class="btn small ${s.cur === 'diamond' ? 'blue' : 'gold'}" data-buy="${id}">${nm} ${s.price[k]} ${curIco(s.cur)}</button>`;
        };
        return `<div class="scard ${preview === s.id ? 'prev' : ''}" data-set="${s.id}">
          <div class="thumbs">${['jerry', 'tom'].map(k => skinURL[k + ':' + s.id] ? `<img src="${skinURL[k + ':' + s.id]}" alt="">` : '<div class="ph"></div>').join('')}</div>
          <h4>${s.name}<span class="rar ${s.rar}">${RAR_NAME[s.rar]}</span></h4>
          <div class="buyrow">${btn('jerry')}${btn('tom')}</div></div>`;
      }).join('')}</div>`;
    body.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { skinFilter = b.dataset.sf; ui.renderShop(); });
    body.querySelectorAll('.scard').forEach(c => c.onclick = e => {
      if (e.target.closest('button')) return;
      preview = c.dataset.set; app.stage.set('jerry', preview); app.stage.set('tom', preview); app.stage.celebrate(); SND.play('click'); ui.renderShop();
    });
    body.querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => {
      const [k, sid] = b.dataset.buy.split(':'), s = setById(sid);
      if (await pay(s.cur, s.price[k], `${s.name} skin (${k === 'tom' ? 'Tom' : 'Jerry'})`)) {
        own.skins[b.dataset.buy] = 1; d.equip.skin[k] = sid; preview = null; app.stage.set(k, sid); app.stage.celebrate(); ui.toast('Yangi skin! Kiyildi.'); ui.renderShop(); app.saveSoon();
      }
    });
    body.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { const [k, sid] = b.dataset.eq.split(':'); d.equip.skin[k] = sid; preview = null; app.stage.set(k, sid); app.saveSoon(); SND.play('click'); ui.renderShop(); });
  } else if (shopTab === 'items') {
    const row = it => `<div class="lrow"><span class="ic it-${it.id}" style="--c:${it.col}"></span>
      <div class="info"><b>${it.name}</b><div>${it.desc}</div></div><div class="cnt">×${d.inv[it.id] || 0}</div>
      ${priceBtn(it.cur, it.price, `data-bi="${it.id}"`)}<button class="btn blue" data-bp="${it.id}">×${it.pack.n} — ${it.pack.price} ${curIco(it.pack.cur)}</button></div>`;
    body.innerHTML = `<div class="sub" style="text-align:left">O'yinda <kbd>1</kbd>–<kbd>7</kbd> tugmalari bilan ishlatiladi. Har biri bir martalik.</div>
      <div class="sec-title">JERRY UCHUN</div>${ITEMS.filter(i => i.for === 'jerry').map(row).join('')}
      <div class="sec-title">TOM UCHUN</div>${ITEMS.filter(i => i.for === 'tom').map(row).join('')}`;
    body.querySelectorAll('[data-bi]').forEach(b => b.onclick = async () => { const it = ITEMS.find(i => i.id === b.dataset.bi); if (await pay(it.cur, it.price, it.name)) { d.inv[it.id] = (d.inv[it.id] || 0) + 1; ui.renderShop(); } });
    body.querySelectorAll('[data-bp]').forEach(b => b.onclick = async () => { const it = ITEMS.find(i => i.id === b.dataset.bp); if (await pay(it.pack.cur, it.pack.price, `${it.name} ×${it.pack.n}`)) { d.inv[it.id] = (d.inv[it.id] || 0) + it.pack.n; ui.renderShop(); } });
  } else if (shopTab === 'music') {
    body.innerHTML = `<div class="sub" style="text-align:left">Tanlangan musiqa o'yin davomida va menyuda chaladi.</div>` + MUSIC.map(m => {
      const has = m.free || own.music[m.id], eq = d.equip.music === m.id;
      return `<div class="lrow"><span class="ic" style="--c:${m.cur === 'diamond' ? '#40e0ff' : '#ffb300'}">♫</span><div class="info"><b>${m.name}</b><div>${m.free ? 'Bepul' : (m.cur === 'diamond' ? 'Olmos' : 'Oltin') + ' musiqa'}</div></div>
        <button class="btn" data-mp="${m.id}">▶ Tinglash</button>
        ${eq ? '<button class="btn green" disabled>Tanlangan</button>' : has ? `<button class="btn blue" data-me="${m.id}">Tanlash</button>` : priceBtn(m.cur, m.price, `data-mb="${m.id}"`, m.cur === 'diamond' ? 'blue' : 'gold')}</div>`;
    }).join('');
    body.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => {
      SND.initAudio(); SND.stopMusic(); SND.playMusic(b.dataset.mp); ui.toast('▶ ' + MUSIC.find(m => m.id === b.dataset.mp).name);
      clearTimeout(musicPrevTimer); musicPrevTimer = setTimeout(() => { SND.stopMusic(); SND.playMusic(app.data.equip.music); }, 12000);
    });
    body.querySelectorAll('[data-me]').forEach(b => b.onclick = () => { d.equip.music = b.dataset.me; SND.stopMusic(); SND.playMusic(d.equip.music); app.saveSoon(); ui.renderShop(); });
    body.querySelectorAll('[data-mb]').forEach(b => b.onclick = async () => { const m = MUSIC.find(x => x.id === b.dataset.mb); if (await pay(m.cur, m.price, m.name + ' musiqasi')) { own.music[m.id] = 1; d.equip.music = m.id; SND.stopMusic(); SND.playMusic(m.id); ui.renderShop(); } });
  } else if (shopTab === 'icons') {
    body.innerHTML = `<div class="icon-grid">${ICONS.map(ic => {
      const has = ic.free || own.icons[ic.id], eq = app.profile.icon === ic.id;
      return `<div class="icard ${eq ? 'eq' : ''}"><img src="${iconURL[ic.id]}" alt=""><div class="nm">${ic.name}</div><span class="rar ${ic.rar}">${RAR_NAME[ic.rar]}</span>
        ${eq ? '<button class="btn green" disabled>Qo\'yilgan</button>' : has ? `<button class="btn blue" data-ie="${ic.id}">Qo'yish</button>` : priceBtn(ic.cur, ic.price, `data-ib="${ic.id}"`, ic.cur === 'diamond' ? 'blue' : 'gold')}</div>`;
    }).join('')}</div>`;
    body.querySelectorAll('[data-ie]').forEach(b => b.onclick = () => ui.setIcon(b.dataset.ie));
    body.querySelectorAll('[data-ib]').forEach(b => b.onclick = async () => { const ic = ICONS.find(x => x.id === b.dataset.ib); if (await pay(ic.cur, ic.price, ic.name + ' ikonkasi')) { own.icons[ic.id] = 1; ui.setIcon(ic.id); } });
  } else if (shopTab === 'colors') {
    body.innerHTML = `<div class="color-grid">${COLORS.map(c => {
      const has = c.free || own.colors[c.id], eq = app.profile.color === c.id;
      return `<div class="ccard2 ${eq ? 'eq' : ''}"><div class="nick">${nickHTML(app.profile.nick, c.id)}</div><div class="cn">${c.name}</div>
        ${eq ? '<button class="btn green" disabled>Tanlangan</button>' : has ? `<button class="btn blue" data-ce="${c.id}">Tanlash</button>` : priceBtn(c.cur, c.price, `data-cb="${c.id}"`, c.cur === 'diamond' ? 'blue' : 'gold')}</div>`;
    }).join('')}</div>`;
    body.querySelectorAll('[data-ce]').forEach(b => b.onclick = () => ui.setColor(b.dataset.ce));
    body.querySelectorAll('[data-cb]').forEach(b => b.onclick = async () => { const c = COLORS.find(x => x.id === b.dataset.cb); if (await pay(c.cur, c.price, c.name + ' nik rangi')) { own.colors[c.id] = 1; ui.setColor(c.id); } });
  } else if (shopTab === 'donate') {
    const pack = p => `<div class="dcard ${p.cur}">${p.tag ? `<span class="dtag">${p.tag}</span>` : ''}
        <div class="damt">${curIco(p.cur)} <b>${fmt(p.n)}</b></div><div class="dname">${p.cur === 'diamond' ? 'olmos' : 'oltin'}</div>
        <button class="btn ${p.cur === 'diamond' ? 'blue' : 'gold'}" data-don="${p.id}">${fmt(p.uzs)} so'm</button><div class="dusd">≈ $${p.usd.toFixed(2)}</div></div>`;
    const ways = payWays(), way = curWay();
    const pick = ways.length > 1 ? `<div class="sec-title">TO'LOV USULI</div><div class="payway">${ways.map(w => `<button class="btn ${w === way ? 'green' : ''}" data-pw="${w}">${PAY_NAME[w]}</button>`).join('')}</div>` : '';
    body.innerHTML = `<div class="sub" style="text-align:left">Kurs: <b>30 olmos = $1</b>, <b>200 oltin = $0.30</b>. To'lov tasdiqlangan zahoti hisobingizga tushadi.</div>
      ${pick}
      <div class="sec-title">OLMOS</div><div class="dgrid">${DONATE.filter(p => p.cur === 'diamond').map(pack).join('')}</div>
      <div class="sec-title">OLTIN</div><div class="dgrid">${DONATE.filter(p => p.cur === 'gold').map(pack).join('')}</div>
      <div class="sec-title">TO'LOV KARTASI</div>
      <div class="lrow"><span class="ic" style="--c:#42a5f5">💳</span><div class="info"><b>Uzcard · Humo · Visa</b><div>Karta ${ways.length ? ways.map(w => PAY_NAME[w]).join(' / ') : 'Payme / Click'} sahifasida kiritiladi. U yerda kartani bir marta saqlasangiz, keyingi to'lovlarda o'sha karta o'zi tanlanadi. Karta raqami o'yinga berilmaydi.</div></div></div>`;
    body.querySelectorAll('[data-don]').forEach(b => b.onclick = () => ui.donate(DONATE.find(p => p.id === b.dataset.don)));
    body.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => { try { localStorage.setItem('tj_payway', b.dataset.pw); } catch (e) { } SND.play('click'); ui.renderShop(); });
  } else if (shopTab === 'exchange') {
    const w = d.wallet, maxG = Math.floor(w.sir / RATE.SIR_PER_GOLD), maxD = Math.floor(w.gold / RATE.GOLD_PER_DIAMOND);
    body.innerHTML = `<div class="exch">
      <div class="exbox"><div class="rate">${RATE.SIR_PER_GOLD} ${curIco('sir')} = 1 ${curIco('gold')}</div>
        <div class="row">${[1, 10].map(n => `<button class="btn gold" data-xg="${n}" ${maxG < n ? 'disabled' : ''}>+${n} oltin</button>`).join('')}<button class="btn orange" data-xg="${maxG}" ${maxG < 1 ? 'disabled' : ''}>Hammasini (${maxG})</button></div>
        <div class="exnote">Sir o'yinda yig'iladi: Jerry bo'lib sir yesang, yashab qolsang, Tom bo'lib Jerryni ushlasang.</div></div>
      <div class="exbox"><div class="rate">${RATE.GOLD_PER_DIAMOND} ${curIco('gold')} = 1 ${curIco('diamond')}</div>
        <div class="row">${[1, 5].map(n => `<button class="btn blue" data-xd="${n}" ${maxD < n ? 'disabled' : ''}>+${n} olmos</button>`).join('')}<button class="btn purple" data-xd="${maxD}" ${maxD < 1 ? 'disabled' : ''}>Hammasini (${maxD})</button></div>
        <div class="exnote">Olmos — eng qimmat valyuta: noyob skinlar, ikonkalar va yaltiroq nik ranglari uchun.</div></div></div>`;
    body.querySelectorAll('[data-xg]').forEach(b => b.onclick = () => { const n = +b.dataset.xg; if (n < 1 || w.sir < n * RATE.SIR_PER_GOLD) return; w.sir -= n * RATE.SIR_PER_GOLD; w.gold += n; SND.play('coin'); app.saveSoon(); ui.renderShop(); ui.toast(`+${n} oltin`); });
    body.querySelectorAll('[data-xd]').forEach(b => b.onclick = async () => { const n = +b.dataset.xd; if (n < 1 || w.gold < n * RATE.GOLD_PER_DIAMOND) return; if (!(await ui.confirm(`${n * RATE.GOLD_PER_DIAMOND} oltinni ${n} olmosga almashtirasizmi?`))) return; w.gold -= n * RATE.GOLD_PER_DIAMOND; w.diamond += n; SND.play('buy'); app.saveSoon(); ui.renderShop(); ui.toast(`+${n} olmos`); });
  }
};
ui.setIcon = function (id) { app.profile.icon = id; app.data.equip.icon = id; app.backend.updateProfile({ icon: id }).catch(() => { }); app.saveSoon(); SND.play('click'); ui.renderTop(); if (!$('shop').classList.contains('hidden')) ui.renderShop(); if (!$('profile').classList.contains('hidden')) ui.renderProfile(); };
ui.setColor = function (id) { app.profile.color = id; app.data.equip.color = id; app.backend.updateProfile({ color: id }).catch(() => { }); app.saveSoon(); SND.play('click'); ui.renderTop(); if (!$('shop').classList.contains('hidden')) ui.renderShop(); if (!$('profile').classList.contains('hidden')) ui.renderProfile(); };

// ---------------- do'stlar ----------------
let friends = [], requests = [];
ui.setFriends = (f, r) => { if (f) friends = f; if (r) requests = r; ui.renderFriends(); };
const ago = ms => {
  const s = (Date.now() - ms) / 1000;
  if (!ms) return "noma'lum";
  if (s < ONLINE_MS / 1000) return 'Onlayn';
  if (s < 3600) return Math.round(s / 60) + ' daqiqa oldin';
  if (s < 86400) return Math.round(s / 3600) + ' soat oldin';
  return Math.round(s / 86400) + ' kun oldin';
};
ui.openFriends = function () { $('friends').classList.add('open'); ui.renderFriends(); SND.play('click'); };
ui.renderFriends = function () {
  $('frCount').textContent = friends.length; $('rqCount').textContent = requests.length;
  const badge = $('frBadge'); badge.textContent = requests.length; badge.classList.toggle('hidden', !requests.length);
  document.querySelectorAll('[data-ftab]').forEach(b => b.classList.toggle('on', b.dataset.ftab === frTab));
  $('frList').classList.toggle('hidden', frTab !== 'list'); $('rqList').classList.toggle('hidden', frTab !== 'req');
  const row = (f, acts) => {
    const on = Date.now() - (f.lastSeen || 0) < ONLINE_MS, recent = Date.now() - (f.lastSeen || 0) < 86400000 * 3;
    const adm = (app.admins || []).some(a => a.uid === f.uid) ? ' <span class="admin-badge">⭐</span>' : '';
    return `<div class="frow"><img src="${iconURL[f.icon] || iconURL.j_classic}" alt=""><div class="fi"><div class="fn">${nickHTML(f.nick || '???', f.color)}${adm}</div>
      <div class="fs"><span class="dot ${on ? 'on' : recent ? 'recent' : ''}"></span>${acts ? 'ID: ' + esc(f.pid) : ago(f.lastSeen) + ' · ID: ' + esc(f.pid)}</div></div><div class="acts">${acts || `${on ? `<button class="btn small orange" data-inv="${f.uid}" title="O'yinga chaqirish">🎮</button>` : ''}${app.isAdmin ? `<button class="btn small gold" data-gf="${f.uid}" title="Sovg'a">🎁</button>` : ''}<button class="btn small" data-rm="${f.uid}" title="O'chirish">✕</button>`}</div></div>`;
  };
  const sorted = friends.slice().sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  const online = sorted.filter(f => Date.now() - (f.lastSeen || 0) < ONLINE_MS), recent = sorted.filter(f => !online.includes(f) && Date.now() - (f.lastSeen || 0) < 86400000 * 3), rest = sorted.filter(f => !online.includes(f) && !recent.includes(f));
  $('frList').innerHTML = friends.length ? [['Onlayn', online], ['Yaqinda kirganlar', recent], ['Boshqalar', rest]].filter(x => x[1].length).map(([t, l]) => `<div class="fsec">${t} (${l.length})</div>` + l.map(f => row(f)).join('')).join('')
    : `<div class="empty-msg">Hali do'stlar yo'q.<br>Do'stingizning ID raqamini yuqoriga yozing va "Qo'shish"ni bosing.</div>`;
  $('rqList').innerHTML = requests.length ? requests.map(r => row(r, `<button class="btn small green" data-ac="${r.uid}">Qabul</button><button class="btn small red" data-dc="${r.uid}">✕</button>`)).join('')
    : `<div class="empty-msg">Yangi so'rovlar yo'q.</div>`;
  document.querySelectorAll('[data-ac]').forEach(b => b.onclick = async () => { await app.backend.accept(b.dataset.ac); SND.play('buy'); ui.toast("Do'stlikka qabul qilindi!"); });
  document.querySelectorAll('[data-dc]').forEach(b => b.onclick = async () => { await app.backend.decline(b.dataset.dc); });
  document.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => ui.openGift(friends.find(f => f.uid === b.dataset.gf)));
  document.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => app.inviteFriend ? app.inviteFriend(friends.find(f => f.uid === b.dataset.inv)) : ui.toast("Do'st bilan birga o'ynash tez orada qo'shiladi"));
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { if (await ui.confirm("Do'stlar ro'yxatidan o'chirasizmi?")) await app.backend.removeFriend(b.dataset.rm); });
};
ui.addFriend = async function () {
  const v = $('frInput').value.trim(), m = $('frMsg');
  if (!/^\d{8}$/.test(v)) { m.textContent = 'ID 8 ta raqamdan iborat'; m.className = 'msg bad'; return; }
  try {
    const r = await app.backend.sendRequest(v);
    m.textContent = r === 'accepted' ? "U sizga ham so'rov yuborgan edi — endi do'stsiz!" : "So'rov yuborildi! U qabul qilishini kuting."; m.className = 'msg ok';
    $('frInput').value = ''; SND.play('coin');
  } catch (e) { m.textContent = e.message; m.className = 'msg bad'; SND.play('error'); }
};

// ---------------- profil ----------------
ui.openProfile = function () { ui.open('profile'); ui.renderProfile(); SND.play('click'); };
ui.renderProfile = function () {
  const p = app.profile, d = app.data;
  $('prIcon').src = iconURL[p.icon]; $('prNick').innerHTML = nickHTML(p.nick, p.color); $('prId').textContent = p.pid; $('prNickInput').value = p.nick;
  $('prIcons').innerHTML = ICONS.filter(ic => ic.free || d.owned.icons[ic.id]).map(ic => `<div class="icard ${p.icon === ic.id ? 'eq' : ''}" data-pi="${ic.id}" style="cursor:pointer"><img src="${iconURL[ic.id]}" alt=""><div class="nm">${ic.name}</div></div>`).join('')
    + `<div class="icard" style="justify-content:center;cursor:pointer" id="prMoreIcons"><div class="nm">+ Do'kondan<br>ko'proq</div></div>`;
  $('prColors').innerHTML = COLORS.filter(c => c.free || d.owned.colors[c.id]).map(c => `<div class="ccard2 ${p.color === c.id ? 'eq' : ''}" data-pc="${c.id}" style="cursor:pointer"><div class="nick">${nickHTML(p.nick, c.id)}</div></div>`).join('');
  document.querySelectorAll('[data-pi]').forEach(e => e.onclick = () => ui.setIcon(e.dataset.pi));
  document.querySelectorAll('[data-pc]').forEach(e => e.onclick = () => ui.setColor(e.dataset.pc));
  $('prMoreIcons').onclick = () => { ui.close('profile'); ui.openShop('icons'); };
  const s = d.stats;
  $('prStats').innerHTML = `<div>O'yinlar <b>${s.games}</b></div><div>G'alabalar <b>${s.wins}</b></div><div>Jerry g'alabalari <b>${s.jerryWins}</b></div><div>Tom g'alabalari <b>${s.tomWins}</b></div><div>Yig'ilgan sir <b>${fmt(s.sirTotal)}</b></div><div>Ushlashlar <b>${s.catches}</b></div>`;
};
ui.rename = async function () {
  const v = $('prNickInput').value.trim(), err = checkNick(v);
  if (err) { $('prErr').textContent = err; return; }
  $('prErr').textContent = '';
  app.profile.nick = v; await app.backend.updateProfile({ nick: v }).catch(() => { });
  ui.renderProfile(); ui.renderTop(); ui.toast('Nik o\'zgartirildi');
};

// ---------------- sozlamalar ----------------
ui.openSettings = function () { ui.close('pause'); ui.open('settings'); };

// ---------------- natija ----------------
ui.showResult = function (r) {
  $('resTitle').textContent = (r.win ? "G'ALABA!" : "MAG'LUBIYAT") + (r.online && r.oppNick ? ` (vs ${r.oppNick})` : '');
  $('resTitle').style.color = r.win ? '#ffd23f' : '#ff7b86';
  const t = Math.floor(r.time);
  $('resBody').innerHTML = r.me === 'jerry'
    ? `<div>Yashab qolding <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b></div><div>Qolgan jon <b>${Math.max(0, r.lives)}</b></div><div>Yig'ilgan sir <b>${r.cheese}</b></div><div>Qochib qutulish <b>${r.escapes}</b></div>`
    : `<div>Ushlashlar <b>${r.catches}</b></div><div>Topilgan joylar <b>${r.finds}</b></div><div>Vaqt <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b></div><div>Jerryning joni <b>${Math.max(0, r.lives)}</b></div>`;
  $('resSir').textContent = r.sir;
  ui.open('result');
};

// ---------------- sovg'a ----------------
let giftCur = 'diamond', giftFriend = null;
ui.openGift = function (f) {
  if (!f) return;
  giftFriend = f; ui.open('gift');
  $('giftTo').innerHTML = nickHTML(f.nick, f.color);
  const upd = () => {
    document.querySelectorAll('[data-gc]').forEach(b => b.classList.toggle('on', b.dataset.gc === giftCur));
    $('giftHave').textContent = app.isAdmin ? 'Admin: cheksiz' : `Sizda: ${fmt(app.data.wallet[giftCur])}`;
  };
  document.querySelectorAll('[data-gc]').forEach(b => b.onclick = () => { giftCur = b.dataset.gc; upd(); });
  upd();
  $('btnGift').onclick = async () => {
    const n = Math.floor(+$('giftN').value);
    if (!app.isAdmin) { ui.toast("Sovg'ani faqat admin yubora oladi", true); return; }
    if (!(n >= 1 && n <= GIFT_MAX)) { ui.toast(`1 dan ${GIFT_MAX} gacha son yozing`, true); return; }
    const w = app.data.wallet;
    if (!app.isAdmin && w[giftCur] < n) { ui.toast(`${CUR_NAME[giftCur]} yetarli emas`, true); SND.play('error'); return; }
    $('btnGift').disabled = true;
    try {
      await app.backend.sendGift(giftFriend.uid, giftCur, n);
      if (!app.isAdmin) w[giftCur] -= n;
      app.saveSoon(); ui.renderTop(); SND.play('buy');
      ui.close('gift'); ui.toast(`🎁 ${giftFriend.nick} ga ${n} ${CUR_NAME[giftCur].toLowerCase()} yuborildi!`);
    } catch (e) { ui.toast(e.message, true); }
    $('btnGift').disabled = false;
  };
};

// ---------------- donat ----------------
const PAY_NAME = { payme: 'Payme', click: 'Click' };
function payWays() {
  const w = [];
  if (PAYMENT.payme && PAYMENT.payme.merchantId) w.push('payme');
  if (PAYMENT.click && PAYMENT.click.serviceId && PAYMENT.click.merchantId) w.push('click');
  return w;
}
function curWay() { const w = payWays(); let s = null; try { s = localStorage.getItem('tj_payway'); } catch (e) { } return w.includes(s) ? s : w[0]; }
// to'lov sahifasi manzili (buyurtma raqami bilan — server aynan shu buyurtmani tekshiradi)
function payUrl(way, order) {
  const back = location.origin + location.pathname;
  if (way === 'payme') {
    const p = PAYMENT.payme, q = `m=${p.merchantId};ac.order_id=${order.id};a=${order.uzs * 100};l=uz;c=${back}`;
    return (p.test ? 'https://checkout.test.paycom.uz/' : 'https://checkout.paycom.uz/') + btoa(q);
  }
  const c = PAYMENT.click;
  return `https://my.click.uz/services/pay?service_id=${encodeURIComponent(c.serviceId)}&merchant_id=${encodeURIComponent(c.merchantId)}&amount=${order.uzs}&transaction_param=${encodeURIComponent(order.id)}&return_url=${encodeURIComponent(back)}`;
}
ui.donate = async function (pk) {
  if (!pk) return;
  const way = curWay(), what = `${fmt(pk.n)} ${pk.cur === 'diamond' ? 'olmos' : 'oltin'}`;
  if (!way || !app.backend.createOrder) { ui.payNotReady(`${what} — ${fmt(pk.uzs)} so'm`); return; }
  // oyna darhol ochiladi (aks holda brauzer bloklaydi), manzil buyurtma yaratilgach beriladi
  const w = window.open('', '_blank');
  try {
    const order = await app.backend.createOrder(pk.id, way);
    const url = payUrl(way, order);
    if (w) { w.opener = null; w.location.href = url; } else location.href = url;
    ui.toast(`${PAY_NAME[way]} sahifasi ochildi: ${what}. To'lovdan so'ng hisobingizga o'zi tushadi.`);
  } catch (e) { if (w) w.close(); SND.play('error'); ui.toast(e.message || "To'lovni boshlab bo'lmadi", true); }
};
ui.payNotReady = function (what) {
  ui.confirm(`<b>${esc(what)}</b><br><br>Karta orqali to'lov hali ulanmagan — to'lov tizimi (Payme / Click) sozlanmoqda.<br><br>Hozircha donat uchun admin bilan bog'laning va o'z ID raqamingizni yuboring: <b>${esc(app.profile.pid)}</b>`).then(() => { });
};

// ---------------- admin panel ----------------
let adminsList = [];
ui.setAdmins = list => { adminsList = list || []; if (!$('adminPanel').classList.contains('hidden')) ui.renderAdmins(); ui.renderFriends(); };
ui.openAdmin = function () {
  if (!app.isAdmin) return;
  $('apTitle').textContent = app.isSuper ? '👑 Super Admin panel' : '⭐ Admin panel';
  document.querySelectorAll('.super-only').forEach(e => e.classList.toggle('hidden', !app.isSuper));
  ui.open('adminPanel'); ui.renderAdmins(); SND.play('click');
};
ui.renderAdmins = function () {
  const el = $('apAdmins'); if (!el) return;
  el.innerHTML = adminsList.length ? adminsList.map(a => `<div class="frow"><div class="fi"><div class="fn">⭐ ${esc(a.nick || '???')}</div><div class="fs">ID: ${esc(a.pid)}</div></div>
      <div class="acts"><button class="btn small red" data-unadm="${esc(a.pid)}">Adminlikdan olish</button></div></div>`).join('')
    : `<div class="empty-msg">Hali adminlar yo'q</div>`;
  el.querySelectorAll('[data-unadm]').forEach(b => b.onclick = async () => { if (await ui.confirm(`ID ${b.dataset.unadm} — adminlikdan olinsinmi?`)) { ui.openAdmin(); ui.adminSet(b.dataset.unadm, false); } else ui.openAdmin(); });
};
ui.adminSet = async function (pid, on) {
  const m = $('apAdminMsg');
  pid = String(pid || '').trim();
  if (!app.isSuper) { m.textContent = 'Faqat Super Admin admin tayinlay oladi'; m.className = 'msg bad'; return; }
  if (!/^\d{8}$/.test(pid)) { m.textContent = 'ID 8 ta raqamdan iborat'; m.className = 'msg bad'; return; }
  if (pid === app.profile.pid) { m.textContent = "Siz allaqachon Super Adminsiz"; m.className = 'msg bad'; return; }
  try { await app.backend.setAdmin(pid, on); m.textContent = on ? `ID ${pid} endi ADMIN ⭐` : `ID ${pid} adminlikdan olindi`; m.className = 'msg ok'; $('apAdminPid').value = ''; SND.play('buy'); }
  catch (e) { m.textContent = e.message; m.className = 'msg bad'; SND.play('error'); }
};
ui.adminGift = async function () {
  const m = $('apGiftMsg'), pid = $('apGiftPid').value.trim(), n = Math.floor(+$('apGiftN').value), cur = $('apGiftCur').value;
  if (!app.isAdmin) return;
  if (!/^\d{8}$/.test(pid)) { m.textContent = 'ID 8 ta raqamdan iborat'; m.className = 'msg bad'; return; }
  if (!(n >= 1 && n <= GIFT_MAX)) { m.textContent = `1 dan ${GIFT_MAX} gacha son yozing`; m.className = 'msg bad'; return; }
  $('btnApGift').disabled = true;
  try {
    const uid = await app.backend.uidByPid(pid);
    if (uid === app.user.uid) throw new Error("O'zingizga yubora olmaysiz");
    await app.backend.sendGift(uid, cur, n);
    m.textContent = `✅ ID ${pid} ga ${fmt(n)} ${cur === 'diamond' ? 'olmos' : 'oltin'} yuborildi`; m.className = 'msg ok'; SND.play('buy');
  } catch (e) { m.textContent = e.message; m.className = 'msg bad'; SND.play('error'); }
  $('btnApGift').disabled = false;
};
