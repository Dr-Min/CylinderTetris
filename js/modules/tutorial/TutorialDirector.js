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

  // 조작 안내 분기는 화면 폭이 아니라 입력 방식 기준 (태블릿=터치, 좁은 창 PC=키보드)
  usesTouch() {
    return !!(this.defenseGame?.hasTouchInput ?? this.defenseGame?.isMobile);
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

    // 첫 튜토리얼 완료 후에 처음 등장하는 요소들 — topic 기반 일회성 안내
    if (eventName === "combat-ready" && payload.stage?.type === "boss") {
      await this.showBossBriefingOnce();
      return;
    }
    if (eventName === "page-event") {
      this.showPageEventHintOnce(payload.type);
      return;
    }
    if (eventName === "upgrade-opened") {
      this.tryShowTopicToast("upgrade-menu", {
        speaker: "PDX-01",
        title: "SYSTEM UPGRADES",
        body: "강화는 4종이에요: 코어(포탑) / 조력자(저요!) / 아군 바이러스 / 실드.\n참고로 저부터 강화하셔도 됩니다? (진심)",
      }, 4600);
      return;
    }
    if (eventName === "upgrade-helper-opened") {
      this.tryShowTopicToast("weapon-modes", {
        speaker: "PDX-01",
        title: "WEAPON MODES",
        body: "상단 탭으로 제 무기를 바꿀 수 있어요!\n샷건·스나이퍼·연사·런처 — 오늘의 기분에 맞게 골라주세요.",
      }, 4600);
      return;
    }
    if (eventName === "upgrade-ally-opened") {
      this.tryShowTopicToast("ally-config", {
        speaker: "PDX-01",
        title: "ALLY SQUAD",
        body: "메인+서브 타입 조합으로 시너지가 발동돼요!\n조합마다 효과가 다르니 이것저것 실험해보세요.",
      }, 4600);
      return;
    }
    if (eventName === "perk-shop-opened") {
      this.tryShowTopicToast("perk-shop", {
        speaker: "PDX-01",
        title: "PERMANENT PERKS",
        body: "REP로 사는 영구 강화예요. 한 번 사면 죽어도 안 사라져요.\n...그 점은 조금 부럽네요. 아무튼 추천!",
      }, 4600);
      return;
    }
    if (eventName === "blueprint-collected") {
      this.tryShowTopicToast("blueprint", {
        speaker: "PDX-01",
        title: "BLUEPRINT FRAGMENT",
        body: "블루프린트 조각이에요! 모으면 새 아군 바이러스나\n새 무기가 해금됩니다. 보이면 무조건 줍기!",
      }, 4600);
      return;
    }
    if (eventName === "shield-return-mode") {
      this.tryShowTopicToast("shield-return", {
        speaker: "PDX-01",
        title: "EMERGENCY RETURN",
        body: "코어가 실드 밖으로 나가면 버튼이 RETURN으로 바뀌어요.\n누르면 즉시 실드 안으로 귀환 — 단, 충전 2회뿐!",
      }, 4600);
      return;
    }
    if (eventName === "boss-breach-ready") {
      this.tryShowTopicToast("boss-breach-ready", {
        speaker: "PDX-01",
        title: "BREACH READY",
        body: "게이지 완충!! 지금이에요, 해커님!\n침입 명령을 실행하면 보스 코어를 직접 때릴 수 있어요!",
      }, 4200);
      return;
    }
    if (eventName === "recall-complete") {
      this.tryShowTopicToast("after-recall", {
        speaker: "PDX-01",
        title: "BACK TO SAFE ZONE",
        body: "무사 귀환! 역시 판단이 빠르시네요.\n재정비 후 /map으로 재출격 — 점령지와 DATA는 그대로예요.",
      }, 4200);
      return;
    }
    if (eventName === "roaming-shards-active") {
      this.tryShowTopicToast("roaming-shards", {
        speaker: "PDX-01",
        title: "PROTOCOL SHARDS",
        body: "필드에 F~A 조각이 떨어져 있어요!\n코어로 전부 주우면 OVERDRIVE 탄막이 발동됩니다. 꽁돈이에요!",
      }, 4600);
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
        this.tryShowTopicToast("conquest-mining", {
          speaker: "PDX-01",
          title: "SECTOR SECURED!",
          body: "해냈어요!! 이제 이 섹터가 DATA를 채굴해서 보내줍니다.\n인접 점령지 2개는 병합돼서 아군이 더 강해져요!",
        }, 5200);
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

  tryShowTopicToast(topic, config, duration = 3600) {
    if (this.hasSeenTopic(topic)) return;
    if (this.pendingResolve) return; // 모달 안내 중에는 끼어들지 않음 (topic 미표시로 다음 기회에)
    this.markTopicSeen(topic);
    this.showToast(config, duration);
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
    const loreResult = await this.showModal({
      speaker: "PDX-01",
      title: "PDX-01 ONLINE",
      body:
        "저는 당신의 조력자, PDX-01입니다!\n당신이 그... 전설의 해커시군요! 드디어, 드디어 와주셨네요.\n이쪽 시스템은 좀 달라서 기본만 설명드릴게요.\n나머지는 — 실력으로 보여주세요!",
      continueLabel: "NEXT",
      placement: "center",
      target: null,
    });
    if (loreResult === "skip") return;

    const introResult = await this.showModal({
      speaker: "PDX-01",
      title: "SAFE ZONE",
      body:
        "여기는 Safe Zone — 이 망에서 유일하게 숨 돌릴 수 있는 곳이에요.\n여기서 장비를 정비하고 다음 섹터로 출격합니다.\n섹터를 하나씩 점령하다 보면... 중앙의 Core Nexus까지 닿을 거예요.",
      continueLabel: "NEXT",
      placement: "center",
      target: null,
    });
    if (introResult === "skip") return;

    const commandResult = await this.showModal({
      speaker: "PDX-01",
      title: "TERMINAL COMMANDS",
      body:
        "/map: 작전 지도 열기\n/inventory: 아이템 확인/장착\n/upgrade: DATA로 시스템 강화\n/reset: 전부 삭제 (신중히!)\n\n참, 우측 LOCK을 풀면 명령어를 직접 타이핑할 수도 있어요.\n역시 전설은 수동을 선호하시죠?",
      continueLabel: "NEXT",
      placement: "center",
      target: null,
    });
    if (commandResult === "skip") return;

    const isMobile = this.usesTouch();
    const facilityResult = await this.showModal({
      speaker: "PDX-01",
      title: "SAFE ZONE FACILITIES",
      body: (isMobile
        ? "조이스틱으로 코어를 움직여 시설에 들를 수 있어요.\n"
        : "WASD/방향키로 코어를 움직여 시설에 들를 수 있어요.\n") +
        "UPGRADE SHOP: DATA로 코어/조력자(저요!)/아군/실드 강화\nDISMANTLER: 남는 아이템 분해\n\n여긴 제가 오랫동안 혼자 지켜온— 아, 아니에요! 아무것도!",
      continueLabel: "OPEN MENU",
      placement: "center",
      target: null,
    });
    if (facilityResult === "skip") return;
  }

  async showCombatBriefing() {
    this.pauseDefense();

    const coreResult = await this.showModal({
      speaker: "PDX-01",
      title: "CORE PROTECTION",
      body:
        "보이시죠? 중앙의 코어가 당신의 접속 단말이에요.\nHP가 0이 되면 접속이 끊기고 DATA 일부를 잃습니다.\n잃는 게 DATA뿐이라 다행이죠! 아무튼 사수하세요!",
      continueLabel: "NEXT",
      placement: "bottom",
      target: () => this.getCoreRect(),
    });
    if (coreResult === "skip") return;

    const shieldResult = await this.showModal({
      speaker: "PDX-01",
      title: "SHIELD CONTROL",
      body:
        "방패 버튼! 켜면 안전, 끄면 수익이에요.\n실드를 끈 동안 처치하면 DATA가 코어로 빨려 들어옵니다.\n다시 켜려면 실드 범위 안에서 REARM 게이지를 채워야 해요.\n타이밍이 곧 실력입니다, 해커님!",
      continueLabel: "NEXT",
      placement: "top",
      target: () => this.getElementRect("#shield-btn"),
    });
    if (shieldResult === "skip") return;

    const isMobile = this.usesTouch();
    const fireResult = await this.showModal({
      speaker: "PDX-01",
      title: "FIRE & MOVE",
      body: isMobile
        ? "화면을 터치하면 그 방향으로 발사!\n왼쪽 아래 조이스틱으로 코어 이동.\n상단 배너에 현재 목표와 진행도가 항상 떠 있어요."
        : "클릭/스페이스바로 발사 (연사 가능)!\nWASD·방향키로 이동, Shift를 누르면 질주합니다.\n상단 배너에 현재 목표와 진행도가 항상 떠 있어요.",
      continueLabel: "MOVE OUT",
      placement: "bottom",
      target: () => this.getElementRect("#objective-banner"),
    });
    if (fireResult === "skip") return;

    const recallResult = await this.showModal({
      speaker: "PDX-01",
      title: "EMERGENCY RECALL",
      body:
        "불리하면 RECALL로 Safe Zone에 귀환하세요.\n5초 캐스팅 중 맞으면 취소되니 안전할 때!\n전설이라도 후퇴는 전략입니다. 아이템과 DATA는 챙겨 드릴게요.",
      continueLabel: "MOVE OUT",
      placement: "top",
      target: () => this.getElementRect("#recall-btn"),
    });
    if (recallResult === "skip") return;

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
        "PAGE가 끝날 때까지 코어를 지켜요!\n배너의 진행바가 가득 차면 점령 명령이 열립니다.\n급하시면 SKIP PAGE로 다음 페이지를 바로 부를 수도 있어요.",
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
        ">>> CONQUER THIS SECTOR <<< 가 열렸어요!\n누르는 순간 침입 퍼즐과 강화 방어전이 동시에 시작됩니다.\n자, 보여주세요. 전설의 실력!",
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
      title: "BREACH RULES",
      body:
        "점령 조건은 두 가지! 둘 다 만족해야 해요.\n1. 침입 퍼즐에서 목표 3줄 클리어\n2. 미니 방어 화면의 코어가 강화 PAGE 3개 생존",
      continueLabel: "NEXT",
      placement: "center",
      elevated: true,
      target: null,
    });
    if (rulesResult === "skip") return;

    const isMobileBreach = this.usesTouch();
    const controlResult = await this.showModal({
      speaker: "PDX-01",
      title: "DUAL SURVIVAL",
      body:
        "줄을 지우면 방어전의 적에게 넉백/피해가 들어가요!\n" +
        (isMobileBreach
          ? "조작: 좌/우 버튼, DROP(하드 드롭), NEXT BLOCK으로 다음 블록 교체."
          : "조작: ←→ 이동, ↑ 회전, ↓ 소프트 드롭, Space 하드 드롭.\nNEXT BLOCK 버튼으로 다음 블록을 고를 수도 있어요."),
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

  showPageEventHintOnce(type) {
    const hints = {
      RUSH: {
        topic: "page-event-rush",
        title: "RUSH PAGE",
        body: "어어, 많이 와요!! 평소의 2배!\n대신 처치 DATA도 2배예요. 버텨요, 해커님!",
      },
      CARRIER: {
        topic: "page-event-carrier",
        title: "CARRIER 출현",
        body: "저 황금색! 공격은 안 하지만 곧 도망가요.\n도주 전에 격추하면 DATA 캐시가 두둑합니다!",
      },
      SUPPLY: {
        topic: "page-event-supply",
        title: "SUPPLY DROP",
        body: "보급이 떨어졌어요! 누가 보냈는지는... 묻지 마세요.\n수집 바이러스가 알아서 주워 올 거예요.",
      },
    };
    const hint = hints[type];
    if (!hint) return;
    this.tryShowTopicToast(hint.topic, {
      speaker: "PDX-01",
      title: hint.title,
      body: hint.body,
    }, 4200);
  }

  // 보스 스테이지 첫 진입 시 침입 게이지/보스 패턴 브리핑
  async showBossBriefingOnce() {
    if (this.hasSeenTopic("boss-briefing")) return;
    if (this.pendingResolve) return;
    this.markTopicSeen("boss-briefing");

    this.pauseDefense();

    const gaugeResult = await this.showModal({
      speaker: "PDX-01",
      title: "BOSS PROTOCOL — CORE NEXUS",
      body:
        "...해커님. 여기부터는 농담을 조금 줄일게요.\n저 안에 있는 건 제가 아는 가장 오래된 시스템이에요.\n실드를 끄면 침입 게이지가 1.5배로 차고, 처치는 보너스 충전.\n단, 코어가 피격되면 게이지가 깎입니다.",
      continueLabel: "NEXT",
      hideSkip: true,
      placement: "center",
      target: null,
    });
    if (gaugeResult !== "skip") {
      await this.showModal({
        speaker: "PDX-01",
        title: "BOSS BREACH & PHASES",
        body:
          "게이지 100% → 침입 퍼즐로 보스 HP를 직접 깎습니다.\n페이즈마다 강해져요: 탄막 링(틈새로 회피!), 증원 소환,\n조준 사격. 퍼즐 중에도 방해가 들어옵니다.\n...이기고 돌아와 주세요. 꼭.",
      continueLabel: "ENGAGE",
        hideSkip: true,
        placement: "center",
        target: null,
      });
    }

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
        `괜찮아요. DATA 70%는 잃었지만, 당신은 무사하니까요.\n${lossLine}${remainingLine}` +
        "REBOOT 후 /inventory와 /upgrade를 점검하고 /map으로 재출격!\n...이번에는, 잃지 않을 거예요.",
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
