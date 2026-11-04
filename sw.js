/* Service worker : garde l'appli en cache pour qu'elle marche hors ligne.
   À CHAQUE MISE À JOUR : changer CACHE_VERSION, sinon les téléphones gardent l'ancienne version.
   Si tu ajoutes un fichier, ajoute-le aussi dans FILES. */

const CACHE_VERSION = 'flashcardz-2.0.0';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'css/home.css',
  'css/editor.css',
  'css/review.css',
  'css/settings.css',
  'js/main.js',
  'js/router.js',
  'js/core/config.js',
  'js/core/ids.js',
  'js/core/leitner.js',
  'js/core/answers.js',
  'js/core/parsing.js',
  'js/core/share-codec.js',
  'js/core/examples.js',
  'js/core/store.js',
  'js/ui/html.js',
  'js/ui/icons.js',
  'js/ui/env.js',
  'js/ui/format.js',
  'js/ui/toast.js',
  'js/ui/dialog.js',
  'js/ui/feedback.js',
  'js/ui/appearance.js',
  'js/ui/files.js',
  'js/ui/swipe.js',
  'js/views/home.js',
  'js/views/deck-menu.js',
  'js/views/editor.js',
  'js/views/start-sheet.js',
  'js/views/review.js',
  'js/views/review-modes.js',
  'js/views/summary.js',
  'js/views/share.js',
  'js/views/import.js',
  'js/views/settings.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

/* Polices Google et bibliothèque QR : mises en cache au premier passage. */
const EXTERNAL = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Réponse immédiate depuis le cache, et mise à jour du cache en arrière-plan. */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !EXTERNAL.includes(url.hostname)) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
