/**
 * Color utilities for managing palettes and color assignments
 */

import { areRectanglesAdjacent } from './geometryUtils.js';

// Load medium config and create palettes
let colorPalettes = {};
let colorPalette = {};
let mediumMetadata = {};

async function loadColorPalettes() {
    try {
        const response = await fetch('/shared/medium_config.json');
        const config = await response.json();
        
        // Create palettes for each medium
        Object.entries(config.mediums).forEach(([id, medium]) => {
            const paletteName = `${id}Palette`;
            colorPalettes[paletteName] = convertMediumColors(medium, id);
            mediumMetadata[id] = {
                ...medium,
                paletteName
            };
        });
        
        // Set default palette
        colorPalette = colorPalettes[`${config.default}Palette`];
        
        return colorPalettes;
    } catch (error) {
        console.error('Error loading color palettes:', error);
        return {};
    }
}

function convertMediumColors(mediumConfig, mediumId) {
    const colors = {};
    Object.entries(mediumConfig.colors).forEach(([key, color]) => {
        colors[key] = {
            hex: color.hex,
            name: color.name,
            pen: mediumConfig.name
        };
    });
    return colors;
}

class ColorManager {
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

// Initialize palettes
await loadColorPalettes();

export { ColorManager, colorPalettes, colorPalette, mediumMetadata };
export const colorPaletteArray = Object.values(colorPalette).map(color => color.hex);
