"""Edge CRUD API endpoints."""
from fastapi import APIRouter, HTTPException

from app.core.database import get_db
from app.models.schemas import EdgeCreate

router = APIRouter(prefix="/api/edges", tags=["edges"])


@router.post("", status_code=201)
def create_edge(data: EdgeCreate):
    """Create a new edge between nodes."""
    with get_db() as db:
        for nid in [data.source_id, data.target_id]:
            if not db.execute("SELECT 1 FROM nodes WHERE id = ?", [nid]).fetchone():
                raise HTTPException(status_code=404, detail=f"Node {nid} not found")

        existing = db.execute(
            "SELECT 1 FROM edges WHERE source_id = ? AND target_id = ? AND relation_type = ?",
            [data.source_id, data.target_id, data.relation_type],
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Edge already exists")

        cursor = db.execute(
            "INSERT INTO edges (source_id, target_id, relation_type, weight) VALUES (?, ?, ?, ?)",
            [data.source_id, data.target_id, data.relation_type, data.weight],
        )
        edge = db.execute("SELECT * FROM edges WHERE id = ?", [cursor.lastrowid]).fetchone()
        return dict(edge)


@router.delete("/{edge_id}")
def delete_edge(edge_id: int):
    """Delete an edge."""
    with get_db() as db:
        existing = db.execute("SELECT * FROM edges WHERE id = ?", [edge_id]).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Edge not found")

        db.execute("DELETE FROM edges WHERE id = ?", [edge_id])
        return {"deleted": True, "id": edge_id}
