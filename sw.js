const CACHE_NAME = 'pokemon-rpg-v3'; // Versionsnummer erhöht!

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

// 1. Service Worker Installation
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching static core assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Aktivierung & alte Caches aufräumen
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

// 3. Network-First für eigene App-Dateien (holt immer frischen Code!)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Für eigene lokale Dateien (HTML, CSS, JS): Immer erst das Netzwerk fragen
  if (url.includes(location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Nur wenn offline, aus dem Cache laden
          return caches.match(event.request);
        })
    );
    return;
  }

  // Für externe Bilder/APIs (PokéAPI, TCG, Leaflet): Cache-First für schnelle Performance
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.includes('pokemontcg.io') || url.includes('pokeapi.co') || url.includes('unpkg.com'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
