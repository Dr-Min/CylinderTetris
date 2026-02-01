> ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 사용자 정의 서브에이전트 만들기

> Claude Code에서 작업별 워크플로우 및 향상된 컨텍스트 관리를 위해 특화된 AI 서브에이전트를 만들고 사용합니다.

서브에이전트는 특정 유형의 작업을 처리하는 특화된 AI 어시스턴트입니다. 각 서브에이전트는 자신의 컨텍스트 윈도우에서 실행되며 사용자 정의 시스템 프롬프트, 특정 도구 액세스 및 독립적인 권한을 가집니다. Claude가 서브에이전트의 설명과 일치하는 작업을 만나면 해당 서브에이전트에 위임하고, 서브에이전트는 독립적으로 작동하여 결과를 반환합니다.

서브에이전트는 다음을 도와줍니다:

* **컨텍스트 보존** - 탐색 및 구현을 주 대화에서 분리하여 유지
* **제약 조건 적용** - 서브에이전트가 사용할 수 있는 도구 제한
* **구성 재사용** - 사용자 수준 서브에이전트를 통해 프로젝트 간 재사용
* **동작 특화** - 특정 도메인을 위한 집중된 시스템 프롬프트
* **비용 제어** - Haiku와 같은 더 빠르고 저렴한 모델로 작업 라우팅

Claude는 각 서브에이전트의 설명을 사용하여 작업을 위임할 시기를 결정합니다. 서브에이전트를 만들 때 Claude가 언제 사용할지 알 수 있도록 명확한 설명을 작성하세요.

Claude Code에는 **Explore**, **Plan**, **general-purpose**와 같은 여러 기본 제공 서브에이전트가 포함되어 있습니다. 특정 작업을 처리하기 위해 사용자 정의 서브에이전트를 만들 수도 있습니다. 이 페이지에서는 [기본 제공 서브에이전트](#built-in-subagents), [자신만의 서브에이전트 만드는 방법](#quickstart-create-your-first-subagent), [전체 구성 옵션](#configure-subagents), [서브에이전트 작업 패턴](#work-with-subagents), [예제 서브에이전트](#example-subagents)를 다룹니다.

## 기본 제공 서브에이전트

Claude Code에는 Claude가 적절할 때 자동으로 사용하는 기본 제공 서브에이전트가 포함되어 있습니다. 각각은 부모 대화의 권한을 상속하며 추가 도구 제한이 있습니다.

<Tabs>
  <Tab title="Explore">
    코드베이스 검색 및 분석에 최적화된 빠른 읽기 전용 에이전트입니다.

    * **모델**: Haiku (빠름, 낮은 지연시간)
    * **도구**: 읽기 전용 도구 (Write 및 Edit 도구에 대한 액세스 거부)
    * **목적**: 파일 검색, 코드 검색, 코드베이스 탐색

    Claude는 변경 없이 코드베이스를 검색하거나 이해해야 할 때 Explore에 위임합니다. 이렇게 하면 탐색 결과가 주 대화 컨텍스트에서 벗어납니다.

    Explore를 호출할 때 Claude는 철저함 수준을 지정합니다: 대상 조회의 경우 **quick**, 균형 잡힌 탐색의 경우 **medium**, 포괄적 분석의 경우 **very thorough**.
  </Tab>

  <Tab title="Plan">
    [계획 모드](/ko/common-workflows#use-plan-mode-for-safe-code-analysis)에서 계획을 제시하기 전에 컨텍스트를 수집하는 데 사용되는 연구 에이전트입니다.

    * **모델**: 주 대화에서 상속
    * **도구**: 읽기 전용 도구 (Write 및 Edit 도구에 대한 액세스 거부)
    * **목적**: 계획을 위한 코드베이스 연구

    계획 모드에 있고 Claude가 코드베이스를 이해해야 할 때 연구를 Plan 서브에이전트에 위임합니다. 이렇게 하면 무한 중첩을 방지하면서(서브에이전트는 다른 서브에이전트를 생성할 수 없음) 필요한 컨텍스트를 수집합니다.
  </Tab>

  <Tab title="General-purpose">
    탐색과 작업 모두를 필요로 하는 복잡한 다단계 작업을 위한 유능한 에이전트입니다.

    * **모델**: 주 대화에서 상속
    * **도구**: 모든 도구
    * **목적**: 복잡한 연구, 다단계 작업, 코드 수정

    Claude는 작업이 탐색과 수정 모두를 필요로 하거나, 결과를 해석하기 위한 복잡한 추론이 필요하거나, 여러 종속 단계가 필요할 때 general-purpose에 위임합니다.
  </Tab>

  <Tab title="Other">
    Claude Code에는 특정 작업을 위한 추가 도우미 에이전트가 포함되어 있습니다. 이들은 일반적으로 자동으로 호출되므로 직접 사용할 필요가 없습니다.

    | 에이전트              | 모델     | Claude가 사용하는 시기                 |
    | :---------------- | :----- | :------------------------------ |
    | Bash              | 상속     | 별도 컨텍스트에서 터미널 명령 실행             |
    | statusline-setup  | Sonnet | `/statusline`을 실행하여 상태 줄을 구성할 때 |
    | Claude Code Guide | Haiku  | Claude Code 기능에 대해 질문할 때        |
  </Tab>
</Tabs>

이러한 기본 제공 서브에이전트 외에도 사용자 정의 프롬프트, 도구 제한, 권한 모드, 훅 및 스킬을 사용하여 자신만의 서브에이전트를 만들 수 있습니다. 다음 섹션에서는 시작하는 방법과 서브에이전트를 사용자 정의하는 방법을 보여줍니다.

## 빠른 시작: 첫 번째 서브에이전트 만들기

서브에이전트는 YAML 프론트매터가 있는 마크다운 파일로 정의됩니다. [수동으로 만들거나](#write-subagent-files) `/agents` 명령을 사용할 수 있습니다.

이 연습은 `/agent` 명령을 사용하여 사용자 수준 서브에이전트를 만드는 과정을 안내합니다. 서브에이전트는 코드를 검토하고 코드베이스에 대한 개선 사항을 제안합니다.

<Steps>
  <Step title="서브에이전트 인터페이스 열기">
    Claude Code에서 다음을 실행합니다:

    ```
    /agents
    ```
  </Step>

  <Step title="새 사용자 수준 에이전트 만들기">
    **Create new agent**를 선택한 다음 **User-level**을 선택합니다. 이렇게 하면 서브에이전트가 `~/.claude/agents/`에 저장되어 모든 프로젝트에서 사용할 수 있습니다.
  </Step>

  <Step title="Claude로 생성">
    **Generate with Claude**를 선택합니다. 메시지가 표시되면 서브에이전트를 설명합니다:

    ```
    A code improvement agent that scans files and suggests improvements
    for readability, performance, and best practices. It should explain
    each issue, show the current code, and provide an improved version.
    ```

    Claude가 시스템 프롬프트와 구성을 생성합니다. 사용자 정의하려면 `e`를 눌러 편집기에서 열 수 있습니다.
  </Step>

  <Step title="도구 선택">
    읽기 전용 검토자의 경우 **Read-only tools**를 제외한 모든 항목을 선택 해제합니다. 모든 도구를 선택한 상태로 유지하면 서브에이전트는 주 대화에서 사용 가능한 모든 도구를 상속합니다.
  </Step>

  <Step title="모델 선택">
    서브에이전트가 사용할 모델을 선택합니다. 이 예제 에이전트의 경우 코드 패턴 분석을 위해 기능과 속도의 균형을 맞추는 **Sonnet**을 선택합니다.
  </Step>

  <Step title="색상 선택">
    서브에이전트의 배경색을 선택합니다. 이렇게 하면 UI에서 실행 중인 서브에이전트를 식별하는 데 도움이 됩니다.
  </Step>

  <Step title="저장 및 시도">
    서브에이전트를 저장합니다. 즉시 사용 가능합니다(재시작 필요 없음). 시도해보세요:

    ```
    Use the code-improver agent to suggest improvements in this project
    ```

    Claude가 새 서브에이전트에 위임하고, 서브에이전트가 코드베이스를 스캔하여 개선 제안을 반환합니다.
  </Step>
</Steps>

이제 머신의 모든 프로젝트에서 코드베이스를 분석하고 개선 사항을 제안하는 데 사용할 수 있는 서브에이전트가 있습니다.

마크다운 파일로 수동으로 서브에이전트를 만들거나, CLI 플래그를 통해 정의하거나, 플러그인을 통해 배포할 수도 있습니다. 다음 섹션에서는 모든 구성 옵션을 다룹니다.

## 서브에이전트 구성

### /agents 명령 사용

`/agents` 명령은 서브에이전트를 관리하기 위한 대화형 인터페이스를 제공합니다. `/agents`를 실행하여:

* 모든 사용 가능한 서브에이전트 보기 (기본 제공, 사용자, 프로젝트, 플러그인)
* 안내된 설정 또는 Claude 생성으로 새 서브에이전트 만들기
* 기존 서브에이전트 구성 및 도구 액세스 편집
* 사용자 정의 서브에이전트 삭제
* 중복이 있을 때 활성 서브에이전트 확인

이것이 서브에이전트를 만들고 관리하는 권장 방법입니다. 수동 생성 또는 자동화의 경우 서브에이전트 파일을 직접 추가할 수도 있습니다.

### 서브에이전트 범위 선택

서브에이전트는 YAML 프론트매터가 있는 마크다운 파일입니다. 범위에 따라 다른 위치에 저장합니다. 여러 서브에이전트가 같은 이름을 공유할 때 우선순위가 높은 위치가 우선합니다.

| 위치                   | 범위            | 우선순위   | 만드는 방법                     |
| :------------------- | :------------ | :----- | :------------------------- |
| `--agents` CLI 플래그   | 현재 세션         | 1 (최고) | Claude Code 시작 시 JSON 전달   |
| `.claude/agents/`    | 현재 프로젝트       | 2      | 대화형 또는 수동                  |
| `~/.claude/agents/`  | 모든 프로젝트       | 3      | 대화형 또는 수동                  |
| 플러그인의 `agents/` 디렉토리 | 플러그인이 활성화된 위치 | 4 (최저) | [플러그인](/ko/plugins)과 함께 설치 |

**프로젝트 서브에이전트** (`.claude/agents/`)는 코드베이스에 특정한 서브에이전트에 이상적입니다. 버전 제어에 체크인하여 팀이 협업으로 사용하고 개선할 수 있습니다.

**사용자 서브에이전트** (`~/.claude/agents/`)는 모든 프로젝트에서 사용 가능한 개인 서브에이전트입니다.

**CLI 정의 서브에이전트**는 Claude Code를 시작할 때 JSON으로 전달됩니다. 해당 세션에만 존재하며 디스크에 저장되지 않아 빠른 테스트 또는 자동화 스크립트에 유용합니다:

```bash  theme={null}
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

`--agents` 플래그는 [프론트매터](#supported-frontmatter-fields)와 동일한 필드를 가진 JSON을 허용합니다. 시스템 프롬프트에 `prompt`를 사용합니다 (파일 기반 서브에이전트의 마크다운 본문과 동등). 전체 JSON 형식은 [CLI 참조](/ko/cli-reference#agents-flag-format)를 참조하세요.

**플러그인 서브에이전트**는 설치한 [플러그인](/ko/plugins)에서 제공됩니다. `/agents`에서 사용자 정의 서브에이전트와 함께 나타납니다. 플러그인 서브에이전트 만드는 방법에 대한 자세한 내용은 [플러그인 컴포넌트 참조](/ko/plugins-reference#agents)를 참조하세요.

### 서브에이전트 파일 작성

서브에이전트 파일은 구성을 위한 YAML 프론트매터 다음에 마크다운의 시스템 프롬프트를 사용합니다:

<Note>
  서브에이전트는 세션 시작 시 로드됩니다. 파일을 수동으로 추가하여 서브에이전트를 만드는 경우 세션을 다시 시작하거나 `/agents`를 사용하여 즉시 로드합니다.
</Note>

```markdown  theme={null}
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

프론트매터는 서브에이전트의 메타데이터와 구성을 정의합니다. 본문은 서브에이전트의 동작을 안내하는 시스템 프롬프트가 됩니다. 서브에이전트는 이 시스템 프롬프트만 받습니다 (작업 디렉토리와 같은 기본 환경 세부 정보 포함). 전체 Claude Code 시스템 프롬프트는 받지 않습니다.

#### 지원되는 프론트매터 필드

다음 필드를 YAML 프론트매터에서 사용할 수 있습니다. `name`과 `description`만 필수입니다.

| 필드                | 필수  | 설명                                                                                                           |
| :---------------- | :-- | :----------------------------------------------------------------------------------------------------------- |
| `name`            | 예   | 소문자 및 하이픈을 사용한 고유 식별자                                                                                        |
| `description`     | 예   | Claude가 이 서브에이전트에 위임해야 할 때                                                                                   |
| `tools`           | 아니오 | 서브에이전트가 사용할 수 있는 [도구](#available-tools). 생략하면 모든 도구 상속                                                       |
| `disallowedTools` | 아니오 | 거부할 도구, 상속되거나 지정된 목록에서 제거됨                                                                                   |
| `model`           | 아니오 | 사용할 [모델](#choose-a-model): `sonnet`, `opus`, `haiku`, 또는 `inherit`. 기본값은 `sonnet`                            |
| `permissionMode`  | 아니오 | [권한 모드](#permission-modes): `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, 또는 `plan`              |
| `skills`          | 아니오 | 시작 시 서브에이전트의 컨텍스트에 로드할 [스킬](/ko/skills). 전체 스킬 콘텐츠가 주입되며, 호출 가능하게만 만들어지지 않습니다. 서브에이전트는 부모 대화에서 스킬을 상속하지 않습니다 |
| `hooks`           | 아니오 | 이 서브에이전트로 범위가 지정된 [라이프사이클 훅](#define-hooks-for-subagents)                                                    |

### 모델 선택

`model` 필드는 서브에이전트가 사용하는 [AI 모델](/ko/model-config)을 제어합니다:

* **모델 별칭**: 사용 가능한 별칭 중 하나 사용: `sonnet`, `opus`, 또는 `haiku`
* **inherit**: 주 대화와 동일한 모델 사용 (일관성을 위해 유용)
* **생략됨**: 지정하지 않으면 서브에이전트에 대해 구성된 기본 모델 사용 (`sonnet`)

### 서브에이전트 기능 제어

도구 액세스, 권한 모드 및 조건부 규칙을 통해 서브에이전트가 할 수 있는 작업을 제어할 수 있습니다.

#### 사용 가능한 도구

서브에이전트는 Claude Code의 [내부 도구](/ko/settings#tools-available-to-claude) 중 하나를 사용할 수 있습니다. 기본적으로 서브에이전트는 MCP 도구를 포함하여 주 대화의 모든 도구를 상속합니다.

도구를 제한하려면 `tools` 필드 (허용 목록) 또는 `disallowedTools` 필드 (거부 목록)를 사용합니다:

```yaml  theme={null}
---
name: safe-researcher
description: Research agent with restricted capabilities
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
---
```

#### 권한 모드

`permissionMode` 필드는 서브에이전트가 권한 프롬프트를 처리하는 방식을 제어합니다. 서브에이전트는 주 대화에서 권한 컨텍스트를 상속하지만 모드를 재정의할 수 있습니다.

| 모드                  | 동작                                   |
| :------------------ | :----------------------------------- |
| `default`           | 프롬프트를 사용한 표준 권한 확인                   |
| `acceptEdits`       | 파일 편집 자동 수락                          |
| `dontAsk`           | 권한 프롬프트 자동 거부 (명시적으로 허용된 도구는 여전히 작동) |
| `bypassPermissions` | 모든 권한 확인 건너뛰기                        |
| `plan`              | 계획 모드 (읽기 전용 탐색)                     |

<Warning>
  `bypassPermissions`를 주의해서 사용하세요. 모든 권한 확인을 건너뛰어 서브에이전트가 승인 없이 모든 작업을 실행할 수 있습니다.
</Warning>

부모가 `bypassPermissions`를 사용하면 이것이 우선하며 재정의할 수 없습니다.

#### 서브에이전트에 스킬 미리 로드

`skills` 필드를 사용하여 시작 시 스킬 콘텐츠를 서브에이전트의 컨텍스트에 주입합니다. 이렇게 하면 실행 중에 스킬을 발견하고 로드할 필요 없이 서브에이전트에 도메인 지식을 제공합니다.

```yaml  theme={null}
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions and patterns from the preloaded skills.
```

각 스킬의 전체 콘텐츠가 서브에이전트의 컨텍스트에 주입되며, 호출 가능하게만 만들어지지 않습니다. 서브에이전트는 부모 대화에서 스킬을 상속하지 않습니다. 명시적으로 나열해야 합니다.

<Note>
  이것은 [서브에이전트에서 스킬 실행](/ko/skills#run-skills-in-a-subagent)의 역입니다. 서브에이전트의 `skills`를 사용하면 서브에이전트가 시스템 프롬프트를 제어하고 스킬 콘텐츠를 로드합니다. 스킬의 `context: fork`를 사용하면 스킬 콘텐츠가 지정한 에이전트에 주입됩니다. 둘 다 동일한 기본 시스템을 사용합니다.
</Note>

#### 훅을 사용한 조건부 규칙

도구 사용을 더 동적으로 제어하려면 `PreToolUse` 훅을 사용하여 실행 전에 작업을 검증합니다. 도구의 일부 작업은 허용하면서 다른 작업은 차단해야 할 때 유용합니다.

이 예제는 읽기 전용 데이터베이스 쿼리만 허용하는 서브에이전트를 만듭니다. `PreToolUse` 훅은 각 Bash 명령이 실행되기 전에 `command`에 지정된 스크립트를 실행합니다:

```yaml  theme={null}
---
name: db-reader
description: Execute read-only database queries
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---
```

Claude Code는 [훅 입력을 JSON으로](/ko/hooks#pretooluse-input) stdin을 통해 훅 명령에 전달합니다. 검증 스크립트는 이 JSON을 읽고 Bash 명령을 추출하며 [종료 코드 2](/ko/hooks#exit-code-2-behavior)로 쓰기 작업을 차단합니다:

```bash  theme={null}
#!/bin/bash
# ./scripts/validate-readonly-query.sh

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Block SQL write operations (case-insensitive)
if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b' > /dev/null; then
  echo "Blocked: Only SELECT queries are allowed" >&2
  exit 2
fi

exit 0
```

[훅 입력](/ko/hooks#pretooluse-input)에서 전체 입력 스키마를 참조하고 [종료 코드](/ko/hooks#simple-exit-code)에서 종료 코드가 동작에 미치는 영향을 참조하세요.

#### 특정 서브에이전트 비활성화

[설정](/ko/settings#permission-settings)의 `deny` 배열에 서브에이전트를 추가하여 Claude가 특정 서브에이전트를 사용하지 못하도록 할 수 있습니다. `Task(subagent-name)` 형식을 사용합니다. 여기서 `subagent-name`은 서브에이전트의 name 필드와 일치합니다.

```json  theme={null}
{
  "permissions": {
    "deny": ["Task(Explore)", "Task(my-custom-agent)"]
  }
}
```

이것은 기본 제공 및 사용자 정의 서브에이전트 모두에서 작동합니다. `--disallowedTools` CLI 플래그를 사용할 수도 있습니다:

```bash  theme={null}
claude --disallowedTools "Task(Explore)"
```

권한 규칙에 대한 자세한 내용은 [IAM 문서](/ko/iam#tool-specific-permission-rules)를 참조하세요.

### 서브에이전트에 대한 훅 정의

서브에이전트는 서브에이전트의 라이프사이클 동안 실행되는 [훅](/ko/hooks)을 정의할 수 있습니다. 훅을 구성하는 두 가지 방법이 있습니다:

1. **서브에이전트의 프론트매터에서**: 해당 서브에이전트가 활성화된 동안만 실행되는 훅 정의
2. **`settings.json`에서**: 서브에이전트가 시작되거나 중지될 때 주 세션에서 실행되는 훅 정의

#### 서브에이전트 프론트매터의 훅

서브에이전트의 마크다운 파일에 직접 훅을 정의합니다. 이러한 훅은 해당 특정 서브에이전트가 활성화된 동안만 실행되며 완료되면 정리됩니다.

| 이벤트           | 매처 입력 | 실행 시기              |
| :------------ | :---- | :----------------- |
| `PreToolUse`  | 도구 이름 | 서브에이전트가 도구를 사용하기 전 |
| `PostToolUse` | 도구 이름 | 서브에이전트가 도구를 사용한 후  |
| `Stop`        | (없음)  | 서브에이전트가 완료될 때      |

이 예제는 `PreToolUse` 훅으로 Bash 명령을 검증하고 `PostToolUse`로 파일 편집 후 린터를 실행합니다:

```yaml  theme={null}
---
name: code-reviewer
description: Review code changes with automatic linting
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh $TOOL_INPUT"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
---
```

프론트매터의 `Stop` 훅은 자동으로 `SubagentStop` 이벤트로 변환됩니다.

#### 서브에이전트 이벤트에 대한 프로젝트 수준 훅

주 세션에서 서브에이전트 라이프사이클 이벤트에 응답하는 `settings.json`의 훅을 구성합니다. `matcher` 필드를 사용하여 이름으로 특정 에이전트 유형을 대상으로 합니다.

| 이벤트             | 매처 입력      | 실행 시기             |
| :-------------- | :--------- | :---------------- |
| `SubagentStart` | 에이전트 유형 이름 | 서브에이전트가 실행을 시작할 때 |
| `SubagentStop`  | 에이전트 유형 이름 | 서브에이전트가 완료될 때     |

이 예제는 `db-agent` 서브에이전트가 시작되고 중지될 때만 설정 및 정리 스크립트를 실행합니다:

```json  theme={null}
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [
          { "type": "command", "command": "./scripts/setup-db-connection.sh" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "db-agent",
        "hooks": [
          { "type": "command", "command": "./scripts/cleanup-db-connection.sh" }
        ]
      }
    ]
  }
}
```

전체 훅 구성 형식은 [훅](/ko/hooks)을 참조하세요.

## 서브에이전트 작업

### 자동 위임 이해

Claude는 요청의 작업 설명, 서브에이전트 구성의 `description` 필드 및 현재 컨텍스트를 기반으로 자동으로 작업을 위임합니다. 사전 위임을 장려하려면 서브에이전트의 description 필드에 "use proactively"와 같은 구문을 포함하세요.

특정 서브에이전트를 명시적으로 요청할 수도 있습니다:

```
Use the test-runner subagent to fix failing tests
Have the code-reviewer subagent look at my recent changes
```

### 서브에이전트를 포그라운드 또는 백그라운드에서 실행

서브에이전트는 포그라운드 (차단) 또는 백그라운드 (동시)에서 실행할 수 있습니다:

* **포그라운드 서브에이전트**는 완료될 때까지 주 대화를 차단합니다. 권한 프롬프트 및 명확히 하는 질문 (예: [`AskUserQuestion`](/ko/settings#tools-available-to-claude))이 사용자에게 전달됩니다.
* **백그라운드 서브에이전트**는 계속 작업하는 동안 동시에 실행됩니다. 부모의 권한을 상속하고 사전 승인되지 않은 모든 항목을 자동으로 거부합니다. 백그라운드 서브에이전트가 없는 권한이 필요하거나 명확히 하는 질문이 필요한 경우 해당 도구 호출이 실패하지만 서브에이전트는 계속됩니다. MCP 도구는 백그라운드 서브에이전트에서 사용할 수 없습니다.

백그라운드 서브에이전트가 누락된 권한으로 인해 실패하면 [재개](#resume-subagents)하여 포그라운드에서 대화형 프롬프트로 다시 시도할 수 있습니다.

Claude는 작업을 기반으로 서브에이전트를 포그라운드 또는 백그라운드에서 실행할지 결정합니다. 다음을 수행할 수도 있습니다:

* Claude에게 "run this in the background" 요청
* **Ctrl+B**를 눌러 실행 중인 작업을 백그라운드로 이동

모든 백그라운드 작업 기능을 비활성화하려면 `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` 환경 변수를 `1`로 설정합니다. [환경 변수](/ko/settings#environment-variables)를 참조하세요.

### 일반적인 패턴

#### 대량 작업 격리

서브에이전트의 가장 효과적인 사용 중 하나는 많은 양의 출력을 생성하는 작업을 격리하는 것입니다. 테스트 실행, 문서 가져오기 또는 로그 파일 처리는 상당한 컨텍스트를 소비할 수 있습니다. 이를 서브에이전트에 위임하면 자세한 출력이 서브에이전트의 컨텍스트에 유지되고 관련 요약만 주 대화로 반환됩니다.

```
Use a subagent to run the test suite and report only the failing tests with their error messages
```

#### 병렬 연구 실행

독립적인 조사의 경우 여러 서브에이전트를 동시에 작동하도록 생성합니다:

```
Research the authentication, database, and API modules in parallel using separate subagents
```

각 서브에이전트는 자신의 영역을 독립적으로 탐색한 다음 Claude가 결과를 종합합니다. 이것은 연구 경로가 서로 의존하지 않을 때 가장 잘 작동합니다.

<Warning>
  서브에이전트가 완료되면 결과가 주 대화로 반환됩니다. 각각 자세한 결과를 반환하는 많은 서브에이전트를 실행하면 상당한 컨텍스트를 소비할 수 있습니다.
</Warning>

#### 서브에이전트 연결

다단계 워크플로우의 경우 Claude에게 서브에이전트를 순서대로 사용하도록 요청합니다. 각 서브에이전트가 작업을 완료하고 결과를 Claude에 반환하면 Claude가 관련 컨텍스트를 다음 서브에이전트에 전달합니다.

```
Use the code-reviewer subagent to find performance issues, then use the optimizer subagent to fix them
```

### 서브에이전트와 주 대화 중 선택

**주 대화**를 사용하는 경우:

* 작업이 빈번한 왕복 또는 반복적 개선이 필요한 경우
* 여러 단계가 상당한 컨텍스트를 공유하는 경우 (계획 → 구현 → 테스트)
* 빠르고 대상이 지정된 변경을 수행하는 경우
* 지연시간이 중요한 경우. 서브에이전트는 새로 시작하며 컨텍스트를 수집하는 데 시간이 걸릴 수 있습니다

**서브에이전트**를 사용하는 경우:

* 작업이 주 컨텍스트에 필요하지 않은 자세한 출력을 생성하는 경우
* 특정 도구 제한 또는 권한을 적용하려는 경우
* 작업이 자체 포함되어 있고 요약을 반환할 수 있는 경우

주 대화 컨텍스트가 아닌 격리된 서브에이전트 컨텍스트에서 실행되는 재사용 가능한 프롬프트 또는 워크플로우를 원할 때 [스킬](/ko/skills)을 고려하세요.

<Note>
  서브에이전트는 다른 서브에이전트를 생성할 수 없습니다. 워크플로우가 중첩된 위임이 필요한 경우 [스킬](/ko/skills)을 사용하거나 주 대화에서 [서브에이전트를 연결](#chain-subagents)하세요.
</Note>

### 서브에이전트 컨텍스트 관리

#### 서브에이전트 재개

각 서브에이전트 호출은 새로운 인스턴스를 만들고 새로운 컨텍스트를 만듭니다. 처음부터 시작하는 대신 기존 서브에이전트의 작업을 계속하려면 Claude에게 재개하도록 요청합니다.

재개된 서브에이전트는 모든 이전 도구 호출, 결과 및 추론을 포함한 전체 대화 기록을 유지합니다. 서브에이전트는 새로 시작하는 대신 정확히 중단한 위치에서 계속됩니다.

서브에이전트가 완료되면 Claude는 에이전트 ID를 받습니다. 서브에이전트를 재개하려면 Claude에게 이전 작업을 계속하도록 요청합니다:

```
Use the code-reviewer subagent to review the authentication module
[Agent completes]

Continue that code review and now analyze the authorization logic
[Claude resumes the subagent with full context from previous conversation]
```

에이전트 ID를 명시적으로 참조하려면 Claude에게 요청하거나 `~/.claude/projects/{project}/{sessionId}/subagents/`의 트랜스크립트 파일에서 ID를 찾을 수 있습니다. 각 트랜스크립트는 `agent-{agentId}.jsonl`로 저장됩니다.

서브에이전트 트랜스크립트는 주 대화와 독립적으로 유지됩니다:

* **주 대화 압축**: 주 대화가 압축될 때 서브에이전트 트랜스크립트는 영향을 받지 않습니다. 별도의 파일에 저장됩니다.
* **세션 지속성**: 서브에이전트 트랜스크립트는 세션 내에서 유지됩니다. 동일한 세션을 재개하여 Claude Code를 다시 시작한 후 [서브에이전트를 재개](#resume-subagents)할 수 있습니다.
* **자동 정리**: 트랜스크립트는 `cleanupPeriodDays` 설정 (기본값: 30일)을 기반으로 정리됩니다.

#### 자동 압축

서브에이전트는 주 대화와 동일한 논리를 사용하여 자동 압축을 지원합니다. 기본적으로 자동 압축은 약 95% 용량에서 트리거됩니다. 압축을 더 일찍 트리거하려면 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`를 더 낮은 백분율 (예: `50`)로 설정합니다. 자세한 내용은 [환경 변수](/ko/settings#environment-variables)를 참조하세요.

압축 이벤트는 서브에이전트 트랜스크립트 파일에 기록됩니다:

```json  theme={null}
{
  "type": "system",
  "subtype": "compact_boundary",
  "compactMetadata": {
    "trigger": "auto",
    "preTokens": 167189
  }
}
```

`preTokens` 값은 압축이 발생하기 전에 사용된 토큰 수를 보여줍니다.

## 예제 서브에이전트

이러한 예제는 서브에이전트를 구축하기 위한 효과적인 패턴을 보여줍니다. 시작점으로 사용하거나 Claude로 사용자 정의된 버전을 생성합니다.

<Tip>
  **모범 사례:**

  * **집중된 서브에이전트 설계:** 각 서브에이전트는 특정 작업에서 탁월해야 합니다
  * **자세한 설명 작성:** Claude는 설명을 사용하여 위임 시기를 결정합니다
  * **도구 액세스 제한:** 보안 및 집중을 위해 필요한 권한만 부여합니다
  * **버전 제어에 체크인:** 프로젝트 서브에이전트를 팀과 공유합니다
</Tip>

### 코드 검토자

수정 없이 코드를 검토하는 읽기 전용 서브에이전트입니다. 이 예제는 제한된 도구 액세스 (Edit 또는 Write 없음)와 정확히 무엇을 찾을지 및 출력 형식을 지정하는 자세한 프롬프트를 사용하여 집중된 서브에이전트를 설계하는 방법을 보여줍니다.

```markdown  theme={null}
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer ensuring high standards of code quality and security.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage
- Performance considerations addressed

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
```

### 디버거

문제를 분석하고 수정할 수 있는 서브에이전트입니다. 코드 검토자와 달리 이 서브에이전트는 버그 수정에 코드 수정이 필요하기 때문에 Edit을 포함합니다. 프롬프트는 진단에서 검증까지의 명확한 워크플로우를 제공합니다.

```markdown  theme={null}
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

Debugging process:
- Analyze error messages and logs
- Check recent code changes
- Form and test hypotheses
- Add strategic debug logging
- Inspect variable states

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach
- Prevention recommendations

Focus on fixing the underlying issue, not the symptoms.
```

### 데이터 과학자

데이터 분석 작업을 위한 도메인 특화 서브에이전트입니다. 이 예제는 일반적인 코딩 작업 외부의 특화된 워크플로우를 위해 서브에이전트를 만드는 방법을 보여줍니다. 더 유능한 분석을 위해 명시적으로 `model: sonnet`을 설정합니다.

```markdown  theme={null}
---
name: data-scientist
description: Data analysis expert for SQL queries, BigQuery operations, and data insights. Use proactively for data analysis tasks and queries.
tools: Bash, Read, Write
model: sonnet
---

You are a data scientist specializing in SQL and BigQuery analysis.

When invoked:
1. Understand the data analysis requirement
2. Write efficient SQL queries
3. Use BigQuery command line tools (bq) when appropriate
4. Analyze and summarize results
5. Present findings clearly

Key practices:
- Write optimized SQL queries with proper filters
- Use appropriate aggregations and joins
- Include comments explaining complex logic
- Format results for readability
- Provide data-driven recommendations

For each analysis:
- Explain the query approach
- Document any assumptions
- Highlight key findings
- Suggest next steps based on data

Always ensure queries are efficient and cost-effective.
```

### 데이터베이스 쿼리 검증자

Bash 액세스를 허용하지만 읽기 전용 SQL 쿼리만 허용하도록 명령을 검증하는 서브에이전트입니다. 이 예제는 `tools` 필드보다 더 세밀한 제어가 필요할 때 `PreToolUse` 훅을 사용하여 조건부 검증하는 방법을 보여줍니다.

```markdown  theme={null}
---
name: db-reader
description: Execute read-only database queries. Use when analyzing data or generating reports.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---

You are a database analyst with read-only access. Execute SELECT queries to answer questions about the data.

When asked to analyze data:
1. Identify which tables contain the relevant data
2. Write efficient SELECT queries with appropriate filters
3. Present results clearly with context

You cannot modify data. If asked to INSERT, UPDATE, DELETE, or modify schema, explain that you only have read access.
```

Claude Code는 [훅 입력을 JSON으로](/ko/hooks#pretooluse-input) stdin을 통해 훅 명령에 전달합니다. 검증 스크립트는 이 JSON을 읽고 실행 중인 명령을 추출하며 SQL 쓰기 작업 목록에 대해 확인합니다. 쓰기 작업이 감지되면 스크립트는 [종료 코드 2](/ko/hooks#exit-code-2-behavior)로 실행을 차단하고 stderr를 통해 Claude에 오류 메시지를 반환합니다.

프로젝트의 어디든 검증 스크립트를 만듭니다. 경로는 훅 구성의 `command` 필드와 일치해야 합니다:

```bash  theme={null}
#!/bin/bash
# Blocks SQL write operations, allows SELECT queries

# Read JSON input from stdin
INPUT=$(cat)

# Extract the command field from tool_input using jq
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block write operations (case-insensitive)
if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|MERGE)\b' > /dev/null; then
  echo "Blocked: Write operations not allowed. Use SELECT queries only." >&2
  exit 2
fi

exit 0
```

스크립트를 실행 가능하게 만듭니다:

```bash  theme={null}
chmod +x ./scripts/validate-readonly-query.sh
```

훅은 stdin을 통해 JSON을 받으며 Bash 명령이 `tool_input.command`에 있습니다. 종료 코드 2는 작업을 차단하고 오류 메시지를 Claude에 피드백합니다. 종료 코드 및 [훅 입력](/ko/hooks#pretooluse-input)에 대한 전체 입력 스키마에 대한 자세한 내용은 [훅](/ko/hooks#simple-exit-code)을 참조하세요.

## 다음 단계

이제 서브에이전트를 이해했으므로 다음 관련 기능을 살펴보세요:

* [플러그인으로 서브에이전트 배포](/ko/plugins) - 팀 또는 프로젝트 간 서브에이전트 공유
* [Claude Code를 프로그래밍 방식으로 실행](/ko/headless) - CI/CD 및 자동화를 위해 Agent SDK 사용
* [MCP 서버 사용](/ko/mcp) - 서브에이전트에 외부 도구 및 데이터에 대한 액세스 제공
