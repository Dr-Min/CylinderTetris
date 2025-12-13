export class PerkManager {
  constructor() {
    // 현재 게임(Run)에서 획득한 퍽 목록 (ID set)
    this.acquiredPerks = new Set();
    // 활성화된 효과 캐시 (중첩 등 계산 후 최종 값)
    this.activeEffects = {
      scoreMultiplier: 1.0,
      speedModifier: 1.0,
      bombChance: 0.0, // 기본 0으로 변경 (해금 필요)
      goldChance: 0.0,
      startLinesCleared: 0,
      reviveCount: 0,
      shopDiscount: 0.0,
    };

    // 퍽 데이터베이스 (트리 구조)
    this.perkTree = [
      // === 공격형 (Exploit) ===
      {
        id: "atk_root",
        name: "Exploit.init",
        desc: "특수 블록(폭탄) 등장 확률 +5%",
        cost: 500,
        type: "attack",
        parentId: null,
        effect: { bombChance: 0.05 },
      },
      {
        id: "atk_1",
        name: "Blast_Radius.ext",
        desc: "폭발 범위 증가 (구현 예정) / 점수 +10%",
        cost: 1000,
        type: "attack",
        parentId: "atk_root",
        effect: { scoreMultiplier: 0.1 },
      },
      {
        id: "atk_2",
        name: "Chain_Reaction.exe",
        desc: "연쇄 폭발 보너스 점수 +30%",
        cost: 1500,
        type: "attack",
        parentId: "atk_1",
        effect: { scoreMultiplier: 0.3 },
      },

      // === 방어형 (Security) ===
      {
        id: "def_root",
        name: "Firewall.init",
        desc: "블록 낙하 속도 10% 감소",
        cost: 500,
        type: "defense",
        parentId: null,
        effect: { speedModifier: -0.1 },
      },
      {
        id: "def_1",
        name: "Lag_Switch.v1",
        desc: "블록 낙하 속도 추가 15% 감소",
        cost: 1200,
        type: "defense",
        parentId: "def_root",
        effect: { speedModifier: -0.15 },
      },
      {
        id: "def_2",
        name: "Backup_Protocol.sys",
        desc: "게임 오버 시 1회 부활 (바닥 5줄 삭제)",
        cost: 2000,
        type: "defense",
        parentId: "def_1",
        effect: { reviveCount: 1 },
      },

      // === 유틸형 (Utility) ===
      {
        id: "util_root",
        name: "Miner.init",
        desc: "골드 블록(점수 5배) 등장 확률 +5%",
        cost: 600,
        type: "utility",
        parentId: null,
        effect: { goldChance: 0.05 },
      },
      {
        id: "util_1",
        name: "Data_Compression.zip",
        desc: "모든 획득 점수 +20%",
        cost: 1000,
        type: "utility",
        parentId: "util_root",
        effect: { scoreMultiplier: 0.2 },
      },
      {
        id: "util_2",
        name: "Grid_Defrag.bat",
        desc: "스테이지 시작 시 바닥 2줄 자동 삭제",
        cost: 1200,
        type: "utility",
        parentId: "util_1",
        effect: { startLinesCleared: 2 },
      },
    ];
  }

  // 초기화 (새 게임 시작 시)
  reset() {
    this.acquiredPerks.clear();
    this.activeEffects = {
      scoreMultiplier: 1.0,
      speedModifier: 1.0,
      bombChance: 0.0,
      goldChance: 0.0,
      startLinesCleared: 0,
      reviveCount: 0,
      shopDiscount: 0.0,
    };
  }

  getDiscountedPrice(cost) {
    if (!this.activeEffects.shopDiscount) return cost;
    return Math.floor(cost * (1 - this.activeEffects.shopDiscount));
  }

  // 퍽 구매 가능 여부 확인
  canUnlock(perkId, currentMoney) {
    if (this.acquiredPerks.has(perkId)) return false; // 이미 보유

    const perk = this.getPerk(perkId);
    if (!perk) return false;

    const finalCost = this.getDiscountedPrice(perk.cost);
    if (currentMoney < finalCost) return false; // 돈 부족

    // 루트 노드는 언제나 구매 가능
    if (!perk.parentId) return true;

    // 부모 노드를 가지고 있어야 구매 가능
    return this.acquiredPerks.has(perk.parentId);
  }

  // 퍽 해금 및 효과 적용
  unlock(perkId) {
    const perk = this.getPerk(perkId);
    if (!perk) return;

    this.acquiredPerks.add(perkId);
    this.applyEffect(perk.effect);
  }

  applyEffect(effect) {
    if (effect.scoreMultiplier)
      this.activeEffects.scoreMultiplier += effect.scoreMultiplier;
    if (effect.speedModifier)
      this.activeEffects.speedModifier += effect.speedModifier;
    if (effect.bombChance) this.activeEffects.bombChance += effect.bombChance;
    if (effect.goldChance) this.activeEffects.goldChance += effect.goldChance;
    if (effect.startLinesCleared)
      this.activeEffects.startLinesCleared += effect.startLinesCleared;
    if (effect.reviveCount)
      this.activeEffects.reviveCount += effect.reviveCount;
  }

  getPerk(id) {
    return this.perkTree.find((p) => p.id === id);
  }

  // UI 렌더링을 위한 트리 구조 반환
  getTreeStructure() {
    return this.perkTree;
  }

  // 현재 적용된 효과 반환
  getEffects() {
    return this.activeEffects;
  }
}
