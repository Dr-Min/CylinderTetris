/**
 * ItemDatabase - 아이템 정의 및 생성
 * 
 * 아이템 효과 타입:
 * - convert: 적 공격 시 아군 전환 확률
 * - chain: 피격 시 주변 연쇄 데미지
 * - lifesteal: 처치 시 쉴드 회복
 * - attackSpeed: 발사 속도 증가
 * - dropRate: 아이템 드롭 확률 증가
 */
export class ItemDatabase {
    constructor() {
        // 아이템 정의
        this.items = {
            // === 기본 아이템 (Common) ===
            "convert_chip_1": {
                id: "convert_chip_1",
                name: "전환 칩 Mk.I",
                description: "코어 공격 시 3% 확률로 적을 아군으로 전환",
                rarity: "common",
                icon: "🔄",
                effect: { type: "convert", value: 0.03 }
            },
            "static_coil_1": {
                id: "static_coil_1",
                name: "스태틱 코일 Mk.I",
                description: "적 피격 시 주변 적에게 15 연쇄 데미지",
                rarity: "common",
                icon: "⚡",
                effect: { type: "chain", value: 15, radius: 50 }
            },
            "absorb_core_1": {
                id: "absorb_core_1",
                name: "흡수 코어 Mk.I",
                description: "적 처치 시 쉴드 +3 회복",
                rarity: "common",
                icon: "💚",
                effect: { type: "lifesteal", value: 3 }
            },
            "speed_module_1": {
                id: "speed_module_1",
                name: "가속 모듈 Mk.I",
                description: "발사 속도 +10%",
                rarity: "common",
                icon: "🚀",
                effect: { type: "attackSpeed", value: 0.1 }
            },
            "luck_chip_1": {
                id: "luck_chip_1",
                name: "행운의 칩 Mk.I",
                description: "아이템 드롭 확률 +3%",
                rarity: "common",
                icon: "🍀",
                effect: { type: "dropRate", value: 0.03 }
            },

            // === 레어 아이템 (Rare) ===
            "convert_chip_2": {
                id: "convert_chip_2",
                name: "전환 칩 Mk.II",
                description: "코어 공격 시 6% 확률로 적을 아군으로 전환",
                rarity: "rare",
                icon: "🔄",
                effect: { type: "convert", value: 0.06 }
            },
            "static_coil_2": {
                id: "static_coil_2",
                name: "스태틱 코일 Mk.II",
                description: "적 피격 시 주변 적에게 30 연쇄 데미지",
                rarity: "rare",
                icon: "⚡",
                effect: { type: "chain", value: 30, radius: 70 }
            },
            "absorb_core_2": {
                id: "absorb_core_2",
                name: "흡수 코어 Mk.II",
                description: "적 처치 시 쉴드 +6 회복",
                rarity: "rare",
                icon: "💚",
                effect: { type: "lifesteal", value: 6 }
            },
            "speed_module_2": {
                id: "speed_module_2",
                name: "가속 모듈 Mk.II",
                description: "발사 속도 +20%",
                rarity: "rare",
                icon: "🚀",
                effect: { type: "attackSpeed", value: 0.2 }
            },
            "luck_chip_2": {
                id: "luck_chip_2",
                name: "행운의 칩 Mk.II",
                description: "아이템 드롭 확률 +6%",
                rarity: "rare",
                icon: "🍀",
                effect: { type: "dropRate", value: 0.06 }
            },

            // === 레전더리 아이템 (Legendary) ===
            "convert_chip_3": {
                id: "convert_chip_3",
                name: "전환 칩 Mk.III",
                description: "코어 공격 시 10% 확률로 적을 아군으로 전환",
                rarity: "legendary",
                icon: "🔄",
                effect: { type: "convert", value: 0.10 }
            },
            "static_coil_3": {
                id: "static_coil_3",
                name: "스태틱 코일 Mk.III",
                description: "적 피격 시 주변 적에게 50 연쇄 데미지",
                rarity: "legendary",
                icon: "⚡",
                effect: { type: "chain", value: 50, radius: 100 }
            },
            "absorb_core_3": {
                id: "absorb_core_3",
                name: "흡수 코어 Mk.III",
                description: "적 처치 시 쉴드 +10 회복",
                rarity: "legendary",
                icon: "💚",
                effect: { type: "lifesteal", value: 10 }
            },
            "speed_module_3": {
                id: "speed_module_3",
                name: "가속 모듈 Mk.III",
                description: "발사 속도 +35%",
                rarity: "legendary",
                icon: "🚀",
                effect: { type: "attackSpeed", value: 0.35 }
            },
            "luck_chip_3": {
                id: "luck_chip_3",
                name: "행운의 칩 Mk.III",
                description: "아이템 드롭 확률 +10%",
                rarity: "legendary",
                icon: "🍀",
                effect: { type: "dropRate", value: 0.10 }
            },

            // === 블루프린트 조각 (해금용) ===
            "blueprint_common": {
                id: "blueprint_common",
                name: "설계도 조각",
                description: "해금 진행률 +1~3%",
                rarity: "blueprint",
                icon: "📋",
                effect: { type: "blueprint", minValue: 1, maxValue: 3 }
            },
            "blueprint_rare": {
                id: "blueprint_rare",
                name: "암호화된 설계도",
                description: "해금 진행률 +5~10%",
                rarity: "blueprint",
                icon: "📜",
                effect: { type: "blueprint", minValue: 5, maxValue: 10 }
            },
            "blueprint_legendary": {
                id: "blueprint_legendary",
                name: "코어 설계도",
                description: "해금 진행률 +15~25%",
                rarity: "blueprint",
                icon: "🔐",
                effect: { type: "blueprint", minValue: 15, maxValue: 25 }
            }
        };

        // 등급별 색상
        this.rarityColors = {
            common: "#ffffff",
            rare: "#00aaff",
            legendary: "#ffaa00",
            blueprint: "#00ffff"  // 청록색 (해금용)
        };

        // 등급별 드롭 확률 (기본)
        this.rarityWeights = {
            common: 0.70,    // 70%
            rare: 0.25,      // 25%
            legendary: 0.05  // 5%
        };
        
        // 등급별 DATA 변환 가격
        this.rarityDataValue = {
            common: 50,
            rare: 150,
            legendary: 500
        };
    }
    
    /**
     * 아이템을 DATA로 변환할 때의 가치
     */
    getItemDataValue(item) {
        return this.rarityDataValue[item.rarity] || 50;
    }

    /**
     * 아이템 ID로 아이템 정보 조회
     */
    getItem(id) {
        return this.items[id] || null;
    }

    /**
     * 랜덤 아이템 생성 (등급 확률 적용)
     */
    generateRandomItem() {
        // 등급 결정
        const roll = Math.random();
        let rarity;
        if (roll < this.rarityWeights.legendary) {
            rarity = "legendary";
        } else if (roll < this.rarityWeights.legendary + this.rarityWeights.rare) {
            rarity = "rare";
        } else {
            rarity = "common";
        }

        // 해당 등급의 아이템 필터링
        const itemsOfRarity = Object.values(this.items).filter(item => item.rarity === rarity);
        
        // 랜덤 선택
        const selected = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
        
        // 인스턴스 생성 (고유 ID 부여)
        return {
            ...selected,
            instanceId: `${selected.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };
    }

    /**
     * 블루프린트 아이템 생성 (해금용)
     * @param {number|null} debugAmount - 디버그용 고정 진행률 증가량 (null이면 랜덤)
     */
    generateBlueprintItem(debugAmount = null) {
        // 등급 결정 (common 70%, rare 25%, legendary 5%)
        const roll = Math.random();
        let blueprintId;
        if (roll < 0.05) {
            blueprintId = "blueprint_legendary";
        } else if (roll < 0.30) {
            blueprintId = "blueprint_rare";
        } else {
            blueprintId = "blueprint_common";
        }
        
        const template = this.items[blueprintId];
        
        // 진행률 증가량 결정
        let value;
        if (debugAmount !== null) {
            value = debugAmount;
        } else {
            const min = template.effect.minValue;
            const max = template.effect.maxValue;
            value = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        
        return {
            ...template,
            instanceId: `${blueprintId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            effect: { ...template.effect, value }
        };
    }

    /**
     * 등급 색상 반환
     */
    getRarityColor(rarity) {
        return this.rarityColors[rarity] || "#ffffff";
    }

    /**
     * 모든 아이템 목록 반환
     */
    getAllItems() {
        return Object.values(this.items);
    }

    /**
     * 특정 효과 타입의 아이템들 반환
     */
    getItemsByEffect(effectType) {
        return Object.values(this.items).filter(item => item.effect.type === effectType);
    }
}

