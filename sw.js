// v27 - Always Show Upgrade Menu
const CACHE_NAME = "hacker-tetris-v45";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/terminal.css",
  "./js/main.js",
  "./js/modules/GameManager.js",
  "./js/modules/TerminalUI.js",
  "./js/modules/TetrisGame.js",
  "./js/modules/PerkManager.js",
  "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://fonts.googleapis.com/css2?family=VT323&display=swap",
];

// 설치 시 캐싱
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// 활성화 시 구형 캐시 삭제
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Clearing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 네트워크 요청 가로채기
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
