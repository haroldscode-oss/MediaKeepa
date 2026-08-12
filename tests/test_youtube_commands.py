import atexit
import os
import tempfile
import unittest

_test_downloads = tempfile.TemporaryDirectory(prefix="mediakeepa-youtube-test-")
atexit.register(_test_downloads.cleanup)
os.environ.setdefault("MEDIAKEEPA_TEMP_DOWNLOADS_DIR", _test_downloads.name)

from server import build_yt_dlp_command, summarize_yt_dlp_failure


class YouTubeCommandTests(unittest.TestCase):
    def test_youtube_commands_enable_javascript_solver(self):
        url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

        command = build_yt_dlp_command(["yt-dlp", "--dump-json"], url, "tv")

        self.assertIn("--js-runtimes", command)
        self.assertIn("node", command)
        self.assertIn("--remote-components", command)
        self.assertIn("ejs:github", command)
        self.assertLess(command.index("--js-runtimes"), command.index(url))

    def test_non_youtube_commands_do_not_enable_youtube_solver(self):
        url = "https://media.w3.org/2010/05/sintel/trailer.mp4"

        command = build_yt_dlp_command(["yt-dlp", "--dump-json"], url)

        self.assertNotIn("--js-runtimes", command)
        self.assertNotIn("--remote-components", command)
        self.assertIn("--ignore-config", command)
        self.assertIn("--encoding", command)
        self.assertLess(command.index("--ignore-config"), command.index(url))

    def test_yt_dlp_failure_summary_preserves_reason_but_not_url(self):
        url = "https://example.com/private-video"
        stderr = f"WARNING: trying fallback\nERROR: Unsupported URL: {url}"

        summary = summarize_yt_dlp_failure(stderr, url)

        self.assertEqual(summary, "Unsupported URL: the provided URL")


if __name__ == "__main__":
    unittest.main()
