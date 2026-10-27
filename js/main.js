// Flujo de la encuesta: pinta cada paso, programa esperas, golpes, gritos y destellos, y entrega el camino al juego.

import {
  createSurvey, currentStep, answer, advance, unlock, glitchLevel, golpeteoActivo, ENTE_MS, RAYADO_MS, BLANCO_MS,
} from './survey.js';
import { createRng, createFlashGuard } from './glitch.js';
import { unlockAudio, thump, scream, screamQTV, tapeStop } from './audio.js';
import { startMusic, setMusicLevel, stopMusic } from './music.js';
import {
  renderInicio, renderNombre, renderQuestion, renderCortada, renderDestello, renderEnte, renderRayado,
  renderQuieroTuVida, renderBlack, renderBlanco, renderMuerte, renderCargando,
} from './screens.js';

const QTV_MS = 2500;
const BLACK_MS = 1000;
const SCRAMBLE_MS = 700;
const SHAKE_MS = 150;
const GRITO_MS = 3200;
const CON_GRITOS = new Set(['lugar', 'aqui']);
// Pregunta final: la puerta golpea sin parar y los gritos suenan fuertes, sin filtro.
const GOLPETEO_MS = 650;
const GRITO_FUERTE_MS = 3500;
// Bloque del filtro de pixelado por nivel (0 = sin filtro).
const PIXEL = [0, 0, 0, 2, 3, 4];

const app = document.getElementById('app');

// El juego (Three.js, ~700 KB) se carga en segundo plano mientras se responde la encuesta. Al terminar se espera a
// que esté (en una conexión lenta puede no haber llegado) y, si falló, se reintenta una vez; si aun así no carga,
// la encuesta termina en «HAS MUERTO», con el motivo en pequeño.
let errorJuego = '';
const cargarJuego = (url) => import(url).then(() => true).catch((e) => { errorJuego = String(e?.message || e); return false; });
const juegoListo = cargarJuego('./juego/index.js');
const apagon = document.getElementById('apagon');
const rng = createRng(Date.now() >>> 0);
const guard = createFlashGuard(3);

let state;
let view = null;
let timers = [];
let scrambleTimer = null;
let gritoTimer = null;
let golpeteoTimer = null;
let golpeteoGritos = null;

function later(fn, ms) {
  timers.push(setTimeout(fn, ms));
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function setNivel(n) {
  document.body.className = document.body.className.replace(/\bnivel-\d\b/g, '').trim();
  document.body.classList.add(`nivel-${n}`);
  const b = PIXEL[n];
  if (b > 0) {
    document.getElementById('pix-flood').setAttribute('x', String(Math.floor(b / 2)));
    document.getElementById('pix-flood').setAttribute('y', String(Math.floor(b / 2)));
    document.getElementById('pix-tile').setAttribute('width', String(b));
    document.getElementById('pix-tile').setAttribute('height', String(b));
    document.getElementById('pix-dilate').setAttribute('radius', String(b / 2));
  }
}

function makeDither() {
  // Tramado Bayer 4x4 en un canvas diminuto, usado como fondo repetido.
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d');
  bayer.forEach((v, i) => {
    const k = Math.round((v / 15) * 255);
    g.fillStyle = `rgb(${k},${k},${k})`;
    g.fillRect(i % 4, Math.floor(i / 4), 1, 1);
  });
  document.documentElement.style.setProperty('--tramado-img', `url(${c.toDataURL()})`);
}

// Golpe visible: sacude la tarjeta y oscurece la pantalla un instante. Pasa por el límite de destellos.
// Se sacude la tarjeta y no #app: un transform en #app movería los botones fijos (el Sí gigante, el No suelto).
function golpeVisible() {
  if (!guard.tryFlash(performance.now())) return;
  const blanco = app.querySelector('.tarjeta') || app;
  blanco.classList.remove('sacudida');
  apagon.classList.remove('on');
  void blanco.offsetWidth;
  blanco.classList.add('sacudida');
  apagon.classList.add('on');
  later(() => { blanco.classList.remove('sacudida'); apagon.classList.remove('on'); }, SHAKE_MS);
}

function destroyView() {
  clearInterval(scrambleTimer);
  scrambleTimer = null;
  if (view) view.destroy();
  view = null;
}

function gritos(activos) {
  if (activos && !gritoTimer) {
    later(() => scream(0.6, 'puerta'), 900);
    gritoTimer = setInterval(() => scream(0.45 + Math.random() * 0.4, 'puerta'), GRITO_MS);
  } else if (!activos && gritoTimer) {
    clearInterval(gritoTimer);
    gritoTimer = null;
  }
}

function golpeteo(activo) {
  if (activo && !golpeteoTimer) {
    scream(0.7, 'medio');
    const tic = () => { thump(0.7 + Math.random() * 0.25); golpeVisible(); };
    tic();
    golpeteoTimer = setInterval(tic, GOLPETEO_MS);
    // Más bajos que el de «QUIERO TU VIDA», para que ese sea el que destaque.
    golpeteoGritos = setInterval(() => scream(0.55 + Math.random() * 0.2, 'medio'), GRITO_FUERTE_MS);
  } else if (!activo && golpeteoTimer) {
    clearInterval(golpeteoTimer);
    clearInterval(golpeteoGritos);
    golpeteoTimer = null;
    golpeteoGritos = null;
  }
}

function paint() {
  destroyView();
  const st = currentStep(state);
  const level = glitchLevel(state);
  setNivel(level);
  setMusicLevel(level);
  gritos(CON_GRITOS.has(st.id));
  golpeteo(golpeteoActivo(state));
  // Antes de la final la música se corta en seco (blanco); en la final, desde el primer No, golpes y gritos.
  if (st.sinMusica) stopMusic();

  switch (st.kind) {
    case 'inicio':
      view = renderInicio(app, onStart);
      break;
    case 'nombre':
      view = renderNombre(app, onNombre, rng);
      break;
    case 'cortada':
      view = renderCortada(app, state, rng, () => { state = advance(state); paint(); });
      break;
    case 'destellos':
      runDestellos(st);
      break;
    case 'rayado':
      // La música se para como una cinta y suena el zumbido; luego vuelve, más rota.
      stopMusic();
      tapeStop(RAYADO_MS / 1000);
      view = renderRayado(app, rng, RAYADO_MS);
      later(() => { startMusic(); state = advance(state); paint(); }, RAYADO_MS);
      break;
    case 'blanco':
      // La tarjeta vacía y en blanco, en silencio, como si se hubiera roto.
      renderBlanco(app);
      later(() => { state = advance(state); paint(); }, BLANCO_MS);
      break;
    case 'ente':
      renderEnte(app);
      later(() => { state = advance(state); paint(); }, ENTE_MS);
      break;
    default:
      view = renderQuestion(app, state, onAnswer, rng);
      if (level >= 1) scrambleTimer = setInterval(() => view.scramble(), SCRAMBLE_MS);
  }
}

// Destellos de texto de step.ms con step.gap de negro entre ellos (≤ 3 por segundo).
function runDestellos(step) {
  renderBlack(app);
  const periodo = step.ms + step.gap;
  step.textos.forEach((texto, i) => {
    later(() => {
      if (guard.tryFlash(performance.now())) renderDestello(app, texto);
      later(() => renderBlack(app), step.ms);
    }, step.gap + i * periodo);
  });
  later(() => { state = advance(state); paint(); }, step.gap + step.textos.length * periodo);
}

function onStart() {
  unlockAudio();
  startMusic();
  state = answer(state, 'empezar');
  paint();
}

function onNombre(value) {
  unlockAudio();
  const prev = state;
  const next = answer(state, value);
  if (next === prev) { view.rechazar(); return; }
  state = next;
  esperar(currentStep(prev));
}

// En la final cada No pasa al instante; este margen evita que un toque doble se salte dos vueltas.
const FINAL_MARGEN_MS = 250;
let ultimoFinal = -Infinity;

function onAnswer(value) {
  unlockAudio();
  if (currentStep(state).kind === 'final') {
    if (performance.now() - ultimoFinal < FINAL_MARGEN_MS) return;
    ultimoFinal = performance.now();
  }
  const prev = state;
  const next = answer(state, value);
  if (next === prev) return;
  state = next;
  if (state.ended) { finish(state.ended); return; }
  // En la pregunta final no hay golpes ni esperas: la IA juega contigo.
  if (currentStep(prev).kind === 'final') { paint(); return; }
  esperar(currentStep(prev));
}

// Espera tras responder, con golpes en la puerta repartidos y cada vez más fuertes.
function esperar(step) {
  view.setLocked(true);
  const n = step.thumps ?? 0;
  const delay = step.delay ?? 0;
  const fuerza = 0.3 + 0.12 * step.nivel;
  for (let i = 1; i <= n; i++) {
    later(() => { thump(fuerza + 0.05 * i); golpeVisible(); }, (delay * i) / (n + 1));
  }
  later(() => { state = unlock(state); paint(); }, delay);
}

function finish(camino) {
  clearTimers();
  destroyView();
  gritos(false);
  golpeteo(false);
  stopMusic();
  setNivel(5);
  screamQTV(0.6); // algo más bajo que en el juego: en la web reventaba
  renderQuieroTuVida(app);
  later(() => {
    renderBlack(app);
    later(async () => {
      const cargando = setTimeout(() => renderCargando(app), 600);
      const listo = (await juegoListo) || (await cargarJuego(`./juego/index.js?reintento=${Date.now()}`));
      clearTimeout(cargando);
      renderBlack(app);
      // El juego escucha este evento y llama a preventDefault() si se encarga del camino.
      const alFallar = (motivo) => renderMuerte(app, start, motivo || errorJuego);
      if (!listo) { alFallar(); return; }
      const ev = new CustomEvent('encuesta:fin', { detail: { camino, nombre: state.nombre, reiniciar: start, alFallar }, cancelable: true });
      const handled = !window.dispatchEvent(ev);
      if (!handled) alFallar('tu navegador no puede con WebGL');
    }, BLACK_MS);
  }, QTV_MS);
}

function start() {
  clearTimers();
  gritos(false);
  golpeteo(false);
  stopMusic();
  state = createSurvey();
  paint();
}

makeDither();
start();

// Atajo de prueba: #juego-final2, #juego-pasillo, #juego-cruce o #juego-psicologo salta la encuesta y abre el juego.
const atajo = /^#juego-(final2|pasillo|cruce|psicologo)$/.exec(window.location.hash);
if (atajo) {
  juegoListo.then(() => {
    const alFallar = () => renderMuerte(app, start);
    window.dispatchEvent(new CustomEvent('encuesta:fin', { detail: { camino: atajo[1], nombre: 'Rodrigo', reiniciar: start, alFallar }, cancelable: true }));
  });
}
