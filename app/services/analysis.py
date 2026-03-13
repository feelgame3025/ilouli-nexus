"""AI analysis service — summary, causal analysis, staleness check."""
import logging
from datetime import datetime, timezone, timedelta
from collections import deque

from app.core.database import get_db
from app.services.ai_client import chat_completion

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))


def _kst_now() -> str:
    """Return current KST datetime as ISO string."""
    return datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")


def _get_node(db, node_id: int) -> dict | None:
    """Fetch a single node as dict."""
    row = db.execute("SELECT * FROM nodes WHERE id = ?", [node_id]).fetchone()
    return dict(row) if row else None


def _get_neighbors(db, node_id: int) -> list[dict]:
    """Fetch 1-hop neighbor nodes connected via edges."""
    rows = db.execute(
        """
        SELECT DISTINCT n.*
        FROM edges e
        JOIN nodes n ON n.id = CASE WHEN e.source_id = ? THEN e.target_id ELSE e.source_id END
        WHERE e.source_id = ? OR e.target_id = ?
        """,
        [node_id, node_id, node_id],
    ).fetchall()
    return [dict(r) for r in rows]


def _get_edges_for_node(db, node_id: int) -> list[dict]:
    """Fetch edges connected to a node with relation info."""
    rows = db.execute(
        """
        SELECT e.*,
               s.title as source_title, s.node_type as source_type,
               t.title as target_title, t.node_type as target_type
        FROM edges e
        JOIN nodes s ON s.id = e.source_id
        JOIN nodes t ON t.id = e.target_id
        WHERE e.source_id = ? OR e.target_id = ?
        """,
        [node_id, node_id],
    ).fetchall()
    return [dict(r) for r in rows]


def _find_paths_bfs(db, start_id: int, max_hops: int = 3, max_paths: int = 10) -> list[list[dict]]:
    """BFS to find paths from start node up to max_hops.

    Returns list of paths. Each path is a list of node dicts.
    """
    paths: list[list[dict]] = []
    start_node = _get_node(db, start_id)
    if not start_node:
        return paths

    # BFS queue: (current_node_id, path_so_far)
    queue: deque[tuple[int, list[dict]]] = deque()
    queue.append((start_id, [start_node]))

    visited_paths: set[tuple[int, ...]] = set()

    while queue and len(paths) < max_paths:
        current_id, path = queue.popleft()

        if len(path) > 1:
            path_key = tuple(n["id"] for n in path)
            if path_key not in visited_paths:
                visited_paths.add(path_key)
                paths.append(path)

        if len(path) > max_hops:
            continue

        # Get neighbors of current node
        neighbors = db.execute(
            """
            SELECT DISTINCT n.id, n.title, n.node_type, n.content
            FROM edges e
            JOIN nodes n ON n.id = CASE WHEN e.source_id = ? THEN e.target_id ELSE e.source_id END
            WHERE (e.source_id = ? OR e.target_id = ?)
            """,
            [current_id, current_id, current_id],
        ).fetchall()

        for neighbor in neighbors:
            n_dict = dict(neighbor)
            # Avoid cycles in this path
            path_ids = {n["id"] for n in path}
            if n_dict["id"] not in path_ids:
                queue.append((n_dict["id"], path + [n_dict]))

    return paths


def is_stale(node_id: int) -> dict:
    """Check if AI analyses are stale.

    Summary is stale if any connected node/edge was modified after ai_summary_at.
    Causal is stale if any connected node/edge was modified after causal_analysis_at.

    Returns:
        dict with summary_stale, causal_stale booleans.
    """
    with get_db() as db:
        node = _get_node(db, node_id)
        if not node:
            return {"summary_stale": False, "causal_stale": False}

        summary_at = node.get("ai_summary_at")
        causal_at = node.get("causal_analysis_at")

        # Get max updated_at of connected nodes
        max_updated = db.execute(
            """
            SELECT MAX(n.updated_at) as max_updated
            FROM edges e
            JOIN nodes n ON n.id = CASE WHEN e.source_id = ? THEN e.target_id ELSE e.source_id END
            WHERE e.source_id = ? OR e.target_id = ?
            """,
            [node_id, node_id, node_id],
        ).fetchone()

        # Also check self updated_at
        node_updated = node.get("updated_at")
        connected_max = max_updated["max_updated"] if max_updated and max_updated["max_updated"] else None

        # Determine the latest relevant change
        latest_change = None
        if node_updated:
            latest_change = node_updated
        if connected_max and (latest_change is None or connected_max > latest_change):
            latest_change = connected_max

        summary_stale = False
        causal_stale = False

        if latest_change:
            if summary_at and latest_change > summary_at:
                summary_stale = True
            if causal_at and latest_change > causal_at:
                causal_stale = True

        return {"summary_stale": summary_stale, "causal_stale": causal_stale}


async def summarize_node(node_id: int) -> dict:
    """Generate AI summary for a node considering its 1-hop neighbors.

    Args:
        node_id: ID of the node to summarize.

    Returns:
        dict with summary text and metadata.

    Raises:
        ValueError: If node not found.
    """
    with get_db() as db:
        node = _get_node(db, node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")

        neighbors = _get_neighbors(db, node_id)
        edges = _get_edges_for_node(db, node_id)

    # Build prompt
    connections_text = ""
    if neighbors:
        connections_text = "\n연결된 노드:\n"
        for n in neighbors:
            edge_info = ""
            for e in edges:
                if e["source_id"] == node_id and e["target_id"] == n["id"]:
                    edge_info = f" [{e.get('relation_type', 'related')}→]"
                elif e["target_id"] == node_id and e["source_id"] == n["id"]:
                    edge_info = f" [→{e.get('relation_type', 'related')}]"
            content_preview = (n.get("content") or "")[:100]
            connections_text += f"- {n['title']} ({n['node_type']}){edge_info}: {content_preview}\n"
    else:
        connections_text = "\n(연결된 노드 없음)\n"

    node_content = node.get("content") or "(내용 없음)"
    if len(node_content) > 2000:
        node_content = node_content[:2000] + "..."

    system_msg = """당신은 지식 그래프 분석 전문가입니다.
주어진 노드와 연결 정보를 바탕으로 간결하고 통찰력 있는 요약을 한국어로 작성합니다.

다음 형식으로 출력하세요:

## 핵심 요약
(2-3문장으로 핵심 내용 요약)

## 관련 분야 영향
(연결된 노드를 고려한 영향 분석, 2-3문장)

## 핵심 인사이트
(이 노드에서 도출할 수 있는 핵심 인사이트 1-2개)"""

    user_msg = f"""다음 노드를 분석하고 요약해 주세요.

**노드 제목**: {node['title']}
**유형**: {node['node_type']}
**내용**: {node_content}
{connections_text}"""

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]

    logger.info("Generating AI summary for node %d (%s)", node_id, node["title"])
    summary = await chat_completion(messages, temperature=0.3, max_tokens=1024)

    # Save to DB
    now = _kst_now()
    with get_db() as db:
        db.execute(
            "UPDATE nodes SET ai_summary = ?, ai_summary_at = ? WHERE id = ?",
            [summary, now, node_id],
        )

    return {
        "summary": summary,
        "generated_at": now,
        "neighbor_count": len(neighbors),
    }


async def causal_analysis(node_id: int) -> dict:
    """Generate causal analysis for a node by examining paths in the graph.

    Args:
        node_id: ID of the node to analyze.

    Returns:
        dict with analysis text, paths, and metadata.

    Raises:
        ValueError: If node not found.
    """
    with get_db() as db:
        node = _get_node(db, node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")

        paths = _find_paths_bfs(db, node_id, max_hops=3, max_paths=10)

    # Build path descriptions
    if paths:
        paths_text = "\n인과 경로:\n"
        path_descriptions = []
        for i, path in enumerate(paths, 1):
            chain = " → ".join(f"{n['title']}({n['node_type']})" for n in path)
            paths_text += f"{i}. {chain}\n"
            path_descriptions.append(chain)
    else:
        paths_text = "\n(연결된 경로 없음 - 고립된 노드)\n"
        path_descriptions = []

    node_content = node.get("content") or "(내용 없음)"
    if len(node_content) > 1500:
        node_content = node_content[:1500] + "..."

    system_msg = """당신은 인과 관계 분석 전문가입니다.
지식 그래프의 경로를 분석하여 인과 관계, 시나리오, 리스크를 한국어로 도출합니다.

다음 형식으로 출력하세요:

## 인과 경로 분석
(주요 경로들의 인과 관계 설명, 3-5문장)

## 시나리오 예측
(발견된 인과 관계를 바탕으로 가능한 시나리오 2-3개)

## 잠재적 리스크/기회
(이 인과 구조에서 발생할 수 있는 리스크와 기회 각 1-2개)"""

    user_msg = f"""다음 노드를 중심으로 인과 관계를 분석해 주세요.

**중심 노드**: {node['title']}
**유형**: {node['node_type']}
**내용**: {node_content}
{paths_text}"""

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]

    logger.info("Generating causal analysis for node %d (%s)", node_id, node["title"])
    analysis_text = await chat_completion(messages, temperature=0.4, max_tokens=1500)

    # Save to DB
    now = _kst_now()
    with get_db() as db:
        db.execute(
            "UPDATE nodes SET causal_analysis = ?, causal_analysis_at = ? WHERE id = ?",
            [analysis_text, now, node_id],
        )

    return {
        "analysis": analysis_text,
        "paths": path_descriptions,
        "generated_at": now,
    }
