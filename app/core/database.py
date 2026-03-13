"""SQLite database connection and schema initialization."""
import os
import sqlite3
from contextlib import contextmanager

from app.core.config import DB_PATH

SCHEMA_SQL = """
-- 지식 그래프 노드
CREATE TABLE IF NOT EXISTS nodes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    content         TEXT,
    node_type       TEXT NOT NULL DEFAULT 'concept',
    tags            TEXT DEFAULT '[]',
    url             TEXT,
    source_type     TEXT,
    source_id       INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_summary          TEXT,
    ai_summary_at       TIMESTAMP,
    causal_analysis     TEXT,
    causal_analysis_at  TIMESTAMP
);

-- 노드 간 관계
CREATE TABLE IF NOT EXISTS edges (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id     INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id     INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL DEFAULT 'related',
    weight        REAL DEFAULT 1.0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 전문 검색 (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    title, content, content='nodes', content_rowid='id'
);

-- FTS5 트리거: 노드 INSERT 시 자동 동기화
CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO nodes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
    INSERT INTO nodes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

-- 수집 이력
CREATE TABLE IF NOT EXISTS ingest_log (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type    TEXT,
    source_count   INTEGER DEFAULT 0,
    nodes_created  INTEGER DEFAULT 0,
    edges_created  INTEGER DEFAULT 0,
    ingested_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 노드 임베딩 (벡터 검색 fallback - sqlite-vec 없을 때)
CREATE TABLE IF NOT EXISTS node_embeddings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id     INTEGER UNIQUE NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    embedding   BLOB NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_node_embeddings_node ON node_embeddings(node_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_nodes_source ON nodes(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
"""


def init_db():
    """Initialize database with schema."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA_SQL)
    conn.close()


@contextmanager
def get_db():
    """Get database connection context manager."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
