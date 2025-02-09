.PHONY: install run clean test help

# Default Python interpreter
PYTHON=python3

# Install dependencies
install:
	$(PYTHON) -m venv . --without-scm-ignore-files
	. ./bin/activate && pip install --upgrade pip
	. ./bin/activate && pip install -r requirements.txt
	. ./bin/activate && pip install "https://cdn.evilmadscientist.com/dl/ad/public/AxiDraw_API.zip"

# Run the server
run:
	. ./bin/activate && PYTHONPATH=. $(PYTHON) server/server_runner.py

# Clean temporary files and virtual environment
clean:
	find . -type f -name "temp_*.svg" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf bin/ include/ lib/ pyvenv.cfg

# Run tests (placeholder for future test implementation)
test:
	. ./bin/activate && $(PYTHON) -m pytest

# Start development mode with auto-reload
dev: install run

# Show help
help:
	@echo "Available commands:"
	@echo "  make install  - Create virtualenv and install dependencies"
	@echo "  make run      - Start the development server"
	@echo "  make clean    - Remove temporary files and virtualenv"
	@echo "  make test     - Run tests"
	@echo "  make dev      - Install dependencies and start server"
	@echo "  make help     - Show this help message"
