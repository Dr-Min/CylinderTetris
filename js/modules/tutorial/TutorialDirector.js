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
    this.pendingResolve = null;
    this.rafId = null;
    this.pausedDefense = false;
    this.pauseWasRunning = false;
    this.toastTimer = null;

    this.createOverlay();
  }

  syncFromStorage() {
    this.completed = localStorage.getItem(this.storageKey) === "true";
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

  async handleEvent(eventName, payload = {}) {
    if (!this.isActive()) return;

    switch (eventName) {
      case "safe-zone-ready":
        if (this.phase === "await-safe-zone") {
          await this.showHeroIntro();
          if (!this.isActive()) return;
          this.phase = "await-map";
        }
        break;
      case "command-menu-shown":
        if (this.phase === "await-map") {
          this.showMapCommandHint();
        }
        break;
      case "map-opened":
        if (this.phase === "await-map" || this.phase === "await-stage-select") {
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
        if (this.phase === "await-stage-select" && payload.stage?.type === "conquest") {
          this.hide();
          this.phase = "await-combat-ready";
        }
        break;
      case "combat-ready":
        if (this.phase === "await-combat-ready" && payload.stage?.type === "conquest") {
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
          this.showToast(
            {
              speaker: "PDX-01",
              title: "BREACH LIVE",
              body:
                "주인님, 이제 3줄만 지우면 돼요.\n파동을 보내서 침투를 밀어붙이세요.",
            },
            3200
          );
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
          <div class="tutorial-avatar">PDX-01</div>
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
    this.currentMode = config.mode || "hint";
    this.currentPlacement = config.placement || "bottom";
    this.currentTargetResolver = config.target || null;
    this.speakerEl.textContent = config.speaker || "PDX-01";
    this.titleEl.textContent = config.title || "";
    this.bodyEl.textContent = config.body || "";
    this.continueBtn.textContent = config.continueLabel || "CONTINUE";
    this.continueBtn.classList.toggle("hidden", !config.showContinue);
    this.skipBtn.classList.toggle("hidden", config.hideSkip === true);
    this.root.classList.remove("hidden", "tutorial-hint", "tutorial-modal", "tutorial-toast", "tutorial-blocking");
    this.root.classList.add(`tutorial-${this.currentMode}`);
    if (config.blocking) {
      this.root.classList.add("tutorial-blocking");
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
    const result = await this.showModal({
      speaker: "PDX-01",
      title: "LINK ESTABLISHED",
      body:
        "주인님, 저는 PDX-01이에요.\n이 Safe Zone에서 작전 링크를 유지하고,\n전투 중에는 코어 옆에서 함께 공격할게요.\n\n밖은 이미 오염됐어요.\n지금부터 첫 섹터를 확보하러 가요.",
      continueLabel: "LINK START",
      placement: "center",
      target: null,
    });

    if (result === "skip") {
      return;
    }
  }

  async showCombatBriefing() {
    this.pauseDefense();

    const coreResult = await this.showModal({
      speaker: "PDX-01",
      title: "CORE PROTECTION",
      body:
        "주인님, 중앙 코어가 이번 작전의 핵심이에요.\n코어가 무너지면 이 섹터는 바로 밀려요.",
      continueLabel: "UNDERSTOOD",
      placement: "bottom",
      target: () => this.getCoreRect(),
    });
    if (coreResult === "skip") return;

    const shieldResult = await this.showModal({
      speaker: "PDX-01",
      title: "SHIELD CONTROL",
      body:
        "위험할 땐 이 버튼으로 실드를 유지하세요.\n몰릴 때 타이밍만 익혀도 생존력이 크게 달라져요.",
      continueLabel: "MOVE OUT",
      placement: "top",
      target: () => this.getElementRect("#shield-btn"),
    });
    if (shieldResult === "skip") return;

    this.resumeDefense();
  }

  showMapCommandHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "OPEN STAGE MAP",
      body: "주인님, /map 으로 작전 지도를 열어주세요.",
      placement: "bottom",
      target: () => this.findChoiceButton("map"),
    });
  }

  showStageSelectHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "SELECT A SECTOR",
      body: "열려 있는 섹터 중 하나를 선택해요.\n첫 교두보만 확보하면 다음 길이 열려요.",
      placement: "right",
      target: () => this.findFirstAccessibleConquestStageRect(),
    });
  }

  showSurvivalHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "HOLD THE LINE",
      body: "페이지를 버티면 침투 기회가 열려요.\n조금만 더 버텨요, 주인님.",
      placement: "bottom",
      target: () =>
        this.getElementRect("#terminal-page-display") ||
        this.getElementRect("#defense-ui #wave-info"),
    });
  }

  showConquerHint() {
    this.showHint({
      speaker: "PDX-01",
      title: "BREACH WINDOW",
      body:
        "지금이에요, 주인님.\nCONQUER를 눌러 브리치를 시작하세요.",
      placement: "bottom",
      target: () => this.getElementRect("#conquer-btn"),
    });
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

  resolveTargetRect() {
    if (!this.currentTargetResolver) return null;
    const rect = this.currentTargetResolver();
    if (!rect) return null;
    if (typeof rect.left === "number") {
      return rect;
    }
    if (typeof rect.x === "number") {
      return {
        left: rect.x,
        top: rect.y,
        width: rect.width || 0,
        height: rect.height || 0,
      };
    }
    return null;
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
    let cardLeft = (viewportWidth - cardRect.width) * 0.5;
    let cardTop = 24;

    if (this.currentPlacement === "right") {
      cardLeft = targetRect.right + 24;
      cardTop = targetRect.top + targetRect.height * 0.5 - cardRect.height * 0.5;
    } else if (this.currentPlacement === "left") {
      cardLeft = targetRect.left - cardRect.width - 24;
      cardTop = targetRect.top + targetRect.height * 0.5 - cardRect.height * 0.5;
    } else if (this.currentPlacement === "top") {
      cardLeft = targetRect.left + targetRect.width * 0.5 - cardRect.width * 0.5;
      cardTop = targetRect.top - cardRect.height - 24;
    } else {
      cardLeft = targetRect.left + targetRect.width * 0.5 - cardRect.width * 0.5;
      cardTop = targetRect.bottom + 24;
    }

    cardLeft = clamp(cardLeft, margin, viewportWidth - cardRect.width - margin);
    cardTop = clamp(cardTop, margin, viewportHeight - cardRect.height - margin);
    this.card.style.left = `${Math.round(cardLeft)}px`;
    this.card.style.top = `${Math.round(cardTop)}px`;

    const targetCenterX = targetRect.left + targetRect.width * 0.5;
    const targetCenterY = targetRect.top + targetRect.height * 0.5;
    let startX = cardLeft + cardRect.width * 0.5;
    let startY = cardTop + cardRect.height * 0.5;

    if (this.currentPlacement === "right") {
      startX = cardLeft;
    } else if (this.currentPlacement === "left") {
      startX = cardLeft + cardRect.width;
    } else if (this.currentPlacement === "top") {
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
