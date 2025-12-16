/**
 * StageManager - 맵 및 스테이지 관리
 */
export class StageManager {
    constructor() {
        // 맵 데이터
        this.stages = [
            {
                id: 0,
                name: "Safe Zone",
                type: "safe",
                conquered: true, // 항상 소유
                position: { row: 4, col: 1 }, // 맨 아래 중앙
                connections: [1, 2], // 연결된 스테이지
                enemyTypes: ["basic"],
                spawnRate: 8,
                hasPages: false,
                description: "Home Base - Your starting point"
            },
            {
                id: 1,
                name: "Sector Alpha",
                type: "conquest",
                conquered: false,
                position: { row: 3, col: 0 }, // 하단 좌측
                connections: [0, 3], // Safe Zone, Farming Zone
                enemyTypes: ["basic", "fast"],
                spawnRate: 1.5,
                hasPages: true,
                description: "Entry point - Low threat level"
            },
            {
                id: 2,
                name: "Sector Beta",
                type: "conquest",
                conquered: false,
                position: { row: 3, col: 2 }, // 하단 우측
                connections: [0, 3], // Safe Zone, Farming Zone
                enemyTypes: ["basic", "tank"],
                spawnRate: 1.5,
                hasPages: true,
                description: "Entry point - Low threat level"
            },
            {
                id: 3,
                name: "Data Mine",
                type: "farming",
                conquered: false, // 점령 불가하지만 진입 가능
                position: { row: 2, col: 1 }, // 중앙
                connections: [1, 2, 4, 5],
                enemyTypes: ["basic", "fast", "tank"],
                spawnRate: 1.0,
                hasPages: false, // 페이지 없이 무한 파밍
                description: "Neutral Zone - High resource yield"
            },
            {
                id: 4,
                name: "Sector Gamma",
                type: "conquest",
                conquered: false,
                position: { row: 1, col: 0 }, // 상단 좌측
                connections: [3, 6], // Farming Zone, Boss
                enemyTypes: ["fast", "tank", "elite"],
                spawnRate: 1.0,
                hasPages: true,
                description: "Advanced sector - High threat"
            },
            {
                id: 5,
                name: "Sector Delta",
                type: "conquest",
                conquered: false,
                position: { row: 1, col: 2 }, // 상단 우측
                connections: [3, 6], // Farming Zone, Boss
                enemyTypes: ["fast", "tank", "elite"],
                spawnRate: 1.0,
                hasPages: true,
                description: "Advanced sector - High threat"
            },
            {
                id: 6,
                name: "CORE NEXUS",
                type: "boss",
                conquered: false,
                position: { row: 0, col: 1 }, // 맨 위 중앙
                connections: [4, 5],
                enemyTypes: ["elite", "boss"],
                spawnRate: 0.5,
                hasPages: true,
                description: "FINAL TARGET - Boss awaits"
            }
        ];

        this.currentStageId = 0; // 현재 위치한 스테이지
        this.loadState();
    }

    /**
     * 현재 스테이지 정보 반환
     */
    getCurrentStage() {
        return this.stages.find(s => s.id === this.currentStageId);
    }

    /**
     * 스테이지 ID로 정보 조회
     */
    getStage(id) {
        return this.stages.find(s => s.id === id);
    }

    /**
     * 이동 가능한 스테이지 목록
     */
    getAccessibleStages() {
        const current = this.getCurrentStage();
        // 현재 스테이지와 연결된 스테이지들
        const connectedIds = current.connections;
        
        // 점령한 스테이지들은 어디서든 이동 가능
        const conqueredIds = this.stages
            .filter(s => s.conquered)
            .map(s => s.id);
        
        // 합집합
        const accessibleIds = [...new Set([...connectedIds, ...conqueredIds])];
        
        return accessibleIds.map(id => this.getStage(id));
    }

    /**
     * 스테이지로 이동
     */
    moveToStage(stageId) {
        const stage = this.getStage(stageId);
        if (!stage) return { success: false, message: "Stage not found" };

        const accessible = this.getAccessibleStages();
        if (!accessible.some(s => s.id === stageId)) {
            return { success: false, message: "Cannot access this stage" };
        }

        this.currentStageId = stageId;
        this.saveState();
        return { success: true, stage: stage };
    }

    /**
     * 스테이지 점령
     */
    conquerStage(stageId) {
        const stage = this.getStage(stageId);
        if (!stage) return false;
        if (stage.type === "farming") return false; // 파밍존은 점령 불가
        if (stage.type === "safe") return false; // 안전영역도 점령 불필요

        stage.conquered = true;
        this.saveState();
        return true;
    }

    /**
     * 점령한 스테이지 수
     */
    getConqueredCount() {
        return this.stages.filter(s => s.conquered && s.type === "conquest").length;
    }

    /**
     * 맵 렌더링용 데이터
     */
    getMapData() {
        return {
            stages: this.stages,
            currentStageId: this.currentStageId,
            conqueredCount: this.getConqueredCount()
        };
    }

    /**
     * 상태 저장
     */
    saveState() {
        const state = {
            currentStageId: this.currentStageId,
            conqueredStages: this.stages
                .filter(s => s.conquered)
                .map(s => s.id)
        };
        localStorage.setItem("stage_state", JSON.stringify(state));
    }

    /**
     * 상태 로드
     */
    loadState() {
        try {
            const saved = localStorage.getItem("stage_state");
            if (saved) {
                const state = JSON.parse(saved);
                this.currentStageId = state.currentStageId || 0;
                
                // 점령 상태 복원
                state.conqueredStages?.forEach(id => {
                    const stage = this.getStage(id);
                    if (stage) stage.conquered = true;
                });
            }
        } catch (e) {
            console.error("Failed to load stage state:", e);
        }
    }

    /**
     * 진행도 리셋
     */
    reset() {
        this.stages.forEach(s => {
            s.conquered = (s.id === 0); // Safe Zone만 유지
        });
        this.currentStageId = 0;
        this.saveState();
    }
}

