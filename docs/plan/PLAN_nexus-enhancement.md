# Nexus 지식 그래프 종합 개선 계획

> 생성일: 2026-03-12
> 참조: nexus-layout.md (THE PUREUM Nexus UI 스펙)
> 현재 상태: nexus.ilouli.com 운영 중 (FastAPI + React + D3.js Canvas)
> 문서 유형: PLAN (마일스톤 + 세부 구현 가이드)

---

## 목차

1. [현재 상태 진단](#1-현재-상태-진단)
2. [GAP 분석 — 참조 문서 대비](#2-gap-분석--참조-문서-대비)
3. [프로젝트 자체 개선점](#3-프로젝트-자체-개선점)
4. [웹 트렌드 기반 확장 기능](#4-웹-트렌드-기반-확장-기능)
5. [마일스톤 계획 (5 Phase)](#5-마일스톤-계획-5-phase)
6. [기술 아키텍처 설계](#6-기술-아키텍처-설계)
7. [성능 & 확장성 로드맵](#7-성능--확장성-로드맵)
8. [참조 자료](#8-참조-자료)

---

## 1. 현재 상태 진단

### 1.1 아키텍처 현황

```
┌─────────────────────────────────────────────────────────────┐
│  nexus.ilouli.com                                           │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  React SPA   │────▶│  FastAPI     │────▶│  SQLite     │ │
│  │  D3.js Canvas│     │  Port 4010   │     │  + FTS5     │ │
│  │  Tailwind    │     │  Uvicorn     │     │  + Vec      │ │
│  └──────────────┘     └──────┬───────┘     └─────────────┘ │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│       │ News API │   │Community │   │ Stock DB │          │
│       │ :4008    │   │ API :4002│   │ (Direct) │          │
│       └──────────┘   └──────────┘   └──────────┘          │
│                                                             │
│       ┌──────────┐   ┌──────────────────────┐              │
│       │ Auth API │   │ GitHub Models        │              │
│       │ :4001    │   │ gpt-4o-mini ($0)     │              │
│       └──────────┘   └──────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 구현 완료 기능 체크리스트

| 카테고리 | 기능 | 상태 | 비고 |
|----------|------|:----:|------|
| **그래프** | Force-directed D3 Canvas | ✅ | 드래그, 줌, 노드 애니메이션 |
| **그래프** | 타입/소스 필터 칩 | ✅ | GraphExplorer 상단 |
| **그래프** | 타임라인 슬라이더 (1~365일) | ✅ | 좌하단, 드래그 방식 |
| **그래프** | 노드 enter/exit 애니메이션 | ✅ | 페이드인/아웃 + 스케일 |
| **그래프** | 노드 호버 툴팁 (카드형) | ✅ | 흰색 배경, 타입+연결수+소스 |
| **검색** | 실시간 검색 (FTS5) | ✅ | 300ms 디바운스 |
| **검색** | 벡터 유사도 폴백 | ✅ | API만 (프론트 미연결) |
| **데이터** | 뉴스/YouTube/커뮤니티/주식 수집 | ✅ | 실시간 + 배치 + Drip |
| **데이터** | AI 노드/엣지 추출 | ✅ | GitHub Models |
| **데이터** | 임베딩 생성 (384차원) | ✅ | sentence-transformers |
| **자동화** | Autolinker (고립 노드 연결) | ✅ | AI 기반 |
| **자동화** | Graph Linker (태그/클러스터) | ✅ | 규칙 기반 |
| **AI** | 노드 요약 | ✅ | API만 (프론트 미연결) |
| **AI** | 인과 분석 | ✅ | API만 (프론트 미연결) |
| **인증** | JWT 쿠키 (ilouli-auth) | ✅ | UTF-8 한글 디코딩 수정됨 |
| **레이아웃** | NavigationBar (공유) | ✅ | ilouli-main 동기화 |
| **레이아웃** | 사이드바 네비게이션 | ✅ | 단순 링크 목록 |
| **레이아웃** | NodeDetail 패널 | ✅ | 기본 정보만 |

### 1.3 미구현 / 부족한 영역

```
🔴 Critical (사용자 경험 핵심)
   ├── 사이드바가 단순 링크 → 3탭 구조 (노드/뉴스/타임라인) 필요
   ├── 노드 선택 시 이웃 하이라이트 없음 → dim 효과 필요
   ├── 포커스 모드 없음 → N-hop 필터링 필요
   └── 백엔드 AI API가 프론트엔드에 연결 안 됨

🟡 Important (그래프 탐색 품질)
   ├── 미니맵 없음 → 대규모 그래프 네비게이션 불편
   ├── 줌 컨트롤 UI 없음 → 버튼 기반 줌 필요
   ├── 그래프 설정 패널 없음 → 노드크기/엣지두께 조절 불가
   ├── 노드 편집/엣지 연결 UI 없음 → API만 존재
   ├── 노드 핀 고정 없음 → 위치 기억 불가
   └── 태그 필터/클라우드 없음 → 태그 데이터 미활용

🟢 Nice-to-have (완성도)
   ├── Footer 통계 바 없음
   ├── 줌 컨트롤 버튼 UI 없음
   ├── 내보내기 (PNG/JSON) 없음
   └── 온보딩 투어 없음
```

---

## 2. GAP 분석 — 참조 문서 대비

### 2.1 레이아웃 구조 비교

```
참조 (THE PUREUM Nexus)                현재 (ilouli-nexus)
┌────────────────────────────┐        ┌────────────────────────────┐
│       HEADER (52px)        │        │   NavigationBar (44px)     │
│  로고 │ 검색창 │ 테마버튼  │        │   ilouli 공통 헤더         │
├────┬───────────────┬───────┤        ├────┬───────────────────────┤
│    │               │Detail │        │    │                       │
│Side│   GRAPH       │Panel  │        │Side│     GRAPH             │
│bar │   CANVAS      │300px  │        │bar │     CANVAS            │
│260 │               │슬라이드│       │200 │   + 필터칩 + 타임라인  │
│3탭 │  미니맵+줌    │       │        │링크│                       │
├────┴───────────────┴───────┤        │목록│                       │
│      FOOTER (28px)         │        ├────┴───────────────────────┤
│  통계: 노드 4800 · 엣지 18K│        │         (없음)             │
└────────────────────────────┘        └────────────────────────────┘
```

### 2.2 기능별 상세 GAP

#### Sidebar — 가장 큰 차이

| 참조 문서 | 현재 | 구현 필요사항 |
|----------|------|-------------|
| **탭 1: 노드** — 고정 노드 섹션, 검색, 타입 칩 필터, 노드 목록 (스크롤), 태그 필터 | 단순 네비게이션 링크 목록 | 전면 재설계 필요 |
| **탭 2: 뉴스** — 카테고리 필터 (기술/경제/국제/기후/사회), 뉴스 카드 목록 | 없음 | 뉴스 피드 API + 카드 UI |
| **탭 3: 타임라인** — 날짜별 노드 이력, 건수 선택, 새로고침 | 없음 | 타임라인 뷰 컴포넌트 |

#### Graph Canvas

| 참조 문서 | 현재 | 구현 필요사항 |
|----------|------|-------------|
| 노드 선택 → 1-hop 하이라이트 + 나머지 dim 7% | 툴팁만 표시 | D3 렌더링 로직에 dim 상태 추가 |
| 포커스 버튼 (선택 노드+이웃만 남김) | 없음 | 포커스 모드 토글 + BFS 필터 |
| 미니맵 (160×100, 우하단) | 없음 | 별도 Canvas 또는 SVG 썸네일 |
| 줌 컨트롤 [+][-][⤢][⚙] | 마우스 휠만 | 버튼 UI + programmatic zoom |
| 그래프 설정 패널 (슬라이더 3개 + 필터) | 없음 | 설정 모달/사이드패널 |
| 노드 핀 고정 (주황 표시) | 없음 | fx/fy 고정 + 시각 표시 |
| 노드 색상: 타입별 고유 + 선택 시 내부 흰 원 | 타입별 색상 ✅ | 선택 노드 시각 강화 |

#### Detail Panel

| 참조 문서 | 현재 | 구현 필요사항 |
|----------|------|-------------|
| 우측 300px 슬라이드 인/아웃 | NodeDetail 있음 | 슬라이드 애니메이션 강화 |
| 타입 뱃지, 제목, URL, 태그, 날짜 | 기본 정보 있음 | UI 정리 |
| 연결 노드 (관계 타입별 그룹) | 연결 목록 있음 | 그룹핑 UI 개선 |
| AI 요약 버튼 + 인과 분석 버튼 | **없음** (API만 존재) | 🔴 프론트 연결 필수 |
| 편집/연결/삭제 버튼 | **없음** | 모달 UI 구현 |
| AI 요약 패널 (접기/펼치기) | **없음** | 아코디언 패널 |

#### 모달

| 참조 문서 | 현재 | 구현 필요사항 |
|----------|------|-------------|
| 노드 추가/편집 모달 (제목/타입/태그/내용/URL) | **없음** | 폼 모달 + PUT API 연결 |
| 엣지 연결 모달 (노드 검색 + 관계 타입 선택) | **없음** | 검색 autocomplete + POST API |
| AI 인과 분석 모달 (멀티홉 체인 시각화) | **없음** | 인과 체인 시각화 |

---

## 3. 프로젝트 자체 개선점

### 3.1 백엔드 API ↔ 프론트엔드 연결 GAP

현재 백엔드에 구현되어 있지만 프론트엔드에서 사용하지 않는 API:

```
┌────────────────────────────────────────────────────────────────┐
│  백엔드 API (구현됨)           →  프론트엔드 (미연결)           │
├────────────────────────────────────────────────────────────────┤
│  POST /api/analysis/summarize/{id}  →  Detail Panel 버튼 없음 │
│  POST /api/analysis/causal/{id}     →  Detail Panel 버튼 없음 │
│  GET  /api/search/similar/{id}      →  유사 노드 섹션 없음    │
│  POST /api/nodes (생성)             →  생성 UI 없음          │
│  PUT  /api/nodes/{id} (수정)        →  편집 UI 없음          │
│  POST /api/edges (엣지 생성)        →  연결 UI 없음          │
│  GET  /api/graph/stats              →  통계 표시 없음        │
│  POST /api/automation/autolink      →  IngestPage에만 존재   │
│  POST /api/automation/graphlink     →  IngestPage에만 존재   │
│  POST /api/ingest/embed             →  IngestPage에만 존재   │
│  POST /api/batch/drip/*             →  IngestPage에만 존재   │
└────────────────────────────────────────────────────────────────┘
```

> **결론**: 백엔드 기능의 약 40%가 프론트엔드에 노출되지 않고 있음

### 3.2 데이터 활용도 개선

| 현재 문제 | 근본 원인 | 개선 방향 |
|-----------|----------|-----------|
| 노드 생성 후 고립 (엣지 없음) | Autolinker가 수동 실행만 | 노드 생성 후 자동 autolink 트리거 |
| 태그 데이터 미활용 | 태그 필터 UI 없음 | 사이드바 태그 섹션 + 태그 클라우드 |
| source_type별 분포 모름 | 통계 UI 없음 | 소스별 파이차트 + 트렌드 라인 |
| 시간 기반 인사이트 없음 | 시계열 분석 미구현 | 핫토픽 감지 + 성장 추이 |
| 검색과 그래프 연결 약함 | 검색 결과가 드롭다운에만 | 검색 → 그래프 하이라이트 연동 |
| 임베딩 활용 제한적 | 유사 노드 UI 없음 | Detail Panel에 유사 노드 추천 |

### 3.3 UX 개선점

| 현재 | 개선 |
|------|------|
| 노드 클릭 → NodeDetail만 열림 | 클릭 → **1-hop 하이라이트 + Detail 열림** (동시) |
| 빈 공간 클릭 → 아무 반응 없음 | 빈 공간 클릭 → **dim 해제 + Detail 닫기** |
| 필터 변경 → 전체 그래프 리로드 | 필터 → **애니메이션 트랜지션** (이미 구현된 enter/exit 활용) |
| 검색 결과 → 드롭다운 클릭 | 검색 → **그래프에서 해당 노드 강조 + 카메라 이동** |
| 사이드바 → 네비게이션만 | 사이드바 → **데이터 탐색 허브** (노드/뉴스/타임라인) |

---

## 4. 웹 트렌드 기반 확장 기능

### 4.1 AI 강화 (2025-2026 핵심 트렌드)

#### A. GraphRAG 채팅 — 최고 차별화 가치

```
┌─────────────────────────────────────────────────────────────┐
│  사용자 질문: "반도체 산업에 영향을 주는 정책은?"              │
│                                                             │
│  1. 질문에서 엔티티 추출                                     │
│     → "반도체", "산업", "정책"                                │
│                                                             │
│  2. 그래프에서 관련 노드 탐색 (임베딩 유사도 + 엣지 순회)     │
│     → 반도체 노드 → causes → 수출규제 노드                  │
│     → 반도체 노드 → impacts → TSMC, 삼성전자 노드            │
│     → 정책 노드 → related → 미중갈등, 보조금 노드            │
│                                                             │
│  3. 서브그래프 컨텍스트 + 질문 → AI 답변 생성                 │
│     → "반도체 산업에 영향을 주는 정책으로는 ①미국 CHIPS법,    │
│        ②중국 수출규제, ③EU 반도체법이 있습니다. 그래프에서     │
│        확인된 인과 관계에 따르면..."                          │
│                                                             │
│  4. 답변 내 참조 노드 → 클릭 시 그래프에서 하이라이트          │
└─────────────────────────────────────────────────────────────┘
```

**구현 스펙:**
- 백엔드: `POST /api/ai/chat` — 질문 → 엔티티 추출 → 서브그래프 → RAG 답변
- 프론트: 채팅 패널 (사이드바 또는 플로팅)
- 비용: $0 (GitHub Models gpt-4o-mini)
- 참조: Microsoft GraphRAG, Neo4j Knowledge Graph Builder

#### B. 자연어 그래프 쿼리

```
검색창 입력: "최근 1주일 AI 관련 뉴스"
    ↓
AI 의도 파악:
  - 기간: 7일
  - 키워드: AI
  - 소스: news
    ↓
자동 필터 적용:
  - days=7, source_type=news, keyword=AI
  - 해당 노드 하이라이트 + 나머지 dim
```

**구현 스펙:**
- 백엔드: `POST /api/ai/query` — 자연어 → 필터 파라미터 JSON 변환
- 프론트: 검색창에서 일반 검색과 자연어 쿼리 자동 판별
- 비용: $0

#### C. 자동 클러스터링 + 토픽 감지

```
┌─────────────────────────────────────────────────────────────┐
│  networkx Louvain 알고리즘                                   │
│  → 커뮤니티 3개 감지:                                        │
│                                                             │
│  Cluster 1: [AI, GPT, LLM, 반도체, NVIDIA]                  │
│  Label: "AI 기술" (가장 빈번한 태그에서 추출)                 │
│  시각화: 보라색 convex hull                                   │
│                                                             │
│  Cluster 2: [금리, 환율, 인플레이션, 연준]                   │
│  Label: "경제·금융"                                          │
│  시각화: 초록색 convex hull                                   │
│                                                             │
│  Cluster 3: [우크라이나, 중국, 미국, NATO]                   │
│  Label: "국제 정치"                                          │
│  시각화: 주황색 convex hull                                   │
└─────────────────────────────────────────────────────────────┘
```

**구현 스펙:**
- 백엔드: `GET /api/graph/clusters` — networkx Louvain → 클러스터 ID 부여
- 프론트: 클러스터별 convex hull 영역 + 반투명 배경 + 라벨
- 의존성: `pip install networkx` (이미 포함 가능)

#### D. 스마트 추천 & 지식 갭 탐지

| 기능 | 로직 | UI |
|------|------|-----|
| **유사 노드 추천** | 임베딩 cosine similarity 상위 5개 | Detail Panel "관련 노드" 섹션 |
| **엣지 추천** | 유사도 높지만 직접 연결 안 된 노드 쌍 | "연결 추천" 알림/배지 |
| **지식 갭** | 노드 content에서 자주 등장하지만 노드 없는 키워드 | "생성 추천" 토스트 |
| **트렌드** | 최근 7일 노드 생성 빈도 상위 클러스터 | 대시보드 "핫 토픽" 위젯 |

### 4.2 시각화 고급 기능

#### A. 경로 탐색 (Path Finder)

```
사용자 조작:
1. 노드 A 선택 (시작점)
2. Shift+클릭으로 노드 B 선택 (도착점)
3. 최단 경로 하이라이트 (노드+엣지 강조, 나머지 dim)
4. 경로 정보 패널: "A → C → D → B (3 홉, 관계: causes → impacts → related)"
```

**구현 스펙:**
- 백엔드: `GET /api/graph/path?from={id}&to={id}` — BFS/Dijkstra
- 프론트: 경로 노드/엣지 강조 + 경로 정보 카드
- 의존성: networkx (Python) 또는 자체 BFS 구현

#### B. 레이아웃 전환

| 레이아웃 | 용도 | D3 구현 |
|----------|------|---------|
| **Force** (기본) | 자유 탐색 | d3.forceSimulation (현재) |
| **Radial** | 특정 노드 중심 | d3.forceRadial 추가 |
| **Hierarchical** | 인과 관계 시각화 | dagre + d3 연동 |

**구현 스펙:**
- 레이아웃 전환 버튼 (아이콘 3개)
- 전환 시 노드 위치 애니메이션 (현재 위치 → 새 레이아웃 위치)
- 추가 의존성: `dagre` (npm, hierarchical 레이아웃용)

#### C. 시간축 애니메이션 (Time Playback)

```
┌─────────────────────────────────────────────────────────────┐
│  [▶ 재생]  ────────●──────────── 2026-03-12               │
│            2026-01-01         현재                          │
│                                                             │
│  재생 시: 날짜가 진행되면서 노드가 하나씩 나타남              │
│  → 그래프가 시간순으로 성장하는 과정을 시각적으로 확인        │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 분석 대시보드

#### 통계 대시보드 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Nexus 대시보드                                          │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ 노드     │ 엣지     │ 고립노드  │ 밀도     │ 평균 연결도     │
│ 1,234    │ 3,456    │ 42       │ 0.15     │ 5.6            │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                                                             │
│  소스별 분포 (파이)     │    성장 추이 (라인차트, 90일)      │
│  ┌──────────────┐      │    ┌──────────────────────────┐   │
│  │    ◕ news    │      │    │  ╱╲  ╱──╲               │   │
│  │   ◐ youtube  │      │    │ ╱  ╲╱    ╲──╱╲─╱╲      │   │
│  │  ◔ community │      │    │╱               ╲╱ ╲──   │   │
│  │  ○ stock     │      │    └──────────────────────────┘   │
│  └──────────────┘      │                                    │
├─────────────────────────┴───────────────────────────────────┤
│  허브 노드 TOP 10                                           │
│  1. "인공지능" — 45 연결 | 2. "반도체" — 38 연결 | ...      │
├─────────────────────────────────────────────────────────────┤
│  Activity 히트맵 (GitHub 잔디 스타일, 90일)                  │
│  ░░░░▒▒▓▓████░░▒▒▒▓▓██▒▒░░▒▒▓▓████████▒▒░░               │
│  Jan          Feb          Mar                              │
└─────────────────────────────────────────────────────────────┘
```

**구현 스펙:**
- 백엔드: `GET /api/graph/stats` 확장 — density, avg_degree, hub_top10, daily_counts
- 프론트: DashboardPage 신규 — 차트 라이브러리 recharts 또는 D3 직접
- 라우트: `/dashboard` (admin 전용)

### 4.4 검색 & 필터 고급

#### 패싯 검색 구조

```
┌─────────────────────────────────────────────────────────────┐
│  검색: [___________________________]  [🔍]                  │
│                                                             │
│  필터:                                                      │
│  타입:   [전체] [concept] [tech] [stock] [project]          │
│  소스:   [전체] [news] [youtube] [community] [stock]        │
│  기간:   [7일] [30일] [90일] [전체]                         │
│  태그:   [AI] [경제] [정책] [기술] [+더보기]                │
│  연결도: [전체] [허브(5+)] [고립(0)]                        │
│                                                             │
│  ── 결과: 142개 노드 ──                                     │
│  [✓ 그래프에서 하이라이트]  [JSON 내보내기]                  │
└─────────────────────────────────────────────────────────────┘
```

#### 검색 → 그래프 연동 플로우

```
1. 검색 실행 → 결과 노드 ID 목록 획득
2. 그래프에서 해당 노드만 글로우(glow) 효과 적용
3. 나머지 노드 dim (30%)
4. 카메라 → 결과 노드의 바운딩 박스로 fit-to-view
5. 결과 클릭 → 해당 노드로 카메라 이동 + 선택
```

#### 뷰 저장 & 공유

| 저장 항목 | 설명 |
|----------|------|
| filters | 타입, 소스, 기간, 태그 필터 상태 |
| camera | zoom level, pan position |
| pinned | 고정된 노드 목록 + 위치 |
| layout | force / radial / hierarchical |
| name | 사용자 지정 뷰 이름 |

- localStorage에 저장 (개인 뷰)
- URL 쿼리 파라미터로 공유 가능: `nexus.ilouli.com/?view=abc123`

---

## 5. 마일스톤 계획 (5 Phase)

### 실행 순서 & 의존 관계

```
Phase 1 (사이드바 & Detail Panel) ─────── 사용자 경험 기반
   │
   ├─→ Phase 2 (캔버스 고급 기능) ─────── 그래프 탐색 핵심
   │        │
   │        └─→ Phase 4 (분석 대시보드) ── 인사이트
   │
   └─→ Phase 3 (AI 강화) ─────────────── 차별화 가치
            │
            └─→ Phase 5 (검색/필터 고급) ── 데이터 활용 극대화
```

---

### Phase 1: 사이드바 & Detail Panel 강화

> **목표**: 그래프 탐색의 핵심 UI 완성
> **복잡도**: 6점 (프론트 대규모 + 일부 백엔드)
> **작업 방식**: 서브에이전트 병렬 또는 Agent Teams (fe + be)

#### 1.1 사이드바 3탭 구조

**탭 1: 노드**

```jsx
// 구조
<NodeTab>
  <PinnedNodesSection />     {/* 고정 노드 (있을 때만) */}
  <SearchInput />             {/* 노드 검색 (디바운스) */}
  <TypeChipFilter />          {/* [전체][concept][tech][stock]... */}
  <NodeList />                {/* 가상 스크롤 목록 */}
  <TagFilterSection />        {/* 태그 필터 (있을 때만) */}
</NodeTab>
```

- **API**: `GET /api/nodes?limit=50&offset=0&node_type=concept`
- **가상 스크롤**: react-window 또는 Intersection Observer
- **노드 클릭**: 그래프에서 해당 노드 선택 + 카메라 이동

**탭 2: 뉴스**

```jsx
<NewsTab>
  <CategoryFilter />          {/* [전체][기술][경제][국제][사회] */}
  <NewsList>                  {/* 최근 수집된 뉴스 */}
    <NewsCard title content category source time />
  </NewsList>
</NewsTab>
```

- **API**: `GET /api/nodes?source_type=news&limit=50&sort=created_at:desc`
- **카드 형태**: 제목 (2줄) + 카테고리 뱃지 + 출처 + 시간
- **카드 클릭**: 해당 뉴스 노드 선택 + Detail 열기

**탭 3: 타임라인**

```jsx
<TimelineTab>
  <TimelineHeader count={50} onRefresh={handleRefresh} />
  <TimelineList>
    <DateSeparator date="2026-03-12" />
    <TimelineItem title type time />
    <TimelineItem title type time />
    <DateSeparator date="2026-03-11" />
    ...
  </TimelineList>
</TimelineTab>
```

- **API**: `GET /api/nodes?limit=50&sort=created_at:desc`
- **날짜 구분선**: KST 기준 일별 그룹핑
- **항목 클릭**: 해당 노드 선택

#### 1.2 Detail Panel 강화

```jsx
<DetailPanel open={!!selectedNode} onClose={handleClose}>
  {/* 기본 정보 */}
  <TypeBadge type={node.node_type} />
  <Title>{node.title}</Title>
  <Url href={node.url} />
  <TagList tags={node.tags} />
  <DateInfo created={node.created_at} />

  {/* 연결 노드 (관계별 그룹) */}
  <ConnectionsSection>
    <RelationGroup type="causes" nodes={causedNodes} />
    <RelationGroup type="impacts" nodes={impactedNodes} />
    <RelationGroup type="related" nodes={relatedNodes} />
  </ConnectionsSection>

  {/* AI 분석 */}
  <AISummarySection nodeId={node.id} />     {/* 요약 버튼 + 캐시 표시 */}
  <CausalAnalysisSection nodeId={node.id} /> {/* 인과 분석 버튼 */}

  {/* 유사 노드 추천 */}
  <SimilarNodesSection nodeId={node.id} />   {/* 임베딩 유사도 상위 5개 */}

  {/* 액션 버튼 */}
  <ActionButtons>
    <EditButton onClick={() => openEditModal(node)} />
    <ConnectButton onClick={() => openEdgeModal(node)} />
    <DeleteButton onClick={() => confirmDelete(node)} />  {/* admin만 */}
  </ActionButtons>
</DetailPanel>
```

#### 1.3 노드 편집 모달

```jsx
<NodeEditModal node={editingNode} onSave={handleSave} onClose={closeModal}>
  <FormField label="제목" value={title} onChange={setTitle} />
  <FormField label="타입" type="select" options={NODE_TYPES} />
  <FormField label="태그" type="tags" value={tags} />
  <FormField label="내용" type="textarea" rows={6} />
  <FormField label="URL" type="url" />
  <ButtonGroup>
    <CancelButton /> <SaveButton />
  </ButtonGroup>
</NodeEditModal>
```

- PUT `/api/nodes/{id}` 연결
- 새 노드 생성도 동일 모달 (POST `/api/nodes`)

#### 1.4 엣지 연결 모달

```jsx
<EdgeCreateModal sourceNode={selectedNode} onConnect={handleConnect}>
  <NodeSearchInput onSelect={setTargetNode} />  {/* 실시간 autocomplete */}
  <RelationTypeSelect value={relationType} options={RELATION_TYPES} />
  <Preview source={sourceNode} target={targetNode} relation={relationType} />
  <ButtonGroup>
    <CancelButton /> <ConnectButton />
  </ButtonGroup>
</EdgeCreateModal>
```

- POST `/api/edges` 연결
- 관계 타입: related, causes, part_of, uses, competes_with, impacts

#### 1.5 Footer 통계 바

```jsx
<Footer>
  <span>nexus.ilouli.com — 지식 그래프</span>
  <span>노드 {stats.nodes}개 · 엣지 {stats.edges}개</span>
  <span>최근 업데이트: {stats.lastUpdate}</span>
</Footer>
```

- `GET /api/graph/stats` 활용

#### 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `frontend/src/components/layout/Sidebar.js` | 전면 개편 | 3탭 구조 (노드/뉴스/타임라인) |
| `frontend/src/components/NodeDetail.js` | 대폭 확장 | AI 버튼, 유사 노드, 액션 버튼 |
| `frontend/src/components/NodeEditModal.js` | 신규 | 노드 생성/편집 폼 |
| `frontend/src/components/EdgeCreateModal.js` | 신규 | 엣지 연결 폼 |
| `frontend/src/components/layout/Footer.js` | 신규 | 통계 바 |
| `frontend/src/pages/GraphExplorer.js` | 수정 | 모달/패널 연결 |
| `frontend/src/services/api.js` | 추가 | analysis, similar, nodes CRUD 함수 |

---

### Phase 2: 그래프 캔버스 고급 기능

> **목표**: 프로급 그래프 탐색 경험
> **복잡도**: 5점 (프론트 집중, D3 심화)
> **작업 방식**: 서브에이전트

#### 2.1 노드 선택 시 1-hop 하이라이트 + dim

```javascript
// ForceGraph.js 렌더링 로직
function drawNode(ctx, node) {
  const isSelected = node.id === selectedNodeId;
  const isNeighbor = neighborSet.has(node.id);
  const hasSelection = selectedNodeId !== null;

  if (hasSelection && !isSelected && !isNeighbor) {
    ctx.globalAlpha = 0.07;  // dim 상태
  } else {
    ctx.globalAlpha = 1.0;
  }

  // 선택 노드: 두꺼운 외곽선 + 내부 흰 원
  if (isSelected) {
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    // 내부 흰색 원
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}
```

#### 2.2 포커스 모드

```javascript
// BFS로 N-hop 이웃 추출
function getNHopNeighbors(nodeId, edges, n = 2) {
  const visited = new Set([nodeId]);
  let frontier = [nodeId];
  for (let hop = 0; hop < n; hop++) {
    const nextFrontier = [];
    for (const id of frontier) {
      for (const edge of edges) {
        const neighbor = edge.source.id === id ? edge.target.id :
                         edge.target.id === id ? edge.source.id : null;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
  }
  return visited;
}
```

- 포커스 버튼: 좌상단, 노드 선택 시에만 표시
- 홉 슬라이더: 1~3 범위

#### 2.3 미니맵

```
구현 방식 2가지:
A. 별도 <canvas> (작은 크기) — 메인 캔버스 데이터를 축소 렌더링
B. SVG 오버레이 — 노드 위치만 점으로 표시

→ 방식 A 권장 (Canvas 기반이므로 일관성)
```

- 위치: 우하단 160×100px
- 뷰포트 사각형: 현재 보이는 영역 표시
- 클릭/드래그: 해당 위치로 카메라 이동

#### 2.4 줌 컨트롤 + 설정 패널

```
[+] 줌 인    → d3.zoom.scaleBy(1.3)
[-] 줌 아웃  → d3.zoom.scaleBy(0.7)
[⤢] 전체 보기 → fit-to-bounds
[⚙] 설정    → 설정 패널 토글
```

**설정 패널 내용:**
- 노드 크기: 슬라이더 (0.5x ~ 2x)
- 엣지 두께: 슬라이더 (0.5x ~ 3x)
- 라벨 표시 줌 임계: 슬라이더 (줌 레벨)
- 관계 타입 필터: 칩 토글 (related, causes, impacts, ...)

#### 2.5 노드 핀 고정

- **트리거**: 더블클릭 또는 Detail Panel에서 핀 버튼
- **동작**: `node.fx = node.x; node.fy = node.y;` (D3 고정)
- **시각**: 노드 우상단에 주황색 작은 원 표시
- **해제**: 다시 더블클릭 → `node.fx = null; node.fy = null;`
- **사이드바 연동**: 노드 탭 상단 "고정 노드" 섹션에 표시

#### 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `frontend/src/components/ForceGraph.js` | 대폭 수정 | dim, 선택 시각, 핀, 미니맵 데이터 |
| `frontend/src/components/Minimap.js` | 신규 | 축소 캔버스 + 뷰포트 |
| `frontend/src/components/GraphControls.js` | 신규 | 줌 버튼 + 설정 패널 |
| `frontend/src/pages/GraphExplorer.js` | 수정 | 포커스 모드 버튼 + 컨트롤 연결 |

---

### Phase 3: AI 강화 (GraphRAG + 자연어 쿼리)

> **목표**: 그래프 데이터 기반 AI 대화 — 최대 차별화 가치
> **복잡도**: 6점 (백엔드 핵심 + 프론트 채팅 UI)
> **작업 방식**: Agent Teams (be-dev + fe-dev)
> **비용**: $0 (GitHub Models 유지)

#### 3.1 백엔드: GraphRAG 서비스

```python
# app/services/graphrag.py

async def extract_subgraph(question: str, db) -> dict:
    """질문에서 관련 서브그래프 추출"""
    # 1. 질문에서 키워드 추출 (AI 또는 형태소 분석)
    keywords = await extract_keywords(question)

    # 2. FTS5로 관련 노드 검색
    nodes = fts_search(db, keywords, limit=20)

    # 3. 임베딩 유사도로 보충
    question_emb = get_embedding(question)
    similar_nodes = vector_search(db, question_emb, limit=10)

    # 4. 관련 노드의 1-hop 이웃 포함
    expanded = expand_neighbors(db, nodes + similar_nodes)

    # 5. 서브그래프 반환
    return {
        "nodes": expanded.nodes,
        "edges": expanded.edges,
        "context": format_subgraph_as_text(expanded)
    }

async def chat(question: str, db) -> dict:
    """GraphRAG 채팅"""
    subgraph = await extract_subgraph(question, db)

    prompt = f"""
    다음 지식 그래프 데이터를 기반으로 질문에 답하세요.
    답변에 참조한 노드의 제목을 [[노드제목]] 형식으로 표시하세요.

    === 그래프 데이터 ===
    {subgraph['context']}

    === 질문 ===
    {question}
    """

    answer = await ai_client.chat_completion(prompt)

    # 참조 노드 추출 ([[...]] 패턴)
    referenced_nodes = extract_references(answer, subgraph['nodes'])

    return {
        "answer": answer,
        "referenced_nodes": referenced_nodes,
        "subgraph": subgraph
    }
```

#### 3.2 백엔드: API 엔드포인트

```python
# app/api/ai.py 확장

@router.post("/chat")
async def ai_chat(req: ChatRequest):
    """GraphRAG 채팅"""
    result = await graphrag.chat(req.question, get_db())
    return result

@router.post("/query")
async def ai_query(req: QueryRequest):
    """자연어 → 필터 파라미터 변환"""
    filters = await parse_natural_query(req.query)
    return {"filters": filters}  # {days, node_type, source_type, keywords}
```

#### 3.3 프론트: 채팅 패널

```jsx
<ChatPanel open={chatOpen} onToggle={toggleChat}>
  <ChatMessages>
    {messages.map(msg => (
      <ChatBubble key={msg.id} role={msg.role}>
        {msg.role === 'assistant' ? (
          <MarkdownRenderer
            content={msg.content}
            onNodeClick={(title) => highlightNodeByTitle(title)}
          />
        ) : msg.content}
      </ChatBubble>
    ))}
  </ChatMessages>
  <ChatInput onSend={handleSend} placeholder="그래프에 대해 물어보세요..." />
</ChatPanel>
```

- 위치: 우하단 플로팅 또는 사이드바 4번째 탭
- 노드 참조: `[[노드제목]]` → 클릭 시 그래프에서 하이라이트
- 답변에 사용된 서브그래프 시각화 옵션

#### 3.4 스마트 추천

```python
# app/api/search.py 확장

@router.get("/similar/{node_id}")
async def find_similar(node_id: int, limit: int = 5):
    """임베딩 유사도 기반 유사 노드"""
    # 이미 구현됨 — 프론트 연결만 필요
    ...

@router.get("/suggest-edges")
async def suggest_edges(node_id: int, limit: int = 5):
    """연결 추천: 유사하지만 연결 안 된 노드"""
    similar = find_similar_not_connected(node_id, db)
    return {"suggestions": similar}
```

#### 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `app/services/graphrag.py` | 신규 | 서브그래프 추출 + RAG 로직 |
| `app/api/ai.py` | 확장 | chat, query 엔드포인트 |
| `app/api/search.py` | 확장 | suggest-edges 엔드포인트 |
| `frontend/src/components/ChatPanel.js` | 신규 | 채팅 UI |
| `frontend/src/pages/GraphExplorer.js` | 수정 | 채팅 패널 + 자연어 쿼리 통합 |
| `frontend/src/services/api.js` | 추가 | chat, query API 함수 |

---

### Phase 4: 분석 대시보드 & 클러스터링

> **목표**: 그래프 인사이트를 데이터로 제공
> **복잡도**: 4점 (백엔드 통계 + 프론트 차트)
> **작업 방식**: 서브에이전트

#### 4.1 백엔드: 통계 API 확장

```python
# app/api/graph.py — /api/graph/stats 확장

@router.get("/stats/detailed")
async def detailed_stats():
    """상세 그래프 통계"""
    with get_db() as db:
        return {
            "total_nodes": count_nodes(db),
            "total_edges": count_edges(db),
            "orphan_nodes": count_orphan_nodes(db),
            "density": calculate_density(db),
            "avg_degree": calculate_avg_degree(db),
            "type_distribution": get_type_distribution(db),      # {concept: 400, tech: 200, ...}
            "source_distribution": get_source_distribution(db),  # {news: 500, youtube: 300, ...}
            "daily_counts": get_daily_counts(db, days=90),       # [{date, nodes, edges}, ...]
            "hub_top10": get_hub_nodes(db, limit=10),            # [{id, title, degree}, ...]
            "recent_activity": get_recent_activity(db, hours=24),
        }
```

#### 4.2 백엔드: 클러스터링 API

```python
# app/services/clustering.py

import networkx as nx
from networkx.algorithms.community import louvain_communities

def detect_clusters(db) -> list[dict]:
    """Louvain 알고리즘으로 커뮤니티 감지"""
    G = build_networkx_graph(db)
    communities = louvain_communities(G, resolution=1.0)

    clusters = []
    for i, community in enumerate(communities):
        node_ids = list(community)
        # 클러스터 라벨: 가장 빈번한 태그
        label = get_dominant_tag(db, node_ids)
        clusters.append({
            "id": i,
            "label": label,
            "node_ids": node_ids,
            "size": len(node_ids),
        })

    return sorted(clusters, key=lambda c: c['size'], reverse=True)
```

#### 4.3 프론트: 대시보드 페이지

- 라우트: `/dashboard`
- 차트 라이브러리: recharts (React 친화적, 가벼움)
- 구성: 통계 카드 (5개) + 소스 파이차트 + 성장 라인차트 + 허브 TOP 10 + 히트맵

#### 4.4 프론트: 클러스터 시각화

```javascript
// ForceGraph.js — convex hull 렌더링
function drawClusterHulls(ctx, clusters, nodes) {
  for (const cluster of clusters) {
    const clusterNodes = nodes.filter(n => cluster.node_ids.includes(n.id));
    if (clusterNodes.length < 3) continue;

    const hull = d3.polygonHull(clusterNodes.map(n => [n.x, n.y]));
    if (!hull) continue;

    ctx.beginPath();
    ctx.moveTo(hull[0][0], hull[0][1]);
    hull.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = `${cluster.color}15`;  // 8% 투명도
    ctx.fill();
    ctx.strokeStyle = `${cluster.color}40`;
    ctx.stroke();

    // 라벨
    const centroid = d3.polygonCentroid(hull);
    ctx.fillStyle = `${cluster.color}80`;
    ctx.font = '11px "Noto Sans KR"';
    ctx.fillText(cluster.label, centroid[0], centroid[1]);
  }
}
```

#### 4.5 경로 탐색

```python
# app/api/graph.py

@router.get("/path")
async def find_path(from_id: int, to_id: int):
    """두 노드 간 최단 경로"""
    G = build_networkx_graph(get_db())
    try:
        path = nx.shortest_path(G, from_id, to_id)
        edges_on_path = get_edges_for_path(get_db(), path)
        return {"path": path, "edges": edges_on_path, "length": len(path) - 1}
    except nx.NetworkXNoPath:
        return {"path": [], "edges": [], "length": -1}
```

#### 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `app/api/graph.py` | 확장 | stats/detailed, path, clusters |
| `app/services/clustering.py` | 신규 | Louvain 커뮤니티 감지 |
| `frontend/src/pages/DashboardPage.js` | 신규 | 통계 대시보드 |
| `frontend/src/components/ActivityHeatmap.js` | 신규 | GitHub 잔디 히트맵 |
| `frontend/src/components/ForceGraph.js` | 수정 | 클러스터 hull, 경로 |
| `requirements.txt` | 수정 | networkx 추가 |
| `frontend/package.json` | 수정 | recharts 추가 |

---

### Phase 5: 검색 & 필터 고급화

> **목표**: 데이터 활용도 극대화
> **복잡도**: 4점 (프론트 위주)
> **작업 방식**: 서브에이전트

#### 5.1 패싯 검색 패널

- 그래프 캔버스 좌측 또는 사이드바에 필터 패널
- 타입 + 소스 + 기간 + 태그 + 연결도 복합 필터
- 필터 변경 시 그래프 실시간 업데이트 (기존 enter/exit 애니메이션 활용)

#### 5.2 태그 클라우드

```python
# app/api/nodes.py 확장

@router.get("/tags")
async def list_tags():
    """전체 태그 + 사용 빈도"""
    with get_db() as db:
        rows = db.execute("""
            SELECT value as tag, COUNT(*) as count
            FROM nodes, json_each(nodes.tags)
            WHERE tags != '[]'
            GROUP BY value ORDER BY count DESC
        """).fetchall()
    return {"tags": [dict(r) for r in rows]}
```

- 프론트: 워드 클라우드 또는 빈도순 태그 리스트
- 태그 클릭 → 해당 태그 노드 필터

#### 5.3 검색 → 그래프 하이라이트

```javascript
// 검색 결과 노드 하이라이트
function applySearchHighlight(resultNodeIds) {
  highlightedNodesRef.current = new Set(resultNodeIds);
  // 렌더링에서: 하이라이트 노드에 글로우, 나머지 dim 30%
  // 카메라: 결과 노드 바운딩 박스로 fit
}
```

#### 5.4 뷰 저장

```javascript
// localStorage 기반 뷰 저장
const saveView = (name) => {
  const view = {
    name,
    filters: { nodeType, sourceType, days, tags },
    camera: { zoom: currentZoom, pan: currentPan },
    pinnedNodes: [...pinnedNodesRef.current],
    timestamp: Date.now(),
  };
  const views = JSON.parse(localStorage.getItem('nexus_views') || '[]');
  views.push(view);
  localStorage.setItem('nexus_views', JSON.stringify(views));
};
```

#### 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `app/api/nodes.py` | 확장 | tags 엔드포인트 |
| `app/api/search.py` | 확장 | 패싯 파라미터 |
| `frontend/src/components/FacetedFilter.js` | 신규 | 복합 필터 패널 |
| `frontend/src/components/TagCloud.js` | 신규 | 태그 시각화 |
| `frontend/src/pages/GraphExplorer.js` | 수정 | 뷰 저장/복원, 하이라이트 |
| `frontend/src/components/ForceGraph.js` | 수정 | 검색 글로우 효과 |

---

## 6. 기술 아키텍처 설계

### 6.1 Phase별 의존성 추가

| Phase | Python 패키지 | npm 패키지 |
|-------|--------------|-----------|
| 1 | — | — (기존 스택) |
| 2 | — | — (D3 기존) |
| 3 | — | react-markdown (채팅 답변 렌더링) |
| 4 | networkx | recharts |
| 5 | — | — |

> 최소 의존성 원칙 유지 — 새 라이브러리 최소화

### 6.2 AI 비용 분석 (모든 Phase $0)

| 기능 | 모델 | 호출 빈도 | 비용 |
|------|------|----------|------|
| 노드 추출 (기존) | gpt-4o-mini | 수집 시 | $0 |
| AI 요약 | gpt-4o-mini | 사용자 요청 시 (캐시) | $0 |
| 인과 분석 | gpt-4o-mini | 사용자 요청 시 (캐시) | $0 |
| GraphRAG 채팅 | gpt-4o-mini | 사용자 질문당 1회 | $0 |
| 자연어 쿼리 | gpt-4o-mini | 검색당 1회 | $0 |
| 임베딩 | 로컬 모델 | 노드 생성 시 | $0 |

> GitHub Models 무료 티어 내에서 모든 기능 운영 가능

### 6.3 데이터 흐름 (Phase 3 이후)

```
사용자 질문 ("반도체 관련 정책은?")
    │
    ▼
[자연어 쿼리 파싱] ─→ 필터 파라미터 생성
    │                    │
    │                    ▼
    │               [그래프 필터링] → 하이라이트
    │
    ▼
[GraphRAG]
    ├── FTS5 검색 → 관련 노드
    ├── 임베딩 유사도 → 보충 노드
    ├── 1-hop 확장 → 서브그래프
    └── AI 답변 생성 → 참조 노드 마킹
            │
            ▼
    [채팅 답변] → [[노드제목]] 클릭 → 그래프 하이라이트
```

---

## 7. 성능 & 확장성 로드맵

### 7.1 현재 → 단기

| 항목 | 현재 | 단기 개선 |
|------|------|----------|
| 렌더링 | D3 Canvas (2D) | Web Worker 레이아웃 분리 |
| 노드 로드 | limit 500 고정 | 뷰포트 기반 동적 로딩 |
| DB | SQLite 기본 | WAL 모드 활성화 |
| 검색 | FTS5 + 벡터 | 하이브리드 랭킹 (가중 합산) |

### 7.2 중장기 (10K+ 노드 시)

| 항목 | 개선안 |
|------|--------|
| 렌더링 | Sigma.js (WebGL) 전환 검토 |
| 레이아웃 | 서버사이드 사전 계산 + 캐시 |
| 클러스터 | LOD (Level of Detail) — 축소 시 클러스터를 단일 노드로 |
| DB | SQLite → PostgreSQL + pgvector 검토 (100K+ 시) |

### 7.3 확장 가능 아키텍처

```
현재 (Phase 1-5):
  React SPA → FastAPI → SQLite + FTS5 + Vec

미래 (100K+ 노드):
  React SPA → FastAPI → PostgreSQL + pgvector
      │                      │
      └── WebSocket ──────── Sigma.js (WebGL)
                             서버사이드 레이아웃 캐시
```

---

## 8. 참조 자료

### 참고 도구/서비스
| 도구 | 핵심 참고 포인트 |
|------|----------------|
| **Obsidian Graph View** | 로컬 그래프, N-hop 필터, 핀 고정 |
| **Neo4j Bloom** | 자연어 검색, 카테고리 필터, Expand/Collapse |
| **InfraNodus** | Louvain 클러스터링, 텍스트 네트워크, 갭 탐지 |
| **Microsoft GraphRAG** | 서브그래프 기반 RAG, 커뮤니티 요약 |
| **KronoGraph** | 타임라인 + 그래프 연동, 시간축 재생 |

### 기술 라이브러리
| 라이브러리 | 용도 | Phase |
|-----------|------|-------|
| **D3.js v7** | 현재 그래프 렌더링 (유지) | 전체 |
| **networkx** | Louvain 클러스터링, 경로 탐색 | 4 |
| **recharts** | React 차트 (대시보드) | 4 |
| **react-markdown** | 채팅 답변 렌더링 | 3 |
| **Sigma.js** | WebGL 대규모 그래프 (미래) | — |

### 연구 자료
| 출처 | 핵심 내용 |
|------|----------|
| Microsoft GraphRAG (2024) | 그래프 커뮤니티 기반 RAG > 순수 벡터 검색 |
| Nature: KG-RAG Model (2025) | Dual-channel 검색 (DPR + GNN) 정밀도 99% |
| InfraNodus Obsidian Plugin | 실시간 텍스트 → 그래프 변환, 갭 탐지 |
| Neo4j LLM KG Builder (2025) | LLM으로 비정형 텍스트에서 지식 그래프 자동 구축 |
