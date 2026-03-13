"""Graph Linker: tag-based linking, cross-cluster bridging, hub strengthening."""
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from app.core.database import get_db

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))


def _parse_tags(tags_str: str) -> list[str]:
    """Parse tags JSON string to list, handling errors."""
    if not tags_str:
        return []
    try:
        tags = json.loads(tags_str)
        if isinstance(tags, list):
            return [t.lower().strip() for t in tags if isinstance(t, str) and t.strip()]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def _find_clusters(nodes: list[dict], edges: list[dict]) -> list[set[int]]:
    """Find connected components (clusters) using union-find."""
    parent = {}

    def find(x):
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x])
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    node_ids = {n["id"] for n in nodes}
    for nid in node_ids:
        parent[nid] = nid

    for edge in edges:
        src, tgt = edge["source_id"], edge["target_id"]
        if src in node_ids and tgt in node_ids:
            union(src, tgt)

    clusters = defaultdict(set)
    for nid in node_ids:
        clusters[find(nid)].add(nid)

    return list(clusters.values())


async def run_graph_link() -> dict:
    """Run graph linking: tag-based, cross-cluster, and hub strengthening.

    Returns:
        Dict with counts for each linking type.
    """
    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    tag_edges = 0
    bridge_edges = 0
    hub_edges = 0
    errors = []

    with get_db() as db:
        all_nodes = db.execute("SELECT id, title, tags, node_type FROM nodes").fetchall()
        all_edges = db.execute("SELECT id, source_id, target_id, relation_type FROM edges").fetchall()

        nodes_list = [dict(r) for r in all_nodes]
        edges_list = [dict(r) for r in all_edges]

        # Build existing edge set for dedup
        existing_edges = set()
        for e in edges_list:
            existing_edges.add((e["source_id"], e["target_id"]))
            existing_edges.add((e["target_id"], e["source_id"]))

        # --- 1. Tag-based linking: nodes sharing 2+ tags ---
        tag_to_nodes: dict[str, list[int]] = defaultdict(list)
        node_tags: dict[int, list[str]] = {}

        for node in nodes_list:
            tags = _parse_tags(node.get("tags", "[]"))
            node_tags[node["id"]] = tags
            for tag in tags:
                tag_to_nodes[tag].append(node["id"])

        # Find pairs sharing 2+ tags
        pair_shared_tags: dict[tuple[int, int], int] = defaultdict(int)
        for tag, nids in tag_to_nodes.items():
            if len(nids) > 50:
                # Skip overly common tags to avoid explosion
                continue
            for i in range(len(nids)):
                for j in range(i + 1, len(nids)):
                    a, b = min(nids[i], nids[j]), max(nids[i], nids[j])
                    pair_shared_tags[(a, b)] += 1

        for (a, b), shared_count in pair_shared_tags.items():
            if shared_count >= 2 and (a, b) not in existing_edges:
                try:
                    db.execute(
                        "INSERT INTO edges (source_id, target_id, relation_type, weight, created_at) VALUES (?, ?, ?, ?, ?)",
                        [a, b, "shared_tag", min(shared_count / 5.0, 1.0), now],
                    )
                    existing_edges.add((a, b))
                    existing_edges.add((b, a))
                    tag_edges += 1
                except Exception as e:
                    errors.append(f"Tag edge ({a},{b}): {e}")

        # --- 2. Cross-cluster bridging ---
        clusters = _find_clusters(nodes_list, edges_list)

        if len(clusters) > 1:
            # For each pair of clusters, check if they share tags
            cluster_tags: dict[int, set[str]] = {}
            cluster_node_map: dict[int, dict[str, list[int]]] = {}

            for idx, cluster in enumerate(clusters):
                all_cluster_tags: set[str] = set()
                tag_nodes: dict[str, list[int]] = defaultdict(list)
                for nid in cluster:
                    for tag in node_tags.get(nid, []):
                        all_cluster_tags.add(tag)
                        tag_nodes[tag].append(nid)
                cluster_tags[idx] = all_cluster_tags
                cluster_node_map[idx] = tag_nodes

            # Find clusters with shared tags and create bridge edges
            for i in range(min(len(clusters), 20)):
                for j in range(i + 1, min(len(clusters), 20)):
                    shared = cluster_tags.get(i, set()) & cluster_tags.get(j, set())
                    if shared:
                        # Pick one node from each cluster that shares a tag
                        bridge_tag = next(iter(shared))
                        nodes_i = cluster_node_map.get(i, {}).get(bridge_tag, [])
                        nodes_j = cluster_node_map.get(j, {}).get(bridge_tag, [])
                        if nodes_i and nodes_j:
                            a, b = nodes_i[0], nodes_j[0]
                            if (a, b) not in existing_edges and a != b:
                                try:
                                    db.execute(
                                        "INSERT INTO edges (source_id, target_id, relation_type, weight, created_at) VALUES (?, ?, ?, ?, ?)",
                                        [a, b, "bridge", 0.5, now],
                                    )
                                    existing_edges.add((a, b))
                                    existing_edges.add((b, a))
                                    bridge_edges += 1
                                except Exception as e:
                                    errors.append(f"Bridge edge ({a},{b}): {e}")

        # --- 3. Hub strengthening: high-degree nodes get weighted edges ---
        # Find hub nodes (degree >= 5)
        degree = defaultdict(int)
        for e in edges_list:
            degree[e["source_id"]] += 1
            degree[e["target_id"]] += 1

        hub_threshold = 5
        hubs = [nid for nid, deg in degree.items() if deg >= hub_threshold]

        for hub_id in hubs[:10]:  # Limit to top 10 hubs
            # Get hub's neighbors
            neighbors = set()
            for e in edges_list:
                if e["source_id"] == hub_id:
                    neighbors.add(e["target_id"])
                elif e["target_id"] == hub_id:
                    neighbors.add(e["source_id"])

            # Get 2-hop neighbors (neighbors of neighbors) not yet connected to hub
            for neighbor_id in list(neighbors)[:20]:
                for e in edges_list:
                    candidate = None
                    if e["source_id"] == neighbor_id and e["target_id"] != hub_id:
                        candidate = e["target_id"]
                    elif e["target_id"] == neighbor_id and e["source_id"] != hub_id:
                        candidate = e["source_id"]

                    if (
                        candidate
                        and candidate not in neighbors
                        and (hub_id, candidate) not in existing_edges
                        and hub_id != candidate
                    ):
                        # Check if they share tags
                        hub_tags_set = set(node_tags.get(hub_id, []))
                        cand_tags_set = set(node_tags.get(candidate, []))
                        if hub_tags_set & cand_tags_set:
                            try:
                                db.execute(
                                    "INSERT INTO edges (source_id, target_id, relation_type, weight, created_at) VALUES (?, ?, ?, ?, ?)",
                                    [hub_id, candidate, "hub_link", 0.3, now],
                                )
                                existing_edges.add((hub_id, candidate))
                                existing_edges.add((candidate, hub_id))
                                hub_edges += 1
                            except Exception as e:
                                errors.append(f"Hub edge ({hub_id},{candidate}): {e}")

        # Log to ingest_log
        total_edges = tag_edges + bridge_edges + hub_edges
        db.execute(
            """INSERT INTO ingest_log (source_type, source_count, nodes_created, edges_created, ingested_at)
               VALUES (?, ?, ?, ?, ?)""",
            ["graph_link", len(nodes_list), 0, total_edges, now],
        )

    return {
        "status": "ok",
        "tag_edges_created": tag_edges,
        "bridge_edges_created": bridge_edges,
        "hub_edges_created": hub_edges,
        "total_edges_created": tag_edges + bridge_edges + hub_edges,
        "clusters_found": len(clusters) if 'clusters' in dir() else 0,
        "errors": errors,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }
