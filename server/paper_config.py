"""Paper configuration shared between client and server."""
import json
import os

def load_paper_config():
    """Load paper configuration from shared JSON file."""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'shared', 'paper_config.json')
    with open(config_path) as f:
        config = json.load(f)
        return config['papers'][config['default']]

# Current paper configuration
CURRENT_PAPER = load_paper_config()
