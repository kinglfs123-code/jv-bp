const CACHE = 'bp-financeiro-v25';
const ASSETS = ['./index.html','./manifest.json','./icon-192.png','./icon-512.png',
                './icon-maskable.png','./favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u =>
        fetch(u, {cache:'reload'})
          .then(r => r.ok ? c.put(u, r) : null)
          .catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// nunca devolve resposta redirecionada — o Safari rejeita
async function limpa(res){
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, {status:200, statusText:'OK', headers:res.headers});
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;                       // dados autenticados: nunca cachear
  const cdn = url.hostname === 'cdn.jsdelivr.net';
  if (url.origin !== self.location.origin && !cdn) return;           // Supabase e outros: sempre rede

  // navegação: rede primeiro (sempre a versão nova), cache só offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch('./index.html', {cache:'no-store', redirect:'follow'}).then(limpa).then(res => {
        if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)).catch(() => {}); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(async res => {
      const ok = await limpa(res);
      if (ok && ok.status === 200 && (ok.type === 'basic' || cdn)) {
        const copy = ok.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return ok;
    }).catch(() => cdn ? Response.error() : caches.match('./index.html')))
  );
});
