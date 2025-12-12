import { GameManager } from './modules/GameManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // PWA Service Worker 등록
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered:', reg))
            .catch(err => console.log('SW Registration Failed:', err));
    }

    const gameManager = new GameManager();
    gameManager.init().catch(err => {
        console.error("Initialization failed:", err);
    });
});
