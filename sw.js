const CACHE_NAME = 'ppsu-sports-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/pages/games.html',
  '/pages/profile.html',
  '/pages/results.html',
  '/pages/schedules.html',
  '/pages/news.html',
  '/contact us.html',
  '/script.js',
  '/manifest.json'
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