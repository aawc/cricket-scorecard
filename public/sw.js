const CACHE_NAME = 'cricket-scorecard-v2026.09.001';
const ASSETS = [
    'index.html',
    'style.css',
    'src/style.css',
    'src/app.js',
    'src/state.js',
    'src/storage.js',
    'src/sync.js',
    'src/modal.js',
    'src/reducer.js',
    'src/ui.js',
    'src/feedback.js',
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
    const url = new URL(event.request.url);

    // Bypass caching for live sync API endpoints and dynamic cloud storage providers
    if (
        url.pathname.includes('/api/match/') ||
        url.searchParams.has('action') ||
        url.searchParams.has('_t') ||
        url.hostname.includes('script.google.com') ||
        url.hostname.includes('workers.dev') ||
        url.hostname.includes('khaneja.org')
    ) {
        return;
    }

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

