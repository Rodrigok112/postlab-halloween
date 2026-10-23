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

// Cinta que se para: un acorde que cae hasta un zumbido grave y raro, con dos tonos casi iguales que baten.
export function tapeStop(seconds = 2) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(3200, t);
  lowpass.frequency.exponentialRampToValueAtTime(180, t + 1.1);
  const caida = ctx.createGain();
  caida.gain.setValueAtTime(0.22, t);
  caida.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  lowpass.connect(caida).connect(ctx.destination);
  for (const f of [220, 277, 330]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(22, t + 1.2);
    o.connect(lowpass);
    o.start(t);
    o.stop(t + 1.35);
  }

  const zumbido = ctx.createGain();
  zumbido.gain.setValueAtTime(0.0001, t + 0.7);
  zumbido.gain.exponentialRampToValueAtTime(0.45, t + 1.0);
  zumbido.gain.setValueAtTime(0.45, t + seconds - 0.25);
  zumbido.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  zumbido.connect(ctx.destination);
  for (const [f, type] of [[42, 'sine'], [44.5, 'sine'], [21, 'square']]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = type === 'square' ? 0.12 : 0.5;
    o.connect(g).connect(zumbido);
    o.start(t + 0.7);
    o.stop(t + seconds + 0.05);
  }
}

// Filtro de cada tipo de grito: detrás de la puerta, a medio camino, o encima de ti.
const FILTROS = { puerta: 650, medio: 2200, abierto: 6000 };

// El grito en bruto, para que el juego lo use en el coro del ente.
export function bufferGrito() {
  return ctx ? screamBuf() : null;
}

function screamBuf() {
  if (!screamBuffer) {
    const data = screamSamples(ctx.sampleRate, 1.6, createRng(1031));
    screamBuffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    screamBuffer.copyToChannel(data, 0);
  }
  return screamBuffer;
}

// Grito degradado. filtro: 'puerta' (apagado, del otro lado), 'medio' o 'abierto'.
export function scream(strength, filtro = 'puerta') {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = screamBuf();
  src.playbackRate.value = 0.8 + Math.random() * 0.35;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = FILTROS[filtro] ?? FILTROS.puerta;
  const gain = ctx.createGain();
  gain.gain.value = Math.max(0, Math.min(strength, 1)) * 0.5;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
}

// El grito de «QUIERO TU VIDA»: el más fuerte de todos. Tres gritos a la vez (grave, medio y agudo),
// saturados y sin filtro de puerta, encima de un golpe seco. volumen: pico del grito (0 a 1).
export function screamQTV(volumen = 0.9) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const saturar = ctx.createWaveShaper();
  const curva = new Float32Array(1024);
  for (let i = 0; i < curva.length; i++) {
    const x = (i / (curva.length - 1)) * 2 - 1;
    curva[i] = Math.tanh(x * 3);
  }
  saturar.curve = curva;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 7500;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(volumen, t + 0.03);
  master.gain.setValueAtTime(volumen, t + 1.6);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
  saturar.connect(filter).connect(master).connect(ctx.destination);
  for (const rate of [0.62, 0.86, 1.12]) {
    const src = ctx.createBufferSource();
    src.buffer = screamBuf();
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g).connect(saturar);
    src.start(t);
  }
  thump(Math.min(1, volumen / 0.9));
}
