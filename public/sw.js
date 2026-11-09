// Eski YuPPi Notes uygulamasından kalan service worker'ı temizler.
// Tarayıcıda kayıtlı eski worker bu dosyayı güncelleme olarak alır,
// tüm önbellekleri siler, kaydını kaldırır ve açık sekmeleri yeniler.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
