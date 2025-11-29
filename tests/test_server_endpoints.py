import json
import os
import shutil
import tempfile
import threading
import time
import urllib.error
import urllib.request
from subprocess import CompletedProcess
from unittest import TestCase
from unittest.mock import patch

from server.server import create_server, PlotterHandler


class ServerEndpointTests(TestCase):
    @classmethod
    def setUpClass(cls):
        cls._original_output_root = PlotterHandler.OUTPUT_ROOT
        cls.temp_output = tempfile.mkdtemp(prefix='plotter-output-')
        PlotterHandler.OUTPUT_ROOT = cls.temp_output
        cls.httpd = create_server(host='127.0.0.1', port=0)
        cls.port = cls.httpd.server_address[1]
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        # Give the server a moment to boot
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.server_thread.join(timeout=2)
        PlotterHandler.OUTPUT_ROOT = cls._original_output_root
        shutil.rmtree(cls.temp_output, ignore_errors=True)

    def _base_url(self, path):
        return f'http://127.0.0.1:{self.port}{path}'

    def _post_json(self, path, payload, timeout=2):
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            self._base_url(path),
            data=data,
            method='POST',
            headers={'Content-Type': 'application/json'}
        )
        return urllib.request.urlopen(req, timeout=timeout)

    def test_plot_progress_stream_initial_heartbeat(self):
        with urllib.request.urlopen(self._base_url('/plot-progress'), timeout=2) as resp:
            first_line = resp.readline()
            # Heartbeat format is ":\n"
            self.assertIn(first_line.strip(), (b':', b''))

    @patch('server.server.subprocess.run')
    def test_plotter_align_endpoint(self, mock_run):
        mock_run.return_value = CompletedProcess(args=['mock'], returncode=0, stdout='ok', stderr='')
        payload = {
            'command': 'align',
            'pen_pos_up': 50,
            'pen_pos_down': 30
        }
        with self._post_json('/plotter', payload) as resp:
            body = json.loads(resp.read().decode('utf-8'))
        self.assertEqual(body['status'], 'success')
        mock_run.assert_called_once()

    def test_save_svg_creates_file(self):
        payload = {
            'name': 'integrationTest',
            'svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            'config': {'paper': {'id': 'test'}}
        }
        with self._post_json('/save-svg', payload) as resp:
            body = json.loads(resp.read().decode('utf-8'))
        self.assertEqual(body['status'], 'success')
        self.assertTrue(os.path.exists(body['filename']))

    def test_drawings_path_traversal_blocked(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(self._base_url('/drawings/../config/papers.json'), timeout=2)
        self.assertEqual(ctx.exception.code, 403)
