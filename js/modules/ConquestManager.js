export class ConquestManager {
    constructor() {
        this.conqueredStages = 0; // 총 점령 횟수
        this.mergedStacks = 0;    // 병합된 스택 수
        this.alliedVirusLevel = 1; // 아군 바이러스 체력/등급 (1부터 시작)
        this.alliedVirusCount = 30; // 주둔 바이러스 수 (기본 30마리 유지)
        
        // 시간 당 자동 채굴량 (점령지 보상)
        this.miningRate = 0; 
    }

    // 스테이지 점령 성공 시 호출
    conquerStage() {
        this.conqueredStages++;
        console.log(`[Conquest] Stage Conquered. Total: ${this.conqueredStages}`);
        
        // 점령지가 2개 이상이면 병합 시도
        if (this.conqueredStages >= 2) {
            this.mergeStages();
        } else {
            // 첫 점령 or 병합 후 남은 1개
            this.updateMiningRate();
        }
        
        return {
            total: this.conqueredStages,
            level: this.alliedVirusLevel,
            miningRate: this.miningRate
        };
    }

    // 병합 로직: 2개 스테이지 -> 1개 강력한 주둔지로 병합
    mergeStages() {
        // 병합 가능한 횟수 계산 (2개당 1번)
        const newMerges = Math.floor(this.conqueredStages / 2);
        
        if (newMerges > 0) {
            this.mergedStacks += newMerges;
            
            // 남은 스테이지 수 처리 (홀수면 1개 남음, 짝수면 0개)
            this.conqueredStages = this.conqueredStages % 2;
            
            // 아군 강화: 병합 1회당 레벨 +1
            this.alliedVirusLevel += newMerges;
            
            console.log(`[Conquest] Merged! New Level: ${this.alliedVirusLevel}, Remaining Stages: ${this.conqueredStages}`);
        }
        
        this.updateMiningRate();
    }

    updateMiningRate() {
        // 채굴량 공식: (기본 10 + 레벨 * 5) * (점령지 수 + 병합된 스택 * 1.5)
        // 병합된 곳이 효율이 더 좋게 설정
        const baseRate = 10 + (this.alliedVirusLevel - 1) * 5;
        this.miningRate = Math.floor(baseRate * (this.conqueredStages + this.mergedStacks * 1.5));
    }

    // 현재 아군 바이러스 정보 반환 (디펜스 모드에서 시각화용)
    getAlliedInfo() {
        return {
            level: this.alliedVirusLevel,
            count: this.alliedVirusCount,
            hp: this.alliedVirusLevel * 10, // 레벨당 체력 증가
            color: this.getVirusColor(this.alliedVirusLevel)
        };
    }

    getVirusColor(level) {
        if (level === 1) return "#00ff00"; // Green
        if (level === 2) return "#0088ff"; // Blue
        if (level === 3) return "#aa00ff"; // Purple
        if (level >= 4) return "#ffaa00"; // Orange
        return "#ffffff";
    }

    // 저장/로드 지원
    saveData() {
        return {
            conqueredStages: this.conqueredStages,
            mergedStacks: this.mergedStacks,
            alliedVirusLevel: this.alliedVirusLevel
        };
    }

    loadData(data) {
        if (!data) return;
        this.conqueredStages = data.conqueredStages || 0;
        this.mergedStacks = data.mergedStacks || 0;
        this.alliedVirusLevel = data.alliedVirusLevel || 1;
        this.updateMiningRate();
    }
}
