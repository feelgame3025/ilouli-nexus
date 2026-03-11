"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import PORT, ALLOWED_ORIGINS
from app.core.database import init_db
from app.api import nodes, edges, graph, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="ilouli-nexus",
    description="Knowledge Graph Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(nodes.router)
app.include_router(edges.router)
app.include_router(graph.router)
app.include_router(search.router)


@app.get("/api/health")
def health():
    """Health check endpoint."""
    from datetime import datetime, timezone, timedelta

    KST = timezone(timedelta(hours=9))
    return {
        "status": "ok",
        "service": "ilouli-nexus",
        "port": PORT,
        "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
