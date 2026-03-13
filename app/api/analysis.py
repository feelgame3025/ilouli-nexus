"""AI analysis API endpoints — summary, causal analysis, status."""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_db
from app.core.auth import require_tier
from app.services.analysis import summarize_node, causal_analysis, is_stale

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/summarize/{node_id}", dependencies=[Depends(require_tier("family"))])
async def api_summarize(node_id: int, force: bool = Query(False)):
    """Generate or return cached AI summary for a node.

    If summary exists and is not stale, returns cached result.
    Use force=true to regenerate regardless.
    """
    with get_db() as db:
        node = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        node = dict(node)

    staleness = is_stale(node_id)

    # Return cached if exists and not stale and not forced
    if node.get("ai_summary") and not staleness["summary_stale"] and not force:
        # Count neighbors for response
        with get_db() as db:
            neighbor_count = db.execute(
                """
                SELECT COUNT(DISTINCT CASE WHEN e.source_id = ? THEN e.target_id ELSE e.source_id END)
                FROM edges e
                WHERE e.source_id = ? OR e.target_id = ?
                """,
                [node_id, node_id, node_id],
            ).fetchone()[0]

        return {
            "summary": node["ai_summary"],
            "generated_at": node["ai_summary_at"],
            "is_stale": False,
            "neighbor_count": neighbor_count,
            "cached": True,
        }

    # Generate new summary
    try:
        result = await summarize_node(node_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    return {
        "summary": result["summary"],
        "generated_at": result["generated_at"],
        "is_stale": False,
        "neighbor_count": result["neighbor_count"],
        "cached": False,
    }


@router.post("/causal/{node_id}", dependencies=[Depends(require_tier("family"))])
async def api_causal(node_id: int, force: bool = Query(False)):
    """Generate or return cached causal analysis for a node.

    If analysis exists and is not stale, returns cached result.
    Use force=true to regenerate regardless.
    """
    with get_db() as db:
        node = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        node = dict(node)

    staleness = is_stale(node_id)

    # Return cached if exists and not stale and not forced
    if node.get("causal_analysis") and not staleness["causal_stale"] and not force:
        return {
            "analysis": node["causal_analysis"],
            "paths": [],  # Paths not stored; would need regeneration to show
            "generated_at": node["causal_analysis_at"],
            "is_stale": False,
            "cached": True,
        }

    # Generate new causal analysis
    try:
        result = await causal_analysis(node_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    return {
        "analysis": result["analysis"],
        "paths": result["paths"],
        "generated_at": result["generated_at"],
        "is_stale": False,
        "cached": False,
    }


@router.get("/status/{node_id}")
def api_status(node_id: int):
    """Check if AI summaries exist and their staleness for a node."""
    with get_db() as db:
        node = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        node = dict(node)

    staleness = is_stale(node_id)

    return {
        "node_id": node_id,
        "has_summary": bool(node.get("ai_summary")),
        "has_causal": bool(node.get("causal_analysis")),
        "summary_stale": staleness["summary_stale"] if node.get("ai_summary") else None,
        "causal_stale": staleness["causal_stale"] if node.get("causal_analysis") else None,
        "summary_at": node.get("ai_summary_at"),
        "causal_at": node.get("causal_analysis_at"),
    }
