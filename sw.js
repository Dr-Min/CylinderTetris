// [수정] v7
const CACHE_NAME = 'tetris-3d-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=1.6', // [수정] v1.6
  './game.js?v=1.6',   // [수정] v1.6
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// 설치 시 캐싱
self.addEventListener('install', (e) => {
  // [중요] 대기하지 않고 즉시 활성화 (새 버전 바로 적용)
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 활성화 시 구형 캐시 삭제
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // 모든 탭(클라이언트)에서 즉시 제어권 획득
  return self.clients.claim();
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});

