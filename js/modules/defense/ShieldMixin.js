// Shield system methods (extracted from DefenseGame)
// Shield activation, UI, visuals, and conquest shield break
// Applied as mixin to preserve `this` context

export function applyShieldMixin(DefenseGameClass) {
  const proto = DefenseGameClass.prototype;

  proto.playConquestShieldBreak = function(onComplete) {
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

  proto.toggleShield = function() {
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

  proto.updateShieldVisualTargets = function() {
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

  proto.updateShieldBtnUI = function(text, color, loadingProgress = null) {
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

  proto.handleShieldButtonClick = function() {
    if (this.shieldBtnMode === "RETURN") {
      this.triggerEmergencyReturn();
      return;
    }
    this.toggleShield();
  }

  proto.expandShield = function() {
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


  

}
