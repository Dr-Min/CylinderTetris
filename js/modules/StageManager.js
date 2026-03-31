/**
 * StageManager - stage graph and map state
 */
export class StageManager {
    constructor() {
        this.stages = [
            {
                id: 0,
                name: "Safe Zone",
                type: "safe",
                conquered: true,
                position: { row: 5, col: 1 },
                connections: [1, 2],
                enemyTypes: ["basic"],
                spawnRate: 2.67,
                hasPages: false,
                description: "Home Base - Your starting point"
            },
            {
                id: 1,
                name: "Sector Alpha",
                type: "conquest",
                conquered: false,
                position: { row: 4, col: 0 },
                connections: [0, 3],
                enemyTypes: ["basic", "fast"],
                spawnRate: 0.4,
                hasPages: true,
                maxPages: 5,
                difficultyScale: 1.5,
                description: "Entry point - Low threat level"
            },
            {
                id: 2,
                name: "Sector Beta",
                type: "conquest",
                conquered: false,
                position: { row: 4, col: 2 },
                connections: [0, 3],
                enemyTypes: ["basic", "tank"],
                spawnRate: 0.4,
                hasPages: true,
                maxPages: 5,
                difficultyScale: 1.5,
                description: "Entry point - Low threat level"
            },
            {
                id: 3,
                name: "Data Mine",
                type: "farming",
                conquered: false,
                position: { row: 3, col: 1 },
                connections: [1, 2, 4, 5, 6],
                enemyTypes: ["basic", "fast", "tank"],
                spawnRate: 0.33,
                hasPages: false,
                description: "Neutral Zone - High resource yield"
            },
            {
                id: 4,
                name: "Sector Gamma",
                type: "conquest",
                conquered: false,
                position: { row: 2, col: 0 },
                connections: [3, 7],
                enemyTypes: ["fast", "tank", "elite"],
                spawnRate: 0.33,
                hasPages: true,
                maxPages: 8,
                difficultyScale: 1.25,
                description: "Central flank - Escalating threat"
            },
            {
                id: 5,
                name: "Sector Delta",
                type: "conquest",
                conquered: false,
                position: { row: 2, col: 1 },
                connections: [3, 7, 8],
                enemyTypes: ["fast", "tank", "elite"],
                spawnRate: 0.31,
                hasPages: true,
                maxPages: 9,
                difficultyScale: 1.2,
                description: "Central lane - Sustained pressure"
            },
            {
                id: 6,
                name: "Sector Epsilon",
                type: "conquest",
                conquered: false,
                position: { row: 2, col: 2 },
                connections: [3, 8],
                enemyTypes: ["fast", "tank", "elite"],
                spawnRate: 0.33,
                hasPages: true,
                maxPages: 8,
                difficultyScale: 1.25,
                description: "Central flank - Dense resistance"
            },
            {
                id: 7,
                name: "Sector Zeta",
                type: "conquest",
                conquered: false,
                position: { row: 1, col: 0 },
                connections: [4, 5, 9],
                enemyTypes: ["tank", "elite"],
                spawnRate: 0.29,
                hasPages: true,
                maxPages: 12,
                difficultyScale: 1.0,
                description: "Upper defense ring - Heavy contact"
            },
            {
                id: 8,
                name: "Sector Eta",
                type: "conquest",
                conquered: false,
                position: { row: 1, col: 2 },
                connections: [5, 6, 9],
                enemyTypes: ["fast", "elite", "tank"],
                spawnRate: 0.29,
                hasPages: true,
                maxPages: 12,
                difficultyScale: 1.0,
                description: "Upper defense ring - Reinforced sector"
            },
            {
                id: 9,
                name: "CORE NEXUS",
                type: "boss",
                conquered: false,
                position: { row: 0, col: 1 },
                connections: [7, 8],
                enemyTypes: ["elite", "boss"],
                spawnRate: 0.17,
                hasPages: true,
                maxPages: 15,
                difficultyScale: 0.8,
                description: "FINAL TARGET - Boss awaits"
            }
        ];

        this.currentStageId = 0;
        this.loadState();
    }

    getCurrentStage() {
        return this.stages.find((stage) => stage.id === this.currentStageId);
    }

    getStage(id) {
        return this.stages.find((stage) => stage.id === id);
    }

    getAccessibleStages() {
        const accessible = new Set();

        accessible.add(0);

        const safeZone = this.getStage(0);
        safeZone?.connections.forEach((id) => accessible.add(id));

        this.stages.filter((stage) => stage.conquered).forEach((stage) => {
            accessible.add(stage.id);
            stage.connections.forEach((id) => accessible.add(id));
        });

        this.stages
            .filter((stage) => stage.type === "farming" && stage.visited)
            .forEach((stage) => {
                accessible.add(stage.id);
                stage.connections.forEach((id) => accessible.add(id));
            });

        return [...accessible]
            .map((id) => this.getStage(id))
            .filter(Boolean);
    }

    isAccessible(stageId) {
        const accessible = this.getAccessibleStages();
        return accessible.some((stage) => stage.id === stageId);
    }

    getMapDataWithStatus() {
        const accessible = this.getAccessibleStages().map((stage) => stage.id);

        return this.stages.map((stage) => ({
            ...stage,
            isCurrent: stage.id === this.currentStageId,
            isAccessible: accessible.includes(stage.id),
            isLocked: !accessible.includes(stage.id) && !stage.conquered
        }));
    }

    moveToStage(stageId) {
        const stage = this.getStage(stageId);
        if (!stage) return { success: false, message: "Stage not found" };

        const accessible = this.getAccessibleStages();
        if (!accessible.some((candidate) => candidate.id === stageId)) {
            return { success: false, message: "Cannot access this stage" };
        }

        this.currentStageId = stageId;

        if (stage.type === "farming") {
            stage.visited = true;
        }

        this.saveState();
        return { success: true, stage };
    }

    conquerStage(stageId) {
        const stage = this.getStage(stageId);
        if (!stage) return false;
        if (stage.type === "farming") return false;
        if (stage.type === "safe") return false;

        stage.conquered = true;
        this.saveState();
        return true;
    }

    setConquered(stageId, conquered) {
        const stage = this.getStage(stageId);
        if (!stage) return false;

        stage.conquered = conquered;
        this.saveState();
        return true;
    }

    getConqueredCount() {
        return this.stages.filter((stage) => stage.conquered && stage.type === "conquest").length;
    }

    getTotalConquestCount() {
        return this.stages.filter((stage) => stage.type === "conquest").length;
    }

    getMapData() {
        const rowCount = this.stages.reduce(
            (max, stage) => Math.max(max, (stage.position?.row ?? 0) + 1),
            0
        );

        return {
            stages: this.stages,
            currentStageId: this.currentStageId,
            conqueredCount: this.getConqueredCount(),
            totalConquestCount: this.getTotalConquestCount(),
            rowCount
        };
    }

    saveState() {
        const state = {
            currentStageId: this.currentStageId,
            conqueredStages: this.stages
                .filter((stage) => stage.conquered)
                .map((stage) => stage.id),
            visitedStages: this.stages
                .filter((stage) => stage.visited)
                .map((stage) => stage.id)
        };
        localStorage.setItem("stage_state", JSON.stringify(state));
    }

    loadState() {
        try {
            const saved = localStorage.getItem("stage_state");
            if (saved) {
                const state = JSON.parse(saved);
                this.currentStageId = state.currentStageId || 0;

                state.conqueredStages?.forEach((id) => {
                    const stage = this.getStage(id);
                    if (stage) stage.conquered = true;
                });

                state.visitedStages?.forEach((id) => {
                    const stage = this.getStage(id);
                    if (stage) stage.visited = true;
                });
            }
        } catch (e) {
            console.error("Failed to load stage state:", e);
        }
        this.currentStageId = 0;
        this.saveState();
    }

    reset() {
        this.stages.forEach((stage) => {
            stage.conquered = stage.id === 0;
            stage.visited = false;
        });
        this.currentStageId = 0;
        this.saveState();
    }
}
