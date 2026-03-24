# ilouli Nexus — 개발완료 문서

> 최종 업데이트: 2026-03-25
> 파일: `DEV_nexus-complete.md`
> 서비스 URL: https://nexus.ilouli.com

---

## 프로젝트 개요

지식 그래프 기반 데이터 연결 플랫폼. FastAPI + SQLite, 노드/엣지/검색/분석/자동화/배치 API, 3시간 주기 데이터 수집.

| 항목 | 값 |
|------|-----|
| 런타임 | Python (FastAPI) |
| 프레임워크 | FastAPI + SQLite |
| 포트 | 4010 |
| 역할 | 지식 그래프 — 데이터 수집, 노드/엣지 관리, AI 분석 |

---

## 현재 아키텍처

```
프론트엔드 (React) → FastAPI (:4010) → SQLite
                                      → 스케줄러 (ingest_all, 3시간 주기)
                                      → AI 추출 (분석/자동화)
```

## 핵심 파일

| 파일 | 역할 |
|------|------|
| `app/main.py` | FastAPI 엔트리 |
| `app/core/config.py` | 설정 (포트, CORS) |
| `app/core/database.py` | DB 초기화 |
| `app/api/nodes.py` | 노드 API |
| `app/api/edges.py` | 엣지 API |
| `app/api/search.py` | 검색 API |
| `app/api/ingest.py` | 데이터 수집 API |
| `app/api/analysis.py` | 분석 API |
| `app/api/batch.py` | 배치 처리 API |
| `frontend/` | React 프론트엔드 |

## 배포 정보

| 항목 | 값 |
|------|-----|
| URL | https://nexus.ilouli.com |
| PM2 | 미확인 |
| Nginx | dev 서버 리버스 프록시 |

---

## 변경 이력

### 2026-03: 데이터 수집 개선
- **커밋**: `0b36054` fix: 스케줄러 ingest_all 사용 + 3시간 주기 + AI 추출 강화
- **커밋**: `916451e` feat: 데이터 수집 대폭 개선 + 검색/모바일/인증 수정
- **커밋**: `b6cc647` feat: ilouli-nexus 프로젝트 초기화 (FastAPI + SQLite)
- **상태**: 완료
