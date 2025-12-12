const CACHE_NAME = 'tetris-3d-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// 설치 시 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 네트워크 요청 가로채기 (캐시 우선 사용)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});

