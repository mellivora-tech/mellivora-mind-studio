import pandas as pd
from typing import Any

from ..base import TransformPlugin, PluginContext
from ..registry import registry


@registry.register_transform("transform-dedupe")
class DedupeTransformPlugin(TransformPlugin):
    async def transform(self, ctx: PluginContext, df: pd.DataFrame) -> pd.DataFrame:
        keys = self.require_config("keys")
        keep = "first" if self.get_config("keep_first", True) else "last"

        if isinstance(keys, str):
            keys = [k.strip() for k in keys.split(",") if k.strip()]

        self.log.info("deduplicating_data", input_rows=len(df), keys=keys, keep=keep)

        missing_keys = [k for k in keys if k not in df.columns]
        if missing_keys:
            raise ValueError(f"Keys not found in DataFrame: {missing_keys}")

        result = df.drop_duplicates(subset=keys, keep=keep)

        duplicates_removed = len(df) - len(result)
        self.log.info(
            "deduplicated_data",
            output_rows=len(result),
            duplicates_removed=duplicates_removed,
        )
        return result
