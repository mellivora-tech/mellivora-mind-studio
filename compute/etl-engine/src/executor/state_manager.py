from datetime import datetime
from typing import Any
import uuid
import structlog

from ..db import get_db
from ..models import ExecutionStatus

logger = structlog.get_logger()


class StateManager:
    def __init__(self) -> None:
        self.log = logger.bind(component="state_manager")

    def create_execution(
        self,
        schedule_id: str | None = None,
        schedule_name: str | None = None,
        pipeline_id: str | None = None,
        pipeline_name: str | None = None,
        trigger: str = "manual",
        params: dict[str, Any] | None = None,
    ) -> str:
        execution_id = str(uuid.uuid4())

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO etl_executions 
                    (id, schedule_id, schedule_name, pipeline_id, pipeline_name, 
                     status, trigger, params, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        execution_id,
                        schedule_id,
                        schedule_name,
                        pipeline_id,
                        pipeline_name,
                        ExecutionStatus.PENDING.value,
                        trigger,
                        params or {},
                        datetime.now(),
                    ),
                )

        self.log.info("created_execution", execution_id=execution_id)
        return execution_id

    def start_execution(self, execution_id: str) -> None:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE etl_executions 
                    SET status = %s, started_at = %s
                    WHERE id = %s
                    """,
                    (ExecutionStatus.RUNNING.value, datetime.now(), execution_id),
                )
        self.log.info("started_execution", execution_id=execution_id)

    def complete_execution(
        self, execution_id: str, status: ExecutionStatus, error: str | None = None
    ) -> None:
        now = datetime.now()

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT started_at FROM etl_executions WHERE id = %s", (execution_id,))
                row = cur.fetchone()
                started_at = row["started_at"] if row else now

                duration = int((now - started_at).total_seconds() * 1000) if started_at else 0

                cur.execute(
                    """
                    UPDATE etl_executions 
                    SET status = %s, finished_at = %s, duration = %s, error_message = %s
                    WHERE id = %s
                    """,
                    (status.value, now, duration, error, execution_id),
                )

        self.log.info(
            "completed_execution", execution_id=execution_id, status=status.value, duration=duration
        )

    def create_task(
        self,
        execution_id: str,
        node_id: str,
        node_name: str,
    ) -> str:
        task_id = str(uuid.uuid4())

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO etl_execution_tasks 
                    (id, execution_id, node_id, node_name, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        task_id,
                        execution_id,
                        node_id,
                        node_name,
                        ExecutionStatus.PENDING.value,
                        datetime.now(),
                    ),
                )

        return task_id

    def start_task(self, task_id: str) -> None:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE etl_execution_tasks 
                    SET status = %s, started_at = %s
                    WHERE id = %s
                    """,
                    (ExecutionStatus.RUNNING.value, datetime.now(), task_id),
                )

    def complete_task(
        self,
        task_id: str,
        status: ExecutionStatus,
        input_rows: int | None = None,
        output_rows: int | None = None,
        error: str | None = None,
    ) -> None:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE etl_execution_tasks 
                    SET status = %s, finished_at = %s, input_rows = %s, 
                        output_rows = %s, error = %s
                    WHERE id = %s
                    """,
                    (status.value, datetime.now(), input_rows, output_rows, error, task_id),
                )

    def add_log(
        self,
        execution_id: str,
        message: str,
        level: str = "INFO",
        task_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO etl_execution_logs 
                    (execution_id, task_id, level, message, metadata, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (execution_id, task_id, level, message, metadata or {}, datetime.now()),
                )
