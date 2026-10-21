// Reproductor de la música de la encuesta: programa las notas de score.js por adelantado y aplica la distorsión del nivel.

import { getContext } from './audio.js';
import { SCORE, distortionFor } from './score.js';

const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;
const STEPS = SCORE.bars.length * 8;

let playing = false;
let timer = null;
let step = 0;
let nextTime = 0;
let level = 0;
let master = null;
let filter = null;
let crusher = null;
let wobble = null;
let wobbleGain = null;

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

function crushCurve(bits) {
  if (!bits) return null;
  const steps = 2 ** bits / 2;
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

function pluck(ctx, midi, t, type, gain, dur, d) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq(midi);
  osc.detune.value = (Math.random() * 2 - 1) * d.detune;
  wobbleGain.connect(osc.detune);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(filter);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => { try { wobbleGain.disconnect(osc.detune); } catch { /* ya desconectado */ } };
}

function playStep(ctx, i, t) {
  const d = distortionFor(level);
  const bar = SCORE.bars[Math.floor(i / 8)];
  const e = i % 8;
  const note = bar.melody[e];
  if (note !== null && Math.random() >= d.dropout) {
    pluck(ctx, note, t, 'triangle', 0.22, 0.3, d);
    if (e === 0) pluck(ctx, note + 12, t, 'sine', 0.05, 0.5, d);
  }
  if (e % 4 === 0 && Math.random() >= d.dropout) pluck(ctx, bar.bass, t, 'sine', 0.3, 0.45, d);
  if ((e === 2 || e === 6) && Math.random() >= d.dropout) {
    for (const n of bar.chord) pluck(ctx, n, t, 'square', 0.03, 0.12, d);
  }
}

function schedule() {
  const ctx = getContext();
  if (!ctx || !playing) return;
  while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
    playStep(ctx, step, nextTime);
    nextTime += 60 / distortionFor(level).bpm / 2;
    step = (step + 1) % STEPS;
  }
}

export function startMusic() {
  const ctx = getContext();
  if (!ctx || playing) return;
  playing = true;
  master = ctx.createGain();
  master.gain.value = 0.5;
  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  crusher = ctx.createWaveShaper();
  wobble = ctx.createOscillator();
  wobble.frequency.value = 0.6;
  wobbleGain = ctx.createGain();
  wobble.connect(wobbleGain);
  wobble.start();
  filter.connect(crusher).connect(master).connect(ctx.destination);
  step = 0;
  nextTime = ctx.currentTime + 0.05;
  setMusicLevel(level);
  timer = setInterval(schedule, TICK_MS);
}

export function setMusicLevel(n) {
  level = n;
  const ctx = getContext();
  if (!ctx || !playing) return;
  const d = distortionFor(n);
  filter.frequency.setTargetAtTime(d.lowpass, ctx.currentTime, 0.3);
  wobbleGain.gain.setTargetAtTime(d.wobble, ctx.currentTime, 0.3);
  crusher.curve = crushCurve(d.bits);
}

// Corte seco: la música se calla de golpe.
export function stopMusic() {
  const ctx = getContext();
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  timer = null;
  const m = master, w = wobble;
  m.gain.setValueAtTime(0, ctx.currentTime);
  setTimeout(() => { m.disconnect(); w.stop(); }, 600);
  level = 0;
}
