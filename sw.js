const CACHE_NAME = 'pokemon-rpg-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './card-flip.mp3', // <-- Hier direkt im Array!
  './manifest.json'
];

// 1. INSTALLATION (Cacht alle Dateien inklusive des neuen MP3-Sounds)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. AKTIVIERUNG (Löscht alte Caches wie v7, v6 etc.)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH (Lädt Dateien bevorzugt aus dem Cache, offline-ready)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
