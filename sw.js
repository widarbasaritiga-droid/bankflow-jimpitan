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

// Install Service Worker
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

// Activate Service Worker
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

// Fetch Strategy: Cache First, Fallback to Network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external requests (except CDN)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && 
      !url.href.includes('cdnjs.cloudflare.com') &&
      !url.href.includes('html2canvas.hertzen.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          console.log('📂 From cache:', event.request.url);
          return response;
        }
        
        // Not in cache - fetch from network
        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Check if valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response
            const responseToCache = networkResponse.clone();
            
            // Add to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('💾 Cached new resource:', event.request.url);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('❌ Fetch failed:', error);
            
            // Return offline page or fallback
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // For API calls, return error response
            if (event.request.url.includes('script.google.com')) {
              return new Response(JSON.stringify({
                status: 'error',
                message: 'Anda sedang offline. Silakan cek koneksi internet.'
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            return new Response('<h1>Anda sedang offline</h1><p>Aplikasi Jimpitan Digital membutuhkan koneksi internet</p>', {
              headers: { 'Content-Type': 'text/html' }
            });
          });
      })
  );
});

// Handle messages from client
self.addEventListener('message', event => {
  console.log('📨 Message from client:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting().then(() => {
      // Send message to all clients
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
  
  if (event.data.type === 'GET_VERSION') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'VERSION_INFO',
          version: CACHE_NAME.split('-').pop(),
          cacheName: CACHE_NAME
        });
      });
    });
  }
});

// Background sync (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    console.log('🔄 Background sync triggered');
    // Handle background sync logic here
  }
});

// Push notifications (optional)
self.addEventListener('push', event => {
  console.log('📢 Push notification received:', event);
  
  const options = {
    body: event.data?.text() || 'Notifikasi dari Sistem Jimpitan',
    icon: '/favicon-192x192.png',
    badge: '/favicon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Sistem Jimpitan Digital', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return clients.openWindow('/');
      })
  );
});
