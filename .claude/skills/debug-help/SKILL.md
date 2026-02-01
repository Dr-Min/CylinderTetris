---
name: debug-help
description: 디버그 모드 사용법과 로그 분석을 도와줍니다. 버그 추적, 로그 카테고리 설정 등.
argument-hint: [category|enable|analyze]
---

# 디버그 도우미

게임의 디버그 시스템 사용법과 버그 추적을 돕습니다.

## 디버그 시스템 개요

### 콘솔 명령어

```javascript
// 전체 디버그 활성화
enableDebug()

// 전체 디버그 비활성화
disableDebug()

// 특정 카테고리만 토글
toggleDebugCategory('Defense')
toggleDebugCategory('Combat')
```

### 디버그 카테고리

| 카테고리 | 설명 |
|----------|------|
| Defense | 디펜스 게임 전반 |
| AllyMovement | 아군 이동 로직 |
| Synergy | 시너지 효과 적용 |
| Enemy | 적 스폰/행동 |
| GameManager | 게임 흐름 관리 |
| TerminalUI | 터미널 UI |
| Item | 아이템 드랍/효과 |
| Combat | 전투 데미지 계산 |

### 터미널 명령어

게임 터미널에서 `/debug` 입력하면 디버그 패널 열림/닫힘

## 주요 디버그 포인트

### DefenseGame.js
- `debugLog('Defense', ...)`: 게임 상태
- `debugLog('Combat', ...)`: 데미지 계산
- `debugLog('AllyMovement', ...)`: 아군 이동

### GameManager.js
- `debugLog('GameManager', ...)`: 상태 전환
- 스테이지 전환, 게임 모드 변경

## 버그 추적 팁

1. **재현 단계 파악**: 버그가 발생하는 정확한 조건
2. **관련 카테고리 활성화**: 의심되는 카테고리만 켜서 로그 집중
3. **값 추적**: 예상값 vs 실제값 비교
4. **콜스택 확인**: console.trace() 활용

## 인수: $ARGUMENTS
