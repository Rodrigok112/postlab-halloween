// Sonidos de ambiente para el vídeo (27/10): un ordenador viejo que se enciende y el zumbido del ordenador ya
// encendido, en bucle. Se sintetizan sin altavoces (OfflineAudioContext) y luego se «pasan por una PS1»: la mitad
// de frecuencia de muestreo (22 kHz, se nota en los agudos) y 10 bits, con algo de ruido de fondo.

import { screamSamples } from './scream.js';
import { createRng } from './glitch.js';

const SR = 44100;

function ruido(ctx, segundos) {
  const b = ctx.createBuffer(1, Math.ceil(SR * segundos), SR);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = b;
  return s;
}

function filtro(ctx, tipo, f, q = 0.7) {
  const n = ctx.createBiquadFilter();
  n.type = tipo;
  n.frequency.value = f;
  n.Q.value = q;
  return n;
}

function ganancia(ctx, v = 1) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function tono(ctx, tipo, f) {
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.value = f;
  return o;
}

// El ordenador ya encendido: ventilador (ruido grave), zumbido de red a 50 Hz, el pitido agudo del CRT y el disco
// duro girando. dur: hasta cuándo suena; desde: cuándo empieza (con su arranque si arranque es true).
function maquina(ctx, salida, desde, dur, arranque) {
  const fin = desde + dur;
  // Ventilador.
  const vent = ruido(ctx, dur);
  const fv = filtro(ctx, 'lowpass', arranque ? 150 : 650, 0.9);
  const gv = ganancia(ctx, 0);
  vent.connect(fv).connect(gv).connect(salida);
  if (arranque) {
    fv.frequency.setValueAtTime(150, desde);
    fv.frequency.exponentialRampToValueAtTime(650, desde + 1.8);
    gv.gain.setValueAtTime(0, desde);
    gv.gain.linearRampToValueAtTime(0.22, desde + 1.5);
  } else gv.gain.value = 0.22;
  vent.start(desde);
  // Zumbido de red y su armónico.
  for (const [f, v] of [[50, 0.05], [100, 0.035], [150, 0.012]]) {
    const o = tono(ctx, 'sawtooth', f);
    const g = ganancia(ctx, v);
    o.connect(filtro(ctx, 'lowpass', 400)).connect(g).connect(salida);
    o.start(desde);
    o.stop(fin);
  }
  // El pitido del CRT (el de 15,7 kHz no cabe a 22 kHz: queda en 9,6 kHz, más molesto todavía).
  const pit = tono(ctx, 'sine', 9600);
  const gp = ganancia(ctx, 0);
  pit.connect(gp).connect(salida);
  gp.gain.setValueAtTime(0, desde);
  gp.gain.linearRampToValueAtTime(0.012, desde + (arranque ? 0.6 : 0.01));
  pit.start(desde);
  pit.stop(fin);
  // Disco duro: un silbido que sube al arrancar y se queda girando.
  const hdd = tono(ctx, 'triangle', arranque ? 60 : 420);
  const gh = ganancia(ctx, 0);
  hdd.connect(filtro(ctx, 'bandpass', 600, 2)).connect(gh).connect(salida);
  if (arranque) {
    hdd.frequency.setValueAtTime(60, desde + 0.5);
    hdd.frequency.exponentialRampToValueAtTime(420, desde + 3.2);
    gh.gain.setValueAtTime(0, desde + 0.5);
    gh.gain.linearRampToValueAtTime(0.05, desde + 2.0);
    gh.gain.linearRampToValueAtTime(0.025, desde + 3.5);
  } else gh.gain.value = 0.025;
  hdd.start(desde);
  hdd.stop(fin);
}

// Clic seco del cabezal del disco duro.
function clicDisco(ctx, salida, t, v = 0.35) {
  const n = ruido(ctx, 0.02);
  const g = ganancia(ctx, 0);
  n.connect(filtro(ctx, 'bandpass', 2600, 3)).connect(g).connect(salida);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
  n.start(t);
}

// El encendido, unos 6 s: interruptor, «bwooom» del CRT al desmagnetizar, arranque del ventilador y del disco,
// clics del disco buscando y el pitido de la BIOS.
function encendido(ctx, salida) {
  // Interruptor: clac agudo y golpe grave.
  const clac = ruido(ctx, 0.03);
  const gc = ganancia(ctx, 0);
  clac.connect(filtro(ctx, 'highpass', 1800)).connect(gc).connect(salida);
  gc.gain.setValueAtTime(0.7, 0.02);
  gc.gain.exponentialRampToValueAtTime(0.001, 0.045);
  clac.start(0.02);
  const golpe = tono(ctx, 'sine', 90);
  const gg = ganancia(ctx, 0);
  golpe.connect(gg).connect(salida);
  golpe.frequency.setValueAtTime(110, 0.02);
  golpe.frequency.exponentialRampToValueAtTime(45, 0.12);
  gg.gain.setValueAtTime(0.6, 0.02);
  gg.gain.exponentialRampToValueAtTime(0.001, 0.15);
  golpe.start(0.02);
  golpe.stop(0.2);
  // Desmagnetizado del CRT: zumbido gordo a 50 Hz que vibra y se apaga en un segundo.
  const bw = tono(ctx, 'sawtooth', 50);
  const bwSat = ctx.createWaveShaper();
  const curva = new Float32Array(256);
  for (let i = 0; i < 256; i++) curva[i] = Math.tanh(((i / 255) * 2 - 1) * 4);
  bwSat.curve = curva;
  const gb = ganancia(ctx, 0);
  const trem = tono(ctx, 'sine', 13);
  const gt = ganancia(ctx, 0.25);
  trem.connect(gt).connect(gb.gain);
  bw.connect(bwSat).connect(filtro(ctx, 'lowpass', 900)).connect(gb).connect(salida);
  gb.gain.setValueAtTime(0, 0.08);
  gb.gain.linearRampToValueAtTime(0.4, 0.12);
  gb.gain.exponentialRampToValueAtTime(0.001, 1.4);
  bw.start(0.08);
  bw.stop(1.5);
  trem.start(0.08);
  trem.stop(1.5);
  // Ventilador, red, pitido y disco arrancando.
  maquina(ctx, salida, 0.15, 5.85, true);
  // El disco busca.
  for (const t of [2.1, 2.25, 2.3, 2.6, 2.95, 3.0, 3.1, 3.6, 4.2, 4.25]) clicDisco(ctx, salida, t);
  // Pitido de la BIOS: todo bien.
  const bip = tono(ctx, 'square', 1000);
  const gbip = ganancia(ctx, 0);
  bip.connect(filtro(ctx, 'lowpass', 3000)).connect(gbip).connect(salida);
  gbip.gain.setValueAtTime(0.12, 3.8);
  gbip.gain.setValueAtTime(0, 4.0);
  bip.start(3.8);
  bip.stop(4.05);
  // Al final se apaga todo despacio (para que no corte en seco; el bucle sigue desde aquí).
  salida.gain.setValueAtTime(1, 5.4);
  salida.gain.linearRampToValueAtTime(0, 6.0);
}

// Pasa la señal por una PS1: muestras de dos en dos (22 kHz), 10 bits y un poco de siseo.
function ps1(datos) {
  const out = new Float32Array(datos.length);
  const niveles = 512;
  for (let i = 0; i < datos.length; i += 2) {
    const m = (datos[i] + (datos[i + 1] ?? datos[i])) / 2 + (Math.random() - 0.5) * 0.002;
    const q = Math.round(Math.max(-1, Math.min(1, m)) * niveles) / niveles;
    out[i] = q;
    if (i + 1 < out.length) out[i + 1] = q;
  }
  return out;
}

// Normaliza al pico indicado.
function normalizar(datos, pico = 0.85) {
  let max = 0;
  for (const v of datos) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < datos.length; i++) datos[i] *= pico / max;
  return datos;
}

async function render(segundos, fn) {
  const ctx = new OfflineAudioContext(1, Math.ceil(SR * segundos), SR);
  const salida = ganancia(ctx, 1);
  salida.connect(ctx.destination);
  fn(ctx, salida);
  return (await ctx.startRendering()).getChannelData(0);
}

// Encendido del ordenador (6 s).
export async function sonidoEncendido() {
  return normalizar(ps1(await render(6, encendido)));
}

// El ordenador encendido, en bucle (20 s): se renderizan 21 s y el último segundo se funde con el primero, para
// que al repetir no se note el salto.
export async function sonidoAmbiente() {
  const LARGO = 20;
  const datos = await render(LARGO + 1, (ctx, salida) => {
    maquina(ctx, salida, 0, LARGO + 1, false);
    let t = 0.7;
    while (t < LARGO) {
      if (Math.random() < 0.6) clicDisco(ctx, salida, t, 0.18);
      t += 0.6 + Math.random() * 2.4;
    }
  });
  const n = SR * LARGO;
  const f = SR;
  const out = new Float32Array(n);
  out.set(datos.subarray(0, n));
  for (let i = 0; i < f; i++) {
    const k = i / f;
    out[i] = datos[n + i] * (1 - k) + datos[i] * k;
  }
  return normalizar(ps1(out), 0.6);
}

// Música de ambiente en crescendo (27/10), sacada de la referencia de voz de la persona responsable (9,4 s): doce
// golpes graves («bum») sobre Do, sueltos al principio y en parejas al final, como un latido. Encima, un dron de
// Do y Sol que se va abriendo y subiendo, un racimo agudo disonante (Do–Do#) que entra a la mitad y un barrido de
// ruido en los últimos dos segundos; corta en seco al final.
const GOLPES = [
  [0.6, 48], [1.45, 48], [2.7, 48], [3.1, 47], [3.9, 50], [4.6, 48],
  [5.7, 48], [6.05, 48], [6.75, 48], [7.35, 48], [8.2, 48], [8.55, 48],
];
export const MUSICA_S = 9.4;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function reverb(ctx, segundos = 2.2) {
  const n = Math.ceil(SR * segundos);
  const b = ctx.createBuffer(1, n, SR);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  const c = ctx.createConvolver();
  c.buffer = b;
  return c;
}

function musica(ctx, salida) {
  const T = MUSICA_S;
  const sala = reverb(ctx);
  const mojado = ganancia(ctx, 0.35);
  sala.connect(mojado).connect(salida);
  const bus = ganancia(ctx, 1);
  bus.connect(salida);
  bus.connect(sala);
  const k = (t) => t / T; // 0 → 1 a lo largo de la pieza

  // Dron: Do1, Do2 y Sol2 en sierra, un poco desafinados, con el filtro abriéndose y el volumen subiendo.
  const lp = filtro(ctx, 'lowpass', 220, 1.2);
  const gd = ganancia(ctx, 0);
  lp.connect(gd).connect(bus);
  lp.frequency.setValueAtTime(220, 0);
  lp.frequency.exponentialRampToValueAtTime(2600, T - 0.3);
  gd.gain.setValueAtTime(0.0001, 0);
  gd.gain.exponentialRampToValueAtTime(0.09, 1.5);
  gd.gain.exponentialRampToValueAtTime(0.32, T - 0.2);
  for (const [m, det] of [[36, 0], [48, -7], [48, 6], [55, 4]]) {
    const o = tono(ctx, 'sawtooth', hz(m));
    o.detune.value = det;
    o.connect(lp);
    o.start(0);
    o.stop(T);
  }

  // Golpes: «bum» grave que cae de tono, con un golpe de ruido; cada vez más fuertes.
  for (const [t, m] of GOLPES) {
    const v = 0.35 + 0.65 * k(t);
    const o = tono(ctx, 'sine', hz(m - 12));
    const g = ganancia(ctx, 0);
    o.connect(g).connect(bus);
    o.frequency.setValueAtTime(hz(m), t);
    o.frequency.exponentialRampToValueAtTime(hz(m - 24), t + 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.start(t);
    o.stop(t + 0.6);
    const n = ruido(ctx, 0.12);
    const gn = ganancia(ctx, 0);
    n.connect(filtro(ctx, 'lowpass', 900)).connect(gn).connect(bus);
    gn.gain.setValueAtTime(0.5 * v, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    n.start(t);
  }

  // Racimo agudo disonante con trémolo: entra a la mitad.
  const gc = ganancia(ctx, 0);
  const trem = tono(ctx, 'sine', 7);
  const gt = ganancia(ctx, 0);
  trem.connect(gt).connect(gc.gain);
  gc.connect(filtro(ctx, 'lowpass', 5000)).connect(bus);
  gc.gain.setValueAtTime(0, 0);
  gc.gain.setValueAtTime(0.0001, 4.2);
  gc.gain.exponentialRampToValueAtTime(0.06, T - 0.2);
  gt.gain.setValueAtTime(0, 0);
  gt.gain.linearRampToValueAtTime(0.03, T - 0.2);
  for (const [m, det] of [[72, 0], [73, -10], [79, 8]]) {
    const o = tono(ctx, 'triangle', hz(m));
    o.detune.value = det;
    o.connect(gc);
    o.start(4.2);
    o.stop(T);
    o.detune.linearRampToValueAtTime(det + 60, T); // se va desafinando hacia arriba
  }
  trem.start(0);
  trem.stop(T);

  // Barrido de ruido que sube en los dos últimos segundos.
  const br = ruido(ctx, 2.4);
  const fb = filtro(ctx, 'bandpass', 300, 1.5);
  const gb = ganancia(ctx, 0);
  br.connect(fb).connect(gb).connect(bus);
  fb.frequency.setValueAtTime(300, T - 2.4);
  fb.frequency.exponentialRampToValueAtTime(6000, T - 0.05);
  gb.gain.setValueAtTime(0.0001, T - 2.4);
  gb.gain.exponentialRampToValueAtTime(0.25, T - 0.05);
  br.start(T - 2.4);

  // Corte en seco al final.
  salida.gain.setValueAtTime(1, T - 0.03);
  salida.gain.linearRampToValueAtTime(0, T);
}

export async function sonidoMusica() {
  return normalizar(ps1(await render(MUSICA_S, musica)), 0.9);
}

// ---------- Pista de 8 s sincronizada con el montaje del vídeo (DROP_ANIMATION, 27/10) ----------
// Lo que pasa en la imagen (25 fps): 0,20 se enciende la pantalla; 1,28–1,56 parpadea la bombilla y se queda
// encendida; destellos rojos a 2,36 · 3,44 · 4,48–4,56 · 5,20; otro parpadeo de la luz a 4,64–4,80; apagón a 5,52;
// «haz click para escapar» con rojo a 5,64 y 5,92; el ente asomado a 6,08; pulsos rojos a 6,24 · 6,84 · 7,40.
export const PISTA_S = 8;
const CORTES = {
  enciende: 0.2,
  parpadeos: [1.28, 1.36, 1.4, 1.44, 1.56, 4.64, 4.68, 4.72, 4.76, 4.8],
  apagon: 5.52,
  susto: 6.08,
};
// Golpes de la música: [segundo, nota midi, fuerza]. Los de la referencia de voz, movidos a los destellos rojos:
// sueltos al principio, en parejas al final (4,48–4,60 y 5,64–5,92), y después del susto, latidos más lentos.
const GOLPES_8 = [
  [2.36, 48, 0.45], [3.44, 48, 0.55], [4.48, 48, 0.7], [4.6, 47, 0.6], [5.2, 50, 0.8],
  [5.64, 48, 0.85], [5.92, 48, 0.95], [6.24, 48, 0.55], [6.84, 48, 0.45], [7.4, 48, 0.35],
];

function golpe(ctx, bus, t, m, v) {
  const o = tono(ctx, 'sine', hz(m - 12));
  const g = ganancia(ctx, 0);
  o.connect(g).connect(bus);
  o.frequency.setValueAtTime(hz(m), t);
  o.frequency.exponentialRampToValueAtTime(hz(m - 24), t + 0.35);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.start(t);
  o.stop(t + 0.6);
  const n = ruido(ctx, 0.12);
  const gn = ganancia(ctx, 0);
  n.connect(filtro(ctx, 'lowpass', 900)).connect(gn).connect(bus);
  gn.gain.setValueAtTime(0.5 * v, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  n.start(t);
}

// La música: el dron arranca con la pantalla y crece hasta el apagón, donde se corta en seco (solo queda un
// retumbar grave que sube hasta el susto); en el susto, un golpe enorme con el racimo agudo a tope, y luego el
// dron vuelve bajito y se apaga con los latidos.
function musica8(ctx, salida) {
  const sala = reverb(ctx);
  const mojado = ganancia(ctx, 0.35);
  sala.connect(mojado).connect(salida);
  const bus = ganancia(ctx, 1);
  bus.connect(salida);
  bus.connect(sala);
  const { enciende, apagon, susto } = CORTES;

  // Dron.
  const lp = filtro(ctx, 'lowpass', 200, 1.2);
  const gd = ganancia(ctx, 0);
  lp.connect(gd).connect(bus);
  lp.frequency.setValueAtTime(200, enciende);
  lp.frequency.exponentialRampToValueAtTime(2600, apagon);
  lp.frequency.setValueAtTime(500, susto + 0.3);
  lp.frequency.exponentialRampToValueAtTime(250, PISTA_S);
  gd.gain.setValueAtTime(0.0001, enciende);
  gd.gain.exponentialRampToValueAtTime(0.08, enciende + 1.0);
  gd.gain.exponentialRampToValueAtTime(0.34, apagon - 0.02);
  gd.gain.setValueAtTime(0.0001, apagon);
  gd.gain.setValueAtTime(0.0001, susto + 0.3);
  gd.gain.exponentialRampToValueAtTime(0.09, susto + 0.8);
  gd.gain.exponentialRampToValueAtTime(0.0001, PISTA_S - 0.05);
  for (const [m, det] of [[36, 0], [48, -7], [48, 6], [55, 4]]) {
    const o = tono(ctx, 'sawtooth', hz(m));
    o.detune.value = det;
    o.connect(lp);
    o.start(enciende);
    o.stop(PISTA_S);
  }

  // Racimo agudo disonante con trémolo: entra a los 3 s, se corta en el apagón y estalla en el susto.
  const gc = ganancia(ctx, 0);
  const trem = tono(ctx, 'sine', 7);
  const gt = ganancia(ctx, 0.02);
  trem.connect(gt).connect(gc.gain);
  gc.connect(filtro(ctx, 'lowpass', 5000)).connect(bus);
  gc.gain.setValueAtTime(0.0001, 3.0);
  gc.gain.exponentialRampToValueAtTime(0.06, apagon - 0.02);
  gc.gain.setValueAtTime(0, apagon);
  gc.gain.setValueAtTime(0.2, susto);
  gc.gain.exponentialRampToValueAtTime(0.0001, susto + 1.4);
  for (const [m, det] of [[72, 0], [73, -10], [79, 8]]) {
    const o = tono(ctx, 'triangle', hz(m));
    o.detune.setValueAtTime(det, 3.0);
    o.detune.linearRampToValueAtTime(det + 60, apagon);
    o.connect(gc);
    o.start(3.0);
    o.stop(susto + 1.5);
  }
  trem.start(3.0);
  trem.stop(susto + 1.5);

  // Barrido de ruido que sube hasta el apagón y se corta en seco.
  const br = ruido(ctx, 1.6);
  const fb = filtro(ctx, 'bandpass', 300, 1.5);
  const gb = ganancia(ctx, 0);
  br.connect(fb).connect(gb).connect(bus);
  fb.frequency.setValueAtTime(300, apagon - 1.6);
  fb.frequency.exponentialRampToValueAtTime(6000, apagon);
  gb.gain.setValueAtTime(0.0001, apagon - 1.6);
  gb.gain.exponentialRampToValueAtTime(0.22, apagon - 0.02);
  gb.gain.setValueAtTime(0, apagon);
  br.start(apagon - 1.6);

  // En el apagón, un retumbar grave que sube hasta el susto.
  const sub = tono(ctx, 'sine', 32);
  const gs = ganancia(ctx, 0);
  sub.connect(gs).connect(bus);
  gs.gain.setValueAtTime(0.0001, apagon);
  gs.gain.exponentialRampToValueAtTime(0.35, susto - 0.01);
  gs.gain.setValueAtTime(0, susto);
  sub.start(apagon);
  sub.stop(susto + 0.05);

  for (const [t, m, v] of GOLPES_8) golpe(ctx, bus, t, m, v);
  // El golpe del susto: el más grave y fuerte.
  golpe(ctx, bus, susto, 43, 1.3);
  golpe(ctx, bus, susto + 0.01, 31, 1.0);
}

// Efectos: el ordenador que se enciende (con su zumbido debajo), los chasquidos de la bombilla al parpadear y el
// grito del ente en el susto. encendidoDatos y ambienteDatos: los dos sonidos ya hechos del ordenador.
function efectos8(ctx, salida, encendidoDatos, ambienteDatos) {
  const { enciende, parpadeos, susto } = CORTES;
  const pon = (datos, t, v, hasta) => {
    const b = ctx.createBuffer(1, datos.length, SR);
    b.copyToChannel(datos, 0);
    const s = ctx.createBufferSource();
    s.buffer = b;
    const g = ganancia(ctx, v);
    s.connect(g).connect(salida);
    s.start(t);
    if (hasta) {
      g.gain.setValueAtTime(v, hasta - 0.3);
      g.gain.linearRampToValueAtTime(0, hasta);
    }
  };
  pon(encendidoDatos, enciende - 0.02, 0.55);
  pon(ambienteDatos, 2.0, 0.35, PISTA_S);
  // Bombilla: chasquido y un zumbido eléctrico corto en cada parpadeo.
  for (const t of parpadeos) {
    const n = ruido(ctx, 0.02);
    const gn = ganancia(ctx, 0);
    n.connect(filtro(ctx, 'highpass', 2500)).connect(gn).connect(salida);
    gn.gain.setValueAtTime(0.35, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    n.start(t);
    const z = tono(ctx, 'sawtooth', 100);
    const gz = ganancia(ctx, 0);
    z.connect(filtro(ctx, 'lowpass', 1500)).connect(gz).connect(salida);
    gz.gain.setValueAtTime(0.06, t);
    gz.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    z.start(t);
    z.stop(t + 0.06);
  }
  // El grito del susto: tres gritos a la vez, saturados (como el de «QUIERO TU VIDA»).
  const grito = ctx.createBuffer(1, Math.ceil(SR * 1.6), SR);
  grito.copyToChannel(screamSamples(SR, 1.6, createRng(1031)), 0);
  const sat = ctx.createWaveShaper();
  const curva = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) curva[i] = Math.tanh(((i / 1023) * 2 - 1) * 3);
  sat.curve = curva;
  const gg = ganancia(ctx, 0);
  sat.connect(filtro(ctx, 'lowpass', 7500)).connect(gg).connect(salida);
  gg.gain.setValueAtTime(0.0001, susto);
  gg.gain.exponentialRampToValueAtTime(0.7, susto + 0.03);
  gg.gain.setValueAtTime(0.7, susto + 0.9);
  gg.gain.exponentialRampToValueAtTime(0.0001, susto + 1.5);
  for (const rate of [0.62, 0.86, 1.12]) {
    const s = ctx.createBufferSource();
    s.buffer = grito;
    s.playbackRate.value = rate;
    s.connect(ganancia(ctx, 0.5)).connect(sat);
    s.start(susto);
  }
}

// Las tres pistas de 8 s: música, efectos y las dos juntas.
export async function pistas8() {
  const encendidoDatos = ps1(await render(6, encendido));
  const ambienteDatos = await sonidoAmbiente();
  const musica = normalizar(ps1(await render(PISTA_S, musica8)), 0.85);
  const efectos = normalizar(ps1(await render(PISTA_S, (ctx, salida) => efectos8(ctx, salida, encendidoDatos, ambienteDatos))), 0.85);
  const mezcla = normalizar(ps1(await render(PISTA_S, (ctx, salida) => {
    const gm = ganancia(ctx, 0.8);
    const ge = ganancia(ctx, 0.7);
    gm.connect(salida);
    ge.connect(salida);
    musica8(ctx, gm);
    efectos8(ctx, ge, encendidoDatos, ambienteDatos);
  })), 0.9);
  return { musica, efectos, mezcla };
}

// ---------- Música de la persecución (28/10): bucle de 16 s, sacado de la del vídeo ----------
// 120 bpm, 8 compases de 2 s. Dron de Do y Sol con el filtro que respira una vez por bucle, el doble latido
// («bum-bum») al empezar cada compás y otro más flojo a la mitad, un tictac metálico en semicorcheas, el racimo
// agudo disonante (Do–Do#) que entra y sale en cada frase de 4 compases y un barrido de ruido que lleva al
// compás 1 de cada frase. La cola de la reverb del final se suma al principio, para que al repetir no se note.
export const PERSECUCION_S = 16;
const NEGRA = 0.5;

function persecucion(ctx, salida) {
  const T = PERSECUCION_S;
  const sala = reverb(ctx, 1.6);
  const mojado = ganancia(ctx, 0.3);
  sala.connect(mojado).connect(salida);
  const bus = ganancia(ctx, 1);
  bus.connect(salida);
  bus.connect(sala);

  // Dron.
  const lp = filtro(ctx, 'lowpass', 500, 1.4);
  const gd = ganancia(ctx, 0.2);
  lp.connect(gd).connect(bus);
  const lfo = tono(ctx, 'sine', 1 / T);
  const glfo = ganancia(ctx, 380);
  lfo.connect(glfo).connect(lp.frequency);
  for (const [m, det] of [[36, 0], [48, -6], [48, 7], [55, 3]]) {
    const o = tono(ctx, 'sawtooth', hz(m));
    o.detune.value = det;
    o.connect(lp);
    o.start(0);
    o.stop(T + 2);
  }
  lfo.start(0);
  lfo.stop(T + 2);

  // Latidos: doble al empezar cada compás y uno flojo a la mitad.
  for (let compas = 0; compas < 8; compas++) {
    const t0 = compas * 4 * NEGRA;
    const fuerte = compas % 4 === 0 ? 0.95 : 0.75;
    golpe(ctx, bus, t0, 48, fuerte);
    golpe(ctx, bus, t0 + 0.24, 48, fuerte * 0.75);
    golpe(ctx, bus, t0 + 2 * NEGRA, compas % 2 ? 50 : 48, 0.45);
  }

  // Tictac metálico en semicorcheas, más fuerte en las negras.
  for (let i = 0; i < 64; i++) {
    const t = i * NEGRA / 4;
    const n = ruido(ctx, 0.03);
    const g = ganancia(ctx, 0);
    n.connect(filtro(ctx, 'bandpass', 7000, 6)).connect(g).connect(bus);
    g.gain.setValueAtTime(i % 4 === 0 ? 0.22 : 0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    n.start(t);
  }

  // Racimo agudo: entra y sale en cada frase de 4 compases (8 s), con trémolo.
  const gc = ganancia(ctx, 0);
  const trem = tono(ctx, 'sine', 8);
  const gt = ganancia(ctx, 0.015);
  trem.connect(gt).connect(gc.gain);
  gc.connect(filtro(ctx, 'lowpass', 4500)).connect(bus);
  for (const f0 of [0, 8]) {
    gc.gain.setValueAtTime(0.0001, f0);
    gc.gain.exponentialRampToValueAtTime(0.05, f0 + 6);
    gc.gain.exponentialRampToValueAtTime(0.0001, f0 + 7.9);
  }
  for (const [m, det] of [[72, 0], [73, -12], [79, 9]]) {
    const o = tono(ctx, 'triangle', hz(m));
    o.detune.value = det;
    o.connect(gc);
    o.start(0);
    o.stop(T + 2);
  }
  trem.start(0);
  trem.stop(T + 2);

  // Barrido de ruido que sube los últimos 2 s de cada frase.
  for (const f0 of [6, 14]) {
    const br = ruido(ctx, 2);
    const fb = filtro(ctx, 'bandpass', 400, 1.5);
    const gb = ganancia(ctx, 0);
    br.connect(fb).connect(gb).connect(bus);
    fb.frequency.setValueAtTime(400, f0);
    fb.frequency.exponentialRampToValueAtTime(5000, f0 + 1.95);
    gb.gain.setValueAtTime(0.0001, f0);
    gb.gain.exponentialRampToValueAtTime(0.16, f0 + 1.9);
    gb.gain.setValueAtTime(0, f0 + 2);
    br.start(f0);
  }
}

// El bucle de 16 s, listo para repetir: lo que suena pasado el final (colas) se suma al principio.
export async function sonidoPersecucion() {
  const COLA = 2;
  const datos = await render(PERSECUCION_S + COLA, persecucion);
  const n = SR * PERSECUCION_S;
  const out = new Float32Array(n);
  out.set(datos.subarray(0, n));
  for (let i = 0; i < SR * COLA; i++) out[i] += datos[n + i];
  return normalizar(ps1(out), 0.8);
}
