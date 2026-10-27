// Sonidos de ambiente para el vídeo (27/10): un ordenador viejo que se enciende y el zumbido del ordenador ya
// encendido, en bucle. Se sintetizan sin altavoces (OfflineAudioContext) y luego se «pasan por una PS1»: la mitad
// de frecuencia de muestreo (22 kHz, se nota en los agudos) y 10 bits, con algo de ruido de fondo.

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
