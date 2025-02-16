# Server Commands Documentation

This document describes the commands that can be sent to the plotter server (server.py).

## Command Format

All commands are sent as POST requests to `http://localhost:8000/plotter` with a JSON body containing:
- `command`: The name of the command to execute
- Additional parameters specific to each command

## Available Commands

### Plot Command
Plots a specific layer of an SVG drawing.

```json
{
    "command": "plot",
    "svg": "<svg>...</svg>",
    "layer": "1",
    "layerLabel": "Black-0.5mm",
    "pen_pos_up": 90,
    "pen_pos_down": 10
}
```

### Stop Plot
Stops the current plotting operation. Automatically raises the pen after stopping.

```json
{
    "command": "stop_plot"
}
```

### Raise Pen
Raises the pen to the up position.

```json
{
    "command": "raise_pen",
    "pen_pos_up": 90
}
```

### Toggle
Toggles the pen between up and down positions.

```json
{
    "command": "toggle",
    "pen_pos_up": 90,
    "pen_pos_down": 10
}
```

### Align
Aligns the plotter head.

```json
{
    "command": "align",
    "pen_pos_up": 90,
    "pen_pos_down": 10
}
```

### Cycle
Cycles the pen through its positions.

```json
{
    "command": "cycle",
    "pen_pos_up": 90,
    "pen_pos_down": 10
}
```

### Home
Returns the plotter to its home position.

```json
{
    "command": "home",
    "pen_pos_up": 90,
    "pen_pos_down": 10
}
```

### Disable Motors
Disables the stepper motors.

```json
{
    "command": "disable_motors"
}
```

## Response Format

All commands return a JSON response with:
- `status`: Either 'success' or 'error'
- `message`: Description of the result or error

Example success:
```json
{
    "status": "success",
    "message": "Command executed successfully"
}
```

Example error:
```json
{
    "status": "error",
    "message": "Error executing command: Invalid parameter"
}
```

## Progress Updates

For long-running commands (like plot), progress updates are sent via Server-Sent Events (SSE) to `http://localhost:8000/plot-progress`.

Special progress messages:
- `PLOT_COMPLETE`: Indicates successful plot completion
- `PLOT_ERROR`: Indicates plot failure
