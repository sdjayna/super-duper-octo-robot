import unittest

from server.server import PlotterHandler


class ProgressStreamHandlerTests(unittest.TestCase):
    def setUp(self):
        self.events = []
        PlotterHandler.last_progress_bar = None
        self.handler = PlotterHandler.__new__(PlotterHandler)

        def recorder(message, payload=None):
            self.events.append((message, payload))

        self.handler.send_progress_update = recorder

    def test_stdout_progress_bar_is_deduplicated(self):
        line = "Plot Progress:   3%|###       | 200/6530 [00:03<02:00, 50.0 mm/s]"
        self.handler._handle_plot_stdout_line(line)
        self.handler._handle_plot_stdout_line(line)
        self.assertEqual(len(self.events), 1)
        self.assertEqual(self.events[0][0], 'CLI_PROGRESS_BAR')
        self.assertIn('3%', self.events[0][1]['status'])

    def test_stderr_progress_bar_is_forwarded_once(self):
        line = "Plot Progress:   5%|#####     | 320/6530 [00:05<01:45, 55.0 mm/s]"
        self.handler._handle_plot_stderr_line(line)
        self.handler._handle_plot_stderr_line(line)
        self.assertEqual(len(self.events), 1)
        self.assertEqual(self.events[0][0], 'CLI_PROGRESS_BAR')
        self.assertIn('5%', self.events[0][1]['status'])

    def test_json_progress_event_passthrough(self):
        json_line = '{"progress_event": {"status": "Plot Progress", "progress": 0.42}}'
        self.handler._handle_plot_stdout_line(json_line)
        self.assertEqual(len(self.events), 1)
        message, payload = self.events[0]
        self.assertEqual(message, 'CLI_PROGRESS')
        self.assertAlmostEqual(payload.get('progress'), 0.42)


if __name__ == '__main__':
    unittest.main()
