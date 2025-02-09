import sys
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import os
import signal

class ServerRestartHandler(FileSystemEventHandler):
    def __init__(self):
        self.server_process = None
        self.start_server()

    def start_server(self):
        if self.server_process:
            print("\n🛑 Stopping previous server instance...")
            # Send SIGTERM to process group
            os.killpg(os.getpgid(self.server_process.pid), signal.SIGTERM)
            try:
                self.server_process.wait(timeout=5)  # Wait up to 5 seconds
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't shut down gracefully
                os.killpg(os.getpgid(self.server_process.pid), signal.SIGKILL)
            
        print("\n🔄 Starting server...")
        # Start new process in its own process group
        self.server_process = subprocess.Popen(
            [sys.executable, 'server.py'],
            preexec_fn=os.setsid
        )

    def on_modified(self, event):
        if event.src_path.endswith('.py'):
            print(f"\n📝 Detected change in {os.path.basename(event.src_path)}")
            self.start_server()

if __name__ == "__main__":
    event_handler = ServerRestartHandler()
    observer = Observer()
    observer.schedule(event_handler, path='.', recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Shutting down server and watcher...")
        if event_handler.server_process:
            os.killpg(os.getpgid(event_handler.server_process.pid), signal.SIGTERM)
            try:
                event_handler.server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(event_handler.server_process.pid), signal.SIGKILL)
        observer.stop()
    observer.join()
