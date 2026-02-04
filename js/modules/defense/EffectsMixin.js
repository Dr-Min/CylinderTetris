// Visual effects, animations, and sound methods (extracted from DefenseGame)
// Impact effects, screen shake, intro/outro animations, particles, sounds
// Applied as mixin to preserve `this` context

export function applyEffectsMixin(DefenseGameClass) {
  const proto = DefenseGameClass.prototype;

  proto.createTauntEffect = function(x, y, radius, color) {
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

  proto.animate = function(time) {
    if (!this.isRunning) return;
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.update(deltaTime);
    this.render();
    requestAnimationFrame((t) => this.animate(t));
  }

  
  proto.playIntroAnimation = function() {
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

  
  proto.playOutroAnimation = function() {
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

  proto.impactEffect = function(options = null) {
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

  proto.playImpactSound = function() {
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

  proto.showSafeZoneText = function() {
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

  proto.playGlitchSound = function() {
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

  proto.glitchShowHP = function() {
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

  proto.shakeScreen = function() {
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

  proto.flashScreen = function(color = "#ffffff", duration = 0.2) {
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

  proto.spawnImpactParticles = function(intensity) {
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

  proto.spawnShockwave = function() {
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

}
