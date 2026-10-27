// Pantallas de la encuesta. Solo DOM: la lógica vive en survey.js, layout.js y texts.js.
// Todo texto del usuario (el nombre) se pinta con textContent, nunca como HTML.

import { buttonsForStep, fleePosition, createFleeBudget } from './layout.js';
import {
  textFor, contador, HEADER, INICIO, NOMBRE, MUERTE, TIPICA_CORTE, JEJE_MS, TOTAL_PROMETIDO, escrituraFinal, ESCRITURA_FINAL,
} from './texts.js';
import { corrupt } from './glitch.js';
import { glitchLevel, questionNumber, currentStep, MAX_NOMBRE } from './survey.js';

const CARAS = ['◕‿◕', '◕‿◕', '◕‿◕', '◕_◕', '•_•', '●_●'];
const FLEE_RADIUS = 130;
// Huye 3 veces, con un respiro entre huidas para que cada una se note, y luego se deja tocar.
const MAX_FLEES = 3;
const FLEE_COOLDOWN_MS = 300;
const TECLEO_MS = 45;
const CORTE_MS = 500;

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function cabecera(level, rng, sinCara = false) {
  const ia = el('header', 'ia');
  if (!sinCara) ia.append(el('div', 'avatar', CARAS[level]));
  const iaTexto = el('div');
  const titulo = el('p', 'ia-titulo', corrupt(HEADER.title, level, rng));
  iaTexto.append(titulo, el('p', 'ia-sub', HEADER.sub));
  ia.append(iaTexto);
  return { ia, titulo };
}

const sinEstado = () => document.body.classList.remove('bloqueado', 'si-tapa', 'si-completa-activo');

// Inicio: la carita saluda con la mano, sonríe y parpadea de vez en cuando.
export function renderInicio(root, onStart) {
  root.replaceChildren();
  const tarjeta = el('section', 'tarjeta inicio');
  const avatar = el('div', 'avatar grande saluda');
  const cara = el('span', 'cara', CARAS[0]);
  avatar.append(cara, el('span', 'mano-saludo', '👋'));
  const boton = el('button', 'btn btn-si', INICIO.boton);
  boton.type = 'button';
  boton.addEventListener('click', onStart);
  tarjeta.append(avatar, el('p', 'saludo', INICIO.saludo), el('h1', 'pregunta', INICIO.title),
    el('p', 'sub', INICIO.sub), el('p', 'volumen', INICIO.volumen));
  const fila = el('div', 'botones');
  fila.append(boton);
  root.append(tarjeta, fila);

  const timers = [
    setTimeout(() => { cara.textContent = '^‿^'; }, 300),
    setTimeout(() => { cara.textContent = CARAS[0]; }, 1900),
  ];
  const parpadeo = setInterval(() => {
    cara.textContent = '−‿−';
    timers.push(setTimeout(() => { cara.textContent = CARAS[0]; }, 140));
  }, 3200);
  return {
    destroy() { timers.forEach(clearTimeout); clearInterval(parpadeo); sinEstado(); },
    setLocked() {},
    scramble() {},
  };
}

export function renderNombre(root, onSubmit, rng) {
  root.replaceChildren();
  const tarjeta = el('section', 'tarjeta');
  const { ia } = cabecera(0, rng);
  const form = el('form', 'nombre');
  const input = el('input', 'campo');
  Object.assign(input, {
    type: 'text', name: 'nombre', maxLength: MAX_NOMBRE, placeholder: NOMBRE.placeholder,
    autocomplete: 'off', spellcheck: false,
  });
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('enterkeyhint', 'done');
  input.setAttribute('aria-label', NOMBRE.title);
  const boton = el('button', 'btn btn-si', NOMBRE.boton);
  boton.type = 'submit';
  form.append(input, boton);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); onSubmit(input.value); });
  // Primero se le escapa la versión borde y al segundo se corrige sola, con un glitch.
  const aviso = el('p', 'aviso', NOMBRE.avisoBorde);
  tarjeta.append(ia, el('h1', 'pregunta', NOMBRE.title), form, aviso, el('p', 'pensando', 'anotado'));
  root.append(tarjeta);
  const timers = [
    setTimeout(() => { aviso.textContent = corrupt(NOMBRE.avisoBorde, 3, rng); }, NOMBRE.cambioMs),
    setTimeout(() => { aviso.textContent = corrupt(NOMBRE.aviso, 2, rng); }, NOMBRE.cambioMs + 90),
    setTimeout(() => { aviso.textContent = NOMBRE.aviso; }, NOMBRE.cambioMs + 180),
  ];
  return {
    destroy() { timers.forEach(clearTimeout); sinEstado(); },
    setLocked(locked) { document.body.classList.toggle('bloqueado', locked); input.disabled = locked; },
    scramble() {},
    rechazar() {
      input.classList.remove('rechazo');
      void input.offsetWidth;
      input.classList.add('rechazo');
      input.focus();
    },
  };
}

// Pinta una pregunta (también la final). Devuelve { setLocked, scramble, destroy }.
export function renderQuestion(root, s, onAnswer, rng) {
  root.replaceChildren();
  const level = glitchLevel(s);
  const texto = textFor(s);
  const esFinal = currentStep(s).kind === 'final';
  const botones = buttonsForStep(esFinal, s.loop);
  const [opA, opB] = texto.opciones;

  const paso = currentStep(s);
  const tarjeta = el('section', 'tarjeta');
  const { ia, titulo } = cabecera(level, rng, paso.sinCara);
  const pregunta = el('h1', 'pregunta');
  const sub = el('p', 'sub');
  const cuenta = contadorEl(questionNumber(s), rng);
  tarjeta.append(ia, cuenta.el, pregunta, sub, el('p', 'pensando', 'anotado'));

  const fila = el('div', 'botones');
  const si = el('button', `btn btn-si si-${botones.si.size}`, opA.label);
  si.type = 'button';
  si.addEventListener('click', () => onAnswer(opA.value));
  fila.append(si);
  // Hay preguntas con una sola respuesta posible («¿tienes miedo a morir?»): solo «Sí».
  const no = opB ? el('button', `btn btn-no no-${botones.no.mode}`, opB.label) : null;
  if (no) {
    no.type = 'button';
    no.style.setProperty('--escala', String(botones.no.scale));
    if (botones.no.mode !== 'huye') no.addEventListener('click', () => onAnswer(opB.value));
    fila.append(no);
  }
  root.append(tarjeta, fila);

  document.body.classList.toggle('si-tapa', botones.si.size === 'media' || botones.si.size === 'completa');
  document.body.classList.toggle('si-completa-activo', botones.si.size === 'completa');

  // La pregunta se corrompe menos que la cabecera: tiene que poder leerse. El nombre nunca se corrompe.
  const corromper = (t, lvl) => (s.nombre && t.includes(s.nombre)
    ? t.split(s.nombre).map((parte) => corrupt(parte, lvl, rng)).join(s.nombre)
    : corrupt(t, lvl, rng));
  // Píxeles rotos en la pregunta desde el nivel 1, sin llegar a hacerla ilegible.
  const rotura = [0, 1, 1, 1, 2, 2][level];
  let extra = texto.extra;
  const scramble = () => {
    titulo.textContent = corrupt(HEADER.title, level, rng);
    pregunta.textContent = corromper(texto.title, rotura) + extra;
    sub.textContent = corrupt(texto.sub, rotura, rng);
  };
  const cleanups = [cuenta.destroy];
  if (paso.glitchPasajero) {
    // Unas letras se rompen un instante y vuelven a su sitio, como si no hubiera pasado nada.
    const limpio = () => { pregunta.textContent = texto.title + extra; };
    const roto = () => { pregunta.textContent = corromper(texto.title, 2) + extra; };
    const ts = [setTimeout(roto, 700), setTimeout(limpio, 820), setTimeout(roto, 900), setTimeout(limpio, 1080)];
    cleanups.push(() => ts.forEach(clearTimeout));
  }
  scramble();

  if (esFinal && s.loop === 1) {
    // Se escribe sola: el nombre, despacio; se queda; se borra y se escribe la pregunta. Luego, los botones.
    const [nombre, frase] = escrituraFinal(s.nombre);
    const { nombreMs, pausaMs, letraMs } = ESCRITURA_FINAL;
    fila.style.visibility = 'hidden';
    pregunta.textContent = '';
    sub.textContent = '';
    const ts = [];
    const letras = (texto, desde, ms) => [...texto].forEach((_, i) => ts.push(setTimeout(() => {
      pregunta.textContent = [...texto].slice(0, i + 1).join('');
    }, desde + (i + 1) * ms)));
    const nNombre = [...nombre].length;
    letras(nombre, 400, nombreMs);
    const borra = 400 + nNombre * nombreMs + pausaMs;
    ts.push(setTimeout(() => { pregunta.textContent = ''; }, borra));
    letras(frase, borra + 350, letraMs);
    ts.push(setTimeout(() => { fila.style.visibility = ''; }, borra + 350 + [...frase].length * letraMs + 300));
    cleanups.push(() => ts.forEach(clearTimeout));
  }

  if (extra) {
    const t = setTimeout(() => { extra = ''; scramble(); }, JEJE_MS);
    cleanups.push(() => clearTimeout(t));
  }
  if (no && botones.no.mode === 'huye') {
    // Empieza en su sitio; en la primera huida se suelta y pasa a moverse por toda la pantalla.
    // No se deja tocar hasta haber huido MAX_FLEES veces, aunque el toque llegue en el respiro entre huidas.
    const budget = createFleeBudget(MAX_FLEES, FLEE_COOLDOWN_MS);
    const place = (p) => {
      no.classList.add('suelto');
      no.classList.remove('salto');
      void no.offsetWidth;
      no.classList.add('salto');
      no.style.left = `${p.x}px`;
      no.style.top = `${p.y}px`;
    };
    no.addEventListener('click', () => { if (budget.agotado()) onAnswer(opB.value); });
    const flee = (ev) => {
      const r = no.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - ev.clientX, r.top + r.height / 2 - ev.clientY);
      if (d >= FLEE_RADIUS || !budget.tryFlee(performance.now())) return;
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
    destroy() { cleanups.forEach((fn) => fn()); sinEstado(); },
  };
}

// Contador «pregunta N de 5». A partir de la sexta se glitchea al aparecer y se queda pasado de la cuenta.
function contadorEl(n, rng) {
  const texto = contador(n);
  const node = el('p', 'contador', texto);
  if (n <= TOTAL_PROMETIDO) return { el: node, destroy() {} };
  node.classList.add('pasado');
  node.textContent = corrupt(texto, 4, rng);
  const ts = [
    setTimeout(() => { node.textContent = corrupt(texto, 2, rng); }, 140),
    setTimeout(() => { node.textContent = texto; }, 320),
  ];
  return { el: node, destroy() { ts.forEach(clearTimeout); } };
}

// La pregunta típica se escribe sola, se corta con un glitch y llama a onDone.
export function renderCortada(root, s, rng, onDone) {
  root.replaceChildren();
  const level = glitchLevel(s);
  const tarjeta = el('section', 'tarjeta');
  const { ia } = cabecera(level, rng);
  const pregunta = el('h1', 'pregunta');
  const escala = el('div', 'escala');
  for (let i = 1; i <= 10; i++) escala.append(el('span', '', String(i)));
  tarjeta.append(ia, el('p', 'contador', contador(questionNumber(s))), pregunta, escala);
  root.append(tarjeta);

  const timers = [];
  const chars = [...TIPICA_CORTE];
  chars.forEach((_, i) => {
    timers.push(setTimeout(() => { pregunta.textContent = chars.slice(0, i + 1).join(''); }, TECLEO_MS * (i + 1)));
  });
  const fin = TECLEO_MS * chars.length;
  [0, 120, 260, 380].forEach((t, k) => {
    timers.push(setTimeout(() => {
      pregunta.textContent = corrupt(TIPICA_CORTE + '—', 2 + k, rng);
      tarjeta.classList.toggle('corte', k % 2 === 0);
    }, fin + 150 + t));
  });
  timers.push(setTimeout(onDone, fin + 150 + CORTE_MS));
  return { destroy() { timers.forEach(clearTimeout); sinEstado(); }, setLocked() {}, scramble() {} };
}

// Silueta del ente: cabeza larga y algo torcida, cuello fino, hombros caídos, boca apenas marcada y dos ojos rojos.
// Se dibuja una vez en un canvas diminuto y se escala sin suavizado: queda difusa, estilo PS1.
const ENTE_W = 56;
const ENTE_H = 112;
const ENTE_SVG = `<svg xmlns="${SVG_NS}" viewBox="0 0 200 400" width="200" height="400">
  <defs>
    <radialGradient id="p" cx="44%" cy="36%" r="64%">
      <stop offset="0" stop-color="#1c1817"/><stop offset=".7" stop-color="#0b0909"/><stop offset="1" stop-color="#030202"/>
    </radialGradient>
    <filter id="b" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <path d="M38 400 C 50 362, 80 344, 93 322 L 96 252 L 105 252 L 108 322 C 121 344, 152 362, 164 400 Z" fill="#070606"/>
  <g transform="rotate(-6 100 150)">
    <path d="M101 14 C 140 20, 143 102, 139 170 C 135 228, 121 266, 101 270 C 81 266, 66 228, 62 170 C 58 102, 62 20, 101 14 Z" fill="url(#p)"/>
    <path d="M128 40 C 140 90, 140 170, 128 236" fill="none" stroke="#2a2422" stroke-width="3" opacity=".45"/>
    <path d="M86 214 Q 101 222 116 212" fill="none" stroke="#000" stroke-width="4"/>
    <g filter="url(#b)"><ellipse cx="84" cy="148" rx="10" ry="5" fill="#ff1a1a"/><ellipse cx="119" cy="145" rx="10" ry="5" fill="#ff1a1a"/></g>
    <ellipse cx="84" cy="148" rx="6" ry="3" fill="#ff4a4a"/><ellipse cx="119" cy="145" rx="6" ry="3" fill="#ff4a4a"/>
  </g>
</svg>`;
const enteImagen = new Image();
enteImagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ENTE_SVG)}`;

function enteSvg() {
  const canvas = el('canvas', 'ente-svg');
  canvas.width = ENTE_W;
  canvas.height = ENTE_H;
  canvas.setAttribute('aria-hidden', 'true');
  const dibujar = () => canvas.getContext('2d').drawImage(enteImagen, 0, 0, ENTE_W, ENTE_H);
  if (enteImagen.complete) dibujar();
  else enteImagen.addEventListener('load', dibujar, { once: true });
  return canvas;
}

// Página «rayada»: el ente detrás y la imagen rompiéndose como una señal digital dañada.
export function renderRayado(root, rng, ms) {
  const negro = pantallaNegra(root);
  const w = 96;
  const h = Math.round((w * window.innerHeight) / Math.max(1, window.innerWidth));
  const canvas = el('canvas', 'rayado');
  canvas.width = w;
  canvas.height = h;
  canvas.setAttribute('aria-hidden', 'true');
  negro.append(canvas);
  const g = canvas.getContext('2d');
  const eh = Math.round(h * 0.82);
  const ew = Math.round((eh * ENTE_W) / ENTE_H);
  const colores = ['rgba(255,0,90,.55)', 'rgba(0,220,255,.5)', 'rgba(60,255,90,.45)', 'rgba(255,255,255,.35)'];
  let rodar = 0;
  const frame = () => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    if (enteImagen.complete) g.drawImage(enteImagen, (w - ew) / 2 + (rng() < 0.2 ? 2 : 0), (h - eh) / 2 + rodar, ew, eh);
    // Franjas desplazadas en horizontal.
    for (let k = 0; k < 7; k++) {
      const y = Math.floor(rng() * h);
      const bh = 1 + Math.floor(rng() * 6);
      const dx = Math.round((rng() * 2 - 1) * 24);
      g.drawImage(canvas, 0, y, w, bh, dx, y, w, bh);
    }
    // Bloques de 8 px copiados fuera de sitio, como un vídeo comprimido que se rompe.
    for (let k = 0; k < 5; k++) {
      const sx = Math.floor(rng() * (w - 8)), sy = Math.floor(rng() * (h - 8));
      g.drawImage(canvas, sx, sy, 8, 8, sx + Math.round((rng() * 2 - 1) * 16), sy + Math.round((rng() * 2 - 1) * 10), 8, 8);
    }
    // Líneas de color y ruido.
    for (let k = 0; k < 4; k++) {
      g.fillStyle = colores[Math.floor(rng() * colores.length)];
      g.fillRect(Math.floor(rng() * w * 0.5), Math.floor(rng() * h), Math.floor(w * (0.3 + rng() * 0.7)), 1);
    }
    for (let k = 0; k < 120; k++) {
      const v = Math.floor(rng() * 160);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 1, 1);
    }
    if (rng() < 0.12) rodar = Math.round((rng() * 2 - 1) * h * 0.15);
  };
  frame();
  const intervalo = setInterval(frame, 1000 / 24);
  const fin = setTimeout(() => clearInterval(intervalo), ms);
  return { destroy() { clearInterval(intervalo); clearTimeout(fin); }, setLocked() {}, scramble() {} };
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

export function renderBlanco(root) {
  root.replaceChildren(el('div', 'blanco'));
}

export function renderEnte(root) {
  pantallaNegra(root).append(enteSvg());
}

export function renderDestello(root, texto) {
  const negro = pantallaNegra(root);
  const cara = enteSvg();
  cara.classList.add('tenue');
  negro.append(cara, el('p', 'destello', texto));
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

export function renderMuerte(root, onAgain) {
  const negro = pantallaNegra(root);
  const boton = el('button', 'otra-vez', MUERTE.boton);
  boton.type = 'button';
  boton.addEventListener('click', onAgain);
  negro.append(el('h1', 'muerte', MUERTE.title), boton);
}
