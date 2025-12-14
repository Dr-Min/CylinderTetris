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
    // 1. 초기 자금
    const startMoneyBonus = parseInt(
      localStorage.getItem("perm_start_money") || "0"
    );
    this.currentMoney = 0 + startMoneyBonus;

    // 2. 점수 배율
    const scoreMult = parseFloat(
      localStorage.getItem("perm_score_mult") || "0.0"
    );
    this.perkManager.activeEffects.scoreMultiplier += scoreMult;

    // 3. 상점 할인 (PerkManager에 속성 추가 필요)
    const discount = parseFloat(localStorage.getItem("perm_discount") || "0.0");
    this.perkManager.activeEffects.shopDiscount = discount;

    // 4. 행운 (특수 블록)
    const luck = parseFloat(localStorage.getItem("perm_luck") || "0.0");
    this.perkManager.activeEffects.bombChance += luck;
    this.perkManager.activeEffects.goldChance += luck;
    this.perkManager.activeEffects.miscChance += luck * 0.5; // 행운의 절반만큼 기타 블록 확률 증가
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
    // 영구 강화 상점 구현 (간단한 텍스트 메뉴)
    while (true) {
      this.terminal.clear();
      await this.terminal.typeText("=== SYSTEM UPGRADE (PERMANENT) ===", 0);
      await this.terminal.typeText(
        `Available Reputation: ${this.reputation}`,
        0
      );
      // 설명 추가
      await this.terminal.typeText(
        "[INFO] Earn Rep via High Scores (1k=1) & Clearing Stages (1=10).",
        0
      );

      const choices = [
        {
          text: `Increase Starting Data (+100MB) [Cost: 10 REP]`,
          value: "start_money",
        },
        {
          text: `Score Hack v2.0 (+10% Score) [Cost: 20 REP]`,
          value: "score_mult",
        },
        {
          text: `Market Discount (5% OFF) [Cost: 30 REP]`,
          value: "discount",
        },
        {
          text: `Unlock Special Blocks (Luck +2%) [Cost: 40 REP]`,
          value: "luck",
        },
        { text: `Exit System Upgrades`, value: "exit" },
      ];

      const choice = await this.terminal.showChoices(choices);

      if (choice === "start_money") {
        if (this.reputation >= 10) {
          this.reputation -= 10;
          let val = parseInt(localStorage.getItem("perm_start_money") || "0");
          localStorage.setItem("perm_start_money", (val + 100).toString());
          await this.terminal.typeText("Upgrade Installed.", 20);
          this.saveReputation();
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          await this.terminal.typeText("Insufficient Reputation.", 20);
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else if (choice === "score_mult") {
        if (this.reputation >= 20) {
          this.reputation -= 20;
          let val = parseFloat(
            localStorage.getItem("perm_score_mult") || "0.0"
          );
          localStorage.setItem("perm_score_mult", (val + 0.1).toFixed(2));
          await this.terminal.typeText("Upgrade Installed.", 20);
          this.saveReputation();
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          await this.terminal.typeText("Insufficient Reputation.", 20);
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else if (choice === "discount") {
        if (this.reputation >= 30) {
          this.reputation -= 30;
          let val = parseFloat(localStorage.getItem("perm_discount") || "0.0");
          localStorage.setItem("perm_discount", (val + 0.05).toFixed(2));
          await this.terminal.typeText("Upgrade Installed.", 20);
          this.saveReputation();
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          await this.terminal.typeText("Insufficient Reputation.", 20);
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else if (choice === "luck") {
        if (this.reputation >= 40) {
          this.reputation -= 40;
          let val = parseFloat(localStorage.getItem("perm_luck") || "0.0");
          localStorage.setItem("perm_luck", (val + 0.02).toFixed(2));
          await this.terminal.typeText(
            "Special Blocks Unlocked / Probability Increased.",
            20
          );
          this.saveReputation();
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          await this.terminal.typeText("Insufficient Reputation.", 20);
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else {
        break;
      }
    }
    this.terminal.clear();
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
