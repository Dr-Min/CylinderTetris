---
name: deploy-check
description: Vercel 배포 전 체크리스트를 확인합니다. 버전 동기화, Service Worker 캐시 버전, 콘솔 에러 등을 점검합니다.
disable-model-invocation: true
allowed-tools: Read, Grep, Bash(git:*)
---

# 배포 전 체크리스트

Vercel에 배포하기 전에 확인해야 할 항목들을 점검합니다.

## 체크 항목

### 1. 버전 동기화 확인
- `index.html`의 버전과 `sw.js`의 버전이 일치하는지 확인
- 불일치 시 경고

### 2. Service Worker 캐시
- `sw.js`의 `CACHE_NAME` 확인
- 캐시 버전이 앱 버전과 맞는지 점검

### 3. Git 상태 확인
- 커밋되지 않은 변경사항 확인
- 현재 브랜치 확인

### 4. 콘솔 에러 체크
- `console.error` 호출 검색
- 하드코딩된 디버그 코드 확인

### 5. 모바일 호환성
- 터치 이벤트 핸들러 확인
- 반응형 스타일 확인

## 출력 형식

```
=== 배포 전 체크리스트 ===

[✓] 버전 동기화: v9.22.19
[✓] Service Worker 캐시: hacker-tetris-v23.38
[✓] Git 상태: 클린
[!] 경고: 커밋되지 않은 파일 2개
[✓] 콘솔 에러: 없음

배포 준비 완료!
```
