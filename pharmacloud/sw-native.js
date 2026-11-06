/* ============================================
   PHARMACLOUD - SERVICE WORKER NATIVE v1.0
   Background Sync + Push + Offline Queue
   ============================================ */
'use strict';

const SW_VERSION = 'pc-native-v1.0.0';
const STATIC_CACHE = 'pc-static-v1';
const DYNAMIC_CACHE = 'pc-dynamic-v1';
const API_CACHE = 'pc-api-v1';
const OFFLINE_QUEUE = 'pc-offline-queue-v1';

const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './ui-polish.css',
  './theme-manager.css',
  './i18n-system.css',
  './offline.html'
];

/* ============================================
   INSTALL
   ============================================ */
self.addEventListener('install', (event) => {
  console.log('[SW-Native] 📦 Installing v' + SW_VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE).catch(err => {
        console.warn('[SW] Precache partial fail:', err);
      });
      await self.skipWaiting();
    })()
  );
});

/* ============================================
   ACTIVATE
   ============================================ */
self.addEventListener('activate', (event) => {
  console.log('[SW-Native] ✅ Activating');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => !k.startsWith('pc-') || k === 'pc-static-old')
          .map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/* ============================================
   FETCH STRATEGY ROUTER
   ============================================ */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') {
    // Handle POST/PUT/DELETE offline queue
    if (isMutatingMethod(req.method)) {
      event.respondWith(handleMutation(req));
    }
    return;
  }

  if (url.hostname.includes('api.openai.com') ||
      url.hostname.includes('api.groq.com') ||
      url.hostname.includes('api.stripe.com') ||
      url.hostname.includes('accept.paymob.com')) {
    return; // Let AI/Payment APIs go to network
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (isApiEndpoint(url)) {
    event.respondWith(networkFirstWithCache(req, API_CACHE));
    return;
  }

  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(req));
    return;
  }

  event.respondWith(staleWhileRevalidate(req, DYNAMIC_CACHE));
});

/* ============================================
   CACHE STRATEGIES
   ============================================ */
async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(req, cacheName) {
  try {
    const res = await fetch(req, { timeout: 5000 });
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function networkFirstWithOfflineFallback(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    return cached || caches.match('./offline.html');
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

/* ============================================
   OFFLINE MUTATIONS QUEUE
   ============================================ */
function isMutatingMethod(m) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m);
}

async function handleMutation(req) {
  try {
    return await fetch(req.clone());
  } catch (e) {
    // Queue for later
    const cloned = req.clone();
    const body = await cloned.text().catch(() => '');
    const queueEntry = {
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body,
      timestamp: Date.now(),
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
    };

    const cache = await caches.open(OFFLINE_QUEUE);
    await cache.put(
      new Request('/offline-queue/' + queueEntry.id),
      new Response(JSON.stringify(queueEntry))
    );

    // Register sync
    if ('sync' in self.registration) {
      try { await self.registration.sync.register('pc-sync-queue'); } catch (err) {}
    }

    // Notify clients
    broadcastToClients({
      type: 'OFFLINE_QUEUED',
      entry: queueEntry
    });

    return new Response(JSON.stringify({
      queued: true,
      id: queueEntry.id,
      message: 'تم حفظ العملية وسيتم تنفيذها عند العودة للإنترنت'
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function flushOfflineQueue() {
  const cache = await caches.open(OFFLINE_QUEUE);
  const keys = await cache.keys();
  let success = 0;
  let failed = 0;

  for (const key of keys) {
    const res = await cache.match(key);
    const entry = await res.json();
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body || undefined
      });
      if (response.ok) {
        await cache.delete(key);
        success++;
        broadcastToClients({ type: 'SYNC_SUCCESS', entry });
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  return { success, failed };
}

/* ============================================
   BACKGROUND SYNC
   ============================================ */
self.addEventListener('sync', (event) => {
  console.log('[SW] 🔄 Sync event:', event.tag);
  if (event.tag === 'pc-sync-queue') {
    event.waitUntil(flushOfflineQueue());
  }
});

/* ============================================
   PUSH NOTIFICATIONS (Real)
   ============================================ */
self.addEventListener('push', (event) => {
  let data = { title: 'PharmaCloud', body: 'New notification', icon: '/icon-192.png' };

  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch (e) { data.body = event.data.text(); }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'pc-push-' + Date.now(),
    data: data.data || {},
    vibrate: data.vibrate || [200, 100, 200],
    dir: 'rtl',
    lang: data.lang || 'ar',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    image: data.image,
    silent: data.silent || false,
    renotify: data.renotify || false,
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/';
  const action = event.action;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Action handling
      if (action === 'mark_read') {
        broadcastToClients({ type: 'NOTIFICATION_ACTION', action: 'mark_read', data: event.notification.data });
        return;
      }
      if (action === 'snooze') {
        setTimeout(() => {
          self.registration.showNotification(event.notification.title, {
            body: event.notification.body,
            tag: 'snoozed-' + Date.now(),
            data: event.notification.data
          });
        }, 5 * 60 * 1000);
        return;
      }

      // Focus existing or open new
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  broadcastToClients({
    type: 'NOTIFICATION_DISMISSED',
    tag: event.notification.tag
  });
});

/* ============================================
   PERIODIC BACKGROUND SYNC
   ============================================ */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'pc-daily-check') {
    event.waitUntil(runDailyChecks());
  }
});

async function runDailyChecks() {
  console.log('[SW] 🕐 Running daily checks');
  // Broadcast to any open clients
  broadcastToClients({ type: 'RUN_DAILY_CHECKS' });
}

/* ============================================
   MESSAGE HANDLER
   ============================================ */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'FLUSH_QUEUE':
      event.waitUntil(flushOfflineQueue().then(r => {
        event.source?.postMessage({ type: 'FLUSH_RESULT', result: r });
      }));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload?.urls || []));
      break;
    case 'SHOW_NOTIFICATION':
      event.waitUntil(showLocalNotification(payload));
      break;
  }
});

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  broadcastToClients({ type: 'CACHE_CLEARED' });
}

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls).catch(() => {});
}

async function showLocalNotification(payload) {
  await self.registration.showNotification(payload.title || 'PharmaCloud', {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: '/badge-72.png',
    tag: payload.tag || 'local-' + Date.now(),
    data: payload.data || {},
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar'
  });
}

/* ============================================
   HELPERS
   ============================================ */
function isStaticAsset(url) {
  return /\.(css|js|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(url.pathname);
}

function isApiEndpoint(url) {
  return url.pathname.includes('/api/') ||
         url.pathname.includes('/rest/');
}

function broadcastToClients(message) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage(message));
  });
}

console.log('[SW-Native] ✅ Loaded v' + SW_VERSION);