import { GameManager } from "./modules/GameManager.js";

document.addEventListener("DOMContentLoaded", () => {
  // PWA Service Worker 등록 및 버전 관리
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        console.log("SW Registered:", reg);

        // 업데이트 발견 시
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          newWorker.onstatechange = () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // 새 버전 설치 완료됨
              if (confirm("New protocol available. Reboot system?")) {
                window.location.reload();
              }
            }
          };
        };
      })
      .catch((err) => console.log("SW Registration Failed:", err));

    // 버전 표시 (캐시 이름에서 버전을 가져올 수 없으므로 sw.js와 일치시켜야 함, 여기서는 하드코딩 혹은 별도 관리)
    // 편의상 UI에 v19 표시
    const verEl = document.getElementById("app-version");
    if (verEl) verEl.innerText = "PROTOCOL v23";
  }

  const gameManager = new GameManager();
  gameManager.init().catch((err) => {
    console.error("Initialization failed:", err);
  });
});
