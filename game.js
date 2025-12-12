const CONFIG = {
    GRID_WIDTH: 12, 
    GRID_HEIGHT: 20,
    RADIUS: 5.6,
    DROP_SPEED: 800,
    SWIPE_SENSITIVITY: 30,
    SHOW_GHOST: true, 
    TRANSPARENT_MODE: false, // [수정] 기본값: OFF (불투명)
    COLORS: {
        // [수정] 사이버펑크 네온 컬러 팔레트
        I: 0x00f0ff, // Cyber Cyan
        O: 0xfff000, // Neon Yellow
        T: 0xb026ff, // Electric Purple
        S: 0x39ff14, // Acid Green
        Z: 0xff073a, // Neon Red
        J: 0x0044ff, // Deep Blue
        L: 0xffa500, // Safety Orange -> Neon Orange
        GHOST: 0x222222,
        GRID: 0x111111
    }
};

const ARC_LENGTH = (2 * Math.PI * CONFIG.RADIUS) / CONFIG.GRID_WIDTH;
const CELL_HEIGHT = ARC_LENGTH;
const TOTAL_HEIGHT = CONFIG.GRID_HEIGHT * CELL_HEIGHT;

// [추가] 특수 블록 타입 정의
const SPECIAL_TYPES = {
    NONE: 0,
    BOMB: 1,   // 💣 3x3 폭발
    FREEZE: 2, // ❄️ 속도 저하
    LASER: 3,  // ⚡ 세로 줄 삭제
    GOLD: 4    // 💰 점수 5배
};

// [추가] 아이콘 텍스처 생성기 (이모지를 텍스처로 변환)
const IconTextureManager = {
    textures: {},
    init: function() {
        this.createTexture(SPECIAL_TYPES.BOMB, '💣');
        this.createTexture(SPECIAL_TYPES.FREEZE, '❄️');
        this.createTexture(SPECIAL_TYPES.LASER, '⚡');
        this.createTexture(SPECIAL_TYPES.GOLD, '💰');
    },
    createTexture: function(type, text) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // 배경 (약간 어둡게)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 64, 64);
        
        // 테두리
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 64, 64);

        // 텍스트 (이모지)
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 36);
        
        const texture = new THREE.CanvasTexture(canvas);
        this.textures[type] = texture;
    },
    getTexture: function(type) {
        return this.textures[type];
    }
};

const TETROMINOS = {
    I: { shape: [[1,1,1,1]], color: CONFIG.COLORS.I },
    O: { shape: [[1,1],[1,1]], color: CONFIG.COLORS.O },
    T: { shape: [[0,1,0],[1,1,1]], color: CONFIG.COLORS.T },
    S: { shape: [[0,1,1],[1,1,0]], color: CONFIG.COLORS.S },
    Z: { shape: [[1,1,0],[0,1,1]], color: CONFIG.COLORS.Z },
    J: { shape: [[1,0,0],[1,1,1]], color: CONFIG.COLORS.J },
    L: { shape: [[0,0,1],[1,1,1]], color: CONFIG.COLORS.L }
};

const SoundManager = {
    ctx: null,
    bgmTimer: null,
    isBgmOn: true,
    noteIndex: 0,
    bgmNotes: [
        261.63, 311.13, 392.00, 523.25, 392.00, 311.13, 261.63, 196.00,
        261.63, 311.13, 392.00, 523.25, 392.00, 311.13, 261.63, 196.00,
        261.63, 311.13, 415.30, 523.25, 415.30, 311.13, 261.63, 207.65,
        246.94, 293.66, 392.00, 493.88, 392.00, 293.66, 246.94, 196.00
    ], 

    init: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if(!this.ctx) this.ctx = new AudioContext();
    },
    playTone: function(freq, type, duration, vol = 0.1) {
        if (!this.ctx) this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        
        if (typeof freq === 'object') {
            osc.frequency.setValueAtTime(freq.start, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq.end, this.ctx.currentTime + duration);
        } else {
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        }
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    startBGM: function() {
        if (!this.isBgmOn || this.bgmTimer) return;
        
        const tempo = 250; 
        this.bgmTimer = setInterval(() => {
            if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            
            const freq = this.bgmNotes[this.noteIndex % this.bgmNotes.length];
            const detune = (Math.random() - 0.5) * 5; 
            this.playTone(freq + detune, 'sine', 0.5, 0.03);

            if (this.noteIndex % 8 === 0) {
                let bassFreq = 65.41; 
                const bar = Math.floor((this.noteIndex % 32) / 8);
                if (bar === 2) bassFreq = 51.91;
                if (bar === 3) bassFreq = 49.00;
                
                this.playTone(bassFreq, 'triangle', 2.0, 0.1); 
                 this.playTone(bassFreq * 2, 'triangle', 2.0, 0.05); 
            }
            
            this.noteIndex++;
        }, tempo);
    },
    stopBGM: function() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    },
    toggleBGM: function() {
        this.isBgmOn = !this.isBgmOn;
        if(this.isBgmOn) this.startBGM();
        else this.stopBGM();
        return this.isBgmOn;
    },
    move: function() { this.playTone(300, 'square', 0.1, 0.05); },
    rotate: function() { this.playTone(400, 'sine', 0.15, 0.05); },
    drop: function() { this.playTone(150, 'sawtooth', 0.2, 0.1); }, 
    
    clear: function() { 
        this.playTone({start: 400, end: 50}, 'sawtooth', 0.6, 0.3);
        this.playTone({start: 300, end: 30}, 'square', 0.6, 0.2);
    },
    
    gameOver: function() {
        this.stopBGM(); 
        this.playTone(200, 'sawtooth', 0.5, 0.2);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.5, 0.2), 300);
    }
};

let state = {
    grid: [], // grid[y][x] = { color: ..., type: ... } 객체로 저장
    currentPiece: null,
    nextPiece: null, 
    score: 0,
    level: 1,        
    linesClearedTotal: 0, 
    isPlaying: false,
    dropTimer: 0,
    lastTime: 0,
    cameraAngle: 0,
    targetCameraAngle: 0,
    // [추가] 특수 효과 상태
    slowModeTimer: 0, 
    originalSpeed: 0
};

// [추가] 공용 머티리얼 (특수 블록용)
let specialMaterials = {};
let explosions = [];
let cameraShake = 0;

let scene, camera, renderer;
let worldGroup, piecesGroup, ghostGroup, particleSystem;
let occluderCylinder;

// [최적화] 자원 재사용을 위한 변수
let sharedGeometry;
let sharedMaterials = {}; 

function initThree() {
    const container = document.getElementById("game-container");
    
    // [추가] 2D 캔버스 초기화
    const canvas = document.getElementById("next-canvas");
    nextCtx = canvas.getContext("2d");
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.002);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, TOTAL_HEIGHT / 2, CONFIG.RADIUS + 100); 
    camera.lookAt(0, TOTAL_HEIGHT / 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // [최적화] 모바일 부하 방지를 위해 픽셀 비율 제한 (최대 1.5)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
    container.appendChild(renderer.domElement);

    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    effectGroup = new THREE.Group();
    scene.add(effectGroup);

    piecesGroup = new THREE.Group();
    worldGroup.add(piecesGroup);

    ghostGroup = new THREE.Group();
    worldGroup.add(ghostGroup);

    const ambientLight = new THREE.AmbientLight(0x404040, 3.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
    frontLight.position.set(0, 50, 100);
    scene.add(frontLight);

    const pointLight = new THREE.PointLight(0xff00ff, 0.5, 50);
    pointLight.position.set(0, 0, CONFIG.RADIUS + 5);
    scene.add(pointLight);

    createStarfield();
    createCylinderGrid();
    createOccluder();
    
    // [추가] 아이콘 텍스처 초기화
    IconTextureManager.init();

    // [최적화] 공용 지오메트리 및 머티리얼 미리 생성 (1회만)
    // 원기둥 둘레에 맞춰 블록 너비 계산
    const circumference = 2 * Math.PI * CONFIG.RADIUS; 
    const cellArcLength = circumference / CONFIG.GRID_WIDTH; 
    const blockWidth = cellArcLength * 0.92; 
    const blockHeight = CELL_HEIGHT * 0.92; 

    sharedGeometry = new THREE.BoxGeometry(blockWidth, blockHeight, 0.5);

    // 색상별 머티리얼 생성
    const colorKeys = Object.keys(CONFIG.COLORS);
    colorKeys.forEach(key => {
        const color = CONFIG.COLORS[key];
        // 일반 블록용
        sharedMaterials[color] = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 1.0, 
            roughness: 0.2,
            metalness: 0.1
        });
        // 고스트용 (투명)
        sharedMaterials[color + '_ghost'] = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.3, 
            roughness: 0.2,
            metalness: 0.1
        });
        // 반투명 모드용
        sharedMaterials[color + '_trans'] = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9, 
            roughness: 0.2,
            metalness: 0.1
        });
    });
    
    // [추가] 특수 블록 머티리얼 생성
    Object.keys(SPECIAL_TYPES).forEach(key => {
        const type = SPECIAL_TYPES[key];
        if (type === SPECIAL_TYPES.NONE) return;
        
        specialMaterials[type] = new THREE.MeshStandardMaterial({
            map: IconTextureManager.getTexture(type),
            transparent: true,
            emissive: 0xffffff,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.1
        });
    });

    window.addEventListener("resize", onWindowResize, false);
}

function createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000; // [최적화] 2000 -> 1000 (메모리 절약)
    const posArray = new Float32Array(starCount * 3);
    
    for(let i=0; i<starCount*3; i++) {
        posArray[i] = (Math.random() - 0.5) * 400; 
    }
    
    starGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        transparent: true
    });
    particleSystem = new THREE.Points(starGeo, starMat);
    scene.add(particleSystem);
}

function createCylinderGrid() {
    const material = new THREE.LineBasicMaterial({ color: 0x333333, opacity: 0.3, transparent: true });
    
    for (let i = 0; i < CONFIG.GRID_WIDTH; i++) {
        const angle = (i / CONFIG.GRID_WIDTH) * Math.PI * 2;
        const x = Math.sin(angle) * (CONFIG.RADIUS - 0.1);
        const z = Math.cos(angle) * (CONFIG.RADIUS - 0.1);
        
        const points = [];
        points.push(new THREE.Vector3(x, 0, z));
        points.push(new THREE.Vector3(x, TOTAL_HEIGHT, z));
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        worldGroup.add(line);
    }

    for (let y = 0; y <= CONFIG.GRID_HEIGHT; y++) {
        const curve = new THREE.EllipseCurve(
            0, 0,
            CONFIG.RADIUS - 0.1, CONFIG.RADIUS - 0.1,
            0,  2 * Math.PI,
            false,
            0
        );
        
        const points = curve.getPoints(CONFIG.GRID_WIDTH * 2);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, y * CELL_HEIGHT, 0);
        
        // [추가] 데드라인 (맨 위쪽 라인) 강조
        let ringMat = material;
        if (y === CONFIG.GRID_HEIGHT) {
            // 붉은색 네온 데드라인
            ringMat = new THREE.LineBasicMaterial({ color: 0xff0033, linewidth: 2 });
        }
        
        const ring = new THREE.Line(geometry, ringMat);
        worldGroup.add(ring);
    }
}

function createOccluder() {
    if (occluderCylinder) worldGroup.remove(occluderCylinder);
    const r = CONFIG.RADIUS - 0.1; 
    const geometry = new THREE.CylinderGeometry(r, r, TOTAL_HEIGHT, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x050510 });
    occluderCylinder = new THREE.Mesh(geometry, material);
    occluderCylinder.position.y = TOTAL_HEIGHT / 2;
    occluderCylinder.visible = !CONFIG.TRANSPARENT_MODE;
    occluderCylinder.renderOrder = -1; 
    worldGroup.add(occluderCylinder);
}

function createExplosion(gridY) {
    const yPos = gridY * CELL_HEIGHT;
    const particleCount = 60; 
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    
    for(let i=0; i<particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = CONFIG.RADIUS;
        const x = Math.sin(angle) * r;
        const z = Math.cos(angle) * r;
        const y = yPos + (Math.random() - 0.5) * CELL_HEIGHT;
        
        positions.push(x, y, z);
        
        const speed = 0.2 + Math.random() * 0.3;
        velocities.push(Math.sin(angle) * speed, (Math.random()-0.5) * 0.5, Math.cos(angle) * speed);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xffffff, 
        size: 0.8,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    particles.userData = { velocities: velocities, life: 1.0 };
    effectGroup.add(particles);
    explosions.push(particles);
    
    cameraShake = 0.8;
}

function initGame() {
    state.grid = Array(CONFIG.GRID_HEIGHT).fill().map(() => Array(CONFIG.GRID_WIDTH).fill(null));
    state.score = 0;
    state.level = 1;
    state.linesClearedTotal = 0;
    state.isPlaying = true;
    state.dropTimer = 0;
    state.nextPiece = null; 
    state.slowModeTimer = 0; // 초기화
    
    updateScore(0);
    updateLevel(1);
    
    piecesGroup.clear();
    
    // 첫 블록 생성 전 nextPiece 미리 채우기
    generateNextPiece();
    spawnPiece();
    
    animate();
}

function generateNextPiece() {
    const types = Object.keys(TETROMINOS);
    const type = types[Math.floor(Math.random() * types.length)];
    const template = TETROMINOS[type];
    
    // [추가] 특수 블록 확률 (20%)
    let specialType = SPECIAL_TYPES.NONE;
    let specialIndex = -1; // 블록 4칸 중 몇 번째 칸이 특수인지
    
    if (Math.random() < 0.2) {
        // 랜덤 특수 효과 선택 (1~4)
        const keys = Object.keys(SPECIAL_TYPES);
        const randomKey = keys[Math.floor(Math.random() * (keys.length - 1)) + 1]; // NONE 제외
        specialType = SPECIAL_TYPES[randomKey];
        // 블록 칸 중 하나 선택 (0~3)
        specialIndex = Math.floor(Math.random() * 4);
    }

    state.nextPiece = {
        type: type,
        shape: template.shape,
        color: template.color,
        specialType: specialType, // [추가]
        specialIndex: specialIndex // [추가]
    };
    drawNextPiece();
}

function spawnPiece() {
    if (!state.nextPiece) generateNextPiece();

    const template = state.nextPiece;
    
    state.currentPiece = {
        type: template.type,
        shape: template.shape,
        color: template.color,
        x: Math.floor(CONFIG.GRID_WIDTH / 2) - Math.floor(template.shape[0].length / 2),
        y: CONFIG.GRID_HEIGHT - 1 - template.shape.length,
        specialType: template.specialType, // [추가]
        specialIndex: template.specialIndex // [추가]
    };

    generateNextPiece();

    if (checkCollision(state.currentPiece.x, state.currentPiece.y, state.currentPiece.shape)) {
        gameOver();
    }

    const centerAngle = calculateAngle(state.currentPiece.x + 1);
    state.targetCameraAngle = centerAngle;
}

function drawNextPiece() {
    if (!nextCtx || !state.nextPiece) return;
    
    const ctx = nextCtx;
    const shape = state.nextPiece.shape;
    const color = state.nextPiece.color;
    const specialType = state.nextPiece.specialType;
    const specialIndex = state.nextPiece.specialIndex;
    
    const blockSize = 12; 
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const offsetX = (ctx.canvas.width - shape[0].length * blockSize) / 2;
    const offsetY = (ctx.canvas.height - shape.length * blockSize) / 2;
    
    let blockCount = 0;
    
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                // 특수 블록 표시
                if (blockCount === specialIndex && specialType !== SPECIAL_TYPES.NONE) {
                    ctx.fillStyle = '#ffffff'; // 특수는 흰색으로 강조
                } else {
                    ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
                }
                ctx.fillRect(offsetX + c * blockSize, offsetY + r * blockSize, blockSize - 1, blockSize - 1);
                blockCount++;
            }
        }
    }
}

function calculateAngle(gridX) {
    return (gridX / CONFIG.GRID_WIDTH) * Math.PI * 2;
}

function getWrapX(x) {
    return (x % CONFIG.GRID_WIDTH + CONFIG.GRID_WIDTH) % CONFIG.GRID_WIDTH;
}

function checkCollision(px, py, shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const testX = getWrapX(px + c);
                const testY = py - r;

                if (testY < 0) return true;
                if (testY < CONFIG.GRID_HEIGHT && state.grid[testY][testX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function lockPiece() {
    const p = state.currentPiece;
    let blockCount = 0; // 블록 인덱스 카운터
    
    for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
            if (p.shape[r][c]) {
                const x = getWrapX(p.x + c);
                const y = p.y - r;
                
                // 특수 블록인지 확인
                let blockType = SPECIAL_TYPES.NONE;
                if (blockCount === p.specialIndex) {
                    blockType = p.specialType;
                }
                
                if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
                    // [수정] 그리드에 색상과 타입을 함께 저장
                    state.grid[y][x] = { color: p.color, type: blockType };
                    addBlockToGroup(x, y, state.grid[y][x], piecesGroup);
                }
                blockCount++;
            }
        }
    }
    SoundManager.drop(); 
    checkLines();
    spawnPiece();
}

function checkLines() {
    let linesCleared = []; 
    let specialEffects = []; // 발동된 특수 효과들

    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        // [수정] null 체크 방식 변경 (객체이므로)
        if (state.grid[y].every(cell => cell !== null)) {
            linesCleared.push(y);
            
            // [추가] 줄에 포함된 특수 블록 찾기
            state.grid[y].forEach((cell, x) => {
                if (cell.type !== SPECIAL_TYPES.NONE) {
                    specialEffects.push({ type: cell.type, x: x, y: y });
                }
            });
        }
    }
    
    if (linesCleared.length > 0) {
        SoundManager.clear();
        linesCleared.forEach(y => createExplosion(y));

        // [추가] 특수 효과 실행
        specialEffects.forEach(effect => {
            if (effect.type === SPECIAL_TYPES.BOMB) {
                // 💣 폭탄: 3x3 범위 제거 (grid에서 null로 만듦)
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const targetY = effect.y + dy;
                        // X는 랩어라운드 처리
                        const targetX = getWrapX(effect.x + dx);
                        if (targetY >= 0 && targetY < CONFIG.GRID_HEIGHT) {
                            state.grid[targetY][targetX] = null;
                            createExplosion(targetY); // 폭발 이펙트 추가
                        }
                    }
                }
                SoundManager.playTone(100, 'sawtooth', 0.5, 0.5); // 폭발음
            }
            else if (effect.type === SPECIAL_TYPES.LASER) {
                // ⚡ 레이저: 세로 줄 삭제
                for (let ly = 0; ly < CONFIG.GRID_HEIGHT; ly++) {
                    state.grid[ly][effect.x] = null;
                }
                createExplosion(effect.y);
                SoundManager.playTone(800, 'square', 0.3, 0.2); // 쓩~
            }
            else if (effect.type === SPECIAL_TYPES.FREEZE) {
                // ❄️ 시간 정지: 5초간 슬로우 모션
                state.slowModeTimer = 5000;
                // 기존 속도 저장 (없으면 현재값)
                if(!state.originalSpeed) state.originalSpeed = CONFIG.DROP_SPEED;
                CONFIG.DROP_SPEED = 2000; // 아주 느리게
                document.getElementById("ui-layer").style.border = "2px solid #00ffff"; // 시각 효과
                setTimeout(() => {
                    CONFIG.DROP_SPEED = state.originalSpeed || 800;
                    document.getElementById("ui-layer").style.border = "none";
                    state.slowModeTimer = 0;
                }, 5000);
                SoundManager.playTone(1200, 'sine', 1.0, 0.1); 
            }
            else if (effect.type === SPECIAL_TYPES.GOLD) {
                // 💰 골드: 점수 5배
                state.score += 5000;
                SoundManager.playTone(1500, 'triangle', 0.5, 0.2); // 띠링!
            }
        });

        // 라인 삭제 및 정렬 (특수 효과로 인해 구멍이 숭숭 뚫릴 수 있으므로 재정렬 로직 필요할 수 있음)
        // 여기서는 기본 라인 삭제 로직을 따르되, 폭탄 등으로 이미 지워진 칸은 null로 처리됨
        
        // 간소화된 중력 적용 (단순 라인 삭제만으로는 폭탄 구멍이 안 메워질 수 있음)
        // 일단은 기존 라인 삭제 로직 수행
        for (let i = linesCleared.length - 1; i >= 0; i--) {
            const y = linesCleared[i];
            state.grid.splice(y, 1);
            state.grid.push(Array(CONFIG.GRID_WIDTH).fill(null));
        }

        refreshGridVisuals();
        updateScore(state.score + (linesCleared.length * 100 * linesCleared.length));
        
        // 레벨업 로직
        state.linesClearedTotal += linesCleared.length;
        const newLevel = Math.floor(state.linesClearedTotal / 5) + 1; 
        if (newLevel > state.level) {
            state.level = newLevel;
            updateLevel(state.level);
            // 슬로우 모드가 아닐 때만 속도 갱신
            const newSpeed = Math.max(100, 800 - (state.level - 1) * 50);
            if (state.slowModeTimer <= 0) {
                CONFIG.DROP_SPEED = newSpeed;
            }
            state.originalSpeed = newSpeed; // 원래 속도 업데이트
            SoundManager.playTone(800, 'sine', 0.5, 0.1); 
        }
    }
}

function refreshGridVisuals() {
    piecesGroup.clear();
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            // [수정] null 체크
            if (state.grid[y][x] !== null) {
                addBlockToGroup(x, y, state.grid[y][x], piecesGroup);
            }
        }
    }
}

function rotatePiece() {
    const p = state.currentPiece;
    const newShape = p.shape[0].map((val, index) => p.shape.map(row => row[index]).reverse());
    
    if (!checkCollision(p.x, p.y, newShape)) {
        p.shape = newShape;
        SoundManager.rotate(); 
    } else if (!checkCollision(p.x + 1, p.y, newShape)) {
        p.x += 1;
        p.shape = newShape;
        SoundManager.rotate(); 
    } else if (!checkCollision(p.x - 1, p.y, newShape)) {
        p.x -= 1;
        p.shape = newShape;
        SoundManager.rotate(); 
    }
}

function softDrop() {
    if (!state.currentPiece) return;
    
    if (!checkCollision(state.currentPiece.x, state.currentPiece.y - 1, state.currentPiece.shape)) {
        state.currentPiece.y--; 
        state.dropTimer = 0;    
    } else {
        lockPiece();
    }
}

function hardDrop() {
    while (!checkCollision(state.currentPiece.x, state.currentPiece.y - 1, state.currentPiece.shape)) {
        state.currentPiece.y--;
    }
    lockPiece();
}

function moveHorizontal(dir) {
    if (!checkCollision(state.currentPiece.x + dir, state.currentPiece.y, state.currentPiece.shape)) {
        state.currentPiece.x += dir;
        SoundManager.move(); 
    }
}

function getCylinderPosition(gridX, gridY) {
    const angle = (gridX / CONFIG.GRID_WIDTH) * Math.PI * 2;
    const r = CONFIG.RADIUS;
    
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r;
    const y = gridY * CELL_HEIGHT;

    return { x, y, z, rotationY: angle };
}

// [수정] addBlockToGroup: 특수 블록 렌더링 지원
// 이제 color 인자는 { color: ..., type: ... } 객체이거나 단순 color 값일 수 있음
function addBlockToGroup(gx, gy, blockInfo, group, isGhost = false) {
    const pos = getCylinderPosition(gx, gy);
    
    let color = blockInfo;
    let type = SPECIAL_TYPES.NONE;
    
    // blockInfo가 객체인 경우 (그리드에 저장된 정보)
    if (typeof blockInfo === 'object' && blockInfo !== null && blockInfo.color) {
        color = blockInfo.color;
        type = blockInfo.type || SPECIAL_TYPES.NONE;
    }
    
    // [최적화] 매번 new 하지 않고 공유 자원 사용
    let mat;
    
    if (isGhost) {
        mat = sharedMaterials[color + '_ghost'];
    } else if (type !== SPECIAL_TYPES.NONE) {
        // [추가] 특수 블록은 전용 머티리얼 사용
        mat = specialMaterials[type];
    } else {
        mat = CONFIG.TRANSPARENT_MODE ? sharedMaterials[color + '_trans'] : sharedMaterials[color];
    }
    
    // 안전장치
    if (!mat) mat = sharedMaterials[Object.keys(CONFIG.COLORS)[0]]; // 기본값

    // Geometry도 재사용
    const mesh = new THREE.Mesh(sharedGeometry, mat);
    
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.rotation.y = pos.rotationY;
    mesh.lookAt(new THREE.Vector3(pos.x * 2, pos.y, pos.z * 2));

    group.add(mesh);
}

function renderActivePiece() {
    const activeGroupName = "active_piece_visuals";
    let activeGroup = worldGroup.getObjectByName(activeGroupName);
    if (activeGroup) {
        worldGroup.remove(activeGroup);
    }
    
    activeGroup = new THREE.Group();
    activeGroup.name = activeGroupName;
    worldGroup.add(activeGroup);

    if (!state.currentPiece) return;

    if (CONFIG.SHOW_GHOST) {
        let ghostY = state.currentPiece.y;
        while (!checkCollision(state.currentPiece.x, ghostY - 1, state.currentPiece.shape)) {
            ghostY--;
        }
        
        const p = state.currentPiece;
        
        for (let r = 0; r < p.shape.length; r++) {
            for (let c = 0; c < p.shape[r].length; c++) {
                if (p.shape[r][c]) {
                    const gx = getWrapX(p.x + c);
                    const gy = ghostY - r;
                    addBlockToGroup(gx, gy, p.color, activeGroup, true);
                }
            }
        }
    }

    const p = state.currentPiece;
    let blockCount = 0;
    
    for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
            if (p.shape[r][c]) {
                const gx = getWrapX(p.x + c);
                const gy = p.y - r;
                
                // [수정] 특수 블록 렌더링
                let blockType = SPECIAL_TYPES.NONE;
                if (blockCount === p.specialIndex) {
                    blockType = p.specialType;
                }
                
                // addBlockToGroup에 타입 전달
                addBlockToGroup(gx, gy, { color: p.color, type: blockType }, activeGroup, false);
                blockCount++;
            }
        }
    }
}

function updateCamera() {
    if (!state.currentPiece) return;

    const pieceCenterOffset = state.currentPiece.shape[0].length / 2;
    const target = ((state.currentPiece.x + pieceCenterOffset) / CONFIG.GRID_WIDTH) * Math.PI * 2;
    
    state.cameraAngle += (target - state.cameraAngle) * 0.1;

    const camDist = CONFIG.RADIUS + 100; 
    camera.position.x = Math.sin(state.cameraAngle) * camDist;
    camera.position.z = Math.cos(state.cameraAngle) * camDist;
    
    if (cameraShake > 0) {
        camera.position.x += (Math.random() - 0.5) * cameraShake;
        camera.position.y += (Math.random() - 0.5) * cameraShake;
        camera.position.z += (Math.random() - 0.5) * cameraShake;
    }

    camera.lookAt(0, TOTAL_HEIGHT / 2, 0);
}

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isSwiping = false;
let isControlPressed = false; // [추가] 버튼 조작 중인지 확인하는 플래그

document.addEventListener("touchstart", e => {
    // 버튼 위에서 시작된 터치라면 무시 (e.target이 버튼인지 확인)
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        isControlPressed = true;
        return;
    }
    
    if (!state.isPlaying) return;
    isControlPressed = false;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isSwiping = false;
}, {passive: false});

document.addEventListener("touchmove", e => {
    if (isControlPressed) return; // 버튼 조작 중이면 무시
    if (!state.isPlaying) return;
    e.preventDefault();
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY; 
    
    if (Math.abs(diffX) > CONFIG.SWIPE_SENSITIVITY) {
        const steps = Math.floor(Math.abs(diffX) / CONFIG.SWIPE_SENSITIVITY);
        if (steps > 0) {
            const moveDir = diffX > 0 ? 1 : -1;
            moveHorizontal(moveDir);
            touchStartX = touchX; 
            isSwiping = true;
        }
    }

    if (diffY > CONFIG.SWIPE_SENSITIVITY && diffY > Math.abs(diffX)) {
        softDrop();
        touchStartY = touchY;
        isSwiping = true;
    }
}, {passive: false});

document.addEventListener("touchend", e => {
    // 버튼 조작이었으면 회전 로직 스킵하고 플래그 초기화
    if (isControlPressed) {
        isControlPressed = false;
        return;
    }

    if (!state.isPlaying) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const timeDiff = Date.now() - touchStartTime;
    const diffY = touchEndY - touchStartY;
    const diffX = touchEndX - touchStartX;

    if (!isSwiping && timeDiff < 300 && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
        rotatePiece();
    }
});

document.addEventListener("keydown", e => {
    if (!state.isPlaying) return;
    if (e.key === "ArrowLeft") moveHorizontal(-1);
    if (e.key === "ArrowRight") moveHorizontal(1);
    if (e.key === "ArrowUp") rotatePiece();
    if (e.key === "ArrowDown") softDrop(); 
    if (e.key === " ") hardDrop();
});

function update(time) {
    if (!state.isPlaying) return;

    const deltaTime = time - state.lastTime;
    state.lastTime = time;

    for(let i=explosions.length-1; i>=0; i--) {
        const p = explosions[i];
        p.userData.life -= 0.03; 
        if(p.userData.life <= 0) {
            // [중요] 메모리 해제 (WebGL Context Lost 방지)
            p.geometry.dispose();
            p.material.dispose();
            effectGroup.remove(p);
            explosions.splice(i, 1);
            continue;
        }
        
        p.material.opacity = p.userData.life;
        const positions = p.geometry.attributes.position.array;
        const vels = p.userData.velocities;
        
        for(let j=0; j<positions.length/3; j++) {
            positions[j*3] += vels[j*3];
            positions[j*3+1] += vels[j*3+1];
            positions[j*3+2] += vels[j*3+2];
        }
        p.geometry.attributes.position.needsUpdate = true;
    }

    if(cameraShake > 0) {
        cameraShake *= 0.9;
        if(cameraShake < 0.05) cameraShake = 0;
    }

    state.dropTimer += deltaTime;
    if (state.dropTimer > CONFIG.DROP_SPEED) {
        state.dropTimer = 0;
        if (!checkCollision(state.currentPiece.x, state.currentPiece.y - 1, state.currentPiece.shape)) {
            state.currentPiece.y--;
        } else {
            lockPiece();
        }
    }

    if(particleSystem) {
        particleSystem.rotation.y += 0.0005;
    }
}

function animate(time = 0) {
    if (!state.isPlaying) return;
    
    requestAnimationFrame(animate);
    update(time);
    updateCamera();
    renderActivePiece();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateScore(newScore) {
    state.score = newScore;
    document.getElementById("score").innerText = state.score;
}

function gameOver() {
    SoundManager.gameOver(); 
    state.isPlaying = false;
    document.getElementById("final-score").innerText = state.score;
    document.getElementById("game-over-screen").classList.remove("hidden");
}

document.getElementById("start-btn").addEventListener("click", () => {
    SoundManager.init(); 
    SoundManager.startBGM(); 
    document.getElementById("start-screen").classList.add("hidden");
    initGame();
});

document.getElementById("restart-btn").addEventListener("click", () => {
    document.getElementById("game-over-screen").classList.add("hidden");
    initGame();
});

// [추가] 공통: 버튼 터치 시 게임 조작(회전 등) 방지
function stopPropagation(e) {
    e.stopPropagation();
}

// [수정] touchstart/click 대신 pointerdown 하나로 통합 (중복 입력 및 씹힘 방지)
document.getElementById("toggle-btn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    CONFIG.TRANSPARENT_MODE = !CONFIG.TRANSPARENT_MODE;
    e.target.innerHTML = "VIEW<br>" + (CONFIG.TRANSPARENT_MODE ? "ON" : "OFF");
    
    if(occluderCylinder) {
        occluderCylinder.visible = !CONFIG.TRANSPARENT_MODE;
    }
    // 포커스 해제 (키보드 간섭 방지)
    e.target.blur();
});

document.getElementById("bgm-btn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOn = SoundManager.toggleBGM();
    e.target.innerHTML = "BGM<br>" + (isOn ? "ON" : "OFF");
    e.target.blur();
});

const dropBtn = document.getElementById("drop-btn");
dropBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    if (state.isPlaying) hardDrop();
    e.target.blur();
});

// [추가] 초기 텍스트 설정 (짧게)
// 기본값이 OFF이므로 텍스트도 OFF로 시작
document.getElementById("toggle-btn").innerHTML = "VIEW<br>OFF";
document.getElementById("bgm-btn").innerHTML = "BGM<br>ON";

// 좌우 이동 버튼 이벤트 (pointerdown으로 통합)
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");

leftBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if(state.isPlaying) moveHorizontal(-1);
    e.target.blur();
});

rightBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if(state.isPlaying) moveHorizontal(1);
    e.target.blur();
});

initThree();
renderer.render(scene, camera);

