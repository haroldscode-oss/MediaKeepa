import atexit
import os
import tempfile
import unittest


_test_downloads = tempfile.TemporaryDirectory(prefix="mediakeepa-tiktok-test-")
atexit.register(_test_downloads.cleanup)
os.environ.setdefault("MEDIAKEEPA_TEMP_DOWNLOADS_DIR", _test_downloads.name)

from server import (  # noqa: E402
    build_tiktok_player_metadata,
    choose_tiktok_format,
    extract_tiktok_post_id,
    is_tiktok_url,
    validate_tiktok_media_url,
)


class TikTokFallbackTests(unittest.TestCase):
    def setUp(self):
        self.url = "https://www.tiktok.com/@sune.ae/video/7542284447299669261"
        self.item = {
            "id": "7542284447299669261",
            "desc": "The GOAT antagonist",
            "author_info": {
                "nickname": "SunE",
                "unique_id": "sune.ae",
            },
            "music_info": {
                "title": "Original sound",
                "author": "SunE",
            },
            "video_info": {
                "meta": {"duration": 18.4, "width": 1080, "height": 1920},
                "cover": {
                    "url_list": [
                        "https://p16-sign-useast2a.tiktokcdn.com/tos-useast2a/cover.jpeg"
                    ]
                },
                "profiles": [
                    {
                        "gear_name": "720p",
                        "codec_type": "h264",
                        "bitrate": 900000,
                        "video_meta": {"width": 576, "height": 1024, "fps": 30},
                        "play_addr": {
                            "url_list": [
                                "https://v16-webapp-prime.us.tiktok.com/video/720.mp4"
                            ]
                        },
                    },
                    {
                        "gear_name": "1080p",
                        "codec_type": "h265",
                        "bitrate": 1700000,
                        "video_meta": {"width": 1080, "height": 1920, "fps": 30},
                        "play_addr": {
                            "url_list": [
                                "https://v16-webapp-prime.us.tiktok.com/video/1080.mp4"
                            ]
                        },
                    },
                ],
            },
        }

    def test_recognizes_tiktok_hosts_and_post_ids(self):
        self.assertTrue(is_tiktok_url(self.url))
        self.assertTrue(is_tiktok_url("https://vm.tiktok.com/ZM123/"))
        self.assertFalse(is_tiktok_url("https://tiktok.com.example.test/video/7542284447299669261"))
        self.assertEqual(extract_tiktok_post_id(self.url), "7542284447299669261")

    def test_rejects_non_tiktok_media_hosts(self):
        self.assertTrue(validate_tiktok_media_url("https://v16-webapp-prime.us.tiktok.com/video.mp4"))
        self.assertTrue(validate_tiktok_media_url("https://p16.tiktokcdn.com/cover.jpeg"))
        self.assertFalse(validate_tiktok_media_url("https://example.test/video.mp4"))

    def test_builds_compatible_metadata_from_player_item(self):
        metadata = build_tiktok_player_metadata(
            self.item,
            self.url,
            "7542284447299669261",
        )

        self.assertEqual(metadata["_mediakeepa_source"], "tiktok-player-api")
        self.assertEqual(metadata["title"], "The GOAT antagonist")
        self.assertEqual(metadata["uploader"], "SunE")
        self.assertEqual(metadata["duration_string"], "0:18")
        self.assertEqual(len(metadata["formats"]), 2)
        self.assertEqual(metadata["thumbnails"][0]["id"], "cover")

    def test_selects_best_profile_within_requested_quality(self):
        metadata = build_tiktok_player_metadata(
            self.item,
            self.url,
            "7542284447299669261",
        )

        selected = choose_tiktok_format(metadata, "1080p")

        # The profiles are vertical, so their heights represent the long edge. The
        # 1024-pixel profile is the best stream below the requested 1080 ceiling.
        self.assertEqual(selected["format_id"], "720p")
        self.assertEqual(selected["vcodec"], "h264")


if __name__ == "__main__":
    unittest.main()
