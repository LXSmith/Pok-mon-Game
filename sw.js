const CACHE_NAME = 'pokemon-rpg-v1';

// Statische Kern-Ressourcen, die sofort beim Installieren gespeichert werden
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap'
];

// Service Worker Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching static core assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Aktivierung & alte Caches aufräumen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Abfangen von Anfragen (Cache-First Strategie für Medien & Dokumente)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Antworten im Cache ablegen (z.B. nachgeladene Pokémon-Grafiken von pokemontcg.io)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes('pokemontcg.io') || event.request.url.includes('pokeapi.co'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Falls komplett offline und nicht im Cache
        console.log('[Service Worker] Fetch failed, offline mode active');
      });
    })
  );
});
