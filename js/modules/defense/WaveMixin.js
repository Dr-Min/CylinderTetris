/**
 * WaveMixin - 적(바이러스)의 스폰 패턴 및 부대(Wave) 단위 시너지를 관리하는 유틸리티
 */

export function applyWaveMixin(DefenseGameClass) {
    const proto = DefenseGameClass.prototype;

    /**
     * 특정 지점을 중심으로 여러 마리의 적을 진형(Formation)에 맞춰 스폰합니다.
     */
    proto.spawnFormation = function (formationType, centerX, centerY, difficultyScale) {
        let spawnList = [];

        switch (formationType) {
            case 'SHIELD_WALL':
                // TANK 3마리가 가로로 넓게 서고 그 뒤에 ELITE 1마리와 GRUNT 조금
                spawnList.push({ id: 'ELITE', offsetX: 0, offsetY: 40 });
                spawnList.push({ id: 'TANK', offsetX: -40, offsetY: 0 });
                spawnList.push({ id: 'TANK', offsetX: 0, offsetY: 0 });
                spawnList.push({ id: 'TANK', offsetX: 40, offsetY: 0 });
                spawnList.push({ id: 'GRUNT', offsetX: -30, offsetY: 30 });
                spawnList.push({ id: 'GRUNT', offsetX: 30, offsetY: 30 });
                break;

            case 'TROJAN_HORSE':
                // 엄청 크고 체력 높은 SPLITTER 1마리 혼자. (죽으면 분열은 기존 EnemyMixin.js에서 처리)
                // stats override를 위해 custom 스케일링을 추가로 곱해줌
                spawnList.push({
                    id: 'SPLITTER', offsetX: 0, offsetY: 0,
                    customHpScale: 4.0, customRadius: 25, customColor: '#ff00aa'
                });
                break;

            case 'SWARM_BEACON':
                // ELITE 하나가 짱박혀 있고 주변에 엄청나게 빠른 RUNNER들이 있음
                spawnList.push({ id: 'ELITE', offsetX: 0, offsetY: 0 });
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 / 5) * i;
                    spawnList.push({
                        id: 'RUNNER',
                        offsetX: Math.cos(angle) * 30, offsetY: Math.sin(angle) * 30
                    });
                }
                break;

            case 'GHOST_PROTOCOL':
                // 투명화(ASSASSIN) 여러 마리가 넓게 산개
                spawnList.push({ id: 'ASSASSIN', offsetX: -50, offsetY: -30 });
                spawnList.push({ id: 'ASSASSIN', offsetX: 50, offsetY: -30 });
                spawnList.push({ id: 'ASSASSIN', offsetX: 0, offsetY: -60 });
                spawnList.push({ id: 'GRUNT', offsetX: -20, offsetY: 0 });
                spawnList.push({ id: 'GRUNT', offsetX: 20, offsetY: 0 });
                break;

            case 'VAMPIRE_COVEN':
                // 뱀파이어(기생형) 무리
                spawnList.push({ id: 'VAMPIRE', offsetX: 0, offsetY: 0 });
                spawnList.push({ id: 'VAMPIRE', offsetX: -40, offsetY: 20 });
                spawnList.push({ id: 'VAMPIRE', offsetX: 40, offsetY: 20 });
                break;

            case 'BREACHER_STORM':
                // 쉴드 파괴자(BREACHER)들이 일렬로 달려옴
                spawnList.push({ id: 'BREACHER', offsetX: 0, offsetY: 0 });
                spawnList.push({ id: 'BREACHER', offsetX: 0, offsetY: 30 });
                spawnList.push({ id: 'BREACHER', offsetX: 0, offsetY: 60 });
                break;
        }

        // 실제로 적을 생성하여 enemies 배열에 푸시
        spawnList.forEach(item => {
            const ex = centerX + item.offsetX;
            const ey = centerY + item.offsetY;

            // 타입별 기본 설정 (DefenseGame.spawnEnemy의 임시 설정값을 정규화)
            let typeConfig = this.getBaseEnemyConfig(item.id);

            // 난이도 및 보정치 적용
            typeConfig.speed *= (difficultyScale * 0.8 + 0.2);
            typeConfig.hp = Math.max(1, Math.floor(typeConfig.hp * difficultyScale * (item.customHpScale || 1.0)));
            typeConfig.damage = Math.max(1, Math.floor(typeConfig.damage * difficultyScale));
            if (item.customRadius) typeConfig.radius = item.customRadius;
            if (item.customColor) typeConfig.color = item.customColor;

            const angle = Math.atan2(this.core.y - ey, this.core.x - ex); // 초기 방향
            const enemyInstance = this.createEnemyFromType(typeConfig, ex, ey, angle, 0);
            this.enemies.push(enemyInstance);
        });
    };

    /**
     * ID에 따른 기본 적군 스테이터스(Config) 반환 헬퍼
     */
    proto.getBaseEnemyConfig = function (id) {
        switch (id) {
            case 'ELITE': return { id: 'ELITE', speed: 50, hp: 40, damage: 15, radius: 14, color: '#ff0055' }; // 밝은 핑크-레드
            case 'TANK': return { id: 'TANK', speed: 40, hp: 80, damage: 12, radius: 15, color: '#aa0000' }; // 다크 크림슨
            case 'SPLITTER': return { id: 'SPLITTER', speed: 70, hp: 15, damage: 10, radius: 12, color: '#ff00aa' }; // 딥 마젠타
            case 'RUNNER': return { id: 'RUNNER', speed: 130, hp: 4, damage: 5, radius: 8, color: '#ff5500' }; // 블러드 오렌지
            case 'ASSASSIN': return { id: 'ASSASSIN', speed: 90, hp: 8, damage: 10, radius: 10, color: '#550022' }; // 다크 버건디
            case 'VAMPIRE': return { id: 'VAMPIRE', speed: 65, hp: 20, damage: 8, radius: 11, color: '#880000' }; // 다크 블러드
            case 'BREACHER': return { id: 'BREACHER', speed: 85, hp: 6, damage: 4, radius: 9, color: '#cc00ff' }; // 보라 핑크
            case 'GRUNT':
            default: return { id: 'GRUNT', speed: 60 + Math.random() * 40, hp: 10, damage: 8, radius: 10, color: '#ff3333' }; // 기본 레드
        }
    };

    /**
     * 스테이지와 페이즈(페이지) 진행도에 따른 적군 풀 및 가중치 반환
     */
    proto.getSpawnPoolAndWeights = function () {
        const stageId = this.currentStageId || 0;
        const page = this.currentPage || 1;
        const maxPages = this.maxPages || 1;
        // 0.0 ~ 1.0 (페이즈 진행도)
        const phaseRatio = (maxPages > 1) ? (page / maxPages) : 0.5;

        // 모든 스테이지의 베이스는 GRUNT
        let pool = [{ id: 'GRUNT', weight: 100 }];

        if (stageId === 1 || stageId === 2) {
            // Stage 1, 2 (초반) - 기본몹, 빠른몹
            pool.push({ id: 'RUNNER', weight: 10 + 20 * phaseRatio }); // 페이즈가 갈수록 러너 증가
        } else if (stageId === 3) {
            // Stage 3 (Farming) - 탱커 등장
            pool.push({ id: 'RUNNER', weight: 30 });
            pool.push({ id: 'TANK', weight: 20 });
        } else if (stageId === 4 || stageId === 5) {
            // Stage 4, 5 (고위협)
            pool.push({ id: 'RUNNER', weight: 20 + 10 * phaseRatio });
            pool.push({ id: 'TANK', weight: 15 + 15 * phaseRatio });

            // 30% 진행 이후부터 스플리터, 어쌔신 해금
            if (phaseRatio >= 0.3) {
                pool.push({ id: 'SPLITTER', weight: 5 + 15 * phaseRatio });
                pool.push({ id: 'ASSASSIN', weight: 5 + 10 * phaseRatio });
            }
            // 50% 진행 이후부터 엘리트, 공성추 해금
            if (phaseRatio >= 0.5) {
                pool.push({ id: 'ELITE', weight: 5 + 10 * phaseRatio });
                pool.push({ id: 'BREACHER', weight: 5 + 10 * phaseRatio });
            }
        } else if (stageId >= 6) {
            // Stage 6 (최종전) - 모든 위협 해금
            pool.push({ id: 'RUNNER', weight: 30 });
            pool.push({ id: 'TANK', weight: 30 });
            pool.push({ id: 'SPLITTER', weight: 20 });
            pool.push({ id: 'ASSASSIN', weight: 20 });
            pool.push({ id: 'ELITE', weight: 15 });
            pool.push({ id: 'BREACHER', weight: 15 });

            // 30% 진행 이후 뱀파이어 해금
            if (phaseRatio >= 0.3) {
                pool.push({ id: 'VAMPIRE', weight: 10 + 15 * phaseRatio });
            }
        }

        return pool;
    };

    /**
     * 랜덤 스폰(풀 기반)과 특수 웨이브 시나리오를 믹스하여 판단
     */
    proto.trySpawnWave = function (difficultyScale) {
        const stageId = this.currentStageId || 0;
        const page = this.currentPage || 1;
        const maxPages = this.maxPages || 1;
        const phaseRatio = (maxPages > 1) ? (page / maxPages) : 0.5;

        // 초반부 (Stage 1, 2)에는 특수 진형 락(Lock)
        let specialChance = 0;
        if (stageId >= 4) {
            // 스테이지 4이상: 페이즈에 따라 5% ~ 15% 까지 상승
            specialChance = 0.05 + 0.1 * phaseRatio;
        } else if (stageId === 3) {
            // 파밍존 고정 3%
            specialChance = 0.03;
        }

        if (Math.random() < specialChance) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
            const ex = this.core.x + Math.cos(angle) * distance;
            const ey = this.core.y + Math.sin(angle) * distance;

            // 스테이지별 시나리오 풀 제한
            let scenarios = ['SHIELD_WALL', 'TROJAN_HORSE'];
            if (stageId >= 5) {
                scenarios.push('SWARM_BEACON', 'BREACHER_STORM');
            }
            if (stageId >= 6) {
                scenarios.push('GHOST_PROTOCOL', 'VAMPIRE_COVEN');
            }

            const chosen = scenarios[Math.floor(Math.random() * scenarios.length)];
            this.spawnFormation(chosen, ex, ey, difficultyScale);
        } else {
            // 일반 단일 랜덤 스폰 (가중치 풀 기반)
            this.spawnSingleRandomEnemy(difficultyScale);
        }
    };

    /**
     * 페이즈 가중치 기반 단일 스폰 및 기하급수적 성장 로직
     */
    proto.spawnSingleRandomEnemy = function (difficultyScale) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
        const ex = this.core.x + Math.cos(angle) * distance;
        const ey = this.core.y + Math.sin(angle) * distance;

        // 1. 가중치 풀에서 적군 선택
        const pool = this.getSpawnPoolAndWeights();
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let randWeight = Math.random() * totalWeight;

        let chosenId = 'GRUNT';
        for (const item of pool) {
            if (randWeight < item.weight) {
                chosenId = item.id;
                break;
            }
            randWeight -= item.weight;
        }

        let typeConfig = this.getBaseEnemyConfig(chosenId);

        // 2. 스테이지 및 페이즈 기반 지수형 난이도 스케일링
        const stageId = this.currentStageId || 0;
        const page = this.currentPage || 1;
        // stageId와 page 진척도에 따라 체력이 기하급수적으로 폭증 (예: Math.pow(1.15, X))
        const explosiveScale = difficultyScale * Math.pow(1.15, stageId + (page * 0.1));

        typeConfig.speed *= (difficultyScale * 0.8 + 0.2); // 속도는 완만하게 증가

        // 체력과 데미지는 위기감이 들도록 지수 스케일링 적용
        typeConfig.hp = Math.max(1, Math.floor(typeConfig.hp * explosiveScale));
        typeConfig.damage = Math.max(1, Math.floor(typeConfig.damage * explosiveScale));

        const enemyInstance = this.createEnemyFromType(typeConfig, ex, ey, angle, distance);
        this.enemies.push(enemyInstance);
    };

}
