import atexit
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


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

    @patch.object(server.video_enhancer_executor, "submit")
    def test_workspace_settings_are_validated_and_queued(self, submit) -> None:
        response = self.client.post(
            "/api/video-enhancer/preview",
            data={
                "frame": (io.BytesIO(b"\x89PNG\r\n\x1a\npreview"), "selected-frame.png"),
                "output_width": "1920",
                "output_height": "1080",
                "duration": "12.5",
                "model": "natural",
                "preserve_source_color": "false",
                "detail": "18",
                "denoise": "24",
                "compression_repair": "36",
                "sharpen": "7",
                "grain": "3",
                "output_quality": "balanced",
                "output_fps": "30",
                "seed": "777",
                "cfg_scale": "1.1",
                "cfg_rescale": "0.2",
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 202)
        settings = submit.call_args.args[-1]
        self.assertEqual(settings["model"], "natural")
        self.assertFalse(settings["preserve_source_color"])
        self.assertEqual(settings["compression_repair"], 36)
        self.assertEqual(settings["output_quality"], "balanced")
        self.assertEqual(settings["output_fps"], 30.0)

    def test_compute_submission_requires_the_current_worker_protocol(self) -> None:
        client = MagicMock()
        client.run_binary.return_value = type("Submission", (), {"id": "run-1"})()
        client.wait.return_value = type(
            "Run", (), {"id": "run-1", "status": "succeeded", "error": None}
        )()
        client.download_artifact.return_value = b"\x89PNG\r\n\x1a\npreview"

        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "preview.png"
            source.write_bytes(b"\x89PNG\r\n\x1a\nsource")
            with server.video_enhancer_jobs_lock:
                server.video_enhancer_jobs["job-1"] = {}
            with (
                patch.object(server, "get_modal_control_plane_client", return_value=client),
                patch.object(server, "temp_downloads_path", temporary),
                patch.object(
                    server,
                    "VIDEO_ENHANCER_CONTROL_PLANE_URL",
                    "http://127.0.0.1:8765",
                ),
            ):
                server.run_video_enhancer_job(
                    "job-1", source, "preview", 1920, 1080, 1
                )

        submitted_kwargs = client.run_binary.call_args.kwargs["kwargs"]
        self.assertEqual(
            submitted_kwargs["worker_protocol"],
            server.VIDEO_ENHANCER_WORKER_PROTOCOL,
        )


if __name__ == "__main__":
    unittest.main()
