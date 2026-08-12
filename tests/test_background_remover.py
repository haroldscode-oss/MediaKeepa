import atexit
import io
import os
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image


_test_downloads = tempfile.TemporaryDirectory(prefix="mediakeepa-background-test-")
atexit.register(_test_downloads.cleanup)
os.environ.setdefault("MEDIAKEEPA_TEMP_DOWNLOADS_DIR", _test_downloads.name)

import server  # noqa: E402


def png_bytes(color=(220, 20, 60, 255), size=(12, 8)):
    output = io.BytesIO()
    Image.new("RGBA", size, color).save(output, format="PNG")
    return output.getvalue()


class BackgroundRemoverTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()

    def tearDown(self):
        with server.background_remover_jobs_lock:
            server.background_remover_jobs.clear()

    def test_upload_accepts_an_image_and_queues_a_job(self):
        with patch.object(server.background_remover_executor, "submit") as submit:
            response = self.client.post(
                "/api/background-remover",
                data={"image": (io.BytesIO(png_bytes()), "portrait.png")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 202)
        payload = response.get_json()
        self.assertEqual(payload["status"], "queued")
        self.assertRegex(payload["job_id"], r"^[0-9a-f]{32}$")
        submit.assert_called_once()

        input_path = submit.call_args.args[1]
        if os.path.exists(input_path):
            os.remove(input_path)

    def test_upload_rejects_non_image_extensions(self):
        response = self.client.post(
            "/api/background-remover",
            data={"image": (io.BytesIO(b"not an image"), "notes.txt")},
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("JPG, PNG, or WebP", response.get_json()["message"])

    def test_upload_rejects_images_over_the_pixel_limit(self):
        with patch.object(server, "BACKGROUND_REMOVER_MAX_PIXELS", 50):
            response = self.client.post(
                "/api/background-remover",
                data={"image": (io.BytesIO(png_bytes()), "large.png")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("64 megapixels or fewer", response.get_json()["message"])

    def test_completed_result_is_normalized_and_safely_served(self):
        job_id = "a" * 32
        with server.background_remover_jobs_lock:
            server.background_remover_jobs[job_id] = {
                "status": "processing",
                "progress": 80,
                "allowed_files": set(),
            }

        server.complete_background_remover_job(
            job_id,
            png_bytes(),
            "My Portrait.jpg",
            "test-rmbg-2.0",
        )

        status_response = self.client.get(f"/api/background-remover/status/{job_id}")
        self.assertEqual(status_response.status_code, 200)
        status = status_response.get_json()
        self.assertEqual(status["status"], "completed")
        self.assertEqual(status["width"], 12)
        self.assertEqual(status["height"], 8)
        self.assertNotIn("allowed_files", status)

        result_response = self.client.get(status["preview_url"])
        self.assertEqual(result_response.status_code, 200)
        self.assertEqual(result_response.mimetype, "image/png")
        with Image.open(io.BytesIO(result_response.data)) as result:
            self.assertEqual(result.mode, "RGBA")
            self.assertEqual(result.size, (12, 8))
        result_response.close()

        denied = self.client.get(
            f"/api/background-remover/file/{job_id}/another-file.png"
        )
        self.assertEqual(denied.status_code, 404)


if __name__ == "__main__":
    unittest.main()
