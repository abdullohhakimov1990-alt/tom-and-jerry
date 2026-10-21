// Do'stlar bilan onlayn o'yin: taklif yuborish, qabul qilish, rollarni tasodifiy taqsimlash va o'yinni boshlash.
import { ui, nickHTML, roleBadge } from './ui.js';
import { iconURL } from './icons.js';
import * as SND from './audio.js';

const $ = id => document.getElementById(id);
const INVITE_TTL = 60000;

export function initOnline(app) {
  const net = app.backend.net;
  let pending = null, shown = null, unsubInv = null;

  const myInfo = () => ({ nick: app.profile.nick, icon: app.profile.icon, color: app.profile.color, skins: app.data.equip.skin, title: app.isSuper ? 'super' : app.isAdmin ? 'admin' : '' });

  // ---- kelgan takliflar ----
  if (unsubInv) unsubInv();
  let lastList = [];
  const evaluate = list => {
    lastList = list;
    const now = net.now();
    const inv = list.filter(i => !i.t || now - i.t < INVITE_TTL).sort((a, b) => (b.t || 0) - (a.t || 0))[0];
    for (const old of list) if (old.t && now - old.t > INVITE_TTL) net.clearInvite(old.from);
    if (!inv || app.match || pending) { if (!inv && shown) { ui.close('invite'); shown = null; } return; }
    if (shown && shown.room === inv.room) return;
    shown = inv;
    $('invNick').innerHTML = nickHTML(inv.nick || "Do'st", inv.color) + roleBadge(inv.title);
    $('invIcon').src = iconURL[inv.icon] || iconURL.j_classic;
    ui.open('invite'); SND.play('squeak');
    $('btnInvYes').onclick = () => accept(inv);
    $('btnInvNo').onclick = () => decline(inv);
  };
  unsubInv = net ? net.watchInvites(evaluate) : null;
  // o'yin tugagach yoki vaqt o'tgach qayta tekshirish
  const iv = net ? setInterval(() => evaluate(lastList), 2000) : null;
  app.unsubs && app.unsubs.push(() => { unsubInv && unsubInv(); clearInterval(iv); });

  async function decline(inv) {
    ui.close('invite'); shown = null;
    await net.clearInvite(inv.from);
    await net.updateRoom(inv.room, { status: 'declined' });
  }
  async function accept(inv) {
    ui.close('invite'); shown = null;
    if (app.match) return;
    await net.clearInvite(inv.from);
    await net.updateRoom(inv.room, { status: 'ready', ['players/' + app.user.uid]: myInfo() });
    ui.toast("Qo'shildingiz! O'yin boshlanmoqda...");
    const un = net.watchRoom(inv.room, r => {
      if (!r) { un && un(); return; }
      if (r.status === 'play') { un && un(); start(inv.room, r); }
      if (r.status === 'cancel') { un && un(); ui.toast("Taklif bekor qilindi", true); }
    });
  }

  // ---- taklif yuborish ----
  app.inviteFriend = async f => {
    if (!f) return;
    if (!net) { ui.toast("Onlayn o'yin uchun Firebase Realtime Database kerak", true); return; }
    if (app.match) return;
    if (pending) { ui.toast(`${pending.f.nick} javobini kutyapmiz...`); ui.open('waiting'); return; }
    try {
      const room = await net.createRoom(f.uid, { players: { [app.user.uid]: myInfo() } });
      await net.sendInvite(f.uid, Object.assign({ room }, myInfo(), { skins: null }));
      pending = { room, f };
      $('waitNick').innerHTML = nickHTML(f.nick, f.color);
      ui.close('friends'); ui.open('waiting');
      const timer = setTimeout(() => cancel('Javob bo\'lmadi'), INVITE_TTL);
      const un = net.watchRoom(room, async r => {
        if (!pending || pending.room !== room) return;
        if (!r) return;
        if (r.status === 'ready') {
          // rollar tasodifiy: kim Tom, kim Jerry
          const meTom = Math.random() < .5;
          const roles = { [app.user.uid]: meTom ? 'tom' : 'jerry', [f.uid]: meTom ? 'jerry' : 'tom' };
          await net.updateRoom(room, { status: 'play', roles, startAt: net.now() + 5000 });
        } else if (r.status === 'play') {
          clearTimeout(timer); un && un(); pending = null; ui.close('waiting'); start(room, r);
        } else if (r.status === 'declined') {
          clearTimeout(timer); un && un(); pending = null; ui.close('waiting'); ui.toast(`${f.nick} taklifni rad etdi`, true); net.removeRoom(room);
        }
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

  function start(room, r) {
    const me = app.user.uid, opp = r.host === me ? r.guest : r.host;
    const role = r.roles[me];
    const oppInfo = (r.players || {})[opp] || {};
    ui.close('shop'); ui.close('friends'); ui.close('result');
    app.startMatch({ role, net: { api: net, room, opp, startAt: r.startAt, seed: r.seed || 1, oppInfo } });
  }
}
