// Rubik's Cube · byarcy — keeps the app so it can be used offline
// When publishing a new version, change the CACHE number: that deletes what was saved for the previous one.
// (The prefix "cubo-rubik-" is kept on purpose so older caches get cleaned up too.)
// Every file of the app must be in FILES; tests/i18n.test.js checks that every language in locales/ is listed.
const CACHE = 'cubo-rubik-v0.41';
const FILES = [
  './', './index.html', './styles.css',
  './graphics_engine.js', './cube_logic.js', './algorithms.js', './coach.js', './diagrams.js', './game_controller.js',
  './i18n.js', './locales/languages.json', './locales/en.json', './locales/es.json',
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

// Network first (to receive new versions, and so that all files come from the same one);
// offline, whatever was saved.
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
