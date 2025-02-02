import { DrawingConfig } from './DrawingConfig.js';
import { colorPalette } from './colorPalette.js';

export const drawings = {
    bouwkamp5: new DrawingConfig(
        [17, 403, 285, 148, 111, 144, 75, 36, 3, 141, 39, 58, 37, 53, 21, 16, 15, 99, 84, 79],
        { colorPalette }
    ),
    smallSquare: new DrawingConfig(
        [4, 100, 100, 50, 50, 25, 25],
        {
            paper: { width: 200, height: 200 },
            colorPalette
        }
    )
};
