// Game flow methods (extracted from GameManager)
// Mode switching, stage transitions, conquest, breach, boss flows
// Applied as mixin to preserve `this` context

export function applyGameFlowMixin(GameManagerClass) {
  const proto = GameManagerClass.prototype;

  proto.switchMode = async function(mode) {
    debugLog("GameManager", `Switching mode: ${this.activeMode} -> ${mode}`);
    this.activeMode = mode;

    if (mode === "defense") {
      // 1. 테트리스 정지 및 Three.js 캔버스 완전 숨김
      this.tetrisGame.state.isPlaying = false;
      document.getElementById("game-ui").style.display = "none";
      document.getElementById("game-container").style.display = "none"; // Three.js 캔버스 숨김

      // 2. 터미널 UI 조정 (디펜스 모드용)
      this.terminal.setDefenseMode(true); // 배경 투명 + 클릭 가능
      this.terminal.show(); // 터미널 메시지창 활성화 (로그용)
      await this.terminal.printSystemMessage("DEFENSE_PROTOCOL_INITIATED");

      // 3. 아군 바이러스 정보 업데이트 (playIntroAnimation 전에!)
      const alliedInfo = this.conquestManager.getAlliedInfo();
      this.defenseGame.updateAlliedInfo(alliedInfo);
      this.defenseGame.updateAlliedConfig(this.getAllyConfiguration());

      // 4. 기존 아군 제거 후 게임 시작
      this.defenseGame.alliedViruses = [];

      // Ensure stage settings are applied before starting
      const initialStage = this.stageManager.getCurrentStage();
      if (initialStage) {
        this.applyStageSettings(initialStage);
      }

      this.defenseGame.start(); // start()로 게임 시작!
      this.applyCoreUpgradeBonuses();
      this.applyHelperUpgradeBonuses();
      this.applyShieldUpgradeBonuses();

      // Safe Zone이면 아군 바이러스 배치
      if (this.defenseGame.isSafeZone) {
        debugLog("GameManager", "Calling spawnSafeZoneAllies from switchMode");
        this.defenseGame.spawnSafeZoneAllies();
      }

      // 5. 코어 드랍 연출
      await this.defenseGame.playIntroAnimation();

      // [추가] 자원 UI 동기화
      this.defenseGame.updateResourceDisplay(this.currentMoney);

      // 장비 효과 적용
      const stats = this.equipmentManager.getTotalStats();
      this.defenseGame.turret.damage = 10 + stats.damage;

      // 터미널 명령어 옵션 표시
      await this.terminal.printSystemMessage(
        "System Idle. Ready for Operations."
      );
      await this.showCommandMenu();
    } else if (mode === "breach") {
      // 1. 디펜스 정지 및 숨김
      this.defenseGame.stop();

      // 2. 터미널 및 UI 조정
      this.terminal.setTransparentMode(true);
      await this.terminal.printSystemMessage("BREACH_PROTOCOL_INITIATED");
      await this.terminal.printSystemMessage(
        "Objective: Clear lines to acquire Equipment."
      );

      // 3. 테트리스 시작 (장비 획득 목표)
      this.startBreachMode();
    }
  }

  /**
   * 터미널 명령어 메뉴 표시
   */
  proto.moveToStage = async function(stageId) {
    const stage = this.stageManager.getStage(stageId);
    if (!stage) {
      console.error(`Stage ${stageId} not found!`);
      return;
    }

    // 스테이지 이동 (StageManager에서 현재 스테이지 업데이트)
    this.stageManager.currentStageId = stageId;
    this.stageManager.saveState();

    // 기존 아군 제거 (applyStageSettings에서 재스폰하므로 먼저 초기화)
    this.defenseGame.alliedViruses = [];

    this.applyStageSettings(stage);

    // 디펜스 게임 설정 적용
    this.defenseGame.isSafeZone = stage.type === "safe";
    this.defenseGame.safeZoneSpawnRate = stage.spawnRate || 2;
    if (this.defenseGame.updateRecallBtnVisibility) {
      this.defenseGame.updateRecallBtnVisibility();
    }

    // 보스전 모드 설정
    if (stage.type === "boss") {
      this.startBossFight();
    } else {
      this.endBossFight();
    }

    // 아군 정보 업데이트 (playIntroAnimation 전에!)
    const alliedInfo = this.conquestManager.getAlliedInfo();
    this.defenseGame.updateAlliedInfo(alliedInfo);
    this.defenseGame.updateAlliedConfig(this.getAllyConfiguration());

    // Safe Zone이면 아군 바이러스 미리 배치
    debugLog("GameManager", "moveToStage - stage.type:", stage.type, "isSafeZone:", this.defenseGame.isSafeZone);
    if (stage.type === "safe") {
      debugLog("GameManager", "Calling spawnSafeZoneAllies from moveToStage");
      this.defenseGame.spawnSafeZoneAllies();
    }

    // 채굴 시스템: 씬 전환 알림 (마이너 스폰)
    if (stage.conquered && stage.type === "conquest") {
      this.miningManager.registerTerritory(stageId);
      this.saveMiningData();
    }
    this.miningManager.onSceneChange(
      stageId,
      stage.type === "safe",
      this.defenseGame.canvas,
      this.defenseGame.core,
      !!stage.conquered
    );

    this.defenseGame.resume();

    // 드랍 연출과 함께 시작 (await으로 완료 대기)
    await this.defenseGame.playIntroAnimation();

    await this.terminal.printSystemMessage(`Arrived at: ${stage.name}`);
    await this.showCommandMenu();
  }

  /**
   * 진행상황 초기화 처리
   */
  proto.startConquestTetris = function() {
    debugLog("Conquest", "=== startConquestTetris 시작 ===");
    const targetLines = 3;
    const speed = 500;

    // 테트리스 상단 UI 숨기기 (Mining Rate, DATA MINED 등)
    this.hideConquestTetrisUI();

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

    // 미니 디펜스 패널 생성 (캔버스 포함, setMiniDisplay 포함)
    debugLog("Conquest", "createMiniDefensePanel 호출 전");
    this.createMiniDefensePanel();
    debugLog("Conquest", "createMiniDefensePanel 호출 후");

    // 디펜스 원본 캔버스는 숨기고, resume() 호출
    this.defenseGame.originalCanvas.style.display = "none";
    this.defenseGame.uiLayer.style.display = "none";
    debugLog("Conquest", "디펜스 원본 캔버스 숨김, resume 호출");
    this.defenseGame.resume();

    // 퍼즐 모드로 테트리스 시작
    const gameContainer = document.getElementById("game-container");
    gameContainer.style.display = "block"; // 먼저 보이게
    gameContainer.style.opacity = 1;
    document.getElementById("game-ui").style.display = "block";
    this.terminal.setTransparentMode(true);
    this.terminal.hide(); // 터미널 완전히 숨기기

    // 현재 스테이지 난이도 기반으로 퍼즐 모드 시작
    const currentStage = this.stageManager.getCurrentStage();
    const difficulty = parseInt(currentStage.id) || 1;
    this.tetrisGame.onLineCleared = (lineNum) => this.handlePuzzleLineCleared(lineNum);
    debugLog("Conquest", "Tetris onLineCleared wired", {
      hasCallback: !!this.tetrisGame.onLineCleared,
      isConquestMode: this.isConquestMode,
    });
    this.tetrisGame.startPuzzleMode(difficulty);

    // 미니 디펜스 렌더링 시작
    this.startMiniDefenseRender();
  }

  // 테트리스 상단 UI 숨기기 (점령 모드) - NEXT 블럭은 유지
  proto.hideConquestTetrisUI = function() {
    const gameUI = document.getElementById("game-ui");
    if (!gameUI) return;

    // LEVEL, DATA MINED만 숨기기 (NEXT 블럭은 유지)
    const levelBox = gameUI.querySelector(".level-box");
    const scoreBoard = gameUI.querySelector(".score-board");

    if (levelBox) levelBox.style.display = "none";
    if (scoreBoard) scoreBoard.style.display = "none";
  }

  // 테트리스 상단 UI 복구
  proto.showConquestTetrisUI = function() {
    const gameUI = document.getElementById("game-ui");
    if (!gameUI) return;

    const levelBox = gameUI.querySelector(".level-box");
    const scoreBoard = gameUI.querySelector(".score-board");

    if (levelBox) levelBox.style.display = "";
    if (scoreBoard) scoreBoard.style.display = "";
  }

  // NEXT 블록 위치 복구 및 설정 버튼 복구
  proto.handleConquestTetrisClear = function() {
    debugLog("GameManager", "handleConquestTetrisClear 호출됨");
    debugLog("GameManager", "isConquestMode:", this.isConquestMode);

    if (!this.isConquestMode) {
      debugLog("GameManager", "isConquestMode가 false라서 리턴");
      return;
    }

    this.conquestTetrisComplete = true;
    debugLog("GameManager", "conquestTetrisComplete = true");

    // 테트리스 UI 정리
    this.tetrisGame.state.isPlaying = false;
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();
    debugLog("GameManager", "테트리스 UI 정리 완료");

    // 미니 패널 제거 및 원본 캔버스로 복원
    debugLog("Conquest", "=== 복귀 시작: removeMiniDefensePanel 호출 ===");
    this.removeMiniDefensePanel();
    debugLog("Conquest", "removeMiniDefensePanel 완료");

    // 캔버스 상태 확인
    debugLog("Canvas", "복귀 후 canvas 정보:");
    debugLog("Canvas", "  - originalCanvas.width x height:", this.defenseGame.originalCanvas.width, "x", this.defenseGame.originalCanvas.height);
    debugLog("Canvas", "  - originalCanvas.style.display:", this.defenseGame.originalCanvas.style.display);
    debugLog("Canvas", "  - isMiniDisplay:", this.defenseGame.isMiniDisplay);
    debugLog("Canvas", "  - miniCanvas:", !!this.defenseGame.miniCanvas);

    // 게임 상태 확인
    debugLog("Defense", "게임 상태 확인:");
    debugLog("Defense", "  - 아군 수:", this.defenseGame.alliedViruses.length);
    debugLog("Defense", "  - 적 수:", this.defenseGame.enemies.length);
    debugLog("Defense", "  - 코어 HP:", this.defenseGame.core.hp);
    debugLog("Defense", "  - 코어 위치:", this.defenseGame.core.x, this.defenseGame.core.y);
    debugLog("Defense", "  - isRunning:", this.defenseGame.isRunning);
    debugLog("Defense", "  - isConquered:", this.defenseGame.isConquered);

    // 디펜스 화면 복구 및 재개
    debugLog("Canvas", "originalCanvas.style.display를 block으로 설정");
    this.defenseGame.originalCanvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";
    debugLog("Canvas", "설정 후 originalCanvas.style.display:", this.defenseGame.originalCanvas.style.display);

    this.defenseGame.resume(); // 디펜스 재개! (강화 페이지 진행을 위해)
    debugLog("Conquest", "=== 복귀 완료 ===");

    // 터미널 복구
    debugLog("GameManager", "터미널 복구 시작");
    debugLog("GameManager", "terminal 객체:", this.terminal);
    debugLog("GameManager", "terminalLayer:", this.terminal.terminalLayer);
    debugLog(
      "GameManager",
      "terminalLayer display (before):",
      this.terminal.terminalLayer?.style?.display
    );

    this.terminal.setTransparentMode(false);
    debugLog("GameManager", "setTransparentMode(false) 완료");

    this.terminal.show();
    debugLog("GameManager", "terminal.show() 완료");
    debugLog(
      "GameManager",
      "terminalLayer display (after show):",
      this.terminal.terminalLayer?.style?.display
    );

    this.terminal.setDefenseMode(true);
    debugLog("GameManager", "setDefenseMode(true) 완료");
    debugLog(
      "GameManager",
      "terminalLayer display (after setDefenseMode):",
      this.terminal.terminalLayer?.style?.display
    );
    debugLog(
      "GameManager",
      "terminalLayer pointerEvents:",
      this.terminal.terminalLayer?.style?.pointerEvents
    );
    debugLog(
      "GameManager",
      "terminalLayer background:",
      this.terminal.terminalLayer?.style?.background
    );
    debugLog(
      "GameManager",
      "terminalLayer zIndex:",
      this.terminal.terminalLayer?.style?.zIndex
    );

    this.terminal.printSystemMessage("FIREWALL BREACHED! Defend the core!");
    debugLog("GameManager", "printSystemMessage 완료");

    // defenseMonitorLoop가 계속 돌면서 강화 페이지 완료 체크
    debugLog("GameManager", "handleConquestTetrisClear 종료");
  }

  // 퍼즐 줄 클리어 시 디펜스에 파동 효과 + 아이템 드롭 확률
  proto.handleConquestComplete = async function() {
    debugLog("Conquest", "========== handleConquestComplete START ==========");
    this.isConquestMode = false;

    // 테트리스 정리 (혹시 아직 플레이 중이면)
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }

    // 미니 패널 제거 (setMiniDisplay(null) 호출하여 캔버스 복원)
    debugLog("Conquest", "About to call removeMiniDefensePanel");
    this.removeMiniDefensePanel();
    debugLog("Conquest", "removeMiniDefensePanel returned");

    // 테트리스 UI 완전 정리
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) gameContainer.style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();

    // 디펜스 화면 복구
    debugLog("Canvas", "Setting defense canvas display to block");
    debugLog("Canvas", "Canvas before:", this.defenseGame.canvas.style.display);
    this.defenseGame.canvas.style.display = "block";
    debugLog("Canvas", "Canvas after:", this.defenseGame.canvas.style.display);
    debugLog("Canvas", "Setting uiLayer display to block");
    this.defenseGame.uiLayer.style.display = "block";
    debugLog("Conquest", "Defense game isRunning:", this.defenseGame.isRunning);

    // 점령 처리
    this.conquestManager.conquerStage();

    // 현재 스테이지를 점령 상태로 설정
    const currentStage = this.stageManager.getCurrentStage();
    console.log("[GameManager] handleConquestComplete - currentStage:", currentStage);
    if (currentStage) {
      this.stageManager.setConquered(currentStage.id, true);
      // 채굴 등록
      console.log("[GameManager] Registering territory for mining:", currentStage.id);
      this.miningManager.registerTerritory(String(currentStage.id));
      this.saveMiningData();
      console.log("[GameManager] Mining data saved");
    }

    // 디펜스 게임에 점령 상태 설정 (시각화 + 아군 10마리)
    debugLog("Conquest", "Setting conquered state");
    this.defenseGame.setConqueredState(true);

    // 채굴 마이너 스폰
    console.log("[GameManager] Spawning miners for conquered stage:", currentStage.id);
    this.miningManager.onSceneChange(
      String(currentStage.id),
      false,
      this.defenseGame.canvas,
      this.defenseGame.core,
      true
    );

    debugLog("Conquest", "Calling defenseGame.resume()");
    this.defenseGame.resume(); // 디펜스 재개
    debugLog("Conquest", "After resume, isRunning:", this.defenseGame.isRunning);
    debugLog("Canvas", "After resume, canvas display:", this.defenseGame.canvas.style.display);

    // 터미널 표시 및 메시지
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.setDefenseMode(true);
    await this.terminal.printSystemMessage("!!! SECTOR CONQUERED !!!");
    await this.terminal.printSystemMessage("Territory secured.");

    // 획득 아이템 선택 화면 표시
    await this.showLootSummary();

    // 선택지 표시
    await this.showCommandMenu();
    debugLog("Conquest", "========== handleConquestComplete END ==========");
  }

  // 점령 실패 (코어 파괴)
  proto.handleConquestFail = async function() {
    this.isConquestMode = false;

    // 테트리스 정리
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI(); // 상단 UI 복구
    this.restoreNextBoxPosition(); // NEXT 블록 위치 복구

    // 미니 패널 제거 (setMiniDisplay(null) 호출하여 캔버스 복원)
    this.removeMiniDefensePanel();

    // 디펜스 정리
    this.defenseGame.canvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";

    this.terminal.setTransparentMode(false);
    this.terminal.show();
    await this.terminal.printSystemMessage("CONQUEST FAILED - Core Destroyed");

    // 게임 오버 처리
    this.handleDefenseGameOver();
  }

  // 점령 실패 (테트리스 실패, 점령 없이 종료)
  proto.handleConquestFailNoConquer = async function() {
    this.isConquestMode = false;

    // 테트리스 정리
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }
    document.getElementById("game-container").style.display = "none";
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();

    // 미니 패널 제거 (setMiniDisplay(null) 호출하여 캔버스 복원)
    this.removeMiniDefensePanel();

    // 디펜스 정리 및 복구
    this.defenseGame.canvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";
    this.defenseGame.resume();

    // 터미널 표시
    this.terminal.setDefenseMode(true);
    this.terminal.show();
    await this.terminal.printSystemMessage("BREACH FAILED - Conquest Aborted");
    await this.terminal.printSystemMessage("Territory NOT secured.");

    // 명령 메뉴 표시 (점령 안 됨)
    await this.showCommandMenu();
  }

  /**
   * 맵 UI 표시
   */
  proto.enterPermanentShop = async function() {
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

  proto.enterShop = async function() {
    // 상점 이벤트 리스너 임시 등록 (구매 처리)
    const buyHandler = (e) => {
      const { perkId, cost } = e.detail;
      if (this.currentMoney >= cost) {
        this.currentMoney -= cost;
        this.saveMoney(); // 자동 저장
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

  proto.startBreachMode = function() {
    const targetLines = 10; // 고정 목표 라인 수
    const speed = 600; // 적당한 속도

    setTimeout(() => {
      document.getElementById("game-container").style.display = "block"; // 먼저 보이게
      document.getElementById("game-container").style.opacity = 1;
      document.getElementById("game-ui").style.display = "block";
      this.terminal.setTransparentMode(true);

      this.tetrisGame.startGame(targetLines, speed);
    }, 500);
  }

  proto.transitionToGame = function(targetLines, speed) {
    setTimeout(() => {
      document.getElementById("game-container").style.display = "block"; // 먼저 보이게
      document.getElementById("game-container").style.opacity = 1;
      document.getElementById("game-ui").style.display = "block";
      this.terminal.setTransparentMode(true);

      this.tetrisGame.startGame(targetLines, speed);
    }, 1000);
  }

  proto.handleBreachClear = async function(lines) {
    debugLog("GameManager", "handleBreachClear 호출됨, lines:", lines);
    debugLog("GameManager", "isConquestMode:", this.isConquestMode);

    // 점령 모드인 경우 별도 처리
    if (this.isConquestMode) {
      debugLog("GameManager", "점령 모드이므로 handleConquestTetrisClear 호출");
      this.handleConquestTetrisClear();
      return;
    }

    // 일반 브리치 모드 - 장비 획득
    const item = this.equipmentManager.generateEquipment(
      this.defenseGame.currentPage || 1
    );
    this.equipmentManager.addItem(item);

    // 연출
    this.tetrisGame.state.isPlaying = false;
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();

    await this.terminal.typeText("THREAT ELIMINATED.", 30);
    await this.terminal.typeText("Security Systems Restored.", 20);
    await this.terminal.typeText(`[LOOT ACQUIRED]`, 30);

    await this.terminal.typeText(`> ${item.name}`, 30);
    await this.terminal.typeText(`Power: ${item.stats.power}`, 20);

    if (this.equipmentManager.autoEquip(item)) {
      await this.terminal.typeText("(Auto Equipped!)", 20);
    }

    await this.terminal.waitForEnter();

    // 획득 아이템 요약 표시
    this.showLootSummary();

    // 디펜스로 복귀 (장비 효과 적용)
    this.switchMode("defense");
  }

  proto.handleBreachFail = async function(score) {
    // 점령 모드인 경우 별도 처리
    if (this.isConquestMode) {
      // 테트리스 실패 = 페널티 (적 증가)
      this.tetrisGame.state.isPlaying = false;

      // 테트리스 완전히 숨기기 (중요!)
      document.getElementById("game-container").style.display = "none";
      document.getElementById("game-ui").style.display = "none";
      this.showConquestTetrisUI(); // 상단 UI 복구
      this.restoreNextBoxPosition(); // NEXT 블록 위치 복구

      // 터미널을 디펜스 모드로 설정 (투명 배경 + 캔버스 클릭 가능)
      this.terminal.setDefenseMode(true);
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

    await new Promise((r) => setTimeout(r, 1500));

    this.switchMode("defense");
  }

  proto.handleConquest = async function() {
    // 1. 점령 로직 실행 (병합 등 계산)
    const result = this.conquestManager.conquerStage();

    // 2. 터미널 연출
    this.terminal.setDefenseMode(false);

    await this.terminal.typeText("!!! SYSTEM CONQUERED !!!", 30);
    await this.terminal.typeText(`Total Conquered: ${result.total}`, 20);
    await this.terminal.typeText(`Mining Rate: ${result.miningRate}/sec`, 20);

    if (result.total % 2 === 0) {
      await this.terminal.typeText(">> SECTORS MERGED <<", 30);
      await this.terminal.typeText(
        `Allied Virus Level Up: ${result.level}`,
        30
      );
    }

    await this.terminal.waitForEnter();

    // 3. 디펜스 게임에 아군 정보 업데이트
    const alliedInfo = this.conquestManager.getAlliedInfo();
    this.defenseGame.updateAlliedInfo(alliedInfo);
    this.defenseGame.updateAlliedConfig(this.getAllyConfiguration());

    // 4. 다시 디펜스 모드로 복귀 (다음 스테이지 느낌으로)
    this.terminal.setDefenseMode(true);
    this.terminal.printSystemMessage("ADVANCING TO NEXT SECTOR...");

    // 난이도 상승 등 추가 처리가 필요하다면 여기서
  }

  proto.startBossFight = function() {
    debugLog("Boss", "Starting boss fight!");

    // BossManager 시작
    this.bossManager.start();

    // DefenseGame에 보스전 모드 설정
    this.defenseGame.isBossFight = true;
    this.defenseGame.bossManager = this.bossManager;
    this.defenseGame.breachReadyShown = false;

    // 콜백 설정: BREACH READY
    this.defenseGame.onBreachReady = () => this.handleBreachReady();

    // 콜백 설정: 보스 처치
    this.bossManager.onBossDefeated = () => this.handleBossDefeated();

    // 콜백 설정: 페이즈 전환
    this.bossManager.onPhaseChange = (phase, config) => {
      this.terminal.printSystemMessage(`>>> ${config.description} <<<`);
    };
  }

  /**
   * 보스전 종료
   */
  proto.handleBreachReady = async function() {
    debugLog("Boss", "Breach ready!");

    // 선택지 표시
    await this.terminal.printSystemMessage('>>> BREACH READY <<<');
    await this.terminal.printSystemMessage('Core firewall vulnerable. Initiate breach?');

    const choice = await this.terminal.showChoices([
      { text: '>>> BREACH NOW <<<', value: 'breach', style: 'danger' },
      { text: 'Continue defense', value: 'continue' },
    ]);

    if (choice === 'breach') {
      await this.startBossBreach();
    }
  }

  /**
   * 보스 침투 시작 (테트리스 모드 진입)
   */
  proto.startBossBreach = async function() {
    debugLog("Boss", "Starting boss breach (Tetris)");

    debugLog("Boss", "Boss breach UI before switch", {
      defenseCanvas: this.defenseGame?.originalCanvas?.style?.display,
      defenseUi: this.defenseGame?.uiLayer?.style?.display,
      miniPanel: !!document.getElementById("mini-defense-panel"),
      isMiniDisplay: this.defenseGame?.isMiniDisplay,
    });

    // 테트리스 모드로 전환
    

    // 테트리스에 보스전 모드 설정
    this.tetrisGame.startBossFight(this.bossManager);
    this.isBossBreachMode = true;

    // 방해 콜백 설정
    this.bossManager.onInterference = (type) => {
      this.tetrisGame.applyBossInterference(type);
    };

    // 방해 타이머 리셋
    this.bossManager.resetInterferenceTimers();

    // 테트리스 시작
    await this.terminal.printSystemMessage('BREACH INITIATED - Clear 3 lines to damage core!');

    // 테트리스 콜백 설정
    this.tetrisGame.onStageClear = () => this.handleBossBreachSuccess();
    this.tetrisGame.onGameOver = () => this.handleBossBreachFail();
    this.tetrisGame.onLineCleared = (lineNum) => this.handlePuzzleLineCleared(lineNum);
    debugLog("Boss", "Boss breach callbacks wired", {
      onLineCleared: !!this.tetrisGame.onLineCleared,
      onStageClear: !!this.tetrisGame.onStageClear,
      onGameOver: !!this.tetrisGame.onGameOver,
      isBossBreachMode: this.isBossBreachMode,
    });

    this.switchToTetrisMode();

    debugLog("Boss", "Boss breach UI after switch", {
      defenseCanvas: this.defenseGame?.originalCanvas?.style?.display,
      defenseUi: this.defenseGame?.uiLayer?.style?.display,
      miniPanel: !!document.getElementById("mini-defense-panel"),
      isMiniDisplay: this.defenseGame?.isMiniDisplay,
    });
    // 테트리스 게임 시작 (3줄 목표, 기본 속도)
    this.tetrisGame.startGame(3, 800);

    // 방해 업데이트 루프 시작
    this.startBossInterferenceLoop();
  }

  /**
   * 보스 방해 업데이트 루프
   */
  proto.startBossInterferenceLoop = function() {
    if (this.bossInterferenceInterval) {
      clearInterval(this.bossInterferenceInterval);
    }

    this.bossInterferenceInterval = setInterval(() => {
      if (!this.tetrisGame.state.isPlaying || !this.tetrisGame.state.isBossFight) {
        clearInterval(this.bossInterferenceInterval);
        return;
      }

      const now = performance.now();
      this.bossManager.updateInterference(now);
    }, 1000); // 1초마다 체크
  }

  /**
   * 보스 침투 성공 (테트리스 3줄 클리어)
   */
  proto.handleBossBreachSuccess = async function() {
    debugLog("Boss", "Boss breach success!");
    this.isBossBreachMode = false;

    // 방해 루프 중지
    if (this.bossInterferenceInterval) {
      clearInterval(this.bossInterferenceInterval);
    }

    // 보스에게 데미지
    const defeated = this.bossManager.dealDamage(20);

    if (defeated) {
      // 보스 처치 - handleBossDefeated에서 처리
      return;
    }

    // 테트리스 종료, 디펜스로 복귀
    this.tetrisGame.state.isPlaying = false;
    this.tetrisGame.endBossFight();

    // 침투 게이지 리셋
    this.defenseGame.breachReadyShown = false;
    this.bossManager.breachGauge = 0;
    this.bossManager.isBreachReady = false;

    // 디펜스 모드로 복귀 (즉시 화면 전환)
    this.switchToDefenseMode();
    this.defenseGame.resume();

    await this.terminal.printSystemMessage(
      `BREACH SUCCESS! Core damaged: ${this.bossManager.bossHP}% remaining`
    );

    await this.showCommandMenu();
  }

  /**
   * 보스 침투 실패 (테트리스 게임오버)
   */
  proto.handleBossBreachFail = async function() {
    debugLog("Boss", "Boss breach failed!");
    this.isBossBreachMode = false;

    // 방해 루프 중지
    if (this.bossInterferenceInterval) {
      clearInterval(this.bossInterferenceInterval);
    }

    // BossManager에 실패 알림
    this.bossManager.onBreachFailed();

    // 테트리스 종료
    this.tetrisGame.state.isPlaying = false;
    this.tetrisGame.endBossFight();

    await this.terminal.printSystemMessage('BREACH FAILED! Core firewall restored.');
    await this.terminal.printSystemMessage('Breach gauge reset. Continue defense.');

    // 침투 게이지 리셋
    this.defenseGame.breachReadyShown = false;

    // 디펜스 모드로 복귀
    this.switchToDefenseMode();
    this.defenseGame.resume();

    await this.showCommandMenu();
  }

  /**
   * 보스 처치 처리
   */
  proto.switchToTetrisMode = function() {
    debugLog("Boss", "Switching to Tetris mode");

    // 1. 터미널 투명 모드 (테트리스 배경으로)
    this.terminal.setTransparentMode(true);

    // 2. Three.js 캔버스 표시
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('game-container').style.opacity = '1';

    // 3. 게임 UI 표시 (NEXT 블록, 점수 등)
    document.getElementById('game-ui').style.display = 'block';

    // 4. 디펜스 게임을 미니맵 모드로 전환 (상단에 작게 표시)
    if (this.defenseGame) {
      this.defenseGame.originalCanvas.style.display = "none";
      this.defenseGame.uiLayer.style.display = "none";
      if (this.defenseGame.updateRecallBtnVisibility) {
        this.defenseGame.updateRecallBtnVisibility();
      }
      this.createMiniDefensePanel();
    }

    debugLog("Boss", "Boss breach mini panel ready", {
      defenseCanvas: this.defenseGame?.originalCanvas?.style?.display,
      defenseUi: this.defenseGame?.uiLayer?.style?.display,
      miniPanel: !!document.getElementById("mini-defense-panel"),
      isMiniDisplay: this.defenseGame?.isMiniDisplay,
    });

    // 5. 모드 상태 업데이트
    this.activeMode = 'tetris';
  }

  /**
   * 디펜스 모드로 전환 (보스 침투 후 복귀)
   */
  proto.switchToDefenseMode = function() {
    debugLog("Boss", "Switching to Defense mode");

    // 1. 테트리스 정지 및 Three.js 캔버스 숨김
    this.tetrisGame.state.isPlaying = false;
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';

    // 2. 디펜스 게임을 전체 화면 모드로 복원
    if (this.defenseGame) {
      this.removeMiniDefensePanel();
      this.defenseGame.originalCanvas.style.display = "block";
      this.defenseGame.uiLayer.style.display = "block";
      if (this.defenseGame.updateRecallBtnVisibility) {
        this.defenseGame.updateRecallBtnVisibility();
      }
    }

    debugLog("Boss", "Boss breach restore UI", {
      defenseCanvas: this.defenseGame?.originalCanvas?.style?.display,
      defenseUi: this.defenseGame?.uiLayer?.style?.display,
      miniPanel: !!document.getElementById("mini-defense-panel"),
      isMiniDisplay: this.defenseGame?.isMiniDisplay,
    });

    // 3. 터미널 디펜스 모드로 복원
    this.terminal.setDefenseMode(true);
    this.terminal.show();

    // 4. 모드 상태 업데이트
    this.activeMode = 'defense';
  }

}
