import pandas as pd
from typing import Any
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

from ..base import LoadPlugin, PluginContext
from ..registry import registry


@registry.register_load("target-postgres")
class PostgresLoadPlugin(LoadPlugin):
    def _get_connection(self) -> psycopg2.extensions.connection:
        return psycopg2.connect(
            host=self.require_config("host"),
            port=self.get_config("port", 5432),
            database=self.require_config("database"),
            user=self.require_config("username"),
            password=self.require_config("password"),
        )

    async def load(self, ctx: PluginContext, df: pd.DataFrame) -> int:
        table = self.require_config("table")
        schema = self.get_config("schema", "public")
        mode = self.get_config("mode", "append")
        batch_size = self.get_config("batch_size", 1000)

        if df.empty:
            self.log.info("no_data_to_load", table=table)
            return 0

        self.log.info("loading_to_postgres", table=table, schema=schema, mode=mode, rows=len(df))

        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                full_table = f"{schema}.{table}"

                if mode == "overwrite":
                    cur.execute(sql.SQL("TRUNCATE TABLE {}").format(sql.Identifier(schema, table)))

                columns = list(df.columns)
                col_str = ", ".join([f'"{c}"' for c in columns])
                placeholders = ", ".join(["%s"] * len(columns))

                if mode == "upsert":
                    conflict_keys = self.get_config("conflict_keys", [])
                    if not conflict_keys:
                        raise ValueError("conflict_keys required for upsert mode")

                    conflict_str = ", ".join([f'"{k}"' for k in conflict_keys])
                    update_cols = [c for c in columns if c not in conflict_keys]
                    update_str = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in update_cols])

                    insert_sql = f"""
                        INSERT INTO {full_table} ({col_str})
                        VALUES %s
                        ON CONFLICT ({conflict_str}) DO UPDATE SET {update_str}
                    """
                else:
                    insert_sql = f"INSERT INTO {full_table} ({col_str}) VALUES %s"

                values = [tuple(row) for row in df.itertuples(index=False, name=None)]

                for i in range(0, len(values), batch_size):
                    batch = values[i : i + batch_size]
                    execute_values(cur, insert_sql, batch)

                conn.commit()

        except Exception as e:
            conn.rollback()
            self.log.error("load_failed", error=str(e))
            raise
        finally:
            conn.close()

        self.log.info("loaded_to_postgres", rows=len(df))
        return len(df)
