const CACHE_NAME = 'guess-the-movie-cache-v1';
const urlsToCache = [
  '/',               // Cache the root page (or adjust based on your app structure)
  '/index.html',     // Your main HTML file
  '/styles.css',     // Your CSS file
  '/movies.csv',     // CSV data (if you want to cache it)
  // Add any other assets you wish to cache (scripts, images, etc.)
];

self.addEventListener('install', event => {
  // Pre-cache defined assets during the install step.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Use stale-while-revalidate strategy for all fetch events.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Start the network request in the background.
      const networkFetch = fetch(event.request)
        .then(networkResponse => {
          // Update the cache with the latest response.
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => {
          // If the network request fails, return the cached response if available.
          return cachedResponse;
        });
      // Return the cached response immediately if available, otherwise wait for network.
      return cachedResponse || networkFetch;
    })
  );
});
