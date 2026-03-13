"""Search API — FTS5 full-text search + vector similarity search."""
import json
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException

from app.core.database import get_db

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))

router = APIRouter(prefix="/api/search", tags=["search"])


def _snippet(text: str, query: str, max_len: int = 200) -> str:
    """Generate a content snippet with query term highlighting."""
    if not text:
        return ""

    # Find the first occurrence of any query term
    text_lower = text.lower()
    query_terms = [t.strip() for t in query.lower().split() if t.strip()]

    best_pos = -1
    for term in query_terms:
        pos = text_lower.find(term)
        if pos != -1 and (best_pos == -1 or pos < best_pos):
            best_pos = pos

    if best_pos == -1:
        # No match found, return start of text
        snippet = text[:max_len]
    else:
        # Center snippet around the match
        start = max(0, best_pos - max_len // 4)
        end = min(len(text), start + max_len)
        snippet = text[start:end]
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."

    return snippet


@router.get("")
def search_nodes(q: str, limit: int = 20):
    """Full-text search using FTS5.

    Returns nodes with highlighted snippets and rank scores.
    Supports Korean + English queries.
    """
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required.")

    q = q.strip()

    # Sanitize FTS5 query: use prefix matching (*) for Korean partial match
    terms = [t for t in q.split() if t.strip()]
    fts_query = " ".join(f'"{t}"*' for t in terms)

    with get_db() as db:
        rows = []
        try:
            rows = db.execute(
                """
                SELECT n.id, n.title, n.content, n.node_type, n.tags,
                       n.url, n.source_type, n.created_at, rank
                FROM nodes_fts fts
                JOIN nodes n ON n.id = fts.rowid
                WHERE nodes_fts MATCH ?
                ORDER BY rank
                LIMIT ?
                """,
                [fts_query, limit],
            ).fetchall()
        except Exception as e:
            logger.warning("FTS5 query failed for '%s': %s", q, e)

        # Fallback to LIKE search if FTS5 returned no results
        if not rows:
            like_pattern = f"%{q}%"
            rows = db.execute(
                """
                SELECT id, title, content, node_type, tags,
                       url, source_type, created_at, 0 as rank
                FROM nodes
                WHERE title LIKE ? OR content LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                [like_pattern, like_pattern, limit],
            ).fetchall()

        results = []
        for row in rows:
            r = dict(row)
            r["content_snippet"] = _snippet(r.get("content", "") or "", q)
            # Remove full content from search results for efficiency
            r.pop("content", None)
            results.append(r)

        return {
            "nodes": results,
            "total": len(results),
            "query": q,
            "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
        }


@router.get("/similar/{node_id}")
def similar_nodes(node_id: int, limit: int = 10):
    """Find similar nodes by embedding vector distance.

    Falls back to FTS5 search using the node's title if embeddings
    are not available.
    """
    with get_db() as db:
        # Get the target node
        node = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        node_dict = dict(node)

        # Try vector similarity search first
        try:
            from app.services.embedder import get_embedding

            # Check if node has an embedding
            emb_row = db.execute(
                "SELECT embedding FROM node_embeddings WHERE node_id = ?",
                [node_id],
            ).fetchone()

            if emb_row:
                import struct

                query_emb = list(struct.unpack(f'{384}f', emb_row["embedding"]))

                # Find similar nodes using cosine similarity via manual calculation
                all_embs = db.execute(
                    "SELECT node_id, embedding FROM node_embeddings WHERE node_id != ?",
                    [node_id],
                ).fetchall()

                if all_embs:
                    similarities = []
                    for row in all_embs:
                        other_emb = list(struct.unpack(f'{384}f', row["embedding"]))
                        # Cosine similarity
                        dot = sum(a * b for a, b in zip(query_emb, other_emb))
                        mag_a = sum(a * a for a in query_emb) ** 0.5
                        mag_b = sum(b * b for b in other_emb) ** 0.5
                        if mag_a > 0 and mag_b > 0:
                            sim = dot / (mag_a * mag_b)
                        else:
                            sim = 0.0
                        similarities.append((row["node_id"], sim))

                    similarities.sort(key=lambda x: x[1], reverse=True)
                    top_ids = similarities[:limit]

                    results = []
                    for nid, score in top_ids:
                        n = db.execute(
                            "SELECT id, title, node_type, tags, created_at FROM nodes WHERE id = ?",
                            [nid],
                        ).fetchone()
                        if n:
                            r = dict(n)
                            r["similarity_score"] = round(score, 4)
                            results.append(r)

                    return {
                        "node": {"id": node_dict["id"], "title": node_dict["title"]},
                        "similar": results,
                        "method": "embedding",
                        "total": len(results),
                    }

        except (ImportError, Exception) as e:
            logger.debug("Vector similarity unavailable, falling back to FTS5: %s", e)

        # Fallback: FTS5 search using the node's title
        title = node_dict["title"]
        terms = [t for t in title.split() if t.strip()]
        if not terms:
            return {
                "node": {"id": node_dict["id"], "title": node_dict["title"]},
                "similar": [],
                "method": "none",
                "total": 0,
            }

        fts_query = " OR ".join(f'"{t}"' for t in terms)

        try:
            rows = db.execute(
                """
                SELECT n.id, n.title, n.node_type, n.tags, n.created_at, rank
                FROM nodes_fts fts
                JOIN nodes n ON n.id = fts.rowid
                WHERE nodes_fts MATCH ? AND n.id != ?
                ORDER BY rank
                LIMIT ?
                """,
                [fts_query, node_id, limit],
            ).fetchall()

            results = []
            for row in rows:
                r = dict(row)
                # Convert FTS5 rank to a 0-1 similarity score (rank is negative, closer to 0 is better)
                r["similarity_score"] = round(max(0, 1.0 + (r.pop("rank", 0) / 10)), 4)
                results.append(r)

            return {
                "node": {"id": node_dict["id"], "title": node_dict["title"]},
                "similar": results,
                "method": "fts5_fallback",
                "total": len(results),
            }

        except Exception as e:
            logger.warning("FTS5 similarity search failed: %s", e)
            return {
                "node": {"id": node_dict["id"], "title": node_dict["title"]},
                "similar": [],
                "method": "error",
                "total": 0,
            }
