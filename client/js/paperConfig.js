export async function loadPaperConfig() {
    try {
        const response = await fetch(`/config/papers.json?v=${Date.now()}`);
        const config = await response.json();
return {
            papers: config.papers,
            default: config.default
        };
    } catch (error) {
        console.error('Error loading paper config:', error);
        return null;
    }
}
