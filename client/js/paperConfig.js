// A3 paper dimensions in mm
let PAPER_SIZES = {};
let DEFAULT_PAPER = null;

// Fetch paper config
fetch('/shared/paper_config.json')
    .then(response => response.json())
    .then(paperConfig => {
        PAPER_SIZES = {
            A3: paperConfig.A3
        };
        DEFAULT_PAPER = PAPER_SIZES.A3;
    })
    .catch(error => console.error('Error loading paper config:', error));

export { PAPER_SIZES, DEFAULT_PAPER };
