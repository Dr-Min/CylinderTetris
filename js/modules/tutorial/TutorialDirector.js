function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class TutorialDirector {
  constructor({ gameManager, terminal, defenseGame }) {
    this.gameManager = gameManager;
    this.terminal = terminal;
    this.defenseGame = defenseGame;
    this.storageKey = "tutorial_completed";
    this.completed = localStorage.getItem(this.storageKey) === "true";
    this.sessionActive = false;
    this.phase = "idle";
    this.currentMode = "hidden";
    this.currentPlacement = "bottom";
    this.currentTargetResolver = null;
    this.currentAvoidResolver = null;
    this.pendingResolve = null;
    this.rafId = null;
    this.pausedDefense = false;
    this.pauseWasRunning = false;
    this.pausedTetris = false;
    this.tetrisWasLogicActive = false;
    this.toastTimer = null;
    this.topicStorageKey = "tutorial_topics_seen";
    this.topicState = this.loadTopicState();

    this.createOverlay();
  }

  syncFromStorage() {
    this.completed = localStorage.getItem(this.storageKey) === "true";
    this.topicState = this.loadTopicState();
  }

  isComplete() {
    return this.completed;
  }

  isActive() {
    return this.sessionActive && !this.completed;
  }

  beginFirstRunSession() {
    if (this.completed || this.sessionActive) return;
    this.sessionActive = true;
    this.phase = "await-safe-zone";
  }

  loadTopicState() {
    try {
      const raw = localStorage.getItem(this.topicStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  hasSeenTopic(topic) {
    return this.topicState[topic] === true;
  }

  markTopicSeen(topic) {
    this.topicState = {
      ...this.topicState,
      [topic]: true,
    };
    localStorage.setItem(this.topicStorageKey, JSON.stringify(this.topicState));
  }

  async handleEvent(eventName, payload = {}) {
    if (eventName === "recovery-needed") {
      await this.showRecoveryHintOnce(payload);
      return;
    }

    if (eventName === "breach-failed") {
      this.showBreachFailureHintOnce();
      return;
    }

    if (!this.isActive()) return;

    switch (eventName) {
      case "safe-zone-ready":
        if (this.phase === "await-safe-zone") {
          await this.showHeroIntro();
          if (!this.isActive()) return;
          this.phase = "await-inventory";
        }
        break;
      case "command-menu-shown":
        if (this.hasChoice(payload.choices, "conquer") && this.canShowConquerHint()) {
          this.phase = "await-breach-start";
          this.showConquerHint();
          break;
        }
        if (this.phase === "await-inventory") {
          if (this.hasChoice(payload.choices, "inventory")) {
            this.showInventoryCommandHint();
            break;
          }
          this.phase = "await-map";
        }
        if (this.phase === "await-map") {
          this.showMapCommandHint();
        }
        break;
      case "inventory-opened":
        if (this.phase === "await-inventory" || this.phase === "await-map") {
          this.markTopicSeen("inventory-command");
          await this.showInventoryBriefing();
          if (!this.isActive()) return;
          this.phase = "await-map";
        }
        break;
      case "inventory-closed":
        if (this.phase === "await-inventory") {
          this.phase = "await-map";
        }
        break;
      case "map-opened":
        if (
          this.phase === "await-inventory" ||
          this.phase === "await-map" ||
          this.phase === "await-stage-select"
        ) {
          this.phase = "await-stage-select";
          this.showStageSelectHint();
        }
        break;
      case "map-closed":
        if (this.phase === "await-stage-select") {
          this.phase = "await-map";
          this.showMapCommandHint();
        }
        break;
      case "stage-selected":
        if (this.phase === "await-stage-select" && payload.stage && payload.stage.type !== "safe") {
          this.hide();
          this.phase = "await-equipment";
        }
        break;
      case "equipment-selection-opened":
        if (this.phase === "await-equipment" || this.phase === "await-combat-ready") {
          await this.showEquipmentBriefing();
          if (!this.isActive()) return;
          this.phase = "await-combat-ready";
        }
        break;
      case "combat-ready":
        if (this.canShowCombatBriefing() && payload.stage?.type === "conquest") {
          await this.showCombatBriefing();
          if (!this.isActive()) return;
          this.phase = "await-breach-ready";
          this.showSurvivalHint();
        }
        break;
      case "conquer-ready":
        if (this.phase === "await-breach-ready") {
          this.phase = "await-breach-start";
          this.showConquerHint();
        }
        break;
      case "breach-started":
        if (
          this.phase === "await-breach-ready" ||
          this.phase === "await-breach-start" ||
          this.phase === "await-combat-ready"
        ) {
          await this.showBreachRules();
          if (!this.isActive()) return;
          this.complete();
        }
        break;
      case "conquest-complete":
        this.complete();
        break;
      default:
        break;
    }
  }

  createOverlay() {
    this.root = document.createElement("div");
    this.root.id = "tutorial-overlay";
    this.root.className = "hidden";
    this.root.innerHTML = `
      <div class="tutorial-scrim"></div>
      <div class="tutorial-highlight"></div>
      <div class="tutorial-pointer">
        <div class="tutorial-pointer-line"></div>
        <div class="tutorial-pointer-head"></div>
      </div>
      <section class="tutorial-card">
        <div class="tutorial-card-header">
          <div class="tutorial-avatar" aria-hidden="true">
            <div class="tutorial-helper-face">
              <span class="tutorial-helper-eye tutorial-helper-eye-left"></span>
              <span class="tutorial-helper-eye tutorial-helper-eye-right"></span>
              <span class="tutorial-helper-mouth"></span>
            </div>
          </div>
          <div class="tutorial-header-copy">
            <div class="tutorial-speaker">PDX-01</div>
            <div class="tutorial-title"></div>
          </div>
        </div>
        <div class="tutorial-body"></div>
        <div class="tutorial-actions">
          <button type="button" class="tutorial-skip">SKIP</button>
          <button type="button" class="tutorial-continue">CONTINUE</button>
        </div>
      </section>
    `;
    document.body.appendChild(this.root);

    this.scrim = this.root.querySelector(".tutorial-scrim");
    this.highlight = this.root.querySelector(".tutorial-highlight");
    this.pointer = this.root.querySelector(".tutorial-pointer");
    this.card = this.root.querySelector(".tutorial-card");
    this.speakerEl = this.root.querySelector(".tutorial-speaker");
    this.titleEl = this.root.querySelector(".tutorial-title");
    this.bodyEl = this.root.querySelector(".tutorial-body");
    this.skipBtn = this.root.querySelector(".tutorial-skip");
    this.continueBtn = this.root.querySelector(".tutorial-continue");

    this.skipBtn.addEventListener("click", () => this.skip());
    this.continueBtn.addEventListener("click", () => this.resolveModal("continue"));
  }

  show(config) {
    if (this.toastTimer && config.mode !== "toast") {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.currentMode = config.mode || "hint";
    this.currentPlacement = config.placement || "bottom";
    this.currentTargetResolver = config.target || null;
    this.currentAvoidResolver = config.avoid || null;
    this.speakerEl.textContent = config.speaker || "PDX-01";
    this.titleEl.textContent = config.title || "";
    this.bodyEl.textContent = config.body || "";
    this.continueBtn.textContent = config.continueLabel || "CONTINUE";
    this.continueBtn.classList.toggle("hidden", !config.showContinue);
    this.skipBtn.classList.toggle("hidden", config.hideSkip === true);
    this.root.classList.remove(
      "hidden",
      "tutorial-hint",
      "tutorial-modal",
      "tutorial-toast",
      "tutorial-blocking",
      "tutorial-elevated"
    );
    this.root.classList.add(`tutorial-${this.currentMode}`);
    if (config.blocking) {
      this.root.classList.add("tutorial-blocking");
    }
    if (config.elevated) {
      this.root.classList.add("tutorial-elevated");
    }
    this.startRenderLoop();
  }

  hide() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.currentMode = "hidden";
    this.currentTargetResolver = null;
    this.currentAvoidResolver = null;
    this.root.className = "hidden";
    this.highlight.style.display = "none";
    this.pointer.style.display = "none";
    this.stopRenderLoop();
  }

  showHint(config) {
    this.resolveModal(null);
    this.show({
      ...config,
      mode: "hint",
      showContinue: false,
      blocking: false,
    });
  }

  showToast(config, duration = 2800) {
    this.resolveModal(null);
    this.show({
      ...config,
      mode: "toast",
      showContinue: false,
      hideSkip: true,
      blocking: false,
      target: null,
      placement: "center",
    });
    this.toastTimer = window.setTimeout(() => {
      this.hide();
    }, duration);
  }

  showModal(config) {
    this.show({
      ...config,
      mode: "modal",
      showContinue: true,
      blocking: true,
    });
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  resolveModal(result) {
    if (!this.pendingResolve) return;
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    this.hide();
    resolve(result);
  }

  skip() {
    if (this.pausedDefense) {
      this.resumeDefense();
    }
    if (this.pausedTetris) {
      this.resumeTetris();
    }
    this.complete();
    this.resolveModal("skip");
    this.hide();
  }

  complete() {
    if (this.completed) return;
    this.completed = true;
    this.sessionActive = false;
    this.phase = "complete";
    localStorage.setItem(this.storageKey, "true");
    if (this.currentMode !== "toast") {
      this.hide();
    }
  }

  async showHeroIntro() {
    const introResult = await this.showModal({
      speaker: "PDX-01",
      title: "LINK ESTABLISHED",
      body:
        "Safe Zone에 연결됐습니다.\n여기는 재정비 구역입니다. 코어가 무너지지 않는 동안 장비를 확인하고 다음 섹터로 이동할 수 있어요.",
      continueLabel: "NEXT",
      placement: "center",
      target: null,
    });
    if (introResult === "skip") return;

    const commandResult = await this.showModal({
      speaker: "PDX-01",
      title: "TERMINAL COMMANDS",
      body:
        "/map: 스테이지 지도 열기\n/inventory: 획득 아이템 확인/장착\n/upgrade: DATA로 시스템 강화\n/reset: 진행 초기화라 신중히 사용",
      continueLabel: "OPEN MENU",
      placement: "center",
      target: null,
    });
    if (commandResult === "skip") return;
  }

  async showCombatBriefing() {
    this.pauseDefense();

    const coreResult = await this.showModal({
      speaker: "PDX-01",
      title: "CORE PROTECTION",
      body:
        "중앙 코어가 방어 목표입니다.\n코어 HP가 0이 되면 작전은 실패하고 DATA 일부를 잃습니다.",
      continueLabel: "NEXT",
      placement: "bottom",
      target: () => this.getCoreRect(),
    });
    if (coreResult === "skip") return;

    const shieldResult = await this.showModal({
      speaker: "PDX-01",
      title: "SHIELD CONTROL",
      body:
        "방패 버튼으로 실드를 켜고 끕니다.\n켜면 안전하지만, 실드를 끈 동안 적을 처치하면 DATA가 코어로 흡수됩니다.\n끄면 벌고, 켜면 산다 — 타이밍이 전부입니다.",
      continueLabel: "NEXT",
      placement: "top",
      target: () => this.getElementRect("#shield-btn"),
    });
    if (shieldResult === "skip") return;

    const isMobile = !!this.defenseGame?.isMobile;
    const fireResult = await this.showModal({
      speaker: "PDX-01",
      title: "FIRE & MOVE",
      body: isMobile
        ? "화면을 터치하면 그 방향으로 발사합니다.\n왼쪽 아래 조이스틱으로 코어를 움직일 수 있어요.\n상단 배너에 현재 목표와 진행도가 항상 표시됩니다."
        : "클릭 또는 스페이스바로 발사합니다 (연사 가능).\nWASD/방향키로 코어를 움직일 수 있어요.\n상단 배너에 현재 목표와 진행도가 항상 표시됩니다.",
      continueLabel: "MOVE OUT",
      placement: "bottom",
      target: () => this.getElementRect("#objective-banner"),
    });
    if (fireResult === "skip") return;

    this.resumeDefense();
  }

  showMapCommandHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "OPEN STAGE MAP",
      body: "이제 /map으로 작전 지도를 여세요.\n지도에서 이동할 섹터를 선택합니다.",
      placement: "bottom",
      target: () => this.findChoiceButton("map"),
      avoid: () => this.getElementRect("#choice-area"),
    });
  }

  showStageSelectHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "SELECT A SECTOR",
      body:
        "열려 있는 섹터를 선택하세요.\n정복 섹터는 방어전을 버틴 뒤 breach로 점령할 수 있습니다.",
      placement: "right",
      target: () => this.findFirstAccessibleConquestStageRect(),
    });
  }

  showSurvivalHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "SURVIVE THE PAGES",
      body:
        "PAGE가 끝날 때까지 코어를 지키세요.\n상단 배너의 진행바가 가득 차면 정복 명령이 열립니다.",
      placement: "bottom",
      target: () =>
        this.getElementRect("#objective-banner") ||
        this.getElementRect("#terminal-page-display") ||
        this.getElementRect("#defense-ui #wave-info"),
    });
  }

  showConquerHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "CONQUEST PROMPT",
      body:
        ">>> CONQUER THIS SECTOR <<<가 열렸습니다.\n이 명령을 누르면 Tetris breach와 강화 방어가 동시에 시작됩니다.",
      placement: "bottom",
      target: () => this.findChoiceButton("conquer") || this.getElementRect("#conquer-btn"),
      avoid: () => this.getElementRect("#choice-area"),
    });
  }

  showInventoryCommandHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "CHECK YOUR KIT",
      body:
        "출격 전에 /inventory를 한 번 확인하세요.\n장비 슬롯과 획득 아이템 위치를 익히는 단계입니다.",
      placement: "bottom",
      target: () => this.findChoiceButton("inventory"),
      avoid: () => this.getElementRect("#choice-area"),
    });
  }

  async showInventoryBriefing() {
    const slotResult = await this.showModal({
      speaker: "PDX-01",
      title: "EQUIPMENT SLOTS",
      body:
        "위쪽 슬롯이 현재 장착 장비입니다.\n잠긴 슬롯은 DATA를 써서 해금하고, 장착 효과는 다음 전투에 적용됩니다.",
      continueLabel: "NEXT",
      placement: "bottom",
      elevated: true,
      target: () =>
        this.getElementRect("#inventory-overlay .inventory-equip-slots") ||
        this.getElementRect("#inventory-overlay"),
    });
    if (slotResult === "skip") return;

    const gridResult = await this.showModal({
      speaker: "PDX-01",
      title: "INVENTORY GRID",
      body:
        "획득한 아이템은 아래 칸에 보관됩니다.\n아이템을 누르면 장착을 시도하고, 빈 장비 슬롯이 있으면 바로 활용할 수 있어요.",
      continueLabel: "CLOSE WHEN READY",
      placement: "top",
      elevated: true,
      target: () =>
        this.getElementRect("#inventory-overlay .inventory-grid") ||
        this.getElementRect("#inventory-overlay"),
    });
    if (gridResult === "skip") return;
  }

  async showEquipmentBriefing() {
    const result = await this.showModal({
      speaker: "PDX-01",
      title: "MISSION LOADOUT",
      body:
        "섹터에 들어가기 전 장착 장비를 다시 확인합니다.\n준비가 끝났으면 [ DEPLOY ]로 방어전을 시작하세요.",
      continueLabel: "DEPLOY READY",
      placement: "bottom",
      elevated: true,
      target: () =>
        this.getElementRect("#equipment-selection-overlay .mission-equip-slots") ||
        this.getElementRect("#equipment-selection-overlay"),
    });
    if (result === "skip") return;
  }

  async showBreachRules() {
    this.pauseDefense();
    this.pauseTetris();

    const rulesResult = await this.showModal({
      speaker: "PDX-01",
      title: "TETRIS BREACH RULES",
      body:
        "점령은 두 조건을 모두 만족해야 완료됩니다.\n1. Tetris에서 목표 3줄을 클리어\n2. 미니 방어 화면의 코어가 강화 PAGE 3개를 생존",
      continueLabel: "NEXT",
      placement: "center",
      elevated: true,
      target: null,
    });
    if (rulesResult === "skip") return;

    const controlResult = await this.showModal({
      speaker: "PDX-01",
      title: "DUAL SURVIVAL",
      body:
        "줄을 지우면 적에게 넉백/피해가 들어갑니다.\n모바일은 좌/우, DROP, NEXT BLOCK 버튼으로 조작하세요.",
      continueLabel: "START BREACH",
      placement: "right",
      elevated: true,
      target: () =>
        this.getElementRect("#mini-defense-panel") ||
        this.getElementRect("#game-container"),
    });
    if (controlResult === "skip") return;

    this.resumeTetris();
    this.resumeDefense();
  }

  showBreachFailureHintOnce() {
    if (this.hasSeenTopic("breach-failure")) return;
    this.markTopicSeen("breach-failure");
    this.showToast(
      {
        speaker: "PDX-01",
        title: "BREACH FAILED",
        body:
          "퍼즐 실패 시 적 증원이 들어옵니다.\n코어를 지키고 강화 PAGE가 끝날 때까지 버티세요.",
      },
      4200
    );
  }

  async showRecoveryHintOnce({ lostMoney, remainingMoney } = {}) {
    if (this.hasSeenTopic("recovery")) return;
    this.markTopicSeen("recovery");

    const lossLine = Number.isFinite(lostMoney) ? `이번 손실: ${lostMoney} MB\n` : "";
    const remainingLine = Number.isFinite(remainingMoney)
      ? `남은 DATA: ${remainingMoney} MB\n`
      : "";

    await this.showModal({
      speaker: "PDX-01",
      title: "RECOVERY AFTER FAILURE",
      body:
        `실패하면 DATA의 70%를 잃고 30%만 유지됩니다.\n${lossLine}${remainingLine}` +
        "REBOOT 후 Safe Zone에서 /inventory와 /upgrade를 확인한 뒤 /map으로 재출격하세요.",
      continueLabel: "REBOOT READY",
      hideSkip: true,
      placement: "center",
      target: null,
    });
  }

  hasChoice(choices, value) {
    return Array.isArray(choices) && choices.some((choice) => choice?.value === value);
  }

  canShowCombatBriefing() {
    return (
      this.phase === "await-map" ||
      this.phase === "await-stage-select" ||
      this.phase === "await-equipment" ||
      this.phase === "await-combat-ready"
    );
  }

  canShowConquerHint() {
    return (
      this.phase === "await-breach-ready" ||
      this.phase === "await-breach-start" ||
      this.phase === "await-combat-ready"
    );
  }

  findChoiceButton(value) {
    return document.querySelector(`[data-choice-value="${value}"]`);
  }

  findFirstAccessibleConquestStageRect() {
    const button = document.querySelector(
      '#map-overlay [data-stage-type="conquest"][data-stage-accessible="true"]'
    );
    return button ? button.getBoundingClientRect() : null;
  }

  getElementRect(selector) {
    const element = document.querySelector(selector);
    return element ? element.getBoundingClientRect() : null;
  }

  getCoreRect() {
    const defense = this.defenseGame;
    if (!defense || !defense.canvas || defense.canvas.style.display === "none") {
      return null;
    }

    const screenCenterX = defense.canvas.width * 0.5;
    const screenCenterY = defense.canvas.height * 0.5;
    const cameraX = defense.camera?.x ?? defense.core.x;
    const cameraY = defense.camera?.y ?? defense.core.y;
    const scale = defense.gameScale || 1;
    const coreWorldX = defense.core.x + (defense.core.visualOffsetX || 0);
    const coreWorldY = defense.core.y + (defense.core.visualOffsetY || 0);
    const coreScreenX = screenCenterX + (coreWorldX - cameraX) * scale;
    const coreScreenY = screenCenterY + (coreWorldY - cameraY) * scale;
    const radius = clamp(
      ((defense.core.shieldRadius || defense.core.radius || 16) + 18) * scale,
      42,
      110
    );

    return {
      left: coreScreenX - radius,
      top: coreScreenY - radius,
      width: radius * 2,
      height: radius * 2,
    };
  }

  pauseDefense() {
    if (!this.defenseGame || this.pausedDefense) return;
    this.pauseWasRunning = !!this.defenseGame.isRunning;
    if (this.pauseWasRunning) {
      this.defenseGame.pause();
      this.pausedDefense = true;
    }
  }

  resumeDefense() {
    if (!this.defenseGame || !this.pausedDefense) return;
    this.pausedDefense = false;
    if (this.pauseWasRunning) {
      this.defenseGame.resume();
    }
    this.pauseWasRunning = false;
  }

  pauseTetris() {
    const tetris = this.gameManager?.tetrisGame;
    if (!tetris || this.pausedTetris) return;
    this.tetrisWasLogicActive = !!tetris.state?.isLogicActive;
    if (this.tetrisWasLogicActive) {
      tetris.state.isLogicActive = false;
      this.pausedTetris = true;
    }
  }

  resumeTetris() {
    const tetris = this.gameManager?.tetrisGame;
    if (!tetris || !this.pausedTetris) return;
    this.pausedTetris = false;
    if (this.tetrisWasLogicActive && tetris.state) {
      tetris.state.isLogicActive = true;
    }
    this.tetrisWasLogicActive = false;
  }

  startRenderLoop() {
    if (this.rafId) return;
    const tick = () => {
      this.updateLayout();
      if (this.currentMode !== "hidden") {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopRenderLoop() {
    if (!this.rafId) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  normalizeRect(rect) {
    if (!rect) return null;
    if (typeof rect.getBoundingClientRect === "function") {
      return this.normalizeRect(rect.getBoundingClientRect());
    }
    const left = typeof rect.left === "number" ? rect.left : rect.x;
    const top = typeof rect.top === "number" ? rect.top : rect.y;
    if (typeof left !== "number" || typeof top !== "number") return null;
    const width = rect.width || 0;
    const height = rect.height || 0;
    const right = typeof rect.right === "number" ? rect.right : left + width;
    const bottom = typeof rect.bottom === "number" ? rect.bottom : top + height;
    return { left, top, width, height, right, bottom };
  }

  resolveRect(resolver) {
    if (!resolver) return null;
    return this.normalizeRect(resolver());
  }

  resolveTargetRect() {
    return this.resolveRect(this.currentTargetResolver);
  }

  resolveAvoidRect() {
    return this.resolveRect(this.currentAvoidResolver);
  }

  rectsOverlap(first, second, pad = 0) {
    if (!first || !second) return false;
    return !(
      first.right + pad <= second.left ||
      first.left - pad >= second.right ||
      first.bottom + pad <= second.top ||
      first.top - pad >= second.bottom
    );
  }

  chooseCardPosition({
    targetRect,
    cardRect,
    viewportWidth,
    viewportHeight,
    preferredPlacement,
    avoidRect = null,
    margin = 18,
  }) {
    const placements = [
      preferredPlacement,
      "bottom",
      "top",
      "right",
      "left",
    ].filter((placement, index, list) => placement && list.indexOf(placement) === index);

    const maxLeft = Math.max(margin, viewportWidth - cardRect.width - margin);
    const maxTop = Math.max(margin, viewportHeight - cardRect.height - margin);

    const buildPosition = (placement) => {
      let left = (viewportWidth - cardRect.width) * 0.5;
      let top = 24;

      if (placement === "right") {
        left = targetRect.right + 24;
        top = targetRect.top + targetRect.height * 0.5 - cardRect.height * 0.5;
      } else if (placement === "left") {
        left = targetRect.left - cardRect.width - 24;
        top = targetRect.top + targetRect.height * 0.5 - cardRect.height * 0.5;
      } else if (placement === "top") {
        left = targetRect.left + targetRect.width * 0.5 - cardRect.width * 0.5;
        top = targetRect.top - cardRect.height - 24;
      } else {
        left = targetRect.left + targetRect.width * 0.5 - cardRect.width * 0.5;
        top = targetRect.bottom + 24;
      }

      left = clamp(left, margin, maxLeft);
      top = clamp(top, margin, maxTop);
      return { left, top, placement };
    };

    const toRect = (position) => ({
      left: position.left,
      top: position.top,
      right: position.left + cardRect.width,
      bottom: position.top + cardRect.height,
      width: cardRect.width,
      height: cardRect.height,
    });

    let chosen = buildPosition(placements[0] || "bottom");
    for (const placement of placements) {
      const candidate = buildPosition(placement);
      const candidateRect = toRect(candidate);
      if (
        !this.rectsOverlap(candidateRect, targetRect, 8) &&
        !this.rectsOverlap(candidateRect, avoidRect, 8)
      ) {
        chosen = candidate;
        break;
      }
    }

    const pushAway = (position, rect) => {
      if (!this.rectsOverlap(toRect(position), rect, 8)) return position;
      const belowTop = rect.bottom + 18;
      if (belowTop + cardRect.height <= viewportHeight - margin) {
        return { ...position, top: belowTop, placement: "bottom" };
      }
      const aboveTop = rect.top - cardRect.height - 18;
      if (aboveTop >= margin) {
        return { ...position, top: aboveTop, placement: "top" };
      }
      return position;
    };

    chosen = pushAway(chosen, avoidRect);
    chosen = pushAway(chosen, targetRect);
    chosen.left = clamp(chosen.left, margin, maxLeft);
    chosen.top = clamp(chosen.top, margin, maxTop);
    return chosen;
  }

  updateLayout() {
    if (this.currentMode === "hidden") return;

    const targetRect = this.resolveTargetRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (!targetRect || this.currentPlacement === "center") {
      this.highlight.style.display = "none";
      this.pointer.style.display = "none";
      const cardRect = this.card.getBoundingClientRect();
      const left = (viewportWidth - cardRect.width) * 0.5;
      const top = this.currentMode === "toast"
        ? clamp(viewportHeight - cardRect.height - 28, 18, viewportHeight - cardRect.height - 18)
        : (viewportHeight - cardRect.height) * 0.5;
      this.card.style.left = `${Math.round(left)}px`;
      this.card.style.top = `${Math.round(top)}px`;
      return;
    }

    const highlightPad = this.currentMode === "modal" ? 12 : 8;
    const highlightLeft = targetRect.left - highlightPad;
    const highlightTop = targetRect.top - highlightPad;
    const highlightWidth = targetRect.width + highlightPad * 2;
    const highlightHeight = targetRect.height + highlightPad * 2;
    this.highlight.style.display = "block";
    this.highlight.style.left = `${Math.round(highlightLeft)}px`;
    this.highlight.style.top = `${Math.round(highlightTop)}px`;
    this.highlight.style.width = `${Math.round(highlightWidth)}px`;
    this.highlight.style.height = `${Math.round(highlightHeight)}px`;

    const cardRect = this.card.getBoundingClientRect();
    const margin = 18;
    const cardPosition = this.chooseCardPosition({
      targetRect,
      cardRect,
      viewportWidth,
      viewportHeight,
      preferredPlacement: this.currentPlacement,
      avoidRect: this.resolveAvoidRect(),
      margin,
    });
    const cardLeft = cardPosition.left;
    const cardTop = cardPosition.top;
    const effectivePlacement = cardPosition.placement;
    this.card.style.left = `${Math.round(cardLeft)}px`;
    this.card.style.top = `${Math.round(cardTop)}px`;

    const targetCenterX = targetRect.left + targetRect.width * 0.5;
    const targetCenterY = targetRect.top + targetRect.height * 0.5;
    let startX = cardLeft + cardRect.width * 0.5;
    let startY = cardTop + cardRect.height * 0.5;

    if (effectivePlacement === "right") {
      startX = cardLeft;
    } else if (effectivePlacement === "left") {
      startX = cardLeft + cardRect.width;
    } else if (effectivePlacement === "top") {
      startY = cardTop + cardRect.height;
    } else {
      startY = cardTop;
    }

    const dx = targetCenterX - startX;
    const dy = targetCenterY - startY;
    const distance = Math.max(18, Math.hypot(dx, dy) - 18);
    const angle = Math.atan2(dy, dx);
    this.pointer.style.display = "block";
    this.pointer.style.left = `${Math.round(startX)}px`;
    this.pointer.style.top = `${Math.round(startY)}px`;
    this.pointer.style.width = `${Math.round(distance)}px`;
    this.pointer.style.transform = `translateY(-50%) rotate(${angle}rad)`;
  }
}
