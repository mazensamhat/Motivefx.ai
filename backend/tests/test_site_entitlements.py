"""Site ↔ backend entitlement sync tests."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import db
from deps.modules import has_module
from services.site_entitlements import sync_site_user_entitlements


class SiteEntitlementSyncTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self._db_path = Path(self._tmpdir.name) / "test.db"
        patcher = patch.object(db, "DB_PATH", self._db_path)
        self.addCleanup(patcher.stop)
        patcher.start()
        db.init_db()

    def _uid(self, name: str) -> str:
        return f"user-{name}"

    def test_admin_sync_grants_elite_all_modules(self) -> None:
        uid = self._uid("admin")
        sync_site_user_entitlements(
            uid,
            intelligence_tier="lite",
            selected_markets=[],
            subscription_active=False,
            is_admin=True,
        )
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "elite")
        self.assertTrue(has_module(uid, "trades"))
        self.assertTrue(has_module(uid, "crypto"))
        self.assertTrue(has_module(uid, "penny"))
        self.assertTrue(has_module(uid, "betting"))
        self.assertTrue(has_module(uid, "predictions"))

    def test_comp_elite_sync_unlocks_terminal_modules(self) -> None:
        uid = self._uid("elite-comp")
        sync_site_user_entitlements(
            uid,
            intelligence_tier="elite",
            selected_markets=[],
            subscription_active=True,
        )
        plan = db.get_user_plan(uid)
        self.assertEqual(plan["tier"], "elite")
        self.assertTrue(has_module(uid, "trades"))

    def test_no_subscription_revokes_modules(self) -> None:
        uid = self._uid("revoke")
        sync_site_user_entitlements(
            uid,
            intelligence_tier="elite",
            selected_markets=[],
            subscription_active=True,
        )
        self.assertTrue(has_module(uid, "trades"))

        sync_site_user_entitlements(
            uid,
            intelligence_tier="lite",
            selected_markets=[],
            subscription_active=False,
        )
        self.assertFalse(has_module(uid, "trades"))


if __name__ == "__main__":
    unittest.main()
