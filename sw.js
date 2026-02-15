// Service Worker for OAS Score & Tools PWA
// Cache version replaced at deploy (20260214163929) so new deploys get fresh assets
const CACHE_NAME = 'oas-score-20260214163929';
const RUNTIME_CACHE = 'oas-runtime-20260214163929';

// Assets to cache immediately on install
// Note: Paths are relative to service worker location (root /)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/tailwind-compiled.css',
  '/css/unified-scorecard-list.css',
  '/css/main.css',
  '/css/score.css',
  '/css/score-colors.css',
  '/css/keypad.css',
  '/css/components.css',
  '/js/common.js',
  '/js/archer_module.js',
  '/js/live_updates.js',
  '/js/unified_scorecard_list.js',
  '/offline.html'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
          .catch((err) => {
            console.warn('[SW] Some static assets failed to cache:', err);
            // Continue even if some assets fail
            return Promise.resolve();
          });
      })
      .then(() => {
        // Cache external resources
        return caches.open(RUNTIME_CACHE).then((cache) => {
          return Promise.allSettled(
            EXTERNAL_RESOURCES.map(url => 
              fetch(url).then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              }).catch(() => {
                // Ignore failures for external resources
              })
            )
          );
        });
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all pages immediately
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - special handling to work with live_updates.js offline queue
  if (url.pathname.startsWith('/api/')) {
    // For POST/PUT/DELETE/PATCH: Don't intercept - let live_updates.js handle network errors
    // This allows the offline queue system to detect failures and queue requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      // Pass through to network - don't cache or intercept
      // live_updates.js will catch network errors and queue them
      return;
    }
    
    // For GET requests: Network-first, but propagate failures so app knows it's offline
    // Only cache successful responses, don't mask network failures
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET responses (read-only data like archer lists, events)
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          // Network failed - try cache for read-only data, but propagate error if no cache
          // This ensures the app knows it's offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              // Return cached data but add header to indicate it's stale
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-Cache-Status', 'stale');
              return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers: headers
              });
            }
            // No cache available - propagate the network error
            // This allows live_updates.js and other code to detect offline state
            throw error;
          });
        })
    );
    return;
  }

  // HTML pages - network first, cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to offline page
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS, images) - cache first, network fallback
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/avatars/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Not in cache, fetch from network
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // Network failed and not in cache
              // For images, return a placeholder or empty response
              if (request.headers.get('accept')?.includes('image')) {
                return new Response('', { status: 404 });
              }
              throw new Error('Network error');
            });
        })
    );
    return;
  }

  // External resources (CDN) - cache first, network fallback
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // Return empty response for failed external resources
              return new Response('', { status: 404 });
            });
        })
    );
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline queue (if supported)
// Note: This complements the existing localStorage-based queue in live_updates.js
// The queue system in live_updates.js handles the actual flushing
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    console.log('[SW] Background sync triggered - notifying page to flush queues');
    event.waitUntil(
      // Notify all clients to flush their queues
      self.clients.matchAll().then(clients => {
        return Promise.all(
          clients.map(client => {
            return client.postMessage({
              type: 'FLUSH_QUEUES',
              source: 'service-worker'
            }).catch(() => {
              // Client may have closed, ignore
            });
          })
        );
      })
    );
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  // Future: Handle push notifications for event updates
});

// Message handler for cache updates and queue coordination
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
  // Handle online status changes from the page
  if (event.data && event.data.type === 'ONLINE_STATUS') {
    if (event.data.online) {
      // Connection restored - notify all clients to flush queues
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'FLUSH_QUEUES',
            source: 'service-worker'
          }).catch(() => {});
        });
      });
    }
  }
});

