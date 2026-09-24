// Helpers compartilhados das rotas /api (arquivos em _lib não viram rota na Vercel)
const crypto = require('crypto');

const INBOX = 'bp:inbox';            // hash: id -> compra (JSON)
const TTL = 60 * 60 * 24 * 90;       // a chave inteira some após 90 dias sem compras
const MAX_DIAS = 60;                 // cada compra fica 60 dias disponível para todos os aparelhos

// Autenticação: Authorization: Bearer <BP_WEBHOOK_TOKEN>
function autorizado(req) {
  const esperado = process.env.BP_WEBHOOK_TOKEN || '';
  if (esperado.length < 16) return false; // token fraco/ausente = tudo bloqueado
  const h = String(req.headers.authorization || '');
  const recebido = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  const a = crypto.createHash('sha256').update(recebido).digest();
  const b = crypto.createHash('sha256').update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}

// Upstash Redis via REST (sem dependências). Aceita as envs da integração Vercel ou do Upstash.
async function redis(comandos) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const tok = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !tok) throw new Error('storage_not_configured');
  const r = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos),
  });
  if (!r.ok) throw new Error('storage_http_' + r.status);
  const out = await r.json();
  return out.map(x => { if (x.error) throw new Error('storage_cmd'); return x.result; });
}

// "150.50" | 150.5 | "R$ 150,50" | "1.234,56" | "1,234.56" -> 150.5 / 1234.56
function parseValor(v) {
  if (typeof v === 'number') return v;
  let s = String(v == null ? '' : v).replace(/[^\d,.\-]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (/^\d{1,3}(,\d{3})+$/.test(s)) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  return Number(s);
}

function texto(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, max);
}

function lerBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  return null;
}

function json(res, status, obj) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(obj);
}

module.exports = { INBOX, TTL, MAX_DIAS, autorizado, redis, parseValor, texto, lerBody, json, crypto };
