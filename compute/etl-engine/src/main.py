"""ETL Engine main entry point.

This module initializes the ETL Engine service:
1. Sets up structured logging
2. Initializes database connection pool
3. Registers all plugins (extract, transform, load)
4. Starts the cron scheduler
5. Exposes HTTP API for manual triggers and health checks
"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .config import settings
from .db import DatabaseManager
from .executor import DAGExecutor
from .scheduler import CronScheduler
from .plugins import registry


def _register_plugins() -> None:
    from .plugins.extract import tushare_source  # noqa: F401
    from .plugins.extract import postgres_source  # noqa: F401
    from .plugins.extract import clickhouse_source  # noqa: F401
    from .plugins.extract import csv_source  # noqa: F401
    from .plugins.transform import filter_transform  # noqa: F401
    from .plugins.transform import map_transform  # noqa: F401
    from .plugins.transform import join_transform  # noqa: F401
    from .plugins.transform import aggregate_transform  # noqa: F401
    from .plugins.transform import dedupe_transform  # noqa: F401
    from .plugins.load import postgres_target  # noqa: F401
    from .plugins.load import clickhouse_target  # noqa: F401
    from .plugins.load import csv_target  # noqa: F401


_register_plugins()


# Configure structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
        if settings.log_level == "DEBUG"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(structlog, settings.log_level, structlog.INFO)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global instances
scheduler: CronScheduler | None = None
executor: DAGExecutor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    global scheduler, executor

    logger.info(
        "starting_etl_engine",
        service=settings.service_name,
        port=settings.service_port,
    )

    # Initialize database pool
    await DatabaseManager.init_pool()
    logger.info("database_pool_initialized")

    # Log registered plugins
    plugins = registry.list_plugins()
    logger.info(
        "plugins_registered",
        extract=plugins["extract"],
        transform=plugins["transform"],
        load=plugins["load"],
    )

    # Initialize executor and scheduler
    executor = DAGExecutor()
    scheduler = CronScheduler(executor=executor)

    # Start scheduler
    await scheduler.start()

    yield

    # Cleanup
    logger.info("shutting_down_etl_engine")

    if scheduler:
        await scheduler.stop()

    await DatabaseManager.close_pool()
    logger.info("etl_engine_stopped")


app = FastAPI(
    title="ETL Engine",
    description="ETL execution engine for Mellivora Mind Studio",
    version="0.1.0",
    lifespan=lifespan,
)


# --- Request/Response Models ---


class TriggerRequest(BaseModel):
    """Request body for manual trigger."""

    params: dict | None = None


class TriggerResponse(BaseModel):
    """Response for manual trigger."""

    execution_id: str
    message: str


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    service: str
    scheduler_active: bool
    active_schedules: int


class PluginsResponse(BaseModel):
    """Registered plugins response."""

    extract: list[str]
    transform: list[str]
    load: list[str]


# --- API Endpoints ---


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    active_schedules = scheduler.get_active_schedules() if scheduler else []
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        scheduler_active=scheduler is not None,
        active_schedules=len(active_schedules),
    )


@app.get("/plugins", response_model=PluginsResponse)
async def list_plugins() -> PluginsResponse:
    """List all registered plugins."""
    plugins = registry.list_plugins()
    return PluginsResponse(**plugins)


@app.get("/schedules")
async def list_schedules() -> list[dict]:
    """List active schedules."""
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")
    return scheduler.get_active_schedules()


@app.post("/schedules/{schedule_id}/trigger", response_model=TriggerResponse)
async def trigger_schedule(
    schedule_id: str, request: TriggerRequest | None = None
) -> TriggerResponse:
    """Manually trigger a schedule."""
    if not scheduler:
        raise HTTPException(status_code=503, detail="Scheduler not initialized")

    try:
        params = request.params if request else None
        execution_id = await scheduler.trigger_manual(schedule_id, params)
        return TriggerResponse(
            execution_id=execution_id,
            message=f"Schedule {schedule_id} triggered successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("trigger_failed", schedule_id=schedule_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/pipelines/{pipeline_id}/trigger", response_model=TriggerResponse)
async def trigger_pipeline(
    pipeline_id: str, request: TriggerRequest | None = None
) -> TriggerResponse:
    """Manually trigger a pipeline."""
    if not executor:
        raise HTTPException(status_code=503, detail="Executor not initialized")

    try:
        params = request.params if request else None
        execution_id = await executor.execute_pipeline(
            pipeline_id=pipeline_id,
            trigger="manual",
            params=params,
        )
        return TriggerResponse(
            execution_id=execution_id,
            message=f"Pipeline {pipeline_id} triggered successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("trigger_failed", pipeline_id=pipeline_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


async def main() -> None:
    """Main entry point."""
    logger.info(
        "etl_engine_starting",
        host="0.0.0.0",
        port=settings.service_port,
    )

    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=settings.service_port,
        log_level=settings.log_level.lower(),
    )
    server = uvicorn.Server(config)

    # Handle signals for graceful shutdown
    loop = asyncio.get_event_loop()

    def handle_signal(sig: signal.Signals) -> None:
        logger.info("received_signal", signal=sig.name)
        loop.call_soon(server.should_exit.__setattr__, "should_exit", True)

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda s=sig: handle_signal(s))

    await server.serve()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("interrupted")
        sys.exit(0)
