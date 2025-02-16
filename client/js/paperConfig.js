export async function loadPaperConfig() {
    try {
        const response = await fetch('/shared/paper_config.json');
        const config = await response.json();
        return {
            papers: config.papers,
            default: config.papers[config.default]
        };
    } catch (error) {
        console.error('Error loading paper config:', error);
        return null;
    }
}
