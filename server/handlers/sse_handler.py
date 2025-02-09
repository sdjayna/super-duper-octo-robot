import json
import time

class SSEHandler:
    sse_connections = set()
    keep_sse_alive = True

    def handle_sse(self, handler):
        handler.send_response(200)
        handler.send_header('Content-Type', 'text/event-stream')
        handler.send_header('Cache-Control', 'no-cache')
        handler.send_header('Connection', 'keep-alive')
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.end_headers()
        
        self.sse_connections.add(handler)
        try:
            while self.keep_sse_alive:
                try:
                    handler.wfile.write(b':\n\n')
                    handler.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    break
                time.sleep(0.1)
        except (BrokenPipeError, ConnectionResetError):
            print("Client disconnected from SSE")
        finally:
            self.sse_connections.remove(handler)

    def send_progress_update(self, message):
        data = f"data: {json.dumps({'progress': message})}\n\n".encode('utf-8')
        disconnected = set()
        for connection in self.sse_connections:
            try:
                connection.wfile.write(data)
                connection.wfile.flush()
            except Exception as e:
                print(f"Error sending progress update to client: {e}")
                disconnected.add(connection)
        
        self.sse_connections.difference_update(disconnected)
