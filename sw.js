// Service Worker untuk PWA
const CACHE_NAME = 'jimpitan-v2.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/shimmer-effects.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
