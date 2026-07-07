from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILES = (
    Path(__file__).resolve().parent / ".env",
    _ROOT / ".env",
    _ROOT / ".env.staging",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(p) for p in _ENV_FILES if p.exists()] or [str(_ROOT / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    finnhub_api_key: str = ""
    twelve_data_api_key: str = ""
    the_odds_api_key: str = ""
    coinstats_api_key: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_basic: str = ""
    stripe_price_alpha: str = ""
    stripe_price_trades: str = ""
    stripe_price_crypto: str = ""
    stripe_price_betting: str = ""
    stripe_price_penny: str = ""
    stripe_price_predictions: str = ""
    stripe_price_annual: str = ""
    stripe_price_bundle: str = ""
    # Intelligence tier prices (Stripe Price IDs — create in Dashboard, see docs/STRIPE-SETUP.md)
    stripe_price_lite: str = ""
    stripe_price_pro: str = ""
    stripe_price_ultra: str = ""
    stripe_price_ultra_plus: str = ""
    stripe_price_elite: str = ""

    annual_price_usd: int = 999
    bundle_price_usd: int = 109

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    api_host: str = "127.0.0.1"
    api_port: int = 8001
    cors_origins: str = "http://localhost:5280,http://127.0.0.1:5280,http://localhost:3010,http://127.0.0.1:3010,https://motivefxai.com,https://www.motivefxai.com"

    admin_api_key: str = "motivefx-admin-dev"
    backend_sync_secret: str = "motivefx-backend-sync-dev"
    app_public_url: str = "http://127.0.0.1:5280"
    """Public URL where users open the app (no trailing slash). Used for Stripe redirect + webhooks."""

    # Auth (set JWT_SECRET_KEY in production — min 32 random bytes)
    jwt_secret_key: str = "motivefx-dev-jwt-change-before-launch"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 30
    jwt_pending_2fa_expire_minutes: int = 5
    auth_enforce: bool = True
    password_reset_expire_minutes: int = 60
    expose_reset_links: bool = True  # dev/staging: return reset URL in API response
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@motivefx.ai"

    # Social API integrations (optional — also configurable per-channel in Ops Console)
    meta_access_token: str = ""
    meta_ig_business_id: str = ""
    meta_fb_page_id: str = ""
    tiktok_access_token: str = ""
    tiktok_open_id: str = ""
    youtube_api_key: str = ""
    youtube_channel_id: str = ""
    x_bearer_token: str = ""
    x_user_id: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
