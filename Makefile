.PHONY: install run clean test dev help

VENV?=.venv
PYTHON=$(VENV)/bin/python3
PIP=$(VENV)/bin/pip

install: $(VENV)/bin/python3 node_modules

$(VENV)/bin/python3:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	$(PIP) install "https://cdn.evilmadscientist.com/dl/ad/public/AxiDraw_API.zip"

node_modules: package.json
	npm install
	@touch node_modules

run:
	PYTHONPATH=. $(PYTHON) server/server_runner.py

clean:
	find . -type f -name "temp_*.svg" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf $(VENV) node_modules
	rm -rf bin include lib pyvenv.cfg 2>/dev/null || true

test:
	npm test

dev: install run

help:
	@echo "Available commands:"
	@echo "  make install  - Create the Python venv and install npm deps"
	@echo "  make run      - Start the development server"
	@echo "  make clean    - Remove build artifacts (venv, node_modules, temp files)"
	@echo "  make test     - Run the Vitest suite"
	@echo "  make dev      - Install dependencies and start the server"
	@echo "  make help     - Show this help message"
