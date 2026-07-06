"""Tier entitlement and downgrade reconciliation tests."""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import db
from deps.modules import has_module
from deps.tiers import require_feature
from fastapi import HTTPException


class TierEntitlementTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self._db_path = Path(self._tmpdir.name) / "test.db"
        patcher = patch.object(db, "DB_PATH", self._db_path)
        self.addCleanup(patcher.stop)
        patcher.start()
        db.init_db()

    def _uid(self, name: str) -> str:
        return f"user-{name}"

    def _activate(self, user_id: str, *modules: str, plan_tier: str = "monthly") -> None:
        for i, module in enumerate(modules):
            db.set_module_access(
                user_id,
                module,
                True,
                plan_tier=plan_tier,
                sync_plan=False,
            )
            # Stable ordering for downgrade tests
            with db.get_conn() as conn:
                conn.execute(
                    """
                    UPDATE module_subscriptions
                    SET started_at = ?
                    WHERE user_id = ? AND module = ?
                    """,
                    (f"2026-01-{i + 1:02d}T00:00:00Z", user_id, module),
                )
        db._sync_intelligence_plan_from_subscriptions(user_id)

    def _deactivate(self, user_id: str, *modules: str) -> None:
        for module in modules:
            db.set_module_access(user_id, module, False, sync_plan=False)
        db._sync_intelligence_plan_from_subscriptions(user_id)

    def test_ultra_downgrade_to_pro_loses_markets_and_voice(self) -> None:
        uid = self._uid("ultra-down")
        self._activate(uid, "trades", "crypto", "betting", "penny", "predictions", plan_tier="bundle")
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "ultra")
        self.assertTrue(plan["features"]["voice_briefing"])
        self.assertTrue(has_module(uid, "penny"))

        self._deactivate(uid, "penny", "predictions", "betting")
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "pro")
        self.assertEqual(plan["allowedMarkets"], ["trades", "crypto"])
        self.assertFalse(plan["features"]["voice_briefing"])
        self.assertFalse(has_module(uid, "penny"))
        with self.assertRaises(HTTPException) as ctx:
            require_feature(uid, "voice_briefing")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_pro_downgrade_to_lite_keeps_oldest_market(self) -> None:
        uid = self._uid("pro-down")
        self._activate(uid, "trades", "crypto")
        self.assertEqual(db.get_user_plan(uid)["tier"], "pro")

        self._deactivate(uid, "crypto")
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "lite")
        self.assertEqual(plan["allowedMarkets"], ["trades"])
        self.assertFalse(plan["features"]["portfolio_intelligence"])
        self.assertTrue(has_module(uid, "trades"))
        self.assertFalse(has_module(uid, "crypto"))

    def test_elite_annual_cancel_revokes_all_access(self) -> None:
        uid = self._uid("elite-cancel")
        db.activate_annual_plan(uid)
        self.assertEqual(db.get_user_plan(uid)["tier"], "elite")

        db.deactivate_stripe_subscription("sub-annual-test")
        # No stripe row — deactivate modules directly
        self._deactivate(uid, "trades", "crypto", "betting", "penny", "predictions", "annual")
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "lite")
        self.assertEqual(plan["allowedMarkets"], [])
        self.assertFalse(plan["features"]["portfolio_intelligence"])
        self.assertFalse(has_module(uid, "trades"))

    def test_stale_stored_tier_is_reconciled_on_read(self) -> None:
        uid = self._uid("stale-row")
        self._activate(uid, "trades")
        with db.get_conn() as conn:
            conn.execute(
                """
                INSERT INTO user_intelligence_plans (user_id, tier, selected_markets_json, updated_at)
                VALUES (?, 'ultra', ?, '2026-01-01T00:00:00Z')
                ON CONFLICT(user_id) DO UPDATE SET
                    tier = 'ultra',
                    selected_markets_json = excluded.selected_markets_json
                """,
                (uid, json.dumps(["trades", "crypto", "penny", "betting", "predictions"])),
            )
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "lite")
        self.assertEqual(plan["allowedMarkets"], ["trades"])
        self.assertFalse(plan["features"]["voice_briefing"])
        self.assertFalse(has_module(uid, "crypto"))

    def test_extra_paid_markets_beyond_tier_cap_are_not_entitled(self) -> None:
        uid = self._uid("over-cap")
        self._activate(uid, "trades", "crypto", "penny")
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "pro")
        self.assertEqual(plan["allowedMarkets"], ["trades", "crypto"])
        self.assertFalse(has_module(uid, "penny"))


    def test_tier_checkout_lite_requires_one_market(self) -> None:
        from services.tier_billing import validate_tier_markets

        with self.assertRaises(ValueError):
            validate_tier_markets("lite", [])
        with self.assertRaises(ValueError):
            validate_tier_markets("lite", ["trades", "crypto"])
        self.assertEqual(validate_tier_markets("lite", ["crypto"]), ["crypto"])

    def test_activate_tier_pro_sets_two_markets(self) -> None:
        from services.tier_billing import activate_tier_plan

        uid = self._uid("tier-pro")
        activate_tier_plan(uid, "pro", ["trades", "crypto"], payment_method="demo")
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "pro")
        self.assertEqual(set(plan["allowedMarkets"]), {"trades", "crypto"})
        self.assertTrue(plan["features"]["portfolio_intelligence"])


if __name__ == "__main__":
    unittest.main()
