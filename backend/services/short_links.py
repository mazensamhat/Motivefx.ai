"""Short link slugs for social attribution — e.g. /go/ig → Instagram tracked landing."""

from __future__ import annotations

from config import settings

# slug → canonical channel id
SHORT_LINK_SLUGS: dict[str, str] = {
    "ig": "instagram",
    "instagram": "instagram",
    "insta": "instagram",
    "tt": "tiktok",
    "tiktok": "tiktok",
    "fb": "facebook",
    "facebook": "facebook",
    "yt": "youtube",
    "youtube": "youtube",
    "x": "x",
    "twitter": "x",
    "web": "website",
    "website": "website",
    "site": "website",
    "ref": "referral",
    "referral": "referral",
}

# Pretty slugs shown in Ops Console
SHORT_LINK_LABELS: dict[str, str] = {
    "instagram": "ig",
    "tiktok": "tt",
    "facebook": "fb",
    "youtube": "yt",
    "x": "x",
    "website": "web",
    "referral": "ref",
}


def resolve_slug(slug: str) -> str | None:
    return SHORT_LINK_SLUGS.get(slug.lower().strip())


def public_base_url() -> str:
    return (settings.app_public_url or "http://127.0.0.1:5280").rstrip("/")


def short_link_url(slug: str) -> str:
    """Full short URL for bios — https://yoursite.com/go/ig"""
    return f"{public_base_url()}/go/{slug}"


def landing_url(channel_id: str) -> str:
    """App URL with UTM after short-link redirect."""
    return f"{public_base_url()}/?utm_source={channel_id}"


def list_short_links() -> list[dict[str, str]]:
    channels = ["instagram", "tiktok", "facebook", "youtube", "x", "website", "referral"]
    return [
        {
            "channelId": channel,
            "slug": SHORT_LINK_LABELS.get(channel, channel),
            "shortUrl": short_link_url(SHORT_LINK_LABELS.get(channel, channel)),
            "landingUrl": landing_url(channel),
        }
        for channel in channels
    ]
