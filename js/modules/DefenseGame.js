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
    this.resourceDisplay.style.pointerEvents = "auto"; // 클릭 가능하게
    this.resourceDisplay.innerText = "DATA: 0 MB";
    this.uiLayer.appendChild(this.resourceDisplay);

    // 2. 배리어 토글 버튼 (모바일 친화적 위치: 하단 중앙)
    this.shieldBtn = document.createElement("button");
    this.shieldBtn.style.position = "absolute";
    this.shieldBtn.style.bottom = "100px"; // 터미널 입력창 고려하여 위치 조정
    this.shieldBtn.style.left = "50%";
    this.shieldBtn.style.transform = "translateX(-50%)";
    this.shieldBtn.style.width = "200px";
    this.shieldBtn.style.height = "60px";
    this.shieldBtn.style.backgroundColor = "rgba(0, 50, 255, 0.3)";
    this.shieldBtn.style.border = "2px solid #00f0ff";
    this.shieldBtn.style.color = "#00f0ff";
    this.shieldBtn.style.fontFamily = "var(--term-font)";
    this.shieldBtn.style.fontSize = "18px";
    this.shieldBtn.style.cursor = "pointer";
    this.shieldBtn.style.pointerEvents = "auto";
    this.shieldBtn.style.zIndex = "30";
    this.shieldBtn.innerHTML = "SHIELD: <span style='color:#fff'>ACTIVE</span>";
    this.shieldBtn.onclick = () => this.toggleShield();
    this.uiLayer.appendChild(this.shieldBtn);

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
      shieldActive: true, // 초기값: 배리어 켜짐
      shieldRadius: 100   // 배리어 반경
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
    
    // 웨이브 관리
    this.waveTimer = 0;
    this.spawnRate = 1.5;

    // 이벤트 콜백
    this.onResourceGained = null; 
    this.onGameOver = null;

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

  toggleShield() {
      this.core.shieldActive = !this.core.shieldActive;
      
      if (this.core.shieldActive) {
          this.shieldBtn.innerHTML = "SHIELD: <span style='color:#fff'>ACTIVE</span>";
          this.shieldBtn.style.borderColor = "#00f0ff";
          this.shieldBtn.style.color = "#00f0ff";
          this.shieldBtn.style.backgroundColor = "rgba(0, 50, 255, 0.3)";
      } else {
          this.shieldBtn.innerHTML = "SHIELD: <span style='color:#f00'>OFFLINE</span>";
          this.shieldBtn.style.borderColor = "#ff3333";
          this.shieldBtn.style.color = "#ff3333";
          this.shieldBtn.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
      }
  }

  start() {
    this.resize();
    this.isRunning = true;
    this.canvas.style.display = "block";
    this.uiLayer.style.display = "block"; // UI 표시
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

    // 1. 적 생성
    this.waveTimer += dt;
    if (this.waveTimer > this.spawnRate) {
      this.spawnEnemy();
      this.waveTimer = 0;
      if (this.spawnRate > 0.3) this.spawnRate -= 0.005; 
    }

    // 2. 적 이동 및 충돌
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        
        // 이동
        const dx = this.core.x - enemy.x;
        const dy = this.core.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        // 쉴드 충돌 체크
        if (this.core.shieldActive && dist < this.core.shieldRadius + enemy.radius) {
            // 쉴드에 닿으면 튕겨내거나 소멸 (자원 획득 X)
            this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);
            this.enemies.splice(i, 1);
            continue;
        }

        // 코어 충돌 체크 (쉴드 꺼진 상태)
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
              
              // [핵심] 쉴드가 꺼져있을 때만 자원 획득!
              if (!this.core.shieldActive) {
                  const gain = 10; // 마리당 10MB
                  this.currentData += gain;
                  this.updateResourceDisplay(this.currentData); // UI 즉시 갱신
                  if (this.onResourceGained) this.onResourceGained(gain);
              } else {
                  // 쉴드 켜져있으면 그냥 제거됨 (보상 없음)
              }
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

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 0. 배리어 그리기 (활성화 상태일 때만)
    if (this.core.shieldActive) {
        this.ctx.beginPath();
        this.ctx.arc(this.core.x, this.core.y, this.core.shieldRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = "rgba(0, 200, 255, 0.1)"; // 내부 반투명
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 + Math.sin(Date.now() / 200) * 0.2})`; // 맥동 효과
        this.ctx.stroke();
        
        // 텍스트 (SAFE MODE)
        this.ctx.fillStyle = "#00f0ff";
        this.ctx.font = "12px monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText("SHIELD ONLINE", this.core.x, this.core.y - this.core.shieldRadius - 10);
    } else {
        // 위험 경고
        this.ctx.fillStyle = "#ff3333";
        this.ctx.font = "bold 12px monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText("!!! FARMING MODE !!!", this.core.x, this.core.y - this.core.shieldRadius - 10);
    }

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
