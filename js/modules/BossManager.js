/**
 * BossManager - 보스전 관리
 * 페이즈 시스템, 보스 HP, 침투 게이지, 테트리스 방해
 */
export class BossManager {
    constructor() {
        // 보스 상태
        this.bossHP = 100;
        this.maxBossHP = 100;
        this.currentPhase = 1;
        this.maxPhase = 4;
        
        // 침투 게이지
        this.breachGauge = 0;
        this.maxBreachGauge = 100;
        this.isBreachReady = false;
        
        // 보스전 활성화 상태
        this.isActive = false;
        
        // 페이즈별 설정
        this.phaseConfig = {
            1: {
                breachTime: 10,        // 침투까지 걸리는 시간 (초)
                minBossHP: 80,         // 이 페이즈에서 보스 HP 최소값
                interferences: ['garbage'],  // 테트리스 방해 종류
                spawnMultiplier: 1.0,  // 적 스폰 배율
                description: "PHASE 1 - FIREWALL DETECTED"
            },
            2: {
                breachTime: 15,
                minBossHP: 50,
                interferences: ['garbage', 'blackout'],
                spawnMultiplier: 1.3,
                description: "PHASE 2 - SECURITY ESCALATION"
            },
            3: {
                breachTime: 20,
                minBossHP: 20,
                interferences: ['garbage', 'blackout', 'speedup'],
                spawnMultiplier: 1.6,
                description: "PHASE 3 - CORE DEFENSE ACTIVE"
            },
            4: {
                breachTime: 30,
                minBossHP: 0,          // 마지막 페이즈만 0까지 가능
                interferences: ['garbage', 'blackout', 'speedup', 'reverse'],
                spawnMultiplier: 2.0,
                description: "PHASE 4 - FINAL BARRIER"
            }
        };
        
        // 방해 타이머 설정
        this.interferenceTimers = {
            garbage: { interval: 10000, lastTrigger: 0 },    // 10초마다 쓰레기 블록
            blackout: { interval: 15000, lastTrigger: 0 },   // 15초마다 블랙아웃
            speedup: { interval: 20000, lastTrigger: 0 },    // 20초마다 가속
            reverse: { interval: 25000, lastTrigger: 0 }     // 25초마다 역조작
        };
        
        // 현재 활성 방해 효과
        this.activeEffects = {
            blackout: false,
            speedup: false,
            reverse: false
        };
        
        // 콜백
        this.onPhaseChange = null;
        this.onBossDefeated = null;
        this.onBreachReady = null;
        this.onInterference = null;
    }
    
    /**
     * 보스전 시작
     */
    start() {
        this.isActive = true;
        this.bossHP = this.maxBossHP;
        this.currentPhase = 1;
        this.breachGauge = 0;
        this.isBreachReady = false;
        this.resetInterferenceTimers();
        
        debugLog("Boss", "Battle started - Phase 1");
        return this.getPhaseConfig();
    }
    
    /**
     * 보스전 종료
     */
    stop() {
        this.isActive = false;
        this.breachGauge = 0;
        this.isBreachReady = false;
        this.clearActiveEffects();
    }
    
    /**
     * 현재 페이즈 설정 반환
     */
    getPhaseConfig() {
        return this.phaseConfig[this.currentPhase];
    }
    
    /**
     * 침투 게이지 업데이트 (디펜스 모드에서 호출)
     * @param {number} deltaTime - 경과 시간 (초)
     * @param {boolean} shieldOff - 실드 OFF 상태면 충전 빠름
     * @param {number} enemyKilled - 이번 프레임에 처치한 적 수
     * @param {number} coreDamaged - 코어 피격 여부
     */
    updateBreachGauge(deltaTime, shieldOff = false, enemyKilled = 0, coreDamaged = 0) {
        if (!this.isActive || this.isBreachReady) return;
        
        const config = this.getPhaseConfig();
        const baseRate = this.maxBreachGauge / config.breachTime; // 초당 충전량
        
        // 기본 시간 충전
        let gain = baseRate * deltaTime;
        
        // 실드 OFF면 1.5배 충전
        if (shieldOff) {
            gain *= 1.5;
        }
        
        // 적 처치 보너스 (+2% per kill)
        gain += enemyKilled * 2;
        
        // 코어 피격 페널티 (-5% per hit)
        const loss = coreDamaged * 5;
        
        this.breachGauge = Math.max(0, Math.min(this.maxBreachGauge, this.breachGauge + gain - loss));
        
        // 100% 도달 시
        if (this.breachGauge >= this.maxBreachGauge) {
            this.isBreachReady = true;
            debugLog("Boss", "Breach ready!");
            if (this.onBreachReady) {
                this.onBreachReady();
            }
        }
    }
    
    /**
     * 침투 시작 (테트리스 진입)
     */
    startBreach() {
        if (!this.isBreachReady) return false;
        
        debugLog("Boss", "Breach initiated - Entering Tetris");
        return true;
    }
    
    /**
     * 테트리스 성공 시 보스 데미지
     */
    dealDamage(amount = 20) {
        if (!this.isActive) return;
        
        const config = this.getPhaseConfig();
        const newHP = Math.max(config.minBossHP, this.bossHP - amount);
        
        debugLog("Boss", `Damage dealt: ${amount}, HP: ${this.bossHP} -> ${newHP}`);
        this.bossHP = newHP;
        
        // 페이즈 전환 체크
        this.checkPhaseTransition();
        
        // 보스 처치 체크
        if (this.bossHP <= 0) {
            debugLog("Boss", "DEFEATED!");
            if (this.onBossDefeated) {
                this.onBossDefeated();
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * 테트리스 실패 시
     */
    onBreachFailed() {
        debugLog("Boss", "Breach failed - Gauge reset");
        this.breachGauge = 0;
        this.isBreachReady = false;
        this.clearActiveEffects();
    }
    
    /**
     * 페이즈 전환 체크
     */
    checkPhaseTransition() {
        const config = this.getPhaseConfig();
        
        // 현재 HP가 현재 페이즈의 최소 HP에 도달하고, 다음 페이즈가 있으면
        if (this.bossHP <= config.minBossHP && this.currentPhase < this.maxPhase) {
            this.currentPhase++;
            this.breachGauge = 0;
            this.isBreachReady = false;
            
            const newConfig = this.getPhaseConfig();
            debugLog("Boss", `Phase transition: ${this.currentPhase} - ${newConfig.description}`);
            
            if (this.onPhaseChange) {
                this.onPhaseChange(this.currentPhase, newConfig);
            }
        }
    }
    
    /**
     * 테트리스 방해 업데이트 (테트리스 모드에서 호출)
     * @param {number} currentTime - 현재 시간 (ms)
     * @returns {string|null} - 발동된 방해 타입
     */
    updateInterference(currentTime) {
        if (!this.isActive) return null;
        
        const config = this.getPhaseConfig();
        
        for (const type of config.interferences) {
            const timer = this.interferenceTimers[type];
            
            if (currentTime - timer.lastTrigger >= timer.interval) {
                timer.lastTrigger = currentTime;
                
                debugLog("Boss", `Interference triggered: ${type}`);
                
                if (this.onInterference) {
                    this.onInterference(type);
                }
                
                return type;
            }
        }
        
        return null;
    }
    
    /**
     * 방해 타이머 리셋
     */
    resetInterferenceTimers() {
        const now = performance.now();
        for (const type in this.interferenceTimers) {
            this.interferenceTimers[type].lastTrigger = now;
        }
    }
    
    /**
     * 활성 효과 초기화
     */
    clearActiveEffects() {
        this.activeEffects = {
            blackout: false,
            speedup: false,
            reverse: false
        };
    }
    
    /**
     * 효과 활성화 (일정 시간 후 자동 해제)
     */
    activateEffect(type, duration = 3000) {
        if (type === 'garbage') return; // 쓰레기 블록은 즉시 효과
        
        this.activeEffects[type] = true;
        
        setTimeout(() => {
            this.activeEffects[type] = false;
        }, duration);
    }
    
    /**
     * 현재 상태 반환 (UI 표시용)
     */
    getStatus() {
        const config = this.getPhaseConfig();
        const breachTimeRemaining = this.isBreachReady ? 0 : 
            Math.ceil((this.maxBreachGauge - this.breachGauge) / (this.maxBreachGauge / config.breachTime));
        
        return {
            isActive: this.isActive,
            bossHP: this.bossHP,
            maxBossHP: this.maxBossHP,
            bossHPPercent: (this.bossHP / this.maxBossHP) * 100,
            currentPhase: this.currentPhase,
            maxPhase: this.maxPhase,
            phaseDescription: config.description,
            breachGauge: this.breachGauge,
            maxBreachGauge: this.maxBreachGauge,
            breachPercent: (this.breachGauge / this.maxBreachGauge) * 100,
            breachTimeRemaining: breachTimeRemaining,
            isBreachReady: this.isBreachReady,
            activeEffects: { ...this.activeEffects },
            minBossHP: config.minBossHP
        };
    }
    
    /**
     * 저장 데이터
     */
    saveData() {
        return {
            bossHP: this.bossHP,
            currentPhase: this.currentPhase,
            breachGauge: this.breachGauge
        };
    }
    
    /**
     * 데이터 로드
     */
    loadData(data) {
        if (!data) return;
        this.bossHP = data.bossHP ?? 100;
        this.currentPhase = data.currentPhase ?? 1;
        this.breachGauge = data.breachGauge ?? 0;
        this.isBreachReady = this.breachGauge >= this.maxBreachGauge;
    }
}
