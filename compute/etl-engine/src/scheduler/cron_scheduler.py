"""Cron scheduler for ETL pipelines using APScheduler."""

import asyncio
from datetime import datetime
from typing import Any
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.job import Job
from croniter import croniter
import pytz

from ..config import settings
from ..db import get_db
from ..models import Schedule, DAGNode
from ..executor import DAGExecutor

logger = structlog.get_logger()


class CronScheduler:
    """Manages scheduled ETL execution using APScheduler.

    Features:
    - Loads schedules from database on startup
    - Polls for schedule changes at configurable intervals
    - Dynamically adds/removes/updates APScheduler jobs
    - Triggers DAGExecutor when schedules fire
    """

    def __init__(self, executor: DAGExecutor | None = None) -> None:
        self.executor = executor or DAGExecutor()
        self.scheduler = AsyncIOScheduler()
        self.log = logger.bind(component="cron_scheduler")
        self._active_schedules: dict[str, Schedule] = {}
        self._poll_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        """Start the scheduler and begin polling for schedule changes."""
        if not settings.scheduler_enabled:
            self.log.info("scheduler_disabled")
            return

        self.log.info("starting_scheduler")

        # Load initial schedules
        await self._sync_schedules()

        # Start APScheduler
        self.scheduler.start()

        # Start polling for changes
        self._poll_task = asyncio.create_task(self._poll_loop())

        self.log.info("scheduler_started", active_jobs=len(self._active_schedules))

    async def stop(self) -> None:
        """Stop the scheduler gracefully."""
        self.log.info("stopping_scheduler")

        # Cancel poll task
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass

        # Shutdown APScheduler
        self.scheduler.shutdown(wait=True)

        self._active_schedules.clear()
        self.log.info("scheduler_stopped")

    async def _poll_loop(self) -> None:
        """Periodically poll for schedule changes."""
        while True:
            try:
                await asyncio.sleep(settings.scheduler_poll_interval)
                await self._sync_schedules()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log.error("poll_error", error=str(e))

    async def _sync_schedules(self) -> None:
        """Synchronize APScheduler jobs with database schedules."""
        db_schedules = self._load_schedules_from_db()
        db_schedule_ids = {s.id for s in db_schedules}
        current_schedule_ids = set(self._active_schedules.keys())

        # Remove schedules that no longer exist or are disabled
        for schedule_id in current_schedule_ids - db_schedule_ids:
            self._remove_job(schedule_id)

        for schedule in db_schedules:
            existing = self._active_schedules.get(schedule.id)

            if existing is None:
                # New schedule - add it
                self._add_job(schedule)
            elif self._schedule_changed(existing, schedule):
                # Schedule changed - update it
                self._remove_job(schedule.id)
                self._add_job(schedule)

        # Update next_run_at for all schedules
        self._update_next_run_times()

    def _load_schedules_from_db(self) -> list[Schedule]:
        """Load all enabled schedules from database."""
        schedules: list[Schedule] = []

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, description, cron_expr, timezone, enabled, 
                           dag, last_run_at, next_run_at
                    FROM etl_schedules
                    WHERE enabled = true
                    """
                )
                rows = cur.fetchall()

        for row in rows:
            dag_data = row.get("dag") or []
            dag_nodes = [DAGNode(**node) for node in dag_data]

            schedule = Schedule(
                id=str(row["id"]),
                name=row["name"],
                description=row.get("description"),
                cron_expr=row["cron_expr"],
                timezone=row.get("timezone", "Asia/Shanghai"),
                enabled=row["enabled"],
                dag=dag_nodes,
                last_run_at=row.get("last_run_at"),
                next_run_at=row.get("next_run_at"),
            )
            schedules.append(schedule)

        return schedules

    def _schedule_changed(self, old: Schedule, new: Schedule) -> bool:
        """Check if schedule configuration has changed."""
        return old.cron_expr != new.cron_expr or old.timezone != new.timezone or old.dag != new.dag

    def _add_job(self, schedule: Schedule) -> None:
        """Add APScheduler job for a schedule."""
        try:
            trigger = CronTrigger.from_crontab(
                schedule.cron_expr,
                timezone=pytz.timezone(schedule.timezone),
            )

            self.scheduler.add_job(
                self._execute_schedule,
                trigger=trigger,
                id=f"schedule_{schedule.id}",
                args=[schedule],
                replace_existing=True,
                misfire_grace_time=60,
            )

            self._active_schedules[schedule.id] = schedule

            self.log.info(
                "added_schedule_job",
                schedule_id=schedule.id,
                schedule_name=schedule.name,
                cron_expr=schedule.cron_expr,
            )

        except Exception as e:
            self.log.error(
                "failed_to_add_schedule_job",
                schedule_id=schedule.id,
                error=str(e),
            )

    def _remove_job(self, schedule_id: str) -> None:
        """Remove APScheduler job for a schedule."""
        job_id = f"schedule_{schedule_id}"

        try:
            self.scheduler.remove_job(job_id)
        except Exception:
            pass  # Job may not exist

        if schedule_id in self._active_schedules:
            schedule = self._active_schedules.pop(schedule_id)
            self.log.info(
                "removed_schedule_job",
                schedule_id=schedule_id,
                schedule_name=schedule.name,
            )

    async def _execute_schedule(self, schedule: Schedule) -> None:
        """Execute a scheduled DAG."""
        self.log.info(
            "executing_schedule",
            schedule_id=schedule.id,
            schedule_name=schedule.name,
        )

        try:
            # Update last_run_at
            self._update_last_run(schedule.id)

            # Execute the DAG
            execution_id = await self.executor.execute_schedule(
                schedule=schedule,
                trigger="scheduled",
            )

            self.log.info(
                "schedule_execution_completed",
                schedule_id=schedule.id,
                execution_id=execution_id,
            )

        except Exception as e:
            self.log.error(
                "schedule_execution_failed",
                schedule_id=schedule.id,
                error=str(e),
            )

    def _update_last_run(self, schedule_id: str) -> None:
        """Update last_run_at timestamp for a schedule."""
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE etl_schedules 
                    SET last_run_at = %s
                    WHERE id = %s
                    """,
                    (datetime.now(), schedule_id),
                )

    def _update_next_run_times(self) -> None:
        """Update next_run_at for all active schedules."""
        now = datetime.now()

        for schedule_id, schedule in self._active_schedules.items():
            try:
                tz = pytz.timezone(schedule.timezone)
                cron = croniter(schedule.cron_expr, now.astimezone(tz))
                next_run = cron.get_next(datetime)

                with get_db() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            UPDATE etl_schedules 
                            SET next_run_at = %s
                            WHERE id = %s
                            """,
                            (next_run, schedule_id),
                        )

            except Exception as e:
                self.log.error(
                    "failed_to_update_next_run",
                    schedule_id=schedule_id,
                    error=str(e),
                )

    async def trigger_manual(
        self,
        schedule_id: str,
        params: dict[str, Any] | None = None,
    ) -> str:
        """Manually trigger a schedule execution."""
        schedule = self._active_schedules.get(schedule_id)

        if not schedule:
            # Try loading from DB
            schedules = self._load_schedules_from_db()
            for s in schedules:
                if s.id == schedule_id:
                    schedule = s
                    break

        if not schedule:
            raise ValueError(f"Schedule not found: {schedule_id}")

        self.log.info("manual_trigger", schedule_id=schedule_id)

        execution_id = await self.executor.execute_schedule(
            schedule=schedule,
            trigger="manual",
            params=params,
        )

        return execution_id

    def get_active_schedules(self) -> list[dict[str, Any]]:
        """Get list of active schedules with their APScheduler job info."""
        result: list[dict[str, Any]] = []

        for schedule_id, schedule in self._active_schedules.items():
            job_id = f"schedule_{schedule_id}"
            job: Job | None = self.scheduler.get_job(job_id)

            result.append(
                {
                    "id": schedule.id,
                    "name": schedule.name,
                    "cron_expr": schedule.cron_expr,
                    "timezone": schedule.timezone,
                    "next_run_time": job.next_run_time.isoformat()
                    if job and job.next_run_time
                    else None,
                    "dag_nodes": len(schedule.dag),
                }
            )

        return result
