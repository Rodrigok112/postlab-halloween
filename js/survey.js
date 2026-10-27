// Máquina de estados de la encuesta. Funciones puras: cada una devuelve un estado nuevo.
// La secuencia es una tabla de pasos; los textos viven en texts.js.

export const MAX_LOOP = 5;
export const MAX_NOMBRE = 20;
// Un par de fotogramas: se ve, pero no da tiempo a mirarlo.
export const ENTE_MS = 70;
export const RAYADO_MS = 2000;
// Antes de la final, todo en blanco y en silencio (28/10).
export const BLANCO_MS = 2200;

// nivel: corrupción visual y de la música. thumps/delay: golpes y espera tras responder.
// destellos: ms visibles y gap de negro entre uno y otro (como mucho 3 por segundo).
// glitchPasajero: unas letras se rompen y se ordenan. sinCara: ya no está la carita rosa.
// golpeteo: golpes constantes (en la final, desde el primer No). sinMusica: la música se corta en seco.
// blanco: pantalla en blanco, como si se hubiera roto, antes de la final.
export const STEPS = [
  { id: 'inicio', kind: 'inicio', nivel: 0 },
  { id: 'nombre', kind: 'nombre', nivel: 0, delay: 1000 },
  { id: 'solas', kind: 'pregunta', nivel: 0, delay: 900 },
  { id: 'sonreir', kind: 'pregunta', nivel: 0, delay: 900 },
  { id: 'despertar', kind: 'pregunta', nivel: 0, thumps: 1, delay: 1000, glitchPasajero: true },
  { id: 'estres', kind: 'pregunta', nivel: 1, thumps: 2, delay: 1200 },
  { id: 'tipica', kind: 'cortada', nivel: 2 },
  { id: 'corre', kind: 'destellos', nivel: 2, textos: ['CORRE'], ms: 150, gap: 200 },
  { id: 'amigos', kind: 'pregunta', nivel: 3, thumps: 2, delay: 1600 },
  { id: 'familia', kind: 'pregunta', nivel: 3, thumps: 2, delay: 1800 },
  { id: 'rayado', kind: 'rayado', nivel: 3 },
  { id: 'madre', kind: 'pregunta', nivel: 3, thumps: 2, delay: 2000 },
  { id: 'ente', kind: 'ente', nivel: 3 },
  { id: 'morir', kind: 'pregunta', nivel: 4, thumps: 3, delay: 2400, sinCara: true },
  { id: 'buscan', kind: 'destellos', nivel: 4, textos: ['TE BUSCAN'], ms: 70, gap: 200 },
  { id: 'lugar', kind: 'pregunta', nivel: 4, thumps: 3, delay: 2800, sinCara: true, gritos: true },
  { id: 'aqui', kind: 'destellos', nivel: 5, textos: ['ESTÁ AQUÍ', 'CORRE', 'ESTÁ AQUÍ'], ms: 80, gap: 260 },
  { id: 'blanco', kind: 'blanco', nivel: 0, sinMusica: true },
  { id: 'final', kind: 'final', nivel: 4, sinCara: true, golpeteo: true, sinMusica: true },
];

const AUTO = new Set(['cortada', 'destellos', 'ente', 'rayado', 'blanco']);
const NUMERADOS = new Set(['pregunta', 'cortada', 'final']);

export function createSurvey() {
  return { index: 0, loop: 1, locked: false, ended: null, nombre: '', respuestas: {} };
}

// El final del psicólogo: quien lo ha respondido todo mal (estrés, sin amigos, sin familia, sin recordar la
// cara de su madre) y además le deja su vida.
const TRISTE = { estres: 'si', amigos: 'no', familia: 'no', madre: 'no' };
const todoMal = (s) => Object.entries(TRISTE).every(([id, v]) => (s.respuestas ?? {})[id] === v);

export function currentStep(s) {
  return STEPS[s.index];
}

export function isAuto(step) {
  return AUTO.has(step.kind);
}

// Número que enseña el contador «pregunta N de 3».
export function questionNumber(s) {
  return STEPS.slice(0, s.index + 1).filter((x) => NUMERADOS.has(x.kind)).length;
}

const next = (s, locked) => ({ ...s, index: Math.min(s.index + 1, STEPS.length - 1), locked });

export function answer(s, value) {
  if (s.locked || s.ended) return s;
  const step = currentStep(s);
  switch (step.kind) {
    case 'inicio':
      return next(s, false);
    case 'nombre': {
      const nombre = [...String(value ?? '').trim()].slice(0, MAX_NOMBRE).join('');
      if (!nombre) return s;
      return { ...next(s, true), nombre };
    }
    case 'pregunta':
      return { ...next(s, true), respuestas: { ...(s.respuestas ?? {}), [step.id]: value } };
    case 'final':
      if (value === 'si') return { ...s, ended: todoMal(s) ? 'psicologo' : s.loop === 1 ? 'final2' : 'pasillo' };
      return { ...s, loop: Math.min(s.loop + 1, MAX_LOOP), locked: false };
    default:
      return s;
  }
}

export function advance(s) {
  if (!isAuto(currentStep(s))) return s;
  return next(s, false);
}

export function unlock(s) {
  return { ...s, locked: false };
}

// La pregunta final empieza limpia, para que se pueda leer, y con cada No se rompe a lo grande.
const NIVEL_FINAL = [0, 3, 5];

// La final empieza limpia, es el momento justo antes de que se rompa: los golpes llegan con el primer No.
export function golpeteoActivo(s) {
  const step = currentStep(s);
  return Boolean(step.golpeteo) && !(step.kind === 'final' && s.loop <= 1);
}

export function glitchLevel(s) {
  const step = currentStep(s);
  if (step.kind === 'final') return NIVEL_FINAL[Math.min(s.loop, NIVEL_FINAL.length) - 1];
  return step.nivel;
}
