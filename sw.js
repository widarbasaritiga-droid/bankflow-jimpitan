// sw.js - Service Worker untuk Sistem Jimpitan Digital
const CACHE_NAME = 'jimpitan-digital-v2.0.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/shimmer-effects.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js'
];

self.addEventListener('install', event => {
  console.log('🛠️ Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && 
      !url.href.includes('cdnjs.cloudflare.com') &&
      !url.href.includes('html2canvas.hertzen.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('📂 From cache:', event.request.url);
          return response;
        }
        
        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('💾 Cached new resource:', event.request.url);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('❌ Fetch failed:', error);
            
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            if (event.request.url.includes('script.google.com')) {
              return new Response(JSON.stringify({
                status: 'error',
                message: 'Anda sedang offline. Silakan cek koneksi internet.'
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          });
      })
  );
});

self.addEventListener('message', event => {
  console.log('📨 Message from client:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting().then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_NAME.split('-').pop(),
            action: 'reload'
          });
        });
      });
    });
  }
});
