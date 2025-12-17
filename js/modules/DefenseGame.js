export class DefenseGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    
    // 캔버스 생성 (body에 직접 부착하여 game-container와 분리)
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    // CSS 크기는 설정하지 않음 - resize()에서 내부 해상도만 설정
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
    
    // 실드 시각 효과용 보간 변수 (부드러운 전환)
    this.shieldVisual = {
      alpha: 0.7,           // 현재 투명도
      targetAlpha: 0.7,     // 목표 투명도
      dashGap: 0,           // 현재 점선 간격 (0=실선)
      targetDashGap: 0,     // 목표 점선 간격
      lineWidth: 2,         // 현재 선 두께
      targetLineWidth: 2,   // 목표 선 두께
      rotation: 0,          // 현재 회전 오프셋
      rotationSpeed: 0,     // 현재 회전 속도
      targetRotationSpeed: 0, // 목표 회전 속도
      fillAlpha: 0.1,       // 채우기 투명도
      targetFillAlpha: 0.1  // 목표 채우기 투명도
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
    this.uiLayer.style.zIndex = "90"; // 터미널(100)보다 낮게
    this.uiLayer.style.display = "none";
    document.body.appendChild(this.uiLayer); // [수정] container가 아닌 body에 직접 부착

    // PAGE 표시는 TerminalUI에서 관리 (onPageUpdate 콜백으로 업데이트)
    this.onPageUpdate = null; // 페이지 업데이트 콜백

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
    
    // 강화 페이지 모드 (점령 시)
    this.isReinforcementMode = false;
    this.reinforcementPage = 0;
    this.reinforcementMaxPages = 3;
    this.reinforcementComplete = false;
    this.reinforcementSpawnRate = 1.2; // 약하게 조정 (기존 0.5 → 1.2)
    
    // 점령 상태 (영구)
    this.isConquered = false; // 이 스테이지가 점령되었는지
    
    // 이벤트 콜백
    this.onResourceGained = null; 
    this.onGameOver = null;
    this.onConquer = null; // 점령 요청 콜백
    this.onConquerReady = null; // 점령 가능 상태 콜백 (선택지 갱신용)
    
    // 점령 가능 상태
    this.conquerReady = false;

    // 아군 정보 (ConquestManager에서 주입)
    this.alliedInfo = { count: 0, level: 1, color: "#00aaff" }; // 파란색으로 변경

    // 현재 자원 (GameManager와 동기화용)
    this.currentData = 0;

    window.addEventListener("resize", () => this.resize());
    
    // 🛡️ 탭 비활성화/활성화 감지 (모바일 앱 전환 대응)
    document.addEventListener("visibilitychange", () => this.handleVisibilityChange());
    
    // 모바일 스타일 조정
    if (window.innerWidth <= 768) {
        this.shieldBtn.style.bottom = "80px";
        this.shieldBtn.style.width = "160px";
        this.shieldBtn.style.height = "50px";
    }
    
    // 포탑 자동 회전 (적 없을 때)
    this.idleTurretAngle = 0;
    this.idleTurretSpeed = 1.5; // 초당 1.5 라디안 (시계방향)
    
    // 화면 터치/클릭으로 탄환 발사
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener("touchstart", (e) => this.handleCanvasTouch(e), { passive: false });
    
    // 스페이스바 발사 (PC용)
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    
    this.resize();
  }
  
  // 🛡️ 탭 비활성화/활성화 처리
  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      console.log("[Defense] Tab restored - validating game state");
      // 탭 복귀 시 상태 복구
      this.validateGameState();
      this.resize(); // 캔버스 재확인
      
      // 시간 기준 리셋 (deltaTime 폭발 방지)
      this.lastTime = performance.now();
    } else {
      console.log("[Defense] Tab hidden - pausing updates");
    }
  }
  
  // 🛡️ 게임 상태 유효성 검증 및 복구
  validateGameState() {
    // 1. 코어 위치 검증
    if (!this.core.x || !this.core.y || 
        isNaN(this.core.x) || isNaN(this.core.y) ||
        this.core.x < 0 || this.core.x > this.canvas.width ||
        this.core.y < 0 || this.core.y > this.canvas.height) {
      console.warn("[Defense] Core position invalid, resetting to center");
      this.core.x = this.canvas.width / 2;
      this.core.y = this.canvas.height / 2;
    }
    
    // 2. 코어 HP 검증
    if (isNaN(this.core.hp) || this.core.hp < 0) {
      console.warn("[Defense] Core HP invalid, resetting");
      this.core.hp = this.core.maxHp;
    }
    
    // 3. 실드 상태 검증
    if (isNaN(this.core.shieldHp)) {
      console.warn("[Defense] Shield HP invalid, resetting");
      this.core.shieldHp = this.core.shieldMaxHp;
    }
    
    // 4. 화면 밖 적 제거
    this.enemies = this.enemies.filter(e => {
      const margin = 200;
      return e.x > -margin && e.x < this.canvas.width + margin &&
             e.y > -margin && e.y < this.canvas.height + margin &&
             !isNaN(e.x) && !isNaN(e.y);
    });
    
    // 5. 화면 밖 아군 바이러스 재배치
    this.alliedViruses.forEach(v => {
      if (isNaN(v.x) || isNaN(v.y) ||
          v.x < 0 || v.x > this.canvas.width ||
          v.y < 0 || v.y > this.canvas.height) {
        // 코어 주변으로 재배치
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 40;
        v.x = this.core.x + Math.cos(angle) * dist;
        v.y = this.core.y + Math.sin(angle) * dist;
        console.warn("[Defense] Allied virus repositioned");
      }
    });
    
    // 6. 화면 밖 발사체 제거
    this.projectiles = this.projectiles.filter(p => {
      return p.x > -50 && p.x < this.canvas.width + 50 &&
             p.y > -50 && p.y < this.canvas.height + 50 &&
             !isNaN(p.x) && !isNaN(p.y);
    });
    
    // 7. 실드 시각 효과 검증
    if (!this.shieldVisual || isNaN(this.shieldVisual.alpha)) {
      console.warn("[Defense] Shield visual state invalid, resetting");
      this.shieldVisual = {
        alpha: 0.7, targetAlpha: 0.7,
        dashGap: 0, targetDashGap: 0,
        lineWidth: 2, targetLineWidth: 2,
        rotation: 0, rotationSpeed: 0, targetRotationSpeed: 0,
        fillAlpha: 0.1, targetFillAlpha: 0.1
      };
    }
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
      // 1. 실드 파괴 연출
      this.playShieldBreakAnimation();
      
      // 2. 실드 상태 변경 (점령 중에는 사용 불가)
      this.core.shieldActive = false;
      this.core.shieldState = "DISABLED"; // 점령 중 비활성화
      this.core.shieldHp = 0;
      this.updateShieldBtnUI("DISABLED", "#555");
      this.shieldBtn.style.pointerEvents = "none"; // 클릭 불가
      
      // 3. 점령 콜백 호출
      if (this.onConquer) this.onConquer();
      this.conquerBtn.style.display = "none";
      
      // 다음 페이지로 리셋은 GameManager가 처리
      this.currentPage = 1;
      this.updateWaveDisplay();
  }
  
  // 실드 파괴 애니메이션
  playShieldBreakAnimation() {
      // 파괴 파티클 (원형으로 퍼짐)
      const segments = 16;
      for (let i = 0; i < segments; i++) {
          const angle = (Math.PI * 2 / segments) * i;
          const startX = this.core.x + Math.cos(angle) * this.core.shieldRadius;
          const startY = this.core.y + Math.sin(angle) * this.core.shieldRadius;
          
          // 파편 파티클
          for (let j = 0; j < 3; j++) {
              this.particles.push({
                  x: startX,
                  y: startY,
                  vx: Math.cos(angle) * (50 + Math.random() * 50),
                  vy: Math.sin(angle) * (50 + Math.random() * 50),
                  life: 1.0,
                  maxLife: 1.0,
                  alpha: 1,
                  color: "#00f0ff",
                  size: 3 + Math.random() * 3
              });
          }
      }
      
      // 중앙 플래시
      this.flashScreen("#ff0000", 0.3);
      this.shakeScreen(20);
      
      // 실드 반경 축소 애니메이션
      const originalRadius = this.core.shieldRadius;
      const duration = 500;
      const startTime = performance.now();
      
      const animateShrink = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          this.core.shieldRadius = originalRadius * (1 - progress);
          
          if (progress < 1) {
              requestAnimationFrame(animateShrink);
          } else {
              this.core.shieldRadius = 0;
          }
      };
      
      requestAnimationFrame(animateShrink);
  }

  toggleShield() {
      // 이미 전환 중이거나 파괴된 상태면 무시
      if (this.core.shieldState === "CHARGING" || 
          this.core.shieldState === "DISCHARGING" || 
          this.core.shieldState === "BROKEN" ||
          this.core.shieldState === "RECHARGING" ||
          this.core.shieldState === "DISABLED") {
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
  
  // 실드 상태별 시각 효과 목표값 설정
  updateShieldVisualTargets() {
      const sv = this.shieldVisual;
      const state = this.core.shieldState;
      
      if (state === "ACTIVE") {
          // ACTIVE: 실선, 밝은 색, 채우기 있음
          sv.targetAlpha = 0.7;
          sv.targetDashGap = 0; // 실선
          sv.targetLineWidth = 2;
          sv.targetFillAlpha = 0.1;
          sv.targetRotationSpeed = 0; // 회전 없음
          
      } else if (state === "OFF") {
          // OFF: 연한 점선, 정적
          sv.targetAlpha = 0.2;
          sv.targetDashGap = 12; // 점선
          sv.targetLineWidth = 1;
          sv.targetFillAlpha = 0;
          sv.targetRotationSpeed = 0;
          
      } else if (state === "DISCHARGING") {
          // DISCHARGING: 점선으로 전환 중, 약간 회전
          sv.targetAlpha = 0.4;
          sv.targetDashGap = 10;
          sv.targetLineWidth = 1.5;
          sv.targetFillAlpha = 0.05;
          sv.targetRotationSpeed = 30; // 느린 회전
          
      } else if (state === "CHARGING") {
          // CHARGING: 점선 → 실선, 가속 회전
          const elapsed = 2.0 - this.core.shieldTimer;
          const progress = Math.min(1, elapsed / 2.0);
          
          // 진행률에 따라 점점 실선으로, 밝아지고, 빨라짐
          sv.targetAlpha = 0.3 + progress * 0.4;
          sv.targetDashGap = 15 * (1 - progress); // 점선 → 실선
          sv.targetLineWidth = 1 + progress * 1;
          sv.targetFillAlpha = progress * 0.1;
          sv.targetRotationSpeed = 50 + progress * 500; // 가속 회전
          
      } else if (state === "BROKEN" || state === "RECHARGING") {
          // BROKEN/RECHARGING: 철컥철컥 (stepwise rotation은 render에서 처리)
          sv.targetAlpha = 0.3;
          sv.targetDashGap = 15;
          sv.targetLineWidth = 1;
          sv.targetFillAlpha = 0;
          // 철컥철컥은 별도 처리 (rotationSpeed 사용 안함)
          sv.targetRotationSpeed = 0;
          
      } else if (state === "DISABLED") {
          // DISABLED: 거의 안 보임
          sv.targetAlpha = 0.1;
          sv.targetDashGap = 20;
          sv.targetLineWidth = 0.5;
          sv.targetFillAlpha = 0;
          sv.targetRotationSpeed = 0;
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
    this.conquerReady = false; // 점령 가능 상태 초기화
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
    
    // 🛡️ deltaTime 제한 (최대 100ms) - 탭 비활성화 후 복귀 시 폭발 방지
    const clampedDeltaTime = Math.min(deltaTime, 100);
    const dt = clampedDeltaTime / 1000;
    
    // 🛡️ 상태 유효성 검증 (모바일 메모리 이슈 방어)
    this.validateGameState();

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
    
    // 실드 시각 효과 목표값 설정 (상태별)
    this.updateShieldVisualTargets();
    
    // 실드 시각 효과 보간 (부드러운 전환)
    const lerpSpeed = 3.0; // 보간 속도 (높을수록 빠름)
    const sv = this.shieldVisual;
    sv.alpha += (sv.targetAlpha - sv.alpha) * lerpSpeed * dt;
    sv.dashGap += (sv.targetDashGap - sv.dashGap) * lerpSpeed * dt;
    sv.lineWidth += (sv.targetLineWidth - sv.lineWidth) * lerpSpeed * dt;
    sv.fillAlpha += (sv.targetFillAlpha - sv.fillAlpha) * lerpSpeed * dt;
    sv.rotationSpeed += (sv.targetRotationSpeed - sv.rotationSpeed) * lerpSpeed * dt;
    
    // 회전 오프셋 업데이트
    sv.rotation += sv.rotationSpeed * dt;

    // 0.5 웨이브(페이지) 진행
    
    // 강화 페이지 모드 (점령 중) - 이미 완료된 경우 스킵
    if (this.isReinforcementMode && !this.reinforcementComplete) {
        this.pageTimer += dt;
        if (this.pageTimer >= this.pageDuration) {
            if (this.reinforcementPage < this.reinforcementMaxPages) {
                this.reinforcementPage++;
                this.pageTimer = 0;
                this.spawnRate = Math.max(0.8, this.reinforcementSpawnRate - (this.reinforcementPage * 0.1)); // 약하게 조정
                this.updateWaveDisplay();
                console.log("[Defense] Reinforcement Page:", this.reinforcementPage);
            } else {
                // 강화 페이지 완료 -> 점령 완료!
                this.reinforcementComplete = true;
                console.log("[Defense] Reinforcement Complete!");
            }
        }
    }
    // 일반 페이지 모드
    else if (!this.isSafeZone && this.currentPage <= (this.maxPages || 12)) {
        const maxPages = this.maxPages || 12;
        const diffScale = this.difficultyScale || 1.0;
        
        this.pageTimer += dt;
        if (this.pageTimer >= this.pageDuration) {
            if (this.currentPage < maxPages) {
                this.currentPage++;
                this.pageTimer = 0;
                // 난이도 스케일 적용 (diffScale이 높을수록 빠르게 어려워짐)
                this.spawnRate = Math.max(0.2, 1.5 - (this.currentPage * 0.1 * diffScale));
                this.updateWaveDisplay();
            } else if (!this.conquerReady) {
                // 최대 페이지 완료 -> 점령 가능 상태 (무한대 아이콘)
                this.conquerReady = true;
                
                // 콜백으로 터미널에 업데이트
                if (this.onPageUpdate) {
                    this.onPageUpdate("∞ READY", "#ff3333");
                }
                
                // 점령 가능 콜백 호출 (선택지 갱신용)
                if (this.onConquerReady) {
                    this.onConquerReady();
                }
            }
        }
    }

    // 0.8 아군 바이러스 로직 (적 추적 + 몸통박치기) - for 루프로 안전하게 처리
    for (let idx = this.alliedViruses.length - 1; idx >= 0; idx--) {
        const v = this.alliedViruses[idx];
        
        // HP가 없으면 제거 (사망)
        if (v.hp <= 0) {
            console.log("[DEBUG DefenseGame] 아군 바이러스 사망, isConquered:", this.isConquered, "alliedInfo.count:", this.alliedInfo.count);
            this.createExplosion(v.x, v.y, v.color, 8);
            this.alliedViruses.splice(idx, 1);
            
            // 2초 후 리스폰 (점령 상태면 10마리, 아니면 alliedInfo.count만큼)
            console.log("[DEBUG DefenseGame] 2초 후 리스폰 예약");
            setTimeout(() => this.respawnOneAlly(), 2000);
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
        // 적이 없을 때 포탑 자동 회전 (시계방향)
        this.turret.angle += dt * this.idleTurretSpeed;
        this.idleTurretAngle = this.turret.angle; // 동기화
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
        // 직선탄 (타겟 없이 방향으로 발사)
        p.x += Math.cos(p.angle) * p.speed * dt;
        p.y += Math.sin(p.angle) * p.speed * dt;
        
        // 직선탄도 적과 충돌 검사
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dx = enemy.x - p.x;
          const dy = enemy.y - p.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < p.radius + enemy.radius) {
            enemy.hp -= p.damage;
            this.createExplosion(p.x, p.y, "#00ff00", 5);
            this.projectiles.splice(i, 1);
            
            // 적 처치
            if (enemy.hp <= 0) {
              this.enemies.splice(j, 1);
              this.createExplosion(enemy.x, enemy.y, "#00ff00", 15);
              
              const gain = 10;
              this.currentData += gain;
              this.updateResourceDisplay(this.currentData);
              if (this.onResourceGained) this.onResourceGained(gain);
            }
            break; // 한 적과 충돌하면 탄환 제거
          }
        }
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
      const maxPages = this.maxPages || 12;
      let text = "";
      let color = "#00ff00";
      
      if (this.isConquered) {
          // 점령 완료 상태
          text = "🚩 점령지";
          color = "#00ff00";
      } else if (this.isReinforcementMode) {
          // 강화 페이지 모드
          text = `⚔️ ${this.reinforcementPage}/${this.reinforcementMaxPages}`;
          color = "#ff3333";
      } else if (this.isSafeZone) {
          text = "SAFE ZONE";
          color = "#00ff00";
      } else if (this.currentPage > maxPages) {
          // 최대 페이지 초과 = 무한대 모드
          text = "∞ READY";
          color = "#ff3333";
      } else {
          text = `PAGE: ${this.currentPage} / ${maxPages}`;
          color = "#00f0ff";
      }
      
      // 콜백으로 터미널에 업데이트
      if (this.onPageUpdate) {
          this.onPageUpdate(text, color);
      }
  }
  
  // 강화 페이지 모드 시작 (점령 시)
  startReinforcementMode(maxPages = 3) {
      this.isReinforcementMode = true;
      this.reinforcementPage = 1;
      this.reinforcementMaxPages = maxPages;
      this.reinforcementComplete = false;
      this.pageTimer = 0;
      this.spawnRate = this.reinforcementSpawnRate; // 더 빠른 스폰
      this.updateWaveDisplay();
      console.log("[Defense] Reinforcement Mode Started:", maxPages, "pages");
  }
  
  // 일반 모드로 복귀
  resetToNormalMode() {
      this.isReinforcementMode = false;
      this.reinforcementPage = 0;
      this.reinforcementComplete = false;
      this.currentPage = 1;
      this.pageTimer = 0;
      this.spawnRate = 1.5;
      
      // 실드 복구
      this.core.shieldRadius = 70;
      this.core.shieldState = "OFF";
      this.core.shieldHp = this.core.shieldMaxHp;
      this.shieldBtn.style.pointerEvents = "auto";
      
      this.updateWaveDisplay();
      console.log("[Defense] Reset to Normal Mode");
  }
  
  // 점령 상태로 설정
  setConqueredState(conquered) {
      this.isConquered = conquered;
      if (conquered) {
          // 점령 시 적 스폰 중지, 실드 비활성화
          this.spawnRate = 9999; // 적 거의 안 나옴
          this.core.shieldActive = false;
          this.shieldBtn.style.display = "none"; // 실드 버튼 숨김
          
          // 아군 바이러스 10마리 소환
          this.spawnConqueredAllies(10);
      }
      this.updateWaveDisplay();
  }
  
  // 점령 시 아군 바이러스 소환
  spawnConqueredAllies(count) {
      this.alliedViruses = [];
      for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i;
          const distance = 60 + Math.random() * 30;
          this.alliedViruses.push({
              x: this.core.x + Math.cos(angle) * distance,
              y: this.core.y + Math.sin(angle) * distance,
              radius: 6,
              color: "#00aaff",
              hp: 50,
              maxHp: 50,
              damage: 10,
              angle: angle,
              targetAngle: angle
          });
      }
  }
  
  // 아군 바이러스 1마리 리스폰 (점령: 10마리, 일반: alliedInfo.count 유지)
  respawnOneAlly() {
      // 목표 아군 수 결정
      const targetCount = this.isConquered ? 10 : (this.alliedInfo.count || 0);
      
      console.log("[DEBUG DefenseGame] respawnOneAlly 호출됨, isConquered:", this.isConquered, "targetCount:", targetCount, "현재 아군 수:", this.alliedViruses.length);
      
      if (targetCount <= 0) {
          console.log("[DEBUG DefenseGame] targetCount가 0이라서 리스폰 취소");
          return;
      }
      
      if (this.alliedViruses.length >= targetCount) {
          console.log("[DEBUG DefenseGame] 이미 목표 수 달성, 리스폰 취소");
          return;
      }
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 30;
      
      // 점령 상태면 고정 스탯, 아니면 alliedInfo 기반
      const hp = this.isConquered ? 50 : (10 + (this.alliedInfo.level - 1) * 5);
      
      const newAlly = {
          x: this.core.x + Math.cos(angle) * distance,
          y: this.core.y + Math.sin(angle) * distance,
          radius: 6,
          color: this.alliedInfo.color || "#00aaff",
          hp: hp,
          maxHp: hp,
          damage: 10,
          angle: angle,
          targetAngle: angle
      };
      
      this.alliedViruses.push(newAlly);
      console.log("[DEBUG DefenseGame] 아군 바이러스 리스폰 완료, 현재 아군 수:", this.alliedViruses.length);
      
      // 팝 파티클 효과
      this.createExplosion(newAlly.x, newAlly.y, "#00aaff", 5);
  }
  
  // 점령 시각화 렌더링 (깃발 + 별 모양 방어막)
  renderConqueredVisuals() {
      const ctx = this.ctx;
      const x = this.core.x;
      const y = this.core.y;
      const size = 80; // 방어막 크기
      const time = Date.now() / 1000;
      
      // 1. 별 모양 방어막 (정사각형 + 다이아몬드)
      ctx.save();
      ctx.translate(x, y);
      
      // 정사각형 (0도)
      ctx.strokeStyle = `rgba(0, 255, 100, ${0.4 + Math.sin(time * 2) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(-size/2, -size/2, size, size);
      
      // 다이아몬드 (45도 회전)
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 + Math.cos(time * 2) * 0.2})`;
      ctx.strokeRect(-size/2, -size/2, size, size);
      
      ctx.restore();
      
      // 2. 깃발 (중앙 위)
      ctx.save();
      ctx.translate(x, y - 25);
      
      // 깃대
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -40);
      ctx.stroke();
      
      // 깃발 (펄럭이는 효과)
      ctx.fillStyle = "#00ff00";
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(20 + Math.sin(time * 3) * 3, -35);
      ctx.lineTo(20 + Math.sin(time * 3 + 1) * 3, -25);
      ctx.lineTo(0, -20);
      ctx.closePath();
      ctx.fill();
      
      // 깃발 테두리
      ctx.strokeStyle = "#00aa00";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
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

    // 점령 상태 시각화 (깃발 + 별 모양 방어막)
    if (this.isConquered) {
        this.renderConqueredVisuals();
    }

    // 0. 배리어 그리기 (부드러운 전환 효과) - 점령 상태가 아닐 때만
    if (!this.isConquered) {
        const shieldRadius = this.core.shieldRadius;
        const cx = this.core.x;
        const cy = this.core.y;
        const sv = this.shieldVisual;
        const state = this.core.shieldState;
        
        // 실드 HP 비율에 따른 색상 계산 (100%=파란색, 0%=빨간색)
        const hpRatio = this.core.shieldHp / this.core.shieldMaxHp;
        // 파란색 (0, 200, 255) → 빨간색 (255, 50, 50)
        const r = Math.floor(255 * (1 - hpRatio));
        const g = Math.floor(200 * hpRatio + 50 * (1 - hpRatio));
        const b = Math.floor(255 * hpRatio + 50 * (1 - hpRatio));
        
        // BROKEN/RECHARGING: 철컥철컥 회전 (별도 처리)
        let dashOffset = sv.rotation;
        if (state === "BROKEN" || state === "RECHARGING") {
            const stepDuration = 500; // 0.5초마다 한 스텝
            const stepSize = 20;
            const currentStep = Math.floor(Date.now() / stepDuration);
            dashOffset = currentStep * stepSize;
        }
        
        // 채우기 (ACTIVE일 때만 보임)
        if (sv.fillAlpha > 0.01) {
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${sv.fillAlpha})`;
            this.ctx.fill();
        }
        
        // 테두리 (점선/실선 보간)
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);
        
        if (sv.dashGap > 0.5) {
            // 점선 모드
            const dashLength = Math.max(3, 10 - sv.dashGap * 0.3);
            this.ctx.setLineDash([dashLength, sv.dashGap]);
            this.ctx.lineDashOffset = -dashOffset;
        } else {
            // 실선 모드
            this.ctx.setLineDash([]);
        }
        
        this.ctx.lineWidth = sv.lineWidth;
        
        // ACTIVE일 때 펄스 효과
        let alpha = sv.alpha;
        if (state === "ACTIVE") {
            alpha = sv.alpha + Math.sin(Date.now() / 200) * 0.15;
        }
        
        // BROKEN일 때 회색, 그 외에는 HP 기반 색상
        if (state === "BROKEN" || state === "RECHARGING") {
            this.ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
        } else {
            this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
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

    // 1. 발사체 (랜덤 아스키 문자)
    this.ctx.font = "bold 12px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#00ff00"; // 초록색으로 변경
    this.ctx.shadowColor = "#00ff00";
    this.ctx.shadowBlur = 5;
    this.projectiles.forEach(p => {
      this.ctx.fillText(p.char || "*", p.x, p.y);
    });
    this.ctx.shadowBlur = 0;

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
    
    // 코어 체력 퍼센트 표시 (코어 아래에 표시)
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
        this.ctx.fillText(`${hpPercent}%`, this.core.x + offsetX - 2, this.core.y + scaledRadius + 20 + offsetY);
        // 파란색 오프셋
        this.ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        this.ctx.fillText(`${hpPercent}%`, this.core.x + offsetX + 2, this.core.y + scaledRadius + 20 + offsetY);
      }
      
      // 메인 텍스트
      this.ctx.fillStyle = hpPercent > 30 ? "#00ff00" : "#ff3333";
      this.ctx.fillText(`${hpPercent}%`, this.core.x + offsetX, this.core.y + scaledRadius + 20 + offsetY);
    }

    // 4. 파티클 (글리치 스타일)
    this.ctx.font = "bold 10px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    
    this.particles.forEach(p => {
        // 글리치 떨림 효과
        const glitchX = p.char ? (Math.random() - 0.5) * 3 : 0;
        const glitchY = p.char ? (Math.random() - 0.5) * 3 : 0;
        
        // 깜빡임 효과 (30% 확률로 안 그림)
        if (p.char && Math.random() < 0.3 && p.life < p.maxLife * 0.5) {
            return; // 깜빡임
        }
        
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        
        if (p.char) {
            // 글리치 문자 파티클
            this.ctx.font = `bold ${p.size}px monospace`;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 3;
            
            // RGB 분리 효과 (수명이 적을 때)
            if (p.life < p.maxLife * 0.4) {
                this.ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
                this.ctx.fillText(p.char, p.x + glitchX - 1, p.y + glitchY);
                this.ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
                this.ctx.fillText(p.char, p.x + glitchX + 1, p.y + glitchY);
            }
            
            this.ctx.fillStyle = p.color;
            this.ctx.fillText(p.char, p.x + glitchX, p.y + glitchY);
            this.ctx.shadowBlur = 0;
        } else {
            // 기존 원형 파티클 (호환성)
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
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
    // 랜덤 아스키 문자 (33~126: 출력 가능한 ASCII)
    const asciiChars = "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar = asciiChars[Math.floor(Math.random() * asciiChars.length)];
    
    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: target,
      angle: this.turret.angle,
      speed: 400, // 탄속 증가
      damage: this.turret.damage,
      radius: 4,
      life: 2.0,
      char: randomChar // 랜덤 아스키 문자
    });
    
    this.createExplosion(this.core.x + Math.cos(this.turret.angle)*40, this.core.y + Math.sin(this.turret.angle)*40, "#fff", 3);
  }
  
  // 방향 지정 발사 (터치/클릭용)
  fireProjectileToward(angle) {
    const asciiChars = "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar = asciiChars[Math.floor(Math.random() * asciiChars.length)];
    
    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: null, // 타겟 없이 방향으로 발사
      angle: angle,
      speed: 400,
      damage: this.turret.damage,
      radius: 4,
      life: 2.0,
      char: randomChar
    });
    
    this.createExplosion(this.core.x + Math.cos(angle)*40, this.core.y + Math.sin(angle)*40, "#00ff00", 3);
  }
  
  // 화면 클릭 핸들러
  handleCanvasClick(e) {
    // 게임이 활성화되어 있지 않으면 무시하지만, 디펜스 모드면 허용
    if (this.isPaused) return;
    
    // 실드 버튼 클릭은 무시
    if (e.target === this.shieldBtn) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    this.fireAtPosition(clickX, clickY);
  }
  
  // 화면 터치 핸들러
  handleCanvasTouch(e) {
    if (this.isPaused) return;
    
    // 터치-클릭 중복 방지
    e.preventDefault();
    
    // 터치 이벤트에서 좌표 추출 (멀티터치 지원)
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      // 터치가 캔버스 내부인지 확인
      if (touchX >= 0 && touchX <= rect.width && touchY >= 0 && touchY <= rect.height) {
        this.fireAtPosition(touchX, touchY);
      }
    }
  }
  
  // 키보드 핸들러 (스페이스바 발사)
  handleKeyDown(e) {
    if (this.isPaused) return;
    
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault(); // 스크롤 방지
      this.fireAtPosition(0, 0); // 위치는 상관없음, fireAtPosition에서 처리
    }
  }
  
  // 위치 기반 발사 로직
  fireAtPosition(x, y) {
    // 적이 있으면 가장 가까운 적 방향으로 발사
    if (this.enemies.length > 0) {
      let closestEnemy = null;
      let closestDist = Infinity;
      
      for (const enemy of this.enemies) {
        const dx = enemy.x - this.core.x;
        const dy = enemy.y - this.core.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
      
      if (closestEnemy) {
        const angle = Math.atan2(closestEnemy.y - this.core.y, closestEnemy.x - this.core.x);
        this.turret.angle = angle; // 포탑 방향도 업데이트
        this.fireProjectileToward(angle);
      }
    } else {
      // 적이 없으면 현재 포탑 방향으로 발사
      this.fireProjectileToward(this.turret.angle);
    }
  }

  createExplosion(x, y, color, count = 10) {
      // 모바일 최적화: 파티클 수 감소
      const actualCount = Math.ceil(count * this.particleMultiplier);
      
      // 파티클 수 제한 체크
      if (this.particles.length >= this.maxParticles) {
          // 오래된 파티클 제거
          this.particles.splice(0, actualCount);
      }
      
      // 글리치 스타일 아스키 문자들
      const glitchChars = "!@#$%^&*?/<>[]{}|\\~`░▒▓█▀▄■□";
      
      for(let i=0; i<actualCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 120; // 약간 더 빠르게
          const life = 0.2 + Math.random() * 0.4; // 수명
          
          // 글리치 색상 (주 색상 + 랜덤 노이즈)
          let particleColor = color;
          const colorRoll = Math.random();
          if (colorRoll < 0.15) {
              particleColor = "#ff0000"; // 빨간 노이즈
          } else if (colorRoll < 0.25) {
              particleColor = "#ffffff"; // 흰색 노이즈
          }
          
          this.particles.push({
              x: x + (Math.random() - 0.5) * 10, // 약간 흩어진 시작점
              y: y + (Math.random() - 0.5) * 10,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: life,
              maxLife: life,
              alpha: 1,
              color: particleColor,
              size: 10 + Math.random() * 4, // 폰트 크기
              char: glitchChars[Math.floor(Math.random() * glitchChars.length)], // 랜덤 문자
              glitchOffset: { x: 0, y: 0 }, // 글리치 떨림용
              flickerTimer: Math.random() * 0.1 // 깜빡임 타이머
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
  
  // 화면 플래시 효과
  flashScreen(color = "#ffffff", duration = 0.2) {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: ${color};
      opacity: 0.8;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(flash);
    
    // 페이드 아웃
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = elapsed / (duration * 1000);
      
      if (progress < 1) {
        flash.style.opacity = 0.8 * (1 - progress);
        requestAnimationFrame(animate);
      } else {
        flash.remove();
      }
    };
    requestAnimationFrame(animate);
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
