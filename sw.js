// Cubo Rubik · byarcy — guarda la app para usarla sin internet
// Al publicar una versión nueva, cambia el número de CACHE: así se borra lo guardado de la anterior.
const CACHE = 'cubo-rubik-v0.33';
const FILES = [
  './', './index.html', './estilos.css',
  './motor_grafico.js', './logica_cubo.js', './algoritmos.js', './entrenador.js', './controlador_juego.js',
  './orbitron.woff', './icon.svg',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

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

// Primero internet (para recibir versiones nuevas, y que todos los archivos sean de la misma);
// sin conexión, lo guardado.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
