from contextlib import contextmanager
from typing import Generator, Any
import asyncpg
import psycopg2
from psycopg2.extras import RealDictCursor

from ..config import settings


class DatabaseManager:
    _pool: asyncpg.Pool | None = None

    @classmethod
    async def init_pool(cls) -> None:
        if cls._pool is None:
            cls._pool = await asyncpg.create_pool(
                settings.async_database_url,
                min_size=5,
                max_size=20,
            )

    @classmethod
    async def close_pool(cls) -> None:
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        if cls._pool is None:
            await cls.init_pool()
        return cls._pool  # type: ignore


@contextmanager
def get_db() -> Generator[Any, None, None]:
    conn = psycopg2.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        dbname=settings.db_name,
        cursor_factory=RealDictCursor,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


async def get_async_db() -> asyncpg.Connection:
    pool = await DatabaseManager.get_pool()
    return await pool.acquire()
