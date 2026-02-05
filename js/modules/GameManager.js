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
import { applyUpgradeMixin } from "./upgrade/UpgradeMixin.js";
import "./debug/DebugSystem.js";
import { applyLootMixin } from "./loot/LootMixin.js";
import { applyPersistenceMixin } from "./persist/PersistenceMixin.js";
import { applyGameFlowMixin } from "./flow/GameFlowMixin.js";

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
    this.defenseGame.onRecallRequest = () => this.handleRecall();
    this.collectedItemsThisStage = []; // 현재 스테이지에서 획득한 아이템들
    this.isBossBreachMode = false;

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

    // 업그레이드 레벨 추적 (MAX Lv.100)
    this.upgradeLevels = {
      helper: {
        damage: 0, // MAX Lv.100
        fireRate: 0, // MAX Lv.100
        range: 0, // MAX Lv.100
        projectileSpeed: 0, // MAX Lv.100
        magazineSize: 0, // MAX Lv.100
      },
      core: {
        hp: 0, // MAX Lv.100
        turretDamage: 0, // MAX Lv.100
        turretRange: 0, // MAX Lv.100
        turretSpeed: 0, // MAX Lv.100
        fireRate: 0, // MAX Lv.100
        staticDamage: 0, // MAX Lv.100
        staticChain: 0, // MAX Lv.100
      },
      shield: {
        hp: 0,
      },
      ally: {
        slots: 0, // MAX Lv.100
        hp: 0, // MAX Lv.100
        damage: 0, // MAX Lv.100
        speed: 0, // MAX Lv.100
        respawn: 0, // MAX Lv.100
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
        damage: 100,
        fireRate: 100,
        range: 100,
        projectileSpeed: 100,
        magazineSize: 100,
      },
      core: {
        hp: 100,
        turretDamage: 100,
        turretRange: 100,
        turretSpeed: 100,
        fireRate: 100,
        staticDamage: 100,
        staticChain: 100,
      },
      shield: {
        hp: 100,
      },
      ally: {
        slots: 100,
        hp: 100,
        damage: 100,
        speed: 100,
        respawn: 100,
      },
    };

    // === 저장된 데이터 로드 ===
    this.loadUpgrades();   // 업그레이드 레벨 복원
    this.loadAllyConfig(); // 아군 설정 복원
    this.loadDecryptionProgress(); // 해금 진행률 복원
    this.applyCoreUpgradeBonuses();
    this.applyHelperUpgradeBonuses();
    this.applyShieldUpgradeBonuses();

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
    logToggleLabel.innerText = "📋 Console Logs (Browser Console)";
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
      choices.push({
        text: "/recall (Return to Safe Zone)",
        value: "recall",
        style: "warning",
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

      Object.values(borders).forEach((b) => {
        borderContainer.appendChild(b);
      });

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
        const currentCoreHp = this.defenseGame.core?.hp || 0;

        if (currentCoreHp < startCoreHp) {
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
  handlePuzzleLineCleared(lineNum) {
    // 테트리스에서 줄 클리어 시 아이템 드롭 (줄 수에 비례한 확률)
    this.tryTetrisItemDrop(lineNum);

    if ((!this.isConquestMode && !this.isBossBreachMode) || !this.defenseGame) return;

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
    this.defenseGame.core.shieldActive = false;
    this.defenseGame.core.shieldState = "OFF";
    this.defenseGame.core.shieldHp = this.defenseGame.core.shieldMaxHp;
    this.defenseGame.core.shieldRadius = 70; // 기본 반경
    this.defenseGame.core.shieldTimer = 0;
    this.defenseGame.updateShieldBtnUI("OFFLINE", "#f00");
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

  getStageRewardScale(stageIndex) {
    const idx = Math.max(0, stageIndex || 0);
    return 1 + Math.min(1.5, idx * 0.05);
  }

  getPageRewardScale(currentPage, maxPages) {
    const pages = maxPages || 0;
    if (pages <= 1) return 1;
    const progress = Math.max(0, (currentPage - 1) / (pages - 1));
    return 1 + Math.min(0.3, progress * 0.3);
  }

  getDefenseRewardScale(stageIndex, currentPage, maxPages) {
    return this.getStageRewardScale(stageIndex) * this.getPageRewardScale(currentPage, maxPages);
  }

  getRepRewardScale(stageIndex) {
    const idx = Math.max(0, stageIndex || 0);
    return 1 + Math.min(1.2, idx * 0.04);
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
    const baseData = (linesCleared || 0) * 100;
    const rewardScale = this.getStageRewardScale(this.currentStage);
    const earnedData = Math.floor(baseData * rewardScale);
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

  async handleMiningGameOver(score) {
    document.getElementById("game-ui").style.display = "none";
    this.terminal.setTransparentMode(false);
    this.terminal.show();

    const effects = this.perkManager.getEffects();
    const finalScore = Math.floor(score * effects.scoreMultiplier);

    // 평판 획득 (점수 1000점당 1, 스테이지당 10)
    const repScale = this.getRepRewardScale(this.currentStage);
    const earnedRep = Math.floor((finalScore / 1000) * repScale) + Math.floor(this.currentStage * 8);
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
   * 업그레이드 레벨을 localStorage에 저장
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
  endBossFight() {
    if (!this.defenseGame.isBossFight) return;

    debugLog("Boss", "Ending boss fight");

    this.bossManager.stop();
    this.defenseGame.isBossFight = false;
    this.defenseGame.bossManager = null;
    this.defenseGame.onBreachReady = null;
    this.isBossBreachMode = false;
    this.tetrisGame.endBossFight();
  }

  /**
   * BREACH READY 처리 (침투 게이지 100%)
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
    const stageId = this.defenseGame?.currentStageId || 0;
    const rewardScale = this.getStageRewardScale(stageId);
    const reward = Math.floor(10000 * rewardScale);
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

// Apply mixin modules to GameManager prototype
applyUpgradeMixin(GameManager);
applyLootMixin(GameManager);
applyPersistenceMixin(GameManager);
applyGameFlowMixin(GameManager);
