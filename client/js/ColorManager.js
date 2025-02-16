import { areRectanglesAdjacent } from './utils/geometryUtils.js';

export class ColorManager {
    constructor(palette) {
        this.palette = palette;
        this.placedRectangles = [];
        this.colorUsage = new Map(Object.values(palette).map(color => [color.hex, 0]));
        this.recentColors = [];
        this.maxRecentColors = 3;
    }

    getValidColor(newRect) {
        const colorScores = Object.values(this.palette)
            .map(color => ({
                color: color.hex,
                score: this.getColorScore(color.hex, newRect)
            }))
            .filter(({score}) => score !== -Infinity)
            .sort((a, b) => a.score - b.score);

        const selectedColor = colorScores[0]?.color || this.getLeastUsedColor();
        this.updateTracking(selectedColor, newRect);
        return selectedColor;
    }

    getColorScore(color, newRect) {
        const isAdjacent = this.placedRectangles.some(placed => 
            areRectanglesAdjacent(newRect, placed.rect) && placed.color === color);
        if (isAdjacent) {
            return -Infinity;
        }
        return this.colorUsage.get(color) * 2 + 
               (this.recentColors.includes(color) ? 1 : 0);
    }

    getLeastUsedColor() {
        return Array.from(this.colorUsage.entries())
            .sort(([, a], [, b]) => a - b)[0][0];
    }

    updateTracking(color, rect) {
        this.colorUsage.set(color, this.colorUsage.get(color) + 1);
        this.recentColors.unshift(color);
        if (this.recentColors.length > this.maxRecentColors) {
            this.recentColors.pop();
        }
        this.placedRectangles.push({ rect, color });
    }
}
