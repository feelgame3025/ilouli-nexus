# ilouli-nexus — 개발완료 문서

> 최종 업데이트: 2026-03-25
> 파일: `DEV_nexus-complete.md`
> 서비스 URL: https://nexus.ilouli.com

---

## 프로젝트 개요

뉴스/게시글/주식 데이터를 노드(Node)와 엣지(Edge)로 시각화하는 지식 그래프 플랫폼.
D3.js Canvas 기반 인터랙티브 그래프 탐색, FTS5 + 벡터 검색, AI 요약/인과 분석을 제공한다.

| 항목 | 값 |
|------|-----|
| 런타임 | Python 3.12 |
| 프레임워크 | FastAPI + Uvicorn (백엔드) / React + D3.js (프론트) |
| DB | SQLite + sqlite-vec (벡터 검색) + FTS5 |
| 포트 | 4010 |
| 역할 | 지식 그래프 시각화 + 의미 검색 |
| GitHub | https://github.com/feelgame3025/ilouli-nexus |

---

## 현재 아키텍처

```
Browser (nexus.ilouli.com)
    ↓ Nginx (정적: /var/www/ilouli/nexus)
React SPA (D3.js Canvas 그래프)
    ↓ API 호출
FastAPI Backend (:4010)
    ├── JWT 인증 (ilouli-auth, port 4001)
    ├── SQLite + sqlite-vec (벡터 임베딩)
    ├── FTS5 (전문 검색)
    ├── sentence-transformers (임베딩 생성)
    ├── GitHub Models (AI 요약/분석)
    ├── 스케줄러 (자동 수집)
    └── 연동
        ├── ilouli-news (:4008) — 뉴스 수집
        └── ilouli-community — 게시글 수집
```

---

## 소스 코드 구조

```
ilouli-nexus/
├── app/
│   ├── main.py                     # FastAPI 엔트리
│   ├── core/
│   │   ├── config.py               # 환경변수 설정
│   │   └── database.py             # SQLite 연결 + 스키마
│   ├── api/
│   │   ├── nodes.py                # 노드 CRUD
│   │   ├── edges.py                # 엣지 CRUD
│   │   ├── graph.py                # 그래프 데이터
│   │   ├── search.py               # FTS5 + 벡터 검색
│   │   ├── ingest.py               # 데이터 수집
│   │   ├── analysis.py             # AI 요약/분석
│   │   ├── automation.py           # 자동화 설정
│   │   └── batch.py                # 배치 작업
│   ├── models/
│   │   └── schemas.py              # Pydantic 스키마
│   └── services/
│       ├── embedder.py             # sentence-transformers 임베딩
│       ├── node_extractor.py       # AI 노드 자동 추출
│       ├── autolinker.py           # 고립 노드 자동 연결
│       ├── graph_linker.py         # 그래프 링커
│       └── scheduler.py            # 자동 수집 스케줄러
├── frontend/
│   └── src/
│       ├── App.js                  # 메인 앱
│       ├── index.js                # 엔트리
│       ├── i18n.js                 # 다국어
│       ├── components/
│       │   ├── ForceGraph.js       # D3.js Canvas 그래프
│       │   ├── NodeDetail.js       # 노드 상세
│       │   ├── Sidebar.js          # 사이드바
│       │   └── layout/
│       │       ├── NexusLayout.js  # 전체 레이아웃
│       │       └── Sidebar.js      # 네비게이션 사이드바
│       ├── pages/
│       │   ├── GraphExplorer.js    # 그래프 탐색
│       │   ├── NodeList.js         # 노드 목록
│       │   ├── SearchPage.js       # 검색 페이지
│       │   ├── IngestPage.js       # 데이터 수집
│       │   └── AutomationPage.js   # 자동화 설정
│       ├── contexts/
│       │   ├── AuthContext.js
│       │   └── NotificationContext.js
│       ├── services/
│       │   └── api.js              # API 클라이언트
│       ├── shared/                 # ilouli-main 동기화
│       │   └── NavigationBar/
│       └── config/
│           └── menuConfig.js
├── .data/
│   └── nexus.db                    # SQLite DB
├── scripts/
│   └── init_db.py                  # DB 초기화
├── requirements.txt
└── .env
```

---

## 핵심 파일

### 백엔드

| 파일 | 역할 |
|------|------|
| `app/main.py` | FastAPI 엔트리 + lifespan (스케줄러 시작) |
| `app/api/search.py` | FTS5 + sqlite-vec 벡터 검색 |
| `app/api/ingest.py` | 뉴스/게시글 데이터 수집 |
| `app/api/analysis.py` | AI 요약/인과 분석 |
| `app/services/embedder.py` | sentence-transformers 임베딩 생성 |
| `app/services/node_extractor.py` | AI 기반 노드 자동 추출 |
| `app/services/scheduler.py` | 3시간 주기 자동 수집 |
| `app/core/database.py` | SQLite + sqlite-vec + FTS5 스키마 |

### 프론트엔드

| 파일 | 역할 |
|------|------|
| `frontend/src/components/ForceGraph.js` | D3.js Force-directed Canvas 그래프 |
| `frontend/src/pages/GraphExplorer.js` | 그래프 탐색 메인 |
| `frontend/src/pages/SearchPage.js` | 검색 (FTS + 벡터) |

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 백엔드 | Python FastAPI + Uvicorn |
| 프론트엔드 | React (CRA + CRACO) + D3.js v7 Canvas |
| DB | SQLite + sqlite-vec (벡터) + FTS5 (전문검색) |
| 임베딩 | sentence-transformers `paraphrase-multilingual-MiniLM-L12-v2` |
| AI | GitHub Models (무료) |
| 인증 | JWT (ilouli-auth, port 4001) |
| HTTP | aiohttp (비동기 데이터 수집) |

---

## 런타임 데이터

| 항목 | 경로 |
|------|------|
| SQLite DB | `.data/nexus.db` |
| 정적 빌드 | `/var/www/ilouli/nexus/` (Nginx) |
| Python venv | `venv/` |

---

## 배포 정보

### 서비스

| 환경 | URL | 포트 |
|------|-----|:----:|
| 프론트엔드 | https://nexus.ilouli.com | Nginx 정적 |
| 백엔드 API | https://nexus.ilouli.com/api | 4010 |

### 운영 명령어

```bash
pm2 restart ilouli-nexus
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 4010
python scripts/init_db.py        # DB 초기화
cd frontend && npm run build     # 프론트 빌드
```

### PM2 설정

| 항목 | 값 |
|------|-----|
| PM2 이름 | ilouli-nexus |
| 포트 | 4010 |

---

## 환경변수

| 키 | 용도 |
|-----|------|
| PORT | 서버 포트 (4010) |
| DB_PATH | SQLite 경로 |
| JWT_SECRET | JWT 시크릿 |
| GITHUB_TOKEN | GitHub Models AI |
| NEWS_API_URL | ilouli-news 연동 |
| COMMUNITY_API_URL | ilouli-community 연동 |

---

## 참조 문서

| 문서 | 내용 |
|------|------|
| `docs/plan/` | Nexus 종합 개선 계획서 |

---

## 변경 이력

### 2026-03: 스케줄러 + 데이터 수집 강화
- **커밋**: `0b36054` fix: 스케줄러 ingest_all 사용 + 3시간 주기 + AI 추출 강화
- **커밋**: `916451e` feat: 데이터 수집 대폭 개선 + 검색/모바일/인증 수정
- **상태**: 완료

### 2026-02: 종합 개선 계획 수립
- **커밋**: `86660f3` docs: Nexus 종합 개선 계획 고도화 (5 Phase, 다크모드 제외)
- **커밋**: `17068eb` docs: Nexus 지식 그래프 종합 개선 계획서
- **상태**: 완료

### 2026-01: 프로젝트 초기화
- **커밋**: `b6cc647` feat: ilouli-nexus 프로젝트 초기화 (FastAPI + SQLite)
- **상태**: 완료
