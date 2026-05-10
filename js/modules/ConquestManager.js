export class ConquestManager {
    constructor() {
        this.conqueredStages = 0;
        this.mergedStacks = 0;
        this.alliedVirusLevel = 1;
        this.miningRate = 0;
    }

    sanitizeCount(value, fallback = 0, minimum = 0) {
        const candidate = Array.isArray(value) ? value.length : Number(value);
        if (!Number.isFinite(candidate)) return fallback;
        return Math.max(minimum, Math.floor(candidate));
    }

    applyConquestTotal(total) {
        const count = this.sanitizeCount(total, 0);
        this.conqueredStages = count % 2;
        this.mergedStacks = Math.floor(count / 2);
        this.alliedVirusLevel = 1 + this.mergedStacks;
        this.updateMiningRate();
    }

    conquerStage() {
        this.conqueredStages++;
        debugLog("Conquest", `Stage Conquered. Total: ${this.conqueredStages}`);

        if (this.conqueredStages >= 2) {
            this.mergeStages();
        } else {
            this.updateMiningRate();
        }

        return {
            total: this.conqueredStages,
            level: this.alliedVirusLevel,
            miningRate: this.miningRate
        };
    }

    mergeStages() {
        const newMerges = Math.floor(this.conqueredStages / 2);

        if (newMerges > 0) {
            this.mergedStacks += newMerges;
            this.conqueredStages = this.conqueredStages % 2;
            this.alliedVirusLevel += newMerges;

            debugLog("Conquest", `Merged! New Level: ${this.alliedVirusLevel}, Remaining Stages: ${this.conqueredStages}`);
        }

        this.updateMiningRate();
    }

    updateMiningRate() {
        const baseRate = 10 + (this.alliedVirusLevel - 1) * 5;
        this.miningRate = Math.floor(baseRate * (this.conqueredStages + this.mergedStacks * 1.5));
    }

    getAlliedInfo() {
        const baseCount = 3;
        const conquestBonus = this.conqueredStages * 2 + this.mergedStacks * 4;

        return {
            level: this.alliedVirusLevel,
            count: baseCount + conquestBonus,
            hp: this.alliedVirusLevel * 10,
            color: "#00aaff"
        };
    }

    saveData() {
        return {
            conqueredStages: this.conqueredStages,
            mergedStacks: this.mergedStacks,
            alliedVirusLevel: this.alliedVirusLevel
        };
    }

    loadData(data) {
        if (!data) return;
        const rawConqueredStages = this.sanitizeCount(data.conqueredStages, 0);
        this.mergedStacks = this.sanitizeCount(data.mergedStacks, 0);
        this.alliedVirusLevel = this.sanitizeCount(data.alliedVirusLevel, 1, 1);
        this.conqueredStages = rawConqueredStages % 2;
        const extraMerges = Math.floor(rawConqueredStages / 2);
        this.mergedStacks += extraMerges;
        this.alliedVirusLevel = Math.max(this.alliedVirusLevel, 1 + this.mergedStacks);
        this.updateMiningRate();
    }

    reset() {
        this.conqueredStages = 0;
        this.mergedStacks = 0;
        this.alliedVirusLevel = 1;
        this.miningRate = 0;
    }
}
