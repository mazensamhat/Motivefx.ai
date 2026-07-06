"""Module subscription access control — respects intelligence tier market picks."""

from fastapi import HTTPException

from db import get_active_modules, get_user_plan
from services.simulation import sim_has_module

TAB_TO_MODULE = {
    "stocks": "trades",
    "crypto": "crypto",
    "betting": "betting",
    "penny": "penny",
    "predictions": "predictions",
}


def has_paid_module(user_id: str, module: str) -> bool:
    return module in get_active_modules(user_id)


def _market_entitled(user_id: str, module: str) -> bool:
    plan = get_user_plan(user_id)
    return module in plan["allowedMarkets"]


def has_module(user_id: str, module: str) -> bool:
    if has_paid_module(user_id, module):
        return _market_entitled(user_id, module)
    return sim_has_module(user_id, module)


def require_module(user_id: str, module: str) -> None:
    if not has_module(user_id, module):
        plan = get_user_plan(user_id)
        if has_paid_module(user_id, module) and module not in plan["allowedMarkets"]:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "tier_market_locked",
                    "module": module,
                    "tier": plan["tier"],
                    "allowedMarkets": plan["allowedMarkets"],
                    "message": "This intelligence market is not included in your plan.",
                },
            )
        raise HTTPException(
            status_code=403,
            detail={
                "code": "module_locked",
                "module": module,
                "message": f"Subscribe to unlock this intelligence market.",
            },
        )
