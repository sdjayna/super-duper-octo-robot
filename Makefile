.PHONY: run install clean test

# Default Python interpreter
PYTHON=python3

# Install dependencies
install:
	$(PYTHON) -m pip install -r requirements.txt

# Run the server
run:
	PYTHONPATH=. $(PYTHON) server/server_runner.py

# Clean temporary files
clean:
	find . -type f -name "temp_*.svg" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Run tests (placeholder for future test implementation)
test:
	$(PYTHON) -m pytest

# Start development mode with auto-reload
dev: install run

# Show help
help:
	@echo "Available commands:"
	@echo "  make install  - Install Python dependencies"
	@echo "  make run      - Start the server"
	@echo "  make clean    - Remove temporary files and Python cache"
	@echo "  make test     - Run tests"
	@echo "  make dev      - Install dependencies and start server"
	@echo "  make help     - Show this help message"
