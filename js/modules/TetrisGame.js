import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js";

export class TetrisGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // Configuration
    this.CONFIG = {
      GRID_WIDTH: 12,
      GRID_HEIGHT: 20,
      RADIUS: 5.6,
      DROP_SPEED: 800,
      SWIPE_SENSITIVITY: 30,
      SHOW_GHOST: true,
      TRANSPARENT_MODE: false,
      COLORS: {
        I: 0x00f0ff,
        O: 0xfff000,
        T: 0xb026ff,
        S: 0x39ff14,
        Z: 0xff073a,
        J: 0x0044ff,
        L: 0xffa500,
        GHOST: 0x222222,
        GRID: 0x111111,
      },
    };

    this.SPECIAL_TYPES = {
      NONE: 0,
      BOMB: 1,
      FREEZE: 2,
      LASER: 3,
      GOLD: 4,
    };

    this.TETROMINOS = {
      I: { shape: [[1, 1, 1, 1]], color: this.CONFIG.COLORS.I },
      O: {
        shape: [
          [1, 1],
          [1, 1],
        ],
        color: this.CONFIG.COLORS.O,
      },
      T: {
        shape: [
          [0, 1, 0],
          [1, 1, 1],
        ],
        color: this.CONFIG.COLORS.T,
      },
      S: {
        shape: [
          [0, 1, 1],
          [1, 1, 0],
        ],
        color: this.CONFIG.COLORS.S,
      },
      Z: {
        shape: [
          [1, 1, 0],
          [0, 1, 1],
        ],
        color: this.CONFIG.COLORS.Z,
      },
      J: {
        shape: [
          [1, 0, 0],
          [1, 1, 1],
        ],
        color: this.CONFIG.COLORS.J,
      },
      L: {
        shape: [
          [0, 0, 1],
          [1, 1, 1],
        ],
        color: this.CONFIG.COLORS.L,
      },
    };

    // State
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
      targetCameraAngle: 0,
      slowModeTimer: 0,
      originalSpeed: 0,
    };

    // Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.worldGroup = null;
    this.piecesGroup = null;
    this.ghostGroup = null;
    this.effectGroup = null;
    this.particleSystem = null;
    this.occluderCylinder = null;

    // Materials & Geometry
    this.sharedGeometry = null;
    this.sharedMaterials = {};
    this.specialMaterials = {};
    this.explosions = [];
    this.cameraShake = 0;

    // 2D Context for Next Piece
    this.nextCtx = null;
    const nextCanvas = document.getElementById("next-canvas");
    if (nextCanvas) {
      this.nextCtx = nextCanvas.getContext("2d");
    }

    this.SoundManager = this.createSoundManager();
  }

  createSoundManager() {
    return {
      ctx: null,
      bgmTimer: null,
      isBgmOn: true,
      noteIndex: 0,
      bgmNotes: [
        261.63, 311.13, 392.0, 523.25, 392.0, 311.13, 261.63, 196.0, 261.63,
        311.13, 392.0, 523.25, 392.0, 311.13, 261.63, 196.0, 261.63, 311.13,
        415.3, 523.25, 415.3, 311.13, 261.63, 207.65, 246.94, 293.66, 392.0,
        493.88, 392.0, 293.66, 246.94, 196.0,
      ],

      init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.ctx) this.ctx = new AudioContext();
      },
      playTone: function (freq, type, duration, vol = 0.1) {
        if (!this.ctx) this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;

        if (typeof freq === "object") {
          osc.frequency.setValueAtTime(freq.start, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            freq.end,
            this.ctx.currentTime + duration
          );
        } else {
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          this.ctx.currentTime + duration
        );

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      },
      startBGM: function () {
        if (!this.isBgmOn || this.bgmTimer) return;

        const tempo = 250;
        this.bgmTimer = setInterval(() => {
          if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();

          const freq = this.bgmNotes[this.noteIndex % this.bgmNotes.length];
          const detune = (Math.random() - 0.5) * 5;
          this.playTone(freq + detune, "sine", 0.5, 0.03);

          if (this.noteIndex % 8 === 0) {
            let bassFreq = 65.41;
            const bar = Math.floor((this.noteIndex % 32) / 8);
            if (bar === 2) bassFreq = 51.91;
            if (bar === 3) bassFreq = 49.0;

            this.playTone(bassFreq, "triangle", 2.0, 0.1);
            this.playTone(bassFreq * 2, "triangle", 2.0, 0.05);
          }

          this.noteIndex++;
        }, tempo);
      },
      stopBGM: function () {
        if (this.bgmTimer) {
          clearInterval(this.bgmTimer);
          this.bgmTimer = null;
        }
      },
      toggleBGM: function () {
        this.isBgmOn = !this.isBgmOn;
        if (this.isBgmOn) this.startBGM();
        else this.stopBGM();
        return this.isBgmOn;
      },
      move: function () {
        this.playTone(300, "square", 0.1, 0.05);
      },
      rotate: function () {
        this.playTone(400, "sine", 0.15, 0.05);
      },
      drop: function () {
        this.playTone(150, "sawtooth", 0.2, 0.1);
      },

      clear: function () {
        this.playTone({ start: 400, end: 50 }, "sawtooth", 0.6, 0.3);
        this.playTone({ start: 300, end: 30 }, "square", 0.6, 0.2);
      },

      gameOver: function () {
        this.stopBGM();
        this.playTone(200, "sawtooth", 0.5, 0.2);
        setTimeout(() => this.playTone(150, "sawtooth", 0.5, 0.2), 300);
      },
    };
  }

  init() {
    this.initThree();
    this.initMaterials();

    window.addEventListener("resize", () => this.onWindowResize(), false);

    // 키보드 이벤트
    document.addEventListener("keydown", (e) => this.handleInput(e));

    // 터치 이벤트
    this.initTouchControls();

    // 버튼 컨트롤 (this 바인딩 및 이벤트 연결)
    this.initButtonControls();
  }

  initButtonControls() {
    // 공통 이벤트 핸들러: 이벤트 전파 중단
    const stopEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // 좌우 이동 버튼
    const leftBtn = document.getElementById("left-btn");
    const rightBtn = document.getElementById("right-btn");

    if (leftBtn) {
      // pointerdown과 touchstart/end 모두 막아서 상위 전파 차단
      leftBtn.addEventListener("pointerdown", (e) => {
        stopEvent(e);
        this.moveHorizontal(-1);
      });
      leftBtn.addEventListener("touchstart", stopEvent, { passive: false });
      leftBtn.addEventListener("touchend", stopEvent, { passive: false });
    }

    if (rightBtn) {
      rightBtn.addEventListener("pointerdown", (e) => {
        stopEvent(e);
        this.moveHorizontal(1);
      });
      rightBtn.addEventListener("touchstart", stopEvent, { passive: false });
      rightBtn.addEventListener("touchend", stopEvent, { passive: false });
    }

    // 드롭 버튼
    const dropBtn = document.getElementById("drop-btn");
    if (dropBtn) {
      dropBtn.addEventListener("pointerdown", (e) => {
        stopEvent(e);
        this.hardDrop();
      });
      dropBtn.addEventListener("touchstart", stopEvent, { passive: false });
      dropBtn.addEventListener("touchend", stopEvent, { passive: false });
    }

    // BGM 버튼
    const bgmBtn = document.getElementById("bgm-btn");
    if (bgmBtn) {
      bgmBtn.addEventListener("pointerdown", (e) => {
        stopEvent(e);
        const isOn = this.SoundManager.toggleBGM();
        bgmBtn.innerHTML = "BGM<br>" + (isOn ? "ON" : "OFF");
      });
      bgmBtn.addEventListener("touchstart", stopEvent, { passive: false });
      bgmBtn.addEventListener("touchend", stopEvent, { passive: false });
    }

    // VIEW (투명 모드) 버튼
    const toggleBtn = document.getElementById("toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("pointerdown", (e) => {
        stopEvent(e);
        this.CONFIG.TRANSPARENT_MODE = !this.CONFIG.TRANSPARENT_MODE;
        toggleBtn.innerHTML =
          "VIEW<br>" + (this.CONFIG.TRANSPARENT_MODE ? "ON" : "OFF");

        if (this.occluderCylinder) {
          this.occluderCylinder.visible = !this.CONFIG.TRANSPARENT_MODE;
        }
      });
      toggleBtn.addEventListener("touchstart", stopEvent, { passive: false });
      toggleBtn.addEventListener("touchend", stopEvent, { passive: false });
    }
  }

  initTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwiping = false;

    document.addEventListener(
      "touchstart",
      (e) => {
        if (!this.state.isPlaying) return;
        // 버튼 ID로 체크 (더 확실하게)
        const target = e.target;
        if (
          target.closest("#left-btn") ||
          target.closest("#right-btn") ||
          target.closest("#drop-btn") ||
          target.closest("#bgm-btn") ||
          target.closest("#toggle-btn")
        ) {
          return;
        }

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isSwiping = false;
      },
      { passive: false }
    );

    document.addEventListener(
      "touchmove",
      (e) => {
        if (!this.state.isPlaying) return;
        // 버튼 체크
        const target = e.target;
        if (
          target.closest("#left-btn") ||
          target.closest("#right-btn") ||
          target.closest("#drop-btn")
        )
          return;

        e.preventDefault();

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = touchX - touchStartX;
        const diffY = touchY - touchStartY;

        if (Math.abs(diffX) > this.CONFIG.SWIPE_SENSITIVITY) {
          const steps = Math.floor(
            Math.abs(diffX) / this.CONFIG.SWIPE_SENSITIVITY
          );
          if (steps > 0) {
            const moveDir = diffX > 0 ? 1 : -1;
            this.moveHorizontal(moveDir);
            touchStartX = touchX;
            isSwiping = true;
          }
        }

        if (diffY > this.CONFIG.SWIPE_SENSITIVITY && diffY > Math.abs(diffX)) {
          this.softDrop();
          touchStartY = touchY;
          isSwiping = true;
        }
      },
      { passive: false }
    );

    document.addEventListener("touchend", (e) => {
      if (!this.state.isPlaying) return;
      // 버튼 체크 (회전 로직 실행 방지)
      const target = e.target;
      if (
        target.closest("#left-btn") ||
        target.closest("#right-btn") ||
        target.closest("#drop-btn") ||
        target.closest("#bgm-btn") ||
        target.closest("#toggle-btn")
      ) {
        return;
      }

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const timeDiff = Date.now() - touchStartTime;
      const diffY = touchEndY - touchStartY;
      const diffX = touchEndX - touchStartX;

      if (
        !isSwiping &&
        timeDiff < 300 &&
        Math.abs(diffX) < 10 &&
        Math.abs(diffY) < 10
      ) {
        this.rotatePiece();
      }
    });
  }

  initThree() {
    const CELL_HEIGHT =
      (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
    const TOTAL_HEIGHT = this.CONFIG.GRID_HEIGHT * CELL_HEIGHT;

    this.scene = new THREE.Scene();
    // 터미널 분위기를 위해 배경은 CSS로 처리하고 Three.js는 투명하게 유지하거나
    // Fog를 어두운 색으로 설정
    this.scene.fog = new THREE.FogExp2(0x050510, 0.002);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, TOTAL_HEIGHT / 2, this.CONFIG.RADIUS + 100);
    this.camera.lookAt(0, TOTAL_HEIGHT / 2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.container.appendChild(this.renderer.domElement);

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.effectGroup = new THREE.Group();
    this.scene.add(this.effectGroup);

    this.piecesGroup = new THREE.Group();
    this.worldGroup.add(this.piecesGroup);

    this.ghostGroup = new THREE.Group();
    this.worldGroup.add(this.ghostGroup);

    const ambientLight = new THREE.AmbientLight(0x404040, 3.0);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
    frontLight.position.set(0, 50, 100);
    this.scene.add(frontLight);

    this.createCylinderGrid(CELL_HEIGHT, TOTAL_HEIGHT);
    this.createOccluder(TOTAL_HEIGHT);
    this.createStarfield();
  }

  initMaterials() {
    const CELL_HEIGHT =
      (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
    const circumference = 2 * Math.PI * this.CONFIG.RADIUS;
    const cellArcLength = circumference / this.CONFIG.GRID_WIDTH;
    const blockWidth = cellArcLength * 0.92;
    const blockHeight = CELL_HEIGHT * 0.92;

    this.sharedGeometry = new THREE.BoxGeometry(blockWidth, blockHeight, 0.5);

    const colorKeys = Object.keys(this.CONFIG.COLORS);
    colorKeys.forEach((key) => {
      const color = this.CONFIG.COLORS[key];
      this.sharedMaterials[color] = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 1.0,
        roughness: 0.2,
        metalness: 0.1,
      });
      this.sharedMaterials[color + "_ghost"] = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.3,
        roughness: 0.2,
        metalness: 0.1,
      });
      this.sharedMaterials[color + "_trans"] = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2,
        metalness: 0.1,
      });
    });

    // 특수 블록 머티리얼
    Object.keys(this.SPECIAL_TYPES).forEach((key) => {
      const type = this.SPECIAL_TYPES[key];
      if (type === this.SPECIAL_TYPES.NONE) return;

      let color = 0xffffff;
      let emissive = 0xffffff;

      switch (type) {
        case this.SPECIAL_TYPES.BOMB:
          color = 0xff0000;
          emissive = 0xff0000;
          break;
        case this.SPECIAL_TYPES.FREEZE:
          color = 0x00ffff;
          emissive = 0x00ffff;
          break;
        case this.SPECIAL_TYPES.LASER:
          color = 0xffff00;
          emissive = 0xffff00;
          break;
        case this.SPECIAL_TYPES.GOLD:
          color = 0xffd700;
          emissive = 0xffd700;
          break;
      }

      this.specialMaterials[type] = new THREE.MeshStandardMaterial({
        color: color,
        emissive: emissive,
        emissiveIntensity: 1.0,
        roughness: 0.1,
        metalness: 0.8,
      });
    });
  }

  createCylinderGrid(CELL_HEIGHT, TOTAL_HEIGHT) {
    const material = new THREE.LineBasicMaterial({
      color: 0x333333,
      opacity: 0.3,
      transparent: true,
    });

    for (let i = 0; i < this.CONFIG.GRID_WIDTH; i++) {
      const angle = (i / this.CONFIG.GRID_WIDTH) * Math.PI * 2;
      const x = Math.sin(angle) * (this.CONFIG.RADIUS - 0.1);
      const z = Math.cos(angle) * (this.CONFIG.RADIUS - 0.1);

      const points = [];
      points.push(new THREE.Vector3(x, 0, z));
      points.push(new THREE.Vector3(x, TOTAL_HEIGHT, z));

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.worldGroup.add(line);
    }

    for (let y = 0; y <= this.CONFIG.GRID_HEIGHT; y++) {
      const curve = new THREE.EllipseCurve(
        0,
        0,
        this.CONFIG.RADIUS - 0.1,
        this.CONFIG.RADIUS - 0.1,
        0,
        2 * Math.PI,
        false,
        0
      );

      const points = curve.getPoints(this.CONFIG.GRID_WIDTH * 2);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, y * CELL_HEIGHT, 0);

      let ringMat = material;
      if (y === this.CONFIG.GRID_HEIGHT) {
        ringMat = new THREE.LineBasicMaterial({
          color: 0xff0033,
          linewidth: 2,
        });
      }

      const ring = new THREE.Line(geometry, ringMat);
      this.worldGroup.add(ring);
    }
  }

  createOccluder(TOTAL_HEIGHT) {
    const r = this.CONFIG.RADIUS - 0.1;
    const geometry = new THREE.CylinderGeometry(r, r, TOTAL_HEIGHT, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x050510 });
    this.occluderCylinder = new THREE.Mesh(geometry, material);
    this.occluderCylinder.position.y = TOTAL_HEIGHT / 2;
    this.occluderCylinder.visible = !this.CONFIG.TRANSPARENT_MODE;
    this.occluderCylinder.renderOrder = -1;
    this.worldGroup.add(this.occluderCylinder);
  }

  createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const posArray = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 400;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
    });
    this.particleSystem = new THREE.Points(starGeo, starMat);
    this.scene.add(this.particleSystem);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  startGame() {
    this.state.grid = Array(this.CONFIG.GRID_HEIGHT)
      .fill()
      .map(() => Array(this.CONFIG.GRID_WIDTH).fill(null));
    this.state.score = 0;
    this.state.level = 1;
    this.state.linesClearedTotal = 0;
    this.state.isPlaying = true;
    this.state.dropTimer = 0;
    this.state.slowModeTimer = 0;

    this.updateScore(0);
    this.updateLevel(1);

    this.piecesGroup.clear();
    this.generateNextPiece();
    this.spawnPiece();

    this.SoundManager.init();
    this.SoundManager.startBGM();

    this.animate();
  }

  generateNextPiece() {
    const types = Object.keys(this.TETROMINOS);
    const type = types[Math.floor(Math.random() * types.length)];
    const template = this.TETROMINOS[type];

    let specialType = this.SPECIAL_TYPES.NONE;
    let specialIndex = -1;

    if (Math.random() < 0.2) {
      const keys = Object.keys(this.SPECIAL_TYPES);
      const randomKey = keys[Math.floor(Math.random() * (keys.length - 1)) + 1];
      specialType = this.SPECIAL_TYPES[randomKey];
      specialIndex = Math.floor(Math.random() * 4);
    }

    this.state.nextPiece = {
      type: type,
      shape: template.shape,
      color: template.color,
      specialType: specialType,
      specialIndex: specialIndex,
    };

    this.drawNextPiece();
  }

  drawNextPiece() {
    if (!this.nextCtx || !this.state.nextPiece) return;

    const ctx = this.nextCtx;
    const shape = this.state.nextPiece.shape;
    const color = this.state.nextPiece.color;
    const specialType = this.state.nextPiece.specialType;
    const specialIndex = this.state.nextPiece.specialIndex;

    const blockSize = 12;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const offsetX = (ctx.canvas.width - shape[0].length * blockSize) / 2;
    const offsetY = (ctx.canvas.height - shape.length * blockSize) / 2;

    let blockCount = 0;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          if (
            blockCount === specialIndex &&
            specialType !== this.SPECIAL_TYPES.NONE
          ) {
            ctx.fillStyle = "#ffffff";
          } else {
            ctx.fillStyle = "#" + new THREE.Color(color).getHexString();
          }
          ctx.fillRect(
            offsetX + c * blockSize,
            offsetY + r * blockSize,
            blockSize - 1,
            blockSize - 1
          );
          blockCount++;
        }
      }
    }
  }

  spawnPiece() {
    if (!this.state.nextPiece) this.generateNextPiece();
    const template = this.state.nextPiece;

    this.state.currentPiece = {
      type: template.type,
      shape: template.shape,
      color: template.color,
      x:
        Math.floor(this.CONFIG.GRID_WIDTH / 2) -
        Math.floor(template.shape[0].length / 2),
      y: this.CONFIG.GRID_HEIGHT - 1 - template.shape.length,
      specialType: template.specialType || this.SPECIAL_TYPES.NONE,
      specialIndex:
        template.specialIndex !== undefined ? template.specialIndex : -1,
    };

    this.generateNextPiece();

    if (
      this.checkCollision(
        this.state.currentPiece.x,
        this.state.currentPiece.y,
        this.state.currentPiece.shape
      )
    ) {
      this.gameOver();
    }

    const centerAngle =
      (this.state.currentPiece.x / this.CONFIG.GRID_WIDTH) * Math.PI * 2;
    this.state.targetCameraAngle = centerAngle;
  }

  checkCollision(px, py, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const testX =
            (px + c + this.CONFIG.GRID_WIDTH * 10) % this.CONFIG.GRID_WIDTH;
          const testY = py - r;
          // 바닥 충돌
          if (testY < 0) return true;
          // 기존 블록 충돌 (y가 GRID_HEIGHT보다 작을 때만 체크)
          if (testY < this.CONFIG.GRID_HEIGHT && this.state.grid[testY][testX])
            return true;
        }
      }
    }
    return false;
  }

  lockPiece() {
    const p = this.state.currentPiece;
    let blockCount = 0;
    let isGameOver = false;

    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c]) {
          const x =
            (p.x + c + this.CONFIG.GRID_WIDTH * 10) % this.CONFIG.GRID_WIDTH;
          const y = p.y - r;

          // 데드라인 체크: y가 GRID_HEIGHT 이상이면 게임 오버 (단, 화면 밖에서 내려오는 중인 경우는 제외해야 하지만 lockPiece는 바닥에 닿았을 때 호출됨)
          // 보통 테트리스는 lock된 블록 중 하나라도 천장(GRID_HEIGHT)을 넘으면 게임오버
          if (y >= this.CONFIG.GRID_HEIGHT) {
            isGameOver = true;
          }

          if (y >= 0 && y < this.CONFIG.GRID_HEIGHT) {
            let blockType = this.SPECIAL_TYPES.NONE;
            if (blockCount === p.specialIndex) {
              blockType = p.specialType;
            }
            this.state.grid[y][x] = { color: p.color, type: blockType };
            this.addBlockToGroup(x, y, this.state.grid[y][x], this.piecesGroup);
          }
          blockCount++;
        }
      }
    }

    if (isGameOver) {
      this.gameOver();
      return;
    }

    this.SoundManager.drop();
    this.checkLines();
    this.spawnPiece();
  }

  checkLines() {
    let linesCleared = [];
    let specialEffects = [];

    for (let y = 0; y < this.CONFIG.GRID_HEIGHT; y++) {
      if (this.state.grid[y].every((cell) => cell !== null)) {
        linesCleared.push(y);

        this.state.grid[y].forEach((cell, x) => {
          if (cell.type !== this.SPECIAL_TYPES.NONE) {
            specialEffects.push({ type: cell.type, x: x, y: y });
          }
        });
      }
    }

    if (linesCleared.length > 0) {
      this.SoundManager.clear();
      linesCleared.forEach((y) => this.createExplosion(y));

      specialEffects.forEach((effect) => {
        if (effect.type === this.SPECIAL_TYPES.BOMB) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const targetY = effect.y + dy;
              const targetX =
                (effect.x + dx + this.CONFIG.GRID_WIDTH * 10) %
                this.CONFIG.GRID_WIDTH;
              if (targetY >= 0 && targetY < this.CONFIG.GRID_HEIGHT) {
                this.state.grid[targetY][targetX] = null;
                this.createExplosion(targetY);
              }
            }
          }
          this.SoundManager.playTone(100, "sawtooth", 0.5, 0.5);
        } else if (effect.type === this.SPECIAL_TYPES.LASER) {
          for (let ly = 0; ly < this.CONFIG.GRID_HEIGHT; ly++) {
            this.state.grid[ly][effect.x] = null;
          }
          this.createExplosion(effect.y);
          this.SoundManager.playTone(800, "square", 0.3, 0.2);
        } else if (effect.type === this.SPECIAL_TYPES.FREEZE) {
          this.state.slowModeTimer = 5000;
          if (!this.state.originalSpeed)
            this.state.originalSpeed = this.CONFIG.DROP_SPEED;
          this.CONFIG.DROP_SPEED = 2000;

          const uiLayer = document.getElementById("game-ui");
          if (uiLayer) uiLayer.style.border = "2px solid #00ffff";

          setTimeout(() => {
            this.CONFIG.DROP_SPEED = this.state.originalSpeed || 800;
            if (uiLayer) uiLayer.style.border = "none";
            this.state.slowModeTimer = 0;
          }, 5000);
          this.SoundManager.playTone(1200, "sine", 1.0, 0.1);
        } else if (effect.type === this.SPECIAL_TYPES.GOLD) {
          this.state.score += 5000;
          this.SoundManager.playTone(1500, "triangle", 0.5, 0.2);
        }
      });

      for (let i = linesCleared.length - 1; i >= 0; i--) {
        const y = linesCleared[i];
        this.state.grid.splice(y, 1);
        this.state.grid.push(Array(this.CONFIG.GRID_WIDTH).fill(null));
      }

      this.refreshGridVisuals();
      this.updateScore(
        this.state.score + linesCleared.length * 100 * linesCleared.length
      );

      this.state.linesClearedTotal += linesCleared.length;
      const newLevel = Math.floor(this.state.linesClearedTotal / 5) + 1;
      if (newLevel > this.state.level) {
        this.state.level = newLevel;
        this.updateLevel(this.state.level);

        const newSpeed = Math.max(100, 800 - (this.state.level - 1) * 50);
        if (this.state.slowModeTimer <= 0) {
          this.CONFIG.DROP_SPEED = newSpeed;
        }
        this.state.originalSpeed = newSpeed;
        this.SoundManager.playTone(800, "sine", 0.5, 0.1);
      }
    }
  }

  createExplosion(gridY) {
    const CELL_HEIGHT =
      (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
    const yPos = gridY * CELL_HEIGHT;
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = this.CONFIG.RADIUS;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const y = yPos + (Math.random() - 0.5) * CELL_HEIGHT;

      positions.push(x, y, z);

      const speed = 0.2 + Math.random() * 0.3;
      velocities.push(
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 0.5,
        Math.cos(angle) * speed
      );
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData = { velocities: velocities, life: 1.0 };
    this.effectGroup.add(particles);
    this.explosions.push(particles);

    this.cameraShake = 0.8;
  }

  refreshGridVisuals() {
    this.piecesGroup.clear();
    for (let y = 0; y < this.CONFIG.GRID_HEIGHT; y++) {
      for (let x = 0; x < this.CONFIG.GRID_WIDTH; x++) {
        if (this.state.grid[y][x] !== null) {
          this.addBlockToGroup(x, y, this.state.grid[y][x], this.piecesGroup);
        }
      }
    }
  }

  handleInput(e) {
    if (!this.state.isPlaying) return;
    if (e.key === "ArrowLeft") this.moveHorizontal(-1);
    if (e.key === "ArrowRight") this.moveHorizontal(1);
    if (e.key === "ArrowUp") this.rotatePiece();
    if (e.key === "ArrowDown") this.softDrop();
    if (e.key === " ") this.hardDrop();
  }

  moveHorizontal(dir) {
    if (
      !this.checkCollision(
        this.state.currentPiece.x + dir,
        this.state.currentPiece.y,
        this.state.currentPiece.shape
      )
    ) {
      this.state.currentPiece.x += dir;
      this.SoundManager.move();
    }
  }

  rotatePiece() {
    const p = this.state.currentPiece;
    const newShape = p.shape[0].map((val, index) =>
      p.shape.map((row) => row[index]).reverse()
    );

    if (!this.checkCollision(p.x, p.y, newShape)) {
      p.shape = newShape;
      this.SoundManager.rotate();
    } else if (!this.checkCollision(p.x + 1, p.y, newShape)) {
      p.x += 1;
      p.shape = newShape;
      this.SoundManager.rotate();
    } else if (!this.checkCollision(p.x - 1, p.y, newShape)) {
      p.x -= 1;
      p.shape = newShape;
      this.SoundManager.rotate();
    }
  }

  softDrop() {
    if (!this.state.currentPiece) return;

    if (
      !this.checkCollision(
        this.state.currentPiece.x,
        this.state.currentPiece.y - 1,
        this.state.currentPiece.shape
      )
    ) {
      this.state.currentPiece.y--;
      this.state.dropTimer = 0;
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    while (
      !this.checkCollision(
        this.state.currentPiece.x,
        this.state.currentPiece.y - 1,
        this.state.currentPiece.shape
      )
    ) {
      this.state.currentPiece.y--;
    }
    this.lockPiece();
  }

  gameOver() {
    this.SoundManager.gameOver();
    this.state.isPlaying = false;

    const gameOverScreen = document.getElementById("game-over-screen");
    if (gameOverScreen) gameOverScreen.classList.remove("hidden");

    const finalScore = document.getElementById("final-score");
    if (finalScore) finalScore.innerText = this.state.score;

    console.log("GAME OVER");
  }

  animate() {
    if (!this.state.isPlaying) return;
    requestAnimationFrame(() => this.animate());

    const now = Date.now();
    const deltaTime = now - this.state.lastTime;
    this.state.lastTime = now;

    this.update(deltaTime);
    this.render();
  }

  update(deltaTime) {
    // 폭발 이펙트 업데이트
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const p = this.explosions[i];
      p.userData.life -= 0.03;
      if (p.userData.life <= 0) {
        p.geometry.dispose();
        p.material.dispose();
        this.effectGroup.remove(p);
        this.explosions.splice(i, 1);
        continue;
      }

      p.material.opacity = p.userData.life;
      const positions = p.geometry.attributes.position.array;
      const vels = p.userData.velocities;

      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3] += vels[j * 3];
        positions[j * 3 + 1] += vels[j * 3 + 1];
        positions[j * 3 + 2] += vels[j * 3 + 2];
      }
      p.geometry.attributes.position.needsUpdate = true;
    }

    if (this.cameraShake > 0) {
      this.cameraShake *= 0.9;
      if (this.cameraShake < 0.05) this.cameraShake = 0;
    }

    this.state.dropTimer += deltaTime;
    if (this.state.dropTimer > this.CONFIG.DROP_SPEED) {
      this.state.dropTimer = 0;
      if (
        !this.checkCollision(
          this.state.currentPiece.x,
          this.state.currentPiece.y - 1,
          this.state.currentPiece.shape
        )
      ) {
        this.state.currentPiece.y--;
      } else {
        this.lockPiece();
      }
    }

    if (this.particleSystem) {
      this.particleSystem.rotation.y += 0.0005;
    }

    this.updateCamera();
  }

  updateCamera() {
    if (!this.state.currentPiece) return;
    const pieceCenterOffset = this.state.currentPiece.shape[0].length / 2;
    const target =
      ((this.state.currentPiece.x + pieceCenterOffset) /
        this.CONFIG.GRID_WIDTH) *
      Math.PI *
      2;

    this.state.cameraAngle += (target - this.state.cameraAngle) * 0.1;

    const camDist = this.CONFIG.RADIUS + 100;
    this.camera.position.x = Math.sin(this.state.cameraAngle) * camDist;
    this.camera.position.z = Math.cos(this.state.cameraAngle) * camDist;

    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.z += (Math.random() - 0.5) * this.cameraShake;
    }

    const CELL_HEIGHT =
      (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
    const TOTAL_HEIGHT = this.CONFIG.GRID_HEIGHT * CELL_HEIGHT;
    this.camera.lookAt(0, TOTAL_HEIGHT / 2, 0);
  }

  render() {
    this.renderActivePiece();
    this.renderer.render(this.scene, this.camera);
  }

  renderActivePiece() {
    const activeGroupName = "active_piece_visuals";
    let activeGroup = this.worldGroup.getObjectByName(activeGroupName);
    if (activeGroup) this.worldGroup.remove(activeGroup);

    activeGroup = new THREE.Group();
    activeGroup.name = activeGroupName;
    this.worldGroup.add(activeGroup);

    if (!this.state.currentPiece) return;

    // Ghost
    if (this.CONFIG.SHOW_GHOST) {
      let ghostY = this.state.currentPiece.y;
      while (
        !this.checkCollision(
          this.state.currentPiece.x,
          ghostY - 1,
          this.state.currentPiece.shape
        )
      ) {
        ghostY--;
      }

      const p = this.state.currentPiece;
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
          if (p.shape[r][c]) {
            const gx =
              (p.x + c + this.CONFIG.GRID_WIDTH * 10) % this.CONFIG.GRID_WIDTH;
            const gy = ghostY - r;
            this.addBlockToGroup(gx, gy, p.color, activeGroup, true);
          }
        }
      }
    }

    // Active Block
    const p = this.state.currentPiece;
    let blockCount = 0;

    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c]) {
          const gx =
            (p.x + c + this.CONFIG.GRID_WIDTH * 10) % this.CONFIG.GRID_WIDTH;
          const gy = p.y - r;

          let blockType = this.SPECIAL_TYPES.NONE;
          if (blockCount === p.specialIndex) {
            blockType = p.specialType;
          }

          this.addBlockToGroup(
            gx,
            gy,
            { color: p.color, type: blockType },
            activeGroup
          );
          blockCount++;
        }
      }
    }
  }

  addBlockToGroup(gx, gy, blockInfo, group, isGhost = false) {
    const CELL_HEIGHT =
      (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
    const angle = (gx / this.CONFIG.GRID_WIDTH) * Math.PI * 2;
    const r = this.CONFIG.RADIUS;
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r;
    const y = gy * CELL_HEIGHT;

    let color = blockInfo;
    let type = this.SPECIAL_TYPES.NONE;

    if (
      typeof blockInfo === "object" &&
      blockInfo !== null &&
      blockInfo.color
    ) {
      color = blockInfo.color;
      type = blockInfo.type || this.SPECIAL_TYPES.NONE;
    }

    let mat;

    if (isGhost) {
      mat = this.sharedMaterials[color + "_ghost"];
    } else if (type !== this.SPECIAL_TYPES.NONE) {
      mat = this.specialMaterials[type];
    } else {
      mat = this.CONFIG.TRANSPARENT_MODE
        ? this.sharedMaterials[color + "_trans"]
        : this.sharedMaterials[color];
    }

    if (!mat) mat = this.sharedMaterials[Object.keys(this.CONFIG.COLORS)[0]];

    const mesh = new THREE.Mesh(this.sharedGeometry, mat);

    mesh.position.set(x, y, z);
    mesh.rotation.y = angle;
    mesh.lookAt(new THREE.Vector3(x * 2, y, z * 2));

    group.add(mesh);
  }

  updateScore(newScore) {
    this.state.score = newScore;
    const el = document.getElementById("score-display");
    if (el) el.innerText = this.state.score;
  }

  updateLevel(lv) {
    const el = document.getElementById("level-display");
    if (el) el.innerText = lv;
  }
}
