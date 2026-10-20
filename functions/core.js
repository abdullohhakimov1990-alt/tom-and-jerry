// To'lov tizimlari mantig'i (Payme Merchant API va Click SHOP API).
// Ma'lumotlar bazasi bilan "repo" orqali ishlaydi — shuning uchun sinovda xotiradagi repo ishlatiladi.
import { createHash } from 'node:crypto';
import { PACKS } from './packs.js';

// ================================================================
//  PAYME (JSON-RPC 2.0, https://developer.help.paycom.uz)
// ================================================================
const TIMEOUT = 12 * 3600 * 1000; // yaratilgan, lekin to'lanmagan tranzaksiya 12 soatda bekor bo'ladi
const msg = (uz, ru, en) => ({ uz, ru, en });
const M = {
  auth: msg("Ruxsat yo'q", 'Недостаточно привилегий', 'Insufficient privilege'),
  parse: msg("So'rov noto'g'ri", 'Ошибка разбора JSON', 'Parse error'),
  method: msg('Metod topilmadi', 'Метод не найден', 'Method not found'),
  post: msg('Faqat POST', 'Метод запроса должен быть POST', 'Only POST'),
  amount: msg("Summa noto'g'ri", 'Неверная сумма', 'Incorrect amount'),
  order: msg('Buyurtma topilmadi', 'Заказ не найден', 'Order not found'),
  closed: msg('Buyurtma yopilgan', 'Заказ уже оплачен или отменён', 'Order already paid or cancelled'),
  busy: msg("Buyurtma to'lanmoqda", 'Заказ ожидает оплаты', 'Order is awaiting payment'),
  noTx: msg('Tranzaksiya topilmadi', 'Транзакция не найдена', 'Transaction not found'),
  cant: msg("Amalni bajarib bo'lmaydi", 'Невозможно выполнить операцию', 'Unable to perform operation'),
  noCancel: msg("Buyurtma bajarilgan, bekor qilib bo'lmaydi", 'Заказ выполнен, отмена невозможна', 'Order completed, cannot cancel'),
  sys: msg('Tizim xatosi', 'Системная ошибка', 'System error'),
};
class RpcError extends Error { constructor(code, message, data) { super(message.en); this.code = code; this.msg = message; this.data = data; } }
const fail = (code, m, data) => { throw new RpcError(code, m, data); };

export function paymeHandler(repo, { key, now = () => Date.now() }) {
  const authOk = header => {
    const m = /^Basic\s+(.+)$/i.exec(header || '');
    if (!m || !key) return false;
    const s = Buffer.from(m[1], 'base64').toString('utf8'), i = s.indexOf(':');
    return i >= 0 && s.slice(0, i) === 'Paycom' && s.slice(i + 1) === key;
  };
  // buyurtma va summani tekshirish
  const checkOrder = async p => {
    const oid = p.account && p.account.order_id;
    const order = oid ? await repo.getOrder(String(oid)) : null;
    const pk = order && PACKS[order.pack];
    if (!pk) fail(-31050, M.order, 'order_id');
    if (order.status === 'paid' || order.status === 'cancelled') fail(-31051, M.closed, 'order_id');
    if (Number(p.amount) !== pk.uzs * 100) fail(-31001, M.amount);
    return order;
  };
  const expire = async tx => {
    const patch = { state: -1, reason: 4, cancel_time: now() };
    await repo.updateTx('payme', tx.id, patch); await repo.updateOrder(tx.order_id, { status: 'cancelled' });
    return Object.assign(tx, patch);
  };
  const methods = {
    async CheckPerformTransaction(p) { await checkOrder(p); return { allow: true }; },
    async CreateTransaction(p) {
      const tx = await repo.getTx('payme', String(p.id));
      if (tx) {
        if (tx.state !== 1) fail(-31008, M.cant);
        if (now() - tx.create_time > TIMEOUT) { await expire(tx); fail(-31008, M.cant); }
        return { create_time: tx.create_time, transaction: tx.transaction, state: tx.state };
      }
      const order = await checkOrder(p);
      if (await repo.findActiveTx('payme', order.id)) fail(-31052, M.busy, 'order_id');
      const t = { id: String(p.id), time: Number(p.time), amount: Number(p.amount), account: p.account, order_id: order.id,
        create_time: now(), perform_time: 0, cancel_time: 0, state: 1, reason: null, transaction: repo.newId() };
      await repo.createTx('payme', t.id, t);
      await repo.updateOrder(order.id, { status: 'pending', provider: 'payme' });
      return { create_time: t.create_time, transaction: t.transaction, state: 1 };
    },
    async PerformTransaction(p) {
      const tx = await repo.getTx('payme', String(p.id));
      if (!tx) fail(-31003, M.noTx);
      if (tx.state === 1) {
        if (now() - tx.create_time > TIMEOUT) { await expire(tx); fail(-31008, M.cant); }
        const perform_time = now();
        await repo.fulfil(tx.order_id, 'payme', tx.id, { state: 2, perform_time });
        return { transaction: tx.transaction, perform_time, state: 2 };
      }
      if (tx.state === 2) return { transaction: tx.transaction, perform_time: tx.perform_time, state: 2 };
      fail(-31008, M.cant);
    },
    async CancelTransaction(p) {
      const tx = await repo.getTx('payme', String(p.id));
      if (!tx) fail(-31003, M.noTx);
      if (tx.state === 1) {
        const patch = { state: -1, reason: Number(p.reason) || null, cancel_time: now() };
        await repo.updateTx('payme', tx.id, patch); await repo.updateOrder(tx.order_id, { status: 'cancelled' });
        return { transaction: tx.transaction, cancel_time: patch.cancel_time, state: -1 };
      }
      if (tx.state === 2) fail(-31007, M.noCancel); // olmos/oltin allaqachon berilgan
      return { transaction: tx.transaction, cancel_time: tx.cancel_time, state: tx.state };
    },
    async CheckTransaction(p) {
      const tx = await repo.getTx('payme', String(p.id));
      if (!tx) fail(-31003, M.noTx);
      return { create_time: tx.create_time, perform_time: tx.perform_time, cancel_time: tx.cancel_time, transaction: tx.transaction, state: tx.state, reason: tx.reason };
    },
    async GetStatement(p) {
      const list = await repo.txBetween('payme', Number(p.from), Number(p.to));
      return { transactions: list.map(t => ({ id: t.id, time: t.time, amount: t.amount, account: t.account, create_time: t.create_time,
        perform_time: t.perform_time, cancel_time: t.cancel_time, transaction: t.transaction, state: t.state, reason: t.reason, receivers: null })) };
    },
  };
  return async function handle(authHeader, body) {
    let req = body, id = null;
    try {
      if (typeof req === 'string' || Buffer.isBuffer(req)) req = JSON.parse(String(req));
      if (!req || typeof req !== 'object') fail(-32700, M.parse);
      id = req.id ?? null;
      if (!authOk(authHeader)) fail(-32504, M.auth);
      const fn = methods[req.method];
      if (!fn) fail(-32601, M.method, req.method);
      return { jsonrpc: '2.0', id, result: await fn(req.params || {}) };
    } catch (e) {
      if (e instanceof SyntaxError) e = new RpcError(-32700, M.parse);
      if (!(e instanceof RpcError)) { console.error('payme', e); e = new RpcError(-32400, M.sys); }
      return { jsonrpc: '2.0', id, error: { code: e.code, message: e.msg, data: e.data } };
    }
  };
}

// ================================================================
//  CLICK (SHOP API: Prepare / Complete, https://docs.click.uz)
// ================================================================
const md5 = s => createHash('md5').update(s).digest('hex');

export function clickHandler(repo, { secret, serviceId }) {
  const out = (f, error, error_note, extra = {}) => Object.assign({ click_trans_id: f.click_trans_id, merchant_trans_id: f.merchant_trans_id }, extra, { error, error_note });
  return async function handle(f) {
    f = f || {};
    try {
      const need = ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time', 'sign_string'];
      if (need.some(k => f[k] === undefined || f[k] === '')) return out(f, -8, 'Error in request from click');
      const action = String(f.action);
      if (action !== '0' && action !== '1') return out(f, -3, 'Action not found');
      const base = '' + f.click_trans_id + f.service_id + secret + f.merchant_trans_id + (action === '1' ? (f.merchant_prepare_id ?? '') : '') + f.amount + f.action + f.sign_time;
      if (!secret || md5(base) !== String(f.sign_string).toLowerCase()) return out(f, -1, 'SIGN CHECK FAILED!');
      if (serviceId && String(f.service_id) !== String(serviceId)) return out(f, -1, 'SIGN CHECK FAILED!');

      const order = await repo.getOrder(String(f.merchant_trans_id));
      const pk = order && PACKS[order.pack];
      if (!pk) return out(f, -5, 'User does not exist');
      if (Math.abs(parseFloat(f.amount) - pk.uzs) > 0.009) return out(f, -2, 'Incorrect parameter amount');
      const cid = String(f.click_trans_id);
      let tx = await repo.getTx('click', cid);

      if (action === '0') { // Prepare
        if (order.status === 'paid') return out(f, -4, 'Already paid');
        if (order.status === 'cancelled') return out(f, -9, 'Transaction cancelled');
        if (!tx) {
          tx = { id: cid, order_id: order.id, amount: pk.uzs, prepare_id: repo.newIntId(), state: 'prepared', time: Date.now() };
          await repo.createTx('click', cid, tx);
          await repo.updateOrder(order.id, { status: 'pending', provider: 'click' });
        }
        return out(f, 0, 'Success', { merchant_prepare_id: tx.prepare_id });
      }

      // Complete
      if (!tx || String(tx.prepare_id) !== String(f.merchant_prepare_id) || tx.order_id !== order.id) return out(f, -6, 'Transaction does not exist');
      if (tx.state === 'paid') return out(f, -4, 'Already paid', { merchant_confirm_id: tx.prepare_id });
      if (tx.state === 'cancelled') return out(f, -9, 'Transaction cancelled');
      if (Number(f.error) < 0) { // Click to'lov o'tmaganini bildirdi
        await repo.updateTx('click', cid, { state: 'cancelled' }); await repo.updateOrder(order.id, { status: 'cancelled' });
        return out(f, -9, 'Transaction cancelled');
      }
      if (order.status === 'paid') return out(f, -4, 'Already paid');
      await repo.fulfil(order.id, 'click', cid, { state: 'paid', perform_time: Date.now() });
      return out(f, 0, 'Success', { merchant_confirm_id: tx.prepare_id });
    } catch (e) {
      console.error('click', e);
      return out(f, -7, 'Failed to update user');
    }
  };
}
