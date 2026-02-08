// sw.js - SIMPLE DAN PASTI BEKERJA
self.addEventListener('install', function(event) {
  console.log('SW installed');
});

self.addEventListener('activate', function(event) {
  console.log('SW activated');
});

self.addEventListener('fetch', function(event) {
  // Biarkan kosong, hanya untuk registrasi
});
