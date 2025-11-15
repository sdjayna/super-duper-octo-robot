"""Plotter configuration shared between client and server."""

import json
import os


def load_plotter_config():
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'plotters.json')
    with open(config_path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


_CONFIG = load_plotter_config()
PLOTTER_CONFIGS = _CONFIG['plotters']
CURRENT_PLOTTER = _CONFIG['default']
