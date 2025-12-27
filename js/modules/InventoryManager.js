/**
 * InventoryManager - 인벤토리 및 장비 슬롯 관리
 * 
 * 구조:
 * - 장비 슬롯 4개 (최대) - 처음 1개만 해금, 나머지는 데이터로 해금
 * - 인벤토리 20칸 - 보유 아이템
 * - 타입 구분 없이 단순 장착 (중복 가능)
 */
export class InventoryManager {
    constructor() {
        // 장비 슬롯 (최대 4개)
        this.equipSlots = [null, null, null, null];
        
        // 슬롯 해금 상태 (처음엔 1개만 해금)
        this.unlockedSlots = 1;
        
        // 슬롯 해금 비용 (2번째, 3번째, 4번째)
        this.slotUnlockCosts = [500, 1500, 5000];
        
        // 인벤토리 (20칸)
        this.inventory = new Array(20).fill(null);
        
        this.loadState();
    }

    /**
     * 슬롯이 해금되었는지 확인
     */
    isSlotUnlocked(slotIndex) {
        return slotIndex < this.unlockedSlots;
    }

    /**
     * 다음 슬롯 해금 비용 반환
     */
    getNextSlotUnlockCost() {
        if (this.unlockedSlots >= 4) return null; // 모두 해금됨
        return this.slotUnlockCosts[this.unlockedSlots - 1];
    }

    /**
     * 슬롯 해금 (데이터 소비)
     * @returns {boolean} 성공 여부
     */
    unlockSlot(currentMoney, onMoneySpend) {
        if (this.unlockedSlots >= 4) return { success: false, message: "모든 슬롯이 해금됨" };
        
        const cost = this.getNextSlotUnlockCost();
        if (currentMoney < cost) {
            return { success: false, message: `데이터 부족 (필요: ${cost})` };
        }
        
        // 비용 차감 콜백 호출
        if (onMoneySpend) onMoneySpend(cost);
        
        this.unlockedSlots++;
        this.saveState();
        
        return { success: true, message: `슬롯 ${this.unlockedSlots} 해금됨!` };
    }

    /**
     * 장비 장착 (인벤토리에서 슬롯으로)
     */
    equip(inventoryIndex, slotIndex) {
        // 슬롯 범위 체크
        if (slotIndex < 0 || slotIndex >= 4) return { success: false, message: "잘못된 슬롯" };
        
        // 슬롯 해금 체크
        if (!this.isSlotUnlocked(slotIndex)) {
            return { success: false, message: "슬롯이 잠겨 있음" };
        }
        
        // 인벤토리 아이템 체크
        const item = this.inventory[inventoryIndex];
        if (!item) return { success: false, message: "아이템 없음" };
        
        // 기존 장비가 있으면 인벤토리로 이동
        const oldItem = this.equipSlots[slotIndex];
        
        // 장착
        this.equipSlots[slotIndex] = item;
        this.inventory[inventoryIndex] = oldItem; // 교체 (null이거나 기존 장비)
        
        this.saveState();
        return { success: true, message: `${item.name} 장착됨` };
    }

    /**
     * 장비 해제 (슬롯에서 인벤토리로)
     */
    unequip(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 4) return { success: false, message: "잘못된 슬롯" };
        
        const item = this.equipSlots[slotIndex];
        if (!item) return { success: false, message: "장착된 아이템 없음" };
        
        // 빈 인벤토리 슬롯 찾기
        const emptySlot = this.inventory.findIndex(s => s === null);
        if (emptySlot === -1) {
            return { success: false, message: "인벤토리 가득 참" };
        }
        
        // 해제
        this.inventory[emptySlot] = item;
        this.equipSlots[slotIndex] = null;
        
        this.saveState();
        return { success: true, message: `${item.name} 해제됨` };
    }

    /**
     * 인벤토리에 아이템 추가
     */
    addToInventory(item) {
        const emptySlot = this.inventory.findIndex(s => s === null);
        if (emptySlot === -1) {
            return { success: false, message: "인벤토리 가득 참" };
        }
        
        this.inventory[emptySlot] = item;
        this.saveState();
        return { success: true, slotIndex: emptySlot };
    }

    /**
     * 인벤토리에서 아이템 제거
     */
    removeFromInventory(inventoryIndex) {
        if (inventoryIndex < 0 || inventoryIndex >= 20) return false;
        
        const item = this.inventory[inventoryIndex];
        this.inventory[inventoryIndex] = null;
        this.saveState();
        return item;
    }

    /**
     * 장착된 아이템들의 효과 합산
     * @returns {Object} 효과별 총합
     */
    getEquippedEffects() {
        const effects = {
            convert: 0,      // 적 전환 확률
            chain: 0,        // 연쇄 데미지
            chainRadius: 0,  // 연쇄 범위
            lifesteal: 0,    // 쉴드 회복
            attackSpeed: 0,  // 공속 증가
            dropRate: 0      // 드롭률 증가
        };
        
        this.equipSlots.forEach((item, idx) => {
            if (item && this.isSlotUnlocked(idx)) {
                const effect = item.effect;
                if (!effect) return;
                
                switch (effect.type) {
                    case "convert":
                        effects.convert += effect.value;
                        break;
                    case "chain":
                        effects.chain += effect.value;
                        effects.chainRadius = Math.max(effects.chainRadius, effect.radius || 50);
                        break;
                    case "lifesteal":
                        effects.lifesteal += effect.value;
                        break;
                    case "attackSpeed":
                        effects.attackSpeed += effect.value;
                        break;
                    case "dropRate":
                        effects.dropRate += effect.value;
                        break;
                }
            }
        });
        
        return effects;
    }

    /**
     * 데이터 반환 (UI용)
     */
    getData() {
        return {
            equipSlots: this.equipSlots,
            inventory: this.inventory,
            unlockedSlots: this.unlockedSlots,
            nextUnlockCost: this.getNextSlotUnlockCost()
        };
    }

    /**
     * 저장
     */
    saveState() {
        const state = {
            equipSlots: this.equipSlots,
            inventory: this.inventory,
            unlockedSlots: this.unlockedSlots
        };
        localStorage.setItem("inventory_state", JSON.stringify(state));
    }

    /**
     * 로드
     */
    loadState() {
        try {
            const saved = localStorage.getItem("inventory_state");
            if (saved) {
                const state = JSON.parse(saved);
                this.equipSlots = state.equipSlots || [null, null, null, null];
                this.inventory = state.inventory || new Array(20).fill(null);
                this.unlockedSlots = state.unlockedSlots || 1;
            }
        } catch (e) {
            console.error("Failed to load inventory state:", e);
        }
    }

    /**
     * 리셋
     */
    reset() {
        this.equipSlots = [null, null, null, null];
        this.inventory = new Array(20).fill(null);
        this.unlockedSlots = 1;
        this.saveState();
    }
}
