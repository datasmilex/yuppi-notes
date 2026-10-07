// YuPPi Notes Service Worker
const CACHE_NAME = 'yuppi-notes-v2';
const SHELL = ['/', '/manifest.json', '/icon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Canlı eşitleme, sunucu bilgi ucu ve başka kaynaklı istekler ağdan gitsin
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname.startsWith('/__yuppi/') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Sayfa gezintisi: önce ağ (hep güncel sürüm), çevrimdışıysa önbellekteki uygulama kabuğu
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(new Request('/'), response))
        .catch(() => caches.match('/').then((cached) => cached || Response.error()))
    );
    return;
  }

  // Sürüm hash'li statik dosyalar değişmez: önce önbellek
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => putInCache(request, response)))
    );
    return;
  }

  // Diğer dosyalar (ikonlar, manifest): önbellekten ver, arka planda tazele
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() => cached);
      return cached || network;
    })
  );
});
