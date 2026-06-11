const debugLog = window.debugLog || function () {};

// 글자 색은 단어 내 위치(index) 기준 팔레트로 부여
const LETTER_PALETTE = ["#42f59e", "#48d7ff", "#4b8cff", "#9f72ff", "#ff5cb8", "#ff944d"];

// 커맨드 워드 풀 — 스테이지/사이클마다 하나가 랜덤으로 떠서 보상이 매번 달라진다.
// 주의: 수집 판정이 글자 동일성 기반이므로 단어 안에 중복 글자가 없어야 한다.
const PROTOCOL_WORDS = [
  {
    word: "SUDO",
    effect: "barrage",
    color: "#ff5cb8",
    label: "OVERDRIVE 탄막",
    intro: "명령어 [SUDO] 감지! 순서대로 모으면 최고 권한 — 일제 사격이에요!",
    done: "sudo 권한 획득!! 청소 시간이에요!!",
  },
  {
    word: "HEAL",
    effect: "heal",
    color: "#42f59e",
    label: "코어/실드 수리",
    intro: "명령어 [HEAL] 감지! 순서대로 모으면 코어를 수리해드릴게요!",
    done: "수리 완료! 새것 같죠? ...거의요.",
  },
  {
    word: "NUKE",
    effect: "nuke",
    color: "#ff944d",
    label: "광역 폭발",
    intro: "명령어 [NUKE] 감지! 이거… 큰 거예요. 순서대로!",
    done: "NUKE 실행!! 와아아—!!",
  },
  {
    word: "PING",
    effect: "ping",
    color: "#48d7ff",
    label: "적 정지 + 정찰",
    intro: "명령어 [PING] 감지! 순서대로 모으면 적들이 멈춰버려요!",
    done: "핑 전송! 전원 응답 대기 중 — 지금이에요!",
  },
  {
    word: "WARP",
    effect: "warp",
    color: "#9f72ff",
    label: "이동속도 버스트",
    intro: "명령어 [WARP] 감지! 순서대로 모으면 한동안 엄청 빨라져요!",
    done: "WARP!! 지금 해커님을 따라잡을 수 있는 건 저뿐이에요!",
  },
  {
    word: "CASH",
    effect: "cash",
    color: "#ffd84d",
    label: "DATA 2배 (30초)",
    intro: "명령어 [CASH] 감지! 순서대로 모으면 30초간 DATA 2배!",
    done: "CASH-IN!! 버는 만큼 쓸어 담으세요!",
  },
];
const BARRAGE_ASCII_CHARS =
  "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const MOBILE_ROAMING_RING_RADIUS = 62;
const MOBILE_ROAMING_BADGE_RADIUS = 11;
const MOBILE_ROAMING_TRAVEL_DURATION = 0.22;
const MOBILE_ROAMING_RETURN_DURATION = 0.36;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgba(hex, alpha) {
  const clean = `${hex || "#ffffff"}`.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean.padEnd(6, "0");
  const intValue = parseInt(expanded, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeInOutSine(value) {
  const clamped = clamp(value, 0, 1);
  return -(Math.cos(Math.PI * clamped) - 1) * 0.5;
}

export function applyRoamingProtocolMixin(DefenseGameClass) {
  const proto = DefenseGameClass.prototype;

  proto.getRoamingProtocolStageKey = function () {
    const zone = this.isSafeZone
      ? "safe"
      : this.isConquered
        ? "conquered"
        : this.isFarmingZone
          ? "farming"
          : "combat";
    return `${this.currentStageId || 0}:${zone}`;
  };

  proto.isRoamingProtocolAvailable = function () {
    return !this.isSafeZone && !this.isConquered;
  };

  proto.isRoamingProtocolActive = function () {
    return !!(
      this.roamingProtocol &&
      this.roamingProtocol.active &&
      this.roamingProtocol.timer > 0
    );
  };

  proto.getRoamingProtocolFireRateMultiplier = function () {
    return 1;
  };

  proto.getRoamingProtocolProjectileConfig = function () {
    if (!this.isRoamingProtocolActive()) {
      return {
        count: 1,
        spread: 0,
        damageMultiplier: 1,
        color: null,
      };
    }

    return {
      count: 1,
      spread: 0,
      damageMultiplier: 1,
      color: this.roamingProtocol.barrageColor,
    };
  };

  proto.getRoamingProtocolProgressIndex = function () {
    if (!this.roamingProtocol || !Array.isArray(this.roamingProtocol.collected)) {
      return 0;
    }
    return Math.max(
      0,
      Math.min(
        this.roamingProtocol.collected.length,
        this.roamingProtocol.letters?.length || 0
      )
    );
  };

  proto.getNextRoamingProtocolLetter = function () {
    if (!this.roamingProtocol || !Array.isArray(this.roamingProtocol.letters)) {
      return null;
    }
    return this.roamingProtocol.letters[this.getRoamingProtocolProgressIndex()] || null;
  };

  proto.getRoamingLetterColor = function (index) {
    return LETTER_PALETTE[index % LETTER_PALETTE.length];
  };

  // 새 커맨드 워드를 뽑고 PDX-01이 알려준다 (비개발자도 단어 뜻을 몰라도 되도록
  // 보상 설명을 항상 함께 말한다). 직전 단어는 연속으로 나오지 않음.
  proto.rollRoamingProtocolWord = function ({ announce = true } = {}) {
    if (!this.roamingProtocol) return;
    const pool = PROTOCOL_WORDS.filter((w) => w.word !== this.roamingProtocol.word);
    const pick = pool[Math.floor(Math.random() * pool.length)] || PROTOCOL_WORDS[0];
    this.roamingProtocol.word = pick.word;
    this.roamingProtocol.wordInfo = pick;
    this.roamingProtocol.letters = pick.word.split("");
    this.roamingProtocol.barrageColor = pick.color;
    if (announce && typeof this.pdxComment === "function") {
      this.pdxComment(pick.intro, { force: true });
    }
  };

  proto.ensureRoamingProtocolVisualState = function () {
    if (!this.roamingProtocol) return null;
    if (!this.roamingProtocol.visual) {
      this.roamingProtocol.visual = {
        mode: "center",
        transition: 0,
        orbitPhase: -Math.PI / 2,
        carryFullSet: false,
      };
    }
    return this.roamingProtocol.visual;
  };

  proto.resetRoamingProtocolVisualState = function (mode = "center") {
    const visual = this.ensureRoamingProtocolVisualState();
    if (!visual) return;
    visual.mode = mode;
    visual.transition = 0;
    visual.carryFullSet = false;
  };

  proto.getRoamingProtocolWorldCenter = function () {
    return {
      x: (this.worldWidth || this.canvas.width || 0) * 0.5,
      y: (this.worldHeight || this.canvas.height || 0) * 0.5,
    };
  };

  proto.projectRoamingProtocolPoint = function (worldX, worldY) {
    const screenCenterX = this.canvas.width * 0.5;
    const screenCenterY = this.canvas.height * 0.5;
    const cameraX = this.camera?.x ?? this.core.x;
    const cameraY = this.camera?.y ?? this.core.y;
    const scale = this.gameScale || 1;

    return {
      x: screenCenterX + (worldX - cameraX) * scale,
      y: screenCenterY + (worldY - cameraY) * scale,
    };
  };

  proto.ensureRoamingProtocolState = function (force = false) {
    if (!this.roamingProtocol) return;

    const stageKey = this.getRoamingProtocolStageKey();
    const available =
      typeof this.isRoamingProtocolAvailable === "function"
        ? this.isRoamingProtocolAvailable()
        : !this.isSafeZone && !this.isConquered;

    if (!available) {
      this.roamingProtocol.stageKey = stageKey;
      this.roamingProtocol.active = false;
      this.roamingProtocol.timer = 0;
      this.roamingProtocol.barrageTimer = 0;
      this.roamingProtocol.respawnTimer = 0;
      this.roamingProtocol.resetFlashTimer = 0;
      this.roamingProtocol.failedLetter = null;
      this.roamingProtocol.collected = [];
      this.roamingProtocol.shards = [];
      this.resetRoamingProtocolVisualState("center");
      return;
    }

    if (!force && this.roamingProtocol.stageKey === stageKey) {
      this.clampRoamingProtocolShards();
      return;
    }

    this.roamingProtocol.stageKey = stageKey;
    this.roamingProtocol.active = false;
    this.roamingProtocol.timer = 0;
    this.roamingProtocol.barrageTimer = 0;
    this.roamingProtocol.respawnTimer = 0;
    this.roamingProtocol.resetFlashTimer = 0;
    this.roamingProtocol.failedLetter = null;
    this.roamingProtocol.collected = [];
    this.roamingProtocol.shards = [];
    this.resetRoamingProtocolVisualState("center");

    this.rollRoamingProtocolWord();
    this.spawnRoamingProtocolShards();
    if (this.roamingProtocol.shards.length > 0 && this.onRoamingShardsActive) {
      this.onRoamingShardsActive();
    }
    debugLog("Defense", "Roaming protocol reset", stageKey);
  };

  proto.clampRoamingProtocolShards = function () {
    if (!this.roamingProtocol || !Array.isArray(this.roamingProtocol.shards)) return;

    const worldW = this.worldWidth || this.canvas.width || 0;
    const worldH = this.worldHeight || this.canvas.height || 0;
    const margin = 52;

    this.roamingProtocol.shards.forEach((shard) => {
      shard.x = clamp(shard.x, margin, Math.max(margin, worldW - margin));
      shard.y = clamp(shard.y, margin, Math.max(margin, worldH - margin));
      shard.homeX = clamp(shard.homeX ?? shard.x, margin, Math.max(margin, worldW - margin));
      shard.homeY = clamp(shard.homeY ?? shard.y, margin, Math.max(margin, worldH - margin));
    });
  };

  proto.getRoamingProtocolMinShardGap = function () {
    const worldW = this.worldWidth || this.canvas.width || 0;
    const worldH = this.worldHeight || this.canvas.height || 0;
    const minDim = Math.min(worldW, worldH);
    const baseGap = this.isMobile ? 96 : 128;
    return Math.max(baseGap, minDim * (this.isMobile ? 0.09 : 0.12));
  };

  proto.pickRoamingProtocolPoint = function (index, total, existingPoints = []) {
    const worldW = this.worldWidth || this.canvas.width || 0;
    const worldH = this.worldHeight || this.canvas.height || 0;
    const margin = Math.min(120, Math.max(60, Math.min(worldW, worldH) * 0.07));
    const roamingWide = this.isSafeZone || this.isConquered;
    const centerX = roamingWide
      ? this.coreHome.x || worldW / 2
      : this.shieldAnchor.x || this.core.x || worldW / 2;
    const centerY = roamingWide
      ? this.coreHome.y || worldH / 2
      : this.shieldAnchor.y || this.core.y || worldH / 2;
    const minDim = Math.min(worldW, worldH);
    const shieldRadius = Math.max(this.core.shieldRadius || 70, this.baseShieldRadius || 70);
    const minShardGap =
      typeof this.getRoamingProtocolMinShardGap === "function"
        ? this.getRoamingProtocolMinShardGap()
        : (this.isMobile ? 96 : 128);
    const minRadius = roamingWide
      ? Math.max(150, minDim * 0.2)
      : Math.max(shieldRadius + 72, (this.core.radius || 15) + 108);
    const maxRadius = roamingWide
      ? Math.max(minRadius + 120, minDim * 0.42)
      : Math.max(minRadius + 160, minDim * 0.48);

    let bestPoint = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 18; attempt++) {
      let x;
      let y;

      if (roamingWide) {
        const baseAngle =
          -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, total);
        const angle = baseAngle + (Math.random() - 0.5) * 0.52;
        const radius =
          minRadius + Math.random() * Math.max(1, maxRadius - minRadius);
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      } else {
        x = margin + Math.random() * Math.max(1, worldW - margin * 2);
        y = margin + Math.random() * Math.max(1, worldH - margin * 2);
      }

      x = clamp(x, margin, Math.max(margin, worldW - margin));
      y = clamp(y, margin, Math.max(margin, worldH - margin));

      let penalty = 0;
      const coreDistance = Math.hypot(x - centerX, y - centerY);
      if (coreDistance < minRadius * (roamingWide ? 0.78 : 1)) {
        penalty += (minRadius * (roamingWide ? 0.78 : 1) - coreDistance) * 2.4;
      }

      const closestShardDistance = existingPoints.length
        ? existingPoints.reduce((closest, point) => {
            const dist = Math.hypot(x - point.x, y - point.y);
            return Math.min(closest, dist);
          }, Infinity)
        : Infinity;
      if (closestShardDistance < minShardGap) {
        penalty += (minShardGap - closestShardDistance) * 6;
      }

      if (this.isSafeZone && Array.isArray(this.safeZoneFacilities)) {
        this.safeZoneFacilities.forEach((facility) => {
          const dist = Math.hypot(x - facility.x, y - facility.y);
          const avoidRadius = (facility.triggerRadius || 80) + 42;
          if (dist < avoidRadius) {
            penalty += (avoidRadius - dist) * 3;
          }
        });
      }

      const edgeDistance = Math.min(x - margin, y - margin, worldW - margin - x, worldH - margin - y);
      const spacingBonus = Number.isFinite(closestShardDistance)
        ? Math.min(closestShardDistance, minShardGap * 1.45) * 0.35
        : minShardGap * 0.2;
      const score = roamingWide
        ? coreDistance + spacingBonus - penalty + Math.random() * 18
        : edgeDistance * 0.35 + spacingBonus - penalty + Math.random() * 30;
      if (score > bestScore) {
        bestScore = score;
        bestPoint = { x, y };
      }
    }

    return (
      bestPoint || {
        x: clamp(centerX + index * 18, margin, Math.max(margin, worldW - margin)),
        y: clamp(centerY + index * 18, margin, Math.max(margin, worldH - margin)),
      }
    );
  };

  proto.spawnRoamingProtocolShards = function () {
    if (
      !this.roamingProtocol ||
      (typeof this.isRoamingProtocolAvailable === "function" &&
        !this.isRoamingProtocolAvailable())
    ) return;

    const letters = this.roamingProtocol.letters || [];
    const assignedPoints = [];
    this.roamingProtocol.shards = letters.map((letter, index) => {
      const point = this.pickRoamingProtocolPoint(index, letters.length, assignedPoints);
      assignedPoints.push(point);
      return {
        id: `${letter}-${index}-${Date.now()}`,
        letter,
        x: point.x,
        y: point.y,
        // 글자가 스폰 지점 주변을 살짝 떠다님 (정지 표적이 아니라 살아있는 느낌)
        homeX: point.x,
        homeY: point.y,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.3 + Math.random() * 0.35,
        driftRadius: 20 + Math.random() * 16,
        radius: this.roamingProtocol.shardRadius,
        color: this.getRoamingLetterColor(index),
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });
    this.roamingProtocol.collected = [];
    this.roamingProtocol.barrageTimer = 0;
    this.roamingProtocol.respawnTimer = 0;
  };

  proto.resetRoamingProtocolProgress = function ({
    failedLetter = null,
    sourceX = this.core.x,
    sourceY = this.core.y,
  } = {}) {
    if (!this.roamingProtocol) return;

    this.roamingProtocol.active = false;
    this.roamingProtocol.timer = 0;
    this.roamingProtocol.barrageTimer = 0;
    this.roamingProtocol.collected = [];
    this.roamingProtocol.shards = [];
    this.roamingProtocol.respawnTimer = 0;
    this.roamingProtocol.resetFlashTimer = 0.6;
    this.roamingProtocol.failedLetter = failedLetter;
    this.resetRoamingProtocolVisualState("center");

    if (typeof this.shakeScreen === "function") {
      this.shakeScreen(7, 4);
    }

    this.createExplosion(sourceX, sourceY, "#ff5566", 12);
    this.spawnRoamingProtocolShards();
  };

  proto.collectRoamingProtocolShard = function (index) {
    if (!this.roamingProtocol || !Array.isArray(this.roamingProtocol.shards)) return null;

    const shard = this.roamingProtocol.shards[index];
    if (!shard) return null;
    const expectedLetter = this.getNextRoamingProtocolLetter();

    if (expectedLetter && shard.letter !== expectedLetter) {
      debugLog("Defense", "Roaming protocol mismatch", {
        expected: expectedLetter,
        actual: shard.letter,
        stage: this.currentStageId,
      });
      this.resetRoamingProtocolProgress({
        failedLetter: shard.letter,
        sourceX: shard.x,
        sourceY: shard.y,
      });
      return "reset";
    }

    this.roamingProtocol.shards.splice(index, 1);
    if (!this.roamingProtocol.collected.includes(shard.letter)) {
      this.roamingProtocol.collected.push(shard.letter);
    }
    this.roamingProtocol.failedLetter = null;
    this.roamingProtocol.resetFlashTimer = 0;

    this.createExplosion(shard.x, shard.y, shard.color, 10);
    this.shockwaves.push({
      x: shard.x,
      y: shard.y,
      radius: 6,
      maxRadius: 70,
      speed: 240,
      alpha: 0.5,
      color: hexToRgba(shard.color, 0.9),
      lineWidth: 2.5,
      damageDealt: false,
    });

    if (!this.isSafeZone) {
      const bonusCharge = Math.max(
        6,
        Math.round((this.staticSystem.maxCharge || 100) * 0.08)
      );
      this.staticSystem.currentCharge = Math.min(
        this.staticSystem.maxCharge,
        this.staticSystem.currentCharge + bonusCharge
      );
    }

    if (this.roamingProtocol.collected.length >= this.roamingProtocol.letters.length) {
      this.executeRoamingProtocolWord();
      return "complete";
    }
    return "collected";
  };

  // 단어 완성 → 단어별 효과 실행. SUDO만 지속형(탄막 오버드라이브),
  // 나머지는 즉발/버프형이라 처리 후 바로 다음 단어 사이클로 넘어간다.
  proto.executeRoamingProtocolWord = function () {
    const info = this.roamingProtocol?.wordInfo || PROTOCOL_WORDS[0];

    if (info.effect === "barrage") {
      this.activateRoamingProtocolOverdrive();
      if (typeof this.pdxComment === "function") {
        this.pdxComment(info.done, { force: true });
      }
      return;
    }

    // 즉발/버프 공통 연출: 코어에서 단어 색 폭발 + 충격파
    this.roamingProtocol.active = false;
    this.roamingProtocol.shards = [];
    this.roamingProtocol.collected = [...this.roamingProtocol.letters];
    this.roamingProtocol.respawnTimer = this.roamingProtocol.respawnDelay + 3;
    this.createExplosion(this.core.x, this.core.y, info.color, 22);
    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 14,
      maxRadius: Math.max(170, this.core.shieldRadius * 2.2),
      speed: 460,
      alpha: 0.85,
      color: hexToRgba(info.color, 0.95),
      lineWidth: 5,
      damageDealt: false,
    });

    switch (info.effect) {
      case "heal": {
        const core = this.core;
        const healed = Math.min(core.maxHp, core.hp + core.maxHp * 0.5);
        const gained = Math.round(healed - core.hp);
        core.hp = healed;
        // BROKEN/RECHARGING은 자체 수리 상태머신이 shieldHp를 덮어쓰므로 ACTIVE만 회복
        if (core.shieldState === "ACTIVE") {
          core.shieldHp = core.shieldMaxHp;
        }
        this.spawnDamageNumber(core.x, core.y - 36, `REPAIR +${gained}`, info.color, true);
        break;
      }
      case "nuke": {
        this.handleExplosion(this.core.x, this.core.y, 460, 55, info.color);
        this.enemies.forEach((enemy) => this.applyKnockback(enemy, 400, 0.5, 1.2));
        this.createExplosion(this.core.x, this.core.y, info.color, 45);
        this.addScreenShake(12);
        this.triggerHitStop(0.07);
        break;
      }
      case "ping": {
        const until = performance.now() + 3200;
        this.enemies.forEach((enemy) => {
          enemy.slowMultiplier = 0.05;
          enemy.slowEndTime = until;
        });
        if (typeof this.showNextPageIntel === "function" && !this.isBossFight) {
          this.showNextPageIntel();
        }
        break;
      }
      case "warp": {
        this.protocolWarpTimer = 7;
        break;
      }
      case "cash": {
        this.protocolCashTimer = 30;
        break;
      }
    }

    if (typeof this.pdxComment === "function") {
      this.pdxComment(info.done, { force: true });
    }
    debugLog("Defense", "Protocol word executed", info.word);
  };

  proto.activateRoamingProtocolOverdrive = function () {
    if (!this.roamingProtocol) return;

    const visual = this.ensureRoamingProtocolVisualState();

    this.roamingProtocol.active = true;
    this.roamingProtocol.timer = this.roamingProtocol.duration;
    this.roamingProtocol.barrageTimer = 0;
    this.roamingProtocol.respawnTimer = 0;
    this.roamingProtocol.resetFlashTimer = 0;
    this.roamingProtocol.failedLetter = null;
    this.roamingProtocol.shards = [];
    this.roamingProtocol.collected = [...this.roamingProtocol.letters];

    if (visual) {
      visual.mode = "travel-to-core";
      visual.transition = 0;
      visual.carryFullSet = true;
    }

    const barrageColor = this.roamingProtocol.barrageColor;
    const shockwaveRadius = Math.max(180, this.core.shieldRadius * 2.5);

    this.createExplosion(this.core.x, this.core.y, barrageColor, 24);
    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 18,
      maxRadius: shockwaveRadius,
      speed: 420,
      alpha: 0.9,
      color: hexToRgba(barrageColor, 0.95),
      lineWidth: 6,
      damageDealt: false,
    });

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Math.hypot(enemy.x - this.core.x, enemy.y - this.core.y);
      if (dist > shockwaveRadius) continue;

      enemy.hp -= 12;
      this.applyKnockback(enemy, 260, 0.72, 1.3);
      this.createExplosion(enemy.x, enemy.y, barrageColor, 5);

      if (enemy.hp <= 0) {
        this.enemies.splice(i, 1);
        this.createExplosion(enemy.x, enemy.y, barrageColor, 10);
        this.awardKillData(enemy);
      }
    }

    if (this.helper && typeof this.getCurrentWeaponMode === "function") {
      const mode = this.getCurrentWeaponMode();
      if (mode?.hasReload) {
        const magazineBonus = this.helper.magazineBonus || 0;
        this.helper.currentAmmo = mode.magazineSize + magazineBonus;
        this.helper.isReloading = false;
        this.helper.reloadProgress = 0;
      }
    }

    debugLog("Defense", "F-A OVERDRIVE online", {
      stage: this.currentStageId,
      safeZone: this.isSafeZone,
      enemies: this.enemies.length,
    });
  };

  proto.fireRoamingProtocolBarrage = function () {
    if (!this.roamingProtocol || !this.isRoamingProtocolActive()) return;

    const projectileCount = Math.max(6, this.roamingProtocol.barrageCount || 10);
    const baseAngle = Math.random() * Math.PI * 2;
    const angleStep = (Math.PI * 2) / projectileCount;
    const jitter = angleStep * 0.65;
    const originRadius = this.core.radius + 8;
    const projectileSpeed = 420;
    const projectileLife = this.roamingProtocol.barrageLife || 1.4;
    const projectileDamage =
      this.turret.damage * (this.roamingProtocol.barrageDamageMultiplier || 0.42);
    const projectileColor = this.roamingProtocol.barrageColor || "#ff5cb8";

    this.core.targetOffsetX = (Math.random() - 0.5) * 6;
    this.core.targetOffsetY = (Math.random() - 0.5) * 6;

    for (let i = 0; i < projectileCount; i++) {
      const angle = baseAngle + angleStep * i + (Math.random() - 0.5) * jitter;
      const randomChar =
        BARRAGE_ASCII_CHARS[Math.floor(Math.random() * BARRAGE_ASCII_CHARS.length)];

      this.projectiles.push({
        x: this.core.x + Math.cos(angle) * originRadius,
        y: this.core.y + Math.sin(angle) * originRadius,
        target: null,
        angle,
        speed: projectileSpeed,
        damage: projectileDamage,
        radius: 4,
        life: projectileLife,
        char: randomChar,
        color: projectileColor,
      });
    }

    this.createExplosion(this.core.x, this.core.y, projectileColor, this.isMobile ? 3 : 5);
  };

  proto.updateRoamingProtocol = function (dt) {
    // 버프형 단어 타이머는 가용성과 무관하게 항상 감소
    if (this.protocolWarpTimer > 0) {
      this.protocolWarpTimer = Math.max(0, this.protocolWarpTimer - dt);
    }
    if (this.protocolCashTimer > 0) {
      this.protocolCashTimer = Math.max(0, this.protocolCashTimer - dt);
    }

    if (
      !this.roamingProtocol ||
      (typeof this.isRoamingProtocolAvailable === "function" &&
        !this.isRoamingProtocolAvailable())
    ) return;

    const visual = this.ensureRoamingProtocolVisualState();
    if (visual) {
      const spinSpeed =
        visual.mode === "travel-to-core" ||
        visual.mode === "orbit" ||
        visual.mode === "return-to-center"
          ? 7.4
          : 0.85;
      visual.orbitPhase = (visual.orbitPhase + dt * spinSpeed) % (Math.PI * 2);

      if (visual.mode === "travel-to-core") {
        visual.transition = Math.min(
          1,
          visual.transition + dt / MOBILE_ROAMING_TRAVEL_DURATION
        );
        if (visual.transition >= 1) {
          visual.mode = "orbit";
          visual.transition = 1;
        }
      } else if (visual.mode === "return-to-center") {
        visual.transition = Math.min(
          1,
          visual.transition + dt / MOBILE_ROAMING_RETURN_DURATION
        );
        if (visual.transition >= 1) {
          visual.mode = "center";
          visual.transition = 0;
          visual.carryFullSet = false;
        }
      }
    }

    if (this.roamingProtocol.resetFlashTimer > 0) {
      this.roamingProtocol.resetFlashTimer = Math.max(
        0,
        this.roamingProtocol.resetFlashTimer - dt
      );
      if (this.roamingProtocol.resetFlashTimer <= 0) {
        this.roamingProtocol.failedLetter = null;
      }
    }

    if (this.roamingProtocol.active) {
      this.roamingProtocol.timer = Math.max(0, this.roamingProtocol.timer - dt);
      this.roamingProtocol.barrageTimer += dt;

      const barrageInterval = Math.max(0.05, this.roamingProtocol.barrageInterval || 0.1);
      let volleyCount = 0;
      while (
        this.roamingProtocol.barrageTimer >= barrageInterval &&
        volleyCount < 4
      ) {
        this.roamingProtocol.barrageTimer -= barrageInterval;
        this.fireRoamingProtocolBarrage();
        volleyCount++;
      }

      if (this.roamingProtocol.timer <= 0) {
        this.roamingProtocol.active = false;
        this.roamingProtocol.barrageTimer = 0;
        this.roamingProtocol.collected = [];
        this.roamingProtocol.failedLetter = null;
        this.roamingProtocol.resetFlashTimer = 0;
        this.roamingProtocol.respawnTimer = this.roamingProtocol.respawnDelay;
        if (visual) {
          visual.mode = "return-to-center";
          visual.transition = 0;
          visual.carryFullSet = true;
        }
      }
      return;
    }

    if (this.roamingProtocol.shards.length === 0) {
      if (this.roamingProtocol.respawnTimer > 0) {
        this.roamingProtocol.respawnTimer = Math.max(
          0,
          this.roamingProtocol.respawnTimer - dt
        );
      }
      if (this.roamingProtocol.respawnTimer <= 0) {
        // 사이클 완료 후 리스폰 — 새 단어로 교체 (실수 리셋은 같은 단어 유지)
        if (this.roamingProtocol.collected.length > 0) {
          this.rollRoamingProtocolWord();
        }
        this.spawnRoamingProtocolShards();
      }
      return;
    }

    const worldW = this.worldWidth || this.canvas.width || 0;
    const worldH = this.worldHeight || this.canvas.height || 0;
    const driftMargin = 44;
    for (let i = this.roamingProtocol.shards.length - 1; i >= 0; i--) {
      const shard = this.roamingProtocol.shards[i];

      // 홈 지점 주변을 느리게 떠다님
      shard.driftPhase += dt * (shard.driftSpeed || 0.4);
      const driftR = shard.driftRadius || 24;
      shard.x = clamp(
        (shard.homeX ?? shard.x) + Math.cos(shard.driftPhase) * driftR,
        driftMargin,
        Math.max(driftMargin, worldW - driftMargin)
      );
      shard.y = clamp(
        (shard.homeY ?? shard.y) + Math.sin(shard.driftPhase * 0.8 + (shard.pulseOffset || 0)) * driftR,
        driftMargin,
        Math.max(driftMargin, worldH - driftMargin)
      );

      const captureRadius = this.core.radius + shard.radius + 6;
      const dist = Math.hypot(this.core.x - shard.x, this.core.y - shard.y);
      if (dist <= captureRadius) {
        this.collectRoamingProtocolShard(i);
        break;
      }
    }
  };

  proto.renderRoamingProtocolShards = function () {
    if (
      !this.roamingProtocol ||
      ((typeof this.isRoamingProtocolAvailable === "function" &&
        !this.isRoamingProtocolAvailable()) &&
        !this.isRoamingProtocolActive()) ||
      this.isRoamingProtocolActive() ||
      !Array.isArray(this.roamingProtocol.shards) ||
      this.roamingProtocol.shards.length === 0
    ) {
      return;
    }

    const ctx = this.ctx;
    const now = performance.now() / 1000;
    const nextLetter = this.getNextRoamingProtocolLetter();

    this.roamingProtocol.shards.forEach((shard, index) => {
      const isTarget = shard.letter === nextLetter;
      const pulse = 1 + Math.sin(now * (isTarget ? 5.2 : 3.3) + shard.pulseOffset) * (isTarget ? 0.13 : 0.08);
      const bob = Math.sin(now * (isTarget ? 3.2 : 2.5) + shard.pulseOffset) * (isTarget ? 6 : 4);
      const outerRadius = shard.radius * (isTarget ? 1.42 : 1.18) * pulse;
      const innerRadius = shard.radius * (isTarget ? 0.82 : 0.74) * pulse;
      const labelY = shard.y + bob;
      const rotation = now * 0.8 + index * 0.5;

      ctx.save();
      ctx.translate(shard.x, labelY);
      ctx.rotate(rotation);
      ctx.globalAlpha = isTarget ? 1 : 0.82;
      ctx.shadowColor = isTarget ? "#ffffff" : shard.color;
      ctx.shadowBlur = isTarget ? 26 : 18;
      ctx.fillStyle = hexToRgba(shard.color, isTarget ? 0.2 : 0.14);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = Math.cos(angle) * outerRadius;
        const y = Math.sin(angle) * outerRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isTarget ? "#ffffff" : shard.color;
      ctx.lineWidth = isTarget ? 2.6 : 2;
      ctx.stroke();

      ctx.rotate(-rotation * 1.6);
      ctx.fillStyle = hexToRgba(shard.color, isTarget ? 0.32 : 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f8ffff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(shard.letter, 0, 0);
      ctx.restore();
    });
  };

  proto.renderRoamingProtocolHud = function () {
    if (
      !this.roamingProtocol ||
      ((typeof this.isRoamingProtocolAvailable === "function" &&
        !this.isRoamingProtocolAvailable()) &&
        !this.isRoamingProtocolActive())
    ) return;

    const ctx = this.ctx;
    const letters = this.roamingProtocol.letters || [];
    const progressIndex = this.getRoamingProtocolProgressIndex();
    const isActive = this.isRoamingProtocolActive();
    const failedLetter = this.roamingProtocol.failedLetter;
    const warningActive =
      !isActive &&
      (this.roamingProtocol.resetFlashTimer || 0) > 0 &&
      !!failedLetter;
    const nextLetter = this.getNextRoamingProtocolLetter();
    const word = this.roamingProtocol.word || "----";
    const wordLabel = this.roamingProtocol.wordInfo?.label || "";
    const header = isActive
      ? `${word} 실행 중`
      : warningActive
        ? `${word} RESET`
        : `CMD: ${word}`;
    const subline = isActive
      ? `${this.roamingProtocol.timer.toFixed(1)}s — ${wordLabel}`
      : warningActive
        ? `WRONG ${failedLetter} -> RESET`
        : nextLetter
          ? `${wordLabel} | NEXT: ${nextLetter}`
          : `${progressIndex}/${letters.length} SHARDS LOCKED`;
    const boxWidth = this.isMobile ? 244 : 268;
    const boxHeight = this.isMobile ? 58 : 64;
    const x = this.canvas.width / 2 - boxWidth / 2;
    // 데스크탑은 목표 배너(top:10px, 인텔 포함 ~70px)와 겹치지 않게 그 아래로
    const y = this.isMobile ? 18 : 86;
    const frameColor = isActive
      ? this.roamingProtocol.barrageColor
      : warningActive
        ? "#ff5566"
        : "#00f0ff";

    if (this.isMobile) {
      const visual = this.ensureRoamingProtocolVisualState();
      const centerWorld = this.getRoamingProtocolWorldCenter();
      const centerScreen = this.projectRoamingProtocolPoint(centerWorld.x, centerWorld.y);
      const coreWorldX = this.core.x + (this.core.visualOffsetX || 0);
      const coreWorldY = this.core.y + (this.core.visualOffsetY || 0);
      const coreScreen = this.projectRoamingProtocolPoint(coreWorldX, coreWorldY);
      const anchorBlend = visual
        ? visual.mode === "travel-to-core"
          ? easeInOutSine(visual.transition)
          : visual.mode === "orbit"
            ? 1
            : visual.mode === "return-to-center"
              ? 1 - easeInOutSine(visual.transition)
              : 0
        : 0;
      const anchorX = lerp(centerScreen.x, coreScreen.x, anchorBlend);
      const anchorY = lerp(centerScreen.y, coreScreen.y, anchorBlend);
      const ringRadius = clamp(
        Math.min(this.canvas.width, this.canvas.height) * 0.12,
        56,
        MOBILE_ROAMING_RING_RADIUS
      );
      const orbitPhase = visual?.orbitPhase ?? -Math.PI / 2;
      const fullyCharged = isActive || !!visual?.carryFullSet;

      ctx.save();
      ctx.strokeStyle = hexToRgba(
        frameColor,
        isActive ? 0.82 : warningActive ? 0.78 : 0.42
      );
      ctx.lineWidth = isActive ? 2.4 : 1.7;
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(
        frameColor,
        isActive ? 0.34 : warningActive ? 0.28 : 0.18
      );
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(
        anchorX,
        anchorY,
        ringRadius + 7 + Math.sin(Date.now() / 220) * 2,
        orbitPhase * 0.35,
        orbitPhase * 0.35 + Math.PI * 1.35
      );
      ctx.stroke();

      ctx.fillStyle = hexToRgba(frameColor, isActive ? 0.16 : warningActive ? 0.2 : 0.12);
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, 10, 0, Math.PI * 2);
      ctx.fill();

      letters.forEach((letter, index) => {
        const badgeAngle = orbitPhase + (index * Math.PI * 2) / Math.max(1, letters.length);
        const badgeX = anchorX + Math.cos(badgeAngle) * ringRadius;
        const badgeY = anchorY + Math.sin(badgeAngle) * ringRadius;
        const color = this.getRoamingLetterColor(index);
        const isCharged = fullyCharged || index < progressIndex;
        const isNext = !fullyCharged && index === progressIndex;
        const isFailed = warningActive && failedLetter === letter;

        ctx.fillStyle = isFailed
          ? "rgba(64, 12, 22, 0.9)"
          : isCharged
            ? hexToRgba(color, 0.3)
            : isNext
              ? hexToRgba(color, 0.16)
              : "rgba(6, 10, 18, 0.72)";
        ctx.strokeStyle = isFailed
          ? "#ff7b8e"
          : isCharged
            ? color
            : isNext
              ? "#ffffff"
              : "rgba(255, 255, 255, 0.14)";
        ctx.lineWidth = isFailed ? 2.3 : isCharged ? 2 : isNext ? 2.2 : 1;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, MOBILE_ROAMING_BADGE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isNext || isFailed) {
          ctx.strokeStyle = isFailed ? "rgba(255, 123, 142, 0.38)" : hexToRgba(color, 0.42);
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, MOBILE_ROAMING_BADGE_RADIUS + 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = isFailed ? "#ffd8de" : isCharged ? "#ffffff" : isNext ? color : "#75808e";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(letter, badgeX, badgeY + 0.5);
      });

      ctx.restore();
      return;
    }

    ctx.save();
    ctx.fillStyle = warningActive ? "rgba(24, 6, 10, 0.82)" : "rgba(4, 8, 16, 0.76)";
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = this.isMobile ? "bold 13px monospace" : "bold 14px monospace";
    ctx.fillStyle = isActive ? "#fff2fb" : warningActive ? "#ffd6dd" : "#d9fbff";
    ctx.fillText(header, x + boxWidth / 2, y + 16);

    ctx.font = this.isMobile ? "10px monospace" : "11px monospace";
    ctx.fillStyle = isActive ? "#ff99dd" : warningActive ? "#ff8899" : "#7fdcff";
    ctx.fillText(subline, x + boxWidth / 2, y + 31);

    const badgeStartX = x + 24;
    const badgeGap = (boxWidth - 48) / Math.max(1, letters.length - 1);
    const badgeY = y + boxHeight - 17;

    letters.forEach((letter, index) => {
      const badgeX = badgeStartX + badgeGap * index;
      const collected = isActive || index < progressIndex;
      const isNext = !isActive && index === progressIndex;
      const color = this.getRoamingLetterColor(index);

      ctx.fillStyle = collected
        ? hexToRgba(color, 0.26)
        : isNext
          ? hexToRgba(color, 0.16)
          : "rgba(255, 255, 255, 0.06)";
      ctx.strokeStyle = collected
        ? color
        : isNext
          ? "#ffffff"
          : "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = collected ? 1.8 : isNext ? 2.2 : 1;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = collected ? "#ffffff" : isNext ? color : "#7a8794";
      ctx.font = "bold 11px monospace";
      ctx.fillText(letter, badgeX, badgeY + 0.5);
    });

    // 진행 중인 버프형 단어 타이머 (박스 아래 한 줄)
    const buffParts = [];
    if (this.protocolWarpTimer > 0) buffParts.push(`WARP ${this.protocolWarpTimer.toFixed(0)}s`);
    if (this.protocolCashTimer > 0) buffParts.push(`CASH x2 ${this.protocolCashTimer.toFixed(0)}s`);
    if (buffParts.length > 0) {
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#ffd84d";
      ctx.fillText(buffParts.join("  |  "), x + boxWidth / 2, y + boxHeight + 12);
    }

    ctx.restore();
  };
}
