"""Graph data API for D3.js visualization."""
from fastapi import APIRouter

from app.core.database import get_db

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("")
def get_graph(
    node_type: str | None = None,
    source_type: str | None = None,
    limit: int = 500,
):
    """Get graph data (nodes + edges) for D3.js force layout."""
    with get_db() as db:
        node_query = "SELECT id, title, node_type, tags, source_type FROM nodes WHERE 1=1"
        params = []

        if node_type:
            node_query += " AND node_type = ?"
            params.append(node_type)
        if source_type:
            node_query += " AND source_type = ?"
            params.append(source_type)

        node_query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        nodes = db.execute(node_query, params).fetchall()
        node_ids = {row["id"] for row in nodes}

        if not node_ids:
            return {"nodes": [], "edges": []}

        placeholders = ",".join("?" * len(node_ids))
        edges = db.execute(
            f"""
            SELECT id, source_id, target_id, relation_type, weight
            FROM edges
            WHERE source_id IN ({placeholders}) AND target_id IN ({placeholders})
            """,
            list(node_ids) + list(node_ids),
        ).fetchall()

        # Count connections per node
        connection_counts = {}
        for edge in edges:
            for nid in [edge["source_id"], edge["target_id"]]:
                connection_counts[nid] = connection_counts.get(nid, 0) + 1

        graph_nodes = []
        for node in nodes:
            graph_nodes.append({
                "id": node["id"],
                "title": node["title"],
                "node_type": node["node_type"],
                "tags": node["tags"],
                "source_type": node["source_type"],
                "connections": connection_counts.get(node["id"], 0),
            })

        graph_edges = [
            {
                "id": e["id"],
                "source": e["source_id"],
                "target": e["target_id"],
                "relation_type": e["relation_type"],
                "weight": e["weight"],
            }
            for e in edges
        ]

        return {"nodes": graph_nodes, "edges": graph_edges}


@router.get("/stats")
def get_stats():
    """Get graph statistics."""
    with get_db() as db:
        node_count = db.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        edge_count = db.execute("SELECT COUNT(*) FROM edges").fetchone()[0]

        type_counts = db.execute(
            "SELECT node_type, COUNT(*) as count FROM nodes GROUP BY node_type"
        ).fetchall()

        source_counts = db.execute(
            "SELECT source_type, COUNT(*) as count FROM nodes WHERE source_type IS NOT NULL GROUP BY source_type"
        ).fetchall()

        return {
            "total_nodes": node_count,
            "total_edges": edge_count,
            "by_type": {r["node_type"]: r["count"] for r in type_counts},
            "by_source": {r["source_type"]: r["count"] for r in source_counts},
        }
