const debugLog = window.debugLog || function () {};

export class MiningManager {
  constructor() {
    this.territories = {};
    this.miners = [];

    this.cabinet = {
      storedData: 0,
      x: 0,
      y: 0,
      width: 40,
      height: 60,
    };

    this.dataPerTrip = 5;
    this.miningDuration = 2.0;
    this.depositDuration = 1.0;
    this.baseMinerSpeed = 150;
    this.minerSpeed = this.baseMinerSpeed;
    this.offScreenDelay = 5.0;
    this.minerCount = 5;
    this.travelBuffer = 4;

    this.floatingTexts = [];
    this._bgLogTimer = 0;
    this._currentSceneStageId = null;
    this._currentSceneIsSafe = false;
    this._currentSceneIsConquered = false;
    this.pendingData = 0;
    this._territoryExit = null;
    this._lastCanvas = null;
    this._lastCore = null;
    this._worldW = 0;
    this._worldH = 0;
  }

  registerTerritory(stageId) {
    const id = String(stageId);
    if (this.territories[id]) {
      console.log(`[Mining] ? Territory ${id} already registered. Skipping.`);
      return;
    }
    this.territories[id] = {
      minerCount: this.minerCount,
      tripTimer: 0,
    };
    console.log(`[Mining] Territory ${id} registered successfully.`);
  }

  onSceneChange(stageId, isSafeZone, canvas, core, isConquered = false) {
    const id = String(stageId);
    const isPrimarySafe = isSafeZone && id === "0";
    this._currentSceneStageId = id;
    this._currentSceneIsSafe = isPrimarySafe;
    this._currentSceneIsConquered = !!isConquered;
    this.miners = [];

    console.log(`[Mining] onSceneChange: stageId=${stageId} (type:${typeof stageId}), isSafeZone=${isSafeZone}`);
    this._lastCanvas = canvas || null;
    this._lastCore = core || null;
    this._worldW = core?.worldWidth ?? canvas?.width ?? 0;
    this._worldH = core?.worldHeight ?? canvas?.height ?? 0;

    if (isPrimarySafe) {
      this.minerSpeed = this.baseMinerSpeed;
      this.initCabinet(canvas, core);
      this._spawnSafeZoneMiners(canvas);
      console.log(`[Mining] Safe zone entered - spawned ${this.miners.length} deposit miners`);
    } else {
      this.minerSpeed = Math.round(this.baseMinerSpeed * 1.6);
      if (this._currentSceneIsConquered && this.territories[id]) {
        if (!core || typeof core.x !== 'number') {
           console.error("[Mining] Core is invalid or missing coordinates! Cannot spawn miners.");
           return;
        }
        this._territoryExit = this._getTerritoryExit(canvas);
        this._spawnTerritoryMiners(core, canvas);
        console.log(`[Mining] Territory ${id} entered - spawned ${this.miners.length} miners`);
      } else {
        console.warn(`[Mining] ? Stage ${id} is NOT registered as a territory. No miners spawned. Known territories:`, Object.keys(this.territories));
      }
    }
  }

  update(dt, core, canvas, isSafeZone, createExplosion, isConquered = false) {
    const safeNow = !!isSafeZone;
    const conqueredNow = !!isConquered;
    if (this._currentSceneIsSafe !== safeNow) {
      this._currentSceneIsSafe = safeNow;
      this._currentSceneIsConquered = conqueredNow;
      this.miners = [];
      if (safeNow) {
        this.initCabinet(canvas, core);
        this._spawnSafeZoneMiners(canvas);
      } else {
        const id = this._currentSceneStageId;
        if (id && this._currentSceneIsConquered && this.territories[id] && core && typeof core.x === "number") {
          this._territoryExit = this._getTerritoryExit(canvas);
          this._spawnTerritoryMiners(core, canvas);
        }
      }
    }
    this._updateBackground(dt);
    this._updateFloatingTexts(dt);
    if (!this._currentSceneIsSafe && this._currentSceneIsConquered && this.miners.length === 0) {
      const id = this._currentSceneStageId;
      if (id && this.territories[id] && core && typeof core.x === "number") {
        this._territoryExit = this._getTerritoryExit(canvas);
        this._spawnTerritoryMiners(core, canvas);
      }
    }
    if (this._currentSceneIsSafe && this.pendingData > 0 && this.miners.length === 0) {
      this._spawnSafeZoneMiners(canvas);
    }

    for (const miner of this.miners) {
      this._updateMiner(miner, dt, core, canvas, isSafeZone, createExplosion);
      if (this._currentSceneIsSafe) {
        this._pushOutOfCabinet(miner, 2);
      }
    }
  }

  render(ctx, time, isMobile) {
    if (this._currentSceneIsSafe && this._lastCanvas && this._lastCore) {
      this.initCabinet(this._lastCanvas, this._lastCore);
    }
    for (const miner of this.miners) {
      this._renderMiner(ctx, miner, time, isMobile);
    }

    if (this._currentSceneIsSafe) {
      this._renderCabinet(ctx, time);
    }

    this._renderFloatingTexts(ctx);
  }

  handleCabinetTap(x, y) {
    const cab = this.cabinet;
    const margin = 20;
    if (
      cab.storedData > 0 &&
      x >= cab.x - margin &&
      x <= cab.x + cab.width + margin &&
      y >= cab.y - margin &&
      y <= cab.y + cab.height + margin
    ) {
      const amount = cab.storedData;
      cab.storedData = 0;
      this.floatingTexts.push({
        text: `+${amount} MB`,
        x: cab.x + cab.width / 2,
        y: cab.y - 20,
        color: "#00ffaa",
        life: 1.5,
        maxLife: 1.5,
        alpha: 1,
      });
      console.log(`[Mining] Cabinet collected: ${amount} MB`);
      return { collected: true, amount };
    }
    return { collected: false, amount: 0 };
  }

  saveData() {
    return {
      territories: { ...this.territories },
      cabinetStoredData: this.cabinet.storedData,
      pendingData: this.pendingData,
    };
  }

  loadData(data) {
    if (!data) return;
    if (data.territories) this.territories = { ...data.territories };
    if (typeof data.cabinetStoredData === "number") {
      this.cabinet.storedData = data.cabinetStoredData;
    }
    if (typeof data.pendingData === "number") {
      this.pendingData = data.pendingData;
    }
  }


  _spawnTerritoryMiners(core, canvas) {
    const entry = this._getTerritoryEntry(canvas);
    for (let i = 0; i < this.minerCount; i++) {
      this.miners.push({
        x: entry.x,
        y: entry.y + i * 4,
        vx: 0, vy: 0,
        radius: 6,
        color: "#ffcc00",
        speed: this.minerSpeed,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 5 + Math.random() * 3,
        pathOffset: (Math.random() - 0.5) * 40,
        minerState: "APPROACH_CORE",
        stateTimer: 0,
        dataCarrying: 0,
        targetX: core?.shieldAnchor?.x ?? core.x,
        targetY: core?.shieldAnchor?.y ?? core.y,
        miningProgress: 0,
        initialDelay: i * 0.8,
      });
    }
  }

  _spawnSafeZoneMiners(canvas) {
    if (this.pendingData <= 0) return;
    const count = Math.min(this.minerCount, Math.ceil(this.pendingData / this.dataPerTrip));

    for (let i = 0; i < count; i++) {
      const carry = Math.min(this.dataPerTrip, this.pendingData);
      if (carry <= 0) break;
      this.pendingData -= carry;
      const edge = this._getSafeEntry(canvas);
      this.miners.push({
        x: edge.x,
        y: edge.y,
        vx: 0, vy: 0,
        radius: 6,
        color: "#ffcc00",
        speed: this.minerSpeed,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 5 + Math.random() * 3,
        pathOffset: (Math.random() - 0.5) * 40,
        minerState: "ENTER_SAFE",
        stateTimer: 0,
        dataCarrying: carry,
        targetX: this.cabinet.x + this.cabinet.width / 2,
        targetY: this.cabinet.y + this.cabinet.height / 2,
        miningProgress: 0,
        initialDelay: i * 2.0,
      });
    }
  }

  _updateBackground(dt) {
    const tripCycle = this.miningDuration + this.offScreenDelay * 2 + this.depositDuration + this.travelBuffer;
    const keys = Object.keys(this.territories);

    this._bgLogTimer += dt;
    if (this._bgLogTimer > 5) {
      if (keys.length > 0) {
      }
      this._bgLogTimer = 0;
    }

    for (const id of keys) {
      if (!this._currentSceneIsSafe && this._currentSceneStageId === id) continue;
      const t = this.territories[id];
      t.tripTimer += dt;
      if (t.tripTimer >= tripCycle) {
        t.tripTimer -= tripCycle;
        const mined = this.dataPerTrip * t.minerCount;
        this.pendingData += mined;
      }
    }
  }

  _updateFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 30 * dt;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  _updateMiner(miner, dt, core, canvas, isSafeZone, createExplosion) {
    if (miner.initialDelay > 0) {
      miner.initialDelay -= dt;
      return;
    }

    miner.stateTimer += dt;

    switch (miner.minerState) {
      case "APPROACH_CORE": {
        const ax = core?.shieldAnchor?.x ?? core.x;
        const ay = core?.shieldAnchor?.y ?? core.y;
        this._moveToward(miner, ax, ay, dt);
        if (this._distanceTo(miner, ax, ay) < 25) {
          this._changeState(miner, "MINING");
          miner.miningProgress = 0;
        }
        break;
      }

      case "MINING":
        miner.miningProgress = Math.min(1, miner.stateTimer / this.miningDuration);
        miner.x += Math.sin(miner.stateTimer * 15) * 0.3;
        miner.y += Math.cos(miner.stateTimer * 12) * 0.2;

        if (Math.random() < 0.05 && createExplosion) {
          const ax = core?.shieldAnchor?.x ?? core.x;
          const ay = core?.shieldAnchor?.y ?? core.y;
          createExplosion(ax + (Math.random() - 0.5) * 20, ay + (Math.random() - 0.5) * 20, "#00ffaa", 2);
        }

        if (miner.stateTimer >= this.miningDuration) {
          miner.dataCarrying = this.dataPerTrip;
          const exit = this._territoryExit || this._getNearestEdge(miner, canvas);
          miner.targetX = exit.x;
          miner.targetY = exit.y;
          this._changeState(miner, "CARRYING");
        }
        break;

      case "CARRYING":
        this._moveToward(miner, miner.targetX, miner.targetY, dt);
        if (this._isOffScreen(miner, canvas)) {
          this._changeState(miner, "EXIT_SCREEN");
        }
        break;

      case "EXIT_SCREEN":
        if (miner.stateTimer >= this.offScreenDelay) {
          this.pendingData += miner.dataCarrying;
          miner.dataCarrying = 0;
          const enterEdge = this._getTerritoryEntry(canvas);
          miner.x = enterEdge.x;
          miner.y = enterEdge.y;
          miner.targetX = core?.shieldAnchor?.x ?? core.x;
          miner.targetY = core?.shieldAnchor?.y ?? core.y;
          this._changeState(miner, "APPROACH_CORE");
        }
        break;

      case "ENTER_SAFE":
        this._moveToward(miner, miner.targetX, miner.targetY, dt);
        if (this._distanceTo(miner, this.cabinet.x + this.cabinet.width / 2, this.cabinet.y + this.cabinet.height / 2) < this._cabinetRadius() + miner.radius + 2) {
          this._changeState(miner, "DEPOSITING");
        }
        break;

      case "DEPOSITING":
        miner.x += Math.sin(miner.stateTimer * 10) * 0.2;
        if (miner.stateTimer >= this.depositDuration) {
          this.cabinet.storedData += miner.dataCarrying;
          miner.dataCarrying = 0;
          if (createExplosion) {
            createExplosion(this.cabinet.x + this.cabinet.width / 2, this.cabinet.y, "#00ffaa", 3);
          }
          if (window.debugLog) {
            window.debugLog(
              "Mining",
              "deposit done",
              "cabinet",
              this.cabinet.storedData,
              "pending",
              this.pendingData
            );
          }
          const edge = this._getSafeEntry(canvas);
          miner.targetX = edge.x;
          miner.targetY = edge.y;
          this._changeState(miner, "EXIT_SAFE");
        }
        break;

      case "EXIT_SAFE":
        this._moveToward(miner, miner.targetX, miner.targetY, dt);
        if (this._isOffScreenSafe(miner, canvas)) {
          if (window.debugLog) {
            window.debugLog(
              "Mining",
              "exit safe offscreen",
              "x",
              Math.round(miner.x || 0),
              "y",
              Math.round(miner.y || 0)
            );
          }
          const enterEdge = this._getSafeEntry(canvas);
          miner.x = enterEdge.x;
          miner.y = enterEdge.y;
          const carry = Math.min(this.dataPerTrip, this.pendingData);
          this.pendingData -= carry;
          miner.dataCarrying = carry;
          miner.targetX = this.cabinet.x + this.cabinet.width / 2;
          miner.targetY = this.cabinet.y + this.cabinet.height / 2;
          this._changeState(miner, "ENTER_SAFE");
          miner.initialDelay = 2.0;
        }
        break;

      case "WAITING":
        if (this.pendingData > 0) {
          const enterEdge = this._getSafeEntry(canvas);
          miner.x = enterEdge.x;
          miner.y = enterEdge.y;
          const carry = Math.min(this.dataPerTrip, this.pendingData);
          this.pendingData -= carry;
          miner.dataCarrying = carry;
          miner.targetX = this.cabinet.x + this.cabinet.width / 2;
          miner.targetY = this.cabinet.y + this.cabinet.height / 2;
          this._changeState(miner, "ENTER_SAFE");
        }
        break;
    }
  }

  _renderMiner(ctx, miner, time, isMobile) {
    const state = miner.minerState;
    if (state === "EXIT_SCREEN") return;

    ctx.save();

    if (!isMobile) {
      const wobble = Math.sin(time * 5 + miner.wobblePhase) * 1.5;
      ctx.translate(miner.x + wobble * 0.3, miner.y + wobble * 0.2);
    } else {
      ctx.translate(miner.x, miner.y);
    }

    ctx.fillStyle = miner.color;
    ctx.beginPath();
    ctx.arc(0, 0, miner.radius, 0, Math.PI * 2);
    ctx.fill();

    if (!isMobile) {
      ctx.shadowColor = miner.color;
      ctx.shadowBlur = 6;
    }

    const eyeSize = miner.radius * 0.2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-miner.radius * 0.3, -miner.radius * 0.1, eyeSize, 0, Math.PI * 2);
    ctx.arc(miner.radius * 0.3, -miner.radius * 0.1, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffdd44";
    ctx.beginPath();
    ctx.moveTo(0, -miner.radius - 5);
    ctx.lineTo(-5, -miner.radius + 1);
    ctx.lineTo(5, -miner.radius + 1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    if (miner.dataCarrying > 0) {
      const bobY = Math.sin(time * 4 + miner.wobblePhase) * 1.5;
      const bx = miner.x - 3;
      const by = miner.y - miner.radius - 14 + bobY;

      ctx.fillStyle = "#00ffaa";
      ctx.fillRect(bx, by, 6, 6);
      ctx.strokeStyle = "#ffffff66";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, 6, 6);
    }

    if (state === "MINING") {
      const bw = 16, bh = 2;
      const bx = miner.x - bw / 2;
      const by = miner.y - miner.radius - 18;
      ctx.fillStyle = "#333";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "#00ffaa";
      ctx.fillRect(bx, by, bw * miner.miningProgress, bh);
    }
  }

  _renderCabinet(ctx, time) {
    const cab = this.cabinet;
    const hasData = cab.storedData > 0;

    ctx.save();

    if (hasData) {
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 10 + Math.sin(time * 3) * 5;
    }

    ctx.fillStyle = "#1a1a2e";
    ctx.strokeStyle = "#334";
    ctx.lineWidth = 2;
    ctx.fillRect(cab.x, cab.y, cab.width, cab.height);
    ctx.strokeRect(cab.x, cab.y, cab.width, cab.height);

    ctx.fillStyle = "#2a2a4e";
    ctx.fillRect(cab.x, cab.y, cab.width, 8);

    for (let i = 0; i < 4; i++) {
      const ledY = cab.y + 14 + i * 12;
      ctx.fillStyle = hasData
        ? (Math.sin(time * 5 + i * 1.5) > 0 ? "#00ff88" : "#006633")
        : "#333";
      ctx.fillRect(cab.x + 6, ledY, 8, 3);
      ctx.fillRect(cab.x + 18, ledY, 8, 3);
      ctx.fillRect(cab.x + cab.width - 14, ledY, 8, 3);
    }

    ctx.fillStyle = hasData ? "#00ffaa33" : "#11112233";
    ctx.fillRect(cab.x + 4, cab.y + 20, cab.width - 8, cab.height - 28);
    ctx.shadowBlur = 0;

    if (hasData) {
      ctx.fillStyle = "#00ffaa";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${cab.storedData} MB`, cab.x + cab.width / 2, cab.y - 8);

      if (Math.sin(time * 4) > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.fillText("TAP", cab.x + cab.width / 2, cab.y - 18);
      }
    }

    ctx.fillStyle = "#556";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DATA", cab.x + cab.width / 2, cab.y + cab.height + 10);
    ctx.restore();
  }

  _renderFloatingTexts(ctx) {
    ctx.save();
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  initCabinet(canvas, core) {
    const offsetX = Math.min(260, canvas.width * 0.28);
    const offsetY = -Math.min(260, canvas.height * 0.30);
    const cx = core?.shieldAnchor?.x ?? core?.x ?? canvas.width - 90;
    const cy = core?.shieldAnchor?.y ?? core?.y ?? canvas.height - 120;
    const worldW = core?.worldWidth ?? canvas.width;
    const worldH = core?.worldHeight ?? canvas.height;
    const rawX = cx + offsetX;
    const rawY = cy + offsetY;
    const maxX = worldW - this.cabinet.width - 10;
    const maxY = worldH - this.cabinet.height - 10;
    this.cabinet.x = Math.min(Math.max(10, rawX), maxX);
    this.cabinet.y = Math.min(Math.max(10, rawY), maxY);
  }


  resolveCabinetCollisions(entities, padding = 2) {
    if (!this._currentSceneIsSafe) return;
    for (const e of entities) {
      this._pushOutOfCabinet(e, padding);
    }
  }

  _cabinetRadius() {
    return Math.max(this.cabinet.width, this.cabinet.height) * 0.5;
  }

  _pushOutOfCabinet(e, padding) {
    if (!e) return;
    const cab = this.cabinet;
    const cx = cab.x + cab.width / 2;
    const cy = cab.y + cab.height / 2;
    const rx = cab.width / 2 + (e.radius || 0) + padding;
    const ry = cab.height / 2 + (e.radius || 0) + padding;
    const dx = e.x - cx;
    const dy = e.y - cy;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax > rx || ay > ry) return;

    if (ax > 0 || ay > 0) {
      const pushX = rx - ax;
      const pushY = ry - ay;
      if (pushX < pushY) {
        e.x += dx < 0 ? -pushX : pushX;
      } else {
        e.y += dy < 0 ? -pushY : pushY;
      }
    } else {
      e.x += rx;
    }
  }

  _changeState(m, s) {
    const prev = m.minerState;
    m.minerState = s;
    m.stateTimer = 0;
    if (window.debugLog) {
      window.debugLog(
        "Mining",
        "state",
        prev,
        "->",
        s,
        "x",
        Math.round(m.x || 0),
        "y",
        Math.round(m.y || 0),
        "tx",
        Math.round(m.targetX || 0),
        "ty",
        Math.round(m.targetY || 0)
      );
    }
  }

  _moveToward(m, tx, ty, dt) {
    const dx = tx - m.x;
    const dy = ty - m.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) { m.x = tx; m.y = ty; return; }
    const nx = dx / dist;
    const ny = dy / dist;
    const targetVx = nx * m.speed;
    const targetVy = ny * m.speed;
    const accel = 8;
    m.vx = (m.vx || 0) + (targetVx - (m.vx || 0)) * accel * dt;
    m.vy = (m.vy || 0) + (targetVy - (m.vy || 0)) * accel * dt;
    if (m.wobblePhase !== undefined) {
      m.wobblePhase += dt * (m.wobbleSpeed || 5);
      const wobbleAmount = Math.sin(m.wobblePhase) * 25;
      const perpAngle = Math.atan2(dy, dx) + Math.PI / 2;
      const wobbleX = Math.cos(perpAngle) * wobbleAmount * dt;
      const wobbleY = Math.sin(perpAngle) * wobbleAmount * dt;
      m.x += m.vx * dt + wobbleX;
      m.y += m.vy * dt + wobbleY;
      return;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
  }

  _distanceTo(m, tx, ty) {
    return Math.sqrt((tx - m.x) ** 2 + (ty - m.y) ** 2);
  }

  _getNearestEdge(m, canvas) {
    const edges = [
      { x: -30, y: m.y }, { x: canvas.width + 30, y: m.y },
      { x: m.x, y: -30 }, { x: m.x, y: canvas.height + 30 },
    ];
    let best = edges[0], bestD = Infinity;
    for (const e of edges) {
      const d = this._distanceTo(m, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  _getRandomEdge(canvas) {
    const s = Math.floor(Math.random() * 4);
    switch (s) {
      case 0: return { x: -20, y: Math.random() * canvas.height };
      case 1: return { x: canvas.width + 20, y: Math.random() * canvas.height };
      case 2: return { x: Math.random() * canvas.width, y: -20 };
      default: return { x: Math.random() * canvas.width, y: canvas.height + 20 };
    }
  }

  _getTerritoryEntry(canvas) {
    return {
      x: -20,
      y: canvas.height * 0.8,
    };
  }

  _getTerritoryExit(canvas) {
    return {
      x: -30,
      y: canvas.height * 0.2,
    };
  }

  _getSafeEntry(canvas) {
    const w = this._worldW || canvas.width;
    const h = this._worldH || canvas.height;
    return {
      x: w + 20,
      y: h * 0.2,
    };
  }

  _isOffScreen(m, canvas) {
    const w = this._worldW || canvas.width;
    const h = this._worldH || canvas.height;
    return m.x < -15 || m.x > w + 15 || m.y < -15 || m.y > h + 15;
  }

  _isOffScreenSafe(m, canvas) {
    const w = this._worldW || canvas.width;
    const h = this._worldH || canvas.height;
    return m.x < -15 || m.x > w + 15 || m.y < -15 || m.y > h + 15;
  }
}






