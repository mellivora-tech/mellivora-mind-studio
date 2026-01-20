import pandas as pd
from typing import Any
from pathlib import Path
from datetime import datetime

from ..base import LoadPlugin, PluginContext
from ..registry import registry


@registry.register_load("target-csv")
class CsvLoadPlugin(LoadPlugin):
    async def load(self, ctx: PluginContext, df: pd.DataFrame) -> int:
        path = self.require_config("path")
        encoding = self.get_config("encoding", "utf-8")
        delimiter = self.get_config("delimiter", ",")
        include_header = self.get_config("header", True)
        mode = self.get_config("mode", "overwrite")

        if df.empty:
            self.log.info("no_data_to_load", path=path)
            return 0

        timestamp_suffix = self.get_config("timestamp_suffix", False)
        if timestamp_suffix:
            base_path = Path(path)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = str(base_path.parent / f"{base_path.stem}_{timestamp}{base_path.suffix}")

        file_path = Path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        self.log.info("loading_to_csv", path=path, rows=len(df))

        write_mode = "a" if mode == "append" else "w"
        write_header = include_header and (mode != "append" or not file_path.exists())

        df.to_csv(
            file_path,
            mode=write_mode,
            encoding=encoding,
            sep=delimiter,
            header=write_header,
            index=False,
        )

        self.log.info("loaded_to_csv", rows=len(df), path=str(file_path))
        return len(df)
