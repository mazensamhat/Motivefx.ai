from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import time

from config import settings
from db import init_db, record_channel_visit, record_usage_event
from routers import admin, advisor, auth, betting, core, crypto, home, news, penny, predictions, stocks
from services.short_links import landing_url, resolve_slug
from services.usage_tracking import action_for_request, module_for_path

app = FastAPI(
    title="MotiveFX.AI API",
    description="AI-powered market intelligence — Trades, Crypto, Betting, and Pink Slips research & tracking.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(core.router)
app.include_router(stocks.router)
app.include_router(crypto.router)
app.include_router(betting.router)
app.include_router(penny.router)
app.include_router(predictions.router)
app.include_router(home.router)
app.include_router(news.router)
app.include_router(advisor.router)


@app.middleware("http")
async def usage_telemetry_middleware(request: Request, call_next):
    path = request.url.path
    skip = path.startswith("/api/admin") or path in ("/", "/docs", "/openapi.json", "/redoc")
    start = time.perf_counter()
    response = await call_next(request)
    if skip or not path.startswith("/api/"):
        return response
    duration_ms = (time.perf_counter() - start) * 1000
    user_id = request.query_params.get("user_id") or request.headers.get("x-user-id")
    module = module_for_path(path)
    action = action_for_request(request.method, path)
    try:
        record_usage_event(user_id, module, action, path, response.status_code, duration_ms)
    except Exception:
        pass
    return response


@app.get("/go/{slug}")
async def short_link_redirect(slug: str):
    """Bio-friendly short links — e.g. /go/ig records Instagram visit and lands with UTM."""
    channel = resolve_slug(slug)
    if not channel:
        raise HTTPException(status_code=404, detail="Unknown short link")
    record_channel_visit(channel, None)
    return RedirectResponse(url=landing_url(channel), status_code=302)


@app.get("/")
async def root():
    return {"app": "MotiveFX.AI", "docs": "/docs"}
