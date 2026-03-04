from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Price Monitor"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://price_user:price_pass@db:5432/price_monitor"
    DATABASE_URL_SYNC: str = "postgresql://price_user:price_pass@db:5432/price_monitor"

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_NAME: str = "Price Monitor"
    EMAILS_FROM_EMAIL: str = ""
    SMTP_TLS: bool = True

    # SendGrid (alternative to SMTP)
    SENDGRID_API_KEY: Optional[str] = None
    USE_SENDGRID: bool = False

    # WhatsApp — Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_FROM: Optional[str] = None  # e.g. "whatsapp:+14155238886"

    # WhatsApp — Z-API (alternative)
    ZAPI_INSTANCE_ID: Optional[str] = None
    ZAPI_TOKEN: Optional[str] = None
    ZAPI_CLIENT_TOKEN: Optional[str] = None
    USE_ZAPI: bool = False

    # Scraping behaviour
    REQUEST_DELAY_MIN: float = 2.0   # seconds between requests
    REQUEST_DELAY_MAX: float = 5.0
    REQUEST_TIMEOUT: int = 15        # seconds
    MAX_RETRIES: int = 3

    # Price check schedule (default every 30 minutes)
    DEFAULT_CHECK_INTERVAL_MINUTES: int = 30

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3010", "http://localhost:80"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
