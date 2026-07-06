"""Map API paths to product modules for usage telemetry."""

from __future__ import annotations

import re

_PATH_MODULE_MAP = (
    (re.compile(r"^/api/stocks"), "trades"),
    (re.compile(r"^/api/advisor/trades"), "trades"),
    (re.compile(r"^/api/penny"), "penny"),
    (re.compile(r"^/api/advisor/penny"), "penny"),
    (re.compile(r"^/api/crypto"), "crypto"),
    (re.compile(r"^/api/advisor/crypto"), "crypto"),
    (re.compile(r"^/api/betting"), "betting"),
    (re.compile(r"^/api/advisor/betting"), "betting"),
    (re.compile(r"^/api/predictions"), "predictions"),
    (re.compile(r"^/api/advisor/predictions"), "predictions"),
    (re.compile(r"^/api/news/trades"), "trades"),
    (re.compile(r"^/api/news/penny"), "penny"),
    (re.compile(r"^/api/news/crypto"), "crypto"),
    (re.compile(r"^/api/news/betting"), "betting"),
    (re.compile(r"^/api/news/predictions"), "predictions"),
)


def module_for_path(path: str) -> str | None:
    for pattern, module in _PATH_MODULE_MAP:
        if pattern.match(path):
            return module
    return None


def action_for_request(method: str, path: str) -> str:
    if "analyze" in path:
        return "analyze"
    if "activity" in path:
        return "view_activity"
    if "portfolio" in path:
        return "portfolio_save"
    if "billing" in path or "checkout" in path:
        return "subscribe"
    if method == "GET":
        return "read"
    return method.lower()
