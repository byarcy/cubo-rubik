// Cubo Rubik · byarcy — guarda la app para usarla sin internet
const CACHE = 'cubo-rubik-v0.18';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('cubo-rubik-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // La página: primero internet (para recibir versiones nuevas); sin conexión, la guardada
    e.respondWith(
      fetch(req)
        .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); } return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Íconos y manifiesto: primero lo guardado
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
