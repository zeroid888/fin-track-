// service-worker.js — офлайн-кеш для «Мои финансы»
// При обновлении index.html — поднять CACHE_VERSION, иначе пользователи будут видеть старую версию.
const CACHE_VERSION = 'fintrack-v21';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  // Сразу активируемся, не ждём закрытия всех вкладок
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // CDN (papaparse, xlsx и прочее) не трогаем — в ensureLib() уже есть логика
  // «если офлайн — показать понятную ошибку вместо падения».
  if (url.origin !== self.location.origin) return;

  // Для навигации (открытие страницы) — сначала сеть, потом кеш.
  // Так при онлайне всегда свежая версия, а в самолёте — из кеша.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('./index.html'))
        )
    );
    return;
  }

  // Для остальных файлов (manifest, icon) — сначала кеш, потом сеть.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
