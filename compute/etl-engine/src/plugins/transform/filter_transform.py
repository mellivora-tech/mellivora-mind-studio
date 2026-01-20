import pandas as pd
from typing import Any

from ..base import TransformPlugin, PluginContext
from ..registry import registry


@registry.register_transform("transform-filter")
class FilterTransformPlugin(TransformPlugin):
    async def transform(self, ctx: PluginContext, df: pd.DataFrame) -> pd.DataFrame:
        condition = self.require_config("condition")

        self.log.info("filtering_data", condition=condition, input_rows=len(df))

        try:
            result = df.query(condition)
        except Exception as e:
            self.log.error("filter_failed", error=str(e), condition=condition)
            raise ValueError(f"Invalid filter condition: {condition}") from e

        self.log.info("filtered_data", output_rows=len(result))
        return result
