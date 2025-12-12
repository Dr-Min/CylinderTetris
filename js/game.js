import { CONFIG, TETROMINOS } from './constants.js';
import { SoundManager } from './audio.js';

export class Game {
    constructor(renderer) {
        this.renderer = renderer;
        this.state = {
            grid: [],
            currentPiece: null,
            nextPiece: null,
            score: 0,
            level: 1,
            linesClearedTotal: 0,
            isPlaying: false,
            dropTimer: 0,
            lastTime: 0,
            cameraAngle: 0,
            targetCameraAngle: 0
        };
        
        this.init();
    }

    init() {
        this.state.grid = Array(CONFIG.GRID_HEIGHT).fill().map(() => Array(CONFIG.GRID_WIDTH).fill(null));
        this.updateScore(0);
        this.updateLevel(1);
    }

    start() {
        SoundManager.init();
        SoundManager.startBGM();
        
        document.getElementById("start-screen").classList.add("hidden");
        document.getElementById("game-over-screen").classList.add("hidden");
        
        this.resetState();
        this.generateNextPiece();
        this.spawnPiece();
        
        this.animate();
    }

    resetState() {
        this.state.grid = Array(CONFIG.GRID_HEIGHT).fill().map(() => Array(CONFIG.GRID_WIDTH).fill(null));
        this.state.score = 0;
        this.state.level = 1;
        this.state.linesClearedTotal = 0;
        this.state.isPlaying = true;
        this.state.dropTimer = 0;
        this.state.nextPiece = null;
        
        this.updateScore(0);
        this.updateLevel(1);
        
        this.renderer.refreshGridVisuals(this.state);
    }

    generateNextPiece() {
        const types = Object.keys(TETROMINOS);
        const type = types[Math.floor(Math.random() * types.length)];
        const template = TETROMINOS[type];
        this.state.nextPiece = {
            type: type,
            shape: template.shape,
            color: template.color
        };
        this.renderer.drawNextPiece(this.state);
    }

    spawnPiece() {
        if (!this.state.nextPiece) this.generateNextPiece();

        const template = this.state.nextPiece;
        
        this.state.currentPiece = {
            type: template.type,
            shape: template.shape,
            color: template.color,
            x: Math.floor(CONFIG.GRID_WIDTH / 2) - Math.floor(template.shape[0].length / 2),
            y: CONFIG.GRID_HEIGHT - 1 - template.shape.length
        };

        this.generateNextPiece();

        if (this.checkCollision(this.state.currentPiece.x, this.state.currentPiece.y, this.state.currentPiece.shape)) {
            this.gameOver();
        }

        const centerAngle = this.calculateAngle(this.state.currentPiece.x + 1);
        this.state.targetCameraAngle = centerAngle;
    }

    calculateAngle(gridX) {
        return (gridX / CONFIG.GRID_WIDTH) * Math.PI * 2;
    }

    getWrapX(x) {
        return (x % CONFIG.GRID_WIDTH + CONFIG.GRID_WIDTH) % CONFIG.GRID_WIDTH;
    }

    checkCollision(px, py, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const testX = this.getWrapX(px + c);
                    const testY = py - r;

                    if (testY < 0) return true;
                    if (testY < CONFIG.GRID_HEIGHT && this.state.grid[testY][testX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    lockPiece() {
        const p = this.state.currentPiece;
        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c]) {
                    const x = this.getWrapX(p.x + c);
                    const y = p.y - r;
                    if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
                        this.state.grid[y][x] = p.color;
                    }
                }
            }
        }
        
        this.renderer.refreshGridVisuals(this.state);
        SoundManager.drop(); 
        this.checkLines();
        this.spawnPiece();
    }

    checkLines() {
        let linesCleared = []; 
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            if (this.state.grid[y].every(cell => cell !== null)) {
                linesCleared.push(y);
            }
        }
        
        if (linesCleared.length > 0) {
            SoundManager.clear();
            linesCleared.forEach(y => this.renderer.createExplosion(y));

            for (let i = linesCleared.length - 1; i >= 0; i--) {
                const y = linesCleared[i];
                this.state.grid.splice(y, 1);
                this.state.grid.push(Array(CONFIG.GRID_WIDTH).fill(null));
            }

            this.renderer.refreshGridVisuals(this.state);
            this.updateScore(this.state.score + (linesCleared.length * 100 * linesCleared.length));
            
            this.state.linesClearedTotal += linesCleared.length;
            const newLevel = Math.floor(this.state.linesClearedTotal / 5) + 1;
            if (newLevel > this.state.level) {
                this.state.level = newLevel;
                this.updateLevel(this.state.level);
                
                const newSpeed = Math.max(100, 800 - (this.state.level - 1) * 50);
                CONFIG.DROP_SPEED = newSpeed;
                
                SoundManager.playTone(800, 'sine', 0.5, 0.1); 
            }
        }
    }

    rotatePiece() {
        const p = this.state.currentPiece;
        const newShape = p.shape[0].map((val, index) => p.shape.map(row => row[index]).reverse());
        
        if (!this.checkCollision(p.x, p.y, newShape)) {
            p.shape = newShape;
            SoundManager.rotate(); 
        } else if (!this.checkCollision(p.x + 1, p.y, newShape)) {
            p.x += 1;
            p.shape = newShape;
            SoundManager.rotate(); 
        } else if (!this.checkCollision(p.x - 1, p.y, newShape)) {
            p.x -= 1;
            p.shape = newShape;
            SoundManager.rotate(); 
        }
    }

    softDrop() {
        if (!this.state.currentPiece) return;
        
        if (!this.checkCollision(this.state.currentPiece.x, this.state.currentPiece.y - 1, this.state.currentPiece.shape)) {
            this.state.currentPiece.y--; 
            this.state.dropTimer = 0;    
        } else {
            this.lockPiece();
        }
    }

    hardDrop() {
        if (!this.state.currentPiece) return;
        while (!this.checkCollision(this.state.currentPiece.x, this.state.currentPiece.y - 1, this.state.currentPiece.shape)) {
            this.state.currentPiece.y--;
        }
        this.lockPiece();
    }

    moveHorizontal(dir) {
        if (!this.checkCollision(this.state.currentPiece.x + dir, this.state.currentPiece.y, this.state.currentPiece.shape)) {
            this.state.currentPiece.x += dir;
            SoundManager.move(); 
        }
    }

    updateScore(newScore) {
        this.state.score = newScore;
        const el = document.getElementById("score");
        if(el) el.innerText = this.state.score;
    }

    updateLevel(lv) {
        const el = document.getElementById("level");
        if(el) el.innerText = lv;
    }

    gameOver() {
        SoundManager.gameOver(); 
        this.state.isPlaying = false;
        document.getElementById("final-score").innerText = this.state.score;
        document.getElementById("game-over-screen").classList.remove("hidden");
    }

    update(time) {
        if (!this.state.isPlaying) return;

        const deltaTime = time - this.state.lastTime;
        this.state.lastTime = time;

        this.state.dropTimer += deltaTime;
        if (this.state.dropTimer > CONFIG.DROP_SPEED) {
            this.state.dropTimer = 0;
            if (!this.checkCollision(this.state.currentPiece.x, this.state.currentPiece.y - 1, this.state.currentPiece.shape)) {
                this.state.currentPiece.y--;
            } else {
                this.lockPiece();
            }
        }
    }

    animate(time = 0) {
        if (!this.state.isPlaying && this.state.lastTime === 0) {
             // First frame
        } else if (!this.state.isPlaying) {
             // Stop loop
             return;
        }
        
        requestAnimationFrame((t) => this.animate(t));
        this.update(time);
        
        // Render
        // Pass bound methods to renderer for helper calculations
        this.renderer.render(this.state, this.checkCollision.bind(this), this.getWrapX.bind(this));
    }
}
