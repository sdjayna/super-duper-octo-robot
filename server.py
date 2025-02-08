from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from datetime import datetime
import xml.dom.minidom
import pprint

class PlotterHandler(SimpleHTTPRequestHandler):
    def handle_command(self, command_data):
        """Handle plotter commands and return appropriate responses"""
        command = command_data.get('command')
        params = command_data.get('params', {})
        
        # Dictionary of supported commands and their responses
        commands = {
            'status': lambda: {'status': 'ready', 'battery': '100%'},
            'home': lambda: {'status': 'success', 'message': 'Plotter homed successfully'},
            'calibrate': lambda: {'status': 'success', 'message': 'Calibration complete'},
            'test': lambda: {'status': 'success', 'message': 'Test pattern completed'}
        }
        
        if command in commands:
            return commands[command]()
        else:
            return {'status': 'error', 'message': f'Unknown command: {command}'}
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            if self.path == '/save-svg':
                
                # Create output directory and drawing-specific subdirectory
                output_dir = os.path.join('output', data['name'])
                os.makedirs(output_dir, exist_ok=True)
                
                # Generate filename with timestamp
                timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
                filename = os.path.join(output_dir, f"{timestamp}.svg")
                
                # Pretty print the SVG
                dom = xml.dom.minidom.parseString(data['svg'])
                pretty_svg = dom.toprettyxml(indent='  ')
                
                # Add configuration as comment at the top
                config_comment = f"""<!--
Generated by Plotter Art Generator
Date: {datetime.now().isoformat()}
Drawing: {data['name']}
Configuration:
{pprint.pformat(data.get('config', {}), indent=2)}
-->
"""
                final_svg = config_comment + pretty_svg
                
                # Write the SVG file
                with open(filename, 'w') as f:
                    f.write(final_svg)
                
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
            elif self.path == '/command':
                # Handle plotter commands
                response = self.handle_command(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
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
