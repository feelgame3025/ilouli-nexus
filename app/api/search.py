"""Search API — FTS5 full-text search."""
from fastapi import APIRouter

from app.core.database import get_db

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search_nodes(q: str, limit: int = 20):
    """Full-text search using FTS5."""
    with get_db() as db:
        rows = db.execute(
            """
            SELECT n.*, rank
            FROM nodes_fts fts
            JOIN nodes n ON n.id = fts.rowid
            WHERE nodes_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            [q, limit],
        ).fetchall()

        return {"nodes": [dict(r) for r in rows], "total": len(rows), "query": q}
