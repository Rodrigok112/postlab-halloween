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

// Golpe que abre el boquete: el golpe grave de siempre más madera que cruje y se astilla.
export function astillazo() {
  const ctx = getContext();
  if (!ctx) return;
  thump(1);
  ruidoCorto(ctx, 0.5, 3200, 0.8);
  setTimeout(() => ruidoCorto(ctx, 0.25, 1600, 0.4), 90);
}

// Voz del ente al hablar: un zumbido grave y sucio por letra, como en DDLC pero roto.
export function voz() {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(70 + Math.random() * 25, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.08);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(f).connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.1);
  ruidoCorto(ctx, 0.05, 900, 0.15);
}

// Patas del segundo monstruo contra el suelo: chasquidos rápidos en bucle. cercania: 0 a 1.
export function crearArrastre() {
  const ctx = getContext();
  if (!ctx) return { setCercania() {}, parar() {} };
  const seg = 0.36;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seg), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let k = 0; k < 6; k++) {
    const ini = Math.floor((k / 6 + Math.random() * 0.04) * d.length);
    for (let i = 0; i < 300 && ini + i < d.length; i++) d[ini + i] += (Math.random() * 2 - 1) * (1 - i / 300);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start();
  return {
    setCercania(c) {
      const k = Math.max(0, Math.min(c, 1));
      g.gain.setTargetAtTime(0.9 * k * k, ctx.currentTime, 0.1);
    },
    parar() {
      g.gain.setValueAtTime(0, ctx.currentTime);
      setTimeout(() => { src.stop(); g.disconnect(); }, 100);
    },
  };
}

// Ruido de fondo grave y continuo: el zumbido de una habitación en silencio. volumen(k) de 0 a 1.
function bucleRuido(ctx, corte, tipo = 'lowpass') {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < d.length; i++) { ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = ultimo * 3.5; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = corte;
  src.connect(f);
  src.start();
  return { src, salida: f };
}

export function crearFondo() {
  const ctx = getContext();
  if (!ctx) return { volumen() {}, parar() {} };
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(ctx.destination);
  const { src, salida } = bucleRuido(ctx, 220);
  salida.connect(g);
  const red = ctx.createOscillator();
  red.frequency.value = 50;
  const gr = ctx.createGain();
  gr.gain.value = 0.25;
  red.connect(gr).connect(g);
  red.start();
  return {
    volumen(k) { g.gain.setTargetAtTime(0.12 * Math.max(0, Math.min(k, 1)), ctx.currentTime, 0.3); },
    parar() { g.gain.setValueAtTime(0, ctx.currentTime); setTimeout(() => { src.stop(); red.stop(); g.disconnect(); }, 100); },
  };
}

// Zumbido de fluorescentes de los backrooms: un zumbido eléctrico a 120 Hz con armónicos y algo de siseo.
export function crearZumbido() {
  const ctx = getContext();
  if (!ctx) return { volumen() {}, parar() {} };
  const g = ctx.createGain();
  g.gain.value = 0;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 700;
  f.Q.value = 0.7;
  f.connect(g).connect(ctx.destination);
  const oscs = [[120, 'sawtooth', 0.5], [240, 'square', 0.15], [360, 'sawtooth', 0.1]].map(([fr, tipo, v]) => {
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.value = fr;
    const go = ctx.createGain();
    go.gain.value = v;
    o.connect(go).connect(f);
    o.start();
    return o;
  });
  const { src, salida } = bucleRuido(ctx, 3000, 'highpass');
  const gs = ctx.createGain();
  gs.gain.value = 0.15;
  salida.connect(gs).connect(f);
  return {
    volumen(k) { g.gain.setTargetAtTime(0.06 * Math.max(0, Math.min(k, 1)), ctx.currentTime, 0.1); },
    parar() { g.gain.setValueAtTime(0, ctx.currentTime); setTimeout(() => { oscs.forEach((o) => o.stop()); src.stop(); g.disconnect(); }, 100); },
  };
}

// Paso metálico del ente: un golpe grave y un chasquido de metal. cerca de 0 (lejos) a 1 (encima).
export function pasoMetal(cerca = 0.5) {
  const ctx = getContext();
  if (!ctx) return;
  const k = 0.25 + 0.75 * Math.max(0, Math.min(cerca, 1));
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * k, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.2);
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2600;
  f.Q.value = 6;
  const gm = ctx.createGain();
  gm.gain.value = 0.9 * k;
  src.connect(f).connect(gm).connect(ctx.destination);
  src.start(t);
}

// Chirrido de máquina en un fotograma de glitch: un pitido agudo y roto que salta de tono.
export function chirrido() {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(1500 + Math.random() * 2000, t);
  o.frequency.setValueAtTime(600 + Math.random() * 3000, t + 0.03);
  o.frequency.setValueAtTime(2000 + Math.random() * 2000, t + 0.055);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.07, t);
  g.gain.setValueAtTime(0.0001, t + 0.08);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.09);
}

// Golpe contra la puerta cerrada: golpe grave y madera que cruje.
export function golpePuerta(fuerza = 1) {
  const ctx = getContext();
  if (!ctx) return;
  thump(fuerza);
  ruidoCorto(ctx, 0.2, 1800, 0.45 * fuerza);
}

// «Te encontré»: un grave enorme que sube de la nada, se sostiene y se apaga, distorsionado.
export function encontrado() {
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const saturar = ctx.createWaveShaper();
  const curva = new Float32Array(512);
  for (let i = 0; i < curva.length; i++) { const x = (i / 511) * 2 - 1; curva[i] = Math.tanh(x * 4); }
  saturar.curve = curva;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(300, t);
  f.frequency.linearRampToValueAtTime(700, t + 0.6);
  f.frequency.linearRampToValueAtTime(250, t + 2.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.5);
  g.gain.setValueAtTime(0.7, t + 1.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
  saturar.connect(f).connect(g).connect(ctx.destination);
  for (const [fr, tipo] of [[38, 'sawtooth'], [41.5, 'sawtooth'], [29, 'sine'], [57, 'square']]) {
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(fr * 1.06, t);
    o.frequency.exponentialRampToValueAtTime(fr * 0.94, t + 2.8);
    const go = ctx.createGain();
    go.gain.value = tipo === 'square' ? 0.15 : 0.35;
    o.connect(go).connect(saturar);
    o.start(t);
    o.stop(t + 2.9);
  }
}
