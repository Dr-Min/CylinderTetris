# 🕵️‍♂️ HACKER'S BASE: Defense & Mining Protocol
> **Version**: 1.0.0 (Alpha)  
> **Concept**: Idle Defense (Core Protection) + Active Mining (3D Tetris)  
> **Tech Stack**: Vanilla JS, Three.js, HTML5 Canvas

---

## 1. 게임 개요 (Game Overview)
플레이어는 사이버 공간의 **해커**가 되어 자신의 **서버(Core)**를 바이러스들로부터 방어해야 합니다. 방어에 필요한 자원(`Data`)은 방어 모드에서의 '위험 감수(파밍)'와 직접적인 해킹 시도인 '마이닝(테트리스)'을 통해 획득합니다. 획득한 자원으로 시스템을 일시적/영구적으로 강화하여 더 오래 생존하고 높은 명성(`Reputation`)을 쌓는 것이 목표입니다.

---

## 2. 게임 모드 및 핵심 메커니즘

### 🛡️ A. 디펜스 모드 (Defense Mode - Main)
게임의 기본 대기 화면이자 메인 방어 모드입니다.

*   **시점**: Top-down 2D View (Canvas)
*   **목표**: 중앙의 **CORE** 체력(HP)이 0이 되지 않도록 사수.
*   **주요 요소**:
    1.  **CORE (기지)**:
        *   화면 중앙에 위치. HP 100으로 시작.
        *   파괴 시 **SYSTEM CRITICAL FAILURE**와 함께 게임 오버 (재부팅 필요).
    2.  **TURRET (포탑)**:
        *   CORE 주변을 회전하며 적을 자동 조준 및 사격.
        *   업그레이드 전 기본 스펙: 공속 4.0/s, 사거리 300px.
    3.  **ENEMY (바이러스)**:
        *   화면 밖에서 생성되어 CORE를 향해 돌진.
        *   충돌 시 CORE에 데미지를 입힘.
    4.  **SHIELD SYSTEM (핵심 전략)**:
        *   **상태 1: SHIELD ACTIVE (방어 모드)**
            *   CORE 주변에 파란색 역장이 생성됨.
            *   적들이 역장에 닿으면 튕겨나가거나 소멸. **CORE 무적**.
            *   단, 적을 처치해도 **자원(Data)을 획득할 수 없음**.
        *   **상태 2: FARMING MODE (파밍 모드)**
            *   하단 버튼을 눌러 쉴드를 해제.
            *   적들이 CORE 본체까지 접근 가능 (피격 위험).
            *   이 상태에서 적을 처치하면 **DATA(자원) 획득**.
            *   **전략**: 체력이 충분할 때 쉴드를 끄고 자원을 모으고, 위급할 때 켜서 생존.

### 🧱 B. 마이닝 모드 (Mining Mode - Sub)
자원을 대량으로 확보하기 위한 미니게임 모드입니다.

*   **시점**: 3D Cylinder View (Three.js) - 원통형 테트리스
*   **진입 방법**: 터미널 명령 `/exec_mining` 선택.
*   **목표**: 블록을 쌓아 라인을 지우고(`Clear`), 데이터를 채굴(`Mining`).
*   **특징**:
    *   일반적인 테트리스와 달리 좌우가 연결된 원통형 그리드 (12x20).
    *   라인을 지울 때마다 대량의 `Data` 획득.
    *   게임 오버 시 획득한 점수에 비례해 `Reputation`(영구 자원) 획득.
    *   클리어 후 상점(`Dark Web Market`) 이용 가능.

---

## 3. 아이템 및 특수 블록 (Special Blocks)
마이닝 모드(테트리스)에서 등장하는 특수 블록들은 게임의 변수를 만듭니다.

| 아이콘 | 이름 | 효과 (Effect) |
|:---:|:---:|:---|
| 💣 | **BOMB** | **십자 폭발**. 해당 블록을 포함한 **가로 전체 줄**과 **세로 전체 줄**을 즉시 삭제합니다. |
| 💰 | **GOLD** | 획득 시 대량의 점수 보너스 (+5000점) 획득. |
| ❄️ | **FREEZE** | 일정 시간(5초) 동안 블록 낙하 속도를 느리게 만듭니다. (Bullet Time) |
| ⚡ | **LASER** | (구버전 사양) 수직 라인을 관통하여 삭제합니다. |

---

## 4. 업그레이드 시스템 (Upgrade System)

### 💾 A. 세션 업그레이드 (Session Perks)
*   **재화**: `Data (MB)` - 게임 내에서 획득, 게임 오버 시 초기화.
*   **구매처**: 마이닝 모드 클리어 후 나타나는 **Dark Web Market**.
*   **구조**: 트리 형태의 노드 맵.

| 타입 | 퍽 이름 (예시) | 효과 설명 |
|:---:|:---|:---|
| **ATK** | `Exploit_Kit` | **Bomb(💣) 블록**의 등장 확률을 증가시킵니다. |
| **MSC** | `Gold_Miner` | **Gold(💰) 블록**의 등장 확률을 증가시킵니다. |
| **MSC** | `Speed_Hack` | 테트리스 낙하 속도 조절 (난이도 완화). |
| **DEF** | `Firewall_Patch` | 부활(Revive) 횟수 추가. 게임 오버 위기 시 1회 생존. |
| **EFF** | `Score_Algo` | 점수 획득 배율(Multiplier) 증가. |

### 🏆 B. 영구 업그레이드 (Permanent Upgrades)
*   **재화**: `Reputation (REP)` - 마이닝 모드 결과(점수)에 따라 획득, 영구 보존.
*   **구매처**: 게임 시작 시(인트로) 또는 특정 이벤트 시 접근하는 **System Kernel Access**.
*   **구조**: `ROOT`에서 뻗어나가는 3갈래 스킬 트리.

#### 🌳 영구 스킬 트리 목록

**1. Root Node**
*   `ROOT_ACCESS`: 시스템 접근 권한 (기본 해금).

**2. Resource Branch (자원 효율)**
*   `Packet_Sniffer.v1`: 게임 시작 시 기본 자금 +100MB.
*   `Data_Mining_Rig.v2`: 게임 시작 시 기본 자금 +200MB.
*   `Botnet_Wallet.v3`: 게임 시작 시 기본 자금 +300MB.

**3. Efficiency Branch (점수/성장)**
*   `Score_Injector.dll`: 점수 획득량 +10%.
*   `Combo_Breaker.exe`: 점수 획득량 +15%.
*   `Global_Leaderboard.hack`: 점수 획득량 +25%.

**4. Luck Branch (운/확률)**
*   `RNG_Manipulator.init`: 특수 블록 등장 확률(Luck) +2%.
*   `Probability_Drive.sys`: Luck +3% 및 상점 할인율 5% 증가.

---

## 5. 조작 방법 (Controls)

### 💻 PC
*   **디펜스 모드**:
    *   마우스: UI 버튼 클릭 (`SHIELD` 토글, 선택지 선택).
*   **마이닝 모드 (테트리스)**:
    *   `←` / `→`: 블록 좌우 이동.
    *   `↑`: 블록 회전.
    *   `↓`: 소프트 드롭 (빠르게 내리기).
    *   `Space`: 하드 드롭 (즉시 바닥으로).
    *   `Enter`: 터미널 입력 / 대화 넘기기.

### 📱 Mobile (Touch)
*   **디펜스 모드**:
    *   `SHIELD` 버튼 (하단 중앙): 쉴드 ON/OFF 토글.
*   **마이닝 모드**:
    *   화면 스와이프: 좌우 이동 / 하단 드롭.
    *   화면 터치: 회전.
    *   가상 버튼: 좌/우 이동, 드롭, BGM, 뷰 전환 버튼 제공.

---

## 6. 기술 아키텍처 (Technical Architecture)

### 📂 파일 구조
*   `index.html`: 게임의 진입점. DOM 레이어 구조 정의.
*   `css/style.css`: CRT 모니터 효과, 터미널 스타일, 반응형 레이아웃.
*   `js/modules/`
    *   `GameManager.js`: **[Core]** 게임의 상태 관리, 모드 전환(`switchMode`), UI/로직 조율.
    *   `DefenseGame.js`: **[Mode 1]** 2D Canvas 기반 디펜스 게임 로직 (적, 포탑, 충돌, 렌더링).
    *   `TetrisGame.js`: **[Mode 2]** Three.js 기반 3D 테트리스 로직.
    *   `TerminalUI.js`: 텍스트 기반 인터페이스, 타이핑 효과, 상점 UI 렌더링.
    *   `PerkManager.js`: 업그레이드 트리 데이터 및 효과 관리.

### 🧱 레이어 구조 (Layer Hierarchy)
화면 가림 문제를 방지하기 위해 정교한 Z-Index 계층을 사용합니다. (Body 기준)

1.  **`#game-container`** (Z: 0): 테트리스(Three.js) 렌더링 영역.
2.  **`DefenseGame Canvas`** (Z: 50): 디펜스 게임(2D) 렌더링 영역 (`position: fixed`).
3.  **`#terminal-layer`** (Z: 100): 터미널 텍스트 및 로그 (배경 투명).
4.  **`#defense-ui`** (Z: 200): 디펜스 모드 전용 UI (데이터 표시, 쉴드 버튼).
5.  **`crt-overlay`** (Z: 9999): 화면 전체에 CRT 모니터 느낌을 주는 스캔라인 효과.

---

## 7. 향후 로드맵 (Future Roadmap)
*   **Phase 3: RAID Mode**: 성장한 코어를 바탕으로 외부 서버를 해킹(공격)하는 역디펜스 모드.
*   **스토리 모드**: 터미널 로그를 통한 해커 스토리텔링 강화.
*   **보스전**: 거대한 바이러스 또는 방화벽과의 3D 테트리스 배틀.
