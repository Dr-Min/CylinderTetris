const CACHE_NAME = 'tetris-3d-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/main.js',
  './js/game.js',
  './js/renderer.js',
  './js/resources.js',
  './js/audio.js',
  './js/constants.js',
  './js/input.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js'
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
