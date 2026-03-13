"""Autolinker: find isolated nodes and suggest connections via AI."""
import json
import logging
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.services.ai_client import chat_completion_json

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))

AUTOLINK_PROMPT = """You are a knowledge graph linker. Given a list of isolated nodes (nodes with no connections), suggest which nodes should be connected and why.

Rules:
- Only suggest connections that make logical sense
- Each edge needs a relation_type: related, causes, part_of, uses, competes_with, impacts
- Suggest 3-10 edges maximum
- Use the exact node titles from the input
- Focus on meaningful relationships, not superficial ones

Output ONLY valid JSON:
{{
  "edges": [
    {{
      "source_title": "exact source node title",
      "target_title": "exact target node title",
      "relation_type": "related|causes|part_of|uses|competes_with|impacts",
      "reason": "brief reason for this connection"
    }}
  ]
}}

Isolated nodes:
{nodes_text}"""

VALID_RELATION_TYPES = {"related", "causes", "part_of", "uses", "competes_with", "impacts"}


async def run_autolink(batch_size: int = 20) -> dict:
    """Find isolated nodes and suggest connections via AI.

    Args:
        batch_size: Number of isolated nodes to process per batch.

    Returns:
        Dict with edges_created count and details.
    """
    with get_db() as db:
        # Find isolated nodes (0 edges)
        isolated = db.execute(
            """
            SELECT n.id, n.title, n.content, n.node_type, n.tags
            FROM nodes n
            WHERE n.id NOT IN (
                SELECT source_id FROM edges
                UNION
                SELECT target_id FROM edges
            )
            ORDER BY n.created_at DESC
            LIMIT ?
            """,
            [batch_size],
        ).fetchall()

    if not isolated:
        return {
            "status": "ok",
            "message": "No isolated nodes found",
            "edges_created": 0,
            "isolated_count": 0,
        }

    isolated_list = [dict(r) for r in isolated]

    # Build prompt text
    nodes_text = ""
    for node in isolated_list:
        tags = node.get("tags", "[]")
        content = (node.get("content") or "")[:200]
        nodes_text += (
            f"- [{node['node_type']}] {node['title']}"
            f" (tags: {tags})"
            f" — {content}\n"
        )

    # Also include some connected nodes for context
    with get_db() as db:
        connected = db.execute(
            """
            SELECT DISTINCT n.title, n.node_type, n.tags
            FROM nodes n
            WHERE n.id IN (
                SELECT source_id FROM edges
                UNION
                SELECT target_id FROM edges
            )
            ORDER BY n.created_at DESC
            LIMIT 30
            """,
        ).fetchall()

    if connected:
        nodes_text += "\nExisting connected nodes (for reference):\n"
        for node in connected:
            nodes_text += f"- [{node['node_type']}] {node['title']} (tags: {node['tags']})\n"

    # Call AI
    messages = [
        {"role": "system", "content": "You are a knowledge graph relationship suggester."},
        {"role": "user", "content": AUTOLINK_PROMPT.format(nodes_text=nodes_text)},
    ]

    try:
        result = await chat_completion_json(messages)
    except RuntimeError as e:
        logger.error("Autolink AI call failed: %s", e)
        return {
            "status": "error",
            "message": str(e),
            "edges_created": 0,
            "isolated_count": len(isolated_list),
        }

    raw_edges = result.get("edges", [])
    edges_created = 0
    errors = []
    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as db:
        # Build title -> id map
        all_nodes = db.execute("SELECT id, title FROM nodes").fetchall()
        title_to_id = {r["title"].lower(): r["id"] for r in all_nodes}

        for edge_data in raw_edges:
            try:
                source_title = edge_data.get("source_title", "").strip().lower()
                target_title = edge_data.get("target_title", "").strip().lower()
                relation_type = edge_data.get("relation_type", "related")

                if relation_type not in VALID_RELATION_TYPES:
                    relation_type = "related"

                source_id = title_to_id.get(source_title)
                target_id = title_to_id.get(target_title)

                if not source_id or not target_id or source_id == target_id:
                    continue

                # Check duplicate
                existing = db.execute(
                    "SELECT id FROM edges WHERE source_id = ? AND target_id = ? AND relation_type = ?",
                    [source_id, target_id, relation_type],
                ).fetchone()
                if existing:
                    continue

                db.execute(
                    "INSERT INTO edges (source_id, target_id, relation_type, created_at) VALUES (?, ?, ?, ?)",
                    [source_id, target_id, relation_type, now],
                )
                edges_created += 1

            except Exception as e:
                logger.warning("Autolink edge insert error: %s", e)
                errors.append(str(e))

        # Log to ingest_log
        db.execute(
            """INSERT INTO ingest_log (source_type, source_count, nodes_created, edges_created, ingested_at)
               VALUES (?, ?, ?, ?, ?)""",
            ["autolink", len(isolated_list), 0, edges_created, now],
        )

    return {
        "status": "ok",
        "isolated_count": len(isolated_list),
        "edges_created": edges_created,
        "edges_suggested": len(raw_edges),
        "errors": errors,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }
