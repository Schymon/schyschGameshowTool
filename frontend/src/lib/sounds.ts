let audioContext: AudioContext | null = null;

export function playBuzzerSound(volume: number = 0.25) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 880;
  oscillator.type = 'square';
  gainNode.gain.value = volume;
  
  oscillator.start();
  
  setTimeout(() => {
    oscillator.stop();
  }, 150);
}