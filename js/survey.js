// Máquina de estados de la encuesta. Funciones puras: cada una devuelve un estado nuevo.
// La secuencia es una tabla de pasos; los textos viven en texts.js.

export const MAX_LOOP = 5;
export const MAX_NOMBRE = 20;
export const DESTELLO_MS = 150;
export const DESTELLO_GAP_MS = 200;
export const ENTE_MS = 200;

// nivel: corrupción visual y de la música. thumps/delay: golpes y espera tras responder.
export const STEPS = [
  { id: 'inicio', kind: 'inicio', nivel: 0 },
  { id: 'nombre', kind: 'nombre', nivel: 0, thumps: 1, delay: 1000 },
  { id: 'despertar', kind: 'pregunta', nivel: 0, thumps: 1, delay: 900, opciones: ['bien', 'mal'] },
  { id: 'estres', kind: 'pregunta', nivel: 1, thumps: 1, delay: 1100 },
  { id: 'tipica', kind: 'cortada', nivel: 1 },
  { id: 'corre', kind: 'destellos', nivel: 2, textos: ['CORRE'] },
  { id: 'amigos', kind: 'pregunta', nivel: 2, thumps: 2, delay: 1600 },
  { id: 'familia', kind: 'pregunta', nivel: 2, thumps: 2, delay: 1800 },
  { id: 'madre', kind: 'pregunta', nivel: 3, thumps: 2, delay: 2000 },
  { id: 'ente', kind: 'ente', nivel: 3 },
  { id: 'morir', kind: 'pregunta', nivel: 3, thumps: 3, delay: 2400 },
  { id: 'buscan', kind: 'destellos', nivel: 4, textos: ['TE BUSCAN'] },
  { id: 'lugar', kind: 'pregunta', nivel: 4, thumps: 3, delay: 2800, gritos: true },
  { id: 'aqui', kind: 'destellos', nivel: 4, textos: ['ESTÁ AQUÍ', 'CORRE', 'ESTÁ AQUÍ'] },
  { id: 'final', kind: 'final', nivel: 4 },
];

const AUTO = new Set(['cortada', 'destellos', 'ente']);
const NUMERADOS = new Set(['pregunta', 'cortada', 'final']);

export function createSurvey() {
  return { index: 0, loop: 1, locked: false, ended: null, nombre: '' };
}

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
      return next(s, true);
    case 'final':
      if (value === 'si') return { ...s, ended: s.loop === 1 ? 'final2' : 'pasillo' };
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

export function glitchLevel(s) {
  const step = currentStep(s);
  if (step.kind === 'final') return Math.min(step.nivel + s.loop - 1, 5);
  return step.nivel;
}
