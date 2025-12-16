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

    // 1. 우측 상단 자원 표시기
    this.resourceDisplay = document.createElement("div");
    this.resourceDisplay.id = "resource-display";
    this.resourceDisplay.style.position = "absolute";
    this.resourceDisplay.style.top = "20px";
    this.resourceDisplay.style.right = "20px";
    this.resourceDisplay.style.color = "#00f0ff";
    this.resourceDisplay.style.fontFamily = "var(--term-font)";
    this.resourceDisplay.style.fontSize = "24px";
    this.resourceDisplay.style.fontWeight = "bold";
    this.resourceDisplay.style.textShadow = "0 0 10px #00f0ff";
    this.resourceDisplay.style.backgroundColor = "rgba(0, 20, 0, 0.7)";
    this.resourceDisplay.style.padding = "10px 20px";
    this.resourceDisplay.style.border = "1px solid #00f0ff";
    this.resourceDisplay.style.pointerEvents = "auto";
    this.resourceDisplay.style.userSelect = "none";
    this.resourceDisplay.innerText = "DATA: 0 MB";
    this.uiLayer.appendChild(this.resourceDisplay);

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
    this.shieldBtn.innerHTML = "SHIELD: <span style='color:#fff'>ACTIVE</span><br><span style='font-size:12px'>(100%)</span>";
    this.shieldBtn.onclick = () => this.toggleShield();
    this.uiLayer.appendChild(this.shieldBtn);

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

    // 웨이브 정보 표시
    this.waveInfo = document.createElement("div");
    this.waveInfo.id = "wave-info";
    this.waveInfo.style.position = "absolute";
    this.waveInfo.style.top = "20px";
    this.waveInfo.style.left = "20px";
    this.waveInfo.style.color = "#fff";
    this.waveInfo.style.fontFamily = "var(--term-font)";
    this.waveInfo.style.fontSize = "18px";
    this.waveInfo.style.textShadow = "0 0 5px rgba(255,255,255,0.5)";
    this.waveInfo.innerText = "PAGE: 1 / 12";
    this.uiLayer.appendChild(this.waveInfo);

    // 게임 상태 변수
    this.isRunning = false;
    this.lastTime = 0;
    
    // 코어 설정
    this.core = {
      x: 0,
      y: 0,
      radius: 30,
      hp: 100,
      maxHp: 100,
      color: "#00f0ff",
      // 쉴드 관련
      shieldActive: true,      // 현재 켜져있는지
      shieldState: "ACTIVE",   // ACTIVE, OFF, CHARGING, DISCHARGING, BROKEN
      shieldHp: 100,           // 내구도
      shieldMaxHp: 100,
      shieldRadius: 100,
      shieldTimer: 0           // 상태 전환 타이머
    };

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
    
    // 이벤트 콜백
    this.onResourceGained = null; 
    this.onGameOver = null;
    this.onConquer = null; // 점령 요청 콜백

    // 아군 정보 (ConquestManager에서 주입)
    this.alliedInfo = { count: 0, level: 1, color: "#00ff00" };

    // 현재 자원 (GameManager와 동기화용)
    this.currentData = 0;

    window.addEventListener("resize", () => this.resize());
    
    // 모바일 스타일 조정
    if (window.innerWidth <= 768) {
        this.resourceDisplay.style.fontSize = "16px";
        this.resourceDisplay.style.padding = "5px 10px";
        this.shieldBtn.style.bottom = "80px";
        this.shieldBtn.style.width = "160px";
        this.shieldBtn.style.height = "50px";
    }
    
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.core.x = this.canvas.width / 2;
    this.core.y = this.canvas.height / 2;
  }

  // 자원 업데이트 (GameManager에서 호출)
  updateResourceDisplay(amount) {
      this.currentData = amount;
      this.resourceDisplay.innerText = `DATA: ${this.currentData} MB`;
  }

  // 외부에서 아군 정보 업데이트
  updateAlliedInfo(info) {
      this.alliedInfo = info;
      // 아군 바이러스 생성 (전투 가능한 유닛)
      this.alliedViruses = [];
      for(let i=0; i<info.count; i++) {
          const angle = (Math.PI * 2 / info.count) * i;
          const r = 60; // 코어 주변
          this.alliedViruses.push({
              x: this.core.x + Math.cos(angle) * r,
              y: this.core.y + Math.sin(angle) * r,
              angle: angle,
              radius: 4 + (info.level * 1), // 레벨업 시 크기 증가
              color: info.color,
              hp: info.hp || (info.level * 10), // 체력
              maxHp: info.hp || (info.level * 10),
              damage: info.level * 5 // 레벨당 데미지 증가
          });
      }
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
          this.core.shieldState === "BROKEN") {
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

  updateShieldBtnUI(text, color) {
      const hpPct = Math.floor((this.core.shieldHp / this.core.shieldMaxHp) * 100);
      this.shieldBtn.innerHTML = `SHIELD: <span style='color:${color}'>${text}</span><br><span style='font-size:12px'>(${hpPct}%)</span>`;
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
        if (this.core.shieldTimer <= 0) {
            this.core.shieldState = "OFF"; // 수리 완료, 하지만 꺼진 상태
            this.core.shieldHp = this.core.shieldMaxHp * 0.1; // 10% 복구
            this.updateShieldBtnUI("OFFLINE", "#f00");
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

    // 0.5 웨이브(페이지) 진행
    if (this.currentPage <= 12) {
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
                    this.waveInfo.innerText = "PAGE: MAX (CONQUER READY)";
                }
            }
        }
    }

    // 0.8 아군 바이러스 로직 (회전 + 적과 전투)
    this.alliedViruses.forEach((v, idx) => {
        // 회전
        v.angle += dt * 0.5;
        const r = 50 + Math.sin(now * 2 + v.angle) * 5;
        v.x = this.core.x + Math.cos(v.angle) * r;
        v.y = this.core.y + Math.sin(v.angle) * r;
        
        // HP가 없으면 제거 (사망)
        if (v.hp <= 0) {
            this.alliedViruses.splice(idx, 1);
            return;
        }
        
        // 가장 가까운 적 찾기
        let nearestEnemy = null;
        let minDist = Infinity;
        
        this.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - v.x, enemy.y - v.y);
            if (dist < 80 && dist < minDist) { // 사거리 80
                minDist = dist;
                nearestEnemy = enemy;
            }
        });
        
        // 적과 충돌 시 전투
        if (nearestEnemy) {
            const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
            if (dist < v.radius + nearestEnemy.radius) {
                // 충돌: 서로 데미지
                nearestEnemy.hp -= v.damage || 5; // 아군 데미지
                v.hp -= nearestEnemy.damage || 10; // 적 데미지
                
                this.createExplosion((v.x + nearestEnemy.x) / 2, (v.y + nearestEnemy.y) / 2, v.color, 3);
                
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
                // 사거리 내 적에게 이동
                const dx = nearestEnemy.x - v.x;
                const dy = nearestEnemy.y - v.y;
                const moveSpeed = 30 * dt;
                v.x += (dx / dist) * moveSpeed;
                v.y += (dy / dist) * moveSpeed;
            }
        }
    });

    // 1. 적 생성
    this.waveTimer += dt;
    if (this.waveTimer > this.spawnRate) {
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
      this.waveInfo.innerText = `PAGE: ${this.currentPage} / 12`;
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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

    // 아군 바이러스 그리기 (HP 바 포함)
    this.alliedViruses.forEach(v => {
        this.ctx.fillStyle = v.color;
        this.ctx.beginPath();
        this.ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // HP 바
        const hpPct = v.hp / v.maxHp;
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(v.x - 8, v.y - v.radius - 8, 16, 3);
        this.ctx.fillStyle = hpPct > 0.5 ? "#0f0" : "#f00";
        this.ctx.fillRect(v.x - 8, v.y - v.radius - 8, 16 * hpPct, 3);
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

    // 3. 코어 및 포탑
    this.ctx.save();
    this.ctx.translate(this.core.x, this.core.y);
    this.ctx.rotate(this.turret.angle);
    this.ctx.fillStyle = "#33ff00";
    this.ctx.fillRect(0, -5, 40, 10);
    this.ctx.restore();

    this.ctx.beginPath();
    this.ctx.arc(this.core.x, this.core.y, this.core.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.core.color;
    this.ctx.fill();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.stroke();

    // 4. 파티클
    this.particles.forEach(p => {
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
    });

    // 5. 코어 HP 바
    const barWidth = 100;
    const barHeight = 10;
    const hpPercent = Math.max(0, this.core.hp / this.core.maxHp);
    
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(this.core.x - barWidth/2, this.core.y + 40, barWidth, barHeight);
    
    this.ctx.fillStyle = hpPercent > 0.3 ? "#0f0" : "#f00";
    this.ctx.fillRect(this.core.x - barWidth/2, this.core.y + 40, barWidth * hpPercent, barHeight);
    
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`CORE: ${Math.floor(hpPercent * 100)}%`, this.core.x, this.core.y + 65);
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
    
    const ex = this.core.x + Math.cos(angle) * distance;
    const ey = this.core.y + Math.sin(angle) * distance;

    this.enemies.push({
      x: ex,
      y: ey,
      radius: 15,
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
      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 100;
          this.particles.push({
              x: x,
              y: y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0.5 + Math.random() * 0.5,
              maxLife: 1.0,
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
}
