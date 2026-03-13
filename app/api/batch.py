"""Batch ingest API: historical data ingestion with date range and daily drip."""
import asyncio
import logging
import sqlite3
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import NEWS_API_URL, COMMUNITY_API_URL
from app.core.database import get_db
from app.core.auth import require_tier
from app.services.article_processor import process_articles

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))

NEWS_DB_PATH = "/home/feel3025/myproject/ilouli-news/.data/news.db"
COMMUNITY_DB_PATH = "/home/feel3025/myproject/ilouli-community/backend/community.db"

router = APIRouter(prefix="/api/batch", tags=["batch"])

# Background drip state
_drip_task = None
_drip_status = {
    "running": False,
    "current_source": None,
    "progress": {},
    "last_run": None,
    "config": None,
}


def _read_news_db(query: str, params: list) -> list[dict]:
    """Read from news DB (read-only)."""
    try:
        conn = sqlite3.connect(NEWS_DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result
    except Exception as e:
        logger.warning("News DB read failed: %s", e)
        return []


def _read_community_db(query: str, params: list) -> list[dict]:
    """Read from community DB (read-only)."""
    try:
        conn = sqlite3.connect(COMMUNITY_DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result
    except Exception as e:
        logger.warning("Community DB read failed: %s", e)
        return []


def _get_already_ingested_titles() -> set[str]:
    """Get set of already ingested node titles (lowercase) to skip duplicates."""
    with get_db() as db:
        rows = db.execute("SELECT LOWER(title) as t FROM nodes").fetchall()
        return {r["t"] for r in rows}


# ─── Batch Endpoints ─────────────────────────────────

@router.post("/news", dependencies=[Depends(require_tier("family"))])
async def batch_news(
    days: int = Query(7, ge=1, le=365, description="최근 N일간 데이터"),
    batch_size: int = Query(20, ge=5, le=50, description="한 번에 처리할 기사 수"),
    offset: int = Query(0, ge=0, description="건너뛸 기사 수"),
):
    """뉴스 기사 배치 수집 (기간 선택 가능)."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    rows = _read_news_db(
        """SELECT id, title, COALESCE(summary, description, '') as content,
                  link as url, category, created_at
           FROM news_articles
           WHERE created_at >= ? AND title IS NOT NULL AND title != ''
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?""",
        [cutoff, batch_size, offset],
    )

    if not rows:
        return {"status": "ok", "message": "해당 기간에 수집할 뉴스 기사가 없습니다.", "processed": 0}

    total_available = _read_news_db(
        "SELECT COUNT(*) as cnt FROM news_articles WHERE created_at >= ? AND title IS NOT NULL AND title != ''",
        [cutoff],
    )
    total = total_available[0]["cnt"] if total_available else 0

    existing = _get_already_ingested_titles()
    articles = []
    for row in rows:
        if row["title"].lower() in existing:
            continue
        articles.append({
            "title": row["title"],
            "content": (row["content"] or "")[:800],
            "url": row.get("url", ""),
            "category": row.get("category", "news"),
        })

    if not articles:
        return {
            "status": "ok", "message": "모두 이미 수집된 기사입니다.",
            "processed": 0, "skipped": len(rows), "total_available": total,
        }

    result = await process_articles(articles)
    return {
        "status": "ok", "source": "news_batch",
        "processed": len(articles), "skipped": len(rows) - len(articles),
        "total_available": total, "next_offset": offset + batch_size,
        **result,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


@router.post("/youtube", dependencies=[Depends(require_tier("family"))])
async def batch_youtube(
    days: int = Query(7, ge=1, le=365, description="최근 N일간 데이터"),
    batch_size: int = Query(20, ge=5, le=50, description="한 번에 처리할 영상 수"),
    offset: int = Query(0, ge=0, description="건너뛸 영상 수"),
):
    """YouTube 트렌딩 영상 배치 수집."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    rows = _read_news_db(
        """SELECT video_id, title, channel_name, extracted_keywords, collected_at
           FROM youtube_trending_videos
           WHERE collected_at >= ? AND title IS NOT NULL AND title != ''
           ORDER BY collected_at DESC
           LIMIT ? OFFSET ?""",
        [cutoff, batch_size, offset],
    )

    if not rows:
        return {"status": "ok", "message": "해당 기간에 수집할 YouTube 영상이 없습니다.", "processed": 0}

    total_available = _read_news_db(
        "SELECT COUNT(*) as cnt FROM youtube_trending_videos WHERE collected_at >= ? AND title IS NOT NULL AND title != ''",
        [cutoff],
    )
    total = total_available[0]["cnt"] if total_available else 0

    existing = _get_already_ingested_titles()
    articles = []
    for row in rows:
        title = row["title"]
        if title.lower() in existing:
            continue
        kw = row.get("extracted_keywords", "")
        channel = row.get("channel_name", "")
        content = f"채널: {channel}. 키워드: {kw}" if channel else (kw or "")
        articles.append({
            "title": title,
            "content": content[:800],
            "url": f"https://youtube.com/watch?v={row.get('video_id', '')}",
            "category": "youtube",
        })

    if not articles:
        return {
            "status": "ok", "message": "모두 이미 수집된 영상입니다.",
            "processed": 0, "skipped": len(rows), "total_available": total,
        }

    result = await process_articles(articles)
    return {
        "status": "ok", "source": "youtube_batch",
        "processed": len(articles), "skipped": len(rows) - len(articles),
        "total_available": total, "next_offset": offset + batch_size,
        **result,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


@router.post("/stock", dependencies=[Depends(require_tier("family"))])
async def batch_stock(
    days: int = Query(7, ge=1, le=365, description="최근 N일간 데이터"),
    batch_size: int = Query(20, ge=5, le=50, description="한 번에 처리할 항목 수"),
    offset: int = Query(0, ge=0, description="건너뛸 항목 수"),
    source: str = Query("all", description="features, news, 또는 all"),
):
    """주식 데이터 배치 수집 (특성 분석 + 뉴스 기사)."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d")
    cutoff_dt = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    existing = _get_already_ingested_titles()
    articles = []

    half = max(5, batch_size // 2)

    # stock_features (토픽/결론 — 구조화된 분석)
    if source in ("all", "features"):
        feat_limit = half if source == "all" else batch_size
        feat_rows = _read_news_db(
            """SELECT topic, conclusion, affected_stocks, affected_sectors
               FROM stock_features
               WHERE date >= ? AND topic IS NOT NULL AND topic != ''
               ORDER BY date DESC LIMIT ? OFFSET ?""",
            [cutoff, feat_limit, offset],
        )
        for row in feat_rows:
            topic = row["topic"]
            if topic.lower() in existing:
                continue
            conclusion = row.get("conclusion", "")
            stocks = row.get("affected_stocks", "")
            sectors = row.get("affected_sectors", "")
            content = f"{conclusion} 관련종목: {stocks}. 관련섹터: {sectors}"
            articles.append({
                "title": topic,
                "content": content[:800],
                "url": "",
                "category": "stock_analysis",
            })

    # stock_news_raw (실제 뉴스 기사)
    if source in ("all", "news"):
        news_limit = half if source == "all" else batch_size
        news_rows = _read_news_db(
            """SELECT title, summary, keywords, related_stocks, related_sectors,
                      sentiment, url, source as news_source
               FROM stock_news_raw
               WHERE created_at >= ? AND title IS NOT NULL AND title != ''
               ORDER BY created_at DESC LIMIT ? OFFSET ?""",
            [cutoff_dt, news_limit, offset],
        )
        for row in news_rows:
            title = row["title"]
            if title.lower() in existing:
                continue
            summary = row.get("summary", "") or ""
            keywords = row.get("keywords", "") or ""
            stocks = row.get("related_stocks", "") or ""
            sectors = row.get("related_sectors", "") or ""
            sentiment = row.get("sentiment", "")
            news_src = row.get("news_source", "")
            content = f"{summary} 키워드: {keywords}. 관련종목: {stocks}. 섹터: {sectors}. 감성: {sentiment}. 출처: {news_src}"
            articles.append({
                "title": title,
                "content": content[:800],
                "url": row.get("url", ""),
                "category": "stock_news",
            })

    # Count totals
    total_feat = _read_news_db(
        "SELECT COUNT(*) as cnt FROM stock_features WHERE date >= ? AND topic IS NOT NULL AND topic != ''",
        [cutoff],
    )
    total_news = _read_news_db(
        "SELECT COUNT(*) as cnt FROM stock_news_raw WHERE created_at >= ? AND title IS NOT NULL AND title != ''",
        [cutoff_dt],
    )
    total = (total_feat[0]["cnt"] if total_feat else 0) + (total_news[0]["cnt"] if total_news else 0)

    if not articles:
        return {
            "status": "ok", "message": "해당 기간에 수집할 주식 데이터가 없습니다.",
            "processed": 0, "total_available": total,
        }

    result = await process_articles(articles)
    return {
        "status": "ok", "source": "stock_batch",
        "processed": len(articles), "total_available": total,
        "next_offset": offset + batch_size,
        **result,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


@router.post("/community", dependencies=[Depends(require_tier("family"))])
async def batch_community(
    days: int = Query(7, ge=1, le=365, description="최근 N일간 데이터"),
    batch_size: int = Query(20, ge=5, le=50, description="한 번에 처리할 게시글 수"),
    offset: int = Query(0, ge=0, description="건너뛸 게시글 수"),
):
    """커뮤니티 게시글 배치 수집."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    rows = _read_community_db(
        """SELECT id, title, content, board, created_at
           FROM community_posts
           WHERE created_at >= ? AND title IS NOT NULL AND title != ''
             AND content IS NOT NULL AND LENGTH(content) > 30
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?""",
        [cutoff, batch_size, offset],
    )

    if not rows:
        return {"status": "ok", "message": "해당 기간에 수집할 게시글이 없습니다.", "processed": 0}

    total_available = _read_community_db(
        """SELECT COUNT(*) as cnt FROM community_posts
           WHERE created_at >= ? AND title IS NOT NULL AND title != ''
             AND content IS NOT NULL AND LENGTH(content) > 30""",
        [cutoff],
    )
    total = total_available[0]["cnt"] if total_available else 0

    existing = _get_already_ingested_titles()
    articles = []
    for row in rows:
        title = row["title"]
        if title.lower() in existing:
            continue
        articles.append({
            "title": title,
            "content": (row["content"] or "")[:800],
            "url": f"https://community.ilouli.com/post/{row.get('id', '')}",
            "category": row.get("board") or "community",
        })

    if not articles:
        return {
            "status": "ok", "message": "모두 이미 수집된 게시글입니다.",
            "processed": 0, "skipped": len(rows), "total_available": total,
        }

    result = await process_articles(articles)
    return {
        "status": "ok", "source": "community_batch",
        "processed": len(articles), "skipped": len(rows) - len(articles),
        "total_available": total, "next_offset": offset + batch_size,
        **result,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


# ─── Counts (available data for each source) ─────────

@router.get("/counts")
def batch_counts(days: int = Query(7, ge=1, le=365)):
    """각 소스별 해당 기간의 수집 가능한 데이터 수를 반환."""
    cutoff_dt = datetime.now(KST) - timedelta(days=days)
    cutoff = cutoff_dt.strftime("%Y-%m-%d %H:%M:%S")
    cutoff_date = cutoff_dt.strftime("%Y-%m-%d")

    # Already ingested count
    with get_db() as db:
        nexus_nodes = db.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        nexus_edges = db.execute("SELECT COUNT(*) FROM edges").fetchone()[0]

    news = _read_news_db(
        "SELECT COUNT(*) as cnt FROM news_articles WHERE created_at >= ? AND title IS NOT NULL AND title != ''",
        [cutoff],
    )
    youtube = _read_news_db(
        "SELECT COUNT(*) as cnt FROM youtube_trending_videos WHERE collected_at >= ? AND title IS NOT NULL AND title != ''",
        [cutoff],
    )
    stock_feat = _read_news_db(
        "SELECT COUNT(*) as cnt FROM stock_features WHERE date >= ? AND topic IS NOT NULL AND topic != ''",
        [cutoff_date],
    )
    stock_news = _read_news_db(
        "SELECT COUNT(*) as cnt FROM stock_news_raw WHERE created_at >= ? AND title IS NOT NULL AND title != ''",
        [cutoff],
    )
    community = _read_community_db(
        """SELECT COUNT(*) as cnt FROM community_posts
           WHERE created_at >= ? AND title IS NOT NULL AND title != ''
             AND content IS NOT NULL AND LENGTH(content) > 30""",
        [cutoff],
    )

    return {
        "days": days,
        "period": f"{cutoff_date} ~ {datetime.now(KST).strftime('%Y-%m-%d')}",
        "sources": {
            "news": {"available": news[0]["cnt"] if news else 0},
            "youtube": {"available": youtube[0]["cnt"] if youtube else 0},
            "stock": {
                "available": (stock_feat[0]["cnt"] if stock_feat else 0) + (stock_news[0]["cnt"] if stock_news else 0),
                "features": stock_feat[0]["cnt"] if stock_feat else 0,
                "news": stock_news[0]["cnt"] if stock_news else 0,
            },
            "community": {"available": community[0]["cnt"] if community else 0},
        },
        "nexus": {"nodes": nexus_nodes, "edges": nexus_edges},
    }


# ─── Daily Drip Scheduler ─────────────────────────────

@router.post("/drip/start", dependencies=[Depends(require_tier("family"))])
async def start_drip(
    days: int = Query(30, ge=1, le=365, description="수집 대상 기간 (일)"),
    daily_per_source: int = Query(30, ge=5, le=100, description="소스당 하루 처리량"),
):
    """일일 점진적 수집(drip) 시작. 매일 자정(KST)에 각 소스에서 N건씩 처리."""
    global _drip_task, _drip_status

    if _drip_status["running"]:
        return {"status": "already_running", "config": _drip_status["config"]}

    _drip_status["config"] = {
        "days": days,
        "daily_per_source": daily_per_source,
        "started_at": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }
    _drip_status["progress"] = {
        "news": {"offset": 0, "total_processed": 0},
        "youtube": {"offset": 0, "total_processed": 0},
        "stock": {"offset": 0, "total_processed": 0},
        "community": {"offset": 0, "total_processed": 0},
    }

    loop = asyncio.get_event_loop()
    _drip_task = loop.create_task(_drip_loop(days, daily_per_source))
    _drip_status["running"] = True

    return {
        "status": "started",
        "config": _drip_status["config"],
        "message": f"매일 소스당 {daily_per_source}건씩 최근 {days}일 데이터를 처리합니다.",
    }


@router.post("/drip/stop", dependencies=[Depends(require_tier("family"))])
async def stop_drip():
    """점진적 수집 중지."""
    global _drip_task, _drip_status

    if _drip_task and not _drip_task.done():
        _drip_task.cancel()
    _drip_status["running"] = False
    _drip_task = None

    return {"status": "stopped", "progress": _drip_status["progress"]}


@router.get("/drip/status")
def drip_status():
    """점진적 수집 현재 상태."""
    return {
        "running": _drip_status["running"],
        "current_source": _drip_status["current_source"],
        "progress": _drip_status["progress"],
        "last_run": _drip_status["last_run"],
        "config": _drip_status["config"],
    }


async def _drip_loop(days: int, daily_per_source: int):
    """Background loop: runs batch for each source once per day at 01:00 KST."""
    global _drip_status

    logger.info("[Drip] Started: days=%d, daily=%d per source", days, daily_per_source)

    # Run first batch immediately
    await _run_drip_batch(days, daily_per_source)

    while True:
        # Wait until next 01:00 KST
        now = datetime.now(KST)
        tomorrow_1am = (now + timedelta(days=1)).replace(hour=1, minute=0, second=0, microsecond=0)
        wait_seconds = (tomorrow_1am - now).total_seconds()
        logger.info("[Drip] Next batch at %s (%.0f seconds)", tomorrow_1am.strftime("%Y-%m-%d %H:%M KST"), wait_seconds)

        await asyncio.sleep(wait_seconds)
        await _run_drip_batch(days, daily_per_source)


async def _run_drip_batch(days: int, daily_per_source: int):
    """Run one drip batch for all sources."""
    global _drip_status

    sources = [
        ("news", _drip_batch_news),
        ("youtube", _drip_batch_youtube),
        ("stock", _drip_batch_stock),
        ("community", _drip_batch_community),
    ]

    for source_name, batch_func in sources:
        _drip_status["current_source"] = source_name
        try:
            offset = _drip_status["progress"][source_name]["offset"]
            result = await batch_func(days, daily_per_source, offset)
            processed = result.get("processed", 0)
            _drip_status["progress"][source_name]["offset"] = offset + daily_per_source
            _drip_status["progress"][source_name]["total_processed"] += processed
            logger.info("[Drip] %s: processed=%d, nodes=%d", source_name, processed, result.get("nodes_created", 0))

            # Small delay between sources to avoid AI API rate limits
            await asyncio.sleep(5)
        except Exception as e:
            logger.warning("[Drip] %s failed: %s", source_name, e)

    _drip_status["current_source"] = None
    _drip_status["last_run"] = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")
    logger.info("[Drip] Batch complete. Progress: %s", _drip_status["progress"])


async def _drip_batch_news(days: int, batch_size: int, offset: int) -> dict:
    """Drip batch for news."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    rows = _read_news_db(
        """SELECT title, COALESCE(summary, description, '') as content, link as url, category
           FROM news_articles
           WHERE created_at >= ? AND title IS NOT NULL AND title != ''
           ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        [cutoff, batch_size, offset],
    )
    return await _process_batch_rows(rows, "news")


async def _drip_batch_youtube(days: int, batch_size: int, offset: int) -> dict:
    """Drip batch for YouTube."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    rows = _read_news_db(
        """SELECT title, channel_name, extracted_keywords, video_id
           FROM youtube_trending_videos
           WHERE collected_at >= ? AND title IS NOT NULL AND title != ''
           ORDER BY collected_at DESC LIMIT ? OFFSET ?""",
        [cutoff, batch_size, offset],
    )
    articles = []
    for row in rows:
        kw = row.get("extracted_keywords", "")
        ch = row.get("channel_name", "")
        articles.append({
            "title": row["title"],
            "content": (f"채널: {ch}. 키워드: {kw}" if ch else kw)[:800],
            "url": f"https://youtube.com/watch?v={row.get('video_id', '')}",
            "category": "youtube",
        })
    return await _process_batch_rows_prepared(articles, "youtube")


async def _drip_batch_stock(days: int, batch_size: int, offset: int) -> dict:
    """Drip batch for stock (features + news combined)."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d")
    cutoff_dt = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    articles = []
    half = max(3, batch_size // 2)

    # stock_features
    feat_rows = _read_news_db(
        """SELECT topic, conclusion, affected_stocks, affected_sectors
           FROM stock_features
           WHERE date >= ? AND topic IS NOT NULL AND topic != ''
           ORDER BY date DESC LIMIT ? OFFSET ?""",
        [cutoff, half, offset],
    )
    for row in feat_rows:
        content = f"{row.get('conclusion', '')} 관련종목: {row.get('affected_stocks', '')}. 관련섹터: {row.get('affected_sectors', '')}"
        articles.append({
            "title": row["topic"],
            "content": content[:800],
            "url": "",
            "category": "stock_analysis",
        })

    # stock_news_raw
    news_rows = _read_news_db(
        """SELECT title, summary, keywords, related_stocks, related_sectors, sentiment, url, source as news_source
           FROM stock_news_raw
           WHERE created_at >= ? AND title IS NOT NULL AND title != ''
           ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        [cutoff_dt, half, offset],
    )
    for row in news_rows:
        summary = row.get("summary", "") or ""
        keywords = row.get("keywords", "") or ""
        stocks = row.get("related_stocks", "") or ""
        sectors = row.get("related_sectors", "") or ""
        content = f"{summary} 키워드: {keywords}. 관련종목: {stocks}. 섹터: {sectors}. 감성: {row.get('sentiment', '')}. 출처: {row.get('news_source', '')}"
        articles.append({
            "title": row["title"],
            "content": content[:800],
            "url": row.get("url", ""),
            "category": "stock_news",
        })

    return await _process_batch_rows_prepared(articles, "stock")


async def _drip_batch_community(days: int, batch_size: int, offset: int) -> dict:
    """Drip batch for community."""
    cutoff = (datetime.now(KST) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    rows = _read_community_db(
        """SELECT id, title, content, board
           FROM community_posts
           WHERE created_at >= ? AND title IS NOT NULL AND title != ''
             AND content IS NOT NULL AND LENGTH(content) > 30
           ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        [cutoff, batch_size, offset],
    )
    articles = []
    for row in rows:
        articles.append({
            "title": row["title"],
            "content": (row["content"] or "")[:800],
            "url": f"https://community.ilouli.com/post/{row.get('id', '')}",
            "category": row.get("board") or "community",
        })
    return await _process_batch_rows_prepared(articles, "community")


async def _process_batch_rows(rows: list[dict], source: str) -> dict:
    """Process DB rows into articles, dedup, and run AI extraction."""
    existing = _get_already_ingested_titles()
    articles = []
    for row in rows:
        title = row.get("title", "")
        if not title or title.lower() in existing:
            continue
        articles.append({
            "title": title,
            "content": (row.get("content", "") or "")[:800],
            "url": row.get("url", ""),
            "category": row.get("category", source),
        })

    if not articles:
        return {"processed": 0, "nodes_created": 0, "edges_created": 0}

    result = await process_articles(articles)
    return {"processed": len(articles), **result}


async def _process_batch_rows_prepared(articles: list[dict], source: str) -> dict:
    """Process pre-prepared articles, dedup and run AI extraction."""
    existing = _get_already_ingested_titles()
    filtered = [a for a in articles if a["title"].lower() not in existing]

    if not filtered:
        return {"processed": 0, "nodes_created": 0, "edges_created": 0}

    result = await process_articles(filtered)
    return {"processed": len(filtered), **result}
