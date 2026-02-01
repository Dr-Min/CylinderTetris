import { TerminalUI } from "./TerminalUI.js";
import { TetrisGame } from "./TetrisGame.js";
import { DefenseGame } from "./DefenseGame.js";
import { PerkManager } from "./PerkManager.js";
import { ConquestManager } from "./ConquestManager.js";
import { EquipmentManager } from "./EquipmentManager.js";
import { StageManager } from "./StageManager.js";
import { InventoryManager } from "./InventoryManager.js";
import { ItemDatabase } from "./ItemDatabase.js";
import { BossManager } from "./BossManager.js";
import { MiningManager } from "./MiningManager.js";

// ===== 전역 디버그 로깅 시스템 =====
window.DEBUG_LOG_ENABLED = false; // 전체 디버그 ON/OFF

// 카테고리별 디버그 플래그
window.DEBUG_CATEGORIES = {
  Defense: false,      // 디펜스 게임 일반
  AllyMovement: false, // 아군 바이러스 이동
  Synergy: false,      // 시너지 효과
  Enemy: false,        // 적 스폰/AI
  GameManager: false,  // 게임 매니저
  TerminalUI: false,   // 터미널 UI
  Item: false,         // 아이템 드롭/수집
  Combat: false,       // 전투 데미지 계산
  Conquest: false,     // 점령 모드 디버그
  Canvas: false,       // 캔버스 디스플레이 디버그
  Tetris: false,       // 테트리스 게임 로직
  Helper: false,       // 헬퍼 발사/동작
  SafeZone: false,     // SafeZone 관련
  Recall: false,       // 리콜 기능
  Boss: false,         // 보스 전투
  Mining: false,       // Mining system
};

window.debugLog = function (tag, ...args) {
  if (!window.DEBUG_LOG_ENABLED) return;

  // 카테고리 확인 (정의되지 않은 카테고리는 기본 false)
  const categoryEnabled = window.DEBUG_CATEGORIES[tag] ?? false;
  if (categoryEnabled) {
    console.log(`[${tag}]`, ...args);
  }
};

window.debugWarn = function (tag, ...args) {
  if (!window.DEBUG_LOG_ENABLED) return;

  const categoryEnabled = window.DEBUG_CATEGORIES[tag] ?? false;
  if (categoryEnabled) {
    console.warn(`[${tag}]`, ...args);
  }
};

// 에러는 항상 출력 (디버그 모드 상관없이)
window.debugError = function (tag, ...args) {
  console.error(`[${tag}]`, ...args);
};

// 디버그 토글 헬퍼 함수들 (콘솔에서 사용)
window.enableDebug = function () {
  window.DEBUG_LOG_ENABLED = true;
  console.log("✅ 디버그 로그 활성화됨");
  console.log("현재 활성화된 카테고리:", Object.keys(window.DEBUG_CATEGORIES).filter(k => window.DEBUG_CATEGORIES[k]));
};

window.disableDebug = function () {
  window.DEBUG_LOG_ENABLED = false;
  console.log("❌ 디버그 로그 비활성화됨");
};

window.toggleDebugCategory = function (category, enabled) {
  if (window.DEBUG_CATEGORIES.hasOwnProperty(category)) {
    window.DEBUG_CATEGORIES[category] = enabled;
    console.log(`${enabled ? '✅' : '❌'} [${category}] 디버그 로그 ${enabled ? '활성화' : '비활성화'}`);
  } else {
    console.log(`❌ 카테고리 '${category}'를 찾을 수 없습니다. 사용 가능한 카테고리:`, Object.keys(window.DEBUG_CATEGORIES));
  }
};

window.showDebugCategories = function () {
  console.log("=== 디버그 카테고리 목록 ===");
  console.log("전체 디버그:", window.DEBUG_LOG_ENABLED ? "✅ ON" : "❌ OFF");
  console.log("\n카테고리별 상태:");
  Object.keys(window.DEBUG_CATEGORIES).forEach(cat => {
    const status = window.DEBUG_CATEGORIES[cat] ? "✅ ON" : "❌ OFF";
    console.log(`  ${cat}: ${status}`);
  });
  console.log("\n사용 방법:");
  console.log("  enableDebug() - 전체 디버그 켜기");
  console.log("  disableDebug() - 전체 디버그 끄기");
  console.log("  toggleDebugCategory('Conquest', true) - 특정 카테고리 켜기");
  console.log("  toggleDebugCategory('Canvas', false) - 특정 카테고리 끄기");
};

export class GameManager {
  constructor() {
    this.terminal = new TerminalUI();
    this.tetrisGame = new TetrisGame("game-container");
    this.defenseGame = new DefenseGame("game-container");
    this.perkManager = new PerkManager();
    this.conquestManager = new ConquestManager();
    this.equipmentManager = new EquipmentManager();
    this.stageManager = new StageManager();
    this.inventoryManager = new InventoryManager(); // 인벤토리 매니저 추가
    this.itemDatabase = new ItemDatabase(); // 아이템 데이터베이스
    this.bossManager = new BossManager(); // 보스 매니저 추가
    this.miningManager = new MiningManager(); // 채굴 매니저
    this.defenseGame.miningManager = this.miningManager;
    this.collectedItemsThisStage = []; // 현재 스테이지에서 획득한 아이템들

    // 해금 진행률 (Decryption Progress)
    // 바이러스: TANK, HUNTER, BOMBER, HEALER (SWARM만 기본 해금)
    // 무기: SHOTGUN, SNIPER, RAPID, LAUNCHER (NORMAL만 기본 해금)
    this.decryptionProgress = {}; // { TANK: 45, SNIPER: 10 ... }

    // 해금 대상 분류 (기본 해금 제외)
    this.virusUnlockTargets = ["TANK", "HUNTER", "BOMBER", "HEALER"]; // SWARM 제외
    this.weaponUnlockTargets = ["SHOTGUN", "SNIPER", "RAPID", "LAUNCHER"]; // NORMAL 제외

    // 스테이지별 해금 타겟 (배열 지원 - 한 스테이지에서 여러 개 해금 가능)
    this.stageUnlockTargets = {
      1: ["TANK", "SNIPER"],           // Alpha - 탱커 + 스나이퍼
      2: ["BOMBER"],                    // Beta - 봄버
      4: ["HUNTER", "SHOTGUN"],         // Gamma - 헌터 + 샷건
      5: ["RAPID"],                     // Delta - 래피드
      6: ["HEALER", "LAUNCHER"]         // Boss - 힐러 + 런처
    };

    // 디버그용 아이템 드롭률 (null이면 기본값 사용, 0~1 범위)
    this.debugItemDropRate = null;
    this.debugBlueprintDropRate = null; // 블루프린트 드롭률 (null이면 기본값 사용)
    this.debugBlueprintAmount = null;   // 블루프린트 해금량 (null이면 기본값 사용)

    // 디펜스 게임 이벤트 연결
    this.defenseGame.onResourceGained = (amount) => {
      this.currentMoney += amount;
      this.saveMoney(); // 자동 저장
      this.saveMiningData(); // 채굴 데이터도 저장 (수납장 수집 시)
      // 터미널에 DATA 표시 업데이트
      this.terminal.updateData(this.currentMoney);
    };
    this.defenseGame.onDataUpdate = (amount) => {
      // 터미널에 DATA 표시 업데이트
      this.terminal.updateData(amount);
    };
    this.defenseGame.onGameOver = () => this.handleDefenseGameOver();

    // 점령 이벤트 연결
    this.defenseGame.onConquer = () => this.handleConquest();

    // 점령 가능 상태 시 선택지 갱신
    this.defenseGame.onConquerReady = () => this.refreshCommandMenu();

    // PAGE 업데이트 연결 (터미널에 표시)
    this.defenseGame.onPageUpdate = (text, color) =>
      this.terminal.updatePage(text, color);
    this.terminal.onPageSkip = () => this.defenseGame.skipPageOverlap();

    // 적 처치 시 아이템 드롭 콜백
    this.defenseGame.onEnemyKilled = (x, y) => this.tryItemDrop(x, y, "defense");

    // 아이템 수집 완료 콜백 (수집 바이러스가 코어에 도착했을 때)
    this.defenseGame.onItemCollected = (item) => this.handleItemCollected(item);

    // 아이템 효과 getter 연결
    this.defenseGame.getItemEffects = () => this.inventoryManager.getEquippedEffects();

    // 테트리스 게임 이벤트 연결
    this.tetrisGame.onStageClear = (lines) => this.handleBreachClear(lines);
    this.tetrisGame.onGameOver = (score) => this.handleBreachFail(score);
    this.tetrisGame.onPuzzleFail = () => this.handleBreachFail(0); // 퍼즐 실패도 동일 처리
    this.tetrisGame.onLineCleared = (lineNum) =>
      this.handlePuzzleLineCleared(lineNum);
    this.tetrisGame.getPerkEffects = () => this.perkManager.getEffects();

    // 게임 상태
    this.activeMode = "none"; // 'defense', 'breach'
    this.currentMoney = this.loadSavedMoney(); // localStorage에서 로드
    this.loadMiningData(); // 채굴 데이터 로드
    this.reputation = 0; // Reputation

    // 업그레이드 레벨 추적 (MAX Lv.10)
    this.upgradeLevels = {
      helper: {
        damage: 0, // MAX Lv.10, +2.5/Lv = 최종 +25
        fireRate: 0, // MAX Lv.10, +0.6/Lv = 최종 +6/s
        range: 0, // MAX Lv.10, +20/Lv = 최종 +200
        projectileSpeed: 0, // MAX Lv.10, +50/Lv = 최종 +500
        magazineSize: 0, // MAX Lv.10, 무기별 다름
      },
      core: {
        hp: 0, // MAX Lv.10, +10/Lv = 최종 +100
        turretDamage: 0, // MAX Lv.10, +3/Lv = 최종 +30
        turretRange: 0, // MAX Lv.10, +15/Lv = 최종 +150
        turretSpeed: 0, // MAX Lv.10, +30/Lv = 최종 +300
        fireRate: 0, // MAX Lv.10, +0.5/Lv = 최종 +5/s
        staticDamage: 0, // MAX Lv.10, +5/Lv = 최종 +50
        staticChain: 0, // MAX Lv.10, +1/Lv = 최종 +10 (3→13)
      },
      shield: {
        hp: 0,
      },
      ally: {
        slots: 0, // MAX Lv.10, +1/Lv = 최종 +10 (10→20 슬롯)
        hp: 0, // MAX Lv.10, 전체 바이러스 HP +10%/Lv
        damage: 0, // MAX Lv.10, 전체 바이러스 데미지 +10%/Lv
        speed: 0, // MAX Lv.10, 이동속도 +5%/Lv
        respawn: 0, // MAX Lv.10, 리스폰 시간 -0.15초/Lv
      },
    };

    // 아군 바이러스 타입 설정
    this.allyConfig = {
      mainType: "SWARM", // 메인 타입 (70% 슬롯)
      subType: null, // 서브 타입 (30% 슬롯), null이면 메인만
    };

    // 바이러스 타입 정의 (슬롯 비용 + 기본 스탯)
    this.virusTypes = {
      SWARM: {
        name: "SWARM",
        icon: "🦠",
        color: "#88ff88",
        desc: "수가 많고 빠르지만 약함",
        slotCost: 1, // 1슬롯
        baseHp: 8,
        baseDamage: 5,
        baseSpeed: 180, // 120 → 180 (빠른 무리)
        radius: 6, // 수집 바이러스와 비슷
        attackType: "melee", // 몸통박치기
        special: "explodeOnDeath", // 죽을 때 작은 폭발
        explosionDamage: 3,
        explosionRadius: 20,
      },
      TANK: {
        name: "TANK",
        icon: "🛡️",
        color: "#ff8800",
        desc: "튼튼하고 적을 끌어당김",
        slotCost: 3, // 3슬롯
        baseHp: 60,
        baseDamage: 8,
        baseSpeed: 80, // 40 → 80 (2배)
        radius: 12, // 가장 큼
        attackType: "melee",
        special: "taunt", // 도발 (어그로)
        knockbackForce: 50,
        tauntRadius: 150, // 도발 범위 (확대)
        tauntCooldown: 4, // 도발 쿨타임 (초)
        aggroRadius: 180, // 패시브 어그로 범위 (확대)
      },
      HUNTER: {
        name: "HUNTER",
        icon: "🎯",
        color: "#aa00ff",
        desc: "멀리서 탄환을 발사",
        slotCost: 2, // 2슬롯
        baseHp: 20,
        baseDamage: 15,
        baseSpeed: 110, // 60 → 110 (위치 조정 필요)
        radius: 8, // 중간
        attackType: "ranged", // 원거리
        range: 150,
        fireRate: 1.5, // 1.5초마다 발사
        projectileSpeed: 200,
      },
      BOMBER: {
        name: "BOMBER",
        icon: "💣",
        color: "#ff4444",
        desc: "적에게 돌진 후 자폭",
        slotCost: 2, // 2슬롯
        baseHp: 15,
        baseDamage: 0, // 직접 데미지 없음
        baseSpeed: 150, // 80 → 150 (돌진형은 빨라야!)
        radius: 9, // 중간~큼
        attackType: "suicide", // 자폭
        explosionDamage: 40,
        explosionRadius: 60,
      },
      HEALER: {
        name: "HEALER",
        icon: "💚",
        color: "#00ff88",
        desc: "주변 아군을 치유",
        slotCost: 3, // 3슬롯
        baseHp: 40,
        baseDamage: 0,
        baseSpeed: 90, // 50 → 90 (아군 따라다녀야 함)
        radius: 8, // 중간
        attackType: "support", // 지원형
        healAmount: 5, // 초당 회복량
        healRadius: 80, // 힐 범위
      },
    };

    // 시너지 정의
    this.synergies = {
      "SWARM+TANK": {
        name: "철벽 군단",
        desc: "TANK 주변 SWARM HP +50%",
        effect: "tankProtection",
      },
      "SWARM+HUNTER": {
        name: "사냥꾼의 떼",
        desc: "HUNTER 사망 시 SWARM 2마리 소환",
        effect: "hunterSwarmSpawn",
      },
      "TANK+HUNTER": {
        name: "엄호 사격",
        desc: "HUNTER가 TANK 뒤에 숨음 (피격 -50%)",
        effect: "hunterCover",
      },
      "SWARM+BOMBER": {
        name: "연쇄 폭발",
        desc: "BOMBER 폭발 시 주변 SWARM도 폭발",
        effect: "chainExplosion",
      },
      "TANK+HEALER": {
        name: "불멸의 방패",
        desc: "TANK HP 회복량 2배",
        effect: "tankHealBoost",
      },
      "HUNTER+BOMBER": {
        name: "정밀 폭격",
        desc: "BOMBER 폭발 범위 +30%",
        effect: "bomberRangeBoost",
      },
    };

    // 업그레이드 상한선 정의 (MAX Level)
    this.upgradeMaxLevels = {
      helper: {
        damage: 10,
        fireRate: 10,
        range: 10,
        projectileSpeed: 10,
        magazineSize: 10,
      },
      core: {
        hp: 10,
        turretDamage: 10,
        turretRange: 10,
        turretSpeed: 10,
        fireRate: 10,
        staticDamage: 10,
        staticChain: 10,
      },
      shield: {
        hp: 10,
      },
      ally: {
        slots: 10,
        hp: 10,
        damage: 10,
        speed: 10,
        respawn: 10,
      },
    };

    // === 저장된 데이터 로드 ===
    this.loadUpgrades();   // 업그레이드 레벨 복원
    this.loadAllyConfig(); // 아군 설정 복원
    this.loadDecryptionProgress(); // 해금 진행률 복원

    // 점령 모드 상태
    this.isConquestMode = false;
    this.conquestTetrisComplete = false;
    this.conquestSplitScreen = null;
    this.miniDefenseLoop = null;

    // 영구 퍽 트리 데이터 정의
    this.permTree = [
      // Root (기본 제공)
      {
        id: "root",
        name: "ROOT_ACCESS",
        cost: 0,
        parentId: null,
        maxLevel: 1,
        desc: "System Root Permission",
        effect: {},
      },

      // Branch A: Resources (Start Money)
      {
        id: "res_1",
        name: "Packet_Sniffer.v1",
        cost: 10,
        parentId: "root",
        maxLevel: 5,
        desc: "Start Money +100MB/Lv",
        effect: { startMoney: 100 },
      },
      {
        id: "res_2",
        name: "Data_Mining_Rig.v2",
        cost: 30,
        parentId: "res_1",
        maxLevel: 5,
        desc: "Start Money +200MB/Lv",
        effect: { startMoney: 200 },
      },
      {
        id: "res_3",
        name: "Botnet_Wallet.v3",
        cost: 60,
        parentId: "res_2",
        maxLevel: 5,
        desc: "Start Money +300MB/Lv",
        effect: { startMoney: 300 },
      },

      // Branch B: Efficiency (Score Multiplier)
      {
        id: "eff_1",
        name: "Score_Injector.dll",
        cost: 20,
        parentId: "root",
        maxLevel: 5,
        desc: "Score +10%/Lv",
        effect: { scoreMult: 0.1 },
      },
      {
        id: "eff_2",
        name: "Combo_Breaker.exe",
        cost: 50,
        parentId: "eff_1",
        maxLevel: 5,
        desc: "Score +15%/Lv",
        effect: { scoreMult: 0.15 },
      },
      {
        id: "eff_3",
        name: "Global_Leaderboard.hack",
        cost: 100,
        parentId: "eff_2",
        maxLevel: 5,
        desc: "Score +25%/Lv",
        effect: { scoreMult: 0.25 },
      },

      // Branch C: Luck (Special Blocks)
      {
        id: "luck_1",
        name: "RNG_Manipulator.init",
        cost: 40,
        parentId: "root",
        maxLevel: 5,
        desc: "Luck +2%/Lv",
        effect: { luck: 0.02 },
      },
      {
        id: "luck_2",
        name: "Probability_Drive.sys",
        cost: 80,
        parentId: "luck_1",
        maxLevel: 5,
        desc: "Luck +3% & Discount 5%/Lv",
        effect: { luck: 0.03, discount: 0.05 },
      },
    ];

    this.acquiredPermPerks = new Map();
    this.acquiredPermPerks.set("root", 1); // 기본 루트 해금 (Level 1)

    // 디버그 모드 초기화
    this.initDebugSystem();

    // 설정 패널 초기화
    this.initSettingPanel();
  }

  initDebugSystem() {
    // 디버그 패널 생성
    const debugPanel = document.createElement("div");
    debugPanel.id = "debug-panel";
    debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0, 20, 0, 0.95);
      border: 1px solid #0f0;
      color: #0f0;
      font-family: 'Courier New', monospace;
      padding: 15px;
      z-index: 10000;
      display: none;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    `;

    const title = document.createElement("h3");
    title.innerText = "=== DEBUG_MODE ===";
    title.style.margin = "0 0 5px 0";
    title.style.borderBottom = "1px solid #0f0";
    title.style.textAlign = "center";
    debugPanel.appendChild(title);

    // 버전 정보
    const versionInfo = document.createElement("div");
    versionInfo.innerText = "v9.22.3";
    versionInfo.style.cssText = `
      text-align: center;
      color: #888;
      font-size: 11px;
      margin-bottom: 15px;
    `;
    debugPanel.appendChild(versionInfo);

    // 🛡️ GOD MODE 토글 (무적)
    const godModeContainer = document.createElement("div");
    godModeContainer.style.cssText = `
      margin: 10px 0 15px 0;
      padding: 10px;
      border: 2px solid #ff0000;
      background: rgba(50, 0, 0, 0.5);
      text-align: center;
    `;

    const godModeLabel = document.createElement("label");
    godModeLabel.style.cssText = "color: #ff0000; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;";

    const godModeCheckbox = document.createElement("input");
    godModeCheckbox.type = "checkbox";
    godModeCheckbox.id = "dbg-god-mode";
    godModeCheckbox.checked = false;
    godModeCheckbox.style.cssText = "width: 20px; height: 20px; accent-color: #ff0000; cursor: pointer;";
    godModeCheckbox.onchange = (e) => {
      const enabled = e.target.checked;
      if (this.defenseGame) {
        this.defenseGame.isGodMode = enabled;
      }
      godModeLabel.style.color = enabled ? "#00ff00" : "#ff0000";
      godModeContainer.style.borderColor = enabled ? "#00ff00" : "#ff0000";
      this.terminal.printSystemMessage(`[DEBUG] GOD MODE: ${enabled ? "ON - 무적 활성화!" : "OFF"}`);
    };

    godModeLabel.appendChild(godModeCheckbox);
    godModeLabel.appendChild(document.createTextNode("🛡️ GOD MODE (무적)"));
    godModeContainer.appendChild(godModeLabel);
    debugPanel.appendChild(godModeContainer);

    const createInput = (label, id, value, type = "number", step = 0.01) => {
      const container = document.createElement("div");
      container.style.marginBottom = "10px";
      container.style.display = "flex";
      container.style.justifyContent = "space-between";
      container.style.alignItems = "center";

      const lbl = document.createElement("label");
      lbl.innerText = label;
      lbl.htmlFor = id;

      const inp = document.createElement("input");
      inp.id = id;
      inp.type = type;
      inp.value = value;
      inp.step = step;
      inp.style.width = "80px";
      inp.style.background = "#000";
      inp.style.color = "#0f0";
      inp.style.border = "1px solid #0f0";

      container.appendChild(lbl);
      container.appendChild(inp);
      debugPanel.appendChild(container);
      return inp;
    };

    // --- Inputs ---
    // 1. Current Money (Data)
    const moneyInp = createInput(
      "Data (Money)",
      "dbg-money",
      this.currentMoney,
      "number",
      100
    );
    moneyInp.onchange = (e) => {
      this.currentMoney = parseInt(e.target.value);
      this.terminal.printSystemMessage(
        `[DEBUG] Money set to ${e.target.value}`
      );
    };

    // 2. Score Multiplier
    const scoreInp = createInput(
      "Score Mult",
      "dbg-score",
      this.perkManager.activeEffects.scoreMultiplier
    );
    scoreInp.onchange = (e) => {
      this.perkManager.activeEffects.scoreMultiplier = parseFloat(
        e.target.value
      );
      this.terminal.printSystemMessage(
        `[DEBUG] Score Mult set to ${e.target.value}`
      );
    };

    // 3. 아이템 드롭률 조절
    const dropRateContainer = document.createElement("div");
    dropRateContainer.style.cssText = `
      margin: 15px 0;
      padding: 10px;
      border: 1px solid #ffaa00;
      background: rgba(50, 30, 0, 0.5);
    `;

    const dropRateTitle = document.createElement("div");
    dropRateTitle.style.cssText = "color: #ffaa00; margin-bottom: 8px; font-weight: bold;";
    dropRateTitle.innerText = "📦 ITEM DROP RATE";
    dropRateContainer.appendChild(dropRateTitle);

    const dropRateRow = document.createElement("div");
    dropRateRow.style.cssText = "display: flex; align-items: center; gap: 10px;";

    const dropRateSlider = document.createElement("input");
    dropRateSlider.type = "range";
    dropRateSlider.id = "dbg-drop-rate";
    dropRateSlider.min = "0";
    dropRateSlider.max = "100";
    dropRateSlider.value = "5"; // 기본 5%
    dropRateSlider.style.cssText = "flex: 1; accent-color: #ffaa00;";

    const dropRateValue = document.createElement("span");
    dropRateValue.id = "dbg-drop-rate-value";
    dropRateValue.style.cssText = "color: #ffaa00; min-width: 45px; text-align: right;";
    dropRateValue.innerText = "5%";

    dropRateSlider.oninput = (e) => {
      const val = parseInt(e.target.value);
      dropRateValue.innerText = `${val}%`;
      this.debugItemDropRate = val / 100;
      this.terminal.printSystemMessage(`[DEBUG] Item Drop Rate: ${val}%`);
    };

    dropRateRow.appendChild(dropRateSlider);
    dropRateRow.appendChild(dropRateValue);
    dropRateContainer.appendChild(dropRateRow);

    // 100% 드롭 버튼
    const dropTestBtns = document.createElement("div");
    dropTestBtns.style.cssText = "display: flex; gap: 5px; margin-top: 8px;";

    const btn100 = document.createElement("button");
    btn100.innerText = "100%";
    btn100.style.cssText = "flex:1; background:#553300; color:#ffaa00; border:1px solid #ffaa00; cursor:pointer; padding:3px;";
    btn100.onclick = () => {
      dropRateSlider.value = "100";
      dropRateValue.innerText = "100%";
      this.debugItemDropRate = 1.0;
      this.terminal.printSystemMessage("[DEBUG] Item Drop Rate: 100%");
    };

    const btn50 = document.createElement("button");
    btn50.innerText = "50%";
    btn50.style.cssText = "flex:1; background:#553300; color:#ffaa00; border:1px solid #ffaa00; cursor:pointer; padding:3px;";
    btn50.onclick = () => {
      dropRateSlider.value = "50";
      dropRateValue.innerText = "50%";
      this.debugItemDropRate = 0.5;
      this.terminal.printSystemMessage("[DEBUG] Item Drop Rate: 50%");
    };

    const btnReset = document.createElement("button");
    btnReset.innerText = "기본값";
    btnReset.style.cssText = "flex:1; background:#333; color:#0f0; border:1px solid #0f0; cursor:pointer; padding:3px;";
    btnReset.onclick = () => {
      dropRateSlider.value = "5";
      dropRateValue.innerText = "5%";
      this.debugItemDropRate = null; // null = 기본값 사용
      this.terminal.printSystemMessage("[DEBUG] Item Drop Rate: DEFAULT (5%)");
    };

    dropTestBtns.appendChild(btn100);
    dropTestBtns.appendChild(btn50);
    dropTestBtns.appendChild(btnReset);
    dropRateContainer.appendChild(dropTestBtns);

    debugPanel.appendChild(dropRateContainer);

    // 4. 블루프린트(해금) 드롭률 조절
    const blueprintContainer = document.createElement("div");
    blueprintContainer.style.cssText = `
      margin: 15px 0;
      padding: 10px;
      border: 1px solid #00ffff;
      background: rgba(0, 30, 50, 0.5);
    `;

    const blueprintTitle = document.createElement("div");
    blueprintTitle.style.cssText = "color: #00ffff; margin-bottom: 8px; font-weight: bold;";
    blueprintTitle.innerText = "🔓 BLUEPRINT DROP";
    blueprintContainer.appendChild(blueprintTitle);

    // 블루프린트 드롭률 슬라이더
    const bpDropRow = document.createElement("div");
    bpDropRow.style.cssText = "display: flex; align-items: center; gap: 10px; margin-bottom: 8px;";

    const bpDropLabel = document.createElement("span");
    bpDropLabel.style.cssText = "color: #aaa; font-size: 11px; min-width: 60px;";
    bpDropLabel.innerText = "드롭률:";

    const bpDropSlider = document.createElement("input");
    bpDropSlider.type = "range";
    bpDropSlider.min = "0";
    bpDropSlider.max = "100";
    bpDropSlider.value = "10";
    bpDropSlider.style.cssText = "flex: 1; accent-color: #00ffff;";

    const bpDropValue = document.createElement("span");
    bpDropValue.style.cssText = "color: #00ffff; min-width: 45px; text-align: right;";
    bpDropValue.innerText = "10%";

    // 디버그용 블루프린트 드롭률 변수 초기화
    this.debugBlueprintDropRate = null;

    bpDropSlider.oninput = (e) => {
      const val = parseInt(e.target.value);
      bpDropValue.innerText = `${val}%`;
      this.debugBlueprintDropRate = val / 100;
      this.terminal.printSystemMessage(`[DEBUG] Blueprint Drop Rate: ${val}%`);
    };

    bpDropRow.appendChild(bpDropLabel);
    bpDropRow.appendChild(bpDropSlider);
    bpDropRow.appendChild(bpDropValue);
    blueprintContainer.appendChild(bpDropRow);

    // 진행률 증가량 슬라이더
    const bpAmountRow = document.createElement("div");
    bpAmountRow.style.cssText = "display: flex; align-items: center; gap: 10px; margin-bottom: 8px;";

    const bpAmountLabel = document.createElement("span");
    bpAmountLabel.style.cssText = "color: #aaa; font-size: 11px; min-width: 60px;";
    bpAmountLabel.innerText = "증가량:";

    const bpAmountSlider = document.createElement("input");
    bpAmountSlider.type = "range";
    bpAmountSlider.min = "1";
    bpAmountSlider.max = "50";
    bpAmountSlider.value = "3";
    bpAmountSlider.style.cssText = "flex: 1; accent-color: #00ffff;";

    const bpAmountValue = document.createElement("span");
    bpAmountValue.style.cssText = "color: #00ffff; min-width: 45px; text-align: right;";
    bpAmountValue.innerText = "+3%";

    this.debugBlueprintAmount = null;

    bpAmountSlider.oninput = (e) => {
      const val = parseInt(e.target.value);
      bpAmountValue.innerText = `+${val}%`;
      this.debugBlueprintAmount = val;
      this.terminal.printSystemMessage(`[DEBUG] Blueprint Amount: +${val}%`);
    };

    bpAmountRow.appendChild(bpAmountLabel);
    bpAmountRow.appendChild(bpAmountSlider);
    bpAmountRow.appendChild(bpAmountValue);
    blueprintContainer.appendChild(bpAmountRow);

    // 퀵 버튼들
    const bpBtns = document.createElement("div");
    bpBtns.style.cssText = "display: flex; gap: 5px;";

    const bpBtn100 = document.createElement("button");
    bpBtn100.innerText = "100%/+50";
    bpBtn100.style.cssText = "flex:1; background:#003344; color:#00ffff; border:1px solid #00ffff; cursor:pointer; padding:3px; font-size:10px;";
    bpBtn100.onclick = () => {
      bpDropSlider.value = "100";
      bpDropValue.innerText = "100%";
      bpAmountSlider.value = "50";
      bpAmountValue.innerText = "+50%";
      this.debugBlueprintDropRate = 1.0;
      this.debugBlueprintAmount = 50;
      this.terminal.printSystemMessage("[DEBUG] Blueprint: 100% drop, +50% per drop");
    };

    const bpBtnReset = document.createElement("button");
    bpBtnReset.innerText = "기본값";
    bpBtnReset.style.cssText = "flex:1; background:#333; color:#0f0; border:1px solid #0f0; cursor:pointer; padding:3px; font-size:10px;";
    bpBtnReset.onclick = () => {
      bpDropSlider.value = "10";
      bpDropValue.innerText = "10%";
      bpAmountSlider.value = "3";
      bpAmountValue.innerText = "+3%";
      this.debugBlueprintDropRate = null;
      this.debugBlueprintAmount = null;
      this.terminal.printSystemMessage("[DEBUG] Blueprint: DEFAULT (10%, +1~10%)");
    };

    bpBtns.appendChild(bpBtn100);
    bpBtns.appendChild(bpBtnReset);
    blueprintContainer.appendChild(bpBtns);

    // 현재 진행률 표시
    const progressDisplay = document.createElement("div");
    progressDisplay.id = "dbg-blueprint-progress";
    progressDisplay.style.cssText = "margin-top: 10px; font-size: 10px; color: #888; max-height: 80px; overflow-y: auto;";
    progressDisplay.innerHTML = "<div>진행률: (게임 시작 후 표시)</div>";
    blueprintContainer.appendChild(progressDisplay);

    // 진행률 갱신 버튼
    const refreshBtn = document.createElement("button");
    refreshBtn.innerText = "🔄 진행률 확인";
    refreshBtn.style.cssText = "width:100%; margin-top:5px; background:#002233; color:#00ffff; border:1px solid #00ffff; cursor:pointer; padding:3px; font-size:10px;";
    refreshBtn.onclick = () => {
      const allTargets = [...this.virusUnlockTargets, ...this.weaponUnlockTargets];
      let html = "";
      allTargets.forEach(t => {
        const prog = this.decryptionProgress[t] || 0;
        const unlocked = prog >= 100;
        const color = unlocked ? "#00ff00" : "#00ffff";
        const status = unlocked ? "✓" : `${prog}%`;
        html += `<div style="color:${color}">${t}: ${status}</div>`;
      });
      progressDisplay.innerHTML = html || "<div>없음</div>";
    };
    blueprintContainer.appendChild(refreshBtn);

    debugPanel.appendChild(blueprintContainer);

    // ===== 콘솔 로그 시스템 =====
    const logSection = document.createElement("div");
    logSection.style.cssText = `
      margin: 15px 0;
      padding: 10px;
      border: 1px dashed #0f0;
    `;

    // 메인 토글 (전체 ON/OFF)
    const mainToggleRow = document.createElement("div");
    mainToggleRow.style.cssText = "display:flex; align-items:center; gap:10px; margin-bottom:10px;";

    const logToggleCheckbox = document.createElement("input");
    logToggleCheckbox.type = "checkbox";
    logToggleCheckbox.id = "dbg-console-log";
    logToggleCheckbox.checked = window.DEBUG_LOG_ENABLED;
    logToggleCheckbox.style.cssText = "width:18px; height:18px; accent-color:#0f0; cursor:pointer;";
    logToggleCheckbox.onchange = (e) => {
      window.DEBUG_LOG_ENABLED = e.target.checked;
      const status = e.target.checked ? "ON" : "OFF";
      this.terminal.printSystemMessage(`[DEBUG] Console Logs: ${status}`);
      console.log(`[DEBUG] Console logging ${status}`);
      // 카테고리 패널 표시/숨기기
      categoryPanel.style.display = e.target.checked ? "block" : "none";
    };

    const logToggleLabel = document.createElement("label");
    logToggleLabel.htmlFor = "dbg-console-log";
    logToggleLabel.innerText = "📋 Console Logs";
    logToggleLabel.style.cssText = "cursor:pointer; font-weight:bold;";

    mainToggleRow.appendChild(logToggleCheckbox);
    mainToggleRow.appendChild(logToggleLabel);
    logSection.appendChild(mainToggleRow);

    // 카테고리별 체크박스 패널 (접혀있음)
    const categoryPanel = document.createElement("div");
    categoryPanel.style.cssText = `
      display: ${window.DEBUG_LOG_ENABLED ? "block" : "none"};
      margin-top: 10px;
      padding: 8px;
      background: rgba(0,50,0,0.5);
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    `;

    // 카테고리 정의 (이름, 설명)
    const categories = [
      { key: "Defense", label: "🛡️ 디펜스 일반" },
      { key: "AllyMovement", label: "🦠 아군 이동" },
      { key: "Synergy", label: "⚡ 시너지 효과" },
      { key: "Enemy", label: "👾 적 스폰/AI" },
      { key: "Helper", label: "🤖 헬퍼" },
      { key: "SafeZone", label: "🏠 SafeZone" },
      { key: "GameManager", label: "🎮 게임 매니저" },
      { key: "TerminalUI", label: "💻 터미널 UI" },
      { key: "Item", label: "📦 아이템" },
      { key: "Combat", label: "⚔️ 전투 계산" },
      { key: "Tetris", label: "🧩 테트리스" },
      { key: "Conquest", label: "🚩 점령 모드" },
      { key: "Canvas", label: "🖼️ 캔버스" },
      { key: "Recall", label: "🔙 리콜" },
      { key: "Boss", label: "👹 보스" },
    ];
    categories.push({ key: "Mining", label: "Mining" });

    categories.forEach(({ key, label }) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; align-items:center; gap:8px; margin:4px 0;";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = `dbg-cat-${key}`;
      cb.checked = window.DEBUG_CATEGORIES[key] ?? true;
      cb.style.cssText = "width:14px; height:14px; accent-color:#0f0; cursor:pointer;";
      cb.onchange = (e) => {
        window.DEBUG_CATEGORIES[key] = e.target.checked;
        console.log(`[DEBUG] Category '${key}': ${e.target.checked ? "ON" : "OFF"}`);
      };

      const lbl = document.createElement("label");
      lbl.htmlFor = `dbg-cat-${key}`;
      lbl.innerText = label;
      lbl.style.cssText = "cursor:pointer; font-size:12px;";

      row.appendChild(cb);
      row.appendChild(lbl);
      categoryPanel.appendChild(row);
    });

    // 전체 켜기/끄기 버튼
    const allBtns = document.createElement("div");
    allBtns.style.cssText = "display:flex; gap:5px; margin-top:8px;";

    const allOnBtn = document.createElement("button");
    allOnBtn.innerText = "전체 ON";
    allOnBtn.style.cssText = "flex:1; background:#003300; color:#0f0; border:1px solid #0f0; cursor:pointer; padding:3px; font-size:11px;";
    allOnBtn.onclick = () => {
      categories.forEach(({ key }) => {
        window.DEBUG_CATEGORIES[key] = true;
        document.getElementById(`dbg-cat-${key}`).checked = true;
      });
      console.log("[DEBUG] All categories ON");
    };

    const allOffBtn = document.createElement("button");
    allOffBtn.innerText = "전체 OFF";
    allOffBtn.style.cssText = "flex:1; background:#330000; color:#f00; border:1px solid #f00; cursor:pointer; padding:3px; font-size:11px;";
    allOffBtn.onclick = () => {
      categories.forEach(({ key }) => {
        window.DEBUG_CATEGORIES[key] = false;
        document.getElementById(`dbg-cat-${key}`).checked = false;
      });
      console.log("[DEBUG] All categories OFF");
    };

    allBtns.appendChild(allOnBtn);
    allBtns.appendChild(allOffBtn);
    categoryPanel.appendChild(allBtns);

    logSection.appendChild(categoryPanel);
    debugPanel.appendChild(logSection);

    // Buttons Container
    const btnContainer = document.createElement("div");
    btnContainer.style.marginTop = "15px";
    btnContainer.style.display = "flex";
    btnContainer.style.gap = "5px";
    btnContainer.style.flexWrap = "wrap";
    debugPanel.appendChild(btnContainer);

    const createBtn = (text, onClick) => {
      const btn = document.createElement("button");
      btn.innerText = text;
      btn.style.background = "#003300";
      btn.style.color = "#0f0";
      btn.style.border = "1px solid #0f0";
      btn.style.cursor = "pointer";
      btn.style.padding = "5px";
      btn.style.flex = "1";
      btn.onclick = onClick;
      btnContainer.appendChild(btn);
    };

    createBtn("Skip Mining", () => {
      if (this.activeMode === "mining") {
        this.tetrisGame.stageClear(); // Force clear
        this.terminal.printSystemMessage("[DEBUG] Mining Skipped");
      }
    });

    createBtn("Switch Mode", () => {
      if (this.activeMode === "mining") {
        this.switchMode("defense");
      } else {
        this.switchMode("mining");
      }
      this.terminal.printSystemMessage(
        `[DEBUG] Switched to ${this.activeMode}`
      );
    });

    createBtn("GOD MODE", () => {
      this.perkManager.activeEffects.speedModifier = 0.5;
      this.perkManager.activeEffects.scoreMultiplier = 5.0;
      this.currentMoney = 99999;
      moneyInp.value = 99999;
      scoreInp.value = 5.0;
      this.isGodMode = true;
      if (this.defenseGame) {
        this.defenseGame.isGodMode = true;
      }
      this.terminal.printSystemMessage(
        "[DEBUG] GOD MODE ACTIVATED - 무적 모드!"
      );
    });

    createBtn("MAX PAGE", () => {
      if (this.defenseGame && !this.defenseGame.isSafeZone) {
        const maxPages = this.defenseGame.maxPages || 12;
        this.defenseGame.currentPage = maxPages;
        this.defenseGame.conquerReady = true;
        this.defenseGame.updateWaveDisplay();
        // 터미널에 PAGE 업데이트
        this.terminal.updatePage("∞ READY", "#ff3333");
        this.terminal.printSystemMessage(
          "[DEBUG] Skipped to MAX PAGE - CONQUER READY!"
        );

        // 선택지 다시 표시 (점령 옵션 포함)
        setTimeout(() => this.showCommandMenu(), 500);
      } else {
        this.terminal.printSystemMessage("[DEBUG] Not in conquest stage!");
      }
    });

    // 진행상황 초기화 버튼 (위험!)
    const resetContainer = document.createElement("div");
    resetContainer.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      border: 2px solid #ff3333;
      background: rgba(50, 0, 0, 0.5);
    `;

    const resetLabel = document.createElement("div");
    resetLabel.innerText = "⚠️ DANGER ZONE";
    resetLabel.style.cssText = `
      color: #ff3333;
      font-weight: bold;
      margin-bottom: 10px;
      text-align: center;
    `;
    resetContainer.appendChild(resetLabel);

    const resetBtn = document.createElement("button");
    resetBtn.innerText = "🗑️ RESET ALL PROGRESS";
    resetBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #330000;
      color: #ff3333;
      border: 1px solid #ff3333;
      cursor: pointer;
      font-weight: bold;
    `;
    resetBtn.onclick = () => {
      if (
        confirm(
          "⚠️ 정말로 모든 진행상황을 초기화하시겠습니까?\n\n- 점령한 스테이지\n- 저장된 데이터(돈)\n- 튜토리얼 완료 상태\n\n이 작업은 되돌릴 수 없습니다!"
        )
      ) {
        // 모든 localStorage 초기화
        localStorage.clear();

        // StageManager 점령 상태 초기화
        if (this.stageManager) {
          this.stageManager.stages.forEach((stage) => {
            stage.conquered = false;
          });
        }

        // ConquestManager 초기화
        if (this.conquestManager) {
          this.conquestManager.conqueredStages = [];
        }

        // 현재 상태 초기화
        this.currentMoney = 0;
        this.reputation = 0;

        this.terminal.printSystemMessage("[DEBUG] ALL PROGRESS RESET!");
        this.terminal.printSystemMessage("Reloading page in 2 seconds...");

        // 2초 후 새로고침
        setTimeout(() => {
          location.reload();
        }, 2000);
      }
    };
    resetContainer.appendChild(resetBtn);
    debugPanel.appendChild(resetContainer);

    document.body.appendChild(debugPanel);

    // Toggle Key (Backtick `)
    document.addEventListener("keydown", (e) => {
      if (e.key === "`" || e.key === "~") {
        const isHidden = debugPanel.style.display === "none";
        debugPanel.style.display = isHidden ? "block" : "none";

        // Refresh inputs values when opening
        if (isHidden) {
          moneyInp.value = this.currentMoney;
          scoreInp.value = this.perkManager.activeEffects.scoreMultiplier;
        }
      }
    });

    console.log("Debug System Initialized. Press '`' to toggle.");
  }

  /**
   * 설정 패널 초기화 (/setting 명령어)
   */
  initSettingPanel() {
    const settingPanel = document.createElement("div");
    settingPanel.id = "setting-panel";
    settingPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      background: rgba(0, 10, 0, 0.98);
      border: 2px solid #00ff00;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      padding: 20px;
      z-index: 10001;
      display: none;
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
    `;

    // 제목
    const title = document.createElement("h3");
    title.innerText = "=== SETTINGS ===";
    title.style.cssText = `
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #00ff00;
      text-align: center;
      letter-spacing: 3px;
    `;
    settingPanel.appendChild(title);

    // === BGM 볼륨 섹션 ===
    const bgmSection = document.createElement("div");
    bgmSection.style.cssText = `
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #00aa00;
      background: rgba(0, 30, 0, 0.5);
    `;

    const bgmLabel = document.createElement("div");
    bgmLabel.style.cssText = "margin-bottom: 12px; font-weight: bold; font-size: 14px;";
    bgmLabel.innerText = "🎵 BGM VOLUME";
    bgmSection.appendChild(bgmLabel);

    // 슬라이더 행
    const sliderRow = document.createElement("div");
    sliderRow.style.cssText = "display: flex; align-items: center; gap: 12px;";

    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.id = "setting-bgm-volume";
    volumeSlider.min = "0";
    volumeSlider.max = "100";
    // 저장된 볼륨 불러오기
    const savedVolume = localStorage.getItem('bgmVolume');
    volumeSlider.value = savedVolume !== null ? Math.round(parseFloat(savedVolume) * 100) : 100;
    volumeSlider.style.cssText = "flex: 1; accent-color: #00ff00; cursor: pointer;";

    const volumeValue = document.createElement("span");
    volumeValue.id = "setting-bgm-value";
    volumeValue.style.cssText = "min-width: 50px; text-align: right; font-size: 16px;";
    volumeValue.innerText = `${volumeSlider.value}%`;

    volumeSlider.oninput = (e) => {
      const val = parseInt(e.target.value);
      volumeValue.innerText = `${val}%`;
      // BGMManager에 볼륨 적용
      if (this.defenseGame && this.defenseGame.bgmManager) {
        this.defenseGame.bgmManager.setVolume(val / 100);
      }
    };

    sliderRow.appendChild(volumeSlider);
    sliderRow.appendChild(volumeValue);
    bgmSection.appendChild(sliderRow);

    // 프리셋 버튼
    const presetRow = document.createElement("div");
    presetRow.style.cssText = "display: flex; gap: 8px; margin-top: 12px;";

    const presets = [
      { label: "MUTE", value: 0 },
      { label: "50%", value: 50 },
      { label: "100%", value: 100 }
    ];

    presets.forEach(({ label, value }) => {
      const btn = document.createElement("button");
      btn.innerText = label;
      btn.style.cssText = `
        flex: 1;
        padding: 8px;
        background: ${value === 0 ? '#330000' : '#003300'};
        color: ${value === 0 ? '#ff3333' : '#00ff00'};
        border: 1px solid ${value === 0 ? '#ff3333' : '#00ff00'};
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
      `;
      btn.onclick = () => {
        volumeSlider.value = value;
        volumeValue.innerText = `${value}%`;
        if (this.defenseGame && this.defenseGame.bgmManager) {
          this.defenseGame.bgmManager.setVolume(value / 100);
        }
      };
      presetRow.appendChild(btn);
    });

    bgmSection.appendChild(presetRow);
    settingPanel.appendChild(bgmSection);

    // === 닫기 버튼 ===
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "[ CLOSE ]";
    closeBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      margin-top: 10px;
      background: transparent;
      color: #00ff00;
      border: 1px solid #00ff00;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      letter-spacing: 2px;
    `;
    closeBtn.onclick = () => {
      settingPanel.style.display = "none";
    };
    settingPanel.appendChild(closeBtn);

    // ESC 키로 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && settingPanel.style.display !== "none") {
        settingPanel.style.display = "none";
      }
    });

    document.body.appendChild(settingPanel);
    console.log("Setting Panel Initialized. Type '/setting' to open.");
  }

  /**
   * BGM 토글 버튼 설정
   */
  setupBGMButton() {
    const bgmBtn = document.getElementById("bgm-btn");
    if (!bgmBtn) return;

    // 초기 상태 (뮤트 아님)
    bgmBtn.innerHTML = "BGM<br/>ON";
    bgmBtn.style.color = "#33ff00";
    bgmBtn.style.borderColor = "#33ff00";

    bgmBtn.addEventListener("click", () => {
      const isOn = this.defenseGame.toggleBGM();

      if (isOn) {
        bgmBtn.innerHTML = "BGM<br/>ON";
        bgmBtn.style.color = "#33ff00";
        bgmBtn.style.borderColor = "#33ff00";
      } else {
        bgmBtn.innerHTML = "BGM<br/>OFF";
        bgmBtn.style.color = "#ff3333";
        bgmBtn.style.borderColor = "#ff3333";
      }
    });
  }

  async init() {
    this.loadReputation();
    this.tetrisGame.init(); // 3D 씬 로드 (항상 로드해둠)

    // BGM 버튼 핸들러 설정
    this.setupBGMButton();

    // [DEV] 튜토리얼 스킵 (개발 중 비활성화)
    localStorage.setItem("tutorial_completed", "true");

    const tutorialCompleted = localStorage.getItem("tutorial_completed");
    if (tutorialCompleted) {
      this.loadPermanentPerks();

      this.terminal.show();
      await this.terminal.typeText("System Reloaded.", 20);
      await this.terminal.typeText("Initiating Defense Protocol...", 20);
      await new Promise((r) => setTimeout(r, 500));

      // 바로 게임 시작 (평판 시스템 스킵)
      this.switchMode("defense");
    } else {
      await this.startIntro();
    }
  }

  async switchMode(mode) {
    debugLog("GameManager", `Switching mode: ${this.activeMode} -> ${mode}`);
    this.activeMode = mode;

    if (mode === "defense") {
      // 1. 테트리스 정지 및 Three.js 캔버스 완전 숨김
      this.tetrisGame.state.isPlaying = false;
      document.getElementById("game-ui").style.display = "none";
      document.getElementById("game-container").style.display = "none"; // Three.js 캔버스 숨김

      // 2. 터미널 UI 조정 (디펜스 모드용)
      this.terminal.setDefenseMode(true); // 배경 투명 + 클릭 가능
      this.terminal.show(); // 터미널 메시지창 활성화 (로그용)
      await this.terminal.printSystemMessage("DEFENSE_PROTOCOL_INITIATED");

      // 3. 아군 바이러스 정보 업데이트 (playIntroAnimation 전에!)
      const alliedInfo = this.conquestManager.getAlliedInfo();
      this.defenseGame.updateAlliedInfo(alliedInfo);
      this.defenseGame.updateAlliedConfig(this.getAllyConfiguration());

      // 4. 기존 아군 제거 후 게임 시작
      this.defenseGame.alliedViruses = [];

      // Ensure stage settings are applied before starting
      const initialStage = this.stageManager.getCurrentStage();
      if (initialStage) {
        this.applyStageSettings(initialStage);
      }

      this.defenseGame.start(); // start()로 게임 시작!

      // Safe Zone이면 아군 바이러스 배치
      if (this.defenseGame.isSafeZone) {
        debugLog("GameManager", "Calling spawnSafeZoneAllies from switchMode");
        this.defenseGame.spawnSafeZoneAllies();
      }

      // 5. 코어 드랍 연출
      await this.defenseGame.playIntroAnimation();

      // [추가] 자원 UI 동기화
      this.defenseGame.updateResourceDisplay(this.currentMoney);

      // 장비 효과 적용
      const stats = this.equipmentManager.getTotalStats();
      this.defenseGame.turret.damage = 10 + stats.damage;

      // 터미널 명령어 옵션 표시
      await this.terminal.printSystemMessage(
        "System Idle. Ready for Operations."
      );
      await this.showCommandMenu();
    } else if (mode === "breach") {
      // 1. 디펜스 정지 및 숨김
      this.defenseGame.stop();

      // 2. 터미널 및 UI 조정
      this.terminal.setTransparentMode(true);
      await this.terminal.printSystemMessage("BREACH_PROTOCOL_INITIATED");
      await this.terminal.printSystemMessage(
        "Objective: Clear lines to acquire Equipment."
      );

      // 3. 테트리스 시작 (장비 획득 목표)
      this.startBreachMode();
    }
  }

  /**
   * 터미널 명령어 메뉴 표시
   */
  async showCommandMenu() {
    const currentStage = this.stageManager.getCurrentStage();

    // 최대 페이지 도달 시 점령 옵션 추가
    const isConquerReady =
      this.defenseGame &&
      !this.defenseGame.isSafeZone &&
      this.defenseGame.currentPage >= (this.defenseGame.maxPages || 12);

    const choices = [
      { text: "/map (Open Stage Map)", value: "map" },
      { text: "/inventory (Equipment & Items)", value: "inventory" },
      { text: "/upgrade (System Upgrades)", value: "upgrade" },
      { text: "/reset (Reset All Progress)", value: "reset", style: "danger" },
    ];

    // 점령 가능 시 빨간색 큰 선택지 추가
    if (isConquerReady) {
      choices.unshift({
        text: ">>> CONQUER THIS SECTOR <<<",
        value: "conquer",
        style: "conquer", // 특별 스타일
      });
    }

    // 안전지역이 아닐 때 귀환 옵션 추가
    if (this.defenseGame && !this.defenseGame.isSafeZone) {
      const shieldHp = this.defenseGame.core?.shieldHp || 0;
      const canRecall = shieldHp > 0;
      choices.push({
        text: canRecall
          ? `/recall (Return to Safe Zone) [Shield: ${shieldHp}]`
          : `/recall (UNAVAILABLE - No Shield)`,
        value: "recall",
        style: canRecall ? "warning" : "disabled",
      });
    }

    const choice = await this.terminal.showChoices(choices);

    if (choice === "conquer") {
      await this.handleConquerFromTerminal();
    } else if (choice === "map") {
      await this.showMap();
    } else if (choice === "inventory") {
      await this.showInventory();
    } else if (choice === "upgrade") {
      await this.showUpgrades();
    } else if (choice === "reset") {
      await this.handleResetProgress();
    } else if (choice === "recall") {
      await this.handleRecall();
    }
  }

  /**
   * 귀환 기능 - Safe Zone으로 복귀
   * 조건: 실드 > 0, 5초 캐스팅 (피격 시 취소)
   */
  async handleRecall() {
    const shieldHp = this.defenseGame.core?.shieldHp || 0;

    // 실드 체크
    if (shieldHp <= 0) {
      await this.terminal.printSystemMessage("⚠️ RECALL FAILED: Shield required!");
      await this.terminal.printSystemMessage("You need at least 1 Shield HP to recall.");
      await this.showCommandMenu();
      return;
    }

    await this.terminal.printSystemMessage("🏃 INITIATING RECALL...");
    await this.terminal.printSystemMessage("Stay alive for 5 seconds!");

    // 캐스팅 시작
    const recallSuccess = await this.startRecallCasting(5000);

    if (recallSuccess) {
      debugLog("Recall", "1. 탈출 애니메이션 시작");

      // 귀환 성공 - 위로 올라가는 연출
      await this.defenseGame.playOutroAnimation();

      debugLog("Recall", "2. 애니메이션 완료 - 게임 중지");

      // 게임 중지 (렌더링 멈춤)
      this.defenseGame.stop();

      await this.terminal.printSystemMessage("✅ RECALL COMPLETE!");
      await this.terminal.printSystemMessage("Returning to Safe Zone...");

      debugLog("Recall", "3. 아이템 선택 화면");

      // 획득 아이템 선택 화면 표시
      await this.showLootSummary();

      debugLog("Recall", "4. Safe Zone으로 이동");

      // Safe Zone (스테이지 0)으로 이동 (드랍 연출 포함)
      await this.moveToStage(0);

      debugLog("Recall", "5. 완료");
    } else {
      // 귀환 실패 (피격으로 취소됨)
      await this.terminal.printSystemMessage("❌ RECALL INTERRUPTED!");
      await this.terminal.printSystemMessage("You took damage during recall.");
      await this.showCommandMenu();
    }
  }

  /**
   * 귀환 캐스팅 - 5초 동안 피격 감지 (테두리 효과 UI)
   * @param {number} duration 캐스팅 시간 (ms)
   * @returns {Promise<boolean>} 성공 여부
   */
  startRecallCasting(duration) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const startShieldHp = this.defenseGame.core?.shieldHp || 0;
      const startCoreHp = this.defenseGame.core?.hp || 0;

      // 테두리 효과 컨테이너
      const borderContainer = document.createElement("div");
      borderContainer.id = "recall-border-effect";
      borderContainer.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        z-index: 99998;
      `;

      // 4개의 테두리 (상, 하, 좌, 우)
      const borders = {
        top: document.createElement("div"),
        bottom: document.createElement("div"),
        left: document.createElement("div"),
        right: document.createElement("div")
      };

      const borderThickness = 8;
      const glowColor = "0, 170, 255"; // 기본 파란색

      borders.top.style.cssText = `
        position: absolute; top: 0; left: 0; right: 0;
        height: ${borderThickness}px;
        background: linear-gradient(90deg, transparent, rgba(${glowColor}, 0.8), transparent);
        box-shadow: 0 0 20px rgba(${glowColor}, 0.8), inset 0 0 10px rgba(${glowColor}, 0.5);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.1s linear;
      `;

      borders.bottom.style.cssText = `
        position: absolute; bottom: 0; left: 0; right: 0;
        height: ${borderThickness}px;
        background: linear-gradient(90deg, transparent, rgba(${glowColor}, 0.8), transparent);
        box-shadow: 0 0 20px rgba(${glowColor}, 0.8), inset 0 0 10px rgba(${glowColor}, 0.5);
        transform: scaleX(0);
        transform-origin: right;
        transition: transform 0.1s linear;
      `;

      borders.left.style.cssText = `
        position: absolute; top: 0; left: 0; bottom: 0;
        width: ${borderThickness}px;
        background: linear-gradient(180deg, transparent, rgba(${glowColor}, 0.8), transparent);
        box-shadow: 0 0 20px rgba(${glowColor}, 0.8), inset 0 0 10px rgba(${glowColor}, 0.5);
        transform: scaleY(0);
        transform-origin: bottom;
        transition: transform 0.1s linear;
      `;

      borders.right.style.cssText = `
        position: absolute; top: 0; right: 0; bottom: 0;
        width: ${borderThickness}px;
        background: linear-gradient(180deg, transparent, rgba(${glowColor}, 0.8), transparent);
        box-shadow: 0 0 20px rgba(${glowColor}, 0.8), inset 0 0 10px rgba(${glowColor}, 0.5);
        transform: scaleY(0);
        transform-origin: top;
        transition: transform 0.1s linear;
      `;

      Object.values(borders).forEach(b => borderContainer.appendChild(b));

      // 코어 위에 정보 표시 (두 줄 레이아웃)
      const infoBar = document.createElement("div");
      infoBar.style.cssText = `
        position: fixed;
        top: 35%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid #00aaff;
        padding: 10px 20px;
        font-family: var(--term-font);
        color: #00aaff;
        font-size: 13px;
        z-index: 99999;
        text-align: center;
        box-shadow: 0 0 15px rgba(0, 170, 255, 0.5);
        border-radius: 6px;
      `;
      infoBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>🏃 RECALL</span>
          <span id="recall-time" style="font-size: 16px; font-weight: bold;">5.0s</span>
        </div>
        <div style="color: #ff6666; font-size: 11px; margin-top: 4px;">⚠️ 피격 시 취소</div>
      `;

      borderContainer.appendChild(infoBar);
      document.body.appendChild(borderContainer);

      const timeDisplay = infoBar.querySelector("#recall-time");

      // 캐스팅 업데이트 인터벌
      const updateInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const progress = Math.min(1, elapsed / duration);

        // 테두리 점점 채우기 (4방향 동시에)
        borders.top.style.transform = `scaleX(${progress})`;
        borders.bottom.style.transform = `scaleX(${progress})`;
        borders.left.style.transform = `scaleY(${progress})`;
        borders.right.style.transform = `scaleY(${progress})`;

        // 시간 표시 업데이트
        timeDisplay.textContent = `${(remaining / 1000).toFixed(1)}s`;

        // 피격 감지 (실드 또는 코어 HP 감소)
        const currentShieldHp = this.defenseGame.core?.shieldHp || 0;
        const currentCoreHp = this.defenseGame.core?.hp || 0;

        if (currentShieldHp < startShieldHp || currentCoreHp < startCoreHp) {
          // 피격됨 - 캐스팅 취소
          clearInterval(updateInterval);

          // 빨간색으로 변경
          const redGlow = "255, 68, 68";
          Object.values(borders).forEach(b => {
            b.style.background = `linear-gradient(90deg, transparent, rgba(${redGlow}, 0.8), transparent)`;
            b.style.boxShadow = `0 0 30px rgba(${redGlow}, 1)`;
          });
          infoBar.style.borderColor = "#ff4444";
          infoBar.style.boxShadow = "0 0 30px rgba(255, 68, 68, 0.8)";
          infoBar.innerHTML = `
            <div style="color: #ff4444; font-size: 20px;">❌ INTERRUPTED!</div>
            <div style="color: #ff6666; font-size: 12px; margin-top: 5px;">피격으로 귀환 취소됨</div>
          `;

          setTimeout(() => {
            borderContainer.remove();
            resolve(false);
          }, 800);
          return;
        }

        // 캐스팅 완료
        if (elapsed >= duration) {
          clearInterval(updateInterval);

          // 초록색으로 변경
          const greenGlow = "0, 255, 0";
          Object.values(borders).forEach(b => {
            b.style.background = `linear-gradient(90deg, transparent, rgba(${greenGlow}, 0.8), transparent)`;
            b.style.boxShadow = `0 0 30px rgba(${greenGlow}, 1)`;
          });
          infoBar.style.borderColor = "#00ff00";
          infoBar.style.boxShadow = "0 0 30px rgba(0, 255, 0, 0.8)";
          infoBar.innerHTML = `
            <div style="color: #00ff00; font-size: 20px;">✅ RECALL COMPLETE!</div>
            <div style="color: #88ff88; font-size: 12px; margin-top: 5px;">안전지역으로 이동 중...</div>
          `;

          setTimeout(() => {
            borderContainer.remove();
            resolve(true);
          }, 800);
        }
      }, 100);
    });
  }

  /**
   * 특정 스테이지로 이동
   * @param {number} stageId 스테이지 ID
   */
  async moveToStage(stageId) {
    const stage = this.stageManager.getStage(stageId);
    if (!stage) {
      console.error(`Stage ${stageId} not found!`);
      return;
    }

    // 스테이지 이동 (StageManager에서 현재 스테이지 업데이트)
    this.stageManager.currentStageId = stageId;
    this.stageManager.saveState();

    // 기존 아군 제거 (applyStageSettings에서 재스폰하므로 먼저 초기화)
    this.defenseGame.alliedViruses = [];

    this.applyStageSettings(stage);

    // 디펜스 게임 설정 적용
    this.defenseGame.isSafeZone = stage.type === "safe";
    this.defenseGame.safeZoneSpawnRate = stage.spawnRate || 2;

    // 보스전 모드 설정
    if (stage.type === "boss") {
      this.startBossFight();
    } else {
      this.endBossFight();
    }

    // 아군 정보 업데이트 (playIntroAnimation 전에!)
    const alliedInfo = this.conquestManager.getAlliedInfo();
    this.defenseGame.updateAlliedInfo(alliedInfo);
    this.defenseGame.updateAlliedConfig(this.getAllyConfiguration());

    // Safe Zone이면 아군 바이러스 미리 배치
    debugLog("GameManager", "moveToStage - stage.type:", stage.type, "isSafeZone:", this.defenseGame.isSafeZone);
    if (stage.type === "safe") {
      debugLog("GameManager", "Calling spawnSafeZoneAllies from moveToStage");
      this.defenseGame.spawnSafeZoneAllies();
    }

    // 채굴 시스템: 씬 전환 알림 (마이너 스폰)
    if (stage.conquered && stage.type === "conquest") {
      this.miningManager.registerTerritory(stageId);
      this.saveMiningData();
    }
    this.miningManager.onSceneChange(
      stageId,
      stage.type === "safe",
      this.defenseGame.canvas,
      this.defenseGame.core,
      !!stage.conquered
    );

    this.defenseGame.resume();

    // 드랍 연출과 함께 시작 (await으로 완료 대기)
    await this.defenseGame.playIntroAnimation();

    await this.terminal.printSystemMessage(`Arrived at: ${stage.name}`);
    await this.showCommandMenu();
  }

  /**
   * 진행상황 초기화 처리
   */
  async handleResetProgress() {
    // 확인 메시지 표시
    await this.terminal.printSystemMessage(
      "⚠️ WARNING: This will reset ALL progress!"
    );
    await this.terminal.printSystemMessage("- Conquered stages");
    await this.terminal.printSystemMessage("- Saved DATA (money)");
    await this.terminal.printSystemMessage("- Tutorial completion");

    const confirmChoice = await this.terminal.showChoices([
      { text: "YES - Delete everything", value: "confirm", style: "danger" },
      { text: "NO - Cancel", value: "cancel" },
    ]);

    if (confirmChoice === "confirm") {
      // 모든 localStorage 초기화
      localStorage.clear();

      // StageManager 점령 상태 초기화
      if (this.stageManager) {
        this.stageManager.stages.forEach((stage) => {
          stage.conquered = false;
        });
      }

      // ConquestManager 초기화
      if (this.conquestManager) {
        this.conquestManager.conqueredStages = [];
      }

      // MiningManager 초기화
      if (this.miningManager) {
        this.miningManager.territories = {};
        this.miningManager.cabinet.storedData = 0;
      }

      // 현재 상태 초기화
      this.currentMoney = 0;
      this.reputation = 0;

      await this.terminal.printSystemMessage("ALL PROGRESS RESET!");
      await this.terminal.printSystemMessage(
        "Reloading system in 2 seconds..."
      );

      // 2초 후 새로고침
      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      await this.terminal.printSystemMessage("Reset cancelled.");
      await this.showCommandMenu();
    }
  }

  // 선택지 강제 갱신 (점령 가능 상태 변경 시)
  async refreshCommandMenu() {
    // 현재 선택지 영역 숨기기
    this.terminal.choiceArea.classList.add("hidden");
    this.terminal.inputLine.classList.add("hidden");

    // 알림 메시지
    await this.terminal.printSystemMessage("!!! CONQUER READY !!!");

    // 새 선택지 표시
    await this.showCommandMenu();
  }

  // 터미널에서 점령 선택 시
  async handleConquerFromTerminal() {
    // 1. 점령 시작 메시지
    await this.terminal.printSystemMessage("INITIATING CONQUEST PROTOCOL...");

    // 2. 실드 파괴 연출 완료 후 테트리스 시작 (콜백 설정)
    this.defenseGame.onConquer = () => {
      // 연출 완료 후 실행
      this.terminal.printSystemMessage("FIREWALL BREACH DETECTED!");
      this.terminal.printSystemMessage(
        "Objective: Clear 3 lines + Survive 3 waves."
      );

      // 강화 페이지 모드 설정
      this.isConquestMode = true;
      this.conquestTetrisComplete = false;
      this.defenseGame.startReinforcementMode(3); // 강화 페이지 3개

      // 테트리스 시작
      this.startConquestTetris();
    };

    // 3. 실드 파괴 연출 시작 (2초 후 onConquer 콜백 호출)
    this.defenseGame.handleConquerClick();
  }

  // 점령용 테트리스 시작 (디펜스는 미니 화면에서 계속)
  startConquestTetris() {
    debugLog("Conquest", "=== startConquestTetris 시작 ===");
    const targetLines = 3;
    const speed = 500;

    // 테트리스 상단 UI 숨기기 (Mining Rate, DATA MINED 등)
    this.hideConquestTetrisUI();

    // NEXT 블록 위치 변경 (왼쪽 하단으로)
    const nextBox = document.querySelector(".next-box");
    if (nextBox) {
      nextBox.style.cssText = `
        position: fixed !important;
        bottom: 100px;
        left: 10px;
        top: auto !important;
        right: auto !important;
        z-index: 1001;
      `;
    }

    // 미니 디펜스 패널 생성 (캔버스 포함, setMiniDisplay 포함)
    debugLog("Conquest", "createMiniDefensePanel 호출 전");
    this.createMiniDefensePanel();
    debugLog("Conquest", "createMiniDefensePanel 호출 후");

    // 디펜스 원본 캔버스는 숨기고, resume() 호출
    this.defenseGame.originalCanvas.style.display = "none";
    this.defenseGame.uiLayer.style.display = "none";
    debugLog("Conquest", "디펜스 원본 캔버스 숨김, resume 호출");
    this.defenseGame.resume();

    // 퍼즐 모드로 테트리스 시작
    const gameContainer = document.getElementById("game-container");
    gameContainer.style.display = "block"; // 먼저 보이게
    gameContainer.style.opacity = 1;
    document.getElementById("game-ui").style.display = "block";
    this.terminal.setTransparentMode(true);
    this.terminal.hide(); // 터미널 완전히 숨기기

    // 현재 스테이지 난이도 기반으로 퍼즐 모드 시작
    const currentStage = this.stageManager.getCurrentStage();
    const difficulty = parseInt(currentStage.id) || 1;
    this.tetrisGame.startPuzzleMode(difficulty);

    // 미니 디펜스 렌더링 시작
    this.startMiniDefenseRender();
  }

  // 테트리스 상단 UI 숨기기 (점령 모드) - NEXT 블럭은 유지
  hideConquestTetrisUI() {
    const gameUI = document.getElementById("game-ui");
    if (!gameUI) return;

    // LEVEL, DATA MINED만 숨기기 (NEXT 블럭은 유지)
    const levelBox = gameUI.querySelector(".level-box");
    const scoreBoard = gameUI.querySelector(".score-board");

    if (levelBox) levelBox.style.display = "none";
    if (scoreBoard) scoreBoard.style.display = "none";
  }

  // 테트리스 상단 UI 복구
  showConquestTetrisUI() {
    const gameUI = document.getElementById("game-ui");
    if (!gameUI) return;

    const levelBox = gameUI.querySelector(".level-box");
    const scoreBoard = gameUI.querySelector(".score-board");

    if (levelBox) levelBox.style.display = "";
    if (scoreBoard) scoreBoard.style.display = "";
  }

  // NEXT 블록 위치 복구 및 설정 버튼 복구
  restoreNextBoxPosition() {
    const nextBox = document.querySelector(".next-box");
    if (nextBox) {
      nextBox.style.cssText = "";
    }

    // 정복 모드 설정 버튼 제거
    const conquestSettingsBtns = document.getElementById(
      "conquest-settings-btns"
    );
    if (conquestSettingsBtns) {
      conquestSettingsBtns.remove();
    }

    // settings-area 다시 표시
    const settingsArea = document.querySelector(".settings-area");
    if (settingsArea) {
      settingsArea.style.display = "flex";
    }
  }

  // 미니 디펜스 렌더링 시작
  startMiniDefenseRender() {
    const miniCanvas = document.getElementById("mini-defense-canvas");
    if (!miniCanvas) return;

    const ctx = miniCanvas.getContext("2d");

    this.defenseMonitorLoop = () => {
      if (!this.isConquestMode) return;

      // 미니 캔버스에 디펜스 렌더링 - 캔버스 전체를 채우도록 스케일 업
      const scaleX = miniCanvas.width / this.defenseGame.canvas.width;
      const scaleY = miniCanvas.height / this.defenseGame.canvas.height;
      const scale = Math.max(scaleX, scaleY) * 1.2; // 더 크게!

      ctx.fillStyle = "#001100";
      ctx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

      ctx.save();
      ctx.translate(miniCanvas.width / 2, miniCanvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(
        -this.defenseGame.canvas.width / 2,
        -this.defenseGame.canvas.height / 2
      );

      // 원본 디펜스 캔버스 복사
      ctx.drawImage(this.defenseGame.canvas, 0, 0);
      ctx.restore();

      // 정보 업데이트
      const hpPercent = Math.ceil(
        (this.defenseGame.core.hp / this.defenseGame.core.maxHp) * 100
      );
      const page = this.defenseGame.reinforcementPage || 1;
      const maxPage = this.defenseGame.reinforcementMaxPages || 3;

      const coreEl = document.getElementById("conquest-core-hp");
      const pageEl = document.getElementById("conquest-page");

      if (coreEl) coreEl.textContent = `♥ ${hpPercent}%`;
      if (pageEl) pageEl.textContent = `⚔️ ${page}/${maxPage}`;

      // HP에 따라 패널 색상 변경
      const panel = document.getElementById("mini-defense-panel");
      if (panel) {
        if (hpPercent <= 30) {
          panel.style.borderColor = "#ff0000";
        } else if (hpPercent <= 60) {
          panel.style.borderColor = "#ffaa00";
        } else {
          panel.style.borderColor = "#ff3333";
        }
      }

      // 강화 페이지 완료 체크
      if (this.defenseGame.reinforcementComplete) {
        // 테트리스 성공 시에만 점령 완료
        if (this.conquestTetrisComplete) {
          this.handleConquestComplete();
        } else {
          // 테트리스 실패했으면 점령 없이 종료
          this.handleConquestFailNoConquer();
        }
        return;
      }

      // 코어 파괴 체크
      if (this.defenseGame.core.hp <= 0) {
        this.handleConquestFail();
        return;
      }

      requestAnimationFrame(this.defenseMonitorLoop);
    };

    requestAnimationFrame(this.defenseMonitorLoop);
  }

  // 테트리스 클리어 시 (점령 모드) - 바로 디펜스로 복귀
  handleConquestTetrisClear() {
    debugLog("GameManager", "handleConquestTetrisClear 호출됨");
    debugLog("GameManager", "isConquestMode:", this.isConquestMode);

    if (!this.isConquestMode) {
      debugLog("GameManager", "isConquestMode가 false라서 리턴");
      return;
    }

    this.conquestTetrisComplete = true;
    debugLog("GameManager", "conquestTetrisComplete = true");

    // 테트리스 UI 정리
    this.tetrisGame.state.isPlaying = false;
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();
    debugLog("GameManager", "테트리스 UI 정리 완료");

    // 미니 패널 제거 및 원본 캔버스로 복원
    debugLog("Conquest", "=== 복귀 시작: removeMiniDefensePanel 호출 ===");
    this.removeMiniDefensePanel();
    debugLog("Conquest", "removeMiniDefensePanel 완료");

    // 캔버스 상태 확인
    debugLog("Canvas", "복귀 후 canvas 정보:");
    debugLog("Canvas", "  - originalCanvas.width x height:", this.defenseGame.originalCanvas.width, "x", this.defenseGame.originalCanvas.height);
    debugLog("Canvas", "  - originalCanvas.style.display:", this.defenseGame.originalCanvas.style.display);
    debugLog("Canvas", "  - isMiniDisplay:", this.defenseGame.isMiniDisplay);
    debugLog("Canvas", "  - miniCanvas:", !!this.defenseGame.miniCanvas);

    // 게임 상태 확인
    debugLog("Defense", "게임 상태 확인:");
    debugLog("Defense", "  - 아군 수:", this.defenseGame.alliedViruses.length);
    debugLog("Defense", "  - 적 수:", this.defenseGame.enemies.length);
    debugLog("Defense", "  - 코어 HP:", this.defenseGame.core.hp);
    debugLog("Defense", "  - 코어 위치:", this.defenseGame.core.x, this.defenseGame.core.y);
    debugLog("Defense", "  - isRunning:", this.defenseGame.isRunning);
    debugLog("Defense", "  - isConquered:", this.defenseGame.isConquered);

    // 디펜스 화면 복구 및 재개
    debugLog("Canvas", "originalCanvas.style.display를 block으로 설정");
    this.defenseGame.originalCanvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";
    debugLog("Canvas", "설정 후 originalCanvas.style.display:", this.defenseGame.originalCanvas.style.display);

    this.defenseGame.resume(); // 디펜스 재개! (강화 페이지 진행을 위해)
    debugLog("Conquest", "=== 복귀 완료 ===");

    // 터미널 복구
    debugLog("GameManager", "터미널 복구 시작");
    debugLog("GameManager", "terminal 객체:", this.terminal);
    debugLog("GameManager", "terminalLayer:", this.terminal.terminalLayer);
    debugLog(
      "GameManager",
      "terminalLayer display (before):",
      this.terminal.terminalLayer?.style?.display
    );

    this.terminal.setTransparentMode(false);
    debugLog("GameManager", "setTransparentMode(false) 완료");

    this.terminal.show();
    debugLog("GameManager", "terminal.show() 완료");
    debugLog(
      "GameManager",
      "terminalLayer display (after show):",
      this.terminal.terminalLayer?.style?.display
    );

    this.terminal.setDefenseMode(true);
    debugLog("GameManager", "setDefenseMode(true) 완료");
    debugLog(
      "GameManager",
      "terminalLayer display (after setDefenseMode):",
      this.terminal.terminalLayer?.style?.display
    );
    debugLog(
      "GameManager",
      "terminalLayer pointerEvents:",
      this.terminal.terminalLayer?.style?.pointerEvents
    );
    debugLog(
      "GameManager",
      "terminalLayer background:",
      this.terminal.terminalLayer?.style?.background
    );
    debugLog(
      "GameManager",
      "terminalLayer zIndex:",
      this.terminal.terminalLayer?.style?.zIndex
    );

    this.terminal.printSystemMessage("FIREWALL BREACHED! Defend the core!");
    debugLog("GameManager", "printSystemMessage 완료");

    // defenseMonitorLoop가 계속 돌면서 강화 페이지 완료 체크
    debugLog("GameManager", "handleConquestTetrisClear 종료");
  }

  // 퍼즐 줄 클리어 시 디펜스에 파동 효과 + 아이템 드롭 확률
  handlePuzzleLineCleared(lineNum) {
    // 테트리스에서 줄 클리어 시 아이템 드롭 (줄 수에 비례한 확률)
    this.tryTetrisItemDrop(lineNum);

    if (!this.isConquestMode || !this.defenseGame) return;

    debugLog("GameManager", `퍼즐 라인 클리어: ${lineNum}줄`);

    // 효과 적용 (1,2,3줄에 따라 다른 효과)
    switch (lineNum) {
      case 1:
        // 1줄: 넉백 + 슬로우
        this.defenseGame.applyWaveEffect("knockback_slow");
        this.showPuzzleSuccessMessage("LINE CLEAR!", "WAVE SENT - SLOWDOWN");
        break;
      case 2:
        // 2줄: 넉백 + 데미지
        this.defenseGame.applyWaveEffect("knockback_damage");
        this.showPuzzleSuccessMessage("DOUBLE LINE!", "WAVE SENT - DAMAGE");
        break;
      case 3:
        // 3줄: 넉백 + 데미지 3회
        this.defenseGame.applyWaveEffect("knockback_damage_x3");
        this.showPuzzleSuccessMessage("TRIPLE LINE!", "WAVE SENT - CRITICAL");
        break;
      default:
        // 4줄 이상
        this.defenseGame.applyWaveEffect("knockback_damage_x3");
        this.showPuzzleSuccessMessage("MEGA CLEAR!", "WAVE SENT - DEVASTATION");
        break;
    }
  }

  // ===== 아이템 시스템 =====

  /**
   * 테트리스 줄 클리어 시 아이템 드롭 (시각적 드롭 없이 바로 인벤토리에 추가)
   * @param {number} lineNum - 클리어한 줄 수
   */
  tryTetrisItemDrop(lineNum) {
    // 디버그 드롭률이 설정되어 있으면 사용, 아니면 줄당 10%
    let dropChance = this.debugItemDropRate !== null
      ? this.debugItemDropRate
      : 0.10 * lineNum;

    // 장착 아이템 효과로 드롭률 증가 (디버그 모드가 아닐 때만)
    if (this.debugItemDropRate === null) {
      const effects = this.inventoryManager.getEquippedEffects();
      dropChance += effects.dropRate;
    }

    // 확률 체크
    if (Math.random() > dropChance) return;

    // 아이템 생성
    const item = this.itemDatabase.generateRandomItem();

    debugLog("GameManager", `테트리스 아이템 드롭! ${item.name}`);

    // 현재 스테이지 획득 목록에 추가

    // 해금 조각(fragment)은 별도 처리
    if (item.type === "fragment") {
      this.processDecryption(item);
      this.showItemDropNotification(item);
      return;
    }

    // 일반 아이템만 획득 목록에 추가
    this.collectedItemsThisStage.push(item);

    // 인벤토리에 바로 추가
    const result = this.inventoryManager.addToInventory(item);

    if (result.success) {
      this.showItemDropNotification(item);
    } else {
      this.showItemDropNotification(item, true);
    }
  }

  /**
   * 아이템 드롭 시도 (디펜스 모드 - 적 위치에 시각적 드롭)
   * @param {number} x - 드롭 위치 X
   * @param {number} y - 드롭 위치 Y
   * @param {string} source - 'defense' 또는 'tetris'
   */
  tryItemDrop(x, y, source) {
    // === 1. 일반 아이템 드롭 ===
    // 디버그 드롭률이 설정되어 있으면 사용, 아니면 기본값 5%
    let dropChance = this.debugItemDropRate !== null ? this.debugItemDropRate : 0.05;

    // 장착 아이템 효과로 드롭률 증가 (디버그 모드가 아닐 때만)
    if (this.debugItemDropRate === null) {
      const effects = this.inventoryManager.getEquippedEffects();
      dropChance += effects.dropRate;
    }

    // 일반 아이템 드롭 확률 체크
    if (Math.random() <= dropChance) {
      const item = this.itemDatabase.generateRandomItem();
      debugLog("GameManager", `아이템 드롭! ${item.name} at (${x}, ${y})`);

      if (this.defenseGame && this.activeMode === "defense") {
        this.defenseGame.spawnDroppedItem(x, y, item);
      }
    }

    // === 2. 블루프린트 드롭 (별도 확률) ===
    const bpDropChance = this.debugBlueprintDropRate !== null ? this.debugBlueprintDropRate : 0.10;

    if (Math.random() <= bpDropChance) {
      // 해금 대상이 남아있는지 확인
      const allTargets = [...this.virusUnlockTargets, ...this.weaponUnlockTargets];
      const lockedTargets = allTargets.filter(t => {
        if (this.virusUnlockTargets.includes(t)) return !this.isVirusUnlocked(t);
        if (this.weaponUnlockTargets.includes(t)) return !this.isWeaponUnlocked(t);
        return false;
      });

      if (lockedTargets.length === 0) return; // 모두 해금됨

      // 블루프린트 아이템 생성 (디버그 증가량 적용)
      const blueprintItem = this.itemDatabase.generateBlueprintItem(this.debugBlueprintAmount);

      debugLog("GameManager", `블루프린트 드롭! ${blueprintItem.name} (+${blueprintItem.effect.value}%) at (${x}, ${y})`);

      // 일반 아이템과 동일하게 바닥에 드롭 (아군이 수집)
      if (this.defenseGame && this.activeMode === "defense") {
        this.defenseGame.spawnDroppedItem(x, y, blueprintItem);
      }
    }
  }

  /**
   * 블루프린트 드롭 이펙트 표시
   */
  showBlueprintDropEffect(x, y, amount) {
    if (!this.defenseGame || !this.defenseGame.canvas) return;

    const canvas = this.defenseGame.canvas;
    const rect = canvas.getBoundingClientRect();

    // 캔버스 좌표를 화면 좌표로 변환
    const screenX = rect.left + (x / this.defenseGame.width) * rect.width;
    const screenY = rect.top + (y / this.defenseGame.height) * rect.height;

    const effect = document.createElement("div");
    effect.style.cssText = `
      position: fixed;
      left: ${screenX}px;
      top: ${screenY}px;
      color: #00ffff;
      font-family: var(--term-font);
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 0 10px #00ffff;
      pointer-events: none;
      z-index: 9999;
      animation: blueprintFloat 1s ease-out forwards;
    `;
    effect.innerText = `🔓+${amount}%`;

    // 애니메이션 스타일 추가 (한 번만)
    if (!document.getElementById("blueprint-effect-style")) {
      const style = document.createElement("style");
      style.id = "blueprint-effect-style";
      style.textContent = `
        @keyframes blueprintFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-30px) scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 1000);
  }

  /**
   * 아이템 수집 완료 처리 (수집 바이러스가 코어에 도착했을 때)
   * 인벤토리에 바로 넣지 않고, 스테이지 끝날 때 선택하도록 저장만 함
   */

  /**
   * 데이터 조각 처리 (해금 진행률 증가)
   * - 모든 스테이지에서 모든 해금 대상 드랍 가능
   * - 특정 스테이지에서는 특정 대상의 확률이 높음 (70% 스테이지 타겟, 30% 랜덤)
   */
  processDecryption(item) {
    // 모든 해금 대상 (바이러스 + 무기)
    const allTargets = [...this.virusUnlockTargets, ...this.weaponUnlockTargets];

    // 아직 해금되지 않은 타겟만 필터링
    const lockedTargets = allTargets.filter(t => {
      const isVirus = this.virusUnlockTargets.includes(t);
      const isWeapon = this.weaponUnlockTargets.includes(t);
      if (isVirus) return !this.isVirusUnlocked(t);
      if (isWeapon) return !this.isWeaponUnlocked(t);
      return false;
    });

    if (lockedTargets.length === 0) {
      // 모두 해금됨 - 자원으로 변환
      const dataAmount = (item.effect.value || 1) * 10;
      this.currentMoney += dataAmount;
      this.saveMoney();
      this.terminal.updateData(this.currentMoney);
      debugLog("Item", `All targets unlocked, converted to ${dataAmount} DATA`);
      return null; // 타겟 없음 (DATA로 변환됨)
    }

    // 현재 스테이지의 보너스 타겟 확인
    const stageId = this.defenseGame.currentStageId || 0;
    const bonusTargets = this.stageUnlockTargets[stageId] || [];
    const lockedBonusTargets = bonusTargets.filter(t => lockedTargets.includes(t));

    // 타겟 선택: 70% 스테이지 보너스 타겟, 30% 전체 랜덤
    let target;
    if (lockedBonusTargets.length > 0 && Math.random() < 0.7) {
      // 스테이지 보너스 타겟 중 랜덤
      target = lockedBonusTargets[Math.floor(Math.random() * lockedBonusTargets.length)];
    } else {
      // 전체 잠긴 타겟 중 랜덤
      target = lockedTargets[Math.floor(Math.random() * lockedTargets.length)];
    }

    // 진행률 증가
    const amount = item.effect.value || 1;
    if (!this.decryptionProgress[target]) this.decryptionProgress[target] = 0;

    const oldProgress = this.decryptionProgress[target];
    this.decryptionProgress[target] = Math.min(100, oldProgress + amount);

    this.saveDecryptionProgress();

    debugLog("Item", `${target}: ${oldProgress}% -> ${this.decryptionProgress[target]}% (Stage ${stageId} bonus: ${bonusTargets.join(', ')})`);

    // 해금 달성 체크
    if (oldProgress < 100 && this.decryptionProgress[target] >= 100) {
      this.terminal.printSystemMessage(`ACCESS GRANTED: ${target} BLUEPRINT DECRYPTED!`);
      this.showNotification(`🔓 ${target} UNLOCKED!`, "#00ff00");
    }

    // 적용된 타겟 반환
    return target;
  }

  handleItemCollected(item) {
    debugLog("GameManager", `아이템 수집됨: ${item.name}`);

    // 블루프린트 아이템인 경우 별도 처리 (즉시 해금 진행률 반영)
    if (item.effect && item.effect.type === "blueprint") {
      const target = this.processDecryption(item);
      this.showBlueprintCollectedNotification(item, target);
      return; // 인벤토리에 추가하지 않음
    }

    // 일반 아이템: 현재 스테이지 획득 목록에 추가 (인벤토리에 바로 안 넣음)
    this.collectedItemsThisStage.push(item);

    // 획득 알림 표시 (수집됨 표시)
    this.showItemDropNotification(item);
  }

  /**
   * 블루프린트 수집 알림 표시 (상단에 표시)
   * @param {object} item - 블루프린트 아이템
   * @param {string} target - 적용된 해금 타겟 (예: "SNIPER", "TANK")
   */
  showBlueprintCollectedNotification(item, target) {
    const existing = document.getElementById("blueprint-notification");
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.id = "blueprint-notification";
    notification.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 50, 80, 0.95);
      border: 2px solid #00ffff;
      color: #00ffff;
      padding: 10px 20px;
      font-family: var(--term-font);
      font-size: 14px;
      z-index: 9999;
      border-radius: 5px;
      text-shadow: 0 0 10px #00ffff;
      animation: blueprintNotifAnim 2.5s ease-out forwards;
    `;

    // 모든 해금 완료 시 (target이 null)
    if (!target) {
      const dataAmount = (item.effect.value || 1) * 10;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">${item.icon}</span>
          <span style="color: #aaaaaa;">ALL UNLOCKED</span>
          <span style="color: #ffcc00;">→ +${dataAmount} DATA</span>
        </div>
        <div style="margin-top: 6px; font-size: 12px; color: #888;">
          Blueprint converted to resources
        </div>
      `;
    } else {
      // 타겟 타입 확인 (바이러스 vs 무기)
      const isVirus = this.virusUnlockTargets.includes(target);
      const typeLabel = isVirus ? "🦠" : "🔫";
      const currentProgress = this.decryptionProgress[target] || 0;

      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">${item.icon}</span>
          <span style="color: #ffcc00; font-weight: bold;">${typeLabel} ${target}</span>
          <span style="color: #00ff00;">+${item.effect.value}%</span>
        </div>
        <div style="margin-top: 6px; font-size: 12px; color: #aaa;">
          Progress: <span style="color: ${currentProgress >= 100 ? '#00ff00' : '#00ffff'};">${Math.min(100, currentProgress)}%</span>
          ${currentProgress >= 100 ? ' <span style="color: #00ff00;">✓ UNLOCKED</span>' : ''}
        </div>
      `;
    }

    // 애니메이션 스타일 추가 (한 번만)
    if (!document.getElementById("blueprint-notif-style")) {
      const style = document.createElement("style");
      style.id = "blueprint-notif-style";
      style.textContent = `
        @keyframes blueprintNotifAnim {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  }

  /**
   * 아이템 획득 알림 표시
   */
  showItemDropNotification(item, inventoryFull = false) {
    // 기존 알림 제거
    const existing = document.getElementById("item-drop-notification");
    if (existing) existing.remove();

    const color = this.itemDatabase.getRarityColor(item.rarity);

    const notification = document.createElement("div");
    notification.id = "item-drop-notification";
    notification.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid ${color};
      padding: 15px 25px;
      border-radius: 8px;
      z-index: 99999;
      text-align: center;
      animation: itemPopIn 0.3s ease-out;
      box-shadow: 0 0 20px ${color}40;
    `;

    notification.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 5px;">${item.icon}</div>
      <div style="color: ${color}; font-weight: bold; font-size: 14px;">${item.name}</div>
      <div style="color: #888; font-size: 11px; margin-top: 3px;">
        ${inventoryFull ? "⚠️ 인벤토리 가득참!" : item.description}
      </div>
    `;

    // 애니메이션 스타일 추가
    if (!document.getElementById("item-notification-style")) {
      const style = document.createElement("style");
      style.id = "item-notification-style";
      style.textContent = `
        @keyframes itemPopIn {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          70% { transform: translateX(-50%) scale(1.1); }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes itemFadeOut {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // 2초 후 페이드아웃
    setTimeout(() => {
      notification.style.animation = "itemFadeOut 0.3s ease-in forwards";
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * 스테이지 클리어 시 아이템 선택 화면
   * 획득한 아이템 중 인벤토리에 넣을 것을 선택
   * @returns {Promise} 선택 완료 시 resolve
   */
  async showLootSummary() {
    // 획득한 아이템이 없으면 스킵
    if (this.collectedItemsThisStage.length === 0) return;

    // 선택 화면으로 이동 (완료될 때까지 대기)
    await this.showLootSelectionScreen();
  }

  /**
   * 아이템 선택 화면 (인벤토리에 넣을 아이템 선택)
   * @returns {Promise} 선택 완료 시 resolve
   */
  showLootSelectionScreen() {
    return new Promise((resolve) => {
      const lootItems = [...this.collectedItemsThisStage]; // 복사본
      const inventoryData = this.inventoryManager.getData();

      // Promise resolve를 저장 (버튼 클릭 시 호출)
      this._lootSelectionResolve = resolve;

      const overlay = document.createElement("div");
      overlay.id = "loot-selection-overlay";
      overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 99998;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
      font-family: var(--term-font);
    `;

      // 선택 상태 추적
      let selectedLootIndex = null;

      const render = () => {
        const invData = this.inventoryManager.getData();
        const emptySlots = invData.inventory.filter(s => s === null).length;

        overlay.innerHTML = `
        <div style="color: #ffaa00; font-size: 20px; font-weight: bold; margin-bottom: 10px; text-shadow: 0 0 10px #ffaa00;">
          📦 LOOT ACQUIRED (${lootItems.length}개)
        </div>
        <div style="color: #888; font-size: 11px; margin-bottom: 15px;">
          아이템을 클릭해서 인벤토리에 추가 | 인벤토리 빈칸: ${emptySlots}/20
        </div>
        
        <div id="loot-items-container" style="
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          max-width: 400px;
          padding: 15px;
          border: 2px solid #ffaa00;
          background: rgba(50, 30, 0, 0.3);
          margin-bottom: 15px;
          min-height: 60px;
        "></div>
        
        <div style="color: #00ff00; font-size: 14px; margin: 10px 0;">
          YOUR INVENTORY
        </div>
        
        <div id="inventory-grid" style="
          display: grid;
          grid-template-columns: repeat(10, 40px);
          gap: 4px;
          padding: 10px;
          border: 2px solid #00ff00;
          background: rgba(0, 30, 0, 0.3);
          margin-bottom: 15px;
        "></div>
        
        <div id="data-conversion-info" style="
          color: #888;
          font-size: 11px;
          margin-bottom: 15px;
          text-align: center;
        "></div>
        
        <button id="confirm-loot-btn" style="
          padding: 12px 40px;
          background: rgba(0, 100, 0, 0.5);
          border: 2px solid #00ff00;
          color: #00ff00;
          font-family: var(--term-font);
          font-size: 14px;
          cursor: pointer;
        ">[ CONFIRM ]</button>
      `;

        // 획득 아이템 렌더링
        const lootContainer = overlay.querySelector("#loot-items-container");
        lootItems.forEach((item, idx) => {
          const color = this.itemDatabase.getRarityColor(item.rarity);
          const dataValue = this.itemDatabase.getItemDataValue(item);

          const itemEl = document.createElement("div");
          itemEl.style.cssText = `
          width: 45px;
          height: 55px;
          border: 2px solid ${color};
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 5px;
          ${selectedLootIndex === idx ? 'box-shadow: 0 0 15px ' + color + '; transform: scale(1.1);' : ''}
        `;
          itemEl.innerHTML = `
          <div style="font-size: 18px;">${item.icon}</div>
          <div style="font-size: 6px; color: ${color}; text-align: center;">${item.name.split(' ')[0]}</div>
          <div style="font-size: 7px; color: #888;">+${dataValue}</div>
        `;

          itemEl.onclick = () => {
            // 인벤토리에 빈 공간이 있으면 바로 추가
            const result = this.inventoryManager.addToInventory(item);
            if (result.success) {
              lootItems.splice(idx, 1);
              this.showNotification(`${item.name} 추가됨!`, color);
              render();
            } else {
              // 빈 공간 없으면 선택 상태로
              selectedLootIndex = idx;
              this.showNotification("인벤토리에서 교체할 아이템 선택", "#ffaa00");
              render();
            }
          };

          lootContainer.appendChild(itemEl);
        });

        if (lootItems.length === 0) {
          lootContainer.innerHTML = '<div style="color: #666;">모든 아이템을 인벤토리에 추가했습니다</div>';
        }

        // 인벤토리 렌더링
        const invGrid = overlay.querySelector("#inventory-grid");
        invData.inventory.forEach((item, idx) => {
          const slot = document.createElement("div");
          const color = item ? this.itemDatabase.getRarityColor(item.rarity) : "#333";

          slot.style.cssText = `
          width: 40px;
          height: 40px;
          border: 1px solid ${color};
          background: ${item ? 'rgba(0, 50, 30, 0.5)' : 'rgba(0, 0, 0, 0.3)'};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: ${item ? 'pointer' : 'default'};
          transition: all 0.2s;
          border-radius: 3px;
        `;

          if (item) {
            slot.innerHTML = `
            <div style="font-size: 14px;">${item.icon}</div>
            <div style="font-size: 5px; color: ${color};">${item.name.split(' ')[0]}</div>
          `;

            slot.onclick = () => {
              if (selectedLootIndex !== null) {
                // 선택된 루트 아이템과 교체
                const lootItem = lootItems[selectedLootIndex];
                const oldItem = this.inventoryManager.inventory[idx];

                // 교체
                this.inventoryManager.inventory[idx] = lootItem;
                this.inventoryManager.saveState();

                // 기존 아이템은 루트 목록으로
                lootItems.splice(selectedLootIndex, 1, oldItem);

                selectedLootIndex = null;
                this.showNotification(`${lootItem.name} ↔ ${oldItem.name} 교체!`, "#00ff00");
                render();
              }
            };
          }

          invGrid.appendChild(slot);
        });

        // DATA 변환 정보 표시
        if (lootItems.length > 0) {
          let totalData = 0;
          lootItems.forEach(item => {
            totalData += this.itemDatabase.getItemDataValue(item);
          });

          const infoEl = overlay.querySelector("#data-conversion-info");
          infoEl.innerHTML = `⚠️ 남은 ${lootItems.length}개 아이템은 <span style="color: #ffaa00;">${totalData} DATA</span>로 자동 변환됩니다`;
        }

        // 확인 버튼
        overlay.querySelector("#confirm-loot-btn").onclick = () => {
          this.finalizeLootSelection(lootItems, overlay);
        };
      };

      document.body.appendChild(overlay);
      render();
    }); // Promise 닫기
  }

  /**
   * 루트 선택 완료 - 남은 아이템 DATA로 변환
   */
  finalizeLootSelection(remainingItems, overlay) {
    let totalData = 0;

    remainingItems.forEach(item => {
      totalData += this.itemDatabase.getItemDataValue(item);
    });

    if (totalData > 0) {
      this.currentMoney += totalData;
      this.saveMoney();
      this.terminal.updateData(this.currentMoney);

      this.showNotification(`${remainingItems.length}개 아이템 → ${totalData} DATA 변환!`, "#ffaa00");
    }

    // 획득 목록 초기화
    this.collectedItemsThisStage = [];

    // 오버레이 제거
    overlay.style.animation = "fadeOut 0.3s ease-in forwards";
    setTimeout(() => {
      overlay.remove();
      // Promise resolve 호출 (화면이 완전히 닫힌 후)
      if (this._lootSelectionResolve) {
        this._lootSelectionResolve();
        this._lootSelectionResolve = null;
      }
    }, 300);
  }

  // 퍼즐 성공 메시지 표시 (터미널 스타일 - 클리어 메시지와 동일)
  showPuzzleSuccessMessage(title, subtitle) {
    // 기존 메시지 제거
    const existing = document.getElementById("puzzle-success-msg");
    if (existing) existing.remove();

    // 메시지 요소 생성
    const msg = document.createElement("div");
    msg.id = "puzzle-success-msg";
    msg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      text-align: center;
      font-family: "Galmuri11", "VT323", monospace;
      pointer-events: none;
      animation: puzzleSuccessAnim 1.5s ease-out forwards;
    `;

    msg.innerHTML = `
      <div style="
        color: #0f0; 
        font-size: 32px; 
        font-weight: bold;
        text-shadow: 0 0 10px rgba(0, 255, 0, 0.8), 
                     0 0 20px rgba(0, 255, 0, 0.6), 
                     0 0 40px rgba(0, 255, 0, 0.4);
        letter-spacing: 3px;
        animation: puzzleSuccessGlitch 0.1s infinite;
      ">
        ${title}
      </div>
      <div style="
        color: #0ff; 
        font-size: 16px; 
        margin-top: 15px;
        text-shadow: 0 0 8px rgba(0, 255, 255, 0.8), 
                     0 0 15px rgba(0, 255, 255, 0.5);
        letter-spacing: 2px;
        opacity: 0.9;
      ">
        ${subtitle}
      </div>
    `;

    // 애니메이션 스타일 추가 (없으면)
    if (!document.getElementById("puzzle-success-style")) {
      const style = document.createElement("style");
      style.id = "puzzle-success-style";
      style.textContent = `
        @keyframes puzzleSuccessAnim {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          10% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          20% { transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes puzzleSuccessGlitch {
          0% { text-shadow: 2px 0 #f00, -2px 0 #0ff, 0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6); }
          25% { text-shadow: -2px 0 #f00, 2px 0 #0ff, 0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6); }
          50% { text-shadow: 2px 2px #f00, -2px -2px #0ff, 0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6); }
          75% { text-shadow: -2px 2px #f00, 2px -2px #0ff, 0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6); }
          100% { text-shadow: 0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6), 0 0 40px rgba(0, 255, 0, 0.4); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(msg);

    // 1.5초 후 제거
    setTimeout(() => {
      if (msg.parentNode) msg.remove();
    }, 1500);
  }

  // 점령 완료
  async handleConquestComplete() {
    debugLog("Conquest", "========== handleConquestComplete START ==========");
    this.isConquestMode = false;

    // 테트리스 정리 (혹시 아직 플레이 중이면)
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }

    // 미니 패널 제거 (setMiniDisplay(null) 호출하여 캔버스 복원)
    debugLog("Conquest", "About to call removeMiniDefensePanel");
    this.removeMiniDefensePanel();
    debugLog("Conquest", "removeMiniDefensePanel returned");

    // 테트리스 UI 완전 정리
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) gameContainer.style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();

    // 디펜스 화면 복구
    debugLog("Canvas", "Setting defense canvas display to block");
    debugLog("Canvas", "Canvas before:", this.defenseGame.canvas.style.display);
    this.defenseGame.canvas.style.display = "block";
    debugLog("Canvas", "Canvas after:", this.defenseGame.canvas.style.display);
    debugLog("Canvas", "Setting uiLayer display to block");
    this.defenseGame.uiLayer.style.display = "block";
    debugLog("Conquest", "Defense game isRunning:", this.defenseGame.isRunning);

    // 점령 처리
    this.conquestManager.conquerStage();

    // 현재 스테이지를 점령 상태로 설정
    const currentStage = this.stageManager.getCurrentStage();
    console.log("[GameManager] handleConquestComplete - currentStage:", currentStage);
    if (currentStage) {
      this.stageManager.setConquered(currentStage.id, true);
      // 채굴 등록
      console.log("[GameManager] Registering territory for mining:", currentStage.id);
      this.miningManager.registerTerritory(String(currentStage.id));
      this.saveMiningData();
      console.log("[GameManager] Mining data saved");
    }

    // 디펜스 게임에 점령 상태 설정 (시각화 + 아군 10마리)
    debugLog("Conquest", "Setting conquered state");
    this.defenseGame.setConqueredState(true);

    // 채굴 마이너 스폰
    console.log("[GameManager] Spawning miners for conquered stage:", currentStage.id);
    this.miningManager.onSceneChange(
      String(currentStage.id),
      false,
      this.defenseGame.canvas,
      this.defenseGame.core,
      true
    );

    debugLog("Conquest", "Calling defenseGame.resume()");
    this.defenseGame.resume(); // 디펜스 재개
    debugLog("Conquest", "After resume, isRunning:", this.defenseGame.isRunning);
    debugLog("Canvas", "After resume, canvas display:", this.defenseGame.canvas.style.display);

    // 터미널 표시 및 메시지
    this.terminal.setTransparentMode(false);
    this.terminal.show();
    this.terminal.setDefenseMode(true);
    await this.terminal.printSystemMessage("!!! SECTOR CONQUERED !!!");
    await this.terminal.printSystemMessage("Territory secured.");

    // 획득 아이템 선택 화면 표시
    await this.showLootSummary();

    // 선택지 표시
    await this.showCommandMenu();
    debugLog("Conquest", "========== handleConquestComplete END ==========");
  }

  // 점령 실패 (코어 파괴)
  async handleConquestFail() {
    this.isConquestMode = false;

    // 테트리스 정리
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI(); // 상단 UI 복구
    this.restoreNextBoxPosition(); // NEXT 블록 위치 복구

    // 미니 패널 제거 (setMiniDisplay(null) 호출하여 캔버스 복원)
    this.removeMiniDefensePanel();

    // 디펜스 정리
    this.defenseGame.canvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";

    this.terminal.setTransparentMode(false);
    this.terminal.show();
    await this.terminal.printSystemMessage("CONQUEST FAILED - Core Destroyed");

    // 게임 오버 처리
    this.handleDefenseGameOver();
  }

  // 점령 실패 (테트리스 실패, 점령 없이 종료)
  async handleConquestFailNoConquer() {
    this.isConquestMode = false;

    // 테트리스 정리
    if (this.tetrisGame.state.isPlaying) {
      this.tetrisGame.state.isPlaying = false;
    }
    document.getElementById("game-container").style.display = "none";
    document.getElementById("game-ui").style.display = "none";
    this.showConquestTetrisUI();
    this.restoreNextBoxPosition();

    // 미니 패널 제거 (setMiniDisplay(null) 호출하여 캔버스 복원)
    this.removeMiniDefensePanel();

    // 디펜스 정리 및 복구
    this.defenseGame.canvas.style.display = "block";
    this.defenseGame.uiLayer.style.display = "block";
    this.defenseGame.resume();

    // 터미널 표시
    this.terminal.setDefenseMode(true);
    this.terminal.show();
    await this.terminal.printSystemMessage("BREACH FAILED - Conquest Aborted");
    await this.terminal.printSystemMessage("Territory NOT secured.");

    // 명령 메뉴 표시 (점령 안 됨)
    await this.showCommandMenu();
  }

  /**
   * 맵 UI 표시
   */
  async showMap() {
    this.defenseGame.pause(); // 디펜스 일시정지

    // 터미널 애니메이션 (오버레이 유지)
    const bgOverlay = await this.playTerminalAnimation(
      "ACCESSING STAGE MAP...",
      true
    );

    const mapData = this.stageManager.getMapData();

    // 맵 컨테이너 (기존 오버레이 위에 생성하거나 교체)
    // 여기서는 bgOverlay를 재활용하여 자연스럽게 전환
    bgOverlay.id = "map-overlay";
    bgOverlay.style.background = "rgba(0, 0, 0, 0.95)";
    bgOverlay.style.flexDirection = "column";
    bgOverlay.style.justifyContent = "flex-start"; // 상단 정렬로 변경
    bgOverlay.style.padding = "20px";
    bgOverlay.style.boxSizing = "border-box";
    bgOverlay.style.overflowY = "auto";

    // 스캔 라인 효과 추가
    const scanline = document.createElement("div");
    scanline.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 5px;
      background: rgba(0, 255, 0, 0.5);
      opacity: 0.5;
      animation: scan 2s linear infinite;
      pointer-events: none;
    `;
    bgOverlay.appendChild(scanline);

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ff00;
      font-family: var(--term-font);
      font-size: 24px;
      margin-bottom: 20px;
      text-shadow: 0 0 10px #00ff00;
    `;
    header.innerText = "[ STAGE MAP ]";
    bgOverlay.appendChild(header);

    // 맵 컨테이너
    const mapContainer = document.createElement("div");
    mapContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 100px);
      grid-template-rows: repeat(5, 80px);
      gap: 10px;
      justify-content: center;
      align-content: center;
      flex: 1; /* 남은 공간 차지 */
    `;

    // 스테이지 버튼 생성 (새 색상 규칙)
    const accessibleIds = this.stageManager
      .getAccessibleStages()
      .map((s) => s.id);

    mapData.stages.forEach((stage) => {
      const btn = document.createElement("button");
      btn.className = "map-stage-btn";

      // 위치 계산 (row 0~4, col 0~2)
      const gridRow = stage.position.row + 1;
      const gridCol = stage.position.col + 1;

      // 상태 확인
      const isCurrent = stage.id === mapData.currentStageId;
      const isAccessible = accessibleIds.includes(stage.id);
      const isConquered = stage.conquered;
      const isLocked = !isAccessible && !isConquered;

      // 색상 설정 (우선순위: 현재 > 갈수있음 > 점령됨 > 보스 > 파밍 > 잠김)
      let bgColor,
        borderColor,
        textColor,
        extraStyle = "";

      if (isCurrent) {
        // 🟢 현재 위치: 밝은 초록 + glow
        bgColor = "rgba(0, 255, 0, 0.4)";
        borderColor = "#00ff00";
        textColor = "#00ff00";
        extraStyle =
          "box-shadow: 0 0 20px #00ff00, inset 0 0 10px rgba(0,255,0,0.3);";
      } else if (isAccessible && !isConquered) {
        // 🟡 갈 수 있는 곳 (미점령): 노란색 + 깜빡임
        bgColor = "rgba(255, 200, 0, 0.3)";
        borderColor = "#ffcc00";
        textColor = "#ffcc00";
        extraStyle = "animation: pulse 1.5s infinite;";
      } else if (isConquered) {
        // 🔵 점령 완료: 파란색
        bgColor = "rgba(0, 150, 255, 0.3)";
        borderColor = "#00aaff";
        textColor = "#00aaff";
      } else if (stage.type === "boss") {
        // 🔴 보스 (잠김): 어두운 빨간색
        bgColor = "rgba(100, 0, 0, 0.3)";
        borderColor = "#660000";
        textColor = "#880000";
      } else {
        // ⚫ 잠김: 어두운 회색
        bgColor = "rgba(50, 50, 50, 0.3)";
        borderColor = "#333";
        textColor = "#555";
      }

      btn.style.cssText = `
        grid-row: ${gridRow};
        grid-column: ${gridCol};
        background: ${bgColor};
        border: 2px solid ${borderColor};
        color: ${textColor};
        font-family: var(--term-font);
        font-size: 11px;
        padding: 5px;
        cursor: ${isAccessible ? "pointer" : "not-allowed"};
        text-align: center;
        transition: all 0.2s;
        ${extraStyle}
      `;

      // 마커 표시
      const currentMarker = isCurrent ? "▶ " : "";
      const conqueredMarker = isConquered ? " ✓" : "";
      const lockedMarker = isLocked ? " 🔒" : "";

      btn.innerHTML = `
        <div style="font-weight:bold;">${currentMarker}${stage.name
        }${conqueredMarker}${lockedMarker}</div>
        <div style="font-size:9px;margin-top:3px;">${stage.type.toUpperCase()}</div>
      `;

      // 클릭 이벤트 (접근 가능한 경우만)
      if (isAccessible) {
        btn.onclick = () => this.handleMapStageClick(stage, bgOverlay);

        // 호버 효과
        btn.onmouseenter = () => {
          btn.style.transform = "scale(1.05)";
          btn.style.boxShadow = `0 0 20px ${borderColor}`;
        };
        btn.onmouseleave = () => {
          btn.style.transform = "scale(1)";
          btn.style.boxShadow = isCurrent ? `0 0 20px #00ff00` : "none";
        };
      }

      mapContainer.appendChild(btn);
    });

    bgOverlay.appendChild(mapContainer);

    // 범례 (Legend)
    const legend = document.createElement("div");
    legend.style.cssText = `
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 15px;
      font-family: var(--term-font);
      font-size: 10px;
    `;
    legend.innerHTML = `
      <span style="color:#00ff00;">● 현재 위치</span>
      <span style="color:#ffcc00;">● 이동 가능</span>
      <span style="color:#00aaff;">● 점령 완료</span>
      <span style="color:#555;">● 잠김 🔒</span>
    `;
    bgOverlay.appendChild(legend);

    // 현재 스테이지 정보
    const currentStage = this.stageManager.getCurrentStage();
    const info = document.createElement("div");
    info.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 14px;
      margin-top: 20px;
      text-align: center;
      max-width: 300px;
    `;
    info.innerHTML = `
      <div style="color:#00ff00;margin-bottom:10px;">Current: ${currentStage.name}</div>
      <div>${currentStage.description}</div>
      <div style="margin-top:10px;color:#666;">Conquered: ${mapData.conqueredCount}/4</div>
    `;
    bgOverlay.appendChild(info);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      margin-top: 20px;
      padding: 10px 30px;
      background: transparent;
      border: 2px solid #ff0000;
      color: #ff0000;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.innerText = "[CLOSE MAP]";
    closeBtn.onclick = () => {
      bgOverlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    bgOverlay.appendChild(closeBtn);

    // CSS 애니메이션 추가 (스캔라인 + 깜빡임)
    if (!document.getElementById("map-animations")) {
      const style = document.createElement("style");
      style.id = "map-animations";
      style.innerHTML = `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          50% { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; border-color: #ffcc00; }
          50% { opacity: 0.6; border-color: #ff8800; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 맵에서 스테이지 클릭 시 처리
   */
  async handleMapStageClick(stage, overlay) {
    const result = this.stageManager.moveToStage(stage.id);

    if (result.success) {
      // 1. 장비 선택 (안전영역 제외) - 맵 위에서 바로 진행
      if (stage.type !== "safe") {
        await this.showEquipmentSelection(stage);
      }

      overlay.remove();

      // 2. 스테이지 설정 적용
      this.applyStageSettings(result.stage);

      // 2.5. 보스전 모드 설정
      if (result.stage.type === "boss") {
        this.startBossFight();
      } else {
        this.endBossFight();
      }

      // 3. 아군 바이러스 정보 업데이트 (playIntroAnimation 전에!)
      const alliedInfo = this.conquestManager.getAlliedInfo();
      this.defenseGame.updateAlliedInfo(alliedInfo);
      this.defenseGame.updateAlliedConfig(this.getAllyConfiguration());

      // 4. 기존 아군 제거 (겹침 방지) 후 게임 시작
      this.defenseGame.alliedViruses = [];

      // Safe Zone이면 아군 바이러스 미리 배치 (제거 후에 해야 함!)
      if (result.stage.type === "safe") {
        debugLog("GameManager", "Calling spawnSafeZoneAllies from handleMapStageClick");
        this.defenseGame.spawnSafeZoneAllies();
      }

      this.defenseGame.resume();

      // 5. 코어 강림 연출 (Canvas 내에서 처리)
      await this.defenseGame.playIntroAnimation();

      // 6. 연출 종료 후 시스템 메시지 (타이핑 효과)
      // terminal.clear() 제거 - 메시지 축적 유지
      await this.terminal.printSystemMessage(`DEPLOYED: ${result.stage.name}`);

      await this.showCommandMenu();
    } else {
      await this.terminal.printSystemMessage(
        `ACCESS DENIED: ${result.message}`
      );
    }
  }

  /**
   * 스테이지 진입 전 장비 선택 UI
   */
  async showEquipmentSelection(stage) {
    return new Promise((resolve) => {
      const data = this.inventoryManager.getData();

      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 5000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `;

      const header = document.createElement("div");
      header.style.cssText = `
        color: #ffcc00;
        font-family: var(--term-font);
        font-size: 16px;
        margin-bottom: 15px;
        text-shadow: 0 0 10px #ffcc00;
        text-align: center;
      `;
      header.innerHTML = `ENTERING: ${stage.name}<br><span style="font-size:12px;color:#aaa;">Select Equipment for this Mission</span>`;
      overlay.appendChild(header);

      // 장비 슬롯 표시
      const equipRow = document.createElement("div");
      equipRow.style.cssText = `
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        padding: 15px;
        border: 2px solid #00ff00;
        background: rgba(0, 50, 0, 0.3);
      `;

      // 장착 슬롯 4개 표시 (해금 여부에 따라)
      for (let idx = 0; idx < 4; idx++) {
        const isUnlocked = idx < data.unlockedSlots;
        const slot = this.createEquipSlotElement(
          data.equipSlots[idx],
          idx,
          isUnlocked,
          true // readOnly
        );
        equipRow.appendChild(slot);
      }
      overlay.appendChild(equipRow);

      // 출발 버튼
      const deployBtn = document.createElement("button");
      deployBtn.style.cssText = `
        padding: 12px 40px;
        background: rgba(0, 100, 0, 0.5);
        border: 2px solid #00ff00;
        color: #00ff00;
        font-family: var(--term-font);
        font-size: 16px;
        cursor: pointer;
        text-shadow: 0 0 5px #00ff00;
      `;
      deployBtn.innerText = "[ DEPLOY ]";
      deployBtn.onclick = () => {
        overlay.remove();
        resolve();
      };
      overlay.appendChild(deployBtn);

      document.body.appendChild(overlay);
    });
  }

  /**
   * 스테이지 설정을 DefenseGame에 적용
   */
  applyStageSettings(stage) {
    // 스테이지 시작 시 획득 아이템 목록 초기화
    this.collectedItemsThisStage = [];

    // 안전영역 여부
    this.defenseGame.isSafeZone = stage.type === "safe";
    this.defenseGame.safeZoneSpawnRate = stage.spawnRate;
    this.defenseGame.spawnRate = stage.spawnRate;

    // 스테이지 정보 저장 (난이도 계산용)
    this.defenseGame.currentStageId = stage.id;
    this.defenseGame.stageDifficultyScale = stage.difficultyScale || 1.0;
    this.defenseGame.stageMaxPages = stage.maxPages || 12;

    // 강화 모드 리셋 (스테이지 이동 시 항상 초기화)
    this.defenseGame.isReinforcementMode = false;
    this.defenseGame.reinforcementPage = 0;
    this.defenseGame.reinforcementComplete = false;
    this.defenseGame.conquerReady = false;

    // Safe Zone 아군 배치는 alliedViruses = [] 이후에 해야 하므로
    // 여기서는 설정만 하고, 실제 spawn은 호출하는 쪽에서 처리
    debugLog("GameManager", "applyStageSettings - stage.type:", stage.type, "isSafeZone:", this.defenseGame.isSafeZone);

    // 실드 상태 복구 (스테이지 이동 시 리셋)
    if (this.defenseGame.isSafeZone) {
      this.defenseGame.core.shieldActive = false;
      this.defenseGame.core.shieldState = "OFF";
      this.defenseGame.core.shieldHp = this.defenseGame.core.shieldMaxHp;
      this.defenseGame.core.shieldRadius = 70; // 기본 반경
      this.defenseGame.core.shieldTimer = 0;
      this.defenseGame.updateShieldBtnUI("OFFLINE", "#f00");
    } else {
      this.defenseGame.core.shieldActive = true;
      this.defenseGame.core.shieldState = "ACTIVE";
      this.defenseGame.core.shieldHp = this.defenseGame.core.shieldMaxHp;
      this.defenseGame.core.shieldRadius = 70; // 기본 반경
      this.defenseGame.core.shieldTimer = 0;
      this.defenseGame.updateShieldBtnUI("ACTIVE", "#fff");
    }
    this.defenseGame.shieldBtn.style.pointerEvents = "auto";

    // 점령 상태 확인 및 적용
    if (stage.conquered && stage.type === "conquest") {
      // 점령된 스테이지 - 점령 시각화 적용
      this.defenseGame.setConqueredState(true);
    } else {
      // 점령되지 않은 스테이지
      this.defenseGame.isConquered = false;
      this.defenseGame.shieldBtn.style.display = "block";

      // 페이지 시스템
      if (!stage.hasPages) {
        this.defenseGame.currentPage = 0;
        this.defenseGame.maxPages = 0;
      } else {
        this.defenseGame.currentPage = 1;
        this.defenseGame.pageTimer = 0;
        this.defenseGame.maxPages = stage.maxPages || 12;
      }
    }

    // UI 업데이트
    this.defenseGame.updateWaveDisplay();

    // 적 초기화
    this.defenseGame.enemies = [];
  }

  /**
   * 인벤토리/장비 UI 표시
   */
  async showInventory() {
    this.defenseGame.pause();

    const data = this.inventoryManager.getData();

    // 터미널 애니메이션 (오버레이 유지 - 디펜스 화면 안 보이게)
    const bgOverlay = await this.playTerminalAnimation(
      "LOADING INVENTORY...",
      true
    );

    // 인벤토리 오버레이로 변환 (기존 오버레이 재활용)
    bgOverlay.id = "inventory-overlay";
    bgOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 3000;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
    `;

    const overlay = bgOverlay; // 변수명 통일

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ff00;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 15px;
      text-shadow: 0 0 10px #00ff00;
    `;
    header.innerText = "[ EQUIPMENT & INVENTORY ]";
    overlay.appendChild(header);

    // 장비 슬롯 영역 (상단 4칸)
    const equipSection = document.createElement("div");
    equipSection.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      border: 2px solid #00ff00;
      background: rgba(0, 50, 0, 0.3);
    `;

    // 장착 슬롯 4개 표시
    for (let idx = 0; idx < 4; idx++) {
      const isUnlocked = idx < data.unlockedSlots;
      const slot = this.createEquipSlotElement(
        data.equipSlots[idx],
        idx,
        isUnlocked,
        false // 클릭 가능
      );

      // 슬롯 클릭 이벤트 (해금되지 않은 슬롯은 해금, 해금된 슬롯은 해제)
      slot.onclick = () => this.handleEquipSlotClick(idx, data, overlay);

      equipSection.appendChild(slot);
    }
    overlay.appendChild(equipSection);

    // 라벨
    const invLabel = document.createElement("div");
    invLabel.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 12px;
      margin-bottom: 5px;
    `;
    invLabel.innerText = "INVENTORY (20 SLOTS)";
    overlay.appendChild(invLabel);

    // 인벤토리 그리드 (20칸: 5x4)
    const invGrid = document.createElement("div");
    invGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(5, 50px);
      grid-template-rows: repeat(4, 50px);
      gap: 5px;
      padding: 10px;
      border: 1px solid #555;
      background: rgba(0, 0, 0, 0.5);
    `;

    data.inventory.forEach((item, idx) => {
      const slot = this.createInventorySlotElement(item, idx);

      // 인벤토리 아이템 클릭 = 장착 시도
      if (item) {
        slot.onclick = () => this.handleInventoryItemClick(idx, overlay);
      }

      invGrid.appendChild(slot);
    });
    overlay.appendChild(invGrid);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      margin-top: 15px;
      padding: 10px 30px;
      background: transparent;
      border: 2px solid #ff0000;
      color: #ff0000;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.innerText = "[CLOSE]";
    closeBtn.onclick = () => {
      overlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
  }

  /**
   * 업그레이드 UI 표시 (Depth 1: 카테고리 선택)
   */
  async showUpgrades() {
    this.defenseGame.pause();

    // 터미널 애니메이션 (오버레이 유지)
    const bgOverlay = await this.playTerminalAnimation(
      "LOADING UPGRADE TERMINAL...",
      true
    );

    this.showUpgradeCategories(bgOverlay);
  }

  /**
   * 업그레이드 카테고리 선택 화면 (Depth 1)
   */
  showUpgradeCategories(overlay) {
    // 오버레이 초기화
    overlay.innerHTML = "";
    overlay.id = "upgrade-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 3000;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
    `;

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #ffcc00;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 15px;
      text-shadow: 0 0 10px #ffcc00;
    `;
    header.innerText = "[ SYSTEM UPGRADES ]";
    overlay.appendChild(header);

    // 현재 DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 20px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 카테고리 그리드 (2x2)
    const categoryGrid = document.createElement("div");
    categoryGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      width: 100%;
      max-width: 350px;
      margin-bottom: 20px;
    `;

    // 카테고리 정의
    const categories = [
      {
        id: "core",
        name: "CORE",
        icon: "⚡",
        color: "#00ffff",
        desc: "코어 HP, 수동 발사",
      },
      {
        id: "helper",
        name: "HELPER",
        icon: "🔫",
        color: "#ffff00",
        desc: "조력자 공격력, 속도",
      },
      {
        id: "ally",
        name: "ALLY",
        icon: "🦠",
        color: "#00aaff",
        desc: "아군 바이러스",
      },
      {
        id: "shield",
        name: "SHIELD",
        icon: "🛡️",
        color: "#00ff88",
        desc: "실드 HP, 충전",
      },
    ];

    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.style.cssText = `
        background: rgba(0, 30, 0, 0.8);
        border: 2px solid ${cat.color};
        color: ${cat.color};
        padding: 20px 15px;
        font-family: var(--term-font);
        font-size: 14px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      `;

      btn.innerHTML = `
        <div style="font-size: 28px; margin-bottom: 8px;">${cat.icon}</div>
        <div style="font-weight: bold;">${cat.name}</div>
        <div style="font-size: 10px; color: #888; margin-top: 5px;">${cat.desc}</div>
      `;

      btn.onmouseenter = () => {
        btn.style.background = `rgba(0, 80, 40, 0.8)`;
        btn.style.boxShadow = `0 0 15px ${cat.color}`;
      };
      btn.onmouseleave = () => {
        btn.style.background = `rgba(0, 30, 0, 0.8)`;
        btn.style.boxShadow = `none`;
      };

      btn.onclick = () => {
        if (cat.id === "helper") {
          this.showHelperUpgrades(overlay);
        } else if (cat.id === "core") {
          this.showCoreUpgrades(overlay);
        } else if (cat.id === "ally") {
          this.showAllyUpgrades(overlay);
        } else if (cat.id === "shield") {
          this.showShieldUpgrades(overlay);
        }
      };

      categoryGrid.appendChild(btn);
    });

    overlay.appendChild(categoryGrid);

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = `
      margin-top: 10px;
      background: transparent;
      border: 1px solid #ff6666;
      color: #ff6666;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.innerText = "[CLOSE]";
    closeBtn.onclick = () => {
      overlay.remove();
      this.defenseGame.resume();
      this.showCommandMenu();
    };
    overlay.appendChild(closeBtn);
  }

  /**
   * 조력자 업그레이드 화면 (Depth 2)
   */
  showHelperUpgrades(overlay) {
    overlay.innerHTML = "";

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #ffff00;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #ffff00;
    `;
    header.innerText = "[ HELPER UPGRADES ]";
    overlay.appendChild(header);

    // ===== 무기 모드 탭 (상단) =====
    const weaponTabContainer = document.createElement("div");
    weaponTabContainer.style.cssText = `
      display: flex;
      gap: 5px;
      margin-bottom: 15px;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
      max-width: 350px;
    `;

    const weaponModes = this.defenseGame.weaponModes;
    const currentMode = this.defenseGame.helper.weaponMode;

    Object.keys(weaponModes).forEach((modeName) => {
      const mode = weaponModes[modeName];
      const isActive = modeName === currentMode;
      const isLocked = !this.isWeaponUnlocked(modeName);
      const unlockProgress = this.decryptionProgress[modeName] || 0;
      const unlockStage = this.getUnlockStageName(modeName);

      const tab = document.createElement("button");

      if (isLocked) {
        // 잠긴 무기 스타일 (진행률에 따라 아이콘이 왼→오로 채워짐)
        const progress = Math.min(100, unlockProgress);
        const clipRight = 100 - progress;

        tab.style.cssText = `
          padding: 8px 12px;
          font-family: var(--term-font);
          font-size: 12px;
          cursor: not-allowed;
          border: 2px solid #333;
          background: rgba(20, 20, 20, 0.9);
          transition: all 0.2s;
          min-width: 60px;
          position: relative;
          overflow: hidden;
        `;

        tab.innerHTML = `
          <div style="position: relative; width: 100%; height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <!-- 어두운 아이콘 (배경) -->
            <div style="position: absolute; top: 2px; font-size: 18px; filter: grayscale(100%) brightness(0.3);">${mode.icon}</div>
            <!-- 밝은 아이콘 (진행률만큼 clip) -->
            <div style="position: absolute; top: 2px; font-size: 18px; clip-path: inset(0 ${clipRight}% 0 0); filter: drop-shadow(0 0 4px ${mode.color});">${mode.icon}</div>
            <!-- 진행률 텍스트 -->
            <div style="position: absolute; bottom: 0; font-size: 9px; color: ${progress >= 100 ? '#00ff00' : '#00aaff'}; text-shadow: 0 0 3px #000;">
              ${progress >= 100 ? '✓ READY' : progress + '%'}
            </div>
            <!-- 잠금 표시 (진행률 낮을 때만) -->
            ${progress < 30 ? '<div style="position: absolute; top: 0; right: 0; font-size: 10px;">🔒</div>' : ''}
          </div>
        `;
      } else {
        // 해금된 무기 스타일
        tab.style.cssText = `
          padding: 8px 12px;
          font-family: var(--term-font);
          font-size: 12px;
          cursor: pointer;
          border: 2px solid ${isActive ? mode.color : "#555"};
          background: ${isActive
            ? `rgba(${this.hexToRgb(mode.color)}, 0.3)`
            : "rgba(0, 0, 0, 0.5)"
          };
          color: ${isActive ? mode.color : "#888"};
          transition: all 0.2s;
          min-width: 60px;
        `;

        tab.innerHTML = `
          <div style="font-size: 16px;">${mode.icon}</div>
          <div style="font-size: 10px;">${mode.name}</div>
        `;

        tab.onmouseenter = () => {
          if (!isActive) {
            tab.style.borderColor = mode.color;
            tab.style.color = mode.color;
          }
        };
        tab.onmouseleave = () => {
          if (!isActive) {
            tab.style.borderColor = "#555";
            tab.style.color = "#888";
          }
        };

        tab.onclick = () => {
          // 무기 모드 변경
          this.defenseGame.setWeaponMode(modeName);
          // 업그레이드 보너스 재적용
          this.applyHelperUpgradeBonuses();
          // 화면 새로고침
          this.showHelperUpgrades(overlay);
          this.terminal.printSystemMessage(`WEAPON MODE: ${modeName}`);
        };
      }

      weaponTabContainer.appendChild(tab);
    });

    overlay.appendChild(weaponTabContainer);

    // 현재 무기 설명
    const currentModeInfo = weaponModes[currentMode];
    const modeDesc = document.createElement("div");
    modeDesc.style.cssText = `
      color: ${currentModeInfo.color};
      font-family: var(--term-font);
      font-size: 11px;
      margin-bottom: 10px;
      text-align: center;
    `;
    modeDesc.innerHTML = `<span style="font-size: 14px;">${currentModeInfo.icon}</span> ${currentModeInfo.desc}`;
    if (currentModeInfo.hasReload) {
      modeDesc.innerHTML += ` <span style="color: #888;">(탄창: ${currentModeInfo.magazineSize})</span>`;
    }
    overlay.appendChild(modeDesc);

    // 현재 스탯 박스 (방법 B 스타일)
    const helper = this.defenseGame.helper;
    const statsBox = document.createElement("div");
    statsBox.style.cssText = `
      font-family: var(--term-font);
      font-size: 11px;
      margin-bottom: 15px;
      padding: 12px;
      border: 2px solid ${currentModeInfo.color};
      background: rgba(50, 50, 0, 0.3);
      width: 100%;
      max-width: 350px;
      box-sizing: border-box;
    `;
    statsBox.id = "helper-stats-box";
    this.updateHelperStatsBox(statsBox);
    overlay.appendChild(statsBox);

    // DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 업그레이드 목록
    const upgradeList = document.createElement("div");
    upgradeList.id = "helper-upgrade-list";
    upgradeList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 350px;
    `;

    // 조력자 업그레이드 옵션들 (MAX Lv.10, Move Speed 제거됨)
    const levels = this.upgradeLevels.helper;
    const maxLevels = this.upgradeMaxLevels.helper;
    const weaponMode = this.defenseGame.getCurrentWeaponMode();

    // 탄창 증가량 계산 (무기별 다름)
    const magIncrement = this.getMagazineIncrement(weaponMode.name);

    const upgrades = [
      {
        id: "damage",
        name: "Damage",
        increment: "+2.5",
        cost: 150,
        level: levels.damage,
        maxLevel: maxLevels.damage,
        effect: () => {
          this.upgradeLevels.helper.damage++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "fireRate",
        name: "Fire Rate",
        increment: "+0.6/s",
        cost: 200,
        level: levels.fireRate,
        maxLevel: maxLevels.fireRate,
        effect: () => {
          this.upgradeLevels.helper.fireRate++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "range",
        name: "Range",
        increment: "+20",
        cost: 100,
        level: levels.range,
        maxLevel: maxLevels.range,
        effect: () => {
          this.upgradeLevels.helper.range++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "projectileSpeed",
        name: "Bullet Speed",
        increment: "+50",
        cost: 180,
        level: levels.projectileSpeed,
        maxLevel: maxLevels.projectileSpeed,
        effect: () => {
          this.upgradeLevels.helper.projectileSpeed++;
          this.applyHelperUpgradeBonuses();
        },
      },
      {
        id: "magazineSize",
        name: "Magazine",
        increment: `+${magIncrement}`,
        cost: 120,
        level: levels.magazineSize,
        maxLevel: maxLevels.magazineSize,
        effect: () => {
          this.upgradeLevels.helper.magazineSize++;
          this.applyHelperUpgradeBonuses();
        },
      },
    ];

    this.renderHelperUpgradeButtons(upgradeList, upgrades, dataInfo, statsBox);
    overlay.appendChild(upgradeList);

    // 뒤로가기 버튼
    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 20px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  }

  /**
   * 조력자 업그레이드 버튼 렌더링 (MAX Level 체크 포함)
   */
  renderHelperUpgradeButtons(container, upgrades, dataInfo, statsBox) {
    container.innerHTML = "";
    const modeColor =
      this.defenseGame.getCurrentWeaponMode().color || "#ffff00";

    upgrades.forEach((upgrade) => {
      const btn = document.createElement("button");
      const isMaxLevel = upgrade.level >= upgrade.maxLevel;
      const canAfford = this.currentMoney >= upgrade.cost && !isMaxLevel;

      btn.style.cssText = `
        background: ${isMaxLevel
          ? "rgba(0, 100, 100, 0.4)"
          : canAfford
            ? "rgba(50, 80, 0, 0.6)"
            : "rgba(50, 50, 50, 0.5)"
        };
        border: 1px solid ${isMaxLevel ? "#00ffff" : canAfford ? modeColor : "#555"
        };
        color: ${isMaxLevel ? "#00ffff" : canAfford ? modeColor : "#666"};
        padding: 10px 12px;
        font-family: var(--term-font);
        font-size: 13px;
        cursor: ${canAfford ? "pointer" : "not-allowed"};
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const levelDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 11px;">MAX</span>`
        : `<span style="color: #888; font-size: 11px;">Lv.${upgrade.level}/${upgrade.maxLevel}</span>`;

      const costDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 12px;">-</span>`
        : `<span style="color: #ffcc00; font-size: 12px;">${upgrade.cost} MB</span>`;

      btn.innerHTML = `
        <div>
          <span style="font-weight: bold;">${upgrade.name}</span>
          <span style="color: #aaa; margin-left: 8px;">${upgrade.increment}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          ${levelDisplay}
          ${costDisplay}
        </div>
      `;

      btn.onclick = () => {
        if (isMaxLevel) return;
        if (this.currentMoney >= upgrade.cost) {
          this.currentMoney -= upgrade.cost;
          this.saveMoney(); // 자동 저장
          upgrade.effect();
          this.saveUpgrades(); // 업그레이드 레벨 저장
          upgrade.level = this.upgradeLevels.helper[upgrade.id];

          this.terminal.updateData(this.currentMoney);
          dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;

          // ===== 클릭 애니메이션 =====
          btn.style.transition = "all 0.15s ease-out";
          btn.style.background = "rgba(0, 200, 100, 0.8)";
          btn.style.borderColor = "#00ff88";
          btn.style.color = "#ffffff";
          btn.style.transform = "scale(1.03)";
          btn.style.boxShadow = "0 0 20px rgba(0, 255, 136, 0.6)";
          btn.innerHTML = `
            <div style="text-align: center; width: 100%;">
              <span style="font-size: 16px;">✓ UPGRADED!</span>
            </div>
          `;

          // 0.4초 후 원래대로 복구 + 레벨 업데이트
          setTimeout(() => {
            btn.style.transition = "all 0.2s ease-in";
            btn.style.transform = "scale(1)";
            btn.style.boxShadow = "none";

            // 스탯 박스 업데이트
            this.updateHelperStatsBox(statsBox);

            // 버튼 리렌더링 (레벨 업데이트)
            const levels = this.upgradeLevels.helper;
            const maxLevels = this.upgradeMaxLevels.helper;
            const activeMode = this.defenseGame.getCurrentWeaponMode();
            const magIncrement = this.getMagazineIncrement(activeMode.name);
            const newUpgrades = [
              {
                id: "damage",
                name: "Damage",
                increment: "+2.5",
                cost: 150,
                level: levels.damage,
                maxLevel: maxLevels.damage,
                effect: () => {
                  this.upgradeLevels.helper.damage++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "fireRate",
                name: "Fire Rate",
                increment: "+0.6/s",
                cost: 200,
                level: levels.fireRate,
                maxLevel: maxLevels.fireRate,
                effect: () => {
                  this.upgradeLevels.helper.fireRate++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "range",
                name: "Range",
                increment: "+20",
                cost: 100,
                level: levels.range,
                maxLevel: maxLevels.range,
                effect: () => {
                  this.upgradeLevels.helper.range++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "projectileSpeed",
                name: "Bullet Speed",
                increment: "+50",
                cost: 180,
                level: levels.projectileSpeed,
                maxLevel: maxLevels.projectileSpeed,
                effect: () => {
                  this.upgradeLevels.helper.projectileSpeed++;
                  this.applyHelperUpgradeBonuses();
                },
              },
              {
                id: "magazineSize",
                name: "Magazine",
                increment: `+${magIncrement}`,
                cost: 120,
                level: levels.magazineSize,
                maxLevel: maxLevels.magazineSize,
                effect: () => {
                  this.upgradeLevels.helper.magazineSize++;
                  this.applyHelperUpgradeBonuses();
                },
              },
            ];
            this.renderHelperUpgradeButtons(
              container,
              newUpgrades,
              dataInfo,
              statsBox
            );

            this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
          }, 400);

          return;
        }
      };

      container.appendChild(btn);
    });
  }

  /**
   * 조력자 스탯 박스 업데이트 (방법 B 스타일)
   */
  updateHelperStatsBox(element) {
    const helper = this.defenseGame.helper;
    const mode = this.defenseGame.getCurrentWeaponMode();
    const modeColor = mode.color || "#ffff00";

    // 탄창 크기 (기본 + 보너스)
    const totalMagazine = mode.magazineSize + (helper.magazineBonus || 0);

    // 특수 효과 표시
    let specialDisplay = "";
    if (mode.explosive) {
      specialDisplay = `<div style="color: #ff4400;">💥 폭발 반경: ${mode.explosionRadius}</div>`;
    }
    if (mode.piercing) {
      specialDisplay = `<div style="color: #00ffff;">⚡ 관통</div>`;
    }
    if (mode.projectileCount > 1) {
      specialDisplay += `<div style="color: #ff8800;">🔥 ${mode.projectileCount}발 산탄</div>`;
    }

    element.innerHTML = `
      <div style="color: ${modeColor}; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 5px;">
        ─── Current Stats ───
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #ccc;">
        <div>DMG: <span style="color: #fff;">${helper.damage.toFixed(
      1
    )}</span></div>
        <div>RATE: <span style="color: #fff;">${helper.fireRate.toFixed(
      1
    )}/s</span></div>
        <div>RNG: <span style="color: #fff;">${helper.range}</span></div>
        <div>BULLET: <span style="color: #fff;">${helper.projectileSpeed
      }</span></div>
        <div>MAG: <span style="color: #fff;">${totalMagazine}</span></div>
        <div>RELOAD: <span style="color: #fff;">${mode.reloadTime.toFixed(
        1
      )}s</span></div>
      </div>
      ${specialDisplay
        ? `<div style="margin-top: 8px; border-top: 1px solid #555; padding-top: 5px;">${specialDisplay}</div>`
        : ""
      }
    `;
  }

  /**
   * Hex 색상을 RGB 문자열로 변환
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(
        result[2],
        16
      )}, ${parseInt(result[3], 16)}`;
    }
    return "255, 255, 0"; // 기본값
  }

  /**
   * 조력자 업그레이드 보너스 적용
   */
  applyHelperUpgradeBonuses() {
    const levels = this.upgradeLevels.helper;
    const currentMode = this.defenseGame.getCurrentWeaponMode();

    // 레벨당 증가량 (MAX Lv.10, 최종 보너스 동일)
    const bonusDamage = levels.damage * 2.5; // Lv.10 = +25
    const bonusFireRate = levels.fireRate * 0.6; // Lv.10 = +6/s
    const bonusRange = levels.range * 20; // Lv.10 = +200
    const bonusBulletSpeed = levels.projectileSpeed * 50; // Lv.10 = +500

    // 탄창 보너스 (무기별 다름)
    const magIncrement = this.getMagazineIncrement(currentMode.name);
    const bonusMagazine = levels.magazineSize * magIncrement;

    this.defenseGame.applyUpgradeBonus(
      bonusDamage,
      bonusFireRate,
      bonusRange,
      bonusBulletSpeed,
      bonusMagazine
    );
  }

  /**
   * 무기별 탄창 증가량 반환
   */
  getMagazineIncrement(weaponName) {
    // 무기별 탄창 증가량 (컨셉에 맞게)
    const increments = {
      NORMAL: 2, // 12 → 32 (+20)
      SHOTGUN: 1, // 6 → 16 (+10)
      SNIPER: 1, // 3 → 13 (+10)
      RAPID: 5, // 30 → 80 (+50)
      LAUNCHER: 1, // 2 → 12 (+10)
    };
    return increments[weaponName] || 1;
  }

  /**
   * 코어 업그레이드 화면 (Depth 2) - 조력자 스타일로 리팩토링
   */
  showCoreUpgrades(overlay) {
    overlay.innerHTML = "";

    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ffff;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #00ffff;
    `;
    header.innerText = "[ CORE UPGRADES ]";
    overlay.appendChild(header);

    // 현재 스탯 박스
    const statsBox = document.createElement("div");
    statsBox.id = "core-stats-box";
    statsBox.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 11px;
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid #00ffff;
      background: rgba(0, 255, 255, 0.1);
      width: 100%;
      max-width: 350px;
      box-sizing: border-box;
    `;
    this.updateCoreStatsBox(statsBox);
    overlay.appendChild(statsBox);

    // DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 업그레이드 버튼 컨테이너
    const container = document.createElement("div");
    container.id = "core-upgrade-container";
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 350px;
    `;

    // 업그레이드 목록 (MAX Lv.10)
    const levels = this.upgradeLevels.core;
    const maxLevels = this.upgradeMaxLevels.core;
    const staticSystem = this.defenseGame.staticSystem;

    const upgrades = [
      {
        id: "hp",
        name: "Core HP",
        increment: "+10",
        cost: 100,
        level: levels.hp,
        maxLevel: maxLevels.hp,
        effect: () => {
          this.upgradeLevels.core.hp++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "turretDamage",
        name: "Turret Damage",
        increment: "+3",
        cost: 120,
        level: levels.turretDamage,
        maxLevel: maxLevels.turretDamage,
        effect: () => {
          this.upgradeLevels.core.turretDamage++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "turretRange",
        name: "Turret Range",
        increment: "+15",
        cost: 80,
        level: levels.turretRange,
        maxLevel: maxLevels.turretRange,
        effect: () => {
          this.upgradeLevels.core.turretRange++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "turretSpeed",
        name: "Bullet Speed",
        increment: "+30",
        cost: 100,
        level: levels.turretSpeed,
        maxLevel: maxLevels.turretSpeed,
        effect: () => {
          this.upgradeLevels.core.turretSpeed++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "fireRate",
        name: "Fire Rate",
        increment: "+0.5/s",
        cost: 140,
        level: levels.fireRate,
        maxLevel: maxLevels.fireRate,
        effect: () => {
          this.upgradeLevels.core.fireRate++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "staticDamage",
        name: "⚡ Static Damage",
        increment: "+5",
        cost: 150,
        level: levels.staticDamage,
        maxLevel: maxLevels.staticDamage,
        effect: () => {
          this.upgradeLevels.core.staticDamage++;
          this.applyCoreUpgradeBonuses();
        },
      },
      {
        id: "staticChain",
        name: "⚡ Chain Count",
        increment: "+1",
        cost: 200,
        level: levels.staticChain,
        maxLevel: maxLevels.staticChain,
        effect: () => {
          this.upgradeLevels.core.staticChain++;
          this.applyCoreUpgradeBonuses();
        },
      },
    ];

    this.renderCoreUpgradeButtons(container, upgrades, dataInfo, statsBox);
    overlay.appendChild(container);

    // 뒤로가기 버튼
    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 20px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  }

  /**
   * 코어 스탯 박스 업데이트
   */
  updateCoreStatsBox(element) {
    const core = this.defenseGame.core;
    const turret = this.defenseGame.turret;
    const staticSystem = this.defenseGame.staticSystem;

    element.innerHTML = `
      <div style="color: #00ffff; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 5px;">
        ─── Current Stats ───
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #ccc;">
        <div>HP: <span style="color: #fff;">${core.hp}/${core.maxHp
      }</span></div>
        <div>T.DMG: <span style="color: #fff;">${turret.damage}</span></div>
        <div>T.RNG: <span style="color: #fff;">${turret.range}</span></div>
        <div>T.SPD: <span style="color: #fff;">${turret.projectileSpeed
      }</span></div>
      </div>
      <div style="margin-top: 8px; border-top: 1px solid #555; padding-top: 5px; color: #ffff00;">
        <div>⚡ Static: <span style="color: #fff;">${staticSystem.damage
      } DMG</span> | <span style="color: #fff;">${staticSystem.chainCount
      } chains</span></div>
        <div>⚡ Charge: <span style="color: #fff;">${Math.floor(
        staticSystem.currentCharge
      )}/${staticSystem.maxCharge}</span></div>
      </div>
    `;
  }

  /**
   * 코어 업그레이드 버튼 렌더링
   */
  renderCoreUpgradeButtons(container, upgrades, dataInfo, statsBox) {
    container.innerHTML = "";

    upgrades.forEach((upgrade) => {
      const isMaxLevel = upgrade.level >= upgrade.maxLevel;

      const btn = document.createElement("button");
      btn.style.cssText = `
        background: ${isMaxLevel ? "rgba(0, 255, 255, 0.2)" : "rgba(0, 50, 50, 0.8)"
        };
        border: 2px solid ${isMaxLevel ? "#00ffff" : "#00aaaa"};
        color: ${isMaxLevel ? "#00ffff" : "#00ffff"};
        padding: 12px 15px;
        font-family: var(--term-font);
        font-size: 12px;
        cursor: ${isMaxLevel ? "default" : "pointer"};
        text-align: left;
        transition: all 0.2s;
        opacity: ${isMaxLevel ? "0.7" : "1"};
      `;

      const levelDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-weight: bold;">MAX</span>`
        : `Lv.${upgrade.level}/${upgrade.maxLevel}`;

      btn.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${upgrade.name} <span style="color: #88ff88;">${upgrade.increment
        }</span></span>
          <span style="font-size: 11px;">${levelDisplay}</span>
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 3px;">
          ${isMaxLevel ? "최대 레벨 도달" : `Cost: ${upgrade.cost} DATA`}
        </div>
      `;

      if (!isMaxLevel) {
        btn.onmouseenter = () => {
          btn.style.background = "rgba(0, 100, 100, 0.8)";
          btn.style.borderColor = "#00ffff";
        };
        btn.onmouseleave = () => {
          btn.style.background = "rgba(0, 50, 50, 0.8)";
          btn.style.borderColor = "#00aaaa";
        };

        btn.onclick = () => {
          if (this.currentMoney >= upgrade.cost) {
            this.currentMoney -= upgrade.cost;
            this.saveMoney(); // 자동 저장
            upgrade.effect();
            this.saveUpgrades(); // 업그레이드 레벨 저장

            // 클릭 애니메이션
            btn.style.transform = "scale(0.95)";
            btn.style.boxShadow = "0 0 20px #00ffff";

            // UI 업데이트 (즉시)
            dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
            this.updateCoreStatsBox(statsBox);

            // 애니메이션 후 버튼 리렌더링 (200ms 지연)
            setTimeout(() => {
              btn.style.transform = "scale(1)";
              btn.style.boxShadow = "none";

              // 버튼 리렌더링
              const levels = this.upgradeLevels.core;
              const maxLevels = this.upgradeMaxLevels.core;
              const newUpgrades = [
                {
                  id: "hp",
                  name: "Core HP",
                  increment: "+10",
                  cost: 100,
                  level: levels.hp,
                  maxLevel: maxLevels.hp,
                  effect: () => {
                    this.upgradeLevels.core.hp++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "turretDamage",
                  name: "Turret Damage",
                  increment: "+3",
                  cost: 120,
                  level: levels.turretDamage,
                  maxLevel: maxLevels.turretDamage,
                  effect: () => {
                    this.upgradeLevels.core.turretDamage++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "turretRange",
                  name: "Turret Range",
                  increment: "+15",
                  cost: 80,
                  level: levels.turretRange,
                  maxLevel: maxLevels.turretRange,
                  effect: () => {
                    this.upgradeLevels.core.turretRange++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "turretSpeed",
                  name: "Bullet Speed",
                  increment: "+30",
                  cost: 100,
                  level: levels.turretSpeed,
                  maxLevel: maxLevels.turretSpeed,
                  effect: () => {
                    this.upgradeLevels.core.turretSpeed++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "fireRate",
                  name: "Fire Rate",
                  increment: "+0.5/s",
                  cost: 140,
                  level: levels.fireRate,
                  maxLevel: maxLevels.fireRate,
                  effect: () => {
                    this.upgradeLevels.core.fireRate++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "staticDamage",
                  name: "⚡ Static Damage",
                  increment: "+5",
                  cost: 150,
                  level: levels.staticDamage,
                  maxLevel: maxLevels.staticDamage,
                  effect: () => {
                    this.upgradeLevels.core.staticDamage++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
                {
                  id: "staticChain",
                  name: "⚡ Chain Count",
                  increment: "+1",
                  cost: 200,
                  level: levels.staticChain,
                  maxLevel: maxLevels.staticChain,
                  effect: () => {
                    this.upgradeLevels.core.staticChain++;
                    this.applyCoreUpgradeBonuses();
                  },
                },
              ];
              this.renderCoreUpgradeButtons(
                container,
                newUpgrades,
                dataInfo,
                statsBox
              );
            }, 200); // 애니메이션 후 리렌더링

            this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
          } else {
            this.terminal.printSystemMessage("NOT ENOUGH DATA!", "error");
          }
        };
      }

      container.appendChild(btn);
    });
  }

  /**
   * 코어 업그레이드 보너스 적용
   */
  applyCoreUpgradeBonuses() {
    const levels = this.upgradeLevels.core;

    // 기본값
    const baseMaxHp = 100;
    const baseTurretDamage = 10;
    const baseTurretRange = 200;
    const baseTurretSpeed = 300;
    const baseTurretFireRate = 4;
    const baseStaticDamage = 10;
    const baseStaticChain = 3;

    // 보너스 계산
    const bonusHp = levels.hp * 10;
    const bonusTurretDamage = levels.turretDamage * 3;
    const bonusTurretRange = levels.turretRange * 15;
    const bonusTurretSpeed = levels.turretSpeed * 30;
    const bonusTurretFireRate = levels.fireRate * 0.5;
    const bonusStaticDamage = levels.staticDamage * 5;
    const bonusStaticChain = levels.staticChain * 1;

    // 적용
    const hpDiff = baseMaxHp + bonusHp - this.defenseGame.core.maxHp;
    this.defenseGame.core.maxHp = baseMaxHp + bonusHp;
    if (hpDiff > 0) this.defenseGame.core.hp += hpDiff; // 최대 HP 증가분만큼 현재 HP도 증가

    this.defenseGame.turret.damage = baseTurretDamage + bonusTurretDamage;
    this.defenseGame.turret.range = baseTurretRange + bonusTurretRange;
    this.defenseGame.turret.projectileSpeed =
      baseTurretSpeed + bonusTurretSpeed;
    this.defenseGame.turret.fireRate =
      baseTurretFireRate + bonusTurretFireRate;

    this.defenseGame.staticSystem.damage = baseStaticDamage + bonusStaticDamage;
    this.defenseGame.staticSystem.chainCount =
      baseStaticChain + bonusStaticChain;

    debugLog("GameManager", "Core upgrade bonus applied:", {
      maxHp: this.defenseGame.core.maxHp,
      turretDamage: this.defenseGame.turret.damage,
      turretRange: this.defenseGame.turret.range,
      staticDamage: this.defenseGame.staticSystem.damage,
      staticChain: this.defenseGame.staticSystem.chainCount,
    });
  }

  /**
   * 아군 바이러스 업그레이드 화면 (Depth 2) - 메인/서브 + 슬롯 시스템
   */
  showAllyUpgrades(overlay) {
    overlay.innerHTML = "";

    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      color: #00aaff;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #00aaff;
    `;
    header.innerText = "[ ALLY CONFIGURATION ]";
    overlay.appendChild(header);

    // 현재 DATA 표시
    const dataInfo = document.createElement("div");
    dataInfo.id = "ally-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 14px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    // 슬롯 정보 박스
    const slotInfo = document.createElement("div");
    slotInfo.id = "ally-slot-info";
    slotInfo.style.cssText = `
      background: rgba(0, 50, 80, 0.5);
      border: 1px solid #00aaff;
      padding: 10px;
      margin-bottom: 15px;
      font-family: var(--term-font);
      font-size: 12px;
      color: #aaa;
      width: 100%;
      max-width: 350px;
      box-sizing: border-box;
    `;
    this.updateAllySlotInfo(slotInfo);
    overlay.appendChild(slotInfo);

    // 메인 컨테이너 (스크롤 가능 + 터미널 스타일 스크롤바)
    const mainContainer = document.createElement("div");
    mainContainer.className = "terminal-scrollbar";
    mainContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 350px;
      max-height: 50vh;
      overflow-y: auto;
      padding-right: 5px;
    `;

    // 터미널 스타일 스크롤바 CSS 추가 (한 번만)
    if (!document.getElementById("terminal-scrollbar-style")) {
      const scrollStyle = document.createElement("style");
      scrollStyle.id = "terminal-scrollbar-style";
      scrollStyle.textContent = `
        .terminal-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .terminal-scrollbar::-webkit-scrollbar-track {
          background: #111;
          border: 1px solid #333;
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb {
          background: #00ff00;
          border: 1px solid #00aa00;
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00ff88;
        }
      `;
      document.head.appendChild(scrollStyle);
    }

    // === 메인 타입 선택 ===
    const mainSection = document.createElement("div");
    mainSection.style.cssText = `
      background: rgba(0, 100, 50, 0.2);
      border: 2px solid #00ff88;
      padding: 8px;
    `;

    const mainTitle = document.createElement("div");
    mainTitle.style.cssText = `
      color: #00ff88;
      font-family: var(--term-font);
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
    `;
    mainTitle.innerText = "★ MAIN (70%)";
    mainSection.appendChild(mainTitle);

    const mainTypeGrid = document.createElement("div");
    mainTypeGrid.id = "main-type-grid";
    mainTypeGrid.style.cssText = `
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      justify-content: center;
    `;
    this.renderVirusTypeButtons(mainTypeGrid, "main", slotInfo);
    mainSection.appendChild(mainTypeGrid);
    mainContainer.appendChild(mainSection);

    // === 서브 타입 선택 ===
    const subSection = document.createElement("div");
    subSection.style.cssText = `
      background: rgba(100, 50, 0, 0.2);
      border: 2px solid #ffaa00;
      padding: 8px;
    `;

    const subTitle = document.createElement("div");
    subTitle.style.cssText = `
      color: #ffaa00;
      font-family: var(--term-font);
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
    `;
    subTitle.innerText = "☆ SUB TYPE (30%)";
    subSection.appendChild(subTitle);

    const subTypeGrid = document.createElement("div");
    subTypeGrid.id = "sub-type-grid";
    subTypeGrid.style.cssText = `
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      justify-content: center;
    `;
    this.renderVirusTypeButtons(subTypeGrid, "sub", slotInfo);
    subSection.appendChild(subTypeGrid);
    mainContainer.appendChild(subSection);

    // === 시너지 표시 ===
    const synergyBox = document.createElement("div");
    synergyBox.id = "synergy-box";
    synergyBox.style.cssText = `
      background: rgba(80, 0, 80, 0.3);
      border: 1px solid #ff00ff;
      padding: 10px;
      text-align: center;
    `;
    this.updateSynergyDisplay(synergyBox);
    mainContainer.appendChild(synergyBox);

    // === 업그레이드 섹션 ===
    const upgradeSection = document.createElement("div");
    upgradeSection.style.cssText = `
      background: rgba(0, 50, 50, 0.3);
      border: 1px solid #00aaaa;
      padding: 10px;
    `;

    const upgradeTitle = document.createElement("div");
    upgradeTitle.style.cssText = `
      color: #00ffff;
      font-family: var(--term-font);
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    `;
    upgradeTitle.innerText = "⬆ UPGRADES";
    upgradeSection.appendChild(upgradeTitle);

    const upgradeGrid = document.createElement("div");
    upgradeGrid.id = "ally-upgrade-grid";
    upgradeGrid.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
    this.renderAllyUpgradeButtons(upgradeGrid, dataInfo, slotInfo);
    upgradeSection.appendChild(upgradeGrid);
    mainContainer.appendChild(upgradeSection);

    overlay.appendChild(mainContainer);

    // 뒤로가기 버튼
    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 15px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  }

  /**
   * 슬롯 정보 업데이트
   */
  updateAllySlotInfo(element) {
    const baseSlots = 12;
    const bonusSlots = this.upgradeLevels.ally.slots;
    const totalSlots = baseSlots + bonusSlots;

    const { mainCount, subCount, mainType, subType } =
      this.calculateAllyDistribution();
    const mainSlots = mainType
      ? mainCount * this.virusTypes[mainType].slotCost
      : 0;
    const subSlots = subType ? subCount * this.virusTypes[subType].slotCost : 0;
    const usedSlots = mainSlots + subSlots;

    element.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #00aaff;">TOTAL SLOTS:</span>
        <span style="color: #fff;">${usedSlots} / ${totalSlots}</span>
      </div>
      <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #00ff88 0%, #00ff88 ${(mainSlots / totalSlots) * 100
      }%, #ffaa00 ${(mainSlots / totalSlots) * 100}%, #ffaa00 ${(usedSlots / totalSlots) * 100
      }%, #333 ${(usedSlots / totalSlots) * 100
      }%); height: 100%; width: 100%;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px;">
        <span style="color: #00ff88;">● Main: ${mainCount}마리 (${mainSlots}슬롯)</span>
        <span style="color: #ffaa00;">● Sub: ${subCount}마리 (${subSlots}슬롯)</span>
      </div>
      <div style="margin-top: 5px; color: #888; font-size: 10px;">
        최소 보장: 3마리 | 메인 70% / 서브 30% (남은 슬롯 자동 충원)
      </div>
    `;
  }

  /**
   * 아군 분배 계산 (슬롯 기반)
   * 
   * 핵심 원칙:
   * 1. 슬롯 100% 활용 (낭비 최소화)
   * 2. 메인 우세 = 슬롯 점유율 기준 (mainSlots >= subSlots)
   * 3. 총 마리수 최대화
   * 4. 같은 조건이면 메인 마리수 우선
   */
  calculateAllyDistribution() {
    const baseSlots = 12;
    const bonusSlots = this.upgradeLevels.ally.slots;
    const totalSlots = baseSlots + bonusSlots;

    const mainType = this.allyConfig.mainType;
    const subType = this.allyConfig.subType;

    const mainCost = mainType ? this.virusTypes[mainType].slotCost : 1;
    const subCost = subType ? this.virusTypes[subType].slotCost : 1;

    let mainCount = 0;
    let subCount = 0;

    if (!subType) {
      // 서브 없음: 전부 메인
      mainCount = Math.floor(totalSlots / mainCost);
    } else {
      // 모든 가능한 조합을 탐색하여 최적의 배치 찾기
      let bestMain = 0;
      let bestSub = 0;
      let bestScore = -1;

      const maxMain = Math.floor(totalSlots / mainCost);
      const maxSub = Math.floor(totalSlots / subCost);

      // 메인 수를 높은 쪽부터 탐색 (같은 점수면 메인 많은 쪽 우선)
      for (let m = maxMain; m >= 1; m--) {
        const mainSlots = m * mainCost;
        const remainingSlots = totalSlots - mainSlots;

        for (let s = Math.floor(remainingSlots / subCost); s >= 1; s--) {
          const subSlots = s * subCost;
          const usedSlots = mainSlots + subSlots;

          // 조건 검사
          if (usedSlots > totalSlots) continue;  // 슬롯 초과
          if (mainSlots <= subSlots) continue;    // 메인이 슬롯 점유율로 엄격히 우세해야 함 (70%/30% 의도)

          // 점수 계산: 슬롯 활용도(최우선) > 총 마리수 > 메인 마리수
          const totalUnits = m + s;
          const score = usedSlots * 10000 + totalUnits * 100 + m;

          if (score > bestScore) {
            bestMain = m;
            bestSub = s;
            bestScore = score;
          }
        }
      }

      // 조합을 못 찾은 경우 (극단적 케이스: 서브 1마리도 못 넣는 경우)
      if (bestMain === 0) {
        // 메인만 최대한 채우고, 남은 슬롯으로 서브 채우기
        bestMain = Math.floor(totalSlots / mainCost);
        const remaining = totalSlots - bestMain * mainCost;
        bestSub = Math.floor(remaining / subCost);
      }

      mainCount = bestMain;
      subCount = bestSub;
    }

    // 최소 3마리 보장
    const total = mainCount + subCount;
    if (total < 3) {
      mainCount = Math.max(3 - subCount, mainCount);
    }

    return { mainCount, subCount, mainType, subType, totalSlots };
  }

  /**
   * 바이러스 타입 해금 여부 확인
   * @param {string} virusType - 바이러스 타입 키 (TANK, HUNTER 등)
   * @returns {boolean} 해금되었으면 true
   */
  isVirusUnlocked(virusType) {
    // SWARM만 기본 해금
    if (virusType === "SWARM") return true;

    // virusUnlockTargets에 있는 타입은 해금 필요
    if (!this.virusUnlockTargets.includes(virusType)) return true;

    // 해금 진행률 100% 이상이면 해금
    return (this.decryptionProgress[virusType] || 0) >= 100;
  }

  /**
   * 무기 모드 해금 여부 확인
   * @param {string} weaponMode - 무기 모드 키 (SHOTGUN, SNIPER 등)
   * @returns {boolean} 해금되었으면 true
   */
  isWeaponUnlocked(weaponMode) {
    // NORMAL만 기본 해금
    if (weaponMode === "NORMAL") return true;

    // weaponUnlockTargets에 있는 타입은 해금 필요
    if (!this.weaponUnlockTargets.includes(weaponMode)) return true;

    // 해금 진행률 100% 이상이면 해금
    return (this.decryptionProgress[weaponMode] || 0) >= 100;
  }

  /**
   * 특정 대상을 해금하는 스테이지 이름 반환
   * @param {string} target - 해금 대상 (바이러스 또는 무기)
   * @returns {string|null} 스테이지 이름 또는 null
   */
  getUnlockStageName(target) {
    const stageNames = {
      1: "ALPHA",
      2: "BETA",
      4: "GAMMA",
      5: "DELTA",
      6: "BOSS"
    };

    for (const [stageId, targets] of Object.entries(this.stageUnlockTargets)) {
      if (Array.isArray(targets) && targets.includes(target)) {
        return stageNames[stageId] || `STAGE ${stageId}`;
      }
    }
    return null;
  }

  /**
   * 바이러스 타입 버튼 렌더링
   */
  renderVirusTypeButtons(container, slot, slotInfoElement) {
    container.innerHTML = "";

    const currentType =
      slot === "main" ? this.allyConfig.mainType : this.allyConfig.subType;

    // 컴팩트 버튼 스타일 (정사각형, 한 줄에 모두 표시)
    const btnBaseStyle = `
      width: 52px;
      height: 52px;
      padding: 4px;
      font-family: var(--term-font);
      font-size: 8px;
      text-align: center;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;

    // 서브 슬롯에는 "없음" 옵션 추가
    if (slot === "sub") {
      const noneBtn = document.createElement("button");
      const isSelected = currentType === null;
      noneBtn.style.cssText = `
        ${btnBaseStyle}
        background: ${isSelected ? "rgba(100, 100, 100, 0.5)" : "rgba(30, 30, 30, 0.5)"};
        border: 1px solid ${isSelected ? "#ffffff" : "#555"};
        color: ${isSelected ? "#fff" : "#888"};
        cursor: pointer;
      `;
      noneBtn.innerHTML = `<div style="font-size: 12px;">✗</div><div style="font-size: 7px;">없음</div>`;
      noneBtn.onclick = () => {
        this.allyConfig.subType = null;
        this.saveAllyConfig();
        this.renderVirusTypeButtons(container, slot, slotInfoElement);
        this.updateAllySlotInfo(slotInfoElement);
        this.updateSynergyDisplay(document.getElementById("synergy-box"));
      };
      container.appendChild(noneBtn);
    }

    Object.entries(this.virusTypes).forEach(([typeKey, typeData]) => {
      const btn = document.createElement("button");
      const isSelected = currentType === typeKey;
      const isDisabled = slot === "sub" && typeKey === this.allyConfig.mainType;
      const isLocked = !this.isVirusUnlocked(typeKey);
      const unlockProgress = this.decryptionProgress[typeKey] || 0;
      const unlockStage = this.getUnlockStageName(typeKey);

      // 잠긴 상태 스타일 (진행률에 따라 아이콘이 왼→오로 채워짐)
      if (isLocked) {
        const progress = Math.min(100, unlockProgress);
        const clipRight = 100 - progress; // 오른쪽에서 얼마나 자를지

        btn.style.cssText = `
          ${btnBaseStyle}
          background: rgba(20, 20, 20, 0.9);
          border: 1px solid #333;
          cursor: not-allowed;
          position: relative;
          overflow: hidden;
        `;
        btn.innerHTML = `
          <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <!-- 어두운 아이콘 (배경) -->
            <div style="position: absolute; font-size: 18px; filter: grayscale(100%) brightness(0.3);">${typeData.icon}</div>
            <!-- 밝은 아이콘 (진행률만큼 clip) -->
            <div style="position: absolute; font-size: 18px; clip-path: inset(0 ${clipRight}% 0 0); filter: drop-shadow(0 0 3px ${typeData.color});">${typeData.icon}</div>
            <!-- 진행률 텍스트 -->
            <div style="position: absolute; bottom: 2px; font-size: 8px; color: ${progress >= 100 ? '#00ff00' : '#00aaff'}; text-shadow: 0 0 3px #000;">
              ${progress >= 100 ? '✓' : progress + '%'}
            </div>
            <!-- 잠금 표시 (진행률 낮을 때만) -->
            ${progress < 30 ? '<div style="position: absolute; top: 2px; right: 2px; font-size: 8px;">🔒</div>' : ''}
          </div>
        `;
      } else {
        btn.style.cssText = `
          ${btnBaseStyle}
          background: ${isSelected ? `${typeData.color}33` : "rgba(30, 30, 30, 0.5)"};
          border: 1px solid ${isSelected ? typeData.color : isDisabled ? "#333" : "#555"};
          color: ${isDisabled ? "#444" : typeData.color};
          cursor: ${isDisabled ? "not-allowed" : "pointer"};
          opacity: ${isDisabled ? "0.4" : "1"};
        `;
        btn.innerHTML = `
          <div style="font-size: 12px;">${typeData.icon}</div>
          <div style="font-size: 7px;">${typeData.name}</div>
        `;

        if (!isDisabled) {
          btn.onclick = () => {
            if (slot === "main") {
              this.allyConfig.mainType = typeKey;
              if (this.allyConfig.subType === typeKey) {
                this.allyConfig.subType = null;
              }
              this.renderVirusTypeButtons(container, slot, slotInfoElement);
              const subGrid = document.getElementById("sub-type-grid");
              if (subGrid) this.renderVirusTypeButtons(subGrid, "sub", slotInfoElement);
            } else {
              this.allyConfig.subType = typeKey;
              this.renderVirusTypeButtons(container, slot, slotInfoElement);
            }
            this.saveAllyConfig();
            this.updateAllySlotInfo(slotInfoElement);
            this.updateSynergyDisplay(document.getElementById("synergy-box"));
          };
        }
      }

      container.appendChild(btn);
    });
  }

  /**
   * 시너지 표시 업데이트
   */
  updateSynergyDisplay(element) {
    if (!element) return;

    const main = this.allyConfig.mainType;
    const sub = this.allyConfig.subType;

    if (!sub) {
      // 순수 특화 보너스
      const typeData = this.virusTypes[main];
      element.innerHTML = `
        <div style="color: #ff00ff; font-family: var(--term-font); font-size: 12px; margin-bottom: 5px;">
          🔗 PURE SPECIALIZATION
        </div>
        <div style="color: #fff; font-family: var(--term-font); font-size: 14px;">
          ${typeData.icon} ${main} 순수 특화
        </div>
        <div style="color: #aaa; font-family: var(--term-font); font-size: 11px; margin-top: 5px;">
          해당 타입 능력치 +30%
        </div>
      `;
      return;
    }

    // 시너지 찾기
    const synergyKey1 = `${main}+${sub}`;
    const synergyKey2 = `${sub}+${main}`;
    const synergy = this.synergies[synergyKey1] || this.synergies[synergyKey2];

    if (synergy) {
      element.innerHTML = `
        <div style="color: #ff00ff; font-family: var(--term-font); font-size: 12px; margin-bottom: 5px;">
          🔗 SYNERGY ACTIVE!
        </div>
        <div style="color: #fff; font-family: var(--term-font); font-size: 14px;">
          "${synergy.name}"
        </div>
        <div style="color: #aaa; font-family: var(--term-font); font-size: 11px; margin-top: 5px;">
          ${synergy.desc}
        </div>
      `;
    } else {
      element.innerHTML = `
        <div style="color: #666; font-family: var(--term-font); font-size: 12px;">
          🔗 시너지 없음
        </div>
        <div style="color: #888; font-family: var(--term-font); font-size: 11px; margin-top: 5px;">
          다른 조합을 시도해보세요!
        </div>
      `;
    }
  }

  /**
   * 아군 업그레이드 버튼 렌더링
   */
  renderAllyUpgradeButtons(container, dataInfo, slotInfo) {
    container.innerHTML = "";

    const levels = this.upgradeLevels.ally;
    const maxLevels = this.upgradeMaxLevels.ally;

    const upgrades = [
      {
        id: "slots",
        name: "슬롯 확장",
        increment: "+1 슬롯",
        cost: 200,
        level: levels.slots,
        maxLevel: maxLevels.slots,
        effect: () => {
          this.upgradeLevels.ally.slots++;
        },
      },
      {
        id: "hp",
        name: "바이러스 HP",
        increment: "+10%",
        cost: 150,
        level: levels.hp,
        maxLevel: maxLevels.hp,
        effect: () => {
          this.upgradeLevels.ally.hp++;
        },
      },
      {
        id: "damage",
        name: "바이러스 데미지",
        increment: "+10%",
        cost: 180,
        level: levels.damage,
        maxLevel: maxLevels.damage,
        effect: () => {
          this.upgradeLevels.ally.damage++;
        },
      },
      {
        id: "speed",
        name: "이동 속도",
        increment: "+5%",
        cost: 120,
        level: levels.speed,
        maxLevel: maxLevels.speed,
        effect: () => {
          this.upgradeLevels.ally.speed++;
        },
      },
      {
        id: "respawn",
        name: "리스폰 속도",
        increment: "-0.15초",
        cost: 100,
        level: levels.respawn,
        maxLevel: maxLevels.respawn,
        effect: () => {
          this.upgradeLevels.ally.respawn++;
        },
      },
    ];

    upgrades.forEach((upgrade) => {
      const isMaxLevel = upgrade.level >= upgrade.maxLevel;
      const canAfford = this.currentMoney >= upgrade.cost && !isMaxLevel;

      const btn = document.createElement("button");
      btn.style.cssText = `
        background: ${isMaxLevel
          ? "rgba(0, 100, 100, 0.4)"
          : canAfford
            ? "rgba(0, 80, 80, 0.6)"
            : "rgba(50, 50, 50, 0.5)"
        };
        border: 1px solid ${isMaxLevel ? "#00ffff" : canAfford ? "#00aaff" : "#555"
        };
        color: ${isMaxLevel ? "#00ffff" : canAfford ? "#00aaff" : "#666"};
        padding: 8px 10px;
        font-family: var(--term-font);
        font-size: 11px;
        cursor: ${canAfford ? "pointer" : "not-allowed"};
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const levelDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 10px;">MAX</span>`
        : `<span style="color: #888; font-size: 10px;">Lv.${upgrade.level}/${upgrade.maxLevel}</span>`;

      const costDisplay = isMaxLevel
        ? `<span style="color: #00ffff; font-size: 10px;">-</span>`
        : `<span style="color: #ffcc00; font-size: 10px;">${upgrade.cost} MB</span>`;

      btn.innerHTML = `
        <div>
          <span style="font-weight: bold;">${upgrade.name}</span>
          <span style="color: #aaa; margin-left: 6px;">${upgrade.increment}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${levelDisplay}
          ${costDisplay}
        </div>
      `;

      btn.onclick = () => {
        if (isMaxLevel || !canAfford) return;

        this.currentMoney -= upgrade.cost;
        this.saveMoney(); // 자동 저장
        upgrade.effect();
        this.saveUpgrades(); // 업그레이드 레벨 저장

        // UI 업데이트
        this.terminal.updateData(this.currentMoney);
        dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
        this.updateAllySlotInfo(slotInfo);
        this.renderAllyUpgradeButtons(container, dataInfo, slotInfo);

        this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
      };

      container.appendChild(btn);
    });
  }

  /**
   * 아군 바이러스 설정 정보 가져오기 (DefenseGame용)
   */
  getAllyConfiguration() {
    const { mainCount, subCount, mainType, subType } =
      this.calculateAllyDistribution();
    const levels = this.upgradeLevels.ally;

    // 업그레이드 보너스 계산
    const hpMultiplier = 1 + levels.hp * 0.1; // +10%/Lv
    const damageMultiplier = 1 + levels.damage * 0.1; // +10%/Lv
    const speedMultiplier = 1 + levels.speed * 0.05; // +5%/Lv
    const respawnReduction = levels.respawn * 0.15; // -0.15초/Lv

    // 시너지 확인
    const synergyKey1 = `${mainType}+${subType}`;
    const synergyKey2 = `${subType}+${mainType}`;
    const synergy = this.synergies[synergyKey1] || this.synergies[synergyKey2];

    // 순수 특화 보너스 (서브 없을 때)
    const isPureSpecialization = !subType;

    return {
      mainType,
      subType,
      mainCount,
      subCount,
      mainTypeData: this.virusTypes[mainType],
      subTypeData: subType ? this.virusTypes[subType] : null,
      hpMultiplier,
      damageMultiplier,
      speedMultiplier,
      respawnTime: Math.max(0.5, 2 - respawnReduction), // 기본 2초, 최소 0.5초
      synergy: synergy || null,
      isPureSpecialization,
      pureBonus: isPureSpecialization ? 1.3 : 1.0, // 순수 특화 +30%
    };
  }

  /**
   * 실드 업그레이드 화면 (Depth 2) - 기본 구현
   */
  showShieldUpgrades(overlay) {
    overlay.innerHTML = "";

    const header = document.createElement("div");
    header.style.cssText = `
      color: #00ff88;
      font-family: var(--term-font);
      font-size: 20px;
      margin-bottom: 10px;
      text-shadow: 0 0 10px #00ff88;
    `;
    header.innerText = "[ SHIELD UPGRADES ]";
    overlay.appendChild(header);

    // 현재 스탯 표시
    const core = this.defenseGame.core;
    const statsInfo = document.createElement("div");
    statsInfo.style.cssText = `
      color: #aaa;
      font-family: var(--term-font);
      font-size: 12px;
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid #444;
      background: rgba(0, 0, 0, 0.5);
    `;
    statsInfo.id = "shield-stats-info";
    statsInfo.innerHTML = `
      <div>Shield HP: ${core.shieldHp}/${core.shieldMaxHp}</div>
    `;
    overlay.appendChild(statsInfo);

    const dataInfo = document.createElement("div");
    dataInfo.id = "upgrade-data-display";
    dataInfo.style.cssText = `
      color: #00f0ff;
      font-family: var(--term-font);
      font-size: 16px;
      margin-bottom: 15px;
    `;
    dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;
    overlay.appendChild(dataInfo);

    const upgradeList = document.createElement("div");
    upgradeList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 350px;
    `;

    const upgrades = [
      {
        id: "shield_hp",
        name: "Shield HP +20",
        cost: 150,
        desc: `현재: ${core.shieldMaxHp}`,
        effect: () => {
          this.defenseGame.core.shieldMaxHp += 20;
          this.defenseGame.core.shieldHp += 20;
        },
      },
    ];

    this.renderUpgradeButtons(
      upgradeList,
      upgrades,
      dataInfo,
      statsInfo,
      "shield"
    );
    overlay.appendChild(upgradeList);

    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      margin-top: 20px;
      background: transparent;
      border: 1px solid #888;
      color: #888;
      padding: 10px 30px;
      font-family: var(--term-font);
      font-size: 14px;
      cursor: pointer;
    `;
    backBtn.innerText = "← BACK";
    backBtn.onclick = () => this.showUpgradeCategories(overlay);
    overlay.appendChild(backBtn);
  }

  /**
   * 업그레이드 버튼 렌더링 공통 함수
   */
  renderUpgradeButtons(container, upgrades, dataInfo, statsInfo, category) {
    upgrades.forEach((upgrade) => {
      const btn = document.createElement("button");
      const canAfford = this.currentMoney >= upgrade.cost;

      btn.style.cssText = `
        background: ${canAfford ? "rgba(0, 100, 50, 0.5)" : "rgba(50, 50, 50, 0.5)"
        };
        border: 1px solid ${canAfford ? "#00ff00" : "#555"};
        color: ${canAfford ? "#00ff00" : "#666"};
        padding: 12px 15px;
        font-family: var(--term-font);
        font-size: 14px;
        cursor: ${canAfford ? "pointer" : "not-allowed"};
        text-align: left;
      `;

      btn.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${upgrade.name}</span>
          <span style="color: #ffcc00; font-size: 12px;">${upgrade.cost} MB</span>
        </div>
        <div style="font-size: 11px; color: #888; margin-top: 3px;">${upgrade.desc}</div>
      `;

      btn.onclick = () => {
        if (this.currentMoney >= upgrade.cost) {
          this.currentMoney -= upgrade.cost;
          this.saveMoney(); // 자동 저장
          upgrade.effect();
          this.saveUpgrades(); // 업그레이드 레벨 저장
          this.terminal.updateData(this.currentMoney);
          dataInfo.innerText = `Available DATA: ${this.currentMoney} MB`;

          // 스탯 정보 업데이트
          if (category === "helper") {
            this.updateHelperStatsDisplay(statsInfo);
          } else if (category === "core") {
            const core = this.defenseGame.core;
            const turret = this.defenseGame.turret;
            statsInfo.innerHTML = `
              <div>HP: ${core.hp}/${core.maxHp}</div>
              <div>Turret Damage: ${turret.damage}</div>
            `;
          } else if (category === "shield") {
            const core = this.defenseGame.core;
            statsInfo.innerHTML = `
              <div>Shield HP: ${core.shieldHp}/${core.shieldMaxHp}</div>
            `;
          }

          // 모든 버튼 상태 업데이트
          container.querySelectorAll("button").forEach((b) => {
            const cost =
              parseInt(b.querySelector('span[style*="ffcc00"]')?.textContent) ||
              0;
            const afford = this.currentMoney >= cost;
            b.style.background = afford
              ? "rgba(0, 100, 50, 0.5)"
              : "rgba(50, 50, 50, 0.5)";
            b.style.borderColor = afford ? "#00ff00" : "#555";
            b.style.color = afford ? "#00ff00" : "#666";
            b.style.cursor = afford ? "pointer" : "not-allowed";
          });

          this.terminal.printSystemMessage(`UPGRADED: ${upgrade.name}`);
        }
      };

      container.appendChild(btn);
    });
  }

  /**
   * 조력자 스탯 표시 업데이트
   */
  updateHelperStatsDisplay(element) {
    const helper = this.defenseGame.helper;
    element.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
        <div>Damage: <span style="color: #ffff00;">${helper.damage}</span></div>
        <div>Fire Rate: <span style="color: #ffff00;">${helper.fireRate.toFixed(
      1
    )}/s</span></div>
        <div>Range: <span style="color: #ffff00;">${helper.range}</span></div>
        <div>Speed: <span style="color: #ffff00;">${helper.speed}</span></div>
      </div>
    `;
  }

  /**
   * 새 아이템 시스템용 장착 슬롯 요소 생성
   */
  createEquipSlotElement(item, index, isUnlocked, readOnly = false) {
    const slot = document.createElement("div");

    const bgColor = !isUnlocked ? "rgba(50, 50, 50, 0.5)"
      : item ? "rgba(0, 100, 50, 0.5)"
        : "rgba(0, 0, 0, 0.3)";
    const borderColor = !isUnlocked ? "#333" : item ? "#00ff00" : "#555";

    slot.style.cssText = `
      width: 55px;
      height: 55px;
      border: 2px solid ${borderColor};
      background: ${bgColor};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: var(--term-font);
      font-size: 8px;
      color: #fff;
      cursor: ${readOnly || !isUnlocked ? "default" : "pointer"};
      transition: all 0.2s;
      border-radius: 5px;
    `;

    if (!isUnlocked) {
      // 잠긴 슬롯
      const lockIcon = document.createElement("div");
      lockIcon.style.cssText = "font-size: 16px; color: #555;";
      lockIcon.innerText = "🔒";
      slot.appendChild(lockIcon);

      const cost = this.inventoryManager.slotUnlockCosts[index - 1];
      if (cost) {
        const costLabel = document.createElement("div");
        costLabel.style.cssText = "font-size: 7px; color: #666; margin-top: 2px;";
        costLabel.innerText = `${cost} DATA`;
        slot.appendChild(costLabel);
      }
    } else if (item) {
      // 아이템 있음
      const color = this.itemDatabase.getRarityColor(item.rarity);

      const icon = document.createElement("div");
      icon.style.cssText = `font-size: 18px;`;
      icon.innerText = item.icon;
      slot.appendChild(icon);

      const name = document.createElement("div");
      name.style.cssText = `font-size: 6px; color: ${color}; text-align: center; margin-top: 2px;`;
      name.innerText = item.name.split(" ")[0]; // 첫 단어만
      slot.appendChild(name);
    } else {
      // 빈 슬롯
      const empty = document.createElement("div");
      empty.style.cssText = "color: #444; font-size: 10px;";
      empty.innerText = "EMPTY";
      slot.appendChild(empty);
    }

    if (isUnlocked && !readOnly) {
      slot.onmouseenter = () => {
        slot.style.borderColor = "#00ff00";
        slot.style.boxShadow = "0 0 10px #00ff0050";
      };
      slot.onmouseleave = () => {
        slot.style.borderColor = item ? "#00ff00" : "#555";
        slot.style.boxShadow = "none";
      };
    }

    return slot;
  }

  /**
   * 인벤토리 슬롯 요소 생성
   */
  createInventorySlotElement(item, index) {
    const slot = document.createElement("div");

    const bgColor = item ? "rgba(0, 80, 50, 0.5)" : "rgba(0, 0, 0, 0.3)";
    const borderColor = item ? this.itemDatabase.getRarityColor(item.rarity) : "#333";

    slot.style.cssText = `
      width: 50px;
      height: 50px;
      border: 1px solid ${borderColor};
      background: ${bgColor};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: var(--term-font);
      cursor: ${item ? "pointer" : "default"};
      transition: all 0.2s;
      border-radius: 3px;
    `;

    if (item) {
      const color = this.itemDatabase.getRarityColor(item.rarity);

      const icon = document.createElement("div");
      icon.style.cssText = `font-size: 16px;`;
      icon.innerText = item.icon;
      slot.appendChild(icon);

      const name = document.createElement("div");
      name.style.cssText = `font-size: 5px; color: ${color}; text-align: center;`;
      name.innerText = item.name.split(" ").slice(0, 2).join(" ");
      slot.appendChild(name);

      slot.onmouseenter = () => {
        slot.style.boxShadow = `0 0 8px ${color}`;
        slot.style.transform = "scale(1.05)";
      };
      slot.onmouseleave = () => {
        slot.style.boxShadow = "none";
        slot.style.transform = "scale(1)";
      };
    } else {
      slot.style.opacity = "0.3";
    }

    return slot;
  }

  /**
   * 장착 슬롯 클릭 처리
   */
  handleEquipSlotClick(slotIdx, data, overlay) {
    const isUnlocked = slotIdx < data.unlockedSlots;

    if (!isUnlocked) {
      // 슬롯 해금 시도
      const result = this.inventoryManager.unlockSlot(this.currentMoney, (cost) => {
        this.currentMoney -= cost;
        this.saveMoney();
        this.terminal.updateData(this.currentMoney);
      });

      if (result.success) {
        this.showNotification(result.message, "#00ff00");
        this.refreshInventoryUI(overlay);
      } else {
        this.showNotification(result.message, "#ff0000");
      }
    } else if (data.equipSlots[slotIdx]) {
      // 장착 해제
      const result = this.inventoryManager.unequip(slotIdx);
      if (result.success) {
        this.showNotification(result.message, "#ffaa00");
        this.refreshInventoryUI(overlay);
      } else {
        this.showNotification(result.message, "#ff0000");
      }
    }
  }

  /**
   * 인벤토리 아이템 클릭 처리 (첫 번째 빈 슬롯에 장착)
   */
  handleInventoryItemClick(invIdx, overlay) {
    const data = this.inventoryManager.getData();

    // 첫 번째 빈 해금 슬롯 찾기
    let targetSlot = -1;
    for (let i = 0; i < data.unlockedSlots; i++) {
      if (!data.equipSlots[i]) {
        targetSlot = i;
        break;
      }
    }

    if (targetSlot === -1) {
      this.showNotification("모든 슬롯이 사용 중!", "#ff0000");
      return;
    }

    const result = this.inventoryManager.equip(invIdx, targetSlot);
    if (result.success) {
      this.showNotification(result.message, "#00ff00");
      this.refreshInventoryUI(overlay);
    } else {
      this.showNotification(result.message, "#ff0000");
    }
  }

  /**
   * 인벤토리 UI 새로고침
   */
  refreshInventoryUI(overlay) {
    overlay.remove();
    this.showInventory();
  }

  /**
   * 간단한 알림 표시
   */
  showNotification(message, color = "#00ff00") {
    const existing = document.getElementById("simple-notification");
    if (existing) existing.remove();

    const notif = document.createElement("div");
    notif.id = "simple-notification";
    notif.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid ${color};
      color: ${color};
      padding: 10px 20px;
      font-family: var(--term-font);
      font-size: 12px;
      z-index: 99999;
      border-radius: 5px;
    `;
    notif.innerText = message;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 2000);
  }

  /**
   * 슬롯 요소 생성 (레거시)
   */
  createSlotElement(item, slotType, index, isEquipSlot) {
    const slot = document.createElement("div");
    slot.style.cssText = `
      width: 50px;
      height: 50px;
      border: 1px solid ${isEquipSlot ? "#00ff00" : "#555"};
      background: ${item ? "rgba(0, 100, 50, 0.5)" : "rgba(0, 0, 0, 0.3)"};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: var(--term-font);
      font-size: 8px;
      color: #fff;
      cursor: pointer;
      transition: all 0.2s;
    `;

    if (isEquipSlot) {
      const typeLabel = document.createElement("div");
      typeLabel.style.cssText =
        "font-size: 6px; color: #00ff00; margin-bottom: 2px;";
      typeLabel.innerText = slotType;
      slot.appendChild(typeLabel);
    }

    if (item) {
      const itemName = document.createElement("div");
      itemName.style.cssText = "font-size: 7px; text-align: center;";
      itemName.innerText = item.name || "ITEM";
      slot.appendChild(itemName);
    } else {
      const empty = document.createElement("div");
      empty.style.cssText = "color: #333;";
      empty.innerText = "-";
      slot.appendChild(empty);
    }

    slot.onmouseenter = () => {
      slot.style.borderColor = "#00ff00";
      slot.style.boxShadow = "0 0 10px #00ff00";
    };
    slot.onmouseleave = () => {
      slot.style.borderColor = isEquipSlot ? "#00ff00" : "#555";
      slot.style.boxShadow = "none";
    };

    return slot;
  }

  /**
   * 터미널 애니메이션 재생
   * @param {string} text 표시할 텍스트
   * @param {boolean} keepOverlay 애니메이션 후 오버레이 유지 여부 (기본값 false)
   * @returns {Promise<HTMLElement|void>} keepOverlay가 true면 오버레이 요소 반환
   */
  async playTerminalAnimation(text, keepOverlay = false) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #000;
        z-index: 4000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: var(--term-font);
        color: #00ff00;
        font-size: 18px;
      `;

      const textEl = document.createElement("div");
      textEl.style.textShadow = "0 0 10px #00ff00";
      overlay.appendChild(textEl);
      document.body.appendChild(overlay);

      let i = 0;
      const typeInterval = setInterval(() => {
        if (i < text.length) {
          textEl.innerText = text.substring(0, i + 1) + "_";
          i++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            if (keepOverlay) {
              textEl.remove(); // 텍스트만 지우고 배경 유지
              resolve(overlay);
            } else {
              overlay.style.opacity = "0";
              overlay.style.transition = "opacity 0.3s";
              setTimeout(() => {
                overlay.remove();
                resolve();
              }, 300);
            }
          }, 200);
        }
      }, 30);
    });
  }

  /**
   * 스테이지 진입 애니메이션 (코어 낙하)
   */
  async playCoreDropAnimation() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: transparent;
        z-index: 4000;
        pointer-events: none;
      `;

      const core = document.createElement("div");
      core.style.cssText = `
        position: absolute;
        left: 50%;
        top: -100px;
        transform: translateX(-50%);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: radial-gradient(circle, #00ffff, #0066ff);
        box-shadow: 0 0 30px #00ffff, 0 0 60px #0066ff;
        transition: top 0.8s ease-in;
      `;
      overlay.appendChild(core);
      document.body.appendChild(overlay);

      // 코어 낙하
      setTimeout(() => {
        core.style.top = "50%";
        core.style.transform = "translate(-50%, -50%)";
      }, 50);

      // 착지 효과
      setTimeout(() => {
        core.style.boxShadow =
          "0 0 50px #00ffff, 0 0 100px #0066ff, 0 0 150px #00ffff";

        setTimeout(() => {
          overlay.style.opacity = "0";
          overlay.style.transition = "opacity 0.5s";
          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 500);
        }, 300);
      }, 850);
    });
  }

  loadPermanentPerks() {
    // 저장된 영구 퍽 ID 목록 로드 (v2 Map 구조)
    const saved = localStorage.getItem("acquired_perm_perks_v2");
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        this.acquiredPermPerks = new Map(Object.entries(obj));
      } catch (e) {
        console.error("Failed to load perks", e);
        this.acquiredPermPerks = new Map();
        this.acquiredPermPerks.set("root", 1);
      }
    } else {
      // 구버전 데이터 마이그레이션
      const oldSaved = localStorage.getItem("acquired_perm_perks");
      if (oldSaved) {
        try {
          const ids = JSON.parse(oldSaved);
          this.acquiredPermPerks = new Map();
          this.acquiredPermPerks.set("root", 1);
          if (Array.isArray(ids)) {
            ids.forEach((id) => this.acquiredPermPerks.set(id, 1));
          }
          this.savePermanentPerks();
        } catch (e) {
          this.acquiredPermPerks = new Map();
          this.acquiredPermPerks.set("root", 1);
        }
      } else {
        this.acquiredPermPerks = new Map();
        this.acquiredPermPerks.set("root", 1);
      }
    }

    // 효과 적용
    this.applyPermanentEffects();
  }

  savePermanentPerks() {
    const obj = Object.fromEntries(this.acquiredPermPerks);
    localStorage.setItem("acquired_perm_perks_v2", JSON.stringify(obj));
  }

  applyPermanentEffects() {
    // 효과 초기화 (저장된 money는 유지!)
    // this.currentMoney는 loadSavedMoney()에서 이미 로드됨
    this.perkManager.activeEffects.scoreMultiplier = 1.0;
    this.perkManager.activeEffects.shopDiscount = 0.0;

    // 시작 머니 보너스는 별도 저장 (새 게임 시작 시에만 적용)
    this.startMoneyBonus = 0;
    let bonusMoney = 0;
    let bonusScore = 0;
    let bonusLuck = 0;
    let bonusDiscount = 0;

    this.acquiredPermPerks.forEach((level, id) => {
      let nodeId = id;
      let nodeLevel = level;

      if (typeof id === "string") {
        nodeId = id;
        nodeLevel = level;
      } else if (typeof level === "string") {
        nodeId = level;
        nodeLevel = 1;
      }

      const node = this.permTree.find((n) => n.id === nodeId);
      if (node && node.effect) {
        if (node.effect.startMoney)
          bonusMoney += node.effect.startMoney * nodeLevel;
        if (node.effect.scoreMult)
          bonusScore += node.effect.scoreMult * nodeLevel;
        if (node.effect.luck) bonusLuck += node.effect.luck * nodeLevel;
        if (node.effect.discount)
          bonusDiscount += node.effect.discount * nodeLevel;
      }
    });

    // 시작 머니 보너스는 저장만 해두고, 새 게임 시작 시에만 적용
    this.startMoneyBonus = bonusMoney;
    // currentMoney는 건드리지 않음 (이미 로드된 값 유지)
    this.perkManager.activeEffects.scoreMultiplier += bonusScore;
    this.perkManager.activeEffects.bombChance += bonusLuck;
    this.perkManager.activeEffects.goldChance += bonusLuck;
    this.perkManager.activeEffects.miscChance += bonusLuck * 0.5;
    this.perkManager.activeEffects.shopDiscount += bonusDiscount;
  }

  loadReputation() {
    const saved = localStorage.getItem("hacker_reputation");
    if (saved) {
      this.reputation = parseInt(saved, 10);
    }
  }

  saveReputation() {
    localStorage.setItem("hacker_reputation", this.reputation.toString());
  }

  consumeRevive() {
    if (this.perkManager.activeEffects.reviveCount > 0) {
      this.perkManager.activeEffects.reviveCount--;
      return true;
    }
    return false;
  }

  async startIntro() {
    this.terminal.show();
    await this.terminal.typeText("Initializing HACKER_PROTOCOL v22...", 20);
    await new Promise((r) => setTimeout(r, 500));
    await this.terminal.typeText("Connecting to local proxy...", 20);
    await new Promise((r) => setTimeout(r, 500));

    if (true) {
      await this.terminal.typeText(`REP LEVEL: ${this.reputation}`, 20);

      // 영구 강화 메뉴 진입 여부 확인
      await this.terminal.typeText("Access System Upgrades?", 30);
      const choice = await this.terminal.showChoices([
        { text: "YES (Spend Reputation)", value: "yes" },
        { text: "NO (Start Operation)", value: "no" },
      ]);

      if (choice === "yes") {
        await this.enterPermanentShop();
      }
    }

    await this.terminal.typeText("반갑다. 신입.", 50);
    await new Promise((r) => setTimeout(r, 800));
    await this.terminal.typeText("실전에 투입되기 전에 테스트를 거치겠다.", 40);
    await this.terminal.typeText(
      "간단한 보안벽이다. 데이터 3줄을 탈취해라.",
      40
    );

    await this.terminal.waitForEnter();
    this.startTutorial();
  }

  async enterPermanentShop() {
    // 이벤트 리스너 (업그레이드 처리)
    const upgradeHandler = async (e) => {
      const { nodeId, cost } = e.detail;
      const node = this.permTree.find((n) => n.id === nodeId);

      if (node && this.reputation >= cost) {
        this.reputation -= cost;
        const currentLvl = this.acquiredPermPerks.get(nodeId) || 0;
        this.acquiredPermPerks.set(nodeId, currentLvl + 1);

        this.saveReputation();
        this.savePermanentPerks();

        // UI 갱신 (다시 그리기)
        const mapContainer = document.querySelector(".node-map");
        if (mapContainer) {
          mapContainer.innerHTML = ""; // 비우기
          this.terminal.renderPermanentNodeMap(
            mapContainer,
            this.permTree,
            this.acquiredPermPerks,
            this.reputation
          );
          // 상단 REP 갱신
          const repEl = document.getElementById("shop-money-val");
          if (repEl) repEl.innerText = this.reputation;
        }
      }
    };

    document.addEventListener("perm-upgrade", upgradeHandler);

    await this.terminal.showPermanentShop(
      this.permTree,
      this.acquiredPermPerks,
      this.reputation
    );

    document.removeEventListener("perm-upgrade", upgradeHandler);

    this.perkManager.reset();
    this.applyPermanentEffects();
  }

  startTutorial() {
    this.currentStage = 0;
    this.currentMoney = 0;
    this.perkManager.reset();

    this.terminal.printSystemMessage("Entering Simulation Mode...");

    // 튜토리얼은 예외적으로 바로 테트리스 시작
    this.activeMode = "mining";
    this.transitionToGame(3, 1000);
  }

  async handleMiningClear(linesCleared) {
    // 획득한 데이터 계산
    const earnedData = (linesCleared || 0) * 100;
    this.currentMoney += earnedData;
    this.saveMoney(); // 자동 저장

    // --- 클리어 연출 시작 ---
    await this.terminal.showMiningCompleteSequence();

    // 3. 게임 화면 페이드 아웃 및 터미널 복귀
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();

    if (this.currentStage === 0) {
      // 튜토리얼 클리어
      localStorage.setItem("tutorial_completed", "true");
      await this.terminal.typeText("ACCESS GRANTED.", 30);
      await this.terminal.typeText(`Data Acquired: ${earnedData} MB`, 20);
      await new Promise((r) => setTimeout(r, 1000));
      await this.terminal.typeText("나쁘지 않군. 시뮬레이션 종료.", 40);
      await this.terminal.typeText(
        "이제 진짜다. 보안 시스템 메인프레임에 접속한다.",
        40
      );

      await this.terminal.waitForEnter();
      this.switchMode("defense");
    } else {
      // 일반 스테이지 클리어 -> 분기점 (상점 or Defense 복귀)
      await this.terminal.typeText(`System Log: Mining complete.`, 10);
      await this.terminal.typeText(`BATCH ${this.currentStage} CLEARED.`, 30);
      await this.terminal.typeText(`Data Mined: ${earnedData} MB`, 20);
      await this.terminal.typeText(
        `Total Storage: ${this.currentMoney} MB`,
        20
      );
      await this.terminal.typeText("Waiting for next command...", 30);

      const choice = await this.terminal.showChoices([
        { text: "/return_base (Defense Mode)", value: "defense" },
        { text: "/access_darknet (Open Shop)", value: "shop" },
        { text: "/continue_mining (Next Batch)", value: "next" },
      ]);

      if (choice === "shop") {
        await this.enterShop();
      } else if (choice === "defense") {
        this.switchMode("defense");
      } else {
        this.switchMode("mining"); // 다시 채굴 시작 (스테이지 증가는 switchMode 내부에서 처리하거나 여기서?)
        // switchMode('mining')은 이미 activeMode가 mining이면 스테이지 증가 로직을 타야 함.
        // 현재 로직상 switchMode('mining')이 내부적으로 startMiningStage를 부르므로 OK.
      }
    }
  }

  async enterShop() {
    // 상점 이벤트 리스너 임시 등록 (구매 처리)
    const buyHandler = (e) => {
      const { perkId, cost } = e.detail;
      if (this.currentMoney >= cost) {
        this.currentMoney -= cost;
        this.saveMoney(); // 자동 저장
        this.perkManager.unlock(perkId);
        this.terminal.showShop(this.perkManager, this.currentMoney).then(() => {
          this.switchMode("defense"); // 상점 나가면 디펜스로 복귀
          document.removeEventListener("perk-buy", buyHandler);
        });
      }
    };
    document.addEventListener("perk-buy", buyHandler);

    await this.terminal.showShop(this.perkManager, this.currentMoney);

    document.removeEventListener("perk-buy", buyHandler);
    this.switchMode("defense");
  }

  startBreachMode() {
    const targetLines = 10; // 고정 목표 라인 수
    const speed = 600; // 적당한 속도

    setTimeout(() => {
      document.getElementById("game-container").style.display = "block"; // 먼저 보이게
      document.getElementById("game-container").style.opacity = 1;
      document.getElementById("game-ui").style.display = "block";
      this.terminal.setTransparentMode(true);

      this.tetrisGame.startGame(targetLines, speed);
    }, 500);
  }

  startMiningStage() {
    this.terminal.printSystemMessage(
      `Injecting Payload... Batch ${this.currentStage}`
    );

    // 퍽 효과 적용
    const effects = this.perkManager.getEffects();

    // 난이도 계산
    let baseSpeed = Math.max(100, 800 - (this.currentStage - 1) * 60);
    let finalSpeed = baseSpeed * effects.speedModifier;

    // 목표 라인: 스테이지 * 5
    let targetLines = this.currentStage * 5;

    this.transitionToGame(targetLines, finalSpeed);
  }

  transitionToGame(targetLines, speed) {
    setTimeout(() => {
      document.getElementById("game-container").style.display = "block"; // 먼저 보이게
      document.getElementById("game-container").style.opacity = 1;
      document.getElementById("game-ui").style.display = "block";
      this.terminal.setTransparentMode(true);

      this.tetrisGame.startGame(targetLines, speed);
    }, 1000);
  }

  async handleMiningGameOver(score) {
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();

    const effects = this.perkManager.getEffects();
    const finalScore = Math.floor(score * effects.scoreMultiplier);

    // 평판 획득 (점수 1000점당 1, 스테이지당 10)
    const earnedRep = Math.floor(finalScore / 1000) + this.currentStage * 10;
    this.reputation += earnedRep;
    this.saveReputation();

    document.getElementById("game-over-screen").classList.remove("hidden");
    document.getElementById("final-score").innerText = finalScore;

    let repEl = document.getElementById("earned-rep");
    if (!repEl) {
      repEl = document.createElement("div");
      repEl.id = "earned-rep";
      repEl.style.color = "#33ff00";
      repEl.style.marginTop = "10px";
      const btn = document.querySelector("#game-over-screen button");
      if (btn) btn.parentNode.insertBefore(repEl, btn);
      else document.getElementById("game-over-screen").appendChild(repEl);
    }
    repEl.innerText = `REPUTATION GAINED: ${earnedRep} (TOTAL: ${this.reputation})`;

    // 게임오버 시 리셋 버튼 동작을 가로채서 GameManager가 처리해야 함.
    // 현재는 location.reload()가 걸려있을 수 있음. -> index.html 확인 필요.
    // 하지만 여기서 Defense 모드로 복귀시켜주는게 더 자연스러움.
    // "SYSTEM FAILURE. RETURNING TO SAFE MODE..."

    // 일단 기존 구조 유지 (재시작 버튼 클릭 시 페이지 리로드)
  }

  async handleBreachClear(lines) {
    debugLog("GameManager", "handleBreachClear 호출됨, lines:", lines);
    debugLog("GameManager", "isConquestMode:", this.isConquestMode);

    // 점령 모드인 경우 별도 처리
    if (this.isConquestMode) {
      debugLog("GameManager", "점령 모드이므로 handleConquestTetrisClear 호출");
      this.handleConquestTetrisClear();
      return;
    }

    // 일반 브리치 모드 - 장비 획득
    const item = this.equipmentManager.generateEquipment(
      this.defenseGame.currentPage || 1
    );
    this.equipmentManager.addItem(item);

    // 연출
    this.tetrisGame.state.isPlaying = false;
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();

    await this.terminal.typeText("THREAT ELIMINATED.", 30);
    await this.terminal.typeText("Security Systems Restored.", 20);
    await this.terminal.typeText(`[LOOT ACQUIRED]`, 30);

    await this.terminal.typeText(`> ${item.name}`, 30);
    await this.terminal.typeText(`Power: ${item.stats.power}`, 20);

    if (this.equipmentManager.autoEquip(item)) {
      await this.terminal.typeText("(Auto Equipped!)", 20);
    }

    await this.terminal.waitForEnter();

    // 획득 아이템 요약 표시
    this.showLootSummary();

    // 디펜스로 복귀 (장비 효과 적용)
    this.switchMode("defense");
  }

  async handleBreachFail(score) {
    // 점령 모드인 경우 별도 처리
    if (this.isConquestMode) {
      // 테트리스 실패 = 페널티 (적 증가)
      this.tetrisGame.state.isPlaying = false;

      // 테트리스 완전히 숨기기 (중요!)
      document.getElementById("game-container").style.display = "none";
      document.getElementById("game-ui").style.display = "none";
      this.showConquestTetrisUI(); // 상단 UI 복구
      this.restoreNextBoxPosition(); // NEXT 블록 위치 복구

      // 터미널을 디펜스 모드로 설정 (투명 배경 + 캔버스 클릭 가능)
      this.terminal.setDefenseMode(true);
      this.terminal.show();

      this.terminal.printSystemMessage("BREACH DEFENSE FAILED!");
      this.terminal.printSystemMessage("Enemy reinforcements incoming!");

      // 적 다수 스폰 (페널티)
      for (let i = 0; i < 5; i++) {
        this.defenseGame.spawnEnemy();
      }

      // 디펜스 화면 복구
      this.defenseGame.canvas.style.display = "block";
      this.defenseGame.uiLayer.style.display = "block";

      // 미니 패널 제거
      const panel = document.getElementById("mini-defense-panel");
      if (panel) panel.remove();

      // 디펜스는 계속 (강화 페이지 완료까지)
      // defenseMonitorLoop가 계속 돌아감
      return;
    }

    // 일반 브리치 모드 - 패배 시 복귀
    this.tetrisGame.state.isPlaying = false;
    document.getElementById("game-container").style.opacity = 0;
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();

    await this.terminal.typeText("DEFENSE FAILED.", 50);
    await this.terminal.typeText("Systems compromised...", 30);
    await this.terminal.typeText("Returning to core defense.", 30);

    await new Promise((r) => setTimeout(r, 1500));

    this.switchMode("defense");
  }

  async handleConquest() {
    // 1. 점령 로직 실행 (병합 등 계산)
    const result = this.conquestManager.conquerStage();

    // 2. 터미널 연출
    this.terminal.setDefenseMode(false);

    await this.terminal.typeText("!!! SYSTEM CONQUERED !!!", 30);
    await this.terminal.typeText(`Total Conquered: ${result.total}`, 20);
    await this.terminal.typeText(`Mining Rate: ${result.miningRate}/sec`, 20);

    if (result.total % 2 === 0) {
      await this.terminal.typeText(">> SECTORS MERGED <<", 30);
      await this.terminal.typeText(
        `Allied Virus Level Up: ${result.level}`,
        30
      );
    }

    await this.terminal.waitForEnter();

    // 3. 디펜스 게임에 아군 정보 업데이트
    const alliedInfo = this.conquestManager.getAlliedInfo();
    this.defenseGame.updateAlliedInfo(alliedInfo);
    this.defenseGame.updateAlliedConfig(this.getAllyConfiguration());

    // 4. 다시 디펜스 모드로 복귀 (다음 스테이지 느낌으로)
    this.terminal.setDefenseMode(true);
    this.terminal.printSystemMessage("ADVANCING TO NEXT SECTOR...");

    // 난이도 상승 등 추가 처리가 필요하다면 여기서
  }

  async handleDefenseGameOver() {
    // 1. 게임 오버 페널티 적용 (30%만 유지)
    const oldMoney = this.currentMoney;
    const newMoney = this.applyGameOverPenalty();
    const lostMoney = oldMoney - newMoney;

    // 2. UI 연출 (붉은색 경고)
    this.terminal.setDefenseMode(false); // 다시 배경 어둡게

    // 붉은색 텍스트 스타일
    const errorStyle =
      "color: #ff3333; font-weight: bold; text-shadow: 0 0 10px #f00;";

    // 긴급 메시지 출력
    await this.terminal.typeText("!!! WARNING !!!", 10);
    await this.terminal.typeText("CORE INTEGRITY REACHED 0%", 10);
    await this.terminal.typeText("SYSTEM CRITICAL FAILURE.", 30);
    await this.terminal.typeText("ALL PROCESSES TERMINATED.", 20);

    // 자원 손실 표시
    await new Promise((r) => setTimeout(r, 500));
    await this.terminal.typeText(`DATA LOSS: -${lostMoney} MB (70% lost)`, 15);
    await this.terminal.typeText(`REMAINING DATA: ${newMoney} MB`, 15);

    await new Promise((r) => setTimeout(r, 1000));

    // 재시작 선택지
    const choice = await this.terminal.showChoices([
      { text: "SYSTEM REBOOT (Restart Game)", value: "reboot" },
    ]);

    if (choice === "reboot") {
      location.reload(); // 페이지 새로고침
    }
  }

  // === 자원 영구 저장 (localStorage) ===

  /**
   * 업그레이드 기본값 반환 (sanitize용)
   */
  getDefaultUpgrades() {
    return {
      helper: { damage: 0, fireRate: 0, range: 0, projectileSpeed: 0, magazineSize: 0 },
      core: { hp: 0, turretDamage: 0, turretRange: 0, turretSpeed: 0, fireRate: 0, staticDamage: 0, staticChain: 0 },
      shield: { hp: 0 },
      ally: { slots: 0, hp: 0, damage: 0, speed: 0, respawn: 0 },
    };
  }

  /**
   * 업그레이드 데이터 검증 및 정리 (whitelist 방식)
   */
  sanitizeUpgrades(raw) {
    const defaults = this.getDefaultUpgrades();
    const cleaned = this.getDefaultUpgrades();

    if (!raw || typeof raw !== "object") return cleaned;

    for (const group of Object.keys(defaults)) {
      const rawGroup = raw[group];
      if (!rawGroup || typeof rawGroup !== "object") continue;

      for (const stat of Object.keys(defaults[group])) {
        const v = rawGroup[stat];
        const n = Number(v);
        // 유효한 숫자만 허용, 음수 방지, 정수로 변환
        cleaned[group][stat] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      }
    }

    return cleaned;
  }

  /**
   * 업그레이드 레벨을 localStorage에 저장
   */
  saveUpgrades() {
    try {
      const payload = JSON.stringify(this.upgradeLevels);
      localStorage.setItem("cylinderTetris_upgrades", payload);
      debugLog("GameManager", "✓ Upgrades saved");
    } catch (e) {
      console.warn("[GameManager] Failed to save upgrades:", e);
    }
  }

  /**
   * localStorage에서 업그레이드 레벨 로드
   */
  loadUpgrades() {
    try {
      const saved = localStorage.getItem("cylinderTetris_upgrades");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.upgradeLevels = this.sanitizeUpgrades(parsed);
        debugLog("GameManager", "✓ Upgrades loaded:", this.upgradeLevels);
        return;
      }
    } catch (e) {
      console.warn("[GameManager] Failed to load upgrades:", e);
    }
    // 실패 시 기본값 사용
    this.upgradeLevels = this.getDefaultUpgrades();
  }

  /**
   * 아군 설정을 localStorage에 저장
   */
  saveAllyConfig() {
    try {
      const payload = JSON.stringify(this.allyConfig);
      localStorage.setItem("cylinderTetris_allyConfig", payload);
      debugLog("GameManager", "✓ Ally config saved:", this.allyConfig);
    } catch (e) {
      console.warn("[GameManager] Failed to save ally config:", e);
    }
  }

  /**
   * localStorage에서 아군 설정 로드
   */
  loadAllyConfig() {
    try {
      const saved = localStorage.getItem("cylinderTetris_allyConfig");
      if (saved) {
        const parsed = JSON.parse(saved);
        // 유효성 검증
        if (parsed && typeof parsed === "object") {
          if (parsed.mainType && this.virusTypes[parsed.mainType]) {
            this.allyConfig.mainType = parsed.mainType;
          }
          if (parsed.subType === null || this.virusTypes[parsed.subType]) {
            this.allyConfig.subType = parsed.subType;
          }
          debugLog("GameManager", "✓ Ally config loaded:", this.allyConfig);
          return;
        }
      }
    } catch (e) {
      console.warn("[GameManager] Failed to load ally config:", e);
    }
    // 실패 시 기본값 유지
  }

  /**
   * 자원을 localStorage에 저장
   */

  saveDecryptionProgress() {
    try {
      localStorage.setItem("cylinderTetris_decryption", JSON.stringify(this.decryptionProgress));
    } catch (e) { }
  }

  loadDecryptionProgress() {
    try {
      const saved = localStorage.getItem("cylinderTetris_decryption");
      if (saved) this.decryptionProgress = JSON.parse(saved);
    } catch (e) { }
  }

  saveMoney() {
    try {
      // 0으로 저장되는 경우 스택 트레이스 출력 (문제 추적용)
      if (this.currentMoney === 0) {
        console.warn(`[GameManager] ⚠️ Saving 0! Stack trace:`);
        console.trace();
      } else {
        debugLog("GameManager", `Saving money: ${this.currentMoney}`);
      }
      localStorage.setItem(
        "cylinderTetris_money",
        this.currentMoney.toString()
      );
      // 저장 확인
      const verify = localStorage.getItem("cylinderTetris_money");
      debugLog("GameManager", `✓ Verified saved: ${verify}`);
    } catch (e) {
      console.warn("Failed to save money to localStorage:", e);
    }
  }

  /**
   * localStorage에서 자원 로드
   */
  loadSavedMoney() {
    try {
      const saved = localStorage.getItem("cylinderTetris_money");
      debugLog("GameManager", `Raw localStorage value: "${saved}"`);
      if (saved !== null) {
        const amount = parseInt(saved, 10);
        if (!isNaN(amount) && amount >= 0) {
          debugLog("GameManager", `✓ Loaded saved money: ${amount}`);
          return amount;
        } else {
          console.warn(`[GameManager] Invalid saved value: ${saved} -> parsed: ${amount}`);
        }
      } else {
        debugLog("GameManager", `No saved money found (key: cylinderTetris_money)`);
      }
    } catch (e) {
      console.warn("Failed to load money from localStorage:", e);
    }
    return 0; // 저장된 값이 없으면 0
  }

  /**
   * 자원 추가 (자동 저장)
   */
  addMoney(amount) {
    this.currentMoney += amount;
    this.saveMoney();
    this.terminal.updateData(this.currentMoney);
  }

  /**
   * 자원 차감 (자동 저장)
   */
  spendMoney(amount) {
    if (this.currentMoney >= amount) {
      this.currentMoney -= amount;
      this.saveMoney();
      this.terminal.updateData(this.currentMoney);
      return true;
    }
    return false;
  }

  /**
   * 게임 오버 시 자원 페널티 (30%만 유지)
   */
  applyGameOverPenalty() {
    const remainingPercent = 0.3; // 30% 유지
    const oldMoney = this.currentMoney;
    this.currentMoney = Math.floor(this.currentMoney * remainingPercent);
    this.saveMoney();
    debugLog("Boss",
      `Game Over Penalty: ${oldMoney} → ${this.currentMoney} (30% kept)`
    );
    return this.currentMoney;
  }

  // ============ 채굴 데이터 저장/로드 ============

  saveMiningData() {
    try {
      localStorage.setItem(
        "cylinderTetris_mining",
        JSON.stringify(this.miningManager.saveData())
      );
    } catch (e) {
      console.warn("Failed to save mining data:", e);
    }
  }

  loadMiningData() {
    try {
      const saved = localStorage.getItem("cylinderTetris_mining");
      if (saved) {
        this.miningManager.loadData(JSON.parse(saved));
      }
      const added = this.reconcileMiningTerritories();
      if (added > 0) {
        this.saveMiningData();
      }
      this.deferMiningSceneSync();
    } catch (e) {
      console.warn("Failed to load mining data:", e);
    }
  }

  deferMiningSceneSync(retries = 10) {
    if (!this.miningManager || !this.stageManager || !this.defenseGame) return;
    const core = this.defenseGame.core;
    const canvas = this.defenseGame.canvas;
    if (!core || typeof core.x !== "number" || !canvas) {
      if (retries > 0) {
        setTimeout(() => this.deferMiningSceneSync(retries - 1), 100);
      }
      return;
    }
    const stage = this.stageManager.getCurrentStage?.();
    if (!stage) return;
    const isSafe = stage.type === "safe";
    if (isSafe || (stage.type === "conquest" && stage.conquered)) {
      this.miningManager.onSceneChange(
        String(stage.id),
        isSafe,
        canvas,
        core,
        !!stage.conquered
      );
    }
  }

  reconcileMiningTerritories() {
    if (!this.stageManager || !this.miningManager) return 0;
    let added = 0;
    for (const stage of this.stageManager.stages || []) {
      if (stage?.type === "conquest" && stage?.conquered) {
        const id = String(stage.id);
        if (!this.miningManager.territories[id]) {
          this.miningManager.registerTerritory(id);
          added += 1;
        }
      }
    }
    return added;
  }

  // ============ 보스전 시스템 ============

  /**
   * 보스전 시작
   */
  startBossFight() {
    debugLog("Boss", "Starting boss fight!");

    // BossManager 시작
    this.bossManager.start();

    // DefenseGame에 보스전 모드 설정
    this.defenseGame.isBossFight = true;
    this.defenseGame.bossManager = this.bossManager;
    this.defenseGame.breachReadyShown = false;

    // 콜백 설정: BREACH READY
    this.defenseGame.onBreachReady = () => this.handleBreachReady();

    // 콜백 설정: 보스 처치
    this.bossManager.onBossDefeated = () => this.handleBossDefeated();

    // 콜백 설정: 페이즈 전환
    this.bossManager.onPhaseChange = (phase, config) => {
      this.terminal.printSystemMessage(`>>> ${config.description} <<<`);
    };
  }

  /**
   * 보스전 종료
   */
  endBossFight() {
    if (!this.defenseGame.isBossFight) return;

    debugLog("Boss", "Ending boss fight");

    this.bossManager.stop();
    this.defenseGame.isBossFight = false;
    this.defenseGame.bossManager = null;
    this.defenseGame.onBreachReady = null;
    this.tetrisGame.endBossFight();
  }

  /**
   * BREACH READY 처리 (침투 게이지 100%)
   */
  async handleBreachReady() {
    debugLog("Boss", "Breach ready!");

    // 선택지 표시
    await this.terminal.printSystemMessage('>>> BREACH READY <<<');
    await this.terminal.printSystemMessage('Core firewall vulnerable. Initiate breach?');

    const choice = await this.terminal.showChoices([
      { text: '>>> BREACH NOW <<<', value: 'breach', style: 'danger' },
      { text: 'Continue defense', value: 'continue' },
    ]);

    if (choice === 'breach') {
      await this.startBossBreach();
    }
  }

  /**
   * 보스 침투 시작 (테트리스 모드 진입)
   */
  async startBossBreach() {
    debugLog("Boss", "Starting boss breach (Tetris)");

    // 테트리스 모드로 전환
    this.defenseGame.pause();

    // 테트리스에 보스전 모드 설정
    this.tetrisGame.startBossFight(this.bossManager);

    // 방해 콜백 설정
    this.bossManager.onInterference = (type) => {
      this.tetrisGame.applyBossInterference(type);
    };

    // 방해 타이머 리셋
    this.bossManager.resetInterferenceTimers();

    // 테트리스 시작
    await this.terminal.printSystemMessage('BREACH INITIATED - Clear 3 lines to damage core!');

    // 테트리스 콜백 설정
    this.tetrisGame.onStageClear = () => this.handleBossBreachSuccess();
    this.tetrisGame.onGameOver = () => this.handleBossBreachFail();

    this.switchToTetrisMode();
    // 테트리스 게임 시작 (3줄 목표, 기본 속도)
    this.tetrisGame.startGame(3, 800);

    // 방해 업데이트 루프 시작
    this.startBossInterferenceLoop();
  }

  /**
   * 보스 방해 업데이트 루프
   */
  startBossInterferenceLoop() {
    if (this.bossInterferenceInterval) {
      clearInterval(this.bossInterferenceInterval);
    }

    this.bossInterferenceInterval = setInterval(() => {
      if (!this.tetrisGame.state.isPlaying || !this.tetrisGame.state.isBossFight) {
        clearInterval(this.bossInterferenceInterval);
        return;
      }

      const now = performance.now();
      this.bossManager.updateInterference(now);
    }, 1000); // 1초마다 체크
  }

  /**
   * 보스 침투 성공 (테트리스 3줄 클리어)
   */
  async handleBossBreachSuccess() {
    debugLog("Boss", "Boss breach success!");

    // 방해 루프 중지
    if (this.bossInterferenceInterval) {
      clearInterval(this.bossInterferenceInterval);
    }

    // 보스에게 데미지
    const defeated = this.bossManager.dealDamage(20);

    if (defeated) {
      // 보스 처치 - handleBossDefeated에서 처리
      return;
    }

    // 테트리스 종료, 디펜스로 복귀
    this.tetrisGame.state.isPlaying = false;
    this.tetrisGame.endBossFight();

    await this.terminal.printSystemMessage(`BREACH SUCCESS! Core damaged: ${this.bossManager.bossHP}% remaining`);

    // 침투 게이지 리셋
    this.defenseGame.breachReadyShown = false;
    this.bossManager.breachGauge = 0;
    this.bossManager.isBreachReady = false;

    // 디펜스 모드로 복귀
    this.switchToDefenseMode();
    this.defenseGame.resume();

    await this.showCommandMenu();
  }

  /**
   * 보스 침투 실패 (테트리스 게임오버)
   */
  async handleBossBreachFail() {
    debugLog("Boss", "Boss breach failed!");

    // 방해 루프 중지
    if (this.bossInterferenceInterval) {
      clearInterval(this.bossInterferenceInterval);
    }

    // BossManager에 실패 알림
    this.bossManager.onBreachFailed();

    // 테트리스 종료
    this.tetrisGame.state.isPlaying = false;
    this.tetrisGame.endBossFight();

    await this.terminal.printSystemMessage('BREACH FAILED! Core firewall restored.');
    await this.terminal.printSystemMessage('Breach gauge reset. Continue defense.');

    // 침투 게이지 리셋
    this.defenseGame.breachReadyShown = false;

    // 디펜스 모드로 복귀
    this.switchToDefenseMode();
    this.defenseGame.resume();

    await this.showCommandMenu();
  }

  /**
   * 보스 처치 처리
   */
  async handleBossDefeated() {
    debugLog("Boss", "BOSS DEFEATED!");

    // 방해 루프 중지
    if (this.bossInterferenceInterval) {
      clearInterval(this.bossInterferenceInterval);
    }

    // 테트리스 종료
    this.tetrisGame.state.isPlaying = false;
    this.tetrisGame.endBossFight();

    // 보스전 종료
    this.endBossFight();

    // 스테이지 점령
    const currentStage = this.stageManager.getCurrentStage();
    if (currentStage) {
      this.stageManager.conquerStage(currentStage.id);
    }

    // 승리 연출
    await this.terminal.printSystemMessage('');
    await this.terminal.printSystemMessage('████████████████████████████████');
    await this.terminal.printSystemMessage('█                              █');
    await this.terminal.printSystemMessage('█    ★★★ CORE NEXUS BREACHED ★★★    █');
    await this.terminal.printSystemMessage('█                              █');
    await this.terminal.printSystemMessage('█        SYSTEM CONQUERED!        █');
    await this.terminal.printSystemMessage('█                              █');
    await this.terminal.printSystemMessage('████████████████████████████████');
    await this.terminal.printSystemMessage('');

    // 보상 지급
    const reward = 10000;
    this.currentMoney += reward;
    this.saveMoney();
    await this.terminal.printSystemMessage(`REWARD: +${reward} DATA`);

    // 디펜스 모드로 복귀
    this.switchToDefenseMode();
    this.defenseGame.setConquered(true);
    this.defenseGame.resume();

    await this.showCommandMenu();
  }

  /**
   * 테트리스 모드로 전환 (보스 침투용)
   */
  switchToTetrisMode() {
    debugLog("Boss", "Switching to Tetris mode");

    // 1. 터미널 투명 모드 (테트리스 배경으로)
    this.terminal.setTransparentMode(true);

    // 2. Three.js 캔버스 표시
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('game-container').style.opacity = '1';

    // 3. 게임 UI 표시 (NEXT 블록, 점수 등)
    document.getElementById('game-ui').style.display = 'block';

    // 4. 디펜스 게임을 미니맵 모드로 전환 (상단에 작게 표시)
    if (this.defenseGame) {
      this.defenseGame.originalCanvas.style.display = "none";
      this.createMiniDefensePanel();
    }

    // 5. 모드 상태 업데이트
    this.activeMode = 'tetris';
  }

  /**
   * 디펜스 모드로 전환 (보스 침투 후 복귀)
   */
  switchToDefenseMode() {
    debugLog("Boss", "Switching to Defense mode");

    // 1. 테트리스 정지 및 Three.js 캔버스 숨김
    this.tetrisGame.state.isPlaying = false;
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';

    // 2. 디펜스 게임을 전체 화면 모드로 복원
    if (this.defenseGame) {
      this.removeMiniDefensePanel();
      this.defenseGame.originalCanvas.style.display = "block";
    }

    // 3. 터미널 디펜스 모드로 복원
    this.terminal.setDefenseMode(true);
    this.terminal.show();

    // 4. 모드 상태 업데이트
    this.activeMode = 'defense';
  }
  createMiniDefensePanel() {
    debugLog("Conquest", "createMiniDefensePanel 시작");

    // 기존 패널 제거
    this.removeMiniDefensePanel();

    const isMobile = window.innerWidth <= 768;
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    // 미니 패널 크기 계산
    // 모바일: 화면 높이의 25%, PC: 화면 높이의 28%
    const heightRatio = isMobile ? 0.25 : 0.28;
    const headerHeight = isMobile ? 25 : 30; // 헤더 + 패딩
    const maxCanvasHeight = Math.floor(screenHeight * heightRatio - headerHeight);

    // 너비 제한: 모바일 55%, PC 30%
    const maxCanvasWidth = isMobile ? Math.floor(screenWidth * 0.55) : Math.floor(screenWidth * 0.30);

    // 정사각형 캔버스 크기 (둘 중 작은 값, 최소 100px, 짝수 강제)
    const rawSize = Math.max(100, Math.floor(Math.min(maxCanvasHeight, maxCanvasWidth)));
    const canvasSize = rawSize % 2 === 0 ? rawSize : rawSize - 1;

    // 전체 패널 높이 계산 (테트리스 오프셋용)
    const panelPadding = isMobile ? 5 : 8;
    const panelBorder = 2;
    const headerPadding = isMobile ? 3 : 5;
    const totalPanelHeight = canvasSize + headerHeight + (panelPadding * 2) + (panelBorder * 2) + 10; // 10px 여백

    debugLog("Conquest", "화면 크기:", screenWidth, "x", screenHeight);
    debugLog("Conquest", "캔버스 크기:", canvasSize);
    debugLog("Conquest", "전체 패널 높이:", totalPanelHeight);

    const panel = document.createElement("div");
    panel.id = "mini-defense-panel";

    const panelWidth = canvasSize + (panelPadding * 2);

    if (isMobile) {
      // 모바일: 상단 중앙, 최대 크기
      panel.style.cssText = `position: fixed; top: 5px; left: 50%; transform: translateX(-50%); width: ${panelWidth}px; padding: ${panelPadding}px; background: rgba(0, 10, 0, 0.95); border: ${panelBorder}px solid rgb(255, 51, 51); border-radius: 5px; color: rgb(255, 51, 51); font-family: var(--term-font); font-size: 10px; z-index: 1000;`;

      panel.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${headerPadding}px; padding-bottom: ${headerPadding}px; border-bottom: 1px solid rgb(255, 51, 51); font-size: 10px;">
        <span id="conquest-core-hp">♥ ${Math.ceil(this.bossManager ? this.bossManager.bossHP : 100)}%</span>
        <span style="color: #00ff00;">BREACH</span>
        <span id="conquest-page">1/3</span>
      </div><canvas id="mini-defense-canvas" width="${canvasSize}" height="${canvasSize}" style="width: ${canvasSize}px; height: ${canvasSize}px; background: rgb(0, 17, 0); border-radius: 3px;"></canvas>`;
    } else {
      // PC: 상단 중앙, 최대 크기
      panel.style.cssText = `position: fixed; top: 10px; left: 50%; transform: translateX(-50%); width: ${panelWidth}px; padding: ${panelPadding}px; background: rgba(0, 10, 0, 0.95); border: ${panelBorder}px solid rgb(255, 51, 51); border-radius: 5px; color: rgb(255, 51, 51); font-family: var(--term-font); font-size: 12px; z-index: 1000;`;

      panel.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${headerPadding}px; padding-bottom: ${headerPadding}px; border-bottom: 1px solid rgb(255, 51, 51); font-size: 14px;">
        <span id="conquest-core-hp">♥ ${Math.ceil(this.bossManager ? this.bossManager.bossHP : 100)}%</span>
        <span style="color: #00ff00;">BREACH PROTOCOL</span>
        <span id="conquest-page">TARGET: CORE</span>
      </div><canvas id="mini-defense-canvas" width="${canvasSize}" height="${canvasSize}" style="width: ${canvasSize}px; height: ${canvasSize}px; background: rgb(0, 17, 0); border-radius: 3px;"></canvas>`;
    }

    debugLog("Conquest", "패널 생성 완료, body에 추가");
    document.body.appendChild(panel);

    // 테트리스 뷰포트 조정 (미니 패널 아래에서 렌더링)
    if (this.tetrisGame) {
      this.tetrisGame.setTopOffset(totalPanelHeight);
    }

    debugLog("Conquest", "패널이 DOM에 추가됨, 패널 display:", panel.style.display);
    const miniCanvas = document.getElementById("mini-defense-canvas");
    debugLog("Conquest", "미니 캔버스 찾음:", !!miniCanvas, "display:", miniCanvas?.style?.display);

    if (this.defenseGame) {
      debugLog("Conquest", "setMiniDisplay 호출");
      this.defenseGame.setMiniDisplay("mini-defense-canvas");
      debugLog("Conquest", "setMiniDisplay 완료");
    }
  }

  removeMiniDefensePanel() {
    debugLog("Conquest", "removeMiniDefensePanel called");
    const panel = document.getElementById("mini-defense-panel");
    if (panel) {
      debugLog("Conquest", "Removing mini defense panel");
      panel.remove();
    } else {
      debugLog("Conquest", "No mini defense panel found");
    }

    // 테트리스 뷰포트 복원
    if (this.tetrisGame) {
      this.tetrisGame.clearTopOffset();
    }

    if (this.defenseGame) {
      debugLog("Conquest", "Calling setMiniDisplay(null)");
      this.defenseGame.setMiniDisplay(null);
    } else {
      debugLog("Conquest", "defenseGame not found");
    }
  }
}
