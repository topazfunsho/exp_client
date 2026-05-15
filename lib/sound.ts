/**
 * Sound notifications using real audio files from /public.
 *
 * Primary:     /notification-1.mp3
 * Alternative: /sound-1.mp3
 *
 * Volume is controlled externally via setVolume().
 */

let volume = 1.0; // 100% — maximum volume
let audio: HTMLAudioElement | null = null;

/**
 * Pre-load the notification audio element so it plays instantly.
 * Called once on mount.
 */
function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio('/notification-1.mp3');
    audio.preload = 'auto';
  }
  audio.volume = Math.max(0, Math.min(1, volume));
  return audio;
}

/**
 * Set playback volume (0.0 – 1.0).
 */
export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = volume;
}

export function getVolume(): number {
  return volume;
}

/**
 * Play the signal alert sound.
 * Rewinds to the start so rapid calls always play from the beginning.
 */
export function playSignalAlert(): void {
  const a = getAudio();
  if (!a) return;
  a.currentTime = 0;
  a.volume = Math.max(0, Math.min(1, volume));
  a.play().catch(() => {
    // Autoplay blocked — user hasn't interacted yet, silently ignore
  });
}

/**
 * Preload audio and unlock playback on first user interaction.
 * Call this once on mount.
 */
export function unlockAudio(): void {
  getAudio(); // creates and preloads the element
}
