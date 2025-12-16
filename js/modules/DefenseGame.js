export class DefenseGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    
    // 캔버스 생성 (body에 직접 부착하여 game-container와 분리)
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.canvas.style.display = "none";
    this.canvas.style.position = "fixed"; // absolute -> fixed
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "50"; // 터미널(100)보다 아래, game-container(0)보다 위
    document.body.appendChild(this.canvas); // [수정] body에 직접 부착

    // 코어 설정 (가장 먼저 초기화)
    this.core = {
      x: 0,
      y: 0,
      radius: 15,
      hp: 100,
      maxHp: 100,
      color: "#00f0ff",
      shieldActive: true,
      shieldState: "ACTIVE",
      shieldHp: 100,
      shieldMaxHp: 100,
      shieldRadius: 70,
      shieldTimer: 0,
      scale: 1 // 원근감 애니메이션용
    };
    
    // HP 표시 상태
    this.showCoreHP = true;
    this.glitchText = false;
    this.glitchOffset = { x: 0, y: 0 };
    
    // 게임 스케일 (모바일 줌 아웃용)
    this.gameScale = 1.0;
    
    // 모바일 성능 최적화
    this.isMobile = window.innerWidth <= 768;
    this.maxParticles = this.isMobile ? 30 : 100; // 파티클 수 제한
    this.particleMultiplier = this.isMobile ? 0.3 : 1.0; // 파티클 생성량 감소

    // UI 레이어 생성 (DOM 기반, 모바일 터치 최적화)
    this.uiLayer = document.createElement("div");
    this.uiLayer.id = "defense-ui";
    this.uiLayer.style.position = "fixed"; // absolute -> fixed (전체 화면 기준)
    this.uiLayer.style.top = "0";
    this.uiLayer.style.left = "0";
    this.uiLayer.style.width = "100%";
    this.uiLayer.style.height = "100%";
    this.uiLayer.style.pointerEvents = "none"; // 게임 조작 방해 금지
    this.uiLayer.style.zIndex = "200"; // 터미널(100)보다 높게
    this.uiLayer.style.display = "none";
    document.body.appendChild(this.uiLayer); // [수정] container가 아닌 body에 직접 부착

    // 1. 우측 상단 PAGE 표시기 (기존 resourceDisplay -> pageDisplay로 용도 변경)
    this.pageDisplay = document.createElement("div");
    this.pageDisplay.id = "page-display";
    this.pageDisplay.style.position = "absolute";
    this.pageDisplay.style.top = "20px";
    this.pageDisplay.style.right = "20px";
    this.pageDisplay.style.color = "#00ff00";
    this.pageDisplay.style.fontFamily = "var(--term-font)";
    this.pageDisplay.style.fontSize = "20px";
    this.pageDisplay.style.fontWeight = "bold";
    this.pageDisplay.style.textShadow = "0 0 10px #00ff00";
    this.pageDisplay.style.backgroundColor = "rgba(0, 20, 0, 0.7)";
    this.pageDisplay.style.padding = "8px 15px";
    this.pageDisplay.style.border = "1px solid #00ff00";
    this.pageDisplay.style.pointerEvents = "auto";
    this.pageDisplay.style.userSelect = "none";
    this.pageDisplay.innerText = "SAFE ZONE";
    this.uiLayer.appendChild(this.pageDisplay);

    // 2. 배리어 토글 버튼 (모바일 친화적 위치: 하단 중앙)
    this.shieldBtn = document.createElement("button");
    this.shieldBtn.id = "shield-btn";
    this.shieldBtn.style.position = "absolute";
    this.shieldBtn.style.bottom = "100px";
    this.shieldBtn.style.left = "50%";
    this.shieldBtn.style.transform = "translateX(-50%)";
    this.shieldBtn.style.width = "220px";
    this.shieldBtn.style.height = "60px";
    this.shieldBtn.style.backgroundColor = "rgba(0, 50, 255, 0.3)";
    this.shieldBtn.style.border = "2px solid #00f0ff";
    this.shieldBtn.style.color = "#00f0ff";
    this.shieldBtn.style.fontFamily = "var(--term-font)";
    this.shieldBtn.style.fontSize = "16px";
    this.shieldBtn.style.cursor = "pointer";
    this.shieldBtn.style.pointerEvents = "auto";
    this.shieldBtn.style.zIndex = "30";
    this.shieldBtn.style.touchAction = "manipulation"; // 모바일 터치 최적화
    this.shieldBtn.style.userSelect = "none"; // 텍스트 선택 방지
    this.shieldBtn.style.webkitTapHighlightColor = "transparent"; // iOS 탭 하이라이트 제거
    
    // 초기 텍스트 설정 (UI 업데이트 함수 호출로 통일)
    this.shieldBtn.onclick = () => this.toggleShield();
    this.uiLayer.appendChild(this.shieldBtn);
    this.updateShieldBtnUI("ACTIVE", "#00f0ff"); // 초기값 설정

    // 3. 점령 버튼 (12페이지 달성 시 등장)
    this.conquerBtn = document.createElement("button");
    this.conquerBtn.id = "conquer-btn";
    this.conquerBtn.style.position = "absolute";
    this.conquerBtn.style.top = "80px";
    this.conquerBtn.style.left = "50%";
    this.conquerBtn.style.transform = "translateX(-50%)";
    this.conquerBtn.style.width = "200px";
    this.conquerBtn.style.padding = "10px";
    this.conquerBtn.style.backgroundColor = "#ff0000";
    this.conquerBtn.style.border = "2px solid #fff";
    this.conquerBtn.style.color = "#fff";
    this.conquerBtn.style.fontFamily = "var(--term-font)";
    this.conquerBtn.style.fontSize = "18px";
    this.conquerBtn.style.fontWeight = "bold";
    this.conquerBtn.style.cursor = "pointer";
    this.conquerBtn.style.display = "none";
    this.conquerBtn.style.zIndex = "40";
    this.conquerBtn.style.boxShadow = "0 0 20px #ff0000";
    this.conquerBtn.style.touchAction = "manipulation";
    this.conquerBtn.style.userSelect = "none";
    this.conquerBtn.style.webkitTapHighlightColor = "transparent";
    this.conquerBtn.innerHTML = "!!! CONQUER !!!";
    this.conquerBtn.onclick = () => this.handleConquerClick();
    this.uiLayer.appendChild(this.conquerBtn);

    // 웨이브 정보 표시는 pageDisplay로 통합됨 (waveInfo 삭제)

    // 게임 상태 변수
    this.isRunning = false;
    this.lastTime = 0;
    
    // 포탑 설정 (강화됨)
    this.turret = {
      angle: 0,
      range: 300,      // 사거리 증가 (200 -> 300)
      fireRate: 4.0,   // 공속 증가 (0.5 -> 4.0, 초당 4발)
      lastFireTime: 0,
      damage: 10
    };
    
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.alliedViruses = []; // 아군 바이러스 (시각적 요소)
    
    // 웨이브 관리
    this.waveTimer = 0;
    this.spawnRate = 1.5;
    this.currentPage = 1; // 1 ~ 12
    this.pageTimer = 0;
    this.pageDuration = 20; // 페이지당 20초 (테스트용, 실제론 더 길게)
    
    // 스테이지 관리
    this.currentStage = 0; // 0 = 안전영역, 1+ = 일반 스테이지
    this.isSafeZone = true; // 안전영역 여부
    this.safeZoneSpawnRate = 8; // 안전영역에서 적 생성 주기 (8초에 한 마리)
    
    // 이벤트 콜백
    this.onResourceGained = null; 
    this.onGameOver = null;
    this.onConquer = null; // 점령 요청 콜백

    // 아군 정보 (ConquestManager에서 주입)
    this.alliedInfo = { count: 0, level: 1, color: "#00aaff" }; // 파란색으로 변경

    // 현재 자원 (GameManager와 동기화용)
    this.currentData = 0;

    window.addEventListener("resize", () => this.resize());
    
    // 모바일 스타일 조정
    if (window.innerWidth <= 768) {
        this.pageDisplay.style.fontSize = "14px";
        this.pageDisplay.style.padding = "5px 10px";
        this.shieldBtn.style.bottom = "80px";
        this.shieldBtn.style.width = "160px";
        this.shieldBtn.style.height = "50px";
    }
    
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // 모바일 감지 및 성능 설정 업데이트
    this.isMobile = window.innerWidth <= 768;
    this.maxParticles = this.isMobile ? 30 : 100;
    this.particleMultiplier = this.isMobile ? 0.3 : 1.0;
    
    // 모바일에서 줌 아웃 효과 (더 멀리서 보기)
    if (window.innerWidth <= 768) {
      this.gameScale = 0.65; // 모바일: 65% 크기 (줌 아웃)
    } else if (window.innerWidth <= 1024) {
      this.gameScale = 0.8; // 태블릿: 80% 크기
    } else {
      this.gameScale = 1.0; // PC: 100%
    }
    
    this.core.x = this.canvas.width / 2;
    this.core.y = this.canvas.height / 2;
  }

  // 자원 업데이트 (GameManager에서 호출) - DATA는 터미널에 표시됨
  updateResourceDisplay(amount) {
      this.currentData = amount;
      // DATA 표시는 GameManager의 터미널에서 처리
      if (this.onDataUpdate) {
          this.onDataUpdate(this.currentData);
      }
  }

  // 외부에서 아군 정보 업데이트 (정보만 저장, 생성은 playIntroAnimation에서)
  updateAlliedInfo(info) {
      this.alliedInfo = info;
      console.log("[updateAlliedInfo] Info saved:", info);
      // 아군 바이러스 생성은 playIntroAnimation에서 처리
  }

  handleConquerClick() {
      if (this.onConquer) this.onConquer();
      this.conquerBtn.style.display = "none";
      // 다음 페이지(13)로 넘기거나, 스테이지 리셋은 GameManager가 처리
      this.currentPage = 1;
      this.updateWaveDisplay();
  }

  toggleShield() {
      // 이미 전환 중이거나 파괴된 상태면 무시
      if (this.core.shieldState === "CHARGING" || 
          this.core.shieldState === "DISCHARGING" || 
          this.core.shieldState === "BROKEN" ||
          this.core.shieldState === "RECHARGING") {
          return;
      }

      if (this.core.shieldActive) {
          // 끄기 시도 (1초 소요)
          this.core.shieldState = "DISCHARGING";
          this.core.shieldTimer = 1.0; 
          this.updateShieldBtnUI("DISENGAGING...", "#ffff00");
      } else {
          // 켜기 시도 (2초 소요)
          this.core.shieldState = "CHARGING";
          this.core.shieldTimer = 2.0;
          this.updateShieldBtnUI("CHARGING...", "#ffff00");
      }
  }

  updateShieldBtnUI(text, color, loadingProgress = null) {
      const hpPct = Math.floor((this.core.shieldHp / this.core.shieldMaxHp) * 100);
      
      // 로딩 중일 때 (BROKEN 상태)
      let topDisplay = `(${hpPct}%)`;
      if (loadingProgress !== null) {
          // 로딩 동글동글 원형 표시
          const circumference = 2 * Math.PI * 12;
          const dashOffset = circumference * (1 - loadingProgress);
          topDisplay = `
              <svg width="30" height="30" style="vertical-align: middle;">
                  <circle cx="15" cy="15" r="12" fill="none" stroke="#333" stroke-width="3"/>
                  <circle cx="15" cy="15" r="12" fill="none" stroke="${color}" stroke-width="3"
                      stroke-dasharray="${circumference}" 
                      stroke-dashoffset="${dashOffset}"
                      transform="rotate(-90 15 15)"/>
              </svg>
          `;
      }
      
      // 버튼 내부: 상태 텍스트
      // 버튼 위: 체력 텍스트 또는 로딩 표시
      this.shieldBtn.innerHTML = `
          SHIELD: ${text}
          <div style='
              position: absolute; 
              top: -30px; 
              left: 50%; 
              transform: translateX(-50%); 
              font-size: 14px; 
              color: ${color}; 
              text-shadow: 0 0 5px ${color};
              white-space: nowrap;
          '>
              ${topDisplay}
          </div>
      `;
      this.shieldBtn.style.borderColor = color;
      this.shieldBtn.style.color = color;
  }

  start() {
    this.resize();
    this.isRunning = true;
    this.canvas.style.display = "block";
    this.uiLayer.style.display = "block"; // UI 표시
    
    // 웨이브 초기화
    this.currentPage = 1;
    this.pageTimer = 0;
    this.conquerBtn.style.display = "none";
    this.updateWaveDisplay();
    this.updateShieldBtnUI("ACTIVE", "#fff");

    this.lastTime = performance.now();
    this.animate(this.lastTime);
    console.log("Defense Mode Started");
  }

  stop() {
    this.isRunning = false;
    this.canvas.style.display = "none";
    this.uiLayer.style.display = "none"; // UI 숨김
  }

  pause() {
    this.isRunning = false;
    // 캔버스와 UI는 보이지만 업데이트 중지
  }

  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.animate(t));
    }
  }

  update(deltaTime) {
    const now = performance.now() / 1000;
    const dt = deltaTime / 1000;

    // 0. 쉴드 상태 업데이트
    if (this.core.shieldState === "CHARGING") {
        this.core.shieldTimer -= dt;
        if (this.core.shieldTimer <= 0) {
            this.core.shieldActive = true;
            this.core.shieldState = "ACTIVE";
            this.updateShieldBtnUI("ACTIVE", "#fff");
        }
    } else if (this.core.shieldState === "DISCHARGING") {
        this.core.shieldTimer -= dt;
        if (this.core.shieldTimer <= 0) {
            this.core.shieldActive = false;
            this.core.shieldState = "OFF";
            this.updateShieldBtnUI("OFFLINE", "#f00");
        }
    } else if (this.core.shieldState === "BROKEN") {
        this.core.shieldTimer -= dt;
        // 로딩 동글동글 애니메이션 (5초)
        const loadingProgress = 1 - (this.core.shieldTimer / 5.0);
        const dots = ".".repeat(Math.floor((Date.now() / 300) % 4));
        this.updateShieldBtnUI(`REPAIRING${dots}`, "#ff6600", loadingProgress);
        
        if (this.core.shieldTimer <= 0) {
            // 수리 완료 -> 충전 시작
            this.core.shieldState = "RECHARGING";
            this.core.shieldHp = 1; // 1%부터 시작
            this.updateShieldBtnUI("RECHARGING", "#ffff00");
        }
    } else if (this.core.shieldState === "RECHARGING") {
        // 충전 중: 1% -> 100% (초당 20% 충전)
        this.core.shieldHp += 20 * dt;
        if (this.core.shieldHp >= this.core.shieldMaxHp) {
            this.core.shieldHp = this.core.shieldMaxHp;
            this.core.shieldState = "OFF";
            this.updateShieldBtnUI("OFFLINE", "#00ff00"); // 충전 완료!
        } else {
            const pct = Math.floor((this.core.shieldHp / this.core.shieldMaxHp) * 100);
            this.updateShieldBtnUI(`CHARGING ${pct}%`, "#ffff00");
        }
    }

    // 쉴드 내구도 로직
    if (this.core.shieldActive) {
        // 켜져있을 때 자연 소모는 없음 (기획: 페널티 없음)
        // 단, 공격 받으면 깎임 (충돌 로직에서 처리)
    } else {
        // 꺼져있을 때 회복 (파괴 상태 아닐 때만)
        if (this.core.shieldState === "OFF" && this.core.shieldHp < this.core.shieldMaxHp) {
            this.core.shieldHp += 10 * dt; // 초당 10 회복
            if (this.core.shieldHp > this.core.shieldMaxHp) this.core.shieldHp = this.core.shieldMaxHp;
            this.updateShieldBtnUI("OFFLINE", "#f00");
        }
    }

    // 0.5 웨이브(페이지) 진행 - 안전영역이 아닐 때만
    if (!this.isSafeZone && this.currentPage <= 12) {
        this.pageTimer += dt;
        if (this.pageTimer >= this.pageDuration) {
            if (this.currentPage < 12) {
                this.currentPage++;
                this.pageTimer = 0;
                this.spawnRate = Math.max(0.2, 1.5 - (this.currentPage * 0.1)); // 난이도 상승
                this.updateWaveDisplay();
            } else {
                // 12페이지 완료 -> 점령 가능 상태
                if (this.conquerBtn.style.display === "none") {
                    this.conquerBtn.style.display = "block";
                    this.pageDisplay.innerText = "CONQUER READY";
                    this.pageDisplay.style.color = "#ffff00"; // 노란색
                    this.pageDisplay.style.borderColor = "#ffff00";
                }
            }
        }
    }

    // 0.8 아군 바이러스 로직 (적 추적 + 몸통박치기) - for 루프로 안전하게 처리
    for (let idx = this.alliedViruses.length - 1; idx >= 0; idx--) {
        const v = this.alliedViruses[idx];
        
        // HP가 없으면 제거 (사망)
        if (v.hp <= 0) {
            this.createExplosion(v.x, v.y, v.color, 8);
            this.alliedViruses.splice(idx, 1);
            continue;
        }
        
        // 가장 가까운 적 찾기 (사거리 200)
        let nearestEnemy = null;
        let minDist = Infinity;
        
        for (let j = 0; j < this.enemies.length; j++) {
            const enemy = this.enemies[j];
            const dist = Math.hypot(enemy.x - v.x, enemy.y - v.y);
            if (dist < 200 && dist < minDist) { // 사거리 200으로 확대
                minDist = dist;
                nearestEnemy = enemy;
            }
        }
        
        // 적과 충돌 시 전투 (몸통박치기)
        if (nearestEnemy) {
            const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
            if (dist < v.radius + nearestEnemy.radius + 5) {
                // 충돌: 서로 동일한 데미지 (몸통박치기)
                const damage = v.damage || 10;
                nearestEnemy.hp -= damage;
                v.hp -= damage; // 동일한 데미지
                
                this.createExplosion((v.x + nearestEnemy.x) / 2, (v.y + nearestEnemy.y) / 2, v.color, 5);
                
                // 적 처치
                if (nearestEnemy.hp <= 0) {
                    const enemyIdx = this.enemies.indexOf(nearestEnemy);
                    if (enemyIdx > -1) {
                        this.enemies.splice(enemyIdx, 1);
                        this.createExplosion(nearestEnemy.x, nearestEnemy.y, "#00ff00", 10);
                        
                        // 자원 획득 (아군이 처치해도 획득)
                        const gain = 10;
                        this.currentData += gain;
                        this.updateResourceDisplay(this.currentData);
                        if (this.onResourceGained) this.onResourceGained(gain);
                    }
                }
            } else {
                // 사거리 내 적에게 이동 (빠르게)
                const dx = nearestEnemy.x - v.x;
                const dy = nearestEnemy.y - v.y;
                const moveSpeed = 80 * dt; // 이동속도 증가
                v.x += (dx / dist) * moveSpeed;
                v.y += (dy / dist) * moveSpeed;
            }
        } else {
            // 적이 없으면 코어 주변 순찰 (회전)
            v.angle += dt * 0.8;
            const patrolRadius = 50;
            const targetX = this.core.x + Math.cos(v.angle) * patrolRadius;
            const targetY = this.core.y + Math.sin(v.angle) * patrolRadius;
            
            // 부드럽게 이동
            v.x += (targetX - v.x) * dt * 3;
            v.y += (targetY - v.y) * dt * 3;
        }
    }

    // 1. 적 생성
    // 적 생성 (안전영역이면 느리게)
    const currentSpawnRate = this.isSafeZone ? this.safeZoneSpawnRate : this.spawnRate;
    this.waveTimer += dt;
    if (this.waveTimer > currentSpawnRate) {
      this.spawnEnemy();
      this.waveTimer = 0;
    }

    // 2. 적 이동 및 충돌
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        
        // 이동
        const dx = this.core.x - enemy.x;
        const dy = this.core.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        // 쉴드 충돌 체크 (Active 상태일 때만)
        if (this.core.shieldActive && dist < this.core.shieldRadius + enemy.radius) {
            // 쉴드 피격
            this.core.shieldHp -= 10; // 적 하나당 내구도 10 감소
            this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);
            this.enemies.splice(i, 1);
            
            // 내구도 0 되면 파괴
            if (this.core.shieldHp <= 0) {
                this.core.shieldHp = 0;
                this.core.shieldActive = false;
                this.core.shieldState = "BROKEN";
                this.core.shieldTimer = 5.0; // 5초간 쉴드 사용 불가
                this.updateShieldBtnUI("BROKEN", "#555");
                this.createExplosion(this.core.x, this.core.y, "#00f0ff", 30); // 쉴드 파괴 이펙트
            } else {
                this.updateShieldBtnUI("ACTIVE", "#fff");
            }
            continue;
        }

        // 코어 충돌 체크 (쉴드 없거나 뚫림)
        if (dist < this.core.radius + enemy.radius) {
            this.core.hp -= enemy.damage;
            this.createExplosion(enemy.x, enemy.y, "#ff0000", 20);
            this.enemies.splice(i, 1);
            
            if (this.core.hp <= 0) {
              this.core.hp = 0;
              this.createExplosion(this.core.x, this.core.y, "#ff0000", 50);
              this.stop();
              if (this.onGameOver) this.onGameOver();
            }
            continue;
        }

        // 이동 적용
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed * dt;
            enemy.y += (dy / dist) * enemy.speed * dt;
        }
    }

    // 3. 포탑 로직
    let nearestEnemy = null;
    let minDist = Infinity;

    this.enemies.forEach(enemy => {
      const dist = Math.hypot(enemy.x - this.core.x, enemy.y - this.core.y);
      if (dist < this.turret.range && dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy) {
      const dx = nearestEnemy.x - this.core.x;
      const dy = nearestEnemy.y - this.core.y;
      this.turret.angle = Math.atan2(dy, dx);

      if (now - this.turret.lastFireTime > (1 / this.turret.fireRate)) {
        this.fireProjectile(nearestEnemy);
        this.turret.lastFireTime = now;
      }
    } else {
        this.turret.angle += dt; 
    }

    // 4. 발사체 이동
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.target && this.enemies.includes(p.target)) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.hypot(dx, dy);
        
        p.x += (dx / dist) * p.speed * dt;
        p.y += (dy / dist) * p.speed * dt;

        if (dist < p.radius + p.target.radius) {
          p.target.hp -= p.damage;
          this.createExplosion(p.x, p.y, "#ffff00", 3);
          this.projectiles.splice(i, 1);

          // 적 처치
          if (p.target.hp <= 0) {
            const idx = this.enemies.indexOf(p.target);
            if (idx > -1) {
              this.enemies.splice(idx, 1);
              this.createExplosion(p.target.x, p.target.y, "#00ff00", 15);
              
              // [수정] 쉴드 켜져있어도 자원 획득! (페널티 없음)
              const gain = 10; 
              this.currentData += gain;
              this.updateResourceDisplay(this.currentData);
              if (this.onResourceGained) this.onResourceGained(gain);
            }
          }
        }
      } else {
        p.x += Math.cos(p.angle) * p.speed * dt;
        p.y += Math.sin(p.angle) * p.speed * dt;
      }
    }

    // 5. 파티클
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = p.life / p.maxLife;
        
        if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateWaveDisplay() {
      if (this.isSafeZone) {
          this.pageDisplay.innerText = "SAFE ZONE";
          this.pageDisplay.style.color = "#00ff00"; // 녹색
          this.pageDisplay.style.borderColor = "#00ff00";
      } else {
          this.pageDisplay.innerText = `PAGE: ${this.currentPage} / 12`;
          this.pageDisplay.style.color = "#00f0ff"; // 시안
          this.pageDisplay.style.borderColor = "#00f0ff";
      }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 줌 아웃 효과 적용 (중심 기준 스케일링)
    this.ctx.save();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(this.gameScale, this.gameScale);
    this.ctx.translate(-centerX, -centerY);

    // 0. 배리어 그리기 (상태별 색상)
    if (this.core.shieldActive) {
        this.ctx.beginPath();
        this.ctx.arc(this.core.x, this.core.y, this.core.shieldRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = "rgba(0, 200, 255, 0.1)"; 
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 + Math.sin(Date.now() / 200) * 0.2})`;
        this.ctx.stroke();
    } else if (this.core.shieldState === "BROKEN") {
        // 깨진 쉴드 파편 느낌? (일단 점선)
        this.ctx.beginPath();
        this.ctx.arc(this.core.x, this.core.y, this.core.shieldRadius, 0, Math.PI * 2);
        this.ctx.setLineDash([5, 15]);
        this.ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    // 아군 바이러스 그리기 (HP 바 삭제, 크기 유지)
    this.alliedViruses.forEach(v => {
        this.ctx.fillStyle = v.color;
        this.ctx.beginPath();
        this.ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        this.ctx.fill();
    });

    // 1. 발사체
    this.ctx.fillStyle = "#ffff00";
    this.projectiles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 2. 적
    this.enemies.forEach(e => {
      this.ctx.fillStyle = "#ff3333";
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      const hpPct = e.hp / e.maxHp;
      this.ctx.fillStyle = "#550000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20, 4);
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20 * hpPct, 4);
    });

    // 3. 코어 및 포탑 (포탑 발사대 삭제)
    this.ctx.save();
    this.ctx.translate(this.core.x, this.core.y);
    this.ctx.rotate(this.turret.angle);
    // 발사대 그리기 삭제됨
    this.ctx.restore();

    // 코어 스케일 적용 (원근감 효과)
    const coreScale = this.core.scale || 1;
    const scaledRadius = this.core.radius * coreScale;
    
    this.ctx.beginPath();
    this.ctx.arc(this.core.x, this.core.y, scaledRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.core.color;
    this.ctx.fill();
    this.ctx.lineWidth = 3 * coreScale;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.stroke();
    
    // 코어 체력 퍼센트 표시 (글리치 효과 적용)
    if (this.showCoreHP !== false) {
      const hpPercent = Math.round((this.core.hp / this.core.maxHp) * 100);
      
      // 글리치 오프셋
      const offsetX = this.glitchText ? (this.glitchOffset?.x || 0) : 0;
      const offsetY = this.glitchText ? (this.glitchOffset?.y || 0) : 0;
      
      this.ctx.font = `bold ${14 * coreScale}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      
      // 글리치 효과: 색상 분리
      if (this.glitchText) {
        // 빨간색 오프셋
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        this.ctx.fillText(`${hpPercent}%`, this.core.x + offsetX - 2, this.core.y - scaledRadius - 15 + offsetY);
        // 파란색 오프셋
        this.ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        this.ctx.fillText(`${hpPercent}%`, this.core.x + offsetX + 2, this.core.y - scaledRadius - 15 + offsetY);
      }
      
      // 메인 텍스트
      this.ctx.fillStyle = hpPercent > 30 ? "#00ff00" : "#ff3333";
      this.ctx.fillText(`${hpPercent}%`, this.core.x + offsetX, this.core.y - scaledRadius - 15 + offsetY);
    }

    // 4. 파티클
    this.particles.forEach(p => {
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
    });

    // 5. 코어 HP 바 (삭제됨 - 코어 체력 표시 안함)
    // const barWidth = 100;
    // const barHeight = 10;
    // const hpPercent = Math.max(0, this.core.hp / this.core.maxHp);
    // this.ctx.fillStyle = "#333";
    // this.ctx.fillRect(this.core.x - barWidth/2, this.core.y + 40, barWidth, barHeight);
    // this.ctx.fillStyle = hpPercent > 0.3 ? "#0f0" : "#f00";
    // this.ctx.fillRect(this.core.x - barWidth/2, this.core.y + 40, barWidth * hpPercent, barHeight);
    // this.ctx.fillStyle = "#fff";
    // this.ctx.font = "12px monospace";
    // this.ctx.textAlign = "center";
    // this.ctx.fillText(`CORE: ${Math.floor(hpPercent * 100)}%`, this.core.x, this.core.y + 65);
    
    // 줌 아웃 스케일 복원
    this.ctx.restore();
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
    
    const ex = this.core.x + Math.cos(angle) * distance;
    const ey = this.core.y + Math.sin(angle) * distance;

    this.enemies.push({
      x: ex,
      y: ey,
      radius: 10, // 적 크기 축소 (15 -> 10)
      speed: 50 + Math.random() * 30,
      hp: 30,
      maxHp: 30,
      damage: 10
    });
  }

  fireProjectile(target) {
    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: target,
      angle: this.turret.angle,
      speed: 400, // 탄속 증가
      damage: this.turret.damage,
      radius: 4,
      life: 2.0
    });
    
    this.createExplosion(this.core.x + Math.cos(this.turret.angle)*40, this.core.y + Math.sin(this.turret.angle)*40, "#fff", 3);
  }

  createExplosion(x, y, color, count = 10) {
      // 모바일 최적화: 파티클 수 감소
      const actualCount = Math.ceil(count * this.particleMultiplier);
      
      // 파티클 수 제한 체크
      if (this.particles.length >= this.maxParticles) {
          // 오래된 파티클 제거
          this.particles.splice(0, actualCount);
      }
      
      for(let i=0; i<actualCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 100;
          const life = 0.3 + Math.random() * 0.3; // 수명 단축
          this.particles.push({
              x: x,
              y: y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: life,
              maxLife: life,
              alpha: 1,
              color: color,
              size: 2 + Math.random() * 2
          });
      }
  }

  animate(time) {
    if (!this.isRunning) return;
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.update(deltaTime);
    this.render();
    requestAnimationFrame((t) => this.animate(t));
  }

  /**
   * 스테이지 진입 연출 (극적인 원근법 + 글리치)
   */
  playIntroAnimation() {
    return new Promise(resolve => {
      // 중앙 좌표 저장
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      // 1. 초기화 (모든 요소 완전히 제거)
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.alliedViruses = [];
      this.core.shieldRadius = 0;
      this.core.x = centerX;
      this.core.y = centerY;
      
      // 체력 표시 숨김 (착지 후 글리치로 나타남)
      this.showCoreHP = false;
      
      // 원근법: 화면 전체를 덮을 정도로 크게 (50x)
      const startScale = 50.0;
      const duration = 300; // 0.3초 (더 빠르게!)
      const startTime = performance.now();
      
      this.core.scale = startScale;
      
      console.log("[IntroAnimation] Starting with scale:", startScale);
      
      const animateDrop = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // ease-in quint (더 급격하게)
        const easeInQuint = t => t * t * t * t * t;
        
        // 스케일: 50x → 1x (급격히)
        this.core.scale = startScale - (startScale - 1) * easeInQuint(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animateDrop);
        } else {
          // 착지!
          this.core.scale = 1;
          
          // 착지 효과
          this.impactEffect();
          
          // 글리치 효과로 체력 표시
          this.glitchShowHP().then(() => {
            // 아군 순차 생성
            this.spawnAlliesSequentially().then(() => {
              this.expandShield().then(resolve);
            });
          });
        }
      };
      
      requestAnimationFrame(animateDrop);
    });
  }

  // 착지 충격 효과 (화면 번쩍 + 흔들림 + 충격파)
  impactEffect() {
    // 1. 화면 번쩍 (흰색 플래시)
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: white;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.8;
    `;
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.style.transition = "opacity 0.2s";
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 200);
    }, 50);
    
    // 2. 화면 흔들림
    this.shakeScreen();
    
    // 3. 충격파 파티클
    this.spawnShockwave();
  }

  // 글리치 효과로 HP 표시
  glitchShowHP() {
    return new Promise(resolve => {
      let glitchCount = 0;
      const maxGlitches = 8;
      
      const doGlitch = () => {
        if (glitchCount >= maxGlitches) {
          this.showCoreHP = true;
          this.glitchText = false;
          resolve();
          return;
        }
        
        // 랜덤하게 표시/숨김 (치지직)
        this.showCoreHP = Math.random() > 0.3;
        this.glitchText = true;
        this.glitchOffset = {
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 5
        };
        
        glitchCount++;
        setTimeout(doGlitch, 40 + Math.random() * 30);
      };
      
      doGlitch();
    });
  }

  // 화면 흔들림 효과
  shakeScreen() {
    const container = document.getElementById("game-container");
    if (!container) return;
    
    container.style.transition = "none";
    let shakeCount = 0;
    const maxShakes = 8;
    const shakeIntensity = 15; // 더 강하게
    
    const doShake = () => {
      if (shakeCount >= maxShakes) {
        container.style.transform = "translate(0, 0)";
        return;
      }
      
      const decay = 1 - shakeCount / maxShakes;
      const x = (Math.random() - 0.5) * shakeIntensity * decay;
      const y = (Math.random() - 0.5) * shakeIntensity * decay;
      container.style.transform = `translate(${x}px, ${y}px)`;
      
      shakeCount++;
      setTimeout(doShake, 40);
    };
    
    doShake();
  }

  // 착지 충격 파티클
  spawnImpactParticles(intensity) {
    for(let i = 0; i < intensity * 3; i++) {
      this.particles.push({
        x: this.core.x + (Math.random() - 0.5) * 30,
        y: this.core.y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5 - 2,
        life: 0.5,
        maxLife: 0.5,
        alpha: 1,
        color: "#00ffff",
        size: Math.random() * 3 + 1
      });
    }
  }

  spawnShockwave() {
    // 충격파 파티클 생성 (모바일 최적화)
    const count = this.isMobile ? 8 : 20;
    for(let i=0; i<count; i++) {
      this.particles.push({
        x: this.core.x,
        y: this.core.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0.6,
        maxLife: 0.6,
        alpha: 1,
        color: "#00ffff",
        size: Math.random() * 5 + 2
      });
    }
  }

  async spawnAlliesSequentially() {
    const count = this.alliedInfo.count;
    console.log("[spawnAllies] Starting, count:", count);
    
    if (!count || count === 0) {
      console.log("[spawnAllies] No allies to spawn");
      return;
    }

    // 확실한 초기화
    this.alliedViruses = [];
    
    const delay = 250; // 0.25초 간격
    const targetRadius = 55; // 최종 위치 (코어에서 거리)

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i; // 시계 방향
      
      // 아군 바이러스 추가 (코어 중앙에서 시작)
      const ally = {
        x: this.core.x, // 코어 중앙에서 시작
        y: this.core.y,
        targetX: this.core.x + Math.cos(angle) * targetRadius,
        targetY: this.core.y + Math.sin(angle) * targetRadius,
        hp: 10 + (this.alliedInfo.level - 1) * 5,
        maxHp: 10 + (this.alliedInfo.level - 1) * 5,
        damage: 10,
        angle: angle,
        radius: 6,
        color: this.alliedInfo.color || "#00aaff",
        target: null,
        attackTimer: 0,
        // 튀어나오기 애니메이션용
        spawning: true,
        spawnProgress: 0
      };
      
      this.alliedViruses.push(ally);
      console.log("[spawnAllies] 푝! Ally", i + 1, "of", count);
      
      // 튀어나오기 애니메이션 (비동기로 실행)
      this.animateAllySpawn(ally, targetRadius, angle);
      
      // 다음 아군까지 대기
      await new Promise(r => setTimeout(r, delay));
    }
    
    console.log("[spawnAllies] Complete! Total:", this.alliedViruses.length);
  }

  // 아군 튀어나오기 애니메이션
  animateAllySpawn(ally, targetRadius, angle) {
    const duration = 300; // 0.3초
    const startTime = performance.now();
    const overshoot = 1.3; // 목표보다 30% 더 나갔다가 되돌아옴
    
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // elastic ease-out (튀어나갔다가 되돌아옴)
      const elasticOut = (t) => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
      };
      
      const eased = elasticOut(progress);
      
      // 현재 반지름 계산 (overshoot 적용)
      const currentRadius = targetRadius * eased;
      
      ally.x = this.core.x + Math.cos(angle) * currentRadius;
      ally.y = this.core.y + Math.sin(angle) * currentRadius;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ally.spawning = false;
        ally.x = this.core.x + Math.cos(angle) * targetRadius;
        ally.y = this.core.y + Math.sin(angle) * targetRadius;
        
        // 착지 파티클 (모바일에선 줄임)
        const particleCount = this.isMobile ? 3 : 6;
        for (let p = 0; p < particleCount; p++) {
          const pAngle = (Math.PI * 2 / particleCount) * p;
          this.particles.push({
            x: ally.x,
            y: ally.y,
            vx: Math.cos(pAngle) * 3,
            vy: Math.sin(pAngle) * 3,
            life: 0.3,
            maxLife: 0.3,
            alpha: 1,
            color: ally.color,
            size: 3
          });
        }
      }
    };
    
    // 시작 파티클 (코어에서 푝!) - 모바일에선 줄임
    const startParticles = this.isMobile ? 2 : 4;
    for (let p = 0; p < startParticles; p++) {
      this.particles.push({
        x: this.core.x,
        y: this.core.y,
        vx: Math.cos(angle) * 2 + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * 2 + (Math.random() - 0.5) * 2,
        life: 0.2,
        maxLife: 0.2,
        alpha: 1,
        color: "#ffffff",
        size: 4
      });
    }
    
    requestAnimationFrame(animate);
  }

  expandShield() {
    return new Promise(resolve => {
      const targetRadius = 70;
      const duration = 300; // 0.3초 (더 빠르게)
      const start = performance.now();
      
      const animateShield = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // ease-out elastic 효과
        const elastic = x => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
        
        this.core.shieldRadius = targetRadius * elastic(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animateShield);
        } else {
          this.core.shieldRadius = targetRadius;
          resolve();
        }
      };
      requestAnimationFrame(animateShield);
    });
  }
}
