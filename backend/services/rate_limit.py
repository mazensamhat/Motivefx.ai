"""Simple in-memory rate limiting for auth endpoints."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request

_BUCKETS: dict[str, list[float]] = defaultdict(list)


def rate_limit(request: Request, *, key: str, limit: int = 10, window_seconds: int = 60) -> None:
    ip = request.client.host if request.client else "unknown"
    bucket_key = f"{key}:{ip}"
    now = time.time()
    window_start = now - window_seconds
    hits = [t for t in _BUCKETS[bucket_key] if t > window_start]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")
    hits.append(now)
    _BUCKETS[bucket_key] = hits
