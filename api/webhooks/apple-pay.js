// POST /api/webhooks/apple-pay — recebe compras do Atalho (Apple Pay) e guarda na caixa de entrada
const { INBOX, TTL, autorizado, redis, parseValor, texto, lerBody, json, crypto } = require('../_lib/bp.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { success: false, error: 'method_not_allowed' }); }
  if (!autorizado(req)) return json(res, 401, { success: false, error: 'unauthorized' });

  const b = lerBody(req);
  if (!b) return json(res, 400, { success: false, error: 'invalid_json' });

  const valor = Math.round(parseValor(b.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1000000) return json(res, 400, { success: false, error: 'invalid_valor' });

  const estabelecimento = texto(b.estabelecimento, 60) || 'Compra Apple Pay';
  const cartao = texto(b.cartao, 40);
  const t = Date.parse(b.data);
  const data = new Date(Number.isNaN(t) ? Date.now() : t).toISOString();

  // id determinístico: o mesmo disparo repetido não duplica a compra
  const id = crypto.createHash('sha256').update([valor, estabelecimento, cartao, data].join('|')).digest('hex').slice(0, 20);
  const compra = { id, valor, estabelecimento, cartao, data, recebido: new Date().toISOString() };

  try {
    await redis([['HSET', INBOX, id, JSON.stringify(compra)], ['EXPIRE', INBOX, TTL]]);
  } catch (e) {
    console.error('apple-pay webhook: falha ao salvar', e.message); // sem dados da compra no log
    return json(res, 500, { success: false, error: 'storage_error' });
  }
  return json(res, 200, { success: true });
};
