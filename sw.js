// Service Worker untuk JIMPITAN MANG RESTI PWA
const CACHE_NAME = 'jimpitan-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './apple-touch-icon.png',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Install Completed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Install Failed', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Activate Completed');
      return self.clients.claim();
    })
  );
});

// Fetch Strategy: Cache First, then Network
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching', event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.indexOf('chrome-extension') !== -1) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version
        if (response) {
          console.log('Service Worker: Serving from Cache', event.request.url);
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        // Make network request
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the new response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Service Worker: Fetch Failed', error);
            
            // If both cache and network fail, show offline page
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle Background Sync
self.addEventListener('sync', event => {
  console.log('Service Worker: Background Sync', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Handle Push Notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push Received');
  
  const options = {
    body: event.data ? event.data.text() : 'Notifikasi dari Jimpitan Mang Resti',
    icon: './android-chrome-192x192.png',
    badge: './android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Buka Aplikasi',
        icon: './android-chrome-192x192.png'
      },
      {
        action: 'close',
        title: 'Tutup',
        icon: './android-chrome-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('JIMPITAN MANG RESTI', options)
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification Click');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Sync transactions function
async function syncTransactions() {
  try {
    console.log('Syncing transactions...');
    
    // Get pending transactions from IndexedDB
    // This is a placeholder - implement based on your data structure
    const pendingTransactions = await getPendingTransactions();
    
    for (const transaction of pendingTransactions) {
      try {
        // Sync each transaction
        await syncTransaction(transaction);
        
        // Remove from pending after successful sync
        await removePendingTransaction(transaction.id);
      } catch (error) {
        console.error('Failed to sync transaction:', transaction.id, error);
      }
    }
    
    console.log('Sync completed');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingTransactions() {
  // Implement based on your IndexedDB structure
  return [];
}

async function syncTransaction(transaction) {
  // Implement sync logic with your API
  return Promise.resolve();
}

async function removePendingTransaction(id) {
  // Implement removal logic
  return Promise.resolve();
}
