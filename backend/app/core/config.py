from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database - DUX (solo lectura)
    DATABASE_URL: str = "postgresql://dux_user:Pm2480856!@localhost:5432/dux_integrada"

    # Database - Mi Sucursal Anexa (lectura/escritura)
    DATABASE_ANEXA_URL: str = "postgresql://dux_user:Pm2480856!@localhost:5432/mi_sucursal"

    # JWT
    SECRET_KEY: str = "DEV_ONLY_SET_REAL_SECRET_IN_ENV"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas

    # External APIs
    VENDEDORES_API_URL: str = "http://localhost:8011/vendedores-api"

    # CORS
    CORS_ORIGINS: list = ["*"]

    # Google Drive export (agregado 2026-04-21)
    GDRIVE_SERVICE_ACCOUNT_FILE: str = "/app/secrets/drive-sa.json"
    GDRIVE_ROOT_FOLDER_ID: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
