from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from datetime import datetime
import psutil
import xml.dom.minidom
import pprint
import subprocess
import shlex
import threading
from plotter_config import PLOTTER_CONFIGS, CURRENT_PLOTTER

class PlotterHandler(SimpleHTTPRequestHandler):
    AXIDRAW_PATH = "./bin/axicli"  # Path to the AxiDraw executable
    current_plot_process = None  # Track the current plotting process

    def do_GET(self):
        if self.path == '/plot-progress':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            return
            
        # Handle favicon.ico requests
        if self.path == '/favicon.ico':
            self.send_response(200)
            self.send_header('Content-Type', 'image/x-icon')
            self.end_headers()
            try:
                with open('favicon.ico', 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                # If favicon.ico doesn't exist, return empty response
                self.wfile.write(b'')
            return
        
        # Handle all other GET requests as normal
        return SimpleHTTPRequestHandler.do_GET(self)

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
            
            # Create temp file for SVG if present
            temp_svg_path = None
            if 'svg' in params:
                try:
                    temp_svg_path = f'temp_{datetime.now().strftime("%Y%m%d_%H%M%S")}.svg'
                    with open(temp_svg_path, 'w', encoding='utf-8') as f:
                        f.write(params['svg'])
                except IOError as e:
                    print(f"Error writing temporary SVG file: {e}")
                    return {
                        'status': 'error',
                        'message': f'Failed to create temporary file: {str(e)}'
                    }
            
            def run_plot():
                try:
                    # Build command array with filename as first parameter after axicli
                    cmd = [self.AXIDRAW_PATH]
                    if temp_svg_path:
                        cmd.append(temp_svg_path)
                    cmd.extend([
                        '--mode', 'layers',
                        '--layer', str(params['layer']),
                        '--model', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['model']),
                        '--pen_pos_up', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['pen_pos_up']),
                        '--pen_pos_down', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['pen_pos_down']),
                        '--penlift', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['penlift']),
                        '--progress'
                    ])
                    
                    print(f"Executing command for layer number: {params.get('layer', '1')}")
                    print(f"Executing command for layer label: {params.get('layerLabel', 'unknown')}")
                    print(f"Executing: {' '.join(cmd)}")
                    
                    # Use Popen instead of run to get real-time output
                    process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        bufsize=1,
                        universal_newlines=True
                    )

                    # Store the process
                    PlotterHandler.current_plot_process = process

                    # Stream output in real-time
                    while True:
                        output = process.stdout.readline()
                        if output:
                            print(output.strip())
                            # Send progress update via SSE
                            self.send_progress_update(output.strip())
                
                        # Check if process has finished
                        if process.poll() is not None:
                            break
            
                    # Get final return code
                    if process.returncode != 0:
                        raise subprocess.CalledProcessError(process.returncode, cmd)
                    
                finally:
                    # Clear the process reference
                    PlotterHandler.current_plot_process = None
                    # Clean up temp file if it was created
                    if temp_svg_path:
                        try:
                            if os.path.exists(temp_svg_path):
                                os.remove(temp_svg_path)
                        except OSError as e:
                            print(f"Error removing temporary file {temp_svg_path}: {e}")

            # Start the plot in a separate thread
            plot_thread = threading.Thread(target=run_plot)
            plot_thread.daemon = True  # Make thread daemon so it doesn't block program exit
            plot_thread.start()
            
            return {
                'status': 'success',
                'message': 'Plot command started'
            }

        commands = {
            'plot': plot_command,
            'toggle': lambda _: [
                self.AXIDRAW_PATH,
                '--mode', 'toggle',
                '--model', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['model']),
                '--penlift', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['penlift'])
            ],
            'align': lambda _: [
                self.AXIDRAW_PATH,
                '--mode', 'align',
                '--model', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['model']),
                '--penlift', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['penlift'])
            ],
            'cycle': lambda _: [
                self.AXIDRAW_PATH,
                '--mode', 'cycle',
                '--model', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['model']),
                '--penlift', str(PLOTTER_CONFIGS[CURRENT_PLOTTER]['penlift'])
            ],
            'stop_plot': lambda _: None  # Special case handled below
        }
        
        if command not in commands:
            return {'status': 'error', 'message': f'Unknown command: {command}'}
            
        try:
            if command == 'stop_plot':
                print("\nExecuting stop_plot command...")
                if PlotterHandler.current_plot_process:
                    print(f"Found current plot process (PID: {PlotterHandler.current_plot_process.pid})")
                    # Terminate the current process
                    PlotterHandler.current_plot_process.terminate()
                    try:
                        print("Waiting for process to terminate...")
                        PlotterHandler.current_plot_process.wait(timeout=5)
                        print("Process terminated successfully")
                    except subprocess.TimeoutExpired:
                        print("Process did not terminate, attempting to kill...")
                        PlotterHandler.current_plot_process.kill()
                        print("Process killed")
                    PlotterHandler.current_plot_process = None
                    return {'status': 'success', 'message': 'Plot stopped'}
                else:
                    print("No current plot process found, searching for stray processes...")
                    # Also check for any stray axicli processes
                    found_stray = False
                    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                        if 'axicli' in str(proc.info.get('name', '')) or \
                           (proc.info.get('cmdline') and any('axicli' in str(cmd) for cmd in proc.info['cmdline'])):
                            print(f"Found stray axicli process (PID: {proc.pid})")
                            proc.terminate()
                            try:
                                print(f"Waiting for stray process {proc.pid} to terminate...")
                                proc.wait(timeout=5)
                                print(f"Stray process {proc.pid} terminated successfully")
                            except psutil.TimeoutExpired:
                                print(f"Stray process {proc.pid} did not terminate, attempting to kill...")
                                proc.kill()
                                print(f"Stray process {proc.pid} killed")
                            found_stray = True
                    if found_stray:
                        return {'status': 'success', 'message': 'Stray plot process stopped'}
                    print("No axicli processes found")
                    return {'status': 'success', 'message': 'No active plot to stop'}
            elif command == 'plot':
                return commands[command](params)
            else:
                # Handle non-plot commands
                cmd_array = commands[command](params)
                result = subprocess.run(
                    cmd_array,
                    capture_output=True,
                    text=True,
                    check=True
                )
                return {
                    'status': 'success',
                    'message': result.stdout.strip() or 'Command executed successfully'
                }
                    
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
                try:
                    # Create output directory and drawing-specific subdirectory
                    output_dir = os.path.join('output', data['name'])
                    try:
                        os.makedirs(output_dir, exist_ok=True)
                    except OSError as e:
                        print(f"Error creating output directory: {e}")
                        raise Exception(f"Failed to create output directory: {str(e)}")

                    # Generate filename with timestamp
                    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
                    filename = os.path.join(output_dir, f"{timestamp}.svg")
                    
                    try:
                        # Pretty print the SVG
                        dom = xml.dom.minidom.parseString(data['svg'])
                        pretty_svg = dom.toprettyxml(indent='  ')
                    except xml.parsers.expat.ExpatError as e:
                        print(f"Error parsing SVG data: {e}")
                        raise Exception(f"Invalid SVG data: {str(e)}")
                    
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
                    try:
                        with open(filename, 'w', encoding='utf-8') as f:
                            f.write(final_svg)
                    except IOError as e:
                        print(f"Error writing SVG file: {e}")
                        raise Exception(f"Failed to write SVG file: {str(e)}")
                    
                    # Send response
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'status': 'success',
                        'filename': filename
                    }).encode())
                except Exception as e:
                    print(f"Error handling save-svg: {e}")
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'status': 'error',
                        'message': str(e)
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
    
    def send_progress_update(self, message):
        if hasattr(self, 'wfile'):
            try:
                self.wfile.write(f"data: {json.dumps({'progress': message})}\n\n".encode())
                self.wfile.flush()
            except:
                pass

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
