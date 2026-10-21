// Do'stlar bilan onlayn: guruh (PUBG / Brawl Stars kabi). Taklif → do'st qo'shiladi → menyuda yoningizda turadi,
// guruh chati va mikrofoni ishlaydi. O'YNASH bosilganda birga o'yin (rollar tasodifiy), o'yindan keyin yana guruhga qaytasiz.
import { ui, nickHTML, roleBadge } from './ui.js';
import { iconURL } from './icons.js';
import * as SND from './audio.js';
import { Voice } from './voice.js';

const $ = id => document.getElementById(id);
const INVITE_TTL = 60000;
const QUICK = ["O'ynaymizmi? 🎮", 'Tayyorman! ✅', 'Bir daqiqa ⏳', 'Zo\'r! 😎', 'Hahaha 😂'];

export function initOnline(app) {
  const net = app.backend.net;
  let pending = null, shown = null, unsubInv = null;

  const myInfo = () => ({ nick: app.profile.nick, icon: app.profile.icon, color: app.profile.color, skins: app.data.equip.skin, kind: app.data.char, title: app.isSuper ? 'super' : app.isAdmin ? 'admin' : '' });

  // ---- kelgan takliflar ----
  let lastList = [];
  const evaluate = list => {
    lastList = list;
    const now = net.now();
    const inv = list.filter(i => !i.t || now - i.t < INVITE_TTL).sort((a, b) => (b.t || 0) - (a.t || 0))[0];
    for (const old of list) if (old.t && now - old.t > INVITE_TTL) net.clearInvite(old.from);
    if (!inv || app.match || pending || app.party) { if (!inv && shown) { ui.close('invite'); shown = null; } return; }
    if (shown && shown.room === inv.room) return;
    shown = inv;
    $('invNick').innerHTML = nickHTML(inv.nick || "Do'st", inv.color) + roleBadge(inv.title);
    $('invIcon').src = iconURL[inv.icon] || iconURL.j_classic;
    ui.open('invite'); SND.play('squeak');
    $('btnInvYes').onclick = () => accept(inv);
    $('btnInvNo').onclick = () => decline(inv);
  };
  unsubInv = net ? net.watchInvites(evaluate) : null;
  const iv = net ? setInterval(() => evaluate(lastList), 2000) : null;
  app.unsubs && app.unsubs.push(() => { unsubInv && unsubInv(); clearInterval(iv); leaveParty(true); });

  async function decline(inv) {
    ui.close('invite'); shown = null;
    await net.clearInvite(inv.from);
    await net.updateRoom(inv.room, { status: 'declined' });
  }
  async function accept(inv) {
    ui.close('invite'); shown = null;
    if (app.match) return;
    if (app.hub) app.leaveHub();
    await net.clearInvite(inv.from);
    await net.updateRoom(inv.room, { status: 'lobby', ['players/' + app.user.uid]: myInfo(), ['left/' + app.user.uid]: null });
    enterParty(inv.room, inv.from, false);
  }

  // ---- taklif yuborish ----
  app.inviteFriend = async f => {
    if (!f) return;
    if (!net) { ui.toast("Onlayn o'yin uchun Firebase Realtime Database kerak", true); return; }
    if (app.match) return;
    if (app.party) { ui.toast("Guruhda allaqachon do'stingiz bor. Avval guruhdan chiqing.", true); return; }
    if (pending) { ui.toast(`${pending.f.nick} javobini kutyapmiz...`); ui.open('waiting'); return; }
    try {
      const room = await net.createRoom(f.uid, { players: { [app.user.uid]: myInfo() } });
      await net.sendInvite(f.uid, Object.assign({ room }, myInfo(), { skins: null }));
      pending = { room, f };
      $('waitNick').innerHTML = nickHTML(f.nick, f.color);
      ui.close('friends'); ui.open('waiting');
      const timer = setTimeout(() => cancel("Javob bo'lmadi"), INVITE_TTL);
      const un = net.watchRoom(room, r => {
        if (!pending || pending.room !== room || !r) return;
        if (r.status === 'lobby') { clearTimeout(timer); un && un(); pending = null; ui.close('waiting'); enterParty(room, f.uid, true); }
        else if (r.status === 'declined') { clearTimeout(timer); un && un(); pending = null; ui.close('waiting'); ui.toast(`${f.nick} taklifni rad etdi`, true); net.removeRoom(room); }
      });
      pending.un = un; pending.timer = timer;
    } catch (e) { ui.toast(e.message, true); pending = null; }
  };
  async function cancel(msg) {
    if (!pending) return;
    const { room, f, un, timer } = pending; pending = null;
    clearTimeout(timer); un && un(); ui.close('waiting');
    await net.cancelInvite(f.uid); await net.updateRoom(room, { status: 'cancel' }); setTimeout(() => net.removeRoom(room), 3000);
    if (msg) ui.toast(msg, true);
  }
  $('btnWaitCancel').onclick = () => cancel();

  // ================= GURUH =================
  function enterParty(room, opp, host) {
    const P = app.party = { room, opp, host, info: null, lastStart: 0, msgs: [] };
    SND.play('buy'); ui.toast("Guruhga qo'shildingiz! O'YNASH — birga o'yin");
    net.armDisconnect(room);
    P.voice = new Voice(o => net.sendEvent(room, Object.assign({ type: 'lrtc' }, o)), app.user.uid < opp, () => partyUI());
    P.unEv = net.watchEvents(room, ev => {
      if (ev.type === 'lrtc') P.voice.onSignal(ev);
      else if (ev.type === 'lchat') addMsg(ev, false);
    });
    P.unRoom = net.watchRoom(room, r => {
      if (app.party !== P) return;
      if (!r || r.status === 'closed' || (r.left && r.left[opp] && !app.match)) { leaveParty(true); ui.toast(`${(P.info || {}).nick || "Do'stingiz"} guruhdan chiqdi`, true); return; }
      const info = (r.players || {})[opp];
      if (info && JSON.stringify(info) !== JSON.stringify(P.info)) { P.info = info; app.stage.setFriend(info); partyUI(); }
      if (r.status === 'play' && r.startAt && r.startAt !== P.lastStart && !app.match) { P.lastStart = r.startAt; start(room, r); }
    });
    // menyuda tanlangan personaj yoki skin o'zgarsa, do'stga ko'rinadi
    P.sync = setInterval(() => { const mi = myInfo(), k = JSON.stringify(mi); if (k !== P.mine) { P.mine = k; net.updateRoom(room, { ['players/' + app.user.uid]: mi }); } }, 1500);
    $('menuSocial').classList.add('party');
    partyUI();
  }
  function leaveParty(silent) {
    const P = app.party; if (!P) return;
    app.party = null;
    clearInterval(P.sync); P.unEv && P.unEv(); P.unRoom && P.unRoom();
    if (P.voice) P.voice.close();
    Promise.resolve(net.updateRoom(P.room, { ['left/' + app.user.uid]: true, status: 'closed' })).catch(() => { });
    app.stage.setFriend(null);
    $('menuSocial').classList.remove('party'); $('partyTag').classList.add('hidden');
    partyUI();
  }
  app.leaveParty = () => { leaveParty(false); ui.toast('Guruhdan chiqdingiz'); };

  // O'YNASH: guruhda bo'lsa — birga, rollar tasodifiy
  app.partyPlay = async () => {
    const P = app.party; if (!P || app.match) return;
    if (!P.info) { ui.toast("Do'stingiz hali ulanmoqda...", true); return; }
    const meTom = Math.random() < .5;
    const roles = { [app.user.uid]: meTom ? 'tom' : 'jerry', [P.opp]: meTom ? 'jerry' : 'tom' };
    await net.updateRoom(P.room, { status: 'play', roles, startAt: net.now() + 5000, seed: Math.floor(Math.random() * 1e6), left: null, p: null });
  };
  function start(room, r) {
    const P = app.party, me = app.user.uid;
    ui.close('shop'); ui.close('friends'); ui.close('result'); closeChat();
    app.startMatch({ role: r.roles[me], net: { api: net, room, opp: P.opp, startAt: r.startAt, seed: r.seed || 1, oppInfo: P.info || {}, voice: P.voice, party: true } });
  }
  // o'yindan qaytgach guruh oynasini yangilash
  app.partyBack = () => { if (app.party) { app.party.voice.onChange = () => partyUI(); app.stage.setFriend(app.party.info); partyUI(); } };

  // ---------------- menyu: chat va mikrofon ----------------
  function partyUI() {
    const P = app.party, v = P && P.voice;
    $('mMicBtn').classList.toggle('on', !!(v && v.on));
    const tag = $('partyTag');
    if (!P || !P.info) { tag.classList.add('hidden'); return; }
    tag.classList.remove('hidden');
    tag.querySelector('.pn').innerHTML = (v && v.speaking ? '🔊 ' : '') + nickHTML(P.info.nick, P.info.color) + roleBadge(P.info.title);
  }
  function addMsg(m, mine) {
    const box = $('mChatList'), d = document.createElement('div');
    d.className = 'cm' + (mine ? ' me' : '');
    d.innerHTML = nickHTML(m.nick || '???', m.color) + roleBadge(m.title) + ': ';
    d.appendChild(document.createTextNode(String(m.text || '').slice(0, 80)));
    box.appendChild(d); while (box.children.length > 30) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
    if (!mine) { SND.play('squeak'); if ($('menuChat').classList.contains('hidden')) $('mChatBtn').classList.add('new'); }
  }
  function sendMsg(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!text) return;
    const P = app.party;
    if (!P) { ui.toast("Guruhda hech kim yo'q — Do'stlar → 🎮 orqali taklif qiling", true); return; }
    const now = performance.now(); if (now - (P.lastMsg || 0) < 700) return; P.lastMsg = now;
    const m = { nick: app.profile.nick, color: app.profile.color, title: app.isSuper ? 'super' : app.isAdmin ? 'admin' : '', text };
    net.sendEvent(P.room, Object.assign({ type: 'lchat' }, m)); addMsg(m, true);
  }
  function openChat() { $('menuChat').classList.remove('hidden'); $('mChatBtn').classList.remove('new'); if (!app.party) $('mChatHint').classList.remove('hidden'); else $('mChatHint').classList.add('hidden'); setTimeout(() => $('mChatInput').focus(), 30); }
  function closeChat() { $('menuChat').classList.add('hidden'); }
  $('mChatBtn').onclick = () => { SND.play('click'); $('menuChat').classList.contains('hidden') ? openChat() : closeChat(); };
  $('mChatClose').onclick = closeChat;
  $('mChatSend').onclick = () => { sendMsg($('mChatInput').value); $('mChatInput').value = ''; };
  $('mChatInput').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { sendMsg(e.target.value); e.target.value = ''; } else if (e.key === 'Escape') closeChat(); };
  $('mChatQuick').innerHTML = QUICK.map((q, i) => `<button class="chip" data-mq="${i}">${q}</button>`).join('');
  $('mChatQuick').onclick = e => { const b = e.target.closest('[data-mq]'); if (b) sendMsg(QUICK[+b.dataset.mq]); };
  $('mMicBtn').onclick = async () => {
    const P = app.party;
    if (!P) { ui.toast("Mikrofon guruhda ishlaydi — do'stingizni taklif qiling", true); return; }
    try { const on = await P.voice.toggleMic(); ui.toast(on ? '🎤 Mikrofon yoqildi' : "🎤 Mikrofon o'chirildi"); }
    catch (e) { SND.play('error'); ui.toast(e && e.name === 'NotAllowedError' ? 'Mikrofonga ruxsat berilmadi' : (e.message || 'Mikrofon ishlamadi'), true); }
    partyUI();
  };
  $('partyLeave').onclick = () => app.leaveParty();
  // do'st nomini uning boshi tepasida ushlab turish
  if (!window.__tjTagLoop) (window.__tjTagLoop = function tagLoop() {
    requestAnimationFrame(tagLoop);
    const P = app.party, tag = $('partyTag');
    if (!P || !P.info || app.match || app.hub) { if (!tag.classList.contains('hidden') && (app.match || app.hub)) tag.classList.add('hidden'); return; }
    const p = app.stage.friendScreenPos && app.stage.friendScreenPos();
    if (!p) return;
    tag.classList.remove('hidden'); tag.style.left = p[0] + 'px'; tag.style.top = p[1] + 'px';
  })();
}
