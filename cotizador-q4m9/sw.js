/* Tarifario · modo sin internet
   - La pagina: primero internet (para tener siempre la ultima version), si no hay, la copia guardada.
   - Estilos, scripts, fuentes e iconos: se sirven de la copia y se actualizan en segundo plano.
   - El promedio de la comunidad (Google) nunca pasa por aca: lo guarda la propia pagina. */
const CACHE = 'cotizador-v1';
const BASE = [
  './', 'tarifario.css', 'app.js', 'manifest.webmanifest', 'icono-192.png',
  '../css/styles.css', '../js/main.js', '../img/favicon.svg',
];
const EXTERNOS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('cotizador-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const guardar = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) {
    const copia = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copia));
  }
  return res;
};

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;

  // La pagina del tarifario
  if (req.mode === 'navigate') {
    if (!propio || !url.pathname.startsWith('/cotizador-q4m9')) return;
    ev.respondWith(fetch(req).then((r) => guardar(new Request('./'), r))
      .catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }

  // Archivos propios (css, js, imagenes) y externos conocidos (fuentes e iconos)
  if (propio || EXTERNOS.includes(url.hostname)) {
    // Los archivos propios llevan ?v=huella: una version nueva tiene otra URL y se baja de internet.
    // Sin internet y sin copia exacta, se usa la ultima copia guardada de ese archivo.
    ev.respondWith(caches.match(req).then((enCache) => {
      const red = fetch(req).then((r) => guardar(req, r))
        .catch(() => enCache || caches.match(req, { ignoreSearch: true }));
      return enCache || red;
    }));
  }
});
