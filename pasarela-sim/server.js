// Pasarela de Pagos Simulada (PPS) - ITPROFIS - Prueba técnica Developer Senior Full Stack
// Node.js 18+ sin dependencias externas. Uso: node server.js  (lee config.json)
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const PORT = Number(process.env.SIM_PORT || cfg.port || 4000);
const API_KEY = process.env.SIM_API_KEY || cfg.apiKey;
const WEBHOOK_SECRET = process.env.SIM_WEBHOOK_SECRET || cfg.webhookSecret;
const PROCESSING_MS = Number(cfg.processingDelayMs || 1500);
const TIMEOUT_MS = Number(cfg.timeoutDelayMs || 15000);

const charges = new Map();      // id -> charge
const idem = new Map();         // scope:key -> { hash, status, body }
const events = [];              // bitácora de webhooks enviados

const rid = (p) => p + '_' + crypto.randomBytes(8).toString('hex');
const now = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${now()}]`, ...a);

function send(res, status, body) {
  const s = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) });
  res.end(s);
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d));
  });
}
function publicCharge(c) {
  const { card, idempotencyKey, ...rest } = c;
  return rest;
}
function sign(ts, raw, secret) {
  return 'v1=' + crypto.createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
}
async function postWebhook(url, payload, { badSignature = false } = {}) {
  const raw = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const signature = badSignature ? sign(ts, raw, 'firma-invalida-' + crypto.randomBytes(4).toString('hex')) : sign(ts, raw, WEBHOOK_SECRET);
  const delays = [0, 2000, 4000, 8000];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    let status = 0;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Sim-Timestamp': ts, 'X-Sim-Signature': signature },
        body: raw,
      });
      status = r.status;
    } catch (e) {
      status = 0;
    }
    events.push({ at: now(), url, eventId: payload.id, type: payload.type, attempt: i + 1, badSignature, responseStatus: status });
    log(`webhook ${payload.type} ${payload.id} -> ${url} intento ${i + 1} firma=${badSignature ? 'INVALIDA' : 'valida'} respuesta=${status}`);
    if (status >= 200 && status < 300) return;
    if (badSignature) return; // la firma inválida no se reintenta
  }
}
function chargeEvent(type, c) {
  return {
    id: rid('evt'),
    type,
    createdAt: now(),
    data: { chargeId: c.id, reference: c.reference, amount: c.amount, currency: c.currency, status: c.status, declineCode: c.declineCode || null },
  };
}

function validateCharge(b) {
  const errors = [];
  if (!Number.isInteger(b.amount) || b.amount <= 0) errors.push('amount debe ser un entero positivo en centavos');
  if (b.currency !== 'GTQ') errors.push('currency debe ser GTQ');
  if (typeof b.reference !== 'string' || !b.reference.trim()) errors.push('reference es obligatorio');
  if (typeof b.callbackUrl !== 'string' || !/^https?:\/\//.test(b.callbackUrl)) errors.push('callbackUrl debe ser una URL http(s)');
  const card = b.card || {};
  if (!/^\d{16}$/.test(String(card.number || '').replace(/\s/g, ''))) errors.push('card.number debe tener 16 dígitos');
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(card.exp || ''))) errors.push('card.exp debe tener formato MM/AA');
  if (!/^\d{3}$/.test(String(card.cvv || ''))) errors.push('card.cvv debe tener 3 dígitos');
  return errors;
}

async function handleIdempotent(req, res, scope, raw, handler) {
  const key = req.headers['idempotency-key'];
  if (!key) return send(res, 400, { error: 'IDEMPOTENCY_KEY_REQUIRED', message: 'El header Idempotency-Key es obligatorio' });
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const k = `${scope}:${key}`;
  const prev = idem.get(k);
  if (prev) {
    if (prev.hash !== hash) return send(res, 409, { error: 'IDEMPOTENCY_KEY_REUSED', message: 'La misma Idempotency-Key se usó con un cuerpo distinto' });
    if (prev.pending) return send(res, 409, { error: 'REQUEST_IN_PROGRESS', message: 'Hay una solicitud con esta Idempotency-Key en proceso' });
    log(`replay idempotente ${k}`);
    return send(res, prev.status, prev.body);
  }
  idem.set(k, { hash, pending: true });
  const { status, body } = await handler(key);
  idem.set(k, { hash, status, body });
  return send(res, status, body);
}

async function createCharge(req, res, raw) {
  let b;
  try { b = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'INVALID_JSON' }); }
  const errors = validateCharge(b);
  if (errors.length) return send(res, 400, { error: 'VALIDATION_ERROR', details: errors });
  return handleIdempotent(req, res, 'charge', raw, async (key) => {
    const number = String(b.card.number).replace(/\s/g, '');
    const behavior = cfg.cards[number] || 'UNKNOWN';
    const c = {
      id: rid('ch'), reference: b.reference, amount: b.amount, currency: 'GTQ', status: 'PROCESSING',
      card: { brand: number[0] === '5' ? 'MASTERCARD' : 'VISA', last4: number.slice(-4) },
      cardLast4: number.slice(-4), declineCode: null, refundedAmount: 0, createdAt: now(), idempotencyKey: key,
    };
    charges.set(c.id, c);
    log(`cargo ${c.id} ref=${c.reference} monto=${c.amount} comportamiento=${behavior}`);

    const succeed = async (dupes = 1, badFirst = false) => {
      await sleep(PROCESSING_MS);
      c.status = 'SUCCEEDED';
      const ev = chargeEvent('charge.succeeded', c);
      if (badFirst) { await postWebhook(b.callbackUrl, ev, { badSignature: true }); await sleep(3000); }
      for (let i = 0; i < dupes; i++) { await postWebhook(b.callbackUrl, ev); if (i < dupes - 1) await sleep(500); }
    };

    switch (behavior) {
      case 'APPROVE':
        succeed();
        return { status: 201, body: publicCharge(c) };
      case 'DUPLICATE_WEBHOOK':
        succeed(2);
        return { status: 201, body: publicCharge(c) };
      case 'BAD_SIGNATURE_THEN_VALID':
        succeed(1, true);
        return { status: 201, body: publicCharge(c) };
      case 'TIMEOUT':
        // El cobro SÍ se procesa y el webhook llega, pero la respuesta HTTP tarda TIMEOUT_MS.
        succeed();
        await sleep(TIMEOUT_MS);
        return { status: 201, body: publicCharge(c) };
      case 'DELAYED_FAIL':
        (async () => {
          await sleep(PROCESSING_MS);
          c.status = 'FAILED'; c.declineCode = 'RISK_REJECTED';
          await postWebhook(b.callbackUrl, chargeEvent('charge.failed', c));
        })();
        return { status: 201, body: publicCharge(c) };
      case 'DECLINE':
        c.status = 'DECLINED'; c.declineCode = 'INSUFFICIENT_FUNDS';
        return { status: 402, body: publicCharge(c) };
      default:
        c.status = 'DECLINED'; c.declineCode = 'CARD_NOT_SUPPORTED';
        return { status: 402, body: publicCharge(c) };
    }
  });
}

async function createRefund(req, res, raw) {
  let b;
  try { b = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'INVALID_JSON' }); }
  const c = charges.get(b.chargeId);
  if (!c) return send(res, 404, { error: 'CHARGE_NOT_FOUND' });
  if (!Number.isInteger(b.amount) || b.amount <= 0) return send(res, 400, { error: 'VALIDATION_ERROR', details: ['amount debe ser un entero positivo en centavos'] });
  return handleIdempotent(req, res, 'refund', raw, async () => {
    if (c.status !== 'SUCCEEDED' && c.status !== 'PARTIALLY_REFUNDED') return { status: 409, body: { error: 'CHARGE_NOT_REFUNDABLE', status: c.status } };
    if (b.amount > c.amount - c.refundedAmount) return { status: 422, body: { error: 'REFUND_EXCEEDS_CHARGE', refundable: c.amount - c.refundedAmount } };
    c.refundedAmount += b.amount;
    c.status = c.refundedAmount === c.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    const refund = { id: rid('re'), chargeId: c.id, reference: c.reference, amount: b.amount, status: 'SUCCEEDED', createdAt: now() };
    log(`reembolso ${refund.id} cargo=${c.id} monto=${b.amount}`);
    if (b.callbackUrl) {
      postWebhook(b.callbackUrl, { id: rid('evt'), type: 'refund.succeeded', createdAt: now(), data: { refundId: refund.id, chargeId: c.id, reference: c.reference, amount: b.amount, chargeStatus: c.status } });
    }
    return { status: 201, body: refund };
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const raw = await readBody(req);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { status: 'ok', variant: cfg.variant });
  if (req.method === 'GET' && url.pathname === '/v1/events') return send(res, 200, events);
  if (req.headers['authorization'] !== `Bearer ${API_KEY}`) return send(res, 401, { error: 'UNAUTHORIZED', message: 'API key inválida o ausente' });
  if (req.method === 'POST' && url.pathname === '/v1/charges') return createCharge(req, res, raw);
  if (req.method === 'GET' && url.pathname === '/v1/charges') {
    const ref = url.searchParams.get('reference');
    return send(res, 200, [...charges.values()].filter((c) => !ref || c.reference === ref).map(publicCharge));
  }
  const m = url.pathname.match(/^\/v1\/charges\/([\w-]+)$/);
  if (req.method === 'GET' && m) {
    const c = charges.get(m[1]);
    return c ? send(res, 200, publicCharge(c)) : send(res, 404, { error: 'CHARGE_NOT_FOUND' });
  }
  if (req.method === 'POST' && url.pathname === '/v1/refunds') return createRefund(req, res, raw);
  return send(res, 404, { error: 'NOT_FOUND' });
});
server.listen(PORT, () => log(`Pasarela simulada (variante ${cfg.variant}) escuchando en http://localhost:${PORT}`));
