const debugLog = window.debugLog || function () {};

export class MiningManager {
  constructor() {
    this.territories = {};
    this.miners = []; // 자체 배열 (alliedViruses와 완전 분리)

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
    this.minerSpeed = 50;
    this.offScreenDelay = 3.0;
    this.minerCount = 5;
    this.travelBuffer = 4;

    this.floatingTexts = [];
    this._bgLogTimer = 0;
    this._currentSceneStageId = null;
    this._currentSceneIsSafe = false;
  }

  // === 점령지 등록 ===
  registerTerritory(stageId) {
    if (this.territories[stageId]) return;
    this.territories[stageId] = {
      minerCount: this.minerCount,
      tripTimer: 0,
    };
    console.log(`[Mining] ✅ Territory ${stageId} registered`);
  }

  // === 씬 전환 시 호출 ===
  onSceneChange(stageId, isSafeZone, canvas, core) {
    this._currentSceneStageId = stageId;
    this._currentSceneIsSafe = isSafeZone;
    this.miners = [];

    if (isSafeZone) {
      this.initCabinet(canvas);
      this._spawnSafeZoneMiners(canvas);
      console.log(`[Mining] Safe zone entered - spawned ${this.miners.length} deposit miners`);
    } else if (this.territories[stageId]) {
      this._spawnTerritoryMiners(core);
      console.log(`[Mining] Territory ${stageId} entered - spawned ${this.miners.length} miners`);
    }
  }

  // === 매 프레임 업데이트 (DefenseGame.update에서 호출) ===
  update(dt, core, canvas, isSafeZone, createExplosion) {
    this._updateBackground(dt);
    this._updateFloatingTexts(dt);

    for (const miner of this.miners) {
      this._updateMiner(miner, dt, core, canvas, isSafeZone, createExplosion);
    }
  }

  // === 렌더링 (DefenseGame.render에서 호출) ===
  render(ctx, time, isMobile) {
    // 마이너 몸체 그리기
    for (const miner of this.miners) {
      if (this._isOffScreen(miner, ctx.canvas)) continue;
      this._renderMiner(ctx, miner, time, isMobile);
    }

    // 수납장 (세이프존만)
    if (this._currentSceneIsSafe) {
      this._renderCabinet(ctx, time);
    }

    // 플로팅 텍스트
    this._renderFloatingTexts(ctx);
  }

  // === 수납장 터치 ===
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

  // === Save / Load ===
  saveData() {
    return {
      territories: { ...this.territories },
      cabinetStoredData: this.cabinet.storedData,
    };
  }

  loadData(data) {
    if (!data) return;
    if (data.territories) this.territories = { ...data.territories };
    if (typeof data.cabinetStoredData === "number") {
      this.cabinet.storedData = data.cabinetStoredData;
    }
  }

  // ============ PRIVATE ============

  _spawnTerritoryMiners(core) {
    for (let i = 0; i < this.minerCount; i++) {
      const angle = ((Math.PI * 2) / this.minerCount) * i;
      const r = 95;
      this.miners.push({
        x: core.x + Math.cos(angle) * r,
        y: core.y + Math.sin(angle) * r,
        vx: 0, vy: 0,
        radius: 6,
        color: "#ffcc00",
        speed: this.minerSpeed,
        wobblePhase: Math.random() * Math.PI * 2,
        minerState: "APPROACH_CORE",
        stateTimer: 0,
        dataCarrying: 0,
        targetX: core.x,
        targetY: core.y,
        miningProgress: 0,
        initialDelay: i * 1.5,
      });
    }
  }

  _spawnSafeZoneMiners(canvas) {
    const ids = Object.keys(this.territories);
    if (ids.length === 0) return;
    const count = Math.min(this.minerCount, ids.length * 3);

    for (let i = 0; i < count; i++) {
      const edge = this._getRandomEdge(canvas);
      this.miners.push({
        x: edge.x,
        y: edge.y,
        vx: 0, vy: 0,
        radius: 6,
        color: "#ffcc00",
        speed: this.minerSpeed,
        wobblePhase: Math.random() * Math.PI * 2,
        minerState: "ENTER_SAFE",
        stateTimer: 0,
        dataCarrying: this.dataPerTrip,
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
        console.log(`[Mining] bg tick - territories: ${keys.length}, cabinet: ${this.cabinet.storedData} MB`);
      }
      this._bgLogTimer = 0;
    }

    for (const id of keys) {
      const t = this.territories[id];
      t.tripTimer += dt;
      if (t.tripTimer >= tripCycle) {
        t.tripTimer -= tripCycle;
        const mined = this.dataPerTrip * t.minerCount;
        this.cabinet.storedData += mined;
        console.log(`[Mining] ✅ bg mined ${mined} MB from territory ${id}, stored: ${this.cabinet.storedData}`);
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
      case "APPROACH_CORE":
        this._moveToward(miner, core.x, core.y, dt);
        if (this._distanceTo(miner, core.x, core.y) < 25) {
          this._changeState(miner, "MINING");
          miner.miningProgress = 0;
        }
        break;

      case "MINING":
        miner.miningProgress = Math.min(1, miner.stateTimer / this.miningDuration);
        miner.x += Math.sin(miner.stateTimer * 15) * 0.3;
        miner.y += Math.cos(miner.stateTimer * 12) * 0.2;

        if (Math.random() < 0.05 && createExplosion) {
          createExplosion(
            core.x + (Math.random() - 0.5) * 20,
            core.y + (Math.random() - 0.5) * 20,
            "#00ffaa", 2
          );
        }

        if (miner.stateTimer >= this.miningDuration) {
          miner.dataCarrying = this.dataPerTrip;
          const edge = this._getNearestEdge(miner, canvas);
          miner.targetX = edge.x;
          miner.targetY = edge.y;
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
          this.cabinet.storedData += miner.dataCarrying;
          miner.dataCarrying = 0;
          // 점령지 화면이면 다시 코어로 돌아옴
          const enterEdge = this._getRandomEdge(canvas);
          miner.x = enterEdge.x;
          miner.y = enterEdge.y;
          miner.targetX = core.x;
          miner.targetY = core.y;
          this._changeState(miner, "APPROACH_CORE");
        }
        break;

      case "ENTER_SAFE":
        this._moveToward(miner, miner.targetX, miner.targetY, dt);
        if (this._distanceTo(miner, this.cabinet.x + this.cabinet.width / 2, this.cabinet.y + this.cabinet.height / 2) < 20) {
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
          const edge = this._getNearestEdge(miner, canvas);
          miner.targetX = edge.x;
          miner.targetY = edge.y;
          this._changeState(miner, "EXIT_SAFE");
        }
        break;

      case "EXIT_SAFE":
        this._moveToward(miner, miner.targetX, miner.targetY, dt);
        if (this._isOffScreen(miner, canvas)) {
          // 다시 데이터 들고 입장
          const enterEdge = this._getRandomEdge(canvas);
          miner.x = enterEdge.x;
          miner.y = enterEdge.y;
          miner.dataCarrying = this.dataPerTrip;
          miner.targetX = this.cabinet.x + this.cabinet.width / 2;
          miner.targetY = this.cabinet.y + this.cabinet.height / 2;
          this._changeState(miner, "ENTER_SAFE");
          miner.initialDelay = 2.0; // 잠시 대기 후 재입장
        }
        break;
    }
  }

  // === 렌더링 ===
  _renderMiner(ctx, miner, time, isMobile) {
    const state = miner.minerState;
    if (state === "EXIT_SCREEN" || state === "EXIT_SAFE") return;

    ctx.save();

    // 위치
    if (!isMobile) {
      const wobble = Math.sin(time * 5 + miner.wobblePhase) * 1.5;
      ctx.translate(miner.x + wobble * 0.3, miner.y + wobble * 0.2);
    } else {
      ctx.translate(miner.x, miner.y);
    }

    // 몸체 (금색 원)
    ctx.fillStyle = miner.color;
    ctx.beginPath();
    ctx.arc(0, 0, miner.radius, 0, Math.PI * 2);
    ctx.fill();

    if (!isMobile) {
      ctx.shadowColor = miner.color;
      ctx.shadowBlur = 6;
    }

    // 눈
    const eyeSize = miner.radius * 0.2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-miner.radius * 0.3, -miner.radius * 0.1, eyeSize, 0, Math.PI * 2);
    ctx.arc(miner.radius * 0.3, -miner.radius * 0.1, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 안전모
    ctx.fillStyle = "#ffdd44";
    ctx.beginPath();
    ctx.moveTo(0, -miner.radius - 5);
    ctx.lineTo(-5, -miner.radius + 1);
    ctx.lineTo(5, -miner.radius + 1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 데이터 블록 (운반 중) - translate 밖에서 절대좌표로
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

    // 채굴 진행 바
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

  initCabinet(canvas) {
    this.cabinet.x = canvas.width - 90;
    this.cabinet.y = canvas.height - 120;
  }

  // === 유틸리티 ===
  _changeState(m, s) { m.minerState = s; m.stateTimer = 0; }

  _moveToward(m, tx, ty, dt) {
    const dx = tx - m.x, dy = ty - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) { m.x = tx; m.y = ty; return; }
    const r = Math.min(m.speed * dt / dist, 1);
    m.x += dx * r;
    m.y += dy * r;
    m.vx = dx / dist;
    m.vy = dy / dist;
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

  _isOffScreen(m, canvas) {
    return m.x < -15 || m.x > canvas.width + 15 || m.y < -15 || m.y > canvas.height + 15;
  }
}
