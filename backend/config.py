from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILES = tuple(
    str(p)
    for p in (
        Path(__file__).resolve().parent / ".env",
        _ROOT / ".env",
        _ROOT / ".env.staging",
    )
    if p.exists()
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES or None,
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        case_sensitive=False,
        extra="ignore",
    )

    finnhub_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("FINNHUB_API_KEY", "finnhub_api_key"),
    )
    twelve_data_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("TWELVE_DATA_API_KEY", "twelve_data_api_key"),
    )
    the_odds_api_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "THE_ODDS_API_KEY",
            "ODDS_API_KEY",
            "THEODDS_API_KEY",
            "the_odds_api_key",
        ),
    )
    coinstats_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("COINSTATS_API_KEY", "COINSTATS_KEY", "coinstats_api_key"),
    )

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

    openai_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENAI_API_KEY", "openai_api_key"),
    )
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
    expose_reset_links: bool = True  # set false in production (Render)
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
