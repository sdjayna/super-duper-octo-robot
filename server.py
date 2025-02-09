from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from datetime import datetime
import xml.dom.minidom
import pprint
import subprocess
import shlex

class PlotterHandler(SimpleHTTPRequestHandler):
    AXIDRAW_PATH = "./bin/axicli"  # Path to the AxiDraw executable

    def handle_command(self, command_data):
        """Handle plotter commands by executing AxiDraw CLI commands"""
        command = command_data.get('command')
        # Use all data except 'command' as params
        params = {k: v for k, v in command_data.items() if k != 'command'}
        
        # Dictionary mapping commands to their CLI parameters
        def plot_command(params):
            if 'layer' not in params:
                print("Error: No layer specified in plot command")
                raise ValueError("No layer specified in plot command")
            return [
                self.AXIDRAW_PATH,
                '--mode', 'layers',
                '--layer', str(params['layer'])
            ]

        commands = {
            'plot': plot_command,
            'toggle': lambda _: [
                self.AXIDRAW_PATH,
                '--mode', 'toggle'
            ],
            'align': lambda _: [
                self.AXIDRAW_PATH,
                '--mode', 'align'
            ],
            'cycle': lambda _: [
                self.AXIDRAW_PATH,
                '--mode', 'cycle'
            ]
        }
        
        if command not in commands:
            return {'status': 'error', 'message': f'Unknown command: {command}'}
            
        try:
            # Get the command array for this command
            cmd_array = commands[command](params)
            
            # If this is a plot command and we have SVG data, save it to a temp file
            if command == 'plot' and 'svg' in params:
                temp_svg_path = f'temp_{datetime.now().strftime("%Y%m%d_%H%M%S")}.svg'
                with open(temp_svg_path, 'w') as f:
                    f.write(params['svg'])
                cmd_array.extend(['--file', temp_svg_path])
            
            # Execute the command
            print(f"Executing command for layer number: {params.get('layer', '1')}")
            print(f"Executing command for layer label: {params.get('layerLabel', 'unknown')}")
            print(f"Executing: {' '.join(cmd_array)}")  # Debug log
            result = subprocess.run(
                cmd_array,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Clean up temp file if it was created
            if command == 'plot' and 'svg' in params:
                os.remove(temp_svg_path)
            
            # Check if the command was successful
            if result.returncode == 0:
                return {
                    'status': 'success',
                    'message': result.stdout.strip() or 'Command executed successfully'
                }
            else:
                raise subprocess.CalledProcessError(
                    result.returncode,
                    cmd_array,
                    result.stdout,
                    result.stderr
                )
                
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else str(e)
            return {
                'status': 'error',
                'message': f'Command failed: {error_msg}'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Error executing command: {str(e)}'
            }
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
            
            # Add this debug print
            print(f"\nReceived command data:")
            print(json.dumps(data, indent=2))

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
            elif self.path == '/plotter':
                # Handle plotter commands
                response = self.handle_command(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
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

def create_server():
    try:
        server_address = ('', 8000)
        httpd = HTTPServer(server_address, PlotterHandler)
        print('🚀 Server running on http://localhost:8000')
        return httpd
    except Exception as e:
        print(f"❌ Error creating server: {e}")
        raise

if __name__ == '__main__':
    try:
        httpd = create_server()
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n👋 Server shutting down...')
        httpd.server_close()
    except Exception as e:
        print(f"❌ Server error: {e}")
