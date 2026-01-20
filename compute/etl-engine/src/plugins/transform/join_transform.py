import pandas as pd
from typing import Any

from ..base import TransformPlugin, PluginContext
from ..registry import registry


@registry.register_transform("transform-join")
class JoinTransformPlugin(TransformPlugin):
    async def transform(self, ctx: PluginContext, df: pd.DataFrame) -> pd.DataFrame:
        join_type = self.get_config("type", "inner")
        left_on = self.require_config("left_on")
        right_on = self.get_config("right_on", left_on)
        right_input = self.require_config("right_input")

        right_df = ctx.get_variable(right_input)
        if right_df is None:
            raise ValueError(f"Right input not found: {right_input}")

        if not isinstance(right_df, pd.DataFrame):
            raise ValueError(f"Right input is not a DataFrame: {type(right_df)}")

        self.log.info(
            "joining_data",
            left_rows=len(df),
            right_rows=len(right_df),
            join_type=join_type,
            left_on=left_on,
            right_on=right_on,
        )

        if isinstance(left_on, str):
            left_on = [left_on]
        if isinstance(right_on, str):
            right_on = [right_on]

        suffix = self.get_config("suffix", ("", "_right"))

        result = pd.merge(
            df,
            right_df,
            how=join_type,
            left_on=left_on,
            right_on=right_on,
            suffixes=suffix,
        )

        self.log.info("joined_data", output_rows=len(result))
        return result
