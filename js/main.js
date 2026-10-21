// Flujo de la encuesta: pinta estados, programa demoras y golpes, y entrega el camino al juego.

import { createSurvey, answer, unlock, afterEyes, glitchLevel, DELAY_MS, THUMPS, EYES_MS } from './survey.js';
import { createRng, createFlashGuard } from './glitch.js';
import { unlockAudio, thump } from './audio.js';
import { renderQuestion, renderEyes, renderQuieroTuVida, renderBlack, renderGracias } from './screens.js';

const QTV_MS = 2500;
const BLACK_MS = 1000;
const SCRAMBLE_MS = 700;
const SHAKE_MS = 150;
const FUERZA = { q1: 0.35, q2: 0.5, q3: 0.7, q4: 0.85 };
// Bloque del filtro de pixelado por nivel (0 = sin filtro).
const PIXEL = [0, 0, 0, 2, 3, 4];

const app = document.getElementById('app');
const rng = createRng(Date.now() >>> 0);
const guard = createFlashGuard(3);

let state;
let view = null;
let timers = [];

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

function shake() {
  if (!guard.tryFlash(performance.now())) return;
  app.classList.remove('sacudida');
  void app.offsetWidth;
  app.classList.add('sacudida');
  later(() => app.classList.remove('sacudida'), SHAKE_MS);
}

let scrambleTimer = null;

function destroyView() {
  clearInterval(scrambleTimer);
  scrambleTimer = null;
  if (view) view.destroy();
  view = null;
}

function paint() {
  destroyView();
  setNivel(glitchLevel(state));
  if (state.step === 'ojos') {
    renderEyes(app);
    later(() => { state = afterEyes(state); paint(); }, EYES_MS);
    return;
  }
  view = renderQuestion(app, state, onAnswer, rng);
  if (glitchLevel(state) >= 2) scrambleTimer = setInterval(() => view.scramble(), SCRAMBLE_MS);
}

function onAnswer(value) {
  unlockAudio();
  const prev = state;
  const next = answer(state, value);
  if (next === prev) return;
  state = next;
  if (state.ended) {
    finish(state.ended);
    return;
  }
  view.setLocked(true);
  const n = THUMPS[prev.step];
  const delay = DELAY_MS[prev.step];
  const fuerza = FUERZA[prev.step] + 0.03 * (prev.loop - 1);
  for (let i = 1; i <= n; i++) {
    later(() => { thump(fuerza + 0.05 * i); shake(); }, (delay * i) / (n + 1));
  }
  later(() => {
    state = state.step === 'ojos' ? state : unlock(state);
    paint();
  }, delay);
}

function finish(camino) {
  clearTimers();
  destroyView();
  setNivel(5);
  thump(1);
  renderQuieroTuVida(app);
  later(() => {
    renderBlack(app);
    later(() => {
      // El juego escucha este evento y llama a preventDefault() si se encarga del camino.
      const ev = new CustomEvent('encuesta:fin', { detail: { camino }, cancelable: true });
      const handled = !window.dispatchEvent(ev);
      if (!handled) renderGracias(app, start);
    }, BLACK_MS);
  }, QTV_MS);
}

function start() {
  clearTimers();
  state = createSurvey();
  paint();
}

makeDither();
start();
