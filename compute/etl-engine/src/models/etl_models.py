from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepType(str, Enum):
    EXTRACT = "extract"
    TRANSFORM = "transform"
    LOAD = "load"


class ErrorHandling(str, Enum):
    SKIP_ROW = "skip_row"
    FAIL = "fail"
    DEFAULT_VALUE = "default_value"


class DataSource(BaseModel):
    id: str
    name: str
    type: str
    plugin: str
    config: dict[str, Any] = Field(default_factory=dict)
    capabilities: list[str] = Field(default_factory=list)
    status: str = "inactive"


class FieldDefinition(BaseModel):
    name: str
    type: str
    precision: int | None = None
    scale: int | None = None
    primary: bool = False
    nullable: bool = True
    default: Any = None


class StorageConfig(BaseModel):
    type: str
    table: str
    partition_by: str | None = None
    order_by: list[str] | None = None
    ttl_days: int | None = None


class DataSet(BaseModel):
    id: str
    name: str
    version: int = 1
    category: str
    schema_def: dict[str, Any] = Field(alias="schema")
    storage: StorageConfig
    indexes: list[dict[str, Any]] = Field(default_factory=list)
    status: str = "inactive"


class PipelineStep(BaseModel):
    id: str
    name: str
    type: StepType
    plugin: str
    config: dict[str, Any] = Field(default_factory=dict)
    input: str | None = None
    output: str | None = None
    parallel: bool = False
    on_error: ErrorHandling = ErrorHandling.FAIL


class PipelineTrigger(BaseModel):
    type: str = "manual"
    schedule: str | None = None
    timezone: str = "Asia/Shanghai"


class Pipeline(BaseModel):
    id: str
    name: str
    version: int = 1
    description: str | None = None
    trigger: PipelineTrigger = Field(default_factory=PipelineTrigger)
    parameters: list[dict[str, Any]] = Field(default_factory=list)
    steps: list[PipelineStep] = Field(default_factory=list)
    status: str = "draft"


class DAGNode(BaseModel):
    id: str
    name: str
    pipeline_id: str
    depends_on: list[str] = Field(default_factory=list)
    params: dict[str, Any] = Field(default_factory=dict)
    timeout: int = 3600
    retries: int = 0


class Schedule(BaseModel):
    id: str
    name: str
    description: str | None = None
    cron_expr: str
    timezone: str = "Asia/Shanghai"
    enabled: bool = False
    dag: list[DAGNode] = Field(default_factory=list)
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None


class ExecutionTask(BaseModel):
    id: str
    execution_id: str
    node_id: str
    node_name: str
    status: ExecutionStatus = ExecutionStatus.PENDING
    started_at: datetime | None = None
    finished_at: datetime | None = None
    input_rows: int | None = None
    output_rows: int | None = None
    error_count: int = 0
    error: str | None = None


class Execution(BaseModel):
    id: str
    schedule_id: str | None = None
    schedule_name: str | None = None
    pipeline_id: str | None = None
    pipeline_name: str | None = None
    status: ExecutionStatus = ExecutionStatus.PENDING
    trigger: str = "manual"
    params: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration: int | None = None
    tasks: list[ExecutionTask] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
