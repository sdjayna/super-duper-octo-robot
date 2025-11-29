.PHONY: install run clean test dev help lint typecheck format verify precommit hooks

VENV?=.venv
PYTHON=$(VENV)/bin/python3
PIP=$(VENV)/bin/pip

install: $(VENV)/bin/python3 node_modules
	npm run build:drawings

$(VENV)/bin/python3:
	python3 -m venv $(VENV) --without-scm-ignore-files
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	$(PIP) install "https://cdn.evilmadscientist.com/dl/ad/public/AxiDraw_API.zip"
	mkdir -p bin
	ln -sf ../$(VENV)/bin/axicli bin/axicli

node_modules: package.json
	npm install
	@touch node_modules

run: manifest
	PATH=$(VENV)/bin:$$PATH PYTHONPATH=. $(PYTHON) server/server_runner.py

clean:
	find . -type f -name "temp_*.svg" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf $(VENV) node_modules
	rm -rf bin include lib pyvenv.cfg 2>/dev/null || true

test:
	npm test

lint:
	npm run lint

typecheck:
	npm run typecheck

format:
	npm run format

verify: lint typecheck test

precommit: lint typecheck test

manifest:
	npm run build:drawings

dev: install
	@bash -c 'PATH=$(VENV)/bin:$$PATH; npm run watch:drawings & \
	WATCH_PID=$$!; \
	trap "kill $$WATCH_PID 2>/dev/null || true" EXIT; \
	PATH=$(VENV)/bin:$$PATH PYTHONPATH=. $(PYTHON) server/server_runner.py'

hooks:
	@echo "#!/usr/bin/env bash" > .git/hooks/pre-commit
	@echo "set -euo pipefail" >> .git/hooks/pre-commit
	@echo "make precommit" >> .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit

help:
	@echo "Available commands:"
	@echo "  make install  - Create the Python venv and install npm deps"
	@echo "  make run      - Start the development server"
	@echo "  make clean    - Remove build artifacts (venv, node_modules, temp files)"
	@echo "  make test     - Run the Vitest suite"
	@echo "  make lint     - Run ESLint + node --check"
	@echo "  make typecheck- Run the TypeScript checker over shared modules"
	@echo "  make format   - Format JS modules with Prettier"
	@echo "  make verify   - Run lint + typecheck + test in sequence"
	@echo "  make hooks    - Install the pre-commit hook (runs make precommit)"
	@echo "  make dev      - Install dependencies and start the server"
	@echo "  make help     - Show this help message"
