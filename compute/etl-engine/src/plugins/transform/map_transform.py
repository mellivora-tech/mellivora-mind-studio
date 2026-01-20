import pandas as pd
from typing import Any

from ..base import TransformPlugin, PluginContext
from ..registry import registry


@registry.register_transform("transform-map")
class MapTransformPlugin(TransformPlugin):
    async def transform(self, ctx: PluginContext, df: pd.DataFrame) -> pd.DataFrame:
        mappings = self.require_config("mappings")
        drop_unmapped = self.get_config("drop_unmapped", False)

        self.log.info("mapping_data", input_rows=len(df), mappings=len(mappings))

        result = df.copy()

        for mapping in mappings:
            source = mapping.get("source")
            target = mapping.get("target", source)
            transform_type = mapping.get("type", "rename")

            if transform_type == "rename":
                if source in result.columns:
                    if source != target:
                        result = result.rename(columns={source: target})

            elif transform_type == "cast":
                dtype = mapping.get("dtype", "str")
                if source in result.columns:
                    if dtype == "int":
                        result[target] = pd.to_numeric(result[source], errors="coerce").astype(
                            "Int64"
                        )
                    elif dtype == "float":
                        result[target] = pd.to_numeric(result[source], errors="coerce")
                    elif dtype == "str":
                        result[target] = result[source].astype(str)
                    elif dtype == "datetime":
                        result[target] = pd.to_datetime(result[source], errors="coerce")
                    elif dtype == "date":
                        result[target] = pd.to_datetime(result[source], errors="coerce").dt.date
                    elif dtype == "bool":
                        result[target] = result[source].astype(bool)

            elif transform_type == "expression":
                expr = mapping.get("expression", "")
                if expr:
                    result[target] = result.eval(expr)

            elif transform_type == "constant":
                value = mapping.get("value")
                result[target] = value

            elif transform_type == "drop":
                if source in result.columns:
                    result = result.drop(columns=[source])

        if drop_unmapped:
            mapped_targets = {
                m.get("target", m.get("source")) for m in mappings if m.get("type") != "drop"
            }
            result = result[[c for c in result.columns if c in mapped_targets]]

        self.log.info("mapped_data", output_rows=len(result), output_cols=len(result.columns))
        return result
