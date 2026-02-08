// ====== KONFIGURASI CACHE ======
// ⚠️ UBAH INI SETIAP KALI DEPLOY UPDATE!
const CACHE_VERSION = 'jimpitan-v2.0.1';
const APP_VERSION = '2.0.1';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 hari
const CACHE_MAX_SIZE = 50;

// Daftar URL yang akan di-cache
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/shimmer-effects.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js'
];

// Daftar URL yang TIDAK BOLEH di-cache
const noCacheUrls = [
    '/api/',
    'https://script.google.com/',
    'https://docs.google.com/'
];

// ====== INSTALL SERVICE WORKER ======
self.addEventListener('install', event => {
    console.log(`[SW ${APP_VERSION}] Installing Service Worker...`);
    
    // Skip waiting untuk aktivasi langsung
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => {
                console.log('[SW] Caching app shell');
                return cache.addAll(urlsToCache.map(url => {
                    // Tambahkan timestamp untuk cache busting
                    const cacheBustedUrl = url.includes('?') 
                        ? `${url}&v=${APP_VERSION}` 
                        : `${url}?v=${APP_VERSION}`;
                    return cacheBustedUrl;
                }));
            })
            .then(() => {
                console.log('[SW] All resources cached');
            })
            .catch(error => {
                console.error('[SW] Cache failed:', error);
            })
    );
});

// ====== AKTIVASI SERVICE WORKER ======
self.addEventListener('activate', event => {
    console.log(`[SW ${APP_VERSION}] Activating Service Worker...`);
    
    event.waitUntil(
        Promise.all([
            // Hapus SEMUA cache versi lama
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Hapus semua cache kecuali versi saat ini
                        if (cacheName !== CACHE_VERSION) {
                            console.log(`[SW] Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Claim semua clients (tab)
            self.clients.claim(),
            
            // Kirim notifikasi ke semua tab untuk reload
            notifyClientsToReload()
        ])
    );
});

// ====== FETCH EVENT ======
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip cache untuk API requests
    if (noCacheUrls.some(noCacheUrl => url.href.includes(noCacheUrl))) {
        return fetch(event.request);
    }
    
    // Cache strategy untuk static assets
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log(`[SW] Cache hit: ${url.pathname}`);
                    
                    // Fetch background update
                    fetch(event.request)
                        .then(response => {
                            // Update cache jika ada update
                            updateCache(event.request, response);
                        })
                        .catch(() => {
                            // Jika fetch gagal, tetap gunakan cache
                        });
                    
                    return cachedResponse;
                }
                
                // Jika tidak ada di cache, fetch dari network
                console.log(`[SW] Cache miss: ${url.pathname}`);
                return fetchAndCache(event.request);
            })
            .catch(() => {
                // Fallback untuk halaman utama
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                
                // Fallback untuk assets
                return fetch(event.request);
            })
    );
});

// ====== FUNGSI UTILITAS ======

// Fetch dan cache response
function fetchAndCache(request) {
    return fetch(request)
        .then(response => {
            // Clone response
            const responseToCache = response.clone();
            
            // Cache jika response valid
            if (response.status === 200) {
                caches.open(CACHE_VERSION)
                    .then(cache => {
                        cache.put(request, responseToCache);
                    });
            }
            
            return response;
        });
}

// Update cache jika ada perubahan
function updateCache(request, response) {
    if (response.status === 200) {
        caches.open(CACHE_VERSION)
            .then(cache => cache.match(request))
            .then(cachedResponse => {
                if (!cachedResponse) {
                    // Belum ada di cache, simpan
                    caches.open(CACHE_VERSION)
                        .then(cache => cache.put(request, response.clone()));
                } else {
                    // Cek jika ada update
                    cachedResponse.text().then(cachedText => {
                        response.clone().text().then(newText => {
                            if (cachedText !== newText) {
                                console.log(`[SW] Cache updated: ${request.url}`);
                                caches.open(CACHE_VERSION)
                                    .then(cache => cache.put(request, response.clone()));
                            }
                        });
                    });
                }
            });
    }
}

// Notify semua clients untuk reload
function notifyClientsToReload() {
    return self.clients.matchAll()
        .then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'SW_UPDATED',
                    version: APP_VERSION,
                    action: 'reload'
                });
            });
        });
}

// ====== MESSAGE HANDLER ======
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        });
    }
    
    if (event.data.type === 'CHECK_UPDATE') {
        checkForUpdates();
    }
});

// ====== CHECK FOR UPDATES ======
function checkForUpdates() {
    fetch('/version.json')
        .then(response => response.json())
        .then(data => {
            if (data.version !== APP_VERSION) {
                console.log(`[SW] Update available: ${APP_VERSION} -> ${data.version}`);
                
                // Update cache
                caches.keys().then(cacheNames => {
                    cacheNames.forEach(cacheName => {
                        if (cacheName !== CACHE_VERSION) {
                            caches.delete(cacheName);
                        }
                    });
                });
                
                // Notify clients
                notifyClientsToReload();
            }
        })
        .catch(error => {
            console.log('[SW] Version check failed:', error);
        });
}

// ====== BACKGROUND SYNC ======
self.addEventListener('sync', event => {
    if (event.tag === 'update-cache') {
        console.log('[SW] Background sync: updating cache');
        checkForUpdates();
    }
});

// ====== PUSH NOTIFICATION ======
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Update tersedia untuk Sistem Jimpitan!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: '/',
            type: 'update'
        },
        actions: [
            {
                action: 'reload',
                title: 'Reload Aplikasi'
            },
            {
                action: 'dismiss',
                title: 'Tutup'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Sistem Jimpitan Digital', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'reload') {
        event.waitUntil(
            self.clients.matchAll()
                .then(clients => {
                    if (clients.length) {
                        clients[0].focus();
                        clients[0].postMessage({type: 'RELOAD_APP'});
                    } else {
                        self.clients.openWindow('/');
                    }
                })
        );
    }
});

// ====== PERIODIC SYNC (untuk update) ======
self.addEventListener('periodicsync', event => {
    if (event.tag === 'check-updates') {
        event.waitUntil(checkForUpdates());
    }
});
