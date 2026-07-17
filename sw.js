const CACHE_NAME = 'cialpa-app-v2.6.211';
const PRESERVED_CACHE_PREFIXES = ['cialpa-map-tiles'];
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/css/mec-form.css',
  './assets/css/mec-ficha.css',
  './assets/vendor/lucide.min.js',
  './assets/js/config.js',
  './assets/js/local-store.js',
  './assets/js/geo-measure.js',
  './assets/js/api.js',
  './assets/js/auth.js',
  './assets/js/app.js',
  './assets/js/map.js',
  './assets/js/survey.js',
  './assets/js/jornada.js',
  './assets/js/admin.js',
  './assets/js/stats.js',
  './assets/js/department-atlas.js',
  './assets/js/location-audit.js',
  './assets/js/manual.js',
  './assets/js/planning.js',
  './assets/js/initial-questionnaire.js',
  './assets/js/mec-schema.js',
  './assets/js/mec-form.js',
  './assets/js/guided-register.js',
  './assets/js/mec-ficha.js',
  './assets/data/highres-school-index.json',
  './assets/data/r01-schools-public.json',
  './assets/data/demo-infraestructura-mec.json',
  './manual/',
  './manual/index.html',
  './manual/manual.css',
  './cuestionario_inicial/',
  './cuestionario_inicial/index.html',
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
  const accept = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || accept.includes('text/html');
  const isStaticAsset = _isStaticAssetRequest(request, url);

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
      caches.match(request, { ignoreSearch: true }).then(cached => cached || fetch(request).then(response => {
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
      .catch(() => caches.match(request, { ignoreSearch: isStaticAsset })
        .then(cached => {
          if (cached) return cached;
          if (isNavigation) return caches.match('./index.html');
          return Promise.reject(new Error(`[SW] Sin cache para ${request.url}`));
        }))
  );
});

function _isStaticAssetRequest(request, url) {
  if (['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) return true;
  return /\.(?:js|css|json|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|map|webmanifest)$/i.test(url.pathname);
}

function _cacheIfValid(request, response) {
  if (!response || !response.ok) return;
  const cacheableTypes = ['basic', 'cors', 'default'];
  if (response.type && !cacheableTypes.includes(response.type)) return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(err => {
    console.warn('[SW] No se pudo actualizar cache', request.url, err);
  });
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification?.data?.url || './?module=encuestadores', self.registration.scope).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) {
            try {
              client.postMessage({ type: 'OPEN_MODULE', module: 'encuestadores' });
            } catch (_) {
              // Best-effort navigation hint.
            }
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
        return undefined;
      })
  );
});
