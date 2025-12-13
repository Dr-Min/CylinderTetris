# Hacker's Roguelike Build System Plan

로그라이크 스타일의 퍽(Perk) 시스템과 상점, 영구 강화를 구현하여 전략적인 빌드 구성을 가능하게 합니다. 네트워크 노드 맵 형태의 상점 UI와 해커 랭크 시스템을 도입합니다.

## 1. Core Systems (`GameManager.js`, `PerkManager.js`)

- **PerkManager 모듈 신설**
  - 퍽(Perk) 데이터 정의 (ID, 이름, 효과, 가격, 부모 노드 ID).
  - 3가지 주요 트리(공격/방어/유틸)로 구성된 노드 맵 데이터 구조 설계.
  - 현재 활성화된 퍽 효과를 계산하여 게임에 적용하는 로직 (`applyPerks`).
- **Resource Management**
  - `CurrentRunData`: 이번 게임에서 획득한 데이터 (상점 재화).
  - `Reputation`: 계정 공유 경험치 (영구 강화 재화). `localStorage` 연동.

## 2. UI Implementation (`TerminalUI.js`, `css/terminal.css`)

- **Stage Clear Branch**
  - 스테이지 클리어 시 단순 텍스트 선택지로 분기 제공:
    - `> /inject_sequence (Next Stage)`
    - `> /access_darknet (Open Shop)`
- **Network Node Map (Shop UI)**
  - 터미널 위에 그려지는 시각적 노드 맵 구현 (DOM 기반 절대 위치 배치가 구현 용이).
  - 노드 상태: `Locked`(잠김), `Available`(구매가능), `Acquired`(획득됨).
  - 스타일: 해킹 맵 느낌의 선 연결 및 아이콘.
- **HUD Update**
  - `DATA MINED` 표시 방식 개선 (암호 해독 연출).

## 3. Game Logic Integration (`TetrisGame.js`)

- **Perk Effects Hooks**
  - 게임 로직 곳곳에 퍽 효과가 개입할 수 있는 훅(Hook) 포인트 추가.
  - 예: `onLineClear`, `calculateScore`, `getDropSpeed`, `spawnSpecialBlock`.
- **Permanent Upgrades**
  - 게임 시작 시 `localStorage`에서 영구 특성(Trait)을 불러와 초기 스탯 보정.

## 4. Flow Update

- **Cycle:** `Intro` -> `Tutorial` -> `Lobby` -> `Game(Stage N)` -> `Clear` -> `Branch(Shop/Next)` -> `Shop(Upgrade)` -> `Game(Stage N+1)`
- **Game Over:** 점수 정산 -> 평판(Reputation) 획득 -> 메인 화면 저장.

## 5. Implementation Todos

- [ ] Create PerkManager.js with initial node tree data
- [ ] Implement Shop UI (Network Map) in TerminalUI
- [ ] Add resource management and branch logic to GameManager
- [ ] Connect perk effects to TetrisGame logic
- [ ] Implement permanent progression (Reputation) using localStorage
