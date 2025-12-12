import { CONFIG } from './constants.js';
import { SoundManager } from './audio.js';

export class InputManager {
    constructor(game, renderer) {
        this.game = game;
        this.renderer = renderer;
        
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isSwiping = false;

        this.init();
    }

    init() {
        // Keyboard
        document.addEventListener("keydown", (e) => this.onKeyDown(e));

        // Touch
        document.addEventListener("touchstart", (e) => this.onTouchStart(e), {passive: false});
        document.addEventListener("touchmove", (e) => this.onTouchMove(e), {passive: false});
        document.addEventListener("touchend", (e) => this.onTouchEnd(e));

        // UI Buttons
        document.getElementById("start-btn").addEventListener("click", () => this.game.start());
        document.getElementById("restart-btn").addEventListener("click", () => this.game.start());

        document.getElementById("toggle-btn").addEventListener("click", (e) => {
            CONFIG.TRANSPARENT_MODE = !CONFIG.TRANSPARENT_MODE;
            e.target.innerText = "Transparency: " + (CONFIG.TRANSPARENT_MODE ? "ON" : "OFF");
            this.renderer.toggleTransparency();
            e.target.blur();
        });

        document.getElementById("bgm-btn").addEventListener("click", (e) => {
            const isOn = SoundManager.toggleBGM();
            e.target.innerText = "BGM: " + (isOn ? "ON" : "OFF");
            e.target.blur();
        });

        const dropBtn = document.getElementById("drop-btn");
        dropBtn.addEventListener("touchstart", (e) => {
            e.preventDefault(); 
            if (this.game.state.isPlaying) this.game.hardDrop();
        });
        dropBtn.addEventListener("click", (e) => {
            if (this.game.state.isPlaying) this.game.hardDrop();
            e.target.blur();
        });
    }

    onKeyDown(e) {
        if (!this.game.state.isPlaying) return;
        if (e.key === "ArrowLeft") this.game.moveHorizontal(-1);
        if (e.key === "ArrowRight") this.game.moveHorizontal(1);
        if (e.key === "ArrowUp") this.game.rotatePiece();
        if (e.key === "ArrowDown") this.game.softDrop(); 
        if (e.key === " ") this.game.hardDrop();
    }

    onTouchStart(e) {
        if (!this.game.state.isPlaying) return;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
        this.isSwiping = false;
    }

    onTouchMove(e) {
        if (!this.game.state.isPlaying) return;
        e.preventDefault();
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = touchX - this.touchStartX;
        const diffY = touchY - this.touchStartY; 
        
        if (Math.abs(diffX) > CONFIG.SWIPE_SENSITIVITY) {
            const steps = Math.floor(Math.abs(diffX) / CONFIG.SWIPE_SENSITIVITY);
            if (steps > 0) {
                const moveDir = diffX > 0 ? 1 : -1;
                this.game.moveHorizontal(moveDir);
                this.touchStartX = touchX; 
                this.isSwiping = true;
            }
        }

        if (diffY > CONFIG.SWIPE_SENSITIVITY && diffY > Math.abs(diffX)) {
            this.game.softDrop();
            this.touchStartY = touchY;
            this.isSwiping = true;
        }
    }

    onTouchEnd(e) {
        if (!this.game.state.isPlaying) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const timeDiff = Date.now() - this.touchStartTime;
        const diffY = touchEndY - this.touchStartY;
        const diffX = touchEndX - this.touchStartX;

        if (!this.isSwiping && timeDiff < 300 && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
            this.game.rotatePiece();
        }
    }
}
