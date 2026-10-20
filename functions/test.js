// To'lov mantig'i sinovi (xotiradagi baza bilan): node test.js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { paymeHandler, clickHandler } from './core.js';

function memRepo() {
  const orders = {}, tx = { payme: {}, click: {} }, gifts = [];
  let n = 0;
  return {
    orders, tx, gifts,
    newId: () => 'T' + (++n), newIntId: () => 1000 + (++n),
    getOrder: async id => orders[id] ? Object.assign({ id }, orders[id]) : null,
    updateOrder: async (id, p) => Object.assign(orders[id], p),
    getTx: async (k, id) => tx[k][id] ? Object.assign({}, tx[k][id]) : null,
    createTx: async (k, id, d) => { assert(!tx[k][id]); tx[k][id] = Object.assign({}, d); },
    updateTx: async (k, id, p) => Object.assign(tx[k][id], p),
    findActiveTx: async (k, oid) => Object.values(tx[k]).find(t => t.order_id === oid && t.state === 1) || null,
    txBetween: async (k, a, b) => Object.values(tx[k]).filter(t => t.time >= a && t.time <= b),
    fulfil: async (oid, k, id, p) => {
      Object.assign(tx[k][id], p);
      if (orders[oid].status === 'paid') return;
      orders[oid].status = 'paid'; gifts.push({ from: 'shop', to: orders[oid].uid, pack: orders[oid].pack });
    },
  };
}

// ---------------- Payme ----------------
{
  const r = memRepo(); let t = 1_000_000;
  r.orders.o1 = { uid: 'u1', pack: 'd30', status: 'new' };
  r.orders.o2 = { uid: 'u2', pack: 'g200', status: 'new' };
  const h = paymeHandler(r, { key: 'KEY', now: () => t });
  const auth = 'Basic ' + Buffer.from('Paycom:KEY').toString('base64');
  const call = (method, params, a = auth) => h(a, JSON.stringify({ jsonrpc: '2.0', id: 7, method, params }));

  assert.equal((await call('CheckPerformTransaction', { amount: 1290000, account: { order_id: 'o1' } }, 'Basic eDp5')).error.code, -32504);
  assert.equal((await h(auth, '{bad json')).error.code, -32700);
  assert.equal((await call('Nope', {})).error.code, -32601);
  assert.equal((await call('CheckPerformTransaction', { amount: 100, account: { order_id: 'o1' } })).error.code, -31001);
  assert.equal((await call('CheckPerformTransaction', { amount: 1290000, account: { order_id: 'zzz' } })).error.code, -31050);
  assert.deepEqual((await call('CheckPerformTransaction', { amount: 1290000, account: { order_id: 'o1' } })).result, { allow: true });

  const c1 = await call('CreateTransaction', { id: 'p1', time: t, amount: 1290000, account: { order_id: 'o1' } });
  assert.equal(c1.result.state, 1);
  assert.deepEqual((await call('CreateTransaction', { id: 'p1', time: t, amount: 1290000, account: { order_id: 'o1' } })).result, c1.result); // takror
  assert.equal((await call('CreateTransaction', { id: 'p2', time: t, amount: 1290000, account: { order_id: 'o1' } })).error.code, -31052); // band
  t += 1000;
  const p1 = await call('PerformTransaction', { id: 'p1' });
  assert.equal(p1.result.state, 2); assert.equal(r.gifts.length, 1); assert.equal(r.orders.o1.status, 'paid');
  assert.deepEqual((await call('PerformTransaction', { id: 'p1' })).result, p1.result); // takror — ikkinchi marta tushmaydi
  assert.equal(r.gifts.length, 1);
  assert.equal((await call('CancelTransaction', { id: 'p1', reason: 5 })).error.code, -31007);
  assert.equal((await call('CheckTransaction', { id: 'p1' })).result.state, 2);
  assert.equal((await call('CheckPerformTransaction', { amount: 1290000, account: { order_id: 'o1' } })).error.code, -31051); // to'langan
  assert.equal((await call('PerformTransaction', { id: 'none' })).error.code, -31003);

  // bekor qilish
  await call('CreateTransaction', { id: 'p3', time: t, amount: 390000, account: { order_id: 'o2' } });
  const cn = await call('CancelTransaction', { id: 'p3', reason: 3 });
  assert.equal(cn.result.state, -1); assert.equal(r.orders.o2.status, 'cancelled');
  assert.equal((await call('PerformTransaction', { id: 'p3' })).error.code, -31008);
  assert.deepEqual((await call('CancelTransaction', { id: 'p3', reason: 3 })).result, cn.result);

  // 12 soatlik muddat
  r.orders.o3 = { uid: 'u3', pack: 'd90', status: 'new' };
  await call('CreateTransaction', { id: 'p4', time: t, amount: 3800000, account: { order_id: 'o3' } });
  t += 13 * 3600 * 1000;
  assert.equal((await call('PerformTransaction', { id: 'p4' })).error.code, -31008);
  assert.equal((await call('CheckTransaction', { id: 'p4' })).result.reason, 4);

  const st = await call('GetStatement', { from: 0, to: t });
  assert.equal(st.result.transactions.length, 3);
  assert.equal(r.gifts.length, 1);
  console.log('Payme: OK');
}

// ---------------- Click ----------------
{
  const r = memRepo(), SECRET = 'S3CRET';
  r.orders.o1 = { uid: 'u1', pack: 'g200', status: 'new' };
  const h = clickHandler(r, { secret: SECRET, serviceId: '111' });
  const md5 = s => createHash('md5').update(s).digest('hex');
  const req = (action, extra = {}) => {
    const f = Object.assign({ click_trans_id: '555', service_id: '111', click_paydoc_id: '9', merchant_trans_id: 'o1', amount: '3900.00', action: String(action), error: '0', error_note: 'Success', sign_time: '2026-10-20 12:00:00' }, extra);
    f.sign_string = md5(f.click_trans_id + f.service_id + SECRET + f.merchant_trans_id + (action === 1 ? f.merchant_prepare_id : '') + f.amount + f.action + f.sign_time);
    return f;
  };
  assert.equal((await h(Object.assign(req(0), { sign_string: 'x' }))).error, -1);
  assert.equal((await h(req(0, { amount: '100.00' }))).error, -2);
  assert.equal((await h(req(0, { merchant_trans_id: 'none' }))).error, -5);
  assert.equal((await h(req(5))).error, -3);
  const pr = await h(req(0));
  assert.equal(pr.error, 0); assert.ok(pr.merchant_prepare_id);
  assert.equal((await h(req(0))).merchant_prepare_id, pr.merchant_prepare_id); // takror
  assert.equal((await h(req(1, { merchant_prepare_id: '1' }))).error, -6);
  const cm = await h(req(1, { merchant_prepare_id: String(pr.merchant_prepare_id) }));
  assert.equal(cm.error, 0); assert.equal(r.gifts.length, 1); assert.equal(r.orders.o1.status, 'paid');
  assert.equal((await h(req(1, { merchant_prepare_id: String(pr.merchant_prepare_id) }))).error, -4); // ikki marta tushmaydi
  assert.equal(r.gifts.length, 1);

  // Click xato bilan yakunlasa — bekor
  r.orders.o2 = { uid: 'u2', pack: 'g200', status: 'new' };
  const p2 = await h(req(0, { click_trans_id: '556', merchant_trans_id: 'o2' }));
  const c2 = await h(req(1, { click_trans_id: '556', merchant_trans_id: 'o2', merchant_prepare_id: String(p2.merchant_prepare_id), error: '-5017' }));
  assert.equal(c2.error, -9); assert.equal(r.orders.o2.status, 'cancelled'); assert.equal(r.gifts.length, 1);
  console.log('Click: OK');
}
