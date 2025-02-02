/**
 * Configuration settings for the Bouwkamp code visualization
 */
export const config = {
    // Paper size in millimeters (A3)
    paper: {
        width: 420,
        height: 297
    },
    // Line drawing parameters
    line: {
        width: 0.30,      // Width of serpentine line in mm
        spacing: 1.25,    // Spacing between lines in mm
        strokeWidth: .45  // SVG stroke width
    }
};

export const colorPalette = {
    zincYellow: { hex: '#fff713', name: 'Zinc Yellow' },
    saharaBeige: { hex: '#fcc253', name: 'Sahara Beige Pastel' },
    lobster: { hex: '#be3218', name: 'Lobster' },
    trafficRed: { hex: '#d51023', name: 'Traffic Red' },
    lagoBlue: { hex: '#81b5c0', name: 'Lago Blue Pastel' },
    petrol: { hex: '#004470', name: 'Petrol' },
    currant: { hex: '#56407e', name: 'Currant' },
    violetDark: { hex: '#1e1056', name: 'Violet Dark' },
    dareOrange: { hex: '#ee7620', name: 'DARE Orange' },
    burgundy: { hex: '#6a192c', name: 'Burgundy' },
    hazelnutBrown: { hex: '#391602', name: 'Hazelnut Brown' },
    misterGreen: { hex: '#00632e', name: 'MISTER Green' },
    vanillaPastel: { hex: '#ffeb91', name: 'Vanilla Pastel' },
    peachPastel: { hex: '#f9a97e', name: 'Peach Pastel' },
    futureGreen: { hex: '#004811', name: 'Future Green' },
    signalWhite: { hex: '#ffffff', name: 'Signal White' },
    shockBlueMiddle: { hex: '#00a2e2', name: 'Shock Blue Middle' },
    signalBlack: { hex: '#000000', name: 'Signal Black' },
    neonPink: { hex: '#eb5692', name: 'Neon Pink' },
    lilacPastel: { hex: '#cca9d0', name: 'Lilac Pastel' }
};

// Get array of hex values for backward compatibility
export const colorPaletteArray = Object.values(colorPalette).map(color => color.hex);
