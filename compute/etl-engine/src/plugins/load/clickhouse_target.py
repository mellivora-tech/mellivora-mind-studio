import pandas as pd
from typing import Any
from clickhouse_driver import Client

from ..base import LoadPlugin, PluginContext
from ..registry import registry


@registry.register_load("target-clickhouse")
class ClickhouseLoadPlugin(LoadPlugin):
    def _get_client(self) -> Client:
        return Client(
            host=self.require_config("host"),
            port=self.get_config("port", 9000),
            database=self.get_config("database", "default"),
            user=self.get_config("username", "default"),
            password=self.get_config("password", ""),
        )

    async def load(self, ctx: PluginContext, df: pd.DataFrame) -> int:
        table = self.require_config("table")
        mode = self.get_config("mode", "append")
        batch_size = self.get_config("batch_size", 10000)

        if df.empty:
            self.log.info("no_data_to_load", table=table)
            return 0

        self.log.info("loading_to_clickhouse", table=table, mode=mode, rows=len(df))

        client = self._get_client()

        if mode == "overwrite":
            client.execute(f"TRUNCATE TABLE {table}")

        columns = list(df.columns)
        col_str = ", ".join(columns)

        df_clean = df.copy()
        for col in df_clean.columns:
            if df_clean[col].dtype == "object":
                df_clean[col] = df_clean[col].fillna("")
            elif df_clean[col].dtype in ["float64", "float32"]:
                df_clean[col] = df_clean[col].fillna(0.0)
            elif df_clean[col].dtype in ["int64", "int32", "Int64"]:
                df_clean[col] = df_clean[col].fillna(0)

        values = df_clean.values.tolist()

        total_inserted = 0
        for i in range(0, len(values), batch_size):
            batch = values[i : i + batch_size]
            insert_sql = f"INSERT INTO {table} ({col_str}) VALUES"
            client.execute(insert_sql, batch)
            total_inserted += len(batch)

        self.log.info("loaded_to_clickhouse", rows=total_inserted)
        return total_inserted
