import { TerminalUI } from "./TerminalUI.js";
import { TetrisGame } from "./TetrisGame.js";
import { DefenseGame } from "./DefenseGame.js";
import { PerkManager } from "./PerkManager.js";
import { ConquestManager } from "./ConquestManager.js";
import { EquipmentManager } from "./EquipmentManager.js";
import { StageManager } from "./StageManager.js";
import { InventoryManager } from "./InventoryManager.js";

export class GameManager {
  constructor() {
    this.terminal = new TerminalUI();
    this.tetrisGame = new TetrisGame("game-container");
    this.defenseGame = new DefenseGame("game-container");
    this.perkManager = new PerkManager();
    this.conquestManager = new ConquestManager();
    this.equipmentManager = new EquipmentManager();
    this.stageManager = new StageManager();
    this.inventoryManager = new InventoryManager(); // 인벤토리 매니저 추가

    // 디펜스 게임 이벤트 연결
    this.defenseGame.onResourceGained = (amount) => {
        this.currentMoney += amount;
        // 터미널에 DATA 표시 업데이트
        this.terminal.updateData(this.currentMoney);
    };
    this.defenseGame.onDataUpdate = (amount) => {
        // 터미널에 DATA 표시 업데이트
        this.terminal.updateData(amount);
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

    // 점령 모드 상태
    this.isConquestMode = false;
    this.conquestTetrisComplete = false;
    this.conquestSplitScreen = null;
    this.miniDefenseLoop = null;

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

    createBtn("MAX PAGE", () => {
      if (this.defenseGame && !this.defenseGame.isSafeZone) {
        const maxPages = this.defenseGame.maxPages || 12;
        this.defenseGame.currentPage = maxPages;
        this.defenseGame.updateWaveDisplay();
        // conquerBtn은 더 이상 사용하지 않음 (터미널에서 표시)
        this.defenseGame.pageDisplay.innerText = "∞ READY";
        this.defenseGame.pageDisplay.style.color = "#ff3333";
        this.defenseGame.pageDisplay.style.borderColor = "#ff3333";
        this.terminal.printSystemMessage("[DEBUG] Skipped to MAX PAGE - CONQUER READY!");
        
        // 선택지 다시 표시 (점령 옵션 포함)
        setTimeout(() => this.showCommandMenu(), 500);
      } else {
        this.terminal.printSystemMessage("[DEBUG] Not in conquest stage!");
      }
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
      await this.terminal.typeText("Initiating Defense Protocol...", 20);
      await new Promise((r) => setTimeout(r, 500));

      // 바로 게임 시작 (평판 시스템 스킵)
      this.switchMode("defense");
    } else {
      await this.startIntro();
    }
  }

  async switchMode(mode) {
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
      await this.terminal.printSystemMessage("DEFENSE_PROTOCOL_INITIATED");

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
        await this.terminal.printSystemMessage("System Idle. Ready for Operations.");
        await this.showCommandMenu();
      }, 1000);

    } else if (mode === "breach") {
      // 1. 디펜스 정지 및 숨김
      this.defenseGame.stop();

      // 2. 터미널 및 UI 조정
      this.terminal.setTransparentMode(true);
      this.terminal.clear();
      await this.terminal.printSystemMessage("BREACH_PROTOCOL_INITIATED");
      await this.terminal.printSystemMessage("Objective: Clear lines to acquire Equipment.");

      // 3. 테트리스 시작 (장비 획득 목표)
      this.startBreachMode();
    }
  }

  /**
   * 터미널 명령어 메뉴 표시
   */
  async showCommandMenu() {
    const currentStage = this.stageManager.getCurrentStage();
    
    // 최대 페이지 도달 시 점령 옵션 추가
    const isConquerReady = this.defenseGame && 
      !this.defenseGame.isSafeZone && 
      this.defenseGame.currentPage >= (this.defenseGame.maxPages || 12);
    
    const choices = [
      { text: "/map (Open Stage Map)", value: "map" },
      { text: "/inventory (Equipment & Items)", value: "inventory" },
      { text: "/upgrade (System Upgrades)", value: "upgrade" }
    ];
    
    // 점령 가능 시 빨간색 큰 선택지 추가
    if (isConquerReady) {
      choices.unshift({ 
        text: ">>> CONQUER THIS SECTOR <<<", 
        value: "conquer",
        style: "conquer" // 특별 스타일
      });
    }
    
    const choice = await this.terminal.showChoices(choices);
    
    if (choice === "conquer") {
      await this.handleConquerFromTerminal();
    } else if (choice === "map") {
      await this.showMap();
    } else if (choice === "inventory") {
      await this.showInventory();
    } else if (choice === "upgrade") {
      await this.showUpgrades();
    }
  }
  
  // 터미널에서 점령 선택 시
  async handleConquerFromTerminal() {
    // 1. DefenseGame의 실드 파괴 연출
    this.defenseGame.handleConquerClick();
    
    // 2. 점령 메시지
    await this.terminal.printSystemMessage("INITIATING CONQUEST PROTOCOL...");
    await this.terminal.printSystemMessage("FIREWALL BREACH DETECTED!");
    await this.terminal.printSystemMessage("Objective: Clear 3 lines + Survive 3 waves.");
    
    // 3. 강화 페이지 모드 설정
    this.isConquestMode = true;
    this.conquestTetrisComplete = false;
    this.defenseGame.startReinforcementMode(3); // 강화 페이지 3개
    
    // 4. 바로 테트리스 시작 (딜레이 제거)
    this.startConquestTetris();
  }
  
  // 점령용 테트리스 시작 (디펜스는 미니 화면에서 계속)
  startConquestTetris() {
    const targetLines = 3;
    const speed = 500;
    
    // 테트리스 상단 UI 숨기기 (Mining Rate, DATA MINED 등)
    this.hideConquestTetrisUI();
    
    // 미니 디펜스 패널 생성 (캔버스 포함)
    this.createMiniDefensePanel();
    
    // 디펜스 메인 캔버스는 숨기고, resume() 호출
    this.defenseGame.canvas.style.display = "none";
    this.defenseGame.uiLayer.style.display = "none";
    this.defenseGame.resume();
    
    // 테트리스 시작
    const gameContainer = document.getElementById("game-container");
    gameContainer.style.opacity = 1;
    document.getElementById("game-ui").style.display = "block";
    this.terminal.setTransparentMode(true);
    this.terminal.hide(); // 터미널 완전히 숨기기
    this.tetrisGame.startGame(targetLines, speed);
    
    // 미니 디펜스 렌더링 시작
    this.startMiniDefenseRender();
  }
  
  // 테트리스 상단 UI 숨기기 (점령 모드) - NEXT 블럭은 유지
  hideConquestTetrisUI() {
    const gameUI = document.getElementById("game-ui");
    if (!gameUI) return;
    
    // LEVEL, DATA MINED만 숨기기 (NEXT 블럭은 유지)
    const levelBox = gameUI.querySelector(".level-box");
    const scoreBoard = gameUI.querySelector(".score-board");
    
    if (levelBox) levelBox.style.display = "none";
    if (scoreBoard) scoreBoard.style.display = "none";
  }
  
  // 테트리스 상단 UI 복구
  showConquestTetrisUI() {
    const gameUI = document.getElementById("game-ui");
    if (!gameUI) return;
    
    const levelBox = gameUI.querySelector(".level-box");
    const scoreBoard = gameUI.querySelector(".score-board");
    
    if (levelBox) levelBox.style.display = "";
    if (scoreBoard) scoreBoard.style.display = "";
  }
  
  // 미니 디펜스 패널 생성 (상단 전체에 크게 배치)
  createMiniDefensePanel() {
    // 기존 패널 제거
    const existing = document.getElementById("mini-defense-panel");
    if (existing) existing.remove();
    
    // NEXT 블록 위치 변경 (왼쪽 하단으로)
    const nextBox = document.querySelector(".next-box");
    if (nextBox) {
      nextBox.style.cssText = `
        position: fixed !important;
        bottom: 100px;
        left: 10px;
        top: auto !important;
        right: auto !important;
        z-index: 1001;
      `;
    }
    
    const panel = document.createElement("div");
    panel.id = "mini-defense-panel";
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      padding: 8px;
      background: rgba(0, 10, 0, 0.95);
      border: 2px solid #ff3333;
      border-radius: 5px;
      color: #ff3333;
      font-family: var(--term-font);
      font-size: 12px;
      z-index: 1000;
      height: 180px;
    `;
    
    // 정보 영역 (상단)
    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ff3333;
      font-size: 14px;
    `;
    infoDiv.innerHTML = `
      <span id="conquest-core-hp">♥ 100%</span>
      <span style="color: #00ff00;">DEFENSE MODE</span>
      <span id="conquest-page">⚔️ WAVE 1/3</span>
    `;
    panel.appendChild(infoDiv);
    
    // 미니 캔버스 (디펜스 렌더링용) - 크게!
    const miniCanvas = document.createElement("canvas");
    miniCanvas.id = "mini-defense-canvas";
    miniCanvas.width = 400;
    miniCanvas.height = 150;
    miniCanvas.style.cssText = `
      width: 100%;
      height: 140px;
      background: #001100;
      border-radius: 3px;
    `;
    panel.appendChild(miniCanvas);
    
    document.body.appendChild(panel);
  }
  
  // NEXT 블록 위치 복구
  restoreNextBoxPosition() {
    const nextBox = document.querySelector(".next-box");
    if (nextBox) {
      nextBox.style.cssText = "";
    }
  }
  
  // 미니 디펜스 렌더링 시작
  startMiniDefenseRender() {
    const miniCanvas = document.getElementById("mini-defense-canvas");
    if (!miniCanvas) return;
    
    const ctx = miniCanvas.getContext("2d");
    
    this.defenseMonitorLoop = () => {
      if (!this.isConquestMode) return;
      
      // 미니 캔버스에 디펜스 렌더링 - 캔버스 전체를 채우도록 스케일 업
      const scaleX = miniCanvas.width / this.defenseGame.canvas.width;
      const scaleY = miniCanvas.height / this.defenseGame.canvas.height;
      const scale = Math.max(scaleX, scaleY) * 1.2; // 더 크게!
      
      ctx.fillStyle = "#001100";
      ctx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
      
      ctx.save();
      ctx.translate(miniCanvas.width / 2, miniCanvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-this.defenseGame.canvas.width / 2, -this.defenseGame.canvas.height / 2);
      
      // 원본 디펜스 캔버스 복사
      ctx.drawImage(this.defenseGame.canvas, 0, 0);
      ctx.restore();
      
      // 정보 업데이트
      const hpPercent = Math.ceil((this.defenseGame.core.hp / this.defenseGame.core.maxHp) * 100);
      const page = this.defenseGame.reinforcementPage || 1;
      const maxPage = this.defenseGame.reinforcementMaxPages || 3;
      
      const coreEl = document.getElementById("conquest-core-hp");
      const pageEl = document.getElementById("conquest-page");
      
      if (coreEl) coreEl.textContent = `♥ ${hpPercent}%`;
      if (pageEl) pageEl.textContent = `⚔️ ${page}/${maxPage}`;
      
      // HP에 따라 패널 색상 변경
      const panel = document.getElementById("mini-defense-panel");
      if (panel) {
        if (hpPercent <= 30) {
          panel.style.borderColor = "#ff0000";
        } else if (hpPercent <= 60) {
          panel.style.borderColor = "#ffaa00";
        } else {
          panel.style.borderColor = "#ff3333";
        }
      }
      
      // 강화 페이지 완료 체크
      if (this.defenseGame.reinforcementComplete) {
        this.handleConquestComplete();
        return;
      }
      
      // 코어 파괴 체크
      if (this.defenseGame.core.hp <= 0) {
        this.handleConquestFail();
        return;
      }
      
      requestAnimationFrame(this.defenseMonitorLoop);
    };
    
    requestAnimationFrame(this.defenseMonitorLoop);
  }
  
  // 테트리스 클리어 시 (점령 모드) - 바로 디펜스로 복귀
  handleConquestTetrisClear() {
    if (!this.isConquestMode) return;
    
    this.conquestTetrisComplete = true;
    
    // 테트리스 UI 정리
    this.tetrisGame.state.isPlaying = false;
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();
    
    // 미니 패널 제거
    const panel = document.getElementById("mini-defense-panel");
    if (panel) panel.remove();
    
    // 디펜스 화면 복구 및 재개
    this.defenseGame.canvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";
    this.defenseGame.resume(); // 디펜스 재개! (강화 페이지 진행을 위해)
    
    // 터미널 복구
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.setDefenseMode(true);
    this.terminal.printSystemMessage("FIREWALL BREACHED! Defend the core!");
    
    // defenseMonitorLoop가 계속 돌면서 강화 페이지 완료 체크
  }
  
  // 점령 완료
  async handleConquestComplete() {
    this.isConquestMode = false;
    
    // 테트리스 정리 (혹시 아직 플레이 중이면)
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }
    
    // 미니 패널 제거
    const panel = document.getElementById("mini-defense-panel");
    if (panel) panel.remove();
    
    // 테트리스 UI 완전 정리
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) gameContainer.style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();
    
    // 디펜스 화면 복구
    this.defenseGame.canvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";
    
    // 점령 처리
    this.conquestManager.conquerStage();
    
    // 현재 스테이지를 점령 상태로 설정
    const currentStage = this.stageManager.getCurrentStage();
    if (currentStage) {
        this.stageManager.setConquered(currentStage.id, true);
    }
    
    // 디펜스 게임에 점령 상태 설정 (시각화 + 아군 10마리)
    this.defenseGame.setConqueredState(true);
    this.defenseGame.resume(); // 디펜스 재개
    
    // 터미널 표시 및 메시지
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.setDefenseMode(true);
    await this.terminal.printSystemMessage("!!! SECTOR CONQUERED !!!");
    await this.terminal.printSystemMessage("Territory secured.");
    
    // 선택지 표시
    await this.showCommandMenu();
  }
  
  // 점령 실패
  async handleConquestFail() {
    this.isConquestMode = false;
    
    // 테트리스 정리
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI(); // 상단 UI 복구
    this.restoreNextBoxPosition(); // NEXT 블록 위치 복구
    
    // 미니 패널 제거
    const panel = document.getElementById("mini-defense-panel");
    if (panel) panel.remove();
    
    // 디펜스 정리
    this.defenseGame.canvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";
    
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    await this.terminal.printSystemMessage("CONQUEST FAILED - Core Destroyed");
    
    // 게임 오버 처리
    this.handleDefenseGameOver();
  }

  /**
   * 맵 UI 표시
   */
  async showMap() {
    this.defenseGame.pause(); // 디펜스 일시정지
    
    // 터미널 애니메이션 (오버레이 유지)
    const bgOverlay = await this.playTerminalAnimation("ACCESSING STAGE MAP...", true);
    
    const mapData = this.stageManager.getMapData();
    
    // 맵 컨테이너 (기존 오버레이 위에 생성하거나 교체)
    // 여기서는 bgOverlay를 재활용하여 자연스럽게 전환
    bgOverlay.id = "map-overlay";
    bgOverlay.style.background = "rgba(0, 0, 0, 0.95)";
    bgOverlay.style.flexDirection = "column";
    bgOverlay.style.justifyContent = "flex-start"; // 상단 정렬로 변경
    bgOverlay.style.padding = "20px";
    bgOverlay.style.boxSizing = "border-box";
    bgOverlay.style.overflowY = "auto";
    
    // 스캔 라인 효과 추가
    const scanline = document.createElement("div");
    scanline.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 5px;
      background: rgba(0, 255, 0, 0.5);
      opacity: 0.5;
      animation: scan 2s linear infinite;
      pointer-events: none;
    `;
    bgOverlay.appendChild(scanline);

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
    bgOverlay.appendChild(header);

    // 맵 컨테이너
    const mapContainer = document.createElement("div");
    mapContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 100px);
      grid-template-rows: repeat(5, 80px);
      gap: 10px;
      justify-content: center;
      align-content: center;
      flex: 1; /* 남은 공간 차지 */
    `;

    // 스테이지 버튼 생성 (새 색상 규칙)
    const accessibleIds = this.stageManager.getAccessibleStages().map(s => s.id);
    
    mapData.stages.forEach(stage => {
      const btn = document.createElement("button");
      btn.className = "map-stage-btn";
      
      // 위치 계산 (row 0~4, col 0~2)
      const gridRow = stage.position.row + 1;
      const gridCol = stage.position.col + 1;
      
      // 상태 확인
      const isCurrent = stage.id === mapData.currentStageId;
      const isAccessible = accessibleIds.includes(stage.id);
      const isConquered = stage.conquered;
      const isLocked = !isAccessible && !isConquered;
      
      // 색상 설정 (우선순위: 현재 > 갈수있음 > 점령됨 > 보스 > 파밍 > 잠김)
      let bgColor, borderColor, textColor, extraStyle = "";
      
      if (isCurrent) {
        // 🟢 현재 위치: 밝은 초록 + glow
        bgColor = "rgba(0, 255, 0, 0.4)";
        borderColor = "#00ff00";
        textColor = "#00ff00";
        extraStyle = "box-shadow: 0 0 20px #00ff00, inset 0 0 10px rgba(0,255,0,0.3);";
      } else if (isAccessible && !isConquered) {
        // 🟡 갈 수 있는 곳 (미점령): 노란색 + 깜빡임
        bgColor = "rgba(255, 200, 0, 0.3)";
        borderColor = "#ffcc00";
        textColor = "#ffcc00";
        extraStyle = "animation: pulse 1.5s infinite;";
      } else if (isConquered) {
        // 🔵 점령 완료: 파란색
        bgColor = "rgba(0, 150, 255, 0.3)";
        borderColor = "#00aaff";
        textColor = "#00aaff";
      } else if (stage.type === "boss") {
        // 🔴 보스 (잠김): 어두운 빨간색
        bgColor = "rgba(100, 0, 0, 0.3)";
        borderColor = "#660000";
        textColor = "#880000";
      } else {
        // ⚫ 잠김: 어두운 회색
        bgColor = "rgba(50, 50, 50, 0.3)";
        borderColor = "#333";
        textColor = "#555";
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
        cursor: ${isAccessible ? "pointer" : "not-allowed"};
        text-align: center;
        transition: all 0.2s;
        ${extraStyle}
      `;
      
      // 마커 표시
      const currentMarker = isCurrent ? "▶ " : "";
      const conqueredMarker = isConquered ? " ✓" : "";
      const lockedMarker = isLocked ? " 🔒" : "";
      
      btn.innerHTML = `
        <div style="font-weight:bold;">${currentMarker}${stage.name}${conqueredMarker}${lockedMarker}</div>
        <div style="font-size:9px;margin-top:3px;">${stage.type.toUpperCase()}</div>
      `;

      // 클릭 이벤트 (접근 가능한 경우만)
      if (isAccessible) {
        btn.onclick = () => this.handleMapStageClick(stage, bgOverlay);
        
        // 호버 효과
        btn.onmouseenter = () => {
          btn.style.transform = "scale(1.05)";
          btn.style.boxShadow = `0 0 20px ${borderColor}`;
        };
        btn.onmouseleave = () => {
          btn.style.transform = "scale(1)";
          btn.style.boxShadow = isCurrent ? `0 0 20px #00ff00` : "none";
        };
      }

      mapContainer.appendChild(btn);
    });

    bgOverlay.appendChild(mapContainer);

    // 범례 (Legend)
    const legend = document.createElement("div");
    legend.style.cssText = `
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 15px;
      font-family: var(--term-font);
      font-size: 10px;
    `;
    legend.innerHTML = `
      <span style="color:#00ff00;">● 현재 위치</span>
      <span style="color:#ffcc00;">● 이동 가능</span>
      <span style="color:#00aaff;">● 점령 완료</span>
      <span style="color:#555;">● 잠김 🔒</span>
    `;
    bgOverlay.appendChild(legend);

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
    bgOverlay.appendChild(info);

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
      bgOverlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    bgOverlay.appendChild(closeBtn);

    // CSS 애니메이션 추가 (스캔라인 + 깜빡임)
    if (!document.getElementById("map-animations")) {
      const style = document.createElement("style");
      style.id = "map-animations";
      style.innerHTML = `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          50% { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; border-color: #ffcc00; }
          50% { opacity: 0.6; border-color: #ff8800; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 맵에서 스테이지 클릭 시 처리
   */
  async handleMapStageClick(stage, overlay) {
    const result = this.stageManager.moveToStage(stage.id);
    
    if (result.success) {
      // 1. 장비 선택 (안전영역 제외) - 맵 위에서 바로 진행
      if (stage.type !== "safe") {
        await this.showEquipmentSelection(stage);
      }
      
      overlay.remove();
      
      // 2. 스테이지 설정 적용
      this.applyStageSettings(result.stage);
      
      // 3. 아군 바이러스 정보 업데이트 (playIntroAnimation 전에!)
      const alliedInfo = this.conquestManager.getAlliedInfo();
      this.defenseGame.updateAlliedInfo(alliedInfo);
      
      // 4. 기존 아군 제거 (겹침 방지) 후 게임 시작
      this.defenseGame.alliedViruses = [];
      this.defenseGame.resume();
      
      // 5. 코어 강림 연출 (Canvas 내에서 처리)
      await this.defenseGame.playIntroAnimation();
      
      // 6. 연출 종료 후 시스템 메시지 (타이핑 효과)
      // terminal.clear() 제거 - 메시지 축적 유지
      await this.terminal.printSystemMessage(`DEPLOYED: ${result.stage.name}`);
      
      await this.showCommandMenu();
    } else {
      await this.terminal.printSystemMessage(`ACCESS DENIED: ${result.message}`);
    }
  }

  /**
   * 스테이지 진입 전 장비 선택 UI
   */
  async showEquipmentSelection(stage) {
    return new Promise(resolve => {
      const data = this.inventoryManager.getData();
      
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 5000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `;

      const header = document.createElement("div");
      header.style.cssText = `
        color: #ffcc00;
        font-family: var(--term-font);
        font-size: 16px;
        margin-bottom: 15px;
        text-shadow: 0 0 10px #ffcc00;
        text-align: center;
      `;
      header.innerHTML = `ENTERING: ${stage.name}<br><span style="font-size:12px;color:#aaa;">Select Equipment for this Mission</span>`;
      overlay.appendChild(header);

      // 장비 슬롯 표시
      const equipRow = document.createElement("div");
      equipRow.style.cssText = `
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        padding: 15px;
        border: 2px solid #00ff00;
        background: rgba(0, 50, 0, 0.3);
      `;

      data.slotTypes.forEach((type, idx) => {
        const slot = this.createSlotElement(data.equipSlots[idx], type, idx, true);
        equipRow.appendChild(slot);
      });
      overlay.appendChild(equipRow);

      // 출발 버튼
      const deployBtn = document.createElement("button");
      deployBtn.style.cssText = `
        padding: 12px 40px;
        background: rgba(0, 100, 0, 0.5);
        border: 2px solid #00ff00;
        color: #00ff00;
        font-family: var(--term-font);
        font-size: 16px;
        cursor: pointer;
        text-shadow: 0 0 5px #00ff00;
      `;
      deployBtn.innerText = "[ DEPLOY ]";
      deployBtn.onclick = () => {
        overlay.remove();
        resolve();
      };
      overlay.appendChild(deployBtn);

      document.body.appendChild(overlay);
    });
  }

  /**
   * 스테이지 설정을 DefenseGame에 적용
   */
  applyStageSettings(stage) {
    // 안전영역 여부
    this.defenseGame.isSafeZone = (stage.type === "safe");
    this.defenseGame.safeZoneSpawnRate = stage.spawnRate;
    this.defenseGame.spawnRate = stage.spawnRate;
    
    // 점령 상태 확인 및 적용
    if (stage.conquered && stage.type === "conquest") {
      // 점령된 스테이지 - 점령 시각화 적용
      this.defenseGame.setConqueredState(true);
    } else {
      // 점령되지 않은 스테이지
      this.defenseGame.isConquered = false;
      this.defenseGame.shieldBtn.style.display = "block";
      
      // 페이지 시스템
      if (!stage.hasPages) {
        this.defenseGame.currentPage = 0;
        this.defenseGame.maxPages = 0;
      } else {
        this.defenseGame.currentPage = 1;
        this.defenseGame.pageTimer = 0;
        this.defenseGame.maxPages = stage.maxPages || 12;
        this.defenseGame.difficultyScale = stage.difficultyScale || 1.0;
      }
    }
    
    // UI 업데이트
    this.defenseGame.updateWaveDisplay();
    
    // 적 초기화
    this.defenseGame.enemies = [];
  }

  /**
   * 인벤토리/장비 UI 표시
   */
  async showInventory() {
    this.defenseGame.pause();
    
    const data = this.inventoryManager.getData();
    
    // 터미널 애니메이션 (오버레이 유지 - 디펜스 화면 안 보이게)
    const bgOverlay = await this.playTerminalAnimation("LOADING INVENTORY...", true);
    
    // 인벤토리 오버레이로 변환 (기존 오버레이 재활용)
    bgOverlay.id = "inventory-overlay";
    bgOverlay.style.cssText = `
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
    
    const overlay = bgOverlay; // 변수명 통일

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ff00;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 15px;
      text-shadow: 0 0 10px #00ff00;
    `;
    header.innerText = "[ EQUIPMENT & INVENTORY ]";
    overlay.appendChild(header);

    // 장비 슬롯 영역 (상단 4칸)
    const equipSection = document.createElement("div");
    equipSection.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      border: 2px solid #00ff00;
      background: rgba(0, 50, 0, 0.3);
    `;

    data.slotTypes.forEach((type, idx) => {
      const slot = this.createSlotElement(data.equipSlots[idx], type, idx, true);
      equipSection.appendChild(slot);
    });
    overlay.appendChild(equipSection);

    // 라벨
    const invLabel = document.createElement("div");
    invLabel.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 12px;
      margin-bottom: 5px;
    `;
    invLabel.innerText = "INVENTORY (20 SLOTS)";
    overlay.appendChild(invLabel);

    // 인벤토리 그리드 (20칸: 5x4)
    const invGrid = document.createElement("div");
    invGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(5, 50px);
      grid-template-rows: repeat(4, 50px);
      gap: 5px;
      padding: 10px;
      border: 1px solid #555;
      background: rgba(0, 0, 0, 0.5);
    `;

    data.inventory.forEach((item, idx) => {
      const slot = this.createSlotElement(item, null, idx, false);
      invGrid.appendChild(slot);
    });
    overlay.appendChild(invGrid);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      margin-top: 15px;
      padding: 10px 30px;
      background: transparent;
      border: 2px solid #ff0000;
      color: #ff0000;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.innerText = "[CLOSE]";
    closeBtn.onclick = () => {
      overlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
  }

  /**
   * 업그레이드 UI 표시
   */
  async showUpgrades() {
    this.defenseGame.pause();
    
    // 터미널 애니메이션 (오버레이 유지)
    const bgOverlay = await this.playTerminalAnimation("LOADING UPGRADE TERMINAL...", true);
    
    // 업그레이드 오버레이로 변환
    bgOverlay.id = "upgrade-overlay";
    bgOverlay.style.cssText = `
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
    
    const overlay = bgOverlay;

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #ffcc00;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 15px;
      text-shadow: 0 0 10px #ffcc00;
    `;
    header.innerText = "[ SYSTEM UPGRADES ]";
    overlay.appendChild(header);

    // 현재 DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 20px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 업그레이드 목록 컨테이너
    const upgradeList = document.createElement("div");
    upgradeList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 400px;
    `;

    // 업그레이드 옵션들 (기본 구현)
    const upgrades = [
      { id: "turret_damage", name: "Turret Damage +5", cost: 100, effect: () => { this.defenseGame.turret.damage += 5; } },
      { id: "shield_hp", name: "Shield HP +20", cost: 150, effect: () => { this.defenseGame.core.shieldMaxHp += 20; this.defenseGame.core.shieldHp += 20; } },
      { id: "core_hp", name: "Core HP +20", cost: 200, effect: () => { this.defenseGame.core.maxHp += 20; this.defenseGame.core.hp += 20; } },
      { id: "fire_rate", name: "Fire Rate +0.5", cost: 250, effect: () => { this.defenseGame.turret.fireRate += 0.5; } }
    ];

    upgrades.forEach(upgrade => {
      const btn = document.createElement("button");
      const canAfford = this.currentMoney >= upgrade.cost;
      
      btn.style.cssText = `
        background: ${canAfford ? 'rgba(0, 100, 50, 0.5)' : 'rgba(50, 50, 50, 0.5)'};
        border: 1px solid ${canAfford ? '#00ff00' : '#555'};
        color: ${canAfford ? '#00ff00' : '#666'};
        padding: 15px;
        font-family: var(--term-font);
        font-size: 14px;
        cursor: ${canAfford ? 'pointer' : 'not-allowed'};
        text-align: left;
      `;
      
      btn.innerHTML = `
        <div>${upgrade.name}</div>
        <div style="font-size: 12px; color: #ffcc00;">Cost: ${upgrade.cost} MB</div>
      `;
      
      if (canAfford) {
        btn.onclick = () => {
          this.currentMoney -= upgrade.cost;
          upgrade.effect();
          this.terminal.updateData(this.currentMoney);
          dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
          
          // 버튼 상태 업데이트
          upgradeList.querySelectorAll('button').forEach((b, i) => {
            const u = upgrades[i];
            const afford = this.currentMoney >= u.cost;
            b.style.background = afford ? 'rgba(0, 100, 50, 0.5)' : 'rgba(50, 50, 50, 0.5)';
            b.style.borderColor = afford ? '#00ff00' : '#555';
            b.style.color = afford ? '#00ff00' : '#666';
            b.style.cursor = afford ? 'pointer' : 'not-allowed';
          });
          
          this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
        };
      }
      
      upgradeList.appendChild(btn);
    });

    overlay.appendChild(upgradeList);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      margin-top: 20px;
      background: transparent;
      border: 1px solid #ff6666;
      color: #ff6666;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.innerText = "[CLOSE]";
    closeBtn.onclick = () => {
      overlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    overlay.appendChild(closeBtn);
  }

  /**
   * 슬롯 요소 생성
   */
  createSlotElement(item, slotType, index, isEquipSlot) {
    const slot = document.createElement("div");
    slot.style.cssText = `
      width: 50px;
      height: 50px;
      border: 1px solid ${isEquipSlot ? '#00ff00' : '#555'};
      background: ${item ? 'rgba(0, 100, 50, 0.5)' : 'rgba(0, 0, 0, 0.3)'};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: var(--term-font);
      font-size: 8px;
      color: #fff;
      cursor: pointer;
      transition: all 0.2s;
    `;

    if (isEquipSlot) {
      const typeLabel = document.createElement("div");
      typeLabel.style.cssText = "font-size: 6px; color: #00ff00; margin-bottom: 2px;";
      typeLabel.innerText = slotType;
      slot.appendChild(typeLabel);
    }

    if (item) {
      const itemName = document.createElement("div");
      itemName.style.cssText = "font-size: 7px; text-align: center;";
      itemName.innerText = item.name || "ITEM";
      slot.appendChild(itemName);
    } else {
      const empty = document.createElement("div");
      empty.style.cssText = "color: #333;";
      empty.innerText = "-";
      slot.appendChild(empty);
    }

    slot.onmouseenter = () => {
      slot.style.borderColor = "#00ff00";
      slot.style.boxShadow = "0 0 10px #00ff00";
    };
    slot.onmouseleave = () => {
      slot.style.borderColor = isEquipSlot ? "#00ff00" : "#555";
      slot.style.boxShadow = "none";
    };

    return slot;
  }

  /**
   * 터미널 애니메이션 재생
   * @param {string} text 표시할 텍스트
   * @param {boolean} keepOverlay 애니메이션 후 오버레이 유지 여부 (기본값 false)
   * @returns {Promise<HTMLElement|void>} keepOverlay가 true면 오버레이 요소 반환
   */
  async playTerminalAnimation(text, keepOverlay = false) {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #000;
        z-index: 4000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: var(--term-font);
        color: #00ff00;
        font-size: 18px;
      `;

      const textEl = document.createElement("div");
      textEl.style.textShadow = "0 0 10px #00ff00";
      overlay.appendChild(textEl);
      document.body.appendChild(overlay);

      let i = 0;
      const typeInterval = setInterval(() => {
        if (i < text.length) {
          textEl.innerText = text.substring(0, i + 1) + "_";
          i++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            if (keepOverlay) {
              textEl.remove(); // 텍스트만 지우고 배경 유지
              resolve(overlay);
            } else {
              overlay.style.opacity = "0";
              overlay.style.transition = "opacity 0.3s";
              setTimeout(() => {
                overlay.remove();
                resolve();
              }, 300);
            }
          }, 200);
        }
      }, 30);
    });
  }

  /**
   * 스테이지 진입 애니메이션 (코어 낙하)
   */
  async playCoreDropAnimation() {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: transparent;
        z-index: 4000;
        pointer-events: none;
      `;

      const core = document.createElement("div");
      core.style.cssText = `
        position: absolute;
        left: 50%;
        top: -100px;
        transform: translateX(-50%);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: radial-gradient(circle, #00ffff, #0066ff);
        box-shadow: 0 0 30px #00ffff, 0 0 60px #0066ff;
        transition: top 0.8s ease-in;
      `;
      overlay.appendChild(core);
      document.body.appendChild(overlay);

      // 코어 낙하
      setTimeout(() => {
        core.style.top = "50%";
        core.style.transform = "translate(-50%, -50%)";
      }, 50);

      // 착지 효과
      setTimeout(() => {
        core.style.boxShadow = "0 0 50px #00ffff, 0 0 100px #0066ff, 0 0 150px #00ffff";
        
        setTimeout(() => {
          overlay.style.opacity = "0";
          overlay.style.transition = "opacity 0.5s";
          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 500);
        }, 300);
      }, 850);
    });
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
      // 점령 모드인 경우 별도 처리
      if (this.isConquestMode) {
          this.handleConquestTetrisClear();
          return;
      }
      
      // 일반 브리치 모드 - 장비 획득
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
      // 점령 모드인 경우 별도 처리
      if (this.isConquestMode) {
          // 테트리스 실패 = 페널티 (적 증가)
          this.tetrisGame.state.isPlaying = false;
          
          // 테트리스 UI 정리
          document.getElementById("game-container").style.opacity = 0;
          document.getElementById("game-ui").style.display = "none";
          this.showConquestTetrisUI(); // 상단 UI 복구
          this.restoreNextBoxPosition(); // NEXT 블록 위치 복구
          this.terminal.setTransparentMode(false);
          this.terminal.show();
          
          this.terminal.printSystemMessage("BREACH DEFENSE FAILED!");
          this.terminal.printSystemMessage("Enemy reinforcements incoming!");
          
          // 적 다수 스폰 (페널티)
          for (let i = 0; i < 5; i++) {
              this.defenseGame.spawnEnemy();
          }
          
          // 디펜스 화면 복구
          this.defenseGame.canvas.style.display = "block";
          this.defenseGame.uiLayer.style.display = "block";
          
          // 미니 패널 제거
          const panel = document.getElementById("mini-defense-panel");
          if (panel) panel.remove();
          
          // 디펜스는 계속 (강화 페이지 완료까지)
          // defenseMonitorLoop가 계속 돌아감
          return;
      }
      
      // 일반 브리치 모드 - 패배 시 복귀
      this.tetrisGame.state.isPlaying = false;
      document.getElementById("game-container").style.opacity = 0;
      document.getElementById("game-ui").style.display = "none";
      this.terminal.setTransparentMode(false);
      this.terminal.show();
      
      await this.terminal.typeText("DEFENSE FAILED.", 50);
      await this.terminal.typeText("Systems compromised...", 30);
      await this.terminal.typeText("Returning to core defense.", 30);
      
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
