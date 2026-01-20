"""Configuration settings for ETL Engine."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service
    service_name: str = "etl-engine"
    service_port: int = 9106
    grpc_port: int = 9107
    log_level: str = "INFO"

    # PostgreSQL (for ETL metadata)
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "postgres"
    db_password: str = ""
    db_name: str = "mellivora"
    db_sslmode: str = "disable"

    # Redis (for caching and task queue)
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ""

    # NATS (for messaging)
    nats_url: str = "nats://localhost:4222"

    # Scheduler
    scheduler_enabled: bool = True
    scheduler_poll_interval: int = 60  # seconds

    # Executor
    max_concurrent_tasks: int = 10
    task_timeout: int = 3600  # seconds

    # Tushare
    tushare_token: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            f"?sslmode={self.db_sslmode}"
        )

    @property
    def async_database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}


settings = Settings()
