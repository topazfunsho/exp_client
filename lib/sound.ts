/**
 * Sound notifications using the Web Audio API.
 * No external files needed — tones are generated programmatically.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Resume if suspended (browsers suspend until user interaction)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a short ascending two-tone chime — used for new signal alerts.
 * Sounds like a soft "ding-ding" notification.
 */
export function playSignalAlert(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Two notes: C5 then E5 — pleasant ascending chime
  const notes = [
    { freq: 523.25, start: 0,    duration: 0.18 },  // C5
    { freq: 659.25, start: 0.20, duration: 0.25 },  // E5
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc    = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);

    // Soft attack, quick decay
    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(0.35, now + start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });
}

/**
 * Unlock the AudioContext on first user interaction.
 * Call this once on any click/keydown in the app.
 */
export function unlockAudio(): void {
  getCtx();
}
