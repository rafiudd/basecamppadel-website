// Service Worker for Basecamp Padel PWA
const CACHE_NAME = 'basecamp-padel-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network-first with silent fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── Push Notification Handler ───────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Basecamp Padel', body: event.data.text() };
  }

  const title = data.title || 'Basecamp Padel';
  const options = {
    body: data.body || '',
    icon: data.icon || '/BasecampPadel_logo.png',
    badge: '/BasecampPadel_logo.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click Handler ───────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
