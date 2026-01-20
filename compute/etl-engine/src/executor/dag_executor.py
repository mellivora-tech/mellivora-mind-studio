import asyncio
from typing import Any
from collections import defaultdict
import structlog

from ..models import Schedule, DAGNode, Pipeline, ExecutionStatus
from ..db import get_db
from .pipeline_executor import PipelineExecutor
from .state_manager import StateManager

logger = structlog.get_logger()


class DAGExecutor:
    def __init__(self, state_manager: StateManager | None = None):
        self.state_manager = state_manager or StateManager()
        self.pipeline_executor = PipelineExecutor(self.state_manager)
        self.log = logger.bind(component="dag_executor")

    async def execute_schedule(
        self,
        schedule: Schedule,
        trigger: str = "scheduled",
        params: dict[str, Any] | None = None,
    ) -> str:
        execution_id = self.state_manager.create_execution(
            schedule_id=schedule.id,
            schedule_name=schedule.name,
            trigger=trigger,
            params=params,
        )

        self.log.info(
            "starting_schedule_execution",
            schedule_id=schedule.id,
            schedule_name=schedule.name,
            execution_id=execution_id,
        )

        self.state_manager.start_execution(execution_id)

        try:
            sorted_nodes = self._topological_sort(schedule.dag)

            node_results: dict[str, bool] = {}

            for batch in self._get_execution_batches(sorted_nodes):
                tasks = []
                for node in batch:
                    deps_ok = all(node_results.get(dep, False) for dep in node.depends_on)
                    if not deps_ok:
                        self.log.warning("skipping_node_due_to_failed_dependency", node_id=node.id)
                        node_results[node.id] = False
                        continue

                    task = asyncio.create_task(self._execute_node(node, execution_id, params))
                    tasks.append((node.id, task))

                results = await asyncio.gather(*[t for _, t in tasks], return_exceptions=True)

                for (node_id, _), result in zip(tasks, results):
                    if isinstance(result, BaseException):
                        self.log.error("node_execution_error", node_id=node_id, error=str(result))
                        node_results[node_id] = False
                    else:
                        node_results[node_id] = bool(result)

            all_success = all(node_results.values())
            final_status = ExecutionStatus.SUCCESS if all_success else ExecutionStatus.FAILED

            self.state_manager.complete_execution(execution_id, final_status)

            self.log.info(
                "schedule_execution_completed",
                execution_id=execution_id,
                status=final_status.value,
            )

            return execution_id

        except Exception as e:
            self.log.error("schedule_execution_failed", execution_id=execution_id, error=str(e))
            self.state_manager.complete_execution(execution_id, ExecutionStatus.FAILED, str(e))
            raise

    async def execute_pipeline(
        self,
        pipeline_id: str,
        trigger: str = "manual",
        params: dict[str, Any] | None = None,
    ) -> str:
        pipeline = self._load_pipeline(pipeline_id)
        if not pipeline:
            raise ValueError(f"Pipeline not found: {pipeline_id}")

        execution_id = self.state_manager.create_execution(
            pipeline_id=pipeline.id,
            pipeline_name=pipeline.name,
            trigger=trigger,
            params=params,
        )

        self.log.info(
            "starting_pipeline_execution",
            pipeline_id=pipeline_id,
            execution_id=execution_id,
        )

        self.state_manager.start_execution(execution_id)

        try:
            success = await self.pipeline_executor.execute(pipeline, execution_id, params)
            final_status = ExecutionStatus.SUCCESS if success else ExecutionStatus.FAILED
            self.state_manager.complete_execution(execution_id, final_status)

            return execution_id

        except Exception as e:
            self.log.error("pipeline_execution_failed", execution_id=execution_id, error=str(e))
            self.state_manager.complete_execution(execution_id, ExecutionStatus.FAILED, str(e))
            raise

    async def _execute_node(
        self,
        node: DAGNode,
        execution_id: str,
        params: dict[str, Any] | None = None,
    ) -> bool:
        pipeline = self._load_pipeline(node.pipeline_id)
        if not pipeline:
            self.log.error("pipeline_not_found", pipeline_id=node.pipeline_id)
            return False

        merged_params = {**(params or {}), **(node.params or {})}

        try:
            success = await asyncio.wait_for(
                self.pipeline_executor.execute(pipeline, execution_id, merged_params),
                timeout=node.timeout,
            )
            return success
        except asyncio.TimeoutError:
            self.log.error("node_timeout", node_id=node.id, timeout=node.timeout)
            return False

    def _load_pipeline(self, pipeline_id: str) -> Pipeline | None:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM etl_pipelines WHERE id = %s",
                    (pipeline_id,),
                )
                row = cur.fetchone()

        if not row:
            return None

        from ..models import PipelineStep, PipelineTrigger

        steps = [PipelineStep(**s) for s in (row.get("steps") or [])]
        trigger_data = row.get("trigger") or {}

        return Pipeline(
            id=str(row["id"]),
            name=row["name"],
            version=row.get("version", 1),
            description=row.get("description"),
            trigger=PipelineTrigger(**trigger_data) if trigger_data else PipelineTrigger(),
            parameters=row.get("parameters") or [],
            steps=steps,
            status=row.get("status", "draft"),
        )

    def _topological_sort(self, dag: list[DAGNode]) -> list[DAGNode]:
        node_map = {n.id: n for n in dag}
        in_degree: dict[str, int] = defaultdict(int)

        for node in dag:
            in_degree[node.id] = len(node.depends_on)

        queue = [n for n in dag if in_degree[n.id] == 0]
        sorted_nodes: list[DAGNode] = []

        while queue:
            node = queue.pop(0)
            sorted_nodes.append(node)

            for other in dag:
                if node.id in other.depends_on:
                    in_degree[other.id] -= 1
                    if in_degree[other.id] == 0:
                        queue.append(other)

        if len(sorted_nodes) != len(dag):
            raise ValueError("Circular dependency detected in DAG")

        return sorted_nodes

    def _get_execution_batches(self, sorted_nodes: list[DAGNode]) -> list[list[DAGNode]]:
        batches: list[list[DAGNode]] = []
        executed: set[str] = set()

        remaining = list(sorted_nodes)

        while remaining:
            batch = []
            for node in remaining:
                deps_met = all(dep in executed for dep in node.depends_on)
                if deps_met:
                    batch.append(node)

            if not batch:
                raise ValueError("Cannot make progress - dependency issue")

            batches.append(batch)
            for node in batch:
                executed.add(node.id)
                remaining.remove(node)

        return batches
