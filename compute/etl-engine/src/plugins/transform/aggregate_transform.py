import pandas as pd
from typing import Any

from ..base import TransformPlugin, PluginContext
from ..registry import registry


@registry.register_transform("transform-aggregate")
class AggregateTransformPlugin(TransformPlugin):
    async def transform(self, ctx: PluginContext, df: pd.DataFrame) -> pd.DataFrame:
        group_by = self.get_config("group_by", [])
        aggregations = self.require_config("aggregations")

        self.log.info(
            "aggregating_data",
            input_rows=len(df),
            group_by=group_by,
            aggregations=len(aggregations),
        )

        if isinstance(group_by, str):
            group_by = [g.strip() for g in group_by.split(",") if g.strip()]

        agg_dict: dict[str, Any] = {}
        rename_dict: dict[tuple[str, str], str] = {}

        for agg in aggregations:
            column = agg.get("column")
            func = agg.get("function", "sum")
            alias = agg.get("alias", f"{column}_{func}")

            if column not in agg_dict:
                agg_dict[column] = []

            agg_dict[column].append(func)
            rename_dict[(column, func)] = alias

        if group_by:
            grouped = df.groupby(group_by, as_index=False)
            result = grouped.agg(agg_dict)

            if isinstance(result.columns, pd.MultiIndex):
                new_columns: list[str] = []
                for col in result.columns:
                    if col[1]:
                        key = (str(col[0]), str(col[1]))
                        new_columns.append(rename_dict.get(key, f"{col[0]}_{col[1]}"))
                    else:
                        new_columns.append(str(col[0]))
                result.columns = pd.Index(new_columns)
        else:
            result = df.agg(agg_dict)
            if isinstance(result, pd.Series):
                result = result.to_frame().T

        self.log.info("aggregated_data", output_rows=len(result))
        return result
