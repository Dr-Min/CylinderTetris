import { BGMManager } from "./BGMManager.js";

export class DefenseGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    this.bgmManager = new BGMManager();

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.originalCanvas = this.canvas;
    this.isMiniDisplay = false;
    this.miniCanvas = null;
    this.miniCtx = null;
    this.canvas.style.display = "none";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "50";
    document.body.appendChild(this.canvas);
    this.isGodMode = false;

    this.baseCoreRadius = 15;
    this.baseShieldRadius = 70;
    this.core = {
      x: 0,
      y: 0,
      radius: this.baseCoreRadius,
      hp: 100,
      maxHp: 100,
      color: "#00f0ff",
      shieldActive: true,
      shieldState: "ACTIVE",
      shieldHp: 100,
      shieldMaxHp: 100,
      shieldRadius: this.baseShieldRadius,
      shieldTimer: 0,
      scale: 1,
      visualOffsetX: 0,
      visualOffsetY: 0,
      targetOffsetX: 0,
      targetOffsetY: 0,
    };

    this.shieldVisual = {
      alpha: 0.7,
      targetAlpha: 0.7,
      dashGap: 0,
      targetDashGap: 0,
      lineWidth: 2,
      targetLineWidth: 2,
      rotation: 0,
      rotationSpeed: 0,
      targetRotationSpeed: 0,
      fillAlpha: 0.1,
      targetFillAlpha: 0.1,
    };
    this.shieldAnchor = { x: 0, y: 0 };
    this.shieldReady = false;
    this.shieldReadyTimer = 0;
    this.shieldReadyDurationBase = 2.0;
    this.shieldChargeMultiplier = 1.0;
    this.shieldReadyDuration = this.shieldReadyDurationBase;
    this.shieldReadyRadius = this.baseShieldRadius;
    this.shieldStepAngle = 0;
    this.shieldStepTimer = 0;
    this.emergencyReturnMax = 2;
    this.emergencyReturnCharges = this.emergencyReturnMax;
    this.lastEmergencyReturnTime = 0;
    this.shieldPassThroughUntil = 0;
    this.shieldBtnMode = "SHIELD";
    this.isCoreInsideShield = true;
    this.isIntroDrop = false;
    this.prevShieldState = this.core.shieldState;
    this.prevShieldBtnMode = this.shieldBtnMode;
    this.core.shieldAnchor = this.shieldAnchor;

    this.showCoreHP = true;
    this.glitchText = false;
    this.glitchOffset = { x: 0, y: 0 };

    this.gameScale = 1.0;

    this.isMobile = window.innerWidth <= 768;
    this.maxParticles = this.isMobile ? 30 : 100;
    this.particleMultiplier = this.isMobile ? 0.3 : 1.0;


    this.worldScale = 2.0;
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.camera = { x: 0, y: 0 };

    this.coreHome = { x: 0, y: 0 };
    this.coreMoveSpeed = 220;
    this.coreReturnSpeed = 280;
    this.coreReturnTimer = 0;
    this.coreReturnAtHome = false;
    this.moveInput = { x: 0, y: 0 };
    this.keyState = { up: false, down: false, left: false, right: false, shift: false };
    this.shiftAccel = 1.0;
    this.shiftAccelRate = 3.0;
    this.shiftMaxMultiplier = 2.4;
    this.joystick = { active: false, pointerId: null, inputX: 0, inputY: 0 };
    this.lastJoystickInputTime = 0;
    this.hasInitializedCore = false;
    this.autoFireActive = false;
    this.autoFireTimer = 0;
    this.autoFireTouchId = null;
    this.autoFireMouseActive = false;
    this.autoFireKeyActive = false;
    this.autoFireStartTime = 0;
    this.rightFireZoneRatio = 0.55;
    this.uiLayer = document.createElement("div");
    this.uiLayer.id = "defense-ui";
    this.uiLayer.style.position = "fixed";
    this.uiLayer.style.top = "0";
    this.uiLayer.style.left = "0";
    this.uiLayer.style.width = "100%";
    this.uiLayer.style.height = "100%";
    this.uiLayer.style.pointerEvents = "none";
    this.uiLayer.style.zIndex = "90";
    this.uiLayer.style.display = "none";
    document.body.appendChild(this.uiLayer);

    const joystickLeft = this.isMobile ? 60 : 24;
    const joystickBottom = this.isMobile ? 60 : 24;
    this.joystickContainer = document.createElement("div");
    this.joystickContainer.id = "move-joystick";
    this.joystickContainer.style.cssText = `
      position: absolute;
      left: ${joystickLeft}px;
      bottom: ${joystickBottom}px;
      width: 110px;
      height: 110px;
      pointer-events: auto;
      touch-action: none;
      z-index: 40;
      display: none;
    `;
    this.joystickBase = document.createElement("div");
    this.joystickBase.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      width: 90px;
      height: 90px;
      transform: translate(-50%, -50%);
      border: 2px solid rgba(0, 240, 255, 0.6);
      border-radius: 50%;
      background: rgba(0, 20, 40, 0.4);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
    `;
    this.joystickThumb = document.createElement("div");
    this.joystickThumb.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      width: 40px;
      height: 40px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: rgba(0, 240, 255, 0.8);
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
    `;
    this.joystickBase.appendChild(this.joystickThumb);
    this.joystickContainer.appendChild(this.joystickBase);
    this.uiLayer.appendChild(this.joystickContainer);
    this.joystickContainer.addEventListener("pointerdown", (e) => this.startJoystick(e));
    window.addEventListener("pointermove", (e) => this.moveJoystick(e));
    window.addEventListener("pointerup", (e) => this.endJoystick(e));
    window.addEventListener("pointercancel", (e) => this.endJoystick(e));
    this.onPageUpdate = null;

    const isSmallMobile = window.innerWidth <= 480;
    const recallWidth = this.isMobile ? (isSmallMobile ? 110 : 130) : 150;
    const recallHeight = this.isMobile ? (isSmallMobile ? 32 : 36) : 40;
    const recallFontSize = this.isMobile ? (isSmallMobile ? 10 : 11) : 12;
    this.shieldBtnWidth = recallWidth;
    this.shieldBtnHeight = recallHeight;

    this.shieldBtn = document.createElement("button");
    this.shieldBtn.id = "shield-btn";
    this.shieldBtn.style.position = "absolute";
    this.shieldBtn.style.bottom = "100px";
    this.shieldBtn.style.left = "50%";
    this.shieldBtn.style.transform = "translateX(-50%)";
    this.shieldBtn.style.width = `${recallWidth}px`;
    this.shieldBtn.style.height = `${recallHeight}px`;
    this.shieldBtn.style.backgroundColor = "rgba(0, 50, 255, 0.3)";
    this.shieldBtn.style.border = "2px solid #00f0ff";
    this.shieldBtn.style.color = "#00f0ff";
    this.shieldBtn.style.fontFamily = "var(--term-font)";
    this.shieldBtn.style.fontSize = `${recallFontSize}px`;
    this.shieldBtn.style.padding = "0";
    this.shieldBtn.style.boxSizing = "border-box";
    this.shieldBtn.style.cursor = "pointer";
    this.shieldBtn.style.pointerEvents = "auto";
    this.shieldBtn.style.zIndex = "30";
    this.shieldBtn.style.touchAction = "manipulation";
    this.shieldBtn.style.userSelect = "none";
    this.shieldBtn.style.webkitTapHighlightColor = "transparent";
    if (this.isMobile) {
      this.shieldBtn.style.right = "10px";
      this.shieldBtn.style.left = "auto";
      this.shieldBtn.style.transform = "none";
    }

    this.lastShieldTapTime = 0;
    const handleShieldTap = (e) => {
      const now = performance.now();
      if (
        this.isMobile &&
        this.joystick.active &&
        e.pointerId === this.joystick.pointerId
      ) {
        return;
      }
      if (now - this.lastShieldTapTime < 250) return;
      this.lastShieldTapTime = now;
      e.preventDefault();
      e.stopPropagation();
      this.handleShieldButtonClick();
    };
    if (window.PointerEvent) {
      this.shieldBtn.addEventListener("pointerdown", handleShieldTap);
    } else {
      this.shieldBtn.addEventListener("touchstart", handleShieldTap, { passive: false });
    }
    this.uiLayer.appendChild(this.shieldBtn);
    this.updateShieldBtnUI("ACTIVE", "#00f0ff");

    this.conquerBtn = document.createElement("button");
    this.conquerBtn.id = "conquer-btn";
    this.conquerBtn.style.position = "absolute";
    this.conquerBtn.style.top = "80px";
    this.conquerBtn.style.left = "50%";
    this.conquerBtn.style.transform = "translateX(-50%)";
    this.conquerBtn.style.width = "200px";
    this.conquerBtn.style.padding = "10px";
    this.conquerBtn.style.backgroundColor = "#ff0000";
    this.conquerBtn.style.border = "2px solid #fff";
    this.conquerBtn.style.color = "#fff";
    this.conquerBtn.style.fontFamily = "var(--term-font)";
    this.conquerBtn.style.fontSize = "18px";
    this.conquerBtn.style.fontWeight = "bold";
    this.conquerBtn.style.cursor = "pointer";
    this.conquerBtn.style.display = "none";
    this.conquerBtn.style.zIndex = "40";
    this.conquerBtn.style.boxShadow = "0 0 20px #ff0000";
    this.conquerBtn.style.touchAction = "manipulation";
    this.conquerBtn.style.userSelect = "none";
    this.conquerBtn.style.webkitTapHighlightColor = "transparent";
    this.conquerBtn.innerHTML = "!!! CONQUER !!!";
    this.conquerBtn.onclick = () => this.handleConquerClick();
    this.uiLayer.appendChild(this.conquerBtn);

    this.isRecallCasting = false;
    this.onRecallRequest = null;
    this.recallBtn = document.createElement("button");
    this.recallBtn.id = "recall-btn";
    this.recallBtn.style.position = "absolute";
    this.recallBtn.style.bottom = "20px";
    this.recallBtn.style.right = "10px";
    this.recallBtn.style.width = `${recallWidth}px`;
    this.recallBtn.style.height = `${recallHeight}px`;
    this.recallBtn.style.backgroundColor = "rgba(0, 20, 40, 0.8)";
    this.recallBtn.style.border = "2px solid #00aaff";
    this.recallBtn.style.color = "#00aaff";
    this.recallBtn.style.fontFamily = "var(--term-font)";
    this.recallBtn.style.fontSize = `${recallFontSize}px`;
    this.recallBtn.style.fontWeight = "bold";
    this.recallBtn.style.padding = "0";
    this.recallBtn.style.boxSizing = "border-box";
    this.recallBtn.style.cursor = "pointer";
    this.recallBtn.style.display = "none";
    this.recallBtn.style.zIndex = "40";
    this.recallBtn.style.boxShadow = "0 0 15px rgba(0, 170, 255, 0.5)";
    this.recallBtn.style.touchAction = "manipulation";
    this.recallBtn.style.userSelect = "none";
    this.recallBtn.style.webkitTapHighlightColor = "transparent";
    this.recallBtn.innerHTML = "RECALL";
    const handleRecallTap = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.onRecallRequest || this.isRecallCasting) return;
      this.isRecallCasting = true;
      this.recallBtn.style.pointerEvents = "none";
      try {
        await this.onRecallRequest();
      } finally {
        this.isRecallCasting = false;
        this.recallBtn.style.pointerEvents = "auto";
      }
    };
    this.recallBtn.addEventListener("pointerdown", handleRecallTap);
    this.recallBtn.addEventListener("touchstart", handleRecallTap, { passive: false });
    this.uiLayer.appendChild(this.recallBtn);


    this.isRunning = false;
    this.lastTime = 0;

    this.currentBGMTrack = null;

    this.turret = {
      angle: 0,
      range: 200,
      fireRate: 4.0,
      lastFireTime: 0,
      damage: 10,
      projectileSpeed: 300,
    };

    this.staticSystem = {
      currentCharge: 0,
      maxCharge: 100,
      chargeRate: 6,
      hitChargeAmount: 15,
      killChargeAmount: 25,
      chainCount: 3,
      chainRange: 250,
      lastDischargeTime: 0,
    };

    this.staticEffects = {
      sparks: [],
      chains: [],
    };

    this.weaponModes = {
      NORMAL: {
        name: "NORMAL",
        icon: "N",
        color: "#ffff00",
        desc: "Balanced | LV cap 12",
        baseDamage: 10,
        baseFireRate: 4.0,
        baseRange: 300,
        baseProjectileSpeed: 400,
        projectileCount: 1,
        spreadAngle: 0,
        piercing: false,
        hasReload: true,
        magazineSize: 12,
        reloadTime: 2.0,
        explosive: false,
        explosionRadius: 0,
      },
      SHOTGUN: {
        name: "SHOTGUN",
        icon: "SG",
        color: "#ff8800",
        desc: "Spread x5 | LV cap 6",
        baseDamage: 5,
        baseFireRate: 2.0,
        baseRange: 150,
        baseProjectileSpeed: 300,
        projectileCount: 5,
        spreadAngle: 0.5,
        piercing: false,
        hasReload: true,
        magazineSize: 6,
        reloadTime: 1.8,
        explosive: false,
        explosionRadius: 0,
      },
      SNIPER: {
        name: "SNIPER",
        icon: "SN",
        color: "#00ffff",
        desc: "High dmg | LV cap 3",
        baseDamage: 30,
        baseFireRate: 1.0,
        baseRange: 500,
        baseProjectileSpeed: 700,
        projectileCount: 1,
        spreadAngle: 0,
        piercing: true,
        hasReload: true,
        magazineSize: 3,
        reloadTime: 2.04,
        explosive: false,
        explosionRadius: 0,
      },
      RAPID: {
        name: "RAPID",
        icon: "R",
        color: "#00ff00",
        desc: "High rate | LV cap 30",
        baseDamage: 3,
        baseFireRate: 12.0,
        baseRange: 200,
        baseProjectileSpeed: 500,
        projectileCount: 1,
        spreadAngle: 0.15,
        piercing: false,
        hasReload: true,
        magazineSize: 30,
        reloadTime: 2.8,
        explosive: false,
        explosionRadius: 0,
      },
      LAUNCHER: {
        name: "LAUNCHER",
        icon: "L",
        color: "#ff0000",
        desc: "Splash dmg | LV cap 2",
        baseDamage: 25,
        baseFireRate: 0.8,
        baseRange: 350,
        baseProjectileSpeed: 200,
        projectileCount: 1,
        spreadAngle: 0,
        piercing: false,
        hasReload: true,
        magazineSize: 2,
        reloadTime: 2.02,
        explosive: true,
        explosionRadius: 100,
        explosionDamage: 15,
      },
    };

    this.helper = {
      x: 0,
      y: 0,
      radius: 8,
      color: "#ffff00",
      speed: 40,
      fireRate: 4.0,
      lastFireTime: 0,
      range: 300,
      damage: 10,
      projectileSpeed: 400,
      angle: 0,
      evadeDistance: 50,
      targetX: 0,
      targetY: 0,
      weaponMode: "NORMAL",
      currentAmmo: 0,
      isReloading: false,
      reloadProgress: 0,
      reloadStartTime: 0,
    };

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.alliedViruses = [];
    this.miningManager = null;
    this.shockwaves = [];

    this.droppedItems = [];
    this.collectorViruses = [];
    this.virusDialogues = null;
    this.activeSpeechBubbles = [];
    this.loadVirusDialogues();
    this.slowFields = [];
    this.nextWaveId = 1;

    this.waveTimer = 0;
    this.pageDurationBase = 12.5;
    this.pageDuration = 10;
    this.pageSpawnScale = this.pageDuration / this.pageDurationBase;
    this.spawnRate = 0.4 * this.pageSpawnScale;
    this.currentPage = 1;
    this.pageTimer = 0;
    this.pageDuration = 10;
    this.currentStage = 0;
    this.currentStageId = 0;
    this.stageDifficultyScale = 1.0;
    this.stageMaxPages = 12;
    this.isFarmingZone = false;
    this.safeZoneSpawnRate = 2;

    this.isReinforcementMode = false;
    this.reinforcementPage = 0;
    this.reinforcementMaxPages = 3;
    this.reinforcementComplete = false;
    this.reinforcementSpawnRate = 0.27;

    this.isConquered = false;

    this.isBossFight = false;
    this.bossManager = null;
    this.breachReadyShown = false;

    this.onResourceGained = null;
    this.onGameOver = null;
    this.onConquer = null;
    this.onConquerReady = null;
    this.onEnemyKilled = null;
    this.onItemCollected = null;
    this.onBreachReady = null;

    this.frameEnemiesKilled = 0;
    this.frameCoreDamaged = 0;

    this.getItemEffects = () => ({
      convert: 0,
      chain: 0,
      chainRadius: 0,
      lifesteal: 0,
      attackSpeed: 0,
      dropRate: 0
    });

    this.conquerReady = false;

    this.alliedConfig = null;
    this.alliedInfo = { count: 0, level: 1, color: "#00aaff" };
    this.currentData = 0;

    window.addEventListener("resize", () => this.resize());

    document.addEventListener("visibilitychange", () =>
      this.handleVisibilityChange()
    );

    if (window.innerWidth <= 768) {
      this.shieldBtn.style.bottom = "80px";
      this.shieldBtn.style.width = "160px";
      this.shieldBtn.style.height = "50px";
    }

    this.idleTurretAngle = 0;
    this.idleTurretSpeed = 1.5;

    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener("mousedown", (e) => this.handleCanvasMouseDown(e));
    window.addEventListener("mouseup", (e) => this.handleCanvasMouseUp(e));
    this.canvas.addEventListener(
      "touchstart",
      (e) => this.handleCanvasTouch(e),
      { passive: false }
    );
    this.canvas.addEventListener("touchend", (e) => this.handleCanvasTouchEnd(e), {
      passive: false
    });
    this.canvas.addEventListener("touchcancel", (e) => this.handleCanvasTouchEnd(e), {
      passive: false
    });

    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));

    this.resize();
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      debugLog("Defense", "Tab restored - validating game state");
      this.validateGameState();
      this.resize();
      this.lastTime = performance.now();
    } else {
      debugLog("Defense", "Tab hidden - pausing updates");
    }
  }

  validateGameState() {
    const worldW = this.worldWidth || this.canvas.width;
    const worldH = this.worldHeight || this.canvas.height;
    if (
      !Number.isFinite(this.core.x) ||
      !Number.isFinite(this.core.y) ||
      this.core.x < 0 ||
      this.core.x > worldW ||
      this.core.y < 0 ||
      this.core.y > worldH
    ) {
      debugWarn("Defense", "Core position invalid, resetting to center", {
        x: this.core.x,
        y: this.core.y,
        worldW,
        worldH,
        shieldState: this.core.shieldState,
        shieldActive: this.core.shieldActive,
        shieldBtnMode: this.shieldBtnMode,
        anchorX: this.shieldAnchor.x,
        anchorY: this.shieldAnchor.y,
      });
      this.core.x = this.coreHome.x || worldW / 2;
      this.core.y = this.coreHome.y || worldH / 2;
    }

    if (isNaN(this.core.hp) || this.core.hp < 0) {
      debugWarn("Defense", "Core HP invalid, resetting");
      this.core.hp = this.core.maxHp;
    }

    if (isNaN(this.core.shieldHp)) {
      debugWarn("Defense", "Shield HP invalid, resetting");
      this.core.shieldHp = this.core.shieldMaxHp;
    }

    this.enemies = this.enemies.filter((e) => {
      const margin = 200;
      return (
        e.x > -margin &&
        e.x < worldW + margin &&
        e.y > -margin &&
        e.y < worldH + margin &&
        !isNaN(e.x) &&
        !isNaN(e.y)
      );
    });

    this.alliedViruses.forEach((v) => {
      if (isNaN(v.x) || isNaN(v.y)) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 40;
        v.x = this.core.x + Math.cos(angle) * dist;
        v.y = this.core.y + Math.sin(angle) * dist;
        v.vx = 0;
        v.vy = 0;
        debugWarn("Defense", "Allied virus repositioned (invalid position)");
      }
    });

    const scaledMargin = 100 / this.gameScale;
    this.projectiles = this.projectiles.filter((p) => {
      return (
        p.x > -scaledMargin &&
        p.x < worldW + scaledMargin &&
        p.y > -scaledMargin &&
        p.y < worldH + scaledMargin &&
        !isNaN(p.x) &&
        !isNaN(p.y)
      );
    });

    if (!this.shieldVisual || isNaN(this.shieldVisual.alpha)) {
      debugWarn("Defense", "Shield visual state invalid, resetting");
      this.shieldVisual = {
        alpha: 0.7,
        targetAlpha: 0.7,
        dashGap: 0,
        targetDashGap: 0,
        lineWidth: 2,
        targetLineWidth: 2,
        rotation: 0,
        rotationSpeed: 0,
        targetRotationSpeed: 0,
        fillAlpha: 0.1,
        targetFillAlpha: 0.1,
      };
    }
  }

  resize() {
    const targetCanvas = this.originalCanvas || this.canvas;
    targetCanvas.width = window.innerWidth;
    targetCanvas.height = window.innerHeight;

    this.isMobile = window.innerWidth <= 768;
    this.maxParticles = this.isMobile ? 30 : 100;
    this.particleMultiplier = this.isMobile ? 0.3 : 1.0;

    if (window.innerWidth <= 768) {
      this.gameScale = 1.0;
      this.gameScale = 0.8;
    } else {
      this.gameScale = 1.0;
    }

    const isMobile = window.innerWidth <= 768;
    const shieldScale = isMobile ? 0.5 : 1.0;
    this.core.radius = this.baseCoreRadius * (isMobile ? 0.7 : 1.0);
    this.core.shieldRadius = this.baseShieldRadius * shieldScale;
    this.shieldReadyRadius = this.core.shieldRadius;

    this.worldWidth = targetCanvas.width * this.worldScale;
    this.worldHeight = targetCanvas.height * this.worldScale;
    this.coreHome.x = this.worldWidth / 2;
    this.coreHome.y = this.worldHeight / 2;
    this.core.worldWidth = this.worldWidth;
    this.core.worldHeight = this.worldHeight;

    if (!this.hasInitializedCore) {
      this.core.x = this.coreHome.x;
      this.core.y = this.coreHome.y;
      this.shieldAnchor.x = this.core.x;
      this.shieldAnchor.y = this.core.y;
      this.hasInitializedCore = true;
    } else {
      this.core.x = Math.min(Math.max(this.core.x, 0), this.worldWidth);
      this.core.y = Math.min(Math.max(this.core.y, 0), this.worldHeight);
    }

    this.updateCamera();

    debugLog("Canvas", "resize() complete - size:", targetCanvas.width, "x", targetCanvas.height, "scale:", this.gameScale);
  }

  
  setMiniDisplay(canvasId) {
    debugLog("Canvas", "setMiniDisplay called with:", canvasId);
    if (canvasId) {
      const miniCanvas = document.getElementById(canvasId);
      debugLog("Canvas", "miniCanvas found:", !!miniCanvas);
      if (miniCanvas) {
        debugLog("Canvas", "TODO", this.canvas.id, "isMiniDisplay:", this.isMiniDisplay);

        this.miniCanvas = miniCanvas;
        this.isMiniDisplay = true;


        this.renderDebugFrameCount = 0;

        miniCanvas.style.display = "block";

        debugLog("Canvas", "Switched to mini display mode");
        debugLog("Canvas", "TODO");
        debugLog("Canvas", "TODO", this.core.x, this.core.y);
        debugLog("Canvas", "TODO", this.gameScale);
        debugLog("Canvas", "TODO", this.alliedViruses.length, "TODO", this.enemies.length);
      }
    } else {
      debugLog("Canvas", "=== ? ? ? ? ===");
      debugLog("Canvas", "TODO", this.isMiniDisplay);

      if (this.originalCanvas) {
        debugLog("Canvas", "originalCanvas size:", this.originalCanvas.width, "x", this.originalCanvas.height);
        debugLog("Canvas", "originalCanvas.style.display:", this.originalCanvas.style.display);

        this.miniCanvas = null;
        this.isMiniDisplay = false;

        this.renderDebugFrameCount = 0;

        this.originalCanvas.style.display = "block";

        debugLog("Canvas", "Canvas restored - size:", this.originalCanvas.width, "x", this.originalCanvas.height);
        debugLog("Canvas", "Canvas display:", this.originalCanvas.style.display);
        debugLog("Canvas", "=== ? ? ? ? ===");
      }
    }
  }

  updateResourceDisplay(amount) {
    this.currentData = amount;
    if (this.onDataUpdate) {
      this.onDataUpdate(this.currentData);
    }
  }

  updateAlliedInfo(info) {
    this.alliedInfo = info;
    debugLog("Defense", "updateAlliedInfo - Info saved:", info);
  }

  updateAlliedConfig(config) {
    this.alliedConfig = config;
    debugLog("Defense", "updateAlliedConfig - Config saved:", config);
  }

  handleConquerClick() {
    this.conquerBtn.style.display = "none";

    this.playConquestShieldBreak(() => {
      this.core.shieldActive = false;
      this.core.shieldState = "DISABLED";
      this.core.shieldHp = 0;
      this.updateShieldBtnUI("DISABLED", "#555");
      this.shieldBtn.style.pointerEvents = "none";

      if (this.onConquer) this.onConquer();

      this.currentPage = 1;
      this.updateWaveDisplay();
    });
  }

  playConquestShieldBreak(onComplete) {
    const originalRadius = this.core.shieldRadius;
    const startTime = performance.now();
    const totalDuration = 2000;
    const phase1Duration = 800;
    this.isConquestBreaking = true;

    const animate = (now) => {
      const elapsed = now - startTime;

      if (elapsed < phase1Duration) {
        const progress = elapsed / phase1Duration;

        if (Math.random() < 0.3) {
          this.shakeScreen(5 + progress * 10);
        }

        if (Math.random() < 0.15) {
          const angle = Math.random() * Math.PI * 2;
          const x = this.core.x + Math.cos(angle) * this.core.shieldRadius;
          const y = this.core.y + Math.sin(angle) * this.core.shieldRadius;

          this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * (20 + Math.random() * 30),
            vy: Math.sin(angle) * (20 + Math.random() * 30),
            life: 0.8,
            maxLife: 0.8,
            alpha: 1,
            color: "#00f0ff",
            size: 2 + Math.random() * 2,
            char: "*",
          });
        }

        if (elapsed > phase1Duration - 100 && !this._phase1Flash) {
          this._phase1Flash = true;
          this.flashScreen("#00ffff", 0.4);
          this.shakeScreen(15);

          for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = this.core.x + Math.cos(angle) * this.core.shieldRadius;
            const y = this.core.y + Math.sin(angle) * this.core.shieldRadius;

            this.particles.push({
              x,
              y,
              vx: Math.cos(angle) * (30 + Math.random() * 40),
              vy: Math.sin(angle) * (30 + Math.random() * 40),
              life: 1.0,
              maxLife: 1.0,
              alpha: 1,
              color: "#00f0ff",
              size: 3 + Math.random() * 3,
              char: "*",
            });
          }
        }

        requestAnimationFrame(animate);
        return;
      }

      if (!this._phase2Started) {
        this._phase2Started = true;

        this.flashScreen("#ffffff", 0.6);
        this.shakeScreen(30);

        const segments = 24;
        for (let i = 0; i < segments; i++) {
          const angle = ((Math.PI * 2) / segments) * i;
          const x = this.core.x + Math.cos(angle) * this.core.shieldRadius;
          const y = this.core.y + Math.sin(angle) * this.core.shieldRadius;

          for (let j = 0; j < 4; j++) {
            const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
            this.particles.push({
              x,
              y,
              vx: Math.cos(spreadAngle) * (80 + Math.random() * 120),
              vy: Math.sin(spreadAngle) * (80 + Math.random() * 120),
              life: 1.5,
              maxLife: 1.5,
              alpha: 1,
              color: Math.random() > 0.5 ? "#00f0ff" : "#ffffff",
              size: 4 + Math.random() * 6,
              char: "*",
            });
          }
        }

        this.shockwaves.push({
          x: this.core.x,
          y: this.core.y,
          radius: this.core.shieldRadius,
          maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
          speed: 400,
          alpha: 0.8,
          color: "#00f0ff",
          lineWidth: 6,
          damageDealt: false,
        });

        this.applyShockwaveEffects();
      }

      const phase2Progress =
        (elapsed - phase1Duration) / (totalDuration - phase1Duration);
      this.core.shieldRadius = originalRadius * (1 - phase2Progress);

      if (elapsed < totalDuration) {
        requestAnimationFrame(animate);
      } else {
        this.core.shieldRadius = 0;
        this.isConquestBreaking = false;
        this._phase1Flash = false;
        this._phase2Started = false;

        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  applyShockwaveEffects() {
    const damage = 25;

    this.enemies.forEach((enemy) => {
      this.applyKnockback(enemy, 200, 0.3, 2);

      enemy.hp -= damage;
      this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);

      if (enemy.hp <= 0) {
        this.createExplosion(enemy.x, enemy.y, "#00ff00", 10);
        const gain = 10;
        this.currentData += gain;
        this.updateResourceDisplay(this.currentData);
      }
    });

    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  toggleShield() {
    if (
      this.core.shieldState === "CHARGING" ||
      this.core.shieldState === "DISCHARGING" ||
      this.core.shieldState === "BROKEN" ||
      this.core.shieldState === "RECHARGING" ||
      this.core.shieldState === "DISABLED"
    ) {
      return;
    }

    if (this.core.shieldActive) {
      this.core.shieldActive = false;
      this.core.shieldState = "OFF";
      this.shieldReady = false;
      this.shieldReadyTimer = 0;
      this.updateShieldBtnUI("OFFLINE", "#f00");
    } else {
      if (!this.shieldReady) return;
      this.core.shieldActive = true;
      this.core.shieldState = "ACTIVE";
      this.shieldReady = false;
      this.shieldReadyTimer = 0;
      this.shieldAnchor.x = this.core.x;
      this.shieldAnchor.y = this.core.y;
      this.updateShieldBtnUI("ACTIVE", "#00f0ff");
    }
  }

  updateShieldVisualTargets() {
    const sv = this.shieldVisual;
    const state = this.core.shieldState;

    if (state === "ACTIVE") {
      sv.targetAlpha = 0.8;
      sv.targetDashGap = 0;
      sv.targetLineWidth = 2.5;
      sv.targetFillAlpha = 0.15;
      sv.targetRotationSpeed = 0;
    } else if (state === "OFF" || state === "RETURNING") {
      sv.targetAlpha = 0.5;
      sv.targetDashGap = 10;
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0;
      sv.targetRotationSpeed = 0;
    } else if (state === "DISCHARGING") {
      sv.targetAlpha = 0.6;
      sv.targetDashGap = 10;
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0.05;
      sv.targetRotationSpeed = 30;
    } else if (state === "CHARGING") {
      const elapsed = 2.0 - this.core.shieldTimer;
      const progress = Math.min(1, elapsed / 2.0);

      sv.targetAlpha = 0.5 + progress * 0.3;
      sv.targetDashGap = 12 * (1 - progress);
      sv.targetLineWidth = 1.5 + progress * 1;
      sv.targetFillAlpha = progress * 0.15;
      sv.targetRotationSpeed = 50 + progress * 500;
    } else if (state === "BROKEN" || state === "RECHARGING") {
      sv.targetAlpha = 0.5;
      sv.targetDashGap = 12;
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0;
      sv.targetRotationSpeed = 0;
    } else if (state === "DISABLED") {
      sv.targetAlpha = 0.3;
      sv.targetDashGap = 15;
      sv.targetLineWidth = 1;
      sv.targetFillAlpha = 0;
      sv.targetRotationSpeed = 0;
    }
  }

  updateShieldBtnUI(text, color, loadingProgress = null) {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    const recallWidth = isMobile ? (isSmallMobile ? 110 : 130) : 150;
    const recallHeight = isMobile ? (isSmallMobile ? 32 : 36) : 40;
    const recallFontSize = isMobile ? (isSmallMobile ? 10 : 11) : 12;
    const desiredWidth = `${recallWidth}px`;
    const desiredHeight = `${recallHeight}px`;
    const desiredFont = `${recallFontSize}px`;
    if (this.shieldBtn.style.width !== desiredWidth) {
      this.shieldBtn.style.width = desiredWidth;
    }
    if (this.shieldBtn.style.height !== desiredHeight) {
      this.shieldBtn.style.height = desiredHeight;
    }
    if (this.shieldBtn.style.fontSize !== desiredFont) {
      this.shieldBtn.style.fontSize = desiredFont;
    }
    this.shieldBtnWidth = recallWidth;
    this.shieldBtnHeight = recallHeight;

    const progressOverlay = (() => {
      if (loadingProgress === null) return "";
      const borderWidth = this.shieldBtnWidth ?? 130;
      const borderHeight = this.shieldBtnHeight ?? 36;
      const strokeWidth = 2;
      const rectWidth = Math.max(0, borderWidth - strokeWidth);
      const rectHeight = Math.max(0, borderHeight - strokeWidth);
      const perimeter = 2 * (rectWidth + rectHeight);
      const dashOffset = perimeter * (1 - loadingProgress);
      return `
        <svg width="${borderWidth}" height="${borderHeight}" viewBox="0 0 ${borderWidth} ${borderHeight}"
          style="position:absolute; inset:0; pointer-events:none;">
          <rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${rectWidth}" height="${rectHeight}" rx="3" ry="3"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}"
            stroke-dasharray="${perimeter}" stroke-dashoffset="${dashOffset}" />
        </svg>
      `;
    })();

    const labelMap = {
      ACTIVE: "SHIELD",
      OFFLINE: "OFF",
      "SHIELD READY": "READY",
      REARMING: "REARM",
      RECHARGING: "RECHG",
    };

    const normalized = String(text || "").toUpperCase();
    let displayText = labelMap[normalized] || normalized.split(" ")[0].slice(0, 6) || "SHIELD";
    let displayColor = color;
    if (this.shieldBtnMode === "RETURN") {
      displayText = this.emergencyReturnCharges > 0 ? "RETURN" : "BLOCKED";
      displayColor = this.emergencyReturnCharges > 0 ? "#ff6600" : "#555";
    }

    const charges = Math.max(0, this.emergencyReturnCharges ?? 0);
    const chargeBadge = `
          <div style='
              position: absolute;
              top: -8px;
              right: -8px;
              width: 20px;
              height: 20px;
              border-radius: 10px;
              background: rgba(0, 0, 0, 0.6);
              border: 1px solid ${displayColor};
              color: ${displayColor};
              font-size: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
          '>${charges}</div>
      `;

    this.shieldBtn.innerHTML = `
          <div style='position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;'>
            ${progressOverlay}
            <div style='font-size: ${this.shieldBtn.style.fontSize}; letter-spacing: 1px;'>${displayText}</div>
          </div>
          ${chargeBadge}
      `;
    if (loadingProgress === null) {
      this.shieldBtn.style.borderColor = displayColor;
    } else {
      this.shieldBtn.style.borderColor = "#1b1b1b";
    }
    this.shieldBtn.style.color = displayColor;
  }

  updateRecallBtnVisibility() {
    if (!this.recallBtn) return;
    const shouldShow = this.isRunning && this.uiLayer?.style?.display !== "none";
    this.recallBtn.style.display = shouldShow ? "block" : "none";
    if (this.isSafeZone) {
      this.recallBtn.style.opacity = "0.45";
      this.recallBtn.style.pointerEvents = "none";
    } else {
      this.recallBtn.style.opacity = "1";
      this.recallBtn.style.pointerEvents = "auto";
    }
  }

  start() {
    this.resize();
    this.isRunning = true;
    this.canvas.style.display = "block";
    this.uiLayer.style.display = "block";

    this.isSafeZone = (this.currentStageId === 0);
    this.isFarmingZone = (this.currentStageId === 3);
    this.updateRecallBtnVisibility();

    this.currentPage = 1;
    this.pageTimer = 0;
    this.conquerReady = false;
    this.conquerBtn.style.display = "none";
    this.updateWaveDisplay();
    this.emergencyReturnCharges = this.emergencyReturnMax;
    this.shieldBtnMode = "SHIELD";
    this.core.shieldActive = false;
    this.core.shieldState = "OFF";
    this.updateShieldBtnUI("OFFLINE", "#f00");
    this.emergencyReturnCharges = this.emergencyReturnMax;
    this.shieldBtn.style.display = "block";
    this.coreReturnTimer = 0;
    this.coreReturnAtHome = false;

    if (this.isSafeZone) {
      this.playBGMTrack('SAFE_ZONE');
    } else {
      this.playBGMTrack('DEFENSE');
    }

    this.lastTime = performance.now();
    this.animate(this.lastTime);
    debugLog("Defense", "Mode Started");
  }

  stop() {
    this.isRunning = false;
    this.canvas.style.display = "none";
    this.uiLayer.style.display = "none";
    this.updateRecallBtnVisibility();

    this.bgmManager.stop();
  }

  pause() {
    this.isRunning = false;
    this.updateRecallBtnVisibility();

    this.bgmManager.stop();
  }

  resume() {
    debugLog("Canvas", "resume() called, isRunning before:", this.isRunning);
    debugLog("Canvas", "canvas before resume:", this.canvas.style.display);
    debugLog("Canvas", "canvas element:", this.canvas);
    debugLog("Canvas", "isMiniDisplay:", this.isMiniDisplay);
    debugLog("Canvas", "uiLayer before resume:", this.uiLayer?.style?.display);

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.animate(t));
      debugLog("Canvas", "Animation frame requested");

      if (this.currentBGMTrack) {
        this.bgmManager.play(this.currentBGMTrack);
      }
    } else {
      debugLog("Canvas", "Already running, skipping resume");
    }

    if (!this.isMiniDisplay) {
      this.canvas.style.display = "block";
      this.uiLayer.style.display = "block";
      debugLog("Canvas", "Set canvas and uiLayer to block (? )");
    } else {
      this.canvas.style.display = "none";
      this.uiLayer.style.display = "none";
    }
    debugLog("Canvas", "canvas after set:", this.canvas.style.display);
    this.updateRecallBtnVisibility();
  }

  setMiniDisplay(targetId) {
    if (!targetId) {
      this.isMiniDisplay = false;
      this.miniCanvas = null;
      this.miniCtx = null;
      debugLog("Canvas", "Mini display cleared");
      if (this.isRunning) {
        this.canvas.style.display = "block";
        this.uiLayer.style.display = "block";
      }
      this.updateRecallBtnVisibility();
      return;
    }

    const canvas = document.getElementById(targetId);
    if (!canvas) {
      debugWarn("Canvas", "Mini canvas not found", { targetId });
      this.isMiniDisplay = false;
      this.miniCanvas = null;
      this.miniCtx = null;
      return;
    }

    this.isMiniDisplay = true;
    this.miniCanvas = canvas;
    this.miniCtx = canvas.getContext("2d");
    this.canvas.style.display = "none";
    this.uiLayer.style.display = "none";
    this.updateRecallBtnVisibility();
    debugLog("Canvas", "Mini display set", {
      targetId,
      width: canvas.width,
      height: canvas.height,
    });
  }

  update(deltaTime) {
    const now = performance.now() / 1000;

    const clampedDeltaTime = Math.min(deltaTime, 100);
    const dt = clampedDeltaTime / 1000;

    this.validateGameState();

    if (this.isMiniDisplay) {
      this.canvas.style.display = "none";
      this.uiLayer.style.display = "none";
    }

    const core = this.core;
    core.visualOffsetX += (core.targetOffsetX - core.visualOffsetX) * dt * 15;
    core.visualOffsetY += (core.targetOffsetY - core.visualOffsetY) * dt * 15;
    core.targetOffsetX *= Math.pow(0.05, dt);
    core.targetOffsetY *= Math.pow(0.05, dt);
    if (Math.abs(core.targetOffsetX) < 0.1) core.targetOffsetX = 0;
    if (Math.abs(core.targetOffsetY) < 0.1) core.targetOffsetY = 0;

    this.updateMoveInput();
    if (this.core.shieldState === "RETURNING") {
      this.updateCoreReturn(dt);
    } else {
      this.updateCoreMovement(dt);
    }
    this.updateCamera();
    const canMove = this.core.shieldState !== "DISABLED";
    this.joystickContainer.style.display = (this.isMobile && canMove) ? "block" : "none";

    const dxShield = this.core.x - this.shieldAnchor.x;
    const dyShield = this.core.y - this.shieldAnchor.y;
    const distShield = Math.hypot(dxShield, dyShield);
    const maxDistShield = Math.max(0, this.core.shieldRadius - this.core.radius);
    const insideThreshold = Math.max(0, maxDistShield - 6);
    const outsideThreshold = Math.max(0, maxDistShield + 8);
    const prevMode = this.shieldBtnMode;
    if (this.shieldBtnMode === "SHIELD") {
      if (distShield > outsideThreshold) this.shieldBtnMode = "RETURN";
    } else {
      if (distShield <= insideThreshold) this.shieldBtnMode = "SHIELD";
    }
    if (this.shieldBtnMode !== this.prevShieldBtnMode) {
      debugLog("Defense", "Shield button mode changed", {
        from: this.prevShieldBtnMode,
        to: this.shieldBtnMode,
        distShield,
        insideThreshold,
        outsideThreshold,
        charges: this.emergencyReturnCharges,
      });
      this.prevShieldBtnMode = this.shieldBtnMode;
    }
    const insideShield = this.shieldBtnMode === "SHIELD";
    this.isCoreInsideShield = insideShield;
    if (this.shieldBtnMode !== prevMode) {
      this.updateShieldBtnUI(
        this.core.shieldActive ? "ACTIVE" : "OFFLINE",
        this.core.shieldActive ? "#00f0ff" : "#f00"
      );
    }
    if (this.shieldBtnMode === "RETURN" && this.emergencyReturnCharges <= 0) {
      this.shieldBtn.style.pointerEvents = "none";
    } else {
      this.shieldBtn.style.pointerEvents = "auto";
    }

    if (this.core.shieldState !== this.prevShieldState) {
      debugLog("Defense", "Shield state changed", {
        from: this.prevShieldState,
        to: this.core.shieldState,
        shieldActive: this.core.shieldActive,
        shieldHp: this.core.shieldHp,
        shieldMaxHp: this.core.shieldMaxHp,
      });
      this.prevShieldState = this.core.shieldState;
    }
    if (this.core.shieldState === "RETURNING") {
    } else if (this.core.shieldState === "CHARGING") {
      this.core.shieldTimer -= dt;
      if (this.core.shieldTimer <= 0) {
        this.core.shieldActive = true;
        this.core.shieldState = "ACTIVE";
        this.shieldAnchor.x = this.core.x;
        this.shieldAnchor.y = this.core.y;
        this.shieldPassThroughUntil = performance.now() + 1000;
        this.updateShieldBtnUI("ACTIVE", "#fff");
      }
    } else if (this.core.shieldState === "DISCHARGING") {
      this.core.shieldTimer -= dt;
      if (this.core.shieldTimer <= 0) {
        this.core.shieldActive = false;
        this.core.shieldState = "OFF";
        this.updateShieldBtnUI("OFFLINE", "#f00");
      }
    } else if (this.core.shieldState === "BROKEN") {
      this.core.shieldTimer -= dt;
      const loadingProgress = 1 - this.core.shieldTimer / 5.0;
      const dots = ".".repeat(Math.floor((Date.now() / 300) % 4));
      this.updateShieldBtnUI(`REPAIRING${dots}`, "#ff6600", loadingProgress);

      if (this.core.shieldTimer <= 0) {
        this.core.shieldState = "RECHARGING";
        this.core.shieldHp = 1;
        this.updateShieldBtnUI("RECHARGING", "#ffff00");
      }
    } else if (this.core.shieldState === "RECHARGING") {
      this.core.shieldHp += 20 * dt;
      if (this.core.shieldHp >= this.core.shieldMaxHp) {
        this.core.shieldHp = this.core.shieldMaxHp;
        this.core.shieldState = "OFF";
        this.updateShieldBtnUI("OFFLINE", "#00ff00");
      } else {
        const pct = Math.floor((this.core.shieldHp / this.core.shieldMaxHp) * 100);
        this.updateShieldBtnUI(`CHARGING ${pct}%`, "#ffff00");
      }
    }

    const shieldReadyDuration = this.shieldReadyDurationBase * this.shieldChargeMultiplier;
    this.shieldReadyDuration = shieldReadyDuration;

    const chargeRadius = Math.max(0, this.core.shieldRadius - this.core.radius);
    if (!this.core.shieldActive && this.core.shieldState === "OFF") {
      const dx = this.core.x - this.shieldAnchor.x;
      const dy = this.core.y - this.shieldAnchor.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= chargeRadius) {
        this.shieldReadyTimer += dt;
        const progress = Math.min(1, this.shieldReadyTimer / shieldReadyDuration);
        if (progress >= 1) {
          this.shieldReady = true;
          this.shieldChargeMultiplier = 1.0;
          this.shieldReadyDuration = this.shieldReadyDurationBase;
          this.updateShieldBtnUI("SHIELD READY", "#00ff88", 1);
        } else {
          this.shieldReady = false;
          this.updateShieldBtnUI("REARMING", "#00ff88", progress);
        }
      } else {
        this.shieldReady = false;
        const decayRate = shieldReadyDuration * 0.8;
        this.shieldReadyTimer = Math.max(0, this.shieldReadyTimer - decayRate * dt);
        if (this.shieldReadyTimer <= 0) {
          this.updateShieldBtnUI("OFFLINE", "#f00");
        } else {
          const progress = Math.min(1, this.shieldReadyTimer / shieldReadyDuration);
          this.updateShieldBtnUI("REARMING", "#00ff88", progress);
        }
      }
    } else if (this.core.shieldActive) {
      this.shieldReady = false;
      this.shieldReadyTimer = 0;
    }

    if (this.core.shieldActive) {
      this.shieldChargeMultiplier = 1.0;
      this.shieldReadyDuration = this.shieldReadyDurationBase;
    } else {
      if (
        this.core.shieldState === "OFF" &&
        this.core.shieldHp < this.core.shieldMaxHp
      ) {
        this.core.shieldHp += 10 * dt;
        if (this.core.shieldHp > this.core.shieldMaxHp)
          this.core.shieldHp = this.core.shieldMaxHp;
        if (!this.shieldReady && this.shieldReadyTimer === 0)
          this.updateShieldBtnUI("OFFLINE", "#f00");
      }
    }

    this.updateShieldVisualTargets();

    if (this.isBossFight && this.bossManager && !this.bossManager.isBreachReady) {
      const shieldOff = !this.core.shieldActive;
      this.bossManager.updateBreachGauge(dt, shieldOff, this.frameEnemiesKilled || 0, this.frameCoreDamaged || 0);

      this.frameEnemiesKilled = 0;
      this.frameCoreDamaged = 0;

      if (this.bossManager.isBreachReady && !this.breachReadyShown) {
        this.breachReadyShown = true;
        if (this.onBreachReady) {
          this.onBreachReady();
        }
      }
    }

    const lerpSpeed = 3.0;
    const sv = this.shieldVisual;
    sv.alpha += (sv.targetAlpha - sv.alpha) * lerpSpeed * dt;
    sv.dashGap += (sv.targetDashGap - sv.dashGap) * lerpSpeed * dt;
    sv.lineWidth += (sv.targetLineWidth - sv.lineWidth) * lerpSpeed * dt;
    sv.fillAlpha += (sv.targetFillAlpha - sv.fillAlpha) * lerpSpeed * dt;
    sv.rotationSpeed +=
      (sv.targetRotationSpeed - sv.rotationSpeed) * lerpSpeed * dt;

    sv.rotation += sv.rotationSpeed * dt;
    if (this.core.shieldState === "OFF" && sv.targetDashGap > 0) {
      const stepInterval = 0.18;
      const stepAngle = Math.PI / 10;
      this.shieldStepTimer += dt;
      if (this.shieldStepTimer >= stepInterval) {
        this.shieldStepTimer = 0;
        this.shieldStepAngle = (this.shieldStepAngle + stepAngle) % (Math.PI * 2);
        sv.rotation = this.shieldStepAngle;
      }
    } else {
      this.shieldStepTimer = 0;
    }


    if (this.isReinforcementMode && !this.reinforcementComplete) {
      this.pageTimer += dt;
      if (this.pageTimer >= this.pageDuration) {
        if (this.reinforcementPage < this.reinforcementMaxPages) {
          this.reinforcementPage++;
          this.pageTimer = 0;

          const reinforcementSpawnRates = [0.17, 0.12, 0.08];
          this.spawnRate =
            reinforcementSpawnRates[Math.min(this.reinforcementPage - 1, 2)] * this.pageSpawnScale;

          this.updateWaveDisplay();
          debugLog(
            "Defense",
            "Reinforcement Page:",
            this.reinforcementPage,
            "SpawnRate:",
            this.spawnRate
          );
        } else {
          this.reinforcementComplete = true;
          debugLog("Defense", "Reinforcement Complete!");
        }
      }
    }
    else if (!this.isSafeZone && !this.isConquered && this.currentPage <= (this.maxPages || 12)) {
      const maxPages = this.maxPages || 12;
      const diffScale = this.stageDifficultyScale || 1.0;

      const prevSecond = Math.floor(this.pageTimer);
      this.pageTimer += dt;
      const currSecond = Math.floor(this.pageTimer);

      if (currSecond !== prevSecond) {
        this.updateWaveDisplay();
      }

      if (this.pageTimer >= this.pageDuration) {
        if (this.currentPage < maxPages || this.isFarmingZone) {
          this.currentPage++;
          this.pageTimer = 0;
          if (!this.isFarmingZone) {
            this.spawnRate = Math.max(
              0.13 * this.pageSpawnScale,
              (0.4 - this.currentPage * 0.04 * diffScale) * this.pageSpawnScale
            );
          }
          this.updateWaveDisplay();
        } else if (!this.conquerReady && !this.isFarmingZone) {
          this.conquerReady = true;

          if (this.onPageUpdate) {
            this.onPageUpdate("TODO", "#ff3333");
          }

          if (this.onConquerReady) {
            this.onConquerReady();
          }
        }
      }
    }
    else if (this.isFarmingZone && !this.isConquered) {
      const prevSecond = Math.floor(this.pageTimer);
      this.pageTimer += dt;
      const currSecond = Math.floor(this.pageTimer);

      if (currSecond !== prevSecond) {
        this.updateWaveDisplay();
      }

      if (this.pageTimer >= this.pageDuration) {
        this.currentPage++;
        this.pageTimer = 0;
        this.updateWaveDisplay();
      }
    }

    this.applySynergyEffects(dt);

    this.updateCollectorViruses(dt);

    this.updateSpeechBubbles();

    if (this.isSafeZone) {
      if (Math.random() < 0.008) {
        const randomAlly = this.alliedViruses[Math.floor(Math.random() * this.alliedViruses.length)];
        if (randomAlly) {
          const category = Math.random() < 0.7 ? 'safeChat' : 'safeSolo';
          this.tryVirusSpeech(randomAlly, category, 1.0);
        }
      }
    } else {
      if (Math.random() < 0.00005) {
        const randomAlly = this.alliedViruses[Math.floor(Math.random() * this.alliedViruses.length)];
        if (randomAlly) {
          this.tryVirusSpeech(randomAlly, 'idle', 1.0);
        }
      }
    }

    if (this.miningManager) {
      this.miningManager.update(
        dt, this.core, this.canvas, this.isSafeZone,
        (x, y, color, count) => this.createExplosion(x, y, color, count),
        this.isConquered
      );
      this.miningManager.resolveCabinetCollisions(this.alliedViruses, 3);
    }

    for (let idx = this.alliedViruses.length - 1; idx >= 0; idx--) {
      const v = this.alliedViruses[idx];

      if (v.hp <= 0) {
        this.handleAllyDeath(v, idx);
        continue;
      }

      switch (v.attackType) {
        case "melee":
          this.updateMeleeAlly(v, dt);
          break;
        case "ranged":
          this.updateRangedAlly(v, dt);
          break;
        case "suicide":
          this.updateSuicideAlly(v, dt);
          break;
        case "support":
          this.updateSupportAlly(v, dt);
          break;
        default:
          this.updateMeleeAlly(v, dt);
      }
    }

    if (!this.isConquered) {
      const currentSpawnRate = this.isSafeZone
        ? this.safeZoneSpawnRate
        : this.spawnRate;
      this.waveTimer += dt;
      if (this.waveTimer > currentSpawnRate) {
        this.spawnEnemy();
        this.waveTimer = 0;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const prevHp = enemy.hp;

      if (!Number.isFinite(enemy.hp)) {
        debugLog("Enemy", "hp NaN - removing", "type", enemy.type || enemy.id || "unknown");
        this.enemies.splice(i, 1);
        continue;
      }

      let targetX = this.core.x;
      let targetY = this.core.y;

      if (enemy.tauntedBy) {
        const taunter = this.alliedViruses.find(
          (v) => v === enemy.tauntedBy && v.hp > 0
        );
        if (taunter) {
          targetX = taunter.x;
          targetY = taunter.y;
        } else {
          enemy.tauntedBy = null;
        }
      } else {
        let nearestTank = null;
        let nearestTankDist = Infinity;

        for (const v of this.alliedViruses) {
          if (v.virusType === "TANK" && v.hp > 0) {
            const tankDist = Math.hypot(v.x - enemy.x, v.y - enemy.y);
            if (
              tankDist < (v.aggroRadius || 120) &&
              tankDist < nearestTankDist
            ) {
              nearestTank = v;
              nearestTankDist = tankDist;
            }
          }
        }

        if (nearestTank) {
          targetX = nearestTank.x;
          targetY = nearestTank.y;
        }
      }

      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const distToTarget = Math.hypot(dx, dy);

      const distToCore = Math.hypot(
        this.core.x - enemy.x,
        this.core.y - enemy.y
      );

      if (
        this.core.shieldActive &&
        distToCore < this.core.shieldRadius + enemy.radius
      ) {
        this.core.shieldHp -= 10;
        this.chargeStaticOnHit();
        this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);
        this.enemies.splice(i, 1);

        if (this.core.shieldHp <= 0) {
          this.core.shieldHp = 0;
          this.core.shieldActive = false;
          this.core.shieldState = "BROKEN";
          this.core.shieldTimer = 5.0;
          this.updateShieldBtnUI("BROKEN", "#555");
          this.createExplosion(this.core.x, this.core.y, "#00f0ff", 30);
          this.updateShieldBtnUI("ACTIVE", "#fff");
        }
        continue;
      }

      if (distToCore < this.core.radius + enemy.radius) {
        if (!this.isGodMode) {
          this.core.hp -= enemy.damage;
          this.chargeStaticOnHit();

          if (this.isBossFight) {
            this.frameCoreDamaged++;
          }
        }
        this.createExplosion(enemy.x, enemy.y, "#ff0000", 20);
        this.enemies.splice(i, 1);

        if (this.core.hp <= 0 && !this.isGodMode) {
          this.core.hp = 0;
          this.createExplosion(this.core.x, this.core.y, "#ff0000", 50);
          this.stop();
          if (this.onGameOver) this.onGameOver();
        }
        continue;
      }

      if (enemy.knockbackVx || enemy.knockbackVy) {
        enemy.x += (enemy.knockbackVx || 0) * dt;
        enemy.y += (enemy.knockbackVy || 0) * dt;

        const friction = Math.pow(0.05, dt);
        enemy.knockbackVx = (enemy.knockbackVx || 0) * friction;
        enemy.knockbackVy = (enemy.knockbackVy || 0) * friction;

        if (
          Math.abs(enemy.knockbackVx) < 1 &&
          Math.abs(enemy.knockbackVy) < 1
        ) {
          enemy.knockbackVx = 0;
          enemy.knockbackVy = 0;
        }
      }

      if (distToTarget > 0) {
        const slowMult = enemy.slowMultiplier || 1;
        enemy.x += (dx / distToTarget) * enemy.speed * slowMult * dt;
        enemy.y += (dy / distToTarget) * enemy.speed * slowMult * dt;
      }

      if (prevHp > 1 && enemy.hp <= 1) {
        debugLog(
          "Enemy",
          "hp low",
          "hp",
          enemy.hp,
          "type",
          enemy.type || enemy.id || "unknown"
        );
      }

      if (enemy.hp <= 0) {
        debugLog(
          "Enemy",
          "force cleanup",
          "hp",
          enemy.hp,
          "type",
          enemy.type || enemy.id || "unknown",
          "x",
          Math.round(enemy.x),
          "y",
          Math.round(enemy.y)
        );
        this.enemies.splice(i, 1);
      }
    }

    const stuck = this.enemies.find(e => e.hp <= 0);
    if (stuck) {
      debugLog("Enemy", "stuck hp<=0", "hp", stuck.hp, "type", stuck.type || stuck.id || "unknown");
    }

    this.separateAllViruses();

    let nearestEnemy = null;
    let minDist = Infinity;

    this.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - this.core.x, enemy.y - this.core.y);
      if (dist < this.turret.range && dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy) {
      const dx = nearestEnemy.x - this.core.x;
      const dy = nearestEnemy.y - this.core.y;
      this.turret.angle = Math.atan2(dy, dx);
    } else {
      this.turret.angle += dt * this.idleTurretSpeed;
      this.idleTurretAngle = this.turret.angle;
    }

    this.updateHelper(dt, now);

    this.updateReload(dt);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.target && this.enemies.includes(p.target)) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.hypot(dx, dy);

        p.x += (dx / dist) * p.speed * dt;
        p.y += (dy / dist) * p.speed * dt;

        if (dist < p.radius + p.target.radius) {
          p.target.hp -= p.damage;
          this.createExplosion(p.x, p.y, "#ffff00", 3);
          this.projectiles.splice(i, 1);

          if (p.target.hp <= 0) {
            const idx = this.enemies.indexOf(p.target);
            if (idx > -1) {
              this.enemies.splice(idx, 1);
              this.createExplosion(p.target.x, p.target.y, "#00ff00", 15);

              const gain = 10;
              this.currentData += gain;
              this.updateResourceDisplay(this.currentData);
              if (this.onResourceGained) this.onResourceGained(gain);
            }
          }
        }
      } else {
        if (p.vx !== undefined && p.vy !== undefined) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          p.x += Math.cos(p.angle) * p.speed * dt;
          p.y += Math.sin(p.angle) * p.speed * dt;
        }

        let hitEnemy = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dx = enemy.x - p.x;
          const dy = enemy.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p.radius + enemy.radius) {
            enemy.hp -= p.damage;
            this.createExplosion(p.x, p.y, p.color || "#00ff00", 5);

            if (p.explosive && p.explosionRadius > 0) {
              this.handleExplosion(
                p.x,
                p.y,
                p.explosionRadius,
                p.damage * 0.5,
                p.color
              );
            }

            if (enemy.hp <= 0) {
              this.enemies.splice(j, 1);
              this.createExplosion(enemy.x, enemy.y, p.color || "#00ff00", 15);

              const gain = 10;
              this.currentData += gain;
              this.updateResourceDisplay(this.currentData);
              if (this.onResourceGained) this.onResourceGained(gain);
              this.chargeStaticOnKill();

              const shooter = this.alliedViruses.find(v => v.virusType === 'HUNTER');
              if (shooter) this.tryVirusSpeech(shooter, 'kill', 0.15);
            }

            hitEnemy = true;

            if (!p.piercing) {
              this.projectiles.splice(i, 1);
              break;
            }
            if (!p.piercedEnemies) p.piercedEnemies = [];
            if (!p.piercedEnemies.includes(enemy)) {
              p.piercedEnemies.push(enemy);
            }
          }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;

      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      wave.radius += wave.speed * dt;
      wave.alpha = Math.max(0, 0.8 * (1 - wave.radius / wave.maxRadius));
      wave.lineWidth = Math.max(1, 6 * (1 - wave.radius / wave.maxRadius));

      if (wave.effect && wave.effect.applyOnWave) {
        this.enemies.forEach((enemy) => {
          const dx = enemy.x - wave.x;
          const dy = enemy.y - wave.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= wave.radius) {
            if (!enemy._waveHits) enemy._waveHits = {};
            if (enemy._waveHits[wave.id]) return;
            enemy._waveHits[wave.id] = true;

            this.applyKnockback(
              enemy,
              wave.effect.knockbackSpeed,
              wave.effect.slowMult,
              wave.effect.slowDuration
            );
            enemy.hp -= wave.effect.damage;
          }
        });
      }

      if (wave.radius >= wave.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.slowFields.length - 1; i >= 0; i--) {
      const field = this.slowFields[i];
      field.life -= dt;
      if (field.life <= 0) {
        this.slowFields.splice(i, 1);
      } else {
        field.alpha = field.life / field.maxLife;
        field.phase += dt * 0.6;
      }
    }

    const nowMs = performance.now();
    this.enemies.forEach((enemy) => {
      if (enemy.slowEndTime && nowMs >= enemy.slowEndTime) {
        enemy.slowMultiplier = 1;
        enemy.slowEndTime = null;
      }
    });

    this.updateStaticSystem(dt);
  }

  
  updateStaticSystem(dt) {
    const ss = this.staticSystem;

    if (!Number.isFinite(ss.currentCharge)) ss.currentCharge = 0;
    if (!Number.isFinite(ss.chargeRate)) ss.chargeRate = 0;
    if (!Number.isFinite(ss.maxCharge) || ss.maxCharge <= 0) ss.maxCharge = 100;

    ss.currentCharge += ss.chargeRate * dt;

    if (ss.currentCharge > ss.maxCharge) {
      ss.currentCharge = ss.maxCharge;
    }

    if (ss.currentCharge >= ss.maxCharge && this.enemies.length > 0) {
      this.dischargeStatic();
    }

    for (let i = this.staticEffects.sparks.length - 1; i >= 0; i--) {
      const spark = this.staticEffects.sparks[i];
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.alpha = spark.life / spark.maxLife;
      if (spark.life <= 0) this.staticEffects.sparks.splice(i, 1);
    }

    for (let i = this.staticEffects.chains.length - 1; i >= 0; i--) {
      const chain = this.staticEffects.chains[i];
      chain.life -= dt;
      chain.alpha = chain.life / chain.maxLife;
      if (chain.life <= 0) this.staticEffects.chains.splice(i, 1);
    }

    if (ss.currentCharge > ss.maxCharge * 0.5 && Math.random() < 0.1) {
      this.createStaticSpark();
    }

    this.updateAutoFire(dt);
  }

  handleShieldButtonClick() {
    if (this.shieldBtnMode === "RETURN") {
      this.triggerEmergencyReturn();
      return;
    }
    this.toggleShield();
  }

  triggerEmergencyReturn() {
    if (this.emergencyReturnCharges <= 0) return;
    const now = performance.now();
    if (now - this.lastEmergencyReturnTime < 300) return;
    this.lastEmergencyReturnTime = now;
    debugLog("Defense", "EmergencyReturn invoked", {
      shieldBtnMode: this.shieldBtnMode,
      charges: this.emergencyReturnCharges,
      shieldState: this.core.shieldState,
      shieldActive: this.core.shieldActive,
      x: this.core.x,
      y: this.core.y,
      anchorX: this.shieldAnchor.x,
      anchorY: this.shieldAnchor.y,
    });
    this.emergencyReturnCharges = Math.max(0, this.emergencyReturnCharges - 1);
    this.shieldChargeMultiplier = 0.5;
    this.shieldReadyDuration = this.shieldReadyDurationBase * this.shieldChargeMultiplier;
    this.core.x = this.shieldAnchor.x;
    this.core.y = this.shieldAnchor.y;
    this.updateCamera();
    debugLog("Defense", "EmergencyReturn triggered", "charges", this.emergencyReturnCharges);
    this.playEmergencyReturnAnimation().catch(() => {});
  }

  playEmergencyReturnAnimation() {
    return new Promise((resolve) => {
      const isMobile = window.innerWidth <= 768;
      const startScale = isMobile ? 20.0 : 50.0;
      const duration = isMobile ? 250 : 300;
      const startTime = performance.now();

      this.core.scale = startScale;
      const animateDrop = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeInQuint = (t) => t * t * t * t * t;

        this.core.scale = startScale - (startScale - 1) * easeInQuint(progress);

        if (progress < 1) {
          requestAnimationFrame(animateDrop);
        } else {
          this.core.scale = 1;
          this.applyEmergencyReturnImpact();
          resolve();
        }
      };

      requestAnimationFrame(animateDrop);
    });
  }

  applyEmergencyReturnImpact() {
    const radius = Math.max(this.core.shieldRadius, this.baseShieldRadius) * 3;
    debugLog("Defense", "EmergencyReturn impact", "radius", radius, "enemies", this.enemies.length);
    this.impactEffect({
      radius,
      damage: 20,
      knockbackSpeed: 320,
      slowMult: 0.45,
      slowDuration: 3.0
    });
  }

  
  dischargeStatic() {
    const ss = this.staticSystem;
    ss.currentCharge = 0;
    ss.lastDischargeTime = performance.now();

    if (this.enemies.length === 0) return;

    let nearestEnemy = null;
    let minDist = Infinity;

    this.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - this.core.x, enemy.y - this.core.y);
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (!nearestEnemy) return;

    const hitEnemies = [nearestEnemy];
    let currentTarget = nearestEnemy;
    let prevX = this.core.x;
    let prevY = this.core.y;

    this.addChainLine(prevX, prevY, currentTarget.x, currentTarget.y);
    currentTarget.hp -= ss.damage;
    this.createExplosion(currentTarget.x, currentTarget.y, "#ffff00", 8);

    if (currentTarget.hp <= 0) {
      const idx = this.enemies.indexOf(currentTarget);
      if (idx !== -1) {
        this.enemies.splice(idx, 1);
        this.createExplosion(currentTarget.x, currentTarget.y, "#ffff00", 15);
        const gain = 10;
        this.currentData += gain;
        this.updateResourceDisplay(this.currentData);
        if (this.onResourceGained) this.onResourceGained(gain);
      }
    }

    for (let i = 1; i < ss.chainCount; i++) {
      let nextTarget = null;
      let nextMinDist = Infinity;

      this.enemies.forEach((enemy) => {
        if (hitEnemies.includes(enemy)) return;
        const dist = Math.hypot(
          enemy.x - currentTarget.x,
          enemy.y - currentTarget.y
        );
        if (dist < ss.chainRange && dist < nextMinDist) {
          nextMinDist = dist;
          nextTarget = enemy;
        }
      });

      if (!nextTarget) break;

      this.addChainLine(
        currentTarget.x,
        currentTarget.y,
        nextTarget.x,
        nextTarget.y
      );

      nextTarget.hp -= ss.damage;
      this.createExplosion(nextTarget.x, nextTarget.y, "#ffff00", 6);

      if (nextTarget.hp <= 0) {
        const idx = this.enemies.indexOf(nextTarget);
        if (idx !== -1) {
          this.enemies.splice(idx, 1);
          this.createExplosion(nextTarget.x, nextTarget.y, "#ffff00", 15);
          const gain = 10;
          this.currentData += gain;
          this.updateResourceDisplay(this.currentData);
          if (this.onResourceGained) this.onResourceGained(gain);
        }
      }

      hitEnemies.push(nextTarget);
      currentTarget = nextTarget;
    }

    debugLog("Defense", "Static discharged! Hit", hitEnemies.length, "enemies");
  }

  
  addChainLine(x1, y1, x2, y2) {
    this.staticEffects.chains.push({
      x1,
      y1,
      x2,
      y2,
      life: 0.3,
      maxLife: 0.3,
      alpha: 1,
      color: "#ffff00",
    });
  }

  
  createStaticSpark() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 15;
    const x = this.core.x + Math.cos(angle) * dist;
    const y = this.core.y + Math.sin(angle) * dist;

    this.staticEffects.sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      life: 0.2 + Math.random() * 0.2,
      maxLife: 0.4,
      alpha: 1,
      size: 2 + Math.random() * 3,
    });
  }

  
  chargeStaticOnHit() {
    this.staticSystem.currentCharge += this.staticSystem.hitChargeAmount;
  }

  
  chargeStaticOnKill() {
    this.staticSystem.currentCharge += this.staticSystem.killChargeAmount;
  }

  updateWaveDisplay() {
    const maxPages = this.maxPages || 12;
    let text = "";
    let color = "#00ff00";

    if (this.isConquered) {
      text = "? ?";
      color = "#00ff00";
      this.playBGMTrack('SAFE_ZONE');
    } else if (this.isReinforcementMode) {
      text = `? ${this.reinforcementPage}/${this.reinforcementMaxPages}`;
      color = "#ff3333";
      this.playBGMTrack('FINAL');
      this.bgmManager.updateTempo(this.reinforcementPage, this.reinforcementMaxPages);
    } else if (this.isSafeZone) {
      text = "SAFE ZONE";
      color = "#00ff00";
      this.playBGMTrack('SAFE_ZONE');
    } else if (this.currentPage > maxPages) {
      text = "TODO";
      color = "#ff3333";
      this.playBGMTrack('FINAL');
      this.bgmManager.updateTempo(maxPages, maxPages);
    } else if (this.isFarmingZone) {
      const remainingTime = Math.ceil(this.pageDuration - this.pageTimer);
      text = `PAGE: ${this.currentPage} (${remainingTime}s)`;
      color = "#ffaa00";
      this.playBGMTrack('DEFENSE');
      this.bgmManager.updateTempo(this.currentPage, 99);
    } else {
      const remainingTime = Math.ceil(this.pageDuration - this.pageTimer);
      text = `PAGE: ${this.currentPage}/${maxPages} (${remainingTime}s)`;
      color = "#00f0ff";

      if (this.currentPage >= 10) {
        this.playBGMTrack('FINAL');
      } else {
        this.playBGMTrack('DEFENSE');
      }
      this.bgmManager.updateTempo(this.currentPage, maxPages);
    }

    if (this.onPageUpdate) {
      this.onPageUpdate(text, color);
    }
  }

  skipPageOverlap() {
    if (this.isSafeZone || this.isConquered || this.isReinforcementMode) return;
    const maxPages = this.maxPages || 12;
    const diffScale = this.stageDifficultyScale || 1.0;

    if (this.currentPage < maxPages || this.isFarmingZone) {
      this.currentPage++;
      this.pageTimer = 0;
      if (!this.isFarmingZone) {
        this.spawnRate = Math.max(
          0.13,
          0.4 - this.currentPage * 0.04 * diffScale
        );
      }

      const burstCount = Math.min(30, Math.ceil(this.pageDuration / this.spawnRate));
      for (let i = 0; i < burstCount; i++) {
        this.spawnEnemy();
      }
      this.updateWaveDisplay();
    } else if (!this.conquerReady && !this.isFarmingZone) {
      this.conquerReady = true;
      if (this.onPageUpdate) {
        this.onPageUpdate("TODO", "#ff3333");
      }
      if (this.onConquerReady) {
        this.onConquerReady();
      }
    }
  }

  startReinforcementMode(maxPages = 3) {
    this.isReinforcementMode = true;
    this.reinforcementPage = 1;
    this.reinforcementMaxPages = maxPages;
    this.reinforcementComplete = false;
    this.pageTimer = 0;
    this.spawnRate = 0.17 * this.pageSpawnScale;
    this.updateWaveDisplay();
    debugLog(
      "Defense",
      "Reinforcement Mode Started:",
      maxPages,
      "pages, SpawnRate:",
      this.spawnRate
    );
  }

  resetToNormalMode() {
    this.isReinforcementMode = false;
    this.reinforcementPage = 0;
    this.reinforcementComplete = false;
    this.currentPage = 1;
    this.pageTimer = 0;
    this.spawnRate = 0.4 * this.pageSpawnScale;

    this.core.shieldRadius = 70;
    this.core.shieldState = "OFF";
    this.core.shieldHp = this.core.shieldMaxHp;
    this.shieldBtn.style.pointerEvents = "auto";

    this.updateWaveDisplay();
    debugLog("Defense", "Reset to Normal Mode");
  }

  setConqueredState(conquered) {
    debugLog(
      "DefenseGame",
      "TODO",
      conquered,
      "? isConquered:",
      this.isConquered
    );
    this.isConquered = conquered;
    if (conquered) {
      this.conqueredStartTime = Date.now() / 1000;
      this.lastRotationStep = -1;
      debugLog(
        "DefenseGame",
        "TODO",
        this.conqueredStartTime
      );

      this.emitConquestWave();

      this.spawnRate = 9999;
      this.core.shieldActive = false;
      this.shieldBtn.style.display = "none";

      this.spawnConqueredAllies(10);
    } else {
      debugLog("Conquest", "? ? ?");
      this.conqueredStartTime = null;
      this.conqueredDebugFrame = 0;
      this.lastRotationStep = -1;
    }
    this.updateWaveDisplay();
  }

  emitConquestWave() {
    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 0,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
      speed: 600,
      alpha: 1.0,
      color: "#00ff00",
      lineWidth: 10,
      damageDealt: false,
    });

    this.enemies.forEach((enemy) => {
      this.applyKnockback(enemy, 400, 0.3, 3);
    });
  }

  applyKnockback(enemy, speed, slowMult = 1, slowDuration = 0) {
    const dx = enemy.x - this.core.x;
    const dy = enemy.y - this.core.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    enemy.knockbackVx = (enemy.knockbackVx || 0) + (dx / dist) * speed;
    enemy.knockbackVy = (enemy.knockbackVy || 0) + (dy / dist) * speed;

    if (slowMult < 1 && slowDuration > 0) {
      enemy.slowMultiplier = slowMult;
      enemy.slowTimer = slowDuration;
      enemy.slowEndTime = performance.now() + slowDuration * 1000;
    }
  }

  emitRotationWave(type) {
    let color, lineWidth;

    if (type === "green") {
      color = "rgba(0, 255, 100, 0.8)";
      lineWidth = 4;
    } else if (type === "blue") {
      color = "rgba(0, 200, 255, 0.8)";
      lineWidth = 4;
    } else {
      color = "rgba(0, 255, 200, 0.9)";
      lineWidth = 6;
    }

    this.shockwaves.push({
      x: this.shieldAnchor.x,
      y: this.shieldAnchor.y,
      radius: 0,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.2,
      speed: 400,
      alpha: 0.7,
      color: color,
      lineWidth: lineWidth,
      damageDealt: false,
    });

    this.enemies.forEach((enemy) => {
      if (type === "mixed") {
        this.applyKnockback(enemy, 200);
        enemy.hp -= 15;
      } else {
        this.applyKnockback(enemy, 250, 0.5, 2);
      }
    });
  }

  spawnConqueredAllies(count) {
    this.alliedViruses = [];
    for (let i = 0; i < count; i++) {
      const angle = ((Math.PI * 2) / count) * i;
      const distance = 90 + Math.random() * 30;
      this.alliedViruses.push({
        x: this.core.x + Math.cos(angle) * distance,
        y: this.core.y + Math.sin(angle) * distance,
        radius: 6,
        color: "#00aaff",
        hp: 50,
        maxHp: 50,
        damage: 10,
        angle: angle,
        targetAngle: angle,
      });
    }
  }

  respawnOneAlly(deadAlly = null) {
    if (this.alliedConfig) {
      this.respawnAllyWithConfig(deadAlly);
      return;
    }

    const targetCount = this.isConquered ? 10 : this.alliedInfo.count || 0;

    debugLog(
      "DefenseGame",
      "TODO",
      this.isConquered,
      "targetCount:",
      targetCount,
      "TODO",
      this.alliedViruses.length
    );

    if (targetCount <= 0) {
      debugLog("AllyMovement", "TODO");
      return;
    }

    if (this.alliedViruses.length >= targetCount) {
      debugLog("AllyMovement", "TODO");
      return;
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 30;

    const hp = this.isConquered ? 50 : 10 + (this.alliedInfo.level - 1) * 5;

    const newAlly = {
      x: this.core.x + Math.cos(angle) * distance,
      y: this.core.y + Math.sin(angle) * distance,
      radius: 6,
      color: this.alliedInfo.color || "#00aaff",
      hp: hp,
      maxHp: hp,
      damage: 10,
      angle: angle,
      targetAngle: angle,
      virusType: "SWARM",
      attackType: "melee",
    };

    this.alliedViruses.push(newAlly);
    debugLog(
      "DefenseGame",
      "TODO",
      this.alliedViruses.length
    );

    this.createExplosion(newAlly.x, newAlly.y, "#00aaff", 5);
  }

  respawnAllyWithConfig(deadAlly) {
    const config = this.alliedConfig;
    if (!config) return;

    const targetCount = config.mainCount + config.subCount;
    if (this.alliedViruses.length >= targetCount) return;

    const typeName = deadAlly?.virusType || config.mainType;
    const typeData =
      typeName === config.mainType ? config.mainTypeData : config.subTypeData;

    if (!typeData) return;

    const angle = Math.random() * Math.PI * 2;
    const targetRadius = 95;

    const newAlly = this.createVirusFromType(
      typeName,
      typeData,
      angle,
      targetRadius,
      config
    );
    newAlly.x = this.core.x + Math.cos(angle) * targetRadius;
    newAlly.y = this.core.y + Math.sin(angle) * targetRadius;
    newAlly.spawning = false;

    this.alliedViruses.push(newAlly);
    this.createExplosion(newAlly.x, newAlly.y, newAlly.color, 5);

    this.tryVirusSpeech(newAlly, 'spawn', 0.5);

    debugLog(
      "DefenseGame",
      `TODO`
    );
  }

  handleAllyDeath(v, idx) {
    debugLog("AllyMovement", `? ? ?: ${v.virusType}`);

    if (v.special === "explodeOnDeath" && v.explosionDamage > 0) {
      this.handleExplosion(
        v.x,
        v.y,
        v.explosionRadius,
        v.explosionDamage,
        v.color
      );
    }

    if (v.attackType === "suicide" && !v.exploded) {
      this.handleExplosion(
        v.x,
        v.y,
        v.explosionRadius,
        v.explosionDamage,
        v.color
      );
    }

    this.createExplosion(v.x, v.y, v.color, 8);

    if (this.alliedConfig?.synergy?.effect === "hunterSwarmSpawn" && v.virusType === "HUNTER") {
      this.spawnSynergySwarm(v.x, v.y, 2);
    }

    const deadAlly = { ...v };
    this.alliedViruses.splice(idx, 1);

    const respawnTime = (v.respawnTime || 2) * 1000;
    setTimeout(() => this.respawnOneAlly(deadAlly), respawnTime);
  }

  updateMeleeAlly(v, dt) {
    const searchRange = 700;
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    const hasTankProtectionSynergy = this.alliedConfig?.synergy?.effect === "tankProtection";
    let anchorTank = null;

    if (hasTankProtectionSynergy && v.virusType === "SWARM") {
      let minTankDist = Infinity;
      for (const ally of this.alliedViruses) {
        if (ally.virusType === "TANK" && ally.hp > 0) {
          const tankDist = Math.hypot(ally.x - v.x, ally.y - v.y);
          if (tankDist < minTankDist) {
            minTankDist = tankDist;
            anchorTank = ally;
          }
        }
      }
    }

    if (v.virusType === "TANK" && v.special === "taunt") {
      v.tauntTimer = (v.tauntTimer || 0) + dt;
      const cooldown = v.tauntCooldown || 5;

      if (v.tauntTimer >= cooldown) {
        v.tauntTimer = 0;
        const tauntRadius = v.tauntRadius || 100;

        let tauntedCount = 0;
        for (const enemy of this.enemies) {
          const dist = Math.hypot(enemy.x - v.x, enemy.y - v.y);
          if (dist < tauntRadius) {
            enemy.tauntedBy = v;
            tauntedCount++;

            const pullSpeed = 150;
            const angle = Math.atan2(v.y - enemy.y, v.x - enemy.x);
            enemy.knockbackVx = (enemy.knockbackVx || 0) + Math.cos(angle) * pullSpeed;
            enemy.knockbackVy = (enemy.knockbackVy || 0) + Math.sin(angle) * pullSpeed;
          }
        }

        if (tauntedCount > 0) {
          this.createTauntEffect(v.x, v.y, tauntRadius, v.color);
          this.tryVirusSpeech(v, 'taunt', 0.8);
        }
      }
    }

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
      const collisionDist = v.radius + nearestEnemy.radius + 5;

      if (dist < collisionDist) {
        const damage = v.damage || 10;
        nearestEnemy.hp -= damage;

        this.tryVirusSpeech(v, 'battle', 0.05);

        if (v.virusType === "TANK" && v.knockbackForce > 0) {
          const angle = Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x);
          const knockbackSpeed = v.knockbackForce * 4;
          nearestEnemy.knockbackVx = (nearestEnemy.knockbackVx || 0) + Math.cos(angle) * knockbackSpeed;
          nearestEnemy.knockbackVy = (nearestEnemy.knockbackVy || 0) + Math.sin(angle) * knockbackSpeed;
        }

        let receivedDamage = damage;

        if (v.virusType === "TANK") {
          receivedDamage = Math.floor(damage * 0.3);
        }

        if (v.hasCover) {
          receivedDamage = Math.floor(receivedDamage * 0.5);
        }

        v.hp -= receivedDamage;

        if (receivedDamage > 0) {
          this.tryVirusSpeech(v, 'hurt', 0.1);
        }

        this.createExplosion(
          (v.x + nearestEnemy.x) / 2,
          (v.y + nearestEnemy.y) / 2,
          v.color,
          5
        );

        if (nearestEnemy.hp <= 0) {
          this.killEnemy(nearestEnemy);
          this.tryVirusSpeech(v, 'kill', 0.2);
        }
      } else {
        if (hasTankProtectionSynergy && anchorTank && v.virusType === "SWARM") {
          const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
          const protectionRange = 100;

          if (tankDist > protectionRange) {
            const midX = (anchorTank.x + nearestEnemy.x) / 2;
            const midY = (anchorTank.y + nearestEnemy.y) / 2;
            this.smoothMoveToward(v, midX, midY, dt, 1.0);
          } else {
            this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.2);
          }
        } else {
          this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.2);
        }
      }
    } else {
      if (hasTankProtectionSynergy && anchorTank && v.virusType === "SWARM") {
        const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
        if (tankDist > 80) {
          this.smoothMoveToward(v, anchorTank.x, anchorTank.y, dt, 0.6);
        } else {
          this.fluidPatrol(v, dt, 60);
        }
      } else {
        this.fluidPatrol(v, dt);
      }
    }

    this.keepOutsideBarrier(v);
  }

  updateRangedAlly(v, dt) {
    const searchRange = ((v.range || 150) + 100) * 2;
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    v.attackTimer = (v.attackTimer || 0) + dt;

    const hasHunterCoverSynergy = this.alliedConfig?.synergy?.effect === "hunterCover";
    let anchorTank = null;

    if (hasHunterCoverSynergy) {
      let minTankDist = Infinity;
      for (const ally of this.alliedViruses) {
        if (ally.virusType === "TANK" && ally.hp > 0) {
          const tankDist = Math.hypot(ally.x - v.x, ally.y - v.y);
          if (tankDist < minTankDist) {
            minTankDist = tankDist;
            anchorTank = ally;
          }
        }
      }
    }

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);

      if (dist < searchRange) {
        const fireInterval = 1 / (v.fireRate || 1);
        if (v.attackTimer >= fireInterval) {
          this.fireAllyProjectile(v, nearestEnemy);
          v.attackTimer = 0;
        }

        if (hasHunterCoverSynergy && anchorTank) {
          const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
          const coverRange = 80;

          if (tankDist > coverRange) {
            const enemyToTankAngle = Math.atan2(
              anchorTank.y - nearestEnemy.y,
              anchorTank.x - nearestEnemy.x
            );
            const behindX = anchorTank.x + Math.cos(enemyToTankAngle) * 40;
            const behindY = anchorTank.y + Math.sin(enemyToTankAngle) * 40;
            this.smoothMoveToward(v, behindX, behindY, dt, 1.0);
          } else {
            const strafeAngle = Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) + Math.PI / 2;
            const strafeX = v.x + Math.cos(strafeAngle) * 20;
            const strafeY = v.y + Math.sin(strafeAngle) * 20;
            this.smoothMoveToward(v, strafeX, strafeY, dt, 0.3);
          }
        } else {
          const optimalDist = 100;

          if (dist < optimalDist * 0.6) {
            const awayX = v.x + (v.x - nearestEnemy.x);
            const awayY = v.y + (v.y - nearestEnemy.y);
            this.smoothMoveToward(v, awayX, awayY, dt, 0.8);
          } else if (dist > optimalDist * 1.5) {
            this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 0.6);
          } else {
            const strafeAngle =
              Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) +
              Math.PI / 2;
            const strafeX = v.x + Math.cos(strafeAngle) * 30;
            const strafeY = v.y + Math.sin(strafeAngle) * 30;
            this.smoothMoveToward(v, strafeX, strafeY, dt, 0.4);
          }
        }
      } else {
        this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 0.8);
      }
    } else {
      if (hasHunterCoverSynergy && anchorTank) {
        const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
        if (tankDist > 60) {
          this.smoothMoveToward(v, anchorTank.x, anchorTank.y, dt, 0.5);
        } else {
          this.fluidPatrol(v, dt, 40);
        }
      } else {
        this.fluidPatrol(v, dt);
      }
    }

    this.keepOutsideBarrier(v);
  }

  updateSuicideAlly(v, dt) {
    const searchRange = 800;
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
      const explosionRange = v.radius + nearestEnemy.radius + 10;

      if (dist < explosionRange) {
        v.exploded = true;

        this.tryVirusSpeech(v, 'explode', 1.0);

        let explosionRadius = v.explosionRadius;
        if (this.alliedConfig?.synergy?.effect === "bomberRangeBoost") {
          explosionRadius = Math.floor(explosionRadius * 1.3);
        }

        this.handleExplosion(
          v.x,
          v.y,
          explosionRadius,
          v.explosionDamage,
          v.color
        );

        if (this.alliedConfig?.synergy?.effect === "chainExplosion") {
          this.triggerChainExplosion(v.x, v.y, explosionRadius);
        }

        v.hp = 0;
      } else {
        this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.8);

        v.wobblePhase += dt * 8;
        const wobble = Math.sin(v.wobblePhase) * 15;
        const perpAngle =
          Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) + Math.PI / 2;
        v.x += Math.cos(perpAngle) * wobble * dt;
        v.y += Math.sin(perpAngle) * wobble * dt;
      }
    } else {
      this.fluidPatrol(v, dt);
    }

    this.keepOutsideBarrier(v);
  }

  updateSupportAlly(v, dt) {
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    const healRadius = v.healRadius || 80;
    const healAmount = (v.healAmount || 5) * dt;

    const hasTankHealBoostSynergy = this.alliedConfig?.synergy?.effect === "tankHealBoost";
    let priorityTank = null;

    if (hasTankHealBoostSynergy) {
      let lowestTankHpPercent = 1;
      for (const ally of this.alliedViruses) {
        if (ally.virusType === "TANK" && ally.hp > 0) {
          const hpPercent = ally.hp / ally.maxHp;
          if (hpPercent < lowestTankHpPercent) {
            lowestTankHpPercent = hpPercent;
            priorityTank = ally;
          }
        }
      }
    }

    this.alliedViruses.forEach((ally) => {
      if (ally === v) return;
      const dist = Math.hypot(ally.x - v.x, ally.y - v.y);
      if (dist < healRadius && ally.hp < ally.maxHp) {
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);

        if (Math.random() < 0.05) {
          this.particles.push({
            x: ally.x,
            y: ally.y - 10,
            vx: 0,
            vy: -20,
            life: 0.5,
            maxLife: 0.5,
            alpha: 1,
            color: "#00ff88",
            size: 3,
          });

          this.tryVirusSpeech(v, 'heal', 0.1);
        }
      }
    });

    if (hasTankHealBoostSynergy) {
      this.alliedViruses.forEach((ally) => {
        if (ally.virusType === "TANK") {
          const dist = Math.hypot(ally.x - v.x, ally.y - v.y);
          if (dist < healRadius && ally.hp < ally.maxHp) {
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
          }
        }
      });
    }

    if (hasTankHealBoostSynergy && priorityTank) {
      const tankDist = Math.hypot(priorityTank.x - v.x, priorityTank.y - v.y);
      const tankHpPercent = priorityTank.hp / priorityTank.maxHp;

      if (tankHpPercent < 0.8 || tankDist > healRadius) {
        this.smoothMoveToward(v, priorityTank.x, priorityTank.y, dt, 0.7);
      } else {
        this.fluidPatrol(v, dt, 50);
      }
    } else {
      let woundedAlly = null;
      let lowestHpPercent = 1;
      this.alliedViruses.forEach((ally) => {
        if (ally === v) return;
        const hpPercent = ally.hp / ally.maxHp;
        if (hpPercent < lowestHpPercent && hpPercent < 0.8) {
          lowestHpPercent = hpPercent;
          woundedAlly = ally;
        }
      });

      if (woundedAlly) {
        this.smoothMoveToward(v, woundedAlly.x, woundedAlly.y, dt, 0.5);
      } else {
        this.fluidPatrol(v, dt, 75);
      }
    }

    this.keepOutsideBarrier(v);
  }

  triggerChainExplosion(x, y, triggerRadius) {
    const chainRange = triggerRadius + 30;
    const swarms = this.alliedViruses.filter(
      (v) => v.virusType === "SWARM" && v.hp > 0 && !v.chainExploded
    );

    for (const swarm of swarms) {
      const dist = Math.hypot(swarm.x - x, swarm.y - y);
      if (dist < chainRange) {
        swarm.chainExploded = true;
        swarm.hp = 0;

        this.handleExplosion(
          swarm.x,
          swarm.y,
          swarm.explosionRadius || 25,
          (swarm.explosionDamage || 5) * 2,
          swarm.color
        );
      }
    }
  }

  applySynergyEffects(dt) {
    if (!this.alliedConfig?.synergy) return;

    const synergy = this.alliedConfig.synergy;
    const effect = synergy.effect;

    const tanks = this.alliedViruses.filter(
      (v) => v.virusType === "TANK" && v.hp > 0
    );

    switch (effect) {
      case "tankProtection":
        this.alliedViruses.forEach((v) => {
          if (v.virusType !== "SWARM") return;

          let nearTank = false;
          for (const tank of tanks) {
            const dist = Math.hypot(v.x - tank.x, v.y - tank.y);
            if (dist < 100) {
              nearTank = true;
              break;
            }
          }

          if (nearTank && !v.tankProtectionBuff) {
            v.tankProtectionBuff = true;
            const hpRatio = v.hp / v.maxHp;
            v.maxHp = Math.floor(v.baseMaxHp * 1.5);
            v.hp = Math.floor(v.maxHp * hpRatio);
          } else if (!nearTank && v.tankProtectionBuff) {
            v.tankProtectionBuff = false;
            const hpRatio = v.hp / v.maxHp;
            v.maxHp = v.baseMaxHp;
            v.hp = Math.floor(v.maxHp * hpRatio);
          }
        });
        break;

      case "hunterCover":
        this.alliedViruses.forEach((v) => {
          if (v.virusType !== "HUNTER") return;

          let nearTank = false;
          for (const tank of tanks) {
            const dist = Math.hypot(v.x - tank.x, v.y - tank.y);
            if (dist < 80) {
              nearTank = true;
              break;
            }
          }
          v.hasCover = nearTank;
        });
        break;

    }
  }

  findNearestEnemy(v, range) {
    let nearestEnemy = null;
    let minDist = Infinity;

    for (let j = 0; j < this.enemies.length; j++) {
      const enemy = this.enemies[j];
      const dist = Math.hypot(enemy.x - v.x, enemy.y - v.y);
      if (dist < range && dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    }
    return nearestEnemy;
  }

  smoothMoveToward(v, targetX, targetY, dt, speedMultiplier = 1.0) {
    const dx = targetX - v.x;
    const dy = targetY - v.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) return;

    const baseSpeed = (v.speed || 80) * speedMultiplier;
    const acceleration = baseSpeed * 3;
    const friction = 0.92;

    const ax = (dx / dist) * acceleration * dt;
    const ay = (dy / dist) * acceleration * dt;

    v.vx = (v.vx + ax) * friction;
    v.vy = (v.vy + ay) * friction;

    const currentSpeed = Math.hypot(v.vx, v.vy);
    const maxSpeed = baseSpeed * 1.5;
    if (currentSpeed > maxSpeed) {
      v.vx = (v.vx / currentSpeed) * maxSpeed;
      v.vy = (v.vy / currentSpeed) * maxSpeed;
    }

    v.x += v.vx * dt;
    v.y += v.vy * dt;
  }

  fluidPatrol(v, dt, baseRadius = 95) {
    if (this.isSafeZone) {
      if (!this._safeZoneLogOnce) {
        debugLog("Enemy", "fluidPatrol -> safeZoneWander (isSafeZone:", this.isSafeZone, ")");
        this._safeZoneLogOnce = true;
      }
      this.safeZoneWander(v, dt);
      return;
    }

    if (!v.patrolAngle) v.patrolAngle = v.angle || Math.random() * Math.PI * 2;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;
    if (!v.radiusOffset) v.radiusOffset = (Math.random() - 0.5) * 20;

    const baseAngularSpeed = 0.3 + Math.sin(v.wobblePhase * 0.5) * 0.15;
    v.patrolAngle += dt * baseAngularSpeed;
    v.wobblePhase += dt * 2;

    const wobbleRadius = Math.sin(v.wobblePhase) * 15;
    const patrolRadius = baseRadius + v.radiusOffset + wobbleRadius;

    const targetX = this.core.x + Math.cos(v.patrolAngle) * patrolRadius;
    const targetY = this.core.y + Math.sin(v.patrolAngle) * patrolRadius;

    this.smoothMoveToward(v, targetX, targetY, dt, 0.4);

    v.x += (Math.random() - 0.5) * 0.5;
    v.y += (Math.random() - 0.5) * 0.5;
  }

  safeZoneWander(v, dt) {
    const screenW = this.canvas.width;
    const screenH = this.canvas.height;
    const margin = 40;

    const barrierRadius = (this.core.shieldRadius || 70) + 20;

    if (!v.homeX) {
      let homeX, homeY, distFromCore;
      do {
        homeX = margin + Math.random() * (screenW - margin * 2);
        homeY = margin + Math.random() * (screenH - margin * 2);
        distFromCore = Math.hypot(homeX - this.core.x, homeY - this.core.y);
      } while (distFromCore < barrierRadius);

      v.homeX = homeX;
      v.homeY = homeY;
      v.homeRadius = 60 + Math.random() * 80;
    }

    const getNearHomePos = () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * v.homeRadius;
      let x = v.homeX + Math.cos(angle) * dist;
      let y = v.homeY + Math.sin(angle) * dist;
      x = Math.max(margin, Math.min(screenW - margin, x));
      y = Math.max(margin, Math.min(screenH - margin, y));
      return { x, y };
    };

    if (v.safeState === undefined) {
      v.safeState = 'wander';
      v.stateTimer = 0;
      v.stateDuration = 3 + Math.random() * 4;
      v.chatPartner = null;
      v.chatOffsetAngle = Math.random() * Math.PI * 2;

      const pos = getNearHomePos();
      v.wanderTargetX = pos.x;
      v.wanderTargetY = pos.y;
    }

    v.stateTimer += dt;

    switch (v.safeState) {
      case 'wander':
        if (v.stateTimer >= v.stateDuration) {
          v.stateTimer = 0;

          const roll = Math.random();

          if (roll < 0.5 && this.alliedViruses.length > 1) {
            const nearbyFriends = this.alliedViruses.filter(a =>
              a !== v &&
              a.safeState !== 'approaching' &&
              Math.hypot(a.x - v.homeX, a.y - v.homeY) < 250
            );

            if (nearbyFriends.length > 0) {
              v.chatPartner = nearbyFriends[Math.floor(Math.random() * nearbyFriends.length)];
              v.safeState = 'approaching';
              v.stateDuration = 4 + Math.random() * 3;
            } else {
              const pos = getNearHomePos();
              v.wanderTargetX = pos.x;
              v.wanderTargetY = pos.y;
              v.stateDuration = 3 + Math.random() * 3;
            }
          } else if (roll < 0.65) {
            const farFriends = this.alliedViruses.filter(a =>
              a !== v &&
              Math.hypot(a.homeX - v.homeX, a.homeY - v.homeY) > 150
            );

            if (farFriends.length > 0) {
              v.chatPartner = farFriends[Math.floor(Math.random() * farFriends.length)];
              v.safeState = 'approaching';
              v.stateDuration = 6 + Math.random() * 4;
            }
          } else {
            const pos = getNearHomePos();
            v.wanderTargetX = pos.x;
            v.wanderTargetY = pos.y;
            v.stateDuration = 2 + Math.random() * 4;
          }
        }

        this.smoothMoveToward(v, v.wanderTargetX, v.wanderTargetY, dt, 0.25);
        break;

      case 'approaching':
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }

        const distToPartner = Math.hypot(v.chatPartner.x - v.x, v.chatPartner.y - v.y);

        if (distToPartner < 25) {
          v.safeState = 'chatting';
          v.stateTimer = 0;
          v.stateDuration = 4 + Math.random() * 6;
          v.chatOffsetAngle = Math.atan2(v.y - v.chatPartner.y, v.x - v.chatPartner.x);
        } else if (v.stateTimer >= v.stateDuration) {
          v.safeState = 'wander';
          v.chatPartner = null;
        } else {
          this.smoothMoveToward(v, v.chatPartner.x, v.chatPartner.y, dt, 0.5);
        }
        break;

      case 'chatting':
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }

        if (v.stateTimer >= v.stateDuration) {
          if (Math.random() < 0.6) {
            v.safeState = 'walkingTogether';
            v.stateTimer = 0;
            v.stateDuration = 4 + Math.random() * 4;

            const targetHome = Math.random() < 0.5 ? v : v.chatPartner;
            if (targetHome && targetHome.homeX) {
              const angle = Math.random() * Math.PI * 2;
              const dist = Math.random() * (targetHome.homeRadius || 80);
              v.wanderTargetX = targetHome.homeX + Math.cos(angle) * dist;
              v.wanderTargetY = targetHome.homeY + Math.sin(angle) * dist;
            } else {
              v.wanderTargetX = v.x + (Math.random() - 0.5) * 100;
              v.wanderTargetY = v.y + (Math.random() - 0.5) * 100;
            }
          } else {
            v.safeState = 'wander';
            v.chatPartner = null;
          }
        } else {
          const stickDist = 18;
          const targetX = v.chatPartner.x + Math.cos(v.chatOffsetAngle) * stickDist;
          const targetY = v.chatPartner.y + Math.sin(v.chatOffsetAngle) * stickDist;

          v.x += (targetX - v.x) * 0.1;
          v.y += (targetY - v.y) * 0.1;

          v.x += (Math.random() - 0.5) * 0.3;
          v.y += (Math.random() - 0.5) * 0.3;
        }
        break;

      case 'walkingTogether':
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }

        if (v.stateTimer >= v.stateDuration) {
          v.safeState = 'wander';
          v.chatPartner = null;
        } else {
          this.smoothMoveToward(v, v.wanderTargetX, v.wanderTargetY, dt, 0.25);

          if (v.chatPartner.safeState === 'chatting' || v.chatPartner.safeState === 'walkingTogether') {
            v.chatPartner.wanderTargetX = v.wanderTargetX + (Math.random() - 0.5) * 30;
            v.chatPartner.wanderTargetY = v.wanderTargetY + (Math.random() - 0.5) * 30;
          }

          const distToPartner2 = Math.hypot(v.chatPartner.x - v.x, v.chatPartner.y - v.y);
          if (distToPartner2 > 40) {
            const pullX = (v.chatPartner.x - v.x) * 0.02;
            const pullY = (v.chatPartner.y - v.y) * 0.02;
            v.x += pullX;
            v.y += pullY;
          }
        }
        break;
    }

    const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
    const pushStartDist = 100;

    if (distFromCore < pushStartDist && distFromCore > 0) {
      const pushStrength = (1 - distFromCore / pushStartDist) * 2.0;
      const pushAngle = Math.atan2(v.y - this.core.y, v.x - this.core.x);

      v.x += Math.cos(pushAngle) * pushStrength;
      v.y += Math.sin(pushAngle) * pushStrength;
    }

    v.x = Math.max(margin, Math.min(screenW - margin, v.x));
    v.y = Math.max(margin, Math.min(screenH - margin, v.y));
    v.wanderTargetX = Math.max(margin, Math.min(screenW - margin, v.wanderTargetX || v.x));
    v.wanderTargetY = Math.max(margin, Math.min(screenH - margin, v.wanderTargetY || v.y));
  }

  keepOutsideBarrier(v) {
    if (!this._debugLogTimer) this._debugLogTimer = 0;
    this._debugLogTimer += 0.016;
    const shouldLog = this._debugLogTimer > 1 && v === this.alliedViruses[0];
    if (shouldLog) this._debugLogTimer = 0;

    if (this.isSafeZone) {
      const barrierRadius = this.core.shieldActive
        ? (this.core.shieldRadius || 70)
        : this.core.radius;
      const minDistance = barrierRadius + v.radius + 5;
      const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);

      if (shouldLog) {
        const margin = 30;
        debugLog("AllyMovement", `TODO`);
      }

      if (distFromCore < minDistance) {
        const angle = Math.atan2(v.y - this.core.y, v.x - this.core.x);
        v.x = this.core.x + Math.cos(angle) * minDistance;
        v.y = this.core.y + Math.sin(angle) * minDistance;
      }
      return;
    }

    const barrierRadius = this.core.shieldActive
      ? (this.core.shieldRadius || 70)
      : this.core.radius;
    const minDistance = barrierRadius + v.radius + 5;
    const margin = 30;
    const worldW = this.core.worldWidth || this.canvas.width;
    const worldH = this.core.worldHeight || this.canvas.height;

    const minX = margin;
    const maxX = worldW - margin;
    const minY = margin;
    const maxY = worldH - margin;

    const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
    const angle = Math.atan2(v.y - this.core.y, v.x - this.core.x);

    if (shouldLog) {
      debugLog("AllyMovement", `TODO`);
    }

    if (distFromCore < minDistance) {
      v.x = this.core.x + Math.cos(angle) * minDistance;
      v.y = this.core.y + Math.sin(angle) * minDistance;

      if (v.vx !== undefined) {
        const dot = v.vx * Math.cos(angle) + v.vy * Math.sin(angle);
        if (dot < 0) {
          v.vx -= 2 * dot * Math.cos(angle);
          v.vy -= 2 * dot * Math.sin(angle);
        }
      }
    }

    let wasOutside = false;
    if (v.x < minX) { v.x = minX; wasOutside = true; }
    if (v.x > maxX) { v.x = maxX; wasOutside = true; }
    if (v.y < minY) { v.y = minY; wasOutside = true; }
    if (v.y > maxY) { v.y = maxY; wasOutside = true; }

    if (wasOutside && v.vx !== undefined) {
      v.vx *= 0.5;
      v.vy *= 0.5;
    }
  }

  moveTowardTarget(v, target, dt) {
    this.smoothMoveToward(v, target.x, target.y, dt, 1.0);
  }

  patrolAlly(v, dt) {
    this.fluidPatrol(v, dt);
  }

  separateAllViruses() {
    const allEntities = [];

    this.alliedViruses.forEach(v => {
      allEntities.push({ entity: v, type: 'ally' });
    });

    this.enemies.forEach(e => {
      allEntities.push({ entity: e, type: 'enemy' });
    });

    this.collectorViruses.forEach(c => {
      allEntities.push({ entity: c, type: 'collector' });
    });

    for (let i = 0; i < allEntities.length; i++) {
      for (let j = i + 1; j < allEntities.length; j++) {
        const a = allEntities[i].entity;
        const b = allEntities[j].entity;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = (a.radius || 8) + (b.radius || 8) + 2;

        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const pushX = (dx / dist) * overlap * 0.5;
          const pushY = (dy / dist) * overlap * 0.5;

          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;
        }
      }
    }
  }

  killEnemy(enemy) {
    const enemyIdx = this.enemies.indexOf(enemy);
    if (enemyIdx > -1) {
      this.enemies.splice(enemyIdx, 1);
      this.createExplosion(enemy.x, enemy.y, "#00ff00", 10);

      const gain = 10;
      this.currentData += gain;
      this.updateResourceDisplay(this.currentData);
      if (this.onResourceGained) this.onResourceGained(gain);

      if (this.onEnemyKilled) {
        this.onEnemyKilled(enemy.x, enemy.y);
      }

      if (this.isBossFight) {
        this.frameEnemiesKilled++;
      }

      const effects = this.getItemEffects();
      if (effects.lifesteal > 0 && this.core.shieldHp < this.core.shieldMaxHp) {
        this.core.shieldHp = Math.min(this.core.shieldMaxHp, this.core.shieldHp + effects.lifesteal);
      }
    }
  }

  fireAllyProjectile(v, target) {
    const angle = Math.atan2(target.y - v.y, target.x - v.x);

    this.projectiles.push({
      x: v.x,
      y: v.y,
      vx: Math.cos(angle) * (v.projectileSpeed || 200),
      vy: Math.sin(angle) * (v.projectileSpeed || 200),
      damage: v.damage,
      radius: 3,
      color: v.color,
      fromAlly: true,
      lifetime: 2,
      age: 0,
    });

    this.createExplosion(v.x, v.y, v.color, 3);
  }

  spawnSynergySwarm(x, y, count) {
    if (!this.alliedConfig) return;

    const config = this.alliedConfig;
    const swarmData =
      config.mainType === "SWARM"
        ? config.mainTypeData
        : config.subType === "SWARM"
          ? config.subTypeData
          : null;

    if (!swarmData) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const newSwarm = this.createVirusFromType(
        "SWARM",
        swarmData,
        angle,
        95,
        config
      );
      newSwarm.x = x + (Math.random() - 0.5) * 20;
      newSwarm.y = y + (Math.random() - 0.5) * 20;
      newSwarm.spawning = false;

      this.alliedViruses.push(newSwarm);
      this.createExplosion(newSwarm.x, newSwarm.y, swarmData.color, 4);
    }
  }

  renderConqueredVisuals() {
    const ctx = this.ctx;
    const x = this.shieldAnchor.x;
    const y = this.shieldAnchor.y;
    const size = 80;

    if (!this.conqueredStartTime) {
      this.conqueredStartTime = Date.now() / 1000;
      debugLog(
        "ConqueredVisuals",
        "TODO",
        this.conqueredStartTime
      );
    }
    const elapsed = Date.now() / 1000 - this.conqueredStartTime;

    const ROTATION_TIME = 0.8;
    const PAUSE_TIME = 0.5;
    const CYCLE_DURATION = ROTATION_TIME * 3 + PAUSE_TIME * 3;

    const cycleTime = elapsed % CYCLE_DURATION;
    const fullCycles = Math.floor(elapsed / CYCLE_DURATION);
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    let targetAngle;
    let currentStep = 0;

    if (cycleTime < ROTATION_TIME) {
      const progress = easeInOut(cycleTime / ROTATION_TIME);
      targetAngle = progress * (Math.PI / 2);
      currentStep = 0;
    } else if (cycleTime < ROTATION_TIME + PAUSE_TIME) {
      targetAngle = Math.PI / 2;
      currentStep = 1;
    } else if (cycleTime < ROTATION_TIME * 2 + PAUSE_TIME) {
      const localTime = cycleTime - (ROTATION_TIME + PAUSE_TIME);
      const progress = easeInOut(localTime / ROTATION_TIME);
      targetAngle = Math.PI / 2 + progress * (Math.PI / 2);
      currentStep = 2;
    } else if (cycleTime < ROTATION_TIME * 2 + PAUSE_TIME * 2) {
      targetAngle = Math.PI;
      currentStep = 3;
    } else if (cycleTime < ROTATION_TIME * 3 + PAUSE_TIME * 2) {
      const localTime = cycleTime - (ROTATION_TIME * 2 + PAUSE_TIME * 2);
      const progress = easeInOut(localTime / ROTATION_TIME);
      targetAngle = Math.PI + progress * Math.PI;
      currentStep = 4;
    } else {
      targetAngle = Math.PI * 2;
      currentStep = 5;
    }

    const globalStep = fullCycles * 6 + currentStep;
    if (
      this.lastRotationStep !== undefined &&
      this.lastRotationStep !== globalStep
    ) {
      if (currentStep === 1) {
        this.emitRotationWave("green");
      } else if (currentStep === 3) {
        this.emitRotationWave("blue");
      } else if (currentStep === 5) {
        this.emitRotationWave("mixed");
      }
    }
    this.lastRotationStep = globalStep;

    const baseAngle = fullCycles * Math.PI * 2;
    const rotationAngle = baseAngle + targetAngle;

    if (!this.conqueredDebugFrame) this.conqueredDebugFrame = 0;
    this.conqueredDebugFrame++;
    if (this.conqueredDebugFrame % 60 === 0) {
      debugLog(
        "ConqueredVisuals",
        `elapsed: ${elapsed.toFixed(2)}s, ` +
        `cycleTime: ${cycleTime.toFixed(2)}s, ` +
        `fullCycles: ${fullCycles}, ` +
        `targetAngle: ${((targetAngle * 180) / Math.PI).toFixed(1)}, ` +
        `baseAngle: ${((baseAngle * 180) / Math.PI).toFixed(1)}, ` +
        `rotationAngle: ${((rotationAngle * 180) / Math.PI).toFixed(1)}`
      );
    }

    ctx.save();
    ctx.translate(x, y);

    ctx.save();
    ctx.rotate(rotationAngle);
    ctx.strokeStyle = `rgba(0, 255, 100, 0.6)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    ctx.save();
    const reverseAngle = Math.PI / 4 - rotationAngle;
    ctx.rotate(reverseAngle);
    ctx.strokeStyle = `rgba(0, 200, 255, 0.6)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    if (this.conqueredDebugFrame % 60 === 0) {
      debugLog(
        "ConqueredVisuals",
        `TODO` +
        `TODO`
      );
    }

    ctx.restore();

    ctx.save();
    ctx.translate(x, y - 25);

    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -40);
    ctx.stroke();

    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(20 + Math.sin(elapsed * 3) * 3, -35);
    ctx.lineTo(20 + Math.sin(elapsed * 3 + 1) * 3, -25);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#00aa00";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }


  
  spawnDroppedItem(x, y, item) {
    this.droppedItems.push({
      x,
      y,
      item,
      spawnTime: performance.now(),
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2
    });

    this.spawnCollectorVirus(x, y);
  }

  
  spawnCollectorVirus(targetX, targetY) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 30;

    this.collectorViruses.push({
      x: this.core.x + Math.cos(angle) * spawnDist,
      y: this.core.y + Math.sin(angle) * spawnDist,
      vx: 0,
      vy: 0,
      targetX,
      targetY,
      speed: 120,
      state: "toItem",
      carriedItem: null,
      spawnTime: performance.now(),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 5 + Math.random() * 3,
      pathOffset: (Math.random() - 0.5) * 40
    });
  }

  
  updateCollectorViruses(dt) {
    for (let i = this.collectorViruses.length - 1; i >= 0; i--) {
      const v = this.collectorViruses[i];

      v.wobblePhase += dt * v.wobbleSpeed;

      let targetX, targetY;

      if (v.state === "toItem") {
        targetX = v.targetX;
        targetY = v.targetY;

        const dist = Math.hypot(targetX - v.x, targetY - v.y);

        if (dist < 15) {
          const droppedItem = this.droppedItems.find(
            d => !d.collected && Math.hypot(d.x - v.x, d.y - v.y) < 25
          );

          if (droppedItem) {
            droppedItem.collected = true;
            v.carriedItem = droppedItem.item;
            v.state = "returning";
            v.speed = 180;
          } else {
            v.state = "returning";
          }
          continue;
        }
      } else if (v.state === "returning") {
        targetX = this.core.x;
        targetY = this.core.y;

        const dist = Math.hypot(targetX - v.x, targetY - v.y);

        if (dist < 25) {
          if (v.carriedItem && this.onItemCollected) {
            this.onItemCollected(v.carriedItem);
          }
          this.createExplosion(v.x, v.y, "#00ff88", 5);
          this.collectorViruses.splice(i, 1);
          continue;
        }
      } else {
        continue;
      }

      const dx = targetX - v.x;
      const dy = targetY - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        const targetVx = (dx / dist) * v.speed;
        const targetVy = (dy / dist) * v.speed;

        const accel = 8;
        v.vx += (targetVx - v.vx) * accel * dt;
        v.vy += (targetVy - v.vy) * accel * dt;

        const wobbleAmount = Math.sin(v.wobblePhase) * 25;
        const perpAngle = Math.atan2(dy, dx) + Math.PI / 2;
        const wobbleX = Math.cos(perpAngle) * wobbleAmount * dt;
        const wobbleY = Math.sin(perpAngle) * wobbleAmount * dt;

        v.x += v.vx * dt + wobbleX;
        v.y += v.vy * dt + wobbleY;
      }
    }

    this.droppedItems = this.droppedItems.filter(d => !d.collected);
  }

  
  renderDroppedItems() {
    const ctx = this.ctx;
    const now = performance.now();

    this.droppedItems.forEach(d => {
      if (d.collected) return;

      const age = (now - d.spawnTime) / 1000;
      const pulse = 1 + Math.sin(d.pulsePhase + age * 4) * 0.15;
      const size = 12 * pulse;

      const colors = {
        common: "#ffffff",
        rare: "#00aaff",
        legendary: "#ffaa00"
      };
      const color = colors[d.item.rarity] || "#ffffff";

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = `${size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(d.item.icon, d.x, d.y);

      ctx.restore();
    });
  }

  
  renderCollectorViruses() {
    const ctx = this.ctx;
    const time = performance.now() / 1000;

    this.collectorViruses.forEach(v => {
      const baseSize = 6;

      ctx.save();

      const wobble = Math.sin(time * 5 + v.wobblePhase) * 1.5;
      const breathe = 1 + Math.sin(time * 3 + v.wobblePhase * 2) * 0.1;
      const size = baseSize * breathe;

      const offsetX = wobble * 0.4;
      const offsetY = Math.cos(time * 4 + v.wobblePhase) * 0.8;

      const drawX = v.x + offsetX;
      const drawY = v.y + offsetY;

      const moveAngle = Math.atan2(v.vy || 0, v.vx || 0);
      const speed = Math.hypot(v.vx || 0, v.vy || 0);
      const tilt = (speed / v.speed) * 0.2;

      ctx.translate(drawX, drawY);
      ctx.rotate(tilt * Math.sin(moveAngle));

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(2, 3, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyColor = v.carriedItem ? "#00ff88" : "#88ffcc";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = v.carriedItem ? "#00aa55" : "#55aa88";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
      ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (v.carriedItem) {
        ctx.save();
        const floatY = Math.sin(time * 6) * 2;

        const itemColor = this.getItemRarityColor(v.carriedItem.rarity);
        ctx.shadowColor = itemColor;
        ctx.shadowBlur = 8;

        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(v.carriedItem.icon, drawX, drawY - 12 + floatY);
        ctx.restore();
      }
    });
  }

  
  getItemRarityColor(rarity) {
    const colors = {
      common: "#ffffff",
      rare: "#00aaff",
      legendary: "#ffaa00"
    };
    return colors[rarity] || "#ffffff";
  }

  render() {
    if (!this.renderDebugFrameCount) this.renderDebugFrameCount = 0;

    const shouldLog = this.renderDebugFrameCount < 3;
    if (shouldLog) {
      this.renderDebugFrameCount++;
      const mode = this.isMiniDisplay ? "" : "?";
      debugLog("Canvas", `TODO`);
      debugLog("Canvas", "canvas.id:", this.canvas.id);
      debugLog("Canvas", "canvas size:", this.canvas.width, "x", this.canvas.height);
      debugLog("Canvas", "canvas.style.display:", this.canvas.style.display);
      debugLog("Canvas", "isMiniDisplay:", this.isMiniDisplay);
      debugLog("Canvas", "gameScale:", this.gameScale);
      debugLog("Canvas", "?:", this.alliedViruses.length, "TODO", this.enemies.length);
      debugLog("Canvas", " ?:", this.core.x, this.core.y);
      debugLog("Canvas", "TODO", this.core.radius);
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(this.gameScale, this.gameScale);
    this.ctx.translate(-centerX, -centerY);
    this.ctx.translate(-this.camera.x + centerX, -this.camera.y + centerY);

    const time = Date.now() / 1000;
    const isMobile = this.isMobile;

    if (this.miningManager) {
      this.miningManager.render(this.ctx, time, isMobile);
    }
    if (!this.isSafeZone) {
      this.renderMiningEffect(this.ctx, time);
    }

    if (this.isConquered) {
      if (!this.conqueredRenderLogged) {
        debugLog(
          "DefenseGame",
          "TODO",
          this.isConquered,
          "conqueredStartTime:",
          this.conqueredStartTime
        );
        this.conqueredRenderLogged = true;
      }
      this.renderConqueredVisuals();
    } else {
      this.conqueredRenderLogged = false;
    }

    if (!this.isConquered) {
      const shieldRadius = Math.max(0, this.core.shieldRadius);
      const cx = this.shieldAnchor.x;
      const cy = this.shieldAnchor.y;
      const sv = this.shieldVisual;
      const state = this.core.shieldState;

      const hpRatio = this.core.shieldHp / this.core.shieldMaxHp;
      const r = Math.floor(255 * (1 - hpRatio));
      const g = Math.floor(200 * hpRatio + 50 * (1 - hpRatio));
      const b = Math.floor(255 * hpRatio + 50 * (1 - hpRatio));

      let dashOffset = sv.rotation;
      if (state === "BROKEN" || state === "RECHARGING") {
        const stepDuration = 500;
        const stepSize = 20;
        const currentStep = Math.floor(Date.now() / stepDuration);
        dashOffset = currentStep * stepSize;
      }

      if (sv.fillAlpha > 0.01 && shieldRadius > 0) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${sv.fillAlpha})`;
        this.ctx.fill();
      }

      if (shieldRadius <= 0) {
        this.ctx.setLineDash([]);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);

        if (sv.dashGap > 0.5) {
          const dashLength = Math.max(3, 10 - sv.dashGap * 0.3);
          this.ctx.setLineDash([dashLength, sv.dashGap]);
          this.ctx.lineDashOffset = -dashOffset;
        } else {
          this.ctx.setLineDash([]);
        }

        this.ctx.lineWidth = sv.lineWidth;

        let alpha = sv.alpha;
        if (state === "ACTIVE") {
          alpha = sv.alpha + Math.sin(Date.now() / 200) * 0.15;
        }

        if (state === "BROKEN" || state === "RECHARGING") {
          this.ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
        } else {
          this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }

    this.alliedViruses.forEach((v) => {
      this.ctx.save();

      if (isMobile) {
        this.ctx.translate(v.x, v.y);
      } else {
        const wobble = Math.sin(time * 5 + (v.wobblePhase || 0)) * 1.5;
        const breathe =
          1 + Math.sin(time * 3 + (v.wobblePhase || 0) * 2) * 0.08;

        this.ctx.translate(v.x + wobble * 0.3, v.y + wobble * 0.2);
        this.ctx.scale(breathe, breathe);

        this.ctx.shadowColor = v.color;
        this.ctx.shadowBlur = 8;
      }

      switch (v.virusType) {
        case "TANK":
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = Math.cos(angle) * v.radius;
            const py = Math.sin(angle) * v.radius;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
          }
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.strokeStyle = "#ffffff44";
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          break;

        case "HUNTER":
          const moveAngle = Math.atan2(v.vy || 0, v.vx || 0);
          this.ctx.rotate(moveAngle);
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.moveTo(v.radius, 0);
          this.ctx.lineTo(-v.radius * 0.7, v.radius * 0.6);
          this.ctx.lineTo(-v.radius * 0.7, -v.radius * 0.6);
          this.ctx.closePath();
          this.ctx.fill();
          break;

        case "BOMBER":
          if (!isMobile) {
            const blink = Math.sin(time * 10) > 0 ? 1 : 0.6;
            this.ctx.globalAlpha = blink;
          }
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillStyle = "#ffff00";
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius * 0.4, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case "HEALER":
          this.ctx.fillStyle = v.color;
          const armWidth = v.radius * 0.4;
          const armLength = v.radius;
          this.ctx.fillRect(-armLength, -armWidth / 2, armLength * 2, armWidth);
          this.ctx.fillRect(-armWidth / 2, -armLength, armWidth, armLength * 2);
          this.ctx.beginPath();
          this.ctx.arc(0, 0, armWidth * 0.8, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case "SWARM":
        default:
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }

      const eyeSize = v.radius * 0.2;

      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(-v.radius * 0.3, -v.radius * 0.1, eyeSize, 0, Math.PI * 2);
      this.ctx.arc(v.radius * 0.3, -v.radius * 0.1, eyeSize, 0, Math.PI * 2);
      this.ctx.fill();

      if (v.hp < v.maxHp) {
        if (!isMobile) this.ctx.shadowBlur = 0;
        const barWidth = v.radius * 2;
        const barHeight = 2;
        const hpPercent = v.hp / v.maxHp;

        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(-barWidth / 2, -v.radius - 6, barWidth, barHeight);
        this.ctx.fillStyle =
          hpPercent > 0.5
            ? "#00ff00"
            : hpPercent > 0.25
              ? "#ffff00"
              : "#ff0000";
        this.ctx.fillRect(
          -barWidth / 2,
          -v.radius - 6,
          barWidth * hpPercent,
          barHeight
        );
      }

      this.ctx.restore();
    });

    if (this.helper && this.helper.x !== 0) {
      const h = this.helper;
      const mode = this.getCurrentWeaponMode();

      this.ctx.fillStyle = h.color;
      this.ctx.beginPath();
      this.ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.save();
      this.ctx.translate(h.x, h.y);

      const now = performance.now();
      const lastFire = h.faceLookTime || 0;
      const timeSinceFire = now - lastFire;
      const lookDuration = 200;
      const returnDuration = 300;

      let lookIntensity = 0;
      if (timeSinceFire < lookDuration) {
        lookIntensity = 1;
      } else if (timeSinceFire < lookDuration + returnDuration) {
        lookIntensity = 1 - (timeSinceFire - lookDuration) / returnDuration;
      }

      const lookStrength = h.radius * 0.2 * lookIntensity;
      const fireAngle = h.faceLookAngle || 0;
      const lookX = Math.cos(fireAngle) * lookStrength;
      const lookY = Math.sin(fireAngle) * lookStrength;

      const faceOffsetX = lookX;
      const faceOffsetY = -h.radius * 0.25 + lookY * 0.5;
      const eyeRadius = h.radius * 0.12;
      const eyeY = faceOffsetY - h.radius * 0.1;
      const eyeSpacing = h.radius * 0.3;

      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(faceOffsetX - eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(faceOffsetX + eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      const mouthY = faceOffsetY + h.radius * 0.2;
      const mouthWidth = h.radius * 0.4;

      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(faceOffsetX - mouthWidth, mouthY);
      this.ctx.quadraticCurveTo(faceOffsetX - mouthWidth * 0.5, mouthY + h.radius * 0.15, faceOffsetX, mouthY);
      this.ctx.quadraticCurveTo(faceOffsetX + mouthWidth * 0.5, mouthY + h.radius * 0.15, faceOffsetX + mouthWidth, mouthY);
      this.ctx.stroke();

      this.ctx.restore();

      if (h.isReloading && mode.hasReload) {
        const reloadRadius = h.radius + 8;
        const progress = h.reloadProgress;

        this.ctx.beginPath();
        this.ctx.arc(
          h.x,
          h.y,
          reloadRadius,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * progress
        );
        this.ctx.strokeStyle = h.color;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = "round";
        this.ctx.stroke();
        this.ctx.lineCap = "butt";

        this.ctx.beginPath();
        this.ctx.arc(h.x, h.y, reloadRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        const glitchTime = Date.now();
        const glitchX = (Math.random() - 0.5) * 4;
        const glitchY = (Math.random() - 0.5) * 2;

        this.ctx.save();
        this.ctx.font = "bold 10px monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        if (glitchTime % 100 < 50) {
          this.ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
          this.ctx.fillText(
            "RELOAD!",
            h.x + glitchX - 1,
            h.y - h.radius - 15 + glitchY
          );
          this.ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
          this.ctx.fillText(
            "RELOAD!",
            h.x + glitchX + 1,
            h.y - h.radius - 15 + glitchY
          );
        }

        if (glitchTime % 200 < 150) {
          this.ctx.fillStyle = h.color;
          this.ctx.shadowColor = h.color;
          this.ctx.shadowBlur = 5;
          this.ctx.fillText(
            "RELOAD!",
            h.x + glitchX,
            h.y - h.radius - 15 + glitchY
          );
          this.ctx.shadowBlur = 0;
        }

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 8px monospace";
        this.ctx.fillText(
          `${Math.floor(progress * 100)}%`,
          h.x,
          h.y + h.radius + 12
        );

        this.ctx.restore();
      }

      if (mode.hasReload && !h.isReloading) {
        this.ctx.save();
        this.ctx.font = "bold 8px monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(
          `${h.currentAmmo}/${mode.magazineSize}`,
          h.x,
          h.y + h.radius + 12
        );
        this.ctx.restore();
      }
    }

    this.ctx.font = "bold 12px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.projectiles.forEach((p) => {
      const color = p.fromHelper ? "#ffff00" : "#00ff00";
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 5;
      this.ctx.fillText(p.char || "*", p.x, p.y);
    });
    this.ctx.shadowBlur = 0;

    this.enemies.forEach((e) => {
      this.ctx.fillStyle = "#ff3333";
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();

      const hpPct = Math.max(0, Math.min(1, e.hp / e.maxHp));
      this.ctx.fillStyle = "#550000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20, 4);
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20 * hpPct, 4);
    });

    const coreScale = this.core.scale || 1;
    const scaledRadius = this.core.radius * coreScale;

    const coreVisualX = this.core.x + (this.core.visualOffsetX || 0);
    const coreVisualY = this.core.y + (this.core.visualOffsetY || 0);

    this.ctx.save();
    this.ctx.translate(coreVisualX, coreVisualY);
    this.ctx.rotate(this.turret.angle);
    this.ctx.restore();

    this.ctx.beginPath();
    this.ctx.arc(coreVisualX, coreVisualY, scaledRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.core.color;
    this.ctx.fill();
    this.ctx.lineWidth = 3 * coreScale;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.stroke();

    if (this.showCoreHP !== false && !this.isOutroPlaying) {
      const safeMaxHp = this.core.maxHp || 1;
      const hpPercent = Math.round((this.core.hp / safeMaxHp) * 100);

      const offsetX = this.glitchText ? this.glitchOffset?.x || 0 : 0;
      const offsetY = this.glitchText ? this.glitchOffset?.y || 0 : 0;

      this.ctx.font = `bold ${14 * coreScale}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      if (this.glitchText) {
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        this.ctx.fillText(
          `${hpPercent}%`,
          coreVisualX + offsetX - 2,
          coreVisualY + scaledRadius + 20 + offsetY
        );
        this.ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        this.ctx.fillText(
          `${hpPercent}%`,
          coreVisualX + offsetX + 2,
          coreVisualY + scaledRadius + 20 + offsetY
        );
      }

      this.ctx.fillStyle = hpPercent > 30 ? "#00ff00" : "#ff3333";
      this.ctx.fillText(
        `${hpPercent}%`,
        coreVisualX + offsetX,
        coreVisualY + scaledRadius + 20 + offsetY
      );

      if (!this.core.shieldActive && this.core.shieldState === "OFF") {
        const dx = this.core.x - this.shieldAnchor.x;
        const dy = this.core.y - this.shieldAnchor.y;
        const dist = Math.hypot(dx, dy);
        const chargeRadius = Math.max(0, this.core.shieldRadius - this.core.radius);
        if (dist <= chargeRadius) {
          const progress = Math.min(1, this.shieldReadyTimer / this.shieldReadyDuration);
          const barW = 50 * coreScale;
          const barH = 6 * coreScale;
          const barX = coreVisualX - barW / 2;
          const barY = coreVisualY - scaledRadius - 14 * coreScale;
          this.ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
          this.ctx.fillRect(barX, barY, barW, barH);
          this.ctx.fillStyle = "#ffe800";
          this.ctx.fillRect(barX, barY, barW * progress, barH);
        }
      }
    }

    this.ctx.font = "bold 10px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.particles.forEach((p) => {
      const glitchX = p.char ? (Math.random() - 0.5) * 3 : 0;
      const glitchY = p.char ? (Math.random() - 0.5) * 3 : 0;

      if (p.char && Math.random() < 0.3 && p.life < p.maxLife * 0.5) {
        return;
      }

      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;

      if (p.char) {
        this.ctx.font = `bold ${p.size}px monospace`;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 3;

        if (p.life < p.maxLife * 0.4) {
          this.ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
          this.ctx.fillText(p.char, p.x + glitchX - 1, p.y + glitchY);
          this.ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
          this.ctx.fillText(p.char, p.x + glitchX + 1, p.y + glitchY);
        }

        this.ctx.fillStyle = p.color;
        this.ctx.fillText(p.char, p.x + glitchX, p.y + glitchY);
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1.0;
    });

    this.shockwaves.forEach((wave) => {
      const safeRadius = Math.max(0, wave.radius);
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, safeRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = wave.color;
      this.ctx.lineWidth = wave.lineWidth;
      this.ctx.globalAlpha = wave.alpha;
      this.ctx.stroke();

      if (safeRadius > 50) {
        this.ctx.beginPath();
        this.ctx.arc(wave.x, wave.y, safeRadius * 0.7, 0, Math.PI * 2);
        this.ctx.lineWidth = wave.lineWidth * 0.5;
        this.ctx.globalAlpha = wave.alpha * 0.5;
        this.ctx.stroke();
      }

      this.ctx.globalAlpha = 1.0;
    });

    this.slowFields.forEach((field) => {
      this.ctx.beginPath();
      this.ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = field.fillColor;
      this.ctx.globalAlpha = field.alpha * 0.25;
      this.ctx.fill();

      const dotCount = 6;
      for (let i = 0; i < dotCount; i++) {
        const ang = field.phase + (i * Math.PI * 2) / dotCount;
        const wobble = Math.sin(field.phase * 1.7 + i) * (field.radius * 0.04);
        const r = field.radius * 0.45 + wobble;
        const dx = Math.cos(ang) * r;
        const dy = Math.sin(ang) * r;
        this.ctx.beginPath();
        this.ctx.arc(field.x + dx, field.y + dy, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = field.strokeColor;
        this.ctx.globalAlpha = field.alpha * 0.5;
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1.0;
    });

    this.renderStaticEffects();

    this.renderDroppedItems();
    this.renderCollectorViruses();

    this.renderSpeechBubbles();

    this.ctx.restore();

    if (this.isBossFight && this.bossManager) {
      this.renderBossUI();
    }

    if (this.isMiniDisplay && this.miniCanvas) {
      const miniCtx = this.miniCanvas.getContext("2d");
      const miniW = this.miniCanvas.width || 400;
      const miniH = this.miniCanvas.height || 150;

      if (this.renderDebugFrameCount < 3) {
        debugLog("Canvas", "TODO");
        debugLog("Canvas", "TODO", miniW, "miniH =", miniH);
        debugLog("Canvas", "TODO", this.canvas.width, "canvas.height =", this.canvas.height);
        debugLog("Canvas", "3. isMobile =", this.isMobile);
      }

      const srcW = this.canvas.width;
      const srcH = this.canvas.height;
      const contentRatio = srcW / srcH;
      const miniRatio = miniW / miniH;

      let destX, destY, destW, destH;

      if (contentRatio > miniRatio) {
        destW = miniW;
        destH = miniW / contentRatio;
      } else {
        destH = miniH;
        destW = miniH * contentRatio;
      }

      destW = Math.round(destW);
      destH = Math.round(destH);
      destX = Math.round((miniW - destW) / 2);
      destY = Math.round((miniH - destH) / 2);

      miniCtx.clearRect(0, 0, miniW, miniH);
      miniCtx.drawImage(
        this.canvas,
        0, 0, srcW, srcH,
        destX, destY, destW, destH
      );

      if (this.isBossFight && this.bossManager) {
        const hpSpan = document.getElementById("conquest-core-hp");
        if (hpSpan) hpSpan.innerText = "TODO" + Math.ceil(this.bossManager.bossHP) + "%";
      }
    }
  }

  
  renderBossUI() {
    const status = this.bossManager.getStatus();
    const ctx = this.ctx;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    const isMobile = canvasWidth < 500;
    const barWidth = isMobile ? 16 : 24;
    const barHeight = Math.min(canvasHeight * 0.5, 300);
    const margin = isMobile ? 10 : 20;
    const barY = (canvasHeight - barHeight) / 2;

    const hpBarX = margin;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(hpBarX - 4, barY - 30, barWidth + 8, barHeight + 60);

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, barY, barWidth, barHeight);

    const hpRatio = status.bossHP / status.maxBossHP;
    const hpFillHeight = barHeight * hpRatio;
    const hpGradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY + barHeight - hpFillHeight);
    hpGradient.addColorStop(0, '#ff0000');
    hpGradient.addColorStop(1, '#ff6600');
    ctx.fillStyle = hpGradient;
    ctx.fillRect(hpBarX, barY + barHeight - hpFillHeight, barWidth, hpFillHeight);

    if (status.minBossHP > 0) {
      const minHPY = barY + barHeight - (status.minBossHP / status.maxBossHP) * barHeight;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hpBarX - 3, minHPY);
      ctx.lineTo(hpBarX + barWidth + 3, minHPY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.fillStyle = '#ff6600';
    ctx.font = `bold ${isMobile ? 10 : 12}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', hpBarX + barWidth / 2, barY - 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(status.bossHP)}%`, hpBarX + barWidth / 2, barY - 3);

    ctx.fillStyle = '#ffff00';
    ctx.font = `${isMobile ? 8 : 10}px monospace`;
    ctx.fillText(`P${status.currentPhase}`, hpBarX + barWidth / 2, barY + barHeight + 15);
    ctx.restore();

    const breachBarX = canvasWidth - margin - barWidth;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(breachBarX - 4, barY - 30, barWidth + 8, barHeight + 60);

    const breachColor = status.isBreachReady ? '#00ff00' : '#00aaff';
    ctx.strokeStyle = breachColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(breachBarX, barY, barWidth, barHeight);

    const breachRatio = status.breachGauge / status.maxBreachGauge;
    const breachFillHeight = barHeight * breachRatio;
    const breachGradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY + barHeight - breachFillHeight);
    breachGradient.addColorStop(0, '#004488');
    breachGradient.addColorStop(1, status.isBreachReady ? '#00ff00' : '#00aaff');
    ctx.fillStyle = breachGradient;
    ctx.fillRect(breachBarX, barY + barHeight - breachFillHeight, barWidth, breachFillHeight);

    ctx.save();
    ctx.textAlign = 'center';
    if (status.isBreachReady) {
      const blink = Math.floor(Date.now() / 300) % 2 === 0;
      ctx.fillStyle = blink ? '#00ff00' : '#ffffff';
      ctx.font = `bold ${isMobile ? 10 : 12}px monospace`;
      ctx.fillText('READY', breachBarX + barWidth / 2, barY - 15);
      ctx.fillText('!!!', breachBarX + barWidth / 2, barY - 3);
    } else {
      ctx.fillStyle = '#00aaff';
      ctx.font = `bold ${isMobile ? 10 : 12}px monospace`;
      ctx.fillText('BREACH', breachBarX + barWidth / 2, barY - 15);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${Math.ceil(status.breachPercent)}%`, breachBarX + barWidth / 2, barY - 3);
    }

    if (!status.isBreachReady) {
      ctx.fillStyle = '#00aaff';
      ctx.font = `${isMobile ? 8 : 10}px monospace`;
      ctx.fillText(`${status.breachTimeRemaining}s`, breachBarX + barWidth / 2, barY + barHeight + 15);
    }
    ctx.restore();
  }

  
  renderStaticEffects() {
    const ss = this.staticSystem;
    const se = this.staticEffects;
    const chargeRatio = ss.currentCharge / ss.maxCharge;


    const pct = Math.max(0, Math.min(100, Math.round(chargeRatio * 100)));
    const textY = this.core.y - this.core.radius - 18;
    const barW = 56;
    const barH = 4;
    const barX = this.core.x - barW / 2;
    const barY = textY + 4;
    this.ctx.save();
    this.ctx.font = "bold 10px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "bottom";
    this.ctx.shadowColor = "#ffff00";
    this.ctx.shadowBlur = 6;
    this.ctx.fillStyle = "#ffff00";
    this.ctx.fillText(`${pct}%`, this.core.x, textY);
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = "rgba(80, 80, 0, 0.5)";
    this.ctx.fillRect(barX, barY, barW, barH);
    this.ctx.fillStyle = "#ffff00";
    this.ctx.fillRect(barX, barY, barW * (pct / 100), barH);
    this.ctx.restore();

    se.sparks.forEach((spark) => {
      this.ctx.save();
      this.ctx.globalAlpha = spark.alpha;
      this.ctx.fillStyle = "#ffff00";
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 5;
      this.ctx.beginPath();
      this.ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    se.chains.forEach((chain) => {
      this.ctx.save();
      this.ctx.globalAlpha = chain.alpha;
      this.ctx.strokeStyle = chain.color;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 15;

      this.ctx.beginPath();
      this.ctx.moveTo(chain.x1, chain.y1);

      const segments = 5;
      const dx = (chain.x2 - chain.x1) / segments;
      const dy = (chain.y2 - chain.y1) / segments;

      for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * 20;
        const jitterY = (Math.random() - 0.5) * 20;
        this.ctx.lineTo(
          chain.x1 + dx * i + jitterX,
          chain.y1 + dy * i + jitterY
        );
      }

      this.ctx.lineTo(chain.x2, chain.y2);
      this.ctx.stroke();
      this.ctx.restore();
    });

  }

  
  applyWaveEffect(effectType) {
    debugLog("Defense", "? ?:", effectType);

    const knockbackDist = 50;
    const slowDuration = 2000;
    const damage = 10;

    let waveColor = "#0f0";
    if (effectType === "knockback_damage") waveColor = "#ff0";
    if (effectType === "knockback_damage_x3") waveColor = "#f00";

    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 30,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
      speed: 500,
      alpha: 0.9,
      color: waveColor,
      lineWidth: 8,
      damageDealt: false,
    });

    this.enemies.forEach((enemy) => {
      if (effectType === "knockback_slow") {
        this.applyKnockback(enemy, 300, 0.3, 2);
      } else if (effectType === "knockback_damage") {
        this.applyKnockback(enemy, 300);
        enemy.hp -= damage;
      } else if (effectType === "knockback_damage_x3") {
        this.applyKnockback(enemy, 350);
        enemy.hp -= damage * 3;

        this.createExplosion(enemy.x, enemy.y, "#ff4400", 10);
      }
    });

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) {
        this.createExplosion(
          this.enemies[i].x,
          this.enemies[i].y,
          "#ff0000",
          15
        );
        this.enemies.splice(i, 1);
      }
    }
  }

  spawnEnemy() {
    if (this.isSafeZone || this.isConquered) {
      debugLog("Enemy", "spawnEnemy blocked - isSafeZone:", this.isSafeZone, "isConquered:", this.isConquered);
      return;
    }
    debugLog("Enemy", "spawnEnemy called - isSafeZone:", this.isSafeZone);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;

    const ex = this.core.x + Math.cos(angle) * distance;
    const ey = this.core.y + Math.sin(angle) * distance;

    let difficultyScale;

    const baseSpeed = 60 + Math.random() * 40;
    const baseHp = 10;

    if (this.isReinforcementMode) {
      const stageBase = this.calculateStageBaseDifficulty();
      const reinforcementBonus = 0.5 + (this.reinforcementPage - 1) * 0.3;
      difficultyScale = stageBase + reinforcementBonus;
    } else {
      const stageBase = this.calculateStageBaseDifficulty();
      const pageProgress = (this.currentPage - 1) / (this.stageMaxPages - 1);
      const pageMultiplier =
        pageProgress * (this.stageDifficultyScale * stageBase * 0.5);
      difficultyScale = stageBase + pageMultiplier;
    }

    const maxHp = Math.max(1, Math.floor(baseHp * difficultyScale));
    this.enemies.push({
      x: ex,
      y: ey,
      radius: 10,
      speed: baseSpeed * difficultyScale,
      hp: maxHp,
      maxHp,
      damage: 10,
    });
  }

  spawnSafeZoneAllies() {
    debugLog("Enemy", "spawnSafeZoneAllies called - isSafeZone:", this.isSafeZone);
    if (!this.isSafeZone) {
      debugLog("Enemy", "spawnSafeZoneAllies aborted - not Safe Zone");
      return;
    }

    this.alliedViruses = [];

    const virusTypes = {
      SWARM: { color: "#88ff88", baseHp: 8, baseDamage: 5, baseSpeed: 180, radius: 6, attackType: "melee" },
      TANK: { color: "#ff8800", baseHp: 60, baseDamage: 8, baseSpeed: 80, radius: 12, attackType: "melee", tauntRadius: 150, aggroRadius: 180 },
      HUNTER: { color: "#aa00ff", baseHp: 20, baseDamage: 15, baseSpeed: 110, radius: 8, attackType: "ranged", range: 150, fireRate: 1.5, projectileSpeed: 200 },
      BOMBER: { color: "#ff4444", baseHp: 15, baseDamage: 0, baseSpeed: 150, radius: 9, attackType: "suicide", explosionDamage: 40, explosionRadius: 60 },
      HEALER: { color: "#00ff88", baseHp: 40, baseDamage: 0, baseSpeed: 90, radius: 8, attackType: "support", healAmount: 5, healRadius: 80 }
    };

    const config = this.alliedConfig;
    let spawnEntries = null;
    if (config && config.mainTypeData) {
      spawnEntries = [];
      for (let i = 0; i < config.mainCount; i++) {
        spawnEntries.push({ type: config.mainType, data: config.mainTypeData });
      }
      for (let i = 0; i < config.subCount; i++) {
        if (config.subTypeData) {
          spawnEntries.push({ type: config.subType, data: config.subTypeData });
        }
      }
      if (spawnEntries.length === 0) {
        spawnEntries = null;
      }
    }

    const types = ["SWARM", "SWARM", "SWARM", "TANK", "HUNTER", "HUNTER", "BOMBER", "HEALER", "SWARM", "HUNTER", "SWARM", "BOMBER"];
    const count = spawnEntries ? spawnEntries.length : 12 + Math.floor(Math.random() * 7);

    for (let i = 0; i < count; i++) {
      const entry = spawnEntries ? spawnEntries[i] : null;
      const type = entry ? entry.type : types[i % types.length];
      const typeData = entry ? entry.data : virusTypes[type];

      if (!typeData) continue;

      const margin = 40;
      const screenW = this.canvas.width;
      const screenH = this.canvas.height;
      const coreX = this.core.x;
      const coreY = this.core.y;

      const zone = i % 4;
      let spawnX, spawnY;

      switch (zone) {
        case 0:
          spawnX = margin + Math.random() * (screenW * 0.35 - margin);
          spawnY = margin + Math.random() * (screenH * 0.35 - margin);
          break;
        case 1:
          spawnX = screenW * 0.65 + Math.random() * (screenW * 0.35 - margin);
          spawnY = margin + Math.random() * (screenH * 0.35 - margin);
          break;
        case 2:
          spawnX = margin + Math.random() * (screenW * 0.35 - margin);
          spawnY = screenH * 0.65 + Math.random() * (screenH * 0.35 - margin);
          break;
        case 3:
          spawnX = screenW * 0.65 + Math.random() * (screenW * 0.35 - margin);
          spawnY = screenH * 0.65 + Math.random() * (screenH * 0.35 - margin);
          break;
      }

      const distFromCore = Math.hypot(spawnX - coreX, spawnY - coreY);
      if (distFromCore < 150) {
        const pushAngle = Math.atan2(spawnY - coreY, spawnX - coreX);
        spawnX = coreX + Math.cos(pushAngle) * 180;
        spawnY = coreY + Math.sin(pushAngle) * 180;
      }

      const useConfigBonuses = !!spawnEntries;
      const pureBonus = useConfigBonuses && config?.isPureSpecialization ? config.pureBonus : 1.0;
      const hpValue = useConfigBonuses
        ? Math.floor(typeData.baseHp * config.hpMultiplier * pureBonus)
        : (typeData.baseHp || 20);
      const damageValue = useConfigBonuses
        ? Math.floor(typeData.baseDamage * config.damageMultiplier * pureBonus)
        : (typeData.baseDamage || 10);
      const speedValue = useConfigBonuses
        ? Math.floor(typeData.baseSpeed * config.speedMultiplier * 2)
        : (typeData.baseSpeed || 100) * 2;

      const ally = {
        x: spawnX,
        y: spawnY,
        radius: typeData.radius || 8,
        speed: speedValue,
        hp: hpValue,
        maxHp: hpValue,
        baseMaxHp: hpValue,
        damage: damageValue,
        virusType: type,
        color: typeData.color || "#88ff88",
        attackType: typeData.attackType || "melee",
        homeX: spawnX,
        homeY: spawnY,
        homeRadius: 80 + Math.random() * 60,
        vx: 0,
        vy: 0,
        wobblePhase: Math.random() * Math.PI * 2,
        wanderTargetX: null,
        wanderTargetY: null,
        wanderTimer: 0,
        wanderDuration: 2 + Math.random() * 4,
        isIdle: Math.random() < 0.2,
        ...(type === "TANK" && {
          tauntCooldown: 0,
          tauntRadius: typeData.tauntRadius || 150,
          aggroRadius: typeData.aggroRadius || 180
        }),
        ...(type === "HUNTER" && {
          fireRate: typeData.fireRate || 1.5,
          fireCooldown: 0,
          range: typeData.range || 150,
          projectileSpeed: typeData.projectileSpeed || 200
        }),
        ...(type === "BOMBER" && {
          explosionDamage: typeData.explosionDamage || 40,
          explosionRadius: typeData.explosionRadius || 60
        }),
        ...(type === "HEALER" && {
          healAmount: typeData.healAmount || 5,
          healRadius: typeData.healRadius || 80
        }),
        ...(type === "SWARM" && {
          explosionDamage: 3,
          explosionRadius: 20
        })
      };

      this.alliedViruses.push(ally);
    }

    debugLog("SafeZone", `Spawned ${this.alliedViruses.length} allied viruses`);
  }

  calculateStageBaseDifficulty() {

    let baseDifficulty;
    if (this.currentStageId === 0) {
      baseDifficulty = 0.5;
    } else if (this.currentStageId <= 2) {
      baseDifficulty = 1.0;
    } else if (this.currentStageId <= 4) {
      baseDifficulty = 1.5;
    } else {
      baseDifficulty = 2.0;
    }

    return baseDifficulty;
  }

  updateHelper(dt, now) {
    const helper = this.helper;
    const shieldRadius = this.core.shieldRadius - 15;
    const minDistFromCore = 45;

    if (helper.x === 0 && helper.y === 0) {
      helper.x = this.core.x + 50;
      helper.y = this.core.y;
      helper.targetX = helper.x;
      helper.targetY = helper.y;
    }

    let nearestEnemy = null;
    let minDist = Infinity;
    let enemyInsideShield = null;
    this.enemies.forEach((enemy) => {
      const distToCore = Math.hypot(
        enemy.x - this.core.x,
        enemy.y - this.core.y
      );
      const distToHelper = Math.hypot(enemy.x - helper.x, enemy.y - helper.y);

      if (distToCore < this.core.shieldRadius) {
        if (
          !enemyInsideShield ||
          distToHelper <
          Math.hypot(
            enemyInsideShield.x - helper.x,
            enemyInsideShield.y - helper.y
          )
        ) {
          enemyInsideShield = enemy;
        }
      }

      if (distToHelper < helper.range && distToHelper < minDist) {
        minDist = distToHelper;
        nearestEnemy = enemy;
      }
    });

    if (enemyInsideShield) {
      const dx = helper.x - enemyInsideShield.x;
      const dy = helper.y - enemyInsideShield.y;
      const dist = Math.hypot(dx, dy);

      if (dist < helper.evadeDistance && dist > 0) {
        const evadeX = helper.x + (dx / dist) * 40;
        const evadeY = helper.y + (dy / dist) * 40;

        const evadeDistToCore = Math.hypot(
          evadeX - this.core.x,
          evadeY - this.core.y
        );
        if (
          evadeDistToCore < shieldRadius &&
          evadeDistToCore > minDistFromCore
        ) {
          helper.targetX = evadeX;
          helper.targetY = evadeY;
        } else if (evadeDistToCore <= minDistFromCore) {
          const angle = Math.atan2(evadeY - this.core.y, evadeX - this.core.x);
          helper.targetX =
            this.core.x + Math.cos(angle) * (minDistFromCore + 10);
          helper.targetY =
            this.core.y + Math.sin(angle) * (minDistFromCore + 10);
        } else {
          const angle = Math.atan2(
            helper.y - this.core.y,
            helper.x - this.core.x
          );
          helper.targetX = this.core.x + Math.cos(angle) * (shieldRadius - 10);
          helper.targetY = this.core.y + Math.sin(angle) * (shieldRadius - 10);
        }
      }
    } else if (nearestEnemy) {
      const angleToEnemy = Math.atan2(
        nearestEnemy.y - this.core.y,
        nearestEnemy.x - this.core.x
      );
      const targetDist = Math.min(shieldRadius - 5, minDistFromCore + 15);
      helper.targetX = this.core.x + Math.cos(angleToEnemy) * targetDist;
      helper.targetY = this.core.y + Math.sin(angleToEnemy) * targetDist;
    } else {
      if (!helper.patrolAngle) helper.patrolAngle = 0;
      helper.patrolAngle += dt * 0.3;
      const patrolDist = minDistFromCore + 10;
      helper.targetX = this.core.x + Math.cos(helper.patrolAngle) * patrolDist;
      helper.targetY = this.core.y + Math.sin(helper.patrolAngle) * patrolDist;
    }

    const lerpSpeed = enemyInsideShield ? 3.5 : 1.5;
    helper.x += (helper.targetX - helper.x) * dt * lerpSpeed;
    helper.y += (helper.targetY - helper.y) * dt * lerpSpeed;

    const distToCore = Math.hypot(
      helper.x - this.core.x,
      helper.y - this.core.y
    );
    const angle = Math.atan2(helper.y - this.core.y, helper.x - this.core.x);

    if (distToCore > shieldRadius) {
      const clampedX = this.core.x + Math.cos(angle) * shieldRadius;
      const clampedY = this.core.y + Math.sin(angle) * shieldRadius;
      helper.x += (clampedX - helper.x) * dt * 5;
      helper.y += (clampedY - helper.y) * dt * 5;
    }

    if (distToCore < minDistFromCore) {
      const pushX = this.core.x + Math.cos(angle) * minDistFromCore;
      const pushY = this.core.y + Math.sin(angle) * minDistFromCore;
      helper.x += (pushX - helper.x) * dt * 5;
      helper.y += (pushY - helper.y) * dt * 5;
    }

    if (nearestEnemy) {
      helper.angle = Math.atan2(
        nearestEnemy.y - helper.y,
        nearestEnemy.x - helper.x
      );

      const fireInterval = 1 / helper.fireRate;
      const timeSinceLastFire = now - helper.lastFireTime;

      if (timeSinceLastFire >= fireInterval) {
        debugLog(
          "Helper",
          "!",
          "TODO",
          nearestEnemy.x.toFixed(0),
          nearestEnemy.y.toFixed(0)
        );
        this.fireHelperProjectile(nearestEnemy);
        helper.lastFireTime = now;
      }
    } else if (this.enemies.length > 0) {
      if (!this._helperNoTargetLogged) {
        const firstEnemy = this.enemies[0];
        const dist = Math.hypot(
          firstEnemy.x - helper.x,
          firstEnemy.y - helper.y
        );
        debugLog(
          "Helper",
          "TODO",
          ":",
          dist.toFixed(0),
          "TODO",
          helper.range
        );
        this._helperNoTargetLogged = true;
        setTimeout(() => {
          this._helperNoTargetLogged = false;
        }, 3000);
      }
    }
  }

  setWeaponMode(modeName) {
    const mode = this.weaponModes[modeName];
    if (!mode) {
      debugLog("Defense", "Unknown weapon mode:", modeName);
      return;
    }

    this.helper.weaponMode = modeName;
    this.helper.color = mode.color;

    this.helper.damage = mode.baseDamage;
    this.helper.fireRate = mode.baseFireRate;
    this.helper.range = mode.baseRange;
    this.helper.projectileSpeed = mode.baseProjectileSpeed;

    const magazineBonus = this.helper.magazineBonus || 0;
    this.helper.currentAmmo = mode.magazineSize + magazineBonus;
    this.helper.isReloading = false;
    this.helper.reloadProgress = 0;

    debugLog(
      "Defense",
      "Weapon mode changed to:",
      modeName,
      "Ammo:",
      this.helper.currentAmmo
    );
  }

  getCurrentWeaponMode() {
    return this.weaponModes[this.helper.weaponMode] || this.weaponModes.NORMAL;
  }

  applyUpgradeBonus(
    bonusDamage,
    bonusFireRate,
    bonusRange,
    bonusBulletSpeed,
    bonusMagazine = 0
  ) {
    const mode = this.getCurrentWeaponMode();

    this.helper.damage = mode.baseDamage + bonusDamage;
    this.helper.fireRate = mode.baseFireRate + bonusFireRate;
    this.helper.range = mode.baseRange + bonusRange;
    this.helper.projectileSpeed = mode.baseProjectileSpeed + bonusBulletSpeed;
    this.helper.magazineBonus = bonusMagazine;
    debugLog("Defense", "Upgrade bonus applied:", {
      damage: this.helper.damage,
      fireRate: this.helper.fireRate,
      range: this.helper.range,
      projectileSpeed: this.helper.projectileSpeed,
      magazineBonus: bonusMagazine,
    });
  }

  fireHelperProjectile(target) {
    const mode = this.getCurrentWeaponMode();
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    if (mode.hasReload) {
      if (this.helper.isReloading) {
        return;
      }
      if (this.helper.currentAmmo <= 0) {
        this.startReload();
        return;
      }
      this.helper.currentAmmo--;
    }

    const dx = target.x - this.helper.x;
    const dy = target.y - this.helper.y;
    const dist = Math.hypot(dx, dy);
    const baseAngle = Math.atan2(dy, dx);

    this.helper.faceLookAngle = baseAngle;
    this.helper.faceLookTime = performance.now();
    debugLog("Helper", "angle:", baseAngle.toFixed(2), "time:", this.helper.faceLookTime);

    const speed = this.helper.projectileSpeed || 400;
    const projectileCount = mode.projectileCount || 1;
    const spreadAngle = mode.spreadAngle || 0;

    for (let i = 0; i < projectileCount; i++) {
      let angle = baseAngle;

      if (projectileCount > 1) {
        const spreadOffset =
          (i - (projectileCount - 1) / 2) *
          (spreadAngle / (projectileCount - 1));
        angle = baseAngle + spreadOffset;
      }
      else if (spreadAngle > 0) {
        angle += (Math.random() - 0.5) * spreadAngle;
      }

      const randomChar =
        asciiChars[Math.floor(Math.random() * asciiChars.length)];

      this.projectiles.push({
        x: this.helper.x,
        y: this.helper.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: this.helper.damage,
        life: 2,
        radius: 8,
        char: randomChar,
        color: mode.color,
        fromHelper: true,
        explosive: mode.explosive || false,
        explosionRadius: mode.explosionRadius || 0,
        piercing: mode.piercing || false,
      });
    }

    if (mode.hasReload && this.helper.currentAmmo <= 0) {
      this.startReload();
    }
  }

  startReload() {
    const mode = this.getCurrentWeaponMode();
    if (!mode.hasReload || this.helper.isReloading) return;

    this.helper.isReloading = true;
    this.helper.reloadProgress = 0;
    this.helper.reloadStartTime = performance.now();

    debugLog("Defense", "Reload started:", mode.name);
  }

  updateReload(dt) {
    if (!this.helper.isReloading) return;

    const mode = this.getCurrentWeaponMode();
    if (!mode.hasReload) {
      this.helper.isReloading = false;
      return;
    }

    const reloadSpeedMultiplier = 1 + this.helper.fireRate * 0.1;
    const calculatedReloadTime = mode.reloadTime / reloadSpeedMultiplier;

    const minReloadTime =
      mode.name === "SNIPER" || mode.name === "LAUNCHER" ? 1.2 : 1.0;
    const actualReloadTime = Math.max(minReloadTime, calculatedReloadTime);

    const elapsed = (performance.now() - this.helper.reloadStartTime) / 1000;
    this.helper.reloadProgress = Math.min(elapsed / actualReloadTime, 1);

    if (this.helper.reloadProgress >= 1) {
      const magazineBonus = this.helper.magazineBonus || 0;
      this.helper.currentAmmo = mode.magazineSize + magazineBonus;
      this.helper.isReloading = false;
      this.helper.reloadProgress = 0;
      debugLog(
        "Defense",
        "Reload complete:",
        mode.name,
        "Ammo:",
        this.helper.currentAmmo
      );
    }
  }

  handleExplosion(x, y, radius, damage, color) {
    this.createExplosion(x, y, color || "#ff4400", 25);

    this.shockwaves.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: radius * 1.5,
      speed: 400,
      alpha: 0.9,
      color: color || "#ff4400",
      lineWidth: 5,
      damageDealt: false,
    });

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Math.hypot(enemy.x - x, enemy.y - y);

      if (dist <= radius) {
        const damageMultiplier = 1 - (dist / radius) * 0.5;
        const actualDamage = Math.floor(damage * damageMultiplier);

        enemy.hp -= actualDamage;

        this.applyKnockback(enemy, 150, 0.5, 1);

        this.createExplosion(enemy.x, enemy.y, "#ff8800", 3);

        if (enemy.hp <= 0) {
          this.enemies.splice(i, 1);
          this.createExplosion(enemy.x, enemy.y, "#ff0000", 15);

          const gain = 10;
          this.currentData += gain;
          this.updateResourceDisplay(this.currentData);
          if (this.onResourceGained) this.onResourceGained(gain);
        }
      }
    }

    debugLog(
      "Defense",
      "Explosion at",
      x.toFixed(0),
      y.toFixed(0),
      "radius:",
      radius,
      "damage:",
      damage
    );
  }

  fireProjectile(target) {
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar =
      asciiChars[Math.floor(Math.random() * asciiChars.length)];

    const recoilDist = 8;
    this.core.targetOffsetX = Math.cos(this.turret.angle) * recoilDist;
    this.core.targetOffsetY = Math.sin(this.turret.angle) * recoilDist;

    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: target,
      angle: this.turret.angle,
      speed: 400,
      damage: this.turret.damage,
      radius: 4,
      life: 2.0,
      char: randomChar,
    });

    this.createExplosion(
      this.core.x + Math.cos(this.turret.angle) * 40,
      this.core.y + Math.sin(this.turret.angle) * 40,
      "#fff",
      3
    );
  }

  fireProjectileToward(angle) {
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar =
      asciiChars[Math.floor(Math.random() * asciiChars.length)];

    const recoilDist = 8;
    this.core.targetOffsetX = Math.cos(angle) * recoilDist;
    this.core.targetOffsetY = Math.sin(angle) * recoilDist;

    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: null,
      angle: angle,
      speed: 400,
      damage: this.turret.damage,
      radius: 4,
      life: 2.0,
      char: randomChar,
    });

    this.createExplosion(
      this.core.x + Math.cos(angle) * 40,
      this.core.y + Math.sin(angle) * 40,
      "#00ff00",
      3
    );
  }

  handleCanvasClick(e) {
    if (this.isPaused) return;

    if (e.target === this.shieldBtn) return;

    if (this.autoFireMouseActive && performance.now() - this.autoFireStartTime < 200) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldPos = this.screenToWorld(clickX, clickY);
    const scaledClickX = worldPos.x;
    const scaledClickY = worldPos.y;

    if (this.isSafeZone && this.miningManager) {
      const result = this.miningManager.handleCabinetTap(scaledClickX, scaledClickY);
      if (result.collected) {
        this.currentData += result.amount;
        this.updateResourceDisplay(this.currentData);
        if (this.onResourceGained) this.onResourceGained(result.amount);
        this.createExplosion(
          this.miningManager.cabinet.x + this.miningManager.cabinet.width / 2,
          this.miningManager.cabinet.y,
          "#00ff88", 8
        );
        return;
      }
    }

    this.fireAtPosition(scaledClickX, scaledClickY);
  }

  handleCanvasTouch(e) {
    if (this.isPaused) return;

    e.preventDefault();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      if (
        touchX >= 0 &&
        touchX <= rect.width &&
        touchY >= 0 &&
        touchY <= rect.height
      ) {
        const worldPos = this.screenToWorld(touchX, touchY);
        const scaledTouchX = worldPos.x;
        const scaledTouchY = worldPos.y;

        if (this.isSafeZone && this.miningManager) {
          const result = this.miningManager.handleCabinetTap(scaledTouchX, scaledTouchY);
          if (result.collected) {
            this.currentData += result.amount;
            this.updateResourceDisplay(this.currentData);
            if (this.onResourceGained) this.onResourceGained(result.amount);
            this.createExplosion(
              this.miningManager.cabinet.x + this.miningManager.cabinet.width / 2,
              this.miningManager.cabinet.y,
              "#00ff88", 8
            );
            continue;
          }
        }

        if (touchX >= rect.width * this.rightFireZoneRatio) {
          if (!this.autoFireActive) {
            this.autoFireActive = true;
            this.autoFireTouchId = touch.identifier;
            this.autoFireTimer = this.getAutoFireInterval();
            this.fireAtPosition(0, 0);
          }
          continue;
        }

        this.fireAtPosition(scaledTouchX, scaledTouchY);
      }
    }
  }

  handleCanvasTouchEnd(e) {
    if (!this.autoFireActive) return;
    if (this.autoFireTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.autoFireTouchId) {
        this.autoFireTouchId = null;
        if (!this.autoFireMouseActive && !this.autoFireKeyActive) {
          this.autoFireActive = false;
          this.autoFireTimer = 0;
        }
        break;
      }
    }
  }

  handleCanvasMouseDown(e) {
    if (this.isPaused) return;
    if (e.button !== 0) return;
    if (e.target === this.shieldBtn) return;
    if (this.isSafeZone && this.miningManager) {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const worldPos = this.screenToWorld(clickX, clickY);
      const result = this.miningManager.handleCabinetTap(worldPos.x, worldPos.y);
      if (result.collected) {
        this.currentData += result.amount;
        this.updateResourceDisplay(this.currentData);
        if (this.onResourceGained) this.onResourceGained(result.amount);
        this.createExplosion(
          this.miningManager.cabinet.x + this.miningManager.cabinet.width / 2,
          this.miningManager.cabinet.y,
          "#00ff88", 8
        );
        return;
      }
    }
    this.autoFireMouseActive = true;
    this.autoFireActive = true;
    this.autoFireStartTime = performance.now();
    this.autoFireTimer = this.getAutoFireInterval();
    this.fireAtPosition(0, 0);
  }


  handleCanvasMouseUp(e) {
    if (e.button !== 0) return;
    this.autoFireMouseActive = false;
    if (!this.autoFireTouchId && !this.autoFireKeyActive) {
      this.autoFireActive = false;
      this.autoFireTimer = 0;
    }
  }

  isTetrisActive() {
    return !!(
      window.gameManager &&
      window.gameManager.tetrisGame &&
      window.gameManager.tetrisGame.state &&
      window.gameManager.tetrisGame.state.isPlaying
    );
  }

  handleKeyDown(e) {
    if (this.isPaused) return;
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
      return;
    }
    if (this.isTetrisActive()) {
      return;
    }

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this.keyState.up = true;
        e.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        this.keyState.down = true;
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "KeyA":
        this.keyState.left = true;
        e.preventDefault();
        break;
      case "ArrowRight":
      case "KeyD":
        this.keyState.right = true;
        e.preventDefault();
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.keyState.shift = true;
        break;
      case "Space":
        e.preventDefault();
        if (this.autoFireKeyActive) return;
        this.autoFireKeyActive = true;
        this.autoFireActive = true;
        this.autoFireStartTime = performance.now();
        this.autoFireTimer = this.getAutoFireInterval();
        this.fireAtPosition(0, 0);
        break;
      default:
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this.keyState.up = false;
        break;
      case "ArrowDown":
      case "KeyS":
        this.keyState.down = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.keyState.left = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this.keyState.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.keyState.shift = false;
        break;
      case "Space":
        this.autoFireKeyActive = false;
        if (!this.autoFireMouseActive && !this.autoFireTouchId) {
          this.autoFireActive = false;
          this.autoFireTimer = 0;
        }
        break;
      default:
        break;
    }
  }

  screenToWorld(screenX, screenY) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const worldX = (screenX - centerX) / this.gameScale + this.camera.x;
    const worldY = (screenY - centerY) / this.gameScale + this.camera.y;
    return { x: worldX, y: worldY };
  }

  fireAtPosition(x, y) {
    if (this.enemies.length > 0) {
      let closestEnemy = null;
      let closestDist = Infinity;

      for (const enemy of this.enemies) {
        const dx = enemy.x - this.core.x;
        const dy = enemy.y - this.core.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy) {
        const angle = Math.atan2(
          closestEnemy.y - this.core.y,
          closestEnemy.x - this.core.x
        );
        this.turret.angle = angle;
        this.fireProjectileToward(angle);
      }
    } else {
      this.fireProjectileToward(this.turret.angle);
    }
  }

  getAutoFireInterval() {
    const effects = this.getItemEffects ? this.getItemEffects() : null;
    const bonus = effects && Number.isFinite(effects.attackSpeed) ? effects.attackSpeed : 0;
    const baseRate = Number.isFinite(this.turret.fireRate) ? this.turret.fireRate : 4;
    const rate = Math.max(0.5, baseRate * (1 + bonus));
    return 1 / rate;
  }

  updateAutoFire(dt) {
    if (!this.autoFireActive || this.isPaused) return;
    const interval = this.getAutoFireInterval();
    this.autoFireTimer += dt;
    if (this.autoFireTimer >= interval) {
      this.autoFireTimer = 0;
      this.fireAtPosition(0, 0);
    }
  }

  createExplosion(x, y, color, count = 10) {
    const actualCount = Math.ceil(count * this.particleMultiplier);

    if (this.particles.length >= this.maxParticles) {
      this.particles.splice(0, actualCount);
    }

    const glitchChars = "TODO";

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120;
      const life = 0.2 + Math.random() * 0.4;

      let particleColor = color;
      const colorRoll = Math.random();
      if (colorRoll < 0.15) {
        particleColor = "#ff0000";
      } else if (colorRoll < 0.25) {
        particleColor = "#ffffff";
      }

      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        alpha: 1,
        color: particleColor,
        size: 10 + Math.random() * 4,
        char: glitchChars[Math.floor(Math.random() * glitchChars.length)],
        glitchOffset: { x: 0, y: 0 },
        flickerTimer: Math.random() * 0.1,
      });
    }
  }

  createTauntEffect(x, y, radius, color) {
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: radius,
      speed: 300,
      alpha: 0.8,
      color: color,
      lineWidth: 3,
      isTaunt: true,
    });

    setTimeout(() => {
      if (!this.isRunning) return;
      this.shockwaves.push({
        x: x,
        y: y,
        radius: 10,
        maxRadius: radius * 0.7,
        speed: 250,
        alpha: 0.5,
        color: "#ffffff",
        lineWidth: 2,
        isTaunt: true,
      });
    }, 100);

    if (!this.isMobile) {
      const particleCount = 6;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        this.particles.push({
          x: x + Math.cos(angle) * 20,
          y: y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80,
          life: 0.4,
          maxLife: 0.4,
          alpha: 0.8,
          color: color,
          size: 4,
          char: "TODO",
        });
      }
    }
  }

  animate(time) {
    if (!this.isRunning) return;
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.update(deltaTime);
    this.render();
    requestAnimationFrame((t) => this.animate(t));
  }

  
  playIntroAnimation() {
    return new Promise((resolve) => {
      const centerX = this.coreHome.x || this.canvas.width / 2;
      const centerY = this.coreHome.y || this.canvas.height / 2;

      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.isIntroDrop = true;
      this.emergencyReturnCharges = this.emergencyReturnMax;
      this.shieldBtnMode = "SHIELD";

      debugLog("Defense", "playIntroAnimation - isSafeZone:", this.isSafeZone, "alliedViruses before:", this.alliedViruses.length);

      if (!this.isSafeZone) {
        debugLog("Defense", "playIntroAnimation - CLEARING alliedViruses (not Safe Zone)");
        this.alliedViruses = [];
      } else {
        debugLog("Defense", "playIntroAnimation - KEEPING alliedViruses (Safe Zone)");
      }

      debugLog("Defense", "playIntroAnimation - alliedViruses after:", this.alliedViruses.length);

      this.droppedItems = [];
      this.collectorViruses = [];
      this.core.shieldRadius = 0;
      this.core.x = centerX;
      this.core.y = centerY;

      this.showCoreHP = false;

      const isMobile = window.innerWidth <= 768;
      const startScale = isMobile ? 20.0 : 50.0;
      const duration = isMobile ? 250 : 300;
      const startTime = performance.now();

      this.core.scale = startScale;

      debugLog(
        "Defense",
        `IntroAnimation Starting with scale: ${startScale} (mobile: ${isMobile})`
      );

      const animateDrop = (now) => {
        try {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const easeInQuint = (t) => t * t * t * t * t;

          this.core.scale =
            startScale - (startScale - 1) * easeInQuint(progress);

          if (progress < 1) {
            requestAnimationFrame(animateDrop);
          } else {
            this.core.scale = 1;

            this.impactEffect({
              radius: Math.max(this.core.shieldRadius, this.baseShieldRadius) * 3,
              damage: 0,
              knockbackSpeed: 0,
              slowMult: 1.0,
              slowDuration: 0
            });

            this.glitchShowHP()
              .then(() => {
                if (this.isSafeZone) {
                  debugLog("Defense", "playIntroAnimation - SKIPPING spawnAlliesSequentially (Safe Zone)");
                  return Promise.resolve();
                }
                return this.spawnAlliesSequentially();
              })
              .then(() => this.expandShield())
              .then(() => {
                this.isIntroDrop = false;
                resolve();
              })
              .catch((err) => {
                console.error("IntroAnimation error:", err);
                this.isIntroDrop = false;
                resolve();
              });
          }
        } catch (err) {
          console.error("animateDrop error:", err);
          this.core.scale = 1;
          this.isIntroDrop = false;
          resolve();
        }
      };

      requestAnimationFrame(animateDrop);
    });
  }

  
  playOutroAnimation() {
    return new Promise((resolve) => {
      debugLog("Defense", "TODO");

      const isMobile = window.innerWidth <= 768;
      const duration = isMobile ? 400 : 500;
      const startTime = performance.now();
      const startScale = 1;
      const endScale = isMobile ? 30.0 : 50.0;

      this.enemySpawnTimer = 99999;
      this.isOutroPlaying = true;

      const overlay = document.createElement("div");
      overlay.id = "outro-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #000;
        opacity: 0;
        z-index: 9998;
        pointer-events: none;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(overlay);

      const animateAscend = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeInQuint = (t) => t * t * t * t * t;
        const easedProgress = easeInQuint(progress);

        this.core.scale = startScale + (endScale - startScale) * easedProgress;

        if (progress > 0.7) {
          const fadeProgress = (progress - 0.7) / 0.3;
          overlay.style.opacity = fadeProgress.toString();
        }

        debugLog("Defense", "progress:", progress.toFixed(2), "scale:", this.core.scale.toFixed(1));

        this.render();

        if (progress < 1) {
          requestAnimationFrame(animateAscend);
        } else {
          debugLog("Defense", "TODO");
          overlay.style.opacity = "1";

          setTimeout(() => {
            overlay.remove();
            debugLog("Defense", "TODO");
          }, 500);

          this.core.scale = 1;
          this.isOutroPlaying = false;
          resolve();
        }
      };

      requestAnimationFrame(animateAscend);
    });
  }

  impactEffect(options = null) {
    this.playImpactSound();

    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: white;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.8;
    `;
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.style.transition = "opacity 0.2s";
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 200);
    }, 50);

    this.shakeScreen();

    this.spawnShockwave();

    if (options) {
      const radius = options.radius ?? this.core.shieldRadius * 3;
      const damage = options.damage ?? 20;
      const knockbackSpeed = options.knockbackSpeed ?? 300;
      const slowMult = options.slowMult ?? 0.5;
      const slowDuration = options.slowDuration ?? 3;
      debugLog(
        "Defense",
        "ImpactEffect options",
        "radius",
        radius,
        "damage",
        damage,
        "slow",
        slowMult,
        "enemies",
        this.enemies.length
      );

      const worldW = this.worldWidth || this.canvas.width;
      const worldH = this.worldHeight || this.canvas.height;
      const maxRadius = Math.hypot(worldW, worldH) * 1.2;
      const waveId = this.nextWaveId++;
      this.shockwaves.push({
        id: waveId,
        x: this.core.x,
        y: this.core.y,
        radius: 0,
        maxRadius: maxRadius,
        speed: 220,
        alpha: 0.9,
        color: "#00f0ff",
        lineWidth: 6,
        damageDealt: false,
        effect: {
          applyOnWave: true,
          knockbackSpeed: knockbackSpeed,
          slowMult: slowMult,
          slowDuration: slowDuration,
          damage: damage
        }
      });

      this.slowFields.push({
        x: this.core.x,
        y: this.core.y,
        radius: radius,
        life: slowDuration,
        maxLife: slowDuration,
        alpha: 1,
        fillColor: "rgba(0, 180, 255, 0.18)",
        strokeColor: "rgba(0, 240, 255, 0.7)",
        phase: Math.random() * Math.PI * 2
      });
    }

    if (this.isSafeZone) {
      setTimeout(() => this.showSafeZoneText(), 300);
    }
  }

  playImpactSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      const bass = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(60, now);
      bass.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      bassGain.gain.setValueAtTime(0.8, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      bass.connect(bassGain);
      bassGain.connect(audioCtx.destination);
      bass.start(now);
      bass.stop(now + 0.4);

      const punch = audioCtx.createOscillator();
      const punchGain = audioCtx.createGain();
      punch.type = 'triangle';
      punch.frequency.setValueAtTime(150, now);
      punch.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      punchGain.gain.setValueAtTime(0.6, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      punch.connect(punchGain);
      punchGain.connect(audioCtx.destination);
      punch.start(now);
      punch.stop(now + 0.15);

      const bufferSize = audioCtx.sampleRate * 0.08;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }

      const noise = audioCtx.createBufferSource();
      const noiseGain = audioCtx.createGain();
      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 400;

      noise.buffer = noiseBuffer;
      noise.connect(lowpass);
      lowpass.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noiseGain.gain.setValueAtTime(0.5, now);
      noise.start(now);
    } catch (e) {
      debugLog("Defense", "Audio not supported:", e);
    }
  }

  showSafeZoneText() {
    const isMobile = window.innerWidth <= 768;
    const fontSize = isMobile ? 28 : 48;

    const container = document.createElement("div");
    container.id = "safezone-text";
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      pointer-events: none;
      font-family: 'Courier New', monospace;
      font-size: ${fontSize}px;
      font-weight: bold;
      color: #00ff00;
      text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
      opacity: 0;
      white-space: nowrap;
    `;
    container.textContent = "SAFE ZONE";
    document.body.appendChild(container);

    let glitchCount = 0;
    const maxGlitches = 12;

    const glitchInterval = setInterval(() => {
      glitchCount++;

      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 10;
      const skewX = (Math.random() - 0.5) * 5;

      container.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) skewX(${skewX}deg)`;
      container.style.opacity = Math.random() > 0.3 ? "1" : "0.5";

      if (Math.random() > 0.5) {
        container.style.textShadow = `
          ${Math.random() * 5}px 0 #ff0000,
          ${-Math.random() * 5}px 0 #00ffff,
          0 0 10px #00ff00,
          0 0 20px #00ff00
        `;
      } else {
        container.style.textShadow = "0 0 10px #00ff00, 0 0 20px #00ff00";
      }

      if (glitchCount <= 6 && Math.random() > 0.5) {
        this.playGlitchSound();
      }

      if (glitchCount >= maxGlitches) {
        clearInterval(glitchInterval);
        container.style.transform = "translate(-50%, -50%)";
        container.style.textShadow = "0 0 10px #00ff00, 0 0 20px #00ff00";
        container.style.opacity = "1";

        setTimeout(() => {
          container.style.transition = "opacity 0.5s";
          container.style.opacity = "0";
          setTimeout(() => container.remove(), 500);
        }, 1000);
      }
    }, 80);
  }

  playGlitchSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const bufferSize = audioCtx.sampleRate * 0.05;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noiseSource = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      filter.type = 'highpass';
      filter.frequency.value = 2000;

      noiseSource.buffer = noiseBuffer;
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

      noiseSource.start(audioCtx.currentTime);
    } catch (e) {
    }
  }

  glitchShowHP() {
    return new Promise((resolve) => {
      let glitchCount = 0;
      const maxGlitches = 8;

      const doGlitch = () => {
        if (glitchCount >= maxGlitches) {
          this.showCoreHP = true;
          this.glitchText = false;
          resolve();
          return;
        }

        this.showCoreHP = Math.random() > 0.3;
        this.glitchText = true;
        this.glitchOffset = {
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 5,
        };

        glitchCount++;
        setTimeout(doGlitch, 40 + Math.random() * 30);
      };

      doGlitch();
    });
  }

  shakeScreen() {
    const container = document.getElementById("game-container");
    if (!container) return;

    container.style.transition = "none";
    let shakeCount = 0;
    const maxShakes = 8;
    const shakeIntensity = 15;
    const doShake = () => {
      if (shakeCount >= maxShakes) {
        container.style.transform = "translate(0, 0)";
        return;
      }

      const decay = 1 - shakeCount / maxShakes;
      const x = (Math.random() - 0.5) * shakeIntensity * decay;
      const y = (Math.random() - 0.5) * shakeIntensity * decay;
      container.style.transform = `translate(${x}px, ${y}px)`;

      shakeCount++;
      setTimeout(doShake, 40);
    };

    doShake();
  }

  flashScreen(color = "#ffffff", duration = 0.2) {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: ${color};
      opacity: 0.8;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(flash);

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = elapsed / (duration * 1000);

      if (progress < 1) {
        flash.style.opacity = 0.8 * (1 - progress);
        requestAnimationFrame(animate);
      } else {
        flash.remove();
      }
    };
    requestAnimationFrame(animate);
  }

  spawnImpactParticles(intensity) {
    for (let i = 0; i < intensity * 3; i++) {
      this.particles.push({
        x: this.core.x + (Math.random() - 0.5) * 30,
        y: this.core.y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5 - 2,
        life: 0.5,
        maxLife: 0.5,
        alpha: 1,
        color: "#00ffff",
        size: Math.random() * 3 + 1,
      });
    }
  }

  spawnShockwave() {
    const count = this.isMobile ? 8 : 20;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.core.x,
        y: this.core.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0.6,
        maxLife: 0.6,
        alpha: 1,
        color: "#00ffff",
        size: Math.random() * 5 + 2,
      });
    }
  }

  async spawnAlliesSequentially() {
    if (this.alliedConfig) {
      await this.spawnAlliesWithConfig();
      return;
    }

    const count = this.alliedInfo.count;
    debugLog("Defense", "spawnAllies Starting (legacy), count:", count);

    if (!count || count === 0) {
      debugLog("Defense", "spawnAllies - No allies to spawn");
      return;
    }

    this.alliedViruses = [];

    const delay = 250;
    const targetRadius = 95;

    for (let i = 0; i < count; i++) {
      const angle = ((Math.PI * 2) / count) * i;

      const ally = {
        x: this.core.x,
        y: this.core.y,
        targetX: this.core.x + Math.cos(angle) * targetRadius,
        targetY: this.core.y + Math.sin(angle) * targetRadius,
        hp: 10 + (this.alliedInfo.level - 1) * 5,
        maxHp: 10 + (this.alliedInfo.level - 1) * 5,
        damage: 10,
        angle: angle,
        radius: 6,
        color: this.alliedInfo.color || "#00aaff",
        target: null,
        attackTimer: 0,
        spawning: true,
        spawnProgress: 0,
        virusType: "SWARM",
        attackType: "melee",
      };

      this.alliedViruses.push(ally);
      debugLog("Defense", "TODO", i + 1, "of", count);

      this.animateAllySpawn(ally, targetRadius, angle);

      await new Promise((r) => setTimeout(r, delay));
    }

    debugLog(
      "Defense",
      "spawnAllies Complete! Total:",
      this.alliedViruses.length
    );
  }

  
  async spawnAlliesWithConfig() {
    const config = this.alliedConfig;
    if (!config) return;

    const totalCount = config.mainCount + config.subCount;
    debugLog("Defense", "spawnAlliesWithConfig Starting:", config);

    if (totalCount === 0) {
      debugLog("Defense", "spawnAlliesWithConfig - No allies to spawn");
      return;
    }

    this.alliedViruses = [];

    const delay = 200;
    const targetRadius = 95;

    for (let i = 0; i < config.mainCount; i++) {
      const angle = ((Math.PI * 2) / totalCount) * i;
      const ally = this.createVirusFromType(
        config.mainType,
        config.mainTypeData,
        angle,
        targetRadius,
        config
      );

      this.alliedViruses.push(ally);
      this.animateAllySpawn(ally, targetRadius, angle);
      await new Promise((r) => setTimeout(r, delay));
    }

    if (config.subType && config.subCount > 0) {
      for (let i = 0; i < config.subCount; i++) {
        const angle = ((Math.PI * 2) / totalCount) * (config.mainCount + i);
        const ally = this.createVirusFromType(
          config.subType,
          config.subTypeData,
          angle,
          targetRadius,
          config
        );

        this.alliedViruses.push(ally);
        this.animateAllySpawn(ally, targetRadius, angle);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    debugLog(
      "Defense",
      "spawnAlliesWithConfig Complete! Total:",
      this.alliedViruses.length
    );
  }

  
  createVirusFromType(typeName, typeData, angle, targetRadius, config) {
    const pureBonus = config.isPureSpecialization ? config.pureBonus : 1.0;

    const hp = Math.floor(typeData.baseHp * config.hpMultiplier * pureBonus);
    const damage = Math.floor(
      typeData.baseDamage * config.damageMultiplier * pureBonus
    );
    const speed = Math.floor(typeData.baseSpeed * config.speedMultiplier);

    return {
      x: this.core.x,
      y: this.core.y,
      targetX: this.core.x + Math.cos(angle) * targetRadius,
      targetY: this.core.y + Math.sin(angle) * targetRadius,
      hp: hp,
      maxHp: hp,
      baseMaxHp: hp,
      damage: damage,
      speed: speed,
      angle: angle,
      radius: typeData.radius,
      color: typeData.color,
      target: null,
      attackTimer: 0,
      spawning: true,
      spawnProgress: 0,

      virusType: typeName,
      attackType: typeData.attackType,

      special: typeData.special || null,
      range: typeData.range || 0,
      fireRate: typeData.fireRate || 0,
      projectileSpeed: typeData.projectileSpeed || 0,
      explosionDamage: typeData.explosionDamage || 0,
      explosionRadius: typeData.explosionRadius || 0,
      knockbackForce: typeData.knockbackForce || 0,
      healAmount: typeData.healAmount || 0,
      healRadius: typeData.healRadius || 0,

      tauntRadius: typeData.tauntRadius || 0,
      tauntCooldown: typeData.tauntCooldown || 0,
      aggroRadius: typeData.aggroRadius || 0,

      respawnTime: config.respawnTime,

      synergy: config.synergy,
    };
  }

  animateAllySpawn(ally, targetRadius, angle) {
    const duration = 300;
    const startTime = performance.now();
    const overshoot = 1.3;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const elasticOut = (t) => {
        if (t === 0 || t === 1) return t;
        return (
          Math.pow(2, -10 * t) *
          Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) +
          1
        );
      };

      const eased = elasticOut(progress);

      const currentRadius = targetRadius * eased;

      ally.x = this.core.x + Math.cos(angle) * currentRadius;
      ally.y = this.core.y + Math.sin(angle) * currentRadius;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ally.spawning = false;
        ally.x = this.core.x + Math.cos(angle) * targetRadius;
        ally.y = this.core.y + Math.sin(angle) * targetRadius;

        const particleCount = this.isMobile ? 3 : 6;
        for (let p = 0; p < particleCount; p++) {
          const pAngle = ((Math.PI * 2) / particleCount) * p;
          this.particles.push({
            x: ally.x,
            y: ally.y,
            vx: Math.cos(pAngle) * 3,
            vy: Math.sin(pAngle) * 3,
            life: 0.3,
            maxLife: 0.3,
            alpha: 1,
            color: ally.color,
            size: 3,
          });
        }
      }
    };

    const startParticles = this.isMobile ? 2 : 4;
    for (let p = 0; p < startParticles; p++) {
      this.particles.push({
        x: this.core.x,
        y: this.core.y,
        vx: Math.cos(angle) * 2 + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * 2 + (Math.random() - 0.5) * 2,
        life: 0.2,
        maxLife: 0.2,
        alpha: 1,
        color: "#ffffff",
        size: 4,
      });
    }

    requestAnimationFrame(animate);
  }

  expandShield() {
    return new Promise((resolve) => {
      const targetRadius = 70;
      const duration = 300;
      const start = performance.now();

      const animateShield = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);

        const elastic = (x) =>
          x === 0
            ? 0
            : x === 1
              ? 1
              : Math.pow(2, -10 * x) *
              Math.sin(((x * 10 - 0.75) * (2 * Math.PI)) / 3) +
              1;

        this.core.shieldRadius = targetRadius * elastic(progress);

        if (progress < 1) {
          requestAnimationFrame(animateShield);
        } else {
          this.core.shieldRadius = targetRadius;
          resolve();
        }
      };
      requestAnimationFrame(animateShield);
    });
  }


  
  async loadVirusDialogues() {
    try {
      const response = await fetch('./js/data/virusDialogues.json');
      this.virusDialogues = await response.json();
      debugLog("Defense", "Virus dialogues loaded:", Object.keys(this.virusDialogues));
    } catch (e) {
      console.warn('[DefenseGame] Failed to load virus dialogues:', e);
      this.virusDialogues = { battle: [], idle: [], hurt: [], kill: [] };
    }
  }

  
  getRandomDialogue(category) {
    if (!this.virusDialogues || !this.virusDialogues[category]) return null;
    const dialogues = this.virusDialogues[category];
    if (dialogues.length === 0) return null;
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }

  
  createSpeechBubble(virus, text, duration = 1500) {
    if (!text) return;

    if (virus.isSpeaking) return;
    virus.isSpeaking = true;

    const bubble = {
      virus: virus,
      text: text,
      startTime: performance.now(),
      duration: duration,
      opacity: 1
    };

    this.activeSpeechBubbles.push(bubble);

    setTimeout(() => {
      virus.isSpeaking = false;
    }, duration + 500);
  }

  
  tryVirusSpeech(virus, situation, chance = 0.1) {
    if (Math.random() > chance) return;
    const text = this.getRandomDialogue(situation);
    if (text) {
      this.createSpeechBubble(virus, text);
    }
  }

  
  updateSpeechBubbles() {
    const now = performance.now();

    this.activeSpeechBubbles = this.activeSpeechBubbles.filter(bubble => {
      const elapsed = now - bubble.startTime;
      if (elapsed > bubble.duration) {
        return false;
      }
      if (elapsed > bubble.duration - 300) {
        bubble.opacity = 1 - (elapsed - (bubble.duration - 300)) / 300;
      }
      return true;
    });
  }

  
  renderSpeechBubbles() {
    const ctx = this.ctx;

    this.activeSpeechBubbles.forEach(bubble => {
      const v = bubble.virus;
      if (!v) return;

      ctx.save();
      ctx.globalAlpha = bubble.opacity;

      const textY = v.y - v.radius - 15;

      ctx.font = "bold 13px 'VT323', 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(bubble.text, v.x, textY);

      ctx.fillStyle = "#00ff41";
      ctx.fillText(bubble.text, v.x, textY);

      ctx.restore();
    });
  }


  
  playBGMTrack(trackName) {
    if (this.currentBGMTrack === trackName) return;
    this.currentBGMTrack = trackName;
    this.bgmManager.play(trackName);
  }

  
  toggleBGM() {
    const isOn = this.bgmManager.toggleMute();

    if (isOn && this.isRunning) {
      if (this.isSafeZone) {
        this.playBGMTrack('SAFE_ZONE');
      } else if (this.currentPage >= 10 || this.isReinforcementMode) {
        this.playBGMTrack('FINAL');
      } else {
        this.playBGMTrack('DEFENSE');
      }
    }

    return isOn;
  }

  updateMoveInput() {
    let x = 0;
    let y = 0;

    if (this.isTetrisActive()) {
      this.keyState.up = false;
      this.keyState.down = false;
      this.keyState.left = false;
      this.keyState.right = false;
      this.keyState.shift = false;
      this.moveInput.x = 0;
      this.moveInput.y = 0;
      return;
    }

    if (this.isMobile && this.joystick.active) {
      x = this.joystick.inputX;
      y = this.joystick.inputY;
    } else {
      if (this.keyState.left) x -= 1;
      if (this.keyState.right) x += 1;
      if (this.keyState.up) y -= 1;
      if (this.keyState.down) y += 1;
      const len = Math.hypot(x, y);
      if (len > 0) {
        x /= len;
        y /= len;
      }
    }

    this.moveInput.x = x;
    this.moveInput.y = y;
  }

  updateCoreMovement(dt) {
    const sway = 6;
    if (this.core.shieldState === "DISABLED") {
      this.moveInput.x = 0;
      this.moveInput.y = 0;
      this.core.targetOffsetX = 0;
      this.core.targetOffsetY = 0;
      return;
    }

    let speedScale = 1.0;
    const usingJoystick = this.isMobile && this.joystick.active;
    const isMoving = this.moveInput.x !== 0 || this.moveInput.y !== 0;
    if (!usingJoystick) {
      if (this.keyState.shift && isMoving) {
        this.shiftAccel = Math.min(
          this.shiftMaxMultiplier,
          this.shiftAccel + dt * this.shiftAccelRate
        );
      } else {
        this.shiftAccel = 1.0;
      }
      speedScale = this.shiftAccel;
    } else {
      this.shiftAccel = 1.0;
    }

    const speed = this.coreMoveSpeed * speedScale;
    this.core.x += this.moveInput.x * speed * dt;
    this.core.y += this.moveInput.y * speed * dt;

    const allowShieldPassThrough =
      (this.isConquered && !this.isSafeZone) ||
      this.isIntroDrop ||
      performance.now() < this.shieldPassThroughUntil;
    if (this.core.shieldActive && !allowShieldPassThrough) {
      const maxDist = Math.max(0, this.core.shieldRadius - this.core.radius);
      const dx = this.core.x - this.shieldAnchor.x;
      const dy = this.core.y - this.shieldAnchor.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        this.core.x = this.shieldAnchor.x + nx * maxDist;
        this.core.y = this.shieldAnchor.y + ny * maxDist;
      }
    } else {
      this.core.x = Math.min(Math.max(this.core.x, 0), this.worldWidth);
      this.core.y = Math.min(Math.max(this.core.y, 0), this.worldHeight);
    }
    this.core.targetOffsetX = this.moveInput.x * sway;
    this.core.targetOffsetY = this.moveInput.y * sway;
  }

  updateCoreReturn(dt) {
    const dx = this.coreHome.x - this.core.x;
    const dy = this.coreHome.y - this.core.y;
    const dist = Math.hypot(dx, dy);
    const sway = 6;

    if (dist > 2) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.core.x += nx * this.coreReturnSpeed * dt;
      this.core.y += ny * this.coreReturnSpeed * dt;
      this.core.targetOffsetX = nx * sway;
      this.core.targetOffsetY = ny * sway;
    } else {
      this.core.x = this.coreHome.x;
      this.core.y = this.coreHome.y;
      this.coreReturnAtHome = true;
      this.core.targetOffsetX = 0;
      this.core.targetOffsetY = 0;
    }

    if (this.coreReturnAtHome) {
      this.coreReturnTimer -= dt;
      if (this.coreReturnTimer <= 0) {
        this.core.shieldState = "CHARGING";
        this.core.shieldTimer = 2.0;
        this.updateShieldBtnUI("CHARGING...", "#ffff00");
      }
    }
  }

  updateCamera() {
    const viewW = this.canvas.width;
    const viewH = this.canvas.height;
    const halfW = viewW / 2;
    const halfH = viewH / 2;

    let cx = this.core.x;
    let cy = this.core.y;

    cx = Math.min(Math.max(cx, halfW), this.worldWidth - halfW);
    cy = Math.min(Math.max(cy, halfH), this.worldHeight - halfH);

    this.camera.x = cx;
    this.camera.y = cy;
  }

  startJoystick(e) {
    if (!this.isMobile) return;
    this.joystick.active = true;
    this.joystick.pointerId = e.pointerId;
    this.updateJoystickInput(e);
  }

  moveJoystick(e) {
    if (!this.joystick.active || e.pointerId !== this.joystick.pointerId) return;
    this.updateJoystickInput(e);
  }

  endJoystick(e) {
    if (!this.joystick.active || e.pointerId !== this.joystick.pointerId) return;
    this.joystick.active = false;
    this.joystick.pointerId = null;
    this.joystick.inputX = 0;
    this.joystick.inputY = 0;
    this.joystickThumb.style.transform = "translate(-50%, -50%)";
  }

  updateJoystickInput(e) {
    const rect = this.joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const max = rect.width / 2;

    const dist = Math.min(Math.hypot(dx, dy), max);
    const nx = dist > 0 ? dx / max : 0;
    const ny = dist > 0 ? dy / max : 0;

    this.joystick.inputX = nx;
    this.joystick.inputY = ny;

    const thumbX = nx * (max - 20);
    const thumbY = ny * (max - 20);
    this.joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
  }

  renderMiningEffect(ctx, time) {
    if (!this.miningManager) return;
    const cx = this.shieldAnchor.x;
    const cy = this.shieldAnchor.y;
    const base = Math.max(10, this.core.shieldRadius * 0.35);
    const t = time;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = "lighter";

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, base + Math.sin(t * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, base * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    const dotCount = 8;
    for (let i = 0; i < dotCount; i++) {
      const ang = t * 1.6 + (i * Math.PI * 2) / dotCount;
      const r = base * 0.9;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#7dffb3";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const streaks = 4;
    for (let i = 0; i < streaks; i++) {
      const ang = t * 2 + i * 1.7;
      const travel = (t * 60 + i * 25) % (base * 1.2);
      const r = base * 1.2 - travel;
      const x1 = Math.cos(ang) * r;
      const y1 = Math.sin(ang) * r;
      const x2 = Math.cos(ang) * Math.max(0, r - 10);
      const y2 = Math.sin(ang) * Math.max(0, r - 10);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }
}


