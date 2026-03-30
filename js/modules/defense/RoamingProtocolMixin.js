const debugLog = window.debugLog || function () {};

const LETTER_COLORS = {
  F: "#42f59e",
  E: "#48d7ff",
  D: "#4b8cff",
  C: "#9f72ff",
  B: "#ff5cb8",
  A: "#ff944d",
};

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

  proto.isRoamingProtocolActive = function () {
    return !!(
      this.roamingProtocol &&
      this.roamingProtocol.active &&
      this.roamingProtocol.timer > 0
    );
  };

  proto.getRoamingProtocolFireRateMultiplier = function () {
    return this.isRoamingProtocolActive()
      ? this.roamingProtocol.fireRateMultiplier
      : 1;
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
      count: this.roamingProtocol.barrageCount,
      spread: this.roamingProtocol.barrageSpread,
      damageMultiplier: this.roamingProtocol.barrageDamageMultiplier,
      color: this.roamingProtocol.barrageColor,
    };
  };

  proto.ensureRoamingProtocolState = function (force = false) {
    if (!this.roamingProtocol) return;

    const stageKey = this.getRoamingProtocolStageKey();
    if (!force && this.roamingProtocol.stageKey === stageKey) {
      this.clampRoamingProtocolShards();
      return;
    }

    this.roamingProtocol.stageKey = stageKey;
    this.roamingProtocol.active = false;
    this.roamingProtocol.timer = 0;
    this.roamingProtocol.respawnTimer = 0;
    this.roamingProtocol.collected = [];
    this.roamingProtocol.shards = [];

    this.spawnRoamingProtocolShards();
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
    });
  };

  proto.pickRoamingProtocolPoint = function (index, total) {
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
    const minRadius = roamingWide
      ? Math.max(150, minDim * 0.2)
      : Math.max(28, (this.core.shieldRadius || 70) * 0.35);
    const maxRadius = roamingWide
      ? Math.max(minRadius + 120, minDim * 0.42)
      : Math.max(minRadius + 12, (this.core.shieldRadius || 70) - 18);

    let bestPoint = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 12; attempt++) {
      const baseAngle =
        -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, total);
      const angle = baseAngle + (Math.random() - 0.5) * (roamingWide ? 0.52 : 0.3);
      const radius =
        minRadius + Math.random() * Math.max(1, maxRadius - minRadius);
      let x = centerX + Math.cos(angle) * radius;
      let y = centerY + Math.sin(angle) * radius;

      x = clamp(x, margin, Math.max(margin, worldW - margin));
      y = clamp(y, margin, Math.max(margin, worldH - margin));

      let penalty = 0;
      const coreDistance = Math.hypot(x - centerX, y - centerY);
      if (roamingWide && coreDistance < minRadius * 0.78) {
        penalty += (minRadius * 0.78 - coreDistance) * 2;
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

      const score = coreDistance - penalty + Math.random() * 18;
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
    if (!this.roamingProtocol) return;

    const letters = this.roamingProtocol.letters || [];
    this.roamingProtocol.shards = letters.map((letter, index) => {
      const point = this.pickRoamingProtocolPoint(index, letters.length);
      return {
        id: `${letter}-${index}-${Date.now()}`,
        letter,
        x: point.x,
        y: point.y,
        radius: this.roamingProtocol.shardRadius,
        color: LETTER_COLORS[letter] || "#ffffff",
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });
    this.roamingProtocol.collected = [];
    this.roamingProtocol.respawnTimer = 0;
  };

  proto.collectRoamingProtocolShard = function (index) {
    if (!this.roamingProtocol || !Array.isArray(this.roamingProtocol.shards)) return;

    const shard = this.roamingProtocol.shards[index];
    if (!shard) return;

    this.roamingProtocol.shards.splice(index, 1);
    if (!this.roamingProtocol.collected.includes(shard.letter)) {
      this.roamingProtocol.collected.push(shard.letter);
    }

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
      this.activateRoamingProtocolOverdrive();
    }
  };

  proto.activateRoamingProtocolOverdrive = function () {
    if (!this.roamingProtocol) return;

    this.roamingProtocol.active = true;
    this.roamingProtocol.timer = this.roamingProtocol.duration;
    this.roamingProtocol.respawnTimer = 0;
    this.roamingProtocol.shards = [];
    this.roamingProtocol.collected = [...this.roamingProtocol.letters];

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
        this.awardKillData();
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

  proto.updateRoamingProtocol = function (dt) {
    if (!this.roamingProtocol) return;

    if (this.roamingProtocol.active) {
      this.roamingProtocol.timer = Math.max(0, this.roamingProtocol.timer - dt);
      if (this.roamingProtocol.timer <= 0) {
        this.roamingProtocol.active = false;
        this.roamingProtocol.collected = [];
        this.roamingProtocol.respawnTimer = this.roamingProtocol.respawnDelay;
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
        this.spawnRoamingProtocolShards();
      }
      return;
    }

    for (let i = this.roamingProtocol.shards.length - 1; i >= 0; i--) {
      const shard = this.roamingProtocol.shards[i];
      const captureRadius = this.core.radius + shard.radius + 4;
      const dist = Math.hypot(this.core.x - shard.x, this.core.y - shard.y);
      if (dist <= captureRadius) {
        this.collectRoamingProtocolShard(i);
      }
    }
  };

  proto.renderRoamingProtocolShards = function () {
    if (
      !this.roamingProtocol ||
      this.isRoamingProtocolActive() ||
      !Array.isArray(this.roamingProtocol.shards) ||
      this.roamingProtocol.shards.length === 0
    ) {
      return;
    }

    const ctx = this.ctx;
    const now = performance.now() / 1000;

    this.roamingProtocol.shards.forEach((shard, index) => {
      const pulse = 1 + Math.sin(now * 3.3 + shard.pulseOffset) * 0.08;
      const bob = Math.sin(now * 2.5 + shard.pulseOffset) * 4;
      const outerRadius = shard.radius * 1.18 * pulse;
      const innerRadius = shard.radius * 0.74 * pulse;
      const labelY = shard.y + bob;
      const rotation = now * 0.8 + index * 0.5;

      ctx.save();
      ctx.translate(shard.x, labelY);
      ctx.rotate(rotation);
      ctx.shadowColor = shard.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = hexToRgba(shard.color, 0.14);
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

      ctx.strokeStyle = shard.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.rotate(-rotation * 1.6);
      ctx.fillStyle = hexToRgba(shard.color, 0.22);
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
    if (!this.roamingProtocol) return;

    const ctx = this.ctx;
    const letters = this.roamingProtocol.letters || [];
    const collectedSet = new Set(this.roamingProtocol.collected || []);
    const isActive = this.isRoamingProtocolActive();
    const boxWidth = this.isMobile ? 244 : 268;
    const boxHeight = this.isMobile ? 58 : 64;
    const x = this.canvas.width / 2 - boxWidth / 2;
    const y = this.isMobile ? 18 : 16;
    const header = isActive ? "F-A OVERDRIVE" : "F-A DRIVE";
    const subline = isActive
      ? `${this.roamingProtocol.timer.toFixed(1)}s CORE BARRAGE`
      : `${collectedSet.size}/${letters.length} SHARDS COLLECTED`;

    ctx.save();
    ctx.fillStyle = "rgba(4, 8, 16, 0.76)";
    ctx.strokeStyle = isActive ? this.roamingProtocol.barrageColor : "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = this.isMobile ? "bold 13px monospace" : "bold 14px monospace";
    ctx.fillStyle = isActive ? "#fff2fb" : "#d9fbff";
    ctx.fillText(header, x + boxWidth / 2, y + 16);

    ctx.font = this.isMobile ? "10px monospace" : "11px monospace";
    ctx.fillStyle = isActive ? "#ff99dd" : "#7fdcff";
    ctx.fillText(subline, x + boxWidth / 2, y + 31);

    const badgeStartX = x + 24;
    const badgeGap = (boxWidth - 48) / Math.max(1, letters.length - 1);
    const badgeY = y + boxHeight - 17;

    letters.forEach((letter, index) => {
      const badgeX = badgeStartX + badgeGap * index;
      const collected = isActive || collectedSet.has(letter);
      const color = LETTER_COLORS[letter] || "#ffffff";

      ctx.fillStyle = collected ? hexToRgba(color, 0.26) : "rgba(255, 255, 255, 0.06)";
      ctx.strokeStyle = collected ? color : "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = collected ? 1.8 : 1;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = collected ? "#ffffff" : "#7a8794";
      ctx.font = "bold 11px monospace";
      ctx.fillText(letter, badgeX, badgeY + 0.5);
    });

    ctx.restore();
  };
}
