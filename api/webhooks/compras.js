// GET  /api/compras — o PWA busca as compras pendentes
// POST /api/compras { ids:[...] } — o PWA confirma o que importou (remove da caixa de entrada)
const { INBOX, autorizado, redis, lerBody, json } = require('./_lib/bp.js');

module.exports = async (req, res) => {
  if (!autorizado(req)) return json(res, 401, { success: false, error: 'unauthorized' });
  try {
    if (req.method === 'GET') {
      const [flat] = await redis([['HGETALL', INBOX]]);
      const items = [];
      for (let i = 1; i < (flat || []).length; i += 2) { try { items.push(JSON.parse(flat[i])); } catch (e) {} }
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
