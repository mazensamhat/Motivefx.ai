"""Exercise the real GlobalError component against local missing JS responses.

This is a component recovery fixture, not a claim to reproduce the historical
production deployment. Every telemetry request terminates in this local server.
"""
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "test-results/chunk-recovery"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/demo"):
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self.send_response(202)
        self.end_headers()
        self.wfile.write(b'{"accepted":true}')

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT / "test-results/chunk-recovery-fixture/dist")))
Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"
results = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None)
        for mode in ["fresh", "transient", "persistent", "offline", "generic", "blocked"]:
            context = browser.new_context()
            context.add_cookies([{"name": "fixture-session", "value": "preserved", "url": base}])
            page = context.new_page()
            page.goto(f"{base}/demo?fixture={mode}")
            if mode == "transient":
                page.get_by_role("heading", name="Product preview fixture loaded").wait_for()
                assert page.evaluate("window.__fixtureBoots") == 2
            elif mode == "persistent":
                page.get_by_text("The automatic retry has stopped.", exact=False).wait_for()
                assert page.evaluate("window.__fixtureBoots") == 2
                page.wait_for_timeout(400)
                assert page.evaluate("window.__fixtureBoots") == 2, "must not enter a reload loop"
                page.screenshot(path=str(ARTIFACTS / "persistent.png"), full_page=True)
            elif mode == "offline":
                page.get_by_role("heading", name="Product preview fixture loaded").wait_for()
                context.set_offline(True)
                page.evaluate("window.__fixtureShowOffline()")
                page.get_by_text("You appear to be offline.", exact=False).wait_for()
                assert page.evaluate("window.__fixtureBoots") == 1
                page.screenshot(path=str(ARTIFACTS / "offline.png"), full_page=True)
                context.set_offline(False)
            elif mode == "generic":
                page.get_by_role("heading", name="Something went wrong").wait_for()
                assert page.evaluate("window.__fixtureBoots") == 1
                page.get_by_role("button", name="Try again").click()
                page.get_by_role("heading", name="Product preview fixture loaded").wait_for()
                assert page.evaluate("window.__fixtureReset") is True
            elif mode == "blocked":
                page.get_by_text("Reload this page to try again.", exact=False).wait_for()
                assert page.evaluate("window.__fixtureBoots") == 1
            else:
                page.get_by_role("heading", name="Product preview fixture loaded").wait_for()
                assert page.evaluate("window.__fixtureBoots") == 1
            assert any(cookie["name"] == "fixture-session" and cookie["value"] == "preserved" for cookie in context.cookies())
            if mode != "blocked":
                assert page.evaluate("sessionStorage.getItem('fixture:session')") == "preserved"
            results.append({"scenario": mode, "passed": True})
            context.close()
        browser.close()
finally:
    server.shutdown()
(ARTIFACTS / "results.json").write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps(results))
