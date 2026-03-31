---
name: doc-prd
description: 인터뷰 기반 계획문서(PRD) + 마일스톤 생성
allowed-tools: Read, Write, AskUserQuestion, WebFetch, Bash
---

# PRD + 플랜 통합 스킬

## 용도

인터뷰를 통해 계획문서(PRD) + 마일스톤(작업계획)을 생성하고, MarkdownBlog에 동기화합니다.

## 활성화 조건

- **"계획문서 작성해줘"** (권장)
- "PRD 만들어줘"
- "기획서 작성해줘"
- "플랜 만들어줘"
- "새 기능 기획해줘"
- "계획 세워줘"

---

## 파일명 규칙

```
docs/plan/PRD_{feature-name}.md
```

**예시:**
- `PRD_user-authentication.md`
- `PRD_notification-center.md`
- `PRD_dark-mode.md`

**파일명 생성 방법:**
1. 기능/프로젝트명에서 핵심 키워드 2-4개 추출
2. 영문 kebab-case로 변환
3. `PRD_` 접두어 추가

---

## 워크플로우

### 1단계: 인터뷰

**기본 질문 (필수)**
1. 프로젝트/기능 이름?
2. 해결하려는 문제?
3. 주요 기능은?

**작업계획 질문 (필수)**
4. 작업을 몇 단계로 나눌까요? (마일스톤 수)
5. 각 마일스톤에서 할 작업은?
6. 목표 완료일?

**기술 질문 (선택)**
7. 기술 스택 또는 제약사항?
8. DB 변경 필요?
9. 연동할 서비스?

### 2단계: 파일명 결정

인터뷰 후 파일명 제안:
```
기능명: "사용자 레벨 시스템"
→ 파일명: PRD_user-level-system.md
→ 전체 경로: docs/plan/PRD_user-level-system.md
```

**사용자에게 파일명 확인** 후 진행

### 3단계: PRD + 마일스톤 생성

`docs/plan/PRD_{feature-name}.md` 생성

### 4단계: Dev Hub 등록

```
POST https://community.ilouli.com/api/community/dev-hub/tasks
{
  "title": "[PRD] {프로젝트명}",
  "description": "마일스톤:\n- M1: {제목}\n- M2: {제목}",
  "status": "in_progress",
  "priority": "high"
}
```

### 5단계: 안내

```
PRD + 플랜 생성 완료:
- 파일: {프로젝트}/docs/plan/PRD_{feature-name}.md
- Dev Hub: https://community.ilouli.com/dev-hub

"go"라고 말하면 미완료 마일스톤부터 시작합니다.
```

---

## PRD 템플릿

```markdown
# {프로젝트명} PRD

> 생성일: {날짜}
> 파일: `PRD_{feature-name}.md`
> Dev Hub: https://community.ilouli.com/dev-hub

---

## 1. 개요

### 해결하려는 문제
{bg_problem}

### 주요 기능
{feat_must_have}

### 범위 외 (안 함)
{feat_out_of_scope}

---

## 2. 기술 요구사항

| 항목 | 내용 |
|------|------|
| 기술 스택 | {tech_stack} |
| DB 변경 | {db_changes} |
| 연동 서비스 | {integrations} |

---

## 3. 마일스톤

### Milestone 1: {제목}
- [ ] 1.1 {작업}
- [ ] 1.2 {작업}

### Milestone 2: {제목}
- [ ] 2.1 {작업}
- [ ] 2.2 {작업}

### Milestone 3: {제목}
- [ ] 3.1 {작업}
- [ ] 3.2 {작업}

---

## 4. 일정

| 마일스톤 | 예상 완료 |
|----------|----------|
| M1 | |
| M2 | |
| M3 | |
| **전체** | {목표일} |

---

## 노트

- 다음 세션 참고사항
```

---

## 마일스톤 업데이트

작업 완료 시:
1. `docs/plan/PRD_{feature-name}.md`에서 해당 항목 체크 (`[x]`)
2. 커밋 메시지: `feat(프로젝트): M1.1 완료 - {내용}`
3. 모든 마일스톤 완료 시 Dev Hub 상태를 `completed`로 변경

---

## "go" 명령어 연동

`go` 입력 시:
1. 현재 프로젝트의 `docs/plan/PRD_*.md` 파일 확인
2. 미완료(`[ ]`) 마일스톤 중 첫 번째 찾기
3. 해당 마일스톤 작업 시작

---

## 간소화 모드

사용자가 "간단하게" 요청 시:
- 기본 질문 3개만 진행
- 마일스톤 2~3개로 자동 분할
- Dev Hub 등록은 동일

---

## 실행 지침

1. **시작**: "계획문서(PRD)와 작업계획을 함께 만들겠습니다. 몇 가지 질문 드릴게요."
2. **질문**: AskUserQuestion 활용하여 효율적으로 수집
3. **마일스톤 상세화**: 각 마일스톤의 세부 작업까지 확인
4. **파일명 확인**: "파일명은 `PRD_{feature-name}.md`로 저장할까요?"
5. **확인**: 생성 전 내용 요약하여 확인
6. **저장**: `docs/plan/PRD_{feature-name}.md`
7. **Git 커밋+푸시**: 생성된 PRD를 즉시 커밋하고 푸시
8. **MarkdownBlog 동기화 (필수!)**: sync API 호출하여 문서 동기화 + docId 확보
9. **링크 제공 (필수!)**: GitHub + MarkdownBlog 직접 링크 2개 제공
10. **안내**: "go"로 개발 시작 가능함을 알림

### 필수: 문서 생성 후 자동 동기화

**모든 문서 생성 스킬은 생성 완료 후 반드시 다음을 실행한다:**

```bash
# 1. Git 커밋+푸시
git add docs/plan/PRD_{feature-name}.md
git commit -m "docs: PRD_{feature-name} 계획문서 작성"
git push origin main

# 2. MarkdownBlog 동기화
CONTENT=$(cat docs/plan/PRD_{feature-name}.md)
GIT_HASH=$(git rev-parse --short HEAD)
DEVICE=$(hostname | sed 's/sangyoung.*/macbook/;s/.*mini.*/mini/;s/feel3025/dev/;s/mac-mini/mini/')

jq -n --arg project "{프로젝트명}" \
      --arg file_path "docs/plan/PRD_{feature-name}.md" \
      --arg content "$CONTENT" \
      --arg git_hash "$GIT_HASH" \
      --arg device "$DEVICE" \
      '{project: $project, file_path: $file_path, content: $content, git_hash: $git_hash, device: $device}' | \
curl -s -X POST "{SYNC_API_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Sync-Key: markdownblog-sync-key-2026" \
  -d @-

# 3. 링크 제공
📄 계획문서 생성 완료
- **GitHub**: https://github.com/feelgame3025/{repo}/blob/main/docs/plan/PRD_{feature-name}.md
- **MarkdownBlog**: https://markdown.ilouli.com/project/{project}/{docId}
```

**이 단계를 건너뛰면 안 된다. 사용자가 "문서 올려줘"를 별도로 말할 필요 없이 자동으로 완료한다.**
