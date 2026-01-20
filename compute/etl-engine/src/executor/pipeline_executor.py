import asyncio
from typing import Any
import pandas as pd
import structlog

from ..models import Pipeline, PipelineStep, ExecutionStatus, StepType
from ..plugins import PluginContext, registry
from .state_manager import StateManager

logger = structlog.get_logger()


class PipelineExecutor:
    def __init__(self, state_manager: StateManager):
        self.state_manager = state_manager
        self.log = logger.bind(component="pipeline_executor")

    async def execute(
        self,
        pipeline: Pipeline,
        execution_id: str,
        params: dict[str, Any] | None = None,
    ) -> bool:
        self.log.info("executing_pipeline", pipeline_id=pipeline.id, pipeline_name=pipeline.name)

        ctx = PluginContext(
            execution_id=execution_id,
            task_id="",
            params=params or {},
        )

        steps = self._topological_sort(pipeline.steps)

        for step in steps:
            task_id = self.state_manager.create_task(
                execution_id=execution_id,
                node_id=step.id,
                node_name=step.name,
            )
            ctx.task_id = task_id

            try:
                self.state_manager.start_task(task_id)
                self.log.info(
                    "executing_step",
                    step_id=step.id,
                    step_name=step.name,
                    step_type=step.type.value,
                )

                input_rows = 0
                output_rows = 0

                if step.type == StepType.EXTRACT:
                    plugin = registry.get_extract(step.plugin, step.config)
                    df = await plugin.extract(ctx)
                    output_rows = len(df)
                    ctx.set_variable(step.output or step.id, df)

                elif step.type == StepType.TRANSFORM:
                    input_df = self._get_input_df(ctx, step)
                    input_rows = len(input_df)

                    plugin = registry.get_transform(step.plugin, step.config)
                    df = await plugin.transform(ctx, input_df)
                    output_rows = len(df)
                    ctx.set_variable(step.output or step.id, df)

                elif step.type == StepType.LOAD:
                    input_df = self._get_input_df(ctx, step)
                    input_rows = len(input_df)

                    plugin = registry.get_load(step.plugin, step.config)
                    output_rows = await plugin.load(ctx, input_df)

                self.state_manager.complete_task(
                    task_id=task_id,
                    status=ExecutionStatus.SUCCESS,
                    input_rows=input_rows,
                    output_rows=output_rows,
                )

                self.log.info(
                    "step_completed",
                    step_id=step.id,
                    input_rows=input_rows,
                    output_rows=output_rows,
                )

            except Exception as e:
                error_msg = str(e)
                self.log.error("step_failed", step_id=step.id, error=error_msg)

                self.state_manager.complete_task(
                    task_id=task_id,
                    status=ExecutionStatus.FAILED,
                    error=error_msg,
                )

                self.state_manager.add_log(
                    execution_id=execution_id,
                    task_id=task_id,
                    level="ERROR",
                    message=f"Step {step.name} failed: {error_msg}",
                )

                return False

        return True

    def _get_input_df(self, ctx: PluginContext, step: PipelineStep) -> pd.DataFrame:
        if step.input:
            df = ctx.get_variable(step.input)
            if df is None:
                raise ValueError(f"Input not found: {step.input}")
            if not isinstance(df, pd.DataFrame):
                raise ValueError(f"Input is not a DataFrame: {type(df)}")
            return df

        for var_name, var_value in ctx.variables.items():
            if isinstance(var_value, pd.DataFrame):
                return var_value

        raise ValueError(f"No input DataFrame found for step: {step.id}")

    def _topological_sort(self, steps: list[PipelineStep]) -> list[PipelineStep]:
        step_map = {s.id: s for s in steps}
        dependencies: dict[str, set[str]] = {}

        for step in steps:
            deps = set()
            if step.input and step.input in step_map:
                deps.add(step.input)

            for s in steps:
                if s.output == step.input:
                    deps.add(s.id)

            dependencies[step.id] = deps

        sorted_ids: list[str] = []
        visited: set[str] = set()
        temp_visited: set[str] = set()

        def visit(node_id: str) -> None:
            if node_id in temp_visited:
                raise ValueError(f"Circular dependency detected at: {node_id}")
            if node_id in visited:
                return

            temp_visited.add(node_id)
            for dep in dependencies.get(node_id, set()):
                if dep in step_map:
                    visit(dep)
            temp_visited.remove(node_id)
            visited.add(node_id)
            sorted_ids.append(node_id)

        for step_id in step_map:
            if step_id not in visited:
                visit(step_id)

        return [step_map[sid] for sid in sorted_ids]
