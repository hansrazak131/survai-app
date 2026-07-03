/* SurvAI Service Worker
   Strategi:
   - HTML  -> network-first (selalu coba versi terbaru; hindari file lama tertahan)
   - Aset  -> cache-first (icon, manifest)
   - Naikkan CACHE_VERSION setiap deploy agar cache lama dibersihkan.
*/
const CACHE_VERSION = 'survai-v17';
const CORE = [
  './',
  './index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'maps.html',
  'calculator/basic-survey.html',
  'calculator/cut-fill.html',
  'calculator/tambang.html',
  'calculator/poligon-terbuka.html',
  'calculator/level-jalan.html',
  'calculator/konverter.html',
  'calculator/advance-survey.html',
  'calculator/kdv.html',
  'calculator/kdh.html',
  'calculator/volume.html',
  'calculator/settlement-sensor.html',
  'calculator/survey-verticality.html',
  'tools/utility-tools.html',
  'tools/tools-field.html',
  'tools/tools-curve.html',
  'tools/aktivitas-tambang.html',
  'tools/drone-spraying.html',
  'tools/drone-mapping.html',
  'tools/geoai.html',
  'tools/multispectral.html',
  'tools/drone-spreading.html',
  'tools/hidrografi-pasut.html',
  'tools/hydro-qc.html'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) =>
      // addAll gagal jika satu file 404; pakai individual agar tidak menggagalkan seluruh install
      Promise.all(CORE.map((url) => c.add(url).catch(() => null)))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Jangan cache panggilan API AI
  if (url.pathname.startsWith('/api/')) return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // network-first untuk HTML
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('index.html')))
    );
  } else {
    // cache-first untuk aset
    e.respondWith(
      caches.match(req).then((m) =>
        m || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => m)
      )
    );
  }
});
