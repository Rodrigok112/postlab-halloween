// Audio sintetizado con WebAudio: contexto compartido, golpes de puerta y gritos.

import { screamSamples } from './scream.js';
import { createRng } from './glitch.js';

let ctx = null;
let noise = null;
let screamBuffer = null;

// Un WAV de silencio (0,5 s, 8 kHz, 8 bits) en data URI, para el truco de iOS de abajo.
function wavSilencio() {
  const n = 4000;
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const txt = (o, t) => [...t].forEach((ch, i) => { b[o + i] = ch.charCodeAt(0); });
  txt(0, 'RIFF'); v.setUint32(4, 36 + n, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  txt(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  let bin = '';
  b.forEach((x) => { bin += String.fromCharCode(x); });
  return `data:audio/wav;base64,${btoa(bin)}`;
}

// iPhone (28/10): con el interruptor de silencio puesto, Safari deja mudo el audio web. Se le dice que esto es
// «reproducción» (como un vídeo): con navigator.audioSession en iOS 17 o superior y, antes, con un audio
// silencioso en bucle, que pasa la página a ese modo. Además, iOS suspende el audio al cambiar de app o bloquear
// la pantalla: se reanuda con el siguiente toque.
let silencio = null;
function modoReproduccion() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch { /* no lo soporta */ }
  if (silencio || navigator.audioSession) return;
  silencio = document.createElement('audio');
  silencio.src = wavSilencio();
  silencio.loop = true;
  silencio.setAttribute('playsinline', '');
  silencio.play()?.catch(() => { silencio = null; });
}
const reanudar = () => { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume(); };

// Hay que llamarla dentro del manejador de un toque: los navegadores móviles no dejan sonar nada antes.
export function unlockAudio() {
  modoReproduccion();
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // Algunas versiones de iOS solo sueltan el audio si suena algo dentro del mismo toque: un sonido vacío.
    const vacio = ctx.createBufferSource();
    vacio.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    vacio.connect(ctx.destination);
    vacio.start(0);
    for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, reanudar, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reanudar(); });
  }
  reanudar();
}

export function getContext() {
  return ctx;
}

// Para grabar los sonidos del vídeo: mientras tanto todo suena en otro contexto (un OfflineAudioContext).
// Devuelve la función que deja el de antes.
export function grabarEn(otro) {
  const antes = [ctx, noise, screamBuffer];
  ctx = otro;
  screamBuffer = null;
  noise = otro.createBuffer(1, Math.floor(otro.sampleRate * 0.5), otro.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return () => { [ctx, noise, screamBuffer] = antes; };
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
