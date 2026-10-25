/**
 * Real-time procedural audio synthesizer for economic simulation events.
 * Uses the Web Audio API with zero external audio assets or network requests.
 */

let audioCtx: AudioContext | null = null;
let muted = true; // Default muted for accessibility; user toggles on with button

function getContext(): AudioContext | null {
 if (typeof window === 'undefined') return null;
 if (!audioCtx) {
  const AudioContextClass = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
  if (AudioContextClass) {
   audioCtx = new AudioContextClass();
  }
 }
 if (audioCtx && audioCtx.state === 'suspended') {
  void audioCtx.resume();
 }
 return audioCtx;
}

export function isAudioMuted(): boolean {
 return muted;
}

export function toggleAudioMute(): boolean {
 muted = !muted;
 if (!muted) {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
  // Play subtle confirmation chime
  playSalaryChime();
 }
 return muted;
}

export function playSalaryChime() {
 if (muted) return;
 const ctx = getContext();
 if (!ctx) return;

 const now = ctx.currentTime;
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();

 osc.type = 'sine';
 osc.frequency.setValueAtTime(587.33, now); // D5
 osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

 gain.gain.setValueAtTime(0.06, now);
 gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

 osc.connect(gain);
 gain.connect(ctx.destination);

 osc.start(now);
 osc.stop(now + 0.35);
}

export function playCreditSound() {
 if (muted) return;
 const ctx = getContext();
 if (!ctx) return;

 const now = ctx.currentTime;
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();

 osc.type = 'triangle';
 osc.frequency.setValueAtTime(440, now);
 osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18); // E5

 gain.gain.setValueAtTime(0.07, now);
 gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

 osc.connect(gain);
 gain.connect(ctx.destination);

 osc.start(now);
 osc.stop(now + 0.4);
}

export function playCrisisShockRumble() {
 if (muted) return;
 const ctx = getContext();
 if (!ctx) return;

 const now = ctx.currentTime;
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();

 osc.type = 'sawtooth';
 osc.frequency.setValueAtTime(110, now);
 osc.frequency.exponentialRampToValueAtTime(35, now + 0.6);

 gain.gain.setValueAtTime(0.12, now);
 gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

 osc.connect(gain);
 gain.connect(ctx.destination);

 osc.start(now);
 osc.stop(now + 0.7);
}

export function playRescueHarmonic() {
 if (muted) return;
 const ctx = getContext();
 if (!ctx) return;

 const now = ctx.currentTime;
 const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

 freqs.forEach((freq, idx) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now + idx * 0.04);

  gain.gain.setValueAtTime(0.04, now + idx * 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + idx * 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now + idx * 0.04);
  osc.stop(now + 0.65 + idx * 0.04);
 });
}
