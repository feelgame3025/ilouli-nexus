"""Pydantic schemas for API request/response."""
from pydantic import BaseModel
from typing import Optional


class NodeCreate(BaseModel):
    title: str
    content: Optional[str] = None
    node_type: str = "concept"
    tags: Optional[str] = "[]"
    url: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[int] = None


class NodeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    node_type: Optional[str] = None
    tags: Optional[str] = None
    url: Optional[str] = None


class NodeResponse(BaseModel):
    id: int
    title: str
    content: Optional[str]
    node_type: str
    tags: str
    url: Optional[str]
    source_type: Optional[str]
    source_id: Optional[int]
    created_at: str
    updated_at: str
    ai_summary: Optional[str] = None
    ai_summary_at: Optional[str] = None
    causal_analysis: Optional[str] = None
    causal_analysis_at: Optional[str] = None


class EdgeCreate(BaseModel):
    source_id: int
    target_id: int
    relation_type: str = "related"
    weight: float = 1.0


class EdgeResponse(BaseModel):
    id: int
    source_id: int
    target_id: int
    relation_type: str
    weight: float
    created_at: str


class GraphData(BaseModel):
    nodes: list[dict]
    edges: list[dict]


class SearchResult(BaseModel):
    nodes: list[dict]
    total: int
