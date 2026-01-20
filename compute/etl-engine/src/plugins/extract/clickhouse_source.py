import pandas as pd
from typing import Any
from clickhouse_driver import Client

from ..base import ExtractPlugin, PluginContext
from ..registry import registry


@registry.register_extract("source-clickhouse")
class ClickhouseExtractPlugin(ExtractPlugin):
    def _get_client(self) -> Client:
        return Client(
            host=self.require_config("host"),
            port=self.get_config("port", 9000),
            database=self.get_config("database", "default"),
            user=self.get_config("username", "default"),
            password=self.get_config("password", ""),
        )

    async def extract(self, ctx: PluginContext) -> pd.DataFrame:
        query = self.require_config("query")
        query_params = self.get_config("query_params", {})

        merged_params = {**query_params}
        for key, value in ctx.params.items():
            if key.startswith("ch_"):
                merged_params[key[3:]] = value

        self.log.info("extracting_from_clickhouse", query=query[:100])

        client = self._get_client()

        result = client.execute(query, merged_params or None, with_column_types=True)
        rows, columns_with_types = result
        column_names = [col[0] for col in columns_with_types]

        if not rows:
            return pd.DataFrame(columns=column_names)

        df = pd.DataFrame(rows, columns=column_names)
        self.log.info("extracted_from_clickhouse", rows=len(df))
        return df
