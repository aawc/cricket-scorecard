const CACHE_NAME = 'cricket-scorecard-v20260614-009';
const ASSETS = [
    'index.html',
    'style.css',
    'src/app.js',
    'src/state.js',
    'src/storage.js',
    'src/reducer.js',
    'src/ui.js',
    'manifest.json',
    'favicon.png',
    'icon-192x192.png',
    'icon-512x512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching assets');
                return cache.addAll(ASSETS);
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Cache hit - return response
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request);
            })
    );
});
