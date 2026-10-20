// Onlayn o'yin uchun tarmoq: xonalar, taklifnomalar, o'yinchilar holati (12 marta/s) va hodisalar.
// Firebase Realtime Database (haqiqiy) yoki BroadcastChannel (bitta brauzerda sinov uchun).

const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ======================= Firebase RTDB =======================
export async function firebaseNet(app, cfg, uid) {
  const V = '10.12.2';
  const D = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
  const db = D.getDatabase(app, cfg.databaseURL);
  let offset = 0;
  D.onValue(D.ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });
  const R = p => D.ref(db, p);
  const N = {
    kind: 'firebase',
    now: () => Date.now() + offset,
    async createRoom(guest, extra) { const id = rid(); await D.set(R('rooms/' + id), Object.assign({ host: uid, guest, status: 'wait', created: D.serverTimestamp(), seed: Math.floor(Math.random() * 1e6) }, extra)); return id; },
    watchRoom(id, cb) { return D.onValue(R('rooms/' + id), s => cb(s.val()), () => cb(null)); },
    updateRoom(id, patch) { return D.update(R('rooms/' + id), patch); },
    removeRoom(id) { return D.remove(R('rooms/' + id)).catch(() => { }); },
    sendInvite(to, data) { return D.set(R(`invites/${to}/${uid}`), Object.assign({ t: D.serverTimestamp() }, data)); },
    cancelInvite(to) { return D.remove(R(`invites/${to}/${uid}`)).catch(() => { }); },
    clearInvite(from) { return D.remove(R(`invites/${uid}/${from}`)).catch(() => { }); },
    watchInvites(cb) { return D.onValue(R('invites/' + uid), s => { const v = s.val() || {}; cb(Object.entries(v).map(([from, x]) => Object.assign({ from }, x))); }); },
    sendState(id, st) { D.set(R(`rooms/${id}/p/${uid}`), st).catch(() => { }); },
    watchState(id, other, cb) { return D.onValue(R(`rooms/${id}/p/${other}`), s => cb(s.val())); },
    sendEvent(id, ev) { D.push(R(`rooms/${id}/ev`), Object.assign({ by: uid, t: Date.now() + offset }, ev)).catch(() => { }); },
    watchEvents(id, cb) { return D.onChildAdded(R(`rooms/${id}/ev`), s => { const v = s.val(); if (v && v.by !== uid) cb(v); }); },
    armDisconnect(id) { D.onDisconnect(R(`rooms/${id}/p/${uid}`)).remove(); D.onDisconnect(R(`rooms/${id}/left/${uid}`)).set(true); },
    async leave(id) { try { await D.onDisconnect(R(`rooms/${id}/p/${uid}`)).cancel(); await D.onDisconnect(R(`rooms/${id}/left/${uid}`)).cancel(); await D.set(R(`rooms/${id}/left/${uid}`), true); await D.remove(R(`rooms/${id}/p/${uid}`)); } catch (e) { } },
  };
  return N;
}

// ======================= Bitta brauzer ichida (sinov) =======================
export function localNet(uid) {
  const KEY = 'tj_net_v1';
  const ch = new BroadcastChannel('tj_net');
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { rooms: {}, invites: {} }; } catch (e) { return { rooms: {}, invites: {} }; } };
  const write = d => { localStorage.setItem(KEY, JSON.stringify(d)); ch.postMessage({ k: 'db' }); fire(); };
  const subs = new Set(); const fire = () => subs.forEach(f => f());
  const msg = new Set();
  ch.onmessage = e => { if (e.data.k === 'db') fire(); else msg.forEach(f => f(e.data)); };
  const watch = f => { subs.add(f); f(); return () => subs.delete(f); };
  const N = {
    kind: 'local',
    now: () => Date.now(),
    async createRoom(guest, extra) { const d = read(), id = rid(); d.rooms[id] = Object.assign({ host: uid, guest, status: 'wait', created: Date.now(), seed: Math.floor(Math.random() * 1e6) }, extra); write(d); return id; },
    watchRoom(id, cb) { return watch(() => cb(read().rooms[id] || null)); },
    async updateRoom(id, patch) { const d = read(); if (!d.rooms[id]) return; for (const [k, v] of Object.entries(patch)) { const parts = k.split('/'); let o = d.rooms[id]; while (parts.length > 1) { const p = parts.shift(); o = o[p] ||= {}; } o[parts[0]] = v; } write(d); },
    async removeRoom(id) { const d = read(); delete d.rooms[id]; write(d); },
    async sendInvite(to, data) { const d = read(); (d.invites[to] ||= {})[uid] = Object.assign({ t: Date.now() }, data); write(d); },
    async cancelInvite(to) { const d = read(); if (d.invites[to]) delete d.invites[to][uid]; write(d); },
    async clearInvite(from) { const d = read(); if (d.invites[uid]) delete d.invites[uid][from]; write(d); },
    watchInvites(cb) { return watch(() => { const v = read().invites[uid] || {}; cb(Object.entries(v).map(([from, x]) => Object.assign({ from }, x))); }); },
    sendState(id, st) { ch.postMessage({ k: 'st', id, uid, st }); },
    watchState(id, other, cb) { const f = m => { if (m.k === 'st' && m.id === id && m.uid === other) cb(m.st); if (m.k === 'gone' && m.id === id && m.uid === other) cb(null); }; msg.add(f); return () => msg.delete(f); },
    sendEvent(id, ev) { ch.postMessage({ k: 'ev', id, ev: Object.assign({ by: uid, t: Date.now() }, ev) }); },
    watchEvents(id, cb) { const f = m => { if (m.k === 'ev' && m.id === id && m.ev.by !== uid) cb(m.ev); }; msg.add(f); return () => msg.delete(f); },
    armDisconnect(id) { N._unload = () => { ch.postMessage({ k: 'gone', id, uid }); }; window.addEventListener('beforeunload', N._unload); },
    async leave(id) { if (N._unload) window.removeEventListener('beforeunload', N._unload); ch.postMessage({ k: 'gone', id, uid }); await N.updateRoom(id, { ['left/' + uid]: true }); },
  };
  return N;
}
