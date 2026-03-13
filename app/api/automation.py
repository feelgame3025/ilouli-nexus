"""Automation API: autolinker, graph linker, pipeline control."""
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from app.core.database import get_db
from app.core.auth import require_tier

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))

router = APIRouter(prefix="/api/automation", tags=["automation"])


@router.post("/autolink", dependencies=[Depends(require_tier("family"))])
async def run_autolink_endpoint(batch_size: int = 20):
    """Run the autolinker to connect isolated nodes via AI suggestions."""
    from app.services.autolinker import run_autolink

    result = await run_autolink(batch_size=batch_size)
    return result


@router.post("/graphlink", dependencies=[Depends(require_tier("family"))])
async def run_graphlink_endpoint():
    """Run the graph linker (tag-based, cross-cluster, hub strengthening)."""
    from app.services.graph_linker import run_graph_link

    result = await run_graph_link()
    return result


@router.get("/status")
def automation_status():
    """Get automation pipeline status including last run times and stats."""
    from app.services.scheduler import get_scheduler_status

    scheduler_status = get_scheduler_status()

    with get_db() as db:
        # Get recent automation runs from ingest_log
        recent_runs = db.execute(
            """
            SELECT source_type, source_count, nodes_created, edges_created, ingested_at
            FROM ingest_log
            WHERE source_type IN ('autolink', 'graph_link', 'pipeline', 'news', 'manual')
            ORDER BY ingested_at DESC
            LIMIT 20
            """,
        ).fetchall()

        # Get overall stats
        node_count = db.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        edge_count = db.execute("SELECT COUNT(*) FROM edges").fetchone()[0]

        # Isolated node count
        isolated_count = db.execute(
            """
            SELECT COUNT(*) FROM nodes
            WHERE id NOT IN (
                SELECT source_id FROM edges
                UNION
                SELECT target_id FROM edges
            )
            """
        ).fetchone()[0]

        # Embedding count
        try:
            embed_count = db.execute("SELECT COUNT(*) FROM node_embeddings").fetchone()[0]
        except Exception:
            embed_count = 0

    return {
        "scheduler": scheduler_status,
        "stats": {
            "total_nodes": node_count,
            "total_edges": edge_count,
            "isolated_nodes": isolated_count,
            "embedded_nodes": embed_count,
        },
        "recent_runs": [dict(r) for r in recent_runs],
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


@router.post("/run-all", dependencies=[Depends(require_tier("family"))])
async def run_full_pipeline_endpoint():
    """Run the full pipeline: ingest -> autolink -> graphlink -> embed."""
    from app.services.scheduler import run_full_pipeline

    result = await run_full_pipeline()
    return result
