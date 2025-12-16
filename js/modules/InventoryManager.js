/**
 * InventoryManager - 인벤토리 및 장비 슬롯 관리
 * 
 * 구조:
 * - 장비 슬롯 4개 (상단): 실제 착용 장비
 * - 인벤토리 20칸 (하단): 보유 아이템
 */
export class InventoryManager {
    constructor() {
        // 장비 슬롯 (4개) - 실제 착용 중인 장비
        this.equipSlots = [null, null, null, null];
        
        // 인벤토리 (20칸)
        this.inventory = new Array(20).fill(null);
        
        // 장비 타입 정의
        this.slotTypes = ["WEAPON", "ARMOR", "CHIP", "MODULE"];
        
        this.loadState();
    }

    /**
     * 장비 착용
     */
    equip(slotIndex, item) {
        if (slotIndex < 0 || slotIndex >= 4) return false;
        if (item && item.type !== this.slotTypes[slotIndex]) return false;
        
        // 기존 장비가 있으면 인벤토리로 이동
        const oldItem = this.equipSlots[slotIndex];
        if (oldItem) {
            const emptySlot = this.inventory.findIndex(s => s === null);
            if (emptySlot === -1) return false; // 인벤토리 가득 참
            this.inventory[emptySlot] = oldItem;
        }
        
        this.equipSlots[slotIndex] = item;
        this.saveState();
        return true;
    }

    /**
     * 장비 해제
     */
    unequip(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 4) return false;
        
        const item = this.equipSlots[slotIndex];
        if (!item) return false;
        
        const emptySlot = this.inventory.findIndex(s => s === null);
        if (emptySlot === -1) return false;
        
        this.inventory[emptySlot] = item;
        this.equipSlots[slotIndex] = null;
        this.saveState();
        return true;
    }

    /**
     * 인벤토리에서 장비 슬롯으로 이동
     */
    equipFromInventory(inventoryIndex, equipSlotIndex) {
        const item = this.inventory[inventoryIndex];
        if (!item) return false;
        if (item.type !== this.slotTypes[equipSlotIndex]) return false;
        
        // 기존 장비와 교체
        const oldEquip = this.equipSlots[equipSlotIndex];
        this.equipSlots[equipSlotIndex] = item;
        this.inventory[inventoryIndex] = oldEquip; // null이거나 기존 장비
        
        this.saveState();
        return true;
    }

    /**
     * 인벤토리에 아이템 추가
     */
    addToInventory(item) {
        const emptySlot = this.inventory.findIndex(s => s === null);
        if (emptySlot === -1) return false;
        
        this.inventory[emptySlot] = item;
        this.saveState();
        return true;
    }

    /**
     * 착용 장비의 총 스탯
     */
    getEquippedStats() {
        const stats = { damage: 0, defense: 0, speed: 0, special: null };
        
        this.equipSlots.forEach(item => {
            if (item) {
                stats.damage += item.damage || 0;
                stats.defense += item.defense || 0;
                stats.speed += item.speed || 0;
                if (item.special) stats.special = item.special;
            }
        });
        
        return stats;
    }

    /**
     * 인벤토리 데이터 반환
     */
    getData() {
        return {
            equipSlots: this.equipSlots,
            inventory: this.inventory,
            slotTypes: this.slotTypes
        };
    }

    /**
     * 저장
     */
    saveState() {
        const state = {
            equipSlots: this.equipSlots,
            inventory: this.inventory
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
        this.saveState();
    }
}

