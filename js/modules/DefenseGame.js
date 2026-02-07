import { BGMManager } from "./BGMManager.js";
import { applyAllyAIMixin } from "./defense/AllyAIMixin.js";
import { applyWeaponInputMixin } from "./defense/WeaponInputMixin.js";
import { applyEffectsMixin } from "./defense/EffectsMixin.js";
import { applyShieldMixin } from "./defense/ShieldMixin.js";
import { applyRenderMixin } from "./defense/RenderMixin.js";

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

    this.safeZoneFacilities = [
      {
        id: "upgrade_shop",
        kind: "shop",
        label: "UPGRADE SHOP",
        actionLabel: "OPEN UPGRADE SHOP",
        openHint: "UPGRADE",
        x: 0,
        y: 0,
        radius: 52,
        triggerRadius: 78,
        collisionHalfWidth: 34,
        collisionHalfHeight: 30,
        color: "#ffcc00",
        accent: "#00ffff",
        owner: {
          name: "BROKER-7",
          role: "merchant",
          bodyColor: "#88ffcc",
          gearColor: "#ffe066",
          accentColor: "#00f0ff",
          offsetX: 58,
          offsetY: 22,
          phase: 0.35,
          wanderMinRadius: 24,
          wanderSpeedMin: 28,
          wanderSpeedMax: 58,
          wanderAccel: 180,
          driftJitter: 18,
          boostChance: 0.3,
          boostMult: 1.3,
          retargetMin: 0.6,
          retargetMax: 1.8,
          idleChance: 0.22,
          idleMin: 0.15,
          idleMax: 0.55,
          approachRadius: 360,
          approachSpeed: 70,
          leashRadius: 170,
          minCoreGap: 24,
        },
      },
      {
        id: "dismantler",
        kind: "dismantler",
        label: "DISMANTLER",
        actionLabel: "OPEN DISMANTLER",
        openHint: "DISMANTLE",
        x: 0,
        y: 0,
        radius: 56,
        triggerRadius: 82,
        collisionHalfWidth: 52,
        collisionHalfHeight: 24,
        color: "#ff6633",
        accent: "#ffaa00",
        owner: {
          name: "SCRAP-MASTER",
          role: "engineer",
          bodyColor: "#ff9977",
          gearColor: "#666666",
          accentColor: "#ffcc88",
          offsetX: -62,
          offsetY: 20,
          phase: 1.1,
          wanderMinRadius: 20,
          wanderSpeedMin: 24,
          wanderSpeedMax: 50,
          wanderAccel: 160,
          driftJitter: 14,
          boostChance: 0.24,
          boostMult: 1.22,
          retargetMin: 0.7,
          retargetMax: 2.0,
          idleChance: 0.2,
          idleMin: 0.2,
          idleMax: 0.7,
          approachRadius: 320,
          approachSpeed: 58,
          leashRadius: 156,
          minCoreGap: 22,
        },
      },
    ];
    this.activeSafeZoneFacilityId = null;
    this.safeZoneOwnerStates = Object.create(null);
    this.onSafeZoneFacilityInteract = null;
    this.safeZonePrompt = document.createElement("div");
    this.safeZonePrompt.id = "safezone-facility-prompt";
    this.safeZonePrompt.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 68px;
      transform: translateX(-50%);
      padding: 8px 14px;
      border: 1px solid #00ff99;
      background: rgba(0, 20, 10, 0.85);
      color: #00ff99;
      font-family: var(--term-font);
      font-size: 12px;
      text-shadow: 0 0 8px rgba(0, 255, 153, 0.45);
      pointer-events: none;
      z-index: 45;
      display: none;
      white-space: nowrap;
    `;
    this.uiLayer.appendChild(this.safeZonePrompt);


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
        baseDamage: 8,
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
        baseDamage: 4,
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
        baseDamage: 24,
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
        baseDamage: 2,
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
        baseDamage: 20,
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
      damage: 8,
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
    this.facilityDialogues = { upgrade_shop: [], dismantler: [] };
    this.activeSpeechBubbles = [];
    this.safeZoneOwnerActors = Object.create(null);
    this.facilityDialogueCooldowns = { upgrade_shop: 0, dismantler: 0 };
    this.pendingFacilityVisits = Object.create(null);
    this.facilityDialogueAttemptTimer = 0;
    this.loadVirusDialogues();
    this.loadFacilityDialogues();
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
    this.updateSafeZoneFacilityLayout();
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

  updateResourceDisplay(amount) {
    this.currentData = amount;
    if (this.onDataUpdate) {
      this.onDataUpdate(this.currentData);
    }
  }

  getKillDataGain() {
    const baseGain = 10;
    const stageIndex = Math.max(0, this.currentStageId || 0);
    const stageScale = 1 + Math.min(1.5, stageIndex * 0.05);
    const maxPages = this.stageMaxPages || 0;
    const pageProgress = maxPages > 1 ? (this.currentPage - 1) / (maxPages - 1) : 0;
    const pageScale = 1 + Math.min(0.3, pageProgress * 0.3);
    return Math.max(5, Math.round(baseGain * stageScale * pageScale));
  }

  awardKillData() {
    const gain = this.getKillDataGain();
    this.currentData += gain;
    this.updateResourceDisplay(this.currentData);
    if (this.onResourceGained) this.onResourceGained(gain);
  }

  getPageSpawnRate(page, diffScale) {
    const stageIndex = Math.max(0, this.currentStageId || 0);
    const stageFactor = 1 + Math.min(0.5, stageIndex * 0.03);
    const diffFactor = Math.sqrt(diffScale || 1);
    const baseRate = 0.42 - page * 0.025 * diffFactor;
    const scaledRate = baseRate / stageFactor;
    return Math.max(0.16 * this.pageSpawnScale, scaledRate * this.pageSpawnScale);
  }

  getReinforcementSpawnRate(page) {
    const stageIndex = Math.max(0, this.currentStageId || 0);
    const stageFactor = 1 + Math.min(0.4, stageIndex * 0.02);
    const reinforcementSpawnRates = [0.17, 0.12, 0.09];
    const baseRate = reinforcementSpawnRates[Math.min(page - 1, 2)];
    return Math.max(0.08, (baseRate / stageFactor)) * this.pageSpawnScale;
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

  applyShockwaveEffects() {
    const damage = 25;

    this.enemies.forEach((enemy) => {
      this.applyKnockback(enemy, 200, 0.3, 2);

      enemy.hp -= damage;
      this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);

      if (enemy.hp <= 0) {
        this.createExplosion(enemy.x, enemy.y, "#00ff00", 10);
        this.awardKillData();
      }
    });

    this.enemies = this.enemies.filter((e) => e.hp > 0);
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

  updateSafeZoneFacilityLayout() {
    if (!Array.isArray(this.safeZoneFacilities) || this.safeZoneFacilities.length < 2) {
      return;
    }
    const spreadX = Math.max(250, this.worldWidth * 0.18);
    const offsetY = Math.max(130, this.worldHeight * 0.12);
    const edgePadding = 90;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const shop = this.safeZoneFacilities.find((facility) => facility.id === "upgrade_shop");
    const dismantler = this.safeZoneFacilities.find((facility) => facility.id === "dismantler");
    if (shop) {
      shop.x = clamp(this.coreHome.x - spreadX - 26, edgePadding, this.worldWidth - edgePadding);
      shop.y = clamp(this.coreHome.y + offsetY + 6, edgePadding, this.worldHeight - edgePadding);
    }
    if (dismantler) {
      dismantler.x = clamp(this.coreHome.x + spreadX + 34, edgePadding, this.worldWidth - edgePadding);
      dismantler.y = clamp(this.coreHome.y + offsetY + 26, edgePadding, this.worldHeight - edgePadding);
    }
  }

  hideSafeZoneFacilityPrompt() {
    if (!this.safeZonePrompt) return;
    this.safeZonePrompt.style.display = "none";
    this.activeSafeZoneFacilityId = null;
  }

  updateSafeZoneFacilityPrompt() {
    if (!this.safeZonePrompt) return;
    if (!this.isSafeZone || !this.isRunning || this.uiLayer?.style?.display === "none") {
      this.hideSafeZoneFacilityPrompt();
      return;
    }

    let nearest = null;
    let nearestDist = Infinity;
    for (const facility of this.safeZoneFacilities) {
      const dx = this.core.x - facility.x;
      const dy = this.core.y - facility.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= facility.triggerRadius && dist < nearestDist) {
        nearestDist = dist;
        nearest = facility;
      }
    }

    if (!nearest) {
      this.hideSafeZoneFacilityPrompt();
      return;
    }

    this.activeSafeZoneFacilityId = nearest.id;
    this.safeZonePrompt.style.display = "none";
  }

  tryInteractSafeZoneFacility(worldX, worldY) {
    if (!this.isSafeZone) return false;
    if (!Array.isArray(this.safeZoneFacilities) || this.safeZoneFacilities.length === 0) {
      return false;
    }

    for (const facility of this.safeZoneFacilities) {
      const halfW = facility.collisionHalfWidth || 36;
      const halfH = facility.collisionHalfHeight || 24;
      const inBody =
        Math.abs(worldX - facility.x) <= halfW * 1.15 &&
        Math.abs(worldY - facility.y) <= halfH * 1.25;
      const tapDist = Math.hypot(worldX - facility.x, worldY - facility.y);
      if (!inBody && tapDist > facility.radius * 1.2) {
        continue;
      }

      const coreDist = Math.hypot(this.core.x - facility.x, this.core.y - facility.y);
      if (coreDist > facility.triggerRadius + this.core.radius) {
        this.createExplosion(facility.x, facility.y, "#ff8800", 4);
        return true;
      }

      if (typeof this.onSafeZoneFacilityInteract === "function") {
        this.onSafeZoneFacilityInteract(facility.id);
      }
      this.createExplosion(facility.x, facility.y, facility.accent, 6);
      return true;
    }
    return false;
  }

  resolveSafeZoneFacilityCollisions() {
    if (!this.isSafeZone || !Array.isArray(this.safeZoneFacilities)) return;
    const coreRadius = this.core.radius + 2;

    for (let pass = 0; pass < 2; pass++) {
      for (const facility of this.safeZoneFacilities) {
        const halfW = (facility.collisionHalfWidth || 36) + coreRadius;
        const halfH = (facility.collisionHalfHeight || 24) + coreRadius;
        const dx = this.core.x - facility.x;
        const dy = this.core.y - facility.y;
        const overlapX = halfW - Math.abs(dx);
        const overlapY = halfH - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const dirX = dx === 0 ? (this.moveInput.x >= 0 ? 1 : -1) : Math.sign(dx);
          this.core.x += dirX * overlapX;
        } else {
          const dirY = dy === 0 ? (this.moveInput.y >= 0 ? 1 : -1) : Math.sign(dy);
          this.core.y += dirY * overlapY;
        }
      }
    }
  }

  start() {
    this.resize();
    this.isRunning = true;
    this.canvas.style.display = "block";
    this.uiLayer.style.display = "block";

    this.isSafeZone = (this.currentStageId === 0);
    this.isFarmingZone = (this.currentStageId === 3);
    this.activeSafeZoneFacilityId = null;
    this.safeZoneOwnerActors = Object.create(null);
    this.pendingFacilityVisits = Object.create(null);
    this.facilityDialogueCooldowns = { upgrade_shop: 1.8, dismantler: 2.2 };
    this.facilityDialogueAttemptTimer = 1.2;
    this.updateSafeZoneFacilityPrompt();
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
    this.hideSafeZoneFacilityPrompt();
    this.updateRecallBtnVisibility();
    this.pendingFacilityVisits = Object.create(null);

    this.bgmManager.stop();
  }

  pause() {
    this.isRunning = false;
    this.hideSafeZoneFacilityPrompt();
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
    this.updateSafeZoneFacilityPrompt();
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
    this.updateSafeZoneFacilityPrompt();
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

          this.spawnRate = this.getReinforcementSpawnRate(this.reinforcementPage);

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
            this.spawnRate = this.getPageSpawnRate(this.currentPage, diffScale);
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
    this.updateSafeZoneFacilityDialogues(dt);

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
      const bossMultiplier =
        this.isBossFight && this.bossManager
          ? (this.bossManager.getPhaseConfig()?.spawnMultiplier || 1)
          : 1;
      const currentSpawnRate = (this.isSafeZone
        ? this.safeZoneSpawnRate
        : this.spawnRate) / Math.max(1, bossMultiplier);
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

              this.awardKillData();
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

              this.awardKillData();
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
        this.awardKillData();
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
          this.awardKillData();
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
        this.spawnRate = this.getPageSpawnRate(this.currentPage, diffScale);
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
    this.spawnRate = this.getReinforcementSpawnRate(this.reinforcementPage);
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
    this.spawnRate = this.getPageSpawnRate(this.currentPage, this.stageDifficultyScale || 1.0);

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

  
  getItemRarityColor(rarity) {
    const colors = {
      common: "#ffffff",
      rare: "#00aaff",
      legendary: "#ffaa00"
    };
    return colors[rarity] || "#ffffff";
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
    const baseDamage = 8;

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
    const damage = Math.max(6, Math.floor(baseDamage * difficultyScale));
    this.enemies.push({
      x: ex,
      y: ey,
      radius: 10,
      speed: baseSpeed * difficultyScale,
      hp: maxHp,
      maxHp,
      damage,
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
    const count = 40;
    const unlockedTypes = new Set(["SWARM"]);
    if (Array.isArray(config?.safeZoneUnlockedTypes)) {
      config.safeZoneUnlockedTypes.forEach((type) => {
        if (type && virusTypes[type]) unlockedTypes.add(type);
      });
    } else {
      if (config?.mainType && virusTypes[config.mainType]) unlockedTypes.add(config.mainType);
      if (config?.subType && virusTypes[config.subType]) unlockedTypes.add(config.subType);
    }
    const typePool = Array.from(unlockedTypes).filter((type) => !!virusTypes[type]);
    if (typePool.length === 0) typePool.push("SWARM");

    for (let i = 0; i < count; i++) {
      const type = typePool[Math.floor(Math.random() * typePool.length)];
      const typeData = virusTypes[type];

      if (!typeData) continue;

      const margin = 40;
      const worldW = this.worldWidth || this.canvas.width;
      const worldH = this.worldHeight || this.canvas.height;
      const coreX = this.core.x;
      const coreY = this.core.y;

      const zone = i % 4;
      let spawnX, spawnY;

      switch (zone) {
        case 0:
          spawnX = margin + Math.random() * (worldW * 0.35 - margin);
          spawnY = margin + Math.random() * (worldH * 0.35 - margin);
          break;
        case 1:
          spawnX = worldW * 0.65 + Math.random() * (worldW * 0.35 - margin);
          spawnY = margin + Math.random() * (worldH * 0.35 - margin);
          break;
        case 2:
          spawnX = margin + Math.random() * (worldW * 0.35 - margin);
          spawnY = worldH * 0.65 + Math.random() * (worldH * 0.35 - margin);
          break;
        case 3:
          spawnX = worldW * 0.65 + Math.random() * (worldW * 0.35 - margin);
          spawnY = worldH * 0.65 + Math.random() * (worldH * 0.35 - margin);
          break;
      }

      const distFromCore = Math.hypot(spawnX - coreX, spawnY - coreY);
      if (distFromCore < 150) {
        const pushAngle = Math.atan2(spawnY - coreY, spawnX - coreX);
        spawnX = coreX + Math.cos(pushAngle) * 180;
        spawnY = coreY + Math.sin(pushAngle) * 180;
      }

      const useConfigBonuses = !!config;
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
    const stageIndex = Math.max(0, this.currentStageId || 0);
    let baseDifficulty;
    if (stageIndex === 0) {
      baseDifficulty = 0.5;
    } else if (stageIndex <= 2) {
      baseDifficulty = 1.0;
    } else if (stageIndex <= 4) {
      baseDifficulty = 1.5;
    } else if (stageIndex <= 6) {
      baseDifficulty = 2.0;
    } else {
      const extra = Math.min(1.4, (stageIndex - 6) * 0.07);
      baseDifficulty = 2.0 + extra;
    }

    return baseDifficulty;
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

  async loadFacilityDialogues() {
    try {
      const response = await fetch("./js/data/facilityDialogues.json");
      const parsed = await response.json();
      this.facilityDialogues = {
        upgrade_shop: Array.isArray(parsed?.upgrade_shop) ? parsed.upgrade_shop : [],
        dismantler: Array.isArray(parsed?.dismantler) ? parsed.dismantler : [],
      };
      debugLog("Defense", "Facility dialogues loaded:", {
        shop: this.facilityDialogues.upgrade_shop.length,
        dismantler: this.facilityDialogues.dismantler.length,
      });
    } catch (e) {
      debugWarn("Defense", "Failed to load facility dialogues", e);
      this.facilityDialogues = { upgrade_shop: [], dismantler: [] };
    }
  }

  getFacilityDialogueScenario(facilityId) {
    const scenarios = this.facilityDialogues?.[facilityId];
    if (!Array.isArray(scenarios) || scenarios.length === 0) return null;
    return scenarios[Math.floor(Math.random() * scenarios.length)] || null;
  }

  startFacilityDialogueScenario(facilityId, ally, ownerActor) {
    if (!ally || !ownerActor || ally.hp <= 0) return false;
    if (ally.isSpeaking || ownerActor.isSpeaking) return false;

    const scenario = this.getFacilityDialogueScenario(facilityId);
    if (!scenario || !Array.isArray(scenario.turns) || scenario.turns.length === 0) return false;

    let delay = 0;
    let validTurnCount = 0;

    scenario.turns.forEach((turn) => {
      const text = `${turn?.text || ""}`.trim();
      if (!text) return;
      const speaker = turn?.speaker === "owner" ? ownerActor : ally;
      const duration = Math.max(900, Math.min(2100, 500 + text.length * 70));

      setTimeout(() => {
        if (!this.isRunning || !this.isSafeZone) return;
        if (!speaker || !Number.isFinite(speaker.x) || !Number.isFinite(speaker.y)) return;
        this.createSpeechBubble(speaker, text, duration);
      }, delay);

      delay += duration + 140;
      validTurnCount++;
    });

    if (validTurnCount === 0) return false;
    this.facilityDialogueCooldowns[facilityId] = Math.max(
      this.facilityDialogueCooldowns[facilityId] || 0,
      6 + Math.random() * 7 + validTurnCount * 0.5
    );
    return true;
  }

  updateSafeZoneFacilityDialogues(dt) {
    if (!this.isSafeZone || !this.isRunning) return;
    if (!Array.isArray(this.safeZoneFacilities) || this.safeZoneFacilities.length === 0) return;

    const now = performance.now();

    this.safeZoneFacilities.forEach((facility) => {
      const id = facility.id;
      this.facilityDialogueCooldowns[id] = Math.max(
        0,
        (this.facilityDialogueCooldowns[id] || 0) - dt
      );
    });

    Object.entries(this.pendingFacilityVisits).forEach(([facilityId, plan]) => {
      const facility = this.safeZoneFacilities.find((f) => f.id === facilityId);
      const ally = plan?.ally;
      if (!facility || !ally || ally.hp <= 0 || !this.alliedViruses.includes(ally) || now > plan.expiresAt) {
        if (ally) {
          ally.facilityVisitTarget = null;
          ally.facilityVisitUntil = 0;
          ally.facilityVisitFacilityId = null;
          ally.facilityVisitHold = 0;
        }
        delete this.pendingFacilityVisits[facilityId];
        return;
      }

      if (!ally.facilityVisitTarget) {
        ally.facilityVisitTarget = { x: plan.targetX, y: plan.targetY };
      } else {
        ally.facilityVisitTarget.x = plan.targetX;
        ally.facilityVisitTarget.y = plan.targetY;
      }
      ally.facilityVisitUntil = plan.expiresAt;
      ally.facilityVisitFacilityId = facilityId;

      const ownerActor = this.safeZoneOwnerActors?.[facilityId];
      if (!ownerActor) return;

      const distToTarget = Math.hypot(ally.x - plan.targetX, ally.y - plan.targetY);
      const distToOwner = Math.hypot(ally.x - ownerActor.x, ally.y - ownerActor.y);
      if (distToTarget <= 24 && distToOwner <= 96) {
        const started = this.startFacilityDialogueScenario(facilityId, ally, ownerActor);
        if (started) {
          ally.facilityVisitTarget = null;
          ally.facilityVisitUntil = 0;
          ally.facilityVisitFacilityId = null;
          ally.facilityVisitHold = 0;
          delete this.pendingFacilityVisits[facilityId];
        }
      }
    });

    this.facilityDialogueAttemptTimer = Math.max(0, this.facilityDialogueAttemptTimer - dt);
    if (this.facilityDialogueAttemptTimer > 0) return;
    this.facilityDialogueAttemptTimer = 0.7 + Math.random() * 0.8;

    this.safeZoneFacilities.forEach((facility) => {
      const id = facility.id;
      if (this.facilityDialogueCooldowns[id] > 0) return;
      if (this.pendingFacilityVisits[id]) return;
      if (!Array.isArray(this.facilityDialogues?.[id]) || this.facilityDialogues[id].length === 0) return;
      if (Math.random() > 0.42) return;

      const candidates = this.alliedViruses.filter(
        (v) =>
          v.hp > 0 &&
          !v.isSpeaking &&
          !v.facilityVisitTarget &&
          !v.chatPartner
      );
      if (candidates.length === 0) return;

      const ownerAnchor = this.safeZoneOwnerActors?.[id] || facility;
      const ally = candidates[Math.floor(Math.random() * candidates.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 30;
      const margin = 40;
      const targetX = Math.max(
        margin,
        Math.min((this.worldWidth || this.canvas.width) - margin, ownerAnchor.x + Math.cos(angle) * dist)
      );
      const targetY = Math.max(
        margin,
        Math.min((this.worldHeight || this.canvas.height) - margin, ownerAnchor.y + Math.sin(angle) * dist)
      );
      const expiresAt = now + 11000;

      this.pendingFacilityVisits[id] = { ally, targetX, targetY, expiresAt };
      ally.facilityVisitTarget = { x: targetX, y: targetY };
      ally.facilityVisitUntil = expiresAt;
      ally.facilityVisitFacilityId = id;
      ally.facilityVisitHold = 0;
    });
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

    this.resolveSafeZoneFacilityCollisions();
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

}

// Apply mixin modules to DefenseGame prototype
applyAllyAIMixin(DefenseGame);
applyWeaponInputMixin(DefenseGame);
applyEffectsMixin(DefenseGame);
applyShieldMixin(DefenseGame);
applyRenderMixin(DefenseGame);
