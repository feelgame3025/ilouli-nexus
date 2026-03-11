# CLAUDE.md - ilouli-nexus (nexus.ilouli.com)

> 지식 그래프 플랫폼 — 뉴스/게시글/주식 데이터를 노드/엣지로 시각화

---

## 형제들 (The Brothers)

> 이 프로젝트는 **둘째(dev 홈서버)**에서 관리된다.

| 순서 | 기기 | 역할 |
|:----:|------|------|
| 👑 형 | 💻 MacBook | 메인 개발 + 총괄 |
| 🥈 둘째 | 🏠 dev (홈서버) | 프로덕션 서버 |
| 🥉 막내 | 🤖 미니 (Mac mini) | AI 비서 |

## 규칙 계층

```
myproject/CLAUDE.md (최상위)
    └── ilouli-nexus/CLAUDE.md (현재)
```

**상위 규칙 상속**: 이 파일에 명시되지 않은 모든 규칙은 `../CLAUDE.md`를 따릅니다.

---

## 기본 정보

| 항목 | 값 |
|------|-----|
| **URL** | https://nexus.ilouli.com |
| **포트** | 4010 |
| **기술 스택** | Python 3.12 / FastAPI / Uvicorn |
| **프론트엔드** | React + D3.js v7 Canvas |
| **DB** | SQLite + sqlite-vec (벡터 검색) + FTS5 |
| **임베딩** | sentence-transformers `paraphrase-multilingual-MiniLM-L12-v2` |
| **AI 모델** | GitHub Models 무료 모델 |
| **인증** | JWT (ilouli-auth 공유, port 4001) |
| **PM2 이름** | ilouli-nexus |
| **디자인 채용** | Full (ilouli-main NavigationBar 동기화) |
| **정적 파일** | /var/www/ilouli/nexus |

---

## 프로젝트 구조

```
ilouli-nexus/
├── CLAUDE.md
├── requirements.txt
├── app/
│   ├── main.py                 — FastAPI 엔트리포인트
│   ├── core/
│   │   ├── config.py           — 설정 (환경변수)
│   │   └── database.py         — SQLite 연결 + 스키마
│   ├── api/
│   │   ├── nodes.py            — 노드 CRUD API
│   │   ├── edges.py            — 엣지 CRUD API
│   │   ├── graph.py            — 그래프 데이터 API
│   │   ├── search.py           — FTS5 + 벡터 검색
│   │   ├── ingest.py           — 데이터 수집 API
│   │   └── ai.py               — AI 요약/인과 분석
│   ├── models/
│   │   └── schemas.py          — Pydantic 스키마
│   └── services/
│       ├── embedder.py         — sentence-transformers
│       ├── node_extractor.py   — AI 노드 추출
│       ├── autolinker.py       — 고립 노드 연결
│       └── graph_linker.py     — 그래프 링커
├── frontend/                   — React + D3.js
├── .data/
│   └── nexus.db                — SQLite DB
├── scripts/
│   └── init_db.py              — DB 초기화
├── docs/plan/
├── .github/workflows/
│   └── deploy.yml
└── .env
```

---

## 개발

```bash
# 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --host 0.0.0.0 --port 4010 --reload

# DB 초기화
python scripts/init_db.py
```

## 배포

```bash
git push  # → GitHub Actions 자동 배포
```

---

## 날짜/시간 규칙 (KST 통일)

> **상위 규칙 상속**: `../CLAUDE.md`의 "시간대 규칙 (KST 통일)" 섹션 참조

```python
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))

def get_korean_date(days_offset: int = 0) -> str:
    now = datetime.now(KST) + timedelta(days=days_offset)
    return now.strftime('%Y-%m-%d')

def get_korean_datetime() -> str:
    return datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')
```

---

## 데이터 소스 (서비스 간 통신)

| 소스 | 서비스 | 엔드포인트 |
|------|--------|-----------|
| 뉴스 기사 | news :4008 | `/api/...` |
| 커뮤니티 게시글 | community :4002 | `/api/community/posts` |
| YouTube 트렌드 | news :4008 | `/api/...` |
| 주식 종목 | stock :4003 | `/api/...` |

> 서비스 간 통신: localhost HTTP API (Tailscale 내부망 신뢰)

---

## 주의사항

- **독립 서비스**: 자체 백엔드 + DB (다른 서비스 DB 직접 접근 금지)
- **비용 $0 원칙**: GitHub Models 무료 모델만 사용
- **KST 통일**: 모든 날짜/시간은 KST 기준
- **DB 보호**: 데이터 삭제 절대 금지 (제2원칙)
- **서비스 간 통신**: localhost HTTP API만 사용
