const CACHE = 'factory-v4';
const ASSETS = ['/', '/index.html', '/css/styles.css', '/js/audio.js',
  '/js/core/state.js', '/js/core/engine.js', '/js/core/loop.js',
  '/js/database/machines.db.js', '/js/database/resources.db.js',
  '/js/database/economy.db.js', '/js/database/eras.db.js',
  '/js/ui/canvas.js', '/js/ui/renderer.js', '/js/ui/components.js',
  '/js/city/city.db.js', '/js/city/city.js', '/js/city/city-ui.js',
  '/js/world/planet.js', '/assets/svg/icons.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.url.includes('fonts.googleapis') || e.request.url.includes('fonts.gstatic')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
