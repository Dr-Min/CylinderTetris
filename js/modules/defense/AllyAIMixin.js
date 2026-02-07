// Ally AI system methods (extracted from DefenseGame)
// Ally spawning, movement, AI behavior, synergy effects
// Applied as mixin to preserve `this` context

export function applyAllyAIMixin(DefenseGameClass) {
  const proto = DefenseGameClass.prototype;

  proto.spawnConqueredAllies = function(count) {
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

  proto.respawnOneAlly = function(deadAlly = null) {
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

  proto.respawnAllyWithConfig = function(deadAlly) {
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

  proto.handleAllyDeath = function(v, idx) {
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

  proto.updateMeleeAlly = function(v, dt) {
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

  proto.updateRangedAlly = function(v, dt) {
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

  proto.updateSuicideAlly = function(v, dt) {
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

  proto.updateSupportAlly = function(v, dt) {
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

  proto.triggerChainExplosion = function(x, y, triggerRadius) {
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

  proto.applySynergyEffects = function(dt) {
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

  proto.findNearestEnemy = function(v, range) {
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

  proto.smoothMoveToward = function(v, targetX, targetY, dt, speedMultiplier = 1.0) {
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

  proto.fluidPatrol = function(v, dt, baseRadius = 95) {
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

  proto.safeZoneWander = function(v, dt) {
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
    const now = performance.now();
    const isFacilityVisitActive =
      !!v.facilityVisitTarget &&
      Number.isFinite(v.facilityVisitTarget.x) &&
      Number.isFinite(v.facilityVisitTarget.y) &&
      (v.facilityVisitUntil || 0) > now;

    if (isFacilityVisitActive) {
      this.smoothMoveToward(v, v.facilityVisitTarget.x, v.facilityVisitTarget.y, dt, 0.58);
      const visitDist = Math.hypot(v.facilityVisitTarget.x - v.x, v.facilityVisitTarget.y - v.y);
      if (visitDist < 20) {
        v.facilityVisitHold = (v.facilityVisitHold || 0) + dt;
      } else {
        v.facilityVisitHold = 0;
      }
    } else if (v.facilityVisitTarget) {
      v.facilityVisitTarget = null;
      v.facilityVisitUntil = 0;
      v.facilityVisitFacilityId = null;
      v.facilityVisitHold = 0;
    }

    if (!isFacilityVisitActive) switch (v.safeState) {
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

      case 'approaching': {
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
      }

      case 'chatting': {
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
      }

      case 'walkingTogether': {
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

  proto.keepOutsideBarrier = function(v) {
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

  proto.moveTowardTarget = function(v, target, dt) {
    this.smoothMoveToward(v, target.x, target.y, dt, 1.0);
  }

  proto.patrolAlly = function(v, dt) {
    this.fluidPatrol(v, dt);
  }

  proto.separateAllViruses = function() {
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

  proto.killEnemy = function(enemy) {
    const enemyIdx = this.enemies.indexOf(enemy);
    if (enemyIdx > -1) {
      this.enemies.splice(enemyIdx, 1);
      this.createExplosion(enemy.x, enemy.y, "#00ff00", 10);

      this.awardKillData();

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

  proto.fireAllyProjectile = function(v, target) {
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

  proto.spawnSynergySwarm = function(x, y, count) {
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

}
