"""Scheduler: runs the full pipeline periodically.

Schedule: every 6 hours at 00:00, 06:00, 12:00, 18:00 KST.
Uses asyncio-based scheduling (no external dependencies).
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from app.core.database import get_db

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))

# Target hours in KST (00, 06, 12, 18)
SCHEDULE_HOURS = [0, 6, 12, 18]

# Track scheduler state
_scheduler_task = None
_last_run: str | None = None
_last_status: str | None = None
_running = False


def get_scheduler_status() -> dict:
    """Get current scheduler status."""
    return {
        "running": _scheduler_task is not None and not _scheduler_task.done(),
        "pipeline_running": _running,
        "last_run": _last_run,
        "last_status": _last_status,
        "schedule_hours_kst": SCHEDULE_HOURS,
        "next_run": _get_next_run_time(),
    }


def _get_next_run_time() -> str | None:
    """Calculate next scheduled run time."""
    now = datetime.now(KST)
    current_hour = now.hour

    for h in SCHEDULE_HOURS:
        if h > current_hour:
            next_time = now.replace(hour=h, minute=0, second=0, microsecond=0)
            return next_time.strftime("%Y-%m-%d %H:%M KST")

    # Next day first schedule
    next_time = (now + timedelta(days=1)).replace(
        hour=SCHEDULE_HOURS[0], minute=0, second=0, microsecond=0
    )
    return next_time.strftime("%Y-%m-%d %H:%M KST")


def _seconds_until_next_run() -> float:
    """Calculate seconds until next scheduled run."""
    now = datetime.now(KST)
    current_hour = now.hour

    for h in SCHEDULE_HOURS:
        if h > current_hour:
            target = now.replace(hour=h, minute=0, second=0, microsecond=0)
            return (target - now).total_seconds()

    # Next day
    target = (now + timedelta(days=1)).replace(
        hour=SCHEDULE_HOURS[0], minute=0, second=0, microsecond=0
    )
    return (target - now).total_seconds()


async def run_full_pipeline() -> dict:
    """Run the full automation pipeline: ingest -> autolink -> graphlink -> embed.

    Returns:
        Combined results from all pipeline stages.
    """
    global _last_run, _last_status, _running

    if _running:
        return {"status": "already_running", "message": "Pipeline is already running"}

    _running = True
    _last_run = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")
    results = {}

    try:
        # Stage 1: Ingest articles
        logger.info("[Pipeline] Stage 1: Ingesting articles...")
        try:
            from app.services.article_processor import process_articles
            import aiohttp
            from app.core.config import NEWS_API_URL

            articles = []
            async with aiohttp.ClientSession() as session:
                url = f"{NEWS_API_URL}/api/news/briefing/themes"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        themes = data if isinstance(data, list) else data.get("themes", [])
                        for theme in themes[:20]:
                            title = theme.get("theme_title") or theme.get("title", "")
                            content = theme.get("summary") or theme.get("content", "")
                            if title and content:
                                articles.append({
                                    "title": title,
                                    "content": content,
                                    "url": theme.get("url", ""),
                                    "category": theme.get("category", "news"),
                                })

            if articles:
                ingest_result = await process_articles(articles)
                results["ingest"] = ingest_result
            else:
                results["ingest"] = {"status": "skipped", "message": "No articles available"}

        except Exception as e:
            logger.warning("[Pipeline] Ingest failed: %s", e)
            results["ingest"] = {"status": "error", "message": str(e)}

        # Stage 2: Autolink
        logger.info("[Pipeline] Stage 2: Running autolinker...")
        try:
            from app.services.autolinker import run_autolink

            autolink_result = await run_autolink()
            results["autolink"] = autolink_result
        except Exception as e:
            logger.warning("[Pipeline] Autolink failed: %s", e)
            results["autolink"] = {"status": "error", "message": str(e)}

        # Stage 3: Graph link
        logger.info("[Pipeline] Stage 3: Running graph linker...")
        try:
            from app.services.graph_linker import run_graph_link

            graphlink_result = await run_graph_link()
            results["graphlink"] = graphlink_result
        except Exception as e:
            logger.warning("[Pipeline] Graph link failed: %s", e)
            results["graphlink"] = {"status": "error", "message": str(e)}

        # Stage 4: Embed
        logger.info("[Pipeline] Stage 4: Running embeddings...")
        try:
            from app.services.embedder import get_embedding, embedding_to_blob

            with get_db() as db:
                # Ensure table exists
                db.execute("""
                    CREATE TABLE IF NOT EXISTS node_embeddings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        node_id INTEGER UNIQUE NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
                        embedding BLOB NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Find nodes without embeddings
                nodes_without = db.execute("""
                    SELECT n.id, n.title, n.content
                    FROM nodes n
                    WHERE n.id NOT IN (SELECT node_id FROM node_embeddings)
                    LIMIT 100
                """).fetchall()

                embedded_count = 0
                for node in nodes_without:
                    text = f"{node['title']}. {node['content'] or ''}"
                    try:
                        emb = get_embedding(text)
                        blob = embedding_to_blob(emb)
                        db.execute(
                            "INSERT OR IGNORE INTO node_embeddings (node_id, embedding) VALUES (?, ?)",
                            [node["id"], blob],
                        )
                        embedded_count += 1
                    except Exception as e:
                        logger.debug("Embedding failed for node %d: %s", node["id"], e)

                results["embed"] = {"status": "ok", "embedded": embedded_count}

        except ImportError:
            results["embed"] = {"status": "skipped", "message": "sentence-transformers not installed"}
        except Exception as e:
            logger.warning("[Pipeline] Embed failed: %s", e)
            results["embed"] = {"status": "error", "message": str(e)}

        _last_status = "completed"
        logger.info("[Pipeline] Full pipeline completed: %s", results)

    except Exception as e:
        _last_status = f"error: {e}"
        logger.error("[Pipeline] Pipeline failed: %s", e)
        results["error"] = str(e)
    finally:
        _running = False

    results["timestamp"] = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST")
    return results


async def _scheduler_loop():
    """Main scheduler loop — runs pipeline at scheduled times."""
    logger.info("[Scheduler] Started. Schedule: %s KST", SCHEDULE_HOURS)

    while True:
        wait_seconds = _seconds_until_next_run()
        next_time = _get_next_run_time()
        logger.info("[Scheduler] Next run at %s (in %.0f seconds)", next_time, wait_seconds)

        await asyncio.sleep(wait_seconds)

        logger.info("[Scheduler] Running scheduled pipeline...")
        try:
            await run_full_pipeline()
        except Exception as e:
            logger.error("[Scheduler] Scheduled pipeline failed: %s", e)

        # Small delay to avoid running twice at the same minute
        await asyncio.sleep(60)


def start_scheduler():
    """Start the scheduler as a background asyncio task."""
    global _scheduler_task

    if _scheduler_task and not _scheduler_task.done():
        logger.warning("[Scheduler] Already running")
        return

    loop = asyncio.get_event_loop()
    _scheduler_task = loop.create_task(_scheduler_loop())
    logger.info("[Scheduler] Background task created")


def stop_scheduler():
    """Stop the scheduler."""
    global _scheduler_task

    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        logger.info("[Scheduler] Stopped")
    _scheduler_task = None
