/**
 * Color palette configuration for the visualization
 * Loads colors from medium_config.json
 */

// Function to convert medium colors to palette format
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

// Load medium config and create palettes
let colorPalettes = {};
let colorPalette = {};

async function loadColorPalettes() {
    try {
        const response = await fetch('/shared/medium_config.json');
        const config = await response.json();
        
        // Create palettes for each medium
        Object.entries(config.mediums).forEach(([id, medium]) => {
            const paletteName = `${id}Palette`;
            colorPalettes[paletteName] = convertMediumColors(medium, id);
        });
        
        // Set default palette
        colorPalette = colorPalettes[`${config.default}Palette`];
        
        return colorPalettes;
    } catch (error) {
        console.error('Error loading color palettes:', error);
        return {};
    }
}

// Initialize palettes
await loadColorPalettes();

export { colorPalettes, colorPalette };
export const colorPaletteArray = Object.values(colorPalette).map(color => color.hex);
