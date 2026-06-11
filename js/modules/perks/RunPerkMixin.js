// 런 퍽: 점령 보상 3택1 — 코어 파괴(게임오버) 시 소실되는 런 한정 강화
// 효과는 getItemEffects 파이프라인에 합산되어 기존 소비처(공속/흡수 등)와
// 신규 소비처(관통/데미지/전향/이속)에 흐른다.

export const RUN_PERKS = {
  pierce: {
    name: "관통 코드",
    icon: "🗡️",
    desc: "조력자/수동 탄환이 적을 관통",
    effects: { pierce: 1 },
  },
  overclock: {
    name: "오버클럭",
    icon: "⚡",
    desc: "공격 속도 +20%",
    effects: { attackSpeed: 0.2 },
  },
  hotRounds: {
    name: "과열 탄환",
    icon: "🔥",
    desc: "탄환 데미지 +25%",
    effects: { damageBonus: 0.25 },
  },
  siphon: {
    name: "데이터 사이펀",
    icon: "💾",
    desc: "처치 DATA +30%",
    effects: { dataBonus: 0.3 },
  },
  convert: {
    name: "전향 프로토콜",
    icon: "🔄",
    desc: "처치 시 5% 확률로 적이 아군이 됨",
    effects: { convert: 0.05 },
  },
  nimble: {
    name: "경량 코어",
    icon: "💨",
    desc: "코어 이동 속도 +25%",
    effects: { moveSpeedBonus: 0.25 },
  },
  fortress: {
    name: "요새 프로토콜",
    icon: "🛡️",
    desc: "실드 최대 HP +40",
    effects: { shieldMaxBonus: 40 },
  },
  leech: {
    name: "흡수 코드",
    icon: "💚",
    desc: "처치 시 실드 +2 회복",
    effects: { lifesteal: 2 },
  },
};

const STORAGE_KEY = "run_perks_v1";

export function applyRunPerkMixin(GameManagerClass) {
  const proto = GameManagerClass.prototype;

  proto.loadRunPerks = function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      this.runPerks = Array.isArray(parsed)
        ? parsed.filter((id) => RUN_PERKS[id])
        : [];
    } catch {
      this.runPerks = [];
    }
  };

  proto.saveRunPerks = function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.runPerks || []));
  };

  // 게임오버 시 호출 — 런 퍽은 이 런과 함께 사라진다
  proto.clearRunPerks = function () {
    const had = (this.runPerks || []).length;
    this.runPerks = [];
    this.saveRunPerks();
    return had;
  };

  proto.getRunPerkEffects = function () {
    const total = {};
    for (const id of this.runPerks || []) {
      const perk = RUN_PERKS[id];
      if (!perk) continue;
      for (const [key, value] of Object.entries(perk.effects)) {
        total[key] = (total[key] || 0) + value;
      }
    }
    return total;
  };

  // 점령 성공 직후 호출: 3택1 카드 선택 (스킵 불가, 전부 이득이므로)
  proto.showRunPerkSelection = function () {
    return new Promise((resolve) => {
      const ids = Object.keys(RUN_PERKS);
      // 미보유 퍽 우선 노출, 부족하면 보유 퍽 중복(스택) 허용
      const owned = new Set(this.runPerks || []);
      const fresh = ids.filter((id) => !owned.has(id));
      const pool = [...fresh.sort(() => Math.random() - 0.5), ...ids.sort(() => Math.random() - 0.5)];
      const offered = [];
      for (const id of pool) {
        if (!offered.includes(id)) offered.push(id);
        if (offered.length === 3) break;
      }

      const overlay = document.createElement("div");
      overlay.id = "run-perk-overlay";
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.92);
        z-index: 99997;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 14px;
        font-family: var(--term-font);
        padding: 16px; box-sizing: border-box;
      `;

      const title = document.createElement("div");
      title.style.cssText = `color: #ffcc00; font-size: 20px; text-shadow: 0 0 12px #ffcc00; text-align: center;`;
      title.innerText = "⬡ SYSTEM SALVAGE ⬡";
      const subtitle = document.createElement("div");
      subtitle.style.cssText = `color: #00ff88; font-size: 13px; text-align: center;`;
      subtitle.innerText = "[PDX-01] 점령 보상이에요! 하나 고르세요, 해커님! (이번 런 한정)";
      overlay.appendChild(title);
      overlay.appendChild(subtitle);

      const row = document.createElement("div");
      row.style.cssText = `display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 100%;`;
      overlay.appendChild(row);

      offered.forEach((id) => {
        const perk = RUN_PERKS[id];
        const stack = (this.runPerks || []).filter((p) => p === id).length;
        const card = document.createElement("button");
        card.style.cssText = `
          width: 150px; min-height: 150px;
          background: rgba(0, 30, 15, 0.9);
          border: 2px solid #00ff88;
          border-radius: 8px;
          color: #ccffdd;
          font-family: var(--term-font);
          cursor: pointer;
          padding: 12px 8px;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          transition: transform 0.15s, box-shadow 0.15s;
        `;
        card.innerHTML = `
          <div style="font-size: 30px;">${perk.icon}</div>
          <div style="font-size: 14px; color: #00ff88; font-weight: bold;">${perk.name}${stack > 0 ? ` <span style="color:#ffcc00;">x${stack + 1}</span>` : ""}</div>
          <div style="font-size: 11px; color: #aaccbb; line-height: 1.4;">${perk.desc}</div>
        `;
        card.onmouseenter = () => {
          card.style.transform = "translateY(-4px) scale(1.04)";
          card.style.boxShadow = "0 0 18px rgba(0, 255, 136, 0.5)";
        };
        card.onmouseleave = () => {
          card.style.transform = "none";
          card.style.boxShadow = "none";
        };
        card.onclick = () => {
          this.runPerks = this.runPerks || [];
          this.runPerks.push(id);
          this.saveRunPerks();
          // 실드 최대치 퍽은 즉시 반영
          if (perk.effects.shieldMaxBonus) {
            this.applyShieldUpgradeBonuses?.();
          }
          overlay.remove();
          resolve(id);
        };
        row.appendChild(card);
      });

      document.body.appendChild(overlay);
    });
  };
}
