// Lets the app open with no internet. It always tries the network first (so updates
// show up straight away) and falls back to the saved copy when offline.
const CACHE = 'beckhams-sounds-v12';
const CORE = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/data.js', 'js/word-credits.js', 'js/sirens.js', 'js/vehicles.js', 'js/app.js', 'js/explore.js',
  'vendor/d3.min.js', 'vendor/topojson-client.min.js', 'vendor/countries-110m.json',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'audio/usa-fire-wail.m4a', 'audio/usa-fire-yelp.m4a', 'audio/germany-fire-martinshorn.m4a', 'audio/germany-police-martinshorn.m4a',
  'audio/france-gendarmerie.m4a', 'audio/france-ambulance-two-tone.m4a', 'audio/france-ambulance-three-tone.m4a',
  'audio/slovenia-police-siren-1.m4a', 'audio/slovenia-police-siren-2.m4a', 'audio/slovenia-police-siren-3.m4a', 'audio/slovenia-police-motorbike.m4a',
  'audio/finland-fire-engine.m4a', 'audio/finland-fire-chief-van.m4a', 'audio/sweden-fire-1958.m4a',
  'audio/netherlands-fire-passing.m4a', 'audio/netherlands-ambulance-passing.m4a', 'audio/netherlands-ambulance-arriving.m4a', 'audio/netherlands-ambulance-horn.m4a',
  // spoken words (Say it like a local)
  'audio/words/en-us-hello.m4a', 'audio/words/en-us-police.m4a', 'audio/words/en-us-ambulance.m4a', 'audio/words/en-us-fire.m4a', 'audio/words/en-uk-hello.m4a', 'audio/words/en-uk-police.m4a',
  'audio/words/en-uk-ambulance.m4a', 'audio/words/en-uk-fire.m4a', 'audio/words/en-au-hello.m4a', 'audio/words/fr-hello.m4a', 'audio/words/fr-police.m4a', 'audio/words/fr-ambulance.m4a',
  'audio/words/fr-fire.m4a', 'audio/words/de-hello.m4a', 'audio/words/de-police.m4a', 'audio/words/de-ambulance.m4a', 'audio/words/de-fire.m4a', 'audio/words/it-hello.m4a',
  'audio/words/it-police.m4a', 'audio/words/it-ambulance.m4a', 'audio/words/it-fire.m4a', 'audio/words/es-hello.m4a', 'audio/words/es-police.m4a', 'audio/words/es-ambulance.m4a',
  'audio/words/es-fire.m4a', 'audio/words/pt-hello.m4a', 'audio/words/pt-police.m4a', 'audio/words/pt-ambulance.m4a', 'audio/words/pt-fire.m4a', 'audio/words/ja-hello.m4a',
  'audio/words/ja-police.m4a', 'audio/words/ja-ambulance.m4a', 'audio/words/ja-fire.m4a', 'audio/words/nl-hello.m4a', 'audio/words/nl-fire.m4a', 'audio/words/nl-ambulance.m4a',
  'audio/words/sv-hello.m4a', 'audio/words/fi-hello.m4a',
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
