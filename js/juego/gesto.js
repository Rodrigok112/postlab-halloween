// Indicaciones de "pulsa" en pixel (24/10): una barrita pequeña en la esquina que sube con cada toque y baja
// sola si dejas de pulsar, con una raya que marca lo rápido que va el ente y una manita que toca. Si un brazo te
// agarra, se pone roja y tiembla, y hay que llenarla hasta arriba. Además sale una onda donde tocas. La manita
// y las ondas se dibujan en lienzos pequeños escalados sin suavizar, a 12 fps como los monstruos.

import { VEL_ENTE, PASO_M } from './carrera.js';

const FPS = 12;
// Toques por segundo que llenan la barrita, y cuántos segmentos tiene.
export const RITMO_MAX = 10;
export const SEGMENTOS = 12;

// La manita, con el índice hacia arriba. X = borde, W = piel.
const MANITA = [
  '..XX....',
  '.XWWX...',
  '.XWWXXX.',
  'XXWWXWWX',
  'XWWWWWWX',
  'XWWWWWWX',
  '.XWWWWX.',
  '..XXXX..',
];

export function nivelRitmo(toquesPorSegundo) {
  return Math.min(1, Math.max(0, toquesPorSegundo / RITMO_MAX));
}
// Lo rápido que va el ente, en la escala de la barrita.
export const UMBRAL = nivelRitmo(VEL_ENTE / PASO_M);

export function llenos(nivel) {
  return Math.round(nivel * SEGMENTOS);
}

// Pasa un toque (clientX/Y) a coordenadas de la capa del juego. Si el juego va girado 90° (móvil en
// vertical), la capa está rotada: su x es la y de la pantalla y su y es lo que queda hasta el borde derecho.
// alto = alto de la capa (el ancho de la pantalla).
export function aLocal(clientX, clientY, girado, alto) {
  return girado ? { x: clientY, y: alto - clientX } : { x: clientX, y: clientY };
}

function lienzo(w, h, clase) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.className = clase;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function manita(ctx, x, y, piel) {
  MANITA.forEach((fila, j) => [...fila].forEach((ch, i) => {
    if (ch === '.') return;
    ctx.fillStyle = ch === 'X' ? '#000' : piel;
    ctx.fillRect(x + i, y + j, 1, 1);
  }));
}

function anillo(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const pasos = Math.max(12, Math.round(r * 7));
  for (let a = 0; a < pasos; a++) {
    const t = (a / pasos) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 1, 1);
  }
}

function nodo(tag, clase, texto) {
  const n = document.createElement(tag);
  n.className = clase;
  if (texto) n.textContent = texto;
  return n;
}

// La barrita. actualizar() se llama en cada fotograma de la carrera con los toques del último segundo.
export function crearBarra(tactil) {
  const caja = nodo('div', 'juego-ritmo');
  const texto = nodo('p', 'juego-ritmo-texto', tactil ? 'TOCA' : 'PULSA');
  const columna = nodo('div', 'juego-ritmo-col');
  const barra = nodo('div', 'juego-barra-ritmo');
  const trozos = Array.from({ length: SEGMENTOS }, () => barra.appendChild(nodo('span', '')));
  const raya = nodo('i', 'juego-raya');
  raya.style.bottom = `${UMBRAL * 100}%`;
  barra.append(raya);
  const { c, ctx } = lienzo(10, 10, 'juego-manita');
  columna.append(barra, c);
  caja.append(texto, columna);
  // Tutorial (24/10): al empezar, una mano grande que toca sin parar y «TOCA RÁPIDO», hasta que sale el ente.
  const tutorial = nodo('div', 'juego-tutorial');
  const grande = lienzo(20, 20, 'juego-mano-grande');
  tutorial.append(grande.c, nodo('p', '', tactil ? 'TOCA RÁPIDO' : 'PULSA ESPACIO RÁPIDO'));
  // Agarrado: bordes rojos y «¡SUÉLTATE!» en grande.
  const velo = nodo('div', 'juego-velo');
  velo.append(nodo('p', '', '¡SUÉLTATE!'));

  let padre = null;
  let id = 0;
  let f = 0;
  let nivel = 0;
  let encendidos = -1;
  let agarrado = false;
  let conTutorial = false;
  const dibujar = () => {
    const ciclo = agarrado ? 2 : 6;
    const abajo = f % ciclo < ciclo / 2;
    ctx.clearRect(0, 0, 10, 10);
    manita(ctx, 1, abajo ? 2 : 0, agarrado ? '#f0c0b0' : '#e8d8c0');
    if (conTutorial) {
      // Toca deprisa (4 toques por segundo) y cada toque deja una onda bajo el dedo.
      const g = grande.ctx;
      const k = f % 3;
      g.clearRect(0, 0, 20, 20);
      if (k < 2) anillo(g, 7.5, 7, 2 + k * 2.5, k ? '#8a7a62' : '#fff6d8');
      manita(g, 6, k < 2 ? 7 : 5, '#e8d8c0');
    }
    f++;
  };
  return {
    mostrar(capa) {
      padre = capa;
      capa.append(caja);
      if (!id) { dibujar(); id = setInterval(dibujar, 1000 / FPS); }
    },
    quitar() {
      clearInterval(id);
      id = 0;
      caja.remove();
      velo.remove();
      tutorial.remove();
      padre = null;
    },
    // toques: en el último segundo. agarre: toques que faltan para soltarte (0 si no te agarran).
    // oculta: durante las cutscenes de la carrera, que no piden pulsar. guia: si se ve el tutorial.
    actualizar({ toques, empezado, avisar, agarre, total, oculta, guia }) {
      caja.style.visibility = oculta ? 'hidden' : '';
      const verTutorial = Boolean(guia && !oculta && padre);
      if (verTutorial !== conTutorial) {
        conTutorial = verTutorial;
        if (verTutorial) padre.append(tutorial);
        else tutorial.remove();
      }
      if (oculta) return;
      const ahora = agarre > 0;
      if (ahora) nivel = (total - agarre) / total;
      else nivel += (nivelRitmo(toques) - nivel) * 0.2;
      if (ahora !== agarrado) {
        agarrado = ahora;
        caja.classList.toggle('agarrado', ahora);
        if (ahora && padre) padre.append(velo);
        else velo.remove();
      }
      const n = llenos(nivel);
      if (n !== encendidos) {
        encendidos = n;
        trozos.forEach((s, i) => s.classList.toggle('lleno', i < n));
      }
      const t = conTutorial ? '' : !empezado ? (tactil ? 'TOCA' : 'PULSA') : !agarrado && avisar && nivel < UMBRAL ? '¡MÁS!' : '';
      if (texto.textContent !== t) {
        texto.textContent = t;
        texto.classList.toggle('mas', t === '¡MÁS!');
      }
    },
  };
}

// La onda que sale donde tocas: seis fotogramas y se va.
export function onda(capa, x, y, rojo) {
  const { c, ctx } = lienzo(24, 24, 'juego-onda');
  c.style.left = `${x}px`;
  c.style.top = `${y}px`;
  capa.append(c);
  let f = 0;
  const id = setInterval(() => {
    ctx.clearRect(0, 0, 24, 24);
    if (f >= 6) { clearInterval(id); c.remove(); return; }
    anillo(ctx, 12, 12, 2 + f * 1.8, f < 3 ? (rojo ? '#ff6a4a' : '#fff6d8') : (rojo ? '#a02a1a' : '#8a7a62'));
    f++;
  }, 1000 / FPS);
}
