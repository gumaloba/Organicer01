// Cuaderno Personal — Service Worker
// Versión de caché — cambia este número para forzar actualización
const CACHE_NAME = 'cuaderno-v1';

// Archivos a cachear en la instalación
const PRECACHE = [
  './cuaderno.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;600;700&display=swap',
];

// INSTALL — precaché de recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache principal (ignora fallos de fuentes externas)
      return cache.addAll(['./cuaderno.html', './manifest.json']).then(() => {
        // Intenta fuentes — si falla no bloquea
        return cache.addAll([
          'https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;600;700&display=swap',
        ]).catch(() => {});
      });
    }).then(() => self.skipWaiting())
  );
});

// ACTIVATE — limpia cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// FETCH — estrategia: Cache First para app shell, Network First para el resto
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo manejamos GET
  if (event.request.method !== 'GET') return;

  // App shell y manifest → cache first, fallback a red
  if (
    event.request.url.includes('cuaderno.html') ||
    event.request.url.includes('manifest.json') ||
    event.request.url.includes('fonts.googleapis.com') ||
    event.request.url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Clonar y guardar en caché
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          // Sin conexión y sin caché → respuesta vacía
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Resto → network first, fallback a caché
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
