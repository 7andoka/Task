const CACHE_NAME = 'rich-land-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/background.jpg'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle notification click to open/focus the PWA app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Clear or decrement app badge
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle Web Push event for background notifications when app is closed
self.addEventListener('push', (event) => {
  let data = {
    title: 'تنبيه جديد - Rich Land',
    body: 'يوجد تحديث جديد في العمليات',
    isAlert: false
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg',
    badge: 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg',
    vibrate: data.isAlert ? [400, 100, 400, 100, 400] : [300, 100, 300, 100, 300],
    tag: 'pwa-notification-' + Date.now(),
    renotify: true,
    data: { url: '/' }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      'setAppBadge' in self.navigator ? self.navigator.setAppBadge(1).catch(() => {}) : Promise.resolve()
    ])
  );
});

// Handle Periodic Background Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-jobs-update') {
    event.waitUntil(
      self.registration.showNotification('Rich Land - فحص الخلفية', {
        body: 'التطبيق يعمل في الخلفية لمتابعة حركة التشغيلات والتنبيهات',
        icon: 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg',
        badge: 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg',
        tag: 'periodic-sync-check'
      }).catch(() => {})
    );
  }
});

// Handle incoming client message to show notification or set badge from SW context
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, isAlert, count } = event.data;
    const options = {
      body,
      icon: 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg',
      badge: 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg',
      vibrate: isAlert ? [400, 100, 400, 100, 400] : [300, 100, 300, 100, 300],
      tag: 'pwa-notification-' + Date.now(),
      renotify: true,
      data: { url: '/' }
    };

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(title, options),
        count && 'setAppBadge' in self.navigator ? self.navigator.setAppBadge(count).catch(() => {}) : Promise.resolve()
      ])
    );
  }
});

