import os
import shutil
import tempfile
import unittest
from unittest.mock import patch, call

from server.server import PlotterHandler, PLOTTER_CONFIGS, CURRENT_PLOTTER


class TestResumeTracking(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='resume_test_')
        self.original_output_root = PlotterHandler.OUTPUT_ROOT
        PlotterHandler.OUTPUT_ROOT = self.temp_dir
        self.resume_file = os.path.join(self.temp_dir, PlotterHandler.RESUME_LOG_NAME)
        PlotterHandler.clear_resume_state(remove_file=False)

    def tearDown(self):
        PlotterHandler.OUTPUT_ROOT = self.original_output_root
        PlotterHandler.clear_resume_state(remove_file=False)
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_prepare_resume_file_overwrites_previous_log(self):
        with open(self.resume_file, 'w', encoding='utf-8') as handle:
            handle.write('old log')
        resolved_path = PlotterHandler.prepare_resume_file(self.resume_file)
        self.assertEqual(resolved_path, self.resume_file)
        self.assertFalse(os.path.exists(self.resume_file))

    def test_mark_resume_available_requires_existing_file(self):
        PlotterHandler.mark_resume_available(self.resume_file, layer=2, layer_label='Layer 2')
        status = PlotterHandler.get_resume_status()
        self.assertFalse(status['available'])
        with open(self.resume_file, 'w', encoding='utf-8') as handle:
            handle.write('resume data')
        PlotterHandler.mark_resume_available(self.resume_file, layer=3, layer_label='Blue Layer')
        status = PlotterHandler.get_resume_status(include_path=True)
        self.assertTrue(status['available'])
        self.assertEqual(status['layer'], 3)
        self.assertEqual(status['layerLabel'], 'Blue Layer')
        self.assertEqual(status['path'], self.resume_file)

    def test_clear_resume_state_removes_log(self):
        with open(self.resume_file, 'w', encoding='utf-8') as handle:
            handle.write('resume data')
        PlotterHandler.mark_resume_available(self.resume_file, layer=1)
        PlotterHandler.clear_resume_state()
        self.assertFalse(os.path.exists(self.resume_file))
        status = PlotterHandler.get_resume_status(include_path=True)
        self.assertFalse(status['available'])
        self.assertIsNone(status['layer'])
        self.assertIsNone(status['path'])

    def test_bootstrap_resume_state_detects_existing_file(self):
        with open(self.resume_file, 'w', encoding='utf-8') as handle:
            handle.write('resume data')
        PlotterHandler.bootstrap_resume_state()
        status = PlotterHandler.get_resume_status(include_path=True)
        self.assertTrue(status['available'])
        self.assertEqual(status['path'], self.resume_file)

    def test_handle_command_home_clears_resume_state(self):
        with open(self.resume_file, 'w', encoding='utf-8') as handle:
            handle.write('resume data')
        PlotterHandler.update_resume_state(
            path=self.resume_file,
            available=True,
            layer=7,
            layer_label='Test Layer'
        )
        handler = PlotterHandler.__new__(PlotterHandler)
        with patch.object(PlotterHandler, 'execute_home_sequence', return_value=None) as mock_home:
            response = handler.handle_command({
                'command': 'home',
                'pen_pos_up': 90,
                'pen_pos_down': 60
            })
        mock_home.assert_called_once_with(90)
        self.assertEqual(response['status'], 'success')
        self.assertFalse(os.path.exists(self.resume_file))
        status = PlotterHandler.get_resume_status(include_path=True)
        self.assertFalse(status['available'])
        self.assertIsNone(status['path'])


class TestHomeSequence(unittest.TestCase):
    def setUp(self):
        self.subprocess_patch = patch('server.server.subprocess.run')
        self.mock_run = self.subprocess_patch.start()
        self.mock_run.return_value = object()
        PlotterHandler.update_resume_state(path='dummy_resume.log', available=True)

    def tearDown(self):
        self.subprocess_patch.stop()
        PlotterHandler.clear_resume_state(remove_file=False)

    def test_execute_home_sequence_executes_commands_and_clears_resume(self):
        PlotterHandler.execute_home_sequence(95)
        expected_model = PLOTTER_CONFIGS[CURRENT_PLOTTER]['model']
        expected_penlift = PLOTTER_CONFIGS[CURRENT_PLOTTER]['penlift']
        expected_calls = [
            call([
                PlotterHandler.AXIDRAW_PATH,
                '--mode', 'manual',
                '--manual_cmd', 'raise_pen',
                '--model', str(expected_model),
                '--pen_pos_up', '95',
                '--penlift', str(expected_penlift)
            ], capture_output=True, text=True, check=True),
            call([
                PlotterHandler.AXIDRAW_PATH,
                '--mode', 'manual',
                '--manual_cmd', 'walk_home',
                '--model', str(expected_model),
                '--pen_pos_up', '95',
                '--penlift', str(expected_penlift)
            ], capture_output=True, text=True, check=True)
        ]
        self.assertEqual(self.mock_run.call_args_list, expected_calls)
        status = PlotterHandler.get_resume_status(include_path=True)
        self.assertFalse(status['available'])
        self.assertIsNone(status['path'])


if __name__ == '__main__':
    unittest.main()
