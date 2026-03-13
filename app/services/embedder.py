"""Embedding module using sentence-transformers.

Uses paraphrase-multilingual-MiniLM-L12-v2 for Korean + English support.
Lazy model loading — model is loaded on first call to avoid startup delay.
"""
import logging
import struct

logger = logging.getLogger(__name__)

# Global model reference (lazy loaded)
_model = None
_model_name = "paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIM = 384


def _load_model():
    """Load the sentence-transformers model (lazy, first call only)."""
    global _model
    if _model is not None:
        return _model

    try:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model: %s", _model_name)
        _model = SentenceTransformer(_model_name)
        logger.info("Embedding model loaded successfully (dim=%d)", EMBEDDING_DIM)
        return _model
    except ImportError:
        logger.error(
            "sentence-transformers not installed. "
            "Install with: pip install sentence-transformers"
        )
        raise
    except Exception as e:
        logger.error("Failed to load embedding model: %s", e)
        raise


def get_embedding(text: str) -> list[float]:
    """Get embedding vector for a single text.

    Args:
        text: Input text to embed.

    Returns:
        List of 384 floats (embedding vector).
    """
    model = _load_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def batch_embed(texts: list[str]) -> list[list[float]]:
    """Get embedding vectors for a batch of texts.

    Args:
        texts: List of input texts.

    Returns:
        List of embedding vectors (each 384 floats).
    """
    if not texts:
        return []

    model = _load_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [e.tolist() for e in embeddings]


def embedding_to_blob(embedding: list[float]) -> bytes:
    """Convert embedding list to binary blob for SQLite storage.

    Args:
        embedding: List of floats.

    Returns:
        Packed binary data.
    """
    return struct.pack(f"{len(embedding)}f", *embedding)


def blob_to_embedding(blob: bytes) -> list[float]:
    """Convert binary blob back to embedding list.

    Args:
        blob: Packed binary data.

    Returns:
        List of floats.
    """
    count = len(blob) // 4  # 4 bytes per float32
    return list(struct.unpack(f"{count}f", blob))
