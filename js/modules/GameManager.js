import { TerminalUI } from "./TerminalUI.js";
import { TetrisGame } from "./TetrisGame.js";
import { PerkManager } from "./PerkManager.js";

export class GameManager {
  constructor() {
    this.terminal = new TerminalUI();
    this.game = new TetrisGame("game-container");
    this.perkManager = new PerkManager();

    // 게임 상태
    this.currentStage = 0; // 0: Tutorial, 1+: Real Stages
    this.currentMoney = 0; // 현재 보유 데이터 (MB)
    this.reputation = 0; // 영구 평판 (Reputation)

    // 게임 이벤트 연결
    this.game.onStageClear = (linesCleared) =>
      this.handleStageClear(linesCleared);
    this.game.onGameOver = (score) => this.handleGameOver(score);
    this.game.getPerkEffects = () => this.perkManager.getEffects(); // 게임 엔진이 퍽 효과를 참조하도록

    // 영구 퍽 트리 데이터 정의
    this.permTree = [
      // Root (기본 제공)
      {
        id: "root",
        name: "ROOT_ACCESS",
        cost: 0,
        parentId: null,
        desc: "System Root Permission",
        effect: {},
      },

      // Branch A: Resources (Start Money)
      {
        id: "res_1",
        name: "Packet_Sniffer.v1",
        cost: 10,
        parentId: "root",
        desc: "Start with +100MB",
        effect: { startMoney: 100 },
      },
      {
        id: "res_2",
        name: "Data_Mining_Rig.v2",
        cost: 30,
        parentId: "res_1",
        desc: "Start with +300MB",
        effect: { startMoney: 200 },
      },
      {
        id: "res_3",
        name: "Botnet_Wallet.v3",
        cost: 60,
        parentId: "res_2",
        desc: "Start with +600MB",
        effect: { startMoney: 300 },
      },

      // Branch B: Efficiency (Score Multiplier)
      {
        id: "eff_1",
        name: "Score_Injector.dll",
        cost: 20,
        parentId: "root",
        desc: "Score +10%",
        effect: { scoreMult: 0.1 },
      },
      {
        id: "eff_2",
        name: "Combo_Breaker.exe",
        cost: 50,
        parentId: "eff_1",
        desc: "Score +25%",
        effect: { scoreMult: 0.15 },
      },
      {
        id: "eff_3",
        name: "Global_Leaderboard.hack",
        cost: 100,
        parentId: "eff_2",
        desc: "Score +50%",
        effect: { scoreMult: 0.25 },
      },

      // Branch C: Luck (Special Blocks)
      {
        id: "luck_1",
        name: "RNG_Manipulator.init",
        cost: 40,
        parentId: "root",
        desc: "Unlock Special Blocks (Luck +2%)",
        effect: { luck: 0.02 },
      },
      {
        id: "luck_2",
        name: "Probability_Drive.sys",
        cost: 80,
        parentId: "luck_1",
        desc: "Luck +3% & Shop Discount 5%",
        effect: { luck: 0.03, discount: 0.05 },
      },

      // Branch D: Survival (Revive - Future)
      // { id: "surv_1", name: "Backup_Protocol", cost: 100, parentId: "root", desc: "Revive once per game (Coming Soon)", effect: {} }
    ];

    this.acquiredPermPerks = new Set(["root"]); // 기본 루트 해금

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

    createBtn("Skip Stage", () => {
      this.game.stageClear(); // Force clear
      this.terminal.printSystemMessage("[DEBUG] Stage Skipped");
    });

    createBtn("Game Over", () => {
      this.game.gameOver();
      this.terminal.printSystemMessage("[DEBUG] Forced Game Over");
    });

    createBtn("Unlock All Perks", () => {
      // Unlock all non-root perks logic could go here, but complex due to tree.
      // Instead, let's just max out stats
      this.perkManager.activeEffects.bombChance = 0.5;
      this.perkManager.activeEffects.goldChance = 0.5;
      this.perkManager.activeEffects.miscChance = 0.5;
      this.perkManager.activeEffects.speedModifier = 0.5;
      this.terminal.printSystemMessage(
        "[DEBUG] GOD MODE ACTIVATED (High Stats)"
      );
      // Update inputs
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
    this.game.init(); // 3D 씬 로드

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

      this.currentStage = 1;
      this.startStage();
    } else {
      await this.startIntro();
    }
  }

  loadPermanentPerks() {
    // 저장된 영구 퍽 ID 목록 로드
    const saved = localStorage.getItem("acquired_perm_perks");
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        ids.forEach((id) => this.acquiredPermPerks.add(id));
      } catch (e) {
        console.error("Failed to load perks", e);
      }
    } else {
      // 마이그레이션: 기존 데이터가 있다면 변환 시도 (생략하고 초기화 유도)
      // 평판은 유지되므로 다시 구매하면 됨.
    }

    // 효과 적용
    this.applyPermanentEffects();
  }

  savePermanentPerks() {
    localStorage.setItem(
      "acquired_perm_perks",
      JSON.stringify(Array.from(this.acquiredPermPerks))
    );
  }

  applyPermanentEffects() {
    // 효과 초기화
    this.currentMoney = 0; // 시작 머니는 0에서 보너스 합산
    this.perkManager.activeEffects.scoreMultiplier = 1.0;
    this.perkManager.activeEffects.shopDiscount = 0.0;
    // Luck 초기화는 perkManager.reset()에서 기본값 0이 됨. 여기선 영구 효과만 더함.
    // 주의: PerkManager는 게임 시작 시 reset()되므로, init() 시점에 이 함수를 호출해야 함.
    // 하지만 현재 구조상 init()에서 loadPermanentPerks를 부르고 있음.

    // reset()이 호출된 직후에 더해줄 변수가 필요하거나, activeEffects에 직접 더해야 함.
    // 여기서는 init 시점 기준 activeEffects에 더함. (PerkManager 초기값 + 영구 효과)

    // PerkManager.reset()을 먼저 호출해서 초기화 필요
    // this.perkManager.reset(); // -> startStage에서 하므로 여기선 금지?
    // 아니, 영구 효과는 'base' 값이어야 함.

    let bonusMoney = 0;
    let bonusScore = 0;
    let bonusLuck = 0;
    let bonusDiscount = 0;

    this.acquiredPermPerks.forEach((id) => {
      const node = this.permTree.find((n) => n.id === id);
      if (node && node.effect) {
        if (node.effect.startMoney) bonusMoney += node.effect.startMoney;
        if (node.effect.scoreMult) bonusScore += node.effect.scoreMult;
        if (node.effect.luck) bonusLuck += node.effect.luck;
        if (node.effect.discount) bonusDiscount += node.effect.discount;
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
      // UI 메시지 표시 등은 게임 엔진에서 처리하거나 여기서 터미널로 쏠 수 있음
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
    while (true) {
      this.terminal.clear();
      // 아스키 트리 UI 표시
      await this.terminal.showPermanentTree(
        this.permTree,
        this.acquiredPermPerks,
        this.reputation
      );

      // 명령어 입력 대기
      await this.terminal.typeText("Enter Node ID to upgrade or 'exit':", 0);

      // showChoices 대신 입력 대기 (커스텀 입력)
      // showChoices는 버튼을 생성하므로, 여기서는 텍스트 입력을 받고 싶음.
      // 하지만 모바일 편의를 위해 showChoices를 활용하되, 선택지를 동적으로 생성?
      // 아스키 트리는 시각용이고, 조작은 '선택지'나 '입력'으로.

      // 구매 가능한 목록만 추출
      const availableNodes = this.permTree.filter((node) => {
        if (this.acquiredPermPerks.has(node.id)) return false; // 이미 보유
        if (node.parentId && !this.acquiredPermPerks.has(node.parentId))
          return false; // 부모 미보유
        return true;
      });

      const choices = availableNodes.map((node) => ({
        text: `[${node.id}] ${node.name} (${node.cost} REP)`,
        value: node.id,
      }));

      choices.push({ text: "EXIT SYSTEM", value: "exit" });

      const choice = await this.terminal.showChoices(choices);

      if (choice === "exit") break;

      const selectedNode = this.permTree.find((n) => n.id === choice);
      if (selectedNode) {
        if (this.reputation >= selectedNode.cost) {
          this.reputation -= selectedNode.cost;
          this.acquiredPermPerks.add(selectedNode.id);
          this.saveReputation();
          this.savePermanentPerks();
          await this.terminal.typeText(
            `> UPGRADE COMPLETE: ${selectedNode.name}`,
            20
          );
          await new Promise((r) => setTimeout(r, 800));
        } else {
          await this.terminal.typeText(
            `> ERROR: INSUFFICIENT REPUTATION. NEED ${selectedNode.cost}`,
            20
          );
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    this.terminal.clear();
    // 효과 재적용
    this.perkManager.reset(); // 초기화 후
    this.applyPermanentEffects(); // 영구 효과 적용
  }

  startTutorial() {
    this.currentStage = 0;
    this.currentMoney = 0;
    this.perkManager.reset();

    this.terminal.printSystemMessage("Entering Simulation Mode...");

    // 튜토리얼: 목표 3줄, 속도 1000ms
    this.transitionToGame(3, 1000);
  }

  async handleStageClear(linesCleared) {
    // 획득한 데이터 계산 (기본 1줄당 100MB)
    const earnedData = (linesCleared || 0) * 100;
    this.currentMoney += earnedData;

    // --- 클리어 연출 시작 ---
    // 1. 게임 조작 차단 (일시정지 느낌)
    // (TetrisGame에 pause 기능이 있다면 좋겠지만, 여기선 단순히 UI로 덮음)

    // 2. "DATA MINING COMPLETE" 연출 출력
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
      this.currentStage = 1;
      this.startStage();
    } else {
      // 일반 스테이지 클리어 -> 분기점 (상점 or 다음 스테이지)
      await this.terminal.typeText(`System Log: Upload complete.`, 10);
      await this.terminal.typeText(`STAGE ${this.currentStage} CLEARED.`, 30);
      await this.terminal.typeText(`Data Mined: ${earnedData} MB`, 20);
      await this.terminal.typeText(
        `Total Storage: ${this.currentMoney} MB`,
        20
      );
      await this.terminal.typeText("Waiting for next command...", 30);

      const choice = await this.terminal.showChoices([
        { text: "/inject_sequence (Next Stage)", value: "next" },
        { text: "/access_darknet (Open Shop)", value: "shop" },
      ]);

      if (choice === "shop") {
        await this.enterShop();
      } else {
        this.currentStage++;
        this.startStage();
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
        // UI 갱신을 위해 상점을 다시 그림 (간단한 방법)
        // 실제로는 DOM 조작만 하는게 낫지만, 여기선 재호출
        this.terminal.showShop(this.perkManager, this.currentMoney).then(() => {
          this.currentStage++;
          this.startStage();
          document.removeEventListener("perk-buy", buyHandler);
        });
      }
    };
    document.addEventListener("perk-buy", buyHandler);

    // 상점 UI 표시
    await this.terminal.showShop(this.perkManager, this.currentMoney);

    // 상점이 닫히면(Promise resolve) 다음 스테이지로
    document.removeEventListener("perk-buy", buyHandler);
    this.currentStage++;
    this.startStage();
  }

  startStage() {
    this.terminal.clear();
    this.terminal.printSystemMessage(
      `Injecting Payload... Stage ${this.currentStage}`
    );

    // 퍽 효과 적용
    const effects = this.perkManager.getEffects();

    // 난이도 계산
    let baseSpeed = Math.max(100, 800 - (this.currentStage - 1) * 60);
    // 속도 퍽 적용 (speedModifier가 낮을수록 느려짐/좋음)
    // PerkManager의 speedModifier는 기본 1.0, 감소시 -0.1 등.
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

      this.game.startGame(targetLines, speed);
    }, 1000);
  }

  async handleGameOver(score) {
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

    // 게임 오버 화면에 평판 정보 표시
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
  }
}
