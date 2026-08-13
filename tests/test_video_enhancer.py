import atexit
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_test_downloads = tempfile.TemporaryDirectory(prefix="mediakeepa-video-enhancer-test-")
atexit.register(_test_downloads.cleanup)
os.environ.setdefault("MEDIAKEEPA_TEMP_DOWNLOADS_DIR", _test_downloads.name)

import server  # noqa: E402


class VideoEnhancerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = server.app.test_client()
        with server.video_enhancer_jobs_lock:
            server.video_enhancer_jobs.clear()

    def test_output_dimensions_preserve_model_boundaries(self) -> None:
        self.assertEqual(server.video_output_dimensions(1921, 1087), (1920, 1086))
        with self.assertRaisesRegex(ValueError, "3,840"):
            server.video_output_dimensions(7680, 4320)

    @patch.object(server.video_enhancer_executor, "submit")
    def test_preview_is_queued_as_a_compute_job(self, submit) -> None:
        response = self.client.post(
            "/api/video-enhancer/preview",
            data={
                "frame": (io.BytesIO(b"\x89PNG\r\n\x1a\npreview"), "selected-frame.png"),
                "output_width": "1920",
                "output_height": "1080",
                "duration": "12.5",
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 202)
        job_id = response.get_json()["job_id"]
        status = self.client.get(f"/api/video-enhancer/status/{job_id}")
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.get_json()["kind"], "preview")
        submit.assert_called_once()

    def test_full_video_rejects_wrapper_and_non_video_inputs(self) -> None:
        response = self.client.post(
            "/api/video-enhancer",
            data={
                "video": (io.BytesIO(b"not-video"), "workflow.json"),
                "output_width": "1920",
                "output_height": "1080",
                "duration": "10",
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("MP4", response.get_json()["message"])


if __name__ == "__main__":
    unittest.main()
