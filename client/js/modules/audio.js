let isMuted = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export function playCompletionSiren() {
    if (isMuted) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);

    const duration = 3.0;
    const steps = 6;
    const stepTime = duration / steps;

    for (let i = 0; i < steps; i++) {
        const freq = i % 2 === 0 ? 440 : 880;
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + (i * stepTime));
    }

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

export function toggleMute() {
    isMuted = !isMuted;
    return isMuted;
}

export function setMuted(value) {
    isMuted = Boolean(value);
}

export function getMuteState() {
    return isMuted;
}
