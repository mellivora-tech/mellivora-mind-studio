import pandas as pd
from typing import Any
from pathlib import Path

from ..base import ExtractPlugin, PluginContext
from ..registry import registry


@registry.register_extract("source-csv")
class CsvExtractPlugin(ExtractPlugin):
    async def extract(self, ctx: PluginContext) -> pd.DataFrame:
        path = self.require_config("path")
        encoding = self.get_config("encoding", "utf-8")
        delimiter = self.get_config("delimiter", ",")
        header = self.get_config("header", 0)
        skip_rows = self.get_config("skip_rows", 0)

        path_from_ctx = ctx.get_param("csv_path")
        if path_from_ctx:
            path = path_from_ctx

        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"CSV file not found: {path}")

        self.log.info("extracting_from_csv", path=path, encoding=encoding)

        df = pd.read_csv(
            file_path,
            encoding=encoding,
            delimiter=delimiter,
            header=header if header >= 0 else None,
            skiprows=skip_rows if skip_rows > 0 else None,
        )

        self.log.info("extracted_from_csv", rows=len(df), columns=len(df.columns))
        return df
