// Rendering methods (extracted from DefenseGame)
// Conquered visuals, dropped items, main render, boss UI, static effects
// Applied as mixin to preserve `this` context

export function applyRenderMixin(DefenseGameClass) {
  const proto = DefenseGameClass.prototype;

  proto.renderConqueredVisuals = function() {
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


  
  proto.renderDroppedItems = function() {
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

  
  proto.renderCollectorViruses = function() {
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

  proto.drawFacilityBox = function(w, h, d, frontColor, topColor, sideColor, strokeColor) {
    const ctx = this.ctx;

    ctx.fillStyle = frontColor;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2 - d, -h / 2 - d);
    ctx.lineTo(-w / 2 + d, -h / 2 - d);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w / 2, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(w / 2 - d, h / 2 - d);
    ctx.lineTo(w / 2 - d, -h / 2 - d);
    ctx.closePath();
    ctx.fillStyle = sideColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(-w / 2 + d, -h / 2 - d);
    ctx.lineTo(w / 2 - d, -h / 2 - d);
    ctx.lineTo(w / 2, -h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 - d, h / 2 - d);
    ctx.stroke();
  };

  proto.renderFacilityLabel = function(facility, actionText, isActive, labelY) {
    const ctx = this.ctx;
    const inputHint = this.isMobile ? "TAP" : "CLICK";

    ctx.globalAlpha = isActive ? 1 : 0.78;
    ctx.fillStyle = "#e8f8ee";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${inputHint}: ${actionText}`, 0, labelY - 12);

    ctx.fillStyle = isActive ? facility.accent : facility.color;
    ctx.font = "bold 10px monospace";
    ctx.fillText(facility.label, 0, labelY);
    ctx.globalAlpha = 1;
  };

  proto.assignFacilityOwnerTarget = function(owner, state, baseX, baseY, now) {
    const leashRadius = Math.max(20, owner.leashRadius || 90);
    const minRadius = Math.min(
      Math.max(6, owner.wanderMinRadius || 16),
      Math.max(6, leashRadius - 4)
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = minRadius + Math.random() * Math.max(0, leashRadius - minRadius);
    state.targetX = baseX + Math.cos(angle) * radius;
    state.targetY = baseY + Math.sin(angle) * radius;

    const speedMin = Math.max(8, owner.wanderSpeedMin || 20);
    const speedMax = Math.max(speedMin, owner.wanderSpeedMax || speedMin + 14);
    const boostChance = Math.max(0, Math.min(1, owner.boostChance || 0));
    const boostMult = Math.max(1, owner.boostMult || 1);
    let speed = speedMin + Math.random() * (speedMax - speedMin);
    if (Math.random() < boostChance) {
      speed *= boostMult;
    }
    state.travelSpeed = speed;

    const retargetMin = Math.max(0.2, owner.retargetMin || 0.8);
    const retargetMax = Math.max(retargetMin, owner.retargetMax || retargetMin + 1.2);
    state.nextRetargetAt = now + retargetMin + Math.random() * (retargetMax - retargetMin);

    const idleChance = Math.max(0, Math.min(1, owner.idleChance || 0));
    if (Math.random() < idleChance) {
      const idleMin = Math.max(0, owner.idleMin || 0.2);
      const idleMax = Math.max(idleMin, owner.idleMax || 0.6);
      state.holdUntil = now + idleMin + Math.random() * (idleMax - idleMin);
    } else {
      state.holdUntil = now;
    }
  };

  proto.updateFacilityOwnerPosition = function(facility, owner, now) {
    if (!this.safeZoneOwnerStates) {
      this.safeZoneOwnerStates = Object.create(null);
    }

    const phase = owner.phase || 0;
    const baseX = facility.x + (owner.offsetX || 0);
    const baseY = facility.y + (owner.offsetY || 0);
    const stateKey = facility.id || owner.name || owner.role || "owner";

    let state = this.safeZoneOwnerStates[stateKey];
    if (!state) {
      state = {
        x: baseX,
        y: baseY,
        targetX: baseX,
        targetY: baseY,
        vx: 0,
        vy: 0,
        travelSpeed: owner.wanderSpeedMin || 20,
        nextRetargetAt: now,
        holdUntil: now,
        lastTime: now,
        noiseSeedX: Math.random() * Math.PI * 2,
        noiseSeedY: Math.random() * Math.PI * 2,
        stepPhase: Math.random() * Math.PI * 2,
        lean: 0,
        lookX: 0,
        lookY: 0,
        scaleX: 1,
        scaleY: 1,
      };
      this.safeZoneOwnerStates[stateKey] = state;
    }

    if (
      !Number.isFinite(state.x) ||
      !Number.isFinite(state.y) ||
      !Number.isFinite(state.vx) ||
      !Number.isFinite(state.vy)
    ) {
      state.x = baseX;
      state.y = baseY;
      state.targetX = baseX;
      state.targetY = baseY;
      state.vx = 0;
      state.vy = 0;
      state.lastTime = now;
    }

    const dtRaw = now - (state.lastTime || now);
    const dt = Math.min(0.08, Math.max(0.008, Number.isFinite(dtRaw) ? dtRaw : 0.016));
    state.lastTime = now;

    if (
      !Number.isFinite(state.targetX) ||
      !Number.isFinite(state.targetY) ||
      now >= (state.nextRetargetAt || 0) ||
      Math.hypot(state.targetX - state.x, state.targetY - state.y) < 4
    ) {
      this.assignFacilityOwnerTarget(owner, state, baseX, baseY, now);
    }

    let desiredVX = 0;
    let desiredVY = 0;
    const isHolding = now < (state.holdUntil || 0);

    if (!isHolding) {
      const toTargetX = state.targetX - state.x;
      const toTargetY = state.targetY - state.y;
      const targetDist = Math.hypot(toTargetX, toTargetY);
      if (targetDist > 0.001) {
        const speed = Math.max(8, state.travelSpeed || owner.wanderSpeedMin || 20);
        desiredVX = (toTargetX / targetDist) * speed;
        desiredVY = (toTargetY / targetDist) * speed;
      }
    }

    const coreX = this.core?.x;
    const coreY = this.core?.y;
    const approachRadius = Math.max(0, owner.approachRadius || 0);
    if (Number.isFinite(coreX) && Number.isFinite(coreY) && approachRadius > 0) {
      const toCoreX = coreX - state.x;
      const toCoreY = coreY - state.y;
      const coreDist = Math.hypot(toCoreX, toCoreY);
      if (coreDist > 0.001 && coreDist < approachRadius) {
        const nearRatio = (approachRadius - coreDist) / approachRadius;
        const approachSpeed = Math.max(0, owner.approachSpeed || 0);
        const minCoreGap = Math.max(0, owner.minCoreGap || 20);
        if (coreDist > minCoreGap) {
          desiredVX += (toCoreX / coreDist) * (approachSpeed * nearRatio);
          desiredVY += (toCoreY / coreDist) * (approachSpeed * nearRatio);
        }
      }
    }

    const jitter = Math.max(0, owner.driftJitter || 10);
    const jitterScale = isHolding ? 0.35 : 1;
    desiredVX += Math.cos(now * 1.9 + state.noiseSeedX) * jitter * jitterScale;
    desiredVY += Math.sin(now * 2.3 + state.noiseSeedY) * jitter * jitterScale;

    const accel = Math.max(40, owner.wanderAccel || 140);
    const deltaVX = desiredVX - state.vx;
    const deltaVY = desiredVY - state.vy;
    const deltaVMag = Math.hypot(deltaVX, deltaVY);
    if (deltaVMag > 0.001) {
      const maxDelta = accel * dt;
      const step = Math.min(maxDelta, deltaVMag);
      state.vx += (deltaVX / deltaVMag) * step;
      state.vy += (deltaVY / deltaVMag) * step;
    }

    const dragRate = isHolding ? 5.5 : 3.1;
    const drag = Math.max(0, 1 - dragRate * dt);
    state.vx *= drag;
    state.vy *= drag;

    const maxSpeed = Math.max(12, (owner.wanderSpeedMax || 32) * 1.4);
    const speedMag = Math.hypot(state.vx, state.vy);
    if (speedMag > maxSpeed) {
      const scale = maxSpeed / speedMag;
      state.vx *= scale;
      state.vy *= scale;
    }

    state.x += state.vx * dt;
    state.y += state.vy * dt;

    const leashRadius = Math.max(20, owner.leashRadius || 90);
    const leashDX = state.x - baseX;
    const leashDY = state.y - baseY;
    const leashDist = Math.hypot(leashDX, leashDY);
    if (leashDist > leashRadius && leashDist > 0.001) {
      const scale = leashRadius / leashDist;
      state.x = baseX + leashDX * scale;
      state.y = baseY + leashDY * scale;
      const nx = leashDX / leashDist;
      const ny = leashDY / leashDist;
      const outwardSpeed = state.vx * nx + state.vy * ny;
      if (outwardSpeed > 0) {
        state.vx -= nx * outwardSpeed;
        state.vy -= ny * outwardSpeed;
      }
      state.targetX = baseX - nx * (leashRadius * (0.2 + Math.random() * 0.3));
      state.targetY = baseY - ny * (leashRadius * (0.2 + Math.random() * 0.3));
      state.nextRetargetAt = Math.min(state.nextRetargetAt || now, now + 0.25);
    }

    const finalSpeed = Math.hypot(state.vx, state.vy);
    const motion = Math.min(1, finalSpeed / 70);
    state.stepPhase += dt * (2.8 + finalSpeed * 0.14);
    const bob = Math.sin(state.stepPhase) * (1 + motion * 1.4);
    const leanTarget = Math.max(-0.28, Math.min(0.28, state.vx / 72));
    state.lean = state.lean * 0.82 + leanTarget * 0.18;
    const lookXTarget = Math.max(-2.8, Math.min(2.8, state.vx / 20));
    const lookYTarget = Math.max(-1.8, Math.min(1.8, state.vy / 24));
    state.lookX = state.lookX * 0.78 + lookXTarget * 0.22;
    state.lookY = state.lookY * 0.78 + lookYTarget * 0.22;
    state.scaleX = 1 + motion * 0.08;
    state.scaleY = 1 - motion * 0.06;

    if (!this.safeZoneOwnerActors) {
      this.safeZoneOwnerActors = Object.create(null);
    }
    let ownerActor = this.safeZoneOwnerActors[stateKey];
    if (!ownerActor) {
      ownerActor = {
        x: state.x,
        y: state.y,
        radius: 10,
        isSpeaking: false,
      };
      this.safeZoneOwnerActors[stateKey] = ownerActor;
    }
    ownerActor.x = state.x;
    ownerActor.y = state.y;
    ownerActor.radius = 10;
    ownerActor.facilityId = facility.id;
    ownerActor.ownerName = owner.name;
    ownerActor.ownerRole = owner.role;

    return {
      x: state.x,
      y: state.y + bob + Math.sin(now * 2.2 + phase) * 1.1,
      lean: state.lean,
      lookX: state.lookX,
      lookY: state.lookY,
      scaleX: state.scaleX,
      scaleY: state.scaleY,
      motion,
    };
  };

  proto.renderFacilityOwner = function(facility, now, isActive) {
    const owner = facility.owner;
    if (!owner) return;

    const ctx = this.ctx;
    const pos = this.updateFacilityOwnerPosition(facility, owner, now);
    const x = pos.x;
    const y = pos.y;
    const lean = pos.lean || 0;
    const lookX = pos.lookX || 0;
    const lookY = pos.lookY || 0;
    const scaleX = pos.scaleX || 1;
    const scaleY = pos.scaleY || 1;
    const motion = pos.motion || 0;
    const blink = Math.sin(now * 1.75 + (owner.phase || 0) * 3.1) > 0.92 ? 0.25 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.scale(scaleX, scaleY);

    ctx.globalAlpha = isActive ? 1 : 0.9;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (owner.role === "merchant") {
      const headX = lookX * 0.45;
      const headY = -10 + lookY * 0.35;
      const visorSwing = Math.sin(now * (5.8 + motion * 3.2) + (owner.phase || 0)) * (0.8 + motion * 1.6);

      ctx.fillStyle = owner.bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 2 + lookY * 0.2, 10, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(headX, headY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = owner.gearColor;
      ctx.fillRect(headX - 7, headY - 2, 14, 4);

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(headX - 5, headY - 1, 10, Math.max(1, 2 * blink));

      ctx.fillStyle = owner.accentColor;
      ctx.fillRect(8 + visorSwing, -2, 7, 4);
      ctx.strokeStyle = owner.accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(8 + visorSwing, -2, 7, 4);
    } else {
      const toolSwing = Math.sin(now * (4.7 + motion * 2.4) + (owner.phase || 0)) * (1.4 + motion * 2.2);

      ctx.fillStyle = owner.bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 2 + lookY * 0.2, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = owner.gearColor;
      ctx.fillRect(-8 + lookX * 0.25, -13 + lookY * 0.2, 16, 8);
      ctx.fillStyle = "#111";
      ctx.fillRect(-5 + lookX * 0.35, -10 + lookY * 0.2, 10, Math.max(1, 2 * blink));

      ctx.strokeStyle = owner.accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 2 + toolSwing * 0.15);
      ctx.lineTo(17, -2 + toolSwing * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(17, -2 + toolSwing * 0.25);
      ctx.lineTo(20, -5 + toolSwing * 0.2);
      ctx.moveTo(17, -2 + toolSwing * 0.25);
      ctx.lineTo(20, 1 + toolSwing * 0.2);
      ctx.stroke();
    }

    ctx.fillStyle = owner.accentColor;
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(owner.name, 0, -24);
    ctx.globalAlpha = 1;

    ctx.restore();
  };

  proto.renderUpgradeShopFacility = function(facility, now, isActive) {
    const ctx = this.ctx;
    const pulse = 0.8 + Math.sin(now * 2.8) * 0.2;
    const w = 58;
    const h = 74;
    const d = 16;

    ctx.save();
    ctx.translate(facility.x, facility.y);

    ctx.globalAlpha = isActive ? 0.88 : 0.45;
    ctx.strokeStyle = facility.accent;
    ctx.lineWidth = isActive ? 2.6 : 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 4, 58, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowColor = facility.accent;
    ctx.shadowBlur = isActive ? 20 : 9;
    this.drawFacilityBox(
      w,
      h,
      d,
      "rgba(10, 18, 18, 0.95)",
      "rgba(0, 240, 255, 0.35)",
      "rgba(255, 204, 0, 0.25)",
      facility.color
    );
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(0, 12, 18, 0.9)";
    ctx.fillRect(-12, -20, 24, 46);
    ctx.strokeStyle = facility.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(-12, -20, 24, 46);

    for (let i = 0; i < 4; i++) {
      const y = -15 + i * 10;
      const glow = (Math.sin(now * 4 + i * 0.8) + 1) * 0.5;
      ctx.fillStyle = `rgba(0, 255, 230, ${0.25 + glow * 0.45})`;
      ctx.fillRect(-9, y, 18, 4);
    }

    ctx.fillStyle = "#224a3a";
    ctx.fillRect(-40, 13, 12, 10);
    ctx.fillStyle = facility.accent;
    ctx.fillRect(-37, 9, 8, 4);

    ctx.fillStyle = "#3a2c14";
    ctx.fillRect(29, 12, 13, 11);
    ctx.fillStyle = facility.color;
    ctx.beginPath();
    ctx.arc(35, 9, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, -h / 2 - d - 12);
    ctx.rotate(Math.sin(now * 1.7) * 0.25);
    ctx.strokeStyle = facility.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 0);
    ctx.lineTo(2, 0);
    ctx.lineTo(2, 8);
    ctx.lineTo(-2, 8);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    this.renderFacilityLabel(
      facility,
      facility.openHint || "UPGRADE",
      isActive,
      -h / 2 - d - 32 - pulse
    );

    ctx.restore();
  };

  proto.renderDismantlerFacility = function(facility, now, isActive) {
    const ctx = this.ctx;
    const w = 98;
    const h = 34;
    const d = 12;
    const press = (Math.sin(now * 3.5) + 1) * 0.5;

    ctx.save();
    ctx.translate(facility.x, facility.y);

    ctx.globalAlpha = isActive ? 0.86 : 0.46;
    ctx.strokeStyle = facility.accent;
    ctx.lineWidth = isActive ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.rect(-58, -18, 116, 44);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowColor = facility.color;
    ctx.shadowBlur = isActive ? 18 : 8;
    this.drawFacilityBox(
      w,
      h,
      d,
      "rgba(24, 14, 10, 0.95)",
      "rgba(255, 120, 40, 0.32)",
      "rgba(255, 190, 80, 0.2)",
      facility.color
    );
    ctx.shadowBlur = 0;

    const beltY = 4;
    ctx.fillStyle = "rgba(12, 12, 12, 0.95)";
    ctx.fillRect(-41, beltY, 82, 10);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.strokeRect(-41, beltY, 82, 10);

    const beltOffset = ((now * 65) % 14) - 7;
    ctx.strokeStyle = "#999";
    for (let x = -36 + beltOffset; x <= 36; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, beltY + 2);
      ctx.lineTo(x + 6, beltY + 8);
      ctx.stroke();
    }

    const headY = -h / 2 - d + 4 + press * 6;
    ctx.fillStyle = "#5e5e5e";
    ctx.fillRect(10, headY, 22, 14);
    ctx.strokeStyle = facility.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, headY, 22, 14);

    ctx.strokeStyle = facility.accent;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const sparkX = 21 + i * 4;
      const sparkY = headY + 15 + Math.sin(now * 12 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(sparkX, sparkY);
      ctx.lineTo(sparkX + 2, sparkY + 3);
      ctx.stroke();
    }

    ctx.fillStyle = "#55453a";
    ctx.beginPath();
    ctx.arc(-45, 12, 6, 0, Math.PI * 2);
    ctx.arc(-36, 14, 5, 0, Math.PI * 2);
    ctx.arc(-30, 11, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3d4d5a";
    ctx.fillRect(42, 8, 8, 12);
    ctx.fillRect(51, 10, 7, 10);

    this.renderFacilityLabel(
      facility,
      facility.openHint || "DISMANTLE",
      isActive,
      -h / 2 - d - 30
    );

    ctx.restore();
  };

  proto.renderSafeZoneFacilities = function() {
    if (!this.isSafeZone || !Array.isArray(this.safeZoneFacilities)) return;

    const now = performance.now() / 1000;
    this.safeZoneFacilities.forEach((facility) => {
      const isActive = this.activeSafeZoneFacilityId === facility.id;

      if (facility.kind === "shop") {
        this.renderUpgradeShopFacility(facility, now, isActive);
      } else if (facility.kind === "dismantler") {
        this.renderDismantlerFacility(facility, now, isActive);
      }

      this.renderFacilityOwner(facility, now, isActive);
    });
  };

  
  proto.render = function() {
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

    // Keep facility visuals above the core when overlapping in Safe Zone.
    this.renderSafeZoneFacilities();

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

  
  proto.renderBossUI = function() {
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

  
  proto.renderStaticEffects = function() {
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

  
  proto.renderSpeechBubbles = function() {
    const ctx = this.ctx;

    this.activeSpeechBubbles.forEach(bubble => {
      const v = bubble.virus;
      if (!v) return;

      ctx.save();
      ctx.globalAlpha = bubble.opacity;

      const radius = Number.isFinite(v.radius) ? v.radius : 10;
      const textY = v.y - radius - 15;

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


  
  proto.renderMiningEffect = function(ctx, time) {
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
