// Akkaunt, profil, saqlash va do'stlar tizimi.
// Firebase sozlangan bo'lsa — Google orqali kirish + Firestore; aks holda — brauzer ichidagi offline rejim.
import { FIREBASE_CONFIG } from './config.js';
import { NICK_MIN, NICK_MAX, SUPER_ADMINS, DONATE } from './catalog.js';
import { firebaseNet, localNet } from './net.js';

export const ONLINE_MS = 2.5 * 60 * 1000;
export function checkNick(n) {
  n = (n || '').trim();
  if (n.length < NICK_MIN) return `Nik kamida ${NICK_MIN} ta harfdan iborat bo'lsin`;
  if (n.length > NICK_MAX) return `Nik ${NICK_MAX} ta harfdan oshmasin`;
  if (!/^[\p{L}\p{N}_.\- ']+$/u.test(n)) return "Faqat harf, raqam, _ . - belgilari mumkin";
  return null;
}
// Firebase xatolarini tushunarli qilish
export function fbErr(e) {
  const c = (e && (e.code || '')) + ' ' + (e && e.message || '');
  if (/popup-closed-by-user|cancelled-popup-request/.test(c)) return 'Kirish oynasi yopildi. Qaytadan bosing.';
  if (/popup-blocked/.test(c)) return "Brauzer kirish oynasini to'sib qo'ydi. Manzil satridagi belgidan popup'larga ruxsat bering.";
  if (/unauthorized-domain/.test(c)) return "Bu manzil Firebase'da ruxsat etilmagan: Authentication → Settings → Authorized domains ga " + location.hostname + " ni qo'shing.";
  if (/operation-not-allowed|configuration-not-found/.test(c)) return "Firebase'da Google kirish yoqilmagan: Authentication → Sign-in method → Google → Enable.";
  if (/invalid-api-key|api-key-not-valid/.test(c)) return "js/config.js dagi apiKey noto'g'ri.";
  if (/network-request-failed|unavailable|offline/.test(c)) return "Internet bilan aloqa yo'q. Qaytadan urinib ko'ring.";
  if (/does not exist|NOT_FOUND|not-found.*database/i.test(c)) return 'Firestore Database yaratilmagan: Firebase Console → Firestore Database → Create database.';
  if (/permission-denied|insufficient permissions/i.test(c)) return "Firestore qoidalari o'rnatilmagan: firestore.rules matnini Firestore → Rules ga qo'yib Publish bosing.";
  return (e && e.message) || String(e);
}
const randPid = () => String(10000000 + Math.floor(Math.random() * 89999999));

export async function createBackend() {
  // ?offline — sinov uchun brauzer ichidagi rejim
  if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && !new URLSearchParams(location.search).has('offline')) {
    try { return await firebaseBackend(FIREBASE_CONFIG); }
    catch (e) { console.error('Firebase ishga tushmadi', e); const b = localBackend(); b.error = 'Firebase ulanmadi: ' + e.message; return b; }
  }
  return localBackend();
}

// ======================= OFFLINE (localStorage) =======================
function localBackend() {
  const SLOT = new URLSearchParams(location.search).get('slot') || '';
  const KEY = 'tj_db_v1', SES = 'tj_session_v1' + SLOT;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const db = () => { const d = read(); for (const k of ['users', 'profiles', 'pids', 'requests', 'friends', 'gifts', 'admins']) d[k] ||= {}; return d; };
  const write = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { } emit(); };
  const subs = new Set(); const emit = () => subs.forEach(f => f());
  window.addEventListener('storage', e => { if (e.key === KEY) emit(); });
  let me = null; const authCbs = [];
  const setMe = u => { me = u; authCbs.forEach(f => f(u)); };
  const B = {
    mode: 'local',
    onAuth(cb) { authCbs.push(cb); setTimeout(() => { const uid = localStorage.getItem(SES); me = uid ? { uid, name: 'Mehmon' } : null; cb(me); }, 0); },
    async signInGoogle() { throw new Error("Google orqali kirish uchun Firebase sozlanishi kerak (O'QING.md). Hozircha mehmon sifatida kiring."); },
    async signInGuest(fresh) {
      let uid = !fresh && localStorage.getItem('tj_lastuid' + SLOT);
      if (!uid) uid = 'L' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SES, uid); localStorage.setItem('tj_lastuid' + SLOT, uid);
      setMe({ uid, name: 'Mehmon' });
    },
    async signOut() { localStorage.removeItem(SES); setMe(null); },
    async loadAccount() {
      const d = db(), p = d.profiles[me.uid];
      if (!p) return null;
      return { profile: Object.assign({ uid: me.uid }, p), data: d.users[me.uid] || null };
    },
    async register(nick) {
      const err = checkNick(nick); if (err) throw new Error(err);
      const d = db(); let pid; do pid = randPid(); while (d.pids[pid]);
      d.pids[pid] = me.uid;
      d.profiles[me.uid] = { pid, nick: nick.trim(), color: 'white', icon: 'j_classic', lastSeen: Date.now() };
      write(d); return { pid };
    },
    async saveData(data) { const d = db(); d.users[me.uid] = data; write(d); },
    async updateProfile(p) { const d = db(); Object.assign(d.profiles[me.uid], p); write(d); },
    async heartbeat() { const d = db(); if (d.profiles[me.uid]) { d.profiles[me.uid].lastSeen = Date.now(); write(d); } },
    async sendRequest(pid) {
      const d = db(), uid = d.pids[pid.trim()];
      if (!uid) throw new Error('Bunday ID topilmadi');
      if (uid === me.uid) throw new Error("Bu sizning o'z ID'ingiz");
      if ((d.friends[me.uid] || {})[uid]) throw new Error('Bu o\'yinchi allaqachon do\'stingiz');
      if (d.requests[me.uid + '_' + uid]) { await B.accept(uid); return 'accepted'; }
      d.requests[uid + '_' + me.uid] = { from: me.uid, to: uid, created: Date.now() };
      write(d); return 'sent';
    },
    watchRequests(cb) {
      const f = () => { const d = db(); cb(Object.values(d.requests).filter(r => r.to === me.uid).map(r => Object.assign({ uid: r.from }, d.profiles[r.from] || {}))); };
      subs.add(f); f(); return () => subs.delete(f);
    },
    async accept(from) {
      const d = db();
      (d.friends[me.uid] ||= {})[from] = Date.now(); (d.friends[from] ||= {})[me.uid] = Date.now();
      delete d.requests[me.uid + '_' + from]; delete d.requests[from + '_' + me.uid]; write(d);
    },
    async decline(from) { const d = db(); delete d.requests[me.uid + '_' + from]; write(d); },
    watchFriends(cb) {
      const f = () => { const d = db(); cb(Object.keys(d.friends[me.uid] || {}).map(uid => Object.assign({ uid }, d.profiles[uid] || { nick: '???' }))); };
      subs.add(f); f(); return () => subs.delete(f);
    },
    async removeFriend(uid) { const d = db(); if (d.friends[me.uid]) delete d.friends[me.uid][uid]; if (d.friends[uid]) delete d.friends[uid][me.uid]; write(d); },
    async sendGift(to, cur, n) { const d = db(); const id = 'g' + Date.now() + Math.random().toString(36).slice(2, 6); d.gifts[id] = { from: me.uid, to, cur, n, created: Date.now() }; write(d); },
    watchGifts(cb) {
      const f = () => { const d = db(); cb(Object.entries(d.gifts).filter(([, g]) => g.to === me.uid).map(([id, g]) => Object.assign({ id, nick: (d.profiles[g.from] || {}).nick }, g))); };
      subs.add(f); f(); return () => subs.delete(f);
    },
    async claimGift(id) { const d = db(); const g = d.gifts[id]; if (!g || g.to !== me.uid) return null; delete d.gifts[id]; write(d); return g; },
  };
  // rollar (offline sinovda ?superadmin bilan Super Admin bo'lish mumkin)
  B.getRole = async () => new URLSearchParams(location.search).has('superadmin') ? 'super' : (db().admins[me.uid] ? 'admin' : 'player');
  B.uidByPid = async pid => { const uid = db().pids[String(pid).trim()]; if (!uid) throw new Error('Bunday ID topilmadi'); return uid; };
  B.setAdmin = async (pid, on) => { const uid = await B.uidByPid(pid); const d = db(); if (on) d.admins[uid] = { pid, nick: (d.profiles[uid] || {}).nick, by: me.uid, created: Date.now() }; else delete d.admins[uid]; write(d); return uid; };
  B.watchAdmins = cb => { const f = () => { const d = db(); cb(Object.entries(d.admins).map(([uid, a]) => Object.assign({ uid }, a))); }; subs.add(f); f(); return () => subs.delete(f); };
  B.slot = SLOT;
  B.makeNet = async () => localNet(me.uid);
  return B;
}

// ======================= FIREBASE =======================
async function firebaseBackend(cfg) {
  const V = '10.12.2', U = n => `https://www.gstatic.com/firebasejs/${V}/firebase-${n}.js`;
  const [{ initializeApp }, AU, FS] = await Promise.all([import(U('app')), import(U('auth')), import(U('firestore'))]);
  const app = initializeApp(cfg);
  const auth = AU.getAuth(app), db = FS.getFirestore(app);
  const { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, onSnapshot, serverTimestamp, runTransaction, writeBatch } = FS;
  let me = null;
  const ms = t => t && t.toMillis ? t.toMillis() : (t || 0);
  const B = {
    mode: 'firebase',
    onAuth(cb) { AU.onAuthStateChanged(auth, u => { me = u ? { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL } : null; cb(me); }); },
    async signInGoogle() { const p = new AU.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); await AU.signInWithPopup(auth, p); },
    async signInGuest() { throw new Error('Bu o\'yinda faqat Google orqali kiriladi'); },
    async signOut() { await AU.signOut(auth); },
    async loadAccount() {
      const [p, u] = await Promise.all([getDoc(doc(db, 'profiles', me.uid)), getDoc(doc(db, 'users', me.uid))]);
      if (!p.exists()) return null;
      const pr = p.data();
      return { profile: Object.assign({ uid: me.uid }, pr, { lastSeen: ms(pr.lastSeen) }), data: u.exists() ? u.data().data : null };
    },
    async register(nick) {
      const err = checkNick(nick); if (err) throw new Error(err);
      for (let k = 0; k < 6; k++) {
        const pid = randPid();
        try {
          await runTransaction(db, async tx => {
            const ref = doc(db, 'pids', pid);
            if ((await tx.get(ref)).exists()) throw new Error('busy');
            tx.set(ref, { uid: me.uid });
            tx.set(doc(db, 'profiles', me.uid), { pid, nick: nick.trim(), color: 'white', icon: 'j_classic', lastSeen: serverTimestamp() });
          });
          return { pid };
        } catch (e) { if (e.message !== 'busy') throw e; }
      }
      throw new Error('ID yaratib bo\'lmadi, qayta urinib ko\'ring');
    },
    async saveData(data) { await setDoc(doc(db, 'users', me.uid), { data, updated: serverTimestamp() }); },
    async updateProfile(p) { await updateDoc(doc(db, 'profiles', me.uid), p); },
    async heartbeat() { try { await updateDoc(doc(db, 'profiles', me.uid), { lastSeen: serverTimestamp() }); } catch (e) { } },
    async sendRequest(pid) {
      const s = await getDoc(doc(db, 'pids', pid.trim()));
      if (!s.exists()) throw new Error('Bunday ID topilmadi');
      const uid = s.data().uid;
      if (uid === me.uid) throw new Error("Bu sizning o'z ID'ingiz");
      if ((await getDoc(doc(db, 'users', me.uid, 'friends', uid))).exists()) throw new Error("Bu o'yinchi allaqachon do'stingiz");
      const back = await getDoc(doc(db, 'requests', me.uid + '_' + uid));
      if (back.exists()) { await B.accept(uid); return 'accepted'; }
      await setDoc(doc(db, 'requests', uid + '_' + me.uid), { from: me.uid, to: uid, created: serverTimestamp() });
      return 'sent';
    },
    watchRequests(cb) {
      return onSnapshot(query(collection(db, 'requests'), where('to', '==', me.uid)), async snap => {
        const list = await Promise.all(snap.docs.map(async d => { const from = d.data().from; const p = await getDoc(doc(db, 'profiles', from)); return Object.assign({ uid: from }, p.exists() ? p.data() : {}); }));
        cb(list);
      }, e => console.error("So'rovlar:", fbErr(e)));
    },
    async accept(from) {
      const b = writeBatch(db);
      b.set(doc(db, 'users', me.uid, 'friends', from), { since: serverTimestamp() });
      b.set(doc(db, 'users', from, 'friends', me.uid), { since: serverTimestamp() });
      b.delete(doc(db, 'requests', me.uid + '_' + from));
      await b.commit();
    },
    async decline(from) { await deleteDoc(doc(db, 'requests', me.uid + '_' + from)); },
    watchFriends(cb) {
      const prof = new Map(), unsubs = new Map();
      const push = () => cb([...prof.values()]);
      const un = onSnapshot(collection(db, 'users', me.uid, 'friends'), snap => {
        const ids = new Set(snap.docs.map(d => d.id));
        for (const [id, u] of unsubs) if (!ids.has(id)) { u(); unsubs.delete(id); prof.delete(id); }
        for (const id of ids) if (!unsubs.has(id)) unsubs.set(id, onSnapshot(doc(db, 'profiles', id), p => { if (p.exists()) { const d = p.data(); prof.set(id, Object.assign({ uid: id }, d, { lastSeen: ms(d.lastSeen) })); } push(); }));
        push();
      }, e => console.error("Do'stlar:", fbErr(e)));
      return () => { un(); unsubs.forEach(u => u()); };
    },
    async removeFriend(uid) {
      const b = writeBatch(db);
      b.delete(doc(db, 'users', me.uid, 'friends', uid)); b.delete(doc(db, 'users', uid, 'friends', me.uid));
      await b.commit();
    },
  };
  // ---- rollar: Super Admin (pochta bo'yicha) va adminlar (admins kolleksiyasi) ----
  B.getRole = async () => {
    const u = auth.currentUser;
    if (u && u.emailVerified && SUPER_ADMINS.includes(String(u.email || '').toLowerCase())) return 'super';
    try { return (await getDoc(doc(db, 'admins', me.uid))).exists() ? 'admin' : 'player'; } catch (e) { return 'player'; }
  };
  B.uidByPid = async pid => { const s = await getDoc(doc(db, 'pids', String(pid).trim())); if (!s.exists()) throw new Error('Bunday ID topilmadi'); return s.data().uid; };
  B.setAdmin = async (pid, on) => {
    const uid = await B.uidByPid(pid);
    if (on) { const p = await getDoc(doc(db, 'profiles', uid)); await setDoc(doc(db, 'admins', uid), { pid: String(pid), nick: p.exists() ? p.data().nick : '', by: me.uid, created: serverTimestamp() }); }
    else await deleteDoc(doc(db, 'admins', uid));
    return uid;
  };
  B.watchAdmins = cb => onSnapshot(collection(db, 'admins'), snap => cb(snap.docs.map(d => Object.assign({ uid: d.id }, d.data()))), e => console.error('Adminlar:', fbErr(e)));
  // onlayn o'yin (Realtime Database)
  B.makeNet = async () => cfg.databaseURL ? firebaseNet(app, cfg, me.uid) : null;
  // sovg'alar (olmos/oltin ulashish)
  B.sendGift = async (to, cur, n) => { await addDoc(collection(db, 'gifts'), { from: me.uid, to, cur, n, created: serverTimestamp() }); };
  // donat buyurtmasi: server to'lovni shu buyurtma bo'yicha tekshiradi va olmos/oltinni sovg'a qilib yuboradi
  B.createOrder = async (pack, provider) => {
    const pk = DONATE.find(p => p.id === pack); if (!pk) throw new Error("To'plam topilmadi");
    const ref = await addDoc(collection(db, 'orders'), { uid: me.uid, pack, provider: provider || 'octo', amount: pk.uzs * 100, status: 'new', created: serverTimestamp() });
    return { id: ref.id, uzs: pk.uzs };
  };
  B.watchGifts = cb => onSnapshot(query(collection(db, 'gifts'), where('to', '==', me.uid)), async snap => {
    const list = await Promise.all(snap.docs.map(async d => { const g = d.data(); if (g.from === 'shop') return Object.assign({ id: d.id }, g); const p = await getDoc(doc(db, 'profiles', g.from)); return Object.assign({ id: d.id, nick: p.exists() ? p.data().nick : '???' }, g); }));
    cb(list);
  }, e => console.error("Sovg'alar:", fbErr(e)));
  B.claimGift = async id => runTransaction(db, async tx => {
    const ref = doc(db, 'gifts', id), s2 = await tx.get(ref);
    if (!s2.exists() || s2.data().to !== me.uid) return null;
    tx.delete(ref); return s2.data();
  });
  // har bir amal xatosini o'zbekcha tushuntirish bilan qaytarish
  for (const k of Object.keys(B)) {
    if (typeof B[k] !== 'function' || ['onAuth', 'watchRequests', 'watchFriends', 'watchGifts', 'watchAdmins', 'makeNet'].includes(k)) continue;
    const f = B[k];
    B[k] = async (...a) => { try { return await f(...a); } catch (e) { console.error('Firebase:', k, e); throw new Error(fbErr(e)); } };
  }
  return B;
}
