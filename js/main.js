import { GameManager } from "./modules/GameManager.js";

// PWA 업데이트 관리자
class UpdateManager {
    constructor() {
        this.updateAvailable = false;
        this.updateWorker = null;
        this.init();
    }

    init() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("./sw.js", { updateViaCache: "none" })
                .then((reg) => {
                    console.log("[UpdateManager] SW Registered:", reg.scope);

                    // 업데이트 확인 (주기적)
                    setInterval(() => {
                        reg.update();
                    }, 60000); // 1분마다 확인

                    // 업데이트 발견 시
                    reg.addEventListener("updatefound", () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;

                        newWorker.addEventListener("statechange", () => {
                            if (
                                newWorker.state === "installed" &&
                                navigator.serviceWorker.controller
                            ) {
                                // 새 버전 설치 완료
                                this.updateAvailable = true;
                                this.updateWorker = newWorker;
                                this.showUpdateNotification();
                            } else if (newWorker.state === "activated") {
                                // 즉시 활성화됨 (첫 설치)
                                window.location.reload();
                            }
                        });
                    });

                    // Service Worker 메시지 수신
                    navigator.serviceWorker.addEventListener("message", (e) => {
                        if (e.data && e.data.type === "SW_UPDATED") {
                            console.log("[UpdateManager] SW Updated:", e.data.version);
                            this.showUpdateNotification();
                        }
                    });
                })
                .catch((err) => console.error("[UpdateManager] SW Registration Failed:", err));
        }
    }

    showUpdateNotification() {
        // 터미널 스타일 알림 생성
        const notification = document.createElement("div");
        notification.id = "update-notification";
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #33ff00;
            color: #33ff00;
            padding: 15px 25px;
            font-family: var(--term-font);
            font-size: 16px;
            z-index: 10001;
            box-shadow: 0 0 20px rgba(51, 255, 0, 0.5);
            text-align: center;
            max-width: 90%;
        `;
        notification.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">⚠️ UPDATE AVAILABLE ⚠️</div>
            <div style="font-size: 14px; margin-bottom: 15px;">New protocol version detected.</div>
            <button id="update-btn" style="
                background: #33ff00;
                color: #000;
                border: none;
                padding: 10px 20px;
                font-family: var(--term-font);
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                margin-right: 10px;
            ">UPDATE NOW</button>
            <button id="update-later-btn" style="
                background: transparent;
                color: #33ff00;
                border: 1px solid #33ff00;
                padding: 10px 20px;
                font-family: var(--term-font);
                font-size: 14px;
                cursor: pointer;
            ">LATER</button>
        `;

        document.body.appendChild(notification);

        document.getElementById("update-btn").onclick = () => {
            if (this.updateWorker) {
                this.updateWorker.postMessage({ type: "SKIP_WAITING" });
            }
            window.location.reload();
        };

        document.getElementById("update-later-btn").onclick = () => {
            notification.remove();
        };
    }
}

// 모바일 최적화 헬퍼
class MobileOptimizer {
    constructor() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.init();
    }

    init() {
        if (this.isMobile) {
            // 터치 이벤트 최적화
            document.addEventListener("touchstart", (e) => {
                // 더블탭 줌 방지
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });

            // 스크롤 방지 (게임 중)
            let lastTouchY = 0;
            document.addEventListener("touchmove", (e) => {
                const touchY = e.touches[0].clientY;
                const touchYDelta = Math.abs(touchY - lastTouchY);
                if (touchYDelta > 10) {
                    // 큰 스크롤은 허용 (터미널 스크롤용)
                } else {
                    // 작은 움직임은 게임 조작으로 간주
                }
                lastTouchY = touchY;
            }, { passive: true });

            // 모바일 메타 태그 강화
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute("content",
                    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
                );
            }

            // iOS Safari 주소창 숨김
            window.addEventListener("load", () => {
                setTimeout(() => {
                    window.scrollTo(0, 1);
                }, 100);
            });

            // 화면 방향 변경 감지
            window.addEventListener("orientationchange", () => {
                setTimeout(() => {
                    window.scrollTo(0, 1);
                }, 100);
            });
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 버전 표시
    const verEl = document.getElementById("app-version");
    if (verEl) verEl.innerText = "PROTOCOL v2.1.71";

    // 업데이트 관리자 초기화
    const updateManager = new UpdateManager();

    // 모바일 최적화 초기화
    const mobileOptimizer = new MobileOptimizer();

    // 게임 매니저 초기화
    const gameManager = new GameManager();
    window.gameManager = gameManager; // 콘솔에서 접근용

    gameManager.init().catch((err) => {
        console.error("Initialization failed:", err);
    });
});
