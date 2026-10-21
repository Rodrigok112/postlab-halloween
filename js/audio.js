// Audio sintetizado con WebAudio: contexto compartido, golpes de puerta y gritos.

import { screamSamples } from './scream.js';
import { createRng } from './glitch.js';

let ctx = null;
let noise = null;
let screamBuffer = null;

// Hay que llamarla dentro del manejador de un toque: los navegadores móviles no dejan sonar nada antes.
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function getContext() {
  return ctx;
}

// Golpe grave de puerta. strength de 0 a 1.
export function thump(strength) {
  if (!ctx) return;
  const s = Math.max(0, Math.min(strength, 1));
  const t = ctx.currentTime;

  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(62, t);
  body.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.0001, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.25 + 0.65 * s, t + 0.008);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  body.connect(bodyGain).connect(ctx.destination);
  body.start(t);
  body.stop(t + 0.6);

  const hit = ctx.createBufferSource();
  hit.buffer = noise;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 220 + 700 * s;
  const hitGain = ctx.createGain();
  hitGain.gain.setValueAtTime(0.0001, t);
  hitGain.gain.exponentialRampToValueAtTime(0.15 + 0.5 * s, t + 0.004);
  hitGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  hit.connect(lowpass).connect(hitGain).connect(ctx.destination);
  hit.start(t);
  hit.stop(t + 0.3);
}

// Grito degradado. muffled: filtrado como si viniera del otro lado de la puerta.
export function scream(strength, muffled = true) {
  if (!ctx) return;
  if (!screamBuffer) {
    const data = screamSamples(ctx.sampleRate, 1.6, createRng(1031));
    screamBuffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    screamBuffer.copyToChannel(data, 0);
  }
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = screamBuffer;
  src.playbackRate.value = 0.8 + Math.random() * 0.35;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = muffled ? 650 : 5000;
  const gain = ctx.createGain();
  gain.gain.value = Math.max(0, Math.min(strength, 1)) * (muffled ? 0.55 : 0.4);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
}
