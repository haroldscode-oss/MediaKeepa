import sys
import tempfile
import types
import unittest
from fractions import Fraction
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class _FakeImage:
    @classmethod
    def from_registry(cls, *_args, **_kwargs):
        return cls()

    def __getattr__(self, _name):
        return lambda *_args, **_kwargs: self


class _FakeApp:
    def __init__(self, *_args, **_kwargs):
        pass

    def function(self, *_args, **_kwargs):
        return lambda function: function


fake_modal = types.SimpleNamespace(
    Image=_FakeImage,
    App=_FakeApp,
    Volume=types.SimpleNamespace(from_name=lambda *_args, **_kwargs: object()),
    Secret=types.SimpleNamespace(from_name=lambda *_args, **_kwargs: object()),
    Retries=lambda *_args, **_kwargs: object(),
)
previous_modal = sys.modules.get("modal")
sys.modules["modal"] = fake_modal
try:
    import modal_video_enhancer as worker  # noqa: E402
finally:
    if previous_modal is None:
        sys.modules.pop("modal", None)
    else:
        sys.modules["modal"] = previous_modal


class ModalVideoEnhancerTests(unittest.TestCase):
    def test_temporal_windows_cover_every_frame_exactly_once(self) -> None:
        windows = worker._temporal_windows(759, 81)

        self.assertGreater(len(windows), 1)
        expected_start = 0
        for window in windows:
            kept_start = window.input_start + window.keep_start
            kept_end = window.input_start + window.keep_end
            self.assertEqual(kept_start, expected_start)
            self.assertLessEqual(window.input_end - window.input_start, 81)
            self.assertGreater(window.keep_end, window.keep_start)
            expected_start = kept_end
        self.assertEqual(expected_start, 759)

    def test_temporal_plan_scales_with_pixels_and_available_gpu_memory(self) -> None:
        self.assertEqual(worker._temporal_window_size(1920, 1080, 140), 97)
        self.assertEqual(worker._temporal_window_size(2400, 2160, 140), 65)
        self.assertEqual(worker._temporal_window_size(3840, 2160, 140), 33)
        self.assertLess(
            worker._temporal_window_size(2400, 2160, 80),
            worker._temporal_window_size(2400, 2160, 140),
        )

    def test_oom_retry_sizes_reach_four_gpu_minimum(self) -> None:
        self.assertEqual(worker._temporal_window_sizes(81), [81, 65, 49, 33, 17])

    def test_retry_sizes_skip_equivalent_official_padding(self) -> None:
        self.assertEqual(worker._official_padded_frame_count(20), 33)
        self.assertEqual(worker._temporal_retry_sizes(20, 97), [97, 17])
        self.assertEqual(worker._temporal_retry_sizes(100, 97), [97, 65, 49, 33, 17])

    def test_minimum_windows_still_cover_every_frame_once(self) -> None:
        windows = worker._temporal_windows(100, 17)

        expected_start = 0
        for window in windows:
            self.assertEqual(window.input_start + window.keep_start, expected_start)
            self.assertLessEqual(window.input_end - window.input_start, 17)
            expected_start = window.input_start + window.keep_end
        self.assertEqual(expected_start, 100)

    def test_short_video_stays_in_one_official_pass(self) -> None:
        self.assertEqual(
            worker._temporal_windows(33, 49),
            [worker._TemporalWindow(0, 33, 0, 33)],
        )

    def test_edge_context_does_not_create_a_tiny_tail_window(self) -> None:
        windows = worker._temporal_windows(100, 81)

        self.assertEqual(len(windows), 2)
        self.assertEqual(
            [window.keep_end - window.keep_start for window in windows],
            [50, 50],
        )

    def test_oom_error_reports_the_actual_failure(self) -> None:
        detail = worker._failure_detail(
            "torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 4.95 GiB"
        )
        self.assertIn("CUDA ran out of memory", detail)

    def test_cuda_oom_detection_handles_torch_exception_name(self) -> None:
        self.assertTrue(
            worker._is_cuda_oom("torch.OutOfMemoryError: allocation on device 0 failed")
        )

    def test_restore_replans_with_smaller_windows_after_oom(self) -> None:
        info = worker._VideoInfo(width=720, height=1280, frame_count=100, fps=Fraction(30, 1))
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source.mp4"
            source.touch()
            expected = root / "successful.mp4"
            with (
                mock.patch.object(worker, "_probe_video", return_value=info),
                mock.patch.object(worker, "_available_gpu_memory_gib", return_value=140.0),
                mock.patch.object(
                    worker,
                    "_restore_temporal_attempt",
                    side_effect=[worker._OfficialInferenceOOM("oom"), expected],
                ) as restore_attempt,
            ):
                restored = worker._restore_video_in_temporal_windows(source, root, 720, 1280)

        self.assertEqual(restored, expected)
        self.assertEqual(
            [call.args[-1] for call in restore_attempt.call_args_list],
            [97, 65],
        )

    def test_restore_reports_exhaustion_only_after_smallest_distinct_load(self) -> None:
        info = worker._VideoInfo(width=720, height=1280, frame_count=20, fps=Fraction(30, 1))
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source.mp4"
            source.touch()
            with (
                mock.patch.object(worker, "_probe_video", return_value=info),
                mock.patch.object(worker, "_available_gpu_memory_gib", return_value=140.0),
                mock.patch.object(
                    worker,
                    "_restore_temporal_attempt",
                    side_effect=worker._OfficialInferenceOOM("oom"),
                ) as restore_attempt,
            ):
                with self.assertRaisesRegex(RuntimeError, "17 padded frames"):
                    worker._restore_video_in_temporal_windows(source, root, 720, 1280)

        self.assertEqual(
            [call.args[-1] for call in restore_attempt.call_args_list],
            [97, 17],
        )

    def test_runtime_error_is_preferred_over_torchrun_separator(self) -> None:
        detail = worker._failure_detail(
            "RuntimeError: kernel size cannot exceed input\n"
            "============================================================\n"
        )
        self.assertEqual(detail, "RuntimeError: kernel size cannot exceed input")


if __name__ == "__main__":
    unittest.main()
