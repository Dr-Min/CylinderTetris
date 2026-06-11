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
        // 터미널 테마: 녹색/시안 계열 모노톤
        I: 0x00ff88,  // 밝은 녹색
        O: 0x00ffcc,  // 시안
        T: 0x00dd66,  // 중간 녹색
        S: 0x00ff44,  // 네온 녹색
        Z: 0x00aa44,  // 어두운 녹색
        J: 0x00ccaa,  // 청록
        L: 0x00ffaa,  // 민트
        GHOST: 0x113322,
        GRID: 0x0a1a0a,
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
      linesClearedStage: 0, // 스테이지별 클리어 라인 카운트
      isPlaying: false,
      isLogicActive: false, // 게임 로직(이동/낙하) 활성화 플래그
      dropTimer: 0,
      lastTime: 0,
      cameraAngle: 0,
      targetCameraAngle: 0,
      slowModeTimer: 0,
      originalSpeed: 0,
      targetLines: Infinity, // 목표 라인 수 (기본값 무한)
      // 퍼즐 모드 상태
      isPuzzleMode: false,
      puzzleBlocks: [], // 플레이어에게 주어진 블록들
      currentPuzzleBlockIndex: 0, // 현재 선택된 블록 인덱스
      puzzleLinesTarget: 3, // 목표 라인 수
      // 보스전 방해 효과
      isBossFight: false,
      bossInterference: {
        blackout: false,      // 다음 블록 미리보기 숨김
        speedup: false,       // 낙하 속도 2배
        reverse: false,       // 좌우 반전
        glitchIntensity: 0,   // 글리치 효과 강도 (0-1)
      },
    };
    
    // 보스 매니저 참조 (GameManager에서 주입)
    this.bossManager = null;

    this.onStageClear = null; // 콜백 함수
    this.onGameOver = null; // 콜백 함수
    this.onPuzzleFail = null; // 퍼즐 실패 콜백
    this.onLineCleared = null; // 줄 클리어 시 콜백 (lineNumber: 1,2,3)
    this.getPerkEffects = () => ({}); // 기본값 (GameManager에서 덮어씀)

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
    this.clearWaves = [];
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
        this.toggleBGM(bgmBtn);
      });
      bgmBtn.addEventListener("touchstart", stopEvent, { passive: false });
      bgmBtn.addEventListener("touchend", stopEvent, { passive: false });
    }

    // View 버튼
    const viewBtn = document.getElementById("toggle-btn");
    if (viewBtn) {
      viewBtn.addEventListener("pointerdown", (e) => {
        stopEvent(e);
        this.toggleViewMode(viewBtn);
      });
      viewBtn.addEventListener("touchstart", stopEvent, { passive: false });
      viewBtn.addEventListener("touchend", stopEvent, { passive: false });
    }
  }

  toggleBGM(btn) {
    const isOn = this.SoundManager.toggleBGM();
    if (btn) {
      btn.innerHTML = `BGM<br>${isOn ? "ON" : "OFF"}`;
      btn.style.color = isOn ? "var(--term-color)" : "#555";
    }
  }

  toggleViewMode(btn) {
    this.CONFIG.TRANSPARENT_MODE = !this.CONFIG.TRANSPARENT_MODE;
    const isOn = this.CONFIG.TRANSPARENT_MODE;

    // 1. 오클루더 토글 (뒷면 가림막 제거)
    if (this.occluderCylinder) {
      this.occluderCylinder.visible = !isOn;
    }

    // 2. 블록 투명도 조정 (선택적)
    // 앞면 블록이 너무 불투명하면 뒷면이 안보이므로, 모드 켜지면 약간 투명하게
    Object.values(this.sharedMaterials).forEach((mat) => {
      if (mat.opacity !== undefined && mat !== this.sharedMaterials.ghost) {
        // 고스트 제외
        mat.opacity = isOn ? 0.6 : 1.0;
      }
    });

    // 3. 버튼 UI 업데이트
    if (btn) {
      btn.innerHTML = `VIEW<br>${isOn ? "ON" : "OFF"}`;
      btn.style.color = isOn ? "var(--term-color)" : "#555";
      // 켜졌을 때 버튼 자체도 시각적 피드백
      btn.style.boxShadow = isOn ? "0 0 10px var(--term-color)" : "none";
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

    // Active Piece (Object Pooling)
    this.activeGroup = new THREE.Group();
    this.activeGroup.name = "active_piece_visuals";
    this.worldGroup.add(this.activeGroup);
    this.activeMeshPool = [];

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
      let emoji = "";

      switch (type) {
        case this.SPECIAL_TYPES.BOMB:
          color = 0xff0000;
          emissive = 0xff0000;
          emoji = "💣";
          break;
        case this.SPECIAL_TYPES.FREEZE:
          color = 0x00ffff;
          emissive = 0x00ffff;
          emoji = "❄️";
          break;
        case this.SPECIAL_TYPES.LASER:
          color = 0xffff00;
          emissive = 0xffff00;
          emoji = "⚡";
          break;
        case this.SPECIAL_TYPES.GOLD:
          color = 0xffd700;
          emissive = 0xffd700;
          emoji = "💰";
          break;
      }

      const texture = this.createEmojiTexture(emoji, color);

      this.specialMaterials[type] = new THREE.MeshStandardMaterial({
        color: 0xffffff, // 텍스처 색상 그대로 사용하기 위해 흰색
        map: texture,
        emissive: emissive,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.1,
      });
    });
  }

  createEmojiTexture(emoji, bgColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // 배경색 (약간 투명하게 하거나 단색)
    ctx.fillStyle = "#" + new THREE.Color(bgColor).getHexString();
    ctx.fillRect(0, 0, 128, 128);

    // 내부를 약간 어둡게 해서 이모지 대비 높이기
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(10, 10, 108, 108);

    // 테두리
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 128, 128);

    // 이모지
    ctx.font = "bold 80px Segoe UI Emoji, Arial"; // 90px -> 80px 약간 축소
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "white";
    ctx.fillText(emoji, 64, 68);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
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

    // 미니 패널 공간 확보: 카메라 뷰 오프셋으로 화면 아래로 이동
    const offsetTop = this.viewOffsetTop || 0;
    if (offsetTop > 0) {
      // setViewOffset: 카메라가 보는 영역을 위로 이동 → 실린더가 화면 아래로
      // offsetTop / 3으로 줄여서 테트리스가 덜 내려가게
      this.camera.setViewOffset(
        window.innerWidth,
        window.innerHeight,
        0,
        -offsetTop / 3,
        window.innerWidth,
        window.innerHeight
      );
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  // 미니 패널용 상단 오프셋 설정
  setTopOffset(offset) {
    this.viewOffsetTop = offset;
    this.onWindowResize();
  }

  // 오프셋 해제
  clearTopOffset() {
    this.viewOffsetTop = 0;
    this.camera.clearViewOffset();
    this.onWindowResize();
  }

  startGame(targetLines = Infinity, initialSpeed = 800) {
    this.resetScene(); // 씬 초기화 (이펙트 제거, 블록 표시)

    this.state.grid = Array(this.CONFIG.GRID_HEIGHT)
      .fill()
      .map(() => Array(this.CONFIG.GRID_WIDTH).fill(null));
    this.state.score = 0;
    this.state.level = 1;
    this.state.linesClearedTotal = 0;
    this.state.linesClearedStage = 0;
    this.state.targetLines = targetLines;
    this.CONFIG.DROP_SPEED = initialSpeed;

    this.state.isPlaying = true;
    this.state.isLogicActive = true; // 게임 로직(이동/낙하) 활성화 플래그
    this.state.dropTimer = 0;
    this.state.slowModeTimer = 0;

    this.updateScore(0);
    this.updateLevel(1);

    debugLog("Tetris", `Mission Start: Clear ${targetLines} lines.`);

    this.piecesGroup.clear();
    this.generateNextPiece();
    this.spawnPiece();

    this.SoundManager.init();
    this.SoundManager.startBGM();

    this.startLoop();
  }

  generateNextPiece() {
    const types = Object.keys(this.TETROMINOS);
    const type = types[Math.floor(Math.random() * types.length)];
    const template = this.TETROMINOS[type];

    let specialType = this.SPECIAL_TYPES.NONE;
    let specialIndex = -1;

    // 퍽 효과: 특수 블록 확률
    const effects = this.getPerkEffects();
    // 영구 강화나 퍽으로 해금되지 않으면 0 (기본값 제거)
    const bombChance = effects.bombChance || 0.0;
    const goldChance = effects.goldChance || 0.0;
    const miscChance = effects.miscChance || 0.0;

    // 특수 블록이 해금되었는지 확인 (확률이 0보다 커야 함)
    // 영구 강화나 퍽 획득 전에는 절대 나오지 않음
    if (bombChance > 0 || goldChance > 0 || miscChance > 0) {
      // 우선순위: 골드 -> 폭탄 -> 나머지 랜덤
      if (Math.random() < goldChance) {
        specialType = this.SPECIAL_TYPES.GOLD;
        specialIndex = Math.floor(Math.random() * 4);
      } else if (Math.random() < bombChance) {
        specialType = this.SPECIAL_TYPES.BOMB;
        specialIndex = Math.floor(Math.random() * 4);
      } else if (Math.random() < miscChance) {
        // 나머지 특수 블록도 miscChance에 따라 등장
        const keys = Object.keys(this.SPECIAL_TYPES).filter(
          (k) => k !== "NONE" && k !== "GOLD" && k !== "BOMB"
        );
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        specialType = this.SPECIAL_TYPES[randomKey];
        specialIndex = Math.floor(Math.random() * 4);
      }
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
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 보스전 블랙아웃 효과: 다음 블록 숨김
    if (this.state.isBossFight && this.state.bossInterference.blackout) {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#ff0000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('???', ctx.canvas.width / 2, ctx.canvas.height / 2 + 4);
      return;
    }
    
    const shape = this.state.nextPiece.shape;
    const color = this.state.nextPiece.color;
    const specialType = this.state.nextPiece.specialType;
    const specialIndex = this.state.nextPiece.specialIndex;

    const blockSize = 12;

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
          if (testY < 0) return true;
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

    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c]) {
          const x =
            (p.x + c + this.CONFIG.GRID_WIDTH * 10) % this.CONFIG.GRID_WIDTH;
          const y = p.y - r;

          let blockType = this.SPECIAL_TYPES.NONE;
          if (blockCount === p.specialIndex) {
            blockType = p.specialType;
          }

          if (y >= 0 && y < this.CONFIG.GRID_HEIGHT) {
            this.state.grid[y][x] = { color: p.color, type: blockType };
            this.addBlockToGroup(x, y, this.state.grid[y][x], this.piecesGroup);
          }
          blockCount++;
        }
      }
    }

    this.SoundManager.drop();
    this.checkLines();

    // stageClear 호출 후에는 spawnPiece를 하지 않아야 함.
    if (this.state.isPlaying) {
      this.spawnPiece();
    }
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
      linesCleared.forEach((y, i) => this.createClearWave(y, i));

      // 멀티 라인일수록 강한 셰이크 + 상승 아르페지오
      this.cameraShake = Math.max(this.cameraShake, 0.8 + linesCleared.length * 0.35);
      if (linesCleared.length >= 2) {
        for (let i = 0; i < linesCleared.length; i++) {
          setTimeout(
            () => this.SoundManager.playTone(440 * Math.pow(1.26, i), "square", 0.18, 0.12),
            i * 90
          );
        }
      }

      specialEffects.forEach((effect) => {
        if (effect.type === this.SPECIAL_TYPES.BOMB) {
          // [수정] 3x3 -> 가로/세로 전체 줄 삭제 (십자 폭발)
          const targetY = effect.y;
          const targetX = effect.x;

          // 1. 가로 줄 전체 삭제
          for (let x = 0; x < this.CONFIG.GRID_WIDTH; x++) {
             this.state.grid[targetY][x] = null;
          }
          this.createExplosion(targetY);

          // 2. 세로 줄 전체 삭제
          for (let y = 0; y < this.CONFIG.GRID_HEIGHT; y++) {
             this.state.grid[y][targetX] = null;
          }
          
          this.SoundManager.playTone(100, "sawtooth", 0.6, 0.6);
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

      // 퍽 효과: 점수 배율 적용은 GameManager의 gameOver나 stageClear에서 최종 정산 때 하거나,
      // 여기서 실시간 표시에 반영할 수도 있음.
      // 여기서는 실시간 표시에 반영.
      const effects = this.getPerkEffects();
      const scoreMultiplier = effects.scoreMultiplier || 1.0;
      const baseScore = linesCleared.length * 100 * linesCleared.length;
      const finalScore = Math.floor(baseScore * scoreMultiplier);

      this.updateScore(this.state.score + finalScore);

      this.state.linesClearedTotal += linesCleared.length;
      this.state.linesClearedStage += linesCleared.length;

      // 특수 탄약 충전 (디펜스에서 사용)
      if (this.onAmmoCharge) this.onAmmoCharge(linesCleared.length);

      if (this.onLineCleared && this.state.isBossFight) {
        this.onLineCleared(this.state.linesClearedStage);
      }

      if (this.state.linesClearedStage >= this.state.targetLines) {
        this.stageClear();
        return;
      }

      const newLevel = Math.floor(this.state.linesClearedTotal / 5) + 1;
      if (newLevel > this.state.level) {
        this.state.level = newLevel;
        this.updateLevel(this.state.level);

        // 스테이지 내에서도 조금씩 빨라질 수 있음
        // const newSpeed = Math.max(100, 800 - (this.state.level - 1) * 50);
        // if (this.state.slowModeTimer <= 0) {
        //     this.CONFIG.DROP_SPEED = newSpeed;
        // }
        // this.state.originalSpeed = newSpeed;
        this.SoundManager.playTone(800, "sine", 0.5, 0.1);
      }
    }
  }

  stageClear() {
    this.state.isLogicActive = false; // 로직만 정지, 렌더링(isPlaying)은 유지
    this.SoundManager.stopBGM();
    this.SoundManager.playTone({ start: 400, end: 800 }, "sine", 0.5, 0.3);

    if (!this.state.isBossFight) {
      this.playClearEffect(); // 클리어 연출 시작
    }

    if (this.onStageClear) this.onStageClear(this.state.linesClearedStage);
  }

  // ===== 퍼즐 모드 =====
  
  /**
   * 퍼즐 모드 시작
   * @param {number} difficulty - 난이도 (스테이지 ID 기반)
   */
  startPuzzleMode(difficulty = 1) {
    this.resetScene();
    
    // 퍼즐 모드 상태 설정
    this.state.isPuzzleMode = true;
    this.state.isPlaying = true;
    this.state.isLogicActive = true;
    this.state.score = 0;
    this.state.linesClearedStage = 0;
    
    // 난이도 기반 설정
    const settings = this.getPuzzleSettings(difficulty);
    this.state.puzzleLinesTarget = settings.linesTarget;
    
    // 그리드 초기화
    this.state.grid = Array(this.CONFIG.GRID_HEIGHT)
      .fill()
      .map(() => Array(this.CONFIG.GRID_WIDTH).fill(null));
    
    // 역방향 생성: 완성된 보드에서 블록 제거
    const puzzle = this.generatePuzzle(settings);
    this.state.grid = puzzle.grid;
    this.state.puzzleBlocks = puzzle.blocks;
    this.state.currentPuzzleBlockIndex = 0;
    
    // 그리드 시각화
    this.refreshGridVisuals();
    
    // 첫 블록 선택
    if (this.state.puzzleBlocks.length > 0) {
      this.selectPuzzleBlock(0);
    }
    
    // UI 업데이트
    this.updatePuzzleUI();
    
    // 모바일 블록 변경 버튼 설정
    this.setupSwitchBlockButton();
    
    this.SoundManager.init();
    this.SoundManager.startBGM();

    this.startLoop();
  }
  
  /**
   * 모바일 블록 변경 버튼 설정
   */
  setupSwitchBlockButton() {
    const switchBtn = document.getElementById("switch-block-btn");
    if (!switchBtn) return;
    
    // 퍼즐 모드에서만 표시
    switchBtn.style.display = "block";
    
    // 기존 이벤트 제거 후 새로 등록
    const newBtn = switchBtn.cloneNode(true);
    switchBtn.parentNode.replaceChild(newBtn, switchBtn);
    
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.switchToNextBlock();
    });
    
    newBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.switchToNextBlock();
    }, { passive: false });
  }
  
  /**
   * 다음 사용 가능한 블록으로 변경
   */
  switchToNextBlock() {
    if (!this.state.isPuzzleMode || !this.state.puzzleBlocks) return;
    
    // 현재 인덱스에서 다음 사용 가능한 블록 찾기
    let nextIndex = -1;
    const totalBlocks = this.state.puzzleBlocks.length;
    
    for (let i = 1; i <= totalBlocks; i++) {
      const checkIndex = (this.state.currentPuzzleBlockIndex + i) % totalBlocks;
      if (!this.state.puzzleBlocks[checkIndex].used) {
        nextIndex = checkIndex;
        break;
      }
    }
    
    if (nextIndex !== -1 && nextIndex !== this.state.currentPuzzleBlockIndex) {
      this.selectPuzzleBlock(nextIndex);
      debugLog("Tetris", "블록 변경:", this.state.puzzleBlocks[nextIndex].type);
    }
  }
  
  /**
   * 난이도별 퍼즐 설정
   */
  getPuzzleSettings(difficulty) {
    // 난이도별 설정 (목표 라인은 항상 3줄 고정)
    // 스테이지 1-2: 블록 3개, 회전 0개
    // 스테이지 3-4: 블록 4개, 회전 0개
    // 스테이지 5-6: 블록 4개, 회전 1개
    // 스테이지 7-8: 블록 5개, 회전 1개
    // 스테이지 9+: 블록 5개, 회전 2개
    
    let blockCount, rotationRequired;
    const linesTarget = 3; // 항상 3줄 클리어 목표
    
    if (difficulty <= 2) {
      blockCount = 3;
      rotationRequired = 0;
    } else if (difficulty <= 4) {
      blockCount = 4;
      rotationRequired = 0;
    } else if (difficulty <= 6) {
      blockCount = 4;
      rotationRequired = 1;
    } else if (difficulty <= 8) {
      blockCount = 5;
      rotationRequired = 1;
    } else {
      blockCount = 5;
      rotationRequired = 2;
    }
    
    debugLog("Tetris", `난이도 ${difficulty}: 블록 ${blockCount}개, 회전 ${rotationRequired}개, 목표 ${linesTarget}줄`);
    
    return {
      blockCount,
      rotationRequired,
      linesTarget,
    };
  }
  
  /**
   * 역방향 생성으로 퍼즐 생성 (올바른 버전)
   * 핵심: 3줄을 꽉 채운 후, 블록 모양으로만 구멍 뚫기
   * 이렇게 하면 플레이어가 블록을 배치하면 정확히 3줄이 완성됨
   */
  generatePuzzle(settings) {
    const { blockCount, rotationRequired } = settings;
    const TARGET_LINES = this.state.puzzleLinesTarget; // 3줄
    
    // 1. 바닥 TARGET_LINES 줄을 꽉 채우기 (구멍 없이!)
    const grid = Array(this.CONFIG.GRID_HEIGHT)
      .fill()
      .map(() => Array(this.CONFIG.GRID_WIDTH).fill(null));
    
    const colors = Object.values(this.CONFIG.COLORS).filter(
      c => c !== this.CONFIG.COLORS.GHOST && c !== this.CONFIG.COLORS.GRID
    );
    
    // 바닥 3줄 꽉 채우기
    for (let y = 0; y < TARGET_LINES; y++) {
      for (let x = 0; x < this.CONFIG.GRID_WIDTH; x++) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        grid[y][x] = { color: randomColor, type: this.SPECIAL_TYPES.NONE };
      }
    }
    
    debugLog("Tetris", "바닥", TARGET_LINES, "줄 꽉 채움");
    
    // 2. 블록 모양으로 구멍 뚫기 (각 줄에 최소 1개씩 분산)
    const blocks = [];
    const tetrominoTypes = Object.keys(this.TETROMINOS);
    
    // 각 줄에 최소 1개 구멍 보장하기 위해 줄별로 블록 배치
    const rowsNeedingHoles = new Set();
    for (let y = 0; y < TARGET_LINES; y++) {
      rowsNeedingHoles.add(y);
    }
    
    for (let i = 0; i < blockCount; i++) {
      const type = tetrominoTypes[Math.floor(Math.random() * tetrominoTypes.length)];
      let shape = JSON.parse(JSON.stringify(this.TETROMINOS[type].shape));
      const color = this.TETROMINOS[type].color;
      
      // 회전 적용 (난이도에 따라)
      let rotations = 0;
      if (i < rotationRequired) {
        rotations = 1 + Math.floor(Math.random() * 3);
        for (let r = 0; r < rotations; r++) {
          shape = this.rotateShape(shape);
        }
      }
      
      // 배치 위치 찾기 (TARGET_LINES 내에서, 꽉 찬 셀에만)
      const position = this.findCarvePositionStrict(grid, shape, TARGET_LINES, rowsNeedingHoles);
      
      if (position) {
        // 구멍 뚫기
        this.carveShape(grid, shape, position.x, position.y);
        
        // 뚫은 줄 기록
        for (let sy = 0; sy < shape.length; sy++) {
          for (let sx = 0; sx < shape[sy].length; sx++) {
            if (shape[sy][sx]) {
              rowsNeedingHoles.delete(position.y + sy);
            }
          }
        }
        
        // 원래 모양으로 블록 저장
        const originalShape = JSON.parse(JSON.stringify(this.TETROMINOS[type].shape));
        blocks.push({
          type,
          shape: originalShape,
          color,
          rotationsToSolve: rotations,
          used: false,
        });
        
        debugLog("Tetris", "블록 추가:", type, "위치:", position, "회전:", rotations);
      } else {
        debugLog("Tetris", "블록 배치 불가:", type);
      }
    }
    
    // 3. 아직 구멍 없는 줄이 있으면 추가 처리
    if (rowsNeedingHoles.size > 0) {
      debugLog("Tetris", "구멍 없는 줄 있음:", [...rowsNeedingHoles]);
      
      // 각 줄에 강제로 구멍 뚫기
      for (const y of rowsNeedingHoles) {
        // 랜덤 위치에 구멍 하나 뚫기
        const x = Math.floor(Math.random() * this.CONFIG.GRID_WIDTH);
        if (grid[y][x] !== null) {
          grid[y][x] = null;
          debugLog("Tetris", "줄", y, "에 강제 구멍 추가 at x:", x);
        }
      }
    }
    
    // 블록 순서 섞기
    this.shuffleArray(blocks);
    
    // 디버그: 각 줄 상태 출력
    let totalHoles = 0;
    for (let y = 0; y < TARGET_LINES; y++) {
      const filledCount = grid[y].filter(cell => cell !== null).length;
      const holesCount = this.CONFIG.GRID_WIDTH - filledCount;
      totalHoles += holesCount;
      debugLog("Tetris", `줄 ${y}: ${filledCount}/${this.CONFIG.GRID_WIDTH} 채움, 구멍 ${holesCount}개`);
    }
    
    const totalBlockCells = blocks.length * 4; // 테트로미노는 각 4칸
    debugLog("Tetris", `총 구멍: ${totalHoles}개, 블록 칸: ${totalBlockCells}칸`);
    debugLog("Tetris", "생성 완료, 블록 수:", blocks.length);
    
    return { grid, blocks };
  }
  
  /**
   * 블록을 조각할 수 있는 위치 찾기 (꽉 찬 셀에만, 우선순위 줄 고려)
   */
  findCarvePositionStrict(grid, shape, maxY, priorityRows) {
    const positions = [];
    const priorityPositions = [];
    
    for (let y = 0; y <= maxY - shape.length; y++) {
      for (let x = 0; x < this.CONFIG.GRID_WIDTH; x++) {
        if (this.canCarveAtStrict(grid, shape, x, y, maxY)) {
          const pos = { x, y };
          positions.push(pos);
          
          // 우선순위 줄에 포함되는지 확인
          for (let sy = 0; sy < shape.length; sy++) {
            if (priorityRows.has(y + sy)) {
              priorityPositions.push(pos);
              break;
            }
          }
        }
      }
    }
    
    // 우선순위 위치가 있으면 그쪽에서 선택
    if (priorityPositions.length > 0) {
      return priorityPositions[Math.floor(Math.random() * priorityPositions.length)];
    }
    
    if (positions.length === 0) return null;
    return positions[Math.floor(Math.random() * positions.length)];
  }
  
  /**
   * 해당 위치에 구멍을 뚫을 수 있는지 확인 (모든 셀이 채워져 있어야 함)
   */
  canCarveAtStrict(grid, shape, startX, startY, maxY) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const gridX = (startX + x) % this.CONFIG.GRID_WIDTH;
          const gridY = startY + y;
          
          if (gridY >= maxY) return false;
          if (gridY >= this.CONFIG.GRID_HEIGHT) return false;
          if (grid[gridY][gridX] === null) return false; // 이미 구멍이면 안됨
        }
      }
    }
    return true;
  }
  
  
  /**
   * 해당 위치에 구멍을 뚫을 수 있는지 확인
   */
  canCarveAt(grid, shape, startX, startY, maxY) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const gridX = (startX + x) % this.CONFIG.GRID_WIDTH;
          const gridY = startY + y;
          
          if (gridY >= maxY) return false; // 바닥 영역을 벗어남
          if (gridY >= this.CONFIG.GRID_HEIGHT) return false;
          if (grid[gridY][gridX] === null) return false; // 이미 구멍
        }
      }
    }
    return true;
  }
  
  /**
   * 그리드에 구멍 뚫기
   */
  carveShape(grid, shape, startX, startY) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const gridX = (startX + x) % this.CONFIG.GRID_WIDTH;
          const gridY = startY + y;
          grid[gridY][gridX] = null;
        }
      }
    }
  }
  
  /**
   * 모양 회전
   */
  rotateShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];
    
    for (let x = 0; x < cols; x++) {
      rotated.push([]);
      for (let y = rows - 1; y >= 0; y--) {
        rotated[x].push(shape[y][x]);
      }
    }
    return rotated;
  }
  
  /**
   * 배열 섞기
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  /**
   * 퍼즐 블록 선택
   */
  selectPuzzleBlock(index) {
    debugLog("Tetris", "selectPuzzleBlock 호출, index:", index, "총 블록수:", this.state.puzzleBlocks.length);
    
    if (index < 0 || index >= this.state.puzzleBlocks.length) {
      debugLog("Tetris", "인덱스 범위 초과");
      return;
    }
    if (this.state.puzzleBlocks[index].used) {
      debugLog("Tetris", "이미 사용된 블록");
      return;
    }
    
    this.state.currentPuzzleBlockIndex = index;
    const block = this.state.puzzleBlocks[index];
    
    // 현재 조각 설정
    this.state.currentPiece = {
      type: block.type,
      shape: JSON.parse(JSON.stringify(block.shape)),
      color: block.color,
      x: Math.floor(this.CONFIG.GRID_WIDTH / 2) - Math.floor(block.shape[0].length / 2),
      y: this.CONFIG.GRID_HEIGHT - 1, // 퍼즐 모드: 상단에서 시작
      specialType: this.SPECIAL_TYPES.NONE,
    };
    
    debugLog("Tetris", "블록 선택됨:", block.type, "currentPiece:", this.state.currentPiece);
    
    // render()에서 자동으로 시각화됨
    this.updatePuzzleUI();
  }
  
  /**
   * 퍼즐 모드용 고스트 Y 위치 계산
   */
  getGhostY() {
    if (!this.state.currentPiece) return 0;
    
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
    return ghostY;
  }
  
  /**
   * 퍼즐 모드에서 블록 배치
   */
  placePuzzlePiece() {
    if (!this.state.isPuzzleMode) return;
    if (!this.state.currentPiece) return;
    
    const piece = this.state.currentPiece;
    const ghostY = this.getGhostY();
    
    // 데드라인 체크 (상단 3줄 이상이면 실패)
    const DEADLINE_Y = this.CONFIG.GRID_HEIGHT - 3; // y=17 이상이면 데드라인
    if (ghostY >= DEADLINE_Y) {
      debugLog("Tetris", "데드라인 초과! ghostY:", ghostY, "DEADLINE:", DEADLINE_Y);
      this.puzzleFail();
      return;
    }
    
    // 배치 (y축은 아래로 감소)
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const gridX = (piece.x + x + this.CONFIG.GRID_WIDTH * 10) % this.CONFIG.GRID_WIDTH;
          const gridY = ghostY - y;
          
          if (gridY >= 0 && gridY < this.CONFIG.GRID_HEIGHT) {
            this.state.grid[gridY][gridX] = {
              color: piece.color,
              type: piece.specialType || this.SPECIAL_TYPES.NONE,
            };
          }
        }
      }
    }
    
    // 블록 사용 처리
    this.state.puzzleBlocks[this.state.currentPuzzleBlockIndex].used = true;
    
    this.SoundManager.drop();
    this.refreshGridVisuals();
    
    // 라인 체크
    this.checkPuzzleLines();
    
    // 다음 블록 선택
    this.selectNextAvailablePuzzleBlock();
  }
  
  /**
   * 다음 사용 가능한 블록 선택
   */
  selectNextAvailablePuzzleBlock() {
    // 이미 목표 달성했으면 스킵
    if (this.state.linesClearedStage >= this.state.puzzleLinesTarget) {
      debugLog("Tetris", "이미 목표 달성됨, 다음 블록 선택 스킵");
      return;
    }
    
    const nextIndex = this.state.puzzleBlocks.findIndex((b, i) => 
      i > this.state.currentPuzzleBlockIndex && !b.used
    );
    
    debugLog("Tetris", "다음 블록 검색, nextIndex:", nextIndex, "currentIndex:", this.state.currentPuzzleBlockIndex);
    
    if (nextIndex !== -1) {
      this.selectPuzzleBlock(nextIndex);
    } else {
      // 앞에서부터 다시 검색
      const firstAvailable = this.state.puzzleBlocks.findIndex(b => !b.used);
      debugLog("Tetris", "앞에서 검색, firstAvailable:", firstAvailable);
      
      if (firstAvailable !== -1) {
        this.selectPuzzleBlock(firstAvailable);
      } else {
        // 모든 블록 사용됨 - 블록 리셋하고 계속!
        debugLog("Tetris", "모든 블록 사용됨, 블록 리셋하고 계속 진행");
        this.resetPuzzleBlocks();
        this.selectPuzzleBlock(0);
      }
    }
  }
  
  /**
   * 퍼즐 블록 리셋 (새로운 랜덤 블록 생성)
   */
  resetPuzzleBlocks() {
    const tetrominoTypes = Object.keys(this.TETROMINOS);
    const blockCount = this.state.puzzleBlocks.length || 3;
    
    // 새로운 랜덤 블록 생성
    this.state.puzzleBlocks = [];
    for (let i = 0; i < blockCount; i++) {
      const type = tetrominoTypes[Math.floor(Math.random() * tetrominoTypes.length)];
      const template = this.TETROMINOS[type];
      
      this.state.puzzleBlocks.push({
        type,
        shape: JSON.parse(JSON.stringify(template.shape)),
        color: template.color,
        rotationsToSolve: 0,
        used: false,
      });
    }
    
    // 섞기
    this.shuffleArray(this.state.puzzleBlocks);
    
    this.state.currentPuzzleBlockIndex = 0;
    debugLog("Tetris", "새 블록 생성:", this.state.puzzleBlocks.map(b => b.type).join(", "));
  }
  
  /**
   * 퍼즐 라인 체크
   */
  checkPuzzleLines() {
    let linesCleared = [];
    
    for (let y = 0; y < this.CONFIG.GRID_HEIGHT; y++) {
      if (this.state.grid[y].every(cell => cell !== null)) {
        linesCleared.push(y);
      }
    }
    
    debugLog("Tetris", "라인 체크 - 클리어된 줄:", linesCleared.length, "현재 총:", this.state.linesClearedStage, "목표:", this.state.puzzleLinesTarget);
    
    if (linesCleared.length > 0) {
      debugLog("Tetris", "Puzzle lines cleared", {
        count: linesCleared.length,
        total: this.state.linesClearedStage,
        target: this.state.puzzleLinesTarget,
        isBossFight: this.state.isBossFight,
        isPuzzleMode: this.state.isPuzzleMode,
        onLineCleared: !!this.onLineCleared,
      });
      // 라인 제거 연출
      linesCleared.forEach(y => this.createExplosion(y));
      
      // 라인 제거 (위에서 아래로 정렬 후 삭제 + 맨 위에 빈 줄 추가)
      linesCleared.sort((a, b) => b - a);
      
      linesCleared.forEach(y => {
        // 해당 줄 제거
        this.state.grid.splice(y, 1);
        // 맨 위에 빈 줄 추가 (일반 테트리스 방식)
        this.state.grid.push(Array(this.CONFIG.GRID_WIDTH).fill(null));
      });
      
      this.state.linesClearedStage += linesCleared.length;
      
      // 점수
      const baseScore = linesCleared.length * 100 * linesCleared.length;
      this.updateScore(this.state.score + baseScore);
      
      this.refreshGridVisuals();
      
      debugLog("Tetris", "클리어 후 총 라인:", this.state.linesClearedStage);
      
      // 목표 달성 체크 - 달성 시 클리어 메시지만, 미달성 시 라인 클리어 메시지
      if (this.state.linesClearedStage >= this.state.puzzleLinesTarget) {
        debugLog("Tetris", "목표 달성! 퍼즐 클리어");
        // 마지막 클리어 시 라인 메시지 생략 (FIREWALL BREACHED만 표시)
        this.puzzleClear();
      } else {
        // 목표 미달성 시에만 라인 클리어 콜백 호출 (디펜스에 파동 효과)
        if (this.onLineCleared) {
          debugLog("Tetris", "Calling onLineCleared", this.state.linesClearedStage);
          this.onLineCleared(this.state.linesClearedStage);
        }
      }
    }
  }
  
  /**
   * 퍼즐 완료 체크 (모든 블록 사용 후)
   */
  checkPuzzleComplete() {
    debugLog("Tetris", "checkPuzzleComplete - 현재:", this.state.linesClearedStage, "목표:", this.state.puzzleLinesTarget);
    
    if (this.state.linesClearedStage >= this.state.puzzleLinesTarget) {
      debugLog("Tetris", "성공! 퍼즐 클리어");
      this.puzzleClear();
    } else {
      debugLog("Tetris", "실패! 목표 미달성");
      this.puzzleFail();
    }
  }
  
  /**
   * 퍼즐 클리어
   */
  puzzleClear() {
    this.state.isLogicActive = false;
    this.SoundManager.stopBGM();
    this.SoundManager.playTone({ start: 400, end: 800 }, "sine", 0.5, 0.3);
    
    // 블록 변경 버튼 숨기기
    this.hideSwitchBlockButton();
    
    // 성공 메시지 표시
    this.showPuzzleResultMessage(true);
    
    this.playClearEffect();
    
    if (this.onStageClear) this.onStageClear(this.state.linesClearedStage);
  }
  
  /**
   * 퍼즐 실패
   */
  puzzleFail() {
    this.state.isLogicActive = false;
    this.SoundManager.stopBGM();
    this.SoundManager.playTone({ start: 400, end: 200 }, "sawtooth", 0.5, 0.5);
    
    // 블록 변경 버튼 숨기기
    this.hideSwitchBlockButton();
    
    // 실패 메시지 표시
    this.showPuzzleResultMessage(false);
    
    if (this.onPuzzleFail) {
      this.onPuzzleFail();
    } else if (this.onGameOver) {
      this.onGameOver(this.state.score);
    }
  }
  
  /**
   * 블록 변경 버튼 숨기기
   */
  hideSwitchBlockButton() {
    const switchBtn = document.getElementById("switch-block-btn");
    if (switchBtn) {
      switchBtn.style.display = "none";
    }
  }
  
  /**
   * 퍼즐 결과 메시지 표시 (중앙, 터미널 스타일)
   */
  showPuzzleResultMessage(isSuccess) {
    // 기존 메시지 제거
    const existing = document.getElementById("puzzle-result-msg");
    if (existing) existing.remove();
    
    const msg = document.createElement("div");
    msg.id = "puzzle-result-msg";
    
    const title = isSuccess ? "FIREWALL BREACHED!!" : "BREACH FAILED";
    const subtitle = isSuccess ? "System Access Granted" : "Connection Terminated";
    const color = isSuccess ? "#0f0" : "#f00";
    const glowColor = isSuccess ? "0, 255, 0" : "255, 0, 0";
    
    msg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      text-align: center;
      font-family: "Galmuri11", "VT323", monospace;
      pointer-events: none;
      animation: puzzleResultAnim 2.5s ease-out forwards;
    `;
    
    msg.innerHTML = `
      <div style="
        color: ${color}; 
        font-size: 36px; 
        font-weight: bold;
        text-shadow: 0 0 10px rgba(${glowColor}, 0.8), 
                     0 0 20px rgba(${glowColor}, 0.6), 
                     0 0 40px rgba(${glowColor}, 0.4);
        letter-spacing: 3px;
        animation: puzzleResultGlitch 0.1s infinite;
      ">
        ${title}
      </div>
      <div style="
        color: ${color}; 
        font-size: 16px; 
        margin-top: 15px;
        opacity: 0.8;
        letter-spacing: 2px;
      ">
        ${subtitle}
      </div>
      <div style="
        color: ${color}; 
        font-size: 12px; 
        margin-top: 20px;
        opacity: 0.6;
      ">
        [${this.state.linesClearedStage}/${this.state.puzzleLinesTarget} LINES]
      </div>
    `;
    
    // 애니메이션 스타일 추가
    if (!document.getElementById("puzzle-result-style")) {
      const style = document.createElement("style");
      style.id = "puzzle-result-style";
      style.textContent = `
        @keyframes puzzleResultAnim {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          10% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          20% { transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes puzzleResultGlitch {
          0% { text-shadow: 2px 0 #f00, -2px 0 #0ff; }
          25% { text-shadow: -2px 0 #f00, 2px 0 #0ff; }
          50% { text-shadow: 2px 2px #f00, -2px -2px #0ff; }
          75% { text-shadow: -2px 2px #f00, 2px -2px #0ff; }
          100% { text-shadow: 0 0 #f00, 0 0 #0ff; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(msg);
    
    // 2.5초 후 제거
    setTimeout(() => {
      if (msg.parentNode) msg.remove();
    }, 2500);
  }
  
  /**
   * 퍼즐 UI 업데이트 (현재 블록만 표시)
   */
  updatePuzzleUI() {
    // 기존 next-box의 캔버스 사용 (drawNextPiece와 동일한 방식)
    if (!this.nextCtx) {
      debugLog("Tetris", "nextCtx 없음");
      return;
    }
    
    const ctx = this.nextCtx;
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 현재 선택된 블록 가져오기
    if (!this.state.puzzleBlocks || this.state.puzzleBlocks.length === 0) {
      return;
    }
    
    const currentBlock = this.state.puzzleBlocks[this.state.currentPuzzleBlockIndex];
    if (!currentBlock || currentBlock.used) {
      // 사용 안 한 다음 블록 찾기
      const nextAvailable = this.state.puzzleBlocks.find(b => !b.used);
      if (!nextAvailable) return;
    }
    
    const block = currentBlock;
    const blockSize = 14;
    
    // 블록 중앙에 그리기
    const shapeWidth = block.shape[0].length * blockSize;
    const shapeHeight = block.shape.length * blockSize;
    const startX = (canvas.width - shapeWidth) / 2;
    const startY = (canvas.height - shapeHeight) / 2;
    
    // 블록 그리기
    block.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          // 메인 색상
          ctx.fillStyle = `#${block.color.toString(16).padStart(6, '0')}`;
          ctx.fillRect(
            startX + x * blockSize,
            startY + y * blockSize,
            blockSize - 2,
            blockSize - 2
          );
          
          // 하이라이트 (위, 왼쪽)
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.fillRect(startX + x * blockSize, startY + y * blockSize, blockSize - 2, 2);
          ctx.fillRect(startX + x * blockSize, startY + y * blockSize, 2, blockSize - 2);
          
          // 그림자 (아래, 오른쪽)
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.fillRect(startX + x * blockSize, startY + y * blockSize + blockSize - 4, blockSize - 2, 2);
          ctx.fillRect(startX + x * blockSize + blockSize - 4, startY + y * blockSize, 2, blockSize - 2);
        }
      });
    });
    
    // 블록 남은 개수 표시
    const remaining = this.state.puzzleBlocks.filter(b => !b.used).length;
    ctx.fillStyle = "#0f0";
    ctx.font = "bold 10px 'Galmuri11', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${remaining}/${this.state.puzzleBlocks.length}`, canvas.width / 2, canvas.height - 5);
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

  // 줄 클리어 시 원통을 휘감는 빛의 링
  createClearWave(gridY, delayIndex = 0) {
    const CELL_HEIGHT =
      (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
    const yPos = gridY * CELL_HEIGHT + CELL_HEIGHT / 2;

    const geometry = new THREE.TorusGeometry(this.CONFIG.RADIUS + 0.4, 0.18, 8, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yPos;
    ring.userData = { life: 1.0, delay: delayIndex * 0.08 };
    this.effectGroup.add(ring);
    this.clearWaves.push(ring);
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
    if (!this.state.isPlaying || !this.state.isLogicActive) return;
    
    // 퍼즐 모드: 숫자키로 블록 선택
    if (this.state.isPuzzleMode) {
      const numKey = parseInt(e.key);
      if (numKey >= 1 && numKey <= this.state.puzzleBlocks.length) {
        this.selectPuzzleBlock(numKey - 1);
        return;
      }
    }
    
    if (e.key === "ArrowLeft") this.moveHorizontal(-1);
    if (e.key === "ArrowRight") this.moveHorizontal(1);
    if (e.key === "ArrowUp") this.rotatePiece();
    if (e.key === "ArrowDown") this.softDrop();
    if (e.key === " ") this.hardDrop();
  }

  moveHorizontal(dir) {
    // 보스전 역조작 효과
    if (this.state.isBossFight && this.state.bossInterference.reverse) {
      dir = -dir;
    }
    
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
    // 퍼즐 모드에서는 바로 배치
    if (this.state.isPuzzleMode) {
      this.placePuzzlePiece();
      return;
    }
    
    while (
      !this.checkCollision(
        this.state.currentPiece.x,
        this.state.currentPiece.y - 1,
        this.state.currentPiece.shape
      )
    ) {
      this.state.currentPiece.y--;
    }
    // 하드드롭 임팩트: 카메라 펀치 + 묵직한 착지음
    this.cameraShake = Math.max(this.cameraShake, 0.6);
    this.SoundManager.playTone({ start: 150, end: 40 }, "triangle", 0.18, 0.3);
    this.lockPiece();
  }

  gameOver() {
    // 퍽 효과: 부활 (Revive)
    if (this.consumeRevive && this.consumeRevive()) {
      debugLog("Tetris", "Backup Protocol Activated! Reviving...");
      this.SoundManager.playTone(
        { start: 200, end: 600 },
        "sawtooth",
        0.8,
        0.5
      ); // 부활 사운드

      // 바닥 5줄 삭제
      const rowsToRemove = 5;
      // 바닥이 index 0이므로, 0번 인덱스를 5번 삭제하고 위를 채워넣음
      for (let i = 0; i < rowsToRemove; i++) {
        this.state.grid.splice(0, 1);
        this.state.grid.push(Array(this.CONFIG.GRID_WIDTH).fill(null));
      }

      this.refreshGridVisuals();

      // 부활 메시지 (GameManager가 처리해주면 좋겠지만 여기서 처리)
      const ui = document.getElementById("game-ui");
      if (ui) {
        const msg = document.createElement("div");
        msg.innerText = "SYSTEM RECOVERED";
        msg.style.position = "absolute";
        msg.style.top = "50%";
        msg.style.width = "100%";
        msg.style.textAlign = "center";
        msg.style.color = "#00ffff";
        msg.style.fontSize = "40px";
        msg.style.textShadow = "0 0 10px #00ffff";
        msg.style.zIndex = "999";
        msg.style.fontFamily = "var(--term-font)";
        ui.appendChild(msg);

        setTimeout(() => msg.remove(), 2000);
      }

      return; // 게임 오버 취소
    }

    this.SoundManager.gameOver();
    this.state.isPlaying = false;

    if (this.onGameOver) this.onGameOver(this.state.score);
    else {
      const gameOverScreen = document.getElementById("game-over-screen");
      if (gameOverScreen) gameOverScreen.classList.remove("hidden");
      const finalScore = document.getElementById("final-score");
      if (finalScore) finalScore.innerText = this.state.score;
    }

    debugLog("Tetris", "GAME OVER");
  }

  // 재시작 시 루프 중첩을 막는 단일 진입점
  startLoop() {
    this.state.lastTime = Date.now();
    if (this._animLoopActive) return;
    this._animLoopActive = true;
    this.animate();
  }

  animate() {
    if (!this.state.isPlaying) {
      this._animLoopActive = false;
      return;
    }
    requestAnimationFrame(() => this.animate());

    const now = Date.now();
    const deltaTime = now - this.state.lastTime;
    this.state.lastTime = now;

    this.update(deltaTime);
    this.render();
  }

  update(deltaTime) {
    // 매트릭스 이펙트 업데이트 (게임 로직 정지 여부와 상관없이 계속 돔)
    if (this.matrixMesh && this.matrixMesh.visible) {
      this.updateMatrixEffect(deltaTime);
    }

    if (!this.state.isLogicActive) return; // 로직 정지 시 하단 코드 실행 안함

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

    for (let i = this.clearWaves.length - 1; i >= 0; i--) {
      const ring = this.clearWaves[i];
      if (ring.userData.delay > 0) {
        ring.userData.delay -= deltaTime / 1000;
        continue;
      }
      ring.userData.life -= deltaTime / 400;
      if (ring.userData.life <= 0) {
        ring.geometry.dispose();
        ring.material.dispose();
        this.effectGroup.remove(ring);
        this.clearWaves.splice(i, 1);
        continue;
      }
      const grow = 1 + (1 - ring.userData.life) * 0.5;
      ring.scale.set(grow, grow, 1);
      ring.material.opacity = ring.userData.life * 0.9;
    }

    if (this.cameraShake > 0) {
      this.cameraShake *= 0.9;
      if (this.cameraShake < 0.05) this.cameraShake = 0;
    }

    // 자동 드롭 (퍼즐 모드에서도 활성화)
    this.state.dropTimer += deltaTime;
    let dropSpeed = this.state.isPuzzleMode ? 1500 : this.CONFIG.DROP_SPEED; // 퍼즐 모드는 느리게
    
    // 보스전 가속 효과
    if (this.state.isBossFight && this.state.bossInterference.speedup) {
      dropSpeed = dropSpeed / 2; // 2배 빠르게
    }
    
    if (this.state.dropTimer > dropSpeed) {
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
        // 퍼즐 모드에서 바닥에 닿으면 배치
        if (this.state.isPuzzleMode) {
          this.placePuzzlePiece();
        } else {
          this.lockPiece();
        }
      }
    }

    if (this.particleSystem) {
      this.particleSystem.rotation.y += 0.0005;
    }

    this.updateCamera();
  }

  // 게임 클리어 연출 (아스키 매트릭스 - 그리드 기반 Fill Up)
  playClearEffect() {
    debugLog("Tetris", "Playing Clear Effect...");

    // 1. 기존 블록 숨기기
    this.piecesGroup.visible = false;
    this.ghostGroup.visible = false;

    // 2. 오클루더(기둥 가림막) 유지 (사용자 요청: 투명해질 필요 없음)
    // if (this.occluderCylinder) this.occluderCylinder.visible = false;

    // 3. 매트릭스 실린더 생성
    if (!this.matrixMesh) {
      const CELL_HEIGHT =
        (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
      const TOTAL_HEIGHT = this.CONFIG.GRID_HEIGHT * CELL_HEIGHT;
      const radius = this.CONFIG.RADIUS * 1.05; // 블록보다 약간 앞

      const geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        TOTAL_HEIGHT,
        32,
        1,
        true // openEnded
      );

      // 캔버스 생성 (그리드 비율에 맞춤: 12 x 20 -> 600 x 1000)
      this.matrixCanvas = document.createElement("canvas");
      this.matrixCanvas.width = 600;
      this.matrixCanvas.height = 1000;
      this.matrixCtx = this.matrixCanvas.getContext("2d");

      this.matrixTexture = new THREE.CanvasTexture(this.matrixCanvas);
      this.matrixTexture.minFilter = THREE.LinearFilter;
      this.matrixTexture.magFilter = THREE.LinearFilter;
      // 텍스처 반복 설정 불필요 (1:1 매핑)

      const material = new THREE.MeshBasicMaterial({
        map: this.matrixTexture,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false, // 겹침 허용
        depthTest: true, // 오클루더에 의해 가려짐 (기둥 뒤로 안 보이게)
      });

      this.matrixMesh = new THREE.Mesh(geometry, material);
      this.matrixMesh.position.y = TOTAL_HEIGHT / 2;
      this.scene.add(this.matrixMesh);
    }

    this.matrixMesh.visible = true;
    this.matrixEffectTime = 0; // 타이머 리셋
  }

  updateMatrixEffect(deltaTime) {
    if (!this.matrixCtx) return;

    this.matrixEffectTime += deltaTime;
    const ctx = this.matrixCtx;
    const w = this.matrixCanvas.width;
    const h = this.matrixCanvas.height;

    // 화면 지우기
    ctx.clearRect(0, 0, w, h);

    const cols = 12; // GRID_WIDTH
    const rows = 20; // GRID_HEIGHT
    const cellW = w / cols;
    const cellH = h / rows;

    // 폰트 설정
    ctx.font = "bold 40px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 애니메이션: 아래에서 위로 차오름 (2초 동안 20칸)
    // speed = 10칸/초 = 0.01칸/ms
    const speed = 0.01;
    const progress = this.matrixEffectTime * speed;
    const visibleRows = Math.floor(progress); // 정수 단위로 끊어서 "한칸한칸" 느낌

    for (let r = 0; r < rows; r++) {
      // r=0이 바닥, r=19가 꼭대기.
      // 현재 차오른 높이(visibleRows)보다 높은 곳은 그리지 않음
      if (r > visibleRows) continue;

      for (let c = 0; c < cols; c++) {
        // 각 칸마다 랜덤 아스키 그리기
        const char = String.fromCharCode(0x30a0 + Math.random() * 96);

        // 맨 윗줄(방금 켜진 줄)은 흰색 강조, 그 아래는 초록색
        const isHead = r === visibleRows;
        const alpha = 0.5 + Math.random() * 0.5;

        if (isHead) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.shadowBlur = 15;
          ctx.shadowColor = "white";
        } else {
          ctx.fillStyle = `rgba(0, 255, 50, ${alpha})`;
          ctx.shadowBlur = 0;
        }

        // 좌표 변환: 캔버스 y는 위에서 아래로 증가, 게임 r은 아래에서 위로 증가
        // r=0 -> y = h - cellH/2
        const cx = c * cellW + cellW / 2;
        const cy = h - (r * cellH + cellH / 2);

        ctx.fillText(char, cx, cy);
      }
    }

    this.matrixTexture.needsUpdate = true;
  }

  resetScene() {
    // 게임 재시작 시 호출 필요
    if (this.matrixMesh) {
      this.matrixMesh.visible = false;
    }
    this.piecesGroup.visible = true;
    this.ghostGroup.visible = true;
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
    // 풀링된 메쉬들 일단 모두 숨김 (재사용을 위해)
    // 최적화: 사용된 것만 visible=true로 하고, 나머지는 false로 둠.
    // 일단 전체 false 처리 후 필요한 것만 켠다.
    for (let i = 0; i < this.activeMeshPool.length; i++) {
      this.activeMeshPool[i].visible = false;
    }

    if (!this.state.currentPiece) return;

    let poolIndex = 0;

    // 내부 헬퍼: 풀에서 메쉬 가져오기
    const getMesh = () => {
      if (poolIndex >= this.activeMeshPool.length) {
        // 풀 확장
        const mesh = new THREE.Mesh(
          this.sharedGeometry,
          this.sharedMaterials[Object.keys(this.CONFIG.COLORS)[0]]
        );
        this.activeGroup.add(mesh);
        this.activeMeshPool.push(mesh);
      }
      return this.activeMeshPool[poolIndex++];
    };

    // 내부 헬퍼: 메쉬 업데이트 (좌표 및 재질 설정)
    const updateMesh = (gx, gy, blockInfo, isGhost) => {
      const mesh = getMesh();
      mesh.visible = true;

      const CELL_HEIGHT =
        (2 * Math.PI * this.CONFIG.RADIUS) / this.CONFIG.GRID_WIDTH;
      const angle = (gx / this.CONFIG.GRID_WIDTH) * Math.PI * 2;
      const r = this.CONFIG.RADIUS;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const y = gy * CELL_HEIGHT;

      mesh.position.set(x, y, z);
      mesh.rotation.y = angle;
      mesh.lookAt(new THREE.Vector3(x * 2, y, z * 2));

      // Material 설정
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
      mesh.material = mat;
    };

    // 1. Ghost 렌더링
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
            updateMesh(gx, gy, p.color, true); // Ghost
          }
        }
      }
    }

    // 2. Active Block 렌더링
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

          updateMesh(gx, gy, { color: p.color, type: blockType }, false); // Active
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
  
  // ============ 보스전 방해 시스템 ============
  
  /**
   * 보스전 모드 시작
   */
  startBossFight(bossManager) {
    this.bossManager = bossManager;
    this.state.isBossFight = true;
    this.state.bossInterference = {
      blackout: false,
      speedup: false,
      reverse: false,
      glitchIntensity: 0,
    };
    debugLog("Boss", "Boss fight mode started");
  }
  
  /**
   * 보스전 모드 종료
   */
  endBossFight() {
    this.bossManager = null;
    this.state.isBossFight = false;
    this.state.bossInterference = {
      blackout: false,
      speedup: false,
      reverse: false,
      glitchIntensity: 0,
    };
    debugLog("Boss", "Boss fight mode ended");
  }
  
  /**
   * 보스 방해 효과 적용
   * @param {string} type - 방해 타입 (garbage, blackout, speedup, reverse)
   */
  applyBossInterference(type) {
    if (!this.state.isBossFight) return;
    
    debugLog("Boss", `Boss interference: ${type}`);
    
    switch (type) {
      case 'garbage':
        this.addGarbageLines(1);
        break;
        
      case 'blackout':
        this.state.bossInterference.blackout = true;
        setTimeout(() => {
          this.state.bossInterference.blackout = false;
        }, 3000); // 3초 동안
        break;
        
      case 'speedup':
        this.state.bossInterference.speedup = true;
        setTimeout(() => {
          this.state.bossInterference.speedup = false;
        }, 3000); // 3초 동안
        break;
        
      case 'reverse':
        this.state.bossInterference.reverse = true;
        setTimeout(() => {
          this.state.bossInterference.reverse = false;
        }, 3000); // 3초 동안
        break;
    }
  }
  
  /**
   * 쓰레기 블록 줄 추가 (맨 아래에 구멍 뚫린 줄)
   * @param {number} count - 추가할 줄 수
   */
  addGarbageLines(count = 1) {
    for (let i = 0; i < count; i++) {
      // 맨 위 줄 제거
      this.state.grid.pop();
      
      // 구멍 위치 랜덤 결정
      const holePosition = Math.floor(Math.random() * this.CONFIG.GRID_WIDTH);
      
      // 쓰레기 줄 생성 (하나의 구멍만 있음)
      const garbageLine = [];
      for (let x = 0; x < this.CONFIG.GRID_WIDTH; x++) {
        if (x === holePosition) {
          garbageLine.push(null); // 구멍
        } else {
          garbageLine.push({
            color: 0x444444, // 회색 쓰레기 블록
            isGarbage: true,
          });
        }
      }
      
      // 맨 아래에 쓰레기 줄 추가
      this.state.grid.unshift(garbageLine);
    }
    
    // 현재 블록 위치 조정 (위로 밀어냄)
    if (this.state.currentPiece) {
      this.state.currentPiece.y += count;
    }
    
    // 시각적 업데이트
    this.refreshGridVisuals();
    
    // 경고 사운드
    this.SoundManager.playTone(
      { start: 100, end: 80 },
      'square',
      0.3,
      0.2
    );
    
    debugLog("Boss", `Added ${count} garbage line(s)`);
  }
}
