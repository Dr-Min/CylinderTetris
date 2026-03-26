/**
 * EnemyMixin - 적(바이러스)의 AI 생태계를 분리하여 관리
 * 각 타입(GRUNT, RUNNER, TANK, ELITE 등)의 고유한 행동 패턴(State Machine)과
 * 시너지(버프, 진형) 로직을 이 모듈에서 전담합니다.
 */

export function applyEnemyMixin(DefenseGameClass) {
    const proto = DefenseGameClass.prototype;

    // 적 스폰 전용 유틸리티
    proto.createEnemyFromType = function (typeConfig, x, y, angle, distance) {
        const enemy = {
            x: x,
            y: y,
            type: typeConfig.id,
            radius: typeConfig.radius || 10,
            baseSpeed: typeConfig.speed || 80,
            speed: typeConfig.speed || 80,
            maxHp: typeConfig.hp || 10,
            hp: typeConfig.hp || 10,
            damage: typeConfig.damage || 8,
            color: typeConfig.color || "#ff3333",

            // AI 상태
            state: "APPROACH_CORE", // 기본 상태
            stateTimer: 0,

            // 시너지/특수 변수
            targetId: null,      // ELITE 등 특정 목표를 따라갈 때
            buffs: [],           // 적용받고 있는 긍정적인 효과
            slowMultiplier: 1,   // 군중 제어(CC)
            knockbackVx: 0,
            knockbackVy: 0,

            // 애니메이션/시각적 위상
            phase: Math.random() * Math.PI * 2,
        };

        return enemy;
    };

    /**
     * 전체 적군 Update 루프를 여기서 관리 (기존 DefenseGame.update 로직을 이관)
     * @param {number} dt - deltaTime (초 단위)
     * @param {object} core - 기지 객체
     */
    proto.updateEnemies = function (dt, core) {
        const nowMs = performance.now();

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!Number.isFinite(enemy.hp) || enemy.hp <= 0) {
                // SPLITTER의 죽음 기믹 (분열) - 터렛이나 스나이퍼 등에 맞아 죽었을 때만 발동
                if (enemy.hp <= 0 && enemy.type === 'SPLITTER') {
                    for (let j = 0; j < 3; j++) {
                        // 미니 바이러스 3마리를 흩뿌림
                        const angle = Math.random() * Math.PI * 2;
                        this.enemies.push(this.createEnemyFromType({
                            id: 'GRUNT',
                            speed: 90,
                            hp: 5,
                            damage: 4,
                            color: '#ff3366' // 밝은 진홍색
                        }, enemy.x + Math.cos(angle) * 15, enemy.y + Math.sin(angle) * 15, 0, 0));
                    }
                    this.createExplosion(enemy.x, enemy.y, "#ff00aa", 15);
                }

                this.enemies.splice(i, 1);
                continue;
            }

            // 1. 군중제어 및 넉백 물리 연산
            if (enemy.slowEndTime && nowMs >= enemy.slowEndTime) {
                enemy.slowMultiplier = 1;
                enemy.slowEndTime = null;
            }
            if (enemy.knockbackVx || enemy.knockbackVy) {
                enemy.x += (enemy.knockbackVx || 0) * dt;
                enemy.y += (enemy.knockbackVy || 0) * dt;
                const friction = Math.pow(0.05, dt);
                enemy.knockbackVx *= friction;
                enemy.knockbackVy *= friction;
                if (Math.abs(enemy.knockbackVx) < 1 && Math.abs(enemy.knockbackVy) < 1) {
                    enemy.knockbackVx = 0;
                    enemy.knockbackVy = 0;
                }
            }

            // 2. AI 행동 패턴 (State Machine) 실행
            this.runEnemyAI(enemy, dt, core);

            // 3. 코어/안전구역 충돌 판정 (기존 로직 유지)
            this.checkCoreCollision(enemy, i, core);
        }
    };

    /**
     * 타입별 고유 AI 행동 기계 (State Machine)
     */
    proto.runEnemyAI = function (enemy, dt, core) {
        const nowMs = performance.now();
        let targetX = core.x;
        let targetY = core.y;

        // 도발(Taunt) 로직 우선 적용
        if (enemy.tauntedBy) {
            const taunter = this.alliedViruses.find(v => v === enemy.tauntedBy && v.hp > 0);
            if (taunter) {
                targetX = taunter.x;
                targetY = taunter.y;
            } else {
                enemy.tauntedBy = null;
            }
        } else {
            let nearestTank = null;
            let nearestTankDist = Infinity;
            for (const v of this.alliedViruses) {
                if (v.virusType === "TANK" && v.hp > 0) {
                    const tankDist = Math.hypot(v.x - enemy.x, v.y - enemy.y);
                    if (tankDist < (v.aggroRadius || 120) && tankDist < nearestTankDist) {
                        nearestTank = v;
                        nearestTankDist = tankDist;
                    }
                }
            }
            if (nearestTank) {
                targetX = nearestTank.x;
                targetY = nearestTank.y;
            }
        }

        // 기본 직진 로직
        let dx = targetX - enemy.x;
        let dy = targetY - enemy.y;
        let distToTarget = Math.hypot(dx, dy);

        // --- 타입별 특수 거동 적용 ---
        switch (enemy.type) {
            case 'TANK':
                // Elite 수호 로직
                // 엘리트가 맵에 존재하면, 엘리트와 기지(또는 자신을 때리는 타겟) '사이' 지점으로 가림막 역할을 하러 감.
                if (!enemy.tauntedBy) { // 도발당한 상태가 아닐 때만
                    const elite = this.enemies.find(e => e.type === 'ELITE' && e.hp > 0);
                    if (elite) {
                        const angleToCore = Math.atan2(core.y - elite.y, core.x - elite.x);
                        // 엘리트 앞 60px 지점을 목표로 삼아 방패막이 형성
                        targetX = elite.x + Math.cos(angleToCore) * 60;
                        targetY = elite.y + Math.sin(angleToCore) * 60;
                        dx = targetX - enemy.x;
                        dy = targetY - enemy.y;
                        distToTarget = Math.hypot(dx, dy);
                    }
                }
                break;

            case 'ELITE':
                // 카이팅(Kiting) 및 버프 로직
                // 1) 기지와 일정 거리(안전거리) 유지
                const safeDistance = 300;
                if (distToTarget < safeDistance) {
                    // 너무 가까우면 포탑(기지)에서 멀어지는 방향으로 백스텝
                    dx = -dx;
                    dy = -dy;
                } else if (distToTarget < safeDistance + 50) {
                    // 적당한 거리면 주변을 빙글빙글 돈다 (Kiting)
                    const kiteX = -dy;
                    const kiteY = dx;
                    dx = kiteX;
                    dy = kiteY;
                }

                // 2) 주기적 버프 지급 (1.5초마다)
                if (nowMs - (enemy.lastBuffTime || 0) > 1500) {
                    enemy.lastBuffTime = nowMs;
                    // 이펙트 생성 (파동)
                    this.createExplosion(enemy.x, enemy.y, "#00ffaa", 5);
                    this.enemies.forEach(other => {
                        if (other !== enemy && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 200) {
                            // 주변 적들에게 2초짜리 스피드 버프
                            other.buffs = other.buffs || [];
                            other.buffs.push({ type: 'SPEED', expireAt: nowMs + 2000, val: 1.5 });
                        }
                    });
                }
                break;

            case 'RUNNER':
                // 우회 기동 (Flanking) 로직
                // 포탑이 바라보는 정면을 피해서 사선으로 진입 시도
                if (this.turret && distToTarget > 100) {
                    const angleToCore = Math.atan2(core.y - enemy.y, core.x - enemy.x);
                    // 터렛의 시선과 거리가 가까우면(위험하면) 측면으로 살짝 튼다
                    const turretAngleDiff = Math.abs(this.turret.angle - (angleToCore + Math.PI)); // 포탑이 나를 보는지
                    if (turretAngleDiff < 0.8) {
                        // 포탑이 쳐다보고 있으면 좌/우 중 덜 맞을 것 같은 쪽으로 휘어서 이동
                        const flankDir = enemy.id % 2 === 0 ? 1 : -1;
                        dx = Math.cos(angleToCore + (Math.PI / 4) * flankDir);
                        dy = Math.sin(angleToCore + (Math.PI / 4) * flankDir);
                    }
                }
                break;

            case 'ASSASSIN':
                // 스텔스 로직
                // 포탑이 자신을 향하면 투명해지고 느려짐(거의 멈춤). 딴데 보면 빠르게 접근.
                if (this.turret) {
                    const myAngleFromCore = Math.atan2(enemy.y - core.y, enemy.x - core.x);
                    // normalize angles
                    let diff = Math.abs((this.turret.angle - myAngleFromCore + Math.PI * 3) % (Math.PI * 2) - Math.PI);

                    if (diff < 0.6) {
                        // 포탑 시야각 안에 들어옴 -> 스텔스 발동
                        enemy.isStealth = true;
                        enemy.color = "rgba(100, 100, 100, 0.2)"; // 시각적으로 투명화
                        return; // 이동 중지 (혹은 매우 극초저속)
                    } else {
                        enemy.isStealth = false;
                        enemy.color = "rgba(50, 50, 50, 1.0)";
                    }
                }
                break;

            case 'VAMPIRE':
                // 기생 로직
                // 기지로 가기 전 반경 250px 내에 아군 바이러스가 있으면 그쪽으로 타겟 변경
                let nearestVictim = null;
                let victimDist = 250;
                for (const v of this.alliedViruses) {
                    if (v.hp > 0) {
                        const d = Math.hypot(v.x - enemy.x, v.y - enemy.y);
                        if (d < victimDist) {
                            victimDist = d;
                            nearestVictim = v;
                        }
                    }
                }
                if (nearestVictim) {
                    dx = nearestVictim.x - enemy.x;
                    dy = nearestVictim.y - enemy.y;
                    distToTarget = Math.hypot(dx, dy);

                    // 근접 시 흡혈
                    if (distToTarget < enemy.radius + nearestVictim.radius) {
                        nearestVictim.hp -= 20 * dt; // 엄청난 속도로 피를 빰
                        enemy.hp += 10 * dt;
                        enemy.maxHp += 5 * dt;
                        enemy.radius = Math.min(30, enemy.radius + 1 * dt); // 크기도 커짐
                        this.createExplosion(nearestVictim.x, nearestVictim.y, "#880000", 2);
                        return; // 이동 멈추고 제자리 흡혈
                    }
                }
                break;
        }

        // --- 버프 계산 및 최종 이동 속도 적용 ---
        if (distToTarget > 0) {
            // 버프 만료 정리 및 스피드 계수 합산
            let buffSpeedMult = 1.0;
            if (enemy.buffs) {
                enemy.buffs = enemy.buffs.filter(b => b.expireAt > nowMs);
                enemy.buffs.forEach(b => {
                    if (b.type === 'SPEED') buffSpeedMult *= b.val;
                });
            }

            const ccMult = enemy.slowMultiplier || 1.0;
            let finalSpeed = enemy.speed * ccMult * buffSpeedMult;

            // TANK는 슬로우 면역/저항 (속도 최하 방어선) 처리 보정 가능
            if (enemy.type === 'TANK' && ccMult < 1.0) {
                finalSpeed = enemy.speed * 0.8; // CC기 걸려도 80% 밑으론 안떨어짐
            }

            // 정규화된 방향 벡터에 속도 곱하기
            enemy.x += (dx / Math.hypot(dx, dy)) * finalSpeed * dt;
            enemy.y += (dy / Math.hypot(dx, dy)) * finalSpeed * dt;

            // 회전 애니메이션 처리 (RENDER 용)
            if (dx !== 0 || dy !== 0) {
                enemy.rotation = Math.atan2(dy, dx);
            }
        }
    };

    /**
     * 기지(Core)와의 충돌 및 대미지 판정
     */
    proto.checkCoreCollision = function (enemy, idx, core) {
        const distToCore = Math.hypot(core.x - enemy.x, core.y - enemy.y);

        // 쉴드 액티브 상태일 때
        if (core.shieldActive && distToCore < core.shieldRadius + enemy.radius) {
            // Breacher면 쉴드 파괴 특효
            const shieldDamage = (enemy.type === 'BREACHER') ? 50 : 10;
            core.shieldHp -= shieldDamage;
            this.chargeStaticOnHit();
            this.createExplosion(enemy.x, enemy.y, "#00f0ff", (enemy.type === 'BREACHER') ? 15 : 5);
            this.enemies.splice(idx, 1);

            if (core.shieldHp <= 0) {
                core.shieldHp = 0;
                core.shieldActive = false;
                core.shieldState = "BROKEN";
                core.shieldTimer = 5.0;
                this.updateShieldBtnUI("BROKEN", "#555");
                this.createExplosion(core.x, core.y, "#00f0ff", 30);
                this.updateShieldBtnUI("ACTIVE", "#fff");
            }
            return;
        }

        // 맨몸 충돌
        if (distToCore < core.radius + enemy.radius) {
            if (!this.isGodMode) {
                core.hp -= enemy.damage;
                this.chargeStaticOnHit();
                if (this.isBossFight && this.bossManager) {
                    this.frameCoreDamaged = (this.frameCoreDamaged || 0) + 1;
                }
            }
            this.createExplosion(enemy.x, enemy.y, "#ff0000", 20);
            this.enemies.splice(idx, 1);

            if (core.hp <= 0 && !this.isGodMode) {
                core.hp = 0;
                this.createExplosion(core.x, core.y, "#ff0000", 50);
                this.stop();
                if (this.onGameOver) this.onGameOver();
            }
        }
    };

}
