// Service Worker untuk JIMPITAN MANG RESTI PWA
const CACHE_NAME = 'jimpitan-cache-v1';

// FILE YANG AKAN DI-CACHE
const filesToCache = [
  '/bankflow-jimpitan/',
  '/bankflow-jimpitan/index.html',
  '/bankflow-jimpitan/manifest.json',
  '/bankflow-jimpitan/favicon.ico',
  '/bankflow-jimpitan/favicon-16x16.png',
  '/bankflow-jimpitan/favicon-32x32.png',
  '/bankflow-jimpitan/apple-touch-icon.png',
  '/bankflow-jimpitan/android-chrome-192x192.png',
  '/bankflow-jimpitan/android-chrome-512x512.png'
];

// PASANG SERVICE WORKER
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(filesToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// AKTIFKAN SERVICE WORKER
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// TANGANI PERMINTAAN
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/bankflow-jimpitan/index.html');
            }
          });
      })
  );
});
