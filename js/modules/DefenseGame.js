import { BGMManager } from "./BGMManager.js";

export class DefenseGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // TODO
    this.bgmManager = new BGMManager();

    // TODO
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.originalCanvas = this.canvas; // TODO
    this.isMiniDisplay = false; // TODO
    // TODO
    this.canvas.style.display = "none";
    this.canvas.style.position = "fixed"; // TODO
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "50"; // TODO
    document.body.appendChild(this.canvas); // TODO
    // TODO
    this.isGodMode = false;

    // TODO
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

    // TODO
    // TODO
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

    // TODO
    this.showCoreHP = true;
    this.glitchText = false;
    this.glitchOffset = { x: 0, y: 0 };

    // TODO
    this.gameScale = 1.0;

    // TODO
    this.isMobile = window.innerWidth <= 768;
    this.maxParticles = this.isMobile ? 30 : 100;
    this.particleMultiplier = this.isMobile ? 0.3 : 1.0;


    // TODO
    this.worldScale = 2.0;
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.camera = { x: 0, y: 0 };

    // TODO
    this.coreHome = { x: 0, y: 0 };
    this.coreMoveSpeed = 220;
    this.coreReturnSpeed = 280;
    this.coreReturnTimer = 0;
    this.coreReturnAtHome = false;
    this.moveInput = { x: 0, y: 0 };
    this.keyState = { up: false, down: false, left: false, right: false };
    this.joystick = { active: false, pointerId: null, inputX: 0, inputY: 0 };
    this.hasInitializedCore = false;
    // TODO
    this.uiLayer = document.createElement("div");
    this.uiLayer.id = "defense-ui";
    this.uiLayer.style.position = "fixed"; // TODO
    this.uiLayer.style.top = "0";
    this.uiLayer.style.left = "0";
    this.uiLayer.style.width = "100%";
    this.uiLayer.style.height = "100%";
    this.uiLayer.style.pointerEvents = "none"; // TODO
    this.uiLayer.style.zIndex = "90"; // TODO
    this.uiLayer.style.display = "none";
    document.body.appendChild(this.uiLayer); // TODO

    // TODO
    this.joystickContainer = document.createElement("div");
    this.joystickContainer.id = "move-joystick";
    this.joystickContainer.style.cssText = `
      position: absolute;
      left: 24px;
      bottom: 24px;
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
    // TODO
    this.onPageUpdate = null; // TODO

    // TODO
    this.shieldBtn = document.createElement("button");
    this.shieldBtn.id = "shield-btn";
    this.shieldBtn.style.position = "absolute";
    this.shieldBtn.style.bottom = "100px";
    this.shieldBtn.style.left = "50%";
    this.shieldBtn.style.transform = "translateX(-50%)";
    this.shieldBtn.style.width = "220px";
    this.shieldBtn.style.height = "60px";
    this.shieldBtn.style.backgroundColor = "rgba(0, 50, 255, 0.3)";
    this.shieldBtn.style.border = "2px solid #00f0ff";
    this.shieldBtn.style.color = "#00f0ff";
    this.shieldBtn.style.fontFamily = "var(--term-font)";
    this.shieldBtn.style.fontSize = "16px";
    this.shieldBtn.style.cursor = "pointer";
    this.shieldBtn.style.pointerEvents = "auto";
    this.shieldBtn.style.zIndex = "30";
    this.shieldBtn.style.touchAction = "manipulation"; // TODO
    this.shieldBtn.style.userSelect = "none"; // TODO
    this.shieldBtn.style.webkitTapHighlightColor = "transparent"; // TODO

    // TODO
    this.shieldBtn.onclick = () => this.toggleShield();
    this.uiLayer.appendChild(this.shieldBtn);
    this.updateShieldBtnUI("ACTIVE", "#00f0ff"); // TODO

    // TODO
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

    // TODO

    // TODO
    this.isRunning = false;
    this.lastTime = 0;

    // TODO
    this.currentBGMTrack = null;

    // TODO
    this.turret = {
      angle: 0,
      range: 200, // TODO
      fireRate: 4.0, // TODO
      lastFireTime: 0,
      damage: 10,
      projectileSpeed: 300, // TODO
    };

    // TODO
    this.staticSystem = {
      currentCharge: 0, // TODO
      maxCharge: 100, // TODO
      hitChargeAmount: 15, // TODO
      killChargeAmount: 25, // TODO
      chainCount: 3, // TODO
      chainRange: 250, // TODO
      lastDischargeTime: 0, // TODO
    };

    // TODO
    this.staticEffects = {
      sparks: [], // TODO
      chains: [], // TODO
    };

    // TODO
    // TODO
    // TODO
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

    // TODO
    this.helper = {
      x: 0,
      y: 0,
      radius: 8,
      color: "#ffff00", // TODO
      speed: 40, // TODO
      fireRate: 4.0, // TODO
      lastFireTime: 0,
      range: 300, // TODO
      damage: 10,
      projectileSpeed: 400, // TODO
      angle: 0, // TODO
      evadeDistance: 50, // TODO
      targetX: 0, // TODO
      targetY: 0,
      // TODO
      weaponMode: "NORMAL",
      // TODO
      currentAmmo: 0, // TODO
      isReloading: false,
      reloadProgress: 0, // TODO
      reloadStartTime: 0,
    };

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.alliedViruses = []; // TODO
    this.miningManager = null; // TODO
    this.shockwaves = []; // TODO

    // TODO
    this.droppedItems = []; // TODO
    this.collectorViruses = []; // TODO
    // TODO
    this.virusDialogues = null; // TODO
    this.activeSpeechBubbles = []; // TODO
    this.loadVirusDialogues(); // TODO

    // TODO
    this.waveTimer = 0;
    this.pageDurationBase = 12.5;
    this.pageDuration = 10; // TODO
    this.pageSpawnScale = this.pageDuration / this.pageDurationBase;
    this.spawnRate = 0.4 * this.pageSpawnScale; // TODO
    this.currentPage = 1; // TODO
    this.pageTimer = 0;
    this.pageDuration = 10; // TODO
    // TODO
    this.currentStage = 0; // TODO
    this.currentStageId = 0; // TODO
    this.stageDifficultyScale = 1.0; // TODO
    this.stageMaxPages = 12; // TODO
    this.isFarmingZone = false; // TODO
    this.safeZoneSpawnRate = 2; // TODO

    // TODO
    this.isReinforcementMode = false;
    this.reinforcementPage = 0;
    this.reinforcementMaxPages = 3;
    this.reinforcementComplete = false;
    this.reinforcementSpawnRate = 0.27; // TODO

    // TODO
    this.isConquered = false; // TODO

    // TODO
    this.isBossFight = false; // TODO
    this.bossManager = null; // TODO
    this.breachReadyShown = false; // TODO

    // TODO
    this.onResourceGained = null;
    this.onGameOver = null;
    this.onConquer = null; // TODO
    this.onConquerReady = null; // TODO
    this.onEnemyKilled = null; // TODO
    this.onItemCollected = null; // TODO
    this.onBreachReady = null; // TODO

    // TODO
    this.frameEnemiesKilled = 0;
    this.frameCoreDamaged = 0;

    // TODO
    this.getItemEffects = () => ({
      convert: 0,
      chain: 0,
      chainRadius: 0,
      lifesteal: 0,
      attackSpeed: 0,
      dropRate: 0
    });

    // TODO
    this.conquerReady = false;

    // TODO
    this.alliedConfig = null; // TODO
    this.alliedInfo = { count: 0, level: 1, color: "#00aaff" }; // TODO
    // TODO
    this.currentData = 0;

    window.addEventListener("resize", () => this.resize());

    // TODO
    document.addEventListener("visibilitychange", () =>
      this.handleVisibilityChange()
    );

    // TODO
    if (window.innerWidth <= 768) {
      this.shieldBtn.style.bottom = "80px";
      this.shieldBtn.style.width = "160px";
      this.shieldBtn.style.height = "50px";
    }

    // TODO
    this.idleTurretAngle = 0;
    this.idleTurretSpeed = 1.5; // TODO

    // TODO
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener(
      "touchstart",
      (e) => this.handleCanvasTouch(e),
      { passive: false }
    );

    // TODO
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));

    this.resize();
  }

  // TODO
  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      debugLog("Defense", "Tab restored - validating game state");
      // TODO
      this.validateGameState();
      this.resize(); // TODO
      // TODO
      this.lastTime = performance.now();
    } else {
      debugLog("Defense", "Tab hidden - pausing updates");
    }
  }

  // TODO
  validateGameState() {
    const worldW = this.worldWidth || this.canvas.width;
    const worldH = this.worldHeight || this.canvas.height;
    // TODO
    if (
      !this.core.x ||
      !this.core.y ||
      isNaN(this.core.x) ||
      isNaN(this.core.y) ||
      this.core.x < 0 ||
      this.core.x > worldW ||
      this.core.y < 0 ||
      this.core.y > worldH
    ) {
      debugWarn("Defense", "Core position invalid, resetting to center");
      this.core.x = this.coreHome.x || worldW / 2;
      this.core.y = this.coreHome.y || worldH / 2;
    }

    // TODO
    if (isNaN(this.core.hp) || this.core.hp < 0) {
      debugWarn("Defense", "Core HP invalid, resetting");
      this.core.hp = this.core.maxHp;
    }

    // TODO
    if (isNaN(this.core.shieldHp)) {
      debugWarn("Defense", "Shield HP invalid, resetting");
      this.core.shieldHp = this.core.shieldMaxHp;
    }

    // TODO
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

    // TODO
    this.alliedViruses.forEach((v) => {
      // TODO
      if (isNaN(v.x) || isNaN(v.y)) {
        // TODO
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 40;
        v.x = this.core.x + Math.cos(angle) * dist;
        v.y = this.core.y + Math.sin(angle) * dist;
        v.vx = 0;
        v.vy = 0;
        debugWarn("Defense", "Allied virus repositioned (invalid position)");
      }
    });

    // TODO
    const scaledMargin = 100 / this.gameScale; // TODO
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

    // TODO
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
    // TODO
    const targetCanvas = this.originalCanvas || this.canvas;
    targetCanvas.width = window.innerWidth;
    targetCanvas.height = window.innerHeight;

    // TODO
    this.isMobile = window.innerWidth <= 768;
    this.maxParticles = this.isMobile ? 30 : 100;
    this.particleMultiplier = this.isMobile ? 0.3 : 1.0;

    // TODO
    if (window.innerWidth <= 768) {
      this.gameScale = 1.0; // TODO
      this.gameScale = 0.8; // TODO
    } else {
      this.gameScale = 1.0; // TODO
    }

    const isMobile = window.innerWidth <= 768;
    const shieldScale = isMobile ? 0.5 : 1.0;
    this.core.radius = this.baseCoreRadius * (isMobile ? 0.7 : 1.0);
    this.core.shieldRadius = this.baseShieldRadius * shieldScale;

    this.worldWidth = targetCanvas.width * this.worldScale;
    this.worldHeight = targetCanvas.height * this.worldScale;
    this.coreHome.x = this.worldWidth / 2;
    this.coreHome.y = this.worldHeight / 2;

    if (!this.hasInitializedCore) {
      this.core.x = this.coreHome.x;
      this.core.y = this.coreHome.y;
      this.hasInitializedCore = true;
    } else {
      this.core.x = Math.min(Math.max(this.core.x, 0), this.worldWidth);
      this.core.y = Math.min(Math.max(this.core.y, 0), this.worldHeight);
    }

    this.updateCamera();

    debugLog("Canvas", "resize() complete - size:", targetCanvas.width, "x", targetCanvas.height, "scale:", this.gameScale);
  }

  /**
   * ? ? ( ???????? ?)
   * @param {string|null} canvasId -  ??ID (null? ? ??)
   */
  setMiniDisplay(canvasId) {
    debugLog("Canvas", "setMiniDisplay called with:", canvasId);
    if (canvasId) {
      // TODO
      const miniCanvas = document.getElementById(canvasId);
      debugLog("Canvas", "miniCanvas found:", !!miniCanvas);
      if (miniCanvas) {
        debugLog("Canvas", "  ? ??- canvas.id:", this.canvas.id, "isMiniDisplay:", this.isMiniDisplay);

        // TODO
        this.miniCanvas = miniCanvas;
        this.isMiniDisplay = true;

        // TODO
        // TODO

        // TODO
        this.renderDebugFrameCount = 0;

        // TODO
        miniCanvas.style.display = "block";

        debugLog("Canvas", "Switched to mini display mode");
        debugLog("Canvas", "? originalCanvas????  ? ???");
        debugLog("Canvas", "  ? ??-  ?:", this.core.x, this.core.y);
        debugLog("Canvas", "  ? ??- gameScale:", this.gameScale);
        debugLog("Canvas", "  ? ??- ?:", this.alliedViruses.length, "??", this.enemies.length);
      }
    } else {
      // TODO
      debugLog("Canvas", "=== ? ? ? ? ===");
      debugLog("Canvas", "? ??- isMiniDisplay:", this.isMiniDisplay);

      if (this.originalCanvas) {
        debugLog("Canvas", "originalCanvas size:", this.originalCanvas.width, "x", this.originalCanvas.height);
        debugLog("Canvas", "originalCanvas.style.display:", this.originalCanvas.style.display);

        // TODO
        this.miniCanvas = null;
        this.isMiniDisplay = false;

        // TODO
        this.renderDebugFrameCount = 0;

        // TODO
        this.originalCanvas.style.display = "block";

        debugLog("Canvas", "Canvas restored - size:", this.originalCanvas.width, "x", this.originalCanvas.height);
        debugLog("Canvas", "Canvas display:", this.originalCanvas.style.display);
        debugLog("Canvas", "=== ? ? ? ? ===");
      }
    }
  }

  // TODO
  updateResourceDisplay(amount) {
    this.currentData = amount;
    // TODO
    if (this.onDataUpdate) {
      this.onDataUpdate(this.currentData);
    }
  }

  // TODO
  updateAlliedInfo(info) {
    this.alliedInfo = info;
    debugLog("Defense", "updateAlliedInfo - Info saved:", info);
    // TODO
  }

  // TODO
  updateAlliedConfig(config) {
    this.alliedConfig = config;
    debugLog("Defense", "updateAlliedConfig - Config saved:", config);
  }

  handleConquerClick() {
    // TODO
    this.conquerBtn.style.display = "none";

    // TODO
    this.playConquestShieldBreak(() => {
      // TODO
      this.core.shieldActive = false;
      this.core.shieldState = "DISABLED";
      this.core.shieldHp = 0;
      this.updateShieldBtnUI("DISABLED", "#555");
      this.shieldBtn.style.pointerEvents = "none";

      // TODO
      if (this.onConquer) this.onConquer();

      // TODO
      this.currentPage = 1;
      this.updateWaveDisplay();
    });
  }

  // TODO
  playConquestShieldBreak(onComplete) {
    const originalRadius = this.core.shieldRadius;
    const startTime = performance.now();
    const totalDuration = 2000; // TODO
    const phase1Duration = 800; // TODO
    // TODO
    this.isConquestBreaking = true;

    const animate = (now) => {
      const elapsed = now - startTime;

      // TODO
      if (elapsed < phase1Duration) {
        const progress = elapsed / phase1Duration;

        // TODO
        if (Math.random() < 0.3) {
          this.shakeScreen(5 + progress * 10);
        }

        // TODO
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
            char: "???"[Math.floor(Math.random() * 3)],
          });
        }

        // TODO
        if (elapsed > phase1Duration - 100 && !this._phase1Flash) {
          this._phase1Flash = true;
          this.flashScreen("#00ffff", 0.4);
          this.shakeScreen(15);

          // TODO
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
              char: "???"[Math.floor(Math.random() * 4)],
            });
          }
        }

        requestAnimationFrame(animate);
        return;
      }

      // TODO
      if (!this._phase2Started) {
        this._phase2Started = true;

        // TODO
        this.flashScreen("#ffffff", 0.6);
        this.shakeScreen(30);

        // TODO
        const segments = 24;
        for (let i = 0; i < segments; i++) {
          const angle = ((Math.PI * 2) / segments) * i;
          const x = this.core.x + Math.cos(angle) * this.core.shieldRadius;
          const y = this.core.y + Math.sin(angle) * this.core.shieldRadius;

          // TODO
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
              char: "????"[Math.floor(Math.random() * 8)],
            });
          }
        }

        // TODO
        this.shockwaves.push({
          x: this.core.x,
          y: this.core.y,
          radius: this.core.shieldRadius,
          maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
          speed: 400, // TODO
          alpha: 0.8,
          color: "#00f0ff",
          lineWidth: 6,
          damageDealt: false,
        }); // TODO

        this.applyShockwaveEffects();
      }

      // TODO
      const phase2Progress =
        (elapsed - phase1Duration) / (totalDuration - phase1Duration);
      this.core.shieldRadius = originalRadius * (1 - phase2Progress);

      if (elapsed < totalDuration) {
        requestAnimationFrame(animate);
      } else {
        // TODO
        this.core.shieldRadius = 0;
        this.isConquestBreaking = false;
        this._phase1Flash = false;
        this._phase2Started = false;

        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  // TODO
  applyShockwaveEffects() {
    const damage = 25; // TODO

    this.enemies.forEach((enemy) => {
      // TODO
      this.applyKnockback(enemy, 200, 0.3, 2);

      // TODO
      enemy.hp -= damage;
      this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);

      // TODO
      if (enemy.hp <= 0) {
        this.createExplosion(enemy.x, enemy.y, "#00ff00", 10);
        const gain = 10;
        this.currentData += gain;
        this.updateResourceDisplay(this.currentData);
      }
    });

    // TODO
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  toggleShield() {
    // TODO
    if (
      this.core.shieldState === "CHARGING" ||
      this.core.shieldState === "DISCHARGING" ||
      this.core.shieldState === "RETURNING" ||
      this.core.shieldState === "BROKEN" ||
      this.core.shieldState === "RECHARGING" ||
      this.core.shieldState === "DISABLED"
    ) {
      return;
    }

    if (this.core.shieldActive) {
      // TODO
      this.core.shieldState = "DISCHARGING";
      this.core.shieldTimer = 1.0;
      this.updateShieldBtnUI("DISENGAGING...", "#ffff00");
    } else {
      // TODO
      this.core.shieldState = "RETURNING";
      this.coreReturnTimer = 3.0;
      this.coreReturnAtHome = false;
      this.updateShieldBtnUI("RETURNING...", "#ffff00");
    }
  }

  // TODO
  updateShieldVisualTargets() {
    const sv = this.shieldVisual;
    const state = this.core.shieldState;

    if (state === "ACTIVE") {
      // TODO
      sv.targetAlpha = 0.8;
      sv.targetDashGap = 0; // TODO
      sv.targetLineWidth = 2.5;
      sv.targetFillAlpha = 0.15;
      sv.targetRotationSpeed = 0; // TODO
    } else if (state === "OFF" || state === "RETURNING") {
      // TODO
      sv.targetAlpha = 0.5;
      sv.targetDashGap = 10; // TODO
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0;
      sv.targetRotationSpeed = 0;
    } else if (state === "DISCHARGING") {
      // TODO
      sv.targetAlpha = 0.6;
      sv.targetDashGap = 10;
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0.05;
      sv.targetRotationSpeed = 30; // TODO
    } else if (state === "CHARGING") {
      // TODO
      const elapsed = 2.0 - this.core.shieldTimer;
      const progress = Math.min(1, elapsed / 2.0);

      // TODO
      sv.targetAlpha = 0.5 + progress * 0.3;
      sv.targetDashGap = 12 * (1 - progress); // TODO
      sv.targetLineWidth = 1.5 + progress * 1;
      sv.targetFillAlpha = progress * 0.15;
      sv.targetRotationSpeed = 50 + progress * 500; // TODO
    } else if (state === "BROKEN" || state === "RECHARGING") {
      // TODO
      sv.targetAlpha = 0.5;
      sv.targetDashGap = 12;
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0;
      // TODO
      sv.targetRotationSpeed = 0;
    } else if (state === "DISABLED") {
      // TODO
      sv.targetAlpha = 0.3;
      sv.targetDashGap = 15;
      sv.targetLineWidth = 1;
      sv.targetFillAlpha = 0;
      sv.targetRotationSpeed = 0;
    }
  }

  updateShieldBtnUI(text, color, loadingProgress = null) {
    const hpPct = Math.floor(
      (this.core.shieldHp / this.core.shieldMaxHp) * 100
    );

    // TODO
    let topDisplay = `(${hpPct}%)`;
    if (loadingProgress !== null) {
      // TODO
      const circumference = 2 * Math.PI * 12;
      const dashOffset = circumference * (1 - loadingProgress);
      topDisplay = `
              <svg width="30" height="30" style="vertical-align: middle;">
                  <circle cx="15" cy="15" r="12" fill="none" stroke="#333" stroke-width="3"/>
                  <circle cx="15" cy="15" r="12" fill="none" stroke="${color}" stroke-width="3"
                      stroke-dasharray="${circumference}" 
                      stroke-dashoffset="${dashOffset}"
                      transform="rotate(-90 15 15)"/>
              </svg>
          `;
    }

    // TODO
    this.shieldBtn.innerHTML = `
          SHIELD: ${text}
          <div style='
              position: absolute; 
              top: -30px; 
              left: 50%; 
              transform: translateX(-50%); 
              font-size: 14px; 
              color: ${color}; 
              text-shadow: 0 0 5px ${color};
              white-space: nowrap;
          '>
              ${topDisplay}
          </div>
      `;
    this.shieldBtn.style.borderColor = color;
    this.shieldBtn.style.color = color;
  }

  start() {
    this.resize();
    this.isRunning = true;
    this.canvas.style.display = "block";
    this.uiLayer.style.display = "block"; // TODO

    // TODO
    this.isSafeZone = (this.currentStageId === 0);
    this.isFarmingZone = (this.currentStageId === 3); // TODO

    // TODO
    this.currentPage = 1;
    this.pageTimer = 0;
    this.conquerReady = false; // TODO
    this.conquerBtn.style.display = "none";
    this.updateWaveDisplay();
    this.updateShieldBtnUI("ACTIVE", "#fff");

    // TODO
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
    this.uiLayer.style.display = "none"; // TODO

    // TODO
    this.bgmManager.stop();
  }

  pause() {
    this.isRunning = false;
    // TODO

    // TODO
    this.bgmManager.stop();
  }

  resume() {
    debugLog("Canvas", "resume() called, isRunning before:", this.isRunning);
    debugLog("Canvas", "canvas before resume:", this.canvas.style.display);
    debugLog("Canvas", "canvas element:", this.canvas);
    debugLog("Canvas", "isMiniDisplay:", this.isMiniDisplay);

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.animate(t));
      debugLog("Canvas", "Animation frame requested");

      // TODO
      if (this.currentBGMTrack) {
        this.bgmManager.play(this.currentBGMTrack);
      }
    } else {
      debugLog("Canvas", "Already running, skipping resume");
    }

    // TODO
    if (!this.isMiniDisplay) {
      this.canvas.style.display = "block";
      this.uiLayer.style.display = "block";
      debugLog("Canvas", "Set canvas and uiLayer to block (? )");
    } else {
      debugLog("Canvas", "Skipped canvas display (  - ? ???? ??)");
    }
    debugLog("Canvas", "canvas after set:", this.canvas.style.display);
  }

  update(deltaTime) {
    const now = performance.now() / 1000;

    // TODO
    const clampedDeltaTime = Math.min(deltaTime, 100);
    const dt = clampedDeltaTime / 1000;

    // TODO
    this.validateGameState();

    // TODO
    const core = this.core;
    // TODO
    core.visualOffsetX += (core.targetOffsetX - core.visualOffsetX) * dt * 15;
    core.visualOffsetY += (core.targetOffsetY - core.visualOffsetY) * dt * 15;
    // TODO
    core.targetOffsetX *= Math.pow(0.05, dt);
    core.targetOffsetY *= Math.pow(0.05, dt);
    // TODO
    if (Math.abs(core.targetOffsetX) < 0.1) core.targetOffsetX = 0;
    if (Math.abs(core.targetOffsetY) < 0.1) core.targetOffsetY = 0;

    // TODO
    this.updateMoveInput();
    if (this.core.shieldState === "RETURNING") {
      this.updateCoreReturn(dt);
    } else {
      this.updateCoreMovement(dt);
    }
    this.updateCamera();
    const canMove = !this.core.shieldActive && this.core.shieldState === "OFF";
    this.joystickContainer.style.display = (this.isMobile && canMove) ? "block" : "none";

    // TODO
    if (this.core.shieldState === "RETURNING") {
      // TODO
    } else if (this.core.shieldState === "CHARGING") {
      this.core.shieldTimer -= dt;
      if (this.core.shieldTimer <= 0) {
        this.core.shieldActive = true;
        this.core.shieldState = "ACTIVE";
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
    // TODO
    if (this.core.shieldActive) {
      // TODO
      // TODO
    } else {
      // TODO
      if (
        this.core.shieldState === "OFF" &&
        this.core.shieldHp < this.core.shieldMaxHp
      ) {
        this.core.shieldHp += 10 * dt; // TODO
        if (this.core.shieldHp > this.core.shieldMaxHp)
          this.core.shieldHp = this.core.shieldMaxHp;
        this.updateShieldBtnUI("OFFLINE", "#f00");
      }
    }

    // TODO
    this.updateShieldVisualTargets();

    // TODO
    if (this.isBossFight && this.bossManager && !this.bossManager.isBreachReady) {
      const shieldOff = !this.core.shieldActive;
      this.bossManager.updateBreachGauge(dt, shieldOff, this.frameEnemiesKilled || 0, this.frameCoreDamaged || 0);

      // TODO
      this.frameEnemiesKilled = 0;
      this.frameCoreDamaged = 0;

      // TODO
      if (this.bossManager.isBreachReady && !this.breachReadyShown) {
        this.breachReadyShown = true;
        if (this.onBreachReady) {
          this.onBreachReady();
        }
      }
    }

    // TODO
    const lerpSpeed = 3.0; // TODO
    const sv = this.shieldVisual;
    sv.alpha += (sv.targetAlpha - sv.alpha) * lerpSpeed * dt;
    sv.dashGap += (sv.targetDashGap - sv.dashGap) * lerpSpeed * dt;
    sv.lineWidth += (sv.targetLineWidth - sv.lineWidth) * lerpSpeed * dt;
    sv.fillAlpha += (sv.targetFillAlpha - sv.fillAlpha) * lerpSpeed * dt;
    sv.rotationSpeed +=
      (sv.targetRotationSpeed - sv.rotationSpeed) * lerpSpeed * dt;

    // TODO
    sv.rotation += sv.rotationSpeed * dt;

    // TODO

    // TODO
    if (this.isReinforcementMode && !this.reinforcementComplete) {
      this.pageTimer += dt;
      if (this.pageTimer >= this.pageDuration) {
        if (this.reinforcementPage < this.reinforcementMaxPages) {
          this.reinforcementPage++;
          this.pageTimer = 0;

          // TODO
          // TODO
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
          // TODO
          this.reinforcementComplete = true;
          debugLog("Defense", "Reinforcement Complete!");
        }
      }
    }
    // TODO
    else if (!this.isSafeZone && !this.isConquered && this.currentPage <= (this.maxPages || 12)) {
      const maxPages = this.maxPages || 12;
      const diffScale = this.stageDifficultyScale || 1.0;

      const prevSecond = Math.floor(this.pageTimer);
      this.pageTimer += dt;
      const currSecond = Math.floor(this.pageTimer);

      // TODO
      if (currSecond !== prevSecond) {
        this.updateWaveDisplay();
      }

      if (this.pageTimer >= this.pageDuration) {
        if (this.currentPage < maxPages || this.isFarmingZone) {
          // TODO
          this.currentPage++;
          this.pageTimer = 0;
          // TODO
          // TODO
          if (!this.isFarmingZone) {
            this.spawnRate = Math.max(
              0.13 * this.pageSpawnScale,
              (0.4 - this.currentPage * 0.04 * diffScale) * this.pageSpawnScale
            );
          }
          this.updateWaveDisplay();
        } else if (!this.conquerReady && !this.isFarmingZone) {
          // TODO
          this.conquerReady = true;

          // TODO
          if (this.onPageUpdate) {
            this.onPageUpdate("??READY", "#ff3333");
          }

          // TODO
          if (this.onConquerReady) {
            this.onConquerReady();
          }
        }
      }
    }
    // TODO
    else if (this.isFarmingZone && !this.isConquered) {
      const prevSecond = Math.floor(this.pageTimer);
      this.pageTimer += dt;
      const currSecond = Math.floor(this.pageTimer);

      // TODO
      if (currSecond !== prevSecond) {
        this.updateWaveDisplay();
      }

      if (this.pageTimer >= this.pageDuration) {
        this.currentPage++;
        this.pageTimer = 0;
        this.updateWaveDisplay();
      }
    }

    // TODO
    this.applySynergyEffects(dt);

    // TODO
    this.updateCollectorViruses(dt);

    // TODO
    this.updateSpeechBubbles();

    // TODO
    if (this.isSafeZone) {
      // TODO
      if (Math.random() < 0.008) {
        const randomAlly = this.alliedViruses[Math.floor(Math.random() * this.alliedViruses.length)];
        if (randomAlly) {
          // TODO
          const category = Math.random() < 0.7 ? 'safeChat' : 'safeSolo';
          this.tryVirusSpeech(randomAlly, category, 1.0);
        }
      }
    } else {
      // TODO
      if (Math.random() < 0.00005) { // TODO
        const randomAlly = this.alliedViruses[Math.floor(Math.random() * this.alliedViruses.length)];
        if (randomAlly) {
          this.tryVirusSpeech(randomAlly, 'idle', 1.0);
        }
      }
    }

    // TODO
    if (this.miningManager) {
      this.miningManager.update(
        dt, this.core, this.canvas, this.isSafeZone,
        (x, y, color, count) => this.createExplosion(x, y, color, count),
        this.isConquered
      );
      this.miningManager.resolveCabinetCollisions(this.alliedViruses, 3);
    }

    // TODO
    for (let idx = this.alliedViruses.length - 1; idx >= 0; idx--) {
      const v = this.alliedViruses[idx];

      // TODO
      if (v.hp <= 0) {
        this.handleAllyDeath(v, idx);
        continue;
      }

      // TODO
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
          this.updateMeleeAlly(v, dt); // TODO
      }
    }

    // TODO
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

    // TODO
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // TODO
      let targetX = this.core.x;
      let targetY = this.core.y;

      // TODO
      if (enemy.tauntedBy) {
        const taunter = this.alliedViruses.find(
          (v) => v === enemy.tauntedBy && v.hp > 0
        );
        if (taunter) {
          targetX = taunter.x;
          targetY = taunter.y;
        } else {
          enemy.tauntedBy = null; // TODO
        }
      } else {
        // TODO
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

      // TODO
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const distToTarget = Math.hypot(dx, dy);

      // TODO
      const distToCore = Math.hypot(
        this.core.x - enemy.x,
        this.core.y - enemy.y
      );

      // TODO
      if (
        this.core.shieldActive &&
        distToCore < this.core.shieldRadius + enemy.radius
      ) {
        // TODO
        this.core.shieldHp -= 10; // TODO
        this.chargeStaticOnHit(); // TODO
        this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);
        this.enemies.splice(i, 1);

        // TODO
        if (this.core.shieldHp <= 0) {
          this.core.shieldHp = 0;
          this.core.shieldActive = false;
          this.core.shieldState = "BROKEN";
          this.core.shieldTimer = 5.0; // TODO
          this.updateShieldBtnUI("BROKEN", "#555");
          this.createExplosion(this.core.x, this.core.y, "#00f0ff", 30); // TODO
          this.updateShieldBtnUI("ACTIVE", "#fff");
        }
        continue;
      }

      // TODO
      if (distToCore < this.core.radius + enemy.radius) {
        // TODO
        if (!this.isGodMode) {
          this.core.hp -= enemy.damage;
          this.chargeStaticOnHit(); // TODO

          // TODO
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

      // TODO
      if (enemy.knockbackVx || enemy.knockbackVy) {
        enemy.x += (enemy.knockbackVx || 0) * dt;
        enemy.y += (enemy.knockbackVy || 0) * dt;

        // TODO
        const friction = Math.pow(0.05, dt); // TODO
        enemy.knockbackVx = (enemy.knockbackVx || 0) * friction;
        enemy.knockbackVy = (enemy.knockbackVy || 0) * friction;

        // TODO
        if (
          Math.abs(enemy.knockbackVx) < 1 &&
          Math.abs(enemy.knockbackVy) < 1
        ) {
          enemy.knockbackVx = 0;
          enemy.knockbackVy = 0;
        }
      }

      // TODO
      if (distToTarget > 0) {
        const slowMult = enemy.slowMultiplier || 1;
        enemy.x += (dx / distToTarget) * enemy.speed * slowMult * dt;
        enemy.y += (dy / distToTarget) * enemy.speed * slowMult * dt;
      }
    }

    // TODO
    this.separateAllViruses();

    // TODO
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
      // TODO
      const dx = nearestEnemy.x - this.core.x;
      const dy = nearestEnemy.y - this.core.y;
      this.turret.angle = Math.atan2(dy, dx);
      // TODO
    } else {
      // TODO
      this.turret.angle += dt * this.idleTurretSpeed;
      this.idleTurretAngle = this.turret.angle; // TODO
    }

    // TODO
    this.updateHelper(dt, now);

    // TODO
    this.updateReload(dt);

    // TODO
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

          // TODO
          if (p.target.hp <= 0) {
            const idx = this.enemies.indexOf(p.target);
            if (idx > -1) {
              this.enemies.splice(idx, 1);
              this.createExplosion(p.target.x, p.target.y, "#00ff00", 15);

              // TODO
              const gain = 10;
              this.currentData += gain;
              this.updateResourceDisplay(this.currentData);
              if (this.onResourceGained) this.onResourceGained(gain);
            }
          }
        }
      } else {
        // TODO
        // TODO
        if (p.vx !== undefined && p.vy !== undefined) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          p.x += Math.cos(p.angle) * p.speed * dt;
          p.y += Math.sin(p.angle) * p.speed * dt;
        }

        // TODO
        let hitEnemy = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dx = enemy.x - p.x;
          const dy = enemy.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p.radius + enemy.radius) {
            // TODO
            enemy.hp -= p.damage;
            this.createExplosion(p.x, p.y, p.color || "#00ff00", 5);

            // TODO
            if (p.explosive && p.explosionRadius > 0) {
              this.handleExplosion(
                p.x,
                p.y,
                p.explosionRadius,
                p.damage * 0.5,
                p.color
              );
            }

            // TODO
            if (enemy.hp <= 0) {
              this.enemies.splice(j, 1);
              this.createExplosion(enemy.x, enemy.y, p.color || "#00ff00", 15);

              const gain = 10;
              this.currentData += gain;
              this.updateResourceDisplay(this.currentData);
              if (this.onResourceGained) this.onResourceGained(gain);
              this.chargeStaticOnKill(); // TODO

              // TODO
              const shooter = this.alliedViruses.find(v => v.virusType === 'HUNTER');
              if (shooter) this.tryVirusSpeech(shooter, 'kill', 0.15);
            }

            hitEnemy = true;

            // TODO
            if (!p.piercing) {
              this.projectiles.splice(i, 1);
              break;
            }
            // TODO
            if (!p.piercedEnemies) p.piercedEnemies = [];
            if (!p.piercedEnemies.includes(enemy)) {
              p.piercedEnemies.push(enemy);
            }
          }
        }
      }
    }

    // TODO
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;

      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // TODO
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      wave.radius += wave.speed * dt;
      wave.alpha = Math.max(0, 0.8 * (1 - wave.radius / wave.maxRadius));
      wave.lineWidth = Math.max(1, 6 * (1 - wave.radius / wave.maxRadius));

      if (wave.radius >= wave.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // TODO
    const nowMs = performance.now();
    this.enemies.forEach((enemy) => {
      if (enemy.slowEndTime && nowMs >= enemy.slowEndTime) {
        enemy.slowMultiplier = 1;
        enemy.slowEndTime = null;
      }
    });

    // TODO
    this.updateStaticSystem(dt);
  }

  /**
   * ????????
   */
  updateStaticSystem(dt) {
    const ss = this.staticSystem;

    // TODO
    ss.currentCharge += ss.chargeRate * dt;

    // TODO
    if (ss.currentCharge > ss.maxCharge) {
      ss.currentCharge = ss.maxCharge;
    }

    // TODO
    if (ss.currentCharge >= ss.maxCharge && this.enemies.length > 0) {
      this.dischargeStatic();
    }

    // TODO
    for (let i = this.staticEffects.sparks.length - 1; i >= 0; i--) {
      const spark = this.staticEffects.sparks[i];
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.alpha = spark.life / spark.maxLife;
      if (spark.life <= 0) this.staticEffects.sparks.splice(i, 1);
    }

    // TODO
    for (let i = this.staticEffects.chains.length - 1; i >= 0; i--) {
      const chain = this.staticEffects.chains[i];
      chain.life -= dt;
      chain.alpha = chain.life / chain.maxLife;
      if (chain.life <= 0) this.staticEffects.chains.splice(i, 1);
    }

    // TODO
    if (ss.currentCharge > ss.maxCharge * 0.5 && Math.random() < 0.1) {
      this.createStaticSpark();
    }
  }

  /**
   * ??? ( ??)
   */
  dischargeStatic() {
    const ss = this.staticSystem;
    ss.currentCharge = 0;
    ss.lastDischargeTime = performance.now();

    if (this.enemies.length === 0) return;

    // TODO
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

    // TODO
    const hitEnemies = [nearestEnemy];
    let currentTarget = nearestEnemy;
    let prevX = this.core.x;
    let prevY = this.core.y;

    // TODO
    this.addChainLine(prevX, prevY, currentTarget.x, currentTarget.y);
    currentTarget.hp -= ss.damage;
    this.createExplosion(currentTarget.x, currentTarget.y, "#ffff00", 8);

    // TODO
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

    // TODO
    for (let i = 1; i < ss.chainCount; i++) {
      let nextTarget = null;
      let nextMinDist = Infinity;

      // TODO
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

      if (!nextTarget) break; // TODO

      // TODO
      this.addChainLine(
        currentTarget.x,
        currentTarget.y,
        nextTarget.x,
        nextTarget.y
      );

      // TODO
      nextTarget.hp -= ss.damage;
      this.createExplosion(nextTarget.x, nextTarget.y, "#ffff00", 6);

      // TODO
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

  /**
   * ? ?
   */
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

  /**
   * ???????
   */
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

  /**
   * ? ????? (/? ? ???)
   */
  chargeStaticOnHit() {
    this.staticSystem.currentCharge += this.staticSystem.hitChargeAmount;
  }

  /**
   * ?????
   */
  chargeStaticOnKill() {
    this.staticSystem.currentCharge += this.staticSystem.killChargeAmount;
  }

  updateWaveDisplay() {
    const maxPages = this.maxPages || 12;
    let text = "";
    let color = "#00ff00";

    if (this.isConquered) {
      // TODO
      text = "? ?";
      color = "#00ff00";
      this.playBGMTrack('SAFE_ZONE'); // TODO
    } else if (this.isReinforcementMode) {
      // TODO
      text = `? ${this.reinforcementPage}/${this.reinforcementMaxPages}`;
      color = "#ff3333";
      this.playBGMTrack('FINAL');
      this.bgmManager.updateTempo(this.reinforcementPage, this.reinforcementMaxPages);
    } else if (this.isSafeZone) {
      text = "SAFE ZONE";
      color = "#00ff00";
      this.playBGMTrack('SAFE_ZONE');
    } else if (this.currentPage > maxPages) {
      // TODO
      text = "??READY";
      color = "#ff3333";
      this.playBGMTrack('FINAL');
      this.bgmManager.updateTempo(maxPages, maxPages);
    } else if (this.isFarmingZone) {
      // TODO
      const remainingTime = Math.ceil(this.pageDuration - this.pageTimer);
      text = `PAGE: ${this.currentPage} (${remainingTime}s)`;
      color = "#ffaa00";
      this.playBGMTrack('DEFENSE');
      this.bgmManager.updateTempo(this.currentPage, 99); // TODO
    } else {
      // TODO
      const remainingTime = Math.ceil(this.pageDuration - this.pageTimer);
      text = `PAGE: ${this.currentPage}/${maxPages} (${remainingTime}s)`;
      color = "#00f0ff";

      // TODO
      if (this.currentPage >= 10) {
        this.playBGMTrack('FINAL');
      } else {
        this.playBGMTrack('DEFENSE');
      }
      this.bgmManager.updateTempo(this.currentPage, maxPages);
    }

    // TODO
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
        this.onPageUpdate("??READY", "#ff3333");
      }
      if (this.onConquerReady) {
        this.onConquerReady();
      }
    }
  }

  // TODO
  startReinforcementMode(maxPages = 3) {
    this.isReinforcementMode = true;
    this.reinforcementPage = 1;
    this.reinforcementMaxPages = maxPages;
    this.reinforcementComplete = false;
    this.pageTimer = 0;
    this.spawnRate = 0.17 * this.pageSpawnScale; // TODO
    this.updateWaveDisplay();
    debugLog(
      "Defense",
      "Reinforcement Mode Started:",
      maxPages,
      "pages, SpawnRate:",
      this.spawnRate
    );
  }

  // TODO
  resetToNormalMode() {
    this.isReinforcementMode = false;
    this.reinforcementPage = 0;
    this.reinforcementComplete = false;
    this.currentPage = 1;
    this.pageTimer = 0;
    this.spawnRate = 0.4 * this.pageSpawnScale; // TODO

    // TODO
    this.core.shieldRadius = 70;
    this.core.shieldState = "OFF";
    this.core.shieldHp = this.core.shieldMaxHp;
    this.shieldBtn.style.pointerEvents = "auto";

    this.updateWaveDisplay();
    debugLog("Defense", "Reset to Normal Mode");
  }

  // TODO
  setConqueredState(conquered) {
    debugLog(
      "DefenseGame",
      "setConqueredState ??? conquered:",
      conquered,
      "? isConquered:",
      this.isConquered
    );
    this.isConquered = conquered;
    if (conquered) {
      // TODO
      this.conqueredStartTime = Date.now() / 1000;
      this.lastRotationStep = -1; // TODO
      debugLog(
        "DefenseGame",
        "? ? ??? conqueredStartTime:",
        this.conqueredStartTime
      );

      // TODO
      this.emitConquestWave();

      // TODO
      this.spawnRate = 9999; // TODO
      this.core.shieldActive = false;
      this.shieldBtn.style.display = "none"; // TODO

      // TODO
      this.spawnConqueredAllies(10);
    } else {
      debugLog("Conquest", "? ? ?");
      this.conqueredStartTime = null; // TODO
      this.conqueredDebugFrame = 0; // TODO
      this.lastRotationStep = -1;
    }
    this.updateWaveDisplay();
  }

  // TODO
  emitConquestWave() {
    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 0,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
      speed: 600, // TODO
      alpha: 1.0,
      color: "#00ff00", // TODO
      lineWidth: 10,
      damageDealt: false,
    });

    // TODO
    this.enemies.forEach((enemy) => {
      this.applyKnockback(enemy, 400, 0.3, 3); // TODO
    });
  }

  // TODO
  applyKnockback(enemy, speed, slowMult = 1, slowDuration = 0) {
    const dx = enemy.x - this.core.x;
    const dy = enemy.y - this.core.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // TODO
    enemy.knockbackVx = (enemy.knockbackVx || 0) + (dx / dist) * speed;
    enemy.knockbackVy = (enemy.knockbackVy || 0) + (dy / dist) * speed;

    // TODO
    if (slowMult < 1 && slowDuration > 0) {
      enemy.slowMultiplier = slowMult;
      enemy.slowTimer = slowDuration;
    }
  }

  // TODO
  emitRotationWave(type) {
    let color, lineWidth;

    if (type === "green") {
      color = "rgba(0, 255, 100, 0.8)"; // TODO
      lineWidth = 4;
    } else if (type === "blue") {
      color = "rgba(0, 200, 255, 0.8)"; // TODO
      lineWidth = 4;
    } else {
      // TODO
      color = "rgba(0, 255, 200, 0.9)";
      lineWidth = 6;
    }

    // TODO
    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 0,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.2,
      speed: 400,
      alpha: 0.7,
      color: color,
      lineWidth: lineWidth,
      damageDealt: false,
    });

    // TODO
    this.enemies.forEach((enemy) => {
      if (type === "mixed") {
        // TODO
        this.applyKnockback(enemy, 200);
        enemy.hp -= 15; // TODO
      } else {
        // TODO
        this.applyKnockback(enemy, 250, 0.5, 2);
      }
    });
  }

  // TODO
  spawnConqueredAllies(count) {
    this.alliedViruses = [];
    for (let i = 0; i < count; i++) {
      const angle = ((Math.PI * 2) / count) * i;
      const distance = 90 + Math.random() * 30; // TODO
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

  // TODO
  respawnOneAlly(deadAlly = null) {
    // TODO
    if (this.alliedConfig) {
      this.respawnAllyWithConfig(deadAlly);
      return;
    }

    // TODO
    const targetCount = this.isConquered ? 10 : this.alliedInfo.count || 0;

    debugLog(
      "DefenseGame",
      "respawnOneAlly ??? isConquered:",
      this.isConquered,
      "targetCount:",
      targetCount,
      "? ? ??",
      this.alliedViruses.length
    );

    if (targetCount <= 0) {
      debugLog("AllyMovement", "targetCount 0?????");
      return;
    }

    if (this.alliedViruses.length >= targetCount) {
      debugLog("AllyMovement", "??  ???, ??");
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
      "? ? ???, ? ? ??",
      this.alliedViruses.length
    );

    this.createExplosion(newAlly.x, newAlly.y, "#00aaff", 5);
  }

  // TODO
  respawnAllyWithConfig(deadAlly) {
    const config = this.alliedConfig;
    if (!config) return;

    const targetCount = config.mainCount + config.subCount;
    if (this.alliedViruses.length >= targetCount) return;

    // TODO
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

    // TODO
    this.tryVirusSpeech(newAlly, 'spawn', 0.5);

    debugLog(
      "DefenseGame",
      `?? ${typeName}, ? ? ?? ${this.alliedViruses.length}`
    );
  }

  // TODO
  handleAllyDeath(v, idx) {
    debugLog("AllyMovement", `? ? ?: ${v.virusType}`);

    // TODO
    if (v.special === "explodeOnDeath" && v.explosionDamage > 0) {
      this.handleExplosion(
        v.x,
        v.y,
        v.explosionRadius,
        v.explosionDamage,
        v.color
      );
    }

    // TODO
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

    // TODO
    if (this.alliedConfig?.synergy?.effect === "hunterSwarmSpawn" && v.virusType === "HUNTER") {
      this.spawnSynergySwarm(v.x, v.y, 2);
    }

    const deadAlly = { ...v }; // TODO
    this.alliedViruses.splice(idx, 1);

    // TODO
    const respawnTime = (v.respawnTime || 2) * 1000;
    setTimeout(() => this.respawnOneAlly(deadAlly), respawnTime);
  }

  // TODO
  updateMeleeAlly(v, dt) {
    const searchRange = 350; // TODO
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    // TODO
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    // TODO
    const hasTankProtectionSynergy = this.alliedConfig?.synergy?.effect === "tankProtection";
    let anchorTank = null;

    if (hasTankProtectionSynergy && v.virusType === "SWARM") {
      // TODO
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

    // TODO
    if (v.virusType === "TANK" && v.special === "taunt") {
      v.tauntTimer = (v.tauntTimer || 0) + dt;
      const cooldown = v.tauntCooldown || 5;

      if (v.tauntTimer >= cooldown) {
        v.tauntTimer = 0;
        const tauntRadius = v.tauntRadius || 100;

        // TODO
        let tauntedCount = 0;
        for (const enemy of this.enemies) {
          const dist = Math.hypot(enemy.x - v.x, enemy.y - v.y);
          if (dist < tauntRadius) {
            enemy.tauntedBy = v; // TODO
            tauntedCount++;

            // TODO
            const pullSpeed = 150; // TODO
            const angle = Math.atan2(v.y - enemy.y, v.x - enemy.x);
            enemy.knockbackVx = (enemy.knockbackVx || 0) + Math.cos(angle) * pullSpeed;
            enemy.knockbackVy = (enemy.knockbackVy || 0) + Math.sin(angle) * pullSpeed;
          }
        }

        // TODO
        if (tauntedCount > 0) {
          this.createTauntEffect(v.x, v.y, tauntRadius, v.color);
          // TODO
          this.tryVirusSpeech(v, 'taunt', 0.8);
        }
      }
    }

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
      const collisionDist = v.radius + nearestEnemy.radius + 5;

      if (dist < collisionDist) {
        // TODO
        const damage = v.damage || 10;
        nearestEnemy.hp -= damage;

        // TODO
        this.tryVirusSpeech(v, 'battle', 0.05);

        // TODO
        if (v.virusType === "TANK" && v.knockbackForce > 0) {
          const angle = Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x);
          const knockbackSpeed = v.knockbackForce * 4; // TODO
          nearestEnemy.knockbackVx = (nearestEnemy.knockbackVx || 0) + Math.cos(angle) * knockbackSpeed;
          nearestEnemy.knockbackVy = (nearestEnemy.knockbackVy || 0) + Math.sin(angle) * knockbackSpeed;
        }

        // TODO
        let receivedDamage = damage;

        // TODO
        if (v.virusType === "TANK") {
          receivedDamage = Math.floor(damage * 0.3);
        }

        // TODO
        if (v.hasCover) {
          receivedDamage = Math.floor(receivedDamage * 0.5);
        }

        v.hp -= receivedDamage;

        // TODO
        if (receivedDamage > 0) {
          this.tryVirusSpeech(v, 'hurt', 0.1);
        }

        this.createExplosion(
          (v.x + nearestEnemy.x) / 2,
          (v.y + nearestEnemy.y) / 2,
          v.color,
          5
        );

        // TODO
        if (nearestEnemy.hp <= 0) {
          this.killEnemy(nearestEnemy);
          // TODO
          this.tryVirusSpeech(v, 'kill', 0.2);
        }
      } else {
        // TODO
        if (hasTankProtectionSynergy && anchorTank && v.virusType === "SWARM") {
          const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
          const protectionRange = 100; // TODO

          // TODO
          if (tankDist > protectionRange) {
            // TODO
            const midX = (anchorTank.x + nearestEnemy.x) / 2;
            const midY = (anchorTank.y + nearestEnemy.y) / 2;
            this.smoothMoveToward(v, midX, midY, dt, 1.0);
          } else {
            // TODO
            this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.2);
          }
        } else {
          // TODO
          this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.2);
        }
      }
    } else {
      // TODO
      if (hasTankProtectionSynergy && anchorTank && v.virusType === "SWARM") {
        // TODO
        const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
        if (tankDist > 80) {
          this.smoothMoveToward(v, anchorTank.x, anchorTank.y, dt, 0.6);
        } else {
          this.fluidPatrol(v, dt, 60); // TODO
        }
      } else {
        // TODO
        this.fluidPatrol(v, dt);
      }
    }

    // TODO
    this.keepOutsideBarrier(v);
  }

  // TODO
  updateRangedAlly(v, dt) {
    const searchRange = (v.range || 150) + 100; // TODO
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    // TODO
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    // TODO
    v.attackTimer = (v.attackTimer || 0) + dt;

    // TODO
    const hasHunterCoverSynergy = this.alliedConfig?.synergy?.effect === "hunterCover";
    let anchorTank = null;

    if (hasHunterCoverSynergy) {
      // TODO
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
        // TODO
        const fireInterval = 1 / (v.fireRate || 1);
        if (v.attackTimer >= fireInterval) {
          this.fireAllyProjectile(v, nearestEnemy);
          v.attackTimer = 0;
        }

        // TODO
        if (hasHunterCoverSynergy && anchorTank) {
          const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
          const coverRange = 80; // TODO

          if (tankDist > coverRange) {
            // TODO
            const enemyToTankAngle = Math.atan2(
              anchorTank.y - nearestEnemy.y,
              anchorTank.x - nearestEnemy.x
            );
            // TODO
            const behindX = anchorTank.x + Math.cos(enemyToTankAngle) * 40;
            const behindY = anchorTank.y + Math.sin(enemyToTankAngle) * 40;
            this.smoothMoveToward(v, behindX, behindY, dt, 1.0);
          } else {
            // TODO
            const strafeAngle = Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) + Math.PI / 2;
            const strafeX = v.x + Math.cos(strafeAngle) * 20;
            const strafeY = v.y + Math.sin(strafeAngle) * 20;
            this.smoothMoveToward(v, strafeX, strafeY, dt, 0.3);
          }
        } else {
          // TODO
          const optimalDist = 100;

          if (dist < optimalDist * 0.6) {
            // TODO
            const awayX = v.x + (v.x - nearestEnemy.x);
            const awayY = v.y + (v.y - nearestEnemy.y);
            this.smoothMoveToward(v, awayX, awayY, dt, 0.8);
          } else if (dist > optimalDist * 1.5) {
            // TODO
            this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 0.6);
          } else {
            // TODO
            const strafeAngle =
              Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) +
              Math.PI / 2;
            const strafeX = v.x + Math.cos(strafeAngle) * 30;
            const strafeY = v.y + Math.sin(strafeAngle) * 30;
            this.smoothMoveToward(v, strafeX, strafeY, dt, 0.4);
          }
        }
      } else {
        // TODO
        this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 0.8);
      }
    } else {
      // TODO
      if (hasHunterCoverSynergy && anchorTank) {
        // TODO
        const tankDist = Math.hypot(anchorTank.x - v.x, anchorTank.y - v.y);
        if (tankDist > 60) {
          this.smoothMoveToward(v, anchorTank.x, anchorTank.y, dt, 0.5);
        } else {
          this.fluidPatrol(v, dt, 40); // TODO
        }
      } else {
        // TODO
        this.fluidPatrol(v, dt);
      }
    }

    // TODO
    this.keepOutsideBarrier(v);
  }

  // TODO
  updateSuicideAlly(v, dt) {
    const searchRange = 400; // TODO
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    // TODO
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
      const explosionRange = v.radius + nearestEnemy.radius + 10;

      if (dist < explosionRange) {
        // TODO
        v.exploded = true;

        // TODO
        this.tryVirusSpeech(v, 'explode', 1.0);

        // TODO
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

        // TODO
        if (this.alliedConfig?.synergy?.effect === "chainExplosion") {
          this.triggerChainExplosion(v.x, v.y, explosionRadius);
        }

        v.hp = 0; // TODO
      } else {
        // TODO
        this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.8);

        // TODO
        v.wobblePhase += dt * 8;
        const wobble = Math.sin(v.wobblePhase) * 15;
        const perpAngle =
          Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) + Math.PI / 2;
        v.x += Math.cos(perpAngle) * wobble * dt;
        v.y += Math.sin(perpAngle) * wobble * dt;
      }
    } else {
      // TODO
      this.fluidPatrol(v, dt);
    }

    // TODO
    this.keepOutsideBarrier(v);
  }

  // TODO
  updateSupportAlly(v, dt) {
    // TODO
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    // TODO
    const healRadius = v.healRadius || 80;
    const healAmount = (v.healAmount || 5) * dt;

    // TODO
    const hasTankHealBoostSynergy = this.alliedConfig?.synergy?.effect === "tankHealBoost";
    let priorityTank = null;

    if (hasTankHealBoostSynergy) {
      // TODO
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

        // TODO
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

          // TODO
          this.tryVirusSpeech(v, 'heal', 0.1);
        }
      }
    });

    // TODO
    if (hasTankHealBoostSynergy) {
      this.alliedViruses.forEach((ally) => {
        if (ally.virusType === "TANK") {
          const dist = Math.hypot(ally.x - v.x, ally.y - v.y);
          if (dist < healRadius && ally.hp < ally.maxHp) {
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmount); // TODO
          }
        }
      });
    }

    // TODO
    if (hasTankHealBoostSynergy && priorityTank) {
      // TODO
      const tankDist = Math.hypot(priorityTank.x - v.x, priorityTank.y - v.y);
      const tankHpPercent = priorityTank.hp / priorityTank.maxHp;

      if (tankHpPercent < 0.8 || tankDist > healRadius) {
        // TODO
        this.smoothMoveToward(v, priorityTank.x, priorityTank.y, dt, 0.7);
      } else {
        // TODO
        this.fluidPatrol(v, dt, 50);
      }
    } else {
      // TODO
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
        // TODO
        this.smoothMoveToward(v, woundedAlly.x, woundedAlly.y, dt, 0.5);
      } else {
        // TODO
        this.fluidPatrol(v, dt, 75);
      }
    }

    // TODO
    this.keepOutsideBarrier(v);
  }

  // TODO
  triggerChainExplosion(x, y, triggerRadius) {
    const chainRange = triggerRadius + 30; // TODO
    const swarms = this.alliedViruses.filter(
      (v) => v.virusType === "SWARM" && v.hp > 0 && !v.chainExploded
    );

    for (const swarm of swarms) {
      const dist = Math.hypot(swarm.x - x, swarm.y - y);
      if (dist < chainRange) {
        // TODO
        swarm.chainExploded = true;
        swarm.hp = 0; // TODO

        // TODO
        this.handleExplosion(
          swarm.x,
          swarm.y,
          swarm.explosionRadius || 25,
          (swarm.explosionDamage || 5) * 2, // TODO
          swarm.color
        );
      }
    }
  }

  // TODO
  applySynergyEffects(dt) {
    if (!this.alliedConfig?.synergy) return;

    const synergy = this.alliedConfig.synergy;
    const effect = synergy.effect;

    // TODO
    const tanks = this.alliedViruses.filter(
      (v) => v.virusType === "TANK" && v.hp > 0
    );

    switch (effect) {
      case "tankProtection":
        // TODO
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

          // TODO
          if (nearTank && !v.tankProtectionBuff) {
            v.tankProtectionBuff = true;
            const hpRatio = v.hp / v.maxHp; // TODO
            v.maxHp = Math.floor(v.baseMaxHp * 1.5); // TODO
            v.hp = Math.floor(v.maxHp * hpRatio); // TODO
          } else if (!nearTank && v.tankProtectionBuff) {
            v.tankProtectionBuff = false;
            const hpRatio = v.hp / v.maxHp; // TODO
            v.maxHp = v.baseMaxHp;
            v.hp = Math.floor(v.maxHp * hpRatio); // TODO
          }
        });
        break;

      case "hunterCover":
        // TODO
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
          v.hasCover = nearTank; // TODO
        });
        break;

      // TODO
    }
  }

  // TODO
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

  // TODO
  smoothMoveToward(v, targetX, targetY, dt, speedMultiplier = 1.0) {
    const dx = targetX - v.x;
    const dy = targetY - v.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) return;

    const baseSpeed = (v.speed || 80) * speedMultiplier;
    const acceleration = baseSpeed * 3; // TODO
    const friction = 0.92; // TODO

    // TODO
    const ax = (dx / dist) * acceleration * dt;
    const ay = (dy / dist) * acceleration * dt;

    v.vx = (v.vx + ax) * friction;
    v.vy = (v.vy + ay) * friction;

    // TODO
    const currentSpeed = Math.hypot(v.vx, v.vy);
    const maxSpeed = baseSpeed * 1.5;
    if (currentSpeed > maxSpeed) {
      v.vx = (v.vx / currentSpeed) * maxSpeed;
      v.vy = (v.vy / currentSpeed) * maxSpeed;
    }

    // TODO
    v.x += v.vx * dt;
    v.y += v.vy * dt;
  }

  // TODO
  fluidPatrol(v, dt, baseRadius = 95) {
    // TODO
    if (this.isSafeZone) {
      if (!this._safeZoneLogOnce) {
        debugLog("Enemy", "fluidPatrol -> safeZoneWander (isSafeZone:", this.isSafeZone, ")");
        this._safeZoneLogOnce = true;
      }
      this.safeZoneWander(v, dt);
      return;
    }

    // TODO
    if (!v.patrolAngle) v.patrolAngle = v.angle || Math.random() * Math.PI * 2;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;
    if (!v.radiusOffset) v.radiusOffset = (Math.random() - 0.5) * 20;

    // TODO
    const baseAngularSpeed = 0.3 + Math.sin(v.wobblePhase * 0.5) * 0.15;
    v.patrolAngle += dt * baseAngularSpeed;
    v.wobblePhase += dt * 2;

    // TODO
    const wobbleRadius = Math.sin(v.wobblePhase) * 15;
    const patrolRadius = baseRadius + v.radiusOffset + wobbleRadius;

    // TODO
    const targetX = this.core.x + Math.cos(v.patrolAngle) * patrolRadius;
    const targetY = this.core.y + Math.sin(v.patrolAngle) * patrolRadius;

    // TODO
    this.smoothMoveToward(v, targetX, targetY, dt, 0.4);

    // TODO
    v.x += (Math.random() - 0.5) * 0.5;
    v.y += (Math.random() - 0.5) * 0.5;
  }

  // TODO
  safeZoneWander(v, dt) {
    const screenW = this.canvas.width;
    const screenH = this.canvas.height;
    const margin = 40;

    // TODO
    const barrierRadius = (this.core.shieldRadius || 70) + 20;

    // TODO
    if (!v.homeX) {
      // TODO
      let homeX, homeY, distFromCore;
      do {
        homeX = margin + Math.random() * (screenW - margin * 2);
        homeY = margin + Math.random() * (screenH - margin * 2);
        distFromCore = Math.hypot(homeX - this.core.x, homeY - this.core.y);
      } while (distFromCore < barrierRadius); // TODO

      v.homeX = homeX;
      v.homeY = homeY;
      v.homeRadius = 60 + Math.random() * 80; // TODO
    }

    // TODO
    const getNearHomePos = () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * v.homeRadius;
      let x = v.homeX + Math.cos(angle) * dist;
      let y = v.homeY + Math.sin(angle) * dist;
      // TODO
      x = Math.max(margin, Math.min(screenW - margin, x));
      y = Math.max(margin, Math.min(screenH - margin, y));
      return { x, y };
    };

    // TODO
    if (v.safeState === undefined) {
      v.safeState = 'wander';
      v.stateTimer = 0;
      v.stateDuration = 3 + Math.random() * 4;
      v.chatPartner = null;
      v.chatOffsetAngle = Math.random() * Math.PI * 2;

      // TODO
      const pos = getNearHomePos();
      v.wanderTargetX = pos.x;
      v.wanderTargetY = pos.y;
    }

    v.stateTimer += dt;

    // TODO
    switch (v.safeState) {
      case 'wander':
        // TODO
        if (v.stateTimer >= v.stateDuration) {
          v.stateTimer = 0;

          const roll = Math.random();

          if (roll < 0.5 && this.alliedViruses.length > 1) {
            // TODO
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
              // TODO
              const pos = getNearHomePos();
              v.wanderTargetX = pos.x;
              v.wanderTargetY = pos.y;
              v.stateDuration = 3 + Math.random() * 3;
            }
          } else if (roll < 0.65) {
            // TODO
            const farFriends = this.alliedViruses.filter(a =>
              a !== v &&
              Math.hypot(a.homeX - v.homeX, a.homeY - v.homeY) > 150
            );

            if (farFriends.length > 0) {
              v.chatPartner = farFriends[Math.floor(Math.random() * farFriends.length)];
              v.safeState = 'approaching';
              v.stateDuration = 6 + Math.random() * 4; // TODO
            }
          } else {
            // TODO
            const pos = getNearHomePos();
            v.wanderTargetX = pos.x;
            v.wanderTargetY = pos.y;
            v.stateDuration = 2 + Math.random() * 4;
          }
        }

        // TODO
        this.smoothMoveToward(v, v.wanderTargetX, v.wanderTargetY, dt, 0.25);
        break;

      case 'approaching':
        // TODO
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }

        const distToPartner = Math.hypot(v.chatPartner.x - v.x, v.chatPartner.y - v.y);

        if (distToPartner < 25) {
          // TODO
          v.safeState = 'chatting';
          v.stateTimer = 0;
          v.stateDuration = 4 + Math.random() * 6; // TODO
          v.chatOffsetAngle = Math.atan2(v.y - v.chatPartner.y, v.x - v.chatPartner.x);
        } else if (v.stateTimer >= v.stateDuration) {
          // TODO
          v.safeState = 'wander';
          v.chatPartner = null;
        } else {
          // TODO
          this.smoothMoveToward(v, v.chatPartner.x, v.chatPartner.y, dt, 0.5);
        }
        break;

      case 'chatting':
        // TODO
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }

        if (v.stateTimer >= v.stateDuration) {
          // TODO
          if (Math.random() < 0.6) {
            v.safeState = 'walkingTogether';
            v.stateTimer = 0;
            v.stateDuration = 4 + Math.random() * 4; // TODO

            // TODO
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
          // TODO
          const stickDist = 18;
          const targetX = v.chatPartner.x + Math.cos(v.chatOffsetAngle) * stickDist;
          const targetY = v.chatPartner.y + Math.sin(v.chatOffsetAngle) * stickDist;

          v.x += (targetX - v.x) * 0.1;
          v.y += (targetY - v.y) * 0.1;

          // TODO
          v.x += (Math.random() - 0.5) * 0.3;
          v.y += (Math.random() - 0.5) * 0.3;
        }
        break;

      case 'walkingTogether':
        // TODO
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }

        if (v.stateTimer >= v.stateDuration) {
          v.safeState = 'wander';
          v.chatPartner = null;
        } else {
          // TODO
          this.smoothMoveToward(v, v.wanderTargetX, v.wanderTargetY, dt, 0.25);

          // TODO
          if (v.chatPartner.safeState === 'chatting' || v.chatPartner.safeState === 'walkingTogether') {
            v.chatPartner.wanderTargetX = v.wanderTargetX + (Math.random() - 0.5) * 30;
            v.chatPartner.wanderTargetY = v.wanderTargetY + (Math.random() - 0.5) * 30;
          }

          // TODO
          const distToPartner2 = Math.hypot(v.chatPartner.x - v.x, v.chatPartner.y - v.y);
          if (distToPartner2 > 40) {
            // TODO
            const pullX = (v.chatPartner.x - v.x) * 0.02;
            const pullY = (v.chatPartner.y - v.y) * 0.02;
            v.x += pullX;
            v.y += pullY;
          }
        }
        break;
    }

    // TODO
    const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
    const pushStartDist = 100; // TODO

    if (distFromCore < pushStartDist && distFromCore > 0) {
      const pushStrength = (1 - distFromCore / pushStartDist) * 2.0; // TODO
      const pushAngle = Math.atan2(v.y - this.core.y, v.x - this.core.x);

      // TODO
      v.x += Math.cos(pushAngle) * pushStrength;
      v.y += Math.sin(pushAngle) * pushStrength;
    }

    // TODO
    v.x = Math.max(margin, Math.min(screenW - margin, v.x));
    v.y = Math.max(margin, Math.min(screenH - margin, v.y));
    v.wanderTargetX = Math.max(margin, Math.min(screenW - margin, v.wanderTargetX || v.x));
    v.wanderTargetY = Math.max(margin, Math.min(screenH - margin, v.wanderTargetY || v.y));
  }

  // TODO
  keepOutsideBarrier(v) {
    // TODO
    if (!this._debugLogTimer) this._debugLogTimer = 0;
    this._debugLogTimer += 0.016; // TODO
    const shouldLog = this._debugLogTimer > 1 && v === this.alliedViruses[0]; // TODO
    if (shouldLog) this._debugLogTimer = 0;

    // TODO
    if (this.isSafeZone) {
      // TODO
      const barrierRadius = this.core.shieldRadius || 70;
      const minDistance = barrierRadius + v.radius + 5;
      const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);

      if (shouldLog) {
        const margin = 30;
        debugLog("AllyMovement", `[Safe Zone]
  ? ?: ${this.canvas.width} x ${this.canvas.height}
  ? : (${Math.round(this.core.x)}, ${Math.round(this.core.y)})
  ? ????: X(${margin} ~ ${this.canvas.width - margin}), Y(${margin} ~ ${this.canvas.height - margin})
  ?    ?: ${Math.round(minDistance)}px ?
  ? ? ?: (${Math.round(v.x)}, ${Math.round(v.y)}) / : ${Math.round(distFromCore)}px`);
      }

      if (distFromCore < minDistance) {
        const angle = Math.atan2(v.y - this.core.y, v.x - this.core.x);
        v.x = this.core.x + Math.cos(angle) * minDistance;
        v.y = this.core.y + Math.sin(angle) * minDistance;
      }
      return; // TODO
    }

    const barrierRadius = this.core.shieldRadius || 70;
    const minDistance = barrierRadius + v.radius + 5;
    const margin = 30; // TODO

    // TODO
    const minX = margin;
    const maxX = this.canvas.width - margin;
    const minY = margin;
    const maxY = this.canvas.height - margin;

    const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
    const angle = Math.atan2(v.y - this.core.y, v.x - this.core.x);

    if (shouldLog) {
      debugLog("AllyMovement", `[Battle]
  ? ?: ${this.canvas.width} x ${this.canvas.height}
  ? : (${Math.round(this.core.x)}, ${Math.round(this.core.y)})
  ? ????: X(${minX} ~ ${maxX}), Y(${minY} ~ ${maxY})
  ?    ?: ${Math.round(minDistance)}px ?
  ? ? ?: (${Math.round(v.x)}, ${Math.round(v.y)}) / : ${Math.round(distFromCore)}px`);
    }

    // TODO
    if (distFromCore < minDistance) {
      v.x = this.core.x + Math.cos(angle) * minDistance;
      v.y = this.core.y + Math.sin(angle) * minDistance;

      // TODO
      if (v.vx !== undefined) {
        const dot = v.vx * Math.cos(angle) + v.vy * Math.sin(angle);
        if (dot < 0) {
          v.vx -= 2 * dot * Math.cos(angle);
          v.vy -= 2 * dot * Math.sin(angle);
        }
      }
    }

    // TODO
    let wasOutside = false;
    if (v.x < minX) { v.x = minX; wasOutside = true; }
    if (v.x > maxX) { v.x = maxX; wasOutside = true; }
    if (v.y < minY) { v.y = minY; wasOutside = true; }
    if (v.y > maxY) { v.y = maxY; wasOutside = true; }

    // TODO
    if (wasOutside && v.vx !== undefined) {
      v.vx *= 0.5;
      v.vy *= 0.5;
    }
  }

  // TODO
  moveTowardTarget(v, target, dt) {
    this.smoothMoveToward(v, target.x, target.y, dt, 1.0);
  }

  // TODO
  patrolAlly(v, dt) {
    this.fluidPatrol(v, dt);
  }

  // TODO
  separateAllViruses() {
    const allEntities = [];

    // TODO
    this.alliedViruses.forEach(v => {
      allEntities.push({ entity: v, type: 'ally' });
    });

    // TODO
    this.enemies.forEach(e => {
      allEntities.push({ entity: e, type: 'enemy' });
    });

    // TODO
    this.collectorViruses.forEach(c => {
      allEntities.push({ entity: c, type: 'collector' });
    });

    // TODO
    for (let i = 0; i < allEntities.length; i++) {
      for (let j = i + 1; j < allEntities.length; j++) {
        const a = allEntities[i].entity;
        const b = allEntities[j].entity;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = (a.radius || 8) + (b.radius || 8) + 2; // TODO

        if (dist < minDist && dist > 0) {
          // TODO
          const overlap = minDist - dist;
          const pushX = (dx / dist) * overlap * 0.5;
          const pushY = (dy / dist) * overlap * 0.5;

          // TODO
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

      // TODO
      if (this.onEnemyKilled) {
        this.onEnemyKilled(enemy.x, enemy.y);
      }

      // TODO
      if (this.isBossFight) {
        this.frameEnemiesKilled++;
      }

      // TODO
      const effects = this.getItemEffects();
      if (effects.lifesteal > 0 && this.core.shieldHp < this.core.shieldMaxHp) {
        this.core.shieldHp = Math.min(this.core.shieldMaxHp, this.core.shieldHp + effects.lifesteal);
      }
    }
  }

  // TODO
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
      fromAlly: true, // TODO
      lifetime: 2,
      age: 0,
    });

    // TODO
    this.createExplosion(v.x, v.y, v.color, 3);
  }

  // TODO
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

  // TODO
  renderConqueredVisuals() {
    const ctx = this.ctx;
    const x = this.core.x;
    const y = this.core.y;
    const size = 80; // TODO

    // TODO
    if (!this.conqueredStartTime) {
      this.conqueredStartTime = Date.now() / 1000;
      debugLog(
        "ConqueredVisuals",
        "conqueredStartTime ??",
        this.conqueredStartTime
      );
    }
    const elapsed = Date.now() / 1000 - this.conqueredStartTime;

    // TODO
    const ROTATION_TIME = 0.8; // TODO
    const PAUSE_TIME = 0.5; // TODO
    const CYCLE_DURATION = ROTATION_TIME * 3 + PAUSE_TIME * 3; // TODO

    const cycleTime = elapsed % CYCLE_DURATION;
    const fullCycles = Math.floor(elapsed / CYCLE_DURATION); // TODO
    // TODO
    // TODO
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    let targetAngle;
    let currentStep = 0; // TODO

    if (cycleTime < ROTATION_TIME) {
      // TODO
      const progress = easeInOut(cycleTime / ROTATION_TIME);
      targetAngle = progress * (Math.PI / 2);
      currentStep = 0;
    } else if (cycleTime < ROTATION_TIME + PAUSE_TIME) {
      // TODO
      targetAngle = Math.PI / 2;
      currentStep = 1;
    } else if (cycleTime < ROTATION_TIME * 2 + PAUSE_TIME) {
      // TODO
      const localTime = cycleTime - (ROTATION_TIME + PAUSE_TIME);
      const progress = easeInOut(localTime / ROTATION_TIME);
      targetAngle = Math.PI / 2 + progress * (Math.PI / 2);
      currentStep = 2;
    } else if (cycleTime < ROTATION_TIME * 2 + PAUSE_TIME * 2) {
      // TODO
      targetAngle = Math.PI;
      currentStep = 3;
    } else if (cycleTime < ROTATION_TIME * 3 + PAUSE_TIME * 2) {
      // TODO
      const localTime = cycleTime - (ROTATION_TIME * 2 + PAUSE_TIME * 2);
      const progress = easeInOut(localTime / ROTATION_TIME);
      targetAngle = Math.PI + progress * Math.PI;
      currentStep = 4;
    } else {
      // TODO
      targetAngle = Math.PI * 2;
      currentStep = 5;
    }

    // TODO
    const globalStep = fullCycles * 6 + currentStep;
    if (
      this.lastRotationStep !== undefined &&
      this.lastRotationStep !== globalStep
    ) {
      // TODO
      if (currentStep === 1) {
        // TODO
        this.emitRotationWave("green");
      } else if (currentStep === 3) {
        // TODO
        this.emitRotationWave("blue");
      } else if (currentStep === 5) {
        // TODO
        this.emitRotationWave("mixed");
      }
    }
    this.lastRotationStep = globalStep;

    // TODO
    const baseAngle = fullCycles * Math.PI * 2;
    const rotationAngle = baseAngle + targetAngle;

    // TODO
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

    // TODO
    ctx.save();
    ctx.translate(x, y);

    // TODO
    ctx.save();
    ctx.rotate(rotationAngle);
    ctx.strokeStyle = `rgba(0, 255, 100, 0.6)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    // TODO
    ctx.save();
    const reverseAngle = Math.PI / 4 - rotationAngle; // TODO
    ctx.rotate(reverseAngle);
    ctx.strokeStyle = `rgba(0, 200, 255, 0.6)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    // TODO
    if (this.conqueredDebugFrame % 60 === 0) {
      debugLog(
        "ConqueredVisuals",
        `??? ?: ${((rotationAngle * 180) / Math.PI).toFixed(1)}, ` +
        `??? ?: ${((reverseAngle * 180) / Math.PI).toFixed(1)}`
      );
    }

    ctx.restore();

    // TODO
    ctx.save();
    ctx.translate(x, y - 25);

    // TODO
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -40);
    ctx.stroke();

    // TODO
    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(20 + Math.sin(elapsed * 3) * 3, -35);
    ctx.lineTo(20 + Math.sin(elapsed * 3 + 1) * 3, -25);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();

    // TODO
    ctx.strokeStyle = "#00aa00";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // TODO

  /**
   * ?????? (GameManager? ?)
   */
  spawnDroppedItem(x, y, item) {
    this.droppedItems.push({
      x,
      y,
      item,
      spawnTime: performance.now(),
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2
    });

    // TODO
    this.spawnCollectorVirus(x, y);
  }

  /**
   * ? ? ? ?
   */
  spawnCollectorVirus(targetX, targetY) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 30;

    this.collectorViruses.push({
      x: this.core.x + Math.cos(angle) * spawnDist,
      y: this.core.y + Math.sin(angle) * spawnDist,
      vx: 0, // TODO
      vy: 0,
      targetX,
      targetY,
      speed: 120, // TODO
      state: "toItem", // TODO
      carriedItem: null,
      spawnTime: performance.now(),
      wobblePhase: Math.random() * Math.PI * 2, // TODO
      wobbleSpeed: 5 + Math.random() * 3, // TODO
      pathOffset: (Math.random() - 0.5) * 40 // TODO
    });
  }

  /**
   * ? ? ?? (?????)
   */
  updateCollectorViruses(dt) {
    for (let i = this.collectorViruses.length - 1; i >= 0; i--) {
      const v = this.collectorViruses[i];

      // TODO
      v.wobblePhase += dt * v.wobbleSpeed;

      let targetX, targetY;

      if (v.state === "toItem") {
        targetX = v.targetX;
        targetY = v.targetY;

        const dist = Math.hypot(targetX - v.x, targetY - v.y);

        if (dist < 15) {
          // TODO
          const droppedItem = this.droppedItems.find(
            d => !d.collected && Math.hypot(d.x - v.x, d.y - v.y) < 25
          );

          if (droppedItem) {
            droppedItem.collected = true;
            v.carriedItem = droppedItem.item;
            v.state = "returning";
            // TODO
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
          // TODO
          if (v.carriedItem && this.onItemCollected) {
            this.onItemCollected(v.carriedItem);
          }
          // TODO
          this.createExplosion(v.x, v.y, "#00ff88", 5);
          this.collectorViruses.splice(i, 1);
          continue;
        }
      } else {
        continue;
      }

      // TODO
      const dx = targetX - v.x;
      const dy = targetY - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        // TODO
        const targetVx = (dx / dist) * v.speed;
        const targetVy = (dy / dist) * v.speed;

        // TODO
        const accel = 8;
        v.vx += (targetVx - v.vx) * accel * dt;
        v.vy += (targetVy - v.vy) * accel * dt;

        // TODO
        const wobbleAmount = Math.sin(v.wobblePhase) * 25;
        const perpAngle = Math.atan2(dy, dx) + Math.PI / 2;
        const wobbleX = Math.cos(perpAngle) * wobbleAmount * dt;
        const wobbleY = Math.sin(perpAngle) * wobbleAmount * dt;

        // TODO
        v.x += v.vx * dt + wobbleX;
        v.y += v.vy * dt + wobbleY;
      }
    }

    // TODO
    this.droppedItems = this.droppedItems.filter(d => !d.collected);
  }

  /**
   * ?????    */
  renderDroppedItems() {
    const ctx = this.ctx;
    const now = performance.now();

    this.droppedItems.forEach(d => {
      if (d.collected) return;

      const age = (now - d.spawnTime) / 1000;
      const pulse = 1 + Math.sin(d.pulsePhase + age * 4) * 0.15;
      const size = 12 * pulse;

      // TODO
      const colors = {
        common: "#ffffff",
        rare: "#00aaff",
        legendary: "#ffaa00"
      };
      const color = colors[d.item.rarity] || "#ffffff";

      // TODO
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      // TODO
      ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
      ctx.fill();

      // TODO
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // TODO
      ctx.fillStyle = "#ffffff";
      ctx.font = `${size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(d.item.icon, d.x, d.y);

      ctx.restore();
    });
  }

  /**
   * ? ? ??(????? ?)
   */
  renderCollectorViruses() {
    const ctx = this.ctx;
    const time = performance.now() / 1000;

    this.collectorViruses.forEach(v => {
      const baseSize = 6;

      ctx.save();

      // TODO
      const wobble = Math.sin(time * 5 + v.wobblePhase) * 1.5;
      const breathe = 1 + Math.sin(time * 3 + v.wobblePhase * 2) * 0.1;
      const size = baseSize * breathe;

      // TODO
      const offsetX = wobble * 0.4;
      const offsetY = Math.cos(time * 4 + v.wobblePhase) * 0.8;

      const drawX = v.x + offsetX;
      const drawY = v.y + offsetY;

      // TODO
      const moveAngle = Math.atan2(v.vy || 0, v.vx || 0);
      const speed = Math.hypot(v.vx || 0, v.vy || 0);
      const tilt = (speed / v.speed) * 0.2;

      ctx.translate(drawX, drawY);
      ctx.rotate(tilt * Math.sin(moveAngle));

      // TODO
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(2, 3, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // TODO
      const bodyColor = v.carriedItem ? "#00ff88" : "#88ffcc";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      // TODO
      ctx.strokeStyle = v.carriedItem ? "#00aa55" : "#55aa88";
      ctx.lineWidth = 1;
      ctx.stroke();

      // TODO
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
      ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // TODO
      if (v.carriedItem) {
        ctx.save();
        const floatY = Math.sin(time * 6) * 2;

        // TODO
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

  /**
   * ?????? 
   */
  getItemRarityColor(rarity) {
    const colors = {
      common: "#ffffff",
      rare: "#00aaff",
      legendary: "#ffaa00"
    };
    return colors[rarity] || "#ffffff";
  }

  render() {
    // TODO
    if (!this.renderDebugFrameCount) this.renderDebugFrameCount = 0;

    // TODO
    const shouldLog = this.renderDebugFrameCount < 3;
    if (shouldLog) {
      this.renderDebugFrameCount++;
      const mode = this.isMiniDisplay ? "" : "?";
      debugLog("Canvas", `=== render() ? [${mode} ] (???${this.renderDebugFrameCount}) ===`);
      debugLog("Canvas", "canvas.id:", this.canvas.id);
      debugLog("Canvas", "canvas size:", this.canvas.width, "x", this.canvas.height);
      debugLog("Canvas", "canvas.style.display:", this.canvas.style.display);
      debugLog("Canvas", "isMiniDisplay:", this.isMiniDisplay);
      debugLog("Canvas", "gameScale:", this.gameScale);
      debugLog("Canvas", "?:", this.alliedViruses.length, "??", this.enemies.length);
      debugLog("Canvas", " ?:", this.core.x, this.core.y);
      debugLog("Canvas", " ??", this.core.radius);
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // TODO
    this.ctx.save();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(this.gameScale, this.gameScale);
    this.ctx.translate(-centerX, -centerY);
    this.ctx.translate(-this.camera.x + centerX, -this.camera.y + centerY);

    const time = Date.now() / 1000;
    const isMobile = this.isMobile;

    // TODO
    if (this.miningManager) {
      this.miningManager.render(this.ctx, time, isMobile);
    }

    // TODO
    if (this.isConquered) {
      // TODO
      if (!this.conqueredRenderLogged) {
        debugLog(
          "DefenseGame",
          "? ? ???, isConquered:",
          this.isConquered,
          "conqueredStartTime:",
          this.conqueredStartTime
        );
        this.conqueredRenderLogged = true;
      }
      this.renderConqueredVisuals();
    } else {
      // TODO
      this.conqueredRenderLogged = false;
    }

    // TODO
    if (!this.isConquered) {
      const shieldRadius = Math.max(0, this.core.shieldRadius);
      const cx = this.core.x;
      const cy = this.core.y;
      const sv = this.shieldVisual;
      const state = this.core.shieldState;

      // TODO
      const hpRatio = this.core.shieldHp / this.core.shieldMaxHp;
      // TODO
      const r = Math.floor(255 * (1 - hpRatio));
      const g = Math.floor(200 * hpRatio + 50 * (1 - hpRatio));
      const b = Math.floor(255 * hpRatio + 50 * (1 - hpRatio));

      // TODO
      let dashOffset = sv.rotation;
      if (state === "BROKEN" || state === "RECHARGING") {
        const stepDuration = 500; // TODO
        const stepSize = 20;
        const currentStep = Math.floor(Date.now() / stepDuration);
        dashOffset = currentStep * stepSize;
      }

      // TODO
      if (sv.fillAlpha > 0.01 && shieldRadius > 0) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${sv.fillAlpha})`;
        this.ctx.fill();
      }

      // TODO
      if (shieldRadius <= 0) {
        // TODO
        this.ctx.setLineDash([]);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);

        if (sv.dashGap > 0.5) {
          // TODO
          const dashLength = Math.max(3, 10 - sv.dashGap * 0.3);
          this.ctx.setLineDash([dashLength, sv.dashGap]);
          this.ctx.lineDashOffset = -dashOffset;
        } else {
          // TODO
          this.ctx.setLineDash([]);
        }

        this.ctx.lineWidth = sv.lineWidth;

        // TODO
        let alpha = sv.alpha;
        if (state === "ACTIVE") {
          alpha = sv.alpha + Math.sin(Date.now() / 200) * 0.15;
        }

        // TODO
        if (state === "BROKEN" || state === "RECHARGING") {
          this.ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
        } else {
          this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
      } // TODO
    }

    // TODO
    this.alliedViruses.forEach((v) => {
      this.ctx.save();

      // TODO
      if (isMobile) {
        // TODO
        this.ctx.translate(v.x, v.y);
      } else {
        // TODO
        const wobble = Math.sin(time * 5 + (v.wobblePhase || 0)) * 1.5;
        const breathe =
          1 + Math.sin(time * 3 + (v.wobblePhase || 0) * 2) * 0.08;

        this.ctx.translate(v.x + wobble * 0.3, v.y + wobble * 0.2);
        this.ctx.scale(breathe, breathe);

        // TODO
        this.ctx.shadowColor = v.color;
        this.ctx.shadowBlur = 8;
      }

      // TODO
      switch (v.virusType) {
        case "TANK":
          // TODO
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
          // TODO
          this.ctx.strokeStyle = "#ffffff44";
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          break;

        case "HUNTER":
          // TODO
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
          // TODO
          if (!isMobile) {
            const blink = Math.sin(time * 10) > 0 ? 1 : 0.6;
            this.ctx.globalAlpha = blink;
          }
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
          this.ctx.fill();
          // TODO
          this.ctx.fillStyle = "#ffff00";
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius * 0.4, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case "HEALER":
          // TODO
          this.ctx.fillStyle = v.color;
          const armWidth = v.radius * 0.4;
          const armLength = v.radius;
          // TODO
          this.ctx.fillRect(-armLength, -armWidth / 2, armLength * 2, armWidth);
          // TODO
          this.ctx.fillRect(-armWidth / 2, -armLength, armWidth, armLength * 2);
          // TODO
          this.ctx.beginPath();
          this.ctx.arc(0, 0, armWidth * 0.8, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case "SWARM":
        default:
          // TODO
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }

      // TODO
      const eyeSize = v.radius * 0.2;

      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(-v.radius * 0.3, -v.radius * 0.1, eyeSize, 0, Math.PI * 2);
      this.ctx.arc(v.radius * 0.3, -v.radius * 0.1, eyeSize, 0, Math.PI * 2);
      this.ctx.fill();

      // TODO
      if (v.hp < v.maxHp) {
        if (!isMobile) this.ctx.shadowBlur = 0; // TODO
        const barWidth = v.radius * 2;
        const barHeight = 2;
        const hpPercent = v.hp / v.maxHp;

        // TODO
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(-barWidth / 2, -v.radius - 6, barWidth, barHeight);
        // TODO
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

    // TODO
    // TODO
    if (this.helper && this.helper.x !== 0) {
      const h = this.helper;
      const mode = this.getCurrentWeaponMode();

      // TODO
      this.ctx.fillStyle = h.color;
      this.ctx.beginPath();
      this.ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // TODO
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // TODO
      this.ctx.save();
      this.ctx.translate(h.x, h.y);

      // TODO
      const now = performance.now();
      const lastFire = h.faceLookTime || 0;
      const timeSinceFire = now - lastFire;
      const lookDuration = 200; // TODO
      const returnDuration = 300; // TODO

      let lookIntensity = 0;
      if (timeSinceFire < lookDuration) {
        // TODO
        lookIntensity = 1;
      } else if (timeSinceFire < lookDuration + returnDuration) {
        // TODO
        lookIntensity = 1 - (timeSinceFire - lookDuration) / returnDuration;
      }
      // TODO

      const lookStrength = h.radius * 0.2 * lookIntensity; // TODO
      const fireAngle = h.faceLookAngle || 0;
      const lookX = Math.cos(fireAngle) * lookStrength;
      const lookY = Math.sin(fireAngle) * lookStrength;

      // TODO
      const faceOffsetX = lookX;
      const faceOffsetY = -h.radius * 0.25 + lookY * 0.5; // TODO
      // TODO
      const eyeRadius = h.radius * 0.12;
      const eyeY = faceOffsetY - h.radius * 0.1;
      const eyeSpacing = h.radius * 0.3;

      // TODO
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(faceOffsetX - eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // TODO
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(faceOffsetX + eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // TODO
      const mouthY = faceOffsetY + h.radius * 0.2;
      const mouthWidth = h.radius * 0.4;

      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      // TODO
      this.ctx.moveTo(faceOffsetX - mouthWidth, mouthY);
      this.ctx.quadraticCurveTo(faceOffsetX - mouthWidth * 0.5, mouthY + h.radius * 0.15, faceOffsetX, mouthY);
      this.ctx.quadraticCurveTo(faceOffsetX + mouthWidth * 0.5, mouthY + h.radius * 0.15, faceOffsetX + mouthWidth, mouthY);
      this.ctx.stroke();

      this.ctx.restore();

      // TODO
      if (h.isReloading && mode.hasReload) {
        const reloadRadius = h.radius + 8;
        const progress = h.reloadProgress;

        // TODO
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

        // TODO
        this.ctx.beginPath();
        this.ctx.arc(h.x, h.y, reloadRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // TODO
        const glitchTime = Date.now();
        const glitchX = (Math.random() - 0.5) * 4;
        const glitchY = (Math.random() - 0.5) * 2;

        this.ctx.save();
        this.ctx.font = "bold 10px monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // TODO
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

        // TODO
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

        // TODO
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 8px monospace";
        this.ctx.fillText(
          `${Math.floor(progress * 100)}%`,
          h.x,
          h.y + h.radius + 12
        );

        this.ctx.restore();
      }

      // TODO
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

    // TODO
    this.ctx.font = "bold 12px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.projectiles.forEach((p) => {
      // TODO
      const color = p.fromHelper ? "#ffff00" : "#00ff00";
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 5;
      this.ctx.fillText(p.char || "*", p.x, p.y);
    });
    this.ctx.shadowBlur = 0;

    // TODO
    this.enemies.forEach((e) => {
      this.ctx.fillStyle = "#ff3333";
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();

      const hpPct = Math.max(0, Math.min(1, e.hp / e.maxHp)); // TODO
      this.ctx.fillStyle = "#550000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20, 4);
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20 * hpPct, 4);
    });

    // TODO
    const coreScale = this.core.scale || 1;
    const scaledRadius = this.core.radius * coreScale;

    // TODO
    const coreVisualX = this.core.x + (this.core.visualOffsetX || 0);
    const coreVisualY = this.core.y + (this.core.visualOffsetY || 0);

    // TODO
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

    // TODO
    if (this.showCoreHP !== false && !this.isOutroPlaying) {
      const hpPercent = Math.round((this.core.hp / this.core.maxHp) * 100);

      // TODO
      const offsetX = this.glitchText ? this.glitchOffset?.x || 0 : 0;
      const offsetY = this.glitchText ? this.glitchOffset?.y || 0 : 0;

      this.ctx.font = `bold ${14 * coreScale}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // TODO
      if (this.glitchText) {
        // TODO
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        this.ctx.fillText(
          `${hpPercent}%`,
          coreVisualX + offsetX - 2,
          coreVisualY + scaledRadius + 20 + offsetY
        );
        // TODO
        this.ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        this.ctx.fillText(
          `${hpPercent}%`,
          coreVisualX + offsetX + 2,
          coreVisualY + scaledRadius + 20 + offsetY
        );
      }

      // TODO
      this.ctx.fillStyle = hpPercent > 30 ? "#00ff00" : "#ff3333";
      this.ctx.fillText(
        `${hpPercent}%`,
        coreVisualX + offsetX,
        coreVisualY + scaledRadius + 20 + offsetY
      );
    }

    // TODO
    this.ctx.font = "bold 10px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.particles.forEach((p) => {
      // TODO
      const glitchX = p.char ? (Math.random() - 0.5) * 3 : 0;
      const glitchY = p.char ? (Math.random() - 0.5) * 3 : 0;

      // TODO
      if (p.char && Math.random() < 0.3 && p.life < p.maxLife * 0.5) {
        return; // TODO
      }

      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;

      if (p.char) {
        // TODO
        this.ctx.font = `bold ${p.size}px monospace`;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 3;

        // TODO
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
        // TODO
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1.0;
    });

    // TODO
    this.shockwaves.forEach((wave) => {
      const safeRadius = Math.max(0, wave.radius);
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, safeRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = wave.color;
      this.ctx.lineWidth = wave.lineWidth;
      this.ctx.globalAlpha = wave.alpha;
      this.ctx.stroke();

      // TODO
      if (safeRadius > 50) {
        this.ctx.beginPath();
        this.ctx.arc(wave.x, wave.y, safeRadius * 0.7, 0, Math.PI * 2);
        this.ctx.lineWidth = wave.lineWidth * 0.5;
        this.ctx.globalAlpha = wave.alpha * 0.5;
        this.ctx.stroke();
      }

      this.ctx.globalAlpha = 1.0;
    });

    // TODO
    this.renderStaticEffects();

    // TODO
    this.renderDroppedItems();
    this.renderCollectorViruses();

    // TODO
    this.renderSpeechBubbles();

    // TODO
    this.ctx.restore();

    // TODO
    if (this.isBossFight && this.bossManager) {
      this.renderBossUI();
    }

    // TODO
    if (this.isMiniDisplay && this.miniCanvas) {
      const miniCtx = this.miniCanvas.getContext("2d");
      const miniW = this.miniCanvas.width || 400;
      const miniH = this.miniCanvas.height || 150;

      // TODO
      if (this.renderDebugFrameCount < 3) {
        debugLog("Canvas", "===  ???? ??===");
        debugLog("Canvas", "1.  ???: miniW =", miniW, "miniH =", miniH);
        debugLog("Canvas", "2. ? ???: canvas.width =", this.canvas.width, "canvas.height =", this.canvas.height);
        debugLog("Canvas", "3. isMobile =", this.isMobile);
      }

      // TODO
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

      // TODO
      if (this.isBossFight && this.bossManager) {
        const hpSpan = document.getElementById("conquest-core-hp");
        if (hpSpan) hpSpan.innerText = "??" + Math.ceil(this.bossManager.bossHP) + "%";
      }
    }
  }

  /**
   * ??UI ??(:  HP?/ ?:  )
   * ????? ? ???? ???
   */
  renderBossUI() {
    const status = this.bossManager.getStatus();
    const ctx = this.ctx;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // TODO
    const isMobile = canvasWidth < 500;
    const barWidth = isMobile ? 16 : 24;
    const barHeight = Math.min(canvasHeight * 0.5, 300);
    const margin = isMobile ? 10 : 20;
    const barY = (canvasHeight - barHeight) / 2;

    // TODO
    const hpBarX = margin;

    // TODO
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(hpBarX - 4, barY - 30, barWidth + 8, barHeight + 60);

    // TODO
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, barY, barWidth, barHeight);

    // TODO
    const hpRatio = status.bossHP / status.maxBossHP;
    const hpFillHeight = barHeight * hpRatio;
    const hpGradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY + barHeight - hpFillHeight);
    hpGradient.addColorStop(0, '#ff0000');
    hpGradient.addColorStop(1, '#ff6600');
    ctx.fillStyle = hpGradient;
    ctx.fillRect(hpBarX, barY + barHeight - hpFillHeight, barWidth, hpFillHeight);

    // TODO
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

    // TODO
    ctx.save();
    ctx.fillStyle = '#ff6600';
    ctx.font = `bold ${isMobile ? 10 : 12}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', hpBarX + barWidth / 2, barY - 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(status.bossHP)}%`, hpBarX + barWidth / 2, barY - 3);

    // TODO
    ctx.fillStyle = '#ffff00';
    ctx.font = `${isMobile ? 8 : 10}px monospace`;
    ctx.fillText(`P${status.currentPhase}`, hpBarX + barWidth / 2, barY + barHeight + 15);
    ctx.restore();

    // TODO
    const breachBarX = canvasWidth - margin - barWidth;

    // TODO
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(breachBarX - 4, barY - 30, barWidth + 8, barHeight + 60);

    // TODO
    const breachColor = status.isBreachReady ? '#00ff00' : '#00aaff';
    ctx.strokeStyle = breachColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(breachBarX, barY, barWidth, barHeight);

    // TODO
    const breachRatio = status.breachGauge / status.maxBreachGauge;
    const breachFillHeight = barHeight * breachRatio;
    const breachGradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY + barHeight - breachFillHeight);
    breachGradient.addColorStop(0, '#004488');
    breachGradient.addColorStop(1, status.isBreachReady ? '#00ff00' : '#00aaff');
    ctx.fillStyle = breachGradient;
    ctx.fillRect(breachBarX, barY + barHeight - breachFillHeight, barWidth, breachFillHeight);

    // TODO
    ctx.save();
    ctx.textAlign = 'center';
    if (status.isBreachReady) {
      // TODO
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

    // TODO
    if (!status.isBreachReady) {
      ctx.fillStyle = '#00aaff';
      ctx.font = `${isMobile ? 8 : 10}px monospace`;
      ctx.fillText(`${status.breachTimeRemaining}s`, breachBarX + barWidth / 2, barY + barHeight + 15);
    }
    ctx.restore();
  }

  /**
   * ???? ? ??   */
  renderStaticEffects() {
    const ss = this.staticSystem;
    const se = this.staticEffects;
    const chargeRatio = ss.currentCharge / ss.maxCharge;

    // TODO

    // TODO
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

    // TODO
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

    // TODO
    se.chains.forEach((chain) => {
      this.ctx.save();
      this.ctx.globalAlpha = chain.alpha;
      this.ctx.strokeStyle = chain.color;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 15;

      // TODO
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

    // TODO
  }

  /**
   * ? ??????? ? ?
   * @param {string} effectType - "knockback_slow", "knockback_damage", "knockback_damage_x3"
   */
  applyWaveEffect(effectType) {
    debugLog("Defense", "? ?:", effectType);

    const knockbackDist = 50; // TODO
    const slowDuration = 2000; // TODO
    const damage = 10; // TODO

    // TODO
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

    // TODO
    this.enemies.forEach((enemy) => {
      // TODO
      if (effectType === "knockback_slow") {
        // TODO
        this.applyKnockback(enemy, 300, 0.3, 2);
      } else if (effectType === "knockback_damage") {
        // TODO
        this.applyKnockback(enemy, 300);
        enemy.hp -= damage;
      } else if (effectType === "knockback_damage_x3") {
        // TODO
        this.applyKnockback(enemy, 350);
        enemy.hp -= damage * 3;

        // TODO
        this.createExplosion(enemy.x, enemy.y, "#ff4400", 10);
      }
    });

    // TODO
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
    // TODO
    if (this.isSafeZone || this.isConquered) {
      debugLog("Enemy", "spawnEnemy blocked - isSafeZone:", this.isSafeZone, "isConquered:", this.isConquered);
      return;
    }
    debugLog("Enemy", "spawnEnemy called - isSafeZone:", this.isSafeZone);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;

    const ex = this.core.x + Math.cos(angle) * distance;
    const ey = this.core.y + Math.sin(angle) * distance;

    // TODO
    let difficultyScale;

    // TODO
    const baseSpeed = 60 + Math.random() * 40; // TODO
    const baseHp = 10; // TODO

    if (this.isReinforcementMode) {
      // TODO
      // TODO
      const stageBase = this.calculateStageBaseDifficulty();
      const reinforcementBonus = 0.5 + (this.reinforcementPage - 1) * 0.3; // TODO
      difficultyScale = stageBase + reinforcementBonus;
    } else {
      // TODO
      const stageBase = this.calculateStageBaseDifficulty();
      const pageProgress = (this.currentPage - 1) / (this.stageMaxPages - 1); // TODO
      // TODO
      const pageMultiplier =
        pageProgress * (this.stageDifficultyScale * stageBase * 0.5); // TODO
      difficultyScale = stageBase + pageMultiplier;
    }

    this.enemies.push({
      x: ex,
      y: ey,
      radius: 10,
      speed: baseSpeed * difficultyScale,
      hp: Math.floor(baseHp * difficultyScale),
      maxHp: Math.floor(baseHp * difficultyScale),
      damage: 10,
    });
  }

  // TODO
  spawnSafeZoneAllies() {
    debugLog("Enemy", "spawnSafeZoneAllies called - isSafeZone:", this.isSafeZone);
    if (!this.isSafeZone) {
      debugLog("Enemy", "spawnSafeZoneAllies aborted - not Safe Zone");
      return;
    }

    // TODO
    this.alliedViruses = [];

    // TODO
    const virusTypes = {
      SWARM: { color: "#88ff88", baseHp: 8, baseDamage: 5, baseSpeed: 180, radius: 6, attackType: "melee" },
      TANK: { color: "#ff8800", baseHp: 60, baseDamage: 8, baseSpeed: 80, radius: 12, attackType: "melee", tauntRadius: 150, aggroRadius: 180 },
      HUNTER: { color: "#aa00ff", baseHp: 20, baseDamage: 15, baseSpeed: 110, radius: 8, attackType: "ranged", range: 150, fireRate: 1.5, projectileSpeed: 200 },
      BOMBER: { color: "#ff4444", baseHp: 15, baseDamage: 0, baseSpeed: 150, radius: 9, attackType: "suicide", explosionDamage: 40, explosionRadius: 60 },
      HEALER: { color: "#00ff88", baseHp: 40, baseDamage: 0, baseSpeed: 90, radius: 8, attackType: "support", healAmount: 5, healRadius: 80 }
    };

    // TODO
    const types = ["SWARM", "SWARM", "SWARM", "TANK", "HUNTER", "HUNTER", "BOMBER", "HEALER", "SWARM", "HUNTER", "SWARM", "BOMBER"];
    const count = 12 + Math.floor(Math.random() * 7); // TODO

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const typeData = virusTypes[type];

      if (!typeData) continue;

      // TODO
      const margin = 40;
      const screenW = this.canvas.width;
      const screenH = this.canvas.height;
      const coreX = this.core.x;
      const coreY = this.core.y;

      // TODO
      const zone = i % 4; // TODO
      let spawnX, spawnY;

      switch (zone) {
        case 0: // TODO
          spawnX = margin + Math.random() * (screenW * 0.35 - margin);
          spawnY = margin + Math.random() * (screenH * 0.35 - margin);
          break;
        case 1: // TODO
          spawnX = screenW * 0.65 + Math.random() * (screenW * 0.35 - margin);
          spawnY = margin + Math.random() * (screenH * 0.35 - margin);
          break;
        case 2: // TODO
          spawnX = margin + Math.random() * (screenW * 0.35 - margin);
          spawnY = screenH * 0.65 + Math.random() * (screenH * 0.35 - margin);
          break;
        case 3: // TODO
          spawnX = screenW * 0.65 + Math.random() * (screenW * 0.35 - margin);
          spawnY = screenH * 0.65 + Math.random() * (screenH * 0.35 - margin);
          break;
      }

      // TODO
      const distFromCore = Math.hypot(spawnX - coreX, spawnY - coreY);
      if (distFromCore < 150) {
        const pushAngle = Math.atan2(spawnY - coreY, spawnX - coreX);
        spawnX = coreX + Math.cos(pushAngle) * 180;
        spawnY = coreY + Math.sin(pushAngle) * 180;
      }

      const ally = {
        x: spawnX,
        y: spawnY,
        radius: typeData.radius || 8,
        speed: typeData.baseSpeed || 100,
        hp: typeData.baseHp || 20,
        maxHp: typeData.baseHp || 20,
        baseMaxHp: typeData.baseHp || 20,
        damage: typeData.baseDamage || 10,
        virusType: type, // TODO
        color: typeData.color || "#88ff88",
        attackType: typeData.attackType || "melee",
        // TODO
        homeX: spawnX,
        homeY: spawnY,
        homeRadius: 80 + Math.random() * 60, // TODO
        // TODO
        vx: 0,
        vy: 0,
        wobblePhase: Math.random() * Math.PI * 2, // TODO
        wanderTargetX: null,
        wanderTargetY: null,
        wanderTimer: 0,
        wanderDuration: 2 + Math.random() * 4,
        isIdle: Math.random() < 0.2, // TODO
        // TODO
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

  // TODO
  calculateStageBaseDifficulty() {
    // TODO
    // TODO
    // TODO
    // TODO
    // TODO

    let baseDifficulty;
    if (this.currentStageId === 0) {
      baseDifficulty = 0.5; // TODO
    } else if (this.currentStageId <= 2) {
      baseDifficulty = 1.0; // TODO
    } else if (this.currentStageId <= 4) {
      baseDifficulty = 1.5; // TODO
    } else {
      baseDifficulty = 2.0; // TODO
    }

    // TODO
    // TODO
    // TODO
    return baseDifficulty;
  }

  // TODO
  updateHelper(dt, now) {
    const helper = this.helper;
    const shieldRadius = this.core.shieldRadius - 15; // TODO
    const minDistFromCore = 45; // TODO

    // TODO
    if (helper.x === 0 && helper.y === 0) {
      helper.x = this.core.x + 50; // TODO
      helper.y = this.core.y;
      helper.targetX = helper.x;
      helper.targetY = helper.y;
    }

    // TODO
    let nearestEnemy = null;
    let minDist = Infinity;
    let enemyInsideShield = null; // TODO
    this.enemies.forEach((enemy) => {
      const distToCore = Math.hypot(
        enemy.x - this.core.x,
        enemy.y - this.core.y
      );
      const distToHelper = Math.hypot(enemy.x - helper.x, enemy.y - helper.y);

      // TODO
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

      // TODO
      if (distToHelper < helper.range && distToHelper < minDist) {
        minDist = distToHelper;
        nearestEnemy = enemy;
      }
    });

    // TODO
    if (enemyInsideShield) {
      const dx = helper.x - enemyInsideShield.x;
      const dy = helper.y - enemyInsideShield.y;
      const dist = Math.hypot(dx, dy);

      if (dist < helper.evadeDistance && dist > 0) {
        // TODO
        const evadeX = helper.x + (dx / dist) * 40;
        const evadeY = helper.y + (dy / dist) * 40;

        // TODO
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
          // TODO
          const angle = Math.atan2(evadeY - this.core.y, evadeX - this.core.x);
          helper.targetX =
            this.core.x + Math.cos(angle) * (minDistFromCore + 10);
          helper.targetY =
            this.core.y + Math.sin(angle) * (minDistFromCore + 10);
        } else {
          // TODO
          const angle = Math.atan2(
            helper.y - this.core.y,
            helper.x - this.core.x
          );
          helper.targetX = this.core.x + Math.cos(angle) * (shieldRadius - 10);
          helper.targetY = this.core.y + Math.sin(angle) * (shieldRadius - 10);
        }
      }
    } else if (nearestEnemy) {
      // TODO
      const angleToEnemy = Math.atan2(
        nearestEnemy.y - this.core.y,
        nearestEnemy.x - this.core.x
      );
      const targetDist = Math.min(shieldRadius - 5, minDistFromCore + 15);
      helper.targetX = this.core.x + Math.cos(angleToEnemy) * targetDist;
      helper.targetY = this.core.y + Math.sin(angleToEnemy) * targetDist;
    } else {
      // TODO
      if (!helper.patrolAngle) helper.patrolAngle = 0;
      helper.patrolAngle += dt * 0.3; // TODO
      const patrolDist = minDistFromCore + 10;
      helper.targetX = this.core.x + Math.cos(helper.patrolAngle) * patrolDist;
      helper.targetY = this.core.y + Math.sin(helper.patrolAngle) * patrolDist;
    }

    // TODO
    const lerpSpeed = enemyInsideShield ? 3.5 : 1.5; // TODO
    helper.x += (helper.targetX - helper.x) * dt * lerpSpeed;
    helper.y += (helper.targetY - helper.y) * dt * lerpSpeed;

    // TODO
    const distToCore = Math.hypot(
      helper.x - this.core.x,
      helper.y - this.core.y
    );
    const angle = Math.atan2(helper.y - this.core.y, helper.x - this.core.x);

    // TODO
    if (distToCore > shieldRadius) {
      const clampedX = this.core.x + Math.cos(angle) * shieldRadius;
      const clampedY = this.core.y + Math.sin(angle) * shieldRadius;
      helper.x += (clampedX - helper.x) * dt * 5;
      helper.y += (clampedY - helper.y) * dt * 5;
    }

    // TODO
    if (distToCore < minDistFromCore) {
      const pushX = this.core.x + Math.cos(angle) * minDistFromCore;
      const pushY = this.core.y + Math.sin(angle) * minDistFromCore;
      helper.x += (pushX - helper.x) * dt * 5;
      helper.y += (pushY - helper.y) * dt * 5;
    }

    // TODO
    if (nearestEnemy) {
      // TODO
      helper.angle = Math.atan2(
        nearestEnemy.y - helper.y,
        nearestEnemy.x - helper.x
      );

      // TODO
      const fireInterval = 1 / helper.fireRate;
      const timeSinceLastFire = now - helper.lastFireTime;

      if (timeSinceLastFire >= fireInterval) {
        debugLog(
          "Helper",
          "!",
          "??",
          nearestEnemy.x.toFixed(0),
          nearestEnemy.y.toFixed(0)
        );
        this.fireHelperProjectile(nearestEnemy);
        helper.lastFireTime = now;
      }
    } else if (this.enemies.length > 0) {
      // TODO
      if (!this._helperNoTargetLogged) {
        const firstEnemy = this.enemies[0];
        const dist = Math.hypot(
          firstEnemy.x - helper.x,
          firstEnemy.y - helper.y
        );
        debugLog(
          "Helper",
          "???",
          ":",
          dist.toFixed(0),
          "??",
          helper.range
        );
        this._helperNoTargetLogged = true;
        setTimeout(() => {
          this._helperNoTargetLogged = false;
        }, 3000);
      }
    }
  }

  // TODO
  setWeaponMode(modeName) {
    const mode = this.weaponModes[modeName];
    if (!mode) {
      debugLog("Defense", "Unknown weapon mode:", modeName);
      return;
    }

    this.helper.weaponMode = modeName;
    this.helper.color = mode.color;

    // TODO
    this.helper.damage = mode.baseDamage;
    this.helper.fireRate = mode.baseFireRate;
    this.helper.range = mode.baseRange;
    this.helper.projectileSpeed = mode.baseProjectileSpeed;

    // TODO
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

  // TODO
  getCurrentWeaponMode() {
    return this.weaponModes[this.helper.weaponMode] || this.weaponModes.NORMAL;
  }

  // TODO
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
    this.helper.magazineBonus = bonusMagazine; // TODO
    debugLog("Defense", "Upgrade bonus applied:", {
      damage: this.helper.damage,
      fireRate: this.helper.fireRate,
      range: this.helper.range,
      projectileSpeed: this.helper.projectileSpeed,
      magazineBonus: bonusMagazine,
    });
  }

  // TODO
  fireHelperProjectile(target) {
    const mode = this.getCurrentWeaponMode();
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    // TODO
    if (mode.hasReload) {
      if (this.helper.isReloading) {
        return; // TODO
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

    // TODO
    this.helper.faceLookAngle = baseAngle;
    this.helper.faceLookTime = performance.now();
    debugLog("Helper", "angle:", baseAngle.toFixed(2), "time:", this.helper.faceLookTime);

    const speed = this.helper.projectileSpeed || 400;
    const projectileCount = mode.projectileCount || 1;
    const spreadAngle = mode.spreadAngle || 0;

    // TODO
    for (let i = 0; i < projectileCount; i++) {
      let angle = baseAngle;

      // TODO
      if (projectileCount > 1) {
        const spreadOffset =
          (i - (projectileCount - 1) / 2) *
          (spreadAngle / (projectileCount - 1));
        angle = baseAngle + spreadOffset;
      }
      // TODO
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
        // TODO
        explosive: mode.explosive || false,
        explosionRadius: mode.explosionRadius || 0,
        // TODO
        piercing: mode.piercing || false,
      });
    }

    // TODO
    if (mode.hasReload && this.helper.currentAmmo <= 0) {
      this.startReload();
    }
  }

  // TODO
  startReload() {
    const mode = this.getCurrentWeaponMode();
    if (!mode.hasReload || this.helper.isReloading) return;

    this.helper.isReloading = true;
    this.helper.reloadProgress = 0;
    this.helper.reloadStartTime = performance.now();

    debugLog("Defense", "Reload started:", mode.name);
  }

  // TODO
  updateReload(dt) {
    if (!this.helper.isReloading) return;

    const mode = this.getCurrentWeaponMode();
    if (!mode.hasReload) {
      this.helper.isReloading = false;
      return;
    }

    // TODO
    const reloadSpeedMultiplier = 1 + this.helper.fireRate * 0.1;
    const calculatedReloadTime = mode.reloadTime / reloadSpeedMultiplier;

    // TODO
    const minReloadTime =
      mode.name === "SNIPER" || mode.name === "LAUNCHER" ? 1.2 : 1.0;
    const actualReloadTime = Math.max(minReloadTime, calculatedReloadTime);

    const elapsed = (performance.now() - this.helper.reloadStartTime) / 1000;
    this.helper.reloadProgress = Math.min(elapsed / actualReloadTime, 1);

    if (this.helper.reloadProgress >= 1) {
      // TODO
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

  // TODO
  handleExplosion(x, y, radius, damage, color) {
    // TODO
    this.createExplosion(x, y, color || "#ff4400", 25);

    // TODO
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

    // TODO
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Math.hypot(enemy.x - x, enemy.y - y);

      if (dist <= radius) {
        // TODO
        const damageMultiplier = 1 - (dist / radius) * 0.5;
        const actualDamage = Math.floor(damage * damageMultiplier);

        enemy.hp -= actualDamage;

        // TODO
        this.applyKnockback(enemy, 150, 0.5, 1);

        // TODO
        this.createExplosion(enemy.x, enemy.y, "#ff8800", 3);

        // TODO
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
    // TODO
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar =
      asciiChars[Math.floor(Math.random() * asciiChars.length)];

    // TODO
    const recoilDist = 8; // TODO
    this.core.targetOffsetX = Math.cos(this.turret.angle) * recoilDist;
    this.core.targetOffsetY = Math.sin(this.turret.angle) * recoilDist;

    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: target,
      angle: this.turret.angle,
      speed: 400, // TODO
      damage: this.turret.damage,
      radius: 4,
      life: 2.0,
      char: randomChar, // TODO
    });

    this.createExplosion(
      this.core.x + Math.cos(this.turret.angle) * 40,
      this.core.y + Math.sin(this.turret.angle) * 40,
      "#fff",
      3
    );
  }

  // TODO
  fireProjectileToward(angle) {
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar =
      asciiChars[Math.floor(Math.random() * asciiChars.length)];

    // TODO
    const recoilDist = 8;
    this.core.targetOffsetX = Math.cos(angle) * recoilDist;
    this.core.targetOffsetY = Math.sin(angle) * recoilDist;

    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: null, // TODO
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

  // TODO
  handleCanvasClick(e) {
    // TODO
    if (this.isPaused) return;

    // TODO
    if (e.target === this.shieldBtn) return;

    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // TODO
    const worldPos = this.screenToWorld(clickX, clickY);
    const scaledClickX = worldPos.x;
    const scaledClickY = worldPos.y;

    // TODO
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

  // TODO
  handleCanvasTouch(e) {
    if (this.isPaused) return;

    // TODO
    e.preventDefault();

    // TODO
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // TODO
      if (
        touchX >= 0 &&
        touchX <= rect.width &&
        touchY >= 0 &&
        touchY <= rect.height
      ) {
        // TODO
        const worldPos = this.screenToWorld(touchX, touchY);
        const scaledTouchX = worldPos.x;
        const scaledTouchY = worldPos.y;

        // TODO
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

        this.fireAtPosition(scaledTouchX, scaledTouchY);
      }
    }
  }

  // TODO
  handleKeyDown(e) {
    if (this.isPaused) return;

    if (e.code === "KeyW") this.keyState.up = true;
    if (e.code === "KeyS") this.keyState.down = true;
    if (e.code === "KeyA") this.keyState.left = true;
    if (e.code === "KeyD") this.keyState.right = true;

    if (e.code === "Space" || e.key === " ") {
      e.preventDefault(); // TODO
      this.fireAtPosition(0, 0); // TODO
    }
  }

  handleKeyUp(e) {
    if (e.code === "KeyW") this.keyState.up = false;
    if (e.code === "KeyS") this.keyState.down = false;
    if (e.code === "KeyA") this.keyState.left = false;
    if (e.code === "KeyD") this.keyState.right = false;
  }

  screenToWorld(screenX, screenY) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const worldX = (screenX - centerX) / this.gameScale + this.camera.x;
    const worldY = (screenY - centerY) / this.gameScale + this.camera.y;
    return { x: worldX, y: worldY };
  }

  // TODO
  fireAtPosition(x, y) {
    // TODO
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
        this.turret.angle = angle; // TODO
        this.fireProjectileToward(angle);
      }
    } else {
      // TODO
      this.fireProjectileToward(this.turret.angle);
    }
  }

  createExplosion(x, y, color, count = 10) {
    // TODO
    const actualCount = Math.ceil(count * this.particleMultiplier);

    // TODO
    if (this.particles.length >= this.maxParticles) {
      // TODO
      this.particles.splice(0, actualCount);
    }

    // TODO
    const glitchChars = "!@#$%^&*?/<>[]{}|\\~`??????";

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120; // TODO
      const life = 0.2 + Math.random() * 0.4; // TODO

      // TODO
      let particleColor = color;
      const colorRoll = Math.random();
      if (colorRoll < 0.15) {
        particleColor = "#ff0000"; // TODO
      } else if (colorRoll < 0.25) { // TODO
        particleColor = "#ffffff"; // TODO
      }

      this.particles.push({
        x: x + (Math.random() - 0.5) * 10, // TODO
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        alpha: 1,
        color: particleColor,
        size: 10 + Math.random() * 4, // TODO
        char: glitchChars[Math.floor(Math.random() * glitchChars.length)], // TODO
        glitchOffset: { x: 0, y: 0 }, // TODO
        flickerTimer: Math.random() * 0.1, // TODO
      });
    }
  }

  // TODO
  createTauntEffect(x, y, radius, color) {
    // TODO
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: radius,
      speed: 300,
      alpha: 0.8,
      color: color,
      lineWidth: 3,
      isTaunt: true, // TODO
    });

    // TODO
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

    // TODO
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
          char: "??",
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

  /**
   * ???  ? (????+ )
   */
  playIntroAnimation() {
    return new Promise((resolve) => {
      // TODO
      const centerX = this.coreHome.x || this.canvas.width / 2;
      const centerY = this.coreHome.y || this.canvas.height / 2;

      // TODO
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];

      debugLog("Defense", "playIntroAnimation - isSafeZone:", this.isSafeZone, "alliedViruses before:", this.alliedViruses.length);

      // TODO
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

      // TODO
      this.showCoreHP = false;

      // TODO
      const isMobile = window.innerWidth <= 768;
      const startScale = isMobile ? 20.0 : 50.0; // TODO
      const duration = isMobile ? 250 : 300; // TODO
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

          // TODO
          const easeInQuint = (t) => t * t * t * t * t;

          // TODO
          this.core.scale =
            startScale - (startScale - 1) * easeInQuint(progress);

          if (progress < 1) {
            requestAnimationFrame(animateDrop);
          } else {
            // TODO
            this.core.scale = 1;

            // TODO
            this.impactEffect();

            // TODO
            this.glitchShowHP()
              .then(() => {
                // TODO
                if (this.isSafeZone) {
                  debugLog("Defense", "playIntroAnimation - SKIPPING spawnAlliesSequentially (Safe Zone)");
                  return Promise.resolve();
                }
                return this.spawnAlliesSequentially();
              })
              .then(() => this.expandShield())
              .then(resolve)
              .catch((err) => {
                console.error("IntroAnimation error:", err);
                resolve(); // TODO
              });
          }
        } catch (err) {
          console.error("animateDrop error:", err);
          this.core.scale = 1;
          resolve();
        }
      };

      requestAnimationFrame(animateDrop);
    });
  }

  /**
   * ??? ? ? (??? ?)
   * ????? - ??? ? ?? ? ?
   */
  playOutroAnimation() {
    return new Promise((resolve) => {
      debugLog("Defense", "????");

      const isMobile = window.innerWidth <= 768;
      const duration = isMobile ? 400 : 500;
      const startTime = performance.now();
      const startScale = 1;
      const endScale = isMobile ? 30.0 : 50.0;

      // TODO
      this.enemySpawnTimer = 99999;
      this.isOutroPlaying = true;

      // TODO
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

        // TODO
        const easeInQuint = (t) => t * t * t * t * t;
        const easedProgress = easeInQuint(progress);

        // TODO
        this.core.scale = startScale + (endScale - startScale) * easedProgress;

        // TODO
        if (progress > 0.7) {
          const fadeProgress = (progress - 0.7) / 0.3;
          overlay.style.opacity = fadeProgress.toString();
        }

        debugLog("Defense", "progress:", progress.toFixed(2), "scale:", this.core.scale.toFixed(1));

        // TODO
        this.render();

        if (progress < 1) {
          requestAnimationFrame(animateAscend);
        } else {
          debugLog("Defense", "???? - ? ??");
          // TODO
          overlay.style.opacity = "1";

          // TODO
          setTimeout(() => {
            overlay.remove();
            debugLog("Defense", "?? ?");
          }, 500);

          // TODO
          this.core.scale = 1;
          this.isOutroPlaying = false;
          resolve();
        }
      };

      requestAnimationFrame(animateAscend);
    });
  }

  // TODO
  impactEffect() {
    // TODO
    this.playImpactSound();

    // TODO
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

    // TODO
    this.shakeScreen();

    // TODO
    this.spawnShockwave();

    // TODO
    if (this.isSafeZone) {
      setTimeout(() => this.showSafeZoneText(), 300);
    }
  }

  // TODO
  playImpactSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // TODO
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

      // TODO
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

      // TODO
      const bufferSize = audioCtx.sampleRate * 0.08;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // TODO
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }

      const noise = audioCtx.createBufferSource();
      const noiseGain = audioCtx.createGain();
      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 400; // TODO

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

  // TODO
  showSafeZoneText() {
    const isMobile = window.innerWidth <= 768;
    const fontSize = isMobile ? 28 : 48;

    // TODO
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

    // TODO
    let glitchCount = 0;
    const maxGlitches = 12;

    const glitchInterval = setInterval(() => {
      glitchCount++;

      // TODO
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 10;
      const skewX = (Math.random() - 0.5) * 5;

      container.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) skewX(${skewX}deg)`;
      container.style.opacity = Math.random() > 0.3 ? "1" : "0.5";

      // TODO
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

      // TODO
      if (glitchCount <= 6 && Math.random() > 0.5) {
        this.playGlitchSound();
      }

      if (glitchCount >= maxGlitches) {
        clearInterval(glitchInterval);
        // TODO
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

  // TODO
  playGlitchSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // TODO
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
      // TODO
    }
  }

  // TODO
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

        // TODO
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

  // TODO
  shakeScreen() {
    const container = document.getElementById("game-container");
    if (!container) return;

    container.style.transition = "none";
    let shakeCount = 0;
    const maxShakes = 8;
    const shakeIntensity = 15; // TODO
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

  // TODO
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

    // TODO
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

  // TODO
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
    // TODO
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
    // TODO
    if (this.alliedConfig) {
      await this.spawnAlliesWithConfig();
      return;
    }

    // TODO
    const count = this.alliedInfo.count;
    debugLog("Defense", "spawnAllies Starting (legacy), count:", count);

    if (!count || count === 0) {
      debugLog("Defense", "spawnAllies - No allies to spawn");
      return;
    }

    // TODO
    this.alliedViruses = [];

    const delay = 250; // TODO
    const targetRadius = 95; // TODO

    for (let i = 0; i < count; i++) {
      const angle = ((Math.PI * 2) / count) * i; // TODO

      // TODO
      const ally = {
        x: this.core.x, // TODO
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
        // TODO
        spawning: true,
        spawnProgress: 0,
        // TODO
        virusType: "SWARM",
        attackType: "melee",
      };

      this.alliedViruses.push(ally);
      debugLog("Defense", "spawnAllies ?? Ally", i + 1, "of", count);

      // TODO
      this.animateAllySpawn(ally, targetRadius, angle);

      // TODO
      await new Promise((r) => setTimeout(r, delay));
    }

    debugLog(
      "Defense",
      "spawnAllies Complete! Total:",
      this.alliedViruses.length
    );
  }

  /**
   * ???? ???? ?
   */
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

    const delay = 200; // TODO
    const targetRadius = 95;

    // TODO
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

    // TODO
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

  /**
   * ????? ?  ?
   */
  createVirusFromType(typeName, typeData, angle, targetRadius, config) {
    // TODO
    const pureBonus = config.isPureSpecialization ? config.pureBonus : 1.0;

    // TODO
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
      baseMaxHp: hp, // TODO
      damage: damage,
      speed: speed,
      angle: angle,
      radius: typeData.radius,
      color: typeData.color,
      target: null,
      attackTimer: 0,
      spawning: true,
      spawnProgress: 0,

      // TODO
      virusType: typeName,
      attackType: typeData.attackType,

      // TODO
      special: typeData.special || null,
      range: typeData.range || 0,
      fireRate: typeData.fireRate || 0,
      projectileSpeed: typeData.projectileSpeed || 0,
      explosionDamage: typeData.explosionDamage || 0,
      explosionRadius: typeData.explosionRadius || 0,
      knockbackForce: typeData.knockbackForce || 0,
      healAmount: typeData.healAmount || 0,
      healRadius: typeData.healRadius || 0,

      // TODO
      tauntRadius: typeData.tauntRadius || 0,
      tauntCooldown: typeData.tauntCooldown || 0,
      aggroRadius: typeData.aggroRadius || 0,

      // TODO
      respawnTime: config.respawnTime,

      // TODO
      synergy: config.synergy,
    };
  }

  // TODO
  animateAllySpawn(ally, targetRadius, angle) {
    const duration = 300; // TODO
    const startTime = performance.now();
    const overshoot = 1.3; // TODO

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // TODO
      const elasticOut = (t) => {
        if (t === 0 || t === 1) return t;
        return (
          Math.pow(2, -10 * t) *
          Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) +
          1
        );
      };

      const eased = elasticOut(progress);

      // TODO
      const currentRadius = targetRadius * eased;

      ally.x = this.core.x + Math.cos(angle) * currentRadius;
      ally.y = this.core.y + Math.sin(angle) * currentRadius;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ally.spawning = false;
        ally.x = this.core.x + Math.cos(angle) * targetRadius;
        ally.y = this.core.y + Math.sin(angle) * targetRadius;

        // TODO
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

    // TODO
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
      const duration = 300; // TODO
      const start = performance.now();

      const animateShield = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);

        // TODO
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

  // TODO

  /**
   * ???JSON 
   */
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

  /**
   * ? ?????  * @param {string} category ??? (battle, idle, hurt, kill, spawn, etc.)
   */
  getRandomDialogue(category) {
    if (!this.virusDialogues || !this.virusDialogues[category]) return null;
    const dialogues = this.virusDialogues[category];
    if (dialogues.length === 0) return null;
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }

  /**
   * ???
   * @param {object} virus ? 
   * @param {string} text ??????  * @param {number} duration ? ? (ms)
   */
  createSpeechBubble(virus, text, duration = 1500) {
    if (!text) return;

    // TODO
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

    // TODO
    setTimeout(() => {
      virus.isSpeaking = false;
    }, duration + 500);
  }

  /**
   * ? ? ? ?? ???  * @param {object} virus ? 
   * @param {string} situation ? (battle, hurt, kill, idle, spawn)
   * @param {number} chance ? (0~1)
   */
  tryVirusSpeech(virus, situation, chance = 0.1) {
    if (Math.random() > chance) return;
    const text = this.getRandomDialogue(situation);
    if (text) {
      this.createSpeechBubble(virus, text);
    }
  }

  /**
   * ????
   */
  updateSpeechBubbles() {
    const now = performance.now();

    // TODO
    this.activeSpeechBubbles = this.activeSpeechBubbles.filter(bubble => {
      const elapsed = now - bubble.startTime;
      if (elapsed > bubble.duration) {
        return false;
      }
      // TODO
      if (elapsed > bubble.duration - 300) {
        bubble.opacity = 1 - (elapsed - (bubble.duration - 300)) / 300;
      }
      return true;
    });
  }

  /**
   * ????  */
  renderSpeechBubbles() {
    const ctx = this.ctx;

    this.activeSpeechBubbles.forEach(bubble => {
      const v = bubble.virus;
      if (!v) return;

      ctx.save();
      ctx.globalAlpha = bubble.opacity;

      // TODO
      const textY = v.y - v.radius - 15;

      // TODO
      ctx.font = "bold 13px 'VT323', 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // TODO
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(bubble.text, v.x, textY);

      // TODO
      ctx.fillStyle = "#00ff41";
      ctx.fillText(bubble.text, v.x, textY);

      ctx.restore();
    });
  }

  // TODO
  // TODO
  // TODO

  /**
   * BGM ? ?
   * @param {string} trackName - ? ? (SAFE_ZONE, DEFENSE, FINAL)
   */
  playBGMTrack(trackName) {
    if (this.currentBGMTrack === trackName) return; // TODO
    this.currentBGMTrack = trackName;
    this.bgmManager.play(trackName);
  }

  /**
   * BGM  ??
   * @returns {boolean} -  ? ??true (ON)
   */
  toggleBGM() {
    const isOn = this.bgmManager.toggleMute();

    // TODO
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
    // TODO
    if (this.core.shieldActive || this.core.shieldState !== "OFF") {
      this.moveInput.x = 0;
      this.moveInput.y = 0;
      return;
    }

    const speed = this.coreMoveSpeed;
    this.core.x += this.moveInput.x * speed * dt;
    this.core.y += this.moveInput.y * speed * dt;

    // TODO
    this.core.x = Math.min(Math.max(this.core.x, 0), this.worldWidth);
    this.core.y = Math.min(Math.max(this.core.y, 0), this.worldHeight);
  }

  updateCoreReturn(dt) {
    const dx = this.coreHome.x - this.core.x;
    const dy = this.coreHome.y - this.core.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.core.x += nx * this.coreReturnSpeed * dt;
      this.core.y += ny * this.coreReturnSpeed * dt;
    } else {
      this.core.x = this.coreHome.x;
      this.core.y = this.coreHome.y;
      this.coreReturnAtHome = true;
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
}