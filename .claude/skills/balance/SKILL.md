---
name: balance
description: 게임 밸런스를 조정합니다. 적 HP, 데미지, 스폰율, 아이템 효과 등 수치를 검색하고 수정합니다.
argument-hint: [enemy|ally|item|stage] [검색어]
---

# 게임 밸런스 조정

게임 내 수치를 찾고 조정합니다.

## 밸런스 카테고리

### 적(Enemy) 밸런스
파일: `js/modules/DefenseGame.js`

주요 수치:
- `baseHP`: 기본 체력
- `baseDamage`: 기본 데미지
- `baseSpeed`: 이동 속도
- `spawnInterval`: 스폰 간격
- `enemyTypes`: basic, fast, tank, elite, boss

### 아군(Ally) 밸런스
파일: `js/modules/DefenseGame.js`

주요 수치:
- 타입별 HP: TANK(150), SWARM(30), HUNTER(50), HEALER(40), BOMBER(60)
- 공격력, 이동속도, 특수 능력

### 아이템(Item) 밸런스
파일: `js/modules/ItemDatabase.js`

등급: Common, Rare, Legendary
효과: convert, chain, lifesteal, attackSpeed, dropRate

### 스테이지(Stage) 밸런스
파일: `js/modules/StageManager.js`

- `difficultyMultiplier`: 난이도 배수
- `requiredPages`: 필요 페이지 수
- 스테이지별 특수 설정

### 시너지(Synergy) 효과
파일: `js/modules/PerkManager.js`

- tankProtection, hunterCover 등 시너지 효과 수치

## 사용 예시

```
/balance enemy tank     # tank 적 관련 수치 검색
/balance ally HEALER    # HEALER 아군 수치 검색
/balance item legendary # 전설 아이템 효과 검색
/balance stage 6        # Core Nexus 스테이지 설정
```

## 인수: $ARGUMENTS
