"""Article processor: extracts nodes/edges from articles via AI."""
import json
import logging
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.services.ai_client import chat_completion_json
from app.services.prompts import build_article_extraction_messages, build_manual_extraction_messages

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))

VALID_NODE_TYPES = {"concept", "tech", "project", "decision", "stock"}
VALID_RELATION_TYPES = {"related", "causes", "part_of", "uses", "competes_with", "impacts"}


def _jaccard_similarity(tags_a: list[str], tags_b: list[str]) -> float:
    """Compute Jaccard similarity between two tag lists."""
    set_a = set(t.lower() for t in tags_a)
    set_b = set(t.lower() for t in tags_b)
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def _find_existing_node(db, title: str, tags: list[str], threshold: float = 0.5) -> int | None:
    """Find an existing node by title match or title+tag similarity.

    Returns node ID if a duplicate is found, None otherwise.
    """
    # Exact title match
    row = db.execute(
        "SELECT id, tags FROM nodes WHERE LOWER(title) = LOWER(?)", [title]
    ).fetchone()
    if row:
        return row["id"]

    # Fuzzy: check nodes with similar titles (contains check)
    rows = db.execute(
        "SELECT id, title, tags FROM nodes WHERE LOWER(title) LIKE ? LIMIT 10",
        [f"%{title.lower()[:20]}%"],
    ).fetchall()

    for row in rows:
        existing_tags = []
        try:
            existing_tags = json.loads(row["tags"]) if row["tags"] else []
        except (json.JSONDecodeError, TypeError):
            pass

        similarity = _jaccard_similarity(tags, existing_tags)
        if similarity >= threshold:
            return row["id"]

    return None


async def process_articles(articles: list[dict], batch_size: int = 15) -> dict:
    """Process a list of articles through AI to extract nodes and edges.

    Articles are processed in batches to stay within AI token limits.

    Args:
        articles: List of article dicts with title, content, url, category.
        batch_size: Number of articles per AI call (default 15).

    Returns:
        Dict with nodes_created, edges_created, errors.
    """
    if not articles:
        return {"nodes_created": 0, "edges_created": 0, "errors": []}

    total_nodes = 0
    total_edges = 0
    all_errors = []

    # Process in batches to avoid token limit
    for i in range(0, len(articles), batch_size):
        batch = articles[i:i + batch_size]
        messages = build_article_extraction_messages(batch)
        try:
            result = await chat_completion_json(messages)
        except RuntimeError as e:
            logger.error("AI extraction failed for batch %d: %s", i // batch_size, e)
            all_errors.append(str(e))
            continue

        raw_nodes = result.get("nodes", [])
        raw_edges = result.get("edges", [])

        batch_result = _insert_nodes_and_edges(
            raw_nodes, raw_edges, source_type="news", source_count=len(batch)
        )
        total_nodes += batch_result["nodes_created"]
        total_edges += batch_result["edges_created"]
        all_errors.extend(batch_result.get("errors", []))

    return {"nodes_created": total_nodes, "edges_created": total_edges, "errors": all_errors}


async def process_manual_text(text: str) -> dict:
    """Process raw text through AI to extract nodes and edges.

    Args:
        text: Raw text to process.

    Returns:
        Dict with nodes_created, edges_created, errors.
    """
    messages = build_manual_extraction_messages(text)
    try:
        result = await chat_completion_json(messages)
    except RuntimeError as e:
        logger.error("AI extraction failed: %s", e)
        return {"nodes_created": 0, "edges_created": 0, "errors": [str(e)]}

    raw_nodes = result.get("nodes", [])
    raw_edges = result.get("edges", [])

    return _insert_nodes_and_edges(raw_nodes, raw_edges, source_type="manual", source_count=1)


def _insert_nodes_and_edges(
    raw_nodes: list[dict],
    raw_edges: list[dict],
    source_type: str = "news",
    source_count: int = 0,
) -> dict:
    """Insert extracted nodes/edges into DB with deduplication.

    Returns summary dict.
    """
    nodes_created = 0
    edges_created = 0
    errors = []
    # Map title -> node_id for edge resolution
    title_to_id: dict[str, int] = {}

    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as db:
        # Process nodes
        for node_data in raw_nodes:
            try:
                title = node_data.get("title", "").strip()
                if not title:
                    continue

                content = node_data.get("content", "")
                node_type = node_data.get("node_type", "concept")
                if node_type not in VALID_NODE_TYPES:
                    node_type = "concept"
                tags = node_data.get("tags", [])
                if isinstance(tags, str):
                    try:
                        tags = json.loads(tags)
                    except json.JSONDecodeError:
                        tags = [tags]
                tags_json = json.dumps(tags, ensure_ascii=False)

                # Dedup check
                existing_id = _find_existing_node(db, title, tags)
                if existing_id:
                    title_to_id[title.lower()] = existing_id
                    logger.debug("Skipping duplicate node: %s (id=%d)", title, existing_id)
                    continue

                cursor = db.execute(
                    """INSERT INTO nodes (title, content, node_type, tags, source_type, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    [title, content, node_type, tags_json, source_type, now, now],
                )
                node_id = cursor.lastrowid
                title_to_id[title.lower()] = node_id
                nodes_created += 1

            except Exception as e:
                logger.warning("Error inserting node %s: %s", node_data.get("title"), e)
                errors.append(f"Node '{node_data.get('title')}': {e}")

        # Process edges
        for edge_data in raw_edges:
            try:
                source_title = edge_data.get("source_title", "").strip().lower()
                target_title = edge_data.get("target_title", "").strip().lower()
                relation_type = edge_data.get("relation_type", "related")

                if relation_type not in VALID_RELATION_TYPES:
                    relation_type = "related"

                source_id = title_to_id.get(source_title)
                target_id = title_to_id.get(target_title)

                if not source_id or not target_id:
                    # Try DB lookup for titles not in current batch
                    if not source_id:
                        row = db.execute(
                            "SELECT id FROM nodes WHERE LOWER(title) = ?", [source_title]
                        ).fetchone()
                        if row:
                            source_id = row["id"]
                    if not target_id:
                        row = db.execute(
                            "SELECT id FROM nodes WHERE LOWER(title) = ?", [target_title]
                        ).fetchone()
                        if row:
                            target_id = row["id"]

                if not source_id or not target_id:
                    continue

                if source_id == target_id:
                    continue

                # Check for duplicate edge
                existing_edge = db.execute(
                    """SELECT id FROM edges
                       WHERE source_id = ? AND target_id = ? AND relation_type = ?""",
                    [source_id, target_id, relation_type],
                ).fetchone()
                if existing_edge:
                    continue

                db.execute(
                    "INSERT INTO edges (source_id, target_id, relation_type) VALUES (?, ?, ?)",
                    [source_id, target_id, relation_type],
                )
                edges_created += 1

            except Exception as e:
                logger.warning("Error inserting edge: %s", e)
                errors.append(f"Edge: {e}")

        # Log to ingest_log
        db.execute(
            """INSERT INTO ingest_log (source_type, source_count, nodes_created, edges_created, ingested_at)
               VALUES (?, ?, ?, ?, ?)""",
            [source_type, source_count, nodes_created, edges_created, now],
        )

    return {
        "nodes_created": nodes_created,
        "edges_created": edges_created,
        "errors": errors,
    }
