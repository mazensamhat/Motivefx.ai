from fastapi import APIRouter, Query

from deps.modules import require_module
from services import news_feed

router = APIRouter(prefix="/api/news", tags=["news"])

MODULE_MAP = {
    "trades": "trades",
    "stocks": "trades",
    "penny": "penny",
    "crypto": "crypto",
    "betting": "betting",
    "predictions": "predictions",
}


@router.get("/{module}")
async def get_news(
    module: str,
    user_id: str = Query(default="demo"),
    limit: int = Query(default=12, le=30),
):
    key = MODULE_MAP.get(module, module)
    require_module(user_id, key)
    items = await news_feed.fetch_news(key, user_id, limit=limit)
    personal = sum(1 for i in items if i.get("affectsYou"))
    return {"items": items, "count": len(items), "personalCount": personal, "module": key}
