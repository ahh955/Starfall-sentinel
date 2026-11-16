// Every sound is synthesised live with the Web Audio API: short oscillator
// blips shaped by gain envelopes. No audio files, no network, nothing to load.
// The context is created lazily on the first user gesture, as browsers require.

import { makeRng } from './utils.js';

export function createAudio(seed = 7) {
  const audio = {
    rng: makeRng(seed),
    ctx: null,
    master: null,
    muted: false,
    lastShoot: 0,
  };
  return audio;
}

// Call from a click or key press. Safe to call repeatedly; it resumes a
// suspended context and does nothing when audio is unavailable.
export function unlockAudio(audio) {
  try {
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.35;
      audio.master.connect(audio.ctx.destination);
    }
    if (audio.ctx.state === 'suspended') void audio.ctx.resume();
  } catch {
    // Audio is a garnish: a browser without it still plays the game.
  }
}

function tone(audio, { type, from, to, start, length, volume }) {
  if (!audio.ctx || !audio.master || audio.muted) return;
  const now = audio.ctx.currentTime + (start || 0);
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + length);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(now);
  osc.stop(now + length + 0.05);
}

function noiseBurst(audio, { length, volume, lowpass }) {
  if (!audio.ctx || !audio.master || audio.muted) return;
  const now = audio.ctx.currentTime;
  const size = Math.max(1, Math.floor(audio.ctx.sampleRate * length));
  const buffer = audio.ctx.createBuffer(1, size, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i += 1) data[i] = (audio.rng.next() * 2 - 1) * (1 - i / size);
  const source = audio.ctx.createBufferSource();
  source.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start(now);
}

export function playShoot(audio) {
  // Throttle: at high fire rates the blips would pile up into a buzz.
  const now = performance.now();
  if (now - audio.lastShoot < 70) return;
  audio.lastShoot = now;
  tone(audio, { type: 'square', from: 880, to: 320, length: 0.09, volume: 0.16 });
}

export function playHit(audio) {
  tone(audio, { type: 'triangle', from: 420, to: 180, length: 0.07, volume: 0.22 });
}

export function playExplosion(audio, big) {
  noiseBurst(audio, { length: big ? 0.5 : 0.28, volume: big ? 0.5 : 0.32, lowpass: big ? 700 : 1100 });
  tone(audio, { type: 'sine', from: big ? 160 : 220, to: 40, length: big ? 0.45 : 0.25, volume: 0.4 });
}

export function playPickup(audio) {
  tone(audio, { type: 'sine', from: 980, to: 1560, length: 0.12, volume: 0.25 });
}

export function playUpgrade(audio) {
  tone(audio, { type: 'sine', from: 520, length: 0.12, volume: 0.25 });
  tone(audio, { type: 'sine', from: 660, length: 0.12, volume: 0.25, start: 0.09 });
  tone(audio, { type: 'sine', from: 880, length: 0.2, volume: 0.28, start: 0.18 });
}

export function playCoreHit(audio) {
  tone(audio, { type: 'sawtooth', from: 140, to: 55, length: 0.35, volume: 0.4 });
  noiseBurst(audio, { length: 0.3, volume: 0.3, lowpass: 500 });
}

export function playWaveStart(audio) {
  tone(audio, { type: 'sine', from: 440, length: 0.1, volume: 0.2 });
  tone(audio, { type: 'sine', from: 587, length: 0.16, volume: 0.2, start: 0.1 });
}

export function playGameOver(audio) {
  tone(audio, { type: 'triangle', from: 392, to: 370, length: 0.3, volume: 0.3 });
  tone(audio, { type: 'triangle', from: 311, to: 294, length: 0.3, volume: 0.3, start: 0.28 });
  tone(audio, { type: 'triangle', from: 233, to: 196, length: 0.6, volume: 0.32, start: 0.56 });
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
