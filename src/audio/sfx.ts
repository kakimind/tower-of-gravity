// All sound in this game is synthesized with the Web Audio API at runtime —
// no audio asset files to download, license, or ship. Each function below
// schedules a handful of oscillators/noise bursts with a short gain
// envelope; keep new sounds in that same "a few notes, under half a
// second" shape so they read as game feedback rather than music.

let ctx: AudioContext | null = null;

const MUTE_KEY = 'towerGravitySfxMuted';
function loadMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
let muted = loadMuted();

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Chrome/WebView only allow an AudioContext to start inside the call stack
// of an actual user gesture. Phaser's own pointer events usually preserve
// that, but to be safe, grab the very first touch/click on the page —
// before Phaser even sees it — and unlock audio right there. Playing a
// silent, zero-length buffer is the standard trick to fully "wake" the
// context on iOS/Android WebViews, not just resume() it.
let unlocked = false;
export function unlockAudioOnFirstGesture(): void {
  if (typeof document === 'undefined' || unlocked) return;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    const c = getCtx();
    if (c) {
      const buffer = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.connect(c.destination);
      src.start(0);
    }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('click', unlock);
  };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });
}

export function setSfxMuted(value: boolean): void {
  muted = value;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

export function isSfxMuted(): boolean {
  return muted;
}

function tone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; peak?: number; delay?: number; glideTo?: number } = {},
): void {
  const c = getCtx();
  if (!c || muted) return;
  const { type = 'sine', peak = 0.18, delay = 0, glideTo } = opts;
  const start = c.currentTime + delay;

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + Math.min(0.015, duration * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst(
  duration: number,
  opts: { peak?: number; delay?: number; filterFrom?: number; filterTo?: number } = {},
): void {
  const c = getCtx();
  if (!c || muted) return;
  const { peak = 0.16, delay = 0, filterFrom = 2200, filterTo = 300 } = opts;
  const start = c.currentTime + delay;

  const bufferSize = Math.ceil(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFrom, start);
  filter.frequency.exponentialRampToValueAtTime(filterTo, start + duration);

  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  src.connect(filter).connect(gain).connect(c.destination);
  src.start(start);
  src.stop(start + duration + 0.02);
}

// One real recorded clip (Pixabay, "magical reveal start" by freesound_gamestudio,
// Content License — free for commercial use, no attribution required) for the
// single moment that calls for more than a synthesized blip: the stage-start
// fanfare. Everything else in this file stays synthesized so the rest of the
// game needs no audio assets at all.
const clips = new Map<string, HTMLAudioElement>();
function playClip(src: string, volume = 0.7): void {
  if (muted) return;
  let audio = clips.get(src);
  if (!audio) {
    audio = new Audio(src);
    clips.set(src, audio);
  }
  audio.currentTime = 0;
  audio.volume = volume;
  void audio.play().catch(() => {
    // Autoplay can still be blocked on some WebViews even after the unlock
    // gesture; failing silently is preferable to an unhandled rejection.
  });
}

// --- game feedback -------------------------------------------------------

export function playTap(): void {
  tone(760, 0.05, { type: 'sine', peak: 0.1 });
}

export function playSwap(): void {
  tone(420, 0.07, { type: 'triangle', peak: 0.14, glideTo: 560 });
}

export function playInvalidSwap(): void {
  tone(300, 0.09, { type: 'square', peak: 0.08 });
  tone(220, 0.1, { type: 'square', peak: 0.07, delay: 0.07 });
}

const MATCH_CHORD = [523.25, 659.25, 783.99, 987.77]; // C5 E5 G5 B5 — brighter per combo step

export function playMatch(comboMultiplier = 1): void {
  const notes = MATCH_CHORD.slice(0, Math.min(MATCH_CHORD.length, 1 + comboMultiplier));
  notes.forEach((f, i) => {
    tone(f, 0.16, { type: 'triangle', peak: 0.1, delay: i * 0.035 });
  });
}

export function playGameStart(): void {
  playClip('/audio/game-start.mp3', 0.2);
}

export function playSpecialPromote(): void {
  tone(880, 0.09, { type: 'sine', peak: 0.12 });
  tone(1318.5, 0.14, { type: 'sine', peak: 0.1, delay: 0.06 });
}

export function playSpecialActivate(): void {
  noiseBurst(0.22, { peak: 0.14, filterFrom: 3200, filterTo: 400 });
  tone(200, 0.2, { type: 'sine', peak: 0.16, glideTo: 90 });
}

export function playGravityFlip(): void {
  noiseBurst(0.35, { peak: 0.12, filterFrom: 1800, filterTo: 150 });
  tone(140, 0.3, { type: 'sine', peak: 0.14, glideTo: 60, delay: 0.05 });
}

export function playStageClear(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, 0.22, { type: 'triangle', peak: 0.14, delay: i * 0.1 });
  });
}

export function playOutOfMoves(): void {
  [392, 349.23, 311.13].forEach((f, i) => {
    tone(f, 0.26, { type: 'sawtooth', peak: 0.08, delay: i * 0.12 });
  });
}

export function playReward(): void {
  [987.77, 1318.5, 1567.98].forEach((f, i) => {
    tone(f, 0.12, { type: 'sine', peak: 0.1, delay: i * 0.05 });
  });
}

export function playHeartGain(): void {
  tone(660, 0.1, { type: 'sine', peak: 0.12, glideTo: 880 });
}
