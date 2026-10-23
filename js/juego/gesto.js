// Indicaciones de "toca la pantalla" en pixel (23/10): en el móvil, una mano que toca y deja ondas; en el
// ordenador, la tecla ESPACIO. Se dibujan en lienzos pequeños escalados sin suavizar, a 12 fps como los
// monstruos. Tres piezas: la indicación de empezar a correr, la del agarre de un brazo (con barra que se llena)
// y la onda que sale donde tocas.

const FPS = 12;

// La mano, con el índice hacia arriba. X = borde, W = piel.
const MANO = [
  '....XX......',
  '...XWWX.....',
  '...XWWX.....',
  '...XWWX.....',
  '...XWWXXX...',
  '...XWWXWWXX.',
  '.XXXWWXWWXWX',
  'XWWXWWWWWXWX',
  'XWWWWWWWWWWX',
  'XWWWWWWWWWWX',
  '.XWWWWWWWWWX',
  '.XWWWWWWWWX.',
  '..XWWWWWWWX.',
  '..XWWWWWWX..',
  '...XXXXXXX..',
];

// Pasa un toque (clientX/Y) a coordenadas de la capa del juego. Si el juego va girado 90° (móvil en
// vertical), la capa está rotada: su x es la y de la pantalla y su y es lo que queda hasta el borde derecho.
// alto = alto de la capa (el ancho de la pantalla).
export function aLocal(clientX, clientY, girado, alto) {
  return girado ? { x: clientY, y: alto - clientX } : { x: clientX, y: clientY };
}

// Segmentos llenos de la barra del agarre: uno por toque dado.
export function segmentos(agarre, total) {
  return total - agarre;
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

function mano(ctx, x, y, piel) {
  MANO.forEach((fila, j) => [...fila].forEach((ch, i) => {
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

// Un dibujo animado a 12 fps que solo corre mientras se ve.
function animado(nodo, dibujar) {
  let id = 0;
  let f = 0;
  return {
    nodo,
    mostrar(padre) {
      padre.append(nodo);
      if (!id) { dibujar(f++); id = setInterval(() => dibujar(f++), 1000 / FPS); }
    },
    quitar() {
      clearInterval(id);
      id = 0;
      nodo.remove();
    },
  };
}

function tecla() {
  const t = document.createElement('span');
  t.className = 'juego-tecla';
  t.textContent = 'ESPACIO';
  return t;
}

// Al empezar la carrera: la mano toca la pantalla (o la tecla se hunde) y parpadea TOCA / PULSA.
export function crearIndicacion(tactil) {
  const caja = document.createElement('div');
  caja.className = 'juego-gesto';
  const texto = document.createElement('p');
  texto.textContent = tactil ? 'TOCA' : 'PULSA';
  if (!tactil) {
    caja.append(tecla(), texto);
    return animado(caja, () => {});
  }
  const { c, ctx } = lienzo(32, 32, 'juego-mano');
  caja.append(c, texto);
  return animado(caja, (f) => {
    const k = f % 12;
    const abajo = k < 6;
    ctx.clearRect(0, 0, 32, 32);
    if (abajo) {
      anillo(ctx, 15.5, 13, 2 + k * 2.2, '#8a7a62');
      anillo(ctx, 15.5, 13, 1 + k * 1.2, '#c8b898');
    }
    mano(ctx, 11, abajo ? 14 : 10, '#e8d8c0');
  });
}

// Agarrado por un brazo: fondo rojo, la mano toca a toda prisa y una barra se llena con cada toque.
export function crearAgarre(tactil, total) {
  const caja = document.createElement('div');
  caja.className = 'juego-agarre';
  const barra = document.createElement('div');
  barra.className = 'juego-barra';
  const trozos = Array.from({ length: total }, () => barra.appendChild(document.createElement('span')));
  const texto = document.createElement('p');
  texto.textContent = '¡SUÉLTATE!';
  let dibujar = () => {};
  if (tactil) {
    const { c, ctx } = lienzo(32, 32, 'juego-mano');
    caja.append(c);
    dibujar = (f) => {
      const abajo = f % 2 === 0;
      ctx.clearRect(0, 0, 32, 32);
      if (abajo) anillo(ctx, 15.5, 13, 3 + (f % 4) * 2, '#ff3a2a');
      mano(ctx, 11, abajo ? 14 : 10, '#f0c0b0');
    };
  } else {
    const t = tecla();
    t.classList.add('rapida');
    caja.append(t);
  }
  caja.append(barra, texto);
  const a = animado(caja, dibujar);
  return {
    ...a,
    poner(agarre) {
      const llenos = segmentos(agarre, total);
      trozos.forEach((s, i) => s.classList.toggle('lleno', i < llenos));
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
