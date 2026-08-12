import atexit
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_test_downloads = tempfile.TemporaryDirectory(prefix="mediakeepa-routing-test-")
atexit.register(_test_downloads.cleanup)
os.environ.setdefault("MEDIAKEEPA_TEMP_DOWNLOADS_DIR", _test_downloads.name)

import server  # noqa: E402


class FakeUpstream:
    def __init__(self, status_code=200):
        self.status_code = status_code
        self.content = json.dumps({"connected": True, "provisioned": True}).encode("utf-8")
        self.headers = {"Content-Type": "application/json"}


class ComputeRoutingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = server.app.test_client()
        self.original_audio_backend = server.AUDIO_SEPARATOR_BACKEND
        self.original_background_backend = server.BACKGROUND_REMOVER_BACKEND
        self.mode_directory = tempfile.TemporaryDirectory(prefix="mediakeepa-mode-test-")
        self.original_mode_path = server.PERFORMANCE_MODE_PATH
        server.PERFORMANCE_MODE_PATH = Path(self.mode_directory.name) / "performance-mode"

    def tearDown(self) -> None:
        server.AUDIO_SEPARATOR_BACKEND = self.original_audio_backend
        server.BACKGROUND_REMOVER_BACKEND = self.original_background_backend
        server.PERFORMANCE_MODE_PATH = self.original_mode_path
        self.mode_directory.cleanup()

    @patch.object(server.requests, "request", return_value=FakeUpstream())
    def test_successful_provisioning_activates_compute_pool_immediately(self, _request) -> None:
        server.AUDIO_SEPARATOR_BACKEND = "modal"
        server.BACKGROUND_REMOVER_BACKEND = "modal"

        response = self.client.post(
            "/compute/api/accounts/provision",
            json={"credential": "private", "hfToken": "private"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(server.AUDIO_SEPARATOR_BACKEND, "control-plane")
        self.assertEqual(server.BACKGROUND_REMOVER_BACKEND, "control-plane")
        self.assertFalse(server.PERFORMANCE_MODE_PATH.exists())

    @patch.object(server.requests, "request", return_value=FakeUpstream(status_code=400))
    def test_failed_provisioning_does_not_change_runtime_routing(self, _request) -> None:
        server.AUDIO_SEPARATOR_BACKEND = "modal"
        server.BACKGROUND_REMOVER_BACKEND = "modal"

        response = self.client.post(
            "/compute/api/accounts/provision",
            json={"credential": "invalid", "hfToken": "invalid"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(server.AUDIO_SEPARATOR_BACKEND, "modal")
        self.assertEqual(server.BACKGROUND_REMOVER_BACKEND, "modal")
        self.assertFalse(server.PERFORMANCE_MODE_PATH.exists())


if __name__ == "__main__":
    unittest.main()
