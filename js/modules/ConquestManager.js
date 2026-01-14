export class ConquestManager {
    constructor() {
        this.conqueredStages = 0; // 총 점령 횟수
        this.mergedStacks = 0;    // 병합된 스택 수
        this.alliedVirusLevel = 1; // 아군 바이러스 체력/등급 (1부터 시작)
        
        // 시간 당 자동 채굴량 (점령지 보상)
        this.miningRate = 0; 
    }

    // 스테이지 점령 성공 시 호출
    conquerStage() {
        this.conqueredStages++;
        debugLog("Conquest", `Stage Conquered. Total: ${this.conqueredStages}`);
        
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
            
            debugLog("Conquest", `Merged! New Level: ${this.alliedVirusLevel}, Remaining Stages: ${this.conqueredStages}`);
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
        // 아군 수 = 점령지 + 병합 스택 * 2 (병합하면 더 많은 아군)
        // 기본값: 점령 전에는 3마리 (테스트용)
        const baseCount = 3;
        const conquestBonus = this.conqueredStages * 2 + this.mergedStacks * 4;
        
        return {
            level: this.alliedVirusLevel,
            count: baseCount + conquestBonus,
            hp: this.alliedVirusLevel * 10,
            color: "#00aaff" // 파란색으로 고정
        };
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
