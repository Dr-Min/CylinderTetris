// v2.3.2
const CACHE_NAME = "hacker-tetris-v2.3.2";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./js/modules/GameManager.js",
  "./js/modules/TerminalUI.js",
  "./js/modules/TetrisGame.js",
  "./js/modules/DefenseGame.js",
  "./js/modules/BGMManager.js",
  "./js/modules/BossManager.js",
  "./js/modules/PerkManager.js",
  "./js/modules/ConquestManager.js",
  "./js/modules/EquipmentManager.js",
  "./js/modules/StageManager.js",
  "./js/modules/InventoryManager.js",
  "./js/modules/MiningManager.js",
  "./js/modules/ItemDatabase.js",
  "./js/modules/flow/GameFlowMixin.js",
  "./js/modules/tutorial/TutorialDirector.js",
  "./js/modules/upgrade/UpgradeMixin.js",
  "./js/modules/loot/LootMixin.js",
  "./js/modules/persist/PersistenceMixin.js",
  "./js/modules/perks/RunPerkMixin.js",
  "./js/modules/debug/DebugSystem.js",
  "./js/modules/defense/AllyAIMixin.js",
  "./js/modules/defense/EffectsMixin.js",
  "./js/modules/defense/EnemyMixin.js",
  "./js/modules/defense/RenderMixin.js",
  "./js/modules/defense/RoamingProtocolMixin.js",
  "./js/modules/defense/ShieldMixin.js",
  "./js/modules/defense/WaveMixin.js",
  "./js/modules/defense/WeaponInputMixin.js",
  "./js/data/virusDialogues.json",
  "./js/data/facilityDialogues.json",
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
            return Promise.resolve(false);
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
  } else if (/\.(js|css|json)(\?|$)/.test(e.request.url)) {
    // JS/CSS/JSON은 네트워크 우선 — 구버전 캐시와 신버전 HTML이 섞여
    // 게임이 깨지는 혼합 버전 사고 방지. 오프라인이면 캐시 폴백.
    e.respondWith(
      fetch(e.request)
        .then((fetchResponse) => {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
          return fetchResponse;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // 이미지/폰트 등은 캐시 우선
    e.respondWith(
      caches.match(e.request).then((response) => {
        return (
          response ||
          fetch(e.request).then((fetchResponse) => {
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
