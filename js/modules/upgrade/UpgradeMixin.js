// Upgrade system methods (extracted from GameManager)
// Applied as mixin to preserve `this` context

export function applyUpgradeMixin(GameManagerClass) {
  const proto = GameManagerClass.prototype;

  proto.showUpgrades = async function() {
    this.defenseGame.pause();

    // 터미널 애니메이션 (오버레이 유지)
    const bgOverlay = await this.playTerminalAnimation(
      "LOADING UPGRADE TERMINAL...",
      true
    );

    this.showUpgradeCategories(bgOverlay);
  };

  proto.showUpgradeCategories = function(overlay) {
    // 오버레이 초기화
    overlay.innerHTML = "";
    overlay.id = "upgrade-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 3000;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
    `;

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #ffcc00;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 15px;
      text-shadow: 0 0 10px #ffcc00;
    `;
    header.innerText = "[ SYSTEM UPGRADES ]";
    overlay.appendChild(header);

    // 현재 DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 20px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 카테고리 그리드 (2x2)
    const categoryGrid = document.createElement("div");
    categoryGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      width: 100%;
      max-width: 350px;
      margin-bottom: 20px;
    `;

    // 카테고리 정의
    const categories = [
      {
        id: "core",
        name: "CORE",
        icon: "⚡",
        color: "#00ffff",
        desc: "코어 HP, 수동 발사",
      },
      {
        id: "helper",
        name: "HELPER",
        icon: "🔫",
        color: "#ffff00",
        desc: "조력자 공격력, 속도",
      },
      {
        id: "ally",
        name: "ALLY",
        icon: "🦠",
        color: "#00aaff",
        desc: "아군 바이러스",
      },
      {
        id: "shield",
        name: "SHIELD",
        icon: "🛡️",
        color: "#00ff88",
        desc: "실드 HP, 충전",
      },
    ];

    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.style.cssText = `
        background: rgba(0, 30, 0, 0.8);
        border: 2px solid ${cat.color};
        color: ${cat.color};
        padding: 20px 15px;
        font-family: var(--term-font);
        font-size: 14px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      `;

      btn.innerHTML = `
        <div style="font-size: 28px; margin-bottom: 8px;">${cat.icon}</div>
        <div style="font-weight: bold;">${cat.name}</div>
        <div style="font-size: 10px; color: #888; margin-top: 5px;">${cat.desc}</div>
      `;

      btn.onmouseenter = () => {
        btn.style.background = `rgba(0, 80, 40, 0.8)`;
        btn.style.boxShadow = `0 0 15px ${cat.color}`;
      };
      btn.onmouseleave = () => {
        btn.style.background = `rgba(0, 30, 0, 0.8)`;
        btn.style.boxShadow = `none`;
      };

      btn.onclick = () => {
        if (cat.id === "helper") {
          this.showHelperUpgrades(overlay);
        } else if (cat.id === "core") {
          this.showCoreUpgrades(overlay);
        } else if (cat.id === "ally") {
          this.showAllyUpgrades(overlay);
        } else if (cat.id === "shield") {
          this.showShieldUpgrades(overlay);
        }
      };

      categoryGrid.appendChild(btn);
    });

    overlay.appendChild(categoryGrid);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      margin-top: 10px;
      background: transparent;
      border: 1px solid #ff6666;
      color: #ff6666;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.innerText = "[CLOSE]";
    closeBtn.onclick = () => {
      overlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    overlay.appendChild(closeBtn);
  };

  proto.showHelperUpgrades = function(overlay) {
    overlay.innerHTML = "";

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #ffff00;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #ffff00;
    `;
    header.innerText = "[ HELPER UPGRADES ]";
    overlay.appendChild(header);

    // ===== 무기 모드 탭 (상단) =====
    const weaponTabContainer = document.createElement("div");
    weaponTabContainer.style.cssText = `
      display: flex;
      gap: 5px;
      margin-bottom: 15px;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
      max-width: 350px;
    `;

    const weaponModes = this.defenseGame.weaponModes;
    const currentMode = this.defenseGame.helper.weaponMode;

    Object.keys(weaponModes).forEach((modeName) => {
      const mode = weaponModes[modeName];
      const isActive = modeName === currentMode;
      const isLocked = !this.isWeaponUnlocked(modeName);
      const unlockProgress = this.decryptionProgress[modeName] || 0;
      const unlockStage = this.getUnlockStageName(modeName);

      const tab = document.createElement("button");

      if (isLocked) {
        // 잠긴 무기 스타일 (진행률에 따라 아이콘이 왼→오로 채워짐)
        const progress = Math.min(100, unlockProgress);
        const clipRight = 100 - progress;

        tab.style.cssText = `
          padding: 8px 12px;
          font-family: var(--term-font);
          font-size: 12px;
          cursor: not-allowed;
          border: 2px solid #333;
          background: rgba(20, 20, 20, 0.9);
          transition: all 0.2s;
          min-width: 60px;
          position: relative;
          overflow: hidden;
        `;

        tab.innerHTML = `
          <div style="position: relative; width: 100%; height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <!-- 어두운 아이콘 (배경) -->
            <div style="position: absolute; top: 2px; font-size: 18px; filter: grayscale(100%) brightness(0.3);">${mode.icon}</div>
            <!-- 밝은 아이콘 (진행률만큼 clip) -->
            <div style="position: absolute; top: 2px; font-size: 18px; clip-path: inset(0 ${clipRight}% 0 0); filter: drop-shadow(0 0 4px ${mode.color});">${mode.icon}</div>
            <!-- 진행률 텍스트 -->
            <div style="position: absolute; bottom: 0; font-size: 9px; color: ${progress >= 100 ? '#00ff00' : '#00aaff'}; text-shadow: 0 0 3px #000;">
              ${progress >= 100 ? '✓ READY' : progress + '%'}
            </div>
            <!-- 잠금 표시 (진행률 낮을 때만) -->
            ${progress < 30 ? '<div style="position: absolute; top: 0; right: 0; font-size: 10px;">🔒</div>' : ''}
          </div>
        `;
      } else {
        // 해금된 무기 스타일
        tab.style.cssText = `
          padding: 8px 12px;
          font-family: var(--term-font);
          font-size: 12px;
          cursor: pointer;
          border: 2px solid ${isActive ? mode.color : "#555"};
          background: ${isActive
            ? `rgba(${this.hexToRgb(mode.color)}, 0.3)`
            : "rgba(0, 0, 0, 0.5)"
          };
          color: ${isActive ? mode.color : "#888"};
          transition: all 0.2s;
          min-width: 60px;
        `;

        tab.innerHTML = `
          <div style="font-size: 16px;">${mode.icon}</div>
          <div style="font-size: 10px;">${mode.name}</div>
        `;

        tab.onmouseenter = () => {
          if (!isActive) {
            tab.style.borderColor = mode.color;
            tab.style.color = mode.color;
          }
        };
        tab.onmouseleave = () => {
          if (!isActive) {
            tab.style.borderColor = "#555";
            tab.style.color = "#888";
          }
        };

        tab.onclick = () => {
          // 무기 모드 변경
          this.defenseGame.setWeaponMode(modeName);
          // 업그레이드 보너스 재적용
          this.applyHelperUpgradeBonuses();
          // 화면 새로고침
          this.showHelperUpgrades(overlay);
          this.terminal.printSystemMessage(`WEAPON MODE: ${modeName}`);
        };
      }

      weaponTabContainer.appendChild(tab);
    });

    overlay.appendChild(weaponTabContainer);

    // 현재 무기 설명
    const currentModeInfo = weaponModes[currentMode];
    const modeDesc = document.createElement("div");
    modeDesc.style.cssText = `
      color: ${currentModeInfo.color};
      font-family: var(--term-font);
      font-size: 11px;
      margin-bottom: 10px;
      text-align: center;
    `;
    modeDesc.innerHTML = `<span style="font-size: 14px;">${currentModeInfo.icon}</span> ${currentModeInfo.desc}`;
    if (currentModeInfo.hasReload) {
      modeDesc.innerHTML += ` <span style="color: #888;">(탄창: ${currentModeInfo.magazineSize})</span>`;
    }
    overlay.appendChild(modeDesc);

    // 현재 스탯 박스 (방법 B 스타일)
    const helper = this.defenseGame.helper;
    const statsBox = document.createElement("div");
    statsBox.style.cssText = `
      font-family: var(--term-font);
      font-size: 11px;
      margin-bottom: 15px;
      padding: 12px;
      border: 2px solid ${currentModeInfo.color};
      background: rgba(50, 50, 0, 0.3);
      width: 100%;
      max-width: 350px;
      box-sizing: border-box;
    `;
    statsBox.id = "helper-stats-box";
    this.updateHelperStatsBox(statsBox);
    overlay.appendChild(statsBox);

    // DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 업그레이드 목록
    const upgradeList = document.createElement("div");
    upgradeList.id = "helper-upgrade-list";
    upgradeList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 350px;
    `;

    // 조력자 업그레이드 옵션들 (MAX Lv.10, Move Speed 제거됨)
    const levels = this.upgradeLevels.helper;
    const maxLevels = this.upgradeMaxLevels.helper;
    const weaponMode = this.defenseGame.getCurrentWeaponMode();

    // 탄창 증가량 계산 (무기별 다름)
    const magIncrement = this.getMagazineIncrement(weaponMode.name);

    const upgrades = [
      {
        id: "damage",
        name: "Damage",
        increment: "+2.5",
        cost: 150,
        level: levels.damage,
        maxLevel: maxLevels.damage,
        effect: () => {
          this.upgradeLevels.helper.damage++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "fireRate",
        name: "Fire Rate",
        increment: "+0.6/s",
        cost: 200,
        level: levels.fireRate,
        maxLevel: maxLevels.fireRate,
        effect: () => {
          this.upgradeLevels.helper.fireRate++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "range",
        name: "Range",
        increment: "+20",
        cost: 100,
        level: levels.range,
        maxLevel: maxLevels.range,
        effect: () => {
          this.upgradeLevels.helper.range++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "projectileSpeed",
        name: "Bullet Speed",
        increment: "+50",
        cost: 180,
        level: levels.projectileSpeed,
        maxLevel: maxLevels.projectileSpeed,
        effect: () => {
          this.upgradeLevels.helper.projectileSpeed++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "magazineSize",
        name: "Magazine",
        increment: `+${magIncrement}`,
        cost: 120,
        level: levels.magazineSize,
        maxLevel: maxLevels.magazineSize,
        effect: () => {
          this.upgradeLevels.helper.magazineSize++;
          this.applyHelperUpgradeBonuses();
        },
      },
    ];

    this.renderHelperUpgradeButtons(upgradeList, upgrades, dataInfo, statsBox);
    overlay.appendChild(upgradeList);

    // 뒤로가기 버튼
    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 20px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  };

  proto.renderHelperUpgradeButtons = function(container, upgrades, dataInfo, statsBox) {
    container.innerHTML = "";
    const modeColor =
      this.defenseGame.getCurrentWeaponMode().color || "#ffff00";

    upgrades.forEach((upgrade) => {
      const btn = document.createElement("button");
      const isMaxLevel = upgrade.level >= upgrade.maxLevel;
      const canAfford = this.currentMoney >= upgrade.cost && !isMaxLevel;

      btn.style.cssText = `
        background: ${isMaxLevel
          ? "rgba(0, 100, 100, 0.4)"
          : canAfford
            ? "rgba(50, 80, 0, 0.6)"
            : "rgba(50, 50, 50, 0.5)"
        };
        border: 1px solid ${isMaxLevel ? "#00ffff" : canAfford ? modeColor : "#555"
        };
        color: ${isMaxLevel ? "#00ffff" : canAfford ? modeColor : "#666"};
        padding: 10px 12px;
        font-family: var(--term-font);
        font-size: 13px;
        cursor: ${canAfford ? "pointer" : "not-allowed"};
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const levelDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 11px;">MAX</span>`
        : `<span style="color: #888; font-size: 11px;">Lv.${upgrade.level}/${upgrade.maxLevel}</span>`;

      const costDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 12px;">-</span>`
        : `<span style="color: #ffcc00; font-size: 12px;">${upgrade.cost} MB</span>`;

      btn.innerHTML = `
        <div>
          <span style="font-weight: bold;">${upgrade.name}</span>
          <span style="color: #aaa; margin-left: 8px;">${upgrade.increment}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          ${levelDisplay}
          ${costDisplay}
        </div>
      `;

      btn.onclick = () => {
        if (isMaxLevel) return;
        if (this.currentMoney >= upgrade.cost) {
          this.currentMoney -= upgrade.cost;
          this.saveMoney(); // 자동 저장
          upgrade.effect();
          this.saveUpgrades(); // 업그레이드 레벨 저장
          upgrade.level = this.upgradeLevels.helper[upgrade.id];

          this.terminal.updateData(this.currentMoney);
          dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;

          // ===== 클릭 애니메이션 =====
          btn.style.transition = "all 0.15s ease-out";
          btn.style.background = "rgba(0, 200, 100, 0.8)";
          btn.style.borderColor = "#00ff88";
          btn.style.color = "#ffffff";
          btn.style.transform = "scale(1.03)";
          btn.style.boxShadow = "0 0 20px rgba(0, 255, 136, 0.6)";
          btn.innerHTML = `
            <div style="text-align: center; width: 100%;">
              <span style="font-size: 16px;">✓ UPGRADED!</span>
            </div>
          `;

          // 0.4초 후 원래대로 복구 + 레벨 업데이트
          setTimeout(() => {
            btn.style.transition = "all 0.2s ease-in";
            btn.style.transform = "scale(1)";
            btn.style.boxShadow = "none";

            // 스탯 박스 업데이트
            this.updateHelperStatsBox(statsBox);

            // 버튼 리렌더링 (레벨 업데이트)
            const levels = this.upgradeLevels.helper;
            const maxLevels = this.upgradeMaxLevels.helper;
            const activeMode = this.defenseGame.getCurrentWeaponMode();
            const magIncrement = this.getMagazineIncrement(activeMode.name);
            const newUpgrades = [
              {
                id: "damage",
                name: "Damage",
                increment: "+2.5",
                cost: 150,
                level: levels.damage,
                maxLevel: maxLevels.damage,
                effect: () => {
                  this.upgradeLevels.helper.damage++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "fireRate",
                name: "Fire Rate",
                increment: "+0.6/s",
                cost: 200,
                level: levels.fireRate,
                maxLevel: maxLevels.fireRate,
                effect: () => {
                  this.upgradeLevels.helper.fireRate++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "range",
                name: "Range",
                increment: "+20",
                cost: 100,
                level: levels.range,
                maxLevel: maxLevels.range,
                effect: () => {
                  this.upgradeLevels.helper.range++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "projectileSpeed",
                name: "Bullet Speed",
                increment: "+50",
                cost: 180,
                level: levels.projectileSpeed,
                maxLevel: maxLevels.projectileSpeed,
                effect: () => {
                  this.upgradeLevels.helper.projectileSpeed++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "magazineSize",
                name: "Magazine",
                increment: `+${magIncrement}`,
                cost: 120,
                level: levels.magazineSize,
                maxLevel: maxLevels.magazineSize,
                effect: () => {
                  this.upgradeLevels.helper.magazineSize++;
                  this.applyHelperUpgradeBonuses();
                },
              },
            ];
            this.renderHelperUpgradeButtons(
              container,
              newUpgrades,
              dataInfo,
              statsBox
            );

            this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
          }, 400);

          return;
        }
      };

      container.appendChild(btn);
    });
  };

  proto.updateHelperStatsBox = function(element) {
    const helper = this.defenseGame.helper;
    const mode = this.defenseGame.getCurrentWeaponMode();
    const modeColor = mode.color || "#ffff00";

    // 탄창 크기 (기본 + 보너스)
    const totalMagazine = mode.magazineSize + (helper.magazineBonus || 0);

    // 특수 효과 표시
    let specialDisplay = "";
    if (mode.explosive) {
      specialDisplay = `<div style="color: #ff4400;">💥 폭발 반경: ${mode.explosionRadius}</div>`;
    }
    if (mode.piercing) {
      specialDisplay = `<div style="color: #00ffff;">⚡ 관통</div>`;
    }
    if (mode.projectileCount > 1) {
      specialDisplay += `<div style="color: #ff8800;">🔥 ${mode.projectileCount}발 산탄</div>`;
    }

    element.innerHTML = `
      <div style="color: ${modeColor}; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 5px;">
        ─── Current Stats ───
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #ccc;">
        <div>DMG: <span style="color: #fff;">${helper.damage.toFixed(
      1
    )}</span></div>
        <div>RATE: <span style="color: #fff;">${helper.fireRate.toFixed(
      1
    )}/s</span></div>
        <div>RNG: <span style="color: #fff;">${helper.range}</span></div>
        <div>BULLET: <span style="color: #fff;">${helper.projectileSpeed
      }</span></div>
        <div>MAG: <span style="color: #fff;">${totalMagazine}</span></div>
        <div>RELOAD: <span style="color: #fff;">${mode.reloadTime.toFixed(
        1
      )}s</span></div>
      </div>
      ${specialDisplay
        ? `<div style="margin-top: 8px; border-top: 1px solid #555; padding-top: 5px;">${specialDisplay}</div>`
        : ""
      }
    `;
  };

  proto.hexToRgb = function(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(
        result[2],
        16
      )}, ${parseInt(result[3], 16)}`;
    }
    return "255, 255, 0"; // 기본값
  };

  proto.applyHelperUpgradeBonuses = function() {
    const levels = this.upgradeLevels.helper;
    const currentMode = this.defenseGame.getCurrentWeaponMode();

    // 레벨당 증가량 (MAX Lv.10, 최종 보너스 동일)
    const bonusDamage = levels.damage * 2.5; // Lv.10 = +25
    const bonusFireRate = levels.fireRate * 0.6; // Lv.10 = +6/s
    const bonusRange = levels.range * 20; // Lv.10 = +200
    const bonusBulletSpeed = levels.projectileSpeed * 50; // Lv.10 = +500

    // 탄창 보너스 (무기별 다름)
    const magIncrement = this.getMagazineIncrement(currentMode.name);
    const bonusMagazine = levels.magazineSize * magIncrement;

    this.defenseGame.applyUpgradeBonus(
      bonusDamage,
      bonusFireRate,
      bonusRange,
      bonusBulletSpeed,
      bonusMagazine
    );
  };

  proto.getMagazineIncrement = function(weaponName) {
    // 무기별 탄창 증가량 (컨셉에 맞게)
    const increments = {
      NORMAL: 2, // 12 → 32 (+20)
      SHOTGUN: 1, // 6 → 16 (+10)
      SNIPER: 1, // 3 → 13 (+10)
      RAPID: 5, // 30 → 80 (+50)
      LAUNCHER: 1, // 2 → 12 (+10)
    };
    return increments[weaponName] || 1;
  };

  proto.showCoreUpgrades = function(overlay) {
    overlay.innerHTML = "";

    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ffff;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #00ffff;
    `;
    header.innerText = "[ CORE UPGRADES ]";
    overlay.appendChild(header);

    // 현재 스탯 박스
    const statsBox = document.createElement("div");
    statsBox.id = "core-stats-box";
    statsBox.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 11px;
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid #00ffff;
      background: rgba(0, 255, 255, 0.1);
      width: 100%;
      max-width: 350px;
      box-sizing: border-box;
    `;
    this.updateCoreStatsBox(statsBox);
    overlay.appendChild(statsBox);

    // DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 업그레이드 버튼 컨테이너
    const container = document.createElement("div");
    container.id = "core-upgrade-container";
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 350px;
    `;

    // 업그레이드 목록 (MAX Lv.10)
    const levels = this.upgradeLevels.core;
    const maxLevels = this.upgradeMaxLevels.core;
    const staticSystem = this.defenseGame.staticSystem;

    const upgrades = [
      {
        id: "hp",
        name: "Core HP",
        increment: "+10",
        cost: 100,
        level: levels.hp,
        maxLevel: maxLevels.hp,
        effect: () => {
          this.upgradeLevels.core.hp++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "turretDamage",
        name: "Turret Damage",
        increment: "+3",
        cost: 120,
        level: levels.turretDamage,
        maxLevel: maxLevels.turretDamage,
        effect: () => {
          this.upgradeLevels.core.turretDamage++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "turretRange",
        name: "Turret Range",
        increment: "+15",
        cost: 80,
        level: levels.turretRange,
        maxLevel: maxLevels.turretRange,
        effect: () => {
          this.upgradeLevels.core.turretRange++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "turretSpeed",
        name: "Bullet Speed",
        increment: "+30",
        cost: 100,
        level: levels.turretSpeed,
        maxLevel: maxLevels.turretSpeed,
        effect: () => {
          this.upgradeLevels.core.turretSpeed++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "fireRate",
        name: "Fire Rate",
        increment: "+0.6/s",
        cost: 140,
        level: levels.fireRate,
        maxLevel: maxLevels.fireRate,
        effect: () => {
          this.upgradeLevels.core.fireRate++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "staticDamage",
        name: "⚡ Static Damage",
        increment: "+5",
        cost: 150,
        level: levels.staticDamage,
        maxLevel: maxLevels.staticDamage,
        effect: () => {
          this.upgradeLevels.core.staticDamage++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "staticChain",
        name: "⚡ Chain Count",
        increment: "+1",
        cost: 200,
        level: levels.staticChain,
        maxLevel: maxLevels.staticChain,
        effect: () => {
          this.upgradeLevels.core.staticChain++;
          this.applyCoreUpgradeBonuses();
        },
      },
    ];

    this.renderCoreUpgradeButtons(container, upgrades, dataInfo, statsBox);
    overlay.appendChild(container);

    // 뒤로가기 버튼
    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 20px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  };

  proto.updateCoreStatsBox = function(element) {
    const core = this.defenseGame.core;
    const turret = this.defenseGame.turret;
    const staticSystem = this.defenseGame.staticSystem;

    element.innerHTML = `
      <div style="color: #00ffff; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 5px;">
        ─── Current Stats ───
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #ccc;">
        <div>HP: <span style="color: #fff;">${core.hp}/${core.maxHp
      }</span></div>
        <div>T.DMG: <span style="color: #fff;">${turret.damage}</span></div>
        <div>T.RNG: <span style="color: #fff;">${turret.range}</span></div>
        <div>T.SPD: <span style="color: #fff;">${turret.projectileSpeed
      }</span></div>
      </div>
      <div style="margin-top: 8px; border-top: 1px solid #555; padding-top: 5px; color: #ffff00;">
        <div>⚡ Static: <span style="color: #fff;">${staticSystem.damage
      } DMG</span> | <span style="color: #fff;">${staticSystem.chainCount
      } chains</span></div>
        <div>⚡ Charge: <span style="color: #fff;">${Math.floor(
        staticSystem.currentCharge
      )}/${staticSystem.maxCharge}</span></div>
      </div>
    `;
  };

  proto.renderCoreUpgradeButtons = function(container, upgrades, dataInfo, statsBox) {
    container.innerHTML = "";

    upgrades.forEach((upgrade) => {
      const isMaxLevel = upgrade.level >= upgrade.maxLevel;

      const btn = document.createElement("button");
      btn.style.cssText = `
        background: ${isMaxLevel ? "rgba(0, 255, 255, 0.2)" : "rgba(0, 50, 50, 0.8)"
        };
        border: 2px solid ${isMaxLevel ? "#00ffff" : "#00aaaa"};
        color: ${isMaxLevel ? "#00ffff" : "#00ffff"};
        padding: 12px 15px;
        font-family: var(--term-font);
        font-size: 12px;
        cursor: ${isMaxLevel ? "default" : "pointer"};
        text-align: left;
        transition: all 0.2s;
        opacity: ${isMaxLevel ? "0.7" : "1"};
      `;

      const levelDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-weight: bold;">MAX</span>`
        : `Lv.${upgrade.level}/${upgrade.maxLevel}`;

      btn.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${upgrade.name} <span style="color: #88ff88;">${upgrade.increment
        }</span></span>
          <span style="font-size: 11px;">${levelDisplay}</span>
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 3px;">
          ${isMaxLevel ? "최대 레벨 도달" : `Cost: ${upgrade.cost} DATA`}
        </div>
      `;

      if (!isMaxLevel) {
        btn.onmouseenter = () => {
          btn.style.background = "rgba(0, 100, 100, 0.8)";
          btn.style.borderColor = "#00ffff";
        };
        btn.onmouseleave = () => {
          btn.style.background = "rgba(0, 50, 50, 0.8)";
          btn.style.borderColor = "#00aaaa";
        };

        btn.onclick = () => {
          if (this.currentMoney >= upgrade.cost) {
            this.currentMoney -= upgrade.cost;
            this.saveMoney(); // 자동 저장
            upgrade.effect();
            this.saveUpgrades(); // 업그레이드 레벨 저장

            // 클릭 애니메이션
            btn.style.transform = "scale(0.95)";
            btn.style.boxShadow = "0 0 20px #00ffff";

            // UI 업데이트 (즉시)
            dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
            this.updateCoreStatsBox(statsBox);

            // 애니메이션 후 버튼 리렌더링 (200ms 지연)
            setTimeout(() => {
              btn.style.transform = "scale(1)";
              btn.style.boxShadow = "none";

              // 버튼 리렌더링
              const levels = this.upgradeLevels.core;
              const maxLevels = this.upgradeMaxLevels.core;
              const newUpgrades = [
                {
                  id: "hp",
                  name: "Core HP",
                  increment: "+10",
                  cost: 100,
                  level: levels.hp,
                  maxLevel: maxLevels.hp,
                  effect: () => {
                    this.upgradeLevels.core.hp++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "turretDamage",
                  name: "Turret Damage",
                  increment: "+3",
                  cost: 120,
                  level: levels.turretDamage,
                  maxLevel: maxLevels.turretDamage,
                  effect: () => {
                    this.upgradeLevels.core.turretDamage++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "turretRange",
                  name: "Turret Range",
                  increment: "+15",
                  cost: 80,
                  level: levels.turretRange,
                  maxLevel: maxLevels.turretRange,
                  effect: () => {
                    this.upgradeLevels.core.turretRange++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "turretSpeed",
                  name: "Bullet Speed",
                  increment: "+30",
                  cost: 100,
                  level: levels.turretSpeed,
                  maxLevel: maxLevels.turretSpeed,
                  effect: () => {
                    this.upgradeLevels.core.turretSpeed++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "fireRate",
                  name: "Fire Rate",
                  increment: "+0.5/s",
                  cost: 140,
                  level: levels.fireRate,
                  maxLevel: maxLevels.fireRate,
                  effect: () => {
                    this.upgradeLevels.core.fireRate++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "staticDamage",
                  name: "⚡ Static Damage",
                  increment: "+5",
                  cost: 150,
                  level: levels.staticDamage,
                  maxLevel: maxLevels.staticDamage,
                  effect: () => {
                    this.upgradeLevels.core.staticDamage++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "staticChain",
                  name: "⚡ Chain Count",
                  increment: "+1",
                  cost: 200,
                  level: levels.staticChain,
                  maxLevel: maxLevels.staticChain,
                  effect: () => {
                    this.upgradeLevels.core.staticChain++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
              ];
              this.renderCoreUpgradeButtons(
                container,
                newUpgrades,
                dataInfo,
                statsBox
              );
            }, 200); // 애니메이션 후 리렌더링

            this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
          } else {
            this.terminal.printSystemMessage("NOT ENOUGH DATA!", "error");
          }
        };
      }

      container.appendChild(btn);
    });
  };

  proto.applyCoreUpgradeBonuses = function() {
    const levels = this.upgradeLevels.core;

    // 기본값
    const baseMaxHp = 100;
    const baseTurretDamage = 10;
    const baseTurretRange = 200;
    const baseTurretSpeed = 300;
    const baseTurretFireRate = 4;
    const baseStaticDamage = 10;
    const baseStaticChain = 3;

    // 보너스 계산
    const bonusHp = levels.hp * 10;
    const bonusTurretDamage = levels.turretDamage * 3;
    const bonusTurretRange = levels.turretRange * 15;
    const bonusTurretSpeed = levels.turretSpeed * 30;
    const bonusTurretFireRate = levels.fireRate * 0.6;
    const bonusStaticDamage = levels.staticDamage * 5;
    const bonusStaticChain = levels.staticChain * 1;

    // 적용
    const hpDiff = baseMaxHp + bonusHp - this.defenseGame.core.maxHp;
    this.defenseGame.core.maxHp = baseMaxHp + bonusHp;
    if (hpDiff > 0) this.defenseGame.core.hp += hpDiff; // 최대 HP 증가분만큼 현재 HP도 증가

    this.defenseGame.turret.damage = baseTurretDamage + bonusTurretDamage;
    this.defenseGame.turret.range = baseTurretRange + bonusTurretRange;
    this.defenseGame.turret.projectileSpeed =
      baseTurretSpeed + bonusTurretSpeed;
    this.defenseGame.turret.fireRate =
      baseTurretFireRate + bonusTurretFireRate;

    this.defenseGame.staticSystem.damage = baseStaticDamage + bonusStaticDamage;
    this.defenseGame.staticSystem.chainCount =
      baseStaticChain + bonusStaticChain;

    debugLog("GameManager", "Core upgrade bonus applied:", {
      maxHp: this.defenseGame.core.maxHp,
      turretDamage: this.defenseGame.turret.damage,
      turretRange: this.defenseGame.turret.range,
      staticDamage: this.defenseGame.staticSystem.damage,
      staticChain: this.defenseGame.staticSystem.chainCount,
    });
  };

  proto.applyShieldUpgradeBonuses = function() {
    const levels = this.upgradeLevels.shield;

    const baseShieldMaxHp = 100;
    const bonusShieldHp = levels.hp * 20;
    const nextShieldMaxHp = baseShieldMaxHp + bonusShieldHp;

    const shieldDiff = nextShieldMaxHp - this.defenseGame.core.shieldMaxHp;
    this.defenseGame.core.shieldMaxHp = nextShieldMaxHp;
    if (shieldDiff > 0) this.defenseGame.core.shieldHp += shieldDiff;
    this.defenseGame.core.shieldHp = Math.min(
      this.defenseGame.core.shieldHp,
      this.defenseGame.core.shieldMaxHp
    );

    debugLog("GameManager", "Shield upgrade bonus applied:", {
      shieldMaxHp: this.defenseGame.core.shieldMaxHp,
      shieldHp: this.defenseGame.core.shieldHp,
    });
  };

  proto.showAllyUpgrades = function(overlay) {
    overlay.innerHTML = "";

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #00aaff;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #00aaff;
    `;
    header.innerText = "[ ALLY CONFIGURATION ]";
    overlay.appendChild(header);

    // 현재 DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "ally-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 14px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 슬롯 정보 박스
    const slotInfo = document.createElement("div");
    slotInfo.id = "ally-slot-info";
    slotInfo.style.cssText = `
      background: rgba(0, 50, 80, 0.5);
      border: 1px solid #00aaff;
      padding: 10px;
      margin-bottom: 15px;
      font-family: var(--term-font);
      font-size: 12px;
      color: #aaa;
      width: 100%;
      max-width: 350px;
      box-sizing: border-box;
    `;
    this.updateAllySlotInfo(slotInfo);
    overlay.appendChild(slotInfo);

    // 메인 컨테이너 (스크롤 가능 + 터미널 스타일 스크롤바)
    const mainContainer = document.createElement("div");
    mainContainer.className = "terminal-scrollbar";
    mainContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 350px;
      max-height: 50vh;
      overflow-y: auto;
      padding-right: 5px;
    `;

    // 터미널 스타일 스크롤바 CSS 추가 (한 번만)
    if (!document.getElementById("terminal-scrollbar-style")) {
      const scrollStyle = document.createElement("style");
      scrollStyle.id = "terminal-scrollbar-style";
      scrollStyle.textContent = `
        .terminal-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .terminal-scrollbar::-webkit-scrollbar-track {
          background: #111;
          border: 1px solid #333;
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb {
          background: #00ff00;
          border: 1px solid #00aa00;
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00ff88;
        }
      `;
      document.head.appendChild(scrollStyle);
    }

    // === 메인 타입 선택 ===
    const mainSection = document.createElement("div");
    mainSection.style.cssText = `
      background: rgba(0, 100, 50, 0.2);
      border: 2px solid #00ff88;
      padding: 8px;
    `;

    const mainTitle = document.createElement("div");
    mainTitle.style.cssText = `
      color: #00ff88;
      font-family: var(--term-font);
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
    `;
    mainTitle.innerText = "★ MAIN (70%)";
    mainSection.appendChild(mainTitle);

    const mainTypeGrid = document.createElement("div");
    mainTypeGrid.id = "main-type-grid";
    mainTypeGrid.style.cssText = `
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      justify-content: center;
    `;
    this.renderVirusTypeButtons(mainTypeGrid, "main", slotInfo);
    mainSection.appendChild(mainTypeGrid);
    mainContainer.appendChild(mainSection);

    // === 서브 타입 선택 ===
    const subSection = document.createElement("div");
    subSection.style.cssText = `
      background: rgba(100, 50, 0, 0.2);
      border: 2px solid #ffaa00;
      padding: 8px;
    `;

    const subTitle = document.createElement("div");
    subTitle.style.cssText = `
      color: #ffaa00;
      font-family: var(--term-font);
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
    `;
    subTitle.innerText = "☆ SUB TYPE (30%)";
    subSection.appendChild(subTitle);

    const subTypeGrid = document.createElement("div");
    subTypeGrid.id = "sub-type-grid";
    subTypeGrid.style.cssText = `
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      justify-content: center;
    `;
    this.renderVirusTypeButtons(subTypeGrid, "sub", slotInfo);
    subSection.appendChild(subTypeGrid);
    mainContainer.appendChild(subSection);

    // === 시너지 표시 ===
    const synergyBox = document.createElement("div");
    synergyBox.id = "synergy-box";
    synergyBox.style.cssText = `
      background: rgba(80, 0, 80, 0.3);
      border: 1px solid #ff00ff;
      padding: 10px;
      text-align: center;
    `;
    this.updateSynergyDisplay(synergyBox);
    mainContainer.appendChild(synergyBox);

    // === 업그레이드 섹션 ===
    const upgradeSection = document.createElement("div");
    upgradeSection.style.cssText = `
      background: rgba(0, 50, 50, 0.3);
      border: 1px solid #00aaaa;
      padding: 10px;
    `;

    const upgradeTitle = document.createElement("div");
    upgradeTitle.style.cssText = `
      color: #00ffff;
      font-family: var(--term-font);
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    `;
    upgradeTitle.innerText = "⬆ UPGRADES";
    upgradeSection.appendChild(upgradeTitle);

    const upgradeGrid = document.createElement("div");
    upgradeGrid.id = "ally-upgrade-grid";
    upgradeGrid.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
    this.renderAllyUpgradeButtons(upgradeGrid, dataInfo, slotInfo);
    upgradeSection.appendChild(upgradeGrid);
    mainContainer.appendChild(upgradeSection);

    overlay.appendChild(mainContainer);

    // 뒤로가기 버튼
    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 15px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  };

  proto.updateAllySlotInfo = function(element) {
    const baseSlots = 12;
    const bonusSlots = this.upgradeLevels.ally.slots;
    const totalSlots = baseSlots + bonusSlots;

    const { mainCount, subCount, mainType, subType } =
      this.calculateAllyDistribution();
    const mainSlots = mainType
      ? mainCount * this.virusTypes[mainType].slotCost
      : 0;
    const subSlots = subType ? subCount * this.virusTypes[subType].slotCost : 0;
    const usedSlots = mainSlots + subSlots;

    element.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #00aaff;">TOTAL SLOTS:</span>
        <span style="color: #fff;">${usedSlots} / ${totalSlots}</span>
      </div>
      <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #00ff88 0%, #00ff88 ${(mainSlots / totalSlots) * 100
      }%, #ffaa00 ${(mainSlots / totalSlots) * 100}%, #ffaa00 ${(usedSlots / totalSlots) * 100
      }%, #333 ${(usedSlots / totalSlots) * 100
      }%); height: 100%; width: 100%;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px;">
        <span style="color: #00ff88;">● Main: ${mainCount}마리 (${mainSlots}슬롯)</span>
        <span style="color: #ffaa00;">● Sub: ${subCount}마리 (${subSlots}슬롯)</span>
      </div>
      <div style="margin-top: 5px; color: #888; font-size: 10px;">
        최소 보장: 3마리 | 메인 70% / 서브 30% (남은 슬롯 자동 충원)
      </div>
    `;
  };

  proto.calculateAllyDistribution = function() {
    const baseSlots = 12;
    const bonusSlots = this.upgradeLevels.ally.slots;
    const totalSlots = baseSlots + bonusSlots;

    const mainType = this.allyConfig.mainType;
    const subType = this.allyConfig.subType;

    const mainCost = mainType ? this.virusTypes[mainType].slotCost : 1;
    const subCost = subType ? this.virusTypes[subType].slotCost : 1;

    let mainCount = 0;
    let subCount = 0;

    if (!subType) {
      // 서브 없음: 전부 메인
      mainCount = Math.floor(totalSlots / mainCost);
    } else {
      // 모든 가능한 조합을 탐색하여 최적의 배치 찾기
      let bestMain = 0;
      let bestSub = 0;
      let bestScore = -1;

      const maxMain = Math.floor(totalSlots / mainCost);
      const maxSub = Math.floor(totalSlots / subCost);

      // 메인 수를 높은 쪽부터 탐색 (같은 점수면 메인 많은 쪽 우선)
      for (let m = maxMain; m >= 1; m--) {
        const mainSlots = m * mainCost;
        const remainingSlots = totalSlots - mainSlots;

        for (let s = Math.floor(remainingSlots / subCost); s >= 1; s--) {
          const subSlots = s * subCost;
          const usedSlots = mainSlots + subSlots;

          // 조건 검사
          if (usedSlots > totalSlots) continue;  // 슬롯 초과
          if (mainSlots <= subSlots) continue;    // 메인이 슬롯 점유율로 엄격히 우세해야 함 (70%/30% 의도)

          // 점수 계산: 슬롯 활용도(최우선) > 총 마리수 > 메인 마리수
          const totalUnits = m + s;
          const score = usedSlots * 10000 + totalUnits * 100 + m;

          if (score > bestScore) {
            bestMain = m;
            bestSub = s;
            bestScore = score;
          }
        }
      }

      // 조합을 못 찾은 경우 (극단적 케이스: 서브 1마리도 못 넣는 경우)
      if (bestMain === 0) {
        // 메인만 최대한 채우고, 남은 슬롯으로 서브 채우기
        bestMain = Math.floor(totalSlots / mainCost);
        const remaining = totalSlots - bestMain * mainCost;
        bestSub = Math.floor(remaining / subCost);
      }

      mainCount = bestMain;
      subCount = bestSub;
    }

    // 최소 3마리 보장
    const total = mainCount + subCount;
    if (total < 3) {
      mainCount = Math.max(3 - subCount, mainCount);
    }

    return { mainCount, subCount, mainType, subType, totalSlots };
  };

  proto.isVirusUnlocked = function(virusType) {
    // SWARM만 기본 해금
    if (virusType === "SWARM") return true;

    // virusUnlockTargets에 있는 타입은 해금 필요
    if (!this.virusUnlockTargets.includes(virusType)) return true;

    // 해금 진행률 100% 이상이면 해금
    return (this.decryptionProgress[virusType] || 0) >= 100;
  };

  proto.isWeaponUnlocked = function(weaponMode) {
    // NORMAL만 기본 해금
    if (weaponMode === "NORMAL") return true;

    // weaponUnlockTargets에 있는 타입은 해금 필요
    if (!this.weaponUnlockTargets.includes(weaponMode)) return true;

    // 해금 진행률 100% 이상이면 해금
    return (this.decryptionProgress[weaponMode] || 0) >= 100;
  };

  proto.getUnlockStageName = function(target) {
    const stageNames = {
      1: "ALPHA",
      2: "BETA",
      4: "GAMMA",
      5: "DELTA",
      6: "BOSS"
    };

    for (const [stageId, targets] of Object.entries(this.stageUnlockTargets)) {
      if (Array.isArray(targets) && targets.includes(target)) {
        return stageNames[stageId] || `STAGE ${stageId}`;
      }
    }
    return null;
  };

  proto.renderVirusTypeButtons = function(container, slot, slotInfoElement) {
    container.innerHTML = "";

    const currentType =
      slot === "main" ? this.allyConfig.mainType : this.allyConfig.subType;

    // 컴팩트 버튼 스타일 (정사각형, 한 줄에 모두 표시)
    const btnBaseStyle = `
      width: 52px;
      height: 52px;
      padding: 4px;
      font-family: var(--term-font);
      font-size: 8px;
      text-align: center;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;

    // 서브 슬롯에는 "없음" 옵션 추가
    if (slot === "sub") {
      const noneBtn = document.createElement("button");
      const isSelected = currentType === null;
      noneBtn.style.cssText = `
        ${btnBaseStyle}
        background: ${isSelected ? "rgba(100, 100, 100, 0.5)" : "rgba(30, 30, 30, 0.5)"};
        border: 1px solid ${isSelected ? "#ffffff" : "#555"};
        color: ${isSelected ? "#fff" : "#888"};
        cursor: pointer;
      `;
      noneBtn.innerHTML = `<div style="font-size: 12px;">✗</div><div style="font-size: 7px;">없음</div>`;
      noneBtn.onclick = () => {
        this.allyConfig.subType = null;
        this.saveAllyConfig();
        this.renderVirusTypeButtons(container, slot, slotInfoElement);
        this.updateAllySlotInfo(slotInfoElement);
        this.updateSynergyDisplay(document.getElementById("synergy-box"));
      };
      container.appendChild(noneBtn);
    }

    Object.entries(this.virusTypes).forEach(([typeKey, typeData]) => {
      const btn = document.createElement("button");
      const isSelected = currentType === typeKey;
      const isDisabled = slot === "sub" && typeKey === this.allyConfig.mainType;
      const isLocked = !this.isVirusUnlocked(typeKey);
      const unlockProgress = this.decryptionProgress[typeKey] || 0;
      const unlockStage = this.getUnlockStageName(typeKey);

      // 잠긴 상태 스타일 (진행률에 따라 아이콘이 왼→오로 채워짐)
      if (isLocked) {
        const progress = Math.min(100, unlockProgress);
        const clipRight = 100 - progress; // 오른쪽에서 얼마나 자를지

        btn.style.cssText = `
          ${btnBaseStyle}
          background: rgba(20, 20, 20, 0.9);
          border: 1px solid #333;
          cursor: not-allowed;
          position: relative;
          overflow: hidden;
        `;
        btn.innerHTML = `
          <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <!-- 어두운 아이콘 (배경) -->
            <div style="position: absolute; font-size: 18px; filter: grayscale(100%) brightness(0.3);">${typeData.icon}</div>
            <!-- 밝은 아이콘 (진행률만큼 clip) -->
            <div style="position: absolute; font-size: 18px; clip-path: inset(0 ${clipRight}% 0 0); filter: drop-shadow(0 0 3px ${typeData.color});">${typeData.icon}</div>
            <!-- 진행률 텍스트 -->
            <div style="position: absolute; bottom: 2px; font-size: 8px; color: ${progress >= 100 ? '#00ff00' : '#00aaff'}; text-shadow: 0 0 3px #000;">
              ${progress >= 100 ? '✓' : progress + '%'}
            </div>
            <!-- 잠금 표시 (진행률 낮을 때만) -->
            ${progress < 30 ? '<div style="position: absolute; top: 2px; right: 2px; font-size: 8px;">🔒</div>' : ''}
          </div>
        `;
      } else {
        btn.style.cssText = `
          ${btnBaseStyle}
          background: ${isSelected ? `${typeData.color}33` : "rgba(30, 30, 30, 0.5)"};
          border: 1px solid ${isSelected ? typeData.color : isDisabled ? "#333" : "#555"};
          color: ${isDisabled ? "#444" : typeData.color};
          cursor: ${isDisabled ? "not-allowed" : "pointer"};
          opacity: ${isDisabled ? "0.4" : "1"};
        `;
        btn.innerHTML = `
          <div style="font-size: 12px;">${typeData.icon}</div>
          <div style="font-size: 7px;">${typeData.name}</div>
        `;

        if (!isDisabled) {
          btn.onclick = () => {
            if (slot === "main") {
              this.allyConfig.mainType = typeKey;
              if (this.allyConfig.subType === typeKey) {
                this.allyConfig.subType = null;
              }
              this.renderVirusTypeButtons(container, slot, slotInfoElement);
              const subGrid = document.getElementById("sub-type-grid");
              if (subGrid) this.renderVirusTypeButtons(subGrid, "sub", slotInfoElement);
            } else {
              this.allyConfig.subType = typeKey;
              this.renderVirusTypeButtons(container, slot, slotInfoElement);
            }
            this.saveAllyConfig();
            this.updateAllySlotInfo(slotInfoElement);
            this.updateSynergyDisplay(document.getElementById("synergy-box"));
          };
        }
      }

      container.appendChild(btn);
    });
  };

  proto.updateSynergyDisplay = function(element) {
    if (!element) return;

    const main = this.allyConfig.mainType;
    const sub = this.allyConfig.subType;

    if (!sub) {
      // 순수 특화 보너스
      const typeData = this.virusTypes[main];
      element.innerHTML = `
        <div style="color: #ff00ff; font-family: var(--term-font); font-size: 12px; margin-bottom: 5px;">
          🔗 PURE SPECIALIZATION
        </div>
        <div style="color: #fff; font-family: var(--term-font); font-size: 14px;">
          ${typeData.icon} ${main} 순수 특화
        </div>
        <div style="color: #aaa; font-family: var(--term-font); font-size: 11px; margin-top: 5px;">
          해당 타입 능력치 +30%
        </div>
      `;
      return;
    }

    // 시너지 찾기
    const synergyKey1 = `${main}+${sub}`;
    const synergyKey2 = `${sub}+${main}`;
    const synergy = this.synergies[synergyKey1] || this.synergies[synergyKey2];

    if (synergy) {
      element.innerHTML = `
        <div style="color: #ff00ff; font-family: var(--term-font); font-size: 12px; margin-bottom: 5px;">
          🔗 SYNERGY ACTIVE!
        </div>
        <div style="color: #fff; font-family: var(--term-font); font-size: 14px;">
          "${synergy.name}"
        </div>
        <div style="color: #aaa; font-family: var(--term-font); font-size: 11px; margin-top: 5px;">
          ${synergy.desc}
        </div>
      `;
    } else {
      element.innerHTML = `
        <div style="color: #666; font-family: var(--term-font); font-size: 12px;">
          🔗 시너지 없음
        </div>
        <div style="color: #888; font-family: var(--term-font); font-size: 11px; margin-top: 5px;">
          다른 조합을 시도해보세요!
        </div>
      `;
    }
  };

  proto.renderAllyUpgradeButtons = function(container, dataInfo, slotInfo) {
    container.innerHTML = "";

    const levels = this.upgradeLevels.ally;
    const maxLevels = this.upgradeMaxLevels.ally;

    const upgrades = [
      {
        id: "slots",
        name: "슬롯 확장",
        increment: "+1 슬롯",
        cost: 200,
        level: levels.slots,
        maxLevel: maxLevels.slots,
        effect: () => {
          this.upgradeLevels.ally.slots++;
        },
      },
      {
        id: "hp",
        name: "바이러스 HP",
        increment: "+10%",
        cost: 150,
        level: levels.hp,
        maxLevel: maxLevels.hp,
        effect: () => {
          this.upgradeLevels.ally.hp++;
        },
      },
      {
        id: "damage",
        name: "바이러스 데미지",
        increment: "+10%",
        cost: 180,
        level: levels.damage,
        maxLevel: maxLevels.damage,
        effect: () => {
          this.upgradeLevels.ally.damage++;
        },
      },
      {
        id: "speed",
        name: "이동 속도",
        increment: "+5%",
        cost: 120,
        level: levels.speed,
        maxLevel: maxLevels.speed,
        effect: () => {
          this.upgradeLevels.ally.speed++;
        },
      },
      {
        id: "respawn",
        name: "리스폰 속도",
        increment: "-0.15초",
        cost: 100,
        level: levels.respawn,
        maxLevel: maxLevels.respawn,
        effect: () => {
          this.upgradeLevels.ally.respawn++;
        },
      },
    ];

    upgrades.forEach((upgrade) => {
      const isMaxLevel = upgrade.level >= upgrade.maxLevel;
      const canAfford = this.currentMoney >= upgrade.cost && !isMaxLevel;

      const btn = document.createElement("button");
      btn.style.cssText = `
        background: ${isMaxLevel
          ? "rgba(0, 100, 100, 0.4)"
          : canAfford
            ? "rgba(0, 80, 80, 0.6)"
            : "rgba(50, 50, 50, 0.5)"
        };
        border: 1px solid ${isMaxLevel ? "#00ffff" : canAfford ? "#00aaff" : "#555"
        };
        color: ${isMaxLevel ? "#00ffff" : canAfford ? "#00aaff" : "#666"};
        padding: 8px 10px;
        font-family: var(--term-font);
        font-size: 11px;
        cursor: ${canAfford ? "pointer" : "not-allowed"};
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const levelDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 10px;">MAX</span>`
        : `<span style="color: #888; font-size: 10px;">Lv.${upgrade.level}/${upgrade.maxLevel}</span>`;

      const costDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 10px;">-</span>`
        : `<span style="color: #ffcc00; font-size: 10px;">${upgrade.cost} MB</span>`;

      btn.innerHTML = `
        <div>
          <span style="font-weight: bold;">${upgrade.name}</span>
          <span style="color: #aaa; margin-left: 6px;">${upgrade.increment}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${levelDisplay}
          ${costDisplay}
        </div>
      `;

      btn.onclick = () => {
        if (isMaxLevel || !canAfford) return;

        this.currentMoney -= upgrade.cost;
        this.saveMoney(); // 자동 저장
        upgrade.effect();
        this.saveUpgrades(); // 업그레이드 레벨 저장

        // UI 업데이트
        this.terminal.updateData(this.currentMoney);
        dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
        this.updateAllySlotInfo(slotInfo);
        this.renderAllyUpgradeButtons(container, dataInfo, slotInfo);

        this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
      };

      container.appendChild(btn);
    });
  };

  proto.getAllyConfiguration = function() {
    const { mainCount, subCount, mainType, subType } =
      this.calculateAllyDistribution();
    const levels = this.upgradeLevels.ally;

    // 업그레이드 보너스 계산
    const hpMultiplier = 1 + levels.hp * 0.1; // +10%/Lv
    const damageMultiplier = 1 + levels.damage * 0.1; // +10%/Lv
    const speedMultiplier = 1 + levels.speed * 0.05; // +5%/Lv
    const respawnReduction = levels.respawn * 0.15; // -0.15초/Lv

    // 시너지 확인
    const synergyKey1 = `${mainType}+${subType}`;
    const synergyKey2 = `${subType}+${mainType}`;
    const synergy = this.synergies[synergyKey1] || this.synergies[synergyKey2];

    // 순수 특화 보너스 (서브 없을 때)
    const isPureSpecialization = !subType;

    return {
      mainType,
      subType,
      mainCount,
      subCount,
      mainTypeData: this.virusTypes[mainType],
      subTypeData: subType ? this.virusTypes[subType] : null,
      hpMultiplier,
      damageMultiplier,
      speedMultiplier,
      respawnTime: Math.max(0.5, 2 - respawnReduction), // 기본 2초, 최소 0.5초
      synergy: synergy || null,
      isPureSpecialization,
      pureBonus: isPureSpecialization ? 1.3 : 1.0, // 순수 특화 +30%
    };
  };

  proto.showShieldUpgrades = function(overlay) {
    overlay.innerHTML = "";

    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ff88;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #00ff88;
    `;
    header.innerText = "[ SHIELD UPGRADES ]";
    overlay.appendChild(header);

    // 현재 스탯 표시
    const core = this.defenseGame.core;
    const statsInfo = document.createElement("div");
    statsInfo.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 12px;
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid #444;
      background: rgba(0, 0, 0, 0.5);
    `;
    statsInfo.id = "shield-stats-info";
    statsInfo.innerHTML = `
      <div>Shield HP: ${core.shieldHp}/${core.shieldMaxHp}</div>
    `;
    overlay.appendChild(statsInfo);

    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    const upgradeList = document.createElement("div");
    upgradeList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 350px;
    `;

    const levels = this.upgradeLevels.shield;
    const maxLevels = this.upgradeMaxLevels.shield;
    const upgrades = [
      {
        id: "shield_hp",
        name: "Shield HP +20",
        cost: 150,
        getLevel: () => this.upgradeLevels.shield.hp,
        maxLevel: maxLevels.hp,
        getDesc: () => `Shield HP: ${core.shieldMaxHp}`,
        effect: () => {
          if (levels.hp >= maxLevels.hp) return;
          this.upgradeLevels.shield.hp += 1;
          this.applyShieldUpgradeBonuses();
        },
      },
    ];

    this.renderUpgradeButtons(
      upgradeList,
      upgrades,
      dataInfo,
      statsInfo,
      "shield"
    );
    overlay.appendChild(upgradeList);

    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 20px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  };

  proto.renderUpgradeButtons = function(container, upgrades, dataInfo, statsInfo, category) {
    container.innerHTML = "";
    upgrades.forEach((upgrade) => {
      const levelValue =
        typeof upgrade.getLevel === "function" ? upgrade.getLevel() : upgrade.level;
      const maxLevelValue =
        Number.isFinite(upgrade.maxLevel) ? upgrade.maxLevel : null;
      const hasLevelInfo =
        Number.isFinite(levelValue) && Number.isFinite(maxLevelValue);
      const isMaxLevel = hasLevelInfo && levelValue >= maxLevelValue;
      const btn = document.createElement("button");
      const canAfford = this.currentMoney >= upgrade.cost && !isMaxLevel;
      const descText =
        typeof upgrade.getDesc === "function" ? upgrade.getDesc() : upgrade.desc;
      const costLabel = isMaxLevel ? "-" : `${upgrade.cost} MB`;
      const levelLabel = hasLevelInfo
        ? isMaxLevel
          ? "MAX"
          : `Lv.${levelValue}/${maxLevelValue}`
        : "";

      btn.style.cssText = `
        background: ${isMaxLevel
          ? "rgba(0, 100, 100, 0.4)"
          : canAfford
            ? "rgba(0, 100, 50, 0.5)"
            : "rgba(50, 50, 50, 0.5)"};
        border: 1px solid ${isMaxLevel ? "#00ffff" : canAfford ? "#00ff00" : "#555"};
        color: ${isMaxLevel ? "#00ffff" : canAfford ? "#00ff00" : "#666"};
        padding: 12px 15px;
        font-family: var(--term-font);
        font-size: 14px;
        cursor: ${canAfford ? "pointer" : "not-allowed"};
        text-align: left;
      `;

      btn.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${upgrade.name}</span>
          <span style="color: ${isMaxLevel ? "#00ffff" : "#ffcc00"}; font-size: 12px;">${costLabel}</span>
        </div>
        <div style="font-size: 11px; color: #888; margin-top: 3px; display: flex; justify-content: space-between; align-items: center;">
          <span>${descText}</span>
          ${levelLabel ? `<span style="color: ${isMaxLevel ? "#00ffff" : "#888"};">${levelLabel}</span>` : ""}
        </div>
      `;

      btn.onclick = () => {
        if (this.currentMoney >= upgrade.cost) {
          this.currentMoney -= upgrade.cost;
          this.saveMoney(); // 자동 저장
          upgrade.effect();
          this.saveUpgrades(); // 업그레이드 레벨 저장
          this.terminal.updateData(this.currentMoney);
          dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;

          // 스탯 정보 업데이트
          if (category === "helper") {
            this.updateHelperStatsDisplay(statsInfo);
          } else if (category === "core") {
            const core = this.defenseGame.core;
            const turret = this.defenseGame.turret;
            statsInfo.innerHTML = `
              <div>HP: ${core.hp}/${core.maxHp}</div>
              <div>Turret Damage: ${turret.damage}</div>
            `;
          } else if (category === "shield") {
            const core = this.defenseGame.core;
            statsInfo.innerHTML = `
              <div>Shield HP: ${core.shieldHp}/${core.shieldMaxHp}</div>
            `;
          }

          this.renderUpgradeButtons(container, upgrades, dataInfo, statsInfo, category);

          this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
        }
      };

      container.appendChild(btn);
    });
  };

  proto.updateHelperStatsDisplay = function(element) {
    const helper = this.defenseGame.helper;
    element.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
        <div>Damage: <span style="color: #ffff00;">${helper.damage}</span></div>
        <div>Fire Rate: <span style="color: #ffff00;">${helper.fireRate.toFixed(
      1
    )}/s</span></div>
        <div>Range: <span style="color: #ffff00;">${helper.range}</span></div>
        <div>Speed: <span style="color: #ffff00;">${helper.speed}</span></div>
      </div>
    `;
  };

  proto.getDefaultUpgrades = function() {
    return {
      helper: { damage: 0, fireRate: 0, range: 0, projectileSpeed: 0, magazineSize: 0 },
      core: { hp: 0, turretDamage: 0, turretRange: 0, turretSpeed: 0, fireRate: 0, staticDamage: 0, staticChain: 0 },
      shield: { hp: 0 },
      ally: { slots: 0, hp: 0, damage: 0, speed: 0, respawn: 0 },
    };
  };

  proto.sanitizeUpgrades = function(raw) {
    const defaults = this.getDefaultUpgrades();
    const cleaned = this.getDefaultUpgrades();

    if (!raw || typeof raw !== "object") return cleaned;

    for (const group of Object.keys(defaults)) {
      const rawGroup = raw[group];
      if (!rawGroup || typeof rawGroup !== "object") continue;

      for (const stat of Object.keys(defaults[group])) {
        const v = rawGroup[stat];
        const n = Number(v);
        // 유효한 숫자만 허용, 음수 방지, 정수로 변환
        cleaned[group][stat] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      }
    }

    return cleaned;
  };
}
