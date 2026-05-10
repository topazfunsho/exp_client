/**
 * Sound notifications using the Web Audio API.
 * No external files — tones are generated programmatically.
 * Works on desktop and mobile browsers.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a single tone with smooth attack and decay.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.4,
  type: OscillatorType = 'sine'
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Smooth attack (10ms) then exponential decay
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/**
 * Signal alert — three ascending notes (C5 → E5 → G5).
 * Audible and pleasant on both speakers and phone speakers.
 */
export function playSignalAlert(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const t = ctx.currentTime;

  // C5 → E5 → G5  (major chord arpeggio — universally recognised as "alert")
  playTone(ctx, 523.25, t + 0.00, 0.18, 0.40); // C5
  playTone(ctx, 659.25, t + 0.18, 0.18, 0.40); // E5
  playTone(ctx, 783.99, t + 0.36, 0.28, 0.45); // G5 — held slightly longer

  // Subtle harmonic layer on the last note for richness
  playTone(ctx, 783.99 * 2, t + 0.36, 0.28, 0.08, 'triangle');
}

/**
 * Call this on the first user interaction (click / keydown / touchstart).
 * Browsers require a user gesture before AudioContext can play sound.
 */
export function unlockAudio(): void {
  getCtx();
}
