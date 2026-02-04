// Persistence methods (extracted from GameManager)
// Save/load localStorage state, upgrades, money, mining, reputation
// Applied as mixin to preserve `this` context

export function applyPersistenceMixin(GameManagerClass) {
  const proto = GameManagerClass.prototype;

  proto.handleResetProgress = async function() {
    // 확인 메시지 표시
    await this.terminal.printSystemMessage(
      "⚠️ WARNING: This will reset ALL progress!"
    );
    await this.terminal.printSystemMessage("- Conquered stages");
    await this.terminal.printSystemMessage("- Saved DATA (money)");
    await this.terminal.printSystemMessage("- Tutorial completion");

    const confirmChoice = await this.terminal.showChoices([
      { text: "YES - Delete everything", value: "confirm", style: "danger" },
      { text: "NO - Cancel", value: "cancel" },
    ]);

    if (confirmChoice === "confirm") {
      // 모든 localStorage 초기화
      localStorage.clear();

      // StageManager 점령 상태 초기화
      if (this.stageManager) {
        this.stageManager.stages.forEach((stage) => {
          stage.conquered = false;
        });
      }

      // ConquestManager 초기화
      if (this.conquestManager) {
        this.conquestManager.conqueredStages = [];
      }

      // MiningManager 초기화
      if (this.miningManager) {
        this.miningManager.territories = {};
        this.miningManager.cabinet.storedData = 0;
      }

      // 현재 상태 초기화
      this.currentMoney = 0;
      this.reputation = 0;

      await this.terminal.printSystemMessage("ALL PROGRESS RESET!");
      await this.terminal.printSystemMessage(
        "Reloading system in 2 seconds..."
      );

      // 2초 후 새로고침
      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      await this.terminal.printSystemMessage("Reset cancelled.");
      await this.showCommandMenu();
    }
  }

  // 선택지 강제 갱신 (점령 가능 상태 변경 시)
  proto.loadPermanentPerks = function() {
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
            ids.forEach((id) => {
              this.acquiredPermPerks.set(id, 1);
            });
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

  proto.savePermanentPerks = function() {
    const obj = Object.fromEntries(this.acquiredPermPerks);
    localStorage.setItem("acquired_perm_perks_v2", JSON.stringify(obj));
  }

  proto.loadReputation = function() {
    const saved = localStorage.getItem("hacker_reputation");
    if (saved) {
      this.reputation = parseInt(saved, 10);
    }
  }

  proto.saveReputation = function() {
    localStorage.setItem("hacker_reputation", this.reputation.toString());
  }

  proto.saveUpgrades = function() {
    try {
      const payload = JSON.stringify(this.upgradeLevels);
      localStorage.setItem("cylinderTetris_upgrades", payload);
      debugLog("GameManager", "✓ Upgrades saved");
    } catch (e) {
      console.warn("[GameManager] Failed to save upgrades:", e);
    }
  }

  /**
   * localStorage에서 업그레이드 레벨 로드
   */
  proto.loadUpgrades = function() {
    try {
      const saved = localStorage.getItem("cylinderTetris_upgrades");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.upgradeLevels = this.sanitizeUpgrades(parsed);
        debugLog("GameManager", "✓ Upgrades loaded:", this.upgradeLevels);
        return;
      }
    } catch (e) {
      console.warn("[GameManager] Failed to load upgrades:", e);
    }
    // 실패 시 기본값 사용
    this.upgradeLevels = this.getDefaultUpgrades();
  }

  /**
   * 아군 설정을 localStorage에 저장
   */
  proto.saveAllyConfig = function() {
    try {
      const payload = JSON.stringify(this.allyConfig);
      localStorage.setItem("cylinderTetris_allyConfig", payload);
      debugLog("GameManager", "✓ Ally config saved:", this.allyConfig);
    } catch (e) {
      console.warn("[GameManager] Failed to save ally config:", e);
    }
  }

  /**
   * localStorage에서 아군 설정 로드
   */
  proto.loadAllyConfig = function() {
    try {
      const saved = localStorage.getItem("cylinderTetris_allyConfig");
      if (saved) {
        const parsed = JSON.parse(saved);
        // 유효성 검증
        if (parsed && typeof parsed === "object") {
          if (parsed.mainType && this.virusTypes[parsed.mainType]) {
            this.allyConfig.mainType = parsed.mainType;
          }
          if (parsed.subType === null || this.virusTypes[parsed.subType]) {
            this.allyConfig.subType = parsed.subType;
          }
          debugLog("GameManager", "✓ Ally config loaded:", this.allyConfig);
          return;
        }
      }
    } catch (e) {
      console.warn("[GameManager] Failed to load ally config:", e);
    }
    // 실패 시 기본값 유지
  }

  /**
   * 자원을 localStorage에 저장
   */

  proto.saveDecryptionProgress = function() {
    try {
      localStorage.setItem("cylinderTetris_decryption", JSON.stringify(this.decryptionProgress));
    } catch (e) { }
  }

  proto.loadDecryptionProgress = function() {
    try {
      const saved = localStorage.getItem("cylinderTetris_decryption");
      if (saved) this.decryptionProgress = JSON.parse(saved);
    } catch (e) { }
  }

  proto.saveMoney = function() {
    try {
      // 0으로 저장되는 경우 스택 트레이스 출력 (문제 추적용)
      if (this.currentMoney === 0) {
        console.warn(`[GameManager] ⚠️ Saving 0! Stack trace:`);
        console.trace();
      } else {
        debugLog("GameManager", `Saving money: ${this.currentMoney}`);
      }
      localStorage.setItem(
        "cylinderTetris_money",
        this.currentMoney.toString()
      );
      // 저장 확인
      const verify = localStorage.getItem("cylinderTetris_money");
      debugLog("GameManager", `✓ Verified saved: ${verify}`);
    } catch (e) {
      console.warn("Failed to save money to localStorage:", e);
    }
  }

  /**
   * localStorage에서 자원 로드
   */
  proto.loadSavedMoney = function() {
    try {
      const saved = localStorage.getItem("cylinderTetris_money");
      debugLog("GameManager", `Raw localStorage value: "${saved}"`);
      if (saved !== null) {
        const amount = parseInt(saved, 10);
        if (!isNaN(amount) && amount >= 0) {
          debugLog("GameManager", `✓ Loaded saved money: ${amount}`);
          return amount;
        } else {
          console.warn(`[GameManager] Invalid saved value: ${saved} -> parsed: ${amount}`);
        }
      } else {
        debugLog("GameManager", `No saved money found (key: cylinderTetris_money)`);
      }
    } catch (e) {
      console.warn("Failed to load money from localStorage:", e);
    }
    return 0; // 저장된 값이 없으면 0
  }

  /**
   * 자원 추가 (자동 저장)
   */
  proto.saveMiningData = function() {
    try {
      localStorage.setItem(
        "cylinderTetris_mining",
        JSON.stringify(this.miningManager.saveData())
      );
    } catch (e) {
      console.warn("Failed to save mining data:", e);
    }
  }

  proto.loadMiningData = function() {
    try {
      const saved = localStorage.getItem("cylinderTetris_mining");
      if (saved) {
        this.miningManager.loadData(JSON.parse(saved));
      }
      const added = this.reconcileMiningTerritories();
      if (added > 0) {
        this.saveMiningData();
      }
      this.deferMiningSceneSync();
    } catch (e) {
      console.warn("Failed to load mining data:", e);
    }
  }


}
