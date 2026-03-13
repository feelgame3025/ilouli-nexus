"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import PORT, ALLOWED_ORIGINS
from app.core.database import init_db
from app.api import nodes, edges, graph, search, ingest, analysis, automation, batch

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and start scheduler on startup."""
    init_db()

    # Start the automation scheduler
    try:
        from app.services.scheduler import start_scheduler

        start_scheduler()
        logger.info("Automation scheduler started")
    except Exception as e:
        logger.warning("Failed to start scheduler: %s", e)

    yield

    # Cleanup: stop scheduler
    try:
        from app.services.scheduler import stop_scheduler

        stop_scheduler()
    except Exception:
        pass


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
app.include_router(ingest.router)
app.include_router(analysis.router)
app.include_router(automation.router)
app.include_router(batch.router)


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
