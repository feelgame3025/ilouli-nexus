"""Ingest API: fetch data from other services and extract nodes."""
import json
import logging
import sqlite3
from datetime import datetime, timezone, timedelta

import aiohttp
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import NEWS_API_URL, COMMUNITY_API_URL, STOCK_API_URL
from app.core.database import get_db
from app.core.auth import require_tier
from app.services.article_processor import process_articles, process_manual_text

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))
NEWS_DB = "/home/feel3025/myproject/ilouli-news/.data/news.db"

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


class ManualIngestRequest(BaseModel):
    text: str
    source_label: str = "manual"


def _read_ext_db(path: str, query: str, params: list = None) -> list:
    """Read from an external SQLite DB safely."""
    try:
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params or []).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.warning("DB read failed (%s): %s", path, e)
        return []


async def _fetch_json(url: str, timeout: int = 15) -> dict | list | None:
    """Fetch JSON from a URL, return None on failure."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status == 200:
                    return await resp.json()
                logger.warning("Fetch %s returned %d", url, resp.status)
    except Exception as e:
        logger.warning("Fetch %s failed: %s", url, e)
    return None


# ─── News ────────────────────────────────────────────

@router.post("/articles", dependencies=[Depends(require_tier("family"))])
async def ingest_articles():
    """Read news data directly from news.db and extract nodes.

    Sources (priority order):
    1. news_theme_briefings — AI-generated theme summaries (highest value)
    2. news_category_summaries — per-category AI summaries
    3. news_articles — raw articles from RSS (largest volume)
    """
    articles = []

    # 1. Theme briefings (AI 요약 테마 — 고가치, ~10 themes per day)
    for row in _read_ext_db(NEWS_DB,
            "SELECT date, data FROM news_theme_briefings "
            "ORDER BY created_at DESC LIMIT 5"):
        try:
            data = json.loads(row.get("data", "{}")) if isinstance(row.get("data"), str) else row.get("data", {})
            themes = data.get("themes", []) if isinstance(data, dict) else []
            for theme in themes:
                keyword = theme.get("keyword", "")
                summary = theme.get("issueSummary") or theme.get("summary", "")
                if keyword and summary:
                    related = theme.get("relatedArticles", [])
                    url = related[0].get("link", "") if related else ""
                    articles.append({
                        "title": keyword,
                        "content": summary[:1200],
                        "url": url,
                        "category": theme.get("category", "news_theme"),
                    })
        except (json.JSONDecodeError, TypeError):
            continue

    # 2. Category summaries (카테고리별 AI 요약)
    for row in _read_ext_db(NEWS_DB,
            "SELECT category, date, data FROM news_category_summaries "
            "ORDER BY created_at DESC LIMIT 10"):
        try:
            data = json.loads(row.get("data", "{}")) if isinstance(row.get("data"), str) else row.get("data", {})
            cat_label = data.get("categoryLabel", row.get("category", ""))
            themes = data.get("themes", []) if isinstance(data, dict) else []
            for theme in themes[:3]:  # top 3 themes per category
                keyword = theme.get("keyword", "")
                summary = theme.get("summary", "")
                if keyword and summary and len(summary) > 20:
                    articles.append({
                        "title": f"{cat_label}: {keyword}",
                        "content": summary[:800],
                        "url": "",
                        "category": row.get("category", "news"),
                    })
        except (json.JSONDecodeError, TypeError):
            continue

    # 3. Raw news articles (최근 24시간, 카테고리별 분산 수집)
    categories = ["economy", "politics", "world", "technology", "society",
                   "industry", "business", "semiconductor", "entertainment", "sports"]
    for cat in categories:
        for row in _read_ext_db(NEWS_DB,
                "SELECT title, description, summary, keywords, link, source, category "
                "FROM news_articles WHERE category = ? "
                "ORDER BY created_at DESC LIMIT 5", [cat]):
            title = row.get("title", "")
            content = row.get("summary") or row.get("description", "")
            if title and content and len(content) > 30:
                kw = row.get("keywords", "")
                if kw:
                    content = f"{content}. 키워드: {kw}"
                articles.append({
                    "title": title,
                    "content": content[:800],
                    "url": row.get("link", ""),
                    "category": row.get("category", "news"),
                })

    if not articles:
        raise HTTPException(status_code=502, detail="Could not read news data from news.db")

    articles = articles[:80]
    result = await process_articles(articles)
    return {"status": "ok", "source": "news", "articles_fetched": len(articles), **result,
            "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")}


# ─── YouTube ─────────────────────────────────────────

@router.post("/youtube", dependencies=[Depends(require_tier("family"))])
async def ingest_youtube():
    """Read YouTube data directly from news.db and extract nodes.

    Sources:
    1. youtube_trending_videos — trending videos
    2. youtube_videos — keyword-tracked videos (large volume)
    3. youtube_reports — AI-generated YouTube analysis reports
    """
    articles = []

    # 1. Trending videos (인기 급상승)
    for row in _read_ext_db(NEWS_DB,
            "SELECT video_id, title, channel_name, description "
            "FROM youtube_trending_videos "
            "ORDER BY collected_at DESC LIMIT 30"):
        title = row.get("title", "")
        if title:
            channel = row.get("channel_name", "")
            desc = row.get("description", "") or ""
            content = f"채널: {channel}. {desc}" if channel else desc
            articles.append({
                "title": title,
                "content": content[:1000],
                "url": f"https://youtube.com/watch?v={row.get('video_id', '')}",
                "category": "youtube_trending",
            })

    # 2. Keyword-tracked videos (키워드 추적 영상)
    for row in _read_ext_db(NEWS_DB,
            "SELECT video_id, title, channel_name, description, tags, "
            "view_count, source_value "
            "FROM youtube_videos "
            "ORDER BY collected_at DESC LIMIT 30"):
        title = row.get("title", "")
        if title:
            channel = row.get("channel_name", "")
            tags = row.get("tags", "") or ""
            keyword = row.get("source_value", "")
            views = row.get("view_count", 0) or 0
            parts = []
            if channel:
                parts.append(f"채널: {channel}")
            if keyword:
                parts.append(f"검색키워드: {keyword}")
            if views > 10000:
                parts.append(f"조회수: {views:,}")
            if tags:
                parts.append(f"태그: {tags[:200]}")
            articles.append({
                "title": title,
                "content": ". ".join(parts)[:800],
                "url": f"https://youtube.com/watch?v={row.get('video_id', '')}",
                "category": "youtube",
            })

    # 3. YouTube reports (AI 분석 리포트)
    for row in _read_ext_db(NEWS_DB,
            "SELECT title, content, report_type FROM youtube_reports "
            "ORDER BY created_at DESC LIMIT 10"):
        title = row.get("title", "")
        content = row.get("content", "")
        if title and content and len(content) > 50:
            articles.append({
                "title": title,
                "content": content[:1200],
                "url": "",
                "category": "youtube_report",
            })

    if not articles:
        raise HTTPException(status_code=502, detail="Could not read YouTube data from news.db")

    articles = articles[:50]
    result = await process_articles(articles)
    return {"status": "ok", "source": "youtube", "videos_fetched": len(articles), **result,
            "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")}


# ─── Community ───────────────────────────────────────

@router.post("/community", dependencies=[Depends(require_tier("family"))])
async def ingest_community():
    """Fetch community posts and extract nodes."""
    articles = []

    # Response: {success, data: {posts: [...]}}
    data = await _fetch_json(f"{COMMUNITY_API_URL}/api/community/posts?limit=20&sort=recent")
    if data:
        inner = data.get("data", data) if isinstance(data, dict) else data
        posts = inner.get("posts", []) if isinstance(inner, dict) else inner
        for post in posts:
            title = post.get("title", "")
            content = post.get("content", "")
            if title and content and len(content) > 30:
                articles.append({
                    "title": title,
                    "content": content[:800],
                    "url": f"https://community.ilouli.com/post/{post.get('id', '')}",
                    "category": post.get("board") or post.get("category", "community"),
                })

    if not articles:
        raise HTTPException(status_code=502, detail="Could not fetch community posts")

    articles = articles[:20]
    result = await process_articles(articles)
    return {"status": "ok", "source": "community", "posts_fetched": len(articles), **result,
            "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")}


# ─── Stock ───────────────────────────────────────────

@router.post("/stock", dependencies=[Depends(require_tier("family"))])
async def ingest_stock():
    """Read stock data from news DB + stock DB and extract nodes."""
    articles = []
    stock_db = "/home/feel3025/myproject/ilouli-stock/backend/ilouli-stock.db"

    # 1. Stock features (시장 테마/이슈 — 고가치)
    for row in _read_ext_db(NEWS_DB,
            "SELECT topic, subtopics, conclusion, affected_stocks, affected_sectors "
            "FROM stock_features ORDER BY date DESC LIMIT 30"):
        topic = row.get("topic", "")
        if topic:
            content = f"{row.get('conclusion', '')} 관련종목: {row.get('affected_stocks', '')}. 관련섹터: {row.get('affected_sectors', '')}"
            articles.append({"title": topic, "content": content[:800], "url": "", "category": "stock_analysis"})

    # 2. Stock news raw (증시 뉴스)
    for row in _read_ext_db(NEWS_DB,
            "SELECT title, summary, keywords, related_stocks, related_sectors, sentiment, url, source "
            "FROM stock_news_raw ORDER BY created_at DESC LIMIT 30"):
        title = row.get("title", "")
        if title:
            parts = [row.get("summary", "")]
            if row.get("keywords"): parts.append(f"키워드: {row['keywords']}")
            if row.get("related_stocks"): parts.append(f"관련종목: {row['related_stocks']}")
            if row.get("related_sectors"): parts.append(f"섹터: {row['related_sectors']}")
            if row.get("sentiment"): parts.append(f"감성: {row['sentiment']}")
            articles.append({"title": title, "content": ". ".join(parts)[:800], "url": row.get("url", ""), "category": "stock_news"})

    # 3. Stock insight reports (일일 증시 브리핑)
    for row in _read_ext_db(NEWS_DB,
            "SELECT title, content, report_type FROM stock_insight_reports "
            "ORDER BY created_at DESC LIMIT 10"):
        title = row.get("title", "")
        content = row.get("content", "")
        if title and content:
            articles.append({"title": title, "content": content[:1200], "url": "", "category": "stock_briefing"})

    # 4. Stock profiles (종목 기본정보 — ilouli-stock DB)
    for row in _read_ext_db(stock_db,
            "SELECT stock_code, stock_name, industry, sector, business_summary "
            "FROM stock_profiles LIMIT 50"):
        name = row.get("stock_name", "")
        code = row.get("stock_code", "")
        if name:
            summary = row.get("business_summary", "") or ""
            industry = row.get("industry", "") or ""
            sector = row.get("sector", "") or ""
            content = f"{name}({code}). 업종: {industry}. 섹터: {sector}. {summary}"
            articles.append({"title": f"{name}({code})", "content": content[:800], "url": "", "category": "stock_profile"})

    # 5. Stock comprehensive reports (AI 종합 분석)
    for row in _read_ext_db(stock_db,
            "SELECT stock_name, stock_code, session_type, report_content "
            "FROM stock_comprehensive_reports ORDER BY created_at DESC LIMIT 20"):
        name = row.get("stock_name", "")
        if name and row.get("report_content"):
            session = row.get("session_type", "")
            content = row.get("report_content", "")[:1200]
            articles.append({"title": f"{name} {session} 분석", "content": content, "url": "", "category": "stock_report"})

    # 6. Stock evaluations (종목 평가)
    for row in _read_ext_db(stock_db,
            "SELECT stock_name, stock_code, grade, issue_score, technical_score, "
            "issue_summary, technical_summary "
            "FROM stock_evaluations ORDER BY created_at DESC LIMIT 20"):
        name = row.get("stock_name", "")
        if name:
            grade = row.get("grade", "")
            issue = row.get("issue_summary", "") or ""
            tech = row.get("technical_summary", "") or ""
            content = f"등급: {grade}. 이슈점수: {row.get('issue_score', '')}. 기술점수: {row.get('technical_score', '')}. {issue} {tech}"
            articles.append({"title": f"{name} 종목평가", "content": content[:800], "url": "", "category": "stock_evaluation"})

    if not articles:
        raise HTTPException(status_code=502, detail="Could not fetch stock data")

    articles = articles[:50]
    result = await process_articles(articles)
    return {"status": "ok", "source": "stock", "items_fetched": len(articles), **result,
            "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")}


# ─── All Sources ─────────────────────────────────────

@router.post("/all", dependencies=[Depends(require_tier("family"))])
async def ingest_all():
    """Run ingestion from all available sources."""
    results = {}

    for source, func in [("news", ingest_articles), ("youtube", ingest_youtube),
                          ("community", ingest_community), ("stock", ingest_stock)]:
        try:
            result = await func()
            results[source] = {"status": "ok", "nodes_created": result.get("nodes_created", 0),
                               "edges_created": result.get("edges_created", 0)}
        except HTTPException as e:
            results[source] = {"status": "error", "detail": e.detail}
        except Exception as e:
            results[source] = {"status": "error", "detail": str(e)}

    total_nodes = sum(r.get("nodes_created", 0) for r in results.values() if r.get("status") == "ok")
    total_edges = sum(r.get("edges_created", 0) for r in results.values() if r.get("status") == "ok")

    return {
        "status": "ok",
        "sources": results,
        "total_nodes_created": total_nodes,
        "total_edges_created": total_edges,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


# ─── Status & Manual ─────────────────────────────────

@router.get("/status")
def ingest_status(limit: int = 20):
    """Show recent ingest log history (public)."""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM ingest_log ORDER BY ingested_at DESC LIMIT ?", [limit]
        ).fetchall()

        total = db.execute("SELECT COUNT(*) FROM ingest_log").fetchone()[0]

        stats = db.execute(
            """SELECT COUNT(*) as total_ingests,
                      SUM(nodes_created) as total_nodes_created,
                      SUM(edges_created) as total_edges_created,
                      SUM(source_count) as total_sources_processed
               FROM ingest_log"""
        ).fetchone()

    return {
        "logs": [dict(r) for r in rows],
        "total": total,
        "summary": dict(stats) if stats else {},
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


@router.post("/embed", dependencies=[Depends(require_tier("family"))])
async def ingest_embed(limit: int = 100):
    """Generate embeddings for nodes without them."""
    try:
        from app.services.embedder import get_embedding, embedding_to_blob
    except ImportError:
        raise HTTPException(status_code=503, detail="sentence-transformers not installed")

    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS node_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id INTEGER UNIQUE NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
                embedding BLOB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        nodes_without = db.execute(
            """SELECT n.id, n.title, n.content FROM nodes n
               WHERE n.id NOT IN (SELECT node_id FROM node_embeddings) LIMIT ?""",
            [limit],
        ).fetchall()

        if not nodes_without:
            return {"status": "ok", "message": "All nodes already have embeddings", "embedded": 0}

        embedded = 0
        errors = []
        for node in nodes_without:
            text = f"{node['title']}. {node['content'] or ''}"
            try:
                emb = get_embedding(text)
                blob = embedding_to_blob(emb)
                db.execute("INSERT OR IGNORE INTO node_embeddings (node_id, embedding) VALUES (?, ?)",
                           [node["id"], blob])
                embedded += 1
            except Exception as e:
                errors.append(f"Node {node['id']}: {e}")

    return {"status": "ok", "embedded": embedded, "errors": errors[:10]}


@router.post("/manual", dependencies=[Depends(require_tier("family"))])
async def ingest_manual(req: ManualIngestRequest):
    """Accept raw text and extract nodes."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(req.text) > 10000:
        raise HTTPException(status_code=400, detail="Text too long (max 10000 chars).")

    result = await process_manual_text(req.text)
    return {"status": "ok", "source_label": req.source_label, **result,
            "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")}
