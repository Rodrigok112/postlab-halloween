// Sonidos del juego: puerta que revienta, pasos y el coro del ente, que suena más fuerte cuanto más cerca está.

import { getContext, thump, bufferGrito } from '../audio.js';

function ruidoCorto(ctx, segundos, corte, volumen) {
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * segundos), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = corte;
  const g = ctx.createGain();
  g.gain.value = volumen;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

export function portazo() {
  const ctx = getContext();
  if (!ctx) return;
  thump(1);
  ruidoCorto(ctx, 0.35, 2400, 0.7);
}

export function paso() {
  const ctx = getContext();
  if (!ctx) return;
  ruidoCorto(ctx, 0.07, 420, 0.35);
}

// Coro de almas: varias copias del grito, graves y en bucle, más un zumbido. cercania: 0 (lejos) a 1 (encima).
export function crearCoro() {
  const ctx = getContext();
  if (!ctx) return { setCercania() {}, parar() {} };
  const master = ctx.createGain();
  master.gain.value = 0;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 900;
  filtro.connect(master).connect(ctx.destination);
  const fuentes = [0.48, 0.57, 0.66, 0.8].map((rate) => {
    const s = ctx.createBufferSource();
    s.buffer = bufferGrito();
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(filtro);
    s.start(ctx.currentTime + Math.random() * 0.4);
    return s;
  });
  const zumbido = ctx.createOscillator();
  zumbido.type = 'sawtooth';
  zumbido.frequency.value = 46;
  const gz = ctx.createGain();
  gz.gain.value = 0.25;
  zumbido.connect(gz).connect(filtro);
  zumbido.start();
  return {
    setCercania(c) {
      const k = Math.max(0, Math.min(c, 1));
      master.gain.setTargetAtTime(0.05 + 0.7 * k * k, ctx.currentTime, 0.15);
      filtro.frequency.setTargetAtTime(500 + 3000 * k, ctx.currentTime, 0.15);
    },
    parar() {
      master.gain.setValueAtTime(0, ctx.currentTime);
      setTimeout(() => { fuentes.forEach((s) => s.stop()); zumbido.stop(); master.disconnect(); }, 100);
    },
  };
}
