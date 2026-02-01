---
name: commit
description: 변경사항을 커밋하면서 버전 번호를 자동으로 업데이트합니다. 커밋 메시지와 버전 타입(major/minor/patch)을 받습니다.
argument-hint: [patch|minor|major] [커밋 메시지]
disable-model-invocation: true
allowed-tools: Bash(git:*), Read, Edit, Grep
---

# 커밋 + 버전 자동 업데이트

커밋할 때 버전 번호를 자동으로 올립니다.

## 사용법

```
/commit patch 버그 수정
/commit minor 새 기능 추가
/commit major 대규모 변경
```

## 버전 업데이트 규칙

- **patch**: v9.22.19 → v9.22.20 (버그 수정)
- **minor**: v9.22.19 → v9.23.0 (새 기능)
- **major**: v9.22.19 → v10.0.0 (대규모 변경)

## 버전 파일 위치

1. `index.html` - `<div class="version-info" id="app-version">PROTOCOL v9.22.19</div>`
2. `sw.js` - 첫 줄 주석 `// v9.22.19 - ...`

## 실행 순서

1. 현재 버전 확인 (index.html에서 파싱)
2. 버전 타입에 따라 새 버전 계산
3. index.html 버전 업데이트
4. sw.js 첫 줄 업데이트 (커밋 메시지를 설명으로 포함)
5. git add 및 commit 실행

## 인수: $ARGUMENTS

첫 번째 단어가 버전 타입 (patch/minor/major), 나머지가 커밋 메시지입니다.
기본값: patch

예시:
- `$ARGUMENTS = "patch 버그 수정"` → patch 업데이트, 메시지 "버그 수정"
- `$ARGUMENTS = "버그 수정"` → patch 업데이트 (기본값), 메시지 "버그 수정"
