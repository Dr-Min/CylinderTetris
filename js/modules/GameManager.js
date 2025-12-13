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
    this.game.consumeRevive = () => this.consumeRevive(); // 부활권 사용
  }

  async init() {
    this.loadReputation();
    this.game.init(); // 3D 씬 로드
    await this.startIntro();
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

    if (this.reputation > 0) {
      await this.terminal.typeText(`REP LEVEL: ${this.reputation}`, 20);
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
    const earnedData = linesCleared * 100;
    this.currentMoney += earnedData;

    // 게임 화면 페이드 아웃
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.clear();

    if (this.currentStage === 0) {
      // 튜토리얼 클리어
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
      await this.terminal.typeText(`STAGE ${this.currentStage} COMPLETE.`, 30);
      await this.terminal.typeText(`Data Acquired: ${earnedData} MB`, 20);
      await this.terminal.typeText(
        `Total Available: ${this.currentMoney} MB`,
        20
      );
      await this.terminal.typeText("다음 경로를 선택하라.", 30);

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
