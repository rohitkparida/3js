// Basic service worker for caching static assets
const CACHE_NAME = 'tif-site-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/js/main.js',
    '/js/game.js',
    '/js/config.js',
    '/js/scene.js',
    '/js/character.js',
    '/js/camera.js',
    '/js/physics.js',
    '/js/environment.js',
    '/js/collision-detection.js',
    '/js/terrain.js',
    '/js/tree-loader.js',
    '/js/vehicle-loader.js',
    '/js/boundaries.js',
    '/js/buildings-clean.js',
    '/js/roads-clean.js',
    '/js/vegetation-clean.js',
    '/js/buildings.js',
    '/js/roads.js',
    '/js/vegetation.js',
    '/js/vehicles.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});
