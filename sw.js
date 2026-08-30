// ============================================
// SERVICE WORKER - JIMPITAN DIGITAL v2.0.0
// ============================================

const CACHE_NAME = 'jimpitan-v2.0.0';
const CACHE_VERSION = '2.0.0';

// ============================================
// DAFTAR FILE YANG DI-CACHE
// ============================================
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/favicon.ico',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  console.log('📦 Cache Name:', CACHE_NAME);
  console.log('📦 Version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching assets...');
        console.log('📦 Total assets:', urlsToCache.length);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed!');
        console.log('✅ Cache: ' + CACHE_NAME);
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Cache failed:', error);
        console.error('❌ Failed URLs:', urlsToCache);
      })
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', event => {
  console.log('🔧 Service Worker: Activating...');
  console.log('📦 Current Cache:', CACHE_NAME);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log('📦 Existing caches:', cacheNames);
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Removing old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker activated!');
      console.log('✅ Active Cache:', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH EVENT - DENGAN STRATEGI YANG LEBIH BAIK
// ============================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // ===== API REQUEST - NETWORK FIRST =====
  if (url.pathname.includes('/exec') || url.pathname.includes('script.google.com')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone response untuk cache
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // Jika offline, coba dari cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Jika tidak ada cache, return offline message
              return new Response(JSON.stringify({
                status: 'error',
                message: 'Offline - Silakan coba lagi nanti',
                offline: true
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }
  
  // ===== STATIC ASSETS - CACHE FIRST =====
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(response => {
            // Cek apakah response valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response untuk cache
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clonedResponse);
            });
            return response;
          })
          .catch(() => {
            // Jika offline dan tidak ada cache
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
            return new Response('Offline - Silakan coba lagi nanti', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ============================================
// MESSAGE EVENT - UNTUK UPDATE
// ============================================
self.addEventListener('message', event => {
  console.log('📨 Message received:', event.data);
  
  if (event.data === 'SKIP_WAITING') {
    console.log('⏭️ Skipping waiting...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    console.log('🔄 Checking for update...');
    self.skipWaiting();
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_UPDATED',
          version: CACHE_VERSION,
          action: 'reload'
        });
      });
    });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cache: CACHE_NAME
    });
  }
});

// ============================================
// PUSH NOTIFICATION
// ============================================
self.addEventListener('push', event => {
  console.log('🔔 Push notification received:', event);
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || '💡 Ada transaksi baru!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      date: new Date().toISOString()
    },
    actions: [
      {
        action: 'open',
        title: '📱 Buka Aplikasi'
      },
      {
        action: 'close',
        title: '❌ Tutup'
      }
    ],
    requireInteraction: true,
    silent: false,
    tag: 'jimpitan-notification',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification('🏦 Jimpitan Digital', options)
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event);
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(windowClients => {
          // Cek apakah sudah ada window yang terbuka
          for (const client of windowClients) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // Jika tidak ada, buka baru
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// ============================================
// PERIODIC BACKGROUND SYNC (untuk update data)
// ============================================
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-jimpitan') {
    console.log('🔄 Periodic sync running...');
    event.waitUntil(
      fetch('/api/check-update')
        .then(response => response.json())
        .then(data => {
          console.log('✅ Sync completed:', data);
        })
        .catch(error => {
          console.error('❌ Sync failed:', error);
        })
    );
  }
});

// ============================================
// BACKGROUND FETCH (untuk download data)
// ============================================
self.addEventListener('backgroundfetchsuccess', event => {
  console.log('✅ Background fetch success:', event);
  // Process downloaded data
});

// ============================================
// NETWORK STATUS
// ============================================
self.addEventListener('online', () => {
  console.log('🌐 App is online');
  // Notify clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_ONLINE',
        timestamp: new Date().toISOString()
      });
    });
  });
});

self.addEventListener('offline', () => {
  console.log('📡 App is offline');
  // Notify clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_OFFLINE',
        timestamp: new Date().toISOString()
      });
    });
  });
});

// ============================================
// ERROR HANDLING
// ============================================
self.addEventListener('error', event => {
  console.error('❌ Service Worker error:', event);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Unhandled rejection:', event);
});

// ============================================
// GET VERSION (untuk debugging)
// ============================================
self.addEventListener('message', event => {
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cache: CACHE_NAME,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// LOGGING STARTUP
// ============================================
console.log('🚀 Service Worker Started');
console.log('📦 Version:', CACHE_VERSION);
console.log('📦 Cache Name:', CACHE_NAME);
console.log('📅 Timestamp:', new Date().toISOString());