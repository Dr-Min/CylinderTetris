import { GameRenderer } from './renderer.js';
import { Game } from './game.js';
import { InputManager } from './input.js';

// 메인 엔트리 포인트
document.addEventListener("DOMContentLoaded", () => {
    const renderer = new GameRenderer();
    const game = new Game(renderer);
    const input = new InputManager(game, renderer);
    
    // 글로벌 노출 (디버깅용)
    window.game = game;
});
