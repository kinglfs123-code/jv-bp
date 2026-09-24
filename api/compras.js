// GET  /api/compras — cada aparelho busca as compras dos últimos 60 dias (a caixa não é consumida;
//                     o app guarda o que já importou, então Safari, app instalado e outro iPhone recebem tudo)
// POST /api/compras { ids:[...] } — remoção manual opcional
const { INBOX, MAX_DIAS, autorizado, redis, lerBody, json } = require('./_lib/bp.js');

module.exports = async (req, res) => {
  if (!autorizado(req)) return json(res, 401, { success: false, error: 'unauthorized' });
  try {
    if (req.method === 'GET') {
      const [flat] = await redis([['HGETALL', INBOX]]);
      const items = [], velhos = [];
      const limite = Date.now() - MAX_DIAS * 864e5;
      for (let i = 0; i + 1 < (flat || []).length; i += 2) {
        let c = null; try { c = JSON.parse(flat[i + 1]); } catch (e) {}
        if (!c || Date.parse(c.recebido || c.data) < limite) velhos.push(flat[i]); else items.push(c);
      }
      if (velhos.length) await redis([['HDEL', INBOX, ...velhos]]);
      items.sort((a, b) => String(a.data).localeCompare(String(b.data)));
      return json(res, 200, { success: true, items });
    }
    if (req.method === 'POST') {
      const b = lerBody(req);
      const ids = Array.isArray(b && b.ids) ? b.ids.filter(x => typeof x === 'string' && /^[a-f0-9]{20}$/.test(x)).slice(0, 500) : [];
      if (ids.length) await redis([['HDEL', INBOX, ...ids]]);
      return json(res, 200, { success: true, removidas: ids.length });
    }
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { success: false, error: 'method_not_allowed' });
  } catch (e) {
    console.error('compras: falha no storage', e.message);
    return json(res, 500, { success: false, error: 'storage_error' });
  }
};
