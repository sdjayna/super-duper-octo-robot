"""Paper configuration shared between client and server."""
import json
import os

# Load shared paper configuration
config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'shared', 'paper_config.json')
with open(config_path) as f:
    paper_config = json.load(f)

# Current paper configuration
CURRENT_PAPER = paper_config['A3']
