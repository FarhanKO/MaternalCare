/**
 * Guardian app service worker.
 *
 * Deliberately minimal: it caches the shell so the app opens without a
 * connection, and nothing else. Caching her vitals would risk showing a
 * guardian a reassuring reading that is hours out of date, which is worse
 * than showing nothing.
 */
const SHELL = 'guardian-shell-v1';
const ROOT = new URL('./', self.registration.scope);
const ASSETS = [ROOT.href, new URL('index.html', ROOT), new URL('manifest.webmanifest', ROOT), new URL('guardian-icon.svg', ROOT)];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // never serve her health data from a cache — stale readings mislead
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match(new URL('index.html', ROOT))),
  );
});

/**
 * Web Push, if a push service is ever wired up. The OS decides the sound
 * from here — a silenced phone stays silent, which is exactly the gap the
 * native build has to close.
 */
self.addEventListener('push', (event) => {
  let payload = { title: 'Emergency', body: 'She needs help now.' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch { /* keep the default */ }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: 'sos',
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 120, 400, 120, 700],
      icon: '/guardian-icon.svg',
      data: { url: '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      return open ? open.focus() : self.clients.openWindow('/');
    }),
  );
});
