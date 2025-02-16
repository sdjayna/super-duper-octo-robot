# A3 paper dimensions in mm
PAPER_DIMENSIONS = {
    'A3': {
        'width': 297,
        'height': 420,
        'margin': 10  # Minimum safe margin from paper edge
    }
}

# Configuration for different plotter models
PLOTTER_CONFIGS = {
    'AxiDraw SE/A3': {
        'model': 2,   # Model number for AxiDraw SE/A3
        'pen_pos_up': 90,    # Pen up position (0-100)
        'pen_pos_down': 10,   # Pen down position (0-100)
        'penlift': 3,    # Narrow-band brushless servo (3rd position up)
        'paper': PAPER_DIMENSIONS['A3']  # Maximum paper dimensions
    }
}

# Current plotter model configuration to use
CURRENT_PLOTTER = 'AxiDraw SE/A3'
