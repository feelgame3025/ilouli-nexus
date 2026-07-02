# ilouli-nexus 전방위 프로젝트 감사 (2026-07)

> **점검일**: 2026-07-02 | 읽기 전용 감사 (수정 없음)
> **시리즈**: 워크스페이스 전 프로젝트 일제 감사의 일부
> **정체**: 지식 그래프 플랫폼 (FastAPI + React/D3) — 뉴스/게시글/주식을 노드/엣지로 시각화. 포트 4010

---

## 프로젝트 개요 (성격 · 역할 · 핵심 임무)

| 항목 | 내용 |
|------|------|
| **성격** | 지식 인프라 — 플랫폼 곳곳의 데이터(뉴스/게시글/주식)를 **하나의 지식 그래프로 엮는** 메타 서비스. 유일한 Python/FastAPI 백엔드 |
| **역할** | nexus.ilouli.com (포트 4010, FastAPI+React/D3). 노드/엣지 그래프 탐색·검색 |
| **핵심 임무** | ① 멀티소스 수집: community 게시글 + news 기사 + stock 데이터를 3시간마다 노드/엣지로 변환 ② 자동 연결: autolinker/graphlinker로 개체 간 관계 생성 ③ 임베딩 검색: sqlite-vec 벡터 + FTS5 하이브리드 ④ D3 그래프 시각화 (admin은 수집/자동화 관리) |

---

## 0. 총평 — 판정: 살아있으나 부분 마비

스케줄러는 오늘도 정상 실행 중(nodes/edges 최신 7/2 15:01)이지만, **뉴스·주식 수집이 스키마 드리프트로 3개월째 조용히 실패** 중이에요. 커뮤니티 수집(HTTP)만 정상 — 의도한 멀티소스 그래프의 절반이 유실되고 있어요.

| 영역 | 상태 | 핵심 |
|------|:---:|------|
| 수집 파이프라인 | 🔴 | 뉴스/주식 수집 상시 실패 (PM2 로그: `no such column: title`, `no such table: stock_profiles`) — 예외를 `return []`로 삼켜 무감지 |
| 아키텍처 | 🔴 | **타 서비스 SQLite 파일 직접 접근** (news.db, ilouli-stock.db 하드코딩 경로) — CLAUDE.md "HTTP만 사용" 원칙 위반. HTTP용 상수는 import만 되고 미사용 |
| 디스크 | 🟠 | 7.4GB 중 **6.7GB가 CUDA torch** (venv) — 프로세스 메모리 10MB로 실제 로드된 적 없음 추정 |
| 보안 | 🟢/🟠 | 무인증 쓰기 없음(전부 require_tier) ✅, 코드 하드코딩 없음 ✅. 단 .env의 GitHub 토큰이 감사 과정에 노출 → 로테이션 권장 |
| 알림 | 🟠 | 스케줄러 실패가 logger.warning에만 — 3개월 무감지의 원인 |

---

## 1. 🔴 수집 실패 (런타임 증거)

```
2026-07-02 15:01 DB read failed (ilouli-news/.data/news.db): no such column: title
2026-07-02 09:01 DB read failed (ilouli-stock/backend/ilouli-stock.db): no such table: stock_profiles
```

- `app/api/ingest.py:19,260` + `app/api/batch.py:34` — 타 서비스 DB를 옛 스키마로 직접 쿼리
- 대상 서비스들이 스키마를 바꿨는데 nexus는 모름 (직접 파일 접근의 필연적 취약점)
- `config.py:13-15`의 `NEWS_API_URL`/`STOCK_API_URL`은 import만 되고 **HTTP 호출에 안 쓰임** — 전환하다 만 흔적
- 참고: `stock_profiles`는 애초에 ilouli-stock이 아니라 **ilouli-StockAnalysis DB의 테이블** — 대상 DB 자체를 잘못 가리켰을 가능성

## 2. 🟠 7.4GB의 정체

| 항목 | 크기 |
|------|-----:|
| venv (nvidia CUDA 4.3G + torch 1.8G + triton 641M 등) | **7.4G** |
| frontend/node_modules | 311M |
| 실제 서비스 데이터 (.data/nexus.db) | **69M** |

sentence-transformers가 CUDA torch full을 끌어옴 — CPU 전용 torch로 교체 시 **~6.7GB 회수 가능**.

## 3. 스케줄러/DB

- 단일 asyncio 루프, 3시간 주기(KST 명시 ✅), 4단계 파이프라인 단계별 예외 격리 ✅ — **에러 외부 알림 없음** 🟠
- DB: edges 80,825 / nodes 27,005 / embeddings 정합 ✅. 보존 정책 없음(무한 축적 설계 — 현재 69MB로 여유)

## 4. 프론트/문서

- 페이지 4개 전부 연결, admin 가드 정상, 로그인 중앙화 ✅
- 죽은 코드: 구버전 `components/Sidebar.js`(고아)
- CLAUDE.md 충실 — 단 "HTTP만 사용" 서술이 실코드와 모순 (§1)

---

## 우선순위 TOP 5

1. 🔴 뉴스/주식 수집 복구 — 직접 DB 쿼리를 HTTP API로 전환 (상수 이미 존재) 또는 스키마/경로 갱신
2. 🔴 타 서비스 DB 직접 접근 제거 (아키텍처 원칙 복원)
3. 🟠 스케줄러 실패 알림 연결 (텔레그램 등)
4. 🟠 .env GitHub 토큰 로테이션
5. 🟡 venv 다이어트 (CPU torch, ~6.7GB 회수) + 고아 Sidebar 삭제

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-02 | 초판 — 전방위 감사 |
