import { TerminalUI } from "./TerminalUI.js";
import { TetrisGame } from "./TetrisGame.js";

export class GameManager {
  constructor() {
    this.terminal = new TerminalUI();
    this.game = new TetrisGame("game-container");

    // 게임 상태
    this.currentStage = 0; // 0: Tutorial, 1+: Real Stages
    this.playerStats = {
      speedModifier: 1.0, // 속도 배율 (낮을수록 느림/유리)
      scoreMultiplier: 1.0,
      preClearedLines: 0, // 시작 시 미리 지워진 라인 수
    };

    // 게임 이벤트 연결
    this.game.onStageClear = () => this.handleStageClear();
    this.game.onGameOver = (score) => this.handleGameOver(score);
  }

  async init() {
    this.game.init(); // 3D 씬 로드
    await this.startIntro();
  }

  async startIntro() {
    this.terminal.show();
    await this.terminal.typeText("Initializing HACKER_PROTOCOL v22...", 20);
    await new Promise((r) => setTimeout(r, 500));
    await this.terminal.typeText("Connecting to local proxy...", 20);
    await new Promise((r) => setTimeout(r, 500));

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
    this.terminal.printSystemMessage("Entering Simulation Mode...");

    // 튜토리얼: 목표 3줄, 속도 1000ms (아주 느림)
    this.transitionToGame(3, 1000);
  }

  async handleStageClear() {
    // 게임 화면 페이드 아웃
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.clear();

    if (this.currentStage === 0) {
      // 튜토리얼 클리어
      await this.terminal.typeText("ACCESS GRANTED.", 30);
      await new Promise((r) => setTimeout(r, 1000));
      await this.terminal.typeText("나쁘지 않군. 시뮬레이션 종료.", 40);
      await this.terminal.typeText(
        "이제 진짜다. 보안 시스템 메인프레임에 접속한다.",
        40
      );
      await this.terminal.typeText("경고: 추적 프로그램이 가동될 것이다.", 30);

      await this.terminal.waitForEnter();
      this.currentStage = 1;
      this.startStage();
    } else {
      // 일반 스테이지 클리어 -> 업그레이드 메뉴
      await this.terminal.typeText(`STAGE ${this.currentStage} COMPLETE.`, 30);
      await this.terminal.typeText(
        "보안 레벨이 상승했다. 시스템을 업그레이드하라.",
        30
      );
      await this.showUpgradeMenu();
    }
  }

  async showUpgradeMenu() {
    const upgrades = [
      {
        text: "Time Dilation [속도 -10%]",
        value: "slow",
        desc: "데이터 흐름을 늦춥니다.",
      },
      {
        text: "Data Compression [점수 +20%]",
        value: "score",
        desc: "탈취 효율을 높입니다.",
      },
      {
        text: "System Reboot [재정비]",
        value: "heal",
        desc: "다음 스테이지 난이도 완화",
      },
    ];

    const choice = await this.terminal.showChoices(upgrades);

    // 업그레이드 적용
    if (choice === "slow") {
      this.playerStats.speedModifier *= 0.9;
      await this.terminal.typeText(">> Time Dilation activated.", 20);
    } else if (choice === "score") {
      this.playerStats.scoreMultiplier += 0.2;
      await this.terminal.typeText(">> Compression algorithm loaded.", 20);
    } else if (choice === "heal") {
      // 힐링은 단순히 멘트만? 혹은 다음 스테이지 속도 리셋?
      // 여기서는 단순히 기분 좋은 메시지로 처리하거나, 플레이어 스탯을 다르게 조정
      await this.terminal.typeText(">> System cache cleared.", 20);
    }

    await new Promise((r) => setTimeout(r, 1000));

    this.currentStage++;
    this.startStage();
  }

  startStage() {
    this.terminal.clear();
    this.terminal.printSystemMessage(
      `Injecting Payload... Stage ${this.currentStage}`
    );

    // 난이도 계산
    // 기본 속도 800ms, 스테이지마다 50ms씩 빨라짐 (최소 100ms)
    let baseSpeed = Math.max(100, 800 - (this.currentStage - 1) * 60);

    // 플레이어 업그레이드(속도 감속) 적용
    let finalSpeed = baseSpeed * this.playerStats.speedModifier;

    // 목표 라인: 스테이지 * 5 (5, 10, 15...)
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
    // 게임 오버 처리
    document.getElementById("game-ui").style.display = "none";

    // 기존 게임 오버 화면 대신 터미널로 복귀하거나,
    // 전용 게임 오버 터미널 연출
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.clear();

    document.getElementById("game-over-screen").classList.remove("hidden");
    document.getElementById("final-score").innerText = Math.floor(
      score * this.playerStats.scoreMultiplier
    );

    // 재시작 버튼 로직은 index.html의 onclick="location.reload()"가 담당
  }
}
