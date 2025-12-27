// v9.5.6 - Recall border effect UI + drop animation
const CACHE_NAME = "hacker-tetris-v18.9";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./js/game.js",
  "./js/terminal.js",
  "./js/modules/GameManager.js",
  "./js/modules/TerminalUI.js",
  "./js/modules/TetrisGame.js",
  "./js/modules/DefenseGame.js",
  "./js/modules/PerkManager.js",
  "./js/modules/ConquestManager.js",
  "./js/modules/EquipmentManager.js",
  "./js/modules/StageManager.js",
  "./js/modules/InventoryManager.js",
  "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js",
  "https://fonts.googleapis.com/css2?family=VT323&display=swap",
];

// 설치 시 캐싱
self.addEventListener("install", (e) => {
  console.log("[SW] Installing new version:", CACHE_NAME);
  self.skipWaiting(); // 즉시 활성화
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching assets");
      return cache.addAll(ASSETS).catch((err) => {
        console.error("[SW] Cache addAll failed:", err);
        // 일부 실패해도 계속 진행
      });
    })
  );
});

// 활성화 시 구형 캐시 삭제 및 클라이언트 업데이트 알림
self.addEventListener("activate", (e) => {
  console.log("[SW] Activating:", CACHE_NAME);
  e.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        // 모든 클라이언트에게 업데이트 알림
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "SW_UPDATED",
              version: CACHE_NAME,
            });
          });
        });
      })
  );
  return self.clients.claim();
});

// 네트워크 우선 전략 (업데이트 감지용)
self.addEventListener("fetch", (e) => {
  // HTML 요청은 네트워크 우선, 실패 시 캐시
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // 새 버전 감지: HTML이 변경되었으면 캐시 업데이트
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
  } else {
    // 기타 리소스는 캐시 우선
    e.respondWith(
      caches.match(e.request).then((response) => {
        return (
          response ||
          fetch(e.request).then((fetchResponse) => {
            // 캐시에 저장
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
            return fetchResponse;
          })
        );
      })
    );
  }
});

// 메시지 수신 (클라이언트에서 업데이트 확인 요청)
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
