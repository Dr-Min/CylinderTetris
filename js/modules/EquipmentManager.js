export class EquipmentManager {
    constructor() {
        this.inventory = [];
        this.equipped = {
            weapon: null,
            shield: null,
            chip: null
        };
        
        // 장비 등급 정의
        this.RARITY = {
            COMMON: { name: "Common", color: "#ffffff", chance: 0.6 },
            RARE: { name: "Rare", color: "#0088ff", chance: 0.3 },
            LEGENDARY: { name: "Legendary", color: "#ffaa00", chance: 0.1 }
        };
    }

    // 랜덤 장비 생성
    generateEquipment(stageLevel) {
        const rarityRoll = Math.random();
        let rarity = this.RARITY.COMMON;
        
        if (rarityRoll < this.RARITY.LEGENDARY.chance) rarity = this.RARITY.LEGENDARY;
        else if (rarityRoll < this.RARITY.LEGENDARY.chance + this.RARITY.RARE.chance) rarity = this.RARITY.RARE;
        
        const types = ["weapon", "shield", "chip"];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const baseStat = (stageLevel * 5) + (rarity === this.RARITY.LEGENDARY ? 20 : rarity === this.RARITY.RARE ? 10 : 0);
        
        const item = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            type: type,
            name: `${rarity.name} ${this.getTypeName(type)}`,
            rarity: rarity,
            stats: {
                power: Math.floor(baseStat * (0.8 + Math.random() * 0.4))
            }
        };
        
        return item;
    }
    
    getTypeName(type) {
        if (type === "weapon") return "Blaster";
        if (type === "shield") return "Generator";
        return "Overclocker";
    }

    addItem(item) {
        this.inventory.push(item);
        debugLog("Item", "Item added:", item);
        
        // 자동 장착 (더 좋은 거면)
        this.autoEquip(item);
    }
    
    autoEquip(item) {
        const current = this.equipped[item.type];
        if (!current || item.stats.power > current.stats.power) {
            this.equipped[item.type] = item;
            debugLog("Item", "Auto Equipped:", item);
            return true;
        }
        return false;
    }
    
    // 현재 장착 효과 계산
    getTotalStats() {
        let stats = { damage: 0, shield: 0, speed: 0 };
        
        if (this.equipped.weapon) stats.damage += this.equipped.weapon.stats.power;
        if (this.equipped.shield) stats.shield += this.equipped.weapon.stats.power * 2; // 쉴드는 체력 위주
        if (this.equipped.chip) stats.speed += this.equipped.chip.stats.power * 0.01;
        
        return stats;
    }
}
