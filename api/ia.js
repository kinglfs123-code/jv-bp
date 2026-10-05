// POST /api/ia — Consultor IA do BP Financeiro (Google Gemini · plano gratuito do AI Studio)
// acao: "categorizar" | "analisar" | "chat"  · exige usuário logado (token do Supabase Auth)
const { sbRest, usuarioDaSessao, ehUUID, lerBody, json } = require('./_lib/bp.js');

const CATS = ['Moradia','Alimentação','Transporte','Saúde','Educação','Lazer','Assinaturas','Trabalho','Impostos e taxas','Investimentos','Compras','Outros'];
const MODELO_RAPIDO = process.env.IA_MODELO_RAPIDO || 'gemini-flash-lite-latest';
const MODELO = process.env.IA_MODELO || 'gemini-flash-latest';
const LIMITE_DIA = +process.env.IA_LIMITE_DIA || 60;

// messages: [{role:'user'|'assistant', content}] → formato do Gemini
async function ia(model, system, messages, max_tokens, comoJson) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('ia_not_configured');
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: Object.assign({ maxOutputTokens: max_tokens + 3000, temperature: comoJson ? 0.2 : 0.6 },
        comoJson ? { responseMimeType: 'application/json' } : {}),
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 429) throw new Error('ia_quota');
  if (!r.ok) throw new Error('ia_http_' + r.status);
  const partes = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  return partes.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
}
function jsonDe(txt) {
  const t = String(txt || '').replace(/```json|```/g, '').trim();
  const i = Math.min(...['{', '['].map(c => { const k = t.indexOf(c); return k < 0 ? Infinity : k; }));
  if (!isFinite(i)) throw new Error('ia_json');
  const fim = t[i] === '[' ? t.lastIndexOf(']') : t.lastIndexOf('}');
  return JSON.parse(t.slice(i, fim + 1));
}
const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, n);
const num = v => { const n = +v; return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { ok: false, error: 'method_not_allowed' }); }
  let user;
  try { user = await usuarioDaSessao(req); } catch (e) { return json(res, 500, { ok: false, error: 'auth_error' }); }
  if (!user || !ehUUID(user)) return json(res, 401, { ok: false, error: 'unauthorized' });

  const b = lerBody(req);
  if (!b || !['categorizar', 'analisar', 'chat'].includes(b.acao)) return json(res, 400, { ok: false, error: 'invalid_request' });
  if (JSON.stringify(b).length > 60000) return json(res, 413, { ok: false, error: 'too_large' });
  const en = b.lang === 'en';

  // limite diário por usuário (protege a conta da API)
  try {
    const ok = await sbRest('rpc/bp_ia_conta', { method: 'POST', body: { p_user: user, p_lim: LIMITE_DIA } });
    if (ok === false) return json(res, 429, { ok: false, error: 'limit' });
  } catch (e) { console.error('ia: limite', e.message); return json(res, 500, { ok: false, error: 'storage_error' }); }

  try {
    if (b.acao === 'categorizar') {
      const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 60)
        .map(x => ({ id: txt(x.id, 24), n: txt(x.n, 60), v: num(x.v), f: txt(x.f, 30) })).filter(x => x.id && x.n);
      if (!itens.length) return json(res, 200, { ok: true, itens: [] });
      const out = await ia(MODELO_RAPIDO,
        'Você classifica despesas pessoais de um brasileiro. Categorias permitidas (use exatamente o texto): ' + CATS.join(', ') +
        '. Responda SOMENTE com JSON válido, sem texto extra: [{"id":"...","cat":"..."}].',
        [{ role: 'user', content: JSON.stringify(itens) }], 1500, true);
      const lista = jsonDe(out);
      const itensOk = (Array.isArray(lista) ? lista : []).map(x => ({ id: txt(x.id, 24), cat: CATS.includes(x.cat) ? x.cat : 'Outros' }))
        .filter(x => itens.some(i => i.id === x.id));
      return json(res, 200, { ok: true, itens: itensOk });
    }

    const resumo = JSON.stringify(b.resumo || {}).slice(0, 30000);
    const base = (en ? 'Answer in English.' : 'Responda em português do Brasil.') +
      ' Você é um consultor financeiro pessoal educativo dentro do app BP Financeiro. Use apenas os dados fornecidos; não invente números.' +
      ' Valores em reais (R$). Seja direto, prático e gentil. Não recomende produtos ou corretoras específicas; sugestões são educativas.';

    if (b.acao === 'analisar') {
      const out = await ia(MODELO,
        base + ' Analise o mês e responda SOMENTE com JSON válido neste formato: {"resumo":"2 a 3 frases sobre o mês",' +
        '"alertas":["até 3 alertas curtos"],"planos":[{"titulo":"curto","objetivo":"1 frase","passos":["até 4 passos práticos"],' +
        '"economia_mensal":0,"prazo_meses":0,"meta":{"nome":"nome curto da meta ou vazio","valor":0,"pilar":1}}]} com 2 ou 3 planos.' +
        ' pilar: 1 reserva/liquidez, 2 renda fixa, 3 renda variável, 4 formação de capital. Se um plano não precisar de meta, use "meta":null.',
        [{ role: 'user', content: 'Dados do mês: ' + resumo }], 2000, true);
      const a = jsonDe(out);
      return json(res, 200, { ok: true,
        resumo: txt(a.resumo, 600),
        alertas: (Array.isArray(a.alertas) ? a.alertas : []).slice(0, 3).map(t => txt(t, 220)),
        planos: (Array.isArray(a.planos) ? a.planos : []).slice(0, 3).map(p => ({
          titulo: txt(p.titulo, 80), objetivo: txt(p.objetivo, 220),
          passos: (Array.isArray(p.passos) ? p.passos : []).slice(0, 4).map(t => txt(t, 200)),
          economia_mensal: Math.max(0, num(p.economia_mensal)), prazo_meses: Math.max(0, Math.round(+p.prazo_meses || 0)),
          meta: p.meta && txt(p.meta.nome, 60) && num(p.meta.valor) > 0 ? { nome: txt(p.meta.nome, 60), valor: num(p.meta.valor), pilar: [1,2,3,4].includes(+p.meta.pilar) ? +p.meta.pilar : 4 } : null,
        })) });
    }

    // chat
    const msgs = (Array.isArray(b.mensagens) ? b.mensagens : []).slice(-10)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: txt(m.content, 1000) })).filter(m => m.content);
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    if (!msgs.length) return json(res, 400, { ok: false, error: 'invalid_request' });
    const guiaChat = base +
      ' Você responde perguntas sobre as finanças do usuário dentro do chat. Capacidades principais:' +
      ' (1) GASTOS: diga quanto, onde e quando a partir de "por_categoria" e "contas"; cite valores exatos e nomes das contas.' +
      ' (2) COMPARAR: use "historico" (cada mês tem entradas, saídas, saldo e por_categoria) para comparar meses; dê a diferença em R$ e em %, e diga se subiu ou caiu.' +
      ' (3) PREVER: projete os próximos meses a partir da média dos meses em "historico" mais os recorrentes do mês atual ("assinaturas_mensais", "custo_fixo_mes", "aporte_planejado"); deixe claro que é estimativa e não garantia.' +
      ' Se faltar histórico para comparar ou prever, diga isso em uma frase em vez de inventar. Nunca invente números; use só os dados fornecidos.' +
      ' Responda em até 6 frases curtas, em texto puro, sem markdown nem tabelas. Para listas, use no máximo 3 itens separados por quebra de linha.' +
      ' Dados do usuário (JSON): ' + resumo;
    const resposta = await ia(MODELO, guiaChat, msgs, 900, false);
    return json(res, 200, { ok: true, resposta: txt(resposta, 4000) });
  } catch (e) {
    console.error('ia:', e.message);
    if (e.message === 'ia_quota') return json(res, 429, { ok: false, error: 'limit' });   // cota gratuita do Google esgotada
    return json(res, e.message === 'ia_not_configured' ? 503 : 502, { ok: false, error: 'ia_error' });
  }
};
