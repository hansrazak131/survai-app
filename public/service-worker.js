/* SurvAI Service Worker
   Strategi:
   - HTML                 -> network-first (selalu coba versi terbaru; fallback cache saat offline)
   - Library CDN & font   -> precache saat install + cache-first (siap offline tanpa perlu buka halaman dulu)
   - Aset lokal           -> cache-first (icon, manifest, wasm; ter-cache otomatis saat pertama dipakai)
   - API / tile / data    -> network-first (online = selalu data segar; offline = data terakhir tersimpan)
   - Naikkan CACHE_VERSION setiap deploy agar cache lama dibersihkan.
*/
const CACHE_VERSION = 'survai-v28';

const CORE = [
  './',
  './index.html',
  'manifest.json',
  'assets/app-guard.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'maps.html',
  'gnss-status.html',
  'privasi.html',
  'hapus-akun.html',
  'calculator/advance-survey.html',
  'calculator/basic-survey.html',
  'calculator/bathymetri.html',
  'calculator/cut-fill.html',
  'calculator/hidrocalc.html',
  'calculator/kdh.html',
  'calculator/kdv.html',
  'calculator/konverter.html',
  'calculator/level-jalan.html',
  'calculator/poligon-terbuka.html',
  'calculator/settlement-sensor.html',
  'calculator/survey-verticality.html',
  'calculator/tambang.html',
  'calculator/tide-marine.html',
  'calculator/volume.html',
  'tools/aktivitas-tambang.html',
  'tools/boq-rab.html',
  'tools/cad-engine.html',
  'tools/cbr-lapangan-sand-cone.html',
  'tools/civil-hub.html',
  'tools/drone-mapping.html',
  'tools/drone-spraying.html',
  'tools/drone-spreading.html',
  'tools/foundation-advisor.html',
  'tools/geoai.html',
  'tools/hidrografi-pasut.html',
  'tools/hydro-qc.html',
  'tools/multispectral.html',
  'tools/ocean analysis.html',
  'tools/project-dashboard.html',
  'tools/qc-checklist.html',
  'tools/rtklib-tools.html',
  'tools/schedule-kurva-s.html',
  'tools/sondir-spt-foundation-planner.html',
  'tools/surface_dtm.html',
  'tools/terrain-analysis.html',
  'tools/tools-curve.html',
  'tools/tools-field.html',
  'tools/uav-log-viewer.html',
  'tools/utility-tools.html'
];

/* Semua library pihak-ketiga yang dipakai halaman-halaman di atas.
   Di-precache agar halaman berfungsi offline meski belum pernah dibuka. */
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/delaunator@5.0.1/delaunator.min.js',
  'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js',
  'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/proj4@2.11.0/dist/proj4.js',
  'https://cdn.jsdelivr.net/npm/shpjs@4.0.4/dist/shp.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.2/proj4.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://unpkg.com/geotiff@2.1.3/dist-browser/geotiff.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/mgrs@1.0.0/dist/mgrs.min.js',
  'https://unpkg.com/three@0.128.0/build/three.min.js',
  'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
];

/* Stylesheet Google Fonts yang dipakai halaman-halaman aplikasi. */
const FONT_CSS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300..950&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@500;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Serif:wght@600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Serif:wght@700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;600;700&display=swap'
];

/* Origin yang berisi file statis (library/font) -> aman cache-first selamanya. */
const STATIC_ORIGINS = [
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

/* Simpan satu URL ke cache; pakai no-cors bila fetch biasa ditolak CORS.
   Tidak pernah melempar error agar satu kegagalan tidak menggagalkan install. */
async function cacheUrl(cache, url) {
  try {
    let res = await fetch(url, { credentials: 'omit' }).catch(() => null);
    if (!res || (!res.ok && res.type !== 'opaque')) {
      res = await fetch(url, { mode: 'no-cors', credentials: 'omit' }).catch(() => null);
    }
    if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res.clone());
    return res;
  } catch (_) { return null; }
}

/* Cache stylesheet Google Fonts + seluruh file .woff2 yang dirujuknya. */
async function cacheFontCss(cache, url) {
  const res = await cacheUrl(cache, url);
  if (!res || !res.ok) return;
  try {
    const css = await res.clone().text();
    const woff = css.match(/https:\/\/fonts\.gstatic\.com\/[^)"' ]+/g) || [];
    await Promise.all([...new Set(woff)].map((u) => cacheUrl(cache, u)));
  } catch (_) { /* opaque response: file font akan ter-cache saat pertama dipakai online */ }
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) =>
      Promise.all([
        // addAll gagal jika satu file 404; pakai individual agar tidak menggagalkan seluruh install
        ...CORE.map((url) => c.add(url).catch(() => null)),
        ...CDN_ASSETS.map((url) => cacheUrl(c, url)),
        ...FONT_CSS.map((url) => cacheFontCss(c, url))
      ])
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

/* network-first: online selalu segar, offline pakai salinan terakhir */
function networkFirst(req, fallbackUrl) {
  return fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() =>
      caches.match(req).then((m) => m || (fallbackUrl ? caches.match(fallbackUrl) : undefined))
    );
}

/* cache-first: untuk file statis yang isinya tidak pernah berubah */
function cacheFirst(req) {
  return caches.match(req).then((m) =>
    m || fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    })
  );
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Jangan cache panggilan API backend sendiri (auth/sync/AI)
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(networkFirst(req, 'index.html'));
  } else if (url.origin === self.location.origin || STATIC_ORIGINS.includes(url.origin)) {
    // aset lokal + library/font CDN: cache-first
    e.respondWith(cacheFirst(req));
  } else {
    // API eksternal, tile peta, data live: online = segar, offline = data terakhir
    e.respondWith(networkFirst(req));
  }
});
