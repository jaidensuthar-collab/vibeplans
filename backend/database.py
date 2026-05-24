import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

_raw = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./vibeplan.db")

# Render provides postgres:// URLs — SQLAlchemy async needs postgresql+asyncpg://
if _raw.startswith("postgres://"):
    _raw = _raw.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw.startswith("postgresql://") and "+asyncpg" not in _raw:
    _raw = _raw.replace("postgresql://", "postgresql+asyncpg://", 1)

DATABASE_URL = _raw

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
