import os
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .logger import get_logger
from .routers import activities, rank, groups

log = get_logger("vibeplan.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup | creating database tables")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("startup | database ready")
    yield
    log.info("shutdown | VibePlan API stopped")


app = FastAPI(title="VibePlan API", version="0.1.0", lifespan=lifespan)

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    log.info("→ %s %s", request.method, request.url.path)
    response = await call_next(request)
    log.info("← %s %s %d", request.method, request.url.path, response.status_code)
    return response


app.include_router(activities.router, prefix="/api")
app.include_router(rank.router, prefix="/api")
app.include_router(groups.router, prefix="/api")


@app.get("/api/health")
async def health():
    log.debug("health check")
    return {"status": "ok"}
