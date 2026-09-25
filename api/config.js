// GET /api/config — entrega ao front só a URL e a chave PÚBLICA (anon/publishable) do Supabase.
// Ficam nas envs da Vercel: trocar/rotacionar não exige mexer no código.
module.exports = (req, res) => {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
           || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!url || !key || /^sb_secret_/.test(key)) { res.setHeader('Cache-Control', 'no-store'); return res.status(503).json({ error: 'supabase_not_configured' }); }
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ url, key });
};
