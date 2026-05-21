const CACHE_NAME = 'cialpa-app-v2.6.74';
const PRESERVED_CACHE_PREFIXES = ['cialpa-map-tiles'];
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/css/mec-form.css',
  './assets/css/mec-ficha.css',
  './assets/js/config.js',
  './assets/js/local-store.js',
  './assets/js/api.js',
  './assets/js/auth.js',
  './assets/js/app.js',
  './assets/js/map.js',
  './assets/js/survey.js',
  './assets/js/jornada.js',
  './assets/js/admin.js',
  './assets/js/stats.js',
  './assets/js/manual.js',
  './assets/js/guided-register.js',
  './assets/js/mec-schema.js',
  './assets/js/mec-form.js',
  './assets/js/planning.js',
  './assets/js/mec-ficha.js',
  './mec-ficha.html',
  './assets/img/logo.png',
  './assets/img/favicon.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(
      APP_SHELL.map(item => cache.add(item).catch(err => {
        console.warn('[SW] No se pudo precachear', item, err);
      }))
    ))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_NAME && !PRESERVED_CACHE_PREFIXES.some(prefix => key.startsWith(prefix)))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    const cacheableExternal = [
      'unpkg.com',
      'cdn.jsdelivr.net',
      'server.arcgisonline.com',
      'tile.openstreetmap.org',
      'tile.openstreetmap.fr',
    ].some(host => url.hostname === host || url.hostname.endsWith('.' + host));
    if (!cacheableExternal) return;
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        _cacheIfValid(request, response);
        return response;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        _cacheIfValid(request, response);
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
  );
});

function _cacheIfValid(request, response) {
  if (!response || !response.ok) return;
  const cacheableTypes = ['basic', 'cors', 'default'];
  if (response.type && !cacheableTypes.includes(response.type)) return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(err => {
    console.warn('[SW] No se pudo actualizar cache', request.url, err);
  });
}
