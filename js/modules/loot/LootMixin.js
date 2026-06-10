// Loot system methods (extracted from GameManager)
// Item drops, blueprints, decryption, loot selection
// Applied as mixin to preserve `this` context

export function applyLootMixin(GameManagerClass) {
  const proto = GameManagerClass.prototype;

  /**
   * 테트리스 줄 클리어 시 아이템 드롭 (시각적 드롭 없이 바로 인벤토리에 추가)
   * @param {number} lineNum - 클리어한 줄 수
   */
  proto.tryTetrisItemDrop = function(lineNum) {
    // 디버그 드롭률이 설정되어 있으면 사용, 아니면 줄당 10%
    let dropChance = this.debugItemDropRate !== null
      ? this.debugItemDropRate
      : 0.10 * lineNum;

    // 장착 아이템 효과로 드롭률 증가 (디버그 모드가 아닐 때만)
    if (this.debugItemDropRate === null) {
      const effects = this.inventoryManager.getEquippedEffects();
      dropChance += effects.dropRate;
    }

    // 확률 체크
    if (Math.random() > dropChance) return;

    // 아이템 생성
    const item = this.itemDatabase.generateRandomItem();

    debugLog("GameManager", `테트리스 아이템 드롭! ${item.name}`);

    // 현재 스테이지 획득 목록에 추가

    // 해금 조각(fragment)은 별도 처리
    if (item.type === "fragment") {
      this.processDecryption(item);
      this.showItemDropNotification(item);
      return;
    }

    // 일반 아이템만 획득 목록에 추가
    this.collectedItemsThisStage.push(item);

    // 인벤토리에 바로 추가
    const result = this.inventoryManager.addToInventory(item);

    if (result.success) {
      this.showItemDropNotification(item);
    } else {
      this.showItemDropNotification(item, true);
    }
  }

  /**
   * 보급 페이지: 코어 주변 필드에 아이템 2개를 확정 투하
   * (수집 바이러스가 자동 회수)
   */
  proto.handleSupplyDrop = function() {
    if (!this.defenseGame || this.activeMode !== "defense") return;
    const core = this.defenseGame.core;
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (core.shieldRadius || 100) + 80 + Math.random() * 120;
      const item = this.itemDatabase.generateRandomItem();
      this.defenseGame.spawnDroppedItem(
        core.x + Math.cos(angle) * dist,
        core.y + Math.sin(angle) * dist,
        item
      );
    }
  }

  /**
   * 아이템 드롭 시도 (디펜스 모드 - 적 위치에 시각적 드롭)
   * @param {number} x - 드롭 위치 X
   * @param {number} y - 드롭 위치 Y
   * @param {string} source - 'defense' 또는 'tetris'
   */
  proto.tryItemDrop = function(x, y, source) {
    // === 1. 일반 아이템 드롭 ===
    // 디버그 드롭률이 설정되어 있으면 사용, 아니면 기본값 5%
    const stageId = this.defenseGame?.currentStageId || 0;
    const stageDropBonus = Math.min(0.08, stageId * 0.003);
    let dropChance = this.debugItemDropRate !== null ? this.debugItemDropRate : 0.05 + stageDropBonus;

    // 장착 아이템 효과로 드롭률 증가 (디버그 모드가 아닐 때만)
    if (this.debugItemDropRate === null) {
      const effects = this.inventoryManager.getEquippedEffects();
      dropChance += effects.dropRate;
    }

    // 일반 아이템 드롭 확률 체크
    if (Math.random() <= dropChance) {
      const item = this.itemDatabase.generateRandomItem();
      debugLog("GameManager", `아이템 드롭! ${item.name} at (${x}, ${y})`);

      if (this.defenseGame && this.activeMode === "defense") {
        this.defenseGame.spawnDroppedItem(x, y, item);
      }
    }

    // === 2. 블루프린트 드롭 (별도 확률) ===
    const bpStageBonus = Math.min(0.12, stageId * 0.004);
    const bpDropChance = this.debugBlueprintDropRate !== null
      ? this.debugBlueprintDropRate
      : 0.10 + bpStageBonus;

    if (Math.random() <= bpDropChance) {
      // 해금 대상이 남아있는지 확인
      const allTargets = [...this.virusUnlockTargets, ...this.weaponUnlockTargets];
      const lockedTargets = allTargets.filter(t => {
        if (this.virusUnlockTargets.includes(t)) return !this.isVirusUnlocked(t);
        if (this.weaponUnlockTargets.includes(t)) return !this.isWeaponUnlocked(t);
        return false;
      });

      if (lockedTargets.length === 0) return; // 모두 해금됨

      // 블루프린트 아이템 생성 (디버그 증가량 적용)
      const blueprintItem = this.itemDatabase.generateBlueprintItem(this.debugBlueprintAmount);

      debugLog("GameManager", `블루프린트 드롭! ${blueprintItem.name} (+${blueprintItem.effect.value}%) at (${x}, ${y})`);

      // 일반 아이템과 동일하게 바닥에 드롭 (아군이 수집)
      if (this.defenseGame && this.activeMode === "defense") {
        this.defenseGame.spawnDroppedItem(x, y, blueprintItem);
      }
    }
  }

  /**
   * 블루프린트 드롭 이펙트 표시
   */
  proto.showBlueprintDropEffect = function(x, y, amount) {
    if (!this.defenseGame || !this.defenseGame.canvas) return;

    const canvas = this.defenseGame.canvas;
    const rect = canvas.getBoundingClientRect();

    // 캔버스 좌표를 화면 좌표로 변환
    const screenX = rect.left + (x / this.defenseGame.width) * rect.width;
    const screenY = rect.top + (y / this.defenseGame.height) * rect.height;

    const effect = document.createElement("div");
    effect.style.cssText = `
      position: fixed;
      left: ${screenX}px;
      top: ${screenY}px;
      color: #00ffff;
      font-family: var(--term-font);
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 0 10px #00ffff;
      pointer-events: none;
      z-index: 9999;
      animation: blueprintFloat 1s ease-out forwards;
    `;
    effect.innerText = `🔓+${amount}%`;

    // 애니메이션 스타일 추가 (한 번만)
    if (!document.getElementById("blueprint-effect-style")) {
      const style = document.createElement("style");
      style.id = "blueprint-effect-style";
      style.textContent = `
        @keyframes blueprintFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-30px) scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 1000);
  }

  /**
   * 아이템 수집 완료 처리 (수집 바이러스가 코어에 도착했을 때)
   * 인벤토리에 바로 넣지 않고, 스테이지 끝날 때 선택하도록 저장만 함
   */

  /**
   * 데이터 조각 처리 (해금 진행률 증가)
   * - 모든 스테이지에서 모든 해금 대상 드랍 가능
   * - 특정 스테이지에서는 특정 대상의 확률이 높음 (70% 스테이지 타겟, 30% 랜덤)
   */
  proto.processDecryption = function(item) {
    // 모든 해금 대상 (바이러스 + 무기)
    const allTargets = [...this.virusUnlockTargets, ...this.weaponUnlockTargets];

    // 아직 해금되지 않은 타겟만 필터링
    const lockedTargets = allTargets.filter(t => {
      const isVirus = this.virusUnlockTargets.includes(t);
      const isWeapon = this.weaponUnlockTargets.includes(t);
      if (isVirus) return !this.isVirusUnlocked(t);
      if (isWeapon) return !this.isWeaponUnlocked(t);
      return false;
    });

    if (lockedTargets.length === 0) {
      // 모두 해금됨 - 자원으로 변환
      const stageId = this.defenseGame?.currentStageId || 0;
      const rewardScale = this.getStageRewardScale(stageId);
      const dataAmount = Math.max(1, Math.round((item.effect.value || 1) * 10 * rewardScale));
      this.currentMoney += dataAmount;
      this.saveMoney();
      this.terminal.updateData(this.currentMoney);
      debugLog("Item", `All targets unlocked, converted to ${dataAmount} DATA`);
      return null; // 타겟 없음 (DATA로 변환됨)
    }

    // 현재 스테이지의 보너스 타겟 확인
    const stageId = this.defenseGame.currentStageId || 0;
    const bonusTargets = this.stageUnlockTargets[stageId] || [];
    const lockedBonusTargets = bonusTargets.filter(t => lockedTargets.includes(t));

    // 타겟 선택: 70% 스테이지 보너스 타겟, 30% 전체 랜덤
    let target;
    if (lockedBonusTargets.length > 0 && Math.random() < 0.7) {
      // 스테이지 보너스 타겟 중 랜덤
      target = lockedBonusTargets[Math.floor(Math.random() * lockedBonusTargets.length)];
    } else {
      // 전체 잠긴 타겟 중 랜덤
      target = lockedTargets[Math.floor(Math.random() * lockedTargets.length)];
    }

    // 진행률 증가
    const amount = item.effect.value || 1;
    if (!this.decryptionProgress[target]) this.decryptionProgress[target] = 0;

    const oldProgress = this.decryptionProgress[target];
    this.decryptionProgress[target] = Math.min(100, oldProgress + amount);

    this.saveDecryptionProgress();

    debugLog("Item", `${target}: ${oldProgress}% -> ${this.decryptionProgress[target]}% (Stage ${stageId} bonus: ${bonusTargets.join(', ')})`);

    // 해금 달성 체크
    if (oldProgress < 100 && this.decryptionProgress[target] >= 100) {
      this.terminal.printSystemMessage(`ACCESS GRANTED: ${target} BLUEPRINT DECRYPTED!`);
      this.showNotification(`🔓 ${target} UNLOCKED!`, "#00ff00");
    }

    // 적용된 타겟 반환
    return target;
  }

  proto.handleItemCollected = function(item) {
    debugLog("GameManager", `아이템 수집됨: ${item.name}`);

    // 블루프린트 아이템인 경우 별도 처리 (즉시 해금 진행률 반영)
    if (item.effect && item.effect.type === "blueprint") {
      const target = this.processDecryption(item);
      this.showBlueprintCollectedNotification(item, target);
      return; // 인벤토리에 추가하지 않음
    }

    // 일반 아이템: 현재 스테이지 획득 목록에 추가 (인벤토리에 바로 안 넣음)
    this.collectedItemsThisStage.push(item);

    // 획득 알림 표시 (수집됨 표시)
    this.showItemDropNotification(item);
  }

  /**
   * 블루프린트 수집 알림 표시 (상단에 표시)
   * @param {object} item - 블루프린트 아이템
   * @param {string} target - 적용된 해금 타겟 (예: "SNIPER", "TANK")
   */
  proto.showBlueprintCollectedNotification = function(item, target) {
    const existing = document.getElementById("blueprint-notification");
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.id = "blueprint-notification";
    notification.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 50, 80, 0.95);
      border: 2px solid #00ffff;
      color: #00ffff;
      padding: 10px 20px;
      font-family: var(--term-font);
      font-size: 14px;
      z-index: 9999;
      border-radius: 5px;
      text-shadow: 0 0 10px #00ffff;
      animation: blueprintNotifAnim 2.5s ease-out forwards;
    `;

    // 모든 해금 완료 시 (target이 null)
    if (!target) {
      const stageId = this.defenseGame?.currentStageId || 0;
      const rewardScale = this.getStageRewardScale(stageId);
      const dataAmount = Math.max(1, Math.round((item.effect.value || 1) * 10 * rewardScale));
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">${item.icon}</span>
          <span style="color: #aaaaaa;">ALL UNLOCKED</span>
          <span style="color: #ffcc00;">→ +${dataAmount} DATA</span>
        </div>
        <div style="margin-top: 6px; font-size: 12px; color: #888;">
          Blueprint converted to resources
        </div>
      `;
    } else {
      // 타겟 타입 확인 (바이러스 vs 무기)
      const isVirus = this.virusUnlockTargets.includes(target);
      const typeLabel = isVirus ? "🦠" : "🔫";
      const currentProgress = this.decryptionProgress[target] || 0;

      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">${item.icon}</span>
          <span style="color: #ffcc00; font-weight: bold;">${typeLabel} ${target}</span>
          <span style="color: #00ff00;">+${item.effect.value}%</span>
        </div>
        <div style="margin-top: 6px; font-size: 12px; color: #aaa;">
          Progress: <span style="color: ${currentProgress >= 100 ? '#00ff00' : '#00ffff'};">${Math.min(100, currentProgress)}%</span>
          ${currentProgress >= 100 ? ' <span style="color: #00ff00;">✓ UNLOCKED</span>' : ''}
        </div>
      `;
    }

    // 애니메이션 스타일 추가 (한 번만)
    if (!document.getElementById("blueprint-notif-style")) {
      const style = document.createElement("style");
      style.id = "blueprint-notif-style";
      style.textContent = `
        @keyframes blueprintNotifAnim {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  }

  /**
   * 아이템 획득 알림 표시
   */
  proto.showItemDropNotification = function(item, inventoryFull = false) {
    // 기존 알림 제거
    const existing = document.getElementById("item-drop-notification");
    if (existing) existing.remove();

    const color = this.itemDatabase.getRarityColor(item.rarity);

    const notification = document.createElement("div");
    notification.id = "item-drop-notification";
    notification.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid ${color};
      padding: 15px 25px;
      border-radius: 8px;
      z-index: 99999;
      text-align: center;
      animation: itemPopIn 0.3s ease-out;
      box-shadow: 0 0 20px ${color}40;
    `;

    notification.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 5px;">${item.icon}</div>
      <div style="color: ${color}; font-weight: bold; font-size: 14px;">${item.name}</div>
      <div style="color: #888; font-size: 11px; margin-top: 3px;">
        ${inventoryFull ? "⚠️ 인벤토리 가득참!" : item.description}
      </div>
    `;

    // 애니메이션 스타일 추가
    if (!document.getElementById("item-notification-style")) {
      const style = document.createElement("style");
      style.id = "item-notification-style";
      style.textContent = `
        @keyframes itemPopIn {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          70% { transform: translateX(-50%) scale(1.1); }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes itemFadeOut {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // 2초 후 페이드아웃
    setTimeout(() => {
      notification.style.animation = "itemFadeOut 0.3s ease-in forwards";
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * 스테이지 클리어 시 아이템 선택 화면
   * 획득한 아이템 중 인벤토리에 넣을 것을 선택
   * @returns {Promise} 선택 완료 시 resolve
   */
  proto.showLootSummary = async function() {
    // 획득한 아이템이 없으면 스킵
    if (this.collectedItemsThisStage.length === 0) return;

    // 선택 화면으로 이동 (완료될 때까지 대기)
    await this.showLootSelectionScreen();
  }

  /**
   * 아이템 선택 화면 (인벤토리에 넣을 아이템 선택)
   * @returns {Promise} 선택 완료 시 resolve
   */
  proto.showLootSelectionScreen = function() {
    return new Promise((resolve) => {
      const lootItems = [...this.collectedItemsThisStage]; // 복사본
      const inventoryData = this.inventoryManager.getData();

      // Promise resolve를 저장 (버튼 클릭 시 호출)
      this._lootSelectionResolve = resolve;

      const overlay = document.createElement("div");
      overlay.id = "loot-selection-overlay";
      overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 99998;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
      font-family: var(--term-font);
    `;

      // 선택 상태 추적
      let selectedLootIndex = null;

      const render = () => {
        const invData = this.inventoryManager.getData();
        const emptySlots = invData.inventory.filter(s => s === null).length;

        overlay.innerHTML = `
        <div style="color: #ffaa00; font-size: 20px; font-weight: bold; margin-bottom: 10px; text-shadow: 0 0 10px #ffaa00;">
          📦 LOOT ACQUIRED (${lootItems.length}개)
        </div>
        <div style="color: #888; font-size: 11px; margin-bottom: 15px;">
          아이템을 클릭해서 인벤토리에 추가 | 인벤토리 빈칸: ${emptySlots}/20
        </div>
        
        <div id="loot-items-container" style="
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          max-width: 400px;
          padding: 15px;
          border: 2px solid #ffaa00;
          background: rgba(50, 30, 0, 0.3);
          margin-bottom: 15px;
          min-height: 60px;
        "></div>
        
        <div style="color: #00ff00; font-size: 14px; margin: 10px 0;">
          YOUR INVENTORY
        </div>
        
        <div id="inventory-grid" style="
          display: grid;
          grid-template-columns: repeat(10, 40px);
          gap: 4px;
          padding: 10px;
          border: 2px solid #00ff00;
          background: rgba(0, 30, 0, 0.3);
          margin-bottom: 15px;
        "></div>
        
        <div id="data-conversion-info" style="
          color: #888;
          font-size: 11px;
          margin-bottom: 15px;
          text-align: center;
        "></div>
        
        <button id="confirm-loot-btn" style="
          padding: 12px 40px;
          background: rgba(0, 100, 0, 0.5);
          border: 2px solid #00ff00;
          color: #00ff00;
          font-family: var(--term-font);
          font-size: 14px;
          cursor: pointer;
        ">[ CONFIRM ]</button>
      `;

        // 획득 아이템 렌더링
        const lootContainer = overlay.querySelector("#loot-items-container");
        lootItems.forEach((item, idx) => {
          const color = this.itemDatabase.getRarityColor(item.rarity);
          const dataValue = this.itemDatabase.getItemDataValue(item);

          const itemEl = document.createElement("div");
          itemEl.style.cssText = `
          width: 45px;
          height: 55px;
          border: 2px solid ${color};
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 5px;
          ${selectedLootIndex === idx ? 'box-shadow: 0 0 15px ' + color + '; transform: scale(1.1);' : ''}
        `;
          itemEl.innerHTML = `
          <div style="font-size: 18px;">${item.icon}</div>
          <div style="font-size: 6px; color: ${color}; text-align: center;">${item.name.split(' ')[0]}</div>
          <div style="font-size: 7px; color: #888;">+${dataValue}</div>
        `;

          itemEl.onclick = () => {
            // 인벤토리에 빈 공간이 있으면 바로 추가
            const result = this.inventoryManager.addToInventory(item);
            if (result.success) {
              lootItems.splice(idx, 1);
              this.showNotification(`${item.name} 추가됨!`, color);
              render();
            } else {
              // 빈 공간 없으면 선택 상태로
              selectedLootIndex = idx;
              this.showNotification("인벤토리에서 교체할 아이템 선택", "#ffaa00");
              render();
            }
          };

          lootContainer.appendChild(itemEl);
        });

        if (lootItems.length === 0) {
          lootContainer.innerHTML = '<div style="color: #666;">모든 아이템을 인벤토리에 추가했습니다</div>';
        }

        // 인벤토리 렌더링
        const invGrid = overlay.querySelector("#inventory-grid");
        invData.inventory.forEach((item, idx) => {
          const slot = document.createElement("div");
          const color = item ? this.itemDatabase.getRarityColor(item.rarity) : "#333";

          slot.style.cssText = `
          width: 40px;
          height: 40px;
          border: 1px solid ${color};
          background: ${item ? 'rgba(0, 50, 30, 0.5)' : 'rgba(0, 0, 0, 0.3)'};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: ${item ? 'pointer' : 'default'};
          transition: all 0.2s;
          border-radius: 3px;
        `;

          if (item) {
            slot.innerHTML = `
            <div style="font-size: 14px;">${item.icon}</div>
            <div style="font-size: 5px; color: ${color};">${item.name.split(' ')[0]}</div>
          `;

            slot.onclick = () => {
              if (selectedLootIndex !== null) {
                // 선택된 루트 아이템과 교체
                const lootItem = lootItems[selectedLootIndex];
                const oldItem = this.inventoryManager.inventory[idx];

                // 교체
                this.inventoryManager.inventory[idx] = lootItem;
                this.inventoryManager.saveState();

                // 기존 아이템은 루트 목록으로
                lootItems.splice(selectedLootIndex, 1, oldItem);

                selectedLootIndex = null;
                this.showNotification(`${lootItem.name} ↔ ${oldItem.name} 교체!`, "#00ff00");
                render();
              }
            };
          }

          invGrid.appendChild(slot);
        });

        // DATA 변환 정보 표시
        if (lootItems.length > 0) {
          let totalData = 0;
          lootItems.forEach(item => {
            totalData += this.itemDatabase.getItemDataValue(item);
          });

          const stageId = this.defenseGame?.currentStageId || 0;
          const rewardScale = this.getStageRewardScale(stageId);
          const scaledTotal = Math.max(0, Math.round(totalData * rewardScale));
          const infoEl = overlay.querySelector("#data-conversion-info");
          infoEl.innerHTML = `⚠️ 남은 ${lootItems.length}개 아이템은 <span style="color: #ffaa00;">${scaledTotal} DATA</span>로 자동 변환됩니다`;
        }

        // 확인 버튼
        overlay.querySelector("#confirm-loot-btn").onclick = () => {
          this.finalizeLootSelection(lootItems, overlay);
        };
      };

      document.body.appendChild(overlay);
      render();
    }); // Promise 닫기
  }

  /**
   * 루트 선택 완료 - 남은 아이템 DATA로 변환
   */
  proto.finalizeLootSelection = function(remainingItems, overlay) {
    let totalData = 0;

    remainingItems.forEach(item => {
      totalData += this.itemDatabase.getItemDataValue(item);
    });

    if (totalData > 0) {
      const stageId = this.defenseGame?.currentStageId || 0;
      const rewardScale = this.getStageRewardScale(stageId);
      const scaledTotal = Math.max(1, Math.round(totalData * rewardScale));
      this.currentMoney += scaledTotal;
      this.saveMoney();
      this.terminal.updateData(this.currentMoney);

      this.showNotification(`${remainingItems.length}개 아이템 → ${scaledTotal} DATA 변환!`, "#ffaa00");
    }

    // 획득 목록 초기화
    this.collectedItemsThisStage = [];

    // 오버레이 제거
    overlay.style.animation = "fadeOut 0.3s ease-in forwards";
    setTimeout(() => {
      overlay.remove();
      // Promise resolve 호출 (화면이 완전히 닫힌 후)
      if (this._lootSelectionResolve) {
        this._lootSelectionResolve();
        this._lootSelectionResolve = null;
      }
    }, 300);
  }

}
