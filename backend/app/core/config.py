from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://tabletop_user:tabletop_pass@postgres:5432/tabletop_db"
    anthropic_api_key: str = ""
    secret_key: str = "change-me-in-production"
    frontend_url: str = "http://localhost:3000"

    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_max_tokens: int = 16000

    api_v1_prefix: str = "/api/v1"
    company_name: str = "Tabletop Tools"

    @field_validator("database_url")
    @classmethod
    def _coerce_asyncpg(cls, value: str) -> str:
        """Render (and Heroku-style hosts) expose Postgres as `postgres://` or
        `postgresql://`. SQLAlchemy + asyncpg needs the explicit driver scheme.
        """
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value[len("postgres://") :]
        if value.startswith("postgresql://") and "+asyncpg" not in value:
            return "postgresql+asyncpg://" + value[len("postgresql://") :]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
