from http.server import SimpleHTTPRequestHandler
import json
import os
from ..services.command_service import CommandService
from ..services.svg_service import SVGService
from .sse_handler import SSEHandler

class PlotterHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.command_service = CommandService()
        self.svg_service = SVGService()
        self.sse_handler = SSEHandler()
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == '/':
            self.path = '/src/templates/plotter.html'
        if self.path == '/plot-progress':
            return self.sse_handler.handle_sse(self)
        if self.path.startswith('/css/'):
            return self.handle_css()
        if self.path == '/favicon.ico':
            return self.handle_favicon()
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            if self.path == '/save-svg':
                return self.svg_service.handle_save_svg(self, data)
            elif self.path == '/plotter':
                return self.command_service.handle_command(self, data)
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'Not Found')
        except Exception as e:
            self.send_error(500, str(e))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)
