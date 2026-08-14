const CACHE = 'bp-financeiro-v5';
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

  // navegação: serve sempre o index do cache
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html')
        .then(hit => hit || fetch('./index.html', {redirect:'follow'}).then(limpa))
        .catch(() => fetch(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(async res => {
      const ok = await limpa(res);
      if (ok && ok.status === 200 && ok.type === 'basic') {
        const copy = ok.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return ok;
    }).catch(() => caches.match('./index.html')))
  );
});
