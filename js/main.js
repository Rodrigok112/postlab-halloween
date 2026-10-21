// Flujo de la encuesta: pinta cada paso, programa esperas, golpes, gritos y destellos, y entrega el camino al juego.

import {
  createSurvey, currentStep, answer, advance, unlock, glitchLevel,
  DESTELLO_MS, DESTELLO_GAP_MS, ENTE_MS,
} from './survey.js';
import { createRng, createFlashGuard } from './glitch.js';
import { unlockAudio, thump, scream } from './audio.js';
import { startMusic, setMusicLevel, stopMusic } from './music.js';
import {
  renderInicio, renderNombre, renderQuestion, renderCortada, renderDestello, renderEnte,
  renderQuieroTuVida, renderBlack, renderMuerte,
} from './screens.js';

const QTV_MS = 2500;
const BLACK_MS = 1000;
const SCRAMBLE_MS = 700;
const SHAKE_MS = 150;
const GRITO_MS = 3200;
const CON_GRITOS = new Set(['lugar', 'aqui']);
// Bloque del filtro de pixelado por nivel (0 = sin filtro).
const PIXEL = [0, 0, 0, 2, 3, 4];

const app = document.getElementById('app');
const apagon = document.getElementById('apagon');
const rng = createRng(Date.now() >>> 0);
const guard = createFlashGuard(3);

let state;
let view = null;
let timers = [];
let scrambleTimer = null;
let gritoTimer = null;

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

// Golpe visible: sacude la pantalla y la oscurece un instante. Pasa por el límite de destellos.
function golpeVisible() {
  if (!guard.tryFlash(performance.now())) return;
  app.classList.remove('sacudida');
  apagon.classList.remove('on');
  void app.offsetWidth;
  app.classList.add('sacudida');
  apagon.classList.add('on');
  later(() => { app.classList.remove('sacudida'); apagon.classList.remove('on'); }, SHAKE_MS);
}

function destroyView() {
  clearInterval(scrambleTimer);
  scrambleTimer = null;
  if (view) view.destroy();
  view = null;
}

function gritos(activos) {
  if (activos && !gritoTimer) {
    later(() => scream(0.6, true), 900);
    gritoTimer = setInterval(() => scream(0.45 + Math.random() * 0.4, true), GRITO_MS);
  } else if (!activos && gritoTimer) {
    clearInterval(gritoTimer);
    gritoTimer = null;
  }
}

function paint() {
  destroyView();
  const st = currentStep(state);
  const level = glitchLevel(state);
  setNivel(level);
  setMusicLevel(level);
  gritos(CON_GRITOS.has(st.id));

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
      runDestellos(st.textos);
      break;
    case 'ente':
      renderEnte(app);
      later(() => { state = advance(state); paint(); }, ENTE_MS);
      break;
    default:
      view = renderQuestion(app, state, onAnswer, rng);
      if (level >= 2) scrambleTimer = setInterval(() => view.scramble(), SCRAMBLE_MS);
  }
}

// Destellos de texto de DESTELLO_MS con DESTELLO_GAP_MS de negro entre ellos (≤ 3 por segundo).
function runDestellos(textos) {
  renderBlack(app);
  const periodo = DESTELLO_MS + DESTELLO_GAP_MS;
  textos.forEach((texto, i) => {
    later(() => {
      if (guard.tryFlash(performance.now())) renderDestello(app, texto);
      later(() => renderBlack(app), DESTELLO_MS);
    }, DESTELLO_GAP_MS + i * periodo);
  });
  later(() => { state = advance(state); paint(); }, DESTELLO_GAP_MS + textos.length * periodo);
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

function onAnswer(value) {
  unlockAudio();
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
  stopMusic();
  setNivel(5);
  thump(1);
  scream(1, false);
  renderQuieroTuVida(app);
  later(() => {
    renderBlack(app);
    later(() => {
      // El juego escucha este evento y llama a preventDefault() si se encarga del camino.
      const ev = new CustomEvent('encuesta:fin', { detail: { camino }, cancelable: true });
      const handled = !window.dispatchEvent(ev);
      if (!handled) renderMuerte(app, start);
    }, BLACK_MS);
  }, QTV_MS);
}

function start() {
  clearTimers();
  gritos(false);
  stopMusic();
  state = createSurvey();
  paint();
}

makeDither();
start();
