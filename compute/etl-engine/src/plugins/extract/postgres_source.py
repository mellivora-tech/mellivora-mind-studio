import pandas as pd
from typing import Any
import psycopg2
from psycopg2.extras import RealDictCursor

from ..base import ExtractPlugin, PluginContext
from ..registry import registry


@registry.register_extract("source-postgres")
class PostgresExtractPlugin(ExtractPlugin):
    def _get_connection(self) -> psycopg2.extensions.connection:
        return psycopg2.connect(
            host=self.require_config("host"),
            port=self.get_config("port", 5432),
            database=self.require_config("database"),
            user=self.require_config("username"),
            password=self.require_config("password"),
            cursor_factory=RealDictCursor,
        )

    async def extract(self, ctx: PluginContext) -> pd.DataFrame:
        query = self.require_config("query")
        query_params = self.get_config("query_params", {})

        merged_params = {**query_params}
        for key, value in ctx.params.items():
            if key.startswith("pg_"):
                merged_params[key[3:]] = value

        self.log.info("extracting_from_postgres", query=query[:100])

        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(query, merged_params or None)
                rows = cur.fetchall()

            if not rows:
                return pd.DataFrame()

            df = pd.DataFrame(rows)
            self.log.info("extracted_from_postgres", rows=len(df))
            return df
        finally:
            conn.close()
