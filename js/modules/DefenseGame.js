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

    // 갓모드 (디버그용 무적)
    this.isGodMode = false;

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
      scale: 1, // 원근감 애니메이션용
      // 발사 시 시각적 움직임용
      visualOffsetX: 0,
      visualOffsetY: 0,
      targetOffsetX: 0,
      targetOffsetY: 0,
    };

    // 실드 시각 효과용 보간 변수 (부드러운 전환)
    this.shieldVisual = {
      alpha: 0.7, // 현재 투명도
      targetAlpha: 0.7, // 목표 투명도
      dashGap: 0, // 현재 점선 간격 (0=실선)
      targetDashGap: 0, // 목표 점선 간격
      lineWidth: 2, // 현재 선 두께
      targetLineWidth: 2, // 목표 선 두께
      rotation: 0, // 현재 회전 오프셋
      rotationSpeed: 0, // 현재 회전 속도
      targetRotationSpeed: 0, // 목표 회전 속도
      fillAlpha: 0.1, // 채우기 투명도
      targetFillAlpha: 0.1, // 목표 채우기 투명도
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

    // 포탑 설정 (수동 발사용 - 자동 발사는 조력자가 담당)
    this.turret = {
      angle: 0,
      range: 200, // 기본 사거리
      fireRate: 4.0, // 공속 증가 (0.5 -> 4.0, 초당 4발)
      lastFireTime: 0,
      damage: 10,
      projectileSpeed: 300, // 탄환 속도
    };

    // 스태틱 시스템 (체인 라이트닝)
    this.staticSystem = {
      currentCharge: 0, // 현재 충전량
      maxCharge: 100, // 최대 충전량
      chargeRate: 8, // 초당 충전량 (시간 기반)
      hitChargeAmount: 15, // 피격 시 충전량
      killChargeAmount: 25, // 처치 시 충전량
      damage: 10, // 기본 데미지
      chainCount: 3, // 튕기는 횟수
      chainRange: 250, // 튕기는 거리 (150 → 250)
      lastDischargeTime: 0, // 마지막 발동 시간
    };

    // 스태틱 시각 효과
    this.staticEffects = {
      sparks: [], // 전기 스파크 파티클
      chains: [], // 체인 라이트닝 라인
    };

    // 무기 모드 정의 (모든 무기가 풀업 시 동일한 스탯 도달)
    // 최종 목표: DMG 50, RATE 10/s, RNG 500, BULLET 900
    // 모든 무기 탄창 있음! 컨셉별 탄창 크기 다름
    this.weaponModes = {
      NORMAL: {
        name: "NORMAL",
        icon: "●",
        color: "#ffff00",
        desc: "밸런스형 | 탄창 12발",
        // 기본 스탯
        baseDamage: 10,
        baseFireRate: 4.0,
        baseRange: 300,
        baseProjectileSpeed: 400,
        // 발사 패턴
        projectileCount: 1,
        spreadAngle: 0,
        piercing: false,
        // 재장전 (MAX Lv.10에서 1.0초 도달)
        hasReload: true,
        magazineSize: 12,
        reloadTime: 2.0,
        // 폭발 없음
        explosive: false,
        explosionRadius: 0,
      },
      SHOTGUN: {
        name: "SHOTGUN",
        icon: "◎",
        color: "#ff8800",
        desc: "5발 산탄 | 탄창 6발",
        baseDamage: 5,
        baseFireRate: 2.0,
        baseRange: 150,
        baseProjectileSpeed: 300,
        projectileCount: 5,
        spreadAngle: 0.5, // 넓은 산탄
        piercing: false,
        // 재장전 (MAX Lv.10에서 1.0초 도달)
        hasReload: true,
        magazineSize: 6,
        reloadTime: 1.8,
        explosive: false,
        explosionRadius: 0,
      },
      SNIPER: {
        name: "SNIPER",
        icon: "◈",
        color: "#00ffff",
        desc: "고데미지 관통 | 탄창 3발",
        baseDamage: 30,
        baseFireRate: 1.0,
        baseRange: 500,
        baseProjectileSpeed: 700,
        projectileCount: 1,
        spreadAngle: 0,
        piercing: true, // 관통!
        // 재장전 (MAX Lv.10에서 1.2초 도달)
        hasReload: true,
        magazineSize: 3,
        reloadTime: 2.04,
        explosive: false,
        explosionRadius: 0,
      },
      RAPID: {
        name: "RAPID",
        icon: "◆",
        color: "#00ff00",
        desc: "고속 연사 | 탄창 30발",
        baseDamage: 3, // 낮은 데미지
        baseFireRate: 12.0, // 매우 빠른 연사
        baseRange: 200, // 짧은 사거리
        baseProjectileSpeed: 500, // 빠른 탄속
        projectileCount: 1,
        spreadAngle: 0.15, // 탄퍼짐
        piercing: false,
        // 재장전 (MAX Lv.10에서 1.0초 도달)
        hasReload: true,
        magazineSize: 30, // 큰 탄창
        reloadTime: 2.8,
        explosive: false,
        explosionRadius: 0,
      },
      LAUNCHER: {
        name: "LAUNCHER",
        icon: "◉",
        color: "#ff0000",
        desc: "범위 폭발 | 탄창 2발",
        baseDamage: 25, // 직격 데미지
        baseFireRate: 0.8,
        baseRange: 350,
        baseProjectileSpeed: 200, // 느린 탄속
        projectileCount: 1,
        spreadAngle: 0,
        piercing: false,
        // 재장전 (MAX Lv.10에서 1.2초 도달)
        hasReload: true,
        magazineSize: 2, // 작은 탄창
        reloadTime: 2.02,
        explosive: true, // 폭발!
        explosionRadius: 100, // 큰 폭발 범위
        explosionDamage: 15, // 폭발 추가 데미지
      },
    };

    // 조력자 (Helper) - 배리어 내부에서 자동 공격
    this.helper = {
      x: 0,
      y: 0,
      radius: 8,
      color: "#ffff00", // 노란색으로 구별
      speed: 40, // 이동 속도 (80 → 40, 천천히)
      fireRate: 4.0, // 초당 4발 (기존 터렛과 동일)
      lastFireTime: 0,
      range: 300, // 사거리
      damage: 10,
      projectileSpeed: 400, // 탄환 속도
      angle: 0, // 현재 바라보는 방향
      evadeDistance: 50, // 적과 이 거리 이내면 회피 (40 → 50)
      targetX: 0, // 목표 위치
      targetY: 0,
      // 무기 모드
      weaponMode: "NORMAL",
      // 재장전 시스템
      currentAmmo: 0, // 현재 탄약 (0 = 무제한 또는 미사용)
      isReloading: false,
      reloadProgress: 0, // 0 ~ 1
      reloadStartTime: 0,
    };

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.alliedViruses = []; // 아군 바이러스 (배리어 밖)
    this.shockwaves = []; // 파동 효과
    
    // 아이템 시스템
    this.droppedItems = []; // 바닥에 떨어진 아이템들
    this.collectorViruses = []; // 수집 바이러스들
    
    // 대사 시스템
    this.virusDialogues = null; // JSON에서 로드
    this.activeSpeechBubbles = []; // 현재 표시 중인 대사들
    this.loadVirusDialogues(); // 대사 로드

    // 웨이브 관리
    this.waveTimer = 0;
    this.spawnRate = 0.4; // 1.2 → 0.4 (스폰 수 3배 증가: 1.2 / 3)
    this.currentPage = 1; // 1 ~ 12
    this.pageTimer = 0;
    this.pageDuration = 25; // 페이지당 25초 (20 → 25, 더 오래 생존해야 함)

    // 스테이지 관리
    this.currentStage = 0; // 0 = 안전영역, 1+ = 일반 스테이지
    this.currentStageId = 0; // 스테이지 ID (난이도 계산용)
    this.stageDifficultyScale = 1.0; // 스테이지별 난이도 스케일
    this.stageMaxPages = 12; // 스테이지 최대 페이지 수
    this.isSafeZone = true; // 안전영역 여부
    this.safeZoneSpawnRate = 2; // 안전영역 적 생성 (6 → 2초, 스폰 수 3배)

    // 강화 페이지 모드 (점령 시)
    this.isReinforcementMode = false;
    this.reinforcementPage = 0;
    this.reinforcementMaxPages = 3;
    this.reinforcementComplete = false;
    this.reinforcementSpawnRate = 0.27; // 0.8 → 0.27 (스폰 수 3배: 0.8 / 3)

    // 점령 상태 (영구)
    this.isConquered = false; // 이 스테이지가 점령되었는지

    // 이벤트 콜백
    this.onResourceGained = null;
    this.onGameOver = null;
    this.onConquer = null; // 점령 요청 콜백
    this.onConquerReady = null; // 점령 가능 상태 콜백 (선택지 갱신용)
    this.onEnemyKilled = null; // 적 처치 콜백 (아이템 드롭용)
    this.onItemCollected = null; // 아이템 수집 완료 콜백
    
    // 아이템 효과 getter (GameManager에서 설정)
    this.getItemEffects = () => ({
      convert: 0,
      chain: 0,
      chainRadius: 0,
      lifesteal: 0,
      attackSpeed: 0,
      dropRate: 0
    });

    // 점령 가능 상태
    this.conquerReady = false;

    // 아군 정보 (GameManager에서 주입) - 새로운 슬롯 시스템
    this.alliedConfig = null; // GameManager.getAllyConfiguration() 결과
    this.alliedInfo = { count: 0, level: 1, color: "#00aaff" }; // 레거시 호환용

    // 현재 자원 (GameManager와 동기화용)
    this.currentData = 0;

    window.addEventListener("resize", () => this.resize());

    // 🛡️ 탭 비활성화/활성화 감지 (모바일 앱 전환 대응)
    document.addEventListener("visibilitychange", () =>
      this.handleVisibilityChange()
    );

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
    this.canvas.addEventListener(
      "touchstart",
      (e) => this.handleCanvasTouch(e),
      { passive: false }
    );

    // 스페이스바 발사 (PC용)
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));

    this.resize();
  }

  // 🛡️ 탭 비활성화/활성화 처리
  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      debugLog("Defense", "Tab restored - validating game state");
      // 탭 복귀 시 상태 복구
      this.validateGameState();
      this.resize(); // 캔버스 재확인

      // 시간 기준 리셋 (deltaTime 폭발 방지)
      this.lastTime = performance.now();
    } else {
      debugLog("Defense", "Tab hidden - pausing updates");
    }
  }

  // 🛡️ 게임 상태 유효성 검증 및 복구
  validateGameState() {
    // 1. 코어 위치 검증
    if (
      !this.core.x ||
      !this.core.y ||
      isNaN(this.core.x) ||
      isNaN(this.core.y) ||
      this.core.x < 0 ||
      this.core.x > this.canvas.width ||
      this.core.y < 0 ||
      this.core.y > this.canvas.height
    ) {
      debugWarn("Defense", "Core position invalid, resetting to center");
      this.core.x = this.canvas.width / 2;
      this.core.y = this.canvas.height / 2;
    }

    // 2. 코어 HP 검증
    if (isNaN(this.core.hp) || this.core.hp < 0) {
      debugWarn("Defense", "Core HP invalid, resetting");
      this.core.hp = this.core.maxHp;
    }

    // 3. 실드 상태 검증
    if (isNaN(this.core.shieldHp)) {
      debugWarn("Defense", "Shield HP invalid, resetting");
      this.core.shieldHp = this.core.shieldMaxHp;
    }

    // 4. 화면 밖 적 제거
    this.enemies = this.enemies.filter((e) => {
      const margin = 200;
      return (
        e.x > -margin &&
        e.x < this.canvas.width + margin &&
        e.y > -margin &&
        e.y < this.canvas.height + margin &&
        !isNaN(e.x) &&
        !isNaN(e.y)
      );
    });

    // 5. 아군 바이러스 위치 검증 (NaN 또는 코어에서 너무 멀면 재배치)
    this.alliedViruses.forEach((v) => {
      const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
      const maxAllowedDist = 300; // 코어에서 최대 허용 거리

      if (isNaN(v.x) || isNaN(v.y) || distFromCore > maxAllowedDist) {
        // 코어 주변으로 재배치
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 40;
        v.x = this.core.x + Math.cos(angle) * dist;
        v.y = this.core.y + Math.sin(angle) * dist;
        v.vx = 0;
        v.vy = 0;
        debugWarn("Defense", "Allied virus repositioned (too far or invalid)");
      }
    });

    // 6. 화면 밖 발사체 제거 (gameScale 고려)
    const scaledMargin = 100 / this.gameScale; // 스케일링 고려한 마진
    this.projectiles = this.projectiles.filter((p) => {
      return (
        p.x > -scaledMargin &&
        p.x < this.canvas.width + scaledMargin &&
        p.y > -scaledMargin &&
        p.y < this.canvas.height + scaledMargin &&
        !isNaN(p.x) &&
        !isNaN(p.y)
      );
    });

    // 7. 실드 시각 효과 검증
    if (!this.shieldVisual || isNaN(this.shieldVisual.alpha)) {
      debugWarn("Defense", "Shield visual state invalid, resetting");
      this.shieldVisual = {
        alpha: 0.7,
        targetAlpha: 0.7,
        dashGap: 0,
        targetDashGap: 0,
        lineWidth: 2,
        targetLineWidth: 2,
        rotation: 0,
        rotationSpeed: 0,
        targetRotationSpeed: 0,
        fillAlpha: 0.1,
        targetFillAlpha: 0.1,
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
    debugLog("Defense", "updateAlliedInfo - Info saved:", info);
    // 아군 바이러스 생성은 playIntroAnimation에서 처리
  }

  // 새로운 슬롯 시스템용 아군 설정 업데이트
  updateAlliedConfig(config) {
    this.alliedConfig = config;
    debugLog("Defense", "updateAlliedConfig - Config saved:", config);
  }

  handleConquerClick() {
    // 점령 버튼 숨기기
    this.conquerBtn.style.display = "none";

    // 실드 파괴 연출 시작 (2초 후 콜백)
    this.playConquestShieldBreak(() => {
      // 연출 완료 후 실드 상태 변경
      this.core.shieldActive = false;
      this.core.shieldState = "DISABLED";
      this.core.shieldHp = 0;
      this.updateShieldBtnUI("DISABLED", "#555");
      this.shieldBtn.style.pointerEvents = "none";

      // 점령 콜백 호출 (GameManager가 테트리스 시작)
      if (this.onConquer) this.onConquer();

      // 페이지 리셋
      this.currentPage = 1;
      this.updateWaveDisplay();
    });
  }

  // 점령용 실드 파괴 연출 (2단계, 총 2초)
  playConquestShieldBreak(onComplete) {
    const originalRadius = this.core.shieldRadius;
    const startTime = performance.now();
    const totalDuration = 2000; // 2초
    const phase1Duration = 800; // 1단계: 0.8초

    // 점령 연출 중 플래그
    this.isConquestBreaking = true;

    const animate = (now) => {
      const elapsed = now - startTime;

      // === 1단계: 금이 가며 살짝 부서짐 (0 ~ 0.8초) ===
      if (elapsed < phase1Duration) {
        const progress = elapsed / phase1Duration;

        // 실드 떨림 효과
        if (Math.random() < 0.3) {
          this.shakeScreen(5 + progress * 10);
        }

        // 금이 가는 파티클 (조금씩)
        if (Math.random() < 0.15) {
          const angle = Math.random() * Math.PI * 2;
          const x = this.core.x + Math.cos(angle) * this.core.shieldRadius;
          const y = this.core.y + Math.sin(angle) * this.core.shieldRadius;

          this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * (20 + Math.random() * 30),
            vy: Math.sin(angle) * (20 + Math.random() * 30),
            life: 0.8,
            maxLife: 0.8,
            alpha: 1,
            color: "#00f0ff",
            size: 2 + Math.random() * 2,
            char: "░▒▓"[Math.floor(Math.random() * 3)],
          });
        }

        // 1단계 끝에서 첫 번째 충격
        if (elapsed > phase1Duration - 100 && !this._phase1Flash) {
          this._phase1Flash = true;
          this.flashScreen("#00ffff", 0.4);
          this.shakeScreen(15);

          // 실드 금 파티클 대량 생성
          for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const x = this.core.x + Math.cos(angle) * this.core.shieldRadius;
            const y = this.core.y + Math.sin(angle) * this.core.shieldRadius;

            this.particles.push({
              x,
              y,
              vx: Math.cos(angle) * (30 + Math.random() * 40),
              vy: Math.sin(angle) * (30 + Math.random() * 40),
              life: 1.0,
              maxLife: 1.0,
              alpha: 1,
              color: "#00f0ff",
              size: 3 + Math.random() * 3,
              char: "▓█▄▀"[Math.floor(Math.random() * 4)],
            });
          }
        }

        requestAnimationFrame(animate);
        return;
      }

      // === 2단계: 완전 박살 + 파동 발사 (0.8초 ~ 2초) ===
      if (!this._phase2Started) {
        this._phase2Started = true;

        // 강력한 플래시 + 흔들림
        this.flashScreen("#ffffff", 0.6);
        this.shakeScreen(30);

        // 실드 조각 대량 생성 (바깥으로 날아감)
        const segments = 24;
        for (let i = 0; i < segments; i++) {
          const angle = ((Math.PI * 2) / segments) * i;
          const x = this.core.x + Math.cos(angle) * this.core.shieldRadius;
          const y = this.core.y + Math.sin(angle) * this.core.shieldRadius;

          // 큰 조각들
          for (let j = 0; j < 4; j++) {
            const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
            this.particles.push({
              x,
              y,
              vx: Math.cos(spreadAngle) * (80 + Math.random() * 120),
              vy: Math.sin(spreadAngle) * (80 + Math.random() * 120),
              life: 1.5,
              maxLife: 1.5,
              alpha: 1,
              color: Math.random() > 0.5 ? "#00f0ff" : "#ffffff",
              size: 4 + Math.random() * 6,
              char: "█▓▒░■□▪▫"[Math.floor(Math.random() * 8)],
            });
          }
        }

        // 파동 생성 (캔버스 전체로 퍼짐)
        this.shockwaves.push({
          x: this.core.x,
          y: this.core.y,
          radius: this.core.shieldRadius,
          maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
          speed: 400, // 픽셀/초
          alpha: 0.8,
          color: "#00f0ff",
          lineWidth: 6,
          damageDealt: false, // 데미지는 한번만
        });

        // 적에게 넉백 + 슬로우 + 데미지 적용
        this.applyShockwaveEffects();
      }

      // 실드 반경 축소
      const phase2Progress =
        (elapsed - phase1Duration) / (totalDuration - phase1Duration);
      this.core.shieldRadius = originalRadius * (1 - phase2Progress);

      if (elapsed < totalDuration) {
        requestAnimationFrame(animate);
      } else {
        // 연출 완료
        this.core.shieldRadius = 0;
        this.isConquestBreaking = false;
        this._phase1Flash = false;
        this._phase2Started = false;

        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  // 파동 효과: 넉백 + 슬로우 + 데미지
  applyShockwaveEffects() {
    const damage = 25; // 고정 데미지

    this.enemies.forEach((enemy) => {
      // 부드러운 넉백 + 슬로우
      this.applyKnockback(enemy, 200, 0.3, 2);

      // 데미지
      enemy.hp -= damage;
      this.createExplosion(enemy.x, enemy.y, "#00f0ff", 5);

      // 적 처치 확인
      if (enemy.hp <= 0) {
        this.createExplosion(enemy.x, enemy.y, "#00ff00", 10);
        const gain = 10;
        this.currentData += gain;
        this.updateResourceDisplay(this.currentData);
      }
    });

    // 죽은 적 제거
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  toggleShield() {
    // 이미 전환 중이거나 파괴된 상태면 무시
    if (
      this.core.shieldState === "CHARGING" ||
      this.core.shieldState === "DISCHARGING" ||
      this.core.shieldState === "BROKEN" ||
      this.core.shieldState === "RECHARGING" ||
      this.core.shieldState === "DISABLED"
    ) {
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
      sv.targetAlpha = 0.8;
      sv.targetDashGap = 0; // 실선
      sv.targetLineWidth = 2.5;
      sv.targetFillAlpha = 0.15;
      sv.targetRotationSpeed = 0; // 회전 없음
    } else if (state === "OFF") {
      // OFF: 점선, 잘 보이게
      sv.targetAlpha = 0.5;
      sv.targetDashGap = 10; // 점선
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0;
      sv.targetRotationSpeed = 0;
    } else if (state === "DISCHARGING") {
      // DISCHARGING: 점선으로 전환 중, 약간 회전
      sv.targetAlpha = 0.6;
      sv.targetDashGap = 10;
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0.05;
      sv.targetRotationSpeed = 30; // 느린 회전
    } else if (state === "CHARGING") {
      // CHARGING: 점선 → 실선, 가속 회전
      const elapsed = 2.0 - this.core.shieldTimer;
      const progress = Math.min(1, elapsed / 2.0);

      // 진행률에 따라 점점 실선으로, 밝아지고, 빨라짐
      sv.targetAlpha = 0.5 + progress * 0.3;
      sv.targetDashGap = 12 * (1 - progress); // 점선 → 실선
      sv.targetLineWidth = 1.5 + progress * 1;
      sv.targetFillAlpha = progress * 0.15;
      sv.targetRotationSpeed = 50 + progress * 500; // 가속 회전
    } else if (state === "BROKEN" || state === "RECHARGING") {
      // BROKEN/RECHARGING: 철컥철컥, 잘 보이게
      sv.targetAlpha = 0.5;
      sv.targetDashGap = 12;
      sv.targetLineWidth = 1.5;
      sv.targetFillAlpha = 0;
      // 철컥철컥은 별도 처리 (rotationSpeed 사용 안함)
      sv.targetRotationSpeed = 0;
    } else if (state === "DISABLED") {
      // DISABLED: 약하게 보임
      sv.targetAlpha = 0.3;
      sv.targetDashGap = 15;
      sv.targetLineWidth = 1;
      sv.targetFillAlpha = 0;
      sv.targetRotationSpeed = 0;
    }
  }

  updateShieldBtnUI(text, color, loadingProgress = null) {
    const hpPct = Math.floor(
      (this.core.shieldHp / this.core.shieldMaxHp) * 100
    );

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
    debugLog("Defense", "Mode Started");
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

    // 코어 시각적 오프셋 업데이트 (발사 후 부드럽게 원위치로)
    const core = this.core;
    // 목표 오프셋으로 부드럽게 이동
    core.visualOffsetX += (core.targetOffsetX - core.visualOffsetX) * dt * 15;
    core.visualOffsetY += (core.targetOffsetY - core.visualOffsetY) * dt * 15;
    // 목표 오프셋은 천천히 0으로 (발사 후 원위치로 돌아옴)
    core.targetOffsetX *= Math.pow(0.05, dt);
    core.targetOffsetY *= Math.pow(0.05, dt);
    // 작은 값은 0으로 클램프
    if (Math.abs(core.targetOffsetX) < 0.1) core.targetOffsetX = 0;
    if (Math.abs(core.targetOffsetY) < 0.1) core.targetOffsetY = 0;

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
      const loadingProgress = 1 - this.core.shieldTimer / 5.0;
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
        const pct = Math.floor(
          (this.core.shieldHp / this.core.shieldMaxHp) * 100
        );
        this.updateShieldBtnUI(`CHARGING ${pct}%`, "#ffff00");
      }
    }

    // 쉴드 내구도 로직
    if (this.core.shieldActive) {
      // 켜져있을 때 자연 소모는 없음 (기획: 페널티 없음)
      // 단, 공격 받으면 깎임 (충돌 로직에서 처리)
    } else {
      // 꺼져있을 때 회복 (파괴 상태 아닐 때만)
      if (
        this.core.shieldState === "OFF" &&
        this.core.shieldHp < this.core.shieldMaxHp
      ) {
        this.core.shieldHp += 10 * dt; // 초당 10 회복
        if (this.core.shieldHp > this.core.shieldMaxHp)
          this.core.shieldHp = this.core.shieldMaxHp;
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
    sv.rotationSpeed +=
      (sv.targetRotationSpeed - sv.rotationSpeed) * lerpSpeed * dt;

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

          // 강화 페이지별 스폰 레이트 (스폰 수 3배: 1/3로 감소)
          // 1페이지: 0.17초, 2페이지: 0.12초, 3페이지: 0.08초
          const reinforcementSpawnRates = [0.17, 0.12, 0.08];
          this.spawnRate =
            reinforcementSpawnRates[Math.min(this.reinforcementPage - 1, 2)];

          this.updateWaveDisplay();
          debugLog(
            "Defense",
            "Reinforcement Page:",
            this.reinforcementPage,
            "SpawnRate:",
            this.spawnRate
          );
        } else {
          // 강화 페이지 완료 -> 점령 완료!
          this.reinforcementComplete = true;
          debugLog("Defense", "Reinforcement Complete!");
        }
      }
    }
    // 일반 페이지 모드
    else if (!this.isSafeZone && this.currentPage <= (this.maxPages || 12)) {
      const maxPages = this.maxPages || 12;
      const diffScale = this.stageDifficultyScale || 1.0;

      this.pageTimer += dt;
      if (this.pageTimer >= this.pageDuration) {
        if (this.currentPage < maxPages) {
          this.currentPage++;
          this.pageTimer = 0;
          // 난이도 스케일 적용 (스폰 수 3배: 1/3로 감소)
          // 최소값도 1/3로 조정: 0.4 → 0.13, 기본값도 1/3: 1.2 → 0.4
          this.spawnRate = Math.max(
            0.13,
            0.4 - this.currentPage * 0.04 * diffScale
          );
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

    // 0.7 시너지 효과 적용 (매 프레임)
    this.applySynergyEffects(dt);
    
    // 0.75 아이템 수집 바이러스 업데이트
    this.updateCollectorViruses(dt);
    
    // 0.76 말풍선 업데이트
    this.updateSpeechBubbles();
    
    // 0.77 랜덤 대사
    if (this.isSafeZone) {
      // Safe Zone: 매우 자주 대화! (약 2~3초에 1번)
      if (Math.random() < 0.008) {
        const randomAlly = this.alliedViruses[Math.floor(Math.random() * this.alliedViruses.length)];
        if (randomAlly) {
          // 70% 대화, 30% 혼잣말
          const category = Math.random() < 0.7 ? 'safeChat' : 'safeSolo';
          this.tryVirusSpeech(randomAlly, category, 1.0);
        }
      }
    } else {
      // 전투 중: 매우 드물게 idle 대사
      if (Math.random() < 0.00005) { // 약 5분에 1번
        const randomAlly = this.alliedViruses[Math.floor(Math.random() * this.alliedViruses.length)];
        if (randomAlly) {
          this.tryVirusSpeech(randomAlly, 'idle', 1.0);
        }
      }
    }

    // 0.8 아군 바이러스 로직 (타입별 행동) - for 루프로 안전하게 처리
    for (let idx = this.alliedViruses.length - 1; idx >= 0; idx--) {
      const v = this.alliedViruses[idx];

      // HP가 없으면 제거 (사망)
      if (v.hp <= 0) {
        this.handleAllyDeath(v, idx);
        continue;
      }

      // 공격 타입별 행동 분기
      switch (v.attackType) {
        case "melee":
          this.updateMeleeAlly(v, dt);
          break;
        case "ranged":
          this.updateRangedAlly(v, dt);
          break;
        case "suicide":
          this.updateSuicideAlly(v, dt);
          break;
        case "support":
          this.updateSupportAlly(v, dt);
          break;
        default:
          this.updateMeleeAlly(v, dt); // 기본은 근접
      }
    }

    // 1. 적 생성
    // 적 생성 (안전영역이면 느리게)
    const currentSpawnRate = this.isSafeZone
      ? this.safeZoneSpawnRate
      : this.spawnRate;
    this.waveTimer += dt;
    if (this.waveTimer > currentSpawnRate) {
      this.spawnEnemy();
      this.waveTimer = 0;
    }

    // 2. 적 이동 및 충돌
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // 패시브 어그로: 근처에 TANK가 있으면 TANK를 우선 타겟팅
      let targetX = this.core.x;
      let targetY = this.core.y;

      // 도발당한 적은 도발한 탱커를 타겟
      if (enemy.tauntedBy) {
        const taunter = this.alliedViruses.find(
          (v) => v === enemy.tauntedBy && v.hp > 0
        );
        if (taunter) {
          targetX = taunter.x;
          targetY = taunter.y;
        } else {
          enemy.tauntedBy = null; // 탱커 사망 시 도발 해제
        }
      } else {
        // 패시브 어그로: 가장 가까운 TANK 찾기
        let nearestTank = null;
        let nearestTankDist = Infinity;

        for (const v of this.alliedViruses) {
          if (v.virusType === "TANK" && v.hp > 0) {
            const tankDist = Math.hypot(v.x - enemy.x, v.y - enemy.y);
            if (
              tankDist < (v.aggroRadius || 120) &&
              tankDist < nearestTankDist
            ) {
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

      // 이동 (타겟 방향으로)
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const distToTarget = Math.hypot(dx, dy);

      // 코어와의 거리 (실드/코어 충돌용)
      const distToCore = Math.hypot(
        this.core.x - enemy.x,
        this.core.y - enemy.y
      );

      // 쉴드 충돌 체크 (Active 상태일 때만) - 코어와의 거리로 판정!
      if (
        this.core.shieldActive &&
        distToCore < this.core.shieldRadius + enemy.radius
      ) {
        // 쉴드 피격
        this.core.shieldHp -= 10; // 적 하나당 내구도 10 감소
        this.chargeStaticOnHit(); // 피격 시 스태틱 충전
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

      // 코어 충돌 체크 (쉴드 없거나 뚫림) - 코어와의 거리로 판정!
      if (distToCore < this.core.radius + enemy.radius) {
        // 갓모드가 아닐 때만 데미지
        if (!this.isGodMode) {
          this.core.hp -= enemy.damage;
          this.chargeStaticOnHit(); // 피격 시 스태틱 충전
        }
        this.createExplosion(enemy.x, enemy.y, "#ff0000", 20);
        this.enemies.splice(i, 1);

        if (this.core.hp <= 0 && !this.isGodMode) {
          this.core.hp = 0;
          this.createExplosion(this.core.x, this.core.y, "#ff0000", 50);
          this.stop();
          if (this.onGameOver) this.onGameOver();
        }
        continue;
      }

      // 넉백 속도 적용 (부드러운 넉백)
      if (enemy.knockbackVx || enemy.knockbackVy) {
        enemy.x += (enemy.knockbackVx || 0) * dt;
        enemy.y += (enemy.knockbackVy || 0) * dt;

        // 마찰로 속도 감소 (0.9^60 ≈ 0.002, 약 1초 후 거의 0)
        const friction = Math.pow(0.05, dt); // dt 기반 마찰
        enemy.knockbackVx = (enemy.knockbackVx || 0) * friction;
        enemy.knockbackVy = (enemy.knockbackVy || 0) * friction;

        // 속도가 거의 0이면 제거
        if (
          Math.abs(enemy.knockbackVx) < 1 &&
          Math.abs(enemy.knockbackVy) < 1
        ) {
          enemy.knockbackVx = 0;
          enemy.knockbackVy = 0;
        }
      }

      // 이동 적용 (슬로우 효과 반영)
      if (distToTarget > 0) {
        const slowMult = enemy.slowMultiplier || 1;
        enemy.x += (dx / distToTarget) * enemy.speed * slowMult * dt;
        enemy.y += (dy / distToTarget) * enemy.speed * slowMult * dt;
      }
    }

    // 2.5. 모든 바이러스 겹침 방지 (분리)
    this.separateAllViruses();

    // 3. 포탑 로직 (수동 발사만 - 자동 발사는 조력자가 담당)
    let nearestEnemy = null;
    let minDist = Infinity;

    this.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - this.core.x, enemy.y - this.core.y);
      if (dist < this.turret.range && dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy) {
      // 포탑이 적을 향하도록 회전 (발사는 수동으로만)
      const dx = nearestEnemy.x - this.core.x;
      const dy = nearestEnemy.y - this.core.y;
      this.turret.angle = Math.atan2(dy, dx);
      // 자동 발사 제거 - 수동 발사만 (fireAtPosition에서 처리)
    } else {
      // 적이 없을 때 포탑 자동 회전 (시계방향)
      this.turret.angle += dt * this.idleTurretSpeed;
      this.idleTurretAngle = this.turret.angle; // 동기화
    }

    // 3.5 조력자(Helper) 로직 - 자동 공격 + 회피
    this.updateHelper(dt, now);

    // 3.6 재장전 업데이트
    this.updateReload(dt);

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
        // vx, vy가 있으면 사용 (조력자 발사체), 없으면 angle, speed 사용 (코어 발사체)
        if (p.vx !== undefined && p.vy !== undefined) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          p.x += Math.cos(p.angle) * p.speed * dt;
          p.y += Math.sin(p.angle) * p.speed * dt;
        }

        // 직선탄도 적과 충돌 검사
        let hitEnemy = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dx = enemy.x - p.x;
          const dy = enemy.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p.radius + enemy.radius) {
            // 직격 데미지
            enemy.hp -= p.damage;
            this.createExplosion(p.x, p.y, p.color || "#00ff00", 5);

            // 폭발 처리 (LAUNCHER)
            if (p.explosive && p.explosionRadius > 0) {
              this.handleExplosion(
                p.x,
                p.y,
                p.explosionRadius,
                p.damage * 0.5,
                p.color
              );
            }

            // 적 처치
            if (enemy.hp <= 0) {
              this.enemies.splice(j, 1);
              this.createExplosion(enemy.x, enemy.y, p.color || "#00ff00", 15);

              const gain = 10;
              this.currentData += gain;
              this.updateResourceDisplay(this.currentData);
              if (this.onResourceGained) this.onResourceGained(gain);
              this.chargeStaticOnKill(); // 처치 시 스태틱 충전
              
              // 처치 대사 (15% 확률) - 투사체 발사한 아군 찾기
              const shooter = this.alliedViruses.find(v => v.virusType === 'HUNTER');
              if (shooter) this.tryVirusSpeech(shooter, 'kill', 0.15);
            }

            hitEnemy = true;

            // 관통 탄환은 계속 진행, 아니면 제거
            if (!p.piercing) {
              this.projectiles.splice(i, 1);
              break;
            }
            // 관통 시: 한 적당 한 번만 피해 (pierced 목록 사용)
            if (!p.piercedEnemies) p.piercedEnemies = [];
            if (!p.piercedEnemies.includes(enemy)) {
              p.piercedEnemies.push(enemy);
            }
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

    // 6. 파동 효과 업데이트
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      wave.radius += wave.speed * dt;
      wave.alpha = Math.max(0, 0.8 * (1 - wave.radius / wave.maxRadius));
      wave.lineWidth = Math.max(1, 6 * (1 - wave.radius / wave.maxRadius));

      if (wave.radius >= wave.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 7. 적 슬로우 효과 해제 체크
    const nowMs = performance.now();
    this.enemies.forEach((enemy) => {
      if (enemy.slowEndTime && nowMs >= enemy.slowEndTime) {
        enemy.slowMultiplier = 1;
        enemy.slowEndTime = null;
      }
    });

    // 8. 스태틱 시스템 업데이트
    this.updateStaticSystem(dt);
  }

  /**
   * 스태틱 시스템 업데이트
   */
  updateStaticSystem(dt) {
    const ss = this.staticSystem;

    // 시간 기반 충전
    ss.currentCharge += ss.chargeRate * dt;

    // 충전량 제한
    if (ss.currentCharge > ss.maxCharge) {
      ss.currentCharge = ss.maxCharge;
    }

    // 100% 충전 시 자동 발동
    if (ss.currentCharge >= ss.maxCharge && this.enemies.length > 0) {
      this.dischargeStatic();
    }

    // 스파크 파티클 업데이트
    for (let i = this.staticEffects.sparks.length - 1; i >= 0; i--) {
      const spark = this.staticEffects.sparks[i];
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.alpha = spark.life / spark.maxLife;
      if (spark.life <= 0) this.staticEffects.sparks.splice(i, 1);
    }

    // 체인 라인 업데이트
    for (let i = this.staticEffects.chains.length - 1; i >= 0; i--) {
      const chain = this.staticEffects.chains[i];
      chain.life -= dt;
      chain.alpha = chain.life / chain.maxLife;
      if (chain.life <= 0) this.staticEffects.chains.splice(i, 1);
    }

    // 충전량에 따른 스파크 생성 (충전 50% 이상)
    if (ss.currentCharge > ss.maxCharge * 0.5 && Math.random() < 0.1) {
      this.createStaticSpark();
    }
  }

  /**
   * 스태틱 방전 (체인 라이트닝)
   */
  dischargeStatic() {
    const ss = this.staticSystem;
    ss.currentCharge = 0;
    ss.lastDischargeTime = performance.now();

    if (this.enemies.length === 0) return;

    // 가장 가까운 적 찾기
    let nearestEnemy = null;
    let minDist = Infinity;

    this.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - this.core.x, enemy.y - this.core.y);
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (!nearestEnemy) return;

    // 체인 라이트닝 시작
    const hitEnemies = [nearestEnemy];
    let currentTarget = nearestEnemy;
    let prevX = this.core.x;
    let prevY = this.core.y;

    // 첫 번째 체인 (코어 → 첫 적)
    this.addChainLine(prevX, prevY, currentTarget.x, currentTarget.y);
    currentTarget.hp -= ss.damage;
    this.createExplosion(currentTarget.x, currentTarget.y, "#ffff00", 8);

    // 적 처치 체크
    if (currentTarget.hp <= 0) {
      const idx = this.enemies.indexOf(currentTarget);
      if (idx !== -1) {
        this.enemies.splice(idx, 1);
        this.createExplosion(currentTarget.x, currentTarget.y, "#ffff00", 15);
        const gain = 10;
        this.currentData += gain;
        this.updateResourceDisplay(this.currentData);
        if (this.onResourceGained) this.onResourceGained(gain);
      }
    }

    // 체인 연속 (최대 chainCount 번)
    for (let i = 1; i < ss.chainCount; i++) {
      let nextTarget = null;
      let nextMinDist = Infinity;

      // 아직 맞지 않은 적 중 가장 가까운 적 찾기
      this.enemies.forEach((enemy) => {
        if (hitEnemies.includes(enemy)) return;
        const dist = Math.hypot(
          enemy.x - currentTarget.x,
          enemy.y - currentTarget.y
        );
        if (dist < ss.chainRange && dist < nextMinDist) {
          nextMinDist = dist;
          nextTarget = enemy;
        }
      });

      if (!nextTarget) break; // 더 이상 튕길 적 없음

      // 체인 라인 추가
      this.addChainLine(
        currentTarget.x,
        currentTarget.y,
        nextTarget.x,
        nextTarget.y
      );

      // 데미지 (거리에 따라 감소 없이 동일)
      nextTarget.hp -= ss.damage;
      this.createExplosion(nextTarget.x, nextTarget.y, "#ffff00", 6);

      // 적 처치 체크
      if (nextTarget.hp <= 0) {
        const idx = this.enemies.indexOf(nextTarget);
        if (idx !== -1) {
          this.enemies.splice(idx, 1);
          this.createExplosion(nextTarget.x, nextTarget.y, "#ffff00", 15);
          const gain = 10;
          this.currentData += gain;
          this.updateResourceDisplay(this.currentData);
          if (this.onResourceGained) this.onResourceGained(gain);
        }
      }

      hitEnemies.push(nextTarget);
      currentTarget = nextTarget;
    }

    debugLog("Defense", "Static discharged! Hit", hitEnemies.length, "enemies");
  }

  /**
   * 체인 라인 추가
   */
  addChainLine(x1, y1, x2, y2) {
    this.staticEffects.chains.push({
      x1,
      y1,
      x2,
      y2,
      life: 0.3,
      maxLife: 0.3,
      alpha: 1,
      color: "#ffff00",
    });
  }

  /**
   * 스태틱 스파크 생성
   */
  createStaticSpark() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 15;
    const x = this.core.x + Math.cos(angle) * dist;
    const y = this.core.y + Math.sin(angle) * dist;

    this.staticEffects.sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      life: 0.2 + Math.random() * 0.2,
      maxLife: 0.4,
      alpha: 1,
      size: 2 + Math.random() * 3,
    });
  }

  /**
   * 피격 시 스태틱 충전 (코어/실드 피격 시 호출)
   */
  chargeStaticOnHit() {
    this.staticSystem.currentCharge += this.staticSystem.hitChargeAmount;
  }

  /**
   * 처치 시 스태틱 충전
   */
  chargeStaticOnKill() {
    this.staticSystem.currentCharge += this.staticSystem.killChargeAmount;
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
    this.spawnRate = 0.17; // 강화 1페이지: 스폰 수 3배 (0.5 / 3)
    this.updateWaveDisplay();
    debugLog(
      "Defense",
      "Reinforcement Mode Started:",
      maxPages,
      "pages, SpawnRate:",
      this.spawnRate
    );
  }

  // 일반 모드로 복귀
  resetToNormalMode() {
    this.isReinforcementMode = false;
    this.reinforcementPage = 0;
    this.reinforcementComplete = false;
    this.currentPage = 1;
    this.pageTimer = 0;
    this.spawnRate = 0.4; // 리셋 시 초기값 (스폰 수 3배)

    // 실드 복구
    this.core.shieldRadius = 70;
    this.core.shieldState = "OFF";
    this.core.shieldHp = this.core.shieldMaxHp;
    this.shieldBtn.style.pointerEvents = "auto";

    this.updateWaveDisplay();
    debugLog("Defense", "Reset to Normal Mode");
  }

  // 점령 상태로 설정
  setConqueredState(conquered) {
    debugLog(
      "DefenseGame",
      "setConqueredState 호출됨, conquered:",
      conquered,
      "현재 isConquered:",
      this.isConquered
    );
    this.isConquered = conquered;
    if (conquered) {
      // 점령 시작 시간 기록 (회전 애니메이션용)
      this.conqueredStartTime = Date.now() / 1000;
      this.lastRotationStep = -1; // 회전 단계 추적 (파동 발생용)
      debugLog(
        "DefenseGame",
        "점령 상태 활성화! conqueredStartTime:",
        this.conqueredStartTime
      );

      // 점령 시 강한 파동 발사!
      this.emitConquestWave();

      // 점령 시 적 스폰 중지, 실드 비활성화
      this.spawnRate = 9999; // 적 거의 안 나옴
      this.core.shieldActive = false;
      this.shieldBtn.style.display = "none"; // 실드 버튼 숨김

      // 아군 바이러스 10마리 소환
      this.spawnConqueredAllies(10);
    } else {
      debugLog("DefenseGame", "점령 상태 비활성화");
      this.conqueredStartTime = null; // 리셋
      this.conqueredDebugFrame = 0; // 디버그 프레임 카운터 리셋
      this.lastRotationStep = -1;
    }
    this.updateWaveDisplay();
  }

  // 점령 완료 시 강한 파동
  emitConquestWave() {
    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 0,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
      speed: 600, // 빠른 속도
      alpha: 1.0,
      color: "#00ff00", // 녹색
      lineWidth: 10,
      damageDealt: false,
    });

    // 강한 넉백 적용 (부드럽게)
    this.enemies.forEach((enemy) => {
      this.applyKnockback(enemy, 400, 0.3, 3); // 속도 400, 슬로우 0.3, 3초
    });
  }

  // 부드러운 넉백 적용 헬퍼
  applyKnockback(enemy, speed, slowMult = 1, slowDuration = 0) {
    const dx = enemy.x - this.core.x;
    const dy = enemy.y - this.core.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // 넉백 속도 설정 (기존 속도에 추가)
    enemy.knockbackVx = (enemy.knockbackVx || 0) + (dx / dist) * speed;
    enemy.knockbackVy = (enemy.knockbackVy || 0) + (dy / dist) * speed;

    // 슬로우 적용
    if (slowMult < 1 && slowDuration > 0) {
      enemy.slowMultiplier = slowMult;
      enemy.slowTimer = slowDuration;
    }
  }

  // 회전 단계 완료 시 파동 발사
  emitRotationWave(type) {
    let color, lineWidth;

    if (type === "green") {
      color = "rgba(0, 255, 100, 0.8)"; // 초록색 (사각형1 색상)
      lineWidth = 4;
    } else if (type === "blue") {
      color = "rgba(0, 200, 255, 0.8)"; // 파란색 (사각형2 색상)
      lineWidth = 4;
    } else {
      // 혼합색 (청록색)
      color = "rgba(0, 255, 200, 0.9)";
      lineWidth = 6;
    }

    // 파동 추가
    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 0,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.2,
      speed: 400,
      alpha: 0.7,
      color: color,
      lineWidth: lineWidth,
      damageDealt: false,
    });

    // 적에게 효과 적용 (부드러운 넉백)
    this.enemies.forEach((enemy) => {
      if (type === "mixed") {
        // 혼합색: 넉백 + 데미지
        this.applyKnockback(enemy, 200);
        enemy.hp -= 15; // 데미지
      } else {
        // 초록/파랑: 넉백 + 슬로우
        this.applyKnockback(enemy, 250, 0.5, 2);
      }
    });
  }

  // 점령 시 아군 바이러스 소환 (배리어 밖에 위치)
  spawnConqueredAllies(count) {
    this.alliedViruses = [];
    for (let i = 0; i < count; i++) {
      const angle = ((Math.PI * 2) / count) * i;
      const distance = 90 + Math.random() * 30; // 배리어(70) 밖: 90~120
      this.alliedViruses.push({
        x: this.core.x + Math.cos(angle) * distance,
        y: this.core.y + Math.sin(angle) * distance,
        radius: 6,
        color: "#00aaff",
        hp: 50,
        maxHp: 50,
        damage: 10,
        angle: angle,
        targetAngle: angle,
      });
    }
  }

  // 아군 바이러스 1마리 리스폰 (타입 정보 포함)
  respawnOneAlly(deadAlly = null) {
    // 새로운 슬롯 시스템 사용
    if (this.alliedConfig) {
      this.respawnAllyWithConfig(deadAlly);
      return;
    }

    // 레거시 시스템
    const targetCount = this.isConquered ? 10 : this.alliedInfo.count || 0;

    debugLog(
      "DefenseGame",
      "respawnOneAlly 호출됨, isConquered:",
      this.isConquered,
      "targetCount:",
      targetCount,
      "현재 아군 수:",
      this.alliedViruses.length
    );

    if (targetCount <= 0) {
      debugLog("DefenseGame", "targetCount가 0이라서 리스폰 취소");
      return;
    }

    if (this.alliedViruses.length >= targetCount) {
      debugLog("DefenseGame", "이미 목표 수 달성, 리스폰 취소");
      return;
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 30;

    const hp = this.isConquered ? 50 : 10 + (this.alliedInfo.level - 1) * 5;

    const newAlly = {
      x: this.core.x + Math.cos(angle) * distance,
      y: this.core.y + Math.sin(angle) * distance,
      radius: 6,
      color: this.alliedInfo.color || "#00aaff",
      hp: hp,
      maxHp: hp,
      damage: 10,
      angle: angle,
      targetAngle: angle,
      virusType: "SWARM",
      attackType: "melee",
    };

    this.alliedViruses.push(newAlly);
    debugLog(
      "DefenseGame",
      "아군 바이러스 리스폰 완료, 현재 아군 수:",
      this.alliedViruses.length
    );

    this.createExplosion(newAlly.x, newAlly.y, "#00aaff", 5);
  }

  // 새로운 슬롯 시스템으로 리스폰
  respawnAllyWithConfig(deadAlly) {
    const config = this.alliedConfig;
    if (!config) return;

    const targetCount = config.mainCount + config.subCount;
    if (this.alliedViruses.length >= targetCount) return;

    // 죽은 아군과 같은 타입으로 리스폰
    const typeName = deadAlly?.virusType || config.mainType;
    const typeData =
      typeName === config.mainType ? config.mainTypeData : config.subTypeData;

    if (!typeData) return;

    const angle = Math.random() * Math.PI * 2;
    const targetRadius = 95;

    const newAlly = this.createVirusFromType(
      typeName,
      typeData,
      angle,
      targetRadius,
      config
    );
    newAlly.x = this.core.x + Math.cos(angle) * targetRadius;
    newAlly.y = this.core.y + Math.sin(angle) * targetRadius;
    newAlly.spawning = false;

    this.alliedViruses.push(newAlly);
    this.createExplosion(newAlly.x, newAlly.y, newAlly.color, 5);
    
    // 스폰 대사 (50% 확률)
    this.tryVirusSpeech(newAlly, 'spawn', 0.5);

    debugLog(
      "DefenseGame",
      `리스폰: ${typeName}, 현재 아군 수: ${this.alliedViruses.length}`
    );
  }

  // === 아군 사망 처리 ===
  handleAllyDeath(v, idx) {
    debugLog("DefenseGame", `아군 바이러스 사망: ${v.virusType}`);

    // 특수 효과: 폭발 사망 (SWARM)
    if (v.special === "explodeOnDeath" && v.explosionDamage > 0) {
      this.handleExplosion(
        v.x,
        v.y,
        v.explosionRadius,
        v.explosionDamage,
        v.color
      );
    }

    // 특수 효과: 자폭 (BOMBER) - 이미 자폭했으면 패스
    if (v.attackType === "suicide" && !v.exploded) {
      this.handleExplosion(
        v.x,
        v.y,
        v.explosionRadius,
        v.explosionDamage,
        v.color
      );
    }

    this.createExplosion(v.x, v.y, v.color, 8);

    // 시너지 효과: 헌터 사망 시 SWARM 소환
    if (v.synergy?.effect === "hunterSwarmSpawn" && v.virusType === "HUNTER") {
      this.spawnSynergySwarm(v.x, v.y, 2);
    }

    const deadAlly = { ...v }; // 정보 복사
    this.alliedViruses.splice(idx, 1);

    // 리스폰 (타입별 리스폰 시간)
    const respawnTime = (v.respawnTime || 2) * 1000;
    setTimeout(() => this.respawnOneAlly(deadAlly), respawnTime);
  }

  // === 근접 타입 (SWARM, TANK) 업데이트 ===
  updateMeleeAlly(v, dt) {
    const searchRange = 350; // 사거리 증가
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    // 속도/가속도 초기화
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    // TANK 전용: 도발 스킬 (액티브)
    if (v.virusType === "TANK" && v.special === "taunt") {
      v.tauntTimer = (v.tauntTimer || 0) + dt;
      const cooldown = v.tauntCooldown || 5;

      if (v.tauntTimer >= cooldown) {
        v.tauntTimer = 0;
        const tauntRadius = v.tauntRadius || 100;

        // 범위 내 모든 적 도발
        let tauntedCount = 0;
        for (const enemy of this.enemies) {
          const dist = Math.hypot(enemy.x - v.x, enemy.y - v.y);
          if (dist < tauntRadius) {
            enemy.tauntedBy = v; // 이 탱커에게 도발당함
            tauntedCount++;

            // 도발당한 적 끌어당기기
            const pullForce = 30;
            const angle = Math.atan2(v.y - enemy.y, v.x - enemy.x);
            enemy.x += Math.cos(angle) * pullForce;
            enemy.y += Math.sin(angle) * pullForce;
          }
        }

        // 도발 이펙트 (도발한 적이 있을 때만)
        if (tauntedCount > 0) {
          this.createTauntEffect(v.x, v.y, tauntRadius, v.color);
          // 도발 대사 (80% 확률)
          this.tryVirusSpeech(v, 'taunt', 0.8);
        }
      }
    }

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
      const collisionDist = v.radius + nearestEnemy.radius + 5;

      if (dist < collisionDist) {
        // 충돌: 전투
        const damage = v.damage || 10;
        nearestEnemy.hp -= damage;
        
        // 전투 대사 (5% 확률)
        this.tryVirusSpeech(v, 'battle', 0.05);

        // TANK 넉백 효과 (도발 후에도 밀어냄)
        if (v.virusType === "TANK" && v.knockbackForce > 0) {
          const angle = Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x);
          nearestEnemy.x += Math.cos(angle) * v.knockbackForce;
          nearestEnemy.y += Math.sin(angle) * v.knockbackForce;
        }

        // 받는 데미지 (TANK는 적게 받음)
        const receivedDamage =
          v.virusType === "TANK" ? Math.floor(damage * 0.3) : damage;
        v.hp -= receivedDamage;
        
        // 피격 대사 (10% 확률)
        if (receivedDamage > 0) {
          this.tryVirusSpeech(v, 'hurt', 0.1);
        }

        this.createExplosion(
          (v.x + nearestEnemy.x) / 2,
          (v.y + nearestEnemy.y) / 2,
          v.color,
          5
        );

        // 적 처치
        if (nearestEnemy.hp <= 0) {
          this.killEnemy(nearestEnemy);
          // 처치 대사 (20% 확률)
          this.tryVirusSpeech(v, 'kill', 0.2);
        }
      } else {
        // 부드러운 추적 이동
        this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.2);
      }
    } else {
      // 유동적인 순찰
      this.fluidPatrol(v, dt);
    }

    // 배리어 내부 진입 방지
    this.keepOutsideBarrier(v);
  }

  // === 원거리 타입 (HUNTER) 업데이트 ===
  updateRangedAlly(v, dt) {
    const searchRange = (v.range || 150) + 100; // 사거리 증가
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    // 속도/가속도 초기화
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    // 공격 타이머 업데이트
    v.attackTimer = (v.attackTimer || 0) + dt;

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
      const optimalDist = 100; // 최적 거리

      if (dist < searchRange) {
        // 사거리 내: 발사
        const fireInterval = 1 / (v.fireRate || 1);
        if (v.attackTimer >= fireInterval) {
          this.fireAllyProjectile(v, nearestEnemy);
          v.attackTimer = 0;
        }

        // 적정 거리 유지 (가까우면 후퇴, 멀면 접근)
        if (dist < optimalDist * 0.6) {
          // 후퇴 (부드럽게)
          const awayX = v.x + (v.x - nearestEnemy.x);
          const awayY = v.y + (v.y - nearestEnemy.y);
          this.smoothMoveToward(v, awayX, awayY, dt, 0.8);
        } else if (dist > optimalDist * 1.5) {
          // 접근
          this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 0.6);
        } else {
          // 최적 거리: 측면 이동 (strafing)
          const strafeAngle =
            Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) +
            Math.PI / 2;
          const strafeX = v.x + Math.cos(strafeAngle) * 30;
          const strafeY = v.y + Math.sin(strafeAngle) * 30;
          this.smoothMoveToward(v, strafeX, strafeY, dt, 0.4);
        }
      } else {
        // 사거리 밖: 부드럽게 접근
        this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 0.8);
      }
    } else {
      // 유동적인 순찰
      this.fluidPatrol(v, dt);
    }

    // 배리어 내부 진입 방지
    this.keepOutsideBarrier(v);
  }

  // === 자폭 타입 (BOMBER) 업데이트 ===
  updateSuicideAlly(v, dt) {
    const searchRange = 400; // 넓은 탐색 범위
    let nearestEnemy = this.findNearestEnemy(v, searchRange);

    // 속도 초기화
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    if (nearestEnemy) {
      const dist = Math.hypot(nearestEnemy.x - v.x, nearestEnemy.y - v.y);
      const explosionRange = v.radius + nearestEnemy.radius + 10;

      if (dist < explosionRange) {
        // 자폭!
        v.exploded = true;
        
        // 폭발 대사 (100% 확률 - 자폭이므로)
        this.tryVirusSpeech(v, 'explode', 1.0);

        // 정밀 폭격 시너지: HUNTER+BOMBER = 폭발 범위 +30%
        let explosionRadius = v.explosionRadius;
        if (this.alliedConfig?.synergy?.effect === "bomberRangeBoost") {
          explosionRadius = Math.floor(explosionRadius * 1.3);
        }

        this.handleExplosion(
          v.x,
          v.y,
          explosionRadius,
          v.explosionDamage,
          v.color
        );

        // 연쇄 폭발 시너지: SWARM+BOMBER = 주변 SWARM도 폭발
        if (this.alliedConfig?.synergy?.effect === "chainExplosion") {
          this.triggerChainExplosion(v.x, v.y, explosionRadius);
        }

        v.hp = 0; // 사망 처리 트리거
      } else {
        // 적에게 부드럽게 돌진 (약간 불규칙하게)
        this.smoothMoveToward(v, nearestEnemy.x, nearestEnemy.y, dt, 1.8);

        // 약간의 지그재그 움직임
        v.wobblePhase += dt * 8;
        const wobble = Math.sin(v.wobblePhase) * 15;
        const perpAngle =
          Math.atan2(nearestEnemy.y - v.y, nearestEnemy.x - v.x) + Math.PI / 2;
        v.x += Math.cos(perpAngle) * wobble * dt;
        v.y += Math.sin(perpAngle) * wobble * dt;
      }
    } else {
      // 유동적인 순찰
      this.fluidPatrol(v, dt);
    }

    // 배리어 내부 진입 방지
    this.keepOutsideBarrier(v);
  }

  // === 지원 타입 (HEALER) 업데이트 ===
  updateSupportAlly(v, dt) {
    // 속도 초기화
    if (!v.vx) v.vx = 0;
    if (!v.vy) v.vy = 0;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;

    // 다른 아군 치유
    const healRadius = v.healRadius || 80;
    const healAmount = (v.healAmount || 5) * dt;

    this.alliedViruses.forEach((ally) => {
      if (ally === v) return;
      const dist = Math.hypot(ally.x - v.x, ally.y - v.y);
      if (dist < healRadius && ally.hp < ally.maxHp) {
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);

        // 힐 이펙트 (가끔)
        if (Math.random() < 0.05) {
          this.particles.push({
            x: ally.x,
            y: ally.y - 10,
            vx: 0,
            vy: -20,
            life: 0.5,
            maxLife: 0.5,
            alpha: 1,
            color: "#00ff88",
            size: 3,
          });
          
          // 힐 대사 (10% 확률)
          this.tryVirusSpeech(v, 'heal', 0.1);
        }
      }
    });

    // 시너지: TANK+HEALER = 탱크 힐 2배
    if (v.synergy?.effect === "tankHealBoost") {
      this.alliedViruses.forEach((ally) => {
        if (ally.virusType === "TANK") {
          const dist = Math.hypot(ally.x - v.x, ally.y - v.y);
          if (dist < healRadius && ally.hp < ally.maxHp) {
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmount); // 추가 힐
          }
        }
      });
    }

    // 부상당한 아군 찾기 (가장 HP가 낮은)
    let woundedAlly = null;
    let lowestHpPercent = 1;
    this.alliedViruses.forEach((ally) => {
      if (ally === v) return;
      const hpPercent = ally.hp / ally.maxHp;
      if (hpPercent < lowestHpPercent && hpPercent < 0.8) {
        lowestHpPercent = hpPercent;
        woundedAlly = ally;
      }
    });

    if (woundedAlly) {
      // 부상당한 아군에게 부드럽게 이동
      this.smoothMoveToward(v, woundedAlly.x, woundedAlly.y, dt, 0.5);
    } else {
      // 코어 근처에서 유동적 순찰 (좁은 범위)
      this.fluidPatrol(v, dt, 75);
    }

    // 배리어 내부 진입 방지
    this.keepOutsideBarrier(v);
  }

  // === 연쇄 폭발 (SWARM+BOMBER 시너지) ===
  triggerChainExplosion(x, y, triggerRadius) {
    const chainRange = triggerRadius + 30; // 폭발 범위 + 여유
    const swarms = this.alliedViruses.filter(
      (v) => v.virusType === "SWARM" && v.hp > 0 && !v.chainExploded
    );

    for (const swarm of swarms) {
      const dist = Math.hypot(swarm.x - x, swarm.y - y);
      if (dist < chainRange) {
        // SWARM 연쇄 폭발
        swarm.chainExploded = true;
        swarm.hp = 0; // 사망 처리

        // 작은 폭발 효과
        this.handleExplosion(
          swarm.x,
          swarm.y,
          swarm.explosionRadius || 25,
          (swarm.explosionDamage || 5) * 2, // 연쇄 폭발은 2배 데미지
          swarm.color
        );
      }
    }
  }

  // === 시너지 효과 적용 ===
  applySynergyEffects(dt) {
    if (!this.alliedConfig?.synergy) return;

    const synergy = this.alliedConfig.synergy;
    const effect = synergy.effect;

    // TANK 위치 캐싱 (여러 시너지에서 사용)
    const tanks = this.alliedViruses.filter(
      (v) => v.virusType === "TANK" && v.hp > 0
    );

    switch (effect) {
      case "tankProtection":
        // 철벽 군단: TANK 주변 100px 내 SWARM HP +50% (버프 상태 관리)
        this.alliedViruses.forEach((v) => {
          if (v.virusType !== "SWARM") return;

          let nearTank = false;
          for (const tank of tanks) {
            const dist = Math.hypot(v.x - tank.x, v.y - tank.y);
            if (dist < 100) {
              nearTank = true;
              break;
            }
          }

          // 버프 상태 관리
          if (nearTank && !v.tankProtectionBuff) {
            v.tankProtectionBuff = true;
            v.maxHp = Math.floor(v.baseMaxHp * 1.5); // HP 최대치 +50%
            v.hp = Math.min(v.hp, v.maxHp);
          } else if (!nearTank && v.tankProtectionBuff) {
            v.tankProtectionBuff = false;
            v.maxHp = v.baseMaxHp;
            v.hp = Math.min(v.hp, v.maxHp);
          }
        });
        break;

      case "hunterCover":
        // 엄호 사격: HUNTER가 TANK 근처 80px 내에 있으면 받는 데미지 -50% (플래그 설정)
        this.alliedViruses.forEach((v) => {
          if (v.virusType !== "HUNTER") return;

          let nearTank = false;
          for (const tank of tanks) {
            const dist = Math.hypot(v.x - tank.x, v.y - tank.y);
            if (dist < 80) {
              nearTank = true;
              break;
            }
          }
          v.hasCover = nearTank; // 데미지 계산에서 사용
        });
        break;

      // chainExplosion, bomberRangeBoost는 폭발/생성 시 적용
    }
  }

  // === 유틸리티 함수들 ===
  findNearestEnemy(v, range) {
    let nearestEnemy = null;
    let minDist = Infinity;

    for (let j = 0; j < this.enemies.length; j++) {
      const enemy = this.enemies[j];
      const dist = Math.hypot(enemy.x - v.x, enemy.y - v.y);
      if (dist < range && dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    }
    return nearestEnemy;
  }

  // 부드러운 이동 (가속도 기반)
  smoothMoveToward(v, targetX, targetY, dt, speedMultiplier = 1.0) {
    const dx = targetX - v.x;
    const dy = targetY - v.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) return;

    const baseSpeed = (v.speed || 80) * speedMultiplier;
    const acceleration = baseSpeed * 3; // 가속도
    const friction = 0.92; // 마찰

    // 목표 방향으로 가속
    const ax = (dx / dist) * acceleration * dt;
    const ay = (dy / dist) * acceleration * dt;

    v.vx = (v.vx + ax) * friction;
    v.vy = (v.vy + ay) * friction;

    // 최대 속도 제한
    const currentSpeed = Math.hypot(v.vx, v.vy);
    const maxSpeed = baseSpeed * 1.5;
    if (currentSpeed > maxSpeed) {
      v.vx = (v.vx / currentSpeed) * maxSpeed;
      v.vy = (v.vy / currentSpeed) * maxSpeed;
    }

    // 위치 업데이트
    v.x += v.vx * dt;
    v.y += v.vy * dt;
  }

  // 유동적인 순찰 (물결치듯)
  fluidPatrol(v, dt, baseRadius = 95) {
    // Safe Zone에서는 자유롭게 돌아다님
    if (this.isSafeZone) {
      if (!this._safeZoneLogOnce) {
        console.log("[DEBUG] fluidPatrol -> safeZoneWander (isSafeZone:", this.isSafeZone, ")");
        this._safeZoneLogOnce = true;
      }
      this.safeZoneWander(v, dt);
      return;
    }
    
    // 초기화
    if (!v.patrolAngle) v.patrolAngle = v.angle || Math.random() * Math.PI * 2;
    if (!v.wobblePhase) v.wobblePhase = Math.random() * Math.PI * 2;
    if (!v.radiusOffset) v.radiusOffset = (Math.random() - 0.5) * 20;

    // 부드러운 각도 변화
    const baseAngularSpeed = 0.3 + Math.sin(v.wobblePhase * 0.5) * 0.15;
    v.patrolAngle += dt * baseAngularSpeed;
    v.wobblePhase += dt * 2;

    // 물결치는 반경 (안팎으로 움직임)
    const wobbleRadius = Math.sin(v.wobblePhase) * 15;
    const patrolRadius = baseRadius + v.radiusOffset + wobbleRadius;

    // 목표 위치 계산
    const targetX = this.core.x + Math.cos(v.patrolAngle) * patrolRadius;
    const targetY = this.core.y + Math.sin(v.patrolAngle) * patrolRadius;

    // 부드럽게 이동
    this.smoothMoveToward(v, targetX, targetY, dt, 0.4);

    // 약간의 랜덤 움직임 (자연스러움)
    v.x += (Math.random() - 0.5) * 0.5;
    v.y += (Math.random() - 0.5) * 0.5;
  }
  
  // Safe Zone 전용: 홈 기반 자유로운 돌아다니기
  safeZoneWander(v, dt) {
    const screenW = this.canvas.width;
    const screenH = this.canvas.height;
    const margin = 40;
    
    // 홈이 없으면 현재 위치를 홈으로
    if (!v.homeX) {
      v.homeX = v.x;
      v.homeY = v.y;
      v.homeRadius = 80 + Math.random() * 60;
    }
    
    // 홈 근처 랜덤 위치
    const getNearHomePos = () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * v.homeRadius;
      let x = v.homeX + Math.cos(angle) * dist;
      let y = v.homeY + Math.sin(angle) * dist;
      // 화면 경계 체크
      x = Math.max(margin, Math.min(screenW - margin, x));
      y = Math.max(margin, Math.min(screenH - margin, y));
      return { x, y };
    };
    
    // 초기화
    if (v.safeState === undefined) {
      v.safeState = 'wander';
      v.stateTimer = 0;
      v.stateDuration = 3 + Math.random() * 4;
      v.chatPartner = null;
      v.chatOffsetAngle = Math.random() * Math.PI * 2;
      
      // 초기 목표: 홈 근처
      const pos = getNearHomePos();
      v.wanderTargetX = pos.x;
      v.wanderTargetY = pos.y;
    }
    
    v.stateTimer += dt;
    
    // 상태별 행동
    switch (v.safeState) {
      case 'wander':
        // 홈 근처에서 돌아다니기
        if (v.stateTimer >= v.stateDuration) {
          v.stateTimer = 0;
          
          const roll = Math.random();
          
          if (roll < 0.5 && this.alliedViruses.length > 1) {
            // 50%: 근처에 있는 친구에게 다가가기 (홈에서 200px 이내)
            const nearbyFriends = this.alliedViruses.filter(a => 
              a !== v && 
              a.safeState !== 'approaching' &&
              Math.hypot(a.x - v.homeX, a.y - v.homeY) < 250
            );
            
            if (nearbyFriends.length > 0) {
              v.chatPartner = nearbyFriends[Math.floor(Math.random() * nearbyFriends.length)];
              v.safeState = 'approaching';
              v.stateDuration = 4 + Math.random() * 3;
            } else {
              // 근처에 친구 없으면 홈에서 놀기
              const pos = getNearHomePos();
              v.wanderTargetX = pos.x;
              v.wanderTargetY = pos.y;
              v.stateDuration = 3 + Math.random() * 3;
            }
          } else if (roll < 0.65) {
            // 15%: 멀리 있는 친구 방문하기 (모험!)
            const farFriends = this.alliedViruses.filter(a => 
              a !== v && 
              Math.hypot(a.homeX - v.homeX, a.homeY - v.homeY) > 150
            );
            
            if (farFriends.length > 0) {
              v.chatPartner = farFriends[Math.floor(Math.random() * farFriends.length)];
              v.safeState = 'approaching';
              v.stateDuration = 6 + Math.random() * 4; // 멀리 가니까 시간 더 줌
            }
          } else {
            // 35%: 홈 근처에서 산책
            const pos = getNearHomePos();
            v.wanderTargetX = pos.x;
            v.wanderTargetY = pos.y;
            v.stateDuration = 2 + Math.random() * 4;
          }
        }
        
        // 목표로 이동
        this.smoothMoveToward(v, v.wanderTargetX, v.wanderTargetY, dt, 0.25);
        break;
        
      case 'approaching':
        // 대화 상대에게 다가가기
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }
        
        const distToPartner = Math.hypot(v.chatPartner.x - v.x, v.chatPartner.y - v.y);
        
        if (distToPartner < 25) {
          // 충분히 가까움 - 대화 시작!
          v.safeState = 'chatting';
          v.stateTimer = 0;
          v.stateDuration = 4 + Math.random() * 6; // 4~10초 대화
          v.chatOffsetAngle = Math.atan2(v.y - v.chatPartner.y, v.x - v.chatPartner.x);
        } else if (v.stateTimer >= v.stateDuration) {
          // 시간 초과 - 포기
          v.safeState = 'wander';
          v.chatPartner = null;
        } else {
          // 상대방에게 이동
          this.smoothMoveToward(v, v.chatPartner.x, v.chatPartner.y, dt, 0.5);
        }
        break;
        
      case 'chatting':
        // 대화 중 - 상대방 옆에 붙어있기
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }
        
        if (v.stateTimer >= v.stateDuration) {
          // 대화 끝 - 60% 확률로 같이 걷기
          if (Math.random() < 0.6) {
            v.safeState = 'walkingTogether';
            v.stateTimer = 0;
            v.stateDuration = 4 + Math.random() * 4; // 4~8초 같이 걷기
            
            // 함께 갈 목표: 둘 중 하나의 홈 방향 (자연스럽게 헤어지기)
            const targetHome = Math.random() < 0.5 ? v : v.chatPartner;
            if (targetHome && targetHome.homeX) {
              const angle = Math.random() * Math.PI * 2;
              const dist = Math.random() * (targetHome.homeRadius || 80);
              v.wanderTargetX = targetHome.homeX + Math.cos(angle) * dist;
              v.wanderTargetY = targetHome.homeY + Math.sin(angle) * dist;
            } else {
              v.wanderTargetX = v.x + (Math.random() - 0.5) * 100;
              v.wanderTargetY = v.y + (Math.random() - 0.5) * 100;
            }
          } else {
            v.safeState = 'wander';
            v.chatPartner = null;
          }
        } else {
          // 상대방 옆에 붙어있기
          const stickDist = 18;
          const targetX = v.chatPartner.x + Math.cos(v.chatOffsetAngle) * stickDist;
          const targetY = v.chatPartner.y + Math.sin(v.chatOffsetAngle) * stickDist;
          
          v.x += (targetX - v.x) * 0.1;
          v.y += (targetY - v.y) * 0.1;
          
          // 미세한 떨림 (살아있는 느낌)
          v.x += (Math.random() - 0.5) * 0.3;
          v.y += (Math.random() - 0.5) * 0.3;
        }
        break;
        
      case 'walkingTogether':
        // 함께 걷기 - 상대방과 같이 이동
        if (!v.chatPartner || v.chatPartner.hp <= 0) {
          v.safeState = 'wander';
          v.chatPartner = null;
          break;
        }
        
        if (v.stateTimer >= v.stateDuration) {
          v.safeState = 'wander';
          v.chatPartner = null;
        } else {
          // 목표 위치로 함께 이동
          this.smoothMoveToward(v, v.wanderTargetX, v.wanderTargetY, dt, 0.25);
          
          // 상대방도 같은 목표로 유도 (부드럽게)
          if (v.chatPartner.safeState === 'chatting' || v.chatPartner.safeState === 'walkingTogether') {
            v.chatPartner.wanderTargetX = v.wanderTargetX + (Math.random() - 0.5) * 30;
            v.chatPartner.wanderTargetY = v.wanderTargetY + (Math.random() - 0.5) * 30;
          }
          
          // 상대방과 가까이 유지
          const distToPartner2 = Math.hypot(v.chatPartner.x - v.x, v.chatPartner.y - v.y);
          if (distToPartner2 > 40) {
            // 너무 멀어지면 기다리기
            const pullX = (v.chatPartner.x - v.x) * 0.02;
            const pullY = (v.chatPartner.y - v.y) * 0.02;
            v.x += pullX;
            v.y += pullY;
          }
        }
        break;
    }
    
    // 코어에서 밀어내는 힘 (가까울수록 강하게)
    const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
    const pushStartDist = 200; // 200px 이내면 밀어내기 시작
    
    if (distFromCore < pushStartDist && distFromCore > 0) {
      const pushStrength = (1 - distFromCore / pushStartDist) * 2.5; // 0~2.5 강도
      const pushAngle = Math.atan2(v.y - this.core.y, v.x - this.core.x);
      
      // 밖으로 밀어내기
      v.x += Math.cos(pushAngle) * pushStrength;
      v.y += Math.sin(pushAngle) * pushStrength;
    }
    
    // 화면 경계 체크
    v.x = Math.max(margin, Math.min(screenW - margin, v.x));
    v.y = Math.max(margin, Math.min(screenH - margin, v.y));
    v.wanderTargetX = Math.max(margin, Math.min(screenW - margin, v.wanderTargetX || v.x));
    v.wanderTargetY = Math.max(margin, Math.min(screenH - margin, v.wanderTargetY || v.y));
  }

  // 배리어 내부 진입 방지 + 최대 거리 제한
  keepOutsideBarrier(v) {
    // Safe Zone에서는 자유롭게! (거리 제한 없음)
    if (this.isSafeZone) {
      // 배리어 내부만 막기 (코어 안으로는 못 들어감)
      const barrierRadius = this.core.shieldRadius || 70;
      const minDistance = barrierRadius + v.radius + 5;
      const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
      
      if (distFromCore < minDistance) {
        const angle = Math.atan2(v.y - this.core.y, v.x - this.core.x);
        v.x = this.core.x + Math.cos(angle) * minDistance;
        v.y = this.core.y + Math.sin(angle) * minDistance;
      }
      return; // Safe Zone에서는 여기서 끝!
    }
    
    const barrierRadius = this.core.shieldRadius || 70;
    const minDistance = barrierRadius + v.radius + 5;
    const maxDistance = 250; // 코어에서 최대 거리

    const distFromCore = Math.hypot(v.x - this.core.x, v.y - this.core.y);
    const angle = Math.atan2(v.y - this.core.y, v.x - this.core.x);

    // 너무 가까우면 밀어내기
    if (distFromCore < minDistance) {
      v.x = this.core.x + Math.cos(angle) * minDistance;
      v.y = this.core.y + Math.sin(angle) * minDistance;

      // 속도도 바깥으로 반사
      if (v.vx !== undefined) {
        const dot = v.vx * Math.cos(angle) + v.vy * Math.sin(angle);
        if (dot < 0) {
          v.vx -= 2 * dot * Math.cos(angle);
          v.vy -= 2 * dot * Math.sin(angle);
        }
      }
    }

    // 너무 멀면 강제로 돌아오기
    if (distFromCore > maxDistance) {
      // 부드럽게 당기기
      const pullStrength = 0.1;
      const targetDist = maxDistance - 20;
      const targetX = this.core.x + Math.cos(angle) * targetDist;
      const targetY = this.core.y + Math.sin(angle) * targetDist;

      v.x += (targetX - v.x) * pullStrength;
      v.y += (targetY - v.y) * pullStrength;

      // 바깥으로 가는 속도 감소
      if (v.vx !== undefined) {
        const dot = v.vx * Math.cos(angle) + v.vy * Math.sin(angle);
        if (dot > 0) {
          v.vx *= 0.8;
          v.vy *= 0.8;
        }
      }
    }
  }

  // 레거시 호환용 (기존 코드에서 호출하는 경우)
  moveTowardTarget(v, target, dt) {
    this.smoothMoveToward(v, target.x, target.y, dt, 1.0);
  }

  // 레거시 호환용
  patrolAlly(v, dt) {
    this.fluidPatrol(v, dt);
  }

  // 모든 바이러스 분리 (겹침 방지)
  separateAllViruses() {
    const allEntities = [];
    
    // 아군 바이러스 수집
    this.alliedViruses.forEach(v => {
      allEntities.push({ entity: v, type: 'ally' });
    });
    
    // 적군 바이러스 수집
    this.enemies.forEach(e => {
      allEntities.push({ entity: e, type: 'enemy' });
    });
    
    // 수집 바이러스 (아이템 가져가는 애들)
    this.collectorViruses.forEach(c => {
      allEntities.push({ entity: c, type: 'collector' });
    });
    
    // 모든 쌍에 대해 분리
    for (let i = 0; i < allEntities.length; i++) {
      for (let j = i + 1; j < allEntities.length; j++) {
        const a = allEntities[i].entity;
        const b = allEntities[j].entity;
        
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = (a.radius || 8) + (b.radius || 8) + 2; // 약간의 여유
        
        if (dist < minDist && dist > 0) {
          // 겹침! 서로 밀어내기
          const overlap = minDist - dist;
          const pushX = (dx / dist) * overlap * 0.5;
          const pushY = (dy / dist) * overlap * 0.5;
          
          // 양쪽 다 밀어내기
          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;
        }
      }
    }
  }

  killEnemy(enemy) {
    const enemyIdx = this.enemies.indexOf(enemy);
    if (enemyIdx > -1) {
      this.enemies.splice(enemyIdx, 1);
      this.createExplosion(enemy.x, enemy.y, "#00ff00", 10);

      const gain = 10;
      this.currentData += gain;
      this.updateResourceDisplay(this.currentData);
      if (this.onResourceGained) this.onResourceGained(gain);
      
      // 아이템 드롭 콜백 호출 (적 위치 전달)
      if (this.onEnemyKilled) {
        this.onEnemyKilled(enemy.x, enemy.y);
      }
      
      // 아이템 효과: 쉴드 회복 (lifesteal)
      const effects = this.getItemEffects();
      if (effects.lifesteal > 0 && this.core.shieldHp < this.core.shieldMaxHp) {
        this.core.shieldHp = Math.min(this.core.shieldMaxHp, this.core.shieldHp + effects.lifesteal);
      }
    }
  }

  // 아군 바이러스 탄환 발사
  fireAllyProjectile(v, target) {
    const angle = Math.atan2(target.y - v.y, target.x - v.x);

    this.projectiles.push({
      x: v.x,
      y: v.y,
      vx: Math.cos(angle) * (v.projectileSpeed || 200),
      vy: Math.sin(angle) * (v.projectileSpeed || 200),
      damage: v.damage,
      radius: 3,
      color: v.color,
      fromAlly: true, // 아군 발사체 표시
      lifetime: 2,
      age: 0,
    });

    // 발사 이펙트
    this.createExplosion(v.x, v.y, v.color, 3);
  }

  // 시너지: 헌터 사망 시 SWARM 소환
  spawnSynergySwarm(x, y, count) {
    if (!this.alliedConfig) return;

    const config = this.alliedConfig;
    const swarmData =
      config.mainType === "SWARM"
        ? config.mainTypeData
        : config.subType === "SWARM"
        ? config.subTypeData
        : null;

    if (!swarmData) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const newSwarm = this.createVirusFromType(
        "SWARM",
        swarmData,
        angle,
        95,
        config
      );
      newSwarm.x = x + (Math.random() - 0.5) * 20;
      newSwarm.y = y + (Math.random() - 0.5) * 20;
      newSwarm.spawning = false;

      this.alliedViruses.push(newSwarm);
      this.createExplosion(newSwarm.x, newSwarm.y, swarmData.color, 4);
    }
  }

  // 점령 시각화 렌더링 (깃발 + 별 모양 방어막)
  renderConqueredVisuals() {
    const ctx = this.ctx;
    const x = this.core.x;
    const y = this.core.y;
    const size = 80; // 방어막 크기

    // 점령 시작 시간 기준 상대적 시간 (없으면 현재 시간 사용)
    if (!this.conqueredStartTime) {
      this.conqueredStartTime = Date.now() / 1000;
      debugLog(
        "ConqueredVisuals",
        "conqueredStartTime 초기화:",
        this.conqueredStartTime
      );
    }
    const elapsed = Date.now() / 1000 - this.conqueredStartTime;

    // 철컥철컥 회전 패턴: 90° 이동 → 0.5초 쉼 → 90° 이동 → 0.5초 쉼 → 180° 이동 → 0.5초 쉼
    // 회전은 부드럽게, 그 후 정지
    const ROTATION_TIME = 0.8; // 회전 시간 (느리게)
    const PAUSE_TIME = 0.5; // 쉼 시간
    const CYCLE_DURATION = ROTATION_TIME * 3 + PAUSE_TIME * 3; // 총 사이클 시간

    const cycleTime = elapsed % CYCLE_DURATION;
    const fullCycles = Math.floor(elapsed / CYCLE_DURATION); // 완료된 사이클 수

    // 각 단계별 목표 각도
    // Easing 함수: 부드러운 가속/감속
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    let targetAngle;
    let currentStep = 0; // 현재 단계 (0=1단계 회전 중, 1=1단계 쉼, 2=2단계 회전 중, ...)

    if (cycleTime < ROTATION_TIME) {
      // 첫 번째 회전: 0° → 90° (부드럽게 회전)
      const progress = easeInOut(cycleTime / ROTATION_TIME);
      targetAngle = progress * (Math.PI / 2);
      currentStep = 0;
    } else if (cycleTime < ROTATION_TIME + PAUSE_TIME) {
      // 첫 번째 쉼: 90° (정지) - 1단계 완료
      targetAngle = Math.PI / 2;
      currentStep = 1;
    } else if (cycleTime < ROTATION_TIME * 2 + PAUSE_TIME) {
      // 두 번째 회전: 90° → 180° (부드럽게 회전)
      const localTime = cycleTime - (ROTATION_TIME + PAUSE_TIME);
      const progress = easeInOut(localTime / ROTATION_TIME);
      targetAngle = Math.PI / 2 + progress * (Math.PI / 2);
      currentStep = 2;
    } else if (cycleTime < ROTATION_TIME * 2 + PAUSE_TIME * 2) {
      // 두 번째 쉼: 180° (정지) - 2단계 완료
      targetAngle = Math.PI;
      currentStep = 3;
    } else if (cycleTime < ROTATION_TIME * 3 + PAUSE_TIME * 2) {
      // 세 번째 회전: 180° → 360° (부드럽게 회전)
      const localTime = cycleTime - (ROTATION_TIME * 2 + PAUSE_TIME * 2);
      const progress = easeInOut(localTime / ROTATION_TIME);
      targetAngle = Math.PI + progress * Math.PI;
      currentStep = 4;
    } else {
      // 세 번째 쉼: 360° (정지, 다음 사이클 시작) - 3단계 완료
      targetAngle = Math.PI * 2;
      currentStep = 5;
    }

    // 회전 단계 변경 시 파동 발사
    const globalStep = fullCycles * 6 + currentStep;
    if (
      this.lastRotationStep !== undefined &&
      this.lastRotationStep !== globalStep
    ) {
      // 쉼 단계 진입 시 (1, 3, 5) 파동 발사
      if (currentStep === 1) {
        // 1단계 완료: 초록색 파동 (넉백 + 슬로우)
        this.emitRotationWave("green");
      } else if (currentStep === 3) {
        // 2단계 완료: 파란색 파동 (넉백 + 슬로우)
        this.emitRotationWave("blue");
      } else if (currentStep === 5) {
        // 3단계 완료: 혼합색 파동 (데미지)
        this.emitRotationWave("mixed");
      }
    }
    this.lastRotationStep = globalStep;

    // 누적 각도 (계속 돌아감)
    const baseAngle = fullCycles * Math.PI * 2;
    const rotationAngle = baseAngle + targetAngle;

    // 디버그 로그 (매 60프레임마다, 약 1초마다)
    if (!this.conqueredDebugFrame) this.conqueredDebugFrame = 0;
    this.conqueredDebugFrame++;
    if (this.conqueredDebugFrame % 60 === 0) {
      debugLog(
        "ConqueredVisuals",
        `elapsed: ${elapsed.toFixed(2)}s, ` +
          `cycleTime: ${cycleTime.toFixed(2)}s, ` +
          `fullCycles: ${fullCycles}, ` +
          `targetAngle: ${((targetAngle * 180) / Math.PI).toFixed(1)}°, ` +
          `baseAngle: ${((baseAngle * 180) / Math.PI).toFixed(1)}°, ` +
          `rotationAngle: ${((rotationAngle * 180) / Math.PI).toFixed(1)}°`
      );
    }

    // 1. 별 모양 방어막 (두 사각형이 반대 방향으로 회전)
    ctx.save();
    ctx.translate(x, y);

    // 사각형 1: 시계방향 회전
    ctx.save();
    ctx.rotate(rotationAngle);
    ctx.strokeStyle = `rgba(0, 255, 100, 0.6)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    // 사각형 2: 반시계방향 회전 + 45도 기본 오프셋 (별 모양)
    ctx.save();
    const reverseAngle = Math.PI / 4 - rotationAngle; // 역방향
    ctx.rotate(reverseAngle);
    ctx.strokeStyle = `rgba(0, 200, 255, 0.6)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    // 디버그: 회전 각도 확인 (매 프레임마다, 하지만 로그는 60프레임마다)
    if (this.conqueredDebugFrame % 60 === 0) {
      debugLog(
        "ConqueredVisuals",
        `사각형1 회전: ${((rotationAngle * 180) / Math.PI).toFixed(1)}°, ` +
          `사각형2 회전: ${((reverseAngle * 180) / Math.PI).toFixed(1)}°`
      );
    }

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
    ctx.lineTo(20 + Math.sin(elapsed * 3) * 3, -35);
    ctx.lineTo(20 + Math.sin(elapsed * 3 + 1) * 3, -25);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();

    // 깃발 테두리
    ctx.strokeStyle = "#00aa00";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // ===== 아이템 드롭/수집 시스템 =====
  
  /**
   * 바닥에 아이템 생성 (GameManager에서 호출)
   */
  spawnDroppedItem(x, y, item) {
    this.droppedItems.push({
      x,
      y,
      item,
      spawnTime: performance.now(),
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2
    });
    
    // 수집 바이러스 생성
    this.spawnCollectorVirus(x, y);
  }
  
  /**
   * 코어에서 수집 바이러스 생성
   */
  spawnCollectorVirus(targetX, targetY) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 30;
    
    this.collectorViruses.push({
      x: this.core.x + Math.cos(angle) * spawnDist,
      y: this.core.y + Math.sin(angle) * spawnDist,
      vx: 0, // 속도 기반 이동용
      vy: 0,
      targetX,
      targetY,
      speed: 120, // 약간 느리게
      state: "toItem", // toItem -> returning
      carriedItem: null,
      spawnTime: performance.now(),
      wobblePhase: Math.random() * Math.PI * 2, // 흔들림용
      wobbleSpeed: 5 + Math.random() * 3, // 개별 흔들림 속도
      pathOffset: (Math.random() - 0.5) * 40 // 경로 오프셋
    });
  }
  
  /**
   * 수집 바이러스 업데이트 (자연스러운 움직임)
   */
  updateCollectorViruses(dt) {
    for (let i = this.collectorViruses.length - 1; i >= 0; i--) {
      const v = this.collectorViruses[i];
      
      // 흔들림 업데이트
      v.wobblePhase += dt * v.wobbleSpeed;
      
      let targetX, targetY;
      
      if (v.state === "toItem") {
        targetX = v.targetX;
        targetY = v.targetY;
        
        const dist = Math.hypot(targetX - v.x, targetY - v.y);
        
        if (dist < 15) {
          // 아이템 도착 - 픽업
          const droppedItem = this.droppedItems.find(
            d => !d.collected && Math.hypot(d.x - v.x, d.y - v.y) < 25
          );
          
          if (droppedItem) {
            droppedItem.collected = true;
            v.carriedItem = droppedItem.item;
            v.state = "returning";
            // 복귀 시 속도 증가 (신나서 빨리 돌아옴)
            v.speed = 180;
          } else {
            v.state = "returning";
          }
          continue;
        }
      } else if (v.state === "returning") {
        targetX = this.core.x;
        targetY = this.core.y;
        
        const dist = Math.hypot(targetX - v.x, targetY - v.y);
        
        if (dist < 25) {
          // 코어 도착 - 아이템 전달
          if (v.carriedItem && this.onItemCollected) {
            this.onItemCollected(v.carriedItem);
          }
          // 도착 이펙트
          this.createExplosion(v.x, v.y, "#00ff88", 5);
          this.collectorViruses.splice(i, 1);
          continue;
        }
      } else {
        continue;
      }
      
      // 부드러운 가속도 기반 이동 (smoothMoveToward와 유사)
      const dx = targetX - v.x;
      const dy = targetY - v.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 1) {
        // 목표 방향 속도
        const targetVx = (dx / dist) * v.speed;
        const targetVy = (dy / dist) * v.speed;
        
        // 부드러운 가속 (관성)
        const accel = 8;
        v.vx += (targetVx - v.vx) * accel * dt;
        v.vy += (targetVy - v.vy) * accel * dt;
        
        // 지그재그 흔들림 (수직 방향으로)
        const wobbleAmount = Math.sin(v.wobblePhase) * 25;
        const perpAngle = Math.atan2(dy, dx) + Math.PI / 2;
        const wobbleX = Math.cos(perpAngle) * wobbleAmount * dt;
        const wobbleY = Math.sin(perpAngle) * wobbleAmount * dt;
        
        // 위치 업데이트
        v.x += v.vx * dt + wobbleX;
        v.y += v.vy * dt + wobbleY;
      }
    }
    
    // 수집된 아이템 정리
    this.droppedItems = this.droppedItems.filter(d => !d.collected);
  }
  
  /**
   * 바닥 아이템 렌더링
   */
  renderDroppedItems() {
    const ctx = this.ctx;
    const now = performance.now();
    
    this.droppedItems.forEach(d => {
      if (d.collected) return;
      
      const age = (now - d.spawnTime) / 1000;
      const pulse = 1 + Math.sin(d.pulsePhase + age * 4) * 0.15;
      const size = 12 * pulse;
      
      // 등급별 색상
      const colors = {
        common: "#ffffff",
        rare: "#00aaff",
        legendary: "#ffaa00"
      };
      const color = colors[d.item.rarity] || "#ffffff";
      
      // 글로우 효과
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      
      // 아이콘 배경
      ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // 테두리
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 아이콘
      ctx.fillStyle = "#ffffff";
      ctx.font = `${size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(d.item.icon, d.x, d.y);
      
      ctx.restore();
    });
  }
  
  /**
   * 수집 바이러스 렌더링 (자연스러운 시각 효과)
   */
  renderCollectorViruses() {
    const ctx = this.ctx;
    const time = performance.now() / 1000;
    
    this.collectorViruses.forEach(v => {
      const baseSize = 6;
      
      ctx.save();
      
      // 떨림/숨쉬기 효과
      const wobble = Math.sin(time * 5 + v.wobblePhase) * 1.5;
      const breathe = 1 + Math.sin(time * 3 + v.wobblePhase * 2) * 0.1;
      const size = baseSize * breathe;
      
      // 위치 오프셋 (살아있는 느낌)
      const offsetX = wobble * 0.4;
      const offsetY = Math.cos(time * 4 + v.wobblePhase) * 0.8;
      
      const drawX = v.x + offsetX;
      const drawY = v.y + offsetY;
      
      // 이동 방향에 따른 기울임
      const moveAngle = Math.atan2(v.vy || 0, v.vx || 0);
      const speed = Math.hypot(v.vx || 0, v.vy || 0);
      const tilt = (speed / v.speed) * 0.2;
      
      ctx.translate(drawX, drawY);
      ctx.rotate(tilt * Math.sin(moveAngle));
      
      // 그림자 (깊이감)
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(2, 3, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 몸체 - 아이템 들고있으면 더 밝게
      const bodyColor = v.carriedItem ? "#00ff88" : "#88ffcc";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      
      // 테두리
      ctx.strokeStyle = v.carriedItem ? "#00aa55" : "#55aa88";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 눈 (단순 검은 점)
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
      ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // 아이템 들고있으면 머리 위에 표시 (별도 렌더링)
      if (v.carriedItem) {
        ctx.save();
        const floatY = Math.sin(time * 6) * 2;
        
        // 아이템 글로우
        const itemColor = this.getItemRarityColor(v.carriedItem.rarity);
        ctx.shadowColor = itemColor;
        ctx.shadowBlur = 8;
        
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(v.carriedItem.icon, drawX, drawY - 12 + floatY);
        ctx.restore();
      }
    });
  }
  
  /**
   * 아이템 등급별 색상 반환
   */
  getItemRarityColor(rarity) {
    const colors = {
      common: "#ffffff",
      rare: "#00aaff", 
      legendary: "#ffaa00"
    };
    return colors[rarity] || "#ffffff";
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
      // 디버그: 점령 상태 확인 (처음 한 번만)
      if (!this.conqueredRenderLogged) {
        debugLog(
          "DefenseGame",
          "점령 상태 렌더링 시작, isConquered:",
          this.isConquered,
          "conqueredStartTime:",
          this.conqueredStartTime
        );
        this.conqueredRenderLogged = true;
      }
      this.renderConqueredVisuals();
    } else {
      // 점령 상태가 아니면 로그 플래그 리셋
      this.conqueredRenderLogged = false;
    }

    // 0. 배리어 그리기 (부드러운 전환 효과) - 점령 상태가 아닐 때만
    if (!this.isConquered) {
      const shieldRadius = Math.max(0, this.core.shieldRadius);
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

      // 채우기 (ACTIVE일 때만 보임) - shieldRadius가 0보다 클 때만
      if (sv.fillAlpha > 0.01 && shieldRadius > 0) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${sv.fillAlpha})`;
        this.ctx.fill();
      }

      // 테두리 (점선/실선 보간) - shieldRadius가 0보다 클 때만
      if (shieldRadius <= 0) {
        // shieldRadius가 0 이하면 테두리 그리기 스킵
        this.ctx.setLineDash([]);
      } else {
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
      } // else (shieldRadius > 0) 닫기
    }

    // 아군 바이러스 그리기 (타입별 모양 + 생동감) - 배리어 밖
    const time = Date.now() / 1000;
    const isMobile = this.isMobile;

    this.alliedViruses.forEach((v) => {
      this.ctx.save();

      // 모바일: 효과 간소화 / PC: 풀 효과
      if (isMobile) {
        // 모바일: 떨림/숨쉬기 효과 생략, 위치만 적용
        this.ctx.translate(v.x, v.y);
      } else {
        // PC: 약간의 떨림 효과 (살아있는 느낌)
        const wobble = Math.sin(time * 5 + (v.wobblePhase || 0)) * 1.5;
        const breathe =
          1 + Math.sin(time * 3 + (v.wobblePhase || 0) * 2) * 0.08;

        this.ctx.translate(v.x + wobble * 0.3, v.y + wobble * 0.2);
        this.ctx.scale(breathe, breathe);

        // 글로우 효과 (PC만)
        this.ctx.shadowColor = v.color;
        this.ctx.shadowBlur = 8;
      }

      // 타입별 모양
      switch (v.virusType) {
        case "TANK":
          // 육각형 (탱커)
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = Math.cos(angle) * v.radius;
            const py = Math.sin(angle) * v.radius;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
          }
          this.ctx.closePath();
          this.ctx.fill();
          // 테두리
          this.ctx.strokeStyle = "#ffffff44";
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          break;

        case "HUNTER":
          // 삼각형 (사냥꾼) - 이동 방향으로 회전
          const moveAngle = Math.atan2(v.vy || 0, v.vx || 0);
          this.ctx.rotate(moveAngle);
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.moveTo(v.radius, 0);
          this.ctx.lineTo(-v.radius * 0.7, v.radius * 0.6);
          this.ctx.lineTo(-v.radius * 0.7, -v.radius * 0.6);
          this.ctx.closePath();
          this.ctx.fill();
          break;

        case "BOMBER":
          // 원 + 점멸 (폭탄)
          if (!isMobile) {
            const blink = Math.sin(time * 10) > 0 ? 1 : 0.6;
            this.ctx.globalAlpha = blink;
          }
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
          this.ctx.fill();
          // 내부 원
          this.ctx.fillStyle = "#ffff00";
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius * 0.4, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case "HEALER":
          // 십자가 (힐러)
          this.ctx.fillStyle = v.color;
          const armWidth = v.radius * 0.4;
          const armLength = v.radius;
          // 가로
          this.ctx.fillRect(-armLength, -armWidth / 2, armLength * 2, armWidth);
          // 세로
          this.ctx.fillRect(-armWidth / 2, -armLength, armWidth, armLength * 2);
          // 중앙 원
          this.ctx.beginPath();
          this.ctx.arc(0, 0, armWidth * 0.8, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case "SWARM":
        default:
          // 기본 원 (작고 많음)
          this.ctx.fillStyle = v.color;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }
      
      // 눈 그리기 (모든 타입 공통) - 단순 검은 점
      const eyeSize = v.radius * 0.2;
      
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(-v.radius * 0.3, -v.radius * 0.1, eyeSize, 0, Math.PI * 2);
      this.ctx.arc(v.radius * 0.3, -v.radius * 0.1, eyeSize, 0, Math.PI * 2);
      this.ctx.fill();

      // HP 바 (데미지 입으면 표시)
      if (v.hp < v.maxHp) {
        if (!isMobile) this.ctx.shadowBlur = 0; // PC에서만 리셋
        const barWidth = v.radius * 2;
        const barHeight = 2;
        const hpPercent = v.hp / v.maxHp;

        // 배경
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(-barWidth / 2, -v.radius - 6, barWidth, barHeight);
        // HP
        this.ctx.fillStyle =
          hpPercent > 0.5
            ? "#00ff00"
            : hpPercent > 0.25
            ? "#ffff00"
            : "#ff0000";
        this.ctx.fillRect(
          -barWidth / 2,
          -v.radius - 6,
          barWidth * hpPercent,
          barHeight
        );
      }

      this.ctx.restore();
    });

    // 조력자(Helper) 그리기 - 배리어 내부 (0w0 얼굴!)
    if (this.helper && this.helper.x !== 0) {
      const h = this.helper;
      const mode = this.getCurrentWeaponMode();

      // 조력자 몸체 (무기 모드 색상)
      this.ctx.fillStyle = h.color;
      this.ctx.beginPath();
      this.ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // 조력자 테두리
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // 0w0 얼굴 그리기 (12시 방향으로 몰림)
      this.ctx.save();
      this.ctx.translate(h.x, h.y);
      
      // 얼굴 전체를 위로 올림 (12시 방향)
      const faceOffsetY = -h.radius * 0.25;
      
      // 눈 (0 0) - 작은 검은 동그라미
      const eyeRadius = h.radius * 0.12; // 더 작게!
      const eyeY = faceOffsetY - h.radius * 0.1;
      const eyeSpacing = h.radius * 0.3;
      
      // 왼쪽 눈 - 검은색으로 꽉 채움
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(-eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 오른쪽 눈 - 검은색으로 꽉 채움
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 입 (w) - 귀여운 고양이 입
      const mouthY = faceOffsetY + h.radius * 0.2;
      const mouthWidth = h.radius * 0.4;
      
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      // w 모양 그리기
      this.ctx.moveTo(-mouthWidth, mouthY);
      this.ctx.quadraticCurveTo(-mouthWidth * 0.5, mouthY + h.radius * 0.15, 0, mouthY);
      this.ctx.quadraticCurveTo(mouthWidth * 0.5, mouthY + h.radius * 0.15, mouthWidth, mouthY);
      this.ctx.stroke();
      
      this.ctx.restore();

      // ===== 재장전 시각 효과 =====
      if (h.isReloading && mode.hasReload) {
        const reloadRadius = h.radius + 8;
        const progress = h.reloadProgress;

        // 1. 원형 프로그레스 바 (arc)
        this.ctx.beginPath();
        this.ctx.arc(
          h.x,
          h.y,
          reloadRadius,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * progress
        );
        this.ctx.strokeStyle = h.color;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = "round";
        this.ctx.stroke();
        this.ctx.lineCap = "butt";

        // 배경 원 (진행률 표시용)
        this.ctx.beginPath();
        this.ctx.arc(h.x, h.y, reloadRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 2. 글리치 "RELOAD!" 텍스트
        const glitchTime = Date.now();
        const glitchX = (Math.random() - 0.5) * 4;
        const glitchY = (Math.random() - 0.5) * 2;

        this.ctx.save();
        this.ctx.font = "bold 10px monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // RGB 분리 효과
        if (glitchTime % 100 < 50) {
          this.ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
          this.ctx.fillText(
            "RELOAD!",
            h.x + glitchX - 1,
            h.y - h.radius - 15 + glitchY
          );
          this.ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
          this.ctx.fillText(
            "RELOAD!",
            h.x + glitchX + 1,
            h.y - h.radius - 15 + glitchY
          );
        }

        // 메인 텍스트 (깜빡임 효과)
        if (glitchTime % 200 < 150) {
          this.ctx.fillStyle = h.color;
          this.ctx.shadowColor = h.color;
          this.ctx.shadowBlur = 5;
          this.ctx.fillText(
            "RELOAD!",
            h.x + glitchX,
            h.y - h.radius - 15 + glitchY
          );
          this.ctx.shadowBlur = 0;
        }

        // 퍼센트 표시
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 8px monospace";
        this.ctx.fillText(
          `${Math.floor(progress * 100)}%`,
          h.x,
          h.y + h.radius + 12
        );

        this.ctx.restore();
      }

      // 탄약 표시 (재장전 무기만)
      if (mode.hasReload && !h.isReloading) {
        this.ctx.save();
        this.ctx.font = "bold 8px monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(
          `${h.currentAmmo}/${mode.magazineSize}`,
          h.x,
          h.y + h.radius + 12
        );
        this.ctx.restore();
      }
    }

    // 1. 발사체 (랜덤 아스키 문자)
    this.ctx.font = "bold 12px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.projectiles.forEach((p) => {
      // 조력자 발사체는 노란색, 코어 발사체는 초록색
      const color = p.fromHelper ? "#ffff00" : "#00ff00";
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 5;
      this.ctx.fillText(p.char || "*", p.x, p.y);
    });
    this.ctx.shadowBlur = 0;

    // 2. 적
    this.enemies.forEach((e) => {
      this.ctx.fillStyle = "#ff3333";
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();

      const hpPct = Math.max(0, Math.min(1, e.hp / e.maxHp)); // 0~1 클램핑
      this.ctx.fillStyle = "#550000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20, 4);
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(e.x - 10, e.y - 20, 20 * hpPct, 4);
    });

    // 코어 스케일 적용 (원근감 효과)
    const coreScale = this.core.scale || 1;
    const scaledRadius = this.core.radius * coreScale;

    // 코어 시각적 위치 (발사 시 움직임 효과 포함)
    const coreVisualX = this.core.x + (this.core.visualOffsetX || 0);
    const coreVisualY = this.core.y + (this.core.visualOffsetY || 0);
    
    // 탈출 애니메이션 중 투명도 적용
    const coreAlpha = this.core.outroAlpha !== undefined ? this.core.outroAlpha : 1;

    // 3. 코어 및 포탑 (포탑 발사대 삭제) - 시각적 오프셋 적용
    this.ctx.save();
    this.ctx.globalAlpha = coreAlpha;
    this.ctx.translate(coreVisualX, coreVisualY);
    this.ctx.rotate(this.turret.angle);
    // 발사대 그리기 삭제됨
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = coreAlpha;
    this.ctx.beginPath();
    this.ctx.arc(coreVisualX, coreVisualY, scaledRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.core.color;
    this.ctx.fill();
    this.ctx.lineWidth = 3 * coreScale;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.stroke();
    this.ctx.restore();

    // 코어 체력 퍼센트 표시 (코어 아래에 표시)
    if (this.showCoreHP !== false) {
      const hpPercent = Math.round((this.core.hp / this.core.maxHp) * 100);

      // 글리치 오프셋
      const offsetX = this.glitchText ? this.glitchOffset?.x || 0 : 0;
      const offsetY = this.glitchText ? this.glitchOffset?.y || 0 : 0;

      this.ctx.font = `bold ${14 * coreScale}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // 글리치 효과: 색상 분리
      if (this.glitchText) {
        // 빨간색 오프셋
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        this.ctx.fillText(
          `${hpPercent}%`,
          coreVisualX + offsetX - 2,
          coreVisualY + scaledRadius + 20 + offsetY
        );
        // 파란색 오프셋
        this.ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        this.ctx.fillText(
          `${hpPercent}%`,
          coreVisualX + offsetX + 2,
          coreVisualY + scaledRadius + 20 + offsetY
        );
      }

      // 메인 텍스트
      this.ctx.fillStyle = hpPercent > 30 ? "#00ff00" : "#ff3333";
      this.ctx.fillText(
        `${hpPercent}%`,
        coreVisualX + offsetX,
        coreVisualY + scaledRadius + 20 + offsetY
      );
    }

    // 4. 파티클 (글리치 스타일)
    this.ctx.font = "bold 10px monospace";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.particles.forEach((p) => {
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

    // 5. 파동 효과 렌더링
    this.shockwaves.forEach((wave) => {
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = wave.color;
      this.ctx.lineWidth = wave.lineWidth;
      this.ctx.globalAlpha = wave.alpha;
      this.ctx.stroke();

      // 내부 잔상 링
      if (wave.radius > 50) {
        this.ctx.beginPath();
        this.ctx.arc(wave.x, wave.y, wave.radius * 0.7, 0, Math.PI * 2);
        this.ctx.lineWidth = wave.lineWidth * 0.5;
        this.ctx.globalAlpha = wave.alpha * 0.5;
        this.ctx.stroke();
      }

      this.ctx.globalAlpha = 1.0;
    });

    // 6. 스태틱 시각 효과
    this.renderStaticEffects();
    
    // 7. 드롭 아이템 및 수집 바이러스
    this.renderDroppedItems();
    this.renderCollectorViruses();
    
    // 말풍선 렌더링
    this.renderSpeechBubbles();

    // 줌 아웃 스케일 복원
    this.ctx.restore();
  }

  /**
   * 스태틱 시각 효과 렌더링
   */
  renderStaticEffects() {
    const ss = this.staticSystem;
    const se = this.staticEffects;
    const chargeRatio = ss.currentCharge / ss.maxCharge;

    // 1. 충전 게이지 (코어 주변 원형)
    if (chargeRatio > 0) {
      const gaugeRadius = 35;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * chargeRatio;

      // 배경 원
      this.ctx.beginPath();
      this.ctx.arc(this.core.x, this.core.y, gaugeRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = "rgba(100, 100, 0, 0.3)";
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      // 충전량 표시
      this.ctx.beginPath();
      this.ctx.arc(this.core.x, this.core.y, gaugeRadius, startAngle, endAngle);
      const glowIntensity = 0.5 + chargeRatio * 0.5;
      this.ctx.strokeStyle = `rgba(255, 255, 0, ${glowIntensity})`;
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 10 * chargeRatio;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // 2. 스파크 파티클
    se.sparks.forEach((spark) => {
      this.ctx.save();
      this.ctx.globalAlpha = spark.alpha;
      this.ctx.fillStyle = "#ffff00";
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 5;
      this.ctx.beginPath();
      this.ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 3. 체인 라이트닝 라인
    se.chains.forEach((chain) => {
      this.ctx.save();
      this.ctx.globalAlpha = chain.alpha;
      this.ctx.strokeStyle = chain.color;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 15;

      // 지그재그 번개 효과
      this.ctx.beginPath();
      this.ctx.moveTo(chain.x1, chain.y1);

      const segments = 5;
      const dx = (chain.x2 - chain.x1) / segments;
      const dy = (chain.y2 - chain.y1) / segments;

      for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * 20;
        const jitterY = (Math.random() - 0.5) * 20;
        this.ctx.lineTo(
          chain.x1 + dx * i + jitterX,
          chain.y1 + dy * i + jitterY
        );
      }

      this.ctx.lineTo(chain.x2, chain.y2);
      this.ctx.stroke();
      this.ctx.restore();
    });

    // 4. 충전 완료 임박 시 글로우
    if (chargeRatio > 0.8) {
      const pulseAlpha = 0.2 + Math.sin(Date.now() / 100) * 0.1;
      this.ctx.beginPath();
      this.ctx.arc(this.core.x, this.core.y, 40, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 0, ${pulseAlpha})`;
      this.ctx.fill();
    }
  }

  /**
   * 테트리스 줄 클리어 시 파동 효과 적용
   * @param {string} effectType - "knockback_slow", "knockback_damage", "knockback_damage_x3"
   */
  applyWaveEffect(effectType) {
    console.log("[Defense] 파동 효과:", effectType);

    const knockbackDist = 50; // 넉백 거리
    const slowDuration = 2000; // 슬로우 2초
    const damage = 10; // 기본 데미지

    // 파동 시각 효과 추가
    let waveColor = "#0f0";
    if (effectType === "knockback_damage") waveColor = "#ff0";
    if (effectType === "knockback_damage_x3") waveColor = "#f00";

    this.shockwaves.push({
      x: this.core.x,
      y: this.core.y,
      radius: 30,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 1.5,
      speed: 500,
      alpha: 0.9,
      color: waveColor,
      lineWidth: 8,
      damageDealt: false,
    });

    // 모든 적에게 효과 적용 (부드러운 넉백)
    this.enemies.forEach((enemy) => {
      // 효과 타입별 넉백 및 추가 효과
      if (effectType === "knockback_slow") {
        // 넉백 + 슬로우
        this.applyKnockback(enemy, 300, 0.3, 2);
      } else if (effectType === "knockback_damage") {
        // 넉백 + 데미지
        this.applyKnockback(enemy, 300);
        enemy.hp -= damage;
      } else if (effectType === "knockback_damage_x3") {
        // 넉백 + 데미지 3회
        this.applyKnockback(enemy, 350);
        enemy.hp -= damage * 3;

        // 추가 시각 효과: 적 위치에 폭발
        this.createExplosion(enemy.x, enemy.y, "#ff4400", 10);
      }
    });

    // 죽은 적 제거
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) {
        this.createExplosion(
          this.enemies[i].x,
          this.enemies[i].y,
          "#ff0000",
          15
        );
        this.enemies.splice(i, 1);
      }
    }
  }

  spawnEnemy() {
    // Safe Zone에서는 적 소환 안함
    if (this.isSafeZone) {
      console.log("[DEBUG] spawnEnemy blocked - isSafeZone:", this.isSafeZone);
      return;
    }
    console.log("[DEBUG] spawnEnemy called - isSafeZone:", this.isSafeZone);
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;

    const ex = this.core.x + Math.cos(angle) * distance;
    const ey = this.core.y + Math.sin(angle) * distance;

    // 난이도 스케일 계산 (스테이지 기반 동적 계산)
    let difficultyScale;

    // 기본 스탯
    const baseSpeed = 60 + Math.random() * 40; // 60~100
    const baseHp = 10; // 35 → 10 (스폰 수 3배 증가에 맞춰 체력 감소)

    if (this.isReinforcementMode) {
      // 강화 페이지: 스테이지 기반 + 페이지별 증가
      // 스테이지 기본 난이도 + 강화 페이지 보너스
      const stageBase = this.calculateStageBaseDifficulty();
      const reinforcementBonus = 0.5 + (this.reinforcementPage - 1) * 0.3; // 0.5, 0.8, 1.1
      difficultyScale = stageBase + reinforcementBonus;
    } else {
      // 일반 페이지: 스테이지 기본 난이도 + 페이지별 증가
      const stageBase = this.calculateStageBaseDifficulty();
      const pageProgress = (this.currentPage - 1) / (this.stageMaxPages - 1); // 0~1 (첫 페이지부터 마지막 페이지까지)
      // stageDifficultyScale: 페이지당 난이도 증가폭 (예: 1.5 = 페이지가 진행될수록 1.5배씩 증가)
      const pageMultiplier =
        pageProgress * (this.stageDifficultyScale * stageBase * 0.5); // 스테이지별 증가폭 적용
      difficultyScale = stageBase + pageMultiplier;
    }

    this.enemies.push({
      x: ex,
      y: ey,
      radius: 10,
      speed: baseSpeed * difficultyScale,
      hp: Math.floor(baseHp * difficultyScale),
      maxHp: Math.floor(baseHp * difficultyScale),
      damage: 10,
    });
  }

  // Safe Zone 전용: 아군 바이러스 미리 배치
  spawnSafeZoneAllies() {
    console.log("[DEBUG] spawnSafeZoneAllies called - isSafeZone:", this.isSafeZone);
    if (!this.isSafeZone) {
      console.log("[DEBUG] spawnSafeZoneAllies aborted - not Safe Zone");
      return;
    }
    
    // 기존 아군 제거
    this.alliedViruses = [];
    
    // 바이러스 타입 정의 (Safe Zone용)
    const virusTypes = {
      SWARM: { color: "#88ff88", baseHp: 8, baseDamage: 5, baseSpeed: 180, radius: 6, attackType: "melee" },
      TANK: { color: "#ff8800", baseHp: 60, baseDamage: 8, baseSpeed: 80, radius: 12, attackType: "melee", tauntRadius: 150, aggroRadius: 180 },
      HUNTER: { color: "#aa00ff", baseHp: 20, baseDamage: 15, baseSpeed: 110, radius: 8, attackType: "ranged", range: 150, fireRate: 1.5, projectileSpeed: 200 },
      BOMBER: { color: "#ff4444", baseHp: 15, baseDamage: 0, baseSpeed: 150, radius: 9, attackType: "suicide", explosionDamage: 40, explosionRadius: 60 },
      HEALER: { color: "#00ff88", baseHp: 40, baseDamage: 0, baseSpeed: 90, radius: 8, attackType: "support", healAmount: 5, healRadius: 80 }
    };
    
    // 다양한 타입의 아군 배치 (12~18마리로 증가)
    const types = ["SWARM", "SWARM", "SWARM", "TANK", "HUNTER", "HUNTER", "BOMBER", "HEALER", "SWARM", "HUNTER", "SWARM", "BOMBER"];
    const count = 12 + Math.floor(Math.random() * 7); // 12~18마리
    
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const typeData = virusTypes[type];
      
      if (!typeData) continue;
      
      // 코어에서 멀리! 화면 가장자리에 홈 배치
      const margin = 40;
      const screenW = this.canvas.width;
      const screenH = this.canvas.height;
      const coreX = this.core.x;
      const coreY = this.core.y;
      
      // 화면을 4구역으로 나눠서 골고루 배치
      const zone = i % 4; // 0: 좌상, 1: 우상, 2: 좌하, 3: 우하
      let spawnX, spawnY;
      
      switch (zone) {
        case 0: // 좌상단
          spawnX = margin + Math.random() * (screenW * 0.35 - margin);
          spawnY = margin + Math.random() * (screenH * 0.35 - margin);
          break;
        case 1: // 우상단
          spawnX = screenW * 0.65 + Math.random() * (screenW * 0.35 - margin);
          spawnY = margin + Math.random() * (screenH * 0.35 - margin);
          break;
        case 2: // 좌하단
          spawnX = margin + Math.random() * (screenW * 0.35 - margin);
          spawnY = screenH * 0.65 + Math.random() * (screenH * 0.35 - margin);
          break;
        case 3: // 우하단
          spawnX = screenW * 0.65 + Math.random() * (screenW * 0.35 - margin);
          spawnY = screenH * 0.65 + Math.random() * (screenH * 0.35 - margin);
          break;
      }
      
      // 혹시 코어 근처(150px)면 더 밀어내기
      const distFromCore = Math.hypot(spawnX - coreX, spawnY - coreY);
      if (distFromCore < 150) {
        const pushAngle = Math.atan2(spawnY - coreY, spawnX - coreX);
        spawnX = coreX + Math.cos(pushAngle) * 180;
        spawnY = coreY + Math.sin(pushAngle) * 180;
      }
      
      const ally = {
        x: spawnX,
        y: spawnY,
        radius: typeData.radius || 8,
        speed: typeData.baseSpeed || 100,
        hp: typeData.baseHp || 20,
        maxHp: typeData.baseHp || 20,
        baseMaxHp: typeData.baseHp || 20,
        damage: typeData.baseDamage || 10,
        virusType: type, // 렌더링에서 모양 결정에 사용
        color: typeData.color || "#88ff88",
        attackType: typeData.attackType || "melee",
        // 홈 영역 (소프트 앵커) - 스폰 위치가 홈
        homeX: spawnX,
        homeY: spawnY,
        homeRadius: 80 + Math.random() * 60, // 홈 근처 반경 (80~140px)
        // 움직임 관련
        vx: 0,
        vy: 0,
        wobblePhase: Math.random() * Math.PI * 2, // 떨림 효과용
        wanderTargetX: null,
        wanderTargetY: null,
        wanderTimer: 0,
        wanderDuration: 2 + Math.random() * 4,
        isIdle: Math.random() < 0.2, // 20%만 쉬기
        // 타입별 특수 속성
        ...(type === "TANK" && { 
          tauntCooldown: 0, 
          tauntRadius: typeData.tauntRadius || 150,
          aggroRadius: typeData.aggroRadius || 180
        }),
        ...(type === "HUNTER" && { 
          fireRate: typeData.fireRate || 1.5, 
          fireCooldown: 0,
          range: typeData.range || 150,
          projectileSpeed: typeData.projectileSpeed || 200
        }),
        ...(type === "BOMBER" && { 
          explosionDamage: typeData.explosionDamage || 40,
          explosionRadius: typeData.explosionRadius || 60
        }),
        ...(type === "HEALER" && { 
          healAmount: typeData.healAmount || 5,
          healRadius: typeData.healRadius || 80
        }),
        ...(type === "SWARM" && {
          explosionDamage: 3,
          explosionRadius: 20
        })
      };
      
      this.alliedViruses.push(ally);
    }
    
    console.log(`[SafeZone] Spawned ${this.alliedViruses.length} allied viruses`);
  }

  // 스테이지 기본 난이도 계산 (스테이지 ID + difficultyScale 기반)
  calculateStageBaseDifficulty() {
    // 스테이지 ID가 높을수록 기본 난이도 증가
    // Safe Zone (0): 0.5
    // 초반 스테이지 (1-2): 1.0
    // 중반 스테이지 (3-4): 1.5
    // 후반 스테이지 (5-6): 2.0

    let baseDifficulty;
    if (this.currentStageId === 0) {
      baseDifficulty = 0.5; // Safe Zone
    } else if (this.currentStageId <= 2) {
      baseDifficulty = 1.0; // 초반
    } else if (this.currentStageId <= 4) {
      baseDifficulty = 1.5; // 중반
    } else {
      baseDifficulty = 2.0; // 후반 (Boss 포함)
    }

    // StageManager의 difficultyScale 적용 (페이지당 증가폭 조정)
    // difficultyScale이 높을수록 페이지 진행에 따른 난이도 증가가 빠름
    // 하지만 기본 난이도는 스테이지 ID 기반으로 유지
    return baseDifficulty;
  }

  // 조력자(Helper) 업데이트 로직 - 자동 공격 + 회피
  updateHelper(dt, now) {
    const helper = this.helper;
    const shieldRadius = this.core.shieldRadius - 15; // 배리어 내부 여유
    const minDistFromCore = 45; // 코어와 최소 거리 (25 → 45로 증가)

    // 조력자 초기 위치 설정 (첫 프레임)
    if (helper.x === 0 && helper.y === 0) {
      helper.x = this.core.x + 50; // 코어 오른쪽에서 시작 (35 → 50)
      helper.y = this.core.y;
      helper.targetX = helper.x;
      helper.targetY = helper.y;
    }

    // 1. 가장 가까운 적 찾기
    let nearestEnemy = null;
    let minDist = Infinity;
    let enemyInsideShield = null; // 배리어 내부에 들어온 적

    this.enemies.forEach((enemy) => {
      const distToCore = Math.hypot(
        enemy.x - this.core.x,
        enemy.y - this.core.y
      );
      const distToHelper = Math.hypot(enemy.x - helper.x, enemy.y - helper.y);

      // 배리어 내부에 들어온 적 확인
      if (distToCore < this.core.shieldRadius) {
        if (
          !enemyInsideShield ||
          distToHelper <
            Math.hypot(
              enemyInsideShield.x - helper.x,
              enemyInsideShield.y - helper.y
            )
        ) {
          enemyInsideShield = enemy;
        }
      }

      // 사거리 내 가장 가까운 적
      if (distToHelper < helper.range && distToHelper < minDist) {
        minDist = distToHelper;
        nearestEnemy = enemy;
      }
    });

    // 2. 회피 로직 - 적이 배리어 내부에 있으면 회피
    if (enemyInsideShield) {
      const dx = helper.x - enemyInsideShield.x;
      const dy = helper.y - enemyInsideShield.y;
      const dist = Math.hypot(dx, dy);

      if (dist < helper.evadeDistance && dist > 0) {
        // 적 반대 방향으로 회피
        const evadeX = helper.x + (dx / dist) * 40;
        const evadeY = helper.y + (dy / dist) * 40;

        // 배리어 내부 범위 제한 (코어와 거리 유지)
        const evadeDistToCore = Math.hypot(
          evadeX - this.core.x,
          evadeY - this.core.y
        );
        if (
          evadeDistToCore < shieldRadius &&
          evadeDistToCore > minDistFromCore
        ) {
          helper.targetX = evadeX;
          helper.targetY = evadeY;
        } else if (evadeDistToCore <= minDistFromCore) {
          // 코어와 너무 가까우면 바깥쪽으로
          const angle = Math.atan2(evadeY - this.core.y, evadeX - this.core.x);
          helper.targetX =
            this.core.x + Math.cos(angle) * (minDistFromCore + 10);
          helper.targetY =
            this.core.y + Math.sin(angle) * (minDistFromCore + 10);
        } else {
          // 배리어 밖이면 안쪽으로
          const angle = Math.atan2(
            helper.y - this.core.y,
            helper.x - this.core.x
          );
          helper.targetX = this.core.x + Math.cos(angle) * (shieldRadius - 10);
          helper.targetY = this.core.y + Math.sin(angle) * (shieldRadius - 10);
        }
      }
    } else if (nearestEnemy) {
      // 적이 있으면 적 방향으로 살짝 이동 (하지만 배리어 내부에 머무름)
      const angleToEnemy = Math.atan2(
        nearestEnemy.y - this.core.y,
        nearestEnemy.x - this.core.x
      );
      const targetDist = Math.min(shieldRadius - 5, minDistFromCore + 15);
      helper.targetX = this.core.x + Math.cos(angleToEnemy) * targetDist;
      helper.targetY = this.core.y + Math.sin(angleToEnemy) * targetDist;
    } else {
      // 적이 없으면 코어 주변에서 부드럽게 순찰 (회전)
      if (!helper.patrolAngle) helper.patrolAngle = 0;
      helper.patrolAngle += dt * 0.3; // 느리게 회전
      const patrolDist = minDistFromCore + 10;
      helper.targetX = this.core.x + Math.cos(helper.patrolAngle) * patrolDist;
      helper.targetY = this.core.y + Math.sin(helper.patrolAngle) * patrolDist;
    }

    // 3. 목표 위치로 부드럽게 이동 (lerp 방식 - 아군 바이러스와 동일)
    const lerpSpeed = enemyInsideShield ? 3.5 : 1.5; // 회피 시 더 빠르게
    helper.x += (helper.targetX - helper.x) * dt * lerpSpeed;
    helper.y += (helper.targetY - helper.y) * dt * lerpSpeed;

    // 배리어 내부 범위 제한 + 코어와 최소 거리 유지 (부드럽게)
    const distToCore = Math.hypot(
      helper.x - this.core.x,
      helper.y - this.core.y
    );
    const angle = Math.atan2(helper.y - this.core.y, helper.x - this.core.x);

    // 배리어 밖으로 나가면 안쪽으로 (부드럽게)
    if (distToCore > shieldRadius) {
      const clampedX = this.core.x + Math.cos(angle) * shieldRadius;
      const clampedY = this.core.y + Math.sin(angle) * shieldRadius;
      helper.x += (clampedX - helper.x) * dt * 5;
      helper.y += (clampedY - helper.y) * dt * 5;
    }

    // 코어와 너무 가까우면 바깥쪽으로 (부드럽게)
    if (distToCore < minDistFromCore) {
      const pushX = this.core.x + Math.cos(angle) * minDistFromCore;
      const pushY = this.core.y + Math.sin(angle) * minDistFromCore;
      helper.x += (pushX - helper.x) * dt * 5;
      helper.y += (pushY - helper.y) * dt * 5;
    }

    // 4. 자동 발사 (적이 있으면 항상 발사)
    if (nearestEnemy) {
      // 적을 향해 바라보기
      helper.angle = Math.atan2(
        nearestEnemy.y - helper.y,
        nearestEnemy.x - helper.x
      );

      // 발사 간격 체크
      const fireInterval = 1 / helper.fireRate;
      const timeSinceLastFire = now - helper.lastFireTime;

      if (timeSinceLastFire >= fireInterval) {
        debugLog(
          "Helper",
          "발사!",
          "타겟:",
          nearestEnemy.x.toFixed(0),
          nearestEnemy.y.toFixed(0)
        );
        this.fireHelperProjectile(nearestEnemy);
        helper.lastFireTime = now;
      }
    } else if (this.enemies.length > 0) {
      // 적이 있는데 타겟이 없음 - 사거리 밖 (디버그용)
      if (!this._helperNoTargetLogged) {
        const firstEnemy = this.enemies[0];
        const dist = Math.hypot(
          firstEnemy.x - helper.x,
          firstEnemy.y - helper.y
        );
        debugLog(
          "Helper",
          "사거리 밖!",
          "거리:",
          dist.toFixed(0),
          "사거리:",
          helper.range
        );
        this._helperNoTargetLogged = true;
        setTimeout(() => {
          this._helperNoTargetLogged = false;
        }, 3000);
      }
    }
  }

  // 무기 모드 변경
  setWeaponMode(modeName) {
    const mode = this.weaponModes[modeName];
    if (!mode) {
      debugLog("Defense", "Unknown weapon mode:", modeName);
      return;
    }

    this.helper.weaponMode = modeName;
    this.helper.color = mode.color;

    // 기본 스탯 적용 (업그레이드 보너스는 별도 적용)
    this.helper.damage = mode.baseDamage;
    this.helper.fireRate = mode.baseFireRate;
    this.helper.range = mode.baseRange;
    this.helper.projectileSpeed = mode.baseProjectileSpeed;

    // 재장전 시스템 초기화 (모든 무기 탄창 있음)
    const magazineBonus = this.helper.magazineBonus || 0;
    this.helper.currentAmmo = mode.magazineSize + magazineBonus;
    this.helper.isReloading = false;
    this.helper.reloadProgress = 0;

    debugLog(
      "Defense",
      "Weapon mode changed to:",
      modeName,
      "Ammo:",
      this.helper.currentAmmo
    );
  }

  // 현재 무기 모드 정보 반환
  getCurrentWeaponMode() {
    return this.weaponModes[this.helper.weaponMode] || this.weaponModes.NORMAL;
  }

  // 업그레이드 보너스 적용 (무기 모드 기본값 + 보너스)
  applyUpgradeBonus(
    bonusDamage,
    bonusFireRate,
    bonusRange,
    bonusBulletSpeed,
    bonusMagazine = 0
  ) {
    const mode = this.getCurrentWeaponMode();

    this.helper.damage = mode.baseDamage + bonusDamage;
    this.helper.fireRate = mode.baseFireRate + bonusFireRate;
    this.helper.range = mode.baseRange + bonusRange;
    this.helper.projectileSpeed = mode.baseProjectileSpeed + bonusBulletSpeed;
    this.helper.magazineBonus = bonusMagazine; // 탄창 보너스 저장

    debugLog("Defense", "Upgrade bonus applied:", {
      damage: this.helper.damage,
      fireRate: this.helper.fireRate,
      range: this.helper.range,
      projectileSpeed: this.helper.projectileSpeed,
      magazineBonus: bonusMagazine,
    });
  }

  // 조력자 발사체 생성 (무기 모드별 발사 패턴)
  fireHelperProjectile(target) {
    const mode = this.getCurrentWeaponMode();
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    // 재장전 시스템 체크
    if (mode.hasReload) {
      if (this.helper.isReloading) {
        return; // 재장전 중이면 발사 안 함
      }
      if (this.helper.currentAmmo <= 0) {
        this.startReload();
        return;
      }
      this.helper.currentAmmo--;
    }

    const dx = target.x - this.helper.x;
    const dy = target.y - this.helper.y;
    const dist = Math.hypot(dx, dy);
    const baseAngle = Math.atan2(dy, dx);

    const speed = this.helper.projectileSpeed || 400;
    const projectileCount = mode.projectileCount || 1;
    const spreadAngle = mode.spreadAngle || 0;

    // 발사체 생성 (발사 패턴별)
    for (let i = 0; i < projectileCount; i++) {
      let angle = baseAngle;

      // 산탄 패턴 (여러 발)
      if (projectileCount > 1) {
        const spreadOffset =
          (i - (projectileCount - 1) / 2) *
          (spreadAngle / (projectileCount - 1));
        angle = baseAngle + spreadOffset;
      }
      // 탄퍼짐 (단발에도 적용 가능)
      else if (spreadAngle > 0) {
        angle += (Math.random() - 0.5) * spreadAngle;
      }

      const randomChar =
        asciiChars[Math.floor(Math.random() * asciiChars.length)];

      this.projectiles.push({
        x: this.helper.x,
        y: this.helper.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: this.helper.damage,
        life: 2,
        radius: 8,
        char: randomChar,
        color: mode.color,
        fromHelper: true,
        // 폭발 속성
        explosive: mode.explosive || false,
        explosionRadius: mode.explosionRadius || 0,
        // 관통 속성
        piercing: mode.piercing || false,
      });
    }

    // 탄약 부족 시 자동 재장전
    if (mode.hasReload && this.helper.currentAmmo <= 0) {
      this.startReload();
    }
  }

  // 재장전 시작
  startReload() {
    const mode = this.getCurrentWeaponMode();
    if (!mode.hasReload || this.helper.isReloading) return;

    this.helper.isReloading = true;
    this.helper.reloadProgress = 0;
    this.helper.reloadStartTime = performance.now();

    debugLog("Defense", "Reload started:", mode.name);
  }

  // 재장전 업데이트 (update 루프에서 호출)
  updateReload(dt) {
    if (!this.helper.isReloading) return;

    const mode = this.getCurrentWeaponMode();
    if (!mode.hasReload) {
      this.helper.isReloading = false;
      return;
    }

    // Fire Rate가 재장전 속도에 영향 (공식: 실제 시간 = 기본 시간 / (1 + RATE * 0.1))
    const reloadSpeedMultiplier = 1 + this.helper.fireRate * 0.1;
    const calculatedReloadTime = mode.reloadTime / reloadSpeedMultiplier;

    // 무기별 최소 재장전 시간 (SNIPER, LAUNCHER는 1.2초, 나머지 1.0초)
    const minReloadTime =
      mode.name === "SNIPER" || mode.name === "LAUNCHER" ? 1.2 : 1.0;
    const actualReloadTime = Math.max(minReloadTime, calculatedReloadTime);

    const elapsed = (performance.now() - this.helper.reloadStartTime) / 1000;
    this.helper.reloadProgress = Math.min(elapsed / actualReloadTime, 1);

    if (this.helper.reloadProgress >= 1) {
      // 재장전 완료 - 탄창 크기 보너스 적용
      const magazineBonus = this.helper.magazineBonus || 0;
      this.helper.currentAmmo = mode.magazineSize + magazineBonus;
      this.helper.isReloading = false;
      this.helper.reloadProgress = 0;
      debugLog(
        "Defense",
        "Reload complete:",
        mode.name,
        "Ammo:",
        this.helper.currentAmmo
      );
    }
  }

  // 폭발 처리 (LAUNCHER용) - 범위 내 모든 적에게 데미지
  handleExplosion(x, y, radius, damage, color) {
    // 시각 효과: 큰 폭발 파티클
    this.createExplosion(x, y, color || "#ff4400", 25);

    // 파동 효과
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: radius * 1.5,
      speed: 400,
      alpha: 0.9,
      color: color || "#ff4400",
      lineWidth: 5,
      damageDealt: false,
    });

    // 범위 내 모든 적에게 데미지 + 넉백
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Math.hypot(enemy.x - x, enemy.y - y);

      if (dist <= radius) {
        // 거리에 따른 데미지 감소 (중심: 100%, 가장자리: 50%)
        const damageMultiplier = 1 - (dist / radius) * 0.5;
        const actualDamage = Math.floor(damage * damageMultiplier);

        enemy.hp -= actualDamage;

        // 넉백 적용
        this.applyKnockback(enemy, 150, 0.5, 1);

        // 피격 이펙트
        this.createExplosion(enemy.x, enemy.y, "#ff8800", 3);

        // 적 처치
        if (enemy.hp <= 0) {
          this.enemies.splice(i, 1);
          this.createExplosion(enemy.x, enemy.y, "#ff0000", 15);

          const gain = 10;
          this.currentData += gain;
          this.updateResourceDisplay(this.currentData);
          if (this.onResourceGained) this.onResourceGained(gain);
        }
      }
    }

    debugLog(
      "Defense",
      "Explosion at",
      x.toFixed(0),
      y.toFixed(0),
      "radius:",
      radius,
      "damage:",
      damage
    );
  }

  fireProjectile(target) {
    // 랜덤 아스키 문자 (33~126: 출력 가능한 ASCII)
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar =
      asciiChars[Math.floor(Math.random() * asciiChars.length)];

    // 코어가 발사 방향으로 움찔하는 효과
    const recoilDist = 8; // 반동 거리
    this.core.targetOffsetX = Math.cos(this.turret.angle) * recoilDist;
    this.core.targetOffsetY = Math.sin(this.turret.angle) * recoilDist;

    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: target,
      angle: this.turret.angle,
      speed: 400, // 탄속 증가
      damage: this.turret.damage,
      radius: 4,
      life: 2.0,
      char: randomChar, // 랜덤 아스키 문자
    });

    this.createExplosion(
      this.core.x + Math.cos(this.turret.angle) * 40,
      this.core.y + Math.sin(this.turret.angle) * 40,
      "#fff",
      3
    );
  }

  // 방향 지정 발사 (터치/클릭용)
  fireProjectileToward(angle) {
    const asciiChars =
      "!@#$%^&*(){}[]|\\:;<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomChar =
      asciiChars[Math.floor(Math.random() * asciiChars.length)];

    // 코어가 발사 방향으로 움찔하는 효과
    const recoilDist = 8;
    this.core.targetOffsetX = Math.cos(angle) * recoilDist;
    this.core.targetOffsetY = Math.sin(angle) * recoilDist;

    this.projectiles.push({
      x: this.core.x,
      y: this.core.y,
      target: null, // 타겟 없이 방향으로 발사
      angle: angle,
      speed: 400,
      damage: this.turret.damage,
      radius: 4,
      life: 2.0,
      char: randomChar,
    });

    this.createExplosion(
      this.core.x + Math.cos(angle) * 40,
      this.core.y + Math.sin(angle) * 40,
      "#00ff00",
      3
    );
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
      if (
        touchX >= 0 &&
        touchX <= rect.width &&
        touchY >= 0 &&
        touchY <= rect.height
      ) {
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
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy) {
        const angle = Math.atan2(
          closestEnemy.y - this.core.y,
          closestEnemy.x - this.core.x
        );
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

    for (let i = 0; i < actualCount; i++) {
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
        flickerTimer: Math.random() * 0.1, // 깜빡임 타이머
      });
    }
  }

  // 도발 이펙트 (깔끔한 원형 파동)
  createTauntEffect(x, y, radius, color) {
    // 파동 링 효과 (shockwave 사용)
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 10,
      maxRadius: radius,
      speed: 300,
      alpha: 0.8,
      color: color,
      lineWidth: 3,
      isTaunt: true, // 도발 전용
    });

    // 두 번째 파동 (약간 지연)
    setTimeout(() => {
      if (!this.isRunning) return;
      this.shockwaves.push({
        x: x,
        y: y,
        radius: 10,
        maxRadius: radius * 0.7,
        speed: 250,
        alpha: 0.5,
        color: "#ffffff",
        lineWidth: 2,
        isTaunt: true,
      });
    }, 100);

    // 모바일 아니면 추가 이펙트: 작은 파티클들
    if (!this.isMobile) {
      const particleCount = 6;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        this.particles.push({
          x: x + Math.cos(angle) * 20,
          y: y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80,
          life: 0.4,
          maxLife: 0.4,
          alpha: 0.8,
          color: color,
          size: 4,
          char: "●",
        });
      }
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
    return new Promise((resolve) => {
      // 중앙 좌표 저장
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      // 1. 초기화 (모든 요소 완전히 제거)
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      
      console.log("[DEBUG] playIntroAnimation - isSafeZone:", this.isSafeZone, "alliedViruses before:", this.alliedViruses.length);
      
      // Safe Zone에서는 아군 유지 (이미 놀고 있어야 함)
      if (!this.isSafeZone) {
        console.log("[DEBUG] playIntroAnimation - CLEARING alliedViruses (not Safe Zone)");
        this.alliedViruses = [];
      } else {
        console.log("[DEBUG] playIntroAnimation - KEEPING alliedViruses (Safe Zone)");
      }
      
      console.log("[DEBUG] playIntroAnimation - alliedViruses after:", this.alliedViruses.length);
      
      this.droppedItems = [];
      this.collectorViruses = [];
      this.core.shieldRadius = 0;
      this.core.x = centerX;
      this.core.y = centerY;

      // 체력 표시 숨김 (착지 후 글리치로 나타남)
      this.showCoreHP = false;

      // 원근법: 모바일에서는 스케일 제한 (성능 최적화)
      const isMobile = window.innerWidth <= 768;
      const startScale = isMobile ? 20.0 : 50.0; // 모바일: 20x, PC: 50x
      const duration = isMobile ? 250 : 300; // 모바일: 더 빠르게
      const startTime = performance.now();

      this.core.scale = startScale;

      debugLog(
        "Defense",
        `IntroAnimation Starting with scale: ${startScale} (mobile: ${isMobile})`
      );

      const animateDrop = (now) => {
        try {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // ease-in quint (더 급격하게)
          const easeInQuint = (t) => t * t * t * t * t;

          // 스케일: Nx → 1x (급격히)
          this.core.scale =
            startScale - (startScale - 1) * easeInQuint(progress);

          if (progress < 1) {
            requestAnimationFrame(animateDrop);
          } else {
            // 착지!
            this.core.scale = 1;

            // 착지 효과
            this.impactEffect();

            // 글리치 효과로 체력 표시 (예외 처리 추가)
            this.glitchShowHP()
              .then(() => {
                // Safe Zone에서는 이미 아군이 놀고 있으므로 스폰 스킵
                if (this.isSafeZone) {
                  console.log("[DEBUG] playIntroAnimation - SKIPPING spawnAlliesSequentially (Safe Zone)");
                  return Promise.resolve();
                }
                return this.spawnAlliesSequentially();
              })
              .then(() => this.expandShield())
              .then(resolve)
              .catch((err) => {
                console.error("IntroAnimation error:", err);
                resolve(); // 에러 발생해도 진행
              });
          }
        } catch (err) {
          console.error("animateDrop error:", err);
          this.core.scale = 1;
          resolve();
        }
      };

      requestAnimationFrame(animateDrop);
    });
  }

  /**
   * 스테이지 이탈 연출 (카메라 뒤로 지나감)
   * 귀환 시 사용 - 스케일만 커지면서 카메라를 스쳐 지나감
   */
  playOutroAnimation() {
    return new Promise((resolve) => {
      const isMobile = window.innerWidth <= 768;
      const duration = isMobile ? 250 : 300;
      const startTime = performance.now();
      const startScale = 1;
      const endScale = isMobile ? 20.0 : 50.0;

      // 연출 중에는 적 생성 중지
      const originalSpawnRate = this.enemySpawnTimer;
      this.enemySpawnTimer = 99999;
      
      // 코어 숨기기 (애니메이션 중 중앙에 남는 문제 해결)
      this.isOutroPlaying = true;

      const animateAscend = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeInQuint = (t) => t * t * t * t * t;
        const easedProgress = easeInQuint(progress);

        // 스케일 커지면서 투명해짐
        this.core.scale = startScale + (endScale - startScale) * easedProgress;
        this.core.outroAlpha = 1 - easedProgress; // 점점 투명

        if (progress < 1) {
          requestAnimationFrame(animateAscend);
        } else {
          // 완료 - 리셋
          this.core.scale = 1;
          this.core.outroAlpha = 1;
          this.isOutroPlaying = false;
          this.enemySpawnTimer = originalSpawnRate;
          resolve();
        }
      };

      requestAnimationFrame(animateAscend);
    });
  }

  // 착지 충격 효과 (화면 번쩍 + 흔들림 + 충격파 + 사운드)
  impactEffect() {
    // 0. 착지 사운드 (쾅!)
    this.playImpactSound();
    
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
    
    // 4. Safe Zone이면 글리치 텍스트 표시
    if (this.isSafeZone) {
      setTimeout(() => this.showSafeZoneText(), 300);
    }
  }
  
  // 착지 사운드 재생 (Web Audio API)
  playImpactSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // 저주파 충격음 생성
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // 임팩트 사운드 설정 (저음 + 빠른 감쇠)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(80, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      
      // 노이즈 추가 (충격 느낌)
      const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.02));
      }
      
      const noiseSource = audioCtx.createBufferSource();
      const noiseGain = audioCtx.createGain();
      noiseSource.buffer = noiseBuffer;
      noiseSource.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noiseGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      noiseSource.start(audioCtx.currentTime);
    } catch (e) {
      console.log("Audio not supported:", e);
    }
  }
  
  // Safe Zone 글리치 텍스트 표시
  showSafeZoneText() {
    // 글리치 컨테이너 생성
    const container = document.createElement("div");
    container.id = "safezone-text";
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      pointer-events: none;
      font-family: 'Courier New', monospace;
      font-size: 48px;
      font-weight: bold;
      color: #00ff00;
      text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
      opacity: 0;
    `;
    container.textContent = "SAFE ZONE";
    document.body.appendChild(container);
    
    // 글리치 애니메이션
    let glitchCount = 0;
    const maxGlitches = 12;
    
    const glitchInterval = setInterval(() => {
      glitchCount++;
      
      // 글리치 효과: 위치 떨림 + 색상 분리 + 깜빡임
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 10;
      const skewX = (Math.random() - 0.5) * 5;
      
      container.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) skewX(${skewX}deg)`;
      container.style.opacity = Math.random() > 0.3 ? "1" : "0.5";
      
      // 색상 분리 효과 (치직 느낌)
      if (Math.random() > 0.5) {
        container.style.textShadow = `
          ${Math.random() * 5}px 0 #ff0000,
          ${-Math.random() * 5}px 0 #00ffff,
          0 0 10px #00ff00,
          0 0 20px #00ff00
        `;
      } else {
        container.style.textShadow = "0 0 10px #00ff00, 0 0 20px #00ff00";
      }
      
      // 글리치 사운드 (치직)
      if (glitchCount <= 6 && Math.random() > 0.5) {
        this.playGlitchSound();
      }
      
      if (glitchCount >= maxGlitches) {
        clearInterval(glitchInterval);
        // 안정화 후 페이드아웃
        container.style.transform = "translate(-50%, -50%)";
        container.style.textShadow = "0 0 10px #00ff00, 0 0 20px #00ff00";
        container.style.opacity = "1";
        
        setTimeout(() => {
          container.style.transition = "opacity 0.5s";
          container.style.opacity = "0";
          setTimeout(() => container.remove(), 500);
        }, 1000);
      }
    }, 80);
  }
  
  // 글리치 사운드 (치직)
  playGlitchSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // 노이즈 버퍼
      const bufferSize = audioCtx.sampleRate * 0.05;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.5;
      }
      
      const noiseSource = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      
      noiseSource.buffer = noiseBuffer;
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      
      noiseSource.start(audioCtx.currentTime);
    } catch (e) {
      // Audio not supported
    }
  }

  // 글리치 효과로 HP 표시
  glitchShowHP() {
    return new Promise((resolve) => {
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
          y: (Math.random() - 0.5) * 5,
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
    for (let i = 0; i < intensity * 3; i++) {
      this.particles.push({
        x: this.core.x + (Math.random() - 0.5) * 30,
        y: this.core.y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5 - 2,
        life: 0.5,
        maxLife: 0.5,
        alpha: 1,
        color: "#00ffff",
        size: Math.random() * 3 + 1,
      });
    }
  }

  spawnShockwave() {
    // 충격파 파티클 생성 (모바일 최적화)
    const count = this.isMobile ? 8 : 20;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.core.x,
        y: this.core.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0.6,
        maxLife: 0.6,
        alpha: 1,
        color: "#00ffff",
        size: Math.random() * 5 + 2,
      });
    }
  }

  async spawnAlliesSequentially() {
    // 새로운 슬롯 시스템 사용
    if (this.alliedConfig) {
      await this.spawnAlliesWithConfig();
      return;
    }

    // 레거시 시스템 (호환용)
    const count = this.alliedInfo.count;
    debugLog("Defense", "spawnAllies Starting (legacy), count:", count);

    if (!count || count === 0) {
      debugLog("Defense", "spawnAllies - No allies to spawn");
      return;
    }

    // 확실한 초기화
    this.alliedViruses = [];

    const delay = 250; // 0.25초 간격
    const targetRadius = 95; // 최종 위치 (배리어 70 밖: 95)

    for (let i = 0; i < count; i++) {
      const angle = ((Math.PI * 2) / count) * i; // 시계 방향

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
        spawnProgress: 0,
        // 레거시: 기본 근접 타입
        virusType: "SWARM",
        attackType: "melee",
      };

      this.alliedViruses.push(ally);
      debugLog("Defense", "spawnAllies 푝! Ally", i + 1, "of", count);

      // 튀어나오기 애니메이션 (비동기로 실행)
      this.animateAllySpawn(ally, targetRadius, angle);

      // 다음 아군까지 대기
      await new Promise((r) => setTimeout(r, delay));
    }

    debugLog(
      "Defense",
      "spawnAllies Complete! Total:",
      this.alliedViruses.length
    );
  }

  /**
   * 새로운 슬롯 시스템으로 아군 생성
   */
  async spawnAlliesWithConfig() {
    const config = this.alliedConfig;
    if (!config) return;

    const totalCount = config.mainCount + config.subCount;
    debugLog("Defense", "spawnAlliesWithConfig Starting:", config);

    if (totalCount === 0) {
      debugLog("Defense", "spawnAlliesWithConfig - No allies to spawn");
      return;
    }

    this.alliedViruses = [];

    const delay = 200; // 0.2초 간격
    const targetRadius = 95;

    // 메인 타입 바이러스 생성
    for (let i = 0; i < config.mainCount; i++) {
      const angle = ((Math.PI * 2) / totalCount) * i;
      const ally = this.createVirusFromType(
        config.mainType,
        config.mainTypeData,
        angle,
        targetRadius,
        config
      );

      this.alliedViruses.push(ally);
      this.animateAllySpawn(ally, targetRadius, angle);
      await new Promise((r) => setTimeout(r, delay));
    }

    // 서브 타입 바이러스 생성
    if (config.subType && config.subCount > 0) {
      for (let i = 0; i < config.subCount; i++) {
        const angle = ((Math.PI * 2) / totalCount) * (config.mainCount + i);
        const ally = this.createVirusFromType(
          config.subType,
          config.subTypeData,
          angle,
          targetRadius,
          config
        );

        this.alliedViruses.push(ally);
        this.animateAllySpawn(ally, targetRadius, angle);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    debugLog(
      "Defense",
      "spawnAlliesWithConfig Complete! Total:",
      this.alliedViruses.length
    );
  }

  /**
   * 타입 데이터로 바이러스 객체 생성
   */
  createVirusFromType(typeName, typeData, angle, targetRadius, config) {
    // 순수 특화 보너스 적용
    const pureBonus = config.isPureSpecialization ? config.pureBonus : 1.0;

    // 업그레이드 배율 적용
    const hp = Math.floor(typeData.baseHp * config.hpMultiplier * pureBonus);
    const damage = Math.floor(
      typeData.baseDamage * config.damageMultiplier * pureBonus
    );
    const speed = Math.floor(typeData.baseSpeed * config.speedMultiplier);

    return {
      x: this.core.x,
      y: this.core.y,
      targetX: this.core.x + Math.cos(angle) * targetRadius,
      targetY: this.core.y + Math.sin(angle) * targetRadius,
      hp: hp,
      maxHp: hp,
      baseMaxHp: hp, // 시너지용 기본 HP
      damage: damage,
      speed: speed,
      angle: angle,
      radius: typeData.radius,
      color: typeData.color,
      target: null,
      attackTimer: 0,
      spawning: true,
      spawnProgress: 0,

      // 타입 정보
      virusType: typeName,
      attackType: typeData.attackType,

      // 타입별 특수 속성
      special: typeData.special || null,
      range: typeData.range || 0,
      fireRate: typeData.fireRate || 0,
      projectileSpeed: typeData.projectileSpeed || 0,
      explosionDamage: typeData.explosionDamage || 0,
      explosionRadius: typeData.explosionRadius || 0,
      knockbackForce: typeData.knockbackForce || 0,
      healAmount: typeData.healAmount || 0,
      healRadius: typeData.healRadius || 0,

      // TANK 도발 속성
      tauntRadius: typeData.tauntRadius || 0,
      tauntCooldown: typeData.tauntCooldown || 0,
      aggroRadius: typeData.aggroRadius || 0,

      // 리스폰 시간 (config에서)
      respawnTime: config.respawnTime,

      // 시너지 정보
      synergy: config.synergy,
    };
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
        return (
          Math.pow(2, -10 * t) *
            Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) +
          1
        );
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
          const pAngle = ((Math.PI * 2) / particleCount) * p;
          this.particles.push({
            x: ally.x,
            y: ally.y,
            vx: Math.cos(pAngle) * 3,
            vy: Math.sin(pAngle) * 3,
            life: 0.3,
            maxLife: 0.3,
            alpha: 1,
            color: ally.color,
            size: 3,
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
        size: 4,
      });
    }

    requestAnimationFrame(animate);
  }

  expandShield() {
    return new Promise((resolve) => {
      const targetRadius = 70;
      const duration = 300; // 0.3초 (더 빠르게)
      const start = performance.now();

      const animateShield = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);

        // ease-out elastic 효과
        const elastic = (x) =>
          x === 0
            ? 0
            : x === 1
            ? 1
            : Math.pow(2, -10 * x) *
                Math.sin(((x * 10 - 0.75) * (2 * Math.PI)) / 3) +
              1;

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
  
  // === 대사 시스템 ===
  
  /**
   * 대사 JSON 로드
   */
  async loadVirusDialogues() {
    try {
      const response = await fetch('./js/data/virusDialogues.json');
      this.virusDialogues = await response.json();
      console.log('[DefenseGame] Virus dialogues loaded:', Object.keys(this.virusDialogues));
    } catch (e) {
      console.warn('[DefenseGame] Failed to load virus dialogues:', e);
      this.virusDialogues = { battle: [], idle: [], hurt: [], kill: [] };
    }
  }
  
  /**
   * 랜덤 대사 가져오기
   * @param {string} category 대사 카테고리 (battle, idle, hurt, kill, spawn, etc.)
   */
  getRandomDialogue(category) {
    if (!this.virusDialogues || !this.virusDialogues[category]) return null;
    const dialogues = this.virusDialogues[category];
    if (dialogues.length === 0) return null;
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }
  
  /**
   * 말풍선 생성
   * @param {object} virus 바이러스 객체
   * @param {string} text 대사 텍스트
   * @param {number} duration 표시 시간 (ms)
   */
  createSpeechBubble(virus, text, duration = 1500) {
    if (!text) return;
    
    // 이미 말하고 있으면 스킵
    if (virus.isSpeaking) return;
    virus.isSpeaking = true;
    
    const bubble = {
      virus: virus,
      text: text,
      startTime: performance.now(),
      duration: duration,
      opacity: 1
    };
    
    this.activeSpeechBubbles.push(bubble);
    
    // 일정 시간 후 말하기 가능
    setTimeout(() => {
      virus.isSpeaking = false;
    }, duration + 500);
  }
  
  /**
   * 아군 바이러스가 특정 상황에서 대사
   * @param {object} virus 바이러스 객체
   * @param {string} situation 상황 (battle, hurt, kill, idle, spawn)
   * @param {number} chance 확률 (0~1)
   */
  tryVirusSpeech(virus, situation, chance = 0.1) {
    if (Math.random() > chance) return;
    const text = this.getRandomDialogue(situation);
    if (text) {
      this.createSpeechBubble(virus, text);
    }
  }
  
  /**
   * 말풍선 업데이트
   */
  updateSpeechBubbles() {
    const now = performance.now();
    
    // 만료된 말풍선 제거
    this.activeSpeechBubbles = this.activeSpeechBubbles.filter(bubble => {
      const elapsed = now - bubble.startTime;
      if (elapsed > bubble.duration) {
        return false;
      }
      // 페이드아웃
      if (elapsed > bubble.duration - 300) {
        bubble.opacity = 1 - (elapsed - (bubble.duration - 300)) / 300;
      }
      return true;
    });
  }
  
  /**
   * 말풍선 렌더링
   */
  renderSpeechBubbles() {
    const ctx = this.ctx;
    
    this.activeSpeechBubbles.forEach(bubble => {
      const v = bubble.virus;
      if (!v) return;
      
      ctx.save();
      ctx.globalAlpha = bubble.opacity;
      
      // 터미널 스타일 텍스트 (배경 없이 글자만)
      const textY = v.y - v.radius - 15;
      
      // 폰트 크기 키움
      ctx.font = "bold 13px 'VT323', 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // 외곽선 효과 (가독성 - 배경 대신)
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(bubble.text, v.x, textY);
      
      // 초록색 터미널 텍스트
      ctx.fillStyle = "#00ff41";
      ctx.fillText(bubble.text, v.x, textY);
      
      ctx.restore();
    });
  }
}
