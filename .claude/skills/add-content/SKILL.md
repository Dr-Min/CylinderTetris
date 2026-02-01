---
name: add-content
description: 새로운 게임 콘텐츠(적, 아이템, 스테이지, 시너지)를 추가하는 가이드입니다.
argument-hint: [enemy|item|stage|synergy|ally]
---

# 새 콘텐츠 추가 가이드

## 새 적 타입 추가

파일: `js/modules/DefenseGame.js`

1. `enemyTypes` 객체에 새 타입 정의:
```javascript
newType: {
    hp: 100,
    damage: 15,
    speed: 1.5,
    color: '#ff00ff',
    size: 1.2,
    scoreValue: 50
}
```

2. `spawnEnemy()` 메서드에서 스폰 로직 추가
3. 특수 행동이 필요하면 `updateEnemies()`에 로직 추가

## 새 아이템 추가

파일: `js/modules/ItemDatabase.js`

1. `items` 배열에 새 아이템 정의:
```javascript
{
    id: 'newItem',
    name: '새 아이템',
    rarity: 'rare',
    type: 'passive',
    effect: 'customEffect',
    value: 1.5,
    description: '설명'
}
```

2. 효과 처리: `DefenseGame.js`의 아이템 효과 로직에 추가

## 새 스테이지 추가

파일: `js/modules/StageManager.js`

1. `stages` 배열에 새 스테이지 정의:
```javascript
{
    id: 7,
    name: 'New Sector',
    type: 'conquest',
    requiredPages: 8,
    difficultyMultiplier: 1.2,
    connections: [4, 5],
    description: '설명'
}
```

2. 맵 UI 업데이트 필요

## 새 시너지 추가

파일: `js/modules/PerkManager.js`

1. `synergies` 객체에 정의:
```javascript
newSynergy: {
    name: '새 시너지',
    mainType: 'TANK',
    subType: 'SWARM',
    effect: 'newEffect',
    description: '설명'
}
```

2. `DefenseGame.js`에서 효과 적용 로직 구현

## 새 아군 타입 추가

파일: `js/modules/DefenseGame.js`

1. `allyTypes` 객체에 정의:
```javascript
NEW_TYPE: {
    hp: 80,
    damage: 20,
    speed: 2,
    color: '#00ffff',
    attackRange: 100,
    slots: 2
}
```

2. AI 행동 패턴: `updateAlliedViruses()` 수정
3. 시너지 효과 추가 (PerkManager.js)

## 인수: $ARGUMENTS

콘텐츠 타입을 지정하면 해당 가이드만 표시합니다.
