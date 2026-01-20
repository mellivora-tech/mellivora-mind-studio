import pandas as pd
from typing import Any

from ..base import ExtractPlugin, PluginContext
from ..registry import registry
from ...config import settings


@registry.register_extract("source-tushare")
class TushareExtractPlugin(ExtractPlugin):
    def __init__(self, config: dict[str, Any]):
        super().__init__(config)
        self._pro: Any = None

    def _get_client(self) -> Any:
        if self._pro is None:
            import tushare as ts

            token = self.get_config("token") or settings.tushare_token
            if not token:
                raise ValueError("Tushare token is required")
            ts.set_token(token)
            self._pro = ts.pro_api()
        return self._pro

    async def extract(self, ctx: PluginContext) -> pd.DataFrame:
        pro = self._get_client()

        api_name = self.require_config("api")
        params = self.get_config("params", {})

        merged_params = {**params}
        for key, value in ctx.params.items():
            if key.startswith("tushare_"):
                merged_params[key[8:]] = value

        self.log.info("extracting_from_tushare", api=api_name, params=merged_params)

        api_func = getattr(pro, api_name, None)
        if api_func is None:
            raise ValueError(f"Unknown Tushare API: {api_name}")

        df = api_func(**merged_params)

        if df is None:
            df = pd.DataFrame()

        self.log.info("extracted_from_tushare", rows=len(df), api=api_name)
        return df
