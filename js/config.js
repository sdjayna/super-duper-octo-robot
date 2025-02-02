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
        spacing: 3.0,     // Spacing between lines in mm
        strokeWidth: 2.5, // SVG stroke width
        vertexGap: 0.5    // Gap between shapes at vertices in mm
    },
    // Color palette for the visualization
    colorPalette: {
    amazonasLight: { hex: '#7a9b7a', name: 'Amazonas Light' },
    blueGreyDark: { hex: '#6e7172', name: 'Blue Grey Dark' },
    blueGreyLight: { hex: '#bdbcbb', name: 'Blue Grey Light' },
    blueVioletPastel: { hex: '#739ad1', name: 'Blue Violet Pastel' },
    burgundy: { hex: '#6a192c', name: 'Burgundy' },
    calypsoMiddle: { hex: '#74bd8b', name: 'Calypso Middle' },
    ceramicLightPastel: { hex: '#66b8eb', name: 'Ceramic Light Pastel' },
    coolGreyPastel: { hex: '#808a94', name: 'Cool Grey Pastel' },
    currant: { hex: '#56407e', name: 'Currant' },
    dareOrange: { hex: '#ee7620', name: 'DARE Orange' },
    fuchsiaPink: { hex: '#d36aa2', name: 'Fuchsia Pink' },
    futureGreen: { hex: '#004811', name: 'Future Green' },
    grasshopper: { hex: '#b1cc35', name: 'Grasshopper' },
    hazelnutBrown: { hex: '#391602', name: 'Hazelnut Brown' },
    kacao77Green: { hex: '#49ae41', name: 'KACAO77 Green' },
    lagoonBlue: { hex: '#009994', name: 'Lagoon Blue' },
    lagoBluePastel: { hex: '#81b5c0', name: 'Lago Blue Pastel' },
    lilacPastel: { hex: '#cca9d0', name: 'Lilac Pastel' },
    lobster: { hex: '#be3218', name: 'Lobster' },
    magenta: { hex: '#b71d5b', name: 'Magenta' },
    metallicBlack: { hex: '#000000', name: 'Metallic Black' },
    metallicBlue: { hex: '#148cc8', name: 'Metallic Blue' },
    metallicGold: { hex: '#a59253', name: 'Metallic Gold' },
    metallicLightGreen: { hex: '#6ea064', name: 'Metallic Light Green' },
    metallicPink: { hex: '#b446aa', name: 'Metallic Pink' },
    metallicSilver: { hex: '#bebebe', name: 'Metallic Silver' },
    misterGreen: { hex: '#00632e', name: 'MISTER Green' },
    natureWhite: { hex: '#faf4e3', name: 'Nature White' },
    neonGreenFluorescent: { hex: '#79f237', name: 'Neon Green Fluorescent' },
    neonOrangeFluorescent: { hex: '#ff6d1e', name: 'Neon Orange Fluorescent' },
    neonPink: { hex: '#eb5692', name: 'Neon Pink' },
    neonPinkFluorescent: { hex: '#ff32a6', name: 'Neon Pink Fluorescent' },
    neonYellowFluorescent: { hex: '#fffc00', name: 'Neon Yellow Fluorescent' },
    ocherBrownLight: { hex: '#d68307', name: 'Ocher Brown Light' },
    peachPastel: { hex: '#f9a97e', name: 'Peach Pastel' },
    petrol: { hex: '#004470', name: 'Petrol' },
    poisonGreen: { hex: '#dedd2e', name: 'Poison Green' },
    powderPastel: { hex: '#f8c1b8', name: 'Powder Pastel' },
    purpleViolet: { hex: '#74324a', name: 'Purple Violet' },
    saharaBeigePastel: { hex: '#fcc253', name: 'Sahara Beige Pastel' },
    shockBlue: { hex: '#0083ba', name: 'Shock Blue' },
    shockBlueMiddle: { hex: '#00a2e2', name: 'Shock Blue Middle' },
    signalBlack: { hex: '#000000', name: 'Signal Black' },
    signalWhite: { hex: '#ffffff', name: 'Signal White' },
    trafficRed: { hex: '#d51023', name: 'Traffic Red' },
    trueBlue: { hex: '#004b9a', name: 'True Blue' },
    turquoise: { hex: '#00794d', name: 'Turquoise' },
    vanillaPastel: { hex: '#ffeb91', name: 'Vanilla Pastel' },
    violetDark: { hex: '#1e1056', name: 'Violet Dark' },
    zincYellow: { hex: '#fff713', name: 'Zinc Yellow' }
  }
};

// Get array of hex values for backward compatibility
export const colorPaletteArray = Object.values(config.colorPalette).map(color => color.hex);
