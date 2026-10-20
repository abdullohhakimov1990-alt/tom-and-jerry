// Tom and Jerry: Katta Uy — to'lov serveri (Firebase Cloud Functions).
// Payme va Click to'lov tasdiqlansa, o'yinchiga olmos/oltin "sovg'a" bo'lib tushadi (o'yin uni darhol oladi).
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { paymeHandler, clickHandler } from './core.js';
import { PACKS } from './packs.js';

initializeApp();
const db = getFirestore();
const PAYME_KEY = defineSecret('PAYME_KEY');       // Payme kabinetidagi kalit (test yoki asosiy)
const CLICK_SECRET = defineSecret('CLICK_SECRET'); // Click kabinetidagi SECRET_KEY
const CLICK_SERVICE_ID = defineString('CLICK_SERVICE_ID', { default: '' });

const COL = { payme: 'payme_tx', click: 'click_tx' };
let seq = 0;
const repo = {
  newId: () => db.collection('_').doc().id,
  newIntId: () => Date.now() * 100 + (seq++ % 100),
  async getOrder(id) { const s = await db.collection('orders').doc(id).get(); return s.exists ? Object.assign({ id: s.id }, s.data()) : null; },
  updateOrder: (id, patch) => db.collection('orders').doc(id).update(Object.assign({ updated: FieldValue.serverTimestamp() }, patch)),
  async getTx(kind, id) { const s = await db.collection(COL[kind]).doc(id).get(); return s.exists ? s.data() : null; },
  createTx: (kind, id, data) => db.collection(COL[kind]).doc(id).create(data),
  updateTx: (kind, id, patch) => db.collection(COL[kind]).doc(id).update(patch),
  async findActiveTx(kind, orderId) {
    const q = await db.collection(COL[kind]).where('order_id', '==', orderId).where('state', '==', 1).limit(1).get();
    return q.empty ? null : q.docs[0].data();
  },
  async txBetween(kind, from, to) {
    const q = await db.collection(COL[kind]).where('time', '>=', from).where('time', '<=', to).orderBy('time').get();
    return q.docs.map(d => d.data());
  },
  // to'lov tasdiqlandi: buyurtma "paid", o'yinchiga sovg'a — hammasi bitta tranzaksiyada (ikki marta tushmaydi)
  fulfil: (orderId, kind, txId, txPatch) => db.runTransaction(async t => {
    const oref = db.collection('orders').doc(orderId), o = await t.get(oref);
    t.update(db.collection(COL[kind]).doc(txId), txPatch);
    if (!o.exists || o.data().status === 'paid') return;
    const order = o.data(), pk = PACKS[order.pack];
    t.update(oref, { status: 'paid', provider: kind, paid: FieldValue.serverTimestamp() });
    t.create(db.collection('gifts').doc('shop_' + orderId), { from: 'shop', to: order.uid, cur: pk.cur, n: pk.n, order: orderId, created: FieldValue.serverTimestamp() });
  }),
};

const opts = { region: 'europe-west1', cors: false, maxInstances: 10 };

export const payme = onRequest(Object.assign({ secrets: [PAYME_KEY] }, opts), async (req, res) => {
  if (req.method !== 'POST') { res.json({ jsonrpc: '2.0', id: null, error: { code: -32300, message: { uz: 'Faqat POST', ru: 'Метод запроса должен быть POST', en: 'Only POST' } } }); return; }
  const handle = paymeHandler(repo, { key: PAYME_KEY.value() });
  res.json(await handle(req.headers.authorization, req.rawBody ? req.rawBody.toString('utf8') : req.body));
});

export const click = onRequest(Object.assign({ secrets: [CLICK_SECRET] }, opts), async (req, res) => {
  const handle = clickHandler(repo, { secret: CLICK_SECRET.value(), serviceId: CLICK_SERVICE_ID.value() });
  res.json(await handle(Object.assign({}, req.query, req.body)));
});
