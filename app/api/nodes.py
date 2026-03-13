"""Node CRUD API endpoints."""
from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.core.auth import require_tier
from app.models.schemas import NodeCreate, NodeUpdate, NodeResponse

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.get("")
def list_nodes(
    node_type: str | None = None,
    source_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """List nodes with optional filters."""
    with get_db() as db:
        query = "SELECT * FROM nodes WHERE 1=1"
        params = []

        if node_type:
            query += " AND node_type = ?"
            params.append(node_type)
        if source_type:
            query += " AND source_type = ?"
            params.append(source_type)

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = db.execute(query, params).fetchall()
        total = db.execute(
            "SELECT COUNT(*) FROM nodes" + (" WHERE node_type = ?" if node_type else ""),
            [node_type] if node_type else [],
        ).fetchone()[0]

        return {"nodes": [dict(r) for r in rows], "total": total}


@router.get("/{node_id}")
def get_node(node_id: int):
    """Get a single node with its connections."""
    with get_db() as db:
        node = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        edges = db.execute(
            """
            SELECT e.*, n.title as connected_title, n.node_type as connected_type
            FROM edges e
            JOIN nodes n ON (CASE WHEN e.source_id = ? THEN e.target_id ELSE e.source_id END) = n.id
            WHERE e.source_id = ? OR e.target_id = ?
            """,
            [node_id, node_id, node_id],
        ).fetchall()

        return {"node": dict(node), "edges": [dict(e) for e in edges]}


@router.post("", status_code=201, dependencies=[Depends(require_tier("family"))])
def create_node(data: NodeCreate):
    """Create a new node."""
    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO nodes (title, content, node_type, tags, url, source_type, source_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [data.title, data.content, data.node_type, data.tags, data.url, data.source_type, data.source_id],
        )
        node_id = cursor.lastrowid
        node = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        return dict(node)


@router.put("/{node_id}", dependencies=[Depends(require_tier("family"))])
def update_node(node_id: int, data: NodeUpdate):
    """Update a node."""
    with get_db() as db:
        existing = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Node not found")

        updates = {}
        if data.title is not None:
            updates["title"] = data.title
        if data.content is not None:
            updates["content"] = data.content
        if data.node_type is not None:
            updates["node_type"] = data.node_type
        if data.tags is not None:
            updates["tags"] = data.tags
        if data.url is not None:
            updates["url"] = data.url

        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [node_id]
            db.execute(f"UPDATE nodes SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)

        node = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        return dict(node)


@router.delete("/{node_id}", dependencies=[Depends(require_tier("admin"))])
def delete_node(node_id: int):
    """Delete a node."""
    with get_db() as db:
        existing = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Node not found")

        db.execute("DELETE FROM nodes WHERE id = ?", [node_id])
        return {"deleted": True, "id": node_id}
