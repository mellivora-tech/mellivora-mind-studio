from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
import pandas as pd
import structlog

logger = structlog.get_logger()


@dataclass
class PluginContext:
    execution_id: str
    task_id: str
    params: dict[str, Any] = field(default_factory=dict)
    variables: dict[str, Any] = field(default_factory=dict)

    def get_param(self, key: str, default: Any = None) -> Any:
        return self.params.get(key, default)

    def set_variable(self, key: str, value: Any) -> None:
        self.variables[key] = value

    def get_variable(self, key: str, default: Any = None) -> Any:
        return self.variables.get(key, default)


class BasePlugin(ABC):
    name: str = ""
    plugin_type: str = ""

    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.log = logger.bind(plugin=self.name, type=self.plugin_type)

    def validate_config(self) -> None:
        pass

    def get_config(self, key: str, default: Any = None) -> Any:
        return self.config.get(key, default)

    def require_config(self, key: str) -> Any:
        if key not in self.config:
            raise ValueError(f"Missing required config: {key}")
        return self.config[key]


class ExtractPlugin(BasePlugin):
    plugin_type = "extract"

    @abstractmethod
    async def extract(self, ctx: PluginContext) -> pd.DataFrame:
        pass


class TransformPlugin(BasePlugin):
    plugin_type = "transform"

    @abstractmethod
    async def transform(self, ctx: PluginContext, df: pd.DataFrame) -> pd.DataFrame:
        pass


class LoadPlugin(BasePlugin):
    plugin_type = "load"

    @abstractmethod
    async def load(self, ctx: PluginContext, df: pd.DataFrame) -> int:
        """Load data and return number of rows written."""
        pass
