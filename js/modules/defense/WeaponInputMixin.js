// Weapon system + Input handling methods (extracted from DefenseGame)
// Helper weapon, firing, reload, keyboard/mouse/touch input
// Applied as mixin to preserve `this` context

export function applyWeaponInputMixin(DefenseGameClass) {
  const proto = DefenseGameClass.prototype;

  proto.updateHelper = function(dt, now) {
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

  proto.setWeaponMode = function(modeName) {
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

  proto.getCurrentWeaponMode = function() {
    return this.weaponModes[this.helper.weaponMode] || this.weaponModes.NORMAL;
  }

  proto.applyUpgradeBonus = function(
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

  proto.fireHelperProjectile = function(target) {
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

  proto.startReload = function() {
    const mode = this.getCurrentWeaponMode();
    if (!mode.hasReload || this.helper.isReloading) return;

    this.helper.isReloading = true;
    this.helper.reloadProgress = 0;
    this.helper.reloadStartTime = performance.now();

    debugLog("Defense", "Reload started:", mode.name);
  }

  proto.updateReload = function(dt) {
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

  proto.handleExplosion = function(x, y, radius, damage, color) {
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

          this.awardKillData();
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

  proto.fireProjectile = function(target) {
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

  proto.fireProjectileToward = function(angle) {
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

  proto.handleCanvasClick = function(e) {
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

    if (this.tryInteractSafeZoneFacility(scaledClickX, scaledClickY)) {
      return;
    }

    this.fireAtPosition(scaledClickX, scaledClickY);
  }

  proto.handleCanvasTouch = function(e) {
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

        if (this.tryInteractSafeZoneFacility(scaledTouchX, scaledTouchY)) {
          continue;
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

  proto.handleCanvasTouchEnd = function(e) {
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

  proto.handleCanvasMouseDown = function(e) {
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
      if (this.tryInteractSafeZoneFacility(worldPos.x, worldPos.y)) {
        return;
      }
    }
    this.autoFireMouseActive = true;
    this.autoFireActive = true;
    this.autoFireStartTime = performance.now();
    this.autoFireTimer = this.getAutoFireInterval();
    this.fireAtPosition(0, 0);
  }


  proto.handleCanvasMouseUp = function(e) {
    if (e.button !== 0) return;
    this.autoFireMouseActive = false;
    if (!this.autoFireTouchId && !this.autoFireKeyActive) {
      this.autoFireActive = false;
      this.autoFireTimer = 0;
    }
  }

  proto.isTetrisActive = function() {
    return !!(
      window.gameManager &&
      window.gameManager.tetrisGame &&
      window.gameManager.tetrisGame.state &&
      window.gameManager.tetrisGame.state.isPlaying
    );
  }

  proto.handleKeyDown = function(e) {
    if (this.isPaused) return;
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
      return;
    }
    if (this.isTetrisActive()) {
      return;
    }

    switch (e.code) {
      case "Enter":
        if (this.conquerReady && !this.isSafeZone && !this.isConquered) {
          e.preventDefault();
          this.handleConquerClick();
        }
        break;
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
      case "KeyR":
        e.preventDefault();
        this.triggerEmergencyReturn();
        break;
      case "Backspace":
        if (!this.isSafeZone && this.onRecallRequest && !this.isRecallCasting) {
          e.preventDefault();
          this.isRecallCasting = true;
          Promise.resolve(this.onRecallRequest())
            .finally(() => {
              this.isRecallCasting = false;
            });
        }
        break;
      default:
        break;
    }
  }

  proto.handleKeyUp = function(e) {
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

  proto.screenToWorld = function(screenX, screenY) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const worldX = (screenX - centerX) / this.gameScale + this.camera.x;
    const worldY = (screenY - centerY) / this.gameScale + this.camera.y;
    return { x: worldX, y: worldY };
  }

  proto.fireAtPosition = function(x, y) {
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

  proto.getAutoFireInterval = function() {
    const effects = this.getItemEffects ? this.getItemEffects() : null;
    const bonus = effects && Number.isFinite(effects.attackSpeed) ? effects.attackSpeed : 0;
    const baseRate = Number.isFinite(this.turret.fireRate) ? this.turret.fireRate : 4;
    const rate = Math.max(0.5, baseRate * (1 + bonus));
    return 1 / rate;
  }

  proto.updateAutoFire = function(dt) {
    if (!this.autoFireActive || this.isPaused) return;
    const interval = this.getAutoFireInterval();
    this.autoFireTimer += dt;
    if (this.autoFireTimer >= interval) {
      this.autoFireTimer = 0;
      this.fireAtPosition(0, 0);
    }
  }

  proto.createExplosion = function(x, y, color, count = 10) {
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

}
