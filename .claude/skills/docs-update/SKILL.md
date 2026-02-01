---
name: docs-update
description: DEVELOPMENT_STATUS.md를 자동으로 업데이트합니다. 최근 변경사항을 요약하여 문서에 추가합니다.
argument-hint: [버전] [변경 요약]
disable-model-invocation: true
allowed-tools: Read, Edit, Bash(git log*)
---

# 개발 문서 자동 업데이트

DEVELOPMENT_STATUS.md에 새 업데이트 내역을 추가합니다.

## 문서 구조

```markdown
# HACKER'S BASE - Development Status

> 마지막 업데이트: YYYY-MM-DD (버전)

---

## 최신 업데이트 (버전)

### 카테고리 이모지 + 제목
- 변경 내용 1
- 변경 내용 2

---

## 이전 업데이트 (이전 버전)
...
```

## 카테고리 이모지

- `🔧` 버그 수정 / 기술 개선
- `✨` 새 기능
- `🎨` UI/UX 개선
- `⚡` 성능 최적화
- `📱` 모바일 관련
- `🎮` 게임플레이 변경
- `🎬` 애니메이션/이펙트
- `🔊` 사운드 관련

## 실행 순서

1. 현재 버전 확인 (index.html)
2. git log로 최근 커밋 확인
3. 기존 "최신 업데이트" 섹션을 "이전 업데이트"로 이동
4. 새 "최신 업데이트" 섹션 생성
5. 마지막 업데이트 날짜 갱신

## 인수: $ARGUMENTS

버전과 변경 요약을 받습니다.
예: `/docs-update v9.22.20 미니 패널 크기 동적 조정`

인수가 없으면 git log에서 최근 커밋들을 분석하여 자동 생성합니다.
