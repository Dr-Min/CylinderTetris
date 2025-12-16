import { TerminalUI } from "./TerminalUI.js";
import { TetrisGame } from "./TetrisGame.js";
import { DefenseGame } from "./DefenseGame.js";
import { PerkManager } from "./PerkManager.js";
import { ConquestManager } from "./ConquestManager.js";
import { EquipmentManager } from "./EquipmentManager.js";
import { StageManager } from "./StageManager.js";

export class GameManager {
  constructor() {
    this.terminal = new TerminalUI();
    this.tetrisGame = new TetrisGame("game-container");
    this.defenseGame = new DefenseGame("game-container");
    this.perkManager = new PerkManager();
    this.conquestManager = new ConquestManager();
    this.equipmentManager = new EquipmentManager();
    this.stageManager = new StageManager(); // 스테이지 관리자 추가

    // 디펜스 게임 이벤트 연결
    this.defenseGame.onResourceGained = (amount) => {
        this.currentMoney += amount;
    };
    this.defenseGame.onGameOver = () => this.handleDefenseGameOver();
    
    // 점령 이벤트 연결
    this.defenseGame.onConquer = () => this.handleConquest();

    // 테트리스 게임 이벤트 연결
    this.tetrisGame.onStageClear = (lines) => this.handleBreachClear(lines);
    this.tetrisGame.onGameOver = (score) => this.handleBreachFail(score);
    this.tetrisGame.getPerkEffects = () => this.perkManager.getEffects();

    // 게임 상태
    this.activeMode = "none"; // 'defense', 'breach'
    this.currentMoney = 0; // Data (Money)
    this.reputation = 0; // Reputation

    // 영구 퍽 트리 데이터 정의
    this.permTree = [
      // Root (기본 제공)
      {
        id: "root",
        name: "ROOT_ACCESS",
        cost: 0,
        parentId: null,
        maxLevel: 1,
        desc: "System Root Permission",
        effect: {},
      },

      // Branch A: Resources (Start Money)
      {
        id: "res_1",
        name: "Packet_Sniffer.v1",
        cost: 10,
        parentId: "root",
        maxLevel: 5,
        desc: "Start Money +100MB/Lv",
        effect: { startMoney: 100 },
      },
      {
        id: "res_2",
        name: "Data_Mining_Rig.v2",
        cost: 30,
        parentId: "res_1",
        maxLevel: 5,
        desc: "Start Money +200MB/Lv",
        effect: { startMoney: 200 },
      },
      {
        id: "res_3",
        name: "Botnet_Wallet.v3",
        cost: 60,
        parentId: "res_2",
        maxLevel: 5,
        desc: "Start Money +300MB/Lv",
        effect: { startMoney: 300 },
      },

      // Branch B: Efficiency (Score Multiplier)
      {
        id: "eff_1",
        name: "Score_Injector.dll",
        cost: 20,
        parentId: "root",
        maxLevel: 5,
        desc: "Score +10%/Lv",
        effect: { scoreMult: 0.1 },
      },
      {
        id: "eff_2",
        name: "Combo_Breaker.exe",
        cost: 50,
        parentId: "eff_1",
        maxLevel: 5,
        desc: "Score +15%/Lv",
        effect: { scoreMult: 0.15 },
      },
      {
        id: "eff_3",
        name: "Global_Leaderboard.hack",
        cost: 100,
        parentId: "eff_2",
        maxLevel: 5,
        desc: "Score +25%/Lv",
        effect: { scoreMult: 0.25 },
      },

      // Branch C: Luck (Special Blocks)
      {
        id: "luck_1",
        name: "RNG_Manipulator.init",
        cost: 40,
        parentId: "root",
        maxLevel: 5,
        desc: "Luck +2%/Lv",
        effect: { luck: 0.02 },
      },
      {
        id: "luck_2",
        name: "Probability_Drive.sys",
        cost: 80,
        parentId: "luck_1",
        maxLevel: 5,
        desc: "Luck +3% & Discount 5%/Lv",
        effect: { luck: 0.03, discount: 0.05 },
      },
    ];

    this.acquiredPermPerks = new Map();
    this.acquiredPermPerks.set("root", 1); // 기본 루트 해금 (Level 1)

    // 디버그 모드 초기화
    this.initDebugSystem();
  }

  initDebugSystem() {
    // 디버그 패널 생성
    const debugPanel = document.createElement("div");
    debugPanel.id = "debug-panel";
    debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0, 20, 0, 0.95);
      border: 1px solid #0f0;
      color: #0f0;
      font-family: 'Courier New', monospace;
      padding: 15px;
      z-index: 10000;
      display: none;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    `;

    const title = document.createElement("h3");
    title.innerText = "=== DEBUG_MODE ===";
    title.style.margin = "0 0 15px 0";
    title.style.borderBottom = "1px solid #0f0";
    title.style.textAlign = "center";
    debugPanel.appendChild(title);

    const createInput = (label, id, value, type = "number", step = 0.01) => {
      const container = document.createElement("div");
      container.style.marginBottom = "10px";
      container.style.display = "flex";
      container.style.justifyContent = "space-between";
      container.style.alignItems = "center";

      const lbl = document.createElement("label");
      lbl.innerText = label;
      lbl.htmlFor = id;

      const inp = document.createElement("input");
      inp.id = id;
      inp.type = type;
      inp.value = value;
      inp.step = step;
      inp.style.width = "80px";
      inp.style.background = "#000";
      inp.style.color = "#0f0";
      inp.style.border = "1px solid #0f0";

      container.appendChild(lbl);
      container.appendChild(inp);
      debugPanel.appendChild(container);
      return inp;
    };

    // --- Inputs ---
    // 1. Bomb Chance
    const bombInp = createInput(
      "Bomb Chance (0-1)",
      "dbg-bomb",
      this.perkManager.activeEffects.bombChance
    );
    bombInp.onchange = (e) => {
      this.perkManager.activeEffects.bombChance = parseFloat(e.target.value);
      this.terminal.printSystemMessage(
        `[DEBUG] Bomb Chance set to ${e.target.value}`
      );
    };

    // 2. Gold Chance
    const goldInp = createInput(
      "Gold Chance (0-1)",
      "dbg-gold",
      this.perkManager.activeEffects.goldChance
    );
    goldInp.onchange = (e) => {
      this.perkManager.activeEffects.goldChance = parseFloat(e.target.value);
      this.terminal.printSystemMessage(
        `[DEBUG] Gold Chance set to ${e.target.value}`
      );
    };

    // 2.5 Misc Chance (Freeze, Laser)
    const miscInp = createInput(
      "Misc Chance (0-1)",
      "dbg-misc",
      this.perkManager.activeEffects.miscChance
    );
    miscInp.onchange = (e) => {
      this.perkManager.activeEffects.miscChance = parseFloat(e.target.value);
      this.terminal.printSystemMessage(
        `[DEBUG] Misc Chance set to ${e.target.value}`
      );
    };

    // 3. Current Money
    const moneyInp = createInput(
      "Data (Money)",
      "dbg-money",
      this.currentMoney,
      "number",
      100
    );
    moneyInp.onchange = (e) => {
      this.currentMoney = parseInt(e.target.value);
      this.terminal.printSystemMessage(
        `[DEBUG] Money set to ${e.target.value}`
      );
    };

    // 4. Reputation
    const repInp = createInput(
      "Reputation",
      "dbg-rep",
      this.reputation,
      "number",
      10
    );
    repInp.onchange = (e) => {
      this.reputation = parseInt(e.target.value);
      this.saveReputation();
      this.terminal.printSystemMessage(
        `[DEBUG] Reputation set to ${e.target.value}`
      );
    };

    // 5. Score Multiplier
    const scoreInp = createInput(
      "Score Mult",
      "dbg-score",
      this.perkManager.activeEffects.scoreMultiplier
    );
    scoreInp.onchange = (e) => {
      this.perkManager.activeEffects.scoreMultiplier = parseFloat(
        e.target.value
      );
      this.terminal.printSystemMessage(
        `[DEBUG] Score Mult set to ${e.target.value}`
      );
    };

    // Buttons Container
    const btnContainer = document.createElement("div");
    btnContainer.style.marginTop = "15px";
    btnContainer.style.display = "flex";
    btnContainer.style.gap = "5px";
    btnContainer.style.flexWrap = "wrap";
    debugPanel.appendChild(btnContainer);

    const createBtn = (text, onClick) => {
      const btn = document.createElement("button");
      btn.innerText = text;
      btn.style.background = "#003300";
      btn.style.color = "#0f0";
      btn.style.border = "1px solid #0f0";
      btn.style.cursor = "pointer";
      btn.style.padding = "5px";
      btn.style.flex = "1";
      btn.onclick = onClick;
      btnContainer.appendChild(btn);
    };

    createBtn("Skip Mining", () => {
      if (this.activeMode === "mining") {
        this.tetrisGame.stageClear(); // Force clear
        this.terminal.printSystemMessage("[DEBUG] Mining Skipped");
      }
    });

    createBtn("Switch Mode", () => {
      if (this.activeMode === "mining") {
        this.switchMode("defense");
      } else {
        this.switchMode("mining");
      }
      this.terminal.printSystemMessage(`[DEBUG] Switched to ${this.activeMode}`);
    });

    createBtn("Unlock All Perks", () => {
      this.perkManager.activeEffects.bombChance = 0.5;
      this.perkManager.activeEffects.goldChance = 0.5;
      this.perkManager.activeEffects.miscChance = 0.5;
      this.perkManager.activeEffects.speedModifier = 0.5;
      this.terminal.printSystemMessage(
        "[DEBUG] GOD MODE ACTIVATED (High Stats)"
      );
      bombInp.value = 0.5;
      goldInp.value = 0.5;
      miscInp.value = 0.5;
    });

    document.body.appendChild(debugPanel);

    // Toggle Key (Backtick `)
    document.addEventListener("keydown", (e) => {
      if (e.key === "`" || e.key === "~") {
        const isHidden = debugPanel.style.display === "none";
        debugPanel.style.display = isHidden ? "block" : "none";

        // Refresh inputs values when opening
        if (isHidden) {
          bombInp.value = this.perkManager.activeEffects.bombChance;
          goldInp.value = this.perkManager.activeEffects.goldChance;
          miscInp.value = this.perkManager.activeEffects.miscChance;
          moneyInp.value = this.currentMoney;
          repInp.value = this.reputation;
          scoreInp.value = this.perkManager.activeEffects.scoreMultiplier;
        }
      }
    });

    console.log("Debug System Initialized. Press '`' to toggle.");
  }

  async init() {
    this.loadReputation();
    this.tetrisGame.init(); // 3D 씬 로드 (항상 로드해둠)

    // [DEV] 튜토리얼 스킵 (개발 중 비활성화)
    localStorage.setItem("tutorial_completed", "true");

    const tutorialCompleted = localStorage.getItem("tutorial_completed");
    if (tutorialCompleted) {
      this.loadPermanentPerks();

      this.terminal.show();
      await this.terminal.typeText("System Reloaded.", 20);
      await this.terminal.typeText("Skipping initialization sequence...", 20);
      await new Promise((r) => setTimeout(r, 800));

      // 영구 강화 메뉴 진입 여부 확인 (스킵 모드에서도 추가)
      if (true) {
        await this.terminal.typeText(`REP LEVEL: ${this.reputation}`, 20);
        await this.terminal.typeText("Access System Upgrades?", 30);
        const choice = await this.terminal.showChoices([
          { text: "YES (Spend Reputation)", value: "yes" },
          { text: "NO (Start Operation)", value: "no" },
        ]);

        if (choice === "yes") {
          await this.enterPermanentShop();
        }
      }

      // 게임 시작 시 기본 모드는 Defense
      this.switchMode("defense");
    } else {
      await this.startIntro();
    }
  }

  switchMode(mode) {
    console.log(`Switching mode: ${this.activeMode} -> ${mode}`);
    this.activeMode = mode;

    if (mode === "defense") {
      // 1. 테트리스 정지 및 숨김 (UI만 숨기고 컨테이너는 보이게)
      this.tetrisGame.state.isPlaying = false;
      document.getElementById("game-ui").style.display = "none";
      document.getElementById("game-container").style.opacity = "1"; // [수정] 화면 다시 켜기
      
      // 2. 터미널 UI 조정 (디펜스 모드용)
      this.terminal.setDefenseMode(true); // 배경 투명 + 클릭 가능
      this.terminal.show(); // 터미널 메시지창 활성화 (로그용)
      this.terminal.clear();
      this.terminal.printSystemMessage("DEFENSE_PROTOCOL_INITIATED");

      // 3. 디펜스 게임 시작
      this.defenseGame.start();
      // [추가] 자원 UI 동기화
      this.defenseGame.updateResourceDisplay(this.currentMoney);
      
      // 아군 바이러스 정보 업데이트
      const alliedInfo = this.conquestManager.getAlliedInfo();
      this.defenseGame.updateAlliedInfo(alliedInfo);
      
      // 장비 효과 적용
      const stats = this.equipmentManager.getTotalStats();
      this.defenseGame.turret.damage = 10 + stats.damage;

      // 터미널 명령어 옵션 표시
      setTimeout(async () => {
        this.terminal.printSystemMessage("System Idle. Ready for Operations.");
        await this.showCommandMenu();
      }, 1000);

    } else if (mode === "breach") {
      // 1. 디펜스 정지 및 숨김
      this.defenseGame.stop();

      // 2. 터미널 및 UI 조정
      this.terminal.setTransparentMode(true);
      this.terminal.clear();
      this.terminal.printSystemMessage("BREACH_PROTOCOL_INITIATED");
      this.terminal.printSystemMessage("Objective: Clear lines to acquire Equipment.");

      // 3. 테트리스 시작 (장비 획득 목표)
      this.startBreachMode();
    }
  }

  /**
   * 터미널 명령어 메뉴 표시
   */
  async showCommandMenu() {
    const currentStage = this.stageManager.getCurrentStage();
    
    const choice = await this.terminal.showChoices([
      { text: "/map (Open Stage Map)", value: "map" },
      { text: "/breach_defense (Enter Tetris - Get Equipment)", value: "breach" }
    ]);
    
    if (choice === "map") {
      await this.showMap();
    } else if (choice === "breach") {
      this.switchMode("breach");
    }
  }

  /**
   * 맵 UI 표시
   */
  async showMap() {
    this.defenseGame.pause(); // 디펜스 일시정지
    
    const mapData = this.stageManager.getMapData();
    
    // 맵 오버레이 생성
    const overlay = document.createElement("div");
    overlay.id = "map-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 3000;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
    `;

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ff00;
      font-family: var(--term-font);
      font-size: 24px;
      margin-bottom: 20px;
      text-shadow: 0 0 10px #00ff00;
    `;
    header.innerText = "[ STAGE MAP ]";
    overlay.appendChild(header);

    // 맵 컨테이너
    const mapContainer = document.createElement("div");
    mapContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 100px);
      grid-template-rows: repeat(5, 80px);
      gap: 10px;
      justify-content: center;
      align-content: center;
    `;

    // 스테이지 버튼 생성
    mapData.stages.forEach(stage => {
      const btn = document.createElement("button");
      btn.className = "map-stage-btn";
      
      // 위치 계산 (row 0~4, col 0~2)
      const gridRow = stage.position.row + 1;
      const gridCol = stage.position.col + 1;
      
      // 스타일 설정
      let bgColor, borderColor, textColor;
      if (stage.id === mapData.currentStageId) {
        bgColor = "rgba(0, 255, 0, 0.3)";
        borderColor = "#00ff00";
        textColor = "#00ff00";
      } else if (stage.conquered) {
        bgColor = "rgba(0, 150, 255, 0.3)";
        borderColor = "#00aaff";
        textColor = "#00aaff";
      } else if (stage.type === "boss") {
        bgColor = "rgba(255, 0, 0, 0.3)";
        borderColor = "#ff0000";
        textColor = "#ff0000";
      } else if (stage.type === "farming") {
        bgColor = "rgba(255, 200, 0, 0.3)";
        borderColor = "#ffcc00";
        textColor = "#ffcc00";
      } else {
        bgColor = "rgba(100, 100, 100, 0.3)";
        borderColor = "#666";
        textColor = "#999";
      }

      btn.style.cssText = `
        grid-row: ${gridRow};
        grid-column: ${gridCol};
        background: ${bgColor};
        border: 2px solid ${borderColor};
        color: ${textColor};
        font-family: var(--term-font);
        font-size: 11px;
        padding: 5px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      `;
      
      // 현재 위치 표시
      const currentMarker = stage.id === mapData.currentStageId ? ">> " : "";
      const conqueredMarker = stage.conquered ? " ✓" : "";
      
      btn.innerHTML = `
        <div style="font-weight:bold;">${currentMarker}${stage.name}${conqueredMarker}</div>
        <div style="font-size:9px;margin-top:3px;">${stage.type.toUpperCase()}</div>
      `;

      // 클릭 이벤트
      btn.onclick = () => this.handleMapStageClick(stage, overlay);

      // 호버 효과
      btn.onmouseenter = () => {
        btn.style.transform = "scale(1.05)";
        btn.style.boxShadow = `0 0 15px ${borderColor}`;
      };
      btn.onmouseleave = () => {
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = "none";
      };

      mapContainer.appendChild(btn);
    });

    overlay.appendChild(mapContainer);

    // 현재 스테이지 정보
    const currentStage = this.stageManager.getCurrentStage();
    const info = document.createElement("div");
    info.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 14px;
      margin-top: 20px;
      text-align: center;
      max-width: 300px;
    `;
    info.innerHTML = `
      <div style="color:#00ff00;margin-bottom:10px;">Current: ${currentStage.name}</div>
      <div>${currentStage.description}</div>
      <div style="margin-top:10px;color:#666;">Conquered: ${mapData.conqueredCount}/4</div>
    `;
    overlay.appendChild(info);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      margin-top: 20px;
      padding: 10px 30px;
      background: transparent;
      border: 2px solid #ff0000;
      color: #ff0000;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.innerText = "[CLOSE MAP]";
    closeBtn.onclick = () => {
      overlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
  }

  /**
   * 맵에서 스테이지 클릭 시 처리
   */
  async handleMapStageClick(stage, overlay) {
    const result = this.stageManager.moveToStage(stage.id);
    
    if (result.success) {
      overlay.remove();
      
      // 스테이지 설정 적용
      this.applyStageSettings(result.stage);
      
      // 디펜스 게임 재시작
      this.defenseGame.resume();
      
      this.terminal.printSystemMessage(`Moved to: ${result.stage.name}`);
      this.terminal.printSystemMessage(result.stage.description);
      
      await this.showCommandMenu();
    } else {
      this.terminal.printSystemMessage(`ACCESS DENIED: ${result.message}`);
    }
  }

  /**
   * 스테이지 설정을 DefenseGame에 적용
   */
  applyStageSettings(stage) {
    // 안전영역 여부
    this.defenseGame.isSafeZone = (stage.type === "safe");
    this.defenseGame.safeZoneSpawnRate = stage.spawnRate;
    this.defenseGame.spawnRate = stage.spawnRate;
    
    // 페이지 시스템
    if (!stage.hasPages) {
      this.defenseGame.currentPage = 0;
    } else {
      this.defenseGame.currentPage = 1;
      this.defenseGame.pageTimer = 0;
    }
    
    // UI 업데이트
    this.defenseGame.updateWaveDisplay();
    
    // 적 초기화
    this.defenseGame.enemies = [];
  }

  loadPermanentPerks() {
    // 저장된 영구 퍽 ID 목록 로드 (v2 Map 구조)
    const saved = localStorage.getItem("acquired_perm_perks_v2");
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        this.acquiredPermPerks = new Map(Object.entries(obj));
      } catch (e) {
        console.error("Failed to load perks", e);
        this.acquiredPermPerks = new Map();
        this.acquiredPermPerks.set("root", 1);
      }
    } else {
      // 구버전 데이터 마이그레이션
      const oldSaved = localStorage.getItem("acquired_perm_perks");
      if (oldSaved) {
        try {
          const ids = JSON.parse(oldSaved);
          this.acquiredPermPerks = new Map();
          this.acquiredPermPerks.set("root", 1);
          if (Array.isArray(ids)) {
            ids.forEach((id) => this.acquiredPermPerks.set(id, 1));
          }
          this.savePermanentPerks();
        } catch (e) {
          this.acquiredPermPerks = new Map();
          this.acquiredPermPerks.set("root", 1);
        }
      } else {
        this.acquiredPermPerks = new Map();
        this.acquiredPermPerks.set("root", 1);
      }
    }

    // 효과 적용
    this.applyPermanentEffects();
  }

  savePermanentPerks() {
    const obj = Object.fromEntries(this.acquiredPermPerks);
    localStorage.setItem("acquired_perm_perks_v2", JSON.stringify(obj));
  }

  applyPermanentEffects() {
    // 효과 초기화
    this.currentMoney = 0; // 시작 머니는 0에서 보너스 합산
    this.perkManager.activeEffects.scoreMultiplier = 1.0;
    this.perkManager.activeEffects.shopDiscount = 0.0;
    
    let bonusMoney = 0;
    let bonusScore = 0;
    let bonusLuck = 0;
    let bonusDiscount = 0;

    this.acquiredPermPerks.forEach((level, id) => {
      let nodeId = id;
      let nodeLevel = level;

      if (typeof id === "string") {
        nodeId = id;
        nodeLevel = level;
      } else if (typeof level === "string") {
        nodeId = level;
        nodeLevel = 1;
      }

      const node = this.permTree.find((n) => n.id === nodeId);
      if (node && node.effect) {
        if (node.effect.startMoney)
          bonusMoney += node.effect.startMoney * nodeLevel;
        if (node.effect.scoreMult)
          bonusScore += node.effect.scoreMult * nodeLevel;
        if (node.effect.luck) bonusLuck += node.effect.luck * nodeLevel;
        if (node.effect.discount)
          bonusDiscount += node.effect.discount * nodeLevel;
      }
    });

    this.currentMoney += bonusMoney;
    this.perkManager.activeEffects.scoreMultiplier += bonusScore;
    this.perkManager.activeEffects.bombChance += bonusLuck;
    this.perkManager.activeEffects.goldChance += bonusLuck;
    this.perkManager.activeEffects.miscChance += bonusLuck * 0.5;
    this.perkManager.activeEffects.shopDiscount += bonusDiscount;
  }

  loadReputation() {
    const saved = localStorage.getItem("hacker_reputation");
    if (saved) {
      this.reputation = parseInt(saved, 10);
    }
  }

  saveReputation() {
    localStorage.setItem("hacker_reputation", this.reputation.toString());
  }

  consumeRevive() {
    if (this.perkManager.activeEffects.reviveCount > 0) {
      this.perkManager.activeEffects.reviveCount--;
      return true;
    }
    return false;
  }

  async startIntro() {
    this.terminal.show();
    await this.terminal.typeText("Initializing HACKER_PROTOCOL v22...", 20);
    await new Promise((r) => setTimeout(r, 500));
    await this.terminal.typeText("Connecting to local proxy...", 20);
    await new Promise((r) => setTimeout(r, 500));

    if (true) {
      await this.terminal.typeText(`REP LEVEL: ${this.reputation}`, 20);

      // 영구 강화 메뉴 진입 여부 확인
      await this.terminal.typeText("Access System Upgrades?", 30);
      const choice = await this.terminal.showChoices([
        { text: "YES (Spend Reputation)", value: "yes" },
        { text: "NO (Start Operation)", value: "no" },
      ]);

      if (choice === "yes") {
        await this.enterPermanentShop();
      }
    }

    this.terminal.clear();
    await this.terminal.typeText("반갑다. 신입.", 50);
    await new Promise((r) => setTimeout(r, 800));
    await this.terminal.typeText("실전에 투입되기 전에 테스트를 거치겠다.", 40);
    await this.terminal.typeText(
      "간단한 보안벽이다. 데이터 3줄을 탈취해라.",
      40
    );

    await this.terminal.waitForEnter();
    this.startTutorial();
  }

  async enterPermanentShop() {
    // 이벤트 리스너 (업그레이드 처리)
    const upgradeHandler = async (e) => {
      const { nodeId, cost } = e.detail;
      const node = this.permTree.find((n) => n.id === nodeId);

      if (node && this.reputation >= cost) {
        this.reputation -= cost;
        const currentLvl = this.acquiredPermPerks.get(nodeId) || 0;
        this.acquiredPermPerks.set(nodeId, currentLvl + 1);

        this.saveReputation();
        this.savePermanentPerks();

        // UI 갱신 (다시 그리기)
        const mapContainer = document.querySelector(".node-map");
        if (mapContainer) {
          mapContainer.innerHTML = ""; // 비우기
          this.terminal.renderPermanentNodeMap(
            mapContainer,
            this.permTree,
            this.acquiredPermPerks,
            this.reputation
          );
          // 상단 REP 갱신
          const repEl = document.getElementById("shop-money-val");
          if (repEl) repEl.innerText = this.reputation;
        }
      }
    };

    document.addEventListener("perm-upgrade", upgradeHandler);

    await this.terminal.showPermanentShop(
      this.permTree,
      this.acquiredPermPerks,
      this.reputation
    );

    document.removeEventListener("perm-upgrade", upgradeHandler);

    this.perkManager.reset();
    this.applyPermanentEffects();
  }

  startTutorial() {
    this.currentStage = 0;
    this.currentMoney = 0;
    this.perkManager.reset();

    this.terminal.printSystemMessage("Entering Simulation Mode...");

    // 튜토리얼은 예외적으로 바로 테트리스 시작
    this.activeMode = "mining";
    this.transitionToGame(3, 1000);
  }

  async handleMiningClear(linesCleared) {
    // 획득한 데이터 계산
    const earnedData = (linesCleared || 0) * 100;
    this.currentMoney += earnedData;

    // --- 클리어 연출 시작 ---
    await this.terminal.showMiningCompleteSequence();

    // 3. 게임 화면 페이드 아웃 및 터미널 복귀
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.clear();

    if (this.currentStage === 0) {
      // 튜토리얼 클리어
      localStorage.setItem("tutorial_completed", "true");
      await this.terminal.typeText("ACCESS GRANTED.", 30);
      await this.terminal.typeText(`Data Acquired: ${earnedData} MB`, 20);
      await new Promise((r) => setTimeout(r, 1000));
      await this.terminal.typeText("나쁘지 않군. 시뮬레이션 종료.", 40);
      await this.terminal.typeText(
        "이제 진짜다. 보안 시스템 메인프레임에 접속한다.",
        40
      );

      await this.terminal.waitForEnter();
      this.switchMode("defense");
    } else {
      // 일반 스테이지 클리어 -> 분기점 (상점 or Defense 복귀)
      await this.terminal.typeText(`System Log: Mining complete.`, 10);
      await this.terminal.typeText(`BATCH ${this.currentStage} CLEARED.`, 30);
      await this.terminal.typeText(`Data Mined: ${earnedData} MB`, 20);
      await this.terminal.typeText(
        `Total Storage: ${this.currentMoney} MB`,
        20
      );
      await this.terminal.typeText("Waiting for next command...", 30);

      const choice = await this.terminal.showChoices([
        { text: "/return_base (Defense Mode)", value: "defense" },
        { text: "/access_darknet (Open Shop)", value: "shop" },
        { text: "/continue_mining (Next Batch)", value: "next" }
      ]);

      if (choice === "shop") {
        await this.enterShop();
      } else if (choice === "defense") {
        this.switchMode("defense");
      } else {
        this.switchMode("mining"); // 다시 채굴 시작 (스테이지 증가는 switchMode 내부에서 처리하거나 여기서?)
        // switchMode('mining')은 이미 activeMode가 mining이면 스테이지 증가 로직을 타야 함.
        // 현재 로직상 switchMode('mining')이 내부적으로 startMiningStage를 부르므로 OK.
      }
    }
  }

  async enterShop() {
    // 상점 이벤트 리스너 임시 등록 (구매 처리)
    const buyHandler = (e) => {
      const { perkId, cost } = e.detail;
      if (this.currentMoney >= cost) {
        this.currentMoney -= cost;
        this.perkManager.unlock(perkId);
        this.terminal.showShop(this.perkManager, this.currentMoney).then(() => {
          this.switchMode("defense"); // 상점 나가면 디펜스로 복귀
          document.removeEventListener("perk-buy", buyHandler);
        });
      }
    };
    document.addEventListener("perk-buy", buyHandler);

    await this.terminal.showShop(this.perkManager, this.currentMoney);

    document.removeEventListener("perk-buy", buyHandler);
    this.switchMode("defense");
  }

  startBreachMode() {
    const targetLines = 10; // 고정 목표 라인 수
    const speed = 600; // 적당한 속도
    
    setTimeout(() => {
      document.getElementById("game-container").style.opacity = 1;
      document.getElementById("game-ui").style.display = "block";
      this.terminal.setTransparentMode(true);
      this.terminal.clear();

      this.tetrisGame.startGame(targetLines, speed);
    }, 500);
  }

  startMiningStage() {
    this.terminal.clear();
    this.terminal.printSystemMessage(
      `Injecting Payload... Batch ${this.currentStage}`
    );

    // 퍽 효과 적용
    const effects = this.perkManager.getEffects();

    // 난이도 계산
    let baseSpeed = Math.max(100, 800 - (this.currentStage - 1) * 60);
    let finalSpeed = baseSpeed * effects.speedModifier;

    // 목표 라인: 스테이지 * 5
    let targetLines = this.currentStage * 5;

    this.transitionToGame(targetLines, finalSpeed);
  }

  transitionToGame(targetLines, speed) {
    setTimeout(() => {
      document.getElementById("game-container").style.opacity = 1;
      document.getElementById("game-ui").style.display = "block";
      this.terminal.setTransparentMode(true);
      this.terminal.clear();

      this.tetrisGame.startGame(targetLines, speed);
    }, 1000);
  }

  async handleMiningGameOver(score) {
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.clear();

    const effects = this.perkManager.getEffects();
    const finalScore = Math.floor(score * effects.scoreMultiplier);

    // 평판 획득 (점수 1000점당 1, 스테이지당 10)
    const earnedRep = Math.floor(finalScore / 1000) + this.currentStage * 10;
    this.reputation += earnedRep;
    this.saveReputation();

    document.getElementById("game-over-screen").classList.remove("hidden");
    document.getElementById("final-score").innerText = finalScore;

    let repEl = document.getElementById("earned-rep");
    if (!repEl) {
      repEl = document.createElement("div");
      repEl.id = "earned-rep";
      repEl.style.color = "#33ff00";
      repEl.style.marginTop = "10px";
      const btn = document.querySelector("#game-over-screen button");
      if (btn) btn.parentNode.insertBefore(repEl, btn);
      else document.getElementById("game-over-screen").appendChild(repEl);
    }
    repEl.innerText = `REPUTATION GAINED: ${earnedRep} (TOTAL: ${this.reputation})`;
    
    // 게임오버 시 리셋 버튼 동작을 가로채서 GameManager가 처리해야 함.
    // 현재는 location.reload()가 걸려있을 수 있음. -> index.html 확인 필요.
    // 하지만 여기서 Defense 모드로 복귀시켜주는게 더 자연스러움.
    // "SYSTEM FAILURE. RETURNING TO SAFE MODE..."
    
    // 일단 기존 구조 유지 (재시작 버튼 클릭 시 페이지 리로드)
  }

  async handleBreachClear(lines) {
      // 장비 획득
      const item = this.equipmentManager.generateEquipment(this.defenseGame.currentPage || 1);
      this.equipmentManager.addItem(item);
      
      // 연출
      this.tetrisGame.state.isPlaying = false;
      document.getElementById("game-ui").style.display = "none";
      this.terminal.setTransparentMode(false);
      this.terminal.show();
      this.terminal.clear();
      
      await this.terminal.typeText("THREAT ELIMINATED.", 30);
      await this.terminal.typeText("Security Systems Restored.", 20);
      await this.terminal.typeText(`[LOOT ACQUIRED]`, 30);
      
      await this.terminal.typeText(`> ${item.name}`, 30); 
      await this.terminal.typeText(`Power: ${item.stats.power}`, 20);
      
      if (this.equipmentManager.autoEquip(item)) {
           await this.terminal.typeText("(Auto Equipped!)", 20);
      }
      
      await this.terminal.waitForEnter();
      
      // 디펜스로 복귀 (장비 효과 적용)
      this.switchMode("defense");
  }

  async handleBreachFail(score) {
      // 패배 시 빈털터리로 복귀
      this.tetrisGame.state.isPlaying = false;
      document.getElementById("game-ui").style.display = "none";
      this.terminal.setTransparentMode(false);
      this.terminal.show();
      this.terminal.clear();
      
      await this.terminal.typeText("DEFENSE FAILED.", 50);
      await this.terminal.typeText("Systems compromised...", 30);
      await this.terminal.typeText("Returning to core defense (Vulnerable).", 30);
      
      await new Promise(r => setTimeout(r, 1500));
      
      this.switchMode("defense");
  }

  async handleConquest() {
      // 1. 점령 로직 실행 (병합 등 계산)
      const result = this.conquestManager.conquerStage();
      
      // 2. 터미널 연출
      this.terminal.setDefenseMode(false); 
      this.terminal.clear();
      
      await this.terminal.typeText("!!! SYSTEM CONQUERED !!!", 30);
      await this.terminal.typeText(`Total Conquered: ${result.total}`, 20);
      await this.terminal.typeText(`Mining Rate: ${result.miningRate}/sec`, 20);
      
      if (result.total % 2 === 0) {
           await this.terminal.typeText(">> SECTORS MERGED <<", 30);
           await this.terminal.typeText(`Allied Virus Level Up: ${result.level}`, 30);
      }
      
      await this.terminal.waitForEnter();
      
      // 3. 디펜스 게임에 아군 정보 업데이트
      const alliedInfo = this.conquestManager.getAlliedInfo();
      this.defenseGame.updateAlliedInfo(alliedInfo);
      
      // 4. 다시 디펜스 모드로 복귀 (다음 스테이지 느낌으로)
      this.terminal.setDefenseMode(true);
      this.terminal.clear();
      this.terminal.printSystemMessage("ADVANCING TO NEXT SECTOR...");
      
      // 난이도 상승 등 추가 처리가 필요하다면 여기서
  }

  async handleDefenseGameOver() {
    // 1. UI 연출 (붉은색 경고)
    this.terminal.setDefenseMode(false); // 다시 배경 어둡게
    this.terminal.clear();
    
    // 붉은색 텍스트 스타일
    const errorStyle = "color: #ff3333; font-weight: bold; text-shadow: 0 0 10px #f00;";
    
    // 긴급 메시지 출력
    await this.terminal.typeText("!!! WARNING !!!", 10);
    await this.terminal.typeText("CORE INTEGRITY REACHED 0%", 10);
    await this.terminal.typeText("SYSTEM CRITICAL FAILURE.", 30);
    await this.terminal.typeText("ALL PROCESSES TERMINATED.", 20);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 재시작 선택지
    const choice = await this.terminal.showChoices([
        { text: "SYSTEM REBOOT (Restart Game)", value: "reboot" }
    ]);

    if (choice === "reboot") {
        location.reload(); // 페이지 새로고침
    }
  }
}
