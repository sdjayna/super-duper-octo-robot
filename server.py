from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from datetime import datetime

class PlotterHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            if self.path == '/save-svg':
                # Read the POST data
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                # Create output directory and drawing-specific subdirectory
                output_dir = os.path.join('output', data['name'])
                os.makedirs(output_dir, exist_ok=True)
                
                # Generate filename with timestamp
                timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
                filename = os.path.join(output_dir, f"{timestamp}.svg")
                
                # Write the SVG file
                with open(filename, 'w') as f:
                    f.write(data['svg'])
                
                # Send response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'success',
                    'filename': filename
                }).encode())
            else:
                # Handle non-matching paths with 404
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'Not Found')
        except Exception as e:
            print(f"Error handling POST: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, PlotterHandler)
    print('Server running on port 8000...')
    httpd.serve_forever()
