import atexit
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_test_downloads = tempfile.TemporaryDirectory(prefix="mediakeepa-frontend-test-")
atexit.register(_test_downloads.cleanup)
os.environ.setdefault("MEDIAKEEPA_TEMP_DOWNLOADS_DIR", _test_downloads.name)

from server import app  # noqa: E402


class FrontendRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = app.test_client()

    def test_built_frontend_assets_are_served(self) -> None:
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        response.close()
        asset_paths = sorted(set(re.findall(r'(?:src|href)="(/assets/[^"]+)"', html)))
        self.assertTrue(asset_paths, "The built index did not reference any Vite assets.")

        for asset_path in asset_paths:
            with self.subTest(asset=asset_path):
                asset_response = self.client.get(asset_path)
                self.assertEqual(asset_response.status_code, 200)
                self.assertGreater(len(asset_response.data), 0)
                asset_response.close()

    def test_spa_route_returns_the_frontend_shell(self) -> None:
        for route in ("/audio-separator", "/background-remover"):
            with self.subTest(route=route):
                response = self.client.get(route)
                self.assertEqual(response.status_code, 200)
                self.assertIn('<div id="root"></div>', response.get_data(as_text=True))
                response.close()


if __name__ == "__main__":
    unittest.main()
