// Pantallas de la encuesta. Solo DOM: la lógica vive en survey.js, layout.js y texts.js.

import { buttonsFor, fleePosition } from './layout.js';
import { textFor, HEADER } from './texts.js';
import { corrupt } from './glitch.js';
import { glitchLevel } from './survey.js';

const CARAS = ['◕‿◕', '◕‿◕', '◕‿◕', '◕_◕', '•_•', '●_●'];
const NUMERO = { q1: 1, q2: 2, q3: 3, q4: 4 };
const FLEE_RADIUS = 120;
// Huye unas veces y luego se deja tocar: si no, en móvil las vueltas 4 y 5 serían inalcanzables.
const MAX_FLEES = 3;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Pinta una pregunta. Devuelve { setLocked, scramble, destroy }.
export function renderQuestion(root, s, onAnswer, rng) {
  root.replaceChildren();
  const level = glitchLevel(s);
  const texto = textFor(s);
  const mutar = s.step === 'q3' || s.step === 'q4';
  const botones = s.step === 'q4' ? buttonsFor(s.loop) : buttonsFor(1);

  const tarjeta = el('section', 'tarjeta');
  const ia = el('header', 'ia');
  ia.append(el('div', 'avatar', CARAS[level]));
  const iaTexto = el('div');
  const iaTitulo = el('p', 'ia-titulo');
  iaTexto.append(iaTitulo, el('p', 'ia-sub', HEADER.sub));
  ia.append(iaTexto);
  const pregunta = el('h1', 'pregunta');
  const sub = el('p', 'sub');
  tarjeta.append(ia, el('p', 'contador', `pregunta ${NUMERO[s.step]} de 3`), pregunta, sub, el('p', 'pensando', 'anotado'));

  const fila = el('div', 'botones');
  const si = el('button', `btn btn-si si-${botones.si.size}`, 'Sí');
  const no = el('button', `btn btn-no no-${botones.no.mode}`, 'No');
  si.type = no.type = 'button';
  no.style.setProperty('--escala', String(botones.no.scale));
  si.addEventListener('click', () => onAnswer('si'));
  no.addEventListener('click', () => onAnswer('no'));
  fila.append(si, no);
  root.append(tarjeta, fila);

  document.body.classList.toggle('si-tapa', botones.si.size === 'media' || botones.si.size === 'completa');
  document.body.classList.toggle('si-completa-activo', botones.si.size === 'completa');

  const scramble = () => {
    iaTitulo.textContent = corrupt(HEADER.title, level, rng);
    // La pregunta se corrompe menos que la cabecera: tiene que poder leerse.
    pregunta.textContent = mutar ? corrupt(texto.title, Math.max(0, level - 3), rng) : texto.title;
    sub.textContent = mutar ? corrupt(texto.sub, Math.max(0, level - 3), rng) : texto.sub;
  };
  scramble();

  const cleanups = [];
  if (botones.no.mode === 'huye') {
    const place = (p) => { no.style.left = `${p.x}px`; no.style.top = `${p.y}px`; };
    const rect = no.getBoundingClientRect();
    place({ x: (window.innerWidth - rect.width) / 2, y: window.innerHeight * 0.78 });
    let flees = 0;
    const flee = (ev) => {
      if (flees >= MAX_FLEES) return;
      const r = no.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - ev.clientX, r.top + r.height / 2 - ev.clientY);
      if (d >= FLEE_RADIUS) return;
      flees++;
      place(fleePosition(
        { w: window.innerWidth, h: window.innerHeight },
        { w: r.width, h: r.height },
        { x: ev.clientX, y: ev.clientY },
        rng,
      ));
    };
    document.addEventListener('pointermove', flee);
    document.addEventListener('pointerdown', flee, true);
    cleanups.push(() => {
      document.removeEventListener('pointermove', flee);
      document.removeEventListener('pointerdown', flee, true);
    });
  }

  return {
    setLocked(locked) { document.body.classList.toggle('bloqueado', locked); },
    scramble,
    destroy() { cleanups.forEach((fn) => fn()); document.body.classList.remove('bloqueado', 'si-tapa', 'si-completa-activo'); },
  };
}

function pantallaNegra(root) {
  root.replaceChildren();
  const negro = el('div', 'negro');
  root.append(negro);
  return negro;
}

export function renderBlack(root) {
  pantallaNegra(root);
}

export function renderEyes(root) {
  const negro = pantallaNegra(root);
  const ojos = el('div', 'ojos');
  ojos.append(el('span', 'ojo izq'), el('span', 'ojo der'));
  negro.append(ojos);
}

// «QUIERO TU VIDA» pintado a baja resolución y escalado sin suavizado: primer contacto con la estética PS1.
export function renderQuieroTuVida(root) {
  const negro = pantallaNegra(root);
  const canvas = el('canvas', 'qtv');
  canvas.width = 96;
  canvas.height = 40;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'quiero tu vida');
  const g = canvas.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 96, 40);
  g.font = 'bold 13px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#7a0b10';
  g.fillText('QUIERO', 49, 12);
  g.fillText('TU VIDA', 49, 29);
  g.fillStyle = '#e9e2c8';
  g.fillText('QUIERO', 48, 12);
  g.fillText('TU VIDA', 48, 29);
  negro.append(canvas);
}

export function renderGracias(root, onAgain) {
  const negro = pantallaNegra(root);
  const boton = el('button', 'otra-vez', 'otra vez');
  boton.type = 'button';
  boton.addEventListener('click', onAgain);
  negro.append(el('p', 'gracias', 'gracias por tu vida'), boton);
}
