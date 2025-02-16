from paper_config import CURRENT_PAPER

# Configuration for different plotter models
PLOTTER_CONFIGS = {
    'AxiDraw SE/A3': {
        'model': 2,   # Model number for AxiDraw SE/A3
        'penlift': 3,    # Narrow-band brushless servo (3rd position up)
        'paper': CURRENT_PAPER  # Maximum paper dimensions
    }
}

# Current plotter model configuration to use
CURRENT_PLOTTER = 'AxiDraw SE/A3'
