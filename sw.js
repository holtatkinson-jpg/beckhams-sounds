// Lets the app open with no internet. It always tries the network first (so updates
// show up straight away) and falls back to the saved copy when offline.
const CACHE = 'beckhams-sounds-v10';
const CORE = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/data.js', 'js/sirens.js', 'js/vehicles.js', 'js/app.js', 'js/explore.js',
  'vendor/d3.min.js', 'vendor/topojson-client.min.js', 'vendor/countries-110m.json',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'audio/usa-fire-wail.m4a', 'audio/usa-fire-yelp.m4a', 'audio/germany-fire-martinshorn.m4a', 'audio/germany-police-martinshorn.m4a',
  'audio/france-gendarmerie.m4a', 'audio/france-ambulance-two-tone.m4a', 'audio/france-ambulance-three-tone.m4a',
  'audio/slovenia-police-siren-1.m4a', 'audio/slovenia-police-siren-2.m4a', 'audio/slovenia-police-siren-3.m4a', 'audio/slovenia-police-motorbike.m4a',
  'audio/finland-fire-engine.m4a', 'audio/finland-fire-chief-van.m4a', 'audio/sweden-fire-1958.m4a',
  'audio/netherlands-fire-passing.m4a', 'audio/netherlands-ambulance-passing.m4a', 'audio/netherlands-ambulance-arriving.m4a', 'audio/netherlands-ambulance-horn.m4a',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(url => new Request(url, { cache: 'no-cache' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }) // always check the server for a newer copy
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')))
  );
});
