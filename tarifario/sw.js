/* El tarifario dejó de ser público. Este archivo borra la copia guardada
   en los navegadores que lo habían abierto o instalado, y se desactiva solo. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('tarifario-')).map((k) => caches.delete(k))))
    .then(() => self.registration.unregister())
    .then(() => self.clients.matchAll())
    .then((cs) => cs.forEach((c) => c.navigate('/'))));
});
