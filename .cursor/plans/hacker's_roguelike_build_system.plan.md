# Hacker's Base Defense & Raid System Plan

기존의 "테트리스 로그라이크"에서 확장하여, **"기지 방어(Defense) + 자원 채굴(Tetris) + 서버 공격(Raid)"**이 순환하는 복합 장르 게임으로 진화합니다.

## 1. Core Concept

**"Idle Defense meets Active Mining & Strategic Raid"**

- **Main (Defense)**: 플레이어의 서버(Base)를 자동으로 지키는 방치형 디펜스.
- **Sub (Mining)**: 자원 및 특수 탄약 확보를 위한 테트리스 미니게임.
- **Raid (Attack)**: 적 서버를 공격하여 영구 자원을 약탈하는 역디펜스/배틀 모드.

---

## 2. Game Modes & Cycle

### A. Defense Mode (Main / Idle)

- **View**: Top-down 2D (Canvas). 중앙에 **Core(CPU)**, 사방에서 적(Virus) 침입.
- **Action**:
- 기본 포탑(Turret)이 **무한 탄약**으로 적을 요격.
- 적 처치 시 `Data(Money)` 소량 획득.
- 플레이어는 포탑 업그레이드, 스킬 사용 개입 가능.
- **Goal**: Core HP 보존. 웨이브 방어.

### B. Mining Mode (Active / Tetris)

- **Trigger**: 자원 부족 시 플레이어가 직접 진입 (`/exec_mining`).
- **Gameplay**: 기존 3D 원통형 테트리스.
- **Reward**:
- 라인 클리어 -> `Special Ammo` (강력한 미사일/레이저 탄약) 획득.
- `Data` 대량 획득 (업그레이드 재료).
- **Events**:
- **Emergency**: 디펜스 중 "해킹 감지" 경고 -> 강제 테트리스 진입 -> 제한 시간 내 미션 클리어 시 방어 성공.

### C. Raid Mode (Attack / Reverse Defense)

- **Trigger**: 충분한 성장 후 타겟 서버 해킹 시도 (`/init_raid`).
- **Gameplay**:
- **Reverse Defense**: 내 유닛(Packet)을 생성하여 적의 경로에 투입.
- **Tetris Battle**: 경로가 막히거나 방화벽 조우 시, 테트리스 배틀 이벤트 발생. 블록을 지워 방화벽을 무력화(Break).
- **Reward**: `Reputation` (영구 강화 재료) 획득.

---

## 3. Systems & Architecture

### ResourceManager

- **Data (MB/GB)**: 세션 내 업그레이드 재화 (적 처치, 테트리스).
- **Ammo (Special)**: 특수 무기 사용 자원 (테트리스로 충전).
- **Reputation**: 영구 업그레이드 재화 (레이드 성공).

### Upgrade System

- **Session Upgrades (Data)**:
- Turret: 데미지, 공속, 멀티샷.
- Tetris: 퍽(폭탄 확률, 점수 배율 등).
- **Permanent Upgrades (Reputation)**:
- 시작 자금, 기본 포탑 스펙, 자동 채굴 효율 등.

### Tech Stack Changes

- **Rendering**:
- Defense/Raid: Lightweight 2D Canvas (Overlay).
- Mining: Existing Three.js 3D Scene.
- **State Management**:
- `GameManager`가 `DefenseState`, `MiningState`, `RaidState`를 전환하며 UI 및 로직 제어.

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Current)

- [x] Basic Tetris Engine (3D Cylinder)
- [x] Perk System (Tree Node Map)
- [x] Save/Load System (localStorage)

### Phase 2: Defense Integration (Next)

- [ ] **GameManager Refactor**: 모드 전환(FSM) 구조 도입.
- [ ] **Defense Engine**: 2D Canvas 기반 적 생성/이동/피격 로직 구현.
- [ ] **Resource Link**: 테트리스 보상 -> 디펜스 자원으로 연결.

### Phase 3: Raid & Polish

- [ ] **Raid Mode**: 역디펜스 길찾기 및 유닛 스폰.
- [ ] **Battle Event**: 레이드 중 테트리스 배틀 트리거 구현.
- [ ] **UI/UX**: 터미널 스타일의 모드 전환 연출.